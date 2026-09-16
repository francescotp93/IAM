// ═══════════════════════════════════════════════════════════════════════════════
//  NAVIGAZIONE STABILE — l'app non deve spostarsi da sola
//
//  Segnalazione del collaudo esterno (30/07/2026): cliccando in fretta due o tre
//  sezioni, i clic successivi al primo venivano ignorati; e qualche secondo dopo
//  l'app cambiava sezione da sola, ripercorrendo le voci toccate prima.
//
//  Le cause erano due, e si sommavano:
//   1) onLogin() partiva DUE volte (getSession + onAuthStateChange 'SIGNED_IN'),
//      quindi tutto il giro di avvio girava in doppio;
//   2) in fondo a loadLastSession() c'era un ripristino di scheda che rileggeva
//      iam_last_tab — che pero' goTab riscrive a ogni clic. Ogni caricamento che
//      finiva in ritardo portava l'operatore altrove.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, ritaglia, stanza, esiti, deve } from './banco.mjs';

const src = sorgenteAttuale();
const e = esiti('NAVIGAZIONE — l\'app non si sposta da sola');

// ── 1. L'avvio non puo' partire due volte ────────────────────────────────────
e.prova('onLogin si protegge dal doppio annuncio di accesso', () => {
  const f = ritaglia(src, 'onLogin');
  deve(f, 'onLogin non trovata');
  const primeRighe = f.split('\n').slice(0, 6).join('\n');
  deve(/ACCESSO_AVVIATO_PER/.test(primeRighe),
    'onLogin non controlla se l\'avvio e\' gia\' partito: Supabase lo annuncia due volte');
  deve(/return;/.test(primeRighe), 'il controllo non interrompe la seconda chiamata');
});

e.prova('uscendo, il blocco si azzera (altrimenti non si rientra piu\')', () => {
  const f = ritaglia(src, 'onLogout');
  deve(f && /ACCESSO_AVVIATO_PER\s*=\s*null/.test(f),
    'onLogout non azzera il blocco: dopo un logout non si potrebbe piu\' rientrare');
});

// ── 2. Il ripristino non vive piu' dentro il caricamento dati ────────────────
e.prova('loadLastSession non naviga piu\' per conto suo', () => {
  const f = ritaglia(src, 'loadLastSession');
  deve(f, 'loadLastSession non trovata');
  const codice = f.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
  deve(!/iam_last_tab/.test(codice),
    'legge ancora l\'ultima scheda: e\' cosi\' che strappava via chi stava lavorando');
  deve(/ripristinaScheda\(\)/.test(codice), 'non delega il ripristino');
});

e.prova('il ripristino avviene una volta sola', () => {
  const f = ritaglia(src, 'ripristinaScheda');
  deve(f, 'ripristinaScheda non trovata');
  deve(/RIPRISTINO_FATTO/.test(f), 'niente protegge dal secondo ripristino');
});

// ── 3. La prova vera: chi ha gia' cliccato non viene spostato ────────────────
function apparecchia(schedaMemorizzata) {
  const memoria = { 'iam_last_tab': schedaMemorizzata };
  const visitate = [];
  /* contaSezioni: goTab la chiama quando apre Operativa (§2.6). Senza
     portarsela dentro, qui risulterebbe assente e le prove del ripristino
     fallirebbero per un motivo che con la navigazione non c'entra. */
  const { ctx } = stanza(src, ['goTab', 'ripristinaScheda', 'contaSezioni'], {
    altro: {
      /* Le tre spie vivono fuori dalle funzioni ritagliate: qui vanno messe a
         mano, altrimenti nella stanza chiusa non esistono. */
      RIPRISTINO_FATTO: false, RIPRISTINO_IN_CORSO: false, UTENTE_HA_SCELTO: false,
      // il magazzino di sessione, che goTab riscrive a ogni passaggio
      sessionStorage: {
        getItem: (k) => (k in memoria ? memoria[k] : null),
        setItem: (k, v) => { memoria[k] = String(v); },
        removeItem: (k) => { delete memoria[k]; }
      },
      /* Dove-eri-rimasto: goTab salva con setUltimoTab, ripristinaScheda legge
         con getUltimoTab. In produzione scrivono sessione + localStorage; qui
         basta la stessa memoria condivisa che usa il resto della prova. */
      setUltimoTab: (t) => { memoria['iam_last_tab'] = String(t); },
      getUltimoTab: () => ('iam_last_tab' in memoria ? memoria['iam_last_tab'] : null),
      // tutto cio' che goTab chiama e qui non interessa
      selContabTab: (t) => visitate.push('contab:' + t),
      buildStorico(){}, loadTeamDB: async()=>{}, renderTeam(){}, renderTratt(){},
      loadCollabLeadDB: async()=>{},
      selOperativaTab: (t) => visitate.push('operativa:' + t),
      loadTrattDB: async()=>{}, renderLead(){}, loadLeadDB: async()=>{},
      loadWD_DB: async()=>{}, selWDTab(){}, renderWDCal(){}, subscribeWD(){},
      mostraResiduiKPI(){}, selPerfTab(){}, loadREFromDB(){}, loadAzienda(){},
      loadTickets(){}, caricaDaFareOggi(){}, loadAgentiAI(){}, caricaProfilo: async()=>null,
      renderUtenti(){}, renderKpiCtrl(){}, renderGestioneObiettivi(){}, renderAuditLog(){},
      renderHubList(){}, renderPannelloPersonale(){}, renderObiettiviOperatore(){},
      quotoUrl: async()=>'', applicaPermessi(){}, PERF_CUR: 'gare',
      /* Il profilo «segnalatore» (§2.5) chiude goTab a chi non e' iscritto RUI.
         Qui si prova la NAVIGAZIONE, non i profili: si finge un utente senza
         profilo, che e' il caso di tutti quelli di oggi. Il vincolo del
         segnalatore ha la sua prova, in profili-collaboratore.test.mjs. */
      eSegnalatore: () => false, apriSegnalazione(){}, alert(){},
      requestAnimationFrame: (f)=>f(), setTimeout: ()=>0
    },
    visitate
  });
  // goTab registra dove si e' finiti
  const originale = ctx.goTab;
  ctx.goTab = (t) => { visitate.push(t); return originale(t); };
  return { ctx, visitate, memoria };
}

e.prova('se la persona ha gia\' scelto, un caricamento in ritardo NON la sposta', () => {
  const { ctx, visitate } = apparecchia('dashboard');
  ctx.goTab('pipeline');          // l'operatore clicca Trattative
  visitate.length = 0;
  ctx.ripristinaScheda();         // arriva in ritardo il caricamento dell'avvio
  deve(visitate.length === 0,
    'lo ha spostato lo stesso, verso: ' + visitate.join(', '));
});

e.prova('senza clic, invece, la scheda si ripristina davvero', () => {
  const { ctx, visitate } = apparecchia('team');
  ctx.ripristinaScheda();
  deve(visitate.includes('team'), 'non ha ripristinato la scheda: ' + visitate.join(', '));
});

e.prova('il ripristino non si ripete al secondo caricamento', () => {
  const { ctx, visitate } = apparecchia('team');
  ctx.ripristinaScheda();
  visitate.length = 0;
  ctx.ripristinaScheda();
  deve(visitate.length === 0, 'ha ripristinato due volte: ' + visitate.join(', '));
});

e.prova('senza nulla in memoria si apre la scrivania', () => {
  const { ctx, visitate } = apparecchia(null);
  ctx.ripristinaScheda();
  deve(visitate.includes('dashboard'), 'non ha aperto la scrivania: ' + visitate.join(', '));
});

e.prova('tre clic in rapida successione arrivano tutti e tre', () => {
  /* Il sintomo segnalato: Portafoglio, poi Conto, poi Ticket a 300 ms l'uno
     dall'altro, e i due successivi venivano persi. goTab e' sincrona: se
     nessuno la scavalca, l'ultimo clic vince sempre. */
  const { ctx, visitate } = apparecchia('dashboard');
  ctx.goTab('pipeline');
  ctx.goTab('conto');
  ctx.goTab('ticket');
  deve(visitate.filter(v => v === 'ticket').length >= 1,
    'l\'ultimo clic non e\' arrivato: ' + visitate.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
