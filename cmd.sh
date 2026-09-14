set -u
F=/etc/caddy/Caddyfile
B=/etc/caddy/Caddyfile.buona-$(date +%Y%m%d-%H%M%S)
cp -a "$F" "$B"; echo "copia della configurazione funzionante: $B"
cat > "$F" <<'CFG'
api.withusassicurazioni.it {
	encode gzip

	# Registro delle richieste — acceso il 14/09/2026.
	# PERCHE': un preventivo impiega 50-80 secondi, e non c'era modo di sapere
	# se l'operatore vede un errore mentre il server ha risposto bene. Il
	# giornale del backend racconta com'e' andata DA DENTRO; questo racconta
	# com'e' andata per chi sta dall'altra parte del filo.
	# VA NEL GIORNALE DI SISTEMA, non in un file: il servizio gira con
	# ProtectSystem=full e non puo' scrivere in /var/log (provato il 14/09:
	# "permission denied", ricaricamento fallito). Cosi' non serve allargare i
	# permessi del servizio per un registro diagnostico, e la rotazione la fa
	# gia' journald.  Si legge con:  journalctl -u caddy | grep handled
	# COSA NON ENTRA QUI, di proposito: i parametri dell'indirizzo (nei
	# preventivi ci sono targa e data di nascita), gli indirizzi di rete per
	# intero, le intestazioni. Restano rotta, esito e durata.
	log {
		output stderr
		format filter {
			wrap json
			fields {
				request>uri regexp "\?.*" "?[parametri non registrati]"
				request>remote_ip ip_mask 16 64
				request>headers delete
			}
		}
	}

	reverse_proxy localhost:3000
}
CFG
if ! caddy validate --config "$F" --adapter caddyfile >/tmp/val.txt 2>&1; then
  echo "NON VALIDA — rimetto l'originale, non ricarico"; head -12 /tmp/val.txt; cp -a "$B" "$F"; exit 0
fi
echo "configurazione valida"
if systemctl reload caddy; then
  echo "RICARICAMENTO RIUSCITO"
else
  echo "RICARICAMENTO FALLITO — rimetto l'originale e ricarico"
  journalctl -u caddy --since '-2min' --no-pager | grep -ai 'error' | tail -3
  cp -a "$B" "$F"; systemctl reload caddy
  echo "health dopo il ripristino: HTTP $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)"
  exit 0
fi
sleep 2
echo "== prova con parametri finti, per vedere cosa viene registrato"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://api.withusassicurazioni.it/health?targa=XX000XX&nascita=01/01/1980")
echo "health (con parametri finti): HTTP $CODE"
sleep 2
echo "== la riga registrata:"
journalctl -u caddy --since '-1min' --no-pager | grep -a 'handled request' | tail -2 | cut -c1-700
if [ "$CODE" != "200" ]; then
  echo "IL SITO NON RISPONDE — torno indietro"; cp -a "$B" "$F"; systemctl reload caddy
fi
