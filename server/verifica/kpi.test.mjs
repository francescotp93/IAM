// ═══════════════════════════════════════════════════════════════════════════════
//  I NUMERI DELLA SCRIVANIA — tariffe/motore/kpi.js
//  (Blocco 3 · punto 10, 21/09/2026)
//
//  Le prove che, saltando, mettono in prima pagina un numero credibile e falso:
//  un portafoglio più povero di quello che è perché le polizze senza premio
//  valgono zero, una conversione divisa per zero, e il «+500%» che nasce dal
//  confronto con un mese in cui non era successo niente.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../../tariffe/motore/kpi.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const OGGI = '2026-09-21';

prova('il portafoglio non conta come ZERO quello che non sa', () => {
  /* Il caso vero: sul portafoglio dell'agenzia cinque polizze su trenta non
     hanno un premio annuo, perché sono frazionate di cui la compagnia non ha
     mandato tutte le rate (§36). Sommare zero al loro posto farebbe un
     portafoglio più povero di quello che è — e un numero più basso del vero,
     su una scrivania, nessuno lo mette in dubbio. */
  const pol = [
    { data_scadenza: '2027-01-01', premio_annuo: 400 },
    { data_scadenza: '2027-03-01', premio_annuo: 220 },
    { data_scadenza: '2027-06-01', premio_annuo: null }
  ];
  const r = P.portafoglio(pol, OGGI);
  deve(r.attive === 3, 'le attive non sono tre: ' + r.attive);
  deve(r.premio === 620, 'il premio non è 620: ' + r.premio);
  deve(r.con_premio === 2 && r.senza_premio === 1, 'non si distingue quello che si sa da quello che non si sa');
  deve(/non entra nel totale/.test(r.motivo || ''), 'il totale incompleto non si dichiara: ' + r.motivo);
  return '620 € su 2 polizze, e la terza dichiarata';
});

prova('una polizza SENZA scadenza non è né attiva né scaduta', () => {
  /* Metterla fra le attive gonfierebbe il portafoglio, fra le scadute lo
     svuoterebbe. L'unica risposta onesta è tenerla fuori da tutte e due e
     dirlo. */
  const r = P.portafoglio([
    { data_scadenza: '2027-01-01', premio_annuo: 100 },
    { data_scadenza: '2026-01-01', premio_annuo: 100 },
    { data_scadenza: null, premio_annuo: 100 },
    { data_scadenza: '2027-01-01', premio_annuo: 100, stato_pagamento: 'annullata' }
  ], OGGI);
  deve(r.attive === 1, 'le attive non sono una: ' + r.attive);
  deve(r.scadute === 1, 'le scadute non sono una: ' + r.scadute);
  deve(r.senza_scadenza === 1, 'quella senza scadenza non si conta a parte');
  deve(r.annullate === 1 && r.premio === 100, 'un’annullata entra nel portafoglio: ' + r.premio);
  return '1 attiva, 1 scaduta, 1 non si sa, 1 annullata';
});

prova('preventivo e polizza contano in due mesi diversi', () => {
  /* Un preventivo di agosto emesso a settembre è produzione di agosto e
     polizza di settembre. Contarlo una volta sola su una delle due date
     farebbe sparire metà del lavoro. */
  const righe = [
    { creato_il: '2026-08-20', polizza_emessa: true, polizza_il: '2026-09-03' },
    { creato_il: '2026-09-05', polizza_emessa: true, polizza_il: '2026-09-10' },
    { creato_il: '2026-09-08', polizza_emessa: false }
  ];
  const ago = P.produzione(righe, '2026-08');
  const set = P.produzione(righe, '2026-09');
  deve(ago.preventivi === 1 && ago.polizze === 0, 'agosto non tiene il preventivo senza la polizza');
  deve(set.preventivi === 2 && set.polizze === 2, 'settembre non conta le due emissioni: ' + JSON.stringify(set));
  return 'agosto 1/0, settembre 2/2';
});

prova('la conversione NON si divide per zero', () => {
  const vuoto = P.produzione([], '2026-09');
  deve(vuoto.conversione === null, 'un mese senza preventivi ha una percentuale: ' + vuoto.conversione);
  deve(vuoto.preventivi === 0 && vuoto.polizze === 0, 'un mese vuoto non è vuoto');
  /* E sopra il cento è VERO, non un errore: vuol dire che si sta emettendo
     l'arretrato, ed è un'informazione. */
  const arretrato = P.produzione([
    { creato_il: '2026-08-01', polizza_emessa: true, polizza_il: '2026-09-02' },
    { creato_il: '2026-08-02', polizza_emessa: true, polizza_il: '2026-09-03' },
    { creato_il: '2026-09-01', polizza_emessa: false }
  ], '2026-09');
  deve(arretrato.conversione === 200, 'l’arretrato emesso non si vede: ' + arretrato.conversione);
  return 'niente percentuale a zero, e il 200% si vede';
});

prova('un’emissione senza data si ripiega, e il ripiego SI CONTA', () => {
  /* Il ripiego è lecito — una polizza emessa esiste comunque — ma non può
     essere invisibile: chi guarda deve poter sapere che quel numero contiene
     una stima. */
  const r = P.produzione([{ creato_il: '2026-09-04', polizza_emessa: true }], '2026-09');
  deve(r.polizze === 1, 'la polizza senza data di emissione sparisce');
  deve(r.emissione_stimata === 1, 'il ripiego non si dichiara');
  return '1 polizza, 1 stimata';
});

prova('l’incassato guarda la data dell’INCASSO, non la decorrenza', () => {
  /* È la stessa regola dell'estratto conto (§17) e del foglio cassa (§25):
     una rata emessa e non pagata non ha prodotto niente per nessuno. */
  const t = [
    { incassato_il: '2026-09-10', importo_lordo: 200, data_scadenza: '2026-08-01' },
    { incassato_il: '2026-08-31', importo_lordo: 999 },
    { incassato_il: null, importo_lordo: 500, data_scadenza: '2026-09-02' },
    { incassato_il: '2026-09-15', importo_lordo: null }
  ];
  const r = P.incassato(t, '2026-09-01', '2026-09-30');
  deve(r.importo === 200, 'l’incassato del mese non è 200: ' + r.importo);
  deve(r.righe === 2, 'le righe del mese non sono due: ' + r.righe);
  deve(r.senza_importo === 1 && /il totale è incompleto/.test(r.motivo || ''),
    'la rata senza importo sparisce in silenzio');
  return '200 € su 2 rate, una senza importo dichiarata';
});

prova('DA ZERO NON SI FA UNA PERCENTUALE', () => {
  /* Il modo più veloce di mettere in una scrivania un numero enorme che non
     vuol dire niente. «Prima non ce n'erano» è l'informazione vera. */
  const su = P.confronto(5, 0);
  deve(su.pct === null, 'da zero esce una percentuale: ' + su.pct);
  deve(su.verso === 'su' && /prima non ce n/.test(su.testo), 'non si dice che prima non ce n’erano');
  /* Zero contro zero non è «uguale»: è «niente né prima né adesso». */
  const nulla = P.confronto(0, 0);
  deve(nulla.pct === null && nulla.verso === 'pari', 'zero contro zero produce una percentuale');
  deve(/come prima/.test(nulla.testo), 'zero contro zero non si legge');
  /* E il caso normale funziona, in tutti e due i versi. */
  deve(P.confronto(12, 10).pct === 20, 'la crescita non si calcola');
  deve(P.confronto(8, 10).pct === -20, 'il calo non si calcola');
  deve(P.confronto(0, 10).pct === -100 && /adesso nessuno/.test(P.confronto(0, 10).testo),
    'l’azzeramento non si legge');
  /* Un dato che manca non è uno zero. */
  deve(P.confronto(5, null).testo === 'non confrontabile', 'un dato mancante diventa una crescita');
  return 'niente %, e il caso normale regge';
});

prova('i mesi si contano indietro anche a cavallo dell’anno', () => {
  deve(P.meseMeno('2026-09', 1) === '2026-08', 'un mese indietro non torna');
  deve(P.meseMeno('2026-01', 1) === '2025-12', 'gennaio meno uno non è dicembre dell’anno prima');
  deve(P.meseMeno('2026-02', 14) === '2024-12', 'quattordici mesi indietro non tornano');
  /* Le date si confrontano come stringhe ISO, senza `new Date()`: fra
     mezzanotte e le due in Italia quello restituisce il giorno prima, ed è la
     trappola già presa nella Scrivania. */
  deve(P.mese('2026-09-21T23:30:00Z') === '2026-09', 'il mese si legge male da una data con l’ora');
  return 'dicembre, e nessun fuso orario';
});

console.log('\n══ I NUMERI DELLA SCRIVANIA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nKPI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
