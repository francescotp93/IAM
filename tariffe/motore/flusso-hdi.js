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

  var API = {
    TIPI: TIPI, euro: euro, data: data, colonna: c,
    leggi: leggi, controllaBusta: controllaBusta, esamina: esamina,
    anagrafica: anagrafica, polizza: polizza, garanzia: garanzia,
    titolo: titolo, sinistro: sinistro, incasso: incasso,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FlussoHDI = API;
})();
