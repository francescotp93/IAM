/* Controprova di importo.test.mjs.

   Qui i guasti non sono sviste di lettura: sono i modi in cui una richiesta di
   pagamento parte a un cliente con la cifra sbagliata. Il primo dell'elenco è
   quello vero, quello misurato il 06/10/2026 sul lato server installato — il
   punto letto come separatore delle migliaia — e deve restare il primo: è la
   prova che queste prove difendono il guasto da cui sono nate.

   Una regola di casa che vale soprattutto qui: un guasto che non trova più il
   suo bersaglio non misura niente, e lo dice solo nella riga «SENTINELLA
   PERSA». Un'altra: un guasto che non fa diventare rossa nessuna prova non
   vuol dire che il codice sia solido — vuol dire che le prove non guardano da
   quella parte. (È già successo: la prova «i centesimi si contano con gli
   interi» era VACUA, perché su due decimali la virgola mobile arrotondata dà
   lo stesso risultato. È stata sostituita dal giro andata-ritorno, che invece
   si rompe.)

       node server/verifica/importo-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const MOT = join(RADICE, 'tariffe', 'motore', 'importo.js')
const TEST = join(QUI, 'importo.test.mjs')

const BUONI = { [MOT]: readFileSync(MOT, 'utf8') }

const GUASTI = [
  /* ── il guasto vero, quello del 06/10/2026 ────────────────────────────────── */
  ['IL PUNTO TORNA A VALERE MIGLIAIA: «170.00» diventa 17.000,00 €', MOT,
    (s) => s.replace('    var due = dueLetture(s);',
      '    if (/^\\d+\\.\\d{1,3}$/.test(s)) return finisci(aCentesimi(s.replace(/\\./g, \'\'), \'\'));\n'
      + '    var due = dueLetture(s);')],

  ['il punto si legge come decimale, in silenzio invece di dirlo', MOT,
    (s) => s.replace('    var due = dueLetture(s);',
      '    var amb = s.match(/^(\\d+)\\.(\\d{1,2})$/);\n'
      + '    if (amb) return finisci(aCentesimi(amb[1], amb[2]));\n'
      + '    var due = dueLetture(s);')],

  ['un gruppo solo di punti passa per migliaia: «1.500» diventa 1.500,00 €', MOT,
    (s) => s.replace('/^\\d{1,3}(?:\\.\\d{3}){2,}$/', '/^\\d{1,3}(?:\\.\\d{3})+$/')],

  /* ── il rifiuto che non insegna niente ────────────────────────────────────── */
  ['il rifiuto diventa generico: non fa piu\' vedere le due letture', MOT,
    (s) => s.replace(/    var due = dueLetture\(s\);\n    if \(due\) \{[\s\S]*?\n    \}\n/,
      '    if (dueLetture(s)) return no(\'Importo non valido.\');\n')],

  /* ── le scritture rotte che tornano a passare ─────────────────────────────── */
  ['tre decimali si arrotondano invece di rifiutarli', MOT,
    (s) => s.replace(/    if \(\/,\\d\{3,\}\$\/\.test\(s\)\) \{\n[\s\S]*?\n    \}\n/,
      '    if (/,\\d{3,}$/.test(s)) return finisci(aCentesimi(s.split(\',\')[0], s.split(\',\')[1]));\n')],

  ['due virgole si aggiustano da sole invece di fermare tutto', MOT,
    (s) => s.replace(/    if \(\(s\.match\(\/,\/g\) \|\| \[\]\)\.length > 1\) \{\n[\s\S]*?\n    \}\n/,
      '    s = s.replace(/,(?=.*,)/g, \'\');\n')],

  ['lo zero passa: parte un link di pagamento da 0,00 €', MOT,
    (s) => s.replace('if (!isFinite(cents) || cents <= 0)', 'if (!isFinite(cents) || cents < 0)')],

  ['gli spazi indivisibili non si togliono piu\' (copia-incolla da un foglio)', MOT,
    (s) => s.replace('.replace(/[\\s\\u00a0\\u202f\\u2007]/g, \'\')', '.replace(/[ ]/g, \'\')')],

  /* ── il tetto ─────────────────────────────────────────────────────────────── */
  ['il tetto non si applica piu\'', MOT,
    (s) => s.replace(/    if \(cents > TETTO_CENTS\) return no\([^\n]*\n/, '')],

  ['il tetto dichiarato e\' piu\' alto di quello che si applica', MOT,
    (s) => s.replace('var TETTO_CENTS = 999999999;', 'var TETTO_CENTS = 99999999999;')],

  /* ── la forma che va al server ────────────────────────────────────────────── */
  ['la forma canonica torna a portare i punti delle migliaia', MOT,
    (s) => s.replace('    return Math.floor(cents / 100) + \',\' + pad2(cents % 100);',
      '    return euro(cents).replace(\' €\', \'\');')],

  ['i centesimi perdono lo zero davanti: 0,07 diventa 0,7', MOT,
    (s) => s.replace('    return Math.floor(cents / 100) + \',\' + pad2(cents % 100);',
      '    return Math.floor(cents / 100) + \',\' + String(cents % 100);')],

  /* ── la conferma ──────────────────────────────────────────────────────────── */
  ['la conferma non dice piu\' l\'importo in euro', MOT,
    (s) => s.replace('return \'Stai per chiedere \' + euro(dati.cents)',
      'return \'Stai per chiedere questo importo\' + \'\'')],

  ['la conferma non dice piu\' a chi va il link', MOT,
    (s) => s.replace('+ (chi ? \' a \' + chi : \'\')', '+ \'\'')],

  ['la seconda domanda diventa una copia della prima', MOT,
    (s) => s.replace(/  function fraseSoglia\(cents\) \{\n[\s\S]*?\n  \}\n/,
      '  function fraseSoglia(cents) { return frase({ cents: cents }); }\n')],

  ['la soglia si alza e l\'allarme non scatta piu\' sul «cento volte tanto»', MOT,
    (s) => s.replace('var SOGLIA_CENTS = 1000000;', 'var SOGLIA_CENTS = 100000000;')],

  ['un importo rifiutato si porta dietro i centesimi comunque', MOT,
    (s) => s.replace('function no(motivo) { return { ok: false, motivo: motivo }; }',
      'function no(motivo) { return { ok: false, motivo: motivo, cents: 0 }; }')],
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
    if (/SyntaxError|Unexpected token/.test(uscita)) {
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
