/* Controprova delle prove sul CONTRAENTE in flusso-hdi.test.mjs (29/09/2026).

   Qui si tocca la regola che decide se una polizza entra in archivio e a chi
   viene intestata. Sbagliarla non dà errore: dà polizze intestate a nessuno,
   oppure — nel verso opposto — un file di duecentocinquanta polizze che non si
   carica per quattordici. Tutti e due i versi vanno presi.

   Si sabota il motore di HDI e quello dell'SSF (il piano, che è condiviso), e
   si pretende che le prove diventino rosse.

   Ogni guasto resta JavaScript VALIDO: uno che non compila spegne il modulo e
   la suite diventa rossa senza che nessuna prova abbia guardato niente.

   I file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/flusso-hdi-contraente-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const HDI = join(QUI, '..', '..', 'tariffe', 'motore', 'flusso-hdi.js')
const SSF = join(QUI, '..', '..', 'tariffe', 'motore', 'flusso-ssf.js')
const TEST = join(QUI, 'flusso-hdi.test.mjs')
const HDI_BUONO = readFileSync(HDI, 'utf8')
const SSF_BUONO = readFileSync(SSF, 'utf8')

const GUASTI_HDI = [
  ['si torna a bloccare tutto il file per una polizza sola',
    /* Il guasto di partenza: quattordici polizze ne tenevano fuori
       duecentotrentotto. */
    (s) => s.replace("      avvisi.push({ g: 'avviso', t: polizzeScartate.length + ' polizze su '",
      "      avvisi.push({ g: 'grave', t: polizzeScartate.length + ' polizze su '")],

  ['l\'archivio smette di contare: il contraente deve stare in questo file',
    (s) => s.replace("      return Object.prototype.hasOwnProperty.call(notiCli, 'hdi:a:' + k); // è in archivio",
      '      return false;')],

  ['una polizza senza contraente passa per buona',
    (s) => s.replace('      if (!k) return false;                                       // non nomina nessuno',
      '      if (!k) return true;')],

  ['il contraente si considera noto comunque',
    (s) => s.replace('    var haContraente = function (p) {', '    var haContraente = function (p) { return true; // eslint-disable-line\n    var _vecchio = function (p) {')],

  ['le polizze scartate arrivano lo stesso alla scrittura',
    (s) => s.replace('      polizze: polizzeBuone,\n', '      polizze: polizze,\n')],

  ['non si dice più quante polizze restano fuori',
    (s) => s.replace('    if (polizzeScartate.length) {', '    if (false) {')],

  ['non si dice su quante: «1 polizze» senza il totale',
    (s) => s.replace("polizzeScartate.length + ' polizze su ' + polizze.length",
      "polizzeScartate.length + ' polizze'")],

  ['non si dice che fine fanno',
    (s) => s.replace("        + ' nominano un contraente che non e\\' ne\\' nel file ne\\' in archivio: si lasciano fuori, '\n        + 'altrimenti entrerebbero senza intestatario. Il resto si carica.' });",
      "        + ' nominano un contraente sconosciuto.' });")],

  ['i conteggi tornano a dire un numero solo',
    (s) => s.replace('        polizze: polizze.length, polizzeCaricabili: polizzeBuone.length,',
      '        polizze: polizzeBuone.length,')],

  ['l\'indice per numero torna a comprendere le polizze scartate',
    /* Le loro rate risulterebbero caricabili e poi non si aggancerebbero a
       niente: l'anteprima promette più di quello che entra. */
    (s) => s.replace('    polizzeBuone.forEach(function (p) { numPolizza[String(p.numero || \'\').trim()] = p; });',
      '    polizze.forEach(function (p) { numPolizza[String(p.numero || \'\').trim()] = p; });')],

  ['il nome del cliente in archivio non arriva sulla polizza',
    (s) => s.replace("              || (noti['hdi:a:' + p.anagrafica_id] || null)\n", '')],

  ['i clienti noti non viaggiano fino alla conversione',
    (s) => s.replace('      clientiNoti: notiCli,', '      clientiNoti: {},')],

  ['una mappa di clienti noti viene letta come se fosse un elenco',
    (s) => s.replace("    } else if (clientiNoti && typeof clientiNoti === 'object') {", '    } else if (false) {')],

  ['un elenco di sole chiavi non viene più accettato',
    (s) => s.replace('    if (Array.isArray(clientiNoti)) {', '    if (false) {')],
]

const GUASTI_SSF = [
  ['il piano non risolve più il contraente che sta solo in archivio',
    /* Senza questo, si smette di bloccare il file e quelle polizze spariscono
       in silenzio: due modi diversi di perderle. */
    (s) => s.replace('      if (perFonteCli[k]) idPerChiave[k] = perFonteCli[k];', '')],

  ['il piano risolve la chiave sbagliata',
    (s) => s.replace('      var k = p._cliente;\n      if (!k || idPerChiave[k]) return;',
      '      var k = p._fonte_id;\n      if (!k || idPerChiave[k]) return;')],

  ['il piano sovrascrive un contraente già risolto',
    (s) => s.replace('      if (!k || idPerChiave[k]) return;', '      if (!k) return;')],
]

let sfuggiti = 0

function giro(elenco, file, buono, cosa) {
  for (const [desc, muta] of elenco) {
    const rotto = muta(buono)
    if (rotto === buono) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — ${cosa} non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(file, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/❌ [^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.slice(2).split('  —')[0].trim()}`))
    if (!rosso) sfuggiti++
    writeFileSync(file, buono)
  }
}

try {
  giro(GUASTI_HDI, HDI, HDI_BUONO, 'il lettore di HDI')
  giro(GUASTI_SSF, SSF, SSF_BUONO, 'il piano')
} finally {
  writeFileSync(HDI, HDI_BUONO)
  writeFileSync(SSF, SSF_BUONO)
}

const rimessi = readFileSync(HDI, 'utf8') === HDI_BUONO && readFileSync(SSF, 'utf8') === SSF_BUONO
const quanti = GUASTI_HDI.length + GUASTI_SSF.length
console.log(`\nmotori rimessi a posto: ${rimessi ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${quanti}/${quanti} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
