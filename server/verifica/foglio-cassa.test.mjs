// ═══════════════════════════════════════════════════════════════════════════════
//  IL FOGLIO CASSA — tariffe/motore/foglio-cassa.js  (19/09/2026, M5)
//
//  Le prove che, se saltano, producono una cassa credibile e sbagliata: una
//  rata contata due volte fra le quadrature, una provvigione «diretta» che era
//  di un collaboratore, un totale che non torna con le righe, una quota
//  calcolata con una regola diversa da quella dell'estratto conto.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const F = require('../../tariffe/motore/foglio-cassa.js');
const E = require('../../tariffe/motore/estratto-conto.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const POLIZZE = {
  /* Le date di emissione sono VECCHIE apposta: queste quattro rate sono state
     incassate a settembre su polizze emesse mesi prima, che è il caso normale
     di un portafoglio. Guardando per emissione non devono comparire nel
     periodo di settembre — e se comparissero vorrebbe dire che il filtro sta
     leggendo la data sbagliata. */
  p1: { id: 'p1', numero_polizza: 'NP-1', cliente: 'ROSSI MARIO', compagnia: 'PRIMA', prodotto: 'RC Auto', data_emissione: '2026-03-01' },
  p2: { id: 'p2', numero_polizza: 'NP-2', cliente: 'VERDI LUCA', compagnia: 'PRIMA', prodotto: 'Casa', data_emissione: '2026-03-02' },
  p3: { id: 'p3', numero_polizza: 'NP-3', cliente: 'BIANCHI SRL', compagnia: 'HDI', prodotto: 'Infortuni', data_emissione: '2026-03-03' },
  /* Il caso di Francesco, 21/09/2026: una polizza inserita a mano oggi, con
     la sua rata che nessuno ha ancora incassato. */
  p4: { id: 'p4', numero_polizza: '1-534402332', cliente: 'GIALLI ANNA', compagnia: 'Allianz', prodotto: 'Veicoli Storici', data_emissione: '2026-09-21' },
  /* E una senza data di emissione: non si colloca in nessun periodo, e non si
     indovina dall'effetto (si emette prima che decorra). */
  p5: { id: 'p5', numero_polizza: 'NP-5', cliente: 'NERI UGO', compagnia: 'PRIMA', prodotto: 'Casa' }
};
const SCHEMI = { c1: [{ prodotto: 'RC Auto', perc: 60 }, { prodotto: 'Casa', perc: 50 }] };
const NOMI = { c1: 'Neri Anna' };
const T = (o) => Object.assign({ id: 't', polizza_id: 'p1', tipo: 'rata', stato: 'incassato' }, o);
const TITOLI = [
  /* diretta: nessun collaboratore, provvigione tutta all'agenzia */
  T({ id: 'd1', incassato_il: '2026-09-10', importo_lordo: 390, provvigione: 41.21, mezzo_pagamento: 'bonifico', fonte: 'ssf' }),
  /* indiretta: c1 al 60% su RC Auto */
  T({ id: 'i1', incassato_il: '2026-09-11', importo_lordo: 390, provvigione: 41.21, mezzo_pagamento: 'contante', collaboratore_id: 'c1', pagatore_tipo: 'collaboratore', pagatore_collaboratore_id: 'c1' }),
  /* indiretta: c1 al 50% su Casa */
  T({ id: 'i2', polizza_id: 'p2', incassato_il: '2026-09-12', importo_lordo: 200, provvigione: 33.33, mezzo_pagamento: 'contante', collaboratore_id: 'c1' }),
  /* c1 su Infortuni: nessuna percentuale concordata → fuori dai totali provvigionali, dentro i premi */
  T({ id: 'i3', polizza_id: 'p3', incassato_il: '2026-09-13', importo_lordo: 100, provvigione: 10, mezzo_pagamento: 'pos', collaboratore_id: 'c1' }),
  /* fuori periodo */
  T({ id: 'f1', incassato_il: '2026-08-31', importo_lordo: 999, provvigione: 99 }),
  /* NON incassata: non è cassa */
  T({ id: 'a1', stato: 'aperto', data_scadenza: '2026-09-15', importo_lordo: 555 }),
  /* incassata senza data: non si può collocare in un giorno */
  T({ id: 's1', importo_lordo: 444, provvigione: 4 }),
  /* La polizza inserita a mano il 21/09: emessa nel periodo, rata APERTA. */
  T({ id: 'n1', polizza_id: 'p4', stato: 'aperto', data_scadenza: '2026-09-21', importo_lordo: 148, provvigione: 22 }),
  /* Emessa nel periodo e già incassata lo stesso mese, ma in un altro giorno:
     è il caso che il brief chiama «l'incasso può avere una data diversa». */
  T({ id: 'n2', polizza_id: 'p4', incassato_il: '2026-09-30', importo_lordo: 60, provvigione: 6, mezzo_pagamento: 'pos' }),
  /* Senza data di emissione: fuori da una lettura per emissione, dentro a una
     per incasso — perché la data di incasso ce l'ha. */
  T({ id: 'n3', polizza_id: 'p5', incassato_il: '2026-09-14', importo_lordo: 70, provvigione: 7, mezzo_pagamento: 'bonifico' })
];
const OPZ = { titoli: TITOLI, polizze: POLIZZE, schemi: SCHEMI, nomi: NOMI, dal: '2026-09-01', al: '2026-09-30' };

prova('in cassa entrano solo le rate INCASSATE con la data, nel periodo', () => {
  const r = F.riassunto(OPZ);
  const ids = r.righe.map(x => x.titolo_id).sort();
  deve(JSON.stringify(ids) === JSON.stringify(['d1', 'i1', 'i2', 'i3', 'n2', 'n3']), 'movimenti: ' + ids.join(','));
  deve(r.totali.premi === 1210, 'premi incassati: ' + r.totali.premi + ' (390+390+200+100+60+70)');
  deve(r.righe[0].data === '2026-09-30', 'non è in ordine dal più recente: ' + r.righe[0].data);
  /* Le tre che NON devono esserci, e ognuna per un motivo suo: una rata
     aperta non è un incasso; una incassata senza data non si colloca in un
     giorno; una fuori periodo è fuori periodo. Guardare solo il conto delle
     righe lascerebbe passare uno scambio fra queste. */
  ['n1', 'a1', 's1', 'f1'].forEach(x => deve(!ids.includes(x), x + ' è entrata in cassa e non doveva'));
  /* E guardando per incasso ogni riga è incassata: i due gruppi coincidono,
     ed è la ragione per cui i numeri di sempre non si sono mossi. */
  deve(r.totali.premi_emessi === r.totali.premi, 'per incasso emesso e incassato non coincidono');
  deve(r.totali.righe_da_incassare === 0, 'per incasso compaiono righe da incassare');
  return '6 movimenti, 1.210 € di premi';
});

prova('DIRETTE e INDIRETTE: per collaboratore, e la quota con la STESSA regola dell\'estratto conto', () => {
  const r = F.riassunto(OPZ);
  const t = r.totali;
  /* d1 (41,21) + n2 (6) + n3 (7): tre rate senza collaboratore, tutta
     all'agenzia. Non si chiede nessuna percentuale su una diretta. */
  deve(t.provvigioni_dirette === 54.21, 'dirette: ' + t.provvigioni_dirette);
  /* i1 (41,21) + i2 (33,33) = 74,54; i3 esce: nessuna percentuale. */
  deve(t.provvigioni_indirette === 74.54, 'indirette: ' + t.provvigioni_indirette);
  deve(t.quota_collaboratori === 41.4, 'quota collaboratori: ' + t.quota_collaboratori + ' (24,73 + 16,67)');
  deve(t.margine_agenzia === 87.35, 'margine agenzia: ' + t.margine_agenzia + ' (54,21 dirette + 16,48 + 16,66)');
  /* Una sola riga senza percentuale concordata (i3), e tutte le altre
     conteggiate. La regola che conta più del numero: le due cifre devono
     coprire ESATTAMENTE le righe incassate, altrimenti una riga è sparita
     da tutti e due i conti senza che nessuno la cerchi. */
  deve(t.daConfermare === 1 && t.conteggiati === 5, 'da confermare: ' + t.daConfermare + ', conteggiati ' + t.conteggiati);
  deve(t.conteggiati + t.daConfermare === t.righe_incassate,
    'conteggiate e da confermare non coprono le righe incassate: ' + t.conteggiati + '+' + t.daConfermare + ' vs ' + t.righe_incassate);
  /* La quota di una riga è ESATTAMENTE quella che darebbe l'estratto conto. */
  const i1 = r.righe.find(x => x.titolo_id === 'i1');
  const ec = E.rigaProvvigionale(TITOLI[1], POLIZZE.p1, SCHEMI.c1);
  deve(i1.quota_collaboratore === ec.quota_collaboratore && i1.margine_agenzia === ec.margine_agenzia, 'due regole diverse per la stessa quota: ' + i1.quota_collaboratore + ' vs ' + ec.quota_collaboratore);
  deve(i1.collaboratore === 'Neri Anna' && i1.pagatore_tipo === 'collaboratore', 'la riga non dice chi ha prodotto e chi ha pagato');
  return 'dirette 54,21 · indirette 74,54 · ai collaboratori 41,40 · margine 87,35';
});

/* ═══ SU QUALE DATA SI GUARDA (21/09/2026) ═══════════════════════════════ */
prova('per EMISSIONE compare anche la polizza appena fatta, che nessuno ha ancora incassato', () => {
  /* Il caso esatto di Francesco: polizza inserita oggi, rata che il cliente
     non ha pagato. Per incasso non c'è — giusto, non è un incasso — e prima
     del 21/09/2026 non c'era in nessun modo, perché il foglio cassa sapeva
     leggere una data sola. */
  const e = F.riassunto(Object.assign({}, OPZ, { su: 'emissione' }));
  const ids = e.righe.map(x => x.titolo_id).sort();
  deve(ids.includes('n1'), 'la polizza emessa nel periodo e non incassata non compare: ' + ids.join(','));
  deve(JSON.stringify(ids) === JSON.stringify(['n1', 'n2']), 'per emissione a settembre: ' + ids.join(','));

  /* Le quattro rate incassate a settembre su polizze di marzo NON ci sono:
     se ci fossero, il filtro starebbe leggendo la data dell'incasso. */
  ['d1', 'i1', 'i2', 'i3'].forEach(x => deve(!ids.includes(x), x + ' è di marzo e compare fra le emesse di settembre'));
  /* E quella senza data di emissione resta fuori: non si indovina. */
  deve(!ids.includes('n3'), 'una polizza senza data di emissione è stata collocata lo stesso');

  /* LE DUE DATE STANNO TUTTE E DUE SULLA RIGA — è la seconda metà della
     richiesta: «per la parte dell'incasso può avere anche una data diversa». */
  const n2 = e.righe.find(x => x.titolo_id === 'n2');
  deve(n2.data_emissione === '2026-09-21' && n2.data_incasso === '2026-09-30',
    'la riga non porta tutte e due le date: ' + JSON.stringify([n2.data_emissione, n2.data_incasso]));
  const n1 = e.righe.find(x => x.titolo_id === 'n1');
  deve(n1.data_emissione === '2026-09-21' && n1.data_incasso === null && n1.incassata === false,
    'la rata aperta non si dichiara tale: ' + JSON.stringify([n1.data_incasso, n1.incassata]));
  return '2 righe emesse a settembre, con emissione e incasso accanto';
});

prova('per EMISSIONE emesso e incassato sono due totali, e non si sommano mai', () => {
  const e = F.riassunto(Object.assign({}, OPZ, { su: 'emissione' }));
  const t = e.totali;
  /* n1 (148, aperta) + n2 (60, incassata) = 208 emessi; 60 incassati. */
  deve(t.premi_emessi === 208, 'premi emessi: ' + t.premi_emessi);
  deve(t.premi === 60, 'premi incassati: ' + t.premi);
  deve(t.premi_da_incassare === 148, 'da incassare: ' + t.premi_da_incassare);
  deve(t.righe_emesse === 2 && t.righe_incassate === 1 && t.righe_da_incassare === 1,
    'i conti delle righe non tornano: ' + JSON.stringify([t.righe_emesse, t.righe_incassate, t.righe_da_incassare]));
  /* E l'aritmetica regge da sé: incassato + da incassare = emesso. Se un
     giorno non tornasse, vorrebbe dire che una riga è finita in tutti e due
     o in nessuno dei due. */
  deve(F.cent(t.premi + t.premi_da_incassare) === t.premi_emessi,
    'incassato più da incassare non fa l\'emesso: ' + t.premi + ' + ' + t.premi_da_incassare + ' ≠ ' + t.premi_emessi);

  /* LE PROVVIGIONI SOLO SULL'INCASSATO (§17, decisione 1): la rata aperta ha
     una provvigione dichiarata di 22 € e non deve entrare in nessun totale.
     Contarla vorrebbe dire scrivere in un foglio cassa un compenso che
     matura fra un mese, e nessuno saprebbe che è ancora da incassare. */
  deve(t.provvigioni === 6, 'le provvigioni contano anche le rate non incassate: ' + t.provvigioni);
  deve(t.provvigioni_dirette === 6, 'dirette: ' + t.provvigioni_dirette);

  /* Le quadrature restano sugli incassi anche qui: in cassa una rata non
     incassata non c'è, e una quadratura che la contasse non quadrerebbe mai
     con il cassetto. */
  const somma = (g, k) => F.cent(g.reduce((s, x) => s + x[k], 0));
  ['perMezzo', 'perCompagnia', 'perCollaboratore'].forEach(k => {
    deve(somma(e.quadrature[k], 'premi') === t.premi, k + ': quadra sull\'emesso invece che sull\'incassato');
  });
  return 'emesso 208 · incassato 60 · da incassare 148, provvigioni solo sull\'incassato';
});

prova('le QUADRATURE tornano col totale: nessuna riga contata due volte o persa', () => {
  const r = F.riassunto(OPZ);
  const somma = (g, k) => F.cent(g.reduce((s, x) => s + x[k], 0));
  ['perMezzo', 'perCompagnia', 'perCollaboratore'].forEach(k => {
    const g = r.quadrature[k];
    deve(somma(g, 'premi') === r.totali.premi, k + ': i premi non quadrano: ' + somma(g, 'premi') + ' vs ' + r.totali.premi);
    deve(somma(g, 'provvigioni') === r.totali.provvigioni, k + ': le provvigioni non quadrano');
    deve(g.reduce((s, x) => s + x.movimenti, 0) === r.totali.movimenti, k + ': i movimenti non quadrano');
  });
  const contante = r.quadrature.perMezzo.find(x => x.chiave === 'contante');
  deve(contante && contante.premi === 590 && contante.movimenti === 2, 'per mezzo · contante: ' + JSON.stringify(contante));
  const hdi = r.quadrature.perCompagnia.find(x => x.chiave === 'HDI');
  deve(hdi && hdi.premi === 100 && hdi.provvigioni === 0, 'HDI: i premi sì, la provvigione non concordata no: ' + JSON.stringify(hdi));
  const agenzia = r.quadrature.perCollaboratore.find(x => x.chiave === '(non indicato)');
  deve(agenzia && /Agenzia/.test(agenzia.etichetta) && agenzia.premi === 520 && agenzia.movimenti === 3, 'la produzione diretta non ha la sua riga: ' + JSON.stringify(agenzia));
  return 'tre quadrature, tutte a somma esatta';
});

prova('i filtri: compagnia, mezzo, collaboratore, date — e vuoto non è zero', () => {
  deve(F.riassunto(Object.assign({}, OPZ, { compagnia: 'HDI' })).righe.length === 1, 'filtro compagnia');
  deve(F.riassunto(Object.assign({}, OPZ, { mezzo: 'contante' })).righe.length === 2, 'filtro mezzo');
  deve(F.riassunto(Object.assign({}, OPZ, { collaboratore_id: 'c1' })).righe.length === 3, 'filtro collaboratore');
  deve(F.riassunto(Object.assign({}, OPZ, { dal: '2026-09-12', al: '2026-09-12' })).righe.length === 1, 'filtro date a un giorno');
  const vuoto = F.riassunto(Object.assign({}, OPZ, { compagnia: 'NESSUNA' }));
  deve(vuoto.righe.length === 0 && vuoto.totali.premi === 0 && vuoto.quadrature.perMezzo.length === 0, 'il vuoto non è vuoto');
  return 'quattro filtri';
});

prova('il documento PDF porta gli stessi numeri del foglio, le tre quadrature e i filtri applicati', () => {
  const r = F.riassunto(Object.assign({}, OPZ, { mezzo: 'contante' }));
  const d = F.documentoPdf(r, { dal: '2026-09-01', al: '2026-09-30', mezzo: 'contante', azienda: { ragioneSociale: 'With Us' }, oggi: '2026-09-19' });
  deve(d.tipo === 'FOGLIO CASSA' && /01\/09\/2026/.test(d.numero) && /30\/09\/2026/.test(d.numero), 'intestazione: ' + d.tipo + ' ' + d.numero);
  deve(/Contante/.test(d.sotto), 'il filtro applicato non è scritto sul foglio: ' + d.sotto);
  const tessere = d.blocchi.find(b => b.tipo === 'tessere').voci;
  deve(/590,00/.test(tessere[0].valore), 'i premi sul PDF: ' + tessere[0].valore);
  const titoli = d.blocchi.filter(b => b.tipo === 'titolo').map(b => b.testo);
  deve(titoli.some(t => /per mezzo/.test(t)) && titoli.some(t => /per compagnia/.test(t)) && titoli.some(t => /per collaboratore/.test(t)), 'mancano le quadrature: ' + titoli.join(' | '));
  const tab = d.blocchi.find(b => b.tipo === 'tabella');
  deve(tab.righe.length === 2, 'righe del PDF: ' + tab.righe.length + ' (attese 2, filtrate)');
  deve(/foglio-cassa_2026-09-01_2026-09-30\.pdf/.test(d.nomeFile), 'nome file: ' + d.nomeFile);
  return 'PDF con 2 righe (contante), tessere e tre quadrature';
});

console.log('\n══ FOGLIO CASSA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nFOGLIO CASSA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
