// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILI COLLABORATORE — §2.4 e §2.5 delle specifiche del 31/08/2026
//
//  COSA SORVEGLIA QUESTA PROVA.
//  Il profilo non e' un abbellimento dell'interfaccia: e' il posto dove passa un
//  vincolo di legge. Il segnalatore — CAF, patronato, negozio di telefonia — NON
//  e' iscritto al RUI e non puo' fare intermediazione. Se l'applicazione gli
//  mostra un premio, una garanzia, una condizione o un preventivo, l'agenzia e'
//  fuori dalla norma, e non conta che nella formazione gli sia stato detto di
//  non guardare.
//
//  Per questo il vincolo sta nel codice come regola di permesso, e per questo ha
//  una prova sua. Le tre cose che devono restare vere:
//
//   1. il profilo STRINGE e non allarga mai — nemmeno se una spunta per-utente
//      dimenticata su una vecchia scheda dicesse il contrario;
//   2. il segnalatore non arriva al preventivatore per NESSUNA strada: non dal
//      bottone (nascosto), non da goTab scritto a mano nella console, non dal
//      giro d'istradamento del login, e non se qualcuno gli mette
//      accesso_quoto = true sull'archivio;
//   3. l'amministrazione (la sezione Utenti) non si ottiene mai da un profilo.
//
//  Un giorno qualcuno aggiungera' una sezione nuova a IAM. Il punto 1 e' scritto
//  come LISTA BIANCA proprio per quel giorno: la sezione nuova nasce chiusa per
//  i profili ristretti, invece di aprirsi da sola perche' nessuno si e'
//  ricordato di elencarla fra le esclusioni.
// ═══════════════════════════════════════════════════════════════════════════════
import vm from 'vm';
import { sorgenteAttuale, stanza, esiti, deve, ritaglia } from './banco.mjs';

const src = sorgenteAttuale();
const e = esiti('PROFILI COLLABORATORE');

/* PROFILI e SEZIONI_PROFILO sono costanti, non funzioni: ritaglia() non le
   prende. Si ritagliano qui a mano — e si prendono QUELLE VERE, dal file, non
   una copia scritta nella prova: una copia si allontanerebbe dall'originale
   alla prima modifica, e la prova continuerebbe a passare sorvegliando niente. */
function costante(nome, apre, chiude) {
  const re = new RegExp('const ' + nome + '\\s*=\\s*\\' + apre + '[\\s\\S]*?\\n?\\' + chiude + ';');
  const m = re.exec(src);
  deve(m, 'costante ' + nome + ' non trovata in index.html');
  return m[0];
}
/* `const` dichiarato in una stanza vm resta nello scope lessicale: le funzioni
   della stanza lo vedono, ma dall'esterno `ctx.PROFILI` e' undefined. Qui la
   costante serve anche letta da fuori (per controllare che dica quel che deve),
   quindi la si monta come `var`, che invece diventa una proprieta' del
   contesto. Il testo resta quello vero del file: cambia la parola davanti. */
const aVar = t => t.replace(/^const /, 'var ');
const TESTO_PROFILI  = aVar(costante('PROFILI', '{', '}'));
const TESTO_SEZIONI  = aVar(costante('SEZIONI_PROFILO', '[', ']'));

const NOMI = ['profiloDi', 'eSegnalatore', 'prodottiDi', 'moduliDi', 'permessiEffettivi', 'permessiJson', 'puoQuotare'];

/* Il banco monta le funzioni; le costanti si iniettano subito dopo, nella
   stessa stanza. Le funzioni non hanno ancora girato, quindi l'ordine va bene. */
function apparecchia(profiloUtente, extra = {}) {
  const s = stanza(src, NOMI, {
    PROFILO: profiloUtente,
    altro: Object.assign({
      PERMESSI: {
        admin:         { carica:true,  dashboard:true, sospesi:true, team:true, pipeline:true, lead:true, workdiary:true, performance:true, utenti:true,  modifica:true },
        operatore:     { carica:false, dashboard:true, sospesi:true, team:true, pipeline:true, lead:true, workdiary:true, performance:true, utenti:true,  modifica:false },
        collaboratore: { carica:false, dashboard:false,sospesi:true, team:true, pipeline:true, lead:true, workdiary:true, performance:false,utenti:false, modifica:true },
      },
      canonRuolo: r => (r === 'operativo' ? 'collaboratore' : r || 'collaboratore'),
      isSuperAdmin: () => false,
    }, extra),
  });
  deve(s.mancanti.length === 0, 'funzioni non trovate: ' + s.mancanti.join(', '));
  vm.runInContext(extra.PROFILI_TESTO || TESTO_PROFILI, s.ctx, { filename: 'PROFILI.js' });
  vm.runInContext(TESTO_SEZIONI, s.ctx, { filename: 'SEZIONI_PROFILO.js' });
  return s;
}

// ── 1. La configurazione vera dice quello che crediamo dica ──────────────────
e.prova('i tre profili delle specifiche esistono, e il segnalatore non vede niente', () => {
  const ctx = vm.createContext({});
  vm.runInContext(TESTO_PROFILI, ctx);
  const P = ctx.PROFILI;
  ['previdenza_vita', 'dealer_iscritto', 'segnalatore'].forEach(k =>
    deve(P[k], 'manca il profilo ' + k));
  deve(P.segnalatore.rui === false, 'il segnalatore risulta iscritto al RUI: non lo e\'');
  deve(P.segnalatore.soloSegnalazione === true, 'il segnalatore non e\' marcato come solo-segnalazione');
  deve(Array.isArray(P.segnalatore.vede) && P.segnalatore.vede.length === 0,
    'il segnalatore ha sezioni aperte: ' + JSON.stringify(P.segnalatore.vede));
  deve(P.previdenza_vita.rui === true && P.dealer_iscritto.rui === true,
    'previdenza e dealer devono essere iscritti al RUI');
});

// ── 2. Il profilo stringe ────────────────────────────────────────────────────
e.prova('un dealer non vede la contabilita\' dell\'agenzia, nemmeno se e\' admin', () => {
  const { ctx } = apparecchia({ ruolo: 'admin', profilo: 'dealer_iscritto' });
  const eff = ctx.permessiEffettivi(ctx.PROFILO);
  deve(eff.carica === false,    'apre la contabilita\'');
  deve(eff.dashboard === false, 'apre la dashboard');
  deve(eff.pipeline === true,   'non apre le trattative, che invece gli servono');
  deve(eff.lead === true,       'non apre i contatti, che invece gli servono');
});

e.prova('l\'amministrazione non si ottiene mai da un profilo', () => {
  ['previdenza_vita', 'dealer_iscritto', 'segnalatore'].forEach(p => {
    const { ctx } = apparecchia({ ruolo: 'admin', profilo: p });
    deve(ctx.permessiEffettivi(ctx.PROFILO).utenti === false,
      'il profilo ' + p + ' apre la gestione utenti');
  });
});

// ── 3. Il profilo NON allarga ────────────────────────────────────────────────
e.prova('un profilo non puo\' regalare una sezione che il ruolo nega', () => {
  /* Profilo inventato apposta: elenca «carica», che il ruolo collaboratore non
     concede. Se il profilo allargasse invece di stringere, qui si vedrebbe. */
  const finto = 'var PROFILI = {\n  prova_allarga: { label: \'Prova\', rui: true, vede: [\'carica\', \'pipeline\'], prodotti: [], soloSegnalazione: false },\n};';
  const { ctx } = apparecchia({ ruolo: 'collaboratore', profilo: 'prova_allarga' }, { PROFILI_TESTO: finto });
  deve(ctx.permessiEffettivi(ctx.PROFILO).carica === false,
    'il profilo ha aperto la contabilita\' a un ruolo che non ce l\'ha: stringe e allarga, invece di solo stringere');
});

e.prova('nemmeno una spunta per-utente dimenticata riapre cio\' che il profilo chiude', () => {
  const utente = { ruolo: 'collaboratore', profilo: 'dealer_iscritto', permessi: { workdiary: true, sospesi: true } };
  const { ctx } = apparecchia(utente);
  const eff = ctx.permessiEffettivi(utente);
  deve(eff.workdiary === false, 'la spunta per-utente ha riaperto l\'agenda');
  deve(eff.sospesi === false,   'la spunta per-utente ha riaperto i sospesi');
});

// ── 4. Il segnalatore ────────────────────────────────────────────────────────
e.prova('il segnalatore non ha nessuna sezione e non puo\' modificare', () => {
  const { ctx } = apparecchia({ ruolo: 'admin', profilo: 'segnalatore' });
  const eff = ctx.permessiEffettivi(ctx.PROFILO);
  const aperte = ctx.SEZIONI_PROFILO.filter(k => eff[k]);
  deve(aperte.length === 0, 'ha sezioni aperte: ' + aperte.join(', '));
  deve(eff.modifica === false, 'puo\' modificare');
  deve(ctx.eSegnalatore(ctx.PROFILO) === true, 'non viene riconosciuto come segnalatore');
});

e.prova('il segnalatore non arriva al preventivatore nemmeno con accesso_quoto = true', () => {
  const { ctx } = apparecchia({ ruolo: 'collaboratore', profilo: 'segnalatore', accesso_quoto: true });
  deve(ctx.puoQuotare() === false,
    'con la spunta sbagliata sull\'archivio si aprirebbe il quotatore a chi non e\' iscritto RUI');
});

e.prova('chi invece e\' iscritto e ha accesso_quoto ci arriva', () => {
  const { ctx } = apparecchia({ ruolo: 'collaboratore', profilo: 'previdenza_vita', accesso_quoto: true });
  deve(ctx.puoQuotare() === true, 'il freno si e\' chiuso anche su chi ha diritto');
});

// ── 5. I prodotti ────────────────────────────────────────────────────────────
e.prova('i prodotti: il segnalatore nessuno, il dealer quelli assegnati a lui', () => {
  const seg = apparecchia({ ruolo: 'collaboratore', profilo: 'segnalatore', prodotti: ['rc_moto'] });
  deve(seg.ctx.prodottiDi(seg.ctx.PROFILO).length === 0,
    'al segnalatore risultano prodotti quotabili');

  const dea = apparecchia({ ruolo: 'collaboratore', profilo: 'dealer_iscritto', prodotti: ['rc_moto', 'garanzia_estesa'] });
  deve(dea.ctx.prodottiDi(dea.ctx.PROFILO).join(',') === 'rc_moto,garanzia_estesa',
    'il dealer non riceve i prodotti assegnati sulla sua scheda');
});

/* I moduli sono il permesso che il preventivatore applica DAVVERO
   (iam_utenti.moduli, letto da renderModules). Il profilo lo riempie invece di
   inventarne uno parallelo: se un giorno qualcuno tornasse a inventarlo, questa
   prova non se ne accorgerebbe da sola — ma almeno fissa che cosa deve uscire. */
e.prova('i moduli del preventivatore seguono il profilo', () => {
  const seg = apparecchia({ ruolo: 'collaboratore', profilo: 'segnalatore' });
  const m = seg.ctx.moduliDi(seg.ctx.PROFILO);
  deve(Array.isArray(m) && m.length === 0, 'al segnalatore resta aperto un modulo del preventivatore');

  const pre = apparecchia({ ruolo: 'collaboratore', profilo: 'previdenza_vita' });
  deve((pre.ctx.moduliDi(pre.ctx.PROFILO) || []).includes('vita'),
    'il profilo previdenza non apre il modulo vita, che e\' quello con TFR e fondo pensione');

  const dea = apparecchia({ ruolo: 'collaboratore', profilo: 'dealer_iscritto' });
  deve(dea.ctx.moduliDi(dea.ctx.PROFILO) === null,
    'il dealer dovrebbe lasciare la scelta all\'amministratore, non imporre una lista');
});

// ── 6. La porta chiusa: goTab ────────────────────────────────────────────────
function bancoNavigazione(profiloUtente) {
  const visitate = [];
  const memoria = {};
  const s = stanza(src, ['goTab', 'eSegnalatore', 'profiloDi'], {
    PROFILO: profiloUtente,
    altro: {
      RIPRISTINO_FATTO: false, RIPRISTINO_IN_CORSO: false, UTENTE_HA_SCELTO: false,
      sessionStorage: { getItem: k => (k in memoria ? memoria[k] : null), setItem: (k, v) => { memoria[k] = String(v); }, removeItem: k => { delete memoria[k]; } },
      setUltimoTab: t => { memoria['iam_last_tab'] = String(t); },
      getUltimoTab: () => memoria['iam_last_tab'] ?? null,
      PERMESSI: { admin: { utenti: true }, collaboratore: { utenti: false } },
      selContabTab(){}, buildStorico(){}, loadTeamDB: async()=>{}, renderTeam(){},
      loadCollabLeadDB: async()=>{},
      renderTratt(){}, selOperativaTab(){}, loadTrattDB: async()=>{}, renderLead(){},
      loadLeadDB: async()=>{}, loadWD_DB: async()=>{}, selWDTab(){}, renderWDCal(){},
      subscribeWD(){}, mostraResiduiKPI(){}, selPerfTab(){}, loadREFromDB(){},
      loadAzienda(){}, loadTickets(){}, caricaDaFareOggi(){}, loadAgentiAI(){},
      caricaProfilo: async()=>null, renderUtenti(){}, renderKpiCtrl(){},
      renderGestioneObiettivi(){}, renderAuditLog(){}, renderHubList(){},
      renderPannelloPersonale(){}, renderObiettiviOperatore(){}, quotoUrl: async()=>'',
      applicaPermessi(){}, PERF_CUR: 'gare', apriSegnalazione(){ visitate.push('MODALE'); },
      requestAnimationFrame: f => f(), setTimeout: () => 0,
    },
    visitate,
  });
  deve(s.mancanti.length === 0, 'funzioni non trovate: ' + s.mancanti.join(', '));
  vm.runInContext(TESTO_PROFILI, s.ctx);
  vm.runInContext(TESTO_SEZIONI, s.ctx);
  const originale = s.ctx.goTab;
  s.ctx.goTab = t => { visitate.push(t); return originale(t); };
  return { ctx: s.ctx, visitate, detto: s.browser.detto };
}

e.prova('un segnalatore che chiede il preventivatore riceve un rifiuto, non una schermata', () => {
  const { ctx, visitate, detto } = bancoNavigazione({ ruolo: 'collaboratore', profilo: 'segnalatore' });
  ctx.goTab('quoto');
  deve(visitate.includes('profilo'), 'non e\' stato rimandato alla sua scheda: ' + visitate.join(', '));
  deve(detto.alert.length > 0, 'non gli e\' stato detto perche\': un rifiuto muto sembra un guasto');
  deve(/RUI/.test(detto.alert.join(' ')), 'il rifiuto non spiega che serve un iscritto RUI');
});

e.prova('al segnalatore resta aperta solo la segnalazione', () => {
  const { ctx, visitate } = bancoNavigazione({ ruolo: 'collaboratore', profilo: 'segnalatore' });
  ctx.goTab('segnala');
  deve(visitate.includes('MODALE'), 'il modale di segnalazione non si e\' aperto');
});

e.prova('chi non ha profilo naviga come prima', () => {
  const { ctx, visitate, detto } = bancoNavigazione({ ruolo: 'admin' });
  ctx.goTab('pipeline');
  deve(detto.alert.length === 0, 'e\' comparso un avviso a chi non c\'entra: ' + detto.alert.join(' | '));
  deve(!visitate.includes('profilo'), 'e\' stato dirottato sulla scheda personale senza motivo');
});

// ── 7. Il salvataggio spegne il quotatore alla fonte ─────────────────────────
e.prova('scegliendo «segnalatore» il salvataggio toglie anche accesso_quoto', () => {
  const f = ritaglia(src, 'salvaPermessiUtente');
  deve(f, 'salvaPermessiUtente non trovata');
  deve(/soloSegnalazione/.test(f) && /accesso_quoto\s*=\s*false/.test(f),
    'il salvataggio non spegne accesso_quoto per il segnalatore: il divieto resterebbe appeso al fatto che qualcuno si ricordi di togliere la spunta in un altro pannello');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
