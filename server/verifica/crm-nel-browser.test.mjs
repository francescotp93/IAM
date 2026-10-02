// ═══════════════════════════════════════════════════════════════════════════════
//  I FILTRI DEL CRM, IN UN BROWSER VERO
//
//  Il motore (`crm-analisi`, 85 prove e 15 sabotaggi) sa scegliere le persone
//  giuste. Non sa se la SCHERMATA gliele chiede: un campo che esiste e non
//  viene letto, un elenco a scelta multipla che `value = ''` non svuota, una
//  spia che non compare — nessuna di queste cose dà errore, e tutte e tre
//  producono una lista plausibile e sbagliata che parte verso delle persone.
//
//  Qui si apre QUOTO in Chromium, si disegna il pannello dei filtri con dei
//  dati finti e si guarda che cosa c'è davvero a schermo.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apriPreventivatore } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriPreventivatore(RADICE);
const p = banco.pagina;

/* Quattro anagrafiche e le loro polizze, disegnate con la funzione vera.
   `casa_proprieta` è `false` su tre su quattro e `null` su nessuna: è la
   forma che ha in archivio, dove la colonna vale `false` su 2.546 righe su
   2.547 perché nessuno ha mai risposto. */
const vista = await p.evaluate(() => {
  CA_ANAG = [
    { id: 'a', nominativo: 'ROSSI MARIO',  comune: 'Palermo', casa_proprieta: false, intermediario_id: 'c1' },
    { id: 'b', nominativo: 'VERDI ANNA',   comune: 'Palermo', casa_proprieta: false, intermediario_id: 'c2' },
    { id: 'c', nominativo: 'BIANCHI LUIGI', comune: 'Bagheria', casa_proprieta: false, intermediario_id: 'c1' },
    { id: 'd', nominativo: 'NERI GIULIA',  comune: 'Bagheria', casa_proprieta: false, intermediario_id: null },
  ];
  CA_POLIZZE = {
    a: [{ prodotto: 'Auto HDI', modulo: 'RCA', compagnia: 'HDI' }],
    b: [{ prodotto: 'Casa Prima', modulo: 'Abitazione', compagnia: 'PRIMA' }],
    c: [{ prodotto: 'Auto HDI', modulo: 'RCA', compagnia: 'HDI' }],
    d: [],
  };
  CA_GRUPPI = []; CA_GARANZIE = [];
  CA_COPERTURA = window.CrmAnalisi.copertura(CA_ANAG);
  window.TIT_COLLAB_NOMI = { c1: 'ODDO FRANCESCO', c2: 'ROSSI CARLO' };
  /* Il pannello vive dentro la pagina del CRM: si crea il contenitore e si
     chiede alla funzione vera di riempirlo. */
  let box = document.getElementById('ca-filtri');
  if (!box) { box = document.createElement('div'); box.id = 'ca-filtri'; document.body.appendChild(box); }
  caDisegnaFiltri();
  const opz = (id) => [...(document.getElementById(id) || { options: [] }).options].map(o => o.value);
  return {
    campi: ['ca-casa', 'ca-prodotto', 'ca-senza-prodotto', 'ca-collab', 'ca-escludi-collab']
      .map(id => ({ id, c: !!document.getElementById(id) })),
    prodotti: opz('ca-prodotto'),
    collaboratori: [...(document.getElementById('ca-escludi-collab') || { options: [] }).options]
      .map(o => ({ v: o.value, t: o.textContent })),
    multiplo: (document.getElementById('ca-escludi-collab') || {}).multiple,
    etichette: [...document.querySelectorAll('#ca-filtri label')].map(l => l.textContent.trim()),
  };
});

// ── i campi ci sono ──────────────────────────────────────────────────────────

prova('i campi nuovi del CRM esistono nel pannello', () => {
  const mancanti = vista.campi.filter(x => !x.c).map(x => x.id);
  deve(!mancanti.length, 'campi mancanti: ' + mancanti.join(', '));
});

prova('l\'elenco dei prodotti porta i nomi veri, non le famiglie', () => {
  /* «Ha la polizza» risponde a «ha un'auto»; questo deve rispondere a «ha
     l'Auto HDI». Se l'elenco portasse «Auto» sarebbe la stessa domanda due
     volte, con due nomi diversi. */
  deve(vista.prodotti.includes('Auto HDI'), 'prodotti: ' + vista.prodotti.join(' · '));
  deve(vista.prodotti.includes('Casa Prima'), 'prodotti: ' + vista.prodotti.join(' · '));
});

prova('i collaboratori si scelgono per NOME, e se ne può scegliere più d\'uno', () => {
  /* Un elenco di identificativi non si legge: chi deve escludere il
     portafoglio di una persona deve poterla riconoscere. */
  const nomi = vista.collaboratori.map(c => c.t);
  deve(nomi.includes('ODDO FRANCESCO') && nomi.includes('ROSSI CARLO'),
    'nell\'elenco ci sono: ' + nomi.join(' · '));
  deve(vista.multiplo === true, 'il campo «escludi» non è a scelta multipla');
  /* E i valori restano gli identificativi: è quello che il motore confronta. */
  deve(vista.collaboratori.every(c => /^c\d$/.test(c.v)), 'i valori non sono gli id: ' + JSON.stringify(vista.collaboratori));
});

prova('la casa di proprietà è dichiarata «mai risposta»', () => {
  /* In archivio quella colonna vale `false` su 2.546 anagrafiche su 2.547 e
     `null` su nessuna: è il valore predefinito, non una risposta. Un
     «1/2547 quasi vuoto» farebbe pensare che gli altri abbiano detto di no, e
     una campagna a «chi non ha casa» partirebbe verso duemila persone di cui
     non sappiamo niente. */
  const et = vista.etichette.find(t => /Casa di proprietà/.test(t));
  deve(et, 'l\'etichetta non c\'è: ' + vista.etichette.join(' | '));
  deve(/mai risposto/.test(et), 'la spia non lo dichiara: «' + et + '»');

  /* E NON SI GRIDA AL LUPO SUGLI ALTRI. Il comune è compilato su tutte e
     quattro: se anche lì comparisse «mai risposto», l'avvertenza smetterebbe
     di voler dire qualcosa — un avviso che c'è sempre si impara a saltare, e
     con lui si salta quello vero. */
  const com = vista.etichette.find(t => /Comune di residenza/.test(t));
  deve(com, 'l\'etichetta del comune non c\'è');
  deve(!/mai risposto/.test(com), 'anche il comune risulta mai risposto: «' + com + '»');
  deve(/4\/4/.test(com), 'la copertura del comune non è scritta: «' + com + '»');
});

// ── i campi vengono letti ────────────────────────────────────────────────────

prova('«escludi i clienti di» viene davvero letto dalla ricerca', () => {
  /* Un campo che esiste e che nessuno legge è il difetto peggiore di questa
     schermata: sembra di aver escluso qualcuno, e la lista parte intera. */
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/senzaCollaboratori: caScelti\('ca-escludi-collab'\)/.test(src),
    'la ricerca non legge il campo «escludi i clienti di»');
  deve(/casaProprieta: tri\(g\('ca-casa'\)\)/.test(src), 'la ricerca non legge la casa di proprietà');
  deve(/prodotti: g\('ca-prodotto'\)/.test(src), 'la ricerca non legge il prodotto');
  deve(/senzaProdotti: g\('ca-senza-prodotto'\)/.test(src), 'la ricerca non legge «ma NON il prodotto»');
});

prova('i valori scelti si leggono davvero dal campo a scelta multipla', async () => {
  const r = await p.evaluate(() => {
    const e = document.getElementById('ca-escludi-collab');
    [...e.options].forEach(o => { o.selected = o.value === 'c1'; });
    const uno = caScelti('ca-escludi-collab');
    [...e.options].forEach(o => { o.selected = true; });
    const tutti = caScelti('ca-escludi-collab');
    return { uno, tutti, inesistente: caScelti('ca-campo-che-non-esiste') };
  });
  deve(r.uno.join() === 'c1', 'scelto uno, letti: ' + r.uno.join());
  deve(r.tutti.join() === 'c1,c2', 'scelti tutti, letti: ' + r.tutti.join());
  deve(Array.isArray(r.inesistente) && !r.inesistente.length,
    'un campo che non c\'è non restituisce un elenco vuoto: ' + JSON.stringify(r.inesistente));
});

prova('«Azzera» svuota davvero le esclusioni', async () => {
  /* Un campo a scelta multipla non si svuota con `value = ''`: le voci
     restano selezionate e la ricerca dopo esclude ancora quei clienti, senza
     che a schermo si veda niente di strano. È il modo più silenzioso di
     mandare la lista sbagliata. */
  const r = await p.evaluate(() => {
    const e = document.getElementById('ca-escludi-collab');
    [...e.options].forEach(o => { o.selected = true; });
    caPulisci();
    return caScelti('ca-escludi-collab');
  });
  deve(!r.length, 'dopo «Azzera» restano escluse: ' + r.join());
});

prova('il motore del CRM nella pagina conosce i filtri nuovi', async () => {
  /* Le regole hanno le loro prove in Node; qui si controlla che la pagina
     carichi il motore che le contiene, e non una copia di ieri. */
  const r = await p.evaluate(() => {
    const A = window.CrmAnalisi;
    const gente = [{ id: '1', intermediario_id: 'c1', casa_proprieta: true },
                   { id: '2', intermediario_id: 'c2', casa_proprieta: false }];
    return {
      esclusi: A.filtra(gente, { senzaCollaboratori: ['c1'] }, {}).map(x => x.id),
      casa: A.filtra(gente, { casaProprieta: true }, {}).map(x => x.id),
      prodotto: A.filtra(gente, { prodotti: ['Auto HDI'] },
        { polizzePerCliente: { 1: [{ prodotto: 'Auto HDI' }], 2: [] } }).map(x => x.id),
      vuotaMaPiena: typeof A.vuotaMaPiena === 'function',
    };
  });
  deve(r.esclusi.join() === '2', 'l\'esclusione nel browser dà: ' + r.esclusi.join());
  deve(r.casa.join() === '1', 'la casa di proprietà nel browser dà: ' + r.casa.join());
  deve(r.prodotto.join() === '1', 'il prodotto nel browser dà: ' + r.prodotto.join());
  deve(r.vuotaMaPiena, 'la pagina carica un motore senza `vuotaMaPiena`: è vecchio');
});

prova('da IAM ci si arriva: la voce di menu esiste e punta alla pagina giusta', () => {
  /* «Unifichiamo anche il marketing con IAM» — Francesco. La schermata
     esisteva già nel quotatore e da IAM non si poteva raggiungere: chi doveva
     fare una lista usciva dal gestionale, e una schermata che non si trova
     vale come una schermata che non c'è. */
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'withus-one.js'), 'utf8');
  const i = src.indexOf('CRM · liste e filtri');
  deve(i > 0, 'la voce «CRM · liste e filtri» non è nel menu di IAM');
  /* La chiamata di QUESTA voce, ritagliata sulla sua parentesi e non su tanti
     caratteri: la voce accanto («Campagne email») apre anch'essa il menu
     Marketing, e una finestra a occhio ci finisce dentro — la prova resterebbe
     verde leggendo la riga sbagliata. */
  const chiamata = /aprireQuoto\(([^)]*\{[^}]*\})\s*\)/.exec(src.slice(i, i + 400));
  deve(chiamata, 'la voce non apre niente: ' + src.slice(i, i + 160));
  deve(/'crm-analisi'/.test(chiamata[1]), 'la voce non apre la pagina del CRM: ' + chiamata[1]);
  deve(/menu: 'marketing'/.test(chiamata[1]), 'la voce non accende il menu Marketing: ' + chiamata[1]);
  /* E la pagina che apre deve esistere davvero nel quotatore. */
  const quoto = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/id="page-crm-analisi"/.test(quoto), 'la pagina «crm-analisi» non esiste nel quotatore');
});

prova('aprendo la pagina non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nI FILTRI DEL CRM — chiesti a un browser vero');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nCRM NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
