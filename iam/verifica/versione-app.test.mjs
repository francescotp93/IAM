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

/* ═══════════════════════════════════════════════════════════════════════════
   LE NOVITÀ DEL RILASCIO (20/09/2026)

   «Magari mettiamo una parte release, dove cliccando dice le ultime modifiche
   effettuate» — Francesco. La targhetta dice UN numero; `storia` dice che cosa
   c'è dentro. Vale come la targhetta: serve solo se non può restare indietro,
   quindi la stessa disciplina — una prova che si arrabbia.
   ═══════════════════════════════════════════════════════════════════════════ */

prova('ogni rilascio ha la sua voce nelle novità, e la prima è quella in corso', () => {
  const v = JSON.parse(fs.readFileSync(FILE_VERSIONE, 'utf8'));
  deve(Array.isArray(v.storia) && v.storia.length, 'versione.json non ha l’elenco delle novità');
  /* Se la prima voce non è la versione corrente, qualcuno ha alzato il numero
     e non ha scritto che cosa c'è dentro: la finestra mostrerebbe le novità
     del rilascio prima, che è il modo più educato di mentire. */
  deve(v.storia[0].v === v.versione,
    'la prima voce delle novità è ' + v.storia[0].v + ' ma la versione è ' + v.versione + ': scrivi che cosa porta questo rilascio');
  deve(v.storia[0].nome === v.nome, 'il nome del rilascio non coincide con quello della prima voce');
  const visti = {};
  for (const r of v.storia) {
    deve(/^\d+\.\d+\.\d+$/.test(String(r.v || '')), 'una voce senza numero di versione valido: ' + r.v);
    deve(!visti[r.v], 'la versione ' + r.v + ' compare due volte nelle novità');
    visti[r.v] = true;
    deve(/^\d{4}-\d{2}-\d{2}$/.test(String(r.data || '')), r.v + ': manca la data');
    deve(Array.isArray(r.voci) && r.voci.length, r.v + ': nessuna voce — un rilascio senza novità scritte non si è capito che cosa ha portato');
    /* Le voci si scrivono per chi lavora, non per chi programma: una riga che
       nomina una tabella o una funzione non dice niente a chi la legge. */
    for (const t of r.voci) {
      deve(String(t).length > 25, r.v + ': una voce troppo corta per dire qualcosa — «' + t + '»');
    }
  }
  return v.storia.length + ' rilasci, ' + v.storia.reduce((n, r) => n + r.voci.length, 0) + ' novità';
});

prova('la finestra delle novità esiste, si apre dalla targhetta e non inventa niente', () => {
  const h = fs.readFileSync(IAM, 'utf8');
  /* §1: una funzione che non chiama nessuno non serve a niente. La porta è la
     targhetta in fondo al menu del nome, ed è l'unica. */
  deve(/id="um-versione"[^>]*onclick="apriNovita\(\)"/.test(h), 'la targhetta della versione non apre le novità');
  deve(/async function apriNovita\(\)/.test(h), 'manca apriNovita');
  deve(/id="nov-ov"/.test(h) && /id="nov-box"/.test(h), 'manca la finestra delle novità');
  /* L'indirizzo passa da /nuovo-preventivo/: IAM è servito dalla cartella
     `iam/` e `versione.json` sta alla radice del repository. Un `/versione.json`
     risponderebbe 404 e l'elenco non si aprirebbe mai. */
  const f = h.slice(h.indexOf('async function apriNovita'), h.indexOf('function novData'));
  deve(/fetch\('\/nuovo-preventivo\/versione\.json/.test(f),
    'le novità si chiedono a un indirizzo che su IAM non esiste');
  /* Il confronto che vale più dell'elenco: se il server ha un numero diverso
     da quello della copia in uso, questa pagina è vecchia e lo deve dire. */
  deve(/dati\.versione !== inUso\.numero/.test(f), 'la finestra non confronta la versione pubblicata con quella in uso');
  deve(/pagina che stai guardando è vecchia/.test(f), 'non avverte che la pagina è vecchia');
  /* E «non si è potuto leggere» non diventa «non ci sono novità». */
  deve(/non vuol dire che non ce ne siano/.test(f), 'un errore di lettura si confonde con un elenco vuoto');
  return 'targhetta → finestra, indirizzo giusto, confronto e errore distinto';
});

prova('il segnale del rilascio si accende su quello NON letto, e si spegne leggendolo', () => {
  const H = fs.readFileSync(IAM, 'utf8');
  /* Blocco 1 · punto 11: «dopo un rilascio, un segnale sulla voce di menu».
     La regola è «non letto», non «diverso»: un pallino che non si spegne mai
     smette di voler dire qualcosa — è la targhetta ferma da tre mesi che
     questo lavoro ha tolto, in un'altra forma. */
  deve(/const NOV_LETTA = 'iam_novita_letta'/.test(H), 'non si ricorda quale rilascio è stato letto');
  const f = H.slice(H.indexOf('async function novControlla'), H.indexOf('async function apriNovita'));
  deve(/novSegnale\(letta !== pubblicata\)/.test(f), 'il segnale non guarda la versione LETTA');
  /* Al primissimo avvio non si accende: chi apre IAM la prima volta non ha
     novità non lette, ha cose che non ha mai visto. */
  deve(/if \(letta === null\) \{ novRicorda\(pubblicata\); novSegnale\(false\)/.test(f),
    'al primo avvio il pallino si accende su un rilascio che nessuno ha saltato');
  /* E se il server non risponde non si accende NIENTE: un pallino «per
     sicurezza» manda a leggere novità che non sappiamo se esistono (§12). */
  deve(/return null;\n  \}\n  if \(!pubblicata\) return null;/.test(f),
    'quando la lettura fallisce il segnale decide lo stesso');
  /* Leggendo si spegne, e si ricorda la versione PUBBLICATA: se stai
     guardando una copia in cache l'elenco l'hai letto comunque. */
  const ap = H.slice(H.indexOf('async function apriNovita'), H.indexOf('function novChiudiHTML'));
  deve(/novRicorda\(dati\.versione\); novSegnale\(false\)/.test(ap), 'aprendo le novità il pallino non si spegne');
  /* Il segnale sta in DUE posti: l'avatar si vede sempre, la targhetta solo
     col menu aperto — e un segnale visibile solo dentro il posto in cui sta
     non è un segnale. */
  const seg = H.slice(H.indexOf('function novSegnale'), H.indexOf('async function novControlla'));
  deve(/um-versione/.test(seg) && /w1-av/.test(seg), 'il segnale si vede in un posto solo: ' + seg.slice(0, 200));
  deve(/\.nov-nuovo::after\{/.test(H), 'il pallino non ha uno stile: non si vedrebbe');
  /* E qualcuno lo chiama davvero (§1). */
  deve(/\n  novControlla\(\);/.test(H), 'novControlla non la chiama nessuno');
  return 'non letto → acceso, letto → spento, e due posti';
});


console.log('\n══ LA VERSIONE PUBBLICATA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nVERSIONE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
