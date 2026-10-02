// ═══════════════════════════════════════════════════════════════════════════════
//  LA GUIDA ALLE GARANZIE
//
//  02/10/2026. Il documento che l'agenzia consegna al cliente: prende
//  «RC capofamiglia 1.000.000 €» e lo trasforma in «tuo figlio, in bicicletta,
//  urta un passante».
//
//  LE RIGHE DI PROVA SONO QUELLE VERE, copiate dal preventivo n.4 (famiglia
//  Tammaro / Tortorici) com'è scritto in archivio. Non è un vezzo: sono scritte
//  a mano, hanno i doppi spazi, un refuso («Laste» per «Lastre»), una garanzia
//  che porta due unità di misura diverse nella stessa riga, e i titoli di
//  sezione in mezzo alle garanzie. Una prova con righe pulite e inventate
//  direbbe che tutto funziona, e funzionerebbe su niente.
//
//  La cosa che queste prove difendono più di ogni altra: che non esca MAI un
//  esempio sbagliato. Questo foglio va a un cliente con sopra il nome
//  dell'agenzia, e un esempio che racconta un sinistro non coperto è un
//  problema di adeguatezza, non una frase infelice.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const require = createRequire(import.meta.url);
const G = require(path.join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js'));
const C = require(path.join(RADICE, 'tariffe', 'motore', 'confronto.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Preventivo n.4, `descrizioni`, letto dal database il 02/10/2026. Verbatim. */
const VERE = [
  'ABITAZIONE |  RC Abitazione 1.000.000 €',
  'RC Capo  Famiglia 1.000.000 €',
  'Incendio Fabbricato 130.000 €',
  'Incendio Contenuto 26.000 €',
  "Ricerca e Riparazione del danno d' acqua 1.500 €",
  'Laste 1.000 €',
  'Fenomeno Elettrico 1.500 €',
  'Tutela Legale VITA Privata 10.000 €',
  'INFORTUNI FAMIGLIA',
  'Invalidità permanente  massimale 100.000 € a Persona',
  'Rimborso spese mediche da infortunio 5.000 € a Persona',
  'Diaria giornaliera da ricovero e post ricovero  50 € al giorno ( marito + moglie ), 20 € al giorno ( per figlio )',
  'Diaria giornaliera da gessatura 25 € al giorno ( marito + moglie ), 10 € al giorno ( per figlio )',
  'Rendita vitaliza da infortuni 1000€ al mese ( marito + moglie ), 500 € al giorno ( per figlio )',
  'PROTEZIONE VITA',
  'Copertura Vita - TAMMARO VINCENZO 250.000 € ( durata 20 anni )',
  'Copertura Vita - Tortorici Alessandra 100.000 € ( durata 20 anni )',
];

const g = G.guida(VERE);
const tutte = g.sezioni.flatMap(s => s.schede);
const per = (frammento) => tutte.find(c => new RegExp(frammento, 'i').test(c.nome));
const sezioneDi = (frammento) =>
  (g.sezioni.find(s => s.schede.some(c => new RegExp(frammento, 'i').test(c.nome))) || {}).titolo;

// ── 1. leggere le righe scritte a mano ───────────────────────────────────────

prova('gli importi all\'italiana si leggono giusti', () => {
  /* «1.000.000 €» letto all'inglese farebbe uno. */
  deve(G.importo('RC Abitazione 1.000.000 €') === 1000000, G.importo('RC Abitazione 1.000.000 €'));
  deve(G.importo('Incendio Fabbricato 130.000 €') === 130000, 'centotrentamila');
  deve(G.importo('1000€ al mese') === 1000, 'senza separatore e senza spazio');
  deve(G.importo('niente di niente') === null, 'si è inventato un importo dove non c\'è');
});

prova('gli importi si scrivono tutti con lo stesso metro', () => {
  /* `Intl` rende 1.000.000 € ma 1000 €: il raggruppamento automatico salta il
     separatore sui numeri di quattro cifre, e su un foglio al cliente «1000 €»
     accanto a «130.000 €» è sciatto. */
  deve(G.euro(1000) === '1.000 €', G.euro(1000));
  deve(G.euro(1000000) === '1.000.000 €', G.euro(1000000));
  deve(G.euro(1500.5) === '1.500,50 €', G.euro(1500.5));
  deve(G.euro(0) === '0 €', 'zero è un importo vero');
  deve(G.euro(null) === null, 'un importo che non c\'è non si scrive');
});

prova('un titolo di sezione non diventa una garanzia', () => {
  /* «INFORTUNI FAMIGLIA» e «PROTEZIONE VITA» sono capitoli. Trattarli da
     garanzia metterebbe nella guida una scheda col nome di un capitolo e
     nessun importo. */
  deve(G.leggiRiga('INFORTUNI FAMIGLIA', ['salute']).tipo === 'titolo', 'INFORTUNI FAMIGLIA');
  deve(G.leggiRiga('PROTEZIONE VITA', ['vita']).tipo === 'titolo', 'PROTEZIONE VITA');
  deve(!tutte.some(c => /^INFORTUNI FAMIGLIA$|^PROTEZIONE VITA$/i.test(c.nome)),
    'un titolo è finito fra le schede: ' + tutte.map(c => c.nome).join(' / '));
});

prova('le parole di riempimento escono dal nome', () => {
  /* «Invalidità permanente  massimale 100.000 €»: col «massimale» attaccato,
     sulla scheda del cliente il titolo non è il nome di niente. */
  const x = per('invalidit');
  deve(x && x.nome === 'Invalidità permanente', 'nome: «' + (x && x.nome) + '»');
});

prova('due importi sulla stessa riga si leggono tutt\'e due, con chi e con l\'unità', () => {
  const d = per('ricovero');
  deve(d, 'la diaria non c\'è');
  deve(d.voci.length === 2, 'importi letti: ' + d.voci.length);
  deve(d.voci[0].valore === 50 && d.voci[0].unita === 'giorno', JSON.stringify(d.voci[0]));
  deve(/marito/i.test(d.voci[0].chi || ''), 'non dice a chi: ' + d.voci[0].chi);
  deve(/50 € al giorno/.test(d.importo) && /20 € al giorno/.test(d.importo), d.importo);
});

prova('fra due unità vince la PIÙ VICINA all\'importo, non la prima dell\'elenco', () => {
  /* Il difetto del 02/10/2026. Sulle righe vere non si vedeva per caso:
     «( marito + moglie ),» spinge il secondo «al giorno» oltre la finestra di
     quaranta caratteri, e il primo importo leggeva «al mese» per fortuna.
     Qui la riga è compatta — e senza la regola della vicinanza il motore legge
     due volte «al giorno», cioè smette di vedere l'incoerenza che è il motivo
     per cui esiste. */
  const x = G.leggiRiga('Rendita vitaliza 1000€ al mese, 500 € al giorno', ['vita']);
  deve(x.voci.length === 2, 'importi letti: ' + x.voci.length);
  deve(x.voci[0].unita === 'mese', 'il primo importo legge «' + x.voci[0].unita + '» invece di «mese»');
  deve(x.voci[1].unita === 'giorno', 'il secondo legge «' + x.voci[1].unita + '»');
  const v = G.guida(['Rendita vitaliza 1000€ al mese, 500 € al giorno']);
  deve(v.daConfermare.some(m => /due unità diverse/i.test(m)),
    'con le due unità lette uguali l\'incoerenza sparisce: ' + JSON.stringify(v.daConfermare));
});

prova('la franchigia dichiarata si legge', () => {
  const x = G.leggiRiga('Fenomeno Elettrico : 15.000 € - Franchigia 500 €', ['casa']);
  deve(x.franchigia === 500, 'franchigia: ' + x.franchigia);
});

// ── 2. le garanzie finiscono nella sezione giusta ────────────────────────────

prova('IL DIFETTO DELLE SIGLE: «ricerca» non è «rca»', () => {
  /* Trovato il 02/10/2026 sul prospetto vero. «Ricerca e Riparazione del danno
     d'acqua» finiva su `rca`, perché dentro «ri-ce-RCA» le tre lettere ci
     sono: sulla guida del cliente una garanzia della casa compariva sotto
     «Veicoli». Le sigle corte — rca, rct, rco, tcm — ci cascano tutte. */
  deve(C.normalizza('auto', "Ricerca e Riparazione del danno d' acqua") === null,
    'la sigla combacia ancora dentro una parola');
  deve(C.normalizza('casa', "Ricerca e Riparazione del danno d' acqua") === 'danni_acqua',
    'e adesso non si riconosce più la garanzia giusta');
  deve(/casa/i.test(sezioneDi('ricerca')), 'la ricerca del danno d\'acqua sta in «' + sezioneDi('ricerca') + '»');
});

prova('ma le sigle vere continuano a funzionare', () => {
  deve(C.normalizza('auto', 'RCA') === 'rca', 'RCA secca');
  deve(C.normalizza('auto', 'Garanzia RCA autovetture') === 'rca', 'RCA in mezzo a una frase');
  deve(C.normalizza('azienda', 'RCT') === 'rct', 'RCT');
  deve(C.normalizza('azienda', 'Contratto di appalto') === null, 'RCT dentro «contratto»');
});

prova('il nome della garanzia è quello in TESTA, non la parola più lunga', () => {
  /* «Rendita vitalizia DA INFORTUNI» è una rendita. Con la sola regola della
     lunghezza finiva su `infortuni`, che è la parola più lunga, e la scheda
     raccontava l'esempio sbagliato. */
  deve(C.normalizza('vita', 'Rendita vitaliza da infortuni') === 'rendita',
    'ancora: ' + C.normalizza('vita', 'Rendita vitaliza da infortuni'));
  /* La prova di sopra, da sola, NON misura niente: nel ramo «vita» la garanzia
     `infortuni` non esiste, quindi non c'è nessuna gara da vincere. Il difetto
     vero si vede sulla guida, che cerca in più rami in fila — ed è lì che la
     rendita finiva fra gli infortuni. L'ha detto la controprova. */
  const r = per('rendita');
  deve(r && r.id === 'rendita', 'sulla guida la rendita è diventata: ' + (r && r.id));
  deve(/futuro/i.test(sezioneDi('rendita')),
    'la rendita è finita in «' + sezioneDi('rendita') + '» invece che fra le prestazioni che guardano avanti');
  /* E la regola di prima non si è rotta: a parità di inizio vince il più lungo. */
  deve(C.normalizza('auto', 'Garanzia Furto e Incendio del veicolo') === 'furto_incendio',
    'furto e incendio si è spezzato');
});

prova('RC abitazione e RC capofamiglia restano due garanzie diverse', () => {
  /* La prima risponde del fabbricato, la seconda della vita privata. I
     prospetti le portano tutt'e due con due massimali: confonderle vorrebbe
     dire contarne una sola, e perdere un milione di copertura per strada. */
  const a = per('RC Abitazione'), b = per('Capo.?Famiglia');
  deve(a && b, 'ne manca una: ' + tutte.map(c => c.nome).join(' / '));
  deve(a.id === 'rc_abitazione' && b.id === 'rc_capofamiglia', a.id + ' / ' + b.id);
  deve(a.esempio !== b.esempio, 'hanno lo stesso esempio: sono diventate la stessa garanzia');
});

prova('le tre pagine della guida vera ci sono tutte', () => {
  const titoli = g.sezioni.map(s => s.titolo);
  for (const atteso of ['Casa e responsabilità civile', 'Imprevisti e infortuni', 'Famiglia e futuro']) {
    deve(titoli.includes(atteso), 'manca «' + atteso + '»: ' + titoli.join(' / '));
  }
  deve(!titoli.includes('Veicoli'), 'c\'è una sezione «Veicoli» su un prospetto casa e famiglia');
  /* La numerazione si rifà sulle sezioni che ESISTONO: una guida che salta dal
     01 al 04 fa pensare che manchino delle pagine. */
  deve(g.sezioni.map(s => s.numero).join(',') === g.sezioni.map((_, i) => String(i + 1).padStart(2, '0')).join(','),
    'la numerazione salta: ' + g.sezioni.map(s => s.numero).join(','));
});

// ── 3. quello che la guida NON deve fare ─────────────────────────────────────

prova('una garanzia sconosciuta non si prende l\'esempio di un\'altra', () => {
  /* «Laste» è il refuso di «Lastre» che sta sul prospetto vero. Attaccarle
     l'esempio dei cristalli sarebbe la bugia più facile da non notare. */
  const x = per('Laste');
  deve(x, 'il refuso è sparito dalla guida invece di comparire');
  deve(x.esempio === null, 'si è inventato un esempio: ' + x.esempio);
  deve(/1\.000 €/.test(x.importo), 'ha perso l\'importo: ' + x.importo);
  deve(x.daConfermare === true, 'non si dichiara da confermare');
  deve(g.daConfermare.some(m => /Laste/.test(m)), 'non finisce nell\'elenco: ' + JSON.stringify(g.daConfermare));
});

prova('L\'INCOERENZA DELLE UNITÀ si trova da sola', () => {
  /* Sul prospetto vero: «Rendita vitalizia 1000€ al mese (marito+moglie),
     500 € al giorno (per figlio)». La guida fatta a mano l'aveva vista e
     scritta: «unità temporale da confermare, possibile refuso». */
  const x = per('rendita');
  deve(x, 'la rendita non c\'è');
  deve(x.daConfermare === true, 'mese contro giorno e non dice niente');
  deve(g.daConfermare.some(m => /due unità diverse/i.test(m) && /mese/.test(m) && /giorno/.test(m)),
    'non spiega l\'incoerenza: ' + JSON.stringify(g.daConfermare));
});

prova('la copertura vita non si fa passare per una TCM', () => {
  /* Il prospetto dice «Copertura Vita 250.000 € (durata 20 anni)» e NON dice
     che contratto sia. Stamparci sopra l'esempio di una temporanea caso morte
     sarebbe inventare il contratto del cliente. */
  const x = per('Copertura Vita');
  deve(x, 'la copertura vita non c\'è');
  deve(x.id === 'vita_generica', 'è stata presa per un\'altra cosa: ' + x.id);
  deve(/^Se la copertura è/i.test(x.esempio), 'l\'esempio non è al condizionale: ' + x.esempio);
  deve(/tipologia della copertura va confermata/i.test(x.attenzione || ''), 'manca l\'avvertenza: ' + x.attenzione);
  deve(x.daConfermare === true, 'non si dichiara da confermare');
});

prova('ogni esempio parla al condizionale, mai al presente che promette', () => {
  /* La regola che tiene fuori l'agenzia dai guai: la guida ILLUSTRA, non
     promette. A dire se un sinistro è indennizzabile sono le condizioni. */
  /* NIENTE `\b` INTORNO ALLE PAROLE ACCENTATE. In JavaScript il confine di
     parola è ASCII: dopo la «ò» di «può» non c'è nessun confine, perché né la
     «ò» né lo spazio che la segue sono caratteri di parola. Con `\bpuò\b` la
     prima stesura di questa prova bocciava tredici esempi che erano scritti
     benissimo — cioè diceva il contrario della verità. */
  /* «Per causa coperta» e «nei limiti previsti» sono cautele vere, non giri di
     parole: dicono che l'indennizzo dipende dal contratto. Su una temporanea
     caso morte scrivere «può essere liquidato» sarebbe anzi meno onesto — se
     la causa è coperta, il capitale si paga. */
  const PRUDENTI = /(può|possono|sono ammesse|sono rimborsabili|se la copertura|è prevista|riguarda|secondo le prestazioni|risarcisce i terzi|per causa coperta|nei limiti)/i;
  const secchi = Object.entries(G.ESEMPI)
    .filter(([, e]) => !PRUDENTI.test(e.esempio)).map(([id]) => id);
  deve(secchi.length === 0, 'esempi scritti come promesse: ' + secchi.join(', '));
  /* E la controprova dentro la prova: una frase che promette deve essere
     riconosciuta come tale, o questa prova non misura niente. */
  deve(!PRUDENTI.test('La garanzia copre il furto della bicicletta.'),
    'la prova accetta anche una frase che promette: non sta misurando niente');
});

prova('ogni esempio è agganciato a una garanzia che esiste nel vocabolario', () => {
  /* Un esempio con un identificativo sbagliato non si stampa mai e nessuno se
     ne accorge: è una scheda morta. */
  const orfani = [];
  for (const id of Object.keys(G.ESEMPI)) {
    const vive = Object.keys(C.VOCABOLARIO).some(r => (C.VOCABOLARIO[r] || []).some(x => x.id === id));
    if (!vive) orfani.push(id);
  }
  deve(orfani.length === 0, 'esempi agganciati a garanzie che non esistono: ' + orfani.join(', '));
});

prova('ogni esempio finisce in una sezione che esiste', () => {
  const sezioni = G.SEZIONI.map(s => s.id);
  const sbagliate = Object.entries(G.ESEMPI)
    .filter(([, e]) => !sezioni.includes(e.sezione)).map(([id]) => id);
  deve(sbagliate.length === 0, 'sezioni inesistenti: ' + sbagliate.join(', '));
});

prova('senza niente di leggibile la guida si rifiuta, invece di uscire vuota', () => {
  const v = G.guida(['', '   ', 'PROTEZIONE VITA']);
  deve(!v.ok, 'ha scritto una guida su niente');
  deve(/non si inventa/i.test(v.motivo), v.motivo);
});

prova('il piede dice sempre che è un documento illustrativo', () => {
  deve(/illustrativo/i.test(g.piede) && /non sostitutivo/i.test(g.piede), g.piede);
  deve(/franchigie/i.test(g.piede) && /esclusioni/i.test(g.piede),
    'il piede non nomina franchigie ed esclusioni: ' + g.piede);
});

prova('sul prospetto vero: 15 schede, 14 con esempio, 4 da confermare', () => {
  /* I numeri misurati sul preventivo n.4. Se cambiano, è cambiato qualcosa:
     va guardato, non aggiornato di riflesso. */
  deve(g.schede === 15, 'schede: ' + g.schede);
  deve(g.conEsempio === 14, 'con esempio: ' + g.conEsempio + ' (solo «Laste» deve restare senza)');
  deve(g.daConfermare.length === 4, 'da confermare: ' + g.daConfermare.length + ' — ' + JSON.stringify(g.daConfermare));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nGUIDA ALLE GARANZIE');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nGUIDA: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
