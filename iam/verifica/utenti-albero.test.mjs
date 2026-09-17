// ═══════════════════════════════════════════════════════════════════════════════
//  «UTENTI» AD ALBERO, DALLE PERSONE DEL REGISTRO (17/09/2026, Lavoro 2 PR 2)
//
//  La lista utenti non parte piu' dagli account: parte dalle persone di
//  quote_collaboratori. Una riga per persona, nome e numero RUI, l'ingranaggio
//  a destra che apre i tre gruppi di permessi (sezioni IAM, compagnie visibili
//  su Quoto, attivazione IAM). Una persona inserita in Collaboratori compare da
//  sola, INATTIVA finche' non ha un account. Niente password in chiaro: si
//  manda il collegamento per impostarla.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { sorgenteAttuale, stanza, ritaglia, esiti, deve, RADICE } from './banco.mjs';

const src = sorgenteAttuale();
const migrazione = fs.readFileSync(path.join(RADICE, '..', 'supabase', 'migrations', '20260917_utenti_compagnie.sql'), 'utf8');
const e = esiti('UTENTI AD ALBERO, DALLE PERSONE');

const PERSONE = [
  { id: 'p1', stato: 'attivo', nome: 'Anna', cognome: 'Bianchi', email: 'anna@x.it', rui_sezione: 'E', rui_numero: '000123', iam_id: 'u1' },
  { id: 'p2', stato: 'attivo', nome: 'Nuova', cognome: 'Persona', email: 'nuova@x.it', rui_numero: null, iam_id: null },
  { id: 'p3', stato: 'attivo', nome: 'Per', cognome: 'Email', email: 'mail@x.it', rui_sezione: 'A', rui_numero: '7', iam_id: null },
  { id: 'p4', stato: 'scartato', nome: 'Fuori', cognome: 'Gioco', email: 'fuori@x.it', iam_id: null },
];
const UTENTI = [
  { id: 'u1', nome: 'Anna', cognome: 'Bianchi', email: 'anna@x.it', ruolo: 'collaboratore', attivo: true, accesso_iam: true },
  { id: 'u2', nome: 'Per', cognome: 'Email', email: 'MAIL@x.it', ruolo: 'operatore', attivo: true, accesso_iam: false, accesso_quoto: false },
  { id: 'u3', nome: 'Solo', cognome: 'Account', email: 'solo@x.it', ruolo: 'admin', attivo: false },
];
const NOMI_LISTA = ['ruiPersona', 'righeUtenti', 'statoAccesso'];

e.prova('le funzioni della lista ad albero esistono in index.html', () => {
  const s = stanza(src, NOMI_LISTA);
  deve(!s.mancanti.length, 'mancano: ' + s.mancanti.join(', '));
  deve(ritaglia(src, 'renderUtenti') && ritaglia(src, 'caricaPersoneUtenti'), 'renderUtenti o caricaPersoneUtenti non si ritagliano');
  return NOMI_LISTA.join(', ');
});

e.prova('una riga per persona del registro: chi e\' appena stato inserito in Collaboratori c\'e\' gia\', senza account', () => {
  const s = stanza(src, NOMI_LISTA);
  const righe = s.ctx.righeUtenti(PERSONE, UTENTI);
  const nuova = righe.find(r => r.persona && r.persona.id === 'p2');
  deve(nuova, 'la persona senza account e\' sparita dalla lista');
  deve(nuova.utente === null && nuova.nome === 'Persona Nuova', 'la persona senza account non e\' una riga pulita: ' + JSON.stringify(nuova));
  deve(s.ctx.statoAccesso(nuova).testo === 'INATTIVO', 'una persona senza account deve risultare INATTIVA, non ' + s.ctx.statoAccesso(nuova).testo);
  deve(!righe.some(r => r.persona && r.persona.id === 'p4'), 'una persona scartata non deve stare nella lista utenti');
  return righe.length + ' righe, la nuova e\' INATTIVA, la scartata non c\'e\'';
});

e.prova('il numero RUI sta sulla riga, e viene dalla persona', () => {
  const s = stanza(src, NOMI_LISTA);
  deve(s.ctx.ruiPersona(PERSONE[0]) === 'RUI E n. 000123', 'RUI con sezione: ' + s.ctx.ruiPersona(PERSONE[0]));
  deve(s.ctx.ruiPersona(PERSONE[1]) === '', 'senza numero RUI deve restare vuoto');
  const righe = s.ctx.righeUtenti(PERSONE, UTENTI);
  deve(righe.find(r => r.persona && r.persona.id === 'p1').rui === 'RUI E n. 000123', 'la riga non porta il RUI della persona');
  return 'RUI E n. 000123 · vuoto se manca';
});

e.prova('l\'account si aggancia per iam_id, per email come ripiego, e chi non ha scheda NON sparisce', () => {
  const s = stanza(src, NOMI_LISTA);
  const righe = s.ctx.righeUtenti(PERSONE, UTENTI);
  const anna = righe.find(r => r.persona && r.persona.id === 'p1');
  deve(anna.utente && anna.utente.id === 'u1', 'iam_id non aggancia l\'account');
  const perEmail = righe.find(r => r.persona && r.persona.id === 'p3');
  deve(perEmail.utente && perEmail.utente.id === 'u2', 'il ripiego per email (senza badare alle maiuscole) non aggancia');
  const orfano = righe.find(r => r.utente && r.utente.id === 'u3');
  deve(orfano && orfano.senzaScheda === true && orfano.persona === null, 'l\'account senza persona e\' sparito o non e\' marcato');
  deve(righe.filter(r => r.utente && r.utente.id === 'u2').length === 1, 'l\'account agganciato per email compare due volte');
  return 'p1↔u1 per id, p3↔u2 per email, u3 marcato «senza scheda»';
});

e.prova('lo stato dice la verita\': sospeso, senza accessi, attivo', () => {
  const s = stanza(src, NOMI_LISTA);
  const righe = s.ctx.righeUtenti(PERSONE, UTENTI);
  const st = id => s.ctx.statoAccesso(righe.find(r => r.utente && r.utente.id === id)).testo;
  deve(st('u1') === 'ATTIVO', 'u1 dovrebbe essere ATTIVO: ' + st('u1'));
  deve(st('u2') === 'INATTIVO', 'account senza nessun accesso dovrebbe essere INATTIVO: ' + st('u2'));
  deve(st('u3') === 'SOSPESO', 'account con attivo=false dovrebbe essere SOSPESO: ' + st('u3'));
  return 'ATTIVO · INATTIVO · SOSPESO';
});

e.prova('la pagina Utenti e\' un albero con la lista dentro, e senza il tasto «Nuovo utente»', () => {
  deve(/<details class="card" id="utenti-albero"/.test(src), 'manca il nodo <details id="utenti-albero">');
  const albero = src.slice(src.indexOf('id="utenti-albero"'), src.indexOf('</details>', src.indexOf('id="utenti-albero"')));
  deve(/Lista utenti/.test(albero) && /id="utenti-list"/.test(albero) && /id="utenti-cerca"/.test(albero), 'dentro l\'albero mancano titolo, lista o ricerca');
  const render = ritaglia(src, 'renderUtenti');
  deve(!/apriNuovoUtente/.test(render) && /Collaboratori/.test(render), 'renderUtenti mostra ancora il tasto «Nuovo utente» o non rimanda a Collaboratori');
  deve(/apriPermessiUtente\(\$\{idArg\}, '\$\{esc\(r\.nome\)\}', \$\{personaArg\}\)/.test(render), 'l\'ingranaggio non porta persona e account');
  deve(/ut-ingranaggio/.test(render) && /ti-settings/.test(render), 'manca l\'ingranaggio sulla riga');
  return 'details + lista + ricerca; ingranaggio con persona; niente «Nuovo utente»';
});

e.prova('l\'ingranaggio apre i tre gruppi: sezioni IAM, compagnie su Quoto, attivazione IAM', () => {
  const f = ritaglia(src, 'apriPermessiUtente');
  deve(f, 'apriPermessiUtente non si ritaglia');
  deve(/gruppo\(1, 'Che cosa vede dentro IAM'/.test(f), 'manca il gruppo 1');
  deve(/gruppo\(2, 'Compagnie visibili su Quoto'/.test(f), 'manca il gruppo 2');
  deve(/gruppo\(3, 'Attivazione della piattaforma IAM'/.test(f), 'manca il gruppo 3');
  deve(/id="pu-comp-lista" data-compagnie=/.test(f) && /class="pu-comp" id="pu-comp-\$\{slugCompagnia\(c\)\}"/.test(f), 'le compagnie non sono spunte con nome stabile');
  deve(/id="pu-quoto"/.test(f) && /id="pu-iam"/.test(f) && /id="pu-comp-tutte"/.test(f), 'mancano gli interruttori accesso Quoto / accesso IAM / tutte le compagnie');
  deve(/mandaLinkPassword\('\$\{esc\(email\)\}'\)/.test(f), 'il gruppo 3 non manda il collegamento per la password');
  deve(/attivaAccessoPersona\('\$\{esc\(persona\.id\)\}'\)/.test(f) && /id="pu-ruolo-nuovo"/.test(f), 'per una persona senza account il gruppo 3 non attiva l\'accesso con il ruolo scelto');
  deve(!/apriNuovoUtente|Nuovo utente» in Collaboratori|password temporanea/.test(f), 'il gruppo 3 rimanda ancora alla creazione con password temporanea');
  deve(!/password:\s*['"`]/.test(f), 'nel pannello compare una password scritta');
  return 'tre gruppi, spunte compagnie con id stabile, collegamento password';
});

await e.provaAsync('«Attiva l\'accesso» chiede conferma e manda al server persona e ruolo: niente password nel browser', async () => {
  const chiamate = [];
  const s = stanza(src, ['attivaAccessoPersona'], {
    altro: {
      PERSONE_UTENTI: [{ id: 'p2', nome: 'Nuova', cognome: 'Persona', email: 'nuova@x.it' }],
      mailFetch: async (path, opts) => { chiamate.push({ path, opts }); return { ok: true, email: 'nuova@x.it' }; },
      renderUtenti: async () => {},
    },
  });
  deve(!s.mancanti.length, 'attivaAccessoPersona non si ritaglia');
  s.browser.elemento('pu-ruolo-nuovo').value = 'operatore';
  await s.ctx.attivaAccessoPersona('p2');
  deve(s.browser.detto.confirm.length === 1 && /nuova@x\.it/.test(s.browser.detto.confirm[0]), 'non chiede conferma dicendo a chi arriva il collegamento');
  deve(chiamate.length === 1 && chiamate[0].path === '/utenti/attiva' && chiamate[0].opts.method === 'POST', 'non chiama POST /utenti/attiva: ' + JSON.stringify(chiamate));
  const corpo = JSON.parse(chiamate[0].opts.body);
  deve(corpo.persona_id === 'p2' && corpo.ruolo === 'operatore' && !('password' in corpo), 'il corpo non porta persona e ruolo, o porta una password: ' + JSON.stringify(corpo));
  deve(s.browser.detto.alert.length === 1 && /collegamento/.test(s.browser.detto.alert[0]), 'non dice che il collegamento e\' partito');
  deve(!/nu-pass|creaNuovoUtente\(/.test(src), 'nel file c\'e\' ancora la creazione con password temporanea');
  return 'conferma → POST {persona_id, ruolo} → avviso';
});

await e.provaAsync('se il server rifiuta, la persona lo legge e la lista non cambia', async () => {
  const s = stanza(src, ['attivaAccessoPersona'], {
    altro: {
      PERSONE_UTENTI: [{ id: 'p2', nome: 'Nuova', cognome: 'Persona', email: 'nuova@x.it' }],
      mailFetch: async () => { throw new Error('Solo un amministratore può attivare un accesso.'); },
      renderUtenti: async () => { throw new Error('non doveva rileggere'); },
    },
  });
  await s.ctx.attivaAccessoPersona('p2');
  deve(s.browser.detto.alert.length === 1 && /amministratore/.test(s.browser.detto.alert[0]), 'il rifiuto del server non arriva a chi ha premuto: ' + JSON.stringify(s.browser.detto.alert));
  return 'il messaggio del server arriva intero';
});

e.prova('il collegamento per la password passa da Supabase e non porta nessuna password nel messaggio', () => {
  const f = ritaglia(src, 'mandaLinkPassword');
  deve(f, 'mandaLinkPassword non si ritaglia');
  deve(/db\.auth\.resetPasswordForEmail\(email, \{ redirectTo: location\.origin \+ '\/' \}\)/.test(f), 'non usa resetPasswordForEmail con il ritorno alla radice');
  deve(/confirm\(/.test(f), 'manda senza chiedere conferma');
  deve(!/generatePassword|Math\.random|password\s*=/.test(f), 'genera o scrive una password');
  return 'resetPasswordForEmail + redirectTo, con conferma';
});

await e.provaAsync('salvare scrive compagnie, accesso Quoto e accesso IAM solo per quello che il pannello ha mostrato', async () => {
  const utente = { id: 'u1', permessi: null, ruolo: 'collaboratore' };
  const s = stanza(src, ['salvaPermessiUtente', 'slugCompagnia'], {
    righeArchivio: [{ id: 'u1', ruolo: 'collaboratore' }],
    spunte: [],
    altro: {
      UTENTI_LISTA: [utente],
      permessiJson: () => ({}),
      moduliDi: () => null,
      PROFILI: {},
      dbRuolo: r => r,
      renderUtenti: async () => {},
      location: { origin: 'https://iam.finto' },
    },
  });
  deve(!s.mancanti.length, 'mancano: ' + s.mancanti.join(', '));
  const el = id => s.browser.elemento(id);
  el('pu-comp-lista').dataset = { compagnie: JSON.stringify(['HDI', 'Allianz Direct', 'UCA']) };
  el('pu-comp-tutte').checked = false;
  el('pu-comp-hdi').checked = true;
  el('pu-comp-allianz_direct').checked = false;
  el('pu-comp-uca').checked = true;
  el('pu-quoto').checked = true;
  el('pu-iam').checked = false;
  el('pu-attivo').checked = true;
  el('pu-ruolo').value = 'operatore';
  await s.ctx.salvaPermessiUtente('u1');
  const agg = s.archivio.stato.aggiornamenti.find(a => a.tabella === 'iam_utenti');
  deve(agg, 'nessun aggiornamento su iam_utenti');
  const p = agg.riga;
  deve(JSON.stringify(p.compagnie) === JSON.stringify(['HDI', 'UCA']), 'compagnie salvate male: ' + JSON.stringify(p.compagnie));
  deve(p.accesso_quoto === true && p.accesso_iam === false, 'accessi salvati male: ' + JSON.stringify([p.accesso_quoto, p.accesso_iam]));
  deve(p.ruolo === 'operatore', 'ruolo non salvato: ' + p.ruolo);
  return 'compagnie [HDI, UCA], quoto sì, iam no, ruolo operatore';
});

await e.provaAsync('«tutte le compagnie» salva null, e un interruttore spento dal pannello (disabled) non decide niente', async () => {
  const s = stanza(src, ['salvaPermessiUtente', 'slugCompagnia'], {
    righeArchivio: [{ id: 'u1', ruolo: 'collaboratore' }],
    spunte: [],
    altro: { UTENTI_LISTA: [{ id: 'u1' }], permessiJson: () => ({}), moduliDi: () => null, PROFILI: {}, dbRuolo: r => r, renderUtenti: async () => {} },
  });
  const el = id => s.browser.elemento(id);
  el('pu-comp-lista').dataset = { compagnie: JSON.stringify(['HDI']) };
  el('pu-comp-tutte').checked = true;
  el('pu-comp-hdi').checked = false;
  el('pu-iam').disabled = true; el('pu-iam').checked = false;   // e' l'admin stesso: non puo' chiudersi fuori
  el('pu-quoto').checked = true;
  await s.ctx.salvaPermessiUtente('u1');
  const p = s.archivio.stato.aggiornamenti.find(a => a.tabella === 'iam_utenti').riga;
  deve(p.compagnie === null, '«tutte» deve salvare null: ' + JSON.stringify(p.compagnie));
  deve(!('accesso_iam' in p), 'un interruttore disabilitato e\' finito nella patch: ' + JSON.stringify(p.accesso_iam));
  deve(p.accesso_quoto === true, 'accesso_quoto non salvato');
  return 'compagnie null, accesso_iam non toccato';
});

await e.provaAsync('senza il catalogo in pagina le compagnie non si toccano', async () => {
  const s = stanza(src, ['salvaPermessiUtente', 'slugCompagnia'], {
    righeArchivio: [{ id: 'u1' }],
    spunte: [],
    altro: { UTENTI_LISTA: [{ id: 'u1' }], permessiJson: () => ({}), moduliDi: () => null, PROFILI: {}, dbRuolo: r => r, renderUtenti: async () => {} },
  });
  await s.ctx.salvaPermessiUtente('u1');
  const p = s.archivio.stato.aggiornamenti.find(a => a.tabella === 'iam_utenti').riga;
  deve(!('compagnie' in p), 'senza catalogo la patch tocca le compagnie: ' + JSON.stringify(p.compagnie));
  return 'compagnie assenti dalla patch';
});

e.prova('la migrazione aggiunge iam_utenti.compagnie e la mette sotto la blindatura di u_update_self', () => {
  deve(/alter table public\.iam_utenti add column if not exists compagnie text\[\]/.test(migrazione), 'la colonna compagnie non viene aggiunta');
  deve(/create policy u_update_self on public\.iam_utenti/.test(migrazione), 'la policy u_update_self non viene ricreata');
  deve(/not \(compagnie\s+is distinct from \(select compagnie\s+from public\.iam_utenti where id = auth\.uid\(\)\)\)/.test(migrazione), 'compagnie non e\' fra le colonne che l\'utente non puo\' cambiarsi da solo');
  for (const col of ['ruolo', 'accesso_iam', 'accesso_quoto', 'permessi', 'profilo', 'prodotti', 'moduli']) {
    deve(new RegExp(`not \\(${col}\\s+is distinct from`).test(migrazione), 'la blindatura ha perso ' + col);
  }
  return 'colonna + policy con compagnie e le colonne di prima';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
