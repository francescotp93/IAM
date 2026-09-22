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

   ─── AGGIUNTO CON LA FASE 1 (21/09/2026): LA PARTITA DOPPIA ─────────────────

  11. **Dare oppure Avere, mai tutti e due sulla stessa riga**, e un movimento
      registrato ha almeno due righe che si pareggiano al centesimo. Una riga
      con 100 di qua e 100 di la' si legge come «zero», e allora due righe
      diverse darebbero lo stesso saldo: un totale sbagliato smetterebbe di
      distinguersi da uno giusto guardando le cifre. E' anche il solo controllo
      che da solo si accorge di un movimento scritto male.

  12. **Quello che non si puo' contare non si quadra.** Si mette in quadratura
      solo un conto che ha una realta' contro cui confrontarsi — il cassetto,
      gli assegni, l'estratto conto della banca. Un conto di crediti non ce
      l'ha: il suo saldo si legge nello scadenzario, riga per riga. Chiedere di
      quadrarlo vorrebbe dire pretendere un numero che nessuno puo' verificare.

  13. **Un movimento registrato non si riscrive: si storna.** Lo storno e' un
      movimento NUOVO, con le righe rovesciate, che punta all'originale. Il
      saldo torna quello di prima e restano a registro tutti e due i fatti —
      quello sbagliato e la correzione. Riscrivere il primo li cancellerebbe
      tutti e due, e resterebbe solo il numero giusto senza la storia di come
      ci si e' arrivati.

   Il motore NON tocca il database e NON disegna: calcola e valida. Lo
   caricano IAM (`iam/index.html`) e il preventivatore, dallo stesso indirizzo
   e dallo stesso file — due copie del vocabolario dei conti vorrebbero dire
   due contabilità della stessa agenzia.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = '2026-09-21a';

  /* ═══ VOCABOLARI ══════════════════════════════════════════════════════════ */

  /* Che cos'è materialmente il conto. Serve a chi legge e servirà ai
     riepiloghi: il fondo cassa teorico (M5) si conta sulle casse, non su tutto
     quello che ha un saldo. */
  var TIPOLOGIE = [
    { k: 'banca',              l: 'Conto corrente bancario', i: 'ti-building-bank' },
    { k: 'cassa',              l: 'Cassa contanti',          i: 'ti-wallet' },
    { k: 'conto_assicurativo', l: 'Conto assicurativo',      i: 'ti-shield-check' },
    /* Le quattro tipologie della Fase 1. Non sono decorazione: la prima nota a
       partita doppia ha bisogno di una contropartita per ogni riga, e senza un
       posto dove metterla la contropartita finisce «in altro» — cioè in un
       mucchio dove un POS da accreditare e un credito verso un collaboratore
       si sommano nello stesso numero. */
    { k: 'transitorio',        l: 'Transitorio (denaro per strada)', i: 'ti-arrow-right-circle' },
    { k: 'credito',            l: 'Crediti (sospesi)',       i: 'ti-clock-dollar' },
    { k: 'debito',             l: 'Debiti e crediti verso terzi', i: 'ti-scale' },
    { k: 'rettifica',          l: 'Rettifiche (abbuoni)',    i: 'ti-adjustments' },
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
     quadratura (regola 7) lo troverebbe sbagliato senza saper dire perche'.

     ── LE CHIAVI SONO QUELLE DEL DATABASE, E NON SI SCELGONO QUI ────────────
     Misurato il 21/09/2026, e costava un guasto muto: questo elenco era nato
     il 20/09 con due chiavi sue — al singolare la prima, una sigla la penultima
     — mentre `quote_titoli.mezzo_pagamento` e `quote_polizze.mezzo_pagamento`
     hanno un vincolo CHECK che ammette altri nomi. Due su nove divergevano, e
     una delle due era proprio quella dei CONTANTI, cioe' il solo mezzo
     `immediato`, il solo che fa muovere il conto lo stesso giorno.

     Che cosa succedeva, senza nessun errore e senza niente di rosso: una rata
     incassata in contanti arrivava a `destinoIncasso`, che non ritrovava la
     sua chiave nel vocabolario e rispondeva «non si sa»; e la spunta
     «Contanti» messa su un conto non poteva incrociare NESSUNA rata, perche'
     quella parola sul database non e' ammessa. La cassa contanti configurata
     a puntino restava inerte per costruzione.

     La regola, da qui in avanti: **il vocabolario e' uno solo, ed e' quello
     del vincolo del database** — perche' e' l'unico che non si puo' cambiare
     senza riscrivere delle righe gia' scritte. Le etichette si traducono, le
     chiavi no. Una prova confronta i quattro posti in cui questo elenco vive
     (la migrazione, questo motore, il lettore dei flussi e la tendina della
     pagina Titoli) e diventa rossa se uno si scosta. */
  var MEZZI = [
    { k: 'contante',      l: 'Contanti',            immediato: true,  i: 'ti-cash' },
    { k: 'pos',           l: 'POS',                 immediato: false, i: 'ti-credit-card', giorni: 2 },
    { k: 'bonifico',      l: 'Bonifico',            immediato: false, i: 'ti-building-bank', giorni: 3 },
    { k: 'assegno',       l: 'Assegno',             immediato: false, i: 'ti-file-invoice', giorni: 7 },
    { k: 'carta_credito', l: 'Carta di credito',    immediato: false, i: 'ti-credit-card', giorni: 3 },
    { k: 'prepagata',     l: 'Prepagata',           immediato: false, i: 'ti-credit-card', giorni: 3 },
    { k: 'paypal',        l: 'PayPal',              immediato: false, i: 'ti-brand-paypal', giorni: 3 },
    { k: 'domiciliazione', l: 'Domiciliazione (SDD)', immediato: false, i: 'ti-repeat', giorni: 5 },
    { k: 'altro',         l: 'Altro',               immediato: false, i: 'ti-dots' }
  ];

  var SEGNI = [
    { k: 'entrata', l: 'Entrata', segno: 1 },
    { k: 'uscita',  l: 'Uscita',  segno: -1 }
  ];

  /* ═══ IL GENERE DI UNA CAUSALE (Fase 1) ═══════════════════════════════════

     `segno` dice il VERSO, `genere` dice CHI ha scritto il movimento. Sono due
     domande diverse e senza la seconda restano due indovinelli:

     · quale causale proporre dentro quale flusso (l'incasso di una rata non
       propone «Pagamento affitti»);
     · se un movimento l'ha scritto il sistema o una persona. Un movimento nato
       da un incasso non si corregge dalla prima nota ma DOVE È NATO — altrimenti
       la rata e la prima nota direbbero due cose diverse, e nessuna delle due
       saprebbe di essere quella sbagliata (CLAUDE.md §29).

     Le chiavi sono italiane come tutto il resto della casa: la specifica le
     scrive in inglese (`premium_collection`, `suspense_opening`…) ma è un
     documento funzionale, non un contratto di database — e un vocabolario
     metà in inglese dentro `iam_causali.natura`/`segno`/`codice` sarebbe la
     stessa malattia dei due vocabolari dei mezzi di pagamento. */
  var GENERI = [
    { k: 'incasso_premio',   l: 'Incasso di un premio',        i: 'ti-cash',        sistema: true,
      nota: 'Nasce quando si incassa una rata. Si corregge dall’incasso, non dalla prima nota.' },
    { k: 'apertura_credito', l: 'Apertura di un sospeso',      i: 'ti-clock-dollar', sistema: true,
      nota: 'La rata è a copertura e il denaro non è ancora arrivato.' },
    { k: 'recupero_credito', l: 'Recupero di un sospeso',      i: 'ti-arrow-back-up', sistema: true,
      nota: 'Il denaro arriva dopo e riduce il residuo del sospeso.' },
    { k: 'giroconto',        l: 'Giroconto fra due conti',     i: 'ti-transfer',    sistema: false,
      nota: 'Lo stesso denaro che cambia posto: versamento, prelievo, accredito del POS.' },
    { k: 'storno',           l: 'Storno di un movimento',      i: 'ti-rotate-2',    sistema: true,
      nota: 'Il movimento inverso che annulla un altro movimento e resta a registro.' },
    { k: 'manuale',          l: 'Scritta a mano in prima nota', i: 'ti-pencil',     sistema: false,
      nota: 'Affitti, utenze, stipendi, spese: le scrive una persona.' }
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

  /* ═══ I DODICI CONTI MINIMI (Fase 1) ══════════════════════════════════════

     Sono la tabella §5 della specifica, tradotta nei campi di `iam_conti`.

     ┌─────────────────────────────────────────────────────────────────────────┐
     │ STANNO QUI E NON NELLA MIGRAZIONE, ED È LA COSA PIÙ IMPORTANTE DI       │
     │ TUTTO IL BLOCCO.                                                        │
     │                                                                         │
     │ Una migrazione che semina dodici conti mette nella contabilità          │
     │ dell'agenzia dodici conti che nessuno ha deciso, tutti con saldo zero,  │
     │ e da domani quello zero è un dato (regola di casa §8.1). Le dieci       │
     │ causali della M1 sono state seminate perché sono un VOCABOLARIO; un     │
     │ conto è un posto dove stanno dei soldi, e ha un saldo.                  │
     │                                                                         │
     │ Quindi: qui c'è la PROPOSTA, la schermata la mostra con i campi         │
     │ modificabili, e a creare è una persona. Chi ne crea sei su dodici ne ha │
     │ creati sei: non manca niente, mancano sei conti che non gli servono.    │
     └─────────────────────────────────────────────────────────────────────────┘

     Perché non c'è un `codice`: `iam_conti` non ha quella colonna e la chiave
     leggibile è il NOME, che è già unico (`validaConto` lo controlla, e c'è un
     indice). La specifica dice «se IAM possiede già un sistema di codici,
     rispettarlo»: qui il sistema è il nome per i conti e il codice per le
     causali, e aggiungerne un secondo vorrebbe dire due modi di nominare la
     stessa cosa.

     `natura` è **premi** su tutti e dodici, e non è una svista: sono i dodici
     posti in cui passa il denaro DEI CLIENTI dal momento in cui lo pagano a
     quello in cui arriva in compagnia. Le due rettifiche sono il caso che si
     discute — un abbuono lo sopporta l'agenzia — ma il movimento in cui
     compaiono è la chiusura di un incasso di premi, e lì vivono. Il giorno in
     cui l'abbuono dovrà pesare sul conto economico dell'agenzia si deciderà
     con la Fase 2, che è quella che li scrive: oggi nessuno li scrive.

     `mezzi` resta VUOTO su tutti. Quale mezzo arriva su quale conto è una
     decisione dell'agenzia (regola 9), e proporla vorrebbe dire che un giorno
     un POS si accredita sul conto sbagliato perché nessuno ha letto la
     proposta. */
  var CONTI_MINIMI = [
    { nome: 'Cassa contanti',              tipologia: 'cassa',              natura: 'premi', ordine: 10,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'I contanti che stanno nel cassetto. Si quadra contandoli.' },
    { nome: 'Assegni da versare',          tipologia: 'cassa',              natura: 'premi', ordine: 20,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'Gli assegni ricevuti e non ancora versati. Si quadra contando i pezzi di carta.' },
    { nome: 'Banca assicurativa',          tipologia: 'conto_assicurativo', natura: 'premi', ordine: 30,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'Il conto separato dei premi (art. 117 CAP). Si quadra con l’estratto conto.' },
    { nome: 'POS da accreditare',          tipologia: 'transitorio',        natura: 'premi', ordine: 40,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'Il cliente ha pagato, l’accredito arriva dopo. Qui vive il tempo in mezzo.' },
    { nome: 'Sospesi clienti',             tipologia: 'credito',            natura: 'premi', ordine: 50,
      e_mezzo_pagamento: true,  e_conto_sospeso: true,  e_quadrabile: false,
      note: 'Premi messi a copertura e non ancora ricevuti dal cliente. Non si quadra contando: si legge nello scadenzario, riga per riga.' },
    { nome: 'Sospesi collaboratori',       tipologia: 'credito',            natura: 'premi', ordine: 60,
      e_mezzo_pagamento: true,  e_conto_sospeso: true,  e_quadrabile: false,
      note: 'Premi incassati da un collaboratore e non ancora rimessi in agenzia.' },
    { nome: 'Conto compagnia',             tipologia: 'debito',             natura: 'premi', ordine: 70,
      e_mezzo_pagamento: false, e_conto_sospeso: false, e_quadrabile: true,
      note: 'Quello che si deve alla compagnia. Non è un modo di pagare: è il debito che l’incasso crea.' },
    { nome: 'Conto collaborazione',        tipologia: 'debito',             natura: 'premi', ordine: 80,
      e_mezzo_pagamento: false, e_conto_sospeso: false, e_quadrabile: true,
      note: 'I rapporti con l’altra agenzia in collaborazione.' },
    { nome: 'Abbuoni passivi',             tipologia: 'rettifica',          natura: 'premi', ordine: 90,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'I centesimi che l’agenzia lascia per chiudere un incasso. Senza questo conto un incasso di 99,98 su 100,00 non quadra e nessuno sa dove mettere la differenza.' },
    { nome: 'Eccedenze e abbuoni attivi',  tipologia: 'rettifica',          natura: 'premi', ordine: 100,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'Il caso opposto: il cliente ha dato qualcosa in più.' },
    { nome: 'Incassi diretti in compagnia', tipologia: 'transitorio',       natura: 'premi', ordine: 110,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'Il cliente ha pagato la compagnia, non noi. La rata si chiude lo stesso e in agenzia non entra un euro.' },
    { nome: 'Partite da identificare',     tipologia: 'transitorio',        natura: 'premi', ordine: 120,
      e_mezzo_pagamento: true,  e_conto_sospeso: false, e_quadrabile: true,
      note: 'Il bonifico arrivato senza sapere di chi è. Un posto dichiarato dove metterlo è meglio di un posto scelto a caso.' }
  ];

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

    /* ── Fase 1: i tre flag ───────────────────────────────────────────────
       Sono booleani e hanno un default sul database, quindi «assente» vuol
       dire «il default»: si controlla solo quello che è stato scritto. */
    ['e_mezzo_pagamento', 'e_conto_sospeso', 'e_quadrabile'].forEach(function (f) {
      if (c[f] != null && c[f] !== true && c[f] !== false) e.push('Il campo «' + f + '» può essere solo sì o no.');
    });

    /* Un conto è di UNA compagnia o di UN collaboratore, mai di tutti e due:
       l'estratto conto verso la compagnia e quello verso il collaboratore
       sono due documenti diversi, e un conto che appartiene a entrambi
       finirebbe in tutti e due con lo stesso saldo. */
    if (c.compagnia_id && c.collaboratore_id) {
      e.push('Un conto si intesta a una compagnia oppure a un collaboratore, non a tutti e due: altrimenti lo stesso saldo comparirebbe in due estratti conto diversi.');
    }

    /* Il guasto muto del 21/09, in forma di avviso: la spunta «è un modo di
       pagare» senza nessun mezzo dichiarato non intercetta NIENTE — è la
       cassa contanti configurata a puntino e inerte per costruzione. */
    var quantiMezzi = Array.isArray(c.mezzi) ? c.mezzi.length : 0;
    if (c.e_mezzo_pagamento === true && quantiMezzi === 0) {
      avvisi.push('Questo conto è dichiarato «modo di pagare» ma non dice quali mezzi riceve: finché resta così, nessun incasso ci arriverà mai.');
    }
    if (c.e_mezzo_pagamento === false && quantiMezzi > 0) {
      avvisi.push('Questo conto dichiara dei mezzi di pagamento ma non è segnato come «modo di pagare»: uno dei due campi dice il contrario dell’altro.');
    }

    /* Regola 12: quello che non si può contare non si quadra. Un conto di
       crediti non ha una carta contro cui confrontarsi — il suo saldo si
       legge riga per riga nello scadenzario. */
    if (c.e_conto_sospeso === true && c.e_quadrabile === true) {
      avvisi.push('Un conto di crediti (sospesi) non si quadra contando: il suo saldo si controlla nello scadenzario, riga per riga. Togli la spunta «si quadra» se non hai una carta con cui confrontarlo.');
    }
    if (c.tipologia === 'debito' && c.e_mezzo_pagamento === true) {
      avvisi.push('Un conto di debito verso la compagnia non è un modo di pagare: è il debito che l’incasso crea. Controlla la spunta.');
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

    /* Fase 1. `genere` ha un default sul database (`manuale`), quindi assente
       vuol dire «scritta a mano»: si controlla solo quello che c'è scritto. */
    if (c.genere != null && c.genere !== '' && !etichetta(GENERI, c.genere)) e.push('Genere non valido: dice da quale flusso nasce il movimento.');

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
  /* ── QUANTO UN MOVIMENTO MUOVE UN CONTO ──────────────────────────────────

     Fino alla Fase 1 la risposta era una sola: un movimento aveva un conto e
     un importo in testata, e il verso lo dava la causale. Dalla Fase 2 un
     incasso può arrivare su DUE conti (metà in contanti, metà in banca) e
     creare il debito su un terzo: leggere la testata attribuirebbe tutto al
     primo conto — **un numero credibile e falso**, e la quadratura troverebbe
     ogni giorno una differenza senza saper dire da dove viene.

     Quindi: se il movimento ha delle RIGHE, il suo effetto su un conto è
     `Dare − Avere` di quelle righe. Se non le ha — e sono tutti i movimenti
     scritti prima del 20/09/2026 — si legge la testata, come prima. Non si
     inventa una contropartita che nessuno ha scritto (§8.1): si legge quello
     che c'è, e si dichiara quando è poco.

     `mieRighe` è nullo quando chi chiama non ha passato le righe: allora il
     motore NON sa se ce ne siano, e si comporta come prima. Un motore che
     desse per scontato «nessuna riga» direbbe che un movimento a due gambe
     non muove niente, che è peggio di leggerne una sola. */
  function effettoSuConto(m, conto, righePerMov, causali) {
    var mie = righePerMov ? (righePerMov[m.id] || []) : null;
    if (mie && mie.length) {
      var d = 0, a = 0, tocca = false;
      for (var i = 0; i < mie.length; i++) {
        if (!conto || mie[i].conto_id === (conto && conto.id)) {
          d = cent(d + (numero(mie[i].dare) || 0));
          a = cent(a + (numero(mie[i].avere) || 0));
          tocca = true;
        }
      }
      if (!tocca) return { tocca: false, delta: 0, incerto: false, verso: 0 };
      var dl = cent(d - a);
      return { tocca: true, delta: dl, incerto: false, verso: dl === 0 ? 0 : (dl > 0 ? 1 : -1), dare: d, avere: a };
    }
    if (conto && m.conto_id !== conto.id) return { tocca: false, delta: 0, incerto: false, verso: 0 };
    var imp = numero(m.importo);
    var v = versoDi(m, causali);
    if (imp == null || !v) return { tocca: true, delta: 0, incerto: true, verso: v || 0 };
    return { tocca: true, delta: cent(v * Math.abs(imp)), incerto: false, verso: v };
  }

  /* Le righe raggruppate per movimento, una volta sola: chi somma cinquemila
     movimenti non deve filtrare cinquemila volte lo stesso elenco. */
  function perMovimento(righe) {
    if (!righe) return null;
    var m = {};
    (righe || []).forEach(function (r) {
      if (!r || !r.movimento_id) return;
      (m[r.movimento_id] = m[r.movimento_id] || []).push(r);
    });
    return m;
  }

  function saldo(conto, movimenti, opz) {
    opz = opz || {};
    var causali = opz.causali ? indice(opz.causali) : null;
    var perMov = opz.righe ? perMovimento(opz.righe) : null;
    var tot = numero(conto && conto.saldo_iniziale) || 0;
    var n = 0;
    (movimenti || []).forEach(function (m) {
      if (!vivo(m)) return;                 /* regola 5 */
      if (opz.al) { if (!m.data || m.data > opz.al) return; }
      if (opz.dal && m.data && m.data < opz.dal) return;
      var e = effettoSuConto(m, conto, perMov, causali);
      if (!e.tocca || e.incerto) return;    /* verso sconosciuto: non si indovina */
      tot += e.delta;
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
    var perMov = opz.righe ? perMovimento(opz.righe) : null;
    var righe = vivi(movimenti).filter(function (m) {
      return effettoSuConto(m, conto, perMov, causali).tocca;
    });
    righe.sort(function (a, b) {
      var da = testo(a.data), db = testo(b.data);
      if (da !== db) return da < db ? -1 : 1;
      var ca = testo(a.creato_il), cb = testo(b.creato_il);
      if (ca !== cb) return ca < cb ? -1 : 1;
      return testo(a.id) < testo(b.id) ? -1 : 1;
    });
    var tot = numero(conto && conto.saldo_iniziale) || 0;
    return righe.map(function (m) {
      var e = effettoSuConto(m, conto, perMov, causali);
      tot += e.incerto ? 0 : e.delta;
      return { movimento: m, verso: e.verso, delta: cent(e.incerto ? 0 : e.delta),
               saldo: cent(tot), incerto: e.incerto };
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
  /* `opz.righe` non è un raffinamento: senza, un conto che vive SOLO nelle
     righe — il debito verso una compagnia, il conto dei sospesi, che in
     testata non compaiono mai — risulta senza movimenti, e la schermata offre
     di cancellarlo. Cancellarlo renderebbe orfani proprio i movimenti che lo
     hanno mosso, ed è la regola 4 aggirata senza che nessuno l'abbia decisa. */
  function eliminabile(conto, movimenti, opz) {
    opz = opz || {};
    var perMov = opz.righe ? perMovimento(opz.righe) : null;
    var n = (movimenti || []).filter(function (m) {
      return m && effettoSuConto(m, conto, perMov, null).tocca;
    }).length;
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

  /* Gli stessi conti guardati DALL'ALTRA PARTE: non «dove va questo mezzo» ma
     «quali mezzi non hanno una destinazione sola». `contoPerMezzo` risponde a
     una rata alla volta, e se ne accorge solo quando quella rata arriva;
     questo lo dice PRIMA che arrivi, cioe' quando si sta ancora configurando.
     Torna solo i conflitti: un mezzo su un conto solo non e' una notizia. */
  function mezziInConflitto(conti) {
    var per = {};
    (conti || []).forEach(function (c) {
      if (!c || c.attivo === false) return;
      (c.mezzi || []).forEach(function (m) {
        var k = testo(m).toLowerCase();
        if (!k) return;
        (per[k] = per[k] || []).push(c.nome || '(senza nome)');
      });
    });
    return Object.keys(per).filter(function (k) { return per[k].length > 1; })
      .map(function (k) { return { mezzo: k, conti: per[k] }; });
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

  /* ═══ LA PARTITA DOPPIA (Fase 1, 21/09/2026) ══════════════════════════════

     Fin qui un movimento era UN conto e UN importo. Bastava per una prima nota
     di cassa e non basta per una contabilità assicurativa: quando un cliente
     paga 400 € di premio, quei 400 € entrano in cassa E diventano un debito
     verso la compagnia. Sono due fatti dello stesso evento, e un modello che
     ne registra uno solo lascia l'altro alla memoria di chi c'era.

     Da qui in avanti un movimento ha ALMENO DUE righe, e la somma di quelle in
     Dare è uguale alla somma di quelle in Avere. Non è una formalità da
     ragionieri: è il solo controllo che, da solo, si accorge di un movimento
     scritto male. Un importo sbagliato su un conto solo non lo vede nessuno;
     lo stesso importo sbagliato su due righe non quadra, e lo dice il database.

     Le tre regole nuove, e sono in fondo al file di testa come le altre dieci:

     11. **Dare oppure Avere, mai tutti e due sulla stessa riga.** Una riga con
         100 in Dare e 100 in Avere si legge come «zero», e allora due righe
         diverse darebbero lo stesso saldo: un totale sbagliato smetterebbe di
         distinguersi da uno giusto guardando le cifre.
     12. **Quello che non si può contare non si quadra.** Si mette in
         quadratura solo un conto che ha una realtà contro cui confrontarsi —
         il cassetto, gli assegni, l'estratto conto. Un conto di crediti non
         ce l'ha: si legge nello scadenzario, riga per riga.
     13. **Un movimento registrato non si riscrive: si storna.** Lo storno è un
         movimento NUOVO, con le righe rovesciate, che punta all'originale. Il
         saldo torna quello di prima e restano a registro tutti e due i fatti —
         quello sbagliato e la correzione. Riscrivere il primo li cancellerebbe
         tutti e due. */

  /* Quadra? Ritorna i due totali, la differenza e il motivo per esteso. È la
     stessa regola del trigger `iam_mov_bilancio`, detta prima e con parole che
     si capiscono: il controllo vero sta nel database perché la schermata è una
     delle strade, ma far fallire un `insert` per dire a una persona che ha
     scritto 90 invece di 100 è il modo peggiore di dirglielo. */
  function bilanciato(righe) {
    var r = (righe || []).filter(function (x) { return !!x; });
    var d = 0, a = 0;
    r.forEach(function (x) {
      d = cent(d + (numero(x.dare) || 0));
      a = cent(a + (numero(x.avere) || 0));
    });
    var diff = cent(d - a);
    var esito = { ok: false, dare: d, avere: a, differenza: diff, righe: r.length, motivo: null };

    if (r.length === 0) { esito.motivo = 'Il movimento non ha righe.'; return esito; }
    if (r.length < 2) {
      esito.motivo = 'C’è una riga sola: la partita doppia ne vuole almeno due — da dove esce il denaro e dove entra.';
      return esito;
    }
    if (diff !== 0) {
      esito.motivo = 'Il movimento non quadra: ' + euro(d) + ' in Dare contro ' + euro(a) + ' in Avere. ' +
        (diff > 0 ? 'Mancano ' + euro(diff) + ' in Avere.' : 'Mancano ' + euro(-diff) + ' in Dare.');
      return esito;
    }
    esito.ok = true;
    return esito;
  }

  /* Che cosa deve avere OGNI riga. Ritorna l'elenco completo degli errori, come
     `validaConto`: correggere un campo per giro fa smettere di compilare. */
  function validaRighe(righe, opz) {
    opz = opz || {};
    var conti = opz.conti ? indice(opz.conti) : null;
    var e = [];
    var r = (righe || []).filter(function (x) { return !!x; });

    r.forEach(function (x, i) {
      var n = 'Riga ' + (i + 1) + ': ';
      var c = conti && x.conto_id ? conti[x.conto_id] : null;
      if (!x.conto_id) e.push(n + 'scegli il conto.');
      else if (conti && !c) e.push(n + 'quel conto non esiste più.');
      else if (c && c.attivo === false) e.push(n + 'il conto «' + testo(c.nome) + '» è spento: non ci si registra più niente.');

      var d = numero(x.dare)  || 0;
      var a = numero(x.avere) || 0;
      /* Regola 11, detta con le parole del mestiere e non con quelle del
         vincolo: chi compila non sa che cos'è un CHECK. */
      if (d > 0 && a > 0) e.push(n + 'ha un importo sia in Dare sia in Avere. Una riga va da una parte sola: se sono due fatti, sono due righe.');
      else if (d === 0 && a === 0) e.push(n + 'non ha importo. Una riga a zero non muove niente: toglila.');
      else if (d < 0 || a < 0) e.push(n + 'ha un importo negativo. Il verso lo dice la colonna — Dare o Avere — non il segno.');
    });

    var b = bilanciato(r);
    if (!b.ok && b.motivo) e.push(b.motivo);
    return e;
  }

  /* ── LE DUE RIGHE DI UN MOVIMENTO SEMPLICE ───────────────────────────────

     Nella prima nota di tutti i giorni un movimento ha due sole righe: il
     conto che si muove e la CONTROPARTITA, cioè da dove il denaro arriva o
     dove va a finire. Chiedere a chi lavora di compilare una griglia Dare /
     Avere sarebbe chiedergli di fare il ragioniere; chiedergli DUE conti è
     una domanda che sa già rispondere («sono entrati 400 in cassa, erano il
     premio di Rossi da girare alla compagnia»).

     Il verso lo decide la causale, come sempre (regola 6): su un conto di
     denaro un'ENTRATA è Dare e un'USCITA è Avere. Se il verso non si sa, non
     si scrivono righe — si dice perché. */
  function righeSemplici(m, opz) {
    opz = opz || {};
    m = m || {};
    var causali = opz.causali ? indice(opz.causali) : null;
    var imp = numero(m.importo);
    var v = versoDi(m, causali);

    if (!m.conto_id) return { ok: false, righe: [], motivo: 'Scegli il conto che si muove.' };
    if (!m.contropartita_id) {
      return { ok: false, righe: [], motivo: 'Scegli la contropartita: è l’altro conto, quello da cui il denaro arriva o su cui va a finire. Senza, il movimento ha una gamba sola.' };
    }
    if (m.conto_id === m.contropartita_id) {
      return { ok: false, righe: [], motivo: 'Il conto e la contropartita sono lo stesso: un movimento da un conto a se stesso non muove niente.' };
    }
    if (imp == null || imp <= 0) return { ok: false, righe: [], motivo: 'Metti l’importo, positivo.' };
    if (!v) {
      return { ok: false, righe: [], motivo: 'Non si sa se è un’entrata o un’uscita: lo dice la causale, e questa non lo dichiara. Senza il verso non si indovina da che parte scrivere.' };
    }

    return {
      ok: true, motivo: null,
      righe: [
        { conto_id: m.conto_id,          dare: v > 0 ? imp : 0, avere: v > 0 ? 0 : imp, ordine: 0 },
        { conto_id: m.contropartita_id,  dare: v > 0 ? 0 : imp, avere: v > 0 ? imp : 0, ordine: 1 }
      ]
    };
  }

  /* La contropartita di un movimento già scritto: è la riga che NON è quella
     del conto in testata. Serve a riaprire la finestra con il campo pieno —
     una finestra che si riapre vuota fa credere che il dato non ci sia. */
  function contropartitaDi(movimento, righe) {
    var r = righeDi(movimento || {}, righe || []);
    if (r.derivate || r.righe.length !== 2) return null;
    var altra = r.righe.filter(function (x) { return x.conto_id !== (movimento || {}).conto_id; });
    return altra.length === 1 ? altra[0].conto_id : null;
  }

  /* Le righe di un movimento, per chi lo deve MOSTRARE.
     Ed è qui che si dice la verità sui movimenti scritti prima di oggi: la
     prima nota esiste dal 20/09 e ha un conto solo per movimento, quindi la
     contropartita non c'è — non è persa, non è stata scritta. Si dichiara e
     non si inventa (regola di casa §8.1): un movimento a cui il sistema
     aggiungesse da sé «Conto compagnia» direbbe una cosa che nessuno ha mai
     deciso, e fra sei mesi nessuno saprebbe che l'ha scritta un programma. */
  function righeDi(movimento, righe, opz) {
    opz = opz || {};
    var m = movimento || {};
    var mie = (righe || []).filter(function (x) { return x && x.movimento_id === m.id; });

    if (mie.length) {
      mie = mie.slice().sort(function (x, y) {
        var a = (x.ordine || 0) - (y.ordine || 0);
        if (a) return a;
        return testo(x.creato_il) < testo(y.creato_il) ? -1 : 1;
      });
      var b = bilanciato(mie);
      return {
        righe: mie, derivate: false, quadra: b.ok, dare: b.dare, avere: b.avere,
        motivo: b.ok ? null : b.motivo, nota: null
      };
    }

    /* Nessuna riga: è un movimento della prima nota a conto singolo. */
    var causali = opz.causali ? indice(opz.causali) : null;
    var v = versoDi(m, causali);
    var imp = numero(m.importo);
    var una = {
      conto_id: m.conto_id,
      dare:  v > 0 && imp != null ? Math.abs(imp) : 0,
      avere: v < 0 && imp != null ? Math.abs(imp) : 0,
      descrizione: testo(m.descrizione) || null,
      derivata: true
    };
    return {
      righe: (v && imp != null) ? [una] : [],
      derivate: true, quadra: false,
      dare: una.dare, avere: una.avere,
      motivo: null,
      nota: (v && imp != null)
        ? 'Questo movimento è stato scritto prima della partita doppia: ha un conto solo e la contropartita non è mai stata registrata. Non si indovina — si legge com’è.'
        : 'Questo movimento è stato scritto prima della partita doppia e non se ne ricava nemmeno una riga: manca l’importo o il verso.'
    };
  }

  /* Si può stornare? Una funzione sola, due porte: la schermata la chiama per
     decidere se accendere il bottone, e `storno()` la chiama per rifiutare.
     Due controlli scritti a mano sarebbero due regole, e quella sbagliata
     sarebbe quella che nessuno guarda. */
  function stornabile(movimento, righe) {
    var m = movimento || {};
    if (!m.id) return { ok: false, motivo: 'Non c’è nessun movimento da stornare.' };
    if (m.stato === 'bozza') return { ok: false, motivo: 'È una bozza: non è ancora stata registrata, quindi non c’è niente da stornare. Si corregge e si registra.' };
    if (m.stato === 'stornato') return { ok: false, motivo: 'Questo movimento è già stato stornato: cercane lo storno invece di farne un secondo.' };
    if (m.annullato_il) return { ok: false, motivo: 'Questo movimento è già annullato: è fuori da tutti i totali e non c’è niente da rovesciare.' };

    var r = righeDi(m, righe || []);
    if (r.derivate) {
      return { ok: false, motivo: 'Questo movimento è stato scritto prima della partita doppia e non ha righe: non si può rovesciare quello che non c’è. Si annulla, col motivo, e resta a registro.' };
    }
    if (!r.quadra) {
      return { ok: false, motivo: 'Questo movimento non quadra: ' + (r.motivo || 'Dare e Avere non coincidono') + '. Uno storno di un movimento sbilanciato sposterebbe la differenza invece di toglierla.' };
    }
    return { ok: true, motivo: null };
  }

  /* Lo storno: un movimento NUOVO con le righe rovesciate.
     Non si tocca l'originale — è la regola 13, ed è anche quello che i trigger
     del database impongono comunque.

     La data la passa CHI CHIAMA (`opz.oggi`). Il motore non chiede mai l'ora
     al computer di chi guarda: una funzione che lo fa dà risposte diverse a
     due persone sullo stesso dato, ed è il difetto già pagato due volte con le
     date delle polizze e col monitor dei collegamenti. */
  function storno(movimento, righe, opz) {
    opz = opz || {};
    var m = movimento || {};

    var puo = stornabile(m, righe);
    if (!puo.ok) return { ok: false, motivo: puo.motivo };

    var oggi = testo(opz.oggi);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(oggi)) {
      return { ok: false, motivo: 'Manca la data dello storno: è il giorno in cui si corregge, e la sceglie chi corregge.' };
    }
    var perche = testo(opz.perche);
    if (!perche) {
      return { ok: false, motivo: 'Per stornare serve il motivo: fra sei mesi è l’unica cosa che spiega perché ci sono due movimenti uguali e contrari.' };
    }

    var r = righeDi(m, righe || []);
    var rovesciate = r.righe.map(function (x, i) {
      return {
        conto_id: x.conto_id,
        dare:  numero(x.avere) || 0,
        avere: numero(x.dare)  || 0,
        descrizione: testo(x.descrizione) || null,
        ordine: i,
        compagnia_id: x.compagnia_id || null,
        cliente_id: x.cliente_id || null,
        collaboratore_id: x.collaboratore_id || null,
        polizza_id: x.polizza_id || null,
        titolo_id: x.titolo_id || null
      };
    });

    var etich = m.numero != null ? ('n. ' + m.numero) : 'precedente';
    return {
      ok: true,
      motivo: null,
      movimento: {
        data: oggi,
        conto_id: m.conto_id,
        causale_id: m.causale_id,
        importo: numero(m.importo),
        descrizione: 'Storno del movimento ' + etich + ' — ' + perche,
        storno_di_movimento_id: m.id,
        storno_perche: perche,
        stato: 'registrato',
        origine: 'storno',
        collaboratore_id: m.collaboratore_id || null,
        polizza_id: m.polizza_id || null,
        titolo_id: m.titolo_id || null,
        /* Doppio clic, rete che cade, tasto premuto due volte: la chiave è la
           stessa e il database rifiuta il secondo. Uno storno duplicato
           rovescerebbe il movimento due volte, e il saldo finirebbe dalla
           parte opposta di quella giusta. */
        chiave_idempotenza: 'storno:' + m.id
      },
      righe: rovesciate,
      /* Quello che va scritto sull'ORIGINALE: solo le colonne dello storno.
         Tutto il resto è storia, e i trigger lo difendono. */
      aggiorna: {
        stato: 'stornato',
        storno_perche: perche,
        stornato_il: testo(opz.adesso) || null,
        stornato_da: opz.utente || null
      }
    };
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
  /* `opz.conto` restringe il conto al PEZZO che ha toccato quel conto, e serve
     al dettaglio conto: un incasso da 500 che su questo conto ne ha portati
     300 deve contare 300, non 500. Sommando il movimento intero, la domanda
     «in questo periodo che cosa ha mosso questo conto» risponderebbe con un
     numero che non torna col saldo scritto due riquadri più su — e due numeri
     diversi sullo stesso conto nella stessa finestra sono il modo di non
     fidarsi più di nessuno dei due. Senza `opz.conto` si conta il movimento
     intero, che è la risposta giusta per la prima nota. */
  function perCausale(movimenti, causali, opz) {
    opz = opz || {};
    var idx = indice(causali);
    var acc = {};
    var perMov = opz.righe ? perMovimento(opz.righe) : null;
    vivi(movimenti).forEach(function (m) {
      if (opz.dal && (!m.data || m.data < opz.dal)) return;
      if (opz.al  && (!m.data || m.data > opz.al))  return;
      var imp;
      if (opz.conto) {
        var e = effettoSuConto(m, opz.conto, perMov, idx);
        if (!e.tocca || e.incerto) return;
        imp = e.delta;
      } else {
        imp = numero(m.importo);
      }
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
    var perMov = opz.righe ? perMovimento(opz.righe) : null;
    var r = { data: g, entrate: 0, uscite: 0, saldo: 0, righe: 0, per_conto: [] };
    var acc = {};
    vivi(movimenti).forEach(function (m) {
      if (testo(m.data) !== g) return;
      var imp = numero(m.importo);
      if (imp == null) return;
      var v = versoDi(m, causali);
      if (!v) return;
      /* Entrate e uscite della GIORNATA restano quelle del movimento intero:
         a partita doppia le due gambe si annullano, quindi le righe non
         saprebbero dire se la giornata ha incassato o pagato. Il verso di un
         movimento lo dice la causale, ed è l'unica risposta che c'è. */
      r.righe++;
      if (v > 0) r.entrate = cent(r.entrate + Math.abs(imp));
      else       r.uscite  = cent(r.uscite  + Math.abs(imp));
      /* La ripartizione PER CONTO invece viene dalle righe quando ci sono: un
         incasso metà in contanti e metà in banca, letto dalla testata,
         finirebbe tutto sul primo conto — e la cassa contata la sera non
         tornerebbe con quello che il sistema dice di avere. */
      var mie = perMov ? (perMov[m.id] || []) : null;
      if (mie && mie.length) {
        mie.forEach(function (x) {
          var k = x.conto_id || '—';
          if (!acc[k]) acc[k] = { conto_id: x.conto_id || null, entrate: 0, uscite: 0, righe: 0 };
          acc[k].entrate = cent(acc[k].entrate + (numero(x.dare) || 0));
          acc[k].uscite  = cent(acc[k].uscite  + (numero(x.avere) || 0));
          acc[k].righe++;
        });
        return;
      }
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
        saldo_fine: c ? saldo(c, movimenti, { causali: opz.causali, al: g, righe: opz.righe }).saldo : null
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
      var s = saldo(c, movimenti, { causali: opz.causali, al: opz.al, righe: opz.righe });
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

    /* 4-bis. DUE CONTI CHE DICHIARANO LO STESSO MEZZO. Trovato il 21/09/2026
       sulla configurazione vera: la cassa contanti e un conto corrente
       dichiaravano tutti e due i contanti. La regola (M4) dice che in quel
       caso non si sceglie per somiglianza e si scrive \u00abnon si sa\u00bb \u2014 giusto \u2014
       ma nessuno lo diceva a chi aveva appena finito di configurare. Il
       risultato e' il peggiore dei due mondi: il lavoro e' stato fatto e gli
       incassi restano fermi lo stesso, senza una riga che spieghi perche'. */
    var doppi = mezziInConflitto(conti);
    if (doppi.length) agg('giallo', 'Lo stesso mezzo su piu\u2019 conti', doppi.length, null,
      doppi.map(function (d) {
        return '\u00ab' + (mezzo(d.mezzo) ? mezzo(d.mezzo).l : d.mezzo) + '\u00bb e\u2019 dichiarato da ' + d.conti.length + ' conti (' + d.conti.join(', ') + ')';
      }).join('; ') + '. Lascialo su uno solo, altrimenti quegli incassi leggono \u00abnon si sa\u00bb.');

    /* 4-ter. UN CONTO CHE RICEVE CONTANTI E NON E' UNA CASSA. Il fondo cassa
       somma le tipologie \u00abcassa\u00bb e basta (M5): un conto classificato in un
       altro modo, per quanto si chiami \u00abcassa contanti\u00bb, non ci entra \u2014 e il
       fondo resta a zero senza che nessuno sappia perche'. Non si corregge da
       soli: cambiare la natura di un conto e' una decisione contabile. */
    var casseStorte = (conti || []).filter(function (c) {
      return c && c.attivo !== false && c.tipologia !== 'cassa' &&
             (c.mezzi || []).some(function (m) { return testo(m).toLowerCase() === 'contante'; });
    });
    if (casseStorte.length) agg('giallo', 'Contanti su un conto che non e\u2019 una cassa', casseStorte.length, null,
      casseStorte.map(function (c) { return '\u00ab' + c.nome + '\u00bb'; }).join(', ') +
      ' riceve i contanti ma non e\u2019 di tipologia \u00abCassa contanti\u00bb: il fondo cassa non lo conta.');

    /* 4-quater. POLIZZE SENZA NEMMENO UNA RATA. Il conto lo fa il database e
       arriva gia' fatto (\u00a745: 1.720 polizze non si scaricano nel browser).
       Perche' sta fra le anomalie della contabilita' e non altrove: una
       polizza senza rate non ha insoluti, non entra nello scadenzario delle
       rate, non produce estratto conto e non arriva qui \u2014 **per il sistema
       quel premio non lo deve nessuno**. E' una voce di contabilita' che
       manca, non un dettaglio di portafoglio. */
    var pf = dati.portafoglio;
    if (pf && numero(pf.senza_rate) > 0) {
      agg('rosso', 'Polizze senza nemmeno una rata', numero(pf.senza_rate),
        pf.premio == null ? null : numero(pf.premio),
        'Per il sistema quei premi non li deve nessuno: non hanno insoluti e non arrivano in contabilita\u2019. ' +
        'Se vengono da un\u2019importazione interrotta, si recuperano ricaricando lo stesso file della compagnia.');
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
                           movimenti, dati.quadrature, { causali: causali, al: oggi, righe: dati.righe })
        .filter(function (q) { return q.quadra === null; });
      if (mai.length) agg('giallo', 'Conti mai verificati', mai.length, null,
        'Dichiara il saldo che dice la banca in Contabilita\u2019 \u203a Quadratura conti.');
      var storti = quadrature((conti || []).filter(function (c) { return c.attivo !== false; }),
                              movimenti, dati.quadrature, { causali: causali, al: oggi, righe: dati.righe })
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
    /* `righe` va passato, e non è un dettaglio: senza, il ricostruito di un
       conto toccato da un incasso a più gambe si legge dalla testata e
       sbaglia. La quadratura direbbe ogni giorno una differenza vera contro
       un numero falso — e chi la guarda andrebbe a cercare in banca un
       movimento che non manca. */
    var s = saldo(conto, movimenti, { causali: opz.causali, al: alConfronto, righe: opz.righe });

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
      saldo_oggi: saldo(conto, movimenti, { causali: opz.causali, al: al, righe: opz.righe }).saldo
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
      var s = saldo(conto, movimenti, { causali: opz.causali, al: d.data, righe: opz.righe });
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
    var perMov = opz.righe ? perMovimento(opz.righe) : null;
    var cau = causali ? indice(causali) : null;
    /* Un movimento appartiene a questo conto se lo TOCCA, non se ce l'ha in
       testata: dalla Fase 2 un incasso su due conti tocca tutti e due, e
       filtrando per testata la metà arrivata in banca non comparirebbe mai
       nell'estratto della banca. */
    var miei = (movimenti || []).filter(function (m) {
      return m && conto && effettoSuConto(m, conto, perMov, cau).tocca;
    });
    var tutte = progressivo(conto, miei, { causali: causali, righe: opz.righe });   /* solo i vivi */
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
      saldo: saldo(conto, miei, { causali: causali, righe: opz.righe }).saldo,
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
      per_causale: perCausale(miei, opz.causali || [],
        { dal: dal || null, al: al || null, conto: conto, righe: opz.righe }),
      quadrature: storicoQuadrature(conto, miei, dichiarazioni, { causali: causali, righe: opz.righe })
    };
  }

  /* ═══ FASE 2 — L'INCASSO DI UNA O PIÙ RATE ════════════════════════════════

     Il principio dell'interfaccia (specifica §16): «l'operatore non deve
     conoscere la partita doppia per registrare un incasso». Sceglie le rate e
     i modi in cui il cliente ha pagato; la scrittura contabile la costruisce
     il motore, e si vede nel dettaglio del movimento.

     Le righe sono quelle della specifica §7.1:
       DARE  — una riga per ogni MODALITÀ di pagamento (il conto che riceve);
       AVERE — una riga per ogni COMPAGNIA delle rate scelte (il debito che
               l'incasso crea verso di lei).

     Tre cose che questo motore NON fa, e ognuna è una regola di casa:

     1. **Non inventa il conto della compagnia.** Se una compagnia non ha un
        conto di debito, le righe non si scrivono: si dice quale manca e si
        manda a crearlo (§8.1). Un incasso appoggiato «al primo conto che
        passa» è un debito attribuito alla compagnia sbagliata, e non se ne
        accorge nessuno finché non si va a rimettere il denaro.
     2. **Non incassa mezza rata.** Una rata entra intera. Il pezzo che manca
        non è un incasso più piccolo: è un SOSPESO, e i sospesi sono la Fase 3.
        Scrivere qui un incasso parziale lascerebbe una rata chiusa per un
        importo e un residuo che non sta da nessuna parte.
     3. **Non chiude la differenza da solo.** Se i pagamenti non fanno il
        totale delle rate, non si registra. La differenza si copre mettendo il
        conto «Abbuoni» fra le modalità: così l'abbuono si vede nel movimento
        e nella quadratura, invece di sparire dentro un arrotondamento. */

  /* Questa rata si può incassare? */
  function incassabile(t) {
    var r = t || {};
    var imp = numero(r.importo_lordo);
    if (!r.id) return { si: false, motivo: 'La rata non ha un identificativo.' };
    if (testo(r.stato) === 'incassato') {
      return { si: false, motivo: 'Già incassata' + (r.incassato_il ? ' il ' + giornoBello(r.incassato_il) : '') + '.' };
    }
    if (testo(r.stato) === 'stornato' || testo(r.stato) === 'annullato') {
      return { si: false, motivo: 'La rata è ' + testo(r.stato) + ': non c’è niente da incassare.' };
    }
    if (imp == null) {
      return { si: false, motivo: 'La rata non ha un importo: non si incassa un numero che non c’è.' };
    }
    /* Un importo negativo è un'appendice di riduzione o un rimborso: è un
       fatto vero, e non si incassa da questa schermata. Si RIFIUTA col motivo
       invece di lasciarlo fuori dalla ricerca: una riga che sparisce senza
       spiegazione fa cercare per mezz'ora una rata che c'è. */
    if (imp < 0) {
      return { si: false, motivo: 'La rata è negativa (' + euro(imp) + '): è un rimborso o un’appendice di riduzione, e da qui non si registra.' };
    }
    if (imp === 0) return { si: false, motivo: 'La rata è a zero: non c’è niente da incassare.' };
    return { si: true, motivo: null };
  }

  function giornoBello(v) {
    var s = testo(v).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : s;
  }

  /* Il conto su cui scrivere l'AVERE di una compagnia.
     Prima quello intestato a LEI, poi quello generico. Il nome della compagnia
     passa dagli alias (§11, §28): sulla polizza è scritto «HDI Assicurazioni»
     e in anagrafica «HDI», e senza gli alias quel conto non si trova mai —
     senza errore, e con un «da confermare» che sembra una configurazione
     mancante. */
  function chiaveNome(v) {
    var s = testo(v).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function contoCompagnia(conti, compagnia, opz) {
    opz = opz || {};
    var lista = (conti || []).filter(function (c) {
      return c && c.attivo !== false && testo(c.tipologia) === 'debito';
    });
    var catalogo = opz.compagnie || [];
    var id = testo(compagnia && compagnia.id) || testo(opz.compagnia_id);
    var nome = testo(compagnia && compagnia.nome) || testo(compagnia);

    /* L'id è la strada sicura e non passa dagli alias: due nomi diversi della
       stessa compagnia hanno lo stesso id. */
    if (id) {
      for (var i = 0; i < lista.length; i++) if (testo(lista[i].compagnia_id) === id) {
        return { conto: lista[i], come: 'suo', compagnia_id: id, motivo: null };
      }
    }
    /* Senza id si passa dal nome, risolto con gli alias del catalogo. */
    if (nome && !id) {
      var k = chiaveNome(nome), risolto = null;
      for (var j = 0; j < catalogo.length; j++) {
        var cc = catalogo[j]; if (!cc) continue;
        if (chiaveNome(cc.nome) === k) { risolto = cc; break; }
        var al = cc.alias || [];
        for (var z = 0; z < al.length; z++) if (chiaveNome(al[z]) === k) { risolto = cc; break; }
        if (risolto) break;
      }
      if (risolto) {
        for (var q = 0; q < lista.length; q++) if (testo(lista[q].compagnia_id) === testo(risolto.id)) {
          /* Il nome risolto porta con se' l'IDENTIFICATIVO della compagnia: la
             riga di prima nota deve puntare alla compagnia vera, non al nome
             scritto sulla polizza. Senza, «HDI Assicurazioni» e «HDI»
             sarebbero due debiti diversi nello stesso conto. */
          return { conto: lista[q], come: 'suo', compagnia_id: testo(risolto.id), motivo: null };
        }
      }
      if (risolto) id = testo(risolto.id);
    }
    /* Il conto GENERICO e' ammesso, la compagnia sconosciuta no. La differenza
       e' quella che rende ricostruibile il partitario: la riga di prima nota
       porta sempre `compagnia_id`, quindi anche su un conto condiviso si sa
       quanto si deve a ognuna. Senza l'identificativo invece il debito verso
       nove compagnie finirebbe su una riga sola, e il giorno del rendiconto
       non ci sarebbe modo di dire quanto e' di chi. */
    if (!id) {
      return { conto: null, come: null, compagnia_id: null,
        motivo: 'La compagnia «' + (nome || '—') + '» non è in anagrafica: senza, il debito di questo incasso non si sa verso chi nasce. Si aggiunge in Strumenti › Gestione compagnie (o come alias, se è scritta in un altro modo).' };
    }
    var generici = lista.filter(function (c) { return !testo(c.compagnia_id); });
    if (generici.length === 1) return { conto: generici[0], come: 'generico', compagnia_id: id, motivo: null };
    /* Due conti generici non si scelgono per somiglianza: è la regola dei
       mezzi in conflitto (§32) applicata al debito verso le compagnie. */
    if (generici.length > 1) {
      return { conto: null, come: null,
        motivo: 'Ci sono ' + generici.length + ' conti di debito senza compagnia: non si sceglie a caso. Intestane uno a «' + (nome || '—') + '».' };
    }
    return { conto: null, come: null,
      motivo: 'Manca il conto di debito verso «' + (nome || '—') + '». Si crea in Strumenti › Conti e causali: senza, non si sa dove nasce il debito di questo incasso.' };
  }

  /* I due totali e la differenza, in tempo reale mentre si compila. */
  function contoIncasso(rate, pagamenti) {
    var r = (rate || []).filter(Boolean), p = (pagamenti || []).filter(Boolean);
    var tr = 0, tp = 0;
    r.forEach(function (x) { tr = cent(tr + (numero(x.importo) || 0)); });
    p.forEach(function (x) { tp = cent(tp + (numero(x.importo) || 0)); });
    var diff = cent(tp - tr);
    return {
      rate: r.length, pagamenti: p.length,
      totale_rate: tr, totale_pagamenti: tp, differenza: diff,
      quadra: r.length > 0 && p.length > 0 && diff === 0,
      motivo: !r.length ? 'Scegli almeno una rata da incassare.'
            : !p.length ? 'Di’ come ha pagato: manca la modalità di pagamento.'
            : diff === 0 ? null
            : diff > 0 ? 'I pagamenti superano le rate di ' + euro(diff) + '. Se è un di più del cliente, mettilo su «Eccedenze e abbuoni attivi».'
                       : 'Mancano ' + euro(-diff) + '. Se è un abbuono dell’agenzia, mettilo su «Abbuoni passivi»: così si vede, invece di sparire in un arrotondamento.'
    };
  }

  /* Le righe di prima nota di un incasso. Torna `ok:false` e il MOTIVO ogni
     volta che non si può scrivere: mai righe a metà. */
  function righeIncasso(piano, opz) {
    opz = opz || {};
    piano = piano || {};
    var conti = (opz.conti || []);
    var perId = indice(conti);
    var rate = (piano.rate || []).filter(Boolean);
    var pagamenti = (piano.pagamenti || []).filter(Boolean);
    var errori = [];

    var somma = contoIncasso(rate, pagamenti);
    if (!somma.quadra) return { ok: false, righe: [], motivo: somma.motivo, errori: [somma.motivo], somma: somma, per_compagnia: [] };

    /* Le modalità di pagamento: DARE. */
    pagamenti.forEach(function (p, i) {
      var c = perId[p.conto_id];
      var n = 'Pagamento ' + (i + 1) + ': ';
      if (!p.conto_id) errori.push(n + 'scegli su quale conto è arrivato il denaro.');
      else if (!c) errori.push(n + 'quel conto non esiste più.');
      else if (c.attivo === false) errori.push(n + 'il conto «' + testo(c.nome) + '» è spento.');
      else if (c.e_mezzo_pagamento === false) {
        errori.push(n + '«' + testo(c.nome) + '» non è un modo di pagare: è dove il denaro va a finire, non da dove arriva.');
      } else if (opz.causale && !compatibile(c, opz.causale).ok) {
        /* La natura del denaro non si mescola (§26, art. 117 CAP): un premio
           del cliente su un conto aziendale passa senza un errore, e da quel
           momento i due mucchi sono uno solo. `compatibile` esiste dalla M1 ed
           era chiamata solo dalla prima nota a mano: qui è dove serve di più. */
        errori.push(n + compatibile(c, opz.causale).motivo);
      } else if (c.e_conto_sospeso === true) {
        /* Mettere una rata a copertura senza aver visto il denaro È un
           sospeso, e i sospesi arrivano con la Fase 3. Farlo passare di qui
           scriverebbe la scrittura contabile giusta e NESSUNA posizione nello
           scadenzario: il credito esisterebbe in prima nota e non nell'elenco
           di chi deve pagare. Una cosa che sembra fatta e non lo è. */
        errori.push(n + '«' + testo(c.nome) + '» è un conto di sospesi. Mettere una rata a copertura senza il denaro è un’altra operazione, e non c’è ancora: qui si registra il denaro arrivato.');
      }
      if ((numero(p.importo) || 0) <= 0) errori.push(n + 'metti un importo positivo.');
    });

    /* Le rate, raggruppate per compagnia: AVERE. */
    var gruppi = [], per = {};
    rate.forEach(function (r, i) {
      var n = 'Rata ' + (i + 1) + ': ';
      if (!r.titolo_id) { errori.push(n + 'manca il riferimento alla rata.'); return; }
      var k = testo(r.compagnia_id) || chiaveNome(r.compagnia) || '—';
      if (!per[k]) {
        var trovato = contoCompagnia(conti, { id: r.compagnia_id, nome: r.compagnia }, opz);
        per[k] = { chiave: k, compagnia: testo(r.compagnia),
                   compagnia_id: testo(r.compagnia_id) || trovato.compagnia_id || null,
                   conto: trovato.conto, come: trovato.come, motivo: trovato.motivo, importo: 0, rate: 0 };
        gruppi.push(per[k]);
      }
      per[k].importo = cent(per[k].importo + (numero(r.importo) || 0));
      per[k].rate += 1;
    });
    gruppi.forEach(function (g) { if (!g.conto) errori.push(g.motivo); });

    if (errori.length) return { ok: false, righe: [], motivo: errori[0], errori: errori, somma: somma, per_compagnia: gruppi };

    var righe = [], ord = 0;
    pagamenti.forEach(function (p) {
      var c = perId[p.conto_id];
      righe.push({ conto_id: p.conto_id, dare: cent(numero(p.importo)), avere: 0, ordine: ord++,
        descrizione: 'Incassato su ' + testo(c && c.nome), cliente_id: testo(piano.cliente_id) || null });
    });
    gruppi.forEach(function (g) {
      righe.push({ conto_id: g.conto.id, dare: 0, avere: g.importo, ordine: ord++,
        descrizione: 'Premi da rimettere a ' + (g.compagnia || testo(g.conto.nome)),
        compagnia_id: g.compagnia_id, cliente_id: testo(piano.cliente_id) || null });
    });

    var b = bilanciato(righe);
    if (!b.ok) return { ok: false, righe: [], motivo: b.motivo, errori: [b.motivo], somma: somma, per_compagnia: gruppi };
    return { ok: true, righe: righe, motivo: null, errori: [], somma: somma, per_compagnia: gruppi };
  }

  /* Il mezzo da scrivere sulla rata. Si scrive SOLO se tutte le modalità di
     pagamento dicono lo stesso mezzo: con due mezzi diversi sulla stessa rata
     non esiste una risposta, e scriverne uno vorrebbe dire scegliere quale
     metà della verità raccontare. Il vocabolario è quello del vincolo del
     database (§53), non un secondo elenco. */
  function mezzoIncasso(pagamenti) {
    var p = (pagamenti || []).filter(Boolean);
    var visti = {};
    p.forEach(function (x) { var k = testo(x.mezzo).toLowerCase(); if (k) visti[k] = 1; });
    var k = Object.keys(visti);
    if (k.length !== 1) return null;
    return mezzo(k[0]) ? k[0] : null;
  }

  /* ═══ FASE 3 — I SOSPESI: I PREMI MESSI A COPERTURA E NON RICEVUTI ═══════

     Il caso, che in agenzia succede tutti i giorni: la polizza si emette e si
     mette a copertura perché il cliente non può restare scoperto, ma il premio
     non è ancora arrivato. Da quel momento l'agenzia DEVE il premio alla
     compagnia e VANTA un credito verso il cliente. Sono due fatti, e finora in
     IAM non ne esisteva nessuno dei due.

     ┌─ APERTURA ────────────────────────────────────────────────────────────
     │  Dare   Sospesi clienti        (il credito verso il cliente)
     │  Avere  Conto compagnia        (il debito che la copertura crea)
     └─ RECUPERO (anche parziale) ───────────────────────────────────────────
        Dare   Cassa / Banca / POS…   (il denaro che arriva)
        Avere  Sospesi clienti        (il credito che si riduce)

     **Il recupero NON crea un nuovo debito verso la compagnia**: quel debito è
     nato all'apertura. Ricrearlo lo conterebbe due volte, e il conto della
     compagnia direbbe il doppio di quello che si deve — un numero grande,
     credibile e falso.

     TRE COSE CHE QUESTO MOTORE NON FA, e ognuna è una regola di casa:

     1. **Non chiude la rata all'apertura.** «A copertura» vuol dire che la
        compagnia è a posto, non che il cliente ha pagato: la rata resta
        APERTA, e resta nello scadenzario, perché è vero che il cliente non ha
        pagato. Chiuderla come incassata farebbe maturare la provvigione su un
        premio mai ricevuto (§17, decisione 1) — cioè pagherebbe un
        collaboratore con i soldi di nessuno.
     2. **Non memorizza il residuo.** Si calcola: originale meno i recuperi
        vivi. Un residuo scritto in colonna si aggiorna da un'altra parte, e il
        giorno in cui si scosta dalla somma dei recuperi nessuno sa più quale
        dei due sia quello vero (§26, la stessa ragione per cui i conti non
        hanno un `saldo`).
     3. **Non ricostruisce il credito verso i COLLABORATORI.** Quello esiste
        già dal 19/09 — sono le rate che un collaboratore ha incassato e non ha
        ancora rimesso (`EstrattoConto.creditoAgenzia`, §24) — e rifarlo qui
        sarebbe il secondo archivio dello stesso fatto. La colonna `tipo` c'è
        perché il modello possa crescere; oggi vale `cliente`, e la schermata
        dice perché. */

  var STATI_CREDITO = [
    { k: 'aperto',   l: 'Aperto',   i: 'ti-clock-dollar' },
    { k: 'parziale', l: 'Parziale', i: 'ti-progress' },
    { k: 'chiuso',   l: 'Chiuso',   i: 'ti-circle-check' },
    { k: 'stornato', l: 'Stornato', i: 'ti-rotate-2' }
  ];

  /* I recuperi che contano: quelli non spenti dallo storno. Sta in una
     funzione sola perché i posti che sommano sono quattro, e quattro controlli
     scritti a mano sono quattro occasioni di dimenticarne uno — che è il modo
     in cui un residuo comincia a non tornare senza che si capisca perché. */
  function recuperiVivi(recuperi, creditoId) {
    return (recuperi || []).filter(function (r) {
      return r && r.attivo !== false && (creditoId == null || r.credito_id === creditoId);
    });
  }

  function residuoCredito(credito, recuperi) {
    var c = credito || {};
    var orig = numero(c.importo_originale);
    if (orig == null) return { residuo: null, recuperato: null, motivo: 'Il sospeso non ha un importo: non si sa che cosa si sta aspettando.' };
    var rec = 0;
    recuperiVivi(recuperi, c.id).forEach(function (r) { rec = cent(rec + (numero(r.importo) || 0)); });
    return { residuo: cent(orig - rec), recuperato: cent(rec), originale: cent(orig), motivo: null };
  }

  /* Lo stato si DERIVA dal residuo: una colonna `stato` aggiornata a mano è la
     seconda verità che prima o poi contraddice la prima. `stornato` invece è
     un fatto e sta scritto sulla riga. */
  function statoCredito(credito, recuperi) {
    var c = credito || {};
    if (c.stornato_il) return 'stornato';
    var r = residuoCredito(c, recuperi);
    if (r.residuo == null) return 'aperto';
    if (r.residuo <= 0) return 'chiuso';
    if (r.recuperato > 0) return 'parziale';
    return 'aperto';
  }

  /* Le righe dell'APERTURA. */
  function righeApertura(piano, opz) {
    opz = opz || {};
    piano = piano || {};
    var conti = opz.conti || [];
    var perId = indice(conti);
    var imp = numero(piano.importo);
    var errori = [];

    if (imp == null || imp <= 0) errori.push('Metti l’importo del premio messo a copertura, positivo.');
    var cs = perId[piano.conto_sospeso_id];
    if (!piano.conto_sospeso_id) errori.push('Scegli il conto dei sospesi: è dove vive il credito finché il cliente non paga.');
    else if (!cs) errori.push('Quel conto dei sospesi non esiste più.');
    else if (cs.attivo === false) errori.push('Il conto «' + testo(cs.nome) + '» è spento.');
    else if (cs.e_conto_sospeso !== true) {
      errori.push('«' + testo(cs.nome) + '» non è un conto di sospesi. Un credito messo su un conto di denaro direbbe che quei soldi ci sono, e non ci sono.');
    }
    if (!piano.titolo_id) errori.push('Manca il riferimento alla rata.');

    var trovato = contoCompagnia(conti, { id: piano.compagnia_id, nome: piano.compagnia }, opz);
    if (!trovato.conto) errori.push(trovato.motivo);

    if (errori.length) return { ok: false, righe: [], motivo: errori[0], errori: errori, compagnia: trovato };

    return {
      ok: true, motivo: null, errori: [], compagnia: trovato,
      righe: [
        { conto_id: piano.conto_sospeso_id, dare: cent(imp), avere: 0, ordine: 0,
          descrizione: 'Premio a copertura da recuperare',
          cliente_id: testo(piano.cliente_id) || null, polizza_id: testo(piano.polizza_id) || null,
          titolo_id: testo(piano.titolo_id) || null },
        { conto_id: trovato.conto.id, dare: 0, avere: cent(imp), ordine: 1,
          descrizione: 'Premi da rimettere a ' + (testo(piano.compagnia) || testo(trovato.conto.nome)),
          compagnia_id: trovato.compagnia_id || null,
          cliente_id: testo(piano.cliente_id) || null, polizza_id: testo(piano.polizza_id) || null,
          titolo_id: testo(piano.titolo_id) || null }
      ]
    };
  }

  /* Si può recuperare? E quanto? */
  function recuperabile(credito, recuperi, importo) {
    var c = credito || {};
    if (c.stornato_il) return { si: false, motivo: 'Questo sospeso è stornato: non c’è più niente da recuperare.' };
    var r = residuoCredito(c, recuperi);
    if (r.residuo == null) return { si: false, motivo: r.motivo };
    if (r.residuo <= 0) return { si: false, motivo: 'Questo sospeso è già chiuso: il residuo è zero.' };
    var imp = numero(importo);
    if (importo === undefined || importo === null || importo === '') return { si: true, motivo: null, residuo: r.residuo };
    if (imp == null || imp <= 0) return { si: false, motivo: 'Metti un importo positivo.', residuo: r.residuo };
    /* Più del residuo non si accetta: sarebbe un'eccedenza, che è un altro
       fatto e va da un'altra parte. Accettarla qui farebbe un residuo negativo
       che nessuna schermata sa leggere. */
    if (imp > r.residuo) {
      return { si: false, residuo: r.residuo,
        motivo: 'Il residuo è ' + euro(r.residuo) + ': di più non si registra qui. Se il cliente ha dato un di più, quello è un’eccedenza e va su «Eccedenze e abbuoni attivi».' };
    }
    return { si: true, motivo: null, residuo: r.residuo, chiude: cent(r.residuo - imp) <= 0 };
  }

  /* Le righe del RECUPERO. */
  function righeRecupero(credito, piano, opz) {
    opz = opz || {};
    piano = piano || {};
    var c = credito || {};
    var conti = opz.conti || [];
    var perId = indice(conti);
    var imp = numero(piano.importo);
    var errori = [];

    var puo = recuperabile(c, opz.recuperi || [], piano.importo);
    if (!puo.si) errori.push(puo.motivo);

    var cd = perId[piano.conto_id];
    if (!piano.conto_id) errori.push('Di’ su quale conto è arrivato il denaro.');
    else if (!cd) errori.push('Quel conto non esiste più.');
    else if (cd.attivo === false) errori.push('Il conto «' + testo(cd.nome) + '» è spento.');
    else if (cd.e_mezzo_pagamento === false) {
      errori.push('«' + testo(cd.nome) + '» non è un modo di ricevere denaro.');
    } else if (cd.e_conto_sospeso === true) {
      errori.push('«' + testo(cd.nome) + '» è un conto di sospesi: un credito non si recupera con un altro credito.');
    } else if (opz.causale && !compatibile(cd, opz.causale).ok) {
      errori.push(compatibile(cd, opz.causale).motivo);
    }
    if (!c.conto_sospeso_id) errori.push('Il sospeso non dice su quale conto vive: non si sa che cosa ridurre.');

    if (errori.length) return { ok: false, righe: [], motivo: errori[0], errori: errori };

    return {
      ok: true, motivo: null, errori: [], chiude: !!puo.chiude, residuo_dopo: cent(puo.residuo - imp),
      righe: [
        { conto_id: piano.conto_id, dare: cent(imp), avere: 0, ordine: 0,
          descrizione: 'Recupero su ' + testo(cd.nome),
          cliente_id: testo(c.cliente_id) || null, polizza_id: testo(c.polizza_id) || null,
          titolo_id: testo(c.titolo_id) || null },
        /* L'Avere va sul conto dei SOSPESI, non su quello della compagnia: il
           debito verso di lei è nato all'apertura, e rifarlo qui lo conterebbe
           due volte. */
        { conto_id: c.conto_sospeso_id, dare: 0, avere: cent(imp), ordine: 1,
          descrizione: 'Credito recuperato',
          cliente_id: testo(c.cliente_id) || null, polizza_id: testo(c.polizza_id) || null,
          titolo_id: testo(c.titolo_id) || null }
      ]
    };
  }

  /* Lo scadenzario: che cosa c'è da recuperare, da quanto, e da chi.
     `oggi` lo passa chi chiama — un motore che chiede l'ora al computer dà
     risposte diverse a due persone sullo stesso dato (§44, §45). */
  function scadenzarioCrediti(crediti, recuperi, opz) {
    opz = opz || {};
    var oggi = testo(opz.oggi);
    var righe = (crediti || []).map(function (c) {
      var r = residuoCredito(c, recuperi);
      var st = statoCredito(c, recuperi);
      var scadenza = testo(c.previsto_il) || null;
      var giorni = oggi ? giorniDa(c.aperto_il, oggi) : null;
      var ritardo = (oggi && scadenza && st !== 'chiuso' && st !== 'stornato') ? (scadenza < oggi) : false;
      return { credito: c, stato: st, originale: r.originale, recuperato: r.recuperato,
               residuo: r.residuo, giorni: giorni, scadenza: scadenza, in_ritardo: ritardo };
    });
    var vive = righe.filter(function (x) { return x.stato === 'aperto' || x.stato === 'parziale'; });
    var tot = 0, ritardo = 0, nRit = 0;
    vive.forEach(function (x) {
      if (x.residuo != null) tot = cent(tot + x.residuo);
      if (x.in_ritardo) { nRit++; if (x.residuo != null) ritardo = cent(ritardo + x.residuo); }
    });
    return {
      /* Prima i vivi, poi per data attesa. Uno scadenzario è una lista di
         lavoro: mettere in cima un sospeso chiuso o stornato fa scorrere righe
         morte per arrivare a quelle da chiamare. Chi li vuole vedere li filtra
         — restano, ma in fondo. */
      righe: righe.sort(function (a, b) {
        var va = (a.stato === 'aperto' || a.stato === 'parziale') ? 0 : 1;
        var vb = (b.stato === 'aperto' || b.stato === 'parziale') ? 0 : 1;
        if (va !== vb) return va - vb;
        var sa = a.scadenza || '9999-99-99', sb = b.scadenza || '9999-99-99';
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      }),
      aperti: vive.length, da_recuperare: tot,
      in_ritardo: nRit, totale_ritardo: ritardo,
      chiusi: righe.filter(function (x) { return x.stato === 'chiuso'; }).length,
      stornati: righe.filter(function (x) { return x.stato === 'stornato'; }).length
    };
  }

  /* ═══ FASE 4 — IL CRUSCOTTO ══════════════════════════════════════════════

     Cinque numeri in una schermata sola. Fino a oggi stavano in cinque
     linguette diverse, e per sapere come sta la contabilità dell'agenzia
     bisognava aprirle tutte e tenere i numeri a mente.

     Tre regole, e sono le stesse che valgono in tutto questo file.

     1. **Ogni riquadro dice che cosa fare.** Un numero senza il verbo è un
        numero che si guarda una volta e poi si smette: è la regola delle
        anomalie (§33) applicata a un cruscotto. «Premi da rimettere: 4.200 €»
        non è un'informazione finché non dice a chi vanno versati.
     2. **«Non si è potuto leggere» non è «zero».** Un riquadro cieco lo
        dichiara e NON mostra uno zero rassicurante: su un cruscotto di
        contabilità uno zero falso fa smettere di cercare proprio dove c'è il
        buco (§12, §18, §43).
     3. **Le due nature non si sommano.** I premi dei clienti in transito non
        sono patrimonio dell'agenzia (art. 117 CAP): un «totale liquidità»
        farebbe credere ricca un'agenzia che ha solo incassato dei premi da
        rimettere.

     `dati.letto` dice quali letture sono riuscite: quello che manca non
     diventa uno zero, diventa un riquadro che dice di non saperlo. */
  /* Le tipologie in cui il denaro c'è davvero. Non si ricava da TIPOLOGIE per
     sottrazione: aggiungendo domani una tipologia nuova, una lista «tutto
     tranne» la conterebbe come liquidità senza che nessuno l'abbia deciso. */
  var LIQUIDE = ['cassa', 'banca', 'conto_assicurativo', 'transitorio'];

  function cruscotto(dati) {
    dati = dati || {};
    var conti = dati.conti, movimenti = dati.movimenti, righe = dati.righe;
    var letto = dati.letto || {};
    var opz = { causali: dati.causali, righe: righe };
    var out = [];
    var agg = function (o) { out.push(o); };

    /* 1-2. I saldi per natura. */
    if (letto.conti === false || letto.movimenti === false) {
      agg({ k: 'premi', titolo: 'Premi dei clienti', valore: null,
            motivo: 'Non si sono potuti leggere i conti o i movimenti. Non vuol dire che sia zero: vuol dire che non si è potuto contarlo.',
            dafare: 'Riprova ad aggiornare la schermata.' });
      /* Ogni riquadro cieco si spiega DA SOLO. «Stessa lettura mancata di qui
         sopra» vale per chi legge dall'alto in basso; chi guarda un riquadro
         solo — ed è come si guarda un cruscotto — leggerebbe una riga che non
         dice niente. */
      agg({ k: 'aziendale', titolo: 'Soldi dell’agenzia', valore: null,
            motivo: 'Non si sono potuti leggere i conti o i movimenti. Non vuol dire che sia zero: vuol dire che non si è potuto contarlo.',
            dafare: 'Riprova ad aggiornare la schermata.' });
    } else {
      /* I due riquadri di liquidità contano solo i conti dove il denaro c'è
         DAVVERO: cassa, banca, conto assicurativo, transitorio. Un conto di
         debito è di natura «premi» ma non è denaro in cassa — sommandolo, un
         incasso da 500 (in cassa +500, debito −500) darebbe «premi dei
         clienti: 0 €» il giorno stesso in cui sono entrati cinquecento euro.
         Il debito ha il suo riquadro, ed è il terzo. */
      var liquidi = (conti || []).filter(function (c) {
        return c && LIQUIDE.indexOf(testo(c.tipologia)) >= 0;
      });
      var n = perNatura(liquidi, movimenti, opz);
      agg({ k: 'premi', titolo: 'Premi dei clienti', valore: n.premi, conti: n.conti_premi,
            motivo: 'In transito verso le compagnie. Non sono patrimonio dell’agenzia (art. 117 CAP), e non si sommano con la riga qui sotto.',
            dafare: n.conti_premi ? null : 'Nessun conto di natura «premi»: finché non c’è, un incasso non sa dove andare.' });
      agg({ k: 'aziendale', titolo: 'Soldi dell’agenzia', valore: n.aziendale, conti: n.conti_aziendale,
            motivo: 'Quello che è davvero dell’agenzia.',
            dafare: n.conti_aziendale ? null : 'Nessun conto aziendale: si crea in Strumenti › Conti e causali.' });
    }

    /* 3. Premi da rimettere alle compagnie: il saldo dei conti di debito.
          Nasce SOLO dalla gamba Avere di un incasso, quindi senza le righe
          risulterebbe sempre zero — ed è il numero che dice quanto denaro dei
          clienti l'agenzia deve ancora versare. */
    if (letto.conti === false || letto.movimenti === false) {
      agg({ k: 'debito', titolo: 'Premi da rimettere', valore: null,
            motivo: 'Non si sono potuti leggere i conti o i movimenti.',
            dafare: 'Riprova ad aggiornare la schermata.' });
    } else {
      var deb = (conti || []).filter(function (c) {
        return c && c.attivo !== false && testo(c.tipologia) === 'debito';
      });
      var tot = 0, quali = [];
      deb.forEach(function (c) {
        /* Un debito sta in AVERE, quindi il saldo esce negativo: quello che si
           deve è il suo valore assoluto. Mostrarlo col segno meno accanto a
           dei saldi positivi fa leggere «meno 4.200» come un ammanco. */
        var sa = saldo(c, movimenti, opz).saldo;
        tot = cent(tot + Math.abs(sa));
        if (Math.abs(sa) > TOLLERANZA) quali.push({ conto: c.nome, importo: cent(Math.abs(sa)) });
      });
      agg({ k: 'debito', titolo: 'Premi da rimettere', valore: cent(tot), conti: deb.length,
            dettaglio: quali,
            motivo: deb.length
              ? 'Denaro dei clienti già incassato e non ancora versato alle compagnie.'
              : 'Nessun conto di debito verso una compagnia: finché non c’è, un incasso non si può nemmeno registrare.',
            dafare: deb.length
              ? (tot > TOLLERANZA ? 'Rimetti in compagnia e registra la rimessa in Prima nota.' : null)
              : 'Crealo in Strumenti › Conti e causali, uno per compagnia.' });
    }

    /* 4. Premi da recuperare (Fase 3): l'agenzia ha coperto, il cliente no. */
    if (letto.crediti === false) {
      agg({ k: 'crediti', titolo: 'Premi da recuperare', valore: null,
            motivo: 'I sospesi non si sono potuti leggere.', dafare: 'Riprova ad aggiornare la schermata.' });
    } else {
      var sc = scadenzarioCrediti(dati.crediti || [], dati.recuperi || [], { oggi: dati.oggi });
      agg({ k: 'crediti', titolo: 'Premi da recuperare', valore: sc.da_recuperare,
            quanti: sc.aperti, in_ritardo: sc.in_ritardo, ritardo_importo: sc.totale_ritardo,
            motivo: sc.aperti
              ? 'L’agenzia ha coperto e il cliente non ha ancora pagato.'
              : 'Nessun premio a copertura in questo momento.',
            dafare: sc.in_ritardo
              ? 'Ce ne sono ' + sc.in_ritardo + ' oltre la data attesa: chiama i clienti.'
              : null });
    }

    /* 5. Incassi da accreditare (Fase 2 / M4): il cliente ha pagato, il conto
          non lo sa ancora. */
    if (letto.sospesi === false) {
      agg({ k: 'sospesi', titolo: 'Incassi da accreditare', valore: null,
            motivo: 'Gli incassi in arrivo non si sono potuti leggere.', dafare: 'Riprova ad aggiornare la schermata.' });
    } else {
      var rs = riepilogoSospesi(dati.sospesi || [], { oggi: dati.oggi });
      agg({ k: 'sospesi', titolo: 'Incassi da accreditare', valore: rs.totale,
            quanti: rs.righe, in_ritardo: rs.in_ritardo,
            motivo: rs.righe
              ? 'Il cliente ha pagato e sul conto non sono ancora arrivati.'
              : 'Niente in viaggio: tutto quello che è stato incassato è già sul conto.',
            dafare: rs.in_ritardo
              ? 'Ce ne sono ' + rs.in_ritardo + ' fermi da più giorni di quelli che quel mezzo ci mette: controlla in banca.'
              : null });
    }

    /* Il cruscotto sa DI NON SAPERE, e lo dice una volta sola in cima: un
       elenco con dentro un buco cieco, letto senza quella riga, si prende per
       completo. */
    var ciechi = out.filter(function (r) { return r.valore == null; }).length;
    return { righe: out, ciechi: ciechi, completo: ciechi === 0 };
  }

  var API = {
    VERSIONE: VERSIONE,
    TIPOLOGIE: TIPOLOGIE, NATURE: NATURE, SEGNI: SEGNI, GENERI: GENERI,
    CAUSALI_INIZIALI: CAUSALI_INIZIALI, CONTI_MINIMI: CONTI_MINIMI,
    CAUSALE_INCASSO: CAUSALE_INCASSO, CAUSALE_RIMESSA: CAUSALE_RIMESSA,
    /* Fase 4 — il cruscotto */
    cruscotto: cruscotto,
    /* Fase 1 — la partita doppia */
    bilanciato: bilanciato, validaRighe: validaRighe, righeDi: righeDi,
    righeSemplici: righeSemplici, contropartitaDi: contropartitaDi,
    stornabile: stornabile, storno: storno,
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
    MEZZI: MEZZI, mezzo: mezzo, contoPerMezzo: contoPerMezzo, mezziInConflitto: mezziInConflitto,
    destinoIncasso: destinoIncasso,
    giorniDa: giorniDa, inRitardo: inRitardo, sospesiAperti: sospesiAperti,
    riepilogoSospesi: riepilogoSospesi, validaAccredito: validaAccredito,
    /* Fase 2 — l'incasso di una o più rate */
    incassabile: incassabile, contoCompagnia: contoCompagnia, contoIncasso: contoIncasso,
    righeIncasso: righeIncasso, mezzoIncasso: mezzoIncasso, giornoBello: giornoBello,
    effettoSuConto: effettoSuConto, perMovimento: perMovimento,
    /* Fase 3 — i sospesi: i premi a copertura e non ricevuti */
    STATI_CREDITO: STATI_CREDITO, recuperiVivi: recuperiVivi,
    residuoCredito: residuoCredito, statoCredito: statoCredito,
    righeApertura: righeApertura, recuperabile: recuperabile,
    righeRecupero: righeRecupero, scadenzarioCrediti: scadenzarioCrediti,
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
