# Il registro delle richieste di Caddy

Acceso il **14/09/2026**. Vive in `/etc/caddy/Caddyfile`, cioè **fuori da questo
repository**: se un giorno quella macchina va rifatta, questo file è l'unico
posto dove è scritto cosa c'era e perché.

---

## Perché esiste

Un preventivo su QUOTO impiega **fra i 50 e gli 80 secondi**. Misurato sulle
quattro chiamate ricevute fra il 9 e l'11 settembre 2026:

| quando | esito | durata |
|---|---|---|
| 09/09 17:31 | 200 | 61,2 s |
| 10/09 17:14 | 200 | 50,6 s |
| 11/09 09:31 | 502 | 48,1 s |
| 11/09 15:20 | 502 | 60,4 s |

Il giornale del backend dice com'è finita **da dentro**: quella del 9 settembre
risulta riuscita, `200`. Ma non diceva niente su cosa avesse visto l'operatore.
Se qualcosa in mezzo — un proxy, un browser, una rete — avesse chiuso la
richiesta al sessantesimo secondo, per lui sarebbe stato un errore e per noi un
successo, e nessuno se ne sarebbe mai accorto.

Davanti al backend c'è **Caddy**, e la sua configurazione era di 74 byte: nessun
limite di tempo (quindi il taglio a 60 secondi non è scritto da nessuna parte) e
**nessun registro delle richieste**. Non si poteva né confermare né escludere.
Da qui in avanti si può.

---

## Cosa NON ci finisce, di proposito

Questa è la parte che non va toccata senza pensarci.

I preventivi passano i parametri nell'indirizzo — `?targa=…&nascita=…` — quindi
un registro acceso com'è di serie **aggiungerebbe dati dei clienti a un file che
oggi non ne contiene**. Il giornale del backend, non a caso, annota
`GET /moto/premio 200 61237ms` e si ferma lì.

Perciò il registro è filtrato:

| campo | cosa gli si fa | perché |
|---|---|---|
| `request>uri` | i parametri diventano `?[parametri non registrati]` | lì dentro ci sono targa e data di nascita |
| `request>remote_ip` | mascherato (`ip_mask 16 64`) | è l'indirizzo di chi chiama |
| `request>client_ip` | mascherato | **è lo stesso dato sotto un altro nome**: mascherarne uno solo non maschera niente |
| `request>headers` | rimosse | possono portare cookie e autorizzazioni |
| `resp_headers` | rimosse | una di loro può portarsi dietro un cookie di sessione |

Restano rotta, metodo, esito, durata e dimensione: le uniche cose che servono a
rispondere alla domanda per cui il registro è stato acceso.

---

## Come si legge

```bash
journalctl -u caddy | grep 'handled request'
# le più lente delle ultime 24 ore:
journalctl -u caddy --since '-24h' -o cat | grep 'handled request' \
  | jq -r 'select(.duration > 30) | "\(.request.uri) \(.status) \(.duration)s"'
```

Va nel **giornale di sistema**, non in un file. Non è una scelta di stile: il
servizio gira con `ProtectSystem=full` e non può scrivere in `/var/log`
(provato il 14/09: `permission denied`, e il ricaricamento è fallito). Mandarlo
a journald evita di allargare i permessi del servizio per un registro
diagnostico, e la rotazione la fa già il sistema.

---

## Come si tocca, senza fare danni

`caddy validate` **non basta**: controlla che la configurazione sia scritta
bene, non che il sistema riesca a metterla in funzione. Il 14/09 è passata la
validazione e il ricaricamento è fallito lo stesso, per i permessi.

E il controllo che sembra ovvio — «il sito risponde?» — è quello sbagliato: un
ricaricamento fallito lascia in funzione la configurazione **precedente**,
quindi il sito risponde comunque. Rispondere `200` non distingue *«ha
funzionato»* da *«non è cambiato niente»*.

La sequenza giusta:

```bash
cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.buona-$(date +%Y%m%d-%H%M%S)
# …modifica…
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile   # deve passare
systemctl reload caddy                                             # DEVE riuscire: guarda l'esito
curl -s "https://api.withusassicurazioni.it/health?prova=1"
journalctl -u caddy --since '-1min' | grep 'handled request' | tail -1
```

L'ultima riga è la verifica vera: se la richiesta appena fatta **compare nel
registro**, la configurazione nuova è in funzione. Se non compare, non lo è —
per quanto il sito risponda bene.

`reload` ricarica senza interrompere il servizio: il sito non va giù nemmeno un
istante. Le copie di sicurezza restano in `/etc/caddy/Caddyfile.buona-*`.
