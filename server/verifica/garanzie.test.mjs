// ═══════════════════════════════════════════════════════════════════════════════
//  LE GARANZIE DI UNA POLIZZA
//
//  Le forme sono quelle VERE, copiate dall'archivio il 28/09/2026 con una
//  lettura del database, non inventate: una prova che usa valori immaginati
//  non vede i valori veri (regola di casa, `IAM_TEST_PLAN.md` §1). Prima
//  scrive sotto `dati.ssf.garanzie` con `lordo/netto/tasse/ssn`, HDI alla
//  radice `dati.garanzie` con `premio_lordo/premio_netto/massimale/bene`.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const G = require(path.join(QUI, '..', '..', 'tariffe', 'motore', 'garanzie.js'));

let ok = 0, ko = 0;
const prova = (nome, fn) => { try { fn(); ok++; console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Una polizza Prima vera: RCA + infortuni + assistenza, come sta in archivio.
   Massimale e franchigia arrivano `null`, ed è il caso normale: su 11.131
   garanzie di Prima sono vuoti 11.131 volte. */
const PRIMA = {
  premio_annuo: 510,
  dati: { ssf: { garanzie: [
    { ssn: 29.59, lordo: 356.4, netto: 281.73, tasse: 74.67, codice: 'RCA', massimale: null, franchigia: null, descrizione: 'RCA' },
    { ssn: 0, lordo: 78, netto: 73.7, tasse: 4.3, codice: 'INFORTUNI_CONDUCENTE', massimale: null, franchigia: null, descrizione: 'INFORTUNI_CONDUCENTE' },
    { ssn: 0, lordo: 75.6, netto: 68.21, tasse: 7.39, codice: 'ASSISTENZA_STRADALE', massimale: null, franchigia: null, descrizione: 'ASSISTENZA_STRADALE' }
  ] } }
};

/* Una polizza HDI vera: descrizioni già in italiano, massimale su alcune
   righe e non su altre, e il bene su cui è appesa la garanzia. */
const HDI = {
  premio_annuo: 467,
  dati: { garanzie: [
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '100101', massimale: 7750000, descrizione: 'RCA', premio_lordo: 360.52 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '100112', massimale: 0, descrizione: 'RVE - Rinuncia/Limitazione alla Rivalsa - Estesa', premio_lordo: 39.69 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '010902', massimale: 30000, descrizione: 'Infortuni del Conducente', premio_lordo: 35.77 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '180129', massimale: 0, descrizione: 'Servizio Assistenza Basic', premio_lordo: 18.01 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '170125', massimale: 20000, descrizione: 'Tutela Legale della Circolazione Basic', premio_lordo: 13.01 }
  ] }
};

console.log('\nLE GARANZIE DI UNA POLIZZA');

// ── i nomi ───────────────────────────────────────────────────────────────────

prova('un codice di Prima diventa un nome che si può leggere al telefono', () => {
  deve(G.nome({ codice: 'INFORTUNI_CONDUCENTE', descrizione: 'INFORTUNI_CONDUCENTE' }) === 'Infortuni del conducente',
    G.nome({ codice: 'INFORTUNI_CONDUCENTE', descrizione: 'INFORTUNI_CONDUCENTE' }));
  deve(G.nome({ codice: 'COLLISIONE_VEICOLI_NON_ASSICURATI', descrizione: 'COLLISIONE_VEICOLI_NON_ASSICURATI' })
    === 'Collisione con veicoli non assicurati');
});

prova('tutti e 19 i codici veri dell\'archivio hanno un nome', () => {
  /* I 19 contati il 28/09/2026. Se ne arriva un ventesimo questa prova non se
     ne accorge — quello lo dice `nome()`, che lascia passare il codice. */
  const veri = ['RCA', 'INFORTUNI_CONDUCENTE', 'ASSISTENZA_STRADALE', 'TUTELA_LEGALE', 'BONUS_PROTETTO',
    'FURTO_INCENDIO', 'CRISTALLI', 'EVENTI_NATURALI', 'INFORTUNI_DOMESTICI', 'EVENTI_SOCIOPOLITICI',
    'CONSULTO_LEGALE', 'ASSISTENZA_DOMESTICA', 'COLLISIONE', 'COLLISIONE_VEICOLI_NON_ASSICURATI',
    'RC_VITA_PRIVATA', 'COLLISIONE_ANIMALI_SELVATICI', 'RC_ANIMALI_DOMESTICI', 'RC_BICI_ELETTRICHE', 'KASKO'];
  const senza = veri.filter(c => !G.NOMI[c]);
  deve(!senza.length, 'codici senza nome: ' + senza.join(', '));
  deve(veri.length === 19, 'i codici veri sono 19, qui ne conto ' + veri.length);
});

prova('nessun nome tradotto resta in maiuscolo con gli underscore', () => {
  /* Il difetto che questa tabella esiste per togliere: se un nome fosse
     rimasto com'era, a schermo ci sarebbe ancora «BONUS_PROTETTO». */
  const brutti = Object.keys(G.NOMI).filter(c => /_/.test(G.NOMI[c]) || G.NOMI[c] === c);
  deve(!brutti.length, 'nomi non tradotti: ' + brutti.join(', '));
});

prova('il codice basta da solo: si traduce anche senza descrizione', () => {
  /* Il flusso può mandare la descrizione vuota. Il codice però c'è sempre, ed
     è da lì che deve uscire il nome — altrimenti a schermo resta «RCA» nudo
     su una riga e il nome vero su quella accanto. */
  deve(G.nome({ codice: 'RCA', descrizione: '' }) === 'Responsabilità civile auto',
    G.nome({ codice: 'RCA', descrizione: '' }));
  deve(G.nome({ codice: 'BONUS_PROTETTO' }) === 'Bonus protetto', G.nome({ codice: 'BONUS_PROTETTO' }));
});

prova('una descrizione già scritta in italiano non si tocca', () => {
  deve(G.nome({ codice: '170125', descrizione: 'Tutela Legale della Circolazione Basic' })
    === 'Tutela Legale della Circolazione Basic');
});

prova('un codice sconosciuto si mostra com\'è, non si inventa un nome', () => {
  deve(G.nome({ codice: 'XY_MAI_VISTA', descrizione: 'XY_MAI_VISTA' }) === 'XY_MAI_VISTA');
  deve(G.nome({}) === 'Garanzia senza nome');
});

// ── le due forme diventano una ───────────────────────────────────────────────

prova('le garanzie di Prima si trovano sotto dati.ssf', () => {
  const t = G.dallaPolizza(PRIMA);
  deve(t.fonte === 'ssf' && t.lista.length === 3, JSON.stringify({ f: t.fonte, n: t.lista.length }));
});

prova('e quelle di HDI alla radice di dati', () => {
  /* Il 25/09 la scheda guardava solo nel primo posto: le garanzie HDI erano
     in archivio, tutte, e a schermo c'era un vuoto. */
  const t = G.dallaPolizza(HDI);
  deve(t.fonte === 'hdi' && t.lista.length === 5, JSON.stringify({ f: t.fonte, n: t.lista.length }));
});

prova('una polizza inserita a mano non ha garanzie, e lo si sa', () => {
  const t = G.dallaPolizza({ dati: {} });
  deve(t.fonte === null && t.lista.length === 0, JSON.stringify(t));
});

prova('`premio_lordo` di HDI e `lordo` di Prima diventano lo stesso campo', () => {
  deve(G.normalizza({ premio_lordo: 360.52 }).lordo === 360.52);
  deve(G.normalizza({ lordo: 356.4 }).lordo === 356.4);
  deve(G.normalizza({ premio_netto: 300 }).netto === 300);
});

prova('un importo scritto all\'italiana si legge lo stesso', () => {
  deve(G.normalizza({ lordo: '1.234,56' }).lordo === 1234.56, String(G.normalizza({ lordo: '1.234,56' }).lordo));
  deve(G.normalizza({ lordo: '356.40' }).lordo === 356.4);
});

prova('«non dichiarato» non diventa zero', () => {
  /* Una franchigia a zero e una franchigia non dichiarata sono due risposte
     diverse, e scambiarle vuol dire dire a un cliente che non ne ha una. */
  const g = G.normalizza({ franchigia: '', massimale: null, lordo: 10 });
  deve(g.franchigia === null && g.massimale === null, JSON.stringify(g));
  deve(G.normalizza({ massimale: 0, lordo: 10 }).massimale === 0, 'uno zero dichiarato deve restare zero');
});

// ── le colonne ───────────────────────────────────────────────────────────────

prova('su Prima non compaiono le colonne massimale e franchigia', () => {
  /* Sono vuote su tutte e 11.131 le garanzie in archivio: due colonne di
     trattini su ogni polizza, e a forza di trattini si smette di guardare. */
  const c = G.scheda(PRIMA).colonne;
  deve(!c.includes('massimale') && !c.includes('franchigia'), c.join(', '));
  deve(c.includes('netto') && c.includes('tasse'), 'mancano colonne che hanno valori: ' + c.join(', '));
});

prova('su HDI il massimale compare, perché ce l\'ha', () => {
  const c = G.scheda(HDI).colonne;
  deve(c.includes('massimale'), c.join(', '));
  deve(c.includes('bene'), 'il bene assicurato non compare: ' + c.join(', '));
  deve(!c.includes('tasse'), 'compare una colonna che HDI non manda: ' + c.join(', '));
});

prova('una colonna con anche un solo valore compare', () => {
  const c = G.colonne([{ lordo: 10, franchigia: null }, { lordo: 5, franchigia: 300 }]);
  deve(c.includes('franchigia'), c.join(', '));
});

prova('una franchigia di zero è una risposta, e la colonna compare lo stesso', () => {
  /* «Franchigia zero» vuol dire «non paghi niente di tasca tua»: è la cosa
     che il cliente chiede. Far sparire la colonna perché zero è falso
     equivale a non rispondergli. */
  const c = G.colonne([{ lordo: 10, franchigia: 0 }, { lordo: 5, franchigia: 0 }]);
  deve(c.includes('franchigia'), 'una colonna di zeri dichiarati sparisce: ' + c.join(', '));
});

// ── i totali e la quadratura ─────────────────────────────────────────────────

prova('il totale delle garanzie è la somma dei loro lordi', () => {
  const t = G.scheda(PRIMA).totali;
  deve(t.quante === 3, 'quante: ' + t.quante);
  deve(t.lordo === 510, 'lordo: ' + t.lordo);       // 356,40 + 78,00 + 75,60
  deve(t.netto === 423.64, 'netto: ' + t.netto);    // 281,73 + 73,70 + 68,21
});

prova('un totale non si somma con quello che non c\'è', () => {
  /* Se nessuna garanzia porta il netto, il totale del netto è `null` e non
     zero: «zero euro di netto» su una polizza da 500 € è un numero falso. */
  const t = G.totali([{ lordo: 10 }, { lordo: 20 }]);
  deve(t.lordo === 30 && t.netto === null, JSON.stringify(t));
});

prova('quando le garanzie sommano al premio, si dice che quadra', () => {
  const q = G.scheda(PRIMA).quadratura;
  deve(q.esito === 'quadra', q.esito + ' — ' + q.spiega);
  deve(q.scarto === 0, 'scarto: ' + q.scarto);
});

prova('i centesimi in virgola mobile non fanno sballare la quadratura', () => {
  /* 144,51 + 9,03 + 22,40 + 9,49 esce 185,42999999999998. */
  const q = G.quadratura([{ lordo: 144.51 }, { lordo: 9.03 }, { lordo: 22.40 }, { lordo: 9.49 }], 185.43);
  deve(q.esito === 'quadra', q.esito + ' scarto ' + q.scarto);
});

prova('un centesimo di arrotondamento si perdona, due no', () => {
  /* La compagnia arrotonda ogni garanzia per conto suo e poi il totale
     un'altra volta: l'ultima cifra può ballare di uno. Due centesimi invece
     sono soldi che mancano, e vanno detti. */
  deve(G.quadratura([{ lordo: 185.42 }], 185.43).esito === 'quadra', 'un centesimo grida allo scostamento');
  deve(G.quadratura([{ lordo: 185.44 }], 185.43).esito === 'quadra', 'un centesimo in più grida allo scostamento');
  const due = G.quadratura([{ lordo: 185.41 }], 185.43);
  deve(due.esito === 'non_quadra', 'due centesimi passano per quadrati: ' + due.esito);
  deve(due.scarto === -0.02, 'scarto: ' + due.scarto);
});

prova('quando non quadra si dice DI QUANTO, e da che parte', () => {
  const q = G.quadratura([{ lordo: 100 }], 130);
  deve(q.esito === 'non_quadra', q.esito);
  deve(q.scarto === -30, 'scarto: ' + q.scarto);
  deve(/mancano 30,00/.test(q.spiega), q.spiega);
  const q2 = G.quadratura([{ lordo: 160 }], 130);
  deve(/avanzano 30,00/.test(q2.spiega), q2.spiega);
});

prova('senza il premio della polizza non si dice né sì né no', () => {
  /* Un «quadra» detto senza avere il secondo numero è una rassicurazione
     costruita sul nulla. */
  const q = G.quadratura([{ lordo: 100 }], null);
  deve(q.esito === 'non_si_puo_dire', q.esito);
  deve(/non dichiara il premio/.test(q.spiega), q.spiega);
});

prova('senza importi sulle garanzie nemmeno', () => {
  const q = G.quadratura([{ lordo: null }], 200);
  deve(q.esito === 'non_si_puo_dire', q.esito + ' — ' + q.spiega);
});

// ── l'ordine ─────────────────────────────────────────────────────────────────

prova('le garanzie si leggono dalla più cara alla più economica', () => {
  /* Chi apre una polizza vuole sapere prima che cosa pesa: la RCA da 356 €
     non può stare sotto il consulto legale da zero. */
  const l = G.scheda(HDI).lista.map(g => g.lordo);
  const ordinata = [...l].sort((a, b) => b - a);
  deve(JSON.stringify(l) === JSON.stringify(ordinata), l.join(' · '));
  deve(l[0] === 360.52, 'la prima è ' + l[0]);
});

prova('la scheda di HDI porta i nomi italiani e il bene assicurato', () => {
  const s = G.scheda(HDI);
  deve(s.lista[0].nome === 'RCA', s.lista[0].nome);
  deve(/PEUGEOT/.test(s.lista[0].bene), s.lista[0].bene);
  deve(s.totali.lordo === 467, 'totale: ' + s.totali.lordo);
  deve(s.quadratura.esito === 'quadra', s.quadratura.esito);
});

prova('la scheda di una polizza senza garanzie non esplode', () => {
  const s = G.scheda({ dati: {}, premio_annuo: 300 });
  deve(s.lista.length === 0 && s.colonne.length === 0, JSON.stringify(s.colonne));
  deve(s.quadratura.esito === 'non_si_puo_dire', s.quadratura.esito);
  deve(G.scheda(null).lista.length === 0, 'nemmeno senza polizza');
});

prova('normalizzare non tocca la garanzia che arriva dall\'archivio', () => {
  /* Scrivere dentro l'oggetto letto dal database vuol dire che la seconda
     apertura della scheda vede dati diversi dalla prima. */
  const originale = { lordo: 10, codice: 'RCA', descrizione: 'RCA' };
  const copia = JSON.parse(JSON.stringify(originale));
  G.normalizza(originale);
  deve(JSON.stringify(originale) === JSON.stringify(copia), 'la garanzia è stata modificata');
});

console.log(`\nGARANZIE: ${ok} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
