// ═══════════════════════════════════════════════════════════════════════════════
//  SPEDIRE UN POG DA IAM
//
//  Il POG c'era da una parte sola: il backend sapeva riceverlo e rifiutarlo se
//  incompleto, ma dal modulo d'invio non partiva — non era nemmeno nella
//  tendina. Una funzione che esiste solo a meta' e' peggio di una che non
//  esiste: sembra fatta.
//
//  Sotto IDD (Reg. Delegato UE 2017/2358) il POG non e' un documento del plico
//  d'ingresso, da firmare una volta e archiviare. L'obbligo e' PER PRODOTTO e
//  PER VERSIONE: quando la compagnia aggiorna il POG di un prodotto, il
//  distributore deve riceverlo di nuovo. Da qui le tre cose che devono restare
//  vere:
//
//    1. Un POG senza prodotto non parte. Non perche' manchi un campo, ma
//       perche' un POG che non dice a quale prodotto si riferisce non prova
//       niente. Il backend lo rifiuta comunque: dirlo qui evita di far
//       caricare un PDF per ricevere un errore dopo.
//
//    2. Un POG senza versione non parte, per lo stesso motivo. Sugli altri
//       documenti la versione resta FACOLTATIVA — pretenderla bloccherebbe il
//       plico d'ingresso, che non ne ha una.
//
//    3. Il prodotto si sceglie da un elenco, non si scrive. Un nome battuto a
//       mano non combacia con nessuna riga del catalogo, e la catena delle
//       versioni si spezza senza che nessuno se ne accorga.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

const NOMI = ['firmaTipoInfo', 'onFirmaTipoChange', 'fcMsg', 'caricaProdottiPog'];

const SORGENTE = sorgenteAttuale();

const PRODOTTI = [
  { id: '6bedd454-8ac6-492f-b991-49232735f4d7', nome: 'Auto — RC Auto', codice: 'auto_rca', ordine: 10 },
  { id: '2fb7591d-fc1e-4555-a94c-cd29be65714c', nome: 'Casa — Multirischio', codice: 'casa_multirischio', ordine: 50 },
];

/* Il catalogo finto: `db.from(...).select(...).eq(...).order(...)`, la stessa
   catena che usa la pagina. Registra cosa e' stato chiesto, perche' il difetto
   qui sarebbe pescare anche i prodotti spenti. */
function catalogo({ righe = PRODOTTI, errore = null } = {}) {
  const chieste = [];
  const coda = {
    select(cols) { chieste.push({ passo: 'select', cols }); return coda; },
    eq(campo, val) { chieste.push({ passo: 'eq', campo, val }); return coda; },
    order(campo) { chieste.push({ passo: 'order', campo }); return coda; },
    then(ok) { return Promise.resolve(errore ? { data: null, error: { message: errore } } : { data: righe, error: null }).then(ok); },
  };
  return { chieste, db: { from(t) { chieste.push({ passo: 'from', t }); return coda; } } };
}

function schermo({ tipo = 'pog', cat = catalogo() } = {}) {
  const s = stanza(SORGENTE, NOMI, { altro: { db: cat.db, PROD_POG: null, FIRMA_TIPI: FIRMA_TIPI_VERI } });
  /* Il <select> del tipo lo legge onFirmaTipoChange: il banco fabbrica gli
     elementi su richiesta, quindi basta scriverci dentro il valore. */
  s.browser.elemento('fc-tipo').value = tipo;
  s.cat = cat;
  s.el = id => s.browser.elemento(id);
  return s;
}

/* FIRMA_TIPI e' una costante, non una funzione: non si ritaglia. Si rilegge
   dal sorgente, cosi' la prova guarda l'elenco VERO e non una copia che
   potrebbe restare indietro. */
const FIRMA_TIPI_VERI = (() => {
  const da = SORGENTE.indexOf('const FIRMA_TIPI = [');
  const a = SORGENTE.indexOf('];', da);
  deve(da > 0 && a > da, 'FIRMA_TIPI non si trova più in index.html');
  // eslint-disable-next-line no-eval
  return eval(SORGENTE.slice(da + 'const FIRMA_TIPI = '.length, a + 1));
})();

const e = esiti('SPEDIRE UN POG');

/* ── 1. il POG si può spedire ───────────────────────────────────────────── */

e.prova('il POG è fra i documenti che si possono mandare', () => {
  const pog = FIRMA_TIPI_VERI.find(t => t.value === 'pog');
  deve(pog, 'il POG non è nella tendina: dal backend si può ricevere ma nessuno può spedirlo');
  deve(pog.prodotto === true, 'il POG non chiede il prodotto: il backend lo rifiuterebbe');
  deve(pog.pdf === true, 'il POG non accetta il file: è il documento della compagnia, non uno generato da noi');
});

e.prova('e il suo nome dice cos\'è', () => {
  const pog = FIRMA_TIPI_VERI.find(t => t.value === 'pog');
  deve(/POG/.test(pog.label), 'la voce non si riconosce: ' + pog.label);
  deve(/mercato|riferimento/i.test(pog.label), 'dice solo la sigla: chi non la conosce non sa cosa sta mandando');
});

e.prova('gli altri documenti non chiedono un prodotto', () => {
  /* Un mandato non ha un prodotto, e pretenderlo bloccherebbe il plico
     d'ingresso: e' la stessa regola che il backend applica in controllaPog. */
  for (const t of FIRMA_TIPI_VERI) {
    if (t.value === 'pog') continue;
    deve(!t.prodotto, t.value + ' chiede un prodotto che non ha');
  }
});

/* ── 2. il modulo si adatta ─────────────────────────────────────────────── */

e.prova('scegliendo il POG compare il prodotto, e la versione diventa obbligatoria', () => {
  const s = schermo({ tipo: 'pog' });
  s.ctx.onFirmaTipoChange();
  deve(s.el('fc-prodotto-wrap').style.display === 'block', 'il prodotto non si chiede');
  deve(s.el('fc-versione-obb').style.display === 'inline', 'la versione non risulta obbligatoria');
  deve(/IDD/.test(s.el('fc-versione-nota').textContent),
    'non spiega perché la versione serve: sembra un campo in più per burocrazia');
});

e.prova('e su un mandato il prodotto sparisce e la versione torna facoltativa', () => {
  const s = schermo({ tipo: 'mandato' });
  s.ctx.onFirmaTipoChange();
  deve(s.el('fc-prodotto-wrap').style.display === 'none', 'si chiede un prodotto anche al mandato');
  deve(s.el('fc-versione-obb').style.display === 'none', 'la versione risulta obbligatoria su un mandato');
  deve(/provvigional/i.test(s.el('fc-versione-nota').textContent),
    'non dice perché conviene metterla lo stesso');
});

e.prova('il campo del file segue il tipo, come prima', () => {
  const pog = schermo({ tipo: 'pog' });
  pog.ctx.onFirmaTipoChange();
  deve(pog.el('fc-file-wrap').style.display === 'block', 'il POG non accetta il PDF della compagnia');
  const priv = schermo({ tipo: 'privacy_intermediario' });
  priv.ctx.onFirmaTipoChange();
  deve(priv.el('fc-file-wrap').style.display === 'none', 'si chiede un PDF per un documento che generiamo noi');
});

/* ── 3. i prodotti si scelgono da un elenco ─────────────────────────────── */

await e.provaAsync('i prodotti arrivano dal catalogo, e solo quelli attivi', async () => {
  const s = schermo();
  await s.ctx.caricaProdottiPog();
  const c = s.cat.chieste;
  deve(c.some(x => x.passo === 'from' && x.t === 'quote_prodotti_catalogo'),
    'non legge il catalogo dei prodotti: ' + JSON.stringify(c));
  deve(c.some(x => x.passo === 'eq' && x.campo === 'attivo' && x.val === true),
    'pesca anche i prodotti spenti: si manderebbe un POG per qualcosa che non vendiamo più');
  const html = s.el('fc-prodotto').innerHTML;
  deve(html.includes('Auto — RC Auto'), 'i prodotti non compaiono nella tendina');
  deve(html.includes('6bedd454-8ac6-492f-b991-49232735f4d7'),
    'la tendina non porta l\'id: il backend riceverebbe un nome invece di un prodotto');
});

await e.provaAsync('la prima voce non è un prodotto già scelto', async () => {
  /* Una tendina che parte su «Auto — RC Auto» fa partire POG sbagliati a chi
     non ci fa caso: il valore di partenza dev'essere vuoto. */
  const s = schermo();
  await s.ctx.caricaProdottiPog();
  const prima = s.el('fc-prodotto').innerHTML.match(/<option value="([^"]*)"/);
  deve(prima && prima[1] === '', 'la tendina parte su un prodotto già scelto: ' + (prima && prima[1]));
});

await e.provaAsync('se il catalogo non risponde non si ripiega su un campo libero', async () => {
  /* Un prodotto scritto a mano non combacia con nessuna riga del catalogo, e
     la catena delle versioni si spezza senza che nessuno se ne accorga: meglio
     non spedire che spedire un POG che non si riesce a ricollegare. */
  const s = schermo({ cat: catalogo({ errore: 'connessione persa' }) });
  await s.ctx.caricaProdottiPog();
  const html = s.el('fc-prodotto').innerHTML;
  deve(!/input/i.test(html), 'compare un campo libero: il prodotto scritto a mano spezza la catena');
  deve(/Non riesco/.test(html), 'non dice che è andata storta: ' + html);
  deve(!/connessione persa/.test(html), 'mostra il messaggio tecnico del database');
});

await e.provaAsync('il catalogo si legge una volta sola', async () => {
  const s = schermo();
  await s.ctx.caricaProdottiPog();
  const dopoUno = s.cat.chieste.length;
  await s.ctx.caricaProdottiPog();
  deve(s.cat.chieste.length === dopoUno,
    'rilegge il catalogo a ogni apertura: la tendina lampeggia «Caricamento…» per niente');
});

/* ── 4. quello che parte davvero ────────────────────────────────────────── */

e.prova('un POG senza prodotto o senza versione non parte', () => {
  const src = SORGENTE.slice(SORGENTE.indexOf('async function inviaFirmaCollab'),
                             SORGENTE.indexOf('function firmaDocUrl('));
  deve(/info\.prodotto && !prodottoId/.test(src), 'un POG senza prodotto arriva fino al backend');
  deve(/info\.prodotto && !versione/.test(src), 'un POG senza versione arriva fino al backend');
  deve(/IDD/.test(src), 'il messaggio non dice perché serve: sembra un campo in più per burocrazia');
});

e.prova('e prodotto, versione e decorrenza arrivano al backend', () => {
  const src = SORGENTE.slice(SORGENTE.indexOf('async function inviaFirmaCollab'),
                             SORGENTE.indexOf('function firmaDocUrl('));
  const corpo = src.slice(src.indexOf('/firma-collab/request'));
  for (const campo of ['prodottoId', 'versione', 'validoDal']) {
    deve(new RegExp(campo + ':').test(corpo), campo + ' non viene spedito: resterebbe vuoto in archivio');
  }
  deve(/versione \|\| null/.test(corpo),
    'un campo lasciato vuoto parte come stringa vuota: in archivio sembra un dato scritto male invece di un dato che non c\'è');
});

e.prova('la versione si può mettere anche sugli altri documenti', () => {
  /* E' il motivo per cui la colonna esiste: sostituire il file di una tabella
     provvigionale lasciando la stessa riga rende impossibile dimostrare a
     quali condizioni una provvigione era maturata. */
  deve(/id="fc-versione"/.test(SORGENTE), 'il campo della versione non c\'è');
  /* Il blocco del prodotto si nasconde tutto insieme quando il tipo non e' un
     POG: se il campo della versione finisse LI' DENTRO, sparirebbe con lui, e
     una tabella provvigionale tornerebbe a non avere una versione. Qui si
     guarda proprio quello: cosa c'e' dentro il blocco che sparisce. */
  const apre = SORGENTE.indexOf('id="fc-prodotto-wrap"');
  deve(apre > 0, 'il blocco del prodotto non c\'è più');
  const chiude = SORGENTE.indexOf('Il POG vale per un prodotto alla volta', apre);
  deve(chiude > apre, 'il blocco del prodotto non è più riconoscibile');
  const dentro = SORGENTE.slice(apre, SORGENTE.indexOf('</div>', chiude));
  deve(!/id="fc-versione"/.test(dentro),
    'la versione sta dentro il blocco del prodotto: sparirebbe su tutto ciò che non è un POG');
  /* E onFirmaTipoChange non deve nasconderla per conto suo. */
  const fn = SORGENTE.slice(SORGENTE.indexOf('function onFirmaTipoChange'),
                            SORGENTE.indexOf('let PROD_POG'));
  deve(!/getElementById\('fc-versione'\)/.test(fn),
    'il cambio di tipo tocca il campo della versione: su un mandato sparirebbe');
});

e.prova('tutte le funzioni che servono sono ancora in index.html', () => {
  const s = schermo();
  deve(s.mancanti.length === 0, 'non si trovano più: ' + s.mancanti.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
