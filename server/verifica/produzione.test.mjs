// ═══════════════════════════════════════════════════════════════════════════════
//  LA PRODUZIONE — tariffe/motore/produzione.js  (21/09/2026)
//
//  Le prove che, saltando, producono un numero credibile e falso su una
//  scrivania: un crollo che non è successo, un portafoglio più povero del
//  vero, una percentuale enorme che non vuol dire niente, e un nome messo
//  accanto alla produzione di un altro.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../../tariffe/motore/produzione.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };
const vicino = (a, b, m) => deve(Math.abs(a - b) < 0.005, m + ' (' + a + ' invece di ' + b + ')');

/* Il campione ricalca la forma di `iam_produzione_confronto`: oggi è il 21
   settembre, quindi settembre è tagliato al 21 nei DUE anni, e ottobre /
   novembre / dicembre dell'anno prima sono fuori confronto. */
const RIGHE = [
  { anno: 2025, mese: 8,  polizze: 10, senza_premio: 2, premio: '1000.00', parziale: false, fuori_confronto: false },
  { anno: 2025, mese: 9,  polizze:  5, senza_premio: 0, premio:  '500.00', parziale: true,  fuori_confronto: false },
  { anno: 2025, mese: 10, polizze: 40, senza_premio: 1, premio: '9000.00', parziale: false, fuori_confronto: true  },
  { anno: 2025, mese: 12, polizze:  6, senza_premio: 0, premio: '1500.00', parziale: false, fuori_confronto: true  },
  { anno: 2026, mese: 8,  polizze: 20, senza_premio: 1, premio: '2000.00', parziale: false, fuori_confronto: false },
  { anno: 2026, mese: 9,  polizze:  7, senza_premio: 0, premio:  '700.00', parziale: true,  fuori_confronto: false }
];

prova('SI CONFRONTA PERIODO CON PERIODO: i mesi fuori confronto non entrano nei totali', () => {
  /* È la regola che vale più di tutte. Dodici mesi dell'anno scorso accanto a
     nove dell'anno in corso disegnano un crollo che non è successo, e succede
     undici mesi su dodici. Qui l'anno prima ha 10.500 € in tutto, ma solo
     1.500 € sono confrontabili: se entrassero tutti, il +33% vero
     diventerebbe un −74% inventato. */
  const c = P.confronto(RIGHE, '2026-09-21');
  vicino(c.totali.precedente.premio, 1500, 'il totale confrontabile dell’anno prima non è 1.500');
  vicino(c.totali.corrente.premio, 2700, 'il totale dell’anno in corso non è 2.700');
  vicino(c.fuori.premio, 10500, 'i mesi fuori confronto non sono 10.500');
  deve(c.variazione_premio.verso === 'su', 'la variazione va nel verso sbagliato: ' + c.variazione_premio.testo);
  vicino(c.variazione_premio.pct, 80, 'la percentuale non è +80%');
  /* E i mesi fuori confronto NON spariscono: si vedono, marcati. */
  deve(c.mesi[9].fuori_confronto === true, 'ottobre dell’anno prima è stato nascosto');
  vicino(c.mesi[9].precedente.premio, 9000, 'ottobre dell’anno prima ha perso il suo importo');
  deve(c.fuori.mesi.length === 2, 'i mesi fuori confronto non sono due');
  return '1.500 contro 2.700 (+80%), 10.500 fuori e visibili';
});

prova('il mese in corso è dichiarato parziale, e il giorno si scrive in faccia', () => {
  /* Un grafico che non dice «al 21 settembre» invita a leggere l'ultima
     colonna come un mese finito, e l'ultima colonna è sempre quella che si
     guarda per prima. */
  const c = P.confronto(RIGHE, '2026-09-21');
  deve(c.mesi[8].parziale === true, 'settembre non risulta parziale');
  deve(c.mesi[7].parziale === false, 'agosto risulta parziale');
  deve(c.avvisi.some(a => /stesso giorno, il 21 settembre/.test(a)),
    'il giorno del taglio non si dichiara: ' + JSON.stringify(c.avvisi));
  return 'parziale dichiarato, e la data scritta';
});

prova('UNA POLIZZA SENZA PREMIO NON VALE ZERO', () => {
  /* §36: sono frazionate di cui la compagnia non ha mandato tutte le rate.
     Sommarle come zero fa un portafoglio più povero del vero — e un numero
     più basso, su una scrivania, nessuno lo mette in dubbio. */
  const c = P.confronto(RIGHE, '2026-09-21');
  deve(c.totali.corrente.senza_premio === 1, 'le polizze senza premio dell’anno in corso non sono 1');
  deve(c.totali.precedente.senza_premio === 2, 'le polizze senza premio confrontabili non sono 2');
  deve(c.avvisi.some(a => /non valgono zero|non vale zero/.test(a)),
    'non si dichiara che quelle polizze restano fuori: ' + JSON.stringify(c.avvisi));
  /* E il conteggio delle polizze le comprende: sono polizze vere. */
  deve(c.totali.corrente.polizze === 27, 'le polizze dell’anno in corso non sono 27');
  return '1 e 2 fuori dagli importi, dentro ai conteggi';
});

prova('DA ZERO NON SI FA UNA PERCENTUALE', () => {
  /* «Da 0 a 5» non è «+500%»: è «prima non ce n’erano». */
  const su   = P.variazione(0, 5);
  deve(su.pct === null, 'una percentuale contro lo zero esce lo stesso: ' + su.pct);
  deve(/non ce n’era/.test(su.testo), 'non lo dice a parole: ' + su.testo);
  deve(su.delta === 5, 'il delta si perde: ' + su.delta);
  const fermo = P.variazione(0, 0);
  deve(fermo.pct === null && fermo.verso === 'pari', 'zero contro zero non è «pari»');
  const giu = P.variazione(8, 0);
  deve(giu.pct === -100, 'da 8 a 0 non è −100%: ' + giu.pct);
  return 'null, non +500%';
});

prova('«NON SI È POTUTO LEGGERE» NON È «NON C’È NIENTE»', () => {
  /* §12, §18. Su un grafico di andamento la confusione è peggio che altrove:
     un grafico piatto si legge come un anno andato male, non come un dato
     che non è arrivato. */
  deve(P.confronto(null, '2026-09-21') === null, 'una lettura fallita diventa un confronto');
  deve(P.confronto(undefined, '2026-09-21') === null, 'un dato assente diventa un confronto');
  deve(P.perProduttore(null) === null, 'una lettura fallita diventa un elenco di produttori');
  deve(P.perChiave(null, 'compagnia') === null, 'una lettura fallita diventa un raggruppamento');
  /* Mentre un elenco vuoto è un confronto vero, con i totali a zero. */
  const c = P.confronto([], '2026-09-21');
  deve(c && c.vuoto === true, 'un elenco vuoto non produce un confronto vuoto');
  deve(c.totali.corrente.polizze === 0, 'un elenco vuoto produce delle polizze');
  deve(c.anno === 2026 && c.anno_prec === 2025, 'senza righe non sa nemmeno che anni confrontare');
  return 'null resta null, [] è zero';
});

prova('CHI HA PRODOTTO NON SI INDOVINA: tre stati, e il codice resta un codice', () => {
  /* §19: `creato_da` è chi ha premuto il tasto dell’importazione. Il codice
     della compagnia è un fatto; il nome dietro il codice è una decisione. */
  const righe = [
    { anno: 2026, mese: 3, collaboratore_id: 'p1', codice_produttore: 'U100', compagnia: 'PRIMA', ramo: 'rca', polizze: 4, senza_premio: 0, premio: '400.00' },
    { anno: 2026, mese: 4, collaboratore_id: null, codice_produttore: 'U200', compagnia: 'PRIMA', ramo: 'rca', polizze: 9, senza_premio: 2, premio: '900.00' },
    { anno: 2026, mese: 5, collaboratore_id: null, codice_produttore: null,   compagnia: 'HDI',   ramo: 'beni', polizze: 2, senza_premio: 0, premio: '200.00' }
  ];
  const r = P.perProduttore(righe, [{ id: 'p1', nome: 'Anna', cognome: 'Neri' }]);
  const stati = r.righe.map(x => x.stato);
  deve(stati.indexOf('persona') >= 0 && stati.indexOf('codice') >= 0 && stati.indexOf('diretta') >= 0,
    'i tre stati non ci sono tutti: ' + stati.join(','));
  const conNome = r.righe.find(x => x.stato === 'persona');
  deve(conNome.etichetta === 'Neri Anna', 'il nome deciso non compare: ' + conNome.etichetta);
  const daAbbinare = r.righe.find(x => x.stato === 'codice');
  deve(daAbbinare.etichetta === 'U200', 'il codice non deciso ha preso un nome: ' + daAbbinare.etichetta);
  deve(daAbbinare.collaboratore_id === null, 'un codice non deciso porta un collaboratore');
  const diretta = r.righe.find(x => x.stato === 'diretta');
  deve(/agenzia/i.test(diretta.etichetta), 'la polizza senza codice non è produzione diretta: ' + diretta.etichetta);
  /* E il lavoro da fare si conta: è la ragione per cui qualcuno si alzerà. */
  deve(r.da_abbinare === 1 && r.polizze_da_abbinare === 9, 'il lavoro da abbinare non si conta');
  return '1 deciso, 1 da abbinare (9 polizze), 1 diretta';
});

prova('nessun codice senza decisione diventa «sconosciuto»', () => {
  /* «Sconosciuto» e «l’agenzia» sono due cose diverse: la prima è un lavoro
     da fare, la seconda è una risposta. Confonderle manda a cercare una
     decisione che non esiste (§43, lo stato «inerte»). */
  const r = P.perProduttore([
    { anno: 2026, mese: 1, collaboratore_id: null, codice_produttore: null, compagnia: 'HDI', ramo: 'beni', polizze: 3, senza_premio: 0, premio: '300.00' }
  ], []);
  deve(r.da_abbinare === 0, 'una polizza senza codice finisce nel lavoro da abbinare');
  deve(r.righe[0].stato === 'diretta', 'una polizza senza codice non è produzione diretta');
  return 'senza codice = agenzia, non lavoro';
});

prova('la somma dei gruppi torna col totale', () => {
  /* Un raggruppamento che non quadra col totale è un totale di cui non ci si
     può fidare, ed è il difetto che non si vede finché non lo si somma. */
  const righe = [
    { anno: 2026, mese: 1, compagnia: 'PRIMA', ramo: 'rca',  polizze: 3, senza_premio: 0, premio: '300.00', collaboratore_id: null, codice_produttore: 'U1' },
    { anno: 2026, mese: 2, compagnia: 'PRIMA', ramo: 'beni', polizze: 2, senza_premio: 1, premio: '150.55', collaboratore_id: null, codice_produttore: 'U1' },
    { anno: 2026, mese: 3, compagnia: 'HDI',   ramo: 'rca',  polizze: 1, senza_premio: 0, premio:  '99.45', collaboratore_id: null, codice_produttore: null }
  ];
  const perComp = P.perChiave(righe, 'compagnia');
  const perRamo = P.perChiave(righe, 'ramo');
  const perProd = P.perProduttore(righe, []);
  vicino(perComp.totale, 550, 'il totale per compagnia non è 550');
  vicino(perRamo.totale, 550, 'il totale per ramo non è 550');
  vicino(perProd.totale, 550, 'il totale per produttore non è 550');
  vicino(perComp.righe.reduce((s, r) => s + r.premio, 0), 550, 'le righe per compagnia non sommano al totale');
  /* E le quote sommano a cento, salvo l’arrotondamento del decimo. */
  const quote = perComp.righe.reduce((s, r) => s + r.quota, 0);
  deve(Math.abs(quote - 100) <= 0.2, 'le quote non fanno cento: ' + quote);
  return '550 da tre strade diverse';
});

prova('su un totale a zero non si fa nessuna fetta', () => {
  /* Una torta senza torta non ha fette: dividere per zero qui vuol dire
     scrivere NaN% accanto a ogni riga. */
  const r = P.perChiave([
    { compagnia: 'PRIMA', polizze: 4, senza_premio: 4, premio: '0' }
  ], 'compagnia');
  deve(r.righe[0].quota === null, 'la quota su un totale a zero non è null: ' + r.righe[0].quota);
  deve(r.righe[0].polizze === 4, 'le polizze si perdono quando il premio è zero');
  return 'quota null, polizze contate';
});

prova('un filtro assente NON filtra', () => {
  /* Confondere «non filtrato» con «nessuno» svuota una schermata e fa
     cercare per mezz’ora un guasto che non c’è (§42). */
  const righe = [
    { anno: 2025, mese: 1, compagnia: 'PRIMA', ramo: 'rca', collaboratore_id: 'p1', codice_produttore: 'U1', polizze: 1, senza_premio: 0, premio: '10' },
    { anno: 2026, mese: 7, compagnia: 'HDI',   ramo: 'beni', collaboratore_id: null, codice_produttore: null, polizze: 1, senza_premio: 0, premio: '20' }
  ];
  deve(P.filtra(righe, {}).length === 2, 'un filtro vuoto toglie delle righe');
  deve(P.filtra(righe, { anno: 2026 }).length === 1, 'il filtro per anno non funziona');
  deve(P.filtra(righe, { compagnia: 'PRIMA' }).length === 1, 'il filtro per compagnia non funziona');
  deve(P.filtra(righe, { collaboratore_id: 'p1' }).length === 1, 'il filtro per collaboratore non funziona');
  deve(P.filtra(righe, { dal_mese: 7 }).length === 1, 'il filtro dal mese non funziona');
  deve(P.filtra(null, { anno: 2026 }) === null, 'un filtro su una lettura fallita produce un elenco');
  return 'vuoto = tutto, null = null';
});

prova('LE DATE NON PASSANO DA new Date(): stessa risposta in cinque fusi orari', () => {
  /* La trappola del 21/09/2026 (§44): una data ISO non ha un fuso orario, e
     farla passare da `new Date(...)` + `toISOString()` gliene dà uno. Qui la
     data di taglio decide quale anno è «in corso» e quale mese è parziale:
     sbagliarla di un giorno il 1° gennaio sposta il confronto di un anno
     intero. Dentro un processo solo il fuso è già quello che è, quindi
     l’unico modo di misurarlo è farlo girare davvero. */
  const dentro = `
    const P = require('${process.cwd()}/tariffe/motore/produzione.js');
    const righe = ${JSON.stringify(RIGHE)};
    const c = P.confronto(righe, '2026-01-01');
    process.stdout.write(JSON.stringify({ anno: c.anno, prec: c.anno_prec,
      parziale: c.mesi[0].parziale, avviso: c.avvisi.find(a => /stesso giorno/.test(a)) || '' }));
  `;
  const gira = (tz) => JSON.parse(execFileSync(process.execPath, ['-e', dentro],
    { env: { ...process.env, TZ: tz }, encoding: 'utf8' }));
  const fusi = ['UTC', 'Europe/Rome', 'Pacific/Kiritimati', 'Pacific/Niue', 'America/New_York'];
  const viste = fusi.map(gira);
  const prima = JSON.stringify(viste[0]);
  viste.forEach((v, i) => deve(JSON.stringify(v) === prima,
    'in ' + fusi[i] + ' la risposta cambia: ' + JSON.stringify(v) + ' invece di ' + prima));
  deve(viste[0].anno === 2026 && viste[0].prec === 2025, 'il 1° gennaio l’anno in corso non è 2026');
  deve(viste[0].parziale === true, 'il 1° gennaio, gennaio non risulta parziale');
  deve(/il 1 gennaio/.test(viste[0].avviso), 'il giorno letto dalla stringa non è il 1: ' + viste[0].avviso);
  return fusi.length + ' fusi, una risposta sola';
});

prova('senza data di riferimento l’anno in corso lo dicono le righe, non l’orologio', () => {
  /* Un confronto che chiede l’ora al computer di chi guarda dà risposte
     diverse a due persone sullo stesso dato. Senza `al`, l’anno più alto
     fra le righe è l’unica risposta che non indovina. */
  const c = P.confronto(RIGHE, '');
  deve(c.anno === 2026 && c.anno_prec === 2025, 'l’anno non si ricava dalle righe: ' + c.anno);
  deve(!c.avvisi.some(a => /stesso giorno/.test(a)), 'dichiara un taglio al giorno che non ha fatto');
  return '2026 dalle righe, e nessun taglio promesso';
});

console.log('\n══ LA PRODUZIONE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPRODUZIONE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
