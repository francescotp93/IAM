// Middleware di autenticazione: verifica il token Supabase delle app IAM/QUOTO.
// Supporta sia le chiavi "nuove" asimmetriche (ES256/RS256, verificate via JWKS)
// sia il vecchio segreto HS256 (SUPABASE_JWT_SECRET).
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from 'jose';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ekjxrnsfqxnfxzrthdcf.supabase.co').replace(/\/$/, '');
let _jwks;
function jwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(SUPABASE_URL + '/auth/v1/.well-known/jwks.json'));
  return _jwks;
}

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Accesso non autorizzato (token mancante).' });

  let payload;
  try {
    const alg = decodeProtectedHeader(token).alg;
    if (alg === 'HS256') {
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) throw new Error('SUPABASE_JWT_SECRET non configurato');
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret)));
    } else {
      // chiavi asimmetriche: verifica con le chiavi pubbliche di Supabase (JWKS)
      ({ payload } = await jwtVerify(token, jwks()));
    }
  } catch (e) {
    return res.status(401).json({ error: 'Token rifiutato: ' + e.message });
  }
  req.user = { id: payload.sub, email: (payload.email || '').toLowerCase() };
  req.token = token;
  next();
}

/* «Autenticato» non vuol dire «dell'agenzia» (audit GDPR, 07/10/2026).
   I convenzionati hanno un account Supabase e NON hanno una riga in
   iam_utenti: requireAuth li faceva passare, e le rotte che leggono con la
   chiave di servizio (che salta la RLS) davano a loro i dati di tutti.
   requireInterno va DOPO requireAuth: pretende la riga in iam_utenti e che
   l'account non sia sospeso, e scrive in req.ruolo lo stesso ruolo che il
   database calcola con iam_mio_ruolo(). Le rotte dei convenzionati stanno
   fuori da questo cancello apposta (server/index.js). */
const RUOLO_TTL = 60 * 1000;
const _ruoli = new Map();

export function ruoloDa(riga) {
  if (!riga) return null;
  const r = String(riga.ruolo || '');
  if (r === 'admin' || r === 'top_master') return 'admin';
  if (r === 'operatore' || r === 'master') return 'operatore';
  return 'collaboratore';
}

async function leggiRiga(id) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/iam_utenti?id=eq.${encodeURIComponent(id)}&select=id,ruolo,attivo&limit=1`,
    { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!r.ok) throw new Error('lettura account: ' + r.status);
  return (await r.json())[0] || null;
}

export function creaRequireInterno({ leggi = leggiRiga, adesso = () => Date.now() } = {}) {
  return async function requireInterno(req, res, next) {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ error: 'Accesso non autorizzato.' });
    let voce = _ruoli.get(id);
    if (!voce || adesso() - voce.t > RUOLO_TTL) {
      try { voce = { t: adesso(), riga: await leggi(id) }; }
      catch (e) { return res.status(503).json({ error: 'Non si è potuto verificare l\'account: ' + e.message }); }
      _ruoli.set(id, voce);
    }
    const riga = voce.riga;
    if (!riga) return res.status(403).json({ error: 'Questo account non è dell\'agenzia.' });
    if (riga.attivo === false) return res.status(403).json({ error: 'Account sospeso.' });
    req.ruolo = ruoloDa(riga);
    next();
  };
}
export const requireInterno = creaRequireInterno();
export function _svuotaRuoli() { _ruoli.clear(); }

