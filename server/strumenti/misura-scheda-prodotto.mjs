/* ═══════════════════════════════════════════════════════════════════════════════
   QUANTO LEGGE DAVVERO IL LETTORE DEI DOCUMENTI DI PRODOTTO   (08/10/2026)

   Si punta a una cartella di PDF veri e si misura, documento per documento,
   quante garanzie il motore riconosce. Non è un collaudo: è un METRO. Serve a
   sapere su quali compagnie il lettore funziona e su quali no, prima di dire
   a qualcuno che «Confronta» funziona.

   Perché esiste: il 02/10/2026 il lettore, tarato sulle forme di UNA compagnia,
   trovava 12 garanzie su 17 su quella e 3 su AXA, 0 sulle condizioni HDI. Un
   numero così non si scopre leggendo il codice: si scopre misurando.

   Le righe si ricostruiscono con la STESSA funzione che usa il browser
   (`PdfTesto.righeDaPezzi`): misurare con un estrattore diverso da quello di
   produzione vuol dire misurare l'estrattore.

       node server/strumenti/misura-scheda-prodotto.mjs <cartella> [--ramo auto]

   I PDF delle compagnie NON stanno nel repository: si passa la cartella dove
   sono stati scaricati.
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
const ramoScelto = (process.argv.indexOf('--ramo') >= 0) ? process.argv[process.argv.indexOf('--ramo') + 1] : null;
if (!cartella || !fs.existsSync(cartella)) {
  console.error('Serve la cartella dei PDF: node server/strumenti/misura-scheda-prodotto.mjs <cartella> [--ramo auto]');
  process.exit(2);
}

/* ─────────────────────────────────────────────────────────────────────────────
   CHI È IL DOCUMENTO: lo dice il catalogo, non il nome del file.

   Il raccoglitore salva i PDF come `Compagnia-Prodotto-<8 cifre di impronta>`,
   con tutto quello che non è una lettera trasformato in «-». Da quel nome la
   compagnia non si ricava: «Intesa-Sanpaolo-Vita-S-p-A-ProteggiPrestito-...»
   si taglia dove capita. Le otto cifre dell'impronta, invece, sono una chiave
   vera: stanno nel catalogo accanto alla compagnia e al ramo.

   Senza questo, con duecento documenti il metro stampa una lista piatta che
   nessuno legge, e la domanda vera — «su quali compagnie Confronta regge?» —
   resta senza risposta. */
const CAT = path.join(RADICE, 'tariffe', 'dati', 'note-informative.json');
const perImpronta = new Map();
try {
  const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
  (cat.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => {
    if (d.impronta) perImpronta.set(String(d.impronta).slice(0, 8), { compagnia: c.compagnia, ramo: d.ramo, prodotto: d.prodotto });
  }));
} catch (e) { /* senza catalogo si misura comunque, solo senza i raggruppamenti */ }

function chiEra(file) {
  const m = file.match(/-([0-9a-f]{8})\.pdf$/i);
  return (m && perImpronta.get(m[1].toLowerCase())) || null;
}

async function pagineDi(file) {
  const dati = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data: dati, useSystemFonts: true, verbosity: 0 }).promise;
  const fuori = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    fuori.push({ n: n, testo: PdfTesto.righeDaPezzi(tc.items).join('\n') });
  }
  return fuori;
}

const files = fs.readdirSync(cartella).filter((f) => /\.pdf$/i.test(f)).sort();
console.log('\nMISURA DEL LETTORE — ' + files.length + ' documenti in ' + cartella + '\n');

const righe = [];
for (const f of files) {
  const nome = f.replace(/-[0-9a-f]{8}\.pdf$/i, '').replace(/\.pdf$/i, '');
  const chi = chiEra(f);
  let pagine;
  try { pagine = await pagineDi(path.join(cartella, f)); }
  catch (e) { righe.push({ nome, chi, pagine: 0, esito: 'PDF illeggibile: ' + (e.message || e) }); continue; }

  const r = Scheda.scheda(pagine, ramoScelto ? { ramo: ramoScelto } : {});
  if (!r.ok) { righe.push({ nome, chi, pagine: pagine.length, esito: (r.scansione ? 'SCANSIONE' : 'rifiutato') + ': ' + String(r.motivo).slice(0, 80) }); continue; }

  const tot = (r.garanzie || []).length;
  const presenti = (r.garanzie || []).filter((g) => g.stato === 'presente').length;
  const conNumeri = (r.garanzie || []).filter((g) => g.massimale || g.franchigia || g.scoperto).length;
  righe.push({ nome, chi, pagine: pagine.length, ramo: r.ramo, tipo: r.tipoDocumento,
    presenti, tot, conNumeri, esito: null });
}

const l = (s, n) => String(s == null ? '' : s).slice(0, n).padEnd(n);
console.log(l('documento', 42) + l('pag', 5) + l('ramo', 8) + l('tipo', 16) + l('trovate', 9) + 'con numeri');
console.log('-'.repeat(92));
righe.forEach((x) => {
  if (x.esito) { console.log(l(x.nome, 42) + l(x.pagine, 5) + x.esito); return; }
  console.log(l(x.nome, 42) + l(x.pagine, 5) + l(x.ramo, 8) + l(x.tipo, 16)
    + l(x.presenti + '/' + x.tot, 9) + x.conNumeri);
});

const buoni = righe.filter((x) => !x.esito);
const media = buoni.length ? (buoni.reduce((s, x) => s + x.presenti, 0) / buoni.length) : 0;
console.log('\n' + buoni.length + ' documenti letti, ' + (righe.length - buoni.length) + ' rifiutati · '
  + 'media garanzie trovate: ' + media.toFixed(1));
/* Il numero che conta per «Confronta»: un documento con meno di cinque
   garanzie riconosciute non regge un confronto davanti a un cliente. */
const deboli = buoni.filter((x) => x.presenti < 5);
if (deboli.length) {
  console.log('\nSOTTO LE CINQUE GARANZIE (un confronto con questi non si mostra a un cliente):');
  deboli.forEach((x) => console.log('  · ' + x.nome + ' — ' + x.presenti));
}

/* ─────────────────────────────────────────────────────────────────────────────
   IL CONTO PER COMPAGNIA E PER RAMO.

   È la parte che serve a decidere: «Confronta» non funziona o non funziona a
   metà — funziona su certe compagnie e certi rami e non su altri, e la media
   generale nasconde esattamente la cosa da sapere. Un ramo con la media a due
   garanzie non è un ramo da sistemare dopo: è un ramo da non mostrare.
   ───────────────────────────────────────────────────────────────────────────── */
function raggruppa(chiave, titolo) {
  const g = new Map();
  righe.forEach((x) => {
    const k = chiave(x);
    if (!k) return;
    if (!g.has(k)) g.set(k, { letti: 0, rifiutati: 0, garanzie: 0, numeri: 0 });
    const v = g.get(k);
    if (x.esito) { v.rifiutati++; return; }
    v.letti++; v.garanzie += x.presenti; v.numeri += x.conNumeri;
  });
  if (!g.size) return;
  console.log('\n── ' + titolo + ' ──');
  console.log(l('', 46) + l('letti', 7) + l('rifiut.', 8) + l('media gar.', 12) + 'media con numeri');
  [...g.entries()]
    /* In coda chi va peggio: è la riga da cui si riparte, e in fondo la si
       vede anche senza scorrere. */
    .sort((a, b) => (b[1].letti ? b[1].garanzie / b[1].letti : -1) - (a[1].letti ? a[1].garanzie / a[1].letti : -1))
    .forEach(([k, v]) => console.log(l(k, 46) + l(v.letti, 7) + l(v.rifiutati, 8)
      + l(v.letti ? (v.garanzie / v.letti).toFixed(1) : '—', 12)
      + (v.letti ? (v.numeri / v.letti).toFixed(1) : '—')));
}
raggruppa((x) => (x.chi && x.chi.ramo) || (x.esito ? null : x.ramo), 'PER RAMO');
raggruppa((x) => x.chi && x.chi.compagnia, 'PER COMPAGNIA');

/* IL NUMERO CHE DICE LA VERITÀ SU «CONFRONTA»: quante garanzie portano un
   importo. Un confronto fra garanzie senza massimali è un elenco di nomi, e
   il 02/10/2026 era così su 30 documenti su 31. */
const conQualcosa = buoni.filter((x) => x.conNumeri > 0).length;
console.log('\nDOCUMENTI CON ALMENO UN IMPORTO ATTACCATO A UNA GARANZIA: '
  + conQualcosa + ' su ' + buoni.length
  + (buoni.length ? ' (' + Math.round(conQualcosa * 100 / buoni.length) + '%)' : ''));
