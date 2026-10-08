/* ═══════════════════════════════════════════════════════════════════════════════
   UNA POLIZZA LETTA DAL SUO PDF                               (08/10/2026)

   Carichi il PDF di una polizza e la schermata ti propone il cliente e i dati
   del contratto, già compilati. Tu guardi e confermi. Niente si salva prima.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ QUESTO MOTORE NON SALVA NIENTE E NON INDOVINA NIENTE.                     │
   └───────────────────────────────────────────────────────────────────────────┘
   Legge il testo di un PDF e torna quello che ha capito, con accanto LA PAGINA
   e L'ANCORA (la parola del documento su cui si è appoggiato). Quello che non
   ha capito finisce in `nonCapito`, con scritto perché.

   È la stessa regola del lettore dei documenti di prodotto, e per la stessa
   ragione misurata sul campo: su un set informativo vero, cinque tentativi
   indipendenti di DEDURRE un dato mancante hanno prodotto cinque dati falsi.
   Qui i dati falsi sarebbero peggio: un premio sbagliato, una scadenza
   sbagliata, o — il peggiore di tutti — la polizza di un cliente attaccata
   alla scheda di un altro.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ IL CLIENTE SI RICONOSCE DAL CODICE FISCALE, MAI DAL NOME.                 │
   └───────────────────────────────────────────────────────────────────────────┘
   Misurato sull'archivio il 08/10/2026: 4.465 schede, 4.348 col codice
   fiscale, e il database ha un indice UNICO su `upper(trim(codice_fiscale))`.
   Quindi un codice fiscale valido è una chiave vera: se c'è, quello è il
   cliente, senza discussioni.

   Il nome no. «Rossi Mario» può essere due persone, e due persone fuse in una
   sola scheda non si scoprono il giorno dopo: si scoprono quando uno dei due
   telefona per una polizza che risulta intestata a un altro. Per questo un
   nome che combacia produce un AVVISO e una scelta da fare a mano — mai un
   collegamento automatico. È la stessa regola che il lettore dei flussi HDI
   ha già scritto: «meglio un cliente nuovo di troppo che due persone fuse in
   una. Un doppione si vede e si unisce; una fusione si scopre tardi».

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ QUELLO CHE QUESTO MOTORE NON SA ANCORA FARE, E VA DETTO.      (08/10/2026)│
   └───────────────────────────────────────────────────────────────────────────┘
   Le ancore qui sotto sono quelle del linguaggio comune dei contratti italiani
   («Polizza n.», «Contraente», «Decorrenza», «Premio»), NON la forma di una
   compagnia precisa: in questo repository non c'è nemmeno una polizza vera su
   cui misurarle — i PDF che ci sono sono set informativi e condizioni, cioè
   documenti di PRODOTTO, non contratti di un cliente.

   È esattamente la situazione del 29/09/2026 col lettore dei set informativi,
   e quella volta misurare su un documento vero cambiò tutto: le regole tarate
   su una compagnia sola trovavano 12 garanzie su 17 su quella, e 3 su AXA,
   0 su HDI. Qui può succedere lo stesso. Finché non si misura su tre o quattro
   polizze vere, questo lettore è una proposta da correggere a mano, e la
   schermata deve dirlo. Non è un dettaglio da sistemare dopo: è IL punto.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'polizza-da-pdf-2026-10-08';

  function motoreAnagrafica() {
    if (typeof window !== 'undefined' && window.Anagrafica) return window.Anagrafica;
    if (typeof require === 'function') { try { return require('./anagrafica.js'); } catch (e) { /* nel browser */ } }
    return null;
  }
  function motoreImporto() {
    if (typeof window !== 'undefined' && window.Importo) return window.Importo;
    if (typeof require === 'function') { try { return require('./importo.js'); } catch (e) { /* nel browser */ } }
    return null;
  }

  function testo(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

  /* ── IL VOCABOLARIO DELL'ARCHIVIO ────────────────────────────────────────
     Le parole che le 7.154 polizze già in archivio usano. Una parola nuova per
     la stessa cosa non è un sinonimo: è un filtro che da domani non trova più
     tutto. Per questo quello che si legge sul PDF si riporta SEMPRE a una di
     queste, e se non ci si riporta si dichiara invece di inventarla. */
  var FRAZIONAMENTI = ['Annuale', 'Semestrale', 'Quadrimestrale', 'Trimestrale', 'Mensile', 'Unico'];

  /* Compagnia: in archivio sono scritte «PRIMA», «HDI», «Allianz» — e cinque
     polizze portano «HDI Assicurazioni», che è la stessa compagnia scritta in
     un altro modo e che quindi sfugge ai conti. Qui si riporta alla forma che
     l'archivio usa di più. */
  var COMPAGNIE = [
    { nome: 'HDI', spie: [/\bhdi\b/i, /hdi\s+assicurazioni/i] },
    { nome: 'PRIMA', spie: [/\bprima\s+assicurazioni\b/i, /\bprima\.it\b/i] },
    { nome: 'Allianz', spie: [/\ballianz\b/i] },
    { nome: 'AXA', spie: [/\baxa\b/i] },
    { nome: 'Groupama', spie: [/\bgroupama\b/i] },
    { nome: 'Sara', spie: [/\bsara\s+assicurazioni\b/i] },
    { nome: 'Nobis', spie: [/\bnobis\b/i] },
    { nome: 'Italiana', spie: [/\bitaliana\s+assicurazioni\b/i] },
    { nome: 'DALLBOGG', spie: [/\bdallbogg\b/i, /\bdall.?bogg\b/i] },
    { nome: 'AmTrust', spie: [/\bamtrust\b/i] },
    { nome: 'Net Insurance', spie: [/\bnet\s+insurance\b/i] },
  ];

  /* ── LE ANCORE ───────────────────────────────────────────────────────────
     Per ogni campo, le parole con cui i contratti italiani lo annunciano. Si
     prova in ordine: la prima che prende, vince, e il suo nome resta attaccato
     al valore — così chi guarda la schermata sa PERCHÉ il motore ha letto
     quel numero, e dove andarlo a controllare. */
  var ANCORE = {
    numero_polizza: [
      /\bpolizza\s*(?:n\.?|nr\.?|numero)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/\-.]{4,24})/i,
      /\bcontratto\s*(?:n\.?|nr\.?|numero)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/\-.]{4,24})/i,
      /\bn\.?\s*polizza\s*[:.]?\s*([A-Z0-9][A-Z0-9\/\-.]{4,24})/i,
    ],
    codice_fiscale: [
      /\bcodice\s*fiscale\s*[:.]?\s*([A-Z0-9]{16})\b/i,
      /\bc\.?\s?f\.?\s*[:.]?\s*([A-Z0-9]{16})\b/i,
    ],
    partita_iva: [
      /\bpartita\s*i\.?v\.?a\.?\s*[:.]?\s*(\d{11})\b/i,
      /\bp\.?\s?iva\s*[:.]?\s*(\d{11})\b/i,
    ],
    contraente: [
      /\bcontraente\s*[:.]?\s*([A-Za-zÀ-ÿ'`\-. ]{4,60})/i,
      /\bintestatario\s*[:.]?\s*([A-Za-zÀ-ÿ'`\-. ]{4,60})/i,
    ],
    data_effetto: [
      /\bdecorrenza\s*(?:dalle ore \d+)?\s*(?:del)?\s*[:.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /\beffetto\s*[:.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /\bvalida\s*dal\s*[:.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    ],
    data_scadenza: [
      /\bscadenza\s*(?:del contratto)?\s*(?:alle ore \d+)?\s*(?:del)?\s*[:.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /\bfino\s*al\s*[:.]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    ],
    premio_annuo: [
      /\bpremio\s*annuo\s*(?:lordo)?\s*[:.]?\s*(?:€\s*)?([\d.]+,\d{2})/i,
      /\bpremio\s*(?:lordo\s*)?(?:totale|complessivo)\s*[:.]?\s*(?:€\s*)?([\d.]+,\d{2})/i,
    ],
    premio_rata: [
      /\bpremio\s*(?:della\s*)?rata\s*[:.]?\s*(?:€\s*)?([\d.]+,\d{2})/i,
      /\brata\s*(?:di\s*)?premio\s*[:.]?\s*(?:€\s*)?([\d.]+,\d{2})/i,
    ],
    frazionamento: [
      /\b(?:frazionamento|rateazione|rateaz\.)\s*[:.]?\s*(annuale|semestrale|quadrimestrale|trimestrale|mensile|unico|unica)/i,
    ],
    targa: [
      /\btarga\s*[:.]?\s*([A-Z]{2}\s?\d{3}\s?[A-Z]{2})\b/i,
    ],
  };

  /* ── I LETTORI DI VALORE ─────────────────────────────────────────────────
     Ognuno torna `{ok:true, valore}` o `{ok:false, perche}`. Nessuno indovina:
     il perché finisce dritto nell'elenco di quello che non si è capito. */

  /* UNA DATA CON L'ANNO A DUE CIFRE SI RIFIUTA. «01/02/26» può essere il 2026
     o il 1926, e su una decorrenza di polizza la differenza è un contratto che
     risulta scaduto da cent'anni o non ancora nato. I contratti stampano
     l'anno intero: se non c'è, è più probabile che si sia letto male il
     documento che non che la compagnia abbia abbreviato. */
  function leggiData(s) {
    var m = String(s || '').match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!m) {
      var i = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (i) return costruisciData(+i[3], +i[2], +i[1]);
      return { ok: false, perche: 'non ha la forma di una data' };
    }
    if (m[3].length !== 4) return { ok: false, perche: 'l\'anno è scritto con due cifre: «' + s + '» può essere due secoli diversi' };
    return costruisciData(+m[1], +m[2], +m[3]);
  }
  function costruisciData(g, me, a) {
    if (me < 1 || me > 12 || g < 1 || g > 31) return { ok: false, perche: '«' + g + '/' + me + '/' + a + '» non è un giorno dell\'anno' };
    var d = new Date(Date.UTC(a, me - 1, g));
    if (d.getUTCDate() !== g || d.getUTCMonth() !== me - 1 || d.getUTCFullYear() !== a) {
      return { ok: false, perche: 'il ' + g + '/' + me + '/' + a + ' non esiste' };
    }
    if (a < 1990 || a > 2100) return { ok: false, perche: 'l\'anno ' + a + ' è fuori da quello che può essere una polizza' };
    var due = function (n) { return (n < 10 ? '0' : '') + n; };
    return { ok: true, valore: a + '-' + due(me) + '-' + due(g) };
  }

  /* L'IMPORTO PASSA DAL MOTORE DEGLI IMPORTI, che rifiuta quello che ha due
     letture invece di sceglierne una. È la stessa regola e lo stesso codice
     del link di pagamento: un punto al posto di una virgola moltiplica per
     cento, e qui finirebbe su un premio. */
  function leggiEuro(s) {
    var I = motoreImporto();
    if (!I) return { ok: false, perche: 'il motore degli importi non è caricato' };
    var r = I.leggi(s);
    return r.ok ? { ok: true, valore: r.cents / 100, cents: r.cents, scritto: r.scritto } : { ok: false, perche: r.motivo };
  }

  function leggiFrazionamento(s) {
    var v = testo(s).toLowerCase().replace(/unica$/, 'unico');
    for (var i = 0; i < FRAZIONAMENTI.length; i++) {
      if (FRAZIONAMENTI[i].toLowerCase() === v) return { ok: true, valore: FRAZIONAMENTI[i] };
    }
    return { ok: false, perche: '«' + s + '» non è una delle parole che l\'archivio usa (' + FRAZIONAMENTI.join(', ') + ')' };
  }

  function leggiCodiceFiscale(s) {
    var A = motoreAnagrafica();
    var v = testo(s).toUpperCase().replace(/\s/g, '');
    if (!A) return { ok: false, perche: 'il motore dell\'anagrafica non è caricato: senza, un codice fiscale non si può verificare' };
    /* IL CARATTERE DI CONTROLLO SI VERIFICA SEMPRE. Un refuso produce un
       codice credibile e falso, e un codice falso o aggancia la polizza al
       cliente sbagliato o ne crea uno nuovo che è un doppione. */
    if (!A.valido(v)) return { ok: false, perche: '«' + v + '» non supera il carattere di controllo: non è un codice fiscale valido' };
    return { ok: true, valore: v };
  }

  function leggiTarga(s) {
    var v = testo(s).toUpperCase().replace(/\s/g, '');
    return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(v) ? { ok: true, valore: v }
      : { ok: false, perche: '«' + s + '» non ha la forma di una targa' };
  }

  var LETTORI = {
    numero_polizza: function (s) {
      var v = testo(s).toUpperCase().replace(/[.,;]$/, '');
      return v.length >= 5 ? { ok: true, valore: v } : { ok: false, perche: '«' + s + '» è troppo corto per essere un numero di polizza' };
    },
    codice_fiscale: leggiCodiceFiscale,
    partita_iva: function (s) {
      var v = testo(s).replace(/\D/g, '');
      return v.length === 11 ? { ok: true, valore: v } : { ok: false, perche: 'una partita IVA ha undici cifre' };
    },
    contraente: function (s) {
      var v = testo(s).replace(/\s*(codice fiscale|c\.f\.|nato|nata|residente).*$/i, '').trim();
      return v.length >= 4 ? { ok: true, valore: v } : { ok: false, perche: 'il nome letto è troppo corto' };
    },
    data_effetto: leggiData,
    data_scadenza: leggiData,
    premio_annuo: leggiEuro,
    premio_rata: leggiEuro,
    frazionamento: leggiFrazionamento,
    targa: leggiTarga,
  };

  /* ── LA LETTURA ──────────────────────────────────────────────────────────
     `pagine` è quello che torna PdfTesto.testoPagine: [{ n, testo }]. */
  function leggi(pagine, opz) {
    opz = opz || {};
    var pg = pagine || [];
    if (!pg.length) return { ok: false, motivo: 'Il documento è vuoto: non c\'è niente da leggere.' };

    /* UNA SCANSIONE LO DICE, e non si confonde con «non ho trovato niente»:
       sono due diagnosi opposte, e la prima si risolve chiedendo alla
       compagnia il PDF vero invece di mettersi a copiare a mano. */
    var caratteri = 0;
    pg.forEach(function (p) { caratteri += testo(p && p.testo).length; });
    if (!caratteri) {
      return { ok: false, scansione: true, pagine: pg.length,
        motivo: 'Questo PDF ha ' + pg.length + (pg.length === 1 ? ' pagina' : ' pagine')
          + ' ma nessuna parola leggibile: è una scansione, cioè un\'immagine. Non c\'è niente da leggere, '
          + 'e indovinare i dati di una polizza non si può — serve il PDF originale della compagnia.' };
    }
    if (caratteri / pg.length < 25) {
      return { ok: false, scansione: true, pagine: pg.length, caratteri: caratteri,
        motivo: 'Questo PDF ha ' + caratteri + ' caratteri leggibili su ' + pg.length + ' pagine: quasi certamente è '
          + 'una scansione con sopra due righe di testo. Quello che c\'è non basta per leggere una polizza, '
          + 'e il resto non si indovina — serve il PDF originale della compagnia.' };
    }

    var campi = {}, nonCapito = [];
    Object.keys(ANCORE).forEach(function (campo) {
      var preso = cerca(pg, ANCORE[campo]);
      if (!preso) {
        nonCapito.push({ campo: campo, perche: 'nel documento non ho trovato nessuna delle parole con cui questo dato di solito si annuncia' });
        campi[campo] = null;
        return;
      }
      var letto = LETTORI[campo](preso.grezzo);
      if (!letto.ok) {
        nonCapito.push({ campo: campo, perche: letto.perche, grezzo: preso.grezzo, pagina: preso.pagina, ancora: preso.ancora });
        campi[campo] = null;
        return;
      }
      campi[campo] = { valore: letto.valore, grezzo: preso.grezzo, pagina: preso.pagina, ancora: preso.ancora };
      if (letto.cents != null) campi[campo].cents = letto.cents;
    });

    /* La compagnia non ha un'ancora: si riconosce dal nome che compare nel
       documento, e si riporta alla parola che l'archivio usa già. */
    campi.compagnia = compagniaDi(pg);
    if (!campi.compagnia) nonCapito.push({ campo: 'compagnia', perche: 'nel documento non ho riconosciuto nessuna delle compagnie che l\'agenzia tratta' });

    /* UN CODICE FISCALE PUÒ ESSERCI SENZA ESSERE ANNUNCIATO. Se l'ancora non
       ha preso, si cerca un gruppo di sedici caratteri che superi il carattere
       di controllo: uno che lo supera per caso è raro (una possibilità su 26),
       e comunque la persona lo conferma guardandolo. */
    if (!campi.codice_fiscale) {
      var nudo = codiceFiscaleNudo(pg);
      if (nudo) {
        campi.codice_fiscale = nudo;
        nonCapito = nonCapito.filter(function (x) { return x.campo !== 'codice_fiscale'; });
      }
    }

    /* I DUE CONTROLLI CHE SI POSSONO FARE SENZA SAPERE NIENT'ALTRO. */
    var avvisi = [];
    if (campi.data_effetto && campi.data_scadenza && campi.data_scadenza.valore <= campi.data_effetto.valore) {
      avvisi.push('La scadenza letta (' + campi.data_scadenza.valore + ') non è dopo la decorrenza ('
        + campi.data_effetto.valore + '): una delle due è stata letta male.');
    }
    if (campi.premio_annuo && campi.premio_rata && campi.premio_rata.valore > campi.premio_annuo.valore + 0.005) {
      avvisi.push('La rata letta è più alta del premio annuo: una delle due è stata letta male.');
    }

    return {
      ok: true,
      pagine: pg.length,
      caratteri: caratteri,
      campi: campi,
      nonCapito: nonCapito,
      avvisi: avvisi,
      /* Quanto di quello che serve è stato letto. Non è un voto al motore: è
         quello che la schermata usa per dire «controlla tutto» invece di
         «quasi fatto». */
      completezza: completezza(campi),
    };
  }

  var ESSENZIALI = ['numero_polizza', 'compagnia', 'data_effetto', 'premio_annuo', 'codice_fiscale'];
  function completezza(campi) {
    var presi = ESSENZIALI.filter(function (k) { return campi[k]; }).length;
    return { presi: presi, su: ESSENZIALI.length, mancanti: ESSENZIALI.filter(function (k) { return !campi[k]; }) };
  }

  function cerca(pagine, regole) {
    for (var r = 0; r < regole.length; r++) {
      for (var p = 0; p < pagine.length; p++) {
        var t = String((pagine[p] || {}).testo || '');
        var m = t.match(regole[r]);
        if (m && m[1]) {
          return { grezzo: m[1].trim(), pagina: (pagine[p] || {}).n || (p + 1), ancora: String(regole[r]).slice(1, 40) };
        }
      }
    }
    return null;
  }

  function compagniaDi(pagine) {
    var t = pagine.map(function (p) { return String((p || {}).testo || ''); }).join('\n');
    for (var i = 0; i < COMPAGNIE.length; i++) {
      for (var s = 0; s < COMPAGNIE[i].spie.length; s++) {
        var m = t.match(COMPAGNIE[i].spie[s]);
        if (m) {
          var prima = t.slice(0, m.index).split('\n').length;
          return { valore: COMPAGNIE[i].nome, grezzo: m[0], pagina: pagina(pagine, m.index), ancora: 'nome della compagnia nel documento', riga: prima };
        }
      }
    }
    return null;
  }
  function pagina(pagine, indice) {
    var conta = 0;
    for (var i = 0; i < pagine.length; i++) {
      conta += String((pagine[i] || {}).testo || '').length + 1;
      if (indice < conta) return (pagine[i] || {}).n || (i + 1);
    }
    return (pagine[0] || {}).n || 1;
  }

  function codiceFiscaleNudo(pagine) {
    var A = motoreAnagrafica();
    if (!A) return null;
    for (var p = 0; p < pagine.length; p++) {
      var t = String((pagine[p] || {}).testo || '').toUpperCase();
      var trovati = t.match(/\b[A-Z0-9]{16}\b/g) || [];
      for (var i = 0; i < trovati.length; i++) {
        if (A.valido(trovati[i])) {
          return { valore: trovati[i], grezzo: trovati[i], pagina: (pagine[p] || {}).n || (p + 1),
            ancora: 'sedici caratteri che superano il carattere di controllo' };
        }
      }
    }
    return null;
  }

  /* ══ CHE COSA FARNE: LA DECISIONE ═══════════════════════════════════════
     Pura di proposito: le interrogazioni all'archivio le fa la schermata e
     passa qui il risultato. Così la regola — quella che decide se due righe
     sono la stessa persona — si prova in Node, su una tabella di casi, invece
     che aprendo un browser e sperando.

     `archivio`:
       · clientePerCf      la scheda trovata col codice fiscale letto, o null
       · omonimi           le schede che portano lo stesso nome, senza CF uguale
       · polizzaPerNumero  la polizza che ha già quel numero, o null
  */
  function decide(lettura, archivio) {
    var a = archivio || {}, c = (lettura && lettura.campi) || {};

    /* 1. LA POLIZZA C'È GIÀ. Il numero di polizza ha un indice unico nel
          database: un secondo inserimento verrebbe rifiutato comunque, ma con
          un errore che non spiega niente. Meglio dirlo prima e portarci. */
    if (a.polizzaPerNumero) {
      return { azione: 'gia_in_archivio', polizza: a.polizzaPerNumero,
        perche: 'Questa polizza è già in archivio: il numero ' + (c.numero_polizza ? c.numero_polizza.valore : '')
          + ' esiste già. Non ne creo una seconda.' };
    }

    /* 2. CODICE FISCALE VALIDO → è una chiave vera (indice unico in
          archivio). Se c'è la scheda, è quella; se non c'è, se ne fa una
          nuova col codice attaccato. */
    if (c.codice_fiscale) {
      if (a.clientePerCf) {
        return { azione: 'cliente_trovato', cliente: a.clientePerCf,
          perche: 'Il codice fiscale sul documento è di una scheda che c\'è già.' };
      }
      return { azione: 'cliente_nuovo', conCodiceFiscale: true,
        perche: 'Il codice fiscale non è in archivio: va creata una scheda nuova.',
        omonimi: a.omonimi || [] };
    }

    /* 3. NIENTE CODICE FISCALE. Qui non si collega niente da soli. Un nome
          che combacia è un avviso, non una prova: due persone fuse in una
          scheda sola non si scoprono il giorno dopo — si scoprono quando una
          delle due telefona per una polizza intestata a un altro. */
    if ((a.omonimi || []).length) {
      return { azione: 'scelta_a_mano', omonimi: a.omonimi,
        perche: 'Sul documento non ho letto un codice fiscale valido, e in archivio ci sono '
          + a.omonimi.length + ' schede con un nome che somiglia. Il nome non basta per dire che è la stessa '
          + 'persona: scegli tu, o fai una scheda nuova.' };
    }
    return { azione: 'cliente_nuovo', conCodiceFiscale: false,
      perche: 'Sul documento non ho letto un codice fiscale valido. Posso fare una scheda nuova, '
        + 'ma senza codice fiscale è una scheda che domani rischia di diventare un doppione.' };
  }

  /* ══ I RECORD DA SCRIVERE ═══════════════════════════════════════════════
     Nella forma che l'archivio usa già — le stesse parole del lettore dei
     flussi di compagnia (`fisica`/`giuridica`, non `privato`/`azienda`).
     Niente si scrive da qui: si prepara, e a scrivere è la schermata DOPO che
     una persona ha confermato. */
  function perSalvare(lettura, scelte) {
    scelte = scelte || {};
    var c = (lettura && lettura.campi) || {};
    var v = function (k) { return c[k] ? c[k].valore : null; };

    var anagrafica = scelte.clienteId ? null : {
      tipo: c.partita_iva && !c.codice_fiscale ? 'giuridica' : 'fisica',
      nominativo: v('contraente') || null,
      codice_fiscale: v('codice_fiscale'),
      partita_iva: v('partita_iva'),
      fonte: 'polizza_pdf',
    };

    var polizza = {
      numero_polizza: v('numero_polizza'),
      compagnia: v('compagnia'),
      cliente_id: scelte.clienteId || null,
      cliente: v('contraente') || null,
      data_effetto: v('data_effetto'),
      data_scadenza: v('data_scadenza'),
      frazionamento: v('frazionamento'),
      premio_annuo: v('premio_annuo'),
      premio_rata: v('premio_rata'),
      fonte: 'polizza_pdf',
      /* LA PROVA DI DOVE VIENE OGNI NUMERO resta attaccata alla polizza: fra
         un anno, davanti a una cifra che non torna, si può risalire alla
         pagina del PDF da cui era stata letta invece di ricominciare. */
      dati: {
        letto_da_pdf: {
          versione_motore: VERSIONE,
          targa: v('targa'),
          provenienza: provenienza(c),
          non_capito: (lettura && lettura.nonCapito) || [],
        },
      },
    };

    return { anagrafica: anagrafica, polizza: polizza };
  }

  function provenienza(campi) {
    var out = {};
    Object.keys(campi).forEach(function (k) {
      if (campi[k]) out[k] = { pagina: campi[k].pagina, grezzo: campi[k].grezzo };
    });
    return out;
  }

  /* Quello che manca perché una polizza si possa salvare. `data_effetto` è
     l'unica colonna che il database pretende; le altre due sono quello senza
     cui la riga non serve a niente. */
  function problemi(lettura, scelte) {
    scelte = scelte || {};
    var c = (lettura && lettura.campi) || {}, out = [];
    if (!c.data_effetto) out.push('Manca la decorrenza: senza, la polizza non si può salvare.');
    if (!c.numero_polizza) out.push('Manca il numero di polizza: senza, non si riconosce il doppione la prossima volta.');
    if (!c.compagnia) out.push('Manca la compagnia.');
    if (!scelte.clienteId && !(c.contraente && c.contraente.valore)) out.push('Manca il nome del contraente.');
    return out;
  }

  var API = {
    VERSIONE: VERSIONE,
    FRAZIONAMENTI: FRAZIONAMENTI,
    COMPAGNIE: COMPAGNIE,
    ANCORE: ANCORE,
    ESSENZIALI: ESSENZIALI,
    leggi: leggi,
    decide: decide,
    perSalvare: perSalvare,
    problemi: problemi,
    /* esposti per le prove: sono le regole che decidono i valori */
    leggiData: leggiData,
    leggiEuro: leggiEuro,
    leggiFrazionamento: leggiFrazionamento,
    leggiCodiceFiscale: leggiCodiceFiscale,
    leggiTarga: leggiTarga,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PolizzaDaPdf = API;
})();
