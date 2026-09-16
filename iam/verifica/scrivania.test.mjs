// ═══════════════════════════════════════
//  SCRIVANIA — il design 4/8/2026, rivisto con la veste unica (§13.3)
//
//  La striscia di quattro indicatori in cima è stata TOLTA: ripeteva, a cento
//  pixel di distanza, gli stessi numeri di «Da fare oggi». Ora i numeri stanno
//  una volta sola, dentro «Da fare oggi», dove ogni voce porta all'elenco già
//  filtrato — cioè fa qualcosa, non decora.
//
//  Quello che queste prove sorvegliano:
//   · che la striscia non torni (né la funzione, né il contenitore #d-kpi);
//   · che i numeri restino nel «Da fare oggi», cliccabili e presi dai dati veri;
//   · che i numeri d'esempio del mockup non rientrino mai;
//   · che #d-content porti la stessa veste sobria della parte alta (§13.3).
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

function corpoDi(firma) {
  const i = html.indexOf(firma);
  if (i < 0) return null;
  let liv = 0, j = html.indexOf('{', i);
  const inizio = j;
  for (; j < html.length; j++) {
    if (html[j] === '{') liv++;
    else if (html[j] === '}') { liv--; if (liv === 0) return html.slice(inizio, j + 1); }
  }
  return null;
}

// ── 1. Nessun numero inventato ───────────────────────────────────────────
prova('i numeri d\'esempio del mockup non rientrano', () => {
  /* Se qualcuno reincollasse il mockup, questi rientrerebbero. Si guarda il
     file senza commenti: un commento che spiega perché non si usano può
     nominarli, ed è giusto che lo faccia. */
  const senzaCommenti = html
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  for (const finto of ['8.420', '+12,4%', 'Premi emessi oggi', 'Preventivi in lavorazione']) {
    deve(!senzaCommenti.includes(finto), 'è tornato un valore d\'esempio del mockup: ' + finto);
  }
});

// ── 2. La striscia di indicatori in cima è stata tolta (§13.3) ───────────
prova('la striscia di indicatori in cima non c\'è più', () => {
  deve(!/function oggiIndicatori\b/.test(html), 'è tornata la funzione oggiIndicatori (la striscia doppione)');
  deve(!/id="d-kpi"/.test(html), 'è tornato il contenitore #d-kpi della striscia in cima');
});

// ── 3. I numeri stanno una volta sola, dentro «Da fare oggi» ─────────────
prova('«Da fare oggi» disegna i numeri dai dati veri, cliccabili', () => {
  const d = corpoDi('function oggiDisegna(voci)');
  deve(d, 'manca oggiDisegna');
  deve(/<button/.test(d), 'le voci non sono pulsanti: da tastiera non si raggiungono');
  deve(/oggi-v/.test(d), 'le voci non usano la scheda «da fare oggi»');
  deve(/\$\{v\.n\}/.test(d), 'la voce non mostra il numero calcolato');
  deve(/__OGGI\[\$\{i\}\]\.va\s*&&/.test(d), 'una voce senza destinazione proverebbe ad aprire il nulla');
});

prova('senza niente da fare la scrivania lo dice, e non mostra un vuoto', () => {
  const d = corpoDi('function oggiDisegna(voci)');
  deve(d && /!window\.__OGGI\.length/.test(d), 'con zero voci non c\'è il caso «niente da fare»');
  deve(/in pari/.test(d), 'non viene detto che il lavoro è in pari');
});

// ── 4. La struttura del disegno (senza la striscia) ──────────────────────
prova('intestazione e griglia a due colonne', () => {
  for (const c of ['page-head', 'dashboard-grid', 'stack', 'card-head', 'card-title', 'pictogram']) {
    deve(html.includes(c), 'manca il blocco del disegno: ' + c);
  }
  deve(/grid-template-columns:minmax\(0,1\.45fr\) minmax\(310px,\.8fr\)/.test(html),
    'la griglia non ha le due colonne del disegno');
});

prova('i token sono quelli ufficiali With Us, non riscritti a mano', () => {
  /* Questo disegno, a differenza del kit dei pittogrammi, è già sul verde di
     marchio. Va tenuto lì: due verdi diversi nello stesso prodotto si notano. */
  deve(/#panel-dashboard\{[\s\S]{0,400}--w1-verde:#02984e/.test(html),
    'la scrivania non usa il verde di marchio #02984e');
  deve(!/#panel-dashboard\{[\s\S]{0,600}#087747/.test(html),
    'la scrivania usa il verde del kit invece di quello di marchio');
});

prova('la tavolozza chiara non esce dalla scrivania', () => {
  /* È una superficie chiara fissa: lasciata libera sfonderebbe il tema scuro
     in tutto il resto del gestionale. */
  const i = html.indexOf('#panel-dashboard{');
  deve(i > 0, 'i token della scrivania non sono confinati in #panel-dashboard');
  const blocco = html.slice(i, html.indexOf('}', i));
  deve(/--w1-/.test(blocco), 'i token non sono dichiarati dentro il confine');
});

// ── 5. Veste unica: anche la metà bassa (§13.3) ──────────────────────────
prova('la metà bassa porta la stessa veste sobria della parte alta', () => {
  /* I titoloni centrati bicolori erano la firma della vecchia veste: ora sono
     allineati a sinistra e di un colore solo, come «Da fare oggi». */
  deve(/\.dash-section-title\{[^}]*text-align:left/.test(html),
    'i titoli di sezione sono ancora centrati');
  deve(/\.dash-section-title span\{color:inherit/.test(html),
    'i titoli di sezione sono ancora bicolori');
  /* Le schede di sotto usano la scheda bianca a bordo sottile (--w1-bordo),
     non più il bordo verde spesso. */
  deve(/\.dash-card\{[^}]*--w1-bordo/.test(html),
    'le schede di #d-content non hanno la veste a bordo sottile della parte alta');
  /* La lista di scorciatoie doppia è stata tolta: ne resta una, «Azioni rapide». */
  deve(!/dash-card-title">\s*Funzioni/.test(html),
    'è tornata «Funzioni più utilizzate», doppione di «Azioni rapide»');
});

// ── 6. Il saluto non deve dire il falso ──────────────────────────────────
prova('il saluto segue l\'ora e non inventa un nome', () => {
  const f = corpoDi('function oggiSaluto()');
  deve(f, 'manca oggiSaluto');
  deve(/getHours\(\)/.test(f), 'il saluto non guarda l\'ora: alle otto di sera direbbe «buongiorno»');
  for (const q of ['Buongiorno', 'Buon pomeriggio', 'Buonasera']) {
    deve(f.includes(q), 'manca il saluto: ' + q);
  }
  /* Nel disegno il nome era scritto dentro. Qui viene dal profilo, e se non
     c'è si saluta senza nome invece di salutare la persona sbagliata. */
  deve(!/Buon pomeriggio, Francesco/.test(html), 'il nome del disegno è rimasto scritto nel codice');
  deve(/PROFILO/.test(f) && /nome \?/.test(f), 'il nome non viene dal profilo di chi è entrato');
});

// ── 7. Niente emoji di sistema ───────────────────────────────────────────
prova('la scrivania non usa emoji di sistema', () => {
  /* La stessa faccina è gialla su un telefono, piatta su Windows e diversa
     su un Mac: in un gestionale non è un simbolo. */
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const zona = corpoDi('function oggiDisegna(voci)') || '';
  deve(!emoji.test(zona), 'c\'è ancora un\'emoji di sistema nella scrivania');
});

let ko = 0;
console.log('\nSCRIVANIA — il design consegnato');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome + (msg ? ' — ' + msg : '') : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nSCRIVANIA: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
