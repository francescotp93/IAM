/* Controprova di garanzie.test.mjs.
   Sabota il motore delle garanzie e pretende che la suite diventi rossa.

   Nessuno di questi guasti dà errore: danno una tabella che si legge bene e
   dice il falso — un massimale che non c'è, una franchigia a zero dove non è
   dichiarata, una somma che «quadra» senza avere il premio con cui
   confrontarsi. Sono i modi in cui si risponde male a un cliente al telefono.

   Ogni guasto resta JavaScript VALIDO: un guasto che non compila spegne il
   modulo e la suite diventa rossa senza che nessuna prova abbia guardato
   niente.

   Il motore viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/garanzie-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const MOT = join(QUI, '..', '..', 'tariffe', 'motore', 'garanzie.js')
const TEST = join(QUI, 'garanzie.test.mjs')
const BUONO = readFileSync(MOT, 'utf8')

const GUASTI = [
  ['il codice di Prima resta a schermo com\'è, in maiuscolo',
    (s) => s.replace('if (NOMI[cod]) return NOMI[cod];             // i 19 codici di Prima', '')],

  ['un nome italiano di HDI viene sovrascritto dalla tabella',
    (s) => s.replace("    if (des && des !== cod) return des;          // HDI, e chiunque scriva un nome vero", '')],

  ['una garanzia sconosciuta prende il nome di un\'altra',
    (s) => s.replace("    return des || cod || 'Garanzia senza nome';", "    return 'Responsabilità civile auto';")],

  ['le garanzie di HDI non si trovano più: la scheda le mostra vuote',
    (s) => s.replace("    if (d.garanzie && d.garanzie.length) return { lista: d.garanzie, fonte: 'hdi' };", '')],

  ['`premio_lordo` di HDI non diventa più `lordo`',
    (s) => s.replace('    if (lordo == null) lordo = num(g.premio_lordo);', '')],

  ['un importo all\'italiana si legge come se fosse inglese',
    (s) => s.replace("    if (s.indexOf(',') > -1) s = s.replace(/\\./g, '').replace(',', '.');", '')],

  ['«non dichiarato» diventa zero',
    (s) => s.replace("    if (v == null || v === '' || v === '-') return null;",
      "    if (v == null || v === '' || v === '-') return 0;")],

  ['uno zero dichiarato diventa «non dichiarato»',
    (s) => s.replace("      FACOLTATIVE.forEach(function (c) { if (g && g[c] != null && g[c] !== '') viste[c] = true; });",
      "      FACOLTATIVE.forEach(function (c) { if (g && g[c]) viste[c] = true; });")],

  ['le colonne si mostrano tutte, anche quelle vuote su tutte le righe',
    (s) => s.replace("    return FACOLTATIVE.filter(function (c) { return viste[c]; });", '    return FACOLTATIVE.slice();')],

  ['un totale su niente diventa zero invece di «non si sa»',
    (s) => s.replace('    var t = null;\n', '    var t = 0;\n')],

  ['la quadratura dice «quadra» anche senza il premio della polizza',
    (s) => s.replace("    if (t == null || p == null) {", '    if (false) {')],

  ['la quadratura chiude un occhio su trenta euro di differenza',
    (s) => s.replace('    if (Math.abs(d) <= 0.01) {', '    if (Math.abs(d) < 50) {')],

  ['un centesimo di arrotondamento fa gridare allo scostamento',
    (s) => s.replace('    if (Math.abs(d) <= 0.01) {', '    if (d === 0) {')],

  ['«ne mancano» e «ne avanzano» si scambiano',
    (s) => s.replace("+ (d > 0 ? 'ne avanzano ' : 'ne mancano ')", "+ (d > 0 ? 'ne mancano ' : 'ne avanzano ')")],

  ['le garanzie si mostrano dalla più economica alla più cara',
    (s) => s.replace('    lista.sort(function (a, b) { return (b.lordo == null ? -1 : b.lordo) - (a.lordo == null ? -1 : a.lordo); });',
      '    lista.sort(function (a, b) { return (a.lordo == null ? -1 : a.lordo) - (b.lordo == null ? -1 : b.lordo); });')],

  ['normalizzare scrive dentro la garanzia letta dall\'archivio',
    (s) => s.replace('  function normalizza(g) {\n    g = g || {};',
      '  function normalizza(g) {\n    g = g || {};\n    g._normalizzata = true;')],

  ['una polizza senza garanzie fa esplodere la scheda',
    (s) => s.replace('    var d = (p && p.dati) || {};', '    var d = p.dati || {};')],
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
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
  }
} finally {
  writeFileSync(MOT, BUONO)
}

const rimesso = readFileSync(MOT, 'utf8') === BUONO
console.log(`\nmotore rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
