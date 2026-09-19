/* ═══════════════════════════════════════════════════════════════════════════════
   IL REGISTRO DEI MOVIMENTI (19/09/2026)

   `quote_log` esisteva da sempre e sapeva dire CHE COSA è successo e CHI l'ha
   fatto, ma non SU CHE COSA: aveva `entita` (il tipo — «polizza», «cliente»)
   e `dettaglio` (testo libero), e niente che puntasse alla riga toccata.

   La conseguenza è la domanda che in agenzia arriva sempre, e arriva mesi
   dopo: «chi ha cambiato QUESTO pagamento?», «chi ha creato QUESTA
   anagrafica?». Il registro non sapeva rispondere, e ogni schermata che
   voleva provarci si costruiva la sua traccia privata — come
   `quote_polizze.dati.modifiche`, che era un rimedio per una schermata sola.

   Da qui `entita_id`, e questo motore: le regole di che cosa si registra, di
   che cosa vuol dire «lo stesso movimento», e di come si legge la storia di
   una riga. Stanno qui e non nella schermata perché una regola scritta dentro
   `index.html` non si può provare senza aprire un browser (CLAUDE.md §5).

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LE TRE COSE CHE QUESTO MOTORE NON FA, ED È IL MOTIVO PER CUI ESISTE.      │
   │                                                                           │
   │ 1. NON INVENTA UN COLLEGAMENTO. Un `entita_id` che non è un identificativo│
   │    valido non si scrive: diventa vuoto e la cosa si dichiara. Un id       │
   │    sbagliato è peggio di un id assente — manda a guardare la riga di      │
   │    qualcun altro.                                                         │
   │ 2. NON UNISCE DUE MOVIMENTI VERI. Il registro è la prova di quello che è  │
   │    successo: se due persone toccano la stessa polizza nello stesso minuto,│
   │    sono due fatti, e restano due righe.                                   │
   │ 3. NON NASCONDE QUELLO CHE NON CONOSCE. Un tipo di entità che non è nel   │
   │    vocabolario si mostra com'è scritto, senza icona e senza collegamento. │
   │    Sparire in silenzio vorrebbe dire che un refuso cancella un movimento. │
   └───────────────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'registro-2026-09-19';

  /* ══ IL VOCABOLARIO ═══════════════════════════════════════════════════════
     I nomi NON sono stati scelti a tavolino: sono quelli che stanno già nelle
     230 righe scritte finora (`preventivo` 126, `cliente` 65, `emissione` 13,
     `utente` 9, `ticket` 5, `documento` 4, `polizza` 2, `trattativa` 1).
     Rinominarli avrebbe voluto dire riscrivere lo storico o tenerne due
     vocabolari — e uno dei due sarebbe stato quello che nessuno guarda.

     `tabella` dice dove vive la riga: serve a chi deve aprirla, e a chi
     scrive le politiche di visibilità sul database. Dove è `null`, quel
     movimento non punta a una riga (un'impostazione cambiata, un'esportazione)
     e un `entita_id` lì non ha senso. */
  var VOCI = {
    cliente:       { l: 'Cliente',       i: 'ti-user',            tabella: 'quote_anagrafiche' },
    preventivo:    { l: 'Preventivo',    i: 'ti-file-invoice',    tabella: 'quote_preventivi' },
    polizza:       { l: 'Polizza',       i: 'ti-file-check',      tabella: 'quote_polizze' },
    pratica:       { l: 'Pratica',       i: 'ti-folders',         tabella: 'quote_pratiche' },
    titolo:        { l: 'Rata',          i: 'ti-cash',            tabella: 'quote_titoli' },
    sinistro:      { l: 'Sinistro',      i: 'ti-alert-triangle',  tabella: 'quote_sinistri' },
    documento:     { l: 'Documento',     i: 'ti-folder',          tabella: null },
    emissione:     { l: 'Emissione',     i: 'ti-rosette-discount',tabella: null },
    collaboratore: { l: 'Collaboratore', i: 'ti-users',           tabella: 'quote_collaboratori' },
    utente:        { l: 'Utente',        i: 'ti-user-cog',        tabella: null },
    ticket:        { l: 'Ticket',        i: 'ti-ticket',          tabella: 'iam_ticket' },
    trattativa:    { l: 'Trattativa',    i: 'ti-businessplan',    tabella: 'iam_trattative' },
    incasso:       { l: 'Incasso',       i: 'ti-cash',            tabella: null },
    importazione:  { l: 'Importazione',  i: 'ti-database-import', tabella: 'quote_importazioni' }
  };

  /* Un identificativo vero, non «qualcosa che assomiglia a un id». Le righe di
     questo sistema hanno tutte un uuid: accettare altro vorrebbe dire scrivere
     nel registro un puntatore che non apre niente. */
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function testo(v) {
    var s = String(v == null ? '' : v).trim();
    return s === '' ? null : s;
  }

  function etichetta(entita) {
    var k = (testo(entita) || '').toLowerCase();
    var v = VOCI[k];
    /* Quello che non si conosce si mostra com'è: senza icona, senza
       collegamento, e riconoscibile per quello che è. */
    return v ? { chiave: k, l: v.l, i: v.i, tabella: v.tabella, noto: true }
             : { chiave: k || null, l: testo(entita) || '—', i: null, tabella: null, noto: false };
  }

  /* ══ COSTRUIRE UN MOVIMENTO ═══════════════════════════════════════════════
     Torna `{ riga, avvisi }`. `riga` è quello che si scrive sul database —
     oppure `null` se non c'è niente da registrare. Gli avvisi non fermano la
     scrittura: dicono che cosa si è dovuto lasciare fuori, e servono a chi
     legge il codice o le prove, non all'utente. */
  function movimento(o) {
    var m = o || {};
    var avvisi = [];
    var azione = testo(m.azione);
    if (!azione) {
      /* Un movimento senza azione non è un movimento: sarebbe una riga che
         dice «è successo qualcosa» e basta. */
      return { riga: null, avvisi: ['un movimento senza azione non si registra'] };
    }

    var ent = testo(m.entita);
    var chiave = ent ? ent.toLowerCase() : null;
    var voce = chiave ? VOCI[chiave] : null;
    if (ent && !voce) avvisi.push('tipo di entità fuori vocabolario: «' + ent + '»');

    var id = testo(m.entita_id);
    if (id && !UUID.test(id)) {
      /* REGOLA 1. Un id sbagliato manda a guardare la riga di qualcun altro:
         è peggio di un id assente. */
      avvisi.push('l\'identificativo non è valido e non si scrive: «' + id + '»');
      id = null;
    }
    if (id && !ent) {
      /* Un id senza il tipo non dice a quale tabella punta: non si sa dove
         andare a cercare quella riga. */
      avvisi.push('identificativo senza tipo di entità: non si sa a che riga punta');
      id = null;
    }
    if (id && voce && !voce.tabella) {
      avvisi.push('«' + chiave + '» non è una riga di archivio: l\'identificativo non si scrive');
      id = null;
    }

    return {
      riga: {
        azione: azione,
        entita: ent || null,
        entita_id: id,
        dettaglio: testo(m.dettaglio),
        utente_id: testo(m.utente_id),
        utente_nome: testo(m.utente_nome)
      },
      avvisi: avvisi
    };
  }

  /* ══ LA STORIA DI UNA RIGA ════════════════════════════════════════════════
     È la risposta alla domanda che ha fatto nascere tutto questo: «chi ha
     toccato QUESTA polizza». Il confronto sull'id è esatto e senza scorciatoie
     sul tipo: due tabelle diverse possono avere righe con id diversi, ma
     confondere `polizza` e `pratica` vorrebbe dire mostrare la storia di
     un'altra cosa. */
  function storia(righe, opz) {
    var o = opz || {};
    var ent = (testo(o.entita) || '').toLowerCase();
    var id = testo(o.entita_id);
    if (!ent || !id) return [];
    return (righe || [])
      .filter(function (r) {
        return String(r.entita || '').toLowerCase() === ent && String(r.entita_id || '') === id;
      })
      .slice()
      .sort(function (a, b) { return String(b.creato_il || '').localeCompare(String(a.creato_il || '')); });
  }

  /* ══ UNIRE IL REGISTRO E I FEED DERIVATI ══════════════════════════════════
     La pagina Log non legge solo il registro: ricostruisce i movimenti anche
     dai preventivi e dai sinistri, perché il registro è nato dopo di loro e
     per anni non ha visto tutto. Quei due mondi si sovrappongono, e vanno
     uniti — ma la regola con cui si univano era pericolosa.

     COM'ERA: si buttava via una riga se un'altra aveva la stessa azione, lo
     stesso nome, lo stesso dettaglio e lo stesso MINUTO. Due movimenti veri e
     identici nello stesso minuto — due incassi da 110 €, due documenti
     caricati di fila — diventavano uno solo, e il registro raccontava meno di
     quello che era successo.

     COM'È: **il registro non si tocca mai**. È la prova di quello che è
     successo, e due fatti restano due righe. Si scarta soltanto una riga
     DERIVATA quando il registro ha già quel fatto — stessa entità, stesso id,
     stessa azione, stesso minuto. Senza `entita_id` (le righe vecchie) si
     ripiega sul dettaglio, che è quello che si può fare.

     REGOLA 2: se si perde questa distinzione, il registro smette di essere una
     prova e diventa un riassunto. */
  function minuto(ts) {
    var t = new Date(ts).getTime();
    return isFinite(t) ? Math.floor(t / 60000) : null;
  }

  function chiaveFatto(r) {
    var base = String(r.entita || '').toLowerCase() + '|' + String(r.azione || '') + '|' + minuto(r.creato_il);
    return r.entita_id ? base + '|' + r.entita_id : base + '|~' + String(r.dettaglio || '');
  }

  function unisci(daRegistro, derivate) {
    var reg = (daRegistro || []).slice();
    var visti = {};
    reg.forEach(function (r) { visti[chiaveFatto(r)] = true; });
    var extra = (derivate || []).filter(function (r) { return !visti[chiaveFatto(r)]; });
    return reg.concat(extra).sort(function (a, b) {
      return String(b.creato_il || '').localeCompare(String(a.creato_il || ''));
    });
  }

  /* Quanti movimenti sanno dire su che cosa sono. È il numero che dice se il
     registro sta diventando quello che deve essere, e si guarda nel tempo: le
     righe vecchie non si possono agganciare a nulla, quelle nuove sì. */
  function copertura(righe) {
    var con = 0, possibili = 0;
    (righe || []).forEach(function (r) {
      var v = VOCI[String(r.entita || '').toLowerCase()];
      if (!v || !v.tabella) return;       // non punta a una riga: non fa testo
      possibili++;
      if (r.entita_id) con++;
    });
    return { con: con, possibili: possibili, quota: possibili ? Math.round(con / possibili * 100) : null };
  }

  var API = {
    VERSIONE: VERSIONE, VOCI: VOCI, UUID: UUID,
    etichetta: etichetta, movimento: movimento, storia: storia,
    unisci: unisci, chiaveFatto: chiaveFatto, copertura: copertura
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Registro = API;
})();
