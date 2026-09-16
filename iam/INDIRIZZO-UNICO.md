# Indirizzo unico — iam.withusassicurazioni.it

Deciso da Francesco il 28 luglio 2026. Questo ramo (`leo/indirizzo-unico`) fa
sparire il secondo indirizzo: da qui in avanti il collaboratore resta sempre su
`iam.withusassicurazioni.it`, anche mentre preventiva.

## Cosa cambia, in tre file

**`vercel.json`** — aggiunte le riscritture. `/nuovo-preventivo/*` porta
all'applicazione di quotazione sul server OVH; i ventitré percorsi di servizio
che il preventivatore chiama in modo assoluto (`/api`, `/sign`, `/fonti`,
`/moto`, `/pay`, `/shop`, `/crm`, `/lead`, `/notify`, `/preventivi`, `/catalogo`,
`/products`, `/public`, `/scrape`, `/mail`, `/auth`, `/user`, `/login`,
`/backup`, `/diag`, `/health`, `/l`, `/firma-collab`) vengono inoltrati allo
stesso server. L'elenco non è stato indovinato: è preso dalle rotte dichiarate
in `api/index.js` e `server/*.js` del repository QUOTE. Nessuno di questi
percorsi era occupato da IAM, che è un sito statico senza rotte proprie.

**`withus-one.js`** — la costante `QUOTO` non punta più al dominio esterno ma a
`/nuovo-preventivo/`.

**`index.html`** — stessa cosa per `QUOTO_URL`, il ponte che porta la sessione.

## Cosa NON cambia

Nessuna riga di scraper, nessuna tariffa, nessun calcolo di premio. Il server
OVH continua a fare esattamente quello che fa oggi, e `quoto.withusassicurazioni.it`
continua a rispondere: semplicemente non lo vede più nessuno.

## Come si torna indietro

Si rimettono i due indirizzi assoluti in `withus-one.js` e `index.html` e si
tolgono le righe aggiunte a `vercel.json`. Tre minuti, nessuna migrazione.

## Effetto collaterale positivo sulla sicurezza

Oggi, per passare il login da IAM a Quoto, i due token di sessione viaggiano
nell'indirizzo (nella parte dopo `#`), perché due sottodomini diversi non
condividono l'accesso del browser. Con un dominio solo quel passaggio diventa
superfluo: il login è già condiviso. Il codice che li passa è stato lasciato
apposta com'era — così nulla si rompe se la riscrittura viene disattivata — ma
il passo successivo naturale è toglierlo, e i token smettono di comparire negli
indirizzi e nella cronologia del browser.

## Difetto noto, cosmetico

In `index.html` di QUOTE, riga 10975, i loghi delle compagnie sono costruiti con
`location.origin + '/' + file`. Sotto il dominio unico quell'indirizzo cerca il
file sulla radice di IAM, dove non c'è, e l'immagine viene nascosta dal suo
stesso `onerror`. Le altre due funzioni che disegnano gli stessi loghi usano già
il percorso relativo e non hanno il problema. Correzione: una riga sola, da fare
sul repository QUOTE (usare `encodeURI(f)` come fa `logoChip`). Non blocca
questo ramo.

## Verifica prima di pubblicare

Sull'anteprima Vercel: entrare, aprire "Nuovo preventivo", controllare che
l'indirizzo in alto resti `iam...`, che il preventivatore carichi loghi e
tariffe, che il pannello Fonti risponda e che la firma privacy parta.
