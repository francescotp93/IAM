// ═══════════════════════════════════════════════════════════════════════════════
//  LA COPIA DI iam_team NEL BROWSER
//
//  Il 10/09/2026 le policy di iam_team sono state chiuse allo staff. Fino a
//  quel giorno l'unica policy era `auth.uid() IS NOT NULL`: chiunque avesse un
//  accesso IAM leggeva e scriveva ogni riga — IBAN, codici fiscali, tabelle
//  provvigionali, fatture e note interne di tutta la rete. E non era teorico:
//  esisteva gia' un account con ruolo 'collaboratore' e accesso_iam = true.
//
//  Chiudere le policy pero' non basta, ed e' il motivo di questo file.
//  loadTeam() rilegge da localStorage, dove saveTeam() ha scritto a ogni login
//  precedente: sul computer del collaboratore quella copia c'e' gia', e nessuna
//  regola del database puo' raggiungerla. Ce la toglie solo il codice.
//
//  Le tre cose che devono restare vere:
//    1. chi non e' staff non legge la copia, e la copia sparisce;
//    2. non si riscrive al primo salvataggio, altrimenti torna com'era;
//    3. quando non si SA ancora chi e' l'utente non si cancella niente —
//       altrimenti si butterebbe via la copia di un amministratore proprio
//       quando gli serve, cioe' quando il database non risponde.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

// mergeTeamFatture passa da loadFattureStore: senza, tira un'eccezione che il
// catch di loadTeam scambierebbe per «memoria illeggibile», azzerando TEAM e
// facendo passare per verdi anche i casi che non lo sono.
const NOMI = ['eStaffLocale', 'scordaTeamLocale', 'loadTeam', 'saveTeam',
              'mergeTeamFatture', 'loadFattureStore'];

// La rete come sta nella memoria del browser: due schede, con l'IBAN dentro.
const RETE = [
  { id: 'c1', nome: 'Rosalia', cogn: 'Militello', iban1: 'IT60X0542811101000000123456', fatture: [] },
  { id: 'c2', nome: 'Davide',  cogn: 'Ingrassia', iban1: 'IT60X0542811101000000654321', fatture: [] },
];

/* `canonRuolo` vive accanto alla costante LEGACY_RUOLI e non si ritaglia: qui
   si passa la stessa mappatura che usa la pagina. `profilo: null` significa
   profilo non ancora arrivato — e va passato da `altro`, che ha l'ultima
   parola sul contesto. */
function scheda(profilo) {
  return stanza(sorgenteAttuale(), NOMI, {
    memoria: { iam_team: JSON.stringify(RETE) },
    altro: {
      TEAM: [],
      TEAM_FATTURE: [],
      PROFILO: profilo,
      canonRuolo: r => ({ top_master: 'admin', master: 'operatore', operativo: 'collaboratore' }[r] || r || 'collaboratore'),
    },
  });
}
const copiaPresente = s => s.browser.mem.has('iam_team');

const e = esiti('COPIA LOCALE DI iam_team');

/* ── 1. chi non e' staff ─────────────────────────────────────────────────── */

e.prova('al collaboratore la copia non si apre, e sparisce dal browser', () => {
  const s = scheda({ ruolo: 'collaboratore' });
  s.ctx.loadTeam();
  deve(Array.isArray(s.ctx.TEAM) && s.ctx.TEAM.length === 0,
    'il collaboratore si ritrova ancora la rete in mano: ' + JSON.stringify(s.ctx.TEAM).slice(0, 90));
  deve(!copiaPresente(s), 'la copia e\' rimasta nella memoria del browser');
});

e.prova('vale anche per il ruolo storico «operativo»', () => {
  /* LEGACY_RUOLI mappa 'operativo' su 'collaboratore', ed e' voluto: la
     guardia deve seguirlo. Se un giorno qualcuno lo promuove a staff, questa
     prova cade e lo si scopre qui, invece che da un IBAN finito dove non
     doveva. */
  const s = scheda({ ruolo: 'operativo' });
  s.ctx.loadTeam();
  deve(s.ctx.TEAM.length === 0, '«operativo» legge ancora la rete');
  deve(!copiaPresente(s), 'la copia resta al ruolo «operativo»');
});

e.prova('e non si riscrive al primo salvataggio', () => {
  const s = scheda({ ruolo: 'collaboratore' });
  s.ctx.TEAM = RETE.slice();
  s.ctx.saveTeam();
  deve(!copiaPresente(s),
    'saveTeam ha rimesso la rete nella memoria: cancellarla una volta sola non serve a niente');
});

/* ── 2. chi e' staff ─────────────────────────────────────────────────────── */

e.prova('all\'amministratore la copia resta: e\' il ripiego quando il database tace', () => {
  const s = scheda({ ruolo: 'admin' });
  s.ctx.loadTeam();
  deve(s.ctx.TEAM.length === 2,
    'l\'amministratore ha perso la copia locale: ' + s.ctx.TEAM.length + ' schede invece di 2');
  deve(copiaPresente(s), 'la copia dell\'amministratore e\' stata cancellata');
});

e.prova('e l\'operatore e\' staff quanto lui', () => {
  const s = scheda({ ruolo: 'master' });   // 'master' -> 'operatore'
  s.ctx.loadTeam();
  deve(s.ctx.TEAM.length === 2, 'l\'operatore non legge piu\' la rete');
  deve(copiaPresente(s), 'la copia dell\'operatore e\' stata cancellata');
});

/* ── 3. quando non si sa ─────────────────────────────────────────────────── */

e.prova('senza profilo non si decide, e non si cancella', () => {
  const s = scheda(null);
  deve(s.ctx.eStaffLocale() === null, 'senza profilo la guardia da\' una risposta che non ha');
  s.ctx.loadTeam();
  deve(s.ctx.TEAM.length === 2, 'ha cancellato la copia senza sapere chi fosse l\'utente');
  deve(copiaPresente(s), 'la copia e\' sparita prima di sapere di chi era');
});

e.prova('tutte le funzioni che servono sono ancora in index.html', () => {
  // Se una viene rinominata, le prove qui sopra passerebbero su un contesto
  // vuoto senza provare piu' niente.
  const s = scheda({ ruolo: 'admin' });
  deve(s.mancanti.length === 0, 'non si trovano piu\': ' + s.mancanti.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
