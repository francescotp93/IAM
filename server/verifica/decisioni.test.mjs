// ═══════════════════════════════════════════════════════════════════════════════
//  LE DECISIONI APERTE — tariffe/motore/decisioni.js  (21/09/2026)
//
//  Le prove che, saltando, producono la cosa peggiore che una schermata di
//  riepilogo possa produrre: un «tutto a posto» che non è vero. Una voce mezza
//  fatta contata come fatta, una lettura fallita contata come decisa, e un
//  elenco che non dice che cosa si rompe.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const D = require('../../tariffe/motore/decisioni.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('ogni voce dice CHE COSA RESTA SPENTO, non solo che cosa manca', () => {
  /* La regola che fa funzionare l'elenco: un elenco di cose da fare che non
     dice che cosa si rompe non lo guarda nessuno due volte. È la lezione
     delle anomalie della M5 (§33, «le anomalie hanno il verbo») applicata
     alle decisioni invece che ai guasti. */
  deve(D.VOCI.length >= 10, 'le voci dichiarate sono meno di dieci: ' + D.VOCI.length);
  for (const v of D.VOCI) {
    deve(v.k && v.titolo, 'una voce senza chiave o titolo');
    deve(v.blocca && v.blocca.length > 40, 'la voce «' + v.k + '» non dice che cosa resta spento');
    deve(v.perche && v.perche.length > 40, 'la voce «' + v.k + '» non dice perché il sistema non indovina');
    deve(v.dove, 'la voce «' + v.k + '» non dice dove si decide');
    deve(v.chi === 'admin' || v.chi === 'staff', 'la voce «' + v.k + '» non dice chi può deciderla');
  }
  return D.VOCI.length + ' voci, ognuna col suo verbo';
});

prova('UNA DECISIONE PRESA A METÀ NON È FATTA', () => {
  /* Il caso vero del 21/09/2026: un conto su tre dichiara i suoi mezzi. La
     metà mancante è esattamente quella che un giorno manderà un incasso sul
     conto sbagliato, e contarla come fatta la renderebbe invisibile. */
  const v = D.VOCI[0];
  deve(D.valuta(v, { fatte: 1, su: 3 }).stato === 'parziale', 'uno su tre risulta deciso');
  deve(D.valuta(v, { fatte: 3, su: 3 }).stato === 'fatta', 'tre su tre non risulta deciso');
  deve(D.valuta(v, { fatte: 0, su: 3 }).stato === 'aperta', 'zero su tre non risulta da decidere');
  return '1/3 a metà, 3/3 deciso';
});

prova('«NON SI È POTUTO LEGGERE» NON È «È DECISO»', () => {
  /* Su una schermata che riassume lo stato di tutto, è la bugia peggiore che
     ci sia: si smette di cercare proprio dove c'è il buco (§12, §18). */
  const v = D.VOCI[0];
  const r = D.valuta(v, null);
  deve(r.stato === 'ignoto', 'una lettura fallita diventa uno stato buono: ' + r.stato);
  deve(r.fatte === null && r.su === null, 'una lettura fallita produce dei numeri');
  deve(/non vuol dire che sia deciso/i.test(r.motivo || ''), 'non lo dice in faccia: ' + r.motivo);
  /* E numeri illeggibili sono la stessa cosa di una lettura mancata. */
  deve(D.valuta(v, { fatte: 'boh', su: 3 }).stato === 'ignoto', 'un numero illeggibile passa per deciso');
  return 'ignoto, e con la frase giusta';
});

prova('una voce senza niente sotto NON è una decisione aperta', () => {
  /* Se non ci sono rate da assegnare, «assegna le rate» non va messo in un
     elenco di cose da fare: un elenco che contiene voci senza oggetto si
     impara a saltare per intero. */
  const v = D.VOCI[0];
  deve(D.valuta(v, { su: 0, fatte: 0 }).stato === 'inerte', 'una voce vuota risulta da decidere');
  deve(D.valuta(v, { inerte: true }).stato === 'inerte', 'una voce dichiarata inerte non lo è');
  const voci = D.elenco({ conti_mezzi: { su: 0, fatte: 0 } });
  const r = D.riepilogo(voci);
  deve(!voci.find(x => x.k === 'conti_mezzi' && x.stato === 'aperta'), 'la voce vuota è fra le aperte');
  return 'inerte, e fuori dalle aperte';
});

prova('«TUTTO DECISO» si può dire solo se si è potuto guardare dappertutto', () => {
  /* Il conteggio che dice «hai finito» non può comprendere dei forse: è lo
     stesso difetto del riepilogo dei collegamenti, e qui è peggio. */
  const tutte = {};
  D.VOCI.forEach(v => { tutte[v.k] = { fatte: 2, su: 2 }; });
  deve(D.riepilogo(D.elenco(tutte)).tutto_deciso === true, 'tutto deciso non risulta deciso');

  const unaCieca = Object.assign({}, tutte);
  unaCieca[D.VOCI[3].k] = null;
  const r = D.riepilogo(D.elenco(unaCieca));
  deve(r.tutto_deciso === false, 'con una voce non letta dice lo stesso «tutto deciso»');
  deve(r.ignote === 1, 'la voce non letta non si conta a parte');
  /* E non entra fra quelle da decidere: sarebbe un numero che contiene un forse. */
  deve(r.da_decidere === 0, 'la voce non letta è finita fra i lavori da fare: ' + r.da_decidere);
  return 'una cieca su dieci, e il verde non arriva';
});

prova('l’ordine è quanto COSTA non decidere, non l’alfabeto', () => {
  /* Chi apre questa schermata la apre per la prima riga. */
  const d = {};
  D.VOCI.forEach(v => { d[v.k] = { fatte: 2, su: 2 }; });
  d[D.VOCI[5].k] = { fatte: 0, su: 9 };   /* aperta, tanta roba */
  d[D.VOCI[2].k] = { fatte: 1, su: 3 };   /* a metà */
  d[D.VOCI[7].k] = null;                  /* non letta */
  d[D.VOCI[9].k] = { su: 0, fatte: 0 };   /* inerte */
  const e = D.elenco(d);
  deve(e[0].k === D.VOCI[5].k, 'in cima non c’è la voce aperta: ' + e[0].k);
  deve(e[1].k === D.VOCI[2].k, 'la voce a metà non è seconda: ' + e[1].k);
  deve(e[2].k === D.VOCI[7].k, 'la voce non letta non è terza: ' + e[2].k);
  deve(e[e.length - 1].stato === 'fatta', 'in fondo non ci sono quelle a posto');
  return 'aperta, a metà, non letta, inerte, fatta';
});

prova('a parità di stato viene prima chi ha più cose da decidere', () => {
  const d = {};
  D.VOCI.forEach(v => { d[v.k] = { fatte: 1, su: 1 }; });
  d[D.VOCI[1].k] = { fatte: 0, su: 2 };
  d[D.VOCI[4].k] = { fatte: 0, su: 17 };
  const e = D.elenco(d);
  deve(e[0].k === D.VOCI[4].k, 'la voce con diciassette cose da decidere non viene prima: ' + e[0].k);
  return '17 prima di 2';
});

prova('LE PROVE SONO MISURE, NON VALORI DA ACCETTARE', () => {
  /* La differenza è tutta qui: «l'ultimo foglio cassa dice 276,00 €» si può
     controllare e smentire; un campo precompilato con 276,00 diventa il fondo
     cassa vero dopo due settimane, e nessuno saprà che l'aveva scritto un
     programma (§8.1). */
  const p = D.proveCassa({ data: '2026-09-16', fondo_cassa: 276 });
  deve(p.length === 1, 'la prova del fondo cassa non esce');
  deve(/276,00/.test(p[0].testo), 'la misura non si legge: ' + p[0].testo);
  deve(/non un valore da accettare/.test(p[0].testo), 'la prova si presenta come un valore da scrivere');
  /* E senza la misura non si inventa niente. */
  deve(D.proveCassa(null).length === 0, 'senza foglio cassa esce una prova lo stesso');
  deve(D.proveCassa({ data: '2026-09-16', fondo_cassa: null }).length === 0, 'un fondo non dichiarato produce una prova');
  return 'una misura datata, e silenzio quando non c’è';
});

prova('un mezzo che nessun conto riceve è una prova GRAVE, e due conti pure', () => {
  /* Il caso vero del 21/09/2026: `carta_credito` è il mezzo di quattro rate e
     nessuno dei tre conti la dichiara. */
  const conti = [{ id: 'a', mezzi: ['contanti', 'pos', 'bonifico'] }, { id: 'b', mezzi: [] }];
  const p = D.proveMezzi(conti, { carta_credito: 4, bonifico: 2, '(non dichiarato)': 49 });
  deve(p.length === 1, 'le prove sui mezzi non sono una: ' + JSON.stringify(p));
  deve(/carta_credito/.test(p[0].testo) && /4 rate/.test(p[0].testo), 'la prova non porta il numero: ' + p[0].testo);
  deve(p[0].grave === true, 'un mezzo scoperto non è grave');
  /* «(non dichiarato)» non è un mezzo: cercargli un conto non ha senso. */
  deve(!p.some(x => /non dichiarato/.test(x.testo)), 'il mezzo mancante viene trattato come un mezzo');
  /* Due conti che dichiarano lo stesso mezzo: il sistema non sceglie, e lo dice. */
  const doppi = D.proveMezzi([{ id: 'a', mezzi: ['pos'] }, { id: 'b', mezzi: ['pos'] }], { pos: 3 });
  deve(doppi.length === 1 && /più di un conto/.test(doppi[0].testo), 'due conti sullo stesso mezzo non si segnalano');
  return '1 scoperto, 1 ambiguo, e il non dichiarato fuori';
});

prova('un conto spento non copre niente', () => {
  /* Un conto disattivato esce dalle tendine (§26): contarlo fra quelli che
     ricevono un mezzo vorrebbe dire dire che quel mezzo è coperto da un conto
     che nessuno può scegliere. */
  const p = D.proveMezzi([{ id: 'a', mezzi: ['pos'], attivo: false }], { pos: 3 });
  deve(p.length === 1 && p[0].grave, 'un conto spento risulta coprire il mezzo');
  return 'spento = scoperto';
});

console.log('\n══ LE DECISIONI APERTE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nDECISIONI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
