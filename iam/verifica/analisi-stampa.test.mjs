// ═══════════════════════════════════════════════════════════════════════════════
//  ANALISI DEI BISOGNI — IL FOGLIO STAMPATO
//
//  E' l'unica cosa di questo modulo che finisce in mano a un cliente. Quindi
//  qui non si guarda se «esce un PDF»: si guarda CHE COSA c'e' scritto sopra.
//
//  Il modulo e' diviso in due apposta — abDocumento() decide il contenuto,
//  abPdfBlob() il disegno — e le prove seguono la stessa divisione:
//   1) il contenuto si prova senza aprire nessun PDF;
//   2) il disegno si prova con un finto jsPDF che REGISTRA ogni riga scritta,
//      perche' una cosa calcolata giusta e non disegnata e' una cosa che sul
//      foglio non c'e'.
// ═══════════════════════════════════════════════════════════════════════════════
import vm from 'vm';
import { sorgenteAttuale, ritaglia, esiti, deve } from './banco.mjs';

const src = sorgenteAttuale();
const e = esiti('ANALISI · IL FOGLIO STAMPATO');

/* ── la stanza: le funzioni del foglio, ritagliate dal file ───────────────── */
const NOMI = ['abDataIt', 'abRuiTesto', 'abDocumento', 'abLogo', 'abCaricaJsPdf', 'abPdfBlob', 'abStampa'];
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  Date, JSON, Set, Map, Array, Object, String, Number, Promise, Math, RegExp,
  isNaN, parseInt, parseFloat, Error,
  AB_DA_CONFERMARE: 'da confermare',
  AB_AVVERTENZE: 'Questa analisi indica quali aree meritano un confronto e perche\'. Non e\' un preventivo.',
  AB_AZIENDA: null, AB_LOGO: null, _abJsPdfPromise: null,
  AB_DATI: null, AB_ANALISI_ID: null, PROFILO: null,
  alert() {}, fetch: () => Promise.reject(new Error('senza rete')),
  URL: { createObjectURL: () => 'blob:finto', revokeObjectURL() {} },
  setTimeout: (f) => f,
  document: { getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, body: { appendChild() {} } },
  window: {},
};
ctx.window = ctx;
vm.createContext(ctx);
const mancanti = [];
for (const n of NOMI) {
  const s = ritaglia(src, n);
  if (!s) { mancanti.push(n); continue; }
  vm.runInContext(s, ctx, { filename: n + '.js' });
}

e.prova('le funzioni del foglio si ritrovano tutte nel file', () => {
  deve(mancanti.length === 0, 'non trovo: ' + mancanti.join(', '));
});

/* ── un'analisi finta, com'esce dal motore di rating ──────────────────────── */
const SNAPSHOT = {
  versioneRegole: 'ABR-1.0.0', versioneQuestionario: 'ABQ-1.0.0', indiceComplessivo: 71,
  necessita: [
    { chiave: 'famiglia', etichetta: 'Famiglia e reddito', colore: 'rosso', stato: 'Priorità alta',
      punteggio: 78, prossimoPasso: 'Misurare reddito da proteggere.', motivi: ['Due figli a carico', 'Mutuo in corso'] },
    { chiave: 'casa', etichetta: 'Casa e patrimonio', colore: 'ambra', stato: 'Da approfondire',
      punteggio: 52, prossimoPasso: 'Verificare somme assicurate.', motivi: ['Abitazione di proprietà'] },
    { chiave: 'previdenza', etichetta: 'Previdenza e risparmio', colore: 'grigio', stato: 'Dati insufficienti',
      punteggio: 0, prossimoPasso: 'Chiarire obiettivi.', motivi: ['Non sono emersi elementi sufficienti.'] },
  ],
};
const CONTORNO = {
  azienda: { rs: 'With Us Assicurazioni', sede: 'Via Prova 1, Roma', piva: '01234567890',
             rui_sezione: 'A', rui_numero: 'A000123456', rui_data: '2019-03-04', tel: '06 000000' },
  consulente: { nome: 'Mario', cognome: 'Rossi', rui: 'E000999888' },
  dati: { anagrafica: { nome: 'Luigi', cognome: 'Bianchi', nascita: '1980-06-15', cf: 'BNCLGU80H15H501X',
                        email: 'l.bianchi@esempio.it', telefono: '333 1112223' },
          note: 'Sta valutando un secondo mutuo.' },
  archiviata: true,
  quando: '2026-09-14T10:00:00Z',
};

// ─── 1. IL CONTENUTO ────────────────────────────────────────────────────────
e.prova('il foglio riporta cliente, consulente e agenzia presi dove gia\' vivono', () => {
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  deve(d.cliente.nominativo === 'Luigi Bianchi', 'cliente: ' + d.cliente.nominativo);
  deve(d.cliente.nascita === '15/06/1980', 'la data di nascita resta in formato database: ' + d.cliente.nascita);
  deve(d.consulente.nome === 'Mario Rossi', 'consulente: ' + d.consulente.nome);
  deve(/A000123456/.test(d.azienda.rui) && /sez\. A/.test(d.azienda.rui), 'RUI agenzia: ' + d.azienda.rui);
  deve(/E000999888/.test(d.consulente.rui), 'RUI consulente: ' + d.consulente.rui);
  deve(d.daConfermare.length === 0, 'segnala mancante qualcosa che c\'e\': ' + d.daConfermare.join(', '));
  return d.nomeFile;
});

e.prova('un RUI che manca esce «da confermare» e finisce nell\'elenco, non sparisce', () => {
  /* CLAUDE.md §8.1: niente dati inventati. Su un foglio che porta il marchio
     dell'agenzia, un'iscrizione al RUI stampata a meta' sembra completa. */
  const senza = JSON.parse(JSON.stringify(CONTORNO));
  senza.azienda.rui_numero = ''; senza.consulente.rui = '';
  const d = ctx.abDocumento(SNAPSHOT, senza);
  deve(d.azienda.rui === 'da confermare', 'RUI agenzia: ' + d.azienda.rui);
  deve(d.consulente.rui === 'da confermare', 'RUI consulente: ' + d.consulente.rui);
  deve(d.daConfermare.length === 2, 'i mancanti non sono elencati: ' + JSON.stringify(d.daConfermare));
  return d.daConfermare.join(' · ');
});

e.prova('la necessita\' principale e\' la stessa che sceglie lo schermo: la prima non grigia', () => {
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  deve(d.principale && d.principale.etichetta === 'Famiglia e reddito',
    'principale: ' + JSON.stringify(d.principale && d.principale.etichetta));
  deve(d.principale.stato === 'Priorità alta', 'stato: ' + d.principale.stato);
  deve(d.principale.motivi.length === 2, 'i motivi non arrivano sul foglio');
});

e.prova('quando tutto e\' grigio non si stampa il vuoto, si stampa la ragione', () => {
  /* «Non e' emerso niente» e «non abbiamo chiesto abbastanza» sono notizie
     opposte. Un foglio che le facesse sembrare uguali direbbe una bugia. */
  const tuttoGrigio = { ...SNAPSHOT, indiceComplessivo: null,
    necessita: SNAPSHOT.necessita.map(n => ({ ...n, colore: 'grigio', stato: 'Dati insufficienti' })) };
  const d = ctx.abDocumento(tuttoGrigio, CONTORNO);
  deve(d.principale === null, 'sceglie una principale fra le grigie');
  deve(/non bastano ancora/.test(d.senzaPrincipale), 'non spiega perche\': ' + d.senzaPrincipale);
  deve(d.indice === '—', 'un indice assente diventa un numero: ' + d.indice);
});

e.prova('un indice assente non diventa zero', () => {
  /* Zero e «non lo sappiamo» su carta non si distinguerebbero mai piu'. */
  const d = ctx.abDocumento({ ...SNAPSHOT, indiceComplessivo: null }, CONTORNO);
  deve(d.indice === '—', 'indice: ' + d.indice);
  const zero = ctx.abDocumento({ ...SNAPSHOT, indiceComplessivo: 0 }, CONTORNO);
  deve(zero.indice === '0', 'uno zero vero diventa un trattino: ' + zero.indice);
});

e.prova('ogni area porta il suo stato SCRITTO, non solo un colore', () => {
  /* Stampato in bianco e nero, o letto da chi non distingue rosso e verde, il
     colore da solo non dice niente (specifica 08 §6). */
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  deve(d.aree.length === 3, 'aree sul foglio: ' + d.aree.length);
  for (const a of d.aree) deve(a.stato && a.stato.length > 2, 'area senza stato a parole: ' + a.etichetta);
  /* Un'area grigia non ha un punteggio basso: non ne ha uno. Stamparne uno
     comunque - zero, o un trattino travestito da numero - trasformerebbe «non
     lo sappiamo» in una misura. */
  const grigia = d.aree.find(a => a.colore === 'grigio');
  deve(grigia.punteggio === null, 'un\'area senza dati stampa un punteggio come se ne avesse: ' + grigia.punteggio);
  deve(d.aree.filter(a => a.punteggio).length === 2, 'i punteggi stampati non sono quelli calcolabili');
});

e.prova('il foglio dice se l\'analisi e\' archiviata oppure no', () => {
  /* Il motore archivia sulla scheda del cliente, questo foglio no. Chi lo
     ritrova fra un mese deve sapere che cosa ha in mano. */
  deve(ctx.abDocumento(SNAPSHOT, CONTORNO).archiviata === true, 'archiviata non risulta');
  deve(ctx.abDocumento(SNAPSHOT, { ...CONTORNO, archiviata: false }).archiviata === false, 'non archiviata risulta archiviata');
});

e.prova('le avvertenze dicono che non e\' un preventivo ne\' una raccomandazione', () => {
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  deve(/non e' un preventivo/i.test(d.avvertenze), 'le avvertenze non lo dicono: ' + d.avvertenze.slice(0, 60));
});

// ─── 2. IL DISEGNO ──────────────────────────────────────────────────────────
/* Un finto jsPDF che registra tutto quello che gli viene chiesto di scrivere.
   Serve a provare l'unica cosa che conta davvero: che quello che abDocumento()
   ha calcolato finisca DAVVERO sul foglio. */
function fintoJsPdf() {
  const scritte = [], immagini = [], pagine = { n: 1, corrente: 1 };
  function Doc() {}
  Doc.prototype = {
    setProperties(p) { this.props = p; },
    setFillColor() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {},
    setFont() {}, setFontSize() {},
    splitTextToSize(t, w) { return String(t).match(new RegExp('.{1,' + Math.max(8, Math.round(w * 2)) + '}', 'g')) || ['']; },
    text(t, x, y) { (Array.isArray(t) ? t : [t]).forEach(r => scritte.push({ t: String(r), x, y, p: pagine.corrente })); },
    rect() {}, roundedRect() {}, circle() {}, line() {},
    addImage(d) { immagini.push(d); },
    getTextWidth(t) { return String(t).length * 1.8; },
    addPage() { pagine.n++; pagine.corrente = pagine.n; },
    getNumberOfPages() { return pagine.n; },
    setPage(i) { pagine.corrente = i; },
    output() { return { finto: true, byte: scritte.length }; },
  };
  const C = function () { return new Doc(); };
  return { C, scritte, immagini, pagine };
}

async function disegna(documento) {
  const f = fintoJsPdf();
  ctx.window.jspdf = { jsPDF: f.C };
  ctx.AB_LOGO = null; ctx._abJsPdfPromise = null;
  await ctx.abPdfBlob(documento);
  return f;
}

await e.provaAsync('sul foglio finiscono davvero il cliente, l\'agenzia e il consulente', async () => {
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  const f = await disegna(d);
  const tutto = f.scritte.map(s => s.t).join(' | ');
  for (const atteso of ['Luigi Bianchi', 'With Us Assicurazioni', 'Mario Rossi', 'ANALISI DEI BISOGNI']) {
    deve(tutto.includes(atteso), 'non e\' stato scritto: ' + atteso);
  }
  return f.scritte.length + ' righe disegnate su ' + f.pagine.n + ' pagine';
});

await e.provaAsync('lo stato di ogni area viene SCRITTO, non solo colorato', async () => {
  /* La prova che vale: il colore lo disegna circle(), che non lascia testo.
     Se un giorno lo stato restasse solo un pallino, qui diventa rosso. */
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  const f = await disegna(d);
  const tutto = f.scritte.map(s => s.t).join(' | ');
  for (const a of d.aree) {
    deve(tutto.includes(a.stato), 'lo stato «' + a.stato + '» non e\' scritto da nessuna parte');
    deve(tutto.includes(a.etichetta), 'l\'area «' + a.etichetta + '» non compare');
  }
});

await e.provaAsync('l\'indice complessivo finisce sul foglio, e un indice assente resta un trattino', async () => {
  const pieno = await disegna(ctx.abDocumento(SNAPSHOT, CONTORNO));
  deve(pieno.scritte.some(s => s.t === '71'), 'l\'indice 71 non e\' stato scritto');
  const vuoto = await disegna(ctx.abDocumento({ ...SNAPSHOT, indiceComplessivo: null }, CONTORNO));
  deve(!vuoto.scritte.some(s => s.t === '0'), 'un indice assente e\' uscito come zero');
});

await e.provaAsync('il «da confermare» si vede sul foglio, non solo nell\'elenco dei mancanti', async () => {
  const senza = JSON.parse(JSON.stringify(CONTORNO));
  senza.azienda.rui_numero = ''; senza.consulente.rui = '';
  const f = await disegna(ctx.abDocumento(SNAPSHOT, senza));
  const tutto = f.scritte.map(s => s.t).join(' ');
  deve(/da confermare/.test(tutto), 'il foglio stampa un\'intestazione che sembra completa');
});

await e.provaAsync('ogni pagina porta il piede con le versioni delle regole', async () => {
  /* Il punteggio dipende dalle regole in vigore quel giorno. Un foglio che non
     dice con quali regole e' stato calcolato non si puo' rileggere fra un anno. */
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  const f = await disegna(d);
  for (let i = 1; i <= f.pagine.n; i++) {
    const piede = f.scritte.filter(s => s.p === i && s.y > 288);
    deve(piede.length >= 2, 'la pagina ' + i + ' non ha il piede');
    deve(piede.some(s => /ABR-1\.0\.0/.test(s.t)), 'la pagina ' + i + ' non dice con quali regole e\' stata calcolata');
    deve(piede.some(s => /Pagina \d+ di \d+/.test(s.t)), 'la pagina ' + i + ' non e\' numerata');
  }
  return f.pagine.n + ' pagine, tutte firmate';
});

await e.provaAsync('quando le aree sono tante il foglio va a capo pagina invece di scrivere fuori', async () => {
  /* Con cinque aree lunghe il contenuto non sta in una facciata. Se «spazio()»
     smettesse di aprire pagine, il testo finirebbe sotto il piede o oltre il
     bordo — e sul PDF non se ne accorge nessuno finche' non si stampa. */
  const lunga = (i) => ({
    chiave: 'a' + i, etichetta: 'Area numero ' + i, colore: 'rosso', stato: 'Priorità alta', punteggio: 80,
    prossimoPasso: 'Un prossimo passo abbastanza lungo da occupare piu' + ' di una riga sul foglio stampato.',
    motivi: ['Motivo lungo numero uno, con abbastanza parole da andare a capo almeno una volta.',
             'Motivo lungo numero due, altrettanto prolisso e altrettanto necessario.',
             'Motivo lungo numero tre, per arrivare in fondo alla facciata.'],
  });
  const tante = { ...SNAPSHOT, necessita: [1, 2, 3, 4, 5, 6].map(lunga) };
  const f = await disegna(ctx.abDocumento(tante, CONTORNO));
  deve(f.pagine.n > 1, 'tutto su una pagina sola: qualcosa e\' finito fuori dal foglio');
  const fuori = f.scritte.filter(s => s.y > 294);
  deve(fuori.length === 0, fuori.length + ' righe scritte sotto il bordo, la prima: «' + (fuori[0] || {}).t + '»');
  return f.pagine.n + ' pagine, niente fuori dal foglio';
});

e.prova('i motivi della necessita\' principale non si ripetono venti righe piu\' giu\'', () => {
  /* Stavano due volte sulla stessa facciata: per esteso nel riquadro verde e
     di nuovo identici nella scheda dell'area. Mezza pagina in piu' e nemmeno
     una parola in piu'. */
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  const scheda = d.aree.find(a => a.etichetta === d.principale.etichetta);
  deve(scheda.motivi.length === 0, 'i motivi della principale sono ristampati nella sua scheda');
  deve(/qui sopra/.test(scheda.rimando), 'e nemmeno un rimando a dove stanno: ' + scheda.rimando);
  const altra = d.aree.find(a => a.etichetta !== d.principale.etichetta && a.colore !== 'grigio');
  deve(altra.motivi.length > 0, 'adesso nessuna area porta piu\' i suoi motivi');
  deve(!altra.rimando, 'un\'area non dettagliata sopra manda a leggere sopra');
});

await e.provaAsync('la banda «copia di lavoro» sta sul foglio, e prima di tutto il resto', async () => {
  /* Il documento autorevole lo produce il motore, da quello che ha in
     archivio. Questo lo compone il browser, da quello che sta sullo schermo.
     Senza una riga che li distingua sono lo stesso foglio in mano a chi lo
     riceve: stessa carta intestata, stesso RUI, stesso marchio. */
  const d = ctx.abDocumento(SNAPSHOT, CONTORNO);
  deve(/COPIA DI LAVORO/.test(d.copiaDiLavoro), 'il documento non porta la marcatura: ' + d.copiaDiLavoro);
  const f = await disegna(d);
  const banda = f.scritte.filter(s => /COPIA DI LAVORO/.test(s.t));
  deve(banda.length > 0, 'la banda non viene disegnata');
  const cliente = f.scritte.find(s => s.t === 'CLIENTE');
  deve(cliente && banda[0].y < cliente.y,
    'la banda finisce sotto le schede: in calce la legge solo chi arriva in fondo');
  return banda.length + ' marcature disegnate';
});

await e.provaAsync('la marcatura cambia parole quando l\'analisi non e\' archiviata', async () => {
  /* «Non e' il documento ufficiale» e «non risulta archiviata» sono due
     notizie diverse, e chi tiene il foglio deve sapere quale delle due vale. */
  const archiviata = ctx.abDocumento(SNAPSHOT, CONTORNO);
  const no = ctx.abDocumento(SNAPSHOT, { ...CONTORNO, archiviata: false });
  deve(/archiviato sulla scheda del cliente/.test(archiviata.copiaDiLavoro), archiviata.copiaDiLavoro);
  deve(/non risulta archiviata/.test(no.copiaDiLavoro), no.copiaDiLavoro);
  deve(archiviata.copiaDiLavoro !== no.copiaDiLavoro, 'le due situazioni escono con le stesse parole');
});

await e.provaAsync('senza logo il foglio esce lo stesso, con l\'intestazione', async () => {
  /* Un documento senza logo esce; senza intestazione no. */
  const f = await disegna(ctx.abDocumento(SNAPSHOT, CONTORNO));
  deve(f.immagini.length === 0, 'la prova non sta girando senza logo');
  deve(f.scritte.some(s => s.t === 'WU'), 'senza logo non ripiega su niente');
  deve(f.scritte.some(s => /With Us Assicurazioni/.test(s.t)), 'l\'intestazione sparisce col logo');
});

e.prova('il bottone sta in fondo al risultato, e chiama il foglio', () => {
  /* CLAUDE.md §6b: una schermata che il codice scrive deve avere chi la
     accende. Qui vale uguale per un bottone: la funzione piu' provata del
     mondo non serve a niente se non c'e' niente che la chiami. */
  const i = src.indexOf("function abEsito()");
  const j = src.indexOf("async function abChiudiSulMotore", i);
  deve(i > 0 && j > i, 'non trovo piu\' la schermata del risultato');
  const esito = src.slice(i, j);
  deve(/onclick="abStampa\(\)"/.test(esito), 'nel risultato non c\'e\' nessun bottone che stampa');
  deve(/ab-stampa-stato/.test(esito), 'manca la riga che dice com\'e\' andata');
  /* «Alla fine»: dopo l'elenco delle aree, non in cima. */
  deve(esito.indexOf('abStampa()') > esito.indexOf("ab-schede"),
    'il bottone e\' finito prima delle aree');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
