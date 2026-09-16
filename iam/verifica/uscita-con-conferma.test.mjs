// ═══════════════════════════════════════════════════════════════════════════════
//  USCITA — chiudere la sessione non deve essere un incidente
//
//  Punto 11 del collaudo esterno (30/07/2026): «Esci dall'account» è l'ultima
//  voce del menu Amministrazione, subito sotto voci che si limitano ad aprire
//  qualcosa. Chiudeva la sessione al primo clic, senza chiedere niente — e il
//  collaudatore ci è cascato lui stesso durante il primo giro di prove.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, ritaglia, stanza, esiti, deve } from './banco.mjs';

const src = sorgenteAttuale();
const e = esiti('USCITA — si chiede prima di chiudere la sessione');

function apparecchia(rispostaConfirm) {
  let uscito = false;
  const dbFinto = { auth: { signOut: async () => { uscito = true; return { error: null }; } } };
  const { ctx, browser } = stanza(src, ['doLogout'], {
    rispostaConfirm,
    db: dbFinto,
    altro: { db: dbFinto, sessionStorage: { removeItem(){} } }
  });
  return { ctx, browser, uscito: () => uscito };
}

/* Attenzione: prova() non attende una funzione async — la darebbe per buona
   comunque. Qui si usa provaAsync, che aspetta davvero il risultato. */
async function principale() {
  await e.provaAsync('rispondendo «no» la sessione resta aperta', async () => {
    const { ctx, uscito } = apparecchia(false);
    await ctx.doLogout();
    deve(!uscito(), 'ha chiuso la sessione lo stesso');
  });

  await e.provaAsync('rispondendo «sì» si esce davvero', async () => {
    const { ctx, uscito } = apparecchia(true);
    await ctx.doLogout();
    deve(uscito(), 'non ha chiuso la sessione');
  });

  await e.provaAsync('la domanda dice che cosa succede', async () => {
    const { ctx, browser } = apparecchia(true);
    await ctx.doLogout();
    const domanda = (browser.detto.confirm[0] || '');
    deve(domanda, 'non ha chiesto niente');
    deve(/credenziali|rientr/i.test(domanda),
      'la domanda non spiega la conseguenza: «' + domanda + '»');
  });

  e.stampa();
  process.exit(e.ko === 0 ? 0 : 1);
}

principale();
