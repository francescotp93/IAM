// ═══════════════════════════════════════════════════════════════════════════════
//  PREMI DA RECUPERARE — la schermata  (22/09/2026, Contabilità · Fase 3)
//
//  I sospesi: i premi messi a copertura e non ancora ricevuti. Le regole stanno
//  nel motore condiviso e hanno le loro prove in
//  `server/verifica/contabilita.test.mjs`. Qui si sorveglia che la schermata e
//  le funzioni del database:
//
//    · non chiudano la rata all'APERTURA. È la decisione che regge tutta la
//      fase: «a copertura» vuol dire che la compagnia è a posto, non che il
//      cliente ha pagato. Chiudendola, la provvigione maturerebbe su un premio
//      mai ricevuto (§17, decisione 1);
//    · la chiudano quando il credito arriva a zero, e la riaprano allo storno;
//    · non facciano incrociare le due strade: una rata a copertura non si
//      incassa dalla Fase 2, e una rata incassata non si mette a copertura —
//      altrimenti il debito verso la compagnia nasce due volte;
//    · non scrivano niente per conto loro: una strada sola, la transazione;
//    · paginhino: PostgREST manda mille righe per richiesta, e un residuo
//      calcolato su metà dei recuperi fa chiedere dei soldi a chi li ha già
//      dati.
//
//  Queste prove leggono il SORGENTE: IAM non si apre in un browser nel banco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');

const MIGR = path.join(RADICE, 'supabase', 'migrations');
/* L'ULTIMA migrazione che definisce quella funzione, non la prima: leggere la
   prima vorrebbe dire sorvegliare il mondo di ieri il giorno in cui una
   correzione la sposta in un altro file (§55). */
function sqlChe(nome) {
  const f = fs.readdirSync(MIGR).filter(x => x.endsWith('.sql')).sort()
    .filter(x => fs.readFileSync(path.join(MIGR, x), 'utf8').includes('function public.' + nome + '('));
  if (!f.length) throw new Error('nessuna migrazione definisce ' + nome);
  const src = fs.readFileSync(path.join(MIGR, f[f.length - 1]), 'utf8');
  /* SOLO il corpo di QUELLA funzione. Letto il file intero, una prova che
     cerca «questa funzione non tocca le rate» trova la riga di un'ALTRA
     funzione scritta accanto e dichiara rotto un codice giusto: è la trappola
     di §34, dove la prova guardava il blocco invece della chiamata. */
  const i = src.indexOf('create or replace function public.' + nome + '(');
  if (i < 0) throw new Error('non trovo il corpo di ' + nome);
  const j = src.indexOf('end $$;', i);
  return src.slice(i, j < 0 ? src.length : j + 7);
}
/* Solo le righe di codice: un commento che NOMINA quello che sta vietando fa
   diventare rossa una prova su un codice giusto (§10, §12, §18, §26, §29). */
const soloSql = s => s.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
const soloJs = s => s.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('/* ═══════════ PREMI DA RECUPERARE — Contabilità · Fase 3');
  deve(i >= 0, 'non trovo il blocco rec* in iam/index.html');
  const fine = H.indexOf('/* ═══════════ INCASSA UNA RATA', i);
  deve(fine > i, 'non trovo la fine del blocco rec*');
  return H.slice(i, fine);
}

prova('la schermata esiste, è raggiungibile e ha il suo inizializzatore', () => {
  deve(/id="ctab-recuperi"/.test(H), 'manca la linguetta');
  deve(/id="contab-panel-recuperi"/.test(H), 'manca il pannello');
  deve(/'incassa','recuperi'/.test(H), 'la sotto-scheda non è nell\'elenco che accende i pannelli');
  deve(/if \(sub==='recuperi'\) recApri\(\)/.test(H),
    'nessuno riempie il pannello: la linguetta aprirebbe un riquadro vuoto (§6b)');
  deve(/const contabSub = \[[^\]]*'recuperi'/.test(H), 'la sotto-scheda non è fra quelle che l\'indirizzo sa aprire');
  /* E la linguetta «Sospesi» che legge l'Excel della compagnia RESTA: una
     schermata in uso non si spegne perché ne è nata una migliore, si spegne
     quando i suoi numeri sono stati confrontati (§17, §33). */
  deve(/id="ctab-sospesi"/.test(H), 'la linguetta «Sospesi» è stata spenta prima di confrontare i numeri');
  return 'linguetta, pannello, inizializzatore, e «Sospesi» resta';
});

prova('L\'APERTURA NON CHIUDE LA RATA, il recupero finale sì, lo storno la riapre', () => {
  const ap = soloSql(sqlChe('iam_credito_apri'));
  /* La riga che NON dev'esserci: nessuna chiusura della rata all'apertura. */
  deve(!/update\s+public\.quote_titoli/i.test(ap),
    'l\'apertura tocca la rata: «a copertura» diventerebbe «incassata», e la provvigione maturerebbe su un premio mai ricevuto');
  const re = soloSql(sqlChe('iam_credito_recupera'));
  deve(/if v_chiude then/.test(re) && /stato = 'incassato'/.test(re),
    'il recupero non chiude mai la rata: la provvigione non maturerebbe nemmeno quando il cliente paga');
  deve(/and stato = 'aperto'/.test(re) && /get diagnostics v_n = row_count/.test(re),
    'chiude la rata senza guardare che fosse aperta, e zero righe non è un errore (BUG 1, §47)');
  const st = soloSql(sqlChe('iam_credito_storna'));
  deve(/stato = 'aperto'/.test(st) && /incassato_il = null/.test(st),
    'lo storno lascia la rata chiusa: direbbe che quel premio è entrato');
  return 'apertura non tocca la rata, recupero finale la chiude, storno la riapre';
});

prova('le due strade non si incrociano: il debito verso la compagnia nasce una volta', () => {
  const ap = soloSql(sqlChe('iam_credito_apri'));
  deve(/iam_incassi_rate[\s\S]{0,200}attiva/.test(ap),
    'si mette a copertura una rata già incassata: il premio è entrato, il debito nascerebbe due volte');
  deve(/iam_crediti_premio[\s\S]{0,120}attivo/.test(ap), 'una rata può avere due sospesi aperti');
  const inc = soloSql(sqlChe('iam_incasso_registra'));
  deve(/iam_incasso_rate_libere/.test(inc),
    'la Fase 2 incassa una rata a copertura: il debito verso la compagnia nascerebbe due volte');
  const lib = soloSql(sqlChe('iam_incasso_rate_libere'));
  deve(/RECUPERO/.test(sqlChe('iam_incasso_rate_libere')),
    'il rifiuto non dice che cosa fare invece (registrare un recupero)');
  deve(/attivo/.test(lib), 'il controllo non guarda solo i sospesi vivi');
  return 'nei due versi, e il rifiuto dice che cosa fare';
});

prova('il recupero riduce i SOSPESI e non ricrea il debito verso la compagnia', () => {
  const re = soloSql(sqlChe('iam_credito_recupera'));
  deve(/conto_sospeso_id[\s\S]{0,200}avere/.test(re),
    'nessuno controlla che l\'Avere del recupero riduca il conto dei sospesi di questo credito');
  deve(/Il recupero non riduce il conto dei sospesi/.test(sqlChe('iam_credito_recupera')),
    'il rifiuto non si legge');
  /* Più del residuo non passa, e il residuo si ricalcola con la riga bloccata:
     leggerlo dalla schermata vorrebbe dire fidarsi di un numero letto
     mezz'ora fa. */
  deve(/for update/.test(re), 'il residuo si ricalcola senza bloccare la riga: due recuperi insieme lo portano sotto zero');
  deve(/if v_imp > v_res then/.test(re), 'si recupera più del residuo');
  return 'Avere sui sospesi, riga bloccata, oltre il residuo no';
});

prova('lo storno rovescia anche i recuperi, e il motivo è obbligatorio', () => {
  const st = soloSql(sqlChe('iam_credito_storna'));
  deve(/for v_r in select \* from public\.iam_crediti_recuperi/.test(st),
    'lo storno non rovescia i recuperi: resterebbero a registro dei Dare cassa senza l\'apertura che li giustifica');
  deve(/storno_di_movimento_id/.test(st), 'i movimenti inversi non puntano agli originali');
  deve(/attivo = false/.test(st), 'i recuperi stornati restano vivi e il residuo resta sbagliato');
  deve(/Uno storno senza motivo/.test(sqlChe('iam_credito_storna')), 'si storna senza dire perché');
  return 'recuperi rovesciati uno per uno, motivo obbligatorio';
});

prova('la schermata NON scrive da sé, e le regole le chiede al motore', () => {
  const b = soloJs(blocco());
  for (const t of ['quote_titoli', 'iam_movimenti', 'iam_movimenti_righe', 'iam_crediti_premio', 'iam_crediti_recuperi']) {
    const scrive = new RegExp("from\\('" + t + "'\\)[^;]*\\.(insert|update|upsert|delete)\\(").test(b);
    deve(!scrive, 'la schermata scrive su ' + t + ' per conto suo: sono due strade per lo stesso fatto');
  }
  for (const f of ['iam_credito_apri', 'iam_credito_recupera', 'iam_credito_storna']) {
    deve(new RegExp("rpc\\('" + f + "'").test(b), 'non chiama ' + f);
  }
  for (const f of ['righeApertura', 'righeRecupero', 'residuoCredito', 'scadenzarioCrediti']) {
    deve(new RegExp('Contabilita\\.' + f + '\\(').test(b), 'non chiede al motore: ' + f);
  }
  deve(!/dare:\s*\d/.test(b) && !/avere:\s*\d/.test(b), 'ci sono righe Dare/Avere scritte a mano nella schermata');
  return 'nessuna scrittura diretta, tre transazioni, quattro regole dal motore';
});

prova('si pagina, e «non si è potuto leggere» non è «non c\'è niente»', () => {
  const b = blocco();
  /* Si cerca la CHIAMATA con la parentesi, non il nome: rinominata la
     funzione in `recPaginaVia`, una prova che cerca «function recPagina»
     resta verde — l'ha detto la controprova, non la rilettura (§19). E si
     pretende che sia chiamata DUE volte, una per i sospesi e una per i
     recuperi: paginare solo la prima delle due lascia il residuo calcolato
     su metà dei recuperi, che è il verso peggiore dell'errore. */
  deve(/function recPagina\(/.test(b),
    'i sospesi e i recuperi si leggono in una richiesta sola: PostgREST ne manda mille, e un residuo calcolato su metà dei recuperi fa chiedere soldi a chi li ha già dati (§50, §53)');
  const usi = (b.match(/await recPagina\(/g) || []).length;
  deve(usi >= 2, 'si pagina una lettura sola: ne servono due, i sospesi e i recuperi (trovate ' + usi + ')');
  deve(/\.range\(/.test(b), 'la paginazione non usa range');
  deve(/function recLeggi/.test(b), 'le letture stanno in una Promise.all che cade tutta insieme (§35)');
  const quante = (b.match(/non si è potuto legger/gi) || []).length;
  deve(quante >= 2, 'le letture che cadono non si dichiarano: trovate ' + quante);
  deve(/I numeri qui sotto sono parziali/.test(b),
    'con una lettura caduta i totali si mostrano come se fossero completi');
  return 'paginato a mille, guasti dichiarati, totali dichiarati parziali';
});

prova('si dice che cosa manca PRIMA di far compilare, e non si inventa', () => {
  const b = blocco();
  deve(/function recPronti/.test(b), 'manca il controllo di che cosa serve');
  for (const p of ['Apertura di un sospeso', 'conto dei sospesi', 'debito verso la compagnia']) {
    deve(b.includes(p), 'non dice che manca: ' + p);
  }
  deve(/non se ne inventa uno/.test(b), 'non dichiara che non si inventa il conto (§8.1)');
  return 'causali, conto dei sospesi, conto di debito';
});

prova('il credito verso un COLLABORATORE non si rifà qui', () => {
  /* Esiste dal 19/09: le rate che ha incassato e non ha rimesso
     (`EstrattoConto.creditoAgenzia`, §24). Rifarlo sarebbe il secondo archivio
     dello stesso fatto, e il giorno in cui uno dei due si chiude i due elenchi
     direbbero numeri diversi sulla stessa persona. */
  const ap = sqlChe('iam_credito_apri');
  deve(/v_tipo <> 'cliente'/.test(soloSql(ap)), 'si apre un sospeso verso un collaboratore');
  deve(/estratto conto/i.test(ap), 'il rifiuto non dice dove sta già quel credito');
  return 'rifiutato, e dice dove sta già';
});

prova('lo scadenzario mette in cima quello da chiamare, non quello morto', () => {
  const b = blocco();
  deve(/in ritardo/.test(b), 'non si vede chi è oltre la data attesa');
  deve(/Da recuperare/.test(b) && /Oltre la data prevista/.test(b), 'mancano i due numeri che contano');
  /* E il filtro parte dai vivi: un elenco che si apre su tutto, con dentro i
     chiusi, è una lista di lavoro che non si legge. */
  deve(/<option value="vivi"[^>]*>/.test(H), 'il filtro non parte dagli aperti e parziali');
  return 'due totali, il ritardo, e si apre sui vivi';
});

console.log('\n══ PREMI DA RECUPERARE (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPREMI DA RECUPERARE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
