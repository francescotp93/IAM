// ═══════════════════════════════════════════════════════════════════════════════
//  I PUNTI VENDITA — le regole  (23/09/2026)
//
//  Qui si prova il motore, in Node. La schermata ha le sue prove in
//  `iam/verifica/punti-vendita.test.mjs`, e una di quelle la FA GIRARE (§67).
//
//  La regola che vale più di tutte, e che queste prove esistono per difendere:
//  un punto vendita figlio non può potere più del padre. Senza, basterebbe
//  togliere un permesso all'agenzia generale e dimenticarsene, e le filiali
//  continuerebbero a incassare — la schermata direbbe «no» e il sistema «sì».
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const require = createRequire(import.meta.url);
const PV = require(path.join(RADICE, 'tariffe', 'motore', 'punti-vendita.js'));
const MIGR = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260923b_punti_vendita.sql'), 'utf8');
const soloSql = s => s.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Una struttura come quella della schermata di Francesco: un'agenzia generale
   con due filiali, e una terza sotto una di quelle. */
const AG = { id: 'ag', nome: 'AGENZIA GENERALE 1499', codice: '1499', padre_id: null,
  data_inizio: '2025-07-09', attivo: true,
  puo_proposta: true, puo_emissione: true, puo_incasso: true, puo_quotazione: true };
const F1 = { id: 'f1', nome: 'FILIALE PALERMO', codice: 'PA', padre_id: 'ag', attivo: true,
  puo_proposta: true, puo_emissione: true, puo_incasso: false, puo_quotazione: true };
const F2 = { id: 'f2', nome: 'FILIALE CATANIA', codice: 'CT', padre_id: 'ag', attivo: true,
  puo_proposta: true, puo_emissione: false, puo_incasso: true, puo_quotazione: true };
const F3 = { id: 'f3', nome: 'SPORTELLO ACIREALE', codice: 'AC', padre_id: 'f2', attivo: true,
  puo_proposta: true, puo_emissione: true, puo_incasso: true, puo_quotazione: true };
const TUTTI = [AG, F1, F2, F3];

prova('l’albero si costruisce, e i figli stanno sotto il loro padre', () => {
  const a = PV.albero(TUTTI, { oggi: '2026-09-23' });
  deve(a.radici.length === 1, 'le radici non sono una: ' + a.radici.length);
  deve(a.radici[0].id === 'ag', 'la radice non è l’agenzia generale');
  deve(a.radici[0].figli.length === 2, 'l’agenzia non ha due filiali');
  const ct = a.radici[0].figli.find(x => x.id === 'f2');
  deve(ct && ct.figli.length === 1 && ct.figli[0].id === 'f3', 'lo sportello non sta sotto Catania');
  deve(ct.livello === 1 && ct.figli[0].livello === 2, 'i livelli non sono quelli');
  return '1 radice, 2 filiali, 1 sportello al secondo livello';
});

prova('UN FIGLIO NON PUÒ POTERE PIÙ DEL PADRE, e si dice chi glielo toglie', () => {
  /* Lo sportello di Acireale ha TUTTE le caselle spuntate. Ma sta sotto
     Catania, che non emette: quindi non emette nemmeno lui. */
  const e = PV.effettive(TUTTI, 'f3');
  deve(e.puo_emissione.propria === true, 'la casella dello sportello non risulta spuntata');
  deve(e.puo_emissione.effettiva === false, 'lo sportello emette anche se il padre non emette');
  deve(e.puo_emissione.tolta_da === 'FILIALE CATANIA',
    'non dice chi toglie l’emissione: ' + e.puo_emissione.tolta_da);
  /* E quello che il padre ha, passa. */
  deve(e.puo_incasso.effettiva === true, 'l’incasso non passa dal padre che ce l’ha');
  /* Sulla radice propria ed effettiva coincidono. */
  const r = PV.effettive(TUTTI, 'ag');
  deve(r.puo_emissione.effettiva === true && r.puo_emissione.tolta_da === null,
    'sulla radice l’effettiva non coincide con la propria');
  return 'l’AND della catena, e il nome di chi toglie';
});

prova('CONTROPROVA DELLA REGOLA: senza la catena, lo sportello emetterebbe', () => {
  /* Il caso che questa regola esiste per impedire, scritto come dato: se si
     guardasse solo la casella del punto vendita, `puo_emissione` di f3 è
     `true` — e sarebbe un permesso che nessuno ha dato. */
  deve(F3.puo_emissione === true, 'il campione non ha più la casella spuntata');
  deve(PV.effettive(TUTTI, 'f3').puo_emissione.effettiva === false,
    'la catena non sta togliendo niente: la prova non misura più la regola');
  return 'casella true, effettiva false';
});

prova('un punto vendita SPENTO, o fuori dal suo periodo, non è attivo', () => {
  deve(PV.attivo({ attivo: false }, '2026-09-23').ok === false, 'uno spento risulta attivo');
  deve(PV.attivo({ attivo: true, data_inizio: '2026-10-01' }, '2026-09-23').ok === false,
    'uno che apre il mese prossimo risulta già aperto');
  deve(PV.attivo({ attivo: true, data_fine: '2026-08-31' }, '2026-09-23').ok === false,
    'uno chiuso ad agosto risulta ancora aperto');
  deve(PV.attivo({ attivo: true, data_inizio: '2025-01-01', data_fine: '2027-01-01' }, '2026-09-23').ok === true,
    'uno dentro al suo periodo risulta chiuso');
  /* SENZA una data di riferimento il periodo NON si giudica, e si dichiara:
     chiedere l'ora al computer di chi guarda darebbe due risposte diverse a
     due persone sullo stesso dato (§44, §45). */
  const senza = PV.attivo({ attivo: true, data_fine: '2020-01-01' }, null);
  deve(senza.ok === true && senza.incerto === true,
    'senza la data di riferimento il motore giudica lo stesso il periodo');
  return 'spento, non ancora aperto, chiuso — e «non si sa» quando non si sa';
});

prova('I FILTRI GUARDANO L’ABILITAZIONE EFFETTIVA, non la casella', () => {
  const f = PV.filtra(TUTTI, { puo_emissione: true }, { oggi: '2026-09-23' });
  const ids = [];
  (function giu(l) { l.forEach(n => { if (!n.di_passaggio) ids.push(n.id); giu(n.figli); }); })(f.radici);
  deve(ids.indexOf('f3') < 0, 'lo sportello passa il filtro «emissione» che il padre gli toglie');
  deve(ids.indexOf('f2') < 0, 'Catania passa il filtro «emissione» che non ha');
  deve(ids.indexOf('ag') >= 0 && ids.indexOf('f1') >= 0, 'chi emette davvero non passa il filtro');
  deve(f.quanti === 2, 'il conteggio non è quello delle righe che passano: ' + f.quanti);
  return '2 su 4, e la casella spuntata non basta';
});

prova('un punto vendita che non passa il filtro ma ha un figlio che passa RESTA in albero', () => {
  /* IL CAMPIONE CONTA. Il primo tentativo filtrava su un'abilitazione: non
     poteva funzionare, perché un figlio non può averla se il padre non ce
     l'ha — sotto un padre che non passa non c'è mai un figlio che passa, e
     non restava niente «di passaggio» da misurare. La prova non misurava il
     codice, misurava la regola della catena una seconda volta.
     Il caso vero è «solo attivi», che NON si eredita: una filiale aperta
     sotto un'agenzia chiusa continua a lavorare, e se il padre sparisse dal
     disegno la filiale resterebbe appesa a niente. */
  const righe = [{ ...AG, attivo: false }, F1, F2, F3];
  const f = PV.filtra(righe, { solo_attivi: true }, { oggi: '2026-09-23' });
  deve(f.radici.length === 1 && f.radici[0].id === 'ag',
    'l’agenzia spenta è sparita e con lei le filiali aperte');
  deve(f.radici[0].di_passaggio === true, 'l’agenzia spenta non è marcata come riga di passaggio');
  deve(f.radici[0].figli.length === 2, 'le filiali aperte non sono rimaste sotto');
  /* E non si conta: è una strada, non un risultato. */
  deve(f.quanti === 3, 'il conteggio conta anche la riga di passaggio: ' + f.quanti);
  return 'la strada resta, e non si conta';
});

prova('un padre che non c’è non fa sparire il figlio: lo dichiara ORFANO', () => {
  const a = PV.albero([F1, F3], { oggi: '2026-09-23' });
  deve(a.tutti.length === 2, 'ha perso delle righe');
  deve(a.orfani === 2, 'non li dichiara orfani: ' + a.orfani);
  deve(a.radici.length === 2, 'non li mostra come radici');
  return 'due orfani, e nessuno sparito';
});

prova('un ANELLO non manda in cerchio chi disegna', () => {
  const a = { id: 'a', nome: 'A', padre_id: 'b' };
  const b = { id: 'b', nome: 'B', padre_id: 'a' };
  const al = PV.albero([a, b], { oggi: '2026-09-23' });
  deve(al.ciclici === 2, 'non riconosce l’anello: ' + al.ciclici);
  deve(al.radici.length === 2, 'le righe dell’anello sono sparite');
  /* Il divieto VERO è nel database, non qui. */
  deve(/create trigger iam_pv_no_anello_trg/.test(soloSql(MIGR)),
    'il database lascia chiudere un anello');
  return 'due righe marcate, e il trigger sotto';
});

prova('LE PERSONE SONO QUELLE DEL REGISTRO, non gli account', () => {
  const persone = [
    { id: 'p1', cognome: 'ALEO', nome: 'ALESSANDRO', email: 'alex@x.it', punto_vendita_id: 'ag', iam_id: 'u1' },
    { id: 'p2', cognome: 'ODDO', nome: 'FRANCESCO', email: 'f@x.it', punto_vendita_id: 'ag' },
    { id: 'p3', cognome: 'ROSSI', nome: 'MARIO', punto_vendita_id: 'f1' },
    { id: 'p4', cognome: 'VERDI', nome: 'ANNA' }
  ];
  const account = [{ id: 'u1', iam_id: 'u1', email: 'alex@x.it', ruolo: 'top_master', attivo: true }];
  const dentro = PV.personeDi(persone, 'ag', { account });
  deve(dentro.length === 2, 'non trova le due persone dell’agenzia: ' + dentro.length);
  /* Chi non ha un accesso NON sparisce: dodici persone su diciassette sono
     così, e partire dagli account le lascerebbe fuori (§48). */
  const odd = dentro.find(x => x.id === 'p2');
  deve(odd && odd.stato === 'senza-account', 'una persona senza account non è dichiarata');
  const aleo = dentro.find(x => x.id === 'p1');
  deve(aleo && aleo.account && aleo.account.ruolo === 'top_master', 'l’account non si aggancia alla persona');
  /* E chi non sta in nessun punto vendita si trova chiedendo `null`: è la
     lista da cui si comincia a smistare. */
  deve(PV.personeDi(persone, null, { account }).length === 1, 'non si trova chi è senza punto vendita');
  return '2 dentro, 1 senza account, 1 da smistare';
});

prova('un punto vendita con delle filiali o delle persone NON si cancella', () => {
  const persone = [{ id: 'p1', punto_vendita_id: 'f1' }];
  deve(PV.eliminabile(AG, TUTTI, []).ok === false, 'un padre con due filiali risulta cancellabile');
  deve(PV.eliminabile(F1, TUTTI, persone).ok === false, 'uno con una persona dentro risulta cancellabile');
  deve(/spegnilo invece di cancellarlo/.test(PV.eliminabile(F1, TUTTI, persone).motivo),
    'non dice che si spegne');
  deve(PV.eliminabile(F3, TUTTI, []).ok === true, 'una foglia vuota non si può cancellare');
  /* Il divieto vero sta nel database: la schermata è una delle strade. */
  const sql = soloSql(MIGR);
  deve(/create trigger iam_pv_no_delete_trg/.test(sql), 'il database non difende le persone dentro');
  deve(/on delete restrict/.test(sql), 'il database lascia cancellare un padre con delle filiali');
  return 'filiali e persone difese, e i due cancelli nel database';
});

prova('quello che non si può salvare si dice PRIMA, non dopo', () => {
  deve(PV.valida({ nome: '' }, TUTTI).ok === false, 'accetta un punto vendita senza nome');
  deve(PV.valida({ nome: 'X', data_inizio: '2026-05-01', data_fine: '2026-01-01' }, TUTTI).ok === false,
    'accetta una chiusura prima dell’apertura');
  deve(PV.valida({ id: 'ag', nome: 'X', padre_id: 'ag' }, TUTTI).ok === false,
    'accetta un punto vendita padre di se stesso');
  /* L'anello: mettere l'agenzia generale sotto il suo stesso sportello. */
  const anello = PV.valida({ id: 'ag', nome: 'AGENZIA GENERALE 1499', padre_id: 'f3' }, TUTTI);
  deve(anello.ok === false && /anello/i.test(anello.errori.join(' ')), 'accetta un anello');
  /* Il codice di un altro non si riusa. */
  deve(PV.valida({ id: 'nuovo', nome: 'X', codice: '1499' }, TUTTI).ok === false,
    'accetta il codice di un altro punto vendita');
  deve(PV.valida({ id: 'ag', nome: 'AGENZIA GENERALE 1499', codice: '1499' }, TUTTI).ok === true,
    'rifiuta il codice che quel punto vendita ha già');
  return 'nome, periodo, anello e codice';
});

prova('il riepilogo non trasforma una lettura caduta in uno ZERO', () => {
  const persone = [{ id: 'p1', punto_vendita_id: 'ag' }, { id: 'p2' }];
  const r = PV.riepilogo(TUTTI, persone, { oggi: '2026-09-23' });
  deve(r.punti === 4 && r.attivi === 4, 'i conti non tornano');
  deve(r.senza_punto === 1, 'non conta chi è da smistare');
  deve(r.cieco === false, 'si dichiara cieco senza motivo');
  /* E quando una lettura non riesce: `null`, non `0` (§12, §18). */
  const c = PV.riepilogo(TUTTI, [], { oggi: '2026-09-23', letto: { persone: false } });
  deve(c.persone === null && c.senza_punto === null, 'una lettura caduta diventa uno zero');
  deve(c.cieco === true, 'non dichiara di non aver potuto leggere');
  return 'quattro punti, uno da smistare, e il null quando non si è letto';
});

prova('LA TABELLA NASCE VUOTA: non si semina una struttura che nessuno ha deciso', () => {
  const sql = soloSql(MIGR);
  deve(!/insert\s+into\s+iam_punti_vendita/i.test(sql),
    'la migrazione inventa dei punti vendita');
  /* E le abilitazioni nascono SPENTE: un punto vendita che nasce potendo
     emettere polizze è un permesso che nessuno ha dato. */
  ['puo_proposta', 'puo_emissione', 'puo_incasso', 'puo_quotazione'].forEach(k => {
    deve(new RegExp(k + '\\s+boolean not null default false').test(sql),
      k + ' non nasce spenta');
  });
  /* Il punto vendita sta sulla PERSONA, non sull'account. */
  deve(/alter table quote_collaboratori[\s\S]*punto_vendita_id/.test(sql),
    'il punto vendita non sta sul registro delle persone');
  deve(!/alter table iam_utenti[\s\S]*punto_vendita_id/.test(sql),
    'il punto vendita sta sugli account invece che sulle persone');
  /* `iam_utenti.rete` non si cancella: è l'unica traccia di quello che c'era. */
  deve(!/drop column[^\n]*rete/i.test(sql), 'la migrazione butta via il campo di testo da cui si viene');
  return 'zero righe, quattro abilitazioni spente, e la rete vecchia non si tocca';
});

prova('chi legge e chi scrive: lo staff guarda, l’admin decide', () => {
  const sql = soloSql(MIGR);
  deve(/create policy pv_select on iam_punti_vendita for select using \(iam_is_staff\(\)\)/.test(sql),
    'la lettura non è dello staff');
  ['insert', 'update', 'delete'].forEach(c => {
    deve(new RegExp('create policy pv_' + c + '[\\s\\S]{0,200}iam_is_admin\\(\\)').test(sql),
      'la ' + c + ' non è riservata all’admin');
  });
  return 'staff legge, admin scrive — qui si decide chi può emettere';
});

console.log('\n══ PUNTI VENDITA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = await fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPUNTI VENDITA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
