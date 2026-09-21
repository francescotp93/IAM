// ═══════════════════════════════════════════════════════════════════════════════
//  L'ARCHIVIO CIFRATO SUL VPS — server/archivioVps.js  (18/09/2026)
//
//  Sette prove, e sono quelle chieste dal brief. Non sorvegliano
//  «funzionalità»: sorvegliano le cose che, se saltano, si scoprono il giorno
//  in cui è tardi — un archivio in chiaro sul disco, un documento che si apre
//  senza sessione, un file manomesso che si apre come se niente fosse.
//
//  Girano SENZA rete, SENZA database e SENZA la chiave vera: il modulo prende
//  dall'esterno la cartella, l'ambiente e le due funzioni che leggono e
//  scrivono i metadati. La chiave di queste prove è una chiave di prova, e
//  quella vera non passa da qui — non sta nel repository, e non deve.
//
//      node server/verifica/archivio-vps.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import express from 'express';
import * as A from '../archivioVps.js';

const esiti = [];
const prova = async (nome, fn) => { try { esiti.push([true, nome, (await fn()) || '']); } catch (e) { esiti.push([false, nome, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Una chiave di prova, generata qui e buttata via alla fine del processo. */
const CHIAVE_PROVA = crypto.randomBytes(32).toString('base64');
const CHIAVE = Buffer.from(CHIAVE_PROVA, 'base64');

const UUID_POLIZZA = '11111111-1111-4111-8111-111111111111';
const SEGRETO = 'CARTA D\'IDENTITA\' DI ROSSI MARIO — NUMERO AX1234567';
const FILE = Buffer.from('%PDF-1.4\n' + SEGRETO + '\n' + 'x'.repeat(2000) + '\n%%EOF');

/* ── il banco: un server vero, con un finto archivio dei metadati ──────────── */
function banco(opz = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-prova-'));
  const righe = new Map();
  const app = express();
  /* Al posto di requireAuth: il token «utente:<id>» vale come sessione di
     quell'utente, «» vale come nessuna sessione. Quello vero lo prova
     `auth.js`; qui interessa che cosa succede DOPO. */
  app.use((req, res, next) => {
    const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!t) return res.status(401).json({ error: 'Accesso non autorizzato (token mancante).' });
    req.user = { id: t.replace(/^utente:/, '') };
    next();
  });
  app.use('/archivio', A.archivioVpsRouter({
    dir,
    env: { ARCHIVIO_CHIAVE: opz.chiave === undefined ? CHIAVE_PROVA : opz.chiave },
    radiciServite: opz.radiciServite,
    /* IL PERMESSO. Qui si finge quello che nel vero fa il database: la riga
       torna solo a chi le politiche la farebbero vedere. Il finto è severo
       quanto il vero — solo il proprietario — così una rotta che si dimentica
       di chiedere si vede subito. */
    leggiRiga: async (id, token) => {
      const r = righe.get(id);
      if (!r) return null;
      const chi = String(token || '').replace(/^utente:/, '');
      if (opz.vedonoTutti) return r;
      return r.creato_da === chi ? r : null;
    },
    scriviRiga: async (rec) => { righe.set(rec.id, rec); },
  }));
  const srv = http.createServer(app);
  return new Promise((ris) => srv.listen(0, '127.0.0.1', () => {
    const base = 'http://127.0.0.1:' + srv.address().port;
    ris({
      base, dir, righe,
      carica: (corpo, chi = 'utente:a', q = {}) => fetch(base + '/archivio/carica?' + new URLSearchParams({
        nome: 'carta.pdf', tipo: 'application/pdf', entita: 'polizza', entita_id: UUID_POLIZZA, ...q,
      }), { method: 'POST', headers: { Authorization: 'Bearer ' + chi, 'content-type': 'application/pdf' }, body: corpo }),
      apri: (id, chi = 'utente:a') => fetch(base + '/archivio/apri/' + id,
        chi ? { headers: { Authorization: 'Bearer ' + chi } } : {}),
      chiudi: () => new Promise(r => srv.close(r)),
    });
  }));
}

/* ══ 1. IL GIRO INTERO: IDENTICO BYTE PER BYTE ════════════════════════════ */
await prova('un file caricato e riaperto è identico byte per byte', async () => {
  const b = await banco();
  const su = await b.carica(FILE);
  /* Il messaggio di `deve` si costruisce SEMPRE, anche quando la condizione e'
     vera: leggere il corpo della risposta li' dentro lo consuma, e la riga
     dopo trova una risposta gia' letta. Si legge prima, una volta sola. */
  if (!su.ok) throw new Error('caricamento fallito: ' + su.status + ' ' + (await su.text()).slice(0, 200));
  const { id } = await su.json();
  const giu = await b.apri(id);
  if (!giu.ok) throw new Error('apertura fallita: ' + giu.status + ' ' + (await giu.text()).slice(0, 200));
  const tornato = Buffer.from(await giu.arrayBuffer());
  deve(tornato.length === FILE.length, 'lunghezza: ' + tornato.length + ' invece di ' + FILE.length);
  deve(tornato.equals(FILE), 'il file torna diverso da come è entrato');
  deve(giu.headers.get('content-type') === 'application/pdf', 'tipo: ' + giu.headers.get('content-type'));
  /* Un documento decifrato non si mette in cache da nessuna parte. */
  deve(/no-store/.test(giu.headers.get('cache-control') || ''), 'il documento aperto è mettibile in cache: ' + giu.headers.get('cache-control'));
  await b.chiudi();
  return FILE.length + ' byte, andata e ritorno identici';
});

/* ══ 2. SUL DISCO NON C'È IL CHIARO ═══════════════════════════════════════ */
await prova('il file sul disco non contiene il testo in chiaro', async () => {
  const b = await banco();
  const { id } = await (await b.carica(FILE)).json();
  const suDisco = fs.readFileSync(A.percorsoDi(b.dir, id));
  /* Le tre cose che si guardano: il segreto non c'è, non c'è nemmeno un pezzo
     riconoscibile del file (l'intestazione PDF), e il cifrato non somiglia al
     chiaro. Cercare solo il segreto lascerebbe passare una cifratura che
     lascia in chiaro tutto il resto. */
  deve(!suDisco.includes(Buffer.from(SEGRETO)), 'il segreto si legge sul disco');
  deve(!suDisco.includes(Buffer.from('%PDF-1.4')), 'l\'intestazione del PDF si legge sul disco');
  deve(!suDisco.includes(FILE.subarray(40, 120)), 'un pezzo del file si legge sul disco');
  deve(suDisco.subarray(0, 4).toString() === 'WUS1', 'manca la sigla del formato: ' + suDisco.subarray(0, 4).toString('hex'));
  deve(suDisco.length >= FILE.length + A.INTESTAZIONE, 'il file cifrato è più corto del chiaro più l\'intestazione');
  /* E il file non è leggibile da chiunque abbia una shell sulla macchina. */
  const modo = fs.statSync(A.percorsoDi(b.dir, id)).mode & 0o777;
  deve(modo === 0o600, 'permessi sul file: ' + modo.toString(8) + ' invece di 600');
  await b.chiudi();
  return 'sigla WUS1, niente in chiaro, permessi 600';
});

/* ══ 3. SENZA CHIAVE, O CON QUELLA SBAGLIATA ══════════════════════════════ */
await prova('senza chiave l\'archivio non lavora e lo dice, invece di ripiegare', async () => {
  /* In `server/fonti.js` una chiave assente viene derivata dal nome della
     macchina: lì va bene, perché l'alternativa è una password in chiaro. Qui
     no: un ripiego silenzioso vorrebbe dire scrivere carte d'identità con una
     chiave che si ricostruisce leggendo il codice. */
  const b = await banco({ chiave: '' });
  const su = await b.carica(FILE);
  deve(su.status === 503, 'senza chiave il caricamento risponde ' + su.status + ' invece di 503');
  const t = await su.text();
  deve(/ARCHIVIO_CHIAVE/.test(t), 'non dice che cosa manca: ' + t.slice(0, 160));
  deve(!fs.readdirSync(b.dir).length, 'senza chiave ha scritto qualcosa lo stesso: ' + fs.readdirSync(b.dir).join(', '));
  await b.chiudi();

  /* Una chiave della lunghezza sbagliata non è «quasi buona»: è rifiutata. */
  deve(!A.chiaveDaAmbiente({ ARCHIVIO_CHIAVE: 'troppo-corta' }).ok, 'una chiave corta viene accettata');
  deve(!A.chiaveDaAmbiente({}).ok, 'una chiave assente viene accettata');
  deve(A.chiaveDaAmbiente({ ARCHIVIO_CHIAVE: CHIAVE_PROVA }).ok, 'una chiave buona in base64 viene rifiutata');
  deve(A.chiaveDaAmbiente({ ARCHIVIO_CHIAVE: CHIAVE.toString('hex') }).ok, 'una chiave buona in esadecimale viene rifiutata');
  return '503 con il motivo, niente scritto, chiavi storte rifiutate';
});

/* ══ 3-bis. LA TERZA CREDENZIALE, QUELLA CHE IL 21/09/2026 MANCAVA ════════
   Il modulo aveva DUE controlli d'avvio — la chiave di cifratura e la
   cartella — e ne servivano tre. La chiave anonima, quella con cui si parla
   col database, non era controllata: il modulo partiva acceso, prendeva in
   carico il file e falliva al primo passo con «metadati non scritti (401):
   No API key found in request». Un messaggio che parla di header HTTP non
   dice a chi lavora che cosa deve fare.

   Qui il banco NON inietta gli accessi: è la strada vera, quella in cui le
   credenziali servono davvero. */
await prova('senza le credenziali del database il modulo si spegne e dice QUALE manca', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-rest-'));
  const su = async (env) => {
    const app = express();
    app.use((req, res, next) => { req.user = { id: 'a' }; next(); });
    app.use('/archivio', A.archivioVpsRouter({ dir, env: { ARCHIVIO_CHIAVE: CHIAVE_PROVA, ...env } }));
    const srv = http.createServer(app);
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + srv.address().port;
    const r = await fetch(base + '/archivio/carica?' + new URLSearchParams({
      nome: 'carta.pdf', tipo: 'application/pdf', entita: 'polizza', entita_id: UUID_POLIZZA,
    }), { method: 'POST', headers: { Authorization: 'Bearer utente:a', 'content-type': 'application/pdf' }, body: FILE });
    const t = await r.text();
    await new Promise(x => srv.close(x));
    return { stato: r.status, testo: t };
  };

  /* Senza la chiave anonima: 503, e il nome della variabile nel messaggio. */
  const senza = await su({ SUPABASE_URL: 'https://esempio.supabase.co' });
  deve(senza.stato === 503, 'senza la chiave anonima il caricamento risponde ' + senza.stato + ' invece di 503');
  deve(/SUPABASE_ANON_KEY/.test(senza.testo), 'non dice quale credenziale manca: ' + senza.testo.slice(0, 200));

  /* Senza l'indirizzo: stessa regola, altro nome. */
  const senzaUrl = await su({ SUPABASE_ANON_KEY: 'finta' });
  deve(senzaUrl.stato === 503, 'senza SUPABASE_URL risponde ' + senzaUrl.stato + ' invece di 503');
  deve(/SUPABASE_URL/.test(senzaUrl.testo), 'non dice che manca l\'indirizzo: ' + senzaUrl.testo.slice(0, 200));

  /* E niente è stato scritto sul disco: un modulo spento non prende in carico
     nessun file. Se ne scrivesse uno, resterebbe un cifrato senza la riga che
     dice che cos'è — e nessuno potrebbe più riaprirlo. */
  deve(!fs.readdirSync(dir).length, 'ha scritto qualcosa da spento: ' + fs.readdirSync(dir).join(', '));

  /* La funzione pura, nei quattro casi. */
  deve(!A.chiaviRest({}).ok, 'un ambiente vuoto viene accettato');
  deve(!A.chiaviRest({ SUPABASE_URL: 'x' }).ok, 'senza la chiave anonima viene accettato');
  deve(!A.chiaviRest({ SUPABASE_ANON_KEY: 'x' }).ok, 'senza l\'indirizzo viene accettato');
  deve(A.chiaviRest({ SUPABASE_URL: 'x', SUPABASE_ANON_KEY: 'y' }).ok, 'un ambiente completo viene rifiutato');
  /* Uno spazio non è una chiave: un `.env` con la riga lasciata vuota è il
     modo più comune di avere una variabile «presente» e inutile. */
  deve(!A.chiaviRest({ SUPABASE_URL: 'x', SUPABASE_ANON_KEY: '   ' }).ok, 'una chiave fatta di spazi viene accettata');
  return '503 col nome della variabile, niente scritto, quattro casi puri';
});

/* ══ 3-ter. LA CARTELLA SI PROVA, NON SI GUARDA ═══════════════════════════
   Il secondo guasto del 21/09/2026, arrivato appena tolto il primo: la forma
   del percorso era giusta e l'utente del servizio non ci poteva scrivere.
   «EACCES: permission denied, mkdir» — e siccome la riga dei metadati si
   scrive PRIMA del file, nel fascicolo è comparso un documento che non si
   apre. */
await prova('se la cartella non è scrivibile il modulo si spegne, invece di accorgersene sul primo file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-perm-'));
  /* Un finto disco che rifiuta di creare cartelle, come un permesso negato. */
  const negato = Object.assign(Object.create(fs), {
    mkdirSync: () => { const e = new Error('EACCES: permission denied, mkdir'); e.code = 'EACCES'; throw e; },
  });
  const app = express();
  app.use((req, res, next) => { req.user = { id: 'a' }; next(); });
  app.use('/archivio', A.archivioVpsRouter({
    dir, fs: negato, env: { ARCHIVIO_CHIAVE: CHIAVE_PROVA },
    leggiRiga: async () => null, scriviRiga: async () => {},
  }));
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const r = await fetch(base + '/archivio/carica?' + new URLSearchParams({
    nome: 'carta.pdf', tipo: 'application/pdf', entita: 'polizza', entita_id: UUID_POLIZZA,
  }), { method: 'POST', headers: { Authorization: 'Bearer utente:a', 'content-type': 'application/pdf' }, body: FILE });
  const t = await r.text();
  await new Promise(x => srv.close(x));

  deve(r.status === 503, 'con la cartella non scrivibile risponde ' + r.status + ' invece di 503');
  deve(/non e. scrivibile/i.test(t), 'non dice che la cartella non è scrivibile: ' + t.slice(0, 200));
  deve(/EACCES/.test(t), 'non riporta il motivo del sistema: ' + t.slice(0, 200));

  /* La funzione pura, nei due versi — e la prova di scrittura deve RIPULIRE
     dietro di sé: una cartella `.prova-avvio` lasciata lì a ogni riavvio è
     spazzatura che si accumula nell'archivio dei documenti. */
  const buona = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-ok-'));
  deve(A.cartellaScrivibile(buona).ok, 'una cartella scrivibile viene rifiutata');
  deve(!fs.readdirSync(buona).length, 'la prova di scrittura ha lasciato dei residui: ' + fs.readdirSync(buona).join(', '));
  deve(!A.cartellaScrivibile(path.join(buona, 'x'), negato).ok, 'una cartella non scrivibile viene accettata');
  return '503 col motivo del sistema, e la prova di scrittura non lascia residui';
});

await prova('se il file non si scrive, la riga dei metadati NON resta', async () => {
  /* O entrano tutti e due o non entra niente (§47). Il 21/09/2026 ne è nata
     una così in due minuti: un documento che nel fascicolo si vede, si clicca
     e non si apre — cioè che sembra esserci. */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archivio-orfana-'));
  const righe = new Map();
  let tolte = 0;
  /* Qui la cartella è scrivibile all'avvio, e il disco cede DOPO: è il caso
     che nessun controllo d'avvio può prevenire — spazio finito, permesso
     cambiato a caldo — ed è quello per cui serve la pulizia. */
  /* `fs.promises` è un getter, quindi non si può sovrascrivere su una copia:
     il finto disco si costruisce a mano, con i soli metodi che il modulo usa. */
  const cedeDopo = {
    mkdirSync: fs.mkdirSync, writeFileSync: fs.writeFileSync, rmSync: fs.rmSync,
    promises: {
      mkdir: fs.promises.mkdir,
      readFile: fs.promises.readFile,
      writeFile: async () => { const e = new Error('ENOSPC: no space left on device'); e.code = 'ENOSPC'; throw e; },
    },
  };
  const app = express();
  app.use((req, res, next) => { req.user = { id: 'a' }; next(); });
  app.use('/archivio', A.archivioVpsRouter({
    dir, fs: cedeDopo, env: { ARCHIVIO_CHIAVE: CHIAVE_PROVA },
    leggiRiga: async (id) => righe.get(id) || null,
    scriviRiga: async (rec) => { righe.set(rec.id, rec); },
    togliRiga: async (id) => { tolte++; righe.delete(id); },
  }));
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const r = await fetch(base + '/archivio/carica?' + new URLSearchParams({
    nome: 'carta.pdf', tipo: 'application/pdf', entita: 'polizza', entita_id: UUID_POLIZZA,
  }), { method: 'POST', headers: { Authorization: 'Bearer utente:a', 'content-type': 'application/pdf' }, body: FILE });
  const t = await r.text();
  await new Promise(x => srv.close(x));

  deve(!r.ok, 'il caricamento è riuscito con il disco pieno: ' + r.status);
  deve(tolte === 1, 'la riga non è stata tolta: tolte ' + tolte);
  deve(righe.size === 0, 'è rimasta una riga senza il suo file: ' + righe.size);
  deve(/ENOSPC/.test(t), 'non riporta il motivo vero: ' + t.slice(0, 200));

  /* E se nemmeno la pulizia riesce, si DICE: restare in silenzio sarebbe la
     stessa bugia un piano più in là. */
  const righe2 = new Map();
  const app2 = express();
  app2.use((req, res, next) => { req.user = { id: 'a' }; next(); });
  app2.use('/archivio', A.archivioVpsRouter({
    dir, fs: cedeDopo, env: { ARCHIVIO_CHIAVE: CHIAVE_PROVA },
    leggiRiga: async () => null,
    scriviRiga: async (rec) => { righe2.set(rec.id, rec); },
    togliRiga: async () => { throw new Error('rete assente'); },
  }));
  const srv2 = http.createServer(app2);
  await new Promise(x => srv2.listen(0, '127.0.0.1', x));
  const r2 = await fetch('http://127.0.0.1:' + srv2.address().port + '/archivio/carica?' + new URLSearchParams({
    nome: 'carta.pdf', tipo: 'application/pdf', entita: 'polizza', entita_id: UUID_POLIZZA,
  }), { method: 'POST', headers: { Authorization: 'Bearer utente:a', 'content-type': 'application/pdf' }, body: FILE });
  const t2 = await r2.text();
  await new Promise(x => srv2.close(x));
  deve(/non si apre|non si . potuta togliere/i.test(t2), 'non avverte che la riga è rimasta: ' + t2.slice(0, 260));
  return 'riga tolta, e quando non si può togliere lo dice';
});

/* E il contrario: quando gli accessi SONO iniettati (tutte le altre prove di
   questo file) il controllo non deve scattare, altrimenti il banco
   diventerebbe rosso per la strada invece che per il contenuto (§4). */
await prova('col banco iniettato le credenziali del database non si pretendono', async () => {
  const b = await banco();
  const su = await b.carica(FILE);
  deve(su.status === 200, 'con gli accessi iniettati il caricamento risponde ' + su.status);
  await b.chiudi();
  return 'nessuna variabile d\'ambiente pretesa nelle prove';
});

await prova('con la chiave sbagliata non esce niente, nemmeno un pezzo', async () => {
  const cifrato = A.cifra(CHIAVE, FILE);
  const altra = crypto.randomBytes(32);
  let uscito = null, saltato = false;
  try { uscito = A.decifra(altra, cifrato); } catch (e) { saltato = true; }
  deve(saltato, 'con la chiave sbagliata la decifratura è riuscita');
  deve(uscito === null, 'con la chiave sbagliata è uscito qualcosa: ' + (uscito && uscito.length) + ' byte');
  /* È GCM che lo garantisce: il controllo del tag avviene in `final()`, e
     finché non è passato non esiste un risultato parziale da consegnare. */
  return 'decifratura fallita, zero byte consegnati';
});

/* ══ 4-5. CHI PUÒ APRIRE ══════════════════════════════════════════════════ */
await prova('senza sessione non si apre niente', async () => {
  const b = await banco();
  const { id } = await (await b.carica(FILE)).json();
  const senza = await fetch(b.base + '/archivio/apri/' + id);
  deve(senza.status === 401, 'senza sessione risponde ' + senza.status + ' invece di 401');
  const corpo = await senza.text();
  deve(!corpo.includes(SEGRETO), 'il contenuto è uscito lo stesso');
  await b.chiudi();
  return '401, e niente contenuto';
});

await prova('la sessione di chi non ha diritto non apre il documento di un altro', async () => {
  /* La regola di visibilità non è riscritta nel server: la rotta rilegge la
     riga col token di chi chiede, e se il database non gliela fa vedere non
     c'è niente da decifrare. Qui il finto archivio fa esattamente quello. */
  const b = await banco();
  const { id } = await (await b.carica(FILE, 'utente:anna')).json();
  const mio = await b.apri(id, 'utente:anna');
  deve(mio.ok, 'il proprietario non apre il suo documento: ' + mio.status);
  const altrui = await b.apri(id, 'utente:mario');
  deve(altrui.status === 404, 'un estraneo riceve ' + altrui.status + ' invece di 404');
  const corpo = await altrui.text();
  deve(!corpo.includes(SEGRETO), 'il contenuto è uscito a chi non doveva vederlo');
  /* 404 e non 403: dire «esiste ma non puoi» racconta a un estraneo che quel
     documento c'è, e a volte è già l'informazione che cercava. */
  deve(!/vietat|permess/i.test(corpo), 'la risposta racconta che il documento esiste: ' + corpo.slice(0, 120));
  await b.chiudi();
  return 'il proprietario sì, l\'estraneo 404 senza spiegazioni';
});

/* ══ 6. UN BYTE CAMBIATO SUL DISCO ════════════════════════════════════════ */
await prova('un byte manomesso nel cifrato fa fallire l\'apertura', async () => {
  const b = await banco();
  const { id } = await (await b.carica(FILE)).json();
  const dove = A.percorsoDi(b.dir, id);
  const blob = fs.readFileSync(dove);
  /* Si tocca un byte in mezzo al cifrato, non nell'intestazione: è il caso in
     cui, senza il tag, la decifratura andrebbe a buon fine e restituirebbe un
     file corrotto con la faccia seria. */
  const i = A.INTESTAZIONE + 50;
  blob[i] = blob[i] ^ 0x01;
  fs.writeFileSync(dove, blob);
  const giu = await b.apri(id);
  deve(giu.status === 500, 'un file manomesso risponde ' + giu.status);
  const corpo = await giu.text();
  deve(!corpo.includes(SEGRETO), 'il contenuto manomesso è uscito lo stesso');
  deve(/integrit/i.test(corpo), 'non dice perché non si apre: ' + corpo.slice(0, 160));
  await b.chiudi();
  return 'un bit girato, e il documento non esce';
});

/* ══ 7. NIENTE DI RAGGIUNGIBILE DA UN INDIRIZZO ═══════════════════════════ */
await prova('la cartella dell\'archivio non può stare dentro quello che il sito serve', async () => {
  /* `/opt/withus-backend` è servita da Caddy come sito: un file scritto lì
     dentro sarebbe scaricabile da un indirizzo — cifrato, ma scaricabile da
     chiunque, e per sempre. Questo controllo è una porta chiusa a chiave. */
  deve(!A.radiceConsentita('/opt/withus-backend/documenti').ok, 'una cartella dentro la radice servita viene accettata');
  deve(!A.radiceConsentita('/opt/withus-backend').ok, 'la radice servita stessa viene accettata');
  deve(!A.radiceConsentita('/opt/withus-backend/iam/../archivio').ok, 'si entra nella radice servita passando da ..');
  deve(A.radiceConsentita('/var/lib/withus/archivio').ok, 'una cartella fuori dal sito viene rifiutata');
  deve(!A.radiceConsentita('archivio').ok, 'un percorso relativo viene accettato: dipenderebbe da dove è partito il servizio');

  /* E se qualcuno la configura male, il servizio non scrive: si ferma e lo dice. */
  const b = await banco({ radiciServite: [os.tmpdir()] });   // la cartella di prova finisce "dentro il sito"
  const su = await b.carica(FILE);
  deve(su.status === 503, 'con la cartella dentro il sito il caricamento risponde ' + su.status);
  deve(/radice servita/.test(await su.text()), 'non dice qual è il problema');
  await b.chiudi();
  return '5 percorsi giudicati, e con quello sbagliato non parte';
});

await prova('il nome del file che arriva dal browser non diventa mai un percorso', async () => {
  /* Un nome come `../../etc/qualcosa` usato per costruire il percorso è la
     strada classica per scrivere fuori dalla cartella. Sul disco c'è solo
     l'id; il nome originale vive nei metadati e basta. */
  const b = await banco();
  const su = await b.carica(FILE, 'utente:a', { nome: '../../../etc/passwd' });
  deve(su.ok, 'caricamento fallito: ' + su.status);
  const { id } = await su.json();
  const dove = A.percorsoDi(b.dir, id);
  deve(dove.startsWith(b.dir + path.sep), 'il file è finito fuori dalla cartella: ' + dove);
  deve(path.basename(dove) === id + '.bin', 'il nome sul disco non è l\'id: ' + path.basename(dove));
  deve(b.righe.get(id).nome === '../../../etc/passwd', 'il nome originale non si conserva nei metadati');
  await b.chiudi();
  return 'sul disco l\'id, nei metadati il nome originale';
});

await prova('quello che il browser manda si controlla prima di scrivere', async () => {
  const b = await banco();
  const senzaEntita = await b.carica(FILE, 'utente:a', { entita: 'inventata' });
  deve(senzaEntita.status === 400, 'un\'entità inventata risponde ' + senzaEntita.status);
  const idStorto = await b.carica(FILE, 'utente:a', { entita_id: 'non-un-uuid' });
  deve(idStorto.status === 400, 'un id storto risponde ' + idStorto.status);
  const vuoto = await b.carica(Buffer.alloc(0));
  deve(vuoto.status === 400, 'un file vuoto risponde ' + vuoto.status);
  deve(!fs.readdirSync(b.dir).length, 'ha scritto qualcosa nonostante gli errori');
  /* E il limite è lo stesso del contenitore Supabase: due archivi con due
     limiti diversi vorrebbero dire un documento che entra da una parte e non
     dall'altra, e nessuno che capisce perché. */
  deve(A.LIMITE_BYTE === 25 * 1024 * 1024, 'il limite è ' + A.LIMITE_BYTE);
  await b.chiudi();
  return '3 rifiuti, niente scritto, limite a 25 MB';
});

await prova('ogni file ha il suo IV: due copie dello stesso documento non si somigliano', async () => {
  /* Riusare l'IV con la stessa chiave è il modo classico di rendere inutile
     GCM: due file uguali darebbero cifrati uguali, e si capirebbe che sono lo
     stesso documento senza aprirlo. */
  const a = A.cifra(CHIAVE, FILE), b = A.cifra(CHIAVE, FILE);
  deve(!a.equals(b), 'due cifrature dello stesso file sono identiche: l\'IV non cambia');
  deve(!a.subarray(4, 16).equals(b.subarray(4, 16)), 'l\'IV è lo stesso in tutti e due');
  deve(A.decifra(CHIAVE, a).equals(FILE) && A.decifra(CHIAVE, b).equals(FILE), 'una delle due non si riapre');
  return 'due cifrati diversi, stesso contenuto';
});

console.log('\n══ ARCHIVIO CIFRATO SUL VPS ══');
let ko = 0;
for (const [ok, nome, msg] of esiti) {
  if (ok) console.log('  ok  ' + nome + (msg ? '  — ' + msg : ''));
  else { ko++; console.log('  ❌  ' + nome + '\n      ' + msg); }
}
console.log('\nARCHIVIO VPS: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
