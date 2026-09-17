echo "aspetto il rilascio e un giro di vigilanza"; sleep 200
echo "== ora"; date '+%F %T'
echo "== HEAD: $(git -C /opt/withus-backend rev-parse --short HEAD)"
echo "== il riconoscimento del nome c'è? $(grep -c 'mittenteAtteso' /opt/withus-backend/server/otpPosta.js /opt/withus-backend/server/fonti.js | tr '\n' ' ')"
echo "== stato groupama"; curl -s -m 12 http://127.0.0.1:4500/loginstate | head -c 200; echo
echo "== IL PUNTO: righe [otp-posta]"
journalctl -u withus-backend --since '-6min' --no-pager 2>/dev/null | grep -aiE 'otp-posta|vigilanza-fonti' | tail -8
