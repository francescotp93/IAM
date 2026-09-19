// ═══════════════════════════════════════════════════════════════════════════════
//  IL NUMERO DI VERSIONE, E LA PROVA CHE IMPEDISCE DI DIMENTICARLO
//  (19/09/2026)
//
//  Perché esiste. In fondo al menu del nome c'era «IAM · build 2026-06-15c»:
//  scritta a mano, ferma da tre mesi. Una targhetta che nessuno aggiorna la si
//  legge e ci si crede, quindi è PEGGIO di nessuna targhetta.
//
//  Il numero di versione serve — risponde a «quello che ho chiesto è
//  pubblicato?», che la data da sola non sa dire — ma serve solo se non può
//  mentire. E un numero scritto a mano mente appena qualcuno ha fretta.
//
//  Quindi il numero resta scritto a mano (è l'unico modo perché significhi
//  qualcosa per una persona) e la disciplina la fa questa prova:
//
//    1. i due documenti e `versione.json` devono dire la STESSA cosa;
//    2. se i documenti sono cambiati DOPO l'ultimo cambio di `versione.json`,
//       la prova diventa rossa. Non «ricordati di alzare la versione»: la
//       suite si arrabbia, che è l'unica forma di promemoria che funziona.
//
//  La 2 legge la storia di git. In un clone superficiale quella storia non
//  c'è: allora la prova dice «saltata» e va avanti, invece di diventare rossa
//  per la strada e non per il contenuto (CLAUDE.md §4).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const IAM = path.join(RADICE, 'iam', 'index.html');
const QUOTO = path.join(RADICE, 'index.html');
const FILE_VERSIONE = path.join(RADICE, 'versione.json');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const leggiMeta = (file, nome) => {
  const h = fs.readFileSync(file, 'utf8');
  const m = h.match(new RegExp('<meta name="' + nome + '" content="([^"]*)"'));
  return m ? m[1] : null;
};

prova('la fonte unica esiste ed è leggibile', () => {
  deve(fs.existsSync(FILE_VERSIONE), 'manca versione.json alla radice');
  const v = JSON.parse(fs.readFileSync(FILE_VERSIONE, 'utf8'));
  deve(/^\d+\.\d+\.\d+$/.test(v.versione || ''), 'la versione non è nella forma 0.1.0: ' + v.versione);
  deve((v.nome || '').trim().length > 0, 'la versione non dice che cosa contiene: `nome` è vuoto');
  deve(/^\d{4}-\d{2}-\d{2}$/.test(v.data || ''), 'la data del rilascio non è in forma ISO: ' + v.data);
  return v.versione + ' · ' + v.nome;
});

prova('i due documenti annotano la STESSA versione del file', () => {
  const v = JSON.parse(fs.readFileSync(FILE_VERSIONE, 'utf8'));
  for (const [nome, file] of [['IAM', IAM], ['QUOTO', QUOTO]]) {
    const num = leggiMeta(file, 'app-versione');
    const tit = leggiMeta(file, 'app-versione-nome');
    deve(num, nome + ' non annota nessuna versione (<meta name="app-versione">)');
    deve(num === v.versione, nome + ' dice ' + num + ', versione.json dice ' + v.versione);
    deve(tit === v.nome, nome + ' chiama il rilascio «' + tit + '», versione.json «' + v.nome + '»');
  }
  /* Uno solo dei due aggiornato è il difetto più probabile: sono due file, e
     si tocca quello su cui si sta lavorando. */
  return 'IAM e QUOTO allineati a ' + v.versione;
});

prova('la targhetta mostra il numero E la data, perché rispondono a due domande diverse', () => {
  const h = fs.readFileSync(IAM, 'utf8');
  /* Si cerca la CHIAMATA, non la parola: «versione» compare in mezzo ai
     commenti di tutto il file (la trappola di CLAUDE.md §10, §12, §18). */
  deve(/function versioneApp\(\)/.test(h), 'manca versioneApp(): il numero non si legge dal documento in uso');
  deve(/document\.querySelector\('meta\[name="app-versione"\]'\)/.test(h), 'il numero non si legge dal <meta> di QUESTA copia');
  deve(/document\.lastModified/.test(h), 'la data del documento caricato non si legge più');
  deve(/mostraVersioneInUso\(\)/.test(h.slice(h.indexOf('DOMContentLoaded'))), 'la targhetta non viene riempita all’avvio');
  /* E il numero NON si prende con un fetch: descriverebbe quello che il server
     servirebbe adesso, non la copia che sta girando — cioè proprio il caso che
     questa targhetta esiste per smascherare. */
  const blocco = h.slice(h.indexOf('function versioneApp'), h.indexOf('function versioneApp') + 1200);
  deve(!/fetch\(['"][^'"]*versione\.json/.test(blocco), 'il numero si chiede al server invece di leggerlo dal documento in uso');
  return 'numero dal <meta>, data da document.lastModified';
});

prova('la targhetta scritta a mano di prima non è tornata', () => {
  const h = fs.readFileSync(IAM, 'utf8');
  /* «build 2026-06-15c» stava in pagina e non si aggiornava. Se un giorno
     qualcuno rimette una stringa cablata lì dentro, questa prova lo dice.
     Si guarda il CONTENUTO dell'elemento, non il file intero: il commento che
     racconta il difetto nomina la vecchia stringa apposta. */
  const i = h.indexOf('id="um-versione"');
  deve(i > 0, 'manca il contenitore della targhetta');
  const chiuso = h.indexOf('</div>', i);
  const dentro = h.slice(i, chiuso);
  deve(!/build\s*20\d\d/.test(dentro), 'in pagina è tornata una versione cablata: ' + dentro.slice(0, 120));
  return 'il contenitore nasce vuoto, lo riempie il codice';
});

prova('chi cambia i documenti senza alzare la versione lo scopre qui', () => {
  /* LA PROVA CHE FA IL LAVORO. Confronta la data dell'ultimo commit che ha
     toccato i due documenti con quella dell'ultimo che ha toccato
     `versione.json`. Se i documenti sono più recenti, la versione è rimasta
     indietro e il numero sta mentendo a chi lo legge. */
  const gitData = (file) => {
    try {
      const out = execSync('git log -1 --format=%ct -- ' + file, { cwd: RADICE, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().trim();
      return out ? parseInt(out, 10) : null;
    } catch (e) { return null; }
  };
  const vDoc = Math.max(gitData('index.html') || 0, gitData('iam/index.html') || 0);
  const vVer = gitData('versione.json') || 0;
  if (!vDoc || !vVer) {
    /* Clone superficiale o file mai committato: non si può misurare. Meglio
       dirlo che diventare rossi per la strada invece che per il contenuto. */
    return 'saltata: la storia di git non è disponibile in questo clone';
  }
  deve(vVer >= vDoc, 'i documenti sono stati cambiati dopo l’ultimo cambio di versione.json: alza la versione e riscrivi `nome` con quello che questo rilascio porta');
  return 'versione allineata all’ultimo commit dei documenti';
});

console.log('\n══ LA VERSIONE PUBBLICATA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nVERSIONE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
