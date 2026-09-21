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

   LE DIECI REGOLE CHE QUESTO MOTORE FA RISPETTARE
   (le prime quattro sono della M1, le altre sono arrivate con la prima nota
   e con gli incassi da accreditare: sono in fondo, ognuna sotto la sua riga)

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

   ─── AGGIUNTO CON LA M3 (20/09/2026): LA PRIMA NOTA E LA QUADRATURA ─────────

   5. **Un movimento non si cancella: si annulla, con il motivo.** Una riga
      cancellata lascia un buco che nessuno sa più spiegare, e in un registro
      di denaro «non c'è» e «è stato tolto» sono due cose diverse. La riga
      annullata resta, esce da OGNI totale (saldo, progressivo, conto
      economico, riepiloghi) e si legge nello storico col suo perché.

   6. **L'importo è sempre positivo: il verso lo dice la causale.** Un «-50» in
      una riga «Incasso premi» è un'uscita travestita da entrata, e dentro un
      totale non si vede più. Chi digita sceglie la causale, non il segno.

   7. **«Quadra» e «non è stata fatta la quadratura» sono due cose diverse.**
      Il saldo RICOSTRUITO lo sa il sistema (iniziale + movimenti); quello VERO
      lo sa la banca, o chi ha contato la cassa. Senza un saldo dichiarato non
      si dice che un conto quadra: si dice che nessuno l'ha ancora verificato.
      È la stessa distinzione fra «non risponde» e «non c'è niente».

   ─── AGGIUNTO CON LA M4 (20/09/2026): GLI INCASSI DA ACCREDITARE ────────────

   8. **Un incasso non e' un accredito.** Contanti sono denaro in mano; POS,
      bonifico, assegno e carte sono denaro che il cliente ha pagato e che sul
      conto arrivera' dopo. Trattarli uguale fa dire al saldo di avere dei
      soldi che non ci sono ancora — e la quadratura (regola 7) troverebbe la
      differenza senza saper dire perche'.

   9. **Dove finisce il denaro lo dice il CONTO, non il codice.** `iam_conti.mezzi`
      elenca i mezzi che arrivano su quel conto. Nessuno lo dichiara, o due lo
      dichiarano: si dice, non si sceglie il primo che passa — meta' delle
      volte si sbaglierebbe, e l'altra meta' sarebbe un caso.

  10. **«Non si sa» e' una risposta, e va data.** Un incasso senza mezzo non e'
      ne' in cassa ne' in arrivo: sul database vero sono NOVE rate incassate su
      quindici. Metterle da una parte a caso vorrebbe dire scrivere in
      contabilita' un fatto che nessuno ha verificato.

   Il motore NON tocca il database e NON disegna: calcola e valida. Lo
   caricano IAM (`iam/index.html`) e il preventivatore, dallo stesso indirizzo
   e dallo stesso file — due copie del vocabolario dei conti vorrebbero dire
   due contabilità della stessa agenzia.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = '2026-09-20c';

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

  /* ═══ I MEZZI DI PAGAMENTO, E IL TEMPO CHE CI METTONO (M4) ════════════════

     La colonna che conta e' `immediato`. Non e' una sfumatura: dice se il
     denaro e' gia' dell'agenzia o se e' ancora per strada.

     · CONTANTI  — in mano subito: entrano in cassa, e il conto si muove oggi.
     · POS, BONIFICO, ASSEGNO, CARTE — il cliente ha pagato, l'accredito arriva
       dopo. In mezzo c'e' un tempo in cui l'incasso e' avvenuto e il conto non
       si e' mosso: e' li' che vive un «incasso da accreditare».

     Trattarli tutti come immediati farebbe dire al saldo di avere dei soldi
     che non sono ancora arrivati — un numero credibile e falso, e la
     quadratura (regola 7) lo troverebbe sbagliato senza saper dire perche'. */
  var MEZZI = [
    { k: 'contanti',      l: 'Contanti',            immediato: true,  i: 'ti-cash' },
    { k: 'pos',           l: 'POS',                 immediato: false, i: 'ti-credit-card', giorni: 2 },
    { k: 'bonifico',      l: 'Bonifico',            immediato: false, i: 'ti-building-bank', giorni: 3 },
    { k: 'assegno',       l: 'Assegno',             immediato: false, i: 'ti-file-invoice', giorni: 7 },
    { k: 'carta_credito', l: 'Carta di credito',    immediato: false, i: 'ti-credit-card', giorni: 3 },
    { k: 'prepagata',     l: 'Prepagata',           immediato: false, i: 'ti-credit-card', giorni: 3 },
    { k: 'paypal',        l: 'PayPal',              immediato: false, i: 'ti-brand-paypal', giorni: 3 },
    { k: 'rid',           l: 'SDD / RID',           immediato: false, i: 'ti-repeat', giorni: 5 },
    { k: 'altro',         l: 'Altro',               immediato: false, i: 'ti-dots' }
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

    /* M6: il conto delle rimesse è UNO. Il divieto vero è un indice unico sul
       database — la schermata è una delle strade, non l'unica — ma un vincolo
       che scatta dopo il salvataggio arriva come un errore che nessuno sa
       leggere. Qui si dice prima, e si dice quale. */
    if (c.rimesse === true && altri) {
      for (var k = 0; k < altri.length; k++) {
        var g = altri[k];
        if (!g || g.id === c.id || g.rimesse !== true || g.attivo === false) continue;
        e.push('«' + (testo(g.nome) || 'Un altro conto') + '» è già il conto delle rimesse: toglilo da lì prima, o i collaboratori riceverebbero due IBAN diversi.');
        break;
      }
    }
    if (c.rimesse === true && !testo(c.iban)) {
      avvisi.push('Questo è il conto delle rimesse ma non ha l’IBAN: finché manca, l’estratto conto lo dichiara invece di scrivere le coordinate.');
    }

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

  /* Regola 5. Un movimento annullato non è un movimento: esce da OGNI totale.
     Sta in una funzione sola perché i posti che sommano sono cinque, e cinque
     controlli scritti a mano sono cinque occasioni di dimenticarne uno — che
     è il modo in cui un saldo comincia a non tornare senza che nessuno capisca
     perché. `vivi()` è la porta: chi somma passa di qui. */
  function vivo(m) { return !!m && !m.annullato_il; }
  function vivi(movimenti) { return (movimenti || []).filter(vivo); }

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
      if (!vivo(m)) return;                 /* regola 5 */
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
    var righe = vivi(movimenti).filter(function (m) { return !conto || m.conto_id === conto.id; });
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
      if (!vivo(m)) return;                 /* regola 5 */
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

  /* ═══ LE COORDINATE DELLE RIMESSE (brief #02 · M6, 20/09/2026) ════════════

     Su quale conto versano i collaboratori. Lo dice il CONTO, con una spunta,
     non una costante dentro un programma: il giorno in cui l'agenzia cambia
     banca si cambia una riga in una schermata, e l'estratto conto del mese
     dopo parte con l'IBAN giusto senza che nessuno se ne ricordi.

     Sta qui e non nel motore dell'estratto conto perché i conti sono di
     questo motore, e il controllo dell'IBAN pure: due controlli dello stesso
     IBAN sarebbero due regole, e quella che sbaglia sarebbe quella che
     nessuno guarda. Il documento che esce di casa riceve il RISULTATO.

     E quando non ci sono, torna il MOTIVO, mai un IBAN indovinato: un
     bonifico verso un IBAN inventato parte e non arriva (regola di casa
     §8.1). */
  function coordinateRimesse(conti) {
    var attivi = (conti || []).filter(function (c) { return c && c.attivo !== false; });
    var scelti = attivi.filter(function (c) { return c.rimesse === true; });
    if (!scelti.length) {
      return { ok: false, motivo: 'Nessun conto è segnato come conto delle rimesse: mettici la spunta in Strumenti › Conti e causali.' };
    }
    if (scelti.length > 1) {
      /* Il database lo impedisce con un indice unico. Il motore però legge
         dei dati che non ha scritto lui, e due IBAN sullo stesso documento
         non si scelgono a caso: si dice che c'è da decidere. */
      return { ok: false, motivo: scelti.length + ' conti dicono di ricevere le rimesse. Lasciane uno solo.' };
    }
    var c = scelti[0];
    var iban = normalizzaIban(c.iban);
    if (!iban) {
      return { ok: false, conto: testo(c.nome) || '', motivo: 'Il conto «' + (testo(c.nome) || '') + '» riceve le rimesse ma non ha l’IBAN.' };
    }
    if (!ibanValido(iban)) {
      return { ok: false, conto: testo(c.nome) || '', iban: ibanBello(iban),
               motivo: 'L’IBAN del conto «' + (testo(c.nome) || '') + '» non supera il controllo: c’è un refuso.' };
    }
    return {
      ok: true, conto: testo(c.nome) || '', iban: ibanBello(iban),
      bic: testo(c.bic) || '', intestatario: testo(c.intestatario) || '', banca: testo(c.banca) || ''
    };
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

  /* ═══ GLI INCASSI DA ACCREDITARE (M4) ═════════════════════════════════════ */

  function mezzo(k) {
    var t = testo(k).toLowerCase();
    for (var i = 0; i < MEZZI.length; i++) if (MEZZI[i].k === t) return MEZZI[i];
    return null;
  }

  /* Su quale conto arriva un certo mezzo. Lo dice il CONTO (`mezzi`), non il
     codice: il giorno in cui l'agenzia cambia banca per il POS, si cambia una
     riga in una schermata e non una riga di programma.

     Se nessun conto lo dichiara torna `null`, e chi chiama lo deve dire —
     non scegliere il primo conto che passa. Se piu' d'uno lo dichiara e'
     un'ambiguita' vera: due conti che ricevono lo stesso mezzo vogliono dire
     che l'accredito potrebbe finire su tutti e due, e a indovinare si sbaglia
     meta' delle volte. */
  function contoPerMezzo(conti, k) {
    var t = testo(k).toLowerCase();
    var ok = (conti || []).filter(function (c) {
      if (!c || c.attivo === false) return false;
      return (c.mezzi || []).some(function (m) { return testo(m).toLowerCase() === t; });
    });
    if (ok.length === 1) return { conto: ok[0], ok: true };
    if (!ok.length) return { conto: null, ok: false, motivo: 'Nessun conto dichiara di ricevere «' + (mezzo(t) ? mezzo(t).l : t) + '». Scegli il conto in Strumenti › Conti e causali.' };
    return { conto: null, ok: false, ambiguo: ok, motivo: ok.length + ' conti dicono di ricevere «' + (mezzo(t) ? mezzo(t).l : t) + '»: non si puo' + '\u2019 sapere dove arriva. Lascialo su uno solo.' };
  }

  /* CHE FINE FA un incasso. Tre risposte, e la terza e' quella che tiene in
     piedi tutto il resto:

       'cassa'     — mezzo immediato: il movimento si registra oggi;
       'sospeso'   — il cliente ha pagato, l'accredito arrivera': nasce una
                     riga da accreditare;
       'non-si-sa' — manca il mezzo, o nessun conto lo riceve. NON si sceglie
                     per somiglianza: si dice, e chi guarda decide.

     Le 9 rate su 15 che nel database non dicono con che mezzo sono state
     incassate finiscono tutte nella terza, ed e' giusto cosi'. */
  function destinoIncasso(riga, conti) {
    riga = riga || {};
    var k = testo(riga.mezzo_pagamento || riga.mezzo).toLowerCase();
    var imp = numero(riga.importo_lordo != null ? riga.importo_lordo : riga.importo);
    var out = { mezzo: k || null, importo: imp, data: riga.incassato_il || riga.data_incasso || null };

    if (!k) { out.tipo = 'non-si-sa'; out.motivo = 'Non e\u2019 detto con che mezzo e\u2019 stato incassato: senza quello non si sa se il denaro e\u2019 in cassa o in arrivo.'; return out; }
    var m = mezzo(k);
    if (!m) { out.tipo = 'non-si-sa'; out.motivo = 'Il mezzo «' + k + '» non e\u2019 nel vocabolario: non si indovina quanto ci mette ad arrivare.'; return out; }
    out.etichetta = m.l;
    if (imp == null || imp <= 0) { out.tipo = 'non-si-sa'; out.motivo = 'L\u2019importo non si legge.'; return out; }

    var d = contoPerMezzo(conti, k);
    if (!d.ok) { out.tipo = 'non-si-sa'; out.motivo = d.motivo; out.ambiguo = d.ambiguo || null; return out; }
    out.conto = d.conto;
    out.tipo = m.immediato ? 'cassa' : 'sospeso';
    out.giorni_attesi = m.immediato ? 0 : (m.giorni || null);
    return out;
  }

  /* Da quanti giorni un incasso e' fermo. Il numero che fa alzare il telefono:
     un POS di tre giorni fa e' normale, uno di trenta e' un problema. */
  function giorniDa(data, oggi) {
    var a = testo(data), b = testo(oggi) || new Date().toISOString().slice(0, 10);
    if (!a) return null;
    var d1 = new Date(a + 'T00:00:00Z'), d2 = new Date(b + 'T00:00:00Z');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    return Math.round((d2 - d1) / 86400000);
  }

  /* In ritardo = fermo da piu' giorni di quelli che quel mezzo ci mette. Sul
     mezzo che non dichiara un'attesa (`altro`) non si inventa una soglia: non
     e' mai «in ritardo», perche' nessuno sa quanto dovrebbe metterci. */
  function inRitardo(s, oggi) {
    if (!s || s.stato !== 'aperto') return false;
    var m = mezzo(s.mezzo);
    if (!m || !m.giorni) return false;
    var g = giorniDa(s.data_incasso, oggi);
    return g != null && g > m.giorni;
  }

  function sospesiAperti(righe, opz) {
    opz = opz || {};
    return (righe || []).filter(function (s) {
      if (!s || s.stato !== 'aperto') return false;
      if (opz.conto_id && s.conto_id !== opz.conto_id) return false;
      if (opz.mezzo && testo(s.mezzo).toLowerCase() !== testo(opz.mezzo).toLowerCase()) return false;
      if (opz.dal && (!s.data_incasso || s.data_incasso < opz.dal)) return false;
      if (opz.al && (!s.data_incasso || s.data_incasso > opz.al)) return false;
      return true;
    });
  }

  /* Quanto denaro e' per strada, da quanto, e per quale mezzo. */
  function riepilogoSospesi(righe, opz) {
    opz = opz || {};
    var oggi = testo(opz.oggi) || new Date().toISOString().slice(0, 10);
    var r = { totale: 0, righe: 0, in_ritardo: 0, totale_ritardo: 0, piu_vecchio: null, giorni_max: null, per_mezzo: [], senza_conto: 0 };
    var acc = {};
    sospesiAperti(righe, opz).forEach(function (s) {
      var imp = numero(s.importo);
      if (imp == null) return;
      r.righe++;
      r.totale = cent(r.totale + Math.abs(imp));
      if (!s.conto_id) r.senza_conto++;
      var g = giorniDa(s.data_incasso, oggi);
      if (g != null && (r.giorni_max == null || g > r.giorni_max)) { r.giorni_max = g; r.piu_vecchio = s; }
      if (inRitardo(s, oggi)) { r.in_ritardo++; r.totale_ritardo = cent(r.totale_ritardo + Math.abs(imp)); }
      var k = testo(s.mezzo).toLowerCase() || '—';
      if (!acc[k]) acc[k] = { mezzo: k, etichetta: mezzo(k) ? mezzo(k).l : k, totale: 0, righe: 0 };
      acc[k].totale = cent(acc[k].totale + Math.abs(imp));
      acc[k].righe++;
    });
    r.per_mezzo = Object.keys(acc).map(function (k) { return acc[k]; })
      .sort(function (a, b) { return b.totale - a.totale; });
    return r;
  }

  /* Che cosa serve per accreditare. La data dell'accredito non puo' venire
     PRIMA dell'incasso: sarebbe il conto che si muove prima che il cliente
     paghi, e da li' in poi la quadratura racconterebbe una storia sbagliata. */
  function validaAccredito(s, dati, opz) {
    s = s || {}; dati = dati || {}; opz = opz || {};
    var e = [];
    if (s.stato === 'accreditato') e.push('Questo incasso e\u2019 gia\u2019 stato accreditato.');
    if (s.stato === 'annullato') e.push('Questo incasso e\u2019 stato annullato: non si accredita.');
    var d = testo(dati.accreditato_il);
    if (!d) e.push('Metti la data dell\u2019accredito: e\u2019 il giorno in cui il denaro e\u2019 arrivato sul conto.');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) e.push('La data dell\u2019accredito non si legge.');
    else if (s.data_incasso && d < s.data_incasso) {
      e.push('L\u2019accredito non puo\u2019 essere precedente all\u2019incasso (' + s.data_incasso + '): il conto si sarebbe mosso prima che il cliente pagasse.');
    }
    var conto = dati.conto_id || s.conto_id;
    if (!conto) e.push('Manca il conto su cui e\u2019 arrivato il denaro.');
    if (opz.conti && conto) {
      var c = indice(opz.conti)[conto];
      if (!c) e.push('Quel conto non esiste piu\u2019.');
      else if (c.attivo === false) e.push('Il conto «' + testo(c.nome) + '» e\u2019 spento.');
    }
    return e;
  }

  /* ═══ LA PRIMA NOTA (M3) ══════════════════════════════════════════════════ */

  /* Che cosa deve avere un movimento per poter essere scritto. Le stesse
     regole del database, dette prima e con parole che si capiscono: il
     controllo vero sta nei trigger e nei check (la schermata è una delle
     strade, non l'unica), ma far fallire un `insert` per dire a una persona
     che ha sbagliato un campo è il modo peggiore di dirglielo. */
  function validaMovimento(m, opz) {
    opz = opz || {};
    m = m || {};
    var e = [];
    var conto   = opz.conti   ? indice(opz.conti)[m.conto_id]     : opz.conto;
    var causale = opz.causali ? indice(opz.causali)[m.causale_id] : opz.causale;

    if (!testo(m.data)) e.push('Metti la data del movimento: è il giorno in cui il denaro si è mosso, non quello in cui lo stai scrivendo.');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(testo(m.data))) e.push('La data non è in una forma che il sistema sappia leggere.');

    if (!m.conto_id) e.push('Scegli il conto.');
    else if (opz.conti && !conto) e.push('Quel conto non esiste più.');
    else if (conto && conto.attivo === false) e.push('Il conto «' + testo(conto.nome) + '» è spento: non ci si registra più niente. Riaccendilo, o scegline un altro.');

    if (!m.causale_id) e.push('Scegli la causale: è lei che dice se è un’entrata o un’uscita.');
    else if (opz.causali && !causale) e.push('Quella causale non esiste più.');
    else if (causale && causale.attiva === false) e.push('La causale «' + testo(causale.nome) + '» è spenta.');

    /* Regola 6: importo positivo, e lo zero non è un movimento. */
    var imp = numero(m.importo);
    if (imp == null) e.push('Metti l’importo.');
    else if (imp <= 0) e.push('L’importo si scrive sempre positivo: entrata o uscita lo decide la causale, non il segno. Un «meno» qui è un’uscita travestita da entrata.');

    /* Regola 2, detta prima del salvataggio. */
    if (conto && causale) {
      var c = compatibile(conto, causale);
      if (!c.ok) e.push(c.motivo);
    }

    /* Regola 5: annullare vuol dire dire perché. */
    if (m.annullato_il && !testo(m.annullato_perche)) {
      e.push('Per annullare un movimento serve il motivo: fra sei mesi è l’unica cosa che spiega quel buco.');
    }
    return e;
  }

  /* Entrate, uscite e differenza su un mucchio di movimenti già filtrato dalla
     schermata. Serve alla barra della prima nota. Gli annullati si contano a
     parte: dire «12 movimenti» quando tre sono annullati è un numero che non
     torna con l'elenco che si sta guardando. */
  function riepilogo(movimenti, opz) {
    opz = opz || {};
    var causali = opz.causali ? indice(opz.causali) : null;
    var r = { entrate: 0, uscite: 0, saldo: 0, righe: 0, annullati: 0, senza_verso: 0 };
    (movimenti || []).forEach(function (m) {
      if (!m) return;
      if (m.annullato_il) { r.annullati++; return; }
      var imp = numero(m.importo);
      if (imp == null) return;
      var v = versoDi(m, causali);
      if (!v) { r.senza_verso++; return; }   /* non si indovina */
      r.righe++;
      if (v > 0) r.entrate = cent(r.entrate + Math.abs(imp));
      else       r.uscite  = cent(r.uscite  + Math.abs(imp));
    });
    r.saldo = cent(r.entrate - r.uscite);
    return r;
  }

  /* Quanto è passato da ogni causale nel periodo. È il riepilogo che risponde
     alla domanda «dove sono finiti i soldi questo mese», ed è ordinato per
     importo perché la prima riga è quella che interessa. */
  function perCausale(movimenti, causali, opz) {
    opz = opz || {};
    var idx = indice(causali);
    var acc = {};
    vivi(movimenti).forEach(function (m) {
      if (opz.dal && (!m.data || m.data < opz.dal)) return;
      if (opz.al  && (!m.data || m.data > opz.al))  return;
      var imp = numero(m.importo);
      if (imp == null) return;
      var c = idx[m.causale_id];
      var k = m.causale_id || '—';
      if (!acc[k]) {
        acc[k] = {
          causale_id: m.causale_id || null,
          nome: c ? c.nome : 'Causale sconosciuta',
          codice: c ? c.codice : null,
          segno: c ? c.segno : null,
          incide_su_utile: c ? !!c.incide_su_utile : null,
          totale: 0, righe: 0,
          /* Una causale che il sistema non conosce si VEDE: sparire in
             silenzio vorrebbe dire che un refuso toglie dei soldi da un
             riepilogo e non se ne accorge nessuno. */
          ignota: !c
        };
      }
      acc[k].totale = cent(acc[k].totale + Math.abs(imp));
      acc[k].righe++;
    });
    return Object.keys(acc).map(function (k) { return acc[k]; })
      .sort(function (a, b) { return b.totale - a.totale; });
  }

  /* ═══ LA GIORNATA, RICOSTRUITA DAI MOVIMENTI (M5) ═════════════════════════

     Fino alla M5 la giornata si DIGITAVA: contanti, versamenti, spese, fondo
     cassa, POS. Sessantotto giorni cosi', a mano. Adesso che i movimenti
     esistono (M3) e che gli incassi ci arrivano (M4), la stessa giornata si
     puo' RICOSTRUIRE — e le due cose messe una accanto all'altra sono la
     quadratura (regola 7) applicata al giorno invece che al conto.

     Il semaforo ha TRE luci, non due, ed e' sempre la stessa regola:
       verde  — dichiarato e ricostruito coincidono;
       rosso  — non coincidono, e la differenza si legge;
       grigio — nessun movimento registrato quel giorno: non si puo' dire.
     Il grigio non e' un verde prudente: e' l'unica risposta onesta quando non
     c'e' niente con cui confrontare. */
  function giornata(data, movimenti, conti, opz) {
    opz = opz || {};
    var g = testo(data);
    var causali = opz.causali ? indice(opz.causali) : null;
    var r = { data: g, entrate: 0, uscite: 0, saldo: 0, righe: 0, per_conto: [] };
    var acc = {};
    vivi(movimenti).forEach(function (m) {
      if (testo(m.data) !== g) return;
      var imp = numero(m.importo);
      if (imp == null) return;
      var v = versoDi(m, causali);
      if (!v) return;
      r.righe++;
      if (v > 0) r.entrate = cent(r.entrate + Math.abs(imp));
      else       r.uscite  = cent(r.uscite  + Math.abs(imp));
      var k = m.conto_id || '—';
      if (!acc[k]) acc[k] = { conto_id: m.conto_id || null, entrate: 0, uscite: 0, righe: 0 };
      if (v > 0) acc[k].entrate = cent(acc[k].entrate + Math.abs(imp));
      else       acc[k].uscite  = cent(acc[k].uscite  + Math.abs(imp));
      acc[k].righe++;
    });
    r.saldo = cent(r.entrate - r.uscite);
    var idx = indice(conti);
    r.per_conto = Object.keys(acc).map(function (k) {
      var c = idx[k];
      return Object.assign(acc[k], {
        nome: c ? c.nome : 'conto sconosciuto',
        tipologia: c ? c.tipologia : null,
        natura: c ? c.natura : null,
        saldo: cent(acc[k].entrate - acc[k].uscite),
        /* Il saldo del conto A FINE GIORNATA, non solo il movimento del
           giorno: e' quello che si confronta con la cassa contata. */
        saldo_fine: c ? saldo(c, movimenti, { causali: opz.causali, al: g }).saldo : null
      });
    }).sort(function (a, b) { return (b.entrate + b.uscite) - (a.entrate + a.uscite); });
    return r;
  }

  /* Il fondo cassa non si scrive piu': e' il saldo delle CASSE, calcolato.
     Le casse sono i conti di tipologia `cassa` — un conto corrente non e'
     fondo cassa, e sommarli darebbe un numero che non si puo' contare. */
  function fondoCassa(conti, movimenti, opz) {
    opz = opz || {};
    var casse = (conti || []).filter(function (c) { return c && c.tipologia === 'cassa' && c.attivo !== false; });
    var tot = 0;
    var righe = casse.map(function (c) {
      var s = saldo(c, movimenti, { causali: opz.causali, al: opz.al });
      tot = cent(tot + s.saldo);
      return { conto_id: c.id, nome: c.nome, saldo: s.saldo, movimenti: s.movimenti };
    });
    return { totale: cent(tot), casse: righe, quante: casse.length };
  }

  /* Il semaforo di una giornata. `dichiarato` e' quello che una persona ha
     scritto (la vecchia quadratura a mano), `ricostruito` quello che dicono i
     movimenti. */
  function semaforoGiornata(ric, dichiarato, opz) {
    opz = opz || {};
    var d = numero(dichiarato);
    var out = { data: ric ? ric.data : null, ricostruito: ric ? ric.saldo : null, dichiarato: d, differenza: null };
    if (!ric || !ric.righe) {
      out.stato = 'grigio';
      out.motivo = 'Nessun movimento registrato in questa giornata: non c\u2019e\u2019 niente da confrontare.';
      return out;
    }
    if (d == null) {
      out.stato = 'grigio';
      out.motivo = 'Nessun dato dichiarato per questa giornata: il ricostruito c\u2019e\u2019, il termine di paragone no.';
      return out;
    }
    out.differenza = cent(out.ricostruito - d);
    out.stato = Math.abs(out.differenza) <= TOLLERANZA ? 'verde' : 'rosso';
    if (out.stato === 'rosso') {
      out.motivo = out.differenza > 0
        ? 'I movimenti dicono ' + euro(Math.abs(out.differenza)) + ' in piu\u2019 di quanto e\u2019 stato dichiarato.'
        : 'E\u2019 stato dichiarato ' + euro(Math.abs(out.differenza)) + ' in piu\u2019 di quanto risulta dai movimenti.';
    }
    return out;
  }

  /* ═══ LE ANOMALIE (M5) ════════════════════════════════════════════════════

     Non sono «gli errori»: sono le cose che, lasciate li', diventano un numero
     sbagliato in un rendiconto. Ognuna dice che cosa fare, perche' un elenco
     di problemi senza il verbo e' un elenco che nessuno guarda due volte.

     E una regola sopra tutte: **un'anomalia che non si puo' verificare non si
     dichiara**. Se i movimenti non sono stati letti, qui non compare «tutto a
     posto» — non si sa, ed e' un'altra cosa. */
  function anomalie(dati) {
    dati = dati || {};
    var oggi = testo(dati.oggi) || new Date().toISOString().slice(0, 10);
    var conti = dati.conti || [], movimenti = dati.movimenti || [];
    var sospesi = dati.sospesi || [], titoli = dati.titoli || [], causali = dati.causali || [];
    var out = [];
    var agg = function (gravita, titolo, quanti, importo, dafare) {
      out.push({ gravita: gravita, titolo: titolo, quanti: quanti, importo: importo == null ? null : cent(importo), dafare: dafare });
    };

    /* 1. Incassi fermi da piu' di quanto quel mezzo ci mette (M4). */
    var rit = sospesiAperti(sospesi).filter(function (s) { return inRitardo(s, oggi); });
    if (rit.length) agg('rosso', 'Incassi che non arrivano', rit.length,
      rit.reduce(function (a, s) { return a + (numero(s.importo) || 0); }, 0),
      'Controlla in banca: sono fermi da piu\u2019 giorni di quelli che quel mezzo ci mette.');

    /* 2. Rate incassate che in contabilita' non sono mai entrate: il conto non
          sa di quei soldi, e il saldo e' piu' basso del vero. */
    var dentro = {};
    vivi(movimenti).forEach(function (m) { if (m.titolo_id) dentro[m.titolo_id] = true; });
    (sospesi || []).forEach(function (s) { if (s.titolo_id && s.stato !== 'annullato') dentro[s.titolo_id] = true; });
    var fuori = (titoli || []).filter(function (t) { return t && t.id && !dentro[t.id]; });
    if (fuori.length) agg('giallo', 'Rate incassate che il conto non sa', fuori.length,
      fuori.reduce(function (a, t) { return a + (numero(t.importo_lordo) || 0); }, 0),
      'Portale in contabilita\u2019 da «Incassi da accreditare».');

    /* 3. Conti che non dicono che mezzi ricevono: finche' e' cosi', ogni
          incasso legge «non si sa» e non si puo' registrare. */
    var muti = (conti || []).filter(function (c) { return c && c.attivo !== false && !(c.mezzi || []).length; });
    if (muti.length) agg('giallo', 'Conti che non dicono che cosa ricevono', muti.length, null,
      'Aprili in Strumenti \u203a Conti e causali e spunta i mezzi: senza, gli incassi non sanno dove andare.');

    /* 4. Nessuna cassa contanti: un incasso in contanti non ha dove andare. */
    if (!(conti || []).some(function (c) { return c && c.tipologia === 'cassa' && c.attivo !== false; })) {
      agg('giallo', 'Nessuna cassa contanti', 1, null,
        'Creala in Strumenti \u203a Conti e causali: senza, i contanti restano fuori dalla contabilita\u2019.');
    }

    /* 5. Movimenti la cui causale non esiste piu': non hanno un verso, quindi
          NON entrano nei saldi — e un saldo a cui manca una riga non torna. */
    var cau = indice(causali);
    var orfani = vivi(movimenti).filter(function (m) { return m.causale_id && !cau[m.causale_id]; });
    if (orfani.length) agg('rosso', 'Movimenti senza causale', orfani.length,
      orfani.reduce(function (a, m) { return a + (numero(m.importo) || 0); }, 0),
      'Riaprili e rimetti una causale: senza, non hanno un verso e restano fuori dai saldi.');

    /* 6. Conti mai verificati (regola 7): il saldo c'e' e nessuno l'ha mai
          confrontato con la banca. */
    if (dati.quadrature) {
      var mai = quadrature((conti || []).filter(function (c) { return c.attivo !== false; }),
                           movimenti, dati.quadrature, { causali: causali, al: oggi })
        .filter(function (q) { return q.quadra === null; });
      if (mai.length) agg('giallo', 'Conti mai verificati', mai.length, null,
        'Dichiara il saldo che dice la banca in Contabilita\u2019 \u203a Quadratura conti.');
      var storti = quadrature((conti || []).filter(function (c) { return c.attivo !== false; }),
                              movimenti, dati.quadrature, { causali: causali, al: oggi })
        .filter(function (q) { return q.quadra === false; });
      if (storti.length) agg('rosso', 'Conti che non quadrano', storti.length,
        storti.reduce(function (a, q) { return a + Math.abs(q.differenza || 0); }, 0),
        'Guarda la differenza: o c\u2019e\u2019 un movimento di troppo, o ne manca uno.');
    }

    out.sort(function (a, b) {
      var p = { rosso: 0, giallo: 1 };
      return (p[a.gravita] - p[b.gravita]) || ((b.importo || 0) - (a.importo || 0));
    });
    return out;
  }

  /* ═══ LA QUADRATURA DEI CONTI (M3) ════════════════════════════════════════ */

  /* Regola 7. Due numeri e la loro differenza:
       ricostruito = saldo iniziale + tutti i movimenti vivi fino a quella data
       dichiarato  = quello che dice la banca, o chi ha contato la cassa

     `quadra` ha TRE valori, non due: true, false e **null**. `null` vuol dire
     che nessuno ha ancora dichiarato un saldo per quel conto — e un conto mai
     verificato che si mostra come «quadra» è la bugia più comoda che un
     sistema di contabilità possa raccontare.

     La tolleranza esiste ed è UN CENTESIMO, non «qualche euro»: serve solo
     agli arrotondamenti, non a far passare una differenza vera. */
  var TOLLERANZA = 0.01;

  function quadratura(conto, movimenti, dichiarazioni, opz) {
    opz = opz || {};
    var al = testo(opz.al) || null;
    /* L'ultima dichiarazione utile: la più recente che non sta nel futuro
       rispetto alla data a cui si sta guardando. */
    var mie = (dichiarazioni || []).filter(function (d) {
      return d && conto && d.conto_id === conto.id && testo(d.data) && (!al || d.data <= al);
    }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
    var d = mie[0] || null;

    /* Il confronto si fa ALLA DATA DELLA DICHIARAZIONE, non a oggi: un
       estratto conto del 31/08 non sa niente dei movimenti di settembre, e
       confrontarlo col saldo di oggi produrrebbe una differenza inventata. */
    var alConfronto = d ? d.data : al;
    var s = saldo(conto, movimenti, { causali: opz.causali, al: alConfronto });

    var out = {
      conto_id: conto ? conto.id : null,
      nome: conto ? conto.nome : null,
      natura: conto ? conto.natura : null,
      al: alConfronto || null,
      ricostruito: s.saldo,
      movimenti: s.movimenti,
      dichiarato: null,
      differenza: null,
      quadra: null,
      dichiarata_il: null,
      nota: null,
      /* Il saldo di OGGI resta comunque leggibile: è quello che serve a sapere
         quanti soldi ci sono, indipendentemente dall'ultima verifica. */
      saldo_oggi: saldo(conto, movimenti, { causali: opz.causali, al: al }).saldo
    };
    if (!d) {
      out.motivo = 'Nessun saldo dichiarato per questo conto: non è mai stata fatta una quadratura. Non vuol dire che quadri.';
      return out;
    }
    var dich = numero(d.saldo_dichiarato);
    if (dich == null) {
      out.motivo = 'Il saldo dichiarato non si legge come un numero.';
      return out;
    }
    out.dichiarato = cent(dich);
    out.differenza = cent(out.ricostruito - out.dichiarato);
    out.quadra = Math.abs(out.differenza) <= TOLLERANZA;
    out.dichiarata_il = d.data;
    out.nota = d.nota || null;
    if (!out.quadra) {
      out.motivo = out.differenza > 0
        ? 'Il sistema ha ' + euro(Math.abs(out.differenza)) + ' in più della banca: o c’è un movimento registrato due volte, o uno che non è mai uscito.'
        : 'La banca ha ' + euro(Math.abs(out.differenza)) + ' in più del sistema: c’è un movimento che non è stato registrato.';
    }
    return out;
  }

  function quadrature(conti, movimenti, dichiarazioni, opz) {
    return (conti || []).map(function (c) { return quadratura(c, movimenti, dichiarazioni, opz); });
  }

  /* ═══ IL DETTAGLIO DI UN CONTO (Blocco 3 · punto 7, 20/09/2026) ═══════════

     L'elenco dei conti dice un saldo per riga. «Perché è quello?» non aveva
     risposta da nessuna parte: per saperlo bisognava aprire la prima nota e
     filtrarla a mano, cioè fare a mano il lavoro che il conto dovrebbe fare
     da sé.

     ── LO STORICO DELLE QUADRATURE NON SI CONGELA, E NON È UNA DIMENTICANZA ──
     Ogni dichiarazione passata viene RICALCOLATA con i movimenti di adesso.
     È l'opposto di quello che si fa coi requisiti di un fascicolo, che si
     congelano (CLAUDE.md §11 regola 4), e la differenza è la natura dei due
     numeri: la dichiarazione è un fatto della banca e non cambia mai, la
     ricostruzione è quello che il SISTEMA dice oggi per quella data.

     Se qualcuno scrive un movimento con una data vecchia, un giorno che
     quadrava smette di quadrare — ed è esattamente la cosa che si vuole
     vedere. Congelando la differenza, la scrittura retroattiva sparirebbe
     dalla vista: cioè si nasconderebbe proprio il caso per cui la quadratura
     esiste. */
  function storicoQuadrature(conto, movimenti, dichiarazioni, opz) {
    opz = opz || {};
    var mie = (dichiarazioni || []).filter(function (d) {
      return d && conto && d.conto_id === conto.id && testo(d.data);
    }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });

    return mie.map(function (d) {
      var s = saldo(conto, movimenti, { causali: opz.causali, al: d.data });
      var dich = numero(d.saldo_dichiarato);
      var out = {
        data: d.data, nota: d.nota || null,
        dichiarato: dich == null ? null : cent(dich),
        ricostruito: s.saldo, movimenti: s.movimenti,
        differenza: null, quadra: null, motivo: null
      };
      if (dich == null) {
        out.motivo = 'Il saldo dichiarato non si legge come un numero.';
        return out;
      }
      out.differenza = cent(out.ricostruito - out.dichiarato);
      out.quadra = Math.abs(out.differenza) <= TOLLERANZA;
      if (!out.quadra) {
        out.motivo = out.differenza > 0
          ? 'A quella data il sistema ha ' + euro(Math.abs(out.differenza)) + ' in più della dichiarazione.'
          : 'A quella data la dichiarazione ha ' + euro(Math.abs(out.differenza)) + ' in più del sistema.';
      }
      return out;
    });
  }

  /* Tutto quello che serve per guardare UN conto.

     ── IL PROGRESSIVO PARTE SEMPRE DALL'INIZIO ──
     `dal`/`al` tagliano le righe da MOSTRARE, non quelle da contare: un saldo
     progressivo che riparte dal saldo iniziale in mezzo a un periodo è un
     numero falso, e falso in un modo che nessuno controlla — sembra un saldo.
     Quindi il conto si fa su tutto e si mostra una finestra, con il saldo di
     apertura del periodo scritto accanto.

     ── QUELLO CHE RESTA FUORI DAL SALDO SI DICHIARA ──
     Un movimento senza verso (causale sparita) o con un importo illeggibile
     non entra nel saldo, ed è giusto: non si indovina. Ma un saldo che ignora
     delle righe in silenzio è un saldo di cui nessuno può fidarsi, quindi si
     conta quante sono e quanto pesano — senza segno, perché il verso è
     proprio la cosa che non si sa. */
  function dettaglioConto(conto, movimenti, dichiarazioni, opz) {
    opz = opz || {};
    var causali = opz.causali || null;
    var miei = (movimenti || []).filter(function (m) {
      return m && conto && m.conto_id === conto.id;
    });
    var tutte = progressivo(conto, miei, { causali: causali });   /* solo i vivi */
    var dal = testo(opz.dal) || null, al = testo(opz.al) || null;

    var dentro = tutte, apertura = numero(conto && conto.saldo_iniziale) || 0;
    if (dal || al) {
      dentro = [];
      for (var i = 0; i < tutte.length; i++) {
        var d = testo(tutte[i].movimento.data);
        /* Un movimento senza data non si può collocare in un periodo: resta
           nel saldo di oggi ma fuori dalla finestra, e si dice. */
        var ok = !!d && (!dal || d >= dal) && (!al || d <= al);
        if (ok) dentro.push(tutte[i]);
        else if (!dentro.length) apertura = tutte[i].saldo;   /* tutto ciò che precede */
      }
    }

    var incerte = tutte.filter(function (r) { return r.incerto; });
    var fuori = 0;
    incerte.forEach(function (r) {
      var imp = numero(r.movimento.importo);
      if (imp != null) fuori = cent(fuori + Math.abs(imp));
    });
    var annullati = miei.filter(function (m) { return !vivo(m); });
    var date = tutte.map(function (r) { return testo(r.movimento.data); }).filter(Boolean);

    return {
      conto: conto || null,
      iniziale: cent(numero(conto && conto.saldo_iniziale) || 0),
      saldo: saldo(conto, miei, { causali: causali }).saldo,
      apertura: cent(apertura),
      righe: dentro,                 /* in ordine di data, dalla più vecchia */
      totali: tutte.length,
      mostrate: dentro.length,
      primo: date.length ? date[0] : null,
      ultimo: date.length ? date[date.length - 1] : null,
      annullati: annullati.length,
      fuori_dal_saldo: { righe: incerte.length, importo: fuori },
      /* Il riepilogo per causale segue la FINESTRA che si sta guardando: è la
         risposta a «in questo periodo, che cosa ha mosso questo conto». */
      per_causale: perCausale(miei, opz.causali || [], { dal: dal || null, al: al || null }),
      quadrature: storicoQuadrature(conto, miei, dichiarazioni, { causali: causali })
    };
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
    /* M3 — la prima nota e la quadratura */
    validaMovimento: validaMovimento, riepilogo: riepilogo, perCausale: perCausale,
    quadratura: quadratura, quadrature: quadrature,
    /* Blocco 3 · punto 7 — il dettaglio di un conto */
    dettaglioConto: dettaglioConto, storicoQuadrature: storicoQuadrature,
    vivo: vivo, vivi: vivi, versoDi: versoDi, TOLLERANZA: TOLLERANZA,
    /* M4 — gli incassi da accreditare */
    MEZZI: MEZZI, mezzo: mezzo, contoPerMezzo: contoPerMezzo, destinoIncasso: destinoIncasso,
    giorniDa: giorniDa, inRitardo: inRitardo, sospesiAperti: sospesiAperti,
    riepilogoSospesi: riepilogoSospesi, validaAccredito: validaAccredito,
    /* M5 — la giornata ricostruita, il fondo cassa, le anomalie */
    giornata: giornata, fondoCassa: fondoCassa, semaforoGiornata: semaforoGiornata,
    anomalie: anomalie,
    eliminabile: eliminabile, causaleEliminabile: causaleEliminabile,
    ibanValido: ibanValido, normalizzaIban: normalizzaIban, ibanBello: ibanBello,
    coordinateRimesse: coordinateRimesse,
    etichetta: etichetta, segnoDi: segnoDi, cent: cent, numero: numero, euro: euro
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Contabilita = API;
})();
