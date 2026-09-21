pid=$(systemctl show withus-backend -p MainPID --value 2>/dev/null)
echo "pid backend: ${pid:-(non trovato)}"
if [ -n "$pid" ] && [ -r "/proc/$pid/environ" ]; then
  echo "== nomi delle variabili viste DAL PROCESSO, con la sola lunghezza del valore =="
  tr '\0' '\n' < "/proc/$pid/environ" | awk -F= '{n=$1; v=substr($0,length(n)+2); printf "%s : %d\n", n, length(v)}' | sort
else
  echo "non leggibile"
fi
echo
echo "== il modulo archivio risponde? =="
curl -s -o /dev/null -w 'POST /archivio/carica -> %{http_code}\n' -X POST http://127.0.0.1:8080/archivio/carica 2>/dev/null
curl -s http://127.0.0.1:8080/archivio/carica -X POST 2>/dev/null | head -c 300
echo
echo "== avvisi all'avvio nei log =="
journalctl -u withus-backend -n 200 --no-pager 2>/dev/null | grep -i "archivio" | tail -10
