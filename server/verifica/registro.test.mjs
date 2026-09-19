// ═══════════════════════════════════════════════════════════════════════════════
//  IL REGISTRO DEI MOVIMENTI — tariffe/motore/registro.js  (19/09/2026)
//
//  Un registro serve a rispondere mesi dopo a «chi ha toccato questa riga».
//  Le prove qui sotto sono quelle che, se saltano, lo trasformano in qualcosa
//  che SEMBRA un registro: un movimento che punta alla riga sbagliata, due
//  fatti veri collassati in uno, un tipo sconosciuto che sparisce.
//
//  Dati inventati: nessun nome e nessun identificativo vero (regola §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = require('../../tariffe/motore/registro.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';
const M = (o) => Object.assign({ utente_id: ID2, utente_nome: 'Mario' }, o);

prova('REGOLA 1 · un identificativo che non è un identificativo non si scrive', () => {
  /* Un id sbagliato è PEGGIO di un id assente: manda ad aprire la riga di
     qualcun altro, e chi guarda non ha modo di accorgersene. */
  const ok = R.movimento(M({ azione: 'Pagamento modificato', entita: 'polizza', entita_id: ID1 }));
  deve(ok.riga.entita_id === ID1, 'un id valido non passa: ' + ok.riga.entita_id);
  deve(!ok.avvisi.length, 'un caso pulito produce avvisi: ' + JSON.stringify(ok.avvisi));

  ['pol-1', '42', 'undefined', '11111111-1111-4111-8111-11111111111', ''].forEach(x => {
    const r = R.movimento(M({ azione: 'x', entita: 'polizza', entita_id: x }));
    deve(r.riga.entita_id === null, 'è passato un id non valido: «' + x + '» → ' + r.riga.entita_id);
  });
  const rotto = R.movimento(M({ azione: 'x', entita: 'polizza', entita_id: 'pol-1' }));
  deve(/non è valido/.test(rotto.avvisi.join(' ')), 'lo scarto avviene in silenzio: ' + JSON.stringify(rotto.avvisi));
  /* Ma il movimento si registra lo stesso, senza il collegamento: perdere il
     fatto sarebbe peggio che perdere il puntatore. */
  deve(rotto.riga && rotto.riga.azione === 'x', 'il movimento è stato buttato via insieme all\'id');
  return 'id valido sì, cinque forme sbagliate no, il fatto resta';
});

prova('un identificativo senza il tipo non dice a che riga punta', () => {
  const r = R.movimento(M({ azione: 'x', entita_id: ID1 }));
  deve(r.riga.entita_id === null, 'l\'id è stato scritto senza sapere in quale tabella cercarlo');
  deve(/senza tipo/.test(r.avvisi.join(' ')), 'non lo dichiara: ' + JSON.stringify(r.avvisi));
  return 'niente tipo, niente id';
});

prova('un movimento su una cosa che non è una riga d\'archivio non porta un id', () => {
  /* «utente», «incasso», «emissione» non sono righe che si aprono: un id lì
     non punterebbe a niente di apribile, e prometterebbe un collegamento che
     non esiste. */
  const r = R.movimento(M({ azione: 'Orari aggiornati', entita: 'utente', entita_id: ID1 }));
  deve(r.riga.entita_id === null, 'un id su «utente» è stato scritto: ' + r.riga.entita_id);
  deve(/non è una riga di archivio/.test(r.avvisi.join(' ')), 'motivo assente: ' + JSON.stringify(r.avvisi));
  /* E il tipo resta scritto: è un'informazione vera. */
  deve(r.riga.entita === 'utente', 'il tipo è stato buttato insieme all\'id');
  return 'tipo sì, id no';
});

prova('un movimento senza azione non si registra', () => {
  const r = R.movimento(M({ entita: 'polizza', entita_id: ID1 }));
  deve(r.riga === null, 'è stata scritta una riga che dice solo «è successo qualcosa»');
  deve(r.avvisi.length === 1, 'non dice perché: ' + JSON.stringify(r.avvisi));
  return 'niente azione, niente riga';
});

prova('REGOLA 3 · un tipo fuori vocabolario si vede, non sparisce', () => {
  /* Nelle 230 righe già scritte ce n'è una con `entita` = il nome di una
     tabella: è un refuso a un punto di chiamata. Deve VEDERSI. */
  const e = R.etichetta('quote_quotazioni_esiti');
  deve(e.noto === false, 'un tipo inventato risulta conosciuto');
  deve(e.l === 'quote_quotazioni_esiti', 'il valore vero non si mostra: ' + e.l);
  deve(e.i === null && e.tabella === null, 'a un tipo sconosciuto viene data un\'icona o una tabella');
  /* E il movimento si scrive lo stesso, con l'avviso. */
  const m = R.movimento(M({ azione: 'x', entita: 'quote_quotazioni_esiti' }));
  deve(m.riga.entita === 'quote_quotazioni_esiti', 'il tipo sconosciuto è stato cancellato');
  deve(/fuori vocabolario/.test(m.avvisi.join(' ')), 'non lo dichiara');
  return 'si vede com\'è scritto, con l\'avviso';
});

prova('il vocabolario non rinomina lo storico', () => {
  /* I nomi sono quelli che stanno GIÀ nelle righe scritte: `cliente` (65),
     `preventivo` (126), `emissione` (13), `utente`, `ticket`, `documento`,
     `polizza`, `trattativa`. Rinominarli vorrebbe dire riscrivere lo storico
     o tenere due vocabolari, e uno dei due sarebbe quello che nessuno guarda. */
  ['cliente', 'preventivo', 'emissione', 'utente', 'ticket', 'documento', 'polizza', 'trattativa']
    .forEach(k => deve(R.VOCI[k], 'è sparito dal vocabolario un tipo che sta nei dati: ' + k));
  /* Le righe d'archivio sanno dire dove vivono: serve ad aprirle e a scrivere
     le politiche di visibilità. */
  deve(R.VOCI.polizza.tabella === 'quote_polizze' && R.VOCI.cliente.tabella === 'quote_anagrafiche',
    'una voce non sa in quale tabella vive');
  deve(R.VOCI.utente.tabella === null && R.VOCI.incasso.tabella === null,
    'a un movimento che non punta a una riga è stata data una tabella');
  return '8 nomi dello storico + i nuovi, con la loro tabella';
});

prova('LA DOMANDA · chi ha toccato QUESTA riga', () => {
  const righe = [
    { azione: 'Creata', entita: 'polizza', entita_id: ID1, creato_il: '2026-09-01T10:00:00Z', utente_nome: 'Anna' },
    { azione: 'Pagamento', entita: 'polizza', entita_id: ID1, creato_il: '2026-09-03T11:00:00Z', utente_nome: 'Mario' },
    { azione: 'Pagamento', entita: 'polizza', entita_id: ID2, creato_il: '2026-09-04T11:00:00Z', utente_nome: 'Luca' },
    /* Stesso identificativo, ALTRA tabella: non è la stessa cosa. */
    { azione: 'Creata', entita: 'pratica', entita_id: ID1, creato_il: '2026-09-02T09:00:00Z', utente_nome: 'Giulia' },
    { azione: 'Login', entita: null, entita_id: null, creato_il: '2026-09-05T08:00:00Z', utente_nome: 'Anna' }
  ];
  const s = R.storia(righe, { entita: 'polizza', entita_id: ID1 });
  deve(s.length === 2, 'movimenti della polizza: ' + s.length + ' (attesi 2)');
  deve(s[0].utente_nome === 'Mario', 'non è in ordine, dal più recente: ' + s[0].utente_nome);
  deve(!s.some(x => x.entita === 'pratica'), 'una pratica con lo stesso id è finita nella storia della polizza');
  /* Senza uno dei due non si può rispondere, e non si tira a indovinare. */
  deve(R.storia(righe, { entita: 'polizza' }).length === 0, 'senza id torna comunque qualcosa');
  deve(R.storia(righe, { entita_id: ID1 }).length === 0, 'senza tipo torna comunque qualcosa');
  return '2 movimenti, il più recente in cima';
});

prova('REGOLA 2 · due movimenti veri non diventano uno', () => {
  /* La regola di prima buttava via una riga se un'altra aveva stessa azione,
     stesso nome, stesso dettaglio e stesso MINUTO. Due incassi identici di
     fila — che in agenzia succede — diventavano uno, e il registro raccontava
     meno di quello che era successo. Il registro è una prova: non si tocca. */
  const reg = [
    { azione: 'Incasso', entita: 'titolo', entita_id: ID1, creato_il: '2026-09-01T10:00:10Z', utente_nome: 'Anna', dettaglio: '110,00' },
    { azione: 'Incasso', entita: 'titolo', entita_id: ID2, creato_il: '2026-09-01T10:00:40Z', utente_nome: 'Anna', dettaglio: '110,00' }
  ];
  const u = R.unisci(reg, []);
  deve(u.length === 2, 'due incassi veri nello stesso minuto sono diventati ' + u.length);

  /* E il caso che la vecchia regola sbagliava davvero: due movimenti del
     registro IDENTICI in tutto — stessa azione, stesso dettaglio, stesso
     minuto — e senza identificativo, come sono tutte le righe scritte prima
     del 19/09/2026. Sono due fatti, e il registro e' la prova che sono
     successi tutti e due. */
  const gemelli = [
    { azione: 'Documento caricato', entita: 'documento', entita_id: null, creato_il: '2026-09-01T10:00:05Z', utente_nome: 'Anna', dettaglio: 'patente' },
    { azione: 'Documento caricato', entita: 'documento', entita_id: null, creato_il: '2026-09-01T10:00:35Z', utente_nome: 'Anna', dettaglio: 'patente' }
  ];
  deve(R.unisci(gemelli, []).length === 2,
    'due movimenti identici del registro sono stati fusi: il registro ha smesso di essere una prova');
  /* Ma un DERIVATO che ripete uno di quei due si scarta lo stesso. */
  deve(R.unisci(gemelli, [gemelli[0]]).length === 2, 'un derivato doppione e\' entrato');
  return '2 incassi restano 2, 2 gemelli restano 2, il derivato no';
});

prova('una riga derivata non raddoppia un fatto che il registro ha già', () => {
  const reg = [{ azione: 'Nuovo preventivo', entita: 'preventivo', entita_id: ID1, creato_il: '2026-09-01T10:00:10Z', utente_nome: 'Anna' }];
  const derivate = [
    /* lo STESSO fatto, ricostruito dalla tabella dei preventivi */
    { azione: 'Nuovo preventivo', entita: 'preventivo', entita_id: ID1, creato_il: '2026-09-01T10:00:50Z', utente_nome: 'Anna' },
    /* un fatto che il registro non ha: deve entrare */
    { azione: 'Polizza emessa', entita: 'polizza', entita_id: ID2, creato_il: '2026-09-02T10:00:00Z', utente_nome: 'Anna' }
  ];
  const u = R.unisci(reg, derivate);
  deve(u.length === 2, 'righe unite: ' + u.length + ' (attese 2: il doppione fuori, il fatto nuovo dentro)');
  deve(u[0].azione === 'Polizza emessa', 'non è in ordine, dal più recente: ' + u[0].azione);
  deve(u.some(x => x.azione === 'Nuovo preventivo'), 'è sparito il fatto che il registro aveva');
  return '1 doppione scartato, 1 fatto nuovo tenuto';
});

prova('sulle righe vecchie, senza identificativo, si ripiega sul dettaglio', () => {
  /* Le 230 righe già scritte non hanno `entita_id` e non si possono
     agganciare a niente: il confronto deve continuare a funzionare, con
     quello che c'è. */
  const reg = [{ azione: 'Nuovo preventivo', entita: 'preventivo', entita_id: null, creato_il: '2026-09-01T10:00:10Z', dettaglio: 'RC Auto · Rossi' }];
  const der = [
    { azione: 'Nuovo preventivo', entita: 'preventivo', entita_id: null, creato_il: '2026-09-01T10:00:50Z', dettaglio: 'RC Auto · Rossi' },
    { azione: 'Nuovo preventivo', entita: 'preventivo', entita_id: null, creato_il: '2026-09-01T10:00:50Z', dettaglio: 'Casa · Verdi' }
  ];
  const u = R.unisci(reg, der);
  deve(u.length === 2, 'righe unite: ' + u.length + ' (il doppione fuori, l\'altro cliente dentro)');
  deve(u.some(x => /Verdi/.test(x.dettaglio || '')), 'un preventivo di un altro cliente è stato scambiato per un doppione');
  return 'il doppione via, l\'altro cliente resta';
});

prova('un identificativo NON basta a unire: conta anche il tipo', () => {
  /* Se il confronto guardasse solo l'id, il movimento di una pratica
     cancellerebbe quello di una polizza che per caso ha lo stesso
     identificativo. */
  const a = { azione: 'Creata', entita: 'polizza', entita_id: ID1, creato_il: '2026-09-01T10:00:00Z' };
  const b = { azione: 'Creata', entita: 'pratica', entita_id: ID1, creato_il: '2026-09-01T10:00:30Z' };
  deve(R.chiaveFatto(a) !== R.chiaveFatto(b), 'due tipi diversi con lo stesso id hanno la stessa chiave');
  deve(R.unisci([a], [b]).length === 2, 'un movimento di un\'altra tabella è stato scartato come doppione');
  return 'tipo + id, non solo id';
});

prova('la copertura si misura solo su quello che PUÒ avere un identificativo', () => {
  /* Un movimento su «utente» o su «incasso» non punta a una riga: contarlo
     fra quelli «senza id» direbbe che il registro è messo peggio di com'è, e
     un numero che mente non lo guarda più nessuno. */
  const righe = [
    { entita: 'polizza', entita_id: ID1 },
    { entita: 'polizza', entita_id: null },
    { entita: 'utente', entita_id: null },        // non fa testo
    { entita: 'incasso', entita_id: null },       // non fa testo
    { entita: 'quote_boh', entita_id: null },     // fuori vocabolario: non fa testo
    { entita: null, entita_id: null }             // niente tipo: non fa testo
  ];
  const c = R.copertura(righe);
  deve(c.possibili === 2 && c.con === 1, 'copertura: ' + JSON.stringify(c));
  deve(c.quota === 50, 'quota: ' + c.quota);
  deve(R.copertura([]).quota === null, 'su zero righe inventa una percentuale');
  return '1 su 2 (50%), e gli altri quattro non fanno testo';
});

console.log('\n══ REGISTRO DEI MOVIMENTI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nREGISTRO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
