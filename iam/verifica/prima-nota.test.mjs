// ═══════════════════════════════════════════════════════════════════════════════
//  PRIMA NOTA E QUADRATURA DEI CONTI — il pannello  (20/09/2026, brief #02 M3)
//
//  L'aritmetica sta nel motore condiviso `tariffe/motore/contabilita.js` e ha
//  le sue 21 prove in `server/verifica/contabilita.test.mjs`. Qui si sorveglia
//  che la schermata:
//
//    · non CANCELLI mai un movimento. È la cosa che, rompendosi, non si vede:
//      una riga sparita lascia un buco che nessuno sa più spiegare, e in un
//      registro di denaro «non c'è» e «è stato tolto» sono due cose diverse;
//    · non chieda il SEGNO all'utente — l'importo è positivo e il verso lo dice
//      la causale;
//    · non proponga quello che poi il salvataggio rifiuta (una causale «premi»
//      su un conto aziendale): stessa funzione per la tendina e per il rifiuto;
//    · non dica che un conto quadra quando nessuno l'ha verificato;
//    · sia raggiungibile: una linguetta senza inizializzatore è un riquadro
//      vuoto (§6b).
//
//  Queste prove leggono il SORGENTE: IAM non si apre in un browser nel banco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const SQL = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260920_b02_m3_prima_nota.sql'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('/* ══ PRIMA NOTA E QUADRATURA DEI CONTI (brief #02 · M3');
  deve(i >= 0, 'non trovo il blocco pnt* in iam/index.html');
  const fine = H.indexOf('/* ══ TARIFFE, ACCORDI E GRUPPI', i);
  return H.slice(i, fine < 0 ? H.length : fine);
}

prova('UN MOVIMENTO NON SI CANCELLA: nel blocco non si toglie una riga', () => {
  const b = blocco();
  /* Si cerca la CHIAMATA, non la parola: un commento che nomina il difetto fa
     scattare una prova che cerca la stringa e dichiara rotto un codice giusto.
     È la trappola già presa in §10, §12, §18 e §26 — e ripresa qui, dal
     commento che spiegava proprio questa regola. Quindi si guardano solo le
     righe di codice, e si tolgono soltanto i commenti che cominciano a inizio
     riga (togliere tutto con una regex globale mangia codice vero, §12). */
  const codice = b.split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');
  deve(!/\.delete\(\s*\)/.test(codice), 'da qualche parte nella prima nota si toglie una riga invece di annullarla');
  /* Si annulla, e il motivo è obbligatorio anche di qua — non solo nel check
     del database, perché far fallire un insert è il modo peggiore di dire a
     una persona che manca un campo. */
  deve(/async function pntAnnulla\(/.test(b), 'manca pntAnnulla');
  const f = b.slice(b.indexOf('async function pntAnnulla'), b.indexOf('async function pntRiapri'));
  deve(/if \(!perche\)/.test(f), 'si annulla senza motivo');
  deve(/annullato_il: new Date\(\)\.toISOString\(\)/.test(f) && /annullato_perche: perche/.test(f),
    'l’annullamento non scrive quando e perché');
  /* E si può riaprire: annullare non è cancellare nemmeno per chi ha sbagliato
     ad annullare. */
  deve(/async function pntRiapri\(/.test(b), 'un movimento annullato per sbaglio non si può riaprire');
  /* Il divieto VERO sta nel database: la schermata è una delle strade. */
  deve(/create trigger iam_movimenti_no_delete_trg/.test(SQL), 'il database lascia cancellare un movimento');
  return 'zero delete, annulla col motivo, riapri, e il trigger sotto';
});

prova('il SEGNO non si chiede: lo dice la causale', () => {
  const b = blocco();
  /* Regola 6. Se comparisse un campo «entrata/uscita» accanto all'importo,
     un giorno qualcuno scriverebbe «-50 entrata» e il totale non tornerebbe
     più senza che si veda da dove. */
  deve(!/id="pnt-m-segno"/.test(b), 'la finestra chiede il segno all’utente');
  deve(/L'importo si scrive sempre positivo/.test(b), 'la finestra non spiega perché non chiede il segno');
  /* Il verso lo calcola il motore, non la pagina. */
  deve(/Contabilita\.versoDi\(/.test(b), 'il verso è deciso in pagina invece che dalla causale');
  deve(!/importo\s*[<>]\s*0/.test(b), 'la pagina si fa i conti sul segno dell’importo');
  return 'nessun campo segno, verso dal motore';
});

prova('la tendina propone SOLO quello che il salvataggio accetta', () => {
  const b = blocco();
  /* Due strade separate diventerebbero una schermata che propone una causale
     «premi» su un conto aziendale e poi la rifiuta: la stessa funzione riempie
     e nega. È la regola già scritta per i conti (§26). */
  deve(/Contabilita\.causaliPerConto\(/.test(b), 'la tendina delle causali non passa dal motore');
  deve(/Contabilita\.validaMovimento\(/.test(b), 'il salvataggio non valida col motore');
  deve(/onchange="pntCambiaConto\(\)"/.test(b), 'cambiando conto la tendina delle causali non si aggiorna');
  /* E il motore fa davvero quello che la schermata gli chiede: una causale di
     natura premi non compare sull'elenco di un conto aziendale. */
  const azien = { id: 'k2', nome: 'Agenzia', natura: 'aziendale', attivo: true };
  const cau = C.CAUSALI_INIZIALI.map((c, i) => Object.assign({ id: 'c' + i, attiva: true }, c));
  const ok = C.causaliPerConto(cau, azien).map(c => c.codice);
  deve(!ok.includes('incasso_premi'), 'l’incasso premi è proposto su un conto aziendale');
  deve(ok.includes('affitti') && ok.includes('spese_bancarie'), 'il conto aziendale non propone affitto e spese bancarie');
  return 'una funzione sola per proporre e per rifiutare';
});

prova('«mai verificato» non si mostra come «quadra»', () => {
  const b = blocco();
  /* Regola 7, guardata dal lato della schermata: tre stati e non due. Un conto
     mai verificato in verde è la bugia più comoda che un sistema di
     contabilità possa raccontare. */
  deve(/r\.quadra === true/.test(b) && /r\.quadra === false/.test(b), 'la schermata non distingue i tre stati');
  deve(/mai verificato/.test(b), 'il terzo stato non ha un’etichetta sua');
  deve(/Contabilita\.quadrature\(/.test(b), 'la quadratura è calcolata in pagina');
  /* E le due nature non si sommano in un totale unico: un «totale liquidità»
     che mette insieme i premi dei clienti e i soldi dell'agenzia fa credere
     ricca un'agenzia che ha solo incassato dei premi da rimettere. */
  deve(/Contabilita\.perNatura\(/.test(b), 'i saldi non sono separati per natura');
  deve(!/nat\.premi \+ nat\.aziendale/.test(b), 'le due nature sono sommate in un totale unico');
  return 'tre stati, due nature mai sommate';
});

prova('il cancello dell\'admin esiste ED È CHIAMATO', () => {
  const b = blocco();
  deve(/function pntPuoScrivere\(\)\s*{\s*return PROFILO\?\.ruolo === 'admin'/.test(b), 'manca pntPuoScrivere');
  const usi = (b.match(/pntPuoScrivere\(\)/g) || []).length;
  deve(usi >= 3, 'pntPuoScrivere è chiamata solo ' + usi + ' volte: il cancello è decorativo (§1)');
  deve(/function pntApri\([^)]*\)\s*{\s*\n?\s*if \(!pntPuoScrivere\(\)\) return;/.test(b),
    'la finestra si apre anche a chi non può scrivere');
  /* Il cancello vero è nelle politiche: qui si dice dove sono finiti dei soldi. */
  deve(/create policy movimenti_write[\s\S]{0,160}iam_is_admin\(\)/.test(SQL), 'la prima nota non è chiusa all’admin');
  deve(/create policy quadrature_write[\s\S]{0,160}iam_is_admin\(\)/.test(SQL), 'le quadrature non sono chiuse all’admin');
  return 'bottone + finestra + RLS';
});

prova('le due linguette esistono e hanno il loro inizializzatore', () => {
  /* §6b: una schermata il cui contenuto lo scrive il codice, senza una riga
     che lo avvii, apre un riquadro vuoto. */
  /* La striscia delle linguette non c'è più (22/09/2026): ogni schermata di
     Contabilità è una pagina sua, e si apre dal menu. Quello che questa prova
     voleva garantire non era «il bottone esiste»: era che la schermata fosse
     RAGGIUNGIBILE. Si misura sulla ROTTA, che è la cosa che la apre davvero —
     e la rotta serve anche a chi ci arriva da un collegamento vecchio (§6b). */
  const rotte = H.slice(H.indexOf('function selContabTab'));
  deve(/'primanota'/.test(rotte) && /'quadconti'/.test(rotte), 'mancano le due rotte');
  deve(/id="contab-panel-primanota"/.test(H) && /id="contab-panel-quadconti"/.test(H), 'mancano i due sotto-pannelli');
  /* La sotto-scheda della quadratura dei conti si chiama `quadconti` e non
     `conti` dal 20/09/2026: `conti` è il pannello di Strumenti › Conti e
     causali, e finché i due nomi coincidevano l'elenco qui sotto lo
     intercettava prima — «Conti e causali» apriva la Contabilità e non si
     raggiungeva più. */
  deve(/\['quadratura','primanota','quadconti',/.test(H), 'selContabTab non conosce le due linguette nuove');
  deve(!/\['quadratura','primanota','conti',/.test(H), 'il nome ambiguo è tornato: «Conti e causali» non si aprirebbe più');
  deve(/if \(sub==='primanota' \|\| sub==='quadconti'\) pntCarica\(\);/.test(H), 'le due linguette non caricano niente');
  return 'due linguette, due pannelli, una riga in selContabTab';
});

prova('la ricerca parte al clic, non mentre si digita', () => {
  const b = blocco();
  const pannello = H.slice(H.indexOf('id="contab-panel-primanota"'), H.indexOf('id="contab-panel-quadconti"'));
  /* Brief #01 M2, e vale anche qui: su una lista che può essere lunga, filtrare
     a ogni tasto è un ricalcolo per lettera. */
  deve(!/oninput=/.test(pannello), 'un filtro della prima nota ricalcola mentre si digita');
  deve(!/onchange="pntRender/.test(pannello), 'un filtro della prima nota ricalcola al cambio');
  deve(/onclick="pntRender\(\)"/.test(pannello), 'manca il tasto Cerca');
  deve(/function pntAzzera\(\)/.test(b), 'manca «Azzera filtri»');
  return 'tasto Cerca + azzera, nessun oninput';
});

prova('«non si è potuto leggere» non diventa «non ci sono movimenti»', () => {
  const b = blocco();
  /* §12, §18, §26. Su una contabilità far credere che non ci siano movimenti è
     la cosa peggiore da far credere, perché il saldo che si legge accanto
     sembra confermarlo. */
  deve(/non vuol dire che non ci siano movimenti/.test(b), 'l’errore di lettura si confonde con l’elenco vuoto');
  deve(/class="cnt-err"/.test(b), 'l’errore non si vede');
  /* E il vuoto vero ha un testo suo, che dice anche che cosa vuol dire per i
     saldi: sono ancora quelli iniziali. */
  deve(/Nessun movimento registrato/.test(b), 'l’elenco vuoto non ha un messaggio suo');
  deve(/ancora quelli iniziali/.test(b), 'non dice che cosa significa per i saldi');
  return 'due messaggi diversi per due cose diverse';
});

prova('un movimento che non è stato scritto a mano non si corregge qui', () => {
  const b = blocco();
  /* Quando l'incasso di una rata genererà il suo movimento (M4), correggerlo
     nella prima nota vorrebbe dire che la rata e la prima nota dicono due cose
     diverse — e nessuna delle due saprebbe di essere quella sbagliata. */
  deve(/const auto = m\.origine && m\.origine !== 'manuale'/.test(b), 'la finestra non distingue i movimenti automatici');
  deve(/Si corregge dove è nato, non qui/.test(b), 'non dice dove si corregge');
  deve(/\$\{auto \? 'disabled' : ''\}/.test(b), 'i campi di un movimento automatico restano modificabili');
  /* E il database garantisce che una rata generi un movimento solo. */
  deve(/create unique index if not exists iam_movimenti_titolo_uno/.test(SQL), 'una rata può generare due movimenti');
  return 'campi bloccati, motivo scritto, indice unico sotto';
});

prova('la storia di un movimento sta nel registro unico', () => {
  const b = blocco();
  deve(/logMovimento\('Movimento /.test(b), 'registrare un movimento non lascia traccia');
  deve(/logMovimento\('Movimento annullato'/.test(b), 'annullare non lascia traccia');
  deve(/regInstalla\('pnt-storia', 'movimento'/.test(b), 'la finestra non mostra chi ha fatto che cosa');
  const R = require(path.join(RADICE, 'tariffe', 'motore', 'registro.js'));
  deve(R.VOCI.movimento && R.VOCI.movimento.tabella === 'iam_movimenti', 'il registro non conosce il tipo «movimento»');
  return 'tracce + tipo nel vocabolario';
});

/* ═══ FASE 1 — LA PARTITA DOPPIA (21/09/2026) ═══════════════════════════════ */

const SQL1 = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260922_contab_partita_doppia.sql'), 'utf8')
  .split('\n').filter(r => !/^\s*--/.test(r)).join('\n');

prova('un movimento nuovo nasce a partita doppia: si chiede la CONTROPARTITA', () => {
  const b = blocco();
  /* Non si chiede una griglia Dare/Avere: si chiedono DUE conti, che è una
     domanda a cui chi lavora sa già rispondere. Le due righe le fa il motore. */
  deve(/id="pnt-m-contro"/.test(b), 'il modulo non chiede la contropartita');
  deve(/Contabilita\.righeSemplici\(/.test(b), 'le righe non le fa il motore');
  /* E la schermata non se le inventa: nessuna formula in pagina (§5). */
  deve(!/dare:\s*\w+\s*>\s*0/.test(b), 'c\'è una regola Dare/Avere scritta dentro la schermata');
  /* Su un movimento già registrato la contropartita non si cambia: si storna
     (regola 13), e il campo è spento perché non si prometta il contrario. */
  deve(/id="pnt-m-contro"[^>]*\$\{auto \|\| id \? 'disabled'/.test(b), 'la contropartita si può cambiare su un movimento registrato');
  return 'due conti, due righe dal motore, e niente formule in pagina';
});

prova('testata e righe si scrivono in una transazione sola, non in due richieste', () => {
  const b = blocco();
  /* Due `insert` dalla pagina vorrebbero dire che, cadendo il secondo, resta
     una testata SENZA righe: un movimento che c'è, che si legge, che sembra a
     posto e che non dice da dove viene il denaro (§47). */
  deve(/db\.rpc\('iam_movimento_registra'/.test(b), 'il movimento non passa dalla funzione del database');
  deve(/create or replace function public\.iam_movimento_registra/.test(SQL1), 'la funzione non c\'è nella migrazione');
  /* E la pagina non scrive MAI direttamente nelle righe: sarebbe la seconda
     strada, quella che aggira la transazione. */
  deve(!/from\('iam_movimenti_righe'\)\s*\.\s*insert/.test(b), 'la pagina scrive le righe per conto suo');
  return 'una chiamata, una transazione';
});

prova('le righe Dare/Avere si LEGGONO, e un movimento vecchio lo dichiara', () => {
  const b = blocco();
  deve(/function pntRigheHTML\(/.test(b), 'il dettaglio non mostra le righe');
  deve(/pntRigheHTML\(m\)/.test(b), 'la funzione c\'è e non la chiama nessuno');   /* §1 */
  deve(/Contabilita\.righeDi\(/.test(b), 'le righe non passano dal motore');
  /* Un movimento scritto prima della partita doppia ha un conto solo: la
     contropartita non è persa, non è mai stata scritta. Si dichiara e non si
     inventa (§8.1) — un «Conto compagnia» aggiunto dal programma sarebbe una
     cosa che nessuno ha deciso, e fra sei mesi nessuno saprebbe chi l'ha
     scritta. */
  deve(/r\.derivate/.test(b), 'non si distingue un movimento senza righe da uno con le righe');
  deve(/r\.nota/.test(b), 'non dichiara che la contropartita manca');
  /* E le righe si leggono una volta sola, non una lettura per movimento aperto. */
  deve(/from\('iam_movimenti_righe'\)\.select/.test(b), 'le righe non si leggono');
  return 'tabella Dare/Avere, totali, e il vecchio che si dichiara';
});

prova('uno storno non si cancella niente: nasce un movimento uguale e contrario', () => {
  const b = blocco();
  deve(/async function pntStorna\(/.test(b), 'non si può stornare');
  deve(/onclick="pntStorna\(/.test(b), 'la funzione c\'è e non la chiama nessuno');   /* §1 */
  /* La decisione è UNA e sta nel motore: la stessa risposta accende il
     bottone e spiega perché no. Due controlli scritti a mano sarebbero due
     regole, e quella sbagliata sarebbe quella che nessuno guarda. */
  deve(/Contabilita\.stornabile\(/.test(b), 'la schermata decide da sé se si può stornare');
  deve(/Contabilita\.storno\(/.test(b), 'lo storno non lo costruisce il motore');
  /* Lo storno e la marcatura dell'originale sono un fatto solo: li scrive la
     stessa funzione, nella stessa transazione. */
  const st = b.slice(b.indexOf('async function pntStorna'), b.indexOf('async function pntRiapri'));
  deve(/db\.rpc\('iam_movimento_registra'/.test(st), 'lo storno non passa dalla funzione');
  deve(!/from\('iam_movimenti'\)[\s\S]{0,80}update\(/.test(st), 'la pagina marca l\'originale per conto suo, fuori dalla transazione');
  deve(/update public\.iam_movimenti[\s\S]{0,200}set stato = 'stornato'/.test(SQL1), 'la funzione non marca l\'originale');
  /* E il registro dei movimenti lo sa. */
  deve(/logMovimento\('Movimento stornato'/.test(b), 'uno storno non lascia traccia');
  return 'motore per la regola, database per la scrittura, registro per la memoria';
});

console.log('\n══ PRIMA NOTA E QUADRATURA (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPRIMA NOTA (IAM): ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
