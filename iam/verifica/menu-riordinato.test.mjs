// ═══════════════════════════════════════════════════════════════════════════════
//  IL MENU RIORDINATO — Contabilità e Strumenti   (20/09/2026, Blocco 1 · 5 e 12)
//
//  Due richieste che sembrano di forma e non lo sono:
//
//    · CONTABILITÀ — Prima nota, Quadratura conti e Incassi da accreditare
//      esistevano da giorni e NON erano nel menu: si raggiungevano solo dalla
//      striscia dentro Contabilità, cioè passando da un'altra schermata. È il
//      guasto §1 in versione menu — una pagina che non ha una voce, per chi
//      lavora, non esiste;
//    · STRUMENTI — teneva insieme due mestieri (quello che serve a QUOTARE e
//      quello che fa camminare l'agenzia), e per trovare una voce bisognava
//      già sapere dov'era.
//
//  E UN GUASTO VIVO, trovato mappando prima di scrivere: la sotto-scheda della
//  quadratura dei conti si chiamava `conti`, come il pannello di Strumenti ›
//  Conti e causali. `goTab` controlla l'elenco delle sotto-schede PRIMA di
//  cercare il pannello, quindi «Conti e causali» apriva la Contabilità e non
//  si raggiungeva più. Un nome usato per due cose, in due elenchi diversi, e
//  il primo vince in silenzio: è la stessa malattia dei nomi globali di §6a,
//  applicata alle rotte.
//
//  Queste prove leggono il SORGENTE e fanno girare `selContabTab` davvero.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const SCOCCA = fs.readFileSync(path.join(QUI, '..', 'withus-one.js'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('GUASTO VIVO · «Conti e causali» si riapre: due cose non hanno lo stesso nome', () => {
  /* Il pannello di Strumenti è `panel-conti`. Finché anche la sotto-scheda
     della contabilità si chiamava `conti`, l'elenco in `goTab` la
     intercettava prima della ricerca del pannello. */
  const i = H.indexOf('const CONTAB_SUB =');
  deve(i >= 0, 'non trovo l\'elenco delle sotto-schede di Contabilità in goTab');
  const riga = H.slice(i, H.indexOf('\n', i));
  deve(!/'conti'/.test(riga), 'il nome ambiguo è tornato: «Conti e causali» non si aprirebbe più');
  deve(/'quadconti'/.test(riga), 'la quadratura dei conti non ha un nome suo');
  /* E il pannello di Strumenti esiste ancora, con la sua riga in goTab. */
  deve(/id="panel-conti"/.test(H), 'manca il pannello Conti e causali');
  deve(/if \(t === 'conti'\)\s+\{ cntTab\(CNT_VISTA\); cntCarica\(true\); \}/.test(H),
    'Conti e causali non ha più il suo inizializzatore');
  return 'quadconti per la contabilità, conti per gli strumenti';
});

prova('CONTABILITÀ · le cinque voci del brief sono nel menu, una per una', () => {
  const i = SCOCCA.indexOf("key: 'carica', l: 'Contabilità'");
  deve(i >= 0, 'non trovo la voce Contabilità nel menu');
  const blocco = SCOCCA.slice(i, SCOCCA.indexOf("key: 'agenzia'", i));
  for (const [voce, rotta] of [['Prima nota', 'primanota'], ['Quadratura conti', 'quadconti'],
                               ['Incassi da accreditare', 'incassi'], ['Anomalie', 'anomalie'],
                               ['Sospesi', 'sospesi']]) {
    deve(blocco.includes("l: '" + voce + "'"), 'manca la voce «' + voce + '»');
    deve(blocco.includes("vai('" + rotta + "')"), 'la voce «' + voce + '» non porta a ' + rotta);
  }
  /* Le due voci che il brief chiede di togliere non ci sono più. */
  deve(!/l: 'Carica documenti'/.test(blocco), '«Carica documenti» è tornata nel menu');
  deve(!/l: 'Conto'/.test(blocco), '«Conto» è tornata nel menu');
  /* Ma il foglio di cassa a mano e il suo storico restano raggiungibili: sono
     i 68 giorni già scritti, e si spengono quando i numeri torneranno (§17). */
  deve(/l: 'Quadratura di giornata'/.test(blocco), 'il foglio di cassa a mano non è più raggiungibile');
  deve(/l: 'Storico movimenti'/.test(blocco), 'lo storico delle giornate non è più raggiungibile');
  return '5 voci nuove, 2 tolte, 2 tenute';
});

prova('i vecchi nomi portano dove il contenuto è andato, non su un riquadro vuoto', () => {
  /* §6b. «Carica documenti» → Sospesi (è lì che si caricano i due file),
     «Conto» → Quadratura conti (il saldo ricostruito e l'estratto della banca
     sono i DUE numeri della quadratura). */
  const i = H.indexOf('function selContabTab');
  const f = H.slice(i, H.indexOf('async function caricaDatiPerData', i));
  deve(/sub === 'caricafile'\) sub = 'sospesi'/.test(f), '«Carica documenti» non porta più da nessuna parte');
  deve(/sub === 'conto'\) sub = 'quadconti'/.test(f), '«Conto» non porta più da nessuna parte');
  /* E i due nomi restano nell'elenco di goTab, altrimenti un vecchio
     collegamento non arriverebbe nemmeno dentro Contabilità. */
  const riga = H.slice(H.indexOf('const CONTAB_SUB ='), H.indexOf('\n', H.indexOf('const CONTAB_SUB =')));
  deve(/'caricafile'/.test(riga) && /'conto'/.test(riga), 'i vecchi nomi non arrivano più alla Contabilità');
  return 'due vecchie rotte, due destinazioni vere';
});

prova('il contenuto della voce «Conto» non è sparito: è dentro la Quadratura conti', () => {
  /* Cancellarlo avrebbe tolto l'estratto conto caricato dalla banca, che è il
     DICHIARATO della quadratura: senza, resta un numero solo e non si quadra
     più niente. */
  const i = H.indexOf('id="contab-panel-quadconti"');
  const seg = H.slice(i, H.indexOf('id="contab-panel-incassi"', i));
  deve(/id="gio-conto"/.test(seg), 'il conto ricostruito non è dentro la Quadratura conti');
  deve(/id="f-hdi"/.test(seg) && /selConto\('pluri'\)/.test(seg),
    'gli estratti conto caricati da file sono spariti insieme alla voce');
  deve(!/id="contab-panel-conto"/.test(H), 'il pannello «Conto» è ancora lì: la voce è tolta ma la schermata no');
  return 'ricostruito + estratti della banca, nello stesso posto';
});

prova('STRUMENTI · due gruppi di navigazione, e le pagine sono le stesse', () => {
  const i = SCOCCA.indexOf("key: 'strumenti', l: 'Strumenti'");
  const blocco = SCOCCA.slice(i, SCOCCA.indexOf("key: 'clienti'", i) > i ? SCOCCA.indexOf("key: 'clienti'", i) : i + 6000);
  deve(/l: 'Preventivatore', i: '[^']+', sub: \[/.test(blocco), 'manca il gruppo Preventivatore');
  deve(/l: 'Gestionale', i: '[^']+', sub: \[/.test(blocco), 'manca il gruppo Gestionale');
  const prev = blocco.slice(blocco.indexOf("l: 'Preventivatore'"), blocco.indexOf("l: 'Gestionale'"));
  const gest = blocco.slice(blocco.indexOf("l: 'Gestionale'"));
  for (const v of ['Fonti e collegamenti', 'Stato collegamenti', 'Parametri previdenziali']) {
    deve(prev.includes("l: '" + v + "'"), '«' + v + '» non è sotto Preventivatore');
  }
  for (const v of ['Collaboratori', 'Conti e causali', 'Gestione compagnie', 'Provvigioni']) {
    deve(gest.includes("l: '" + v + "'"), '«' + v + '» non è sotto Gestionale');
  }
  /* Le rotte NON cambiano: ogni vecchio collegamento continua a funzionare. */
  for (const r of ['fonti', 'collegamenti', 'operativa', 'conti', 'compagnie', 'provvigioni']) {
    deve(blocco.includes("vai('" + r + "')"), 'la rotta ' + r + ' è cambiata: i vecchi collegamenti si rompono');
  }
  return '3 voci + 4 voci, stesse rotte';
});

prova('«Parametri previdenziali» ha cambiato posto, non pagina', () => {
  const i = SCOCCA.indexOf("key: 'agenzia'");
  const agenzia = SCOCCA.slice(i, SCOCCA.indexOf("key: 'strumenti'", i) > i ? SCOCCA.indexOf("key: 'strumenti'", i) : i + 4000);
  deve(!/l: 'Parametri previdenziali'/.test(agenzia), '«Parametri previdenziali» è rimasta anche in Agenzia: due voci per una pagina');
  /* La briciola dice il posto nuovo: dire «Agenzia» in alto su una pagina che
     sta in Strumenti manda a cercarla dove non è. */
  deve(/parametri:\s+\['Parametri previdenziali', 'Strumenti'\]/.test(SCOCCA),
    'la briciola dice ancora Agenzia');
  deve(/Q\('parametri', \['Parametri previdenziali', 'Strumenti'\]\)/.test(SCOCCA),
    'la voce porta ancora la briciola vecchia');
  return 'una voce sola, e la briciola giusta';
});

prova('aprendo una voce di Contabilità si vede quella e basta', () => {
  /* Si fa girare `selContabTab` davvero, con un DOM finto: una prova sul
     testo direbbe che le linguette ci sono, non che ne resta accesa una. */
  const chiavi = ['quadratura', 'primanota', 'quadconti', 'incassi', 'anomalie', 'sospesi', 'storico'];
  const visibili = {};
  chiavi.forEach(k => { visibili[k] = ''; });
  const ctx = {
    document: {
      getElementById(id) {
        const k = id.replace(/^ctab-|^contab-panel-/, '');
        if (!chiavi.includes(k)) return null;
        if (id.startsWith('ctab-')) return { classList: { toggle() {} } };
        return { style: { set display(v) { visibili[k] = v; }, get display() { return visibili[k]; } } };
      }
    },
    setUltimoTab() {}, buildStorico() {}, loadContoDB() {},
    pntCarica() {}, incCarica() {}, gioCarica() {}
  };
  vm.createContext(ctx);
  const i = H.indexOf('function selContabTab');
  vm.runInContext(H.slice(i, H.indexOf('async function caricaDatiPerData', i)), ctx);
  const aperte = (sub) => { ctx.selContabTab(sub); return chiavi.filter(k => visibili[k] !== 'none'); };
  for (const k of chiavi) {
    const a = aperte(k);
    deve(a.length === 1 && a[0] === k, 'aprendo ' + k + ' restano aperte: ' + a.join(', '));
  }
  /* E i due vecchi nomi arrivano dove devono. */
  deve(aperte('conto').join() === 'quadconti', '«Conto» non apre la Quadratura conti');
  deve(aperte('caricafile').join() === 'sospesi', '«Carica documenti» non apre Sospesi');
  return chiavi.length + ' voci + 2 vecchi nomi';
});

console.log('\n══ IL MENU RIORDINATO ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nMENU RIORDINATO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
