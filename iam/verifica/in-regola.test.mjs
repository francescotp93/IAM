// ═══════════════════════════════════════════════════════════════════════════════
//  IN REGOLA — chi è pronto, e cosa gli manca (M4)
//
//  L'ultimo gradino del percorso graduale. Le cose che devono restare vere non
//  sono di grafica:
//
//    1. NON SBLOCCA NIENTE DA SOLO. Sarebbe comodo far scattare i permessi
//       quando le tre spunte diventano verdi. Sarebbe anche il modo di dare il
//       preventivatore a qualcuno perché una data è cambiata di notte, senza
//       che nessuno lo abbia deciso. Da questa schermata non si scrive MAI su
//       iam_utenti: se un giorno qualcuno ci attacca una riga, questa prova
//       cade.
//
//    2. UN NUMERO NON È UNA VERIFICA. Art. 109 CAP: per conto di un
//       intermediario può operare solo chi è iscritto nella sezione E.
//       Chiunque può battere dieci cifre in una casella. La finestra chiede
//       cosa RISULTA SUL REGISTRO, non un sì/no, e porta il link per andarci.
//
//    3. I GUAI VENGONO PRIMA DELLE TRE SPUNTE. Finché due schede condividono
//       un'email o un numero RUI, nessuna delle tre si può risolvere — e sono
//       guai veri, con un nome e un cognome: al 11/09/2026 un numero RUI è su
//       due schede e due schede hanno la stessa email.
//
//    4. L'ELENCO NON SI LEGGE DALLA TABELLA. Passa da iam_collab_pronti(), che
//       gira nel database e non torna niente a chi non è staff: è l'elenco di
//       tutta la rete con dentro chi non è in regola.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

const NOMI = ['spuntaRegola', 'rigaInRegola', 'renderInRegola', 'apriVerificaRui',
              'salvaVerificaRui', 'aggiornaBadgeRegola'];

const SORGENTE = sorgenteAttuale();

const PRONTO = {
  team_id: 't1', nome: 'Angelo', cognome: 'Lombardo', email: 'a@email.it',
  utente_id: 'u-angelo', rui: 'E000662104', rui_sezione: 'E', rui_verificato_il: '2026-09-01',
  rui_ok: true, mandato_ok: true, mandato_il: '2026-09-02T10:00:00Z',
  ore_validate: 30, ore_richieste: 30, formazione_ok: true, pronto: true, guai: [],
};
const A_META = {
  ...PRONTO, team_id: 't2', nome: 'Sergio', cognome: 'Guida', email: 's@email.it',
  rui_sezione: null, rui_verificato_il: null, rui_ok: false,
  ore_validate: 12, formazione_ok: false, pronto: false, guai: [],
};
const CON_GUAI = {
  ...A_META, team_id: 't3', nome: 'Claudia', cognome: 'Romano', rui: 'E000749314',
  mandato_ok: false, ore_validate: 0,
  guai: ['Questo numero RUI risulta su più schede: un\'iscrizione è personale, una delle due è sbagliata.',
         'Nessun accesso IAM con questa email: non vede la sua area riservata.'],
};

function schermo({ righe = [] } = {}) {
  const chieste = [];
  const coda = {
    update(v) { chieste.push({ passo: 'update', v }); return coda; },
    eq(c, v) { chieste.push({ passo: 'eq', c, v }); return Promise.resolve({ error: null }); },
    select() { return coda; },
    then(ok) { return Promise.resolve({ data: righe, error: null }).then(ok); },
  };
  const db = {
    from(t) { chieste.push({ passo: 'from', t }); return coda; },
    rpc(n) { chieste.push({ passo: 'rpc', n }); return Promise.resolve({ data: righe, error: null }); },
    auth: { getSession: async () => ({ data: { session: { user: { id: 'io' } } } }) },
  };
  const s = stanza(SORGENTE, NOMI, {
    altro: {
      db, REGOLA: righe.slice(),
      IVASS_RUI: 'https://servizi.ivass.it/RuirPubblica/',
      mieDocsData: v => String(v || '').slice(0, 10),
      formOre: n => String(Number(n) || 0),
    },
  });
  s.chieste = chieste;
  s.el = id => s.browser.elemento(id);
  return s;
}

/* Il blocco M4, per le prove che guardano il codice invece del risultato: sono
   quelle che si accorgono di una scorciatoia aggiunta domani. Si aggancia al
   commento del BLOCCO, non a un testo che compare anche nel markup. */
function blocco() {
  const da = SORGENTE.indexOf('/* -- IN REGOLA (M4');
  const a  = SORGENTE.indexOf('/* ═══ LA MIA FORMAZIONE', da);
  deve(da > 0 && a > da, 'il blocco «In regola» non si trova più in index.html');
  return SORGENTE.slice(da, a);
}

const e = esiti('IN REGOLA');

/* ── 1. non sblocca niente da solo ──────────────────────────────────────── */

e.prova('da questa schermata non si aprono permessi a nessuno', () => {
  const b = blocco();
  deve(!/from\('iam_utenti'\)/.test(b),
    'la schermata tocca iam_utenti: aprirebbe accessi da sola');
  deve(!/accesso_iam|accesso_quoto/.test(b),
    'la schermata tocca i permessi di accesso: un collaboratore si ritroverebbe il preventivatore perché una data è cambiata di notte');
  deve(!/PERMESSI\s*\[/.test(b), 'la schermata riscrive i permessi');
});

await e.provaAsync('e lo dice a chi la guarda', async () => {
  /* Si guarda l'HTML che finisce a schermo, NON il sorgente: nel sorgente c'è
     anche il commento in cima al blocco, che dice la stessa cosa e farebbe
     passare la prova anche dopo aver tolto l'avviso alla persona. Una prova
     che legge un commento non prova niente di quello che si vede. */
  const s = schermo({ righe: [PRONTO] });
  await s.ctx.renderInRegola();
  const testo = s.el('regola-lista').innerHTML.replace(/<[^>]*>/g, ' ');
  deve(/non apre niente da sola|permessi si danno/i.test(testo),
    'la schermata non avvisa che i permessi vanno dati a mano: chi la usa penserà che le spunte verdi bastino');
});

/* ── 2. un numero non è una verifica ────────────────────────────────────── */

e.prova('la finestra chiede cosa risulta sul registro, non un sì o un no', () => {
  const b = blocco();
  const fin = b.slice(b.indexOf('function apriVerificaRui'), b.indexOf('async function salvaVerificaRui'));
  deve(/IVASS_RUI/.test(fin), 'non porta al registro IVASS: la verifica resterebbe una casella spuntata');
  deve(/Non risulta iscritto/.test(fin), 'non si può registrare che una persona NON risulta iscritta');
  deve(/sezione A|sezione B/.test(fin),
    'si può dire solo «sì» o «no»: la sezione è il dato da cui dipende se può operare per conto nostro');
  deve(/art\. 109/.test(fin), 'non dice perché solo la sezione E può lavorare per l\'agenzia');
});

e.prova('senza dire cosa risulta, non si registra niente', () => {
  const b = blocco();
  const salva = b.slice(b.indexOf('async function salvaVerificaRui'));
  deve(/if \(!sez\)/.test(salva), 'si può registrare una verifica senza averne fatta una');
  deve(/non è una verifica/i.test(salva), 'il messaggio non dice perché serve');
});

e.prova('e chi ha verificato lo scrive la pagina, ma la data è quella di oggi', () => {
  const b = blocco();
  const salva = b.slice(b.indexOf('async function salvaVerificaRui'));
  deve(/rui_verificato_da: io/.test(salva), 'non resta scritto chi ha fatto la verifica');
  deve(/new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(salva),
    'la data della verifica non è quella di oggi: si potrebbe antidatare');
});

e.prova('una verifica negativa si registra lo stesso', () => {
  /* «Cercato il tal giorno, non risulta iscritto» È una verifica fatta, ed è
     quella che serve poter mostrare. Scartarla lascerebbe la scheda come se
     nessuno avesse mai guardato. */
  const b = blocco();
  const salva = b.slice(b.indexOf('async function salvaVerificaRui'));
  deve(/rui_verificato_il:/.test(salva) && !/if \(sez === 'no'\) return/.test(salva),
    'un esito negativo non lascia traccia: la scheda sembra mai controllata');
});

/* ── 3. i guai vengono prima ────────────────────────────────────────────── */

e.prova('i guai si vedono, con la loro spiegazione', () => {
  const s = schermo();
  const html = s.ctx.rigaInRegola(CON_GUAI);
  deve(html.includes('RUI risulta su pi'), 'il guaio del RUI doppio non compare');
  deve(html.includes('non vede la sua area riservata'), 'il guaio dell\'accesso mancante non compare');
});

e.prova('e chi ha un guaio viene prima di tutti nell\'elenco', () => {
  /* È l'unica parte su cui si può agire oggi: chi è già pronto non chiede
     niente a nessuno, e in cima toglierebbe spazio. */
  const b = blocco();
  const ord = b.slice(b.indexOf('righe.sort('), b.indexOf('const pronti'));
  deve(/guai \|\| \[\]\)\.length \? 0/.test(ord), 'chi ha un guaio non viene messo per primo');
  deve(/pronto \? 2/.test(ord), 'chi è già pronto non viene spostato in fondo');
});

e.prova('le tre spunte si distinguono a colpo d\'occhio', () => {
  const s = schermo();
  const pronto = s.ctx.rigaInRegola(PRONTO);
  const meta = s.ctx.rigaInRegola(A_META);
  deve(/PRONTO/.test(pronto), 'chi è a posto non si riconosce');
  deve(!/PRONTO/.test(meta), 'chi non è a posto sembra pronto');
  deve(/Mandato/.test(meta) && /RUI sez\. E/.test(meta) && /Formazione/.test(meta),
    'non si vede quale delle tre manca');
  deve(/12\/30/.test(meta), 'non dice a che punto è con le ore');
});

e.prova('la data dell\'ultima verifica si vede', () => {
  const s = schermo();
  deve(/verificato il 2026-09-01/.test(s.ctx.rigaInRegola(PRONTO)),
    'non si sa di quando è la verifica: una di tre anni fa sembrerebbe fresca');
  deve(!/verificato il/.test(s.ctx.rigaInRegola(A_META)),
    'compare una data di verifica su chi non è mai stato verificato');
});

/* ── 4. l'elenco non si legge dalla tabella ─────────────────────────────── */

await e.provaAsync('l\'elenco passa dalla funzione del database', async () => {
  const s = schermo({ righe: [PRONTO, CON_GUAI] });
  await s.ctx.renderInRegola();
  deve(s.chieste.some(x => x.passo === 'rpc' && x.n === 'iam_collab_pronti'),
    'non chiama iam_collab_pronti: ' + JSON.stringify(s.chieste));
  deve(!s.chieste.some(x => x.passo === 'from' && x.t === 'iam_team'),
    'legge iam_team direttamente invece della funzione che filtra sullo staff');
});

await e.provaAsync('e il riepilogo dice quanti sono pronti e quanti hanno un guaio', async () => {
  const s = schermo({ righe: [PRONTO, A_META, CON_GUAI] });
  await s.ctx.renderInRegola();
  const html = s.el('regola-lista').innerHTML;
  const testo = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  deve(/1 su 3/.test(testo), 'il conto dei pronti non torna: ' + testo.slice(0, 140));
  deve(/qualcosa da sistemare/.test(testo), 'non dice quanti hanno un guaio');
  deve(/ 1 hanno prima/.test(testo), 'il conto dei guai non torna: ' + testo.slice(0, 160));
});

await e.provaAsync('la linguetta porta il numero di chi ha un guaio', async () => {
  /* Il numero accanto alla voce è il motivo per cui uno ci clicca: se contasse
     i pronti, direbbe che va tutto bene proprio quando non va.
     DUE pronti e UN guaio, di proposito: con uno e uno i due conteggi
     coincidono e la prova passerebbe anche contando la cosa sbagliata. */
  const altroPronto = { ...PRONTO, team_id: 't9', cognome: 'Alfano' };
  const s = schermo({ righe: [PRONTO, altroPronto, CON_GUAI] });
  await s.ctx.renderInRegola();
  deve(s.el('op-n-regola').textContent === '1',
    'il contatore non conta i guai, ne conta altro: ' + s.el('op-n-regola').textContent);
});

await e.provaAsync('se il database non risponde lo dice, invece di restare a caricare', async () => {
  const s = stanza(SORGENTE, NOMI, {
    altro: {
      db: { rpc: async () => ({ data: null, error: { message: 'connessione persa' } }) },
      REGOLA: [], mieDocsData: v => v, formOre: n => String(n),
    },
  });
  await s.ctx.renderInRegola();
  const html = s.browser.elemento('regola-lista').innerHTML;
  deve(!/Caricamento/.test(html), 'resta «Caricamento…» per sempre');
  deve(/Riprova|Non riesco/i.test(html), 'non dice cosa è successo');
  deve(!/connessione persa/.test(html), 'sbatte in faccia il messaggio tecnico del database');
});

/* ── 5. la sezione è raggiungibile ──────────────────────────────────────── */

e.prova('c\'è una linguetta che la apre, e apre la cosa giusta', () => {
  deve(/opSezione\('regola'\)/.test(SORGENTE), 'nessuna linguetta apre «In regola»');
  deve(/id="op-pane-regola"/.test(SORGENTE), 'il riquadro non c\'è');
  deve(/id="regola-lista"/.test(SORGENTE), 'manca il posto dove finisce l\'elenco');
  const sw = SORGENTE.slice(SORGENTE.indexOf('function opSezione'), SORGENTE.indexOf('function contaSezioni'));
  deve(/'regola'/.test(sw), 'opSezione non conosce la sezione nuova: resterebbe visibile sopra le altre');
  deve(/renderInRegola\(\)/.test(sw), 'aprendola non si carica niente');
});

e.prova('tutte le funzioni che servono sono ancora in index.html', () => {
  const s = schermo();
  deve(s.mancanti.length === 0, 'non si trovano più: ' + s.mancanti.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
