/* ═══════════════════════════════════════════════════════════════════════════
   TFR DAL LATO DEL DATORE DI LAVORO — che cosa cambia per l'azienda se il TFR
   dei dipendenti va al fondo pensione invece di restare in azienda.

   Stesso schema degli altri motori (tariffe/motore/*.js): niente import,
   niente compilazione; lo carica il browser con <script src> e Node con
   require per le prove. Qui stanno TUTTE le formule del ramo datoriale: la
   schermata raccoglie i dati, chiama `calcola` e mostra la risposta. Il
   foglio per il cliente usa `tabellaHtml` e `spiegazioneHtml` di qui.

   DUE CONFRONTI DIVERSI, e il motore deve dire quale sta facendo:
   · sotto i 50 addetti il TFR non conferito RESTA IN AZIENDA: il confronto è
     azienda contro fondo, e il fondo porta deduzione, esoneri e niente
     rivalutazione da pagare;
   · da 50 addetti in su il TFR non conferito va comunque al Fondo di
     Tesoreria INPS (L. 296/2006 art. 1 c. 755): il confronto vero è Tesoreria
     contro fondo, e le misure compensative valgono in ENTRAMBI i casi
     (c. 764). Per l'azienda il conto è quasi neutro, e va detto: il vantaggio
     del fondo, lì, è del dipendente.

   NIENTE NUMERI INVENTATI. Ogni valore qui sotto porta la sua fonte di legge;
   quelli che arrivano dalla tabella «Parametri previdenziali» la sostituiscono
   (`numeriDiLegge`). Le IPOTESI (organico e stipendi costanti, inflazione,
   aliquota) si dichiarano nel risultato e finiscono sul foglio. */
(function () {
  'use strict';

  var VERSIONE = 'tfr-datore-2026-09-17';

  var IRPEF = (typeof window !== 'undefined' && window.Irpef) ? window.Irpef
    : (typeof require === 'function' ? (function () { try { return require('./irpef.js'); } catch (e) { return null; } })() : null);

  var num = function (v) { var n = Number(v); return isFinite(n) ? n : 0; };
  var pos = function (v) { return Math.max(0, num(v)); };
  var r2 = function (v) { return Math.round(num(v) * 100) / 100; };

  /* ══ I NUMERI DI LEGGE ═══════════════════════════════════════════════════ */
  var LEGGE = {
    deduzioneMeno50: { v: 0.06, etichetta: 'Deduzione dal reddito d\'impresa, fino a 49 addetti', unita: '% del TFR conferito',
      fonte: 'Art. 10 c. 1 D.Lgs. 252/2005 (6% per le imprese con meno di 50 addetti)', daConfermare: false },
    deduzioneAlmeno50: { v: 0.04, etichetta: 'Deduzione dal reddito d\'impresa, da 50 addetti', unita: '% del TFR conferito',
      fonte: 'Art. 10 c. 1 D.Lgs. 252/2005 (4%)', daConfermare: false },
    esoneroFondoGaranzia: { v: 0.0020, etichetta: 'Esonero dal contributo al Fondo di garanzia INPS', unita: '% della retribuzione imponibile',
      fonte: 'Art. 10 c. 2 D.Lgs. 252/2005: 0,20% (0,40% per i dirigenti industriali ex INPDAI), nella stessa percentuale di TFR conferito', daConfermare: false },
    esoneroFondoGaranziaDirigenti: { v: 0.0040, etichetta: 'Esonero Fondo di garanzia, dirigenti industriali', unita: '%',
      fonte: 'Art. 10 c. 2 D.Lgs. 252/2005 (ex INPDAI)', daConfermare: false },
    riduzioneOneriImpropri: { v: 0.0028, etichetta: 'Riduzione dei contributi minori (CUAF, maternità, disoccupazione)', unita: '% della retribuzione imponibile',
      fonte: 'Art. 10 c. 3 D.Lgs. 252/2005 e art. 1 c. 764 L. 296/2006: 0,19 punti nel 2008, +0,01 l\'anno, 0,28 dal 2014; proporzionale alla quota di TFR conferita', daConfermare: false },
    rivalutazioneFissa: { v: 0.015, etichetta: 'Rivalutazione del TFR in azienda, quota fissa', unita: '% annuo',
      fonte: 'Art. 2120 c. 4 c.c.: 1,5% fisso più il 75% dell\'inflazione', daConfermare: false },
    rivalutazioneQuotaInflazione: { v: 0.75, etichetta: 'Rivalutazione del TFR in azienda, quota dell\'inflazione', unita: 'frazione',
      fonte: 'Art. 2120 c. 4 c.c.', daConfermare: false },
    divisoreTfr: { v: 13.5, etichetta: 'Quota annua di TFR: retribuzione utile diviso 13,5', unita: 'divisore',
      fonte: 'Art. 2120 c. 1 c.c.', daConfermare: false },
    sogliaTesoreria: { v: 50, etichetta: 'Soglia di addetti oltre cui il TFR va al Fondo di Tesoreria INPS', unita: 'addetti',
      fonte: 'Art. 1 c. 755 L. 296/2006: datori con almeno 50 addetti', daConfermare: false },
    ires: { v: 0.24, etichetta: 'IRES', unita: '%',
      fonte: 'Art. 77 c. 1 TUIR (D.P.R. 917/1986), 24% dal 2017', daConfermare: false },
    inflazioneAttesa: { v: 0.02, etichetta: 'Inflazione attesa', unita: '% annuo',
      fonte: 'Obiettivo di inflazione BCE (2%) e ipotesi standard COVIP', daConfermare: false },
  };

  /* Le misure compensative valgono anche per il TFR versato al Fondo di
     Tesoreria: e' il motivo per cui, da 50 addetti in su, il confronto per
     l'azienda e' quasi neutro. */
  var FONTE_TESORERIA = 'Art. 1 cc. 755 e 764 L. 296/2006: da 50 addetti il TFR non conferito ai fondi va al Fondo di Tesoreria INPS, e le misure compensative dell\'art. 10 D.Lgs. 252/2005 spettano anche su quelle quote.';

  /* ══ DALLA TABELLA «PARAMETRI PREVIDENZIALI» ══════════════════════════════ */
  function numeriDiLegge(par) {
    var applicati = [];
    if (!par || typeof par !== 'object') return { applicati: applicati };
    var fonteDi = function (k) { return (par.__fonti && par.__fonti[k]) ? String(par.__fonti[k]) : LEGGE_fonte(k); };
    var LEGGE_fonte = function (k) { return 'Tabella «Parametri previdenziali», chiave ' + k; };
    var provvisorio = function (k) { return !!(par.__daConfermare && par.__daConfermare[k]); };
    var metti = function (chiave, valore, chiaveTabella) {
      if (valore === null || valore === undefined || !isFinite(Number(valore))) return;
      LEGGE[chiave].v = Number(valore); LEGGE[chiave].fonte = fonteDi(chiaveTabella); LEGGE[chiave].daConfermare = provvisorio(chiaveTabella);
      applicati.push(chiave);
    };
    var d = par.tfr_datore_deduzione;
    if (d && typeof d === 'object') { metti('deduzioneMeno50', d.meno50, 'tfr_datore_deduzione'); metti('deduzioneAlmeno50', d.almeno50, 'tfr_datore_deduzione'); }
    if (par.tfr_datore_esonero_garanzia != null) {
      var g = par.tfr_datore_esonero_garanzia;
      if (g && typeof g === 'object') { metti('esoneroFondoGaranzia', g.generale, 'tfr_datore_esonero_garanzia'); metti('esoneroFondoGaranziaDirigenti', g.dirigenti, 'tfr_datore_esonero_garanzia'); }
      else metti('esoneroFondoGaranzia', g, 'tfr_datore_esonero_garanzia');
    }
    if (par.tfr_datore_oneri_impropri != null) metti('riduzioneOneriImpropri', par.tfr_datore_oneri_impropri, 'tfr_datore_oneri_impropri');
    var rv = par.tfr_rivalutazione;
    if (rv && typeof rv === 'object') { metti('rivalutazioneFissa', rv.fissa, 'tfr_rivalutazione'); metti('rivalutazioneQuotaInflazione', rv.quotaInflazione, 'tfr_rivalutazione'); }
    if (par.tfr_divisore != null) metti('divisoreTfr', par.tfr_divisore, 'tfr_divisore');
    if (par.tfr_soglia_tesoreria != null) metti('sogliaTesoreria', par.tfr_soglia_tesoreria, 'tfr_soglia_tesoreria');
    if (par.ires != null) metti('ires', par.ires, 'ires');
    if (par.inflazione_attesa != null) metti('inflazioneAttesa', par.inflazione_attesa, 'inflazione_attesa');
    return { applicati: applicati };
  }

  function daConfermare() {
    var out = [];
    for (var k in LEGGE) if (Object.prototype.hasOwnProperty.call(LEGGE, k) && LEGGE[k].daConfermare) {
      out.push({ gruppo: 'Numeri di legge (datore)', etichetta: LEGGE[k].etichetta, fonte: LEGGE[k].fonte });
    }
    return out;
  }

  /* ══ IL CONTO ════════════════════════════════════════════════════════════ */
  function tassoRivalutazione() { return LEGGE.rivalutazioneFissa.v + LEGGE.rivalutazioneQuotaInflazione.v * LEGGE.inflazioneAttesa.v; }

  /* L'aliquota con cui la deduzione diventa euro. Societa' di capitali: IRES.
     Ditta individuale o professionista: l'IRPEF marginale del titolare, che
     il flusso pensione conosce gia' (e' il cliente). Senza reddito del
     titolare l'aliquota non si inventa: si dice che manca. */
  function aliquotaImposta(forma, redditoTitolareAnnuo) {
    if (forma === 'societa') return { tipo: 'IRES', valore: LEGGE.ires.v, fonte: LEGGE.ires.fonte, nota: 'IRES al ' + perc(LEGGE.ires.v) + '; l\'IRAP non è considerata.' };
    var R = pos(redditoTitolareAnnuo);
    if (R > 0 && IRPEF && typeof IRPEF.aliquotaMarginale === 'function') {
      var a = IRPEF.aliquotaMarginale(R);
      return { tipo: 'IRPEF', valore: a, fonte: 'Aliquota marginale IRPEF sul reddito del titolare (' + euro(R) + ' l\'anno)', nota: 'Aliquota marginale IRPEF del titolare, ' + perc(a) + ': la deduzione riduce il reddito d\'impresa che confluisce nel suo IRPEF.' };
    }
    return { tipo: null, valore: null, fonte: null, nota: 'Aliquota del titolare non determinabile: manca il suo reddito.' };
  }

  function calcola(dati) {
    dati = dati || {};
    var n = Math.floor(pos(dati.dipendenti));
    var stip = pos(dati.stipendioMedioMensile);
    var mens = Math.min(16, Math.max(12, Math.round(num(dati.mensilita) || 13)));
    var anni = Math.min(40, Math.max(1, Math.round(num(dati.anni) || 20)));
    var quota = (dati.quotaConferita === undefined || dati.quotaConferita === null) ? 1 : Math.min(1, pos(dati.quotaConferita));
    var soglia = (dati.soglia === 'almeno50' || dati.soglia === 'oltre50') ? 'almeno50' : 'meno50';
    var forma = dati.forma === 'societa' ? 'societa' : 'individuale';
    var problemi = [];
    if (!(n > 0)) problemi.push('Manca il numero dei dipendenti.');
    if (!(stip > 0)) problemi.push('Manca lo stipendio medio mensile.');
    if (problemi.length) return { ok: false, versione: VERSIONE, problemi: problemi };

    var ral = stip * mens;
    var monte = ral * n;
    var tfrAnnuo = monte / LEGGE.divisoreTfr.v * quota;
    var aliqDed = soglia === 'meno50' ? LEGGE.deduzioneMeno50.v : LEGGE.deduzioneAlmeno50.v;
    var deduzione = tfrAnnuo * aliqDed;
    var imposta = aliquotaImposta(forma, dati.redditoTitolareAnnuo);
    var valoreDeduzione = imposta.valore != null ? deduzione * imposta.valore : null;
    var esonero = monte * LEGGE.esoneroFondoGaranzia.v * quota;
    var sgravio = monte * LEGGE.riduzioneOneriImpropri.v * quota;
    var t = tassoRivalutazione();
    var confronto = soglia === 'meno50' ? 'azienda' : 'tesoreria';

    /* Anno per anno. La rivalutazione si paga sul TFR ACCANTONATO: il primo
       anno il TFR nuovo non c'e' ancora, dal secondo cresce. Quello gia' in
       azienda prima della scelta resta dov'e' e si rivaluta comunque: non
       entra nel confronto. */
    var perAnno = [], stock = 0, totale = 0, totRival = 0;
    for (var k = 1; k <= anni; k++) {
      var rival = confronto === 'azienda' ? stock * t : 0;
      var compensative = confronto === 'azienda' ? ((valoreDeduzione || 0) + esonero + sgravio) : 0;
      var vantaggio = compensative + rival;
      perAnno.push({ anno: k, tfrConferito: r2(tfrAnnuo), deduzione: r2(confronto === 'azienda' ? (valoreDeduzione || 0) : 0),
        esonero: r2(confronto === 'azienda' ? esonero : 0), sgravio: r2(confronto === 'azienda' ? sgravio : 0),
        rivalutazioneEvitata: r2(rival), vantaggio: r2(vantaggio), tfrInAziendaSeResta: r2(stock * (1 + t) + tfrAnnuo) });
      totale += vantaggio; totRival += rival;
      stock = stock * (1 + t) + tfrAnnuo;
    }
    var annuo = confronto === 'azienda' ? ((valoreDeduzione || 0) + esonero + sgravio) : 0;

    var voci = [
      { chiave: 'deduzione', etichetta: 'Deduzione aggiuntiva dal reddito d\'impresa (' + perc(aliqDed) + ' del TFR conferito)',
        azienda: confronto === 'azienda' ? 'Nessuna.' : 'Spetta anche sul TFR versato alla Tesoreria (' + perc(aliqDed) + ').',
        fondo: 'Deduce ' + euro(deduzione) + ' l\'anno' + (valoreDeduzione != null ? ', che valgono ' + euro(valoreDeduzione) + ' di imposta in meno' : '') + '.',
        annuoAzienda: confronto === 'azienda' ? 0 : (valoreDeduzione || 0), annuoFondo: valoreDeduzione || 0, differenzaAnnua: confronto === 'azienda' ? (valoreDeduzione || 0) : 0,
        fonte: soglia === 'meno50' ? LEGGE.deduzioneMeno50.fonte : LEGGE.deduzioneAlmeno50.fonte },
      { chiave: 'garanzia', etichetta: 'Contributo al Fondo di garanzia INPS (' + perc(LEGGE.esoneroFondoGaranzia.v, 2) + ' della retribuzione)',
        azienda: confronto === 'azienda' ? 'Si paga: ' + euro(esonero) + ' l\'anno.' : 'Esonerato anche con la Tesoreria.',
        fondo: 'Esonerato: ' + euro(esonero) + ' l\'anno in meno.',
        annuoAzienda: confronto === 'azienda' ? -esonero : 0, annuoFondo: 0, differenzaAnnua: confronto === 'azienda' ? esonero : 0, fonte: LEGGE.esoneroFondoGaranzia.fonte },
      { chiave: 'oneri', etichetta: 'Contributi minori — CUAF, maternità, disoccupazione (' + perc(LEGGE.riduzioneOneriImpropri.v, 2) + ' della retribuzione)',
        azienda: confronto === 'azienda' ? 'Si pagano per intero.' : 'Ridotti anche con la Tesoreria.',
        fondo: 'Ridotti di ' + euro(sgravio) + ' l\'anno.',
        annuoAzienda: confronto === 'azienda' ? -sgravio : 0, annuoFondo: 0, differenzaAnnua: confronto === 'azienda' ? sgravio : 0, fonte: LEGGE.riduzioneOneriImpropri.fonte },
      { chiave: 'rivalutazione', etichetta: 'Rivalutazione del TFR accantonato (' + perc(LEGGE.rivalutazioneFissa.v, 1) + ' + ' + perc(LEGGE.rivalutazioneQuotaInflazione.v) + ' dell\'inflazione = ' + perc(t, 2) + ' l\'anno)',
        azienda: confronto === 'azienda' ? 'A carico dell\'azienda, ogni anno, su tutto il TFR accumulato: al ventesimo anno ' + euro(perAnno[perAnno.length - 1].rivalutazioneEvitata) + '.' : 'A carico del Fondo di Tesoreria.',
        fondo: 'Nessuna: il TFR conferito si rivaluta nel fondo, a carico del fondo.',
        annuoAzienda: 0, annuoFondo: 0, differenzaAnnua: 0, differenzaTotale: totRival, fonte: LEGGE.rivalutazioneFissa.fonte, crescente: true },
      { chiave: 'liquidita', etichetta: 'Liquidità',
        azienda: confronto === 'azienda' ? 'Il TFR resta in azienda: ' + euro(tfrAnnuo) + ' l\'anno di autofinanziamento, al costo della rivalutazione.' : 'Esce comunque: va versato mensilmente alla Tesoreria INPS.',
        fondo: 'Esce: ' + euro(tfrAnnuo) + ' l\'anno vanno versati al fondo.',
        annuoAzienda: null, annuoFondo: null, differenzaAnnua: null, informativa: true,
        fonte: confronto === 'azienda' ? LEGGE.divisoreTfr.fonte : FONTE_TESORERIA },
    ];

    var ipotesi = [
      n + ' dipendenti e stipendio medio di ' + euro(stip) + ' al mese su ' + mens + ' mensilità, costanti per tutto il periodo.',
      'TFR conferito al ' + perc(quota) + ' della quota annua (retribuzione diviso ' + LEGGE.divisoreTfr.v + ').',
      'Inflazione attesa ' + perc(LEGGE.inflazioneAttesa.v) + ' l\'anno.',
      imposta.nota,
      'Il TFR già accantonato prima della scelta resta in azienda e non entra nel confronto.',
    ];
    var dc = daConfermare();
    if (imposta.valore == null) dc.push({ gruppo: 'Datore di lavoro', etichetta: 'Aliquota d\'imposta del titolare', fonte: imposta.nota });

    return {
      ok: true, versione: VERSIONE, soglia: soglia, confronto: confronto, forma: forma,
      dipendenti: n, stipendioMedioMensile: stip, mensilita: mens, ral: r2(ral), monteRetributivo: r2(monte), tfrAnnuo: r2(tfrAnnuo),
      aliquotaDeduzione: aliqDed, deduzioneAnnua: r2(deduzione), imposta: imposta, valoreDeduzioneAnnuo: valoreDeduzione == null ? null : r2(valoreDeduzione),
      esoneroAnnuo: r2(esonero), sgravioAnnuo: r2(sgravio), tassoRivalutazione: t,
      risparmioAnnuo: r2(annuo), anni: anni, ventennale: { anni: anni, totale: r2(totale), rivalutazioneEvitata: r2(totRival), misureCompensative: r2(totale - totRival) },
      perAnno: perAnno, voci: voci, ipotesi: ipotesi, daConfermare: dc,
      /* Da 50 addetti in su il vantaggio per l'azienda e' nullo: il TFR esce
         comunque e le misure compensative spettano in entrambi i casi. Il
         vantaggio del fondo, li', e' del dipendente — e va detto cosi'. */
      nota: confronto === 'tesoreria'
        ? 'Da ' + LEGGE.sogliaTesoreria.v + ' addetti in su il TFR non conferito ai fondi va comunque al Fondo di Tesoreria INPS: non resta in azienda. Deduzione, esonero e riduzione dei contributi spettano in entrambi i casi. Per l\'azienda il confronto è neutro; il vantaggio del fondo pensione è del dipendente.'
        : 'Sotto i ' + LEGGE.sogliaTesoreria.v + ' addetti il TFR non conferito resta in azienda: il confronto è azienda contro fondo.',
      fonteTesoreria: FONTE_TESORERIA,
    };
  }

  /* ══ I TESTI ═════════════════════════════════════════════════════════════ */
  function euro(v) { return (Math.round(num(v))).toLocaleString('it-IT', { useGrouping: 'always' }) + ' €'; }
  function perc(v, dec) { return (num(v) * 100).toFixed(dec == null ? 0 : dec).replace('.', ',') + '%'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* PRIMA LA TABELLA, pulita, coi numeri. La classe della tabella la decide chi
     la incolla: la schermata ha la sua, il foglio la sua. */
  function tabellaHtml(e, opz) {
    if (!e || !e.ok) return '';
    opz = opz || {};
    var cls = opz.classeTabella || 'confronto';
    var colA = e.confronto === 'azienda' ? 'TFR in azienda' : 'TFR al Fondo di Tesoreria INPS';
    var righe = e.voci.map(function (v) {
      var diff = v.informativa ? '—' : (v.crescente ? euro(v.differenzaTotale) + ' in ' + e.anni + ' anni' : (v.differenzaAnnua ? '+' + euro(v.differenzaAnnua) + ' l\'anno' : '0 €'));
      return '<tr><th class="voce">' + esc(v.etichetta) + '</th><td data-col="' + esc(colA) + '">' + esc(v.azienda) + '</td><td data-col="TFR al fondo pensione">' + esc(v.fondo) + '</td><td class="num" data-col="Per l\'azienda, col fondo">' + esc(diff) + '</td></tr>';
    }).join('');
    var tot = '<tr class="totale"><th class="voce">Vantaggio per l\'azienda col fondo</th><td colspan="2">' +
      (e.confronto === 'azienda'
        ? 'Il primo anno <b>' + esc(euro(e.risparmioAnnuo)) + '</b>; in ' + e.anni + ' anni <b>' + esc(euro(e.ventennale.totale)) + '</b> (di cui ' + esc(euro(e.ventennale.rivalutazioneEvitata)) + ' di rivalutazione non pagata).'
        : 'Neutro: il TFR esce in ogni caso e le misure compensative spettano in entrambi i casi.') +
      '</td><td class="num"><b>' + esc(euro(e.risparmioAnnuo)) + '</b> l\'anno<br><b>' + esc(euro(e.ventennale.totale)) + '</b> in ' + e.anni + ' anni</td></tr>';
    return '<table class="' + esc(cls) + ' tfr-datore"><thead><tr><th></th><th>' + esc(colA) + '</th><th>TFR al fondo pensione</th><th>Per l\'azienda, col fondo</th></tr></thead><tbody>' + righe + tot + '</tbody></table>';
  }

  /* SOTTO, la spiegazione discorsiva: le differenze una per una, in italiano. */
  function spiegazioneHtml(e) {
    if (!e || !e.ok) return '';
    var p = [];
    p.push(e.nota);
    if (e.confronto === 'azienda') {
      p.push('<b>Deduzione.</b> Ogni euro di TFR che va al fondo dà all\'azienda una deduzione aggiuntiva del ' + perc(e.aliquotaDeduzione) + ' dal reddito d\'impresa: su ' + euro(e.tfrAnnuo) + ' l\'anno sono ' + euro(e.deduzioneAnnua) + ' dedotti' + (e.valoreDeduzioneAnnuo != null ? ', cioè circa ' + euro(e.valoreDeduzioneAnnuo) + ' di imposta in meno con ' + e.imposta.tipo + ' al ' + perc(e.imposta.valore) : '') + '.');
      p.push('<b>Fondo di garanzia.</b> Il contributo INPS che assicura il TFR dei dipendenti in caso di insolvenza dell\'azienda non si paga più sulla quota conferita: ' + euro(e.esoneroAnnuo) + ' l\'anno.');
      p.push('<b>Contributi minori.</b> Assegni familiari, maternità e disoccupazione si riducono di ' + perc(LEGGE.riduzioneOneriImpropri.v, 2) + ' della retribuzione: ' + euro(e.sgravioAnnuo) + ' l\'anno.');
      p.push('<b>Rivalutazione.</b> Il TFR che resta in azienda si rivaluta ogni anno dell\'' + perc(LEGGE.rivalutazioneFissa.v, 1) + ' più il ' + perc(LEGGE.rivalutazioneQuotaInflazione.v) + ' dell\'inflazione (' + perc(e.tassoRivalutazione, 2) + ' con inflazione al ' + perc(LEGGE.inflazioneAttesa.v) + '), a carico dell\'azienda e su tutto l\'accantonato: è un costo che cresce con gli anni, e al fondo non c\'è. In ' + e.anni + ' anni vale ' + euro(e.ventennale.rivalutazioneEvitata) + '.');
      p.push('<b>Liquidità.</b> È il rovescio della medaglia: il TFR in azienda è un finanziamento che costa la rivalutazione, ' + euro(e.tfrAnnuo) + ' l\'anno che con il fondo escono davvero. Se l\'azienda si finanzia in banca a un tasso più alto della rivalutazione, tenere il TFR conviene meno di quanto sembri; se ha liquidità, il conto qui sopra è quello vero.');
      p.push('<b>Anticipazioni.</b> Con il TFR in azienda le anticipazioni ai dipendenti le paga l\'azienda, quando maturano i requisiti; con il fondo le paga il fondo.');
    } else {
      p.push('<b>Che cosa cambia davvero.</b> Il TFR mensile esce in ogni caso: alla Tesoreria INPS o al fondo pensione. Deduzione del ' + perc(e.aliquotaDeduzione) + ', esonero dal Fondo di garanzia e riduzione dei contributi minori spettano su entrambe le destinazioni. La rivalutazione la paga chi riceve il TFR, non l\'azienda.');
      p.push('<b>Dove sta il vantaggio.</b> Nel fondo pensione il dipendente ha la tassazione agevolata, il contributo del datore se il contratto lo prevede, e le anticipazioni del fondo. Per l\'azienda non c\'è un risparmio da promettere, e questo foglio non lo promette.');
    }
    p.push('<b>Ipotesi di questo conto:</b> ' + e.ipotesi.join(' '));
    return p.map(function (x) { return '<p>' + x + '</p>'; }).join('');
  }

  var API = {
    VERSIONE: VERSIONE, LEGGE: LEGGE, FONTE_TESORERIA: FONTE_TESORERIA,
    calcola: calcola, numeriDiLegge: numeriDiLegge, daConfermare: daConfermare,
    aliquotaImposta: aliquotaImposta, tassoRivalutazione: tassoRivalutazione,
    tabellaHtml: tabellaHtml, spiegazioneHtml: spiegazioneHtml, euro: euro, perc: perc,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.TfrDatore = API;
})();
