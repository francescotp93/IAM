/* Controprova di stripe-funzione.test.mjs.

   Qui i guasti sono i modi in cui una richiesta di pagamento parte sbagliata, o
   parte da chi non doveva. Il primo è quello vero, misurato il 06/10/2026 sulla
   versione installata: l'importo letto in euro, con il punto trattato da
   separatore delle migliaia — «170.00» chiesto a un cliente come 17.000,00 €.

   Regola di casa: un guasto che non trova più il suo bersaglio non misura
   niente, e lo dice solo nella riga «SENTINELLA PERSA».

       node server/verifica/stripe-funzione-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const FN = join(RADICE, 'supabase', 'functions', 'stripe', 'index.ts')
const MOT = join(RADICE, 'tariffe', 'motore', 'importo.js')
const TEST = join(QUI, 'stripe-funzione.test.mjs')

const BUONI = { [FN]: readFileSync(FN, 'utf8'), [MOT]: readFileSync(MOT, 'utf8') }

const GUASTI = [
  /* ── l'importo ────────────────────────────────────────────────────────────── */
  /* Il guasto vero è questo: la guardia della pagina vecchia VIENE PRIMA, e un
     ritorno della lettura in euro infilato dopo di lei sarebbe codice morto —
     il primo tentativo di scrivere questo guasto lo infilava lì, e la prova
     diceva «non preso» quando invece non c'era niente da prendere. Un guasto
     messo dove non si esegue non misura la prova: misura il guasto. */
  ['TORNA LA LETTURA IN EURO: «170.00» ridiventa 17.000,00 €', FN,
    (s) => s.replace(/    if \(corpo\.importo_cents === undefined && corpo\.importo !== undefined\) \{\n[\s\S]*?\n    \}\n    const letto = centesimi\(corpo\.importo_cents\);/,
      '    const inEuro = parseFloat(String(corpo.importo ?? "").replace(/\\./g, "").replace(",", "."));\n'
      + '    const letto = corpo.importo_cents === undefined && isFinite(inEuro) && inEuro > 0\n'
      + '      ? { ok: true as const, cents: Math.round(inEuro * 100) }\n'
      + '      : centesimi(corpo.importo_cents);')],

  ['una pagina vecchia non sa piu\' che deve ricaricarsi', FN,
    (s) => s.replace(/    if \(corpo\.importo_cents === undefined && corpo\.importo !== undefined\) \{\n[\s\S]*?\n    \}\n/,
      '')],

  ['l\'importo non si controlla piu\' che sia un intero: 170.5 centesimi passano', FN,
    (s) => s.replace('if (typeof v !== "number" || !Number.isInteger(v))', 'if (typeof v !== "number")')],

  ['lo zero passa: parte un link di pagamento da 0,00 €', FN,
    (s) => s.replace('  if (v <= 0) return { ok: false, motivo: "L\'importo deve essere maggiore di zero." };',
      '  if (v < 0) return { ok: false, motivo: "L\'importo deve essere maggiore di zero." };')],

  ['il tetto non si applica piu\'', FN,
    (s) => s.replace(/  if \(v > TETTO_CENTS\) return \{ ok: false, motivo: "Importo fuori scala\." \};\n/, '')],

  ['il tetto della funzione e\' diverso da quello del motore', FN,
    (s) => s.replace('const TETTO_CENTS = 999999999;', 'const TETTO_CENTS = 500000000;')],

  ['il tetto del MOTORE e\' diverso da quello della funzione', MOT,
    (s) => s.replace('var TETTO_CENTS = 999999999;', 'var TETTO_CENTS = 500000000;')],

  ['in archivio finisce un importo diverso da quello mandato a Stripe', FN,
    (s) => s.replace('        importo_cents: cents, descrizione, cliente, metodo: "stripe", stato: "creato",',
      '        importo_cents: Math.round(cents / 100), descrizione, cliente, metodo: "stripe", stato: "creato",')],

  /* ── lo stato ─────────────────────────────────────────────────────────────── */
  ['la funzione comincia a dichiarare da sola che un pagamento e\' «pagato»', FN,
    (s) => s.replace('        body: JSON.stringify({ stripe_id: link.id, stripe_url: link.url }),',
      '        body: JSON.stringify({ stripe_id: link.id, stripe_url: link.url, stato: "pagato" }),')],

  /* ── chi puo' fare cosa ───────────────────────────────────────────────────── */
  ['un utente spento crea link come se fosse attivo', FN,
    (s) => s.replace('  const attivo = !!utente && utente.attivo !== false && utente.accesso_iam !== false;',
      '  const attivo = true;')],

  ['un pagamento gia\' incassato si puo\' cancellare', FN,
    (s) => s.replace(/    if \(p\.stato === "pagato"\) return ko\(CORS, 400, [^\n]*\n/, '')],

  ['il link di un altro si cancella senza essere il capo', FN,
    (s) => s.replace('    if (!suo && !capo) return ko(CORS, 403, "Non puoi eliminare questo pagamento.");', '')],

  ['si cancella la riga ma il link resta pagabile su Stripe', FN,
    (s) => s.replace(/    if \(p\.stripe_id\) \{ try \{ await stripeApi\("\/payment_links\/" \+ p\.stripe_id[^\n]*\n/, '')],

  ['una rotta che non esiste risponde «va bene»', FN,
    (s) => s.replace('  return ko(CORS, 404, "Rotta non riconosciuta.");', '  return ok(CORS, { success: true });')],

  /* ── le intestazioni ──────────────────────────────────────────────────────── */
  ['le intestazioni CORS tornano a dire «qualunque origine»', FN,
    (s) => s.replace('    "Access-Control-Allow-Origin": buona,', '    "Access-Control-Allow-Origin": "*",')],

  ['un\'origine estranea viene accettata e rimandata', FN,
    (s) => s.replace('  const buona = origine && ORIGINI.includes(origine) ? origine : ORIGINI[0];',
      '  const buona = origine || ORIGINI[0];')],

  ['sparisce «Vary: Origin»: un proxy serve a tutti le intestazioni del primo', FN,
    (s) => s.replace('    "Vary": "Origin",', '')],

  /* ── il file che non e' quello installato ─────────────────────────────────── */
  ['il file smette di dichiarare che la versione installata e\' un\'altra', FN,
    (s) => s.replace('QUESTO FILE NON E\' QUELLO INSTALLATO.', 'Il lato server dei pagamenti.')],
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
