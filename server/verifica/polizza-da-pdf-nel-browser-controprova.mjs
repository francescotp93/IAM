/* Controprova di polizza-da-pdf-nel-browser.test.mjs.

   Il motore ha la sua controprova. Questa guarda la SCHERMATA, dove i guasti
   sono di un'altra specie: non sbagliano un conto, fanno SEMBRARE vero quello
   che non lo è. Un campo che resta col valore di partenza e passa per dato
   letto dal documento; un cliente agganciato per nome; una provenienza di un
   PDF attaccata alla polizza sbagliata.

       node server/verifica/polizza-da-pdf-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const QUOTO = join(RADICE, 'index.html')
const TEST = join(QUI, 'polizza-da-pdf-nel-browser.test.mjs')

const BUONI = { [QUOTO]: readFileSync(QUOTO, 'utf8') }

const GUASTI = [
  ['IL CLIENTE SI AGGANCIA AL PRIMO OMONIMO', QUOTO,
    (s) => s.replace("  } else if (decisione.azione === 'scelta_a_mano') {",
      "  } else if (decisione.azione === 'scelta_a_mano') {\n    pnuClienteScelto(decisione.omonimi[0]);")],

  ['un valore che la tendina non ha ci va dentro lo stesso', QUOTO,
    (s) => s.replace("    const ok = Array.prototype.some.call(e.options, (o) => o.value === String(valore));\n    if (!ok) return false;", '')],

  ['il campo del cliente resta vuoto anche quando il cliente e\' scelto', QUOTO,
    (s) => s.replace("  const q = document.getElementById('pnu-cliente-q');\n  if (q) q.value = a ? (a.nominativo || '') : '';", '')],

  ['il resoconto non dice piu\' da quale pagina viene ogni dato', QUOTO,
    (s) => s.replace("    + ' <span style=\"opacity:.65\">(pagina ' + c[k].pagina + ', letto «' + esc(String(c[k].grezzo).slice(0, 40)) + '»)</span></li>').join('');",
      "    + '</li>').join('');")],

  ['sparisce l\'avviso che il lettore non e\' misurato su polizze vere', QUOTO,
    (s) => s.replace(/\+ '<div class="pnu-nota" style="margin-top:10px"><b>Controlla tutto prima di salvare[\s\S]*?'ancora stato misurato su polizze vere delle compagnie: quello che ha letto è una proposta, non un dato certo\.<\/div>'\n/, "+ ''\n")],

  ['aprire il modulo non azzera piu\' la provenienza della volta prima', QUOTO,
    (s) => s.replace('  PCP_LETTURA = null;\n  polPannello(\'Nuova polizza\'', '  polPannello(\'Nuova polizza\'')],

  ['una polizza gia\' in archivio non porta piu\' a quella che c\'e\'', QUOTO,
    (s) => s.replace("+ '<a href=\"#\" onclick=\"document.getElementById(\\'pol-ov\\')?.remove();polDettaglio(\\'' + esc(p.id) + '\\');return false\">aprila</a>.';",
      "+ '.';")],

  ['il motore degli importi smette di essere caricato: ogni premio diventa illeggibile', QUOTO,
    (s) => s.replace(/<script src="tariffe\/motore\/importo\.js\?v=\d+"><\/script>\n/, '')],

  ['il motore delle polizze smette di essere caricato', QUOTO,
    (s) => s.replace(/<script src="tariffe\/motore\/polizza-da-pdf\.js\?v=\d+"><\/script>\n/, '')],

  ['i premi letti non arrivano piu\' nei campi', QUOTO,
    (s) => s.replace("  if (c.premio_annuo) pcpMetti('pnu-annuo', v('premio_annuo'));", '')],
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
    if (/SyntaxError|non esegue il suo script/.test(uscita)) {
      console.log(`⚠️  GUASTO MUTO (pagina rotta): ${desc}`)
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
