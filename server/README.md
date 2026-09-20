# withus-backend

Backend di servizio per le app **IAM** e **QUOTO**. Base su cui costruire:
- **Mail** (lettura via IMAP + invio via SMTP, caselle Aruba) — modulo "Posta" in IAM.
- **Pagamenti** (PayPal + Axerve/Fabrick) in QUOTO.

Il sito (GitHub Pages) è statico e non può parlare con i server di posta/pagamento:
ci pensa questo backend, sempre acceso, che espone un'API sicura alle app.

## ⚠️ Render NON è più la produzione (dal 16/09/2026)

Le istruzioni qui sotto raccontano **la prima casa** di questo backend, quando
stava sul piano gratuito di Render. **Non è più così.**

| | |
|---|---|
| dove gira oggi | il **VPS OVH**, dietro Caddy, su `api.withusassicurazioni.it` |
| come ci arriva il codice | `deploy/autopull.sh`, che tira `main` ogni minuto in `/opt/withus-backend` |
| chi lo chiama | `PAY_API` in `index.html` e `MAIL_API` in `iam/index.html` — tutti e due puntano a `api.withusassicurazioni.it` |
| quante volte compare `onrender.com` nel codice | **zero** |

Il trasloco è raccontato in `deploy/TRASLOCO-OVH.md` e `deploy/DOMINIO-UNICO.md`.

**Se arrivano email da Render**, è un servizio rimasto acceso e collegato a
questo repository: a ogni push su `main` prova a ricostruire qualcosa che
nessuno usa, e avvisa. Si spegne dal pannello di Render — *Settings → Delete
Web Service* sul servizio `withus-backend`, oppure *Suspend* se si vuole
tenerlo lì. Nel repository non c'è niente da cambiare: non esiste un
`render.yaml`, il collegamento vive solo nel loro pannello.

Queste istruzioni restano per la storia, e perché il piano gratuito di Render
è ancora il modo più veloce di rimettere in piedi il backend altrove se il VPS
sparisse.

## Deploy su Render (storico — non è la produzione)

1. Vai su **render.com** → registrati / accedi **con GitHub**.
2. **New +** → **Web Service** → collega il repo **`francescotp93/IAM`** (fino al 16/09/2026 si chiamava `QUOTE`).
3. Configura:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. (Facoltativo) In **Environment** puoi lasciare i default; `CORS_ORIGINS` è già impostato per i tuoi domini.
5. **Create Web Service.** Render installa e avvia: otterrai un URL tipo
   `https://withus-backend.onrender.com`.
6. **Verifica:** apri quell'URL nel browser → deve rispondere
   `{"status":"ok","service":"withus-backend",...}`.

> Nota: il piano Free "va in pausa" dopo ~15 min di inattività e al primo accesso
> successivo impiega ~30-60 secondi a risvegliarsi. Va benissimo per iniziare.

Quando l'URL risponde "ok", comunicalo: da lì aggiungiamo gli endpoint della **posta**.
