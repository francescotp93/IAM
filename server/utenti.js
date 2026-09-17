// ── IAM · L'attivazione dell'accesso di una persona ──────────────────────────
/* Una persona del registro (quote_collaboratori) non ha ancora un account. Un
   amministratore, dal gruppo 3 del pannello permessi, preme «Attiva l'accesso»
   e qui succede tutto quello che nel browser non puo' succedere:

   1. si crea l'utenza di accesso con la chiave di servizio, con una password
      casuale che NESSUNO vede — non si scrive, non si manda, non si logga;
   2. si crea la scheda in iam_utenti (nel browser l'archivio non lascia che un
      amministratore la crei per conto d'altri: prima restava un «invito in
      sospeso» finche' la persona non entrava);
   3. la persona si aggancia all'account (quote_collaboratori.iam_id);
   4. si manda alla sua email il collegamento per SCEGLIERE la password.

   PERCHE' UN COLLEGAMENTO E NON UNA PASSWORD PROVVISORIA. La password
   provvisoria va letta da un'email e ribattuta, e intanto sta scritta in una
   casella di posta e in un messaggio che qualcuno gira a voce o su WhatsApp.
   Con il collegamento la password la sceglie la persona, sul suo telefono, e
   non passa da nessuna parte. E' la decisione di Francesco del 17/09/2026.

   CHI DECIDE E' IL TOKEN, NON IL CORPO. L'amministratore e' chi presenta il
   token, verificato da requireAuth e riletto qui su iam_utenti. Il corpo dice
   solo QUALE persona e con QUALE ruolo. */
import crypto from 'crypto';
import { Router } from 'express';
import { sendBrevo } from './notify.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ekjxrnsfqxnfxzrthdcf.supabase.co').replace(/\/$/, '');
const IAM_URL = (process.env.IAM_URL || 'https://iam.withusassicurazioni.it').replace(/\/$/, '');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* I ruoli come li scrive IAM (dbRuolo e' l'identita'), piu' i nomi storici che
   nel database possono ancora comparire su schede vecchie. */
export const RUOLI = ['admin', 'operatore', 'collaboratore'];
const RUOLI_ADMIN = ['admin', 'top_master'];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function errore(stato, messaggio) { const e = new Error(messaggio); e.stato = stato; return e; }

/* Quello che arriva dal browser, controllato. Pura: le prove la girano tutta. */
export function preparaAttivazione(body) {
  const b = body || {};
  const personaId = String(b.persona_id || '').trim();
  if (!UUID.test(personaId)) return { ok: false, stato: 400, errore: 'Serve la persona del registro (persona_id).' };
  const ruolo = String(b.ruolo || 'collaboratore').trim().toLowerCase();
  if (!RUOLI.includes(ruolo)) return { ok: false, stato: 400, errore: 'Ruolo non valido: ' + ruolo + '. Ammessi: ' + RUOLI.join(', ') + '.' };
  return { ok: true, personaId, ruolo };
}

/* Una password che nessuno leggera' mai: serve solo perche' l'utenza ne deve
   avere una. Presa da crypto, lunga, e buttata via subito dopo. */
export function passwordChiusa() {
  return crypto.randomBytes(24).toString('base64url');
}

/* Il messaggio che esce di casa. Niente password dentro: c'e' un tasto, e il
   tasto porta alla schermata dove la persona sceglie la sua. */
export function emailAttivazione({ nome, link }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:580px;margin:0 auto;border:1px solid #dde3e9;border-radius:14px;overflow:hidden">
  <div style="background:#1b2733;padding:20px 22px;text-align:center"><img src="https://quoto.withusassicurazioni.it/withus-logo-white.png" alt="With Us Assicurazioni" style="height:44px"></div>
  <div style="padding:24px;color:#1f2a37;font-size:15px;line-height:1.6">
    <h2 style="margin:0 0 14px;font-size:19px;color:#1f2a37">Il tuo accesso a IAM è pronto</h2>
    <p>Ciao ${esc(nome || '')}, l'agenzia ti ha attivato l'accesso alla piattaforma IAM di With Us.</p>
    <p>Premi il tasto qui sotto e <b>scegli la tua password</b>: da quel momento entri con la tua email e la password che hai scelto.</p>
    <p style="text-align:center;margin:22px 0"><a href="${esc(link)}" style="display:inline-block;background:#02984e;color:#fff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:12px">Scegli la password ed entra</a></p>
    <p style="color:#5a6b7c;font-size:13.5px">Il collegamento vale per poco tempo e si usa una volta sola. Se è scaduto, chiedi a chi ti ha attivato di mandartene uno nuovo. Se non aspettavi questo messaggio, ignoralo e avvisaci.</p>
  </div>
  <div style="padding:14px 24px;background:#eef1f4;color:#8b9aa9;font-size:12px">With Us Soc. Coop. · Email automatica, non rispondere a questo messaggio.</div>
</div>`;
}

// ── Supabase con la chiave di servizio ────────────────────────────────────────
async function sbVero(path, opz = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata');
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    ...opz,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'content-type': 'application/json', ...(opz.headers || {}) },
  });
  const testo = await r.text();
  let d = null; try { d = testo ? JSON.parse(testo) : null; } catch (e) { d = null; }
  if (!r.ok) throw errore(r.status, (d && (d.message || d.msg || d.error_description)) || `HTTP ${r.status}`);
  return d;
}

const DIPENDENZE_VERE = {
  sb: sbVero,
  inviaEmail: (to, subject, html) => sendBrevo([to], subject, html),
  iamUrl: IAM_URL,
  password: passwordChiusa,
};

/* Il lavoro vero, con le dipendenze passate da fuori cosi' le prove lo girano
   senza rete. Torna { iam_id, email, riusata } oppure lancia un errore con
   `stato` (401/403/404/409/502) e una frase che si puo' mostrare. */
export async function attivaPersona({ personaId, ruolo, chi }, dip = DIPENDENZE_VERE) {
  const { sb, inviaEmail, iamUrl, password } = { ...DIPENDENZE_VERE, ...dip };

  // 1. chi preme il tasto deve essere un amministratore attivo
  if (!chi || !UUID.test(String(chi.id || ''))) throw errore(401, 'Accesso non riconosciuto.');
  const io = (await sb(`/rest/v1/iam_utenti?id=eq.${encodeURIComponent(chi.id)}&select=id,attivo,ruolo&limit=1`).catch(() => []) || [])[0];
  if (!io || io.attivo === false || !RUOLI_ADMIN.includes(String(io.ruolo || ''))) {
    throw errore(403, 'Solo un amministratore può attivare un accesso.');
  }

  // 2. la persona del registro, com'e' adesso
  const p = (await sb(`/rest/v1/quote_collaboratori?id=eq.${encodeURIComponent(personaId)}&select=id,nome,cognome,email,iam_id,stato&limit=1`) || [])[0];
  if (!p) throw errore(404, 'Questa persona non è nel registro.');
  if (p.iam_id) throw errore(409, 'Questa persona ha già un account: i permessi si danno dall\'ingranaggio, il collegamento per la password dal gruppo 3.');
  const email = String(p.email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) throw errore(400, 'La persona non ha un\'email valida nella scheda: mettila in Collaboratori e riprova.');

  /* Un account con quella email c'e' gia' in iam_utenti? Non si aggancia da
     qui: la migrazione aggancia per email solo quando la corrispondenza e'
     una e chiara, e qui qualcuno sta chiedendo di CREARE, non di collegare.
     Si dice cosa c'e' e si lascia decidere a una persona. */
  const omonimi = await sb(`/rest/v1/iam_utenti?email=eq.${encodeURIComponent(email)}&select=id,nome,cognome&limit=1`).catch(() => []);
  if (Array.isArray(omonimi) && omonimi.length) {
    throw errore(409, `Con l'email ${email} esiste già un account IAM (${[omonimi[0].cognome, omonimi[0].nome].filter(Boolean).join(' ') || 'senza nome'}) non agganciato a questa persona. Va collegato a mano, non creato di nuovo.`);
  }

  // 3. l'utenza di accesso, con una password che nessuno vede
  const meta = { full_name: [p.nome, p.cognome].filter(Boolean).join(' ').trim(), ruolo, persona_id: p.id };
  let uid = null, riusata = false;
  try {
    const u = await sb('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password: password(), email_confirm: true, user_metadata: meta }),
    });
    uid = u && u.id;
  } catch (e) {
    if (!/already|exist|registered|duplicate/i.test(e.message || '')) throw errore(502, 'Non sono riuscito a creare l\'utenza: ' + (e.message || e));
    /* L'indirizzo ha gia' un'utenza di accesso ma nessuna scheda IAM (l'abbiamo
       appena controllato). Si riusa quell'utenza: NON si tocca la password,
       la persona la sceglie dal collegamento come tutti. */
    const trovati = await sb(`/auth/v1/admin/users?filter=${encodeURIComponent(email)}`).catch(() => null);
    const lista = (trovati && (trovati.users || trovati)) || [];
    const u = Array.isArray(lista) ? lista.find((x) => String(x.email || '').toLowerCase() === email) : null;
    if (!u) throw errore(502, 'L\'indirizzo risulta già registrato ma non lo ritrovo: ' + (e.message || e));
    uid = u.id; riusata = true;
  }
  if (!uid) throw errore(502, 'Utenza creata senza identificativo.');

  // 4. la scheda IAM: nasce con l'accesso a IAM e senza il preventivatore, come «Nuovo utente» faceva
  await sb('/rest/v1/iam_utenti', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: uid, email, nome: p.nome || null, cognome: p.cognome || null,
      ruolo, attivo: true, creato_da: chi.id,
      accesso_iam: true, accesso_quoto: false, lab_abilitato: false,
    }),
  });

  // 5. la persona si aggancia all'account
  await sb(`/rest/v1/quote_collaboratori?id=eq.${encodeURIComponent(p.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ iam_id: uid }),
  });

  // 6. il collegamento per scegliere la password, e la mail che lo porta
  const gen = await sb('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type: 'recovery', email, redirect_to: iamUrl + '/' }),
  });
  const link = gen && (gen.action_link || (gen.properties && gen.properties.action_link));
  if (!link) throw errore(502, 'Account creato, ma il collegamento per la password non è arrivato: mandalo dal gruppo 3.');
  await inviaEmail(email, 'Il tuo accesso a IAM è pronto', emailAttivazione({ nome: p.nome || '', link }));

  return { iam_id: uid, email, riusata };
}

export const utentiRouter = Router();

// POST /utenti/attiva  { persona_id, ruolo? }  — dietro requireAuth
utentiRouter.post('/attiva', async (req, res) => {
  const prep = preparaAttivazione(req.body);
  if (!prep.ok) return res.status(prep.stato).json({ error: prep.errore });
  try {
    const r = await attivaPersona({ personaId: prep.personaId, ruolo: prep.ruolo, chi: req.user });
    return res.json({ ok: true, ...r });
  } catch (e) {
    return res.status(e.stato || 500).json({ error: e.message || 'Errore imprevisto.' });
  }
});
