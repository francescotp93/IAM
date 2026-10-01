/* Controprova di confronta-nel-browser.test.mjs.

   Sabota il DISEGNO della schermata Confronta — non il motore, che ha la sua
   controprova — e pretende che la suite diventi rossa.

   Il motore può restare giustissimo e la schermata far sparire le garanzie che
   non ha letto, confondere un guasto con un archivio vuoto, o disegnare un
   punteggio senza dire su quante garanzie si è pronunciato. Nessuna prova in
   Node se ne accorgerebbe, perché in Node il disegno non esiste — ed è
   esattamente questa tabella che si gira verso un cliente.

   Ogni guasto resta JavaScript (o CSS) VALIDO: un guasto che non compila
   spegne lo script e la suite diventa rossa senza che nessuna prova abbia
   guardato niente.

   I file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/confronta-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const PAGINA = join(RADICE, 'iam', 'index.html')
const MENU = join(RADICE, 'iam', 'withus-one.js')
const TEST = join(QUI, 'confronta-nel-browser.test.mjs')

const BUONI = { [PAGINA]: readFileSync(PAGINA, 'utf8'), [MENU]: readFileSync(MENU, 'utf8') }

const GUASTI = [
  ['il motore del confronto non viene più caricato', PAGINA,
    (s) => s.replace('tariffe/motore/confronto.js?v=20261001', 'tariffe/motore/confronto-che-non-esiste.js')],

  ['il contrassegno del motore torna indietro', PAGINA,
    (s) => s.replace('confronto.js?v=20261001', 'confronto.js?v=20260930')],

  ['aprendo la pagina nessuno carica l\'archivio', PAGINA,
    (s) => s.replace("  if (t === 'confronta') { cfCarica(); }\n", '')],

  ['si disegnano solo le garanzie lette, non tutto il ramo', PAGINA,
    /* Il guasto più convincente: la tabella sembra un confronto completo e
       sono tre garanzie su quindici. */
    (s) => s.replace('  var righe = c.righe.map(function (r) {',
      '  var righe = c.righe.filter(function (r) { return r.confrontabile; }).map(function (r) {')],

  ['«non letto» diventa un trattino', PAGINA,
    (s) => s.replace(
      "    return '<span class=\"cf-st cf-nl\">non letto</span>' +\n" +
      "      '<div class=\"cf-fonte\">Il documento non lo dice, o non si è riusciti a leggerlo.</div>';",
      "    return '<span class=\"cf-st cf-nl\">—</span>';")],

  ['«non letto» perde la sua tinta e sembra un dato come gli altri', PAGINA,
    (s) => s.replace('<span class="cf-st cf-nl">non letto</span>', '<span class="cf-st cf-si">non letto</span>')],

  ['la regola di stile di «non letto» è scritta con un selettore che non prende', PAGINA,
    (s) => s.replace('.cf-nl{background:#eef0f3;color:#6b7280}', '.cf-st-nl{background:#eef0f3;color:#6b7280}')],

  ['«non letto» smette di spiegare perché', PAGINA,
    (s) => s.replace("'<div class=\"cf-fonte\">Il documento non lo dice, o non si è riusciti a leggerlo.</div>'",
      "''")],

  ['la pagina sparisce dalla fonte a schermo', PAGINA,
    (s) => s.replace("    if (f.pagina != null) dove.push('pag. ' + f.pagina);", '')],

  ['l\'edizione sparisce dalla fonte a schermo', PAGINA,
    (s) => s.replace("    if (f.edizione) dove.push('ed. ' + esc(f.edizione));", '')],

  ['la frase del documento non si mostra più', PAGINA,
    (s) => s.replace("(f.frase ? '<br><q>' + esc(String(f.frase).slice(0, 180)) + '</q>' : '')", "''")],

  ['il documento della garanzia non arriva dal database con il nome giusto', PAGINA,
    (s) => s.replace('        documento: doc.tipo || null, edizione: doc.edizione || null, url: doc.url || null',
      '        url: doc.url || null')],

  ['il cartello non dice più su quante garanzie si è pronunciato', PAGINA,
    (s) => s.replace("'<div class=\"cf-s\"><span>confrontate</span><b>' + p.su + ' <small style=\"font-size:12px;font-weight:600;color:var(--txt3)\">su ' + p.totale + '</small></b></div>' +", '')],

  ['il cartello non dice più quante non ne ha lette', PAGINA,
    (s) => s.replace("'<div class=\"cf-s\"><span>non lette</span><b>' + p.nonConfrontabili + '</b></div>' +", '')],

  ['la schermata proclama un vincitore anche quando il motore si astiene', PAGINA,
    (s) => s.replace("  var avviso = p.perche ? '<div class=\"cf-astenuto\"><b>Nessun verdetto.</b> ' + esc(p.perche) + '</div>' : '';",
      "  var avviso = '';\n  if (p.su > 0 && p.a !== p.b) p.vince = p.a > p.b ? 'a' : 'b';")],

  ['le garanzie fuori vocabolario non si mostrano più', PAGINA,
    (s) => s.replace('  var blocoFuori = fuori.length', '  var blocoFuori = false')],

  ['l\'archivio vuoto non si spiega più', PAGINA,
    (s) => s.replace("'<b>In archivio non c\\'è ancora nessun prodotto.</b> Il confronto legge i documenti ' +",
      "'' +")],

  ['un guasto di lettura si fa passare per un archivio vuoto', PAGINA,
    /* «Non si è potuto leggere» manda a cercare il guasto, «non ce n'è» manda
       a caricare i documenti: due strade diverse. */
    (s) => s.replace('    if (CF_ERRORE) {', '    if (false) {')],

  ['la voce di menu non apre più la schermata', MENU,
    (s) => s.replace("{ l: 'Confronta prodotti', i: 'i-flask', act: 'confronta', go: function () { vai('confronta'); } }",
      "{ l: 'Confronta prodotti', i: 'i-flask', act: 'confronta', go: function () { vai('analisi'); } }")],

  ['la voce di menu sparisce', MENU,
    (s) => s.replace("        { l: 'Confronta prodotti', i: 'i-flask', act: 'confronta', go: function () { vai('confronta'); } }\n", '')],
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
