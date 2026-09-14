set -u
F=/etc/caddy/Caddyfile
B=/etc/caddy/Caddyfile.buona-$(date +%Y%m%d-%H%M%S)
cp -a "$F" "$B"; echo "copia: $B"
python3 - <<'PY'
import io
p='/etc/caddy/Caddyfile'; s=io.open(p,encoding='utf-8').read()
v = '\t\t\t\trequest>headers delete\n'
n = ('\t\t\t\trequest>headers delete\n'
     '\t\t\t\t# Anche questo e\' l\'indirizzo di chi chiama, sotto un altro nome:\n'
     '\t\t\t\t# mascherarne uno solo e lasciare l\'altro non maschera niente.\n'
     '\t\t\t\trequest>client_ip ip_mask 16 64\n'
     '\t\t\t\t# Le intestazioni di risposta non servono a capire com\'e\' andata,\n'
     '\t\t\t\t# e una di loro puo\' portarsi dietro un cookie di sessione.\n'
     '\t\t\t\tresp_headers delete\n')
assert s.count(v)==1
io.open(p,'w',encoding='utf-8').write(s.replace(v,n,1))
print("configurazione aggiornata")
PY
if ! caddy validate --config "$F" --adapter caddyfile >/tmp/v.txt 2>&1; then
  echo "NON VALIDA — rimetto indietro"; head -12 /tmp/v.txt; cp -a "$B" "$F"; exit 0; fi
if systemctl reload caddy; then echo "RICARICAMENTO RIUSCITO"; else
  echo "RICARICAMENTO FALLITO — rimetto indietro"; journalctl -u caddy --since '-2min' --no-pager | grep -ai error | tail -3
  cp -a "$B" "$F"; systemctl reload caddy; exit 0; fi
sleep 2
echo "health: HTTP $(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://api.withusassicurazioni.it/health?targa=XX000XX&nascita=01/01/1980")"
sleep 2
echo "== la riga registrata adesso:"
journalctl -u caddy --since '-1min' --no-pager | grep -a 'handled request' | tail -1 | cut -c1-600
