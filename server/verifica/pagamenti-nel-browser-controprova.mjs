/* Controprova di pagamenti-nel-browser.test.mjs.

   I guasti qui dentro sono i modi in cui la schermata smette di difendere
   l'importo: lo manda senza leggerlo, lo legge e poi manda la stringa grezza,
   chiede conferma e non la rispetta, o torna a promettere una conferma di
   pagamento che non arriverà. Ognuno di questi è già stato il codice vero
   almeno una volta.

   Regola di casa: un guasto che non trova più il suo bersaglio non misura
   niente, e lo dice solo nella riga «SENTINELLA PERSA».

       node server/verifica/pagamenti-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const IAM = join(RADICE, 'iam', 'index.html')
const TEST = join(QUI, 'pagamenti-nel-browser.test.mjs')

const BUONI = { [IAM]: readFileSync(IAM, 'utf8') }

const GUASTI = [
  /* ── l'importo parte senza passare dal motore ─────────────────────────────── */
  ['L\'IMPORTO TORNA A PARTIRE COM\'E\' SCRITTO: il guasto del 06/10/2026', IAM,
    (s) => s.replace(/  if \(!window\.Importo\) \{[\s\S]*?\n  if \(!letto\.ok\) \{[^\n]*\n/,
      '  if (!importo) { dì(\'Metti un importo.\', \'var(--amb-txt,#a76008)\'); return; }\n'
      + '  const letto = { ok: true, cents: 0, scritto: importo, sopraSoglia: false };\n')],

  ['l\'importo si legge, e poi si manda comunque la stringa grezza', IAM,
    (s) => s.replace('      importo: letto.scritto,       /* per la funzione installata, in forma non interpretabile */',
      '      importo: importo,')],

  ['i centesimi non si mandano piu\': resta solo l\'importo in euro', IAM,
    (s) => s.replace('      importo_cents: letto.cents,   /* quello che conta: un intero */', '')],

  ['il motore non si carica piu\' nella pagina', IAM,
    (s) => s.replace(/<script src="\/nuovo-preventivo\/tariffe\/motore\/importo\.js\?v=\d+"><\/script>\n/, '')],

  ['il contrassegno di versione del motore sparisce', IAM,
    (s) => s.replace(/(tariffe\/motore\/importo\.js)\?v=\d+/, '$1')],

  /* ── la conferma ──────────────────────────────────────────────────────────── */
  ['la conferma non si chiede piu\'', IAM,
    (s) => s.replace(/  if \(!confirm\(Importo\.frase\([^\n]*\n/, '')],

  ['la conferma si chiede e non si rispetta', IAM,
    (s) => s.replace('  if (!confirm(Importo.frase({ cents: letto.cents, cliente: cliente, causale: causale }))) {',
      '  confirm(Importo.frase({ cents: letto.cents, cliente: cliente, causale: causale }));\n  if (false) {')],

  ['la seconda domanda, sopra diecimila euro, non si fa piu\'', IAM,
    (s) => s.replace(/  if \(letto\.sopraSoglia && !confirm\(Importo\.fraseSoglia[^\n]*\n/, '')],

  ['la seconda domanda si fa e non si rispetta', IAM,
    (s) => s.replace('  if (letto.sopraSoglia && !confirm(Importo.fraseSoglia(letto.cents))) { dì(\'Non ho generato niente.\'); return; }',
      '  if (letto.sopraSoglia) confirm(Importo.fraseSoglia(letto.cents));')],

  /* ── quello che la schermata dice ─────────────────────────────────────────── */
  ['torna la frase falsa: «quando paga, qui il pagamento passa a pagato»', IAM,
    (s) => s.replace('Il cliente paga con carta.</p>',
      'Il cliente paga con carta; quando paga, qui il pagamento passa a «pagato».</p>')],

  ['sparisce l\'avviso che lo stato non si aggiorna da solo', IAM,
    (s) => s.replace(/      <div id="pg-avviso"[\s\S]*?<\/div>\n/, '')],

  ['un link di prova non si dichiara piu\'', IAM,
    (s) => s.replace(/      const diProva = \/\\\/test_\/\.test\(String\(r\.url \|\| ''\)\);/,
      '      const diProva = false;')],

  ['l\'esito non ripete piu\' l\'importo che e\' stato chiesto', IAM,
    (s) => s.replace('        + Importo.euro(letto.cents) + \' — <a href="\'', '        + \'Link pronto\' + \' — <a href="\'')],

  /* ── le due formattazioni che si separano ─────────────────────────────────── */
  ['l\'elenco scrive l\'importo in un modo e la conferma in un altro', IAM,
    (s) => s.replace('  return window.Importo ? Importo.euro(cents)',
      '  return false ? Importo.euro(cents)')],
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
    /* Un guasto che rompe la sintassi della pagina non misura niente: lo
       script non parte, e TUTTE le prove diventano rosse insieme. */
    if (/non esegue il suo script|SyntaxError/.test(uscita)) {
      console.log(`⚠️  GUASTO MUTO (pagina rotta): ${desc}`)
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
