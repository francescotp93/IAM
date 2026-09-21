// ═══════════════════════════════════════════════════════════════════════════════
//  IL PIANO DELLE RATE — tariffe/motore/piano-rate.js  (21/09/2026)
//
//  La regola, scritta da Francesco:
//    «se una polizza è fatta oggi ed ha frazionamento semestrale, la scadenza
//     di contratto sarà esattamente tra un anno ma tra 6 mesi ci sarà una rata
//     intermedia da incassare»
//
//  Le prove che, saltando, producono una riga di contabilità credibile e
//  sbagliata: una scadenza spostata di un giorno da un fuso orario, una
//  polizza che nasce senza rate perché il premio era scritto nell'altro campo,
//  rate emesse oltre la fine del contratto, e un frazionamento sconosciuto che
//  diventa «annuale» senza dirlo.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const P = require('../../tariffe/motore/piano-rate.js');
const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const ANNO = (d) => ({ data_effetto: d, data_scadenza: P.piuUnAnno(d) });

prova('LA REGOLA DI FRANCESCO, alla lettera', () => {
  /* Polizza fatta oggi, semestrale: scadenza esattamente fra un anno, e fra
     sei mesi una rata intermedia da incassare. */
  const oggi = '2026-09-21';
  deve(P.piuUnAnno(oggi) === '2027-09-21', 'la scadenza non è esattamente fra un anno: ' + P.piuUnAnno(oggi));
  const r = P.piano({ ...ANNO(oggi), frazionamento: 'Semestrale', premio_annuo: 220 });
  deve(r.rate.length === 2, 'le rate non sono due: ' + r.rate.length);
  deve(r.rate[0].data_decorrenza === '2026-09-21' && r.rate[0].importo_lordo === 110, 'la prima rata non è alla decorrenza');
  deve(r.rate[1].data_decorrenza === '2027-03-21', 'la rata intermedia non è a sei mesi: ' + r.rate[1].data_decorrenza);
  deve(r.rate[1].importo_lordo === 110, 'la rata intermedia non è metà premio');
  /* E l'ultima rata sta DENTRO il contratto, non sulla scadenza. */
  deve(r.rate[1].data_decorrenza < '2027-09-21', 'una rata decorre oltre la fine del contratto');
  return 'scadenza +1 anno, rata intermedia a +6 mesi';
});

prova('i cinque frazionamenti, con le loro date', () => {
  const casi = [['Annuale', 1, []], ['Semestrale', 2, ['2027-03-21']],
                ['Quadrimestrale', 3, ['2027-01-21', '2027-05-21']],
                ['Trimestrale', 4, ['2026-12-21', '2027-03-21', '2027-06-21']],
                ['Mensile', 12, null]];
  for (const [fraz, n, date] of casi) {
    const r = P.piano({ ...ANNO('2026-09-21'), frazionamento: fraz, premio_annuo: 1200 });
    deve(r.rate.length === n, fraz + ': ' + r.rate.length + ' rate invece di ' + n);
    if (date) {
      const viste = r.rate.slice(1).map(x => x.data_decorrenza);
      deve(JSON.stringify(viste) === JSON.stringify(date), fraz + ': date ' + viste.join(','));
    }
    const somma = Math.round(r.rate.reduce((s, x) => s + x.importo_lordo, 0) * 100) / 100;
    deve(somma === 1200, fraz + ': la somma delle rate non fa il premio: ' + somma);
  }
  return 'cinque frazionamenti, somme esatte';
});

prova('UN FUSO ORARIO NON DEVE SPOSTARE UNA SCADENZA DI UN GIORNO', () => {
  /* Il difetto vero, misurato il 21/09/2026 su `pnuPiuUnAnno`: costruiva la
     data con `new Date(iso+'T00:00:00')` (mezzanotte LOCALE) e la rileggeva
     con `toISOString()` (UTC). In Italia il risultato tornava indietro di un
     giorno — sempre, anche d'inverno. Nessun errore, nessuna schermata rotta:
     una data credibile e falsa nello scadenzario.

     Si prova facendo girare il motore in un processo con un altro fuso: è
     l'unico modo di misurarlo davvero, perché dentro questo processo il fuso
     è già quello che è. */
  const dentro = `
    const P = require(${JSON.stringify(join(RADICE, 'tariffe/motore/piano-rate.js'))});
    const casi = ['2026-09-21', '2026-01-31', '2026-06-15', '2028-02-29', '2026-12-31'];
    console.log(JSON.stringify(casi.map(d => [d, P.piuUnAnno(d), P.sommaMesi(d, 6)])));
  `;
  const gira = (tz) => JSON.parse(execFileSync(process.execPath, ['-e', dentro],
    { env: { ...process.env, TZ: tz }, encoding: 'utf8' }));
  const fusi = ['UTC', 'Europe/Rome', 'Pacific/Kiritimati', 'Pacific/Niue', 'America/New_York'];
  const primo = JSON.stringify(gira(fusi[0]));
  for (const tz of fusi.slice(1)) {
    const q = JSON.stringify(gira(tz));
    deve(q === primo, 'il piano cambia con il fuso ' + tz + ':\n  UTC ' + primo + '\n  ' + tz + ' ' + q);
  }
  /* E il valore è quello giusto, non solo stabile. */
  const r = JSON.parse(primo);
  deve(r[0][1] === '2027-09-21', '21/09 + 1 anno non è il 21/09 dell’anno dopo: ' + r[0][1]);
  deve(r[1][1] === '2027-01-31', '31/01 + 1 anno non è il 31/01: ' + r[1][1]);
  return '5 fusi, stessa risposta, e la risposta è giusta';
});

prova('i fine mese non traboccano nel mese dopo', () => {
  deve(P.sommaMesi('2026-08-31', 6) === '2027-02-28', '31 agosto + 6 mesi: ' + P.sommaMesi('2026-08-31', 6));
  deve(P.sommaMesi('2026-01-31', 1) === '2026-02-28', '31 gennaio + 1 mese: ' + P.sommaMesi('2026-01-31', 1));
  deve(P.sommaMesi('2027-08-31', 6) === '2028-02-29', 'l’anno bisestile non dà il 29: ' + P.sommaMesi('2027-08-31', 6));
  deve(P.piuUnAnno('2028-02-29') === '2029-02-28', '29 febbraio + 1 anno non è il 28: ' + P.piuUnAnno('2028-02-29'));
  /* E le rate mensili da un 31 restano dentro il loro mese. */
  const r = P.piano({ ...ANNO('2026-01-31'), frazionamento: 'Mensile', premio_annuo: 1200 });
  const feb = r.rate[1].data_decorrenza;
  deve(feb === '2026-02-28', 'la rata di febbraio non è il 28: ' + feb);
  deve(r.rate.every(x => x.data_decorrenza.slice(0, 7) !== r.rate[0].data_decorrenza.slice(0, 7) || x === r.rate[0]),
    'due rate nello stesso mese');
  return '31+6, 31+1, bisestile, e le mensili da un 31';
});

prova('CHI SCRIVE SOLO LA RATA OTTIENE LE SUE RATE', () => {
  /* Il difetto misurato: `titPiano` leggeva solo `premio_annuo`, e chi
     compilava «premio di rata» — che è il numero che dice la compagnia — si
     ritrovava la polizza scritta e NESSUNA rata. Senza rate non esistono gli
     insoluti, e i soldi non si recuperano. */
  const r = P.piano({ ...ANNO('2026-09-21'), frazionamento: 'Semestrale', premio_rata: 110 });
  deve(r.rate.length === 2, 'con la sola rata non nascono le rate: ' + r.rate.length);
  deve(r.rate.every(x => x.importo_lordo === 110), 'la rata dichiarata è stata ricalcolata');
  deve(r.annuo === 220 && r.annuo_da === 'rate', 'l’annuo non è la somma delle rate: ' + r.annuo);
  deve(r.base === 'rata', 'la base non è dichiarata');
  /* E NON è una stima nascosta: si dichiara. */
  deve(r.avvisi.some(a => a.codice === 'annuo_dalle_rate'), 'l’annuo dedotto non viene dichiarato');
  /* L'annuo dichiarato vince sempre sulla rata: se ci sono tutti e due, la
     rata non ridefinisce il premio. */
  const due = P.piano({ ...ANNO('2026-09-21'), frazionamento: 'Semestrale', premio_annuo: 220, premio_rata: 999 });
  deve(due.base === 'annuo' && due.rate[0].importo_lordo === 110, 'la rata ha scavalcato l’annuo dichiarato');
  return '2 rate da 110, annuo 220 marcato';
});

prova('NESSUNA RATA OLTRE LA FINE DEL CONTRATTO', () => {
  /* `titPiano` faceva sempre `rateAnno` rate a passi fissi, anche su un
     contratto più corto: emetteva rate che il contratto non copre. */
  const corto = P.piano({ data_effetto: '2026-09-21', data_scadenza: '2027-03-21', frazionamento: 'Semestrale', premio_annuo: 220 });
  deve(corto.rate.length === 1, 'su un contratto di sei mesi escono ' + corto.rate.length + ' rate semestrali');
  deve(corto.avvisi.some(a => a.codice === 'annualita_incompleta'), 'non si dice che la somma delle rate non fa l’annuo');
  const mens = P.piano({ data_effetto: '2026-09-21', data_scadenza: '2026-12-21', frazionamento: 'Mensile', premio_annuo: 1200 });
  deve(mens.rate.length === 3, 'su tre mesi escono ' + mens.rate.length + ' rate mensili');
  deve(mens.rate.every(x => x.data_decorrenza < '2026-12-21'), 'una rata decorre dalla scadenza o dopo');
  /* Un contratto più lungo di un anno: il premio annuo è il denaro di UN
     anno, e oltre non si emette niente con soldi che nessuno ha dichiarato. */
  const lungo = P.piano({ data_effetto: '2026-09-21', data_scadenza: '2028-09-21', frazionamento: 'Semestrale', premio_annuo: 220 });
  deve(lungo.rate.length === 2, 'su due anni escono ' + lungo.rate.length + ' rate');
  deve(lungo.avvisi.some(a => a.codice === 'contratto_oltre_l_anno'), 'non si dice che le altre nascono al rinnovo');
  return '6 mesi → 1, 3 mesi → 3, 2 anni → 2 con avviso';
});

prova('un frazionamento sconosciuto NON diventa «annuale» in silenzio', () => {
  /* `titRateAnno` tornava 1 per qualunque cosa non riconoscesse. Una rata
     sola è la lettura meno sbagliata, ma resta una supposizione (§8.1). */
  for (const f of [null, '', 'Bimestrale', 'boh']) {
    const r = P.piano({ ...ANNO('2026-09-21'), frazionamento: f, premio_annuo: 300 });
    deve(r.rate.length === 1, 'con frazionamento «' + f + '» escono ' + r.rate.length + ' rate');
    deve(r.avvisi.some(a => a.codice === 'frazionamento_non_dichiarato'),
      'con frazionamento «' + f + '» la supposizione non si dichiara');
  }
  deve(P.rateAnno('Bimestrale') === null, 'un frazionamento sconosciuto torna un numero invece di null');
  deve(P.rateAnno('semestrale') === 2 && P.rateAnno('SEMESTRALE') === 2, 'le maiuscole cambiano il frazionamento');
  return 'quattro casi, una rata e l’avviso';
});

prova('«non si è potuto» dice QUALE dato manca', () => {
  /* Prima tre cause diverse finivano in «manca la data di effetto o il
     premio», mostrata in un avviso a polizza già scritta (§12, §18). */
  const senzaData = P.piano({ frazionamento: 'Semestrale', premio_annuo: 220 });
  deve(!senzaData.rate.length && /decorrenza/i.test(senzaData.motivo), 'la decorrenza mancante non si nomina: ' + senzaData.motivo);
  const senzaPremio = P.piano({ ...ANNO('2026-09-21'), frazionamento: 'Semestrale' });
  deve(!senzaPremio.rate.length && /premio/i.test(senzaPremio.motivo), 'il premio mancante non si nomina: ' + senzaPremio.motivo);
  deve(senzaData.motivo !== senzaPremio.motivo, 'due cause diverse danno lo stesso messaggio');
  /* Una scadenza prima della decorrenza è un terzo caso, e non produce rate. */
  const rovescia = P.piano({ data_effetto: '2027-01-01', data_scadenza: '2026-01-01', frazionamento: 'Annuale', premio_annuo: 100 });
  deve(!rovescia.rate.length && /scadenza/i.test(rovescia.motivo), 'una scadenza prima della decorrenza produce rate');
  /* Un premio a zero o negativo non è un premio. */
  deve(!P.piano({ ...ANNO('2026-09-21'), frazionamento: 'Annuale', premio_annuo: 0 }).rate.length, 'un premio a zero genera una rata');
  deve(!P.piano({ ...ANNO('2026-09-21'), frazionamento: 'Annuale', premio_annuo: -50 }).rate.length, 'un premio negativo genera una rata');
  return 'tre motivi diversi, e zero non è un premio';
});

prova('il periodo che nessuna rata copre si DICHIARA, non si allunga', () => {
  /* Una polizza allineata a una scadenza diversa: fra l'ultima rata e la fine
     del contratto resta un troncone. Allungare l'ultima rata o inventarne una
     vorrebbe dire mettere in contabilità un importo che nessuno ha
     dichiarato (§16, la stessa regola della rata dedotta dal flusso). */
  const r = P.piano({ data_effetto: '2026-09-21', data_scadenza: '2027-06-30', frazionamento: 'Semestrale', premio_annuo: 220 });
  deve(r.rate.length === 1, 'nove mesi con passo sei danno ' + r.rate.length + ' rate');
  deve(r.resto_giorni > 0, 'il periodo scoperto non si conta');
  deve(r.avvisi.some(a => a.codice === 'periodo_scoperto'), 'il periodo scoperto non si dichiara');
  deve(r.rate[0].importo_lordo === 110, 'l’ultima rata è stata allungata per coprire il resto');
  return '1 rata, e il troncone dichiarato';
});

prova('senza scadenza il piano è l’annualità intera', () => {
  /* Il portafoglio arrivato dalla compagnia ha polizze senza `data_scadenza`
     (§20, il tracciato V8 non la porta): senza quella il piano non può
     accorciarsi, e fa l'annualità. */
  const r = P.piano({ data_effetto: '2026-09-21', frazionamento: 'Trimestrale', premio_annuo: 400 });
  deve(r.rate.length === 4, 'senza scadenza non escono le quattro rate: ' + r.rate.length);
  deve(r.durata_mesi === null, 'la durata viene inventata senza la scadenza');
  deve(!r.avvisi.some(a => a.codice === 'periodo_scoperto'), 'senza scadenza si dichiara un periodo scoperto');
  return '4 rate, durata non inventata';
});

console.log('\n══ IL PIANO DELLE RATE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPIANO RATE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
