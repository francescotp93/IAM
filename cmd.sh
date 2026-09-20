cd /opt/withus-backend || exit 1
date
echo "== commit locale =="; git log --oneline -1
echo "== remoto =="; git fetch -q origin main 2>&1 | tail -2; git log --oneline -1 origin/main
echo "== autopull =="; tail -12 /var/log/withus-autopull.log 2>/dev/null || journalctl -u withus-autopull -n 12 --no-pager 2>/dev/null || echo "nessun log noto"
