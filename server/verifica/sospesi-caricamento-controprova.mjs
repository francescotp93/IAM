/* Controprova di sospesi-caricamento-nel-browser.test.mjs.

   Rimette, uno alla volta, i guasti che la schermata dei Sospesi può avere —
   il blocco storico che resta aperto a vuoto, il caricamento che torna a
   essere una riga di testo, la rotella che non gira — e pretende che la suite
   diventi rossa.

   Sono tutti guasti di DISEGNO: HTML e CSS validi, nessun errore in console,
   e in Node non se ne accorgerebbe nessuno. Sono proprio quelli che hanno
   fatto arrivare la lagnanza.

   La pagina viene sempre rimessa com'era, anche se qualcosa esplode.

       node server/verifica/sospesi-caricamento-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const PAGINA = join(QUI, '..', '..', 'iam', 'index.html')
const TEST = join(QUI, 'sospesi-caricamento-nel-browser.test.mjs')
const BUONA = readFileSync(PAGINA, 'utf8')

const GUASTI = [
  ['il blocco storico torna a stare aperto appena si entra',
    (s) => s.replace('<div id="spr-storico" style="display:none">', '<div id="spr-storico">')],

  ['il contenitore sparisce: le scritte tornano sparse nella pagina',
    (s) => s.replace('<div id="spr-storico" style="display:none">', '<div>')],

  ['il blocco si apre anche quando da file non c\'è niente',
    (s) => s.replace('  if (!sosp.length) return;\n  const st = document.getElementById(\'spr-storico\');\n  if (st) st.style.display = \'block\';',
      '  const st = document.getElementById(\'spr-storico\');\n  if (st) st.style.display = \'block\';\n  if (!sosp.length) return;')],

  ['il blocco non si apre più nemmeno quando i sospesi da file ci sono',
    (s) => s.replace('  const st = document.getElementById(\'spr-storico\');\n  if (st) st.style.display = \'block\';\n  loadTeam();',
      '  loadTeam();')],

  ['il caricamento torna a essere una riga di testo, senza rotella',
    (s) => s.replace('<section id="spr-lista" style="padding:0 16px"><div class="cl-carico"><span class="cl-carico-g"></span>Carico i sospesi…</div></section>',
      '<section id="spr-lista" style="padding:0 16px"><div class="cl-sub">Carico i sospesi…</div></section>')],

  ['resta la riga ma sparisce la rotella',
    (s) => s.replace('<div class="cl-carico"><span class="cl-carico-g"></span>Carico i sospesi…</div></section>',
      '<div class="cl-carico">Carico i sospesi…</div></section>')],

  ['il caricamento non dice più che cosa sta caricando',
    (s) => s.replace('<span class="cl-carico-g"></span>Carico i sospesi…</div></section>',
      '<span class="cl-carico-g"></span>Un momento…</div></section>')],

  ['la rotella resta ferma: l\'animazione non le arriva',
    (s) => s.replace('  animation:clCarico .7s linear infinite}', '  animation:none}')],

  ['la rotella diventa un quadratino',
    (s) => s.replace('.cl-carico-g{width:14px;height:14px;flex:0 0 14px;border-radius:50%;',
      '.cl-carico-g{width:14px;height:14px;flex:0 0 14px;border-radius:0;')],

  ['la regola della rotella è scritta con un selettore che non prende',
    /* CSS valido: nessun errore, e la rotella resta della misura che decide
       il browser per uno <span> vuoto, cioè zero. */
    (s) => s.replace('.cl-carico-g{width:14px;', '.cl-carico .cl-carico-gg{width:14px;')],
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
    writeFileSync(PAGINA, BUONA)
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
