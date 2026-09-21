// ═══════════════════════════════════════════════════════════════════════════════
//  IL DETTAGLIO DI UN CONTO — la finestra  (Blocco 3 · punto 7, 20/09/2026)
//
//  L'aritmetica sta nel motore condiviso (`Contabilita.dettaglioConto` e
//  `storicoQuadrature`, sette prove in `server/verifica/contabilita.test.mjs`,
//  con le due controprove). Qui si sorveglia che la finestra:
//
//   · carichi il motore invece di riscriverne le regole (§5, §10);
//   · sia RAGGIUNGIBILE — una finestra che nessuno apre è il guasto numero uno
//     di questo repository (§1);
//   · non chieda il permesso di SCRIVERE per lasciar GUARDARE: chi vede
//     l'elenco dei conti vede già i saldi, e negargli il perché vuol dire
//     dargli un numero e togliergli il modo di controllarlo;
//   · non confonda «non è mai stato dichiarato un saldo» con «quadra», né
//     «nessun movimento» con «saldo di oggi» (§12, §18);
//   · legga i due campi delle date al clic su «Cerca», non mentre si scrive
//     (la regola della M2, §22).
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
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Il blocco senza i commenti a inizio riga: un commento che NOMINA quello che
   una prova vieta la fa diventare rossa su un codice corretto — la trappola
   già presa dieci volte (§10, §12, §18, §26, §29, §31, §33, §34, §37, §41).
   Mai una regex globale sui commenti: su un documento da 1 MB si mangia mezzo
   file (§12). */
const blocco = (() => {
  const i = H.indexOf('var DCO_CONTO = null;');
  const j = H.indexOf('function pntApriQuadratura(contoId)');
  deve(i > 0 && j > i, 'il blocco dco* non si ritaglia: l’ancora è cambiata');
  return H.slice(i, j).split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');
})();

prova('il motore è quello condiviso, e la finestra non rifà i conti', () => {
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/contabilita\.js\?v=/.test(H),
    'IAM non carica il motore della contabilità dal preventivatore');
  deve(/Contabilita\.dettaglioConto\(/.test(blocco), 'la finestra non chiama dettaglioConto');
  /* E non se li rifà in casa: nessun saldo progressivo scritto a mano qui. */
  deve(!/saldo_iniziale\s*\)?\s*\+/.test(blocco), 'il saldo si ricalcola nella pagina invece che nel motore');
  deve(typeof C.dettaglioConto === 'function' && typeof C.storicoQuadrature === 'function',
    'il motore non espone il dettaglio del conto');
  return 'un file solo, e la pagina non calcola';
});

prova('la finestra è RAGGIUNGIBILE: il nome del conto la apre', () => {
  /* §1 — il guasto numero uno di questo repository è il codice che nessuno
     chiama. Si cerca la CHIAMATA con le parentesi, non la parola. */
  deve(/id="dco-ov"/.test(H), 'manca il contenitore della finestra');
  const quad = H.slice(H.indexOf('function pntRenderQuadrature()'), H.indexOf('var DCO_CONTO = null;'));
  deve(/dcoApri\('/.test(quad), 'dall’elenco dei conti non si apre il dettaglio');
  deve(/async function dcoApri\(contoId\)/.test(blocco), 'manca dcoApri');
  return 'clic sul nome, dall’elenco dei conti';
});

prova('GUARDARE non passa dal cancello di chi può SCRIVERE', () => {
  /* `pntApri` si rifiuta di aprire a chi non è admin: usarlo qui avrebbe
     nascosto il perché di un saldo a chi quel saldo lo vede comunque. */
  deve(!/pntApri\(/.test(blocco), 'il dettaglio passa dall’apertura riservata alla scrittura');
  deve(!/pntPuoScrivere\(\)/.test(blocco), 'la finestra chiede il permesso di scrivere per far guardare');
  /* E infatti non scrive niente: nessun update, nessun insert, nessuna delete. */
  deve(!/\.update\(|\.insert\(|\.upsert\(|\.delete\(/.test(blocco), 'dalla finestra del dettaglio si scrive');
  return 'sola lettura, e aperta a chi vede i conti';
});

prova('«mai dichiarato» non diventa «quadra», e «nessun movimento» non diventa un saldo', () => {
  deve(/non è mai stato dichiarato un saldo/.test(blocco), 'lo storico vuoto non si spiega');
  deve(/Non vuol dire che quadri/.test(blocco), 'un conto mai verificato può sembrare a posto');
  deve(/non il saldo di oggi ricostruito/.test(blocco),
    'un conto senza movimenti mostra il saldo iniziale come se fosse quello di oggi');
  /* E il motore la pensa allo stesso modo: senza dichiarazioni non inventa
     una riga verde. */
  const c = { id: 'x', nome: 'X', natura: 'aziendale', saldo_iniziale: 10 };
  deve(C.dettaglioConto(c, [], [], {}).quadrature.length === 0, 'il motore inventa una quadratura');
  return 'tre frasi per tre cose che non si sanno';
});

prova('il progressivo non riparte dal periodo, e la finestra lo DICE', () => {
  /* La regola che rende onesta la finestra: un saldo progressivo che riparte
     dal saldo iniziale in mezzo a un periodo è un numero falso che sembra un
     saldo. Il motore la applica; qui si controlla che la schermata scriva il
     saldo di apertura invece di lasciarlo indovinare. */
  deve(/d\.apertura/.test(blocco), 'il saldo di apertura del periodo non si mostra');
  deve(/NON riparte dal periodo/.test(blocco), 'non è scritto che il progressivo parte dall’inizio');
  const c = { id: 'x', nome: 'X', natura: 'aziendale', saldo_iniziale: 1000 };
  const cau = [{ id: 'e', nome: 'Entrata', codice: 'e', segno: 'entrata' }];
  const mov = [{ id: 'a', conto_id: 'x', data: '2026-01-10', importo: 100, causale_id: 'e' },
               { id: 'b', conto_id: 'x', data: '2026-03-10', importo: 50, causale_id: 'e' }];
  const d = C.dettaglioConto(c, mov, [], { causali: cau, dal: '2026-02-01' });
  deve(d.apertura === 1100 && d.righe[0].saldo === 1150, 'il progressivo del periodo non regge: ' + d.apertura);
  return 'apertura scritta, progressivo vero';
});

prova('i due campi delle date si leggono al CLIC, non mentre si scrive', () => {
  /* La regola della M2 (§22): una lista che si ricalcola a ogni tasto fa
     lampeggiare la schermata e riparte a metà di una data incompleta. */
  deve(!/id="dco-(dal|al)"[^>]*on(input|change)=/.test(blocco), 'un campo data ricalcola mentre si scrive');
  deve(/onclick="dcoCerca\(\)"/.test(blocco), 'manca il tasto Cerca');
  deve(/function dcoCerca\(\)/.test(blocco) && /getElementById\('dco-dal'\)/.test(blocco),
    'dcoCerca non legge i campi');
  /* E «Azzera» è spento finché non c'è niente da azzerare (§37): un bottone
     che non fa niente e sembra attivo si clicca, e chi lo clicca crede di
     aver sbagliato lui. */
  deve(/periodo \? '' : 'disabled'/.test(blocco), 'Azzera è attivo anche senza filtri');
  return 'Cerca, e Azzera spento a vuoto';
});

prova('quello che resta fuori dal saldo si vede, riga per riga', () => {
  deve(/fuori_dal_saldo\.righe/.test(blocco), 'non si conta quello che resta fuori dal saldo');
  deve(/senza verso non si indovina/.test(blocco), 'la riga senza verso non si spiega');
  deve(/dco-incerta/.test(blocco), 'la riga senza verso non si distingue dalle altre');
  return 'contata, marcata e spiegata';
});

prova('«il motore non si è caricato» non è «il conto è vuoto»', () => {
  /* §12 e §18: confondere «non si è potuto leggere» con «non c’è niente»
     rassicura a sproposito. */
  deve(/non vuol dire che il conto sia vuoto/.test(blocco), 'un motore mancante si legge come un conto vuoto');
  deve(/if \(!window\.Contabilita\)/.test(blocco), 'la finestra non controlla che il motore ci sia');
  return 'due frasi per due cose';
});

prova('lo stato della finestra è `var`, perché il banco lo legge', () => {
  /* Regola di casa §17: con `let` la variabile del modulo e `window.X` sono
     due cose diverse, e una prova che inietta dei dati scriverebbe in una
     mentre il codice legge l'altra — restando verde senza aver misurato
     niente. */
  deve(/^var DCO_CONTO = null;/m.test(blocco), 'DCO_CONTO non è var');
  deve(/^var DCO_DAL = '', DCO_AL = '';/m.test(blocco), 'le date del periodo non sono var');
  return 'tre variabili su window';
});

console.log('\n══ IL DETTAGLIO DI UN CONTO ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nDETTAGLIO CONTO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
