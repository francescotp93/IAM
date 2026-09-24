/* ═══════════════════════════════════════════════════════════════════════════════
   IL PORTAFOGLIO DI HDI — tracciato PASS-133  (24/09/2026)

   Che cos'è. Un file solo, `.dat`, punto e virgola, righe prefissate dal tipo
   di record. Non è lo Standard Share File di `flusso-ssf.js`: quello arriva
   come zip di CSV CON LE INTESTAZIONI, questo è POSIZIONALE. Condividono il
   vocabolario e la famiglia («PASS»), non l'ordine delle colonne — la polizza
   SSF ne ha 51, questa 82, e già dalla terza divergono.

   Per questo il file è separato invece di allargare flusso-ssf: mettere due
   tracciati diversi dietro la stessa funzione vuol dire un `if` a ogni campo, e
   un `if` sbagliato su un premio non si vede.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ QUELLO CHE IL FILE DICE E CHE NESSUNO INDOVINEREBBE.                      │
   │ Misurato sul file vero del 23/09/2026, non dedotto da un manuale.         │
   └───────────────────────────────────────────────────────────────────────────┘

   1. **I titoli parlano anche di polizze che nel file non ci sono.** Su 154
      titoli, 112 puntano a 23 polizze che il file non contiene: sono rate di
      contratti più vecchi o di altro portafoglio. Caricarli tutti riempirebbe
      lo scadenzario di rate agganciate al nulla, e i conti dell'incassato
      direbbero numeri che non corrispondono a nessuna polizza in archivio.
      Il titolo si importa SOLO se la sua polizza è nel file o già in archivio.

   2. **Le garanzie sommano esattamente al premio di polizza.** Su tutte e 18
      le polizze, la somma della colonna 34 delle garanzie fa il lordo della
      polizza al centesimo. È il controllo che dice se la colonna del premio è
      quella giusta: se un domani cambia tracciato, questa somma smette di
      tornare prima che qualcuno se ne accorga dai numeri.

   3. **Il premio di polizza si scompone in tre pezzi**: netto + due voci
      (accessori/SSN e imposte) = lordo, su tutte e 18. Serve a distinguere
      l'imponibile dal lordo: scriverli al posto sbagliato non fa saltare
      niente, cambia solo il valore del portafoglio.

   4. **Il file contiene anche sinistri (tipo 50) e incassi (tipo 80)**, che
      l'SSF non ha. Sono due cose che in archivio hanno già la loro tabella e
      non vanno infilate nelle polizze.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ QUELLO CHE ANCORA NON SI SA, E PERCHÉ QUI NON SI TIRA A INDOVINARE.       │
   └───────────────────────────────────────────────────────────────────────────┘

   Delle 82 colonne della polizza (94 del tipo 21, 64 del titolo) qui sotto ne
   sono mappate solo quelle VERIFICATE: o perché i conti tornano, o perché il
   valore ha una forma inconfondibile (un codice fiscale, una data, una targa),
   o perché un id combacia con un altro record del file.

   Le DATE della polizza sono state chiuse così: incrociandole con i titoli,
   che portano il periodo della rata. Tre polizze su diciotto hanno i loro
   titoli nel file, e tutte e tre danno effetto = c19 e scadenza = c21, al
   giorno. Le altre tre date restano numerate.

   Le altre restano accessibili come `grezzo[n]`, NON con un nome inventato.
   Un nome sbagliato su una colonna di soldi produce un numero credibile e
   falso, ed è il tipo di errore che si scopre mesi dopo da un conto che non
   torna. Per chiuderle serve il tracciato PASS-133 di HDI.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var TIPI = {
    '0':  'testata',
    '10': 'anagrafiche',
    '20': 'polizze',
    '21': 'polizze_dettaglio',
    '30': 'garanzie',
    '40': 'titoli',
    '50': 'sinistri',
    '80': 'incassi',
    '99': 'coda',
  };

  /* Le colonne sono 1-based come le conta chi legge il tracciato: `c(r, 6)` è
     la sesta colonna. Tenere la stessa numerazione del documento evita l'errore
     di conversione più stupido e più frequente. */
  function c(r, n) { var v = r[n - 1]; return v === undefined ? '' : String(v).trim(); }

  /* Gli importi arrivano all'italiana: 1.234,56. `parseFloat` su quella
     stringa restituisce 1 — cioè un premio da 1.234 euro diventa 1, e non se ne
     accorge nessuno perché 1 è un numero valido. */
  function euro(s) {
    s = String(s === undefined || s === null ? '' : s).trim();
    if (!s) return null;
    var n = Number(s.replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  /* gg/mm/aaaa → aaaa-mm-gg. Senza conversione, «01/10/1980» letto da un
     database americano diventa il 10 gennaio. */
  function data(s) {
    s = String(s || '').trim();
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    return m ? m[3] + '-' + m[2] + '-' + m[1] : null;
  }

  /* ── LEGGERE IL FILE ───────────────────────────────────────────────────────
     Niente libreria CSV: il tracciato non ha virgolette né campi con dentro il
     separatore, e un lettore generico qui aggiungerebbe solo comportamenti da
     indovinare. */
  function leggi(testo) {
    var righe = String(testo || '').split(/\r?\n/).filter(function (r) { return r.length; });
    var per = {};
    Object.keys(TIPI).forEach(function (t) { per[t] = []; });
    var sconosciuti = {};
    righe.forEach(function (riga) {
      var campi = riga.split(';');
      var t = String(campi[0] || '').trim();
      if (per[t]) per[t].push(campi);
      else sconosciuti[t] = (sconosciuti[t] || 0) + 1;
    });
    return { per: per, sconosciuti: sconosciuti, righe: righe.length };
  }

  /* ── LA TESTATA E LA CODA ─────────────────────────────────────────────────
     Un file troncato a metà è il guaio peggiore, perché sembra un file buono e
     più corto: si importerebbe mezzo portafoglio senza un errore. La coda
     (tipo 99) è l'unica cosa che dice che il file è finito. */
  function controllaBusta(letto) {
    var t = letto.per['0'][0], k = letto.per['99'][0];
    var guai = [];
    if (!t) guai.push('Manca la testata: non è un file di portafoglio HDI.');
    if (!k) guai.push('Manca la riga finale: il file è troncato, e importarlo caricherebbe solo una parte del portafoglio senza dirlo.');
    if (t && k && c(t, 3) !== c(k, 3)) guai.push('Testata e coda dichiarano tracciati diversi.');
    return {
      ok: guai.length === 0,
      guai: guai,
      tracciato: t ? c(t, 3) : null,
      codifica: t ? c(t, 2) : null,
      estratto_il: t ? data(c(t, 6)) : null,
    };
  }

  /* ── I RECORD, SOLO NEI CAMPI VERIFICATI ──────────────────────────────── */

  function anagrafica(r) {
    return {
      id: c(r, 6),                    // combacia con la colonna 61 della polizza
      sesso: c(r, 7),
      denominazione: c(r, 10),
      indirizzo: c(r, 11),
      comune: c(r, 12),
      provincia: c(r, 14),
      cap: c(r, 15),
      nato_il: data(c(r, 17)),
      comune_nascita: c(r, 18),
      codice_fiscale: c(r, 20),
      telefono: c(r, 24),
      email: c(r, 25),
      grezzo: r,
    };
  }

  function polizza(r) {
    var netto = euro(c(r, 70)), voce1 = euro(c(r, 72)), voce2 = euro(c(r, 73)), lordo = euro(c(r, 74));
    return {
      id: c(r, 2),
      compagnia_ania: c(r, 4),
      agenzia: c(r, 5),
      numero: c(r, 6),
      ramo: c(r, 9),
      prodotto: c(r, 12),
      stato: c(r, 16),
      motivo_storno: c(r, 17),
      annullata_il: data(c(r, 18)),
      /* LE DATE, E COME SI È SAPUTO QUALI SONO. Al primo giro le avevo
         battezzate a naso e ne usciva una polizza annuale lunga due anni.
         Invece di indovinare, gliel'ho chiesto al file: tre polizze hanno i
         loro titoli dentro, e il titolo porta il periodo della rata. Tutte e
         tre combaciano con c19 → c21, al giorno:

            polizza …4999   c19 16/09/2026 → c21 16/09/2027   titolo idem
            polizza …7270   c19 23/09/2026 → c21 23/09/2027   titolo idem
            polizza …7271   c19 23/09/2026 → c21 17/11/2026   titolo idem

         L'ultima è la conferma indipendente: è la sostituzione della …3577, e
         si porta in c20 il 17/11/2024, cioè la decorrenza ORIGINALE del
         contratto sostituito. Ecco perché c20 non è la decorrenza in corso, e
         perché resta senza nome insieme a c22 e c23.

         Controprova su tutti i 42 titoli caricabili: sulle ANNUALI combacia
         29 volte su 29; sulle SEMESTRALI non combacia mai, 13 su 13 — e
         nemmeno deve, perché lì il titolo è la PRIMA RATA: stessa partenza,
         metà durata (23/09/2026 → 19/12/2026 contro una polizza che arriva al
         19/06/2027). Il fatto che sbagli esattamente dove ci si aspetta che
         sbagli è la conferma migliore che le due colonne sono quelle giuste.

         Se un domani il tracciato di HDI dirà altro, vince il tracciato. */
      effetto: data(c(r, 19)),
      scadenza: data(c(r, 21)),
      date: { c20: data(c(r, 20)), c22: data(c(r, 22)), c23: data(c(r, 23)) },
      frazionamento: c(r, 24),
      anagrafica_id: c(r, 61),
      codice_fiscale: c(r, 79),
      premio_netto: netto,
      premio_lordo: lordo,
      /* La somma la tiene il file, non noi: se un giorno non torna più, la
         colonna del premio è cambiata e va riletto il tracciato. */
      premio_quadra: (netto !== null && voce1 !== null && voce2 !== null && lordo !== null)
        ? Math.abs(netto + voce1 + voce2 - lordo) < 0.02 : null,
      grezzo: r,
    };
  }

  function garanzia(r) {
    return {
      polizza_id: c(r, 2),
      codice: c(r, 9),
      descrizione: c(r, 10),
      massimale: euro(c(r, 18)),
      bene: c(r, 21),               // «AUTO HDI - PEUGEOT 2008 … (GV712FB)»
      premio_netto: euro(c(r, 31)),
      premio_lordo: euro(c(r, 34)),
      grezzo: r,
    };
  }

  function titolo(r) {
    return {
      polizza_id: c(r, 2),
      tipo: c(r, 14),
      /* È il titolo che ha permesso di battezzare le date della polizza:
         c11 → c13 è il periodo della rata, e su tre polizze combacia al
         giorno con effetto → scadenza. */
      effetto: data(c(r, 11)),
      scadenza: data(c(r, 13)),
      frazionamento: c(r, 18),
      stato: c(r, 19),
      incassato_il: data(c(r, 22)),
      grezzo: r,
    };
  }

  function sinistro(r) {
    return {
      numero: c(r, 7),
      ramo: c(r, 18),
      provincia: c(r, 20),
      comune: c(r, 22),
      date: { c24: data(c(r, 24)), c25: data(c(r, 25)) },
      targa: c(r, 36),
      grezzo: r,
    };
  }

  function incasso(r) {
    return {
      data: data(c(r, 3)),
      polizza_numero: c(r, 12),
      tipo: c(r, 16),
      importo: euro(c(r, 17)),
      mezzo: c(r, 23),
      pagatore: c(r, 24),
      pagatore_cf: c(r, 25),
      grezzo: r,
    };
  }

  /* ── IL CONTROLLO CHE DECIDE COSA SI PUÒ CARICARE ─────────────────────────
     `polizzeNote` sono gli id già in archivio: si passano da fuori, perché un
     titolo di una polizza caricata il mese scorso è buono, e uno di una polizza
     che nessuno ha mai visto no. */
  function esamina(testo, polizzeNote) {
    var letto = leggi(testo);
    var busta = controllaBusta(letto);
    var note = {};
    (polizzeNote || []).forEach(function (id) { note[String(id)] = true; });

    var anagrafiche = letto.per['10'].map(anagrafica);
    var polizze     = letto.per['20'].map(polizza);
    var garanzie    = letto.per['30'].map(garanzia);
    var titoli      = letto.per['40'].map(titolo);
    var sinistri    = letto.per['50'].map(sinistro);
    var incassi     = letto.per['80'].map(incasso);

    var idPolizza = {}, idAnag = {};
    polizze.forEach(function (p) { idPolizza[p.id] = p; });
    anagrafiche.forEach(function (a) { idAnag[a.id] = a; });

    var conosciuta = function (id) { return !!(idPolizza[id] || note[id]); };

    var avvisi = [];
    var senzaAnagrafica = polizze.filter(function (p) { return !idAnag[p.anagrafica_id]; });
    if (senzaAnagrafica.length) {
      avvisi.push({ g: 'grave', t: senzaAnagrafica.length + ' polizze richiamano un cliente che nel file non c\'è: entrerebbero senza intestatario.' });
    }
    var premiRotti = polizze.filter(function (p) { return p.premio_quadra === false; });
    if (premiRotti.length) {
      avvisi.push({ g: 'grave', t: premiRotti.length + ' polizze hanno un premio che non si scompone: la colonna del premio non è più quella attesa, il tracciato va riletto prima di caricare.' });
    }
    var garOrfane = garanzie.filter(function (g) { return !idPolizza[g.polizza_id]; });
    if (garOrfane.length) {
      avvisi.push({ g: 'grave', t: garOrfane.length + ' garanzie non appartengono a nessuna polizza del file.' });
    }
    var titoliFuori = titoli.filter(function (t) { return !conosciuta(t.polizza_id); });
    if (titoliFuori.length) {
      avvisi.push({ g: 'avviso', t: titoliFuori.length + ' titoli su ' + titoli.length + ' riguardano polizze che non sono né nel file né in archivio: si lasciano fuori, altrimenti lo scadenzario si riempie di rate agganciate al nulla.' });
    }
    Object.keys(letto.sconosciuti).forEach(function (t) {
      avvisi.push({ g: 'avviso', t: 'Righe di tipo «' + t + '» non previste dal tracciato (' + letto.sconosciuti[t] + '): ignorate.' });
    });

    return {
      busta: busta,
      avvisi: avvisi,
      /* Si può caricare solo se la busta è integra e non c'è niente di grave:
         un file troncato o con i premi che non tornano non si importa «per la
         parte buona», perché non si sa dove finisca la parte buona. */
      caricabile: busta.ok && !avvisi.some(function (a) { return a.g === 'grave'; }),
      anagrafiche: anagrafiche,
      polizze: polizze,
      garanzie: garanzie,
      titoli: titoli.filter(function (t) { return conosciuta(t.polizza_id); }),
      titoliScartati: titoliFuori,
      sinistri: sinistri,
      incassi: incassi,
      conteggi: {
        anagrafiche: anagrafiche.length, polizze: polizze.length, garanzie: garanzie.length,
        titoli: titoli.length, titoliCaricabili: titoli.length - titoliFuori.length,
        sinistri: sinistri.length, incassi: incassi.length,
      },
    };
  }

  /* ═══ DALLA LETTURA ALLA SCRITTURA ════════════════════════════════════════
     Fin qui il file si guardava. Da qui si carica — e si carica dalla PORTA
     CHE C'E' GIA': `iam_import_lotti` + `iam_importa_flusso`, la scrittura
     transazionale dell'SSF, quella che il 21/09 ha imparato a essere tutto o
     niente. Aprirne una seconda vorrebbe dire due modi di sbagliare a
     scrivere un portafoglio, e il secondo senza le cicatrici del primo.

     Quindi `converti` non scrive niente: traduce il PASS-133 nella forma che
     quella porta gia' accetta, e poi e' `FlussoSSF.piano()` a decidere cosa
     e' nuovo e cosa c'e' gia'.

     UNA COSA VA DETTA FORTE: IL TITOLO DI HDI NON PORTA L'IMPORTO.
     Nel tracciato la rata ha tipo, decorrenza, scadenza e stato, e basta. La
     colonna 23 vale 293 su OGNI riga del file: e' un codice, non dei soldi —
     e uno che la scambiasse per un importo caricherebbe un portafoglio di
     rate da 293 € l'una. I soldi stanno in due altri posti: nei record di
     incasso (con importo E mezzo di pagamento, ed e' il dato buono perche' e'
     quello davvero entrato), e nel premio della polizza, che coincide con la
     rata solo se il frazionamento e' annuale. Fuori da questi due casi la
     rata NON si carica: dividere il premio per il frazionamento sarebbe
     aritmetica plausibile su soldi veri, e il numero uscirebbe credibile e
     sbagliato. ═════════════════════════════════════════════════════════════ */

  /* Il vocabolario di HDI verso il nostro. Quello che non si riconosce resta
     null: «altro» e' una risposta, «non lo so» e' un'altra. */
  var MEZZI_HDI = {
    'contante': 'contante', 'contanti': 'contante', 'pos': 'pos',
    'assegno': 'assegno', 'assegni': 'assegno', 'bonifico': 'bonifico',
    'sdd': 'domiciliazione', 'rid': 'domiciliazione', 'domiciliazione': 'domiciliazione',
    'altro': 'altro'
  };
  function mezzoNostro(m) {
    var k = String(m == null ? '' : m).trim().toLowerCase();
    if (!k) return null;
    if (MEZZI_HDI[k]) return MEZZI_HDI[k];
    if (k.indexOf('carta di credito') === 0 || k === 'carta') return 'carta_credito';
    if (k.indexOf('prepagata') >= 0) return 'prepagata';
    if (k.indexOf('paypal') >= 0) return 'paypal';
    return null;
  }

  function annuale(f) { return /^annuale$/i.test(String(f || '').trim()); }

  function converti(esame) {
    var e = esame || {};
    var anag = e.anagrafiche || [], pol = e.polizze || [],
        tit = e.titoli || [], gar = e.garanzie || [], inc = e.incassi || [];

    var perPol = {};
    inc.forEach(function (i) {
      var k = String(i.polizza_numero || '');
      if (!k || i.importo == null) return;
      (perPol[k] = perPol[k] || []).push(i);
    });

    var clienti = anag.map(function (a) {
      var cf = String(a.codice_fiscale || '').trim().toUpperCase();
      /* Sedici caratteri e' una persona, undici e' una partita IVA. Sbagliare
         qui vuol dire cercare il cliente nell'indice sbagliato e creare il
         doppione di uno che c'e' gia'. */
      var persona = cf.length !== 11;
      return {
        _chiave: 'hdi:a:' + a.id,
        tipo: persona ? 'privato' : 'azienda',
        nominativo: a.denominazione || '',
        ragione_sociale: persona ? null : (a.denominazione || null),
        codice_fiscale: persona ? (cf || null) : null,
        partita_iva: persona ? null : (cf || null),
        indirizzo: a.indirizzo || null, cap: a.cap || null,
        comune: a.comune || null, provincia: a.provincia || null,
        cellulare: a.telefono || null, telefono: null,
        email: a.email || null, data_nascita: a.nato_il || null
      };
    });

    /* Le garanzie non hanno una tabella loro: viaggiano dentro la polizza,
       dove servono a chi la guarda e non pesano su nessun conto. */
    var garPerPol = {};
    gar.forEach(function (g) { (garPerPol[g.polizza_id] = garPerPol[g.polizza_id] || []).push(g); });

    var polPerId = {};
    pol.forEach(function (p) { polPerId[p.id] = p; });

    var polizze = pol.map(function (p) {
      var num = String(p.numero || '').trim();
      var gs = (garPerPol[p.id] || []).map(function (g) {
        return { codice: g.codice, descrizione: g.descrizione, massimale: g.massimale,
                 bene: g.bene, premio_lordo: g.premio_lordo };
      });
      return {
        _fonte_id: 'hdi:p:' + num,
        _cliente: 'hdi:a:' + p.anagrafica_id,
        _senzaCliente: !p.anagrafica_id,
        cliente: null,
        numero_polizza: num,
        compagnia: 'HDI',
        prodotto: p.prodotto || p.ramo || null,
        modulo: p.ramo || null,
        data_effetto: p.effetto || null,
        data_scadenza: p.scadenza || null,
        data_emissione: null,
        copertura_dal: p.effetto || null,
        copertura_al: p.scadenza || null,
        frazionamento: p.frazionamento || null,
        tacito_rinnovo: null,
        mezzo_pagamento: null,
        premio_annuo: p.premio_lordo != null ? p.premio_lordo : null,
        premio_rata: annuale(p.frazionamento) && p.premio_lordo != null ? p.premio_lordo : null,
        stato_pagamento: null,
        dati: { fonte: 'hdi', ania: p.compagnia_ania, agenzia: p.agenzia,
                stato_hdi: p.stato, premio_netto: p.premio_netto, garanzie: gs }
      };
    });

    /* IL PUNTO DELICATO, E LA TRAPPOLA CHE C'E' DENTRO.
       «Cercare l'incasso della polizza» non basta: nel file del 23/09 la
       polizza 1428407270 ha SEI rate con la stessa data e UN SOLO incasso da
       733 €. Appaiare per polizza+data dava 733 € a tutte e sei, e il totale
       delle rate saliva a 7.985 € contro 2.735 € davvero incassati: 5.912 €
       di soldi che non esistono, con l'aria di essere veri.

       Quindi: OGNI INCASSO SI CONSUMA UNA VOLTA SOLA, e si appaia solo dove
       non c'e' ambiguita' — una rata, un incasso. Dove sono molte contro uno
       non si sceglie a caso: nessuna prende l'importo.

       Vale anche per il ripiego sul premio annuo: solo se la polizza ha una
       rata sola. Con sei rate si moltiplicherebbe il premio per sei, che e'
       lo stesso errore da un'altra porta. */
    var titoli = [], scartati = [];

    /* PRIMA DI TUTTO, LE RIPETIZIONI. Nel file la polizza 1428407270 ha sei
       righe di rata identiche — stesso tipo, stessa decorrenza, e soprattutto
       STESSO PROGRESSIVO `143290000001401117`. Non sono sei rate: e' una rata
       sola, ripetuta una volta per sezione. Il progressivo e' l'identita' vera
       del record, ed e' li' che la ripetizione si vede. Caricarle tutte
       moltiplicherebbe per sei una rata da 733 €. */
    var visti = {}, ripetute = 0;
    tit = tit.filter(function (t) {
      var prog = t.grezzo && t.grezzo[1] ? String(t.grezzo[1]).trim() : '';
      if (!prog) return true;
      if (visti[prog]) { ripetute++; return false; }
      visti[prog] = true;
      return true;
    });

    var perPolizza = {};
    tit.forEach(function (t) { (perPolizza[t.polizza_id] = perPolizza[t.polizza_id] || []).push(t); });

    Object.keys(perPolizza).forEach(function (pid) {
      var gruppo = perPolizza[pid];
      var p = polPerId[pid];
      if (!p) {
        gruppo.forEach(function (t) { scartati.push({ t: t, perche: 'la polizza non è in questo file' }); });
        return;
      }
      var num = String(p.numero || '').trim();
      var liberi = (perPol[num] || []).slice();

      var perData = {};
      gruppo.forEach(function (t) { (perData[t.incassato_il || ''] = perData[t.incassato_il || ''] || []).push(t); });

      Object.keys(perData).forEach(function (d) {
        var rate = perData[d];
        rate.forEach(function (t) {
          var i = null;
          if (rate.length === 1) {
            var quelGiorno = d ? liberi.filter(function (x) { return x.data === d; }) : [];
            if (quelGiorno.length === 1) i = quelGiorno[0];
            else if (!i && gruppo.length === 1 && liberi.length === 1) i = liberi[0];
          }
          var importo = null, nota = null;
          if (i) {
            importo = i.importo;
            /* Consumato. Con la deduplicazione per progressivo questo caso
               oggi non si raggiunge: e' una difesa, non una regola viva. Se un
               domani la deduplicazione si allenta, e' quello che impedisce a un
               incasso di pagare due rate. */
            liberi = liberi.filter(function (x) { return x !== i; });
          } else if (gruppo.length === 1 && annuale(p.frazionamento) && p.premio_lordo != null) {
            importo = p.premio_lordo;
            nota = 'Importo dal premio annuo: il tracciato non porta l\'importo della rata.';
          }
          if (importo == null) {
            scartati.push({ t: t, perche: rate.length > 1
              ? rate.length + ' rate della stessa polizza nello stesso giorno: attribuire l\'importo vorrebbe dire sceglierlo a caso'
              : 'il tracciato non porta l\'importo della rata e non c\'è un incasso che lo dica' });
            return;
          }
          titoli.push({
            _fonte_id: 'hdi:t:' + (t.grezzo && t.grezzo[1] ? String(t.grezzo[1]).trim() : num + ':' + (t.effetto || '')),
            _polizza: 'hdi:p:' + num,
            _senzaPolizza: false,
            tipo: t.tipo || null,
            data_decorrenza: t.effetto || null,
            data_scadenza: t.scadenza || null,
            importo_lordo: importo,
            /* HDI non manda la provvigione nel PASS-133. Zero sarebbe una
               cifra; null e' la verita', e non falsa nessun rendiconto. */
            provvigione: null,
            stato: /incassat/i.test(String(t.stato || '')) ? 'incassato' : 'aperto',
            mezzo_pagamento: i ? mezzoNostro(i.mezzo) : null,
            incassato_il: t.incassato_il || (i ? i.data : null),
            note: nota
          });
        });
      });
    });

    var note = [];
    if (ripetute) {
      note.push({ g: 'avviso', t: ripetute + ' righe di rata erano ripetizioni della stessa rata (stesso progressivo, una riga per sezione): contate una volta sola.' });
    }
    if (scartati.length) {
      note.push({ g: 'avviso', t: scartati.length + ' rate su ' + tit.length +
        ' non si caricano perchè il tracciato non ne porta l\'importo e non c\'è un incasso che lo dica: ' +
        'metterci il premio diviso per il frazionamento sarebbe un numero credibile e inventato.' });
    }
    if (titoli.length) {
      note.push({ g: 'avviso', t: 'Il PASS-133 non porta le provvigioni: le ' + titoli.length +
        ' rate entrano senza, e i rendiconti provvigionali su queste restano da fare a parte.' });
    }

    return {
      testata: { emittente: 'HDI', intermediario: (pol[0] && pol[0].agenzia) || null,
                 versione: e.busta && e.busta.tracciato, dal: null, al: e.busta && e.busta.estratto_il },
      tracciato: { nome: 'PASS-133', nonPorta: ['provvigioni', 'importo della singola rata', 'codice del produttore'] },
      clienti: clienti,
      polizze: polizze,
      offerte: [],
      titoli: titoli,
      titoliSenzaImporto: scartati,
      collaboratori: [],
      avvisi: note
    };
  }

  var API = {
    TIPI: TIPI, euro: euro, data: data, colonna: c,
    leggi: leggi, controllaBusta: controllaBusta, esamina: esamina,
    anagrafica: anagrafica, polizza: polizza, garanzia: garanzia,
    titolo: titolo, sinistro: sinistro, incasso: incasso,
    mezzoNostro: mezzoNostro, converti: converti,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FlussoHDI = API;
})();
