/* Controprova di foglio-cassa-giorno.test.mjs.

   Sabota una alla volta le cose che le frecce del giorno possono sbagliare —
   nel motore e nella schermata — e pretende che la suite diventi rossa. Una
   prova che resta verde col guasto dentro non è una prova: è una frase.

   Ogni guasto resta JavaScript (o CSS) VALIDO. Un guasto che non compila
   spegne lo script intero e la suite diventa rossa senza che nessuna prova
   abbia guardato niente: misurerebbe zero.

   Un guasto gira con `TZ=Europe/Rome` apposta: il conto in ora locale sbaglia
   SOLO nei due giorni del cambio d'ora, e con l'orologio su UTC non
   sbaglierebbe mai — la prova resterebbe verde e non vorrebbe dire niente.

   I due file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/foglio-cassa-giorno-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const MOTORE = join(RADICE, 'tariffe', 'motore', 'foglio-cassa.js')
const PAGINA = join(RADICE, 'index.html')
const TEST = join(QUI, 'foglio-cassa-giorno.test.mjs')

const BUONI = { [MOTORE]: readFileSync(MOTORE, 'utf8'), [PAGINA]: readFileSync(PAGINA, 'utf8') }

/* [descrizione, file, mutazione, ambiente in più] */
const GUASTI = [
  ['il motore non esporta più la funzione che sposta', MOTORE,
    (s) => s.replace('    sposta: sposta };', '    sposta: null };')],

  ['si sposta solo il «dal»: la finestra si allunga a ogni clic', MOTORE,
    (s) => s.replace('return { dal: d ? piuGiorni(d, n) : null, al: a ? piuGiorni(a, n) : null };',
      'return { dal: d ? piuGiorni(d, n) : null, al: a };')],

  ['si sposta solo l\'«al»', MOTORE,
    (s) => s.replace('return { dal: d ? piuGiorni(d, n) : null, al: a ? piuGiorni(a, n) : null };',
      'return { dal: d, al: a ? piuGiorni(a, n) : null };')],

  ['la freccia indietro va avanti (il verso si perde per strada)', MOTORE,
    (s) => s.replace('var n = Math.trunc(Number(giorni) || 0);', 'var n = Math.abs(Math.trunc(Number(giorni) || 0));')],

  ['i campi vuoti si riempiono d\'ufficio invece di lasciar stare', MOTORE,
    (s) => s.replace('    if (!d && !a) return null;', '    if (!d && !a) { d = \'2026-01-01\'; a = \'2026-01-01\'; }')],

  ['una data sola trascina con sé anche quella vuota', MOTORE,
    (s) => s.replace('return { dal: d ? piuGiorni(d, n) : null, al: a ? piuGiorni(a, n) : null };',
      'return { dal: piuGiorni(d || a, n), al: piuGiorni(a || d, n) };')],

  ['il conto dei giorni torna in ora locale: il cambio d\'ora ferma la freccia', MOTORE,
    (s) => s.replace(
      '    var t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86400000;\n    return new Date(t).toISOString().slice(0, 10);',
      '    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));\n' +
      '    d = new Date(d.getTime() + n * 86400000);\n' +
      '    var due = function (v) { return (v < 10 ? \'0\' : \'\') + v; };\n' +
      '    return d.getFullYear() + \'-\' + due(d.getMonth() + 1) + \'-\' + due(d.getDate());'),
    { TZ: 'Europe/Rome' }],

  ['di frecce ne resta una sola', PAGINA,
    (s) => s.replace('            <button type="button" class="fc-gg-b" onclick="fcSposta(1)" title="Un giorno avanti" aria-label="Un giorno avanti"><i class="ti ti-chevron-right"></i></button>\n', '')],

  ['tutt\'e due le frecce vanno avanti', PAGINA,
    (s) => s.replace('onclick="fcSposta(-1)" title="Un giorno indietro"', 'onclick="fcSposta(1)" title="Un giorno indietro"')],

  ['le frecce non dicono più che cosa fanno', PAGINA,
    (s) => s.replace('title="Un giorno indietro" aria-label="Un giorno indietro"', 'title="Indietro" aria-label="Indietro"')],

  ['la regola di stile è scritta con un selettore che non prende', PAGINA,
    /* CSS valido, e non veste niente: due bottoni della misura che decide il
       browser in mezzo a campi alti trenta pixel. In Node non si vede. */
    (s) => s.replace('.fc-gg-b{width:32px;height:30px;', '.fc-gg .fc-gg-b-x{width:32px;height:30px;')],

  ['i bottoni perdono il puntatore: non sembrano più bottoni', PAGINA,
    (s) => s.replace('font-family:inherit;font-size:15px;cursor:pointer;padding:0;line-height:1}',
      'font-family:inherit;font-size:15px;cursor:default;padding:0;line-height:1}')],

  ['la freccia cambia le date e non rifà la ricerca', PAGINA,
    (s) => s.replace('  if (d) d.value = n.dal || \'\';\n  if (a) a.value = n.al || \'\';\n  fcRender();\n}',
      '  if (d) d.value = n.dal || \'\';\n  if (a) a.value = n.al || \'\';\n}')],

  ['la freccia scrive solo il «dal» nei campi', PAGINA,
    (s) => s.replace('  if (a) a.value = n.al || \'\';\n  fcRender();\n}', '  fcRender();\n}')],

  ['la freccia cerca anche quando non è cambiato niente', PAGINA,
    (s) => s.replace('  if (!n) return;\n', '  if (!n) { fcRender(); return; }\n')],

  ['il contrassegno del motore torna indietro di un giorno', PAGINA,
    (s) => s.replace('foglio-cassa.js?v=20260930', 'foglio-cassa.js?v=20260929')],
]

let sfuggiti = 0
try {
  for (const [desc, file, muta, extra] of GUASTI) {
    const buono = BUONI[file]
    const rotta = muta(buono)
    if (rotta === buono) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — il file non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(file, rotta)
    let rosso = false, uscita = ''
    const env = { ...process.env, ...(extra || {}) }
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8', env }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    writeFileSync(file, buono)
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}${extra ? ' [' + Object.entries(extra).map(([k, v]) => k + '=' + v).join(' ') + ']' : ''}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
  }
} finally {
  for (const f of Object.keys(BUONI)) writeFileSync(f, BUONI[f])
}

const rimessi = Object.keys(BUONI).every((f) => readFileSync(f, 'utf8') === BUONI[f])
console.log(`\nfile rimessi a posto: ${rimessi ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
