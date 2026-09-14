echo "== ora"; date '+%F %T'
git -C /opt/withus-backend log --oneline -1
journalctl -u withus-autopull --since '-8min' --no-pager 2>/dev/null | grep -aE 'aggiorno|riavviat' | tail -6
echo "== stato login"
for pair in "axa 4700" "groupama 4500"; do set -- $pair; printf "%-10s " "$1"; curl -s -m 8 "http://127.0.0.1:$2/loginstate" | head -c 220; echo; done
echo "== il guardiano è andato a prendere il codice?"
journalctl -u withus-backend --since '-10min' --no-pager 2>/dev/null | grep -aiE 'otp-posta|codice|vigilanza|fonti' | tail -15
