// ═══════════════════════════════════════════════════════════════════════════════
//  SOSPENSIONI E FIDO — tariffe/motore/sospensione.js  (20/09/2026)
//
//  Le prove sotto sono quelle che, saltando, producono un numero CREDIBILE E
//  SBAGLIATO:
//   · una scadenza che non tiene conto dei giorni sospesi — e l'agenzia
//     richiama nel giorno sbagliato, o non richiama affatto;
//   · un «va tutto bene» su un limite che nessuno ha dichiarato;
//   · un credito oltre il fido che non si vede perché la persona il fido non
//     ce l'ha scritto.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../../tariffe/motore/sospensione.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const OGGI = '2026-09-20';

/* ═══ LA SOSPENSIONE ═══════════════════════════════════════════════════════ */

prova('una polizza mai sospesa risponde lo stesso, e non sposta niente', () => {
  /* Chi chiama non deve sapere in anticipo se c'è una sospensione: una
     funzione che torna `null` metà delle volte si dimentica di controllarlo. */
  const s = S.stato({ data_scadenza: '2027-03-01' }, OGGI);
  deve(s.sospesa === false, 'dice sospesa una polizza che non lo è');
  deve(s.giorniTotali === 0, 'giorni: ' + s.giorniTotali);
  deve(s.scadenzaEffettiva === '2027-03-01', 'ha spostato una scadenza senza sospensioni: ' + s.scadenzaEffettiva);
  return 'stessa forma, zero giorni';
});

prova('LA REGOLA: i giorni sospesi si aggiungono in fondo', () => {
  /* È quella per cui il cliente accetta di sospendere. Un\'agenzia che
     richiama sulla data contrattuale telefona nel giorno sbagliato. */
  const p = { data_scadenza: '2027-03-01', sospensioni: [{ dal: '2026-01-01', al: '2026-03-02' }] };
  const s = S.stato(p, OGGI);
  deve(s.giorniChiusi === 60, 'giorni chiusi: ' + s.giorniChiusi);
  deve(s.scadenzaEffettiva === '2027-04-30', 'scadenza vera: ' + s.scadenzaEffettiva);
  /* E la contrattuale NON si riscrive: si tiene, e si somma. Un dato
     sovrascritto è un dato di cui nessuno sa più quale fosse l'originale. */
  deve(s.scadenzaContrattuale === '2027-03-01', 'la scadenza contrattuale è stata persa');
  deve(p.data_scadenza === '2027-03-01', 'il motore ha riscritto la polizza');
  return '60 giorni → scadenza dal 01/03 al 30/04';
});

prova('una sospensione aperta conta i giorni fino a OGGI', () => {
  const p = { data_scadenza: '2027-03-01', sospensioni: [{ dal: '2026-09-01', al: null }] };
  const s = S.stato(p, OGGI);
  deve(s.sospesa === true, 'non la vede aperta');
  deve(s.giorniAperti === 19, 'giorni aperti: ' + s.giorniAperti);
  deve(s.dal === '2026-09-01', 'la data di inizio è ' + s.dal);
  return '19 giorni e ancora ferma';
});

prova('due sospensioni si sommano, e una data sbagliata non si corregge da sola', () => {
  const p = { data_scadenza: '2027-03-01', sospensioni: [
    { dal: '2026-01-01', al: '2026-01-31' },   // 30
    { dal: '2026-05-01', al: '2026-04-01' },   // finisce prima di cominciare: non si conta
    { dal: '2026-06-01', al: '2026-06-11' }    // 10
  ] };
  const s = S.stato(p, OGGI);
  deve(s.giorniChiusi === 40, 'giorni: ' + s.giorniChiusi + ' (attesi 40)');
  /* Correggere una data a occhio vorrebbe dire scrivere un numero inventato
     dentro una scadenza — e quella scadenza poi la si legge come un dato. */
  return '30 + 10, la terza scartata';
});

prova('«non si sa quanto può durare» non è «va bene»', () => {
  /* §12, §18, §20: il limite lo dichiara la compagnia. Dove nessuno l'ha
     scritto E la polizza non ha scadenza, i giorni si contano e il giudizio
     non si dà. */
  const p = { sospensioni: [{ dal: '2026-01-01', al: null }] };   // niente data_scadenza
  const l = S.limite(p, { oggi: OGGI });
  deve(l.superato === null, 'ha dato un giudizio senza avere un limite: ' + l.superato);
  deve(l.giorni === 262, 'giorni: ' + l.giorni);
  deve(/non si può dire/.test(l.motivo), 'non spiega perché tace: ' + l.motivo);
  return 'giorni contati, giudizio sospeso';
});

prova('la copertura residua è un tetto che vale sempre', () => {
  /* Una sospensione non può recuperare più copertura di quanta ne restava:
     oltre quella, il premio residuo è perso — ed è la cosa che il cliente
     scopre quando torna. */
  const p = { data_scadenza: '2026-03-01', sospensioni: [{ dal: '2026-01-01', al: null }] };
  const l = S.limite(p, { oggi: OGGI });   // 262 giorni, ne restavano 59
  deve(l.residuoAllaSospensione === 59, 'residuo: ' + l.residuoAllaSospensione);
  deve(l.superato === true, 'non si accorge che è oltre');
  deve(/copertura che restava/.test(l.motivo), 'non dice quale tetto ha superato: ' + l.motivo);
  /* E lo dice anche quando il limite della compagnia manca. */
  deve(/non è dichiarato/.test(l.motivo), 'non dichiara che il limite della compagnia manca');
  return '59 giorni di residuo, 262 passati';
});

prova('fra due tetti vince il più stretto, e non si fa la media', () => {
  const p = { data_scadenza: '2027-03-01', sospensioni: [{ dal: '2026-09-01', al: null }] };
  const l = S.limite(p, { oggi: OGGI, limiteGiorni: 90 });
  /* Residuo alla sospensione = 181 giorni, limite compagnia = 90. */
  deve(l.giorniRimasti === 71, 'rimasti: ' + l.giorniRimasti + ' (90 − 19)');
  deve(/limite della compagnia/.test(l.motivo), 'ha scelto il tetto sbagliato: ' + l.motivo);
  return 'vince 90, non 181 né 135';
});

prova('l’elenco mette in cima chi va richiamato oggi', () => {
  const polizze = [
    { id: 'a', compagnia: 'PRIMA', data_scadenza: '2027-03-01', sospensioni: [{ dal: '2026-09-15', al: null }] },
    { id: 'b', compagnia: 'PRIMA', data_scadenza: '2026-03-01', sospensioni: [{ dal: '2026-01-01', al: null }] }, // oltre
    { id: 'c', compagnia: 'HDI',   sospensioni: [{ dal: '2026-09-01', al: null }] },                              // non si può dire
    { id: 'd', compagnia: 'PRIMA', data_scadenza: '2027-03-01' }                                                  // non sospesa
  ];
  const r = S.daRiattivare(polizze, { oggi: OGGI, limitiPerCompagnia: { prima: 90 } });
  deve(r.length === 3, 'righe: ' + r.length + ' (la non sospesa non deve esserci)');
  deve(r[0].id === 'b', 'in cima c’è ' + r[0].id + ' invece di quella già oltre');
  /* Chi non si può giudicare va in fondo: su di lui non c'è niente da
     decidere finché qualcuno non dichiara il limite. */
  deve(r[2].id === 'c', 'in fondo c’è ' + r[2].id);
  deve(r[0].superato === true && r[2].superato === null, 'i giudizi non sono quelli');
  return '3 aperte, la scaduta per prima, l’indecidibile in fondo';
});

prova('non si sospende una polizza già sospesa, né una fuori copertura', () => {
  const p = { data_effetto: '2026-01-01', data_scadenza: '2026-06-01', sospensioni: [] };
  deve(S.apribile(p, '2026-03-01').ok, 'rifiuta una sospensione legittima');
  deve(!S.apribile(p, '2025-12-01').ok, 'accetta una sospensione prima della decorrenza');
  deve(!S.apribile(p, '2026-09-01').ok, 'accetta una sospensione su una polizza scaduta');
  deve(!S.apribile(p, '').ok, 'accetta una sospensione senza data');
  const gia = { data_effetto: '2026-01-01', data_scadenza: '2026-12-01', sospensioni: [{ dal: '2026-02-01', al: null }] };
  deve(!S.apribile(gia, '2026-03-01').ok, 'sospende due volte la stessa polizza');
  /* E il controllo guarda la scadenza EFFETTIVA: una polizza già sospesa in
     passato è coperta più a lungo di quanto dice il contratto. */
  const spostata = { data_effetto: '2026-01-01', data_scadenza: '2026-06-01',
                     sospensioni: [{ dal: '2026-02-01', al: '2026-05-02' }] };   // +90
  deve(S.apribile(spostata, '2026-08-01').ok,
    'rifiuta una sospensione dentro la copertura recuperata: legge la scadenza scritta invece di quella vera');
  return '5 rifiuti col motivo, e la scadenza vera';
});

prova('riattivando, la scadenza si sposta di tutti i giorni fermi', () => {
  const p = { data_scadenza: '2027-03-01', sospensioni: [
    { dal: '2026-01-01', al: '2026-01-31' },   // 30 già chiusi
    { dal: '2026-06-01', al: null }
  ] };
  const c = S.chiudibile(p, '2026-07-01');
  deve(c.ok, c.motivo);
  deve(c.giorni === 30, 'giorni di questa sospensione: ' + c.giorni);
  deve(c.scadenzaEffettiva === '2027-04-30', 'scadenza dopo la riattivazione: ' + c.scadenzaEffettiva);
  deve(!S.chiudibile(p, '2026-05-01').ok, 'riattiva prima di aver sospeso');
  return '30 + 30 = 60 giorni in fondo';
});

/* ═══ IL FIDO ══════════════════════════════════════════════════════════════ */

const PERSONE = [
  { id: 'p1', nominativo: 'ROSSI MARIO', fido: 1000 },
  { id: 'p2', nominativo: 'VERDI LUCA', fido: 500 },
  { id: 'p3', nominativo: 'NERI ANNA', fido: null },
  { id: 'p4', nominativo: 'GIALLI SPA', fido: 0 }
];

prova('un fido NON dichiarato non è un fido illimitato', () => {
  /* È la regola dell'estratto conto (§17) applicata a un limite: quello che
     non si sa esce dai conti CON IL MOTIVO, non con un silenzio che sembra
     un via libera. */
  const f = S.fidi([{ collaboratore_id: 'p3', importo: 9000 }], PERSONE);
  deve(f.righe.length === 0, 'ha giudicato una persona senza fido');
  deve(f.senzaFido.length === 1, 'non la elenca fra quelle senza fido');
  deve(/non si può dire/.test(f.senzaFido[0].motivo), 'non dice perché tace: ' + f.senzaFido[0].motivo);
  /* E i totali NON la contano: un'«esposizione oltre il fido» che comprende
     persone di cui non si sa il fido è un numero che non vuol dire niente. */
  deve(f.conteggi.credito_con_fido === 0, 'il credito senza fido è entrato nei totali');
  deve(f.conteggi.oltre === 0, 'l’ha contata fra quelle oltre il limite');
  return '9.000 € fuori dai totali, col motivo';
});

prova('uno ZERO è un fido, e si conta', () => {
  /* Zero non è «non dichiarato»: è un accordo — questa persona non tiene
     denaro dell'agenzia. È la stessa distinzione di §17 fra zero e vuoto. */
  const f = S.fidi([{ collaboratore_id: 'p4', importo: 10 }], PERSONE);
  deve(f.righe.length === 1, 'ha scartato un fido a zero');
  deve(f.righe[0].superato === true, 'con fido 0 e 10 € incassati non vede lo sforamento');
  return '10 € su un fido di zero: oltre';
});

prova('chi ha sforato sta in cima, e si dice di quanto', () => {
  const f = S.fidi([
    { collaboratore_id: 'p1', importo: 300, rate: 2 },    // dentro, 30%
    { collaboratore_id: 'p2', importo: 800, rate: 5 },    // oltre di 300
    { collaboratore_id: 'p3', importo: 50 }               // senza fido
  ], PERSONE);
  deve(f.righe[0].collaboratore_id === 'p2', 'in cima c’è ' + f.righe[0].collaboratore_id);
  deve(f.righe[0].superato === true && f.righe[1].superato === false, 'i giudizi non sono quelli');
  deve(/Oltre il fido di 300/.test(f.righe[0].motivo), 'non dice di quanto: ' + f.righe[0].motivo);
  deve(f.righe[1].residuo === 700, 'il residuo di chi è dentro è ' + f.righe[1].residuo);
  deve(f.righe[1].quota === 30, 'la quota di fido usata è ' + f.righe[1].quota + '%');
  deve(f.conteggi.oltre === 1 && f.conteggi.senza_fido === 1, JSON.stringify(f.conteggi));
  deve(f.conteggi.oltre_di === 300, 'esposizione oltre il fido: ' + f.conteggi.oltre_di);
  /* Il totale conta solo chi un fido ce l'ha: 300 + 800, non 1150. */
  deve(f.conteggi.credito_con_fido === 1100, 'credito con fido: ' + f.conteggi.credito_con_fido);
  return '1 oltre di 300 €, 1 dentro al 30%, 1 senza fido';
});

prova('gli arrotondamenti dei negativi non vanno dalla parte sbagliata', () => {
  /* §17: `Math.round(-0.5)` in JavaScript fa `-0`, cioè arrotonda verso
     l'alto anche i negativi — e un residuo negativo è esattamente il caso di
     chi ha sforato. */
  deve(S.cent(-0.005) === -0.01, 'cent(-0.005) = ' + S.cent(-0.005));
  deve(S.cent(0.005) === 0.01, 'cent(0.005) = ' + S.cent(0.005));
  return 'simmetrico, come negli altri motori';
});

console.log('\n══ SOSPENSIONI E FIDO ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nSOSPENSIONI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
