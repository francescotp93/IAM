// ═══════════════════════════════════════════════════════════════════════════════
//  UNA SCHERMATA SENZA VOCE NEL MENU, PER CHI LAVORA, NON ESISTE
//
//  PERCHE' ESISTE
//    Il 2 settembre 2026 le Convenzioni sono state costruite, provate e
//    pubblicate nel repository del preventivatore. Francesco, tre minuti dopo:
//    «NON LO VEDO». Aveva ragione: dentro IAM la barra di quel repository non si
//    vede mai — il menu e' QUESTO — e nessuno aveva messo la voce qui.
//
//    E' un difetto che non si vede da nessuna delle due parti. Il repository
//    del preventivatore ha la schermata e le sue prove verdi; questo ha il menu
//    e le sue prove verdi; il buco sta esattamente in mezzo, dove non guarda
//    nessuno. L'unico posto da cui si nota e' la faccia di chi apre il menu e
//    non trova la cosa che gli hai appena detto di andare a usare.
//
//    Queste prove guardano il ponte: ogni pagina che il menu chiede deve avere
//    una voce che la chiede, e ogni titolo dichiarato deve corrispondere.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { RADICE, esiti, deve } from './banco.mjs';

const src = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('MENU — le pagine del preventivatore si raggiungono da qui');

/* Tutte le pagine che il menu sa chiedere: aprireQuoto('nome', …) e la sua
   scorciatoia Q('nome', …). Si legge il codice, non un elenco a parte: un
   elenco a parte diverge alla prima voce nuova. */
function pagineChieste(sorgente) {
  const trovate = new Set();
  for (const m of sorgente.matchAll(/\baprireQuoto\(\s*'([a-z0-9:_-]+)'/gi)) trovate.add(m[1].split(':')[0]);
  for (const m of sorgente.matchAll(/\bQ\(\s*'([a-z0-9:_-]+)'/gi)) trovate.add(m[1].split(':')[0]);
  return [...trovate].sort();
}

e.prova('le Convenzioni hanno una voce nel menu', () => {
  /* La prova che nasce dal «NON LO VEDO». Non basta che la schermata esista di
     la': deve esserci il modo di arrivarci da qui. */
  deve(/\{\s*l:\s*'Convenzioni'/.test(src), 'nel menu non c\'e\' nessuna voce «Convenzioni»');
  deve(pagineChieste(src).includes('convenzioni'), 'la voce non chiede la pagina «convenzioni»');
  return 'raggiungibile dal menu, non solo dall\'indirizzo';
});

e.prova('«Importa portafoglio» ha una voce sotto Strumenti', () => {
  /* La stessa prova delle Convenzioni, e nasce dallo stesso «non lo vedo»
     (Francesco, 18/09/2026). La schermata sta nel preventivatore, ma nella
     sua barra in alto — ventuno voci che scorrono — non la trovava nessuno.
     Caricare il portafoglio e' uno strumento dell'agenzia: sta fra gli
     Strumenti, e da li' ci si arriva. */
  deve(/\{\s*l:\s*'Importa portafoglio'/.test(src), 'nel menu non c\'e\' nessuna voce «Importa portafoglio»');
  deve(pagineChieste(src).includes('importa-flusso'), 'la voce non chiede la pagina «importa-flusso»');
  /* E sta sotto Strumenti, non in mezzo ai preventivi: il posto e' parte
     della risposta, altrimenti la si sposta e la prova non se ne accorge.
     La finestra finisce dove finisce DAVVERO il menu Strumenti — alla voce di
     primo livello successiva — e non dopo un tot di caratteri: alla prima
     stesura erano 3000, e sconfinavano nelle mappe dei titoli, dove «Importa
     portafoglio» c'e' comunque. La prova restava verde con la voce spostata
     in cima al menu. L'ha trovato la controprova, non il ragionamento. */
  const iStr = src.indexOf("key: 'strumenti'");
  deve(iStr > 0, 'non trovo il menu Strumenti');
  /* Il confine si trova contando le parentesi, non a occhio: «strumenti» e'
     l'ultima voce di primo livello, quindi «fino alla prossima key» non
     esiste e qualunque numero fisso di caratteri sconfina nel resto del file.
     Si parte dalla graffa che apre la voce e si cammina fino a quella che la
     chiude. */
  const apre = src.lastIndexOf('{', iStr);
  let liv = 0, fine = apre;
  for (let k = apre; k < src.length; k++) {
    if (src[k] === '{') liv++;
    else if (src[k] === '}') { liv--; if (liv === 0) { fine = k; break; } }
  }
  deve(fine > apre, 'non riesco a delimitare il menu Strumenti');
  const strumenti = src.slice(apre, fine);
  /* Si cerca la VOCE, non la parola: il commento che spiega perche' quella
     voce sta li' contiene lo stesso testo, e una prova che cerca la parola
     resta verde anche con la voce spostata altrove — il commento basta a
     soddisfarla. E' la trappola gia' scritta in CLAUDE.md §10 e §12, e ci
     sono cascato scrivendo questa prova: l'ha trovata la controprova. */
  deve(/\{\s*l:\s*'Importa portafoglio'/.test(strumenti), 'la voce esiste ma non sta sotto Strumenti');
  return 'raggiungibile dagli Strumenti, non solo dalla barra del preventivatore';
});

e.prova('ogni pagina chiesta dal menu dichiara il suo titolo', () => {
  /* Senza titolo la terza barra resta a «IAM > IAM» e chi ci arriva non sa
     dov'e'. E' gia' successo con le Fonti, finite nella mappa sbagliata.
     Il titolo puo' stare in due posti: nelle mappe TITOLI / TITOLI_QUOTO,
     oppure scritto nella chiamata stessa. Basta uno dei due — ma uno serve. */
  const mappe = src.slice(src.indexOf('var TITOLI = {'), src.indexOf('var TAB2MENU'));
  const conTitoloInLinea = new Set();
  for (const m of src.matchAll(/\b(?:aprireQuoto|Q)\(\s*'([a-z0-9:_-]+)'\s*,([^;]{0,160})/gi)) {
    if (/titolo\s*:/.test(m[2])) conTitoloInLinea.add(m[1].split(':')[0]);
  }
  /* Le virgolette intorno alla chiave ci vogliono quando il nome della pagina
     ha un trattino (`'importa-flusso': [...]`), che in JavaScript non si puo'
     scrivere nudo. Senza questo `'?` la prova dichiarava «senza titolo» una
     pagina che il titolo ce l'aveva: cercava una forma che quel nome non puo'
     avere. Trovato aggiungendo «Importa portafoglio» il 18/09/2026. */
  const senzaTitolo = pagineChieste(src).filter(p =>
    !conTitoloInLinea.has(p) && !new RegExp('(^|[\\s{,])\'?' + p + '\'?\\s*:\\s*\\[').test(mappe));
  deve(senzaTitolo.length === 0, 'pagine senza titolo nella barra: ' + senzaTitolo.join(', '));
  return pagineChieste(src).length + ' pagine, tutte con il loro titolo';
});

e.prova('i sinonimi della ricerca restano cosa loro: i prodotti', () => {
  /* Aggiungendo «Convenzioni» fra i sinonimi, il 2 settembre, una prova
     esistente e' diventata rossa: SINONIMI aggiunge PAROLE ai prodotti del
     mega-menu, non voci di menu. Aveva ragione lei. Qui si tiene ferma la
     distinzione dal lato opposto, cosi' non si ritenta fra sei mesi. */
  const blocco = src.slice(src.indexOf('var SINONIMI = {'), src.indexOf('\n  };', src.indexOf('var SINONIMI = {')));
  deve(!/Convenzioni/.test(blocco), 'una voce di MENU e\' tornata fra i sinonimi dei PRODOTTI');
  return 'menu e prodotti restano due cose diverse';
});

e.prova('la voce sta sotto Agenzia, dove sta il rapporto con gli enti', () => {
  // Non e' pignoleria: una convenzione e' un accordo dell'agenzia, non un
  // prodotto da quotare. Se finisse fra i prodotti, si cercherebbe per sempre.
  const agenzia = src.slice(src.indexOf("key: 'agenzia'"), src.indexOf("key: 'clienti'") > src.indexOf("key: 'agenzia'") ? src.indexOf("key: 'clienti'") : src.length);
  const fine = agenzia.indexOf('] },');
  deve(/\{\s*l:\s*'Convenzioni'/.test(agenzia.slice(0, fine > 0 ? fine : agenzia.length)),
    'la voce non e\' nel menu Agenzia');
  return 'sotto Agenzia, accanto a Produzione e storico';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
