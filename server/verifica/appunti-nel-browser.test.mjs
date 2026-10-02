// ═══════════════════════════════════════════════════════════════════════════════
//  APPUNTI INCASSI — LA SCHERMATA, IN UN BROWSER VERO
//
//  Le prove in Node (`appunti-incassi.test.mjs`) dicono che il motore abbina
//  giusto. Non dicono che la SCHERMATA lo faccia vedere: un `<script src>` senza
//  contrassegno, una funzione che si chiama diversamente, un `id` cambiato — e
//  in Node non si accorge nessuno, perché in Node quel file lo carica `require`
//  e il disegno non esiste.
//
//  Qui si apre IAM in Chromium, si accende il guscio (IAM tiene tutto dentro
//  `#app`, spento finché non si entra) e si chiede alla schermata vera di
//  disegnare una giornata coi quattro stati. Nessun database: i dati sono finti,
//  il disegno è quello di produzione.
//
//  I quattro stati vengono dal manuale AssiEasy: OK, Appunto, Scostamento,
//  Solo foglio cassa.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apriIam } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriIam(RADICE, { dentro: 'appunti' });
const p = banco.pagina;

/* La giornata finta: tre righe nostre, tre della compagnia, e ogni stato una
   volta sola.
     BLP1  200 = 200   -> OK
     BLP2  100 ≠  90   -> Scostamento
     BLP3  340 e basta -> Appunto  (nostro, la compagnia non l'ha ancora)
     BLP9       75     -> Solo foglio cassa (sua, noi non l'abbiamo contata) */
const GIORNATA = {
  nostre: [
    { id: 'n1', polizza: 'BLP1', effetto: '2026-01-01', importo: 200, compagnia: 'PRIMA', cliente: 'ROSSI MARIO', sigla: 'QF' },
    { id: 'n2', polizza: 'BLP2', effetto: '2026-01-01', importo: 100, compagnia: 'PRIMA', cliente: 'VERDI ANNA', sigla: 'NP' },
    { id: 'n3', polizza: 'BLP3', effetto: '2026-01-01', importo: 340, compagnia: 'HDI', cliente: 'BIANCHI LUIGI', sigla: 'QR' },
  ],
  loro: [
    { id: 'f1', polizza: 'BLP1', effetto: '2026-01-01', importo: 200, compagnia: 'PRIMA', cliente: 'ROSSI MARIO' },
    { id: 'f2', polizza: 'BLP2', effetto: '2026-01-01', importo: 90, compagnia: 'PRIMA', cliente: 'VERDI ANNA' },
    { id: 'f4', polizza: 'BLP9', effetto: '2026-01-01', importo: 75, compagnia: 'PRIMA', cliente: 'NERI GIULIA' },
  ],
};

/* Disegna una giornata con la funzione vera e riporta che cosa si legge a
   schermo. `quanteNostre`/`quanteLoro` sono i due conti che la schermata usa
   per decidere se dire il discorso del «tutto dal flusso». */
async function disegna(g, quanteNostre, quanteLoro) {
  return p.evaluate(({ dati, giorno, qn, ql }) => {
    const M = window.ContabilitaGiornaliera;
    if (!M) return { errore: 'il motore della giornata non è caricato' };
    const a = M.abbinaFoglio(dati.nostre, dati.loro);
    const campo = document.getElementById('app-giorno');
    if (campo) campo.value = giorno;
    appDisegna(a, giorno, qn, ql);
    return {
      quadretti: [...document.querySelectorAll('#app-somma .app-q')]
        .map(e => ({ t: e.querySelector('span')?.textContent.trim(), v: e.querySelector('b')?.textContent.trim(), cls: e.className })),
      righe: [...document.querySelectorAll('.app-riga')].map(e => ({
        stato: e.querySelector('.app-stato')?.textContent.trim(),
        chi: e.querySelector('.app-chi b')?.textContent.trim(),
        sotto: e.querySelector('.app-chi .cl-sub')?.textContent.trim(),
        imp: e.querySelector('.app-imp')?.firstChild?.textContent.trim(),
        sco: e.querySelector('.app-sco')?.textContent.trim() || null,
        perche: e.querySelector('.app-perche')?.textContent.trim() || null,
        tinta: e.className,
      })),
      avviso: document.getElementById('app-avviso').textContent.trim(),
      testo: document.getElementById('app-righe').textContent,
      conti: { ok: a.ok, appunti: a.appunti, scostamenti: a.scostamenti, soloFoglio: a.soloFoglio, differenza: a.differenza },
    };
  }, { dati: GIORNATA, giorno: g, qn: quanteNostre, ql: quanteLoro });
}

const vista = await disegna('2026-09-19', GIORNATA.nostre.length, GIORNATA.loro.length);

// ── 1. che la schermata esista davvero ───────────────────────────────────────

prova('IAM carica il motore della giornata', async () => {
  const c = await p.evaluate(() => {
    const M = window.ContabilitaGiornaliera || {};
    return { motore: !!window.ContabilitaGiornaliera, abbina: typeof M.abbinaFoglio === 'function',
             stato: typeof M.statoAppunto === 'function', stati: Object.keys(M.STATI_APPUNTO || {}) };
  });
  deve(c.motore, 'window.ContabilitaGiornaliera non esiste: il tag <script> non c\'è o non si carica');
  deve(c.abbina && c.stato, 'il motore c\'è ma non porta l\'abbinamento del foglio: ' + JSON.stringify(c));
  deve(c.stati.length === 4, 'gli stati del manuale sono quattro, qui sono ' + c.stati.length + ': ' + c.stati.join());
});

prova('e le funzioni della schermata che lo usano', async () => {
  const c = await p.evaluate(() => ({
    apri: typeof appApri === 'function', carica: typeof appCarica === 'function',
    disegna: typeof appDisegna === 'function', riga: typeof appRiga === 'function',
  }));
  deve(c.apri && c.carica && c.disegna && c.riga, 'funzioni della schermata mancanti: ' + JSON.stringify(c));
});

prova('il pannello e i suoi quattro riquadri esistono nella pagina', async () => {
  const c = await p.evaluate(() => ({
    pannello: !!document.getElementById('contab-panel-appunti'),
    giorno: !!document.getElementById('app-giorno'),
    avviso: !!document.getElementById('app-avviso'),
    somma: !!document.getElementById('app-somma'),
    righe: !!document.getElementById('app-righe'),
  }));
  deve(Object.values(c).every(Boolean), 'manca un pezzo del pannello: ' + JSON.stringify(c));
});

// ── 2. i quattro stati, disegnati ────────────────────────────────────────────

prova('i quattro stati del manuale si vedono tutti e quattro', () => {
  deve(!vista.errore, vista.errore || '');
  const stati = vista.righe.map(r => r.stato);
  for (const atteso of ['OK', 'Appunto', 'Scostamento', 'Solo foglio cassa']) {
    deve(stati.includes(atteso), 'lo stato «' + atteso + '» non compare a schermo: ' + JSON.stringify(stati));
  }
  deve(vista.righe.length === 4, 'righe disegnate: ' + vista.righe.length + ' invece di 4');
});

prova('ogni riga porta il nome di chi ha pagato e il suo importo', () => {
  const per = Object.fromEntries(vista.righe.map(r => [r.stato, r]));
  deve(per['OK'].chi === 'ROSSI MARIO' && /200,00/.test(per['OK'].imp), JSON.stringify(per['OK']));
  deve(per['Appunto'].chi === 'BIANCHI LUIGI' && /340,00/.test(per['Appunto'].imp), JSON.stringify(per['Appunto']));
  deve(per['Solo foglio cassa'].chi === 'NERI GIULIA' && /75,00/.test(per['Solo foglio cassa'].imp), JSON.stringify(per['Solo foglio cassa']));
});

prova('lo scostamento mostra la differenza, non solo il nostro importo', () => {
  /* Vedere «€ 100,00» e basta su una riga che la compagnia ha incassato 90 vuol
     dire non vedere il problema: i dieci euro sono la ragione della riga. */
  const s = vista.righe.find(r => r.stato === 'Scostamento');
  deve(s, 'nessuna riga di scostamento');
  deve(s.sco && /10,00/.test(s.sco), 'lo scarto non è scritto sulla riga: ' + JSON.stringify(s));
  deve(/-/.test(s.sco), 'lo scarto non porta il segno: ' + s.sco);
});

prova('la riga dice anche PERCHÉ sta in quello stato', () => {
  /* Uno stato senza motivo costringe a riaprire il flusso per capire. */
  const conMotivo = vista.righe.filter(r => r.perche && r.perche.length > 5);
  deve(conMotivo.length >= 3, 'solo ' + conMotivo.length + ' righe su 4 spiegano il proprio stato');
});

prova('la riga porta la compagnia e il numero di polizza', () => {
  const ok = vista.righe.find(r => r.stato === 'OK');
  deve(/PRIMA/.test(ok.sotto) && /BLP1/.test(ok.sotto), 'sotto il nome manca compagnia o polizza: ' + ok.sotto);
});

// ── 3. il riassunto in cima ──────────────────────────────────────────────────

prova('i sette riquadri del riassunto ci sono, coi conti del motore', () => {
  const q = Object.fromEntries(vista.quadretti.map(x => [x.t, x.v]));
  for (const t of ['OK', 'Appunti', 'Scostamenti', 'Solo foglio cassa', 'Nostro totale', 'Foglio cassa', 'Differenza']) {
    deve(t in q, 'manca il riquadro «' + t + '»: ' + Object.keys(q).join(', '));
  }
  deve(q['OK'] === '1' && q['Appunti'] === '1' && q['Scostamenti'] === '1' && q['Solo foglio cassa'] === '1',
    'i conti a schermo non sono quelli del motore: ' + JSON.stringify(q));
});

prova('i totali a schermo sono i totali veri: 640 nostri, 365 suoi', () => {
  const q = Object.fromEntries(vista.quadretti.map(x => [x.t, x.v]));
  deve(/640,00/.test(q['Nostro totale']), 'nostro totale: ' + q['Nostro totale']);
  deve(/365,00/.test(q['Foglio cassa']), 'foglio cassa: ' + q['Foglio cassa']);
  deve(/275,00/.test(q['Differenza']) && /-/.test(q['Differenza']), 'differenza: ' + q['Differenza']);
});

prova('una differenza si tinge di rosso, non resta un numero come gli altri', () => {
  const d = vista.quadretti.find(x => x.t === 'Differenza');
  deve(/app-q-no/.test(d.cls), 'la differenza di 275 euro non è segnalata: ' + d.cls);
});

prova('con righe da sanare il verdetto in cima NON dice «giornata chiusa»', () => {
  deve(!/chiusa: nessuna/i.test(vista.avviso), 'una giornata con tre righe storte si dichiara chiusa: ' + vista.avviso);
  deve(/3 righe/.test(vista.avviso), 'il verdetto non conta le righe da guardare: ' + vista.avviso);
});

// ── 4. i tre casi che cambiano il discorso ───────────────────────────────────

prova('quando TUTTO viene dal flusso, il problema si dice una volta sola', async () => {
  /* Il 23/09 vero: 2.799 incassi, tutti dal flusso, nessuno nostro. Disegnarlo
     riga per riga vorrebbe dire 2.799 righe rosse che dicono la stessa cosa. */
  const v = await disegna('2026-09-23', 0, 3);
  deve(/non abbiamo registrato niente noi/i.test(v.testo),
    'la schermata non spiega la giornata presa per buona dalla compagnia');
  const ripetuto = (v.testo.match(/solo sul foglio cassa/g) || []).length;
  deve(ripetuto === 0, 'l\'avviso per riga viene ripetuto ' + ripetuto + ' volte oltre al discorso generale');
});

prova('una giornata tutta a posto si dichiara chiusa', async () => {
  const v = await p.evaluate(() => {
    const M = window.ContabilitaGiornaliera;
    const n = [{ id: 'a', polizza: 'X1', effetto: '2026-01-01', importo: 50, compagnia: 'PRIMA', cliente: 'TIZIO' }];
    const f = [{ id: 'b', polizza: 'X1', effetto: '2026-01-01', importo: 50, compagnia: 'PRIMA', cliente: 'TIZIO' }];
    appDisegna(M.abbinaFoglio(n, f), '2026-09-01', 1, 1);
    return { avviso: document.getElementById('app-avviso').textContent.trim(),
             righe: document.querySelectorAll('.app-riga').length };
  });
  deve(/chiusa/i.test(v.avviso), 'una giornata senza problemi non si dichiara chiusa: ' + v.avviso);
  deve(v.righe === 1, 'righe: ' + v.righe);
});

prova('una giornata vuota lo dice, e non si spaccia per chiusa', async () => {
  /* «Giornata chiusa» su un giorno in cui non è stato letto niente è la bugia
     più comoda che una schermata di cassa possa dire. */
  const v = await p.evaluate(() => {
    const M = window.ContabilitaGiornaliera;
    appDisegna(M.abbinaFoglio([], []), '2026-08-15', 0, 0);
    return { somma: document.getElementById('app-somma').textContent.trim(),
             righe: document.querySelectorAll('.app-riga').length };
  });
  deve(v.righe === 0, 'righe su una giornata vuota: ' + v.righe);
  deve(/nessun incasso/i.test(v.somma), 'la giornata vuota non si spiega: ' + v.somma);
  deve(!/chiusa/i.test(v.somma), 'una giornata mai contata si dichiara chiusa: ' + v.somma);
});

prova('la data a parole non fa morire il disegno', async () => {
  /* `cntData` non esiste in IAM: chiamarla avrebbe fermato il disegno proprio
     sulla giornata vuota, cioè dove una schermata sembra rotta senza esserlo. */
  const v = await p.evaluate(() => {
    const M = window.ContabilitaGiornaliera;
    appDisegna(M.abbinaFoglio([], []), '2026-08-15', 0, 0);
    return document.getElementById('app-somma').textContent;
  });
  deve(/15\/08\/2026/.test(v), 'la data non è scritta in italiano: ' + v.trim());
});

// ── 5. ci si arriva ──────────────────────────────────────────────────────────

prova('la voce di menu «Appunti incassi» porta a questa schermata', () => {
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'withus-one.js'), 'utf8');
  deve(/Appunti incassi/.test(src), 'la voce non esiste nel menu');
  const i = src.indexOf('Appunti incassi');
  deve(/vai\('appunti'\)/.test(src.slice(i - 200, i + 200)), 'la voce non apre la sottopagina «appunti»');
});

prova('e la sottopagina è nell\'elenco di quelle che esistono', () => {
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
  deve(/if \(sub *=== *'appunti'\) *appApri\(\);/.test(src),
    'entrando nella sottopagina nessuno chiama appApri: la schermata resterebbe vuota');
});

prova('aprendo IAM non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nAPPUNTI INCASSI — la schermata, in un browser vero');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
if (process.env.APP_FOTO) {
  await disegna('2026-09-19', GIORNATA.nostre.length, GIORNATA.loro.length);
  const el = await p.$('#contab-panel-appunti');
  if (el) { await el.screenshot({ path: process.env.APP_FOTO }); console.log('  foto: ' + process.env.APP_FOTO); }
}
await banco.chiudi();
console.log(`\nAPPUNTI NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
