// ═══════════════════════════════════════════════════════════════════════════════
//  IL CATALOGO PRODOTTI — tariffe/motore/catalogo.js  (20/09/2026)
//
//  Questo motore decide DUE cose che, sbagliate, non si vedono:
//   · a quale compagnia appartiene una polizza arrivata da un file — e su quel
//     nome sono scritte le regole documentali (§11) e le tariffe (§28);
//   · se il prodotto che il file nomina è uno che abbiamo già o uno nuovo — e
//     un aggancio sbagliato fonde due prodotti diversi in silenzio, mentre un
//     aggancio mancato riempie il catalogo di doppioni.
//
//  Le prove sotto sono quelle che, saltando, producono un catalogo CREDIBILE
//  E SBAGLIATO. Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../../tariffe/motore/catalogo.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* ── Il banco ──────────────────────────────────────────────────────────────
   Le compagnie ricalcano la forma di `quote_compagnie`: nome + alias. Due
   compagnie inventate si riducono alla stessa forma, ed è il caso che deve
   restare senza risposta. */
const COMPAGNIE = [
  { id: 'c-hdi',   nome: 'HDI',        alias: ['HDI Assicurazioni', 'HD'] },
  { id: 'c-prima', nome: 'Prima',      alias: ['Prima Assicurazioni', 'Prima.it'] },
  { id: 'c-nord',  nome: 'Nord Assicurazioni', alias: [] },
  { id: 'c-nord2', nome: 'Nord S.p.A.',        alias: [] }
];

const STANDARD = [
  { id: 's-rca',   ramo: 'rca',     nome: 'RC Auto',        codice: 'RCA',  attivo: true },
  { id: 's-moto',  ramo: 'rca',     nome: 'RC Moto',        codice: 'RCM',  attivo: true },
  { id: 's-casa',  ramo: 'beni',    nome: 'Casa',           codice: 'CASA', attivo: true },
  { id: 's-cf',    ramo: 'beni',    nome: 'Casa e Famiglia', codice: 'CEF', attivo: true },
  { id: 's-inf',   ramo: 'persona', nome: 'Infortuni',      codice: 'INF',  attivo: true },
  { id: 's-spento', ramo: 'beni',   nome: 'Vecchio',        codice: null,   attivo: false }
];

const PRODOTTI = [
  { id: 'p-black', compagnia_id: 'c-prima', ramo: 'rca',  nome: 'BLACK',
    alias: [], prodotto_standard_id: 's-rca', attivo: true },
  { id: 'p-casa',  compagnia_id: 'c-hdi',   ramo: 'beni', nome: 'Globale Casa 2019',
    alias: ['Casa · HDI Globale Casa 2019'], prodotto_standard_id: 's-casa', attivo: true },
  { id: 'p-fine',  compagnia_id: 'c-hdi',   ramo: 'beni', nome: 'Casa Vecchia',
    alias: [], prodotto_standard_id: null, attivo: true, al: '2026-01-31' },
  { id: 'p-off',   compagnia_id: 'c-hdi',   ramo: 'beni', nome: 'Casa Spenta',
    alias: [], prodotto_standard_id: null, attivo: false }
];

/* ═══ LA NORMALIZZAZIONE ═══════════════════════════════════════════════════ */

prova('lo stesso nome scritto da tre persone è lo stesso nome', () => {
  /* È il caso misurato sul portafoglio vero: «CASA_E_FAMIGLIA» dal flusso,
     «Casa e Famiglia» scritto a mano. Senza questa regola sono due prodotti. */
  deve(C.norm('CASA_E_FAMIGLIA') === C.norm('Casa e Famiglia'), C.norm('CASA_E_FAMIGLIA'));
  deve(C.norm('  Casa   e  Famiglia ') === 'casa e famiglia', '[' + C.norm('  Casa   e  Famiglia ') + ']');
  deve(C.norm('RC Vita Privata · HDI') === 'rc vita privata hdi', C.norm('RC Vita Privata · HDI'));
  /* Gli accenti: «Società» e «Societa» sono la stessa parola scritta da due
     tastiere diverse, e un indice unico che non lo sa accetta il doppione. */
  deve(C.norm('Società') === 'societa', C.norm('Società'));
  return 'minuscole, accenti, punteggiatura, spazi';
});

prova('la forma ridotta toglie le parole che non dicono CHI è', () => {
  deve(C.normCompagnia('HDI Assicurazioni S.p.A.') === 'hdi', '[' + C.normCompagnia('HDI Assicurazioni S.p.A.') + ']');
  deve(C.normCompagnia('HDI') === 'hdi', '[' + C.normCompagnia('HDI') + ']');
  return 'le forme societarie non sono l’identità';
});

/* ═══ LA COMPAGNIA ═════════════════════════════════════════════════════════ */

prova('l’alias è la strada per cui gli alias esistono', () => {
  /* Sulle polizze è scritto «HDI Assicurazioni», nel catalogo prodotti «HDI»
     (§11). Senza l'alias, quel portafoglio non ritrova la sua compagnia. */
  const r = C.risolviCompagnia('HDI Assicurazioni', COMPAGNIE);
  deve(r && r.compagnia.id === 'c-hdi', 'HDI Assicurazioni non ritrova HDI');
  deve(r.come === 'alias', 'ritrovata per ' + r.come);
  deve(C.risolviCompagnia('PRIMA', COMPAGNIE).compagnia.id === 'c-prima', 'PRIMA maiuscolo non ritrova Prima');
  return 'nome, poi alias';
});

prova('due compagnie che si somigliano non producono NIENTE', () => {
  /* «Nord Assicurazioni» e «Nord S.p.A.» si riducono tutte e due a «nord».
     Sceglierne una vuol dire attribuire un portafoglio alla compagnia
     sbagliata — ed è la regola «aggancia solo se è una» (§19). */
  const r = C.risolviCompagnia('Nord', COMPAGNIE);
  deve(r && r.come === 'ambiguo', 'ha scelto: ' + JSON.stringify(r));
  deve(!r.compagnia, 'ha agganciato una compagnia lo stesso');
  deve(/2 compagnie/.test(r.motivo), 'il motivo non dice quante sono: ' + r.motivo);
  /* E una che si riduce a una sola, invece, si aggancia. */
  const uno = C.risolviCompagnia('Prima S.r.l.', COMPAGNIE);
  deve(uno && uno.compagnia && uno.compagnia.id === 'c-prima', 'la forma ridotta non aggancia quando è una sola');
  return 'due candidate → nessuna risposta, una → agganciata';
});

/* ═══ IL PRODOTTO ══════════════════════════════════════════════════════════ */

prova('«Casa» di HDI e «Casa» di Prima sono due prodotti', () => {
  /* La chiave è la coppia compagnia+ramo. Due compagnie possono chiamare allo
     stesso modo due cose diverse: su una chiave a nome solo la seconda
     mangerebbe la prima, in silenzio (regola 3 dei codici, §19). */
  deve(C.risolviProdotto('c-hdi', 'beni', 'Globale Casa 2019', PRODOTTI).prodotto.id === 'p-casa', 'HDI non ritrova il suo');
  deve(!C.risolviProdotto('c-prima', 'beni', 'Globale Casa 2019', PRODOTTI), 'Prima ritrova un prodotto di HDI');
  /* E nemmeno fra rami diversi. */
  deve(!C.risolviProdotto('c-hdi', 'rca', 'Globale Casa 2019', PRODOTTI), 'lo ritrova su un altro ramo');
  return 'compagnia + ramo + nome';
});

prova('l’alias di un prodotto è quello che fa funzionare una fusione la notte dopo', () => {
  const r = C.risolviProdotto('c-hdi', 'beni', 'Casa · HDI Globale Casa 2019', PRODOTTI);
  deve(r && r.prodotto.id === 'p-casa', 'il nome scartato non ritrova il prodotto tenuto');
  deve(r.come === 'alias', 'ritrovato per ' + r.come);
  return 'senza, l’import lo ricrea ogni notte';
});

prova('lo standard si PROPONE, e solo se è uno', () => {
  deve(C.proponiStandard('rca', 'RC Auto', STANDARD).standard.id === 's-rca', 'non propone quello ovvio');
  /* Per codice: «RCA» è come la compagnia lo chiama nel suo file. */
  deve(C.proponiStandard('rca', 'RCA', STANDARD).standard.id === 's-rca', 'non propone per codice');
  /* «BLACK» non somiglia a niente che un programma possa vedere: l'aggancio
     lo decide una persona, e questo NON lo inventa (§8.1). */
  deve(!C.proponiStandard('rca', 'BLACK', STANDARD), 'ha indovinato BLACK');
  /* Il ramo conta: «Casa» esiste su beni, non su rca. */
  deve(!C.proponiStandard('rca', 'Casa', STANDARD), 'aggancia fuori dal ramo');
  /* Uno standard spento non si propone: è stato spento per non venderlo più. */
  deve(!C.proponiStandard('beni', 'Vecchio', STANDARD), 'propone uno standard spento');
  return 'nome o codice, dentro il ramo, e mai a somiglianza';
});

/* ═══ LE TENDINE ═══════════════════════════════════════════════════════════ */

prova('quello che non si vende più esce dalle tendine e resta sui dati storici', () => {
  const oggi = '2026-09-20';
  const t = C.perTendina(PRODOTTI, 'c-hdi', 'beni', oggi);
  const ids = t.map(p => p.id);
  deve(ids.indexOf('p-casa') >= 0, 'il prodotto vivo non c’è');
  deve(ids.indexOf('p-off') < 0, 'un prodotto disattivato è in tendina: si continuerebbe a venderlo');
  deve(ids.indexOf('p-fine') < 0, 'un prodotto la cui validità è finita è in tendina');
  /* Ma NON è sparito: si ritrova ancora, ed è quello che tiene in piedi le
     polizze già scritte (§26 — non si cancella, si spegne). */
  deve(C.risolviProdotto('c-hdi', 'beni', 'Casa Spenta', PRODOTTI), 'il prodotto spento non si ritrova più: le polizze restano orfane');
  return 'fuori dalle tendine, dentro lo storico';
});

/* ═══ IL PIANO DELL'IMPORTAZIONE ═══════════════════════════════════════════ */

const RIGHE = [
  { compagnia: 'Prima Assicurazioni', ramo: 'rca',  prodotto: 'BLACK' },
  { compagnia: 'Prima Assicurazioni', ramo: 'rca',  prodotto: 'BLACK' },
  { compagnia: 'PRIMA',               ramo: 'beni', prodotto: 'CASA_E_FAMIGLIA' },
  { compagnia: 'Plurima',             ramo: 'rca',  prodotto: 'RC Auto' },
  { compagnia: 'Plurima',             ramo: 'rca',  prodotto: 'RC Moto' },
  { compagnia: 'Nord',                ramo: 'beni', prodotto: 'Qualcosa' },
  { compagnia: 'HDI Assicurazioni',   ramo: '',     prodotto: 'Senza ramo' },
  { compagnia: '',                    ramo: 'beni', prodotto: 'Senza compagnia' }
];

prova('l’importazione non si ferma mai: ogni riga finisce in un posto', () => {
  const p = C.pianoCatalogo({ righe: RIGHE, compagnie: COMPAGNIE, prodotti: PRODOTTI, standard: STANDARD });
  /* Un'importazione che si ferma sulla riga 400 lascia un portafoglio scritto
     a metà, e nessuno sa quale metà. */
  deve(p.conteggi.righe === RIGHE.length, 'ha perso delle righe');
  deve(p.conteggi.compagnie_ambigue === 1, 'le ambigue sono ' + p.conteggi.compagnie_ambigue);
  deve(p.conteggi.prodotti_senza_ramo === 2, 'le righe senza ramo/compagnia sono ' + p.conteggi.prodotti_senza_ramo);
  /* E le righe dopo l'ambigua sono state lavorate lo stesso. */
  deve(p.prodotti.senzaRamo.length === 2, 'si è fermato sull’ambigua');
  return p.conteggi.compagnie_da_creare + ' compagnie e ' + p.conteggi.prodotti_da_creare + ' prodotti da creare';
});

prova('la stessa compagnia due volte nello stesso file non si crea due volte', () => {
  const p = C.pianoCatalogo({ righe: RIGHE, compagnie: COMPAGNIE, prodotti: PRODOTTI, standard: STANDARD });
  const nuove = p.compagnie.daCreare.map(c => c.nome);
  deve(nuove.length === 1 && nuove[0] === 'Plurima', 'da creare: ' + nuove.join(', '));
  deve(p.compagnie.daCreare[0].righe === 2, 'non conta quante righe ci sono sotto: ' + p.compagnie.daCreare[0].righe);
  /* Senza il segnaposto in memoria, il secondo giro creerebbe la seconda
     Plurima — e le due righe dell'anteprima direbbero «2 compagnie da creare»
     su un file che ne ha una. */
  deve(p.compagnie.daCreare[0].da_verificare === true, 'una compagnia nata dall’import non è marcata da verificare');
  deve(p.compagnie.daCreare[0].origine === 'import', 'l’origine non dice da dove viene');
  return '1 sola, con 2 righe sotto';
});

prova('la compagnia che c’è già non si ricrea, e si dice da quale strada', () => {
  const p = C.pianoCatalogo({ righe: RIGHE, compagnie: COMPAGNIE, prodotti: PRODOTTI, standard: STANDARD });
  const prima = p.compagnie.agganciate.filter(c => c.id === 'c-prima')[0];
  deve(prima, 'Prima non è stata agganciata');
  /* Due scritture diverse («Prima Assicurazioni» e «PRIMA») per la stessa
     compagnia: una sola voce nell'anteprima. */
  deve(p.compagnie.agganciate.filter(c => c.id === 'c-prima').length === 1, 'Prima compare due volte');
  return 'agganciata per ' + prima.come;
});

prova('sotto una compagnia ambigua non si aggancia e non si crea NIENTE', () => {
  const p = C.pianoCatalogo({ righe: RIGHE, compagnie: COMPAGNIE, prodotti: PRODOTTI, standard: STANDARD });
  const nomi = p.prodotti.daCreare.map(x => x.nome);
  deve(nomi.indexOf('Qualcosa') < 0, 'ha creato un prodotto sotto una compagnia che non sa quale sia');
  return 'l’ambiguità si ferma alla compagnia';
});

prova('il prodotto che c’è già si aggancia, quello nuovo nasce da verificare', () => {
  const p = C.pianoCatalogo({ righe: RIGHE, compagnie: COMPAGNIE, prodotti: PRODOTTI, standard: STANDARD });
  deve(p.prodotti.agganciati.some(x => x.id === 'p-black'), 'BLACK non si è agganciato a quello che c’è');
  const cef = p.prodotti.daCreare.filter(x => x.nome === 'CASA_E_FAMIGLIA')[0];
  deve(cef, 'CASA_E_FAMIGLIA non è fra i nuovi');
  deve(cef.da_verificare === true && cef.origine === 'import', 'nasce senza le due marcature');
  /* E lo standard si propone da sé quando la corrispondenza è una: il nome
     normalizzato di «CASA_E_FAMIGLIA» è quello di «Casa e Famiglia». */
  deve(cef.prodotto_standard_id === 's-cf', 'non propone lo standard: ' + cef.prodotto_standard_id);
  const moto = p.prodotti.daCreare.filter(x => x.nome === 'RC Moto')[0];
  deve(moto && moto.prodotto_standard_id === 's-moto', 'RC Moto non si aggancia al suo standard');
  return 'agganciati ' + p.conteggi.prodotti_agganciati + ', nuovi ' + p.conteggi.prodotti_da_creare;
});

prova('il ramo resta quello STANDARD della libreria', () => {
  /* Il brief lo chiede, e ha una ragione: il nome commerciale è della
     compagnia, il ramo è di casa nostra. Due rami per lo stesso prodotto sono
     due elenchi che non si incrociano. */
  const righe = [{ compagnia: 'Plurima', ramo: 'auto', prodotto: 'RC Auto' }];
  const p = C.pianoCatalogo({ righe, compagnie: COMPAGNIE, prodotti: [], standard: STANDARD });
  const n = p.prodotti.daCreare[0];
  deve(n.prodotto_standard_id === 's-rca', 'non si è agganciato allo standard');
  deve(n.ramo === 'rca', 'il ramo è ' + n.ramo + ' invece di quello della libreria');
  deve(n.ramo_dal_file === 'auto', 'non conserva che cosa diceva il file: ' + n.ramo_dal_file);
  return 'auto (dal file) → rca (dalla libreria)';
});

prova('un ramo che il sistema non conosce si VEDE, non sparisce', () => {
  const righe = [{ compagnia: 'Plurima', ramo: 'nautica', prodotto: 'Barca Sicura' }];
  const p = C.pianoCatalogo({ righe, compagnie: COMPAGNIE, prodotti: [], standard: STANDARD });
  const n = p.prodotti.daCreare[0];
  /* Non si rifiuta (può essere vero) e non si tace: un refuso che toglie un
     prodotto da tutte le tendine, in silenzio, non lo scopre nessuno (§11). */
  deve(n.ramo === 'nautica', 'ha cambiato il ramo da solo');
  deve(n.ramo_sconosciuto === 'nautica', 'non segnala il ramo fuori vocabolario');
  return 'creato, e dichiarato';
});

/* ═══ LA FUSIONE ═══════════════════════════════════════════════════════════ */

prova('fondere mette il nome scartato fra gli alias, non lo cancella', () => {
  const tenuto = { id: 'a', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Casa e Famiglia',
                   alias: ['Casa Famiglia'], prodotto_standard_id: 's-cf' };
  const scartato = { id: 'b', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'CASA_E_FAMIGLIA',
                     alias: ['Casa Fam.'], prodotto_standard_id: null };
  const f = C.fondi(tenuto, scartato);
  deve(f.ok, f.motivo);
  /* «CASA_E_FAMIGLIA» normalizzato è uguale a «Casa e Famiglia»: non si
     aggiunge un alias che è già il nome. Ma «Casa Fam.» sì. */
  deve(f.tenuto.alias.indexOf('Casa Fam.') >= 0, 'gli alias dello scartato si perdono: ' + f.tenuto.alias.join(' | '));
  deve(f.scartato.attivo === false, 'lo scartato viene cancellato invece che spento');
  deve(!('id' in f.scartato) || f.scartato.id === 'b', 'lo scartato non è quello indicato');
  /* Quello che la fusione NON fa va detto a chi la conferma. */
  deve(/Niente viene riscritto/.test(f.nota), 'non dice che le polizze restano come sono: ' + f.nota);
  return f.aliasAggiunti.length + ' alias aggiunti';
});

prova('non si fondono due prodotti di compagnie o rami diversi', () => {
  const a = { id: 'a', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Casa', alias: [] };
  deve(!C.fondi(a, { id: 'b', compagnia_id: 'c-prima', ramo: 'beni', nome: 'Casa', alias: [] }).ok,
    'fonde due compagnie diverse');
  deve(!C.fondi(a, { id: 'b', compagnia_id: 'c-hdi', ramo: 'rca', nome: 'Casa', alias: [] }).ok,
    'fonde due rami diversi');
  deve(!C.fondi(a, a).ok, 'fonde un prodotto con se stesso');
  return 'tre casi respinti col motivo';
});

prova('due standard diversi non si scelgono a occhio', () => {
  const f = C.fondi(
    { id: 'a', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Casa', alias: [], prodotto_standard_id: 's-casa' },
    { id: 'b', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Abitazione', alias: [], prodotto_standard_id: 's-cf' });
  deve(f.ok, f.motivo);
  deve(f.tenuto.prodotto_standard_id === 's-casa', 'ha preso quello dello scartato');
  deve(f.avvisi.length === 1, 'non avvisa che i due standard erano diversi');
  /* E se il tenuto non ne ha uno, si eredita: è un'informazione che qualcuno
     aveva già deciso, e buttarla via sarebbe lavoro perso. */
  const g = C.fondi(
    { id: 'a', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Casa', alias: [], prodotto_standard_id: null },
    { id: 'b', compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Abitazione', alias: [], prodotto_standard_id: 's-cf' });
  deve(g.tenuto.prodotto_standard_id === 's-cf', 'non eredita lo standard di chi ce l’aveva');
  return 'vince il tenuto, e lo dice';
});

/* ═══ LA VALIDAZIONE ═══════════════════════════════════════════════════════ */

prova('un doppione scritto a mano si ferma prima di entrare', () => {
  const v = C.valida({ compagnia_id: 'c-hdi', ramo: 'beni', nome: 'globale casa 2019' },
    { prodotti: PRODOTTI, standard: STANDARD });
  deve(!v.ok, 'accetta un nome che esiste già');
  deve(/si fondono/.test(v.errori.join(' ')), 'non dice che cosa fare: ' + v.errori.join(' | '));
  /* E il doppione lo trova anche per alias, che è il caso peggiore: due righe
     che il database accetterebbe e l'import continuerebbe a confondere. */
  const w = C.valida({ compagnia_id: 'c-hdi', ramo: 'beni', nome: 'Casa · HDI Globale Casa 2019' },
    { prodotti: PRODOTTI, standard: STANDARD });
  deve(!w.ok, 'accetta un nome che è già un alias');
  return 'nome e alias';
});

prova('il ramo lo decide la libreria, non il nome commerciale', () => {
  const v = C.valida({ compagnia_id: 'c-prima', ramo: 'beni', nome: 'Qualcosa', prodotto_standard_id: 's-rca' },
    { prodotti: PRODOTTI, standard: STANDARD });
  deve(!v.ok, 'accetta un prodotto su un ramo diverso da quello del suo standard');
  const w = C.valida({ compagnia_id: 'c-prima', ramo: 'nautica', nome: 'Barca' },
    { prodotti: PRODOTTI, standard: STANDARD });
  deve(w.ok, 'rifiuta un ramo che non conosce invece di segnalarlo');
  deve(w.avvisi.length === 1 && /nessuna tendina/.test(w.avvisi[0]), 'non avvisa: ' + w.avvisi.join(' | '));
  const z = C.valida({ compagnia_id: 'c-prima', ramo: 'rca', nome: 'X', dal: '2026-05-01', al: '2026-01-01' },
    { prodotti: PRODOTTI, standard: STANDARD });
  deve(!z.ok, 'accetta una validità che finisce prima di cominciare');
  return 'errore sul ramo dello standard, avviso sul ramo sconosciuto';
});

/* ═══ LA COPERTURA ═════════════════════════════════════════════════════════ */

prova('la copertura dice da dove cominciare, non solo quanto manca', () => {
  /* Senza questo elenco si configura a memoria e ci si accorge del buco
     quando una tendina esce vuota (§28). */
  const c = C.copertura(RIGHE, COMPAGNIE, PRODOTTI);
  deve(c.totale === RIGHE.length, 'ha perso delle righe');
  deve(c.dentro === 2, 'coperte ' + c.dentro + ' invece di 2');
  /* In cima quelle con più righe sotto: chi guarda deve vedere per prima la
     cosa che vale di più. */
  deve(c.fuori[0].n >= c.fuori[c.fuori.length - 1].n, 'non è ordinata per peso');
  const plurima = c.fuori.filter(x => x.compagnia === 'Plurima');
  deve(plurima.length && /compagnia non/.test(plurima[0].motivo),
    'non distingue «la compagnia non c’è» da «il prodotto non c’è»: ' + JSON.stringify(plurima[0]));
  return c.dentro + ' su ' + c.totale + ' coperte, ' + c.fuori.length + ' cose da decidere';
});

console.log('\n══ IL CATALOGO PRODOTTI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCATALOGO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
