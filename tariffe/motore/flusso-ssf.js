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
  var MEZZO = {
  CREDITCARD: 'carta_credito', BANK_TRANSFER: 'bonifico', CASH: 'contante',
  CHEQUE: 'assegno', POS: 'pos',
  /* Questi arrivano dal file vero e prima finivano tutti a vuoto, perché il
     vocabolario del gestionale ne conosceva cinque. Un mezzo di pagamento
     vuoto su una rata incassata è un buco in contabilità: si sa che è stata
     pagata e non come. I nomi restano i nostri, il codice della compagnia si
     conserva accanto. */
  PAYPAL: 'paypal', PREPAID: 'prepagata',
  /* «EXTERNAL» e la lista multipla («APPLEPAY/CREDITCARD/GOOGLEPAY/…») dicono
     che il pagamento è passato da fuori o che la compagnia non sa quale dei
     modi sia stato usato: `altro` è la verità, e non si sceglie per loro. */
  EXTERNAL: 'altro' };

/* Quello che il gestionale sa scrivere. Serve a due cose: tradurre il flusso e
   riempire la tendina con cui si CORREGGE a mano (una compagnia che manda un
   codice nuovo non deve lasciare il campo vuoto per sempre). */
var MEZZI = [
  { id: 'carta_credito', l: 'Carta di credito' },
  { id: 'bonifico',      l: 'Bonifico' },
  { id: 'contante',      l: 'Contante' },
  { id: 'assegno',       l: 'Assegno' },
  { id: 'pos',           l: 'POS' },
  { id: 'paypal',        l: 'PayPal' },
  { id: 'prepagata',     l: 'Carta prepagata' },
  { id: 'domiciliazione', l: 'Domiciliazione (SDD)' },
  { id: 'altro',         l: 'Altro' }
];

/* Dal codice della compagnia al nostro. Una lista multipla («A/B/C») vuol dire
   che la compagnia non sa quale sia stato: `altro`, non il primo della lista —
   scegliere il primo sarebbe inventare. */
function mezzoDa(codice) {
  var c = String(codice || '').trim().toUpperCase();
  if (!c) return null;
  if (MEZZO[c]) return MEZZO[c];
  if (c.indexOf('/') >= 0) return 'altro';
  return null;
}

  /* I tipi di titolo che sappiamo tradurre, e sono TRE: `PN` (il premio nuovo
     — nel file vero copre nuovo affare, rinnovo e sostituzione), `QZ` (la
     quietanza, cioè la rata successiva) e `AP` (l'appendice).

     Tutto il resto non entra in contabilità e si DICHIARA. Non è prudenza
     astratta: un titolo è una riga di soldi, e tradurne uno a occhio vuol
     dire scrivere un importo che nessuno ha detto. Sul portafoglio completo
     compaiono almeno `PS`, `ARM`, `ANN` e `RI` — codici che questo lettore
     non ha mai visto insieme a un dato che li spieghi, e finché non si sa
     che cosa sono restano fuori, con i loro numeri sotto gli occhi
     (`titoli.ignoti`): è guardandoli che si decide, non indovinando.
     Aggiungere un codice qui è una riga sola, dopo. */
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
    var clienti = [], collab = {};
    righe['010'].forEach(function (r) {
      if (String(r.FLAG_COLLABORATORE || '').toUpperCase() === 'S') {
        var k = testo(r.ID_ANAGRAFICA_EXP);
        if (k) collab[k] = {
          codice: k,
          nome: (testo(r.RAGIONE_SOCIALE) || '').replace(/^-\s*/, '').trim() || null,
          /* L'EMAIL È IL PONTE. È l'unico campo del flusso che corrisponde a
             qualcosa che abbiamo già: il collaboratore in agenzia ha la sua
             email, e i codici della compagnia (`U25337`) non li conosce
             nessuno. Senza, quei codici restano numeri che non si possono
             abbinare a una persona. */
          email: (testo(r.EMAIL) || '').toLowerCase() || null,
          rui: null, polizze: 0, premi: 0, provvigioni: 0
        };
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
    var emailCollab = {};
    Object.keys(collab).forEach(function (k) { if (collab[k].email) emailCollab[k] = collab[k].email; });
    righe['020'].forEach(function (r) {
      var p = versoPolizza(r, testata, veicoli[r.ID_POLIZZA_EXP], garanzie[r.ID_POLIZZA_EXP], { emailCollab: emailCollab });
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

    /* ── Il dettaglio dei titoli, garanzia per garanzia (REC042) ───────
       Fin qui si leggeva e si buttava. Ma è lì che sta la cosa che serve a
       chi vende: non «quanto ho guadagnato su questa polizza», ma su QUALE
       garanzia. Sul file vero la somma delle provvigioni di garanzia fa
       esattamente il totale del titolo su 18 titoli su 18: è un dato che
       quadra, non una stima. */
    var dettaglio = {};
    righe['042'].forEach(function (r) {
      var k = testo(r.ID_TITOLO_EXP) || testo(r.ID_TITOLO_INVIO);
      if (!k) return;
      (dettaglio[k] = dettaglio[k] || []).push({
        codice: testo(r.COD_GARANZIA_CMP), descrizione: testo(r.DESCRIZIONE_GARANZIA_CMP),
        lordo: numero(r.LORDO), netto: numero(r.NETTO), tasse: numero(r.TASSE),
        provvigioni: numero(r.PROVVIGIONI_TOTALI)
      });
    });

    /* ── I titoli ─────────────────────────────────────────────────────── */
    var titoli = [], titoliSaltati = {}, ignoti = [];
    var polizzePerChiave = {};
    polizze.forEach(function (p) { polizzePerChiave[p._fonte_id] = p; });
    righe['040'].forEach(function (r) {
      var tipo = TIPO_TITOLO[String(r.TIPO_TITOLO_SHARE || '').toUpperCase()];
      if (!tipo) {
        var k = testo(r.TIPO_TITOLO_SHARE) || '(vuoto)';
        titoliSaltati[k] = (titoliSaltati[k] || 0) + 1;
        /* Non basta contarli. Per decidere che cosa sono servono i NUMERI:
           su quale polizza stanno, quanto valgono, quando decorrono, che
           nome gli dà la compagnia. Un conteggio dice che c'è un buco; questi
           dati dicono di che buco si tratta. */
        ignoti.push({
          tipo_share: k,
          tipo_compagnia: testo(r.TIPO_TITOLO_COMPAGNIA),
          _polizza: testo(r.ID_POLIZZA_EXP),
          numero_polizza: testo(r.NUMERO_POLIZZA_CMP),
          data: data(r.EFFETTO_TITOLO),
          importo: numero(r.LORDO_TOTALE),
          provvigione: numero(r.PROVVIGIONI_TOTALE),
          stato: testo(r.STATO_SHARE),
          pagato_il: data(r.DT_PAG_CLIENTE)
        });
        return;
      }
      var t = versoTitolo(r, tipo);
      t._polizza = testo(r.ID_POLIZZA_EXP);
      t._ssf.garanzie = dettaglio[t._fonte_id] || [];
      if (!polizzePerChiave[t._polizza]) t._senzaPolizza = true;
      titoli.push(t);
    });
    /* UN avviso solo, non uno per codice: quattro riquadri che dicono la
       stessa cosa con una sigla diversa si leggono come quattro guasti, e la
       cosa da fare è una sola. */
    var codici = Object.keys(titoliSaltati).sort();
    if (codici.length) {
      avvisi.push({ g: 'avviso', t: ignoti.length + ' rat' + (ignoti.length === 1 ? 'a' : 'e') +
        ' non entra' + (ignoti.length === 1 ? '' : 'no') + ' in contabilità: ' +
        codici.map(function (k) { return '«' + k + '» ×' + titoliSaltati[k]; }).join(', ') +
        '. Sono tipi di titolo che questo lettore non sa tradurre, e un importo tradotto a occhio è un numero falso in contabilità. Li trovi qui sotto con i loro numeri: dimmi che cosa sono e li aggiungo.' });
    }

    /* Quello che ogni collaboratore ha prodotto in questo flusso. Si conta dai
       TITOLI e non dalle polizze, perché le provvigioni stanno lì: una polizza
       senza titolo nel periodo non ha ancora prodotto niente. */
    titoli.forEach(function (t) {
      /* Le rate di una polizza che non e' in portafoglio non si attribuiscono
         a nessuno: sono offerte di rinnovo non ancora pagate (regola 3) o
         pratiche che nel flusso non ci sono. Contarle vorrebbe dire dire a un
         collaboratore che ha prodotto qualcosa che il cliente non ha ancora
         pagato — e quel numero poi si legge come se fosse dovuto. */
      if (t._senzaPolizza) return;
      var c = t._ssf && t._ssf.collaboratore;
      if (!c || !collab[c]) return;
      collab[c].polizze++;
      collab[c].premi += (t.importo_lordo || 0);
      collab[c].provvigioni += (t.provvigione || 0);
    });
    /* I produttori di REC101 portano il codice RUI, che in REC010 non c'è.
       Chi compare solo lì entra lo stesso: è un collaboratore dell'agenzia
       che in questo periodo non ha prodotto. */
    righe['101'].forEach(function (r) {
      var k = testo(r.ID_ANAGRAFICA_EXP);
      if (!k) return;
      if (!collab[k]) collab[k] = { codice: k, nome: null, email: null, rui: null, polizze: 0, premi: 0, provvigioni: 0 };
      collab[k].rui = testo(r.COD_RUI) || collab[k].rui;
      if (!collab[k].nome) collab[k].nome = (testo(r.DESCRIZIONE_COLLABORATORE) || '').replace(/^-\s*/, '').trim() || null;
    });
    var collaboratori = Object.keys(collab).map(function (k) {
      var c = collab[k];
      c.premi = Math.round(c.premi * 100) / 100;
      c.provvigioni = Math.round(c.provvigioni * 100) / 100;
      return c;
    }).sort(function (a, b) { return b.provvigioni - a.provvigioni; });

    /* ── Le rate che restano da incassare ─────────────────────────────────
       Si generano DOPO il conto dei collaboratori, e non è un dettaglio: una
       rata che nessuno ha ancora incassato non ha prodotto provvigioni, e
       farla entrare in quel conto direbbe a un collaboratore che ha guadagnato
       qualcosa che il cliente non ha ancora pagato. */
    var perPolizza = {};
    titoli.forEach(function (t) { (perPolizza[t._polizza] = perPolizza[t._polizza] || []).push(t); });
    polizze.forEach(function (p) {
      var r = rataDaIncassare(p, perPolizza[p._fonte_id]);
      if (!r) return;
      if (r.avviso) { avvisi.push({ g: 'avviso', t: r.avviso }); return; }
      r.titolo._polizza = p._fonte_id;
      titoli.push(r.titolo);
    });

    var prodotti = righe['100'].map(function (r) {
      return { compagnia: testo(r.COMPAGNIA_EXP), ania: testo(r.COMPAGNIA_ANIA), ramo: testo(r.RAMO),
               codice: testo(r.CODICE_PRODOTTO), descrizione: testo(r.DESCRIZIONE_PRODOTTO) };
    });

    return {
      versione: VERSIONE, testata: testata,
      clienti: clienti, collaboratori: collaboratori,
      polizze: polizze, offerte: offerte, titoli: titoli, titoliIgnoti: ignoti,
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
  function versoPolizza(r, testata, veicolo, garanzie, opz) {
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
      /* Come la paga il cliente. Si scrive in una colonna sua e non solo
         dentro `dati`, perché è una cosa che si guarda e si CORREGGE: un
         codice che il flusso non sa tradurre resta vuoto, e lo si mette a
         mano dalla tendina. */
      mezzo_pagamento: mezzoDa(r.MEZZO_PAGAMENTO_CMP),
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
          /* L'email del collaboratore, presa dal suo record nel flusso: è il
             solo modo per abbinare il codice della compagnia («U25337») a una
             persona dell'agenzia. */
          collaboratore_email: (opz && opz.emailCollab && opz.emailCollab[testo(r.COLLABORATORE_1)]) || null,
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
      mezzo_pagamento: mezzoDa(r.MEZZO_PAGAMENTO_CMP),
      incassato_il: pagato,
      note: null,
      _ssf: {
        stato: stato, tipo_compagnia: testo(r.TIPO_TITOLO_COMPAGNIA),
        mezzo: testo(r.MEZZO_PAGAMENTO_CMP), competenza: data(r.DT_COMPETENZA_CONTABILE),
        collaboratore: testo(r.COLLABORATORE_1), giorni_mora: testo(r.GIORNI_MORA)
      }
    };
  }

  /* ══ 5-bis. LA RATA CHE RESTA DA INCASSARE ════════════════════════════════
     Su una polizza frazionata la compagnia manda la rata successiva quando
     l'ha già emessa: nel file vero succede due volte su venticinque, e quelle
     due arrivano con lo stato `I` (emessa, non pagata) e diventano rate
     «aperte» senza che si debba fare niente. Le altre no — e quella rata
     esiste lo stesso: il cliente la deve, e nessuno la vede.

     Il flusso però lo dice, in date invece che a parole:
       · `FRAZIONAMENTO_SHARE` dice in quante rate è divisa l'annualità;
       · `SCADENZA_INCASSATO` dice fin dove la polizza è pagata;
       · `SCADENZA_EFFETTIVA` dice fin dove il contratto corre.
     Se la prima data viene prima della seconda, fra le due c'è un pezzo di
     contratto scoperto, e il suo inizio è la decorrenza della rata successiva.
     È la stessa cosa che il brief chiama «polizza appena emessa con la rata
     successiva semestrale» — su una semestrale emessa oggi il flusso dice
     «pagata per sei mesi, coperta per dodici» — detta in un modo che continua
     a valere anche fra otto mesi, quando quella polizza non sarà più nuova.

     DUE COSE CHE NON SI FANNO, ed è il motivo per cui questa funzione
     restituisce anche degli avvisi invece di un numero:

     1. **Non si inventa un importo.** `premio_rata` vale per una rata INTERA.
        Se il pezzo scoperto è più corto di una rata — succede sul file vero
        con una polizza allineata a una scadenza diversa (pagata al 17/12/2026,
        in corsa fino al 07/03/2027) — l'importo di quel troncone non lo dice
        nessuno. Scriverci dentro il semestre pieno vorrebbe dire mettere in
        contabilità un credito che non esiste. Si dichiara e si lascia a mano.
     2. **Non si duplica quello che la compagnia ha già mandato.** Se fra i
        titoli del flusso ce n'è già uno che decorre da quella data, la rata
        c'è: questa regola sta zitta.

     La rata dedotta si riconosce: `fonte_id` finisce con `:RATA:<data>` —
     stabile, quindi ricaricare lo stesso file non la raddoppia (l'indice unico
     su fonte/fonte_id fa il resto) — e la nota dice in chiaro che la compagnia
     non l'ha mandata. Una riga di contabilità che non si distingue da quelle
     vere è una riga di cui non ci si può fidare. */
  var MESI_RATA = { 1: 12, 2: 6, 3: 4, 4: 3, 12: 1 };

  function due(n) { return (n < 10 ? '0' : '') + n; }

  /* Mesi aggiunti all'anniversario, non giorni: da 31/08 un semestre porta al
     28 (o 29) febbraio, non al 3 marzo, che è quello che farebbe `setMonth`
     da solo traboccando nel mese dopo. */
  function aggiungiMesi(iso, mesi) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var tot = (+m[2] - 1) + mesi;
    var anno = +m[1] + Math.floor(tot / 12), mese = ((tot % 12) + 12) % 12;
    var ultimo = new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
    return anno + '-' + due(mese + 1) + '-' + due(Math.min(+m[3], ultimo));
  }

  /* Torna `{ titolo }`, `{ avviso }` oppure null (non c'è niente da dire). */
  function rataDaIncassare(p, titoliDellaPolizza) {
    if (!p || p._offerta) return null;                       // regola 3: non è una polizza
    var ssf = (p.dati && p.dati.ssf) || {};
    var rate = ssf.rate_anno;
    if (!rate || rate <= 1) return null;                     // non frazionata: niente rata successiva
    if (p.stato_pagamento === 'annullata') return null;      // regola 4: chi è cessato non deve più niente

    var da = ssf.scadenza_incassato, fine = p.data_scadenza;
    if (!da || !fine || da >= fine) return null;             // niente di scoperto

    var gia = (titoliDellaPolizza || []).some(function (t) { return t.data_decorrenza === da; });
    if (gia) return null;                                    // la compagnia l'ha già mandata

    var nome = p.numero_polizza || p._fonte_id;
    var passo = MESI_RATA[rate] || null;
    var attesa = passo ? aggiungiMesi(da, passo) : null;
    if (!attesa || attesa > fine) {
      return { avviso: 'La polizza ' + nome + ' è pagata fino al ' + da + ' e corre fino al ' + fine +
        ': resta scoperto un pezzo più corto di una rata, e il flusso non ne dice l\'importo. La rata da incassare va messa a mano.' };
    }
    if (p.premio_rata == null) {
      return { avviso: 'La polizza ' + nome + ' ha una rata scoperta dal ' + da + ', ma il flusso non porta l\'importo di rata: va messa a mano.' };
    }

    return {
      titolo: {
        _fonte_id: p._fonte_id + ':RATA:' + da,
        _generato: true,
        tipo: 'rata',
        data_decorrenza: da,
        data_scadenza: da,
        importo_lordo: p.premio_rata,
        /* Le provvigioni di una rata non ancora emessa non le sa nessuno, e
           una stima qui finirebbe dritta nell'estratto conto di qualcuno. */
        provvigione: null,
        stato: 'aperto',
        mezzo_pagamento: p.mezzo_pagamento || null,
        incassato_il: null,
        note: 'Rata dedotta dal frazionamento ' + (p.frazionamento || rate + ' rate') +
              ': la compagnia non l\'ha mandata nel flusso. Importo pari alla rata precedente.',
        _ssf: { generato: true, da_frazionamento: rate, coperta_fino_al: fine, garanzie: [] }
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

    /* Le polizze per chiave, comprese le offerte: una rata di tipo ignoto può
       stare su un'offerta di rinnovo, e il cliente è quello che serve per
       riconoscerla a colpo d'occhio. */
    var polizzePerFonteLocale = {};
    [].concat(analisi.polizze || [], analisi.offerte || []).forEach(function (x) { polizzePerFonteLocale[x._fonte_id] = x; });

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
      titoli: {
        nuovi: titoliNuovi, gia: titoliGia, senzaPolizza: titoliSenzaPolizza,
        /* Quante di quelle rate le ha mandate la compagnia e quante le abbiamo
           dedotte noi dal frazionamento: due numeri, perché sono due cose
           diverse e chi guarda l'anteprima ha il diritto di saperlo prima di
           scrivere. */
        dedotti: titoliNuovi.filter(function (t) { return t._generato; }),
        daIncassare: titoliNuovi.filter(function (t) { return t.stato === 'aperto'; }),
        /* Le rate che restano fuori perché il tipo non si sa tradurre, coi
           loro numeri e col nome del cliente attaccato: è guardandole che si
           decide che cosa sono. Un conteggio da solo non basta a decidere. */
        ignoti: (analisi.titoliIgnoti || []).map(function (x) {
          var pol = polizzePerFonteLocale[x._polizza];
          var y = {};
          for (var k in x) y[k] = x[k];
          y.cliente = pol ? pol.cliente : null;
          y.numero_polizza = x.numero_polizza || (pol ? pol.numero_polizza : null);
          return y;
        })
      },
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
      /* I COLLABORATORI DEL FLUSSO, con l'email e quello che hanno prodotto.
         `riconosciuto` dice se quell'email è già una persona in agenzia: è
         l'abbinamento che il codice della compagnia da solo non permette.
         Qui non si scrive niente e non si crea nessuno — il registro unico
         delle persone è un'altra cosa (CLAUDE.md §10), e agganciarlo a occhio
         creerebbe i doppioni che quel lavoro ha appena tolto. Si mostra chi
         c'è e chi no, e la decisione resta a una persona. */
      collaboratori: (analisi.collaboratori || []).map(function (c) {
        var id = c.email && (e.collaboratoriPerEmail || {})[c.email];
        var x = {};
        for (var k in c) x[k] = c[k];
        x.riconosciuto = !!id;
        x.persona_id = id || null;
        return x;
      }),
      provvigioni: Math.round((analisi.collaboratori || []).reduce(function (t, c) { return t + (c.provvigioni || 0); }, 0) * 100) / 100,
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
    FRAZIONAMENTO: FRAZIONAMENTO, RAMO: RAMO, MEZZO: MEZZO, MEZZI: MEZZI, mezzoDa: mezzoDa, TIPO_TITOLO: TIPO_TITOLO,
    leggiCsv: leggiCsv, tipoDaNome: tipoDaNome, raccogli: raccogli,
    data: data, numero: numero,
    versoAnagrafica: versoAnagrafica, versoPolizza: versoPolizza, versoTitolo: versoTitolo,
    aggiungiMesi: aggiungiMesi, rataDaIncassare: rataDaIncassare,
    analizza: analizza, piano: piano,
    apriZip: apriZip
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FlussoSSF = API;
})();
