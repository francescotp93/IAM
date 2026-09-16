import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Il token in chiaro esiste soltanto durante la creazione e nel link consegnato.
// Nel database si conserva esclusivamente l'hash, così una lettura del DB non espone gli inviti attivi.
export function generaTokenInvito(byte = 32) {
  if (!Number.isInteger(byte) || byte < 16) throw new TypeError('La lunghezza del token deve essere di almeno 16 byte.');
  return randomBytes(byte).toString('base64url');
}

export function hashTokenInvito(token) {
  if (typeof token !== 'string' || token.length < 20) throw new TypeError('Token non valido.');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function tokenCorrisponde(token, hashAtteso) {
  if (typeof hashAtteso !== 'string' || !/^[a-f0-9]{64}$/.test(hashAtteso)) return false;
  let calcolato;
  try {
    calcolato = hashTokenInvito(token);
  } catch {
    return false;
  }
  return timingSafeEqual(Buffer.from(calcolato, 'hex'), Buffer.from(hashAtteso, 'hex'));
}

export function calcolaScadenza(ore, da = new Date()) {
  if (!Number.isFinite(ore) || ore <= 0 || ore > 24 * 30) throw new RangeError("La scadenza deve essere compresa tra un'ora e 30 giorni.");
  return new Date(da.getTime() + ore * 60 * 60 * 1000);
}

export function invitoUtilizzabile(invito, ora = new Date()) {
  if (!invito) return false;
  if (invito.revocatoIl || invito.completatoIl) return false;
  const scadenza = new Date(invito.scadeIl);
  return !Number.isNaN(scadenza.getTime()) && scadenza > ora;
}
