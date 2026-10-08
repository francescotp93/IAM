/* Controprova di polizza-da-pdf.test.mjs.

   I guasti qui dentro sono i modi in cui «carico il PDF e mi compila tutto»
   diventa «carico il PDF e mi sporca l'archivio». Il primo dell'elenco è il
   peggiore di tutti, e non è il più vistoso: è il nome che basta per agganciare
   una polizza a un cliente. Un premio sbagliato lo vede chi guarda la
   schermata; due persone fuse in una scheda sola no — si scoprono quando una
   delle due telefona per una polizza intestata a un altro.

       node server/verifica/polizza-da-pdf-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const MOT = join(RADICE, 'tariffe', 'motore', 'polizza-da-pdf.js')
const TEST = join(QUI, 'polizza-da-pdf.test.mjs')

const BUONI = { [MOT]: readFileSync(MOT, 'utf8') }

const GUASTI = [
  /* ── il cliente ───────────────────────────────────────────────────────────── */
  ['IL NOME BASTA PER AGGANCIARE UNA POLIZZA A UN CLIENTE', MOT,
    (s) => s.replace("    if ((a.omonimi || []).length) {\n      return { azione: 'scelta_a_mano', omonimi: a.omonimi,",
      "    if ((a.omonimi || []).length) {\n      return { azione: 'cliente_trovato', cliente: a.omonimi[0], omonimi: a.omonimi,")],

  ['il codice fiscale non si verifica piu\' col carattere di controllo', MOT,
    (s) => s.replace("    if (!A.valido(v)) return { ok: false, perche: '«' + v + '» non supera il carattere di controllo: non è un codice fiscale valido' };",
      "    if (!/^[A-Z0-9]{16}$/.test(v)) return { ok: false, perche: 'forma sbagliata' };")],

  ['un codice fiscale storto passa come «nudo», senza controllo', MOT,
    (s) => s.replace('        if (A.valido(trovati[i])) {', '        if (trovati[i]) {')],

  ['se il cliente e\' gia\' scelto si prepara lo stesso una scheda nuova', MOT,
    (s) => s.replace('    var anagrafica = scelte.clienteId ? null : {', '    var anagrafica = false ? null : {')],

  /* ── il doppione ──────────────────────────────────────────────────────────── */
  ['la stessa polizza si carica due volte', MOT,
    (s) => s.replace("    if (a.polizzaPerNumero) {", "    if (false) {")],

  /* ── i valori indovinati ──────────────────────────────────────────────────── */
  ['una data con l\'anno a due cifre si interpreta invece di rifiutarla', MOT,
    (s) => s.replace("    if (m[3].length !== 4) return { ok: false, perche: 'l\\'anno è scritto con due cifre: «' + s + '» può essere due secoli diversi' };",
      "    if (m[3].length !== 4) m[3] = '20' + m[3];")],

  ['una data che non esiste passa lo stesso', MOT,
    (s) => s.replace(/    if \(d\.getUTCDate\(\) !== g[\s\S]*?\n    \}\n/, '')],

  ['un premio ambiguo si interpreta: torna il guasto del punto decimale', MOT,
    (s) => s.replace("    var r = I.leggi(s);\n    return r.ok ? { ok: true, valore: r.cents / 100, cents: r.cents, scritto: r.scritto } : { ok: false, perche: r.motivo };",
      "    var n = parseFloat(String(s).replace(/\\./g, '').replace(',', '.'));\n    return isFinite(n) ? { ok: true, valore: n, cents: Math.round(n * 100) } : { ok: false, perche: 'non è un numero' };")],

  ['un frazionamento nuovo si inventa invece di rifiutarlo', MOT,
    (s) => s.replace("    return { ok: false, perche: '«' + s + '» non è una delle parole che l\\'archivio usa (' + FRAZIONAMENTI.join(', ') + ')' };",
      "    return { ok: true, valore: testo(s) };")],

  ['la compagnia non si riporta piu\' alla parola dell\'archivio', MOT,
    (s) => s.replace("          return { valore: COMPAGNIE[i].nome, grezzo: m[0],", "          return { valore: m[0], grezzo: m[0],")],

  /* ── quello che non ha capito ─────────────────────────────────────────────── */
  ['quello che non ha capito smette di dichiararlo', MOT,
    (s) => s.replace(/        nonCapito\.push\(\{ campo: campo, perche: letto\.perche, grezzo: preso\.grezzo, pagina: preso\.pagina, ancora: preso\.ancora \}\);\n/, '')],

  ['il motivo del «non capito» diventa una parola sola', MOT,
    (s) => s.replace("        nonCapito.push({ campo: campo, perche: 'nel documento non ho trovato nessuna delle parole con cui questo dato di solito si annuncia' });",
      "        nonCapito.push({ campo: campo, perche: 'no' });")],

  /* ── la scansione ─────────────────────────────────────────────────────────── */
  ['una scansione con due righe di testo passa per documento leggibile', MOT,
    (s) => s.replace('    if (caratteri / pg.length < 25) {', '    if (false) {')],

  ['una scansione vuota diventa «non ho trovato niente»', MOT,
    (s) => s.replace('    if (!caratteri) {', '    if (false) {')],

  /* ── la prova di dove viene ogni numero ───────────────────────────────────── */
  ['i valori perdono la pagina da cui vengono', MOT,
    (s) => s.replace("      campi[campo] = { valore: letto.valore, grezzo: preso.grezzo, pagina: preso.pagina, ancora: preso.ancora };",
      "      campi[campo] = { valore: letto.valore };")],

  ['la provenienza non si attacca piu\' alla polizza salvata', MOT,
    (s) => s.replace('          provenienza: provenienza(c),', '          provenienza: {},')],

  /* ── i controlli di coerenza ──────────────────────────────────────────────── */
  ['una scadenza prima della decorrenza non fa piu\' alzare la testa a nessuno', MOT,
    (s) => s.replace('    if (campi.data_effetto && campi.data_scadenza && campi.data_scadenza.valore <= campi.data_effetto.valore) {', '    if (false) {')],

  ['una rata piu\' alta del premio annuo passa in silenzio', MOT,
    (s) => s.replace('    if (campi.premio_annuo && campi.premio_rata && campi.premio_rata.valore > campi.premio_annuo.valore + 0.005) {', '    if (false) {')],

  /* ── quello che manca per salvare ─────────────────────────────────────────── */
  ['non si dice piu\' che manca la decorrenza, l\'unica che il database pretende', MOT,
    (s) => s.replace("    if (!c.data_effetto) out.push('Manca la decorrenza: senza, la polizza non si può salvare.');", '')],

  ['il motore comincia a proporre un mezzo di pagamento che non ha letto', MOT,
    (s) => s.replace("      fonte: 'polizza_pdf',\n      /* LA PROVA DI DOVE VIENE", "      mezzo_pagamento: 'bonifico',\n      fonte: 'polizza_pdf',\n      /* LA PROVA DI DOVE VIENE")],
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
