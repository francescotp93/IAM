/* Controprova di guida-garanzie.test.mjs.

   I guasti qui dentro non sono casuali: sono i modi in cui una «Guida alle
   garanzie» mente a un cliente in modo convincente. Questo foglio esce
   dall'agenzia col nome dell'agenzia sopra e dice che cosa copre una polizza:
   un esempio sbagliato non è una frase infelice, è un problema di adeguatezza.

   Il più grave è il primo: attaccare a una garanzia che non si è riconosciuta
   l'esempio di un'altra. Nessun errore, nessun avviso — solo un cliente che
   legge una cosa che la sua polizza non fa.

   Ogni guasto resta JavaScript VALIDO.

   I file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/guida-garanzie-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const GUIDA = join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js')
const VOCAB = join(RADICE, 'tariffe', 'motore', 'confronto.js')
const TEST = join(QUI, 'guida-garanzie.test.mjs')

const BUONI = { [GUIDA]: readFileSync(GUIDA, 'utf8'), [VOCAB]: readFileSync(VOCAB, 'utf8') }

const GUASTI = [
  ['una garanzia sconosciuta si prende l\'esempio della prima che capita', GUIDA,
    (s) => s.replace('      var e = x.id ? ESEMPI[x.id] : null;',
      '      var e = x.id ? ESEMPI[x.id] : ESEMPI[Object.keys(ESEMPI)[0]];')],

  ['una garanzia sconosciuta sparisce dalla guida invece di comparire senza esempio', GUIDA,
    (s) => s.replace("      (perSezione[sez] = perSezione[sez] || []).push({", '      if (!e) return;\n      (perSezione[sez] = perSezione[sez] || []).push({')],

  ['l\'incoerenza delle unità non si segnala più', GUIDA,
    (s) => s.replace('      if (k.length > 1) {', '      if (false) {')],

  ['due unità diverse si contano come una sola', GUIDA,
    (s) => s.replace("      x.voci.forEach(function (v) { if (v.unita) u[v.unita] = 1; });",
      "      if (x.voci[0] && x.voci[0].unita) u[x.voci[0].unita] = 1;")],

  ['il secondo importo della riga si perde', GUIDA,
    (s) => s.replace('    var voci = vals.map(function (v) {', '    var voci = vals.slice(0, 1).map(function (v) {')],

  ['l\'unità di misura non arriva più sulla scheda', GUIDA,
    (s) => s.replace('      var u = unitaDopo(t, v.da, v.lung);', '      var u = null;')],

  ['i titoli di sezione diventano garanzie', GUIDA,
    (s) => s.replace("    if (!vals.length && t === t.toUpperCase() && /[A-ZÀ-Ü]/.test(t)) {", '    if (false) {')],

  ['gli importi si leggono all\'inglese: un milione diventa uno', GUIDA,
    (s) => s.replace("    var n = m[1].replace(/[.\\s]/g, '').replace(',', '.');\n    var v = Number(n);",
      "    var v = Number(m[1].replace(/\\s/g, ''));")],

  ['torna `Intl`, e mille euro si scrive senza il punto', GUIDA,
    (s) => s.replace("    var intero = String(Math.floor(v)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');",
      "    var intero = new Intl.NumberFormat('it-IT').format(Math.floor(v));")],

  ['la parola «massimale» resta attaccata al nome della garanzia', GUIDA,
    (s) => s.replace(".replace(/[\\s,;:-]*\\b(?:massimale|massimali|capitale|somma assicurata|fino a|max|limite)\\b[\\s:]*$/i, '')", '')],

  ['la copertura vita si fa passare per una temporanea caso morte', VOCAB,
    (s) => s.replace("      { id: 'vita_generica', nome: 'Copertura vita',\n        sin: ['copertura vita', 'protezione vita', 'assicurazione vita', 'polizza vita'] },", '')],

  ['la copertura vita non chiede più di confermare il tipo di contratto', GUIDA,
    (s) => s.replace('      daConfermare: true,\n      esempio: \'Se la copertura è una temporanea caso morte',
      '      esempio: \'Se la copertura è una temporanea caso morte')],

  ['IL DIFETTO DELLE SIGLE: si torna a cercare dentro le parole', VOCAB,
    (s) => s.replace('        var dove = dentro(k, s);', '        var dove = k.indexOf(s);')],

  ['il nome in testa non vince più: decide la parola più lunga', VOCAB,
    (s) => s.replace('    cand.sort(function (a, b) { return a.da - b.da || b.lung - a.lung || a.ramo - b.ramo; });',
      '    cand.sort(function (a, b) { return b.lung - a.lung; });')],

  ['«furto e incendio» si spezza di nuovo in «furto»', VOCAB,
    (s) => s.replace('    cand.sort(function (a, b) { return a.da - b.da || b.lung - a.lung || a.ramo - b.ramo; });',
      '    cand.sort(function (a, b) { return a.da - b.da || a.lung - b.lung || a.ramo - b.ramo; });')],

  ['RC abitazione e RC capofamiglia tornano a essere la stessa garanzia', VOCAB,
    (s) => s.replace("      { id: 'rc_abitazione', nome: 'RC dell'abitazione',\n        sin: ['rc abitazione', 'responsabilita civile abitazione',\n              'responsabilita civile del fabbricato', 'rc fabbricato', 'rc proprieta'] },".replace("dell'abitazione", "dell\\'abitazione"), '')],

  ['un esempio torna a promettere invece di illustrare', GUIDA,
    (s) => s.replace("      esempio: 'Tuo figlio, in bicicletta, urta un passante e gli provoca una lesione: la garanzia può '\n        + 'intervenire sulla responsabilità civile della vita privata.' },",
      "      esempio: 'Tuo figlio, in bicicletta, urta un passante: la garanzia paga il danno.' },")],

  ['un esempio punta a una garanzia che non esiste nel vocabolario', GUIDA,
    (s) => s.replace('    rc_capofamiglia: {', '    rc_capofamiglia_sbagliato: {')],

  ['un esempio finisce in una sezione che non esiste', GUIDA,
    (s) => s.replace("    fenomeno_elettrico: {\n      sezione: 'imprevisti',", "    fenomeno_elettrico: {\n      sezione: 'elettrodomestici',")],

  ['la numerazione delle sezioni salta i numeri delle pagine che non ci sono', GUIDA,
    (s) => s.replace("        return { id: s.id, numero: String(i + 1).padStart(2, '0'), titolo: s.titolo,",
      '        return { id: s.id, numero: s.numero, titolo: s.titolo,')],

  ['il piede non dichiara più che il documento è illustrativo', GUIDA,
    (s) => s.replace("  var PIEDE = 'Documento illustrativo redatto sul prospetto fornito, non sostitutivo del preventivo e delle '",
      "  var PIEDE = 'Redatto sul prospetto fornito. '")],

  ['una guida su niente esce lo stesso, vuota', GUIDA,
    (s) => s.replace('      ok: sezioni.length > 0,', '      ok: true,')],

  ['vince la prima unità dell\'elenco invece della più vicina all\'importo', GUIDA,
    /* Trovato il 02/10/2026. Con l\'unità presa nell\'ordine in cui le ho
       scritte, «1000€ al mese, 500 € al giorno» leggeva due volte «al giorno»
       e l\'incoerenza spariva — cioè proprio la cosa che il motore esiste per
       trovare. Sulle righe vere non si vedeva per caso: «( marito + moglie ),»
       spinge il secondo «al giorno» oltre la finestra di quaranta caratteri. */
    (s) => s.replace('    var vinta = null, dove = -1;\n    for (var i = 0; i < UNITA.length; i++) {\n      var m = UNITA[i].r.exec(coda);\n      if (m && (dove < 0 || m.index < dove)) { dove = m.index; vinta = UNITA[i]; }\n    }\n    return vinta;',
      '    for (var i = 0; i < UNITA.length; i++) if (UNITA[i].r.test(coda)) return UNITA[i];\n    return null;')],
]

let sfuggiti = 0
try {
  for (const [desc, file, muta] of GUASTI) {
    const buono = BUONI[file]
    const rotto = muta(buono)
    if (rotto === buono) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — il file non contiene più quello che cercavo`)
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
console.log(`\nfile rimessi a posto: ${rimessi ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
