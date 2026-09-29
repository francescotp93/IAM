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
  /* ══ LA REGOLA DI CASA, COMPAGNIA PER COMPAGNIA (28/09/2026) ═══════════════

     «I flussi che carico da Prima me li devi dare in automatico incassati e non
      come sospesi, sarò io a cambiare le varie modalità di pagamento. Quelli
      che carico da HDI, come pos, bonifici, carta HDI (questa modalità è
      finanziamento Agos), questi me li devi dare come sospesi e poi sarò io ad
      abbinarli una volta incassati. Quello che è contanti me lo devi aggiungere
      nella cassa contanti in automatico.»                        — Francesco

     Non è una preferenza: è la differenza fisica fra i due canali, e finché non
     sta scritta qui ogni schermata la deve indovinare.

     ┌─────────────────────────────────────────────────────────────────────────┐
     │ PRIMA — i soldi non passano MAI dall'agenzia.                           │
     └─────────────────────────────────────────────────────────────────────────┘
     Il cliente paga la compagnia direttamente. Lo dice l'archivio, non una
     teoria: dei 2.787 incassi Prima, 1.078 sono carta di credito, 632
     prepagata, 425 PayPal, 36 bonifico. L'agenzia non tocca quel denaro.

     Quindi un titolo Prima **non può essere un sospeso**: un sospeso è un
     credito dell'agenzia verso qualcuno, e qui quel credito non esiste.
     Metterlo nell'elenco dei sospesi vuol dire gonfiarlo di roba che nessuno
     deve scaricare.

     E la COPERTURA vale come prova dell'incasso. Prima incassa e poi copre: se
     la compagnia dichiara la polizza coperta fino a una data, le rate che
     decorrono prima di quella data le ha incassate lei — anche quando non
     manda la data di pagamento.

     Misurato il 28/09/2026 sui 379 titoli Prima non incassati in archivio:
       ·  83 (22.717,18 €) la compagnia li dà coperti a quella data → incassati
       · 271 (68.769,60 €) sono rate FUTURE
       ·  25 ( 6.302,06 €) sono decorsi e NON coperti

     Le 83 diventano incassate. Le 271 no: una rata che deve ancora decorrere
     non può essere stata incassata, e chiamarla così metterebbe 68.769,60 € di
     soldi immaginari nella cassa della giornata. Le 25 nemmeno: sono rate
     decorse che la compagnia non copre, cioè clienti scoperti — il caso che le
     schermate esistono per far vedere, non per nascondere.

     ┌─────────────────────────────────────────────────────────────────────────┐
     │ HDI — i soldi passano dall'agenzia, e l'agenzia li deve alla compagnia. │
     └─────────────────────────────────────────────────────────────────────────┘
     POS, bonifico e carta HDI (il finanziamento Agos) arrivano all'agenzia e
     vanno rimessi: è la definizione di sospeso. L'incasso del flusso dice che
     il CLIENTE ha pagato, non che la compagnia abbia avuto i suoi soldi, e
     confondere le due cose è il modo in cui un'agenzia si crede pari e non lo
     è. Restano sospesi finché Francesco non li abbina.

     Il contante no: è già in casa. Va in cassa contanti, e la riga lo dichiara
     (`inCassaContanti`), perché è la cassa a doverlo sapere.

     Quello che Francesco non ha nominato — assegno, domiciliazione — resta come
     lo decide il flusso. Non si estende una regola a mezzi di cui nessuno ha
     parlato. */
  var MEZZI_SOSPESO_HDI = ['pos', 'bonifico', 'finanziamento'];

  function chiave(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

  /* La copertura dichiarata dalla compagnia supera la decorrenza della rata?
     Servono tutte e due le date: senza, non si sa, e non si suppone.

     IL CONFRONTO È STRETTO, e il motivo vale un semestre. «Coperta fino al
     16/03/2027» vuol dire che la copertura FINISCE quel giorno: la rata che
     decorre dal 16/03/2027 è proprio quella che la prolunga, e non è pagata.
     Con `>=` invece di `>` quella rata risultava incassata — sul campione è la
     polizza NP-0002, semestrale, di cui Prima ha incassato il primo semestre e
     non il secondo. La prova del campione l'ha presa al primo colpo; in
     archivio sarebbero stati 1.034 semestrali da guardare uno per uno. */
  function copertaAllaData(prove) {
    var p = prove || {};
    var fino = giorno(p.copertaFinoAl), dec = giorno(p.decorrenza);
    return !!(fino && dec && fino > dec);
  }

  /* Il contante entra in cassa da solo, da qualunque flusso arrivi: il contante
     è contante. Ma solo se qualcuno dice che è stato pagato — una rata futura
     in contanti non è denaro che c'è, è denaro che arriverà. */
  function inCassaContanti(prove) {
    var p = prove || {};
    if (chiave(p.mezzo) !== 'contante') return false;
    return !!(giorno(p.incassoContabile) || p.dichiaratoPagato || copertaAllaData(p));
  }

  function dalFlusso(prove) {
    var p = prove || {};
    var fonte = chiave(p.fonte);
    var mezzo = chiave(p.mezzo);

    /* HDI, i tre mezzi che passano per l'agenzia: sospeso, e l'incasso del
       flusso non lo cambia — anzi, è proprio quell'incasso a creare il debito
       verso la compagnia. */
    if (fonte === 'hdi' && MEZZI_SOSPESO_HDI.indexOf(mezzo) >= 0) return 'sospeso';

    if (giorno(p.incassoContabile)) return 'incassato';

    /* Prima: la copertura dichiarata dalla compagnia vale come incasso. */
    if (fonte === 'ssf' && copertaAllaData(p)) return 'incassato';

    /* Prima non ha sospesi: quello che il flusso chiama sospeso resta da
       incassare — si vede, si chiama, ma non entra nel debito dell'agenzia. */
    if (p.dichiaratoSospeso) return fonte === 'ssf' ? 'da_incassare' : 'sospeso';
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
    /* La cassa contanti la decide il MEZZO, non lo stato del pagamento: il
       contante è in casa comunque, e il giorno in cui uno dei due cambia
       l'altro non deve seguirlo per sbaglio. Sta sulla risposta di `decide`
       perché chi importa un flusso legge una cosa sola. */
    var cassa = inCassaContanti(prove);
    var e = esistente || null;

    if (!e) {
      return { pagamento: dalF, stato: versoStato(dalF), fonte: 'flusso', cambia: true,
        dichiaratoSenzaIncasso: avviso, inCassaContanti: cassa,
        perche: 'rata nuova: la decide il flusso della compagnia' };
    }

    /* REGOLA UNICA E NON NEGOZIABILE. Se qualcuno l'ha messa a mano, il flusso
       non la tocca — nemmeno per «correggerla». Se il flusso dice una cosa
       diversa lo si DICE, così Francesco può guardare; ma non si scrive. */
    if (e.pagamento_a_mano) {
      var attuale = e.pagamento || 'da_incassare';
      return {
        pagamento: attuale, stato: versoStato(attuale), fonte: 'mano', cambia: false,
        dichiaratoSenzaIncasso: avviso, inCassaContanti: cassa,
        discorda: dalF !== attuale ? dalF : null,
        perche: dalF !== attuale
          ? 'messa a mano: resta «' + (STATI[attuale] || attuale) + '», il flusso direbbe «' + (STATI[dalF] || dalF) + '»'
          : 'messa a mano, e il flusso dice la stessa cosa',
      };
    }

    var prima = e.pagamento || null;
    if (prima === dalF) {
      return { pagamento: prima, stato: versoStato(prima), fonte: 'flusso', cambia: false,
        dichiaratoSenzaIncasso: avviso, inCassaContanti: cassa,
        perche: 'il flusso conferma quello che c\'era' };
    }

    /* IL BUCO CHE SI CHIUDE. Fino a oggi l'importazione, su una rata già in
       archivio, non faceva niente: se il mese dopo la compagnia incassava, il
       portafoglio restava indietro per sempre. Adesso si aggiorna — ma solo
       quando nessuno l'ha toccata a mano. */
    return { pagamento: dalF, stato: versoStato(dalF), fonte: 'flusso', cambia: true,
      dichiaratoSenzaIncasso: avviso, inCassaContanti: cassa,
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
    MEZZI_SOSPESO_HDI: MEZZI_SOSPESO_HDI,
    versoStato: versoStato,
    dichiaratoSenzaIncasso: dichiaratoSenzaIncasso,
    copertaAllaData: copertaAllaData,
    inCassaContanti: inCassaContanti,
    dalFlusso: dalFlusso,
    decide: decide,
    statoPolizza: statoPolizza,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PagamentoRata = API;
})();
