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
  /* Somme di soldi: si arrotonda al centesimo a ogni passo. Sommando quattro
     garanzie in virgola mobile, 144.51 + 9.03 + 22.40 + 9.49 puo' uscire
     185.42999999999998, e quel numero stampato diventa 185,43 ma confrontato
     con l'incasso non combacia mai. */
  function cent(n) {
    var v = Number(n);
    if (!isFinite(v)) return 0;
    var seg = v < 0 ? -1 : 1;
    return seg * Math.round(Math.abs(v) * 100) / 100;
  }

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

  /* ── LE COLONNE DELL'ANAGRAFICA, E COME SI E' SAPUTO QUALI SONO ──────────
     Al primo giro erano sbagliate da `provincia` in poi, sfalsate di una o
     due posizioni. Non si vedeva: la provincia usciva «IT», il CAP usciva
     «TP», e il codice fiscale usciva «IT» — cioe' LO STESSO PER TUTTI.

     Ed e' li' che stava il danno vero. Il codice fiscale e' la chiave con cui
     si riconosce «questa persona ce l'ho gia'»: uguale per tutti vuol dire
     che quattordici persone diverse sono la stessa persona. Nell'anteprima
     si leggeva «1 cliente, 18 polizze», e Francesco si e' fermato a chiedere
     se non fosse strano. Lo era: stavano per entrare tredici clienti fusi in
     uno, con le polizze di tutti attaccate al primo.

     Quali siano davvero non l'ho indovinato: ho preso le quattordici righe
     del file e ho chiesto a ognuna di rispettare la forma del suo campo —
     due lettere per la provincia, cinque cifre per il CAP, sedici caratteri
     per il codice fiscale, una chiocciola per l'email. La colonna giusta e'
     quella che risponde 14 volte su 14; quella vecchia rispondeva 0 su 14.

         c12 comune        c14 nazione (IT)     c15 provincia
         c16 CAP           c18 data di nascita  c19 comune di nascita
         c20 nazione di nascita (IT)            c21 CODICE FISCALE
         c25 telefono      c26 email

     Le due «IT» — c14 e c20 — sono le due trappole: stanno una prima della
     provincia e una prima del codice fiscale, e prendendole per buone il
     campo dopo slitta senza che niente protesti. */
  function anagrafica(r) {
    return {
      id: c(r, 6),                    // combacia con la colonna 61 della polizza
      sesso: c(r, 7),
      denominazione: c(r, 10),
      indirizzo: c(r, 11),
      comune: c(r, 12),
      nazione: c(r, 14),              // «IT» — non e' la provincia
      provincia: c(r, 15),
      cap: c(r, 16),
      nato_il: data(c(r, 18)),
      comune_nascita: c(r, 19),
      nazione_nascita: c(r, 20),      // «IT» — non e' il codice fiscale
      codice_fiscale: c(r, 21),
      telefono: c(r, 25),
      email: c(r, 26),
      grezzo: r,
    };
  }

  /* ── COGNOME E NOME, CHIESTI AL CODICE FISCALE ───────────────────────────
     HDI manda un campo solo, «denominazione»: «OROMBELLO GIROLAMO». In
     archivio cognome e nome sono due colonne, e restavano vuote su tutte e
     undici le schede — che non è un dettaglio estetico: la scheda del cliente
     non si salva senza, e Francesco non poteva correggere un indirizzo.

     Tagliare al primo spazio sbaglia: nel file ci sono «DI BELLA GIUSEPPA»,
     «LO VERDE FABIOLA», «DI GAETANO GIUSEPPE MICHELE». Ma il codice fiscale
     il cognome e il nome li contiene già — le prime tre lettere sono le
     consonanti del cognome, le tre dopo quelle del nome — quindi non si
     indovina: si prova ogni punto di taglio e si tiene quello che RIGENERA i
     primi sei caratteri del codice fiscale. Se nessuno li rigenera, non si
     divide niente: meglio due colonne vuote di un cognome sbagliato su una
     scheda. Sulle quattordici anagrafiche del file funziona 13 su 13 (la
     quattordicesima è un'azienda, e non ha cognome). */
  function pezzoCf(parola, eNome) {
    var t = String(parola || '').toUpperCase().replace(/[^A-Z]/g, '');
    var cons = t.replace(/[AEIOU]/g, ''), voc = t.replace(/[^AEIOU]/g, '');
    var out;
    /* Per il NOME, con quattro consonanti o più si prendono la 1ª, la 3ª e la
       4ª — non le prime tre. È la regola che distingue «Giovanni» (GVN) da
       «Giovanna» (GVN) e che, sbagliata, fa fallire proprio i nomi lunghi. */
    if (eNome && cons.length >= 4) out = cons.charAt(0) + cons.charAt(2) + cons.charAt(3);
    else out = (cons + voc).slice(0, 3);
    while (out.length < 3) out += 'X';
    return out;
  }

  function dividiNome(nominativo, cf) {
    var k = String(cf || '').trim().toUpperCase();
    if (k.length !== 16) return null;
    var parole = String(nominativo || '').trim().split(/\s+/).filter(Boolean);
    if (parole.length < 2) return null;
    for (var i = 1; i < parole.length; i++) {
      var cog = parole.slice(0, i).join(' ');
      var nom = parole.slice(i).join(' ');
      if (pezzoCf(cog, false) + pezzoCf(nom, true) === k.slice(0, 6)) {
        return { cognome: cog, nome: nom };
      }
    }
    return null;
  }

  /* Sedici caratteri per una persona, undici cifre per una partita IVA.
     Tutto il resto non e' un codice fiscale, e soprattutto NON PUO' FARE DA
     CHIAVE: una chiave sbagliata non da' errore, fonde delle persone. */
  function codiceFiscaleValido(v) {
    var k = String(v == null ? '' : v).trim().toUpperCase();
    return /^[A-Z0-9]{16}$/.test(k) || /^[0-9]{11}$/.test(k);
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
      /* CHI L'HA FATTA (24/09/2026). Per due giorni ho detto a Francesco che
         il PASS-133 non porta il produttore, e mi sbagliavo: c'e', in c31, e
         il codice di competenza in c30. I codici sono A12559, A12556, A4346, A18545,
         A12558, A18544 — sei su diciotto polizze, nove sui titoli — e le
         subagenzie sono «1428» e «02379», che combaciano con i «Subagente
         1428» e «Subagente 02379a185» del foglio Appunti Incassi che stampa
         la compagnia. Senza questo, ogni polizza importata nasce senza
         collaboratore e le provvigioni indirette non si calcolano. */
      produttore: c(r, 31),
      /* NON è una «subagenzia», per quanto ci somigli. Vale 1428 su 165 righe
         su 190 — cioè il codice dell'agenzia stessa, lo stesso numero che è
         già costante in ogni record e nel nome del file — e 02379 sulle
         altre. È il CODICE DI COMPETENZA: «agenzia diretta» oppure «quell'unico
         intermediario esterno». Chiamarla subagenzia faceva pensare a un
         secondo livello commerciale che non c'è: la gerarchia vera sta tutta
         nel produttore (c31), e questa colonna è quasi sempre ridondante. */
      competenza: c(r, 30),
      /* La polizza che questa rimpiazza: sette polizze su diciotto ce l'hanno,
         e quattro puntano a numeri che in questo file non ci sono (stanno in
         archivio, o in un estratto precedente). */
      sostituisce_numero: c(r, 46),
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

  /* ── LE RATE, E PERCHE' NON SONO LE RIGHE ────────────────────────────────
     Il record 40 e' UNA RIGA PER GARANZIA, non una per rata. Nel file del
     23/09 ci sono 154 righe e 35 rate: una polizza auto con RCA, infortuni e
     assistenza occupa tre righe, e il progressivo (c2) e' lo stesso su tutte
     e tre.

     Il 24/09 l'avevo letto al contrario. Vedendo sei righe con lo stesso
     progressivo le avevo chiamate «ripetizioni» e ne tenevo una, buttando via
     le altre cinque — cioe' buttando via l'importo di cinque garanzie su sei.
     Poi, non trovando l'importo (perche' l'avevo buttato), lo andavo a
     cercare nell'incasso. Da li' in avanti era tutto sbagliato in modo
     coerente: 12 rate su 35, e quelle 12 con l'importo arrotondato
     dell'incasso invece del premio esatto.

     La lettura giusta e' semplice: SI SOMMA.
       · importo    = somma di c39 su tutte le righe del gruppo
       · provvigione = somma di c40
     E si verifica da sola: sommate cosi', le provvigioni combaciano AL
     CENTESIMO con il foglio «Appunti Incassi» che la compagnia stampa ogni
     sera — Norrito 117,87, Castiglione 56,56, Fiore 36,27, Leto 38,92, e
     cosi' per tredici polizze su tredici.

     E il collegamento alla polizza e' la c7 (il numero), non la c2: la c2 e'
     il progressivo della RATA. Che finora funzionasse era un caso — dodici
     progressivi di rata coincidevano per sbaglio con dodici id di polizza. */
  function rate(righe40) {
    var per = {};
    (righe40 || []).forEach(function (r) {
      var prog = c(r, 2);
      if (!prog) return;
      if (!per[prog]) per[prog] = [];
      per[prog].push(r);
    });
    return Object.keys(per).map(function (prog) {
      var rs = per[prog];
      var capo = rs[0];
      var somma = function (n) {
        return cent(rs.reduce(function (t, r) { return t + (euro(c(r, n)) || 0); }, 0));
      };
      return {
        progressivo: prog,
        polizza_numero: c(capo, 7),
        tipo: c(capo, 14),
        ramo: c(capo, 10),
        effetto: data(c(capo, 11)),
        scadenza: data(c(capo, 13)),
        scadenza_rata: data(c(capo, 22)),
        frazionamento: c(capo, 18),
        stato: c(capo, 19),
        /* c22 e c24 portano tutte e due la data dell'incasso, e combaciano
           con quella del record 80 su 14 rate su 14. */
        incassato_il: data(c(capo, 22)),
        /* IL LEGAME DIRETTO CON L'INCASSO: la c20 della rata e' la c10 del
           record di incasso. Serve a prendere il MEZZO di pagamento da quello
           giusto invece di cercarlo per polizza e data, che con due incassi
           lo stesso giorno sceglierebbe a caso. */
        riferimento_incasso: c(capo, 20),
        produttore: c(capo, 47),
        competenza: c(capo, 43),
        importo: somma(39),
        provvigione: somma(40),
        /* Da cosa e' fatta: serve a chi guarda una rata e vuole sapere quanto
           pesa l'RCA e quanto l'assistenza. */
        voci: rs.map(function (r) {
          return { garanzia: c(r, 10), importo: euro(c(r, 39)), provvigione: euro(c(r, 40)) };
        }),
        righe: rs.length,
        grezzo: capo,
      };
    });
  }

  /* ── IL VEICOLO (record 21) ───────────────────────────────────────────────
     Quindici righe su diciotto polizze, e fino al 24/09/2026 non le leggeva
     nessuno: il tipo era censito in TIPI ma il contenuto finiva nel nulla.
     Dentro c'e' quello che serve a riconoscere una polizza auto senza aprire
     il PDF — targa, telaio, marca, modello — e quello che serve a rifarne il
     prezzo: classe di merito, alimentazione, cilindrata, immatricolazione.

     Quello che non so con certezza NON lo battezzo: le colonne dalla 59 in
     poi contengono sei anni (2020-2025) e una fila di valori, e hanno tutta
     l'aria dell'attestato di rischio — ma «tutta l'aria» non e' una prova, e
     un attestato letto male e' una tariffa sbagliata. Restano grezze, con il
     loro nome onesto, finche' non si dimostra cosa sono. */
  function veicolo(r) {
    return {
      polizza_id: c(r, 2),
      polizza_numero: c(r, 6),
      immatricolato_il: data(c(r, 11)),
      uso: c(r, 14),
      targa: c(r, 20),
      telaio: c(r, 21),
      marca: c(r, 22),
      modello: c(r, 23),
      classe_merito: c(r, 25),
      classe_interna: c(r, 26),
      alimentazione: c(r, 27),
      potenza_kw: c(r, 28),
      cilindrata: c(r, 31),
      anni_grezzi: r.slice(58, 76).map(function (x) { return String(x == null ? '' : x).trim(); }),
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
      /* LA CHIAVE CHE LEGA L'INCASSO ALLA SUA RATA: la c10 dell'incasso e' la
         c20 della rata. Senza, il mezzo di pagamento si cercava per polizza e
         data — e con due incassi lo stesso giorno si sceglieva a caso. */
      riferimento: c(r, 10),
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
    var veicoli     = letto.per['21'].map(veicolo);
    var polizze     = letto.per['20'].map(polizza);
    var garanzie    = letto.per['30'].map(garanzia);
    var titoli      = rate(letto.per['40']);
    var sinistri    = letto.per['50'].map(sinistro);
    var incassi     = letto.per['80'].map(incasso);

    var idPolizza = {}, idAnag = {}, numPolizza = {};
    polizze.forEach(function (p) { idPolizza[p.id] = p; numPolizza[String(p.numero || '').trim()] = p; });
    anagrafiche.forEach(function (a) { idAnag[a.id] = a; });

    /* UNA RATA SI COLLEGA ALLA POLIZZA PER NUMERO, non per id interno. Fino al
       24/09/2026 qui si confrontavano due cose diverse — il progressivo della
       rata contro l'id della polizza — e coincidevano dodici volte per puro
       caso. `polizzeNote`, che arriva dall'archivio, e' gia' un elenco di
       numeri: era l'unica meta' giusta del confronto. */
    var conosciuta = function (numero) {
      var k = String(numero == null ? '' : numero).trim();
      return !!(numPolizza[k] || note[k]);
    };

    var avvisi = [];
    var senzaAnagrafica = polizze.filter(function (p) { return !idAnag[p.anagrafica_id]; });
    if (senzaAnagrafica.length) {
      avvisi.push({ g: 'grave', t: senzaAnagrafica.length + ' polizze richiamano un cliente che nel file non c\'è: entrerebbero senza intestatario.' });
    }
    /* ── LA CHIAVE CHE NON E' UNA CHIAVE ────────────────────────────────
       Il 24/09/2026 il lettore prendeva la colonna 20 come codice fiscale.
       La colonna 20 vale «IT» su ogni riga: quattordici persone con lo
       stesso codice fiscale. Nessun controllo protestava, perche' il file
       era formalmente a posto — e a valle quel codice e' la chiave con cui
       si decide «questa persona ce l'ho gia'». Sarebbero entrati tredici
       clienti fusi in uno.

       La regola generale, che vale anche per il prossimo tracciato che
       slitta: UN IDENTIFICATIVO UGUALE PER TUTTI NON E' UN IDENTIFICATIVO.
       Qui si guardano le due cose insieme — la forma e la varieta' — perche'
       una sola delle due non basta: sedici caratteri li ha anche una
       colonna sbagliata, e due persone possono avere davvero lo stesso
       codice solo se sono la stessa persona due volte. */
    var cfValidi = anagrafiche.filter(function (a) { return codiceFiscaleValido(a.codice_fiscale); });
    if (anagrafiche.length && cfValidi.length < anagrafiche.length) {
      var quanti = anagrafiche.length - cfValidi.length;
      avvisi.push({ g: 'grave', t: quanti + ' anagrafiche su ' + anagrafiche.length +
        ' hanno un codice fiscale che non ne ha la forma (attesi 16 caratteri, o 11 cifre per una partita IVA): ' +
        'la colonna letta non è quella giusta, e il codice fiscale è la chiave con cui si riconosce chi c̀è già.' });
    }
    if (anagrafiche.length >= 3) {
      var cfDistinti = {};
      anagrafiche.forEach(function (a) { cfDistinti[String(a.codice_fiscale || '').trim().toUpperCase()] = true; });
      var quantiDistinti = Object.keys(cfDistinti).length;
      if (quantiDistinti <= 1) {
        avvisi.push({ g: 'grave', t: 'Tutte e ' + anagrafiche.length +
          ' le anagrafiche hanno lo stesso codice fiscale: un identificativo uguale per tutti non è un identificativo. ' +
          'Caricando, queste persone diventerebbero una sola scheda con le polizze di tutte attaccate.' });
      }
    }

    var premiRotti = polizze.filter(function (p) { return p.premio_quadra === false; });
    if (premiRotti.length) {
      avvisi.push({ g: 'grave', t: premiRotti.length + ' polizze hanno un premio che non si scompone: la colonna del premio non è più quella attesa, il tracciato va riletto prima di caricare.' });
    }
    var garOrfane = garanzie.filter(function (g) { return !idPolizza[g.polizza_id]; });
    if (garOrfane.length) {
      avvisi.push({ g: 'grave', t: garOrfane.length + ' garanzie non appartengono a nessuna polizza del file.' });
    }
    var titoliFuori = titoli.filter(function (t) { return !conosciuta(t.polizza_numero); });
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
      veicoli: veicoli,
      polizze: polizze,
      garanzie: garanzie,
      titoli: titoli.filter(function (t) { return conosciuta(t.polizza_numero); }),
      titoliScartati: titoliFuori,
      sinistri: sinistri,
      incassi: incassi,
      conteggi: {
        anagrafiche: anagrafiche.length, polizze: polizze.length, garanzie: garanzie.length,
        veicoli: veicoli.length,
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

  /* ── IL VOCABOLARIO DELLE RATE ────────────────────────────────────────────
     `quote_titoli.tipo` non accetta testo libero: ha un vincolo, e i valori
     sono quattro — prima_rata, rata, quietanza, appendice. HDI ne manda
     altri: «Nuova Polizza», «Quietanza di Rinnovo», «Sostituzione»,
     «Appendice». Nessuno dei quattro coincide, nemmeno «Appendice», che
     differisce per la maiuscola.

     Questo non e' un dettaglio di stile: senza traduzione OGNI rata viene
     rifiutata dal vincolo, e siccome la scrittura e' una transazione sola,
     non e' che «entrano meno rate» — non entra NIENTE. L'intera importazione
     muore, e l'errore che si legge parla di un vincolo, non di HDI.

     La parola originale non si perde: finisce nella nota della rata, perche'
     fra sei mesi «prima_rata» non raccontera' che era una sostituzione. */
  var TIPI_RATA = {
    'nuova polizza': 'prima_rata',
    'sostituzione': 'prima_rata',
    'quietanza di rinnovo': 'quietanza',
    'quietanza di frazionamento': 'rata',
    'appendice': 'appendice',
    'quietanza': 'quietanza',
    'rata': 'rata'
  };
  function tipoRata(t) {
    var k = String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!k) return { tipo: 'rata', noto: false, originale: null };
    if (TIPI_RATA[k]) return { tipo: TIPI_RATA[k], noto: true, originale: String(t).trim() };
    /* Non riconosciuta: si sceglie il valore piu' neutro fra i quattro e si
       dice che non la si e' capita, invece di lasciar morire l'importazione
       su un vincolo. */
    return { tipo: 'rata', noto: false, originale: String(t).trim() };
  }

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

    var cfScartati = 0;
    var clienti = anag.map(function (a) {
      var cf = String(a.codice_fiscale || '').trim().toUpperCase();
      /* Se non ha la forma di un codice fiscale non lo si usa: meglio un
         cliente nuovo di troppo che due persone fuse in una. Un doppione si
         vede e si unisce; una fusione si scopre quando qualcuno chiama per
         una polizza che risulta di un altro. */
      if (cf && !codiceFiscaleValido(cf)) { cf = ''; cfScartati++; }
      var diviso = dividiNome(a.denominazione, cf);
      /* Sedici caratteri e' una persona, undici e' una partita IVA. Sbagliare
         qui vuol dire cercare il cliente nell'indice sbagliato e creare il
         doppione di uno che c'e' gia'. */
      var persona = cf.length !== 11;
      return {
        _chiave: 'hdi:a:' + a.id,
        /* `fisica` e `giuridica`, non `privato`/`azienda`: sono le parole che
           usano le altre 2.536 schede, e una terza parola per la stessa cosa
           e' un filtro che da domani non trova piu' tutti. */
        tipo: persona ? 'fisica' : 'giuridica',
        nominativo: a.denominazione || '',
        cognome: diviso ? diviso.cognome : null,
        nome: diviso ? diviso.nome : null,
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

    /* IL NOME DEL CLIENTE VA ANCHE SULLA POLIZZA (24/09/2026).
       In archivio la polizza ha due cose: `cliente_id`, che e' il collegamento
       vero, e `cliente`, che e' il nome copiato accanto. Sembra un doppione e
       non lo e': l'elenco del portafoglio, le stampe e gli export leggono la
       COPIA, perche' disegnare duemila righe andando a prendere ogni volta
       l'anagrafica collegata sarebbe duemila letture.

       Lasciandola vuota le diciotto polizze di HDI sono entrate agganciate al
       loro cliente — `cliente_id` c'era su tutte e diciotto — e in elenco
       comparivano con un trattino al posto del nome. Da fuori sembrava che i
       clienti non fossero stati importati; erano importati e completi, e non
       si vedevano. */
    var anagPerId = {};
    anag.forEach(function (a) { anagPerId[a.id] = a; });

    var veiPerPol = {};
    (e.veicoli || []).forEach(function (v) { if (v.polizza_id) veiPerPol[v.polizza_id] = v; });

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
        cliente: (anagPerId[p.anagrafica_id] || {}).denominazione || null,
        numero_polizza: num,
        compagnia: 'HDI',
        prodotto: p.prodotto || p.ramo || null,
        modulo: p.ramo || null,
        data_effetto: p.effetto || null,
        data_scadenza: p.scadenza || null,
        /* ── LA DATA DI EMISSIONE, CHE NEL TRACCIATO NON C'E' ──────────────
           Censite tutte le 396 colonne di tutti e nove i tipi di record: HDI
           la data di emissione non la manda. Lasciarla vuota però non è
           gratis: il foglio cassa filtra per emissione ed è il suo filtro
           PREDEFINITO, quindi un portafoglio intero risultava invisibile; e
           in elenco compariva «emissione da indicare», che a Francesco
           chiedeva di riempire a mano diciotto volte una casella che nessuno
           gli manderà mai.

           Si usa la DECORRENZA, e il file dice che è difendibile: per le
           polizze nuove di questo estratto il primo premio è stato incassato
           lo STESSO GIORNO in cui la polizza decorre, dieci volte su dieci.
           Una RCA fatta al banco si emette, si paga e parte in giornata.

           Ma non si fa di nascosto: accanto resta scritto da dove viene
           (`emissione_derivata`), e ogni schermata che la mostra lo dice. Una
           data derivata e dichiarata è un dato; una data derivata e taciuta è
           una bugia che fra sei mesi nessuno sa più di aver scritto. */
        data_emissione: p.effetto || null,
        copertura_dal: p.effetto || null,
        copertura_al: p.scadenza || null,
        frazionamento: p.frazionamento || null,
        tacito_rinnovo: null,
        mezzo_pagamento: null,
        premio_annuo: p.premio_lordo != null ? p.premio_lordo : null,
        /* IL PREMIO DELLA RATA SI SCRIVE SOLO DOVE E' ESATTO: sulle annuali,
           dove la rata E' il premio dell'anno. Sulle semestrali il tracciato
           non lo dichiara, e ricavarlo dalle rate incassate non regge: fra le
           rate di una polizza ci sono storni (importo negativo) e appendici
           da un euro, e prendendo «la piu' recente» uscivano premi di rata di
           −141,61 € e di 1,04 € su polizze da seicento euro l'anno.
           Sulla scheda resta «Semestrale · —», che e' una casella vuota; un
           premio di rata sbagliato sarebbe un numero, e i numeri si credono. */
        premio_rata: annuale(p.frazionamento) && p.premio_lordo != null ? p.premio_lordo : null,
        stato_pagamento: null,
        dati: {
          fonte: 'hdi', ania: p.compagnia_ania, agenzia: p.agenzia,
          stato_hdi: p.stato, premio_netto: p.premio_netto, garanzie: gs,
          /* IL CODICE DI CHI L'HA FATTA, nel posto dove l'assegnazione lo va a
             cercare. Non sotto `ssf`, che è il nome di un altro tracciato:
             `dati.produttore` è neutro e vale per tutte le compagnie. */
          /* Da dove viene la data di emissione. `null` vorrebbe dire che l'ha
             mandata la compagnia; qui l'abbiamo ricavata noi, e si dice. */
          emissione_derivata: p.effetto ? 'effetto' : null,
          emissione_non_inviata: true,
          produttore: p.produttore || null,
          competenza: p.competenza || null,
          sostituisce_numero: p.sostituisce_numero || null,
          /* Il veicolo, per le polizze auto. Quindici su diciotto ce l'hanno,
             e fino a oggi finivano nel nulla. */
          veicolo: veiPerPol[p.id] ? {
            targa: veiPerPol[p.id].targa || null,
            telaio: veiPerPol[p.id].telaio || null,
            marca: veiPerPol[p.id].marca || null,
            modello: veiPerPol[p.id].modello || null,
            immatricolato_il: veiPerPol[p.id].immatricolato_il || null,
            classe_merito: veiPerPol[p.id].classe_merito || null,
            classe_interna: veiPerPol[p.id].classe_interna || null,
            alimentazione: veiPerPol[p.id].alimentazione || null,
            potenza_kw: veiPerPol[p.id].potenza_kw || null,
            cilindrata: veiPerPol[p.id].cilindrata || null,
            uso: veiPerPol[p.id].uso || null
          } : null
        }
      };
    });

    /* LE RATE. Da quando il lettore le legge per gruppo invece che per riga,
       qui non c'e' piu' niente da indovinare: l'importo e la provvigione sono
       nel file, esatti, e si prendono. Tutto quello che c'era prima — la
       deduplicazione per progressivo, l'accoppiamento con l'incasso, il
       ripiego sul premio annuo, il conteggio di quelle lasciate fuori —
       serviva a rimediare a un importo che avevo buttato via io leggendo le
       righe una per una.

       Resta una cosa da cercare, ed e' il MEZZO di pagamento: quello sta
       sull'incasso, non sulla rata. E si prende dall'incasso GIUSTO, non da
       uno qualsiasi della stessa polizza: la rata porta in `riferimento_incasso`
       la chiave del suo (c20 della rata = c10 dell'incasso). */
    var tipiIgnoti = {};
    var incPerRif = {};
    inc.forEach(function (i2) {
      var k = String(i2.riferimento || '').trim();
      if (k) incPerRif[k] = i2;
    });

    var titoli = [], scartati = [];
    tit.forEach(function (t) {
      var num = String(t.polizza_numero || '').trim();
      if (!num) { scartati.push({ t: t, perche: 'la rata non dice a quale polizza appartiene' }); return; }
      if (t.importo == null) { scartati.push({ t: t, perche: 'la rata non porta l\'importo' }); return; }

      var i2 = incPerRif[String(t.riferimento_incasso || '').trim()] || null;
      var tp = tipoRata(t.tipo);
      if (!tp.noto && tp.originale) tipiIgnoti[tp.originale] = (tipiIgnoti[tp.originale] || 0) + 1;

      titoli.push({
        _fonte_id: 'hdi:t:' + t.progressivo,
        _polizza: 'hdi:p:' + num,
        _senzaPolizza: false,
        tipo: tp.tipo,
        data_decorrenza: t.effetto || null,
        data_scadenza: t.scadenza_rata || t.scadenza || null,
        importo_lordo: t.importo,
        /* LA PROVVIGIONE C'E', ed e' la somma delle righe del gruppo. Si
           verifica da sola: sommata cosi' combacia al centesimo col foglio
           «Appunti Incassi» della compagnia. Per due giorni ho scritto il
           contrario, e ogni rata entrava senza. */
        provvigione: t.provvigione,
        stato: /incassat/i.test(String(t.stato || '')) ? 'incassato' : 'aperto',
        mezzo_pagamento: i2 ? mezzoNostro(i2.mezzo) : null,
        incassato_il: t.incassato_il || (i2 ? i2.data : null),
        note: tp.originale ? ('HDI: ' + tp.originale + '.') : null,
      });
    });

    /* I CODICI DI CHI HA PRODOTTO, uno per riga, con quante polizze e quante
       rate porta. La schermata dell'assegnazione li mostra a Francesco perché
       li abbini a una persona, e da lì in poi ogni polizza e ogni rata con
       quel codice nasce già intestata. Sono le stesse evidenze che l'SSF
       scrive da settembre: stessa tabella, stessa schermata, stesso modo di
       decidere. Il NOME non c'è nel tracciato — solo il codice. */
    var perCodice = {};
    var segna = function (cod, comp, campo) {
      var k = String(cod || '').trim().toUpperCase();
      if (!k) return;
      if (!perCodice[k]) perCodice[k] = { codice: k, produttore: null, nome: null, email: null, rui: null, competenza: comp || null, polizze: 0, rate: 0 };
      perCodice[k][campo]++;
    };
    (pol || []).forEach(function (p) { segna(p.produttore, p.competenza, 'polizze'); });
    (tit || []).forEach(function (t) { segna(t.produttore, t.competenza, 'rate'); });
    var codiciProduttore = Object.keys(perCodice).map(function (k) { return perCodice[k]; })
      .sort(function (a, b) { return (b.polizze + b.rate) - (a.polizze + a.rate); });

    var note = [];
    if (codiciProduttore.length) {
      note.push({ g: 'avviso', t: codiciProduttore.length + ' codici produttore nel file (' +
        codiciProduttore.map(function (x) { return x.codice; }).join(', ') +
        '). Il tracciato porta il codice, non il nome: finché non li abbini a una persona, ' +
        'polizze e rate entrano senza collaboratore.' });
    }
    if (cfScartati) {
      note.push({ g: 'grave', t: cfScartati + ' anagrafiche hanno un codice fiscale di forma sbagliata: entrano SENZA, ' +
        'cioè come clienti nuovi anche se in archivio ci fossero già. Meglio un doppione, che si vede e si unisce, ' +
        'che due persone fuse in una, che si scopre quando qualcuno chiama per una polizza che risulta di un altro.' });
    }
    var ignoti = Object.keys(tipiIgnoti);
    if (ignoti.length) {
      note.push({ g: 'avviso', t: 'Tipi di rata che non conosco, entrati come «rata» generica: ' +
        ignoti.map(function (k) { return k + ' (' + tipiIgnoti[k] + ')'; }).join(', ') +
        '. La parola di HDI resta scritta sulla rata.' });
    }
    if (scartati.length) {
      note.push({ g: 'avviso', t: scartati.length + ' rate su ' + tit.length +
        ' restano fuori: non dicono a quale polizza appartengono, oppure la loro polizza non e\u0300 ne\u0301 nel file ne\u0301 in archivio.' });
    }
    var senzaMezzo = titoli.filter(function (t) { return !t.mezzo_pagamento; }).length;
    if (senzaMezzo) {
      note.push({ g: 'avviso', t: senzaMezzo + ' rate su ' + titoli.length +
        ' entrano senza il mezzo di pagamento: il mezzo sta sull\'incasso, e per queste l\'incasso non e\u0300 in questo file.' });
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
      collaboratori: codiciProduttore,
      avvisi: note
    };
  }

  var API = {
    TIPI: TIPI, euro: euro, data: data, colonna: c,
    leggi: leggi, controllaBusta: controllaBusta, esamina: esamina,
    anagrafica: anagrafica, polizza: polizza, garanzia: garanzia,
    rate: rate, veicolo: veicolo, sinistro: sinistro, incasso: incasso,
    mezzoNostro: mezzoNostro, converti: converti,
    pezzoCf: pezzoCf, dividiNome: dividiNome,
    codiceFiscaleValido: codiceFiscaleValido,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FlussoHDI = API;
})();
