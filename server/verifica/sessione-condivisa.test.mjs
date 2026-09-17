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

console.log('\n══ SESSIONE CONDIVISA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nSESSIONE CONDIVISA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
