/* ═══════════════════════════════════════════════════════════════════════════════
   LA GUIDA ALLE GARANZIE                            (02/10/2026, brief M7)

   Richiesta di Francesco: «il preventivo personalizzato dobbiamo renderlo un
   po' più interattivo, magari generando anche una cosa simile a questo sulla
   base delle garanzie inserite» — con allegata la «Guida alle garanzie» della
   famiglia Tammaro / Tortorici.

   Che cosa fa quel documento, ed è il motivo per cui vale: prende
   «RC capofamiglia 1.000.000 €» e lo trasforma in «tuo figlio, in bicicletta,
   urta un passante». Il cliente non compra un massimale: compra il giorno in
   cui gli serve.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 1 — GLI ESEMPI SONO SCRITTI UNA VOLTA, NON GENERATI OGNI VOLTA.           │
   └───────────────────────────────────────────────────────────────────────────┘
   È la decisione più importante di questo file, ed è una decisione di
   responsabilità, non di tecnica.

   Questo foglio esce dall'agenzia con sopra il nostro nome e dice a un cliente
   che cosa copre una polizza. Un esempio inventato sul momento che racconta un
   sinistro che quella polizza NON copre è un problema di adeguatezza
   (Reg. IVASS 40 e 41), non una frase infelice. Quindi gli esempi stanno qui,
   scritti e rileggibili, agganciati al vocabolario delle garanzie — e si
   cambiano con un commit, che si vede.

   Il modo verbale non è un vezzo: **«può coprire», «può intervenire», «sono
   ammesse le spese previste»**. Mai «copre». La guida illustra, non promette:
   a dire se un sinistro è indennizzabile sono le condizioni, le franchigie e
   le esclusioni, e quelle stanno nel contratto.

   Dove l'intelligenza artificiale serve davvero è PRIMA: leggere la proposta
   di polizza e tirarne fuori le garanzie coi massimali. Quello è un lavoro di
   lettura, e si verifica contro il documento. Decidere che cosa copre una
   garanzia non lo è.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 2 — IL VOCABOLARIO È QUELLO DI `confronto.js`. NON UN SECONDO.            │
   └───────────────────────────────────────────────────────────────────────────┘
   Gli esempi sono agganciati agli stessi identificativi canonici che usa il
   confronto fra prodotti. Due vocabolari delle garanzie vorrebbero dire che la
   stessa copertura si chiama in due modi a seconda del foglio che stampi.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 3 — QUELLO CHE NON SI È CAPITO SI DICHIARA, E NON SI STAMPA UN ESEMPIO.   │
   └───────────────────────────────────────────────────────────────────────────┘
   Le righe del preventivo oggi sono testo libero, scritto a mano. Nel
   preventivo n.4, vero, c'è «Laste 1.000 €» (refuso di «Lastre») e c'è
   «Rendita vitalizia 1000€ al mese (marito+moglie), 500 € al giorno (per
   figlio)» — mese contro giorno sulla stessa garanzia.

   La guida fatta a mano quell'incoerenza l'aveva vista e scritta: «unità
   temporale da confermare, possibile refuso». Questo motore la trova da solo,
   e una riga che non riconosce NON la butta via e non le attacca l'esempio di
   un'altra: la riporta com'è, senza esempio, e la mette fra le cose da
   confermare. Un esempio sbagliato è peggio di un esempio che manca.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'guida-garanzie-2026-10-02';

  /* Il vocabolario delle garanzie vive in `confronto.js`: qui si cerca, non si
     ricopia (nel browser i due file possono arrivare in un ordine qualunque). */
  function motoreConfronto() {
    if (typeof window !== 'undefined' && window.Confronto) return window.Confronto;
    if (typeof require === 'function') { try { return require('./confronto.js'); } catch (e) { return null; } }
    return null;
  }

  function testo(v) { return v == null ? '' : String(v).trim(); }

  /* ── LEGGERE UN IMPORTO ALL'ITALIANA ──────────────────────────────────────
     «1.000.000 €», «130.000 €», «1000€», «50 € al giorno». Il punto è il
     separatore delle migliaia e la virgola quella dei decimali: letti
     all'inglese, 1.000.000 diventerebbe uno. */
  /* L'EURO STA PRIMA O DOPO IL NUMERO, e bisogna leggerle tutt'e due.
     Misurato il 02/10/2026 su un set informativo auto vero: «€ 1.000,00» (euro
     davanti) compare 79 volte, «1.000,00 €» due. Leggendo solo la seconda
     forma si perdevano i massimali della RCA — € 7.290.000, € 6.070.000,
     € 1.220.000 — cioe' i numeri piu' importanti del documento. */
  var R_SOLDI = /(?:(\d[\d.\s]*(?:,\d+)?)\s*(?:€|eur\b|euro\b)|(?:€|eur\b|euro\b)\s*(\d[\d.\s]*(?:,\d+)?))/gi;

  function numeroDa(m) {
    var grezzo = m[1] != null ? m[1] : m[2];
    if (grezzo == null) return null;
    var v = Number(String(grezzo).replace(/[.\s]/g, '').replace(',', '.'));
    return isFinite(v) ? v : null;
  }

  function importo(s) {
    R_SOLDI.lastIndex = 0;
    var m = R_SOLDI.exec(testo(s));
    return m ? numeroDa(m) : null;
  }

  /* Tutti gli importi di una riga, nell'ordine in cui compaiono: una riga sola
     può portarne due («50 € al giorno (marito+moglie), 20 € al giorno (figlio)»). */
  function importi(s) {
    var fuori = [], m;
    R_SOLDI.lastIndex = 0;
    while ((m = R_SOLDI.exec(testo(s)))) {
      var n = numeroDa(m);
      /* `da` e' l'inizio dell'INTERO importo, simbolo compreso: il nome della
         garanzia e' quello che sta prima, e con l'euro davanti il nome
         finirebbe per portarsi dentro il simbolo. */
      if (n != null) fuori.push({ valore: n, da: m.index, lung: m[0].length });
    }
    return fuori;
  }

  /* L'unità di misura dichiarata subito dopo un importo: «al giorno», «al
     mese», «a persona». Serve a due cose: scriverla sulla scheda, e accorgersi
     quando la stessa garanzia ne porta due diverse. */
  var UNITA = [
    { id: 'giorno',  r: /al\s+giorno|\/\s*giorno|giornalier/i, l: 'al giorno' },
    { id: 'mese',    r: /al\s+mese|\/\s*mese|mensil/i,          l: 'al mese' },
    { id: 'anno',    r: /all'anno|\/\s*anno|annu[oa]/i,         l: 'all\'anno' },
    { id: 'persona', r: /a\s+persona|per\s+persona|cadaun/i,    l: 'a persona' }
  ];
  /* Vince l'unità PIÙ VICINA all'importo, non la prima del mio elenco.
     «1000€ al mese, 500 € al giorno»: cercando nell'ordine in cui le ho
     scritte, «giorno» vinceva anche sul primo importo — e con tutt'e due le
     cifre lette «al giorno» l'incoerenza spariva, cioè proprio la cosa che
     questo motore esiste per trovare. Sul prospetto vero non si vedeva per
     caso, perché «( marito + moglie ),» spinge il «al giorno» oltre la
     finestra. (02/10/2026.) */
  function unitaDopo(riga, da, lung) {
    var coda = testo(riga).slice(da + lung, da + lung + 40);
    var vinta = null, dove = -1;
    for (var i = 0; i < UNITA.length; i++) {
      var m = UNITA[i].r.exec(coda);
      if (m && (dove < 0 || m.index < dove)) { dove = m.index; vinta = UNITA[i]; }
    }
    return vinta;
  }

  /* A chi si riferisce un importo, quando la riga lo dice fra parentesi. */
  function perChi(riga, da, lung) {
    var coda = testo(riga).slice(da + lung, da + lung + 60);
    var m = /\(([^)]{1,40})\)/.exec(coda);
    return m ? m[1].replace(/\s+/g, ' ').trim() : null;
  }

  /* La franchigia, quando la riga la dichiara. */
  function franchigia(riga) {
    var m = /franchigia[^0-9]{0,12}(\d[\d.\s]*(?:,\d+)?)\s*(?:€|eur)/i.exec(testo(riga));
    if (!m) return null;
    var v = Number(m[1].replace(/[.\s]/g, '').replace(',', '.'));
    return isFinite(v) ? v : null;
  }

  /* ── LEGGERE UNA RIGA DEL PREVENTIVO ──────────────────────────────────────
     Le righe vere sono queste (preventivo n.4, 02/10/2026):
        «ABITAZIONE |  RC Abitazione 1.000.000 €»
        «Fenomeno Elettrico : 15.000 € - Franchigia 500 €»
        «INFORTUNI FAMIGLIA»                       ← un titolo, non una garanzia
        «Diaria giornaliera da ricovero e post ricovero  50 € al giorno ( marito
         + moglie ), 20 € al giorno ( per figlio )» */
  /* I rami in cui cercare il nome di una garanzia, IN ORDINE. Non uno solo:
     una «protezione casa e famiglia» vera porta dentro casa, infortuni e vita
     nello stesso prospetto (preventivo n.4), e cercando nel solo ramo «casa»
     l'invalidità permanente non si troverebbe.

     L'ordine conta perché alcuni nomi vivono in due rami: «cristalli» è
     `cristalli_casa` in casa e `cristalli` in auto, «furto» è `furto_casa` e
     `furto`. Vince il primo ramo dell'elenco, e l'elenco lo decide chi sa che
     prodotto ha davanti. */
  /* La ricerca su più rami sta nel VOCABOLARIO, non qui: è lì che vivono i
     sinonimi e la regola con cui si sceglie fra due garanzie che combaciano
     tutt'e due. Riscriverla qui vorrebbe dire due regole, e due risposte
     diverse alla stessa domanda a seconda del foglio che si stampa. */
  function normalizzaFra(rami, nome) {
    var C = motoreConfronto();
    return C && C.normalizzaFra ? C.normalizzaFra(rami, nome) : null;
  }

  function leggiRiga(riga, rami) {
    var t = testo(riga);
    if (!t) return null;
    if (typeof rami === 'string') rami = [rami];
    var vals = importi(t);

    /* Una riga senza nessun importo e tutta in maiuscolo è un'intestazione di
       sezione, non una garanzia: «INFORTUNI FAMIGLIA», «PROTEZIONE VITA».
       Trattarla da garanzia metterebbe nella guida una scheda vuota col nome
       di un capitolo. */
    if (!vals.length && t === t.toUpperCase() && /[A-ZÀ-Ü]/.test(t)) {
      return { tipo: 'titolo', testo: t.replace(/\s*\|\s*$/, '').trim() };
    }

    /* Il nome: quello che sta prima del primo importo, ripulito dal titolo di
       sezione («ABITAZIONE | ») e dai due punti. */
    var nome = (vals.length ? t.slice(0, vals[0].da) : t)
      .replace(/^[^|]{0,30}\|\s*/, '')
      .replace(/[:\-–]\s*$/, '')
      .replace(/\s+/g, ' ')
      /* Le parole di riempimento in coda al nome. Sul prospetto vero c'e'
         «Invalidità permanente  massimale 100.000 €»: senza toglierle, sulla
         scheda del cliente il titolo diventa «Invalidità permanente
         massimale», che non e' il nome di niente. */
      .replace(/[\s,;:-]*\b(?:massimale|massimali|capitale|somma assicurata|fino a|max|limite)\b[\s:]*$/i, '')
      .replace(/[\s,;:\-–]+$/, '')
      .trim();

    var voci = vals.map(function (v) {
      var u = unitaDopo(t, v.da, v.lung);
      return { valore: v.valore, unita: u ? u.id : null, unitaL: u ? u.l : null, chi: perChi(t, v.da, v.lung) };
    });

    return {
      tipo: 'garanzia',
      nome: nome || t,
      id: normalizzaFra(rami, nome),
      voci: voci,
      franchigia: franchigia(t),
      riga: t
    };
  }

  /* ── GLI ESEMPI ──────────────────────────────────────────────────────────
     Uno per garanzia canonica. Il testo è quello della guida che l'agenzia usa
     già (famiglia Tammaro / Tortorici), perché è la sua voce e perché è scritto
     bene: condizionale, concreto, e dice sempre che cosa NON è.

     `attenzione` è la frase che toglie l'equivoco più probabile su quella
     garanzia. Dove c'è, va stampata: è la differenza fra illustrare e
     promettere. */
  var ESEMPI = {
    /* ── casa e responsabilità civile ─────────────────────────────────────── */
    rc_capofamiglia: {
      sezione: 'casa',
      esempio: 'Tuo figlio, in bicicletta, urta un passante e gli provoca una lesione: la garanzia può '
        + 'intervenire sulla responsabilità civile della vita privata.' },
    rc_abitazione: {
      sezione: 'casa',
      esempio: 'Un pezzo di intonaco si stacca dal balcone e danneggia un\'auto: la garanzia può coprire '
        + 'il danno a terzi di cui sei responsabile.' },
    incendio_fabbricato: {
      sezione: 'casa',
      esempio: 'Un incendio danneggia pareti, pavimenti e impianti: la copertura riguarda il ripristino '
        + 'delle parti dell\'immobile assicurate.' },
    incendio_contenuto: {
      sezione: 'casa',
      esempio: 'Le fiamme distruggono divano, mobili, vestiti ed elettrodomestici: la garanzia riguarda '
        + 'i beni assicurati presenti nell\'abitazione.' },
    danni_acqua: {
      sezione: 'casa',
      esempio: 'Un tubo nascosto perde: occorre aprire il muro, individuare il guasto e ripristinare. '
        + 'Sono ammesse le spese previste dalla clausola.',
      attenzione: 'I danni da acqua ai beni o ai vicini seguono una garanzia diversa e vanno verificati a parte.' },
    cristalli_casa: {
      sezione: 'casa',
      esempio: 'Si rompe accidentalmente il vetro di una finestra: la sostituzione può essere coperta se '
        + 'il tipo di lastra e la causa rientrano in polizza.' },
    furto_casa: {
      sezione: 'casa',
      esempio: 'Rientri e trovi la porta forzata e i gioielli spariti: la garanzia può indennizzare i beni '
        + 'sottratti, nei limiti previsti per i preziosi e per i mezzi di chiusura.' },
    guasti_ladri_casa: {
      sezione: 'casa',
      esempio: 'I ladri forzano la porta e rovinano serratura e infisso, anche senza portare via niente: '
        + 'possono essere coperti i danni fatti per entrare.' },
    eventi_atmosferici: {
      sezione: 'casa',
      esempio: 'Una grandinata rompe le tegole e l\'acqua entra in casa: possono essere coperti i danni '
        + 'all\'immobile e, se assicurato, al contenuto.' },

    /* ── imprevisti e infortuni ───────────────────────────────────────────── */
    fenomeno_elettrico: {
      sezione: 'imprevisti',
      esempio: 'Una sovratensione danneggia il televisore o la scheda della lavatrice: possono essere '
        + 'coperte riparazione o sostituzione.',
      attenzione: 'Il semplice guasto da usura non è un fenomeno elettrico.' },
    tutela_legale_casa: {
      sezione: 'imprevisti',
      esempio: 'Subisci un danno e hai bisogno di un avvocato per chiedere il risarcimento: possono essere '
        + 'sostenute le spese legali e peritali per le controversie previste.',
      attenzione: 'Non è una garanzia che paga i danni dovuti ad altri: paga la difesa.' },
    invalidita: {
      sezione: 'imprevisti',
      esempio: 'Dopo una caduta resta una limitazione definitiva a una mano: può essere riconosciuto un '
        + 'indennizzo proporzionato al grado di invalidità accertato.',
      attenzione: 'Il massimale non è l\'importo riconosciuto per ogni infortunio: dipende dal grado di '
        + 'invalidità e dalle regole contrattuali.' },
    spese_mediche: {
      sezione: 'imprevisti',
      esempio: 'Dopo una caduta sostieni spese per accertamenti, visite ortopediche e fisioterapia: sono '
        + 'rimborsabili le spese documentate ammesse, entro i limiti e al netto delle franchigie.' },
    diaria: {
      sezione: 'imprevisti',
      esempio: 'Resti ricoverato per alcuni giorni: per ogni giorno indennizzabile è prevista una somma '
        + 'fissa, indipendente dalle spese sostenute.',
      attenzione: 'Il post ricovero ha regole e limiti suoi.' },
    diaria_gessatura: {
      sezione: 'imprevisti',
      esempio: 'Una frattura viene immobilizzata con un apparecchio gessato: per i giorni di '
        + 'immobilizzazione previsti può spettare una somma giornaliera.',
      attenzione: 'La copertura dei tutori e dei mezzi diversi dal gesso va verificata in polizza.' },
    infortuni: {
      sezione: 'imprevisti',
      esempio: 'Un infortunio in casa o nel tempo libero produce conseguenze fisiche: la garanzia può '
        + 'intervenire secondo le prestazioni previste dal contratto.' },

    /* ── famiglia e futuro ────────────────────────────────────────────────── */
    rendita: {
      sezione: 'futuro',
      esempio: 'Un infortunio provoca un\'invalidità permanente che raggiunge la soglia contrattuale: può '
        + 'attivarsi una rendita per tutta la vita.' },
    caso_morte: {
      sezione: 'futuro',
      esempio: 'In caso di decesso per causa coperta durante la durata indicata, i beneficiari ricevono il '
        + 'capitale previsto: un sostegno per il mutuo, le spese familiari e il futuro dei figli.',
      attenzione: 'Nella temporanea caso morte pura non è previsto un capitale a scadenza se l\'assicurato '
        + 'è in vita.' },
    /* Il prospetto dice «copertura vita» e un capitale, e NON dice che
       contratto sia. L'esempio resta al condizionale e la scheda chiede di
       confermarlo: e' quello che la guida fatta a mano aveva scritto, ed e'
       l'unica cosa onesta da scrivere finche' non si guardano le condizioni. */
    vita_generica: {
      sezione: 'futuro',
      daConfermare: true,
      esempio: 'Se la copertura è una temporanea caso morte, in caso di decesso per causa coperta durante '
        + 'la durata indicata i beneficiari ricevono il capitale previsto.',
      attenzione: 'La tipologia della copertura va confermata sui documenti contrattuali: da «copertura '
        + 'vita» non si capisce se sia una temporanea caso morte, una mista o un capitale rivalutabile, e '
        + 'le tre cose si comportano in modo diverso.' },

    /* ── azienda ──────────────────────────────────────────────────────────── */
    rct: {
      sezione: 'azienda',
      esempio: 'Un cliente scivola nei locali dell\'attività e si fa male: la garanzia può intervenire '
        + 'sulla responsabilità civile verso terzi.' },
    rco: {
      sezione: 'azienda',
      esempio: 'Un dipendente si infortuna sul lavoro e l\'istituto agisce in rivalsa: la garanzia può '
        + 'intervenire nei limiti previsti.' },
    incendio_azienda: {
      sezione: 'azienda',
      esempio: 'Un incendio ferma l\'attività e danneggia locali e attrezzature: la copertura riguarda i '
        + 'beni assicurati.' },
    furto_azienda: {
      sezione: 'azienda',
      esempio: 'Un furto con scasso sottrae merce e attrezzature: la garanzia può indennizzare i beni '
        + 'sottratti, secondo i mezzi di chiusura richiesti.' },
    danni_elettrici: {
      sezione: 'azienda',
      esempio: 'Una sovratensione brucia la centralina o il macchinario: possono essere coperte '
        + 'riparazione o sostituzione.' },

    /* ── auto ─────────────────────────────────────────────────────────────── */
    rca: {
      sezione: 'auto',
      esempio: 'Causi un incidente e danneggi un\'altra auto o ferisci qualcuno: la garanzia risarcisce i '
        + 'terzi danneggiati, fino al massimale di polizza.' },
    infortuni_conducente: {
      sezione: 'auto',
      esempio: 'Hai un incidente di cui sei responsabile e ti fai male: la RCA non ti copre, questa '
        + 'garanzia sì, secondo le prestazioni previste.' },
    kasko: {
      sezione: 'auto',
      esempio: 'Esci di strada da solo e danneggi la tua auto: può essere indennizzato il danno al tuo '
        + 'veicolo, al netto della franchigia.' },
    /* L'esempio dice la differenza con la kasko, perché è quella differenza
       che il cliente scopre al primo sinistro: qui serve l'altro veicolo, e
       serve che si sappia chi è. */
    collisione_identificati: {
      sezione: 'auto',
      esempio: 'Ti scontri con un\'altra auto e l\'altro conducente si ferma e dà le sue generalità: il '
        + 'danno alla tua auto può essere indennizzato. Se esci di strada da solo, o se l\'altro scappa '
        + 'senza farsi identificare, questa garanzia non interviene.' },
    guasti_ladri: {
      sezione: 'auto',
      esempio: 'Tentano di rubare l\'auto e rompono il bloccasterzo e la portiera senza riuscirci: '
        + 'i danni fatti nel tentativo possono essere indennizzati, al netto della franchigia.' },
    cristalli: {
      sezione: 'auto',
      esempio: 'Un sasso scheggia il parabrezza: riparazione o sostituzione possono essere coperte.' },
    furto: {
      sezione: 'auto',
      esempio: 'L\'auto viene rubata o danneggiata nel tentativo: la garanzia può indennizzare il valore '
        + 'previsto dal contratto.' },
    assistenza: {
      sezione: 'auto',
      esempio: 'Resti fermo per un guasto lontano da casa: possono essere previsti traino, auto '
        + 'sostitutiva e rientro.' },
    tutela_legale: {
      sezione: 'auto',
      esempio: 'Dopo un incidente serve un legale per ottenere il risarcimento: possono essere sostenute '
        + 'le spese legali e peritali previste.' }
  };

  /* Le sezioni della guida, nell'ordine in cui si stampano. I titoli sono
     quelli del documento che l'agenzia usa già. */
  var SEZIONI = [
    { id: 'casa',       numero: '01', titolo: 'Casa e responsabilità civile',
      claim: 'La tua casa. La vita quotidiana.',
      sotto: 'Esempi per capire come possono intervenire le garanzie del prospetto.' },
    { id: 'imprevisti', numero: '02', titolo: 'Imprevisti e infortuni',
      claim: 'Un aiuto quando serve.',
      sotto: 'Dai danni elettrici alle conseguenze di un infortunio in famiglia.' },
    { id: 'futuro',     numero: '03', titolo: 'Famiglia e futuro',
      claim: 'Protezione che guarda avanti.',
      sotto: 'Le prestazioni che guardano oltre l\'imprevisto di oggi.' },
    { id: 'azienda',    numero: '04', titolo: 'Attività e impresa',
      claim: 'Il lavoro protetto.',
      sotto: 'Quello che può fermare l\'attività, e come la polizza può intervenire.' },
    { id: 'auto',       numero: '05', titolo: 'Veicoli',
      claim: 'Su strada.',
      sotto: 'Dalla responsabilità verso gli altri ai danni al tuo mezzo.' },
    { id: 'altro',      numero: '06', titolo: 'Altre garanzie del prospetto',
      claim: 'Il resto di quello che hai in polizza.',
      sotto: 'Garanzie riportate dal prospetto per cui non c\'è ancora una scheda illustrata.' }
  ];

  var PIEDE = 'Documento illustrativo redatto sul prospetto fornito, non sostitutivo del preventivo e delle '
    + 'condizioni di assicurazione. Importi e prestazioni vanno letti con franchigie, soglie, durata, limiti '
    + 'ed esclusioni.';

  /* L'importo si scrive a mano, non con `Intl`. Misurato il 02/10/2026:
     `Intl` con le impostazioni ovvie rende 1.000.000 € ma 1000 € — il
     raggruppamento «automatico» salta il separatore sui numeri di quattro
     cifre, e cambia con la versione di ICU. Su un foglio che va al cliente,
     «1000 €» accanto a «130.000 €» e' sciatto; e due ambienti che scrivono lo
     stesso numero in due modi sono peggio che sciatti. */
  function euro(n) {
    if (n == null || !isFinite(n)) return null;
    var neg = n < 0, v = Math.abs(n);
    var cent = Math.round(v * 100) % 100;
    var intero = String(Math.floor(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + intero + (cent ? ',' + String(cent).padStart(2, '0') : '') + ' €';
  }

  /* L'importo scritto come va letto: «1.000.000 €», «50 € al giorno (marito e
     moglie)», e quando ce ne sono due, tutt'e due. */
  function importoScritto(voci) {
    return (voci || []).map(function (v) {
      return euro(v.valore) + (v.unitaL ? ' ' + v.unitaL : '') + (v.chi ? ' (' + v.chi + ')' : '');
    }).join(' · ');
  }

  /* ── LA GUIDA ─────────────────────────────────────────────────────────────
     Riceve le righe del preventivo (testo libero, come sono scritte oggi) e
     torna le sezioni con dentro le schede. Non disegna: dice che cosa ci sarà
     scritto sopra. */
  function guida(righe, opz) {
    opz = opz || {};
    /* I rami da consultare, in ordine di precedenza. Chi chiama sa che prodotto
       ha in mano; se non lo dice, si guarda tutto partendo dalla casa, che e'
       il prospetto piu' ricco e quello che il nome «cristalli» lo intende
       come lastre di casa, non come parabrezza. */
    var rami = Array.isArray(opz.rami) && opz.rami.length ? opz.rami
             : (testo(opz.ramo) ? [testo(opz.ramo).toLowerCase()]
                                : ['casa', 'salute', 'vita', 'azienda', 'auto']);
    var lette = [], daConfermare = [];
    var titoloCorrente = null;

    (righe || []).forEach(function (r) {
      var x = leggiRiga(r, rami);
      if (!x) return;
      if (x.tipo === 'titolo') { titoloCorrente = x.testo; return; }
      /* Una garanzia senza nessun importo: il prospetto la nomina e non dice
         quanto. Si riporta, perché c'è, ma non si inventa una cifra. */
      if (!x.voci.length) {
        daConfermare.push('«' + x.nome + '» è nel prospetto ma non porta nessun importo.');
      }
      x.sottoTitolo = titoloCorrente;
      lette.push(x);
    });

    /* ── L'INCOERENZA DELLE UNITÀ ───────────────────────────────────────────
       La stessa garanzia che porta «al mese» e «al giorno» nella stessa riga è
       quasi sempre un refuso del prospetto, e la guida fatta a mano l'aveva
       scritto: «unità temporale da confermare, possibile refuso». Trovarla da
       soli vuol dire non mandarla più a un cliente senza accorgersene. */
    lette.forEach(function (x) {
      var u = {};
      x.voci.forEach(function (v) { if (v.unita) u[v.unita] = 1; });
      var k = Object.keys(u).filter(function (i) { return i === 'giorno' || i === 'mese' || i === 'anno'; });
      if (k.length > 1) {
        x.unitaIncoerente = true;
        daConfermare.push('«' + x.nome + '» porta due unità diverse (' + k.join(' e ') +
          '): sul prospetto è quasi sempre un refuso, va confermato prima di consegnare.');
      }
    });

    /* Le schede, una per garanzia riconosciuta. */
    var perSezione = {};
    lette.forEach(function (x) {
      var e = x.id ? ESEMPI[x.id] : null;
      var sez = e ? e.sezione : 'altro';
      if (!e) {
        /* Riconosciuta dal vocabolario ma senza scheda, oppure non riconosciuta
           affatto: in tutt'e due i casi niente esempio. Attaccarle quello di
           un'altra garanzia sarebbe la bugia più facile da non notare. */
        daConfermare.push('«' + x.nome + '» non ha ancora una scheda illustrata: nella guida compare con '
          + 'il suo importo, senza esempio.');
      }
      /* Un esempio che si dichiara da confermare (la copertura vita di cui non
         si sa il tipo) va nell'elenco come se la scheda mancasse: il foglio
         esce lo stesso, e chi lo consegna sa che cosa deve verificare. */
      if (e && e.daConfermare) {
        daConfermare.push('«' + x.nome + '»: ' + e.attenzione);
      }
      (perSezione[sez] = perSezione[sez] || []).push({
        id: x.id || null,
        nome: x.nome,
        importo: importoScritto(x.voci),
        voci: x.voci,
        franchigia: x.franchigia,
        esempio: e ? e.esempio : null,
        attenzione: e ? (e.attenzione || null) : null,
        daConfermare: !!x.unitaIncoerente || !e || !!(e && e.daConfermare),
        riga: x.riga
      });
    });

    var sezioni = SEZIONI
      .filter(function (s) { return (perSezione[s.id] || []).length; })
      .map(function (s, i) {
        return { id: s.id, numero: String(i + 1).padStart(2, '0'), titolo: s.titolo,
                 claim: s.claim, sotto: s.sotto, schede: perSezione[s.id] };
      });

    return {
      ok: sezioni.length > 0,
      motivo: sezioni.length ? null
        : 'Nessuna garanzia leggibile nel prospetto: la guida non si può scrivere, e non si inventa.',
      sezioni: sezioni,
      pagine: sezioni.length,
      schede: sezioni.reduce(function (n, s) { return n + s.schede.length; }, 0),
      conEsempio: sezioni.reduce(function (n, s) {
        return n + s.schede.filter(function (c) { return !!c.esempio; }).length; }, 0),
      daConfermare: daConfermare,
      piede: PIEDE
    };
  }

  /* ── IL DOCUMENTO DA STAMPARE ─────────────────────────────────────────────
     Non si disegna qui. Si DESCRIVE, e a disegnarlo e' `pdf-withus.js`, lo
     stesso che fa il preventivo, il foglio cassa e il foglio previdenziale.
     «Stessa interfaccia grafica» vuol dire lo stesso codice, non lo stesso
     aspetto rifatto una seconda volta — ed e' anche l'unico modo di provare
     che cosa ci sara' scritto sopra senza aprire un browser.

     LE COSE DA CONFERMARE VANNO SUL FOGLIO, in fondo, non solo a schermo. Un
     documento che le tace e' quello che fa arrivare un refuso in mano al
     cliente senza che nessuno se ne accorga. */
  function documentoPdf(g, opz) {
    opz = opz || {};
    if (!g || !g.ok) return null;
    var blocchi = [];
    g.sezioni.forEach(function (s) {
      blocchi.push({ tipo: 'titolo', testo: s.numero + ' / ' + s.titolo.toUpperCase() + ' — ' + s.claim });
      s.schede.forEach(function (c) {
        var par = [];
        par.push(c.esempio || 'Garanzia riportata dal prospetto. Per questa copertura non c\'e\' ancora una '
          + 'scheda illustrata: le condizioni di polizza restano l\'unico riferimento.');
        if (c.attenzione) par.push(c.attenzione);
        if (c.franchigia != null) par.push('Franchigia dichiarata: ' + euro(c.franchigia) + '.');
        blocchi.push({ tipo: 'testo',
          /* Solo il NOME in maiuscolo: «1.000 € AL GIORNO» si legge male, e un
             importo gridato su un foglio al cliente non aiuta nessuno. */
          titolo: c.nome.toUpperCase() + (c.importo ? '  ·  ' + c.importo : ''),
          paragrafi: par, tono: c.daConfermare ? 'ambra' : null, size: 8.5, leading: 4.2 });
      });
    });
    if (g.daConfermare.length) {
      blocchi.push({ tipo: 'titolo', testo: 'DA CONFERMARE SUI DOCUMENTI CONTRATTUALI' });
      blocchi.push({ tipo: 'testo', titolo: null, paragrafi: g.daConfermare, punti: true,
        tono: 'ambra', size: 8, leading: 4 });
    }
    var chi = testo(opz.cliente) || 'Cliente';
    return {
      tipo: 'GUIDA ALLE GARANZIE', numero: chi,
      sotto: opz.numero ? 'Preventivo ' + opz.numero + (opz.data ? ' del ' + opz.data : '') : '',
      azienda: opz.azienda || {}, banda: null, filigrana: null, colonne: [], blocchi: blocchi,
      firma: opz.firma || null,
      avvertenze: PIEDE + (opz.avvertenzeInPiu ? ' ' + testo(opz.avvertenzeInPiu) : ''),
      piedeSinistra: (opz.azienda && opz.azienda.ragioneSociale) || '',
      piedeDestra: 'Guida alle garanzie',
      titoloPdf: 'Guida alle garanzie — ' + chi,
      nomeFile: 'guida-garanzie_' + chi.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf'
    };
  }

  var API = { VERSIONE: VERSIONE, ESEMPI: ESEMPI, SEZIONI: SEZIONI, PIEDE: PIEDE, documentoPdf: documentoPdf,
    importo: importo, importi: importi, leggiRiga: leggiRiga, guida: guida, euro: euro,
    importoScritto: importoScritto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.GuidaGaranzie = API;
})();
