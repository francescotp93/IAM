// ═══════════════════════════════════════════════════════════════════════════════
//  LA SCHEDA DELLA POLIZZA, IN UN BROWSER VERO
//
//  Due cose che in Node non si possono vedere:
//
//   1. che il pannello si apra LARGO. La classe che lo allarga sta sulla
//      cornice e il foglio di stile la deve riconoscere: una regola scritta
//      con un selettore sbagliato non dà nessun errore, semplicemente non
//      allarga niente, e la polizza torna a leggersi in una colonna stretta.
//
//   2. che le garanzie si DISEGNINO. Il motore ha le sue 28 prove e dice le
//      cose giuste; se la tabella non le mette a schermo, o le mette coi
//      codici in maiuscolo, quelle prove restano verdi lo stesso.
//
//  Le forme delle garanzie sono quelle vere dell'archivio, lette dal database
//  il 28/09/2026 — non inventate.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { apriPreventivatore } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriPreventivatore(RADICE);
const p = banco.pagina;

/* Una polizza Prima vera e una HDI vera, nelle due forme che i due tracciati
   scrivono in due posti diversi. */
const PRIMA = {
  premio_annuo: 510,
  dati: { ssf: { garanzie: [
    { ssn: 29.59, lordo: 356.4, netto: 281.73, tasse: 74.67, codice: 'RCA', massimale: null, franchigia: null, descrizione: 'RCA' },
    { ssn: 0, lordo: 78, netto: 73.7, tasse: 4.3, codice: 'INFORTUNI_CONDUCENTE', massimale: null, franchigia: null, descrizione: 'INFORTUNI_CONDUCENTE' },
    { ssn: 0, lordo: 75.6, netto: 68.21, tasse: 7.39, codice: 'ASSISTENZA_STRADALE', massimale: null, franchigia: null, descrizione: 'ASSISTENZA_STRADALE' }
  ] } }
};
const HDI = {
  premio_annuo: 467,
  dati: { garanzie: [
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '100101', massimale: 7750000, descrizione: 'RCA', premio_lordo: 360.52 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '010902', massimale: 30000, descrizione: 'Infortuni del Conducente', premio_lordo: 35.77 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '170125', massimale: 20000, descrizione: 'Tutela Legale della Circolazione Basic', premio_lordo: 13.01 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '100112', massimale: 0, descrizione: 'RVE - Rinuncia/Limitazione alla Rivalsa - Estesa', premio_lordo: 39.69 },
    { bene: 'AUTO HDI - PEUGEOT 2008 (GV712FB)', codice: '180129', massimale: 0, descrizione: 'Servizio Assistenza Basic', premio_lordo: 18.01 }
  ] }
};

/* Disegna la sezione delle garanzie nella pagina vera e riporta che cosa si
   legge: intestazioni, righe, totali e la frase sulla quadratura. */
async function disegna(polizza) {
  return p.evaluate((pol) => {
    const sch = window.Garanzie ? window.Garanzie.scheda(pol) : null;
    const d = document.createElement('div');
    d.innerHTML = polGaranzie(sch, (pol.dati.ssf || {}).garanzie || pol.dati.garanzie || []);
    return {
      titolo: d.querySelector('.flu-sez')?.textContent.trim(),
      intestazioni: [...d.querySelectorAll('thead th')].map(e => e.textContent.trim()),
      righe: [...d.querySelectorAll('tbody tr:not(.pol-gar-tot)')].map(r => ({
        nome: r.querySelector('td')?.firstChild?.textContent.trim(),
        sotto: [...r.querySelectorAll('td .cl-sub')].map(e => e.textContent.trim()),
        celle: [...r.querySelectorAll('td')].slice(1).map(e => e.textContent.trim()),
      })),
      totale: [...(d.querySelector('.pol-gar-tot')?.querySelectorAll('td') || [])].map(e => e.textContent.trim()),
      quadra: d.querySelector('.pol-gar-quadra')?.textContent.trim() || null,
      quadraCls: d.querySelector('.pol-gar-quadra')?.className || null,
      testo: d.textContent,
    };
  }, polizza);
}

const vPrima = await disegna(PRIMA);
const vHdi = await disegna(HDI);

// ── il motore arriva nella pagina ────────────────────────────────────────────

prova('la pagina carica il motore delle garanzie', async () => {
  const c = await p.evaluate(() => {
    const M = window.Garanzie || {};
    return { motore: !!window.Garanzie, scheda: typeof M.scheda === 'function',
             nomi: Object.keys(M.NOMI || {}).length, disegno: typeof polGaranzie === 'function' };
  });
  deve(c.motore && c.scheda, 'window.Garanzie non c\'è: il tag <script> manca o non si carica — ' + JSON.stringify(c));
  deve(c.nomi === 19, 'i nomi delle garanzie sono ' + c.nomi + ' invece dei 19 codici veri');
  deve(c.disegno, 'polGaranzie non esiste: la sezione non si disegna');
});

// ── i nomi ───────────────────────────────────────────────────────────────────

prova('a schermo non compare nessun codice in maiuscolo con gli underscore', () => {
  /* È il difetto che si sta togliendo: la scheda scriveva
     `INFORTUNI_CONDUCENTE` al posto di «Infortuni del conducente». */
  const nomi = vPrima.righe.map(r => r.nome);
  const brutti = nomi.filter(n => /^[A-Z_]+$/.test(n) && n.includes('_'));
  deve(!brutti.length, 'codici grezzi a schermo: ' + brutti.join(', '));
  deve(nomi.includes('Infortuni del conducente'), 'nomi: ' + nomi.join(' · '));
  deve(nomi.includes('Assistenza stradale'), 'nomi: ' + nomi.join(' · '));
});

prova('il codice della compagnia resta scritto sotto il nome', () => {
  /* Serve a chi telefona in compagnia: il nome è per il cliente, il codice è
     per loro. Toglierlo del tutto vorrebbe dire dover riaprire il flusso. */
  const inf = vPrima.righe.find(r => r.nome === 'Infortuni del conducente');
  deve(inf && inf.sotto.includes('INFORTUNI_CONDUCENTE'), JSON.stringify(inf));
});

prova('le descrizioni già in italiano di HDI non vengono riscritte', () => {
  const nomi = vHdi.righe.map(r => r.nome);
  deve(nomi.includes('Tutela Legale della Circolazione Basic'), nomi.join(' · '));
  deve(nomi.includes('RVE - Rinuncia/Limitazione alla Rivalsa - Estesa'), nomi.join(' · '));
});

// ── le colonne ───────────────────────────────────────────────────────────────

prova('su Prima si vedono netto, imponibile mancante, tasse e SSN', () => {
  const h = vPrima.intestazioni;
  deve(h.includes('Netto') && h.includes('Tasse') && h.includes('SSN'), h.join(' | '));
  deve(h[h.length - 1] === 'Lordo', 'il lordo non è l\'ultima colonna: ' + h.join(' | '));
});

prova('e NON si vedono le due colonne che Prima manda sempre vuote', () => {
  /* Massimale e franchigia sono nulli su tutte e 11.131 le garanzie di Prima
     in archivio: due colonne di trattini su ogni polizza. */
  const h = vPrima.intestazioni;
  deve(!h.includes('Massimale') && !h.includes('Franchigia'), h.join(' | '));
});

prova('su HDI il massimale si vede, perché HDI ce l\'ha', () => {
  const h = vHdi.intestazioni;
  deve(h.includes('Massimale'), h.join(' | '));
  deve(!h.includes('Tasse'), 'compare una colonna che HDI non manda: ' + h.join(' | '));
  /* Il bene è una frase lunga («AUTO HDI - PEUGEOT 2008 PURETECH 100 S&S
     ACTIVE (GV712FB)»): in colonna spezza la tabella su quattro righe. Va
     sotto il nome, non in intestazione. */
  deve(!h.some(x => /bene/i.test(x)), 'il bene assicurato è finito in colonna: ' + h.join(' | '));
  const rca = vHdi.righe.find(r => r.nome === 'RCA');
  deve(/7\.750\.000/.test(rca.celle.join(' ')), 'il massimale non è scritto: ' + rca.celle.join(' | '));
});

prova('un massimale di zero si scrive zero, non trattino', () => {
  /* Zero dichiarato e «non dichiarato» sono due risposte diverse. */
  const rve = vHdi.righe.find(r => /RVE/.test(r.nome));
  deve(rve && /0,00/.test(rve.celle[0]), 'massimale della RVE: ' + JSON.stringify(rve && rve.celle));
});

// ── i totali e la quadratura ─────────────────────────────────────────────────

prova('il totale in fondo è la somma delle righe', () => {
  deve(/510,00/.test(vPrima.totale.join(' ')), 'totale Prima: ' + vPrima.totale.join(' | '));
  deve(/423,64/.test(vPrima.totale.join(' ')), 'il netto non è totalizzato: ' + vPrima.totale.join(' | '));
  deve(/467,00/.test(vHdi.totale.join(' ')), 'totale HDI: ' + vHdi.totale.join(' | '));
});

prova('quando le garanzie sommano al premio si vede che quadra', () => {
  deve(vPrima.quadra && /sommano esattamente/.test(vPrima.quadra), vPrima.quadra);
  deve(/ok/.test(vPrima.quadraCls), 'la riga della quadratura non è verde: ' + vPrima.quadraCls);
});

prova('quando NON quadra si vede di quanto, e si vede in rosso', async () => {
  /* Una tabella che non quadra e non lo dice è peggio di una tabella che
     manca: si guarda, torna, e si va avanti convinti. */
  const v = await disegna({ premio_annuo: 600, dati: { ssf: { garanzie: [{ codice: 'RCA', descrizione: 'RCA', lordo: 510 }] } } });
  deve(v.quadra && /mancano 90,00/.test(v.quadra), v.quadra);
  deve(/ko/.test(v.quadraCls), 'la differenza non è segnalata in rosso: ' + v.quadraCls);
});

prova('senza il premio della polizza non si dichiara né sì né no', async () => {
  const v = await disegna({ dati: { ssf: { garanzie: [{ codice: 'RCA', descrizione: 'RCA', lordo: 510 }] } } });
  deve(v.quadra && /non dichiara il premio/.test(v.quadra), v.quadra);
  deve(!/ok|ko/.test(v.quadraCls || ''), 'una cosa che non si sa è tinta come una risposta: ' + v.quadraCls);
});

// ── i casi storti ────────────────────────────────────────────────────────────

prova('le garanzie si leggono dalla più cara alla più economica', () => {
  const primi = vHdi.righe.map(r => r.nome);
  deve(primi[0] === 'RCA', 'la prima riga è «' + primi[0] + '»');
});

prova('su una polizza con un bene solo il bene si dice una volta', () => {
  /* Ripetere «AUTO HDI - PEUGEOT 2008 …» su ogni riga è rumore che si impara
     a saltare, e con lui si salta la colonna accanto. */
  const ripetuto = vHdi.righe.filter(r => r.sotto.some(s => /PEUGEOT/.test(s))).length;
  deve(ripetuto === 0, 'il bene è ripetuto su ' + ripetuto + ' righe');
  deve(/Tutte sul bene: AUTO HDI - PEUGEOT/.test(vHdi.testo), 'il bene non è detto affatto');
});

prova('con due beni diversi ognuno sta sulla sua riga', async () => {
  const v = await disegna({ premio_annuo: 100, dati: { garanzie: [
    { bene: 'AUTO - PANDA (AA111AA)', codice: '100101', descrizione: 'RCA', premio_lordo: 60 },
    { bene: 'AUTO - PUNTO (BB222BB)', codice: '100101', descrizione: 'RCA', premio_lordo: 40 }
  ] } });
  deve(v.righe.every(r => r.sotto.some(s => /AA111AA|BB222BB/.test(s))),
    'con due veicoli non si capisce quale RCA è quale: ' + JSON.stringify(v.righe));
});

prova('una polizza a mano dice che le garanzie non ci sono, e perché', async () => {
  const v = await disegna({ premio_annuo: 300, dati: {} });
  deve(/nessuna nel flusso/.test(v.titolo || ''), 'titolo: ' + v.titolo);
  deve(/inserita a mano/.test(v.testo), 'non si spiega perché non ce ne sono: ' + v.testo.trim());
  deve(v.quadra === null, 'su zero garanzie si parla di quadratura: ' + v.quadra);
});

prova('senza motore le garanzie NON spariscono', async () => {
  /* Far sparire le garanzie di una polizza che ce le ha è il difetto peggiore:
     somiglia a un dato che non c'è, e nessuno va a cercarlo. */
  const v = await p.evaluate((pol) => {
    const d = document.createElement('div');
    d.innerHTML = polGaranzie(null, pol.dati.ssf.garanzie);
    return { righe: d.querySelectorAll('tbody tr').length, testo: d.textContent };
  }, PRIMA);
  deve(v.righe === 3, 'righe senza motore: ' + v.righe);
  deve(/motore delle garanzie non è caricato/.test(v.testo), 'il ripiego non si dichiara: ' + v.testo.trim());
});

// ── il dettaglio del contratto ───────────────────────────────────────────────

/* `dati.ssf` vero di una polizza Prima in archivio: la scomposizione del
   premio c'è su tutte e 4.073, e la scheda non la mostrava. */
const SSF_VERO = {
  netto: 423.64, imponibile: 423.64, tasse: 86.36, ssn: 29.59,
  ramo: 'MOTOR', proposta: 'PR-99001', rate_anno: 1,
  scadenza_originale: '2027-03-15', scadenza_emesso: '2027-03-15',
  agenzia: 'A9999', compagnia_ania: '0999', data_annullamento: null, motivo_storno: null
};

async function contratto(dati) {
  return p.evaluate((d) => {
    const div = document.createElement('div');
    div.innerHTML = polContratto(d.p, d.dati, d.ssf);
    return {
      etichette: [...div.querySelectorAll('.pol-r span')].map(e => e.textContent.trim()),
      valori: [...div.querySelectorAll('.pol-r b')].map(e => e.textContent.trim()),
      testo: div.textContent,
      html: div.innerHTML,
    };
  }, dati);
}

prova('la scomposizione del premio si vede: netto, imponibile, tasse, SSN', async () => {
  /* È la prima cosa che si guarda quando un cliente chiede perché il premio è
     salito, ed era in archivio su 4.073 polizze senza comparire da nessuna
     parte. */
  const v = await contratto({ p: { data_scadenza: '2027-03-15' }, dati: {}, ssf: SSF_VERO });
  for (const et of ['Netto', 'Imponibile', 'Tasse', 'Contributo SSN']) {
    deve(v.etichette.includes(et), 'manca «' + et + '»: ' + v.etichette.join(' · '));
  }
  deve(/423,64/.test(v.testo) && /86,36/.test(v.testo) && /29,59/.test(v.testo), v.testo.trim());
});

prova('ci sono anche ramo, proposta e agenzia', async () => {
  const v = await contratto({ p: { data_scadenza: '2027-03-15' }, dati: {}, ssf: SSF_VERO });
  deve(/MOTOR/.test(v.testo) && /PR-99001/.test(v.testo) && /A9999/.test(v.testo), v.testo.trim());
});

prova('una riga senza valore NON compare', async () => {
  /* Dodici righe con nove trattini si smettono di leggere, e i tre dati buoni
     si perdono in mezzo. */
  const v = await contratto({ p: {}, dati: {}, ssf: { netto: 100 } });
  deve(v.etichette.length === 1 && v.etichette[0] === 'Netto', v.etichette.join(' · '));
  deve(!/—/.test(v.testo), 'ci sono trattini al posto dei dati mancanti: ' + v.testo.trim());
});

prova('una polizza che non porta niente non mostra una sezione vuota', async () => {
  const v = await contratto({ p: {}, dati: {}, ssf: {} });
  deve(v.html.trim() === '', 'la sezione compare vuota: ' + v.html.trim());
});

prova('la scadenza originale compare solo se dice qualcosa di diverso', async () => {
  /* Ripetere la stessa data due volte con due nomi diversi fa credere che
     siano due date, e fa cercare una differenza che non c\'è. */
  const uguale = await contratto({ p: { data_scadenza: '2027-03-15' }, dati: {}, ssf: SSF_VERO });
  deve(!uguale.etichette.includes('Scadenza originale'), 'compare anche quando è identica');
  const diversa = await contratto({ p: { data_scadenza: '2027-06-30' }, dati: {}, ssf: SSF_VERO });
  deve(diversa.etichette.includes('Scadenza originale'), 'non compare quando le due date differiscono');
  deve(/15\/03\/2027/.test(diversa.testo), diversa.testo.trim());
});

prova('l\'annullamento porta con sé il motivo', async () => {
  const v = await contratto({ p: {}, dati: {},
    ssf: { data_annullamento: '2026-07-03', motivo_storno: 'DISDETTA' } });
  deve(/03\/07\/2026/.test(v.testo), v.testo.trim());
  deve(/DISDETTA/.test(v.testo), 'il motivo dello storno non si vede: ' + v.testo.trim());
});

prova('la polizza sostituita si ritrova, che sia HDI o Prima', async () => {
  const hdi = await contratto({ p: {}, dati: { sostituisce_numero: '1428404562' }, ssf: {} });
  deve(/1428404562/.test(hdi.testo), 'HDI: ' + hdi.testo.trim());
  const prima = await contratto({ p: {}, dati: {}, ssf: { sostituisce_numero: 'NP-0001' } });
  deve(/NP-0001/.test(prima.testo), 'Prima: ' + prima.testo.trim());
});

// ── il pannello largo ────────────────────────────────────────────────────────

prova('la scheda della polizza si apre LARGA, e il foglio di stile lo sa', async () => {
  const v = await p.evaluate(() => {
    polPannello('Polizza', 'prova', '<div>corpo</div>', true);
    const ov = document.getElementById('pol-ov');
    const box = ov.querySelector('.pdoc-box');
    const w = getComputedStyle(box).maxWidth;
    const r = { classe: ov.className, maxWidth: w };
    ov.remove();
    return r;
  });
  deve(/pdoc-largo/.test(v.classe), 'la cornice non prende la classe: ' + v.classe);
  deve(parseInt(v.maxWidth, 10) > 1000,
    'la regola non allarga niente: max-width resta ' + v.maxWidth + ' (selettore sbagliato?)');
});

prova('gli altri due pannelli restano stretti: sono moduli', async () => {
  const v = await p.evaluate(() => {
    polPannello('Pagamento', '', '<div>corpo</div>');
    const ov = document.getElementById('pol-ov');
    const w = getComputedStyle(ov.querySelector('.pdoc-box')).maxWidth;
    const r = { classe: ov.className, maxWidth: w };
    ov.remove();
    return r;
  });
  deve(!/pdoc-largo/.test(v.classe), 'anche il pannello del pagamento si allarga: ' + v.classe);
  deve(parseInt(v.maxWidth, 10) < 900, 'max-width del pannello stretto: ' + v.maxWidth);
});

prova('e la scheda della polizza chiede davvero il pannello largo', async () => {
  const fs = await import('fs');
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/polPannello\('Polizza', 'Carico…', '<div class="empty-state">Carico…<\/div>', true\)/.test(src),
    'la scheda della polizza si apre ancora stretta');
});

prova('e chiede le garanzie al motore, non se le ricava da sé', async () => {
  /* Questa si legge dal testo della pagina e non dal browser: `polApri` vuole
     il database per partire, e senza database non c'è modo di vedere quale
     dei due percorsi prende. Due letture diverse delle stesse garanzie sono
     due elenchi diversi, ed è quello sbagliato che nessuno guarda. */
  const fs = await import('fs');
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/const garSch = window\.Garanzie \? window\.Garanzie\.scheda\(p\) : null;/.test(src),
    'la scheda non passa più dal motore delle garanzie');
  deve(/\$\{polGaranzie\(garSch, gar\)\}/.test(src),
    'la sezione non riceve la scheda del motore');
});

prova('aprendo la pagina non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nLA SCHEDA DELLA POLIZZA — chiesta a un browser vero');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nSCHEDA POLIZZA NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
