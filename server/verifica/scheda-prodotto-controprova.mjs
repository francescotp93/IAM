/* Controprova di scheda-prodotto.test.mjs.

   I guasti qui dentro non sono inventati: sono le SEI REGOLE che cinque
   letture indipendenti del set informativo vero avevano proposto, e che la
   verifica adversariale ha smentito una per una. Applicate alla lettera,
   dicevano «NON COMPRESA» su garanzie che quel prodotto vende.

   Rimetterle dentro una per una e guardare se le prove se ne accorgono è il
   solo modo di sapere che la correzione è difesa e non solo scritta.

   Il guasto peggiore dell'elenco è il primo: basta togliere un «return» e il
   motore comincia a scrivere 'assente' da solo.

   Ogni guasto resta JavaScript VALIDO, e i file si rimettono sempre a posto.

       node server/verifica/scheda-prodotto-controprova.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const RADICE = join(QUI, '..', '..')
const SP = join(RADICE, 'tariffe', 'motore', 'scheda-prodotto.js')
const VOCAB = join(RADICE, 'tariffe', 'motore', 'confronto.js')
const GUIDA = join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js')
const TEST = join(QUI, 'scheda-prodotto.test.mjs')

const BUONI = { [SP]: readFileSync(SP, 'utf8'), [VOCAB]: readFileSync(VOCAB, 'utf8'),
  [GUIDA]: readFileSync(GUIDA, 'utf8') }

const GUASTI = [
  /* ── LE REGOLE SMENTITE DALLA VERIFICA, RIMESSE DENTRO ─────────────────── */
  ['IL MOTORE COMINCIA A SCRIVERE «assente» DA SOLO', SP,
    (s) => s.replace("          perche: 'il documento non la nomina in nessuna intestazione né in nessun elenco di garanzie' };",
      "          perche: 'il documento non la nomina' , stato2: 1 };")
      .replace("        return { garanzia: g.id, nome: g.nome, nome_documento: null, stato: 'non_letto',",
        "        return { garanzia: g.id, nome: g.nome, nome_documento: null, stato: 'assente',")],

  /* I due guasti qui sotto non possono far scrivere 'assente' — il motore non
     ha una strada per arrivarci, ed è il suo pregio. Quello che possono fare,
     ed è il danno vero, è far risultare NON LETTA una garanzia che il
     documento vende: nel confronto quella riga diventa un buco, e un buco
     contro un concorrente che pubblica il suo massimale è una sconfitta
     regalata. */
  ['«Non previste» fa saltare il blocco: cristalli risulta non letta su un prodotto che li vende', SP,
    (s) => s.replace("        if (!titolo && /\\(opzional/i.test(t) && t.length < 200) { titolo = titoloIntero(linee, i); forma = 'blocco'; }",
      "        if (!titolo && /\\(opzional/i.test(t) && t.length < 200 && !/non previste/i.test((linee[i + 6] || '') + (linee[i + 7] || ''))) { titolo = titoloIntero(linee, i); forma = 'blocco'; }")],

  ['una condizione di operatività fa sparire i guasti dai ladri', SP,
    (s) => s.replace("          if (rg && rg.esatto) { titolo = nudoG; forma = 'garanzia'; }",
      "          if (rg && rg.esatto && !/non attiva|non operante/i.test(pulisci(linee[i + 1] || ''))) { titolo = nudoG; forma = 'garanzia'; }")],

  ['la garanzia obbligatoria non la costituisce più il titolo: la RCA risulta non letta', SP,
    (s) => s.replace('    var obblig = (C.VOCABOLARIO[ramo] || []).filter(function (g) { return g.obbligatoria; });',
      '    var obblig = [];')],

  ['l\'elenco si legge troppo corto: l\'ultimo nome — Rinuncia alla rivalsa — si perde', SP,
    (s) => s.replace('    for (var k = 1; k <= 4 && i + k < linee.length; k++) {',
      '    for (var k = 1; k <= 2 && i + k < linee.length; k++) {')],

  ['l\'elenco non si legge affatto, perché «Garanzia X» gli ruba la riga', SP,
    (s) => s.replace("        if (R_APRE_ELENCO.test(t)) { finoA = leggiElenco(C, ramo, linee, i, t, num, trovati); return; }", '')],

  /* ── L'ESATTEZZA, CIOÈ KASKO CONTRO COLLISIONE ─────────────────────────── */
  ['si sceglie la prima costituzione che capita invece della più esatta', SP,
    (s) => s.replace('      if (!!b2.esatto !== !!a.esatto) return !!b2.esatto;\n', '')],

  ['«Collisione con veicoli identificati» torna a essere una kasko qualunque', VOCAB,
    (s) => s.replace("      { id: 'collisione_identificati', nome: 'Collisione con veicoli identificati',\n        sin: ['collisione con veicoli identificati', 'collisione con veicolo identificato',\n              'collisione con altri veicoli identificati', 'urto con veicolo identificato'] },", '')],

  ['la guida non spiega più la differenza fra kasko e collisione con identificati', GUIDA,
    (s) => s.replace("    collisione_identificati: {\n      sezione: 'auto',", "    collisione_identificati_vecchio: {\n      sezione: 'auto',")],

  /* ── I NUMERI ───────────────────────────────────────────────────────────── */
  ['un importo in una frase condizionata diventa il numero della garanzia', SP,
    (s) => s.replace('        if (!tabella && R_CONDIZIONE.test(t)) {', '        if (false) {')],

  ['una tabella di franchigie per area diventa un massimale', SP,
    (s) => s.replace('        if (tabella) {\n', '        if (false) {\n')],

  ['la tabella appiattita non si dichiara più', SP,
    (s) => s.replace("            voce.daGuardare = 'la riga porta ' + letta.voci.length + ' importi e l\\'intestazione sopra ripete «'\n              + tabella + '»: sul documento è una tabella, e qui è diventata una riga sola';",
      '            voce.daGuardare = null;')],

  ['i numeri si prendono anche dalle pagine che non appartengono a nessun fascicolo', SP,
    (s) => s.replace('      if (pagineBuone && num != null && pagineBuone.indexOf(num) < 0) return;', '')],

  ['l\'importo si attribuisce per vicinanza, non per ancora esplicita', SP,
    (s) => s.replace('        var ancora = ric && ric.esatto ? ric.id : null;', '        var ancora = ric ? ric.id : null;')],

  ['una garanzia non letta esce con dei numeri addosso', SP,
    (s) => s.replace('          massimale: nonLetto ? null : g.massimale,', '          massimale: g.massimale,')],

  /* ── I FASCICOLI E LE PAGINE ORFANE ─────────────────────────────────────── */
  ['il piè di pagina si cerca solo in coda: il fascicolo che lo stampa in testa si perde', SP,
    (s) => s.replace('      if (nt > nc) { r.piede = r.testa; r.fam = ft; }\n      else { r.piede = r.coda; r.fam = fc; }',
      '      r.piede = r.coda; r.fam = fc;')],

  ['le pagine orfane non si dichiarano più', SP,
    (s) => s.replace("      avv.push('Pagine che non appartengono a nessun fascicolo riconosciuto: '", "      avv.push(''")],

  ['una copertina lontana diventa un piè di pagina', SP,
    (s) => s.replace('      if (prima || dopo) conta[r.fam] = (conta[r.fam] || 0) + 1;',
      '      conta[r.fam] = (conta[r.fam] || 0) + 1;')],

  /* ── IL RUMORE, CIOÈ L'ELENCO CHE NESSUNO GUARDA ───────────────────────── */
  ['ogni articolo delle condizioni generali diventa una copertura non riconosciuta', SP,
    (s) => s.replace("          if (m && /garanzi[ae]/i.test(m[3] || '') && testo(m[4]).length > 2 && t.length < 160) {",
      '          if (m && testo(m[4]).length > 2 && t.length < 160) {')],

  ['la prosa del contratto torna a costituire una garanzia', SP,
    (s) => s.replace('          if (rg && rg.esatto) { titolo = nudoG; forma = \'garanzia\'; }',
      '          if (rg) { titolo = nudoG; forma = \'garanzia\'; }')],

  ['il glossario torna a vendere le garanzie che definisce', SP,
    (s) => s.replace('        if (cieca) return;', '        if (false) return;')],

  ['la copertura che il vocabolario non conosce sparisce in silenzio', SP,
    (s) => s.replace('        } else if (forma !== \'garanzia\' && nudo.length >= 2 && nudo.length <= 70 && /[a-z]/i.test(nudo)) {',
      '        } else if (false) {')],

  ['la GAP sparisce perché il suo nome ripulito è troppo corto', SP,
    (s) => s.replace("nudo.length >= 2 && nudo.length <= 70", "nudo.length >= 4 && nudo.length <= 70")],

  ['la stessa copertura si conta una volta per fascicolo', SP,
    (s) => s.replace('          if (!fuori.some(function (x) { return x.chiave === k2; })) {',
      '          if (true) {')],

  ['gli importi che non si attribuiscono tornano a sparire in silenzio', SP,
    (s) => s.replace('          nonAttribuiti.push({ pagina: num, riga: t.slice(0, 220),\n            importi: letta.voci.map(function (v) { return v.valore; }) });\n', '')],

  ['l\'elenco degli importi non attribuiti non si taglia più', SP,
    (s) => s.replace('      importiNonAttribuiti: nonAttribuiti.slice(0, 40),', '      importiNonAttribuiti: nonAttribuiti,')],

  ['il conto degli importi non attribuiti si abbassa a quello dell\'elenco tagliato', SP,
    (s) => s.replace('      quantiNonAttribuiti: nonAttribuiti.length,', '      quantiNonAttribuiti: nonAttribuiti.slice(0, 40).length,')],

  ['un importo non attribuito perde la pagina da cui viene', SP,
    (s) => s.replace('          nonAttribuiti.push({ pagina: num, riga: t.slice(0, 220),', '          nonAttribuiti.push({ pagina: null, riga: t.slice(0, 220),')],

  /* NON C'È un guasto per il controllo «una tabella, una garanzia». Quel
     controllo è un filo teso per un difetto FUTURO: oggi i numeri di una
     tabella si attribuiscono per garanzia da righe distinte, e non esiste una
     strada per far ricevere a due garanzie la stessa riga. Un filo che oggi
     non può scattare non si può controprovare, e scrivere un guasto che non
     misura niente sarebbe peggio che non scriverlo: farebbe credere che quel
     controllo sia difeso. Resta nel motore perché costa nulla e perché le
     franchigie per area di due garanzie, su quel documento, sono gli stessi
     tre numeri — se un domani si scambiassero, dai numeri nessuno lo vedrebbe. */

  /* ── IL RAMO, LE RADICI E LE LEGATURE ──────────────────────────────────── */
  ['le radici del ramo tornano col confine di parola in coda, e non trovano niente', SP,
    (s) => s.replace("    ['auto', /\\b(?:r\\.?c\\.?\\s*auto|r\\.?c\\.?a\\.?\\b|auto\\b|autovettur|autocarr|motociclo|veicol|targa|circolazione dei veicoli)/i],",
      "    ['auto', /\\b(?:r\\.?c\\.?\\s*auto|autovettur|autocarr|motociclo|veicol)\\b/i],")],

  ['una scansione passa per un documento senza garanzie', SP,
    (s) => s.replace('    if (!caratteri) {', '    if (false) {')],

  ['una scansione non dice quante pagine ha, cioe\' non si sa che e\' un documento vero', SP,
    (s) => s.replace("      return { ok: false, scansione: true, pagine: (pagine || []).length,",
      '      return { ok: false, scansione: true, pagine: 0,')],

  /* C'era un guasto in piu' qui: «gli spazi di una pagina scansionata passano
     per parole», che toglieva una ripulitura degli spazi dal conteggio dei
     caratteri. Non veniva preso, e aveva ragione lui: `testo()` taglia gia'
     gli spazi ai bordi, quindi quella ripulitura era peso morto e la riga
     che difendeva non esisteva. Togliere il peso morto e' meglio che tenere
     un guasto che non misura niente. */

  ['un ramo si indovina anche quando il documento non lo dice', SP,
    (s) => s.replace("    if (!chiavi.length) return { ramo: null, perche: 'nelle prime pagine non si trova nessuna spia del ramo' };",
      "    if (!chiavi.length) return { ramo: 'auto', perche: null };")],

  ['le legature tipografiche del PDF non si sciolgono più', SP,
    (s) => s.replace("    for (var i = 0; i < LEGATURE.length; i++) t = t.split(LEGATURE[i][0]).join(LEGATURE[i][1]);", '')],

  /* ── QUELLO CHE SI DICHIARA ────────────────────────────────────────────── */
  ['il documento che si dichiara una sintesi non lo fa più sapere', SP,
    (s) => s.replace('    if (sintesi) {', '    if (false) {')],

  ['più edizioni diverse non si dichiarano: se ne lascia indovinare una', SP,
    (s) => s.replace('    if (valori.length > 1) {', '    if (false) {')],

  ['l\'edizione si conta una volta per pagina su cui è stampata', SP,
    (s) => s.replace("        var gia = fuori.some(function (x) { return x.valore === val && x.etichetta === et; });",
      "        var gia = fuori.some(function (x) { return x.valore === val && x.etichetta === m[1].toLowerCase(); });")],

  ['il tipo di documento non lo dicono più i fascicoli', SP,
    (s) => s.replace('      tipo: tipoDocumento(f.fascicoli),', "      tipo: 'set_informativo',")],

  ['due pagine su ottanta tornano a decidere il tipo di tutto il documento', SP,
    (s) => s.replace("    if (pagineTot > 0 && pagineDelTipo * 2 < pagineTot) return 'altro'",
      "    if (false) return 'altro'")],

  /* ── L'IMPORTO ATTACCATO A MANO (08/10/2026) ──────────────────────────────
     In archivio un numero messo da una persona e un numero letto dalla riga si
     somigliano, ma non valgono la stessa cosa il giorno in cui qualcuno li
     ricontrolla. */
  ['un importo attaccato a mano arriva in archivio come se fosse letto dal documento', SP,
    (s) => s.replace("          frase: provaDellImporto(g, nonLetto)", "          frase: g.frase || (nonLetto ? g.perche : null)")],

  ['la nota dice «attaccato a mano» anche quando l\'importo e\' stato buttato', SP,
    (s) => s.replace("    if (nonLetto || !mano || !mano.length) return base;", "    if (!mano || !mano.length) return base;")],

  ['non si dice piu\' da quale pagina viene l\'importo attaccato', SP,
    (s) => s.replace("') dalla pagina '", "')'")],

  /* C'era un guasto in più qui: «le pagine di un fascicolo si sommano invece
     di contarsi», che toglieva il ramo per `pagine` come elenco. Non veniva
     preso, e aveva ragione: l'ampiezza del fascicolo (`da`–`a`) dà lo stesso
     numero, quindi quel ramo era ridondante. Togliere il peso morto è meglio
     che tenere un guasto che non misura niente. */

  /* ── LA SEZIONE OBBLIGATORIA DEL DIP (08/10/2026) ─────────────────────────
     Il guasto peggiore di questo gruppo è il terzo: una sezione che non si
     chiude trasforma in COPERTURE le righe delle esclusioni. Un confronto che
     dice a un cliente che una polizza copre l'acqua quando il documento la
     esclude non è una casella storta: è adeguatezza. */
  ['la domanda «Che cosa e assicurato?» torna invisibile (l\'apostrofo)', SP,
    (s) => s.replace("    /^che cosa (non )?e'? assicurato/i,", "    /^che cosa (non )?e' assicurato/i,")
      .replace("var R_ASSICURATO = /^che cosa e'? assicurato/i", "var R_ASSICURATO = /^che cosa e' assicurato/i")],

  ['le coperture elencate sotto la domanda non si leggono piu\'', SP,
    (s) => s.replace('        if (assicuratoDa != null && MARCATORI.test(t)) {', '        if (false) {')],

  ['LA SEZIONE NON SI CHIUDE: LE ESCLUSIONI DIVENTANO COPERTURE', SP,
    (s) => s.replace('          if (etichetta(t)) { assicuratoDa = null; return; }', '          if (etichetta(t)) { return; }')
      .replace('          if (MARCATORI_NO.test(t)) { assicuratoDa = null; return; }',
        '          if (MARCATORI_NO.test(t)) { return; }')],

  ['il nome della voce si porta dietro la descrizione (i due punti)', SP,
    (s) => s.replace('    if (i > 3) s = s.slice(0, i);', '    if (i > 999) s = s.slice(0, i);')],

  ['il nome della voce si porta dietro la condizione fra parentesi', SP,
    (s) => s.replace('      if (j > 3) s = s.slice(0, j);', '      if (j > 999) s = s.slice(0, j);')],

  /* ATTENZIONE AL GUASTO DEBOLE: la prima versione di questo guasto toglieva
     solo gli ultimi cinque verbi dell'elenco e lasciava dentro «copre», che è
     proprio quello che la prova usa. Risultava NON PRESO, e sembrava una prova
     debole: era un guasto che non rompeva niente. Qui si tolgono i primi, che
     sono quelli che i documenti usano. */
  ['il nome non si taglia davanti al verbo della descrizione', SP,
    (s) => s.replace('(copre|coprono|copertura|prevede|prevedono|', '(mai_un_verbo|')],

  ['nell\'elenco delle coperture sconosciute tornano a finire le frasi', SP,
    (s) => s.replace('    if (s.split(/\\s+/).length > 8) return false;',
      '    if (s.split(/\\s+/).length > 99) return false;')],

  ['una copertura sconosciuta elencata sotto la domanda sparisce invece di dichiararsi', SP,
    (s) => s.replace("                fuori.push({ chiave: kv, nome: vo, pagina: num, riga: t.slice(0, 220), forma: 'dip' });",
      '                void kv;')],

  ['la sezione non si apre piu\': la riga finisce nel filtro delle etichette', SP,
    (s) => s.replace('        if (R_ASSICURATO.test(pianura(t))) { assicuratoDa = num; return; }', '')],

  /* ── L'ELENCO LETTO IN DUE MODI (08/10/2026) ──────────────────────────────
     Il primo guasto è quello vero: era il comportamento di prima, e perdeva
     il furto su tre documenti Groupama. */
  ['l\'elenco si legge solo tutto incollato: un elenco pulito si perde', SP,
    (s) => s.replace("    prese.forEach(function (l) { voci = voci.concat(l.split(/[,;()\\.:]+/)); });", '')],

  ['l\'elenco si legge solo riga per riga: un nome a cavallo di due righe si perde', SP,
    (s) => s.replace('    var voci = pezzo.split(/[,;()\\.:]+/);', '    var voci = [];')],

  ['l\'elenco non guarda piu\' le righe dopo la prima', SP,
    (s) => s.replace('for (var k = 1; k <= 4 && i + k < linee.length; k++)',
      'for (var k = 1; k <= 0 && i + k < linee.length; k++)')],
]

let sfuggiti = 0
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
    /* Un guasto che rompe la sintassi fa fallire tutto per un motivo solo, e
       di quello che ci interessava non si sa niente. */
    if (/SyntaxError|Unexpected (token|identifier)/.test(uscita)) {
      console.log(`⚠️  GUASTO MUTO (sintassi rotta): ${desc}`)
      sfuggiti++
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
console.log(sfuggiti ? `${sfuggiti} guasti sfuggiti: le prove sono deboli li'` : `${GUASTI.length}/${GUASTI.length} guasti presi`)
process.exit(sfuggiti || !rimessi ? 1 : 0)
