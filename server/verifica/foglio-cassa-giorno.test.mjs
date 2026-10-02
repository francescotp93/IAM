// ═══════════════════════════════════════════════════════════════════════════════
//  LE FRECCE DEL GIORNO, NEL FOGLIO CASSA
//
//  30/09/2026, richiesta di Francesco: «in questa parte del foglio cassa metti
//  una freccetta che dà la possibilità di spostarsi di un giorno avanti oppure
//  di un giorno indietro».
//
//  Sembra un bottone e basta. Le cose che può sbagliare sono tre, e due si
//  vedono solo nei soldi:
//
//   1. spostare UN estremo solo. «Dal 1 al 30» diventerebbe «dal 1 al 31»: la
//      finestra si allunga a ogni clic e i totali crescono senza che nessuno
//      l'abbia chiesto.
//   2. cambiare le date e non rifare la ricerca. A schermo resterebbero i
//      numeri del periodo di prima sotto le date del periodo nuovo — una
//      schermata che mostra un periodo e ne dichiara un altro.
//   3. il cambio d'ora. In ora locale, il 25 ottobre più ventiquattr'ore non è
//      il 26: è il 25 a un'ora diversa. La freccia resterebbe ferma una volta
//      l'anno e nessuno capirebbe perché.
//
//  Il conto sta nel motore e si prova in Node; il collegamento alla schermata
//  si prova in un browser vero, perché un `onclick` che nomina una funzione
//  che non esiste in Node non lo vede nessuno.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { apriPreventivatore } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const require = createRequire(import.meta.url);
const FC = require(path.join(RADICE, 'tariffe', 'motore', 'foglio-cassa.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

// ── 1. il conto dei giorni, nel motore ───────────────────────────────────────

prova('il motore porta la funzione che sposta le date', () => {
  deve(typeof FC.sposta === 'function', 'FoglioCassa.sposta non è esportata dal motore');
});

prova('un giorno indietro è il giorno prima, su tutt\'e due le date', () => {
  const n = FC.sposta('2026-09-30', '2026-09-30', -1);
  deve(n.dal === '2026-09-29', 'dal: ' + n.dal + ' invece di 2026-09-29');
  deve(n.al === '2026-09-29', 'al: ' + n.al + ' invece di 2026-09-29');
});

prova('un giorno avanti è il giorno dopo, su tutt\'e due le date', () => {
  const n = FC.sposta('2026-09-30', '2026-09-30', 1);
  deve(n.dal === '2026-10-01' && n.al === '2026-10-01', JSON.stringify(n));
});

prova('la finestra resta lunga uguale: si sposta, non si allunga', () => {
  /* Il caso che conta davvero. «Dal 1 al 30 settembre» spostato in avanti è
     «dal 2 al 31», trenta giorni come prima. Se si muovesse solo un estremo
     sarebbero trentuno, e il totale dei premi con loro. */
  const n = FC.sposta('2026-09-01', '2026-09-30', 1);
  deve(n.dal === '2026-09-02', 'il «dal» non si è mosso: ' + n.dal);
  deve(n.al === '2026-10-01', 'l\'«al» non si è mosso: ' + n.al);
  const giorni = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;
  deve(giorni(n.dal, n.al) === giorni('2026-09-01', '2026-09-30'),
    'la finestra ha cambiato lunghezza: era ' + giorni('2026-09-01', '2026-09-30') +
    ' giorni, adesso è ' + giorni(n.dal, n.al));
});

prova('il cambio dell\'ora legale non ferma la freccia', () => {
  /* L'ultima domenica di ottobre 2026 è il 25: in ora locale italiana quel
     giorno dura venticinque ore. Un conto fatto sommando 86.400.000
     millisecondi a una data locale resterebbe sul 25. */
  const n = FC.sposta('2026-10-25', '2026-10-25', 1);
  deve(n.dal === '2026-10-26' && n.al === '2026-10-26',
    'il 25 ottobre più un giorno dovrebbe essere il 26: ' + JSON.stringify(n));
  const m = FC.sposta('2026-03-29', '2026-03-29', -1);
  deve(m.dal === '2026-03-28' && m.al === '2026-03-28',
    'il 29 marzo meno un giorno dovrebbe essere il 28: ' + JSON.stringify(m));
});

prova('il fine mese e il fine anno si attraversano', () => {
  const a = FC.sposta('2026-03-01', '2026-03-01', -1);
  deve(a.dal === '2026-02-28', 'primo marzo meno un giorno: ' + a.dal);
  const b = FC.sposta('2028-03-01', '2028-03-01', -1);
  deve(b.dal === '2028-02-29', 'il 2028 è bisestile, il giorno prima del primo marzo è il 29: ' + b.dal);
  const c = FC.sposta('2026-01-01', '2026-01-01', -1);
  deve(c.dal === '2025-12-31', 'capodanno meno un giorno: ' + c.dal);
});

prova('senza nessuna data non si inventa una finestra', () => {
  /* «Tutto» non ha un giorno prima. Rispondere con una data restringerebbe la
     vista a un clic di distanza senza che nessuno l'abbia chiesto. */
  deve(FC.sposta(null, null, 1) === null, 'due campi vuoti dovrebbero dare null');
  deve(FC.sposta('', '', -1) === null, 'due campi vuoti (stringhe) dovrebbero dare null');
});

prova('con una data sola si sposta quella, e l\'altra resta vuota', () => {
  const n = FC.sposta('2026-09-10', null, 1);
  deve(n && n.dal === '2026-09-11', 'il «dal» non si è mosso: ' + JSON.stringify(n));
  deve(n.al === null, 'l\'«al» era vuoto e deve restare vuoto: ' + JSON.stringify(n));
  const m = FC.sposta(null, '2026-09-10', -1);
  deve(m && m.al === '2026-09-09' && m.dal === null, JSON.stringify(m));
});

// ── 2. il collegamento alla schermata, in un browser vero ────────────────────

const banco = await apriPreventivatore(RADICE);
const p = banco.pagina;

prova('le due frecce esistono nella barra dei filtri del foglio cassa', async () => {
  const c = await p.evaluate(() => {
    /* La pagina del foglio cassa è spenta finché non ci si entra, e da spenta
       ogni misura vale zero: si accende SOLO per misurare, senza passare da
       `showPage`, che andrebbe a leggere il database. La prima stesura di
       questa prova misurava a pagina spenta e leggeva zero — cioè diceva
       «rotto» qualunque cosa ci fosse nel foglio di stile. */
    const pag = document.getElementById('page-foglio-cassa');
    const prima = pag ? pag.style.display : null;
    if (pag) pag.style.display = 'block';
    const b = [...document.querySelectorAll('#page-foglio-cassa .fc-gg-b')];
    const misura = b.map(e => {
      const s = getComputedStyle(e);
      return { w: s.width, h: s.height, cursore: s.cursor };
    });
    if (pag) pag.style.display = prima || '';
    return {
      quante: b.length,
      click: b.map(e => e.getAttribute('onclick')),
      titoli: b.map(e => e.getAttribute('title')),
      misura: misura,
    };
  });
  deve(c.quante === 2, 'frecce trovate: ' + c.quante + ' invece di 2');
  deve(c.click.includes('fcSposta(-1)'), 'nessuna freccia va indietro: ' + JSON.stringify(c.click));
  deve(c.click.includes('fcSposta(1)'), 'nessuna freccia va avanti: ' + JSON.stringify(c.click));
  deve(c.titoli.every(t => t && /giorno/i.test(t)), 'le frecce non dicono che cosa fanno: ' + JSON.stringify(c.titoli));
  /* Un selettore sbagliato nel foglio di stile non dà nessun errore: lascia
     solo due bottoni della misura che decide il browser, in mezzo a campi
     alti trenta pixel. La misura si pretende esatta, non «abbastanza». */
  deve(c.misura.every(m => m.w === '32px' && m.h === '30px'),
    'il foglio di stile non le riconosce: ' + JSON.stringify(c.misura));
  deve(c.misura.every(m => m.cursore === 'pointer'),
    'non sembrano bottoni: il puntatore resta quello del testo — ' + JSON.stringify(c.misura));
});

prova('la schermata carica il motore che sa spostare le date', async () => {
  const c = await p.evaluate(() => ({
    motore: !!window.FoglioCassa,
    sposta: typeof (window.FoglioCassa || {}).sposta === 'function',
    fn: typeof window.fcSposta === 'function',
  }));
  deve(c.motore, 'window.FoglioCassa non esiste: il tag <script> non c\'è o non si carica');
  deve(c.sposta, 'il motore è caricato ma è la versione VECCHIA, senza `sposta`: il contrassegno `?v=` non è stato spostato');
  deve(c.fn, 'fcSposta non esiste nella pagina: le frecce chiamerebbero il vuoto');
});

/* Preme una freccia per davvero e riporta che cosa è successo. `fcRender` si
   sostituisce con un contatore: quello che si vuole sapere è se la ricerca
   viene rifatta, non che cosa disegna. */
async function premi(dal, al, versi) {
  return p.evaluate(({ dal, al, versi }) => {
    const d = document.getElementById('fc-da'), a = document.getElementById('fc-a');
    d.value = dal; a.value = al;
    const vero = window.fcRender;
    let giri = 0;
    window.fcRender = () => { giri++; };
    try { window.fcSposta(versi); } finally { window.fcRender = vero; }
    return { dal: d.value, al: a.value, giri };
  }, { dal, al, versi });
}

prova('premendo la freccia indietro le date si spostano di un giorno', async () => {
  const r = await premi('2026-09-28', '2026-09-28', -1);
  deve(r.dal === '2026-09-27' && r.al === '2026-09-27', JSON.stringify(r));
});

prova('premendo la freccia avanti le date si spostano di un giorno', async () => {
  const r = await premi('2026-09-28', '2026-09-28', 1);
  deve(r.dal === '2026-09-29' && r.al === '2026-09-29', JSON.stringify(r));
});

prova('la ricerca si rifà da sola, senza premere «Cerca»', async () => {
  /* Cambiare le date e lasciare a schermo i numeri di prima è peggio che non
     spostarle: la schermata mostrerebbe un periodo e ne dichiarerebbe un
     altro, e sono soldi. */
  const r = await premi('2026-09-28', '2026-09-28', 1);
  deve(r.giri === 1, 'fcRender chiamata ' + r.giri + ' volte invece di 1');
});

prova('anche a schermo la finestra si sposta senza allungarsi', async () => {
  const r = await premi('2026-09-01', '2026-09-30', 1);
  deve(r.dal === '2026-09-02', 'il «dal» è rimasto indietro: ' + JSON.stringify(r));
  deve(r.al === '2026-10-01', 'l\'«al» è rimasto indietro: ' + JSON.stringify(r));
});

prova('con i campi vuoti non compare nessuna data e non si cerca niente', async () => {
  const r = await premi('', '', -1);
  deve(r.dal === '' && r.al === '', 'si è inventata una finestra: ' + JSON.stringify(r));
  deve(r.giri === 0, 'ha rifatto la ricerca senza che sia cambiato niente: ' + r.giri);
});

// ── 3. il contrassegno di versione ───────────────────────────────────────────

prova('il contrassegno del motore non è rimasto indietro', () => {
  /* `versione-motori` lo controlla per tutti; qui si dice anche perché: senza
     lo spostamento del `?v=`, il browser serve il file di ieri — che le
     frecce non ce l'ha — e a schermo non succede niente. */
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  const m = /foglio-cassa\.js\?v=(\d{8})/.exec(src);
  deve(m, 'il tag <script> del foglio cassa non porta un contrassegno');
  deve(m[1] >= '20260930', 'contrassegno ' + m[1] + ': è più vecchio del giorno in cui la funzione è nata');
});

prova('aprendo il preventivatore non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nFOGLIO CASSA — le frecce del giorno');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nFRECCE DEL GIORNO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
