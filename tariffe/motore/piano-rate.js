/* ═══════════════════════════════════════════════════════════════════════════
   IL PIANO DELLE RATE DI UNA POLIZZA  (21/09/2026)

   Richiesta di Francesco:
     «se metto semestrale deve creare in automatico un titolo da incassare con
      la data tra sei mesi, la stessa cosa per gli altri frazionamenti. La
      regola però è: se una polizza è fatta oggi ed ha frazionamento
      semestrale, la scadenza di contratto sarà esattamente tra un anno ma tra
      6 mesi ci sarà una rata intermedia da incassare.»

   Le regole stavano dentro `index.html` (`titPiano`), cioè in una schermata:
   non si potevano provare senza aprire un browser (CLAUDE.md §5). Qui si
   provano in Node, e con esse i quattro difetti che avevano — tutti misurati,
   nessuno dedotto.

   ── 1. «ESATTAMENTE TRA UN ANNO» NON LO ERA ──────────────────────────────
   La scadenza la proponeva `pnuPiuUnAnno`, che faceva
   `new Date(iso + 'T00:00:00')` (mezzanotte LOCALE), aggiungeva un anno e poi
   rileggeva con `toISOString()` (che è UTC). In Italia, che è avanti rispetto
   a UTC, il risultato torna indietro di un giorno:
       Europe/Rome:  2026-09-21 → 2027-09-20   (un giorno PRIMA)
       Europe/Rome:  2026-01-31 → 2027-01-30   (anche d'inverno)
   Nessun errore e nessuna schermata rotta: una data credibile e falsa, che
   finisce nello scadenzario e fa telefonare il giorno sbagliato. Qui le date
   si fanno **contando i mesi sulla stringa**, senza mai passare da `Date` per
   l'aritmetica: una data ISO non ha un fuso, e darglielo è il modo di
   perderci un giorno.

   ── 2. CHI CONOSCEVA SOLO LA RATA NON OTTENEVA NIENTE ────────────────────
   `titPiano` leggeva solo `premio_annuo`. Chi compilava «premio di rata» —
   che è il numero che la compagnia dice — si ritrovava la polizza scritta e
   **nessuna rata**, con un avviso 400 ms dopo. Senza rate non esistono gli
   insoluti, e i soldi non si recuperano.

   Dedurre l'annuo dalla rata qui NON è la stima vietata da §14/§36. Là è la
   compagnia che manda un `LORDO_TOTALE` senza dire che periodo copre, e
   moltiplicarlo sarebbe indovinare. Qui è una persona che ha appena
   dichiarato, nello stesso modulo, «semestrale» e «110»: l'annuo è la somma
   di quello che ha scritto, non una supposizione su quello che intendeva.
   Resta comunque marcato (`annuo_da: 'rate'`), e la schermata lo scrive nel
   campo — visibile e correggibile, mai dietro le quinte (§8.1).

   ── 3. IL PIANO NON GUARDAVA LA SCADENZA DEL CONTRATTO ───────────────────
   Faceva sempre `rateAnno` rate a passi di `12/n` mesi, anche su un contratto
   che dura sei mesi o che scade a una data allineata diversamente: emetteva
   rate **oltre la fine del contratto**. Il piano appartiene al contratto, non
   a un anno solare fisso.

   ── 4. «NON DICHIARATO» DIVENTAVA «ANNUALE», IN SILENZIO ─────────────────
   `titRateAnno` tornava 1 per qualunque frazionamento sconosciuto. Una rata
   sola per l'intero premio è la lettura meno sbagliata, ma resta una
   supposizione: adesso si fa e **si dichiara** (§8.1).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'piano-rate-2026-09-21';

  /* Quante rate in un anno, per frazionamento. I nomi sono quelli già in uso
     nei preventivi e nel portafoglio: niente vocabolario nuovo da imparare. */
  var RATE_ANNO = { annuale: 1, semestrale: 2, quadrimestrale: 3, trimestrale: 4, mensile: 12 };

  function testo(v) { return v == null ? '' : String(v).trim(); }
  function chiave(v) { return testo(v).toLowerCase(); }
  function numero(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function iso(v) {
    var s = testo(v).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  /* `null` e non 1: un frazionamento che non conosciamo non è «annuale», è
     una cosa che non sappiamo. Chi chiama decide che farne, e lo dichiara. */
  function rateAnno(frazionamento) {
    var n = RATE_ANNO[chiave(frazionamento)];
    return n || null;
  }
  function mesiPasso(frazionamento) {
    var n = rateAnno(frazionamento);
    return n ? 12 / n : null;
  }

  /* L'aritmetica delle date si fa sui NUMERI della stringa, mai con `Date`:
     una data ISO non ha un fuso orario, e farla passare da `new Date(...)` +
     `toISOString()` gliene dà uno e le fa perdere un giorno (difetto 1).
     Il giorno si accorcia all'ultimo del mese quando quel mese non ce l'ha:
     31 agosto + 6 mesi = 28 febbraio, e 29 febbraio + 12 mesi = 28 febbraio. */
  function sommaMesi(data, mesi) {
    var s = iso(data);
    if (s == null) return null;
    var p = s.split('-');
    var a = Number(p[0]), m = Number(p[1]), g = Number(p[2]);
    var tot = (m - 1) + Number(mesi || 0);
    var anno = a + Math.floor(tot / 12);
    var mese = ((tot % 12) + 12) % 12;
    var ultimo = new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
    var giorno = Math.min(g, ultimo);
    return anno + '-' + String(mese + 1).padStart(2, '0') + '-' + String(giorno).padStart(2, '0');
  }

  /* «Esattamente tra un anno», che è la regola scritta da Francesco. */
  function piuUnAnno(data) { return sommaMesi(data, 12); }

  function giorniFra(dal, al) {
    var a = iso(dal), b = iso(al);
    if (a == null || b == null) return null;
    return Math.round((Date.UTC.apply(null, a.split('-').map(Number).map(function (x, i) { return i === 1 ? x - 1 : x; }))
      - Date.UTC.apply(null, b.split('-').map(Number).map(function (x, i) { return i === 1 ? x - 1 : x; }))) / 86400000) * -1;
  }

  /* Quanti mesi INTERI stanno fra due date, e i giorni che avanzano. Serve a
     sapere quante rate ci stanno dentro il contratto. */
  function durata(dal, al) {
    var a = iso(dal), b = iso(al);
    if (a == null || b == null) return { mesi: null, resto_giorni: 0 };
    if (b <= a) return { mesi: 0, resto_giorni: 0 };
    var mesi = 0;
    while (sommaMesi(a, mesi + 1) <= b) mesi++;
    return { mesi: mesi, resto_giorni: giorniFra(sommaMesi(a, mesi), b) || 0 };
  }

  function cent(n) {
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }

  /* ═══ IL PIANO ════════════════════════════════════════════════════════════

     Prende la riga di polizza com'è — gli stessi nomi di colonna di
     `quote_polizze` — perché i due punti di chiamata (la creazione a mano e la
     generazione dal portafoglio) passano proprio quella riga: due firme
     diverse vorrebbero dire due mappature, e quella che sbaglia è quella che
     nessuno guarda (è la scelta già fatta per `quote_pratiche`, §13).

     Torna SEMPRE un oggetto, mai un elenco nudo: oggi tre cause diverse
     («manca la decorrenza», «manca il premio», «frazionamento sconosciuto»)
     finivano in una frase sola, mostrata in un avviso a polizza già scritta.
     «Non si è potuto» deve dire che cosa (§12, §18). */
  function piano(polizza) {
    var p = polizza || {};
    var out = {
      rate: [], base: null, annuo: null, annuo_da: null,
      rate_previste: null, durata_mesi: null, resto_giorni: 0,
      avvisi: [], motivo: null
    };
    var avvisa = function (codice, testoAvviso) { out.avvisi.push({ codice: codice, testo: testoAvviso }); };

    var effetto = iso(p.data_effetto);
    if (!effetto) { out.motivo = 'Manca la decorrenza: senza quella non si sa da quando contare le rate.'; return out; }

    var scadenza = iso(p.data_scadenza);
    if (scadenza && scadenza <= effetto) {
      out.motivo = 'La scadenza del contratto non viene dopo la decorrenza.';
      return out;
    }

    /* Quante rate in un anno. Se il frazionamento non è dichiarato si fa una
       rata sola — la lettura meno sbagliata — e SI DICE. */
    var perAnno = rateAnno(p.frazionamento);
    if (!perAnno) {
      perAnno = 1;
      avvisa('frazionamento_non_dichiarato',
        'Il frazionamento non è dichiarato: si fa una rata sola per l’intero premio. Se le rate sono più di una, scrivilo e il piano si rifà.');
    }
    var passo = 12 / perAnno;

    /* Il premio: l'annuo se c'è, altrimenti la rata dichiarata. */
    var annuo = numero(p.premio_annuo);
    var rata = numero(p.premio_rata);
    if (annuo != null && annuo > 0) {
      out.base = 'annuo'; out.annuo = cent(annuo); out.annuo_da = 'dichiarato';
    } else if (rata != null && rata > 0) {
      out.base = 'rata'; out.annuo = cent(rata * perAnno); out.annuo_da = 'rate';
      avvisa('annuo_dalle_rate',
        'Il premio annuo non è dichiarato: si prende la somma delle ' + perAnno +
        (perAnno === 1 ? ' rata' : ' rate') + ' che hai scritto, cioè ' + out.annuo.toFixed(2).replace('.', ',') + ' €.');
    } else {
      out.motivo = 'Manca il premio: scrivi il premio annuo oppure quello di rata, e le rate nascono da lì.';
      return out;
    }

    /* Quante rate ci stanno DENTRO il contratto. Il premio annuo è il denaro
       di un anno: oltre l'annualità non si emettono rate, perché sarebbero
       pagate con soldi che nessuno ha dichiarato. */
    var d = durata(effetto, scadenza);
    out.durata_mesi = d.mesi;
    var quante = perAnno;
    if (scadenza) {
      quante = Math.floor(d.mesi / passo);
      if (quante < 1) {
        quante = 1;
        avvisa('contratto_piu_corto_del_passo',
          'Il contratto dura meno di una rata intera: si fa una rata sola alla decorrenza.');
      }
      if (quante > perAnno) {
        avvisa('contratto_oltre_l_anno',
          'Il contratto dura più di un anno: si emettono le ' + perAnno + ' rate della prima annualità. ' +
          'Le successive nascono al rinnovo, con il premio di allora.');
        quante = perAnno;
      }
    }
    out.rate_previste = quante;

    /* Gli importi. Con base «annuo» si divide e l'ULTIMA rata assorbe il
       centesimo che avanza, così la somma fa sempre il premio esatto — ma
       solo se si emette l'annualità intera: se il contratto ne contiene meno,
       non c'è niente da far quadrare e si dice. Con base «rata» non si divide
       niente: ogni rata è quella dichiarata, e l'annuo è la loro somma. */
    var importi = [];
    if (out.base === 'rata') {
      for (var i = 0; i < quante; i++) importi.push(cent(rata));
    } else {
      var totale = Math.round(out.annuo * 100);
      var base = Math.floor(totale / perAnno);
      for (var j = 0; j < quante; j++) {
        var c = (j === perAnno - 1) ? totale - base * (perAnno - 1) : base;
        importi.push(c / 100);
      }
      if (quante < perAnno) {
        avvisa('annualita_incompleta',
          'Il contratto contiene ' + quante + ' rate su ' + perAnno + ': la somma delle rate non fa il premio annuo, ed è giusto così.');
      }
    }

    for (var k = 0; k < quante; k++) {
      var dec = sommaMesi(effetto, k * passo);
      out.rate.push({
        tipo: k === 0 ? 'prima_rata' : 'rata',
        data_decorrenza: dec,
        /* La rata si paga quando comincia il periodo che copre: è la
           consuetudine assicurativa, ed è quello che il portafoglio già
           assume per dire che una rata è insoluta. */
        data_scadenza: dec,
        importo_lordo: importi[k]
      });
    }

    /* Il troncone che nessuna rata copre. Non si allunga l'ultima rata e non
       se ne inventa una: si dice, e lo quantifica chi lo sa. */
    if (scadenza) {
      var coperto = sommaMesi(effetto, quante * passo);
      if (coperto < scadenza) {
        out.resto_giorni = giorniFra(coperto, scadenza) || 0;
        if (out.resto_giorni > 0) {
          avvisa('periodo_scoperto',
            'Dal ' + coperto + ' al ' + scadenza + ' (' + out.resto_giorni +
            ' giorni) non c’è nessuna rata: quel pezzo non lo quantifica il frazionamento dichiarato.');
        }
      }
    }
    return out;
  }

  var API = {
    VERSIONE: VERSIONE, RATE_ANNO: RATE_ANNO,
    rateAnno: rateAnno, mesiPasso: mesiPasso,
    sommaMesi: sommaMesi, piuUnAnno: piuUnAnno, durata: durata, giorniFra: giorniFra,
    piano: piano, cent: cent, numero: numero
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PianoRate = API;
})();
