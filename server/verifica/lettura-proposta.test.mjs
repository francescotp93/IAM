// ═══════════════════════════════════════════════════════════════════════════════
//  LEGGERE UNA PROPOSTA DI POLIZZA
//
//  02/10/2026. Si carica il documento della compagnia e il motore PROPONE le
//  righe di garanzia: nome, importo, pagina. Non dice «la polizza ha queste
//  garanzie»: dice «a pagina 44 c'è questa riga e mi sembra Eventi naturali».
//
//  LE RIGHE DI PROVA SONO QUELLE VERE, copiate da un set informativo auto di
//  61 pagine letto il 02/10/2026. Non sono pulite: sono tabelle che
//  l'estrattore di testo ha appiattito, col nome della garanzia spezzato su
//  una riga diversa dall'importo.
//
//      «Eventi Franchigia Franchigia Franchigia»
//      «naturali 1.000,00 € 500,00 € 300,00 €»
//
//  Una prova con righe pulite e inventate direbbe che tutto funziona, e
//  funzionerebbe su niente: su quel documento le righe pulite sono ZERO.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const require = createRequire(import.meta.url);
const L = require(path.join(RADICE, 'tariffe', 'motore', 'lettura-proposta.js'));
const C = require(path.join(RADICE, 'tariffe', 'motore', 'confronto.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Pagine 38, 43 e 44 del documento vero, verbatim. Le tabelle sono già
   appiattite così dall'estrattore: è quello che arriva al motore. */
const P38 = { n: 38, testo: [
  'AREA 2) CT / VV / ROMA / BR / AV / SA / KR / ME / SR / RG / EN / TP / PA / MI / TO / AL / AS',
  'AREA 3) LE RIMANENTI PROVINCE',
  'area 1 area 2 area 3',
  'Guasti Franchigia Franchigia Franchigia',
  'cagionati 2.000,00 € 1.000,00 € 500,00 €',
  'dai ladri',
].join('\n') };
const P43 = { n: 43, testo: [
  'area 1 area 2 area 3',
  'Atti vandalici ed Franchigia Franchigia Franchigia',
  'eventi socio politici 1.000,00 € 500,00 € 300,00 €',
  'SET INFORMATIVO AUTO - CONDIZIONI DI ASSICURAZIONE pag. 27 di 34',
].join('\n') };
const P44 = { n: 44, testo: [
  'area 1 area 2 area 3',
  'Eventi Franchigia Franchigia Franchigia',
  'naturali 1.000,00 € 500,00 € 300,00 €',
  'SET INFORMATIVO AUTO - CONDIZIONI DI ASSICURAZIONE pag. 28 di 34',
].join('\n') };
const P40 = { n: 40, testo: [
  'La garanzia è prestata con il limite massimo di 100,00 € per ogni sinistro, dietro',
  'presentazione di regolare fattura delle spese sostenute.',
  'concorrenza di 500,00 € per ogni sinistro e per anno assicurativo.',
].join('\n') };

const VERE = [P38, P40, P43, P44];
const r = L.candidati(VERE, { rami: ['auto'] });
const per = (f) => r.righe.find(x => new RegExp(f, 'i').test(x.nome));

// ── 1. le tabelle appiattite si ricuciscono ──────────────────────────────────

prova('IL NOME SPEZZATO SULLA RIGA SOPRA si ricuce: «naturali» → «Eventi naturali»', () => {
  /* La riga sopra è «Eventi Franchigia Franchigia Franchigia»: il nome apre
     quella riga, e il resto sono le etichette di colonna. Cercando solo in
     coda si prendeva «Franchigia naturali», che non è niente. */
  const x = per('eventi naturali');
  deve(x, 'non trovata: ' + r.righe.map(y => y.nome).join(' / '));
  deve(x.id === 'eventi_naturali', 'riconosciuta come: ' + x.id);
  deve(x.ricucito === true, 'non dichiara di aver ricucito il nome');
  deve(x.pagina === 44, 'pagina: ' + x.pagina);
});

prova('e anche quello spezzato sulla riga SOTTO: «Guasti cagionati» + «dai ladri»', () => {
  /* Tre righe: il nome comincia sopra, l'importo sta in mezzo e il nome
     finisce sotto. Guardando solo all'indietro restava «Guasti cagionati»,
     che non è una garanzia. */
  const x = per('guasti cagionati dai ladri');
  deve(x, 'non trovata: ' + r.righe.map(y => y.nome).join(' / '));
  deve(x.id === 'guasti_ladri', 'riconosciuta come: ' + x.id);
  deve(x.pagina === 38, 'pagina: ' + x.pagina);
});

prova('gli atti vandalici si ricuciscono anche con la «ed» di mezzo', () => {
  const x = per('atti vandalici');
  deve(x && x.id === 'eventi_sociopolitici', 'riconosciuta come: ' + (x && x.id));
});

prova('tutte e tre le garanzie del documento vero escono', () => {
  deve(r.ok, r.motivo);
  deve(r.righe.length === 3, 'righe: ' + r.righe.length + ' — ' + r.righe.map(x => x.nome).join(' / '));
  deve(r.righe.every(x => x.id), 'qualcuna non si riconosce: ' + r.righe.map(x => x.id).join(','));
});

// ── 2. che cosa sono quei numeri ─────────────────────────────────────────────

prova('L\'INTESTAZIONE DICE CHE SONO FRANCHIGIE, non massimali', () => {
  /* La riga sopra dice «Franchigia Franchigia Franchigia». La riga coi numeri,
     da sola, non lo direbbe mai — e tre franchigie scambiate per tre massimali
     su un foglio al cliente sono il contrario di quello che la polizza fa. */
  deve(r.righe.every(x => x.natura === 'franchigia'),
    'nature lette: ' + r.righe.map(x => x.nome + '=' + x.natura).join(' / '));
});

prova('e un\'intestazione che dice tutt\'e due le cose non si interpreta', () => {
  /* Se sopra c'è scritto sia «massimale» sia «franchigia» non si sa quale
     numero sia quale: indovinare è peggio che non dire niente. */
  const v = L.candidati([{ n: 1, testo: 'Garanzia Massimale Franchigia\nCristalli 500,00 € 50,00 €' }], { rami: ['auto'] });
  deve(v.righe.length === 1, JSON.stringify(v.righe));
  deve(v.righe[0].natura === null, 'ha deciso che sono «' + v.righe[0].natura + '»');
});

prova('tre importi su una riga si dichiarano come tabella appiattita', () => {
  const x = per('eventi naturali');
  deve(x.voci.length === 3, 'importi letti: ' + x.voci.length);
  deve(x.voci.map(v => v.valore).join('/') === '1000/500/300', x.voci.map(v => v.valore).join('/'));
  deve(/tabella/i.test(x.daGuardare || ''), 'non avverte che è una tabella: ' + x.daGuardare);
  deve(/franchigia/i.test(x.daGuardare || ''), 'non dice che sono franchigie: ' + x.daGuardare);
});

// ── 3. quello che NON deve entrare ───────────────────────────────────────────

prova('la prosa del contratto con dentro una cifra non diventa una garanzia', () => {
  /* «La garanzia è prestata con il limite massimo di 100,00 € per ogni
     sinistro» e «concorrenza di 500,00 €» sono frasi, non garanzie.
     Proporle riempirebbe l'elenco di roba da buttare — e un elenco che
     nessuno guarda è il modo più sicuro di far passare un errore vero. */
  deve(!r.righe.some(x => /limite massimo|concorrenza/i.test(x.nome)),
    'è entrata una frase: ' + r.righe.map(x => x.nome).join(' / '));
  deve(r.scartate.length >= 2, 'scartate: ' + r.scartate.length);
  deve(r.scartate.every(x => x.perche), 'una riga scartata senza motivo');
  /* E la frase lunga che NON finisce con una preposizione: senza una riga
     cosi', la regola sulla lunghezza non la provava nessuno — l'ha detto la
     controprova. Questa e' testo vero di pagina 8. */
  const v = L.candidati([{ n: 8, testo:
    'In caso di sinistro la Societa corrisponde all\'assicurato l\'indennizzo con deduzione '
    + 'dello scoperto per le aree territoriali € 1.000,00' }], { rami: ['auto'] });
  deve(v.righe.length === 0, 'ha proposto una frase come garanzia: ' + JSON.stringify(v.righe.map(x => x.nome)));
  deve(v.scartate.some(x => /frase del contratto/i.test(x.perche)),
    'non dice che e\' una frase: ' + JSON.stringify(v.scartate.map(x => x.perche)));
});

prova('ma quello che si scarta si DICE, non sparisce in silenzio', () => {
  /* Una riga buttata via senza dirlo è una garanzia che sparisce dal
     preventivo e nessuno lo sa mai. */
  deve(r.scartate.every(x => x.pagina != null && x.riga), JSON.stringify(r.scartate));
  deve(r.scartate.some(x => /frase/i.test(x.perche)), JSON.stringify(r.scartate.map(x => x.perche)));
});

prova('le righe senza nessun importo non si guardano nemmeno', () => {
  const v = L.candidati([{ n: 1, testo: 'Cristalli\nFurto e incendio\nTutela legale' }], { rami: ['auto'] });
  deve(v.righe.length === 0, 'ha proposto righe senza importo: ' + JSON.stringify(v.righe));
  deve(!v.ok && /nessuna riga/i.test(v.motivo), v.motivo);
  /* E non devono nemmeno finire fra le scartate: una riga senza importo non e'
     una garanzia mancata, e metterla nell'elenco degli scarti lo riempirebbe
     di righe che non c'entrano niente — su un documento di 61 pagine, migliaia.
     Senza questa riga la prova restava verde anche togliendo il filtro, perche'
     le righe finivano fra gli scarti invece che fra le proposte. */
  deve(v.scartate.length === 0, 'le righe senza importo sono finite fra gli scarti: ' + v.scartate.length);
});

prova('L\'EURO STA PRIMA O DOPO IL NUMERO, e si leggono tutt\'e due', () => {
  /* Il difetto piu' grosso di questo motore, trovato il 02/10/2026 misurando
     sul documento vero: «€ 1.000,00» compare 79 volte, «1.000,00 €» due.
     Leggendo solo la seconda forma si perdevano i massimali della RCA —
     € 7.290.000, € 6.070.000, € 1.220.000 — cioe' i numeri piu' importanti
     del documento. Le righe candidate sono passate da 3 a 47. */
  const v = L.candidati([{ n: 4, testo:
    'Massimale unico\nResponsabilita civile auto € 7.290.000\nGaranzia accessoria 1.500,00 €' }],
    { rami: ['auto'] });
  const rca = v.righe.find(x => x.id === 'rca');
  deve(rca, 'la RCA con l\'euro davanti non si legge: ' + JSON.stringify(v.righe.map(x => x.nome)));
  deve(rca.voci[0].valore === 7290000, 'importo letto: ' + rca.voci[0].valore);
  deve(!/€/.test(rca.nome), 'il simbolo dell\'euro e\' rimasto attaccato al nome: «' + rca.nome + '»');
  deve(v.righe.some(x => x.voci[0].valore === 1500), 'la forma con l\'euro dopo non si legge piu\'');
});

prova('le proposte piu\' affidabili stanno in cima', () => {
  /* Su un documento vero escono decine di candidati: se le righe buone non
     stanno in cima, l'elenco non lo legge nessuno — e un elenco che nessuno
     legge e' il modo piu' sicuro di far passare un errore. */
  const v = L.candidati([{ n: 1, testo:
    'Garanzia Cristalli prestata con massimale per sinistro € 500,00\n'
    + 'Furto € 1.000,00' }], { rami: ['auto'] });
  deve(v.righe.length === 2, 'proposte: ' + v.righe.length + ' — ' + JSON.stringify(v.righe.map(x => x.nome)));
  deve(v.righe[0].nome === 'Furto',
    'in cima c\'e\' «' + v.righe[0].nome + '» invece della riga pulita');
  deve(v.righe[0].fiducia > v.righe[1].fiducia, 'la fiducia non ordina niente');

  /* E una garanzia RICONOSCIUTA batte una sconosciuta anche col nome piu'
     lungo: e' la cosa che pesa di piu' nell'ordine, perche' una riga
     riconosciuta e' una riga di cui ci si puo' fidare. Senza questa prova,
     togliere il peso del riconoscimento non rompeva niente — l'ha detto la
     controprova. */
  const w = L.candidati([{ n: 1, testo:
    'Garanzia Cristalli prestata con massimale per sinistro \u20ac 500,00\nPincopallo \u20ac 100,00' }],
    { rami: ['auto'] });
  deve(w.righe.length === 2, 'proposte: ' + JSON.stringify(w.righe.map(x => x.nome)));
  deve(w.righe[0].id === 'cristalli',
    'in cima c\'e\' la riga sconosciuta \u00ab' + w.righe[0].nome + '\u00bb invece di quella riconosciuta');
});

prova('un documento senza niente di leggibile lo dichiara, e spiega', () => {
  const v = L.candidati([{ n: 1, testo: 'Gentile cliente, la ringraziamo per la fiducia.' }], { rami: ['auto'] });
  deve(!v.ok, 'ha detto di aver letto delle garanzie');
  deve(/set informativo|a mano/i.test(v.motivo), 'non spiega che si può scrivere a mano: ' + v.motivo);
});

// ── 4. ogni riga porta da dove viene, e dove va ──────────────────────────────

prova('ogni riga proposta porta la pagina e il testo originale', () => {
  deve(r.righe.every(x => x.pagina != null), 'una riga senza pagina');
  deve(r.righe.every(x => x.riga && /€/.test(x.riga)), 'una riga senza il testo da cui viene');
});

prova('ogni riga ricucita lo dichiara, perché è un\'ipotesi', () => {
  /* Ricucire è la cosa più utile e la più pericolosa di questo motore:
     attacca due righe che il documento teneva separate. Chi guarda deve
     sapere quali righe sono state messe insieme da me. */
  const rc = r.righe.filter(x => x.ricucito);
  deve(rc.length === 3, 'ricucite: ' + rc.length + ' su 3');
  deve(rc.every(x => /ricucito|tabella/i.test(x.daGuardare || '')),
    'una ricucitura non si dichiara: ' + JSON.stringify(rc.map(x => x.daGuardare)));
});

prova('le righe scelte diventano descrizioni che la guida sa già leggere', () => {
  /* Non si inventa un secondo formato: escono come le scriverebbe una
     persona, ed è quello che la guida alle garanzie legge già. */
  const d = L.versoDescrizioni(r.righe);
  deve(d.length === 3, 'descrizioni: ' + d.length);
  deve(d.some(t => /^Eventi naturali 1\.000 €/.test(t)), JSON.stringify(d));
  const G = require(path.join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js'));
  const g = G.guida(d, { rami: ['auto'] });
  deve(g.ok, 'la guida non sa leggere quello che il lettore produce: ' + g.motivo);
  deve(g.schede === 3, 'schede nella guida: ' + g.schede);
});

prova('la garanzia trovata oggi è entrata nel vocabolario', () => {
  /* «Guasti cagionati dai ladri» è una riga a sé nei documenti veri, con una
     franchigia sua. Tenerla dentro «Furto» vorrebbe dire contare una riga
     dove la compagnia ne dichiara due. */
  deve(C.normalizzaFra(['auto'], 'Guasti cagionati dai ladri') === 'guasti_ladri', 'auto');
  deve(C.normalizzaFra(['casa'], 'Guasti cagionati dai ladri') === 'guasti_ladri_casa', 'casa');
  deve(C.normalizzaFra(['auto'], 'Furto') === 'furto', 'il furto semplice è un\'altra cosa');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nLETTURA DELLA PROPOSTA DI POLIZZA');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nLETTURA PROPOSTA: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
