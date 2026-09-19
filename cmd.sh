echo "== ora"; date '+%F %T %Z'
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/v.mjs <<'JS'
import { caselleDisponibili, conImap } from '/opt/withus-backend/server/mail.js';
import { simpleParser } from 'mailparser';
import { mittenteAtteso, estraiCodice } from '/opt/withus-backend/server/otpPosta.js';

const caselle = caselleDisponibili();
console.log('PROVA 1 — il server vede la casella?');
console.log('  caselle configurate: ' + caselle.length);
for (const c of caselle) console.log('    ' + c);
const nuova = caselle.find(c => /withus\.coop@gmail\.com/i.test(c));
console.log(nuova ? '  ESITO: SI, c\'e\'' : '  ESITO: NO, non risulta ancora');
if (!nuova) process.exit(0);

console.log('\nPROVA 2 — riesce a collegarsi davvero?');
let ok = false;
try {
  await conImap(nuova, async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try { console.log('  collegato. INBOX: ' + (client.mailbox ? client.mailbox.exists : 0) + ' messaggi'); ok = true; }
    finally { lock.release(); }
  });
} catch (e) { console.log('  ESITO: NO — ' + String(e && e.message || e).slice(0, 200)); }
if (!ok) process.exit(0);
console.log('  ESITO: SI');

console.log('\nPROVA 3 — ci trova dentro i codici di Groupama?');
const filtro = mittenteAtteso('c-groupama');
let visti = 0, conCodice = 0;
try {
  await conImap(nuova, async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const tot = client.mailbox ? client.mailbox.exists : 0;
      const da = Math.max(1, tot - 29);
      for await (const m of client.fetch(da + ':*', { source: true, internalDate: true })) {
        const p = await simpleParser(m.source).catch(() => null);
        if (!p) continue;
        const mit = p.from && p.from.value && p.from.value[0] ? String(p.from.value[0].address || '') : '';
        const dom = (mit.split('@')[1] || '').toLowerCase();
        if (!filtro.test(dom) && !filtro.test(mit)) continue;
        visti++;
        const cod = estraiCodice([p.subject, p.text].filter(Boolean).join('\n'));
        if (cod) conCodice++;
        if (visti <= 5) console.log('    ' + new Date(m.internalDate).toISOString().replace('T',' ').slice(0,19)
          + '  da ' + mit + '  → codice ' + (cod ? 'TROVATO (non lo stampo)' : 'NON riconosciuto nel testo'));
      }
    } finally { lock.release(); }
  });
} catch (e) { console.log('  errore: ' + String(e && e.message || e).slice(0,160)); }
console.log('  mail da Groupama negli ultimi 30 messaggi: ' + visti + ', di cui con un codice leggibile: ' + conCodice);
console.log(visti && conCodice ? '  ESITO: SI — la catena puo\' chiudersi' : (visti ? '  ESITO: le mail ci sono ma il codice non si legge: serve una regola nuova' : '  ESITO: nessuna mail di Groupama fra gli ultimi 30 messaggi'));
JS
node /tmp/sonda/v.mjs 2>&1 | tail -30
rm -rf /tmp/sonda
