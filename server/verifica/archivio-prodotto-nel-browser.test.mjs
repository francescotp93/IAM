// ═══════════════════════════════════════════════════════════════════════════════
//  METTERE UN PRODOTTO IN ARCHIVIO: LA SCHERMATA
//
//  Il motore ha le sue 31 prove e 35 guasti presi. Non dicono che la SCHERMATA
//  faccia vedere quello che il motore sa, e qui quello che si fa vedere è
//  tutto: l'archivio lo riempie una persona guardando questa pagina.
//
//  LA COSA CHE QUESTE PROVE DIFENDONO, e che non è un dettaglio di disegno:
//  «assente» non si può salvare senza la frase del documento che lo dice.
//
//  Il motore non scrive mai 'assente' — misurato su un set informativo vero,
//  cinque tentativi indipendenti di dedurlo hanno prodotto cinque dati falsi.
//  Ma una persona può spuntarlo, e deve poterlo fare: è lei che ha letto il
//  documento. Quello che non deve poter fare è spuntarlo SENZA PROVA, perché
//  quella casella finisce su un confronto che va a un cliente, e dire che un
//  concorrente non copre una cosa che invece copre è adeguatezza
//  (Reg. IVASS 40 e 41).
//
//      node server/verifica/archivio-prodotto-nel-browser.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apriIam } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriIam(RADICE, { dentro: 'confronta' });
const p = banco.pagina;

/* Un documento finto costruito sulle forme VERE misurate il 02/10/2026 sul set
   informativo DALLBOGG auto (61 pagine). Nomi e importi inventati: il
   documento vero è di una compagnia e una prova non ha bisogno di portarselo
   dietro per misurare le stesse forme. */
const DOC = [
  { n: 1, testo: 'Questa polizza assicura i rischi della Responsabilità Civile Auto (R.C.A.) delle «Autovetture»\n'
      + 'Il presente Documento fornisce una sintesi delle principali coperture ed esclusioni\n'
      + 'Edizione 06/2020\nSET INFORMATIVO AUTO - DIP DANNI' },
  { n: 2, testo: 'Puoi inoltre integrare la polizza con le seguenti ulteriori\n'
      + 'garanzie opzionali (i dettagli sono riportati nel DIP Aggiuntivo):\n'
      + 'Incendio; Furto; Cristalli, Eventi Naturali, Assistenza, Rinuncia alla Rivalsa.\n'
      + 'SET INFORMATIVO AUTO - DIP DANNI' },
  { n: 3, testo: 'Kasko (opzionale)\nGaranzie di base\nL\'assicurazione opera in caso di danno al veicolo.\n'
      + 'Kasko: massimale € 25.000,00 per sinistro.\n'
      + 'Ulteriori garanzie con un premio\naggiuntivo\nNon previste\n'
      + 'SET INFORMATIVO AUTO - DIP AGGIUNTIVO RCA pag. 1 di 2' },
  { n: 4, testo: 'Eventi naturali Franchigia Franchigia Franchigia\n'
      + 'grandine 1.000,00 € 500,00 € 300,00 €\n'
      + 'SET INFORMATIVO AUTO - DIP AGGIUNTIVO RCA pag. 2 di 2' },
];

/* Fa girare le funzioni DI PRODUZIONE: si apre il modale, si sostituisce la
   sola estrazione del testo (pdf.js arriva da una rete che il banco non ha) e
   si lascia lavorare tutto il resto — motore, disegno, spunte, controlli.

   Le funzioni vere si rimettono sempre a posto: lasciare un tappo attaccato a
   `window` farebbe misurare il tappo alle prove che vengono dopo. */
async function leggi(pagine, nomeFile) {
  return p.evaluate(async ({ pagine, nomeFile }) => {
    const veroTesto = window.PdfTesto.testoPagine;
    const veraImpronta = window.PdfTesto.impronta;
    try {
      window.PdfTesto.testoPagine = async () => pagine;
      window.PdfTesto.impronta = async () => 'f'.repeat(64);
      cfnApri();
      await cfnDaFile({ files: [{ name: nomeFile || 'prodotto.pdf' }] });
      const scatola = document.getElementById('cfn-esito');
      const vede = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
        }
        return !!el;
      };
      const righe = [...scatola.querySelectorAll('.cfn-r')].map((e) => {
        const bottoni = [...e.querySelectorAll('.cfn-sc button')].map((b) => ({
          testo: b.textContent.trim(), acceso: /\bon\b/.test(b.className),
        }));
        const cit = e.querySelector('.cfn-cit');
        return {
          nome: e.querySelector('.cfn-r-h b') ? e.querySelector('.cfn-r-h b').textContent.trim() : null,
          dove: e.querySelector('.cfn-r-h small') ? e.querySelector('.cfn-r-h small').textContent.trim() : null,
          numeri: e.querySelector('.cf-num') ? e.querySelector('.cf-num').textContent.trim() : null,
          avviso: e.querySelector('.cfn-g') ? e.querySelector('.cfn-g').textContent.trim() : null,
          frase: e.querySelector('.cfn-frase') ? e.querySelector('.cfn-frase').textContent.trim() : null,
          bottoni,
          scelto: (bottoni.filter((b) => b.acceso)[0] || {}).testo || null,
          citazioneVisibile: cit ? /\bon\b/.test(cit.className) : false,
        };
      });
      return {
        modaleAperto: document.getElementById('modal-cf-nuovo').classList.contains('show'),
        righe,
        conti: [...scatola.querySelectorAll('.cfn-c')].map((e) => ({
          cosa: e.querySelector('span').textContent.trim(),
          quanto: e.querySelector('b').textContent.trim(),
        })),
        /* Il CONTENITORE dei conti, non solo le caselle dentro: rinominare la
           regola di stile del contenitore lasciava le caselle al loro posto, e
           la prova non se ne accorgeva. */
        contoC: !!scatola.querySelector('.cfn-conto'),
        contoTinta: scatola.querySelector('.cfn-conto')
          ? getComputedStyle(scatola.querySelector('.cfn-conto')).backgroundColor : null,
        avvertenze: scatola.querySelector('.cfn-avv') ? scatola.querySelector('.cfn-avv').textContent.trim() : null,
        avvertenzeVisibili: scatola.querySelector('.cfn-avv') ? vede(scatola.querySelector('.cfn-avv')) : false,
        campi: ['cfn-compagnia', 'cfn-prodotto', 'cfn-ramo', 'cfn-tipo', 'cfn-edizione']
          .map((id) => ({ id, c: !!document.getElementById(id),
            valore: document.getElementById(id) ? document.getElementById(id).value : null })),
        salvaSpento: document.getElementById('cfn-salva').disabled,
        fuoriVocabolario: [...scatola.querySelectorAll('.cfn-fuori li')].map((e) => e.textContent.trim()),
        testo: scatola.textContent,
      };
    } finally {
      window.PdfTesto.testoPagine = veroTesto;
      window.PdfTesto.impronta = veraImpronta;
    }
  }, { pagine, nomeFile });
}

// ── 1. i motori e le funzioni ci sono ────────────────────────────────────────

prova('IAM carica i quattro motori che servono a leggere un documento', async () => {
  const c = await p.evaluate(() => ({
    vocab: !!window.Confronto,
    guida: !!window.GuidaGaranzie,
    lettura: !!window.LetturaProposta,
    pdf: !!window.PdfTesto,
    scheda: !!window.SchedaProdotto,
    fn: typeof (window.SchedaProdotto || {}).scheda === 'function',
  }));
  deve(c.vocab && c.guida && c.lettura && c.pdf && c.scheda,
    'motori mancanti: ' + JSON.stringify(c));
  deve(c.fn, 'il motore c\'è ma è vuoto');
});

prova('e le funzioni della schermata', async () => {
  const c = await p.evaluate(() => ({
    apri: typeof cfnApri === 'function',
    daFile: typeof cfnDaFile === 'function',
    scegli: typeof cfnScegli === 'function',
    salva: typeof cfnSalva === 'function',
    ramo: typeof cfnRamo === 'function',
  }));
  deve(Object.values(c).every(Boolean), 'funzioni mancanti: ' + JSON.stringify(c));
});

prova('i contrassegni dei motori non sono rimasti indietro', () => {
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
  for (const nome of ['confronto', 'guida-garanzie', 'lettura-proposta', 'pdf-testo', 'scheda-prodotto']) {
    const m = new RegExp(nome + '\\.js\\?v=(\\d{8})').exec(src);
    deve(m, nome + ' non è caricato in IAM con un contrassegno');
    const mot = fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', nome + '.js'), 'utf8');
    const v = new RegExp('VERSIONE\\s*=\\s*\'' + nome + '-(\\d{4})-(\\d{2})-(\\d{2})\'').exec(mot);
    deve(v, nome + ' non dichiara la sua versione');
    deve(m[1] >= v[1] + v[2] + v[3],
      nome + ': contrassegno ' + m[1] + ' ma il motore è del ' + v[1] + v[2] + v[3]);
  }
});

prova('il bottone per archiviare c\'è nella schermata Confronta', async () => {
  const c = await p.evaluate(() => {
    const b = [...document.querySelectorAll('#panel-confronta .head-actions button')]
      .filter((x) => /cfnApri/.test(x.getAttribute('onclick') || ''))[0];
    return { c: !!b, testo: b ? b.textContent.trim() : null };
  });
  deve(c.c, 'nessun bottone chiama cfnApri: l\'archivio non si potrebbe riempire');
  deve(/archivio/i.test(c.testo), 'il bottone non si chiama come la cosa che fa: ' + c.testo);
});

// ── 2. la lettura, sul documento finto ───────────────────────────────────────

const v = await leggi(DOC, 'dallbogg-auto.pdf');

prova('il documento si legge e la schermata lo fa vedere', () => {
  deve(v.modaleAperto, 'il modale non si è aperto');
  deve(v.righe.length >= 16, 'righe di garanzia: ' + v.righe.length +
    ' — devono esserci tutte le garanzie del ramo, anche quelle non trovate');
  deve(!v.salvaSpento, 'il bottone «Salva» è spento dopo una lettura riuscita');
});

prova('i conti dicono quante sono presenti, quante non lette, quante assenti', () => {
  const c = {};
  v.conti.forEach((x) => { c[x.cosa] = x.quanto; });
  deve(c['presenti'] && Number(c['presenti']) > 0, 'conti: ' + JSON.stringify(v.conti));
  deve(c['assenti'] === '0', 'il motore ha dedotto delle assenze: ' + c['assenti']);
  deve(c['non lette'] && Number(c['non lette']) > 0, 'conti: ' + JSON.stringify(v.conti));
  /* E la riga dei conti deve essere DISEGNATA: con la regola di stile
     rinominata le caselle restavano al loro posto, ma attaccate l'una
     all'altra senza cornice né sfondo. */
  deve(v.contoC, 'il contenitore dei conti non c\'è: la regola di stile non lo raggiunge');
  deve(!/rgba\(0, 0, 0, 0\)/.test(v.contoTinta || ''), 'non ha sfondo: ' + v.contoTinta);
});

prova('OGNI RIGA DICE DA CHE PAGINA VIENE E PORTA LA FRASE DEL DOCUMENTO', () => {
  const presenti = v.righe.filter((r) => r.scelto === 'presente');
  deve(presenti.length > 0, 'nessuna garanzia presente: ' + JSON.stringify(v.righe.map((r) => r.nome)));
  presenti.forEach((r) => {
    deve(/pag\.\s*\d+/.test(r.dove || ''), r.nome + ': non dice da che pagina viene — ' + r.dove);
  });
  const k = v.righe.filter((r) => /Kasko/i.test(r.nome || ''))[0];
  deve(k && k.frase, 'la kasko non porta la frase del documento: ' + JSON.stringify(k));
  deve(/massimale/i.test(k.frase), 'frase: ' + k.frase);
});

prova('e quella che il documento non nomina dice che non è stata letta', () => {
  const t = v.righe.filter((r) => /Tutela legale/i.test(r.nome || ''))[0];
  deve(t, 'la tutela legale non c\'è fra le righe: ' + JSON.stringify(v.righe.map((r) => r.nome)));
  deve(t.scelto === 'non letta', 'tutela legale è «' + t.scelto + '» e il documento non la nomina');
  deve(/non trovata nel documento/.test(t.dove || ''), 'dove: ' + t.dove);
});

prova('i numeri si vedono, e una tabella appiattita si dichiara', () => {
  const k = v.righe.filter((r) => /Kasko/i.test(r.nome || ''))[0];
  deve(/25\.000/.test(k.numeri || ''), 'il massimale della kasko non si vede: ' + k.numeri);
  const e = v.righe.filter((r) => /Eventi naturali/i.test(r.nome || ''))[0];
  deve(e, 'eventi naturali non c\'è');
  deve(/franchigie per area/i.test(e.numeri || ''),
    'le tre franchigie per area non si vedono come tali: ' + e.numeri);
  deve(e.avviso && /tabella/i.test(e.avviso), 'non dichiara che era una tabella: ' + e.avviso);
});

prova('LE AVVERTENZE SI VEDONO, E DICONO CHE «assente» NON L\'HA DEDOTTO NESSUNO', () => {
  deve(v.avvertenze, 'nessuna avvertenza su un documento che ne merita');
  deve(v.avvertenzeVisibili, 'ci sono ma non si vedono');
  deve(/non lo fa mai|Nessuna garanzia è stata segnata/.test(v.avvertenze),
    'non dice che «assente» non viene dedotto: ' + v.avvertenze.slice(0, 200));
  deve(/sintesi delle principali/.test(v.avvertenze),
    'non riporta che il documento si dichiara una sintesi: ' + v.avvertenze.slice(0, 300));
});

prova('la schermata dice che sono proposte, non una lettura', () => {
  deve(/proposte, non una lettura/i.test(v.testo), 'non lo dice da nessuna parte');
});

prova('i campi del prodotto ci sono, e l\'edizione arriva già proposta', () => {
  const c = {};
  v.campi.forEach((x) => { c[x.id] = x; });
  v.campi.forEach((x) => deve(x.c, 'manca il campo ' + x.id));
  deve(c['cfn-edizione'].valore === '06/2020', 'edizione proposta: ' + c['cfn-edizione'].valore);
});

// ── 3. LA REGOLA: «assente» vuole la prova ───────────────────────────────────

prova('ogni riga offre tutti e tre gli stati, perché decide una persona', () => {
  const r = v.righe[0];
  const nomi = r.bottoni.map((b) => b.testo);
  deve(nomi.length === 3, 'bottoni: ' + JSON.stringify(nomi));
  deve(nomi.indexOf('presente') >= 0 && nomi.indexOf('assente') >= 0 && nomi.indexOf('non letta') >= 0,
    'stati offerti: ' + JSON.stringify(nomi));
});

prova('il campo della citazione resta nascosto finché non si sceglie «assente»', () => {
  v.righe.forEach((r) => {
    if (r.scelto !== 'assente') {
      deve(!r.citazioneVisibile, r.nome + ': chiede la citazione senza che nessuno abbia detto «assente»');
    }
  });
});

prova('scegliendo «assente» IL CAMPO DELLA CITAZIONE COMPARE', async () => {
  const c = await p.evaluate(() => {
    cfnScegli('tutela_legale', 'assente');
    const cit = document.getElementById('cfn-cit-tutela_legale');
    const vede = cit ? getComputedStyle(cit).display !== 'none' : false;
    const riga = cit ? cit.closest('.cfn-r') : null;
    return {
      vede,
      etichetta: cit ? cit.querySelector('.cfn-cit-l').textContent.trim() : null,
      acceso: riga ? [...riga.querySelectorAll('.cfn-sc button')]
        .filter((b) => /\bon\b/.test(b.className)).map((b) => b.textContent.trim()) : [],
    };
  });
  deve(c.vede, 'il campo della citazione non si vede');
  deve(/non si salva/i.test(c.etichetta || ''),
    'l\'etichetta non dice che senza citazione non si salva: ' + c.etichetta);
  deve(c.acceso.length === 1 && c.acceso[0] === 'assente', 'spunte accese: ' + JSON.stringify(c.acceso));
});

prova('IL SALVATAGGIO SI RIFIUTA SU UN «assente» SENZA LA FRASE DEL DOCUMENTO', async () => {
  /* La regola per cui questa schermata è fatta così. Un «assente» senza prova
     è un'opinione, e finisce su un confronto che va a un cliente come se
     fosse un dato letto. */
  const c = await p.evaluate(async () => {
    const avvisi = [];
    const vero = window.alert;
    window.__vero = db;
    let hoScrittoSulDb = false;
    try {
      window.alert = (m) => avvisi.push(String(m));
      /* Un database finto che registra se qualcuno ci scrive: la prova deve
         dire che il salvataggio NON è partito, non solo che è comparso un
         avviso.

         `db` in IAM è dichiarato con `let`, e un `let` di primo livello NON è
         una proprietà di `window`: assegnare `window.db` lascia la pagina a
         usare il suo. Si sostituisce con un `eval` indiretto, che scrive
         nello stesso ambito in cui `db` è dichiarato. */
      window.__finto = { from: () => { window.__scritto = true; throw new Error('non si deve arrivare qui'); } };
      (0, eval)('db = window.__finto');
      document.getElementById('cfn-compagnia').value = 'Compagnia di prova';
      document.getElementById('cfn-prodotto').value = 'Prodotto di prova';
      cfnScegli('tutela_legale', 'assente');
      cfnCitazione('tutela_legale', '   ');     /* spazi: non è una prova */
      await cfnSalva();
      return { avvisi, hoScrittoSulDb: !!window.__scritto };
    } finally { window.alert = vero; (0, eval)('db = window.__vero'); delete window.__scritto; }
  });
  deve(c.avvisi.length === 1, 'avvisi: ' + JSON.stringify(c.avvisi));
  deve(/assente/i.test(c.avvisi[0]) && /Tutela legale/i.test(c.avvisi[0]),
    'l\'avviso non nomina la garanzia senza prova: ' + c.avvisi[0]);
  deve(/non copre una cosa che invece copre/i.test(c.avvisi[0]),
    'l\'avviso non dice perché è grave: ' + c.avvisi[0]);
  deve(!c.hoScrittoSulDb, 'HA PROVATO A SCRIVERE IN ARCHIVIO un «assente» senza prova');
});

prova('con la frase del documento, invece, il salvataggio parte', async () => {
  const c = await p.evaluate(async () => {
    const avvisi = [];
    const vero = window.alert;
    window.__vero = db;
    const scritte = [];
    try {
      window.alert = (m) => avvisi.push(String(m));
      /* Un database finto che risponde come quello vero e si ricorda che cosa
         gli hanno chiesto di scrivere. Si mette con un `eval` indiretto,
         perche` `db` in IAM e` un `let` e `window.db` non lo sostituisce. */
      window.__finto = {
        from: (t) => ({
          select: () => ({
            ilike: () => ({ ilike: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
            eq: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }),
            order: async () => ({ data: [], error: null }),
          }),
          insert: (r) => { scritte.push({ tabella: t, righe: r }); return {
            select: async () => ({ data: [{ id: 'id-' + t }], error: null }),
            then: (f) => Promise.resolve({ data: null, error: null }).then(f),
          }; },
        }),
      };
      (0, eval)('db = window.__finto');
      document.getElementById('cfn-compagnia').value = 'Compagnia di prova';
      document.getElementById('cfn-prodotto').value = 'Prodotto di prova';
      cfnScegli('tutela_legale', 'assente');
      cfnCitazione('tutela_legale', 'pag. 11: «Rischi esclusi: la tutela legale non è prevista»');
      await cfnSalva();
      return { avvisi, scritte: scritte.map((x) => ({ tabella: x.tabella,
        quante: Array.isArray(x.righe) ? x.righe.length : 1,
        righe: Array.isArray(x.righe) ? x.righe : [x.righe] })) };
    } finally { window.alert = vero; (0, eval)('db = window.__vero'); }
  });

  const tab = c.scritte.map((x) => x.tabella);
  deve(tab.indexOf('iam_conf_prodotti') >= 0, 'non ha scritto il prodotto: ' + JSON.stringify(tab));
  deve(tab.indexOf('iam_conf_documenti') >= 0, 'non ha scritto il documento: ' + JSON.stringify(tab));
  deve(tab.indexOf('iam_conf_garanzie') >= 0, 'non ha scritto le garanzie: ' + JSON.stringify(tab));

  const gar = c.scritte.filter((x) => x.tabella === 'iam_conf_garanzie')[0].righe;
  const tl = gar.filter((r) => r.garanzia === 'tutela_legale')[0];
  deve(tl, 'la tutela legale non è fra le righe scritte');
  deve(tl.stato === 'assente', 'stato scritto: ' + tl.stato);
  deve(/Rischi esclusi/.test(tl.frase || ''), 'la frase della persona non è finita in archivio: ' + tl.frase);

  /* E il vincolo dell'archivio rispettato prima di Postgres. */
  gar.filter((r) => r.stato === 'non_letto').forEach((r) => {
    deve(r.massimale === null && r.franchigia === null && r.scoperto === null,
      r.garanzia + ' è non letta e porta numeri: ' + JSON.stringify(r));
  });

  const doc = c.scritte.filter((x) => x.tabella === 'iam_conf_documenti')[0].righe[0];
  deve(doc.impronta && doc.impronta.length === 64, 'il documento va in archivio senza impronta: ' + doc.impronta);
  deve(doc.edizione === '06/2020', 'edizione scritta: ' + doc.edizione);
  deve(doc.pagine === 4, 'pagine scritte: ' + doc.pagine);
});

prova('spostare una garanzia su «non letta» le porta via i numeri', async () => {
  /* Il vincolo dell'archivio dice che una garanzia non letta non può portare
     numeri: un massimale «non letto» è un dato inventato con sopra
     l'etichetta di dato mancante. */
  const c = await p.evaluate(async () => {
    const vero = window.alert;
    window.__vero = db;
    const scritte = [];
    try {
      window.alert = () => {};
      window.__finto = { from: (t) => ({
        select: () => ({
          ilike: () => ({ ilike: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
          eq: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }),
          order: async () => ({ data: [], error: null }),
        }),
        insert: (r) => { scritte.push({ tabella: t, righe: r }); return {
          select: async () => ({ data: [{ id: 'x' }], error: null }),
          then: (f) => Promise.resolve({ data: null, error: null }).then(f),
        }; },
      }) };
      (0, eval)('db = window.__finto');
      document.getElementById('cfn-compagnia').value = 'X';
      document.getElementById('cfn-prodotto').value = 'Y';
      cfnScegli('kasko', 'non_letto');          /* la kasko aveva un massimale */
      await cfnSalva();
      const gar = scritte.filter((x) => x.tabella === 'iam_conf_garanzie')[0];
      return gar ? gar.righe.filter((r) => r.garanzia === 'kasko')[0] : null;
    } finally { (0, eval)('db = window.__vero'); window.alert = vero; }
  });
  deve(c, 'le garanzie non sono state scritte');
  deve(c.stato === 'non_letto', 'stato: ' + c.stato);
  deve(c.massimale === null, 'la kasko è non letta e porta ancora il massimale: ' + c.massimale);
});

// ── 4. quello che non si riesce a leggere ────────────────────────────────────

prova('UN PDF CHE È UNA SCANSIONE LO DICE, invece di dire che non ha garanzie', async () => {
  /* «Non ho trovato garanzie» e «questo documento è un'immagine» sono due
     diagnosi opposte, e la seconda si risolve chiedendo alla compagnia il PDF
     vero invece di mettersi a spuntare a mano. */
  const c = await leggi([{ n: 1, testo: '' }, { n: 2, testo: '   ' }], 'scansione.pdf');
  deve(/scansione/i.test(c.testo), 'non dice che è una scansione: ' + c.testo.slice(0, 220));
  deve(/non contiene testo/i.test(c.testo), 'testo: ' + c.testo.slice(0, 220));
  deve(!c.righe.length, 'ha proposto delle garanzie da un\'immagine: ' + c.righe.length);
  deve(c.salvaSpento, 'il bottone «Salva» è acceso su un documento illeggibile');
  /* E NON chiede il ramo: con un'immagine il ramo non c'entra niente, e
     offrire la tendina farebbe provare e riprovare a vuoto. */
  deve(!c.campi.filter((x) => x.id === 'cfn-ramo')[0].c,
    'chiede il ramo a un\'immagine: si proverebbe e riproverebbe a vuoto');
});

prova('IL RAMO E IL TIPO ARRIVANO PROPOSTI, non per caso', async () => {
  /* Il documento di prova è CASA e porta un DIP solo. Nessuno dei due è la
     prima voce della sua tendina — i rami cominciano da «auto» e i tipi da
     «set informativo» — e questo è il punto: una `<select>` senza nessuna
     voce marcata «selected» prende la prima. Provandolo su un documento auto
     e su un set informativo, la prova passava anche togliendo il «selected»,
     perché la prima voce era già quella giusta. */
  const c = await leggi([
    { n: 1, testo: 'Polizza a protezione dell\'abitazione e del fabbricato\n'
        + 'Incendio del fabbricato (opzionale)\nGaranzie di base\nopera.\n'
        + 'Edizione 03/2024\nDIP DANNI CASA pag. 1 di 2' },
    { n: 2, testo: 'RC del capofamiglia (opzionale)\nGaranzie di base\nopera.\nDIP DANNI CASA pag. 2 di 2' },
  ], 'casa.pdf');
  const q = {};
  c.campi.forEach((x) => { q[x.id] = x; });
  deve(q['cfn-ramo'].valore === 'casa',
    'il ramo non arriva proposto: ' + q['cfn-ramo'].valore + ' — con la tendina che comincia da «auto», ' +
    'questo vuol dire che nessuna voce è marcata «selected»');
  deve(q['cfn-tipo'].valore === 'dip',
    'il tipo non arriva proposto: ' + q['cfn-tipo'].valore);
  deve(q['cfn-edizione'].valore === '03/2024', 'edizione: ' + q['cfn-edizione'].valore);
});

prova('un documento di cui non si capisce il ramo chiede il ramo', async () => {
  const c = await leggi([{ n: 1, testo: 'Gentile cliente, la ringraziamo per la fiducia.' }], 'lettera.pdf');
  deve(/di che ramo/i.test(c.testo), 'non chiede il ramo: ' + c.testo.slice(0, 200));
  deve(c.campi.filter((x) => x.id === 'cfn-ramo')[0].c, 'non offre la tendina del ramo');
  deve(c.salvaSpento, 'il bottone «Salva» è acceso senza sapere il ramo');
});

prova('le coperture che il vocabolario non conosce si vedono nella schermata', async () => {
  const c = await leggi(DOC.concat([{ n: 5, testo:
    'Garanzia GAP (Cash Back) (opzionale)\nGaranzie di base\nRimborso della differenza di valore.\n'
    + 'SET INFORMATIVO AUTO - CONDIZIONI pag. 1 di 2' },
    { n: 6, testo: 'Fine.\nSET INFORMATIVO AUTO - CONDIZIONI pag. 2 di 2' }]), 'con-gap.pdf');
  deve(c.fuoriVocabolario.some((x) => /GAP/i.test(x)),
    'la GAP non si vede: ' + JSON.stringify(c.fuoriVocabolario));
  deve(/più povero di quello che è/i.test(c.testo),
    'non spiega perché conta: ' + c.testo.slice(0, 200));
});

prova('senza la compagnia e senza il prodotto non si archivia niente', () => {
  /* Un prodotto in archivio senza il nome della compagnia non si può né
     ritrovare né confrontare: l'archivio ha un indice unico su compagnia,
     prodotto e ramo, e una riga senza nome lo sfonda al primo doppione. */
  return p.evaluate(async () => {
    const vero = window.alert, avvisi = [];
    window.__vero = db;
    try {
      window.alert = (m) => avvisi.push(String(m));
      window.__finto = { from: () => { window.__scritto = true; throw new Error('non si deve arrivare qui'); } };
      (0, eval)('db = window.__finto');
      document.getElementById('cfn-compagnia').value = '';
      document.getElementById('cfn-prodotto').value = 'Prodotto di prova';
      await cfnSalva();
      const senzaCompagnia = { avvisi: avvisi.slice(), scritto: !!window.__scritto };

      avvisi.length = 0; delete window.__scritto;
      document.getElementById('cfn-compagnia').value = 'Compagnia di prova';
      document.getElementById('cfn-prodotto').value = '   ';
      await cfnSalva();
      return { senzaCompagnia, senzaProdotto: { avvisi: avvisi.slice(), scritto: !!window.__scritto } };
    } finally { window.alert = vero; (0, eval)('db = window.__vero'); delete window.__scritto; }
  }).then((c) => {
    deve(c.senzaCompagnia.avvisi.length === 1 && /compagnia/i.test(c.senzaCompagnia.avvisi[0]),
      'senza compagnia non avvisa: ' + JSON.stringify(c.senzaCompagnia.avvisi));
    deve(!c.senzaCompagnia.scritto, 'ha provato ad archiviare un prodotto senza compagnia');
    deve(c.senzaProdotto.avvisi.length === 1 && /prodotto/i.test(c.senzaProdotto.avvisi[0]),
      'senza prodotto non avvisa: ' + JSON.stringify(c.senzaProdotto.avvisi));
    deve(!c.senzaProdotto.scritto, 'ha provato ad archiviare un prodotto senza nome');
  });
});

prova('IL DOCUMENTO NON ESCE DAL BROWSER', async () => {
  /* Qui dentro si caricano le note informative, che sono documenti pubblici.
     Ma la stessa macchina legge anche le proposte e le polizze, e quelle
     portano nome, indirizzo, codice fiscale e targa del cliente. Una macchina
     sola, una regola sola: niente esce da questa pagina. */
  const c = await p.evaluate(() => {
    const m = window.PdfTesto || {};
    const src = [cfnDaFile, m.testoPagine, m.righeDaPezzi, m.impronta]
      .filter(Boolean).map(String).join('\n');
    return {
      rete: /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new\s+WebSocket/.test(src),
      caricamenti: /\.upload\b|storage\s*\.\s*from|FormData/.test(src),
      /* IAM parla col database per archiviare le RIGHE LETTE. Quello che non
         deve fare è mandarci il file. */
      file: /from\([^)]*\)\s*\.\s*insert\([^)]*file/.test(src),
    };
  });
  deve(!c.rete, 'il documento viaggia: c\'è una chiamata di rete nella lettura');
  deve(!c.caricamenti, 'il documento si carica da qualche parte');
  deve(!c.file, 'il file finisce nel database');
});

/* ══ ATTACCARE A MANO UN IMPORTO CHE IL MOTORE NON HA ATTRIBUITO ═══════════
   (08/10/2026) Misurato su 31 documenti veri di sei compagnie: zero massimali
   attribuiti su trenta documenti su trentuno. Un confronto senza massimali
   dice quali garanzie ci sono, non quanto coprono — cioè non serve.

   Il motore resta severo e fa bene: pretende il nome della garanzia NELLA
   STESSA RIGA del numero, ed è la regola che impedisce di mettere la
   franchigia degli eventi naturali sui cristalli. Qui si misura il pezzo
   umano: una persona attacca l'importo avendo davanti la frase e la pagina.

   Un documento con un importo che il motore trova e non sa attribuire: la
   riga del massimale non nomina nessuna garanzia. */
const CON_IMPORTO = [
  { n: 1, testo: 'Prodotto: AUTO assicurazione\nSET AUTO pag. 1 di 2' },
  { n: 2, testo: 'Furto e Incendio\nGaranzie di base\nopera.\n'
      + 'Il limite di indennizzo è di € 25.000,00 per sinistro e di € 3.000,00 per anno.\n'
      + 'SET AUTO pag. 2 di 2' },
];

prova('GLI IMPORTI NON ATTRIBUITI SI VEDONO, UNO PER OGNI CIFRA DELLA RIGA', async () => {
  await leggi(CON_IMPORTO, 'con-importo.pdf');
  const c = await p.evaluate(() => {
    const s = (window.CFN || (0, eval)('CFN')).scheda;
    const scatola = document.getElementById('cfn-esito');
    const tasti = [...scatola.querySelectorAll('button')].map((b) => b.textContent.trim())
      .filter((t) => /^massimale |^franchigia /.test(t));
    return { quanti: s.quantiNonAttribuiti, primi: (s.importiNonAttribuiti || [])[0], tasti: tasti,
      tendine: scatola.querySelectorAll('select[id^="cfn-imp-"]').length };
  });
  deve(c.quanti >= 1, 'il motore non ha messo da parte nessun importo: la prova non misura quello che crede');
  deve(c.tendine >= 1, 'la schermata non offre di scegliere la garanzia a cui attaccarlo');
  /* UN BOTTONE PER OGNI CIFRA, mai «la prima»: scegliere da soli il primo
     numero di una riga che ne porta due è il modo più credibile di scrivere un
     massimale falso. La riga ne porta due, quindi i bottoni sono quattro
     (massimale/franchigia per ciascuna). */
  deve(c.tasti.length >= 4, 'non c\'è un bottone per ogni importo della riga: ' + JSON.stringify(c.tasti));
  deve(c.tasti.some((t) => /25\.000/.test(t)) && c.tasti.some((t) => /3\.000/.test(t)),
    'i bottoni non portano le cifre vere della riga: ' + JSON.stringify(c.tasti));
});

prova('SENZA SCEGLIERE LA GARANZIA NON SI ATTACCA NIENTE', async () => {
  await leggi(CON_IMPORTO, 'con-importo.pdf');
  const c = await p.evaluate(() => {
    const vero = window.alert; const avvisi = [];
    window.alert = (t) => avvisi.push(String(t));
    try {
      cfnAttacca(0, 0, 'massimale');          /* nessuna garanzia scelta nella tendina */
      const s = (0, eval)('CFN').scheda;
      return { avvisi, conImporti: s.garanzie.filter((g) => g.massimale != null).length };
    } finally { window.alert = vero; }
  });
  deve(c.avvisi.length === 1 && /scegli/i.test(c.avvisi[0]), 'non chiede a quale garanzia: ' + JSON.stringify(c.avvisi));
  deve(c.conImporti === 0, 'ha attaccato l\'importo a qualche garanzia senza che nessuno l\'abbia scelta');
});

prova('ATTACCATO, L\'IMPORTO SI VEDE MARCATO «A MANO» E SI PUÒ TOGLIERE', async () => {
  await leggi(CON_IMPORTO, 'con-importo.pdf');
  const c = await p.evaluate(() => {
    const sel = document.querySelector('select[id^="cfn-imp-"]');
    sel.value = 'furto';
    cfnScegli('furto', 'presente');           /* un importo si attacca solo a una garanzia letta */
    document.querySelector('select[id^="cfn-imp-"]').value = 'furto';
    cfnAttacca(0, 0, 'massimale');
    const s = (0, eval)('CFN').scheda;
    const g = s.garanzie.filter((x) => x.garanzia === 'furto')[0];
    /* Il segno si cerca SULL'ELEMENTO, non nel testo del pannello: la nota
       che spiega la cosa contiene già le parole «a mano», quindi cercarle nel
       testo faceva passare la prova anche col segno spento. Un guasto della
       controprova lo ha mostrato. */
    const segni = [...document.querySelectorAll('.cfn-r .cnt-tag')]
      .filter((e) => /a mano/i.test(e.textContent)).length;
    const dopoTogli = () => {
      cfnStacca('furto', 'massimale');
      return (0, eval)('CFN').scheda.garanzie.filter((x) => x.garanzia === 'furto')[0];
    };
    return { massimale: g.massimale, mano: g.attribuito_a_mano, pagina: g.pagina,
      segno: segni, tolto: dopoTogli() };
  });
  deve(c.massimale === 25000, 'l\'importo non si è attaccato: ' + c.massimale);
  deve((c.mano || []).indexOf('massimale') >= 0, 'non resta scritto che è stato attaccato a mano');
  deve(c.pagina === 2, 'non si porta dietro la pagina da cui viene: ' + c.pagina);
  deve(c.segno === 1, 'a schermo il segno «a mano» accanto all\'importo non c\'è (ne ho contati ' + c.segno + ')');
  deve(c.tolto.massimale == null && (c.tolto.attribuito_a_mano || []).length === 0,
    'il tasto «togli» non toglie: ' + JSON.stringify(c.tolto));
});

prova('SU UNA GARANZIA «NON LETTA» L\'IMPORTO NON SI ATTACCA, E SI DICE PERCHÉ', async () => {
  /* Il database vieta i numeri su una garanzia non letta e `daArchiviare` li
     butta. Lasciarli attaccare qui vorrebbe dire farli sparire al salvataggio
     senza che nessuno capisca perché. */
  await leggi(CON_IMPORTO, 'con-importo.pdf');
  const c = await p.evaluate(() => {
    const vero = window.alert; const avvisi = [];
    window.alert = (t) => avvisi.push(String(t));
    try {
      cfnScegli('furto', 'non_letto');
      document.querySelector('select[id^="cfn-imp-"]').value = 'furto';
      cfnAttacca(0, 0, 'massimale');
      const g = (0, eval)('CFN').scheda.garanzie.filter((x) => x.garanzia === 'furto')[0];
      return { avvisi, massimale: g.massimale };
    } finally { window.alert = vero; }
  });
  deve(c.massimale == null, 'ha attaccato un importo a una garanzia non letta: sparirebbe al salvataggio');
  deve(c.avvisi.length === 1 && /non letta/i.test(c.avvisi[0]),
    'non spiega perché non si può: ' + JSON.stringify(c.avvisi));
});

prova('aprendo IAM non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nARCHIVIO PRODOTTO — la schermata');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nARCHIVIO NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
