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
  /* Dal 20/09/2026 i caricamenti non hanno più una linguetta loro: stanno
     dentro Sospesi, che è la schermata che li usa. Sparire non potevano —
     sono l'unica strada da cui arrivano quei dati. */
  deve(riquadro(src, 'contab-panel-sospesi'), 'manca la schermata «contab-panel-sospesi»');
  deve(!/id="ctab-caricafile"/.test(src), '«Carica documenti» è tornata a essere una linguetta');
  return 'i numeri di qua, i file dove servono';
});

e.prova('i caricamenti stanno dentro la schermata che li usa, e niente cassa', () => {
  const q = riquadro(src, 'contab-panel-sospesi');
  deve(/id="f-sosp"/.test(q) && /id="f-inc"/.test(q),
    'i caricamenti non sono dentro Sospesi: quattro schermate restano senza dati');
  /* La controprova del difetto segnalato il 01/08/2026: se i campi della
     giornata finissero qui dentro, chi cerca i file rivedrebbe cassa e POS. */
  for (const campo of ['i-cassa', 'i-vers', 'i-fondo', 'i-pos-bianco', 'i-pos-nero']) {
    deve(!q.includes('id="' + campo + '"'),
      'dentro i caricamenti si vede ancora «' + campo + '»: è tornato tutto insieme');
  }
  return 'solo i file, accanto a chi li legge';
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

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
