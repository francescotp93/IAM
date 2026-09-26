/* ═══════════════════════════════════════════════════════════════════════════════
   POLIZZE ATTIVE, CLIENTI PERSI, TIPI DI TITOLO           (26/09/2026)

   Tre definizioni che si tengono per mano: senza la prima non esiste la
   seconda, e la terza dice *quando* è successo. Stanno in un posto solo
   perché finora ogni schermata se le ricavava da sé, e due schermate che
   contano i clienti in due modi diversi danno due numeri che non si possono
   confrontare.

   La definizione per esteso sta in `IAM_MASTER_SPEC.md` § 4ter. Qui c'è il
   codice, e i motivi per cui non è più semplice di così.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 1 — ATTIVA NON VUOL DIRE «IN DATA».                                       │
   └───────────────────────────────────────────────────────────────────────────┘
   In archivio ci sono 34 polizze ANNULLATE che scadono in futuro. Contarle
   fra le attive vuol dire credere di avere coperto un cliente che non lo è —
   e chiamarlo per un rinnovo che non esiste, o peggio non chiamarlo affatto
   perché risulta a posto.

   Attiva = la data di scadenza non è passata E non è annullata.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 2 — PERSO NON È «SENZA POLIZZE ATTIVE».                                   │
   └───────────────────────────────────────────────────────────────────────────┘
   Le due metà contano tutte e due: **aveva** almeno una polizza, e **adesso**
   non ne ha nessuna attiva. Chi non ne ha mai avute non è perso: è un
   contatto. Confonderli farebbe sembrare un fallimento un preventivo mai
   chiuso — e in archivio sono 58 anagrafiche su 2.547.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 3 — LA DATA DELLA PERDITA NON È SEMPRE LA SCADENZA.                       │
   └───────────────────────────────────────────────────────────────────────────┘
   Una polizza annullata smette di coprire il giorno dell'annullamento, non
   quello della scadenza, e le due possono distare mesi: nei dati veri c'è una
   polizza annullata il 03/07/2026 con scadenza originale il 14/09. Prendere
   la scadenza vorrebbe dire cercare il cliente due mesi dopo averlo perso.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── I TIPI DI TITOLO ──────────────────────────────────────────────────────
     Il vocabolario dell'agenzia, che è più fine di quello del database.

     `quote_titoli.tipo` ammette quattro valori e i lettori ci schiacciano
     dentro cinque cose: NP e SO finiscono tutte e due in `prima_rata`, e fra
     sei mesi non si sa più che una era una sostituzione. QR e QF finiscono in
     due valori diversi ma nessuno dei due dice «rinnovo», e senza quello non
     si può rispondere a «chi non ha rinnovato».

     La sigla SI AGGIUNGE, non sostituisce: `tipo` resta com'è perché ci sono
     schermate che lo leggono. */
  var TIPI = {
    NP: { sigla: 'NP', nome: 'Nuova polizza',            tipo: 'prima_rata' },
    QR: { sigla: 'QR', nome: 'Quietanza di rinnovo',     tipo: 'quietanza'  },
    QF: { sigla: 'QF', nome: 'Quietanza di frazionamento', tipo: 'rata'     },
    AP: { sigla: 'AP', nome: 'Appendice',                tipo: 'appendice'  },
    SO: { sigla: 'SO', nome: 'Sostituzione',             tipo: 'prima_rata' },
  };

  function testo(v) { return String(v == null ? '' : v).trim(); }
  function chiave(v) { return testo(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  function giorno(v) {
    var m = /^(\d{4}-\d{2}-\d{2})/.exec(testo(v));
    return m ? m[1] : null;
  }

  /* Come le compagnie chiamano i titoli. Le sigle secche (PN, QZ, AP…) sono
     quelle dei tracciati; le frasi sono quelle che HDI scrive per esteso.
     Quello che non si riconosce torna `null` — non si indovina: una sigla
     sbagliata su un titolo diventa un cliente «perso» che invece è vivo. */
  var DIZIONARIO = {
    np: 'NP', pn: 'NP', 'nuova polizza': 'NP', nuova: 'NP', 'polizza nuova': 'NP',
    qr: 'QR', 'quietanza di rinnovo': 'QR', 'quietanza rinnovo': 'QR',
    rinnovo: 'QR', quietanza: 'QR', qz: 'QR',
    qf: 'QF', 'quietanza di frazionamento': 'QF', 'quietanza frazionamento': 'QF',
    frazionamento: 'QF', rata: 'QF',
    ap: 'AP', appendice: 'AP',
    so: 'SO', sostituzione: 'SO', 'polizza sostituita': 'SO',
  };

  function sigla(v) {
    var k = chiave(v);
    if (!k) return null;
    /* Anche senza gli spazi: sui tracciati la sigla arriva scritta «Q.R.»,
       «Q R», «q/r». Si prova prima la forma con gli spazi (dove stanno le
       frasi per esteso) e poi quella compatta — mai il contrario, altrimenti
       «nuova polizza» perderebbe la sua voce. */
    var compatta = k.replace(/ /g, '');
    return DIZIONARIO[k] || DIZIONARIO[compatta]
        || (TIPI[compatta.toUpperCase()] ? compatta.toUpperCase() : null);
  }

  function nomeTipo(s) { return (TIPI[testo(s).toUpperCase()] || {}).nome || null; }

  /* ── QUANDO UNA POLIZZA HA SMESSO DI COPRIRE ───────────────────────────────
     `null` vuol dire «copre ancora». Per un'annullata è la data di
     annullamento; l'SSF la scrive in `dati.ssf.data_annullamento` e l'HDI
     non la manda, quindi quando manca si ripiega sulla scadenza E LO SI DICE
     invece di far finta che sia la stessa cosa. */
  function annullata(p) {
    var st = chiave((p || {}).stato_pagamento);
    return st === 'annullata' || st === 'annullato';
  }

  /* La data si cerca in tre posti perché in tre posti la scrivono: la colonna
     piatta (o l'alias che un lettore si fa con `dati->ssf->>data_annullamento`,
     per non scaricare 5 MB di jsonb solo per una data), la radice di `dati`, e
     il ramo `ssf`. Chi legge non deve sapere quale delle tre ha usato chi ha
     scritto. */
  function dataAnnullamento(p) {
    var d = (p || {}).dati || {};
    return giorno(p && p.data_annullamento)
        || giorno(d.data_annullamento)
        || giorno((d.ssf || {}).data_annullamento)
        || null;
  }

  /* PERCHÉ se n'è andato: «VENDITA», «DISDETTA», «FURTO». È la differenza fra
     un cliente da richiamare e uno che non c'è più niente da richiamare. */
  function motivoStorno(p) {
    var d = (p || {}).dati || {};
    return testo(p && p.motivo_storno)
        || testo(d.motivo_storno)
        || testo((d.ssf || {}).motivo_storno)
        || null;
  }

  function finitaIl(p, oggi) {
    var og = giorno(oggi);
    if (!p) return null;
    if (annullata(p)) {
      /* Se l'annullamento non porta la data, la polizza è comunque finita:
         al più tardi oggi. Non si inventa un giorno, si prende quello che si
         sa e si marca l'approssimazione (vedi `statoPolizza`). */
      return dataAnnullamento(p) || giorno(p.data_scadenza) || og;
    }
    var sc = giorno(p.data_scadenza);
    if (!sc) return null;                       // senza scadenza non si può dire
    return (og && sc < og) ? sc : null;         // scaduta → quel giorno; altrimenti copre
  }

  /* ── ATTIVA / NON ATTIVA ───────────────────────────────────────────────────
     Torna sempre il PERCHÉ: una schermata che dice «non attiva» senza dire
     se è scaduta o annullata costringe ad aprire la polizza per saperlo. */
  function statoPolizza(p, oggi) {
    var og = giorno(oggi);
    if (!p) return { attiva: false, motivo: 'assente', etichetta: 'Non c\'è', finitaIl: null };
    if (annullata(p)) {
      var da = dataAnnullamento(p);
      return {
        attiva: false, motivo: 'annullata',
        etichetta: 'Annullata' + (da ? ' il ' + italiana(da) : ''),
        finitaIl: finitaIl(p, og),
        dataStimata: !da,                       // non aveva la data: è un ripiego
        motivoStorno: motivoStorno(p),
      };
    }
    var sc = giorno(p.data_scadenza);
    if (!sc) {
      /* Senza scadenza non si afferma né che copre né che non copre. È il
         verso prudente: la si mostra fra quelle da guardare, non fra le
         attive — una polizza che nessuno controlla è peggio di una scaduta. */
      return { attiva: false, motivo: 'senza_scadenza', etichetta: 'Senza data di scadenza', finitaIl: null };
    }
    if (!og) return { attiva: false, motivo: 'senza_oggi', etichetta: 'Non so che giorno è', finitaIl: null };
    if (sc >= og) return { attiva: true, motivo: 'in_corso', etichetta: 'Attiva fino al ' + italiana(sc), finitaIl: null };
    return { attiva: false, motivo: 'scaduta', etichetta: 'Scaduta il ' + italiana(sc), finitaIl: sc };
  }

  function italiana(g) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(testo(g));
    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : testo(g);
  }

  function attiva(p, oggi) { return statoPolizza(p, oggi).attiva; }

  /* ── IL CLIENTE ────────────────────────────────────────────────────────────
     `polizze` sono le sue, `titoliPerPolizza` una mappa polizza_id → titoli,
     che serve solo a distinguere «non ha rinnovato» da «se n'è andato prima».
     Senza la mappa la distinzione non si fa e si dichiara, invece di essere
     indovinata. */
  function statoCliente(polizze, oggi, titoliPerPolizza) {
    var l = [].concat(polizze || []).filter(Boolean);
    var og = giorno(oggi);

    if (!l.length) {
      /* PROSPECT. Non «cliente a zero polizze»: uno che non ha mai comprato
         niente. Sono 58 anagrafiche su 2.547 e fino al 26/09/2026 erano
         indistinguibili dai clienti, così un preventivo mai chiuso sembrava un
         cliente acquisito. Si marca in modo suo — non rosso: il rosso vuol dire
         «l'avevamo e l'abbiamo perso», e un prospect non è un fallimento, è una
         vendita da fare. */
      return { stato: 'mai_avuto', perso: false, prospect: true, attive: 0, persoIl: null,
               etichetta: 'Prospect',
               spiega: 'Non ha mai avuto una polizza: è un contatto da lavorare, non un cliente perso.' };
    }

    var stati = l.map(function (p) { return { p: p, s: statoPolizza(p, og) }; });
    var vive = stati.filter(function (x) { return x.s.attiva; });

    if (vive.length) {
      return { stato: 'attivo', perso: false, attive: vive.length, persoIl: null,
               etichetta: vive.length === 1 ? '1 polizza attiva' : vive.length + ' polizze attive' };
    }

    /* NON SI SA. Rosso vuol dire «l'abbiamo perso», ed è una cosa che si dice
       a Francesco per fargli fare una telefonata. Se una polizza non ha la
       data di scadenza — o se non ci hanno detto che giorno è oggi — il
       cliente non è perso: è da guardare. Oggi in archivio le polizze senza
       scadenza sono zero, e questa strada serve a che un buco futuro non
       diventi un'accusa. */
    var dubbie = stati.filter(function (x) {
      return x.s.motivo === 'senza_scadenza' || x.s.motivo === 'senza_oggi';
    });
    if (dubbie.length) {
      return { stato: 'da_verificare', perso: false, attive: 0, persoIl: null,
               etichetta: dubbie.length === 1 ? '1 polizza da verificare' : dubbie.length + ' polizze da verificare',
               nonHaRinnovato: null, quietanzeDiRinnovoViste: 0,
               perche: stati.map(function (x) { return x.s.etichetta; }) };
    }

    /* PERSO. Il giorno è quello dell'ULTIMA copertura finita: è quando ha
       smesso davvero di essere cliente, non quando è finita la prima. */
    var giorni = stati.map(function (x) { return x.s.finitaIl; }).filter(Boolean);
    var persoIl = giorni.length ? giorni.sort()[giorni.length - 1] : null;

    /* NON HA RINNOVATO: su almeno una delle sue polizze c'era una quietanza
       di RINNOVO (QR) rimasta non incassata. Una QF non incassata è una rata
       scoperta, non un cliente che se n'è andato: se si confondessero, ogni
       rata in ritardo diventerebbe una perdita. */
    var mappa = titoliPerPolizza || null;
    var nonRinnovato = null, qrViste = 0;
    if (mappa) {
      nonRinnovato = false;
      l.forEach(function (p) {
        (mappa[testo(p.id)] || []).forEach(function (t) {
          var s = sigla(t.sigla_tipo || t.tipo_compagnia || t.tipo);
          if (s !== 'QR') return;
          qrViste++;
          if (chiave(t.stato) !== 'incassato') nonRinnovato = true;
        });
      });
    }

    /* COME L'ABBIAMO PERSO, che non è un dettaglio: sono due lavori
       commerciali diversi. Chi non ha rinnovato alla scadenza si richiama con
       un preventivo; chi ha disdetto a metà annualità ha avuto un motivo (ha
       venduto l'auto, si è arrabbiato) e prima di richiamarlo lo si vuole
       sapere. In archivio il 26/09/2026: 511 persi alla scadenza naturale,
       54 per annullamento.

       Si guarda la polizza che è finita PER ULTIMA. A pari data vince
       «non rinnovata», perché è quella su cui c'è qualcosa da fare. */
    var ultime = stati.filter(function (x) { return x.s.finitaIl && x.s.finitaIl === persoIl; });
    var motivoPerdita = null;
    if (ultime.length) {
      motivoPerdita = ultime.some(function (x) { return x.s.motivo === 'scaduta'; })
        ? 'non_rinnovata' : 'annullata';
    }

    /* PERSO AL RINNOVO — il criterio che Francesco chiama «QR».
       Due strade, e la seconda serve perché la prima quasi non esiste in
       archivio: le quietanze di rinnovo vere sono DUE su 3.218 titoli.
       Prima Assicurazioni, che è il 99,4% del portafoglio, non manda una
       quietanza di rinnovo: al rinnovo emette una polizza nuova. Quindi il
       mancato rinnovo, da lei, si vede da un'annualità finita alla sua
       scadenza e da nessuna che le è succeduta — ed è esattamente la
       condizione qui sotto, perché un cliente che avesse la polizza
       successiva non sarebbe in questo ramo del codice. */
    var persoAlRinnovo = nonRinnovato === true || motivoPerdita === 'non_rinnovata';

    return {
      stato: 'perso', perso: true, attive: 0, persoIl: persoIl,
      etichetta: 'Perso' + (persoIl ? ' dal ' + italiana(persoIl) : ''),
      /* `null` non è `false`: senza la mappa dei titoli non si sa, e dirlo
         è diverso dal dire «non è un mancato rinnovo». */
      nonHaRinnovato: nonRinnovato,
      quietanzeDiRinnovoViste: qrViste,
      motivoPerdita: motivoPerdita,
      persoAlRinnovo: persoAlRinnovo,
      perche: stati.filter(function (x) { return !x.s.attiva; })
                   .map(function (x) { return x.s.etichetta; }),
    };
  }

  /* Comodo per le liste: divide le polizze di un cliente in due mucchi, già
     ordinati come si leggono — le attive per scadenza più vicina, le altre
     dalla più recente. */
  function dividiPolizze(polizze, oggi) {
    var att = [], non = [];
    [].concat(polizze || []).filter(Boolean).forEach(function (p) {
      var s = statoPolizza(p, oggi);
      (s.attiva ? att : non).push(Object.assign({}, p, { _stato: s }));
    });
    att.sort(function (a, b) { return testo(a.data_scadenza).localeCompare(testo(b.data_scadenza)); });
    non.sort(function (a, b) { return testo(b._stato.finitaIl || b.data_scadenza).localeCompare(testo(a._stato.finitaIl || a.data_scadenza)); });
    return { attive: att, nonAttive: non };
  }

  var API = {
    TIPI: TIPI, DIZIONARIO: DIZIONARIO,
    sigla: sigla, nomeTipo: nomeTipo, giorno: giorno, italiana: italiana,
    annullata: annullata, dataAnnullamento: dataAnnullamento, motivoStorno: motivoStorno,
    finitaIl: finitaIl,
    statoPolizza: statoPolizza, attiva: attiva,
    statoCliente: statoCliente, dividiPolizze: dividiPolizze,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PortafoglioStato = API;
})();
