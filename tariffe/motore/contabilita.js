/* ═══════════════════════════════════════════════════════════════════════════════
   I CONTI E LE CAUSALI — Brief #02, M1 (19/09/2026)

   È la base di tutto il brief #02: senza un elenco di conti e uno di causali
   non si registra un movimento, e senza movimenti non c'è prima nota, non c'è
   estratto conto e non c'è conto economico.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LE DUE NATURE DEL DENARO, CHE NON SI MESCOLANO MAI.                       │
   │                                                                           │
   │ PREMI     — soldi dei CLIENTI in transito verso la compagnia. L'art. 117  │
   │             del Codice delle Assicurazioni li vuole su un conto separato  │
   │             dal patrimonio dell'agenzia: non sono dell'agenzia nemmeno    │
   │             per un giorno, e non rispondono dei suoi debiti.              │
   │ AZIENDALE — soldi dell'AGENZIA: provvigioni incassate, affitto,           │
   │             stipendi, utenze, provvigioni pagate alla rete.               │
   │                                                                           │
   │ Un conto ha una natura e non cambia idea. Una causale dichiara su quale   │
   │ natura si può registrare, e il sistema lo dice PRIMA, non dopo.           │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ MOVIMENTO FINANZIARIO ≠ MOVIMENTO ECONOMICO.                              │
   │                                                                           │
   │ `incide_su_utile` è la colonna che tiene distinte le due cose, e senza    │
   │ di lei il conto economico dell'agenzia conterebbe come utile l'intero     │
   │ premio incassato — cioè i soldi di qualcun altro. Sarebbe un numero       │
   │ grande, credibile e falso, e nessuno lo rimetterebbe in discussione.      │
   │                                                                           │
   │ Incasso premi e Rimesse in compagnia sono le due facce dello stesso       │
   │ denaro in transito: muovono il conto, non il risultato.                   │
   └───────────────────────────────────────────────────────────────────────────┘

   LE QUATTRO REGOLE CHE QUESTO MOTORE FA RISPETTARE

   1. **Il saldo non si scrive, si calcola.** L'unico numero scritto a mano è
      il saldo iniziale, quello del giorno in cui il conto entra nel sistema.
      Una colonna `saldo` memorizzata è un numero che si aggiorna da un'altra
      parte, e il giorno in cui si scosta dalla somma dei movimenti nessuno sa
      più quale dei due sia quello vero.

   2. **Una causale di natura `premi` non si registra su un conto aziendale**,
      e viceversa. È l'art. 117 tradotto in un controllo: incassare premi sul
      conto di casa, o pagarci l'affitto, è esattamente la confusione che la
      norma vieta. Una causale a natura NULL vale su tutti i conti, ed è il
      caso delle spese bancarie: il bollo lo addebita anche la banca del conto
      premi, e vietarlo vorrebbe dire non poter registrare un fatto accaduto.

   3. **Quello che non si sa non si stima.** Un IBAN che non supera il suo
      controllo non diventa «probabilmente giusto»: si rifiuta, perché un
      bonifico verso un IBAN sbagliato è denaro che parte e non arriva. Ma
      l'IBAN si può anche NON mettere — una cassa contanti non ce l'ha — e
      vuoto non è sbagliato.

   4. **Un conto non si cancella, si spegne.** I movimenti che ci sono passati
      sono storia: cancellare il conto li renderebbe orfani. Un conto spento
      esce dalle tendine e resta nei riepiloghi del passato.

   Il motore NON tocca il database e NON disegna: calcola e valida. Lo
   caricano IAM (`iam/index.html`) e il preventivatore, dallo stesso indirizzo
   e dallo stesso file — due copie del vocabolario dei conti vorrebbero dire
   due contabilità della stessa agenzia.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = '2026-09-19';

  /* ═══ VOCABOLARI ══════════════════════════════════════════════════════════ */

  /* Che cos'è materialmente il conto. Serve a chi legge e servirà ai
     riepiloghi: il fondo cassa teorico (M5) si conta sulle casse, non su tutto
     quello che ha un saldo. */
  var TIPOLOGIE = [
    { k: 'banca',              l: 'Conto corrente bancario', i: 'ti-building-bank' },
    { k: 'cassa',              l: 'Cassa contanti',          i: 'ti-wallet' },
    { k: 'conto_assicurativo', l: 'Conto assicurativo',      i: 'ti-shield-check' },
    { k: 'altro',              l: 'Altro',                   i: 'ti-dots' }
  ];

  var NATURE = [
    { k: 'premi',     l: 'Premi (soldi dei clienti)', i: 'ti-users',    nota: 'Conto separato, art. 117 CAP: i premi in transito verso la compagnia non sono patrimonio dell’agenzia.' },
    { k: 'aziendale', l: 'Aziendale (soldi dell’agenzia)', i: 'ti-building', nota: 'Provvigioni incassate, affitto, stipendi, utenze, provvigioni pagate alla rete.' }
  ];

  var SEGNI = [
    { k: 'entrata', l: 'Entrata', segno: 1 },
    { k: 'uscita',  l: 'Uscita',  segno: -1 }
  ];

  /* Le dieci causali del brief, alla lettera. Questo elenco e il `insert` della
     migrazione `20260919_b02_m1_conti_e_causali.sql` devono dire la stessa
     cosa: c'è una prova che li confronta riga per riga, perché due elenchi
     della stessa cosa sono due elenchi che un giorno divergono — e quello
     sbagliato sarebbe quello che nessuno guarda. */
  var CAUSALI_INIZIALI = [
    { codice: 'provvigioni_collaboratori', nome: 'Pagamento provvigioni ai collaboratori', segno: 'uscita',  incide_su_utile: true,  natura: 'aziendale', ordine: 10 },
    { codice: 'provvigioni_entrata',       nome: 'Provvigioni in entrata',                 segno: 'entrata', incide_su_utile: true,  natura: 'aziendale', ordine: 20 },
    { codice: 'affitti',                   nome: 'Pagamento affitti',                      segno: 'uscita',  incide_su_utile: true,  natura: 'aziendale', ordine: 30 },
    { codice: 'acquisto_polizze',          nome: 'Acquisto polizze',                       segno: 'uscita',  incide_su_utile: true,  natura: 'aziendale', ordine: 40 },
    { codice: 'rimesse_compagnia',         nome: 'Rimesse in compagnia',                   segno: 'uscita',  incide_su_utile: false, natura: 'premi',     ordine: 50 },
    { codice: 'incasso_premi',             nome: 'Incasso premi',                          segno: 'entrata', incide_su_utile: false, natura: 'premi',     ordine: 60 },
    { codice: 'utenze',                    nome: 'Pagamento utenze',                       segno: 'uscita',  incide_su_utile: true,  natura: 'aziendale', ordine: 70 },
    { codice: 'stipendi',                  nome: 'Pagamento stipendi',                     segno: 'uscita',  incide_su_utile: true,  natura: 'aziendale', ordine: 80 },
    { codice: 'spese_bancarie',            nome: 'Spese bancarie',                         segno: 'uscita',  incide_su_utile: true,  natura: null,        ordine: 90 },
    { codice: 'spese_generiche',           nome: 'Spese in genere',                        segno: 'uscita',  incide_su_utile: true,  natura: null,        ordine: 100 }
  ];

  /* La causale a cui si aggancerà l'automatismo dell'incasso (M3). Sta scritta
     qui e non a mano dentro la schermata: il giorno in cui si rinomina, il
     nome cambia e il codice no. */
  var CAUSALE_INCASSO = 'incasso_premi';
  var CAUSALE_RIMESSA = 'rimesse_compagnia';

  /* ═══ ATTREZZI ════════════════════════════════════════════════════════════ */

  /* Arrotondamento SIMMETRICO. `Math.round(-0.5)` in JavaScript fa `-0`, cioè
     arrotonda verso l'alto anche i negativi: su un'uscita quel centesimo va
     dalla parte sbagliata. È la stessa `cent` dell'estratto conto (§17). */
  function cent(n) {
    if (n == null || !isFinite(n)) return null;
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }

  function testo(v) { return v == null ? '' : String(v).trim(); }

  function numero(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    /* Un importo digitato a mano arriva come «1.234,56» o «1234.56»: le due
       forme sono la stessa cifra, e leggerne una sola vuol dire trasformare
       1.234,56 in 1,23 senza dirlo a nessuno. */
    var s = String(v).replace(/[\s €]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function chiaveNome(v) { return testo(v).toLowerCase().replace(/\s+/g, ' '); }

  function etichetta(elenco, k) {
    for (var i = 0; i < elenco.length; i++) if (elenco[i].k === k) return elenco[i].l;
    return null;
  }

  function segnoDi(k) { return k === 'uscita' ? -1 : k === 'entrata' ? 1 : 0; }

  /* ═══ L'IBAN ══════════════════════════════════════════════════════════════ */

  function normalizzaIban(v) { return testo(v).replace(/[\s .\-]/g, '').toUpperCase(); }

  /* Controllo ISO 13616 (mod 97 = 1). Non è un vezzo: un IBAN con una cifra
     sbagliata è un bonifico che parte e non arriva, e il vincolo lo prende
     prima che il denaro si muova. Le lunghezze per paese sono quelle dei paesi
     che un'agenzia italiana incontra; per un paese fuori elenco si controlla
     solo il mod 97, che è il controllo vero — rifiutare un IBAN valido perché
     non abbiamo la sua lunghezza a tabella sarebbe peggio. */
  var LUNGHEZZE = { IT: 27, SM: 27, VA: 22, DE: 22, FR: 27, ES: 24, PT: 25, NL: 18, BE: 16, AT: 20, IE: 22, LU: 20, CH: 21, GB: 22, MC: 27, SI: 19, GR: 27, HR: 21, MT: 31, CY: 28, FI: 18, DK: 18, SE: 24, PL: 28, CZ: 24, SK: 24, RO: 24, BG: 22, HU: 28, LT: 20, LV: 21, EE: 20 };

  function ibanValido(v) {
    var s = normalizzaIban(v);
    if (!s) return false;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    var paese = s.slice(0, 2);
    if (LUNGHEZZE[paese] && s.length !== LUNGHEZZE[paese]) return false;
    var r = s.slice(4) + s.slice(0, 4);
    var resto = 0;
    for (var i = 0; i < r.length; i++) {
      var c = r.charCodeAt(i);
      var v2 = (c >= 65 && c <= 90) ? String(c - 55) : String.fromCharCode(c);
      for (var j = 0; j < v2.length; j++) resto = (resto * 10 + (v2.charCodeAt(j) - 48)) % 97;
    }
    return resto === 1;
  }

  /* Come si mostra: a gruppi di quattro, come lo stampano le banche. Chi deve
     confrontarlo con un estratto conto cartaceo lo legge, invece di contare i
     caratteri. */
  function ibanBello(v) {
    var s = normalizzaIban(v);
    return s ? s.replace(/(.{4})/g, '$1 ').trim() : '';
  }

  /* ═══ VALIDAZIONE ═════════════════════════════════════════════════════════ */

  /* Ritorna SEMPRE l'elenco completo degli errori, non il primo: correggere un
     campo alla volta su una schermata che ne segnala uno per giro è il modo
     più veloce per far smettere qualcuno di compilare. */
  function validaConto(c, altri) {
    c = c || {};
    var e = [];
    var nome = testo(c.nome);
    if (!nome) e.push('Il conto deve avere un nome.');
    if (nome && nome.length > 80) e.push('Il nome del conto è troppo lungo (massimo 80 caratteri).');

    if (!etichetta(TIPOLOGIE, c.tipologia)) e.push('Tipologia non valida.');
    if (!etichetta(NATURE, c.natura)) e.push('Scegli la natura del conto: premi o aziendale. Da questa dipende quali causali ci si possono registrare.');

    /* Il nome doppio non è un dettaglio estetico: due voci identiche nella
       tendina dei movimenti vogliono dire che metà delle registrazioni finisce
       sul conto sbagliato, e non si vede mai. */
    if (nome && altri) {
      for (var i = 0; i < altri.length; i++) {
        if (altri[i] && altri[i].id !== c.id && chiaveNome(altri[i].nome) === chiaveNome(nome)) {
          e.push('C’è già un conto che si chiama «' + nome + '».');
          break;
        }
      }
    }

    /* Un IBAN vuoto va benissimo — una cassa contanti non ce l'ha. Uno
       sbagliato no. */
    if (testo(c.iban) && !ibanValido(c.iban)) e.push('L’IBAN non supera il controllo: ricontrollalo, un bonifico verso un IBAN sbagliato parte e non arriva.');

    if (c.saldo_iniziale != null && c.saldo_iniziale !== '' && numero(c.saldo_iniziale) == null) e.push('Il saldo iniziale non è un importo.');

    /* Una cassa contanti con un IBAN è quasi sempre un campo compilato nella
       riga sbagliata. È un AVVISO, non un errore: potrebbe anche essere una
       cassa che appoggia su un conto, e bloccare qualcosa di possibile per
       renderlo improbabile è il modo di insegnare a ignorare gli avvisi. */
    var avvisi = [];
    if (c.tipologia === 'cassa' && testo(c.iban)) avvisi.push('Una cassa contanti di solito non ha un IBAN: controlla di non aver compilato la riga sbagliata.');
    if (c.tipologia === 'banca' && !testo(c.iban)) avvisi.push('Un conto bancario senza IBAN non si può usare per una distinta o un bonifico.');

    return { ok: e.length === 0, errori: e, avvisi: avvisi };
  }

  function validaCausale(c, altre) {
    c = c || {};
    var e = [];
    var nome = testo(c.nome);
    if (!nome) e.push('La causale deve avere un nome.');
    if (!etichetta(SEGNI, c.segno)) e.push('Scegli se la causale è un’entrata o un’uscita.');

    /* `incide_su_utile` NON ha un default. Un booleano con un default comodo è
       un booleano che nessuno guarda, e qui la differenza fra vero e falso è
       la differenza fra un utile e i soldi di un cliente. */
    if (c.incide_su_utile !== true && c.incide_su_utile !== false) e.push('Di’ se questa causale incide sull’utile: è quello che distingue un ricavo o un costo veri dal denaro solo in transito.');

    if (c.natura != null && c.natura !== '' && !etichetta(NATURE, c.natura)) e.push('Natura non valida.');

    var cod = testo(c.codice);
    if (cod && !/^[a-z0-9_]{2,40}$/.test(cod)) e.push('Il codice può avere solo lettere minuscole, cifre e trattini bassi.');

    if (altre) {
      for (var i = 0; i < altre.length; i++) {
        var a = altre[i];
        if (!a || a.id === c.id) continue;
        if (nome && chiaveNome(a.nome) === chiaveNome(nome)) { e.push('C’è già una causale che si chiama «' + nome + '».'); break; }
      }
      for (var j = 0; j < altre.length; j++) {
        var b = altre[j];
        if (!b || b.id === c.id) continue;
        if (cod && testo(b.codice) === cod) { e.push('Il codice «' + cod + '» è già di un’altra causale.'); break; }
      }
    }
    return { ok: e.length === 0, errori: e, avvisi: [] };
  }

  /* Il codice si ricava dal nome, una volta sola, quando la causale nasce.
     Dopo non si tocca più: è la chiave a cui punteranno i movimenti. */
  function codiceDa(nome, presi) {
    var base = testo(nome).toLowerCase();
    /* Gli accenti si sciolgono prima di togliere tutto il resto: senza,
       «Spese d'ufficio à forfait» diventerebbe un codice con un buco al posto
       della lettera accentata. */
    if (base.normalize) base = base.normalize('NFD').replace(/[̀-ͯ]/g, '');
    base = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
    if (!base) base = 'causale';
    var m = {};
    (presi || []).forEach(function (p) { m[testo(p && p.codice ? p.codice : p)] = true; });
    if (!m[base]) return base;
    for (var i = 2; i < 999; i++) if (!m[base + '_' + i]) return base + '_' + i;
    return base + '_' + Date.now();
  }

  /* ═══ LA REGOLA DELL'ART. 117, IN UNA FUNZIONE ════════════════════════════ */

  /* `conto` e `causale` si possono incontrare? Una causale a natura NULL sì,
     sempre. Una causale a natura dichiarata solo su un conto della stessa
     natura. La risposta dice anche PERCHÉ, perché un «non si può» senza motivo
     su una schermata di contabilità si aggira invece di capirlo. */
  function compatibile(conto, causale) {
    if (!conto || !causale) return { ok: false, motivo: 'Servono un conto e una causale.' };
    var nc = testo(causale.natura);
    if (!nc) return { ok: true, motivo: null };
    if (testo(conto.natura) === nc) return { ok: true, motivo: null };
    if (nc === 'premi') {
      return { ok: false, motivo: '«' + testo(causale.nome) + '» muove i soldi dei clienti e va registrata su un conto premi. «' + testo(conto.nome) + '» è un conto aziendale: l’art. 117 CAP vuole i premi separati dal patrimonio dell’agenzia.' };
    }
    return { ok: false, motivo: '«' + testo(causale.nome) + '» è una voce dell’agenzia e non si paga con i soldi dei clienti. Scegli un conto aziendale invece di «' + testo(conto.nome) + '».' };
  }

  /* Le causali che si possono scegliere su un conto: è la stessa regola, usata
     per RIEMPIRE una tendina invece che per rifiutare dopo. Le due strade
     passano dalla stessa funzione, altrimenti un giorno la tendina proporrebbe
     quello che il salvataggio rifiuta. */
  function causaliPerConto(causali, conto) {
    return (causali || []).filter(function (c) {
      return c && c.attiva !== false && compatibile(conto, c).ok;
    });
  }

  /* ═══ IL SALDO ════════════════════════════════════════════════════════════ */

  /* Un movimento porta il suo importo SEMPRE POSITIVO e il verso sta nella
     causale (o, se il movimento se lo porta dietro, in `segno`). Importi
     negativi nella colonna importo sono la strada più corta per un totale che
     non torna: «-50 in uscita» diventa un'entrata e nessuno se ne accorge. */
  function versoDi(m, causali) {
    if (!m) return 0;
    if (m.segno === 'entrata' || m.segno === 'uscita') return segnoDi(m.segno);
    var c = causali && m.causale_id ? causali[m.causale_id] : null;
    if (c) return segnoDi(c.segno);
    return 0;
  }

  function indice(righe, chiave) {
    var m = {};
    (righe || []).forEach(function (r) { if (r && r[chiave || 'id'] != null) m[r[chiave || 'id']] = r; });
    return m;
  }

  /* Il saldo di un conto = saldo iniziale + tutto quello che ci è passato.
     Niente colonna memorizzata: vedi la regola 1 in testa al file.

     `al` (facoltativo) taglia alla data: serve all'estratto conto della M5 e
     al saldo progressivo della prima nota. Un movimento SENZA data non entra
     in un saldo «a una certa data» — non si sa dove collocarlo — ma entra nel
     saldo di oggi, perché il denaro si è mosso davvero. */
  function saldo(conto, movimenti, opz) {
    opz = opz || {};
    var causali = opz.causali ? indice(opz.causali) : null;
    var tot = numero(conto && conto.saldo_iniziale) || 0;
    var n = 0;
    (movimenti || []).forEach(function (m) {
      if (!m) return;
      if (conto && m.conto_id !== conto.id) return;
      if (opz.al) { if (!m.data || m.data > opz.al) return; }
      if (opz.dal && m.data && m.data < opz.dal) return;
      var imp = numero(m.importo);
      if (imp == null) return;
      var v = versoDi(m, causali);
      if (!v) return;             /* verso sconosciuto: non si indovina */
      tot += v * Math.abs(imp);
      n++;
    });
    return { saldo: cent(tot), iniziale: cent(numero(conto && conto.saldo_iniziale) || 0), movimenti: n };
  }

  /* Il saldo progressivo: la colonna che rende leggibile una prima nota. Le
     righe si ordinano per data e, a parità di data, per l'ordine in cui sono
     state scritte — due movimenti dello stesso giorno hanno un ordine solo se
     glielo si dà, e senza quello il progressivo balla a ogni ricarica. */
  function progressivo(conto, movimenti, opz) {
    opz = opz || {};
    var causali = opz.causali ? indice(opz.causali) : null;
    var righe = (movimenti || []).filter(function (m) { return m && (!conto || m.conto_id === conto.id); });
    righe.sort(function (a, b) {
      var da = testo(a.data), db = testo(b.data);
      if (da !== db) return da < db ? -1 : 1;
      var ca = testo(a.creato_il), cb = testo(b.creato_il);
      if (ca !== cb) return ca < cb ? -1 : 1;
      return testo(a.id) < testo(b.id) ? -1 : 1;
    });
    var tot = numero(conto && conto.saldo_iniziale) || 0;
    return righe.map(function (m) {
      var v = versoDi(m, causali);
      var imp = numero(m.importo);
      var delta = (v && imp != null) ? v * Math.abs(imp) : 0;
      tot += delta;
      return { movimento: m, verso: v, delta: cent(delta), saldo: cent(tot), incerto: !v || imp == null };
    });
  }

  /* ═══ I RIEPILOGHI ════════════════════════════════════════════════════════ */

  function saldi(conti, movimenti, opz) {
    return (conti || []).map(function (c) {
      var s = saldo(c, movimenti, opz);
      return {
        conto: c, id: c.id, nome: testo(c.nome), natura: c.natura, tipologia: c.tipologia,
        attivo: c.attivo !== false,
        saldo: s.saldo, iniziale: s.iniziale, movimenti: s.movimenti
      };
    });
  }

  /* Quanto denaro di ciascuna natura c'è in cassa. Le due cifre NON si
     sommano in un totale unico, ed è la decisione che conta: un «totale
     liquidità» che mette insieme i premi dei clienti e i soldi dell'agenzia è
     il numero che fa credere ricca un'agenzia che ha solo incassato dei premi
     da rimettere. */
  function perNatura(conti, movimenti, opz) {
    var s = saldi(conti, movimenti, opz);
    var out = { premi: 0, aziendale: 0, conti_premi: 0, conti_aziendale: 0, spenti: 0 };
    s.forEach(function (r) {
      if (!r.attivo) { out.spenti++; return; }
      if (r.natura === 'premi') { out.premi = cent(out.premi + (r.saldo || 0)); out.conti_premi++; }
      else if (r.natura === 'aziendale') { out.aziendale = cent(out.aziendale + (r.saldo || 0)); out.conti_aziendale++; }
    });
    return out;
  }

  /* Il conto economico in due righe: ricavi e costi contano SOLO i movimenti
     la cui causale incide sull'utile. Tutto il resto è denaro che passa. */
  function contoEconomico(movimenti, causali, opz) {
    opz = opz || {};
    var idx = indice(causali);
    var r = { ricavi: 0, costi: 0, utile: 0, transito_entrate: 0, transito_uscite: 0, righe: 0, senza_causale: 0 };
    (movimenti || []).forEach(function (m) {
      if (!m) return;
      if (opz.dal && (!m.data || m.data < opz.dal)) return;
      if (opz.al && (!m.data || m.data > opz.al)) return;
      var c = m.causale_id ? idx[m.causale_id] : null;
      var imp = numero(m.importo);
      if (imp == null) return;
      if (!c) { r.senza_causale++; return; }
      r.righe++;
      var e = segnoDi(c.segno) > 0;
      if (c.incide_su_utile) { if (e) r.ricavi = cent(r.ricavi + Math.abs(imp)); else r.costi = cent(r.costi + Math.abs(imp)); }
      else { if (e) r.transito_entrate = cent(r.transito_entrate + Math.abs(imp)); else r.transito_uscite = cent(r.transito_uscite + Math.abs(imp)); }
    });
    r.utile = cent(r.ricavi - r.costi);
    /* Quanto denaro dei clienti è ancora in casa: entrato e non ancora
       rimesso. Non è un utile, ed è il numero che l'art. 117 guarda. */
    r.in_transito = cent(r.transito_entrate - r.transito_uscite);
    return r;
  }

  /* ═══ COSA SI PUÒ CANCELLARE ══════════════════════════════════════════════ */

  /* Regola 4: un conto con movimenti non si cancella. La risposta dice cosa
     fare invece, perché «non si può» senza un'alternativa è una schermata che
     non si usa. */
  function eliminabile(conto, movimenti) {
    var n = (movimenti || []).filter(function (m) { return m && m.conto_id === (conto && conto.id); }).length;
    if (n) return { ok: false, motivo: 'Su questo conto ci sono ' + n + ' movimenti: sono storia e non si buttano. Spegnilo — esce dalle tendine e resta nei riepiloghi del passato.' };
    return { ok: true, motivo: null };
  }

  function causaleEliminabile(causale, movimenti) {
    if (causale && causale.di_sistema) return { ok: false, motivo: 'È una delle causali di partenza e ci si aggancia l’automatismo dell’incasso: si può spegnere, non cancellare.' };
    var n = (movimenti || []).filter(function (m) { return m && m.causale_id === (causale && causale.id); }).length;
    if (n) return { ok: false, motivo: 'Questa causale è usata da ' + n + ' movimenti. Spegnila: i movimenti di ieri continuano a dire com’erano.' };
    return { ok: true, motivo: null };
  }

  /* ═══ FORMATO ═════════════════════════════════════════════════════════════ */

  function euro(n) {
    var v = numero(n);
    if (v == null) return '—';
    return (v < 0 ? '-' : '') + '€ ' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var API = {
    VERSIONE: VERSIONE,
    TIPOLOGIE: TIPOLOGIE, NATURE: NATURE, SEGNI: SEGNI,
    CAUSALI_INIZIALI: CAUSALI_INIZIALI,
    CAUSALE_INCASSO: CAUSALE_INCASSO, CAUSALE_RIMESSA: CAUSALE_RIMESSA,
    validaConto: validaConto, validaCausale: validaCausale, codiceDa: codiceDa,
    compatibile: compatibile, causaliPerConto: causaliPerConto,
    saldo: saldo, saldi: saldi, progressivo: progressivo,
    perNatura: perNatura, contoEconomico: contoEconomico,
    eliminabile: eliminabile, causaleEliminabile: causaleEliminabile,
    ibanValido: ibanValido, normalizzaIban: normalizzaIban, ibanBello: ibanBello,
    etichetta: etichetta, segnoDi: segnoDi, cent: cent, numero: numero, euro: euro
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Contabilita = API;
})();
