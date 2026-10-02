// ═══════════════════════════════════════════════════════════════════════════════
//  PREVENTIVO PERSONALIZZATO — IL RUI DEL COLLABORATORE NON RESTA INDIETRO
//
//  02/10/2026, segnalazione di Francesco: «ho aggiornato la scheda anagrafica
//  dell'intermediario ma esce sempre la scritta RUI da verificare».
//
//  Il dato era GIUSTO in archivio. A leggerlo vecchio era `INTERM_CACHE`, che
//  si carica all'avvio e non si rinfresca mai: lui aveva il gestionale aperto,
//  è andato a compilare il RUI in IAM, è tornato — e in memoria c'era ancora
//  la riga di prima.
//
//  È lo stesso guasto che `ppAzienda` aveva già avuto e già corretto. Questa
//  suite esiste perché non scatti una terza volta: in Node non si vede, perché
//  in Node la cache del browser non esiste.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { apriPreventivatore } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriPreventivatore(RADICE);
const p = banco.pagina;

const ODDO = '33109d90-e50e-4aad-a574-0ee85de74c54';

/* Mette la pagina nella condizione ESATTA della segnalazione: in memoria il
   collaboratore senza RUI (la copia di stamattina), in archivio il RUI
   compilato (quello che lui ha appena scritto). Poi chiede il contorno del
   documento e riporta che cosa ci finisce sopra.

   `quante` dice quante volte si è andati a rileggere il database: serve a
   provare che non si rilegge a ogni foglio. */
async function contesto({ ruiInCache, ruiInArchivio, pausaScaduta = true }) {
  return p.evaluate(async ({ id, ruiInCache, ruiInArchivio, pausaScaduta }) => {
    const scrivi = (v) => { window.__f = v; (0, eval)('db = window.__f'); };
    const veroDb = (0, eval)('db');
    const vecchiaCache = (0, eval)('INTERM_CACHE');
    let letture = 0;
    /* In archivio: il collaboratore COL RUI che Francesco ha appena scritto. */
    const riga = { id, nome: 'Francesco', cognome: 'Oddo', attivo: true, struttura: null,
                   iam_id: null, rui_numero: ruiInArchivio, rui_data: null,
                   rui_sezione: null, veste: 'Altro' };
    const finto = (tab) => {
      const q = {
        select: () => q, eq: () => q, order: () => q,
        single: () => Promise.resolve({ data: { dati: { rs: 'With us', sede: 'Vico giunone 3',
          piva: '02690380817', rui_numero: 'A000747484', rui_sezione: 'A', rui_data: '' } } }),
        then: (ok) => {
          if (tab === 'quote_collaboratori') letture++;
          return Promise.resolve({ data: tab === 'quote_collaboratori' ? [riga] : [] }).then(ok);
        },
      };
      return q;
    };
    scrivi({ from: finto });
    /* In memoria: la copia di stamattina, col RUI com'era allora. */
    (0, eval)('INTERM_CACHE = window.__c');
    window.__c = [{ ...riga, rui_numero: ruiInCache }];
    (0, eval)('INTERM_CACHE = window.__c');
    (0, eval)('PP_AZIENDA = null');
    (0, eval)('PP_RILETTO_IL = ' + (pausaScaduta ? 0 : Date.now()));
    try {
      const ctx = await ppContesto({ intermediario_id: id, cliente_id: null });
      const d = ppDocumento({ intermediario_id: id, numero: '1' }, ctx);
      return {
        ruiScritto: d.intermediario.rui,
        nome: d.intermediario.nome,
        /* Il campo si chiama `daConfermare`, non `mancanti`: leggendo il nome
           sbagliato le prove che lo guardano passano su un elenco vuoto senza
           guardare niente. */
        mancanti: d.daConfermare || [],
        letture,
      };
    } finally {
      scrivi(veroDb);
      window.__c = vecchiaCache;
      (0, eval)('INTERM_CACHE = window.__c');
      delete window.__f; delete window.__c;
    }
  }, { id: ODDO, ruiInCache, ruiInArchivio, pausaScaduta });
}

// ── 1. le funzioni esistono ──────────────────────────────────────────────────

prova('le funzioni del preventivo personalizzato ci sono', async () => {
  const c = await p.evaluate(() => ({
    contesto: typeof ppContesto === 'function',
    documento: typeof ppDocumento === 'function',
    rui: typeof ppRuiTesto === 'function',
    carica: typeof caricaIntermediari === 'function',
    pausa: typeof PP_RILEGGI_OGNI !== 'undefined',
  }));
  deve(Object.values(c).every(Boolean), 'manca un pezzo: ' + JSON.stringify(c));
});

// ── 2. il guasto segnalato, e la sua correzione ──────────────────────────────

prova('IL CASO DI FRANCESCO: RUI compilato in IAM, cache vecchia → si rilegge', async () => {
  /* La prova che conta. Prima della correzione qui usciva «da confermare»
     anche col RUI scritto in archivio. */
  const c = await contesto({ ruiInCache: null, ruiInArchivio: 'A000552192' });
  deve(/A000552192/.test(c.ruiScritto), 'sul documento non arriva il RUI appena scritto: «' + c.ruiScritto + '»');
  deve(!/confermare|verificare/i.test(c.ruiScritto), 'dice ancora di confermarlo: «' + c.ruiScritto + '»');
  deve(!c.mancanti.some(m => /RUI dell'intermediario/i.test(m)),
    'il RUI dell\'intermediario resta fra le cose mancanti: ' + JSON.stringify(c.mancanti));
  deve(c.letture === 1, 'non è andato a rileggere l\'archivio: letture ' + c.letture);
});

prova('col RUI già in memoria non si rilegge niente', async () => {
  /* La correzione non deve diventare una lettura a ogni foglio. */
  const c = await contesto({ ruiInCache: 'A000552192', ruiInArchivio: 'A000552192' });
  deve(/A000552192/.test(c.ruiScritto), JSON.stringify(c));
  deve(c.letture === 0, 'ha riletto l\'archivio senza motivo: letture ' + c.letture);
});

prova('un collaboratore che il RUI non ce l\'ha davvero resta «da confermare»', async () => {
  /* La rilettura non deve inventare niente: se in archivio il RUI non c'è, il
     documento lo dice — ed è giusto che lo dica. */
  const c = await contesto({ ruiInCache: null, ruiInArchivio: null });
  deve(/confermare/i.test(c.ruiScritto), 'si è inventato un\'iscrizione: «' + c.ruiScritto + '»');
  deve(c.mancanti.some(m => /RUI dell'intermediario/i.test(m)),
    'non mette il RUI fra le cose che mancano: ' + JSON.stringify(c.mancanti));
});

prova('e non rilegge l\'archivio a ogni foglio: la pausa regge', async () => {
  /* Senza pausa, un collaboratore senza RUI farebbe una richiesta al database
     per ogni documento stampato, per sempre. */
  const c = await contesto({ ruiInCache: null, ruiInArchivio: null, pausaScaduta: false });
  deve(c.letture === 0, 'ha riletto dentro la pausa: letture ' + c.letture);
  deve(/confermare/i.test(c.ruiScritto), 'e intanto ha scritto qualcosa di strano: ' + c.ruiScritto);
});

prova('due fogli di fila su chi il RUI non ce l\'ha: si legge UNA volta sola', async () => {
  /* La prova di prima metteva la pausa a mano e guardava un foglio solo:
     restava verde anche togliendo l'istruzione che FA PARTIRE la pausa, cioè
     non provava la cosa che diceva di provare. L'ha detto la controprova.
     Qui si stampano due documenti di seguito, come succede davvero. */
  const c = await p.evaluate(async ({ id }) => {
    const scrivi = (v) => { window.__f = v; (0, eval)('db = window.__f'); };
    const veroDb = (0, eval)('db');
    const vecchiaCache = (0, eval)('INTERM_CACHE');
    let letture = 0;
    const riga = { id, nome: 'Francesco', cognome: 'Oddo', attivo: true, rui_numero: null };
    const finto = (tab) => {
      const q = { select: () => q, eq: () => q, order: () => q,
        single: () => Promise.resolve({ data: { dati: { rs: 'With us', rui_numero: 'A000747484' } } }),
        then: (ok) => { if (tab === 'quote_collaboratori') letture++;
          return Promise.resolve({ data: tab === 'quote_collaboratori' ? [riga] : [] }).then(ok); } };
      return q;
    };
    scrivi({ from: finto });
    window.__c = [{ ...riga }];
    (0, eval)('INTERM_CACHE = window.__c');
    (0, eval)('PP_AZIENDA = null'); (0, eval)('PP_RILETTO_IL = 0');
    try {
      await ppContesto({ intermediario_id: id, cliente_id: null });
      await ppContesto({ intermediario_id: id, cliente_id: null });
      return { letture };
    } finally {
      scrivi(veroDb); window.__c = vecchiaCache;
      (0, eval)('INTERM_CACHE = window.__c'); delete window.__f; delete window.__c;
    }
  }, { id: ODDO });
  deve(c.letture === 1, 'due fogli di fila e ' + c.letture + ' letture: la pausa non parte');
});

// ── 3. quello che non si deve rompere ────────────────────────────────────────

prova('il nome del collaboratore arriva sul documento', async () => {
  const c = await contesto({ ruiInCache: null, ruiInArchivio: 'A000552192' });
  deve(/Oddo/.test(c.nome), 'il nome non arriva: ' + c.nome);
});

prova('senza collaboratore il documento usa l\'agenzia, non «da confermare»', async () => {
  /* Caso dell'agente generale che non ha una scheda collaboratore: il
     documento resta a norma con l'iscrizione dell'agenzia. Era già stato
     corretto una volta e non deve tornare indietro. */
  const c = await p.evaluate(async () => {
    const scrivi = (v) => { window.__f = v; (0, eval)('db = window.__f'); };
    const veroDb = (0, eval)('db');
    const finto = () => ({ select: () => finto(), eq: () => finto(), order: () => finto(),
      single: () => Promise.resolve({ data: { dati: { rs: 'With us', rui_numero: 'A000747484', rui_sezione: 'A' } } }),
      then: (ok) => Promise.resolve({ data: [] }).then(ok) });
    scrivi({ from: finto });
    (0, eval)('PP_AZIENDA = null');
    try {
      const ctx = await ppContesto({ intermediario_id: null, cliente_id: null });
      const d = ppDocumento({ numero: '1' }, ctx);
      return { rui: d.intermediario.rui, nome: d.intermediario.nome };
    } finally { scrivi(veroDb); delete window.__f; }
  });
  deve(/A000747484/.test(c.rui), 'senza collaboratore non usa il RUI dell\'agenzia: ' + c.rui);
  deve(!/confermare/i.test(c.rui), 'blocca di nuovo chi non ha una scheda collaboratore: ' + c.rui);
});

prova('aprendo il preventivatore non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPREVENTIVO — il RUI del collaboratore');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nRUI NEL PREVENTIVO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
