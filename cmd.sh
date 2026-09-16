ATTESO=ff26950
for i in $(seq 1 40); do
  H=$(git -C /opt/withus-backend rev-parse --short=7 HEAD 2>/dev/null)
  [ "$H" = "$ATTESO" ] && [ -f /var/lib/withus-autopull/30-rinomina-repo-iam.sh.fatto ] && break
  sleep 5
done
echo "== HEAD backend: $H (atteso $ATTESO) dopo ~$((i*5)) s"
echo "== segnalino:"; ls -la /var/lib/withus-autopull/ | grep -E "30-rinomina|20-dominio" 
echo "== log dello script:"; cat /var/lib/withus-autopull/30-rinomina-repo-iam.sh.log 2>/dev/null || echo "(nessun log ancora)"
echo "== remoti:"
for d in /opt/withus-backend /opt/withus-cmd; do printf '%s -> ' "$d"; git -C "$d" remote get-url origin | sed 's#//[^@]*@#//***@#'; done
echo "== /opt/withus-iam:"; [ -d /opt/withus-iam ] && du -sh /opt/withus-iam || echo "non c'e'"
echo "== Caddy nomina withus-iam?"; curl -fsS http://127.0.0.1:2019/config/ | grep -c "withus-iam" || true
echo "== ultimo autopull:"; journalctl -u withus-autopull --no-pager -n 12 2>/dev/null | tail -12 || tail -12 /var/log/withus-autopull.log 2>/dev/null
echo "== cmd-runner.sh sul disco:"; grep -n "^REPO_PATH" /opt/withus-backend/deploy/cmd-runner.sh
echo "== siti in piedi:"; for u in https://iam.withusassicurazioni.it/ https://iam.withusassicurazioni.it/nuovo-preventivo/ https://api.withusassicurazioni.it/health; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
