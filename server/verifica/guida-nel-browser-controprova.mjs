/* Controprova di guida-nel-browser.test.mjs.

   Sabota il DISEGNO della guida — la schermata e la descrizione del foglio da
   stampare — e pretende che la suite diventi rossa.

   Il guasto che conta più di tutti è il primo: l'elenco delle cose da
   confermare che sparisce, o che scivola sotto le schede. Lì dentro finiscono
   i refusi veri del prospetto, e se non si vedono PRIMA, il foglio parte col
   refuso dentro e nessuno se ne accorge.

   Ogni guasto resta JavaScript (o CSS) VALIDO: uno che non compila spegne lo
   script e la suite diventa rossa senza che nessuna prova abbia guardato
   niente.

   I file vengono sempre rimessi com'erano, anche se qualcosa esplode.

       node server/verifica/guida-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const PAGINA = join(RADICE, 'index.html')
const MOTORE = join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js')
const TEST = join(QUI, 'guida-nel-browser.test.mjs')

const BUONI = { [PAGINA]: readFileSync(PAGINA, 'utf8'), [MOTORE]: readFileSync(MOTORE, 'utf8') }

const GUASTI = [
  ['l\'elenco delle cose da confermare sparisce dalla schermata', PAGINA,
    (s) => s.replace('  const avvisi = g.daConfermare.length', '  const avvisi = false')],

  ['l\'elenco scivola SOTTO le schede, dove non lo legge nessuno', PAGINA,
    (s) => s.replace("  box.innerHTML = avvisi +\n    '<div class=\"ppg-conto\">'", "  box.innerHTML =\n    '<div class=\"ppg-conto\">'")
             .replace("    '<div class=\"ppg-piede\">' + esc(g.piede) + '</div>';", "    avvisi + '<div class=\"ppg-piede\">' + esc(g.piede) + '</div>';")],

  ['la regola di stile dell\'elenco non lo raggiunge: resta trasparente', PAGINA,
    (s) => s.replace('.ppg-avv{background:#fff4e6;', '.ppg-avviso{background:#fff4e6;')],

  ['la schermata dice che va tutto bene anche quando c\'è da confermare', PAGINA,
    (s) => s.replace('  const avvisi = g.daConfermare.length\n    ?', '  const avvisi = false\n    ?')],

  ['una garanzia sconosciuta non si distingue più dalle altre', PAGINA,
    (s) => s.replace("'<div class=\"ppg-c' + (c.daConfermare ? ' ppg-c-avv' : '') + '\">'", "'<div class=\"ppg-c\">'")],

  ['la garanzia senza esempio non spiega perché non ce l\'ha', PAGINA,
    (s) => s.replace("'<div class=\"ppg-c-e ppg-c-senza\">Nessun esempio:", "'<div class=\"ppg-c-e\">Nessun esempio:")],

  ['l\'importo non arriva più sulla scheda a schermo', PAGINA,
    (s) => s.replace("<span>' + esc(c.importo || '—') + '</span>", "<span></span>")],

  ['l\'anteprima non si rifà più mentre si scrive', PAGINA,
    (s) => s.replace('style="flex:1" oninput="ppGuidaAnteprima()"', 'style="flex:1"')],

  ['il piede illustrativo sparisce dalla schermata', PAGINA,
    (s) => s.replace("'<div class=\"ppg-piede\">' + esc(g.piede) + '</div>'", "''")],

  ['senza righe la schermata resta muta invece di invitare a scriverle', PAGINA,
    (s) => s.replace("    box.innerHTML = '<div class=\"ppg-vuoto\">Scrivi le garanzie qui sopra e qui comparirà la guida che '\n      + 'leggerà il cliente, con un esempio concreto per ognuna.</div>';",
      "    box.innerHTML = '';")],

  ['il motore del vocabolario non viene più caricato dal preventivatore', PAGINA,
    (s) => s.replace('<script src="tariffe/motore/confronto.js?v=20261002"></script>', '')],

  ['il contrassegno della guida torna indietro', PAGINA,
    (s) => s.replace('guida-garanzie.js?v=20261002', 'guida-garanzie.js?v=20261001')],

  ['il bottone per scaricare la guida sparisce', PAGINA,
    (s) => s.replace('<button class="ghost" onclick="ppGuidaScarica(\'${esc(r.id)}\')"><i class="ti ti-book"></i> Guida alle garanzie</button>\n        ', '')],

  /* ── il documento da stampare ─────────────────────────────────────────── */
  ['le cose da confermare non finiscono sul foglio, solo a schermo', MOTORE,
    (s) => s.replace('    if (g.daConfermare.length) {\n      blocchi.push({ tipo: \'titolo\', testo: \'DA CONFERMARE SUI DOCUMENTI CONTRATTUALI\' });',
      '    if (false) {\n      blocchi.push({ tipo: \'titolo\', testo: \'DA CONFERMARE SUI DOCUMENTI CONTRATTUALI\' });')],

  ['il foglio apre il capitolo «da confermare» anche quando è vuoto', MOTORE,
    (s) => s.replace('    if (g.daConfermare.length) {', '    if (true) {')],

  ['le schede da confermare non si tingono più sul foglio', MOTORE,
    (s) => s.replace("tono: c.daConfermare ? 'ambra' : null, size: 8.5, leading: 4.2 });",
      'size: 8.5, leading: 4.2 });')],

  ['l\'importo sparisce dal titolo della scheda stampata', MOTORE,
    (s) => s.replace("          titolo: c.nome.toUpperCase() + (c.importo ? '  ·  ' + c.importo : ''),",
      '          titolo: c.nome.toUpperCase(),')],

  ['l\'importo torna a essere gridato in maiuscolo', MOTORE,
    (s) => s.replace("          titolo: c.nome.toUpperCase() + (c.importo ? '  ·  ' + c.importo : ''),",
      "          titolo: (c.nome + (c.importo ? '  ·  ' + c.importo : '')).toUpperCase(),")],

  ['il documento non porta più il nome del cliente', MOTORE,
    (s) => s.replace("      tipo: 'GUIDA ALLE GARANZIE', numero: chi,", "      tipo: 'GUIDA ALLE GARANZIE', numero: '',")],

  ['le avvertenze non dicono più che il documento è illustrativo', MOTORE,
    (s) => s.replace("      avvertenze: PIEDE + (opz.avvertenzeInPiu ? ' ' + testo(opz.avvertenzeInPiu) : ''),",
      "      avvertenze: 'Guida alle garanzie.',")],

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
