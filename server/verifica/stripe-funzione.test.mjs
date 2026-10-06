/* ═══════════════════════════════════════════════════════════════════════════════
   LA FUNZIONE «stripe»: IL LATO SERVER DEI LINK DI PAGAMENTO  (06/10/2026)

   Fino al 06/10/2026 questo codice non stava nel repository: girava su Supabase
   e nessuna prova lo guardava. Queste prove non lo leggono con delle
   espressioni: lo ESEGUONO. Il modulo si importa con `Deno` finto, si cattura
   la funzione che risponde alle richieste, e si chiama davvero — con una rete
   finta al posto di Supabase e di Stripe.

   La differenza non è accademica. Una prova che cerca la parola «importo_cents»
   nel file passa anche se quel campo si legge e poi si butta. Una prova che
   chiama la funzione con «170.00» e guarda se Stripe è stato chiamato misura la
   cosa vera: che un importo ambiguo non arriva a diventare una richiesta di
   pagamento a un cliente.

   Nessuna chiave vera, nessuna chiamata vera: `sk_test_finta` è una stringa.

       node server/verifica/stripe-funzione.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const FN = path.join(RADICE, 'supabase', 'functions', 'stripe', 'index.ts');
const MOTORE = path.join(RADICE, 'tariffe', 'motore', 'importo.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const SORGENTE = fs.readFileSync(FN, 'utf8');

/* ── la rete finta ───────────────────────────────────────────────────────────
   Registra ogni chiamata e risponde come risponderebbero Supabase e Stripe.
   Quello che si misura, alla fine, è proprio l'elenco delle chiamate: se Stripe
   non è stato chiamato, nessun link è nato. */
let CHIAMATE = [];
let RIGA = null;      /* la riga di iam_pagamenti che il finto archivio restituisce */
let UTENTE = null;

function rispondi(corpo, stato = 200) {
  return Promise.resolve(new Response(JSON.stringify(corpo), {
    status: stato, headers: { 'Content-Type': 'application/json' },
  }));
}

async function reteFinta(url, opz) {
  const u = String(url);
  const metodo = (opz && opz.method) || 'GET';
  let corpo = null;
  try { corpo = opz && opz.body ? JSON.parse(opz.body) : null; } catch (_) { corpo = String(opz.body); }
  CHIAMATE.push({ url: u, metodo, corpo, grezzo: (opz && opz.body) || null });

  if (u.indexOf('/rest/v1/iam_utenti') >= 0) return rispondi(UTENTE ? [UTENTE] : []);
  if (u.indexOf('/rest/v1/iam_pagamenti') >= 0 && metodo === 'POST') return rispondi([{ id: 'pag-1' }]);
  if (u.indexOf('/rest/v1/iam_pagamenti') >= 0 && metodo === 'GET') return rispondi(RIGA ? [RIGA] : []);
  if (u.indexOf('/rest/v1/iam_pagamenti') >= 0) return rispondi({});
  if (u.indexOf('api.stripe.com/v1/prices') >= 0) return rispondi({ id: 'price_finto' });
  if (u.indexOf('api.stripe.com/v1/payment_links') >= 0) {
    return rispondi({ id: 'plink_finto', url: 'https://buy.stripe.com/test_finto' });
  }
  return rispondi({});
}

/* ── il modulo, importato con Deno finto ─────────────────────────────────────
   La riga `import "jsr:…"` serve solo ai tipi di Deno e in Node non si
   risolve: si toglie dalla copia. Il resto del file è esattamente quello che
   girerebbe su Supabase. */
let MANO = null;   /* la funzione passata a Deno.serve */
const AMBIENTE = {
  SUPABASE_URL: 'https://finto.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'chiave-di-servizio-finta',
  STRIPE_SECRET_KEY: 'sk_test_finta',
};
globalThis.Deno = { env: { get: (k) => AMBIENTE[k] || '' }, serve: (h) => { MANO = h; } };
globalThis.fetch = reteFinta;

const copia = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-fn-')), 'index.ts');
fs.writeFileSync(copia, SORGENTE.replace(/^import "jsr:[^\n]*\n/m, ''));
await import('file://' + copia);
if (typeof MANO !== 'function') {
  console.log('\nLA FUNZIONE «stripe» NON SI È FATTA CHIAMARE: Deno.serve non è stato invocato.');
  process.exit(1);
}

/* Un token come quello che manda il browser: la funzione legge `sub` dal pezzo
   di mezzo e poi va a vedere in tabella chi è. La firma non la verifica lei —
   l'ha già verificata Supabase (verify_jwt). */
function token(sub) {
  const mezzo = Buffer.from(JSON.stringify({ sub })).toString('base64url');
  return 'finto.' + mezzo + '.firma';
}

async function chiama(rotta, corpo, { sub = 'utente-1', origine = 'https://iam.withusassicurazioni.it', metodo = 'POST' } = {}) {
  CHIAMATE = [];
  const req = new Request('https://finto.supabase.co/stripe' + rotta, {
    method: metodo,
    headers: {
      'Authorization': 'Bearer ' + token(sub),
      'Content-Type': 'application/json',
      'Origin': origine,
    },
    body: metodo === 'POST' ? JSON.stringify(corpo || {}) : undefined,
  });
  const res = await MANO(req);
  let letto = null; try { letto = await res.clone().json(); } catch (_) {}
  return { stato: res.status, corpo: letto, res, chiamate: CHIAMATE.slice() };
}

const UTENTE_NORMALE = { id: 'utente-1', email: 'operatore@withus.it', ruolo: 'master', attivo: true, accesso_iam: true };
const verso = (ch, pezzo) => ch.filter((c) => c.url.indexOf(pezzo) >= 0);

// ═══════════════════════════════════════════════════════════════════════════════
prova('IL GUASTO DEL 06/10/2026: UN IMPORTO IN EURO NON ARRIVA PIÙ A STRIPE', () => {
  /* La versione 2 prendeva `importo` e lo leggeva togliendo i punti: «170.00»
     diventava 17.000,00 €. Una pagina vecchia rimasta aperta manda ancora solo
     quel campo, e la cosa che conta non è il messaggio di errore — è che
     Stripe NON venga chiamato e nessuna riga venga scritta. */
  UTENTE = UTENTE_NORMALE;
  return (async () => {
    for (const valore of ['170.00', '150.50', '1.500', '170,00', 170]) {
      const r = await chiama('/link', { importo: valore, descrizione: 'RC Auto' });
      deve(r.stato === 400, 'con importo=«' + valore + '» risponde ' + r.stato + ' invece di 400');
      deve(verso(r.chiamate, 'api.stripe.com').length === 0,
        'con importo=«' + valore + '» ha chiamato Stripe: ' + JSON.stringify(verso(r.chiamate, 'api.stripe.com')));
      deve(verso(r.chiamate, '/rest/v1/iam_pagamenti').length === 0,
        'con importo=«' + valore + '» ha scritto in archivio');
    }
    /* E il messaggio deve dire la cosa che l'operatore può FARE. Una pagina
       rimasta aperta da ieri manda solo `importo`: dirgli «l'importo va in
       centesimi interi» lo manda a riscrivere la cifra per sempre, perché il
       problema non è la cifra — è la pagina. (Questa riga è nata da un guasto
       della controprova che non veniva preso: togliere quella guardia non
       rompeva niente, perché nessuno misurava il messaggio.) */
    const vecchia = await chiama('/link', { importo: '170,00' });
    deve(/ricaric/i.test(String(vecchia.corpo && vecchia.corpo.message)),
      'a una pagina vecchia non dice di ricaricarsi: ' + JSON.stringify(vecchia.corpo));
  })();
});

prova('I CENTESIMI ARRIVANO A STRIPE ESATTAMENTE COME SONO PARTITI', async () => {
  UTENTE = UTENTE_NORMALE;
  const r = await chiama('/link', { importo_cents: 17000, importo: '170,00', descrizione: 'RC Auto — Rossi', cliente: 'Mario Rossi' });
  deve(r.stato === 200, 'risponde ' + r.stato + ': ' + JSON.stringify(r.corpo));

  const prezzo = verso(r.chiamate, 'api.stripe.com/v1/prices')[0];
  deve(prezzo, 'non ha creato il prezzo su Stripe');
  const form = new URLSearchParams(String(prezzo.grezzo));
  deve(form.get('unit_amount') === '17000',
    'a Stripe è arrivato unit_amount=' + form.get('unit_amount') + ' invece di 17000');
  deve(form.get('currency') === 'eur', 'la valuta non è eur: ' + form.get('currency'));

  const scritta = verso(r.chiamate, '/rest/v1/iam_pagamenti').find((c) => c.metodo === 'POST');
  deve(scritta && scritta.corpo.importo_cents === 17000,
    'in archivio è finito ' + (scritta && scritta.corpo.importo_cents) + ' invece di 17000');
  deve(r.corpo.importo_cents === 17000, 'alla pagina torna ' + r.corpo.importo_cents);
});

prova('UN IMPORTO CHE NON È UN INTERO DI CENTESIMI SI RIFIUTA', async () => {
  UTENTE = UTENTE_NORMALE;
  const brutti = [170.5, '17000', 0, -100, null, NaN, Infinity, 1e9 + 1, {}, true];
  for (const v of brutti) {
    const r = await chiama('/link', { importo_cents: v });
    deve(r.stato === 400, 'con importo_cents=' + JSON.stringify(v) + ' risponde ' + r.stato + ' invece di 400');
    deve(verso(r.chiamate, 'api.stripe.com').length === 0,
      'con importo_cents=' + JSON.stringify(v) + ' ha chiamato Stripe');
  }
});

prova('IL TETTO DELLA FUNZIONE È LO STESSO DEL MOTORE NEL BROWSER', async () => {
  /* Due tetti diversi vorrebbero dire che la pagina lascia scrivere un importo
     che il server poi rifiuta (o il contrario): l'operatore vedrebbe un errore
     che non sa da dove viene. Si leggono i due file e si confrontano. */
  const motore = fs.readFileSync(MOTORE, 'utf8');
  const nelMotore = motore.match(/TETTO_CENTS\s*=\s*(\d+)/);
  const nellaFunzione = SORGENTE.match(/TETTO_CENTS\s*=\s*(\d+)/);
  deve(nelMotore, 'il motore non dichiara un tetto');
  deve(nellaFunzione, 'la funzione non dichiara un tetto');
  deve(nelMotore[1] === nellaFunzione[1],
    'il motore dice ' + nelMotore[1] + ' centesimi e la funzione ' + nellaFunzione[1]);

  /* E il tetto si applica per davvero, non è solo dichiarato. */
  UTENTE = UTENTE_NORMALE;
  const tetto = parseInt(nellaFunzione[1], 10);
  const dentro = await chiama('/link', { importo_cents: tetto });
  const fuori = await chiama('/link', { importo_cents: tetto + 1 });
  deve(dentro.stato === 200, 'il tetto esatto viene rifiutato: ' + JSON.stringify(dentro.corpo));
  deve(fuori.stato === 400, 'un centesimo sopra il tetto passa: ' + JSON.stringify(fuori.corpo));
});

prova('LA FUNZIONE NON SCRIVE MAI CHE UN PAGAMENTO È «pagato»', async () => {
  /* Chi ha pagato lo sa Stripe, non noi. Uno stato «pagato» scritto da qui
     sarebbe un incasso inventato — e un incasso inventato in contabilità è
     peggio di un incasso mancante, perché nessuno lo va a cercare. */
  UTENTE = UTENTE_NORMALE;
  const giri = [
    await chiama('/link', { importo_cents: 17000 }),
    await chiama('/link', { importo: '170,00' }),
  ];
  RIGA = { id: 'pag-1', creato_da: 'utente-1', stato: 'creato', stripe_id: 'plink_finto' };
  giri.push(await chiama('/elimina', { id: 'pag-1' }));

  giri.forEach((g, i) => g.chiamate.forEach((c) => {
    if (c.url.indexOf('/rest/v1/iam_pagamenti') < 0) return;
    const scritto = JSON.stringify(c.corpo || '');
    deve(scritto.indexOf('pagato') < 0,
      'al giro ' + i + ' la funzione ha scritto uno stato «pagato»: ' + scritto);
  }));
  /* e nel codice non esiste nessun posto che lo scriva */
  deve(!/stato:\s*["']pagato["']/.test(SORGENTE), 'nel codice c\'è una scrittura di stato «pagato»');
  deve(!/"stato"\s*:\s*"pagato"/.test(SORGENTE), 'nel codice c\'è una scrittura di stato «pagato»');
});

prova('UN PAGAMENTO GIÀ INCASSATO NON SI CANCELLA', async () => {
  UTENTE = UTENTE_NORMALE;
  RIGA = { id: 'pag-1', creato_da: 'utente-1', stato: 'pagato', stripe_id: 'plink_finto' };
  const r = await chiama('/elimina', { id: 'pag-1' });
  deve(r.stato === 400, 'risponde ' + r.stato + ' invece di 400');
  deve(r.chiamate.filter((c) => c.metodo === 'DELETE').length === 0, 'ha cancellato la riga comunque');
  deve(verso(r.chiamate, 'api.stripe.com').length === 0, 'ha toccato Stripe comunque');
});

prova('UN LINK DI UN ALTRO NON SI CANCELLA, SE NON SEI IL CAPO', async () => {
  RIGA = { id: 'pag-1', creato_da: 'un-altro', stato: 'creato', stripe_id: 'plink_finto' };
  UTENTE = UTENTE_NORMALE;
  const no = await chiama('/elimina', { id: 'pag-1' });
  deve(no.stato === 403, 'un operativo cancella il link di un altro: ' + no.stato);
  deve(no.chiamate.filter((c) => c.metodo === 'DELETE').length === 0, 'ha cancellato comunque');

  UTENTE = { ...UTENTE_NORMALE, ruolo: 'top_master' };
  const si = await chiama('/elimina', { id: 'pag-1' });
  deve(si.stato === 200, 'il top_master non riesce a cancellare: ' + JSON.stringify(si.corpo));
  deve(si.chiamate.filter((c) => c.metodo === 'DELETE').length === 1, 'non ha cancellato la riga');
  /* e il link va disattivato su Stripe, altrimenti resta pagabile a chi ce l'ha */
  const disattiva = verso(si.chiamate, 'api.stripe.com/v1/payment_links/plink_finto')[0];
  deve(disattiva && String(disattiva.grezzo).indexOf('active=false') >= 0,
    'il link non è stato disattivato su Stripe: ' + JSON.stringify(disattiva));
});

prova('UNA SESSIONE DI UN UTENTE SPENTO NON CREA NIENTE', async () => {
  for (const chi of [null, { ...UTENTE_NORMALE, attivo: false }, { ...UTENTE_NORMALE, accesso_iam: false }]) {
    UTENTE = chi;
    const r = await chiama('/link', { importo_cents: 17000 });
    deve(r.stato === 401, 'con utente ' + JSON.stringify(chi) + ' risponde ' + r.stato + ' invece di 401');
    deve(verso(r.chiamate, 'api.stripe.com').length === 0, 'ha chiamato Stripe comunque');
  }
});

prova('LE INTESTAZIONI CORS NON DICONO «QUALUNQUE ORIGINE»', async () => {
  /* Con verify_jwt davanti "*" non è un buco aperto, ma vuol dire che
     qualunque pagina aperta nel browser dell'operatore può provarci con la sua
     sessione. L'elenco costa una riga. */
  UTENTE = UTENTE_NORMALE;
  const r = await chiama('/link', { importo_cents: 17000 });
  const dove = r.res.headers.get('access-control-allow-origin');
  deve(dove !== '*', 'risponde ancora Access-Control-Allow-Origin: *');
  deve(dove === 'https://iam.withusassicurazioni.it', 'non rimanda l\'origine di IAM: ' + dove);

  const estranea = await chiama('/link', { importo_cents: 17000 }, { origine: 'https://sito-di-un-altro.it' });
  deve(estranea.res.headers.get('access-control-allow-origin') !== 'https://sito-di-un-altro.it',
    'accetta un\'origine che non è dell\'agenzia');
  deve(r.res.headers.get('vary') === 'Origin',
    'manca Vary: Origin — un proxy servirebbe a tutti le intestazioni del primo che ha chiesto');
});

prova('UNA ROTTA CHE NON ESISTE RISPONDE 404 E NON FA NIENTE', async () => {
  UTENTE = UTENTE_NORMALE;
  const r = await chiama('/incassa', { importo_cents: 17000 });
  deve(r.stato === 404, 'risponde ' + r.stato + ' invece di 404');
  deve(verso(r.chiamate, 'api.stripe.com').length === 0, 'ha chiamato Stripe su una rotta che non esiste');
});

prova('NEL FILE NON C\'È NESSUNA CHIAVE, SOLO I NOMI DELLE VARIABILI', () => {
  deve(!/sk_live_|sk_test_[A-Za-z0-9]{10,}|rk_live_/.test(SORGENTE), 'nel file c\'è una chiave Stripe');
  deve(!/eyJ[A-Za-z0-9_-]{20,}\./.test(SORGENTE), 'nel file c\'è un token Supabase');
  deve(/Deno\.env\.get\("STRIPE_SECRET_KEY"\)/.test(SORGENTE), 'la chiave non si legge dai secret');
});

prova('IL FILE DICE CHE NON È QUELLO INSTALLATO', () => {
  /* Un file nel repository diverso da quello che gira è una bugia silenziosa.
     Finché le due versioni non combaciano, il file lo deve scrivere in testa.
     Quando si installerà, questa prova va cambiata — ed è giusto che obblighi
     a passare di qui. */
  const testa = SORGENTE.slice(0, 2000);
  deve(/NON E' QUELLO INSTALLATO|NON È QUELLO INSTALLATO/.test(testa),
    'il file non dichiara che la versione installata è un\'altra');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nFUNZIONE STRIPE — il lato server dei link di pagamento');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
console.log('\nFUNZIONE STRIPE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
