/* Controprova di preventivo-rui-nel-browser.test.mjs.

   Rimette, uno alla volta, i guasti che fanno uscire «da confermare» su un
   collaboratore che il RUI ce l'ha — a cominciare da quello segnalato da
   Francesco il 02/10/2026 — e pretende che la suite diventi rossa.

   Sono tutti guasti che in Node non si vedono: la cache vive nel browser, e un
   dato giusto in archivio letto da una copia vecchia non dà nessun errore.
   Dà solo un documento che chiede di confermare una cosa già confermata.

   Ogni guasto resta JavaScript VALIDO.

   La pagina viene sempre rimessa com'era, anche se qualcosa esplode.

       node server/verifica/preventivo-rui-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const PAGINA = join(QUI, '..', '..', 'index.html')
const TEST = join(QUI, 'preventivo-rui-nel-browser.test.mjs')
const BUONA = readFileSync(PAGINA, 'utf8')

const GUASTI = [
  ['il guasto segnalato: non si rilegge mai, la copia vecchia resta',
    (s) => s.replace(
      "  if (intermediario && !String(intermediario.rui_numero || '').trim()\n      && Date.now() - PP_RILETTO_IL > PP_RILEGGI_OGNI) {",
      '  if (false) {')],

  ['si rilegge ma senza forzare: torna la stessa copia vecchia',
    (s) => s.replace('    await caricaIntermediari(true);\n    intermediario = (INTERM_CACHE || [])',
      '    await caricaIntermediari();\n    intermediario = (INTERM_CACHE || [])')],

  ['si rilegge e poi si butta via quello che si è letto',
    (s) => s.replace(
      "    intermediario = (INTERM_CACHE || []).find(c => c.id === r.intermediario_id) || intermediario;",
      '    /* letto e non usato */')],

  ['si rilegge a ogni foglio: la pausa non c\'è più',
    (s) => s.replace('      && Date.now() - PP_RILETTO_IL > PP_RILEGGI_OGNI) {', '      ) {')],

  ['la pausa non si aggiorna: si rilegge in continuazione',
    (s) => s.replace('    PP_RILETTO_IL = Date.now();\n', '')],

  ['si rilegge anche quando il RUI in memoria c\'è già',
    (s) => s.replace("  if (intermediario && !String(intermediario.rui_numero || '').trim()",
      '  if (intermediario')],

  ['la rilettura si inventa un\'iscrizione quando in archivio non c\'è',
    (s) => s.replace("  const n = String(numero == null ? '' : numero).trim();\n  if (!n) { if (etichetta && mancanti) mancanti.push(etichetta); return PP_DA_CONFERMARE; }",
      "  const n = String(numero == null ? '' : numero).trim();\n  if (!n) { return 'in corso di iscrizione'; }")],

  ['il RUI mancante non finisce più fra le cose da confermare',
    (s) => s.replace('  if (!n) { if (etichetta && mancanti) mancanti.push(etichetta); return PP_DA_CONFERMARE; }',
      '  if (!n) { return PP_DA_CONFERMARE; }')],

  ['il nome del collaboratore non arriva più sul documento',
    (s) => s.replace("        nome: dato(nomeIm, 'intermediario di riferimento'),", "        nome: '',")],

  ['chi non ha una scheda collaboratore torna a essere bloccato',
    /* Il guasto che era già stato corretto una volta: l'agente generale, che
       una scheda collaboratore non ce l'ha, non poteva mandare nessun
       preventivo. Qui si manda il documento nel ramo «scritto a mano», che
       pretende un numero RUI che in quel caso non esiste.

       La prima stesura di questo guasto toccava un ramo che la prova non
       attraversava mai: era un sabotaggio che non sabotava niente, e passava
       per «prova debole» quando il debole ero io. */
    (s) => s.replace('  const aMano = !im && !!(forse(r.intermediario_nome) || forse(r.intermediario_rui));',
      '  const aMano = !im;')],

  ['il RUI dell\'agenzia non fa più da riserva quando non c\'è un collaboratore',
    (s) => s.replace('        nome: azienda.ragioneSociale,\n        rui: azienda.rui,',
      '        nome: azienda.ragioneSociale,\n        rui: PP_DA_CONFERMARE,')],
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
    writeFileSync(PAGINA, BUONA)
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
