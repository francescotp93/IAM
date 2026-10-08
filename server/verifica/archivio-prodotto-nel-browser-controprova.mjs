/* Controprova di archivio-prodotto-nel-browser.test.mjs.

   Le prove di una schermata sono quelle che si fidano più facilmente: guardano
   del disegno, e il disegno sembra sempre giusto.

   Il guasto peggiore di tutto l'elenco è il quarto: si toglie un controllo e
   un «assente» senza prova finisce in archivio. Nessuno se ne accorgerebbe
   guardando la schermata — la casella è spuntata, il salvataggio dice che è
   andato bene — e quella casella diventa, su un foglio che va a un cliente,
   «il concorrente non copre questa cosa».

   Ogni guasto resta JavaScript VALIDO, e un guasto che rompe la sintassi si
   riconosce e si dichiara perso: con la pagina rotta tutte le prove vanno
   rosse per lo stesso motivo e non misurano più niente.

       node server/verifica/archivio-prodotto-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const IAM = join(RADICE, 'iam', 'index.html')
const SP = join(RADICE, 'tariffe', 'motore', 'scheda-prodotto.js')
const PDFT = join(RADICE, 'tariffe', 'motore', 'pdf-testo.js')
const TEST = join(QUI, 'archivio-prodotto-nel-browser.test.mjs')

const BUONI = { [IAM]: readFileSync(IAM, 'utf8'), [SP]: readFileSync(SP, 'utf8'),
  [PDFT]: readFileSync(PDFT, 'utf8') }

const GUASTI = [
  /* ── i motori non arrivano in IAM ───────────────────────────────────────── */
  ['il motore che legge i documenti non si carica piu\' in IAM', IAM,
    (s) => s.replace('<script src="/nuovo-preventivo/tariffe/motore/scheda-prodotto.js?v=20261002"></script>\n', '')],

  ['il lettore di PDF non si carica piu\' in IAM', IAM,
    (s) => s.replace('<script src="/nuovo-preventivo/tariffe/motore/pdf-testo.js?v=20261002"></script>\n', '')],

  ['manca la ricucitura dei nomi spezzati: le tabelle per area si perdono', IAM,
    (s) => s.replace('<script src="/nuovo-preventivo/tariffe/motore/lettura-proposta.js?v=20261002"></script>\n', '')],

  ['il contrassegno di un motore resta indietro', IAM,
    (s) => s.replace('scheda-prodotto.js?v=20261002', 'scheda-prodotto.js?v=20260101')],

  /* ── IL GUASTO PEGGIORE ─────────────────────────────────────────────────── */
  ['UN «assente» SENZA PROVA FINISCE IN ARCHIVIO', IAM,
    (s) => s.replace('  if (senzaProva.length) {', '  if (false) {')],

  ['la prova si accetta anche se e\' fatta di spazi', IAM,
    (s) => s.replace("    if (!String(CFN.citazioni[g.garanzia] || '').trim()) senzaProva.push(g.nome);",
      "    if (CFN.citazioni[g.garanzia] == null) senzaProva.push(g.nome);")],

  ['l\'avviso non dice quale garanzia e\' senza prova', IAM,
    (s) => s.replace("      senzaProva.join('\\n· ') +", "      '' +")],

  ['l\'avviso non dice perche\' e\' grave', IAM,
    (s) => s.replace("      '\\n\\nScrivi dove c\\'è scritto, oppure mettile su «non letta». Dire a un cliente che un prodotto ' +\n      'non copre una cosa che invece copre non è un errore di battitura.');",
      "      '');")],

  ['la frase della persona non finisce in archivio: resta quella del motore', IAM,
    (s) => s.replace("        frase: stato === 'assente' ? String(CFN.citazioni[r.garanzia] || '').trim() : r.frase",
      '        frase: r.frase')],

  /* ── le tre spunte ──────────────────────────────────────────────────────── */
  ['la riga non offre piu\' tutti e tre gli stati: decide il motore', IAM,
    (s) => s.replace("      b('assente', 'cfn-b-no', 'assente') +\n", '')],

  ['il campo della citazione si vede sempre, anche su una garanzia presente', IAM,
    (s) => s.replace("'<div class=\"cfn-cit' + (stato === 'assente' ? ' on' : '') + '\" id=\"cfn-cit-' + g.garanzia + '\">'",
      "'<div class=\"cfn-cit on\" id=\"cfn-cit-' + g.garanzia + '\">'")],

  ['il campo della citazione non compare mai', IAM,
    (s) => s.replace('.cfn-cit.on{display:block}', '.cfn-cit.on{display:none}')],

  ['l\'etichetta non avvisa che senza citazione non si salva', IAM,
    (s) => s.replace("      '<div class=\"cfn-cit-l\">Dove c\\'è scritto che non c\\'è — senza questo non si salva</div>' +",
      "      '<div class=\"cfn-cit-l\">Citazione</div>' +")],

  ['la spunta scelta non si vede accesa', IAM,
    (s) => s.replace("    return '<button type=\"button\" class=\"' + cls + (stato === val ? ' on' : '') +",
      "    return '<button type=\"button\" class=\"' + cls + (false ? ' on' : '') +")],

  /* ── quello che la riga deve dire ───────────────────────────────────────── */
  ['la pagina non si stampa piu\' sulla riga: niente da controllare sul documento', IAM,
    (s) => s.replace("      (g.pagina != null ? 'pag. ' + g.pagina : 'non trovata nel documento') +",
      "      '' +")],

  ['la frase del documento non si riporta piu\'', IAM,
    (s) => s.replace("    (g.frase ? '<div class=\"cfn-frase\">«' + esc(g.frase.slice(0, 170)) + '»</div>' : '') +", '')],

  ['i numeri non si vedono sulla riga', IAM,
    (s) => s.replace("    (g.massimale != null || g.franchigia != null || g.franchigie_per_area\n      ? '<div class=\"cf-num\">' +",
      "    (false\n      ? '<div class=\"cf-num\">' +")],

  ['la tabella appiattita non si segnala piu\' nella schermata', IAM,
    (s) => s.replace("    (g.daGuardare ? '<div class=\"cfn-g\"><i class=\"ti ti-alert-triangle\"></i> ' + esc(g.daGuardare) + '</div>' : '') +", '')],

  /* ── quello che la schermata dichiara ──────────────────────────────────── */
  ['le avvertenze non si mostrano piu\'', IAM,
    (s) => s.replace("    (s.avvertenze && s.avvertenze.length\n      ? '<div class=\"cfn-avv\"><b>Quello che va saputo prima di archiviare</b><ul>' +",
      "    (false\n      ? '<div class=\"cfn-avv\"><b>Quello che va saputo prima di archiviare</b><ul>' +")],

  ['le avvertenze ci sono ma non si vedono', IAM,
    (s) => s.replace('.cfn-avv{background:#fff4e6;border:1px solid #f0c674;border-radius:10px;padding:10px 13px;',
      '.cfn-avv{display:none;background:#fff4e6;border:1px solid #f0c674;border-radius:10px;padding:10px 13px;')],

  ['la schermata non dice piu\' che sono proposte e non una lettura', IAM,
    (s) => s.replace("      '<div class=\"cfn-nota\" style=\"margin:0 0 10px\"><b>Queste sono proposte, non una lettura.</b> ' +", "      '' +")],

  ['i conti dei tre stati non si vedono', IAM,
    (s) => s.replace("    '<div class=\"cfn-conto\">' +", "    '<div class=\"cfn-conto-x\">' +")],

  ['le coperture che il vocabolario non conosce non si mostrano', IAM,
    (s) => s.replace("    ((s.fuoriVocabolario || []).length\n", '    (false\n')],

  ['e non si spiega piu\' perche\' contano', IAM,
    (s) => s.replace("        'altrimenti questo prodotto risulterà più povero di quello che è.</div>' +", "        '</div>' +")],

  /* ── il ramo e la scansione ─────────────────────────────────────────────── */
  ['il ramo e il tipo non arrivano piu\' proposti', IAM,
    (s) => s.replace("          return '<option value=\"' + r.id + '\"' + (r.id === s.ramo ? ' selected' : '') + '>' + esc(r.nome) + '</option>';",
      "          return '<option value=\"' + r.id + '\">' + esc(r.nome) + '</option>';")],

  ['l\'edizione non arriva proposta', IAM,
    (s) => s.replace("'<input id=\"cfn-edizione\" type=\"text\" list=\"cfn-edizioni\" value=\"' + esc(ed.length ? ed[0].valore : '') + '\" ' +",
      "'<input id=\"cfn-edizione\" type=\"text\" list=\"cfn-edizioni\" value=\"\" ' +")],

  ['a un documento illeggibile si chiede il ramo, e si prova a vuoto', IAM,
    (s) => s.replace("      (s.scansione ? '' :\n", "      (false ? '' :\n")],

  ['una scansione passa per un documento senza garanzie', SP,
    (s) => s.replace('    if (!caratteri) {', '    if (false) {')],

  ['il bottone «Salva» resta acceso su un documento illeggibile', IAM,
    (s) => s.replace('    cfnBottone(false);\n    return;\n  }\n\n  var ed = s.edizioni || [];',
      '    cfnBottone(true);\n    return;\n  }\n\n  var ed = s.edizioni || [];')],

  /* ── il salvataggio ─────────────────────────────────────────────────────── */
  ['il prodotto si archivia senza chiedere la compagnia', IAM,
    (s) => s.replace("  if (!compagnia) { alert('Scrivi la compagnia, come sta sul documento.'); return; }", '')],

  ['una garanzia spostata su «non letta» si porta dietro i numeri', IAM,
    (s) => s.replace('        massimale: nonLetto ? null : r.massimale,', '        massimale: r.massimale,')],

  ['il documento si archivia senza impronta: non si sapra\' mai se e\' cambiato', IAM,
    (s) => s.replace('      impronta: CFN.impronta || null, pagine: CFN.scheda.pagine',
      '      impronta: null, pagine: CFN.scheda.pagine')],

  ['le spunte della persona si perdono: in archivio va quello che diceva il motore', IAM,
    (s) => s.replace("      var stato = CFN.scelte[r.garanzia] || r.stato;", '      var stato = r.stato;')],

  ['il bottone per archiviare sparisce dalla schermata Confronta', IAM,
    (s) => s.replace('      <button class="d-btn primario" type="button" onclick="cfnApri()">\n        <i class="ti ti-file-plus"></i> Metti un prodotto in archivio</button>\n', '')],

  /* ── ATTACCARE A MANO UN IMPORTO (08/10/2026) ──────────────────────────────
     Misurato su 31 documenti veri: zero massimali attribuiti su trenta su
     trentuno. Il pezzo umano e' l'unica cosa che riempie quei campi, e questi
     guasti sono i modi in cui riempirli diventa peggio che lasciarli vuoti. */
  ['si attacca un importo senza che nessuno abbia scelto la garanzia', IAM,
    (s) => s.replace("  if (!id) { alert('Scegli prima a quale garanzia va questo importo.'); return; }", '')],

  ['UN IMPORTO SI ATTACCA A UNA GARANZIA NON LETTA, E SPARISCE AL SALVATAGGIO', IAM,
    (s) => s.replace("  if (cfnStatoDi(g) === 'non_letto') {", '  if (false) {')],

  ['il bottone e\' uno solo: si attacca sempre il primo importo della riga', IAM,
    (s) => s.replace('  var tasti = importi.map(function (v, k) {', '  var tasti = importi.slice(0, 1).map(function (v, k) {')],

  ['l\'importo attaccato a mano non si distingue piu\' da uno letto dalla riga', IAM,
    (s) => s.replace("  if (!g.attribuito_a_mano || g.attribuito_a_mano.indexOf(tipo) < 0) return '';\n  return ' <span class=\"cnt-tag\"",
      "  if (true) return '';\n  return ' <span class=\"cnt-tag\"")],

  ['il tasto «togli» non toglie piu\' niente', IAM,
    (s) => s.replace("  g[tipo] = null;\n  g.attribuito_a_mano = (g.attribuito_a_mano || []).filter(function (t) { return t !== tipo; });", '')],

  ['l\'importo attaccato perde la pagina da cui viene', IAM,
    (s) => s.replace('  if (g.pagina == null) g.pagina = x.pagina;', '')],

  ['gli importi non attribuiti tornano a essere un elenco da guardare e basta', IAM,
    (s) => s.replace('        s.importiNonAttribuiti.map(function (x, i) { return cfnImporto(x, i); }).join(\'\') +',
      "        '<ul>' + s.importiNonAttribuiti.map(function (x) { return '<li>pag. ' + x.pagina + '</li>'; }).join('') + '</ul>' +")],

  /* ── il documento che esce dal browser ──────────────────────────────────── */
  ['il documento parte verso un servizio esterno', PDFT,
    (s) => s.replace("  function righeDaPezzi(pezzi) {",
      "  function righeDaPezzi(pezzi) {\n    if (!pezzi) fetch('/riassumi', { method: 'POST' });")],
]

let sfuggiti = 0, rotti = 0
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

    if (/non esegue il suo script|SyntaxError/.test(uscita)) {
      console.log(`⚠️  GUASTO MUTO (sintassi rotta): ${desc}`)
      rotti++
      continue
    }
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
if (rotti) console.log(`${rotti} guasti muti: rompevano la sintassi, non misurano niente`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli li'`
  : `${GUASTI.length - rotti}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || rotti || !rimessi ? 1 : 0)
