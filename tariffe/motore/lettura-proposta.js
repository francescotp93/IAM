/* ═══════════════════════════════════════════════════════════════════════════════
   LEGGERE UNA PROPOSTA DI POLIZZA                   (02/10/2026, brief M7 · 3)

   Richiesta di Francesco: «sarebbe anche utile poter integrare l'intelligenza
   artificiale per la creazione di un preventivo personalizzato caricando le
   proposte di polizza».

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 1 — LA MISURA CHE HA DECISO COME È FATTO QUESTO FILE.                     │
   └───────────────────────────────────────────────────────────────────────────┘
   Misurato il 02/10/2026 su un set informativo auto vero, 61 pagine: le righe
   che portano un importo in forma leggibile sono **CINQUE**. E in tutte e
   cinque il nome della garanzia è spezzato sulla riga prima:

       naturali 1.000,00 € 500,00 € 300,00 €
       eventi socio politici 1.000,00 € 500,00 € 300,00 €

   «naturali» è la coda di «Eventi naturali», e i tre importi non sono tre
   massimali: sono la franchigia per Area 1, Area 2 e Area 3 di una tabella che
   l'estrattore ha appiattito.

   Un lettore che prende le righe come vengono non legge il documento: lo
   indovina. Da qui le due regole di questo file.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 2 — SI PROPONE, NON SI LEGGE. E OGNI PROPOSTA PORTA LA PAGINA.            │
   └───────────────────────────────────────────────────────────────────────────┘
   Questo motore non dice «la polizza ha queste garanzie». Dice: «in questo
   documento, a pagina 8, c'è questa riga, e mi SEMBRA la garanzia X». Chi
   prepara il preventivo guarda e conferma.

   Non è un ripiego in attesa di qualcosa di meglio: è la forma giusta. I
   numeri che escono di qui finiscono su un foglio che va a un cliente, e un
   massimale letto male è un massimale promesso male.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 3 — IL DOCUMENTO NON ESCE DAL BROWSER.                                    │
   └───────────────────────────────────────────────────────────────────────────┘
   Una proposta di polizza porta nome, indirizzo, codice fiscale e targa del
   cliente. Mandarla a un servizio esterno per farsela leggere è esattamente
   quello che le regole di casa vietano («dati di clienti e collaboratori non
   vanno incollati in ricerche web o servizi esterni»).

   Qui non si manda niente da nessuna parte: il testo si estrae nel browser e
   si legge nel browser. Il riconoscimento delle garanzie lo fa il vocabolario
   di `confronto.js` — lo stesso del confronto fra prodotti e della guida —
   che è scritto, rileggibile e provato.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'lettura-proposta-2026-10-02';

  function motoreConfronto() {
    if (typeof window !== 'undefined' && window.Confronto) return window.Confronto;
    if (typeof require === 'function') { try { return require('./confronto.js'); } catch (e) { return null; } }
    return null;
  }
  function motoreGuida() {
    if (typeof window !== 'undefined' && window.GuidaGaranzie) return window.GuidaGaranzie;
    if (typeof require === 'function') { try { return require('./guida-garanzie.js'); } catch (e) { return null; } }
    return null;
  }

  function testo(v) { return v == null ? '' : String(v).trim(); }

  /* Un importo all'italiana, dovunque nella riga, con l'euro PRIMA o DOPO il
     numero. Misurato sul documento vero: davanti 79 volte, dietro 2. */
  var R_IMPORTO = /(?:\d[\d.\s]*(?:,\d+)?\s*(?:€|eur\b|euro\b)|(?:€|eur\b|euro\b)\s*\d)/i;

  /* Le righe che NON sono garanzie, per quanto portino un numero. Un documento
     di compagnia è pieno di prosa con dentro delle cifre: senza questo filtro
     la proposta di righe diventa illeggibile e nessuno la guarda — che è il
     modo più sicuro di far passare un errore. */
  var RUMORE = [
    /^\s*(pag(ina)?\.?\s*\d|\d+\s*(di|\/)\s*\d+)\s*$/i,
    /codice fiscale|partita iva|iscrizione .*albo|sede legale|capitale sociale/i,
    /^\s*(art|articolo|comma|lett)\b/i,
    /tasso di interesse|imposta di bollo|spese di emissione/i
  ];
  function rumore(riga) {
    for (var i = 0; i < RUMORE.length; i++) if (RUMORE[i].test(riga)) return true;
    return false;
  }

  /* ── IL NOME SPEZZATO SULLA RIGA PRIMA ────────────────────────────────────
     È il caso VERO, misurato: «naturali 1.000,00 €…» con «Eventi» che sta
     sopra. Si prova ad attaccare la coda della riga precedente e si tiene solo
     se COSÌ la garanzia si riconosce. Attaccarla sempre peggiorerebbe i nomi
     già buoni; attaccarla mai lascerebbe fuori proprio le righe delle tabelle,
     che sono quelle coi massimali. */
  function ricuci(nome, prima, dopo, rami) {
    var C = motoreConfronto();
    if (!C || !C.normalizzaFra) return { nome: nome, id: null, ricucito: false };
    var dritto = C.normalizzaFra(rami, nome);
    if (dritto) return { nome: nome, id: dritto, ricucito: false };

    var parole = testo(prima).split(/\s+/).filter(Boolean);
    if (!parole.length) return { nome: nome, id: null, ricucito: false };

    /* SI PROVA DALLA TESTA, non solo dalla coda — ed è la testa che funziona.
       La riga vera, misurata a pagina 44:

           «Eventi Franchigia Franchigia Franchigia»
           «naturali 1.000,00 € 500,00 € 300,00 €»

       Il nome è «Eventi naturali»: «Eventi» apre la riga sopra e il resto di
       quella riga sono le ETICHETTE DI COLONNA della tabella appiattita.
       Cercando solo in coda si prendeva «Franchigia naturali», che non è
       niente. Si prova prima la testa, poi la coda: la prima combinazione che
       il vocabolario riconosce vince, e se non ne vince nessuna il nome resta
       quello che era e si dichiara da sistemare. */
    var tentativi = [], n;
    for (n = 1; n <= Math.min(4, parole.length); n++) tentativi.push(parole.slice(0, n).join(' '));
    for (n = 1; n <= Math.min(4, parole.length); n++) tentativi.push(parole.slice(parole.length - n).join(' '));

    /* E IL NOME PUÒ CONTINUARE ANCHE SOTTO. Misurato a pagina 38:

           «Guasti Franchigia Franchigia Franchigia»
           «cagionati 2.000,00 € 1.000,00 € 500,00 €»
           «dai ladri»

       è «Guasti cagionati dai ladri», spezzata su TRE righe. Guardando solo
       all'indietro restava «Guasti cagionati», che non è una garanzia. */
    var sotto = testo(dopo).split(/\s+/).filter(Boolean).slice(0, 3);
    var code = [''];
    for (n = 1; n <= sotto.length; n++) code.push(sotto.slice(0, n).join(' '));

    for (var i = 0; i < tentativi.length; i++) {
      for (var j = 0; j < code.length; j++) {
        var prova = (tentativi[i] + ' ' + nome + ' ' + code[j]).replace(/\s+/g, ' ').trim();
        var id = C.normalizzaFra(rami, prova);
        if (id) return { nome: prova, id: id, ricucito: true };
      }
    }
    /* Anche senza niente davanti: il nome puo' essere completo e continuare solo sotto. */
    for (var k = 1; k < code.length; k++) {
      var solo = (nome + ' ' + code[k]).replace(/\s+/g, ' ').trim();
      var idSolo = C.normalizzaFra(rami, solo);
      if (idSolo) return { nome: solo, id: idSolo, ricucito: true };
    }
    return { nome: nome, id: null, ricucito: false };
  }

  /* ── CHE COSA SONO QUEI NUMERI, LO DICE L'INTESTAZIONE ────────────────────
     «Eventi Franchigia Franchigia Franchigia» sopra «naturali 1.000,00 €
     500,00 € 300,00 €»: i tre importi sono tre FRANCHIGIE per area, non tre
     massimali. La riga da sola non lo direbbe mai; la riga sopra sì.

     Si guarda solo quando l'intestazione nomina una cosa sola: se dice sia
     «franchigia» sia «massimale», non si sa a quale colonna appartenga quale
     numero, e indovinare sarebbe peggio che non dire niente. */
  function naturaImporti(prima) {
    var t = testo(prima).toLowerCase();
    var f = /franchigia|franchigie|scoperto/.test(t);
    var m = /massimale|massimali|somma assicurata|limite di indennizzo|capitale/.test(t);
    if (f && !m) return 'franchigia';
    if (m && !f) return 'massimale';
    return null;
  }

  /* ── I CANDIDATI ──────────────────────────────────────────────────────────
     `pagine` è [{ n, testo }] — quello che l'estrattore tira fuori dal PDF,
     una voce per pagina. Torna le righe che SEMBRANO garanzie, ognuna con la
     pagina da cui viene, più l'elenco di quello che si è lasciato fuori e
     perché: una riga scartata in silenzio è una garanzia che sparisce dal
     preventivo senza che nessuno lo sappia. */
  function candidati(pagine, opz) {
    opz = opz || {};
    var G = motoreGuida();
    var rami = Array.isArray(opz.rami) && opz.rami.length ? opz.rami
             : ['casa', 'salute', 'vita', 'azienda', 'auto'];
    if (!G) return { ok: false, motivo: 'Il motore della guida non è caricato: senza, una riga non si sa leggere.',
                     righe: [], scartate: [], pagine: 0 };

    var righe = [], scartate = [], quante = 0;
    (pagine || []).forEach(function (p) {
      var num = p && p.n != null ? p.n : null;
      var linee = testo(p && p.testo).split(/\r?\n/);
      quante++;
      linee.forEach(function (l, i) {
        var t = testo(l);
        if (!t) return;
        if (!R_IMPORTO.test(t)) return;              /* senza un importo non è una riga di garanzia */
        if (rumore(t)) { scartate.push({ pagina: num, riga: t, perche: 'sembra intestazione o testo di legge' }); return; }

        var letta = G.leggiRiga(t, rami);
        if (!letta || letta.tipo !== 'garanzia' || !letta.voci.length) {
          scartate.push({ pagina: num, riga: t, perche: 'non si è potuto separare nome e importo' });
          return;
        }
        /* SI RICUCE SOLO CON RIGHE CHE NON PORTANO UN IMPORTO. Una riga che
           ha gia' una cifra e' una riga di garanzia per conto suo, non il
           pezzo mancante del nome di questa: attaccarla vuol dire fondere due
           garanzie in una. Nel documento vero le righe-frammento — «Eventi
           Franchigia Franchigia Franchigia» — di importi non ne hanno nessuno,
           ed e' proprio quello che le rende frammenti.
           L'ha trovato una prova: «Pincopallo € 100,00» si ricuciva con la
           riga sopra e diventava «Garanzia Cristalli Pincopallo». */
        var sopra = linee[i - 1] && !R_IMPORTO.test(linee[i - 1]) ? linee[i - 1] : '';
        var sotto = linee[i + 1] && !R_IMPORTO.test(linee[i + 1]) ? linee[i + 1] : '';
        var r = ricuci(letta.nome, sopra, sotto, rami);
        /* Una riga che il vocabolario non riconosce e che è lunga come una
           frase NON è una garanzia: è prosa del contratto con dentro una
           cifra. Sul documento vero sono «La garanzia è prestata con il limite
           massimo di 100,00 € per ogni sinistro» e «concorrenza di 500,00 €
           per ogni sinistro»: proporle come garanzie riempirebbe l'elenco di
           roba da buttare, e un elenco che nessuno guarda è il modo più sicuro
           di far passare un errore vero. */
        if (!r.id && /\b(di|del|della|dei|delle|da|dal|per|con|in|su|a|al|alla|e|ed|o)$/i.test(r.nome)) {
          /* «concorrenza di 500,00 €»: un nome che finisce con una
             preposizione è un pezzo di frase tagliato, non una garanzia. */
          scartate.push({ pagina: num, riga: t, perche: 'il nome è un pezzo di frase tagliato a metà' });
          return;
        }
        if (!r.id && r.nome.split(/\s+/).length > 6) {
          scartate.push({ pagina: num, riga: t, perche: 'sembra una frase del contratto, non una garanzia' });
          return;
        }
        var natura = naturaImporti(sopra);
        righe.push({
          pagina: num, riga: t,
          nome: r.nome, id: r.id, ricucito: r.ricucito,
          voci: letta.voci, franchigia: letta.franchigia, natura: natura,
          /* Più importi sulla stessa riga, su un documento di compagnia, quasi
             sempre vogliono dire una TABELLA appiattita — tre franchigie per
             area, non tre massimali. Si dichiara e si fa guardare. */
          daGuardare: letta.voci.length > 2 ? 'la riga porta ' + letta.voci.length + ' importi'
              + (natura ? ', e l\'intestazione sopra dice «' + natura + '»' : '')
              + ': sul documento è quasi sempre una tabella, e qui è diventata una riga sola'
            : !r.id ? 'la garanzia non si riconosce: il nome va sistemato a mano'
            : r.ricucito ? 'il nome è stato ricucito con la riga precedente: controlla che sia quello giusto'
            : null
        });
      });
    });

    /* ── L'ORDINE DI FIDUCIA ───────────────────────────────────────────────
       Misurato il 02/10/2026: sullo stesso documento vero, leggendo anche gli
       importi con l'euro davanti, le righe candidate passano da 3 a 47. Le
       garanzie buone ci sono tutte — compresi i massimali della RCA, che
       prima si perdevano — ma ci sono anche decine di frammenti di prosa.

       Su un SET INFORMATIVO e' inevitabile: i massimali stanno dentro le
       frasi. Su una PROPOSTA DI POLIZZA, che e' una tabella, il rumore e'
       molto meno. In tutt'e due i casi chi guarda deve trovare in cima quelle
       di cui ci si puo' fidare, o l'elenco non lo legge nessuno — e un elenco
       che nessuno legge e' il modo piu' sicuro di far passare un errore.

       Si ordina per: garanzia riconosciuta, nome corto (un nome lungo e' una
       frase), un importo solo (piu' importi = tabella appiattita). */
    righe.forEach(function (x) {
      var punti = 0;
      if (x.id) punti += 100;
      punti -= Math.min(40, x.nome.split(/\s+/).length * 4);
      if (x.voci.length === 1) punti += 10;
      if (x.ricucito) punti -= 5;
      x.fiducia = punti;
    });
    righe.sort(function (a, b) { return b.fiducia - a.fiducia || a.pagina - b.pagina; });

    return {
      ok: righe.length > 0,
      riconosciute: righe.filter(function (x) { return !!x.id; }).length,
      motivo: righe.length ? null
        : 'In questo documento non si è trovata nessuna riga con un nome di garanzia e un importo. '
          + 'Succede: in un set informativo i massimali stanno nella prosa, non in tabella. '
          + 'Le righe si possono scrivere a mano qui sotto.',
      righe: righe, scartate: scartate, pagine: quante,
      daGuardare: righe.filter(function (x) { return !!x.daGuardare; }).length
    };
  }

  /* Le righe scelte, nella forma che vuole il preventivo: testo libero, come
     se le avesse scritte una persona. È il formato che la guida già sa
     leggere, e non se ne inventa un secondo. */
  function versoDescrizioni(righe) {
    var G = motoreGuida();
    return (righe || []).filter(Boolean).map(function (r) {
      var imp = G ? G.importoScritto(r.voci) : '';
      return (r.nome + (imp ? ' ' + imp : '')).replace(/\s+/g, ' ').trim();
    });
  }

  var API = { VERSIONE: VERSIONE, candidati: candidati, versoDescrizioni: versoDescrizioni, ricuci: ricuci };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.LetturaProposta = API;
})();
