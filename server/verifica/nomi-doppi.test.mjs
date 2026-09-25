// ═══════════════════════════════════════════════════════════════════════════
//  DUE FUNZIONI CON LO STESSO NOME: LA SECONDA VINCE, E NESSUNO LO DICE
//
//  PERCHE' ESISTE
//    Il 25/09/2026 ho aggiunto a `index.html` una funzione `fluAnnulla` per
//    disfare un'importazione. Ne esisteva gia' una, `fluAnnulla()`, che annulla
//    l'anteprima prima di scrivere. Stesso nome, stesso file.
//
//    In JavaScript non e' un errore: la seconda definizione sostituisce la
//    prima, in silenzio. Il tasto «Annulla» dell'anteprima avrebbe aperto la
//    finestra che CANCELLA un portafoglio — l'esatto contrario di quello che
//    la parola «annulla» promette in quel punto.
//
//    Non l'ha trovato nessuna prova: ognuna guardava il suo pezzo, e il pezzo
//    era giusto. L'ho visto per caso, togliendo il codice per un altro motivo.
//
//    `index.html` ha piu' di trentaduemila righe e centinaia di funzioni. Il
//    prossimo che sceglie un nome gia' preso non se ne accorgera' nemmeno lui.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';

const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/* Solo le funzioni di primo livello: quelle dichiarate a inizio riga, senza
   rientro. Una funzione annidata dentro un'altra ha il suo spazio e puo'
   chiamarsi come le pare. */
const doppi = {};
const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let m;
while ((m = re.exec(pagina))) {
  const riga = pagina.slice(0, m.index).split('\n').length;
  (doppi[m[1]] = doppi[m[1]] || []).push(riga);
}

const collisioni = Object.keys(doppi).filter(n => doppi[n].length > 1)
  .map(n => n + ' (righe ' + doppi[n].join(', ') + ')');

console.log('\n══ NOMI DOPPI ══');
console.log('  funzioni di primo livello: ' + Object.keys(doppi).length);
if (collisioni.length) {
  console.log('  ❌  ' + collisioni.length + ' nomi definiti piu\' di una volta — la seconda vince, in silenzio:');
  collisioni.forEach(c => console.log('        ' + c));
  console.log('\nNOMI DOPPI: 0 superate, 1 fallita');
  process.exit(1);
}
console.log('  ok  nessun nome definito due volte');
console.log('\nNOMI DOPPI: 1 superate, 0 fallite');
