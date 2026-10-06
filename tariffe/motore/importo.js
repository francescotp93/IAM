/* ═══════════════════════════════════════════════════════════════════════════════
   UN IMPORTO IN EURO, LETTO SENZA INDOVINARE                  (06/10/2026)

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ IL GUASTO CHE QUESTO FILE ESISTE PER NON RIFARE.                          │
   └───────────────────────────────────────────────────────────────────────────┘
   La schermata «Link di pagamento» mandava a Stripe l'importo scritto a mano
   dall'operatore, e il lato server lo leggeva così: toglieva TUTTI i punti
   (trattandoli da separatore delle migliaia) e poi cambiava la virgola in
   punto. Misurato il 06/10/2026 su quella funzione:

       scritto «170,00»  ->      170,00 €   giusto
       scritto «170.00»  ->   17.000,00 €   CENTO VOLTE TANTO
       scritto «150.50»  ->   15.050,00 €   CENTO VOLTE TANTO
       scritto «1.500,00» ->  1.500,00 €    giusto

   Il campo è un `text` con tastierino decimale: sul telefono il tasto che
   esce è il PUNTO. E il numero che compariva nell'elenco combaciava con
   quello mandato a Stripe, quindi il controllo a vista non salvava nessuno:
   l'unico a vedere la cifra sbagliata era il cliente, sulla pagina di
   pagamento.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LA REGOLA: QUELLO CHE È AMBIGUO SI RIFIUTA, NON SI INTERPRETA.            │
   └───────────────────────────────────────────────────────────────────────────┘
   «170.00» in italiano può voler dire 170,00 € (punto decimale, come sulla
   tastiera del telefono) oppure 17.000,00 € (punto delle migliaia). Sono
   entrambe letture legittime, e nessuna delle due è più probabile dell'altra
   abbastanza da giocarsi i soldi di un cliente. Quindi non si sceglie: si
   dice all'operatore che quella scrittura ha due significati e gli si fanno
   vedere entrambi, con la forma giusta da usare.

   È la stessa regola del lettore dei documenti di prodotto: quello che non si
   è capito si DICHIARA, non si deduce. Là produceva un «assente» falso su un
   confronto; qui produce un importo falso su una richiesta di pagamento.

   Si accetta:                           Si rifiuta:
       1500        -> 1.500,00 €             170.00    (due letture)
       170,5       ->   170,50 €             1.500     (due letture)
       170,50      ->   170,50 €             170,005   (tre decimali)
       1.500,00    -> 1.500,00 €             170,0,0   (due virgole)
       1.500.000   -> un milione e mezzo     €         (nessuna cifra)
                      (due gruppi di punti:      0     (non maggiore di zero)
                       la lettura decimale
                       non esiste)

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ I CENTESIMI SI CONTANO CON GLI INTERI.                                    │
   └───────────────────────────────────────────────────────────────────────────┘
   Non perché `Math.round(parseFloat(x) * 100)` sbagli — provato, su due
   decimali l'arrotondamento recupera l'imprecisione della virgola mobile e il
   risultato è lo stesso. Perché con gli interi NON C'È NIENTE DA PROVARE: le
   due parti della cifra restano stringhe e diventano un intero senza passare
   dai decimali, e nessuno deve più ragionare su dove la virgola mobile tiene
   e dove no. Quello che si prova invece, e che vale, è il giro completo:
   `leggi(scritto(c)).cents === c` per tutti i centesimi.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ PERCHÉ STA IN UN MOTORE E NON NELLA SCHERMATA.                            │
   └───────────────────────────────────────────────────────────────────────────┘
   Una regola scritta dentro una pagina non si prova senza aprire un browser,
   e questa è una regola sui soldi: va provata in Node, su una tabella di casi,
   e controprovata guastandola. Anche la FRASE DI CONFERMA sta qui, per lo
   stesso motivo: è lei che l'operatore legge prima di generare il link, e una
   frase che sbaglia l'importo è peggio di nessuna frase.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'importo-2026-10-06';

  /* Tetto di sanità: oltre questo non è un premio, è un errore di battitura
     che è andato lungo. Non è un limite di prodotto — serve solo a non far
     uscire numeri che gli interi non reggono più. */
  var TETTO_CENTS = 999999999;          /*  9.999.999,99 € */

  /* Sopra questa cifra la conferma si chiede una seconda volta, e con parole
     diverse: è la rete sotto l'errore «cento volte tanto», che per le cifre
     normali di un premio cade sempre di là. */
  var SOGLIA_CENTS = 1000000;           /*     10.000,00 € */

  /* ── le forme che hanno UN solo significato ──────────────────────────────── */
  var SOLO_CIFRE    = /^\d+$/;                        /* 1500            */
  var CIFRE_DEC     = /^\d+,\d{1,2}$/;                /* 170,5 · 170,50  */
  var MIGLIAIA_DEC  = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/; /* 1.500,00        */
  /* Due o più gruppi di punti e nessuna virgola: la lettura «punto decimale»
     non esiste (un numero non ha due separatori decimali), quindi di
     significati ne resta uno. Con UN gruppo solo — «1.500» — ce ne sono due,
     e si rifiuta. */
  var MIGLIAIA_SOLE = /^\d{1,3}(?:\.\d{3}){2,}$/;     /* 1.500.000       */

  function togliSpazi(testo) {
    return String(testo == null ? '' : testo)
      /* spazio normale, indivisibile, indivisibile fine, da cifre: li mette la
         copia-incolla da un foglio di calcolo, non l'operatore */
      .replace(/[\s\u00a0\u202f\u2007]/g, '')
      .replace(/€/g, '')
      .replace(/^EUR/i, '')
      .replace(/^\+/, '');
  }

  /* Parte intera (con o senza punti delle migliaia) + decimali -> centesimi.
     Tutto con interi: vedi l'intestazione. */
  function aCentesimi(intero, decimali) {
    var i = intero.replace(/\./g, '');
    var d = ((decimali || '') + '00').slice(0, 2);
    return parseInt(i, 10) * 100 + parseInt(d, 10);
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* La forma canonica da mandare al server: cifre, virgola, due decimali, e
     NESSUN punto. Non è un vezzo — il lato server installato legge ancora
     l'importo in euro, e su questa forma la sua lettura è esatta: senza punti
     non c'è niente da interpretare. */
  function scritto(cents) {
    return Math.floor(cents / 100) + ',' + pad2(cents % 100);
  }

  /* 1234567 -> «12.345,67 €». A mano e non con toLocaleString, perché deve
     venire identico in Node (dove l'ICU può non esserci) e nel browser: una
     prova che misura una formattazione diversa da quella vera non misura
     niente. */
  function euro(cents) {
    var n = Math.max(0, Math.round(Number(cents) || 0));
    var i = String(Math.floor(n / 100)), fuori = '';
    while (i.length > 3) { fuori = '.' + i.slice(-3) + fuori; i = i.slice(0, -3); }
    return i + fuori + ',' + pad2(n % 100) + ' €';
  }

  function no(motivo) { return { ok: false, motivo: motivo }; }
  function si(cents) {
    return { ok: true, cents: cents, scritto: scritto(cents), euro: euro(cents),
      sopraSoglia: cents >= SOGLIA_CENTS };
  }

  /* Le DUE letture di una scrittura col punto, per poterle far vedere tutte e
     due invece di scegliere: «170.00» -> 170,00 € oppure 17.000,00 €. */
  function dueLetture(s) {
    var m = s.match(/^(\d+)\.(\d{1,3})$/);
    if (!m) return null;
    var decimale = m[2].length <= 2
      ? aCentesimi(m[1], m[2])                                  /* 170.00 -> 170,00 */
      : aCentesimi(m[1], m[2].slice(0, 2));                     /* 1.500 -> 1,50    */
    var migliaia = aCentesimi(m[1] + m[2], '');                 /* 170.00 -> 17.000 */
    if (decimale === migliaia) return null;
    return { decimale: euro(decimale), migliaia: euro(migliaia) };
  }

  function leggi(testo) {
    var s = togliSpazi(testo);
    if (!s) return no('Metti un importo.');
    if (/[^\d.,]/.test(s)) {
      return no('Nell\'importo c\'è qualcosa che non è un numero: scrivi solo le cifre, '
        + 'il punto delle migliaia e la virgola dei centesimi.');
    }
    if ((s.match(/,/g) || []).length > 1) {
      return no('Ci sono due virgole: di virgola ce n\'è una sola, quella dei centesimi.');
    }
    if (/,\d{3,}$/.test(s)) {
      return no('Dopo la virgola ci stanno al massimo due cifre, i centesimi. '
        + 'Arrotondare da solo un premio vuol dire non quadrare con la compagnia.');
    }
    if (/^[.,]/.test(s) || /[.,]$/.test(s)) return no('L\'importo è scritto a metà.');
    if (s.replace(/[.,]/g, '').length > 12) return no('Questo non è un importo: sono troppe cifre.');

    var m;
    if (SOLO_CIFRE.test(s)) return finisci(aCentesimi(s, ''));
    if ((m = s.match(/^(\d+),(\d{1,2})$/)) && CIFRE_DEC.test(s)) return finisci(aCentesimi(m[1], m[2]));
    if ((m = s.match(/^([\d.]+),(\d{1,2})$/)) && MIGLIAIA_DEC.test(s)) return finisci(aCentesimi(m[1], m[2]));
    if (MIGLIAIA_SOLE.test(s)) return finisci(aCentesimi(s, ''));

    /* Resta il punto ambiguo — il guasto da cui è nato questo file. */
    var due = dueLetture(s);
    if (due) {
      return no('«' + s + '» col punto può voler dire ' + due.decimale + ' oppure '
        + due.migliaia + ', e su un importo non si indovina. '
        + 'Per i centesimi usa la virgola.');
    }
    if (s.indexOf('.') >= 0) {
      return no('Il punto serve solo a separare le migliaia, a gruppi di tre: «1.500,00». '
        + 'Per i centesimi usa la virgola.');
    }
    return no('Non riesco a leggere «' + s + '» come un importo.');
  }

  function finisci(cents) {
    if (!isFinite(cents) || cents <= 0) return no('L\'importo deve essere maggiore di zero.');
    if (cents > TETTO_CENTS) return no('Questo importo è fuori scala: il massimo è ' + euro(TETTO_CENTS) + '.');
    return si(cents);
  }

  /* ── la frase che l'operatore legge prima di generare il link ─────────────── */
  /* Sta nel motore e non nella schermata perché è lei la difesa vera: il
     controllo non è il numero nel campo (quello l'operatore l'ha appena
     scritto e lo rilegge come crede di averlo scritto), è l'importo riscritto
     in euro, con il nome di chi lo riceverà. */
  function frase(dati) {
    dati = dati || {};
    var chi = String(dati.cliente || '').trim();
    var causale = String(dati.causale || '').trim();
    return 'Stai per chiedere ' + euro(dati.cents) + (chi ? ' a ' + chi : '')
      + (causale ? '\nCausale: ' + causale : '')
      + '\n\nIl link è pagabile da chiunque lo riceva. Confermi?';
  }

  /* La seconda domanda, sopra soglia: parole DIVERSE di proposito. Due volte
     la stessa frase si clicca due volte senza leggerla. */
  function fraseSoglia(cents) {
    return 'Attenzione: sono ' + euro(cents) + '.\n\n'
      + 'Un punto al posto della virgola moltiplica per cento. '
      + 'Rileggi la cifra: è proprio questa?';
  }

  var API = {
    VERSIONE: VERSIONE,
    TETTO_CENTS: TETTO_CENTS,
    SOGLIA_CENTS: SOGLIA_CENTS,
    leggi: leggi,
    euro: euro,
    scritto: scritto,
    frase: frase,
    fraseSoglia: fraseSoglia,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Importo = API;
})();
