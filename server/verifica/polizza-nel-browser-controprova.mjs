/* Controprova di polizza-nel-browser.test.mjs.
   Sabota il DISEGNO della scheda della polizza — non il motore delle
   garanzie, che ha la sua controprova — e pretende che la suite diventi rossa.

   Il motore può restare giustissimo e la scheda mostrare i codici in
   maiuscolo, far sparire una colonna che ha valori, tacere che le garanzie
   non sommano al premio, o riaprire il pannello stretto. Nessuna prova in
   Node se ne accorgerebbe, perché in Node il disegno non esiste.

   Ogni guasto resta JavaScript (o CSS) VALIDO: un guasto che non compila
   spegne tutto lo script e la suite diventa rossa senza che nessuna prova
   abbia guardato niente.

   La pagina viene sempre rimessa com'era, anche se qualcosa esplode.

       node server/verifica/polizza-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const PAGINA = join(QUI, '..', '..', 'index.html')
const TEST = join(QUI, 'polizza-nel-browser.test.mjs')
const BUONA = readFileSync(PAGINA, 'utf8')

const GUASTI = [
  ['il motore delle garanzie non viene più caricato',
    (s) => s.replace('tariffe/motore/garanzie.js?v=20260928', 'tariffe/motore/garanzie-che-non-esiste.js')],

  ['la scheda torna a leggere le garanzie da sé, senza motore',
    (s) => s.replace('const garSch = window.Garanzie ? window.Garanzie.scheda(p) : null;',
      'const garSch = null;')],

  ['il nome della garanzia torna a essere il codice grezzo',
    (s) => s.replace('<td>${esc(g.nome)}${', '<td>${esc(g.codice || g.nome)}${')],

  ['il codice della compagnia sparisce da sotto il nome',
    (s) => s.replace("g.codice && g.codice !== g.nome ? `<div class=\"cl-sub\">${esc(g.codice)}</div>` : ''",
      "false ? '' : ''")],

  ['le colonne diventano fisse: anche quelle vuote su tutte le righe',
    (s) => s.replace("  const cols = sch.colonne.filter(c => c !== 'bene');",
      "  const cols = ['netto', 'imponibile', 'tasse', 'ssn', 'massimale', 'franchigia'];")],

  ['il bene finisce in colonna e spezza la tabella',
    (s) => s.replace("  const cols = sch.colonne.filter(c => c !== 'bene');", '  const cols = sch.colonne.slice();')],

  ['un massimale di zero diventa un trattino',
    (s) => s.replace('  const cella = (g, c) => g[c] == null ? ', '  const cella = (g, c) => !g[c] ? ')],

  ['la riga del totale non somma più niente',
    (s) => s.replace("${cols.map(c => `<td class=\"soldi\">${sch.totali[c] != null ? pfEuro(sch.totali[c]) : ''}</td>`).join('')}",
      "${cols.map(() => '<td></td>').join('')}")],

  ['il totale del lordo sparisce',
    (s) => s.replace("<td class=\"soldi\"><b>${sch.totali.lordo != null ? pfEuro(sch.totali.lordo) : '—'}</b></td></tr>",
      "<td class=\"soldi\"><b></b></td></tr>")],

  ['la scheda non dice più se le garanzie sommano al premio',
    (s) => s.replace('    ${riga}\n', '    ${\'\'}\n')],

  ['una differenza di novanta euro non si tinge di rosso',
    (s) => s.replace("  const esitoCls = q.esito === 'quadra' ? 'ok' : (q.esito === 'non_quadra' ? 'ko' : '');",
      "  const esitoCls = q.esito === 'quadra' ? 'ok' : '';")],

  ['«non si può dire» viene tinto come una risposta',
    (s) => s.replace("  const esitoCls = q.esito === 'quadra' ? 'ok' : (q.esito === 'non_quadra' ? 'ko' : '');",
      "  const esitoCls = q.esito === 'non_quadra' ? 'ko' : 'ok';")],

  ['senza motore la sezione delle garanzie resta vuota',
    (s) => s.replace('  if (!sch) {\n    const g = grezze || [];', '  if (!sch) {\n    const g = [];')],

  ['il ripiego non dichiara più di essere un ripiego',
    (s) => s.replace("+ '</tbody></table><div class=\"cl-sub\">Il motore delle garanzie non è caricato: qui c\\'è solo l\\'elenco, senza il dettaglio.</div>'",
      "+ '</tbody></table>'")],

  ['il bene si ripete su tutte le righe anche quando è uno solo',
    (s) => s.replace('  const mostraBene = beni.length > 1;', '  const mostraBene = beni.length > 0;')],

  ['con due veicoli non si capisce più quale RCA è quale',
    (s) => s.replace('  const mostraBene = beni.length > 1;', '  const mostraBene = false;')],

  ['la scomposizione del premio torna invisibile',
    (s) => s.replace("  metti('Netto', eur(ssf.netto != null ? ssf.netto : dati.premio_netto));", '')],

  ['il dettaglio del contratto mostra i trattini al posto dei buchi',
    (s) => s.replace("    if (val == null || val === '' || val === '—') return;",
      "    if (val == null) val = '—';")],

  ['la scadenza originale si ripete anche quando è identica',
    (s) => s.replace("  metti('Scadenza originale', ssf.scadenza_originale && ssf.scadenza_originale !== p.data_scadenza\n    ? polData(ssf.scadenza_originale) : null);",
      "  metti('Scadenza originale', ssf.scadenza_originale ? polData(ssf.scadenza_originale) : null);")],

  ['il motivo dello storno non accompagna più la data di annullamento',
    (s) => s.replace("    ssf.motivo_storno ? 'motivo: ' + ssf.motivo_storno : '');", "    '');")],

  ['la polizza sostituita non si ritrova più su HDI',
    (s) => s.replace("  metti('Sostituisce', esc(dati.sostituisce_numero || ssf.sostituisce_numero || ''));",
      "  metti('Sostituisce', esc(ssf.sostituisce_numero || ''));")],

  /* L'ancora va presa con la riga che segue: `if (!righe.length) return '';`
     da solo compare tre volte nella pagina, e `replace` avrebbe sabotato la
     prima — cioè un'altra funzione, lasciando questa intatta. Una prova
     «presa» su un guasto messo altrove non misura niente. */
  ['una sezione vuota si disegna lo stesso',
    (s) => s.replace("  if (!righe.length) return '';\n  return '<div class=\"flu-sez\">Dettaglio del contratto",
      "  return '<div class=\"flu-sez\">Dettaglio del contratto")],

  ['la scheda della polizza torna a aprirsi stretta',
    (s) => s.replace("polPannello('Polizza', 'Carico…', '<div class=\"empty-state\">Carico…</div>', true);",
      "polPannello('Polizza', 'Carico…', '<div class=\"empty-state\">Carico…</div>');")],

  ['la classe che allarga non arriva più sulla cornice',
    (s) => s.replace("`<div id=\"pol-ov\" class=\"pdoc-ov${largo ? ' pdoc-largo' : ''}\"",
      "`<div id=\"pol-ov\" class=\"pdoc-ov\"")],

  ['la regola che allarga è scritta con un selettore che non prende',
    /* CSS valido, e non allarga niente: è esattamente il guasto che in Node
       non si vede, perché in Node non c'è un foglio di stile. */
    (s) => s.replace('.pdoc-ov.pdoc-largo .pdoc-box{max-width:1480px;max-height:94vh}',
      '.pdoc-ov .pdoc-box.pdoc-largo{max-width:1480px;max-height:94vh}')],

  ['anche il pannello del pagamento si allarga',
    (s) => s.replace("`<div id=\"pol-ov\" class=\"pdoc-ov${largo ? ' pdoc-largo' : ''}\"",
      "`<div id=\"pol-ov\" class=\"pdoc-ov pdoc-largo\"")],
]

let sfuggiti = 0
try {
  for (const [desc, muta] of GUASTI) {
    const rotta = muta(BUONA)
    if (rotta === BUONA) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — la pagina non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(PAGINA, rotta)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
  }
} finally {
  writeFileSync(PAGINA, BUONA)
}

const rimessa = readFileSync(PAGINA, 'utf8') === BUONA
console.log(`\npagina rimessa a posto: ${rimessa ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessa ? 1 : 0)
