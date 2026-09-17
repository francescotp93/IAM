// ═══════════════════════════════════════════════════════════════════════════════
//  IL REGISTRO UNICO DELLE PERSONE (17/09/2026, Lavoro 2 PR 1)
//
//  Prima le persone stavano in tre tabelle quasi scollegate. Ora ogni riga
//  della sezione «Collaboratori» e' una persona di quote_collaboratori;
//  iam_team e' l'allegato economico agganciato da collab_id. Queste prove
//  sorvegliano che la sezione legga davvero le persone per prime, che chi
//  salva scriva nel registro, e che la migrazione non scelga mai al posto di
//  qualcuno quando due schede si somigliano.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { sorgenteAttuale, stanza, esiti, deve, RADICE } from './banco.mjs';

const src = sorgenteAttuale();
const scocca = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const migrazione = fs.readFileSync(path.join(RADICE, '..', 'supabase', 'migrations', '20260917_registro_unico_collaboratori.sql'), 'utf8');
const e = esiti('REGISTRO UNICO DEI COLLABORATORI');

const NOMI = ['collabDaPersona', 'economiaDiPersona', 'collabUnificati', 'numeroOrNull'];
const TEAM = [
  { id: 't1', collab_id: 'p1', nome: 'Anna', cogn: 'Bianchi', email: 'anna@x.it', compagnie: ['hdi'], rami: { auto: true }, port_attuale: 1000 },
  { id: 't2', collab_id: null, nome: 'Vecchia', cogn: 'Scheda', email: 'vecchia@x.it', compagnie: [], rami: {} },
  { id: 't3', collab_id: null, nome: 'Orfana', cogn: 'Economia', email: '', compagnie: [], rami: {} },
];
const PERSONE = [
  { id: 'p1', stato: 'attivo', nome: 'Anna', cognome: 'Bianchi', email: 'anna@x.it', rui_numero: 'E1', provincia: 'NA' },
  { id: 'p2', stato: 'attivo', nome: 'Nuova', cognome: 'Persona', email: 'nuova@x.it', rui_numero: 'E2', veste: 'Subagente' },
  { id: 'p3', stato: 'attivo', nome: 'Vecchia', cognome: 'Scheda', email: 'vecchia@x.it' },
  { id: 'p4', stato: 'candidato', nome: 'Cand', cognome: 'Idato', email: 'c@x.it', portafoglio_stimato: 50000 },
];
const stanzaRegistro = () => stanza(src, NOMI, { altro: { TEAM, COLLAB_LEAD: PERSONE, etichettaCompagnia: k => k.toUpperCase() } });

e.prova('ogni persona attiva del registro e\' in elenco, anche senza scheda economica', () => {
  const s = stanzaRegistro();
  deve(!s.mancanti.length, 'funzioni non trovate in index.html: ' + s.mancanti.join(', '));
  const tutti = s.ctx.collabUnificati();
  const attivi = tutti.filter(x => x.tipo === 'attivo');
  const nuova = attivi.find(x => x.anagrafica && x.anagrafica.id === 'p2');
  deve(nuova, 'la persona attiva senza iam_team e\' sparita dall\'elenco');
  deve(nuova.senzaEconomia === true && nuova.raw.id === 'p:p2' && nuova.raw.collab_id === 'p2', 'la persona senza economia non e\' marcata, o non porta l\'aggancio: ' + JSON.stringify(nuova.raw));
  deve(nuova.raw.rui === 'E2' && nuova.raw.tipo === 'Subagente', 'RUI e veste non arrivano dal registro');
  return attivi.length + ' attivi, la persona senza economia c\'e\' e si distingue';
});

e.prova('l\'economia si aggancia alla persona per collab_id, e per email solo come ripiego', () => {
  const s = stanzaRegistro();
  const tutti = s.ctx.collabUnificati();
  const anna = tutti.find(x => x.anagrafica && x.anagrafica.id === 'p1');
  deve(anna && anna.raw.id === 't1' && !anna.senzaEconomia, 'la persona con collab_id non ha trovato la sua economia');
  deve(anna.compagnie[0] === 'HDI' && anna.fatturato === 1000 && anna.prov === 'NA', 'economia e anagrafica non si fondono nella riga: ' + JSON.stringify([anna.compagnie, anna.fatturato, anna.prov]));
  const vecchia = tutti.find(x => x.anagrafica && x.anagrafica.id === 'p3');
  deve(vecchia && vecchia.raw.id === 't2', 'il ripiego per email non aggancia la scheda vecchia');
  return 'p1 ↔ t1 per id, p3 ↔ t2 per email';
});

e.prova('una scheda economica senza persona NON sparisce: si vede marcata «senza scheda»', () => {
  const s = stanzaRegistro();
  const tutti = s.ctx.collabUnificati();
  const orfana = tutti.find(x => x.raw && x.raw.id === 't3');
  deve(orfana && orfana.senzaScheda === true && orfana.tipo === 'attivo', 'l\'economia orfana e\' sparita o non e\' marcata');
  deve(tutti.filter(x => x.raw && x.raw.id === 't2').length === 1, 'la scheda agganciata per email compare due volte');
  return 'orfana visibile, nessun doppione';
});

e.prova('i candidati restano lead, con il portafoglio DICHIARATO separato dal fatturato', () => {
  const s = stanzaRegistro();
  const lead = s.ctx.collabUnificati().find(x => x.tipo === 'lead');
  deve(lead && lead.anagrafica.id === 'p4' && lead.dichiarato === 50000 && lead.fatturato === null, 'il candidato non e\' un lead con il dichiarato: ' + JSON.stringify(lead));
  return 'candidato → lead, 50.000 dichiarati, fatturato nullo';
});

e.prova('chi salva una scheda scrive PRIMA la persona nel registro, e l\'economia nasce agganciata', () => {
  const saveCollab = src.slice(src.indexOf('function saveCollab()'), src.indexOf('async function salvaPersonaRegistro'));
  deve(/salvaPersonaRegistro\(c\)\.then/.test(saveCollab) && saveCollab.indexOf('salvaPersonaRegistro') < saveCollab.indexOf('saveTeamDB(c)'), 'saveCollab non passa dal registro prima di iam_team');
  deve(/c\.collab_id = TEAM_PERSONA/.test(saveCollab), 'la scheda non porta la persona aperta');
  const salva = src.slice(src.indexOf('async function salvaPersonaRegistro'), src.indexOf('\n}\n', src.indexOf('async function salvaPersonaRegistro')));
  deve(/from\('quote_collaboratori'\)\s*\.insert\(/.test(salva) && /from\('quote_collaboratori'\)\.update\(persona\)/.test(salva), 'il registro non viene ne\' creato ne\' aggiornato');
  deve(/stato: 'attivo', attivo: true/.test(salva) && /fonte: 'iam'/.test(salva), 'la persona nuova non nasce attiva con la fonte');
  deve(/codice_fiscale: String\(c\.cf \|\| ''\)\.toUpperCase\(\)\.replace/.test(salva), 'il codice fiscale non e\' normalizzato');
  const payload = src.slice(src.indexOf('async function saveTeamDB(c)'), src.indexOf("from('iam_team').upsert(payload)"));
  deve(/collab_id:\s*c\.collab_id\s*\|\| null/.test(payload), 'saveTeamDB non scrive collab_id');
  const mappa = src.slice(src.indexOf('async function loadTeamDB()'), src.indexOf('saveTeam(); // cache locale'));
  deve(/collab_id:\s*c\.collab_id\s*\|\| null/.test(mappa), 'loadTeamDB non legge collab_id: l\'aggancio si perderebbe al primo salvataggio');
  return 'registro prima, collab_id in lettura e scrittura';
});

e.prova('il modale si apre anche su una persona senza economia («p:<id>») e non offre «Elimina»', () => {
  const apri = src.slice(src.indexOf('async function openCollabModal(id)'), src.indexOf('function closeCollabModal()'));
  deve(/indexOf\('p:'\) === 0/.test(apri) && /collabDaPersona\(persona\)/.test(apri), 'openCollabModal non riconosce «p:<id>»');
  deve(/TEAM_PERSONA = personaId \|\| \(eco && eco\.collab_id\) \|\| null/.test(apri), 'la persona aperta non viene ricordata per il salvataggio');
  deve(/\(c && !c\.senzaEconomia\) \? 'inline-flex' : 'none'/.test(apri), 'il bottone Elimina compare su una persona senza economia');
  deve(/senzaEconomia \? '' : `<button/.test(src), 'in elenco il bottone Elimina compare anche senza economia');
  return 'p:<id> riconosciuto, Elimina solo dove c\'e\' qualcosa da eliminare';
});

e.prova('eliminare una scheda passa la persona fra i «non proseguiti», non la lascia attiva senza economia', () => {
  const del = src.slice(src.indexOf('async function eliminaCollaboratore()'), src.indexOf('// ── VARIABILI TAB REPORT'));
  deve(/update\(\{ stato: 'scartato', attivo: false \}\)\.eq\('id', TEAM_PERSONA\)/.test(del), 'la persona resta attiva dopo la cancellazione dell\'economia');
  deve(/non proseguiti/.test(del), 'la conferma non dice che cosa succede alla persona');
  return 'stato scartato, detto nella conferma';
});

e.prova('«Operativa» non c\'e\' piu\' nel menu: la voce e i titoli dicono «Collaboratori»', () => {
  deve(/l: 'Collaboratori', i: 'i-users', act: 'operativa'/.test(scocca), 'la voce del menu non e\' Collaboratori con act operativa');
  deve(!/l: 'Operativa'/.test(scocca), 'c\'e\' ancora una voce di menu «Operativa»');
  deve(/team:\s*\['Collaboratori', 'Strumenti'\]/.test(scocca) && /operativa:\s*\['Collaboratori', 'Strumenti'\]/.test(scocca), 'i titoli dicono ancora Operativa');
  deve(/id="nb-team"[^>]*><i class="ti ti-users"><\/i><span>Collaboratori<\/span>/.test(src), 'il bottone della barra dice ancora «Team»');
  deve(/id="panel-operativa"/.test(src) && /goTab\('operativa'\)/.test(src), 'l\'id del pannello e la porta sono cambiati: le scorciatoie e le prove si rompono');
  return 'menu, titoli e barra dicono Collaboratori; l\'id del pannello resta';
});

e.prova('la migrazione aggancia per codice fiscale poi per email, mai quando la corrispondenza non e\' UNA, ed e\' idempotente', () => {
  deve(/where collab_id is null loop/.test(migrazione), 'non e\' idempotente: rilanciata rifarebbe tutto');
  deve(/if n <> 1 then cid := null; end if;/.test(migrazione), 'con due corrispondenze sceglie invece di fermarsi');
  const perCf = migrazione.indexOf("regexp_replace(coalesce(codice_fiscale, ''), '[^A-Za-z0-9]', '', 'g')) = cf_norm");
  const perEmail = migrazione.indexOf("lower(trim(coalesce(email, ''))) = em_norm");
  deve(perCf > 0 && perEmail > perCf, 'l\'ordine non e\' codice fiscale prima, email dopo');
  deve(/from public\.iam_team where lower\(trim\(coalesce\(email, ''\)\)\) = em_norm\) = 1/.test(migrazione), 'due schede economiche con la stessa email verrebbero fuse in una persona');
  deve(/create unique index if not exists quote_collaboratori_iam_id_uidx/.test(migrazione) && /create unique index if not exists iam_team_collab_id_uidx/.test(migrazione), 'mancano gli indici unici: una persona, un account, una scheda');
  deve(/if exists \(select 1 from public\.quote_collaboratori where iam_id = u\.id\) then continue;/.test(migrazione), 'un utente gia\' agganciato verrebbe raddoppiato');
  return 'CF → email → una sola; indici unici; rilanciabile';
});

e.prova('la blindatura di iam_utenti c\'e\', e copre anche profilo e prodotti', () => {
  const pol = migrazione.slice(migrazione.indexOf('create policy u_update_self'));
  for (const col of ['ruolo', 'accesso_iam', 'accesso_quoto', 'permessi', 'lab_abilitato', 'responsabile', 'quoto', 'rete', 'moduli', 'mail_caselle', 'profilo', 'prodotti']) {
    deve(new RegExp('\\b' + col + '\\s+is distinct from').test(pol) || new RegExp('coalesce\\(' + col + ',').test(pol), 'la colonna ' + col + ' non e\' blindata');
  }
  deve(/using \(id = auth\.uid\(\)\)/.test(pol), 'la regola non e\' sulla propria riga');
  return '12 colonne che nessuno cambia su se stesso';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
