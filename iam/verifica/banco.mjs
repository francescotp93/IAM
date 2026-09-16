// ═══════════════════════════════════════════════════════════════════════════════
//  BANCO DI PROVA per index.html
//
//  IAM e' un unico file HTML: non ci sono moduli da importare, quindi non si
//  puo' provare una funzione "da fuori" come si farebbe in un progetto normale.
//  Questo banco ritaglia dal file le funzioni che servono e le fa girare in una
//  stanza chiusa, con un finto browser e un finto archivio.
//
//  Serve a due cose:
//   1) verificare che una correzione faccia quello che dice;
//   2) la CONTROPROVA — rigirare la stessa prova sul codice di PRIMA e vedere
//      che falliva. Senza controprova una prova verde non dimostra niente:
//      potrebbe essere passata anche prima.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

export const RADICE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Il file com'e' adesso sul disco. */
export function sorgenteAttuale() {
  return fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
}

/** Il file com'era a un certo commit (per la controprova). */
export function sorgenteA(commit) {
  return execSync(`git show ${commit}:index.html`, { cwd: RADICE, maxBuffer: 64 * 1024 * 1024 }).toString();
}

/**
 * Ritaglia una funzione dal sorgente, contando le parentesi graffe.
 *
 * PERCHE' NON BASTA CONTARE LE GRAFFE. In questo file le funzioni scrivono
 * HTML con i template literal, e dentro un template ci sono i buchi `${...}`
 * che contengono ALTRO codice — a volte con altre stringhe, altri apici, altre
 * graffe. Chi legge un backtick e salta fino al successivo si perde al primo
 * buco che ne contiene uno: da li' in poi legge codice come se fosse testo, il
 * conteggio va per conto suo, e la funzione torna lunga il doppio del dovuto.
 *
 * Non e' un difetto teorico: il 20/08/2026 `ritaglia(html, 'fontiScheda')`
 * restituiva 109.883 caratteri per una funzione da 7.449 — cioe' mezzo file.
 * Tutte le prove che ritagliavano quella funzione stavano guardando anche
 * quello che veniva dopo, e una prova che guarda piu' di quello che dice non
 * sta guardando: sta indovinando.
 *
 * Qui i buchi si attraversano davvero: dentro `${` si torna a leggere codice, e
 * si esce solo alla graffa che chiude quel buco.
 *
 * E se il conto non torna, si torna NULL invece di una fetta a caso: chi
 * chiama scrivera' «manca la funzione», che e' un errore vero e si va a
 * guardare, invece di una prova verde su un ritaglio sbagliato.
 */
export function ritaglia(sorgente, nome) {
  const re = new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?function\\s+${nome}\\s*\\(`, 'm');
  const m = re.exec(sorgente);
  if (!m) return null;
  const inizio = m.index + m[0].search(/(?:async\s+)?function\b/);
  let i = sorgente.indexOf('{', m.index + m[0].length - 1);
  if (i < 0) return null;

  /* La pila tiene il posto: 'codice', una stringa aperta, o un template. Un
     buco `${` dentro un template rimette 'codice' in cima, e la sua graffa di
     chiusura lo toglie. */
  const pila = [{ dove: 'codice', liv: 0 }];
  for (let j = i; j < sorgente.length; j++) {
    const cima = pila[pila.length - 1];
    const c = sorgente[j], prec = sorgente[j - 1], prec2 = sorgente[j - 2];
    const scappato = prec === '\\' && prec2 !== '\\';

    if (cima.dove === 'stringa') {
      if (c === cima.q && !scappato) pila.pop();
      continue;
    }
    if (cima.dove === 'template') {
      if (c === '`' && !scappato) { pila.pop(); continue; }
      if (c === '$' && sorgente[j + 1] === '{' && !scappato) { pila.push({ dove: 'codice', liv: 1 }); j++; continue; }
      continue;
    }
    /* dove === 'codice' */
    if (c === '"' || c === "'") { pila.push({ dove: 'stringa', q: c }); continue; }
    if (c === '`') { pila.push({ dove: 'template' }); continue; }
    if (c === '/' && sorgente[j + 1] === '/') { j = sorgente.indexOf('\n', j); if (j < 0) break; continue; }
    /* I commenti servono saltati come quelli di riga. Qui dentro si scrive in
       italiano, e in italiano ci sono gli apostrofi: senza questo salto un
       «non c'e'» dentro un commento veniva letto come apertura di stringa. */
    if (c === '/' && sorgente[j + 1] === '*') { j = sorgente.indexOf('*/', j + 2); if (j < 0) break; j++; continue; }
    if (c === '{') { cima.liv++; continue; }
    if (c === '}') {
      cima.liv--;
      if (cima.liv === 0) {
        if (pila.length === 1) return sorgente.slice(inizio, j + 1);  // fine della funzione
        pila.pop();                                                    // fine di un buco `${...}`
      }
    }
  }
  return null;   // il conto non torna: meglio niente che una fetta a caso
}

/**
 * Un archivio finto che registra tutto quello che riceve.
 *
 * opzioni.colonneAmmesse — l'elenco delle caselle che la tabella ha davvero.
 *   Se una scrittura ne nomina una che non c'e', l'archivio finto rifiuta come
 *   fa quello vero. Serve a smascherare le scritture su colonne inesistenti,
 *   che nell'app passavano inosservate perche' l'errore non veniva guardato.
 * opzioni.regolaInsert — funzione(riga) che restituisce il motivo del rifiuto,
 *   o null se la riga si puo' inserire. Serve a riprodurre le regole di accesso
 *   e i vincoli di unicita'.
 * opzioni.idAutomatico — come nell'archivio vero, dove la chiave e' generata dal
 *   database: la riga inserita torna indietro CON il suo id. Senza questo il
 *   codice che poi usa quell'id per modificare o cancellare non sarebbe provabile.
 */
export function archivioFinto(righeIniziali = [], opzioni = {}) {
  const stato = {
    righe: righeIniziali.map(r => ({ ...r })),
    upsert: [], aggiornamenti: [], insert: [], delete: [],
    erroreSuUpsert: false, erroreSuUpdate: false,
    // deposito dei file (il "bucket" dell'archivio vero)
    fileCaricati: [], urlFirmati: [], erroreSuUpload: false,
    contatoreId: 0,
  };
  const colonneAmmesse = opzioni.colonneAmmesse || null;
  const regolaInsert = opzioni.regolaInsert || null;
  const idAutomatico = !!opzioni.idAutomatico;
  function colonnaIgnota(riga) {
    if (!colonneAmmesse) return null;
    const k = Object.keys(riga).find(c => !colonneAmmesse.includes(c));
    return k ? `Could not find the '${k}' column of '${'tabella'}' in the schema cache` : null;
  }
  const api = {
    from(tabella) {
      return {
        // Si puo' inserire una riga sola o un elenco, come nell'archivio vero.
        insert(righeIn) {
          const lista = Array.isArray(righeIn) ? righeIn : [righeIn];
          const esegui = () => {
            const prodotte = [];
            for (const riga of lista) {
              stato.insert.push({ tabella, riga: { ...riga } });
              const ignota = colonnaIgnota(riga);
              if (ignota) return { data: null, error: { message: ignota } };
              const rifiuto = regolaInsert ? regolaInsert(riga) : null;
              if (rifiuto) return { data: null, error: { message: rifiuto } };
              const salvata = { ...riga };
              if (idAutomatico && salvata.id === undefined) salvata.id = 'riga-' + (++stato.contatoreId);
              stato.righe.push(salvata);
              prodotte.push({ ...salvata });
            }
            return { data: prodotte, error: null };
          };
          const uno = () => { const r = esegui(); return { data: r.data ? r.data[0] : null, error: r.error }; };
          return {
            select() {
              return {
                single: () => Promise.resolve(uno()),
                then: (ris, err) => Promise.resolve(esegui()).then(ris, err),
              };
            },
            then: (ris, err) => Promise.resolve(esegui()).then(ris, err),
          };
        },
        // select(colonne, opzioni) — si puo' filtrare con .eq(), chiedere una
        // riga sola con .single()/.maybeSingle(), oppure attendere direttamente.
        //
        // Con { count: 'exact', head: true } l'archivio vero NON restituisce le
        // righe: risponde { data: null, count: N }. Qui si comporta allo stesso
        // modo, altrimenti le prove non smaschererebbero il codice che legge il
        // conteggio dalla casella sbagliata.
        select(_colonne, opzioni) {
          const filtri = [];
          const righeFiltrate = () => stato.righe
            .filter(r => filtri.every(f => String(r[f.col]) === String(f.val)))
            .map(r => ({ ...r }));
          const esegui = () => {
            const righe = righeFiltrate();
            if (opzioni && opzioni.head) return { data: null, count: righe.length, error: null };
            return { data: righe, count: righe.length, error: null };
          };
          const uno = (ammettiVuoto) => {
            const righe = righeFiltrate();
            if (righe.length === 1) return { data: righe[0], error: null };
            if (righe.length === 0) {
              return ammettiVuoto
                ? { data: null, error: null }
                : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
            }
            return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
          };
          const q = {
            _t: tabella,
            eq(col, val) { filtri.push({ col, val }); return q; },
            neq() { return q; },
            in() { return q; },
            order() { return q; },
            limit() { return q; },
            or() { return q; },
            single: () => Promise.resolve(uno(false)),
            maybeSingle: () => Promise.resolve(uno(true)),
            then(res, err) { return Promise.resolve(esegui()).then(res, err); },
          };
          return q;
        },
        async upsert(riga) {
          stato.upsert.push({ tabella, riga: { ...riga } });
          if (stato.erroreSuUpsert) return { data: null, error: { message: 'archivio non raggiungibile' } };
          const ignota = colonnaIgnota(riga);
          if (ignota) return { data: null, error: { message: ignota } };
          const rifiuto = regolaInsert ? regolaInsert(riga) : null;
          if (rifiuto) return { data: null, error: { message: rifiuto } };
          const i = stato.righe.findIndex(r => String(r.id) === String(riga.id));
          if (i >= 0) stato.righe[i] = { ...stato.righe[i], ...riga }; else stato.righe.push({ ...riga });
          return { data: [riga], error: null };
        },
        update(riga) {
          return {
            // .eq(...) si puo' sia attendere direttamente sia proseguire con
            // .select(): l'archivio vero, senza .select(), non dice se la riga
            // esisteva. Qui si comporta allo stesso modo.
            eq(col, val) {
              let fatto = null;
              const esegui = () => {
                if (fatto) return fatto;
                stato.aggiornamenti.push({ tabella, col, val, riga: JSON.parse(JSON.stringify(riga)) });
                if (stato.erroreSuUpdate) return (fatto = { data: null, error: { message: 'archivio non raggiungibile' } });
                const ignota = colonnaIgnota(riga);
                if (ignota) return (fatto = { data: null, error: { message: ignota } });
                const i = stato.righe.findIndex(r => String(r[col]) === String(val));
                if (i < 0) return (fatto = { data: [], error: null });
                stato.righe[i] = { ...stato.righe[i], ...riga };
                return (fatto = { data: [{ ...stato.righe[i] }], error: null });
              };
              return {
                select: () => Promise.resolve(esegui()),
                then: (ris, err) => Promise.resolve(esegui()).then(ris, err),
              };
            },
          };
        },
        delete() {
          return {
            async eq(col, val) {
              stato.delete.push({ tabella, col, val });
              stato.righe = stato.righe.filter(r => String(r[col]) !== String(val));
              return { data: [], error: null };
            },
          };
        },
      };
    },
    // Il deposito dei file. L'archivio vero consegna un indirizzo a scadenza
    // (createSignedUrl) e, se il contenitore e' aperto a tutti, anche uno fisso
    // (getPublicUrl). Qui si comporta allo stesso modo, e tiene il conto di
    // quello che ha ricevuto: senza deposito non si puo' provare che un allegato
    // esce davvero dal computer di chi lo carica.
    storage: {
      from(contenitore) {
        return {
          async upload(percorso, contenuto, opz) {
            if (stato.erroreSuUpload) return { data: null, error: { message: 'archivio non raggiungibile' } };
            if (stato.fileCaricati.some(f => f.percorso === percorso)) {
              return { data: null, error: { message: 'The resource already exists' } };
            }
            stato.fileCaricati.push({ contenitore, percorso, contenuto, tipo: (opz && opz.contentType) || null });
            return { data: { path: percorso }, error: null };
          },
          async createSignedUrl(percorso, secondi) {
            const c = stato.fileCaricati.find(f => f.percorso === percorso);
            if (!c) return { data: null, error: { message: 'Object not found' } };
            stato.urlFirmati.push({ percorso, secondi });
            return { data: { signedUrl: 'https://archivio.finto/firmato/' + percorso + '?scade=' + secondi }, error: null };
          },
          getPublicUrl(percorso) {
            return { data: { publicUrl: 'https://archivio.finto/pubblico/' + percorso } };
          },
        };
      },
    },
  };
  return { api, stato };
}

/** Un browser finto: memoria locale, elementi, finestre di dialogo. */
export function browserFinto(memoriaIniziale = {}) {
  const mem = new Map(Object.entries(memoriaIniziale).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const elementi = new Map();
  const detto = { alert: [], confirm: [] };
  const localStorage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k),
  };
  function elemento(id) {
    if (!elementi.has(id)) {
      const classi = new Set();
      elementi.set(id, {
        id, value: '', textContent: '', innerHTML: '', disabled: false, checked: false, style: {},
        classList: {
          add: c => classi.add(c),
          remove: c => classi.delete(c),
          contains: c => classi.has(c),
          toggle: (c, v) => { const on = v === undefined ? !classi.has(c) : !!v; if (on) classi.add(c); else classi.delete(c); return on; },
        },
        remove() {}, insertAdjacentHTML() {}, focus() {},
      });
    }
    return elementi.get(id);
  }
  // Le finestre aperte con window.open(): si puo' controllare dove sono andate a
  // finire (location.href) e cosa ci e' stato scritto dentro (document.write).
  const finestre = [];
  function apriFinestra(url) {
    const w = {
      location: { href: url || '' },
      scritto: '',
      chiusa: false,
      document: { write(h) { w.scritto += String(h); } },
      close() { w.chiusa = true; },
    };
    finestre.push(w);
    return w;
  }
  return { mem, elementi, detto, localStorage, elemento, finestre, apriFinestra };
}

/** Prepara la stanza chiusa in cui far girare le funzioni ritagliate. */
export function stanza(sorgente, nomi, extra = {}) {
  const b = browserFinto(extra.memoria || {});
  const a = archivioFinto(extra.righeArchivio || [], extra.opzioniArchivio || {});
  const ctx = {
    AGENDA: [], PIPE: [], PIPE_ID: null,
    ME: extra.ME === undefined ? { id: 'utente-1' } : extra.ME,
    PROFILO: extra.PROFILO || { ruolo: 'admin' },
    db: extra.db === undefined ? a.api : extra.db,
    console: { warn() {}, log() {}, error() {} },
    localStorage: b.localStorage,
    document: {
      getElementById: id => (extra.elementiPresenti === false ? null : b.elemento(id)),
      // extra.spunte: le caselle che la pagina mostrerebbe (per le funzioni che
      // leggono un gruppo di checkbox prima di salvare).
      querySelectorAll: () => (extra.spunte || []),
      body: { insertAdjacentHTML() {} },
    },
    window: { open: url => b.apriFinestra(url) },
    crypto: { randomUUID: () => 'chiave-finta-' + (b.finestre.length + b.elementi.size + Math.floor(Math.random() * 1e9)) },
    alert: m => b.detto.alert.push(String(m)),
    confirm: m => { b.detto.confirm.push(String(m)); return extra.rispostaConfirm === undefined ? true : extra.rispostaConfirm; },
    closeModal() {}, openGCal() {}, loadTeam() {},
    // La stessa esc() di index.html: se qui fosse una funzione finta che non
    // fa niente, le prove sui testi che finiscono nella pagina non varrebbero.
    esc: s => (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])),
    encodeForAttr: s => String(s ?? ''),
    g: id => b.elemento(id).value,
    Date, JSON, Set, Map, Array, Object, String, Number, Promise, Math, isNaN, parseInt, parseFloat,
    // extra.altro: variabili e funzioni finte in piu' (liste, stub di funzioni
    // che qui non interessano). Serve per provare funzioni che ne chiamano altre.
    ...(extra.altro || {}),
  };
  vm.createContext(ctx);
  const mancanti = [];
  for (const n of nomi) {
    const src = ritaglia(sorgente, n);
    if (!src) { mancanti.push(n); continue; }
    vm.runInContext(src, ctx, { filename: `${n}.js` });
  }
  return { ctx, browser: b, archivio: a, mancanti };
}

/** Raccoglitore di esiti, con riepilogo in italiano. */
export function esiti(titolo) {
  const righe = [];
  return {
    /* UNA PROVA ASINCRONA QUI DENTRO PASSAVA SEMPRE.
       `fn()` non veniva atteso: se la prova era `async`, quello che tornava
       era una promessa, il try/catch non vedeva niente e la riga finiva fra
       le superate — anche quando falliva. La rottura arrivava dopo, come
       «unhandled rejection», e in mezzo a un riepilogo verde nessuno la
       collegava a quella riga.
       Trovato il 20/08/2026 provando a rompere apposta il codice: tre prove
       nuove restavano verdi. Adesso una prova asincrona qui si rifiuta e lo
       dice: c'e' provaAsync, ed e' un errore rumoroso invece di un verde
       silenzioso. */
    prova(nome, fn) {
      try {
        const r = fn();
        if (r && typeof r.then === 'function') {
          r.catch(() => {});   // la promessa e' comunque governata: niente crolli a sorpresa
          throw new Error('questa prova e\' asincrona e qui non verrebbe attesa: usa provaAsync');
        }
        righe.push({ nome, ok: true });
      }
      catch (e) { righe.push({ nome, ok: false, perche: e.message }); }
    },
    async provaAsync(nome, fn) {
      try { await fn(); righe.push({ nome, ok: true }); }
      catch (e) { righe.push({ nome, ok: false, perche: e.message }); }
    },
    get ko() { return righe.filter(r => !r.ok).length; },
    get ok() { return righe.filter(r => r.ok).length; },
    righe,
    stampa() {
      console.log(titolo);
      for (const r of righe) console.log(`  ${r.ok ? 'ok ' : 'X  '} ${r.nome}${r.ok ? '' : ' — ' + r.perche}`);
      console.log(`\n${titolo}: ${this.ok} superate, ${this.ko} fallite`);
    },
  };
}

export function deve(condizione, messaggio) {
  if (!condizione) throw new Error(messaggio);
}
