// ═══════════════════════════════════════
//  QUELLO CHE È FATTO SI VEDE CHE È FATTO
//
//  Il diario mostra le stesse attività in quattro posti diversi: la settimana
//  (e il giorno, che ne riusa i riquadri), il mese, la coda «da gestire oggi» e
//  l'elenco. Un'attività
//  completata deve leggersi come completata in TUTTI, non solo in quello dove
//  qualcuno si è ricordato di scriverlo.
//
//  Perché conta più di quanto sembri: la coda di oggi e la griglia della
//  settimana si guardano di sfuggita, fra una telefonata e l'altra. Se una
//  voce chiusa continua a leggersi come le altre, viene rifatta — o peggio,
//  richiamata due volte allo stesso cliente.
//
//  Il colore da solo non basta e non è un dettaglio estetico: stampato in
//  bianco e nero, o letto da chi non distingue il verde dall'azzurro, non dice
//  niente. La riga barrata si vede comunque.
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

// Solo il foglio di stile: «.classe{» compare anche dentro stringhe JavaScript.
const stili = (() => {
  let t = '';
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m; while ((m = re.exec(html))) t += m[1] + '\n';
  return t.replace(/\/\*[\s\S]*?\*\//g, '');
})();

/* Ritaglio per graffe e non «i primi N caratteri»: la prima volta avevo
   tagliato a 2500 e il filtro stava tre righe piu' in la', quindi la prova
   accusava codice corretto. */
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

function regola(selettore) {
  const i = stili.indexOf(selettore + '{');
  return i < 0 ? null : stili.slice(i, stili.indexOf('}', i));
}

prova('il marchio «fatto» arriva dallo stato, in un posto solo', () => {
  /* Tutte le viste passano da wdsColore(): se domani cambia il nome dello
     stato, cambia in un punto e non in cinque. */
  const i = html.indexOf('function wdsColore(w)');
  deve(i > 0, 'manca wdsColore');
  const f = html.slice(i, html.indexOf('\n}', i));
  deve(/stato === 'completato'/.test(f) && /'fatto'/.test(f),
    'wdsColore non riconosce più le attività completate');
});

prova('nella settimana e nel giorno il titolo è barrato', () => {
  const r = regola('.wds-ev.fatto span');
  deve(r, 'manca la regola per il titolo delle attività fatte nella settimana');
  deve(/line-through/.test(r), 'il titolo di un\'attività completata non è barrato');
});

prova('nel mese il titolo è barrato', () => {
  const r = regola('.wdm-e.fatto span');
  deve(r, 'manca la regola per il titolo delle attività fatte nel mese');
  deve(/line-through/.test(r), 'nel mese un\'attività completata si legge come le altre');
});

prova('nella coda «da gestire oggi» le completate non entrano proprio', () => {
  /* Qui NON si barra, e va bene così: una voce chiusa non deve nemmeno
     comparire in una coda che si chiama «da gestire».

     Ci avevo messo una regola per barrarle. Aprendo la pagina in un browser
     vero ho visto che nella coda arrivano solo le voci aperte: quella regola
     non si sarebbe applicata mai. Una regola morta è peggio di una regola
     assente — la si legge e si crede che il problema sia altrove. */
  /* La coda della settimana si costruisce dentro renderWDSett; quella del
     giorno dentro wdgPannelli, non dentro renderWDGiorno — che disegna la
     griglia oraria. Sono due posti diversi e vanno guardati tutti e due. */
  for (const fn of ['function renderWDSett()', 'function wdgPannelli(lista)']) {
    const f = corpoDi(fn);
    deve(f, 'manca ' + fn);
    deve(/stato\s*!==\s*'completato'/.test(f), fn + ': la coda mostra anche le attività già completate');
  }
  deve(!regola('.wds-ci.fatto b'), 'è tornata la regola che barra nella coda, dove non arriva mai nulla di completato');
});

prova('nell\'elenco il titolo è barrato', () => {
  const i = html.indexOf('function renderWD()');
  deve(i > 0, 'manca renderWD');
  const f = html.slice(i, i + 6000);
  deve(/completato'\s*\?\s*'text-decoration:line-through/.test(f),
    'nell\'elenco un\'attività completata non è barrata');
});

/* NIENTE prova sulla scrivania, ed è una scelta.

   Ci ho provato due volte con due premesse diverse, e tutte e due erano
   sbagliate: prima cercavo una riga barrata, poi un filtro sulle completate.
   Poi sono andato a leggere caricaDaFareOggi() e ho scoperto che «Da fare
   oggi» NON mostra il diario di lavoro: aggrega titoli insoluti, rinnovi,
   polizze scadute, preventivi fermi, compleanni e sospesi. Lì di attività del
   diario non ce n'è nessuna — quindi non c'è niente da barrare né da
   escludere.

   Lo scrivo invece di cancellare in silenzio: la prossima persona che legge
   questo file si farà la stessa domanda, e merita la risposta senza doverla
   ricavare da capo. Se un domani la scrivania mostrerà anche il diario, qui
   ci vorrà una prova — e allora sarà una prova con una premessa vera. */

prova('barrato E colore, non solo colore', () => {
  /* Il colore non è mai l'unico segnale: stampato in bianco e nero, o letto
     da chi non distingue verde e azzurro, resterebbe muto. */
  for (const sel of ['.wds-ev.fatto', '.wdm-e.fatto']) {
    const r = regola(sel);
    deve(r && /background/.test(r), sel + ' ha perso il colore di sfondo');
  }
});

let ko = 0;
console.log('\nDIARIO — le attività completate si vedono barrate');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nBARRATE: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
