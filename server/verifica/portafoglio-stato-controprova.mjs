/* Controprova di portafoglio-stato.test.mjs.
   Sabota il motore nei modi in cui potrebbe davvero rompersi — e sono quasi
   tutti modi che NON danno errore: danno un portafoglio credibile e falso.
   Ogni guasto deve far diventare rossa la suite. Una prova che resta verde col
   guasto dentro non è una prova: è una frase.

   Il motore viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/portafoglio-stato-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const MOT = join(QUI, '..', '..', 'tariffe', 'motore', 'portafoglio-stato.js')
/* DUE suite, non una. `portafoglio-stato` prova le regole sui casi che ho
   scelto io; `portafoglio-forme-vere` le prova sulla distribuzione vera dei
   2.547 clienti. Un guasto può sfuggire alla prima e farsi prendere dalla
   seconda (o il contrario), e sapere QUALE delle due lo prende dice se la
   copertura sta nei casi limite o nei numeri veri. */
const TEST = [join(QUI, 'portafoglio-stato.test.mjs'), join(QUI, 'portafoglio-forme-vere.test.mjs')]
const BUONO = readFileSync(MOT, 'utf8')

const GUASTI = [
  /* ── i 34 casi veri: annullata e in data ─────────────────────────────── */
  ['«attiva» torna a voler dire soltanto «in data» (le 34 annullate rientrano)',
    (s) => s.replace("    if (annullata(p)) {\n      var da = dataAnnullamento(p);", "    if (false) {\n      var da = dataAnnullamento(p);")],

  ['l\'annullamento si riconosce solo al femminile',
    (s) => s.replace("return st === 'annullata' || st === 'annullato';", "return st === 'annullata';")],

  ['lo stato si guarda senza togliere maiuscole e punteggiatura',
    (s) => s.replace("var st = chiave((p || {}).stato_pagamento);", "var st = (p || {}).stato_pagamento;")],

  /* ── la data della perdita ───────────────────────────────────────────── */
  ['per un\'annullata si prende la scadenza invece dell\'annullamento',
    (s) => s.replace("      return dataAnnullamento(p) || giorno(p.data_scadenza) || og;", "      return giorno(p.data_scadenza) || dataAnnullamento(p) || og;")],

  ['l\'annullamento dell\'SSF non si legge più (resta solo la radice)',
    (s) => s.replace("        || giorno((d.ssf || {}).data_annullamento)\n", "")],

  ['una data di ripiego viene spacciata per certa',
    (s) => s.replace('dataStimata: !da,', 'dataStimata: false,')],

  ['la perdita si data alla PRIMA copertura finita, non all\'ultima',
    (s) => s.replace("var persoIl = giorni.length ? giorni.sort()[giorni.length - 1] : null;", "var persoIl = giorni.length ? giorni.sort()[0] : null;")],

  /* ── i 58 che non sono persi ─────────────────────────────────────────── */
  ['chi non ha mai avuto una polizza diventa un cliente perso',
    (s) => s.replace("      return { stato: 'mai_avuto', perso: false,", "      return { stato: 'perso', perso: true,")],

  ['un dato mancante rimette il cliente in rosso',
    (s) => s.replace("    if (dubbie.length) {", "    if (false) {")],

  ['una polizza senza scadenza torna a contare come attiva',
    (s) => s.replace("      return { attiva: false, motivo: 'senza_scadenza',", "      return { attiva: true, motivo: 'senza_scadenza',")],

  /* ── QR contro QF: la distinzione che regge il filtro ────────────────── */
  ['una rata di frazionamento non incassata diventa un mancato rinnovo',
    (s) => s.replace("          if (s !== 'QR') return;", "          if (s !== 'QR' && s !== 'QF') return;")],

  ['«non lo so» diventa «no»: senza i titoli risponde `false`',
    (s) => s.replace("    var nonRinnovato = null, qrViste = 0;", "    var nonRinnovato = false, qrViste = 0;")],

  ['una quietanza incassata conta come non rinnovata',
    (s) => s.replace("          if (chiave(t.stato) !== 'incassato') nonRinnovato = true;", "          nonRinnovato = true;")],

  ['la sigla della compagnia non si guarda più',
    (s) => s.replace("var s = sigla(t.sigla_tipo || t.tipo_compagnia || t.tipo);", "var s = sigla(t.sigla_tipo || t.tipo);")],

  /* ── come l'abbiamo perso ────────────────────────────────────────────── */
  ['una disdetta a metà annualità passa per mancato rinnovo',
    (s) => s.replace("      motivoPerdita = ultime.some(function (x) { return x.s.motivo === 'scaduta'; })\n        ? 'non_rinnovata' : 'annullata';", "      motivoPerdita = 'non_rinnovata';")],

  ['un mancato rinnovo passa per disdetta',
    (s) => s.replace("      motivoPerdita = ultime.some(function (x) { return x.s.motivo === 'scaduta'; })\n        ? 'non_rinnovata' : 'annullata';", "      motivoPerdita = 'annullata';")],

  ['il motivo lo dà la prima polizza finita invece dell\'ultima',
    (s) => s.replace("var ultime = stati.filter(function (x) { return x.s.finitaIl && x.s.finitaIl === persoIl; });", "var ultime = stati.filter(function (x) { return !!x.s.finitaIl; });")],

  ['la quietanza di rinnovo non incassata non conta più da sola',
    (s) => s.replace("var persoAlRinnovo = nonRinnovato === true || motivoPerdita === 'non_rinnovata';", "var persoAlRinnovo = motivoPerdita === 'non_rinnovata';")],

  ['anche un cliente vivo risulta perso al rinnovo',
    (s) => s.replace("      etichetta: vive.length === 1 ? '1 polizza attiva' : vive.length + ' polizze attive' };", "      persoAlRinnovo: true, motivoPerdita: 'non_rinnovata',\n               etichetta: vive.length === 1 ? '1 polizza attiva' : vive.length + ' polizze attive' };")],

  /* ── le sigle ────────────────────────────────────────────────────────── */
  ['una sigla sconosciuta viene indovinata invece di tacere',
    (s) => s.replace("        || (TIPI[compatta.toUpperCase()] ? compatta.toUpperCase() : null);", "        || 'NP';")],

  ['NP e SO si confondono perché finiscono nello stesso tipo',
    (s) => s.replace("    so: 'SO', sostituzione: 'SO',", "    so: 'NP', sostituzione: 'NP',")],

  ['una sigla mappa su un valore che il database rifiuta',
    (s) => s.replace("QF: { sigla: 'QF', nome: 'Quietanza di frazionamento', tipo: 'rata'     },", "QF: { sigla: 'QF', nome: 'Quietanza di frazionamento', tipo: 'frazionamento' },")],

  /* ── le date e i due mucchi ──────────────────────────────────────────── */
  ['l\'ultimo giorno di copertura si perde (scadenza = oggi spegne)',
    (s) => s.replace("    if (sc >= og) return { attiva: true,", "    if (sc > og) return { attiva: true,")],

  ['il giudizio guarda «pagata fino al»: 45 clienti attivi diventano persi',
    (s) => s.replace("    var sc = giorno(p.data_scadenza);\n    if (!sc) {", "    var sc = giorno(p.copertura_al) || giorno(p.data_scadenza);\n    if (!sc) {")],

  ['qualunque testo vale come data',
    (s) => s.replace("    var m = /^(\\d{4}-\\d{2}-\\d{2})/.exec(testo(v));\n    return m ? m[1] : null;", "    return testo(v) || null;")],

  ['le attive si ordinano dalla scadenza più lontana',
    (s) => s.replace("att.sort(function (a, b) { return testo(a.data_scadenza).localeCompare(testo(b.data_scadenza)); });", "att.sort(function (a, b) { return testo(b.data_scadenza).localeCompare(testo(a.data_scadenza)); });")],

  ['le non attive si ordinano dalla più vecchia',
    (s) => s.replace("non.sort(function (a, b) { return testo(b._stato.finitaIl || b.data_scadenza).localeCompare(testo(a._stato.finitaIl || a.data_scadenza)); });", "non.sort(function (a, b) { return testo(a._stato.finitaIl || a.data_scadenza).localeCompare(testo(b._stato.finitaIl || b.data_scadenza)); });")],

  ['dividere scrive dentro le polizze del chiamante',
    (s) => s.replace("(s.attiva ? att : non).push(Object.assign({}, p, { _stato: s }));", "(s.attiva ? att : non).push(Object.assign(p, { _stato: s }));")],

  ['una polizza attiva non basta più: contano tutte',
    (s) => s.replace("    if (vive.length) {", "    if (vive.length === l.length) {")],
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
    const preso = [], quali = []
    for (const t of TEST) {
      let rosso = false, uscita = ''
      try { uscita = execFileSync('node', [t], { encoding: 'utf8' }) }
      catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
      if (rosso) {
        preso.push(t.split('/').pop().replace('.test.mjs', ''))
        ;(uscita.match(/❌ [^\n]+/g) || []).slice(0, 2)
          .forEach((s) => quali.push(s.slice(2).split('  —')[0].trim()))
      }
    }
    console.log(`${preso.length ? '✅ preso' : '❌ NON PRESO'}: ${desc}${preso.length ? '   [' + preso.join(' + ') + ']' : ''}`)
    quali.slice(0, 2).forEach((q) => console.log(`        rossa: ${q}`))
    if (!preso.length) sfuggiti++
  }
} finally {
  writeFileSync(MOT, BUONO)
}

const rimesso = readFileSync(MOT, 'utf8') === BUONO
console.log(`\nmotore rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
