/* Prove del motore della scheda cliente (22/09/2026).
   Si lanciano con: node server/verifica/scheda-cliente.test.mjs            */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../../tariffe/motore/scheda-cliente.js');

let ok = 0, ko = 0;
function prova(nome, fn) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); ok++; }
  catch (e) { console.log('  KO  ' + nome + '  — ' + (e && e.message || e)); ko++; }
}
function deve(c, m) { if (!c) throw new Error(m || 'atteso vero'); }

console.log('══ SCHEDA CLIENTE ══');

const OGGI = '2026-09-22';

const POLIZZE = [
  { id: 'p1', prodotto: 'RC Auto', premio_annuo: 390, data_effetto: '2026-01-10', data_scadenza: '2027-01-10' },
  { id: 'p2', prodotto: 'RC Auto', premio_annuo: 210, data_effetto: '2026-03-01', data_scadenza: '2027-03-01' },
  { id: 'p3', prodotto: 'Casa', premio_annuo: null, data_effetto: '2026-02-01', data_scadenza: '2027-02-01' },
  { id: 'p4', prodotto: 'Casa', premio_annuo: 120, data_effetto: '2024-01-01', data_scadenza: '2025-01-01' },
  { id: 'p5', prodotto: 'Vita', premio_annuo: 999, data_effetto: '2026-01-01', data_scadenza: '2027-01-01', stato_pagamento: 'annullata' }
];

const TITOLI = [
  { id: 't1', stato: 'aperto',     data_decorrenza: '2026-08-01', importo_lordo: 50 },
  { id: 't2', stato: 'aperto',     data_decorrenza: '2026-12-01', importo_lordo: 70 },
  { id: 't3', stato: 'incassato',  incassato_il: '2026-09-10', importo_lordo: 195, provvigione: 20 },
  { id: 't4', stato: 'incassato',  incassato_il: '2026-03-04', importo_lordo: 100, provvigione: null },
  { id: 't5', stato: 'incassato',  incassato_il: '2025-06-01', importo_lordo: 300, provvigione: 30 }
];

prova('una polizza SCADUTA non è attiva, e una ANNULLATA non si conta', () => {
  const s = S.situazione(POLIZZE, TITOLI, OGGI);
  deve(s.polizze_attive === 3, 'attive: ' + s.polizze_attive + ' (attese 3)');
  deve(s.totale_polizze === 4, 'totali: ' + s.totale_polizze + ' (attese 4, l\'annullata resta fuori)');
  return '3 attive su 4, l\'annullata non si conta';
});

prova('una polizza SENZA PREMIO non vale zero: esce dal totale e si conta a parte', () => {
  const s = S.situazione(POLIZZE, TITOLI, OGGI);
  deve(s.valore_portafoglio === 600, 'valore: ' + s.valore_portafoglio + ' (atteso 600 = 390+210)');
  deve(s.senza_premio === 1, 'senza premio: ' + s.senza_premio);
  return '600 €, 1 senza premio dichiarata';
});

prova('un insoluto è una rata aperta GIÀ SCADUTA, non una rata aperta', () => {
  const s = S.situazione(POLIZZE, TITOLI, OGGI);
  deve(s.insoluti === 1, 'insoluti: ' + s.insoluti + ' (atteso 1: la rata di dicembre non lo è)');
  deve(s.valore_insoluti === 50, 'valore insoluti: ' + s.valore_insoluti);
  return '1 insoluto da 50 €, la rata futura non ci entra';
});

prova('«non si è potuto leggere» arriva a chi disegna, e non è uno zero', () => {
  const s = S.situazione([], [], OGGI, { letto: { titoli: false } });
  deve(s.letto.titoli === false, 'la caduta della lettura non si dichiara');
  deve(s.letto.polizze === true, 'la lettura riuscita si dichiara caduta');
  deve(s.insoluti === 0, 'con la lettura caduta il numero non è zero');
  return 'zero e buco restano due cose diverse';
});

prova('la composizione conta le POLIZZE, e il premio non nasconde una fetta', () => {
  const c = S.composizione(POLIZZE, OGGI);
  deve(c.polizze === 3, 'polizze nella ciambella: ' + c.polizze);
  deve(c.gruppi.length === 2, 'gruppi: ' + c.gruppi.length + ' (RC Auto e Casa)');
  const casa = c.gruppi.find(g => g.etichetta === 'Casa');
  /* La fetta di Casa esiste anche se il suo premio è ignoto: se la quota si
     calcolasse sul premio, quel prodotto sparirebbe dal grafico. */
  deve(casa && casa.polizze === 1, 'la Casa senza premio è sparita dalla ciambella');
  deve(casa.premio === 0 && casa.senza_premio === 1, 'il premio ignoto non si dichiara');
  deve(Math.abs(c.gruppi.reduce((s, g) => s + g.quota, 0) - 1) < 1e-9, 'le quote non fanno 1');
  return '2 gruppi, quote che fanno 1, la fetta senza premio resta';
});

prova('i periodi contano SOLO l\'incassato, e ognuno nel suo', () => {
  const p = S.periodi(TITOLI, OGGI);
  deve(p.mese_corrente.premi === 195, 'mese: ' + p.mese_corrente.premi);
  deve(p.anno_corrente.premi === 295, 'anno in corso: ' + p.anno_corrente.premi + ' (atteso 295)');
  deve(p.anno_precedente.premi === 300, 'anno prima: ' + p.anno_precedente.premi);
  /* Le rate aperte non entrano in nessuna colonna: non hanno prodotto niente. */
  deve(p.anno_corrente.righe === 2, 'righe dell\'anno: ' + p.anno_corrente.righe);
  return 'mese 195 · anno 295 · anno prima 300';
});

prova('una provvigione NON dichiarata non diventa uno zero nel totale', () => {
  const p = S.periodi(TITOLI, OGGI);
  deve(p.anno_corrente.provvigioni === 20, 'provvigioni: ' + p.anno_corrente.provvigioni + ' (attese 20)');
  deve(p.anno_corrente.senza_provvigione === 1, 'non dice quante non sono dichiarate');
  return '20 €, e 1 riga dichiarata fuori';
});

prova('i nomi dei periodi non sono ambigui e portano l\'etichetta', () => {
  const p = S.periodi(TITOLI, OGGI);
  deve(p.etichette.mese_corrente === '2026-09', 'mese: ' + p.etichette.mese_corrente);
  deve(p.etichette.anno_corrente === '2026' && p.etichette.anno_precedente === '2025', 'anni sbagliati');
  return '2026-09 · 2026 · 2025';
});

prova('lo stesso portafoglio dà lo stesso numero in cinque fusi orari', () => {
  /* L'istante arriva da chi chiama e non dall'orologio del computer: senza
     questa regola una scheda direbbe numeri diversi a due persone (§44). */
  const attesi = JSON.stringify(S.situazione(POLIZZE, TITOLI, OGGI));
  for (const tz of ['UTC', 'Europe/Rome', 'Pacific/Kiritimati', 'Pacific/Niue', 'America/New_York']) {
    process.env.TZ = tz;
    deve(JSON.stringify(S.situazione(POLIZZE, TITOLI, OGGI)) === attesi, 'risposta diversa in ' + tz);
  }
  process.env.TZ = 'Europe/Rome';
  return '5 fusi, una risposta sola';
});

prova('un documento SCADUTO non vale come presente, e senza scadenza non è valido', () => {
  const d = S.documenti({ documenti: [
    { tipo: 'carta_identita', numero: 'AB1', scadenza: '2025-01-01', data: '2020-01-01' },
    { tipo: 'carta_identita', numero: 'AB2', scadenza: '2030-04-13', data: '2026-01-01' },
    { tipo: 'passaporto', numero: 'P1', data: '2024-01-01' }
  ] }, OGGI);
  deve(d.length === 2, 'tipi: ' + d.length + ' (atteso 2, la versione vecchia non si ripete)');
  const ci = d.find(x => x.tipo === 'carta_identita');
  deve(ci.numero === 'AB2' && ci.stato === 'valido', 'la versione attiva non è la più recente: ' + ci.numero);
  const pp = d.find(x => x.tipo === 'passaporto');
  deve(pp.stato === 'senza_scadenza', 'un documento senza scadenza risulta valido');
  return '2 tipi, versione attiva giusta, senza scadenza dichiarato';
});

prova('il consenso marketing vale anche se viene dalla privacy firmata', () => {
  const a = S.consensi({ email: 'x@y.it', privacy_firmata: { firmata_il: '2026-01-02', marketing: true } });
  const m = a.find(v => /marketing/i.test(v.voce));
  deve(m.ok === true, 'il consenso dato con la privacy non si vede');
  const b = S.consensi({ consenso_marketing: true });
  deve(b.find(v => /marketing/i.test(v.voce)).ok === true, 'il consenso in colonna non si vede');
  const c = S.consensi({});
  deve(c.find(v => /marketing/i.test(v.voce)).ok === false, 'senza niente risulta dato');
  deve(c.find(v => /[Cc]anale/.test(v.voce)).ok === false, 'senza recapito risulta contattabile');
  return 'due strade, una risposta';
});

prova('«il registro non risponde» non diventa «non è successo niente»', () => {
  const nulla = S.eventi(null);
  deve(nulla.letto === false && nulla.righe.length === 0, 'la caduta non si dichiara');
  const vuoto = S.eventi([]);
  deve(vuoto.letto === true && vuoto.quante === 0, 'un elenco vuoto risulta non letto');
  const tanti = S.eventi([
    { creato_il: '2026-09-01T10:00:00Z', azione: 'a' },
    { creato_il: '2026-09-22T19:29:38Z', azione: 'b' },
    { creato_il: '2026-09-10T08:00:00Z', azione: 'c' }
  ], 2);
  deve(tanti.righe.length === 2 && tanti.righe[0].azione === 'b', 'non sono in ordine, o non sono tagliati');
  deve(tanti.quante === 3, 'non dice quanti ce n\'erano');
  return 'null ≠ [], ordinati e tagliati';
});

console.log('\nSCHEDA CLIENTE: ' + ok + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
