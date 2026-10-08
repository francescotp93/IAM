/* Controprova della regola «gli appunti di lavoro non arrivano al cliente».

   Il 08/10/2026 Francesco ha guardato il PDF dell'analisi previdenziale dalla
   parte di chi lo riceve e ha chiesto di togliere il riquadro ambra in fondo —
   quello che diceva «Segnaposto — da leggere sull'ISC della Nota informativa
   HDI», «non letta sull'originale», «da riscontrare su Normattiva».

   Togliere un blocco è facile. Difficile è che non ne ricompaia un altro: i
   promemoria si scrivono dentro ai testi mentre si lavora, e finiscono sul
   foglio senza che nessuno lo decida. È già successo — cercando quelle frasi
   ne è saltata fuori una seconda, in fondo al blocco sul riscatto, che diceva
   «da confermare con HDI prima di dirlo a un cliente» SUL foglio del cliente.

   Per questo i guasti qui sotto non rimettono solo il riquadro: rimettono le
   frasi, una per volta, nei posti dove è naturale riscriverle.

       node server/verifica/pensione-foglio-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const MOT = join(RADICE, 'tariffe', 'motore', 'pensione.js')
const TEST = join(QUI, 'pensione-motore.test.mjs')

const BUONI = { [MOT]: readFileSync(MOT, 'utf8') }

const GUASTI = [
  /* ── il guasto vero: quello che Francesco ha visto ────────────────────────── */
  ['IL RIQUADRO «VALORI ANCORA DA CONFERMARE» TORNA SUL PDF', MOT,
    (s) => s.replace("  var nomeFile = 'Analisi-previdenziale-'",
      "  if (marchi.length) blocchi.push({ tipo: 'testo', tono: 'ambra', titolo: 'VALORI ANCORA DA CONFERMARE', punti: true,\n"
      + "    paragrafi: marchi.map(function (m) { return m.gruppo + ' · ' + m.etichetta + ' — ' + m.fonte; }), size: 7.2, leading: 3.6 });\n\n"
      + "  var nomeFile = 'Analisi-previdenziale-'")],

  ['l\'elenco torna in fondo al foglio HTML di scorta', MOT,
    (s) => s.replace("bloccoTfr + bloccoDatore + bloccoRiscatto +",
      "bloccoTfr + bloccoDatore + bloccoRiscatto +\n"
      + "(marchi.length ? '<div><b>Valori ancora da confermare</b><ul>' + marchi.map(function (m) { return '<li>' + esc(m.gruppo) + ' · ' + esc(m.etichetta) + ' — ' + esc(m.fonte) + '</li>'; }).join('') + '</ul></div>' : '') +")],

  /* ── il secondo appunto, quello che nessuno aveva notato ──────────────────── */
  ['torna «da confermare con HDI prima di dirlo a un cliente» sul foglio HTML', MOT,
    (s) => s.replace("    '<p class=\"nota\">' + esc(q.fonte) + '</p>';",
      "    '<p class=\"nota\">' + esc(q.fonte) + ' — ' + esc(q.daVerificare) + '</p>';")],

  ['torna «da confermare con HDI prima di dirlo a un cliente» sul PDF', MOT,
    (s) => s.replace("  blocchi.push({ tipo: 'testo', paragrafi: [q.fonte], size: 7 });",
      "  blocchi.push({ tipo: 'testo', paragrafi: [q.fonte + ' — ' + q.daVerificare], size: 7 });")],

  ['un appunto nuovo si infila nelle avvertenze, dove nessuno lo cerca', MOT,
    (s) => s.replace("function disclaimer(esito) {",
      "function disclaimer(esito) {\n  if (true) return 'Proiezione illustrativa: NON è una promessa di rendimento e non prevede l\\'assegno INPS. Coefficiente di rendita provvisorio, da riscontrare sulla Nota informativa HDI prima di consegnare.';")],

  /* ── quello che al cliente deve RESTARE ───────────────────────────────────── */
  ['la marca STIMA sparisce dal foglio di scorta', MOT,
    (s) => s.replace("var marcaStima = marchi.length ? '<span class=\"stima\">STIMA</span>' : '';",
      "var marcaStima = '';")],

  ['la filigrana STIMA sparisce dal PDF', MOT,
    (s) => s.replace("      filigrana: marchi.length ? 'STIMA' : null,", "      filigrana: null,")],

  ['sparisce anche la citazione di legge, non solo l\'appunto', MOT,
    (s) => s.replace("  blocchi.push({ tipo: 'testo', paragrafi: [q.fonte], size: 7 });", "")],

  /* ── quello che a CHI LAVORA deve restare ─────────────────────────────────── */
  ['l\'archivio smette di conservare i valori provvisori di quel giorno', MOT,
    (s) => s.replace("        daConfermare: daConfermare(),\n      },\n      versione_motore: VERSIONE,",
      "      },\n      versione_motore: VERSIONE,")],

  ['la marcatura si spegne del tutto: non c\'è piu\' niente da tenere fuori', MOT,
    (s) => s.replace("function daConfermare() {\n  var out = [];", "function daConfermare() {\n  if (true) return [];\n  var out = [];")],
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
    ;(uscita.match(/ {2}❌[^\n]+(\n {6}[^\n]+)?/g) || []).slice(0, 1)
      .forEach((s) => console.log(`        rossa: ${s.replace(/\s+/g, ' ').trim().slice(0, 160)}`))
    if (!rosso) sfuggiti++
  }
} finally {
  for (const f of Object.keys(BUONI)) writeFileSync(f, BUONI[f])
}

const rimessi = Object.keys(BUONI).every((f) => readFileSync(f, 'utf8') === BUONI[f])
console.log(`\nfile rimessi a posto: ${rimessi ? 'si' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli li'` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
