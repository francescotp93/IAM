// ═══════════════════════════════════════════════════════════════════════════════
//  L'ARCHIVIO DEI DOCUMENTI, LATO SERVER (18/09/2026)
//
//  Il contenitore `documenti` era pubblico: un indirizzo, e chiunque leggeva la
//  carta d'identità di un cliente senza avere un account. Dal 18/09/2026 è
//  chiuso, e ogni apertura passa da un indirizzo FIRMATO che scade.
//
//  Qui sta la parte del server, e serve a due cose che il browser non può fare:
//
//   1) FIRMARE PER CHI NON HA UN ACCOUNT. Il collaboratore che apre la pagina di
//      firma, e il cliente che riceve l'email della sua polizza, non sono
//      collegati a Supabase: il loro browser non può chiedere un indirizzo
//      firmato. Il server sì, perché ha la chiave di servizio.
//
//   2) DARE SCADENZE DIVERSE A COSE DIVERSE. Cinque minuti bastano ad aprire un
//      documento dentro il gestionale. Non bastano a un cliente che apre la
//      posta il giorno dopo: lì la scadenza è di giorni, ed è dichiarata nel
//      testo dell'email, perché un collegamento che muore in silenzio è peggio
//      di uno che dice quanto vive.
//
//  LA REGOLA CHE NON SI TOCCA: da qui non esce mai un indirizzo pubblico. Se un
//  giorno serve di nuovo `/object/public/...`, vuol dire che si sta riaprendo il
//  contenitore, e va deciso da una persona, non da una riga di codice.
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ekjxrnsfqxnfxzrthdcf.supabase.co').replace(/\/$/, '');
const BUCKET = 'documenti';

/** Quanto vive un indirizzo firmato, in secondi. */
export const SCADENZA = {
  dentro_casa: 300,              // 5 minuti: aprire un file dal gestionale
  al_cliente: 30 * 24 * 3600,    // 30 giorni: un documento allegato a un'email
};

/**
 * Dal valore salvato al percorso dentro il contenitore.
 * Accetta un percorso nudo (quello che si salva da oggi), un vecchio indirizzo
 * pubblico (le righe scritte prima del 18/09/2026) e un indirizzo già firmato.
 * Restituisce '' se non è roba dell'archivio: un indirizzo di un altro sito
 * non si tocca e non si firma.
 */
export function percorsoArchivio(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const m = s.match(/\/storage\/v1\/object\/(?:public|sign)\/documenti\/([^?#]+)/);
  if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
  if (/^https?:\/\//i.test(s)) return '';
  return s.replace(/^\/+/, '');
}

/**
 * L'indirizzo firmato di un documento dell'archivio.
 * Non solleva: chi chiama deve poter mandare un'email senza il collegamento
 * invece di non mandarla affatto. Torna '' quando non si può firmare.
 */
export async function firmaDocumento(v, secondi) {
  const path = percorsoArchivio(v);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!path || !key) return '';
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: secondi || SCADENZA.dentro_casa }),
    });
    if (!r.ok) throw new Error('storage ' + r.status + ': ' + (await r.text().catch(() => '')).slice(0, 120));
    const d = await r.json();
    /* Supabase restituisce un indirizzo relativo («/object/sign/…?token=…»): da
       solo non porta da nessuna parte, e mandarlo in un'email sarebbe un
       collegamento rotto con la faccia seria. */
    const rel = d && (d.signedURL || d.signedUrl);
    if (!rel) return '';
    return rel.startsWith('http') ? rel : `${SUPABASE_URL}/storage/v1${rel.startsWith('/') ? '' : '/'}${rel}`;
  } catch (e) {
    console.warn('archivio: non riesco a firmare «' + path + '»:', e.message || e);
    return '';
  }
}

/** Carica un file nell'archivio e restituisce il PERCORSO, mai un indirizzo. */
export async function caricaDocumento(path, corpo, contentType) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata');
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'content-type': contentType || 'application/octet-stream', 'x-upsert': 'true' },
    body: corpo,
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Storage: ' + (t || r.status)); }
  return path;
}
