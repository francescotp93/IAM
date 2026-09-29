/* Controprova di marketing-nel-browser.test.mjs.
   Sabota il Lab e pretende che la suite, che lo apre in un browser vero,
   diventi rossa.

   Perché una controprova a parte da quella sul sorgente: le due misurano cose
   diverse. `sessione-condivisa-controprova` guarda che il CODICE chieda la
   cosa giusta; questa guarda che la SCHERMATA si comporti bene. Un guasto può
   passare la prima e non la seconda — per esempio una regola CSS che non
   prende, o un riquadro costruito e mai mostrato: il sorgente contiene le
   parole giuste e a schermo non succede niente.

   Ogni guasto resta HTML/JavaScript VALIDO: uno che non compila spegne lo
   script e la suite diventa rossa senza che nessuna prova abbia guardato
   niente.

   Il file viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/marketing-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const LAB = join(QUI, '..', '..', 'lab', 'index.html')
const TEST = join(QUI, 'marketing-nel-browser.test.mjs')
const BUONO = readFileSync(LAB, 'utf8')

const GUASTI = [
  ['Marketing torna a chiedere la password a chi è già dentro IAM',
    /* Il guasto vero del 29/09/2026: con `persistSession: false` il client non
       guarda lo storage condiviso, non trova la sessione di IAM, e mostra la
       sua porta d'ingresso dentro il riquadro. */
    (s) => s.replace('inIframe ? { auth: { autoRefreshToken: false } } : undefined',
      'inIframe ? { auth: { persistSession: false, autoRefreshToken: false } } : undefined')],

  ['Marketing rinnova la sessione per conto suo',
    (s) => s.replace('inIframe ? { auth: { autoRefreshToken: false } } : undefined', 'undefined')],

  ['dentro IAM ricompare la schermata di accesso a tutto schermo',
    (s) => s.replace('  if (inIframe) return mostraDentroIam(msg);', '')],

  ['il riquadro che spiega viene costruito e mai mostrato',
    /* Il codice dice tutte le parole giuste e a schermo non compare niente:
       è il guasto che solo un browser può vedere. */
    (s) => s.replace('  box.style.display = \'\';', "  box.style.display = 'none';")],

  ['il riquadro non dice più perché Marketing non si apre',
    (s) => s.replace("    ? '<b>Marketing non è disponibile per questo account</b>' + esc(msg)",
      "    ? '<b>Marketing non è disponibile per questo account</b>'")],

  ['non si dice più che si è rimasti dentro IAM',
    (s) => s.replace("      + '<div class=\"emb-sub\">Sei sempre dentro IAM: puoi continuare dalle altre sezioni.</div>'", "      + ''")],

  ['senza sessione non si spiega più che cosa manca',
    (s) => s.replace("    : '<b>Non riesco a leggere la sessione</b>Marketing usa l\\'accesso di IAM e qui non lo trova.'",
      "    : '<b>Non riesco a leggere la sessione</b>'")],

  ['non si può più riprovare senza uscire',
    (s) => s.replace("      + '<button type=\"button\" onclick=\"location.reload()\">Ricarica</button>'", "      + ''")],

  ['chi non è abilitato viene buttato fuori anche da IAM',
    (s) => s.replace('  if (!inIframe) { try { db.auth.signOut(); } catch (_) {} }',
      '  try { db.auth.signOut(); } catch (_) {}')],

  ['il cancello di Marketing si apre a tutti',
    (s) => s.replace('  if (!isSA && !(PROFILO && PROFILO.lab_abilitato === true))', '  if (false)')],

  ['dentro IAM ricompare la seconda testata verde',
    (s) => s.replace('  .emb-iam .top{display:none;}', '')],

  ['la regola che nasconde la testata è scritta con un selettore che non prende',
    /* CSS valido, e non nasconde niente: in Node non si vedrebbe. */
    (s) => s.replace('  .emb-iam .top{display:none;}', '  .top .emb-iam{display:none;}')],

  ['la classe emb-iam non si accende più dentro il riquadro',
    (s) => s.replace("if(_f&&window.self!==window.top)document.documentElement.classList.add('emb-iam');", '')],

  ['emb-iam si accende anche a pagina intera: Marketing perde la sua testata',
    (s) => s.replace("var _f=new URLSearchParams(location.search).get('from')==='iam';if(_f&&window.self!==window.top)document.documentElement.classList.add('emb-iam');",
      "document.documentElement.classList.add('emb-iam');")],

  ['a schermo torna il nome di un altro programma',
    (s) => s.replace('Il contatto arriva in IAM → Richieste', 'Il contatto arriva in QUOTO → Richieste')],

  ['l\'avviso resta a schermo anche quando la sessione arriva dopo',
    (s) => s.replace("  const _em = document.getElementById('emb-msg');\n  if (_em) _em.style.display = 'none';", '')],
]

let sfuggiti = 0
try {
  for (const [desc, muta] of GUASTI) {
    const rotto = muta(BUONO)
    if (rotto === BUONO) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — Marketing non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(LAB, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
    writeFileSync(LAB, BUONO)
  }
} finally {
  writeFileSync(LAB, BUONO)
}

const rimesso = readFileSync(LAB, 'utf8') === BUONO
console.log(`\nMarketing rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
