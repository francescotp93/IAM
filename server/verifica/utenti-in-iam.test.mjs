// ═══════════════════════════════════════════════════════════════════════════════
//  UTENTI SI GESTISCONO IN IAM — passo 3, tessera 2 (17/09/2026)
//
//  Perche' esiste. Fino al 17/09/2026 QUOTO aveva una seconda gestione utenti
//  (account, ruoli, permessi, sospensioni) che scriveva iam_utenti con regole
//  diverse da quelle di IAM: due schermate sulla stessa tabella, la classe di
//  bug piu' frequente del confine (INTERFACCIA-QUOTO-IAM.md §1, «doppio
//  cancello»). Da oggi iam_utenti la scrive IAM; QUOTO la legge e, per le sole
//  cose che IAM non ha (i punti vendita), tocca due colonne: rete e responsabile.
//
//  Queste prove sorvegliano che nessuno rimetta dentro QUOTO una scrittura su
//  iam_utenti «perche' serviva al volo». Se un giorno serve, si fa in IAM.
//
//  Controprova: QUOTO_INDEX=<index.html di prima> node questo file -> rosse.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => fs.readFileSync(f, 'utf8');
const index = leggi(process.env.QUOTO_INDEX || path.join(RADICE, 'index.html'));
const scocca = leggi(process.env.SCOCCA_JS || path.join(RADICE, 'iam/withus-one.js'));
const contratto = leggi(path.join(RADICE, 'INTERFACCIA-QUOTO-IAM.md'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };
const senzaCommenti = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
const codice = senzaCommenti(index);

// ── 1. La seconda gestione utenti non c'e' piu' ───────────────────────────────
prova('QUOTO non ha piu\' una gestione utenti sua (account, ruoli, permessi)', () => {
  const spariti = ['function loadUtenti', 'function renderUtenti', 'function openCreaUtente', 'function impostaRuolo',
                   'function openPermessi', 'function openModificaUtente', 'id="utenti-list"'];
  const rimasti = spariti.filter(n => index.includes(n));
  deve(!rimasti.length, 'ancora presenti: ' + rimasti.join(', '));
  return 'niente account, ruoli o permessi in QUOTO';
});

// ── 2. Su iam_utenti QUOTO scrive SOLO le colonne dei punti vendita ──────────
prova('su iam_utenti QUOTO scrive solo rete e responsabile (i punti vendita, che IAM non ha)', () => {
  deve(!/iam_utenti'\)\s*\.\s*(insert|upsert|delete)\s*\(/.test(codice), 'QUOTO crea o cancella righe di iam_utenti');
  const AMMESSE = new Set(['rete', 'responsabile']);
  const scritture = [...codice.matchAll(/iam_utenti'\)\s*\.\s*update\s*\(\s*\{([^}]*)\}/g)];
  deve(scritture.length, 'nessuna scrittura trovata: o i punti vendita sono spariti, o la sintassi e\' cambiata e la prova non li vede piu\'');
  const fuori = [];
  for (const m of scritture) {
    const chiavi = m[1].split(',').map(x => x.split(':')[0].trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    chiavi.forEach(k => { if (!AMMESSE.has(k)) fuori.push(k); });
  }
  deve(!fuori.length, 'QUOTO scrive colonne di iam_utenti che sono di IAM: ' + [...new Set(fuori)].join(', '));
  return scritture.length + ' scritture, tutte su rete/responsabile';
});

// ── 3. L'elenco si legge, e non solo aprendo la pagina ───────────────────────
prova('l\'elenco operatori si carica all\'accesso, non solo aprendo la pagina utenti', () => {
  deve(/async function caricaUtentiIam\(\)/.test(codice), 'manca caricaUtentiIam');
  const initMain = (codice.match(/function initMain\(\)\s*\{[\s\S]*?\n\}/) || [''])[0];
  deve(initMain, 'non trovo initMain');
  deve(/caricaUtentiIam\(\)/.test(initMain), 'initMain non carica l\'elenco: il menu «assegna a» delle richieste resta vuoto a chi non apre la pagina');
  deve(/\.select\('id,nome,cognome,email,ruolo,attivo,rete,responsabile'\)/.test(codice), 'la lettura non e\' a colonne dichiarate (select *)');
  return 'caricato in initMain, colonne dichiarate';
});

// ── 4. La pagina rimanda a IAM, sul canale, con destinazione dichiarata ──────
prova('la pagina rimanda a IAM → Utenti con quoto-apri, mai verso \'*\'', () => {
  const pagina = (index.match(/<div class="page" id="page-utenti">[\s\S]*?<div class="users-card"/) || [''])[0];
  deve(pagina, 'non trovo #page-utenti');
  deve(/apriUtentiInIam\(\)/.test(pagina) && /IAM/.test(pagina), 'la pagina non rimanda a IAM');
  const fn = (codice.match(/function apriUtentiInIam\(\)\s*\{[\s\S]*?\n\}/) || [''])[0];
  deve(fn, 'manca apriUtentiInIam');
  deve(/w1:\s*'quoto-apri'/.test(fn) && /tab:\s*'utenti'/.test(fn), 'il messaggio non e\' quoto-apri con tab utenti');
  deve(!/postMessage\([^)]*'\*'/.test(fn), 'postMessage verso \'*\': chiunque incornici la pagina riceverebbe il messaggio');
  deve(/PONTE_IAM\s*\|\|\s*IAM_ORIGINI\[0\]/.test(fn), 'la destinazione non e\' l\'origine di IAM verificata');
  return 'quoto-apri → IAM, destinazione dichiarata';
});

// ── 5. La scocca apre solo schermate da un elenco chiuso ─────────────────────
prova('la scocca di IAM accetta quoto-apri solo per schede in elenco chiuso, dopo i controlli di origine', () => {
  const s = senzaCommenti(scocca);
  const i = s.indexOf("d.w1 === 'quoto-apri'");
  deve(i >= 0, 'la scocca non gestisce quoto-apri');
  const prima = s.slice(0, i);
  deve(/ev\.origin !== QUOTO_ORIGIN\) return/.test(prima) && /ev\.source !== fr\.contentWindow\) return/.test(prima),
    'quoto-apri viene letto prima dei controlli su origine e sorgente');
  const blocco = s.slice(i, i + 500);
  deve(/APRIBILI\s*=\s*\{[^}]*utenti:\s*'utenti'/.test(blocco), 'manca l\'elenco chiuso APRIBILI con utenti');
  deve(/goTab\(t\)/.test(blocco) && !/goTab\(d\.tab/.test(blocco) && !/goTab\(String\(d\.tab/.test(blocco),
    'il nome ricevuto passa a goTab cosi\' com\'e\': un messaggio potrebbe aprire qualunque scheda');
  return 'elenco chiuso, dopo origine e sorgente';
});

// ── 6. Il contratto lo dice ──────────────────────────────────────────────────
prova('il contratto elenca quoto-apri e la mappa di chi possiede quale schermata', () => {
  deve(/\|\s*4\s*\|[^\n]*quoto-apri/.test(contratto), 'manca il passo 4 (quoto-apri) nella tabella §2.1');
  deve(/REGOLA:\*\*[\s\S]{0,200}`quoto-apri`/.test(contratto), 'la REGOLA non elenca quoto-apri fra i nomi del contratto');
  deve(/### 2\.7 Chi possiede quale schermata/.test(contratto), 'manca §2.7');
  deve(/\*\*Utenti\*\*[^\n]*\|\s*\*\*IAM\*\*/.test(contratto), '§2.7 non dice che Utenti e\' di IAM');
  return '§2.1 passo 4, REGOLA, §2.7';
});

console.log('\n══ UTENTI IN IAM ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nUTENTI IN IAM: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
