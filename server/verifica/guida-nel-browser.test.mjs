// ═══════════════════════════════════════════════════════════════════════════════
//  LA GUIDA ALLE GARANZIE, NELLA SCHERMATA E NEL PDF
//
//  Il motore ha le sue 20 prove e dice le cose giuste. Non dicono che la
//  SCHERMATA le faccia vedere, né che il PDF esca.
//
//  La cosa che queste prove difendono: l'elenco delle cose da confermare deve
//  stare IN CIMA e deve VEDERSI. Lì dentro finiscono i refusi veri del
//  prospetto — «Laste» per «Lastre», la rendita che dice «al mese» e «al
//  giorno» nella stessa riga — e se si vedono dopo che il foglio è partito al
//  cliente non sono serviti a niente.
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

/* Le righe vere del preventivo n.4, com'è scritto in archivio. */
const VERE = [
  'ABITAZIONE |  RC Abitazione 1.000.000 €',
  'RC Capo  Famiglia 1.000.000 €',
  'Incendio Fabbricato 130.000 €',
  'Laste 1.000 €',
  'INFORTUNI FAMIGLIA',
  'Invalidità permanente  massimale 100.000 € a Persona',
  'Rendita vitaliza da infortuni 1000€ al mese ( marito + moglie ), 500 € al giorno ( per figlio )',
];

/* Monta il riquadro delle descrizioni come lo monta il modale vero, ci scrive
   dentro le righe, e chiede alla funzione DI PRODUZIONE di disegnare. */
async function anteprima(righe) {
  return p.evaluate(({ righe }) => {
    let scatola = document.getElementById('pp-guida');
    if (!scatola) {
      document.body.insertAdjacentHTML('beforeend',
        '<div id="pp-desc"></div><div id="pp-guida"></div>');
      scatola = document.getElementById('pp-guida');
    }
    const desc = document.getElementById('pp-desc');
    desc.innerHTML = righe.map(t => ppDescRiga(t)).join('');
    ppGuidaAnteprima();
    const vede = (el) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
      }
      return !!el;
    };
    const avv = scatola.querySelector('.ppg-avv');
    const schede = [...scatola.querySelectorAll('.ppg-c')].map(e => ({
      nome: e.querySelector('.ppg-c-h b')?.textContent.trim(),
      importo: e.querySelector('.ppg-c-h span')?.textContent.trim(),
      esempio: e.querySelector('.ppg-c-e')?.textContent.trim(),
      senza: !!e.querySelector('.ppg-c-senza'),
      inAllarme: /ppg-c-avv/.test(e.className),
    }));
    return {
      schede,
      sezioni: [...scatola.querySelectorAll('.ppg-sez-t')].map(e => e.textContent.trim()),
      avvisi: avv ? avv.textContent.trim() : null,
      avvisiVisibili: avv ? vede(avv) : false,
      /* L'elenco deve stare PRIMA della prima scheda nel documento, non dopo. */
      avvisiInCima: avv ? !!(scatola.querySelector('.ppg-c') &&
        (avv.compareDocumentPosition(scatola.querySelector('.ppg-c')) & Node.DOCUMENT_POSITION_FOLLOWING)) : null,
      avvisiTinta: avv ? getComputedStyle(avv).backgroundColor : null,
      ok: !!scatola.querySelector('.ppg-ok'),
      conto: scatola.querySelector('.ppg-conto')?.textContent.trim() || null,
      piede: scatola.querySelector('.ppg-piede')?.textContent.trim() || null,
      vuoto: scatola.querySelector('.ppg-vuoto')?.textContent.trim() || null,
    };
  }, { righe });
}

// ── 1. i motori e le funzioni ci sono ────────────────────────────────────────

prova('il preventivatore carica il motore della guida e il vocabolario', async () => {
  const c = await p.evaluate(() => ({
    guida: !!window.GuidaGaranzie,
    vocab: !!window.Confronto,
    fn: typeof (window.GuidaGaranzie || {}).guida === 'function',
    esempi: Object.keys((window.GuidaGaranzie || {}).ESEMPI || {}).length,
  }));
  deve(c.guida, 'window.GuidaGaranzie non esiste: il tag <script> non c\'è o non si carica');
  deve(c.vocab, 'il vocabolario delle garanzie non è caricato: la guida non riconoscerebbe niente');
  deve(c.fn && c.esempi > 20, 'il motore c\'è ma è vuoto: ' + JSON.stringify(c));
});

prova('e le funzioni della schermata', async () => {
  const c = await p.evaluate(() => ({
    anteprima: typeof ppGuidaAnteprima === 'function',
    dati: typeof ppGuidaDati === 'function',
    /* Il PDF non si disegna piu' a mano nella pagina: il motore descrive il
       documento e `PdfWithus.disegna` lo disegna. */
    documento: typeof (window.GuidaGaranzie || {}).documentoPdf === 'function',
    disegna: typeof (window.PdfWithus || {}).disegna === 'function',
    scarica: typeof ppGuidaScarica === 'function',
  }));
  deve(Object.values(c).every(Boolean), 'funzioni mancanti: ' + JSON.stringify(c));
});

prova('il contrassegno dei due motori non è rimasto indietro', () => {
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  for (const nome of ['confronto', 'guida-garanzie']) {
    const m = new RegExp(nome + '\\.js\\?v=(\\d{8})').exec(src);
    deve(m, nome + ' non è caricato con un contrassegno');
    const mot = fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', nome + '.js'), 'utf8');
    const v = new RegExp('VERSIONE\\s*=\\s*\'' + nome + '-(\\d{4})-(\\d{2})-(\\d{2})\'').exec(mot);
    deve(v, nome + ' non dichiara la sua versione');
    deve(m[1] >= v[1] + v[2] + v[3],
      nome + ': contrassegno ' + m[1] + ' ma il motore è del ' + v[1] + v[2] + v[3]);
  }
});

// ── 2. l'anteprima, sulle righe vere ─────────────────────────────────────────

const vista = await anteprima(VERE);

prova('le garanzie si vedono con nome, importo ed esempio', () => {
  const rc = vista.schede.find(c => /RC Abitazione/i.test(c.nome || ''));
  deve(rc, 'schede: ' + vista.schede.map(c => c.nome).join(' / '));
  deve(rc.importo === '1.000.000 €', 'importo: ' + rc.importo);
  deve(/bicicletta|intonaco/i.test(rc.esempio || ''), 'esempio: ' + rc.esempio);
});

prova('un titolo di sezione non diventa una scheda', () => {
  deve(!vista.schede.some(c => /^INFORTUNI FAMIGLIA$/i.test(c.nome || '')),
    'un capitolo è diventato una garanzia: ' + vista.schede.map(c => c.nome).join(' / '));
});

prova('L\'ELENCO DELLE COSE DA CONFERMARE STA IN CIMA E SI VEDE', () => {
  /* La regola per cui questa schermata esiste. In fondo nessuno lo
     leggerebbe, e lì dentro ci sono i refusi veri. */
  deve(vista.avvisi, 'non c\'è nessun elenco: ' + JSON.stringify(vista).slice(0, 200));
  deve(vista.avvisiVisibili, 'c\'è ma non si vede');
  deve(vista.avvisiInCima === true, 'sta sotto le schede invece che sopra');
  deve(!/rgba\(0, 0, 0, 0\)/.test(vista.avvisiTinta || ''),
    'non ha sfondo: la regola di stile non lo raggiunge — ' + vista.avvisiTinta);
  deve(!vista.ok, 'dice che va tutto bene e ci sono due refusi');
});

prova('i due refusi veri del prospetto sono nell\'elenco', () => {
  deve(/due unità diverse/i.test(vista.avvisi), 'manca l\'incoerenza mese/giorno: ' + vista.avvisi);
  deve(/Laste/.test(vista.avvisi), 'manca il refuso «Laste»: ' + vista.avvisi);
});

prova('la garanzia non riconosciuta compare col suo importo, senza esempio', () => {
  const l = vista.schede.find(c => /Laste/i.test(c.nome || ''));
  deve(l, 'è sparita dalla guida invece di comparire');
  deve(l.importo === '1.000 €', 'ha perso l\'importo: ' + l.importo);
  deve(l.senza, 'si è inventato un esempio: ' + l.esempio);
  deve(l.inAllarme, 'non si distingue dalle altre');
});

prova('il piede dice che il documento è illustrativo', () => {
  deve(/illustrativo/i.test(vista.piede || ''), 'piede: ' + vista.piede);
  deve(/esclusioni/i.test(vista.piede || ''), 'il piede non nomina le esclusioni');
});

prova('senza righe la schermata invita a scriverle, non sembra rotta', async () => {
  const v = await anteprima([]);
  deve(v.vuoto, 'non dice niente: ' + JSON.stringify(v).slice(0, 160));
  deve(/comparirà la guida/i.test(v.vuoto), v.vuoto);
});

prova('quando è tutto a posto lo dice, invece di tacere', async () => {
  const v = await anteprima(['RC Capo Famiglia 1.000.000 €', 'Incendio Fabbricato 130.000 €']);
  deve(v.ok, 'niente da confermare e non lo dice: ' + JSON.stringify(v).slice(0, 200));
  deve(!v.avvisi, 'c\'è un elenco di avvisi su un prospetto pulito: ' + v.avvisi);
});

prova('l\'anteprima si rifà da sola mentre si scrive', async () => {
  /* Un\'anteprima che si aggiorna solo col bottone è una schermata che mostra
     il prospetto di un minuto fa. */
  const c = await p.evaluate(() => {
    const campo = document.querySelector('#pp-desc .pp-desc-txt');
    return { oninput: campo ? campo.getAttribute('oninput') : null };
  });
  deve(/ppGuidaAnteprima/.test(c.oninput || ''), 'le righe non richiamano l\'anteprima: ' + c.oninput);
});

// ── 3. il PDF esce davvero ───────────────────────────────────────────────────

prova('il documento da stampare si descrive, e si puo\' leggere senza browser', async () => {
  /* Il PDF vero lo disegna `PdfWithus.disegna`, che ha gia\' le sue prove e che
     qui non si puo\' far girare: jsPDF arriva da una rete che il banco non ha.
     Quello che SI puo\' provare, ed e\' quello che conta, e\' che cosa ci sara\'
     scritto sopra. Per questo il contenuto si descrive invece di disegnarlo. */
  const c = await p.evaluate(({ righe }) => {
    const g = GuidaGaranzie.guida(righe);
    const d = GuidaGaranzie.documentoPdf(g, {
      cliente: 'Famiglia Tammaro / Tortorici', numero: 4, data: '02/10/2026',
      azienda: { ragioneSociale: 'With us Societa\' Cooperativa' } });
    return {
      tipo: d.tipo, numero: d.numero, file: d.nomeFile,
      titoli: d.blocchi.filter(b => b.tipo === 'titolo').map(b => b.testo),
      schede: d.blocchi.filter(b => b.tipo === 'testo' && b.titolo).map(b => b.titolo),
      ambra: d.blocchi.filter(b => b.tono === 'ambra').length,
      daConfermare: (d.blocchi.find(b => b.tipo === 'testo' && !b.titolo) || {}).paragrafi || [],
      avvertenze: d.avvertenze,
    };
  }, { righe: VERE });
  deve(c.tipo === 'GUIDA ALLE GARANZIE', 'tipo: ' + c.tipo);
  deve(/Tammaro/.test(c.numero), 'il documento non porta il nome del cliente: ' + c.numero);
  deve(/^guida-garanzie_/.test(c.file) && /\.pdf$/.test(c.file), 'nome file: ' + c.file);
  deve(c.titoli.some(t => /CASA E RESPONSABILIT/i.test(t)), 'titoli: ' + c.titoli.join(' | '));
  deve(c.schede.some(t => /RC ABITAZIONE/i.test(t) && /1\.000\.000 €/.test(t)),
    'la scheda non porta nome e importo: ' + c.schede.join(' | '));
  /* L'importo non si grida: in maiuscolo «1.000 € AL GIORNO» si legge male. */
  deve(!c.schede.some(t => /AL GIORNO|AL MESE/.test(t)), 'importi gridati: ' + c.schede.join(' | '));
});

prova('e le cose da confermare FINISCONO SUL FOGLIO, non solo a schermo', async () => {
  /* Un documento che le tace e\' quello che fa arrivare un refuso in mano al
     cliente senza che nessuno se ne accorga. */
  const c = await p.evaluate(({ righe }) => {
    const g = GuidaGaranzie.guida(righe);
    const d = GuidaGaranzie.documentoPdf(g, { cliente: 'X' });
    return {
      titoli: d.blocchi.filter(b => b.tipo === 'titolo').map(b => b.testo),
      punti: (d.blocchi.find(b => b.tipo === 'testo' && !b.titolo) || {}).paragrafi || [],
      ambra: d.blocchi.filter(b => b.tono === 'ambra').length,
      avvertenze: d.avvertenze,
    };
  }, { righe: VERE });
  deve(c.titoli.some(t => /DA CONFERMARE/i.test(t)), 'nessun capitolo «da confermare»: ' + c.titoli.join(' | '));
  deve(c.punti.length === 2, 'punti da confermare sul foglio: ' + c.punti.length);
  deve(c.punti.some(t => /due unita|due unità/i.test(t)) && c.punti.some(t => /Laste/.test(t)),
    'non ci sono i due refusi veri: ' + JSON.stringify(c.punti));
  deve(c.ambra >= 2, 'le schede da confermare non si distinguono: ' + c.ambra);
  deve(/illustrativo/i.test(c.avvertenze) && /esclusioni/i.test(c.avvertenze),
    'le avvertenze non dicono che e\' illustrativo: ' + c.avvertenze);
});

prova('senza niente da confermare il foglio non apre quel capitolo', async () => {
  const c = await p.evaluate(() => {
    const g = GuidaGaranzie.guida(['RC Capo Famiglia 1.000.000 €', 'Incendio Fabbricato 130.000 €']);
    const d = GuidaGaranzie.documentoPdf(g, { cliente: 'X' });
    return { titoli: d.blocchi.filter(b => b.tipo === 'titolo').map(b => b.testo),
             ambra: d.blocchi.filter(b => b.tono === 'ambra').length };
  });
  deve(!c.titoli.some(t => /DA CONFERMARE/i.test(t)),
    'apre un capitolo vuoto: ' + c.titoli.join(' | '));
  deve(c.ambra === 0, 'tinge di ambra schede che non hanno niente: ' + c.ambra);
});

prova('il bottone per scaricarla c\'è nel modale', () => {
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/ppGuidaScarica\('\$\{esc\(r\.id\)\}'\)/.test(src),
    'nessun bottone chiama ppGuidaScarica: la guida non si potrebbe scaricare');
  const i = src.indexOf('ppGuidaScarica');
  deve(/Guida alle garanzie/.test(src.slice(i - 40, i + 180)), 'il bottone non si chiama come la cosa che fa');
});

prova('aprendo il preventivatore non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nGUIDA ALLE GARANZIE — schermata e PDF');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nGUIDA NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
