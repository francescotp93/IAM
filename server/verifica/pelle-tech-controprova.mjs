/* Controprova della revisione grafica (pelle-tech + caricamento).

   I guasti qui dentro sono quelli che FANNO SPARIRE IL LAVORO SENZA DIRLO. Una
   revisione grafica non si rompe con un errore: si rompe in silenzio, e la
   pagina continua a funzionare con l'aspetto di prima. Il primo dell'elenco è
   il peggiore — il foglio spostato tre righe più in su, che disattiva tutto e
   non stampa niente da nessuna parte.

   Ogni guasto dichiara QUALE prova deve diventare rossa: quelle del motore
   girano in Node (un secondo), quelle della pelle aprono un browser (quindici).
   Far girare il browser anche per un guasto sul motore sarebbe stato comodo da
   scrivere e lento da usare, e una controprova lenta è una controprova che
   nessuno lancia.

       node server/verifica/pelle-tech-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const PELLE = join(RADICE, 'withus-tech.css')
const MOT = join(RADICE, 'tariffe', 'motore', 'caricamento.js')
const IAM = join(RADICE, 'iam', 'index.html')

const T_PELLE = join(QUI, 'pelle-tech.test.mjs')
const T_MOT = join(QUI, 'caricamento.test.mjs')

const BUONI = { [PELLE]: readFileSync(PELLE, 'utf8'), [MOT]: readFileSync(MOT, 'utf8'), [IAM]: readFileSync(IAM, 'utf8') }

const GUASTI = [
  /* ── i guasti silenziosi: la pelle c'è ma non fa niente ───────────────────── */
  ['IL FOGLIO SALE DI TRE RIGHE E LA PELLE SI SPEGNE SENZA DIRLO', IAM, T_PELLE,
    (s) => s.replace(/<link rel="stylesheet" href="\/nuovo-preventivo\/withus-tech\.css\?v=\d+">\n/, '')
      .replace('<link rel="stylesheet" href="withus-pictograms.css?v=20260804">',
        '<link rel="stylesheet" href="/nuovo-preventivo/withus-tech.css?v=20261007">\n<link rel="stylesheet" href="withus-pictograms.css?v=20260804">')],

  ['il contrassegno di versione sparisce: il browser tiene la pelle vecchia', IAM, T_PELLE,
    (s) => s.replace(/(withus-tech\.css)\?v=\d+/, '$1')],

  ['la pelle non raggiunge piu\' i token scritti dentro la pagina', PELLE, T_PELLE,
    (s) => s.replace('body, body.theme-light{\n  --bg:var(--t-150);', ':root{\n  --bg:var(--t-150);')],

  /* ── la pelle comincia a fare quello che aveva promesso di non fare ───────── */
  ['la pelle comincia a spostare le scatole', PELLE, T_PELLE,
    (s) => s.replace('.card, .panel .card, .d-card, .cnt-card, .modal, .w1-card{ border-radius:var(--r); }',
      '.card, .panel .card, .d-card, .cnt-card, .modal, .w1-card{ border-radius:var(--r); margin:18px; padding:24px; }')],

  ['la pelle comincia a scaricare un carattere dalla rete', PELLE, T_PELLE,
    (s) => s.replace(':root{\n  /* neutri freddi', '@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono");\n:root{\n  /* neutri freddi')],

  ['il monospaziato smette di finire su una famiglia di sistema', PELLE, T_PELLE,
    (s) => s.replace(',"Liberation Mono",monospace;', ';')],

  /* ── i valori che tornano indietro ───────────────────────────────────────── */
  ['la barra laterale torna al grigio di prima', PELLE, T_PELLE,
    (s) => s.replace('--w1-scuro:#0d131c;', '--w1-scuro:#1b2733;')],

  ['il ciano dei segnali diventa un altro colore', PELLE, T_PELLE,
    (s) => s.replace('--t-dati:#06b6d4;', '--t-dati:#2f6df6;')],

  ['gli angoli tornano tondi come un\'app di consumo', PELLE, T_PELLE,
    (s) => s.replace('--r:10px; --rs:var(--t-r);\n  --grn:#0f9d58;', '--r:16px; --rs:12px;\n  --grn:#0f9d58;')],

  ['i campi degli importi perdono il monospaziato', PELLE, T_PELLE,
    (s) => s.replace('  font-family:var(--t-mono); letter-spacing:-.01em;\n}', '  letter-spacing:-.01em;\n}')],

  /* ── le fasi di caricamento ──────────────────────────────────────────────── */
  ['senza animazioni la barra SPARISCE invece di fermarsi', PELLE, T_PELLE,
    (s) => s.replace('  .wl-barra::after{ width:100%; opacity:.5; }', '  .wl-barra::after{ opacity:0; }')],

  ['la spia dello stato smette di pulsare', PELLE, T_PELLE,
    (s) => s.replace('background:var(--t-dati); animation:wl-pulsa 1.5s ease-out infinite;', 'background:var(--t-dati);')],

  ['lo scheletro resta senza corpo', PELLE, T_PELLE,
    (s) => s.replace('  display:block; height:12px; width:100%; border-radius:var(--t-r-sm);', '  display:block; height:0; width:100%; border-radius:var(--t-r-sm);')],

  ['lo stato torna a essere una riga di testo qualunque', PELLE, T_PELLE,
    (s) => s.replace('  font-family:var(--t-mono); font-size:11px; letter-spacing:.07em;\n  text-transform:uppercase; color:var(--txt2); line-height:1.5;',
      '  font-size:12px; color:var(--txt2); line-height:1.5;')],

  ['le undici attese che c\'erano gia\' tornano alla rotella', PELLE, T_PELLE,
    (s) => s.replace(/\.cl-carico-g\{\n[\s\S]*?\n\}\n/, '')],

  /* ── l'avvio ─────────────────────────────────────────────────────────────── */
  ['l\'avvio torna a nascondere quello che sta facendo', PELLE, T_PELLE,
    (s) => s.replace(/#boot-screen \.boot-txt\{\n[\s\S]*?\n\}\n/, '')],

  ['il marchio torna a respirare al posto della barra', PELLE, T_PELLE,
    (s) => s.replace('.boot-logo{ animation:none !important; opacity:1 !important; transform:none !important; }', '')],

  ['la pelle smette di dichiarare quello che non ritona', PELLE, T_PELLE,
    (s) => s.replace('QUELLO CHE QUESTA PELLE NON RITONA — detto, non nascosto', 'Note finali.')],

  ['il limite resta dichiarato ma senza i numeri misurati', PELLE, T_PELLE,
    (s) => s.replace('262 valori\n   distinti in `iam/index.html`, 374 in `index.html`', 'parecchi valori\n   distinti nei due documenti')],

  /* ── il motore delle attese (prove in Node: un secondo) ──────────────────── */
  ['UN\'ATTESA MUTA TORNA AD ESSERE ACCETTATA: rinascono i «Caricamento…»', MOT, T_MOT,
    (s) => s.replace(/    if \(!frase\) \{\n[\s\S]*?\n    \}\n/, '    var frase2 = frase || \'Caricamento\';\n')],

  ['il testo di un\'attesa non viene piu\' sfuggito', MOT, T_MOT,
    (s) => s.replace(/      \.replace\(\/&\/g, '&amp;'\)[\s\S]*?\.replace\(\/"\/g, '&quot;'\);/, '      ;')],

  ['lo scheletro puo\' riempire la pagina', MOT, T_MOT,
    (s) => s.replace('var quante = Math.max(1, Math.min(RIGHE_MAX, parseInt(opz.righe, 10) || 3));',
      'var quante = Math.max(1, parseInt(opz.righe, 10) || 3);')],

  ['le righe dello scheletro diventano tutte uguali', MOT, T_MOT,
    (s) => s.replace("var LARGHEZZE = ['92%', '74%', '86%', '61%', '80%', '68%'];", "var LARGHEZZE = ['92%'];")],

  ['lo scheletro si fa leggere ad alta voce, elemento per elemento', MOT, T_MOT,
    (s) => s.replace("'<div class=\"wl-gruppo\" aria-hidden=\"true\">' + fuori + '</div>'", "'<div class=\"wl-gruppo\">' + fuori + '</div>'")],

  ['la barra comincia a dichiarare un avanzamento che non conosce', MOT, T_MOT,
    (s) => s.replace("role=\"progressbar\" aria-label=\"Caricamento in corso\"", "role=\"progressbar\" aria-valuenow=\"90\" aria-label=\"Caricamento in corso\"")],
]

let sfuggiti = 0
try {
  for (const [desc, file, test, muta] of GUASTI) {
    const buono = BUONI[file]
    const rotto = muta(buono)
    if (rotto === buono) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — il file non contiene piu' quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(file, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [test], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    writeFileSync(file, buono)
    if (/SyntaxError|non esegue il suo script/.test(uscita)) {
      console.log(`⚠️  GUASTO MUTO (sintassi rotta): ${desc}`)
      sfuggiti++
      continue
    }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 1)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '').slice(0, 150)}`))
    if (!rosso) sfuggiti++
  }
} finally {
  for (const f of Object.keys(BUONI)) writeFileSync(f, BUONI[f])
}

const rimessi = Object.keys(BUONI).every((f) => readFileSync(f, 'utf8') === BUONI[f])
console.log(`\nfile rimessi a posto: ${rimessi ? 'si' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli li'` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
