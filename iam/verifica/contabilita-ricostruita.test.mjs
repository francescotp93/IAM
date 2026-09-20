// ═══════════════════════════════════════════════════════════════════════════════
//  LA CONTABILITÀ CHE SI RICOSTRUISCE DA SÉ — il pannello (20/09/2026, #02 M5)
//
//  L'aritmetica sta nel motore condiviso `tariffe/motore/contabilita.js` e ha
//  le sue 34 prove in `server/verifica/contabilita.test.mjs`. Qui si sorveglia
//  che la schermata:
//
//    · non SPENGA il modulo a mano. I 68 giorni già scritti sono l'unica
//      contabilità che questa agenzia ha, e il ricostruito oggi è vuoto perché
//      i movimenti cominciano adesso. Una schermata in uso si spegne quando i
//      suoi numeri sono stati confrontati con quelli nuovi e tornano — non
//      perché ne è nata una migliore (§17);
//    · confronti lo STESSO giorno nei due riquadri: due numeri di due giorni
//      diversi, uno sopra l'altro, sono un confronto falso;
//    · non dica «tutto a posto» quando non ha potuto leggere. Su una schermata
//      di anomalie è la bugia peggiore possibile, ed è lo stesso difetto del
//      contatore documentale che mostrava `0` su un archivio mai letto (§12) e
//      del registro che non rispondeva (§18);
//    · non si faccia i conti per conto suo: le somme le fa il motore, che è
//      l'unico posto in cui si possono provare senza un browser;
//    · sia raggiungibile — una funzione che non chiama nessuno è il guasto
//      numero uno di questo repository (§1).
//
//  Queste prove leggono il SORGENTE: IAM non si apre in un browser nel banco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('var GIO_MOVIMENTI');
  deve(i >= 0, 'non trovo il blocco gio* in iam/index.html');
  /* Fino alla funzione successiva, non al commento successivo: un commento
     che il filtro toglie farebbe tornare -1, e la fetta leggerebbe metà
     blocco restando verde su ciò che non ha letto (la trappola già presa
     scrivendo `incassi-accreditare.test.mjs`). */
  const fine = H.indexOf('async function incCarica', i);
  deve(fine > i, 'non trovo la fine del blocco gio*');
  return H.slice(i, fine);
}

/* Le righe di CODICE: i commenti di questo blocco spiegano i difetti
   nominandoli, e una prova che cercasse la stringa dichiarerebbe rotto un
   codice giusto (§10, §12, §18, §26, §29, §31 — sette volte). Si tolgono solo
   i commenti a inizio riga: una regex globale su questo file mangia 450.000
   caratteri (§12). */
const codice = (s) => s.split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');

prova('le quattro schermate hanno il loro contenitore, e qualcuno lo riempie', () => {
  const b = blocco();
  for (const [id, fn] of [['gio-oggi', 'gioRenderGiornata'], ['gio-anomalie', 'gioRenderAnomalie'],
                          ['gio-storico', 'gioRenderStorico'], ['gio-conto', 'gioRenderConto']]) {
    deve(H.includes('id="' + id + '"'), 'manca il contenitore ' + id + ': la funzione scriverebbe nel vuoto');
    deve(new RegExp('function ' + fn + '\\b').test(b), 'manca ' + fn);
    deve(new RegExp('getElementById\\(\'' + id + '\'\\)').test(b), fn + ' non scrive in ' + id);
  }
  return '4 contenitori, 4 renderer';
});

prova('GUASTO N.1: gioCarica è CHIAMATA dalle linguette, non solo definita', () => {
  /* Una schermata il cui contenuto lo scrive il codice deve avere il suo
     inizializzatore, altrimenti la linguetta apre un riquadro vuoto (§6b). */
  const i = H.indexOf('function selContabTab');
  const f = codice(H.slice(i, H.indexOf('async function caricaDatiPerData', i)));
  /* Si cerca la CHIAMATA, con le parentesi, e non il nome: un commento che
     nomina la funzione fa scattare una prova che cerca la parola. È la
     trappola presa per l'ottava volta proprio qui (§10, §12, §18, §26, §29,
     §31), e il filtro dei commenti a inizio riga non basta — una riga interna
     di un commento su più righe non comincia con `*`. Il rimedio vero è
     doppio: si cerca la chiamata, e il commento non scrive quel nome. */
  const chiamata = f.indexOf('gioCarica()');
  deve(chiamata >= 0, 'selContabTab non fa partire la contabilità ricostruita: quattro linguette aprono un riquadro vuoto');
  const riga = f.slice(f.lastIndexOf('\n', chiamata), chiamata);
  for (const sub of ['quadratura', 'anomalie', 'storico', 'conto']) {
    deve(riga.includes("'" + sub + "'"), 'la linguetta ' + sub + ' non fa partire la contabilità ricostruita');
  }
  return '4 linguette';
});

prova('IL MODULO A MANO NON SI SPEGNE: i 68 giorni scritti restano leggibili', () => {
  /* La decisione più importante della M5, e quella che un rilascio successivo
     potrebbe disfare senza accorgersene. Il ricostruito oggi è vuoto: i
     movimenti cominciano adesso. Spegnere il dichiarato vorrebbe dire
     sostituire l'unica contabilità esistente con una vuota. */
  const i = H.indexOf('id="contab-panel-quadratura"');
  const p = H.slice(i, H.indexOf('id="contab-panel-anomalie"', i));
  for (const campo of ['i-data', 'i-cassa', 'i-vers', 'i-spese', 'i-fondo', 'i-pos-bianco', 'i-pos-nero']) {
    deve(p.includes('id="' + campo + '"'), 'il modulo a mano ha perso il campo ' + campo);
  }
  deve(/salvaDatiGiornalieri\(\)/.test(p), 'non si può più salvare la giornata a mano');
  /* E sta SOTTO il ricostruito: quello che nessuno deve digitare viene prima. */
  deve(p.indexOf('id="gio-oggi"') < p.indexOf('id="i-cassa"'),
    'il modulo a mano è finito sopra il ricostruito');
  return '7 campi + il salvataggio, sotto il ricostruito';
});

prova('i due riquadri parlano dello STESSO giorno', () => {
  const b = blocco();
  /* `gioData` legge il campo del modulo a mano. Se leggesse «oggi» e basta,
     aprendo una giornata vecchia il ricostruito resterebbe su oggi e il
     confronto direbbe una differenza inventata. */
  const f = b.slice(b.indexOf('function gioData'), b.indexOf('async function gioCarica'));
  deve(/getElementById\('i-data'\)/.test(f), 'gioData non legge la data del modulo a mano');
  /* E cambiando la data il ricostruito si ridisegna. */
  const cd = H.indexOf('async function caricaDatiPerData');
  const cf = H.slice(cd, H.indexOf('// ─── PONTE IAM → QUOTO', cd));
  deve(/gioRenderGiornata\(\)/.test(codice(cf)),
    'cambiando la data il ricostruito resta sul giorno di prima');
  return 'i-data comanda tutti e due';
});

prova('«non si è potuto leggere» NON diventa «tutto a posto»', () => {
  const b = blocco();
  const cat = b.slice(b.indexOf('} catch (e) {', b.indexOf('async function gioCarica')),
                      b.indexOf('function gioRender()'));
  deve(/gio-oggi/.test(cat) && /gio-anomalie/.test(cat), 'l\'errore non arriva ai riquadri');
  deve(/non vuol dire/.test(cat), 'l\'errore non dice che NON è un «tutto a posto»');
  /* E il riquadro vuoto delle anomalie dice una cosa diversa dall'errore:
     «niente da sistemare» si scrive solo dopo aver guardato. */
  const an = b.slice(b.indexOf('function gioRenderAnomalie'), b.indexOf('function gioRenderStorico'));
  deve(/if \(!a\.length\)/.test(an), 'le anomalie non distinguono «nessuna» da «non lette»');
  return 'errore ≠ nessuna anomalia';
});

prova('la schermata non si fa i conti da sé: li fa il motore', () => {
  /* Una somma scritta in pagina non si può provare senza aprire un browser
     (§5), e due aritmetiche della stessa giornata diventano prima o poi due
     contabilità della stessa agenzia. */
  const b = codice(blocco());
  for (const f of ['Contabilita.giornata(', 'Contabilita.fondoCassa(', 'Contabilita.semaforoGiornata(',
                   'Contabilita.anomalie(', 'Contabilita.saldo(', 'Contabilita.perNatura(']) {
    deve(b.includes(f), 'la schermata non usa ' + f);
  }
  /* Nessun `reduce` che sommi importi: quelle somme stanno nel motore. */
  deve(!/\.reduce\([^)]*importo/.test(b), 'la schermata somma degli importi per conto suo');
  return '6 funzioni del motore';
});

prova('il semaforo ha TRE luci anche in pagina, non due', () => {
  const b = blocco();
  deve((b.match(/non si può dire|non si può dire/g) || []).length >= 2,
    'la terza luce non arriva in pagina: un grigio mostrato come verde è la bugia comoda (§29)');
  deve(/sem\.stato === 'verde'/.test(b) && /sem\.stato === 'rosso'/.test(b),
    'la pagina non legge lo stato del semaforo');
  return 'verde · rosso · grigio';
});

prova('lo stato è in `var`: con `let` una prova che inietta dati misura un\'altra variabile', () => {
  /* §17, la trappola del banco: con `let` la variabile del modulo e
     `window.X` sono due cose diverse. */
  for (const v of ['GIO_MOVIMENTI', 'GIO_CONTI', 'GIO_CAUSALI', 'GIO_SOSPESI',
                   'GIO_QUADRATURE', 'GIO_TITOLI', 'GIO_SESSIONI', 'GIO_CARICATO']) {
    deve(new RegExp('\\bvar ' + v + '\\b').test(H), v + ' non è dichiarata con var');
    deve(!new RegExp('\\b(let|const) ' + v + '\\b').test(H), v + ' è dichiarata con let/const');
  }
  return '8 variabili di stato';
});

prova('«Carica documenti» non è più una linguetta, e non ha spento niente', () => {
  /* Il brief chiede di toglierla. Cancellare i due caricamenti avrebbe spento
     QUATTRO schermate: sono l'unica strada da cui arrivano i sospesi della
     compagnia, gli incassi, le anomalie dei file e il contatore della
     Scrivania. Quindi si spostano dove servono. */
  deve(!/id="ctab-caricafile"/.test(H), '«Carica documenti» è di nuovo una linguetta');
  const i = H.indexOf('id="contab-panel-sospesi"');
  const p = H.slice(i, H.indexOf('id="contab-panel-storico"', i));
  deve(/id="f-sosp"/.test(p) && /id="f-inc"/.test(p),
    'i due caricamenti non sono dentro Sospesi: quattro schermate restano senza dati');
  /* E chi ha il vecchio nome in memoria finisce su Sospesi, non su un riquadro
     vuoto (§6b). */
  const s = H.indexOf('function selContabTab');
  const f = codice(H.slice(s, H.indexOf('async function caricaDatiPerData', s)));
  deve(/sub === 'caricafile'/.test(f), 'il vecchio nome apre un riquadro vuoto');
  deve(!/'caricafile'/.test(f.slice(f.indexOf('forEach'))), '«caricafile» è ancora fra i pannelli da mostrare');
  return 'una linguetta in meno, niente di spento';
});

prova('lo storico apre la giornata invece di raccontarla', () => {
  const b = blocco();
  const f = b.slice(b.indexOf('function gioApriGiorno'), b.indexOf('function gioRenderConto'));
  deve(/selContabTab\('quadratura'\)/.test(f), 'il clic su una giornata non apre la Quadratura');
  deve(/caricaDatiPerData/.test(f), 'apre la Quadratura senza portarci il dichiarato di quel giorno');
  deve(/gioApriGiorno\('/.test(b), 'le righe dello storico non sono cliccabili');
  return 'un clic, il giorno giusto nei due riquadri';
});

console.log('\n══ LA CONTABILITÀ RICOSTRUITA (brief #02 · M5) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCONTABILITÀ RICOSTRUITA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
