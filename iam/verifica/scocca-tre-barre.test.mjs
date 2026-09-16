// ═══════════════════════════════════════════════════════════════════════════════
//  SCOCCA A TRE BARRE — prove sulla navigazione unificata di With Us One.
//
//  Sorveglia due promesse fatte a voce, che è facile rompere senza accorgersene:
//
//   1. UNA SOLA APPLICAZIONE. Aprire il preventivatore non deve più cambiare
//      indirizzo: si apre dentro la scocca. Se qualcuno rimette un
//      window.location verso il preventivatore, qui si vede subito.
//
//   2. NON SI PERDE NIENTE. Ogni voce del menu deve agganciarsi a una funzione
//      che in IAM esiste davvero, e ogni permesso deve essere letto da un
//      pulsante che nella pagina c'è. Un refuso in un nome renderebbe una voce
//      muta o sempre nascosta, senza nessun errore visibile.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const one = leggi('withus-one.js');
const css = leggi('withus-one.css');
const idx = leggi('index.html');

// Il corpo del file senza la libreria di icone: le icone sono un blocco SVG
// lungo e non deve inquinare le ricerche di testo.
const corpo = one.replace(/var SPRITE = '[\s\S]*?';/, "var SPRITE = '';");

prova('la scocca costruisce le sue barre', () => {
  // Le tre funzioni esistono ancora tutte. Dopo il passaggio alla sidebar
  // (nav laterale come i CRM), BARRA 2 è la colonna a sinistra: non è più
  // annidata nella fascia, ma inserita nella pagina come le altre due.
  for (const f of ['costruisciBarra1', 'costruisciBarra2', 'costruisciBarra3']) {
    deve(new RegExp('function ' + f + '\\b').test(corpo), 'manca ' + f);
  }
  deve(new RegExp('insertBefore\\(costruisciBarra2\\(\\)').test(corpo), 'la sidebar (BARRA 2) non viene messa nella pagina');
  deve(new RegExp('insertBefore\\(costruisciBarra1\\(\\)').test(corpo), 'la fascia in alto non viene messa nella pagina');
  deve(new RegExp('insertBefore\\(costruisciBarra3\\(\\)').test(corpo), 'la riga del titolo non viene messa nella pagina');
  // La sidebar è fissa a sinistra: #app le lascia il posto con un padding.
  deve(/#app\.w1\{[^}]*padding-left:var\(--w1-sidew\)/.test(css.replace(/\s+/g, '')) ||
       /#app\.w1\{padding-left:var\(--w1-sidew\)/.test(css.replace(/\s+/g, '')),
    'il contenuto non lascia il posto alla sidebar (manca il padding a sinistra)');
  return 'sidebar + fascia in alto + riga del titolo';
});

prova('le barre entrano nell ordine giusto', () => {
  // insertBefore(x, primo figlio) mette in cima: l ultima inserita finisce prima.
  // Ora si inseriscono tutte e tre: la sidebar (BARRA 2, position:fixed) finisce
  // prima nel DOM ma è fuori flusso; nella colonna restano fascia e titolo.
  const ord = [...corpo.matchAll(/insertBefore\((costruisciBarra\d)\(\)/g)].map(m => m[1]);
  deve(ord.join(',') === 'costruisciBarra3,costruisciBarra1,costruisciBarra2',
    'ordine di inserimento sbagliato: ' + ord.join(','));
  return 'sidebar a sinistra, fascia in alto, riga del titolo';
});

prova('la vecchia navigazione resta nella pagina, solo nascosta', () => {
  deve(/#app\.w1\s*>\s*\.hdr[\s\S]{0,80}display:\s*none/.test(css) || /#app\.w1 > \.hdr, #app\.w1 > \.nav/.test(css),
    'la vecchia intestazione non risulta nascosta dal foglio di stile');
  deve(!/\.hdr['"]?\)\s*\.remove\(\)/.test(corpo) && !/removeChild/.test(corpo),
    'la scocca sta rimuovendo elementi invece di nasconderli: i permessi di IAM scrivono li sopra');
  return 'i permessi continuano a essere leggibili';
});

prova('i pulsanti nascosti che reggono i permessi non si cancellano', () => {
  /* Il 14/08/2026, ripulendo i riferimenti a «Quoto», il pulsante nb-quoto
     sembrava un residuo: e' nascosto (display:none) e il suo nome non si
     legge da nessuna parte. Ma la scocca ci legge sopra se «Nuovo
     preventivo» va mostrato nel menu scuro. Cancellarlo avrebbe fatto
     sparire la voce dal menu di TUTTI, senza nessun errore — e il guasto
     sarebbe sembrato un problema di permessi.

     Vale per ogni voce con mirror/mirrorAny, non solo per quella: la
     prova qui sotto li ricava dalla scocca invece di elencarli a mano,
     cosi' copre anche le voci che verranno. */
  const mirror = [...corpo.matchAll(/mirror:\s*'([^']+)'/g)].map(m => m[1]);
  const mirrorAny = [...corpo.matchAll(/mirrorAny:\s*\[([^\]]+)\]/g)]
    .flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  const tutti = [...new Set([...mirror, ...mirrorAny])];
  deve(tutti.length > 0, 'nessuna voce del menu legge piu i permessi da IAM');
  for (const id of tutti) {
    deve(idx.includes('id="' + id + '"'),
      'la scocca legge i permessi da «' + id + '», che in IAM non esiste piu: ' +
      'la voce del menu sparirebbe per tutti senza nessun errore');
  }
  return tutti.length + ' interruttori di permesso, tutti presenti in IAM';
});

prova('aprire il preventivatore non cambia piu indirizzo', () => {
  deve(!/window\.location\.href\s*=/.test(corpo), 'c e ancora un cambio di indirizzo nella scocca');
  deve(/fr\.src\s*=/.test(corpo), 'il riquadro non viene mai caricato');
  deve(/id="w1-qframe"/.test(corpo), 'manca il riquadro del preventivatore');
  return 'si apre dentro la scocca';
});

prova('la vecchia schermata di passaggio non parte piu', () => {
  const m = corpo.match(/window\.goTab = function \(t\) \{([\s\S]*?)\n    \};/);
  deve(m, 'goTab non viene piu avvolto: la scocca non intercetta nulla');
  const primaRiga = m[1].trim().split('\n')[0];
  deve(/t === 'quoto'/.test(primaRiga) && /return;/.test(primaRiga),
    'la deviazione del preventivatore non e la prima cosa che fa goTab: IAM farebbe in tempo a cambiare indirizzo');
  return 'intercettato prima di IAM';
});

prova('il ponte con il preventivatore porta con se la sessione (sul canale)', () => {
  /* La sessione non passa piu' nell'indirizzo (quotoUrl/#at/#rt) ma sul canale
     postMessage: QUOTO chiede 'quoto-ready', la scocca risponde 'quoto-session'
     con at/rt letti da db.auth.getSession(), verificando prima l'origine. Cosi'
     i token non restano nell'indirizzo del riquadro. */
  deve(/sessionePerQuoto/.test(corpo), 'la scocca non prepara la sessione da mandare al riquadro');
  deve(/w1:\s*'quoto-session'/.test(corpo), 'la scocca non risponde con la sessione sul canale');
  deve(/from=iam/.test(corpo), 'il riquadro non si apre piu con from=iam');
  return 'stessa sessione, ma sul canale';
});

prova('dentro il riquadro il preventivatore non mostra il suo menu', () => {
  deve(/\.topbar\{display:none !important;\}/.test(corpo), 'la barra del preventivatore resterebbe visibile dentro la scocca');
  return 'una sola navigazione a schermo';
});

prova('apriQuoto di IAM non viene toccato', () => {
  deve(!/window\.apriQuoto\s*=/.test(corpo),
    'la scocca riscrive apriQuoto(): il collaboratore che ha solo il preventivatore resterebbe su una scocca vuota');
  return 'il caso "solo preventivatore" funziona come prima';
});

prova('ogni permesso si legge da un pulsante che esiste davvero', () => {
  const ids = new Set();
  for (const m of corpo.matchAll(/data-mirror="([a-z0-9\-]+)"/g)) ids.add(m[1]);
  for (const m of corpo.matchAll(/mirror: '([a-z0-9\-]+)'/g)) ids.add(m[1]);
  for (const m of corpo.matchAll(/mirrorAny: \[([^\]]+)\]/g)) {
    for (const x of m[1].split(',')) ids.add(x.trim().replace(/'/g, ''));
  }
  const mancanti = [...ids].filter(id => !new RegExp('id="' + id + '"').test(idx));
  deve(mancanti.length === 0, 'permessi agganciati a pulsanti inesistenti: ' + mancanti.join(', '));
  return ids.size + ' permessi rispecchiati';
});

prova('ogni voce chiama una funzione che in IAM esiste', () => {
  const fn = new Set();
  for (const m of corpo.matchAll(/tryCall\('([A-Za-z0-9_]+)'\)/g)) fn.add(m[1]);
  const mancanti = [...fn].filter(f => !new RegExp('function ' + f + '\\s*\\(').test(idx) && !new RegExp('async function ' + f + '\\s*\\(').test(idx));
  deve(mancanti.length === 0, 'voci agganciate a funzioni inesistenti: ' + mancanti.join(', '));
  return fn.size + ' funzioni richiamate';
});

prova('la barra scura ha le voci decise, nell ordine deciso', () => {
  const chiavi = [...corpo.matchAll(/\{ key: '([a-z]+)',/g)].map(m => m[1]);
  const atteso = ['dashboard', 'quoto', 'clienti', 'portafoglio', 'carica', 'agenzia', 'marketing', 'richieste', 'strumenti'];
  deve(chiavi.join(',') === atteso.join(','), 'menu cambiato: ' + chiavi.join(', '));
  return atteso.length + ' voci';
});

prova('i ticket stanno solo nella scrivania', () => {
  /* La coda ticket vive nella scrivania. Prima era scritta in tre posti: la
     voce di menu (tolta il 01/08/2026) e il pulsante rapido in alto (tolto il
     03/08/2026). Ne resta uno solo: quello dentro la scrivania. */
  const doppi = (corpo.match(/l: 'Ticket'/g) || []).length;
  deve(doppi === 0, 'Ticket e tornato una voce di menu: la coda e gia nella scrivania');
  deve(!/w1-b-ticket/.test(corpo),
    'il pulsante Ticket e tornato nella barra in alto: la coda si apre dalla scrivania');
  return 'una sola coda, nella scrivania';
});

prova('ogni voce del menu apre una pagina che nel preventivatore esiste', () => {
  // Tre voci puntavano a ?page=portafoglio da prima che quella pagina
  // esistesse: il menu si apriva e non succedeva niente. Le pagine del
  // preventivatore vivono nell'altro repository, quindi qui si controlla
  // almeno che ogni voce dichiari una pagina e che non ci siano doppioni
  // involontari verso la stessa destinazione con etichette diverse.
  const dest = [...corpo.matchAll(/go: Q\('([a-z-]+)'\)/g)].map(m => m[1]);
  // Emissioni e Preventivi non sono più voci Q() del menu: sono schede di
  // Operativa, aperte da selOperativaTab con withusOneApri (§11.7). Perciò il
  // conteggio delle voci Q() dirette è sceso — la soglia segue.
  deve(dest.length >= 8, 'poche voci collegate al preventivatore: ' + dest.length);
  deve(dest.includes('portafoglio'), 'manca la voce del portafoglio');
  deve(dest.includes('scadenzario'), 'la voce Scadenzario non porta allo scadenzario');
  // ogni destinazione deve avere titolo e briciole, altrimenti la terza barra
  // resta con il titolo della pagina precedente
  const titolati = [...one.matchAll(/^\s{4}'?([a-z-]+)'?:\s*\[/gm)].map(m => m[1]);
  const senzaTitolo = [...new Set(dest)].filter(d => !titolati.includes(d));
  deve(senzaTitolo.length === 0, 'destinazioni senza titolo nella barra: ' + senzaTitolo.join(', '));
  return dest.length + ' voci, tutte con titolo';
});

prova('nessuna emoji: solo icone vettoriali', () => {
  const emoji = corpo.match(/[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}]/gu) || [];
  deve(emoji.length === 0, 'trovate emoji: ' + emoji.join(' '));
  deve(/sp\.id = 'w1-sprite';/.test(corpo), 'la libreria di icone non viene mai messa nella pagina');
  const icone = (one.match(/<symbol id="/g) || []).length;
  deve(icone >= 60, 'la libreria di icone e incompleta: ' + icone + ' icone');
  return icone + ' icone vettoriali, nessuna emoji';
});

prova('il riquadro ha il suo posto nel foglio di stile', () => {
  for (const c of ['#panel-quoto-live', '.w1-stage', '.w1-frame', '.w1-load', '.w1-load-logo']) {
    deve(css.includes(c), 'manca la regola per ' + c);
  }
  deve(/body\.theme-dark[\s\S]{0,120}\.w1-frame/.test(css), 'il riquadro non segue il tema scuro');
  return 'riquadro a tutto spazio, tema chiaro e scuro';
});

console.log('SCOCCA A TRE BARRE');
for (const [ok, nome, msg] of esiti) {
  console.log(`  ${ok ? 'ok ' : 'X  '} ${nome}${msg ? ' — ' + msg : ''}`);
}
const falliti = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`SCOCCA A TRE BARRE: ${esiti.length - falliti} superate, ${falliti} fallite`);
process.exit(falliti === 0 ? 0 : 1);
