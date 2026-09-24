// ═══════════════════════════════════════════════════════════════════════════════
//  CONTABILITÀ GIORNALIERA — il foglio cassa del giorno
//
//  Un foglio cassa sbagliato non va in errore: stampa un totale credibile, e
//  qualcuno ci chiude la giornata sopra. Le cose che devono restare vere:
//
//    1. I SOSPESI SCARICATI SI RICAVANO PER DIFFERENZA. L'elenco è una
//       fotografia ricaricata ogni giorno, non una storia di eventi: chi c'era
//       ieri e oggi non c'è più ha pagato. La chiave è il progressivo della
//       compagnia, e arriva con l'involucro di Excel attorno — ="BLP960372057" —
//       che va tolto, o la stessa riga non si riconosce da un giorno all'altro.
//
//    2. QUANDO LA FINESTRA È PIÙ LARGA DI UN GIORNO, SI DICE. Fra il 17 e il 21
//       luglio non c'è nessuna fotografia: i 28 sospesi «scaricati il 21» sono
//       di tutto il fine settimana. Spacciarli per un giorno solo fa sembrare
//       una giornata eccezionale una settimana normale.
//
//    3. IL MEZZO DI PAGAMENTO DEL SOSPESO NON SI INVENTA. Contante o POS non è
//       scritto da nessuna parte: la casella resta vuota e marcata. Un foglio
//       cassa che scrive «contante» senza saperlo è peggio di uno che tace.
//
//    4. ZERO E «NON SI SA» SONO DUE COSE DIVERSE. Zero vuol dire che non è
//       entrato niente; null che nessuno l'ha scritto. Confonderli fa quadrare
//       i conti per sbaglio.
//
//    5. GLI IMPORTI ALL'ITALIANA. «1.234,56» dato a parseFloat fa 1.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const esiti = [];
const prova = (nome, fn) => {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, m) => { if (!c) throw new Error(m); };

const C = require('../../tariffe/motore/contabilita-giornaliera.js');

/* Le fotografie, nella forma vera: il progressivo, l'involucro di Excel sulla
   polizza, i giorni di sospeso. I nomi sono inventati. */
const S = (prog, nome, imp, extra) => Object.assign({
  prog: String(prog), nominativo: nome, importo: imp, compagnia: 'COMPAGNIA X',
  polizza: '="BLP' + prog + '"', produttore: 'ROSSI MARIO', data: '30/10/2025', gg: 271,
}, extra || {});

const IERI = [S(1, 'ALFA ANNA', 17.22), S(2, 'BETA BRUNO', 60), S(3, 'GAMMA GINO', 120.5)];
const OGGI = [S(2, 'BETA BRUNO', 60)];   // Alfa e Gamma hanno pagato

/* ── 1. la differenza ───────────────────────────────────────────────────── */

prova('chi c\'era ieri e oggi non c\'è più risulta scaricato', () => {
  const r = C.sospesiScaricati(IERI, OGGI, { dal: '2026-07-23', al: '2026-07-24' });
  deve(r.quanti === 2, 'scaricati ' + r.quanti + ' invece di 2');
  deve(Math.abs(r.totale - 137.72) < 0.01, 'il totale non torna: ' + r.totale);
  const nomi = r.righe.map(x => x.nominativo).sort().join(',');
  deve(nomi === 'ALFA ANNA,GAMMA GINO', 'ha scaricato le persone sbagliate: ' + nomi);
});

prova('e chi è rimasto non risulta pagato', () => {
  const r = C.sospesiScaricati(IERI, OGGI, {});
  deve(!r.righe.some(x => x.nominativo === 'BETA BRUNO'),
    'risulta scaricato uno che è ancora nell\'elenco di oggi');
});

prova('l\'involucro di Excel attorno al numero non spezza il riconoscimento', () => {
  /* La polizza arriva come ="BLP960372057". Se un giorno arriva senza
     involucro, o con uno spazio, dev'essere ancora la stessa riga. */
  deve(C.chiave('="BLP960372057"') === 'BLP960372057', 'l\'involucro non viene tolto: ' + C.chiave('="BLP960372057"'));
  deve(C.chiave('BLP960372057') === C.chiave('="BLP960372057"'), 'le due forme non si riconoscono');
  deve(C.chiave(' blp960372057 ') === 'BLP960372057', 'spazi e minuscole spezzano il confronto');
});

prova('due fotografie identiche non scaricano niente', () => {
  const r = C.sospesiScaricati(IERI, IERI, {});
  deve(r.quanti === 0, 'senza cambiamenti risultano ' + r.quanti + ' pagamenti');
  deve(r.totale === 0, 'e un totale di ' + r.totale);
});

prova('un sospeso nuovo non conta come scaricato', () => {
  /* L'elenco cresce: i nuovi sospesi del giorno non sono pagamenti. */
  const domani = OGGI.concat([S(9, 'DELTA DINA', 300)]);
  const r = C.sospesiScaricati(OGGI, domani, {});
  deve(r.quanti === 0, 'un sospeso NUOVO viene contato come pagato');
});

prova('senza progressivo si ripiega, ma la riga resta marcata', () => {
  /* Il ripiego su polizza+importo è meno solido: chi legge deve sapere quali
     righe ci stanno sopra. */
  const a = [{ nominativo: 'SENZA PROG', importo: 50, polizza: '="X1"' }];
  const r = C.sospesiScaricati(a, [], {});
  deve(r.quanti === 1, 'il ripiego non riconosce la riga');
  deve(r.righe[0].riconosciuto_dal_progressivo === false, 'non dice che è stata riconosciuta col ripiego');
  deve(r.senzaProgressivo === 1, 'non conta quante righe stanno sul ripiego');
});

/* ── 2. la finestra ─────────────────────────────────────────────────────── */

prova('se fra le due fotografie passa più di un giorno, si dice', () => {
  /* Il caso vero: 17/07 → 21/07, 28 sospesi. Chiamarli «di lunedì» fa sembrare
     una giornata eccezionale un fine settimana normale. */
  const r = C.sospesiScaricati(IERI, OGGI, { dal: '2026-07-17', al: '2026-07-21' });
  deve(r.piuDiUnGiorno === true, 'quattro giorni di distanza non vengono segnalati');
  deve(r.finestra.giorni === 4, 'la finestra è di ' + r.finestra.giorni + ' giorni invece di 4');
});

prova('e su giorni consecutivi non si dice niente', () => {
  const r = C.sospesiScaricati(IERI, OGGI, { dal: '2026-07-23', al: '2026-07-24' });
  deve(r.piuDiUnGiorno === false, 'due giorni consecutivi risultano una finestra larga');
});

prova('il foglio lo riporta fra gli avvisi, non solo nei dati', () => {
  const f = C.foglio({ giorno: '2026-07-21', giornoPrima: '2026-07-17', sospesiPrima: IERI, sospesiDopo: OGGI });
  deve(f.avvisi.some(a => /non solo di oggi|tutto quel periodo/i.test(a.t)),
    'chi guarda la schermata non viene avvisato della finestra larga');
});

/* ── 3. il mezzo non si inventa ─────────────────────────────────────────── */

prova('di un sospeso scaricato non si dice come è stato pagato', () => {
  const r = C.sospesiScaricati(IERI, OGGI, {});
  for (const x of r.righe) {
    deve(x.mezzo_pagamento === null, 'ha attribuito un mezzo di pagamento: ' + x.mezzo_pagamento);
    deve(x.mezzo_ignoto === true, 'non dichiara che il mezzo non si sa');
  }
});

prova('e il foglio lo scrive in chiaro', () => {
  const f = C.foglio({ giorno: '2026-07-24', giornoPrima: '2026-07-23', sospesiPrima: IERI, sospesiDopo: OGGI });
  deve(f.avvisi.some(a => /non come sono stati pagati/i.test(a.t)),
    'il foglio non dice che il mezzo dei sospesi non è registrato');
  deve(f.noteDiMetodo.some(n => /non è registrato/i.test(n)),
    'le note di metodo non spiegano il limite');
});

prova('le note di metodo dicono anche che il mezzo delle rate è un\'altra cosa', () => {
  /* Le rate vendute online dicono come il CLIENTE ha pagato la COMPAGNIA:
     carta, PayPal. Non è quello che è passato dal cassetto, e sommarli
     darebbe una cassa che non esiste. */
  const f = C.foglio({ giorno: '2026-07-24' });
  deve(f.noteDiMetodo.some(n => /cassetto/i.test(n)),
    'non avverte che il mezzo delle rate non è la cassa dell\'agenzia');
});

/* ── 4. zero e «non si sa» ──────────────────────────────────────────────── */

prova('senza giornata dichiarata i contanti sono ignoti, non zero', () => {
  const f = C.foglio({ giorno: '2026-07-24' });
  deve(f.cassa.contanti === null, 'i contanti risultano ' + f.cassa.contanti + ' invece di ignoti');
  deve(f.entrato_in_cassa === null, 'l\'entrato in cassa risulta un numero senza che nessuno l\'abbia scritto');
  deve(f.avvisi.some(a => /non è stata compilata/i.test(a.t)), 'non avvisa che la giornata non è stata compilata');
});

prova('e una giornata a zero è zero, non ignota', () => {
  const f = C.foglio({ giorno: '2026-07-24', dichiarata: { contanti: 0, pos_bianco: 0, pos_nero: 0, spese: 0 } });
  deve(f.cassa.contanti === 0, 'zero contanti diventano ignoti');
  deve(f.entrato_in_cassa === 0, 'una giornata vuota non risulta zero');
});

prova('i POS si sommano, e se mancano tutti e due restano ignoti', () => {
  const con = C.foglio({ giorno: '2026-07-24', dichiarata: { pos_bianco: 100, pos_nero: 50 } });
  deve(con.pos_totale === 150, 'i due POS non si sommano: ' + con.pos_totale);
  const senza = C.foglio({ giorno: '2026-07-24', dichiarata: { contanti: 10 } });
  deve(senza.pos_totale === null, 'senza POS dichiarati il totale è ' + senza.pos_totale + ' invece di ignoto');
});

prova('le spese ci sono ma non si sa come sono state pagate, e lo dice', () => {
  const f = C.foglio({ giorno: '2026-07-24', dichiarata: { spese: 80 } });
  deve(f.cassa.spese === 80, 'la spesa non viene letta');
  deve(f.avvisi.some(a => /spese del giorno sono un totale/i.test(a.t)),
    'non dice che delle spese si conosce solo il totale');
});

/* ── 5. gli importi e le rate ───────────────────────────────────────────── */

prova('«1.234,56» vale milleduecentotrentaquattro e cinquantasei', () => {
  deve(C.num('1.234,56') === 1234.56, 'il separatore delle migliaia mangia l\'importo: ' + C.num('1.234,56'));
  deve(C.num('') === 0 && C.num(null) === 0, 'il vuoto non vale zero');
});

prova('ma un numero vero resta un numero, e non viene «corretto»', () => {
  /* Il difetto trovato da questa suite: togliere i punti per gestire
     l'italiano faceva a pezzi anche i numeri JSON. 17.22 diventava 1722, e su
     tre sospesi il totale passava da 137,72 a 2.927 — credibile e falso di
     venti volte. Le due strade servono tutte e due, e devono restare due. */
  deve(C.num(17.22) === 17.22, 'un numero JSON viene stravolto: ' + C.num(17.22));
  deve(C.num(120.5) === 120.5, 'idem con un decimale solo: ' + C.num(120.5));
  deve(C.num('17.22') === 17.22, 'una stringa senza virgola non si legge com\'è: ' + C.num('17.22'));
  deve(C.num(0) === 0 && C.num(-4.5) === -4.5, 'zero e negativi si perdono');
});

prova('le rate del giorno si dividono per come sono state pagate', () => {
  const titoli = [
    { incassato_il: '2026-07-24', stato: 'incassato', mezzo_pagamento: 'contante', importo_lordo: 100 },
    { incassato_il: '2026-07-24', stato: 'incassato', mezzo_pagamento: 'contante', importo_lordo: 50 },
    { incassato_il: '2026-07-24', stato: 'incassato', mezzo_pagamento: 'pos', importo_lordo: 200 },
    { incassato_il: '2026-07-23', stato: 'incassato', mezzo_pagamento: 'contante', importo_lordo: 999 },
    { incassato_il: '2026-07-24', stato: 'aperto', mezzo_pagamento: 'contante', importo_lordo: 999 },
  ];
  const r = C.incassiPerMezzo(titoli, '2026-07-24');
  deve(r.quante === 3, 'ha preso ' + r.quante + ' rate: entra un altro giorno o una rata non incassata');
  deve(r.totale === 350, 'il totale del giorno è ' + r.totale + ' invece di 350');
  const contante = r.per_mezzo.find(x => x.mezzo === 'contante');
  deve(contante && contante.quante === 2 && contante.totale === 150, 'il contante non torna');
  deve(r.per_mezzo[0].mezzo === 'pos', 'i mezzi non sono ordinati per importo: in cima ' + r.per_mezzo[0].mezzo);
});

prova('e una rata senza mezzo si conta, invece di sparire', () => {
  const r = C.incassiPerMezzo([{ incassato_il: '2026-07-24', stato: 'incassato', importo_lordo: 70 }], '2026-07-24');
  deve(r.senzaMezzo === 1, 'la rata senza mezzo non viene contata');
  deve(r.totale === 70, 'e sparisce anche dal totale');
  const f = C.foglio({ giorno: '2026-07-24', titoli: [{ incassato_il: '2026-07-24', stato: 'incassato', importo_lordo: 70 }] });
  deve(f.avvisi.some(a => /con che mezzo/i.test(a.t)), 'il foglio non lo segnala');
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Contabilità giornaliera: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
