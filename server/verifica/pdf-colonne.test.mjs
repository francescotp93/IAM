// ═══════════════════════════════════════════════════════════════════════════════
//  LE DUE COLONNE DEL DIP, RIMESSE IN RIGA                        (08/10/2026)
//
//  `pdf.js` non dà righe: dà pezzi di testo con una posizione sul foglio.
//  Rimetterli in riga per sola altezza impasta le colonne di una pagina
//  impaginata su due: su un DIP vero la riga ricostruita diceva
//
//     «Che cosa è assicurato? / Quali sono le   Che cosa NON è assicurato?»
//
//  e due righe sotto le prestazioni assicurate finivano attaccate alle
//  esclusioni. MISURATO su 214 documenti scaricati dalle compagnie: 94 — il
//  44% — hanno il DIP su due colonne.
//
//  ┌───────────────────────────────────────────────────────────────────────────┐
//  │ MA UNA TABELLA NON È DUE COLONNE DI PROSA, e qui si sbaglia facile.      │
//  └───────────────────────────────────────────────────────────────────────────┘
//  «Eventi naturali | Franchigia | 1.000,00 €» è UNA riga: leggerla per
//  colonne staccherebbe l'importo dalla garanzia, cioè romperebbe la cosa per
//  cui il lettore esiste. Metà di queste prove difende quel caso, non l'altro.
//
//  Qui si prova CALCOLO PURO: niente browser, niente PDF. I pezzi sono
//  scritti a mano con le posizioni che avrebbero sul foglio.
//
//      node server/verifica/pdf-colonne.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const P = require(path.join(RADICE, 'tariffe', 'motore', 'pdf-testo.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Un pezzo come lo dà `pdf.js`: il testo, l'ascissa, l'altezza, la larghezza.
   La larghezza si stima dalla lunghezza del testo — 5 punti per carattere è
   l'ordine di grandezza di un corpo 10, e qui serve solo a distinguere una
   riga a tutta pagina da una corta. */
const pz = (t, x, y, w) => ({ str: t, width: w == null ? t.length * 5 : w, transform: [0, 0, 0, 0, x, y] });

/* ── UN DIP A DUE COLONNE ────────────────────────────────────────────────────
   Sinistra a x=50, destra a x=320: la gronda è larga, e tutt'e due le colonne
   portano prosa. Sei righe, che è il minimo che il motore pretende. */
const DUE_COLONNE = [
  pz('Che cosa è assicurato?', 50, 700),
  pz('Che cosa NON è assicurato?', 320, 700),
  pz('Prestazioni in caso di non autosufficienza', 50, 688),
  pz('Non è assicurabile il contraente che non', 320, 688),
  pz('Se come Assicurato non sei più in grado di', 50, 676),
  pz('abbia residenza o domicilio fiscale in Italia;', 320, 676),
  /* UN PEZZO CORTO A CAVALLO DELLA GRONDA, e è il caso vero che ha fatto
     scoprire la regola della larghezza: sul DIP LTC di Net Insurance fra le
     due domande e il loro testo c'era un pezzo così, e bastava a spezzare il
     blocco — la domanda delle esclusioni finiva subito dopo quella delle
     coperture e la sezione si chiudeva prima di leggere una riga. Un pezzo
     corto NON deve spezzare niente. */
  pz('***', 265, 670, 60),
  pz('svolgere quattro tra sei attività elementari', 50, 664),
  pz('l Assicurato che non abbia un età compresa', 320, 664),
  pz('della vita quotidiana, la Compagnia paga una', 50, 652),
  pz('fra diciotto e settantacinque anni al momento', 320, 652),
  pz('rendita mensile vitalizia posticipata.', 50, 640),
  pz('della sottoscrizione della proposta;', 320, 640),
  pz('Temporanea Caso Morte (Garanzia Opzionale)', 50, 628),
  pz('l Assicurato che percepisca una pensione di', 320, 628),
  /* UN TITOLO A TUTTA PAGINA IN MEZZO: questo invece deve spezzare il blocco e
     restare dov'è, perché separa due parti del documento. */
  pz('SEZIONE B - ALTRE GARANZIE DEL CONTRATTO E LORO LIMITI', 50, 400, 480),
  pz('Capitale assicurato in caso di invalidità', 50, 380),
  pz('Sono esclusi gli infortuni dovuti a dolo', 320, 380),
  pz('permanente totale da infortunio o malattia', 50, 368),
  pz('dell Assicurato o a sua colpa grave;', 320, 368),
  pz('Rendita integrativa per il nucleo familiare', 50, 356),
  pz('le malattie già diagnosticate prima della', 320, 356),
  /* Il piè di pagina: una riga sola che attraversa tutto il foglio. */
  pz('DIP Aggiuntivo Vita - Mod. 24108 - ed. 06/2026 - pagina 1 di 4', 50, 60, 500),
];

prova('UN DIP A DUE COLONNE SI LEGGE PER COLONNE, NON A ZIG-ZAG', () => {
  const righe = P.righeDaPezzi(DUE_COLONNE);
  const i = righe.findIndex((r) => /Che cosa è assicurato/.test(r));
  const j = righe.findIndex((r) => /Che cosa NON è assicurato/.test(r));
  const k = righe.findIndex((r) => /Temporanea Caso Morte/.test(r));
  deve(i >= 0 && j >= 0 && k >= 0, 'righe mancanti: ' + JSON.stringify(righe));
  /* LA COSA CHE CONTA DAVVERO, e è il motivo per cui questa prova esiste: la
     domanda delle esclusioni sta nella colonna di DESTRA, e deve arrivare
     DOPO tutto il contenuto di sinistra. Se arriva subito dopo la domanda
     delle coperture, il lettore chiude la sezione prima di aver letto una
     riga — che è esattamente quello che faceva prima. */
  deve(k < j, 'la domanda delle esclusioni arriva prima del contenuto della colonna di sinistra: '
    + 'la sezione delle coperture si chiude subito e il documento vale zero');
  /* E nessuna riga deve portare pezzi di tutt'e due le colonne. */
  deve(!righe.some((r) => /assicurato\?.*NON è assicurato/.test(r)),
    'due colonne sono finite nella stessa riga: ' + JSON.stringify(righe.filter((r) => /assicurato/.test(r))));
});

prova('e il piè di pagina resta in fondo', () => {
  /* Il riconoscimento dei fascicoli il piè di pagina lo cerca in fondo alla
     pagina: spostandolo in mezzo alle colonne, i confini fra DIP, DIP
     aggiuntivo e Condizioni non si trovano più. */
  const righe = P.righeDaPezzi(DUE_COLONNE);
  deve(/pagina 1 di 4/.test(righe[righe.length - 1]),
    'il piè di pagina non è l\'ultima riga: ' + JSON.stringify(righe.slice(-3)));
});

prova('UNA RIGA A TUTTA PAGINA SEPARA, E RESTA DOVE STA', () => {
  /* Un titolo che attraversa tutto il foglio divide il documento in due
     parti: la roba sopra e la roba sotto. Dev'essere stampato FRA le due,
     non dentro una colonna — altrimenti il contenuto della seconda parte
     finisce attaccato a quello della prima, e una garanzia della sezione B
     sembra costituita nella sezione A. */
  const righe = P.righeDaPezzi(DUE_COLONNE);
  const i = (r) => righe.findIndex((x) => r.test(x));
  const titolo = i(/SEZIONE B/);
  const sopraDestra = i(/percepisca una pensione/);     /* ultima riga a destra, prima parte */
  const sottoSinistra = i(/Capitale assicurato/);        /* prima riga a sinistra, seconda parte */
  deve(titolo >= 0 && sopraDestra >= 0 && sottoSinistra >= 0,
    'righe mancanti: ' + JSON.stringify({ titolo, sopraDestra, sottoSinistra }));
  deve(titolo > sopraDestra,
    'il titolo a tutta pagina è finito dentro una colonna, prima della fine della parte di sopra');
  deve(titolo < sottoSinistra,
    'la parte di sotto comincia prima del titolo che la apre');
});

prova('ma un pezzo CORTO a cavallo della gronda non separa niente', () => {
  /* È il caso vero del DIP LTC di Net Insurance. Senza questa regola il
     blocco si spezzava su quel pezzo, la domanda delle esclusioni finiva
     subito dopo quella delle coperture, e il lettore chiudeva la sezione
     prima di aver letto una riga. */
  const righe = P.righeDaPezzi(DUE_COLONNE);
  const prestazioni = righe.findIndex((r) => /Prestazioni in caso di non autosufficienza/.test(r));
  const morte = righe.findIndex((r) => /Temporanea Caso Morte/.test(r));
  const esclusioni = righe.findIndex((r) => /Che cosa NON è assicurato/.test(r));
  deve(prestazioni >= 0 && morte >= 0 && esclusioni >= 0, 'righe mancanti');
  /* Le due garanzie della colonna di sinistra, che stanno una sopra e una
     sotto il pezzo corto, devono restare INSIEME e prima delle esclusioni. */
  deve(morte < esclusioni,
    'il pezzo corto ha spezzato il blocco: la seconda garanzia di sinistra è finita dopo le esclusioni');
  deve(prestazioni < morte, 'le due garanzie di sinistra sono fuori ordine');
});

/* ── UNA TABELLA, CHE NON VA SPEZZATA ───────────────────────────────────────
   Sono gli stessi pezzi della prova che sta in `lettura-proposta-nel-browser`,
   e misurano la stessa cosa da questo lato: le celle di una riga di tabella
   stanno sulla stessa riga di testo. */
prova('UNA TABELLA NON È DUE COLONNE: le celle restano sulla stessa riga', () => {
  const righe = P.righeDaPezzi([
    pz('Eventi', 50, 700), pz('Franchigia', 300, 700),
    pz('naturali', 50, 680), pz('1.000,00 €', 300, 680), pz('300,00 €', 420, 680),
  ]);
  deve(righe.length === 2, 'righe ricostruite: ' + righe.length + ' — ' + JSON.stringify(righe));
  deve(righe[0] === 'Eventi Franchigia', 'la prima riga è stata spezzata: ' + JSON.stringify(righe[0]));
  deve(righe[1] === 'naturali 1.000,00 € 300,00 €',
    'l\'importo è stato staccato dalla sua etichetta: ' + JSON.stringify(righe[1]));
});

prova('e nemmeno una tabella lunga di celle corte', () => {
  /* Dieci righe concordi sul confine: il conto delle righe da solo direbbe
     «due colonne». Quello che le distingue è che le celle sono CORTE — in
     media meno di venticinque caratteri per lato. Senza quella condizione
     questa tabella si spezzerebbe e ogni importo perderebbe la sua riga. */
  const pezzi = [];
  for (let n = 0; n < 10; n++) {
    pezzi.push(pz('Garanzia ' + n, 50, 700 - n * 12));
    pezzi.push(pz((n + 1) + '.000 €', 300, 700 - n * 12));
  }
  const righe = P.righeDaPezzi(pezzi);
  deve(righe.length === 10, 'la tabella è stata spezzata: ' + righe.length + ' righe invece di 10');
  deve(/^Garanzia 0 1\.000 €$/.test(righe[0]),
    'l\'importo è stato staccato dalla garanzia: ' + JSON.stringify(righe[0]));
});

prova('e nemmeno una tabella di TRE righe con le celle lunghe', () => {
  /* Questa è la tabella che le altre condizioni NON tengono fuori: le celle
     sono lunghe, quindi la prova della prosa passa, e il vuoto è largo. Quello
     che la salva è il conto delle righe — sei, non tre: con poche righe un
     vuoto largo è un caso, non un'impaginazione. Spezzandola, ogni franchigia
     perderebbe la garanzia a cui appartiene. */
  const righe = P.righeDaPezzi([
    pz('Responsabilità civile verso terzi (RCT)', 50, 700),
    pz('Franchigia 1.000,00 € per ogni sinistro', 320, 700),
    pz('Responsabilità civile prestatori d opera', 50, 680),
    pz('Franchigia 2.500,00 € per ogni sinistro', 320, 680),
    pz('Ricorso terzi da incendio del fabbricato', 50, 660),
    pz('Scoperto del 10% con il minimo di 500,00 €', 320, 660),
  ]);
  deve(righe.length === 3, 'la tabella è stata spezzata: ' + righe.length + ' righe invece di 3\n'
    + JSON.stringify(righe, null, 1));
  deve(/RCT\).*1\.000,00/.test(righe[0]),
    'la franchigia è stata staccata dalla sua garanzia: ' + JSON.stringify(righe[0]));
});

prova('UN VUOTO FRA DUE PAROLE NON È UNA COLONNA', () => {
  /* Una pagina normale a una colonna: dentro ogni riga ci sono spazi fra i
     pezzi, perché `pdf.js` spezza il testo dove cambia il carattere o la
     crenatura. Se bastasse un vuoto qualunque a dichiarare una colonna, ogni
     pagina del documento si leggerebbe in due pezzi — e tutte le righe di
     tutti i documenti cambierebbero. */
  const pezzi = [];
  for (let n = 0; n < 10; n++) {
    pezzi.push(pz('La Compagnia si impegna a corrispondere', 50, 700 - n * 12, 190));
    pezzi.push(pz('al Beneficiario designato il capitale', 245, 700 - n * 12, 185));
    pezzi.push(pz('assicurato nei limiti previsti.', 435, 700 - n * 12, 150));
  }
  const righe = P.righeDaPezzi(pezzi);
  deve(righe.length === 10, 'la pagina è stata spezzata in colonne: ' + righe.length + ' righe invece di 10');
  deve(/^La Compagnia si impegna a corrispondere al Beneficiario/.test(righe[0]),
    'la riga è stata tagliata: ' + JSON.stringify(righe[0]));
});

prova('UNA COLONNA DI ETICHETTE AL MARGINE NON È UNA COLONNA', () => {
  /* Molte Condizioni hanno una colonnina di etichette al margine sinistro e
     il testo a destra. Il vuoto fra le due è largo, le righe sono tante, e il
     testo di destra è prosa: le altre condizioni passerebbero tutte. Quello
     che la tiene insieme è che il confine deve stare nella FASCIA CENTRALE
     del foglio — al margine no. Spezzandola, l'etichetta «Art. 3» si
     staccherebbe dall'articolo che nomina. */
  const pezzi = [];
  for (let n = 0; n < 10; n++) {
    pezzi.push(pz('Art. ' + (n + 1), 50, 700 - n * 12, 35));
    pezzi.push(pz('La garanzia opera nei limiti del massimale indicato in polizza', 150, 700 - n * 12, 400));
  }
  const righe = P.righeDaPezzi(pezzi);
  deve(righe.length === 10, 'l\'etichetta al margine è stata letta come una colonna: '
    + righe.length + ' righe invece di 10');
  deve(/^Art\. 1 La garanzia opera/.test(righe[0]),
    'l\'etichetta si è staccata dal suo articolo: ' + JSON.stringify(righe[0]));
});

prova('una pagina a una colonna non cambia di una virgola', () => {
  /* La regola nuova deve essere invisibile dove non serve: il 97% delle pagine
     del corpo dei documenti è a una colonna, e un cambio là sarebbe un rischio
     senza un guadagno. */
  const pezzi = [];
  for (let n = 0; n < 12; n++) pezzi.push(pz('Riga numero ' + n + ' di un documento normale a una colonna', 50, 700 - n * 12));
  const righe = P.righeDaPezzi(pezzi);
  deve(righe.length === 12, 'righe: ' + righe.length);
  deve(righe[0] === 'Riga numero 0 di un documento normale a una colonna', JSON.stringify(righe[0]));
  deve(righe[11] === 'Riga numero 11 di un documento normale a una colonna', JSON.stringify(righe[11]));
});

prova('una pagina vuota resta vuota, e gli spazi non diventano righe', () => {
  deve(P.righeDaPezzi([]).length === 0, 'una pagina senza pezzi produce righe');
  deve(P.righeDaPezzi(null).length === 0, 'nessun pezzo produce righe');
  deve(P.righeDaPezzi([pz('   ', 10, 660)]).length === 0,
    'una riga di soli spazi diventa una riga: i PDF di compagnia ne hanno a decine');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPDF A COLONNE — rimettere in riga i pezzi di una pagina');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nPDF A COLONNE: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
