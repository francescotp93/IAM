// ═══════════════════════════════════════════════════════════════════════════════
//  DIARIO — le ore fuori dall'orario d'ufficio non spariscono
//
//  Segnalato da Francesco il 16/09/2026: «gli appuntamenti si vedono fino alle
//  18, quelli delle 19 non si vedono». Le ore della griglia erano una lista
//  fissa (8-18). Un'attivita' alle 19 ha un orario perfettamente leggibile,
//  quindi non finiva nella fascia «senza orario» — e non trovava nessuna riga:
//  spariva dalla settimana e dal giorno, pur restando nel conteggio in alto.
//  Il peggior tipo di guasto: il totale dice 5, la griglia ne mostra 4, e
//  nessuno sa quale manca.
//
//  Qui le funzioni girano davvero, ritagliate da index.html.
//  Controprova: IAM_INDEX=<index.html di prima> node verifica/diario-ore-serali.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { RADICE, esiti, deve, ritaglia } from './banco.mjs';

const html = fs.readFileSync(process.env.IAM_INDEX || path.join(RADICE, 'index.html'), 'utf8');
const e = esiti('DIARIO — le ore serali si vedono');

const fnOra = ritaglia(html, 'wdsOra');
const fnOre = ritaglia(html, 'wdsOre');
const costanti = (html.match(/^const WDS_ORA_DA = \d+, WDS_ORA_A = \d+;$/m) || [''])[0];

const stanza = vm.createContext({});
if (fnOra && fnOre && costanti) vm.runInContext([costanti, fnOra, fnOre].join('\n'), stanza);
const ore = (lista) => vm.runInContext('wdsOre(' + JSON.stringify(lista) + ')', stanza);

e.prova('le ore della griglia non sono piu\' una lista fissa', () => {
  deve(!/const WDS_ORE\s*=\s*\[/.test(html), 'c\'e\' ancora WDS_ORE, la lista fissa 8-18');
  deve(fnOre, 'manca wdsOre(lista)');
  deve(costanti, 'mancano WDS_ORA_DA / WDS_ORA_A');
  return costanti;
});

e.prova('senza attivita\' fuori orario la griglia e\' quella di sempre, 8-18', () => {
  const o = ore([{ ora: '9:30' }, { ora: '15' }, { ora: '' }]);
  deve(JSON.stringify(o) === JSON.stringify([8,9,10,11,12,13,14,15,16,17,18]), 'ore: ' + o.join(','));
  return '11 righe, dalle 08:00 alle 18:00';
});

e.prova('un appuntamento alle 19 aggiunge la riga delle 19 (il caso segnalato)', () => {
  const o = ore([{ ora: '10:00' }, { ora: '19:00' }]);
  deve(o.includes(19), 'le 19 non ci sono: ' + o.join(','));
  deve(o[o.length - 1] === 19 && o[0] === 8, 'la griglia va da ' + o[0] + ' a ' + o[o.length - 1]);
  /* E l'attivita' finisce in QUELLA riga: la stessa selezione che fa la griglia. */
  const h = vm.runInContext("wdsOra({ora:'19:00'}).h", stanza);
  deve(h === 19 && o.includes(h), 'l\'ora letta e\' ' + h);
});

e.prova('una alle 21:45 e una alle 7 allargano la griglia da entrambe le parti, senza buchi', () => {
  const o = ore([{ ora: '07:15' }, { ora: '21.45' }]);
  deve(o[0] === 7 && o[o.length - 1] === 21, 'da ' + o[0] + ' a ' + o[o.length - 1]);
  deve(o.length === 15, 'righe: ' + o.length + ' (attese 15, una per ora, senza salti)');
  for (let i = 1; i < o.length; i++) deve(o[i] === o[i-1] + 1, 'c\'e\' un buco fra ' + o[i-1] + ' e ' + o[i]);
});

e.prova('un orario illeggibile non allarga niente: resta nella fascia «senza orario»', () => {
  const o = ore([{ ora: 'pomeriggio' }, { ora: null }, { ora: '25:00' }]);
  deve(JSON.stringify(o) === JSON.stringify([8,9,10,11,12,13,14,15,16,17,18]), 'ore: ' + o.join(','));
});

e.prova('settimana e giorno usano la griglia elastica, e la settimana la calcola su TUTTA la settimana', () => {
  /* Se ogni colonna calcolasse le sue ore, un giorno con le 19 avrebbe una
     riga in piu' degli altri e scivolerebbe: le 10 di lunedi' accanto alle 11
     di martedi'. Le ore vanno calcolate una volta, su tutte le attivita'. */
  const sett = html.slice(html.indexOf('function renderWDSett('), html.indexOf('function wdsVoceCoda('));
  deve(/const ore = wdsOre\(dentro\)/.test(sett), 'la settimana non calcola le ore su tutte le attivita\' della settimana');
  deve(/for \(const o of ore\)/.test(sett), 'le colonne della settimana non usano le ore calcolate');
  deve(!/WDS_ORE/.test(sett), 'la settimana usa ancora la lista fissa');
  const giorno = html.slice(html.indexOf('function renderWDGiorno('), html.indexOf('function wdsDettaglio('));
  deve(/wdsOre\(lista\)\.map/.test(giorno), 'la vista Giorno non usa la griglia elastica');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
