/* Controprova di appunti-incassi.test.mjs.
   Sabota le regole prese dal manuale di AssiEasy e pretende che la suite
   diventi rossa. Nessuno di questi guasti dà errore: danno una giornata che
   sembra quadrata e non lo è, che è il modo in cui un ammanco resta nascosto.

   Il motore viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/appunti-incassi-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const MOT = join(QUI, '..', '..', 'tariffe', 'motore', 'contabilita-giornaliera.js')
/* Due suite: quella nuova sullo stato dell'appunto e quella che c'era già sul
   foglio della giornata. Un guasto qui non deve poter rompere l'altra in
   silenzio. */
const TEST = [join(QUI, 'appunti-incassi.test.mjs'), join(QUI, 'contabilita-giornaliera.test.mjs')]
const BUONO = readFileSync(MOT, 'utf8')

const GUASTI = [
  ['un incasso che la compagnia non ha visto passa per OK',
    (s) => s.replace("      return { stato: STATI_APPUNTO.APPUNTO,", "      return { stato: STATI_APPUNTO.OK,")],

  ['una riga che da noi non esiste passa per OK',
    (s) => s.replace("      return { stato: STATI_APPUNTO.FC,", "      return { stato: STATI_APPUNTO.OK,")],

  ['la differenza di importo non produce più uno scostamento',
    (s) => s.replace("    if (!ab) return { stato: STATI_APPUNTO.OK, abbuono: null, scostamento: null, perche: null };",
      "    return { stato: STATI_APPUNTO.OK, abbuono: null, scostamento: null, perche: null };")],

  ['il verso dell\'abbuono si scambia: un costo diventa un ricavo',
    (s) => s.replace("      verso: d < 0 ? 'passivo' : 'attivo',", "      verso: d < 0 ? 'attivo' : 'passivo',")],

  ['gli abbuoni di pochi centesimi si arrotondano a zero',
    (s) => s.replace("    var d = cent(i - t);\n    if (!d) return null;",
      "    var d = cent(i - t);\n    if (Math.abs(d) < 0.5) return null;")],

  ['l\'importo entra nella chiave: uno scostamento diventa due righe orfane',
    (s) => s.replace("    return p + '|' + e;", "    return p + '|' + e + '|' + cent((r || {}).importo);")],

  ['una riga senza numero di polizza si abbina a caso',
    (s) => s.replace("    if (!p) return null;                      // senza numero di polizza non si abbina niente",
      "    if (!p) return 'senza|polizza';")],

  ['il numero di polizza si confronta con maiuscole e spazi',
    (s) => s.replace("    var p = chiave((r || {}).polizza || (r || {}).numero_polizza);",
      "    var p = String((r || {}).polizza || (r || {}).numero_polizza || '');")],

  ['i doppioni nostri non si dichiarano più',
    (s) => s.replace("    Object.keys(quanteMie).forEach(function (k) { if (quanteMie[k] > 1) doppioni.push(k); });", "")],

  ['fra due candidate si abbina la prima invece della più vicina',
    (s) => s.replace("            return da - db;", "            return 0;")],

  ['«tutte OK» diventa vero anche con righe da sanare',
    (s) => s.replace("      tutteOk: !sco.length && !fc.length && !app.length && !senzaNumero.length,", "      tutteOk: true,")],

  ['la differenza col report della compagnia si calcola al contrario',
    (s) => s.replace("      differenza: cent(somma(righe, 'foglio') - somma(righe, 'nostro')),",
      "      differenza: cent(somma(righe, 'nostro') - somma(righe, 'foglio')),")],

  ['le righe senza numero di polizza non vengono più segnalate',
    (s) => s.replace("    var senzaNumero = righe.filter(function (x) { return x.senzaChiave; });",
      "    var senzaNumero = [];")],

  /* ATTENZIONE: questo sabotaggio deve restare JavaScript VALIDO. La prima
     versione rompeva una stringa a metà e la suite diventava rossa per un
     errore di sintassi — cioè veniva «presa» senza che nessuna prova avesse
     guardato la regola. Un guasto che non compila non misura niente. */
  ['l\'appunto non dice più quanto vale',
    (s) => s.replace("        + somma(app).toFixed(2).replace('.', ',') + ' €",
      "        + '' + ' €")],

  ['l\'abbinamento scrive dentro le righe del chiamante',
    (s) => s.replace("      var s = statoAppunto(n, scelto ? scelto.r : null);",
      "      n._toccata = true;\n      var s = statoAppunto(n, scelto ? scelto.r : null);")],

  ['gli abbuoni passivi e attivi si sommano insieme',
    (s) => s.replace("    var abbAttivo = cent(sco.filter(function (x) { return x.abbuono.verso === 'attivo'; })",
      "    var abbAttivo = cent(sco.filter(function (x) { return true; })")],
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
    const preso = [], quali = []
    for (const t of TEST) {
      let rosso = false, uscita = ''
      try { uscita = execFileSync('node', [t], { encoding: 'utf8' }) }
      catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
      if (rosso) {
        preso.push(t.split('/').pop().replace('.test.mjs', ''))
        ;(uscita.match(/(?:❌|X  ) [^\n]+/g) || []).slice(0, 2)
          .forEach((s) => quali.push(s.replace(/^(?:❌|X  ) /, '').split('  —')[0].trim()))
      }
    }
    console.log(`${preso.length ? '✅ preso' : '❌ NON PRESO'}: ${desc}${preso.length ? '   [' + preso.join(' + ') + ']' : ''}`)
    quali.slice(0, 2).forEach((q) => console.log(`        rossa: ${q}`))
    if (!preso.length) sfuggiti++
  }
} finally {
  writeFileSync(MOT, BUONO)
}

const rimesso = readFileSync(MOT, 'utf8') === BUONO
console.log(`\nmotore rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
