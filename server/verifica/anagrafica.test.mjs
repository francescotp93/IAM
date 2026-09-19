// ═══════════════════════════════════════════════════════════════════════════════
//  L'ANAGRAFICA DEL CLIENTE — tariffe/motore/anagrafica.js  (19/09/2026, M3)
//
//  Le prove che, se saltano, producono una data di nascita CREDIBILE E FALSA
//  (un refuso nel codice fiscale letto come una data), un'età sbagliata, un
//  augurio mandato a chi non ha dato il consenso.
//
//  Codici fiscali: quelli canonici degli esempi pubblici o costruiti qui con
//  il carattere di controllo calcolato — nessuna persona vera (§8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../../tariffe/motore/anagrafica.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };
const OGGI = '2026-09-19';

/* Costruisce un codice valido a partire dai quindici caratteri: è il modo
   di avere casi di prova che non siano persone. */
const cf = q => q + A.controllo(q);

prova('la data di nascita si ricava dal codice fiscale: anno, mese in lettera, giorno', () => {
  const n = A.nascita('RSSMRA80A01H501U', OGGI);
  deve(n && n.data === '1980-01-01' && n.sesso === 'M', 'RSSMRA80A01H501U → ' + JSON.stringify(n));
  /* Mese in lettera: H = giugno, T = dicembre. */
  deve(A.nascita(cf('BNCLRA90H15F205'), OGGI).data === '1990-06-15', 'H non è giugno');
  deve(A.nascita(cf('BNCLRA90T31F205'), OGGI).data === '1990-12-31', 'T non è dicembre');
  return '01/01/1980, giugno e dicembre';
});

prova('le donne hanno il giorno +40, e la regola del secolo guarda oggi', () => {
  const f = A.nascita(cf('NRENNA85D43G273'), OGGI);
  deve(f && f.data === '1985-04-03' && f.sesso === 'F', 'D43 → ' + JSON.stringify(f));
  /* Anno a due cifre: 26 ≤ 26 → 2026; 27 > 26 → 1927. È una stima e lo dice. */
  deve(A.nascita(cf('RSSMRA26A01H501'), OGGI).data === '2026-01-01', '26 non è 2026');
  deve(A.nascita(cf('RSSMRA27A01H501'), OGGI).data === '1927-01-01', '27 non è 1927');
  deve(A.nascita(cf('RSSMRA27A01H501'), OGGI).secolo === 'stimato', 'il secolo stimato non si dichiara');
  return 'F: 43 → 3; secolo da «oggi»';
});

prova('OMOCODIA: le lettere al posto delle cifre si sciolgono, e il controllo si calcola sul codice come scritto', () => {
  /* RSSMRA80A01H501 con le ultime tre cifre sostituite: 5→R, 0→L, 1→M. */
  const omo = cf('RSSMRA80A01HRLM');
  const n = A.nascita(omo, OGGI);
  deve(n && n.data === '1980-01-01' && n.omocodia === true, 'omocodico → ' + JSON.stringify(n));
  /* Anche l'anno può essere sostituito: 80 → UL (8→U, 0→L). */
  const omo2 = cf('RSSMRAULA01H501');
  deve(A.nascita(omo2, OGGI).data === '1980-01-01', 'anno omocodico non sciolto');
  /* Una lettera fuori dalla mappa in una posizione numerica NON è omocodia. */
  deve(!A.valido(cf('RSSMRA80A01HZ01')), 'una Z al posto di una cifra è passata per omocodia');
  return '3 lettere sciolte, controllo verificato sul codice scritto';
});

prova('UN CODICE NON VALIDO NON PRODUCE UNA DATA: refusi, controllo sbagliato, date inesistenti', () => {
  deve(A.nascita('RSSMRA80A01H501X', OGGI) === null, 'carattere di controllo sbagliato accettato');
  deve(A.nascita('RSSMRA80A01H50', OGGI) === null, 'codice corto accettato');
  deve(A.nascita('', OGGI) === null && A.nascita(null, OGGI) === null, 'vuoto accettato');
  deve(A.nascita('12345678901', OGGI) === null, 'una partita IVA è passata per codice fiscale');
  /* Mese in lettera che non esiste (F, G, I, …). */
  deve(A.nascita(cf('RSSMRA80F01H501'), OGGI) === null, 'mese F accettato');
  /* 31 aprile non esiste. */
  deve(A.nascita(cf('RSSMRA80D31H501'), OGGI) === null, 'il 31 aprile è passato per una data');
  /* Spazi e minuscole non sono un errore: si normalizzano. */
  deve(A.nascita(' rssmra80a01h501u ', OGGI).data === '1980-01-01', 'minuscole/spazi rifiutati');
  return 'sei modi di sbagliare, nessuna data inventata';
});

prova('l\'età si calcola al giorno, compiuta o no nell\'anno', () => {
  deve(A.eta('1980-01-01', '2026-09-19') === 46, 'compleanno passato');
  deve(A.eta('1980-09-19', '2026-09-19') === 46, 'compleanno oggi: li ha compiuti');
  deve(A.eta('1980-09-20', '2026-09-19') === 45, 'compleanno domani: non ancora');
  deve(A.eta(null, OGGI) === null && A.eta('', OGGI) === null, 'senza data inventa un\'età');
  deve(A.eta('2027-01-01', OGGI) === null, 'una nascita nel futuro ha un\'età');
  return '46, 46, 45 — e niente senza data';
});

prova('il compleanno di oggi, e il 29 febbraio si festeggia il 28 negli anni non bisestili', () => {
  deve(A.compleannoOggi('1980-09-19', '2026-09-19'), 'oggi non è riconosciuto');
  deve(!A.compleannoOggi('1980-09-18', '2026-09-19'), 'ieri è riconosciuto come oggi');
  deve(A.compleannoOggi('1996-02-29', '2026-02-28'), '29/02 non festeggiato il 28 in un anno non bisestile');
  deve(!A.compleannoOggi('1996-02-29', '2028-02-28'), '29/02 festeggiato il 28 in un anno bisestile');
  deve(A.compleannoOggi('1996-02-29', '2028-02-29'), '29/02 non festeggiato il 29 in un anno bisestile');
  return '29/02 gestito nei due versi';
});

prova('GDPR: gli auguri vanno solo a chi ha il consenso marketing E un recapito', () => {
  const oggi = '2026-09-19';
  const gente = [
    { id: 'a', nominativo: 'Rossi', data_nascita: '1980-09-19', consenso_marketing: true, email: 'r@x.it' },
    { id: 'b', nominativo: 'Verdi', data_nascita: '1975-09-19', consenso_marketing: false, email: 'v@x.it' },
    { id: 'c', nominativo: 'Neri', data_nascita: '1990-09-19', consenso_marketing: true },
    { id: 'd', nominativo: 'Bianchi', data_nascita: '1990-09-18', consenso_marketing: true, email: 'b@x.it' },
    { id: 'e', nominativo: 'Ditta Srl', tipo: 'giuridica', data_nascita: '1990-09-19', consenso_marketing: true, email: 'd@x.it' }
  ];
  const g = A.delGiorno(gente, oggi);
  deve(g.length === 3, 'compleanni di oggi: ' + g.length + ' (attesi 3: a, b, c — non d che è ieri né la società)');
  const per = id => g.find(x => x.anagrafica.id === id);
  deve(per('a').contattabile && per('a').email === 'r@x.it', 'chi ha consenso ed email non è contattabile');
  deve(!per('b').contattabile && /consenso/.test(per('b').motivo), 'senza consenso è contattabile, o il motivo non lo dice');
  deve(!per('c').contattabile && /recapito|email/.test(per('c').motivo), 'senza recapito è contattabile');
  deve(per('a').eta === 46, 'l\'età nell\'elenco: ' + per('a').eta);
  /* In elenco compare anche chi NON si può contattare: la lista serve a
     escludere a mano (sinistro aperto, contenzioso), non a nascondere. */
  return '3 in elenco, 1 contattabile, i motivi scritti';
});

prova('il testo degli auguri lo scrive il motore, con i segnaposto, e senza l\'età', () => {
  const t = A.testoAuguri(null, { nome: 'Mario', nominativo: 'ROSSI MARIO' }, 'With Us Assicurazioni', 'Anna Neri');
  deve(/Gentile Mario,/.test(t) && /With Us Assicurazioni/.test(t) && /Anna Neri/.test(t), 'segnaposto non sostituiti: ' + t);
  deve(!/\{/.test(t), 'un segnaposto è rimasto: ' + t);
  const p = A.testoAuguri('Ciao {nome}! Auguri da {agenzia}', { nominativo: 'VERDI LUCA' }, 'WU', '');
  deve(p === 'Ciao VERDI LUCA! Auguri da WU', 'il modello personalizzato non vale: ' + p);
  deve(!/\{eta\}/.test(A.TESTO_AUGURI), 'il modello di casa scrive l\'età: in un augurio non si fa');
  deve(A.numeroWhatsapp('333 123 4567') === '393331234567' && A.numeroWhatsapp('+39 333 1234567') === '393331234567', 'numero WhatsApp mal normalizzato');
  return 'segnaposto, modello personalizzato, numero normalizzato';
});

console.log('\n══ ANAGRAFICA DEL CLIENTE ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nANAGRAFICA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
