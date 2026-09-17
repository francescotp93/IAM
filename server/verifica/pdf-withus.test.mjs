// ═══════════════════════════════════════════════════════════════════════════════
//  LA CARTA INTESTATA CONDIVISA — tariffe/motore/pdf-withus.js
//
//  Qui jsPDF non c'e': si passa un `doc` finto che annota le chiamate, e si
//  guarda che cosa finirebbe scritto e disegnato. E' l'unico modo di provare
//  un PDF senza aprire un browser, ed e' il motivo per cui il documento
//  strutturato sta nel motore pensione e il disegno qui.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const W = require('../../tariffe/motore/pdf-withus.js');
const P = require('../../tariffe/motore/pensione.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Il doc finto: annota testi e forme, spezza le righe come farebbe jsPDF (a
   spanne), conta le pagine. */
function Fake() { this.testi = []; this.forme = { rect: 0, roundedRect: 0, circle: 0, line: 0, addImage: 0 }; this.pagine = 1; this.props = null; this.colori = []; }
['setFont', 'setFontSize', 'setLineWidth', 'setPage', 'setGState', 'setDrawColor'].forEach(m => { Fake.prototype[m] = function () {}; });
Fake.prototype.setFillColor = function (r, g, b) { this.colori.push([r, g, b]); };
Fake.prototype.setTextColor = function () {};
['rect', 'roundedRect', 'circle', 'line', 'addImage'].forEach(m => { Fake.prototype[m] = function () { this.forme[m]++; }; });
Fake.prototype.text = function (v) { this.testi.push(Array.isArray(v) ? v.join(' ') : String(v)); };
Fake.prototype.splitTextToSize = function (t, w) {
  const per = Math.max(10, Math.floor(w / 1.6)); const out = [];
  for (const riga of String(t).split('\n')) { let s = riga; while (s.length > per) { out.push(s.slice(0, per)); s = s.slice(per); } out.push(s); }
  return out;
};
Fake.prototype.addPage = function () { this.pagine++; };
Fake.prototype.getNumberOfPages = function () { return this.pagine; };
Fake.prototype.setProperties = function (p) { this.props = p; };
Fake.prototype.GState = function (o) { return o; };

const BASE = { lavoro: 'dipendente', eta: 38, redditoMensile: 1800, baseReddito: 'netto', mensilita: 13, versamentoMensile: 100, etaInizioLavoro: 25 };
const DATI = (e, extra) => Object.assign({ esito: e, cliente: { id: 'a1', nome: 'Mario Rossi', telefono: '3331234567' },
  consulente: { nome: 'Francesco Oddo', rui: 'B000123456', ruolo: 'Consulente previdenziale', email: 'f@withus.it' },
  dataRiferimento: '17/09/2026', azienda: { ragioneSociale: 'With Us Assicurazioni S.r.l.', sede: 'Via X 1', piva: '01234567890', rui: 'sez. A n. A000123456', contatti: ['06 1234'] } }, extra || {});

prova('safe: apostrofi, trattini ed euro escono in una forma che Helvetica sa scrivere', () => {
  deve(W.safe('l’euro € 480,00 e 5.000.000 €, poi…') === "l'euro EUR 480,00 e 5.000.000 EUR, poi...", W.safe('l’euro € 480,00 e 5.000.000 €, poi…'));
  deve(W.pulisciHtml('<p><b>Ciao</b> mondo</p><p>due &amp; tre</p>') === 'Ciao mondo\ndue & tre', W.pulisciHtml('<p><b>Ciao</b> mondo</p><p>due &amp; tre</p>'));
  return 'EUR per esteso, niente tag';
});

prova('la fascia porta i due cerchi e il logo (o la piastrella), su ogni pagina nuova', () => {
  const d = new Fake(); const p = W.primitive(d, '');
  p.fascia(62);
  deve(d.forme.circle === 2 && d.forme.rect === 2, 'fascia: cerchi ' + d.forme.circle + ' rettangoli ' + d.forme.rect);
  deve(d.testi.includes('WU'), 'senza logo manca la piastrella WU');
  const d2 = new Fake(); W.primitive(d2, 'data:image/png;base64,xx').fascia(62);
  deve(d2.forme.addImage === 1 && !d2.testi.includes('WU'), 'col logo la piastrella non deve esserci');
  return 'due cerchi, logo o WU';
});

prova('intestazione, piede e filigrana: agenzia a sinistra, documento a destra, pagine numerate', () => {
  const d = new Fake(); const p = W.primitive(d, '');
  p.intestazione({ ragioneSociale: 'With Us', sede: 'Roma', piva: '1', rui: 'sez. A n. 1', contatti: ['06'] }, 'PREVENTIVO PERSONALIZZATO', 'PP-1', 'del 17/09/2026');
  deve(d.testi.join('|') === 'With Us|Roma|P.IVA 1  ·  RUI sez. A n. 1|06|PREVENTIVO PERSONALIZZATO|PP-1|del 17/09/2026', d.testi.join('|'));
  d.addPage(); p.piede('With Us · Doc', 'PP-1');
  deve(d.testi.includes('PP-1  |  Pagina 1 di 2') && d.testi.includes('PP-1  |  Pagina 2 di 2'), 'le pagine non sono numerate su tutte: ' + d.testi.slice(-4).join(' / '));
  p.filigrana('DA AUTORIZZARE');
  deve(d.testi.filter(t => t === 'DA AUTORIZZARE').length === 2, 'la filigrana non sta su ogni pagina');
  return 'intestazione nell\'ordine, piede su 2 pagine, filigrana su 2';
});

prova('la tabella ripete l\'intestazione quando cambia pagina, e non lascia righe a meta\'', () => {
  const d = new Fake(); const p = W.primitive(d, '');
  const righe = []; for (let i = 0; i < 60; i++) righe.push(['voce ' + i, 'x'.repeat(120), 'y']);
  p.tabella(200, ['A', 'B', 'C'], righe, { larghezze: [1, 3, 1] });
  deve(d.pagine >= 3, 'sessanta righe lunghe stanno in ' + d.pagine + ' pagine?');
  const teste = d.testi.filter(t => t === 'A').length;
  deve(teste === d.pagine, 'l\'intestazione compare ' + teste + ' volte su ' + d.pagine + ' pagine');
  return d.pagine + ' pagine, intestazione ripetuta ' + teste + ' volte';
});

prova('disegna(): un documento strutturato esce con intestazione, colonne, blocchi, firma, avvertenze e piede', () => {
  const doc = W.disegna(Fake, { tipo: 'PROVA', numero: 'N-1', azienda: { ragioneSociale: 'With Us' },
    colonne: [{ titolo: 'CLIENTE', righe: ['Mario Rossi', 'riga 2'] }, { titolo: 'CONSULENTE', righe: ['F. O.'] }],
    blocchi: [{ tipo: 'titolo', testo: 'Sezione' }, { tipo: 'tessere', voci: [{ etichetta: 'a', valore: '1 €' }, { etichetta: 'b', valore: '2 €', tono: 'gap' }] },
      { tipo: 'testo', titolo: 'T', paragrafi: ['<b>ciao</b> € 5'] }, { tipo: 'tabella', intestazioni: ['x', 'y'], righe: [['1', '2'], { celle: ['3', '4'], evidenzia: true }] },
      { tipo: 'banda', testo: 'ATTENZIONE', tono: 'ambra' }],
    firma: { nome: 'F. O.', rui: 'B1', email: 'f@x.it' }, avvertenze: 'Proiezione illustrativa.', filigrana: 'STIMA' }, { logo: '' });
  const t = doc.testi.join(' | ');
  for (const atteso of ['PROVA', 'N-1', 'With Us', 'CLIENTE', 'Mario Rossi', 'CONSULENTE', 'SEZIONE', 'A', '1 EUR', 'B', '2 EUR', 'T', 'ciao EUR 5', 'X', 'Y', '3', 'ATTENZIONE', 'CHI FIRMA', 'F. O. · RUI B1', 'AVVERTENZE', 'Proiezione illustrativa.', 'STIMA', 'N-1  |  Pagina 1 di'])
    deve(t.includes(atteso), 'manca «' + atteso + '»: ' + t.slice(0, 200));
  deve(doc.props && doc.props.title === 'N-1', 'le proprieta\' del PDF non sono scritte');
  deve(!/€/.test(t), 'un euro e\' passato senza essere scritto per esteso');
  return doc.testi.length + ' scritte, tutte le parti presenti';
});

prova('Pensione.documentoPdf: gli stessi requisiti del foglio, e gli stessi numeri', () => {
  const e = P.calcola(BASE);
  const senza = P.documentoPdf(DATI(e, { cliente: { nome: 'Mario Rossi' } }));
  deve(!senza.ok && senza.problemi.some(x => /anagrafica/.test(x)), 'senza scheda il documento esce');
  const r = P.documentoPdf(DATI(e));
  deve(r.ok, (r.problemi || []).join('; '));
  const d = r.documento;
  deve(d.tipo === 'ANALISI PREVIDENZIALE' && d.numero === '17/09/2026', 'intestazione: ' + d.tipo + ' ' + d.numero);
  deve(d.colonne[0].righe[0] === 'Mario Rossi' && d.colonne[1].righe[0] === 'Francesco Oddo', 'le colonne non portano cliente e consulente');
  deve(d.firma.rui === 'B000123456' && /illustrativo/.test(d.avvertenze) && /NON è una promessa/.test(d.avvertenze), 'firma o avvertenze mancanti');
  deve(d.nomeFile === 'Analisi-previdenziale-Mario-Rossi-17-09-2026.pdf', 'nome file: ' + d.nomeFile);
  const html = P.foglioHtml(DATI(e)).html;
  const doc = W.disegna(Fake, d, { logo: '' }); const t = doc.testi.join(' | ');
  /* GLI STESSI NUMERI DEL FOGLIO HTML: il divario, la pensione, le proposte. */
  const euro = n => Math.round(n).toLocaleString('it-IT', { useGrouping: 'always' });
  for (const n of [e.gapMensile, e.pensioneNettaMensile, e.redditoNettoMensile]) {
    deve(html.includes(euro(n) + ' €') && t.includes(euro(n) + ' EUR'), 'il numero ' + euro(n) + ' non sta su tutti e due i fogli');
  }
  for (const p of e.proposte) deve(t.includes(euro(p.versamentoMensile) + ' EUR al mese'), 'la proposta ' + p.versamentoMensile + ' non e\' sul PDF');
  deve(/TFR IN AZIENDA/.test(t) && /Quando posso prendere prima/i.test(t.toUpperCase()) === false || /QUANDO POSSO PRENDERE PRIMA/.test(t), 'TFR e riscatto non sono sul PDF del dipendente');
  deve(d.banda === null && d.filigrana && /STIMA/.test(d.filigrana), 'con valori da confermare la filigrana STIMA deve esserci, la banda prudenziale no');
  return 'stessi numeri di foglioHtml, ' + doc.testi.length + ' scritte, ' + doc.pagine + ' pagine';
});

prova('Pensione.documentoPdf: «TFR no» → niente TFR; autonomo con dipendenti → tabella del datore prima della spiegazione', () => {
  const no = P.documentoPdf(DATI(P.calcola({ ...BASE, tfrInAzienda: false })));
  const tNo = W.disegna(Fake, no.documento, { logo: '' }).testi.join(' | ');
  deve(!/TFR/.test(tNo), 'il PDF nomina il TFR a chi ha detto no');
  deve(/QUANDO POSSO PRENDERE PRIMA I MIEI SOLDI/.test(tNo) && /NEL FONDO PENSIONE/.test(tNo), 'il riscatto a una colonna e\' sparito');
  const e = P.calcola({ ...BASE, lavoro: 'autonomo', mensilita: 12, datore: { haDipendenti: true, soglia: 'meno50', dipendenti: 10, stipendioMedioMensile: 2000, mensilita: 13, forma: 'societa' } });
  const r = P.documentoPdf(DATI(e));
  const tipi = r.documento.blocchi.map(b => b.tipo + ':' + (b.testo || b.titolo || '')).join(' > ');
  const iTab = r.documento.blocchi.findIndex(b => b.tipo === 'tabella' && (b.intestazioni || []).includes('TFR al fondo pensione'));
  const iSp = r.documento.blocchi.findIndex(b => b.tipo === 'testo' && b.titolo === 'LE DIFFERENZE, UNA PER UNA');
  deve(iTab > 0 && iSp > iTab, 'la spiegazione del datore non viene dopo la tabella: ' + tipi);
  const t = W.disegna(Fake, r.documento, { logo: '' }).testi.join(' | ');
  deve(/1\.525 EUR/.test(t) && /Fondo di garanzia/.test(t) && /Liquidit/.test(t), 'i numeri del datore non sono sul PDF');
  deve(!/<\/?[bp]>/.test(t), 'tag HTML sul PDF');
  const prud = P.documentoPdf(DATI(P.calcola({ ...BASE, etaInizioLavoro: null })));
  deve(prud.documento.banda && prud.documento.banda.tono === 'ambra' && /PRUDENZIALE/.test(prud.documento.banda.testo), 'la stima prudenziale non sta in cima come banda');
  return 'no → zero TFR; datore: tabella poi spiegazione, 1.525 EUR; prudenziale in banda';
});

console.log('\n══ PDF WITH US ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPDF WITH US: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
