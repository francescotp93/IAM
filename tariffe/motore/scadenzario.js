/* ═══════════════════════════════════════════════════════════════════════════
   LO SCADENZARIO: LA PROROGA DI 15 GIORNI, E SE IL RINNOVO C'È GIÀ
   (22/09/2026)

   Richiesta di Francesco, con il suo esempio:

     «polizza incassata il 15.04.2026 semestrale, avrà quindi una data
      scadenza della rata semestrale (QF - Quietanza di frazionamento) il
      15.09.2026 non ancora incassata: è dentro i 15 giorni e quindi ad oggi
      è dentro i 15 giorni ed ancora in copertura»

   Tre cose in quella frase, e ognuna, sbagliata, produce un elenco di lavoro
   che manda a telefonare nel giorno sbagliato.

   ── 1. LA DATA CHE FA TESTO NON È QUELLA DELL'INCASSO ─────────────────────
   Una polizza incassata il 15.04 con rata semestrale ha una rata che scade
   il 15.09: è QUELLA la data. L'incasso dice quando sono entrati dei soldi,
   e i soldi entrati non scadono.

   E non è nemmeno la `data_scadenza` scritta sulla rata. Misurato sul
   portafoglio vero: su una quietanza semestrale `data_decorrenza` è
   2026-09-02 e `data_scadenza` è 2027-03-02 — la fine del periodo che quella
   rata copre. Leggere la seconda vorrebbe dire credere che una rata scaduta
   venti giorni fa scada fra sei mesi. **Per una rata la scadenza è la
   DECORRENZA**: è il giorno da cui corre il nuovo periodo, ed è il giorno
   entro cui va pagata.

   ── 2. LA PROROGA DI 15 GIORNI ────────────────────────────────────────────
   Dichiarata da Francesco per tutte le polizze, ed è il termine di mora
   dell'art. 1901 c.c. per le rate successive alla prima. Una polizza scaduta
   ieri NON è scoperta: è in proroga, e il cliente si può ancora salvare. È
   la differenza fra una telefonata che serve e una che arriva tardi.

   Da qui le QUATTRO fasce, e non si sovrappongono (§22: le fasce cumulative
   sono sparite di proposito, perché la stessa polizza finiva in tre
   contatori e un numero che si somma con se stesso non si legge):

     più avanti  · mancano più di 15 giorni      · non è ancora lavoro
     vicina      · mancano da 15 giorni a 0      · si chiama adesso
     in proroga  · scaduta da 1 a 15 giorni      · SCADUTA E ANCORA COPERTA
     scoperta    · scaduta da più di 15 giorni   · la proroga è finita

   Il giorno 0 (scade oggi) sta fra le «vicine»: oggi la copertura c'è
   ancora. Il giorno −15 è l'ultimo coperto, il −16 è il primo scoperto.

   ── 3. «NON RINNOVATA» NON SI LEGGE DA `sostituisce_id` ───────────────────
   Misurato prima di scrivere una riga: 4.003 polizze, 1.665 scadute, e
   `sostituisce_id` valorizzato su **zero**. La colonna «Rinnovo» della
   schermata legge quello, quindi dichiarava non rinnovate tutte e 1.665.

   Non è un difetto di chi ha importato: PRIMA non ha tacito rinnovo, alla
   scadenza la polizza storna e ne NASCE UNA NUOVA (§14, regola 4), e nel
   tracciato non c'è niente che dica quale sostituisce quale.

   Il successore però si vede: 961 di quelle scadute hanno una polizza nuova
   sulla STESSA TARGA nata a cavallo della scadenza, 1.017 ne hanno una dello
   stesso cliente e ramo. Restano **647** senza nessun successore, e quelli
   sono i clienti da richiamare.

   Quindi il rinnovo ha TRE stati, non due, ed è la stessa regola dei codici
   produttore (§19) e del catalogo prodotti (§39):

     dichiarato · `sostituisce_id`: qualcuno l'ha scritto, vince sempre
     indizio    · c'è una polizza che SEMBRA il rinnovo, e si dice quale
     nessuno    · non se n'è trovata nessuna

   **Un indizio non è una dichiarazione.** Chiamarlo rinnovo vorrebbe dire
   nascondere un cliente da richiamare, che è l'errore più caro dei due: una
   telefonata a chi ha già rinnovato costa due minuti, un cliente perso costa
   un anno di premio. Per questo la targa viene prima del cliente — è lo
   stesso veicolo, non una somiglianza — e il NOME non si guarda mai.

   ── COME SI CONTANO I GIORNI ──────────────────────────────────────────────
   Sulle cifre della stringa, e con `oggi` passato da chi chiama (§44, §45).
   Una data ISO non ha un fuso orario: farla passare da un oggetto Data e
   riconvertirla in stringa via UTC gliene dà uno, e in Italia toglie un
   giorno. E una funzione che chiede l'ora al computer di chi guarda dà
   risposte diverse a due persone sullo stesso dato. C'è una prova che fa girare
   questo motore in cinque fusi orari e pretende la stessa risposta.

   Motore PURO: nessun database, nessun DOM. Lo caricano QUOTO e IAM —
   carica, non copia (§10).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* La proroga: 15 giorni, dichiarata da Francesco per tutte le polizze.
     Sta in un posto solo e si può stringere da chi chiama (`opz.giorni`) il
     giorno in cui una compagnia ne dichiarerà una diversa. Non si allarga da
     sé e non si indovina. */
  var PROROGA = 15;

  /* La finestra in cui una polizza nuova può essere il rinnovo di una
     vecchia: da 5 giorni PRIMA della scadenza (un rinnovo si emette anche in
     anticipo) a 30 giorni DOPO (i 15 di proroga più il ritardo di chi paga
     tardi). Sono i valori con cui la misura sul portafoglio vero è stata
     fatta; si cambiano da chi chiama, non a memoria. */
  var FINESTRA_PRIMA = 5;
  var FINESTRA_DOPO = 30;

  /* LA PRIMA RATA NON HA PROROGA, e l'art. 1901 c.c. dice l'esatto
     contrario di quello che vale per le altre: sul PRIMO premio la copertura
     non parte finche' non e' pagato (comma 1), mentre i 15 giorni di mora
     valgono sui premi SUCCESSIVI (comma 2).

     Trattarle uguale e' il piu' caro degli errori possibili in questo
     elenco: dice a chi telefona che un cliente e' coperto mentre la
     copertura non e' mai partita. Misurato il 22/09/2026: 6 prime rate
     aperte, tutte gia' oltre la decorrenza. */
  var PROROGA_PRIMA_RATA = 0;

  var GIORNO = 24 * 60 * 60 * 1000;

  function testo(v) {
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }

  function iso(d) {
    if (!d) return null;
    var s = String(d).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  /* Le date si contano sulle cifre della stringa, ancorate a UTC. Costruire
     una data a mezzanotte LOCALE e poi rileggerla in UTC toglie un giorno in
     Italia — sempre, anche d'inverno (§44). Quella riconversione non si usa
     in questo motore, e c'è una prova che la vieta. */
  function giorniFra(a, b) {
    var x = iso(a), y = iso(b);
    if (!x || !y) return null;
    var px = x.split('-'), py = y.split('-');
    var tx = Date.UTC(+px[0], +px[1] - 1, +px[2]);
    var ty = Date.UTC(+py[0], +py[1] - 1, +py[2]);
    return Math.round((ty - tx) / GIORNO);
  }

  function piuGiorni(d, n) {
    var x = iso(d);
    if (!x || !isFinite(n)) return null;
    var p = x.split('-');
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * GIORNO;
    var g = new Date(t);
    return g.getUTCFullYear() + '-'
      + String(g.getUTCMonth() + 1).padStart(2, '0') + '-'
      + String(g.getUTCDate()).padStart(2, '0');
  }

  /* L'unico punto in cui si chiede il giorno al computer, e si legge dalle
     parti LOCALI: la conversione via UTC, fra mezzanotte e le due,
     darebbe ieri. */
  function oggiLocale() {
    var d = new Date();
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  function numero(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /* La targa si confronta senza spazi, punti e maiuscole: la stessa targa è
     scritta «AB 123 CD» e «ab123cd», e due stringhe diverse per lo stesso
     veicolo non agganciano niente (§19, sul RUI). */
  function targaNorm(v) {
    var s = testo(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length >= 5 ? s : '';
  }

  /* ── LE QUATTRO FASCE ────────────────────────────────────────────────────
     `g` è quanti giorni mancano alla scadenza: positivo se deve ancora
     arrivare, negativo se è passata. Le prove le percorrono tutte e
     pretendono che una data cada in UNA sola. */
  var FASCE = [
    {
      k: 'scoperte', l: 'Fuori i 15 giorni', sub: 'la proroga è finita',
      cls: 'urg', coperta: false,
      test: function (g, p) { return g !== null && g < -p; }
    },
    {
      k: 'proroga', l: 'Nei 15 giorni', sub: 'scadute, ancora in copertura',
      cls: 'avv', coperta: true,
      test: function (g, p) { return g !== null && g < 0 && g >= -p; }
    },
    {
      k: 'vicine', l: 'Vicine ai 15 giorni', sub: 'scadono entro 15 giorni',
      cls: 'ok', coperta: true,
      test: function (g, p, a) { return g !== null && g >= 0 && g <= a; }
    },
    {
      k: 'avanti', l: 'Più avanti', sub: 'oltre i 15 giorni',
      cls: '', coperta: true,
      test: function (g, p, a) { return g !== null && g > a; }
    },
    {
      k: 'tutte', l: 'Tutte', sub: 'ogni scadenza', cls: '', coperta: null,
      test: function () { return true; }
    }
  ];

  /* DUE NUMERI, NON UNO. La PROROGA è una proprietà del contratto: quanti
     giorni la copertura resta in piedi DOPO la scadenza. L'ANTICIPO è un
     orizzonte di lavoro: quanti giorni PRIMA si comincia a telefonare. Sono
     la stessa cifra per caso, non per natura — e su una prima rata, che
     proroga non ne ha (art. 1901 c.c.), tenerli insieme spingeva fra le
     «più avanti» una rata che scade fra otto giorni e che va chiamata. */
  function fasciaDi(giorni, giorniProroga, giorniAnticipo) {
    var p = isFinite(giorniProroga) && giorniProroga >= 0 ? giorniProroga : PROROGA;
    var a = isFinite(giorniAnticipo) && giorniAnticipo >= 0 ? giorniAnticipo : PROROGA;
    for (var i = 0; i < FASCE.length; i++) {
      if (FASCE[i].k === 'tutte') continue;
      if (FASCE[i].test(giorni, p, a)) return FASCE[i];
    }
    return null;
  }

  /* ── LO STATO DI UNA SCADENZA ────────────────────────────────────────────
     Una funzione sola per le due cose che scadono: la polizza e la rata.
     Sono la stessa domanda — «quanto manca, e c'è ancora copertura?» — e
     scriverla due volte vorrebbe dire due risposte diverse sullo stesso
     giorno. */
  function stato(scadenza, oggi, opz) {
    opz = opz || {};
    var p = isFinite(opz.giorni) && opz.giorni >= 0 ? Number(opz.giorni) : PROROGA;
    var a = isFinite(opz.anticipo) && opz.anticipo >= 0 ? Number(opz.anticipo) : PROROGA;
    var g = iso(oggi) || oggiLocale();
    var s = iso(scadenza);

    if (!s) {
      return {
        scadenza: null, giorni: null, fascia: null, coperta: null,
        proroga: p, fineProroga: null,
        motivo: 'Senza una data di scadenza non si può dire niente: non entra in nessuna fascia.',
        etichetta: 'scadenza da confermare'
      };
    }

    var giorni = giorniFra(g, s);          // > 0 = deve ancora arrivare
    var f = fasciaDi(giorni, p, a);
    var fine = piuGiorni(s, p);

    var etichetta;
    if (giorni > 0) etichetta = 'fra ' + giorni + ' gg';
    else if (giorni === 0) etichetta = 'scade oggi';
    else if (giorni >= -p) etichetta = 'scaduta da ' + (-giorni) + ' gg · ancora in copertura';
    else etichetta = 'scaduta da ' + (-giorni) + ' gg';

    return {
      scadenza: s,
      giorni: giorni,
      fascia: f ? f.k : null,
      coperta: f ? f.coperta : null,
      proroga: p,
      fineProroga: fine,
      /* Quanti giorni restano di proroga: serve a chi telefona, ed è il
         numero che dice se vale ancora la pena. Solo quando la proroga è in
         corso — altrove sarebbe un numero senza significato. */
      giorniDiProrogaRimasti: (giorni < 0 && giorni >= -p) ? (p + giorni) : null,
      /* L'ULTIMO GIORNO. A `giorni = -p` i giorni pieni che restano sono zero,
         e «ancora 0 gg di proroga» si legge come «e' finita» — mentre e' la
         telefonata piu' urgente di tutto l'elenco: oggi il cliente si salva
         ancora, domani no. E' lo stesso caso di «scade oggi», che il motore
         tratta gia' a parte sull'altro confine. */
      ultimoGiornoDiProroga: (giorni === -p),
      etichetta: etichetta,
      motivo: null
    };
  }

  /* ── LA RIGA DI UNA POLIZZA ──────────────────────────────────────────────
     La scadenza che fa testo è quella del contratto, SALVO che la polizza sia
     stata sospesa: i giorni fermi si recuperano in fondo e la scadenza vera è
     più in là (§41). La contrattuale non si riscrive, si tiene accanto. */
  function daPolizza(p, oggi, opz) {
    opz = opz || {};
    var sosp = opz.sospensione || null;   // il motore sospensione.js, se c'è
    var contrattuale = iso(p && p.data_scadenza);
    var vera = contrattuale;
    var spostata = 0;

    if (sosp && typeof sosp.stato === 'function' && p && p.sospensioni) {
      try {
        var st = sosp.stato(p, iso(oggi) || oggiLocale());
        if (st && st.scadenzaEffettiva) { vera = st.scadenzaEffettiva; spostata = st.spostataDi || 0; }
      } catch (e) { /* una sospensione illeggibile non deve spegnere la riga */ }
    }

    var s = stato(vera, oggi, opz);
    return {
      tipo: 'polizza',
      chiave: 'polizza:' + (p && p.id),
      id: p && p.id,
      polizza_id: p && p.id,
      cliente: p && p.cliente,
      cliente_id: p && p.cliente_id,
      numero_polizza: p && p.numero_polizza,
      modulo: p && p.modulo,
      prodotto: p && p.prodotto,
      compagnia: p && p.compagnia,
      targa: p && p.targa,
      importo: numero(p && p.premio_annuo),
      che_cosa: 'Scadenza polizza',
      scadenza: s.scadenza,
      scadenzaContrattuale: contrattuale,
      spostataDi: spostata,
      giorni: s.giorni,
      fascia: s.fascia,
      coperta: s.coperta,
      giorniDiProrogaRimasti: s.giorniDiProrogaRimasti,
      ultimoGiornoDiProroga: !!s.ultimoGiornoDiProroga,
      fineProroga: s.fineProroga,
      etichetta: s.etichetta,
      motivo: s.motivo,
      tacito_rinnovo: !!(p && p.tacito_rinnovo),
      creato_nome: p && p.creato_nome,
      preventivo_id: p && p.preventivo_id,
      _p: p
    };
  }

  /* ── LA RIGA DI UNA RATA ─────────────────────────────────────────────────
     Solo le rate APERTE: una rata incassata non è una scadenza, è un fatto
     avvenuto. E la data è la DECORRENZA: mai il giorno in cui sono entrati
     i soldi, e mai la `data_scadenza` della rata, che è la fine del periodo
     coperto. */
  function daRata(t, polizza, oggi, opz) {
    var p = polizza || {};
    var quale = testo(t && t.tipo).toLowerCase();
    var prima = quale === 'prima_rata';
    var o = prima
      ? { giorni: PROROGA_PRIMA_RATA, anticipo: (opz || {}).anticipo,
          sospensione: (opz || {}).sospensione }
      : opz;
    var s = stato(t && t.data_decorrenza, oggi, o);
    var nome = quale === 'quietanza' ? 'Quietanza di frazionamento'
      : quale === 'prima_rata' ? 'Prima rata'
        : quale === 'appendice' ? 'Appendice' : 'Rata';
    return {
      tipo: 'rata',
      chiave: 'rata:' + (t && t.id),
      id: t && t.id,
      polizza_id: t && t.polizza_id,
      cliente: p.cliente,
      cliente_id: p.cliente_id,
      numero_polizza: p.numero_polizza,
      modulo: p.modulo,
      prodotto: p.prodotto,
      compagnia: p.compagnia,
      targa: p.targa,
      importo: numero(t && t.importo_lordo),
      che_cosa: nome,
      scadenza: s.scadenza,
      scadenzaContrattuale: s.scadenza,
      spostataDi: 0,
      giorni: s.giorni,
      fascia: s.fascia,
      coperta: s.coperta,
      giorniDiProrogaRimasti: s.giorniDiProrogaRimasti,
      ultimoGiornoDiProroga: !!s.ultimoGiornoDiProroga,
      fineProroga: s.fineProroga,
      etichetta: s.etichetta,
      motivo: s.motivo,
      /* Quello che la riga deve dire a chi telefona, quando non vale la
         regola generale. Senza, «scaduta da 7 gg» su una prima rata si legge
         come su una quietanza, e le due cose sono opposte. */
      notaCopertura: prima
        ? 'Prima rata: finché non è pagata la copertura non è mai partita (art. 1901 c.c.). Nessuna proroga.'
        : null,
      tacito_rinnovo: false,
      creato_nome: p.creato_nome,
      preventivo_id: null,
      _t: t,
      _p: p
    };
  }

  /* ── IL RINNOVO: TRE STATI ───────────────────────────────────────────────
     `indice` lo costruisce `indiceSuccessori` una volta sola: cercare dentro
     4.000 polizze per ognuna delle 4.000 sarebbe sedici milioni di confronti.

     Ordine: dichiarato → targa → cliente e ramo. La targa prima del cliente
     perché è lo stesso VEICOLO; il nome non si guarda mai. */
  function indiceSuccessori(polizze) {
    var perTarga = {}, perClienteRamo = {};
    (polizze || []).forEach(function (p) {
      if (!p) return;
      var eff = iso(p.data_effetto);
      if (!eff) return;
      var t = targaNorm(p.targa);
      if (t) (perTarga[t] = perTarga[t] || []).push(p);
      var c = testo(p.cliente_id);
      if (c) {
        var k = c + '|' + testo(p.modulo);
        (perClienteRamo[k] = perClienteRamo[k] || []).push(p);
      }
    });
    return { perTarga: perTarga, perClienteRamo: perClienteRamo };
  }

  function dentroFinestra(cand, scadenza, opz) {
    opz = opz || {};
    var prima = isFinite(opz.finestraPrima) ? Number(opz.finestraPrima) : FINESTRA_PRIMA;
    var dopo = isFinite(opz.finestraDopo) ? Number(opz.finestraDopo) : FINESTRA_DOPO;
    var d = giorniFra(scadenza, cand.data_effetto);
    return d !== null && d >= -prima && d <= dopo;
  }

  function rinnovo(p, indice, opz) {
    if (!p) return { stato: 'nessuno', come: null, polizza: null, testo: 'Nessun rinnovo trovato' };

    /* Dichiarato: qualcuno l'ha scritto. Vince su qualunque indizio, e non
       si rimette in discussione. */
    if (Number(p.sostituzioni) > 0) {
      return {
        stato: 'dichiarato', come: 'sostituisce_id', polizza: null,
        testo: 'Rinnovata', spiega: 'Una polizza dichiara di sostituire questa.'
      };
    }

    /* La scadenza che conta e' quella VERA: una polizza sospesa scade piu' in
       la' (§41), e il suo rinnovo parte da li'. Cercandolo sulla contrattuale
       si guarda nel posto sbagliato e la polizza risulta «non rinnovata» —
       proprio il caso per cui la colonna delle sospensioni e' stata aggiunta
       alla vista. Chi chiama passa la data vera in `opz.scadenza`. */
    var scad = iso((opz || {}).scadenza) || iso(p.data_scadenza);
    if (!scad) {
      return {
        stato: 'non_si_sa', come: null, polizza: null,
        testo: 'Non si sa',
        spiega: 'Senza la data di scadenza non si può cercare il successore.'
      };
    }

    var i = indice || { perTarga: {}, perClienteRamo: {} };

    var t = targaNorm(p.targa);
    if (t && i.perTarga[t]) {
      for (var a = 0; a < i.perTarga[t].length; a++) {
        var c1 = i.perTarga[t][a];
        if (c1.id === p.id) continue;
        if (dentroFinestra(c1, scad, opz)) {
          return {
            stato: 'indizio', come: 'targa', polizza: c1,
            testo: 'Sembra rinnovata',
            spiega: 'Stessa targa ' + t + ': la polizza ' + (c1.numero_polizza || '—')
              + ' parte il ' + iso(c1.data_effetto) + '. Nessuno l\'ha dichiarato.'
          };
        }
      }
    }

    var cid = testo(p.cliente_id);
    if (cid) {
      var lista = i.perClienteRamo[cid + '|' + testo(p.modulo)] || [];
      for (var b = 0; b < lista.length; b++) {
        var c2 = lista[b];
        if (c2.id === p.id) continue;
        /* SE LE DUE TARGHE SI CONOSCONO E SONO DIVERSE, NON E' UN RINNOVO:
           e' una seconda macchina dello stesso cliente. La targa e' il segnale
           forte, e quando dice di NO comanda lei — lasciarla parlare solo
           quando dice di sì vorrebbe dire usarla a senso unico.
           Misurato il 22/09/2026: delle 57 polizze agganciate per cliente e
           ramo, 34 avevano il candidato con una targa nota e DIVERSA. Quelle
           34 uscivano dall'elenco delle non rinnovate, cioe' sparivano dal
           lavoro da fare. */
        var ta = targaNorm(p.targa), tb = targaNorm(c2.targa);
        if (ta && tb && ta !== tb) continue;
        if (dentroFinestra(c2, scad, opz)) {
          return {
            stato: 'indizio', come: 'cliente', polizza: c2,
            testo: 'Sembra rinnovata',
            spiega: 'Stesso cliente e stesso ramo: la polizza ' + (c2.numero_polizza || '—')
              + ' parte il ' + iso(c2.data_effetto) + '. '
              + (ta || tb ? 'Una delle due targhe non si conosce, quindi non si è potuto confrontarle. '
                          : 'Nessuna delle due porta una targa. ')
              + 'È un indizio più debole della targa.'
          };
        }
      }
    }

    return {
      stato: 'nessuno', come: null, polizza: null,
      testo: 'Non rinnovata',
      spiega: 'Non si è trovata nessuna polizza che parta a cavallo di questa scadenza.'
    };
  }

  /* ── L'ELENCO ────────────────────────────────────────────────────────────
     Polizze e rate in una lista sola: sono due cose da fare, ma la domanda
     — «che cosa scade, e c'è ancora copertura?» — è la stessa.

     Una rata la cui polizza non è fra quelle che si vedono NON si mostra e
     NON sparisce: si conta. Quello che resta fuori si dichiara (§55). */
  function righe(dati) {
    dati = dati || {};
    var oggi = iso(dati.oggi) || oggiLocale();
    var opz = { giorni: dati.giorni, sospensione: dati.sospensione };
    var polizze = dati.polizze || [];
    var rate = dati.rate || [];

    var perId = {};
    polizze.forEach(function (p) { if (p && p.id) perId[p.id] = p; });

    var out = [];
    var fuori = 0;
    /* Non basta CONTARE quello che resta fuori: bisogna poter dire PERCHE'.
       Una rata la cui polizza non e' in elenco puo' essere di una polizza
       annullata (normale, l'elenco le esclude per costruzione) oppure di una
       polizza che chi guarda non puo' vedere (§55). Le due cose mandano a
       fare lavori opposti, e senza gli identificativi chi chiama non ha modo
       di distinguerle. */
    var orfane = {};   // polizza_id -> quante RATE ci sono appese

    polizze.forEach(function (p) {
      if (!p) return;
      out.push(daPolizza(p, oggi, opz));
    });

    rate.forEach(function (t) {
      if (!t) return;
      var p = perId[t.polizza_id];
      if (!p) {
        fuori++;
        if (t.polizza_id) orfane[t.polizza_id] = (orfane[t.polizza_id] || 0) + 1;
        return;
      }
      out.push(daRata(t, p, oggi, opz));
    });

    return {
      righe: out, rate_senza_polizza: fuori,
      polizze_orfane: Object.keys(orfane),
      /* Quante RATE per ogni polizza mancante: chi chiama deve poter dire «3
         rate», non «1 polizza» — è il numero degli incassi che restano fuori,
         non quello dei contratti. */
      rate_per_polizza_orfana: orfane,
      oggi: oggi
    };
  }

  /* Il rinnovo si attacca alle sole righe di POLIZZA: una rata non si
     rinnova, si incassa. Attaccarlo anche lì produrrebbe una colonna che
     risponde a una domanda che nessuno ha fatto. */
  function conRinnovo(elenco, polizze, opz) {
    var i = indiceSuccessori(polizze || []);
    (elenco || []).forEach(function (r) {
      if (!r) return;
      if (r.tipo !== 'polizza') { r.rinnovo = null; return; }
      /* La riga conosce gia' la scadenza vera (sospensioni comprese): gliela
         si passa, invece di farla ricalcolare al motore del rinnovo. */
      var o = {};
      for (var k in (opz || {})) o[k] = opz[k];
      o.scadenza = r.scadenza;
      r.rinnovo = rinnovo(r._p, i, o);
    });
    return elenco;
  }

  /* ── CHE LAVORO È QUESTA RIGA ────────────────────────────────────────────
     Il rinnovo dice se un successore c'è; questo dice che cosa FARE, e sono
     due cose diverse. La differenza sta in una riga che, senza, produce un
     elenco di telefonate da fare a gente che non ha ancora niente da
     rinnovare:

     **«Non rinnovata» si dice solo a una polizza la cui scadenza è
     arrivata, o sta arrivando.** Una polizza che scade fra dieci mesi non è
     non rinnovata: non è ancora scaduta. È vero che nessun successore
     esiste — ed è vero anche per tutto il portafoglio sano — ma metterla
     nell'elenco di chi richiamare è lo stesso difetto di §12 e §18 visto
     dall'altro lato: una risposta letteralmente vera che porta a fare la
     cosa sbagliata.

     L'ordine conta: il dichiarato vince su tutto, poi l'indizio, poi quello
     che non si può sapere, poi il tacito rinnovo (si rinnova da solo e va
     verificato, non richiamato), e solo alla fine la scadenza. */
  function statoLavoro(r) {
    if (!r) return { k: 'nessuno', l: 'Non rinnovata' };
    if (r.tipo !== 'polizza') return { k: 'rata', l: 'Rata da incassare' };
    var v = r.rinnovo || {};
    if (v.stato === 'dichiarato') return { k: 'lavorato', l: 'Rinnovata' };
    if (v.stato === 'indizio') return { k: 'indizio', l: 'Sembra rinnovata' };
    if (v.stato === 'non_si_sa') return { k: 'non_si_sa', l: 'Non si sa' };
    if (r.tacito_rinnovo) return { k: 'tacito', l: 'Tacito rinnovo' };
    if (r.fascia === 'avanti') return { k: 'non_ancora', l: 'Non ancora scaduta' };
    return { k: 'nessuno', l: 'Non rinnovata' };
  }

  /* I contatori delle fasce. Contano SEMPRE su tutto l'elenco filtrato per
     gli altri criteri, mai su quello già ristretto alla fascia scelta:
     altrimenti la fascia scelta direbbe il suo numero e le altre zero. */
  function conteggi(elenco, giorniProroga) {
    var p = isFinite(giorniProroga) && giorniProroga >= 0 ? giorniProroga : PROROGA;
    var out = {};
    FASCE.forEach(function (f) {
      out[f.k] = {
        n: 0, noti: 0, senza_importo: 0,
        /* I DUE IMPORTI NON SI SOMMANO MAI, ed e' la regola che rende
           leggibile questo riquadro. Il premio annuo di una polizza e
           l'importo di una sua rata non sono due quantita' diverse: la
           seconda e' una FETTA della prima. Sommarli conta due volte lo
           stesso denaro — misurato sul portafoglio vero: 350 rate aperte per
           79.794,89 euro stanno dentro polizze che sono in elenco con il loro
           annuo intero — e il totale non corrisponde a niente: non e' il
           premio in scadenza e non e' il denaro da incassare.
           E' la stessa regola di §59, dove «premi emessi» e «di cui
           incassati» restano due tessere. */
        polizze: 0, premio_polizze: 0,
        rate: 0, da_incassare: 0
      };
    });
    /* Una riga senza fascia (scadenza mancante) entra in «tutte» e in nessuna
       delle quattro: la somma delle fasce smetterebbe di tornare col totale, e
       chi guarda non avrebbe modo di accorgersene. Si conta a parte, e chi
       chiama decide che farne. La schermata quelle righe le toglie prima. */
    out.senza_fascia = 0;
    (elenco || []).forEach(function (r) {
      if (!r) return;
      var k = r.fascia;
      if (!k) out.senza_fascia++;
      var imp = numero(r.importo);
      var rata = r.tipo === 'rata';
      ['tutte', k].forEach(function (kk) {
        if (!kk || !out[kk]) return;
        var o = out[kk];
        o.n++;
        if (rata) o.rate++; else o.polizze++;
        /* Un importo che non c'è non vale zero (§36, §42, §45): resta fuori
           dalla somma e si conta a parte. */
        if (imp === null) { o.senza_importo++; return; }
        o.noti++;
        if (rata) o.da_incassare = Math.round((o.da_incassare + imp) * 100) / 100;
        else o.premio_polizze = Math.round((o.premio_polizze + imp) * 100) / 100;
      });
    });
    out.__proroga = p;
    return out;
  }

  var API = {
    PROROGA: PROROGA,
    FINESTRA_PRIMA: FINESTRA_PRIMA,
    FINESTRA_DOPO: FINESTRA_DOPO,
    FASCE: FASCE,
    fasciaDi: fasciaDi,
    stato: stato,
    daPolizza: daPolizza,
    daRata: daRata,
    indiceSuccessori: indiceSuccessori,
    rinnovo: rinnovo,
    righe: righe,
    conRinnovo: conRinnovo,
    statoLavoro: statoLavoro,
    conteggi: conteggi,
    /* esposte perché le prove le percorrano, e perché chi chiama non
       reinventi l'aritmetica delle date */
    giorniFra: giorniFra,
    piuGiorni: piuGiorni,
    oggiLocale: oggiLocale,
    targaNorm: targaNorm
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Scadenzario = API;
})();
