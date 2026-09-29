// ═══════════════════════════════════════════════════════════════════════════════
//  UNA SESSIONE SOLA, NELLO STORAGE DELL'ORIGINE (17/09/2026, passo 3 moduli 4 e 5)
//
//  IAM e il preventivatore stanno sulla stessa origine dal 16/09/2026. Il
//  client Supabase salva la sessione in localStorage sotto una chiave che
//  dipende solo dal progetto: la sessione di IAM e' gia' li', e nessuno deve
//  passarla — ne' nell'indirizzo (#at/#rt), ne' nel messaggio della scocca.
//  Queste prove guardano il sorgente dei tre pezzi e il contratto.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ritaglia } from '../../iam/verifica/banco.mjs';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const quoto = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const iam = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(RADICE, 'iam', 'withus-one.js'), 'utf8');
const contratto = fs.readFileSync(path.join(RADICE, 'INTERFACCIA-QUOTO-IAM.md'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };
const senzaCommenti = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');

prova('nel riquadro il preventivatore condivide lo storage e non rinnova: persistSession resta acceso, autoRefreshToken no', () => {
  const init = senzaCommenti(ritaglia(quoto, 'initDB') || '');
  deve(init, 'initDB non si ritaglia');
  deve(/ospiteIam \? \{ auth: \{ autoRefreshToken: false \} \} : undefined/.test(init), 'le opzioni del client ospite non sono { autoRefreshToken: false } e basta');
  deve(!/persistSession:\s*false/.test(init), 'persistSession e\' ancora spento: senza storage la sessione di IAM non si vede');
  deve(!/setSession\(/.test(init), 'initDB installa ancora una sessione a mano');
  deve(!/_qp\.get\('email'\)/.test(init), 'l\'email si legge ancora dall\'indirizzo');
  return 'ospite: legge lo storage, non rinnova, non installa niente';
});

prova('i token nell\'indirizzo (#at/#rt) non si usano piu\': si tolgono dalla barra e basta', () => {
  const init = senzaCommenti(ritaglia(quoto, 'initDB') || '');
  deve(/_h\.has\('at'\) \|\| _h\.has\('rt'\)/.test(init) && /history\.replaceState/.test(init), 'un vecchio collegamento con i token non viene ripulito');
  deve(!/_h\.get\('at'\)/.test(init) && !/_hat/.test(init), 'i token dell\'hash vengono ancora letti');
  return 'hash ripulito, mai letto';
});

prova('il messaggio della scocca porta navigazione, non sessione: at/rt ignorati anche se arrivano', () => {
  const asc = senzaCommenti(ritaglia(quoto, 'ponteAscolta') || '');
  deve(asc, 'ponteAscolta non si ritaglia');
  deve(!/setSession\(/.test(asc), 'ponteAscolta installa ancora la sessione dal messaggio');
  deve(/if \(d\.w1 === 'quoto-session' \|\| d\.w1 === 'quoto-nav'\)/.test(asc) && /ponteVai\(d\)/.test(asc), 'quoto-session non porta piu\' alla navigazione');
  deve(/if \(d\.at \|\| d\.rt\) console\.warn/.test(asc), 'token nel messaggio accettati in silenzio');
  const chiedi = ritaglia(quoto, 'ponteChiediSessione');
  deve(chiedi && /quoto-ready/.test(chiedi) && /IAM_ORIGINI\.indexOf\(ev\.origin\)|ponteDaIam\(ev\)/.test(chiedi), 'il riquadro non si presenta piu\' alla scocca, o non controlla l\'origine');
  return 'quoto-session → ponteVai, token ignorati con avviso';
});

prova('la scocca non manda i token sulla stessa origine, e li metterebbe nel messaggio solo se ci fossero', () => {
  const f = ritaglia(scocca, 'sessionePerQuoto');
  deve(f, 'sessionePerQuoto non si ritaglia');
  deve(/if \(QUOTO_ORIGIN === location\.origin\) return Promise\.resolve\(\{\}\);/.test(f), 'sulla stessa origine la scocca legge ancora la sessione per mandarla');
  deve(/if \(sess && sess\.at && sess\.rt\) \{ msg\.at = sess\.at; msg\.rt = sess\.rt; \}/.test(scocca), 'at/rt finiscono nel messaggio anche vuoti');
  deve(/var QUOTO = '\/nuovo-preventivo\/';/.test(scocca), 'il riquadro non carica piu\' /nuovo-preventivo/ (stessa origine)');
  return 'stessa origine → {} · at/rt solo se presenti';
});

prova('il salto a pagina intera va su /nuovo-preventivo/ senza token ne\' email nell\'indirizzo', () => {
  const f = senzaCommenti(ritaglia(iam, 'quotoUrl') || '');
  deve(f, 'quotoUrl non si ritaglia');
  deve(!/#at=|access_token|refresh_token/.test(f), 'quotoUrl allega ancora i token nell\'hash');
  deve(!/email=/.test(f), 'quotoUrl mette ancora l\'email nell\'indirizzo');
  deve(/return QUOTO_URL \+ '\?from=iam';/.test(f), 'quotoUrl non torna piu\' /nuovo-preventivo/?from=iam');
  deve(/const QUOTO_URL = '\/nuovo-preventivo\/';/.test(iam), 'QUOTO_URL non e\' sulla stessa origine');
  return 'QUOTO_URL + ?from=iam, nient\'altro';
});

prova('il contratto dice la stessa cosa: passo 2 senza at/rt, §2.4 decisa, §3 stessa origine', () => {
  const r2 = /\|\s*2\s*\|[^\n]*quoto-session[^\n]*/.exec(contratto);
  deve(r2 && !/\bat\b|\brt\b/.test(r2[0].replace(/quoto-session/, '')), 'la riga del passo 2 elenca ancora at/rt: ' + (r2 && r2[0]));
  deve(/### 2\.4[^\n]*\n[\s\S]{0,900}?stessa origine/i.test(contratto), '§2.4 non dice che il salto a pagina intera e\' sulla stessa origine');
  deve(/## 3\. Sessione condivisa[\s\S]{0,700}?localStorage/.test(contratto), '§3 non spiega che la sessione sta nello storage dell\'origine');
  deve(!/### 2\.4[\s\S]{0,1200}?da decidere:\n- \*\*\(a\)\*\*/.test(contratto), '§2.4 e\' ancora «da decidere»');
  return 'contratto allineato';
});

/* ══ E MARKETING, CHE ERA RESTATO INDIETRO (29/09/2026) ═══════════════════════
   «In marketing, Dashboard deve accedere in automatico e deve essere tutt'uno
    con IAM» — Francesco.

   Le prove qui sopra guardavano il preventivatore e la scocca, non il Lab.
   Marketing era rimasto con `persistSession: false`: giusto finché stava su
   un'altra origine e riceveva i token in un messaggio, sbagliato dal
   16/09/2026. Non guardava lo storage, non gli arrivava niente (la scocca
   risponde vuoto sulla stessa origine) e mostrava la SUA schermata di accesso
   dentro IAM. La regola c'era; mancava la riga che la facesse valere anche
   qui. */
const lab = fs.readFileSync(path.join(RADICE, 'lab', 'index.html'), 'utf8');

prova('anche Marketing condivide lo storage: persistSession acceso, autoRefreshToken no', () => {
  const src = senzaCommenti(lab);
  deve(/inIframe \? \{ auth: \{ autoRefreshToken: false \} \} : undefined/.test(src),
    'le opzioni del client di Marketing non sono { autoRefreshToken: false } e basta');
  deve(!/persistSession:\s*false/.test(src),
    'persistSession è ancora spento in Marketing: senza storage la sessione di IAM non si vede, e ricompare la richiesta di password');
  return 'ospite: legge lo storage, non rinnova';
});

prova('dentro IAM, Marketing non chiede una seconda password', () => {
  /* Chi è dentro IAM è già entrato. Mettergli davanti la porta d'ingresso di
     un altro programma è dirgli che sono due programmi. */
  const f = senzaCommenti(ritaglia(lab, 'showLogin') || '');
  deve(f, 'showLogin non si ritaglia');
  deve(/if \(inIframe\) return mostraDentroIam\(msg\);/.test(f),
    'dentro il riquadro compare ancora la schermata di accesso a tutto schermo');
  const dentro = ritaglia(lab, 'mostraDentroIam');
  deve(dentro, 'mostraDentroIam non esiste');
  deve(!/type="password"|signInWithPassword/.test(dentro), 'il messaggio dentro IAM chiede una password');
  deve(/location\.reload\(\)/.test(dentro), 'non c\'è modo di riprovare senza uscire');
  return 'dentro IAM: un riquadro che spiega, non una porta';
});

prova('un account non abilitato NON viene buttato fuori anche da IAM', () => {
  /* Il guasto che la correzione qui sopra avrebbe ACCESO. `showBlocked`
     chiamava `db.auth.signOut()`: con lo storage condiviso quella riga
     cancella la sessione di IAM e revoca il refresh token sul server. Chi apre
     Marketing senza essere abilitato si ritroverebbe fuori da tutto — da una
     schermata che doveva solo dirgli «non puoi entrare qui».
     Finché il client non leggeva lo storage il guasto era spento: non c'era
     nessuna sessione da chiudere. */
  const f = senzaCommenti(ritaglia(lab, 'showBlocked') || '');
  deve(f, 'showBlocked non si ritaglia');
  deve(/if \(!inIframe\) \{ try \{ db\.auth\.signOut\(\); \} catch \(_\) \{\} \}/.test(f),
    'showBlocked esce dalla sessione anche dentro IAM: butta fuori da IAM chi non è abilitato a Marketing');
  return 'blocco dentro IAM: niente signOut';
});

prova('il cancello di Marketing resta dov\'è: non è stato toccato', () => {
  /* Chi entra in Marketing è una questione di permessi, e i permessi non si
     cambiano per far funzionare una schermata. La correzione riguarda COME si
     legge la sessione, non CHI può entrare. */
  const src = senzaCommenti(lab);
  deve(/PROFILO\.lab_abilitato === true/.test(src), 'il controllo su lab_abilitato è sparito');
  deve(/SUPER_ADMIN_EMAIL/.test(src), 'l\'eccezione per il super admin è sparita');
  deve(/PROFILO\.attivo === false/.test(src), 'il controllo sull\'account sospeso è sparito');
  return 'lab_abilitato, super admin e account sospeso: invariati';
});

prova('dentro IAM, Marketing non disegna una seconda testata', () => {
  /* La fascia verde con logo, titolo, nome e «Esci» compare SOTTO la testata
     di IAM, che dice già le stesse quattro cose. */
  deve(/\.emb-iam \.top\{display:none;\}/.test(lab), 'la testata di Marketing resta visibile dentro IAM');
  deve(/\.emb-iam #login-screen\{display:none !important;\}/.test(lab),
    'la schermata di accesso può ancora comparire dentro il riquadro');
  deve(/from'\)\s*===\s*'iam'[\s\S]{0,90}window\.self\s*!==\s*window\.top[\s\S]{0,90}add\('emb-iam'\)/.test(lab),
    'la classe emb-iam non si accende da `?from=iam` dentro un riquadro');
  return 'emb-iam: testata e porta d\'ingresso via';
});

prova('la scocca apre Marketing sulla stessa origine, sotto /nuovo-preventivo/', () => {
  /* Se Marketing tornasse su un'altra origine, leggere lo storage non
     funzionerebbe più e servirebbero di nuovo i token nel messaggio: questa
     prova è la sentinella di quel presupposto. */
  deve(/aprireQuoto\(null, \{ base: 'lab\/'/.test(scocca), 'Marketing non si apre più con base «lab/»');
  deve(/var base = QUOTO \+ \(sotto \|\| ''\) \+ '\?from=iam';/.test(scocca),
    'l\'indirizzo del riquadro non è più QUOTO + sotto + ?from=iam');
  return 'lab/ sotto /nuovo-preventivo/, con ?from=iam';
});

console.log('\n══ SESSIONE CONDIVISA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nSESSIONE CONDIVISA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
