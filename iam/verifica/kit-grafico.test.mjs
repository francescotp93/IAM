// ═══════════════════════════════════════
//  KIT GRAFICO — i pittogrammi With Us in IAM
//
//  Il kit era già in QUOTO e non in IAM: metà ecosistema aveva i pittogrammi
//  e metà no. Queste prove sorvegliano che ci restino, e che restino usati
//  come dice il kit — perché le regole di uso sono la parte che si perde per
//  prima, molto prima del foglio di stile.
//
//  Le tre che contano davvero:
//   1. NIENTE EMOJI UNICODE. Un'emoji la disegna il sistema operativo: la
//      stessa faccina è gialla su un telefono, piatta su Windows e diversa su
//      un Mac. In un gestionale assicurativo un simbolo che cambia forma a
//      seconda di chi guarda non è un simbolo.
//   2. UNO SOLO per titolo, e mai dentro pulsanti, tabelle o pastiglie di
//      stato: lì restano le icone Tabler nude.
//   3. IL VERDE È FISSO. L'accento del tema in IAM lo sceglie l'utente e può
//      essere arancione o viola — e il kit esclude esplicitamente il viola.
//      Un pittogramma che cambia colore con le preferenze è una decorazione,
//      non un segnale.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html   = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(radice, 'withus-one.js'), 'utf8');
const stile  = path.join(radice, 'withus-pictograms.css');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

// ── 1. Il foglio c'è ed è caricato ───────────────────────────────────────
prova('il foglio dei pittogrammi c\'è ed è caricato', () => {
  deve(fs.existsSync(stile), 'manca withus-pictograms.css');
  deve(/withus-pictograms\.css/.test(html), 'il foglio non è collegato in index.html');
  const css = fs.readFileSync(stile, 'utf8');
  deve(/\.wus-pictogram\s*\{/.test(css), 'manca la classe .wus-pictogram');
  return 'collegato';
});

// ── 2. Le misure del kit ─────────────────────────────────────────────────
prova('contenitore e raggio restano nei limiti del kit', () => {
  const css = fs.readFileSync(stile, 'utf8');
  const lato = (css.match(/width:\s*(\d+)px/) || [])[1];
  deve(lato && +lato >= 26 && +lato <= 34, 'il contenitore è fuori dai 26–34px del kit: ' + lato);
  const raggi = [...css.matchAll(/border-radius:\s*(\d+)px/g)].map(m => +m[1]);
  deve(raggi.length, 'nessun raggio dichiarato');
  deve(Math.max(...raggi) <= 8, 'raggio oltre gli 8px del kit: ' + Math.max(...raggi));
});

// ── 3. Il verde non segue l'accento scelto dall'utente ───────────────────
prova('il verde è fisso, non segue l\'accento del tema', () => {
  const css = fs.readFileSync(stile, 'utf8');
  /* In IAM --acc è l'accento scelto dall'utente: arancione, blu, verde o
     viola. Legarci il pittogramma lo farebbe diventare viola, che il kit
     vieta. */
  deve(!/var\(\s*--acc\b/.test(css), 'il pittogramma segue --acc: cambierebbe colore col tema');
  deve(/#0[0-9a-f]{5}|--wus-pictogram-green/i.test(css), 'il verde del pittogramma non è definito');
});

// ── 4. Uno per titolo, e solo nel titolo ─────────────────────────────────
prova('un pittogramma solo, e sta nel titolo di sezione', () => {
  deve(/id="w1-pitto"/.test(scocca), 'la scocca non mostra nessun pittogramma');
  const quanti = (scocca.match(/wus-pictogram/g) || []).length;
  deve(quanti === 1, 'la scocca disegna ' + quanti + ' pittogrammi: il kit ne vuole uno per titolo');
  /* Se fosse dentro il pulsante «Nuovo preventivo» lo farebbe sembrare una
     scheda invece di un'azione. */
  const dopoAz = scocca.slice(scocca.indexOf('w1-az'));
  deve(!/wus-pictogram/.test(dopoAz), 'un pittogramma è finito dentro i pulsanti della barra');
});

prova('nessun pittogramma nelle tabelle o nelle pastiglie di stato', () => {
  /* Riga dopo riga diventa rumore, ed è la regola che si perde per prima. */
  const righe = html.split('\n');
  const colpevoli = righe
    .map((r, i) => [i + 1, r])
    .filter(([, r]) => /wus-pictogram/.test(r) && /<t[dhr]\b|class="[^"]*\b(badge|pill|chip|stato|tag)\b/.test(r));
  deve(!colpevoli.length, 'pittogramma in tabella o pastiglia alle righe: ' + colpevoli.map(c => c[0]).join(', '));
});

// ── 5. Niente emoji Unicode ──────────────────────────────────────────────
prova('niente emoji di sistema: solo icone vettoriali', () => {
  /* Blocchi emoji di Unicode. Si guardano i due file del kit, non tutto
     index.html: lì una prova più larga esiste già. */
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  for (const [nome, testo] of [['withus-one.js', scocca], ['withus-pictograms.css', fs.readFileSync(stile, 'utf8')]]) {
    const riga = testo.split('\n').findIndex(r => emoji.test(r));
    deve(riga < 0, nome + ': emoji di sistema alla riga ' + (riga + 1));
  }
});

// ── 6. Ogni sezione ha il suo simbolo, e nessuna resta con quello di prima ─
prova('ogni sezione del menu ha il suo pittogramma', () => {
  const mappa = (scocca.match(/var PITTO = \{[\s\S]*?\};/) || [])[0];
  deve(mappa, 'manca la mappa dei pittogrammi');
  /* Le chiavi sono quelle del menu: una sezione senza voce mostrerebbe il
     simbolo della sezione precedente, che dice il falso. */
  for (const k of ['dashboard', 'quoto', 'clienti', 'portafoglio', 'carica', 'agenzia', 'strumenti', 'admin']) {
    deve(new RegExp('\\b' + k + '\\s*:').test(mappa), 'manca il pittogramma per la sezione ' + k);
  }
  const f = (scocca.match(/function aggiornaPittogramma\(k\)[\s\S]*?\n  \}/) || [])[0];
  deve(f, 'manca aggiornaPittogramma');
  deve(/PITTO\[k\]\s*\|\|/.test(f), 'una sezione fuori mappa resterebbe col simbolo di prima');
  /* Cambiando sezione il simbolo deve cambiare davvero. */
  deve(/aggiornaPittogramma\(k\)/.test(scocca), 'il pittogramma non viene aggiornato cambiando sezione');
});

// ── 7. Il pittogramma non deve schiacciare il titolo sul telefono ────────
prova('su schermo stretto lo spazio va al titolo', () => {
  const css = fs.readFileSync(path.join(radice, 'withus-one.css'), 'utf8');
  deve(/w1-pt/.test(css), 'il titolo con pittogramma non ha una disposizione sua');
  deve(/@media[^{]*max-width:\s*5\d\dpx[^{]*\{[^}]*wus-pictogram[^}]*display:\s*none/.test(css.replace(/\s+/g, ' ')),
    'sul telefono il pittogramma resta e spinge fuori il titolo');
});

// ── 8. Le illustrazioni di prodotto ──────────────────────────────────────
prova('le tavole del kit ci sono e non pesano come una pagina intera', () => {
  const dir = path.join(radice, 'assets', 'kit');
  deve(fs.existsSync(dir), 'manca assets/kit');
  for (const n of ['prodotti-insurtech.webp', 'caricamenti-insurtech.webp']) {
    const p = path.join(dir, n);
    deve(fs.existsSync(p), 'manca ' + n);
    /* Il gestionale si usa anche da telefono, spesso in giro: le tavole
       originali pesavano 1,1 MB l'una. Sopra i 150 KB tornerebbe a essere
       un problema di connessione, non di grafica. */
    const kb = fs.statSync(p).size / 1024;
    deve(kb < 150, n + ' pesa ' + Math.round(kb) + ' KB: troppo per una connessione mobile');
  }
  return 'due tavole, entrambe sotto i 150 KB';
});

let ko = 0;
console.log('\nKIT GRAFICO — i pittogrammi With Us');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome + (msg ? ' — ' + msg : '') : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nKIT GRAFICO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
