/* ═══════════════════════════════════════════════════════════════════════════════
   CHE COSA IL LETTORE TROVA E NON SA CHIAMARE                   (08/10/2026)

   Il metro (`misura-scheda-prodotto.mjs`) dice QUANTO il lettore riconosce.
   Questo dice CHE COSA gli manca, e lo dice con le parole dei documenti.

   PERCHÉ ESISTE, e è la differenza fra sistemare e tirare a indovinare:
   l'08/10/2026 la misura su 207 documenti veri ha dato auto 5,2 garanzie medie
   e tutto il resto fra 0,0 e 0,7 — casa 0,6, salute 0,5, vita 0,0. Il
   vocabolario dell'auto era stato costruito contando i codici veri
   dell'archivio; quello degli altri rami è stato scritto a memoria, e si vede.

   Riempirlo «a memoria» una seconda volta rifarebbe lo stesso errore. Il
   lettore però non butta via quello che non capisce: lo dichiara in
   `fuoriVocabolario`, con la riga del documento e la pagina. Questo strumento
   raccoglie quelle dichiarazioni su tutto il corpo dei documenti e le conta.

   Un nome che compare in trenta documenti di dieci compagnie NON è un caso
   particolare: è una garanzia che il vocabolario non ha. Un nome che compare
   una volta sola è il nome commerciale di un prodotto, e nel vocabolario non
   deve entrare.

       node server/strumenti/cosa-non-capisce.mjs /tmp/note-informative
       node server/strumenti/cosa-non-capisce.mjs /tmp/note-informative --ramo casa

   I PDF delle compagnie non stanno nel repository: si passa la cartella.
   ═══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const require = createRequire(path.join(RADICE, 'package.json'));

const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const PdfTesto = require(path.join(RADICE, 'tariffe/motore/pdf-testo.js'));
const Confronto = require(path.join(RADICE, 'tariffe/motore/confronto.js'));
const Guida = require(path.join(RADICE, 'tariffe/motore/guida-garanzie.js'));
globalThis.window = globalThis.window || {};
globalThis.window.Confronto = Confronto;
globalThis.window.GuidaGaranzie = Guida;
const Scheda = require(path.join(RADICE, 'tariffe/motore/scheda-prodotto.js'));

const cartella = process.argv[2];
const i = process.argv.indexOf('--ramo');
const ramoScelto = i >= 0 ? process.argv[i + 1] : null;
if (!cartella || !fs.existsSync(cartella)) {
  console.error('Serve la cartella dei PDF: node server/strumenti/cosa-non-capisce.mjs <cartella> [--ramo casa]');
  process.exit(2);
}

/* Chi è il documento lo dice il catalogo, via le otto cifre dell'impronta nel
   nome del file: dal nome del file la compagnia non si ricava. */
const CAT = path.join(RADICE, 'tariffe', 'dati', 'note-informative.json');
const perImpronta = new Map();
try {
  const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
  (cat.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => {
    if (d.impronta) perImpronta.set(String(d.impronta).slice(0, 8), { compagnia: c.compagnia, ramo: d.ramo, prodotto: d.prodotto });
  }));
} catch (e) { /* senza catalogo si misura comunque, solo senza i raggruppamenti */ }

async function pagineDi(file) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true, verbosity: 0,
  }).promise;
  const fuori = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    fuori.push({ n: n, testo: PdfTesto.righeDaPezzi(tc.items).join('\n') });
  }
  return fuori;
}

/* Due nomi si contano insieme quando sono la stessa cosa scritta in due modi:
   maiuscole, accenti, spazi doppi, la coda «(opzionale)». Senza questo, lo
   stesso nome si presenta come cinque garanzie diverse e il conto non dice
   niente. */
function chiave(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const files = fs.readdirSync(cartella).filter((f) => /\.pdf$/i.test(f)).sort();
const conta = new Map();
let letti = 0, rifiutati = 0;

for (const f of files) {
  const m = f.match(/-([0-9a-f]{8})\.pdf$/i);
  const chi = (m && perImpronta.get(m[1].toLowerCase())) || null;
  if (ramoScelto && (!chi || chi.ramo !== ramoScelto)) continue;
  let pagine;
  try { pagine = await pagineDi(path.join(cartella, f)); } catch (e) { rifiutati++; continue; }
  const r = Scheda.scheda(pagine, {});
  if (!r.ok) { rifiutati++; continue; }
  letti++;
  (r.fuoriVocabolario || []).forEach((x) => {
    const nome = x.nome || x.chiave || x.titolo || '';
    const k = chiave(nome);
    if (!k || k.length < 4) return;
    if (!conta.has(k)) {
      conta.set(k, { k, come: new Set(), documenti: 0, compagnie: new Set(), rami: new Set(),
        /* DA QUALE REGOLA ARRIVA, e senza questo lo strumento è mezzo cieco:
           un nome trovato dalla sezione obbligatoria del DIP è un candidato
           per il vocabolario, uno trovato da un titolo di articolo nelle
           Condizioni è quasi sempre rumore — una riga della tabella delle
           percentuali di invalidità, per esempio. Distinguerli a occhio, su
           mille nomi, non si fa. */
        forme: new Set(), pagine: [], esempi: [] });
    }
    const v = conta.get(k);
    v.come.add(String(nome).slice(0, 70));
    if (x.forma) v.forme.add(x.forma);
    if (x.pagina != null && v.pagine.length < 5) v.pagine.push(x.pagina);
    v.documenti++;
    if (chi) { v.compagnie.add(chi.compagnia); v.rami.add(chi.ramo); }
    v.rami.add(r.ramo);
    if (v.esempi.length < 3 && x.riga) v.esempi.push(String(x.riga).slice(0, 150));
  });
}

const tutti = [...conta.values()].sort((a, b) => b.compagnie.size - a.compagnie.size || b.documenti - a.documenti);

console.log('\nCHE COSA IL LETTORE TROVA E NON SA CHIAMARE');
console.log(letti + ' documenti letti' + (ramoScelto ? ' del ramo ' + ramoScelto : '') + ', ' + rifiutati + ' rifiutati');
console.log(tutti.length + ' nomi diversi fuori vocabolario\n');

/* ── LA SOGLIA, E PERCHÉ ──────────────────────────────────────────────────
   Si ordina per NUMERO DI COMPAGNIE, non per numero di documenti: un nome
   che compare quindici volte in un solo gruppo assicurativo è il nome
   commerciale di quel gruppo, non una garanzia del mercato. Un nome che
   compare in cinque compagnie diverse è una garanzia che il vocabolario
   non ha. */
console.log('DA METTERE IN VOCABOLARIO (lo stesso nome in tre o più compagnie diverse)');
console.log('-'.repeat(100));
const l = (s, n) => String(s == null ? '' : s).slice(0, n).padEnd(n);
console.log(l('nome', 46) + l('compagnie', 11) + l('doc', 6) + l('forma', 10) + 'rami');
const forti = tutti.filter((x) => x.compagnie.size >= 3);
forti.forEach((x) => console.log(l([...x.come][0], 46) + l(x.compagnie.size, 11) + l(x.documenti, 6)
  + l([...x.forme].join('+'), 10) + [...x.rami].join(' ')));
if (!forti.length) console.log('  (nessuno)');

/* Il conto per FORMA: dice quale regola porta i candidati e quale il rumore.
   È il numero da guardare prima di toccare il vocabolario. */
const perForma = {};
tutti.forEach((x) => [...x.forme].forEach((f) => { perForma[f] = (perForma[f] || 0) + 1; }));
console.log('\nDA QUALE REGOLA ARRIVANO I NOMI SCONOSCIUTI');
Object.entries(perForma).sort((a, b) => b[1] - a[1])
  .forEach(([f, n]) => console.log('  ' + String(n).padStart(5) + '  ' + f));

console.log('\nUNA COMPAGNIA SOLA: quasi sempre nomi commerciali, NON da mettere in vocabolario');
console.log('  ' + tutti.filter((x) => x.compagnie.size === 1).length + ' nomi');

/* L'uscita in JSON serve a chi deve scrivere le righe del vocabolario: a
   mano, da una tabella di cento righe, si sbaglia a copiare. */
const fuoriFile = path.join(cartella, '_fuori-vocabolario.json');
fs.writeFileSync(fuoriFile, JSON.stringify(tutti.map((x) => ({
  chiave: x.k, come_sta_scritto: [...x.come], documenti: x.documenti,
  compagnie: [...x.compagnie], rami: [...x.rami], forme: [...x.forme],
  pagine: x.pagine, esempi: x.esempi,
})), null, 2) + '\n');
console.log('\nTutto in ' + fuoriFile);
