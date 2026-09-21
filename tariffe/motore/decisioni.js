/* ═══════════════════════════════════════════════════════════════════════════
   LE DECISIONI APERTE — le regole  (21/09/2026)

   Da settembre il sistema ha smesso, in una decina di punti, di indovinare: un
   fido non dichiarato non è illimitato, una provvigione non concordata non ha
   una percentuale di default, un codice produttore non si abbina per
   somiglianza, un saldo non si inventa. Ogni volta la regola è la stessa
   (CLAUDE.md §8.1) e la conseguenza pure: **il sistema ha finito il suo lavoro
   quando ha chiesto** (§41, §19).

   Il problema è che ha chiesto in dodici posti diversi. Una decisione che vive
   dentro la schermata che la usa si vede solo da chi apre quella schermata, e
   le schermate sono ventuno.

   ── LA REGOLA CHE FA FUNZIONARE QUESTO ELENCO ────────────────────────────
   Ogni voce dice **che cosa resta spento finché manca**. Un elenco di cose da
   fare che non dice che cosa si rompe non lo guarda nessuno due volte — è la
   lezione delle anomalie della M5 (§33: «le anomalie hanno il verbo»),
   applicata alle decisioni invece che ai guasti.

   ── E TRE COSE CHE QUESTO ELENCO NON FA ──────────────────────────────────
   1. **Non dà per fatta una decisione presa a metà.** Un conto su tre che
      dichiara i suoi mezzi è `parziale`, non verde: la metà mancante è
      esattamente quella che un giorno manderà un incasso sul conto sbagliato.
   2. **Non dice «a posto» quando non ha potuto guardare.** Su una schermata
      che riassume lo stato di tutto, confondere «non si è potuto leggere» con
      «è deciso» è la bugia peggiore che ci sia (§12, §18): si smette di
      cercare proprio dove c'è il buco.
   3. **Non propone mai il fatto, solo la prova.** Dove esiste una misura che
      aiuta a decidere — l'ultimo fondo cassa, un mezzo di pagamento che
      nessun conto riceve — la si mostra accanto alla voce. Resta una prova da
      guardare, non un valore da accettare: il giorno in cui una proposta si
      applica da sola, quel numero diventa un dato (§8.1) e nessuno saprà più
      che l'aveva scritto un programma.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'decisioni-2026-09-21';

  /* Gli stati sono QUATTRO, e il quarto è quello che conta. */
  var STATI = {
    aperta:    { l: 'da decidere',  peso: 0 },
    parziale:  { l: 'a metà',       peso: 1 },
    ignoto:    { l: 'non si sa',    peso: 2 },   /* la lettura non è riuscita */
    fatta:     { l: 'deciso',       peso: 4 },
    inerte:    { l: 'non serve',    peso: 3 }    /* non c'è niente sotto */
  };

  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function euro(n) {
    return (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  /* ── L'ELENCO DICHIARATO ──────────────────────────────────────────────────

     Sta qui e non nella schermata perché è un CONTRATTO: ogni voce nasce
     insieme alla regola che si rifiuta di indovinare, e chi scrive quella
     regola deve aggiungere la sua riga qui — altrimenti il sistema chiede in
     un posto che nessuno guarda, che è il modo in cui siamo arrivati a dodici
     posti diversi.

     `blocca` non è una descrizione: è la ragione per cui qualcuno si alzerà a
     farlo. Si scrive al presente e senza attenuanti. */
  var VOCI = [
    {
      k: 'conti_mezzi',
      titolo: 'Quali mezzi di pagamento arrivano su quale conto',
      perche: 'Un incasso in POS e uno in contanti non finiscono nello stesso posto, e il sistema non lo indovina: se nessun conto dichiara di ricevere un mezzo, o se due lo dichiarano, scrive «non si sa» e si ferma.',
      blocca: 'Gli incassi da accreditare restano fermi: il denaro è stato incassato e il conto non lo sa.',
      dove: 'conti', chi: 'admin', rif: 'Contabilità › Incassi da accreditare (§32)'
    },
    {
      k: 'cassa_contanti',
      titolo: 'La cassa contanti',
      perche: 'Fra i conti non ce n’è nessuno di tipologia «cassa». Senza, un incasso in contanti non ha dove andare e il fondo cassa ricostruito è zero.',
      blocca: 'Il fondo cassa della Contabilità resta a zero, e ogni incasso in contanti resta fuori.',
      dove: 'conti', chi: 'admin', rif: 'Contabilità › Quadratura di giornata (§33)'
    },
    {
      k: 'saldi_iniziali',
      titolo: 'Il saldo di partenza di ogni conto',
      perche: 'È l’unico numero che non si calcola: da lì in poi il saldo è la somma dei movimenti. Finché è zero, il saldo ricostruito parte da un numero che non è quello.',
      blocca: 'La quadratura confronta il saldo della banca con un ricostruito che parte da zero: la differenza è tutta apparente.',
      dove: 'conti', chi: 'admin', rif: 'Strumenti › Conti e causali (§26)'
    },
    {
      k: 'conto_rimesse',
      titolo: 'Su quale conto i collaboratori versano',
      perche: 'Un conto va marcato come quello delle rimesse, e deve avere un IBAN. Uno solo: due conti marcati sarebbero due coordinate diverse sullo stesso documento.',
      blocca: 'Gli estratti conto «da versare» escono senza coordinate, e lo dichiarano al collaboratore.',
      dove: 'conti', chi: 'admin', rif: 'Contabilità › Estratto conto (§34)'
    },
    {
      k: 'tariffe',
      titolo: 'Le aliquote provvigionali per compagnia e ramo',
      perche: 'Dove la compagnia non dichiara la provvigione nel flusso, il sistema può solo PREVEDERLA da un’aliquota concordata. Senza, non prevede niente.',
      blocca: 'Le provvigioni su quelle polizze restano «da confermare» e non entrano in nessun totale.',
      dove: 'compagnie', chi: 'admin', rif: 'Strumenti › Gestione compagnie (§28)'
    },
    {
      k: 'fidi',
      titolo: 'Quanto denaro dell’agenzia può tenere ogni collaboratore',
      perche: 'Un fido non dichiarato non vuol dire «illimitato»: vuol dire che nessuno ha deciso, e quel credito resta fuori dai totali col motivo scritto. Uno zero invece è un accordo, e si conta.',
      blocca: 'Il credito verso chi non ha un fido non entra nell’esposizione d’agenzia: quel numero è incompleto e lo dice.',
      dove: 'team', chi: 'admin', rif: 'Collaboratori › scheda › Fido (§41)'
    },
    {
      k: 'sospensioni_limite',
      titolo: 'Quanti giorni di sospensione ammette ogni compagnia',
      perche: 'Lo dichiara la compagnia, e ogni compagnia ha il suo. Dove nessuno l’ha scritto, i giorni si contano e il giudizio non si dà: «non si sa» non è «va bene».',
      blocca: 'Una sospensione fuori limite non viene segnalata da nessuno.',
      dove: 'compagnie', chi: 'admin', rif: 'Portafoglio › polizza sospesa (§41)'
    },
    {
      k: 'titoli_collaboratore',
      titolo: 'Di chi sono le rate del pregresso',
      perche: 'La colonna nasce vuota e non si riempie da sola: attribuire per somiglianza vuol dire pagare una provvigione a chi non doveva.',
      blocca: 'L’estratto conto di ogni collaboratore è vuoto, e il riepilogo d’agenzia ha una riga sola.',
      dove: 'quoto:titoli', chi: 'staff', rif: 'QUOTO › Titoli › assegna (§19)'
    },
    {
      k: 'codici_collaboratore',
      titolo: 'Chi è dietro ogni codice produttore della compagnia',
      perche: 'Il codice è stabile: la domanda si fa una volta sola e la risposta resta. Ma le righe da decidere le scrive l’importazione del flusso — finché non se ne importa uno, non c’è niente da decidere.',
      blocca: 'Le rate che arrivano dal flusso nascono senza un collaboratore, e vanno assegnate a mano una per una.',
      dove: 'quoto:titoli', chi: 'admin', rif: 'QUOTO › Titoli › codici (§19)'
    },
    {
      k: 'catalogo',
      titolo: 'Il catalogo dei prodotti di compagnia',
      perche: 'I prodotti esistono davvero sul portafoglio: portarli dentro è una cosa che si guarda prima di scrivere, e l’aggancio allo standard lo decide una persona.',
      blocca: 'Nella polizza scritta a mano il prodotto resta un campo libero, e nessuna tendina lo riconosce.',
      dove: 'catalogo', chi: 'admin', rif: 'Strumenti › Catalogo prodotti (§39)'
    }
  ];

  /* ── COME SI VALUTA UNA VOCE ──────────────────────────────────────────────

     `dati[k]` è quello che la schermata è riuscita a leggere. Tre forme, e la
     terza è il motivo per cui questa funzione esiste:

       { fatte: n, su: m }   → si sa, e si conta
       { inerte: true }      → non c'è niente sotto: la voce si spegne da sola
       null / undefined      → NON SI È POTUTO LEGGERE, e non è «a posto»

     Una voce che non ha niente sotto non è una decisione aperta: se non ci
     sono rate da assegnare, «assegna le rate» non va messo in un elenco di
     cose da fare — un elenco che contiene voci senza oggetto si impara a
     saltare per intero. */
  function valuta(voce, d) {
    if (d == null) {
      return { stato: 'ignoto', fatte: null, su: null,
               motivo: 'Non si è potuto leggere. Non vuol dire che sia deciso: vuol dire che non si sa.' };
    }
    if (d.inerte) {
      return { stato: 'inerte', fatte: 0, su: 0, motivo: d.motivo || 'Non c’è ancora niente da decidere qui.' };
    }
    var su = num(d.su), fatte = num(d.fatte);
    if (su == null || fatte == null) {
      return { stato: 'ignoto', fatte: null, su: null,
               motivo: 'I numeri di questa voce non si leggono.' };
    }
    if (su === 0) {
      return { stato: 'inerte', fatte: 0, su: 0, motivo: d.motivo || 'Non c’è ancora niente da decidere qui.' };
    }
    /* Una decisione presa a metà NON è fatta: la metà mancante è esattamente
       quella che un giorno manderà un incasso sul conto sbagliato. */
    var stato = fatte >= su ? 'fatta' : (fatte > 0 ? 'parziale' : 'aperta');
    return { stato: stato, fatte: fatte, su: su, motivo: d.motivo || null };
  }

  /* L'elenco, ordinato per quanto costa NON decidere: prima le aperte, poi le
     mezze, poi quelle che non si sono potute leggere, poi le inerti, e in
     fondo quelle a posto. Un ordine alfabetico metterebbe in cima la voce che
     capita, e chi apre questa schermata la apre per la prima riga. */
  function elenco(dati, opz) {
    opz = opz || {};
    var voci = (opz.voci || VOCI).map(function (v) {
      var e = valuta(v, (dati || {})[v.k]);
      var out = {};
      for (var kk in v) if (Object.prototype.hasOwnProperty.call(v, kk)) out[kk] = v[kk];
      out.stato = e.stato; out.fatte = e.fatte; out.su = e.su; out.motivo = e.motivo;
      out.etichetta = STATI[e.stato] ? STATI[e.stato].l : e.stato;
      out.prove = ((dati || {})[v.k] && (dati || {})[v.k].prove) || [];
      return out;
    });
    voci.sort(function (a, b) {
      var pa = STATI[a.stato] ? STATI[a.stato].peso : 9;
      var pb = STATI[b.stato] ? STATI[b.stato].peso : 9;
      if (pa !== pb) return pa - pb;
      /* A parità di stato, prima quella che ne ha di più da decidere. */
      return (b.su - b.fatte) - (a.su - a.fatte);
    });
    return voci;
  }

  /* Il riepilogo. `da_decidere` NON comprende le voci che non si sono potute
     leggere: un conteggio di lavori da fare che contiene dei forse è lo
     stesso difetto del riepilogo dei collegamenti (§12-bis), e qui sarebbe
     peggio, perché è il numero che dice «hai finito». */
  function riepilogo(voci) {
    var r = { totale: voci.length, aperte: 0, parziali: 0, fatte: 0, inerti: 0, ignote: 0, da_decidere: 0 };
    voci.forEach(function (v) {
      if (v.stato === 'aperta') { r.aperte++; r.da_decidere++; }
      else if (v.stato === 'parziale') { r.parziali++; r.da_decidere++; }
      else if (v.stato === 'fatta') r.fatte++;
      else if (v.stato === 'inerte') r.inerti++;
      else r.ignote++;
    });
    /* «Tutto deciso» si può dire solo se non è rimasto niente E si è potuto
       guardare dappertutto. */
    r.tutto_deciso = r.da_decidere === 0 && r.ignote === 0;
    return r;
  }

  /* ── LE PROVE ─────────────────────────────────────────────────────────────

     Una misura che aiuta a decidere, mai il valore da scrivere. La differenza
     è tutta qui: «l'ultimo foglio cassa dice 276,00 €» si può controllare e
     smentire; un campo precompilato con 276,00 diventa il fondo cassa vero
     dopo due settimane, e nessuno saprà che l'aveva scritto un programma. */
  function proveMezzi(conti, usati) {
    var coperti = {}, doppi = {};
    (conti || []).forEach(function (c) {
      if (!c || c.attivo === false) return;
      (c.mezzi || []).forEach(function (m) {
        if (coperti[m]) doppi[m] = true;
        coperti[m] = (coperti[m] || 0) + 1;
      });
    });
    var out = [];
    Object.keys(usati || {}).forEach(function (m) {
      if (!m || m === '(non dichiarato)') return;
      if (!coperti[m]) {
        out.push({ grave: true, testo: '«' + m + '» è il mezzo di ' + usati[m]
          + (usati[m] === 1 ? ' rata' : ' rate') + ' e nessun conto dichiara di riceverlo.' });
      } else if (doppi[m]) {
        out.push({ grave: true, testo: '«' + m + '» è dichiarato da più di un conto: il sistema non sceglie.' });
      }
    });
    return out;
  }

  function proveCassa(ultimaGiornata) {
    if (!ultimaGiornata || ultimaGiornata.fondo_cassa == null) return [];
    return [{ grave: false, testo: 'L’ultimo foglio cassa (' + (ultimaGiornata.data || 'data ignota')
      + ') dichiara un fondo di ' + euro(ultimaGiornata.fondo_cassa)
      + '. È una misura da guardare, non un valore da accettare: il saldo di partenza lo scrive chi ha contato il cassetto.' }];
  }

  var API = {
    VERSIONE: VERSIONE, VOCI: VOCI, STATI: STATI,
    valuta: valuta, elenco: elenco, riepilogo: riepilogo,
    proveMezzi: proveMezzi, proveCassa: proveCassa, euro: euro
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Decisioni = API;
})();
