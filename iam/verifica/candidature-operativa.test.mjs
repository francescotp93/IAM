// ═══════════════════════════════════════════════════════════════════════════════
//  CANDIDATURE E BLACK LIST IN OPERATIVA (§2.6)
//
//  Tre viste sulla stessa tabella quote_collaboratori, divise per stato. Le
//  cose che devono restare vere non sono di grafica:
//
//    1. Una candidatura non e' un accesso. Da questa sezione non si scrive mai
//       su iam_utenti: chi arriva dal modulo pubblico resta una scheda, e le
//       credenziali le apre una persona, dopo il colloquio. Se un giorno
//       qualcuno ci attacca una scrittura sugli utenti, questa prova cade.
//
//    2. La black list vuole un motivo, e una scadenza. Il motivo e' un dato
//       personale che l'interessato ha diritto di leggere (art. 15 GDPR):
//       niente motivo, niente black list. E una black list senza scadenza e'
//       un giudizio negativo conservato per sempre — indifendibile.
//
//    3. Togliere qualcuno dalla black list non cancella la storia. Il motivo
//       precedente diventa una nota interna: chi riapre la scheda fra un anno
//       deve poter sapere che una decisione c'era stata, e quale.
//
//  In piu': i contatori delle linguette non devono rompersi quando l'elenco
//  non c'e' ancora — e' il caso del primissimo avvio.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'opSezione', 'contaSezioni', 'candFiltrate', 'schedaCandidatura', 'schedaNera',
  'candSezioneRui', 'candData', 'candCampo', 'candIniziali', 'candNomeCompleto',
  'bloccoNoteCollab', 'slugRif', 'aggiornaLinkCandidatura',
];
// `esc` NON si ritaglia: in index.html ce n'e' piu' d'una e l'estrattore ne
// prende una spezzata («Missing catch or finally»). Il banco ne fornisce gia'
// una fedele, la stessa della pagina: si usa quella.

const CANDIDATO = {
  id: 'k1', nome: 'Salvatore', cognome: 'Randazzo', email: 's.randazzo@email.it',
  telefono: '333 4187260', citta: 'Bagheria', provincia: 'PA', stato: 'candidato',
  rui_sezione: 'E', rui_numero: 'E000418772', fonte: 'sito:militello-9f2a',
  messaggio: 'Otto anni nei rami danni.', contatto_il: '2026-09-10',
  privacy_versione: '2026-09', privacy_accettata_il: '2026-09-10T09:14:00Z',
  conservare_fino_al: '2028-09-10',
};
const IN_NERA = {
  id: 'k9', nome: 'Pietro', cognome: 'Cangialosi', email: 'p.c@email.it',
  citta: 'Palermo', provincia: 'PA', stato: 'blacklist',
  blacklist_motivo: 'Si è presentato ai clienti come nostro collaboratore prima di qualunque accordo.',
  blacklist_il: '2026-07-22T10:00:00Z', blacklist_ricontrollo: '2028-07-22',
};

function schermo(elenco) {
  return stanza(sorgenteAttuale(), NOMI, {
    altro: {
      COLLAB_LEAD: elenco,
      CAND_NOTE: {},
      CAND_LINK_BASE: 'https://quoto.withusassicurazioni.it/candidatura.html',
      OP_SEZIONE: 'collab',
      db: null,
    },
  });
}

const e = esiti('CANDIDATURE IN OPERATIVA');

/* ── 1. una candidatura non e' un accesso ───────────────────────────────── */

e.prova('la sezione non scrive mai su iam_utenti', () => {
  /* Si guarda il codice, non il comportamento: e' l'unico modo di accorgersi
     che qualcuno ci ha attaccato una scrittura sugli utenti, e sarebbe il modo
     piu' rapido di trasformare una candidatura in un accesso per sbaglio. */
  const src = sorgenteAttuale();
  const da = src.indexOf('CANDIDATURE E BLACK LIST');
  const a  = src.indexOf('function renderTeam()', da);
  deve(da > 0 && a > da, 'il blocco delle candidature non si trova più in index.html');
  const blocco = src.slice(da, a);
  deve(!/from\('iam_utenti'\)/.test(blocco),
    'la sezione candidature tocca iam_utenti: da qui non si aprono accessi');
  deve(!/accesso_iam|accesso_quoto/.test(blocco),
    'la sezione candidature tocca i permessi di accesso');
});

e.prova('e la scheda lo dice a chi la guarda', () => {
  const s = schermo([CANDIDATO]);
  const html = s.ctx.schedaCandidatura(CANDIDATO);
  deve(/Nessun accesso a IAM/i.test(html),
    'la scheda non avvisa che da qui non si aprono credenziali');
});

/* ── 2. quello che la scheda mostra ─────────────────────────────────────── */

e.prova('la scheda mostra la presa visione e la data di cancellazione', () => {
  const s = schermo([CANDIDATO]);
  const html = s.ctx.schedaCandidatura(CANDIDATO);
  deve(/Presa visione/.test(html), 'non dice se ha visto l\'informativa');
  deve(/2026-09|v\. 2026-09/.test(html), 'non dice quale versione ha visto');
  deve(/Da cancellare entro/.test(html), 'non dice entro quando va cancellata');
  deve(/10\/09\/2028/.test(html), 'la data di cancellazione non compare: ' + (html.match(/entro[^<]*<[^>]*>[^<]*/) || [''])[0]);
});

e.prova('e dice chi ha portato chi', () => {
  const s = schermo([CANDIDATO]);
  deve(/Link di militello-9f2a/.test(s.ctx.schedaCandidatura(CANDIDATO)),
    'non si vede da quale link è arrivata');
  const senza = { ...CANDIDATO, fonte: 'sito' };
  deve(/Modulo pubblico/.test(s.ctx.schedaCandidatura(senza)),
    'senza riferimento non dice nemmeno che arriva dal modulo');
});

e.prova('chi non è iscritto al RUI si vede a colpo d\'occhio', () => {
  const s = schermo([CANDIDATO]);
  const nonIscritto = { ...CANDIDATO, rui_sezione: null, rui_numero: null };
  deve(/Non ancora iscritto/.test(s.ctx.candSezioneRui(nonIscritto)),
    'un non iscritto sembra iscritto');
  deve(/Sezione E/.test(s.ctx.candSezioneRui(CANDIDATO)), 'la sezione E non si vede');
});

/* ── 3. le sezioni ──────────────────────────────────────────────────────── */

e.prova('ogni sezione pesca solo il suo stato', () => {
  const s = schermo([CANDIDATO, IN_NERA, { id: 'a1', stato: 'attivo', nome: 'A', cognome: 'B' }]);
  deve(s.ctx.candFiltrate('candidato').length === 1, 'la sezione candidature pesca anche altro');
  deve(s.ctx.candFiltrate('blacklist').length === 1, 'la black list pesca anche altro');
  deve(s.ctx.candFiltrate('candidato')[0].id === 'k1', 'ha pescato la scheda sbagliata');
});

e.prova('i contatori reggono anche prima che l\'elenco arrivi', () => {
  /* Al primissimo avvio COLLAB_LEAD non c'e' ancora. Contare li' non deve
     buttare giu' l'apertura della schermata. */
  const s = stanza(sorgenteAttuale(), NOMI, { altro: { db: null } });
  s.ctx.contaSezioni();          // non deve tirare eccezioni
  const conElenco = schermo([CANDIDATO, IN_NERA]);
  conElenco.ctx.contaSezioni();
});

/* ── 4. la black list ───────────────────────────────────────────────────── */

e.prova('la scheda nera mostra il motivo e la scadenza', () => {
  const s = schermo([IN_NERA]);
  const html = s.ctx.schedaNera(IN_NERA);
  deve(/Perché è in black list/.test(html), 'non dice perché ci è finito');
  deve(html.includes('come nostro collaboratore'), 'il motivo non compare');
  deve(/Da ridiscutere entro/.test(html), 'non dice entro quando va ridiscussa');
  deve(/22\/07\/2028/.test(html), 'la data di ricontrollo non compare');
});

e.prova('una scadenza già passata si vede', () => {
  const s = schermo([IN_NERA]);
  const vecchia = { ...IN_NERA, blacklist_ricontrollo: '2020-01-01' };
  deve(/è passata/.test(s.ctx.schedaNera(vecchia)),
    'una black list scaduta sembra ancora in corso: la scadenza diventa un pro forma');
});

e.prova('il motivo non si può saltare, e la finestra lo spiega', () => {
  const src = sorgenteAttuale();
  const conf = src.slice(src.indexOf('async function confermaBlackList'), src.indexOf('async function candTogliDaNera'));
  deve(/motivo\.length\s*<\s*15/.test(conf), 'la motivazione non è più obbligatoria');
  deve(/blacklist_ricontrollo/.test(conf), 'la data di ricontrollo non viene salvata');
  const finestra = src.slice(src.indexOf('id="bl-modale"'), src.indexOf('id="gl-modale"'));
  deve(/un fatto, non un giudizio/i.test(finestra),
    'la finestra non avvisa più su come si scrive la motivazione: è l\'unico punto in cui il testo lo scrive una persona');
  deve(/art\. 15|diritto di chiederci/i.test(finestra),
    'la finestra non dice che l\'interessato ha diritto di leggerla');
});

e.prova('togliere dalla black list non cancella la storia', () => {
  const src = sorgenteAttuale();
  const togli = src.slice(src.indexOf('async function candTogliDaNera'), src.indexOf('function slugRif'));
  deve(/quote_collaboratori_note/.test(togli),
    'il motivo precedente sparisce senza lasciare traccia');
  deve(/Motivo precedente/.test(togli), 'la nota non riporta il motivo di prima');
  deve(/blacklist_motivo:\s*null/.test(togli), 'lo stato nero non viene ripulito');
});

/* ── 5. il link ─────────────────────────────────────────────────────────── */

e.prova('il codice del link non porta dentro caratteri strani', () => {
  const s = schermo([]);
  const slug = s.ctx.slugRif({ id: 'a1b2c3d4-e5f6', cogn: 'D\'Amico Lo Rè' });
  deve(/^[a-z0-9-]+$/.test(slug), 'lo slug porta caratteri da ripulire: ' + slug);
  deve(slug.includes('amico'), 'lo slug non somiglia più al cognome: ' + slug);
});

e.prova('due omonimi non si prendono il link a vicenda', () => {
  const s = schermo([]);
  const uno  = s.ctx.slugRif({ id: 'aaaa1111', cogn: 'Rossi' });
  const due  = s.ctx.slugRif({ id: 'bbbb2222', cogn: 'Rossi' });
  deve(uno !== due, 'due Rossi diversi generano lo stesso link: ' + uno);
});

e.prova('il link generico non si porta dietro un riferimento vuoto', () => {
  const s = stanza(sorgenteAttuale(), NOMI, {
    altro: {
      CAND_LINK_BASE: 'https://quoto.withusassicurazioni.it/candidatura.html',
      db: null,
      document: {
        getElementById: (id) => ({
          value: id === 'gl-chi' ? '' : '',
          set href(v) { this._href = v; }, get href() { return this._href; },
        }),
      },
    },
  });
  s.ctx.aggiornaLinkCandidatura();   // non deve tirare eccezioni
});

e.prova('tutte le funzioni che servono sono ancora in index.html', () => {
  const s = schermo([]);
  deve(s.mancanti.length === 0, 'non si trovano più: ' + s.mancanti.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
