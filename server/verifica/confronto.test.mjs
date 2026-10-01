// ═══════════════════════════════════════════════════════════════════════════════
//  CONFRONTA — il motore che mette due prodotti uno accanto all'altro
//
//  La cosa che questo motore può sbagliare non è un conto: è dare un verdetto.
//  Un confronto sbagliato mostrato a un cliente non è un numero storto in una
//  tabella, è un problema di adeguatezza. Quindi le prove guardano soprattutto
//  i casi in cui NON si deve rispondere.
//
//  Il campione `campioni/dip-auto-reale.txt` è un pezzo di DIP vero, scaricato
//  il 01/10/2026 da un set informativo auto pubblico (documento
//  precontrattuale, nessun dato di persona dentro). Serve perché le prove che
//  usano valori inventati non vedono i valori veri: un DIP vero ha le legature
//  tipografiche («ﬁgli», «aﬃni»), gli a capo in mezzo alle frasi e le quattro
//  domande impaginate come pare alla compagnia.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.dirname(path.dirname(QUI));
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'confronto.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const DIP_VERO = fs.readFileSync(path.join(QUI, 'campioni', 'dip-auto-reale.txt'), 'utf8');

// ── 1. leggere un DIP vero ───────────────────────────────────────────────────

prova('le quattro domande del DIP si trovano in un documento vero', () => {
  const d = C.leggiDip(DIP_VERO);
  deve(d.ok, d.motivo || 'non ha letto niente');
  for (const s of ['tipo', 'assicurato', 'non_assicurato', 'limiti']) {
    deve(d.trovate.includes(s), 'sezione «' + s + '» non trovata: ' + d.trovate.join(', '));
  }
  deve(d.mancanti.length === 0, 'mancano sezioni: ' + d.mancanti.join(', '));
});

prova('ogni sezione porta il SUO testo, non quello della sezione dopo', () => {
  /* Il taglio sbagliato è silenzioso: le sezioni ci sono tutte e quattro e il
     contenuto è di un'altra. Qui si pretende che le esclusioni parlino di
     esclusioni e la copertura di copertura. */
  const d = C.leggiDip(DIP_VERO);
  deve(/circolazione del veicolo/i.test(d.sezioni.assicurato),
    '«che cosa è assicurato» non parla di circolazione: ' + d.sezioni.assicurato.slice(0, 120));
  deve(/non sono coperti|conducente del veicolo responsabile/i.test(d.sezioni.non_assicurato),
    '«che cosa non è assicurato» non contiene le esclusioni: ' + d.sezioni.non_assicurato.slice(0, 120));
  deve(/rivalsa/i.test(d.sezioni.limiti),
    '«ci sono limiti di copertura» non parla di rivalsa: ' + d.sezioni.limiti.slice(0, 120));
  deve(!/Che cosa non è assicurato/i.test(d.sezioni.assicurato),
    'la sezione «assicurato» si è mangiata la domanda successiva: il taglio è sbagliato');
});

prova('un testo che non è un DIP si dichiara, non si inventa', () => {
  const d = C.leggiDip('Gentile cliente, le ricordiamo la scadenza della sua polizza.');
  deve(!d.ok, 'ha detto di aver letto un DIP dentro una lettera di sollecito');
  deve(/non e un dip|non è un DIP/i.test(d.motivo), d.motivo);
});

prova('un documento vuoto non torna un DIP vuoto', () => {
  /* «Nessuna garanzia» e «non si è potuto leggere» sono due risposte diverse:
     la prima si mostra a un cliente, la seconda no. */
  const d = C.leggiDip('');
  deve(!d.ok && /vuoto/i.test(d.motivo), JSON.stringify(d));
});

// ── 2. il vocabolario: nomi veri, non immaginati ─────────────────────────────

prova('i nomi che le compagnie scrivono davvero si riconoscono', () => {
  /* Questi non sono inventati: «Guasti Accidentali (Kasko/Collisione)» sta in
     un set informativo vero, «Tutela Legale della Circolazione Basic» è la
     descrizione che manda HDI nel flusso. */
  const casi = [
    ['Guasti Accidentali (Kasko/Collisione)', 'kasko'],
    ['Tutela Legale della Circolazione Basic', 'tutela_legale'],
    ['Eventi Sociopolitici', 'eventi_sociopolitici'],
    ['Rinuncia alla Rivalsa', 'rinuncia_rivalsa'],
    ['RC AUTO', 'rca'],
    ['infortuni del conducente', 'infortuni_conducente'],
    ['Rottura dei cristalli', 'cristalli'],
  ];
  for (const [nome, atteso] of casi) {
    const got = C.normalizza('auto', nome);
    deve(got === atteso, '«' + nome + '» → ' + got + ' invece di ' + atteso);
  }
});

prova('fra due sinonimi che combaciano vince il più lungo', () => {
  /* «Furto e incendio» contiene «furto» e «incendio». Se vincesse uno dei due
     corti, una garanzia che ne copre due si conterebbe per una sola — e il
     prodotto che le vende separate sembrerebbe più ricco.

     I nomi qui NON combaciano esattamente con nessun sinonimo: devono passare
     per la ricerca «contenuto in», che è l'unica dove la lunghezza decide.
     Con «Furto e incendio» secco la prova restava verde anche invertendo
     l'ordinamento, perché vinceva prima il combaciamento esatto — cioè non
     provava niente di quello che diceva di provare. */
  for (const nome of ['Garanzia Furto e Incendio del veicolo', 'Copertura furto e incendio completa']) {
    const got = C.normalizza('auto', nome);
    deve(got === 'furto_incendio', '«' + nome + '» → ' + got + ' invece di furto_incendio');
  }
  deve(C.normalizza('auto', 'Furto e incendio') === 'furto_incendio', 'nemmeno il nome secco');
});

prova('una garanzia che non si conosce torna null, non una a caso', () => {
  deve(C.normalizza('auto', 'Garanzia Pinco Pallino') === null, 'ha riconosciuto una garanzia inventata');
  deve(C.normalizza('auto', '') === null, 'una stringa vuota non è una garanzia');
  deve(C.normalizza('ramo-che-non-esiste', 'Furto') === null, 'ha normalizzato su un ramo inesistente');
});

// ── 3. il confronto, e i tre stati ───────────────────────────────────────────

const AUTO_A = {
  compagnia: 'HDI', prodotto: 'Valore Auto', ramo: 'auto', edizione: '07/2020',
  documento: 'Condizioni di assicurazione',
  garanzie: [
    { nome: 'RC Auto', stato: 'presente', massimale: 7290000, pagina: 3, frase: 'La Compagnia risarcisce…' },
    { nome: 'Cristalli', stato: 'presente', massimale: 500, franchigia: 0, pagina: 11 },
    { nome: 'Tutela Legale', stato: 'presente', massimale: 10000, pagina: 14 },
    { nome: 'Kasko', stato: 'assente', pagina: 2 },
  ],
};
const AUTO_B = {
  compagnia: 'Italiana', prodotto: 'Auto Più', ramo: 'auto', edizione: '01/2026',
  documento: 'Set informativo',
  garanzie: [
    { nome: 'RC Auto', stato: 'presente', massimale: 7290000, pagina: 2 },
    { nome: 'Cristalli', stato: 'presente', massimale: 500, franchigia: 150, pagina: 9 },
    { nome: 'Guasti Accidentali (Kasko/Collisione)', stato: 'presente', massimale: 20000, pagina: 10 },
    { nome: 'Garanzia Fantasia', stato: 'presente', pagina: 12 },
  ],
};

prova('una garanzia che nessuno dei due nomina resta «non letta»', () => {
  /* La riga che tiene onesto tutto il resto. Nessuno dei due documenti parla
     di «bonus protetto»: la risposta è «non lo so», non «non ce l'hanno». */
  const c = C.confronta(AUTO_A, AUTO_B);
  deve(c.ok, c.motivo);
  const r = c.righe.find(x => x.id === 'bonus_protetto');
  deve(r, 'la riga del bonus protetto non c\'è');
  deve(r.a.stato === 'non_letto' && r.b.stato === 'non_letto', JSON.stringify(r));
  deve(r.verso === null, 'ha dato un vincitore su una garanzia che nessuno dei due documenti nomina');
  deve(r.confrontabile === false, 'si è dichiarata confrontabile');
});

prova('«assente» e «non letto» non sono la stessa cosa', () => {
  const c = C.confronta(AUTO_A, AUTO_B);
  const kasko = c.righe.find(x => x.id === 'kasko');
  deve(kasko.a.stato === 'assente', 'A dichiara di non avere la kasko: ' + kasko.a.stato);
  deve(kasko.b.stato === 'presente', 'B ce l\'ha: ' + kasko.b.stato);
  deve(kasko.verso === 'b', 'su una garanzia che uno ha e l\'altro dichiara di non avere deve vincere chi ce l\'ha');
  const bonus = c.righe.find(x => x.id === 'bonus_protetto');
  deve(bonus.verso === null, 'ha trattato «non letto» come «assente»');
});

prova('a parità di massimale vince la franchigia più bassa', () => {
  const c = C.confronta(AUTO_A, AUTO_B);
  const cr = c.righe.find(x => x.id === 'cristalli');
  deve(cr.a.massimale === cr.b.massimale, 'il campione non ha più massimali uguali');
  deve(cr.verso === 'a', 'franchigia 0 contro 150 e non vince la prima: ' + cr.verso);
});

prova('un massimale confrontato con un buco non dà un vincitore', () => {
  /* Il caso che farebbe vincere sempre chi scrive di più. A dichiara 10.000 di
     tutela legale, B non dichiara niente: non vuol dire che B ne abbia meno. */
  const c = C.confronta(AUTO_A, {
    ...AUTO_B,
    garanzie: [{ nome: 'Tutela Legale', stato: 'presente', pagina: 5 }],
  });
  const t = c.righe.find(x => x.id === 'tutela_legale');
  deve(t.a.stato === 'presente' && t.b.stato === 'presente', JSON.stringify(t));
  deve(t.verso === null, 'ha dato un vincitore confrontando un massimale con un buco: ' + t.verso);
});

prova('una franchigia dichiarata non batte una non dichiarata', () => {
  /* Il gemello della prova sul massimale, e serviva: senza, il motore poteva
     far vincere chi scrive la franchigia contro chi non la scrive — cioè
     premiare il documento più prolisso, non il prodotto migliore. Qui i
     massimali sono uguali, quindi decide la franchigia: A la dichiara, B no. */
  const c = C.confronta(
    { compagnia: 'A', prodotto: 'P', ramo: 'auto',
      garanzie: [{ nome: 'Cristalli', stato: 'presente', massimale: 500, franchigia: 100 }] },
    { compagnia: 'B', prodotto: 'Q', ramo: 'auto',
      garanzie: [{ nome: 'Cristalli', stato: 'presente', massimale: 500 }] });
  const r = c.righe.find(x => x.id === 'cristalli');
  deve(r.a.franchigia === 100 && r.b.franchigia === null, JSON.stringify(r));
  deve(r.verso === null, 'ha dato un vincitore confrontando una franchigia con un buco: ' + r.verso);
});

prova('due righe sulla stessa garanzia: vince quella che dice di più', () => {
  /* I documenti veri nominano la stessa garanzia più volte — nel DIP, nel DIP
     aggiuntivo e nelle condizioni. Se l'ultima riga sovrascrivesse sempre, una
     riga «non_letto» pescata in fondo cancellerebbe quella buona letta prima,
     e la garanzia sparirebbe dal confronto. */
  const c = C.confronta(
    { compagnia: 'A', prodotto: 'P', ramo: 'auto', garanzie: [
      { nome: 'Cristalli', stato: 'presente', massimale: 500, pagina: 9 },
      { nome: 'Cristalli', stato: 'non_letto' },
    ] },
    { compagnia: 'B', prodotto: 'Q', ramo: 'auto', garanzie: [
      { nome: 'Cristalli', stato: 'presente', massimale: 300, pagina: 4 },
    ] });
  const r = c.righe.find(x => x.id === 'cristalli');
  deve(r.a.stato === 'presente', 'la riga buona è stata sovrascritta da quella vuota: ' + JSON.stringify(r.a));
  deve(r.a.massimale === 500, 'il massimale letto è andato perso: ' + r.a.massimale);
  deve(r.verso === 'a', '500 contro 300 e non vince il primo: ' + r.verso);
});

prova('le garanzie fuori vocabolario si vedono, non spariscono', () => {
  /* Una garanzia che il confronto butta via è esattamente il modo di far
     vincere il prodotto che ce l'ha. */
  const c = C.confronta(AUTO_A, AUTO_B);
  deve(c.fuoriVocabolario.b.length === 1, 'la garanzia sconosciuta di B è sparita: ' + JSON.stringify(c.fuoriVocabolario));
  deve(/Fantasia/.test(c.fuoriVocabolario.b[0].nome), JSON.stringify(c.fuoriVocabolario.b[0]));
});

prova('ogni riga letta dice da quale documento viene', () => {
  const c = C.confronta(AUTO_A, AUTO_B);
  const r = c.righe.find(x => x.id === 'rca');
  deve(r.a.fonte && r.a.fonte.compagnia === 'HDI' && r.a.fonte.edizione === '07/2020',
    'la riga non porta la fonte: ' + JSON.stringify(r.a.fonte));
  deve(r.a.fonte.pagina === 3, 'manca la pagina: senza, «dove c\'è scritto?» non ha risposta');
});

prova('due rami diversi non si confrontano', () => {
  const c = C.confronta(AUTO_A, { ...AUTO_B, ramo: 'casa' });
  deve(!c.ok, 'ha confrontato un\'auto con una casa');
  deve(/rami diversi/i.test(c.motivo), c.motivo);
});

// ── 4. il punteggio, e quando si rifiuta di darlo ────────────────────────────

prova('il punteggio dice sempre su quante garanzie si è pronunciato', () => {
  const p = C.punteggio(C.confronta(AUTO_A, AUTO_B));
  deve(p.ok, p.motivo);
  deve(p.su === p.a + p.b + p.pari, 'i conti non tornano: ' + JSON.stringify(p));
  deve(p.su + p.nonConfrontabili === p.totale,
    'confrontate + non confrontabili non fa il totale: ' + JSON.stringify(p));
  deve(p.totale === C.VOCABOLARIO.auto.length, 'il totale non è il vocabolario del ramo: ' + p.totale);
});

prova('con pochi documenti letti non si proclama un vincitore', () => {
  /* La regola che vale più di tutte: sotto la metà delle garanzie del ramo,
     il motore dice che mancano i documenti invece di dare un verdetto. */
  const magro = { ...AUTO_B, garanzie: [{ nome: 'Cristalli', stato: 'presente', massimale: 300 }] };
  const p = C.punteggio(C.confronta(AUTO_A, magro));
  deve(p.ok, p.motivo);
  deve(p.vince === null, 'ha proclamato un vincitore con ' + p.su + ' garanzie su ' + p.totale);
  deve(/troppo poco|set informativo/i.test(p.perche || ''), 'non dice perché si astiene: ' + p.perche);
});

prova('senza niente da confrontare lo dice, invece di dare 0 a 0', () => {
  const vuoto = { compagnia: 'X', prodotto: 'Y', ramo: 'auto', garanzie: [] };
  const p = C.punteggio(C.confronta(vuoto, vuoto));
  deve(p.su === 0 && p.vince === null, JSON.stringify(p));
  deve(/mancano i documenti/i.test(p.perche), p.perche);
});

prova('quando si è letto abbastanza, il vincitore si dice', () => {
  /* Il motore deve anche saper rispondere: uno che si astiene sempre non
     serve a niente. Qui A vince su quasi tutte le garanzie del ramo. */
  const pieno = (compagnia, massimale) => ({
    compagnia, prodotto: 'P', ramo: 'auto', edizione: '2026',
    garanzie: C.VOCABOLARIO.auto.map(g => ({ id: g.id, stato: 'presente', massimale })),
  });
  const p = C.punteggio(C.confronta(pieno('A', 1000), pieno('B', 500)));
  deve(p.su === C.VOCABOLARIO.auto.length, 'non ha confrontato tutto: ' + JSON.stringify(p));
  deve(p.vince === 'a', 'massimali doppi su tutte le garanzie e non vince: ' + JSON.stringify(p));
  deve(p.perche === null, 'si astiene pur avendo letto tutto: ' + p.perche);
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nCONFRONTA — il motore del confronto fra prodotti');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nCONFRONTO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
