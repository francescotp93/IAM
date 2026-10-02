/* Controprova di lettura-proposta-nel-browser.test.mjs.

   Le prove della schermata sono quelle che si fidano piu' facilmente: guardano
   del disegno, e il disegno sembra sempre giusto. Qui si rompe la schermata nei
   modi in cui si rompe davvero — un «checked» di troppo, una pagina che non si
   stampa piu' sulla riga, una regola di stile rinominata — e si guarda se le
   prove se ne accorgono.

   Il guasto peggiore di tutto l'elenco e' il numero 9: una riga che il motore
   dice di guardare arriva spuntata. Nessuno se ne accorgerebbe guardando la
   schermata, e tre franchigie di una tabella appiattita finirebbero su un
   preventivo come tre massimali.

   UN GUASTO CHE ROMPE LA SINTASSI NON MISURA NIENTE: la pagina intera non
   esegue piu' il suo script, tutte le prove vanno rosse e sembrerebbe che
   fossero forti. Qui si riconosce e si dichiara perso.

       node server/verifica/lettura-proposta-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const PAGINA = join(RADICE, 'index.html')
/* La lettura del PDF e' uscita dalla pagina ed e' finita in un motore
   (02/10/2026), perche' la usano in tre posti. I guasti che la riguardano
   vanno rifatti su quel file: un guasto che non trova piu' il suo bersaglio
   non misura niente, e lo dice solo se qualcuno guarda la riga «SENTINELLA
   PERSA». */
const PDFT = join(RADICE, 'tariffe', 'motore', 'pdf-testo.js')
const TEST = join(QUI, 'lettura-proposta-nel-browser.test.mjs')

const BUONI = { [PAGINA]: readFileSync(PAGINA, 'utf8'), [PDFT]: readFileSync(PDFT, 'utf8') }

const GUASTI = [
  /* ── il motore non arriva nella pagina ──────────────────────────────────── */
  ['il motore di lettura non si carica piu\'', PAGINA,
    (s) => s.replace('<script src="tariffe/motore/lettura-proposta.js?v=20261002"></script>\n', '')],

  ['il contrassegno resta indietro: i browser servono la versione di ieri', PAGINA,
    (s) => s.replace('lettura-proposta.js?v=20261002', 'lettura-proposta.js?v=20260101')],

  /* ── il campo nel modale ────────────────────────────────────────────────── */
  ['il campo c\'e\' ma non chiama il lettore: caricare un file non fa niente', PAGINA,
    (s) => s.replace('onchange="ppProponiDaFile(this)"', 'onchange=""')],

  ['il campo accetta qualunque file', PAGINA,
    (s) => s.replace('<input type="file" accept="application/pdf,.pdf" id="pp-proposta-file"',
      '<input type="file" id="pp-proposta-file"')],

  ['il riquadro delle proposte non c\'e\' nel modale', PAGINA,
    (s) => s.replace('<div id="pp-proposte" style="margin-top:9px"></div>',
      '<div style="margin-top:9px"></div>')],

  ['riaprendo il modale restano in memoria le righe del cliente di prima', PAGINA,
    (s) => s.replace('  PP_PROPOSTE = null;\n', '')],

  /* ── quello che la riga deve dire ───────────────────────────────────────── */
  ['la pagina non si stampa piu\' sulla riga: niente da controllare sul documento', PAGINA,
    (s) => s.replace("(x.natura ? ' · ' + esc(x.natura) : '') + ' · pag. ' + x.pagina + '</i>' +",
      "(x.natura ? ' · ' + esc(x.natura) : '') + '</i>' +")],

  ['la frase letterale del documento non si riporta piu\'', PAGINA,
    (s) => s.replace("            '<q>' + esc(x.riga.slice(0, 150)) + '</q>' +\n", '')],

  ['l\'importo non si scrive sulla riga', PAGINA,
    (s) => s.replace("            '<i>' + esc(GuidaGaranzie.importoScritto(x.voci)) +",
      "            '<i>' + esc('') +")],

  ['franchigia o massimale non si dice piu\': le franchigie passano per massimali', PAGINA,
    (s) => s.replace("(x.natura ? ' · ' + esc(x.natura) : '') + ' · pag. ' + x.pagina + '</i>' +",
      "' · pag. ' + x.pagina + '</i>' +")],

  /* ── IL GUASTO PEGGIORE ─────────────────────────────────────────────────── */
  ['UNA RIGA DA GUARDARE ARRIVA SPUNTATA: tre franchigie diventano tre massimali', PAGINA,
    (s) => s.replace("(x.id && !x.daGuardare ? ' checked' : '')", "(x.id ? ' checked' : '')")],

  ['non arriva spuntato niente: trenta righe da spuntare a mano, spuntate alla cieca', PAGINA,
    (s) => s.replace("(x.id && !x.daGuardare ? ' checked' : '')", "''")],

  ['la riga da guardare non si distingue: la classe non si mette piu\'', PAGINA,
    (s) => s.replace("'<label class=\"ppp-r' + (x.daGuardare ? ' ppp-r-avv' : '') + '\">'",
      "'<label class=\"ppp-r\">'")],

  ['la riga da guardare non si distingue: la regola di stile e\' rinominata', PAGINA,
    (s) => s.replace('.ppp-r-avv{border-color:#ffd8a8;background:#fffaf4}',
      '.ppp-r-avvisata{border-color:#ffd8a8;background:#fffaf4}')],

  ['l\'avviso non dice perche\' la riga va guardata', PAGINA,
    (s) => s.replace("            (x.daGuardare ? '<em>' + esc(x.daGuardare) + '</em>' : '') +\n", '')],

  ['l\'elenco delle proposte non si vede', PAGINA,
    (s) => s.replace('.ppp-r{display:flex;gap:9px;align-items:flex-start;border:1px solid var(--line);',
      '.ppp-r{display:none;gap:9px;align-items:flex-start;border:1px solid var(--line);')],

  /* ── quello che la schermata dichiara ───────────────────────────────────── */
  ['la schermata non dice piu\' che sono proposte da controllare', PAGINA,
    (s) => s.replace("      '<div class=\"ppp-nota\">Queste sono <b>proposte</b>, non una lettura: spunta quelle giuste e ' +\n" +
      "        'controlla gli importi sul documento. Ogni riga dice da che pagina viene.</div>' +\n", '')],

  ['quello che si e\' lasciato fuori non si conta piu\'', PAGINA,
    (s) => s.replace("        (r.scartate.length ? ' · ' + r.scartate.length + ' lasciate fuori' : '') + '</div>' +",
      "        '</div>' +")],

  ['quante pagine si sono lette non si dice', PAGINA,
    (s) => s.replace("      '<div class=\"ppg-conto\">' + r.righe.length + ' righe trovate in ' + r.pagine +\n        ' pagine · ' + r.riconosciute + ' riconosciute' +",
      "      '<div class=\"ppg-conto\">' + r.righe.length + ' righe trovate · ' + r.riconosciute + ' riconosciute' +")],

  ['un documento in cui non si trova niente mostra il vuoto invece di dirlo', PAGINA,
    (s) => s.replace("    if (!r.ok) { box.innerHTML = '<div class=\"ppg-vuoto\">' + esc(r.motivo) + '</div>'; return; }",
      '    if (!r.ok) { return; }')],

  /* ── le righe spuntate ──────────────────────────────────────────────────── */
  ['si aggiungono TUTTE le righe, anche quelle non spuntate', PAGINA,
    (s) => s.replace('    .filter(c => c.checked).map(c => PP_PROPOSTE.righe[Number(c.dataset.i)]).filter(Boolean);',
      '    .map(c => PP_PROPOSTE.righe[Number(c.dataset.i)]).filter(Boolean);')],

  ['le righe scelte arrivano in un formato che la guida non legge', PAGINA,
    (s) => s.replace('  LetturaProposta.versoDescrizioni(scelte).forEach(t => ppDescAggiungi(t));',
      '  scelte.forEach(s => ppDescAggiungi(s.nome));')],

  /* ── il lettore di PDF: le righe dalle coordinate ───────────────────────── */
  ['le righe non si ricostruiscono piu\': i pezzi del PDF si incollano di fila', PDFT,
    (s) => s.replace('      var y = Math.round((it.transform && it.transform[5]) || 0);', '      var y = 0;')],

  ['le colonne restano nell\'ordine in cui il PDF le butta fuori', PDFT,
    (s) => s.replace('      return perAltezza[y].sort(function (a, b) { return a.x - b.x; })',
      '      return perAltezza[y]')],

  ['il foglio si legge dal basso verso l\'alto', PDFT,
    (s) => s.replace('    altezze.sort(function (a, b) { return b - a; });',
      '    altezze.sort(function (a, b) { return a - b; });')],

  ['le righe vuote del PDF restano, e sminuzzano il documento', PDFT,
    (s) => s.replace("    }).filter(Boolean);", '    });')],

  ['la pagina non usa piu\' il motore: si ritrova senza lettore di PDF', PAGINA,
    (s) => s.replace('<script src="tariffe/motore/pdf-testo.js?v=20261002"></script>\n', '')],

  /* ── il documento che esce dal browser ──────────────────────────────────── */
  ['il documento parte verso un servizio esterno', PAGINA,
    (s) => s.replace("  box.innerHTML = '<div class=\"ppg-vuoto\">Leggo «' + esc(file.name) + '»…</div>';",
      "  box.innerHTML = '<div class=\"ppg-vuoto\">Leggo «' + esc(file.name) + '»…</div>';\n" +
      "  if (!file) fetch('/riassumi', { method: 'POST' });")],

  ['il documento si impacchetta per essere caricato', PAGINA,
    (s) => s.replace("  box.innerHTML = '<div class=\"ppg-vuoto\">Leggo «' + esc(file.name) + '»…</div>';",
      "  box.innerHTML = '<div class=\"ppg-vuoto\">Leggo «' + esc(file.name) + '»…</div>';\n" +
      '  const corpo = new FormData(); corpo.append(\'f\', file);')],
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

    /* Il guasto ha rotto la sintassi della pagina: tutte le prove sono rosse
       per lo stesso motivo, e di quella che ci interessava non si sa niente. */
    if (/non esegue il suo script/.test(uscita)) {
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
