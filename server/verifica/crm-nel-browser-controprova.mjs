/* Controprova di crm-nel-browser.test.mjs.
   Sabota la SCHERMATA dei filtri — non il motore, che ha la sua controprova —
   e pretende che la suite diventi rossa.

   Il motore può restare giustissimo e la schermata non chiedergli niente: un
   campo che esiste e non viene letto, un elenco a scelta multipla che «Azzera»
   non svuota, una spia che non compare. Nessuna di queste cose dà errore, e
   tutte e tre producono una lista plausibile che parte verso delle persone.

   Ogni guasto resta JavaScript VALIDO: uno che non compila spegne tutto lo
   script e la suite diventa rossa senza che nessuna prova abbia guardato
   niente.

   La pagina viene sempre rimessa com'era, anche se qualcosa esplode.

       node server/verifica/crm-nel-browser-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const PAGINA = join(QUI, '..', '..', 'index.html')
const MENU = join(QUI, '..', '..', 'iam', 'withus-one.js')
const TEST = join(QUI, 'crm-nel-browser.test.mjs')
const BUONA = readFileSync(PAGINA, 'utf8')
const MENU_BUONO = readFileSync(MENU, 'utf8')

const GUASTI = [
  ['il campo «escludi i clienti di» sparisce dal pannello',
    (s) => s.replace("    + caCampo('Escludi i clienti di', 'intermediario_id',", "    + '' + ((x) => '')(")],

  ['il campo c\'è ma la ricerca non lo legge: si esclude e non si esclude',
    (s) => s.replace("    senzaCollaboratori: caScelti('ca-escludi-collab'),", '')],

  ['la casa di proprietà non viene letta dalla ricerca',
    (s) => s.replace("    casaProprieta: tri(g('ca-casa')),", '')],

  ['il prodotto preciso non viene letto dalla ricerca',
    (s) => s.replace("    prodotti: g('ca-prodotto') ? [g('ca-prodotto')] : [],", '')],

  ['«ma NON il prodotto» non viene letto dalla ricerca',
    (s) => s.replace("    senzaProdotti: g('ca-senza-prodotto') ? [g('ca-senza-prodotto')] : [],", '')],

  ['si può escludere un collaboratore solo per volta',
    (s) => s.replace(`'<select id="ca-escludi-collab" multiple size="3" style="' + st + ';height:auto">'`,
      `'<select id="ca-escludi-collab" size="3" style="' + st + ';height:auto">'`)],

  ['i valori scelti non si leggono più: l\'elenco esce sempre vuoto',
    (s) => s.replace('  return [...e.selectedOptions].map(o => o.value).filter(Boolean);', '  return [];')],

  ['si leggono TUTTE le voci, non quelle scelte',
    (s) => s.replace('  return [...e.selectedOptions].map(o => o.value).filter(Boolean);',
      '  return [...e.options].map(o => o.value).filter(Boolean);')],

  ['«Azzera» smette di svuotare le esclusioni',
    (s) => s.replace("  if (esc2 && esc2.selectedOptions) [...esc2.options].forEach(o => { o.selected = false; });", '')],

  ['i collaboratori si mostrano col codice invece che col nome',
    (s) => s.replace('    .map(id => ({ id, nome: nomiCollab[id] || id }))', '    .map(id => ({ id, nome: id }))')],

  ['nel campo «escludi» finiscono i nomi al posto degli identificativi',
    (s) => s.replace("    .map(c => '<option value=\"' + esc(c.id) + '\">' + esc(c.nome) + '</option>').join('');",
      "    .map(c => '<option value=\"' + esc(c.nome) + '\">' + esc(c.nome) + '</option>').join('');")],

  ['l\'elenco dei prodotti torna a essere quello delle famiglie',
    (s) => s.replace("    .map(p => String(p.prodotto || p.modulo || '').trim()).filter(Boolean))].sort();",
      '    .map(p => canonR(p.modulo || p.prodotto)).filter(Boolean))].sort();')],

  ['«mai risposto» non si dichiara più: sembra solo un campo quasi vuoto',
    (s) => s.replace('  if (c.maiRisposto) {', '  if (false) {')],

  ['«mai risposto» si dichiara sempre, anche sui campi che hanno risposte',
    (s) => s.replace('  if (c.maiRisposto) {', '  if (true) {')],

  ['la pagina carica un motore del CRM che non conosce i filtri nuovi',
    (s) => s.replace("<script src=\"tariffe/motore/crm-analisi.js", "<script src=\"tariffe/motore/crm-analisi-vecchio.js")],
]

/* I guasti sul MENU di IAM: un file diverso, quindi un elenco a parte. Una
   schermata che non si trova vale come una schermata che non c'è. */
const GUASTI_MENU = [
  ['la voce CRM sparisce dal menu di IAM',
    (s) => s.replace("        { l: 'CRM · liste e filtri', i: 'i-search',", "        // { l: 'CRM · liste e filtri', i: 'i-search',").replace(
      "go: function () { aprireQuoto('crm-analisi', { menu: 'marketing', titolo: ['CRM · liste e filtri', 'Marketing'] }); } },",
      "")],

  ['la voce CRM apre la pagina sbagliata',
    (s) => s.replace("aprireQuoto('crm-analisi', { menu: 'marketing'", "aprireQuoto('campagne', { menu: 'marketing'")],

  ['la voce CRM non accende il menu Marketing: la briciola dice un posto falso',
    (s) => s.replace("aprireQuoto('crm-analisi', { menu: 'marketing'", "aprireQuoto('crm-analisi', { menu: 'quoto'")],
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
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
    writeFileSync(file, buono)
  }
}

try {
  giro(GUASTI, PAGINA, BUONA, 'la pagina')
  giro(GUASTI_MENU, MENU, MENU_BUONO, 'il menu di IAM')
} finally {
  writeFileSync(PAGINA, BUONA)
  writeFileSync(MENU, MENU_BUONO)
}

const rimessa = readFileSync(PAGINA, 'utf8') === BUONA && readFileSync(MENU, 'utf8') === MENU_BUONO
const quanti = GUASTI.length + GUASTI_MENU.length
console.log(`\npagina e menu rimessi a posto: ${rimessa ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${quanti}/${quanti} guasti presi`)
process.exit(sfuggiti || !rimessa ? 1 : 0)
