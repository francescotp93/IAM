/* ═══════════════════════════════════════════════════════════════════════════════
   IL TESTO DEI DOCUMENTI, IN CHIARO E CERCABILE                 (08/10/2026)

   Prende una cartella di PDF scaricati dal raccoglitore e ne scrive il testo
   in file `.txt`, uno per documento.

   PERCHÉ ESISTE: per capire perché il lettore non riconosce una garanzia
   bisogna vedere COM'È SCRITTA nel documento, e per vederlo su centosessanta
   documenti serve poterli cercare con `grep`. Riaprire ogni PDF con pdfjs per
   ogni domanda costa minuti; il testo su disco si cerca in un secondo.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LE RIGHE SI RICOSTRUISCONO COME IN PRODUZIONE.                            │
   └───────────────────────────────────────────────────────────────────────────┘
   Il testo lo si ricava con `PdfTesto.righeDaPezzi`, la STESSA funzione che
   usa il browser. Non è un dettaglio: un PDF non contiene righe, contiene
   pezzi di testo con una posizione, e il modo in cui li si rimette in riga
   decide che cosa il motore vede. Estrarre il testo con `pdftotext` e poi
   accusare il motore di non riconoscere una forma vorrebbe dire guardare un
   documento diverso da quello che il motore legge.

   In testa a ogni file si scrive chi è il documento (compagnia, ramo,
   prodotto), preso dal catalogo tramite le otto cifre dell'impronta nel nome
   del file: dal nome del file la compagnia non si ricava.

   I DOCUMENTI DELLE COMPAGNIE NON ENTRANO NEL REPOSITORY, e nemmeno il loro
   testo: la cartella di uscita sta fuori.

       node server/strumenti/testo-dei-documenti.mjs /tmp/note-informative /tmp/note-testo
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

const DA = process.argv[2];
const A = process.argv[3];
if (!DA || !A || !fs.existsSync(DA)) {
  console.error('Serve la cartella dei PDF e quella dove scrivere il testo:\n' +
    '  node server/strumenti/testo-dei-documenti.mjs /tmp/note-informative /tmp/note-testo');
  process.exit(2);
}
if (!fs.existsSync(A)) fs.mkdirSync(A, { recursive: true });

const CAT = path.join(RADICE, 'tariffe', 'dati', 'note-informative.json');
const perImpronta = new Map();
try {
  const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
  (cat.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => {
    if (d.impronta) {
      perImpronta.set(String(d.impronta).slice(0, 8),
        { compagnia: c.compagnia, ramo: d.ramo, prodotto: d.prodotto, tipo: d.tipo, url: d.url });
    }
  }));
} catch (e) { /* senza catalogo si scrive comunque, solo senza l'intestazione */ }

const files = fs.readdirSync(DA).filter((f) => /\.pdf$/i.test(f)).sort();
console.log('\nTESTO DI ' + files.length + ' DOCUMENTI → ' + A + '\n');

let fatti = 0, rotti = 0, scansioni = 0;
const indice = [];

for (const f of files) {
  const m = f.match(/-([0-9a-f]{8})\.pdf$/i);
  const chi = (m && perImpronta.get(m[1].toLowerCase())) || null;
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(fs.readFileSync(path.join(DA, f))), useSystemFonts: true, verbosity: 0,
    }).promise;
  } catch (e) {
    console.log('✗ ' + f + '  PDF illeggibile: ' + String(e?.message || e).slice(0, 80));
    rotti++; continue;
  }

  const pezzi = [];
  let caratteri = 0;
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    const righe = PdfTesto.righeDaPezzi(tc.items);
    const t = righe.join('\n');
    caratteri += t.length;
    /* La pagina si marca: un riferimento come «pagina 14» serve a chi poi va a
       guardare il PDF vero, e senza il marcatore quel numero si perde. */
    pezzi.push('───── pagina ' + n + ' / ' + doc.numPages + ' ─────\n' + t);
  }

  /* UN DOCUMENTO SCANSIONATO VA DETTO, NON NASCOSTO. Zero caratteri (o quasi)
     vuol dire immagini: il testo non c'è, e chi cercasse qui dentro troverebbe
     il nulla e ne dedurrebbe che la garanzia non è scritta. */
  const perPagina = doc.numPages ? caratteri / doc.numPages : 0;
  const scansione = perPagina < 25;
  if (scansione) scansioni++;

  const nome = f.replace(/\.pdf$/i, '.txt');
  const testa = [
    '# ' + (chi ? chi.compagnia : '(compagnia non nel catalogo)'),
    '# prodotto: ' + (chi ? chi.prodotto : '—'),
    '# ramo:     ' + (chi ? chi.ramo : '—') + '   tipo: ' + (chi ? (chi.tipo || '—') : '—'),
    '# pagine:   ' + doc.numPages + '   caratteri: ' + caratteri +
      ' (' + perPagina.toFixed(0) + ' per pagina)' + (scansione ? '   ⚠ SCANSIONE: testo assente' : ''),
    '# file pdf: ' + f,
    '# indirizzo: ' + (chi ? chi.url : '—'),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(A, nome), testa + pezzi.join('\n\n') + '\n');
  indice.push({ txt: nome, compagnia: chi ? chi.compagnia : null, ramo: chi ? chi.ramo : null,
    prodotto: chi ? chi.prodotto : null, pagine: doc.numPages, caratteri, scansione });
  fatti++;
  if (fatti % 25 === 0) console.log('  ' + fatti + '/' + files.length);
}

/* Un indice in JSON: serve a chi deve scegliere quali documenti guardare per
   ramo o per compagnia senza aprirli tutti. */
fs.writeFileSync(path.join(A, '_indice.json'), JSON.stringify(indice, null, 2) + '\n');

console.log('\n' + fatti + ' scritti, ' + rotti + ' illeggibili, ' + scansioni + ' scansioni (testo assente)');
console.log('Indice: ' + path.join(A, '_indice.json'));
