# L'archivio cifrato sul VPS — note di rilascio

*18/09/2026. Da leggere PRIMA di mettere in servizio la cosa, non dopo.*

---

## 1. La chiave, e perché questa pagina comincia da qui

Da questo rilascio i documenti nuovi del fascicolo non stanno più su Supabase:
stanno sul disco del VPS, **cifrati**. Per riaprirli serve una chiave.

> **Senza quella chiave i documenti non si aprono. Mai più, da nessuno, in
> nessun modo.** Non è un disguido recuperabile con una richiesta di
> assistenza: è la definizione stessa di cifratura. Se la chiave si perde,
> l'archivio è perso.

Questo è il prezzo di avere i documenti cifrati a riposo, ed è il motivo per
cui la copia offline **si fa il giorno in cui si genera la chiave**, non «poi».

### Generarla

Sul VPS, una volta sola:

```bash
openssl rand -base64 32
```

Escono 44 caratteri. Quelli sono la chiave. **Non passarli da una chat, da
un'email o da un messaggio**: si generano sul server e si copiano da lì.

### Metterla nell'ambiente del backend

```bash
sudo systemctl edit withus-backend      # oppure il file d'ambiente già in uso
```

```ini
[Service]
Environment="ARCHIVIO_CHIAVE=<i 44 caratteri>"
Environment="ARCHIVIO_DIR=/var/lib/withus/archivio"
```

```bash
sudo systemctl daemon-reload && sudo systemctl restart withus-backend
```

### La copia offline

Una copia va **fuori dal server**, perché il caso da cui ci si sta difendendo
è proprio il server che si perde:

- scritta a mano su carta, in cassaforte in agenzia, con la data e la dicitura
  «chiave archivio documenti IAM — senza questa i documenti non si aprono»;
- oppure in un gestore di password aziendale, se ce n'è uno.

**Non nel repository. Non nel database. Non in un file sul VPS accanto ai
documenti** — una chiave custodita accanto a ciò che protegge non protegge
niente.

### Come si controlla che sia a posto

```bash
curl -s https://api.withusassicurazioni.it/diag | grep -o '"archivio":[a-z]*'
```

Se il backend parte **senza** chiave, non si rompe e non finge: scrive nel
registro `archivio cifrato spento: ARCHIVIO_CHIAVE non è configurata`, e ogni
caricamento risponde `503` dicendo esattamente questo. Non esiste un ripiego
che «intanto salva lo stesso»: sarebbe un archivio che crede di essere cifrato.

---

## 2. La cartella dei documenti

```bash
sudo mkdir -p /var/lib/withus/archivio
sudo chown withus:withus /var/lib/withus/archivio   # l'utente del servizio
sudo chmod 700 /var/lib/withus/archivio
```

**Deve stare fuori da `/opt/withus-backend`**, che Caddy serve come sito: un
file scritto lì dentro sarebbe scaricabile da un indirizzo — cifrato, ma
scaricabile da chiunque. Il backend lo controlla da solo e si rifiuta di
partire con una cartella dentro la radice servita (`radiceConsentita`), ma è
bene saperlo anche qui, perché il giorno in cui qualcuno sposterà la cartella
per fare spazio, questo è il file che leggerà.

I file dentro sono scritti con permessi `600`: cifrati **e** leggibili solo
dall'utente del servizio. Le due cose insieme, perché sono due difese diverse.

---

## 3. Il backup

I documenti cifrati sono file come gli altri: un backup del disco li copia. Ma
un backup che copia i file **senza la chiave non serve a niente**, e un backup
che copia i file **con la chiave accanto** annulla la cifratura.

La regola: **i file nel backup, la chiave in cassaforte.** Chi ripristina deve
avere tutti e due, e devono arrivare da due strade diverse.

*(L'esportazione verso Mega è fuori dal perimetro di questo rilascio: qui c'è
solo il caricamento e l'apertura.)*

---

## 4. Che cosa cambia per chi lavora

**Niente, ed è voluto.** Il fascicolo carica e apre come prima. Sotto:

| | prima | adesso |
|---|---|---|
| dove sta il file | Supabase Storage | disco del VPS, cifrato |
| che cosa si salva nel database | il percorso (`polizze/…`) | un riferimento (`vps:<id>`) |
| come si apre | indirizzo firmato che scade in 5 minuti | richiesta col proprio accesso, decifrata in memoria |

**I documenti caricati prima di oggi restano dove sono e si aprono come
sempre.** Le due strade convivono, e il valore salvato dice da solo quale
prendere. Non c'è migrazione, e non è un rinvio: è la scelta che permette di
rilasciare senza fermare niente.

---

## 5. Se qualcosa va storto

| sintomo | causa quasi certa | cosa fare |
|---|---|---|
| «Archivio cifrato non disponibile: ARCHIVIO_CHIAVE…» | chiave non configurata, o riavvio senza ambiente | rimettere la variabile e riavviare |
| «Archivio cifrato non disponibile: … radice servita…» | `ARCHIVIO_DIR` sta dentro `/opt/withus-backend` | spostarla fuori |
| «Il documento non si apre: il contenuto non supera il controllo di integrità» | il file sul disco è stato toccato, o la chiave è cambiata | **non è un errore da ignorare**: se la chiave è quella giusta, quel file è stato modificato |
| «Documento non trovato» su un documento che esiste | chi guarda non ha il permesso di vederlo | è il comportamento voluto: la stessa risposta per «non c'è» e «non è tuo» |
| il documento si apre ma la pagina è quella di IAM | manca `/archivio/*` fra i percorsi di servizio di Caddy | `deploy/caddy/iam.caddy`, riga `@servizi` |

---

## 6. Il controllo sul campo, dopo il rilascio

Tre cose, in quest'ordine, e nessuna si può fare da qui:

1. **caricare** un documento nel fascicolo di una polizza e **riaprirlo**:
   deve tornare identico;
2. **guardare il file sul disco** (`sudo head -c 64 /var/lib/withus/archivio/…`):
   deve cominciare con `WUS1` e non deve contenere niente di leggibile;
3. **aprire un documento caricato prima di oggi**: deve continuare ad aprirsi
   dalla strada di Supabase.

Il resto — chiave assente, chiave sbagliata, byte manomesso, apertura senza
sessione, apertura da chi non ha diritto, cartella dentro il sito — è provato
in `server/verifica/archivio-vps.test.mjs`, ognuno con la sua controprova.
