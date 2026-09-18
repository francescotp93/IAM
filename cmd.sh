echo "== il VPS ha preso tutto? =="
echo -n "commit: "; git -C /opt/withus-backend log --oneline -1 2>&1
echo -n "contrassegno di versione nella scocca: "; grep -c "versioneQuoto" /opt/withus-backend/iam/withus-one.js 2>&1
echo -n "disinnesco in QUOTO:                   "; grep -c "archDisinnesca" /opt/withus-backend/index.html 2>&1
echo -n "archivio nella scocca di IAM:          "; grep -c "archApri" /opt/withus-backend/iam/index.html 2>&1
echo -n "la scocca è chiesta con ?v=20260918:   "; grep -c "withus-one.js?v=20260918" /opt/withus-backend/iam/index.html 2>&1
echo
echo "== header, di nuovo =="
for u in "https://iam.withusassicurazioni.it/" "https://iam.withusassicurazioni.it/nuovo-preventivo/"; do
  echo -n "   $u → "; curl -sS -o /dev/null -D - --max-time 20 "$u" 2>&1 | grep -i "^cache-control" | tr -d '\r'
done
