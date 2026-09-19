echo "== ora"; date '+%F %T %Z'
echo "== le caselle di servizio che il sistema legge (indirizzi dell'agenzia, non di clienti)"
cd /opt/withus-backend/server
set -a; . ./.env 2>/dev/null; set +a
rm -rf /tmp/sonda && mkdir -p /tmp/sonda && ln -s /opt/withus-backend/server/node_modules /tmp/sonda/node_modules
cat > /tmp/sonda/q.mjs <<'JS'
import { caselleDisponibili } from '/opt/withus-backend/server/mail.js';
for (const c of caselleDisponibili()) console.log('  ' + c);
JS
node /tmp/sonda/q.mjs 2>&1 | tail -6
rm -rf /tmp/sonda
