// ═══════════════════════════════════════════════════════════════════════════════
//  I DATI DI UN UTENTE — e l'email, che passa da un'altra porta
//
//  Nome e cognome di un utente non si potevano cambiare da nessuna parte: si
//  sceglievano alla creazione e restavano quelli. Un cognome sbagliato finiva
//  nell'elenco, nelle notifiche, e — da quando esiste il preventivo
//  personalizzato — sul foglio che legge il cliente.
//
//  LA PROVA CHE CONTA E' LA SECONDA. In iam_utenti l'email e' una COPIA:
//  quella con cui si entra sta in auth.users, e la puo' toccare solo una
//  chiave di servizio, che nel browser non c'e' e non ci deve stare.
//  Scrivere la copia e basta sarebbe il peggiore dei mondi — l'elenco
//  mostrerebbe il nuovo indirizzo, la persona continuerebbe a entrare con il
//  vecchio, e il messaggio per rifare la password andrebbe al vecchio.
//  Sembrerebbe fatto e non lo sarebbe. Questa prova impedisce che qualcuno,
//  con le migliori intenzioni, aggiunga `email` a quella update.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { RADICE, esiti, deve } from './banco.mjs';

const idx = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const e = esiti('DATI UTENTE — la copia non si scrive mai da sola');

e.prova('dalla gestione utenti si aprono i dati di una persona', () => {
  deve(/function apriDatiUtente\(/.test(idx), 'manca il modulo dei dati utente');
  deve(/onclick="apriDatiUtente\('\$\{u\.id\}'\)"/.test(idx),
    'il modulo esiste ma nessuna riga dell\'elenco lo apre: per chi lavora non esiste');
  for (const c of ['du-nome', 'du-cognome']) {
    deve(idx.includes('id="' + c + '"'), 'manca il campo ' + c);
  }
  return 'nome e cognome';
});

e.prova('la copia dell\'email non si scrive mai da sola', () => {
  const i = idx.indexOf('async function salvaDatiUtente(');
  deve(i > 0, 'non trovo il salvataggio: la prova non starebbe guardando niente');
  const fn = idx.slice(i, idx.indexOf('\n}', i));
  /* Il guasto da impedire e' UNA riga: aggiungere `email` all'update. */
  /* IL GUASTO DA IMPEDIRE E' SEMPRE LO STESSO, anche ora che l'email si puo'
     cambiare: scrivere la COPIA in iam_utenti senza toccare l'accesso. La
     update di questa funzione deve restare nome+cognome e nient'altro; il
     cambio vero passa dalla funzione di servizio, che le aggiorna tutte e
     due. */
  deve(/update\(\s*\{\s*nome,\s*cognome\s*\}\s*\)/.test(fn),
    'il salvataggio non scrive piu\' esattamente nome e cognome: ' + fn.slice(0, 200));
  const updates = [...fn.matchAll(/update\(\s*\{([^}]*)\}/g)].map(m => m[1]);
  const conEmail = updates.filter(u => /\bemail\b/.test(u));
  deve(conEmail.length === 0,
    'una update di iam_utenti tocca l\'email: e\' una copia, e cambiarla da sola lascia ' +
    'l\'accesso e il recupero password sull\'indirizzo vecchio. Il cambio passa da utente-email.');
  deve(/functions\.invoke\(\s*'utente-email'/.test(fn),
    'l\'email non passa piu\' dalla funzione di servizio: dal browser auth.users non si tocca');
  return 'la copia da sola non si scrive mai';
});

e.prova('il campo email si apre solo a chi puo\', e dice cosa succede', () => {
  const i = idx.indexOf('id="du-email"');
  deve(i > 0, 'manca il campo dell\'email');
  const riga = idx.slice(i, i + 300);
  /* Non e' bloccato per tutti: e' bloccato per chi non puo' cambiarlo. La
     decisione vera la prende comunque il server — qui si evita soltanto di
     mostrare un campo che verrebbe rifiutato. */
  deve(/puoEmail \? '' : 'disabled'/.test(riga),
    'il campo dell\'email non e\' legato al permesso: ' + riga.slice(0, 160));
  deve(/const puoEmail = PROFILO\?\.ruolo === 'admin' && \(!suo \|\| mio\)/.test(idx),
    'il permesso non e\' piu\' «amministratore, e il proprietario solo su se stesso»');
  const spiega = idx.slice(i, i + 1400);
  deve(/password/i.test(spiega) && /vecchio/i.test(spiega),
    'il modulo non dice che il vecchio indirizzo smette di funzionare');
  return 'aperto a chi puo\', e spiegato';
});

e.prova('il cambio di accesso si chiede, e dice l\'indirizzo nuovo', () => {
  const i = idx.indexOf('async function salvaDatiUtente(');
  const fn = idx.slice(i, idx.indexOf('\n}', idx.indexOf('renderUtenti()', i)));
  deve(/confirm\(/.test(fn), 'cambia l\'accesso di una persona senza chiedere niente');
  deve(/emailNuova/.test(fn) && /emailVecchia/.test(fn),
    'la domanda non mette sotto gli occhi i due indirizzi');
  return 'chiede, e dice da quale a quale';
});

e.prova('la scheda del proprietario non la modifica un altro', () => {
  const i = idx.indexOf('async function apriDatiUtente(');
  const fn = idx.slice(i, idx.indexOf('\n}', idx.indexOf('ov.innerHTML', i)));
  deve(/SUPER_ADMIN_EMAIL/.test(fn), 'chiunque sia admin puo\' riscrivere i dati del proprietario');
  return 'solo lui sui suoi';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
