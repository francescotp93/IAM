// ═══════════════════════════════════════════════════════════════════════════════
//  L'ESTRATTO CONTO DEL COLLABORATORE — tariffe/motore/estratto-conto.js
//  (18/09/2026)
//
//  Quello che esce da qui finisce in un documento che si manda a una persona
//  che con quei numeri viene pagata. Le prove sotto sono quelle che, se
//  saltano, producono un estratto conto credibile e sbagliato: una percentuale
//  applicata al numero sbagliato, una rata contata due volte, un totale che
//  non torna con le righe, una provvigione pagata su soldi mai incassati.
//
//  Dati tutti inventati: nessun nome e nessuna cifra vera (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const E = require('../../tariffe/motore/estratto-conto.js');
/* Le coordinate su cui si versa le dà il motore della contabilità, che
   possiede i conti e il controllo dell'IBAN: il documento riceve il risultato. */
const C = require('../../tariffe/motore/contabilita.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* ── Il banco: due polizze, uno schema provvigionale, sei rate ───────────── */
const POLIZZE = {
  'pol-1': { id: 'pol-1', numero_polizza: 'NP-1', cliente: 'ROSSI MARIO', compagnia: 'PRIMA', prodotto: 'RC Auto' },
  'pol-2': { id: 'pol-2', numero_polizza: 'NP-2', cliente: 'VERDI LUCA', compagnia: 'PRIMA', prodotto: 'Casa' },
  'pol-3': { id: 'pol-3', numero_polizza: 'NP-3', cliente: 'BIANCHI SRL', compagnia: 'HDI', prodotto: 'Infortuni' }
};
const SCHEMA = [
  { prodotto: 'RC Auto', perc: 60, speciale: false, note: null },
  { prodotto: 'Casa', perc: 50, speciale: true, note: 'accordo del 2025' }
  /* «Infortuni» NON c'è: è il caso «percentuale non concordata». */
];
const T = (o) => Object.assign({ id: 't', polizza_id: 'pol-1', tipo: 'rata', stato: 'aperto', collaboratore_id: 'c1' }, o);

const TITOLI = [
  T({ id: 't1', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-09-10', importo_lordo: 390, provvigione: 41.21 }),
  T({ id: 't2', polizza_id: 'pol-2', stato: 'incassato', incassato_il: '2026-09-15', importo_lordo: 200, provvigione: 33.33 }),
  T({ id: 't3', polizza_id: 'pol-3', stato: 'incassato', incassato_il: '2026-09-20', importo_lordo: 100, provvigione: 10 }),
  /* incassata FUORI periodo */
  T({ id: 't4', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-08-31', importo_lordo: 390, provvigione: 41.21 }),
  /* NON incassate: sono i sospesi */
  T({ id: 't5', polizza_id: 'pol-1', stato: 'aperto', data_scadenza: '2026-09-05', importo_lordo: 110, mezzo_pagamento: 'contante' }),
  T({ id: 't6', polizza_id: 'pol-2', stato: 'insoluto', data_decorrenza: '2026-09-25', importo_lordo: 55 }),
  /* di un altro collaboratore */
  T({ id: 't7', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-09-12', importo_lordo: 390, provvigione: 41.21, collaboratore_id: 'c2' })
];
const PER = { dal: '2026-09-01', al: '2026-09-30', collaboratore_id: 'c1', schema: SCHEMA, polizze: POLIZZE, titoli: TITOLI };

prova('la percentuale si applica alla PROVVIGIONE DI COMPAGNIA, non al premio', () => {
  /* È la decisione 2. Il 60% dei 41,21 € riconosciuti dalla compagnia fa
     24,73; il 60% dei 390 € pagati dal cliente farebbe 234 — un numero
     credibile e falso, e sei volte più grande di quello che l'agenzia
     incassa davvero su quella polizza. */
  const r = E.rigaProvvigionale(TITOLI[0], POLIZZE['pol-1'], SCHEMA);
  deve(r.quota_collaboratore === 24.73, 'quota: ' + r.quota_collaboratore + ' (attesa 24,73 = 60% di 41,21)');
  deve(r.premio === 390, 'il premio del cliente non viaggia fino alla riga: ' + r.premio);
  deve(r.quota_collaboratore < r.premio, 'la quota è più grande del premio: si sta calcolando sulla base sbagliata');
  return '60% di 41,21 = 24,73 (e non 234,00)';
});

prova('quota e margine sommano ESATTAMENTE alla provvigione di compagnia', () => {
  /* Il margine si ricava per differenza. Calcolarlo con una seconda
     percentuale (`base × 40%`) darebbe 16,48 e 24,73 + 16,48 = 41,21 per
     fortuna; ma su 33,33 al 50% i due arrotondamenti fanno 16,67 + 16,67 =
     33,34, un centesimo che nessuno sa spiegare in un documento che si manda
     fuori. */
  [TITOLI[0], TITOLI[1]].forEach(t => {
    const r = E.rigaProvvigionale(t, POLIZZE[t.polizza_id], SCHEMA);
    const somma = E.cent(r.quota_collaboratore + r.margine_agenzia);
    deve(somma === r.provvigione_compagnia,
      'su ' + r.numero_polizza + ': ' + r.quota_collaboratore + ' + ' + r.margine_agenzia + ' = ' + somma + ' invece di ' + r.provvigione_compagnia);
  });
  const mezzo = E.rigaProvvigionale(TITOLI[1], POLIZZE['pol-2'], SCHEMA);
  deve(mezzo.quota_collaboratore === 16.67 && mezzo.margine_agenzia === 16.66,
    'il centesimo dispari: ' + mezzo.quota_collaboratore + ' / ' + mezzo.margine_agenzia);
  return '24,73+16,48 e 16,67+16,66, tutti e due esatti';
});

prova('il «guadagno indiretto» è il margine dell\'agenzia, e non una gerarchia', () => {
  const r = E.rigaProvvigionale(TITOLI[0], POLIZZE['pol-1'], SCHEMA);
  deve(r.margine_agenzia === 16.48, 'margine: ' + r.margine_agenzia + ' (41,21 − 24,73)');
  /* Non esiste nessun campo che parli di chi ha portato chi: se un giorno
     comparisse, sarebbe un altro lavoro, non una colonna in più qui. */
  deve(!('override' in r) && !('portato_da' in r), 'è comparsa una gerarchia che nessuno ha deciso');
  return '41,21 − 24,73 = 16,48';
});

prova('LA REGOLA CHE COMANDA · quello che non si sa non entra nei totali', () => {
  const p = E.provvigionale(PER);
  /* «Infortuni» non ha una percentuale concordata: la riga c'è, il motivo è
     scritto, e i totali non la contano. Applicarle una percentuale «di
     default» vorrebbe dire pagare un collaboratore su un accordo che non
     esiste, e quel numero poi diventa la base della discussione. */
  const inf = p.righe.find(r => r.prodotto === 'Infortuni');
  deve(inf, 'la riga senza percentuale è sparita: sparire è peggio che essere dichiarata');
  deve(inf.quota_collaboratore === null && inf.margine_agenzia === null, 'è stata inventata una quota: ' + inf.quota_collaboratore);
  deve(/nessuna percentuale concordata/.test(inf.daConfermare.join(' ')), 'il motivo non è scritto: ' + JSON.stringify(inf.daConfermare));
  deve(p.totali.conteggiate === 2 && p.totali.righe === 3, 'conteggiate ' + p.totali.conteggiate + ' su ' + p.totali.righe);
  deve(p.totali.quota_collaboratore === 41.4, 'totale quote: ' + p.totali.quota_collaboratore + ' (24,73 + 16,67)');
  deve(p.daConfermare.length === 1, 'righe da confermare: ' + p.daConfermare.length);
  return '3 righe, 2 conteggiate, 1 dichiarata e fuori dai totali';
});

prova('una rata senza provvigione dichiarata dalla compagnia non diventa zero', () => {
  /* Zero è un accordo, «non dichiarata» è una cosa da chiedere. Contarla come
     zero abbasserebbe il totale senza che nessuno se ne accorga. */
  const senza = E.rigaProvvigionale({ id: 'x', polizza_id: 'pol-1', provvigione: null, importo_lordo: 390 }, POLIZZE['pol-1'], SCHEMA);
  deve(senza.provvigione_compagnia === null, 'la provvigione mancante è diventata ' + senza.provvigione_compagnia);
  deve(senza.quota_collaboratore === null, 'con una provvigione ignota è stata calcolata una quota');
  deve(/non ha dichiarato la provvigione/.test(senza.daConfermare.join(' ')), 'motivo assente: ' + JSON.stringify(senza.daConfermare));
  /* E uno ZERO vero resta zero: è un accordo, e va contato. */
  const zero = E.rigaProvvigionale({ id: 'y', polizza_id: 'pol-1', provvigione: 0, importo_lordo: 390 }, POLIZZE['pol-1'], SCHEMA);
  deve(zero.provvigione_compagnia === 0 && zero.quota_collaboratore === 0, 'uno zero dichiarato non è stato contato');
  deve(!zero.daConfermare.length, 'uno zero dichiarato viene messo in dubbio: ' + JSON.stringify(zero.daConfermare));
  return 'null resta null, 0 resta 0';
});

prova('DECISIONE 1 · si paga sull\'incassato, e il periodo è quello dell\'incasso', () => {
  const p = E.provvigionale(PER);
  /* Le due rate non incassate (t5, t6) non compaiono: non hanno ancora
     prodotto niente per nessuno. */
  deve(!p.righe.some(r => ['t5', 't6'].includes(r.titolo_id)), 'una rata non incassata è finita fra le provvigioni');
  /* La rata incassata il 31/08 non entra in settembre: il periodo si conta
     sulla data di INCASSO, non sulla decorrenza. */
  deve(!p.righe.some(r => r.titolo_id === 't4'), 'una rata incassata fuori periodo è entrata');
  /* Uno stato «incassato» senza data non si può collocare in nessun periodo. */
  const senzaData = E.provvigionale({ titoli: [{ id: 'z', polizza_id: 'pol-1', stato: 'incassato', provvigione: 10, collaboratore_id: 'c1' }], polizze: POLIZZE, schema: SCHEMA, collaboratore_id: 'c1' });
  deve(senzaData.righe.length === 0, 'una rata incassata senza data è entrata lo stesso');
  return '2 non incassate fuori, 1 fuori periodo fuori, 1 senza data fuori';
});

prova('l\'estratto conto di uno non contiene le rate di un altro', () => {
  /* Sembra ovvio e non lo è: senza il filtro, il documento che si manda a un
     collaboratore gli mostra i clienti e i compensi di tutti gli altri. */
  const p = E.provvigionale(PER);
  deve(!p.righe.some(r => r.titolo_id === 't7'), 'la rata di c2 è finita nell\'estratto conto di c1');
  const tutti = E.provvigionale(Object.assign({}, PER, { collaboratore_id: null }));
  deve(tutti.righe.length === 4, 'senza filtro le righe sono ' + tutti.righe.length + ' (attese 4)');
  return 'c1 vede 3 righe, l\'agenzia intera ne vede 4';
});

prova('i sospesi sono l\'esatto complemento: una rata sta di qua o di là, mai in tutti e due', () => {
  const p = E.provvigionale(PER);
  const s = E.daVersare({ titoli: TITOLI, polizze: POLIZZE, collaboratore_id: 'c1', dal: '2026-09-01', al: '2026-09-30', oggi: '2026-09-18' });
  const inProv = new Set(p.righe.map(r => r.titolo_id));
  const inSosp = new Set(s.righe.map(r => r.titolo_id));
  const doppie = [...inProv].filter(x => inSosp.has(x));
  deve(!doppie.length, 'rate contate due volte: ' + doppie.join(' '));
  deve(s.totali.righe === 2 && s.totali.importo === 165, 'sospesi: ' + s.totali.righe + ' righe per ' + s.totali.importo);
  /* Scaduta = la data entro cui quei soldi dovevano esserci è passata. */
  deve(s.totali.scadute === 1 && s.totali.importo_scaduto === 110, 'scadute: ' + s.totali.scadute + ' per ' + s.totali.importo_scaduto);
  const sc = s.righe.find(r => r.titolo_id === 't5');
  deve(sc.giorni === 13, 'giorni di ritardo: ' + sc.giorni + ' (dal 05/09 al 18/09)');
  return '2 sospesi per 165,00, di cui 1 scaduto da 13 giorni';
});

prova('una rata stornata non la deve più nessuno', () => {
  const s = E.daVersare({ titoli: [{ id: 's1', polizza_id: 'pol-1', stato: 'stornato', data_scadenza: '2026-09-01', importo_lordo: 500, collaboratore_id: 'c1' }], polizze: POLIZZE, oggi: '2026-09-18' });
  deve(s.righe.length === 0, 'una rata stornata viene ancora chiesta al collaboratore');
  return 'stornata = fuori';
});

prova('la percentuale si cerca per prodotto esatto, non per somiglianza', () => {
  /* «RC Auto» che prende anche «RC Auto Storico» sarebbe una percentuale
     applicata a un prodotto diverso, e nessuno se ne accorgerebbe guardando
     il totale: il numero resta plausibile. */
  deve(E.percentualeDi(SCHEMA, 'RC Auto').perc === 60, 'il caso esatto non si trova');
  deve(E.percentualeDi(SCHEMA, '  rc   auto ').perc === 60, 'spazi e maiuscole non vengono normalizzati');
  deve(E.percentualeDi(SCHEMA, 'RC Auto Storico') === null, 'una corrispondenza parziale applica la percentuale di un altro prodotto');
  deve(E.percentualeDi(SCHEMA, 'Infortuni') === null, 'un prodotto non concordato trova una percentuale');
  deve(E.percentualeDi(SCHEMA, '') === null, 'un prodotto vuoto trova una percentuale');
  /* Zero è un accordo valido e non va confuso con «non c'è». */
  deve(E.percentualeDi([{ prodotto: 'X', perc: 0 }], 'X').perc === 0, 'una percentuale a zero viene letta come assente');
  return 'esatto sì, somigliante no, zero è un accordo';
});

prova('la provvigione speciale si vede ma non cambia il conto', () => {
  const r = E.rigaProvvigionale(TITOLI[1], POLIZZE['pol-2'], SCHEMA);
  deve(r.speciale === true, 'il flag «speciale» non arriva fino alla riga');
  deve(r.nota_accordo === 'accordo del 2025', 'la nota dell\'accordo non arriva: ' + r.nota_accordo);
  deve(r.quota_collaboratore === 16.67, 'il flag ha cambiato il calcolo: ' + r.quota_collaboratore);
  return 'etichetta sì, aritmetica no';
});

prova('due percentuali per lo stesso prodotto: vince la speciale, e si dichiara', () => {
  const doppio = [{ prodotto: 'Casa', perc: 50 }, { prodotto: 'Casa', perc: 70, speciale: true }];
  const acc = E.percentualeDi(doppio, 'Casa');
  deve(acc.perc === 70 && acc.ambigua === true, 'scelta: ' + acc.perc + ', ambigua: ' + acc.ambigua);
  const r = E.rigaProvvigionale(TITOLI[1], POLIZZE['pol-2'], doppio);
  deve(r.daConfermare.length === 1 && /più percentuali/.test(r.daConfermare[0]), 'l\'ambiguità non si dichiara: ' + JSON.stringify(r.daConfermare));
  return '70% con l\'avviso, non 50% in silenzio';
});

prova('gli arrotondamenti dei negativi non spostano un centesimo nel verso sbagliato', () => {
  /* Gli storni esistono, e `Math.round(-0.5)` in JavaScript fa `-0`: cioè
     arrotonda verso l'ALTO anche i negativi. Su un rimborso quel centesimo
     va dalla parte sbagliata. */
  deve(E.cent(-0.005) === -0.01, 'il negativo arrotonda verso lo zero: ' + E.cent(-0.005));
  deve(E.cent(0.005) === 0.01, 'il positivo non arrotonda per eccesso: ' + E.cent(0.005));
  deve(E.cent(null) === null, 'un valore assente diventa un numero');
  const storno = E.rigaProvvigionale({ id: 'st', polizza_id: 'pol-1', provvigione: -41.21, importo_lordo: -390 }, POLIZZE['pol-1'], SCHEMA);
  deve(storno.quota_collaboratore === -24.73, 'quota sullo storno: ' + storno.quota_collaboratore);
  deve(E.cent(storno.quota_collaboratore + storno.margine_agenzia) === -41.21, 'lo storno non torna: ' + storno.margine_agenzia);
  return '-0,005 → -0,01, e lo storno torna esatto';
});

prova('il riepilogo d\'agenzia tiene le rate non assegnate in una riga sua', () => {
  /* Distribuirle a caso falserebbe i compensi di qualcuno; farle sparire
     nasconderebbe esattamente il lavoro da fare. */
  const titoli = TITOLI.concat([T({ id: 't8', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-09-11', importo_lordo: 390, provvigione: 41.21, collaboratore_id: null })]);
  const g = E.perCollaboratore(titoli, POLIZZE, { c1: 'Mario', c2: 'Luca' },
    { schemi: { c1: SCHEMA, c2: SCHEMA }, dal: '2026-09-01', al: '2026-09-30', oggi: '2026-09-18' });
  const nessuno = g.find(x => !x.assegnato);
  deve(nessuno, 'le rate senza collaboratore sono sparite dal riepilogo');
  deve(nessuno.provvigioni.righe === 1, 'righe non assegnate: ' + nessuno.provvigioni.righe);
  deve(g[g.length - 1] === nessuno, 'le non assegnate non sono in fondo: sono un lavoro, non una persona');
  deve(g.filter(x => x.assegnato).length === 2, 'collaboratori nel riepilogo: ' + g.filter(x => x.assegnato).length);
  return '2 persone + 1 riga «non assegnate», in fondo';
});

prova('M4.2 · la rata incassata DAL collaboratore è un credito dell\'agenzia verso di lui, finché non la rimette', () => {
  /* Tre conti diversi, e questo è il terzo: non è un sospeso (la rata È
     incassata) e non è una provvigione (è premio, non compenso). */
  const titoli = TITOLI.concat([
    T({ id: 'c1a', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-09-11', importo_lordo: 120, pagatore_tipo: 'collaboratore', pagatore_collaboratore_id: 'c1' }),
    T({ id: 'c1b', polizza_id: 'pol-2', stato: 'incassato', incassato_il: '2026-09-12', importo_lordo: 80, pagatore_tipo: 'collaboratore', pagatore_collaboratore_id: 'c1', rimesso_il: '2026-09-14' }),
    /* prodotta da c1 ma INCASSATA da c2: il credito è verso c2 */
    T({ id: 'c2a', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-09-13', importo_lordo: 50, pagatore_tipo: 'collaboratore', pagatore_collaboratore_id: 'c2' }),
    /* pagata dal cliente: non è un credito verso nessuno */
    T({ id: 'cli', polizza_id: 'pol-1', stato: 'incassato', incassato_il: '2026-09-13', importo_lordo: 999, pagatore_tipo: 'cliente' }),
    /* segnata «collaboratore» ma ancora aperta: i soldi non ci sono, niente credito */
    T({ id: 'ap', polizza_id: 'pol-1', stato: 'aperto', importo_lordo: 777, pagatore_tipo: 'collaboratore', pagatore_collaboratore_id: 'c1' }),
    /* di nessuno: la riga «non assegnate» del riepilogo */
    T({ id: 'na', polizza_id: 'pol-1', stato: 'aperto', data_scadenza: '2026-09-20', importo_lordo: 10, collaboratore_id: null })
  ]);
  const c1 = E.creditoAgenzia({ titoli, polizze: POLIZZE, collaboratore_id: 'c1' });
  deve(c1.totali.aperte === 1 && c1.totali.importo_aperto === 120, 'credito aperto verso c1: ' + JSON.stringify(c1.totali) + ' (atteso 1 rata, 120)');
  const c1tutte = E.creditoAgenzia({ titoli, polizze: POLIZZE, collaboratore_id: 'c1', ancheRimesse: true });
  deve(c1tutte.totali.righe === 2 && c1tutte.totali.importo === 200, 'con le rimesse: ' + JSON.stringify(c1tutte.totali));
  const c2 = E.creditoAgenzia({ titoli, polizze: POLIZZE, collaboratore_id: 'c2' });
  deve(c2.totali.importo_aperto === 50, 'il credito guarda chi ha PAGATO, non chi ha prodotto: ' + c2.totali.importo_aperto);
  /* E il riepilogo d'agenzia lo porta accanto agli altri due conti. */
  const g = E.perCollaboratore(titoli, POLIZZE, { c1: 'Uno', c2: 'Due' }, { schemi: { c1: SCHEMA }, dal: '2026-09-01', al: '2026-09-30' });
  const r1 = g.find(x => x.collaboratore_id === 'c1'), r2 = g.find(x => x.collaboratore_id === 'c2');
  deve(r1.credito.importo_aperto === 120 && r2.credito.importo_aperto === 50, 'il riepilogo non porta il credito: ' + JSON.stringify([r1.credito, r2.credito]));
  deve(!g.find(x => !x.assegnato).credito.importo_aperto, 'le rate non assegnate hanno un credito: verso chi?');
  return 'c1: 120 aperto (80 rimesso), c2: 50; il cliente e la rata aperta non contano';
});

/* ═══ M6 — IL DOCUMENTO CHE ESCE DI CASA (20/09/2026) ═══════════════════════
   Il testo dell'email stava dentro `index.html`, scritto a mano. Sta nel
   motore per la stessa ragione dei testi previdenziali (§5): l'unica cosa che
   esce di casa è l'unica che va provata. */

prova('IL CASO LO DECIDE IL RISULTATO: non si manda un sollecito a chi non deve niente', () => {
  const vuotoV = E.testiInvio({ tipo: 'versare', nome: 'Anna', totali: { righe: 0, importo: 0 } }, {});
  deve(vuotoV.bloccante && !vuotoV.corpo, 'un sollecito senza sospesi esce lo stesso');
  const vuotoP = E.testiInvio({ tipo: 'provvigioni', nome: 'Anna', totali: { conteggiate: 0 }, daConfermare: [] }, {});
  deve(vuotoP.bloccante && !vuotoP.corpo, 'un provvigionale vuoto esce lo stesso');
  /* E i casi veri si distinguono da soli: con le scadute e senza. */
  deve(E.casoInvio({ tipo: 'versare', totali: { righe: 2, scadute: 1 } }) === 'scadute', 'le scadute non si riconoscono');
  deve(E.casoInvio({ tipo: 'versare', totali: { righe: 2, scadute: 0 } }) === 'in-corso', 'senza scadute il caso è sbagliato');
  deve(E.casoInvio({ tipo: 'provvigioni', totali: { conteggiate: 3 }, daConfermare: [] }) === 'tutto', 'caso «tutto» sbagliato');
  deve(E.casoInvio({ tipo: 'provvigioni', totali: { conteggiate: 3 }, daConfermare: [{}] }) === 'parziale', 'caso «parziale» sbagliato');
  return 'due bloccanti, quattro casi veri';
});

prova('IL MODELLO CORTO NON SI MANGIA LA PARTE SCOMODA', () => {
  /* È la regola per cui i due modelli si possono avere senza pericolo: `b` è
     asciutto, non reticente. Le righe fuori dal totale sono esattamente la
     cosa che un testo breve sarebbe tentato di togliere — e toglierla vuol
     dire mandare «ti spettano 72,30» facendo credere che siano tutte. */
  const v = { tipo: 'provvigioni', nome: 'Anna', totali: { conteggiate: 3, provvigione_compagnia: 120.5, quota_collaboratore: 72.3 }, daConfermare: [{}, {}] };
  for (const m of E.MODELLI) {
    const r = E.testiInvio(v, { modello: m });
    deve(/2<\/b> rate non sono in questo totale/.test(r.corpo), 'il modello ' + m + ' non dice quante restano fuori');
    deve(/72,30/.test(r.corpo), 'il modello ' + m + ' non dice quanto spetta');
    deve(r.avvisi.length === 1, 'il modello ' + m + ' non avvisa chi sta mandando');
  }
  /* E il numero che si nomina è quello delle rate CONTEGGIATE, mai il totale
     delle righe: «ti spettano X» con dentro delle stime è la lite che si
     perde (§17). */
  const a = E.testiInvio(v, { modello: 'a' });
  deve(!/5<\/b> rate incassate/.test(a.corpo), 'il testo conta anche le righe da confermare fra le incassate');
  return 'due modelli, la stessa parte scomoda';
});

prova('il documento che chiede dei soldi non inventa un IBAN', () => {
  const v = { tipo: 'versare', nome: 'Anna', totali: { righe: 2, importo: 300, scadute: 1, importo_scaduto: 150 } };
  const senza = E.testiInvio(v, { modello: 'b', coordinate: C.coordinateRimesse([{ nome: 'A', attivo: true }]) });
  deve(!/IT\d\d/.test(senza.corpo), 'senza coordinate il testo si inventa un IBAN');
  deve(senza.avvisi.length === 1 && /spunta/.test(senza.avvisi[0]), 'chi sta mandando non viene avvisato: ' + JSON.stringify(senza.avvisi));
  deve(/a parte/.test(senza.corpo), 'il testo non dice al collaboratore come farà ad avere le coordinate');
  const con = E.testiInvio(v, { modello: 'b', coordinate: C.coordinateRimesse([{ nome: 'R', attivo: true, rimesse: true, iban: 'IT60X0542811101000000123456', intestatario: 'Agenzia' }]) });
  deve(/IT60 X054 2811 1010 0000 0123 456/.test(con.corpo) && /Agenzia/.test(con.corpo), 'con le coordinate non le scrive: ' + con.corpo);
  deve(!con.avvisi.length, 'avvisa anche quando è tutto a posto');
  /* Nessuna data di pagamento promessa: non l'ha decisa nessuno. */
  const p = E.testiInvio({ tipo: 'provvigioni', nome: 'A', totali: { conteggiate: 1, provvigione_compagnia: 10, quota_collaboratore: 6 }, daConfermare: [] }, {});
  deve(!/entro il|entro \d/.test(p.corpo), 'il testo promette una data di pagamento che nessuno ha deciso');
  return 'IBAN solo se c\'è, e nessuna data promessa';
});

prova('un documento che esce di casa non scrive «1 rate»', () => {
  /* Chi lo riceve legge un programma invece di un'agenzia, e su un documento
     su cui si litiga la forma è metà della credibilità. */
  const uno = E.testiInvio({ tipo: 'versare', nome: 'A', totali: { righe: 1, importo: 150, scadute: 1, importo_scaduto: 150 } }, { modello: 'b' });
  deve(/1<\/b> rata per/.test(uno.corpo) && /1<\/b> già scaduta/.test(uno.corpo), 'singolare sbagliato: ' + uno.corpo);
  const tanti = E.testiInvio({ tipo: 'versare', nome: 'A', totali: { righe: 3, importo: 150, scadute: 2, importo_scaduto: 150 } }, { modello: 'b' });
  deve(/3<\/b> rate per/.test(tanti.corpo) && /2<\/b> già scadute/.test(tanti.corpo), 'plurale sbagliato: ' + tanti.corpo);
  const p1 = E.testiInvio({ tipo: 'provvigioni', nome: 'A', totali: { conteggiate: 1, provvigione_compagnia: 10, quota_collaboratore: 6 }, daConfermare: [{}] }, { modello: 'b' });
  deve(/1<\/b> rata incassata/.test(p1.corpo) && /1<\/b> rata non è/.test(p1.corpo), 'singolare sbagliato sul provvigionale: ' + p1.corpo);
  return 'singolare e plurale, nei due documenti';
});


console.log('\n══ ESTRATTO CONTO DEL COLLABORATORE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nESTRATTO CONTO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
