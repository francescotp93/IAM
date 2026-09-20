// ═══════════════════════════════════════════════════════════════════════════════
//  TUTTE LE SCHERMATE DI IAM HANNO LA GRAFICA DI IAM  (20/09/2026)
//
//  Chiesto da Francesco, e misurato prima di toccare qualcosa:
//
//    · il kit grafico esisteva — testata, sottotitolo, bottoni, schede — ma era
//      scritto `#panel-dashboard .page-head`, cioe' valeva SOLO sulla
//      Scrivania: 26 regole e 15 gettoni chiusi in un pannello, e ZERO usi di
//      quei nomi fuori di li';
//    · quindi ogni schermata scritta dopo se l'e' dovuto reinventare, e ognuna
//      se l'e' inventato diverso: `f-head`, `cl-head`, `slbl`, piu' 1.798 stili
//      scritti a mano dentro una pagina sola;
//    · il risultato si vedeva a occhio nudo. Un `<h1>` senza regole esce col
//      carattere di sistema, grande il doppio e nero; un `<button>` senza
//      regole e' il bottone grigio del browser. Non e' «una grafica diversa»:
//      e' nessuna grafica.
//
//  E' il guasto §1 in versione grafica: una cosa buona esiste e nessun altro la
//  puo' raggiungere. Queste prove tengono il kit aperto e sorvegliano che le
//  schermate portate sopra non tornino indietro.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const CSS = H.slice(H.indexOf('<style'), H.indexOf('</style>'));
const CORPO = H.slice(H.indexOf('</style>'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Le schermate gia' portate sul kit. L'elenco CRESCE, non cala: e' lo stesso
   meccanismo della soglia dei movimenti (§18), al contrario di quello delle
   collisioni (§10). */
const SUL_KIT = [
  'panel-dashboard',          // la Scrivania: da lei viene il kit
  'panel-conti',              // brief #02 M1
  'panel-compagnie',          // brief #02 M2
  'panel-provvigioni',        // brief #02 M2
  'contab-panel-primanota',   // brief #02 M3
  'contab-panel-quadconti',       // brief #02 M3
  'contab-panel-incassi',     // brief #02 M4
  'contab-panel-quadratura',  // brief #02 M5
  'contab-panel-anomalie',    // brief #02 M5
  'contab-panel-storico'      // brief #02 M5
  /* «contab-panel-conto» non c'è più: il saldo ricostruito e gli estratti
     caricati dalla banca sono i due numeri della quadratura, e dal 20/09/2026
     stanno dentro «Quadratura conti» (Blocco 1 · punto 5). */
];

/* Le regole del kit si cercano nel CSS SENZA i commenti che cominciano a
   inizio riga: questo file spiega il difetto nominandolo, e una prova che
   cercasse la stringa dichiarerebbe rotto un codice giusto. E' la trappola
   gia' presa in §10, §12, §18, §26 e §29 — sei volte. Togliere tutti i
   commenti con una regex globale invece mangia codice vero (§12), quindi si
   tolgono solo quelli a inizio riga. */
const CSS_CODICE = CSS.split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');

prova('il kit non e\' piu\' chiuso dentro un pannello solo', () => {
  /* La regola che conta. Se qualcuno riporta il kit sotto `#panel-dashboard`,
     tutte le altre schermate perdono il vestito nello stesso istante — e
     nessun errore lo dice, perche' una proprieta' CSS che non risolve viene
     semplicemente ignorata. */
  const chiuse = (CSS_CODICE.match(/#panel-dashboard\s+\./g) || []).length;
  deve(chiuse === 0, chiuse + ' regole del kit sono di nuovo chiuse dentro #panel-dashboard');
  for (const r of ['.page-head{', '.page-head h1{', '.subtitle{', '.head-actions{',
                   '.d-btn{', '.d-btn.primario{', '.d-card{', '.card-head{',
                   '.card-title{', '.card-body{', '.pictogram{']) {
    deve(CSS_CODICE.includes(r), 'manca la regola globale ' + r);
  }
  return '11 componenti, validi su tutta IAM';
});

prova('i gettoni del kit valgono ovunque, non solo sulla Scrivania', () => {
  /* Le regole promosse senza i gettoni sarebbero peggio di prima: `var(--w1-raggio)`
     che non risolve fa sparire l'angolo arrotondato in silenzio. */
  const w1 = fs.readFileSync(path.join(QUI, '..', 'withus-one.css'), 'utf8');
  const definiti = new Set([...w1.matchAll(/--w1-([a-z0-9-]+)\s*:/g)].map(m => m[1])
    .concat([...CSS_CODICE.matchAll(/--w1-([a-z0-9-]+)\s*:/g)].map(m => m[1])));
  const usati = new Set([...CSS_CODICE.matchAll(/var\(--w1-([a-z0-9-]+)/g)].map(m => m[1]));
  const mancanti = [...usati].filter(k => !definiti.has(k));
  deve(!mancanti.length, 'gettoni usati e mai definiti: ' + mancanti.join(', '));
  /* E NON sono su :root: e' una tavolozza chiara fissa, e lasciata libera
     sfonderebbe il tema scuro in tutto il resto del gestionale. Lo diceva gia'
     `scrivania.test.mjs`, e aveva ragione: la promozione dei gettoni si e'
     fermata all'elenco dichiarato delle schermate portate sul kit. */
  const root = (CSS_CODICE.match(/:root\s*\{[^}]*\}/g) || []).join('\n');
  deve(!/--w1-/.test(root), 'i gettoni del kit sono finiti su :root: la tavolozza chiara esce da IAM');
  for (const id of SUL_KIT) {
    deve(new RegExp('#' + id + '\\s*[,{][^}]{0,900}--w1-raggio').test(CSS_CODICE.replace(/\n/g, ' ')),
      id + ' non riceve i gettoni del kit: le sue schede perderebbero gli angoli in silenzio');
  }
  return usati.size + ' gettoni, tutti risolvibili';
});

prova('lo sfondo del kit NON e\' su :root: la schermata di accesso ha la sua grafica', () => {
  /* La splash e la schermata di accesso sono dichiarate intoccabili
     (iam/CLAUDE.md, «BLOCCHI»). Mettere `background` su :root le ridipingerebbe
     senza che nessuno l'abbia chiesto. */
  const root = (CSS_CODICE.match(/:root\s*\{[^}]*\}/g) || []).join('\n');
  deve(!/\bbackground\s*:/.test(root), 'lo sfondo del kit e\' finito su :root e ridipinge anche l\'accesso');
  /* Sta invece sull'elenco dichiarato delle schermate portate sul kit. */
  for (const id of SUL_KIT) {
    deve(new RegExp('#' + id + '\\s*[,{]').test(CSS_CODICE), id + ' non e\' fra le schermate che prendono lo sfondo del kit');
  }
  return SUL_KIT.length + ' schermate dichiarate';
});

prova('le schermate sul kit hanno la TESTATA del kit, non una loro', () => {
  for (const id of SUL_KIT) {
    const seg = pannello(id);
    deve(/<section class="page-head">/.test(seg), id + ': la testata non e\' quella del kit');
    /* Un `<h1>` fuori dalla testata esce col carattere di sistema. */
    const h1 = (seg.match(/<h1[\s>]/g) || []).length;
    const dentro = (seg.match(/class="page-head"[\s\S]{0,400}?<h1[\s>]/g) || []).length;
    deve(h1 === dentro, id + ': c\'e\' un <h1> fuori dalla testata del kit');
    /* E il sottotitolo e' `.subtitle`, non un `<p>` nudo che nessuna regola
       tocca. */
    deve(/class="subtitle"/.test(seg), id + ': il sottotitolo non ha la classe del kit');
  }
  return SUL_KIT.length + ' testate';
});

prova('i bottoni delle schermate sul kit sono quelli del kit', () => {
  /* `f-b` e' la famiglia di «Fonti compagnie»: ha una tavolozza sua, scritta a
     mano e chiara, e in mezzo alle schermate di IAM si vede che viene da
     un'altra applicazione. */
  for (const id of SUL_KIT) {
    const seg = pannello(id);
    deve(!/class="f-b/.test(seg), id + ': usa ancora i bottoni della famiglia «fonti»');
    deve(/class="d-btn/.test(seg) || id === 'contab-panel-quadconti', id + ': non usa i bottoni del kit');
  }
  /* E anche l'HTML scritto dal codice, non solo quello in pagina: le righe
     degli elenchi hanno i loro bottoni, e sono la meta' dei bottoni che una
     persona vede davvero. */
  for (const [nome, a, b] of [['conti', '/* ══ CONTI E CAUSALI (brief #02 · M1', '/* ══ PRIMA NOTA E QUADRATURA'],
                              ['prima nota', '/* ══ PRIMA NOTA E QUADRATURA', '/* ══ TARIFFE, ACCORDI E GRUPPI'],
                              ['provvigioni', '/* ══ TARIFFE, ACCORDI E GRUPPI', 'function initDB()']]) {
    const i = H.indexOf(a); const j = H.indexOf(b, i);
    deve(i >= 0 && j > i, 'non trovo il blocco ' + nome);
    const blocco = H.slice(i, j);
    deve(!/class="f-b/.test(blocco), 'il blocco ' + nome + ' disegna ancora bottoni della famiglia «fonti»');
  }
  return 'in pagina e nel codice che disegna';
});

prova('una schermata nuova non si scrive gli stili a mano', () => {
  /* Il difetto da cui nasce tutto: 1.798 `style="…"` dentro una pagina sola
     sono una grafica che nessuno puo' cambiare da un posto solo. La soglia
     CALA quando una schermata passa al kit, e non sale mai. */
  const conta = (id) => (pannello(id).match(/style="/g) || []).length;
  const soglie = {
    'panel-conti': 6, 'panel-compagnie': 4, 'panel-provvigioni': 12,
    'contab-panel-primanota': 8, 'contab-panel-quadconti': 4,
    /* Le quattro schermate della M5 sono VECCHIE: la testata e il riquadro
       ricostruito sono nuovi, il modulo a mano sotto e' quello di sempre e i
       suoi stili si tolgono quando quel modulo si spegne (§17: non prima che i
       due numeri tornino). La soglia e' quella misurata oggi. */
    'contab-panel-quadratura': 13, 'contab-panel-anomalie': 4,
    'contab-panel-storico': 5,
    /* «Quadratura conti» ha inglobato il contenuto della voce «Conto»
       (Blocco 1 · punto 5): con lui sono arrivati i suoi stili scritti a
       mano. La soglia sale UNA VOLTA perché il pannello è un altro, e da qui
       torna a calare soltanto. */
    'contab-panel-quadconti': 17
  };
  for (const [id, max] of Object.entries(soglie)) {
    const n = conta(id);
    deve(n <= max, id + ': ' + n + ' stili scritti a mano (soglia ' + max + '). Usa il kit, o abbassa la soglia se ne hai tolti');
  }
  return Object.keys(soglie).map(k => k.replace('panel-', '') + ':' + conta(k)).join(' ');
});

prova('il kit non si porta dietro il bianco scritto a mano', () => {
  /* Un `#fff` dentro una regola del kit e' il punto in cui un tema smette di
     essere un tema. I gettoni ci sono: si usano quelli. */
  const regole = [...CSS_CODICE.matchAll(/\.(page-head|subtitle|head-actions|d-card|card-head|card-body|card-title)\b[^{]*\{([^}]*)\}/g)];
  deve(regole.length >= 5, 'non ho trovato le regole del kit da controllare');
  for (const r of regole) {
    deve(!/#fff\b|#ffffff\b/i.test(r[2]), 'la regola .' + r[1] + ' ha il bianco scritto a mano invece di un gettone');
  }
  return regole.length + ' regole, nessun bianco a mano';
});

/* ─────────────────────────────────────────────────────────────────────────── */
function pannello(id) {
  const i = CORPO.indexOf('id="' + id + '"');
  deve(i >= 0, 'non trovo il pannello ' + id);
  /* Fino all'apertura del pannello successivo: i pannelli sono fratelli. */
  const dopo = CORPO.slice(i + 10);
  const j = dopo.search(/id="(panel-|contab-panel-|nov-ov|pnt-ov|prv-ov)/);
  return CORPO.slice(i, j < 0 ? CORPO.length : i + 10 + j);
}

console.log('\n══ LA GRAFICA DI IAM, SU TUTTE LE SCHERMATE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nKIT SCHERMATE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
