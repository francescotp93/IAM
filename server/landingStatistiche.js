// Quante volte si apre una landing, e che cosa ne viene fuori (09/10/2026).
//
// «C'è un modo per capire quanti click riceve il link della landing page?» —
// Francesco. Non c'era: la landing sta su GitHub Pages, che non dà statistiche,
// e il server contava solo chi lasciava i suoi dati (lead) o comprava.
//
// La pagina, aprendosi, manda qui un evento; il server lo scrive in
// `iam_landing_eventi`. Cinque eventi, che sono l'imbuto di una landing:
//   visita → calcolo del premio → richiesta di preventivo → checkout → acquisto
//
// Le tre regole che lo tengono fuori dal consenso cookie, e vanno rispettate:
//   1. NIENTE COOKIE e niente memoria nel browser: la pagina non scrive niente.
//   2. NIENTE INDIRIZZO IP salvato. Per contare le persone (non le aperture)
//      il server calcola un'impronta di IP + browser con una chiave che CAMBIA
//      OGNI GIORNO: la stessa persona domani è un'altra impronta, e
//      dall'impronta non si torna all'IP. Si conta «visitatori unici al giorno».
//   3. NIENTE DATI DI PERSONE: prodotto, canale, campagna. Il nome e l'email di
//      chi chiede un preventivo stanno nel lead, non qui.
import { Router } from 'express';
import crypto from 'node:crypto';
import { limitaPerIndirizzo, ipDi } from './limitatore.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ekjxrnsfqxnfxzrthdcf.supabase.co').replace(/\/$/, '');

export const EVENTI = ['visita', 'calcolo', 'richiesta', 'checkout', 'acquisto'];

/* Un'anteprima di link (WhatsApp, Facebook, Telegram…) o un motore di ricerca
   non è una persona che apre la pagina. In genere non eseguono la pagina, ma
   quelli che lo fanno si fermano qui. */
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|curl|wget|python|axios/i;

/* Un'etichetta (prodotto, canale, campagna) entra solo in forma di sigla:
   minuscole, cifre e trattini, fino a 40 caratteri. Così nella tabella non
   finisce un testo libero — e quindi nemmeno, per sbaglio, un nome o un'email
   incollati in un link. */
export function sigla(v) {
  const s = String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  if (!s) return null;
  if (/@/.test(String(v)) || /\d{6,}/.test(s)) return null;   // un'email o un numero di telefono non sono una campagna
  return s;
}

/* Il giorno in Italia, non in UTC: fra mezzanotte e le due il giorno UTC è
   ancora ieri, e un evento finirebbe nel giorno sbagliato (§44). */
export function giornoItalia(d = new Date()) {
  const p = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = k => p.find(x => x.type === k).value;
  return g('year') + '-' + g('month') + '-' + g('day');
}

function chiave() {
  const k = process.env.LANDING_SEGRETO || process.env.OTP_SEGRETO || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('Manca la chiave del contatore delle landing.');
  return k;
}

/* L'impronta del visitatore: la chiave del GIORNO (derivata dalla chiave del
   server e dalla data) firma IP + browser. Di questa si salvano 16 caratteri. */
export function visitatore(ip, ua, giorno, segreto = chiave()) {
  const delGiorno = crypto.createHmac('sha256', segreto).update('landing:' + giorno).digest();
  return crypto.createHmac('sha256', delGiorno).update(String(ip) + '|' + String(ua || '')).digest('hex').slice(0, 16);
}

/* Da quello che manda la pagina alla riga da scrivere. Torna { riga } oppure
   { scarta: motivo }: un evento scartato non è un errore per chi visita, la
   pagina non deve accorgersene. */
export function rigaEvento(corpo, { ip, ua, adesso = new Date(), segreto } = {}) {
  const c = corpo && typeof corpo === 'object' ? corpo : {};
  if (ROBOT.test(String(ua || ''))) return { scarta: 'robot' };
  const evento = String(c.evento || '');
  if (!EVENTI.includes(evento)) return { scarta: 'evento sconosciuto' };
  const prodotto = sigla(c.prodotto);
  if (!prodotto) return { scarta: 'prodotto mancante' };
  const giorno = giornoItalia(adesso);
  return {
    riga: {
      giorno, evento, prodotto,
      canale: sigla(c.canale) || 'diretto',
      campagna: sigla(c.campagna),
      visitatore: visitatore(ip, ua, giorno, segreto),
    },
  };
}

async function scriviSupabase(riga) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/iam_landing_eventi`, {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(riga),
  });
  if (!r.ok) throw new Error('Supabase: HTTP ' + r.status);
}

/* La pagina manda il corpo come testo semplice (fetch keepalive): è una
   richiesta «semplice», senza il passaggio preliminare del browser, e arriva
   anche se chi la apre chiude subito la scheda. */
function leggiCorpo(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse(String(req.body || '')); } catch (_) { return {}; }
}

export function landingRouter({ scrivi = scriviSupabase } = {}) {
  const r = Router();
  /* Una pagina manda al massimo cinque eventi: sessanta in dieci minuti dallo
     stesso indirizzo vogliono dire qualcuno che gonfia i numeri. */
  const tetto = limitaPerIndirizzo({ max: 60, finestraMs: 10 * 60 * 1000 });
  r.post('/evento', tetto, async (req, res) => {
    let esito;
    try { esito = rigaEvento(leggiCorpo(req), { ip: ipDi(req), ua: req.headers['user-agent'] }); }
    catch (e) { console.warn('[landing] evento:', e.message); return res.status(204).end(); }
    if (esito.scarta) return res.status(204).end();
    try { await scrivi(esito.riga); }
    catch (e) { console.warn('[landing] scrittura:', e.message); }
    /* Sempre 204: chi visita non deve mai vedere un errore per un contatore. */
    res.status(204).end();
  });
  return r;
}
