/* ═══════════════════════════════════════════════════════════════════════════════
   CRM · ANALISI — estrarre pezzi di portafoglio  (24/09/2026)

   Si scelgono dei filtri, esce una lista: da lì una campagna, un foglio Excel
   o un PDF. Il motore sta qui, separato dalla schermata, perché due regole di
   questo file non sono di grafica e non devono dipendere da un pulsante.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ REGOLA 1 — LA LISTA PER LA CAMPAGNA NON È LA LISTA CHE ESPORTI.           │
   └───────────────────────────────────────────────────────────────────────────┘
   Sono due cose diverse e devono restare due funzioni diverse.

   L'esportazione in Excel o PDF è un uso INTERNO: l'agenzia guarda il proprio
   portafoglio, e ci sono dentro tutti. La campagna è una COMUNICAZIONE
   COMMERCIALE, e lì entra solo chi ha dato il consenso (art. 6.1.a GDPR).

   Se fossero la stessa funzione con un parametro, prima o poi qualcuno
   passerebbe il parametro sbagliato e partirebbe una campagna a chi non l'ha
   chiesta. Non è un errore che si vede: parte, e basta. Per questo
   `perCampagna()` NON accetta un modo per disattivare il filtro del consenso.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ REGOLA 2 — UN FILTRO SU UN CAMPO VUOTO DEVE DIRLO, NON TORNARE ZERO.      │
   └───────────────────────────────────────────────────────────────────────────┘
   Misurato sul portafoglio vero, 2.536 anagrafiche al 24/09/2026:

       comune ......... 1.954 (105 comuni)     professione ......... 1
       data di nascita  2.490                  condizione lavorativa 1
       cellulare ...... 1.744                  collaboratore ....... 1
       polizze ........ 4.073                  note ................ 23
                                               sposato 3 · figli 2
                                               email 6 · consenso 4

   Filtrare per professione oggi restituisce una riga. Una schermata che
   risponde «0 clienti» senza aggiungere altro fa pensare che il portafoglio
   non abbia quel tipo di cliente; la verità è che quel campo non l'ha
   compilato nessuno. `copertura()` esiste per dirlo accanto a ogni filtro:
   è la differenza fra «non ne abbiamo» e «non lo sappiamo».
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function testo(v) { return String(v == null ? '' : v).trim(); }

  /* Per confrontare i comuni: «SAN VITO LO CAPO», «San Vito lo Capo» e
     «  san vito lo capo » sono lo stesso posto. Gli accenti si tengono — in
     Sicilia «Cefalù» senza accento è un altro modo di scriverlo, ma toglierlo
     accorperebbe nomi che non c'entrano. Si normalizza solo spazi e maiuscole. */
  function chiave(v) { return testo(v).toLowerCase().replace(/\s+/g, ' '); }

  /* L'ETÀ SI CALCOLA, NON SI STIMA DIVIDENDO I GIORNI PER 365. Chi compie gli
     anni domani oggi ne ha uno in meno, e un filtro «fino a 30» che lo include
     manda l'offerta giovani a chi non ne ha più diritto. */
  function eta(dataNascita, alGiorno) {
    var n = testo(dataNascita); if (!n) return null;
    var d = new Date(n.slice(0, 10) + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    var o = alGiorno ? new Date(String(alGiorno).slice(0, 10) + 'T12:00:00') : new Date();
    var a = o.getFullYear() - d.getFullYear();
    var m = o.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && o.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  }

  /* I tre stati di un sì/no: vero, falso, e «nessuno l'ha chiesto». Il terzo
     non è il secondo. In archivio `sposato` è falso su 2.533 anagrafiche su
     2.536, e non vuol dire che siano tutti celibi: vuol dire che la casella
     non è mai stata toccata. Chi filtra «non sposati» si porterebbe dietro
     l'intero portafoglio. */
  function tri(v) { return v === true ? true : v === false ? false : null; }

  var CAMPI_COPERTURA = [
    { k: 'comune',                e: 'Comune',              pieno: function (r) { return !!testo(r.comune); } },
    { k: 'data_nascita',          e: 'Età',                 pieno: function (r) { return eta(r.data_nascita) != null; } },
    { k: 'professione',           e: 'Professione',         pieno: function (r) { return !!testo(r.professione); } },
    { k: 'condizione_lavorativa', e: 'Condizione lavorativa', pieno: function (r) { return !!testo(r.condizione_lavorativa); } },
    { k: 'sposato',               e: 'Stato famiglia',      pieno: function (r) { return r.sposato === true || r.ha_figli === true; } },
    { k: 'note',                  e: 'Note',                pieno: function (r) { return !!testo(r.note); } },
    { k: 'intermediario_id',      e: 'Collaboratore',       pieno: function (r) { return !!testo(r.intermediario_id); } },
    { k: 'email',                 e: 'Email',               pieno: function (r) { return !!testo(r.email); } },
    { k: 'cellulare',             e: 'Cellulare',           pieno: function (r) { return !!testo(r.cellulare); } },
    { k: 'consenso_marketing',    e: 'Consenso marketing',  pieno: function (r) { return r.consenso_marketing === true; } },
  ];

  /* Quanto è pieno ogni campo: si mostra accanto al filtro, così «0 risultati»
     non si confonde con «campo mai compilato». */
  function copertura(righe) {
    var tot = (righe || []).length;
    return CAMPI_COPERTURA.map(function (c) {
      var n = (righe || []).filter(c.pieno).length;
      return {
        campo: c.k, etichetta: c.e, compilati: n, totale: tot,
        quota: tot ? n / tot : 0,
        /* Sotto il 10% un filtro non discrimina: seleziona il rumore. */
        inutilizzabile: tot > 0 && n / tot < 0.10,
      };
    });
  }

  /* ── IL FILTRO ────────────────────────────────────────────────────────────
     `polizzePerCliente` è una mappa cliente_id → elenco di polizze: si passa
     da fuori perché il portafoglio sta in un'altra tabella, e ricaricarlo qui
     dentro vorrebbe dire due strade per la stessa domanda. */
  function filtra(righe, f, extra) {
    f = f || {}; extra = extra || {};
    var perCliente = extra.polizzePerCliente || {};
    var membriGruppo = extra.membriGruppo || null;   // Set di anagrafica_id
    var oggi = extra.oggi || null;

    var comuni = (f.comuni || []).map(chiave).filter(Boolean);
    var rami = (f.rami || []).map(chiave).filter(Boolean);
    var cerca = chiave(f.testoNote);

    return (righe || []).filter(function (r) {
      if (comuni.length) {
        /* La residenza dichiarata dal cliente batte quella anagrafica quando
           c'è: è quella che lui riconosce come casa sua. */
        var c = chiave(r.res_dich_comune || r.comune);
        if (comuni.indexOf(c) < 0) return false;
      }
      if (f.etaDa != null || f.etaA != null) {
        var a = eta(r.data_nascita, oggi);
        if (a == null) return false;                       // senza data non si può dire
        if (f.etaDa != null && a < f.etaDa) return false;
        if (f.etaA  != null && a > f.etaA)  return false;
      }
      if (f.sposato != null && tri(r.sposato) !== f.sposato) return false;
      if (f.haFigli != null && tri(r.ha_figli) !== f.haFigli) return false;
      if (f.professione && chiave(r.professione).indexOf(chiave(f.professione)) < 0) return false;
      if (f.condizioneLavorativa && chiave(r.condizione_lavorativa) !== chiave(f.condizioneLavorativa)) return false;
      if (f.collaboratoreId && testo(r.intermediario_id) !== testo(f.collaboratoreId)) return false;
      if (f.conNote === true && !testo(r.note)) return false;
      if (cerca && chiave(r.note).indexOf(cerca) < 0) return false;
      if (membriGruppo && !membriGruppo.has(testo(r.id))) return false;
      if (rami.length) {
        var pz = perCliente[testo(r.id)] || [];
        var ha = pz.some(function (p) {
          return rami.indexOf(chiave(p.modulo || p.prodotto)) >= 0;
        });
        if (!ha) return false;
      }
      if (f.soloClienti === true && r.lead === true) return false;
      if (f.soloLead === true && r.lead !== true) return false;
      return true;
    });
  }

  /* ── CHI SI RIESCE A RAGGIUNGERE, E COME ─────────────────────────────────
     Serve prima di qualunque campagna: una lista di mille nomi con sei email
     non è una lista da mille. */
  function recapiti(righe) {
    var conEmail = [], conCell = [], muti = [];
    (righe || []).forEach(function (r) {
      var e = !!testo(r.email), c = !!testo(r.cellulare);
      if (e) conEmail.push(r);
      if (c) conCell.push(r);
      if (!e && !c) muti.push(r);
    });
    return {
      totale: (righe || []).length,
      email: conEmail.length, cellulare: conCell.length, senzaRecapito: muti.length,
      righeEmail: conEmail, righeCellulare: conCell,
    };
  }

  /* ── LA LISTA PER LA CAMPAGNA ────────────────────────────────────────────
     NON accetta un modo per saltare il consenso: vedi la regola 1 in cima.
     Torna anche quanti sono stati tolti e perché, perché una lista che si
     accorcia senza spiegazione fa pensare a un guasto. */
  function perCampagna(righe, canale) {
    var c = canale === 'sms' || canale === 'whatsapp' ? canale : 'email';
    var conConsenso = (righe || []).filter(function (r) { return r.consenso_marketing === true; });
    var raggiungibili = conConsenso.filter(function (r) {
      return c === 'email' ? !!testo(r.email) : !!testo(r.cellulare);
    });
    return {
      canale: c,
      destinatari: raggiungibili,
      quanti: raggiungibili.length,
      esclusi: {
        senzaConsenso: (righe || []).length - conConsenso.length,
        senzaRecapito: conConsenso.length - raggiungibili.length,
      },
      /* Detto qui e non nella schermata: è una regola, non un'etichetta. */
      perche: 'Una comunicazione commerciale va solo a chi ha dato il consenso (art. 6.1.a GDPR). L\'elenco completo resta disponibile per l\'uso interno e per l\'esportazione.',
    };
  }

  /* ── L'ESPORTAZIONE ──────────────────────────────────────────────────────
     Uso interno: ci sono tutti, consenso compreso o no. Le colonne sono
     scelte e non «tutto quello che c'è»: un foglio Excel che gira per
     l'ufficio con dentro codici fiscali e note non serve a nessuno. */
  var COLONNE = [
    { k: 'nominativo', e: 'Nominativo' },
    { k: 'comune',     e: 'Comune',     v: function (r) { return testo(r.res_dich_comune || r.comune); } },
    { k: 'provincia',  e: 'Provincia',  v: function (r) { return testo(r.res_dich_provincia || r.provincia); } },
    { k: 'eta',        e: 'Età',        v: function (r, o) { var a = eta(r.data_nascita, o); return a == null ? '' : String(a); } },
    { k: 'cellulare',  e: 'Cellulare' },
    { k: 'email',      e: 'Email' },
    { k: 'consenso',   e: 'Consenso marketing', v: function (r) { return r.consenso_marketing === true ? 'Sì' : 'No'; } },
  ];

  function righeEsporta(righe, oggi) {
    return (righe || []).map(function (r) {
      var o = {};
      COLONNE.forEach(function (c) { o[c.e] = c.v ? c.v(r, oggi) : testo(r[c.k]); });
      return o;
    });
  }

  /* CSV per Excel: separatore punto e virgola (è quello che Excel italiano si
     aspetta) e le virgolette raddoppiate dentro i campi. Un nominativo con
     dentro un punto e virgola — succede — spaccherebbe la riga. */
  function csv(righe, oggi) {
    var dati = righeEsporta(righe, oggi);
    var intest = COLONNE.map(function (c) { return c.e; });
    var vir = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    return [intest.map(vir).join(';')]
      .concat(dati.map(function (d) { return intest.map(function (i) { return vir(d[i]); }).join(';'); }))
      .join('\r\n');
  }

  var API = {
    CAMPI_COPERTURA: CAMPI_COPERTURA, COLONNE: COLONNE,
    testo: testo, chiave: chiave, eta: eta, tri: tri,
    copertura: copertura, filtra: filtra, recapiti: recapiti,
    perCampagna: perCampagna, righeEsporta: righeEsporta, csv: csv,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.CrmAnalisi = API;
})();
