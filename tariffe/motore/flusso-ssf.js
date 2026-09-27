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
  /* I file si chiamano in due modi, e il secondo l'abbiamo scoperto il
     19/09/2026 aprendo il flusso di Plurima:

       V12 · `REC020_M_PRIMA_A2194_20260917040040_P.csv`
       V8  · `SSF_20_polizze.csv`

     Non è un dettaglio estetico: il lettore riconosceva solo il primo e si
     fermava prima di cominciare — «il file vero non ha testata», che sembra un
     archivio rotto e invece è un archivio che non abbiamo saputo aprire.

     Nel secondo modo il numero non è a tre cifre: `0`, `10`, `20`, `100`.
     Si riempie a sinistra con gli zeri, e `100` resta `100` — leggerlo come
     «10» metterebbe il catalogo prodotti al posto delle anagrafiche. */
  function tipoDaNome(nome) {
    var s = String(nome || '');
    var m = /(?:^|\/)REC(\d{3})[_.]/i.exec(s);
    if (m) return RECORD[m[1]] ? m[1] : null;
    m = /(?:^|\/)SSF[_-](\d{1,3})[_.]/i.exec(s);
    if (!m) return null;
    var t = m[1].length === 3 ? m[1] : ('00' + m[1]).slice(-3);
    return RECORD[t] ? t : null;
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
    /* Si tiene anche l'INTESTAZIONE di ogni record, non solo le righe.
       «La colonna non c'è nel tracciato» e «la colonna c'è ed è vuota» sono
       due cose diverse, e su questa differenza si decide se una polizza entra
       in portafoglio: leggere un campo assente come vuoto, il 19/09/2026,
       avrebbe scartato tutte e venti le polizze di un flusso V8 chiamandole
       offerte di rinnovo. È la stessa distinzione fra «non risponde» e «non
       c'è niente» (CLAUDE.md §18). */
    var righe = {}, colonne = {};
    Object.keys(RECORD).forEach(function (t) {
      var c = f[t] ? leggiCsv(f[t]) : { intestazione: [], righe: [] };
      righe[t] = c.righe;
      colonne[t] = {};
      (c.intestazione || []).forEach(function (x) { if (x) colonne[t][x] = true; });
    });
    /* «Questo tracciato dichiara questa colonna?» — la domanda che le regole
       fanno prima di fidarsi di un campo vuoto. */
    function dichiara(t, campo) { return !!(colonne[t] && colonne[t][campo]); }

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
    if (testata.versione && !/V\s*(12|8)\b/i.test(testata.versione)) {
      avvisi.push({ g: 'avviso', t: 'Il tracciato dichiara «' + testata.versione + '»: questo lettore conosce la V12 e la V8. Controlla i numeri prima di confermare.' });
    }

    /* ── Le anagrafiche: clienti da una parte, collaboratori dall'altra ────
       Il discriminante non è sempre lo stesso. La V12 marca il collaboratore
       sull'anagrafica (`FLAG_COLLABORATORE`); la V8 quella colonna non ce
       l'ha, e allora collaboratore è chi compare fra i PRODUTTORI (REC101).
       Senza questa seconda strada, un flusso V8 metterebbe la propria rete di
       vendita nel portafoglio clienti — la regola 1, che su Prima toglie 17
       righe su 37, sparirebbe in silenzio. */
    var produttori = {};
    righe['101'].forEach(function (r) {
      var k = testo(r.ID_ANAGRAFICA_EXP);
      if (k) produttori[k] = true;
    });
    var marcaCollab = dichiara('010', 'FLAG_COLLABORATORE');
    var clienti = [], collab = {};
    righe['010'].forEach(function (r) {
      var eCollab = marcaCollab
        ? String(r.FLAG_COLLABORATORE || '').toUpperCase() === 'S'
        : !!produttori[testo(r.ID_ANAGRAFICA_EXP)];
      if (eCollab) {
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
          rui: null, produttore: null, polizze: 0, premi: 0, provvigioni: 0
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
    /* Il codice produttore visto dall'anagrafica: serve alla V8, che sulla
       polizza quella colonna non ce l'ha. Si prende dalla riga grezza, non dal
       cliente già convertito, perché è un campo che al portafoglio non serve e
       nella scheda del cliente non deve finire. */
    var collabDiAnagrafica = {};
    righe['010'].forEach(function (r) {
      var k = testo(r.ID_ANAGRAFICA_EXP), c = testo(r.COLLABORATORE_1);
      if (k && c) collabDiAnagrafica[k] = c;
    });
    righe['020'].forEach(function (r) {
      var p = versoPolizza(r, testata, veicoli[r.ID_POLIZZA_EXP], garanzie[r.ID_POLIZZA_EXP],
        { emailCollab: emailCollab, dichiara: dichiara,
          collabCliente: collabDiAnagrafica[testo(r.ID_ANAGRAFICA_EXP)] || null });
      var cli = perCliente[r.ID_ANAGRAFICA_EXP];
      p._cliente = cli ? cli._chiave : null;
      p._cf = cli ? cli.codice_fiscale : null;
      p._piva = cli ? cli.partita_iva : null;
      p.cliente = cli ? cli.nominativo : null;
      if (!cli) {
        /* `k` e' l'etichetta della famiglia, e serve a chi disegna: con
           trecento polizze senza contraente trecento riquadri identici sono
           un muro, e la schermata deve poterli raccogliere in una sezione
           sola SENZA riconoscerli dal testo (una frase si riscrive, e allora
           il raggruppamento smette di funzionare in silenzio). */
        avvisi.push({ g: 'avviso', k: 'polizza-senza-cliente', t: 'La polizza ' + (p.numero_polizza || p._fonte_id) + ' è intestata a un\'anagrafica che non è nel flusso: non si importa a metà.' });
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
      var t = versoTitolo(r, tipo, String(r.TIPO_TITOLO_SHARE || '').toUpperCase());
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
    /* I produttori di REC101 portano due cose che in REC010 non ci sono: il
       CODICE RUI — il numero con cui l'intermediario è iscritto al registro,
       cioè l'unico campo del flusso che dice chi è una persona e non dove la
       si scrive — e il CODICE PRODUTTORE, che è quello con cui la compagnia lo
       chiama nei suoi discorsi. I due codici possono non coincidere con
       `ID_ANAGRAFICA_EXP`, che è la chiave delle polizze: si conservano tutti e
       tre, perché è con quello che si riconosce chi si sta guardando.
       Chi compare solo qui entra lo stesso: è un collaboratore dell'agenzia
       che in questo periodo non ha prodotto. */
    righe['101'].forEach(function (r) {
      var k = testo(r.ID_ANAGRAFICA_EXP);
      if (!k) return;
      if (!collab[k]) collab[k] = { codice: k, nome: null, email: null, rui: null, produttore: null, polizze: 0, premi: 0, provvigioni: 0 };
      collab[k].rui = testo(r.COD_RUI) || collab[k].rui;
      collab[k].produttore = testo(r.CODICE_PRODUTTORE) || collab[k].produttore;
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

    /* ── Il premio annuo delle frazionate ─────────────────────────────────
       Si ricava DOPO (la funzione salta comunque le rate dedotte, ma l'ordine
       dice che cosa guarda: le rate della compagnia, non le nostre). Dove non
       si può, la polizza resta senza premio annuo e si porta dietro il MOTIVO
       fin dentro la schermata: un «—» non dice se il premio non c'è o se il
       sistema non l'ha trovato. */
    polizze.forEach(function (p) {
      if (p.premio_annuo != null) return;
      var pa = premioAnnuo(p, perPolizza[p._fonte_id]);
      if (!pa) return;
      if (pa.importo != null) {
        p.premio_annuo = pa.importo;
        p.dati.ssf.premio_annuo_da = 'titoli';
        p.dati.ssf.premio_annuo_rate = pa.rate;
      } else {
        p.dati.ssf.premio_annuo_manca = pa.motivo;
      }
    });

    var prodotti = righe['100'].map(function (r) {
      return { compagnia: testo(r.COMPAGNIA_EXP), ania: testo(r.COMPAGNIA_ANIA), ramo: testo(r.RAMO),
               codice: testo(r.CODICE_PRODOTTO), descrizione: testo(r.DESCRIZIONE_PRODOTTO) };
    });

    /* ── CHE COSA QUESTO TRACCIATO NON PORTA ──────────────────────────────
       Non è un elenco di guasti: è quello che la compagnia non manda, e va
       detto prima che qualcuno lo scambi per un difetto del gestionale.
       «Le provvigioni sono a zero» su un estratto conto sembra un nostro
       errore di calcolo; sapere che la colonna arriva vuota da chi la manda è
       un'altra conversazione, e si fa con la compagnia. */
    var senza = [];
    if (!dichiara('020', 'SCADENZA_EMESSO'))
      senza.push('non distingue le offerte di rinnovo dalle polizze con una data: si guarda lo stato (PV)');
    if (!dichiara('020', 'SCADENZA_INCASSATO'))
      senza.push('non dice fin dove la polizza è pagata: la rata successiva non si può dedurre');
    if (!dichiara('010', 'FLAG_COLLABORATORE'))
      senza.push('non marca i collaboratori fra le anagrafiche: si riconoscono dai produttori (REC101)');
    if (!dichiara('020', 'MEZZO_PAG_SHARE') && !dichiara('020', 'MEZZO_PAGAMENTO_CMP'))
      senza.push('non dice come paga il cliente');
    if (!dichiara('020', 'DATA_EMISSIONE'))
      senza.push('non porta la data di emissione: resta vuota, si scrive a mano dal dettaglio della polizza');
    if (!righe['021'].length) senza.push('non porta il veicolo (targa, classe)');
    if (!righe['030'].length) senza.push('non porta le garanzie della polizza');
    if (!righe['042'].length) senza.push('non porta il dettaglio delle provvigioni garanzia per garanzia');
    /* Le due cose che si somigliano e non sono la stessa, e nessuna delle due
       si può convertire nell'altra senza inventare:

         · la colonna arriva VUOTA   → la compagnia non ha dichiarato niente
         · la colonna arriva a ZERO  → la compagnia ha dichiarato zero

       L'estratto conto le tratta in modo opposto (§17): una provvigione non
       dichiarata esce dai totali col motivo scritto, uno zero è un accordo e
       si conta. Sul flusso di Plurima del 19/09/2026 arriva `0,00` su tutte e
       trentasette le rate — che è quasi certamente una colonna riempita di
       default, ma «quasi certamente» non è un dato: lo zero resta zero, e lo
       si dice a chi deve chiederlo alla compagnia. */
    var conProvv = titoli.filter(function (t) { return t.provvigione != null; });
    if (titoli.length && !conProvv.length)
      senza.push('NESSUNA provvigione dichiarata su nessuna rata: l\'estratto conto provvigionale non avrà numeri da calcolare');
    else if (titoli.length && conProvv.length === titoli.length && !conProvv.some(function (t) { return t.provvigione !== 0; }))
      senza.push('tutte le rate dichiarano provvigione 0,00: il numero c\'è ed è zero, e uno zero nell\'estratto conto vale come un accordo — se non è così, va chiesto alla compagnia');

    return {
      versione: VERSIONE, testata: testata,
      tracciato: { versione: testata.versione || null, senza: senza },
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
  /* M3.1 (19/09/2026): la data di nascita dal codice fiscale, quando il flusso
     non la porta. La regola sta in UN motore (anagrafica.js) e non si ricopia
     qui: si cerca a ogni chiamata, perché nel browser i due file possono
     arrivare in un ordine qualunque, e in Node si carica accanto. */
  function motoreAnagrafica() {
    if (typeof window !== 'undefined' && window.Anagrafica) return window.Anagrafica;
    if (typeof require === 'function') { try { return require('./anagrafica.js'); } catch (e) { return null; } }
    return null;
  }
  /* Idem per la regola che decide se una rata ha portato soldi: sta in
     `pagamento-rata.js`, è la stessa per tutte le compagnie, e si cerca a
     ogni chiamata per lo stesso motivo (l'ordine di caricamento). */
  function motorePagamento() {
    if (typeof window !== 'undefined' && window.PagamentoRata) return window.PagamentoRata;
    if (typeof require === 'function') { try { return require('./pagamento-rata.js'); } catch (e) { return null; } }
    return null;
  }
  function nascitaDaCf(cf) {
    var M = motoreAnagrafica();
    if (!M || !cf) return null;
    var n = M.nascita(cf);
    return n ? n.data : null;
  }

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
      /* Quella del flusso vince; se manca, dal codice fiscale — e si dice
         che è ricavata (`_nascita_da_cf`). Un codice non valido non produce
         niente: il campo resta vuoto, e l'importazione non si ferma. */
      data_nascita: data(r.DATA_NASCITA) || (fisica ? nascitaDaCf(cf) : null),
      _nascita_da_cf: !data(r.DATA_NASCITA) && fisica && !!nascitaDaCf(cf)
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

    /* REGOLA 3 — se non è mai stato emesso niente, non è una polizza.
       Il discriminante buono è `SCADENZA_EMESSO`, **quando il tracciato ce
       l'ha**. La V8 non la manda affatto: leggerla come vuota vorrebbe dire
       chiamare offerta ogni polizza del flusso — sul file di Plurima del
       19/09/2026 tutte e venti — e non importarne nessuna.
       Dove quella colonna non esiste si guarda lo STATO, che è lo stesso
       vocabolario dello standard: `PV` è il rinnovo emesso e non ancora
       pagato. È un ripiego dichiarato, non una supposizione: l'anteprima dice
       che quel tracciato le offerte non le distingue come la V12. */
    var offerta = (opz && opz.dichiara && !opz.dichiara('020', 'SCADENZA_EMESSO'))
      ? (stato === 'PV')
      : (!emesso && !incassato);

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

    /* IL CODICE PRODUTTORE, e dove sta. La V12 lo mette sulla POLIZZA; la V8
       non ha quella colonna e lo mette sull'ANAGRAFICA del contraente. Chi
       chiama passa quello del cliente, e qui vince comunque il campo della
       polizza quando c'è: è il più specifico — una polizza può cambiare mano,
       un cliente no.

       NON si usa `AGENZIA`, che pure sul file di Plurima coincide riga per
       riga (3 polizze su «3520», 17 su «3489»): quello è il codice
       dell'agenzia, non di un collaboratore, e farne un codice produttore
       vorrebbe dire inventare un collaboratore che è l'agenzia stessa. Resta
       scritto fra le evidenze, per chi guarda. */
    var collaboratore = testo(r.COLLABORATORE_1) || (opz && opz.collabCliente) || null;

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
      /* Quando la compagnia l'ha EMESSA — che non è quando decorre: si emette
         prima, a volte settimane prima. È il criterio di ricerca più usato in
         agenzia, quindi sta in una colonna sua (M1.2, 19/09/2026), non solo
         dentro `dati`. Il V8 non porta la colonna: resta vuota, non si ricava
         dall'effetto. */
      data_emissione: data(r.DATA_EMISSIONE),
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
          collaboratore: collaboratore,
          /* L'email del collaboratore, presa dal suo record nel flusso: è il
             solo modo per abbinare il codice della compagnia («U25337») a una
             persona dell'agenzia. */
          collaboratore_email: (opz && opz.emailCollab && opz.emailCollab[collaboratore]) || null,
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

  /* ── DAL CODICE DI PRIMA ALLA SIGLA DELL'AGENZIA (26/09/2026) ──────────────
     Tre codici nel tracciato, e uno solo dei tre si traduce senza pensarci.

       AP → AP, e basta: è un'appendice e lo dice.
       QZ → QF, ma è una NOSTRA lettura, non la sua parola. Il tracciato chiama
            `QZ` «la quietanza, cioè la rata successiva»; i numeri lo
            confermano — delle 841 righe in archivio, 839 decorrono DENTRO
            l'annualità della polizza (in media 6,1 mesi dopo l'effetto) e zero
            decorrono dalla scadenza in poi. Una quietanza di rinnovo decorre
            dal rinnovo: queste no. Quindi `dedotta: true`.
       PN → NIENTE. Il tracciato dice che «nel file vero copre nuovo affare,
            rinnovo E sostituzione»: tre cose che l'agenzia distingue con tre
            sigle diverse. Scriverci NP vorrebbe dire dichiarare «cliente
            nuovo» su un rinnovo, e soprattutto NASCONDERE i rinnovi — che sono
            esattamente quello che serve per sapere chi non ha rinnovato. Resta
            vuoto, che è un dato: «non lo sappiamo da questo flusso».

     Il rinnovo, per Prima, si riconosce dalla catena delle annualità (una
     polizza che comincia dove finisce la precedente sulla stessa targa: 977 in
     archivio), e quella deduzione avrà una migrazione sua, provata prima. */
  var SIGLA_DA_CODICE = { AP: { sigla: 'AP', dedotta: false }, QZ: { sigla: 'QF', dedotta: true } };

  function versoTitolo(r, tipo, codice) {
    var sg = SIGLA_DA_CODICE[String(codice || '').toUpperCase()] || null;
    var stato = String(r.STATO_SHARE || '').toUpperCase();
    var pagato = data(r.DT_PAG_CLIENTE);
    /* La stessa regola dell'HDI, scritta in un posto solo. Qui non cambia il
       risultato — l'SSF guardava già la data di pagamento e non l'etichetta —
       ma aggiunge il terzo stato: `SP` diventa `sospeso` anche sulla RATA,
       mentre prima quella distinzione viveva solo sulla polizza. Sono 51
       polizze vere al 25/09/2026, e le loro rate finivano tutte in «aperto»
       insieme a quelle di cui la compagnia non dice niente. */
    var pag = motorePagamento();
    /* LA DATA DA SOLA NON BASTA, e la prova «quello che la compagnia ha già
       mandato non si duplica» me l'ha ricordato bruscamente: passando qui
       `pagato` senza guardare lo stato, una rata da incassare in più
       diventava incassata. Il motivo è che un titolo STORNATO si porta
       dietro la data di pagamento di prima — è la data di quando era vivo, e
       leggerla come un incasso vorrebbe dire contare due volte soldi
       restituiti.
       Quindi la data vale come movimento contabile solo quando la compagnia
       dichiara il titolo pagato: è la stessa condizione che c'era prima di
       questa modifica, e resta scritta qui invece che dentro al motore
       perché è una regola del tracciato SSF, non una regola generale. */
    var pg = pag ? pag.decide({
      incassoContabile: (stato === 'P') ? pagato : null,
      dichiaratoPagato: stato === 'P',
      dichiaratoSospeso: stato === 'SP',
    }, null) : null;
    return {
      _fonte_id: testo(r.ID_TITOLO_EXP) || testo(r.ID_TITOLO_INVIO),
      tipo: tipo,
      sigla_tipo: sg ? sg.sigla : null,
      sigla_dedotta: sg ? sg.dedotta : false,
      data_decorrenza: data(r.EFFETTO_TITOLO),
      data_scadenza: data(r.DATA_SCADENZA_EMESSO),
      importo_lordo: numero(r.LORDO_TOTALE),
      provvigione: numero(r.PROVVIGIONI_TOTALE),
      /* «incassato» solo quando il flusso porta la data di pagamento del
         cliente: uno stato senza una data è una promessa, e in contabilità
         non si incassa una promessa. Tutto il resto resta «aperto», che è la
         cosa vera: la rata c'è e non risulta pagata. */
      stato: pg ? pg.stato : ((stato === 'P' && pagato) ? 'incassato' : 'aperto'),
      pagamento: pg ? pg.pagamento : ((stato === 'P' && pagato) ? 'incassato' : 'da_incassare'),
      pagamento_dichiarato_senza_incasso: pg ? !!pg.dichiaratoSenzaIncasso : false,
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
        /* È una rata di frazionamento, e l'abbiamo dedotta noi dal
           frazionamento della polizza: la sigla lo dice, e `dedotta` dice che
           non l'ha detta nessuna compagnia. */
        sigla_tipo: 'QF',
        sigla_dedotta: true,
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

  /* ══ IL PREMIO ANNUO DELLE FRAZIONATE ═════════════════════════════════════
     Segnalato da Francesco il 20/09/2026: in portafoglio la colonna PREMIO
     mostrava «—» su TUTTE le semestrali. Non era il frontend: `premio_annuo`
     è vuoto nel dato, e lo è **apposta** — nel tracciato `LORDO_TOTALE` è il
     premio DI RATA, e moltiplicarlo per il frazionamento sarebbe una stima
     (regola 2). Una stima in un portafoglio diventa un dato dopo due
     settimane.

     Ma un numero vero c'è, e non è una stima: **la somma delle rate che la
     compagnia ha emesso**, quando coprono l'annualità. Sul file vero due
     semestrali da 110,00 fanno 220,00, e quelle due righe le ha scritte la
     compagnia, non noi.

     TRE CONDIZIONI, e nessuna è decorativa:

     1. **Solo le rate che ha mandato la compagnia.** Le rate DEDOTTE (§16,
        `:RATA:`) sono un nostro ragionamento: farle entrare nel premio annuo
        vorrebbe dire che metà di quel numero l'abbiamo inventato noi, e
        nessuno saprebbe quale metà.
     2. **Devono ricoprire l'annualità senza buchi.** Ordinate, la prima parte
        dall'effetto e l'ultima arriva a scadenza, e fra una e l'altra non
        c'è spazio. Con un buco in mezzo la somma non è il premio dell'anno:
        è la somma di quello che è arrivato.
     3. **Ognuna deve avere un importo.** Una rata senza importo non si salta:
        rende il totale non calcolabile, e lo si dice.

     Quando non si può, torna il MOTIVO — che la schermata stampa al posto del
     trattino muto: «—» non dice a nessuno se il premio non c'è o se il
     sistema non l'ha trovato (§12, §18). */
  var GIORNO = 86400000;

  function giorniFra(a, b) {
    if (!a || !b) return null;
    return Math.round((new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / GIORNO);
  }

  function premioAnnuo(p, titoliDellaPolizza) {
    if (!p) return null;
    /* Quello che la compagnia dichiara vince sempre: sulle annuali
       `LORDO_TOTALE` È il premio dell'anno. */
    if (p.premio_annuo != null) {
      return { importo: Number(p.premio_annuo), fonte: 'dichiarato', rate: null, motivo: null };
    }
    var inizio = p.data_effetto, fine = p.data_scadenza;
    if (!inizio || !fine) {
      return { importo: null, fonte: null, rate: 0,
               motivo: 'la polizza non dice da quando a quando corre' };
    }
    /* Condizione 1: solo le rate della compagnia, dentro l'annualità. */
    var righe = (titoliDellaPolizza || []).filter(function (t) {
      if (!t || t._generato) return false;
      if (String(t._fonte_id || t.fonte_id || '').indexOf(':RATA:') >= 0) return false;
      var d = t.data_decorrenza;
      return d && d >= inizio && d < fine;
    }).sort(function (a, b) { return String(a.data_decorrenza).localeCompare(String(b.data_decorrenza)); });

    if (!righe.length) {
      return { importo: null, fonte: null, rate: 0,
               motivo: 'la compagnia non ha mandato nessuna rata di questa annualità' };
    }
    /* Condizione 3: un importo che manca non si salta. */
    var senzaImporto = righe.filter(function (t) { return t.importo_lordo == null || !isFinite(Number(t.importo_lordo)); });
    if (senzaImporto.length) {
      return { importo: null, fonte: null, rate: righe.length,
               motivo: senzaImporto.length + ' rate su ' + righe.length + ' non dicono l\'importo' };
    }
    /* Condizione 2: devono ricoprire l'annualità, senza buchi. Tre giorni di
       tolleranza perché le date di rata seguono il calendario, non il
       cronometro. */
    var TOLL = 3;
    if (Math.abs(giorniFra(inizio, righe[0].data_decorrenza)) > TOLL) {
      return { importo: null, fonte: null, rate: righe.length,
               motivo: 'la prima rata non parte dall\'effetto della polizza' };
    }
    var ultima = righe[righe.length - 1];
    if (ultima.data_scadenza && Math.abs(giorniFra(ultima.data_scadenza, fine)) > TOLL) {
      return { importo: null, fonte: null, rate: righe.length,
               motivo: 'la compagnia ha mandato ' + righe.length + ' ' +
                       (righe.length === 1 ? 'rata' : 'rate') + ': non coprono l\'annualità' };
    }
    for (var i = 1; i < righe.length; i++) {
      var prec = righe[i - 1].data_scadenza;
      if (!prec || Math.abs(giorniFra(prec, righe[i].data_decorrenza)) > TOLL) {
        return { importo: null, fonte: null, rate: righe.length,
                 motivo: 'fra le rate della compagnia manca un pezzo di anno' };
      }
    }
    var tot = righe.reduce(function (s, t) { return s + Number(t.importo_lordo); }, 0);
    return { importo: Math.round(tot * 100) / 100, fonte: 'titoli', rate: righe.length, motivo: null };
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
  /* Le colonne che il database pretende, elencate qui perche' la funzione SQL
     che scrive deve filtrare le stesse: due elenchi che divergono vorrebbero
     dire un'anteprima che promette una riga e una scrittura che la butta. */
  var CAMPI_OBBLIGATORI = { polizze: ['data_effetto'], titoli: ['data_decorrenza', 'importo_lordo'] };

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
      /* Che cosa il tracciato non porta viaggia fino al piano: è quello che
         la schermata deve dire PRIMA che qualcuno guardi i numeri. */
      tracciato: analisi.tracciato,
      clienti: { nuovi: clientiNuovi, gia: clientiGia, idPerChiave: idPerChiave },
      polizze: { nuove: polizzeNuove, gia: polizzeGia, senzaCliente: polizzeSenzaCliente },
      /* LE RIGHE CHE IL DATABASE RIFIUTEREBBE (22/09/2026).
         `data_effetto` su una polizza, `data_decorrenza` e `importo_lordo` su
         una rata sono NOT NULL. Il motore lascia vuoto quello che non sa
         leggere invece di inventarlo — ed e' la regola di casa 8.1 — quindi
         una colonna illeggibile nel file diventa un vuoto, e il vuoto, con la
         scrittura tutto-o-niente, diventa un'importazione morta: non si perde
         quella riga, si perde tutto, con un messaggio grezzo del database e
         DOPO che l'anteprima aveva detto che andava bene.
         Si dichiarano PRIMA di scrivere: le esclude poi la funzione SQL, che
         e' l'ultima porta, ma chi guarda deve saperlo adesso. */
      incomplete: {
        polizze: polizzeNuove.filter(function (x) { return !x.data_effetto; }),
        titoli: titoliNuovi.filter(function (t) { return !t.data_decorrenza || t.importo_lordo == null; })
      },
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
    aggiungiMesi: aggiungiMesi, rataDaIncassare: rataDaIncassare, premioAnnuo: premioAnnuo,
    analizza: analizza, piano: piano, CAMPI_OBBLIGATORI: CAMPI_OBBLIGATORI,
    apriZip: apriZip
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FlussoSSF = API;
})();
