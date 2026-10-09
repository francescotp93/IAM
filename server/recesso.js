// ═══════════════════════════════════════════════════════════════════════════════
//  RECESSO ONLINE — le polizze acquistate a distanza (09/10/2026)
//
//  Le condizioni HDI (es. Rischi Catastrofali, P5821 art. 2.15) prevedono che
//  per le polizze concluse online il contraente possa recedere «con l'apposita
//  funzione disponibile sulla piattaforma online dell'Intermediario», entro 14
//  giorni dalla conclusione o dalla ricezione dei documenti se successiva
//  (D.Lgs. 206/2005 art. 67-duodecies). Questa è quella funzione.
//
//  Tre passi, tutti pubblici e senza account:
//   1. POST /recesso/avvia     {cf, email}        → codice OTP all'email della polizza
//   2. POST /recesso/verifica  {token, otp}        → le polizze online di quel cliente
//   3. POST /recesso/conferma  {token, id, motivo} → recesso registrato, ricevute
//
//  Regole:
//   · la risposta del passo 1 è la stessa che la polizza esista o no: dire
//     «non c'è» a chi prova codici fiscali a caso racconta chi è nostro cliente;
//   · l'email a cui arriva il codice è quella SCRITTA SULLA POLIZZA, non quella
//     che si digita: altrimenti chiunque conosca un codice fiscale recede per
//     un altro;
//   · fuori termine la richiesta si registra lo stesso, marcata: la valuta
//     l'agenzia (la data di ricezione dei documenti può spostare il termine).
//     Rifiutarla qui vorrebbe dire decidere al posto di una persona;
//   · il recesso non si annulla da qui e non si registra due volte.
// ═══════════════════════════════════════════════════════════════════════════════
import { Router } from 'express';
import crypto from 'node:crypto';
import { sbGet, sbPatch, sendEmail, shell, genOtp, genToken } from './sign.js';
import { improntaOtp, otpGiusto } from './otpImpronta.js';
import { limitaPerIndirizzo } from './limitatore.js';

const STAFF_INBOX = process.env.STAFF_EMAIL || 'intermediari@withusassicurazioni.it';
const OTP_TTL_MIN = 10;
const SESSIONE_MIN = 30;
const MAX_TENTATIVI = 5;
export const GIORNI_RECESSO = 14;

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const norm = (s) => String(s || '').trim().toUpperCase();
const normEmail = (s) => String(s || '').trim().toLowerCase();

/* La data da cui contano i 14 giorni: la conclusione del contratto, cioè
   l'ultimo dei fatti che la compongono (pagamento, firma della documentazione).
   Si conta sui giorni di calendario. Pura, per poterla provare. */
export function termineRecesso(prev, adesso) {
  const d = (prev && prev.dati) || {};
  const date = [d.pagamento && d.pagamento.data, d.firma && d.firma.firmato_il, prev && prev.creato_il]
    .map((x) => (x ? Date.parse(x) : NaN)).filter((x) => !Number.isNaN(x));
  if (!date.length) return null;
  const base = new Date(Math.max(...date));
  const fine = new Date(base.getTime() + GIORNI_RECESSO * 86400000);
  const ora = adesso ? new Date(adesso) : new Date();
  return { conclusione: base.toISOString(), termine: fine.toISOString(), entro_termine: ora.getTime() <= fine.getTime() };
}

/* Una polizza dello shop vista dal cliente: niente dati di altri, niente
   identificativi interni oltre all'id che gli serve per scegliere. */
export function vistaCliente(prev, adesso) {
  const d = prev.dati || {};
  const t = termineRecesso(prev, adesso);
  return {
    id: prev.id, prodotto: prev.prodotto, premio: prev.premio,
    pagamento: d.pagamento ? (d.pagamento.stato || null) : null,
    conclusione: t && t.conclusione, termine: t && t.termine, entro_termine: !!(t && t.entro_termine),
    recesso: d.recesso ? { stato: d.recesso.stato, richiesto_il: d.recesso.richiesto_il, ricevuta: d.recesso.ricevuta } : null,
  };
}

async function polizzeDi(cf) {
  const rows = await sbGet(`quote_preventivi?modulo=eq.shop&dati->contatto->>cf=eq.${encodeURIComponent(cf)}&select=id,prodotto,premio,creato_il,dati&order=creato_il.desc&limit=50`);
  return Array.isArray(rows) ? rows : [];
}
async function scriviDati(id, dati) {
  return sbPatch(`quote_preventivi?id=eq.${encodeURIComponent(id)}`, { dati });
}
async function perToken(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token || ''))) return [];
  const rows = await sbGet(`quote_preventivi?modulo=eq.shop&dati->recesso_accesso->>token=eq.${encodeURIComponent(token)}&select=id,prodotto,premio,creato_il,dati`);
  return Array.isArray(rows) ? rows : [];
}

export const recessoRouter = Router();

/* Ogni chiamata manda un'email: il tetto è stretto, perché senza diventerebbe
   un modo per riempire di codici la casella di qualcun altro. */
const tettoAvvia = limitaPerIndirizzo({ max: 8, finestraMs: 15 * 60 * 1000 });

recessoRouter.post('/avvia', tettoAvvia, async (req, res) => {
  const cf = norm(req.body && req.body.cf);
  const email = normEmail(req.body && req.body.email);
  const generica = { ok: true, messaggio: 'Se i dati corrispondono a una polizza acquistata online, ti abbiamo inviato un codice all\'indirizzo email indicato in polizza.' };
  if (!/^[A-Z0-9]{16}$/.test(cf) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Indica il codice fiscale (16 caratteri) e l\'email usati per l\'acquisto.' });
  const token = genToken();
  try {
    const mie = (await polizzeDi(cf)).filter((p) => normEmail(p.dati && p.dati.contatto && p.dati.contatto.email) === email);
    if (mie.length) {
      const otp = genOtp();
      const accesso = { token, otp_hash: improntaOtp(otp, token), scadenza: new Date(Date.now() + OTP_TTL_MIN * 60000).toISOString(), tentativi: 0, verificato_il: null };
      for (const p of mie) await scriviDati(p.id, { ...(p.dati || {}), recesso_accesso: accesso });
      /* Si scrive all'indirizzo della POLIZZA, non a quello digitato: anche se
         un giorno il filtro sopra si allargasse, il codice non va altrove. */
      await sendEmail(mie[0].dati.contatto.email, 'Codice per il recesso online — With Us', shell('Recesso dalla polizza acquistata online',
        `<p>Hai chiesto di accedere alla funzione di recesso delle polizze acquistate online.</p>
         <p style="margin:18px 0 6px">Il tuo codice è:</p>
         <div style="font-size:30px;font-weight:900;letter-spacing:8px;color:#016b38;background:#eaf7f0;border-radius:12px;padding:14px;text-align:center">${otp}</div>
         <p style="color:#6b7488;font-size:13px">Valido ${OTP_TTL_MIN} minuti. Se non sei stato tu, ignora questo messaggio: senza il codice non succede niente.</p>`));
    }
  } catch (e) { console.warn('recesso/avvia:', e.message); }
  /* Stessa risposta e stesso token in tutti i casi (§ regole in testa). */
  res.json({ ...generica, token });
});

recessoRouter.post('/verifica', async (req, res) => {
  try {
    const { token, otp } = req.body || {};
    const righe = await perToken(token);
    const a = righe[0] && righe[0].dati && righe[0].dati.recesso_accesso;
    if (!a) return res.status(401).json({ error: 'Codice errato o scaduto: richiedine uno nuovo.' });
    if (Date.parse(a.scadenza) < Date.now()) return res.status(410).json({ error: 'Codice scaduto: richiedine uno nuovo.' });
    if ((a.tentativi || 0) >= MAX_TENTATIVI) return res.status(429).json({ error: 'Troppi tentativi sbagliati: richiedi un nuovo codice.' });
    if (!otpGiusto(otp, token, a.otp_hash)) {
      for (const p of righe) await scriviDati(p.id, { ...p.dati, recesso_accesso: { ...a, tentativi: (a.tentativi || 0) + 1 } });
      return res.status(401).json({ error: 'Codice errato.' });
    }
    const verificato = { ...a, verificato_il: new Date().toISOString(), scadenza: new Date(Date.now() + SESSIONE_MIN * 60000).toISOString() };
    delete verificato.otp_hash;
    for (const p of righe) await scriviDati(p.id, { ...p.dati, recesso_accesso: verificato });
    res.json({ ok: true, polizze: righe.map((p) => vistaCliente(p)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

recessoRouter.post('/conferma', async (req, res) => {
  try {
    const { token, id, motivo, dichiarazione } = req.body || {};
    if (dichiarazione !== true) return res.status(400).json({ error: 'Conferma di voler recedere dal contratto.' });
    const righe = await perToken(token);
    const p = righe.find((r) => String(r.id) === String(id));
    const a = p && p.dati && p.dati.recesso_accesso;
    if (!p || !a || !a.verificato_il) return res.status(401).json({ error: 'Sessione non valida: ricomincia dall\'inizio.' });
    if (Date.parse(a.scadenza) < Date.now()) return res.status(410).json({ error: 'Sessione scaduta: ricomincia dall\'inizio.' });
    if (p.dati.recesso) return res.json({ ok: true, gia: true, polizza: vistaCliente(p) });
    const t = termineRecesso(p);
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const richiesto_il = new Date().toISOString();
    const recesso = {
      stato: 'richiesto', canale: 'online', richiesto_il, ip,
      motivo: String(motivo || '').trim().slice(0, 500) || null,
      conclusione: t && t.conclusione, termine: t && t.termine, entro_termine: !!(t && t.entro_termine),
      ricevuta: 'REC-' + crypto.createHash('sha256').update(String(p.id) + richiesto_il).digest('hex').slice(0, 10).toUpperCase(),
    };
    const email = p.dati.contatto && p.dati.contatto.email;
    await scriviDati(p.id, { ...p.dati, recesso });
    const data = (x) => (x ? new Date(x).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }) : '—');
    const corpo = `<table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="color:#6b7488;padding:4px 0">Polizza</td><td><b>${esc(p.prodotto)}</b></td></tr>
        <tr><td style="color:#6b7488;padding:4px 0">Premio</td><td>€ ${Number(p.premio || 0).toFixed(2).replace('.', ',')}</td></tr>
        <tr><td style="color:#6b7488;padding:4px 0">Richiesta ricevuta il</td><td>${data(richiesto_il)}</td></tr>
        <tr><td style="color:#6b7488;padding:4px 0">Codice ricevuta</td><td><b>${esc(recesso.ricevuta)}</b></td></tr></table>`;
    try {
      await sendEmail(email, 'Ricevuta del recesso — With Us', shell('Abbiamo ricevuto il tuo recesso',
        `<p>Abbiamo registrato la tua richiesta di recesso dalla polizza acquistata online.</p>${corpo}
         <p style="font-size:13px;color:#3a4254">Inoltriamo il recesso alla compagnia. Il premio pagato ti viene rimborsato dalla compagnia entro 30 giorni dalla ricezione della comunicazione, come previsto dalle condizioni di assicurazione. Conserva questa email: è la ricevuta della tua richiesta.</p>
         ${recesso.entro_termine ? '' : '<p style="font-size:13px;color:#7a4b00">La richiesta è arrivata oltre i 14 giorni dalla conclusione: la verifichiamo e ti ricontattiamo (il termine decorre dalla ricezione dei documenti, se successiva).</p>'}`));
    } catch (e) { console.warn('recesso/ricevuta:', e.message); }
    try {
      await sendEmail(STAFF_INBOX, 'Recesso online da lavorare — ' + p.prodotto, shell('Recesso online richiesto',
        `<p>Un cliente ha esercitato il recesso dalla funzione online. Va inoltrato alla compagnia.</p>${corpo}
         <p>Cliente: ${esc(((p.dati.contatto || {}).nome || '') + ' ' + ((p.dati.contatto || {}).cognome || ''))} · ${esc(email || '')}<br>
         Entro il termine di ${GIORNI_RECESSO} giorni: <b>${recesso.entro_termine ? 'sì' : 'NO, da verificare'}</b><br>
         Motivo indicato: ${esc(recesso.motivo || '—')}</p>
         <p style="font-size:13px">Attenzione: il recesso non è ammesso se nel frattempo il cliente ha chiesto la liquidazione di un sinistro.</p>`));
    } catch (e) { console.warn('recesso/ufficio:', e.message); }
    res.json({ ok: true, polizza: vistaCliente({ ...p, dati: { ...p.dati, recesso } }) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
