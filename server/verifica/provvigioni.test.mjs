// ═══════════════════════════════════════════════════════════════════════════════
//  PROVVIGIONI — tariffe/motore/provvigioni.js  (20/09/2026, brief #02 M2)
//
//  Le prove che, se saltano, pagano qualcuno più o meno di quello che gli
//  spetta. Un estratto conto è un documento su cui si litiga, e ogni riga qui
//  sotto difende un numero che finisce là dentro.
//
//  Dati tutti inventati (regola di casa §8.3), ma le FORME sono quelle vere:
//  «PRIMA» maiuscolo contro «Prima» del catalogo, la provvigione dichiarata
//  che non è una percentuale tonda del premio, HDI che non dichiara niente.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../../tariffe/motore/provvigioni.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Il catalogo come sta in `quote_compagnie`: il nome pulito e gli alias. */
const CATALOGO = [
  { nome: 'Prima', alias: ['Prima Assicurazioni', 'Prima.it'] },
  { nome: 'HDI',   alias: ['HDI Assicurazioni', 'HD'] }
];

/* Tariffe: Prima RC Auto al 10% con retro 60; HDI persona al 20% con retro 50.
   La riga di prodotto su Prima affina il ramo. */
const TARIFFE = [
  { id: 't1', compagnia: 'Prima', ramo: 'rca',     prodotto: null,    aliquota_agenzia: 10, retrocessione_default: 60, dal: '2026-01-01', al: null },
  { id: 't2', compagnia: 'Prima', ramo: 'rca',     prodotto: 'BLACK', aliquota_agenzia: 12, retrocessione_default: 50, dal: '2026-01-01', al: null },
  { id: 't3', compagnia: 'HDI',   ramo: 'persona', prodotto: null,    aliquota_agenzia: 20, retrocessione_default: 50, dal: '2026-01-01', al: null },
  /* Storicizzazione: fino al 2025 la RC Auto di Prima stava al 8%. */
  { id: 't0', compagnia: 'Prima', ramo: 'rca',     prodotto: null,    aliquota_agenzia: 8,  retrocessione_default: 40, dal: '2024-01-01', al: '2025-12-31' }
];

const OVERRIDE = [
  /* Anna ha un accordo generale al 55, e uno specifico su Prima RC Auto al 70. */
  { id: 'o1', collaboratore_id: 'anna', compagnia: null,    ramo: null,  prodotto: null, retrocessione: 55, dal: '2026-01-01', al: null },
  { id: 'o2', collaboratore_id: 'anna', compagnia: 'Prima', ramo: 'rca', prodotto: null, retrocessione: 70, dal: '2026-01-01', al: null },
  /* Bruno ha ZERO su HDI, ed è un accordo, non un vuoto. */
  { id: 'o3', collaboratore_id: 'bruno', compagnia: 'HDI',  ramo: null,  prodotto: null, retrocessione: 0,  dal: '2026-01-01', al: null }
];

const GRUPPI = [
  { id: 'g1', nome: 'Squadra Nord', capo_id: 'carla', indiretto: 10, attivo: true, dal: '2026-01-01', al: null }
];
const MEMBRI = [
  { id: 'm1', gruppo_id: 'g1', collaboratore_id: 'anna',  indiretto: null, dal: '2026-01-01', al: null },
  { id: 'm2', gruppo_id: 'g1', collaboratore_id: 'bruno', indiretto: 4,    dal: '2026-01-01', al: null },
  /* Il capo è membro del suo stesso gruppo: capita, ed è il caso insidioso. */
  { id: 'm3', gruppo_id: 'g1', collaboratore_id: 'carla', indiretto: null, dal: '2026-01-01', al: null }
];

/* Il catalogo si passa SEMPRE: è così che i nomi scritti sulle polizze
   ritrovano la tariffa intestata al nome pulito. */
const BASE = { tariffe: TARIFFE, override: OVERRIDE, gruppi: GRUPPI, membri: MEMBRI, catalogo: CATALOGO, data: '2026-09-20' };
const calc = (o) => P.calcola(Object.assign({}, BASE, o));

prova('REGOLA 1 · la provvigione DICHIARATA dalla compagnia vince sempre sull\'aliquota', () => {
  /* Il caso vero: su BLACK l'aliquota concordata è 12%, ma la compagnia ha
     dichiarato 41,21 su 390 — cioè il 10,57%. Sul portafoglio vero le aliquote
     reali vanno da 0% a 13,85% sullo stesso prodotto, perché la provvigione
     cambia garanzia per garanzia. Se il motore «correggesse» al 12% metterebbe
     46,80 € dove l'agenzia ne ha incassati 41,21. */
  const r = calc({ compagnia: 'PRIMA', ramo: 'rca', prodotto: 'BLACK', premio: 390, provvigione_dichiarata: 41.21 });
  deve(r.provvigione_agenzia === 41.21, 'la dichiarata è stata sovrascritta: ' + r.provvigione_agenzia);
  deve(r.stimata === false, 'una provvigione dichiarata è stata marcata come stimata');
  /* E lo scostamento si DICE, invece di correggere in silenzio. */
  deve(r.scostamento && r.scostamento.previsto === 46.8, 'lo scostamento non è calcolato: ' + JSON.stringify(r.scostamento));
  deve(r.scostamento.delta === -5.59, 'delta: ' + r.scostamento.delta);
  return '41,21 dichiarati restano 41,21 · previsti 46,80 · scostamento -5,59';
});

prova('REGOLA 2 · dove la compagnia non dichiara si stima, e la stima viaggia MARCATA', () => {
  /* HDI: sul database vero sono 38 rate su 38 senza provvigione. */
  const r = calc({ compagnia: 'HDI Assicurazioni', ramo: 'persona', premio: 200, provvigione_dichiarata: null });
  deve(r.provvigione_agenzia === 40, 'stima con aliquota 20%: ' + r.provvigione_agenzia);
  deve(r.stimata === true, 'la stima non è marcata');
  deve(/non ha dichiarato/.test(r.motivi.join(' ')), 'la stima non dice perché: ' + r.motivi.join(' | '));
  /* E nei totali resta FUORI da quelli veri: «una riga stimata dentro un
     totale è una lite che si perde» (§17). */
  const vera = calc({ compagnia: 'PRIMA', ramo: 'rca', premio: 390, provvigione_dichiarata: 41.21 });
  const t = P.totali([r, vera]);
  deve(t.provvigione_agenzia === 41.21, 'la stima è entrata nei totali veri: ' + t.provvigione_agenzia);
  deve(t.stimate === 1 && t.provvigione_stimata === 40, 'le stime non si contano a parte: ' + JSON.stringify(t));
  deve(t.premi === 590, 'i premi sono veri in tutti e due i casi: ' + t.premi);
  return 'stima 40,00 fuori dai totali veri, premi 590 dentro';
});

prova('REGOLA 3 · la retrocessione si applica alla PROVVIGIONE, mai al premio', () => {
  const r = calc({ compagnia: 'Prima', ramo: 'rca', premio: 390, provvigione_dichiarata: 41.21, collaboratore_id: 'anna' });
  /* Anna ha l'override specifico su Prima RC Auto: 70% di 41,21 = 28,85.
     Il 70% del PREMIO farebbe 273 €, un numero credibile e sei volte più
     grande di quello che l'agenzia incassa davvero. */
  deve(r.perc_retrocessione === 70 && r.fonte_retrocessione === 'collaboratore', 'gerarchia: ' + r.perc_retrocessione + ' da ' + r.fonte_retrocessione);
  deve(r.quota_collaboratore === 28.85, 'quota: ' + r.quota_collaboratore);
  deve(r.quota_collaboratore < r.premio * 0.2, 'la quota è stata calcolata sul premio');
  return '70% di 41,21 = 28,85 (non 273 sul premio)';
});

prova('REGOLA 4 · il margine si ricava per DIFFERENZA, non con una seconda percentuale', () => {
  /* Il caso dei due arrotondamenti: 33,33 al 50% fa 16,665. Due arrotondamenti
     separati darebbero 16,67 + 16,67 = 33,34, un centesimo in più del totale —
     in un documento che si manda fuori (§17). */
  const r = calc({ compagnia: 'HDI', ramo: 'persona', premio: 166.65, provvigione_dichiarata: 33.33, collaboratore_id: 'bruno' });
  deve(r.perc_retrocessione === 0, 'lo ZERO di Bruno non è stato letto come accordo: ' + r.perc_retrocessione);
  /* Bruno ha zero su HDI: quota 0, indiretto 4% al capo, margine il resto. */
  deve(r.quota_collaboratore === 0, 'quota: ' + r.quota_collaboratore);
  deve(r.indiretto === 1.33, 'indiretto 4% di 33,33: ' + r.indiretto);
  deve(r.margine_agenzia === 32, 'margine: ' + r.margine_agenzia);
  const somma = P.cent(r.quota_collaboratore + r.indiretto + r.margine_agenzia);
  deve(somma === r.provvigione_agenzia, 'i tre pezzi non tornano con la provvigione: ' + somma + ' vs ' + r.provvigione_agenzia);
  return 'quota 0 + indiretto 1,33 + margine 32,00 = 33,33 esatti';
});

prova('REGOLA 5 · niente accordo, niente conto — e non esiste una percentuale di riserva', () => {
  /* Compagnia senza tariffa: non si calcola, e si dice. */
  const senza = calc({ compagnia: 'Allianz', ramo: 'rca', premio: 300, provvigione_dichiarata: null });
  deve(senza.provvigione_agenzia === null, 'ha inventato una provvigione: ' + senza.provvigione_agenzia);
  deve(/Nessuna tariffa/.test(senza.motivi.join(' ')), 'motivo: ' + senza.motivi.join(' | '));
  /* Collaboratore senza retrocessione concordata su quel ramo: la provvigione
     dell'agenzia c'è, la sua quota NO, e la riga esce col motivo. */
  const r = calc({ compagnia: 'HDI', ramo: 'persona', premio: 200, provvigione_dichiarata: 40, collaboratore_id: 'dario' });
  deve(r.provvigione_agenzia === 40, 'la provvigione di agenzia dovrebbe esserci');
  /* Dario non ha override: cade sul default della tariffa HDI, che è 50. */
  deve(r.perc_retrocessione === 50 && r.fonte_retrocessione === 'default', 'non è caduto sul default: ' + JSON.stringify(r));
  /* Ma su un ramo senza tariffa nessun default esiste. */
  const r2 = calc({ compagnia: 'HDI', ramo: 'cauzioni', premio: 200, provvigione_dichiarata: 40, collaboratore_id: 'dario' });
  deve(r2.quota_collaboratore === null, 'ha inventato una quota: ' + r2.quota_collaboratore);
  deve(/Nessuna retrocessione concordata/.test(r2.motivi.join(' ')), 'motivo: ' + r2.motivi.join(' | '));
  return 'niente tariffa e niente retrocessione: due motivi, zero numeri inventati';
});

prova('REGOLA 6 · si usa l\'aliquota vigente ALLA DATA, non quella di oggi', () => {
  /* Una rata del 2025 deve continuare a dire quello che diceva allora: gli
     estratti conto già mandati sono documenti su cui si è litigato. */
  const vecchia = calc({ compagnia: 'Prima', ramo: 'rca', premio: 1000, provvigione_dichiarata: null, data: '2025-06-01' });
  deve(vecchia.aliquota === 8 && vecchia.provvigione_agenzia === 80, 'aliquota del 2025: ' + vecchia.aliquota);
  const nuova = calc({ compagnia: 'Prima', ramo: 'rca', premio: 1000, provvigione_dichiarata: null, data: '2026-09-20' });
  deve(nuova.aliquota === 10 && nuova.provvigione_agenzia === 100, 'aliquota del 2026: ' + nuova.aliquota);
  /* E la retrocessione segue la stessa riga storica. */
  const vr = P.retrocessionePer([], TARIFFE, { compagnia: 'Prima', ramo: 'rca', collaboratore_id: 'x', data: '2025-06-01' });
  deve(vr.perc === 40, 'la retrocessione del 2025: ' + vr.perc);
  return '2025 → 8% e retro 40 · 2026 → 10% e retro 60';
});

prova('il più specifico vince: prodotto sopra ramo, override sopra default', () => {
  /* Su BLACK c'è la riga di prodotto al 12%, che batte quella di ramo al 10%. */
  const b = calc({ compagnia: 'Prima', ramo: 'rca', prodotto: 'BLACK', premio: 100, provvigione_dichiarata: null });
  deve(b.aliquota === 12, 'la riga di prodotto non ha vinto: ' + b.aliquota);
  const g = calc({ compagnia: 'Prima', ramo: 'rca', prodotto: 'ALTRO', premio: 100, provvigione_dichiarata: null });
  deve(g.aliquota === 10, 'un prodotto senza riga sua non è caduto sul ramo: ' + g.aliquota);
  /* Anna: l'override su Prima RC Auto (70) batte il suo accordo generale (55). */
  const a1 = P.retrocessionePer(OVERRIDE, TARIFFE, { collaboratore_id: 'anna', compagnia: 'Prima', ramo: 'rca', data: '2026-09-20' });
  deve(a1.perc === 70, 'override specifico: ' + a1.perc);
  /* Su un altro ramo resta l'accordo generale. */
  const a2 = P.retrocessionePer(OVERRIDE, TARIFFE, { collaboratore_id: 'anna', compagnia: 'HDI', ramo: 'persona', data: '2026-09-20' });
  deve(a2.perc === 55 && a2.fonte === 'collaboratore', 'accordo generale: ' + JSON.stringify(a2));
  return 'prodotto > ramo · override specifico > generale > default';
});

prova('l\'indiretto: il capo non lo prende su se stesso, e l\'override del membro vince', () => {
  /* Anna: nessun indiretto sul membro → vale il 10% del gruppo. */
  const a = calc({ compagnia: 'Prima', ramo: 'rca', premio: 390, provvigione_dichiarata: 41.21, collaboratore_id: 'anna' });
  deve(a.perc_indiretto === 10 && a.indiretto === 4.12, 'indiretto di Anna: ' + a.indiretto);
  deve(a.capo_id === 'carla', 'il capo: ' + a.capo_id);
  /* Bruno ha il suo 4% sul membro, che batte il 10% del gruppo. */
  const b = calc({ compagnia: 'HDI', ramo: 'persona', premio: 200, provvigione_dichiarata: 40, collaboratore_id: 'bruno' });
  deve(b.perc_indiretto === 4 && b.indiretto === 1.6, 'l’override del membro non ha vinto: ' + JSON.stringify(b));
  /* IL CASO INSIDIOSO: Carla è il capo ED è membro del suo gruppo. Sulla sua
     produzione non c'è indiretto — altrimenti prenderebbe una retrocessione in
     più travestita da indiretto, sopra la sua quota diretta. */
  const c = calc({ compagnia: 'Prima', ramo: 'rca', premio: 390, provvigione_dichiarata: 41.21, collaboratore_id: 'carla' });
  deve(c.indiretto === null, 'il capo prende l’indiretto su se stesso: ' + c.indiretto);
  deve(/capo del gruppo/.test(c.motivi.join(' ')), 'non dice perché: ' + c.motivi.join(' | '));
  return 'gruppo 10% · membro 4% · capo su di sé 0';
});

prova('i nomi delle compagnie si riconoscono come sono scritti sulle polizze', () => {
  /* La misura vera: sulle polizze c'è «PRIMA» maiuscolo e «HDI Assicurazioni»,
     nel catalogo «Prima» e «HDI». Un confronto esatto non aggancerebbe nemmeno
     una delle 23 polizze di Prima, e le tariffe resterebbero inerti. */
  deve(P.risolviCompagnia('PRIMA', CATALOGO) === 'Prima', 'PRIMA → ' + P.risolviCompagnia('PRIMA', CATALOGO));
  deve(P.risolviCompagnia('HDI Assicurazioni', CATALOGO) === 'HDI', 'alias non risolto');
  deve(P.risolviCompagnia('prima.it', CATALOGO) === 'Prima', 'alias minuscolo non risolto');
  /* Una compagnia che il catalogo non conosce NON si perde e non si aggancia a
     caso: torna com'è scritta (§10 — un nome sconosciuto non si spegne mai). */
  deve(P.risolviCompagnia('Zurich', CATALOGO) === 'Zurich', 'una compagnia fuori catalogo è sparita');
  /* E la tariffa si aggancia davvero passando dal nome della polizza. */
  const r = calc({ compagnia: 'PRIMA', ramo: 'rca', premio: 100, provvigione_dichiarata: null });
  deve(r.aliquota === 10, 'la tariffa non si aggancia a «PRIMA»: ' + r.aliquota);
  return 'PRIMA → Prima, HDI Assicurazioni → HDI, Zurich resta Zurich';
});

prova('una configurazione che paga più del dovuto si DICE', () => {
  /* 80 di retrocessione + 30 di indiretto = 110%: prima o poi qualcuno li
     scrive senza accorgersene, e all'agenzia resterebbe un numero negativo. */
  const r = P.calcola({
    compagnia: 'Prima', ramo: 'rca', premio: 100, provvigione_dichiarata: 100, collaboratore_id: 'anna',
    data: '2026-09-20',
    tariffe: TARIFFE,
    override: [{ collaboratore_id: 'anna', retrocessione: 80, dal: '2026-01-01', al: null }],
    gruppi: [{ id: 'g9', nome: 'X', capo_id: 'carla', indiretto: 30, attivo: true, dal: '2026-01-01', al: null }],
    membri: [{ gruppo_id: 'g9', collaboratore_id: 'anna', dal: '2026-01-01', al: null }]
  });
  deve(r.margine_agenzia === -10, 'margine: ' + r.margine_agenzia);
  deve(/superano la provvigione/.test(r.motivi.join(' ')), 'non avvisa: ' + r.motivi.join(' | '));
  return 'margine -10,00 con l’avviso, invece di un silenzio';
});

prova('la copertura dice quali compagnie e rami del portafoglio non hanno ancora una tariffa', () => {
  const POLIZZE = [
    { compagnia: 'PRIMA', modulo: 'rca', prodotto: 'BLACK' },
    { compagnia: 'PRIMA', modulo: 'rca', prodotto: 'BLACK' },
    { compagnia: 'HDI Assicurazioni', modulo: 'beni', prodotto: 'Rischi Catastrofali Abitazione (HDI)' },
    { compagnia: 'Allianz', modulo: 'vita', prodotto: 'TCM' }
  ];
  const c = P.copertura(POLIZZE, TARIFFE, { catalogo: CATALOGO, data: '2026-09-20' });
  const prima = c.find(x => x.compagnia === 'Prima' && x.ramo === 'rca');
  deve(prima && prima.coperta && prima.polizze === 2, 'Prima RC Auto: ' + JSON.stringify(prima));
  const hdiBeni = c.find(x => x.compagnia === 'HDI' && x.ramo === 'beni');
  deve(hdiBeni && !hdiBeni.coperta, 'HDI beni non ha tariffa e dovrebbe risultare scoperta');
  const allianz = c.find(x => x.compagnia === 'Allianz');
  deve(allianz && !allianz.coperta, 'Allianz non risulta scoperta');
  /* In cima quelle con più polizze: chi configura parte da dove pesa. */
  deve(c[0].polizze === 2, 'non sono ordinate per peso: ' + JSON.stringify(c.map(x => x.polizze)));
  return '4 coppie, 1 coperta, ordinate per numero di polizze';
});

prova('la produzione diretta dell\'agenzia non è un difetto', () => {
  /* Nessun collaboratore: niente retrocessione, niente motivo di errore, e il
     margine è tutta la provvigione. */
  const r = calc({ compagnia: 'Prima', ramo: 'rca', premio: 390, provvigione_dichiarata: 41.21 });
  deve(r.quota_collaboratore === null && r.margine_agenzia === 41.21, 'diretta: ' + JSON.stringify(r));
  deve(r.motivi.length === 0, 'la produzione diretta segnala un problema che non c’è: ' + r.motivi.join(' | '));
  return 'tutta la provvigione all’agenzia, senza avvisi';
});

console.log('\n══ PROVVIGIONI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPROVVIGIONI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
