// ═══════════════════════════════════════════════════════════════════════════════
//  LA PROVA DEL BANCO — ritaglia() dice il vero?
//
//  IAM è un unico file HTML: le prove non possono importare una funzione, la
//  RITAGLIANO dal file e la guardano. Quindi `ritaglia` è il righello con cui
//  si misura tutto il resto — e un righello sbagliato non fa sbagliare una
//  prova: le fa sbagliare tutte, nella stessa direzione, senza che nessuna
//  diventi rossa.
//
//  Il 20/08/2026 è successo davvero. Le funzioni di questo file scrivono HTML
//  con i template literal, e dentro un template ci sono i buchi `${...}` che
//  contengono altro codice, con altre stringhe e altri apici. La prima versione
//  leggeva un backtick e saltava fino al successivo: al primo buco che ne
//  conteneva uno si perdeva, e da lì in poi leggeva codice come se fosse testo.
//  `ritaglia(html, 'fontiScheda')` restituiva 109.883 caratteri per una
//  funzione da 7.449 — mezzo file. Tutte le prove che ritagliavano quella
//  funzione stavano guardando anche quello che veniva dopo: passavano e
//  fallivano per ragioni che non c'entravano niente con loro.
//
//  Da qui in avanti il righello ha il suo controllo.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ritaglia, RADICE } from './banco.mjs';

const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => { try { const m = fn(); esiti.push([true, nome, m || '']); }
                              catch (e) { esiti.push([false, nome, e.message]); } };
const deve = (c, msg) => { if (!c) throw new Error(msg); };

// ── 1. I casi che lo rompevano ───────────────────────────────────────────────
prova('un buco ${} con dentro un backtick non chiude il template', () => {
  /* Il caso deve ROMPERE il righello vecchio, altrimenti non prova niente: la
     graffa aperta dentro il template annidato e' quella che gli faceva perdere
     il conto. Un esempio che si bilancia per caso sarebbe verde su tutti e due
     i righelli — cioe' inutile. */
  const src = [
    'function tagliami() {',
    '  const x = `ciao ${ etichetta(`{apri`) } mondo`;',
    '  return x;',
    '}',
    'function nonMia() { return 1; }',
  ].join('\n');
  const c = ritaglia(src, 'tagliami');
  deve(c, 'non ha ritagliato niente');
  deve(!c.includes('nonMia'), 'si e\' portato dietro la funzione dopo: ' + c.length + ' caratteri');
  deve(c.trim().endsWith('}'), 'non finisce con la graffa della funzione');
});

prova('un buco ${} con dentro una graffa non sbilancia il conto', () => {
  const src = [
    'function tagliami() {',
    '  return `${ apri("{") }` + `${ chiudi(`}`) }`;',
    '}',
    'function nonMia() { return 2; }',
  ].join('\n');
  const c = ritaglia(src, 'tagliami');
  deve(c && !c.includes('nonMia'), 'ha sforato: ' + (c ? c.length + ' caratteri' : 'null'));
});

prova('gli apici dentro un template restano testo', () => {
  const src = [
    'function tagliami() {',
    '  return `<b onclick="apri(\'x\')">non c\'e\'</b>`;',
    '}',
    'function nonMia() { return 3; }',
  ].join('\n');
  const c = ritaglia(src, 'tagliami');
  deve(c && !c.includes('nonMia'), 'un apice dentro il template ha aperto una stringa');
});

prova('un apostrofo dentro un commento non apre una stringa', () => {
  /* Qui dentro si scrive in italiano, e in italiano ci sono gli apostrofi. */
  const src = [
    'function tagliami() {',
    "  /* non c'e' niente da fare */",
    '  return 1;',
    '}',
    'function nonMia() { return 4; }',
  ].join('\n');
  const c = ritaglia(src, 'tagliami');
  deve(c && !c.includes('nonMia'), 'un apostrofo nel commento ha sballato il taglio');
});

prova('un backslash prima dell\'apice non chiude la stringa', () => {
  const src = [
    'function tagliami() {',
    "  const s = 'niente da fare\\\\';",
    '  return s;',
    '}',
    'function nonMia() { return 5; }',
  ].join('\n');
  const c = ritaglia(src, 'tagliami');
  deve(c && !c.includes('nonMia'), 'una barra rovesciata ha aperto una stringa che non c\'era');
});

// ── 2. Quando non ce la fa, lo dice ─────────────────────────────────────────
prova('se il conto non torna restituisce NULL, non una fetta a caso', () => {
  /* È la parte che conta: una fetta sbagliata diventa una prova verde su
     codice che non è quello. Un null diventa «manca la funzione», che è un
     errore vero e si va a guardare. */
  const c = ritaglia('function tagliami() { if (x) { return 1;', 'tagliami');
  deve(c === null, 'ha restituito una fetta di codice non chiuso: ' + JSON.stringify(String(c).slice(0, 60)));
});

prova('una funzione che non c\'è vale null', () => {
  deve(ritaglia('function altra(){}', 'tagliami') === null, 'ha trovato una funzione inesistente');
});

// ── 3. Sul file vero ────────────────────────────────────────────────────────
prova('sul file vero i ritagli hanno una misura sensata', () => {
  /* Il caso che ha fatto nascere questa prova: fontiScheda tornava lunga
     quindici volte il dovuto. Il limite non è un numero magico — è «una
     funzione, non un file»: sopra le 30.000 battute è certo che si è portata
     dietro qualcos'altro. */
  for (const nome of ['fontiScheda', 'fontiCarica', 'fontiAspetta', 'collegDisegna', 'collegSegui', 'quotoFetch', 'goTab']) {
    const c = ritaglia(html, nome);
    deve(c, 'non ritaglia piu\' ' + nome);
    deve(c.length < 30000, nome + ' torna lunga ' + c.length + ' caratteri: si e\' portata dietro il resto del file');
    deve(c.trim().endsWith('}'), nome + ' non finisce con la sua graffa');
  }
});

prova('un ritaglio contiene la sua funzione e non quella dopo', () => {
  const c = ritaglia(html, 'collegAccedi');
  deve(c && /collegSegui/.test(c), 'collegAccedi non chiama piu\' collegSegui');
  deve(!/function collegSegui/.test(c), 'il ritaglio si e\' portato dietro collegSegui per intero');
});

let ko = 0;
console.log('\nBANCO — il righello con cui si misura tutto il resto');
for (const [ok, n, m] of esiti) { console.log(ok ? '  ok  ' + n : '  X   ' + n + '\n      ' + m); if (!ok) ko++; }
console.log(`\nBANCO RITAGLIA: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
