/* ═══════════════════════════════════════════════════════════════════════════
   IL FASCICOLO DI UNA PRATICA — quali documenti servono, dove stanno, cosa manca.
   (Lavoro 3, 18/09/2026: gestione documentale. Parte 1 + Parte 2, solo RC Auto)

   Stesso schema degli altri motori (tariffe/motore/*.js): niente import,
   niente compilazione; lo carica il browser con <script src> e Node con
   require per le prove. Qui stanno TUTTE le regole del fascicolo: la
   schermata raccoglie i file, chiama `riassunto` e mostra la risposta.

   PERCHÉ ESISTE. I documenti erano sparsi fra AssiEasy, il Mac dell'agenzia
   e i computer dei collaboratori: quando una compagnia chiedeva la
   documentazione di una pratica passata, spesso non si trovava. Un archivio
   libero non risolve: si carica «qualcosa» e non si sa cosa manca. Qui ogni
   documento è un CONTENITORE con un nome, e il fascicolo dice quali
   contenitori sono vuoti.

   DUE CONTENITORI DISTINTI, e la regola che li tiene insieme:
   · i documenti d'identità del CLIENTE stanno sull'anagrafica
     (quote_anagrafiche.documenti), con numero e scadenza. La pratica li
     EREDITA: se ci sono, non si ricaricano; se sono scaduti, il fascicolo lo
     dice e chiede di rinnovarli in anagrafica, non nella pratica;
   · i documenti di TERZI (identità del familiare convivente, libretto del
     veicolo da cui proviene la classe) restano DENTRO la pratica
     (quote_pratica_documenti) e non finiscono mai in anagrafica: sono dati
     di persone che non sono in portafoglio (GDPR), e sporcherebbero il
     portafoglio con nominativi che non sono clienti.
   Il motore lo dice con `fonte` ('anagrafica' | 'pratica') e `terzo`. Nessun
   campo di terzi ha fonte 'anagrafica': c'è una prova che lo sorveglia.

   LA PATENTE NON È UN DOCUMENTO D'IDENTITÀ (Parte 2, §3.6). Sta nel fascicolo
   di polizza, non in anagrafica: serve alle pratiche auto, non a identificare
   il cliente. Metterla fra i documenti anagrafici la farebbe valere come
   identità per qualunque ramo — e una pratica vita chiusa con una patente al
   posto della carta d'identità è un documento sbagliato in un fascicolo che
   sembra completo.

   I REQUISITI SI CONGELANO (Parte 2, §3.7). Quello che una compagnia chiede
   oggi non è quello che chiederà fra sei mesi. Se le regole si leggessero
   sempre «da vive», il giorno in cui Prima aggiunge un documento tutte le
   pratiche già chiuse diventerebbero incomplete, e nessuno saprebbe più quali
   erano davvero da completare. Alla creazione del fascicolo i requisiti si
   risolvono una volta e si scrivono sulla pratica: da lì in poi quella
   pratica ha le sue regole, e cambiare la regola della compagnia non tocca
   il passato. */
(function () {
  'use strict';

  var VERSIONE = 'fascicolo-2026-09-18';

  /* Quanti giorni prima della scadenza un documento si segnala «in scadenza».
     È una scelta di lavoro, non un numero di legge: 60 giorni bastano a
     chiamare il cliente e farsi mandare il documento nuovo. */
  var PREAVVISO_GIORNI = 60;

  /* ══ I DOCUMENTI D'IDENTITÀ DEL CLIENTE (anagrafica) ══════════════════════
     Due soli tipi, e tutti e due scadono: un documento d'identità senza data
     di scadenza non si può dire valido, quindi la data è obbligatoria.
     La patente NON è qui: sta nel fascicolo (§3.6). */
  var TIPI_CLIENTE = [
    { id: 'carta_identita', l: "Carta d'identità", identita: true, scade: true, numero: true },
    { id: 'passaporto',     l: 'Passaporto',       identita: true, scade: true, numero: true }
  ];

  /* I documenti caricati prima del 18/09/2026 hanno etichette libere
     («Documento d'identità», «Libretto di circolazione», una patente in
     anagrafica…). Si leggono ancora — un documento caricato ieri non smette
     di valere perché oggi la lista è cambiata — ma non si possono più
     scegliere: `storico: true`. Una patente vecchia in anagrafica resta
     visibile e NON vale come identità, perché non lo è. */
  function tipoCliente(etichettaOId) {
    var s = String(etichettaOId || '').toLowerCase().trim();
    for (var i = 0; i < TIPI_CLIENTE.length; i++) {
      if (TIPI_CLIENTE[i].id === s || TIPI_CLIENTE[i].l.toLowerCase() === s) return TIPI_CLIENTE[i];
    }
    if (/patente/.test(s)) {
      return { id: 'patente_storica', l: etichettaOId || 'Patente', identita: false, scade: true, numero: true, storico: true };
    }
    if (/identit|passaporto|permesso/.test(s)) {
      return { id: 'identita_storica', l: etichettaOId || "Documento d'identità", identita: true, scade: true, numero: true, storico: true };
    }
    return { id: 'altro_storico', l: etichettaOId || 'Altro', identita: false, scade: false, numero: false, storico: true };
  }

  /* ══ LE OPERAZIONI, PER RAMO ═══════════════════════════════════════════════
     Per ora solo RC Auto. Un altro ramo non ha operazioni: il fascicolo mostra
     i campi di base e basta, senza inventare una lista. */
  var OPERAZIONI = {
    rcauto: [
      { id: 'rinnovo_altra_compagnia', l: 'Rinnovo presso altra compagnia',
        d: 'Il cliente arriva da un\'altra compagnia con la sua classe di merito.' },
      { id: 'bersani_stesso',          l: 'Bersani — stesso proprietario',
        d: 'La classe arriva da un altro veicolo dello stesso proprietario.' },
      { id: 'bersani_diverso',         l: 'Bersani — proprietario diverso',
        d: 'La classe arriva dal veicolo di un familiare convivente.' }
    ]
  };

  /* ══ IL CATALOGO DEI TIPI DOCUMENTO ═══════════════════════════════════════
     Un dizionario solo, e tutto il resto lo indica per chiave: i campi di
     un'operazione, le regole di una compagnia, i requisiti congelati su una
     pratica. Una regola di compagnia che nomina un tipo che non esiste qui
     non si applica — e si dice, invece di sparire in silenzio.

     fonte      'anagrafica' | 'pratica' — DOVE sta il file, e dove si carica
     terzo      true = documento di una persona che non è il cliente (GDPR)
     serveFirma «caricato» non basta: va segnato firmato
     gruppo     due tipi con lo stesso gruppo sono in alternativa */
  var CATALOGO = {
    polizza_firmata:          { l: 'Polizza firmata',            fonte: 'pratica',    serveFirma: true },
    privacy:                  { l: 'Informativa privacy',        fonte: 'pratica',    serveFirma: true },
    documento_identita:       { l: "Documento d'identità del cliente", fonte: 'anagrafica', serveFirma: false,
                                d: 'Sta in anagrafica: la pratica lo eredita, non si ricarica.' },
    presa_visione:            { l: 'Dichiarazione di presa visione', fonte: 'pratica', serveFirma: true },
    patente:                  { l: 'Patente del cliente',        fonte: 'pratica',    serveFirma: false,
                                d: 'Sta nella pratica, non in anagrafica: non è un documento d\'identità.' },
    libretto_veicolo:         { l: 'Libretto del veicolo',       fonte: 'pratica',    serveFirma: false },
    libretto_veicolo_cedente: { l: 'Libretto del veicolo cedente', fonte: 'pratica',  serveFirma: false,
                                d: 'Il veicolo, dello stesso proprietario, da cui arriva la classe.' },
    stato_famiglia:           { l: 'Stato di famiglia',          fonte: 'pratica',    serveFirma: false,
                                gruppo: 'famiglia', d: 'In alternativa all\'autocertificazione.' },
    autocert_stato_famiglia:  { l: 'Autocertificazione dello stato di famiglia', fonte: 'pratica', serveFirma: false,
                                gruppo: 'famiglia', d: 'In alternativa allo stato di famiglia.' },
    doc_identita_familiare:   { l: 'Documento d\'identità del familiare convivente', fonte: 'pratica', serveFirma: false,
                                terzo: true, d: 'Resta nella pratica: il familiare non è in portafoglio.' },
    libretto_veicolo_classe:  { l: 'Libretto del veicolo da cui proviene la classe', fonte: 'pratica', serveFirma: false,
                                terzo: true, d: 'Il veicolo del familiare. Resta nella pratica.' },
    quietanza:                { l: 'Quietanza di pagamento',     fonte: 'pratica',    serveFirma: false, storia: true },
    altro:                    { l: 'Altro documento',            fonte: 'pratica',    serveFirma: false }
  };

  /* I tipi che si possono mettere in una regola di compagnia: tutti tranne
     quelli che sono storia e non requisito (le quietanze) e tranne quelli di
     terzi, che dipendono dall'operazione e non dalla compagnia. */
  function tipiRegolabili() {
    var out = [];
    for (var k in CATALOGO) {
      if (CATALOGO[k].storia || CATALOGO[k].terzo) continue;
      out.push({ cat: k, l: CATALOGO[k].l, fonte: CATALOGO[k].fonte });
    }
    return out;
  }

  function definizione(cat) {
    var d = CATALOGO[cat];
    if (!d) return null;
    return { cat: cat, l: d.l, fonte: d.fonte, serveFirma: !!d.serveFirma,
             terzo: !!d.terzo, gruppo: d.gruppo || null, d: d.d || '' };
  }

  /* ── quali tipi servono, per ogni operazione ─────────────────────────────── */
  var BASE = ['polizza_firmata', 'privacy', 'documento_identita'];
  var BASE_FACOLTATIVI = ['presa_visione'];

  var PER_OPERAZIONE = {
    rinnovo_altra_compagnia: ['libretto_veicolo'],
    bersani_stesso:          ['libretto_veicolo', 'libretto_veicolo_cedente'],
    bersani_diverso:         ['libretto_veicolo', 'stato_famiglia', 'autocert_stato_famiglia',
                              'doc_identita_familiare', 'libretto_veicolo_classe']
  };

  /* Il ramo si legge dalla polizza: `modulo` è 'rca' per il quotatore auto;
     prodotto o modulo che parlano di auto/moto/veicoli valgono lo stesso. */
  function ramo(polizza) {
    var p = polizza || {};
    var m = String(p.modulo || '').toLowerCase();
    var t = (m + ' ' + String(p.prodotto || '')).toLowerCase();
    if (m === 'rca' || m === 'auto' || m === 'motor') return 'rcauto';
    if (/\b(rc ?auto|auto|moto|motor|veicol|autocarr|ciclomotor)/.test(t)) return 'rcauto';
    return 'altro';
  }

  function operazioni(r) { return (OPERAZIONI[r] || []).slice(); }

  function operazione(r, id) {
    var lista = OPERAZIONI[r] || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /* ══ I REQUISITI: OPERAZIONE + COMPAGNIA, SOMMATI ══════════════════════════
     Non si sostituiscono. Una compagnia che chiede la patente la AGGIUNGE a
     quello che l'operazione già chiede; se chiede un documento che
     l'operazione chiede già, lo alza a obbligatorio ma non lo duplica —
     un requisito elencato due volte si conta due volte, e il numero dei
     mancanti diventa una bugia.

     `regole` è l'elenco della compagnia: [{ documento, obbligatorio }].
     Una regola che nomina un tipo sconosciuto finisce in `ignorate`: si
     vede, invece di sparire. */
  function requisiti(r, op, regole) {
    var out = [], visti = {}, ignorate = [];
    function metti(cat, obbl, da) {
      var def = definizione(cat);
      if (!def) { ignorate.push(cat); return; }
      if (visti[cat]) {
        var v = visti[cat];
        if (obbl && !v.obbl) { v.obbl = true; v.da = v.da + '+' + da; }
        return;
      }
      def.obbl = !!obbl;
      def.da = da;
      visti[cat] = def;
      out.push(def);
    }
    BASE.forEach(function (c) { metti(c, true, 'base'); });
    BASE_FACOLTATIVI.forEach(function (c) { metti(c, false, 'base'); });
    if (op && operazione(r, op)) (PER_OPERAZIONE[op] || []).forEach(function (c) { metti(c, true, 'operazione'); });
    (regole || []).forEach(function (g) {
      var cat = g && (g.documento || g.cat);
      if (!cat) return;
      metti(cat, g.obbligatorio !== false, 'compagnia');
    });
    out.ignorate = ignorate;
    return out;
  }

  /* I requisiti da congelare sulla pratica. Si salvano per intero, non per
     chiave: fra sei mesi il catalogo può cambiare etichetta, e il fascicolo
     di una pratica chiusa deve continuare a dire quello che diceva. */
  function congela(polizza, op, compagnia, regole, quando) {
    var r = ramo(polizza);
    var req = requisiti(r, op, regole);
    return {
      operazione: op || null,
      ramo: r,
      compagnia_id: (compagnia && compagnia.id) || null,
      compagnia: (compagnia && (compagnia.nome || compagnia)) || (polizza && polizza.compagnia) || null,
      requisiti: req.map(function (x) { return x; }),
      ignorate: req.ignorate,
      congelato_il: quando || new Date().toISOString()
    };
  }

  /* I campi che la schermata deve mostrare. Se la pratica ha i requisiti
     congelati, sono quelli: è il punto di tutta la faccenda. */
  function campi(polizza, opt) {
    var o = opt || {};
    var f = (polizza && polizza.dati && polizza.dati.fascicolo) || null;
    if (f && Array.isArray(f.requisiti) && f.requisiti.length) {
      return f.requisiti.map(function (x) {
        var c = {};
        for (var k in x) c[k] = x[k];
        c.terzo = !!c.terzo;
        c.congelato = true;
        return c;
      });
    }
    var r = ramo(polizza);
    var op = (f && f.operazione) || o.operazione || null;
    if (op && !operazione(r, op)) op = null;
    return requisiti(r, op, o.regole);
  }

  /* ══ LE SCADENZE ═══════════════════════════════════════════════════════════ */
  function giorno(v) {
    if (!v) return null;
    var d = v instanceof Date ? new Date(v.getTime()) : new Date(String(v).slice(0, 10) + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function scadenza(doc, oggi) {
    var s = giorno(doc && doc.scadenza);
    if (!s) return { stato: 'senza_data', giorni: null };
    var o = giorno(oggi || new Date());
    var giorni = Math.round((s - o) / 86400000);
    if (giorni < 0) return { stato: 'scaduto', giorni: giorni };
    if (giorni <= PREAVVISO_GIORNI) return { stato: 'in_scadenza', giorni: giorni };
    return { stato: 'valido', giorni: giorni };
  }

  /* ══ I DOCUMENTI DEL CLIENTE, letti dall'anagrafica ════════════════════════
     Due posti, per storia: `doc_identita_url` (una colonna sola, dei primi
     tempi) e `documenti` (jsonb, un elenco).

     PIÙ VERSIONI DELLO STESSO TIPO (§3.5). Una carta d'identità rinnovata non
     cancella quella di prima: la nuova diventa ATTIVA, la vecchia resta nello
     storico. Attiva = la più recente NON SCADUTA di quel tipo. Se sono tutte
     scadute, attiva è la più recente lo stesso: così il fascicolo può dire
     «scaduto» invece di «mancante», che sono due lavori diversi (chiedere il
     rinnovo, oppure chiedere il documento). */
  function documentiCliente(anag, oggi) {
    var a = anag || {};
    var out = [];
    var lista = Array.isArray(a.documenti) ? a.documenti : [];
    for (var i = 0; i < lista.length; i++) {
      var d = lista[i] || {};
      if (!d.url) continue;
      var t = tipoCliente(d.tipo);
      out.push({
        indice: i, tipo: t, etichetta: t.storico && d.tipo ? String(d.tipo) : t.l,
        numero: d.numero || '', descr: d.descr || '', nome: d.nome || '', url: d.url,
        data: d.data || null, scadenza: d.scadenza || null,
        stato: scadenza(d, oggi), origine: 'documenti'
      });
    }
    if (a.doc_identita_url) {
      out.push({
        indice: -1, tipo: tipoCliente("Documento d'identità"), etichetta: "Documento d'identità",
        numero: '', descr: a.doc_identita_nome || '', nome: a.doc_identita_nome || '',
        url: a.doc_identita_url, data: null, scadenza: null,
        stato: scadenza({}, oggi), origine: 'legacy'
      });
    }
    /* Il più recente per primo: la data di caricamento quando c'è, poi la
       scadenza più lontana, che è il modo di dire «documento più nuovo»
       quando la data di caricamento manca (i documenti vecchi non l'hanno). */
    out.sort(function (x, y) {
      var dx = x.data || '', dy = y.data || '';
      if (dx !== dy) return dx < dy ? 1 : -1;
      var sx = x.scadenza || '', sy = y.scadenza || '';
      if (sx !== sy) return sx < sy ? 1 : -1;
      return 0;
    });
    var attivo = {};
    out.forEach(function (d) {
      var k = d.tipo.id;
      if (attivo[k]) { d.attivo = false; return; }
      if (d.stato.stato !== 'scaduto') { attivo[k] = true; d.attivo = true; }
      else d.attivo = false;
    });
    /* Se di un tipo non è rimasto niente di valido, l'ultimo scaduto è
       comunque quello «attivo»: è il documento da rinnovare. */
    out.forEach(function (d) {
      if (!attivo[d.tipo.id]) { attivo[d.tipo.id] = true; d.attivo = true; }
    });
    return out;
  }

  /* Il documento d'identità che la pratica eredita: il migliore fra gli
     attivi. Un documento valido batte uno senza data, che batte uno scaduto:
     se resta solo quello scaduto, si dice «scaduto», non «c'è». */
  function identitaCliente(anag, oggi) {
    var docs = documentiCliente(anag, oggi).filter(function (d) { return d.tipo.identita; });
    if (!docs.length) return null;
    var ordine = { valido: 0, in_scadenza: 1, senza_data: 2, scaduto: 3 };
    docs.sort(function (x, y) { return ordine[x.stato.stato] - ordine[y.stato.stato]; });
    return docs[0];
  }

  /* ══ LO STATO DI UN CONTENITORE ════════════════════════════════════════════
     mancante → caricato → firmato (pratica); ereditato | scaduto (anagrafica).
     `ok` è l'unica cosa che conta per il perfezionamento. */
  function stato(campo, docsPratica, anag, oggi) {
    if (campo.fonte === 'anagrafica') {
      var id = identitaCliente(anag, oggi);
      if (!id) return { stato: 'mancante', ok: false, doc: null, fonte: 'anagrafica' };
      if (id.stato.stato === 'scaduto') return { stato: 'scaduto', ok: false, doc: id, fonte: 'anagrafica' };
      return { stato: 'ereditato', ok: true, doc: id, fonte: 'anagrafica', scadenza: id.stato };
    }
    var d = (docsPratica || []).filter(function (x) { return x.categoria === campo.cat && x.url; });
    if (!d.length) return { stato: 'mancante', ok: false, doc: null, fonte: 'pratica' };
    var firmato = null;
    for (var i = 0; i < d.length; i++) if (d[i].firmato) { firmato = d[i]; break; }
    if (campo.serveFirma && !firmato) return { stato: 'caricato', ok: false, doc: d[0], fonte: 'pratica' };
    return { stato: 'firmato', ok: true, doc: firmato || d[0], fonte: 'pratica' };
  }

  /* Il riassunto per la schermata: ogni campo con il suo stato, il conto dei
     mancanti (un gruppo in alternativa conta UNA volta), e «completo».
     `opt`: { oggi, regole, operazione }. Una data da sola si accetta lo
     stesso, perché è il caso più frequente nelle prove. */
  function riassunto(polizza, docsPratica, anag, opt) {
    var o = (!opt || typeof opt === 'string' || opt instanceof Date) ? { oggi: opt } : opt;
    var oggi = o.oggi;
    var r = ramo(polizza);
    var f = (polizza && polizza.dati && polizza.dati.fascicolo) || null;
    var congelato = !!(f && Array.isArray(f.requisiti) && f.requisiti.length);
    var op = (f && f.operazione) || o.operazione || null;
    if (op && !operazione(r, op)) op = null;

    var lista = campi(polizza, { operazione: op, regole: o.regole }).map(function (c) {
      var s = stato(c, docsPratica, anag, oggi);
      var k = {};
      for (var x in c) k[x] = c[x];
      k.stato = s.stato; k.ok = s.ok; k.doc = s.doc; k.scadenzaDoc = s.scadenza || null;
      return k;
    });
    /* Un gruppo è a posto se uno dei suoi campi lo è; e i suoi campi lo
       sanno, così la schermata non mette in rosso l'alternativa non scelta. */
    var gruppi = {};
    lista.forEach(function (c) { if (c.gruppo) gruppi[c.gruppo] = gruppi[c.gruppo] || c.ok; });
    lista.forEach(function (c) { if (c.gruppo) c.gruppoOk = gruppi[c.gruppo]; });
    var contati = {}, mancanti = 0, elenco = [];
    lista.forEach(function (c) {
      if (!c.obbl) return;
      if (c.gruppo) {
        if (contati[c.gruppo]) return;
        contati[c.gruppo] = true;
        if (!gruppi[c.gruppo]) { mancanti++; elenco.push(c.l); }
      } else if (!c.ok) { mancanti++; elenco.push(c.l); }
    });
    var serveOperazione = operazioni(r).length > 0 && !op;
    return {
      ramo: r, operazione: op, operazioni: operazioni(r), serveOperazione: serveOperazione,
      congelato: congelato, congelatoIl: congelato ? f.congelato_il : null,
      compagnia: f ? (f.compagnia || null) : null, compagniaId: f ? (f.compagnia_id || null) : null,
      campi: lista, mancanti: mancanti, cheCosaManca: elenco,
      completo: mancanti === 0 && !serveOperazione
    };
  }

  function mancanti(polizza, docsPratica, anag, opt) {
    return riassunto(polizza, docsPratica, anag, opt).mancanti;
  }

  /* Dove va a finire un file caricato in un contenitore: MAI un documento di
     terzi in anagrafica, MAI l'identità del cliente nella pratica. */
  function destinazione(campo) {
    return campo && campo.fonte === 'anagrafica' ? 'anagrafica' : 'pratica';
  }

  /* ══ I DUE CONTATORI DI AGENZIA (§3.8) ═════════════════════════════════════
     Restano separati perché si risolvono in modo diverso: il primo si chiude
     chiedendo un documento nuovo al cliente, il secondo recuperando un
     documento che un operatore non ha caricato. Sommarli in un numero solo
     vorrebbe dire non sapere a chi telefonare. */
  function scadenzeClienti(anagrafiche, oggi) {
    var righe = [];
    (anagrafiche || []).forEach(function (a) {
      var docs = documentiCliente(a, oggi).filter(function (d) { return d.tipo.identita && d.attivo; });
      if (!docs.length) return;
      var peggio = null;
      var ordine = { scaduto: 0, in_scadenza: 1, senza_data: 2, valido: 3 };
      docs.forEach(function (d) { if (!peggio || ordine[d.stato.stato] < ordine[peggio.stato.stato]) peggio = d; });
      if (peggio.stato.stato !== 'scaduto' && peggio.stato.stato !== 'in_scadenza') return;
      righe.push({
        cliente_id: a.id, nominativo: a.nominativo || '', documento: peggio.etichetta,
        numero: peggio.numero || '', scadenza: peggio.scadenza,
        stato: peggio.stato.stato, giorni: peggio.stato.giorni
      });
    });
    righe.sort(function (x, y) { return (x.giorni == null ? 0 : x.giorni) - (y.giorni == null ? 0 : y.giorni); });
    return {
      righe: righe,
      scaduti: righe.filter(function (r) { return r.stato === 'scaduto'; }).length,
      inScadenza: righe.filter(function (r) { return r.stato === 'in_scadenza'; }).length
    };
  }

  /* Il contatore dei fascicoli incompleti guarda DUE cose che si lavorano
     allo stesso modo: le polizze in portafoglio e le pratiche aperte prima
     che la polizza esista. Un fascicolo di pratica che non comparisse qui
     sarebbe un fascicolo che nessuno va a completare — cioè il motivo per
     cui il contatore esiste.

     Chi chiama passa righe già marcate con `entita` ('polizza' o 'pratica');
     senza marcatura si assume 'polizza', che è com'era prima. La riga che
     esce porta `entita` e `id`: la schermata apre l'uno o l'altro fascicolo
     senza indovinare. `polizza_id` resta per le polizze e vale null per le
     pratiche: una pratica non ha un id di polizza, e scrivercelo sarebbe una
     bugia comoda da leggere. */
  function fascicoliIncompleti(righeEntita, docsPerEntita, anagPerCliente, oggi) {
    var righe = [];
    (righeEntita || []).forEach(function (p) {
      var r = riassunto(p, (docsPerEntita || {})[p.id] || [], (anagPerCliente || {})[p.cliente_id] || null, { oggi: oggi });
      if (r.completo) return;
      var entita = p.entita === 'pratica' ? 'pratica' : 'polizza';
      righe.push({
        entita: entita, id: p.id,
        polizza_id: entita === 'polizza' ? p.id : null,
        cliente: p.cliente || '', cliente_id: p.cliente_id || null,
        compagnia: r.compagnia || p.compagnia || '', operatore: p.creato_nome || '',
        creato_da: p.creato_da || null, prodotto: p.prodotto || p.modulo || '',
        /* Una pratica non ha una data di effetto: ha una decorrenza prevista.
           Sono due cose diverse e la colonna è una sola, quindi la riga dice
           anche quale delle due sta mostrando. */
        data_effetto: p.data_effetto || p.data_prevista || null,
        prevista: !p.data_effetto && !!p.data_prevista,
        descrizione: p.descrizione || '',
        mancanti: r.mancanti, cheCosaManca: r.cheCosaManca,
        serveOperazione: r.serveOperazione
      });
    });
    righe.sort(function (x, y) { return y.mancanti - x.mancanti; });
    return {
      righe: righe, pratiche: righe.length,
      polizze: righe.filter(function (r) { return r.entita === 'polizza'; }).length,
      senzaPolizza: righe.filter(function (r) { return r.entita === 'pratica'; }).length
    };
  }

  /* ══ QUANDO LA POLIZZA ARRIVA ══════════════════════════════════════════════
     La pratica le si attacca e i documenti smettono di stare per conto loro.
     Non è un'operazione da fare alla leggera: porta sulla polizza i requisiti
     congelati il giorno in cui la pratica è nata. Quattro casi in cui NON si
     collega, e si dice perché — collegare lo stesso vorrebbe dire scrivere
     sulla polizza un elenco di requisiti che non sono i suoi. */
  function collegabile(pratica, polizza) {
    if (!pratica || !polizza) return { ok: false, motivo: 'Manca la pratica o la polizza.' };
    var f = (pratica.dati && pratica.dati.fascicolo) || null;
    if (!f || !Array.isArray(f.requisiti) || !f.requisiti.length) {
      return { ok: false, motivo: 'La pratica non ha ancora un fascicolo: prima si sceglie l\'operazione.' };
    }
    var g = (polizza.dati && polizza.dati.fascicolo) || null;
    if (g && Array.isArray(g.requisiti) && g.requisiti.length) {
      /* A meno che non sia PROPRIO QUESTO fascicolo: un collegamento
         interrotto a metà (i requisiti copiati, i documenti non ancora
         spostati) deve poter essere ripreso. Senza questa riga il secondo
         tentativo direbbe «la polizza ha già un fascicolo» e i documenti
         resterebbero sulla pratica per sempre. */
      if (!(g.congelato_il && g.congelato_il === f.congelato_il && g.operazione === f.operazione)) {
        return { ok: false, motivo: 'Questa polizza ha già il suo fascicolo: collegarla cancellerebbe i requisiti congelati su di essa.' };
      }
    }
    if (pratica.cliente_id && polizza.cliente_id && pratica.cliente_id !== polizza.cliente_id) {
      return { ok: false, motivo: 'La pratica e la polizza sono intestate a due clienti diversi.' };
    }
    var rp = f.ramo || ramo(pratica);
    if (rp !== ramo(polizza)) {
      return { ok: false, motivo: 'La pratica è di un altro ramo (' + rp + ') rispetto alla polizza (' + ramo(polizza) + '): i requisiti congelati non sarebbero i suoi.' };
    }
    /* Si passa COM'È, `congelato_il` compreso: i requisiti sono quelli del
       giorno in cui la pratica è nata, non di oggi. Rimetterci la data di
       oggi vorrebbe dire dire che sono stati riletti, e non è vero. */
    return { ok: true, fascicolo: f };
  }

  var API = {
    VERSIONE: VERSIONE, PREAVVISO_GIORNI: PREAVVISO_GIORNI,
    TIPI_CLIENTE: TIPI_CLIENTE, OPERAZIONI: OPERAZIONI, CATALOGO: CATALOGO,
    BASE: BASE, BASE_FACOLTATIVI: BASE_FACOLTATIVI, PER_OPERAZIONE: PER_OPERAZIONE,
    tipoCliente: tipoCliente, tipiRegolabili: tipiRegolabili, definizione: definizione,
    ramo: ramo, operazioni: operazioni, operazione: operazione,
    requisiti: requisiti, congela: congela, campi: campi,
    scadenza: scadenza, documentiCliente: documentiCliente, identitaCliente: identitaCliente,
    stato: stato, riassunto: riassunto, mancanti: mancanti, destinazione: destinazione,
    scadenzeClienti: scadenzeClienti, fascicoliIncompleti: fascicoliIncompleti,
    collegabile: collegabile
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Fascicolo = API;
})();
