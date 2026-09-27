// ═══════════════════════════════════════════════════════════════════════════════
//  IL MOTORE CONTRO IL PORTAFOGLIO VERO
//
//  La suite `portafoglio-stato` prova le regole su casi scelti da me. Questa le
//  prova sulla distribuzione VERA dei 2.547 clienti dell'agenzia, e serve a
//  una cosa sola: impedire che il motore sia giusto sui casi che mi sono
//  venuti in mente e sbagliato su quelli che ci sono davvero.
//
//  È la regola di casa: «le prove che usano valori inventati non vedono i
//  valori veri». La contabilità aveva 31 prove verdi con `'Contante'` e
//  `'Pos'` scritti a mano mentre il database scriveva `carta_credito`.
//
//  COME FUNZIONA. `campioni/portafoglio-forme.json` è un censimento delle
//  FORME dei clienti: quante attive, quante scadute, quante annullate, e
//  quale polizza è finita per ultima. Dentro non c'è un solo dato di un
//  cliente — nessun nome, nessuna targa, nessuna data. Da ogni forma questa
//  suite costruisce un cliente finto con quelle proporzioni, gli chiede il
//  verdetto al motore, e moltiplica per quante volte quella forma ricorre.
//  I quattro totali che vengono fuori devono essere quelli misurati:
//
//      1.925 clienti con almeno una polizza attiva
//        564 clienti persi
//        511 persi al rinnovo (non hanno rinnovato alla scadenza)
//         53 persi per annullamento (hanno disdetto a metà)
//
//  Se il motore cambia una regola e questi numeri si spostano, la suite
//  diventa rossa con il numero nuovo scritto accanto a quello vecchio: si
//  vede subito di quanto ci si è sbagliati, e su quale forma.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const S = require('../../tariffe/motore/portafoglio-stato.js');
const QUI = dirname(fileURLToPath(import.meta.url));
const FORME = JSON.parse(readFileSync(join(QUI, 'campioni', 'portafoglio-forme.json'), 'utf8'));

const OGGI = '2026-09-26';

const esiti = [];
function prova(nome, fn) {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
function deve(c, msg) { if (!c) throw new Error(msg); }

/* ── da una forma a un cliente ─────────────────────────────────────────────
   Le date non contano in sé: conta che la polizza giusta risulti finita per
   ULTIMA, perché è quella che decide il motivo della perdita. Quindi le
   scadenze e gli annullamenti vanno presto nell'anno, e quella indicata da
   `ultime_finite` viene spostata al 01/09/2026 — l'ultimo giorno finito
   prima di oggi. Dove ce ne sono due, finiscono lo stesso giorno: è il caso
   del pari data, che in archivio esiste una volta. */
const FINE = '2026-09-01';

function clienteDallaForma(f) {
  const l = [];
  let n = 0;
  for (let i = 0; i < f.attive; i++) {
    l.push({ id: 'a' + (++n), data_scadenza: '2027-0' + ((i % 9) + 1) + '-15', stato_pagamento: 'pagato' });
  }
  const ultime = f.ultime_finite || [];
  for (let i = 0; i < f.scadute; i++) {
    const ultima = ultime.indexOf('scaduta') >= 0 && i === f.scadute - 1;
    l.push({ id: 's' + (++n), stato_pagamento: 'pagato',
             data_scadenza: ultima ? FINE : '2025-0' + ((i % 9) + 1) + '-10' });
  }
  for (let i = 0; i < f.annullate; i++) {
    const ultima = ultime.indexOf('annullata') >= 0 && i === f.annullate - 1;
    l.push({ id: 'n' + (++n), stato_pagamento: 'annullata',
             data_scadenza: '2027-06-30',
             dati: { ssf: { data_annullamento: ultima ? FINE : '2025-0' + ((i % 9) + 1) + '-20' } } });
  }
  return l;
}

/* ── il conto ──────────────────────────────────────────────────────────── */
const conto = { attivi: 0, persi: 0, alRinnovo: 0, perAnnullamento: 0, polizzeAttive: 0, clienti: 0, altro: [] };
for (const f of FORME.forme) {
  const c = S.statoCliente(clienteDallaForma(f), OGGI);
  conto.clienti += f.clienti;
  conto.polizzeAttive += f.attive * f.clienti;
  if (c.stato === 'attivo') conto.attivi += f.clienti;
  else if (c.stato === 'perso') {
    conto.persi += f.clienti;
    if (c.persoAlRinnovo) conto.alRinnovo += f.clienti;
    if (c.motivoPerdita === 'annullata') conto.perAnnullamento += f.clienti;
  } else conto.altro.push(c.stato + ' su ' + JSON.stringify(f));
}

const T = FORME.totali;

prova('nessuna forma vera finisce in uno stato che non è né attivo né perso', () => {
  /* Se una forma vera cadesse in «da verificare» vorrebbe dire che in
     archivio c'è un buco che il censimento non ha visto. */
  deve(conto.altro.length === 0, conto.altro.join(' | '));
});

prova('il censimento copre tutti i clienti che hanno almeno una polizza', () => {
  const attesi = T.anagrafiche - T.clienti_senza_nessuna_polizza;
  deve(conto.clienti === attesi, conto.clienti + ' forme contate, ' + attesi + ' clienti con polizze');
});

prova('le polizze attive sono 2.332, come le conta il database', () => {
  deve(conto.polizzeAttive === T.polizze_attive,
    'il censimento dice ' + conto.polizzeAttive + ', il database ' + T.polizze_attive);
});

prova('i clienti con almeno una polizza attiva sono 1.925', () => {
  deve(conto.attivi === T.clienti_con_almeno_una_attiva,
    'il motore ne dice ' + conto.attivi + ', misurati ' + T.clienti_con_almeno_una_attiva);
});

prova('i clienti persi sono 564 — non 622, che è il conto sbagliato', () => {
  /* 622 è quello che viene fuori contando anche le 58 anagrafiche che non
     hanno mai avuto una polizza. Sono 58 telefonate a gente che non ci ha
     mai comprato niente, presentate come clienti perduti. */
  deve(conto.persi === T.clienti_persi,
    'il motore ne dice ' + conto.persi + ', misurati ' + T.clienti_persi);
  deve(conto.persi + T.clienti_senza_nessuna_polizza === 622, 'il conto sbagliato non fa più 622: rileggere');
});

prova('i persi al rinnovo sono 511: è la lista da richiamare', () => {
  deve(conto.alRinnovo === T.persi_al_rinnovo,
    'il motore ne dice ' + conto.alRinnovo + ', misurati ' + T.persi_al_rinnovo);
});

prova('i persi per annullamento sono 53: hanno disdetto, non scordato', () => {
  deve(conto.perAnnullamento === T.persi_per_annullamento,
    'il motore ne dice ' + conto.perAnnullamento + ', misurati ' + T.persi_per_annullamento);
});

prova('i due motivi coprono tutti i persi, senza contarne uno due volte', () => {
  deve(conto.alRinnovo + conto.perAnnullamento === conto.persi,
    conto.alRinnovo + ' + ' + conto.perAnnullamento + ' ≠ ' + conto.persi);
});

prova('il cliente col pari data esiste e finisce fra i persi al rinnovo', () => {
  /* Un'annullata e una scaduta finite lo stesso giorno: in archivio è uno.
     È il caso che fa 511 + 53 = 564 invece di 565. */
  const pari = FORME.forme.filter(f => (f.ultime_finite || []).length > 1);
  deve(pari.length === 1, 'forme a pari data: ' + pari.length);
  const c = S.statoCliente(clienteDallaForma(pari[0]), OGGI);
  deve(c.motivoPerdita === 'non_rinnovata', c.motivoPerdita);
});

prova('il campione non porta con sé dati di clienti', () => {
  /* Una prova sulla riservatezza, non sullo stile: un campione che cresce
     finisce per contenere un nome, e quel nome finisce su GitHub. */
  const testo = readFileSync(join(QUI, 'campioni', 'portafoglio-forme.json'), 'utf8');
  const vietati = [/[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]/, /\b[A-Z]{2}\d{3}[A-Z]{2}\b/,
                   /@[a-z0-9.-]+\.[a-z]{2,}/i, /"(nome|cognome|cliente|targa|codice_fiscale|email|telefono)"\s*:/];
  for (const v of vietati) {
    deve(!v.test(testo), 'nel campione c\'è qualcosa che somiglia a un dato personale: ' + v);
  }
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Forme vere del portafoglio: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
