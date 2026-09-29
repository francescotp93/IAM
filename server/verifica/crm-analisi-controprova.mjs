/* Controprova di crm-analisi.test.mjs.
   Sabota il motore che sceglie CHI riceve una comunicazione commerciale e
   pretende che la suite diventi rossa.

   Perché questo motore più di altri: sbagliare qui non produce un errore.
   Produce una lista plausibile — duemila righe, tutte con nome e cognome — che
   parte verso persone che non l'avevano chiesta, o verso i clienti di un
   collaboratore che aveva detto di no. Il guasto si vede settimane dopo, e da
   fuori.

   Ogni guasto resta JavaScript VALIDO: uno che non compila spegne il modulo e
   la suite diventa rossa senza che nessuna prova abbia guardato niente.

   Il motore viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/crm-analisi-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const MOT = join(QUI, '..', '..', 'tariffe', 'motore', 'crm-analisi.js')
const TEST = join(QUI, 'crm-analisi.test.mjs')
const BUONO = readFileSync(MOT, 'utf8')

const GUASTI = [
  // ── l'esclusione dei collaboratori ────────────────────────────────────────
  ['i clienti di un collaboratore escluso finiscono lo stesso in lista',
    (s) => s.replace("      if ((f.senzaCollaboratori || []).length) {\n        if ((f.senzaCollaboratori || []).map(testo).indexOf(testo(r.intermediario_id)) >= 0) return false;\n      }", '')],

  ['l\'esclusione viene applicata al contrario: restano SOLO i suoi',
    (s) => s.replace("        if ((f.senzaCollaboratori || []).map(testo).indexOf(testo(r.intermediario_id)) >= 0) return false;",
      "        if ((f.senzaCollaboratori || []).map(testo).indexOf(testo(r.intermediario_id)) < 0) return false;")],

  ['l\'inclusione vince sull\'esclusione: nel dubbio si manda',
    (s) => s.replace("      if ((f.senzaCollaboratori || []).length) {",
      "      if ((f.senzaCollaboratori || []).length && !(f.collaboratori || []).length) {")],

  ['si può tenere un collaboratore solo, non più d\'uno',
    (s) => s.replace("        if ((f.collaboratori || []).map(testo).indexOf(testo(r.intermediario_id)) < 0) return false;",
      "        if (testo((f.collaboratori || [])[0]) !== testo(r.intermediario_id)) return false;")],

  ['chi non è cliente di nessuno viene escluso insieme agli altri',
    (s) => s.replace("        if ((f.senzaCollaboratori || []).map(testo).indexOf(testo(r.intermediario_id)) >= 0) return false;",
      "        if (!testo(r.intermediario_id) || (f.senzaCollaboratori || []).map(testo).indexOf(testo(r.intermediario_id)) >= 0) return false;")],

  // ── la casa di proprietà, e la casella mai risposta ───────────────────────
  ['il filtro sulla casa di proprietà smette di filtrare',
    (s) => s.replace('      if (f.casaProprieta != null && tri(r.casa_proprieta) !== f.casaProprieta) return false;', '')],

  ['«non si sa» viene contato come un «no»',
    (s) => s.replace('      if (f.casaProprieta != null && tri(r.casa_proprieta) !== f.casaProprieta) return false;',
      '      if (f.casaProprieta != null && (r.casa_proprieta === true) !== f.casaProprieta) return false;')],

  ['una colonna tutta uguale non viene più dichiarata',
    (s) => s.replace('    return { unicoValore: quanti === 1 && (righe || []).length > 1, valori: visti };',
      '    return { unicoValore: false, valori: visti };')],

  ['e viene dichiarata anche quando le risposte sono due',
    (s) => s.replace('    return { unicoValore: quanti === 1 && (righe || []).length > 1, valori: visti };',
      '    return { unicoValore: true, valori: visti };')],

  ['i «no» della casa tornano a contare come risposte date',
    (s) => s.replace("    { k: 'casa_proprieta',        e: 'Casa di proprietà',   pieno: function (r) { return r.casa_proprieta === true; },",
      "    { k: 'casa_proprieta',        e: 'Casa di proprietà',   pieno: function (r) { return r.casa_proprieta != null; },")],

  ['la casella «mai risposto» guarda la colonna sbagliata',
    /* `sposato_solo` non è il nome di nessuna colonna: leggendo `k` invece di
       `col` si misura un campo che non esiste, e risulta «tutto vuoto» —
       cioè «mai risposto» su qualunque archivio. */
    (s) => s.replace('      var u = c.booleana ? vuotaMaPiena(righe, c.col || c.k) : null;',
      '      var u = c.booleana ? vuotaMaPiena(righe, c.k) : null;')],

  // ── il prodotto preciso ───────────────────────────────────────────────────
  ['il filtro sul prodotto non filtra più niente',
    (s) => s.replace('      if (prodotti.length) {', '      if (false) {')],

  ['il prodotto si confronta lettera per lettera, maiuscole comprese',
    (s) => s.replace('    var prodotti = (f.prodotti || []).map(chiave).filter(Boolean);',
      "    var prodotti = (f.prodotti || []).map(function (x) { return String(x || ''); }).filter(Boolean);")],

  ['«senza quel prodotto» non toglie più nessuno',
    (s) => s.replace('      if (senzaProdotti.length) {', '      if (false) {')],

  ['il prodotto viene ricondotto alla famiglia: «Auto HDI» prende tutte le auto',
    (s) => s.replace('    var prodotti = (f.prodotti || []).map(chiave).filter(Boolean);',
      '    var prodotti = (f.prodotti || []).map(function (x) { return chiave(ramoCanonico(x)); }).filter(Boolean);')],
]

let sfuggiti = 0
try {
  for (const [desc, muta] of GUASTI) {
    const rotto = muta(BUONO)
    if (rotto === BUONO) {
      console.log(`⚠️  SENTINELLA PERSA: «${desc}» — il motore non contiene più quello che cercavo`)
      sfuggiti++
      continue
    }
    writeFileSync(MOT, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/❌ [^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.slice(2).split('  —')[0].trim()}`))
    if (!rosso) sfuggiti++
  }
} finally {
  writeFileSync(MOT, BUONO)
}

const rimesso = readFileSync(MOT, 'utf8') === BUONO
console.log(`\nmotore rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
