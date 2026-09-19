U=https://iam.withusassicurazioni.it
R="--resolve iam.withusassicurazioni.it:443:127.0.0.1"
cd /opt/withus-backend
echo "=== commit ==="; git log --oneline -1
echo "=== il preventivatore servito ha la correzione? ==="
Q=$(curl -sSk $R $U/nuovo-preventivo/ 2>/dev/null)
for m in 'prevStatoBadge' 'chiusa:{label' 'rigaSicura'; do printf '  %-18s %s\n' "$m" "$(echo "$Q" | grep -c "$m")"; done
echo "=== IAM servito: targhetta versione ==="
P=$(curl -sSk $R $U/ 2>/dev/null)
for m in 'um-versione' 'mostraVersioneInUso' 'build 2026-06-15c'; do printf '  %-20s %s\n' "$m" "$(echo "$P" | grep -c "$m")"; done
