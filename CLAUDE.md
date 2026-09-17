# La mappa di QUOTO — per chi ci lavora dopo

Scritto il 12/09/2026, **verificato sul codice e sulla storia git**, non
ricostruito a memoria. Dove un'affermazione non è stata verificata, è scritto.

Questo file non rifà la documentazione che c'è già: la indica, e aggiunge le
cose che si scoprono solo lavorandoci e che finora non stavano scritte da
nessuna parte.

| Se cerchi | Vai a |
|---|---|
| Cos'è il sistema, nome e perimetro | `IAM.md` |
| Consegna di lavoro, regole di casa, pacchetti | `CODEX.md` |
| Regole sui rami e sul deploy | `WORKFLOW.md` |
| Il confine QUOTO ⇄ IAM (fonte unica) | `INTERFACCIA-QUOTO-IAM.md` |
| Come QUOTO si collega alle compagnie | `PACCHETTO-FONTI.md`, `FONTI.md` |
| Il quotatore auto | `QUOTATORE-AUTO.md` |

---

## 1. La cosa che spiega più guasti di ogni altra

**Il codice arriva su `main` e non viene collegato a niente.**

Non è un'impressione: al 12/09/2026, su `main`, c'erano **tre** motori
previdenziali, 185.527 byte in tutto, e la schermata ne chiamava **uno**.

| file su `main` | byte | riferimenti in `index.html` |
|---|---|---|
| `tariffe/motore/previdenza.js` | 131.122 | 2 — l'unico vivo |
| `tariffe/motore/previdenza-flash.js` | 22.136 | **0** |
| `server/pensione.js` | 32.269 | **1, ed è un commento** |

`previdenza-flash.js` era stato fuso con la PR #127 con 33 prove verdi sopra.
`server/pensione.js` ne aveva 63. **Novantasei prove verdi che sorvegliavano
codice che nessuno eseguiva.**

Da qui la regola che conta più di tutte in questo repository:

> **Una suite verde non dimostra che il codice serva a qualcosa.**
> Prima di scrivere prove su un modulo, controlla che qualcuno lo chiami:
> `grep -c "NomeModulo" index.html`. Se risponde `0`, il lavoro da fare non è
> aggiungere prove — è collegarlo o cancellarlo.

Tutti e tre sono stati sostituiti il 12/09/2026 (PR #131). Adesso ce n'è uno.

---

## 2. I rami: la regola scritta e la realtà

`WORKFLOW.md` dice, come regola d'oro:

> «Un repo = un solo ramo (`main`) = ciò che viene pubblicato. Eventuali rami
> `claude/...` o temporanei → **da cancellare, non usare**.»

Sul remoto ci sono **174 rami**. Di questi, **31 hanno un nome previdenziale**
(`previdenza/*`, `pensione/*`, `blocco4/*`, più diversi `claude/*`).

Non ho un modo affidabile e a basso costo per dire quanto di quel lavoro sia
davvero arrivato su `main`: le PR qui si fondono con *squash*, quindi la punta
del ramo non risulta mai antenata di `main` anche quando il contenuto è
arrivato, e un `git diff main..ramo` conta anche tutto ciò che `main` ha
cambiato dopo. **Le due misure facili danno entrambe una risposta falsa.**
Chi vuole saperlo davvero deve andare ramo per ramo sui file che contano.

Quello che si può dire con certezza, e basta a decidere:

- il lavoro non sparisce nei rami — **arriva su `main` e resta spento** (§1);
- un ramo `claude/...` **non è pubblicato**: il sito serve `main`. Finché la PR
  non è fusa, il lavoro non è vivo, per quanto verde sia il banco di prova;
- 174 rami sono un archivio che nessuno legge. Sfoltirli è lavoro vero, ma va
  fatto sapendo che i `backup/*` sono snapshot dichiarati intoccabili.

---

## 3. Correzioni alla «mappa vera» di CODEX.md §2

Verificate il 12/09/2026:

| CODEX.md dice | Realtà |
|---|---|
| `QUOTE/preventivatore.html` esiste **solo** sul ramo `claude/vibrant-tesla-o0glfd` | **Falso**: è su `main`, 16.516 byte |
| «atteso: 157/157» per `node ui-test.mjs` | il banco è cresciuto: **361 prove**. Il numero in CODEX è vecchio di parecchi rilasci |

Resta **vero e non risolto** quello che CODEX segnala su `deploy/autopull.sh`:
non dare per scontato che il codice che leggi sia quello vivo sulla VPS.

*(Il sito statico invece sì: il 12/09/2026 `index.html` servito da
`quoto.withusassicurazioni.it` aveva md5 identico a quello di `main`.)*

---

## 4. Come si prova quello che fai

Tre banchi, nessuno dei quali gira da solo: **in questo repository non ci sono
workflow GitHub Actions.** Una PR non ha CI. I numeri che scrivi in una PR
vengono da quello che hai girato tu.

```bash
# 1. il browser vero — 361 prove
node static-server.js &          # il collaudo si aspetta la porta 8077
node ui-test.mjs

# 2. i motori e il server — un file per argomento
node server/verifica/pensione-motore.test.mjs
node server/verifica/irpef.test.mjs
node server/verifica/tfr-datore.test.mjs
node server/verifica/analisi-registro.test.mjs
node server/verifica/pdf-withus.test.mjs
node server/verifica/tracciabilita.test.mjs
node server/verifica/utenti-in-iam.test.mjs
node server/verifica/utenti-attiva.test.mjs      # l'attivazione dal server, con archivio e posta finti
node server/verifica/compagnie-utente.test.mjs   # ritaglia da index.html col banco di IAM

# 3. la scocca a moduli
node withus-one/verifica/controlla.mjs

# 4. l'impianto sul VPS (autopull, scraper, il sito Caddy del dominio unico)
node deploy/impianto.test.mjs
node deploy/dominio-unico.test.mjs

# 5. IAM (la scocca e il gestionale, cartella iam/) — 52 prove
node iam/controlla-tutto.mjs
```

### Le trappole d'ambiente, e come distinguerle da un guasto vero

Costano mezz'ora a chi non le conosce, perché somigliano a rossi veri.

| Sintomo | Causa | Cosa fare |
|---|---|---|
| 5 rosse: «non trovo index.html della scocca IAM» | quelle prove leggono il repo gemello `agente-sospesi`, che non c'è | **non è un guasto tuo**: rosse per la strada, non per il contenuto |
| `PARITÀ TARIFFE: 0 superate, 5 fallite` — «nessun commit contiene più…» | il clone è *shallow*: quelle prove cercano nella storia | `git fetch --depth=1000` o ignorale in sessione web |
| `PathError: Unexpected ( at index 18` sulle prove `vigilanza-*` | hai installato **express 5**; il repo vuole **express 4** | `npm i --no-save express@4` |
| `Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-…` | versione di Playwright ≠ build di Chromium installata | `npm i --no-save playwright@1.55`; il fallback del repo punta a `/opt/pw-browsers/chromium`, che **è** il binario |

`npm i --no-save X` **pota** i pacchetti installati prima allo stesso modo:
installali insieme (`npm i --no-save playwright@1.55 express@4 jspdf@2.5.1`) o te
ne sparisce uno mentre non guardi.

`jspdf` serve a **una** prova, quella che controlla che cosa finisce davvero
scritto sul PDF del preventivo personalizzato. Se manca, quella prova non
diventa rossa: dice «saltata» e va avanti — un rosso per un pacchetto assente
sarebbe rosso per la strada, non per il contenuto. Nel browser jsPDF arriva dal
CDN e si carica solo quando qualcuno stampa.

### La controprova è obbligatoria (CODEX §3), e va fatta sul bug

Una prova verde non dimostra niente da sola. Ma la controprova che serve **non
è** «il file non esisteva prima, quindi falliva»: quella è vera per costruzione
e non dimostra nulla. La controprova che vale è **rimettere dentro il guasto** e
guardare la prova diventare rossa.

---

## 5. Come sono fatti i motori di tariffa

`tariffe/motore/*.js` li caricano **due mondi**: la pagina nel browser
(`<script src>`) e Node (`require`) per le prove.

```js
(function () {
  'use strict';
  /* … */
  var API = { /* … */ };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.NomeMotore = API;
})();
```

**Niente `import`/`export`, niente compilazione.** È una scelta, non una
mancanza: non c'è un passo di build da tenere in piedi. Un modulo ESM
server-side non si può collegare a una schermata — è uno dei motivi per cui
`server/pensione.js` non è mai stato usato da nessuno.

**I testi che escono di casa stanno nel motore.** `Pensione.testiInvio`
produce dodici varianti (tre casi × due toni × due canali), tutte provate:
il caso lo decide il risultato (`casoInvio`), non chi scrive; nel caso
«complementare» il TFR non si nomina; sopra i 50 addetti nessun testo promette
un risparmio all'azienda. La pagina mostra il testo, lo lascia correggere e
lo manda: mai una frase composta a mano in `index.html`.

**I PDF hanno una carta intestata sola.** Chi deve produrre un documento con
l'aspetto With Us non ricopia `ppPdfBlob`: costruisce un documento
strutturato (intestazione, colonne, blocchi, firma, avvertenze) e lo passa a
`PdfWithus.disegna`. jsPDF si carica dal CDN solo quando qualcuno stampa;
Helvetica non ha l'euro, e `safe()` lo scrive «EUR» perché altrimenti sparisce
in silenzio.

Corollario: **la schermata non contiene formule.** Raccoglie dati, chiama il
motore, mostra la risposta. Un calcolo scritto dentro `index.html` non si può
provare senza aprire un browser. Anche il foglio stampato per il cliente sta
nel motore, non nella pagina: è l'unica cosa che esce di casa, e va provata.

---

## 6. `index.html` è un file solo, di 1,7 MB

Tutte le schermate vivono lì. Due conseguenze che hanno già prodotto guasti:

**a) I nomi globali si pestano i piedi, in silenzio.** Il 12/09/2026 una
schermata previdenziale nuova aveva usato il prefisso `pf`, e `var pfEuro`
sovrascriveva `function pfEuro` del portafoglio: i premi di **portafoglio,
titoli e scadenzario** uscivano «€ 704» invece di «€ 704,00». Nessun errore,
nessuna pagina bianca, e in moduli che non c'entravano niente.

> Prima di scegliere un prefisso, controlla che sia libero:
> `grep -cE "^(var|let|const|function|async function) tuoPrefisso" index.html`

**b) Le pagine hanno una porta.** Una pagina il cui contenuto lo scrive il
codice deve avere una riga in `PAGINE_DA_AVVIARE` o un inizializzatore dentro
`showPage`, altrimenti la scocca che chiede `?page=<nome>` apre un riquadro
vuoto. C'è una prova che lo sorveglia (`pagine-dalla-scocca.test.mjs`).

**c) Gli id delle pagine sono un contratto.** `#page-previdenza` si chiama
ancora così anche dopo che il modulo è stato riscritto da zero: la scocca di
IAM chiede `?page=previdenza`. Rinominare un id rompe il modulo dentro IAM
**senza rompere nessuna prova del motore**.

---

## 7. Il modulo pensione, com'è adesso

| file | cosa fa |
|---|---|
| `tariffe/motore/pensione.js` | il calcolo, il foglio per il cliente, la riga d'archivio, il messaggio WhatsApp |
| `tariffe/motore/irpef.js` | il conto delle imposte — **spostato** da `previdenza.js` senza cambiare un'operazione (439 righe identiche) |
| `tariffe/motore/tfr-datore.js` | il TFR visto dal datore di lavoro (17/09/2026): deduzione 6%/4%, esonero Fondo garanzia, contributi minori, rivalutazione, Tesoreria da 50 addetti. Numeri di legge con fonte, copia di riserva della tabella |
| `tariffe/motore/pdf-withus.js` | la carta intestata dei PDF (17/09/2026): fascia coi due cerchi, schede, intestazione, piede, filigrana, tabelle. Le stesse primitive per il preventivo personalizzato (`ppPdfBlob`) e per il foglio pensione (`Pensione.documentoPdf` → `PdfWithus.disegna`). Si prova in Node con un `doc` finto |
| `#page-previdenza` in `index.html` | il cliente dall'anagrafica (componente `clp*`), le domande che dipendono dal lavoro (TFR sì/no, «ha dipendenti?» con la cascata), la risposta sotto, la consegna: chi firma dai collaboratori, tono, anteprima, email e WhatsApp sulle stesse strade del personalizzato (`pens*` riusa `payFetch('/mail/send')`, `PP_BUCKET`, `ppVietato`) |
| `server/parametriPrevidenziali.js` | serve i numeri di legge dalla tabella; il motore ne tiene una copia di riserva |
| `server/analisiPrevidenziali.js` | ogni foglio stampato lascia la sua riga a registro |

**Il cliente viene dall'anagrafica (17/09/2026).** Niente nominativi volanti: il
foglio e la riga d'archivio si rifiutano senza `cliente.id` / `anagrafica_id`,
e il server lo pretende (`server/verifica/analisi-registro.test.mjs`). Il
componente «scegli un cliente» è `clpCerca`/`clpInstalla` in `index.html`, uno
per tutta la casa: lo stesso autocomplete era copiato venti volte nei wizard, e
si portano qui un modulo alla volta. Registro su `window.__CLP_REG`, non in un
`var`: il modulo pensione lo chiama 17.000 righe prima del blocco.

Le due cose da non rompere:

1. **Il risparmio fiscale passa dall'IRPEF vera.** Dedurre può far scendere
   l'imposta sotto la soglia di capienza e far perdere il trattamento
   integrativo: il risparmio diventa **negativo**. Una percentuale a occhio quel
   caso non lo vede, e vende un danno chiamandolo vantaggio.
2. **Quello che non è confermato viaggia marcato**, fino al foglio del cliente.
   I valori della tariffa HDI sono ancora segnaposto: `daConfermare()` li
   elenca, e la schermata e il PDF li stampano. Finché quella lista non è vuota,
   **un foglio non si consegna a un cliente vero.**

### Due cose che sembrano ovvie e sono false

Trovate dalle prove, non dal ragionamento. Se un giorno qualcuno le
«corregge», il conto torna sbagliato e il numero resta credibile.

- **Il lordo non è sempre maggiore del netto.** Sotto i ~12.700 € un dipendente
  porta a casa più del suo lordo: trattamento integrativo e somma non
  imponibile sono denaro che *entra*.
- **Il netto non cresce sempre col lordo.** Ci sono tre gradini fra 5.000 e
  60.000 — i salti del trattamento integrativo — quindi esistono netti che
  nessun lordo produce.
- **Da 50 addetti in su il TFR non resta in azienda.** Va al Fondo di Tesoreria
  INPS (L. 296/2006 c. 755), e le misure compensative spettano in entrambi i
  casi (c. 764): per l'azienda il fondo è **neutro**, il vantaggio è del
  dipendente. Un ramo datoriale che promette un risparmio sopra i 50 sta
  vendendo un numero falso. Il motore lo dice da solo (`confronto: 'tesoreria'`).
- **«Reddito mensile × 12» è sbagliato, e non di poco.** Il reddito ANNUO si
  ricava dalle mensilità, e sull'annuo si calcola l'IRPEF, che è progressiva.
  Tre numeri diversi, per ragioni diverse: **13** il reddito di un dipendente
  (12 quello di un autonomo, che una tredicesima non l'ha mai vista, e 14 dove
  il contratto la prevede), **13** la pensione INPS per tutti, **12** la
  rendita del fondo, che è un contratto di rendita.
  A ~850 € netti al mese la differenza fra 12 e 13 non sposta il risultato:
  **lo rovescia.** Su 12 il versamento risulta in perdita di 1.200 € l'anno
  (si perde il trattamento integrativo), su 13 risparmia 251 €. Col conto
  sbagliato il consulente direbbe «a lei versare conviene non farlo», e sarebbe
  una raccomandazione falsa data con la faccia seria.

---

## 8. Regole di casa che non si discutono

Da `CODEX.md` §4, e valgono qui identiche:

1. **Niente dati inventati.** Se manca una soglia, una tariffa o una durata, il
   campo resta vuoto e mostra «da confermare». In contabilità non ci sono
   eccezioni — e in un foglio che si firma nemmeno.
2. **Niente credenziali in chiaro**, mai, nemmeno nei commenti o nelle prove.
3. **Privacy**: dati di clienti e collaboratori non finiscono in ricerche web,
   in servizi esterni o nei messaggi di commit.
4. **Backup prima di ogni modifica**: non iniziare con l'albero sporco.
5. Il confine QUOTO ⇄ IAM passa da `INTERFACCIA-QUOTO-IAM.md`, sempre.

---

## 9. Trovato il 15/09/2026, lavorando al menu «Nuovo preventivo»

Verificato sul codice e sui DNS, come il resto di questo file.

**Il menu «Nuovo preventivo» non sta qui.** Sta nella scocca di IAM
(`Agente-sospesi/withus-one.js`, oggetto `MEGA`). Qui sta solo la parte che lo
risolve: `PRODOTTI_DIRETTI` in `index.html`, 57 chiavi `prod`, una per foglia
del menu. L'elenco è contratto (`INTERFACCIA-QUOTO-IAM.md` §2.6) e la prova
`server/verifica/prodotti-diretti.test.mjs` controlla che codice e contratto
dicano la stessa cosa, che ogni sottocategoria RC Professionale esista una
volta sola in tariffa e che ogni chiave AMTRUST sia in `tariffe/amtrust.json`.
Un brief che parla di «IAM» può riguardare tutti e due i repository: prima si
cerca dove vive la cosa, poi si tocca.

**RC Professionale si apre dopo la tariffa, non prima.** `renderRcprof` azzera
la vista e la ridisegna quando la tariffa arriva: chi imposta la vista prima
se la vede sovrascrivere e il menu apre l'elenco categorie invece del
prodotto. `apriRcProfDiretto` e `apriAmtrustDiretto` fanno l'ordine giusto.

**Numeri aggiornati.** `node ui-test.mjs`: **356** prove al 15/09/2026, tutte
verdi in sessione web con il repo gemello clonato in `/home/user/agente-sospesi`
(la prova del ponte lo cerca anche in `../agente-sospesi`).

**Dove sta la produzione, davvero.**

| dominio | chi risponde |
|---|---|
| `iam.withusassicurazioni.it` | **dal 16/09/2026 il VPS OVH, Caddy** (`deploy/caddy/iam.caddy`): IAM alla radice da `/opt/withus-iam`, QUOTO sotto `/nuovo-preventivo/` da `/opt/withus-backend`, i percorsi di servizio al backend. Prima era GitHub Pages; **Vercel non è mai stato la produzione**, fa solo le anteprime delle PR |
| `quoto.withusassicurazioni.it` | GitHub Pages, da `main`. Resta come strada diretta e rientro; il riquadro dentro IAM non lo usa più |
| `api.withusassicurazioni.it` | il VPS OVH, dietro Caddy, col registro (`deploy/REGISTRO-RICHIESTE.md`) |

Il sito Caddy di `iam.` si modifica **nel repository**, mai a mano sul server:
`deploy/autopull.sh` lo valida e lo ricarica, e rimette quello di prima se non
vale. Storia del passaggio: `deploy/TRASLOCO-OVH.md`, `deploy/DOMINIO-UNICO.md`,
`Agente-sospesi/INDIRIZZO-UNICO.md`. Il riquadro di IAM carica
`/nuovo-preventivo/` (Agente-sospesi#52): stessa origine, login condiviso dal
browser, clic nel riquadro visibili alla scocca.

**Il canale comandi funziona ed è il modo di guardare dentro il VPS**
(`deploy/cmd-runner.sh`): si scrive `cmd.id` + `cmd.sh` sul ramo `claude-cmd`,
entro 30 s il server esegue e riscrive `out.txt`. Timeout 250 s per comando.
Usato il 15-16/09 per il sopralluogo di Caddy e il cutover del DNS.

**Cose dell'ambiente di sessione web.**
- Il proxy git risponde `403` alla cancellazione di rami remoti: i rami fusi li
  cancella Francesco dal tasto «Delete branch» della PR.
- `iam.withusassicurazioni.it` risponde `403` alle richieste dal contenitore;
  `quoto.` risponde. Il deploy di IAM non si verifica da qui.
- `pkill -f <nome>` uccide anche la shell che lo lancia se il nome compare nel
  comando: esce con `144`. Non è un guasto.
- Le PR si fondono con squash; nessuno dei due repository cancella i rami da
  solo (Settings → «Automatically delete head branches» è spento).
- Dopo la rinomina `QUOTE` → `IAM` (16/09/2026) una sessione aperta prima ha
  lo scope GitHub col nome vecchio: gli strumenti GitHub vanno chiamati con
  `repo: QUOTE` (GitHub rimanda), col nome nuovo rispondono «Access denied».
  Stesso discorso per `git push`: `origin` resta sull'URL con `QUOTE`, col
  nuovo il proxy risponde 403; GitHub avvisa «This repository moved» e accetta.

---

## 10. Il repository unico (dal 16/09/2026)

**IAM vive qui, nella cartella `iam/`.** Fino al 16/09/2026 era il repository
`francescotp93/Agente-sospesi`; da quel giorno quel repository è archivio in
sola lettura (la storia sta lì) e il codice sta qui, importato in un solo commit
che cita il commit d'origine. Questo repository si chiama **IAM**
(`francescotp93/IAM`, rinominato il 16/09/2026): `QUOTE` è il nome vecchio,
GitHub rimanda da solo dal vecchio al nuovo, e sul VPS i remoti li sposta
`deploy/setup.d/30-rinomina-repo-iam.sh`, che toglie anche `/opt/withus-iam`.

Cosa cambia per chi lavora:

- **Un confine, un file.** `INTERFACCIA-QUOTO-IAM.md`, `IAM.md` e `WORKFLOW.md`
  esistono **una volta sola, alla radice**. Non c'è più niente da «replicare
  nell'altro repo nella stessa sessione»: una modifica al confine è una PR che
  tocca la radice e `iam/` insieme, e le prove dei due lati girano nello stesso
  clone (`ui-test.mjs` cerca la scocca prima in `./iam`).
- **Un pull, un sito.** Il VPS non ha più il secondo clone `/opt/withus-iam`:
  Caddy serve `iam.withusassicurazioni.it` da `/opt/withus-backend/iam`, che
  arriva con lo stesso `autopull` del backend (`deploy/caddy/iam.caddy`).
- **Le prove di IAM** si lanciano con `node iam/controlla-tutto.mjs` e hanno
  la loro radice in `iam/`; la sola che legge un documento condiviso
  (`menu-preventivo-albero`) lo cerca alla radice del repository.
- **Gli agenti** di Claude Code stanno tutti in `.claude/agents/` alla radice
  (`iam-specialist` è arrivato da Agente-sospesi).
- `iam/vercel.json` e `iam/INDIRIZZO-UNICO.md` raccontano la strada di prima
  (Vercel faceva solo anteprime): restano finché il progetto Vercel esiste.

**Passo 3, a moduli (dal 16/09/2026).** Tessera 1: `frame-ancestors 'self'`
nell'header Caddy di `/nuovo-preventivo/`. Tessera 2 (17/09): la gestione
utenti di QUOTO non c'è più, `iam_utenti` la scrive solo IAM (QUOTO tocca solo
`rete`/`responsabile`, i punti vendita); il preventivatore rimanda a IAM col
messaggio `quoto-apri`. La mappa «chi possiede quale schermata» è in
`INTERFACCIA-QUOTO-IAM.md` §2.7: **«storico» non era una schermata doppia**,
sono due cose diverse con lo stesso nome. Fondere i due documenti costa 44 nomi
globali in comune (`db`, `ME`, `initDB`, `onLogin`, …) e 37 `id` uguali.

**Il registro unico delle persone (17/09/2026, Lavoro 2 PR 1).** Prima erano
tre tabelle quasi scollegate: `quote_collaboratori` (3 righe), `iam_team` (12,
`collab_id` vuoto su tutte), `iam_utenti` (5, 4 senza scheda). La migrazione
`supabase/migrations/20260917_registro_unico_collaboratori.sql` ha creato una
persona per ogni scheda economica e per ogni account (17 persone), agganciando
per codice fiscale poi per email e **mai quando la corrispondenza non è una**:
due schede di `iam_team` con la stessa email sono rimaste due persone, da
guardare a mano. `iam_team` è ora l'**allegato economico** della persona, non
un registro; la sezione «Collaboratori» (era «Operativa») legge le persone per
prime, e «Nuovo collaboratore» scrive nel registro prima che in `iam_team`.
La stessa migrazione ha applicato la blindatura di `iam_utenti` (`u_update_self`
non lascia più cambiare a un utente permessi, profilo, prodotti, moduli,
caselle su se stesso): il file `DA-APPROVARE-blindare-iam-utenti.sql` è
superato da quella migrazione.

**«Utenti» ad albero (17/09/2026, Lavoro 2 PR 2).** La lista utenti di IAM
parte dalle persone del registro, non dagli account (`righeUtenti`): una riga
per persona con nome e RUI, stato ATTIVO/INATTIVO/SOSPESO (`statoAccesso`),
ingranaggio che apre i **tre gruppi** (`apriPermessiUtente`): sezioni IAM,
compagnie visibili su Quoto (`iam_utenti.compagnie`, `null` = tutte, nomi dal
catalogo prodotti, migrazione `20260917_utenti_compagnie.sql` che la mette
sotto la blindatura), attivazione IAM con il collegamento «imposta la password»
(`resetPasswordForEmail`, mai una password nel messaggio). Il tasto «Nuovo
utente» non sta più nell'elenco: per una persona senza account lo apre il
gruppo 3, precompilato, e l'account nato si aggancia alla persona (`iam_id`).
`salvaPermessiUtente` legge solo quello che il pannello ha mostrato: un
interruttore `disabled` o un catalogo assente non decidono niente. Trappola
trovata scrivendo la prova: un commento che nomina «Nuovo utente» fa scattare
una prova sul testo — le prove sul sorgente cercano la **chiamata**
(`apriNuovoUtente`), non la parola.

**L'attivazione dell'accesso passa dal server (17/09/2026, Lavoro 2 PR 3).**
`server/utenti.js`, `POST /utenti/attiva {persona_id, ruolo}` dietro
`requireAuth`: rilegge su `iam_utenti` che chi chiama sia un admin attivo, crea
l'utenza con la chiave di servizio e una password casuale che **nessuno vede**,
la riga `iam_utenti`, scrive `iam_id` sulla persona, genera il collegamento
*recovery* (`/auth/v1/admin/generate_link`) verso la radice di IAM e lo manda
con Brevo (`sendBrevo` di `notify.js`). Si ferma con 409 se la persona ha già
un account o se l'email è già di un altro account: **collegare non è creare**,
e lo decide una persona. Il «Nuovo utente» con la password temporanea in un
`alert` non c'è più. Il `signUp` rimasto in `iam/index.html` è la registrazione
autonoma della schermata di accesso, un'altra cosa.

**Le compagnie per utente arrivano in QUOTO.** `currentUser.compagnie` dal
profilo; `awCompagniaConsentita` nel confronto Motor accanto agli interruttori
delle Fonti (due cancelli, stesso verso). Regola di prudenza trovata sui dati:
il catalogo prodotti diceva **«HD»** per HDI su sette prodotti (corretto il
17/09/2026 su richiesta di Francesco, `20260917_catalogo_hd_hdi.sql`), quindi
un nome che il catalogo non conosce **non si spegne mai**, altrimenti un refuso
in una tabella toglierebbe una compagnia a un collaboratore in silenzio. Il filtro non
tocca i moduli a compagnia unica (persona, casa, salute…): lì la compagnia è il
prodotto, e nasconderlo è un'altra decisione.

**Modulo 3 del passo 3 (17/09/2026): «Performance» si è spostata.** La pagina
di QUOTO (preventivi, polizze, conversione, prodotto top, andamento mensile)
dentro IAM non la raggiungeva nessuno: la barra laterale di QUOTO nel riquadro
non si vede. Ora è la linguetta **Produzione** di IAM › KPI e gare, letta da
`quote_preventivi` con `produzioneRiassunto` (pura, provata: la polizza conta
nel mese dell'emissione se è nello stesso anno, altrimenti nel mese del
preventivo, così polizze ≤ preventivi e la conversione è una percentuale vera;
«emessa» vale come nella Produzione e storico, `polizza_emessa` o stato
`emessa`). Grafico a barre disegnato a mano con due tinte fisse validate col
verificatore dataviz nei due temi (`--prod-prev` blu, `--acc` verde), legenda e
tabella dei numeri; IAM non carica ApexCharts, e ora nemmeno QUOTO. In QUOTO
resta `#page-performance` come rimando (`apriPerformanceInIam`, stessa strada di
Utenti): la porta `?page=performance` deve esistere, altrimenti la scocca apre
un riquadro vuoto. `APRIBILI` nella scocca ora è `{ utenti, performance }`.

**Moduli 4 e 5 del passo 3 (17/09/2026): la sessione non si passa più.**
IAM e il riquadro sono la stessa origine dal 16/09, e `QUOTO_URL` di IAM era
già `/nuovo-preventivo/`: il client Supabase salva la sessione in
`localStorage` con una chiave che dipende solo dal progetto, quindi la sessione
di IAM è già quella del preventivatore. Nel riquadro il client è
`{ auth: { autoRefreshToken: false } }` con `persistSession` acceso (prima era
`persistSession: false` e riceveva i token dal messaggio): legge lo storage,
non rinnova, non installa niente. La scocca sulla stessa origine risponde a
`quoto-ready` senza `at`/`rt`; QUOTO li ignora se una scocca vecchia li manda.
`quotoUrl()` non allega più `#at/#rt` né l'email: il salto a pagina intera del
collaboratore «solo QUOTO» (§2.4) si risolve così, senza biglietto monouso.
Un vecchio collegamento con i token nell'hash viene ripulito senza leggerlo.
Verificato sul client servito dal CDN (supabase-js 2.116, auth-js 2.116):
`getSession()` rilegge lo storage a ogni chiamata e dal 2.107 coordina i
rinnovi paralleli senza lock (`refresh_token_already_used` gestito). Il CDN
non è raggiungibile dal contenitore (403 dal proxy): il pacchetto si è letto
installandolo in una cartella di lavoro, non in `node_modules` del repo.

Ciò che **non** è cambiato: `index.html` di QUOTO e `iam/index.html` restano
due documenti, e il preventivatore vive ancora in un riquadro (stessa origine,
`/nuovo-preventivo/`). Fonderli in una sola applicazione è il passo 3, da fare a
moduli.
