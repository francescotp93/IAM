// ═══════════════════════════════════════════════════════════════════════════════
//  CONTABILITÀ — una voce, una schermata
//
//  Segnalazione di Francesco (01/08/2026): «quando si clicca su carica
//  documenti si deve vedere solo quello e non tutto il resto».
//
//  La sotto-scheda «Carica» teneva insieme due lavori diversi:
//   · i file da caricare (sospesi, incassi);
//   · i numeri della giornata (cassa, versamenti, POS, scostamento).
//  Chi apriva «Carica documenti» si trovava davanti anche la cassa, e chi
//  cercava la quadratura doveva scorrere oltre i caricamenti.
//
//  Sono diventate due schermate separate: «Quadratura di giornata» e «Carica
//  documenti».
//
//  AGGIORNATO IL 20/09/2026 (brief #02 · M5). Il brief chiede di togliere la
//  linguetta «Carica documenti», e va tolta — ma cancellare i due caricamenti
//  avrebbe spento quattro schermate: quei file sono l'unica strada da cui
//  arrivano i sospesi della compagnia, gli incassi, le anomalie e il contatore
//  della Scrivania. Quindi si sono spostati DENTRO Sospesi, che è la schermata
//  che li usa.
//
//  Si è aggiornata la REGOLA, non il numero (§15, §16): quello che Francesco
//  aveva chiesto non era «due linguette», era «non farmi trovare la cassa
//  quando cerco i file». Quella regola vale identica adesso — i caricamenti
//  stanno dove servono, e la quadratura non ne ha nessuno.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { RADICE, sorgenteAttuale, ritaglia, esiti, deve } from './banco.mjs';

const src = sorgenteAttuale();
const one = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('CONTABILITÀ — una voce, una schermata');

/**
 * Ritaglia dal file HTML il blocco <div id="..."> ... </div>, contando le
 * aperture e le chiusure. Serve per guardare DENTRO una schermata e vedere che
 * cosa contiene davvero: senza contare i livelli si prenderebbe il primo
 * </div> disponibile, che è quasi sempre quello sbagliato.
 */
function riquadro(sorgente, id) {
  const apre = sorgente.indexOf('<div id="' + id + '"');
  if (apre < 0) return null;
  let liv = 0, i = apre;
  const tag = /<div\b|<\/div>/g;
  tag.lastIndex = apre;
  let m;
  while ((m = tag.exec(sorgente))) {
    liv += m[0] === '</div>' ? -1 : 1;
    if (liv === 0) { i = m.index + m[0].length; break; }
  }
  return sorgente.slice(apre, i);
}

// ── 1. Le due schermate esistono e non si sovrappongono ─────────────────────
e.prova('la quadratura e i caricamenti restano due lavori distinti', () => {
  deve(riquadro(src, 'contab-panel-quadratura'), 'manca la schermata «contab-panel-quadratura»');
  /* Dal 20/09/2026 i caricamenti non hanno più una linguetta loro. Dal
     22/09/2026 non ci sono proprio più (richiesta di Francesco): i sospesi
     arrivano dal portafoglio. */
  deve(riquadro(src, 'contab-panel-sospesi'), 'manca la schermata «contab-panel-sospesi»');
  deve(!/id="ctab-caricafile"/.test(src), '«Carica documenti» è tornata a essere una linguetta');
  return 'i numeri di qua, i file dove servono';
});

e.prova('il caricamento da file non c\'è più, e i dati già caricati si leggono ancora', () => {
  /* Questa prova misurava il mondo del 20/09: pretendeva i due caricamenti
     DENTRO Sospesi, perché allora erano l'unica strada da cui arrivavano
     quei dati. Il 22/09 Francesco li ha fatti togliere, e la regola che
     contava non era «i file stanno lì»: era «niente di spento». Vale
     identica adesso — quello che era stato caricato si rilegge dalla
     giornata salvata, e nessuna schermata resta senza dati. */
  deve(!/id="f-sosp"/.test(src) && !/id="f-inc"/.test(src),
    'il caricamento da file è tornato: i sospesi si riempirebbero da due strade');
  deve(!/function loadSospesi/.test(src) && !/function loadIncassi/.test(src),
    'i due lettori sono rimasti dentro spenti: è il guasto §1');
  /* La strada che resta: la giornata salvata. Se sparisse, Scrivania,
     Anomalie e Storico si svuoterebbero davvero. */
  deve(/sospesi_json/.test(src) && /incassi_json/.test(src),
    'senza la giornata salvata i dati già caricati non si rileggono più');
  /* La controprova del difetto segnalato il 01/08/2026: se i campi della
     giornata finissero qui dentro, chi cerca i sospesi rivedrebbe cassa e POS. */
  const q = riquadro(src, 'contab-panel-sospesi');
  for (const campo of ['i-cassa', 'i-vers', 'i-fondo', 'i-pos-bianco', 'i-pos-nero']) {
    deve(!q.includes('id="' + campo + '"'),
      'dentro i Sospesi si vede ancora «' + campo + '»: è tornato tutto insieme');
  }
  return 'niente file da caricare, niente di spento';
});

e.prova('«Quadratura» contiene i numeri della giornata e nessun caricamento', () => {
  const q = riquadro(src, 'contab-panel-quadratura');
  for (const campo of ['i-data', 'i-cassa', 'i-vers', 'i-spese', 'i-fondo', 'i-scostamento', 'i-pos-bianco', 'i-pos-nero']) {
    deve(q.includes('id="' + campo + '"'), 'nella quadratura manca «' + campo + '»');
  }
  deve(/salvaDatiGiornalieri\(\)/.test(q), 'nella quadratura manca il salvataggio');
  deve(!/id="f-sosp"/.test(q) && !/id="f-inc"/.test(q),
    'i caricamenti sono rimasti dentro la quadratura');
  return 'solo i numeri della giornata';
});

// ── 2. Il cambio di scheda mostra una schermata sola ────────────────────────
function apparecchia() {
  const visibili = {};
  const attivi = {};
  const chiavi = ['quadratura', 'primanota', 'quadconti', 'incassi', 'anomalie', 'sospesi', 'storico'];
  chiavi.forEach(k => { visibili[k] = ''; attivi[k] = false; });
  const ctx = {
    document: {
      getElementById(id) {
        const k = id.replace(/^ctab-|^contab-panel-/, '');
        if (!chiavi.includes(k)) return null;
        if (id.startsWith('ctab-')) {
          return { classList: { toggle: (_c, on) => { attivi[k] = on; } } };
        }
        /* La visibilita' di un pannello passa da una CLASSE, non da uno stile
           in linea (22/09/2026): nove `display:none` scritti a mano erano
           nove stili che il guardiano del kit conta. Il banco modella quello
           che il codice fa adesso, non quello che faceva. */
        return { classList: { toggle: (c, on) => { if (c === 'ct-off') visibili[k] = on ? 'none' : ''; } },
                 style: {} };
      },
    },
    sessionStorage: { setItem() {}, getItem: () => null },
    setUltimoTab() {}, getUltimoTab: () => null, // dove-eri-rimasto: qui non serve ricordarlo
    buildStorico() {}, loadContoDB() {},
    /* Gli inizializzatori delle schermate nate dopo (§6b): qui interessa solo
       QUALE riquadro resta acceso, non che cosa ci scrivono dentro. */
    pntCarica() {}, incCarica() {}, gioCarica() {}, loadContoDB() {}, sprCarica() {},
  };
  vm.createContext(ctx);
  /* Il cancello VERO, non uno stub: dal 22/09 i permessi di Contabilità li
     applica `contabPuo` sulla porta, e stubbarlo qui vorrebbe dire misurare
     una porta senza serratura. Con `permessiEffettivi` assente la funzione
     solleva, e il suo `catch` risponde «può» — che è il comportamento
     dichiarato quando il profilo non si è potuto leggere. La prova che
     misura il rifiuto lo fornisce. */
  vm.runInContext(ritaglia(src, 'contabPuo'), ctx);
  vm.runInContext('var CONTAB_PERM = ' + (src.match(/var CONTAB_PERM = \{[^}]*\};/) || [''])[0].replace(/^var CONTAB_PERM = /, ''), ctx);
  vm.runInContext(ritaglia(src, 'selContabTab'), ctx);
  return { ctx, visibili, attivi, chiavi };
}

e.prova('chi cercava «Carica documenti» trova i file, non un riquadro vuoto', () => {
  /* §6b: il vecchio nome può ancora essere in `iam_last_tab`. Adesso porta
     dove i due caricamenti sono andati a stare. */
  const { ctx, visibili, chiavi } = apparecchia();
  ctx.selContabTab('caricafile');
  const aperte = chiavi.filter(k => visibili[k] !== 'none');
  deve(aperte.length === 1 && aperte[0] === 'sospesi',
    'aperte: ' + (aperte.join(', ') || 'nessuna'));
});

e.prova('aprendo la quadratura si vede solo la quadratura', () => {
  const { ctx, visibili, chiavi } = apparecchia();
  ctx.selContabTab('quadratura');
  const aperte = chiavi.filter(k => visibili[k] !== 'none');
  deve(aperte.length === 1 && aperte[0] === 'quadratura',
    'aperte anche: ' + aperte.join(', '));
});

e.prova('chi aveva lasciato aperta la vecchia «Carica» non trova il vuoto', () => {
  /* iam_last_tab può ancora contenere 'carica', il nome di prima. Senza il
     ripiego, al rientro non si accenderebbe nessuna schermata. */
  const { ctx, visibili, chiavi } = apparecchia();
  ctx.selContabTab('carica');
  const aperte = chiavi.filter(k => visibili[k] !== 'none');
  deve(aperte.length === 1 && aperte[0] === 'quadratura',
    'il vecchio nome non porta più da nessuna parte: ' + aperte.join(', '));
});

// ── 3. Il menu di With Us One porta alle due schermate ──────────────────────
e.prova('nel menu Contabilità la quadratura ha SOSTITUITO il caricamento', () => {
  /* Il 01/08/2026 le voci erano diventate due, una accanto all'altra. Il
     03/08/2026 la richiesta e' stata precisata: la quadratura di giornata non
     si affianca al caricamento documenti, lo sostituisce. Due voci per lo
     stesso momento di lavoro facevano scegliere ogni volta quale aprire. */
  const q = one.split('\n').find(r => r.includes("l: 'Quadratura di giornata'"));
  deve(q && /vai\('quadratura'\)/.test(q), 'la quadratura non apre la sua schermata');
  deve(!/l: 'Carica documenti'/.test(one), '«Carica documenti» e tornato nel menu');
  deve(!/tag: 'in arrivo'[^\n]*Quadratura|Quadratura[^\n]*tag: 'in arrivo'/.test(one),
    'la quadratura è ancora annunciata come «in arrivo»');
});

e.prova('le due schermate hanno il loro titolo in alto', () => {
  const i = one.indexOf('var TITOLI = {');
  const corpo = one.slice(i, one.indexOf('\n  };', i));
  /* Il titolo di «caricafile» resta anche senza voce di menu: la schermata
     esiste ancora e ci si puo' arrivare da un collegamento diretto. */
  ['quadratura', 'caricafile'].forEach(k =>
    deve(new RegExp('^\\s*' + k + ':', 'm').test(corpo),
      'manca il titolo per «' + k + '»: in alto resterebbe quello di prima'));
});

// ── 4. Le scorciatoie della scrivania non portano più nel posto sbagliato ───
e.prova('i numeri della scrivania portano alla quadratura', () => {
  deve(!/selContabTab\('carica'\)/.test(src),
    'una scorciatoia punta ancora alla vecchia scheda «carica», che non esiste più');
  const n = (src.match(/goTab\('quadratura'\)/g) || []).length;
  deve(n >= 6, 'solo ' + n + ' scorciatoie portano alla quadratura');
  return n + ' scorciatoie';
});

// ── 5. La striscia non c'è più, e il cancello si è spostato sulla porta ─────
e.prova('la striscia di linguette non c\'è più: ogni voce è una pagina sua', () => {
  /* Richiesta di Francesco (22/09/2026): «queste voci in Contabilità non si
     devono vedere in un'unica pagina ma in pagine separate».
     Dieci linguette in cima facevano sembrare Contabilità UNA schermata con
     dentro dieci cose, e per arrivare alla Prima nota bisognava passare da
     quella aperta. Le ROTTE non sono cambiate, quindi un collegamento vecchio
     non apre un riquadro vuoto (§6b). */
  deve(!/id="contab-tabs"/.test(src), 'la striscia delle linguette è tornata');
  for (const k of ['cruscotto', 'primanota', 'quadconti', 'anomalie', 'sospesi', 'storico']) {
    deve(new RegExp("'" + k + "'").test(src.slice(src.indexOf('function selContabTab'))),
      'la rotta «' + k + '» non c\'è più: un collegamento vecchio aprirebbe il vuoto');
  }
  /* E le tre che il brief chiede di togliere non hanno più una voce di menu. */
  /* Solo il sotto-menu di Contabilità: il titolo «Incassi da accreditare»
     vive ancora in TITOLI, ed è giusto — la rotta resta, e senza il titolo
     chi ci arriva da un collegamento vecchio vedrebbe la briciola della
     schermata precedente. Cercare nel file intero troverebbe quello. */
  const da = one.indexOf("key: 'carica'");
  const menu = one.slice(one.indexOf('sub: [', da), one.indexOf('] },', da));
  for (const via of ['Incassi da accreditare', 'Incassa una rata', 'Premi da recuperare']) {
    deve(!menu.includes(via), '«' + via + '» è tornata nel menu di Contabilità');
  }
  deve(menu.includes('Cruscotto'), 'il Cruscotto non ha una voce: era raggiungibile solo dalla striscia');
  /* E le tre tolte dal menu NON restano senza porta — sarebbe il guasto §1,
     e per due di loro sarebbe anche peggio: sono le schermate che aprono un
     sospeso e che portano un incasso in contabilità. La porta c'è, e sta dove
     serve:
       · «Incassa una rata»        dal tasto «Incassa» dentro Sospesi
       · «Premi da recuperare»     dal riquadro dei crediti nel Cruscotto
       · «Incassi da accreditare»  dal riquadro dei sospesi nel Cruscotto */
  deve(/selContabTab\('incassa'\)/.test(src), 'da Sospesi non si arriva più a incassare la rata');
  deve(/crediti: \['recuperi'/.test(src), 'dal Cruscotto non si arriva più ai premi da recuperare');
  deve(/sospesi: \['incassi'/.test(src), 'dal Cruscotto non si arriva più agli incassi da accreditare');
  return 'niente striscia, il Cruscotto ha la sua voce, e le tre tolte hanno una porta';
});

e.prova('IL CANCELLO STA SULLA PORTA: chi non può vedere i Sospesi non li apre', () => {
  /* Prima i permessi si applicavano NASCONDENDO le linguette. Tolta la
     striscia quel cancello non terrebbe più niente — e non teneva granché
     nemmeno prima: le stesse schermate hanno una voce nel menu e `goTab` si
     chiama dalla console. Un bottone nascosto non è un permesso.
     Qui il profilo si fornisce davvero, così la prova misura il RIFIUTO e non
     solo che la funzione esista (§1). */
  const { ctx, visibili, chiavi } = apparecchia();
  ctx.isSuperAdmin = () => false;
  ctx.PROFILO = {};
  ctx.permessiEffettivi = () => ({ sospesi: false, anomalie: true, storico: true, conto: true });
  ctx.cruCarica = () => {};
  ctx.selContabTab('sospesi');
  const aperte = chiavi.filter(k => visibili[k] !== 'none');
  deve(!aperte.includes('sospesi'), 'i Sospesi si aprono a chi non può vederli');
  /* E quello che può vedere si apre normalmente: un cancello che chiude tutto
     è un guasto travestito da permesso. */
  ctx.selContabTab('anomalie');
  const dopo = chiavi.filter(k => visibili[k] !== 'none');
  deve(dopo.length === 1 && dopo[0] === 'anomalie', 'aperte: ' + (dopo.join(', ') || 'nessuna'));
  return 'rifiutato quello vietato, aperto quello permesso';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
