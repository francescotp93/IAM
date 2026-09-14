echo "== ora"; date '+%F %T'
git -C /opt/withus-backend log --oneline -1
journalctl -u withus-autopull --since '-8min' --no-pager 2>/dev/null | grep -aE 'aggiorno|riavviat' | tail -5
echo "== il pezzo è vivo nel file in produzione? (deve stare PRIMA di !conRientro)"
grep -n "fermoAlCodice(statoOra\|if (!conRientro)" /opt/withus-backend/server/fontiWatchdog.js
echo "== stato login"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 8 "http://127.0.0.1:$2/loginstate" | head -c 200; echo; done
echo "== primo giro del guardiano col codice nuovo"
journalctl -u withus-backend --since '-8min' --no-pager 2>/dev/null | grep -aiE 'vigilanza|otp-posta' | tail -8
