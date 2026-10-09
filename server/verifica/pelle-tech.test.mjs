/* ═══════════════════════════════════════════════════════════════════════════════
   LA PELLE TECH — le prove                                    (07/10/2026)

   Una revisione grafica non si prova guardando uno scatto: si prova
   difendendo le poche cose che, se si rompono, la fanno sparire senza che
   nessuno veda un errore.

   TRE SONO SILENZIOSE, e sono quelle che contano:

   1. LA PELLE DEV'ESSERE L'ULTIMO FOGLIO. Ridefinisce token che il resto della
      pagina usa 3.103 volte in linea, e a parità di specificità vince chi
      arriva dopo. Spostare il `<link>` tre righe più in su la disattiva e non
      stampa niente in console: la pagina torna com'era e sembra solo che la
      pelle «non abbia funzionato».

   2. LA PELLE NON DEVE SPOSTARE LE SCATOLE. Cambia colore, forma e carattere.
      Se comincia a toccare margini, posizioni e larghezze su selettori che non
      sono suoi, rompe schermate che nessuno ha riaperto — e il giorno dopo si
      dà la colpa all'ultima funzione aggiunta.

   3. «FERME, NON ASSENTI». Chi ha chiesto di non vedere le animazioni deve
      comunque vedere che la pagina sta caricando. Togliere l'indicatore invece
      di fermarlo è il modo più facile di soddisfare `prefers-reduced-motion`
      e il più sbagliato.

       node server/verifica/pelle-tech.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servi, chromiumPlaywright as chromium } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const PELLE = path.join(RADICE, 'withus-tech.css');
const CSS = fs.readFileSync(PELLE, 'utf8');
const IAM = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
const QUOTO = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

// ── parte statica ────────────────────────────────────────────────────────────
prova('LA PELLE È L\'ULTIMO FOGLIO DI TUTT\'E DUE LE PAGINE', () => {
  [['iam/index.html', IAM], ['index.html', QUOTO]].forEach(([nome, testo]) => {
    const fogli = (testo.slice(0, testo.indexOf('</head>')).match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []);
    deve(fogli.length, nome + ': non carica nessun foglio');
    const ultimo = fogli[fogli.length - 1];
    deve(/withus-tech\.css/.test(ultimo),
      nome + ': l\'ultimo foglio è un altro, quindi la pelle è disattivata — ' + ultimo);
    deve(/withus-tech\.css\?v=\d{8}/.test(ultimo),
      nome + ': la pelle è caricata senza contrassegno di versione, il browser terrà la vecchia');
  });
});

prova('LA PELLE NON SPOSTA LE SCATOLE', () => {
  /* Le uniche eccezioni sono dichiarate qui, con il loro perché: sono i
     selettori che la pelle possiede (le sue classi e le schermate di avvio) e
     `.cl-carico-g`, la rotella delle attese che c'erano già, che diventa una
     spia di sei pixel — un cambio di misura voluto, su un elemento che non
     contiene niente. */
  const MIEI = /(^|,)\s*(\.wl-|\.t-|#boot-screen|\.ls::before|\.boot-|\.cl-carico|::-webkit-scrollbar|\*\s*\{)/;
  const LAYOUT = /(^|[;{\s])(margin|padding|display|position|top|right|bottom|left|float|flex-direction|grid-template|gap|order)\s*:/;
  const senzaCommenti = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const regole = senzaCommenti.match(/[^{}]+\{[^{}]*\}/g) || [];
  deve(regole.length > 20, 'non ho saputo leggere le regole della pelle: ne ho trovate ' + regole.length);
  const colpevoli = [];
  regole.forEach((r) => {
    const sel = r.slice(0, r.indexOf('{')).trim();
    const corpo = r.slice(r.indexOf('{') + 1);
    if (/^@/.test(sel) || !sel) return;
    if (MIEI.test(sel) || MIEI.test(',' + sel)) return;
    if (LAYOUT.test(corpo)) colpevoli.push(sel + ' { ' + corpo.trim().slice(0, 70) + ' }');
  });
  deve(!colpevoli.length, 'la pelle sposta le scatole in ' + colpevoli.length + ' punti:\n    ' + colpevoli.join('\n    '));
});

prova('IL MONOSPAZIATO È DI SISTEMA: LA PELLE NON SCARICA NIENTE', () => {
  /* Un font scaricato è una dipendenza di rete in più su un gestionale che
     deve aprirsi anche con la linea del telefono — e se il CDN non risponde,
     i numeri cambiano larghezza mentre si guarda. */
  deve(!/@import/.test(CSS), 'la pelle importa un altro foglio');
  deve(!/url\(\s*['"]?https?:/.test(CSS), 'la pelle scarica qualcosa dalla rete');
  /* La pila dev'essere CHIUSA dalla famiglia generica `monospace`: è lei che
     garantisce un carattere a larghezza fissa anche su una macchina che non ha
     nessuno dei nomi elencati prima. Cercare la sola parola «monospace» non
     misurava niente — la trova dentro «ui-monospace», che è il PRIMO nome
     della pila. (Un guasto della controprova non veniva preso, ed è stato lui
     a dirlo.) */
  deve(/--t-mono:[^;]*,\s*monospace\s*;/.test(CSS),
    'la pila del monospaziato non è chiusa dalla famiglia generica: ' + (CSS.match(/--t-mono:[^;]*/) || [''])[0]);
});

prova('LA PELLE DICE QUELLO CHE NON RITONA', () => {
  /* Un foglio che si presenta come «la grafica del sistema» e ne copre una
     parte deve dire quale parte lascia fuori, o chi legge si fida della
     presentazione invece che dei fatti. */
  const i = CSS.search(/NON RITONA|non ritona/);
  deve(i > 0, 'la pelle non dichiara il suo limite');
  /* I numeri si cercano DENTRO il blocco che li deve portare, non in tutto il
     file: i due valori compaiono anche nell'intestazione, quindi cercarli
     ovunque faceva passare un blocco finale svuotato. (Un guasto della
     controprova non veniva preso, ed è stato lui a dirlo.) */
  const blocco = CSS.slice(i);
  deve(/\b262\b/.test(blocco) && /\b374\b/.test(blocco),
    'il limite è dichiarato senza i numeri misurati: una dichiarazione senza numero invecchia e nessuno se ne accorge');
});

// ── parte nel browser ────────────────────────────────────────────────────────
const { srv, porta } = await servi(RADICE);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const base = 'http://127.0.0.1:' + porta;

async function apri(url, opz) {
  const p = await b.newPage(Object.assign({ viewport: { width: 1280, height: 800 } }, opz || {}));
  await p.goto(base + url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  return p;
}

prova('I TOKEN NUOVI ARRIVANO DAVVERO, IN TUTT\'E DUE LE APPLICAZIONI', async () => {
  for (const [nome, url] of [['IAM', '/iam/index.html'], ['QUOTO', '/index.html']]) {
    const p = await apri(url);
    const t = await p.evaluate(() => {
      const s = getComputedStyle(document.body);
      const l = (n) => s.getPropertyValue(n).trim();
      return { dati: l('--t-dati'), mono: l('--t-mono'), sans: l('--t-sans'), corpo: s.fontFamily, scuro: l('--w1-scuro'), rs: l('--rs'), r: l('--w1-r') };
    });
    await p.close();
    deve(t.dati === '#06b6d4', nome + ': il ciano dei segnali non arriva (--t-dati = «' + t.dati + '»)');
    deve(/monospace/.test(t.mono), nome + ': il monospaziato non arriva');
    /* 09/10/2026: un carattere solo per testo e numeri, chiesto da Francesco */
    deve(/Figtree/.test(t.sans) && /Figtree/.test(t.corpo), nome + ': il carattere del testo non è Figtree (corpo: «' + t.corpo + '»)');
    deve(t.scuro === '#0d131c', nome + ': la barra scura non è quella nuova (--w1-scuro = «' + t.scuro + '»)');
    deve(t.r === 'var(--t-r)' || t.r === '3px', nome + ': il raggio della scocca non è quello nuovo: «' + t.r + '»');
  }
});

prova('IN IAM LA PELLE VINCE SUI TOKEN SCRITTI NELLA PAGINA', async () => {
  /* IAM definisce i suoi token dentro un `<style>` su `body.theme-light`. Se
     la pelle non li raggiunge, il colore resta quello di prima e non se ne
     accorge nessuno: la pagina funziona lo stesso. */
  const p = await apri('/iam/index.html');
  const t = await p.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.getPropertyValue('--bg').trim(), txt2: s.getPropertyValue('--txt2').trim(), rs: s.getPropertyValue('--rs').trim() };
  });
  await p.close();
  deve(t.bg !== '#F0F2F8', 'il fondo è ancora quello di prima: la pelle non raggiunge body.theme-light');
  deve(t.txt2 !== '#5A5A7A', 'il testo secondario è ancora quello di prima');
  deve(t.rs === 'var(--t-r)' || t.rs === '3px', 'il raggio piccolo è ancora quello di prima: «' + t.rs + '»');
});

prova('LE QUATTRO FASI DI CARICAMENTO SI VEDONO DAVVERO', async () => {
  const p = await apri('/iam/index.html');
  const r = await p.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'width:420px;position:fixed;top:0;left:0;z-index:99999';
    d.innerHTML = Caricamento.barra() + Caricamento.blocco('Leggo la contabilità', { righe: 3 })
      + '<button>' + Caricamento.anello() + '</button>';
    document.body.appendChild(d);
    const mis = (sel, quale) => {
      const e = d.querySelector(sel); if (!e) return null;
      const s = getComputedStyle(e), prima = getComputedStyle(e, '::before'), dopo = getComputedStyle(e, '::after');
      return { h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width,
        font: s.fontFamily, trasf: s.textTransform,
        animPrima: prima.animationName, animDopo: dopo.animationName,
        sfondoPrima: prima.backgroundColor };
    };
    return { barra: mis('.wl-barra'), stato: mis('.wl-stato'), scheletro: mis('.wl-scheletro'), anello: mis('.wl-anello') };
  });
  await p.close();
  deve(r.barra && r.barra.h >= 1 && r.barra.h <= 4, 'la barra non è alta due pixel: ' + JSON.stringify(r.barra));
  deve(r.barra.animDopo !== 'none', 'la barra sta ferma');
  deve(r.stato && /Figtree/i.test(r.stato.font) && r.stato.trasf === 'uppercase',
    'lo stato non è nel carattere del testo, maiuscoletto: ' + JSON.stringify(r.stato));
  deve(r.stato.animPrima !== 'none', 'la spia dello stato non pulsa');
  deve(r.scheletro && r.scheletro.h > 5 && r.scheletro.w > 50, 'lo scheletro non ha corpo: ' + JSON.stringify(r.scheletro));
  deve(r.anello && r.anello.h >= 12 && r.anello.h <= 18, 'l\'anello non è quattordici pixel: ' + JSON.stringify(r.anello));
});

prova('SENZA ANIMAZIONI RESTANO FERME, NON SPARISCONO', async () => {
  const p = await apri('/iam/index.html', { reducedMotion: 'reduce' });
  const r = await p.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'width:420px;position:fixed;top:0;left:0;z-index:99999';
    d.innerHTML = Caricamento.barra() + Caricamento.blocco('Leggo la contabilità', { righe: 2 });
    document.body.appendChild(d);
    const e = (s) => d.querySelector(s);
    const g = (s, p) => getComputedStyle(e(s), p || null);
    return {
      barraAnim: g('.wl-barra', '::after').animationName,
      barraVisibile: e('.wl-barra').getBoundingClientRect().height >= 1
        && g('.wl-barra', '::after').opacity !== '0',
      spiaAnim: g('.wl-stato', '::before').animationName,
      spiaVisibile: g('.wl-stato', '::before').backgroundColor !== 'rgba(0, 0, 0, 0)',
      scheletroVisibile: e('.wl-scheletro').getBoundingClientRect().height > 5,
      statoLeggibile: (e('.wl-stato').textContent || '').trim().length > 3,
    };
  });
  await p.close();
  deve(r.barraAnim === 'none' && r.spiaAnim === 'none', 'le animazioni continuano: ' + JSON.stringify(r));
  deve(r.barraVisibile, 'la barra sparisce invece di fermarsi');
  deve(r.spiaVisibile, 'la spia sparisce invece di fermarsi');
  deve(r.scheletroVisibile, 'lo scheletro sparisce');
  deve(r.statoLeggibile, 'la frase che dice che cosa si sta aspettando sparisce');
});

prova('I CAMPI DEGLI IMPORTI SONO IN MONOSPAZIATO E SQUADRATI', async () => {
  /* Non è vezzo: le cifre a larghezza fissa si incolonnano, e uno zero di
     troppo si vede a occhio. Si misura sul campo vero dei link di pagamento. */
  const p = await apri('/iam/index.html');
  const r = await p.evaluate(() => {
    const e = document.getElementById('pg-importo'); if (!e) return null;
    const s = getComputedStyle(e);
    return { font: s.fontFamily, raggio: s.borderTopLeftRadius, cifre: s.fontVariantNumeric };
  });
  await p.close();
  deve(r, 'il campo dell\'importo non c\'è più');
  /* 09/10/2026: le cifre restano incolonnate, ma nel carattere del testo —
     il monospaziato pesava sulla lettura (richiesta di Francesco). */
  deve(/Figtree/i.test(r.font), 'il campo dell\'importo non è nel carattere del testo: ' + r.font);
  deve(/tabular-nums/.test(r.cifre), 'le cifre del campo non si incolonnano: ' + r.cifre);
  deve(parseFloat(r.raggio) <= 4, 'il campo non è squadrato: raggio ' + r.raggio);
});

prova('LE ATTESE CHE C\'ERANO GIÀ PARLANO LA LINGUA NUOVA', async () => {
  /* `.cl-carico` è il modo in cui undici punti di IAM dicono «sto lavorando».
     La pelle li porta tutti sul linguaggio nuovo con una regola sola: se
     questa cade, quegli undici punti tornano indietro da soli. */
  const p = await apri('/iam/index.html');
  const r = await p.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = '<div class="cl-carico"><span class="cl-carico-g"></span>Carico i sospesi…</div>';
    document.body.appendChild(d);
    const riga = getComputedStyle(d.querySelector('.cl-carico'));
    const spia = d.querySelector('.cl-carico-g');
    const s = getComputedStyle(spia);
    return { font: riga.fontFamily, trasf: riga.textTransform, lato: spia.getBoundingClientRect().width, bordo: s.borderTopWidth };
  });
  await p.close();
  deve(/Figtree/i.test(r.font) && r.trasf === 'uppercase', 'la riga non è nel linguaggio nuovo: ' + JSON.stringify(r));
  deve(r.lato <= 8, 'la rotella non è diventata una spia: è larga ' + r.lato + 'px');
  deve(parseFloat(r.bordo) === 0, 'la spia ha ancora il bordo della rotella');
});

prova('L\'AVVIO DICE CHE COSA STA FACENDO, A VOCE E A SCHERMO', async () => {
  /* Prima la riga era nascosta ai soli lettori di schermo («sotto il marchio
     una riga di testo è rumore»). Su un gestionale che si apre venti volte al
     giorno, «è partito o è bloccato?» è una domanda più cara di due centimetri
     di schermo. */
  const p = await apri('/index.html');
  const r = await p.evaluate(() => {
    const b = document.getElementById('boot-screen'); if (!b) return null;
    b.classList.remove('off');
    const t = b.querySelector('.boot-txt');
    const s = getComputedStyle(t);
    const griglia = getComputedStyle(b, '::before');
    const logo = getComputedStyle(b.querySelector('.boot-logo'));
    return { testo: (t.textContent || '').trim(), largo: t.getBoundingClientRect().width,
      font: s.fontFamily, trasf: s.textTransform,
      grigliaAnim: griglia.animationName, logoAnim: logo.animationName,
      dichiarato: b.getAttribute('role') };
  });
  await p.close();
  deve(r, 'la schermata di avvio non c\'è più');
  deve(r.largo > 40, 'la riga di avvio è ancora nascosta: larga ' + r.largo + 'px');
  deve(/Figtree/i.test(r.font) && r.trasf === 'uppercase', 'la riga di avvio non è nel linguaggio nuovo');
  deve(r.grigliaAnim !== 'none', 'la griglia dell\'avvio sta ferma');
  deve(r.logoAnim === 'none', 'il marchio respira ancora: è la barra a dire che si lavora, non il marchio');
  deve(r.dichiarato === 'status', 'l\'avvio non si dichiara ai lettori di schermo');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPELLE TECH — la revisione grafica del sistema');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
await b.close(); srv.close();
console.log('\nPELLE TECH: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
