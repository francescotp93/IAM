// ═══════════════════════════════════════
//  DIARIO — «Nuova attività» parte dal giorno che si sta guardando
//
//  Si apre un giorno nel calendario, si preme «Nuova attività», e la finestra
//  proponeva OGGI. Chi ha appena cliccato il 18 sta scrivendo un'attività per
//  il 18: doveva cancellare la data e riscriverla ogni volta — e il giorno che
//  non ci si accorge di non aver cambiato finisce nell'agenda sbagliata, dove
//  si trova solo quando è passato.
//
//  Il giorno «che si sta guardando» non è sempre lo stesso: nella vista Giorno
//  è quello aperto, nel Mese quello scelto, nella Settimana e nell'Elenco non
//  ce n'è nessuno (c'è un periodo). E fuori dal diario nemmeno: il tasto della
//  Scrivania deve continuare a proporre oggi.
//
//  La funzione qui sotto non si legge: si ESEGUE, con gli stessi nomi che ha
//  nella pagina. Una prova che si limitasse a cercare la stringa giusta
//  resterebbe verde anche il giorno in cui la logica dentro si rovescia.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

function corpoDi(firma) {
  const i = html.indexOf(firma);
  if (i < 0) return null;
  let liv = 0, j = html.indexOf('{', i);
  const inizio = j;
  for (; j < html.length; j++) {
    if (html[j] === '{') liv++;
    else if (html[j] === '}') { liv--; if (liv === 0) return html.slice(inizio, j + 1); }
  }
  return null;
}

/* La funzione della pagina, montata qui con i suoi appigli finti: il pannello
   del diario, la vista attiva e le due date. Cosi' si prova il comportamento,
   non il testo. */
function montaScelta({ diarioAperto = true, vista = 'giorno', giorno = null, meseScelto = null }) {
  const corpo = corpoDi('function wdDataScelta()');
  if (!corpo) throw new Error('wdDataScelta() non c\'è più: «Nuova attività» è tornata a proporre sempre oggi');
  const f = new Function('document', 'wdVistaAttiva', 'WDG_DATA', 'WD_CAL_DAY',
    'return (function wdDataScelta() ' + corpo + ')();');
  return f(
    { getElementById: (id) => (id === 'panel-workdiary'
        ? (diarioAperto ? { offsetParent: {} } : { offsetParent: null })
        : null) },
    () => vista, giorno, meseScelto);
}

// ── 1. Il comportamento, eseguito ────────────────────────────────────────
prova('nella vista Giorno la data proposta è il giorno aperto', () => {
  deve(montaScelta({ vista: 'giorno', giorno: '2026-09-18' }) === '2026-09-18',
    'apre la nuova attività su un giorno diverso da quello che si sta guardando');
  return 'giorno aperto 18/09 → data 18/09';
});

prova('nel Mese la data proposta è il giorno scelto', () => {
  deve(montaScelta({ vista: 'cal', meseScelto: '2026-12-24' }) === '2026-12-24',
    'nel mese il giorno scelto non arriva alla finestra');
});

prova('senza un giorno scelto non si inventa niente: decide chi apre la finestra', () => {
  /* Settimana ed elenco hanno un PERIODO, non un giorno: restituire il lunedì
     o il primo della lista sarebbe indovinare al posto dell'operatore. */
  deve(montaScelta({ vista: 'sett' }) === null, 'la settimana si inventa un giorno');
  deve(montaScelta({ vista: 'lista' }) === null, 'l\'elenco si inventa un giorno');
  deve(montaScelta({ vista: 'giorno', giorno: null }) === null, 'senza giorno aperto restituisce qualcosa');
});

prova('fuori dal diario il giorno non conta: la Scrivania propone oggi', () => {
  /* IL CASO CHE DEVE FALLIRE. Se un domani si togliesse il controllo sul
     pannello, il tasto «Inizia una nuova attività» della Scrivania erediterebbe
     il giorno rimasto aperto nel diario — magari di tre settimane fa. */
  deve(montaScelta({ diarioAperto: false, vista: 'giorno', giorno: '2026-08-01' }) === null,
    'col diario chiuso la data del diario arriva lo stesso alla Scrivania');
});

// ── 2. La finestra la usa davvero ────────────────────────────────────────
prova('la finestra parte dal giorno scelto, e solo in mancanza da oggi', () => {
  const c = corpoDi('async function openWDModal(id, dataScelta)');
  deve(c, 'openWDModal non riceve più la data da chi la apre');
  const riga = c.split('\n').find(r => r.includes("sv('wd-data'"));
  deve(riga, 'la finestra non scrive più la data');
  deve(/dataScelta/.test(riga), 'la data passata da chi apre la finestra viene ignorata');
  deve(/wdDataScelta\(\)/.test(riga), 'la finestra non guarda il giorno aperto nel calendario');
  /* L'ordine conta: prima il giorno scelto, poi oggi. Invertito, si tornerebbe
     esattamente al guasto di partenza senza che nessuna stringa cambi. */
  deve(riga.indexOf('wdDataScelta()') < riga.indexOf('wdsISO(new Date())'),
    'oggi viene prima del giorno scelto: la scelta dell\'operatore verrebbe scavalcata');
  return riga.trim();
});

prova('«Nuovo evento» del giorno passa la data, non la scrive dopo', () => {
  /* Prima la scriveva nel campo 50 millisecondi dopo aver aperto la finestra,
     sperando di arrivare seconda. Adesso la passa a chi la apre. */
  const c = corpoDi('function apriNuovoEventoData(ds)');
  deve(c, 'manca la funzione del tasto «Nuovo evento»');
  deve(/openWDModal\(null,\s*ds\)/.test(c), 'la data non viene passata alla finestra');
  deve(!/setTimeout/.test(c), 'la data si scrive ancora a orologeria dopo l\'apertura');
});

// ── esecuzione ───────────────────────────────────────────────────────────
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ok  ' + nome + (msg ? '  — ' + msg : '')); }
  else console.log('  KO  ' + nome + '  — ' + msg);
}
console.log('\nNUOVA ATTIVITÀ DAL GIORNO: ' + ok + ' superate, ' + (esiti.length - ok) + ' fallite');
process.exit(ok === esiti.length ? 0 : 1);
