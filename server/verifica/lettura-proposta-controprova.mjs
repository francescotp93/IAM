/* Controprova di lettura-proposta.test.mjs.

   I guasti qui dentro sono i modi in cui un lettore di documenti di compagnia
   sbaglia in modo credibile. Il peggiore non e' quello che si perde una
   garanzia: e' quello che ne propone una SBAGLIATA con l'aria di averla letta,
   perche' quel numero finisce su un preventivo e poi su un foglio che va a un
   cliente.

   Ogni guasto resta JavaScript VALIDO.

   I file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/lettura-proposta-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const LETT = join(RADICE, 'tariffe', 'motore', 'lettura-proposta.js')
const GUIDA = join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js')
const VOCAB = join(RADICE, 'tariffe', 'motore', 'confronto.js')
const TEST = join(QUI, 'lettura-proposta.test.mjs')

const BUONI = { [LETT]: readFileSync(LETT, 'utf8'), [VOCAB]: readFileSync(VOCAB, 'utf8'),
  [GUIDA]: readFileSync(GUIDA, 'utf8') }

const GUASTI = [
  ['non si ricuce più niente: le tabelle appiattite restano illeggibili', LETT,
    (s) => s.replace('    var parole = testo(prima).split(/\\s+/).filter(Boolean);\n    if (!parole.length) return { nome: nome, id: null, ricucito: false };',
      '    return { nome: nome, id: null, ricucito: false };\n    var parole = [];')],

  ['si ricuce solo dalla coda, come prima: «Franchigia naturali»', LETT,
    (s) => s.replace("    for (n = 1; n <= Math.min(4, parole.length); n++) tentativi.push(parole.slice(0, n).join(' '));\n", '')],

  ['si ricuce solo all’indietro: il nome che continua sotto si perde', LETT,
    (s) => s.replace("    var sotto = testo(dopo).split(/\\s+/).filter(Boolean).slice(0, 3);", '    var sotto = [];')],

  ['la ricucitura non si dichiara: sembra letta dal documento', LETT,
    (s) => s.replace('return { nome: prova, id: id, ricucito: true };', 'return { nome: prova, id: id, ricucito: false };')],

  ['l’intestazione non si guarda: le franchigie passano per massimali', LETT,
    (s) => s.replace('        var natura = naturaImporti(sopra);', '        var natura = null;')],

  ['un’intestazione ambigua si interpreta lo stesso', LETT,
    (s) => s.replace("    if (f && !m) return 'franchigia';\n    if (m && !f) return 'massimale';\n    return null;",
      "    if (f) return 'franchigia';\n    if (m) return 'massimale';\n    return null;")],

  ['la tabella appiattita non si segnala piu’', LETT,
    (s) => s.replace('          daGuardare: letta.voci.length > 2 ?', '          daGuardare: false ?')],

  ['la prosa del contratto diventa una garanzia', LETT,
    (s) => s.replace('        if (!r.id && r.nome.split(/\\s+/).length > 6) {', '        if (false) {')],

  ['anche i pezzi di frase tagliati diventano garanzie', LETT,
    (s) => s.replace("        if (!r.id && /\\b(di|del|della|dei|delle|da|dal|per|con|in|su|a|al|alla|e|ed|o)$/i.test(r.nome)) {", '        if (false) {')],

  ['quello che si scarta sparisce in silenzio', LETT,
    (s) => s.replace("perche: 'sembra una frase del contratto, non una garanzia' });", '});')],

  ['si propongono anche le righe senza nessun importo', LETT,
    (s) => s.replace('        if (!R_IMPORTO.test(t)) return;', '        if (false) return;')],

  ['la pagina non arriva piu’ sulla riga proposta', LETT,
    (s) => s.replace('          pagina: num, riga: t,', '          pagina: null, riga: t,')],

  ['il testo originale della riga si perde', LETT,
    (s) => s.replace('          pagina: num, riga: t,', "          pagina: num, riga: '',")],

  ['un documento illeggibile si dichiara ok lo stesso', LETT,
    (s) => s.replace('      ok: righe.length > 0,', '      ok: true,')],

  ['le righe scelte escono in un formato che la guida non sa leggere', LETT,
    (s) => s.replace("      return (r.nome + (imp ? ' ' + imp : '')).replace(/\\s+/g, ' ').trim();",
      "      return r.nome + ': ' + JSON.stringify(r.voci);")],

  ['«Guasti cagionati dai ladri» torna a essere un furto qualunque', VOCAB,
    (s) => s.replace("      { id: 'guasti_ladri', nome: 'Guasti cagionati dai ladri',\n        sin: ['guasti cagionati dai ladri', 'guasti da ladri', 'danni da tentato furto',\n              'danni cagionati dai ladri'] },", '')],

  /* ── il difetto piu' grosso: l'euro davanti al numero ─────────────────── */
  ['il lettore non vede piu’ l’euro davanti al numero: si perdono i massimali RCA', LETT,
    (s) => s.replace('  var R_IMPORTO = /(?:\\d[\\d.\\s]*(?:,\\d+)?\\s*(?:€|eur\\b|euro\\b)|(?:€|eur\\b|euro\\b)\\s*\\d)/i;',
      '  var R_IMPORTO = /\\d[\\d.\\s]*(?:,\\d+)?\\s*(?:€|eur\\b|euro\\b)/i;')],

  ['e nemmeno il motore della guida lo legge', GUIDA,
    (s) => s.replace("  var R_SOLDI = /(?:(\\d[\\d.\\s]*(?:,\\d+)?)\\s*(?:€|eur\\b|euro\\b)|(?:€|eur\\b|euro\\b)\\s*(\\d[\\d.\\s]*(?:,\\d+)?))/gi;",
      "  var R_SOLDI = /(\\d[\\d.\\s]*(?:,\\d+)?)\\s*(?:€|eur\\b|euro\\b)/gi;")],

  ['il simbolo dell’euro resta attaccato al nome della garanzia', GUIDA,
    (s) => s.replace('      if (n != null) fuori.push({ valore: n, da: m.index, lung: m[0].length });',
      '      if (n != null) fuori.push({ valore: n, da: m.index + m[0].length - 1, lung: 1 });')],

  /* ── l'ordine di fiducia ──────────────────────────────────────────────── */
  ['le proposte non si ordinano piu’ per fiducia', LETT,
    (s) => s.replace('    righe.sort(function (a, b) { return b.fiducia - a.fiducia || a.pagina - b.pagina; });', '')],

  ['la fiducia non guarda piu’ se la garanzia si riconosce', LETT,
    (s) => s.replace('      if (x.id) punti += 100;', '')],

  ['la fiducia non penalizza piu’ i nomi lunghi, cioe’ le frasi', LETT,
    (s) => s.replace('      punti -= Math.min(40, x.nome.split(/\\s+/).length * 4);', '')],
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
