// ═══════════════════════════════════════════════════════════════════════════════
//  CONFRONTA — LA SCHERMATA, IN UN BROWSER VERO
//
//  Il motore ha le sue 20 prove e dice le cose giuste. Non dicono che la
//  SCHERMATA le faccia vedere: un `<script src>` senza contrassegno, una
//  funzione che si chiama diversamente, una regola di stile con un selettore
//  sbagliato — e in Node non se ne accorge nessuno.
//
//  La cosa che questa schermata deve fare, e che una tabella qualunque non fa:
//  far VEDERE quello che non si è letto. Una tabella che mostra solo le righe
//  piene convince di più ed è più falsa, e questa tabella la si gira verso un
//  cliente.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apriIam } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriIam(RADICE);
const p = banco.pagina;

/* Disegna un confronto con la funzione VERA della pagina, senza database: si
   sostituisce `cfProdotto`, che è l'unico pezzo che va a leggere. Così la
   prova guarda il disegno di produzione, non una copia. */
async function disegna(garanzieA, garanzieB) {
  return p.evaluate(({ ga, gb }) => {
    const pag = document.getElementById('panel-confronta');
    if (pag) pag.classList.add('act');
    window.CF_PRODOTTI = [
      { id: 'A', compagnia: 'HDI', prodotto: 'Valore Auto', ramo: 'auto', in_vendita: true },
      { id: 'B', compagnia: 'Italiana', prodotto: 'Auto Più', ramo: 'auto', in_vendita: true },
    ];
    cfRami();
    document.getElementById('cf-ramo').value = 'auto';
    cfRamo();
    const per = { A: ga, B: gb };
    /* La vera `cfProdotto` si mette da parte e si RIMETTE a posto in fondo:
       lasciando lo stub attaccato a window, ogni prova successiva crederebbe
       di guardare la funzione di produzione e guarderebbe la mia. È costato
       una prova che falliva dicendo una cosa falsa. */
    const veraCfProdotto = window.cfProdotto;
    window.cfProdotto = async (id) => ({
      compagnia: id === 'A' ? 'HDI' : 'Italiana',
      prodotto: id === 'A' ? 'Valore Auto' : 'Auto Più',
      ramo: 'auto', garanzie: per[id],
    });
    document.getElementById('cf-a').value = 'A';
    document.getElementById('cf-b').value = 'B';
    return cfConfronta().then(() => {
      const box = document.getElementById('cf-esito');
      const righe = [...box.querySelectorAll('.cf-tab tbody tr')].map(tr => {
        const td = tr.querySelectorAll('td');
        return {
          garanzia: td[0].querySelector('.cf-g') ? td[0].childNodes[0].textContent.trim() : td[0].textContent.trim(),
          a: td[1].querySelector('.cf-st')?.textContent.trim(),
          aClasse: td[1].querySelector('.cf-st')?.className,
          /* La classe scritta nell'HTML non dice che il foglio di stile la
             riconosca: un selettore sbagliato non dà nessun errore e lascia
             l'etichetta identica a tutte le altre. Si guarda il colore vero. */
          aTinta: td[1].querySelector('.cf-st')
            ? (() => { const s = getComputedStyle(td[1].querySelector('.cf-st'));
                       return s.backgroundColor + ' / ' + s.color; })() : null,
          aNum: td[1].querySelector('.cf-num')?.textContent.trim() || null,
          aFonte: td[1].querySelector('.cf-fonte')?.textContent.trim() || null,
          verso: td[2].textContent.trim(),
          b: td[3].querySelector('.cf-st')?.textContent.trim(),
        };
      });
      return {
        righe,
        somma: [...box.querySelectorAll('.cf-s')].map(e => ({
          t: e.querySelector('span')?.textContent.trim(),
          v: e.querySelector('b')?.textContent.trim(),
          vince: /cf-win/.test(e.className),
        })),
        astenuto: box.querySelector('.cf-astenuto')?.textContent.trim() || null,
        fuori: box.textContent.includes('Fuori dal confronto'),
        testo: box.textContent,
      };
    }).finally(() => { window.cfProdotto = veraCfProdotto; });
  }, { ga: garanzieA, gb: garanzieB });
}

const PIENO_A = [
  { id: 'rca', stato: 'presente', massimale: 7290000, pagina: 3, frase: 'La Compagnia risarcisce i danni', documento: 'dip', edizione: '07/2020' },
  { id: 'cristalli', stato: 'presente', massimale: 500, franchigia: 0, pagina: 11, documento: 'condizioni', edizione: '07/2020' },
  { id: 'kasko', stato: 'assente', pagina: 2, documento: 'dip', edizione: '07/2020' },
];
const PIENO_B = [
  { id: 'rca', stato: 'presente', massimale: 7290000, pagina: 2, documento: 'dip', edizione: '01/2026' },
  { id: 'cristalli', stato: 'presente', massimale: 500, franchigia: 150, pagina: 9, documento: 'dip', edizione: '01/2026' },
  { id: 'kasko', stato: 'presente', massimale: 20000, pagina: 10, documento: 'dip', edizione: '01/2026' },
  { nome: 'Garanzia Fantasia', stato: 'presente', pagina: 12 },
];

// ── 1. che la schermata esista e porti il motore ─────────────────────────────

prova('IAM carica il motore del confronto', async () => {
  const c = await p.evaluate(() => ({
    motore: !!window.Confronto,
    confronta: typeof (window.Confronto || {}).confronta === 'function',
    punteggio: typeof (window.Confronto || {}).punteggio === 'function',
    leggiDip: typeof (window.Confronto || {}).leggiDip === 'function',
    rami: ((window.Confronto || {}).RAMI || []).length,
  }));
  deve(c.motore, 'window.Confronto non esiste: il tag <script> non c\'è o non si carica');
  deve(c.confronta && c.punteggio && c.leggiDip, 'il motore c\'è ma non porta le sue funzioni: ' + JSON.stringify(c));
  deve(c.rami === 5, 'i rami sono cinque, qui sono ' + c.rami);
});

prova('e le funzioni della schermata che lo usano', async () => {
  const c = await p.evaluate(() => ({
    carica: typeof cfCarica === 'function', rami: typeof cfRami === 'function',
    ramo: typeof cfRamo === 'function', confronta: typeof cfConfronta === 'function',
    lato: typeof cfLato === 'function', prodotto: typeof cfProdotto === 'function',
  }));
  deve(Object.values(c).every(Boolean), 'funzioni della schermata mancanti: ' + JSON.stringify(c));
});

prova('il pannello e i suoi campi esistono nella pagina', async () => {
  const c = await p.evaluate(() => ({
    pannello: !!document.getElementById('panel-confronta'),
    ramo: !!document.getElementById('cf-ramo'),
    a: !!document.getElementById('cf-a'), b: !!document.getElementById('cf-b'),
    stato: !!document.getElementById('cf-stato'), esito: !!document.getElementById('cf-esito'),
  }));
  deve(Object.values(c).every(Boolean), 'manca un pezzo del pannello: ' + JSON.stringify(c));
});

prova('la voce di menu apre la schermata', () => {
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'withus-one.js'), 'utf8');
  const i = src.indexOf('Confronta prodotti');
  deve(i > 0, 'la voce «Confronta prodotti» non esiste nel menu');
  /* Ancorato alla chiamata, non a un intorno di caratteri: un intorno
     ingoierebbe la voce accanto e la prova resterebbe verde anche togliendo
     questa. */
  deve(/vai\('confronta'\)/.test(src.slice(i, i + 160)), 'la voce non apre la pagina «confronta»');
});

prova('e aprendo la pagina qualcuno carica l\'archivio', () => {
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
  deve(/if \(t === 'confronta'\) \{ cfCarica\(\); \}/.test(src),
    'entrando nella pagina nessuno chiama cfCarica: resterebbe vuota');
});

prova('il contrassegno del motore non è rimasto indietro', () => {
  /* Il banco di prova serve i file dal disco e del `?v=` non si accorge: un
     contrassegno vecchio qui non romperebbe niente, e in produzione il browser
     servirebbe il motore di ieri — che il confronto non ce l'ha. Si legge dal
     sorgente, non dalla pagina aperta. */
  const src = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
  const m = /confronto\.js\?v=(\d{8})/.exec(src);
  deve(m, 'il tag <script> del confronto non porta un contrassegno');
  /* La soglia si legge dal MOTORE, non si scrive qui: una data a mano in una
     prova invecchia il giorno dopo, e da quel momento la prova passa anche con
     il contrassegno riportato indietro. `VERSIONE` cambia quando cambia il
     motore, ed è l'unica cosa che sa quando è successo. */
  const mot = fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', 'confronto.js'), 'utf8');
  const v = /VERSIONE\s*=\s*'confronto-(\d{4})-(\d{2})-(\d{2})'/.exec(mot);
  deve(v, 'il motore non dichiara la sua versione');
  const soglia = v[1] + v[2] + v[3];
  deve(m[1] >= soglia, 'contrassegno ' + m[1] + ', ma il motore è del ' + soglia +
    ': il browser servirebbe la versione di prima');
});

prova('la mappatura dal database ai nomi del motore regge', async () => {
  /* Le altre prove sostituiscono `cfProdotto` per non toccare il database, e
     così facendo NON provano l'unico pezzo che il database lo legge davvero.
     Qui si sostituisce il database e si lascia lavorare `cfProdotto`: è lì che
     `tipo` diventa `documento` e `nome_documento` diventa `nome`, ed è una
     riga che si può sbagliare senza che nessuno se ne accorga. */
  const g = await p.evaluate(async () => {
    /* `db` nella pagina è un `let` globale, NON una proprietà di window: un
       `window.db = ...` lo lascia intatto e la prova muore dicendo che la
       pagina è rotta. Si passa dall'eval indiretto, che scrive nel binding
       vero. */
    const scrivi = (v) => { window.__finto = v; (0, eval)('db = window.__finto'); };
    const vero = (0, eval)('db');
    const risposte = {
      iam_conf_garanzie: { data: [{
        garanzia: 'rca', nome_documento: 'RC Auto', stato: 'presente',
        massimale: '7290000.00', franchigia: null, scoperto: null,
        pagina: 3, frase: 'La Compagnia risarcisce', documento_id: 'D1' }] },
      iam_conf_documenti: { data: [{ id: 'D1', tipo: 'dip', edizione: '07/2020', url: 'http://x/y.pdf' }] },
    };
    const finto = (tab) => {
      const q = {
        select: () => q,
        eq: () => q,
        then: (ok) => Promise.resolve(risposte[tab] || { data: [] }).then(ok),
      };
      return q;
    };
    scrivi({ from: finto });
    window.CF_PRODOTTI = [{ id: 'A', compagnia: 'HDI', prodotto: 'Valore Auto', ramo: 'auto', in_vendita: true }];
    try { return await cfProdotto('A'); } finally { scrivi(vero); delete window.__finto; }
  });
  deve(g && g.garanzie && g.garanzie.length === 1, 'cfProdotto non ha letto la garanzia: ' + JSON.stringify(g));
  const x = g.garanzie[0];
  deve(x.documento === 'dip', '`tipo` del documento non diventa `documento`: ' + JSON.stringify(x));
  deve(x.edizione === '07/2020', 'l\'edizione non arriva dal documento: ' + JSON.stringify(x));
  deve(x.nome === 'RC Auto', '`nome_documento` non diventa `nome`: ' + x.nome);
  deve(x.massimale === 7290000, 'il massimale resta una stringa: ' + JSON.stringify(x.massimale));
  deve(x.franchigia === null, 'un NULL del database è diventato qualcos\'altro: ' + JSON.stringify(x.franchigia));
});

// ── 2. il disegno, e quello che non si è letto ───────────────────────────────

const vista = await disegna(PIENO_A, PIENO_B);

prova('c\'è una riga per ogni garanzia del ramo, non solo per quelle lette', async () => {
  /* Il guasto da evitare: una tabella con dentro solo le tre garanzie che i
     documenti nominano. Sembrerebbe un confronto completo e sarebbe un
     confronto su tre garanzie su quindici. */
  const quante = await p.evaluate(() => Confronto.VOCABOLARIO.auto.length);
  deve(vista.righe.length === quante,
    'righe disegnate: ' + vista.righe.length + ' invece di ' + quante + ' (il vocabolario del ramo)');
});

prova('«non letto» si vede, e non è un trattino', () => {
  /* Un trattino si scambia per uno zero, e su una franchigia vuol dire dire a
     un cliente che non ce l'ha. */
  const r = vista.righe.find(x => /bonus protetto/i.test(x.garanzia));
  deve(r, 'la riga del bonus protetto non c\'è: ' + vista.righe.map(x => x.garanzia).join(', '));
  deve(r.a === 'non letto', 'a schermo non dice «non letto»: ' + JSON.stringify(r));
  deve(/cf-nl/.test(r.aClasse || ''), 'non ha la classe sua: ' + r.aClasse);
  deve(/non lo dice|non si è riusciti/i.test(r.aFonte || ''), 'non spiega perché: ' + r.aFonte);
  deve(r.verso === '·', 'ha disegnato un vincitore su una garanzia non letta: ' + r.verso);
  /* E deve VEDERSI diverso: una classe che il foglio di stile non riconosce
     lascia «non letto» uguale a «c'è», e a colpo d'occhio la tabella sembra
     piena di dati che non ci sono. */
  const letto = vista.righe.find(x => /responsabilità civile auto/i.test(x.garanzia));
  deve(r.aTinta && letto.aTinta, 'non si è potuto leggere la tinta: ' + r.aTinta + ' / ' + letto.aTinta);
  deve(r.aTinta !== letto.aTinta,
    '«non letto» e «c\'è» hanno lo stesso aspetto, il foglio di stile non li distingue: ' + r.aTinta);
  /* E deve avere uno SFONDO vero. Senza la sua regola l'etichetta resta
     diversa da «c'è» — è trasparente — ma smette di sembrare un'etichetta e
     diventa una scritta qualunque in mezzo alla riga. Pretendere solo che
     siano diverse lasciava passare proprio quel guasto: l'ha detto la
     controprova. */
  deve(!/rgba\(0, 0, 0, 0\)/.test(r.aTinta),
    '«non letto» non ha sfondo: la regola di stile non lo raggiunge — ' + r.aTinta);
});

prova('«c\'è» e «non c\'è» si distinguono a colpo d\'occhio', () => {
  const k = vista.righe.find(x => /kasko/i.test(x.garanzia));
  deve(k.a === 'non c\'è' && /cf-no/.test(k.aClasse), 'A dichiara di non avere la kasko: ' + JSON.stringify(k));
  deve(k.b === 'c\'è', 'B ce l\'ha: ' + k.b);
  deve(k.verso === '▶', 'la freccia non indica B: ' + k.verso);
});

prova('i numeri letti si vedono accanto alla garanzia', () => {
  const c = vista.righe.find(x => /cristalli/i.test(x.garanzia));
  deve(/massimale/i.test(c.aNum || ''), 'manca il massimale: ' + c.aNum);
  deve(/franchigia/i.test(c.aNum || ''), 'manca la franchigia: ' + c.aNum);
  deve(c.verso === '◀', 'franchigia 0 contro 150 e la freccia non indica A: ' + c.verso);
});

prova('ogni riga letta dice da quale documento e da quale pagina viene', () => {
  const r = vista.righe.find(x => /responsabilità civile auto/i.test(x.garanzia));
  deve(r, 'la riga della RCA non c\'è');
  deve(/pag\. 3/.test(r.aFonte || ''), 'manca la pagina: senza, «dove c\'è scritto?» non ha risposta — ' + r.aFonte);
  deve(/ed\. 07\/2020/.test(r.aFonte || ''), 'manca l\'edizione: ' + r.aFonte);
  deve(/risarcisce/i.test(r.aFonte || ''), 'manca la frase del documento: ' + r.aFonte);
});

prova('il cartello porta sempre «confrontate» e «non lette»', () => {
  /* I due numeri stanno insieme o il punteggio finge. */
  const et = vista.somma.map(s => (s.t || '').toLowerCase());
  deve(et.some(t => /confrontate/.test(t)), 'manca «confrontate»: ' + JSON.stringify(et));
  deve(et.some(t => /non lette/.test(t)), 'manca «non lette»: ' + JSON.stringify(et));
  const nl = vista.somma.find(s => /non lette/i.test(s.t || ''));
  deve(Number(nl.v) > 0, 'dice zero non lette con dodici garanzie mai nominate: ' + nl.v);
});

prova('con pochi documenti letti la schermata non proclama un vincitore', () => {
  deve(vista.astenuto, 'tre garanzie su quindici e nessun avviso: ' + vista.testo.slice(0, 200));
  deve(/troppo poco|set informativo/i.test(vista.astenuto), 'l\'avviso non dice perché: ' + vista.astenuto);
  deve(!vista.somma.some(s => s.vince), 'ha evidenziato un vincitore pur astenendosi');
});

prova('le garanzie fuori vocabolario si vedono anche a schermo', () => {
  deve(vista.fuori, 'il blocco «Fuori dal confronto» non c\'è');
  deve(/Garanzia Fantasia/.test(vista.testo), 'la garanzia sconosciuta non è a schermo');
});

prova('quando si è letto abbastanza, il vincitore si vede', async () => {
  const tutte = await p.evaluate(() => Confronto.VOCABOLARIO.auto.map(g => g.id));
  const v = await disegna(
    tutte.map(id => ({ id, stato: 'presente', massimale: 1000, documento: 'dip', edizione: '2026' })),
    tutte.map(id => ({ id, stato: 'presente', massimale: 500, documento: 'dip', edizione: '2026' })));
  deve(!v.astenuto, 'si astiene pur avendo letto tutto: ' + v.astenuto);
  const vinc = v.somma.filter(s => s.vince);
  deve(vinc.length === 1 && /HDI/.test(vinc[0].t), 'non evidenzia il vincitore giusto: ' + JSON.stringify(vinc));
});

// ── 3. il vuoto, che è la condizione di oggi ─────────────────────────────────

prova('con l\'archivio vuoto la schermata spiega, invece di sembrare rotta', async () => {
  const t = await p.evaluate(() => {
    window.CF_PRODOTTI = []; window.CF_ERRORE = null;
    cfRami();
    return document.getElementById('cf-stato').textContent;
  });
  deve(/non c'è ancora nessun prodotto/i.test(t), 'non dice che l\'archivio è vuoto: ' + t);
  deve(/non si inventa/i.test(t), 'non dice che non inventa niente: ' + t);
});

prova('un guasto di lettura non si confonde con un archivio vuoto', async () => {
  /* «Non si è potuto leggere» e «non ce n'è» sono due risposte diverse: la
     prima manda a cercare il guasto, la seconda a caricare i documenti. */
  const t = await p.evaluate(() => {
    window.CF_PRODOTTI = []; window.CF_ERRORE = 'connessione interrotta';
    cfRami();
    return document.getElementById('cf-stato').textContent;
  });
  deve(/non si è potuto leggere/i.test(t), 'non dichiara il guasto: ' + t);
  deve(/non vuol dire che sia vuoto/i.test(t), 'confonde il guasto col vuoto: ' + t);
});

prova('aprendo IAM non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nCONFRONTA — la schermata, in un browser vero');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nCONFRONTA NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
