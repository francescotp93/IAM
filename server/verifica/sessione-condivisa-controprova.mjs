/* Controprova delle prove su MARKETING in sessione-condivisa.test.mjs.
   Sabota il Lab e la scocca e pretende che la suite diventi rossa.

   Perché proprio qui: nessuno di questi guasti dà errore. Danno una schermata
   che chiede di nuovo la password a chi è già entrato, o — peggio — una
   schermata che, per dire «non puoi entrare in Marketing», butta la persona
   fuori da IAM. Il secondo è il guasto che la correzione del 29/09/2026
   avrebbe ACCESO: finché il client non leggeva lo storage condiviso non c'era
   nessuna sessione da chiudere, e `signOut()` non faceva niente.

   Ogni guasto resta HTML/JavaScript VALIDO: uno che non compila spegne lo
   script e la suite diventa rossa senza che nessuna prova abbia guardato
   niente.

   I file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/sessione-condivisa-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const LAB = join(QUI, '..', '..', 'lab', 'index.html')
const SCOCCA = join(QUI, '..', '..', 'iam', 'withus-one.js')
const TEST = join(QUI, 'sessione-condivisa.test.mjs')
const LAB_BUONO = readFileSync(LAB, 'utf8')
const SCOCCA_BUONA = readFileSync(SCOCCA, 'utf8')

const GUASTI_LAB = [
  ['Marketing torna a non leggere lo storage: ricompare la richiesta di password',
    (s) => s.replace('inIframe ? { auth: { autoRefreshToken: false } } : undefined',
      'inIframe ? { auth: { persistSession: false, autoRefreshToken: false } } : undefined')],

  ['Marketing rinnova la sessione per conto suo e fa ruotare il refresh token',
    (s) => s.replace('inIframe ? { auth: { autoRefreshToken: false } } : undefined', 'undefined')],

  ['dentro IAM ricompare la schermata di accesso a tutto schermo',
    (s) => s.replace('  if (inIframe) return mostraDentroIam(msg);', '')],

  ['il riquadro dentro IAM chiede di nuovo la password',
    (s) => s.replace("      + '<div class=\"emb-sub\">Sei sempre dentro IAM: puoi continuare dalle altre sezioni.</div>'",
      "      + '<input type=\"password\" id=\"emb-pass\">'")],

  ['non si può più riprovare senza uscire da IAM',
    (s) => s.replace("      + '<button type=\"button\" onclick=\"location.reload()\">Ricarica</button>'", "      + ''")],

  ['un account non abilitato viene buttato fuori anche da IAM',
    /* È il guasto vero, quello che la correzione avrebbe acceso. */
    (s) => s.replace('  if (!inIframe) { try { db.auth.signOut(); } catch (_) {} }',
      '  try { db.auth.signOut(); } catch (_) {}')],

  ['il cancello di Marketing si apre a tutti',
    (s) => s.replace("  if (!isSA && !(PROFILO && PROFILO.lab_abilitato === true))", '  if (false)')],

  ['un account sospeso entra lo stesso',
    (s) => s.replace('  if (PROFILO && PROFILO.attivo === false) return showBlocked', '  if (false) return showBlocked')],

  ['dentro IAM ricompare la seconda testata verde',
    (s) => s.replace('  .emb-iam .top{display:none;}', '')],

  ['la classe emb-iam si accende anche a pagina intera',
    (s) => s.replace("var _f=new URLSearchParams(location.search).get('from')==='iam';if(_f&&window.self!==window.top)document.documentElement.classList.add('emb-iam');",
      "document.documentElement.classList.add('emb-iam');")],

  ['la porta d\'ingresso può ricomparire dentro il riquadro',
    (s) => s.replace('  .emb-iam #login-screen{display:none !important;}', '')],
]

const GUASTI_SCOCCA = [
  ['Marketing torna su un\'altra origine: lo storage condiviso non c\'è più',
    (s) => s.replace("aprireQuoto(null, { base: 'lab/', menu: 'marketing'",
      "aprireQuoto(null, { base: 'https://quoto.withusassicurazioni.it/lab/', menu: 'marketing'")],

  ['l\'indirizzo del riquadro non dice più di arrivare da IAM',
    (s) => s.replace("var base = QUOTO + (sotto || '') + '?from=iam';", "var base = QUOTO + (sotto || '');")],
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
    ;(uscita.match(/❌ {2}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.replace(/^❌\s+/, '').trim()}`))
    if (!rosso) sfuggiti++
    writeFileSync(file, buono)
  }
}

try {
  giro(GUASTI_LAB, LAB, LAB_BUONO, 'Marketing')
  giro(GUASTI_SCOCCA, SCOCCA, SCOCCA_BUONA, 'la scocca di IAM')
} finally {
  writeFileSync(LAB, LAB_BUONO)
  writeFileSync(SCOCCA, SCOCCA_BUONA)
}

const rimessi = readFileSync(LAB, 'utf8') === LAB_BUONO && readFileSync(SCOCCA, 'utf8') === SCOCCA_BUONA
const quanti = GUASTI_LAB.length + GUASTI_SCOCCA.length
console.log(`\nfile rimessi a posto: ${rimessi ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${quanti}/${quanti} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
