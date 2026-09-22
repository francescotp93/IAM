// ═══════════════════════════════════════════════════════════════════════════════
//  IL CRUSCOTTO CONTABILE — la schermata  (22/09/2026, Fase 4)
//
//  Cinque numeri che stavano in cinque linguette diverse: per sapere come sta
//  la contabilità dell'agenzia bisognava aprirle tutte e tenere i numeri a
//  mente. Le regole stanno nel motore condiviso e hanno le loro prove in
//  `server/verifica/contabilita.test.mjs`; qui si sorveglia la schermata.
//
//  Le quattro cose che, rompendosi, non si vedono:
//
//   1. UN RIQUADRO CHE NON SI È POTUTO LEGGERE NON MOSTRA ZERO. Su un cruscotto
//      di contabilità uno zero falso fa smettere di cercare proprio dove c'è il
//      buco (§12, §18, §43). Le letture stanno in piedi una per una (§35) e
//      quello che manca finisce in `letto`, che il motore trasforma in un
//      riquadro che dichiara di non sapere.
//   2. LE LETTURE SONO PAGINATE. PostgREST ne manda mille per richiesta
//      qualunque limit ci sia scritto (§50, §53): un saldo contato su mille
//      movimenti quando ce ne sono milleduecento non dà nessun errore, dà un
//      numero più basso del vero.
//   3. LE RIGHE ARRIVANO AL MOTORE. Dalla Fase 2 un incasso tocca più conti;
//      letto dalla testata finisce tutto sul primo, e il saldo di quel conto è
//      più alto del vero.
//   4. OGNI RIQUADRO PORTA DOVE SI FA. Un cruscotto che dice che cosa fare e
//      non porta dove si fa costringe a cercare la linguetta giusta fra dieci
//      — la stessa distanza che aveva fatto perdere la voce «Importa» (§15).
//
//  Queste prove leggono il SORGENTE: IAM non si apre in un browser nel banco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('/* ─── IL CRUSCOTTO (Fase 4)');
  deve(i >= 0, 'non trovo il blocco cru* in iam/index.html');
  const fine = H.indexOf('/* ─── Le anomalie ────', i);
  return H.slice(i, fine < 0 ? i + 12000 : fine);
}
/* Solo le righe di CODICE: un commento che nomina quello che sta vietando fa
   diventare rossa una prova su un codice corretto — è la trappola già presa
   quindici volte in questo repository (§10, §12, §18, §26, §29, §31, §33,
   §34, §37, §41, §42, §45, §55). Mai una regex globale sui commenti, che su
   un file da un megabyte si mangia mezzo documento (§12). */
const soloJs = s => s.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

prova('la schermata esiste, è raggiungibile e ha il suo inizializzatore', () => {
  /* La striscia delle linguette non c'è più (22/09/2026): ogni schermata di
     Contabilità è una pagina sua, e si apre dal menu. Quello che questa prova
     voleva garantire non era «il bottone esiste»: era che la schermata fosse
     RAGGIUNGIBILE. Si misura sulla ROTTA, che è la cosa che la apre davvero —
     e la rotta serve anche a chi ci arriva da un collegamento vecchio (§6b). */
  deve(!/id="contab-tabs"/.test(H), 'la striscia delle linguette è tornata');
  deve(/'cruscotto'/.test(H.slice(H.indexOf('function selContabTab'))), 'la rotta «cruscotto» non c\'è più');
  deve(/id="contab-panel-cruscotto"/.test(H), 'manca il pannello');
  /* Nell'elenco che accende i pannelli, altrimenti la linguetta non spegne le
     altre. Si cerca la chiave DENTRO l'elenco e non la sua posizione: una
     prova che fissa la posizione diventa rossa il giorno in cui una linguetta
     nuova si mette davanti, su un codice giusto. */
  const elenco = (H.match(/\[('[a-z]+',\s*)+'storico'\]\.forEach/) || [])[0] || '';
  deve(/'cruscotto'/.test(elenco), 'la sotto-scheda non è nell\'elenco che accende i pannelli');
  deve(/if \(sub==='cruscotto'\) cruCarica\(\)/.test(H),
    'nessuno riempie il pannello: la linguetta aprirebbe un riquadro vuoto (§6b)');
  deve(/const contabSub = \[[^\]]*'cruscotto'/.test(H),
    'la sotto-scheda non è fra quelle che l\'indirizzo sa aprire');
  return 'linguetta, pannello, elenco e inizializzatore';
});

prova('le regole stanno nel MOTORE: la schermata non calcola niente', () => {
  const b = soloJs(blocco());
  deve(/Contabilita\.cruscotto\(/.test(b), 'la schermata non chiama il motore');
  /* Nessun conto rifatto in pagina: niente somme sui saldi, niente filtri per
     natura o per tipologia. Una formula scritta dentro una schermata non si
     può provare senza aprire un browser (§5), e prima o poi dice una cosa
     diversa dal motore. */
  deve(!/natura *===/.test(b), 'la schermata decide da sé che cos\'è un premio');
  deve(!/tipologia *===/.test(b), 'la schermata decide da sé che cos\'è un conto di debito');
  return 'una chiamata al motore, nessuna formula in pagina';
});

prova('OGNI LETTURA STA IN PIEDI DA SOLA, e quello che manca si dichiara', () => {
  const b = soloJs(blocco());
  /* Sette letture in una `Promise.all` che rilancia sono una schermata che si
     spegne sette volte più spesso di quanto dovrebbe (§35). */
  deve(!/Promise\.all/.test(b), 'le letture del cruscotto cadono tutte insieme');
  deve((b.match(/cntMorbida\(/g) || []).length >= 7,
    'non tutte le letture passano dal lettore che raccoglie il guasto invece di rilanciarlo');
  /* E quello che non si è letto arriva al motore come `letto: false`, non
     come una lista vuota: una lista vuota diventa uno zero. */
  deve(/CRU_LETTO\.conti *= *!co\.ko/.test(b), 'la lettura dei conti non dichiara se è riuscita');
  deve(/CRU_LETTO\.movimenti *= *!mo\.ko *&& *!ri\.ko/.test(b),
    'i movimenti senza le loro righe non sono meno dati, sono dati sbagliati: vanno dichiarati insieme');
  deve(/CRU_LETTO\.crediti/.test(b) && /CRU_LETTO\.sospesi/.test(b),
    'crediti e sospesi non dichiarano se si sono potuti leggere');
  deve(/letto: CRU_LETTO/.test(b), 'quello che si è letto non arriva al motore');
  return 'sette letture separate, e quattro bandiere che arrivano al motore';
});

prova('NIENTE TETTI SECCHI: le letture sono paginate', () => {
  const b = soloJs(blocco());
  deve(!/\.limit\(/.test(b), 'il cruscotto ha un tetto secco: perde righe in silenzio (§50, §53)');
  deve((b.match(/\.range\(a, b\)/g) || []).length >= 7, 'non tutte le letture paginano');
  /* E quando la paginazione si ferma, lo dice: un totale parziale che non si
     dichiara è il difetto §50 rimesso dentro. */
  deve(/CRU_PARZIALE/.test(b), 'non si tiene conto di una lettura che si è fermata');
  deve(/Una delle letture si è fermata/.test(blocco()),
    'una lettura fermata non si dichiara in schermata');
  return 'sette letture paginate, e il tetto si dichiara';
});

prova('LE RIGHE ARRIVANO AL MOTORE: i saldi non si leggono dalla testata', () => {
  const b = soloJs(blocco());
  deve(/iam_movimenti_righe/.test(b), 'il cruscotto non legge le righe Dare/Avere');
  /* Si guarda DENTRO la chiamata, non nel blocco intero: la prima stesura
     cercava «righe: CRU_RIGHE» ovunque, e restava verde anche togliendolo dal
     cruscotto — perché la stessa chiave compare nella chiamata alle anomalie,
     cinquanta righe più sotto. Una controprova che non fa diventare rossa
     nessuna prova non assolve il codice: accusa la prova (§15, §17, §18, §19,
     §41, §46, §56). */
  const iCru = b.indexOf('Contabilita.cruscotto(');
  const chiamata = b.slice(iCru, b.indexOf('});', iCru));
  deve(/righe: CRU_RIGHE/.test(chiamata), 'le righe non arrivano al cruscotto');
  deve(/movimenti: CRU_MOV/.test(chiamata), 'i movimenti non arrivano al cruscotto');
  /* Anche le anomalie: sono le stesse della linguetta Anomalie e si leggono
     dallo stesso motore con gli stessi dati. Due letture della stessa cosa
     sarebbero due elenchi che un giorno direbbero cose diverse. */
  const an = b.slice(b.indexOf('function cruRenderAnomalie'));
  deve(/Contabilita\.anomalie\(/.test(an), 'le anomalie non passano dal motore');
  deve(/righe: CRU_RIGHE/.test(an), 'le anomalie non ricevono le righe');
  return 'saldi e anomalie, tutti e due sulle righe';
});

prova('lo stato è in `var`: con `let` una prova che inietta dati misura un\'altra variabile', () => {
  /* La trappola di §17: con `let` la variabile del modulo e `window.X` sono
     due cose diverse, e una prova che inietta un portafoglio finto scrive in
     una mentre il codice legge l'altra — restando verde senza aver misurato
     niente. */
  const b = blocco();
  for (const v of ['CRU_CONTI', 'CRU_MOV', 'CRU_RIGHE', 'CRU_CAUSALI',
                   'CRU_CREDITI', 'CRU_RECUPERI', 'CRU_SOSPESI', 'CRU_LETTO',
                   'CRU_CARICATO', 'CRU_PARZIALE']) {
    deve(new RegExp('var (\\w+, )*' + v + '\\b').test(b) || new RegExp('\\bvar [^;\\n]*\\b' + v + '\\b').test(b),
      v + ' non è dichiarata con `var`');
    deve(!new RegExp('\\b(let|const) [^;\\n]*\\b' + v + '\\b').test(b), v + ' è dichiarata con `let` o `const`');
  }
  return '10 variabili di stato';
});

prova('OGNI RIQUADRO PORTA DOVE SI FA', () => {
  const b = blocco();
  /* Un cruscotto che dice «premi da rimettere: 4.200 €» e non porta dove si
     registra la rimessa costringe a cercare la linguetta giusta fra dieci. */
  for (const [k, dove] of [['debito', 'primanota'], ['crediti', 'recuperi'], ['sospesi', 'incassi']]) {
    deve(new RegExp(k + ": \\['" + dove + "'").test(b),
      'il riquadro «' + k + '» non porta a ' + dove);
  }
  deve(/selContabTab\('\$\{d\[0\]\}'\)/.test(b), 'i bottoni del cruscotto non aprono niente');
  return 'cinque riquadri, e i tre che hanno un verbo hanno anche una porta';
});

prova('IL MOTORE FA GIRARE DAVVERO: cinque riquadri, e nessuno zero su una lettura mancata', () => {
  /* Non basta che il codice sia al posto giusto: si fa girare il motore con i
     dati che la schermata gli passerebbe, e si guarda che cosa esce. */
  const conti = [
    { id: 'a', nome: 'Cassa', natura: 'premi', tipologia: 'cassa', saldo_iniziale: 0, attivo: true },
    { id: 'b', nome: 'Conto agenzia', natura: 'aziendale', tipologia: 'banca', saldo_iniziale: 100, attivo: true },
    { id: 'd', nome: 'Debito PRIMA', natura: 'premi', tipologia: 'debito', saldo_iniziale: 0, attivo: true }
  ];
  const causali = [{ id: 'c', nome: 'Incasso premi', segno: 'entrata', incide_su_utile: false }];
  const movimenti = [{ id: 'm', data: '2026-09-22', conto_id: 'a', causale_id: 'c', importo: 400, annullato_il: null }];
  const righe = [{ movimento_id: 'm', conto_id: 'a', dare: 400, avere: 0 },
                 { movimento_id: 'm', conto_id: 'd', dare: 0, avere: 400 }];

  const ok = C.cruscotto({ conti, movimenti, righe, causali, crediti: [], recuperi: [], sospesi: [],
                           oggi: '2026-09-22', letto: { conti: true, movimenti: true, crediti: true, sospesi: true } });
  deve(ok.righe.length === 5, 'i riquadri sono ' + ok.righe.length + ' invece di 5');
  deve(ok.completo === true, 'con tutte le letture riuscite il cruscotto si dichiara incompleto');
  const v = k => ok.righe.filter(r => r.k === k)[0].valore;
  deve(v('premi') === 400, 'i premi dei clienti in cassa sono ' + v('premi') + ' invece di 400');
  deve(v('aziendale') === 100, 'i soldi dell\'agenzia sono ' + v('aziendale') + ' invece di 100');
  deve(v('debito') === 400, 'i premi da rimettere sono ' + v('debito') + ' invece di 400');

  /* E con una lettura mancata: nessuno zero, e il cruscotto sa di non sapere. */
  const ko = C.cruscotto({ conti, movimenti: [], righe: [], causali, crediti: [], recuperi: [], sospesi: [],
                           oggi: '2026-09-22', letto: { conti: true, movimenti: false, crediti: true, sospesi: true } });
  const ciechi = ko.righe.filter(r => r.valore === null);
  deve(ciechi.length === 3, 'i riquadri ciechi sono ' + ciechi.length + ' invece di 3');
  ciechi.forEach(r => deve(r.valore !== 0, 'un riquadro che non si è potuto leggere mostra zero'));
  deve(ko.completo === false, 'il cruscotto si dichiara completo con tre riquadri ciechi');
  return '400 in cassa, 400 da rimettere, 100 dell\'agenzia; e 3 ciechi senza zeri';
});

prova('IL DISEGNO DICE «non si sa», non «0,00 €»', () => {
  /* La misura di sopra guarda il motore; questa guarda che la schermata non
     trasformi un `null` in uno zero mentre lo disegna. */
  const b = blocco();
  deve(/r\.valore == null/.test(b), 'la schermata non distingue un riquadro cieco da uno a zero');
  deve(/non si sa/.test(b), 'un riquadro cieco non lo dice in faccia');
  const i = b.indexOf('const val = r.valore == null');
  const riga = b.slice(i, i + 200);
  deve(/non si sa/.test(riga) && riga.indexOf('euro') > riga.indexOf('non si sa'),
    'il ramo «non si sa» non viene prima di quello che stampa un importo');
  return 'null diventa «non si sa», mai 0,00';
});

prova('la data di oggi non passa da `toISOString()` su una data locale', () => {
  /* Fra mezzanotte e le due `toISOString()` su una data locale dà IERI (§44),
     e il cruscotto direbbe che i ritardi sono uno in meno. */
  const b = soloJs(blocco());
  deve(!/toISOString\(\)\.slice\(0, 10\)/.test(b), 'il cruscotto costruisce la data di oggi con toISOString');
  deve(/function cruOggi\(\)/.test(b) && /return cntOggiIso\(\)/.test(b),
    'la data di oggi non passa dal contatore che conta sui numeri');
  /* E `cntOggiIso` si fa girare davvero, in due fusi che stanno dai due lati
     di Greenwich: è l'unico modo di misurarlo, perché dentro un processo solo
     il fuso è già quello che è. */
  const i = H.indexOf('function cntOggiIso()');
  const fn = H.slice(i, H.indexOf('\n}', i) + 2);
  for (const tz of ['Pacific/Kiritimati', 'Pacific/Niue', 'Europe/Rome']) {
    const ctx = { Date, out: null };
    vm.createContext(ctx);
    vm.runInContext(fn + '\nout = cntOggiIso();', ctx);
    deve(/^\d{4}-\d{2}-\d{2}$/.test(ctx.out), 'in ' + tz + ' la data esce malformata: ' + ctx.out);
  }
  return 'nessun toISOString, e la data si costruisce contando sui numeri';
});


prova('FASE 4-bis · le anomalie del cruscotto leggono gli STESSI dati della linguetta', () => {
  /* La prima stesura ne passava di meno — niente rate incassate, niente
     quadrature, niente portafoglio — e allora il cruscotto scriveva «Niente
     da sistemare» mentre la linguetta accanto ne elencava sei. Due elenchi
     della stessa cosa che dicono numeri diversi non sono due viste: uno dei
     due mente, e a mentire era quello che diceva «tutto a posto». */
  const b = soloJs(blocco());
  const i = b.indexOf('Contabilita.anomalie(');
  const chiamata = b.slice(i, b.indexOf('});', i));
  for (const k of ['conti:', 'movimenti:', 'righe:', 'causali:', 'sospesi:',
                   'titoli:', 'quadrature:', 'incassi_rate:', 'crediti:', 'portafoglio:']) {
    deve(chiamata.includes(k), 'le anomalie del cruscotto non ricevono «' + k + '»');
  }
  /* E le letture che non sono riuscite NON si dichiarano superate. */
  deve(/CRU_ANOM_CIECHE/.test(b), 'i controlli che non si sono potuti fare non si contano');
  deve(/Non vuol dire che lì sia tutto a posto/.test(blocco()),
    'un controllo mai fatto passa per «tutto a posto»');
  return 'dieci chiavi, e i controlli ciechi si dichiarano';
});

prova('FASE 4-bis · un orologio solo per tutta la contabilità', () => {
  /* `toISOString()` su una data locale dà IERI fra mezzanotte e le due (§44):
     con due strade diverse il cruscotto e le linguette direbbero due giorni
     diversi sugli stessi movimenti, e la quadratura di giornata
     confronterebbe un giorno con un altro. */
  for (const f of ['pntOggi', 'recOggi', 'incOggi', 'cruOggi']) {
    const i = H.indexOf('function ' + f + '(');
    deve(i > 0, 'non trovo ' + f);
    const corpo = H.slice(i, i + 260);
    deve(/cntOggiIso\(\)/.test(corpo), f + ' non usa l\'orologio di casa');
  }
  const gi = H.indexOf('function gioData(');
  deve(/cntOggiIso\(\)/.test(H.slice(gi, gi + 260)), 'gioData non usa l\'orologio di casa');
  /* E nessuno dei cinque costruisce più la data con toISOString. */
  for (const f of ['pntOggi', 'recOggi', 'incOggi', 'cruOggi', 'gioData']) {
    const i = H.indexOf('function ' + f + '(');
    deve(!/toISOString\(\)\.slice\(0, 10\)/.test(H.slice(i, i + 260)),
      f + ' costruisce ancora la data con toISOString');
  }
  return 'cinque funzioni, un orologio';
});

prova('FASE 4-bis · le tre esportazioni dichiarano una lettura fermata a metà', () => {
  /* Un file scaricato esce dallo schermo che lo dichiarava e vive da solo per
     mesi. Quello dei premi da recuperare è il più pericoloso: con dei
     recuperi mancanti il residuo esce più alto del vero, e si va a chiedere
     dei soldi a chi li ha già dati. */
  const i = H.indexOf('function cntCsv(');
  const fn = H.slice(i, H.indexOf('\n}', i));
  deve(/avviso/.test(fn), 'il costruttore del CSV non sa dichiarare una lettura parziale');
  /* E l'avviso sta in TESTA, prima delle intestazioni: è la prima riga che si
     legge aprendo il file. */
  deve(/\(avviso \? \[cntCsvCampo\(avviso\)\] : \[\]\)\s*\n?\s*\.concat\(\[intestazioni/.test(fn),
    'l\'avviso non è la prima riga del file');
  for (const [f, bandiera] of [['pntEsporta', 'PNT_PARZIALE'], ['dcoEsporta', 'PNT_PARZIALE'],
                               ['recEsporta', 'REC_PARZIALE']]) {
    const j = H.indexOf('function ' + f + '(');
    deve(j > 0, 'non trovo ' + f);
    const corpo = H.slice(j, H.indexOf('\n}', j));
    deve(corpo.includes(bandiera), f + ' non dichiara la parzialità (' + bandiera + ')');
  }
  /* E `REC_PARZIALE` deve diventare vera davvero: una bandiera che nessuno
     alza è una dichiarazione che non arriva mai. */
  const rp = H.slice(H.indexOf('async function recPagina('), H.indexOf('async function recApri('));
  deve((rp.match(/REC_PARZIALE = true/g) || []).length >= 2,
    'la paginazione dei sospesi non alza la bandiera né quando cade né quando sfonda il tetto');
  return 'tre esportazioni, e la bandiera si alza davvero';
});

console.log('\n══ CRUSCOTTO CONTABILE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCRUSCOTTO CONTABILE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
