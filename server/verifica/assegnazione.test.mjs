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

/* ══ REGOLA 5 — l'email aggancia solo se è una ══════════════════════════ */
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
