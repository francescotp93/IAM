/* Controprova di confronto.test.mjs.

   I guasti qui dentro non sono casuali: sono i modi in cui un confronto fra
   prodotti assicurativi MENTE, e mente in modo convincente.

   Il più grave è il primo: trattare «il documento non lo dice» come «non ce
   l'ha». Un motore così dà torto alla concorrenza ogni volta che il suo set
   informativo è scritto male — e il risultato lo si mostra a un cliente.

   Ogni guasto resta JavaScript VALIDO: uno che non compila spegne il motore e
   la suite diventa rossa senza che nessuna prova abbia guardato niente.

   Il motore viene sempre rimesso com'era, anche se qualcosa esplode.

       node server/verifica/confronto-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const MOTORE = join(RADICE, 'tariffe', 'motore', 'confronto.js')
const TEST = join(QUI, 'confronto.test.mjs')
const BUONO = readFileSync(MOTORE, 'utf8')

const GUASTI = [
  ['«non letto» diventa «assente»: si dà torto a chi scrive male il documento',
    (s) => s.replace(
      "    if (!g) return { stato: 'non_letto', massimale: null, franchigia: null, scoperto: null, fonte: null };",
      "    if (!g) return { stato: 'assente', massimale: null, franchigia: null, scoperto: null, fonte: null };")],

  ['il verso si pronuncia anche quando uno dei due non è stato letto',
    (s) => s.replace("    if (a.stato === 'non_letto' || b.stato === 'non_letto') return null;", '')],

  ['un massimale dichiarato batte un massimale non dichiarato',
    (s) => s.replace('    } else if (a.massimale != null || b.massimale != null) {\n      return null;\n    }',
      "    } else if (a.massimale != null) { return 'a'; } else if (b.massimale != null) { return 'b'; }")],

  ['una franchigia dichiarata batte una non dichiarata',
    (s) => s.replace('    } else if (a.franchigia != null || b.franchigia != null) {\n      return null;\n    }',
      "    } else if (a.franchigia != null) { return 'a'; } else if (b.franchigia != null) { return 'b'; }")],

  ['la franchigia più ALTA diventa quella migliore',
    (s) => s.replace("      if (a.franchigia < b.franchigia) return 'a';\n      if (b.franchigia < a.franchigia) return 'b';",
      "      if (a.franchigia > b.franchigia) return 'a';\n      if (b.franchigia > a.franchigia) return 'b';")],

  ['il punteggio proclama un vincitore anche con due garanzie lette su quindici',
    (s) => s.replace('           : su * 2 < c.righe.length ? null\n', '')],

  ['il punteggio divide per tutte, comprese quelle che non ha letto',
    /* Il guasto più subdolo: i numeri tornano, e fingono una lettura che non
       c'è stata. */
    (s) => s.replace('      if (!r.confrontabile || r.verso === null) { nonConf++; return; }',
      "      if (!r.confrontabile || r.verso === null) { pari++; return; }")],

  ['le garanzie fuori vocabolario si buttano via in silenzio',
    (s) => s.replace('      if (!id || !garanziaDi(ramo, id)) { fuori.push(g); return; }',
      '      if (!id || !garanziaDi(ramo, id)) { return; }')],

  ['una garanzia sconosciuta si fa passare per la prima del vocabolario',
    (s) => s.replace('    if (!cand.length) return null;', '    if (!cand.length) return lista[0].id;')],

  ['fra due sinonimi vince il più corto: «furto e incendio» diventa «furto»',
    (s) => s.replace('    cand.sort(function (a, b) { return a.da - b.da || b.lung - a.lung || a.ramo - b.ramo; });',
      '    cand.sort(function (a, b) { return a.da - b.da || a.lung - b.lung || a.ramo - b.ramo; });')],

  ['un documento vuoto torna un DIP vuoto invece di un errore',
    (s) => s.replace(
      "    if (!t) return { ok: false, motivo: 'Il documento è vuoto: non c\\'è niente da leggere.', sezioni: {}, trovate: [] };",
      "    if (!t) return { ok: true, motivo: null, sezioni: {}, trovate: [], mancanti: [] };")],

  ['le sezioni del DIP si tagliano tutte alla fine del documento',
    /* Ogni sezione contiene anche tutte quelle dopo: le quattro domande
       risultano «trovate» e il contenuto è sbagliato. */
    (s) => s.replace('      var fine = i + 1 < tagli.length ? tagli[i + 1].da : t.length;', '      var fine = t.length;')],

  ['due prodotti di rami diversi si confrontano lo stesso',
    (s) => s.replace("    if (chiave(pb && pb.ramo) !== chiave(ramo)) {", '    if (false) {')],

  ['la fonte non arriva più sulla riga: niente documento, niente pagina',
    (s) => s.replace('      fonte: fonteDi(p, g)', '      fonte: null')],

  ['la pagina sparisce dalla fonte',
    (s) => s.replace('      pagina: g && g.pagina != null ? g.pagina : null,', '      pagina: null,')],

  ['il documento torna a venire dal prodotto: tutte le righe citano lo stesso foglio',
    /* Il difetto vero trovato il 01/10/2026 dalla prova nel browser. */
    (s) => s.replace(
      "      documento: testo(g && g.documento) || testo(p.documento) || null,\n      edizione: testo(g && g.edizione) || testo(p.edizione) || null,",
      '      documento: testo(p.documento) || null,\n      edizione: testo(p.edizione) || null,')],

  ['il documento del prodotto non fa più da ripiego quando la garanzia tace',
    (s) => s.replace(
      "      documento: testo(g && g.documento) || testo(p.documento) || null,\n      edizione: testo(g && g.edizione) || testo(p.edizione) || null,",
      '      documento: testo(g && g.documento) || null,\n      edizione: testo(g && g.edizione) || null,')],

  ['due righe sulla stessa garanzia: l\'ultima sovrascrive sempre',
    (s) => s.replace("      if (pre && statoDi(pre) === 'presente' && statoDi(g) !== 'presente') return;", '')],
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
    writeFileSync(MOTORE, rotto)
    let rosso = false, uscita = ''
    try { uscita = execFileSync('node', [TEST], { encoding: 'utf8' }) }
    catch (e) { rosso = true; uscita = (e.stdout || '') + (e.stderr || '') }
    writeFileSync(MOTORE, BUONO)
    console.log(`${rosso ? '✅ preso' : '❌ NON PRESO'}: ${desc}`)
    ;(uscita.match(/ {2}X {3}[^\n]+/g) || []).slice(0, 2)
      .forEach((s) => console.log(`        rossa: ${s.trim().replace(/^X\s+/, '')}`))
    if (!rosso) sfuggiti++
  }
} finally {
  writeFileSync(MOTORE, BUONO)
}

const rimesso = readFileSync(MOTORE, 'utf8') === BUONO
console.log(`\nmotore rimesso a posto: ${rimesso ? 'sì' : 'NO — GUARDARE SUBITO'}`)
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli lì` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimesso ? 1 : 0)
