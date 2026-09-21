/* ═══════════════════════════════════════════════════════════════════════════════
   L'ARCHIVIO DEI DOCUMENTI SUL VPS, CIFRATO A RIPOSO (18/09/2026)

   Fin qui i documenti stavano su Supabase Storage: chiuso al pubblico dal
   18/09, con gli indirizzi firmati al momento del clic (§12). Da qui comincia
   la seconda strada: i documenti NUOVI si scrivono sul disco del VPS, cifrati,
   e si aprono passando da qui. I vecchi continuano ad aprirsi come oggi —
   due strade in parallelo, nessuna rottura.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LA COSA PIÙ IMPORTANTE DI QUESTO FILE                                     │
   │                                                                           │
   │ Da oggi esiste una chiave senza la quale i documenti non si aprono più.   │
   │ Non sta nel database, non sta nel repository, non finisce nei log: sta    │
   │ nell'ambiente del backend, e una copia sta offline (`deploy/ARCHIVIO-     │
   │ CIFRATO.md`). Perderla non è un disguido: è perdere l'archivio.           │
   │                                                                           │
   │ Per questo NON c'è un ripiego. In `server/fonti.js` una chiave assente    │
   │ viene derivata dal nome della macchina, e va bene lì: peggio di una       │
   │ chiave debole c'è una password scritta in chiaro. Qui no. Un ripiego      │
   │ silenzioso vorrebbe dire scrivere carte d'identità con una chiave che si  │
   │ ricostruisce leggendo il codice, e nessuno se ne accorgerebbe finché non  │
   │ è tardi. Senza chiave questo modulo si rifiuta di lavorare e lo dice.     │
   └───────────────────────────────────────────────────────────────────────────┘

   COME È FATTO UN FILE SU DISCO

     WUS1 | IV (12 byte) | TAG (16 byte) | cifrato
      4         casuale      GCM            AES-256-GCM

   L'IV è nuovo per ogni file (riusarlo con la stessa chiave è il modo classico
   di rendere inutile GCM). Il tag di autenticazione sta accanto al cifrato: è
   quello che fa fallire l'apertura se qualcuno cambia un byte sul disco —
   senza, la decifratura restituirebbe spazzatura con la faccia seria. La sigla
   in testa dice che formato è: il giorno in cui la cifratura cambia, i file
   vecchi si riconoscono e si leggono lo stesso.

   CHI PUÒ APRIRE. Non lo decide questo file. La regola di visibilità dei
   documenti vive già nel database (le politiche RLS), e riscriverla qui
   vorrebbe dire averne due che prima o poi diranno cose diverse. Il server
   rilegge la riga dei metadati **con il token di chi sta chiedendo**: se la
   riga non torna, non c'è niente da decifrare. La chiave di servizio, che
   scavalca le politiche, qui non entra.
   ═══════════════════════════════════════════════════════════════════════════ */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import express from 'express';

export const SIGLA = Buffer.from('WUS1');      // 4 byte
const LUNG_IV = 12;                            // GCM vuole 96 bit
const LUNG_TAG = 16;
export const INTESTAZIONE = SIGLA.length + LUNG_IV + LUNG_TAG;

/* Lo stesso tetto del contenitore Supabase (25 MB): due archivi con due limiti
   diversi vorrebbero dire un documento che entra da una parte e non dall'altra,
   e nessuno che capisce perché. */
export const LIMITE_BYTE = 25 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Le entità a cui un documento si può agganciare: le stesse di
   `quote_pratica_documenti`, perché la visibilità si decide allo stesso modo. */
export const ENTITA = ['polizza', 'pratica', 'preventivo', 'cliente', 'sinistro'];

/* ══ 1. LA CHIAVE ══════════════════════════════════════════════════════════
   Solo dall'ambiente, 32 byte, in base64 o esadecimale. Nessun ripiego, e i
   messaggi dicono che cosa manca senza mai stampare quello che hanno letto:
   un errore che ripete la chiave sbagliata la scrive nei log. */
export function chiaveDaAmbiente(env) {
  const grezza = String((env || {}).ARCHIVIO_CHIAVE || '').trim();
  if (!grezza) return { ok: false, motivo: 'ARCHIVIO_CHIAVE non è configurata: senza chiave l\'archivio cifrato non scrive e non legge.' };
  let buf = null;
  if (/^[0-9a-f]{64}$/i.test(grezza)) buf = Buffer.from(grezza, 'hex');
  else {
    try { buf = Buffer.from(grezza, 'base64'); } catch (e) { buf = null; }
  }
  if (!buf || buf.length !== 32) {
    return { ok: false, motivo: 'ARCHIVIO_CHIAVE non è una chiave da 32 byte (attesi 64 caratteri esadecimali o 44 in base64).' };
  }
  return { ok: true, chiave: buf };
}

/* ══ 1-bis. LE CREDENZIALI PER PARLARE COL DATABASE ════════════════════════
   Il 21/09/2026 un caricamento è fallito con «metadati non scritti (401): No
   API key found in request», e il messaggio non diceva niente a chi lavora.
   La causa, misurata nell'ambiente del processo: `SUPABASE_ANON_KEY` non era
   configurata sul server. Il modulo però partiva ACCESO, perché i controlli
   d'avvio erano due — la chiave di cifratura e la cartella — e questa terza
   credenziale non era fra loro.

   È la regola già scritta per `ARCHIVIO_CHIAVE`, applicata a metà: «senza
   chiave il modulo si spegne, risponde 503 e dice che cosa manca». Applicata
   a metà vuol dire che il modulo accetta il file, lo prende in carico, e
   fallisce al primo passo con un errore del database che parla di header
   HTTP. Una rotta che risponde «non configurato» dicendo IL NOME DELLA
   VARIABILE si sistema in un minuto; una che risponde 401 costa un pomeriggio
   e manda a cercare la chiave sbagliata.

   Perché la chiave ANONIMA e non quella di servizio: i metadati si scrivono e
   si rileggono col token di chi chiede, e Supabase vuole `apikey` ACCANTO al
   token. Con la chiave di servizio al posto dell'anonima, un token assente o
   malformato non farebbe fallire la richiesta: la farebbe passare come
   servizio, cioè scavalcando le politiche — esattamente la regola che questo
   modulo esiste per applicare. */
export function chiaviRest(env) {
  const e = env || {};
  if (!String(e.SUPABASE_URL || '').trim()) {
    return { ok: false, motivo: 'SUPABASE_URL non è configurata: senza, i metadati dei documenti non si scrivono.' };
  }
  if (!String(e.SUPABASE_ANON_KEY || '').trim()) {
    return { ok: false, motivo: 'SUPABASE_ANON_KEY non è configurata: il database rifiuta la richiesta con «No API key found» e il documento non si carica.' };
  }
  return { ok: true };
}

/* ══ 2. CIFRARE E DECIFRARE ════════════════════════════════════════════════ */
export function cifra(chiave, dati) {
  const iv = crypto.randomBytes(LUNG_IV);
  const c = crypto.createCipheriv('aes-256-gcm', chiave, iv);
  const ct = Buffer.concat([c.update(dati), c.final()]);
  return Buffer.concat([SIGLA, iv, c.getAuthTag(), ct]);
}

/* Solleva, e deve sollevare: un'apertura che fallisce a metà non restituisce
   il pezzo che era riuscito. `final()` di GCM controlla il tag, e finché non
   lo ha controllato non esiste un risultato parziale da consegnare. */
export function decifra(chiave, blob) {
  const b = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (b.length < INTESTAZIONE) throw new Error('File d\'archivio troppo corto: manca l\'intestazione.');
  if (!b.subarray(0, SIGLA.length).equals(SIGLA)) throw new Error('File d\'archivio in un formato che non conosco.');
  const iv = b.subarray(SIGLA.length, SIGLA.length + LUNG_IV);
  const tag = b.subarray(SIGLA.length + LUNG_IV, INTESTAZIONE);
  const d = crypto.createDecipheriv('aes-256-gcm', chiave, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(b.subarray(INTESTAZIONE)), d.final()]);
}

export function impronta(dati) {
  return crypto.createHash('sha256').update(dati).digest('hex');
}

/* ══ 3. DOVE FINISCONO I FILE ══════════════════════════════════════════════
   Fuori dalla radice che Caddy serve, e non per abitudine: `/opt/withus-backend`
   è servita come sito (`deploy/caddy/iam.caddy`), quindi un file scritto lì
   dentro sarebbe raggiungibile da un indirizzo, cifrato ma scaricabile da
   chiunque. Questo controllo è una porta chiusa a chiave, non un commento. */
export const RADICI_SERVITE = ['/opt/withus-backend'];

export function radiceConsentita(dir, servite) {
  const grezza = String(dir || '');
  /* Si guarda il percorso COM'E' ARRIVATO, non quello risolto: `path.resolve`
     rende assoluto qualunque cosa attaccandoci la cartella da cui e' partito
     il servizio, e allora «archivio» passerebbe il controllo finendo in un
     posto che dipende da come e' stato avviato il processo. */
  if (!path.isAbsolute(grezza)) return { ok: false, motivo: 'La cartella dell\'archivio deve essere un percorso assoluto: «' + grezza + '» dipenderebbe da dove e\' partito il servizio.' };
  const d = path.resolve(grezza);
  for (const s of (servite || RADICI_SERVITE)) {
    const r = path.resolve(s);
    if (d === r || d.startsWith(r + path.sep)) {
      return { ok: false, motivo: 'La cartella dell\'archivio (' + d + ') sta dentro una radice servita dal sito (' + r + '): i file sarebbero raggiungibili da un indirizzo.' };
    }
  }
  return { ok: true, dir: d };
}

/* Due livelli di sottocartelle dai primi caratteri dell'id: una cartella con
   centomila file dentro è lenta da elencare e scomoda da guardare. */
export function percorsoDi(dir, id) {
  if (!UUID.test(String(id || ''))) throw new Error('Identificativo del documento non valido.');
  const s = String(id).toLowerCase();
  return path.join(path.resolve(dir), s.slice(0, 2), s.slice(2, 4), s + '.bin');
}

/* ══ 4. QUELLO CHE IL CLIENT MANDA ═════════════════════════════════════════
   Puro, così le prove lo girano tutto senza una richiesta vera. */
export function preparaCaricamento(q, corpo) {
  const b = q || {};
  const nome = String(b.nome || '').trim();
  if (!nome) return { ok: false, stato: 400, errore: 'Manca il nome del file.' };
  const entita = String(b.entita || '').trim().toLowerCase();
  if (!ENTITA.includes(entita)) return { ok: false, stato: 400, errore: 'Entità non ammessa: ' + (entita || '(vuota)') + '. Ammesse: ' + ENTITA.join(', ') + '.' };
  const entitaId = String(b.entita_id || '').trim();
  if (!UUID.test(entitaId)) return { ok: false, stato: 400, errore: 'Serve l\'identificativo dell\'entità (entita_id).' };
  if (!corpo || !corpo.length) return { ok: false, stato: 400, errore: 'Il file è vuoto.' };
  if (corpo.length > LIMITE_BYTE) return { ok: false, stato: 413, errore: 'Il file supera i ' + Math.round(LIMITE_BYTE / 1048576) + ' MB.' };
  return {
    ok: true,
    /* Il nome originale si conserva nei metadati e NON diventa il nome sul
       disco: un nome che arriva da fuori, usato come percorso, è la strada
       classica per scrivere dove non si dovrebbe. Sul disco c'è solo l'id. */
    nome: nome.slice(0, 200),
    tipo: String(b.tipo || 'application/octet-stream').slice(0, 120),
    entita, entitaId,
    categoria: String(b.categoria || '').trim().slice(0, 60) || null,
  };
}

/* ══ 5. LE DUE ROTTE ═══════════════════════════════════════════════════════
   `opz` si inietta nelle prove: nessuna rete, nessun disco vero, nessuna
   variabile d'ambiente.
     dir            dove scrivere
     env            da cui si legge la chiave
     leggiRiga(id, token)     → la riga dei metadati LETTA COL TOKEN DI CHI CHIEDE
     scriviRiga(rec, token)   → la riga nuova, scritta col token di chi carica
     fsx            per le prove: un finto disco
*/
export function archivioVpsRouter(opz = {}) {
  const r = Router();
  const env = opz.env || process.env;
  const disco = opz.fs || fs;
  const dirGrezza = opz.dir || env.ARCHIVIO_DIR || '/var/lib/withus/archivio';
  const leggiRiga = opz.leggiRiga || leggiRigaSupabase;
  const scriviRiga = opz.scriviRiga || scriviRigaSupabase;

  /* I due controlli che spengono tutto si fanno UNA VOLTA, all'avvio, e il
     motivo si porta dietro: una rotta che risponde «non configurato» dicendo
     che cosa manca si sistema in un minuto; una che risponde 500 costa un
     pomeriggio. */
  const k = chiaveDaAmbiente(env);
  const radice = radiceConsentita(dirGrezza, opz.radiciServite);
  /* Le credenziali del database si controllano SOLO se si userà la strada
     vera: nelle prove i due accessi sono iniettati, non c'è nessuna rete, e
     pretendere lì delle variabili d'ambiente spegnerebbe il modulo per la
     strada invece che per il contenuto (§4). */
  const rest = (opz.leggiRiga || opz.scriviRiga) ? { ok: true } : chiaviRest(env);
  const spento = !k.ok ? k.motivo : (!radice.ok ? radice.motivo : (!rest.ok ? rest.motivo : null));
  if (spento) console.warn('archivio cifrato spento: ' + spento);

  const fermo = (res) => res.status(503).json({ error: 'Archivio cifrato non disponibile: ' + spento });
  const token = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  /* Il corpo è il file, grezzo. Niente multipart: sarebbe una dipendenza in
     più per infilare un file dentro una busta e tirarlo fuori subito dopo. */
  r.post('/carica', express.raw({ type: () => true, limit: LIMITE_BYTE + 1024 }), async (req, res) => {
    if (spento) return fermo(res);
    const p = preparaCaricamento(req.query, req.body);
    if (!p.ok) return res.status(p.stato).json({ error: p.errore });

    const id = crypto.randomUUID();
    const dove = percorsoDi(radice.dir, id);
    try {
      /* Prima la riga, poi il file: se la riga non si scrive (permessi, rete),
         sul disco non resta un file cifrato che non è di nessuno e che nessuno
         andrà a cancellare. Al contrario, una riga senza file si vede subito —
         il documento non si apre — ed è recuperabile. */
      const rec = {
        id, nome: p.nome, tipo: p.tipo, dimensione: req.body.length,
        impronta: impronta(req.body),
        percorso: path.relative(radice.dir, dove),
        entita: p.entita, entita_id: p.entitaId, categoria: p.categoria,
        creato_da: req.user && req.user.id,
      };
      await scriviRiga(rec, token(req));
      await disco.promises.mkdir(path.dirname(dove), { recursive: true });
      /* 0600: il file lo legge l'utente del servizio e nessun altro. Cifrato o
         no, un documento di un cliente non è leggibile da chiunque abbia una
         shell sulla macchina. */
      await disco.promises.writeFile(dove, cifra(k.chiave, req.body), { mode: 0o600 });
      return res.json({ ok: true, id, riferimento: 'vps:' + id, nome: p.nome, dimensione: rec.dimensione });
    } catch (e) {
      console.warn('archivio: caricamento non riuscito:', e.message || e);
      return res.status(e.stato || 500).json({ error: 'Caricamento non riuscito: ' + (e.message || e) });
    }
  });

  r.get('/apri/:id', async (req, res) => {
    if (spento) return fermo(res);
    const id = String(req.params.id || '');
    if (!UUID.test(id)) return res.status(400).json({ error: 'Identificativo non valido.' });

    let riga;
    try {
      /* QUI sta il permesso. La riga si chiede col token di chi sta
         chiedendo: se le politiche del database non gliela fanno vedere, non
         torna, e non c'è niente da decifrare. La chiave di servizio non entra
         in questa strada apposta — scavalcherebbe proprio la regola che
         stiamo applicando. */
      riga = await leggiRiga(id, token(req));
    } catch (e) {
      return res.status(502).json({ error: 'Archivio non raggiungibile: ' + (e.message || e) });
    }
    /* Stessa risposta per «non esiste» e «non è tuo»: dire «esiste ma non puoi»
       racconta a un estraneo che quel documento c'è. */
    if (!riga) return res.status(404).json({ error: 'Documento non trovato.' });

    const dove = percorsoDi(radice.dir, id);
    let chiaro;
    try {
      const blob = await disco.promises.readFile(dove);
      chiaro = decifra(k.chiave, blob);
    } catch (e) {
      /* Un tag che non torna vuol dire che il file è stato toccato: non è un
         dettaglio tecnico, è la ragione per cui il tag esiste. Si dice, e non
         si consegna niente. */
      console.warn('archivio: apertura non riuscita per ' + id + ':', e.message || e);
      return res.status(500).json({ error: 'Il documento non si apre: il contenuto non supera il controllo di integrità o il file non c\'è.' });
    }

    /* La verifica dell'impronta è la seconda rete: il tag GCM dice che il
       cifrato non è stato toccato, l'impronta dice che quello che esce è
       quello che era entrato. Costano un millisecondo e tolgono una classe
       intera di dubbi. */
    if (riga.impronta && impronta(chiaro) !== riga.impronta) {
      console.warn('archivio: impronta diversa da quella registrata per ' + id);
      return res.status(500).json({ error: 'Il documento non corrisponde a quello registrato.' });
    }

    res.setHeader('Content-Type', riga.tipo || 'application/octet-stream');
    res.setHeader('Content-Length', chiaro.length);
    res.setHeader('Content-Disposition', 'inline; filename="' + String(riga.nome || 'documento').replace(/["\\\r\n]/g, '') + '"');
    /* Un documento decifrato non si mette in cache da nessuna parte: né dal
       browser né da un proxy in mezzo. */
    res.setHeader('Cache-Control', 'no-store, private');
    return res.end(chiaro);
  });

  return r;
}

/* ══ 6. I METADATI SU POSTGREST, COL TOKEN DI CHI CHIEDE ═══════════════════ */
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ekjxrnsfqxnfxzrthdcf.supabase.co').replace(/\/$/, '');
const ANON = () => process.env.SUPABASE_ANON_KEY || '';

async function leggiRigaSupabase(id, token) {
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/iam_archivio?id=eq.${encodeURIComponent(id)}&select=id,nome,tipo,dimensione,impronta,entita,entita_id,creato_da`, {
    headers: { apikey: ANON(), Authorization: 'Bearer ' + token },
  });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new Error('rest ' + r.status);
  const d = await r.json();
  return Array.isArray(d) && d.length ? d[0] : null;
}

async function scriviRigaSupabase(rec, token) {
  if (!token) { const e = new Error('Accesso non autorizzato.'); e.stato = 401; throw e; }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/iam_archivio`, {
    method: 'POST',
    headers: { apikey: ANON(), Authorization: 'Bearer ' + token, 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(rec),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const e = new Error('metadati non scritti (' + r.status + '): ' + t.slice(0, 160));
    e.stato = r.status === 401 || r.status === 403 ? 403 : 502;
    throw e;
  }
}
