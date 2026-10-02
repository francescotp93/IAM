/* ═══════════════════════════════════════════════════════════════════════════════
   METTERE UN PRODOTTO IN ARCHIVIO LEGGENDO IL SUO DOCUMENTO   (02/10/2026)

   Confronta sa già mettere due prodotti uno accanto all'altro, garanzia per
   garanzia. Quello che non sapeva fare era entrarci dentro: l'archivio era
   vuoto perché l'unico modo previsto per riempirlo era scaricare le note
   informative dalla rete, e la rete di questo ambiente è chiusa.

   Questo motore apre l'altra strada, quella che non ha bisogno di rete: si
   carica il documento di un prodotto e lui propone le righe da archiviare.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 1 — LA MISURA CHE HA DECISO TUTTO QUANTO C'È SCRITTO QUI SOTTO.           │
   └───────────────────────────────────────────────────────────────────────────┘
   Misurato il 02/10/2026 su un set informativo auto vero — DALLBOGG, edizione
   06/2020, 61 pagine — con cinque letture indipendenti, ognuna poi rimessa in
   discussione da un controllore che aveva il compito di smentirla.

   Tutte e cinque le letture erano giuste nei fatti. Tutte e cinque le REGOLE
   che proponevano sono state smentite, e sempre nello stesso modo: applicate
   alla lettera, dicevano «NON COMPRESA» su una garanzia che il prodotto vende.

   Vale la pena elencarle, perché sono le trappole in cui questo file non cade:

   · «Non previste» (pag. 7, 8, 9, 11 — cinque volte) NON vuol dire che la
     garanzia non c'è: è il valore della casella «Ulteriori garanzie con un
     premio aggiuntivo», cioè «nessuna estensione sopra questa garanzia».
     Leggerlo come assenza nega CRISTALLI, EVENTI NATURALI, EVENTI
     SOCIOPOLITICI e COLLISIONE su un prodotto che li vende, e li vende
     elencati nero su bianco a pagina 2.
   · «la garanzia Guasti Cagionati dai ladri è da intendersi non attiva»
     (pag. 38) è una CONDIZIONE DI OPERATIVITÀ — la frase comincia con «In
     caso di solo furto totale». È l'unica riga del documento che accosta una
     negazione al nome di una garanzia, e non è un'assenza.
   · «L'assicurazione vale esclusivamente per veicoli identificati» (pag. 42)
     delimita l'oggetto di un'ALTRA garanzia: non dichiara assente la
     collisione con non assicurati.
   · «tutela legale» compare UNA volta in 2979 righe (pag. 32), dentro una
     clausola di vincolo a favore di un finanziatore. Non è né presente né
     assente: è non letta.
   · Prendere il campo «Compagnia:» alla prima occorrenza utile archivia
     «www.dallbogg.it sezione dedicata ai Reclami» come nome della compagnia
     (pag. 14).
   · Tenere le Condizioni come fonte vincolante fa sparire RINUNCIA ALLA
     RIVALSA, che in quel documento sta solo nei DIP.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 2 — LA CONSEGUENZA, E È LA COSA PIÙ IMPORTANTE DI QUESTO FILE.            │
   └───────────────────────────────────────────────────────────────────────────┘
   QUESTO MOTORE NON SCRIVE MAI 'assente'. Mai, in nessun caso.

   Non è prudenza generica: è il risultato della misura. Sul documento vero gli
   «assente» giusti sono ZERO, e cinque tentativi indipendenti di dedurli
   automaticamente hanno prodotto tutti un dato falso. Una macchina che non sa
   distinguere «la garanzia non c'è» da «la garanzia c'è ma non puoi estenderla»
   non deve avere il permesso di dirlo.

   'assente' resta uno stato che una PERSONA spunta, con la citazione che ha
   trovato. L'archivio lo prevede e il confronto lo usa; qui non si genera.

   Perché conta tanto: il confronto lo si mostra a un cliente. Dire che un
   concorrente non copre una cosa che invece copre non è una casella storta, è
   adeguatezza (Reg. IVASS 40 e 41) — e lo si scoprirebbe quando il cliente
   torna col documento in mano.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 3 — DUE TEST IN QUEST'ORDINE, NON UNO.                                    │
   └───────────────────────────────────────────────────────────────────────────┘
   TEST 1 — COSTITUZIONE: «questa garanzia esiste in questo prodotto?»
   Si risponde SOLO con un'intestazione di blocco, di sezione o di articolo,
   oppure con una voce di un elenco di garanzie acquistabili. In qualunque
   fascicolo del documento: il DIP vale quanto le Condizioni per DIRE CHE UNA
   GARANZIA ESISTE (la precedenza fra fascicoli serve sui conflitti, non
   sull'esistenza — è quello che salva Rinuncia alla rivalsa).
   Niente costituzione → 'non_letto'. Non 'presente', e nemmeno 'assente'.

   TEST 2 — I NUMERI: si cercano solo per le garanzie costituite, e solo dove
   l'ancora è esplicita. Un importo non si attribuisce per vicinanza.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 4 — NESSUNA PAGINA SI BUTTA IN SILENZIO.                                  │
   └───────────────────────────────────────────────────────────────────────────┘
   Il documento si divide in fascicoli sul piè di pagina, che si SCOPRE (è
   l'ultima riga non vuota che si ripete su almeno due pagine di fila) invece
   di essere elencato. Sul documento vero i fascicoli sono cinque e le pagine
   che restano fuori sono tre — 1, 15 e 16 — e la 15 porta contenuto vero
   («COSA FARE IN CASO DI INCIDENTE») mentre la 16 porta l'unica edizione delle
   Condizioni.

   Una pagina orfana non si scarta: si dichiara. La soglia in percentuale, che
   era la prima idea, lasciava passare il 12% del documento — cioè tutto
   l'allegato dell'assistenza — senza che nessuno lo sapesse.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 5 — QUELLO CHE IL VOCABOLARIO NON HA, SI DICHIARA.                        │
   └───────────────────────────────────────────────────────────────────────────┘
   Il documento vero vende GAP (Cash Back), MoneyBox, Ricorso Terzi, Rapina:
   coperture che il vocabolario a 16 voci non prevede. Senza dirlo, quelle
   coperture spariscono dal confronto senza che nessun campo risulti «non
   letto» — cioè il prodotto risulta più povero di quello che è, e nessuno
   capisce perché. `fuoriVocabolario` le elenca.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'scheda-prodotto-2026-10-02';

  function motoreConfronto() {
    if (typeof window !== 'undefined' && window.Confronto) return window.Confronto;
    if (typeof require === 'function') { try { return require('./confronto.js'); } catch (e) { return null; } }
    return null;
  }
  function motoreGuida() {
    if (typeof window !== 'undefined' && window.GuidaGaranzie) return window.GuidaGaranzie;
    if (typeof require === 'function') { try { return require('./guida-garanzie.js'); } catch (e) { return null; } }
    return null;
  }
  /* Il nome spezzato su più righe lo sa già ricucire il lettore delle
     proposte, che per quello ha le sue prove e le sue controprove. Si riusa
     invece di scriverne un secondo: due funzioni che fanno la stessa cosa si
     separano al primo documento strano, e allora non si sa più quale delle due
     ha prodotto il numero che si sta guardando. */
  function motoreLettura() {
    if (typeof window !== 'undefined' && window.LetturaProposta) return window.LetturaProposta;
    if (typeof require === 'function') { try { return require('./lettura-proposta.js'); } catch (e) { return null; } }
    return null;
  }

  function testo(v) { return v == null ? '' : String(v).trim(); }

  /* Le legature tipografiche che l'estrazione da PDF lascia dentro: sul
     documento vero «ﬁ» compare 216 volte, «ﬀ» 16, «ﬃ» 10, «ﬂ» 10. Senza
     scioglierle, «identiﬁcati» e «identificati» sono due parole diverse e un
     confronto fra stringhe non trova né l'una né l'altra. */
  var LEGATURE = [['ﬀ', 'ff'], ['ﬁ', 'fi'], ['ﬂ', 'fl'],
                  ['ﬃ', 'ffi'], ['ﬄ', 'ffl'], ['ﬅ', 'st'], ['ﬆ', 'st']];
  function senzaLegature(s) {
    var t = testo(s);
    for (var i = 0; i < LEGATURE.length; i++) t = t.split(LEGATURE[i][0]).join(LEGATURE[i][1]);
    /* Lo spazio non divisibile: nove volte sul documento vero, e proprio
       davanti al simbolo dell'euro nelle tabelle. */
    return t.replace(/ /g, ' ');
  }
  function pulisci(s) { return senzaLegature(s).replace(/\s+/g, ' ').trim(); }

  /* ── I FASCICOLI ──────────────────────────────────────────────────────────
     Il piè di pagina si scopre: è l'ultima riga non vuota di una pagina, e
     diventa un confine quando si ripete — a meno della numerazione interna —
     su almeno due pagine di fila. Elencare i piè di pagina conosciuti sarebbe
     un elenco da aggiornare per ogni compagnia, e una compagnia che non c'è
     sbaglia in silenzio. */
  function famiglia(piede) {
    return pulisci(piede)
      .replace(/pag(ina)?\.?\s*\d+\s*(di|\/)\s*\d+/gi, '')
      .replace(/\d+\s*(di|\/)\s*\d+/g, '')
      .replace(/[-–—\s]+$/, '')
      .trim().toLowerCase();
  }

  function fascicoli(pagine) {
    /* Il marcatore si cerca in CODA e in TESTA. Sul documento vero il set lo
       stampa in fondo («SET INFORMATIVO AUTO - CONDIZIONI… pag. 3 di 34») ma
       l'allegato dell'assistenza lo stampa in cima («Rev. 2020/05 - Pag. 1 di
       6»): guardando solo in fondo, quelle sei pagine restavano orfane — e
       dentro ci sono i massimali dell'assistenza. */
    var righe = (pagine || []).map(function (p) {
      var linee = testo(p && p.testo).split(/\r?\n/).filter(function (l) { return testo(l); });
      return {
        n: p && p.n != null ? p.n : null,
        coda: linee.length ? pulisci(linee[linee.length - 1]) : '',
        testa: linee.length ? pulisci(linee[0]) : '',
        vuota: !linee.length
      };
    });
    /* Quale delle due estremità è il piè di pagina lo decide la ripetizione:
       si sceglie il lato che si ripete di più su tutto il documento. */
    var quanteCode = {}, quanteTeste = {};
    righe.forEach(function (r) {
      var fc = famiglia(r.coda), ft = famiglia(r.testa);
      if (fc) quanteCode[fc] = (quanteCode[fc] || 0) + 1;
      if (ft) quanteTeste[ft] = (quanteTeste[ft] || 0) + 1;
    });
    righe.forEach(function (r) {
      var fc = famiglia(r.coda), ft = famiglia(r.testa);
      var nc = fc ? quanteCode[fc] : 0, nt = ft ? quanteTeste[ft] : 0;
      if (nt > nc) { r.piede = r.testa; r.fam = ft; }
      else { r.piede = r.coda; r.fam = fc; }
    });

    /* Una famiglia vale come confine solo se compare su due pagine di fila:
       «Edizione 06/2020» chiude la pagina 1 e la 16, che sono due copertine
       lontane, e non è un piè di pagina. */
    var conta = {};
    righe.forEach(function (r, i) {
      if (!r.fam) return;
      var prima = i > 0 && righe[i - 1].fam === r.fam;
      var dopo = i + 1 < righe.length && righe[i + 1].fam === r.fam;
      if (prima || dopo) conta[r.fam] = (conta[r.fam] || 0) + 1;
    });

    var fasc = [], orfane = [], corrente = null;
    righe.forEach(function (r) {
      var buona = r.fam && conta[r.fam];
      if (!buona) { orfane.push(r.n); if (corrente) corrente.coda.push(r.n); else fasc.push(null); return; }
      if (!corrente || corrente.fam !== r.fam) {
        /* `proprie` sono le pagine che portano DAVVERO il piè di pagina di
           questo fascicolo. `pagine` comprende anche le orfane attaccate qui
           per dire da dove vengono, e non è la stessa cosa: usare `pagine`
           come lascia-passare faceva entrare i numeri delle pagine orfane,
           che è esattamente quello che il controllo doveva impedire. */
        corrente = { fam: r.fam, piede: r.piede, da: r.n, a: r.n,
          pagine: [r.n], proprie: [r.n], coda: [] };
        fasc.push(corrente);
      } else { corrente.a = r.n; corrente.pagine.push(r.n); corrente.proprie.push(r.n); }
    });
    fasc = fasc.filter(Boolean);

    /* Le pagine orfane PRIMA del primo fascicolo si attaccano a quello che
       segue: sul documento vero sono la copertina (1) e la copertina delle
       Condizioni (16), che porta l'unica edizione delle 34 pagine di garanzie.
       Attaccarle non le fa sparire: restano contate in `orfane`. */
    orfane.forEach(function (n) {
      if (n == null) return;
      for (var i = 0; i < fasc.length; i++) {
        if (fasc[i].da > n) { if (fasc[i].pagine.indexOf(n) < 0) fasc[i].pagine.unshift(n); return; }
      }
      if (fasc.length) {
        var u = fasc[fasc.length - 1];
        if (u.pagine.indexOf(n) < 0) u.pagine.push(n);
      }
    });
    fasc.forEach(function (f) { f.tipo = tipoFascicolo(f.piede); });

    return {
      ok: fasc.length > 0,
      motivo: fasc.length ? null
        : 'Nel documento non si riconosce nessun piè di pagina che si ripeta: non si può dividerlo in fascicoli, '
          + 'e quindi non si può dire da quale pezzo viene una garanzia.',
      fascicoli: fasc, orfane: orfane.filter(function (n) { return n != null; })
    };
  }

  /* Che pezzo è, letto dal suo stesso piè di pagina. Non si indovina dal
     contenuto: il piè di pagina lo dichiara, e quando non lo dichiara resta
     `null` invece di diventare «altro» per riempire la casella. */
  function tipoFascicolo(piede) {
    var t = pulisci(piede).toLowerCase();
    if (/dip\s*aggiuntivo/.test(t)) return 'dip_aggiuntivo';
    if (/\bdip\b/.test(t)) return 'dip';
    if (/condizioni\s+(di\s+)?assicurazion/.test(t)) return 'condizioni';
    if (/informativa|privacy|trattamento dei dati/.test(t)) return 'informativa';
    if (/allegato|card\b/.test(t)) return 'allegato';
    return null;
  }

  /* ── LE ZONE DOVE NON SI CERCANO GARANZIE ────────────────────────────────
     Il glossario DEFINISCE le garanzie, non le vende: una garanzia trovata
     là dentro sarebbe costituita da una definizione. Lo stesso vale per
     l'indice, per l'informativa privacy e per le pagine dei reclami. */
  var ZONE_CIECHE = /^(sommario|indice|glossario|informativa (sul trattamento|privacy)|reclami)/i;

  /* ── LE ETICHETTE DI TABELLA DEL DIP AGGIUNTIVO ──────────────────────────
     Non sono titoli di garanzia: sono le celle della tabella che descrive una
     garanzia. Il titolo del blocco è la riga che PRECEDE «Garanzie di base»
     e che non è essa stessa un'etichetta. */
  var ETICHETTE = [
    /^garanzie di base/i,
    /^ulteriori garanzie con un premio/i,
    /^limitazioni,?\s*esclusioni e rivalse/i,
    /^rischi esclusi/i,
    /^che cosa (non )?e' assicurato/i,
    /^ci sono limiti di copertura/i,
    /^dove vale la copertura/i,
    /^che obblighi ho/i
  ];
  function etichetta(l) {
    var t = pulisci(l).replace(/[àá]/gi, 'a').replace(/[èé]/gi, 'e');
    for (var i = 0; i < ETICHETTE.length; i++) if (ETICHETTE[i].test(t)) return true;
    return false;
  }

  /* Un titolo di garanzia avvolge su due o tre righe quando la compagnia ci
     infila le condizioni di abbinamento: «Cristalli (opzionale ma solo in
     abbinamento con le garanzie Eventi Naturali,» continua per altre due
     righe. Si ricongiunge in avanti fino alla parentesi chiusa — e non si
     pretende «(opzionale)», perché «RINUNCIA ALLA RIVALSA» non lo ha. */
  function titoloIntero(linee, i) {
    var t = pulisci(linee[i]);
    if (t.indexOf('(') >= 0 && t.indexOf(')') < 0) {
      for (var j = 1; j <= 2 && i + j < linee.length; j++) {
        t += ' ' + pulisci(linee[i + j]);
        if (t.indexOf(')') >= 0) break;
      }
    }
    return pulisci(t);
  }

  /* ── I TITOLI DI GARANZIA, CIOÈ LE COSTITUZIONI ──────────────────────────
     Tre forme, tutte misurate sul documento vero:
       «Assistenza stradale (opzionale)»          pag. 5
       «SEZIONE A - GARANZIA INCENDIO E FURTO»    pag. 31
       «RINUNCIA ALLA RIVALSA» sotto «OPZIONI CON PAGAMENTO DI UN PREMIO
       AGGIUNTIVO»                                pag. 5
     più le voci di un ELENCO di garanzie acquistabili («Puoi inoltre integrare
     la polizza con le seguenti ulteriori garanzie opzionali: …»), che è la
     forma in cui compaiono Cristalli, Eventi Naturali, Eventi Sociopolitici,
     Assistenza e Rinuncia alla rivalsa a pagina 2. */
  var R_SEZIONE = /^(sezione\s+[a-z0-9]+|art(icolo)?\.?\s*\d+)\s*[-–—:]?\s*(garanzi[ae]\s+)?(.+)$/i;
  var R_APRE_ELENCO = /(ulteriori garanzie opzionali|garanzie opzionali|opzioni con pagamento di un premio|puoi inoltre integrare)/i;
  /* «e Garanzia Guasti Cagionati dai ladri (o danneggiamenti)»: è un titolo,
     con davanti una lettera che l'estrazione si è portata dietro dalla riga
     precedente. È l'UNICA forma con cui questo prodotto costituisce i guasti
     cagionati dai ladri: senza riconoscerla, una garanzia che il prodotto
     vende a premio risultava non letta. */
  var R_GARANZIA_INLINE = /^(?:[a-z]\s+|[-–—·•]\s*)?garanzi[ae]\s+(.{3,70})$/i;

  /* Quanto è esatto il riconoscimento di questo titolo. Serve a scegliere fra
     due titoli che puntano alla stessa garanzia: «Kasko (opzionale)» è un
     nome esatto, «Collisione con veicoli identificati» prendeva il posto
     della kasko per via del sinonimo «collisione» contenuto dentro. Senza
     questa misura vinceva il primo che capitava, cioè la pagina più bassa. */
  function riconosce(C, ramo, nome) {
    var cand = (C.candidati(ramo, nome) || []).slice()
      .sort(function (a, b) { return a.da - b.da || b.lung - a.lung; });
    return cand.length ? { id: cand[0].id, esatto: cand[0].da === -1 } : null;
  }

  /* Il nome come lo chiama il documento, ripulito da quello che l'estrazione
     si è portata dietro: «alla garanzia R.C. Auto» non è il nome di niente. */
  var R_DAVANTI = /^(?:e|ed|o|la|il|le|lo|i|gli|un|una|alla|allo|alle|ai|agli|della|dello|delle|dei|degli|del|di|da|dal|a|al|per|con|in|su|nella|nel)\s+/i;
  function nomePulito(s) {
    /* Anche i due punti e il punto e virgola che l'estrazione lascia davanti:
       «: Incendio» non è il nome di niente. */
    var t = pulisci(s).replace(/^[-–—·•:;,.\s]+/, '');
    for (var g = 0; g < 4; g++) {
      var p = t.replace(R_DAVANTI, '');
      if (p === t) break;
      t = p;
    }
    t = t.replace(/^garanzi[ae]\s+/i, '').replace(/^[-–—·•:;,.\s]+/, '').trim();
    /* E l'etichetta che segue il nome: «Cristalli: franchigia € 300,00» è la
       franchigia dei cristalli, ma il nome che arriva è «Cristalli:
       franchigia», che il vocabolario non riconosce per intero — e un
       riconoscimento non esatto, per regola, non si fida. Togliendo
       l'etichetta il nome torna esatto e l'importo si attacca alla garanzia
       giusta, oppure si scarta per il motivo giusto. */
    return t.replace(/\s*[:\-–—]?\s*(franchigi[ae]|massimal[ei]|scopert[oi]|limite di indennizzo|somma assicurata|capitale)\s*$/i, '').trim();
  }

  /* Un elenco di garanzie acquistabili: «Puoi inoltre integrare la polizza con
     le seguenti ulteriori garanzie opzionali: Incendio; Furto; Guasti
     Accidentali (Kasko/Collisione); Garanzie Aggiuntive (Cristalli, Eventi
     Naturali, Eventi Sociopolitici, Assistenza, Rinuncia alla Rivalsa).»

     Si guardano quattro righe, perché sul documento vero l'elenco ne occupa
     quattro e l'ultimo nome — proprio la Rinuncia alla rivalsa — sta
     sull'ultima. E si spezza sui separatori: senza, il primo nome che si
     riconosce si prende tutta la riga e gli altri sei si perdono. */
  function leggiElenco(C, ramo, linee, i, riga, num, dentro) {
    var pezzo = pulisci(riga), ultima = i;
    for (var k = 1; k <= 4 && i + k < linee.length; k++) {
      var l = pulisci(linee[i + k]);
      /* L'elenco finisce dove comincia un'intestazione di tabella. */
      if (!l || etichetta(l)) break;
      pezzo += ' ' + l;
      ultima = i + k;
    }
    pezzo.split(/[,;()\.:]+/).forEach(function (voce) {
      var v = nomePulito(voce);
      if (!v || v.length < 4 || v.length > 70) return;
      var ric = riconosce(C, ramo, v);
      if (ric) {
        dentro.push({ garanzia: ric.id, titolo: v, esatto: ric.esatto,
          pagina: num, riga: pulisci(riga).slice(0, 220), forma: 'elenco' });
      }
    });
    return ultima;
  }

  function blocchi(pagine, ramo) {
    var C = motoreConfronto();
    var fuori = [], trovati = [];
    if (!C) return { blocchi: trovati, fuoriVocabolario: fuori };

    /* ── LA GARANZIA OBBLIGATORIA DEL RAMO LA COSTITUISCE IL TITOLO ────────
       Misurato: in questo documento la RCA non ha NESSUNA intestazione. Non
       è una dimenticanza della compagnia — la RCA *è* la polizza, e le
       sezioni servono per le opzionali. Il titolo però lo dice a lettere
       grandi: «ASSICURAZIONE R.C. AUTO (Autovetture) ed Altre Garanzie».
       Senza questa regola la garanzia obbligatoria di una polizza auto
       risultava «non letta», cioè lo strumento sembrava rotto proprio sulla
       riga che un cliente guarda per prima. */
    var obblig = (C.VOCABOLARIO[ramo] || []).filter(function (g) { return g.obbligatoria; });
    if (obblig.length) {
      (pagine || []).slice(0, 3).forEach(function (p) {
        var num0 = p && p.n != null ? p.n : null;
        testo(p && p.testo).split(/\r?\n/).forEach(function (l) {
          var t0 = pulisci(l);
          if (!t0 || t0.length > 160) return;
          if (!/assicurazione|polizza|prodotto\s*:/i.test(t0)) return;
          obblig.forEach(function (g) {
            if (trovati.some(function (x) { return x.garanzia === g.id && x.forma === 'titolo'; })) return;
            var r0 = riconosce(C, ramo, nomePulito(t0.split('(')[0]));
            if (r0 && r0.id === g.id) {
              trovati.push({ garanzia: g.id, titolo: g.nome, esatto: false,
                pagina: num0, riga: t0.slice(0, 220), forma: 'titolo' });
            }
          });
        });
      });
    }

    (pagine || []).forEach(function (p) {
      var num = p && p.n != null ? p.n : null;
      var linee = testo(p && p.testo).split(/\r?\n/);
      var cieca = false, finoA = -1;
      linee.forEach(function (l, i) {
        var t = pulisci(l);
        if (!t) return;
        if (ZONE_CIECHE.test(t)) { cieca = true; return; }
        if (cieca) return;              /* dal glossario in giù, su questa pagina, non si cerca */
        /* Le righe che un elenco si è già mangiato non si guardano di nuovo:
           altrimenti lo stesso elenco si legge una volta per ogni sua riga
           che contiene «garanzie opzionali», e «Garanzie Aggiuntive» diventa
           una copertura di nome «Aggiuntive». */
        if (i <= finoA) return;
        if (etichetta(t)) return;

        /* L'ELENCO SI GUARDA PRIMA DI TUTTO IL RESTO, e non è un dettaglio di
           ordine: la riga che apre l'elenco è «garanzie opzionali (i dettagli
           sono riportati nel DIP Aggiuntivo):», e la regola d) qui sotto —
           «Garanzia X» — la riconosceva come un titolo, si prendeva la riga e
           l'elenco non veniva mai letto. Risultato misurato: RINUNCIA ALLA
           RIVALSA, che il prodotto vende a premio, risultava non letta. */
        if (R_APRE_ELENCO.test(t)) { finoA = leggiElenco(C, ramo, linee, i, t, num, trovati); return; }

        /* La riga di continuazione di un titolo che avvolge non è un titolo
           suo: chiude una parentesi che non ha aperto. Senza questo controllo
           «Naturali, Incendio, Furto e Rapina)» diventava una copertura di
           nome «Rapina)». */
        if (t.indexOf(')') >= 0 && t.indexOf('(') < 0) return;

        var titolo = null, forma = null;

        /* a) il titolo che precede «Garanzie di base» */
        var dopo = linee[i + 1] ? pulisci(linee[i + 1]) : '';
        if (/^garanzie di base/i.test(dopo) && t.length < 140) { titolo = titoloIntero(linee, i); forma = 'blocco'; }

        /* b) «X (opzionale…)» per conto suo */
        if (!titolo && /\(opzional/i.test(t) && t.length < 200) { titolo = titoloIntero(linee, i); forma = 'blocco'; }

        /* c) «SEZIONE A - GARANZIA INCENDIO E FURTO».
           SOLO se l'intestazione dice «GARANZIA»: senza quel vincolo entrano
           tutti gli articoli delle condizioni generali, e sul documento vero
           «Oneri fiscali», «Foro competente» e «Reclami» finivano nell'elenco
           delle coperture che il vocabolario non conosce. Un elenco di 59 voci
           di cui 50 non sono garanzie non lo guarda nessuno. */
        if (!titolo) {
          var m = R_SEZIONE.exec(t);
          if (m && /garanzi[ae]/i.test(m[3] || '') && testo(m[4]).length > 2 && t.length < 160) {
            /* La parola «garanzia» torna dentro il titolo: in «ART. 34 –
               GARANZIA ESTESA» fa parte del nome, e togliendola restava
               «ESTESA», che nell'elenco delle coperture non riconosciute non
               dice niente a nessuno. Il riconoscimento la prova in tutt'e due
               i modi, più sotto. */
            titolo = pulisci(testo(m[3]) + ' ' + testo(m[4])); forma = 'sezione';
          }
        }

        /* d) «Garanzia X» scritta in linea, che è un titolo travestito.
           SOLO se X si riconosce ESATTAMENTE. La regola è nata per «e
           Garanzia Guasti Cagionati dai ladri (o danneggiamenti)», che è
           l'unico modo in cui questo prodotto costituisce quella garanzia;
           senza il vincolo dell'esattezza si prendeva anche «la garanzia
           furto e danni al bagaglio» e «Garanzie Aggiuntive», che sono prosa
           e un titolo d'elenco. */
        if (!titolo) {
          var mg = R_GARANZIA_INLINE.exec(t);
          /* La parentesi si toglie PRIMA di cercare: «Guasti Cagionati dai
             ladri (o danneggiamenti)» non è un nome esatto, «Guasti Cagionati
             dai ladri» sì — e quel «(o danneggiamenti)» è come la compagnia
             spiega la stessa cosa, non un pezzo del nome. */
          var nudoG = mg ? nomePulito(String(mg[1]).split('(')[0]) : '';
          var rg = nudoG ? riconosce(C, ramo, nudoG) : null;
          if (rg && rg.esatto) { titolo = nudoG; forma = 'garanzia'; }
        }

        if (!titolo) return;
        /* Il nome della garanzia dentro il titolo: il titolo porta anche le
           condizioni di abbinamento, e cercarlo tutto intero non si riconosce.
           Si prova prima intero, poi solo quello che sta davanti alla
           parentesi, che è il nome vero. */
        var nudo = nomePulito(titolo.split('(')[0]);
        var ric2 = riconosce(C, ramo, nudo) || riconosce(C, ramo, titolo);
        if (ric2) {
          trovati.push({ garanzia: ric2.id, titolo: nudo || titolo, esatto: ric2.esatto,
            pagina: num, riga: titolo.slice(0, 220), forma: forma });
        } else if (forma !== 'garanzia' && nudo.length >= 2 && nudo.length <= 70 && /[a-z]/i.test(nudo)) {
          /* Il nome da mostrare NON è quello ripulito: «GARANZIA ESTESA»
             ripulita diventa «ESTESA», e in un elenco di coperture che il
             vocabolario non conosce «ESTESA» non dice niente a nessuno.
             La soglia di lunghezza sta sul nome ripulito ma è bassa di
             proposito: «Garanzia GAP» ripulita è «GAP», tre lettere, e con
             una soglia di quattro una copertura venduta sparisce in silenzio
             — che è esattamente la cosa che questo elenco deve impedire. */
          var daMostrare = pulisci(titolo.split('(')[0]).replace(/^[-–—·•:;,.\s]+/, '') || nudo;
          /* Una copertura che il vocabolario non conosce. Si dichiara: senza,
             sparirebbe dal confronto senza che nessun campo risulti «non
             letto», cioè il prodotto risulterebbe più povero di quello che è.
             Sul documento vero sono GAP (Cash Back), MoneyBox, Ricorso terzi
             e la Rapina: quattro coperture vendute che il vocabolario a 17
             voci non ha. */
          /* La stessa copertura nominata in due fascicoli — la GAP sta nel DIP
             aggiuntivo e nelle Condizioni — è una copertura, non due. */
          var k2 = daMostrare.toLowerCase().replace(/^garanzi[ae]\s+/, '');
          if (!fuori.some(function (x) { return x.chiave === k2; })) {
            fuori.push({ chiave: k2, nome: daMostrare, pagina: num, riga: titolo.slice(0, 220), forma: forma });
          }
        }
      });
    });
    return { blocchi: trovati, fuoriVocabolario: fuori };
  }

  /* ── I NUMERI, E SOLO DOVE L'ANCORA È ESPLICITA ───────────────────────────
     Una tabella appiattita porta più importi sulla stessa riga con le
     etichette di colonna finite nella riga sopra: «Franchigia Franchigia
     Franchigia» e sotto «1.000,00 € 500,00 € 300,00 €». Quelle non sono tre
     massimali, sono tre franchigie per area. Si tengono come tali e il
     massimale resta non dichiarato. */
  function etichetteRipetute(riga) {
    var t = pulisci(riga).toLowerCase();
    var f = (t.match(/franchigi\w*/g) || []).length;
    var s = (t.match(/scopert\w*/g) || []).length;
    var a = /area\s*1[\s\S]*area\s*2/.test(t);
    if (a) return 'per area';
    if (f >= 2) return 'franchigia';
    if (s >= 2) return 'scoperto';
    return null;
  }

  /* Una frase che mette una condizione non dichiara il numero della garanzia:
     dichiara il numero di un caso particolare. Sul documento vero «La Società
     garantisce l'indennizzo dei danni da imbrattamento, SOLO NEL CASO DI atti
     vandalici con franchigia fissa di € 30,00» dava agli Eventi sociopolitici
     una franchigia di 30 €, mentre la loro franchigia vera è la tabella per
     area (1.000 / 500 / 300). Trenta euro al posto di mille, su un confronto
     mostrato a un cliente. */
  var R_CONDIZIONE = /\b(solo (nel caso|se|in caso|per)|soltanto|unicamente|limitatamente|qualora|salvo|purche|a condizione|nel caso di|in caso di|se richiamat|se espressamente)\b/i;
  function condizioneTrovata(t) {
    var m = R_CONDIZIONE.exec(pulisci(t));
    return m ? m[0] : 'condizione';
  }

  function numeriPerGaranzia(pagine, ramo, quali, pagineBuone, nonAttribuiti) {
    var G = motoreGuida(), C = motoreConfronto();
    var per = {};
    nonAttribuiti = nonAttribuiti || [];
    if (!G || !C) return per;

    (pagine || []).forEach(function (p) {
      var num = p && p.n != null ? p.n : null;
      /* Una pagina che non appartiene a nessun fascicolo riconosciuto non dà
         numeri: non si sa da quale pezzo del documento venga, e un massimale
         senza pezzo non si può far ritrovare a nessuno. Sul documento vero
         era da là che arrivava il «massimale di assistenza 200 €», che è il
         limite cumulativo di recupero e traino dell'allegato. */
      if (pagineBuone && num != null && pagineBuone.indexOf(num) < 0) return;
      var linee = testo(p && p.testo).split(/\r?\n/).map(function (l) { return senzaLegature(l); });
      linee.forEach(function (l, i) {
        var t = pulisci(l);
        if (!t) return;
        var letta = G.leggiRiga(t, [ramo]);
        if (!letta || !letta.voci || !letta.voci.length) return;

        /* L'ancora: il nome della garanzia deve stare NELLA STESSA RIGA, e
           riconoscersi per intero. Mai per vicinanza: sul documento vero la
           franchigia degli Eventi naturali è stampata dentro la Sezione
           Cristalli, e attribuirla «alla garanzia di questa sezione» la
           metterebbe sui cristalli. */
        var sopra = i > 0 ? pulisci(linee[i - 1]) : '';
        var ric = riconosce(C, ramo, nomePulito(letta.nome));
        var ancora = ric && ric.esatto ? ric.id : null;
        var tab = etichetteRipetute(sopra);
        if (!ancora && tab) {
          /* L'unico caso in cui si guarda fuori dalla riga è la TABELLA
             APPIATTITA, e si riconosce perché la riga sopra ripete
             un'etichetta di colonna: «Franchigia Franchigia Franchigia». Là
             il nome è davvero spezzato su più righe del foglio — «Guasti» /
             «cagionati 2.000,00 €…» / «dai ladri» — e non è vicinanza: è la
             stessa riga stampata.
             Fuori da quel caso, guardare sopra attribuiva gli importi della
             prosa alla garanzia nominata qualche riga prima. */
          var L = motoreLettura();
          var sotto = i + 1 < linee.length ? pulisci(linee[i + 1]) : '';
          if (L && L.ricuci) {
            var r2 = L.ricuci(letta.nome, sopra, sotto, [ramo]);
            if (r2 && r2.id) ancora = r2.id;
          }
        }
        if (!ancora) {
          /* ── GLI IMPORTI CHE NON SI ATTRIBUISCONO SI DICHIARANO ──────────
             Misurato il 02/10/2026 su quel documento, con 128 letture
             indipendenti: gli importi veri sono 119, e quasi tutti
             appartengono a un SOTTOCASO — il massimale di legge della RCA,
             lo scoperto dei cristalli, la rivalsa limitata, la franchigia
             del furto per area e per antifurto. Nessuno di quei numeri è «il
             massimale della garanzia», e attribuirne uno sarebbe inventare.

             Buttarli in silenzio però fa credere che il documento non li
             porti. Si elencano, con la pagina, così chi archivia sa che
             esistono e dove guardare: è la differenza fra «non lo so» e
             «non c'è». */
          nonAttribuiti.push({ pagina: num, riga: t.slice(0, 220),
            importi: letta.voci.map(function (v) { return v.valore; }) });
          return;
        }
        if (quali && quali.indexOf(ancora) < 0) return;   /* garanzia non costituita: niente numeri */

        var tabella = tab || (letta.voci.length > 2 ? 'per area' : null);
        var voce = per[ancora] || (per[ancora] = { massimale: null, franchigia: null, scoperto: null,
          perArea: null, pagina: num, frase: t.slice(0, 220), daGuardare: null });

        /* La frase mette una condizione: il numero è di un caso particolare,
           non della garanzia. Si tiene la frase e si fa guardare, invece di
           archiviare trenta euro al posto di mille. */
        if (!tabella && R_CONDIZIONE.test(t)) {
          if (!voce.daGuardare) {
            voce.daGuardare = 'l\'importo sta in una frase condizionata («' + condizioneTrovata(t)
              + '»): è il numero di un caso particolare, non della garanzia';
            if (voce.pagina == null) { voce.pagina = num; voce.frase = t.slice(0, 220); }
          }
          return;
        }

        if (tabella) {
          /* Più importi e un'etichetta ripetuta: è una tabella. Si tiene come
             elenco e NON si sceglie un massimale, perché scegliere il primo
             numero di una tabella di franchigie è il modo più credibile di
             scrivere un massimale falso. */
          if (!voce.perArea) {
            voce.perArea = letta.voci.map(function (v) { return v.valore; });
            voce.pagina = num; voce.frase = t.slice(0, 220);
            voce.daGuardare = 'la riga porta ' + letta.voci.length + ' importi e l\'intestazione sopra ripete «'
              + tabella + '»: sul documento è una tabella, e qui è diventata una riga sola';
          }
          return;
        }
        if (letta.voci.length === 1) {
          var v1 = letta.voci[0].valore;
          var sottoNorm = pulisci(sopra + ' ' + t).toLowerCase();
          if (/franchigia/.test(sottoNorm) && voce.franchigia == null) voce.franchigia = v1;
          else if (/scoperto/.test(sottoNorm) && voce.scoperto == null) voce.scoperto = null; /* lo scoperto è in %, non in euro */
          else if (/massimal|somma assicurata|limite di indennizzo|capitale/.test(sottoNorm) && voce.massimale == null) voce.massimale = v1;
          else if (voce.massimale == null && voce.franchigia == null) {
            /* Un importo senza etichetta non diventa un massimale: si tiene la
               frase e si fa guardare. */
            voce.daGuardare = 'l\'importo non porta un\'etichetta («massimale», «franchigia»): va letto sul documento';
          }
          if (voce.pagina == null) { voce.pagina = num; voce.frase = t.slice(0, 220); }
        }
      });
    });
    return per;
  }

  /* ── L'EDIZIONE: UN ELENCO, MAI UN VALORE SOLO ───────────────────────────
     Sul documento vero ci sono quattro stringhe diverse — «Edizione 06/2020»,
     «Data: 06/2020», «Rev. 2020/05» — e «06/2020» è mese/anno mentre
     «2020/05» è anno/mese, cioè due mesi diversi. Normalizzarle in una data
     vorrebbe dire inventare quale delle due si intende. Si conservano tutte,
     con la pagina, e si mostra quella del pezzo che si sta citando. */
  var R_EDIZIONE = /\b(edizione|ediz\.|ed\.|data|rev\.|revisione|mod\.)\s*:?\s*([0-9]{1,4}\s*[\/\-\.]\s*[0-9]{1,4})/gi;

  function edizioni(pagine) {
    var fuori = [];
    (pagine || []).forEach(function (p) {
      var num = p && p.n != null ? p.n : null;
      var t = senzaLegature(testo(p && p.testo));
      var m;
      R_EDIZIONE.lastIndex = 0;
      while ((m = R_EDIZIONE.exec(t))) {
        var val = m[2].replace(/\s+/g, '');
        var et = m[1].toLowerCase().replace(/[:.]$/, '');
        /* Il confronto si fa sull'etichetta GIÀ ripulita: confrontando «rev.»
           con «rev» non coincidevano mai e «Rev. 2020/05», stampata su sei
           pagine dell'allegato, compariva sei volte. */
        var gia = fuori.some(function (x) { return x.valore === val && x.etichetta === et; });
        if (!gia) fuori.push({ etichetta: et, valore: val, pagina: num });
      }
    });
    return fuori;
  }

  /* ── IL RAMO ──────────────────────────────────────────────────────────────
     Si legge dalle prime pagine, dove la compagnia lo scrive grande. Non si
     indovina dal conteggio delle garanzie riconosciute: quel conteggio
     dipende dal vocabolario, e un documento casa con dentro «infortuni»
     finirebbe nel ramo sbagliato. */
  /* NIENTE `\b` IN CODA. Queste sono RADICI, non parole: «autovettur\b» non
     combacia con «Autovetture», perché dopo la radice c'è una lettera e non un
     confine di parola. Scritte col confine in coda, le radici non trovavano
     mai niente e il ramo si leggeva per caso — sul documento vero lo salvava
     solo «targa», che per sua fortuna è una parola intera.
     Il confine davanti invece serve, e resta: senza, «auto» si troverebbe
     dentro «autorizzazione» e «automatico». */
  var SPIE_RAMO = [
    ['auto', /\b(?:r\.?c\.?\s*auto|r\.?c\.?a\.?\b|auto\b|autovettur|autocarr|motociclo|veicol|targa|circolazione dei veicoli)/i],
    ['casa', /\b(?:abitazion|fabbricat|casa e famiglia|capofamiglia|immobil|dimora)/i],
    ['salute', /\b(?:infortun|malatti|ricover|spese mediche|diaria|invalidit)/i],
    ['vita', /\b(?:caso morte|tcm\b|temporanea caso morte|capitale rivalutabil|previdenz|premorienz)/i],
    ['azienda', /\b(?:r\.?c\.?t\.?\b|r\.?c\.?o\.?\b|responsabilit[àa] civile verso terzi|aziend|impres|professionist)/i]
  ];
  function ramoProposto(pagine) {
    var t = '';
    (pagine || []).slice(0, 3).forEach(function (p) { t += ' ' + senzaLegature(testo(p && p.testo)); });
    t = pulisci(t);
    var punti = {};
    SPIE_RAMO.forEach(function (s) {
      var m = t.match(new RegExp(s[1].source, 'gi'));
      if (m) punti[s[0]] = m.length;
    });
    var chiavi = Object.keys(punti);
    if (!chiavi.length) return { ramo: null, perche: 'nelle prime pagine non si trova nessuna spia del ramo' };
    chiavi.sort(function (a, b) { return punti[b] - punti[a]; });
    /* A parità non si sceglie: si dichiara che non si sa. */
    if (chiavi.length > 1 && punti[chiavi[0]] === punti[chiavi[1]]) {
      return { ramo: null, perche: 'le prime pagine nominano ' + chiavi.slice(0, 2).join(' e ') + ' nella stessa misura' };
    }
    return { ramo: chiavi[0], perche: null };
  }

  /* ── LA SCHEDA DA ARCHIVIARE ─────────────────────────────────────────────
     Torna una riga per OGNI garanzia del ramo: quelle costituite con
     'presente', tutte le altre con 'non_letto'. Nessuna con 'assente' — e il
     perché sta in cima a questo file. */
  function scheda(pagine, opz) {
    opz = opz || {};
    var C = motoreConfronto(), G = motoreGuida();
    if (!C) return { ok: false, motivo: 'Il vocabolario delle garanzie non è caricato: senza, non si riconosce niente.' };
    if (!G) return { ok: false, motivo: 'Il motore della guida non è caricato: senza, una riga con un importo non si sa leggere.' };
    if (!(pagine || []).length) return { ok: false, motivo: 'Il documento è vuoto: non c\'è niente da leggere.' };

    var prop = ramoProposto(pagine);
    var ramo = testo(opz.ramo).toLowerCase() || prop.ramo;
    if (!ramo || !C.VOCABOLARIO[ramo]) {
      return { ok: false, ramoProposto: prop.ramo,
        motivo: 'Non si capisce di che ramo è questo documento'
          + (prop.perche ? ' (' + prop.perche + ')' : '') + ': scegli il ramo e riprova.' };
    }

    var f = fascicoli(pagine);
    var b = blocchi(pagine, ramo);

    /* Fra due costituzioni della stessa garanzia vince, in quest'ordine:
       1. il riconoscimento ESATTO su quello approssimato — «Kasko
          (opzionale)» batte «Collisione con veicoli identificati», che
          altrimenti si prendeva il posto della kasko per via del sinonimo
          «collisione» contenuto dentro;
       2. un titolo di blocco o di sezione su una voce d'elenco;
       3. la pagina più bassa, a parità, perché il documento descrive prima e
          liquida dopo: il titolo che apre la garanzia vale più di
          un'intestazione dell'articolo che ne regola l'indennizzo. */
    var PESO = { blocco: 3, sezione: 3, garanzia: 2, elenco: 1 };
    function meglio(a, b2) {
      if (!a) return true;
      if (!!b2.esatto !== !!a.esatto) return !!b2.esatto;
      var pa = PESO[a.forma] || 0, pb = PESO[b2.forma] || 0;
      if (pb !== pa) return pb > pa;
      return (b2.pagina || 1e9) < (a.pagina || 1e9);
    }
    var costituite = {};
    b.blocchi.forEach(function (x) {
      if (meglio(costituite[x.garanzia], x)) costituite[x.garanzia] = x;
    });
    var quali = Object.keys(costituite);
    var pagineBuone = [];
    f.fascicoli.forEach(function (x) {
      (x.proprie || []).forEach(function (n) { if (pagineBuone.indexOf(n) < 0) pagineBuone.push(n); });
    });
    var nonAttribuiti = [];
    var num = numeriPerGaranzia(pagine, ramo, quali, pagineBuone, nonAttribuiti);

    var garanzie = C.VOCABOLARIO[ramo].map(function (g) {
      var c = costituite[g.id], n = num[g.id] || {};
      if (!c) {
        return { garanzia: g.id, nome: g.nome, nome_documento: null, stato: 'non_letto',
          massimale: null, franchigia: null, scoperto: null, franchigie_per_area: null,
          pagina: null, frase: null,
          perche: 'il documento non la nomina in nessuna intestazione né in nessun elenco di garanzie' };
      }
      return {
        garanzia: g.id, nome: g.nome, nome_documento: c.titolo, stato: 'presente',
        massimale: n.massimale == null ? null : n.massimale,
        franchigia: n.franchigia == null ? null : n.franchigia,
        scoperto: n.scoperto == null ? null : n.scoperto,
        franchigie_per_area: n.perArea || null,
        pagina: n.pagina != null ? n.pagina : c.pagina,
        frase: n.frase || c.riga,
        forma: c.forma,
        daGuardare: n.daGuardare || null,
        perche: null
      };
    });

    var conta = { presente: 0, assente: 0, non_letto: 0 };
    garanzie.forEach(function (x) { conta[x.stato]++; });

    /* ── LE AVVERTENZE ────────────────────────────────────────────────────
       Non sono decorazione: ognuna nasce da una cosa trovata sul documento
       vero che, taciuta, farebbe credere al confronto più di quello che sa. */
    var avv = [];
    if (f.orfane.length) {
      avv.push('Pagine che non appartengono a nessun fascicolo riconosciuto: '
        + f.orfane.join(', ') + '. Quello che c\'è scritto là dentro non è stato attribuito a nessun pezzo del documento.');
    }
    if (!f.ok) avv.push(f.motivo);
    if (b.fuoriVocabolario.length) {
      avv.push(b.fuoriVocabolario.length + ' coperture hanno un nome che il vocabolario non conosce ('
        + b.fuoriVocabolario.slice(0, 4).map(function (x) { return x.nome; }).join(', ')
        + (b.fuoriVocabolario.length > 4 ? '…' : '') + '): nel confronto non compariranno.');
    }
    var ed = edizioni(pagine);
    var valori = ed.map(function (x) { return x.valore; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (valori.length > 1) {
      avv.push('Il documento porta più di un\'edizione (' + valori.join(', ')
        + '): scegli quella del pezzo da cui vengono le garanzie, invece di lasciarne indovinare una.');
    }
    if (!ed.length) avv.push('Nel documento non si trova nessuna edizione: scrivila a mano come sta sul PDF.');
    /* Il DIP dichiara di sé di essere una sintesi. È il documento stesso a
       dire di non essere esaustivo, e un «presente» che ne viene non è una
       prova di che cosa c'è in polizza. */
    var sintesi = (pagine || []).slice(0, 4).some(function (p) {
      return /sintesi delle principali (coperture|garanzie)/i.test(senzaLegature(testo(p && p.testo)));
    });
    if (sintesi) {
      avv.push('Il documento dichiara di sé di essere «una sintesi delle principali coperture ed esclusioni»: '
        + 'quello che non c\'è scritto non è detto che non ci sia, e va cercato nella scheda di polizza.');
    }
    /* UNA TABELLA, UNA GARANZIA. Sul documento vero le franchigie per area
       degli Eventi naturali e degli Eventi sociopolitici sono gli stessi tre
       numeri — 1.000 / 500 / 300 — e stanno a due pagine diverse. Se il
       programma attribuisse la stessa riga a tutt'e due, nessuno potrebbe
       accorgersene dai numeri: sono identici. Si controlla sulla riga. */
    var viste = {};
    garanzie.forEach(function (x) {
      if (!x.franchigie_per_area || x.pagina == null) return;
      var k = x.pagina + '§' + (x.frase || '');
      if (viste[k]) {
        avv.push('La stessa riga di tabella (pagina ' + x.pagina + ') è stata attribuita a due garanzie, '
          + viste[k] + ' e ' + x.garanzia + ': una delle due ha dei numeri che non sono suoi.');
      } else viste[k] = x.garanzia;
    });

    if (nonAttribuiti.length) {
      avv.push(nonAttribuiti.length + ' importi del documento non sono stati attribuiti a nessuna garanzia: '
        + 'quasi sempre sono numeri di un sottocaso — il massimale di legge, uno scoperto, una rivalsa '
        + 'limitata, una franchigia per area. Sono elencati con la loro pagina: non sono stati buttati, '
        + 'sono stati lasciati a chi archivia.');
    }

    avv.push('Nessuna garanzia è stata segnata «assente»: questo motore non lo fa mai. '
      + 'Si segna a mano, con la frase del documento che lo dice.');

    return {
      ok: true, motivo: null,
      ramo: ramo, ramoDaOpzione: !!testo(opz.ramo),
      fascicoli: f.fascicoli.map(function (x) {
        return { tipo: x.tipo, piede: x.piede, da: x.da, a: x.a, pagine: x.pagine.length };
      }),
      orfane: f.orfane,
      tipo: tipoDocumento(f.fascicoli),
      edizioni: ed,
      garanzie: garanzie, conta: conta,
      fuoriVocabolario: b.fuoriVocabolario,
      /* L'elenco si taglia a 40 righe ma il CONTO resta intero: un elenco
         lungo nessuno lo legge, un conto nascosto fa credere che non ci sia
         niente. */
      importiNonAttribuiti: nonAttribuiti.slice(0, 40),
      quantiNonAttribuiti: nonAttribuiti.length,
      pagine: (pagine || []).length,
      avvertenze: avv
    };
  }

  /* Che cosa è il documento nel suo insieme: se porta più di un fascicolo è un
     set informativo, se ne porta uno solo è quel fascicolo. */
  function tipoDocumento(fasc) {
    var tipi = (fasc || []).map(function (f) { return f.tipo; }).filter(Boolean);
    var unici = tipi.filter(function (t, i, a) { return a.indexOf(t) === i; });
    if (unici.length > 1) return 'set_informativo';
    if (unici.length === 1) return unici[0];
    return 'altro';
  }

  /* Le righe nella forma che vogliono le tre tabelle dell'archivio. Non scrive
     niente: prepara. Chi scrive è la schermata, dopo che una persona ha
     confermato. */
  function daArchiviare(s, scelte) {
    if (!s || !s.ok) return { ok: false, motivo: (s && s.motivo) || 'Non c\'è nessuna scheda da archiviare.' };
    var dentro = scelte && scelte.length
      ? s.garanzie.filter(function (g) { return scelte.indexOf(g.garanzia) >= 0; })
      : s.garanzie;
    return {
      ok: true,
      garanzie: dentro.map(function (g) {
        var nonLetto = g.stato === 'non_letto';
        return {
          garanzia: g.garanzia,
          nome_documento: g.nome_documento || null,
          stato: g.stato,
          /* Il vincolo del database dice che una garanzia «non letta» non può
             portare numeri. Qui si rispetta prima di scrivere, invece di
             scoprirlo da un errore di Postgres. */
          massimale: nonLetto ? null : g.massimale,
          franchigia: nonLetto ? null : g.franchigia,
          scoperto: nonLetto ? null : g.scoperto,
          pagina: g.pagina == null ? null : g.pagina,
          frase: g.frase || (nonLetto ? g.perche : null)
        };
      })
    };
  }

  var API = { VERSIONE: VERSIONE, fascicoli: fascicoli, blocchi: blocchi, edizioni: edizioni,
    ramoProposto: ramoProposto, scheda: scheda, daArchiviare: daArchiviare,
    senzaLegature: senzaLegature, tipoFascicolo: tipoFascicolo };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.SchedaProdotto = API;
})();
