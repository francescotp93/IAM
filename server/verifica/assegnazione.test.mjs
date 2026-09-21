// ═══════════════════════════════════════════════════════════════════════════════
//  DI CHI SONO LE RATE — tariffe/motore/assegnazione.js  (19/09/2026)
//
//  Questo motore sposta delle rate da «di nessuno» a «di Tizio», in blocco, e
//  su quelle rate poi si pagano delle provvigioni. Le prove sotto sono quelle
//  che, se saltano, producono un'assegnazione CREDIBILE E SBAGLIATA: un codice
//  attribuito senza che nessuno l'abbia deciso, un'assegnazione fatta a mano
//  cancellata da una in blocco, due compagnie che si scambiano le persone.
//
//  Dati tutti inventati: nessun nome e nessuna cifra vera (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../../tariffe/motore/assegnazione.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* ── Il banco ─────────────────────────────────────────────────────────────
   Cinque polizze: tre di PRIMA con tre codici diversi, una di un'altra
   compagnia che usa LO STESSO codice di una di PRIMA (è il caso della regola
   3), e una che non viene da nessun flusso. */
const P = (o) => Object.assign({ compagnia: 'PRIMA', dati: {} }, o);
const POLIZZE = [
  P({ id: 'p1', cliente: 'ROSSI MARIO', prodotto: 'RC Auto', data_effetto: '2025-10-24', dati: { ssf: { collaboratore: 'U100' } } }),
  P({ id: 'p2', cliente: 'VERDI LUCA', prodotto: 'RC Auto', data_effetto: '2026-03-13', dati: { ssf: { collaboratore: 'U100' } } }),
  P({ id: 'p3', cliente: 'BIANCHI SRL', prodotto: 'Casa', data_effetto: '2026-05-06', dati: { ssf: { collaboratore: 'U200' } } }),
  /* Stesso codice `U100`, compagnia diversa: è un'altra persona. */
  P({ id: 'p4', compagnia: 'ALTRA', cliente: 'NERI ANNA', prodotto: 'Infortuni', data_effetto: '2026-06-01', dati: { ssf: { collaboratore: 'U100' } } }),
  /* Nata in QUOTO: nessun codice. */
  P({ id: 'p5', cliente: 'GIALLI SPA', prodotto: 'Casa', data_effetto: '2026-02-02', dati: {} })
];

const T = (o) => Object.assign({ stato: 'incassato', collaboratore_id: null, importo_lordo: 100, provvigione: 10 }, o);
const TITOLI = [
  T({ id: 't1', polizza_id: 'p1' }),
  T({ id: 't2', polizza_id: 'p1' }),
  T({ id: 't3', polizza_id: 'p2' }),
  T({ id: 't4', polizza_id: 'p3' }),
  T({ id: 't5', polizza_id: 'p4' }),
  T({ id: 't6', polizza_id: 'p5' }),
  /* Una rata che punta a una polizza che non è nell'elenco. */
  T({ id: 't7', polizza_id: 'p-sparita' })
];

const DECISO = A.mappa([
  { compagnia: 'PRIMA', codice: 'U100', collaboratore_id: 'c1', nessuno: false, deciso: true },
  { compagnia: 'ALTRA', codice: 'U100', collaboratore_id: 'c2', nessuno: false, deciso: true }
  /* `PRIMA|U200` non c'è: non deciso. */
]);

/* ══ REGOLA 1 — niente decisione, niente assegnazione ════════════════════ */
prova('un codice senza decisione non muove niente', () => {
  const p = A.piano(TITOLI, POLIZZE, DECISO);
  const mosse = p.assegna.map(x => x.id).sort();
  deve(mosse.indexOf('t4') < 0, 't4 assegnata su un codice mai deciso');
  const s = p.saltate.find(x => x.id === 't4');
  deve(s && s.motivo === 'codice-non-deciso', 'motivo di t4: ' + (s && s.motivo));
  return 't4 resta ferma, e il motivo è scritto';
});

prova('una mappa vuota non assegna proprio niente', () => {
  const p = A.piano(TITOLI, POLIZZE, {});
  deve(p.assegna.length === 0, 'assegnate con mappa vuota: ' + p.assegna.length);
  return '0 su ' + TITOLI.length;
});

prova('una polizza senza codice non finisce a chi ha importato', () => {
  const p = A.piano(TITOLI, POLIZZE, DECISO);
  const s = p.saltate.find(x => x.id === 't6');
  deve(s && s.motivo === 'senza-codice', 'motivo di t6: ' + (s && s.motivo));
  return 't6 (polizza nata in QUOTO) resta da assegnare a mano';
});

prova('una rata senza la sua polizza si dichiara, non sparisce', () => {
  const p = A.piano(TITOLI, POLIZZE, DECISO);
  const s = p.saltate.find(x => x.id === 't7');
  deve(s && s.motivo === 'senza-polizza', 'motivo di t7: ' + (s && s.motivo));
  return 't7 finisce fra le saltate con il suo motivo';
});

/* ══ REGOLA 2 — non si sovrascrive quello che c'è ════════════════════════ */
prova('una rata già assegnata a mano non viene coperta', () => {
  const titoli = TITOLI.map(t => t.id === 't1' ? Object.assign({}, t, { collaboratore_id: 'cX' }) : t);
  const p = A.piano(titoli, POLIZZE, DECISO);
  deve(!p.assegna.find(x => x.id === 't1'), 't1 riscritta: il lavoro a mano è andato perso');
  const s = p.saltate.find(x => x.id === 't1');
  deve(s && s.motivo === 'gia-assegnata' && s.a === 'cX', 'motivo di t1: ' + (s && s.motivo));
  return 't1 resta di cX, e il piano lo dice';
});

prova('«già assegnata alla stessa persona» non è un conflitto', () => {
  const titoli = TITOLI.map(t => t.id === 't1' ? Object.assign({}, t, { collaboratore_id: 'c1' }) : t);
  const p = A.piano(titoli, POLIZZE, DECISO);
  const s = p.saltate.find(x => x.id === 't1');
  deve(s && s.motivo === 'gia-a-posto', 'motivo di t1: ' + (s && s.motivo));
  deve(!p.assegna.find(x => x.id === 't1'), 't1 riscritta per niente');
  return 'distinta da un conflitto vero: non è lavoro';
});

prova('sovrascrivere si può, ma resta contato a parte', () => {
  const titoli = TITOLI.map(t => t.id === 't1' ? Object.assign({}, t, { collaboratore_id: 'cX' }) : t);
  const p = A.piano(titoli, POLIZZE, DECISO, { sovrascrivi: true });
  deve(!!p.assegna.find(x => x.id === 't1'), 't1 non spostata nonostante sovrascrivi');
  deve(p.sovrascritte.length === 1, 'sovrascritte: ' + p.sovrascritte.length);
  deve(!p.saltate.find(x => x.id === 't1'), 't1 contata due volte');
  return '1 assegnazione a mano coperta, e si vede';
});

/* ══ REGOLA 3 — la chiave è la coppia ═══════════════════════════════════ */
prova('lo stesso codice su due compagnie è due persone', () => {
  const p = A.piano(TITOLI, POLIZZE, DECISO);
  const a = p.assegna.find(x => x.id === 't1');   // PRIMA|U100
  const b = p.assegna.find(x => x.id === 't5');   // ALTRA|U100
  deve(a && a.collaboratore_id === 'c1', 'PRIMA|U100 → ' + (a && a.collaboratore_id));
  deve(b && b.collaboratore_id === 'c2', 'ALTRA|U100 → ' + (b && b.collaboratore_id));
  return 'c1 e c2 non si mescolano';
});

prova('la chiave non si fa a metà', () => {
  deve(A.chiave('PRIMA', '') === '', 'chiave costruita senza codice');
  deve(A.chiave('', 'U100') === '', 'chiave costruita senza compagnia');
  deve(A.chiave(' prima ', ' u100 ') === 'PRIMA|U100', 'normalizzazione: ' + A.chiave(' prima ', ' u100 '));
  deve(A.codiceDi({ compagnia: 'PRIMA', dati: {} }) === null, 'codice inventato su una polizza che non ne ha');
  return 'spazi e maiuscole sì, pezzi mancanti no';
});

/* ══ REGOLA 4 — «nessuno» è una decisione ═══════════════════════════════ */
prova('«nessuno» non assegna, e non è «non deciso»', () => {
  const m = A.mappa([{ compagnia: 'PRIMA', codice: 'U200', collaboratore_id: null, nessuno: true, deciso: true }]);
  deve(A.statoDecisione(m['PRIMA|U200']) === 'nessuno', 'stato: ' + A.statoDecisione(m['PRIMA|U200']));
  const p = A.piano(TITOLI, POLIZZE, m);
  const s = p.saltate.find(x => x.id === 't4');
  deve(s && s.motivo === 'deciso-nessuno', 'motivo di t4: ' + (s && s.motivo));
  deve(p.assegna.length === 0, 'qualcosa assegnato: ' + p.assegna.length);
  return 'la produzione diretta dell\'agenzia non torna più a chiedere';
});

prova('una decisione rimasta scoperta si distingue dalle altre due', () => {
  /* La persona è stata cancellata: la riga c'è, il puntatore no. */
  const m = A.mappa([{ compagnia: 'PRIMA', codice: 'U100', collaboratore_id: null, nessuno: false, deciso: true }]);
  deve(A.statoDecisione(m['PRIMA|U100']) === 'da-ridecidere', 'stato: ' + A.statoDecisione(m['PRIMA|U100']));
  deve(A.statoDecisione(null) === 'non-deciso', 'senza riga: ' + A.statoDecisione(null));
  const p = A.piano(TITOLI, POLIZZE, m);
  const s = p.saltate.find(x => x.id === 't1');
  deve(s && s.motivo === 'codice-scoperto', 'motivo di t1: ' + (s && s.motivo));
  return 'quattro stati, non due';
});

prova('una riga di sole evidenze non è una decisione andata a vuoto', () => {
  /* È quello che scrive l'importazione quando il flusso porta nome ed email:
     serve a riconoscere il codice, e non deve accendere l'allarme rosso di
     «da ridecidere» su ogni codice mai guardato. */
  const m = A.mappa([{ compagnia: 'PRIMA', codice: 'U100', collaboratore_id: null, nessuno: false,
                       deciso: false, nome_flusso: 'Chi Sa', email_flusso: 'chi@esempio.it' }]);
  deve(A.statoDecisione(m['PRIMA|U100']) === 'non-deciso', 'stato: ' + A.statoDecisione(m['PRIMA|U100']));
  const p = A.piano(TITOLI, POLIZZE, m);
  const s = p.saltate.find(x => x.id === 't1');
  deve(s && s.motivo === 'codice-non-deciso', 'motivo di t1: ' + (s && s.motivo));
  const r = A.riepilogo(POLIZZE, TITOLI, m).find(x => x.chiave === 'PRIMA|U100');
  deve(r.decisione && r.decisione.nome_flusso === 'Chi Sa', 'le evidenze si perdono per strada');
  return 'non deciso, ma con il nome accanto per riconoscerlo';
});

/* ══ REGOLA 5 — prima il RUI, poi l'email, e solo se sono uno ═══════════ */
prova('il RUI viene prima dell\'email: è il numero dell\'intermediario', () => {
  /* Il caso che decide: l'email porterebbe a una persona, il RUI a un'altra.
     Vince il RUI, perché un recapito si presta e un numero di registro no. */
  const persone = [
    { id: 'c1', email: 'condivisa@esempio.it', rui_numero: 'E000111111' },
    { id: 'c2', email: 'condivisa@esempio.it', rui_numero: 'E000222222' }
  ];
  const p = A.proposteDaFlusso([{ codice: 'U100', email: 'condivisa@esempio.it', rui: 'E 000.222222' }], persone, 'PRIMA');
  deve(p[0].collaboratore_id === 'c2', 'proposta: ' + p[0].collaboratore_id);
  deve(p[0].motivo === 'rui', 'motivo: ' + p[0].motivo);
  return 'spazi e punti non contano, il numero sì — e batte un\'email ambigua';
});

prova('due persone con lo stesso RUI non producono niente, e lo dicono', () => {
  /* Nel registro vero ce n'è già un caso: dodici schede con il RUI e undici
     numeri distinti. Sceglierne una a caso pagherebbe la persona sbagliata. */
  const persone = [{ id: 'c1', rui_numero: 'E000111111' }, { id: 'c2', rui_numero: 'E000111111' }];
  const p = A.proposteDaFlusso([{ codice: 'U100', rui: 'E000111111' }], persone, 'PRIMA');
  deve(p[0].collaboratore_id === null, 'agganciata a caso: ' + p[0].collaboratore_id);
  deve(p[0].motivo === 'rui-ambiguo', 'motivo: ' + p[0].motivo);
  return 'il motivo dice che c\'è da sistemare il registro, non il flusso';
});

prova('senza RUI si passa all\'email, che per cinque persone su diciassette è tutto', () => {
  const persone = [{ id: 'c1', email: 'uno@esempio.it' }, { id: 'c2', email: 'due@esempio.it', rui_numero: 'E000222222' }];
  const p = A.proposteDaFlusso([{ codice: 'U100', email: 'uno@esempio.it', rui: '' }], persone, 'PRIMA');
  deve(p[0].collaboratore_id === 'c1' && p[0].motivo === 'email', 'proposta: ' + JSON.stringify(p[0]));
  return 'la seconda strada resta aperta';
});

prova('le stesse evidenze, lette dalla TABELLA, propongono la stessa persona', () => {
  /* Il pannello del pregresso non ha il file in mano: ha le evidenze che
     un'importazione ha scritto accanto al codice. Due schermate che leggono le
     stesse evidenze devono proporre la stessa persona — e l'unico modo per
     esserne sicuri è che la regola sia una sola. */
  const persone = [{ id: 'c1', rui_numero: 'E000111111' }, { id: 'c2', email: 'due@esempio.it' }];
  const daFlusso = A.proposteDaFlusso([{ codice: 'U100', rui: 'E000111111' }], persone, 'PRIMA');
  const daTabella = A.proposte([{ compagnia: 'PRIMA', codice: 'U100', rui_flusso: 'E000111111' }], persone);
  deve(daTabella['PRIMA|U100'].collaboratore_id === daFlusso[0].collaboratore_id,
       'le due porte propongono persone diverse: ' + JSON.stringify([daFlusso[0], daTabella['PRIMA|U100']]));
  deve(daTabella['PRIMA|U100'].motivo === 'rui', 'motivo: ' + daTabella['PRIMA|U100'].motivo);
  /* E l'email funziona anche da qui. */
  const perEmail = A.proposte([{ compagnia: 'PRIMA', codice: 'U200', email_flusso: 'due@esempio.it' }], persone);
  deve(perEmail['PRIMA|U200'].collaboratore_id === 'c2', 'email dalla tabella: ' + JSON.stringify(perEmail));
  return 'stessa regola, due porte';
});

prova('ogni riga porta la SUA compagnia, anche in un elenco che le mescola', () => {
  /* Il pannello mostra insieme i codici di tutte le compagnie: passarne una
     sola vorrebbe dire attribuire alla prima i codici di tutte le altre, e due
     compagnie possono usare lo stesso codice per due persone (regola 3). */
  const persone = [{ id: 'c1', rui_numero: 'E000111111' }, { id: 'c2', rui_numero: 'E000222222' }];
  const p = A.proposte([
    { compagnia: 'PRIMA', codice: 'U100', rui_flusso: 'E000111111' },
    { compagnia: 'ALTRA', codice: 'U100', rui_flusso: 'E000222222' }
  ], persone);
  deve(Object.keys(p).length === 2, 'chiavi: ' + Object.keys(p).join(', '));
  deve(p['PRIMA|U100'].collaboratore_id === 'c1' && p['ALTRA|U100'].collaboratore_id === 'c2',
       'le due compagnie si sono mescolate: ' + JSON.stringify(p));
  return 'due codici uguali, due persone, due chiavi';
});

prova('una riga senza evidenze non propone niente, e non sparisce', () => {
  const p = A.proposte([{ compagnia: 'PRIMA', codice: 'U300' }], [{ id: 'c1', rui_numero: 'E000111111' }]);
  deve(p['PRIMA|U300'], 'la riga senza evidenze sparisce dalla mappa');
  deve(p['PRIMA|U300'].collaboratore_id === null && p['PRIMA|U300'].motivo === 'email-assente',
       'proposta senza evidenze: ' + JSON.stringify(p['PRIMA|U300']));
  return 'resta, e dice che non c\'è niente su cui lavorare';
});

/* ══ DALLA PARTE DELLA PERSONA ═════════════════════════════════════════ */
const PERSONE = [
  { id: 'c1', email: 'uno@esempio.it', rui_numero: 'E000111111' },
  { id: 'c2', email: 'due@esempio.it', rui_numero: 'E000222222' },
  /* Due colleghi con lo STESSO RUI: è il caso che c'è già nel registro vero. */
  { id: 'c3', email: 'tre@esempio.it', rui_numero: 'E000999999' },
  { id: 'c4', email: 'quattro@esempio.it', rui_numero: 'E000999999' }
];

prova('dalla scheda di una persona si vede quali codici sembrano suoi', () => {
  const righe = [
    { compagnia: 'PRIMA', codice: 'U100', rui_flusso: 'E 000.111111' },
    { compagnia: 'PRIMA', codice: 'U200', email_flusso: 'uno@esempio.it' },
    { compagnia: 'PRIMA', codice: 'U300', rui_flusso: 'E000222222' }
  ];
  const s = A.suoi(righe, PERSONE, 'c1');
  deve(s.length === 2, 'codici proposti a c1: ' + s.map(x => x.codice).join(', '));
  deve(s.map(x => x.codice).sort().join(',') === 'U100,U200', 'quali: ' + s.map(x => x.codice));
  deve(s.find(x => x.codice === 'U100').motivo === 'rui', 'il motivo del primo: ' + s[0].motivo);
  return 'due suoi, e quello di un altro resta fuori';
});

prova('la regola «solo se è una» vale anche guardando dalla persona', () => {
  /* Il difetto che si fa senza accorgersene: passare SOLO la persona aperta.
     Con un elenco di uno, due colleghi con lo stesso RUI non si vedono, e
     quella proposta diventa sicura di niente. */
  const righe = [{ compagnia: 'PRIMA', codice: 'U400', rui_flusso: 'E000999999' }];
  deve(A.suoi(righe, PERSONE, 'c3').length === 0, 'proposto a c3 un RUI che è di due persone');
  deve(A.suoi(righe, PERSONE, 'c4').length === 0, 'proposto a c4 un RUI che è di due persone');
  /* E con l'elenco ridotto alla sola persona la proposta comparirebbe: è
     esattamente quello da non fare, ed è qui scritto perché si veda. */
  deve(A.suoi(righe, [PERSONE[2]], 'c3').length === 1,
       'il banco non riproduce il difetto: la prova sopra non misura niente');
  return 'con tutte le persone nessuna proposta, con una sola sì — per questo si passano tutte';
});

prova('un codice già deciso non «sembra» di nessun altro', () => {
  /* Riproporre un codice assegnato a un altro sarebbe un invito a
     sovrascrivere il lavoro di qualcuno (regola 2, dall'altro lato). */
  const righe = [
    { compagnia: 'PRIMA', codice: 'U100', rui_flusso: 'E000111111', collaboratore_id: 'c2', deciso: true },
    { compagnia: 'PRIMA', codice: 'U200', rui_flusso: 'E000111111', nessuno: true, deciso: true }
  ];
  deve(A.suoi(righe, PERSONE, 'c1').length === 0, 'un codice deciso viene riproposto');
  return 'i decisi restano fuori, «nessuno» compreso';
});

prova('senza persona non si propone niente', () => {
  const righe = [{ compagnia: 'PRIMA', codice: 'U100', rui_flusso: 'E000111111' }];
  deve(A.suoi(righe, PERSONE, null).length === 0, 'proposto qualcosa a nessuno');
  deve(A.suoi(righe, PERSONE, undefined).length === 0, 'proposto qualcosa a undefined');
  return 'una scheda senza persona non ha codici da riconoscere';
});

prova('il codice produttore si conserva accanto a quello delle polizze', () => {
  /* Sono due codici diversi: `ID_ANAGRAFICA_EXP` è la chiave con cui le
     polizze lo nominano, `CODICE_PRODUTTORE` è come lo chiama la compagnia.
     Chi deve riconoscere una persona ha bisogno di tutti e due. */
  const p = A.proposteDaFlusso([{ codice: 'U100', produttore: 'P-7788', rui: 'E000111111' }],
                               [{ id: 'c1', rui_numero: 'E000111111' }], 'PRIMA');
  deve(p[0].produttore_flusso === 'P-7788', 'il codice produttore si perde: ' + JSON.stringify(p[0]));
  deve(p[0].rui_flusso === 'E000111111', 'il RUI si perde come evidenza');
  return 'U100 per le polizze, P-7788 per la compagnia, tutti e due scritti';
});

prova('un indirizzo che tocca una sola persona diventa una proposta', () => {
  const persone = [
    { id: 'c1', email: 'Uno@Esempio.IT' },
    { id: 'c2', email: 'due@esempio.it' }
  ];
  const p = A.proposteDaFlusso([{ codice: 'U100', nome: 'Chi Sa', email: ' uno@esempio.it ' }], persone, 'PRIMA');
  deve(p[0].collaboratore_id === 'c1', 'proposta: ' + p[0].collaboratore_id);
  deve(p[0].motivo === 'email', 'motivo: ' + p[0].motivo);
  deve(p[0].chiave === 'PRIMA|U100', 'chiave: ' + p[0].chiave);
  return 'maiuscole e spazi non contano, l\'indirizzo sì';
});

prova('due persone con lo stesso indirizzo non producono niente', () => {
  const persone = [{ id: 'c1', email: 'uno@esempio.it' }, { id: 'c2', email: 'uno@esempio.it' }];
  const p = A.proposteDaFlusso([{ codice: 'U100', email: 'uno@esempio.it' }], persone, 'PRIMA');
  deve(p[0].collaboratore_id === null, 'agganciata a caso: ' + p[0].collaboratore_id);
  deve(p[0].motivo === 'email-ambigua', 'motivo: ' + p[0].motivo);
  return 'ambigua resta ambigua';
});

prova('il nome non aggancia mai, nemmeno identico', () => {
  const persone = [{ id: 'c1', nome: 'Mario', cognome: 'Rossi', email: 'mrossi@esempio.it' }];
  const p = A.proposteDaFlusso([{ codice: 'U100', nome: 'Rossi Mario', email: null }], persone, 'PRIMA');
  deve(p[0].collaboratore_id === null, 'agganciata per nome: ' + p[0].collaboratore_id);
  deve(p[0].motivo === 'email-assente', 'motivo: ' + p[0].motivo);
  deve(p[0].nome_flusso === 'Rossi Mario', 'il nome si perde invece di restare come evidenza');
  return 'il nome resta scritto accanto, e non decide';
});

/* ══ IL RIEPILOGO: serve a RICONOSCERE il codice ════════════════════════ */
prova('ogni codice porta con sé di che cosa è fatto', () => {
  const r = A.riepilogo(POLIZZE, TITOLI, DECISO);
  const u100 = r.find(x => x.chiave === 'PRIMA|U100');
  deve(u100.polizze === 2, 'polizze: ' + u100.polizze);
  deve(u100.titoli === 3, 'titoli: ' + u100.titoli);
  deve(u100.premio === 300, 'premio: ' + u100.premio);
  deve(u100.provvigione === 30, 'provvigione: ' + u100.provvigione);
  deve(u100.dal === '2025-10-24' && u100.al === '2026-03-13', 'periodo: ' + u100.dal + '→' + u100.al);
  deve(u100.clienti.length === 2, 'clienti: ' + u100.clienti.length);
  deve(u100.stato === 'persona', 'stato: ' + u100.stato);
  /* Le polizze senza codice non inventano una riga «senza codice». */
  deve(!r.find(x => /\|$/.test(x.chiave)), 'riga fantasma per le polizze senza codice');
  return '2 polizze, 3 rate, 300 €, due nomi di clienti da riconoscere';
});

prova('in cima ci sono i codici dove c\'è lavoro da fare', () => {
  const r = A.riepilogo(POLIZZE, TITOLI, DECISO);
  deve(r[0].titoliDaAssegnare >= r[r.length - 1].titoliDaAssegnare, 'ordine sbagliato');
  const u200 = r.find(x => x.chiave === 'PRIMA|U200');
  deve(u200.stato === 'non-deciso', 'stato di U200: ' + u200.stato);
  return 'chi ha più rate ferme viene per primo';
});

prova('le rate già assegnate si contano a parte', () => {
  const titoli = TITOLI.map(t => t.id === 't1' ? Object.assign({}, t, { collaboratore_id: 'cX' }) : t);
  const r = A.riepilogo(POLIZZE, titoli, DECISO);
  const u100 = r.find(x => x.chiave === 'PRIMA|U100');
  deve(u100.titoliAssegnati === 1 && u100.titoliDaAssegnare === 2,
       'assegnate/da assegnare: ' + u100.titoliAssegnati + '/' + u100.titoliDaAssegnare);
  return 'su questo codice qualcuno ha già lavorato a mano, e si vede prima di applicare';
});

/* ══ IL PIANO SULLE POLIZZE (21/09/2026) ════════════════════════════════
   La stessa decisione, applicata all'altra domanda: non «di chi è questa
   rata» ma «chi ha prodotto questo contratto». */
const POL = (id, cod, chi) => ({
  id: id, compagnia: 'PRIMA', collaboratore_id: chi || null,
  dati: cod ? { ssf: { collaboratore: cod } } : {}
});
const DEC = (cod, chi, nessuno) => ({
  compagnia: 'PRIMA', codice: cod, deciso: true,
  collaboratore_id: chi || null, nessuno: !!nessuno
});

prova('POLIZZE · niente decisione, niente produttore', () => {
  /* Regola 1, sull'altra tabella. Sedici codici stanno sulle polizze e la
     tabella delle decisioni nasce vuota: se il piano ripiegasse su un
     «quello che ha più polizze», il consuntivo di produzione direbbe dei
     nomi che nessuno ha scelto. */
  const p = A.pianoPolizze([POL('a', 'U1'), POL('b', 'U2')], A.mappa([DEC('U1', 'p1')]));
  deve(p.assegna.length === 1 && p.assegna[0].id === 'a', 'non assegna solo la polizza decisa');
  deve(p.saltate.some(s => s.id === 'b' && s.motivo === 'codice-non-deciso'),
    'la polizza col codice non deciso non è saltata col motivo giusto');
  return '1 assegnata, 1 lasciata da decidere';
});

prova('POLIZZE · non si sovrascrive chi c\'è già, e «sovrascrivi» si conta a parte', () => {
  /* Regola 2. Chi ha attribuito a mano sapeva qualcosa che il codice non sa. */
  const righe = [POL('a', 'U1', 'p9'), POL('b', 'U1', 'p1'), POL('c', 'U1')];
  const m = A.mappa([DEC('U1', 'p1')]);
  const p = A.pianoPolizze(righe, m);
  deve(p.assegna.length === 1 && p.assegna[0].id === 'c', 'tocca una polizza già attribuita');
  deve(p.saltate.find(s => s.id === 'a').motivo === 'gia-assegnata', 'il conflitto non si dichiara');
  deve(p.saltate.find(s => s.id === 'b').motivo === 'gia-a-posto', 'chi è già a posto non si distingue dal conflitto');
  const f = A.pianoPolizze(righe, m, { sovrascrivi: true });
  deve(f.assegna.length === 2, 'con sovrascrivi non sposta il conflitto');
  deve(f.sovrascritte.length === 1, 'le attribuzioni coperte non si contano a parte');
  return 'una sola, e la forzatura si vede';
});

prova('POLIZZE · «nessuno» è una decisione: non assegna e non torna a chiedere', () => {
  /* Regola 4. È la produzione diretta dell'agenzia, non un buco da riempire. */
  const p = A.pianoPolizze([POL('a', 'U1')], A.mappa([DEC('U1', null, true)]));
  deve(!p.assegna.length, 'assegna una polizza decisa «nessuno»');
  deve(p.saltate[0].motivo === 'deciso-nessuno', 'non si distingue da un codice mai deciso: ' + p.saltate[0].motivo);
  return 'decisa, e non ricompare';
});

prova('POLIZZE · una polizza senza codice non si attribuisce a chi ha importato', () => {
  /* `creato_da` è una persona sola su tutte e 1720 le righe. Una polizza
     senza codice non viene da un flusso: è l'agenzia, non un lavoro da fare. */
  const p = A.pianoPolizze([POL('a', null)], A.mappa([DEC('U1', 'p1')]));
  deve(!p.assegna.length, 'attribuisce una polizza senza codice');
  deve(p.saltate[0].motivo === 'senza-codice', 'il motivo non è «senza codice»');
  return 'senza codice = non si tocca';
});

prova('POLIZZE · la chiave resta la coppia compagnia+codice', () => {
  /* Regola 3: due compagnie possono usare lo stesso codice per due persone. */
  const altra = { id: 'z', compagnia: 'HDI', collaboratore_id: null, dati: { ssf: { collaboratore: 'U1' } } };
  const p = A.pianoPolizze([POL('a', 'U1'), altra], A.mappa([DEC('U1', 'p1')]));
  deve(p.assegna.length === 1 && p.assegna[0].id === 'a', 'il codice di una compagnia ha mosso quello di un\'altra');
  return 'PRIMA|U1 non è HDI|U1';
});

/* ══ IL PERIODO E LA SOSPENSIONE (21/09/2026) ═══════════════════════════
   Il codice produttore è della COMPAGNIA. Quando un collaboratore se ne va e
   la compagnia riassegna il suo codice, una decisione presa una volta e
   valida per sempre attribuirebbe a chi è andato via tutto quello che l'altro
   produce da domani. Queste prove sono quelle che, saltando, pagano una
   provvigione alla persona sbagliata senza che si veda. */
const POLD = (id, cod, eff, chi) => ({
  id: id, compagnia: 'PRIMA', collaboratore_id: chi || null, data_effetto: eff || null,
  dati: cod ? { ssf: { collaboratore: cod } } : {}
});
const DECP = (cod, chi, extra) => Object.assign(
  { compagnia: 'PRIMA', codice: cod, deciso: true, collaboratore_id: chi || null, nessuno: false }, extra || {});

prova('«NESSUN PERIODO DICHIARATO» NON È «CHIUSO»', () => {
  /* La lettura opposta spegnerebbe in un colpo solo tutti gli abbinamenti
     esistenti — sedici righe su sedici nascono senza periodo — e lo farebbe
     in silenzio: nessun errore, solo delle rate che smettono di assegnarsi.
     È la stessa distinzione fra un vuoto e una decisione che vale per
     `attivo` sulle persone (§42) e per le colonne che il tracciato non
     dichiara (§20). */
  const v = A.valeIl(DECP('U1', 'c1'), '2026-09-21');
  deve(v.vale && v.stato === 'sempre', 'un abbinamento senza periodo non vale: ' + JSON.stringify(v));
  /* E non serve nemmeno una data: senza periodo non c'è niente da
     confrontare, quindi una polizza senza data di effetto si assegna. */
  const p = A.pianoPolizze([POLD('a', 'U1', null)], A.mappa([DECP('U1', 'c1')]));
  deve(p.assegna.length === 1, 'senza periodo pretende comunque una data');
  return 'vuoto = vale sempre';
});

prova('UN ABBINAMENTO SOSPESO NON ASSEGNA PIÙ NIENTE — e non si riprende quello che ha dato', () => {
  /* Sospendere serve quando si sa che il codice non è più suo e non si sa
     ancora di chi sia. Se togliesse anche il passato, sospendere costerebbe
     la produzione già attribuita: nessuno lo farebbe, e il codice
     continuerebbe a produrre attribuzioni sbagliate. */
  const m = A.mappa([DECP('U1', 'c1', { attivo: false })]);
  const p = A.pianoPolizze([POLD('a', 'U1', '2026-09-01'), POLD('b', 'U1', '2026-03-01', 'c1')], m);
  deve(p.assegna.length === 0, 'un codice sospeso assegna ancora');
  deve(p.saltate.some(s => s.id === 'a' && s.motivo === 'codice-sospeso'), 'non dice che è sospeso');
  /* La polizza `b` era già sua e resta sua: il piano non la tocca, perché il
     dato sta sulla polizza e questa tabella è solo il modo con cui ci si è
     arrivati (§19). */
  deve(!p.assegna.some(x => x.id === 'b'), 'rimette le mani su una polizza già assegnata');
  return 'niente di nuovo, e niente tolto';
});

prova('LA DATA CHE CONTA È QUELLA DELLA POLIZZA, NON OGGI', () => {
  /* Con «oggi» un abbinamento chiuso a giugno toglierebbe a quella persona
     anche le polizze di marzo, che sono sue: una polizza appartiene a chi
     teneva il codice quando è stata prodotta. È la regola del fascicolo
     congelato (§11, regola 4) applicata alle provvigioni. */
  const m = A.mappa([DECP('U1', 'c1', { data_inizio: '2025-01-01', data_fine: '2026-06-30' })]);
  const p = A.pianoPolizze([POLD('marzo', 'U1', '2026-03-01'), POLD('settembre', 'U1', '2026-09-01')], m);
  deve(p.assegna.length === 1 && p.assegna[0].id === 'marzo', 'la polizza dentro il periodo non si assegna');
  const fuori = p.saltate.find(s => s.id === 'settembre');
  deve(fuori && fuori.motivo === 'fuori-periodo', 'la polizza fuori dal periodo si assegna lo stesso');
  deve(/fino al 2026-06-30/.test(fuori.spiega || ''), 'non dice fino a quando il codice era suo: ' + fuori.spiega);
  /* E anche prima dell'inizio: un codice riciclato dalla compagnia ha un
     passato che non è di questa persona. */
  const prima = A.pianoPolizze([POLD('vecchia', 'U1', '2024-05-01')], m);
  deve(prima.saltate[0].motivo === 'fuori-periodo', 'assegna anche quello che è successo prima');
  return 'marzo sì, settembre no, 2024 no';
});

prova('LA RATA SEGUE LA DATA DELLA SUA POLIZZA, non la propria decorrenza', () => {
  /* Una rata è di chi ha PRODOTTO il contratto, non di chi tiene il codice il
     giorno in cui scade. Guardando due date diverse, la polizza finirebbe a
     uno e le sue rate a un altro — e i due numeri non tornerebbero mai. */
  const m = A.mappa([DECP('U1', 'c1', { data_fine: '2026-06-30' })]);
  const polizze = [POLD('vecchia', 'U1', '2026-02-01'), POLD('nuova', 'U1', '2026-08-01')];
  const titoli = [
    /* La rata di una polizza dentro il periodo, ma che scade molto dopo. */
    { id: 'r1', polizza_id: 'vecchia', data_decorrenza: '2026-12-01', collaboratore_id: null },
    { id: 'r2', polizza_id: 'nuova', data_decorrenza: '2026-08-01', collaboratore_id: null }
  ];
  const p = A.piano(titoli, polizze, m);
  deve(p.assegna.length === 1 && p.assegna[0].id === 'r1',
    'la rata non segue la polizza: ' + JSON.stringify(p.assegna));
  deve(p.saltate.some(s => s.id === 'r2' && s.motivo === 'fuori-periodo'), 'la rata fuori periodo si assegna');
  return 'una rata di dicembre su una polizza di febbraio resta sua';
});

prova('con un periodo e senza data non si indovina', () => {
  /* Da che parte del confine stia non lo sa nessuno, e sceglierne una è
     indovinare (§8.1). Si lascia da decidere e si dice perché. */
  const m = A.mappa([DECP('U1', 'c1', { data_fine: '2026-06-30' })]);
  const p = A.pianoPolizze([POLD('senza', 'U1', null)], m);
  deve(p.assegna.length === 0, 'assegna una polizza che non si sa dove cada');
  deve(p.saltate[0].motivo === 'senza-data', 'il motivo non è quello giusto: ' + p.saltate[0].motivo);
  deve(/data di effetto/.test(p.saltate[0].spiega || ''), 'non dice che cosa manca');
  return 'niente data, niente assegnazione, e si sa perché';
});

prova('L’UPSERT NON CANCELLA IL PERIODO, LA SOSPENSIONE E LE NOTE', () => {
  /* `upsert` riscrive la RIGA INTERA: le colonne che non si passano tornano
     al valore di partenza. Senza queste quattro, riabbinare un codice
     riaprirebbe da solo un abbinamento sospeso e cancellerebbe il periodo in
     cui vale — cioè rimetterebbe in piedi proprio il guasto che il periodo
     esiste per evitare. `note` era già così, e nessuno se n'era accorto
     perché nessuna riga ne ha. */
  const vecchia = {
    compagnia: 'PRIMA', codice: 'U1', nome_flusso: 'NERI ANNA', rui_flusso: 'E000111111',
    attivo: false, data_inizio: '2025-01-01', data_fine: '2026-06-30', note: 'subentrata a Rossi'
  };
  const r = A.rigaDecisione('PRIMA|U1', 'c1', vecchia, 'u9');
  deve(r.attivo === false, 'riabbina da solo un abbinamento sospeso');
  deve(r.data_inizio === '2025-01-01' && r.data_fine === '2026-06-30', 'cancella il periodo');
  deve(r.note === 'subentrata a Rossi', 'cancella le note');
  deve(r.rui_flusso === 'E000111111', 'cancella le evidenze del flusso');
  /* E si cambiano passando il valore nuovo — o `null` per toglierlo. */
  const r2 = A.rigaDecisione('PRIMA|U1', 'c1', Object.assign({}, vecchia, { data_fine: null, attivo: true }), 'u9');
  deve(r2.data_fine === null && r2.attivo === true, 'non si riesce a togliere una scadenza');
  return 'quattro colonne che sopravvivono a un abbinamento';
});

prova('TOGLIERE LA DECISIONE AZZERA SOSPENSIONE E PERIODO — la nota no', () => {
  /* Il caso vero: un codice si toglie a Tizio perché la compagnia l'ha dato a
     Caio. Portandosi avanti la sospensione, il codice rinascerebbe **già
     sospeso** addosso a Caio — e le sue polizze non si assegnerebbero mai,
     senza un errore e senza che nessuno capisca perché. Il periodo idem: è il
     periodo del padrone di prima.

     La nota invece resta, come le evidenze del flusso: è scritta da una
     persona per la persona dopo, ed è metà del motivo per cui si riconosce un
     codice la volta successiva (§19). */
  const tolta = A.rigaDecisione('PRIMA|U1', '', {
    attivo: false, data_inizio: '2025-01-01', data_fine: '2026-06-30',
    note: 'passato all’altro ufficio', nome_flusso: 'NERI ANNA'
  }, 'u9');
  deve(tolta.deciso === false, 'togliere non toglie la decisione');
  deve(tolta.attivo === true, 'il codice resta sospeso e chi lo riabbina non se ne accorge');
  deve(tolta.data_inizio === null && tolta.data_fine === null, 'il periodo del padrone di prima resta addosso al prossimo');
  deve(tolta.note === 'passato all’altro ufficio' && tolta.nome_flusso === 'NERI ANNA',
    'si perde quello che serve a riconoscerlo');
  return 'pulito per il prossimo, e con la nota di chi c’era prima';
});

/* ══ ARITMETICA ═════════════════════════════════════════════════════════ */
prova('gli storni non guadagnano un centesimo dall\'arrotondamento', () => {
  deve(A.cent(-0.005) === -0.01, 'cent(-0.005) = ' + A.cent(-0.005));
  deve(A.cent(0.005) === 0.01, 'cent(0.005) = ' + A.cent(0.005));
  return 'simmetrico, come in estratto-conto.js';
});

console.log('\n══ ASSEGNAZIONE DELLE RATE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nASSEGNAZIONE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
