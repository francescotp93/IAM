/* Controprova di appunti-nel-browser.test.mjs.
   Sabota il DISEGNO della schermata Appunti incassi — non il motore, che ha la
   sua controprova — e pretende che la suite nel browser diventi rossa.

   Perché serve una controprova a parte: il motore può restare giustissimo e la
   schermata mostrare lo stato sbagliato, o non mostrarlo affatto. Il conto in
   cima direbbe «1 scostamento» e la riga sotto sarebbe verde: nessuna prova in
   Node se ne accorgerebbe, perché in Node il disegno non esiste.

   Ogni guasto qui resta JavaScript VALIDO. Un guasto che non compila spegne
   tutto lo script e la suite diventa rossa senza che nessuna prova abbia
   guardato niente: sembra presa e non misura niente.

   La pagina viene sempre rimessa com'era, anche se qualcosa esplode.

       node server/verifica/appunti-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const PAGINA = join(QUI, '..', '..', 'iam', 'index.html')
const TEST = join(QUI, 'appunti-nel-browser.test.mjs')
const BUONA = readFileSync(PAGINA, 'utf8')

const GUASTI = [
  ['il motore non viene più caricato dalla pagina',
    (s) => s.replace('/nuovo-preventivo/tariffe/motore/contabilita-giornaliera.js?v=20260928',
      '/nuovo-preventivo/tariffe/motore/contabilita-giornaliera-che-non-esiste.js')],

  ['lo stato non si scrive più sulla riga: quattro righe uguali',
    (s) => s.replace("+ '<div class=\"app-stato\">' + esc(s.etichetta) + '</div>'",
      "+ '<div class=\"app-stato\"></div>'")],

  ['lo scostamento non mostra più i dieci euro di differenza',
    (s) => s.replace("+ (r.scostamento ? '<div class=\"app-sco\">' + (r.scostamento > 0 ? '+' : '') + eur(r.scostamento) + '</div>' : '')",
      "+ ''")],

  ['la riga non dice più perché sta in quello stato',
    (s) => s.replace("+ (r.perche ? '<div class=\"app-perche\">' + esc(r.perche) + '</div>' : '')",
      "+ ''")],

  ['sotto il nome spariscono compagnia e numero di polizza',
    (s) => s.replace("+ '<div class=\"cl-sub\">' + esc(d.compagnia || '—')", "+ '<div class=\"cl-sub\">' + esc('')")],

  ['una differenza di 275 euro resta un numero come gli altri',
    (s) => s.replace("+ box('Differenza', eur(a.differenza), a.differenza ? 'app-q-no' : 'app-q-ok')",
      "+ box('Differenza', eur(a.differenza), 'app-q-ok')")],

  ['una giornata con tre righe storte si dichiara chiusa',
    (s) => s.replace('const chiuso = a.tutteOk;', 'const chiuso = true;')],

  ['il nostro totale e quello della compagnia si scambiano di posto',
    (s) => s.replace("+ box('Nostro totale', eur(a.totaleNostro))\n    + box('Foglio cassa', eur(a.totaleFoglio))",
      "+ box('Nostro totale', eur(a.totaleFoglio))\n    + box('Foglio cassa', eur(a.totaleNostro))")],

  ['la giornata presa per buona dalla compagnia non viene più spiegata',
    (s) => s.replace('const tuttoDalFlusso = quanteNostre === 0 && quanteLoro > 0;',
      'const tuttoDalFlusso = false;')],

  ['il conto delle righe da guardare non compare nel verdetto',
    (s) => s.replace(": '<div class=\"cnt-err\"><i class=\"ti ti-alert-triangle\"></i> <b>' + (a.daSanare + a.appunti)",
      ": '<div class=\"cnt-err\"><i class=\"ti ti-alert-triangle\"></i> <b>' + ('')")],

  ['una giornata vuota non dice più che è vuota',
    (s) => s.replace("+ ' non risulta nessun incasso, né nostro né della compagnia.</div>';",
      "+ '.</div>';")],

  ['la giornata vuota chiama una funzione che in IAM non esiste',
    /* È il difetto vero trovato scrivendo la schermata: `cntData` sta in QUOTO,
       non in IAM. Il disegno moriva proprio sul giorno vuoto. */
    (s) => s.replace("esc(new Date(g + 'T12:00:00').toLocaleDateString('it-IT'))", 'esc(cntData(g))')],

  ['entrando nella sottopagina nessuno apre più la schermata',
    (s) => s.replace("if (sub==='appunti') appApri();", "if (sub==='appunti') { /* niente */ }")],
]

let sfuggiti = 0
try {
  for (const [desc, muta] of GUASTI) {
    const rotta = muta(BUONA)
    if (rotta === BUONA) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — la pagina non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(PAGINA, rotta)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
  }
} finally {
  writeFileSync(PAGINA, BUONA)
}

const rimessa = readFileSync(PAGINA, 'utf8') === BUONA
console.log(`\npagina rimessa a posto: ${rimessa ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessa ? 1 : 0)
