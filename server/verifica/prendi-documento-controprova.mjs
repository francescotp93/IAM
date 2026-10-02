/* Controprova di prendi-documento.test.mjs.

   Qui i guasti non sono difetti di lettura: sono i modi in cui una funzione
   che scarica da internet diventa un PROXY APERTO sull'infrastruttura
   dell'agenzia. Il peggiore dell'elenco è il secondo — l'elenco dei domini
   controllato con «finisce con» — perché passa tutte le prove che uno
   scriverebbe d'istinto e lascia entrare «www.sara.it.male.com».

       node server/verifica/prendi-documento-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const FN = join(RADICE, 'supabase', 'functions', 'prendi-documento', 'index.ts')
const CAT = join(RADICE, 'tariffe', 'dati', 'note-informative.json')
const TEST = join(QUI, 'prendi-documento.test.mjs')

const BUONI = { [FN]: readFileSync(FN, 'utf8'), [CAT]: readFileSync(CAT, 'utf8') }

const GUASTI = [
  ['si scarica da qualunque dominio: la funzione diventa un proxy aperto', FN,
    (s) => s.replace('  return DOMINI.includes(u.hostname)', '  return true')],

  ['IL DOMINIO SI CONTROLLA CON «FINISCE CON»: passa www.sara.it.male.com', FN,
    (s) => s.replace('  return DOMINI.includes(u.hostname)',
      '  return DOMINI.some((d) => u.hostname.endsWith(d))')],

  ['il dominio si controlla con «contiene»: passa qualunque cosa lo nomini', FN,
    (s) => s.replace('  return DOMINI.includes(u.hostname)',
      '  return DOMINI.some((d) => u.hostname.indexOf(d) >= 0)')],

  ['si accetta anche http in chiaro', FN,
    (s) => s.replace("  if (u.protocol !== 'https:') return false", '')],

  ['i reindirizzamenti li segue la libreria: un 302 esce dall\'elenco', FN,
    (s) => s.replace("redirect: 'manual'", "redirect: 'follow'")],

  ['il dominio si controlla solo al primo giro, non a ogni salto', FN,
    (s) => s.replace("    if (!dentroElenco(u)) throw new Error('fuori-elenco:' + u.hostname)",
      "    if (n === 0 && !dentroElenco(u)) throw new Error('fuori-elenco:' + u.hostname)")],

  ['i salti non hanno piu\' un tetto', FN,
    (s) => s.replace("  throw new Error('troppi reindirizzamenti')", '  throw new Error("x")')],

  ['non si guarda piu\' se e\' davvero un PDF', FN,
    (s) => s.replace("    if (firma !== '%PDF-') {", '    if (false) {')],

  ['non c\'e\' piu\' un tetto al peso del file', FN,
    (s) => s.replace('const TETTO = 25 * 1024 * 1024', 'const TETT0 = 25 * 1024 * 1024\nconst TETTO = Infinity')],

  ['un indirizzo scaduto passa per un errore qualunque', FN,
    (s) => s.replace('        ok: false, scaduto: r.status === 404 || r.status === 410, stato: r.status,',
      '        ok: false, stato: r.status,')],

  ['e non si spiega piu\' che un indirizzo scade a ogni edizione', FN,
    (s) => s.replace("': l\\'indirizzo non c\\'è più. Succede a ogni edizione nuova: va ritrovato.'", "': errore.'")],

  ['la funzione comincia a scrivere in archivio da sola', FN,
    (s) => s.replace('    return Response.json({\n      ok: true, host, percorso, impronta, byte: byte.length,',
      "    await sb.from('iam_conf_documenti').insert({ impronta });\n"
      + '    return Response.json({\n      ok: true, host, percorso, impronta, byte: byte.length,')],

  ['la funzione comincia a decidere gli stati delle garanzie', FN,
    (s) => s.replace("      reindirizzato: finale !== url,", "      reindirizzato: finale !== url, stato_garanzie: 'assente',")],

  /* ── il catalogo ────────────────────────────────────────────────────────── */
  ['il catalogo non dichiara piu\' che i suoi indirizzi non sono verificati', CAT,
    (s) => s.replace('NESSUNO DI QUESTI URL È STATO VERIFICATO.', 'Gli indirizzi sono quelli pubblicati.')],

  ['il catalogo dichiara già preso un documento che nessuno ha aperto', CAT,
    (s) => s.replace('"url": "https://dallbogg.it/wp-content/uploads/2025/07/db-set-Info-auto-04-25.pdf", "stato": "trovato"',
      '"url": "https://dallbogg.it/wp-content/uploads/2025/07/db-set-Info-auto-04-25.pdf", "stato": "preso"')],

  ['il catalogo nomina un dominio che la funzione non accetta', CAT,
    (s) => s.replace('    "www.italiana.it"', '    "www.italiana.it",\n    "www.unipolsai.it"')],

  ['un indirizzo del catalogo passa a http in chiaro', CAT,
    (s) => s.replace('"url": "https://www.sara.it/sites/default/files/2021-05/Set_Informativo_Auto_Contratto_Base.pdf"',
      '"url": "http://www.sara.it/sites/default/files/2021-05/Set_Informativo_Auto_Contratto_Base.pdf"')],
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
