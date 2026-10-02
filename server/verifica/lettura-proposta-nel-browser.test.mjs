// ═══════════════════════════════════════════════════════════════════════════════
//  LA PROPOSTA DI POLIZZA SI CARICA, E LA SCHERMATA DICE DA DOVE VIENE OGNI RIGA
//
//  Il motore ha le sue 17 prove e dice le cose giuste. Non dicono che la
//  SCHERMATA le faccia vedere, e qui quello che si fa vedere e` tutto.
//
//  Le due cose che queste prove difendono, e che non sono dettagli di disegno:
//
//  1. OGNI RIGA PORTA LA PAGINA E LA FRASE LETTERALE DEL DOCUMENTO. Senza, chi
//     prepara il preventivo non ha modo di controllare, e un massimale letto
//     male finisce su un foglio che va a un cliente.
//  2. QUELLO CHE IL MOTORE DICE DI GUARDARE NON ARRIVA GIA` SPUNTATO. Sul
//     documento vero «naturali 1.000,00 € 500,00 € 300,00 €» sono tre
//     FRANCHIGIE per area, non tre massimali: spuntata di default, quella riga
//     diventa un massimale promesso.
//
//  E una terza, che non si vede e per questo va provata: IL DOCUMENTO NON ESCE
//  DAL BROWSER. Una proposta di polizza porta nome, codice fiscale e targa del
//  cliente.
//
//      node server/verifica/lettura-proposta-nel-browser.test.mjs
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

/* Un documento finto costruito sui casi VERI misurati il 02/10/2026 su un set
   informativo auto di 61 pagine — gli importi e i nomi di compagnia sono
   inventati, perche` il documento vero porta i dati di un cliente.

   - pagina 3  : la riga facile, un nome e un importo;
   - pagina 7  : la tabella appiattita, col nome spezzato sulla riga sopra e
                 l'intestazione che dice «Franchigia»;
   - pagina 9  : la prosa del contratto con dentro una cifra, da buttare;
   - pagina 11 : l'euro PRIMA del numero, che sul documento vero compare 79
                 volte contro 2. */
const DOCUMENTO = [
  { n: 3, testo: 'Garanzie della casa\nIncendio Fabbricato 130.000,00 €' },
  { n: 7, testo: 'Eventi Franchigia Franchigia Franchigia\nnaturali 1.000,00 € 500,00 € 300,00 €' },
  { n: 9, testo: 'La garanzia è prestata con il limite massimo di 100,00 € per ogni sinistro' },
  { n: 11, testo: 'Massimale\nRC Auto € 7.290.000,00' },
];

/* Fa girare la funzione DI PRODUZIONE `ppProponiDaFile`, con l'estrazione del
   testo sostituita: `pdf.js` arriva da una rete che il banco non ha, e quello
   che qui si vuole provare e` la schermata, non il lettore di PDF (che ha la
   sua prova a parte, piu' sotto, con un `pdfjsLib` finto).

   La funzione vera si rimette sempre a posto: lasciare un tappo attaccato a
   `window` farebbe misurare il tappo alle prove che vengono dopo. */
async function proponi(pagine, nomeFile) {
  return p.evaluate(async ({ pagine, nomeFile }) => {
    const vero = window.ppPdfTesto;
    try {
      if (!document.getElementById('pp-proposte')) {
        document.body.insertAdjacentHTML('beforeend',
          '<div id="pp-desc"></div><div id="pp-guida"></div><div id="pp-proposte"></div>');
      }
      const scatola = document.getElementById('pp-proposte');
      document.getElementById('pp-desc').innerHTML = '';
      scatola.innerHTML = '';
      window.ppPdfTesto = async () => pagine;
      await ppProponiDaFile({ files: [{ name: nomeFile || 'proposta.pdf' }] });

      const vede = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
        }
        return !!el;
      };
      const righe = [...scatola.querySelectorAll('.ppp-r')].map((e) => {
        const c = e.querySelector('.ppp-c');
        return {
          nome: e.querySelector('.ppp-t b') ? e.querySelector('.ppp-t b').textContent.trim() : null,
          righino: e.querySelector('.ppp-t i') ? e.querySelector('.ppp-t i').textContent.trim() : null,
          avviso: e.querySelector('.ppp-t em') ? e.querySelector('.ppp-t em').textContent.trim() : null,
          citazione: e.querySelector('.ppp-t q') ? e.querySelector('.ppp-t q').textContent.trim() : null,
          spuntata: !!(c && c.checked),
          inAllarme: /ppp-r-avv/.test(e.className),
          tinta: getComputedStyle(e).backgroundColor,
          vede: vede(e),
        };
      });
      return {
        righe,
        conto: scatola.querySelector('.ppg-conto') ? scatola.querySelector('.ppg-conto').textContent.trim() : null,
        nota: scatola.querySelector('.ppp-nota') ? scatola.querySelector('.ppp-nota').textContent.trim() : null,
        vuoto: scatola.querySelector('.ppg-vuoto') ? scatola.querySelector('.ppg-vuoto').textContent.trim() : null,
        bottone: scatola.querySelector('button[onclick*="ppProposteAggiungi"]')
          ? scatola.querySelector('button[onclick*="ppProposteAggiungi"]').textContent.trim() : null,
      };
    } finally { window.ppPdfTesto = vero; }
  }, { pagine, nomeFile });
}

// ── 1. il motore e le funzioni ci sono ───────────────────────────────────────

prova('il preventivatore carica il motore di lettura', async () => {
  const c = await p.evaluate(() => ({
    motore: !!window.LetturaProposta,
    candidati: typeof (window.LetturaProposta || {}).candidati === 'function',
    verso: typeof (window.LetturaProposta || {}).versoDescrizioni === 'function',
    /* Senza il vocabolario e senza la guida il lettore non riconosce niente. */
    vocab: !!window.Confronto,
    guida: !!window.GuidaGaranzie,
  }));
  deve(c.motore, 'window.LetturaProposta non esiste: il tag <script> non c\'è o non si carica');
  deve(c.candidati && c.verso, 'il motore c\'è ma è vuoto: ' + JSON.stringify(c));
  deve(c.vocab && c.guida, 'manca il vocabolario o la guida: ' + JSON.stringify(c));
});

prova('e le funzioni della schermata', async () => {
  const c = await p.evaluate(() => ({
    pdfjs: typeof ppCaricaPdfJs === 'function',
    testo: typeof ppPdfTesto === 'function',
    proponi: typeof ppProponiDaFile === 'function',
    aggiungi: typeof ppProposteAggiungi === 'function',
  }));
  deve(Object.values(c).every(Boolean), 'funzioni mancanti: ' + JSON.stringify(c));
});

prova('il contrassegno del motore non è rimasto indietro', () => {
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  const m = /lettura-proposta\.js\?v=(\d{8})/.exec(src);
  deve(m, 'lettura-proposta.js non è caricato con un contrassegno');
  const mot = fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', 'lettura-proposta.js'), 'utf8');
  const v = /VERSIONE\s*=\s*'lettura-proposta-(\d{4})-(\d{2})-(\d{2})'/.exec(mot);
  deve(v, 'il motore non dichiara la sua versione');
  deve(m[1] >= v[1] + v[2] + v[3],
    'contrassegno ' + m[1] + ' ma il motore è del ' + v[1] + v[2] + v[3]);
});

prova('nel modale c\'è il campo per caricare il PDF, e chiama il lettore', async () => {
  const c = await p.evaluate(() => {
    const s = String(ppApri);
    return {
      campo: /id="pp-proposta-file"/.test(s),
      chiama: /onchange="ppProponiDaFile\(this\)"/.test(s),
      soloPdf: /accept="[^"]*pdf/.test(s),
      scatola: /id="pp-proposte"/.test(s),
      /* Il campo sta SOPRA le descrizioni: riempie quelle, e una cosa che
         riempie un riquadro non si mette sotto il riquadro. */
      primaDelleDescrizioni: s.indexOf('pp-proposta-file') < s.indexOf('id="pp-desc"'),
      /* Riaprendo il modale le righe lette prima si buttano: erano di un altro
         preventivo, e quindi di un altro cliente. */
      azzera: /PP_PROPOSTE = null/.test(s),
    };
  });
  deve(c.campo && c.scatola, 'il modale non ha il campo o il riquadro: ' + JSON.stringify(c));
  deve(c.chiama, 'il campo non richiama ppProponiDaFile: caricare un file non farebbe niente');
  deve(c.soloPdf, 'il campo accetta qualunque file: un .docx darebbe un errore incomprensibile');
  deve(c.primaDelleDescrizioni, 'il campo sta sotto le descrizioni che dovrebbe riempire');
  deve(c.azzera, 'riaprendo il modale resterebbero in memoria le righe del cliente di prima');
});

// ── 2. le righe proposte, sul documento finto ────────────────────────────────

const vista = await proponi(DOCUMENTO, 'proposta-finta.pdf');

prova('le righe con un nome e un importo diventano proposte', () => {
  deve(vista.righe.length === 3, 'righe proposte: ' + vista.righe.length + ' — ' +
    vista.righe.map(r => r.nome).join(' / '));
  deve(vista.righe.some(r => /Incendio Fabbricato/i.test(r.nome || '')),
    'manca la riga facile: ' + vista.righe.map(r => r.nome).join(' / '));
  deve(vista.righe.some(r => /RC Auto/i.test(r.nome || '')),
    'manca l\'importo con l\'euro davanti al numero: ' + vista.righe.map(r => r.nome).join(' / '));
  deve(vista.righe.some(r => /Eventi naturali/i.test(r.nome || '')),
    'il nome spezzato sulla riga sopra non è stato ricucito: ' +
    vista.righe.map(r => r.nome).join(' / '));
});

prova('la prosa del contratto non diventa una garanzia', () => {
  deve(!vista.righe.some(r => /prestata|limite massimo/i.test(r.nome || '')),
    'una frase del contratto è diventata una garanzia: ' + vista.righe.map(r => r.nome).join(' / '));
  deve(/lasciate fuori/.test(vista.conto || ''),
    'quello che si è scartato non si dice: ' + vista.conto);
});

prova('OGNI RIGA DICE DA CHE PAGINA VIENE, E SI VEDE', () => {
  /* La regola per cui questa schermata può esistere. Senza la pagina non c'è
     modo di controllare un massimale sul documento, e quello che non si può
     controllare non si dovrebbe mettere su un preventivo. */
  deve(vista.righe.length, 'nessuna riga: ' + JSON.stringify(vista).slice(0, 200));
  vista.righe.forEach((r) => {
    deve(/pag\.\s*\d+/.test(r.righino || ''), 'riga senza pagina: ' + JSON.stringify(r));
    deve(r.vede, 'la riga c\'è ma non si vede: ' + r.nome);
  });
  const inc = vista.righe.find(r => /Incendio Fabbricato/i.test(r.nome || ''));
  deve(/pag\.\s*3\b/.test(inc.righino), 'pagina sbagliata su «Incendio Fabbricato»: ' + inc.righino);
  const rca = vista.righe.find(r => /RC Auto/i.test(r.nome || ''));
  deve(/pag\.\s*11\b/.test(rca.righino), 'pagina sbagliata su «RC Auto»: ' + rca.righino);
});

prova('e porta la frase letterale del documento, per poterla confrontare', () => {
  const nat = vista.righe.find(r => /Eventi naturali/i.test(r.nome || ''));
  deve(nat.citazione, 'nessuna citazione della riga vera: ' + JSON.stringify(nat));
  deve(/naturali 1\.000,00 €/.test(nat.citazione),
    'la citazione non è la riga del documento: ' + nat.citazione);
});

prova('l\'importo e che cosa è lo dice la riga, non va indovinato', () => {
  const inc = vista.righe.find(r => /Incendio Fabbricato/i.test(r.nome || ''));
  deve(/130\.000 €/.test(inc.righino), 'importo: ' + inc.righino);
  const rca = vista.righe.find(r => /RC Auto/i.test(r.nome || ''));
  deve(/7\.290\.000 €/.test(rca.righino), 'importo con l\'euro davanti: ' + rca.righino);
  deve(/massimale/i.test(rca.righino), 'l\'intestazione diceva «Massimale» e non lo riporta: ' + rca.righino);
  const nat = vista.righe.find(r => /Eventi naturali/i.test(r.nome || ''));
  deve(/franchigia/i.test(nat.righino),
    'tre franchigie passano per massimali: ' + nat.righino);
});

prova('QUELLO CHE VA GUARDATO NON ARRIVA SPUNTATO, E SI DISTINGUE', () => {
  /* L'altra regola. «naturali 1.000,00 € 500,00 € 300,00 €» sono tre
     franchigie per area di una tabella appiattita: spuntata di default,
     quella riga diventa un massimale di 1.000 € promesso al cliente. */
  const nat = vista.righe.find(r => /Eventi naturali/i.test(r.nome || ''));
  deve(nat, 'la riga da guardare è sparita invece di comparire');
  deve(nat.avviso, 'non dice perché va guardata: ' + JSON.stringify(nat));
  deve(/tabella/i.test(nat.avviso), 'l\'avviso non dice che era una tabella: ' + nat.avviso);
  deve(!nat.spuntata, 'ARRIVA SPUNTATA: tre franchigie finirebbero sul preventivo come massimali');
  deve(nat.inAllarme, 'non si distingue dalle righe di cui si può fidare');
  const buona = vista.righe.find(r => /Incendio Fabbricato/i.test(r.nome || ''));
  deve(nat.tinta !== buona.tinta,
    'ha la stessa tinta di una riga buona: la regola di stile non la raggiunge — ' + nat.tinta);
  deve(!/rgba\(0, 0, 0, 0\)/.test(nat.tinta || ''), 'non ha sfondo: ' + nat.tinta);
});

prova('le righe di cui si può fidare arrivano spuntate', () => {
  /* Se non arrivasse spuntato niente, la schermata farebbe spuntare a mano
     trenta righe, e chi spunta trenta righe non le legge. */
  const buone = vista.righe.filter(r => !r.avviso);
  deve(buone.length >= 2, 'righe senza avvisi: ' + buone.length);
  deve(buone.every(r => r.spuntata),
    'non arrivano spuntate: ' + buone.map(r => r.nome + '=' + r.spuntata).join(' / '));
});

prova('la schermata dice che sono proposte, non una lettura', () => {
  deve(vista.nota, 'nessuna nota: la schermata sembrerebbe aver letto il documento');
  deve(/proposte/i.test(vista.nota) && /controlla/i.test(vista.nota), 'nota: ' + vista.nota);
  deve(/\b3 righe trovate in 4 pagine\b/.test(vista.conto || ''), 'conto: ' + vista.conto);
  deve(/3 riconosciute/.test(vista.conto || ''), 'non dice quante ha riconosciuto: ' + vista.conto);
});

prova('un documento in cui non si trova niente lo dice, invece di mostrare il vuoto', async () => {
  const v = await proponi([{ n: 1, testo: 'Spett.le Cliente,\nla ringraziamo per la fiducia.' }], 'lettera.pdf');
  deve(!v.righe.length, 'ha proposto righe da una lettera: ' + v.righe.map(r => r.nome).join(' / '));
  deve(v.vuoto, 'non dice niente: la schermata sembrerebbe rotta — ' + JSON.stringify(v).slice(0, 160));
  deve(/non si è trovata nessuna riga/i.test(v.vuoto), v.vuoto);
  deve(/a mano/i.test(v.vuoto), 'non dice che si possono scrivere a mano: ' + v.vuoto);
});

// ── 3. le righe spuntate finiscono fra le descrizioni ────────────────────────

prova('LE RIGHE SPUNTATE, E SOLO QUELLE, FINISCONO FRA LE DESCRIZIONI', async () => {
  const c = await p.evaluate(async ({ pagine }) => {
    const vero = window.ppPdfTesto;
    try {
      if (!document.getElementById('pp-proposte')) {
        document.body.insertAdjacentHTML('beforeend',
          '<div id="pp-desc"></div><div id="pp-guida"></div><div id="pp-proposte"></div>');
      }
      document.getElementById('pp-desc').innerHTML = '';
      document.getElementById('pp-guida').innerHTML = '';
      window.ppPdfTesto = async () => pagine;
      await ppProponiDaFile({ files: [{ name: 'x.pdf' }] });
      ppProposteAggiungi();
      return {
        descrizioni: [...document.querySelectorAll('#pp-desc .pp-desc-txt')].map(i => i.value),
        /* La guida si rifà: aggiungere due garanzie e vedere la guida di prima
           vorrebbe dire stampare un foglio che non le racconta. */
        schedeGuida: [...document.querySelectorAll('#pp-guida .ppg-c .ppg-c-h b')].map(e => e.textContent.trim()),
      };
    } finally { window.ppPdfTesto = vero; }
  }, { pagine: DOCUMENTO });

  deve(c.descrizioni.length === 2,
    'descrizioni aggiunte: ' + c.descrizioni.length + ' — ' + JSON.stringify(c.descrizioni));
  deve(c.descrizioni.some(t => /^Incendio Fabbricato 130\.000 €$/.test(t)),
    'la riga facile non è arrivata nella forma che la guida legge: ' + JSON.stringify(c.descrizioni));
  deve(c.descrizioni.some(t => /^RC Auto 7\.290\.000 €$/.test(t)),
    'l\'importo con l\'euro davanti non è arrivato: ' + JSON.stringify(c.descrizioni));
  deve(!c.descrizioni.some(t => /Eventi naturali/i.test(t)),
    'è entrata anche la riga NON spuntata: tre franchigie sono diventate un massimale — ' +
    JSON.stringify(c.descrizioni));
  deve(c.schedeGuida.length === 2,
    'la guida non si è rifatta sulle righe aggiunte: ' + JSON.stringify(c.schedeGuida));
  deve(c.schedeGuida.some(t => /Incendio Fabbricato/i.test(t)),
    'schede della guida: ' + JSON.stringify(c.schedeGuida));
});

prova('e c\'è un bottone che lo fa, chiamato come la cosa che fa', () => {
  deve(vista.bottone, 'nessun bottone: le righe proposte non si potrebbero usare');
  deve(/descrizioni/i.test(vista.bottone), 'bottone: ' + vista.bottone);
});

// ── 4. il lettore di PDF: le righe si ricostruiscono dalle coordinate ────────

prova('le colonne della stessa riga del foglio restano sulla stessa riga di testo', async () => {
  /* `pdf.js` restituisce pezzi sparsi, non righe. Concatenarli di fila
     impasterebbe colonne diverse in una frase sola, e una frase impastata è
     esattamente la riga che il motore non sa più leggere. Qui `pdfjsLib` è
     finto: quello che si prova è la ricostruzione, non la libreria. */
  const c = await p.evaluate(async () => {
    const vero = window.pdfjsLib;
    try {
      const pezzi = [
        /* di proposito FUORI ORDINE, sia per colonna sia per riga */
        { str: '300,00 €', transform: [0, 0, 0, 0, 420, 680.2] },
        { str: 'naturali', transform: [0, 0, 0, 0, 50, 680.1] },
        { str: 'Franchigia', transform: [0, 0, 0, 0, 300, 700] },
        { str: 'Eventi', transform: [0, 0, 0, 0, 50, 700] },
        { str: '1.000,00 €', transform: [0, 0, 0, 0, 300, 680] },
        /* Una riga di soli spazi: nei PDF di compagnia ce ne sono a decine, e
           tenerle vorrebbe dire sminuzzare il documento in righe vuote. */
        { str: '   ', transform: [0, 0, 0, 0, 10, 660] },
      ];
      window.pdfjsLib = {
        GlobalWorkerOptions: {},
        getDocument: () => ({ promise: Promise.resolve({
          numPages: 2,
          getPage: (n) => Promise.resolve({
            getTextContent: () => Promise.resolve({ items: n === 1 ? pezzi : [] }),
          }),
        }) }),
      };
      const pagine = await ppPdfTesto({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
      return { pagine };
    } finally { window.pdfjsLib = vero; }
  });

  deve(c.pagine.length === 2, 'pagine lette: ' + c.pagine.length);
  deve(c.pagine[0].n === 1 && c.pagine[1].n === 2,
    'il numero di pagina non arriva: ' + JSON.stringify(c.pagine.map(p => p.n)));
  const linee = c.pagine[0].testo.split('\n');
  deve(linee.length === 2, 'righe ricostruite: ' + linee.length + ' — ' + JSON.stringify(linee));
  deve(linee[0] === 'Eventi Franchigia',
    'la riga in alto è sbagliata o le colonne sono fuori ordine: ' + JSON.stringify(linee[0]));
  deve(linee[1] === 'naturali 1.000,00 € 300,00 €',
    'la riga sotto è sbagliata: ' + JSON.stringify(linee[1]));
  deve(c.pagine[1].testo === '', 'una pagina senza testo non è vuota: ' + JSON.stringify(c.pagine[1]));
});

// ── 5. il documento non esce dal browser ─────────────────────────────────────

prova('IL DOCUMENTO NON ESCE DAL BROWSER', async () => {
  /* Una proposta di polizza porta nome, indirizzo, codice fiscale e targa del
     cliente. Le regole di casa dicono che quei dati non vanno in servizi
     esterni, e questa è la prova che nessuno ce li manda per sbaglio — per
     esempio «facendosi riassumere il PDF» da qualcosa che sta fuori. */
  const c = await p.evaluate(() => {
    const src = [ppProponiDaFile, ppPdfTesto, ppProposteAggiungi].map(String).join('\n');
    return {
      src,
      rete: /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new\s+WebSocket/.test(src),
      caricamenti: /\.upload\b|storage\s*\.\s*from|FormData/.test(src),
      /* La pagina parla col database per i preventivi: quello che NON deve
         fare è mandarci il documento. */
      db: /supabase|\bdb\s*\.\s*from\b/.test(src),
    };
  });
  deve(!c.rete, 'il documento viaggia: c\'è una chiamata di rete nel lettore');
  deve(!c.caricamenti, 'il documento si carica da qualche parte');
  deve(!c.db, 'il documento finisce nel database');
});

prova('aprendo il preventivatore non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nLETTURA DELLA PROPOSTA — nella schermata');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nLETTURA NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
