/* ═══════════════════════════════════════════════════════════════════════════════
   LINK DI PAGAMENTO: LA SCHERMATA                             (06/10/2026)

   Il motore ha le sue 10 prove e 17 guasti presi, la funzione sul server le
   sue 12 e 18. Nessuna delle due dice che la SCHERMATA usi il motore: e qui
   l'unica cosa che conta è proprio quella, perché l'importo lo scrive una
   persona guardando questa pagina, e il link che esce va a un cliente.

   LE DUE COSE CHE QUESTE PROVE DIFENDONO:

   1. Un importo ambiguo NON ESCE DALLA PAGINA. Non «esce e viene rifiutato
      dal server»: non parte nessuna chiamata. Prima partiva, e il server lo
      leggeva come migliaia — «170.00» chiesto a un cliente come 17.000,00 €.

   2. La pagina non promette una conferma che non arriva. La frase «quando
      paga, qui il pagamento passa a pagato» era falsa: non esiste nessun
      webhook. Una promessa falsa è peggio del silenzio, perché chi la legge
      smette di controllare su Stripe.

       node server/verifica/pagamenti-nel-browser.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
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

/* Fa girare la funzione DI PRODUZIONE `pagCreaLink`, con al posto della rete e
   della sessione due tappi. Si registra tutto quello che la pagina ha provato
   a mandare: è quello, e non il messaggio a schermo, la cosa da misurare.

   I tappi si rimettono sempre a posto: lasciarne uno attaccato farebbe passare
   la prova dopo per il motivo sbagliato. */
async function generaLink({ importo, causale = '', cliente = '', conferme = [true, true], url = 'https://buy.stripe.com/abc123' }) {
  return p.evaluate(async ({ importo, causale, cliente, conferme, url }) => {
    const veroConfirm = window.confirm, veroFetch = window.fetch;
    window.__vero = db;
    const visto = { domande: [], mandato: [], chiamate: 0 };
    try {
      document.getElementById('pg-importo').value = importo;
      document.getElementById('pg-causale').value = causale;
      document.getElementById('pg-cliente').value = cliente;

      let i = 0;
      window.confirm = (t) => { visto.domande.push(String(t)); return conferme[i++] !== false; };
      window.__finto = { auth: { getSession: async () => ({ data: { session: { access_token: 'token-finto' } } }) },
        from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) };
      (0, eval)('db = window.__finto');
      window.fetch = async (u, opz) => {
        visto.chiamate++;
        visto.mandato.push({ url: String(u), corpo: JSON.parse((opz && opz.body) || '{}') });
        return new Response(JSON.stringify({ success: true, id: 'pag-1', url: url }),
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      };

      await pagCreaLink();
      visto.esito = document.getElementById('pg-esito').textContent;
      visto.esitoHtml = document.getElementById('pg-esito').innerHTML;
      return visto;
    } finally {
      window.confirm = veroConfirm; window.fetch = veroFetch;
      (0, eval)('db = window.__vero');
    }
  }, { importo, causale, cliente, conferme, url });
}

// ═══════════════════════════════════════════════════════════════════════════════
prova('IL MOTORE DEGLI IMPORTI È CARICATO NELLA PAGINA', async () => {
  const c = await p.evaluate(() => (window.Importo && window.Importo.VERSIONE) || null);
  deve(c, 'window.Importo non esiste: la schermata non ha nessuna regola da usare');
  /* e il contrassegno nella pagina non deve restare indietro: se il browser
     riusa il motore vecchio, la schermata chiama una funzione che non c'è. */
  const html = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
  deve(/importo\.js\?v=\d{8}/.test(html), 'il motore degli importi è caricato senza contrassegno di versione');
});

prova('UN IMPORTO AMBIGUO NON ESCE DALLA PAGINA', async () => {
  /* La cosa misurata non è il messaggio: è che non parta NIENTE. */
  for (const scritto of ['170.00', '150.50', '1.500', '', 'abc', '0', '170,005']) {
    const v = await generaLink({ importo: scritto });
    deve(v.chiamate === 0, 'con «' + scritto + '» la pagina ha chiamato il server: ' + JSON.stringify(v.mandato));
    deve(v.domande.length === 0, 'con «' + scritto + '» ha anche chiesto conferma: ' + v.domande[0]);
    deve(v.esito && v.esito.length > 10, 'con «' + scritto + '» non ha spiegato niente: «' + v.esito + '»');
  }
  /* e il motivo è quello del motore, non un «importo non valido» qualunque */
  const v = await generaLink({ importo: '150.50' });
  deve(v.esito.indexOf('15.050,00 €') >= 0 && v.esito.indexOf('150,50 €') >= 0,
    'non fa vedere le due letture: «' + v.esito + '»');
});

prova('SI CONFERMA LEGGENDO L\'IMPORTO IN EURO, E SE ANNULLI NON PARTE NIENTE', async () => {
  const v = await generaLink({ importo: '170,00', cliente: 'Mario Rossi', causale: 'RC Auto', conferme: [false] });
  deve(v.domande.length === 1, 'non ha chiesto conferma: ' + JSON.stringify(v.domande));
  deve(v.domande[0].indexOf('170,00 €') >= 0, 'la conferma non dice l\'importo in euro: ' + v.domande[0]);
  deve(v.domande[0].indexOf('Mario Rossi') >= 0, 'la conferma non dice a chi: ' + v.domande[0]);
  deve(v.chiamate === 0, 'ha generato il link anche dopo un «annulla»: ' + JSON.stringify(v.mandato));
});

prova('AL SERVER ARRIVANO I CENTESIMI, E ANCHE LA FORMA SENZA PUNTI', async () => {
  const v = await generaLink({ importo: '1.500,00', cliente: 'Mario Rossi', causale: 'Casa' });
  deve(v.chiamate === 1, 'ha chiamato ' + v.chiamate + ' volte');
  const c = v.mandato[0].corpo;
  deve(c.importo_cents === 150000, 'manda importo_cents=' + c.importo_cents + ' invece di 150000');
  deve(c.importo === '1500,00', 'manda importo=«' + c.importo + '» invece di «1500,00»');
  deve(String(c.importo).indexOf('.') < 0,
    'manda una forma che contiene un punto: la funzione installata la leggerebbe come migliaia');
  deve(v.mandato[0].url.indexOf('/functions/v1/stripe/link') >= 0, 'chiama ' + v.mandato[0].url);
});

prova('SOPRA DIECIMILA EURO LA DOMANDA SI FA DUE VOLTE', async () => {
  const su = await generaLink({ importo: '17000', cliente: 'Mario Rossi' });
  deve(su.domande.length === 2, 'per 17.000,00 € ha chiesto ' + su.domande.length + ' volta/e');
  deve(su.domande[1].indexOf('17.000,00 €') >= 0, 'la seconda domanda non dice l\'importo: ' + su.domande[1]);
  deve(su.domande[0] !== su.domande[1], 'le due domande sono la stessa frase');

  const sotto = await generaLink({ importo: '9999,99', cliente: 'Mario Rossi' });
  deve(sotto.domande.length === 1, 'per 9.999,99 € ha chiesto ' + sotto.domande.length + ' volte');

  /* e il secondo «annulla» ferma tutto */
  const fermato = await generaLink({ importo: '17000', conferme: [true, false] });
  deve(fermato.chiamate === 0, 'ha generato il link dopo il secondo «annulla»');
});

prova('UN LINK DI PROVA SI DICHIARA, INVECE DI SEMBRARE BUONO', async () => {
  /* La chiave Stripe installata il 06/10/2026 era quella di test: il link
     usciva `buy.stripe.com/test_…`, e mandarlo a un cliente non è un pagamento
     mancato — è l'agenzia che chiede soldi con una pagina marcata «TEST MODE». */
  const finto = await generaLink({ importo: '170,00', url: 'https://buy.stripe.com/test_7sY3abc' });
  deve(/prova/i.test(finto.esito), 'un link di test non viene dichiarato: «' + finto.esito + '»');
  deve(/non inviarlo/i.test(finto.esito), 'non dice di non inviarlo: «' + finto.esito + '»');

  const vero = await generaLink({ importo: '170,00', url: 'https://buy.stripe.com/7sY3abc' });
  deve(!/prova/i.test(vero.esito), 'un link vero viene dichiarato di prova: «' + vero.esito + '»');
  deve(vero.esito.indexOf('170,00 €') >= 0, 'l\'esito non ripete l\'importo: «' + vero.esito + '»');
});

prova('LA SCHERMATA NON PROMETTE UNA CONFERMA CHE NON ARRIVA', async () => {
  const t = await p.evaluate(() => {
    const pan = document.getElementById('panel-pagamenti');
    return pan ? pan.textContent.replace(/\s+/g, ' ') : null;
  });
  deve(t, 'il pannello dei pagamenti non c\'è');
  /* La frase falsa, parola per parola come stava scritta. */
  deve(t.indexOf('quando paga, qui il pagamento passa') < 0,
    'la schermata promette ancora che lo stato passa a «pagato» da solo');
  /* E al suo posto deve dire la verità: che non si aggiorna da solo. */
  deve(/non si aggiorna da solo|resta «In attesa»|non arriva ancora/i.test(t),
    'la schermata non dice che lo stato non si aggiorna da solo: ' + t.slice(0, 300));
  deve(/Stripe/.test(t), 'non dice dove si verifica l\'incasso');
});

prova('L\'ELENCO SCRIVE L\'IMPORTO CON LA REGOLA DEL MOTORE, NON CON UNA SUA', async () => {
  /* La prima versione di questa prova confrontava `pagEuro(c)` con
     `Importo.euro(c)` su qualche cifra. Era VACUA: in Chromium la vecchia
     formattazione con toLocaleString dà lo stesso risultato, quindi
     rimetterla non faceva diventare rossa niente — un guasto della
     controprova non veniva preso, ed è stato lui a dirlo.

     Quello che si può misurare è la cosa che conta davvero: che l'elenco PASSI
     DAL MOTORE invece di avere una formattazione sua. Si sostituisce
     `Importo.euro` con una funzione riconoscibile e si guarda se l'elenco la
     usa. Due formattazioni che oggi coincidono si separano al primo
     cambiamento di una delle due, e a quel punto l'operatore confermerebbe
     una cifra e ne rileggerebbe un'altra. */
  const passa = await p.evaluate(() => {
    const vero = Importo.euro;
    try {
      Importo.euro = () => 'SEGNO-DEL-MOTORE';
      return pagEuro(17000) === 'SEGNO-DEL-MOTORE';
    } finally { Importo.euro = vero; }
  });
  deve(passa, 'l\'elenco ha una formattazione sua: non passa da Importo.euro');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nLINK DI PAGAMENTO NEL BROWSER');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
if (banco.errori.length) console.log('\nerrori di pagina: ' + banco.errori.slice(0, 3).join(' | '));
await banco.chiudi();
console.log('\nPAGAMENTI NEL BROWSER: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
