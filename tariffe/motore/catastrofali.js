/* ═══════════════════════════════════════════════════════════════════════════
   RISCHI CATASTROFALI — il calcolo del premio, in un posto solo.

   Questo file lo caricano DUE mondi: il preventivatore nel browser
   (<script src>) e il backend (require da Node). E' scritto per funzionare in
   entrambi senza compilazione: niente import/export, e in fondo si espone a
   chi lo sta caricando.

   IL CORPO DI calcCatPremio E' QUELLO DI index.html, SPOSTATO IDENTICO.
   Non e' pigrizia: e' l'unico modo di poter affermare che il premio non e'
   cambiato spostandosi. Una riscrittura «piu' pulita» di una tariffa non da'
   nessun errore quando sbaglia — emette una polizza a un prezzo storto, e lo
   si scopre da un cliente. Una prova confronta il vecchio e il nuovo su piu'
   di mille combinazioni: server/verifica/parita-catastrofali.test.mjs.

   La tariffa (CAP -> tassi) NON sta qui: si passa da fuori con
   caricaTariffa(). Nel browser la carica il preventivatore da
   tariffe/catastrofali_cap.json, sul server la carica l'adattatore dell'API.
   Cosi' il file dei tassi resta uno solo e questo modulo non sa da dove
   arrivi.

   TUTTO STA DENTRO UN CONTENITORE, e non e' un vezzo. Da <script src> ogni
   `var` di primo livello diventa una variabile globale della pagina: la prima
   versione di questo file dichiarava CAT_CAP fuori, e il preventivatore ne ha
   una sua con lo stesso nome. Risultato: «Identifier 'CAT_CAP' has already
   been declared», e l'INTERO script di index.html smetteva di essere eseguito
   — quotatore morto, non un pezzo mancante. Fuori esce solo cio' che serve.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var CAT_CAP = null;
function caricaTariffa(dati) { CAT_CAP = dati || {}; return CAT_CAP; }

/* Premio minimo di polizza. Stava in index.html accanto al calcolo: si sposta
   con lui, perche' e' una costante di calcolo e le costanti di calcolo vivono
   dove vive il calcolo. */
var RCAB_PMIN = 60;

/* Limiti assuntivi della compagnia (nota tecnica HDI P5820, §3.3.5): fuori da
   qui la polizza non si emette. Stanno accanto al calcolo e NON dentro
   calcCatPremio: il premio resta identico a prima (la prova di parità lo
   sorveglia), e chi quota chiede prima se il valore si può assicurare.
   Una regola sola per il preventivatore, l'API e la landing. */
var VALORE_MIN = 40000, VALORE_MAX = 1100000;
function fuoriLimite(valore){
  var v = Number(valore);
  if (!isFinite(v) || v <= 0) return null;   // il valore mancante lo dice chi chiede
  if (v < VALORE_MIN || v > VALORE_MAX) {
    return 'Il valore di ricostruzione assicurabile va da ' + VALORE_MIN.toLocaleString('it-IT') + ' a ' + VALORE_MAX.toLocaleString('it-IT') + ' €.';
  }
  return null;
}

function calcCatPremio(cap, valore, opt){
  const t = (CAT_CAP||{})[String(cap).padStart(5,'0')];
  if (!t || !valore) return null;
  const [tTerr, tAllu] = t;
  const g = [];
  const pTerrFabb = tTerr*valore/1000; g.push({nome:'Terremoto · Fabbricato', somma:valore, premio:pTerrFabb});
  let pTerrCont=0; if(opt.terrCont){ pTerrCont=tTerr*(0.20*valore)/1000; g.push({nome:'Terremoto · Contenuto (20%)', somma:0.20*valore, premio:pTerrCont}); }
  let pAlluFabb=0; if(opt.alluFabb){ pAlluFabb=tAllu*valore/1000; g.push({nome:'Alluvione/Inondazione · Fabbricato', somma:valore, premio:pAlluFabb}); }
  let pAlluCont=0; if(opt.terrCont && opt.alluFabb && opt.alluCont){ pAlluCont=tAllu*(0.20*valore)/1000; g.push({nome:'Alluvione/Inondazione · Contenuto (20%)', somma:0.20*valore, premio:pAlluCont}); }
  const calcolato = pTerrFabb+pTerrCont+pAlluFabb+pAlluCont;
  let base = calcolato;
  if (base < RCAB_PMIN) base = RCAB_PMIN;
  /* Per difetto all'euro, come ROUNDDOWN del preventivatore Excel di HDI. Prima
     si toglie il rumore della virgola mobile: 781,55 + 156,31 + 85,14 in
     JavaScript fa 1022,9999999999999, e un Math.floor nudo dava 1022 dove
     Excel (15 cifre) dà 1023 — un euro in meno al cliente, CAP 37135. */
  const baseFloor = Math.floor(Math.round(base * 1e6) / 1e6);
  let premio = baseFloor;                 // nessuna commissione, nessuna tutela legale/peritale
  /* LA RIPARTIZIONE FRA LE GARANZIE, come la fa HDI (Excel, colonne M e N;
     portale PASS, record QPA). Sotto il minimo i 60 € si spalmano in
     proporzione al premio di ogni garanzia; poi il totale si arrotonda per
     difetto all'euro e i centesimi tolti escono dalla PRIMA garanzia
     (terremoto · fabbricato), le altre restano intere. Così le garanzie
     sommano sempre il premio annuo base, e il cliente non legge 25,77 +
     15,06 sotto un totale di 60 €. `calcolato` tiene il premio puro di
     tariffa (somma assicurata × tasso / 1000), che resta la regola. */
  const fattore = calcolato > 0 ? base / calcolato : 1;
  /* Al centesimo come Excel: prima si toglie il rumore della virgola mobile
     (6,425 in JavaScript è 6,42499999…, e un arrotondamento nudo dà 6,42
     dove Excel dà 6,43 — CAP 24014). */
  const cent = x => Math.round(Math.round(x * 1e8) / 1e6) / 100;
  let altre = 0;
  for (let i = 1; i < g.length; i++) {
    g[i].calcolato = g[i].premio;
    g[i].premio = cent(g[i].premio * fattore);
    altre += g[i].premio;
  }
  g[0].calcolato = g[0].premio;
  g[0].premio = cent(baseFloor - altre);
  let semestrale = null;
  if (opt.frazionamento === 'Semestrale' && baseFloor >= 120){ premio = premio*1.02; semestrale = premio/2; }
  return { garanzie:g, base, baseFloor, premio, semestrale, tassoTerr:tTerr, tassoAllu:tAllu };
}

/* ── si consegna a chi lo carica, e niente di piu' ───────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcCatPremio: calcCatPremio, caricaTariffa: caricaTariffa, RCAB_PMIN: RCAB_PMIN, fuoriLimite: fuoriLimite, VALORE_MIN: VALORE_MIN, VALORE_MAX: VALORE_MAX };
}
if (typeof window !== 'undefined') {
  window.calcCatPremio = calcCatPremio;
  window.caricaTariffaCat = caricaTariffa;
  window.RCAB_PMIN = RCAB_PMIN;
  window.catFuoriLimite = fuoriLimite;
}
})();
