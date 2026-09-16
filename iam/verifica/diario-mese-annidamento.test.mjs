// ═══════════════════════════════════════
//  NEL MESE LE ATTIVITÀ RESTANO DENTRO IL LORO GIORNO
//
//  Il 5 agosto 2026 ho rotto la vista mese con una riga. Per rendere le
//  attività cliccabili le ho trasformate in <button> — ma stavano dentro la
//  cella del giorno, che era già un <button>.
//
//  Un <button> dentro un <button> è HTML non valido, e il browser non lo
//  segnala: il parser CHIUDE la cella appena incontra il pulsante interno.
//  Le attività finiscono fuori dal loro giorno e diventano celle a sé stanti.
//  Il mese si vedeva a pezzi, con i numeri dei giorni sparsi.
//
//  Misurato: ogni riquadro occupava 192×118 pixel, cioè una cella intera.
//
//  Questa prova esiste perché un errore così non si vede leggendo il codice —
//  sembra tutto a posto — e nemmeno guardando una schermata con poche
//  attività. Si vede solo quando la giornata è piena.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { fn(); esiti.push([true, nome, '']); }
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

prova('la cella del giorno non è un pulsante', () => {
  /* Se lo è, e dentro ci sono le attività cliccabili, il browser spacca la
     cella in silenzio. */
  const f = corpoDi('function renderWDCal()');
  deve(f, 'manca renderWDCal');
  deve(!/<button[^>]*class="wdm-g/.test(f),
    'la cella del giorno è tornata un <button>: le attività dentro la spaccheranno');
});

prova('le attività del mese sono pulsanti veri', () => {
  /* Non si torna indietro sulla tastiera: un elenco di cose cliccabili solo
     col mouse taglia fuori chi lavora coi tasti. */
  const f = corpoDi('function renderWDCal()');
  const m = f.match(/const chip = [^\n]*\n?[^\n]*/);
  deve(m, 'non trovo la riga che costruisce il riquadro dell\'attività');
  deve(/<button/.test(m[0]), 'le attività del mese non sono pulsanti');
});

prova('la giornata resta apribile, e anche da tastiera', () => {
  const f = corpoDi('function renderWDCal()');
  deve(/wdApriGiorno\(/.test(f), 'non si può più aprire la giornata dal mese');
  /* Il numero del giorno è il comando raggiungibile col tabulatore: la cella
     è un <div>, e un <div> con onclick i tasti non lo vedono. */
  deve(/<button[^>]*class="wdm-n/.test(f),
    'il numero del giorno non è un pulsante: da tastiera la giornata non si apre');
});

prova('nessun pulsante dentro un altro pulsante, in tutto il diario', () => {
  /* Vale per ogni vista, non solo per il mese: è lo stesso errore che si può
     rifare altrove, e non lo segnala nessuno. */
  for (const fn of ['function renderWDCal()', 'function renderWDSett()', 'function wdsChip(w)', 'function wdsVoceCoda(w)']) {
    const f = corpoDi(fn);
    if (!f) continue;
    /* Si guarda dentro ogni singolo template literal: due <button> nello
       stesso pezzo di HTML costruito insieme sono quasi sempre annidati. */
    for (const pezzo of f.match(/`[^`]*`/g) || []) {
      const quanti = (pezzo.match(/<button/g) || []).length;
      const chiusi = (pezzo.match(/<\/button>/g) || []).length;
      deve(quanti <= 1 || quanti === chiusi,
        fn + ': un pezzo di HTML apre ' + quanti + ' pulsanti e ne chiude ' + chiusi + ' — probabile annidamento');
    }
  }
});

let ko = 0;
console.log('\nDIARIO MESE — le attività restano nel loro giorno');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nMESE: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
