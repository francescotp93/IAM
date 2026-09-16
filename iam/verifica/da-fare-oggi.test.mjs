// ═══════════════════════════════════════════════════════════════════════════════
//  DA FARE OGGI — prove sulla fascia operativa della scrivania (Blocco B)
//
//  Serve a impedire quattro errori che non si vedono guardando la pagina:
//   1. mettere la fascia DENTRO il blocco che resta nascosto finché non si
//      caricano i file di contabilità (era il difetto della scrivania: vuota
//      per chi vive di preventivi e rinnovi);
//   2. mostrare voci con conteggio zero, che trasformano l'elenco in rumore;
//   3. far cadere tutta la fascia per un errore su un singolo conteggio;
//   4. dimenticare di richiamare il calcolo quando la scrivania si apre.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const html = leggi('index.html');
// il corpo della funzione: dal nome fino alla graffa a inizio riga.
// I parametri restano generici di proposito: aggiungerne uno non deve rompere
// tutte le prove (è già successo con `forza`).
const corpo = (html.match(/async function caricaDaFareOggi\([^)]*\)[\s\S]*?\n\}/) || [''])[0];
if (!corpo) { console.log('DA FARE OGGI\n  X   la funzione caricaDaFareOggi non si trova'); process.exit(1); }

prova('la fascia esiste ed è la prima cosa nella scrivania', () => {
  const pannello = html.slice(html.indexOf('<div class="panel" id="panel-dashboard">'));
  const iOggi = pannello.indexOf('id="oggi"');
  const iVuoto = pannello.indexOf('id="d-empty"');
  const iContenuto = pannello.indexOf('id="d-content"');
  deve(iOggi > 0, 'la fascia "Da fare oggi" non c\'è');
  deve(iOggi < iVuoto && iOggi < iContenuto, 'la fascia non è la prima cosa che si vede');
  return 'prima di tutto il resto';
});

prova('la fascia sta FUORI dal blocco che richiede i file di contabilita', () => {
  // #d-content parte con display:none e si apre solo dopo il caricamento dei
  // file: se la fascia stesse dentro, un agente che non fa contabilita non
  // vedrebbe mai il proprio lavoro.
  const iOggi = html.indexOf('id="oggi"');
  const iContenuto = html.indexOf('id="d-content"');
  deve(iOggi < iContenuto, 'la fascia e dentro #d-content: resterebbe nascosta');
  const dopoOggi = html.slice(iOggi, iContenuto);
  deve(!/display:\s*none/.test(dopoOggi), 'la fascia nasce nascosta');
  return 'sempre visibile';
});

prova('il messaggio della scrivania vuota non promette piu tutto', () => {
  const riga = (html.match(/id="d-empty"[^\n]*/) || [''])[0];
  deve(/contabilit/i.test(riga), 'il messaggio dice ancora che senza file non c\'e nulla da vedere');
});

prova('il calcolo si avvia da tutti i percorsi, non da uno solo', () => {
  // La scrivania viene ricostruita da 5 punti diversi (login, caricamento file,
  // cambio scheda...): agganciarne uno sarebbe bastato per il caso normale e
  // avrebbe lasciato la fascia vecchia in tutti gli altri.
  deve(/if \(t === 'dashboard'\) \{[^}]*caricaDaFareOggi\(\)/.test(html),
    'aprendo la scrivania il lavoro del giorno non viene calcolato');
  const build = (html.match(/function buildDashboard\(\)[\s\S]*?\n\}/) || [''])[0];
  deve(/caricaDaFareOggi\(\)/.test(build),
    'il calcolo non e dentro buildDashboard(): resterebbe vecchio in 4 percorsi su 5');
  // e con una guardia, altrimenti sei interrogazioni a ogni ridisegno
  deve(/OGGI_ULTIMO/.test(html) && /if \(!forza && OGGI_ULTIMO/.test(html),
    'manca la guardia contro le interrogazioni ripetute');
  deve(/caricaDaFareOggi\(true\)/.test(html), 'il tasto di ricalcolo non forza l\'aggiornamento');
  return 'buildDashboard + goTab, con guardia di 30 secondi';
});

prova('un errore su un conteggio non spegne la fascia', () => {
  deve(/const conta = async \(fn\) => \{ try \{ return await fn\(\); \} catch/.test(corpo),
    'i conteggi non sono protetti uno per uno');
  const protetti = (corpo.match(/await conta\(async \(\) =>/g) || []).length;
  deve(protetti >= 6, 'conteggi protetti: ' + protetti);
  return protetti + ' conteggi indipendenti';
});

prova('le voci a zero non si mostrano', () => {
  // ogni conteggio deve uscire senza aggiungere la voce quando non ha nulla
  const uscite = (corpo.match(/if \(!\w+(?:\.length)?\) return;|if \(!\w+ \|\| !\w+\.length\) return;/g) || []).length;
  deve(uscite >= 5, 'controlli sul vuoto: ' + uscite);
  return uscite + ' controlli sul vuoto';
});

prova('il disegno e separato dalla raccolta, e gestisce il caso vuoto', () => {
  // Separati per due motivi: si puo ridisegnare senza reinterrogare, e si puo
  // verificare la resa senza database.
  const disegna = (html.match(/function oggiDisegna\(voci\)[\s\S]*?\n\}/) || [''])[0];
  deve(disegna, 'oggiDisegna non esiste: disegno e raccolta sono ancora mescolati');
  deve(/il lavoro è in pari/.test(disegna), 'manca il messaggio per quando non c\'e nulla da fare');
  deve(/oggiDisegna\(voci\);/.test(corpo), 'la raccolta non usa la funzione di disegno');
  return 'raccolta → oggiDisegna';
});

prova('si controlla la variabile del database giusta', () => {
  // `db` e una variabile di modulo: non finisce su window, quindi controllare
  // window.db significava controllare una cosa diversa da quella che si usa.
  deve(/if \(!db\) \{ box\.innerHTML/.test(corpo), 'il controllo non e su `db`');
  deve(!/if \(!window\.db\)/.test(corpo), 'controlla ancora window.db');
});

prova('ogni voce porta da qualche parte', () => {
  const voci = (corpo.match(/voci\.push\(\{/g) || []).length;
  const destinazioni = (corpo.match(/va: \(\) =>/g) || []).length;
  deve(voci >= 6, 'voci previste: ' + voci);
  deve(destinazioni === voci, voci + ' voci ma ' + destinazioni + ' destinazioni');
  return voci + ' voci, tutte collegate';
});

prova('le pagine del preventivatore si aprono dentro la scocca', () => {
  const apri = (html.match(/function oggiApri\(pagina\)[\s\S]*?\n\}/) || [''])[0];
  deve(/withusOneApri/.test(apri), 'non usa il ponte della scocca: uscirebbe dall\'applicazione');
  deve(/quotoUrl|apriQuoto/.test(apri), 'senza la scocca non ha un ripiego: il tasto non farebbe niente');
  // le destinazioni devono essere pagine che nel preventivatore esistono
  const pagine = [...corpo.matchAll(/oggiApri\('([a-z-]+)'\)/g)].map(m => m[1]);
  const attese = ['titoli', 'scadenzario', 'portafoglio', 'storico', 'anagrafiche'];
  for (const p of pagine) deve(attese.includes(p), 'destinazione non prevista: ' + p);
  return pagine.length + ' aperture, con ripiego';
});

prova('gli insoluti vengono per primi: sono soldi gia fuori', () => {
  const iIns = corpo.indexOf("from('quote_titoli')");
  const iRin = corpo.indexOf("from('quote_scadenzario')");
  const iPerf = corpo.indexOf("eq('perfezionata', false)");
  deve(iIns > 0 && iRin > 0 && iPerf > 0, 'manca uno dei conteggi principali');
  deve(iIns < iRin && iRin < iPerf, 'l\'ordine delle urgenze non e quello deciso');
  return 'insoluti → rinnovi → perfezionamento';
});

prova('i conteggi leggono le tabelle giuste', () => {
  for (const t of ['quote_titoli', 'quote_scadenzario', 'quote_polizze', 'quote_preventivi', 'quote_anagrafiche']) {
    deve(corpo.includes("from('" + t + "')"), 'non legge da ' + t);
  }
  // nessuna scrittura: la scrivania guarda, non tocca
  deve(!/\.insert\(|\.update\(|\.delete\(/.test(corpo), 'la fascia scrive sul database: deve solo leggere');
  return '5 tabelle, sola lettura';
});

console.log('DA FARE OGGI');
for (const [ok, nome, msg] of esiti) {
  console.log(`  ${ok ? 'ok ' : 'X  '} ${nome}${msg ? ' — ' + msg : ''}`);
}
const falliti = esiti.filter(e => !e[0]).length;
console.log(`\nDA FARE OGGI: ${esiti.length - falliti} superate, ${falliti} fallite`);
process.exit(falliti ? 1 : 0);
