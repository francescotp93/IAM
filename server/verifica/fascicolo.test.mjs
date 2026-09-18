// ═══════════════════════════════════════════════════════════════════════════════
//  IL FASCICOLO DI PRATICA — il motore tariffe/motore/fascicolo.js
//  (Lavoro 3, 18/09/2026 — Parte 1 e Parte 2)
//
//  Le regole che questo file sorveglia, perché sono quelle che se saltano non
//  se ne accorge nessuno finché non è tardi:
//   1) i documenti di TERZI non finiscono mai in anagrafica (GDPR: sono
//      persone che non sono in portafoglio);
//   2) un documento d'identità SCADUTO non vale come presente: il fascicolo
//      deve dirlo, altrimenti si manda in compagnia una pratica con una carta
//      d'identità di tre anni fa e la si scopre quando chiedono il fascicolo;
//   3) la patente NON è un documento d'identità: sta nel fascicolo;
//   4) i requisiti CONGELATI non cambiano quando cambia la regola della
//      compagnia. È il punto di tutta la Parte 2: senza, il giorno in cui una
//      compagnia aggiunge un documento tutte le pratiche chiuse diventano
//      incomplete e nessuno sa più quali fossero davvero da completare.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const F = require('../../tariffe/motore/fascicolo.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const OGGI = '2026-09-18';
const POL = { id: 'pol-1', modulo: 'rca', prodotto: 'RC Auto', dati: {} };
const conOp = (op) => ({ ...POL, dati: { fascicolo: { operazione: op } } });
const cat = (r, c) => r.campi.find(x => x.cat === c);
const CI_VALIDA = { documenti: [{ tipo: 'carta_identita', numero: 'AX1', url: 'u', data: '2026-01-01', scadenza: '2031-01-01' }] };

/* ══ PARTE 1 ═══════════════════════════════════════════════════════════════ */

prova('il ramo si riconosce dalla polizza, e fuori dall\'RC Auto non si inventano operazioni', () => {
  deve(F.ramo({ modulo: 'rca' }) === 'rcauto', 'modulo rca non è rcauto');
  deve(F.ramo({ modulo: 'beni', prodotto: 'Auto storiche' }) === 'rcauto', 'un prodotto auto non è rcauto');
  deve(F.ramo({ modulo: 'persona', prodotto: 'Infortuni' }) === 'altro', 'infortuni finisce in rcauto');
  deve(F.operazioni('rcauto').length === 3, 'le operazioni RC Auto non sono tre');
  deve(F.operazioni('altro').length === 0, 'un ramo senza operazioni ne ha una lista');
  deve(!F.riassunto({ modulo: 'persona' }, [], {}, OGGI).serveOperazione, 'fuori dall\'RC Auto si chiede un\'operazione che non esiste');
  return 'tre operazioni solo per RC Auto';
});

prova('finché l\'operazione non è scelta il fascicolo non è completo, nemmeno con tutti i documenti di base', () => {
  const docs = [{ categoria: 'polizza_firmata', url: 'u', firmato: true }, { categoria: 'privacy', url: 'u', firmato: true }];
  const r = F.riassunto(POL, docs, CI_VALIDA, OGGI);
  deve(r.serveOperazione, 'non chiede di scegliere l\'operazione');
  deve(!r.completo, 'si dichiara completo senza sapere che operazione è');
  deve(r.mancanti === 0, 'conta mancanti che non ci sono: ' + r.mancanti);
  return 'completo = tutti i documenti E l\'operazione scelta';
});

prova('la scelta dell\'operazione determina i campi: tre elenchi diversi', () => {
  const c = (op) => F.requisiti('rcauto', op).map(x => x.cat);
  const rin = c('rinnovo_altra_compagnia'), stesso = c('bersani_stesso'), diverso = c('bersani_diverso');
  deve(!c(null).includes('libretto_veicolo'), 'senza operazione compaiono già i campi del veicolo');
  deve(rin.includes('libretto_veicolo') && !rin.includes('libretto_veicolo_cedente'), 'rinnovo: ' + rin.join(','));
  deve(stesso.includes('libretto_veicolo') && stesso.includes('libretto_veicolo_cedente'), 'Bersani stesso proprietario senza libretto cedente');
  deve(!stesso.includes('stato_famiglia'), 'Bersani stesso proprietario chiede lo stato di famiglia');
  for (const k of ['stato_famiglia', 'autocert_stato_famiglia', 'doc_identita_familiare', 'libretto_veicolo_classe'])
    deve(diverso.includes(k), 'Bersani proprietario diverso senza ' + k);
  deve(!diverso.includes('libretto_veicolo_cedente'), 'il libretto «cedente» e quello «da cui proviene la classe» sono lo stesso campo due volte');
  return '4 base + 1 / +2 / +5';
});

prova('stato di famiglia e autocertificazione sono in alternativa: uno dei due basta', () => {
  const base = [
    { categoria: 'polizza_firmata', url: 'u', firmato: true },
    { categoria: 'privacy', url: 'u', firmato: true },
    { categoria: 'libretto_veicolo', url: 'u' },
    { categoria: 'doc_identita_familiare', url: 'u' },
    { categoria: 'libretto_veicolo_classe', url: 'u' }
  ];
  const senza = F.riassunto(conOp('bersani_diverso'), base, CI_VALIDA, OGGI);
  deve(senza.mancanti === 1, 'senza nessuno dei due mancano ' + senza.mancanti + ' documenti (atteso 1: il gruppo conta una volta)');
  for (const scelta of ['stato_famiglia', 'autocert_stato_famiglia']) {
    const r = F.riassunto(conOp('bersani_diverso'), base.concat([{ categoria: scelta, url: 'u' }]), CI_VALIDA, OGGI);
    deve(r.completo, 'con ' + scelta + ' il fascicolo non è completo: mancanti ' + r.mancanti);
    deve(cat(r, 'stato_famiglia').gruppoOk && cat(r, 'autocert_stato_famiglia').gruppoOk,
      'l\'alternativa non scelta resta segnata mancante: la schermata la mostrerebbe in rosso');
  }
  return 'il gruppo «famiglia» conta una volta sola';
});

prova('l\'identità del cliente si eredita dall\'anagrafica e non si ricarica nella pratica', () => {
  const r = F.riassunto(conOp('rinnovo_altra_compagnia'), [], CI_VALIDA, OGGI);
  const id = cat(r, 'documento_identita');
  deve(id.fonte === 'anagrafica', 'il documento d\'identità del cliente si carica nella pratica');
  deve(id.stato === 'ereditato' && id.ok, 'la carta d\'identità in anagrafica non viene ereditata: ' + id.stato);
  deve(F.destinazione(id) === 'anagrafica', 'destinazione sbagliata per l\'identità del cliente');
  const senza = cat(F.riassunto(conOp('rinnovo_altra_compagnia'), [], {}, OGGI), 'documento_identita');
  deve(senza.stato === 'mancante' && !senza.ok, 'senza anagrafica risulta comunque a posto');
  return 'carta d\'identità e passaporto valgono come identità';
});

prova('i documenti di terzi restano nella pratica: nessuno di loro tocca l\'anagrafica', () => {
  const tutti = ['rinnovo_altra_compagnia', 'bersani_stesso', 'bersani_diverso'].flatMap(op => F.requisiti('rcauto', op));
  const terzi = tutti.filter(c => c.terzo);
  deve(terzi.length, 'nessun campo è marcato come documento di terzi');
  for (const c of terzi) {
    deve(c.fonte === 'pratica', 'il documento di terzi «' + c.l + '» ha fonte ' + c.fonte);
    deve(F.destinazione(c) === 'pratica', 'il documento di terzi «' + c.l + '» finirebbe in anagrafica');
  }
  const nomi = terzi.map(c => c.cat);
  deve(nomi.includes('doc_identita_familiare') && nomi.includes('libretto_veicolo_classe'),
    'i documenti del familiare convivente non sono marcati come terzi: ' + nomi.join(','));
  /* E nessuna regola di compagnia può chiedere un documento di terzi: sarebbe
     un modo di aggirare la regola dal pannello, senza toccare il codice. */
  deve(!F.tipiRegolabili().some(t => (F.CATALOGO[t.cat] || {}).terzo), 'un documento di terzi è regolabile da compagnia');
  return terzi.length + ' campi di terzi, tutti dentro la pratica';
});

prova('un documento d\'identità scaduto NON vale come presente', () => {
  const anag = { documenti: [{ tipo: 'carta_identita', url: 'u', scadenza: '2024-01-01' }] };
  const id = cat(F.riassunto(conOp('rinnovo_altra_compagnia'), [], anag, OGGI), 'documento_identita');
  deve(id.stato === 'scaduto' && !id.ok, 'una carta d\'identità del 2024 risulta «' + id.stato + '»');
  const due = { documenti: [
    { tipo: 'carta_identita', url: 'vecchio', data: '2019-01-01', scadenza: '2024-01-01' },
    { tipo: 'passaporto', url: 'buono', data: '2026-02-01', scadenza: '2029-06-30' }
  ] };
  const ok = cat(F.riassunto(conOp('rinnovo_altra_compagnia'), [], due, OGGI), 'documento_identita');
  deve(ok.ok && ok.doc.url === 'buono', 'con un documento valido in archivio la pratica resta bloccata dal vecchio');
  return 'scaduto ≠ presente; fra più documenti vince il valido';
});

prova('le scadenze si raccontano in tre stati, e 60 giorni sono il preavviso', () => {
  deve(F.scadenza({ scadenza: '2026-09-17' }, OGGI).stato === 'scaduto', 'ieri non è scaduto');
  deve(F.scadenza({ scadenza: '2026-09-18' }, OGGI).stato === 'in_scadenza', 'oggi non è in scadenza');
  deve(F.scadenza({ scadenza: '2026-11-17' }, OGGI).stato === 'in_scadenza', '60 giorni non sono preavviso');
  deve(F.scadenza({ scadenza: '2026-11-18' }, OGGI).stato === 'valido', '61 giorni sono già preavviso');
  deve(F.scadenza({}, OGGI).stato === 'senza_data', 'un documento senza scadenza ne prende una');
  deve(F.scadenza({ scadenza: 'non una data' }, OGGI).stato === 'senza_data', 'una data storta diventa una scadenza');
  deve(F.scadenza({ scadenza: '2026-09-17' }, OGGI).giorni === -1, 'i giorni mancanti non sono negativi quando è scaduto');
  return 'scaduto / in scadenza (≤60 gg) / valido / senza data';
});

prova('«caricato» non è «a posto» quando serve la firma', () => {
  const docs = [
    { categoria: 'polizza_firmata', url: 'u', firmato: false },
    { categoria: 'privacy', url: 'u', firmato: true },
    { categoria: 'libretto_veicolo', url: 'u', firmato: false }
  ];
  const r = F.riassunto(conOp('rinnovo_altra_compagnia'), docs, CI_VALIDA, OGGI);
  deve(cat(r, 'polizza_firmata').stato === 'caricato' && !cat(r, 'polizza_firmata').ok, 'una polizza non firmata passa per buona');
  deve(cat(r, 'libretto_veicolo').ok, 'il libretto, che non si firma, resta indietro per la firma');
  deve(r.mancanti === 1 && !r.completo, 'mancanti ' + r.mancanti + ' (atteso 1: la polizza da firmare)');
  deve(r.cheCosaManca.length === 1 && /Polizza firmata/.test(r.cheCosaManca[0]), 'non dice che cosa manca: ' + r.cheCosaManca.join(','));
  const facolt = cat(r, 'presa_visione');
  deve(!facolt.obbl && !facolt.ok, 'la presa visione non è più facoltativa');
  return 'il facoltativo che manca non blocca il perfezionamento';
});

prova('il percorso intero: Bersani proprietario diverso, da zero a completo', () => {
  const pol = conOp('bersani_diverso');
  let docs = [];
  const passi = [
    ['polizza_firmata', true], ['privacy', true], ['libretto_veicolo', false],
    ['autocert_stato_famiglia', false], ['doc_identita_familiare', false], ['libretto_veicolo_classe', false]
  ];
  let prima = F.mancanti(pol, docs, CI_VALIDA, OGGI);
  deve(prima === 6, 'all\'apertura mancano ' + prima + ' documenti (atteso 6: 7 obbligatori meno l\'identità ereditata, col gruppo contato una volta)');
  for (const [c, firma] of passi) {
    docs = docs.concat([{ categoria: c, url: 'u', firmato: firma }]);
    const ora = F.mancanti(pol, docs, CI_VALIDA, OGGI);
    deve(ora === prima - 1, 'caricando ' + c + ' i mancanti passano da ' + prima + ' a ' + ora);
    prima = ora;
  }
  deve(F.riassunto(pol, docs, CI_VALIDA, OGGI).completo, 'a fine percorso il fascicolo non è completo');
  return '6 → 0, un documento alla volta';
});

/* ══ PARTE 2 ═══════════════════════════════════════════════════════════════ */

prova('§3.5 · in anagrafica ci sono due soli tipi, e la patente non è uno di loro', () => {
  const ids = F.TIPI_CLIENTE.map(t => t.id);
  deve(ids.length === 2 && ids.includes('carta_identita') && ids.includes('passaporto'), 'i tipi anagrafici sono ' + ids.join(','));
  deve(F.TIPI_CLIENTE.every(t => t.scade && t.numero && t.identita), 'un tipo anagrafico non chiede scadenza o numero');
  /* Una patente caricata prima di oggi resta leggibile, ma NON vale come
     identità: altrimenti una pratica si chiuderebbe con la patente al posto
     della carta d'identità e sembrerebbe a posto. */
  const t = F.tipoCliente('Patente');
  deve(t.storico && !t.identita, 'una patente in anagrafica vale come documento d\'identità');
  const soloPatente = { documenti: [{ tipo: 'Patente', url: 'u', scadenza: '2030-01-01' }] };
  deve(F.identitaCliente(soloPatente, OGGI) === null, 'con la sola patente il cliente risulta identificato');
  deve(!cat(F.riassunto(conOp('rinnovo_altra_compagnia'), [], soloPatente, OGGI), 'documento_identita').ok,
    'la patente in anagrafica chiude il requisito d\'identità');
  return 'carta d\'identità e passaporto; la patente è storico e non identifica';
});

prova('§3.6 · la patente è un documento del fascicolo, e si carica nella pratica', () => {
  const p = F.definizione('patente');
  deve(p && p.fonte === 'pratica', 'la patente non è un campo di pratica: ' + JSON.stringify(p));
  deve(F.destinazione(p) === 'pratica', 'la patente finirebbe in anagrafica');
  deve(F.tipiRegolabili().some(t => t.cat === 'patente'), 'la patente non si può chiedere in una regola di compagnia');
  return 'fonte pratica, regolabile per compagnia';
});

prova('§3.5 · più versioni dello stesso tipo: l\'ultima non scaduta è attiva, le altre restano', () => {
  const anag = { documenti: [
    { tipo: 'carta_identita', numero: 'VECCHIA', url: 'u1', data: '2018-03-01', scadenza: '2028-03-01' },
    { tipo: 'carta_identita', numero: 'NUOVA',   url: 'u2', data: '2026-05-01', scadenza: '2036-05-01' },
    { tipo: 'passaporto',     numero: 'PASS',    url: 'u3', data: '2025-01-01', scadenza: '2035-01-01' }
  ] };
  const docs = F.documentiCliente(anag, OGGI);
  deve(docs.length === 3, 'lo storico è sparito: ' + docs.length + ' documenti invece di 3');
  const attivi = docs.filter(d => d.attivo);
  deve(attivi.length === 2, 'attivi ' + attivi.length + ' (atteso 2: una carta d\'identità e un passaporto)');
  deve(attivi.find(d => d.tipo.id === 'carta_identita').numero === 'NUOVA', 'attiva è la carta d\'identità vecchia');
  deve(docs.find(d => d.numero === 'VECCHIA').attivo === false, 'la versione precedente non è finita nello storico');
  /* Se sono tutte scadute, l'ultima resta comunque l'attiva: è il documento
     da rinnovare, e va mostrata come tale invece che sparire. */
  const tutteScadute = { documenti: [
    { tipo: 'carta_identita', url: 'a', data: '2010-01-01', scadenza: '2015-01-01' },
    { tipo: 'carta_identita', url: 'b', data: '2016-01-01', scadenza: '2024-01-01' }
  ] };
  const s = F.documentiCliente(tutteScadute, OGGI).filter(d => d.attivo);
  deve(s.length === 1 && s[0].url === 'b', 'con tutte scadute non resta un documento da rinnovare');
  return '3 documenti, 2 attivi, lo storico non si cancella';
});

prova('§3.7 · i requisiti della compagnia si SOMMANO a quelli dell\'operazione, non li sostituiscono', () => {
  const regolePrima = [{ documento: 'patente', obbligatorio: true }];
  const senza = F.requisiti('rcauto', 'rinnovo_altra_compagnia').map(c => c.cat);
  const con = F.requisiti('rcauto', 'rinnovo_altra_compagnia', regolePrima);
  const cats = con.map(c => c.cat);
  for (const k of senza) deve(cats.includes(k), 'la regola di compagnia ha fatto sparire ' + k);
  deve(cats.includes('patente'), 'la patente chiesta da Prima non compare');
  deve(con.find(c => c.cat === 'patente').obbl, 'la patente di Prima non è obbligatoria');
  deve(con.find(c => c.cat === 'patente').da === 'compagnia', 'non si sa da dove viene il requisito');
  return 'operazione + compagnia = unione';
});

prova('§3.7 · un requisito chiesto da tutti e due non si conta due volte, e il facoltativo si alza', () => {
  const r = F.requisiti('rcauto', 'rinnovo_altra_compagnia', [
    { documento: 'libretto_veicolo', obbligatorio: true },
    { documento: 'presa_visione', obbligatorio: true }
  ]);
  deve(r.filter(c => c.cat === 'libretto_veicolo').length === 1, 'il libretto è elencato due volte: i mancanti sarebbero il doppio');
  const pv = r.find(c => c.cat === 'presa_visione');
  deve(pv.obbl, 'la compagnia lo chiede obbligatorio e resta facoltativo');
  deve(/base\+compagnia/.test(pv.da), 'non si vede che il requisito è stato alzato dalla compagnia: ' + pv.da);
  /* Una regola che nomina un documento che non esiste non si applica e non
     sparisce: si vede, altrimenti un refuso nel pannello toglierebbe un
     requisito senza che nessuno se ne accorga. */
  const storta = F.requisiti('rcauto', 'rinnovo_altra_compagnia', [{ documento: 'certificato_lunare' }]);
  deve(!storta.some(c => c.cat === 'certificato_lunare'), 'un tipo inventato è entrato nei requisiti');
  deve(storta.ignorate.includes('certificato_lunare'), 'un tipo sconosciuto sparisce in silenzio');
  return 'niente doppioni, il più severo vince, gli sconosciuti si dichiarano';
});

prova('§3.7 · i requisiti si congelano: cambiare la regola di una compagnia non tocca le pratiche già create', () => {
  const regoleIeri = [{ documento: 'patente', obbligatorio: true }];
  const congelato = F.congela(POL, 'rinnovo_altra_compagnia', { id: 'c-prima', nome: 'Prima Assicurazioni' }, regoleIeri, '2026-09-18T09:00:00Z');
  const pratica = { ...POL, compagnia: 'Prima Assicurazioni', dati: { fascicolo: congelato } };
  const docs = [
    { categoria: 'polizza_firmata', url: 'u', firmato: true },
    { categoria: 'privacy', url: 'u', firmato: true },
    { categoria: 'libretto_veicolo', url: 'u' },
    { categoria: 'patente', url: 'u' }
  ];
  const r = F.riassunto(pratica, docs, CI_VALIDA, { oggi: OGGI });
  deve(r.completo, 'la pratica congelata non risulta completa: mancano ' + r.mancanti);
  deve(r.congelato && r.congelatoIl === '2026-09-18T09:00:00Z', 'il fascicolo non si dichiara congelato');
  deve(r.compagnia === 'Prima Assicurazioni', 'la compagnia congelata è ' + r.compagnia);

  /* Domani Prima aggiunge due documenti. La pratica di ieri NON deve
     diventare incompleta: è il punto di tutta la faccenda. */
  const regoleDomani = regoleIeri.concat([{ documento: 'presa_visione', obbligatorio: true }, { documento: 'altro', obbligatorio: true }]);
  const dopo = F.riassunto(pratica, docs, CI_VALIDA, { oggi: OGGI, regole: regoleDomani });
  deve(dopo.completo, 'la regola nuova ha reso incompleta una pratica già creata: ' + dopo.cheCosaManca.join(', '));
  deve(dopo.campi.length === r.campi.length, 'i campi della pratica congelata sono cambiati sotto i piedi');

  /* Una pratica NUOVA, invece, deve vedere le regole nuove. */
  const nuova = F.riassunto(conOp('rinnovo_altra_compagnia'), docs, CI_VALIDA, { oggi: OGGI, regole: regoleDomani });
  deve(!nuova.completo && nuova.mancanti === 2, 'la pratica nuova non vede le regole nuove: mancanti ' + nuova.mancanti);
  return 'la pratica di ieri resta completa, quella di oggi vede le regole nuove';
});

prova('§3.8 · il contatore delle scadenze guarda i clienti, e solo i documenti attivi', () => {
  const anagrafiche = [
    { id: 'a1', nominativo: 'ROSSI MARIO', documenti: [{ tipo: 'carta_identita', numero: 'X1', url: 'u', data: '2016-01-01', scadenza: '2024-05-01' }] },
    { id: 'a2', nominativo: 'BIANCHI ANNA', documenti: [{ tipo: 'carta_identita', url: 'u', data: '2020-01-01', scadenza: '2026-10-10' }] },
    { id: 'a3', nominativo: 'VERDI LUIGI', documenti: [{ tipo: 'carta_identita', url: 'u', data: '2024-01-01', scadenza: '2034-01-01' }] },
    /* Rinnovata: la vecchia è scaduta ma non è più attiva, quindi questo
       cliente NON va chiamato. Contarlo vorrebbe dire telefonare a chi ha già
       portato il documento nuovo — e smettere di fidarsi dell'elenco. */
    { id: 'a4', nominativo: 'NERI PAOLO', documenti: [
      { tipo: 'carta_identita', url: 'v', data: '2014-01-01', scadenza: '2024-01-01' },
      { tipo: 'carta_identita', url: 'n', data: '2026-06-01', scadenza: '2036-06-01' }] },
    { id: 'a5', nominativo: 'SENZA DOCUMENTI' }
  ];
  const c = F.scadenzeClienti(anagrafiche, OGGI);
  deve(c.scaduti === 1 && c.inScadenza === 1, 'scaduti ' + c.scaduti + ', in scadenza ' + c.inScadenza + ' (attesi 1 e 1)');
  deve(c.righe.length === 2, 'in elenco ' + c.righe.length + ' clienti invece di 2');
  deve(c.righe[0].nominativo === 'ROSSI MARIO', 'il più urgente non è il primo: ' + c.righe[0].nominativo);
  deve(!c.righe.some(r => r.cliente_id === 'a4'), 'un cliente che ha già rinnovato viene chiamato di nuovo');
  deve(!c.righe.some(r => r.cliente_id === 'a5'), 'un cliente senza documenti finisce fra le scadenze: è un\'altra cosa');
  return '1 scaduto, 1 in scadenza, chi ha rinnovato non si chiama';
});

prova('§3.8 · il contatore dei fascicoli è un\'altra cosa, e dice compagnia e operatore', () => {
  const polizze = [
    { id: 'p1', cliente: 'ROSSI MARIO', cliente_id: 'a1', modulo: 'rca', compagnia: 'Prima Assicurazioni',
      creato_nome: 'Anna Bianchi', data_effetto: '2026-03-01',
      dati: { fascicolo: F.congela(POL, 'rinnovo_altra_compagnia', { id: 'c1', nome: 'Prima Assicurazioni' }, [{ documento: 'patente' }]) } },
    { id: 'p2', cliente: 'VERDI LUIGI', cliente_id: 'a3', modulo: 'rca', compagnia: 'HDI',
      creato_nome: 'Mario Neri', data_effetto: '2026-04-01',
      dati: { fascicolo: F.congela(POL, 'rinnovo_altra_compagnia', { id: 'c2', nome: 'HDI' }, []) } }
  ];
  const anag = { a1: { documenti: [{ tipo: 'carta_identita', url: 'u', data: '2016-01-01', scadenza: '2024-05-01' }] },
                 a3: CI_VALIDA };
  const docs = {
    p1: [{ categoria: 'polizza_firmata', url: 'u', firmato: true }],
    p2: [{ categoria: 'polizza_firmata', url: 'u', firmato: true }, { categoria: 'privacy', url: 'u', firmato: true },
         { categoria: 'libretto_veicolo', url: 'u' }]
  };
  const f = F.fascicoliIncompleti(polizze, docs, anag, OGGI);
  deve(f.pratiche === 1, 'pratiche incomplete ' + f.pratiche + ' (attesa 1: la seconda è a posto)');
  const r = f.righe[0];
  deve(r.polizza_id === 'p1', 'l\'incompleta è ' + r.polizza_id);
  deve(r.compagnia === 'Prima Assicurazioni' && r.operatore === 'Anna Bianchi', 'non si sa per chi filtrare: ' + r.compagnia + ' / ' + r.operatore);
  deve(r.mancanti === 4, 'a p1 mancano ' + r.mancanti + ' documenti (attesi 4: privacy, identità scaduta, libretto, patente)');
  deve(r.cheCosaManca.length === 4, 'non elenca che cosa manca');
  /* I due contatori restano separati: il cliente a1 compare in tutti e due,
     ma per ragioni diverse, e si risolvono con due telefonate diverse. */
  const s = F.scadenzeClienti([{ id: 'a1', nominativo: 'ROSSI MARIO', documenti: anag.a1.documenti }], OGGI);
  deve(s.scaduti === 1 && f.pratiche === 1, 'i due contatori si sono fusi in uno');
  return '1 fascicolo incompleto, filtrabile per compagnia e operatore';
});

/* ══ IL FASCICOLO PRIMA DELLA POLIZZA (18/09/2026) ═══════════════════════════
   I documenti si raccolgono mentre la polizza non c'è ancora. Le regole che
   contano non sono quelle della raccolta — sono le stesse di sempre, ed è il
   punto — ma quelle del COLLEGAMENTO: il giorno in cui la polizza arriva, i
   requisiti congelati passano su di lei senza cambiare data, e i documenti
   la seguono. Sbagliare lì vuol dire riscrivere i requisiti di una pratica o
   spostare i documenti di un cliente nel fascicolo di un altro. */

const PRAT = {
  id: 'pr-1', cliente_id: 'a1', cliente: 'ROSSI MARIO', modulo: 'rca', prodotto: 'RC Auto',
  descrizione: 'AB123CD', data_prevista: '2026-10-01',
  dati: { fascicolo: F.congela(POL, 'bersani_stesso', { id: 'c1', nome: 'Prima' }, [{ documento: 'patente' }], '2026-09-01T09:00:00.000Z') }
};

prova('una pratica senza polizza si lavora con le stesse regole: il motore non sa che non è una polizza', () => {
  /* Se servisse una seconda versione delle regole per le pratiche, prima o
     poi le due direbbero cose diverse. Le colonne di quote_pratiche si
     chiamano come quelle di quote_polizze proprio per questo. */
  const r = F.riassunto(PRAT, [], CI_VALIDA, OGGI);
  deve(r.congelato, 'i requisiti della pratica non risultano congelati');
  deve(r.ramo === 'rcauto', 'il ramo di una pratica non si riconosce: ' + r.ramo);
  deve(cat(r, 'patente'), 'la regola della compagnia non è arrivata sulla pratica');
  deve(cat(r, 'documento_identita').stato === 'ereditato', 'la pratica non eredita l\'identità dall\'anagrafica');
  return r.mancanti + ' documenti mancanti, requisiti congelati il 01/09';
});

prova('il contatore di agenzia conta anche le pratiche senza polizza, e dice quali sono', () => {
  /* Un fascicolo che non compare nel contatore è un fascicolo che nessuno va
     a completare: è il motivo per cui il contatore esiste. */
  const righe = [
    { id: 'p1', entita: 'polizza', cliente: 'VERDI LUIGI', cliente_id: 'a3', modulo: 'rca', data_effetto: '2026-04-01',
      dati: { fascicolo: F.congela(POL, 'rinnovo_altra_compagnia', null, []) } },
    { ...PRAT, entita: 'pratica' }
  ];
  const f = F.fascicoliIncompleti(righe, {}, { a1: CI_VALIDA, a3: CI_VALIDA }, OGGI);
  deve(f.pratiche === 2, 'fascicoli incompleti ' + f.pratiche + ' (attesi 2)');
  deve(f.polizze === 1 && f.senzaPolizza === 1, 'non si distinguono: ' + f.polizze + ' / ' + f.senzaPolizza);
  const pr = f.righe.find(r => r.entita === 'pratica');
  deve(pr, 'la pratica non compare nel contatore');
  /* `polizza_id` su una pratica sarebbe una bugia comoda da leggere: la
     schermata aprirebbe un fascicolo di polizza che non esiste. */
  deve(pr.polizza_id === null, 'una pratica porta un polizza_id: ' + pr.polizza_id);
  deve(pr.id === 'pr-1', 'la riga non porta l\'id della pratica');
  deve(pr.data_effetto === '2026-10-01' && pr.prevista, 'la decorrenza prevista non è dichiarata come prevista');
  deve(pr.descrizione === 'AB123CD', 'si perde il riferimento che distingue due pratiche dello stesso cliente');
  return '2 incompleti: 1 polizza, 1 pratica senza polizza';
});

prova('il collegamento passa i requisiti COM\'ERANO, non come sono oggi', () => {
  const pol = { id: 'p9', cliente_id: 'a1', modulo: 'rca', prodotto: 'RC Auto', dati: {} };
  const c = F.collegabile(PRAT, pol);
  deve(c.ok, 'non si collega: ' + c.motivo);
  deve(c.fascicolo.congelato_il === '2026-09-01T09:00:00.000Z',
    'la data del congelamento è cambiata nel collegamento: ' + c.fascicolo.congelato_il);
  deve(c.fascicolo.operazione === 'bersani_stesso', 'l\'operazione non passa alla polizza');
  /* La polizza collegata deve chiedere esattamente quello che chiedeva la
     pratica: se i requisiti si rileggessero oggi, una regola cambiata nel
     frattempo renderebbe incompleta una pratica che era finita. */
  const dopo = F.riassunto({ ...pol, dati: { fascicolo: c.fascicolo } }, [], CI_VALIDA, OGGI);
  const prima = F.riassunto(PRAT, [], CI_VALIDA, OGGI);
  deve(dopo.campi.length === prima.campi.length, 'la polizza chiede un numero diverso di documenti');
  return 'requisiti e data invariati: ' + dopo.campi.length + ' contenitori';
});

prova('quattro casi in cui NON si collega, e ognuno dice perché', () => {
  const base = { id: 'p9', cliente_id: 'a1', modulo: 'rca', dati: {} };
  const senzaFasc = { ...PRAT, dati: {} };
  deve(!F.collegabile(senzaFasc, base).ok, 'si collega una pratica senza fascicolo');
  /* Cliente diverso: spostare i documenti vorrebbe dire mettere la carta
     d'identità di uno nel fascicolo di un altro. */
  deve(!F.collegabile(PRAT, { ...base, cliente_id: 'a2' }).ok, 'si collega alla polizza di un altro cliente');
  /* Ramo diverso: i requisiti congelati non sarebbero i suoi. */
  deve(!F.collegabile(PRAT, { ...base, modulo: 'persona', prodotto: 'Infortuni' }).ok, 'si collega a un ramo diverso');
  /* Una polizza che ha già il SUO fascicolo non si sovrascrive. */
  const altrui = { ...base, dati: { fascicolo: F.congela(POL, 'rinnovo_altra_compagnia', null, [], '2026-08-01T00:00:00.000Z') } };
  deve(!F.collegabile(PRAT, altrui).ok, 'si sovrascrive il fascicolo già congelato sulla polizza');
  deve(/già il suo fascicolo/.test(F.collegabile(PRAT, altrui).motivo), 'il motivo non dice che cosa si perderebbe');
  return '4 rifiuti, ognuno col suo motivo';
});

prova('un collegamento interrotto a metà si riprende, e non si scambia per quello di un\'altra pratica', () => {
  /* I tre passi (requisiti sulla polizza, documenti spostati, pratica
     segnata) non sono una transazione: la rete può cadere in mezzo. Se il
     secondo tentativo dicesse «questa polizza ha già un fascicolo», i
     documenti resterebbero sulla pratica per sempre. */
  const f = PRAT.dati.fascicolo;
  const aMeta = { id: 'p9', cliente_id: 'a1', modulo: 'rca', dati: { fascicolo: f } };
  deve(F.collegabile(PRAT, aMeta).ok, 'il collegamento interrotto non si riprende');
  /* Ma il fascicolo di un'ALTRA pratica, congelato in un altro momento, resta
     una cosa da non sovrascrivere. */
  const altra = { ...aMeta, dati: { fascicolo: { ...f, congelato_il: '2026-07-01T00:00:00.000Z' } } };
  deve(!F.collegabile(PRAT, altra).ok, 'si sovrascrive il fascicolo di un\'altra pratica');
  return 'si riprende il proprio, non quello di un altro';
});

console.log('\n══ FASCICOLO DI PRATICA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nFASCICOLO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
