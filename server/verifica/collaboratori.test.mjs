// ═══════════════════════════════════════════════════════════════════════════════
//  I COLLABORATORI, UNA FONTE SOLA — tariffe/motore/collaboratori.js (21/09/2026)
//
//  Le prove che, saltando, mettono il nome di una persona accanto al lavoro di
//  un'altra: un abbinamento fatto per somiglianza, una tendina che perde chi è
//  stato disattivato, un nome composto in due modi diversi.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../../tariffe/motore/collaboratori.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const GENTE = [
  { id: 'p1', nome: 'Mario',  cognome: 'Rossi',  email: 'm.rossi@esempio.it',  attivo: true },
  { id: 'p2', nome: 'Anna',   cognome: 'Neri',   email: 'a.neri@esempio.it',   attivo: true },
  { id: 'p3', nome: 'Luigi',  cognome: 'Verdi',  email: 'l.verdi@esempio.it',  attivo: false },
  { id: 'p4', nome: 'Mario',  cognome: 'Rossi',  email: 'mario.rossi@esempio.it' }   /* attivo mai scritto */
];

prova('IL NOME SI COMPONE IN UN POSTO SOLO', () => {
  /* Tre tendine che se lo scrivono ognuna per conto suo sono tre modi di
     scrivere la stessa persona (§35). */
  deve(C.nome(GENTE[0]) === 'Rossi Mario', 'il nome non è «Cognome Nome»: ' + C.nome(GENTE[0]));
  deve(C.nome({ email: 'x@y.it' }) === 'x@y.it', 'senza nome non ripiega sull’email');
  deve(C.nome({}) === '', 'inventa un nome dal niente: ' + C.nome({}));
  deve(C.nomeDi(GENTE, 'p2') === 'Neri Anna', 'non ritrova la persona per id');
  deve(C.nomeDi(GENTE, 'p9') === '', 'un id che non esiste produce un nome');
  return 'Cognome Nome, e niente inventato';
});

prova('una colonna MAI RIEMPITA non vuol dire «spento»', () => {
  /* Stessa distinzione delle anagrafiche che nascono a «no» (§42): un vuoto
     non è una decisione. Spegnere chi non è mai stato deciso lo toglierebbe
     dalle tendine senza che nessuno l’abbia chiesto. */
  deve(C.eAttivo(GENTE[3]), 'chi non ha la colonna attivo risulta spento');
  deve(!C.eAttivo(GENTE[2]), 'chi è marcato spento risulta attivo');
  deve(C.attivi(GENTE).length === 3, 'gli attivi non sono tre: ' + C.attivi(GENTE).length);
  return 'vuoto = attivo, false = spento';
});

prova('NELLE SCELTE NUOVE solo gli attivi, sui record storici anche i disattivati', () => {
  /* Togliere il disattivato da una riga che già ce l’ha la farebbe sembrare
     senza collaboratore — e salvarla glielo toglierebbe davvero. */
  const nuova = C.perScelta(GENTE, null);
  deve(!nuova.some(c => c.id === 'p3'), 'un disattivato compare in una scelta nuova');
  const storica = C.perScelta(GENTE, 'p3');
  deve(storica.some(c => c.id === 'p3'), 'un record storico perde il suo collaboratore');
  deve(storica.length === nuova.length + 1, 'il disattivato non si aggiunge una volta sola');
  /* E si vede che è disattivato, invece di sembrare uno qualunque. */
  const h = C.opzioni(GENTE, 'p3', '— chi —', (s) => String(s));
  deve(/Verdi Luigi \(non più attivo\)/.test(h), 'non dice che quella persona non è più attiva: ' + h);
  return 'attivi sempre, il disattivato solo dove c’era';
});

prova('L’ABBINAMENTO DEL TESTO LIBERO AGGANCIA SOLO SE È UNA', () => {
  /* §19, regola 5. Due persone che si chiamano uguale non producono niente:
     un abbinamento sbagliato qui è una trattativa attribuita a chi non
     l’ha fatta. */
  const una = C.abbina('Neri Anna', GENTE);
  deve(una.stato === 'una' && una.collaboratore_id === 'p2', 'un nome che tocca una sola persona non si aggancia');
  /* Stesso nome, ordine diverso: è la stessa persona scritta in due modi. */
  const rovescio = C.abbina('Anna Neri', GENTE);
  deve(rovescio.stato === 'una' && rovescio.collaboratore_id === 'p2', 'l’ordine delle parole rompe l’abbinamento');
  /* Due Mario Rossi: non si sceglie. */
  const doppio = C.abbina('Mario Rossi', GENTE);
  deve(doppio.stato === 'ambiguo' && !doppio.collaboratore_id, 'con due omonimi ne sceglie uno: ' + JSON.stringify(doppio));
  deve((doppio.fra || []).length === 2, 'non dice fra chi è indeciso');
  /* Un nome parziale non è un nome. */
  const parziale = C.abbina('Neri', GENTE);
  deve(parziale.stato === 'nessuno', 'un cognome solo viene agganciato a una persona intera');
  return 'una sì, due no, parziale no';
});

prova('accenti, maiuscole e punteggiatura non fanno due persone di una', () => {
  const gente = [{ id: 'x', nome: 'Niccolò', cognome: "D'Amico", attivo: true }];
  deve(C.abbina("d'amico niccolo", gente).collaboratore_id === 'x', 'l’accento rompe l’abbinamento');
  deve(C.abbina('  NICCOLÒ   D’AMICO ', gente).collaboratore_id === 'x', 'maiuscole e spazi rompono l’abbinamento');
  return 'stessa persona, scritta in quattro modi';
});

prova('l’email aggancia, ma resta la seconda strada', () => {
  /* Un recapito che tocca una persona sola è un’evidenza forte; il nome
     viene prima perché dice CHI È, l’email dice dove si trova (§19). */
  const r = C.abbina('a.neri@esempio.it', GENTE);
  deve(r.stato === 'una' && r.collaboratore_id === 'p2', 'l’email non aggancia');
  return 'email sì, e dopo il nome';
});

prova('il piano separa quello che si può fare da quello che vuole una persona', () => {
  /* Il caso vero del 21/09/2026: `iam_trattative.collab` contiene «Antonio
     Anguzza», «Francesco Oddo», «Francesco». */
  const p = C.pianoTesti(['Neri Anna', 'Mario Rossi', 'Chi Sa', 'Neri Anna', ''], GENTE);
  deve(p.collegabili.length === 1, 'i collegabili non sono uno: ' + JSON.stringify(p.collegabili));
  deve(p.ambigui.length === 1, 'gli ambigui non sono uno');
  deve(p.sconosciuti.length === 1, 'gli sconosciuti non sono uno');
  deve(p.totale === 3, 'il doppione conta due volte: ' + p.totale);
  /* E ognuno dice PERCHÉ: un elenco di cose non fatte senza il motivo non lo
     guarda nessuno due volte (§33). */
  deve(p.ambigui[0].motivo && p.sconosciuti[0].motivo, 'non dice perché non si aggancia');
  return '1 collegabile, 1 ambiguo, 1 sconosciuto';
});

prova('la fonte e le colonne sono dichiarate una volta sola', () => {
  /* Due `select` diverse sulla stessa tabella diventano due tendine che
     mostrano cose diverse, e quella che sbaglia è quella che nessuno guarda. */
  deve(C.TABELLA === 'quote_collaboratori', 'la fonte non è il registro delle persone: ' + C.TABELLA);
  deve(/\bid\b/.test(C.COLONNE) && /cognome/.test(C.COLONNE) && /attivo/.test(C.COLONNE),
    'le colonne non bastano a disegnare una tendina: ' + C.COLONNE);
  return C.TABELLA;
});

console.log('\n══ I COLLABORATORI, UNA FONTE SOLA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCOLLABORATORI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
