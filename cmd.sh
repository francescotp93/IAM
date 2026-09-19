echo "== commit su /opt/withus-backend"; git log --oneline -1
echo "== ultimo autopull"; tail -3 /var/log/withus-autopull.log 2>/dev/null || journalctl -u withus-autopull --no-pager -n 3 2>/dev/null | tail -3
echo "== M1..M5 nel codice servito"
for k in 'reg-ultima' 'pf-date-su' 'rin-card-sub' 'cpl-oggi' 'tit-chi-paga' 'page-foglio-cassa'; do printf '%s: ' "$k"; grep -c "$k" index.html; done
for f in anagrafica.js foglio-cassa.js; do printf '%s: ' "$f"; test -f tariffe/motore/$f && echo presente || echo ASSENTE; done
echo "== md5 index.html"; md5sum index.html | cut -c1-12
