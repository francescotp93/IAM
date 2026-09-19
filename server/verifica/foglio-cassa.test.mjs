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
  p1: { id: 'p1', numero_polizza: 'NP-1', cliente: 'ROSSI MARIO', compagnia: 'PRIMA', prodotto: 'RC Auto' },
  p2: { id: 'p2', numero_polizza: 'NP-2', cliente: 'VERDI LUCA', compagnia: 'PRIMA', prodotto: 'Casa' },
  p3: { id: 'p3', numero_polizza: 'NP-3', cliente: 'BIANCHI SRL', compagnia: 'HDI', prodotto: 'Infortuni' }
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
  T({ id: 's1', importo_lordo: 444, provvigione: 4 })
];
const OPZ = { titoli: TITOLI, polizze: POLIZZE, schemi: SCHEMI, nomi: NOMI, dal: '2026-09-01', al: '2026-09-30' };

prova('in cassa entrano solo le rate INCASSATE con la data, nel periodo', () => {
  const r = F.riassunto(OPZ);
  const ids = r.righe.map(x => x.titolo_id).sort();
  deve(JSON.stringify(ids) === JSON.stringify(['d1', 'i1', 'i2', 'i3']), 'movimenti: ' + ids.join(','));
  deve(r.totali.premi === 1080, 'premi incassati: ' + r.totali.premi + ' (390+390+200+100)');
  deve(r.righe[0].data === '2026-09-13', 'non è in ordine dal più recente: ' + r.righe[0].data);
  return '4 movimenti, 1.080 € di premi';
});

prova('DIRETTE e INDIRETTE: per collaboratore, e la quota con la STESSA regola dell\'estratto conto', () => {
  const r = F.riassunto(OPZ);
  const t = r.totali;
  deve(t.provvigioni_dirette === 41.21, 'dirette: ' + t.provvigioni_dirette);
  /* i1 (41,21) + i2 (33,33) = 74,54; i3 esce: nessuna percentuale. */
  deve(t.provvigioni_indirette === 74.54, 'indirette: ' + t.provvigioni_indirette);
  deve(t.quota_collaboratori === 41.4, 'quota collaboratori: ' + t.quota_collaboratori + ' (24,73 + 16,67)');
  deve(t.margine_agenzia === 74.35, 'margine agenzia: ' + t.margine_agenzia + ' (41,21 + 16,48 + 16,66)');
  deve(t.daConfermare === 1 && t.conteggiati === 3, 'da confermare: ' + t.daConfermare + ', conteggiati ' + t.conteggiati);
  /* La quota di una riga è ESATTAMENTE quella che darebbe l'estratto conto. */
  const i1 = r.righe.find(x => x.titolo_id === 'i1');
  const ec = E.rigaProvvigionale(TITOLI[1], POLIZZE.p1, SCHEMI.c1);
  deve(i1.quota_collaboratore === ec.quota_collaboratore && i1.margine_agenzia === ec.margine_agenzia, 'due regole diverse per la stessa quota: ' + i1.quota_collaboratore + ' vs ' + ec.quota_collaboratore);
  deve(i1.collaboratore === 'Neri Anna' && i1.pagatore_tipo === 'collaboratore', 'la riga non dice chi ha prodotto e chi ha pagato');
  return 'dirette 41,21 · indirette 74,54 · ai collaboratori 41,40 · margine 74,35';
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
  deve(agenzia && /Agenzia/.test(agenzia.etichetta) && agenzia.premi === 390, 'la produzione diretta non ha la sua riga: ' + JSON.stringify(agenzia));
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
