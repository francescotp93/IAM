// ═══════════════════════════════════════════════════════════════════════════════
//  INCASSI DA ACCREDITARE — il pannello  (20/09/2026, brief #02 M4)
//
//  Le regole stanno nel motore condiviso `tariffe/motore/contabilita.js` e
//  hanno le loro 27 prove in `server/verifica/contabilita.test.mjs`. Qui si
//  sorveglia che la schermata:
//
//    · NON registri un movimento per un incasso che non e' ancora arrivato.
//      E' la cosa che, rompendosi, non si vede: il saldo direbbe di avere dei
//      soldi che arrivano fra tre giorni, e la quadratura troverebbe la
//      differenza senza saper dire da dove viene;
//    · non scelga un conto quando nessuno ha detto quale, e non inventi il
//      mezzo quando la rata non lo dice;
//    · non porti due volte la stessa rata in contabilita';
//    · sia raggiungibile, e abbia la grafica di IAM (§31).
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
const SQL = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260920_b02_m4_sospesi.sql'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('/* ══ INCASSI DA ACCREDITARE (brief #02 · M4');
  deve(i >= 0, 'non trovo il blocco inc* in iam/index.html');
  const fine = H.indexOf('/* ══ TARIFFE, ACCORDI E GRUPPI', i);
  return H.slice(i, fine < 0 ? H.length : fine);
}
/* Solo le righe di codice: un commento che nomina il difetto fa scattare una
   prova che cerca la stringa (la trappola di §10, §12, §18, §26, §29 e §31 —
   sette volte). Si tolgono i commenti a inizio riga, mai con una regex globale
   che mangia codice vero (§12). */
function codice(t) { return t.split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n'); }

prova('UN INCASSO CHE NON E\' ARRIVATO NON MUOVE IL CONTO', () => {
  /* La regola che questo file esiste per sorvegliare. Nel ramo «arriva dopo»
     si scrive SOLO la riga da accreditare: se comparisse anche un movimento,
     il saldo conterebbe dei soldi che sul conto non ci sono, e nessuno
     saprebbe perche' la quadratura non torna. */
  const b = codice(blocco());
  /* Il taglio si ferma alla funzione DOPO, non a un commento: i commenti qui
     sono gia' stati tolti, e un indice `-1` avrebbe fatto leggere alla prova
     mezzo blocco — dichiarando rotto un codice giusto. E' la stessa famiglia
     di trappole di §10 e §12, dal lato del ritaglio. */
  const a = b.indexOf('async function incPorta');
  const z = b.indexOf('async function incAccredita');
  deve(a >= 0 && z > a, 'non trovo incPorta');
  const f = b.slice(a, z);
  const rami = f.split("} else {");
  deve(rami.length === 2, 'incPorta non ha i due rami separati (cassa / arriva dopo)');
  deve(/iam_movimenti'\)\.insert/.test(rami[0]), 'il ramo dei contanti non registra il movimento');
  deve(!/iam_sospesi'\)\.insert/.test(rami[0]), 'i contanti finiscono anche fra gli incassi da accreditare');
  deve(/iam_sospesi'\)\.insert/.test(rami[1]), 'il ramo «arriva dopo» non crea la riga da accreditare');
  deve(!/iam_movimenti'\)\.insert/.test(rami[1]), 'un incasso non ancora arrivato muove gia’ il conto');
  return 'contanti → movimento, tutto il resto → riga da accreditare';
});

prova('l\'accredito scrive PRIMA il movimento e poi chiude, e i due si riconoscono', () => {
  const b = codice(blocco());
  const f = b.slice(b.indexOf('async function incAccredita'), b.indexOf('async function incAnnulla'));
  deve(f.length > 300, 'non trovo incAccredita');
  const iMov = f.indexOf("from('iam_movimenti').insert"), iChi = f.indexOf("from('iam_sospesi').update");
  deve(iMov > 0 && iChi > iMov, 'chiude l’incasso prima di registrare il movimento: resterebbe un «arrivato» che sul conto non c’e’');
  deve(/sospeso_id: s\.id/.test(f) && /origine: 'sospeso'/.test(f), 'il movimento non dice da quale accredito viene');
  deve(/movimento_id: data\.id/.test(f), 'l’incasso chiuso non punta al suo movimento');
  deve(/Contabilita\.validaAccredito\(/.test(f), 'l’accredito non passa dal motore');
  /* E il database impedisce di accreditare due volte: un accredito doppio e'
     denaro che nel sistema c'e' e in banca no. */
  deve(/create unique index if not exists iam_movimenti_sospeso_uno/.test(SQL), 'un incasso puo’ generare due movimenti');
  return 'movimento → chiusura, con l’indice unico sotto';
});

prova('una rata non si porta in contabilita\' due volte', () => {
  const b = codice(blocco());
  const f = b.slice(b.indexOf('function incDaPortare'), b.indexOf('function incRender()'));
  deve(/conMov/.test(f) && /conSosp/.test(f), 'l’elenco non esclude quello che e’ gia’ entrato');
  /* Un movimento ANNULLATO non conta come «gia' entrata»: quella rata torna
     nell'elenco, ed e' giusto — il movimento e' stato tolto dai totali. */
  deve(/!m\.annullato_il/.test(f), 'un movimento annullato tiene fuori la rata per sempre');
  /* E l'annullato fra gli incassi idem. */
  deve(/s\.stato !== 'annullato'/.test(f), 'un incasso annullato tiene fuori la rata per sempre');
  deve(/create unique index if not exists iam_sospesi_titolo_uno/.test(SQL), 'il database lascia due incassi vivi sulla stessa rata');
  return 'due insiemi, gli annullati non contano, indice unico sotto';
});

prova('non si sceglie un conto a caso, e non si inventa il mezzo', () => {
  const b = blocco();
  /* Il destino lo calcola il motore, non la pagina. */
  deve(/Contabilita\.destinoIncasso\(/.test(b), 'il destino di un incasso e’ deciso in pagina');
  /* «non si sa» non ha il bottone: non c’e’ niente da premere finche’
     qualcuno non configura il conto o non dice il mezzo. */
  deve(/d\.tipo !== 'non-si-sa'/.test(b), 'si puo’ registrare un incasso di cui non si sa dove va');
  deve(/non si sa/.test(b), 'il terzo stato non ha un’etichetta sua');
  /* E la schermata dice DOVE si sistema. */
  deve(/Conti e causali/.test(b), 'non dice dove si configura il conto che riceve un mezzo');
  /* Il motore fa quello che la schermata gli chiede. */
  const conti = [{ id: 'k1', nome: 'Cassa', attivo: true, mezzi: ['contanti'] }];
  deve(C.destinoIncasso({ mezzo_pagamento: 'pos', importo_lordo: 10 }, conti).tipo === 'non-si-sa',
    'un POS che nessun conto riceve viene collocato lo stesso');
  return 'niente bottone su «non si sa», e il motore lo conferma';
});

prova('il conto dichiara che mezzi riceve, e la schermata glielo fa dire', () => {
  /* Senza questa configurazione la M4 non parte: e’ la prima cosa da fare. */
  deve(/alter table public\.iam_conti add column if not exists mezzi text\[\]/.test(SQL), 'manca la colonna dei mezzi');
  deve(/class="cnt-mezzo"/.test(H), 'il modulo del conto non chiede quali mezzi riceve');
  deve(/querySelectorAll\('\.cnt-mezzo:checked'\)/.test(H), 'i mezzi scelti non si salvano');
  /* Si legge solo quello che il pannello ha mostrato: un elenco vuoto vuol
     dire «nessun mezzo arriva qui», ed e’ un’informazione vera (§10). */
  deve(/Contabilita\.MEZZI\.map/.test(H), 'l’elenco dei mezzi non viene dal motore');
  return 'colonna, caselle, salvataggio';
});

prova('si annulla col motivo, e non si cancella', () => {
  const b = codice(blocco());
  deve(!/\.delete\(\s*\)/.test(b), 'da qualche parte si toglie una riga invece di annullarla');
  const f = b.slice(b.indexOf('async function incAnnulla'));
  deve(/if \(!perche\)/.test(f), 'si annulla senza motivo');
  deve(/stato: 'annullato'/.test(f) && /annullato_perche: perche/.test(f), 'l’annullamento non scrive il motivo');
  deve(/create trigger iam_sospesi_no_delete_trg/.test(SQL), 'il database lascia cancellare un incasso');
  return 'zero cancellazioni, motivo obbligatorio, trigger sotto';
});

prova('la linguetta esiste, si avvia, e ha la grafica di IAM', () => {
  deve(/id="ctab-incassi"/.test(H), 'manca la linguetta');
  deve(/id="contab-panel-incassi"/.test(H), 'manca il pannello');
  deve(/'quadratura','primanota','quadconti','incassi'/.test(H), 'selContabTab non conosce la linguetta');
  deve(/if \(sub==='incassi'\) incCarica\(\);/.test(H), 'la linguetta non carica niente (§6b)');
  /* §31: la grafica di IAM, non una inventata qui. */
  const i = H.indexOf('id="contab-panel-incassi"');
  const seg = H.slice(i, i + 2200);
  deve(/<section class="page-head">/.test(seg), 'la testata non e’ quella del kit');
  deve(/class="subtitle"/.test(seg) && /class="eyebrow"/.test(seg), 'manca sottotitolo o occhiello del kit');
  deve(!/class="f-b/.test(seg), 'usa i bottoni della famiglia «fonti»');
  /* E i gettoni del kit arrivano anche qui, altrimenti le schede perdono gli
     angoli in silenzio. */
  const css = H.slice(H.indexOf('<style'), H.indexOf('</style>'));
  deve(/#contab-panel-incassi[\s\S]{0,200}--w1-verde/.test(css.replace(/\n/g, ' ')) ||
       /#contab-panel-incassi\s*\{/.test(css) || /#contab-panel-incassi,/.test(css),
    'il pannello non riceve i gettoni del kit');
  return 'linguetta, inizializzatore, kit';
});

prova('il nome NON e\' «sospesi», ed e\' una decisione', () => {
  /* In agenzia «sospeso» e’ gia’ il premio che il cliente NON ha pagato: e’
     la linguetta qui accanto, che legge il file della compagnia. Questo e’
     l’opposto — il cliente ha pagato e il denaro non e’ ancora sul conto.
     Due cose diverse con lo stesso nome sono due elenchi che non si
     incrociano (§18). */
  deve(/id="ctab-sospesi"/.test(H), 'la linguetta «Sospesi» di prima e’ sparita');
  deve(/>Incassi da accreditare</.test(H), 'la linguetta nuova non si chiama «Incassi da accreditare»');
  const i = H.indexOf('id="contab-panel-incassi"');
  deve(/PERCHE' NON SI CHIAMA/.test(H.slice(Math.max(0, i - 1400), i)), 'la scelta del nome non e’ scritta accanto al pannello');
  return 'due nomi per due cose diverse';
});

prova('«non si e\' potuto leggere» non diventa «non ce ne sono»', () => {
  const b = blocco();
  deve(/non vuol dire che non ce ne siano/.test(b), 'l’errore di lettura si confonde con l’elenco vuoto');
  deve(/class="cnt-err"/.test(b), 'l’errore non si vede');
  deve(/Nessun incasso da accreditare/.test(b), 'l’elenco vuoto non ha un messaggio suo');
  return 'due messaggi diversi per due cose diverse';
});

prova('il cancello dell\'admin esiste ED E\' CHIAMATO', () => {
  const b = codice(blocco());
  deve(/function incPuoScrivere\(\)\s*{\s*return PROFILO\?\.ruolo === 'admin'/.test(b), 'manca incPuoScrivere');
  const usi = (b.match(/incPuoScrivere\(\)/g) || []).length;
  deve(usi >= 2, 'incPuoScrivere e’ chiamata solo ' + usi + ' volte: il cancello e’ decorativo (§1)');
  deve(/function incApriAccredito\(id\)\s*{\s*\n?\s*if \(!incPuoScrivere\(\)\) return;/.test(b),
    'la finestra dell’accredito si apre anche a chi non puo’ scrivere');
  deve(/create policy sospesi_write[\s\S]{0,160}iam_is_admin\(\)/.test(SQL), 'la scrittura non e’ chiusa all’admin');
  return 'bottoni + finestra + RLS';
});

console.log('\n══ INCASSI DA ACCREDITARE (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nINCASSI (IAM): ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
