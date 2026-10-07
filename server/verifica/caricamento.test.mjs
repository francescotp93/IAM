/* ═══════════════════════════════════════════════════════════════════════════════
   LE FASI DI CARICAMENTO — le prove del motore                (07/10/2026)

   La regola che queste prove difendono è una sola, e non è estetica:
   **un'attesa dice sempre che cosa si sta aspettando.**

   Prima c'erano una sessantina di punti che scrivevano «Caricamento…» e basta.
   Chi guardava non sapeva se insistere o ricaricare, e quando i dati arrivavano
   la pagina saltava perché niente aveva preparato lo spazio. Per questo
   `stato()` senza testo non torna un'attesa generica: si rifiuta. Una funzione
   che accetta il vuoto rimette in circolo i sessanta «Caricamento…» il giorno
   dopo, e nessuno se ne accorge.

       node server/verifica/caricamento.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const C = (await import('file://' + path.join(RADICE, 'tariffe', 'motore', 'caricamento.js'))).default;

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('UN\'ATTESA SENZA TESTO SI RIFIUTA', () => {
  /* È la prova centrale. Se questa cade, torna «Caricamento…». */
  ['', '   ', null, undefined, '…', '...'].forEach((v) => {
    let scoppiato = false;
    try { C.stato(v); } catch (e) { scoppiato = true; }
    deve(scoppiato, 'ha accettato un\'attesa muta: ' + JSON.stringify(v));
  });
  deve(C.stato('Leggo la contabilità').indexOf('Leggo la contabilità') >= 0,
    'non scrive la frase che le si dà');
});

prova('I PUNTINI LI METTE IL VESTITO, NON CHI CHIAMA', () => {
  /* Tre puntini scritti a mano dentro a un maiuscoletto spaziato diventano tre
     isole: si tolgono qui, una volta, invece di ricordarsene in sessanta
     punti. */
  ['Carico i sospesi…', 'Carico i sospesi...', 'Carico i sospesi.'].forEach((s) => {
    const r = C.stato(s);
    deve(r.indexOf('Carico i sospesi<') >= 0, '«' + s + '» -> ' + r);
  });
});

prova('IL TESTO DI UN\'ATTESA NON PUÒ INIETTARE MARCATURA', () => {
  /* Le frasi di attesa portano dentro nomi di clienti e messaggi di errore
     («Carico il documento di <nome>»), e quelli arrivano dal database. */
  const r = C.stato('Carico <img src=x onerror=alert(1)> & "altro"');
  deve(r.indexOf('<img') < 0, 'la marcatura passa: ' + r);
  deve(r.indexOf('&lt;img') >= 0, 'non ha sfuggito il minore: ' + r);
  deve(r.indexOf('&amp;') >= 0, 'non ha sfuggito la e commerciale: ' + r);
  deve(r.indexOf('&quot;') >= 0, 'non ha sfuggito le virgolette: ' + r);
});

prova('L\'ESITO CHIUDE L\'ATTESA SENZA CAMBIARE RIGA', () => {
  deve(/wl-fatto/.test(C.stato('Documento pronto', 'fatto')), 'l\'esito «fatto» non si vede');
  deve(/wl-guasto/.test(C.stato('La compagnia non risponde', 'guasto')), 'l\'esito «guasto» non si vede');
  const normale = C.stato('Leggo');
  deve(!/wl-fatto|wl-guasto/.test(normale), 'un\'attesa normale si dichiara già finita: ' + normale);
});

prova('UN\'ATTESA SI DICHIARA AI LETTORI DI SCHERMO', () => {
  /* Chi non vede lo scheletro deve sentire che la pagina sta lavorando. */
  const r = C.stato('Leggo la contabilità');
  deve(/role="status"/.test(r) && /aria-live="polite"/.test(r), 'manca lo stato per i lettori di schermo: ' + r);
  /* e lo scheletro, che è solo una forma, NON va letto: sarebbe una fila di
     elementi vuoti annunciati uno per uno. */
  deve(/aria-hidden="true"/.test(C.scheletro({ righe: 3 })), 'lo scheletro si fa leggere ad alta voce');
});

prova('LO SCHELETRO NON RIEMPIE LA PAGINA', () => {
  /* Uno scheletro lungo non prepara l'occhio: lo stanca, e fa sembrare la
     pagina più lenta di quanto sia. */
  const tante = C.scheletro({ righe: 500 });
  const quante = (tante.match(/wl-scheletro/g) || []).length;
  deve(quante <= C.RIGHE_MAX, 'ha disegnato ' + quante + ' righe, il tetto è ' + C.RIGHE_MAX);
  deve(C.RIGHE_MAX <= 10, 'il tetto dichiarato è troppo alto: ' + C.RIGHE_MAX);
  /* e con un numero storto non sparisce: torna comunque una forma */
  ['due', null, -4, 0, NaN].forEach((v) => {
    deve((C.scheletro({ righe: v }).match(/wl-scheletro/g) || []).length >= 1,
      'con righe=' + JSON.stringify(v) + ' non disegna niente');
  });
});

prova('LE RIGHE DELLO SCHELETRO NON SONO TUTTE UGUALI', () => {
  /* Una pila di barre identiche legge come una tabella anche quando sta
     arrivando del testo: la forma è il messaggio, e una forma sbagliata è un
     messaggio sbagliato. */
  const r = C.scheletro({ righe: 4 });
  const larghezze = (r.match(/width:\s*([0-9]+%)/g) || []).map(String);
  deve(larghezze.length >= 4, 'le righe non dichiarano una larghezza: ' + r);
  deve(new Set(larghezze).size >= 3, 'le righe hanno tutte la stessa larghezza: ' + larghezze.join(' '));
});

prova('IL BLOCCO METTE INSIEME LE PAROLE E LA FORMA', () => {
  const b = C.blocco('Leggo i link di pagamento', { riquadri: 2, righe: 1 });
  deve(b.indexOf('Leggo i link di pagamento') >= 0, 'il blocco non dice che cosa aspetta');
  deve((b.match(/wl-riquadro/g) || []).length === 2, 'non ha disegnato due riquadri');
  /* lo stato viene PRIMA della forma: si legge, poi si guarda */
  deve(b.indexOf('wl-stato') < b.indexOf('wl-riquadro'), 'la forma viene prima delle parole');
});

prova('LA BARRA NON FINGE DI SAPERE A CHE PUNTO È', () => {
  /* Una percentuale finta è una bugia, e si vede che è finta quando resta
     ferma al 90%. La barra è indeterminata: niente `value`, niente `aria-valuenow`. */
  const b = C.barra();
  deve(/role="progressbar"/.test(b), 'la barra non si dichiara: ' + b);
  deve(!/aria-valuenow|value=/.test(b), 'la barra dichiara un avanzamento che non conosce: ' + b);
});

prova('METTERE UN\'ATTESA IN UNA SCHERMATA CHIUSA NON FA ESPLODERE NIENTE', () => {
  /* Capita sempre: i dati arrivano dopo che l'operatore ha cambiato pagina. */
  deve(C.dentro(null, '<i></i>') === false, 'con un elemento che non c\'è non torna false');
  const finto = { innerHTML: '' };
  deve(C.dentro(finto, '<i>x</i>') === true && finto.innerHTML === '<i>x</i>', 'non scrive dentro l\'elemento');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nCARICAMENTO — le fasi di attesa');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
console.log('\nCARICAMENTO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
