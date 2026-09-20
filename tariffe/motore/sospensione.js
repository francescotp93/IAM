/* ═══════════════════════════════════════════════════════════════════════════
   LA SOSPENSIONE DI UNA POLIZZA, E IL FIDO DI UN COLLABORATORE
   (Blocco 3 · punti 3 e 6, 20/09/2026)

   Due cose diverse in un motore solo perché rispondono alla stessa domanda
   — «chi devo richiamare, e perché» — e perché tutte e due, sbagliate,
   producono un numero credibile e falso.

   ── LA SOSPENSIONE ────────────────────────────────────────────────────────
   Misurato prima di scrivere: nel repository la parola «sospensione» non
   compare nemmeno una volta. Una RCA sospesa oggi non esiste da nessuna
   parte: resta in portafoglio con la sua scadenza contrattuale, entra nello
   scadenzario con una data che non e' piu' vera, e il giorno in cui il
   cliente rimette in strada la macchina non se ne ricorda nessuno.

   La regola che regge tutto, ed e' quella per cui il cliente accetta di
   sospendere: **la copertura sospesa si recupera.** I giorni di sospensione
   si aggiungono in fondo, quindi la scadenza VERA non e' quella scritta sul
   contratto. Un'agenzia che richiama sulla data contrattuale telefona nel
   giorno sbagliato, e chi ha sospeso sei mesi se lo sente dire dal cliente.

   E la scadenza contrattuale NON si riscrive: si tiene, e si somma. Un dato
   sovrascritto e' un dato di cui nessuno sa piu' quale fosse l'originale.

   ── IL FIDO ───────────────────────────────────────────────────────────────
   Il credito dell'agenzia verso un collaboratore esiste dal 19/09 (CLAUDE.md
   §24): sono le rate che ha incassato lui e non ha ancora rimesso. Quel
   numero pero' non ha un tetto, e un credito senza tetto si scopre quando e'
   troppo grande.

   Il fido e' quel tetto. Due regole che lo rendono onesto:
    · **un fido non dichiarato non e' un fido illimitato.** Chi non ce l'ha
      esce dai conti con il motivo scritto, non con «nessun problema» — e'
      la regola dell'estratto conto (§17) applicata a un limite invece che a
      una percentuale;
    · **il fido sta sulla PERSONA**, non sulla scheda economica. Il credito si
      calcola su chi ha incassato, e chi ha incassato puo' non avere una
      scheda: mettendolo li' una persona senza scheda risulterebbe senza
      limite, in silenzio.

   Motore PURO: nessun database, nessun DOM. Lo caricano QUOTO e IAM — carica,
   non copia (§10).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var GIORNO = 24 * 60 * 60 * 1000;

  function testo(v) {
    if (v === null || v === undefined) return '';
    var s = String(v).trim();
    return s;
  }
  function iso(d) {
    if (!d) return null;
    var s = String(d).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  function giorniFra(a, b) {
    var x = iso(a), y = iso(b);
    if (!x || !y) return null;
    return Math.round((new Date(y + 'T00:00:00Z') - new Date(x + 'T00:00:00Z')) / GIORNO);
  }
  function piuGiorni(d, n) {
    var x = iso(d);
    if (!x || !isFinite(n)) return null;
    return new Date(new Date(x + 'T00:00:00Z').getTime() + n * GIORNO).toISOString().slice(0, 10);
  }
  function cent(n) {
    if (n === null || n === undefined || !isFinite(n)) return null;
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }

  /* ── LO STATO DI UNA POLIZZA RISPETTO ALLA SOSPENSIONE ──────────────────
     `sospensioni` è l'elenco di quelle già chiuse più, eventualmente, quella
     aperta: `{ dal, al }`, con `al` vuoto finché la polizza è ferma.

     Torna sempre un oggetto, anche per una polizza che non è mai stata
     sospesa: chi chiama non deve sapere in anticipo se ce n'è una. */
  function stato(polizza, oggi) {
    var p = polizza || {};
    var g = iso(oggi) || new Date().toISOString().slice(0, 10);
    var elenco = (p.sospensioni || []).filter(function (s) { return s && iso(s.dal); });

    var giorniChiusi = 0;
    var aperta = null;
    elenco.forEach(function (s) {
      if (iso(s.al)) {
        var d = giorniFra(s.dal, s.al);
        /* Una sospensione che finisce prima di cominciare non si conta e non
           si corregge da sola: sarebbe un numero inventato dentro una data. */
        if (d !== null && d > 0) giorniChiusi += d;
      } else if (!aperta || s.dal > aperta.dal) {
        aperta = s;
      }
    });

    var giorniAperti = aperta ? Math.max(0, giorniFra(aperta.dal, g) || 0) : 0;
    var totale = giorniChiusi + giorniAperti;

    /* LA SCADENZA VERA. La contrattuale resta dov'è: si somma, non si
       riscrive. Senza la scadenza contrattuale non si calcola niente e si
       dice — una polizza vita pluriennale può non averla. */
    var scadenzaEffettiva = p.data_scadenza ? piuGiorni(p.data_scadenza, totale) : null;

    return {
      sospesa: !!aperta,
      dal: aperta ? iso(aperta.dal) : null,
      giorniAperti: giorniAperti,
      giorniChiusi: giorniChiusi,
      giorniTotali: totale,
      scadenzaContrattuale: iso(p.data_scadenza),
      scadenzaEffettiva: scadenzaEffettiva,
      /* Lo scostamento serve a chi guarda una lista: dice di quanto la data
         vera si è allontanata da quella scritta. */
      spostataDi: totale
    };
  }

  /* ── QUANTO PUÒ DURARE ──────────────────────────────────────────────────
     Il limite NON lo decide questo motore: lo dichiara la compagnia, e ogni
     compagnia ha il suo. Dove nessuno l'ha scritto, i giorni si contano e il
     giudizio NON si dà: «non si sa» non è «va bene» (§12, §18, §20).

     Il secondo limite invece è una conseguenza del contratto e vale sempre:
     una sospensione non può recuperare più copertura di quanta ne restava.
     Oltre quella, il premio residuo è perso — ed è la cosa che il cliente
     scopre quando torna. */
  function limite(polizza, opz) {
    var o = opz || {};
    var s = stato(polizza, o.oggi);
    var out = {
      giorni: s.giorniTotali,
      limiteGiorni: (o.limiteGiorni !== null && o.limiteGiorni !== undefined && isFinite(o.limiteGiorni))
        ? Number(o.limiteGiorni) : null,
      residuoAllaSospensione: null,
      superato: null,      /* null = non si può dire */
      motivo: null,
      giorniRimasti: null
    };

    /* La copertura che restava il giorno in cui è stata sospesa. */
    if (s.dal && s.scadenzaContrattuale) {
      var r = giorniFra(s.dal, s.scadenzaContrattuale);
      if (r !== null) out.residuoAllaSospensione = Math.max(0, r);
    }

    var tetti = [];
    if (out.limiteGiorni !== null) tetti.push({ n: out.limiteGiorni, perche: 'il limite della compagnia' });
    if (out.residuoAllaSospensione !== null) tetti.push({ n: out.residuoAllaSospensione, perche: 'la copertura che restava' });

    if (!tetti.length) {
      out.motivo = 'Nessuno ha dichiarato quanto può durare una sospensione per questa compagnia, ' +
        'e la polizza non ha una scadenza: i giorni si contano, ma non si può dire se sono troppi.';
      return out;
    }
    /* Vince il più stretto: due tetti diversi non si mediano. */
    tetti.sort(function (a, b) { return a.n - b.n; });
    var t = tetti[0];
    out.giorniRimasti = t.n - out.giorni;
    out.superato = out.giorni > t.n;
    out.motivo = out.superato
      ? 'Sospesa da ' + out.giorni + ' giorni: più di ' + t.n + ' (' + t.perche + ').'
      : 'Restano ' + out.giorniRimasti + ' giorni prima di ' + t.n + ' (' + t.perche + ').';
    if (out.limiteGiorni === null) {
      out.motivo += ' Il limite della compagnia non è dichiarato: questo conto guarda solo la copertura residua.';
    }
    return out;
  }

  /* ── L'ELENCO DI CHI RICHIAMARE ─────────────────────────────────────────
     Le sospensioni aperte, in ordine di urgenza. Chi ha meno giorni davanti
     sta in cima: una lista che mette per primi quelli tranquilli si scorre
     per niente (§19). */
  function daRiattivare(polizze, opz) {
    var o = opz || {};
    var limiti = o.limitiPerCompagnia || {};
    var righe = [];
    (polizze || []).forEach(function (p) {
      if (!p) return;
      var s = stato(p, o.oggi);
      if (!s.sospesa) return;
      var lim = limite(p, {
        oggi: o.oggi,
        limiteGiorni: limiti[String(p.compagnia || '').toLowerCase()]
      });
      righe.push({
        id: p.id, numero: p.numero_polizza || null, cliente: p.cliente || null,
        cliente_id: p.cliente_id || null, compagnia: p.compagnia || null,
        prodotto: p.prodotto || null,
        dal: s.dal, giorni: s.giorniAperti,
        scadenzaContrattuale: s.scadenzaContrattuale,
        scadenzaEffettiva: s.scadenzaEffettiva,
        giorniRimasti: lim.giorniRimasti,
        superato: lim.superato,
        motivo: lim.motivo
      });
    });
    righe.sort(function (a, b) {
      /* Chi ha superato per primo; poi chi ha meno giorni davanti; chi non si
         può giudicare va in fondo, perché su di lui non c'è niente da
         decidere finché qualcuno non dichiara il limite. */
      var pa = a.superato === true ? 0 : (a.superato === false ? 1 : 2);
      var pb = b.superato === true ? 0 : (b.superato === false ? 1 : 2);
      if (pa !== pb) return pa - pb;
      if (a.giorniRimasti === null) return 1;
      if (b.giorniRimasti === null) return -1;
      return a.giorniRimasti - b.giorniRimasti;
    });
    return righe;
  }

  /* ── APRIRE E CHIUDERE UNA SOSPENSIONE ──────────────────────────────────
     Non scrive niente: dice che cosa si può fare e perché no. */
  function apribile(polizza, dal) {
    var p = polizza || {};
    var s = stato(p, dal);
    var d = iso(dal);
    if (!d) return { ok: false, motivo: 'Manca la data da cui la polizza è ferma.' };
    if (s.sospesa) return { ok: false, motivo: 'Questa polizza è già sospesa dal ' + s.dal + '.' };
    if (p.data_effetto && d < iso(p.data_effetto)) {
      return { ok: false, motivo: 'La sospensione comincia prima della decorrenza della polizza.' };
    }
    /* Si guarda la scadenza EFFETTIVA, non quella scritta: una polizza già
       sospesa in passato è coperta più a lungo di quanto dice il contratto. */
    if (s.scadenzaEffettiva && d > s.scadenzaEffettiva) {
      return { ok: false, motivo: 'La polizza non è più in copertura il ' + d + ': è scaduta il ' + s.scadenzaEffettiva + '.' };
    }
    return { ok: true, sospensione: { dal: d, al: null } };
  }

  function chiudibile(polizza, al) {
    var s = stato(polizza, al);
    var d = iso(al);
    if (!d) return { ok: false, motivo: 'Manca la data di riattivazione.' };
    if (!s.sospesa) return { ok: false, motivo: 'Questa polizza non è sospesa.' };
    if (d < s.dal) return { ok: false, motivo: 'La riattivazione viene prima della sospensione.' };
    var giorni = giorniFra(s.dal, d) || 0;
    return {
      ok: true, dal: s.dal, al: d, giorni: giorni,
      /* La scadenza si sposta di QUESTI giorni, sommati a quelli di prima:
         è l'unica cosa che il cliente si aspetta di riavere. */
      scadenzaEffettiva: s.scadenzaContrattuale
        ? piuGiorni(s.scadenzaContrattuale, s.giorniChiusi + giorni) : null
    };
  }

  /* ═══ IL FIDO ═════════════════════════════════════════════════════════════
     `crediti` è quello che `EstrattoConto.creditoAgenzia` già produce: quanto
     ogni persona ha incassato e non ha ancora rimesso.
     `persone` porta il fido dichiarato (`fido`), che può non esserci. */
  function fidi(crediti, persone, opz) {
    var o = opz || {};
    var perId = {};
    (persone || []).forEach(function (p) { if (p && p.id) perId[p.id] = p; });
    var righe = [], senzaFido = [];
    (crediti || []).forEach(function (c) {
      if (!c || !c.collaboratore_id) return;
      var p = perId[c.collaboratore_id] || {};
      var importo = cent(c.importo != null ? c.importo : c.totale);
      var fido = (p.fido !== null && p.fido !== undefined && isFinite(p.fido)) ? Number(p.fido) : null;
      var riga = {
        collaboratore_id: c.collaboratore_id,
        nominativo: c.nominativo || p.nominativo || null,
        credito: importo, fido: fido,
        rate: c.rate != null ? c.rate : null,
        residuo: null, superato: null, quota: null, motivo: null
      };
      if (fido === null) {
        /* «Non dichiarato» non è «illimitato». Chi non ha un fido esce dai
           conti CON IL MOTIVO, non con un silenzio che sembra un via libera
           (§17: quello che non si sa non entra nei totali). */
        riga.motivo = 'Fido non dichiarato: non si può dire se questo credito è oltre il limite.';
        senzaFido.push(riga);
      } else {
        riga.residuo = cent(fido - (importo || 0));
        riga.superato = (importo || 0) > fido;
        riga.quota = fido > 0 ? Math.round(((importo || 0) / fido) * 100) : null;
        riga.motivo = riga.superato
          ? 'Oltre il fido di ' + cent(importo - fido) + ' €.'
          : 'Dentro il fido: restano ' + riga.residuo + ' €.';
        righe.push(riga);
      }
    });
    /* Chi ha sforato per primo, poi chi ci è più vicino. */
    righe.sort(function (a, b) {
      if (a.superato !== b.superato) return a.superato ? -1 : 1;
      return (b.quota || 0) - (a.quota || 0);
    });
    var oltre = righe.filter(function (r) { return r.superato; });
    return {
      righe: righe,
      senzaFido: senzaFido,
      conteggi: {
        persone: righe.length + senzaFido.length,
        oltre: oltre.length,
        senza_fido: senzaFido.length,
        /* I totali contano SOLO chi ha un fido: sommare anche gli altri
           darebbe un «esposizione oltre il fido» che comprende persone di cui
           non si sa il fido. */
        credito_con_fido: cent(righe.reduce(function (t, r) { return t + (r.credito || 0); }, 0)),
        oltre_di: cent(oltre.reduce(function (t, r) { return t + ((r.credito || 0) - r.fido); }, 0))
      }
    };
  }

  var API = {
    VERSIONE: 'sospensione-2026-09-20',
    giorniFra: giorniFra, piuGiorni: piuGiorni, cent: cent,
    stato: stato, limite: limite, daRiattivare: daRiattivare,
    apribile: apribile, chiudibile: chiudibile,
    fidi: fidi
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Sospensione = API;
})();
