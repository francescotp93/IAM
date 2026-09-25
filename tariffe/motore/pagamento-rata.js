/* ═══════════════════════════════════════════════════════════════════════════════
   LO STATO DI PAGAMENTO DI UNA RATA                              (25/09/2026)

   «Le rate che arrivano dai flussi di compagnia devono andare in incasso o in
   sospeso in automatico, in base all'incasso messo in contabilità dalla
   compagnia — sempre con la possibilità di modificare il pagamento.»
                                                              — Francesco

   Questo file è l'UNICO posto in cui si decide. Prima la regola stava in due
   punti diversi, uno per flusso, e diceva due cose diverse:

     · l'SSF guardava la contabilità della compagnia (`stato === 'P'` e la data
       di pagamento) — giusto;
     · l'HDI guardava la PAROLA scritta sulla rata («incassato») invece del
       record di incasso — cioè si fidava di un'etichetta invece che del fatto.

   Sul file HDI del 22/09/2026 le due cose coincidevano (12 rate incassate, 12
   con l'incasso in allegato), quindi il difetto non si vedeva. Ma un'etichetta
   e un movimento contabile non sono la stessa cosa, e il giorno in cui si
   scollano è il giorno in cui l'agenzia crede di aver incassato soldi che non
   ha.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ TRE STATI, NON DUE. E il terzo è quello che conta.                        │
   └───────────────────────────────────────────────────────────────────────────┘

     `incassato`     la compagnia ha registrato l'incasso. Ci sono i soldi.
     `sospeso`       il cliente è coperto ma il premio non è stato saldato:
                     l'SSF lo dice con lo stato `SP`. Sono 51 polizze vere al
                     25/09/2026. NON è «non pagato»: è un credito, e finisce
                     nell'elenco dei sospesi da scaricare.
     `da_incassare`  la compagnia non dice niente. Non si inventa.

   Il quarto caso, `annullata`, non è uno stato di pagamento: è una polizza che
   non c'è più. Resta fuori di proposito.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ «SEMPRE CON LA POSSIBILITÀ DI MODIFICARE» — e la modifica deve RESTARE.   │
   └───────────────────────────────────────────────────────────────────────────┘
   Questo è il pezzo che non si vede e che rompe tutto. Se Francesco corregge a
   mano una rata e il mese dopo il flusso la riporta indietro, la correzione non
   è servita a niente e nessuno se ne accorge: il numero torna quello di prima,
   plausibile e sbagliato.

   Quindi `decide()` riceve anche quello che c'è GIÀ in archivio, e ha una
   regola sola: **la mano di Francesco vince sempre sul flusso**. Il flusso può
   riempire un buco, mai smentire una decisione presa da una persona.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STATI = {
    incassato: 'Incassato',
    sospeso: 'Sospeso',
    da_incassare: 'Da incassare',
  };

  /* Quello che la colonna `quote_titoli.stato` sa reggere: il vincolo del
     database ammette aperto/incassato/insoluto/stornato/annullato, e
     «sospeso» non c'è. Non lo si allarga: un sospeso, per quella colonna, è
     una rata aperta — il dettaglio vive in `pagamento`, che è la colonna
     nuova. Così le schermate che leggono `stato` continuano a funzionare. */
  function versoStato(pagamento) {
    return pagamento === 'incassato' ? 'incassato' : 'aperto';
  }

  function giorno(v) {
    var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v == null ? '' : v));
    return m ? m[1] : null;
  }

  /* ── DAL FLUSSO ────────────────────────────────────────────────────────────
     `prove` è quello che il flusso dice, e ogni campo è facoltativo:

       incassoContabile  il movimento di incasso della compagnia (record 80 di
                         HDI, o la data di pagamento dell'SSF). È IL FATTO.
       dichiaratoPagato  la compagnia dice «pagato» (stato 'P').
       dichiaratoSospeso la compagnia dice «sospeso» (stato 'SP').

     L'ordine conta, ed è questo di proposito: il movimento contabile batte la
     parola. Una compagnia che scrive «pagato» senza mandare l'incasso sta
     dicendo che la rata è a posto sui SUOI libri, non che i soldi siano
     arrivati qui. */
  function dalFlusso(prove) {
    var p = prove || {};
    if (giorno(p.incassoContabile)) return 'incassato';
    if (p.dichiaratoSospeso) return 'sospeso';
    /* «PAGATO» SENZA L'INCASSO, e perché non è né l'una né l'altra cosa.

       Non è `incassato`: quella parola, in cassa, vale soldi, e qui i soldi
       non si sono visti. Ma non è nemmeno `sospeso`: un sospeso è un credito
       dell'agenzia verso qualcuno, e se la compagnia dichiara la rata pagata
       sui suoi libri quel credito non c'è — metterla lì gonfierebbe l'elenco
       dei sospesi da scaricare con roba che nessuno deve scaricare.

       Resta `da_incassare`, che è il verso prudente (non si afferma di avere
       soldi), MA con la riga marcata: `dichiaratoSenzaIncasso` dice a chi
       guarda che la compagnia la dà per pagata e l'incasso non è arrivato.
       Una casella storta che si vede è un problema; una nascosta dentro un
       totale è un problema che diventa un numero. */
    return 'da_incassare';
  }

  /* Vero quando la compagnia dichiara pagato e l'incasso non c'è: da mostrare,
     non da sommare. Sta qui e non dentro `dalFlusso` perché è un'avvertenza
     sulla riga, non un quarto stato. */
  function dichiaratoSenzaIncasso(prove) {
    var p = prove || {};
    return !!(p.dichiaratoPagato && !giorno(p.incassoContabile) && !p.dichiaratoSospeso);
  }

  /* ── LA MANO DI FRANCESCO ──────────────────────────────────────────────────
     `esistente` è la riga già in archivio, o null se la rata è nuova.
     Torna sempre il perché, perché una schermata che dice «incassato» senza
     dire da dove viene costringe a fidarsi. */
  function decide(prove, esistente) {
    var dalF = dalFlusso(prove);
    var avviso = dichiaratoSenzaIncasso(prove);
    var e = esistente || null;

    if (!e) {
      return { pagamento: dalF, stato: versoStato(dalF), fonte: 'flusso', cambia: true,
        dichiaratoSenzaIncasso: avviso,
        perche: 'rata nuova: la decide il flusso della compagnia' };
    }

    /* REGOLA UNICA E NON NEGOZIABILE. Se qualcuno l'ha messa a mano, il flusso
       non la tocca — nemmeno per «correggerla». Se il flusso dice una cosa
       diversa lo si DICE, così Francesco può guardare; ma non si scrive. */
    if (e.pagamento_a_mano) {
      var attuale = e.pagamento || 'da_incassare';
      return {
        pagamento: attuale, stato: versoStato(attuale), fonte: 'mano', cambia: false,
        dichiaratoSenzaIncasso: avviso,
        discorda: dalF !== attuale ? dalF : null,
        perche: dalF !== attuale
          ? 'messa a mano: resta «' + (STATI[attuale] || attuale) + '», il flusso direbbe «' + (STATI[dalF] || dalF) + '»'
          : 'messa a mano, e il flusso dice la stessa cosa',
      };
    }

    var prima = e.pagamento || null;
    if (prima === dalF) {
      return { pagamento: prima, stato: versoStato(prima), fonte: 'flusso', cambia: false,
        dichiaratoSenzaIncasso: avviso,
        perche: 'il flusso conferma quello che c\'era' };
    }

    /* IL BUCO CHE SI CHIUDE. Fino a oggi l'importazione, su una rata già in
       archivio, non faceva niente: se il mese dopo la compagnia incassava, il
       portafoglio restava indietro per sempre. Adesso si aggiorna — ma solo
       quando nessuno l'ha toccata a mano. */
    return { pagamento: dalF, stato: versoStato(dalF), fonte: 'flusso', cambia: true,
      dichiaratoSenzaIncasso: avviso,
      perche: prima
        ? 'il flusso la porta da «' + (STATI[prima] || prima) + '» a «' + (STATI[dalF] || dalF) + '»'
        : 'il flusso dice «' + (STATI[dalF] || dalF) + '»' };
  }

  /* ── LA POLIZZA SEGUE LE SUE RATE ──────────────────────────────────────────
     Oggi non è così, ed è un difetto vero: le 18 polizze HDI dicono «non
     pagato» mentre 12 delle loro rate sono incassate. Chi guarda la polizza
     vede una cosa e chi guarda la rata ne vede un'altra.

     La regola, nell'ordine in cui si legge a voce: se c'è anche un solo
     sospeso, la polizza è sospesa — è il caso che va guardato, e nasconderlo
     dietro una media sarebbe il modo più facile di perderlo. Se non ci sono
     sospesi e almeno una rata è incassata, la polizza è pagata. Se non c'è
     niente, non pagata. Il vocabolario è quello che `quote_polizze` usa già. */
  function statoPolizza(pagamenti) {
    var l = [].concat(pagamenti || []).filter(Boolean);
    if (!l.length) return 'non_pagato';
    if (l.indexOf('sospeso') >= 0) return 'sospeso';
    if (l.indexOf('incassato') >= 0) return 'pagato';
    return 'non_pagato';
  }

  var API = {
    STATI: STATI,
    versoStato: versoStato,
    dichiaratoSenzaIncasso: dichiaratoSenzaIncasso,
    dalFlusso: dalFlusso,
    decide: decide,
    statoPolizza: statoPolizza,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PagamentoRata = API;
})();
