// ═══════════════════════════════════════════════════════════════════════════════
//  MARKETING DENTRO IAM, IN UN BROWSER VERO
//
//  «In marketing, Dashboard deve accedere in automatico e deve essere tutt'uno
//   con IAM» — Francesco, 29/09/2026.
//
//  Le prove sul sorgente (`sessione-condivisa`) dicono che il codice chiede la
//  cosa giusta. Non dicono che la SCHERMATA si comporti bene: una classe che
//  non si accende, un riquadro che resta nascosto, una fascia verde che compare
//  lo stesso — niente di tutto questo dà errore, e tutto si vede.
//
//  Qui Marketing si apre davvero, dentro un riquadro sulla stessa origine, nei
//  due casi che contano: con la sessione di IAM nello storage, e senza.
//
//  La libreria di Supabase arriva da una rete esterna che qui non si raggiunge:
//  si mette al suo posto un finto client che risponde quello che risponderebbe
//  lei. Quello che si misura è il comportamento della PAGINA, non di Supabase.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { servi } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const { srv, porta } = await servi(RADICE);
const b = await chromium.launch({ executablePath: CHROMIUM });

/* Il finto Supabase. `sessione` è quella che il client trova «nello storage»:
   è il pezzo che nella realtà arriva da IAM, perché IAM e Marketing stanno
   sulla stessa origine e sotto la stessa chiave. `profilo` è la riga di
   `iam_utenti` che il cancello di Marketing va a leggere. */
function finto(sessione, profilo) {
  return `window.supabase = {
    createClient: function (url, key, opz) {
      window.__opzioni = opz || null;
      var sess = ${JSON.stringify(sessione)};
      var prof = ${JSON.stringify(profilo)};
      window.__signOut = 0;
      return {
        auth: {
          getSession: function () { return Promise.resolve({ data: { session: sess } }); },
          setSession: function () { return Promise.resolve({}); },
          signOut: function () { window.__signOut++; return Promise.resolve({}); },
          signInWithPassword: function () { return Promise.resolve({ error: { message: 'no' } }); },
          onAuthStateChange: function (cb) { window.__cb = cb; return { data: {} }; },
        },
        from: function () {
          var q = { select: function () { return q; }, eq: function () { return q; },
                    single: function () { return Promise.resolve({ data: prof }); } };
          return q;
        },
      };
    },
  };`;
}

/* Apre Marketing dentro un riquadro, come fa IAM: stessa origine,
   `?from=iam`, dentro un iframe. */
async function apriDentroIam(sessione, profilo) {
  const pag = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errori = [];
  pag.on('pageerror', e => errori.push(String(e).slice(0, 180)));
  await pag.addInitScript(finto(sessione, profilo));
  /* La scocca finta si apre su un indirizzo QUALSIASI di questa origine (il
     servitore risponde 404, e va benissimo): serve solo che il documento
     RESTI su questa origine, così `/lab/?from=iam` si risolve e il riquadro è
     un iframe di pari origine come in produzione.

     `setContent` non va bene e ci ho perso il primo giro: porta il documento
     su `about:blank`, `/lab/` non si risolve più, e il riquadro resta vuoto —
     con tutte le prove rosse per un motivo che non c'entra niente con quello
     che misurano. */
  await pag.goto(`http://127.0.0.1:${porta}/scocca-finta`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await pag.evaluate(() => {
    document.body.style.margin = '0';
    /* LA SCOCCA RISPONDE, come fa IAM. Marketing si presenta con
       `quoto-ready` e aspetta: senza nessuno che risponda resta fermo i
       quattro secondi del ponte, e una prova che aspetta meno lo trova vuoto
       per il motivo sbagliato.
       La risposta è quella VERA della stessa origine: navigazione ed email,
       NESSUN token — `sessionePerQuoto()` in withus-one.js torna `{}` proprio
       perché la sessione sta già nello storage condiviso. Se questa finta
       mandasse i token, la prova non misurerebbe più la correzione. */
    window.addEventListener('message', (ev) => {
      const d = ev.data;
      if (!d || d.w1 !== 'quoto-ready' || !ev.source) return;
      ev.source.postMessage({ w1: 'quoto-session', v: 1, email: 'tizio@withus.it' }, '*');
    });
    document.body.innerHTML = '<iframe id="f" src="/lab/?from=iam" style="width:100%;height:760px;border:0"></iframe>';
  });
  await pag.waitForTimeout(400);
  const el = await pag.$('#f');
  deve(el, 'il riquadro non è stato creato');
  const fr = await el.contentFrame();
  deve(fr, 'il riquadro non ha un documento dentro');
  /* SI ASPETTA CHE LA SCHERMATA SI DECIDA, non un tempo indovinato.
     `ponteChiediSessione` si dà quattro secondi: qui l'origine del banco
     (127.0.0.1) non è quella di IAM, quindi la risposta della scocca finta
     viene giustamente ignorata e l'attesa va fino in fondo. In produzione IAM
     risponde da subito. Un `waitForTimeout` corto trovava la pagina ancora
     vuota e faceva diventare rosse prove che non c'entravano niente. */
  await fr.waitForFunction(() => {
    const vis = (e) => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    return vis(document.getElementById('lab-app'))
        || vis(document.getElementById('login-screen'))
        || vis(document.getElementById('emb-msg'));
  }, null, { timeout: 15000 }).catch(() => {});
  return { pag, fr, errori };
}

/* Che cosa si legge davvero dentro il riquadro. */
async function guarda(fr) {
  return fr.evaluate(() => {
    const vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return {
      embIam: document.documentElement.classList.contains('emb-iam'),
      opzioni: window.__opzioni,
      signOut: window.__signOut,
      testata: vis(document.querySelector('.top')),
      login: vis(document.getElementById('login-screen')),
      app: vis(document.getElementById('lab-app')),
      /* Il testo NON basta: un riquadro costruito e mai mostrato ha tutte le
         parole giuste e a schermo non c'è. Si guarda anche se si vede, e se
         il tasto per riprovare è un tasto vero — «ricaricare» compare anche
         nella frase accanto, e una prova che cerca la parola passa lo stesso
         quando il tasto non c'è più. */
      messaggio: vis(document.getElementById('emb-msg'))
        ? (document.getElementById('emb-msg').textContent || '') : null,
      messaggioNelDom: (document.getElementById('emb-msg') || {}).textContent || null,
      tastoRicarica: !!document.querySelector('#emb-msg button'),
      campiPassword: document.querySelectorAll('input[type=password]').length,
      passwordVisibili: [...document.querySelectorAll('input[type=password]')]
        .filter(e => e.offsetWidth || e.offsetHeight).length,
    };
  });
}

const SESSIONE = { access_token: 'at-finto', refresh_token: 'rt-finto', user: { id: 'u1', email: 'tizio@withus.it' } };
const ABILITATO = { id: 'u1', email: 'tizio@withus.it', nome: 'Tizio', cognome: 'Caio', attivo: true, lab_abilitato: true };
const NON_ABILITATO = { id: 'u2', email: 'caio@withus.it', nome: 'Caio', cognome: 'Sempronio', attivo: true, lab_abilitato: false };

// ── 1. il caso normale: la sessione di IAM c'è, e Marketing entra da solo ────

const conSessione = await apriDentroIam(SESSIONE, ABILITATO);
const vSess = await guarda(conSessione.fr);

prova('con la sessione di IAM, Marketing entra DA SOLO: nessuna password', () => {
  deve(vSess.app, 'Marketing non si è aperto: ' + JSON.stringify(vSess));
  deve(!vSess.login, 'compare la schermata di accesso dentro IAM');
  deve(vSess.passwordVisibili === 0, 'ci sono ' + vSess.passwordVisibili + ' campi password a schermo');
});

prova('e legge la sessione dallo storage condiviso, senza rinnovarla', () => {
  /* È la correzione del 29/09: c'era `persistSession: false`, e con quello il
     client non guardava lo storage — non trovava la sessione di IAM e
     chiedeva la password. `autoRefreshToken: false` invece resta: è la metà
     che impedisce la corsa sul rinnovo con IAM. */
  deve(vSess.opzioni && vSess.opzioni.auth, 'il client non riceve opzioni: ' + JSON.stringify(vSess.opzioni));
  deve(vSess.opzioni.auth.autoRefreshToken === false, 'Marketing rinnova la sessione per conto suo');
  deve(!('persistSession' in vSess.opzioni.auth) || vSess.opzioni.auth.persistSession !== false,
    'persistSession è ancora spento: la sessione di IAM non si vede');
});

prova('dentro IAM non c\'è una seconda testata', () => {
  deve(vSess.embIam, 'la classe emb-iam non si è accesa');
  deve(!vSess.testata, 'la fascia verde di Marketing compare sotto quella di IAM');
});

prova('dentro IAM, Marketing non nomina un altro programma', () => {
  /* Il sistema si chiama IAM (IAM.md §2). Il preventivatore riscrive già le
     briciole per questo motivo (`w1CrumbFix`); Marketing lo diceva nel corpo
     della pagina quattro volte — «il contatto arriva in QUOTO», «la ritrovi in
     QUOTO». Chi legge «QUOTO» dentro IAM non sta guardando un programma solo. */
  return conSessione.fr.evaluate(() => document.body.innerText).then((t) => {
    const quante = (t.match(/QUOTO/g) || []).length;
    deve(quante === 0, 'a schermo «QUOTO» compare ' + quante + ' volte');
  });
});

prova('aprendo Marketing non si è rotto niente', () => {
  deve(conSessione.errori.length === 0, conSessione.errori.slice(0, 3).join(' | '));
});

// ── 2. senza sessione: si spiega, non si chiede la password ──────────────────

const senzaSessione = await apriDentroIam(null, null);
const vVuota = await guarda(senzaSessione.fr);

prova('senza sessione, dentro IAM si spiega invece di chiedere la password', () => {
  deve(!vVuota.login, 'compare la porta d\'ingresso di un altro programma dentro IAM');
  deve(vVuota.passwordVisibili === 0, 'a schermo ci sono ' + vVuota.passwordVisibili + ' campi password');
  deve(vVuota.messaggio,
    'il riquadro non si vede' + (vVuota.messaggioNelDom ? ' (c\'è nel documento ma è nascosto)' : ''));
  /* Non basta che compaia la parola «sessione» — c'è già nel titolo. Deve
     esserci la FRASE che dice che cosa sta succedendo. */
  deve(/usa l'accesso di IAM/i.test(vVuota.messaggio),
    'non viene spiegato che cosa manca: ' + JSON.stringify(vVuota.messaggio));
  deve(vVuota.tastoRicarica, 'non c\'è un tasto per riprovare: ' + vVuota.messaggio);
});

// ── 3. il caso che poteva far danno: non abilitato ───────────────────────────

const nonAbilitato = await apriDentroIam(SESSIONE, NON_ABILITATO);
const vNo = await guarda(nonAbilitato.fr);

prova('chi non è abilitato a Marketing NON viene buttato fuori da IAM', () => {
  /* Il guasto che la correzione avrebbe acceso: `showBlocked` chiamava
     `signOut()`, e con lo storage condiviso quella riga cancella la sessione
     di IAM e revoca il refresh token sul server. Da una schermata che doveva
     solo dire «non puoi entrare qui». */
  deve(vNo.signOut === 0, 'Marketing ha chiuso la sessione ' + vNo.signOut + ' volte: butta fuori da IAM');
});

prova('e gli si dice perché, restando dentro IAM', () => {
  deve(!vNo.app, 'Marketing si è aperto a chi non è abilitato');
  deve(!vNo.login, 'gli viene mostrata una schermata di accesso');
  deve(vNo.messaggio && /abilitat/i.test(vNo.messaggio), 'il motivo non è scritto: ' + JSON.stringify(vNo.messaggio));
  deve(/dentro IAM/i.test(vNo.messaggio || ''), 'non gli si dice che è ancora dentro IAM: ' + vNo.messaggio);
});

// ── 3-bis. la sessione che arriva in ritardo ─────────────────────────────────

prova('se la sessione arriva dopo, l\'avviso sparisce invece di restare a smentire', async () => {
  /* Il ponte può rispondere dopo il primo tentativo: nel frattempo è comparso
     «non riesco a leggere la sessione». Quando poi la sessione arriva e
     Marketing si apre, quell'avviso deve andarsene — altrimenti resta un
     allarme smentito sopra una schermata che funziona, ed è il tipo di cosa
     che insegna a non leggere gli avvisi. */
  /* Una pagina apposta: sessione assente ma profilo ABILITATO. `senzaSessione`
     qui sopra non ha nemmeno il profilo, quindi finirebbe sul blocco e non
     aprirebbe mai — misurerei un'altra cosa. */
  const tardi = await apriDentroIam(null, ABILITATO);
  const prima = await guarda(tardi.fr);
  deve(prima.messaggio, 'l\'avviso non c\'era: questa prova non sta misurando niente');

  /* Si accende la sessione come farebbe Supabase: attraverso la richiamata
     che il client ha registrato all'avvio. */
  await tardi.fr.evaluate((s) => { if (window.__cb) window.__cb('SIGNED_IN', s); },
    { access_token: 'at', refresh_token: 'rt', user: { id: 'u1', email: 'tizio@withus.it' } });
  await tardi.fr.waitForFunction(() => {
    const e = document.getElementById('lab-app');
    return !!e && !!(e.offsetWidth || e.offsetHeight);
  }, null, { timeout: 8000 }).catch(() => {});

  const dopo = await guarda(tardi.fr);
  deve(dopo.app, 'Marketing non si è aperto quando la sessione è arrivata');
  deve(!dopo.messaggio, 'l\'avviso resta a schermo sopra una schermata che funziona: ' + dopo.messaggio);
});

// ── 4. fuori da IAM, Marketing resta padrone di casa ─────────────────────────

prova('aperto da solo, Marketing ha la sua testata e la sua schermata di accesso', () => {
  /* La correzione non deve aver rotto l'apertura diretta: fuori da IAM
     Marketing è un programma a sé, con la sua porta. */
  return apriDaSolo();
});

async function apriDaSolo() {
  const pag = await b.newPage({ viewport: { width: 1000, height: 800 } });
  await pag.addInitScript(finto(null, null));
  await pag.goto(`http://127.0.0.1:${porta}/lab/`, { waitUntil: 'domcontentloaded' });
  await pag.waitForTimeout(1200);
  const v = await pag.evaluate(() => {
    const vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return { embIam: document.documentElement.classList.contains('emb-iam'),
             login: vis(document.getElementById('login-screen')),
             opzioni: window.__opzioni };
  });
  await pag.close();
  deve(!v.embIam, 'fuori da IAM si veste comunque da sezione di IAM');
  deve(v.login, 'fuori da IAM non compare più la schermata di accesso');
  deve(v.opzioni === undefined || v.opzioni === null,
    'fuori da IAM il client resta ospite invece di essere padrone: ' + JSON.stringify(v.opzioni));
}

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nMARKETING DENTRO IAM — chiesto a un browser vero');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
if (process.env.MKT_FOTO) {
  await conSessione.pag.screenshot({ path: process.env.MKT_FOTO });
  console.log('  foto: ' + process.env.MKT_FOTO);
}
await b.close(); srv.close();
console.log(`\nMARKETING NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
