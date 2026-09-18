/* ═══════════════════════════════════════════════════════════════════════════════
   IL FLUSSO DI PORTAFOGLIO DELLE COMPAGNIE — SSF V12 (18/09/2026)

   Che cos'è. Le compagnie mandano ogni notte un archivio zip con dentro nove
   file CSV, uno per tipo di record. Non è un formato di Prima: è lo
   **Standard Share File**, lo stesso tracciato che usano altre compagnie e
   piattaforme. Per questo il motore si chiama `flusso-ssf` e non `prima`: si
   scrive una volta, e il file della compagnia successiva entra dalla stessa
   porta. Quello che cambia da compagnia a compagnia sono i codici prodotto e
   i nomi, non la struttura.

     REC000  la testata: chi manda, che versione, che periodo
     REC010  le anagrafiche — clienti E collaboratori, mescolati
     REC020  le polizze
     REC021  il veicolo della polizza (targa, classe, settore)
     REC030  le garanzie, con il premio di ognuna
     REC040  i titoli, cioè le rate, con le provvigioni
     REC042  il dettaglio del titolo garanzia per garanzia
     REC100  il catalogo prodotti della compagnia
     REC101  i produttori/collaboratori

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LE CINQUE COSE CHE IL FILE DICE E CHE NESSUNO INDOVINEREBBE.              │
   │ Sono misurate sul file vero del 17/09/2026, non dedotte dal manuale.      │
   └───────────────────────────────────────────────────────────────────────────┘

   1. **Metà delle «anagrafiche» non sono clienti.** In REC010 ci sono 37
      righe: 20 clienti e 17 collaboratori, distinti solo da
      `FLAG_COLLABORATORE`. Importarle tutte vorrebbe dire mettere i propri
      sub-agenti nel portafoglio clienti.

   2. **`LORDO_TOTALE` della polizza è il premio DI RATA, non annuo.** Su una
      semestrale la polizza dice 110,00 e i due titoli dell'anno sommano
      220,00. Scriverlo in `premio_annuo` dimezzerebbe il valore del
      portafoglio su ogni polizza frazionata — un errore che nessuno vede,
      perché 110 è un numero credibile.

   3. **Le righe senza `SCADENZA_EMESSO` non sono polizze: sono offerte.**
      Le righe in stato PV (e una in ST) sono offerte di rinnovo emesse e non
      ancora pagate: `EFFETTO` è la data del rinnovo, `SCADENZA_EFFETTIVA` è
      `EFFETTO + 15 giorni`, cioè il termine per pagare (`GIORNI_MORA`), non
      la scadenza del contratto. Importarle come polizze riempirebbe lo
      scadenzario di scadenze false a due settimane. Il discriminante buono
      non è lo stato, è `SCADENZA_EMESSO`: se è vuoto, non è mai stato
      emesso niente.

   4. **Una polizza che finisce alla sua scadenza naturale non è annullata.**
      Prima non ha tacito rinnovo: alla scadenza la polizza «storna»
      (`COD_STATO_SHARE = ST`, motivo `EXPIRING_POLICY`, data di annullamento
      **uguale** alla scadenza) e ne nasce una nuova. Nove righe su trentadue
      sono così, e sei di quelle scadono nei prossimi mesi. Segnarle
      «annullate» le toglierebbe dallo scadenzario: sono esattamente quelle
      da richiamare. Annullata è solo chi cessa **prima** della scadenza.

   5. **La compagnia che emette il flusso non è quella che porta il rischio.**
      L'emittente è PRIMA; il rischio sta su TRIGLAV, GREAT_LAKES,
      LA_PARISIENNE, NOBIS, IPTIQ… `compagnia` resta l'emittente, perché è
      con lei che si lavora ed è su quel nome che sono scritte le regole
      documentali; il portatore del rischio si conserva accanto. Sono due
      informazioni diverse e servono tutte e due.

   COME È FATTO. Motore puro: niente rete, niente database, niente `window`.
   Riceve testo, restituisce dati e un PIANO. Chi scrive sul database è la
   schermata, e lo fa solo dopo che il piano è stato visto da una persona.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'flusso-ssf-2026-09-18';

  /* I nove tipi di record, col nome che hanno nel file. Il nome del file è
     `REC020_M_PRIMA_A2194_20260917040040_P.csv`: il tipo sono le tre cifre
     dopo «REC», tutto il resto è emittente, agenzia e orario. */
  var RECORD = {
    '000': 'testata', '010': 'anagrafiche', '020': 'polizze', '021': 'veicoli',
    '030': 'garanzie', '040': 'titoli', '042': 'titoli_garanzie',
    '100': 'prodotti', '101': 'collaboratori'
  };

  /* ══ 1. LEGGERE ═══════════════════════════════════════════════════════════
     CSV col punto e virgola, prima riga di intestazione. Niente virgolette
     nel tracciato (i campi di testo sono maiuscoli e senza separatori), ma si
     gestiscono lo stesso: un indirizzo con un punto e virgola dentro
     manderebbe fuori fase tutte le colonne dopo, e il guasto si vedrebbe su
     un campo che non c'entra niente. */
  function leggiCsv(testo) {
    var t = String(testo || '').replace(/^﻿/, '');
    var righe = spezzaRighe(t);
    if (!righe.length) return { intestazione: [], righe: [] };
    var cap = spezzaRiga(righe[0]);
    var out = [];
    for (var i = 1; i < righe.length; i++) {
      if (!righe[i].trim()) continue;
      var c = spezzaRiga(righe[i]), r = {};
      for (var j = 0; j < cap.length; j++) r[cap[j]] = c[j] === undefined ? '' : c[j];
      out.push(r);
    }
    return { intestazione: cap, righe: out };
  }

  function spezzaRighe(t) {
    /* Si spezza a mano invece che con `split('\n')` perché una virgoletta
       aperta può contenere un a capo: spezzando prima, quella riga si
       romperebbe in due. */
    var out = [], cur = '', dentro = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (c === '"') { dentro = !dentro; cur += c; continue; }
      if (!dentro && (c === '\n' || c === '\r')) {
        if (c === '\r' && t[i + 1] === '\n') i++;
        out.push(cur); cur = ''; continue;
      }
      cur += c;
    }
    if (cur !== '') out.push(cur);
    return out;
  }

  function spezzaRiga(riga) {
    var out = [], cur = '', dentro = false;
    for (var i = 0; i < riga.length; i++) {
      var c = riga[i];
      if (c === '"') {
        if (dentro && riga[i + 1] === '"') { cur += '"'; i++; }
        else dentro = !dentro;
        continue;
      }
      if (c === ';' && !dentro) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  /* Dal nome del file al tipo di record. Se il nome non è quello previsto si
     restituisce null e chi chiama lo dice: un file che non si riconosce non
     si indovina dal contenuto. */
  function tipoDaNome(nome) {
    var m = /(?:^|\/)REC(\d{3})[_.]/i.exec(String(nome || ''));
    return m && RECORD[m[1]] ? m[1] : null;
  }

  /* ══ 2. CONVERSIONI ═══════════════════════════════════════════════════════ */
  function data(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return null;
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    /* Il TIMESTAMP_RECORD è già in forma ISO, con l'ora: si tiene la data. */
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? m[0] : null;
  }

  /* «243,48» → 243.48. La virgola è decimale e il punto è separatore di
     migliaia: «1.234,56» vale milleduecento, non uno virgola due. Un numero
     che non si legge torna null, mai 0: uno zero in un premio si somma agli
     altri e nessuno se ne accorge. */
  function numero(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return null;
    s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function testo(v) {
    var s = String(v == null ? '' : v).trim();
    return s === '' ? null : s;
  }

  /* ══ 3. LE TABELLINE DI TRADUZIONE ════════════════════════════════════════
     Ognuna ha un buco dichiarato: un codice che non c'è qui dentro non si
     traduce a caso, torna null e finisce negli avvisi. Un frazionamento
     inventato diventa una rata inventata. */
  var FRAZIONAMENTO = { '1': 'Annuale', '2': 'Semestrale', '3': 'Quadrimestrale', '4': 'Trimestrale', '12': 'Mensile' };
  var RATE_ANNO     = { '1': 1, '2': 2, '3': 3, '4': 4, '12': 12 };

  /* I nostri moduli (MODULES in index.html). HOME è «beni», dove stanno casa
     e famiglia. Un ramo che non conosciamo non diventa «beni» per comodità:
     resta vuoto e si vede nell'anteprima. */
  var RAMO = { MOTOR: 'rca', HOME: 'beni' };

  /* Il mezzo di pagamento ha un vincolo di valore sulla nostra tabella
     (`quote_titoli.mezzo_pagamento`): quello che non ci rientra resta vuoto e
     si conserva il codice della compagnia. PayPal e le prepagate non sono
     nessuna delle nostre cinque voci, e forzarle a «carta di credito»
     sporcherebbe i conti. */
  var MEZZO = { CREDITCARD: 'carta_credito', BANK_TRANSFER: 'bonifico', CASH: 'contante', CHEQUE: 'assegno', POS: 'pos' };

  /* I tipi di titolo che sappiamo tradurre. `RI` (rimborso/regolazione, che
     nel file vero vale 0,00) non è nessuno dei nostri quattro tipi: si
     salta e si dichiara, invece di entrare in contabilità come una rata da
     zero euro. */
  var TIPO_TITOLO = { PN: 'prima_rata', QZ: 'quietanza', AP: 'appendice' };

  /* ══ 4. ANALISI DEL FLUSSO ════════════════════════════════════════════════
     `file` è una mappa { '010': testo, '020': testo, … }. Torna tutto quello
     che c'è dentro, già tradotto nella forma di casa, più gli avvisi. */
  function analizza(file) {
    var f = file || {};
    var avvisi = [];
    var righe = {};
    Object.keys(RECORD).forEach(function (t) {
      righe[t] = f[t] ? leggiCsv(f[t]).righe : [];
    });

    if (!righe['020'].length) avvisi.push({ g: 'grave', t: 'Nel flusso non c\'è nessuna polizza (REC020): controlla di aver scelto l\'archivio giusto.' });

    var t0 = righe['000'][0] || {};
    var testata = {
      emittente: testo(t0.EMETTITORE),
      versione: testo(t0.VERSIONE_TRACCIATO),
      prodotto_il: data(t0.DATA_PRODUZIONE_FILE),
      dal: data(t0.DAL), al: data(t0.AL),
      intermediario: testo(t0.INTERMEDIARIO_EXP)
    };
    if (!testata.emittente) avvisi.push({ g: 'grave', t: 'Manca la testata (REC000): non si sa quale compagnia ha mandato questo flusso.' });
    if (testata.versione && !/V12/i.test(testata.versione)) {
      avvisi.push({ g: 'avviso', t: 'Il tracciato dichiara «' + testata.versione + '»: questo lettore è stato scritto sulla V12. Controlla i numeri prima di confermare.' });
    }

    /* ── Le anagrafiche: clienti da una parte, collaboratori dall'altra ──── */
    var clienti = [], collaboratori = [];
    righe['010'].forEach(function (r) {
      if (String(r.FLAG_COLLABORATORE || '').toUpperCase() === 'S') {
        collaboratori.push({ codice: testo(r.ID_ANAGRAFICA_EXP), nome: testo(r.RAGIONE_SOCIALE), email: testo(r.EMAIL) });
        return;
      }
      clienti.push(versoAnagrafica(r));
    });

    /* ── Veicoli e garanzie, indicizzati per polizza ───────────────────── */
    var veicoli = {}, garanzie = {};
    righe['021'].forEach(function (r) { veicoli[r.ID_POLIZZA_EXP] = versoVeicolo(r); });
    righe['030'].forEach(function (r) {
      (garanzie[r.ID_POLIZZA_EXP] = garanzie[r.ID_POLIZZA_EXP] || []).push({
        codice: testo(r.COD_GARANZIA_CMP), descrizione: testo(r.DESCRIZIONE_GARANZIA_CMP),
        lordo: numero(r.LORDO), netto: numero(r.NETTO), tasse: numero(r.TASSE), ssn: numero(r.SSN),
        massimale: testo(r.MASSIMO), franchigia: testo(r.FRANCHIGIA)
      });
    });

    /* ── Le polizze, e le offerte tenute da parte ──────────────────────── */
    var polizze = [], offerte = [];
    var perCliente = {};
    clienti.forEach(function (c) { perCliente[c._chiave] = c; });
    righe['020'].forEach(function (r) {
      var p = versoPolizza(r, testata, veicoli[r.ID_POLIZZA_EXP], garanzie[r.ID_POLIZZA_EXP]);
      var cli = perCliente[r.ID_ANAGRAFICA_EXP];
      p._cliente = cli ? cli._chiave : null;
      p._cf = cli ? cli.codice_fiscale : null;
      p._piva = cli ? cli.partita_iva : null;
      p.cliente = cli ? cli.nominativo : null;
      if (!cli) {
        avvisi.push({ g: 'avviso', t: 'La polizza ' + (p.numero_polizza || p._fonte_id) + ' è intestata a un\'anagrafica che non è nel flusso: non si importa a metà.' });
        p._senzaCliente = true;
      }
      if (p._offerta) offerte.push(p); else polizze.push(p);
    });

    /* ── I titoli ─────────────────────────────────────────────────────── */
    var titoli = [], titoliSaltati = {};
    var polizzePerChiave = {};
    polizze.forEach(function (p) { polizzePerChiave[p._fonte_id] = p; });
    righe['040'].forEach(function (r) {
      var tipo = TIPO_TITOLO[String(r.TIPO_TITOLO_SHARE || '').toUpperCase()];
      if (!tipo) {
        var k = testo(r.TIPO_TITOLO_SHARE) || '(vuoto)';
        titoliSaltati[k] = (titoliSaltati[k] || 0) + 1;
        return;
      }
      var t = versoTitolo(r, tipo);
      t._polizza = testo(r.ID_POLIZZA_EXP);
      if (!polizzePerChiave[t._polizza]) t._senzaPolizza = true;
      titoli.push(t);
    });
    Object.keys(titoliSaltati).forEach(function (k) {
      avvisi.push({ g: 'avviso', t: titoliSaltati[k] + ' titol' + (titoliSaltati[k] === 1 ? 'o' : 'i') + ' di tipo «' + k + '» non importat' + (titoliSaltati[k] === 1 ? 'o' : 'i') + ': non è nessuno dei quattro tipi che il gestionale conosce.' });
    });

    var prodotti = righe['100'].map(function (r) {
      return { compagnia: testo(r.COMPAGNIA_EXP), ania: testo(r.COMPAGNIA_ANIA), ramo: testo(r.RAMO),
               codice: testo(r.CODICE_PRODOTTO), descrizione: testo(r.DESCRIZIONE_PRODOTTO) };
    });
    righe['101'].forEach(function (r) {
      var c = testo(r.ID_ANAGRAFICA_EXP);
      if (c && !collaboratori.some(function (x) { return x.codice === c; })) {
        collaboratori.push({ codice: c, nome: testo(r.DESCRIZIONE_COLLABORATORE), rui: testo(r.COD_RUI) });
      }
    });

    return {
      versione: VERSIONE, testata: testata,
      clienti: clienti, collaboratori: collaboratori,
      polizze: polizze, offerte: offerte, titoli: titoli,
      prodotti: prodotti, avvisi: avvisi
    };
  }

  /* ══ 5. LE MAPPATURE, UNA PER ENTITÀ ══════════════════════════════════════ */

  /* Il cliente. `RAGIONE_SOCIALE` porta sia le persone sia le società; il
     tracciato distingue con `LUNGHEZZA_COGNOME`, che dice quanti caratteri
     iniziali sono il cognome. Con il codice fiscale di sedici caratteri è una
     persona fisica; con la sola partita IVA è una società. */
  function versoAnagrafica(r) {
    var cf = (testo(r.CODICE_FISCALE) || '').toUpperCase() || null;
    var piva = testo(r.PARTITA_IVA);
    var nominativo = (testo(r.RAGIONE_SOCIALE) || '').replace(/^-\s*/, '').trim();
    var fisica = !!(cf && cf.length === 16);
    var lung = parseInt(r.LUNGHEZZA_COGNOME, 10);
    var cognome = null, nome = null;
    if (fisica && lung > 0 && lung < nominativo.length) {
      cognome = nominativo.slice(0, lung).trim();
      nome = nominativo.slice(lung).trim();
    }
    return {
      _chiave: testo(r.ID_ANAGRAFICA_EXP),
      tipo: fisica ? 'fisica' : 'giuridica',
      nominativo: nominativo || null,
      cognome: cognome, nome: nome,
      ragione_sociale: fisica ? null : (nominativo || null),
      codice_fiscale: cf, partita_iva: piva,
      indirizzo: testo(r.INDIRIZZO), cap: testo(r.CAP),
      comune: testo(r.COMUNE), provincia: testo(r.PROVINCIA),
      cellulare: testo(r.CELLULARE), telefono: testo(r.NUMERO_TELEFONO),
      email: (testo(r.EMAIL) || '').toLowerCase() || null,
      data_nascita: data(r.DATA_NASCITA)
    };
  }

  function versoVeicolo(r) {
    return {
      targa: testo(r.TARGA), telaio: testo(r.TELAIO),
      marca: testo(r.MARCA), modello: testo(r.MODELLO),
      settore: testo(r.SETTORE_RCA_SHARE), classe: testo(r.CLASSE_RCA_SHARE),
      immatricolazione: data(r.DATA_IMMATRICOLAZIONE)
    };
  }

  /* La polizza. Qui stanno le regole 2, 3, 4 e 5 della testata di questo
     file: sono quelle che, sbagliate, producono numeri credibili e falsi. */
  function versoPolizza(r, testata, veicolo, garanzie) {
    var stato = String(r.COD_STATO_SHARE || '').toUpperCase();
    var emesso = data(r.SCADENZA_EMESSO);
    var incassato = data(r.SCADENZA_INCASSATO);
    var effetto = data(r.EFFETTO);
    var scadenza = data(r.SCADENZA_EFFETTIVA);
    var annullamento = data(r.DATA_ANNULLAMENTO);
    var fraz = String(r.FRAZIONAMENTO_SHARE || '').trim();
    var lordo = numero(r.LORDO_TOTALE);

    /* REGOLA 3 — se non è mai stato emesso niente, non è una polizza. */
    var offerta = !emesso && !incassato;

    /* REGOLA 4 — annullata solo se cessa PRIMA della sua scadenza. */
    var annullataDavvero = !!(stato === 'ST' && annullamento && scadenza && annullamento < scadenza);

    var pagamento = 'non_pagato';
    if (annullataDavvero) pagamento = 'annullata';
    else if (stato === 'SP') pagamento = 'sospeso';
    else if (incassato) pagamento = 'pagato';

    /* REGOLA 2 — il lordo è la RATA. L'annuo si scrive solo quando la rata è
       l'anno intero; altrimenti resta vuoto, che vuol dire «da confermare».
       Moltiplicare la rata per il numero di rate sarebbe una stima, e una
       stima in un portafoglio diventa un dato dopo due settimane. */
    var rate = RATE_ANNO[fraz] || null;
    var annuo = (rate === 1) ? lordo : null;

    return {
      _fonte_id: testo(r.ID_POLIZZA_EXP),
      _offerta: offerta,
      _sostituisce: testo(r.NUMERO_POLIZZA_SOSTITUITA_1),
      numero_polizza: testo(r.NUMERO_POLIZZA_CMP),
      /* REGOLA 5 — l'emittente è la compagnia con cui si lavora. */
      compagnia: testata.emittente || testo(r.COMPAGNIA_EXP),
      prodotto: testo(r.PRODOTTO_CMP),
      modulo: RAMO[String(r.RAMO_CMP || '').toUpperCase()] || null,
      data_effetto: effetto,
      data_scadenza: scadenza,
      copertura_dal: effetto,
      copertura_al: incassato,
      frazionamento: FRAZIONAMENTO[fraz] || null,
      tacito_rinnovo: String(r.TACITO_RINNOVO_SHARE || '').toUpperCase() === 'S',
      premio_annuo: annuo,
      premio_rata: lordo,
      stato_pagamento: pagamento,
      dati: {
        ssf: {
          stato: stato, motivo_storno: testo(r.COD_STORNO_CMP),
          data_annullamento: annullamento,
          scadenza_originale: data(r.SCADENZA_ORIGINALE),
          scadenza_emesso: emesso, scadenza_incassato: incassato,
          /* REGOLA 5 — chi porta davvero il rischio. */
          compagnia_rischio: testo(r.COMPAGNIA_EXP),
          compagnia_ania: testo(r.COMPAGNIA_ANIA),
          agenzia: testo(r.AGENZIA),
          collaboratore: testo(r.COLLABORATORE_1),
          ramo: testo(r.RAMO_CMP),
          frazionamento_codice: fraz || null,
          rate_anno: rate,
          mezzo_pagamento: testo(r.MEZZO_PAGAMENTO_CMP),
          data_emissione: data(r.DATA_EMISSIONE),
          proposta: testo(r.NUMERO_PROPOSTA_CMP),
          netto: numero(r.NETTO_TOTALE), imponibile: numero(r.IMPONIBILE_TOTALE),
          tasse: numero(r.TASSE_TOTALE), ssn: numero(r.SSN_TOTALE),
          veicolo: veicolo || null,
          garanzie: garanzie || []
        }
      }
    };
  }

  function versoTitolo(r, tipo) {
    var stato = String(r.STATO_SHARE || '').toUpperCase();
    var pagato = data(r.DT_PAG_CLIENTE);
    return {
      _fonte_id: testo(r.ID_TITOLO_EXP) || testo(r.ID_TITOLO_INVIO),
      tipo: tipo,
      data_decorrenza: data(r.EFFETTO_TITOLO),
      data_scadenza: data(r.DATA_SCADENZA_EMESSO),
      importo_lordo: numero(r.LORDO_TOTALE),
      provvigione: numero(r.PROVVIGIONI_TOTALE),
      /* «incassato» solo quando il flusso porta la data di pagamento del
         cliente: uno stato senza una data è una promessa, e in contabilità
         non si incassa una promessa. Tutto il resto resta «aperto», che è la
         cosa vera: la rata c'è e non risulta pagata. */
      stato: (stato === 'P' && pagato) ? 'incassato' : 'aperto',
      mezzo_pagamento: MEZZO[String(r.MEZZO_PAGAMENTO_CMP || '').toUpperCase()] || null,
      incassato_il: pagato,
      note: null,
      _ssf: {
        stato: stato, tipo_compagnia: testo(r.TIPO_TITOLO_COMPAGNIA),
        mezzo: testo(r.MEZZO_PAGAMENTO_CMP), competenza: data(r.DT_COMPETENZA_CONTABILE),
        collaboratore: testo(r.COLLABORATORE_1), giorni_mora: testo(r.GIORNI_MORA)
      }
    };
  }

  /* ══ 6. IL PIANO ══════════════════════════════════════════════════════════
     Che cosa succederebbe a scrivere questo flusso, detto PRIMA di scriverlo.
     È la parte che rende l'importazione una cosa che si può guardare invece
     che una cosa che si subisce.

     `esistenti` è quello che il gestionale ha già:
       { clientiPerCf: {CF: id}, clientiPerPiva: {PIVA: id},
         polizzePerFonte: {fonte_id: id}, titoliPerFonte: {fonte_id: id} }

     LA REGOLA CHE COMANDA SU TUTTE: **un cliente che c'è già non si tocca.**
     Non si aggiorna l'indirizzo, non si «completa» il telefono, non si
     corregge il nome. Il flusso della compagnia porta i dati come li ha
     scritti il cliente sul sito, e la scheda in agenzia è stata sistemata a
     mano da qualcuno: sovrascriverla vorrebbe dire buttare via quel lavoro
     ogni notte. Alla polizza nuova si aggancia la scheda che c'è. */
  function piano(analisi, esistenti) {
    var e = esistenti || {};
    var perCf = e.clientiPerCf || {};
    var perPiva = e.clientiPerPiva || {};
    var perFonte = e.polizzePerFonte || {};
    var titFonte = e.titoliPerFonte || {};

    var clientiNuovi = [], clientiGia = [];
    var idPerChiave = {};
    (analisi.clienti || []).forEach(function (c) {
      var id = (c.codice_fiscale && perCf[c.codice_fiscale]) || (c.partita_iva && perPiva[c.partita_iva]) || null;
      if (id) { idPerChiave[c._chiave] = id; clientiGia.push(c); }
      else clientiNuovi.push(c);
    });

    /* Due righe con lo stesso codice fiscale dentro lo stesso flusso: si
       importa la prima e la seconda si aggancia a quella. Senza questo
       controllo il file creerebbe da solo il doppione che stiamo evitando. */
    var vistiCf = {};
    clientiNuovi = clientiNuovi.filter(function (c) {
      var k = c.codice_fiscale || c.partita_iva;
      if (!k) return true;
      if (vistiCf[k]) { c._duplicatoDi = vistiCf[k]; return false; }
      vistiCf[k] = c._chiave;
      return true;
    });

    var polizzeNuove = [], polizzeGia = [], polizzeSenzaCliente = [];
    (analisi.polizze || []).forEach(function (p) {
      if (p._senzaCliente) { polizzeSenzaCliente.push(p); return; }
      if (perFonte[p._fonte_id]) { p._id = perFonte[p._fonte_id]; polizzeGia.push(p); return; }
      polizzeNuove.push(p);
    });

    var titoliNuovi = [], titoliGia = [], titoliSenzaPolizza = [];
    (analisi.titoli || []).forEach(function (t) {
      if (t._senzaPolizza) { titoliSenzaPolizza.push(t); return; }
      if (titFonte[t._fonte_id]) { titoliGia.push(t); return; }
      titoliNuovi.push(t);
    });

    return {
      testata: analisi.testata,
      clienti: { nuovi: clientiNuovi, gia: clientiGia, idPerChiave: idPerChiave },
      polizze: { nuove: polizzeNuove, gia: polizzeGia, senzaCliente: polizzeSenzaCliente },
      titoli: { nuovi: titoliNuovi, gia: titoliGia, senzaPolizza: titoliSenzaPolizza },
      /* Le offerte di rinnovo non entrano in portafoglio (regola 3), ma si
         contano e si elencano: sono clienti da chiamare prima che scada il
         termine per pagare, cioè la cosa più utile che c'è in questo file. */
      offerte: (analisi.offerte || []).map(function (o) {
        return {
          numero_polizza: o.numero_polizza, cliente: o.cliente,
          effetto: o.data_effetto, entro: o.data_scadenza,
          premio: o.premio_rata, sostituisce: o._sostituisce
        };
      }),
      collaboratori: analisi.collaboratori || [],
      prodotti: analisi.prodotti || [],
      avvisi: analisi.avvisi || [],
      niente: !clientiNuovi.length && !polizzeNuove.length && !titoliNuovi.length
    };
  }

  /* ══ 7. LO ZIP, SENZA LIBRERIE ════════════════════════════════════════════
     Il flusso arriva zippato. Invece di tirarsi dietro una libreria da un
     CDN — che dal contenitore di collaudo non si raggiunge, e che è una
     dipendenza in più da tenere aggiornata — si legge l'indice dello zip a
     mano e si scompatta con `DecompressionStream`, che c'è nei browser e in
     Node. Sono sessanta righe e non invecchiano.

     Si legge l'INDICE (central directory), non le intestazioni locali: nelle
     intestazioni locali le misure possono essere a zero e arrivare dopo i
     dati, e chi le legge si ritrova con file vuoti senza un errore. */
  function apriZip(buffer) {
    var b = new Uint8Array(buffer);
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    var fine = -1;
    for (var i = b.length - 22; i >= 0 && i > b.length - 65558; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { fine = i; break; }
    }
    if (fine < 0) return Promise.reject(new Error('Non è un archivio zip: manca l\'indice.'));
    var quanti = dv.getUint16(fine + 10, true);
    var inizio = dv.getUint32(fine + 16, true);

    var voci = [], p = inizio;
    for (var k = 0; k < quanti; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var metodo = dv.getUint16(p + 10, true);
      var compressa = dv.getUint32(p + 20, true);
      var lungNome = dv.getUint16(p + 28, true);
      var lungExtra = dv.getUint16(p + 30, true);
      var lungComm = dv.getUint16(p + 32, true);
      var off = dv.getUint32(p + 42, true);
      var nome = new TextDecoder('utf-8').decode(b.subarray(p + 46, p + 46 + lungNome));
      voci.push({ nome: nome, metodo: metodo, compressa: compressa, off: off });
      p += 46 + lungNome + lungExtra + lungComm;
    }

    return Promise.all(voci.map(function (v) {
      /* L'intestazione locale serve solo per sapere dove cominciano i dati:
         nome ed extra possono essere lunghi diversamente dall'indice. */
      var ln = dv.getUint16(v.off + 26, true), le = dv.getUint16(v.off + 28, true);
      var dati = b.subarray(v.off + 30 + ln + le, v.off + 30 + ln + le + v.compressa);
      if (v.metodo === 0) return Promise.resolve({ nome: v.nome, testo: new TextDecoder('utf-8').decode(dati) });
      if (v.metodo !== 8) return Promise.reject(new Error('Compressione non gestita nel file ' + v.nome));
      return scompatta(dati).then(function (t) { return { nome: v.nome, testo: t }; });
    })).then(function (lista) {
      var out = {};
      lista.forEach(function (x) { out[x.nome] = x.testo; });
      return out;
    });
  }

  function scompatta(dati) {
    if (typeof DecompressionStream !== 'function') {
      return Promise.reject(new Error('Questo browser non sa scompattare gli zip: estrai l\'archivio e scegli i file CSV.'));
    }
    var ds = new DecompressionStream('deflate-raw');
    var w = ds.writable.getWriter();
    w.write(dati); w.close();
    return new Response(ds.readable).text();
  }

  /* Dai file di un archivio (o da un elenco di CSV scelti a mano) alla mappa
     che `analizza` si aspetta. I file che non si riconoscono non si buttano
     in silenzio: tornano in `ignorati`. */
  function raccogli(fileMap) {
    var out = {}, ignorati = [];
    Object.keys(fileMap || {}).forEach(function (nome) {
      var t = tipoDaNome(nome);
      if (t) out[t] = fileMap[nome]; else ignorati.push(nome);
    });
    return { record: out, ignorati: ignorati, trovati: Object.keys(out).length };
  }

  var API = {
    VERSIONE: VERSIONE, RECORD: RECORD,
    FRAZIONAMENTO: FRAZIONAMENTO, RAMO: RAMO, MEZZO: MEZZO, TIPO_TITOLO: TIPO_TITOLO,
    leggiCsv: leggiCsv, tipoDaNome: tipoDaNome, raccogli: raccogli,
    data: data, numero: numero,
    versoAnagrafica: versoAnagrafica, versoPolizza: versoPolizza, versoTitolo: versoTitolo,
    analizza: analizza, piano: piano,
    apriZip: apriZip
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FlussoSSF = API;
})();
