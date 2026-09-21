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
     e un `entita_id` lì non ha senso.

     `id` dice CHE FORMA ha il suo identificativo, ed è misurato sul database,
     non deciso a tavolino: le tabelle di QUOTO usano `uuid`, quelle di IAM no
     — `iam_team` e `iam_workdiary` hanno chiavi di testo, la cassa, i ticket,
     le trattative e le gare hanno numeri interi. Un solo formato preteso per
     tutti avrebbe scartato in silenzio metà dei movimenti di IAM. */
  var VOCI = {
    cliente:       { l: 'Cliente',       i: 'ti-user',            tabella: 'quote_anagrafiche', id: 'uuid' },
    preventivo:    { l: 'Preventivo',    i: 'ti-file-invoice',    tabella: 'quote_preventivi', id: 'uuid' },
    polizza:       { l: 'Polizza',       i: 'ti-file-check',      tabella: 'quote_polizze', id: 'uuid' },
    pratica:       { l: 'Pratica',       i: 'ti-folders',         tabella: 'quote_pratiche', id: 'uuid' },
    titolo:        { l: 'Rata',          i: 'ti-cash',            tabella: 'quote_titoli', id: 'uuid' },
    sinistro:      { l: 'Sinistro',      i: 'ti-alert-triangle',  tabella: 'quote_sinistri', id: 'uuid' },
    documento:     { l: 'Documento',     i: 'ti-folder',          tabella: null },
    emissione:     { l: 'Emissione',     i: 'ti-rosette-discount',tabella: null },
    collaboratore: { l: 'Collaboratore', i: 'ti-users',           tabella: 'quote_collaboratori', id: 'uuid' },
    utente:        { l: 'Utente',        i: 'ti-user-cog',        tabella: null },
    ticket:        { l: 'Ticket',        i: 'ti-ticket',          tabella: 'iam_ticket', id: 'numero' },
    trattativa:    { l: 'Trattativa',    i: 'ti-businessplan',    tabella: 'iam_trattative', id: 'numero' },
    incasso:       { l: 'Incasso',       i: 'ti-cash',            tabella: null },
    importazione:  { l: 'Importazione',  i: 'ti-database-import', tabella: 'quote_importazioni', id: 'uuid' },
    /* ── Quello che si tocca da IAM (19/09/2026) ──────────────────────────
       IAM non scriveva nel registro nemmeno una volta: fatture, permessi,
       schede economiche, cassa — niente lasciava traccia. Il vocabolario è
       lo stesso, perché il registro è uno: due elenchi di nomi vorrebbero
       dire due storie della stessa agenzia. */
    /* Le fatture dei collaboratori NON sono una tabella: stanno dentro
       `iam_team.fatture`, un elenco nella scheda economica. Non c'è una riga
       da aprire, quindi niente identificativo — il movimento che le riguarda
       si aggancia alla SCHEDA, che una riga ce l'ha. Mettere qui una tabella
       inventata avrebbe prodotto puntatori che non aprono niente. */
    fattura:       { l: 'Fattura',       i: 'ti-file-euro',       tabella: null },
    scheda:        { l: 'Scheda economica', i: 'ti-id-badge',     tabella: 'iam_team', id: 'testo' },
    cassa:         { l: 'Cassa',         i: 'ti-wallet',          tabella: 'sessioni_giornaliere', id: 'numero' },
    lead:          { l: 'Lead',          i: 'ti-user-plus',       tabella: 'iam_lead', id: 'uuid' },
    formazione:    { l: 'Formazione',    i: 'ti-school',          tabella: 'iam_formazione', id: 'uuid' },
    diario:        { l: 'Diario',        i: 'ti-notebook',        tabella: 'iam_workdiary', id: 'testo' },
    gara:          { l: 'Gara',          i: 'ti-trophy',          tabella: 'iam_gare_config', id: 'numero' },
    /* Brief #02 M1. Sotto un conto e sotto una causale ci sono dei soldi:
       «chi ha cambiato la natura di questo conto» e «chi ha spento questa
       causale» sono domande che tornano indietro mesi dopo, ed è esattamente
       il motivo per cui questo registro esiste (§18). */
    conto:         { l: 'Conto',         i: 'ti-building-bank',   tabella: 'iam_conti', id: 'uuid' },
    causale:       { l: 'Causale',       i: 'ti-tags',            tabella: 'iam_causali', id: 'uuid' },
    /* Brief #02 M2. Una tariffa e un gruppo decidono quanto prende una
       persona: «chi ha cambiato questa percentuale, e quando» è la domanda
       che arriva quando un estratto conto non torna. */
    tariffa:       { l: 'Tariffa',       i: 'ti-percentage',      tabella: 'iam_provvigioni_tariffa', id: 'uuid' },
    gruppo:        { l: 'Gruppo',        i: 'ti-users-group',     tabella: 'iam_gruppi', id: 'uuid' },
    /* La prima nota (brief #02 M3). Un movimento non si corregge di nascosto:
       chi l'ha scritto, chi l'ha corretto e chi l'ha annullato si leggono
       dalla riga stessa, come per una polizza. */
    movimento:     { l: 'Movimento',     i: 'ti-arrows-exchange',  tabella: 'iam_movimenti', id: 'uuid' },
    /* Lo stato dei collegamenti (Blocco 3 · punto 12-bis, 21/09/2026). Quando
       una compagnia smette di rispondere o rientra, resta scritto: «da quando
       PRIMA non risponde» e' una domanda che arriva settimane dopo.
       NIENTE TABELLA, e non e' una dimenticanza: `iam_collegamenti_stato` ha
       per chiave il nome della fonte, che non e' un identificativo di riga da
       aprire — e un puntatore che non apre niente e' peggio di un puntatore
       assente (§18, regola 1). */
    fonte:         { l: 'Collegamento',  i: 'ti-plug-connected',   tabella: null },
    /* Il catalogo prodotti (20/09/2026). Due voci e non una: un prodotto di
       compagnia e un prodotto STANDARD vivono in due tabelle, e una voce sola
       aprirebbe la riga sbagliata la meta' delle volte — un id che apre la
       cosa di qualcun altro e' peggio di un id assente (§18, regola 1). */
    compagnia:     { l: 'Compagnia',     i: 'ti-shield',          tabella: 'quote_compagnie', id: 'uuid' },
    prodotto:      { l: 'Prodotto',      i: 'ti-package',         tabella: 'iam_compagnia_prodotti', id: 'uuid' },
    prodotto_standard: { l: 'Prodotto standard', i: 'ti-library', tabella: 'iam_prodotti_standard', id: 'uuid' },
    azienda:       { l: 'Agenzia',       i: 'ti-building',        tabella: null }
  };

  /* Un identificativo vero, non «qualcosa che assomiglia a un id». Le righe di
     questo sistema hanno tutte un uuid: accettare altro vorrebbe dire scrivere
     nel registro un puntatore che non apre niente. */
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var NUMERO = /^-?\d+$/;

  /* Un identificativo è valido quando ha la forma che quella tabella usa
     DAVVERO. Non è pedanteria: un uuid su una tabella a chiavi numeriche non
     apre niente, e un numero al posto di un uuid nemmeno. Per le chiavi di
     testo l'unica regola possibile è «non vuoto, e non una parola che di solito
     vuol dire "non lo so"» — `undefined` e `null` arrivano da un valore letto
     male, e scriverli vorrebbe dire mettere in archivio una stringa che
     somiglia a un puntatore senza esserlo. */
  function idValido(forma, id) {
    if (forma === 'uuid') return UUID.test(id);
    if (forma === 'numero') return NUMERO.test(id);
    if (forma === 'testo') return id.length > 0 && !/^(undefined|null|nan)$/i.test(id);
    return false;
  }

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
    if (id && voce && voce.tabella && !idValido(voce.id, id)) {
      /* REGOLA 1. Un id sbagliato manda a guardare la riga di qualcun altro:
         è peggio di un id assente. E la forma giusta dipende dalla tabella,
         perché in questo sistema ce ne sono tre. */
      avvisi.push('l\'identificativo non ha la forma di «' + chiave + '» (' + voce.id + ') e non si scrive: «' + id + '»');
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

  /* ══ IL RIQUADRO «CHI E QUANDO» ═══════════════════════════════════════════
     Sta nel motore e non nelle schermate perché le schermate sono DUE — QUOTO
     e IAM — e due copie dello stesso riquadro vogliono dire due riquadri che
     un giorno diranno cose diverse. È la stessa ragione per cui i testi che
     escono di casa stanno nei motori (CLAUDE.md §5).

     `esc` arriva da chi chiama: è l'unica cosa che il motore non può avere,
     e passarla è meglio che riscriverla qui in una terza versione.

     `movimenti === null` vuol dire NON SI È POTUTO LEGGERE, che non è
     «nessun movimento»: confonderli rassicura a sproposito. */
  /* «gg/mm/aaaa hh:mm», il formato chiesto dal brief (M1.1) per l'etichetta.
     Si costruisce a mano e non con toLocaleString: quello mette la virgola e
     i secondi, e cambia da un browser all'altro. */
  function quandoBreve(v) {
    if (!v) return '—';
    var d = new Date(v);
    if (isNaN(d.getTime())) return '—';
    var z = function (n) { return (n < 10 ? '0' : '') + n; };
    return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  /* L'ULTIMA MODIFICA (M1.1, 19/09/2026). Il movimento più recente per data,
     non il primo dell'elenco: chi chiama può passarli in un ordine qualunque.
     Se non c'è nessun movimento, l'ultima modifica è la creazione — la riga
     esiste, qualcuno l'ha scritta. Se il registro NON SI È POTUTO LEGGERE
     (`null`) non si risponde: un'etichetta che dice «ultima modifica: Anna»
     mentre in mezzo c'è un movimento di Mario non letto sarebbe falsa con la
     faccia seria. */
  function ultimaModifica(movimenti, creato) {
    if (movimenti === null) return null;
    var ultimo = null;
    (movimenti || []).forEach(function (m) {
      if (!m || !m.creato_il) return;
      if (!ultimo || String(m.creato_il) > String(ultimo.creato_il)) ultimo = m;
    });
    if (ultimo) return { nome: ultimo.utente_nome || '—', il: ultimo.creato_il, azione: ultimo.azione || '' };
    if (creato && (creato.nome || creato.il)) return { nome: creato.nome || '—', il: creato.il || null, azione: creato.azione || 'Creata' };
    return null;
  }

  function storiaHTML(movimenti, creato, opz) {
    var o = opz || {};
    var esc = o.esc || function (x) { return String(x == null ? '' : x); };
    var quando = o.quando || function (v) { return v ? new Date(v).toLocaleString('it-IT') : '—'; };

    var um = ultimaModifica(movimenti, creato);
    var etichetta = um
      ? '<div class="reg-ultima">Ultima modifica: <b>' + esc(um.nome) + '</b> — ' + quandoBreve(um.il) + '</div>'
      : '';

    var testa = etichetta + ((creato && (creato.nome || creato.il))
      ? '<div class="reg-r"><div><b>' + esc(creato.nome || '—') + '</b>' +
        '<div class="cl-sub">' + esc(creato.azione || 'Creata') + '</div></div>' +
        '<div class="cl-sub">' + quando(creato.il) + '</div></div>'
      : '');

    if (movimenti === null) {
      return testa + '<div class="cl-sub" style="padding:6px 0">Il registro dei movimenti non risponde. ' +
        'Non vuol dire che non ci siano stati: vuol dire che non si è potuto leggerlo.</div>';
    }
    if (!movimenti || !movimenti.length) {
      return testa + '<div class="cl-sub" style="padding:6px 0">Nessun altro movimento registrato. ' +
        'I movimenti si registrano dal 19/09/2026: quello che è successo prima non ha lasciato traccia qui.</div>';
    }
    return testa + movimenti.map(function (m) {
      return '<div class="reg-r"><div><b>' + esc(m.utente_nome || '—') + '</b>' +
        '<div class="cl-sub">' + esc(m.azione || '') +
        (m.dettaglio ? ' · ' + esc(m.dettaglio) : '') + '</div></div>' +
        '<div class="cl-sub">' + quando(m.creato_il) + '</div></div>';
    }).join('');
  }

  var API = {
    VERSIONE: VERSIONE, VOCI: VOCI, UUID: UUID,
    etichetta: etichetta, movimento: movimento, storia: storia,
    unisci: unisci, chiaveFatto: chiaveFatto, copertura: copertura,
    storiaHTML: storiaHTML, ultimaModifica: ultimaModifica, quandoBreve: quandoBreve
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Registro = API;
})();
