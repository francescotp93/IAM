// ═══════════════════════════════════════════════════════════════════════════════
//  TFR DAL LATO DEL DATORE — il motore tariffe/motore/tfr-datore.js
//
//  Il conto si verifica A MANO, su un caso che chiunque rifa' con la
//  calcolatrice: 10 dipendenti, 2.000 € al mese, 13 mensilita'. E si verifica
//  che, da 50 addetti in su, il motore smetta di promettere un risparmio che
//  non esiste: il TFR va comunque alla Tesoreria INPS.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const T = require('../../tariffe/motore/tfr-datore.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };
const vicino = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const BASE = { soglia: 'meno50', dipendenti: 10, stipendioMedioMensile: 2000, mensilita: 13, forma: 'societa' };

prova('il caso a mano: 10 dipendenti a 2.000 € su 13 mensilità', () => {
  const e = T.calcola(BASE);
  deve(e.ok, (e.problemi || []).join('; '));
  deve(e.monteRetributivo === 260000, 'monte retributivo ' + e.monteRetributivo);
  deve(vicino(e.tfrAnnuo, 260000 / 13.5), 'TFR annuo ' + e.tfrAnnuo + ' (atteso 260000/13,5)');
  deve(vicino(e.deduzioneAnnua, e.tfrAnnuo * 0.06), 'deduzione 6% ' + e.deduzioneAnnua);
  deve(vicino(e.valoreDeduzioneAnnuo, e.deduzioneAnnua * 0.24), 'valore IRES della deduzione ' + e.valoreDeduzioneAnnuo);
  deve(e.esoneroAnnuo === 520, 'esonero Fondo garanzia 0,20% → ' + e.esoneroAnnuo);
  deve(e.sgravioAnnuo === 728, 'contributi minori 0,28% → ' + e.sgravioAnnuo);
  deve(vicino(e.risparmioAnnuo, 277.33 + 520 + 728), 'risparmio annuo ' + e.risparmioAnnuo);
  return 'TFR 19.259 €, deduzione 1.156 € → 277 € di IRES, +520 € +728 €: 1.525 € il primo anno';
});

prova('la rivalutazione si paga sul TFR ACCANTONATO: zero il primo anno, poi cresce', () => {
  const e = T.calcola(BASE);
  deve(e.perAnno[0].rivalutazioneEvitata === 0, 'il primo anno c\'è rivalutazione su un TFR che non c\'è ancora');
  deve(vicino(e.perAnno[1].rivalutazioneEvitata, e.tfrAnnuo * (0.015 + 0.75 * 0.02)), 'secondo anno: ' + e.perAnno[1].rivalutazioneEvitata);
  for (let i = 2; i < e.perAnno.length; i++) deve(e.perAnno[i].rivalutazioneEvitata > e.perAnno[i - 1].rivalutazioneEvitata, 'la rivalutazione non cresce all\'anno ' + (i + 1));
  deve(vicino(e.tassoRivalutazione, 0.03, 1e-9), 'tasso 1,5% + 75% di 2% deve fare 3%: ' + e.tassoRivalutazione);
  return '0 → 578 € → crescente, tasso 3%';
});

prova('il ventennale è la somma degli anni, e dichiara quanto è rivalutazione', () => {
  const e = T.calcola(BASE);
  const somma = e.perAnno.reduce((s, a) => s + a.vantaggio, 0);
  deve(vicino(e.ventennale.totale, somma, 0.5), 'il totale non è la somma degli anni: ' + e.ventennale.totale + ' vs ' + somma);
  deve(vicino(e.ventennale.misureCompensative, e.risparmioAnnuo * 20, 0.5), 'le misure compensative su 20 anni non sono 20 volte l\'annuo');
  deve(vicino(e.ventennale.totale, e.ventennale.misureCompensative + e.ventennale.rivalutazioneEvitata, 0.5), 'i due pezzi non fanno il totale');
  deve(e.anni === 20 && e.perAnno.length === 20, 'non sono 20 anni');
  return e.ventennale.totale.toFixed(0) + ' € in 20 anni, di cui ' + e.ventennale.rivalutazioneEvitata.toFixed(0) + ' di rivalutazione';
});

prova('DA 50 ADDETTI IN SU il TFR va in Tesoreria: per l\'azienda il fondo è neutro, e lo dice', () => {
  const e = T.calcola({ ...BASE, soglia: 'almeno50', dipendenti: 60 });
  deve(e.confronto === 'tesoreria', 'il confronto non è contro la Tesoreria');
  deve(e.risparmioAnnuo === 0 && e.ventennale.totale === 0, 'promette un risparmio che non c\'è: ' + e.risparmioAnnuo);
  deve(e.aliquotaDeduzione === 0.04, 'la deduzione sopra i 50 non è il 4%');
  deve(/Tesoreria/.test(e.nota) && /dipendente/.test(e.nota), 'la nota non dice che il vantaggio è del dipendente');
  deve(/755/.test(e.fonteTesoreria) && /764/.test(e.fonteTesoreria), 'manca la fonte di legge sulla Tesoreria');
  const t = T.tabellaHtml(e);
  deve(/Tesoreria/.test(t) && /Neutro/.test(t), 'la tabella non dice che il confronto è con la Tesoreria e neutro');
  deve(!/risparmi/i.test(T.spiegazioneHtml(e).replace(/non c'è un risparmio da promettere/, '')), 'la spiegazione promette un risparmio');
  return 'neutro, 4%, fonte L. 296/2006 cc. 755 e 764';
});

prova('sotto i 50 la deduzione è il 6%, e «oltre50» è accettato come sinonimo di «almeno50»', () => {
  deve(T.calcola(BASE).aliquotaDeduzione === 0.06, 'sotto i 50 non è il 6%');
  deve(T.calcola({ ...BASE, soglia: 'oltre50' }).confronto === 'tesoreria', 'oltre50 non è letto');
  return '6% / 4%';
});

prova('ditta individuale: la deduzione vale l\'IRPEF marginale del titolare, non l\'IRES', () => {
  const e = T.calcola({ ...BASE, forma: 'individuale', redditoTitolareAnnuo: 45000 });
  deve(e.imposta.tipo === 'IRPEF' && vicino(e.imposta.valore, 0.33, 1e-9), 'aliquota: ' + JSON.stringify(e.imposta));
  deve(vicino(e.valoreDeduzioneAnnuo, e.deduzioneAnnua * 0.33), 'il valore non usa il 33%');
  const s = T.calcola({ ...BASE, forma: 'societa' });
  deve(s.imposta.tipo === 'IRES' && s.imposta.valore === 0.24, 'la società non usa l\'IRES');
  return 'IRPEF 33% sul titolare a 45.000 €, IRES 24% per la società';
});

prova('senza il reddito del titolare l\'aliquota NON si inventa: la deduzione resta senza valore e viaggia marcata', () => {
  const e = T.calcola({ ...BASE, forma: 'individuale' });
  deve(e.imposta.tipo === null && e.valoreDeduzioneAnnuo === null, 'ha inventato un\'aliquota');
  deve(e.daConfermare.some(x => /aliquota/i.test(x.etichetta)), 'non marca l\'aliquota mancante');
  deve(vicino(e.risparmioAnnuo, 520 + 728), 'il risparmio annuo conta lo stesso esonero e sgravio: ' + e.risparmioAnnuo);
  return 'deduzione senza valore, marcata; esonero e sgravio restano';
});

prova('i dati mancanti si dicono, non si indovinano', () => {
  const a = T.calcola({ soglia: 'meno50' });
  deve(!a.ok && a.problemi.length === 2, 'senza dipendenti e stipendio passa: ' + JSON.stringify(a.problemi));
  const b = T.calcola({ ...BASE, mensilita: 99 });
  deve(b.ok && b.mensilita === 16, 'mensilità assurde non vengono contenute: ' + b.mensilita);
  const c = T.calcola({ ...BASE, dipendenti: 2.7 });
  deve(c.dipendenti === 2, 'i dipendenti non sono un intero: ' + c.dipendenti);
  return 'due problemi detti, mensilità contenute, dipendenti interi';
});

prova('ogni numero di legge ha la fonte, e nessuno è da confermare di suo', () => {
  for (const k of Object.keys(T.LEGGE)) {
    deve(T.LEGGE[k].fonte && /\d/.test(T.LEGGE[k].fonte), k + ' senza fonte con un riferimento normativo');
    deve(T.LEGGE[k].daConfermare === false, k + ' è marcato da confermare');
  }
  deve(T.daConfermare().length === 0, 'da confermare non vuoto: ' + JSON.stringify(T.daConfermare()));
  deve(T.LEGGE.deduzioneMeno50.v === 0.06 && T.LEGGE.deduzioneAlmeno50.v === 0.04 && T.LEGGE.esoneroFondoGaranzia.v === 0.002 &&
       T.LEGGE.riduzioneOneriImpropri.v === 0.0028 && T.LEGGE.rivalutazioneFissa.v === 0.015 && T.LEGGE.rivalutazioneQuotaInflazione.v === 0.75 &&
       T.LEGGE.divisoreTfr.v === 13.5 && T.LEGGE.sogliaTesoreria.v === 50 && T.LEGGE.ires.v === 0.24, 'un numero di legge non è quello del brief');
  return Object.keys(T.LEGGE).length + ' numeri, tutti con fonte';
});

prova('la tabella dei parametri sovrascrive la riserva e porta la sua fonte; una riga provvisoria resta marcata', () => {
  const T2 = require('../../tariffe/motore/tfr-datore.js');   // stessa istanza: si rimette a posto alla fine
  const r = T2.numeriDiLegge({ tfr_datore_deduzione: { meno50: 0.07, almeno50: 0.05 }, ires: 0.25, inflazione_attesa: 0.03,
    __fonti: { ires: 'Legge X' }, __daConfermare: { ires: true } });
  deve(r.applicati.includes('deduzioneMeno50') && r.applicati.includes('ires') && r.applicati.includes('inflazioneAttesa'), 'non applicati: ' + r.applicati);
  deve(T2.LEGGE.ires.v === 0.25 && T2.LEGGE.ires.fonte === 'Legge X' && T2.LEGGE.ires.daConfermare === true, 'IRES non sovrascritta o non marcata');
  deve(T2.daConfermare().some(x => /IRES/.test(x.etichetta)), 'la riga provvisoria non viaggia marcata');
  deve(vicino(T2.tassoRivalutazione(), 0.015 + 0.75 * 0.03, 1e-9), 'l\'inflazione nuova non entra nella rivalutazione');
  T2.numeriDiLegge({ tfr_datore_deduzione: { meno50: 0.06, almeno50: 0.04 }, ires: 0.24, inflazione_attesa: 0.02, __fonti: {}, __daConfermare: {} });
  deve(T2.daConfermare().length === 0, 'non si è rimesso a posto');
  return 'sovrascritti con fonte, provvisorio marcato';
});

prova('prima la tabella coi numeri, sotto la spiegazione: le voci del brief ci sono tutte', () => {
  const e = T.calcola(BASE);
  const t = T.tabellaHtml(e, { classeTabella: 'pv-conf' });
  deve(/^<table class="pv-conf tfr-datore">/.test(t), 'la tabella non prende la classe di chi la incolla');
  for (const voce of ['Deduzione', 'Fondo di garanzia', 'Contributi minori', 'Rivalutazione', 'Liquidità']) deve(t.includes(voce), 'manca la riga ' + voce);
  deve(/TFR in azienda/.test(t) && /TFR al fondo pensione/.test(t), 'le due colonne non sono azienda e fondo');
  deve(/1\.525 €/.test(t) && /Il primo anno/.test(t), 'il totale annuo non è scritto in tabella');
  const s = T.spiegazioneHtml(e);
  for (const parola of ['Deduzione', 'Fondo di garanzia', 'Rivalutazione', 'Liquidità', 'Anticipazioni', 'Ipotesi']) deve(s.includes(parola), 'la spiegazione non parla di ' + parola);
  deve(/costanti/.test(s) && /Inflazione attesa 2%/.test(s) && /IRES/.test(s), 'le ipotesi non sono dichiarate per intero');
  deve(!/<table/.test(s), 'la spiegazione contiene una tabella: deve essere discorsiva');
  return 'cinque voci in tabella, sei nella spiegazione, ipotesi dichiarate';
});

console.log('\n══ TFR DATORE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nTFR DATORE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
