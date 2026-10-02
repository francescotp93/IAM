/* ═══════════════════════════════════════════════════════════════════════════════
   CONFRONTA — MESSA A CONFRONTO DI DUE PRODOTTI        (01/10/2026, brief M6)

   Richiesta di Francesco: «una parte dove possiamo confrontare le polizze […]
   se seleziono HDI auto e metto polizza Italiana auto, da lì mi fa un rating
   per garanzia sul prodotto che stiamo scegliendo». E il perché, che è la cosa
   importante: «per poter battere la concorrenza ci possiamo battere solamente
   su dati reali».

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 1 — PERCHÉ SI PUÒ FARE: I DOCUMENTI SONO UN MODULO, NON UN TEMA LIBERO.   │
   └───────────────────────────────────────────────────────────────────────────┘
   Il DIP danni ha una forma imposta dal Regolamento UE 2017/1469, e il DIP
   aggiuntivo dal Regolamento IVASS 41/2018. Ogni compagnia che vende in Italia
   scrive le STESSE quattro domande, con le stesse parole:

       «Che tipo di assicurazione è?»
       «Che cosa è assicurato?»
       «Che cosa non è assicurato?»
       «Ci sono limiti di copertura?»

   Verificato il 01/10/2026 su un set informativo auto vero (61 pagine): ci
   sono tutte e quattro, alla lettera. È questo che rende il confronto una cosa
   che si legge, invece di una cosa che si indovina.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 2 — TRE STATI, NON DUE. È LA REGOLA CHE TIENE ONESTO IL CONFRONTO.        │
   └───────────────────────────────────────────────────────────────────────────┘
   Una garanzia, su un prodotto, può stare in tre modi:

       `presente`      il documento dice che c'è
       `assente`       il documento dice che NON c'è
       `non_letto`     il documento non lo dice, o non siamo riusciti a leggerlo

   Chi schiaccia il terzo stato sul secondo costruisce una macchina che dà
   torto alla concorrenza ogni volta che il suo documento è scritto male. È lo
   stesso errore di `garanzie.js` sul numero: «non dichiarato» e «zero» sono
   due risposte diverse, e confonderle su una franchigia vuol dire dire a un
   cliente che non ne ha una.

   Qui costa di più: un confronto sbagliato mostrato a un cliente è un problema
   di adeguatezza (Reg. IVASS 40 e 41), non un numero storto in una tabella.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 3 — IL PUNTEGGIO NON CONTA QUELLO CHE NON HA LETTO.                       │
   └───────────────────────────────────────────────────────────────────────────┘
   `punteggio()` dice sempre su quante garanzie si è pronunciato e su quante
   no: «14 su 19, 5 non si sono potute leggere». Un punteggio che divide per
   tutte e diciannove fingerebbe di aver letto cinque documenti che non ha
   letto, e sarebbe più convincente proprio dove è più ignorante.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 4 — OGNI VALORE SI PORTA DIETRO DA DOVE VIENE.                            │
   └───────────────────────────────────────────────────────────────────────────┘
   Ogni riga del confronto porta `fonte`: quale documento, quale edizione,
   quale pagina, e la frase testuale. Senza, il confronto è la parola di un
   programma contro quella di un contratto — e davanti a un cliente che chiede
   «dove c'è scritto?» non si può rispondere «lo dice il sistema».
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'confronto-2026-10-02';

  function testo(v) { return v == null ? '' : String(v).trim(); }
  function chiave(v) {
    return testo(v).toLowerCase()
      .replace(/[’']/g, '\'')
      .replace(/\s+/g, ' ')
      .replace(/[.,;:()]/g, '')
      .trim();
  }

  /* ── I RAMI ───────────────────────────────────────────────────────────────
     Gli stessi di `crm-analisi.js` più quelli che servono a un'agenzia
     plurimandataria. Un secondo vocabolario dei rami vorrebbe dire che una
     polizza casa si chiama in due modi a seconda della schermata. */
  var RAMI = [
    { id: 'auto',    nome: 'Auto e veicoli' },
    { id: 'casa',    nome: 'Casa e famiglia' },
    { id: 'azienda', nome: 'Azienda e professione' },
    { id: 'salute',  nome: 'Salute e infortuni' },
    { id: 'vita',    nome: 'Vita e previdenza' }
  ];

  /* ── IL VOCABOLARIO DELLE GARANZIE ────────────────────────────────────────
     La spina dorsale di tutto. Senza un nome solo per la stessa garanzia, due
     prodotti non si confrontano: si affiancano.

     I nomi canonici dell'auto NON sono inventati — sono i 19 codici veri
     contati sull'archivio il 28/09/2026 (`garanzie.js`), più i nomi che le
     compagnie usano nei DIP. I sinonimi sono quelli visti nei documenti, non
     quelli che uno immagina: «Guasti Accidentali (Kasko/Collisione)» sta
     scritto così in un set informativo vero.

     Una garanzia che non sta qui non si butta via: esce come `fuori
     vocabolario` e si vede, perché una garanzia che sparisce dal confronto è
     esattamente il modo di far vincere il prodotto che ce l'ha. */
  var VOCABOLARIO = {
    auto: [
      { id: 'rca', nome: 'Responsabilità civile auto', obbligatoria: true,
        sin: ['rca', 'rc auto', 'responsabilita civile auto', 'responsabilita civile autoveicoli',
              'rc autoveicoli', 'responsabilita civile derivante dalla circolazione'] },
      { id: 'infortuni_conducente', nome: 'Infortuni del conducente',
        sin: ['infortuni conducente', 'infortuni del conducente', 'conducente',
              'infortuni al conducente', 'tutela del conducente'] },
      { id: 'assistenza', nome: 'Assistenza stradale',
        sin: ['assistenza stradale', 'assistenza', 'soccorso stradale', 'traino'] },
      { id: 'tutela_legale', nome: 'Tutela legale',
        sin: ['tutela legale', 'tutela legale della circolazione', 'difesa legale'] },
      { id: 'furto', nome: 'Furto',
        sin: ['furto', 'furto e rapina', 'furto totale', 'furto parziale'] },
      { id: 'incendio', nome: 'Incendio',
        sin: ['incendio', 'incendio e scoppio'] },
      { id: 'furto_incendio', nome: 'Furto e incendio',
        sin: ['furto e incendio', 'furto incendio', 'incendio e furto'] },
      { id: 'kasko', nome: 'Kasko / collisione',
        sin: ['kasko', 'collisione', 'guasti accidentali', 'guasti accidentali kasko/collisione',
              'danni accidentali', 'mini kasko', 'kasko collisione'] },
      { id: 'cristalli', nome: 'Cristalli',
        sin: ['cristalli', 'rottura cristalli', 'rottura dei cristalli'] },
      { id: 'eventi_naturali', nome: 'Eventi naturali',
        sin: ['eventi naturali', 'eventi atmosferici', 'fenomeni naturali', 'grandine'] },
      { id: 'eventi_sociopolitici', nome: 'Eventi sociopolitici e atti vandalici',
        sin: ['eventi sociopolitici', 'atti vandalici', 'eventi sociopolitici e atti vandalici',
              'scioperi tumulti e atti vandalici'] },
      { id: 'rinuncia_rivalsa', nome: 'Rinuncia alla rivalsa',
        sin: ['rinuncia alla rivalsa', 'rinuncia rivalsa', 'esonero rivalsa'] },
      { id: 'bonus_protetto', nome: 'Bonus protetto',
        sin: ['bonus protetto', 'protezione bonus', 'tutela bonus'] },
      { id: 'collisione_non_assicurati', nome: 'Collisione con veicoli non assicurati',
        sin: ['collisione con veicoli non assicurati', 'veicoli non assicurati',
              'danni da veicoli non identificati'] },
      { id: 'collisione_animali', nome: 'Collisione con animali selvatici',
        sin: ['collisione con animali selvatici', 'urto con animali', 'animali selvatici'] }
    ],
    casa: [
      { id: 'incendio_fabbricato', nome: 'Incendio del fabbricato',
        sin: ['incendio fabbricato', 'incendio del fabbricato', 'incendio immobile'] },
      { id: 'incendio_contenuto', nome: 'Incendio del contenuto',
        sin: ['incendio contenuto', 'incendio del contenuto', 'contenuto'] },
      { id: 'furto_casa', nome: 'Furto e rapina',
        sin: ['furto', 'furto e rapina', 'furto in abitazione', 'scippo'] },
      { id: 'danni_acqua', nome: 'Danni da acqua',
        sin: ['danni da acqua', 'acqua condotta', 'spargimento d\'acqua', 'ricerca del guasto',
              'ricerca e riparazione del danno d\'acqua', 'ricerca e riparazione',
              'danno d\'acqua', 'rottura tubazioni'] },
      { id: 'eventi_atmosferici', nome: 'Eventi atmosferici',
        sin: ['eventi atmosferici', 'eventi naturali', 'grandine', 'vento'] },
      { id: 'rc_capofamiglia', nome: 'RC del capofamiglia',
        sin: ['rc capofamiglia', 'rc capo famiglia', 'responsabilita civile del capofamiglia',
              'rc della vita privata', 'responsabilita civile vita privata'] },
      /* La RC dell'ABITAZIONE è un'altra cosa dalla RC del capofamiglia: la
         prima risponde del fabbricato (l'intonaco che cade), la seconda della
         vita privata di chi ci abita (il figlio in bicicletta). I prospetti le
         portano tutt'e due, con due massimali, e confonderle vorrebbe dire
         contarne una sola. (02/10/2026, dal preventivo n.4 vero.) */
      { id: 'rc_abitazione', nome: 'RC dell\'abitazione',
        sin: ['rc abitazione', 'responsabilita civile abitazione',
              'responsabilita civile del fabbricato', 'rc fabbricato', 'rc proprieta'] },
      { id: 'tutela_legale_casa', nome: 'Tutela legale',
        sin: ['tutela legale', 'difesa legale'] },
      { id: 'assistenza_casa', nome: 'Assistenza domestica',
        sin: ['assistenza', 'assistenza domestica', 'pronto intervento'] },
      { id: 'cristalli_casa', nome: 'Cristalli',
        sin: ['cristalli', 'rottura cristalli', 'lastre'] },
      { id: 'fenomeno_elettrico', nome: 'Fenomeno elettrico',
        sin: ['fenomeno elettrico', 'danni elettrici', 'corto circuito'] }
    ],
    azienda: [
      { id: 'incendio_azienda', nome: 'Incendio',
        sin: ['incendio', 'incendio e rischi accessori'] },
      { id: 'furto_azienda', nome: 'Furto',
        sin: ['furto', 'furto e rapina'] },
      { id: 'rct', nome: 'RC verso terzi (RCT)',
        sin: ['rct', 'rc verso terzi', 'responsabilita civile verso terzi'] },
      { id: 'rco', nome: 'RC verso prestatori d\'opera (RCO)',
        sin: ['rco', 'rc verso prestatori d\'opera', 'responsabilita civile verso prestatori di lavoro'] },
      { id: 'rc_prodotti', nome: 'RC prodotti',
        sin: ['rc prodotti', 'responsabilita civile prodotti'] },
      { id: 'danni_elettrici', nome: 'Danni elettrici',
        sin: ['danni elettrici', 'fenomeno elettrico'] },
      { id: 'perdite_pecuniarie', nome: 'Perdite pecuniarie',
        sin: ['perdite pecuniarie', 'danni indiretti', 'perdita di profitto'] },
      { id: 'tutela_legale_azienda', nome: 'Tutela legale',
        sin: ['tutela legale', 'difesa legale'] },
      { id: 'cyber', nome: 'Rischi informatici (cyber)',
        sin: ['cyber', 'rischi informatici', 'cyber risk'] }
    ],
    salute: [
      { id: 'infortuni', nome: 'Infortuni',
        sin: ['infortuni', 'invalidita permanente da infortunio', 'morte da infortunio'] },
      { id: 'malattia', nome: 'Malattia',
        sin: ['malattia', 'invalidita permanente da malattia'] },
      { id: 'ricovero', nome: 'Ricovero e intervento chirurgico',
        sin: ['ricovero', 'intervento chirurgico', 'grandi interventi chirurgici'] },
      { id: 'diaria', nome: 'Diaria da ricovero',
        sin: ['diaria', 'diaria da ricovero', 'diaria giornaliera da ricovero',
              'diaria giornaliera da ricovero e post ricovero', 'indennita giornaliera'] },
      { id: 'diaria_gessatura', nome: 'Diaria da gessatura',
        sin: ['diaria da gessatura', 'diaria giornaliera da gessatura', 'gessatura',
              'indennita da gessatura'] },
      { id: 'spese_mediche', nome: 'Rimborso spese mediche da infortunio',
        sin: ['spese mediche', 'rimborso spese mediche', 'rimborso spese mediche da infortunio',
              'spese mediche da infortunio', 'spese di cura'] },
      { id: 'visite_specialistiche', nome: 'Visite specialistiche e accertamenti',
        sin: ['visite specialistiche', 'accertamenti diagnostici', 'alta diagnostica'] },
      { id: 'gravi_malattie', nome: 'Gravi malattie',
        sin: ['gravi malattie', 'malattie gravi', 'dread disease'] }
    ],
    vita: [
      { id: 'caso_morte', nome: 'Caso morte',
        sin: ['caso morte', 'temporanea caso morte', 'tcm'] },
      /* «Copertura vita» da sola NON dice che tipo di contratto sia: puo'
         essere una temporanea caso morte, una mista, un capitale rivalutabile.
         Ha un identificativo suo apposta — scriverla come `caso_morte`
         vorrebbe dire stampare a un cliente l'esempio di una TCM sopra un
         contratto che magari e' un'altra cosa. (02/10/2026, dal preventivo
         n.4: «Copertura Vita - TAMMARO VINCENZO 250.000 € (durata 20 anni)».) */
      { id: 'vita_generica', nome: 'Copertura vita',
        sin: ['copertura vita', 'protezione vita', 'assicurazione vita', 'polizza vita'] },
      { id: 'invalidita', nome: 'Invalidità permanente',
        sin: ['invalidita permanente', 'invalidita totale permanente'] },
      { id: 'rendita', nome: 'Rendita',
        sin: ['rendita', 'rendita vitalizia'] },
      { id: 'capitale_rivalutabile', nome: 'Capitale rivalutabile',
        sin: ['capitale rivalutabile', 'gestione separata'] }
    ]
  };

  /* Le quattro domande del DIP, alla lettera come le impone il regolamento.
     Si cercano senza accenti e senza maiuscole, perché le compagnie le
     impaginano in modi diversi, ma le PAROLE sono quelle. */
  var SEZIONI = [
    { id: 'tipo',          domanda: 'Che tipo di assicurazione è?' },
    { id: 'assicurato',    domanda: 'Che cosa è assicurato?' },
    { id: 'non_assicurato', domanda: 'Che cosa non è assicurato?' },
    { id: 'limiti',        domanda: 'Ci sono limiti di copertura?' }
  ];

  function senzaAccenti(s) {
    return testo(s)
      .replace(/[àáâä]/gi, 'a').replace(/[èéêë]/gi, 'e').replace(/[ìíîï]/gi, 'i')
      .replace(/[òóôö]/gi, 'o').replace(/[ùúûü]/gi, 'u');
  }

  /* ── NORMALIZZARE UN NOME DI GARANZIA ─────────────────────────────────────
     Da «Guasti Accidentali (Kasko/Collisione)» a `kasko`. Torna `null` quando
     non si riconosce: e `null` NON vuol dire «non c'è», vuol dire «non so come
     si chiama da noi». Chi lo tratta come assenza fa sparire dal confronto
     proprio le garanzie scritte in modo strano. */
  /* Il sinonimo si cerca A PAROLE INTERE, non come pezzo di stringa.

     Costato caro, e trovato sul prospetto vero il 02/10/2026: «Ricerca e
     riparazione del danno d'acqua» finiva su `rca`, perché in «ri-ce-RCA» le
     tre lettere ci sono. Sulla guida del cliente una garanzia della casa
     compariva sotto «Veicoli». Le sigle corte — rca, rct, rco, tcm — dentro
     una parola qualunque ci cascano tutte. */
  function dentro(testoNorm, ago) {
    var r = new RegExp('(^|\\s)' + ago.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|\\s)');
    var m = r.exec(testoNorm);
    return m ? m.index + m[1].length : -1;
  }

  /* I candidati di UN ramo: ogni sinonimo che combacia, con dove comincia e
     quanto è lungo. Il combaciamento esatto prende `da = -1`, così vince
     sempre: è l'unico che non può sbagliare. */
  function candidati(ramo, nome) {
    var lista = VOCABOLARIO[testo(ramo).toLowerCase()];
    if (!lista) return [];
    var k = chiave(senzaAccenti(nome));
    if (!k) return [];
    var fuori = [], i, j, g, s;
    for (i = 0; i < lista.length; i++) {
      g = lista[i];
      if (chiave(senzaAccenti(g.nome)) === k) { fuori.push({ id: g.id, da: -1, lung: k.length }); continue; }
      for (j = 0; j < g.sin.length; j++) {
        s = chiave(senzaAccenti(g.sin[j]));
        if (!s) continue;
        if (s === k) { fuori.push({ id: g.id, da: -1, lung: s.length }); continue; }
        var dove = dentro(k, s);
        if (dove >= 0) fuori.push({ id: g.id, da: dove, lung: s.length });
      }
    }
    return fuori;
  }

  /* Le due regole con cui si sceglie fra i candidati, in quest'ordine:

     1. VINCE CHI COMINCIA PRIMA. Il nome di una garanzia sta in testa; quello
        che viene dopo la qualifica. «Rendita vitalizia DA INFORTUNI» è una
        rendita, non un infortunio — e con la sola regola della lunghezza
        finiva su `infortuni`, perché è la parola più lunga. Misurato sul
        preventivo n.4 vero il 02/10/2026.

     2. A parità di inizio, vince il più lungo. «Furto e incendio» deve battere
        «furto», altrimenti una garanzia che ne copre due si conta per una e il
        prodotto che le vende separate sembra più ricco. */
  function scegli(cand) {
    if (!cand.length) return null;
    cand.sort(function (a, b) { return a.da - b.da || b.lung - a.lung || a.ramo - b.ramo; });
    return cand[0].id;
  }

  function normalizza(ramo, nome) {
    return scegli(candidati(ramo, nome).map(function (c) { c.ramo = 0; return c; }));
  }

  /* ── CERCARE IN PIÙ RAMI ──────────────────────────────────────────────────
     Un prospetto «casa e famiglia» vero porta dentro casa, infortuni e vita
     nello stesso foglio: cercando in un ramo solo, l'invalidità permanente non
     si trova.

     E NON SI PUÒ PRENDERE IL PRIMO RAMO CHE RISPONDE. «Rendita vitalizia da
     infortuni» fa scattare `salute` (per via di «infortuni») prima ancora che
     si arrivi a `vita`, e la rendita finisce fra gli infortuni: la regola del
     nome-in-testa, applicata dentro un ramo alla volta, non serve a niente.
     Quindi si raccolgono i candidati di TUTTI i rami e si sceglie una volta
     sola. L'ordine dei rami resta, ma solo come ultimo spareggio — serve a
     dire che «cristalli», su un prospetto casa, sono le lastre e non il
     parabrezza. */
  function normalizzaFra(rami, nome) {
    if (typeof rami === 'string') rami = [rami];
    var tutti = [];
    (rami || []).forEach(function (r, i) {
      candidati(r, nome).forEach(function (c) { c.ramo = i; tutti.push(c); });
    });
    return scegli(tutti);
  }

  function garanziaDi(ramo, id) {
    var lista = VOCABOLARIO[testo(ramo).toLowerCase()] || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /* ── LEGGERE UN DIP ───────────────────────────────────────────────────────
     Taglia il testo sulle quattro domande regolamentate e torna i pezzi. Non
     interpreta: separa. L'interpretazione viene dopo ed è di chi legge.

     `trovate` dice QUALI sezioni ci sono davvero. Un documento che non ha «Che
     cosa non è assicurato?» non è un documento senza esclusioni: è un
     documento che non siamo riusciti a tagliare, e i suoi dati valgono meno. */
  function leggiDip(testoDoc) {
    var t = testo(testoDoc);
    if (!t) return { ok: false, motivo: 'Il documento è vuoto: non c\'è niente da leggere.', sezioni: {}, trovate: [] };
    var piatto = senzaAccenti(t).toLowerCase();
    var tagli = [];
    SEZIONI.forEach(function (s) {
      var ago = senzaAccenti(s.domanda).toLowerCase().replace(/\s+/g, ' ');
      var dove = piatto.replace(/\s+/g, ' ').indexOf(ago);
      /* L'indice va ricalcolato sul testo VERO, non su quello appiattito:
         appiattendo gli spazi le posizioni si spostano, e si taglierebbe il
         documento in punti sbagliati. */
      if (dove >= 0) {
        var r = new RegExp(senzaAccenti(s.domanda).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i');
        var m = r.exec(senzaAccenti(t));
        if (m) tagli.push({ id: s.id, da: m.index, lung: m[0].length });
      }
    });
    tagli.sort(function (a, b) { return a.da - b.da; });
    var sezioni = {}, trovate = [];
    tagli.forEach(function (x, i) {
      var fine = i + 1 < tagli.length ? tagli[i + 1].da : t.length;
      sezioni[x.id] = t.slice(x.da + x.lung, fine).trim();
      trovate.push(x.id);
    });
    return {
      ok: trovate.length > 0,
      motivo: trovate.length ? null
        : 'Nessuna delle quattro domande del DIP si trova in questo testo: o non è un DIP, o il PDF non si è lasciato leggere.',
      sezioni: sezioni, trovate: trovate,
      /* Dichiarato, non nascosto: quante delle quattro mancano. */
      mancanti: SEZIONI.map(function (s) { return s.id; })
        .filter(function (id) { return trovate.indexOf(id) < 0; })
    };
  }

  /* ── IL CONFRONTO ─────────────────────────────────────────────────────────
     Due prodotti, una riga per garanzia del ramo. Ogni riga dice che cosa dice
     ciascun documento, e da dove.

     Un prodotto è: { compagnia, prodotto, ramo, edizione, documento,
                      garanzie: [ { id|nome, stato, massimale, franchigia,
                                    scoperto, frase, pagina } ] }
     `stato` vale 'presente' | 'assente' | 'non_letto'. Quando manca, si
     ricava: una garanzia elencata è presente; una garanzia che il documento
     non nomina è `non_letto`, MAI `assente`. */
  var STATI = ['presente', 'assente', 'non_letto'];

  function statoDi(g) {
    var s = testo(g && g.stato).toLowerCase();
    if (STATI.indexOf(s) >= 0) return s;
    return 'presente';   /* elencata nel documento = il documento la nomina */
  }

  function indicizza(p) {
    var ramo = testo(p && p.ramo).toLowerCase();
    var per = {}, fuori = [];
    ((p && p.garanzie) || []).forEach(function (g) {
      var id = testo(g.id) || normalizza(ramo, g.nome);
      if (!id || !garanziaDi(ramo, id)) { fuori.push(g); return; }
      /* Due righe sulla stessa garanzia: vince quella che dice di più. Una
         riga «presente» non si lascia sovrascrivere da una «non_letto». */
      var pre = per[id];
      if (pre && statoDi(pre) === 'presente' && statoDi(g) !== 'presente') return;
      per[id] = g;
    });
    return { per: per, fuori: fuori };
  }

  /* Da dove viene questa riga. Documento ed edizione si leggono PRIMA dalla
     garanzia e solo dopo dal prodotto, e non è un dettaglio: un prodotto ha
     più documenti — il DIP, il DIP aggiuntivo, le condizioni — e ogni edizione
     è un documento diverso. Prendendoli dal prodotto, tutte le righe
     direbbero di venire dallo stesso foglio, e una riga che indica il
     documento sbagliato è peggio di una riga che non lo indica: manda a
     cercare una frase dove non c'è, e la si trova diversa. */
  function fonteDi(p, g) {
    return {
      compagnia: testo(p.compagnia) || null,
      prodotto: testo(p.prodotto) || null,
      documento: testo(g && g.documento) || testo(p.documento) || null,
      edizione: testo(g && g.edizione) || testo(p.edizione) || null,
      pagina: g && g.pagina != null ? g.pagina : null,
      frase: testo(g && g.frase) || null
    };
  }

  function lato(p, idx, id) {
    var g = idx.per[id];
    if (!g) return { stato: 'non_letto', massimale: null, franchigia: null, scoperto: null, fonte: null };
    return {
      stato: statoDi(g),
      massimale: g.massimale == null ? null : g.massimale,
      franchigia: g.franchigia == null ? null : g.franchigia,
      scoperto: g.scoperto == null ? null : g.scoperto,
      fonte: fonteDi(p, g)
    };
  }

  /* Chi vince su una riga. `null` quando non si può dire — e non si può dire
     ogni volta che uno dei due non è stato letto. «Non lo so» è una risposta,
     e nasconderla farebbe vincere sempre quello col documento più chiaro
     invece di quello col prodotto migliore. */
  function verso(a, b) {
    if (a.stato === 'non_letto' || b.stato === 'non_letto') return null;
    if (a.stato === 'presente' && b.stato !== 'presente') return 'a';
    if (b.stato === 'presente' && a.stato !== 'presente') return 'b';
    if (a.stato !== 'presente' && b.stato !== 'presente') return 'pari';
    /* Tutt'e due presenti: decide il massimale, se c'è da tutt'e due. Un
       massimale confrontato con un buco non è un confronto. */
    if (a.massimale != null && b.massimale != null) {
      if (a.massimale > b.massimale) return 'a';
      if (b.massimale > a.massimale) return 'b';
    } else if (a.massimale != null || b.massimale != null) {
      return null;
    }
    /* A parità di massimale, la franchigia più bassa è meglio per il cliente. */
    if (a.franchigia != null && b.franchigia != null) {
      if (a.franchigia < b.franchigia) return 'a';
      if (b.franchigia < a.franchigia) return 'b';
    } else if (a.franchigia != null || b.franchigia != null) {
      return null;
    }
    return 'pari';
  }

  function confronta(pa, pb) {
    var ramo = testo(pa && pa.ramo).toLowerCase();
    if (!VOCABOLARIO[ramo]) {
      return { ok: false, motivo: 'Ramo sconosciuto: «' + testo(pa && pa.ramo) + '». I rami sono ' +
        RAMI.map(function (r) { return r.id; }).join(', ') + '.', righe: [] };
    }
    if (chiave(pb && pb.ramo) !== chiave(ramo)) {
      return { ok: false, motivo: 'I due prodotti sono di rami diversi (' + testo(pa.ramo) + ' e ' +
        testo(pb && pb.ramo) + '): un\'auto e una casa non si confrontano garanzia per garanzia.', righe: [] };
    }
    var ia = indicizza(pa), ib = indicizza(pb);
    var righe = VOCABOLARIO[ramo].map(function (g) {
      var a = lato(pa, ia, g.id), b = lato(pb, ib, g.id);
      return {
        id: g.id, nome: g.nome, obbligatoria: !!g.obbligatoria,
        a: a, b: b, verso: verso(a, b),
        confrontabile: a.stato !== 'non_letto' && b.stato !== 'non_letto'
      };
    });
    return {
      ok: true, motivo: null, ramo: ramo, righe: righe,
      /* Le garanzie che i documenti nominano e il vocabolario non conosce. Non
         si buttano: si mostrano, perché una garanzia che sparisce dal confronto
         fa vincere chi ce l'ha. */
      fuoriVocabolario: { a: ia.fuori, b: ib.fuori }
    };
  }

  /* ── IL PUNTEGGIO ─────────────────────────────────────────────────────────
     Quante righe vince ciascuno, SU QUANTE se n'è potuto dire qualcosa. I due
     numeri stanno sempre insieme: «9 a 4 su 13 confrontate, 6 non lette» è un
     risultato; «9 a 4» da solo è un risultato che finge. */
  function punteggio(c) {
    if (!c || !c.ok) return { ok: false, motivo: (c && c.motivo) || 'Non c\'è nessun confronto da pesare.' };
    var a = 0, b = 0, pari = 0, nonConf = 0;
    c.righe.forEach(function (r) {
      if (!r.confrontabile || r.verso === null) { nonConf++; return; }
      if (r.verso === 'a') a++; else if (r.verso === 'b') b++; else pari++;
    });
    var su = a + b + pari;
    return {
      ok: true, a: a, b: b, pari: pari, su: su,
      nonConfrontabili: nonConf, totale: c.righe.length,
      /* Chi è davanti, e solo se si è letto abbastanza da poterlo dire. La
         soglia è dichiarata: sotto la metà delle garanzie del ramo non si
         proclama un vincitore, si dice che mancano i documenti. */
      vince: su === 0 ? null
           : su * 2 < c.righe.length ? null
           : a > b ? 'a' : b > a ? 'b' : 'pari',
      perche: su === 0
        ? 'Nessuna garanzia si è potuta confrontare: mancano i documenti di tutt\'e due i prodotti.'
        : su * 2 < c.righe.length
          ? 'Si è letto ' + su + ' garanzie su ' + c.righe.length + ': troppo poco per dire quale prodotto è migliore. '
            + 'Serve il set informativo aggiornato.'
          : null
    };
  }

  var API = { VERSIONE: VERSIONE, RAMI: RAMI, VOCABOLARIO: VOCABOLARIO, SEZIONI: SEZIONI, STATI: STATI,
    normalizza: normalizza, normalizzaFra: normalizzaFra, candidati: candidati,
    garanziaDi: garanziaDi, leggiDip: leggiDip,
    confronta: confronta, punteggio: punteggio };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Confronto = API;
})();
