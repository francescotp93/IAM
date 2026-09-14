set -u
F=/etc/caddy/Caddyfile
B=/etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
cp -a "$F" "$B" && echo "copia di sicurezza: $B"
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy 2>/dev/null
cat > "$F" <<'CFG'
api.withusassicurazioni.it {
	encode gzip

	# Registro delle richieste — acceso il 14/09/2026.
	# PERCHE': un preventivo impiega 50-80 secondi, e non c'era modo di sapere
	# se l'operatore vede un errore mentre il server ha risposto bene. Il
	# giornale del backend racconta com'e' finita DA DENTRO; questo racconta
	# com'e' finita per chi sta dall'altra parte del filo.
	# COSA NON ENTRA QUI, di proposito: i parametri dell'indirizzo (nei
	# preventivi ci sono targa e data di nascita), gli indirizzi di rete per
	# intero, le intestazioni. Restano rotta, esito e durata: le uniche tre
	# cose che servono a rispondere alla domanda.
	log {
		output file /var/log/caddy/api-access.log {
			roll_size 10MiB
			roll_keep 5
			roll_keep_for 720h
		}
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
echo "== la configurazione sta in piedi?"
if caddy validate --config "$F" --adapter caddyfile >/tmp/val.txt 2>&1; then
  echo "valida"
  systemctl reload caddy && echo "caddy ricaricato (nessuna interruzione)"
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)
  echo "health dal mondo esterno: HTTP $CODE"
  if [ "$CODE" != "200" ]; then
    echo "IL SITO NON RISPONDE — TORNO INDIETRO SUBITO"
    cp -a "$B" "$F"; systemctl reload caddy; sleep 3
    echo "dopo il ripristino: HTTP $(curl -s -o /dev/null -w '%{http_code}' -m 10 https://api.withusassicurazioni.it/health)"
  else
    echo "== cosa ha registrato davvero (deve NON contenere parametri)"
    sleep 1; tail -3 /var/log/caddy/api-access.log 2>/dev/null | cut -c1-500
  fi
else
  echo "CONFIGURAZIONE NON VALIDA — non ricarico niente e rimetto l'originale"
  head -15 /tmp/val.txt; cp -a "$B" "$F"
fi
