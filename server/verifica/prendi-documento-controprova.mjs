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
    (s) => s.replace('const TETTO = 15 * 1024 * 1024', 'const TETT0 = 15 * 1024 * 1024\nconst TETTO = Infinity')],

  ['il tetto si controlla solo sull\'intestazione, che puo\' mentire', FN,
    (s) => s.replace('    if (byte.length > TETTO) {', '    if (false) {')],

  ['un indirizzo scaduto passa per un errore qualunque', FN,
    (s) => s.replace('        ok: false, scaduto: r.status === 404 || r.status === 410, stato: r.status,',
      '        ok: false, stato: r.status,')],

  ['e non si spiega piu\' che un indirizzo scade a ogni edizione', FN,
    (s) => s.replace("': l\\'indirizzo non c\\'è più. Succede a ogni edizione nuova: va ritrovato.'", "': errore.'")],

  ['la funzione ricomincia a salvare il file su Supabase', FN,
    (s) => s.replace("    let b64 = ''",
      "    const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');\n"
      + "    await sb.storage.from('note-informative').upload(impronta + '.pdf', byte);\n    let b64 = ''")],

  ['la funzione non restituisce piu\' il file: chi l\'ha chiesto resta a mani vuote', FN,
    (s) => s.replace('      pdf_base64: btoa(b64),', '')],

  ['la funzione comincia a scrivere in archivio da sola', FN,
    (s) => s.replace('    return Response.json({\n      ok: true, host: new URL(finale).hostname,',
      "    await sb.from('iam_conf_documenti').insert({ impronta });\n"
      + '    return Response.json({\n      ok: true, host: new URL(finale).hostname,')],

  ['la funzione comincia a decidere gli stati delle garanzie', FN,
    (s) => s.replace('      reindirizzato: finale !== url,', "      reindirizzato: finale !== url, stato_garanzie: 'assente',")],

  /* ── il catalogo ────────────────────────────────────────────────────────── */
  /* I guasti sul catalogo cambiano il PRIMO stato che incontrano, o il valore
     di un campo preso con un'espressione, e non una riga scritta in un modo
     preciso: il catalogo si riscrive a ogni raccolta e a ogni compagnia
     aggiunta, e un guasto ancorato alla formattazione diventa cieco al primo
     riordino — lo dice solo nella riga «SENTINELLA PERSA», che è facile non
     guardare. È già successo due volte: aggiungendo Allianz e Nobis, e dopo la
     raccolta del 02/10/2026, quando il limite dichiarato è stato riscritto e il
     guasto che lo bersagliava ha smesso di misurare qualcosa. */
  ['il catalogo non dice piu\' che una verifica invecchia', CAT,
    (s) => s.replace(/"_IL_LIMITE_DA_SAPERE": "[^"]*"/,
      '"_IL_LIMITE_DA_SAPERE": "Gli indirizzi sono quelli pubblicati dalle compagnie."')],

  ['il catalogo torna a dire che nessun indirizzo e\' verificato, e invece 32 lo sono', CAT,
    (s) => s.replace(/("_IL_LIMITE_DA_SAPERE": ")/,
      '$1NESSUNO DI QUESTI URL È STATO VERIFICATO. ')],

  ['la verifica perde la data: un controllo senza data non invecchia mai', CAT,
    (s) => s.replace(/\s*"_verificato_il":\s*"[^"]*",/, '')],

  ['un documento si dichiara «verificato» senza portare la prova', CAT,
    (s) => s.replace('"stato": "non_pdf"', '"stato": "verificato"')],

  ['un documento non preso si tiene l\'impronta di quando era andata bene', CAT,
    (s) => s.replace('"stato": "non_preso"',
      '"stato": "non_preso",\n          "impronta": "0000000000000000000000000000000000000000000000000000000000000000"')],

  ['uno stato nuovo si usa senza spiegarlo nel vocabolario del catalogo', CAT,
    (s) => s.replace('"stato": "verificato"', '"stato": "quasi_preso"')],

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
