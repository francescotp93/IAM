// Un limitatore di tentativi in memoria (audit GDPR, 07/10/2026).
//
// Un codice OTP di sei cifre ha un milione di combinazioni: senza un tetto ai
// tentativi si prova tutto. Qui ce ne sono due, di proposito diversi:
//   - per CHIAVE (un codice, un associato): pochi tentativi, poi il codice va
//     richiesto di nuovo;
//   - per INDIRIZZO sulle rotte pubbliche: largo, ferma solo chi martella.
// In memoria e non nel database: un riavvio azzera i conti, ed è accettabile —
// il codice scade comunque dopo pochi minuti.

export function creaLimitatore({ max, finestraMs, adesso = () => Date.now() }) {
  const conti = new Map();
  function pulisci(t) {
    if (conti.size < 5000) return;
    for (const [k, v] of conti) if (t - v.da > finestraMs) conti.delete(k);
  }
  return {
    /* Conta un colpo e dice se è ancora ammesso. */
    colpo(chiave) {
      const t = adesso(); pulisci(t);
      let v = conti.get(chiave);
      if (!v || t - v.da > finestraMs) { v = { da: t, n: 0 }; conti.set(chiave, v); }
      v.n += 1;
      return v.n <= max;
    },
    bloccato(chiave) {
      const v = conti.get(chiave);
      return !!v && adesso() - v.da <= finestraMs && v.n >= max;
    },
    azzera(chiave) { conti.delete(chiave); },
  };
}

export function ipDi(req) {
  return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '')
    .split(',')[0].trim() || 'sconosciuto';
}

/* Middleware per le rotte pubbliche: oltre il tetto risponde 429. */
export function limitaPerIndirizzo({ max = 300, finestraMs = 10 * 60 * 1000 } = {}) {
  const l = creaLimitatore({ max, finestraMs });
  return function (req, res, next) {
    if (l.colpo(ipDi(req))) return next();
    res.status(429).json({ error: 'Troppe richieste da questo indirizzo: riprova fra qualche minuto.' });
  };
}
