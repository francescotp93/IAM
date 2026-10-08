// L'impronta dei codici OTP, con una chiave che sta solo sul server (08/10/2026).
//
// Prima l'impronta era sha256(codice + ':' + identificativo). Chi poteva
// leggere quella riga — l'associato la propria, chi lavora in agenzia le firme
// dei clienti e dei collaboratori — provava il milione di codici di sei cifre
// sul suo computer in meno di un secondo, trovava quello giusto e lo inseriva
// al primo colpo. Il tetto dei tentativi non scattava mai, e la firma non
// dimostrava più che a confermare fosse il titolare della casella email.
//
// Con una HMAC la stessa prova non si può fare: senza la chiave l'impronta non
// dice niente. La chiave è OTP_SEGRETO, oppure la chiave di servizio di
// Supabase, che sul server c'è già e non esce mai di lì. Senza nessuna delle
// due non si genera e non si verifica niente: un ripiego su una chiave nota
// sarebbe il difetto rimesso dentro.
import crypto from 'crypto';

function chiave() {
  const k = process.env.OTP_SEGRETO || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('Manca la chiave dei codici di conferma (OTP_SEGRETO): il server non può generarli né verificarli.');
  return k;
}

export function improntaOtp(codice, legame) {
  return crypto.createHmac('sha256', chiave()).update(String(codice) + ':' + String(legame)).digest('hex');
}

/* Confronto a tempo costante: un confronto che si ferma al primo carattere
   diverso dice, misurandone il tempo, quanti caratteri sono giusti. */
export function otpGiusto(codice, legame, impronta) {
  if (!impronta || typeof impronta !== 'string') return false;
  const a = Buffer.from(improntaOtp(codice, legame), 'hex');
  const b = Buffer.from(impronta, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
