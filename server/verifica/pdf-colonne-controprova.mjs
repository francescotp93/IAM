/* Controprova di pdf-colonne.test.mjs.

   Le prove delle colonne tirano in due direzioni opposte: larghe abbastanza
   per leggere per colonne un DIP impaginato su due, strette abbastanza per
   NON spezzare una riga di tabella. Un guasto per ciascuna delle due
   direzioni, più uno per ogni condizione che le distingue.

   Il guasto che conta più di tutti è «le colonne non si separano più»: era il
   comportamento di prima, e su 94 documenti su 214 rendeva la pagina del DIP
   illeggibile.

   Ogni guasto resta JavaScript VALIDO, e il file si rimette sempre a posto.

       node server/verifica/pdf-colonne-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const PT = join(RADICE, 'tariffe', 'motore', 'pdf-testo.js')
const TEST = join(QUI, 'pdf-colonne.test.mjs')

const BUONI = { [PT]: readFileSync(PT, 'utf8') }

const GUASTI = [
  /* ── LE COLONNE NON SI SEPARANO (il comportamento di prima) ────────────── */
  ['LE COLONNE NON SI SEPARANO PIU\': il DIP torna illeggibile', PT,
    (s) => s.replace('    var conf = confineDelleColonne(righe);', '    var conf = null;')],

  ['il confine si cerca ma non si usa per dividere', PT,
    (s) => s.replace("        r.pezzi.forEach(function (p) { ((p.x + p.w / 2) < conf ? s : d).push(p); });",
      '        r.pezzi.forEach(function (p) { s.push(p); });')],

  ['la colonna di destra si stampa prima di quella di sinistra', PT,
    (s) => s.replace('      a.concat(b).forEach(function (l) { if (l) fuori.push(l); });',
      '      b.concat(a).forEach(function (l) { if (l) fuori.push(l); });')],

  /* ── LE CONDIZIONI CHE TENGONO FUORI LE TABELLE ─────────────────────────── */
  ['due righe bastano a dichiarare due colonne: le tabelle si spezzano', PT,
    (s) => s.replace('  var RIGHE_MINIME = 6;', '  var RIGHE_MINIME = 2;')],

  ['LA PROSA NON SI PRETENDE PIU\': una tabella di celle corte si spezza', PT,
    (s) => s.replace('    if (sin / nSin < CARATTERI_MINIMI || des / nDes < CARATTERI_MINIMI) return null;', '')],

  ['il vuoto fra le colonne diventa un soffio: ogni spazio e\' una colonna', PT,
    (s) => s.replace('  var VUOTO_MINIMO = 18;', '  var VUOTO_MINIMO = 2;')],

  /* C'era un guasto in più qui: «il confine può stare anche al bordo del
     foglio», che toglieva la fascia centrale. Non veniva preso, e aveva
     ragione: con venticinque caratteri di prosa da tutt'e due i lati il
     confine finisce nella fascia centrale per geometria, e quella condizione
     non decideva mai niente. È stata tolta dal motore invece di tenerla con
     un guasto che non misura. */

  /* ── IL PIÈ DI PAGINA ───────────────────────────────────────────────────── */
  ['una riga a tutta pagina non chiude piu\' il blocco: il pie\' di pagina si sposta', PT,
    (s) => s.replace('      if (piena) { chiudiBlocco(); var l = unaRiga(r.pezzi); if (l) fuori.push(l); return; }',
      '      if (false) { chiudiBlocco(); var l = unaRiga(r.pezzi); if (l) fuori.push(l); return; }')],

  ['basta attraversare la gronda per spezzare il blocco, senza essere larghi', PT,
    (s) => s.replace('      var piena = foglio > 0 && (a2 - da) >= foglio * LARGHEZZA_PIENA\n        && r.pezzi.some(',
      '      var piena = foglio > 0\n        && r.pezzi.some(')],

  /* ── QUELLO CHE NON DEVE CAMBIARE ───────────────────────────────────────── */
  ['le righe di soli spazi tornano a diventare righe', PT,
    (s) => s.replace('      return righe.map(function (r) { return unaRiga(r.pezzi); }).filter(Boolean);',
      '      return righe.map(function (r) { return unaRiga(r.pezzi); });')],
]

let sfuggiti = 0
try {
  for (const [desc, file, muta] of GUASTI) {
    const buono = BUONI[file]
    const rotto = muta(buono)
    if (rotto === buono) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — il file non contiene piu' quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(file, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    writeFileSync(file, buono)
    if (/SyntaxError|Unexpected (token|identifier)/.test(uscita)) {
      console.log(`⚠️  GUASTO MUTO (sintassi rotta): ${desc}`)
      sfuggiti++
      continue
    }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
  }
} finally {
  for (const f of Object.keys(BUONI)) writeFileSync(f, BUONI[f])
}

const rimessi = Object.keys(BUONI).every((f) => readFileSync(f, 'utf8') === BUONI[f])
console.log(`\nfile rimessi a posto: ${rimessi ? 'si' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli li'` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
