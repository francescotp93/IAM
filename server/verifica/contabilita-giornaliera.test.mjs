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

/* ═══ GLI APPUNTI DEL GIORNO ═══════════════════════════════════════════════
   Il 24/09/2026 Francesco ha allegato i due fogli che la compagnia stampa
   ogni sera: «Appunti Incassi» e «Situazione Incassi». Sono la forma vera di
   quello che serve, e contengono tre distinzioni che sarebbe facilissimo
   perdere — e perderne una vuol dire un cassetto che non torna.

   Il caso vero, dal foglio del 22/09/2026 (SPOTO MASSIMILIANO):
     · tre titoli — Allianz Auto 270,00 + National Assistenza 17,50 +
       Tutela 9,50 — con «Pagamento: Oddo Francesco». Non è un mezzo: è il
       sottoconto sospeso di una persona. Quei 297,00 NON sono entrati.
     · in fondo al foglio, «Totale sospesi incassati: 1 — 297,00», saldato
       con Banca Assicurativa Plurimandato. QUELLI sono entrati.
   Sommare i due blocchi conterebbe 594,00 dove sono passati 297,00. */

const CONTI = [
  { id: 'k1', nome: 'Contante', e_conto_sospeso: false },
  { id: 'k2', nome: 'POS', e_conto_sospeso: false },
  { id: 'k3', nome: 'Assegni', e_conto_sospeso: false },
  { id: 'k4', nome: 'Banca Assicurativa Plurimandato', e_conto_sospeso: false },
  { id: 's1', nome: 'Oddo Francesco', e_conto_sospeso: true, collaboratore_id: 'u1' },
];
const R = (o) => Object.assign({ data: '2026-09-22', compagnia: 'HDI', nominativo: 'Tizio',
  polizza: '1', importo: 0, provvigione: 0, mezzo: 'Contante' }, o);

prova('un pagamento appoggiato al sospeso di un collaboratore non è cassa', () => {
  /* È la richiesta, alla lettera: «i pagamenti delle polizze a netto di
     quelle sospese (pagamenti da perfezionare)». */
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 470, mezzo: 'Contanti' }),
    R({ importo: 270, mezzo: 'Oddo Francesco' }),
    R({ importo: 17.50, mezzo: 'Oddo Francesco' }),
    R({ importo: 9.50, mezzo: 'Oddo Francesco' }),
  ]});
  deve(a.totale === 767, 'il totale degli incassi è ' + a.totale + ' invece di 767');
  deve(a.daPerfezionare.totale === 297, 'da perfezionare ' + a.daPerfezionare.totale + ' invece di 297');
  deve(a.netto === 470, 'il netto è ' + a.netto + ' invece di 470: le sospese non sono state tolte');
});

prova('e non compare in nessuna colonna di cassa', () => {
  /* Il rischio vero non è il totale: è che 297 € finiscano nella colonna del
     contante e il cassetto la sera non torni di 297. */
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 470, mezzo: 'Contante' }),
    R({ importo: 297, mezzo: 'Oddo Francesco' }),
  ]});
  const tot = a.perMezzo.reduce((t, m) => t + m.totale, 0);
  deve(tot === 470, 'nelle colonne di cassa ci sono ' + tot + ' invece di 470');
  deve(!a.perMezzo.some(m => /oddo/i.test(m.etichetta)), 'il sospeso compare fra i mezzi di cassa');
});

prova('un sospeso incassato entra in cassa senza essere ricontato', () => {
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 470, mezzo: 'Contante' }),
    R({ importo: 297, mezzo: 'Oddo Francesco' }),
  ]});
  const s = C.sospesiIncassati([
    { data: '2026-09-22', descrizione: 'SPOTO MASSIMILIANO', tipo: 'ODDO FRANCESCO',
      mezzo: 'Banca Assicurativa Plurimandato', importo: 297 },
  ], '2026-09-22', CONTI);
  const cassa = C.cassaDelGiorno(a, s, null);
  deve(s.totale === 297, 'i sospesi incassati fanno ' + s.totale);
  deve(cassa.incassi === 767, 'il totale incassi è cambiato: ' + cassa.incassi);
  deve(cassa.entrato === 767,
    'entrato ' + cassa.entrato + ': dovrebbe essere 470 di cassa + 297 di sospeso saldato = 767');
  /* La controprova del doppio conteggio: se qualcuno sommasse i sospesi al
     totale invece che al netto, qui uscirebbe 1064. */
  deve(cassa.entrato !== cassa.incassi + s.totale,
    'lo stesso denaro è contato due volte: una come rata messa a sospeso e una come sospeso saldato');
});

prova('una spesa in contanti si toglie dai contanti, non da un totale qualunque', () => {
  /* Il caso di Francesco, parola per parola: «se abbiamo pagato 30 € contanti
     ma le polizze del giorno contanti sono 100 €, il totale dei contanti
     dev'essere 70». */
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 100, mezzo: 'Contante' }),
    R({ importo: 50, mezzo: 'POS' }),
  ]});
  const u = C.speseDelGiorno([{ data: '2026-09-22', descrizione: 'Cancelleria', importo: 30, mezzo: 'Contante' }], '2026-09-22', CONTI);
  const cassa = C.cassaDelGiorno(a, null, u);
  const contante = cassa.perMezzo.find(m => /contante/i.test(m.etichetta));
  const pos = cassa.perMezzo.find(m => /pos/i.test(m.etichetta));
  deve(contante && contante.saldo === 70, 'nel contante restano ' + (contante && contante.saldo) + ' invece di 70');
  deve(pos && pos.saldo === 50, 'il POS è stato toccato dalla spesa in contanti: ' + (pos && pos.saldo));
  deve(cassa.resta === 120, 'in cassa restano ' + cassa.resta + ' invece di 120');
});

prova('una spesa col segno meno non diventa un incasso', () => {
  const u = C.speseDelGiorno([{ data: '2026-09-22', descrizione: 'Bollo', importo: -16, mezzo: 'Contante' }], '2026-09-22', CONTI);
  deve(u.totale === 16, 'la spesa vale ' + u.totale + ': il segno andava normalizzato dal motore');
  const cassa = C.cassaDelGiorno(C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [R({ importo: 100 })] }), null, u);
  const contante = cassa.perMezzo.find(m => /contante/i.test(m.etichetta));
  deve(contante.saldo === 84, 'il contante fa ' + contante.saldo + ' invece di 84: la spesa è stata sommata');
});

prova('una spesa senza mezzo non si toglie dal contante per abitudine', () => {
  /* Toglierla «perché di solito le spese sono in contanti» farebbe quadrare
     un cassetto che non quadra: il numero uscirebbe giusto e il contante
     dichiarato la sera non tornerebbe. */
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [R({ importo: 100, mezzo: 'Contante' })] });
  /* Due forme della stessa ignoranza: la casella vuota, e un nome che non è
     fra i conti («cassa piccola»). La seconda è la pericolosa: sembra un
     mezzo, e senza controllo si apre una colonna che non esiste. */
  const u = C.speseDelGiorno([
    { data: '2026-09-22', descrizione: 'Non si sa', importo: 10, mezzo: '' },
    { data: '2026-09-22', descrizione: 'Cassa piccola', importo: 20, mezzo: 'Cassa piccola' },
  ], '2026-09-22', CONTI);
  deve(u.senzaMezzo.quante === 2 && u.senzaMezzo.totale === 30,
    'le spese non attribuibili sono ' + u.senzaMezzo.quante + ' per ' + u.senzaMezzo.totale + ': dovevano essere 2 per 30');
  deve(u.perMezzo.length === 0,
    'una spesa che non si sa come è stata pagata ha aperto una colonna: ' + u.perMezzo.map(x => x.etichetta).join(', '));
  const cassa = C.cassaDelGiorno(a, null, u);
  deve(cassa.perMezzo.length === 1, 'la cassa ha ' + cassa.perMezzo.length + ' colonne invece di una');
  const contante = cassa.perMezzo.find(m => /contante/i.test(m.etichetta));
  deve(contante.saldo === 100, 'il contante è stato ridotto a ' + contante.saldo + ' da spese di cui non si sa il mezzo');
  deve(cassa.resta === 70, 'il totale però deve tenerne conto: i soldi sono usciti. Fa ' + cassa.resta);
  deve(cassa.avvisi.some(x => x.g === 'grave'), 'spese senza mezzo non vengono segnalate');
});

prova('un pagamento che non si riesce ad attribuire si dichiara', () => {
  /* Un nome che non è fra i conti può essere un collaboratore (e allora è un
     sospeso) o un conto che nessuno ha creato (e allora è cassa). Indovinare
     vuol dire sbagliare il netto senza accorgersene. */
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 100, mezzo: 'Contante' }),
    R({ importo: 55, mezzo: 'Bianchi Mario' }),
  ]});
  deve(a.nonAttribuiti.quante === 1, 'il pagamento sconosciuto non è stato marcato');
  deve(a.netto === 155, 'il netto è ' + a.netto + ': un pagamento incerto non va tolto, va dichiarato');
  deve(a.avvisi.some(x => x.g === 'grave'), 'nessun avviso grave su un pagamento non attribuibile');
  deve(!a.perMezzo.some(m => /bianchi/i.test(m.etichetta)), 'il pagamento incerto è finito in una colonna di cassa');
});

prova('i mezzi si riconoscono comunque siano scritti', () => {
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 10, mezzo: 'CONTANTE' }), R({ importo: 10, mezzo: '  contante ' }),
    R({ importo: 10, mezzo: 'Pos' }), R({ importo: 10, mezzo: 'BANCA  ASSICURATIVA   PLURIMANDATO' }),
  ]});
  deve(a.nonAttribuiti.quante === 0, 'maiuscole, spazi doppi o minuscole hanno creato conti diversi');
});

prova('le righe si raggruppano per compagnia, come nel foglio', () => {
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ compagnia: 'HDI', importo: 100, provvigione: 10 }),
    R({ compagnia: 'HDI', importo: 200, provvigione: 20 }),
    R({ compagnia: 'ALLIANZ', importo: 50, provvigione: 5 }),
  ]});
  deve(a.gruppi.length === 2, 'le compagnie sono ' + a.gruppi.length);
  deve(a.gruppi[0].compagnia === 'HDI' && a.gruppi[0].totale === 300, 'il gruppo HDI non torna');
  deve(a.gruppi[0].provvigioni === 30, 'le provvigioni del gruppo fanno ' + a.gruppi[0].provvigioni);
  deve(a.provvigioni === 35, 'le provvigioni totali fanno ' + a.provvigioni);
});

prova('il giorno è un filtro, non un suggerimento', () => {
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ data: '2026-09-22', importo: 100 }), R({ data: '2026-09-21', importo: 999 }),
  ]});
  deve(a.quante === 1 && a.totale === 100, 'entrano righe di altri giorni: ' + a.totale);
});

prova('i centesimi non si perdono per strada', () => {
  const a = C.appunti({ giorno: '2026-09-22', conti: CONTI, righe: [
    R({ importo: 0.1 }), R({ importo: 0.2 }),
  ]});
  deve(a.totale === 0.3, '0,10 + 0,20 fa ' + a.totale);
});

/* ── I MEZZI VERI DEL DATABASE ───────────────────────────────────────────────
   Queste prove nascono da un difetto che quelle QUI SOPRA non potevano
   vedere, perché usano valori scritti a mano («Contante», «Pos»). Il database
   scrive `carta_credito`, `pos_bianco`, `altro`: parole che vengono da un
   vincolo, non da come uno le ha digitate.

   Il motore non le riconosceva. Il 23/09/2026 erano due mezzi su cinque:
   quelle rate finivano fra i «non si riesce ad attribuire», il netto del
   giorno usciva incompleto, e la schermata dava la colpa a un dato che invece
   era scritto benissimo.

   L'elenco è copiato da `select distinct mezzo_pagamento from quote_titoli`,
   non dalla memoria. Se domani ne compare uno nuovo, questa prova deve
   diventare rossa: è il suo mestiere. */
const MEZZI_DEL_DATABASE = [
  ['contante', 'Contante'], ['pos', 'POS'], ['bonifico', 'Bonifico'],
  ['carta_credito', 'Carta di credito'], ['paypal', 'PayPal'],
  ['prepagata', 'Carta prepagata'], ['altro', 'Altro'],
  ['pos_bianco', 'POS bianco'], ['pos_nero', 'POS nero'],
  ['assegno', 'Assegno'], ['domiciliazione', 'Domiciliazione (SDD)'],
];

prova('ogni mezzo che il database scrive viene riconosciuto', () => {
  /* Senza conti: si misura il motore, non la configurazione dell'agenzia. */
  const muti = MEZZI_DEL_DATABASE.filter(([v]) => !C.classificaMezzo(v, []).noto);
  deve(muti.length === 0, 'non riconosciuti: ' + muti.map(([v]) => v).join(', '));
});

prova('e lo chiama col suo nome, non col codice del database', () => {
  const storti = MEZZI_DEL_DATABASE
    .filter(([v, atteso]) => C.classificaMezzo(v, []).etichetta !== atteso)
    .map(([v, atteso]) => v + ' dà «' + C.classificaMezzo(v, []).etichetta + '» invece di «' + atteso + '»');
  deve(storti.length === 0, storti.join(' · '));
});

prova('scritto a mano o scritto dal database, è la STESSA colonna', () => {
  /* Se «contanti» e `contante` fanno due chiavi diverse, il foglio mostra due
     mezze colonne di contante e nessuna delle due quadra col cassetto. */
  const coppie = [['contanti', 'contante'], ['carta di credito', 'carta_credito'],
    ['CARTA DI CREDITO', 'carta_credito'], ['pos bianco', 'pos_bianco'], ['sdd', 'domiciliazione']];
  const rotte = coppie.filter(([a, b]) => C.classificaMezzo(a, []).chiave !== C.classificaMezzo(b, []).chiave);
  deve(rotte.length === 0, 'finiscono in colonne diverse: ' + rotte.map(c => c.join(' ≠ ')).join(' · '));
});

prova('un nome di persona resta «non si sa», non diventa un mezzo', () => {
  /* È il verso pericoloso. Se il motore si mettesse a riconoscere tutto, il
     sospeso di un collaboratore entrerebbe in cassa come se fosse incassato. */
  const r = C.classificaMezzo('Giuseppe Verdi', []);
  deve(r.noto === false, 'un nome proprio è stato preso per un mezzo: ' + r.etichetta);
});

prova('il conto dell\'agenzia batte il vocabolario', () => {
  /* `contante` è una parola nota, ma se l'agenzia ha un conto che dichiara di
     raccoglierlo, la riga deve finire su QUEL conto: è lì che Francesco andrà
     a cercarla. */
  const conti = [{ id: 'hdi', nome: 'CONTO CORRENTE HDI', mezzi: ['contante', 'pos', 'bonifico'] }];
  const r = C.classificaMezzo('contante', conti);
  deve(r.chiave === 'hdi' && r.etichetta === 'CONTO CORRENTE HDI',
    'il conto non ha vinto: ' + r.chiave + ' / ' + r.etichetta);
});

prova('e il sospeso di un collaboratore resta un sospeso', () => {
  const conti = [{ id: 'mario', nome: 'Mario Rossi', e_conto_sospeso: true }];
  const r = C.classificaMezzo('Mario Rossi', conti);
  deve(r.noto === true && r.sospeso === true, 'noto:' + r.noto + ' sospeso:' + r.sospeso);
});

prova('la casella vuota resta vuota: non diventa «Altro»', () => {
  /* Il verso sbagliato più tentante. «Altro» è una scelta che qualcuno ha
     fatto; il vuoto è una casella che nessuno ha compilato. Confonderli fa
     sparire il problema invece di mostrarlo. */
  const vuoto = C.classificaMezzo('', []);
  const altro = C.classificaMezzo('altro', []);
  deve(vuoto.noto === false && altro.noto === true, 'vuoto:' + vuoto.noto + ' altro:' + altro.noto);
});

prova('una giornata coi mezzi veri non lascia fuori niente', () => {
  /* La prova d'insieme, sui valori del 23/09/2026: cinque mezzi, cinque
     colonne, nessun «non attribuito». Prima della correzione ne restavano
     fuori due su cinque. */
  const a = C.appunti({ giorno: '2026-09-23', conti: [], righe: [
    R({ data: '2026-09-23', importo: 100, mezzo: 'contante' }),
    R({ data: '2026-09-23', importo: 200, mezzo: 'pos' }),
    R({ data: '2026-09-23', importo: 300, mezzo: 'bonifico' }),
    R({ data: '2026-09-23', importo: 400, mezzo: 'carta_credito' }),
    R({ data: '2026-09-23', importo: 500, mezzo: 'altro' }),
  ]});
  deve(a.nonAttribuiti.quante === 0, a.nonAttribuiti.quante + ' pagamenti restano non attribuiti');
  deve(a.perMezzo.length === 5, 'le colonne sono ' + a.perMezzo.length + ' invece di 5');
  deve(a.netto === 1500, 'il netto fa ' + a.netto + ' invece di 1500');
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Contabilità giornaliera: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
