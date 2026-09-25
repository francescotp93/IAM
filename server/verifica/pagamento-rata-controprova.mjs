/* Controprova di pagamento-rata.test.mjs.
   Sabota il motore nei modi in cui potrebbe davvero rompersi e pretende che
   la suite diventi rossa. Una prova che resta verde col guasto dentro non è
   una prova: è una frase.

   Il motore viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/pagamento-rata-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const MOT = join(QUI, '..', '..', 'tariffe', 'motore', 'pagamento-rata.js')
const TEST = join(QUI, 'pagamento-rata.test.mjs')
const BUONO = readFileSync(MOT, 'utf8')

const GUASTI = [
  ['la parola della compagnia torna a valere come un incasso',
    (s) => s.replace("    return 'da_incassare';\n  }\n\n  /* Vero quando",
      "    if (p.dichiaratoPagato) return 'incassato';\n    return 'da_incassare';\n  }\n\n  /* Vero quando")],

  ['il flusso può smentire una correzione fatta a mano',
    (s) => s.replace('if (e.pagamento_a_mano) {', 'if (false) {')],

  ['il disaccordo col flusso non viene più riportato',
    (s) => s.replace('discorda: dalF !== attuale ? dalF : null,', 'discorda: null,')],

  ['una rata già in archivio non si aggiorna più (il buco di prima)',
    (s) => s.replace("    return { pagamento: dalF, stato: versoStato(dalF), fonte: 'flusso', cambia: true,\n      dichiaratoSenzaIncasso: avviso,\n      perche: prima",
      "    return { pagamento: prima || 'da_incassare', stato: versoStato(prima), fonte: 'flusso', cambia: false,\n      dichiaratoSenzaIncasso: avviso,\n      perche: prima")],

  ['un sospeso finisce in `stato` e il database lo rifiuta',
    (s) => s.replace("return pagamento === 'incassato' ? 'incassato' : 'aperto';", 'return pagamento;')],

  ['un solo sospeso non basta più: vince la maggioranza',
    (s) => s.replace("if (l.indexOf('sospeso') >= 0) return 'sospeso';\n    if (l.indexOf('incassato') >= 0) return 'pagato';",
      "if (l.indexOf('incassato') >= 0) return 'pagato';\n    if (l.indexOf('sospeso') >= 0) return 'sospeso';")],

  ['la polizza senza rate si dichiara pagata invece di tacere',
    (s) => s.replace("if (!l.length) return 'non_pagato';", "if (!l.length) return 'pagato';")],

  ['qualunque testo vale come data di incasso',
    (s) => s.replace("var m = /^(\\d{4}-\\d{2}-\\d{2})/.exec(String(v == null ? '' : v));\n    return m ? m[1] : null;",
      "return String(v == null ? '' : v) || null;")],

  ['il sospeso dichiarato copre un incasso vero',
    (s) => s.replace("    if (giorno(p.incassoContabile)) return 'incassato';\n    if (p.dichiaratoSospeso) return 'sospeso';",
      "    if (p.dichiaratoSospeso) return 'sospeso';\n    if (giorno(p.incassoContabile)) return 'incassato';")],

  ['«pagato senza incasso» smette di essere marcato',
    (s) => s.replace('return !!(p.dichiaratoPagato && !giorno(p.incassoContabile) && !p.dichiaratoSospeso);', 'return false;')],
]

let sfuggiti = 0
try {
  for (const [desc, muta] of GUASTI) {
    const rotto = muta(BUONO)
    if (rotto === BUONO) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — il motore non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(MOT, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = e.stdout || '' }
    const quali = (uscita.match(/❌ [^\n]+/g) || []).map((s) => s.slice(2).split('  —')[0].trim())
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    if (rosso) quali.slice(0, 2).forEach((q) => console.log(`        rossa: ${q}`))
    if (!rosso) sfuggiti++
  }
} finally {
  writeFileSync(MOT, BUONO)
}

const rimesso = readFileSync(MOT, 'utf8') === BUONO
console.log(`\nmotore rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
