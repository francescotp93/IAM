// ═══════════════════════════════════════════════════════════════════════════════
//  IL REGISTRO DELLA FORMAZIONE
//
//  Reg. IVASS 40/2018 chiede due cose diverse, e confonderle è il primo modo
//  di sbagliare: 60 ore PRIMA dell'iscrizione al RUI (art. 88, una volta) e 30
//  ore OGNI ANNO di aggiornamento (art. 89). Solo le seconde fanno il conto
//  annuale.
//
//  Le cose che devono restare vere qui dentro:
//
//    1. ORE DICHIARATE E ORE VALIDATE NON SI SOMMANO MAI. Davanti a
//       un'ispezione valgono solo le seconde. Un riquadro che le sommasse
//       direbbe «30 su 30» a chi non ha ancora consegnato un attestato — è
//       esattamente l'informazione che fa stare tranquilli sbagliando.
//
//    2. CHI DICHIARA NON VALIDA. La pagina non manda mai `stato`, e i tasti
//       Valida/Respingi esistono solo nella schermata dell'agenzia. Il vero
//       blocco non è qui — è un trigger nel database, provato a parte da
//       supabase/verifica/formazione-permessi.sql nel repository QUOTE — ma
//       una pagina che ci provasse comunque sarebbe un difetto da trovare.
//
//    3. RESPINGERE VUOLE UN MOTIVO. Senza, la persona resta a indovinare e la
//       volta dopo ridichiara la stessa identica cosa.
//
//    4. L'ATTESTATO NON HA UN INDIRIZZO PUBBLICO. Porta nome, cognome e data
//       di nascita: sta in un deposito chiuso, e si apre con un indirizzo
//       firmato che scade. Se qualcuno ci mette getPublicUrl, questa prova
//       cade.
//
//    5. LE 60 ORE INIZIALI NON FANNO NUMERO OGNI ANNO.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'formStato', 'formOre', 'schedaSaldo', 'schedaFormazione',
  'caricaMiaFormazione', 'salvaNuovaFormazione', 'giudicaFormazione',
  'renderFormazioneCollab', 'apriNuovaFormazione',
];

const SORGENTE = sorgenteAttuale();

const CORSO = {
  id: 'k1', anno: 2026, tipo: 'aggiornamento', ore: 12, titolo: 'Aggiornamento rami danni',
  ente: 'Ente accreditato', modalita: 'aula', svolto_dal: '2026-03-02', svolto_al: '2026-03-03',
  attestato_url: 'utente-1/1234-attestato.pdf', stato: 'dichiarata', nota: null,
};
const VALIDATO = { ...CORSO, id: 'k2', ore: 18, stato: 'validata', titolo: 'Corso verificato' };
const RESPINTO = { ...CORSO, id: 'k3', stato: 'respinta', titolo: 'Corso respinto', nota: "L'attestato non riporta le ore." };
const INIZIALE = { ...CORSO, id: 'k4', tipo: 'iniziale', ore: 60, titolo: 'Corso 60 ore', stato: 'validata' };

function schermo({ corsi = [], saldi = [] } = {}) {
  const chieste = [];
  const coda = {
    select(c) { chieste.push({ passo: 'select', c }); return coda; },
    eq(campo, val) { chieste.push({ passo: 'eq', campo, val }); return coda; },
    order(campo) { chieste.push({ passo: 'order', campo }); return coda; },
    update(v) { chieste.push({ passo: 'update', v }); return coda; },
    delete() { chieste.push({ passo: 'delete' }); return coda; },
    insert(v) { chieste.push({ passo: 'insert', v }); return Promise.resolve({ error: null }); },
    then(ok) { return Promise.resolve({ data: corsi, error: null }).then(ok); },
  };
  const db = {
    from(t) { chieste.push({ passo: 'from', t }); return coda; },
    rpc(n) { chieste.push({ passo: 'rpc', n }); return Promise.resolve({ data: saldi, error: null }); },
    auth: { getSession: async () => ({ data: { session: { user: { id: 'utente-1' } } } }) },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://firmato/x' }, error: null }) }) },
  };
  const s = stanza(SORGENTE, NOMI, {
    altro: {
      db, TEAM: [], FORM_MODALITA: { aula: 'In aula', elearning: 'E-learning', webinar: 'Webinar', altro: 'Altro' },
      mieDocsData: v => String(v || '').slice(0, 10),
      confirm: () => true,
    },
  });
  s.chieste = chieste;
  s.el = id => s.browser.elemento(id);
  return s;
}

const e = esiti('REGISTRO DELLA FORMAZIONE');

/* ── 1. dichiarate e validate non si sommano ────────────────────────────── */

e.prova('il saldo mostra le ore verificate, non il totale', () => {
  const s = schermo();
  // 12 verificate, 18 ancora da controllare, su 30 richieste
  const html = s.ctx.schedaSaldo({ anno: 2026, ore_validate: 12, ore_dichiarate: 18, ore_richieste: 30 });
  deve(/12 di 30 ore verificate/.test(html),
    'non dice quante ne sono state verificate: ' + html.replace(/<[^>]*>/g, ' ').slice(0, 120));
  deve(!/30 di 30/.test(html),
    'somma le dichiarate con le validate: direbbe «a posto» a chi non ha ancora consegnato un attestato');
  deve(/mancano/i.test(html), 'non dice che ne mancano');
  deve(/non fanno numero|finché non/i.test(html),
    'non spiega che le ore in attesa non contano ancora');
});

e.prova('e quando sono davvero tutte verificate lo dice', () => {
  const s = schermo();
  const html = s.ctx.schedaSaldo({ anno: 2026, ore_validate: 30, ore_dichiarate: 0, ore_richieste: 30 });
  deve(/a posto/i.test(html), 'non dice che è a posto: ' + html.replace(/<[^>]*>/g, ' ').slice(0, 120));
  deve(!/mancano/i.test(html), 'dice che mancano ore a chi le ha tutte');
});

e.prova('le ore in attesa non riempiono la barra come quelle verificate', () => {
  /* Due colori diversi, e quello delle verificate viene per primo: una barra
     sola farebbe sembrare finito quello che non lo è. */
  const s = schermo();
  const html = s.ctx.schedaSaldo({ anno: 2026, ore_validate: 0, ore_dichiarate: 30, ore_richieste: 30 });
  deve(/width:0%/.test(html), 'la barra delle verificate è piena pur essendo zero');
});

/* ── 2. chi dichiara non valida ─────────────────────────────────────────── */

e.prova('la pagina non manda mai «stato» quando registra un corso', () => {
  const src = SORGENTE.slice(SORGENTE.indexOf('async function salvaNuovaFormazione'),
                             SORGENTE.indexOf('async function eliminaFormazione'));
  deve(src.length > 200, 'la funzione che registra un corso non si trova più');
  const insert = src.slice(src.indexOf('.insert('));
  deve(!/\bstato\s*:/.test(insert),
    'manda lo stato insieme al corso: chi dichiara non deve poter decidere se è valido');
  deve(!/validata_da|validata_il/.test(insert), 'prova a scrivere il timbro della validazione');
});

e.prova('e nemmeno quando valida lo staff lo scrive a mano', () => {
  const src = SORGENTE.slice(SORGENTE.indexOf('async function giudicaFormazione'),
                             SORGENTE.indexOf('function campoForm'));
  deve(src.length > 200, 'la funzione che valida non si trova più');
  deve(!/validata_da\s*:/.test(src),
    'il timbro lo scrive la pagina: potrebbe dire il nome di qualcun altro');
});

e.prova('i tasti Valida e Respingi non esistono nell\'area del collaboratore', () => {
  const mia = SORGENTE.slice(SORGENTE.indexOf('function schedaFormazione(f)'),
                             SORGENTE.indexOf('async function apriAttestato'));
  deve(mia.length > 200, 'la scheda del collaboratore non si trova più');
  deve(!/giudicaFormazione/.test(mia), 'dalla propria area si può validare o respingere');
  deve(!/>Valida</.test(mia), 'c\'è un tasto Valida nella propria area');
});

e.prova('la scheda dice a chi la guarda che l\'agenzia deve ancora controllare', () => {
  const s = schermo();
  deve(/In attesa di verifica/.test(s.ctx.schedaFormazione(CORSO)),
    'un corso appena dichiarato sembra già a posto');
  deve(/Verificata/.test(s.ctx.schedaFormazione(VALIDATO)), 'un corso verificato non si distingue');
});

/* ── 3. respingere vuole un motivo ──────────────────────────────────────── */

e.prova('senza motivo non si respinge', () => {
  const src = SORGENTE.slice(SORGENTE.indexOf('async function giudicaFormazione'),
                             SORGENTE.indexOf('function campoForm'));
  deve(/nota\)\.trim\(\)\.length\s*<\s*5|trim\(\)\.length < 5/.test(src),
    'si può respingere senza spiegare perché: la persona ridichiarerà la stessa cosa');
  deve(/ridichiarer|indovinare/i.test(src), 'il messaggio non dice perché il motivo serve');
});

e.prova('e il motivo lo legge chi è stato respinto', () => {
  const s = schermo();
  const html = s.ctx.schedaFormazione(RESPINTO);
  deve(html.includes('non riporta le ore'), 'il motivo non compare nella scheda');
  deve(/Respinta/.test(html), 'non si vede che è stata respinta');
});

/* ── 4. l'attestato non ha un indirizzo pubblico ────────────────────────── */

e.prova('l\'attestato si apre con un indirizzo firmato che scade', () => {
  const src = SORGENTE.slice(SORGENTE.indexOf('async function apriAttestato'),
                             SORGENTE.indexOf('async function caricaMiaFormazione'));
  deve(/createSignedUrl/.test(src), 'l\'attestato non passa da un indirizzo firmato');
  deve(!/getPublicUrl/.test(src),
    'l\'attestato ha un indirizzo pubblico: porta nome, cognome e data di nascita di una persona');
  deve(/from\('formazione'\)/.test(src), 'non legge dal deposito chiuso della formazione');
});

e.prova('e si carica dentro la propria cartella', () => {
  /* E' cosi' che le regole del deposito riconoscono che il file e' tuo:
     scritto altrove verrebbe rifiutato, o peggio finirebbe dove lo legge un
     altro. */
  const src = SORGENTE.slice(SORGENTE.indexOf('async function salvaNuovaFormazione'),
                             SORGENTE.indexOf('async function eliminaFormazione'));
  deve(/mio \+ '\/'/.test(src), 'il file non finisce nella cartella di chi lo carica');
  deve(/replace\(\/\[\^a-zA-Z0-9\._-\]\/g/.test(src),
    'il nome del file non viene ripulito: uno spazio o un apostrofo in un percorso fa danni silenziosi');
});

e.prova('senza attestato la scheda lo dice, invece di tacere', () => {
  const s = schermo();
  const senza = { ...CORSO, attestato_url: null };
  deve(/non può verificar/i.test(s.ctx.schedaFormazione(senza)),
    'un corso senza attestato sembra completo');
  deve(/Attestato/.test(s.ctx.schedaFormazione(CORSO)), 'l\'attestato non è raggiungibile');
});

/* ── 5. le 60 ore iniziali ──────────────────────────────────────────────── */

e.prova('la formazione iniziale si distingue, e dice di non contare ogni anno', () => {
  const s = schermo();
  const html = s.ctx.schedaFormazione(INIZIALE);
  deve(/iniziale/.test(html), 'non si distingue dalle ore annuali');
  deve(/art\. 88/.test(html), 'non dice quale obbligo è');
  deve(/non entrano nel conto annuale/i.test(html),
    'sembra che le 60 ore iniziali valgano per l\'aggiornamento di quell\'anno');
});

/* ── 6. il caricamento ──────────────────────────────────────────────────── */

await e.provaAsync('il registro si legge dalla tabella giusta, con il suo saldo', async () => {
  const s = schermo({ corsi: [CORSO], saldi: [{ anno: 2026, ore_validate: 0, ore_dichiarate: 12, ore_richieste: 30 }] });
  await s.ctx.caricaMiaFormazione();
  deve(s.chieste.some(x => x.passo === 'from' && x.t === 'iam_formazione'), 'non legge il registro');
  deve(s.chieste.some(x => x.passo === 'rpc' && x.n === 'iam_mia_formazione_saldo'), 'non chiede il saldo');
  deve(/Aggiornamento rami danni/.test(s.el('mform-lista').innerHTML), 'il corso non compare');
  deve(/2026/.test(s.el('mform-saldo').innerHTML), 'il saldo non compare');
});

await e.provaAsync('e non filtra per utente: ci pensa il database', async () => {
  /* Un filtro `utente_id = io` scritto qui sembrerebbe prudenza, ma darebbe
     l'impressione che sia LUI a proteggere le righe altrui. Non è così: la
     policy lo fa nel database. Scriverlo qui farebbe credere che togliendolo
     non succeda niente. */
  const s = schermo({ corsi: [CORSO] });
  await s.ctx.caricaMiaFormazione();
  deve(!s.chieste.some(x => x.passo === 'eq' && x.campo === 'utente_id'),
    'filtra per utente nella pagina: sembrerebbe che la protezione stia qui');
});

await e.provaAsync('senza corsi non sembra un guasto', async () => {
  const s = schermo({ corsi: [], saldi: [] });
  await s.ctx.caricaMiaFormazione();
  const html = s.el('mform-lista').innerHTML;
  deve(!/Caricamento/.test(html), '«Caricamento…» resta a schermo per sempre');
  deve(/Non hai ancora registrato/.test(html), 'non dice che è normale non averne');
  deve(/attestato/i.test(html), 'non dice cosa serve fare');
});

/* ── 7. non restano due elenchi con lo stesso nome ──────────────────────── */

e.prova('la vecchia «Ore formazione» dentro iam_team non c\'è più', () => {
  /* Era un elenco JSON `anni` che scriveva solo lo staff: su 12 schede era
     pieno ZERO volte. Lasciarla accanto al registro vero vorrebbe dire due
     elenchi con lo stesso nome, e si finisce a guardare quello sbagliato. */
  deve(!/function addAnno\(/.test(SORGENTE), 'la vecchia schermata delle ore è ancora lì');
  deve(!/function renderAnni\(/.test(SORGENTE), 'il vecchio elenco si disegna ancora');
  deve(!/function addFormazFile\(/.test(SORGENTE), 'si caricano ancora file nel vecchio elenco');
  deve(/renderFormazioneCollab\(TEAM_ID/.test(SORGENTE),
    'la scheda dello staff non mostra il registro nuovo');
});

e.prova('ma salvare una scheda non cancella la vecchia colonna', () => {
  /* Toglierla dal database è una decisione a parte: qui si evita solo che
     un salvataggio la svuoti di nascosto. */
  deve(/anni: /.test(SORGENTE), 'il salvataggio ha smesso di conservare la colonna `anni`');
});

e.prova('tutte le funzioni che servono sono ancora in index.html', () => {
  const s = schermo();
  deve(s.mancanti.length === 0, 'non si trovano più: ' + s.mancanti.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
