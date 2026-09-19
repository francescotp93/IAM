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
node server/verifica/sessione-condivisa.test.mjs # la sessione e' quella dell'origine, nessuno la passa
node server/verifica/fusione-collisioni.test.mjs # i due documenti non si avvicinano nel verso sbagliato

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

**Modulo 6 del passo 3 (17/09/2026): fondere i due documenti — deciso come NON
farlo.** Misurato sul codice: QUOTO 1,8 MB (1.673 nomi globali, 52 pagine,
700 classi CSS), IAM 1,1 MB (853 nomi, 16 pannelli, 438 classi). In comune:
**43 nomi globali, 29 id, 17 classi**, una sola variabile CSS. Quei 43 nomi
non sono coincidenze: sono **le stesse schermate scritte due volte** (login,
reset, MFA, ticket, `loadStorico`, `eliminaCollaboratore`), cioè la stessa
malattia di Utenti e Performance. Concatenare i due file in un documento da
2,9 MB non fonde niente: mette in un posto solo due programmi che si pestano i
nomi. **Non si fa.**

La strada è quella già iniziata in `withus-one/` (`LEGGIMI.md`,
`CONTRATTO.md`): moduli ES nativi, una pagina per file con le prove accanto,
niente compilazione, 10 moduli in sola lettura (`scrivania`, `prodotti`,
`preventivi`, `clienti`, `polizze`, `scadenzario`, `sinistri`, `titoli`,
`richieste`, `utenti`), 14 file di prova tutti verdi, **non pubblicata**.
Contro 52 pagine di QUOTO e 16 pannelli di IAM: la parità è lontana, e le
scritture (emissione, incasso, sinistro, richiesta) non ci sono. Finché non c'è
parità, **il riquadro è il meccanismo di composizione**, e dopo i moduli 1-5 è
un riquadro onesto: stessa origine, stessa sessione, navigazione sul canale,
clic visibili alla scocca.

Quello che si fa nel frattempo, ed è provato
(`server/verifica/fusione-collisioni.test.mjs`): **le collisioni non crescono.**
La prova misura i nomi, gli id e le classi in comune e diventa rossa se
aumentano; la soglia si abbassa quando si toglie un doppione, mai si alza. I
doppioni rimasti si tolgono uno alla volta come Utenti e Performance:
Collaboratori di QUOTO (modulo 2b, quando IAM avrà struttura, documenti e
firma), poi login/MFA/reset nel riquadro (dormienti da quando la sessione è
condivisa, servono solo a `quoto.` a pagina intera). Ticket **non** è un
doppione da togliere: la coda è una (`iam_ticket`), le due facce sono volute
(`ui-test.mjs`, blocco E) e la pagina di QUOTO è l'unica strada del
collaboratore «solo QUOTO».

Ciò che **non** è cambiato: `index.html` di QUOTO e `iam/index.html` restano
due documenti, e il preventivatore vive in un riquadro (stessa origine,
`/nuovo-preventivo/`). Una sola applicazione si raggiunge portando le pagine in
`withus-one/`, una per file, non concatenando i due monoliti.

---

## 11. La gestione documentale (Lavoro 3, 18/09/2026)

**Dove vive.** Nella radice (QUOTO), non in `iam/`. Il brief diceva «in IAM»,
ma il pannello «Posizioni del cliente» e il portafoglio polizze stanno in
`index.html` alla radice: IAM li mostra nel riquadro `/nuovo-preventivo/`.
È il caso di §9 — *un brief che parla di «IAM» può riguardare tutti e due i
repository: prima si cerca dove vive la cosa, poi si tocca.*

| pezzo | dove |
|---|---|
| tutte le regole (quali documenti servono, scadenze, eredità, congelamento) | `tariffe/motore/fascicolo.js` |
| le prove delle regole, in Node | `server/verifica/fascicolo.test.mjs` — 18 |
| i due contenitori nella scheda cliente | `fdoc*` in `index.html` |
| il fascicolo di pratica | `pdoc*` in `index.html`, aperto dal Portafoglio e dalla scheda cliente |
| i due contatori di agenzia e le regole per compagnia | `cdoc*`, pagina `#page-controllo-documenti` |
| le tabelle | `supabase/migrations/20260918_documentale_compagnie.sql` |
| le prove nella pagina | blocco «documentale/fascicolo/controllo documenti» in `ui-test.mjs` |

**Le quattro regole che non si toccano senza rifare i conti.**

1. **I documenti d'identità del cliente stanno sull'anagrafica, la pratica li
   eredita.** `quote_anagrafiche.documenti` (jsonb: `tipo`, `numero`, `url`,
   `data`, `scadenza`). Se ci sono, non si ricaricano una volta per polizza.
   Uno **scaduto** non vale come presente: il fascicolo dice «scaduto» e manda
   in anagrafica, perché rinnovare un documento e caricarne uno mancante sono
   due lavori diversi.
2. **I documenti di terzi restano nella pratica e non entrano mai in
   anagrafica.** Identità del familiare convivente, libretto del veicolo da cui
   arriva la classe: sono persone che non sono in portafoglio (GDPR), e
   metterle in anagrafica sporcherebbe il portafoglio di nominativi che non
   sono clienti. Nel motore lo dicono `fonte` e `terzo`; nessun tipo di terzi è
   nemmeno regolabile da una compagnia, altrimenti la regola si aggirerebbe dal
   pannello.
3. **La patente non è un documento d'identità.** Sta nel fascicolo di polizza:
   serve alle pratiche auto, non a identificare il cliente. In anagrafica ci
   sono due soli tipi, carta d'identità e passaporto, tutti e due con numero e
   **scadenza obbligatoria** — un documento d'identità senza data non si può
   dire valido, e accettarlo riempirebbe l'archivio di documenti su cui il
   contatore delle scadenze non ha niente da dire.
4. **I requisiti si congelano alla creazione del fascicolo.**
   `quote_polizze.dati.fascicolo` tiene operazione, compagnia e l'elenco
   completo dei requisiti con la data. Se si rileggessero sempre «da vive», il
   giorno in cui una compagnia aggiunge un documento **tutte le pratiche già
   chiuse diventerebbero incomplete** e l'elenco dei fascicoli da completare
   smetterebbe di voler dire qualcosa. Cambiare una regola vale per le pratiche
   nuove; per rifare una pratica vecchia c'è «Rifai il fascicolo», che lo dice.

**Le regole per compagnia si sommano, non sostituiscono.** `quote_compagnie`
(con gli **alias**: sulle polizze è scritto «HDI Assicurazioni», nel catalogo
prodotti «HDI» — senza alias una polizza non ritroverebbe le sue regole) e
`quote_regole_documenti` (compagnia → tipo documento → obbligatorio). Requisiti
= quelli dell'operazione **più** quelli della compagnia; un documento chiesto
da entrambe si conta una volta sola, e vince il più severo. La prima regola
vera in tabella: **Prima → patente obbligatoria**, comunicata il 18/09/2026.
Una regola che nomina un tipo che il motore non conosce non si applica e **si
vede** (in rosso, «tipo sconosciuto»): sparire in silenzio vorrebbe dire che un
refuso toglie un requisito e non se ne accorge nessuno.

**I due contatori restano due** (`#page-controllo-documenti`, voce «Documenti»).
Documenti in scadenza o scaduti = clienti da richiamare; fascicoli incompleti =
documenti che un operatore non ha caricato. Un numero solo sembra più semplice
e non si può lavorare: non si saprebbe a chi telefonare. Chi ha già rinnovato
non compare: nel contatore entra solo la versione **attiva** di ogni tipo (la
più recente non scaduta), e le precedenti restano nello storico, che non si
cancella — serve a rileggere una pratica vecchia col documento valido allora.

**Cose sapute e non fatte, da fare prima di andare in produzione con documenti
veri.**

- ~~Il contenitore `documenti` è pubblico.~~ **Chiuso il 18/09/2026**, dopo il
  rilascio della PR #179. Vedi **§12**.
- Il fascicolo guidato copre solo l'**RC Auto**: fuori da lì mostra i documenti
  di base e lo dice, senza inventare operazioni.
- L'esportazione verso un archivio esterno (Mega) resta fuori, come da brief.

---

## 12. L'archivio dei documenti (18/09/2026)

> **STATO: CHIUSO** (18/09/2026, a fine giornata). Per leggere un documento
> serve un indirizzo firmato, e per farselo firmare serve un account.
> Verificato dall'esterno senza credenziali: un vecchio indirizzo pubblico
> risponde `400`, «Bucket not found».
>
> Ci sono voluti tre tentativi, e la storia sta qui sotto perché è più utile
> del risultato: la prima volta la chiusura è arrivata prima del codice, la
> seconda prima che le cache dei browser si svuotassero. Ha funzionato quando
> il codice era pubblicato **e** chi lavora aveva ricaricato almeno una volta.
>
> La riga è sempre la stessa, nei due versi:
> `update storage.buckets set public = false where id = 'documenti';`
> `update storage.buckets set public = true  where id = 'documenti';`

### La lezione del 18/09/2026: il codice giusto non è quello che gira

Chiuso l'archivio, Francesco ha aperto un documento caricato prima e si è
visto `{"statusCode":"404","error":"Bucket not found"}`. E, dettaglio che ha
risolto il caso, **non vedeva nemmeno le schermate nuove**.

Il sospetto ovvio era un punto scoperto dalla rete di sicurezza. Era falso, e
le misure lo hanno detto in fretta:

| controllo | esito |
|---|---|
| il clic sul link vero del pannello, col codice di `main` | intercettato e firmato |
| `index.html` su `quoto.` (GitHub Pages) | impronta uguale a `main` |
| `/opt/withus-backend` sul VPS (canale comandi) | commit `d15e71d`, funzioni `arch*` presenti |

Il codice giusto era ovunque. **A non averlo era il browser**, che teneva in
cache un `index.html` da 1,8 MB del rilascio prima: niente fascicolo nuovo,
niente rete che firma gli indirizzi, e quindi il link vecchio navigato di
peso su un contenitore ormai chiuso.

Due cose da portarsi via:

1. **«È pubblicato» non vuol dire «è quello che la gente sta usando».**
   Verificare l'impronta sul server è necessario e non basta: fra il server e
   chi lavora c'è una cache che può essere vecchia di ore.
2. **Un rilascio che cambia il modo di aprire i documenti va fatto in due
   tempi**: prima il codice, poi — quando le cache si sono svuotate — la
   chiusura. Averli fatti a quindici minuti di distanza è stato l'errore.

Il rimedio è negli header, non nelle istruzioni a voce: `deploy/caddy/iam.caddy`
manda `Cache-Control: no-cache` sulle **pagine** dei due siti (non sui motori
di tariffa, che hanno la versione nell'indirizzo). `no-cache` non vuol dire
«non tenerla»: vuol dire «chiedi conferma prima di usarla», e con l'etichetta
che Caddy manda da sé la risposta è quasi sempre un 304 vuoto. La prova sta in
`deploy/dominio-unico.test.mjs`.

**E c'era un secondo piano, sotto.** Anche a header corretti, dentro IAM il
preventivatore vive in un `iframe` che chiede sempre lo stesso indirizzo:
`/nuovo-preventivo/?from=iam`, che non cambia mai. Ricaricare IAM non ricarica
quello che c'è dentro — un `iframe` è un documento a sé, con la sua cache — e
si continuava a vedere il preventivatore del rilascio prima.
È **lo stesso guasto del 14/09/2026** (il menu che non compariva, da cui è nata
`versione-scocca.test.mjs`), un piano più giù: un indirizzo che non cambia mai
è un indirizzo che il browser non richiede mai.

Dal 18/09/2026 la scocca aggiunge al riquadro un **contrassegno di versione**
che non si scrive a mano: una richiesta `HEAD` legge l'etichetta del
preventivatore (l'`ETag` che Caddy calcola dal contenuto) e la mette
nell'indirizzo. Quando QUOTO cambia, l'indirizzo cambia; quando non cambia,
resta identico e la cache lavora. Se la richiesta non riesce si carica senza
contrassegno: meglio un riquadro forse vecchio di un riquadro che non si apre.
Cinque prove in `iam/verifica/versione-riquadro.test.mjs`, di cui una fa
girare il codice davvero con un finto server.

Perché non un numero annotato come per `withus-one.js`: quel file cambia di
rado, `index.html` di QUOTO cambia quasi a ogni lavoro, e una prova che
diventa rossa tutte le volte si impara ad aggirarla.

**Come è finita.** Pubblicati gli header e il contrassegno del riquadro,
Francesco ha ricaricato una volta e ha visto le due sotto-linguette: la prova
che la pagina in uso era quella nuova. Solo allora l'archivio è stato chiuso,
ed è rimasto chiuso. L'ordine giusto, per la prossima volta: **codice
pubblicato → qualcuno ricarica e conferma di vedere il nuovo → si chiude**.

Fino al 18/09/2026 il contenitore `documenti` di Supabase Storage era
**pubblico in lettura**: chi aveva l'indirizzo di un file lo apriva senza avere
un account, per sempre. E gli indirizzi non sono segreti, si costruiscono con
l'orario in millisecondi e il nome del file. Dentro ci sono carte d'identità,
libretti, patenti, contabili di bonifico, polizze firmate, fatture dei
collaboratori, documenti di sinistri — anche di persone che non sono clienti
(il familiare convivente di una Bersani).

**Misurato, non supposto.** Lo stesso indirizzo, senza alcuna credenziale:

| quando | risposta |
|---|---|
| ad archivio aperto | `200`, con il PDF |
| ad archivio chiuso | `400` — «Bucket not found» |

La chiusura fa quello che dice: il problema del 18/09 non è stata lei, ma
quando è arrivata rispetto alle cache dei browser.

Restano pubblici, ed è voluto, solo `note-informative` (documenti
precontrattuali, che devono leggere tutti) e `offerte` (immagini di
marketing). Nessuno dei due contiene dati di clienti.

Il quadro completo, con le tre strade e il costo di ognuna, era già scritto in
`iam/sql/DA-APPROVARE-archivio-documenti.sql` (30/08/2026), dove la chiusura era
«la strada B, da programmare». Questo lavoro è quella strada.

### Com'è fatto adesso

| pezzo | dove |
|---|---|
| firma e apertura nella pagina | blocco `arch*` in `index.html` (`archPercorso`, `archFirma`, `archApri`, `archCarica`, `archLink`) |
| firma lato server | `server/archivio.js` (`percorsoArchivio`, `firmaDocumento`, `caricaDocumento`) |
| la chiusura vera | `supabase/migrations/20260918_archivio_documenti_chiuso.sql` |
| prove | `server/verifica/archivio.test.mjs` (9) + blocco «archivio» in `ui-test.mjs` (4) |

Quattro cose da sapere prima di toccarlo.

1. **Si salva il percorso, non l'indirizzo.** Ventidue punti di caricamento
   scrivevano `getPublicUrl(...)` dentro le schede: ogni riga scritta metteva in
   archivio un indirizzo che funzionava per chiunque, per sempre. Adesso si
   salva `clienti/<id>/<file>`, che da solo non apre niente.
2. **Gli indirizzi vecchi non si riscrivono, si leggono.** Trentatré fra colonne
   e chiavi jsonb contengono ancora `…/object/public/documenti/<percorso>`
   (`quote_anagrafiche.documenti` e `doc_identita_url`, `quote_documenti.url`,
   `quote_preventivi.dati.proposta_url`, `.polizza_url`,
   `.pagamento.bonifico_url`, `.messaggi[].doc_url`, `.documenti.*`,
   `quote_pratica_documenti.url`, `quote_sinistri.documenti[].url`,
   `iam_firme.doc_url`). `archPercorso` ne ricava il percorso e lo firma.
   Un aggiornamento di massa su quattro tabelle avrebbe risolto lo stesso
   problema lasciando indietro ogni riga scritta nel frattempo.
3. **La finestra si apre PRIMA della firma.** Firmare è una chiamata di rete: se
   la finestra si apre dopo, il browser la blocca come popup. C'è una prova che
   guarda l'ordine — e alla prima stesura quella prova era rotta, perché cercava
   la prima occorrenza di `window.open` invece di quella che aspetta il
   documento, e restava verde anche con l'ordine invertito. L'ha trovata la
   controprova, non il ragionamento.
4. **C'è una rete di sicurezza, ed è la parte che conta.** I punti che mostrano
   un documento sono decine, ognuno scrive il suo `<a href>` a mano, e basta
   dimenticarne uno perché quel documento non si apra più. Un ascoltatore sui
   clic (in cattura, su `document`) intercetta qualunque link che punti
   all'archivio — percorso o vecchio indirizzo pubblico — e lo firma. Vale anche
   per il codice che verrà scritto domani copiando il vicino.

### Quello che si romperà, di proposito, il giorno della chiusura

**I collegamenti pubblici già spediti smetteranno di funzionare.** Un cliente
che riapre una vecchia email «Scarica la tua polizza» troverà un errore. Non
c'è modo di evitarlo tenendo chiuso l'archivio. Da oggi quell'email porta un collegamento
**firmato che vale 30 giorni e lo dice nel testo** (`server/notify.js`): un
collegamento che muore in silenzio fa tornare il cliente arrabbiato, uno che
dichiara la sua scadenza lo fa tornare informato.

Due scadenze diverse, perché sono due cose diverse: **5 minuti** per aprire un
file dal gestionale, **30 giorni** per un documento allegato a un'email
(`SCADENZA` in `server/archivio.js`).

### Chi firma per chi non ha un account

Il collaboratore che apre la pagina di firma e il cliente che riceve l'email non
sono collegati a Supabase: il loro browser non può chiedere un indirizzo
firmato. Lo chiede il server, che ha la chiave di servizio
(`server/firmaCollab.js`, `server/notify.js`). Lo shop (`server/shop.js`)
restituisce il percorso invece dell'indirizzo pubblico, e in `server/sign.js` è
sparita `uploadDoc`, che fabbricava indirizzi pubblici e non la chiamava
nessuno.

### Sette difetti trovati rileggendo il proprio diff (18/09/2026)

La PR non ha CI, quindi l'unica revisione è quella che si fa a mano. Rileggendo
il diff con `/code-review` sono saltati fuori sette difetti che **nessuna delle
prove aveva preso**, perché guardavano i casi che chi le ha scritte aveva in
mente. Adesso ognuno ha la sua, e la sua controprova.

| difetto | cosa faceva |
|---|---|
| il contatore leggeva `quote_polizze` senza `visibleUserIds` | un collaboratore vedeva le pratiche di **tutta l'agenzia**, con nome del cliente e di chi le aveva fatte |
| `ARCH_PREFISSI` elencava i nomi delle **funzioni** (`pet`, `fv`, `sal`…) invece delle cartelle (`animali/`, `fotovoltaico/`…) | per quei moduli la rete di sicurezza non scattava |
| `salvaDocumento` salvava nella radice del contenitore, senza cartella | la rete non riconosceva il documento, il link navigava come indirizzo del sito |
| `pdocCarica` chiamava `M.campi('rcauto', null)`, la firma **vecchia** | il tipo documento non si trovava mai: ogni documento finiva segnato «non obbligatorio» |
| `apriAnagrafica` risolveva solo da `ANAG_CACHE` | «Anagrafica non trovata» su un cliente che esiste, arrivando dal fascicolo |
| l'avviso «solo RC Auto» scritto e subito sovrascritto | non lo vedeva nessuno |
| il contatore in errore mostrava `0` e non riprovava | due zeri rassicuranti su un archivio mai letto |

E due attrezzi che non chiamava nessuno (`archLink`, `caricaDocumento`) sono
stati tolti: in questo repository il codice che arriva e non viene collegato a
niente è il guasto numero uno (§1), e vale anche per il codice appena scritto.

**Due trappole delle prove sul sorgente**, trovate correggendole:

1. **I commenti mentono alle prove.** Un commento che *nomina* il difetto
   («qui prima c'era `M.campi`…») fa scattare la prova che cerca quella
   stringa, e dichiara rotto un codice corretto. Si cerca la chiamata, non la
   parola — la stessa trappola già scritta in §10.
2. **Togliere i commenti con una regex globale cancella codice vero.** Un
   «via tutto quello che sta fra `/*` e `*/`» su `index.html` si mangia
   **451.714 caratteri e 5.270 righe**: quelle due sequenze compaiono dentro
   le espressioni regolari e dentro il CSS, e la ricerca accoppia pezzi che
   non sono commenti. Una prova che gira su metà file dichiara pulito quello
   che non ha letto. In `archivio.test.mjs` si tolgono solo i commenti che
   cominciano a inizio riga.

### Cosa resta aperto

- **I due controlli sul campo che restano**: caricare un allegato su una
  fattura da IAM e riaprirlo; caricare un documento d'identità dalla scheda
  cliente su QUOTO e riaprirlo. Sono i controlli 1 e 2 di
  `supabase/migrations/20260918_archivio_documenti_chiuso.sql`. Il terzo —
  aprire un documento caricato PRIMA della chiusura, il cui indirizzo pubblico
  è ancora scritto nel database — è stato fatto ad archivio aperto e ha
  funzionato; va rifatto ora che è chiuso, perché è lì che si vede se la firma
  ricava bene il percorso dagli indirizzi vecchi. Il quarto è fatto e misurato
  qui sopra.
- **La cache della rete di distribuzione.** Un file già richiesto resta servito
  dalla cache fino a un'ora (`cache-control: max-age=3600`): nell'ora dopo la
  chiusura un documento può ancora aprirsi da un indirizzo pubblico. Non è la
  chiusura che non ha funzionato, è la cache che scade.
- **I percorsi restano indovinabili** (`rcvp/<millisecondi>_<nome>`). Con
  l'archivio chiuso non basta più indovinarli, ma la cartella casuale che già
  usano gli allegati delle fatture (`fatture/<id>/<codice casuale>_<nome>`) è
  la strada giusta per i prossimi caricamenti.
- **`note-informative` e `offerte` restano pubblici**, ed è voluto: i primi sono
  documenti precontrattuali che devono leggere tutti, i secondi immagini di
  marketing. Nessuno dei due contiene dati di clienti.


---

## 13. Il fascicolo prima della polizza (18/09/2026)

Il fascicolo si apriva **solo** da una polizza in portafoglio. Ma i documenti
si raccolgono prima: il cliente porta libretto e stato di famiglia mentre la
polizza non esiste ancora — non è emessa, spesso non è nemmeno decisa la
compagnia. Chi li riceveva se li teneva sul proprio computer finché la polizza
non entrava in portafoglio: **l'archivio sparso da cui si viene.**

| pezzo | dove |
|---|---|
| la tabella delle pratiche | `supabase/migrations/20260918_pratiche_senza_polizza.sql` (applicata) |
| le regole del collegamento | `Fascicolo.collegabile` in `tariffe/motore/fascicolo.js` |
| il contatore che conta anche le pratiche | `Fascicolo.fascicoliIncompleti`, che ora prende righe marcate `entita` |
| apri la pratica, carica, collega | `pdocApriPratica`, `pdocCollega`, `pdocCollegaA`, `pdocTestaPratica` in `index.html` |
| «Nuovo fascicolo senza polizza» | `fdocNuovaPratica` / `fdocCreaPratica`, linguetta «Documenti polizza» della scheda cliente |
| prove | `server/verifica/fascicolo.test.mjs` (23) e il blocco «pratica» in `ui-test.mjs` (4) |

**La strada che non si è presa, e perché.** Si poteva scrivere una riga finta
in `quote_polizze` e nasconderla. No: da `quote_polizze` leggono scadenzario,
titoli, produzione, estratto conto e il conteggio delle emesse. Una polizza che
non esiste, scritta lì dentro, diventa un numero falso in un cruscotto — e
prima o poi quel numero lo legge qualcuno. **Una pratica in lavorazione non è
una polizza**, e ha la sua tabella.

**Le colonne di `quote_pratiche` si chiamano come quelle di `quote_polizze`**
dove il motore le legge (`modulo`, `prodotto`, `compagnia`, `cliente`,
`cliente_id`, `dati`): così il motore lavora su una pratica senza sapere che
non è una polizza, e non esistono due versioni della stessa regola. Le due
eccezioni sono dichiarate: `data_prevista` non si chiama `data_effetto` perché
una pratica non ha effetto, e `descrizione` (targa, veicolo) serve a
distinguere due pratiche aperte dello stesso cliente.

**Il collegamento è il punto delicato.** Quando la polizza arriva, i requisiti
congelati passano su di lei **com'erano**, `congelato_il` compreso: rimetterci
la data di oggi vorrebbe dire dire che sono stati riletti, e non è vero (§11,
regola 4). I documenti la seguono con un aggiornamento di `entita`/`entita_id`:
non si ricarica niente. Quattro casi in cui non si collega, ognuno col suo
motivo detto in faccia: pratica senza fascicolo, cliente diverso, ramo diverso,
polizza che ha già il suo fascicolo.

**I tre passi non sono una transazione** (sono tre chiamate PostgREST), e
l'ordine regge un'interruzione: prima i requisiti sulla polizza, poi i
documenti, per ultimo la pratica segnata `collegata`. Se cade in mezzo, si
rifà: `collegabile` riconosce **il proprio** fascicolo già copiato (stessa
`congelato_il`, stessa operazione) e riprende, mentre quello di un'altra
pratica resta una cosa da non sovrascrivere. Senza quella riga il secondo
tentativo direbbe «questa polizza ha già un fascicolo» e i documenti
resterebbero sulla pratica per sempre.

**Il contatore di agenzia conta anche le pratiche**, ed è il motivo per cui
esiste: un fascicolo senza una riga in portafoglio che lo ricordi è quello che
si dimentica più facilmente. Il sottotitolo dice quante sono «in lavorazione,
senza polizza», e la riga porta `entita` e `id` — niente `polizza_id` finto su
una pratica, che farebbe aprire un fascicolo di polizza inesistente.

**Cartella nuova nell'archivio: `pratiche/`.** È in `ARCH_CARTELLE` (tutte e
due le copie, radice e `iam/`): senza, la rete di sicurezza non riconoscerebbe
il percorso e quei documenti non si riaprirebbero più (§12, difetto 2). La
prova `archivio.test.mjs` lo sorveglia da sé.

**Una trappola trovata scrivendo la prova.** Il finto database di `ui-test.mjs`
annotava i filtri quando parte `update`, cioè **prima** che `.eq(...)` li
aggiungesse: una prova che guardava «quali righe stai spostando» leggeva sempre
`{}` e restava verde comunque. Adesso i filtri si ricopiano quando la richiesta
parte davvero.

**Fuori dall'RC Auto** vale quello che vale per le polizze: documenti di base e
un avviso che lo dice. Una pratica non inventa operazioni che il motore non
conosce.

---

## 14. Il portafoglio che arriva dalla compagnia (18/09/2026)

Le compagnie mandano ogni notte un archivio zip col portafoglio. Non è un
formato di Prima: è lo **Standard Share File** (`SSF V12`), lo stesso tracciato
che usano altre compagnie e piattaforme — per questo il motore si chiama
`flusso-ssf` e non `prima`. Nove file CSV, uno per tipo di record:

| record | cosa contiene |
|---|---|
| REC000 | testata: chi manda, che versione, che periodo |
| REC010 | anagrafiche — **clienti e collaboratori mescolati** |
| REC020 | polizze |
| REC021 | il veicolo della polizza (targa, classe, settore) |
| REC030 | garanzie, col premio di ognuna |
| REC040 | titoli, cioè le rate, con le provvigioni |
| REC042 | dettaglio del titolo garanzia per garanzia (non importato) |
| REC100 | catalogo prodotti della compagnia |
| REC101 | produttori e collaboratori |

| pezzo | dove |
|---|---|
| tutte le regole di lettura | `tariffe/motore/flusso-ssf.js` |
| prove in Node, sul campione sintetico | `server/verifica/flusso-ssf.test.mjs` — 16 |
| il campione (dati inventati) | `server/verifica/campioni/ssf/` |
| la schermata | blocco `flu*` in `index.html`, pagina `#page-importa-flusso` |
| provenienza e registro | `supabase/migrations/20260918_importazione_flussi.sql` |
| prove nella pagina | blocco «flusso» in `ui-test.mjs` — 7 |

### Le cinque cose che il file dice e che nessuno indovinerebbe

Misurate sul file vero del 17/09/2026, non dedotte da un manuale. Ognuna ha la
sua prova, e ognuna, sbagliata, produce **numeri credibili e falsi**.

1. **Metà delle «anagrafiche» non sono clienti.** 37 righe in REC010: 20
   clienti e 17 collaboratori, distinti solo da `FLAG_COLLABORATORE`.
   Importarle tutte vuol dire mettere la propria rete di vendita nel
   portafoglio clienti, e da lì non si tira più fuori.
2. **`LORDO_TOTALE` della polizza è il premio DI RATA, non annuo.** Su una
   semestrale la polizza dice 110,00 e i due titoli dell'anno sommano 220,00.
   Scriverlo in `premio_annuo` dimezzerebbe il portafoglio su ogni polizza
   frazionata — e 110 è un numero credibile. Quando la rata non è l'anno
   intero, `premio_annuo` resta **vuoto**: moltiplicare sarebbe una stima, e
   una stima in un portafoglio diventa un dato dopo due settimane.
3. **Le righe senza `SCADENZA_EMESSO` non sono polizze: sono offerte.** Le
   righe in stato `PV` sono rinnovi emessi e non ancora pagati: `EFFETTO` è la
   data del rinnovo e `SCADENZA_EFFETTIVA` è `EFFETTO + 15 giorni`, cioè il
   **termine per pagare** (`GIORNI_MORA`), non la scadenza del contratto.
   Importarle riempirebbe lo scadenzario di scadenze false a due settimane.
   Il discriminante buono non è lo stato ma `SCADENZA_EMESSO`: se è vuoto, non
   è stato emesso niente. **Non entrano in portafoglio**, ma si elencano
   nell'anteprima: sono i clienti da chiamare, ed è la cosa più utile del file.
4. **Una polizza che finisce alla sua scadenza naturale non è annullata.**
   Prima non ha tacito rinnovo: alla scadenza la polizza «storna»
   (`ST`, motivo `EXPIRING_POLICY`, data di annullamento **uguale** alla
   scadenza) e ne nasce una nuova. Nove righe su trentadue sono così, e sei
   scadono nei mesi successivi. Segnarle annullate le toglierebbe dallo
   scadenzario: sono esattamente quelle da richiamare. Annullata è solo chi
   cessa **prima** della scadenza.
5. **Chi emette il flusso non è chi porta il rischio.** L'emittente è PRIMA; il
   rischio sta su TRIGLAV, GREAT_LAKES, LA_PARISIENNE, NOBIS, IPTIQ.
   `compagnia` resta l'emittente — è con lei che si lavora ed è su quel nome
   che sono scritte le regole documentali (§11) — e il portatore del rischio si
   conserva in `dati.ssf.compagnia_rischio`. **Da confermare con Francesco**:
   è l'unica scelta di questo lavoro che si può ribaltare, e si ribalta in una
   riga.

### Le regole della scrittura

- **Il cliente che c'è già non si tocca.** Non si aggiorna l'indirizzo, non si
  «completa» il telefono. Il flusso porta i dati come li ha scritti il cliente
  sul sito della compagnia; la scheda in agenzia l'ha sistemata qualcuno a
  mano, e sovrascriverla vorrebbe dire buttare via quel lavoro ogni notte.
  Alla polizza nuova si aggancia la scheda che c'è. Il riconoscimento è il
  **codice fiscale**, poi la partita IVA; mai il nome.
- **Si guarda prima di scrivere.** La schermata costruisce il piano, lo mostra,
  e scrive solo dopo. Un'importazione che scrive prima di farsi vedere è una
  cosa che si subisce: quando ci si accorge dei doppioni, sono già lì.
- **Si può ricaricare lo stesso file.** `fonte`/`fonte_id` tengono la chiave
  della compagnia, con un **indice unico** sul database: la garanzia non sta
  nel codice che controlla prima di scrivere, sta in Postgres, che dice di no.
  Senza, il flusso di ogni notte raddoppierebbe il portafoglio.
- **L'ordine di scrittura non è estetica**: clienti, poi polizze (che vogliono
  `cliente_id`), poi rate (che vogliono `polizza_id`). Se si ferma in mezzo,
  quello che è scritto resta e si ricarica: il secondo giro salta il fatto.
- **Quello che non si sa tradurre resta vuoto.** Un frazionamento, un mezzo di
  pagamento o un tipo di titolo che non è nel nostro vocabolario non si forza:
  il codice originale si conserva e l'anteprima lo dichiara. PayPal non diventa
  «carta di credito», e un titolo `RI` da 0,00 non entra in contabilità come
  una rata da zero euro.

### Lo zip si apre senza librerie

Niente JSZip da un CDN: dal contenitore di collaudo non si raggiunge, e sarebbe
una dipendenza in più. Si legge l'**indice** dello zip (central directory) e si
scompatta con `DecompressionStream('deflate-raw')`, che c'è nei browser e in
Node. Sessanta righe che non invecchiano. Si legge l'indice e non le
intestazioni locali apposta: lì le misure possono essere a zero e arrivare
**dopo** i dati, e chi le legge si ritrova file vuoti senza un errore.

### I dati veri non stanno nel repository

Il campione di collaudo è **sintetico**: stessa forma, nomi e codici fiscali
inventati, e dentro tutti i casi del file vero (società, doppione interno,
polizza senza contraente, semestrale, cessata a scadenza, annullata davvero,
offerta di rinnovo, titolo sconosciuto). Il file dell'agenzia contiene nome,
indirizzo, telefono, email e codice fiscale di clienti veri: non entra qui, ed
è la regola di casa §8.3.

C'è però una prova che gira **anche sul file vero**, se qualcuno glielo indica:

```bash
FLUSSO_VERO=/percorso/al/flusso.zip node server/verifica/flusso-ssf.test.mjs
```

Senza quella variabile dice «saltata» e va avanti. È l'unico modo di accorgersi
che una compagnia ha cambiato il tracciato: il campione sintetico, da solo,
resterà verde per sempre.

### Cosa non fa ancora

- **Le offerte di rinnovo non diventano niente**: si contano e si elencano.
  Il posto giusto sarebbe una **pratica** (§13), che le trasformerebbe in una
  lista di lavoro, e il collegamento alla polizza esiste già. Prima di farlo
  serve una decisione: una pratica è nata per raccogliere documenti, usarla
  anche per i rinnovi da incassare è una seconda vita che va voluta.
- **I collaboratori del flusso non si toccano**: il registro unico delle
  persone (§10) è un'altra cosa, e agganciarlo a occhio sui codici `U…`
  creerebbe il doppione che quel lavoro ha appena tolto. Il codice si conserva
  in `dati.ssf.collaboratore`.
- **REC042 e il catalogo prodotti** si leggono ma non si scrivono da nessuna
  parte: il primo è il dettaglio garanzia per garanzia di ogni rata, il secondo
  è il catalogo della compagnia, che non è il nostro catalogo di quotazione.

---

## 15. L'archivio dei documenti sul VPS, cifrato (18/09/2026)

Primo passo: **solo caricamento e apertura**. I documenti già su Supabase non
si migrano, il backup verso Mega non c'è, le regole del fascicolo non si
toccano. Due strade in parallelo, e nessuna rottura.

| pezzo | dove |
|---|---|
| cifratura, percorsi, le due rotte | `server/archivioVps.js` |
| prove, con le sette del brief | `server/verifica/archivio-vps.test.mjs` — 11 |
| i metadati e il permesso | `supabase/migrations/20260918_archivio_vps.sql` (applicata) |
| nel browser | `archCaricaVps` / `archApriVps` in `index.html` e `iam/index.html` |
| la rotta al backend | `/archivio/*` in `deploy/caddy/iam.caddy` |
| **come si genera la chiave e dove va la copia** | `deploy/ARCHIVIO-CIFRATO.md` |

### La chiave, prima di tutto il resto

**Senza la chiave i documenti non si aprono più. Mai più, da nessuno.** Sta
nell'ambiente del backend (`ARCHIVIO_CHIAVE`), una copia sta offline, e non sta
né nel repository né nel database né nei log.

E **non c'è un ripiego**. In `server/fonti.js` una chiave assente viene derivata
dal nome della macchina, e lì va bene: peggio di una chiave debole c'è una
password in chiaro. Qui no — un ripiego silenzioso vorrebbe dire scrivere carte
d'identità con una chiave che si ricostruisce leggendo il codice, e nessuno se
ne accorgerebbe. Senza chiave il modulo si spegne, risponde `503` e dice che
cosa manca.

### Com'è fatto un file sul disco

```
WUS1 | IV (12) | TAG (16) | cifrato        AES-256-GCM
```

IV nuovo per ogni file (riusarlo con la stessa chiave rende inutile GCM), tag
accanto al cifrato, sigla in testa per riconoscere il formato il giorno in cui
cambierà. Permessi `600`: cifrato **e** leggibile solo dall'utente del servizio.

### Il permesso non è scritto nel server

La rotta di apertura rilegge i metadati **con il token di chi sta chiedendo**:
se le politiche del database non gli fanno vedere la riga, non c'è niente da
decifrare. La chiave di servizio, che scavalca le politiche, in quella strada
non entra apposta. Così la regola di visibilità resta **una sola** e sta dove
stanno già tutte le altre — riscriverla nel server vorrebbe dire averne due, e
quella che sbaglia sarebbe quella che nessuno guarda.
`iam_archivio.arch_select` ricalca `pdoc_select` di `quote_pratica_documenti`.

E «non esiste» e «non è tuo» danno **la stessa risposta**: dire «esiste ma non
puoi» racconta a un estraneo che quel documento c'è.

### Tre cose da sapere prima di toccarlo

1. **La cartella sta fuori da `/opt/withus-backend`**, che Caddy serve come
   sito: un file lì dentro sarebbe scaricabile da un indirizzo, cifrato ma
   scaricabile da chiunque. Il backend lo controlla e si rifiuta di partire
   (`radiceConsentita`), e il controllo guarda il percorso **com'è arrivato**:
   `path.resolve` rende assoluto qualunque cosa, quindi «archivio» passerebbe
   finendo in un posto che dipende da come è stato avviato il servizio.
2. **Il nome del file che arriva dal browser non diventa mai un percorso.** Sul
   disco c'è solo l'id; il nome originale vive nei metadati.
3. **`/archivio/*` deve stare fra i percorsi di servizio di Caddy**, altrimenti
   su `iam.` la richiesta cade sul `handle` finale e il documento risponde con
   la pagina di IAM. C'è la prova in `deploy/dominio-unico.test.mjs`.

### Una controprova che non era una controprova

Per provare che il tag GCM serve davvero, il primo tentativo è stato avvolgere
`setAuthTag` in un `try/catch`: le prove sono restate **tutte verdi**, e
sembrava che la prova non sorvegliasse niente. Non era così: `setAuthTag` non
solleva, il controllo avviene dentro `final()`. Quel guasto non era un guasto.

La controprova vera è sostituire GCM con una cifratura **senza
autenticazione** (`aes-256-ctr`), che è quello che verrebbe da fare
«semplificando». Allora sì: diventano rosse tutte e due le prove che esistono
per questo — il byte manomesso che si apre lo stesso, e la chiave sbagliata che
restituisce spazzatura invece di fermarsi. *Una controprova che non fa diventare
rossa nessuna prova, prima di accusare la prova, va guardata bene: può essere
che il guasto non fosse un guasto.*

### Una prova che sorvegliava il posto giusto e il mondo di ieri

`archivio.test.mjs` pretendeva che `archCarica` fosse chiamata in **almeno due
punti**: era il numero misurato quando i caricamenti su Supabase erano due
(l'identità in anagrafica e il documento del fascicolo). Spostato il fascicolo
sul VPS, quel numero è calato e la prova è diventata rossa — giustamente, perché
non poteva sapere che il lavoro si era spostato invece di sparire. Si è
aggiornata la **regola**, non il numero: adesso pretende che ognuno dei due
caricatori sia chiamato da qualcuno, che è quello che voleva dire fin
dall'inizio (§1).

### Dove si arriva alla schermata

La voce «Importa» è nella barra in alto, ma quella barra ha **ventuno voci e
scorre**: Francesco non l'ha trovata, e aveva ragione a cercarla nel
Portafoglio. La stessa porta adesso è anche lì, in cima alla pagina. Non è un
doppione: è la stessa pagina raggiunta da dove la si cerca.

---

## 16. Quello che il flusso portava e si buttava, e la riga di portafoglio che si apre (18/09/2026)

Sei richieste di Francesco in fila, tutte sullo stesso pezzo: il portafoglio
arrivato dalla compagnia e quello che ci si fa sopra tutti i giorni.

| pezzo | dove |
|---|---|
| email dei collaboratori, dettaglio garanzie e provvigioni (REC042), mezzo di pagamento | `tariffe/motore/flusso-ssf.js` |
| la rata che resta da incassare | `rataDaIncassare` nello stesso file |
| le colonne nuove e il vocabolario dei mezzi allargato | `supabase/migrations/20260918_mezzo_pagamento_e_collaboratori.sql` |
| i tre pannelli della riga | `pol*` in `index.html` (`polDettaglio`, `polPagamento`, `polSalvaPagamento`) |
| prove | `server/verifica/flusso-ssf.test.mjs` (25) e i blocchi «portafoglio», «polizza» e «flusso» di `ui-test.mjs` |

### La rata che nessuno vedeva

La compagnia manda la rata successiva **solo quando l'ha già emessa**: sul file
vero del 17/09 succede **due volte su venticinque**. Per le altre quella rata
esiste lo stesso — il cliente la deve — e non la vedeva nessuno.

Il flusso però lo dice, in date invece che a parole: `FRAZIONAMENTO_SHARE` dice
in quante rate è divisa l'annualità, `SCADENZA_INCASSATO` fin dove è pagata,
`SCADENZA_EFFETTIVA` fin dove corre il contratto. Se la prima viene prima della
seconda, fra le due c'è un pezzo scoperto, e il suo inizio è la decorrenza della
rata successiva. È la stessa cosa che il brief chiamava «polizza appena emessa
con la rata successiva semestrale» — su una semestrale emessa oggi il flusso
dice «pagata per sei mesi, coperta per dodici» — detta in un modo che continua a
valere anche fra otto mesi, quando quella polizza non sarà più nuova.

**Due cose che non si fanno, ed è la metà del lavoro.**

1. **Non si inventa un importo.** `premio_rata` vale per una rata INTERA. Dove
   il pezzo scoperto è più corto — sul file vero capita con una polizza
   allineata a una scadenza diversa, pagata al 17/12/2026 e in corsa fino al
   07/03/2027 — quel troncone non lo quantifica nessuno. Si dichiara in un
   avviso e si lascia a mano. Scriverci dentro il semestre pieno metterebbe in
   contabilità un credito che non esiste.
2. **Non si duplica quello che la compagnia ha già mandato.** Se fra i titoli
   c'è già uno che decorre da quella data, la regola sta zitta.

La rata dedotta **si riconosce**: `fonte_id` finisce con `:RATA:<data>` — stabile,
quindi ricaricare lo stesso file non la raddoppia — e la nota dice in chiaro che
la compagnia non l'ha mandata. Anteprima e verbale contano le due cose separate
(`titoli.dedotti`, `conteggi.titoli_dedotti`). *Una riga di contabilità che non
si distingue da quelle vere è una riga di cui non ci si può fidare.*

### Gli altri tre dati che il file portava e si buttavano

- **L'email dei collaboratori** (REC010). È l'unico campo che corrisponde a
  qualcosa che abbiamo già: i codici della compagnia (`U25337`) non li conosce
  nessuno. Sul file vero **17 collaboratori su 17 ce l'hanno**. Si conserva e si
  mostra chi è già in agenzia e chi no — **non si aggancia e non si crea niente**
  (§10: agganciare a occhio rifarebbe i doppioni appena tolti).
- **Il dettaglio garanzia per garanzia delle provvigioni** (REC042). Sul file
  vero la somma delle provvigioni di garanzia fa **esattamente** il totale del
  titolo su 18 titoli su 18: è un dato che quadra, e dice su *quale* garanzia si
  guadagna. Le provvigioni di un collaboratore si contano dai titoli, **saltando
  quelli di polizze che non sono in portafoglio**: sono offerte di rinnovo non
  pagate, e attribuirle direbbe a qualcuno che ha guadagnato una cosa che il
  cliente non ha ancora pagato.
- **Il mezzo di pagamento.** Il vocabolario ne ammetteva cinque e tutto il resto
  finiva a NULL: sul file vero **15 polizze su 25**. Adesso sono nove (PayPal,
  prepagata, `altro`) e sulla polizza c'è una colonna sua, perché «questo cliente
  come paga?» è una domanda che si fa e una risposta che si corregge. Una lista
  multipla (`APPLEPAY/CREDITCARD/…`) vuol dire che la compagnia **non sa** quale
  sia stato usato: `altro` è la verità, prendere il primo sarebbe inventare.

### La riga di portafoglio si apre in tre posti

Prima tutta la riga apriva il preventivo — *quando c'era*. Su una polizza
arrivata dalla compagnia il preventivo non esiste, e la riga non faceva niente:
si guardavano quei dati senza poterli aprire.

| clic | dove porta |
|---|---|
| il numero | `polDettaglio`: garanzie, veicolo, date, premio, chi porta il rischio |
| il cliente | la sua anagrafica — e se non c'è un `cliente_id` **non è un collegamento**, e dice perché |
| il premio | `polPagamento`: rate, mezzo, stato, e lì si corregge |

I tre `stopPropagation` ci vogliono: senza, il clic arriva anche alla riga e si
aprono due cose insieme.

**I quattro pallini di stato non ci sono più** (richiesta di Francesco: «tanto
non ci servono a nulla»). Non sono stati cancellati: gli stati vivono nel
database e `pfSemafori` li disegna ancora nella scheda del cliente. Al loro
posto, nel portafoglio, c'è come paga il cliente. La prova che contava quattro
pallini per riga non era sbagliata: era **il mondo di ieri**. Si è aggiornata la
regola, non il numero — come per `archCarica` (§15).

### Chi ha fatto che cosa, e quando

Richiesta esplicita: «aggiungi sempre nella schermata di dettaglio l'utente che
ha effettuato la modifica, con data e ora». Il primo pezzo è fatto: ogni
pannello chiude con **chi ha creato la riga e quando**, da dove arriva (flusso
della compagnia, con codice ed email del collaboratore) e **l'ultima modifica**,
con chi e che cosa. Una correzione che non cambia niente non scrive niente: il
salvataggio parte da un `onchange`, che scatta anche rimettendo il valore di
prima, e una storia piena di modifiche che non hanno modificato nulla non serve
più a distinguerle.

> **Quello che manca, ed è il pezzo grosso.** `quote_log` ha `entita` (il tipo)
> e `dettaglio` (testo libero), ma **non ha `entita_id`**: alla domanda «chi ha
> toccato QUESTA polizza» il registro generale non sa rispondere, e per questo
> la traccia sta dentro `quote_polizze.dati.modifiche`. È un rimedio per una
> schermata, non l'archivio dei movimenti: perché «chi ha creato questa
> anagrafica, questa pratica, questo pagamento» abbia una risposta sola e per
> tutti, `quote_log` va esteso con l'id della riga toccata. È un lavoro a sé.

### I tipi di titolo che non sappiamo tradurre (18/09/2026, sul portafoglio completo)

Sul file completo di Prima l'anteprima ha dichiarato **quattro** tipi di titolo
non importati: `PS`, `ARM`, `ANN`, `RI`. Il lettore ne traduce **tre**: `PN`
(premio nuovo — copre nuovo affare, rinnovo e sostituzione), `QZ` (quietanza,
la rata successiva), `AP` (appendice).

**Non si traducono a occhio, ed è la regola §8.1 applicata a dei soldi.** Un
titolo è una riga di contabilità: `ANN`/`ANU` con un importo negativo *ha
l'aria* di uno storno, ma «ha l'aria» non è un dato, e un importo scritto per
somiglianza diventa un numero che nessuno rimette più in discussione.

Quello che si è fatto invece è renderli **decidibili**:

- ogni rata non tradotta arriva nel piano (`titoli.ignoti`) con **polizza,
  cliente, data, importo, provvigione, stato e il nome che le dà la
  compagnia** (`TIPO_TITOLO_COMPAGNIA`, che è metà dell'indizio);
- l'anteprima le elenca sotto «Rate che restano fuori»;
- **un avviso solo**, non uno per codice: quattro riquadri che dicono la stessa
  cosa con una sigla diversa si leggono come quattro guasti, e la cosa da fare
  è una sola.

Aggiungere un codice è **una riga** in `TIPO_TITOLO`, e c'è una prova che lo
dimostra girando davvero il motore con la riga aggiunta e poi togliendola.
Prima di aggiungerla serve sapere che cosa quel codice significa per la
compagnia — non dal repository, da chi il flusso lo manda.

---

## 17. L'estratto conto del collaboratore (18/09/2026)

Due conti diversi sullo stesso mucchio di rate, e **non vanno confusi**: una
rata sta in uno dei due, mai in tutti e due, perché o è incassata o non lo è.

| linguetta | che cosa mostra | a che serve |
|---|---|---|
| **Da versare** | le sue rate **non** incassate | telefonargli |
| **Provvigioni** | le rate incassate nel periodo, e quanto gli spetta | pagarlo |
| *Rimesse da preventivo* | la lettura di prima, che parte dai preventivi | confrontare i numeri, finché non tornano |

| pezzo | dove |
|---|---|
| tutte le formule | `tariffe/motore/estratto-conto.js` |
| le prove, in Node | `server/verifica/estratto-conto.test.mjs` — 14 |
| la colonna «di chi è questa rata» | `supabase/migrations/20260918_titoli_collaboratore.sql` (applicata) |
| assegnare, anche in blocco | `titAssegnaSelezionati` in `index.html`, pagina Titoli |
| la schermata, l'Excel e l'email | blocco `ecp*` in `index.html`, `#page-estratto` |
| prove nella pagina | blocchi «titoli» ed «estratto conto» in `ui-test.mjs` |

### Le quattro decisioni, prese da Francesco e non indovinate

1. **La provvigione matura sull'INCASSATO.** Una rata emessa e non pagata non
   ha prodotto niente per nessuno. È anche la cosa che tiene insieme i due
   conti: quello che sta nei sospesi non sta nelle provvigioni, *per
   costruzione*. Pagare sull'emesso vorrebbe dire anticipare soldi che il
   cliente non ha versato, e poi rincorrerli.
2. **La percentuale si applica alla PROVVIGIONE DI COMPAGNIA**, non al premio:
   il 60% dei 41,21 € che la compagnia riconosce, non il 60% dei 390 € pagati
   dal cliente — che farebbe **234 €**, un numero credibile e sei volte più
   grande di quello che l'agenzia incassa davvero.
3. **Il «guadagno indiretto» è il MARGINE DELL'AGENZIA**: provvigione meno la
   quota del collaboratore. Una sottrazione, non una gerarchia. L'override su
   «chi ha portato chi» **non esiste in questo sistema** e non si finge che
   esista: nel repository la parola «indiretto» compariva solo dentro due
   garanzie incendio.
4. **Le percentuali stavano già lì.** `iam_team.provv` è un elenco
   `{prodotto, perc, speciale, note}`, una percentuale **per prodotto**.
   Non se n'è inventata un'altra.

### La regola che comanda su tutte

**Quello che non si sa non si stima.** Se la compagnia non ha dichiarato la
provvigione di una rata, o se per quel prodotto non c'è una percentuale
concordata, la riga **non entra nei totali**: esce con il motivo scritto
accanto. Un estratto conto che arriva a un collaboratore è un documento su cui
si litiga, e **una riga stimata dentro un totale è una lite che si perde**.
Non esiste una «percentuale di default»: se non è concordata, non c'è. Uno
**zero** invece è un accordo, e si conta.

### Due cose di aritmetica che sembrano dettagli e non lo sono

- **Il margine si ricava per DIFFERENZA**, non con una seconda percentuale. Su
  33,33 al 50% i due arrotondamenti separati fanno 16,67 + 16,67 = **33,34**:
  un centesimo che nessuno sa spiegare, in un documento che si manda fuori.
- **Gli arrotondamenti dei negativi.** `Math.round(-0.5)` in JavaScript fa
  `-0`, cioè arrotonda *verso l'alto* anche i negativi. Gli storni esistono, e
  su uno storno quel centesimo va dalla parte sbagliata: `cent()` arrotonda
  simmetrico.

### Di chi è questa rata

`quote_titoli.collaboratore_id`, **nuova**. Non si poteva usare `creato_da`:
quello è chi ha digitato la riga, e sul portafoglio arrivato dal flusso è
l'utente che ha fatto l'importazione — **una persona sola, su tutte le rate**.
Attribuire così le provvigioni vorrebbe dire dare l'intero portafoglio a chi ha
premuto un bottone.

**Sulla rata e non sulla polizza**: una polizza vive anni e può cambiare mano,
e la rata è la granularità con cui si paga e con cui si sollecita.

**Niente deduzioni automatiche.** Il flusso porta un codice collaboratore e
un'email, e sarebbe comodo agganciarli da soli: ma quel codice non corrisponde
a nessuna persona in agenzia se non per somiglianza, e un aggancio sbagliato
qui è **una provvigione pagata a chi non doveva**. Si assegna a mano, e in
blocco dalla pagina Titoli — la selezione multipla c'era già per l'incasso.

Conseguenza sulla pagina Titoli: la casella di scelta adesso c'è su **ogni**
riga, non solo sulle aperte, perché assegnare un collaboratore vale anche su
una rata già incassata (è la sua provvigione). Il filtro sull'incasso resta
dov'era giusto, dentro `titIncassaSelezionati`. La prova che contava «solo le
aperte hanno la casella» misurava il mondo di ieri: si è aggiornata la regola —
*una rata incassata non si incassa una seconda volta* — non il numero.

### Chi vede chi

Le politiche del database impediscono già di leggere le rate degli altri, **ma
la tendina dei nomi no**: lasciarla intera mostrerebbe a un collaboratore
l'elenco di tutta la rete, e il riepilogo d'agenzia direbbe quanto prendono gli
altri. Chi non è staff vede solo se stesso, e la tendina è bloccata.

### Il foglio che esce di casa

Excel ed email **condividono lo stesso documento** (`ecpDocHTML`): se fossero
due costruzioni diverse, prima o poi direbbero due cose diverse, e quella
sbagliata sarebbe quella che il collaboratore ha ricevuto. L'Excel non è un
vero `.xlsx`: è una tabella HTML che Excel apre e riconosce, come tutti gli
altri export di casa. L'email parte dal server (`/mail/send`, che sa allegare
in base64) e **ripete i numeri che contano nel corpo**, perché un allegato che
nessuno apre non ha detto niente.

### Una trappola del banco di prova, e una controprova mal costruita

- **`let` al posto di `var`.** Le quattro variabili di stato (`ECP_TITOLI`,
  `ECP_POLIZZE`, `ECP_SCHEMI`, `ECP_VISTA`) sono `var` **apposta**: con `let`
  la variabile del modulo e `window.X` sono due cose diverse, e una prova che
  inietta un portafoglio finto scriverebbe in una mentre il codice legge
  l'altra — restando verde senza aver misurato niente.
- **`showPage` avvia un caricamento asincrono** che rilegge tutto dal database:
  mettere i dati finti prima che finisca vuol dire vederseli sovrascrivere a
  metà prova. Si aspetta.
- **Una controprova che non fa diventare rossa nessuna prova va guardata bene**
  (§15). «Si paga sull'emesso» tolto togliendo il controllo sullo stato è
  restato tutto verde: il filtro è sorvegliato in **due** punti (lo stato e la
  data dell'incasso), e ne avevo tolto uno solo. La controprova vera sposta la
  data di riferimento sulla decorrenza — e allora ne diventano rosse quattro.

### Cosa resta aperto

- **Le rate del pregresso sono tutte «non assegnate».** La colonna nasce vuota,
  e finché non si assegnano, l'estratto conto di ognuno è vuoto e il riepilogo
  d'agenzia ha una sola riga. È voluto, ma è lavoro da fare: la strada è la
  selezione multipla nella pagina Titoli.
- **La linguetta «Rimesse da preventivo» è un doppione dichiarato**, tenuto
  apposta finché i suoi numeri non sono stati confrontati con quelli nuovi.
  Quando tornano, si toglie: una schermata in uso non si spegne perché ne è
  nata una migliore, ma nemmeno si tiene per sempre.
- **Il vincolo di stato di `quote_titoli` ammetteva quattro valori e il codice
  ne scriveva un quinto** (`annullato`, da `annullaPolizzaDiPreventivo`): o
  quell'update falliva in silenzio, o esisteva una migrazione mai finita nel
  repository. Il vocabolario si è allargato invece di cambiare il codice,
  perché `annullato` è un'informazione vera e diversa da `stornato`.

---

## 18. Il registro dei movimenti (19/09/2026)

`quote_log` sapeva dire **che cosa** è successo, **chi** l'ha fatto e di che
**tipo** di cosa si trattava. Non sapeva dire **su quale riga** — e quella è la
domanda che in agenzia arriva sempre, e arriva mesi dopo: «chi ha cambiato
QUESTO pagamento?», «chi ha creato QUESTA anagrafica?».

Senza la risposta, ogni schermata che ci provava si costruiva la sua traccia
privata: `quote_polizze.dati.modifiche`, scritta il 18/09, era un rimedio per
una schermata sola. Adesso l'archivio dei movimenti è uno.

| pezzo | dove |
|---|---|
| le regole (che cos'è un identificativo, che cosa può portarlo, che cosa vuol dire «lo stesso movimento») | `tariffe/motore/registro.js` |
| le prove, in Node | `server/verifica/registro.test.mjs` — 12 |
| la colonna, la visibilità e la firma | `supabase/migrations/20260919_registro_movimenti.sql` (applicata) |
| chi scrive | `logMovimento(azione, entita, dettaglio, entita_id)` in `index.html` |
| la storia di una riga | `regCarica` / `regHTML` / `regInstalla`, contenitore `#pol-storia` |
| la pagina Log | `loadLog`, che ora usa `Registro.unisci` e apre la riga con un clic |
| prove nella pagina | blocco «registro» in `ui-test.mjs` — 5 |

### Le tre cose che il motore NON fa, ed è il motivo per cui esiste

1. **Non inventa un collegamento.** Un `entita_id` che non è un uuid non si
   scrive: diventa vuoto e la cosa finisce in console. **Un id sbagliato è
   peggio di un id assente** — manda ad aprire la riga di qualcun altro, e chi
   guarda non ha modo di accorgersene. Il movimento però si registra lo stesso,
   senza il puntatore: perdere il fatto sarebbe peggio che perdere il
   collegamento.
2. **Non unisce due movimenti veri.** La pagina Log univa le righe con una
   chiave a occhio — *azione + nome + dettaglio + minuto* — e due movimenti
   identici nello stesso minuto (due documenti caricati di fila, due incassi
   uguali) diventavano **uno**. Adesso **il registro non si tocca mai**: si
   scarta soltanto una riga *derivata* (ricostruita dai preventivi o dai
   sinistri) quando il registro ha già quel fatto.
3. **Non nasconde quello che non conosce.** Un tipo fuori vocabolario si mostra
   com'è scritto, senza icona e senza collegamento. Nelle 230 righe già scritte
   ce n'è una con `entita` = *il nome di una tabella*: è un refuso a un punto di
   chiamata, e deve **vedersi**.

### Il vocabolario non rinomina lo storico

I nomi sono quelli che stavano **già** nei dati (`preventivo` 126, `cliente` 65,
`emissione` 13, `utente` 9, `ticket` 5, `documento` 4, `polizza` 2,
`trattativa` 1). Rinominarli avrebbe voluto dire riscrivere lo storico o tenere
due vocabolari, e uno dei due sarebbe stato quello che nessuno guarda. L'unica
correzione è a un punto di chiamata che scriveva `anagrafica` dove tutta la
casa scrive `cliente`: due nomi per la stessa cosa sono due elenchi che non si
incrociano.

Ogni voce dice **in quale tabella vive**, e dove non vive in nessuna
(`utente`, `incasso`, `emissione`, `documento`) **un identificativo non si
scrive**: prometterebbe un collegamento che non esiste.

### Chi può leggere un movimento — ed è cambiato

Prima: `iam_is_staff()`. Un collaboratore non vedeva **niente**, nemmeno la
storia delle proprie polizze — e «chi ha cambiato questo pagamento» se la
chiede lui per primo.

Adesso: **si vede il movimento di una riga che si vede già.** È la stessa regola
di `quote_pratica_documenti` e di `iam_archivio` (§15), applicata a un archivio
di fatti invece che di documenti: la visibilità non si riscrive, si eredita —
riscriverla qui vorrebbe dire averne due. I movimenti che non puntano a una riga
restano allo staff: sono l'attività dell'agenzia, non la storia di una cosa che
si possiede.

**E il registro dice chi, quindi deve essere vero.** `log_insert` non aveva
nessun controllo: chiunque poteva scrivere una riga firmata con l'identificativo
di un altro. In una tabella qualunque è un difetto; in un registro **è il**
difetto. Adesso `with check (utente_id = auth.uid())`, e l'aggiornamento è
vietato a tutti: un movimento non si corregge.

### La copertura, e la soglia che sale

**31 punti di chiamata su 52** passano l'identificativo. I ventuno che restano
non sono dimenticanze: sono movimenti che non puntano a una riga (impostazioni,
punti vendita, incassi in blocco, importazioni) o inserimenti che non si fanno
restituire l'id. Una prova misura quel numero e **la soglia si alza, non si
abbassa** — è lo stesso meccanismo delle collisioni fra i due documenti (§10),
al contrario. Senza, un punto di chiamata scritto domani senza identificativo
non lo noterebbe nessuno, e il registro tornerebbe piano piano a sapere solo
«una polizza».

### Due decisioni sul quarto parametro

`entita_id` è **l'ultimo** e facoltativo. Metterlo al secondo posto avrebbe
costretto a rivedere cinquantatré punti di chiamata in un colpo solo, e un
movimento perso vale più di un collegamento mancante. Gli avvisi del motore
vanno in **console**, non davanti all'utente: chi sta salvando una polizza non
deve essere interrotto perché il registro ha scartato un puntatore — ma chi
programma deve poterlo vedere.

### «Non risponde» e «non c'è niente» sono due cose diverse

`regCarica` torna `null` quando la lettura non riesce e `[]` quando non ci sono
movimenti. Il riquadro lo dice in faccia: *«Il registro non risponde. Non vuol
dire che non ci siano stati movimenti: vuol dire che non si è potuto
leggerlo.»* Confonderli rassicura a sproposito — ed è lo stesso difetto del
contatore documentale che mostrava `0` su un archivio mai letto (§12).

### Una controprova mal costruita, di nuovo

«La fusione a occhio» rimessa dentro **senza toccare la chiave** è restata tutta
verde: le due righe della prova avevano identificativi diversi, quindi
qualunque chiave che li contenga le tiene separate. La controprova vera rimette
la chiave **di prima** (azione + nome + dettaglio + minuto), che di
identificativo non ne ha, e allora ne diventano rosse due. Nel frattempo la
prova si è rinforzata col caso che quella regola sbagliava davvero: **due
movimenti identici senza identificativo**, che è come sono tutte le righe
scritte prima di oggi.

### Cosa resta aperto

- **Lo storico non si aggancia.** Le 230 righe scritte prima di oggi non hanno
  `entita_id` e non si possono agganciare senza indovinare: restano visibili
  allo staff nella pagina Log, e la storia di una riga comincia dal 19/09/2026.
  Il riquadro lo dice invece di far credere che non sia successo niente.
- ~~IAM non scrive nel registro.~~ **Fatto il 19/09/2026**, poche ore dopo.
  Vedi il paragrafo qui sotto.
- **`dati.modifiche` si legge ancora** (quello che c'è scritto è successo
  davvero) ma non si scrive più. Quando quelle righe saranno vecchie si toglie.


### Il registro arriva anche in IAM (19/09/2026, stesso giorno)

IAM non chiamava `logMovimento` **nemmeno una volta**: fatture, permessi,
schede economiche, cassa, blacklist — niente lasciava traccia, e la domanda
«chi ha cambiato questa cosa» aveva una risposta solo per metà della casa.

| pezzo | dove |
|---|---|
| il motore, **lo stesso file** | `/nuovo-preventivo/tariffe/motore/registro.js`, caricato da `iam/index.html` |
| la copia sottile (database e DOM) | `logMovimento`, `regCarica`, `regInstalla` in `iam/index.html` |
| il riquadro «chi e quando» | `#mc-storia`, nella scheda del collaboratore |
| la colonna diventata testo | `supabase/migrations/20260919_registro_movimenti_2_chiave_testo.sql` (applicata) |
| prove | `iam/verifica/registro-movimenti.test.mjs` — 6 |

**Il motore non si copia: si carica.** IAM e il preventivatore sono la stessa
origine dal 16/09 (IAM alla radice, QUOTO sotto `/nuovo-preventivo/`), quindi
quell'indirizzo esiste davvero e punta a **un file solo**. Due copie del
vocabolario vorrebbero dire due storie della stessa agenzia. Il banco statico
ora conosce lo stesso prefisso (`static-server.js`): senza, una prova sarebbe
fallita *per la strada* su un file che in produzione si carica benissimo.

Restano gemelli dichiarati **tre funzioni** (`logMovimento`, `regCarica`,
`regInstalla`) e **due classi CSS** (`reg-r`, `cl-sub`): toccano il database e
il DOM, quindi in un motore non possono stare, e in QUOTO l'utente è
`currentUser` mentre in IAM è `ME` — come `PAY_API`/`MAIL_API` per l'archivio.
`fusione-collisioni.test.mjs` li esenta **per nome**, con due guardie: devono
esistere in tutti e due i documenti, e **tutti e due devono caricare davvero il
motore** — altrimenti l'esenzione coprirebbe un doppione vero.

> **Il guardiano cercava una stringa, e quella stringa stava in un commento.**
> Con IAM che caricava una copia locale la prova restava verde, perché
> `tariffe/motore/registro.js` compare anche dentro un commento del blocco.
> Adesso cerca il **tag** `<script src=…>`. È la trappola già scritta due volte
> (§10, §12), e stavolta l'ha presa la controprova.

#### La misura che ha cambiato una decisione

`quote_log.entita_id` era nato `uuid`. Poi il registro è arrivato in IAM, e le
tabelle hanno detto un'altra cosa:

| forma dell'id | tabelle |
|---|---|
| `uuid` | `iam_utenti`, `iam_lead`, `iam_formazione`, `quote_collaboratori` |
| **testo** | `iam_team` (le schede economiche), `iam_workdiary` |
| **numero** | `sessioni_giornaliere` (la cassa), `iam_ticket`, `iam_trattative`, `iam_gare_config` |

Con una colonna `uuid`, **metà di IAM non si sarebbe potuta agganciare**: il
movimento si sarebbe registrato senza puntatore, e il registro sarebbe stato
costruito a metà — con la metà mancante invisibile. La colonna è diventata
`text`, e **il controllo si è spostato dove serviva**: il motore adesso sa per
ogni voce che forma ha il suo identificativo e rifiuta le altre. Un uuid su una
tabella a numeri non apre niente, e un numero al posto di un uuid nemmeno.

*Non si sono cambiate le tabelle di IAM*: portare `iam_team.id` da testo a uuid
vuol dire riscrivere ogni riga che lo referenzia, e farlo per mettere a posto un
registro è la coda che muove il cane.

**Due trappole del database, annotate.** Postgres rifiuta di cambiare il tipo di
una colonna usata in una politica: la politica va tolta prima e rimessa subito
dopo (fra i due passaggi la tabella resta con RLS attiva e **senza** politica di
lettura, cioè invisibile a tutti tranne il servizio — nell'ordine opposto la
migrazione fallisce a metà). E il confronto nella politica è `x.id::text =
entita_id`, **mai** `entita_id::uuid`: convertire un testo qualunque in uuid
*solleva un errore*, e un errore dentro una regola di visibilità non è un
permesso negato — è una schermata che non si apre.

#### Che cosa registra IAM adesso

Tredici punti di chiamata, sulle cose che tornano indietro mesi dopo: schede
economiche salvate ed eliminate, candidature che cambiano stato, **blacklist**,
utenti sospesi e riattivati, **ruoli cambiati**, accesso al preventivatore dato
o tolto, RUI, lead, trattative, corsi, cassa del giorno. Una prova misura quel
numero e **la soglia sale, non scende**.

`fattura` è nel vocabolario ma **senza tabella**: `iam_fatture` non esiste — le
fatture stanno dentro `iam_team.fatture`, un elenco nella scheda — quindi non
c'è una riga da aprire, e il movimento si aggancia alla **scheda**. Dargliene
una inventata avrebbe prodotto puntatori che non aprono niente.

#### Il riquadro lo disegna il motore

`Registro.storiaHTML` è nato qui: con due schermate, due copie dello stesso
riquadro diventano due riquadri che un giorno diranno cose diverse. `esc` arriva
da chi chiama — è l'unica cosa che il motore non può avere. QUOTO è stato
riportato sulla stessa funzione: prima se lo disegnava da sé.

---

## 19. Di chi sono le rate del pregresso (19/09/2026)

`quote_titoli.collaboratore_id` esiste dal 18/09 e nasceva vuota. Finché resta
vuota l'estratto conto di ognuno è vuoto e il riepilogo d'agenzia ha una riga
sola: il lavoro del 18/09 c'era tutto e non serviva a nessuno.

### La misura che ha deciso il lavoro

Presa sul database vero **prima** di scrivere una riga di codice:

| | |
|---|---|
| rate | **55**, di cui **0** assegnate |
| polizze con un codice collaboratore | **25 su 30**, **11 codici** distinti, tutti di PRIMA |
| `creato_da` sulle 55 rate | **un solo utente** — anche sulle 38 che non vengono dal flusso |
| nome ed email di quei codici | **non sono nel database** (`collaboratori: []` nel verbale, nessuna `collaboratore_email` sulle polizze) |

Da cui la conclusione, che non è un'opinione: **non esiste in questo sistema un
dato che dica chi è `U25274`.** Assegnare in automatico vorrebbe dire inventare
(§8.1), e una provvigione inventata è pagata a chi non doveva.

### Indovinare e applicare una decisione non sono la stessa cosa

Il codice della compagnia è **stabile**: `U25274` sarà `U25274` anche nel flusso
di stanotte e in quello fra un anno. Quindi la domanda «chi è U25274» si fa
**una volta sola**, la risposta si scrive, ed è firmata.

Dal risultato le due cose si somigliano — delle rate cambiano padrone senza che
nessuno le tocchi una per una — e nella sostanza sono opposte: una la può
smentire chiunque, l'altra ha un nome e una data. È la stessa distinzione del
registro unico delle persone (§10), dove l'aggancio per codice fiscale si fa e
quello per somiglianza no.

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/assegnazione.js` |
| prove in Node | `server/verifica/assegnazione.test.mjs` — 19 |
| la tabella delle decisioni | `supabase/migrations/20260919_codici_collaboratore.sql` (applicata) |
| il pannello | blocco `asg*` in `index.html`, dalla pagina Titoli |
| il flusso che applica da sé | `fluChiDi` e `fluConferma` in `index.html` |
| prove nella pagina | blocchi «assegnazione» e «flusso» in `ui-test.mjs` — 7 |

### Le cinque regole, e perché ognuna esiste

1. **Niente decisione, niente assegnazione.** Nessun ripiego, nessun «quello che
   ha più polizze». Non deciso vuol dire non deciso.
2. **Non si sovrascrive quello che c'è.** Chi ha assegnato a mano sapeva
   qualcosa che il codice non sa — un subentro, una polizza che ha cambiato
   mano — e un'applicazione in blocco che glielo cancella è lavoro perso che
   nessuno si accorge di aver perso. `sovrascrivi` esiste, ed è una scelta
   esplicita che si conta a parte.
3. **La chiave è la coppia compagnia+codice.** Due compagnie possono usare lo
   stesso codice per due persone: su una chiave a codice solo la seconda
   decisione mangerebbe la prima, in silenzio.
4. **«Nessuno» è una decisione** (la produzione diretta dell'agenzia) e non
   torna più a chiedere. Confonderla con «non deciso» vorrebbe dire riproporre
   ogni volta le stesse righe, e chi rivede sempre le stesse righe smette di
   guardarle.
5. **L'email aggancia solo se è una.** Un indirizzo che tocca una sola persona
   diventa una **proposta**; due persone con lo stesso indirizzo non producono
   niente. Il nome non si guarda mai: «Rossi Mario» e «Mario Rossi» si
   somigliano, e la somiglianza qui costa una provvigione.

### Quattro stati, non due — e il quarto si è scoperto scrivendo il flusso

`persona`, `nessuno`, `da-ridecidere` (deciso, ma quella persona è stata
cancellata), `non-deciso`. La colonna `deciso` esiste per tenere separati gli
ultimi due: l'importazione scrive nome, email e RUI accanto al codice **appena
li trova**, perché servono a riconoscerlo la prima volta che lo si guarda, ma
una riga di sole evidenze non è una decisione andata a vuoto. Senza quella
colonna ogni codice mai guardato comparirebbe in rosso, **e un allarme che suona
sempre non lo guarda più nessuno**.

### La schermata serve a riconoscere il codice, non a leggerlo

Nessuno si ricorda «U25274»; tutti si ricordano i clienti che ci stanno sotto.
Ogni riga del pannello porta polizze, rate, premio, provvigione, periodo,
prodotti e i primi nomi di clienti. In cima ci sono i codici con più rate ferme:
una schermata che mette per primi quelli già a posto fa scorrere per niente.

### Il giro si chiude sul flusso

Decisa la persona una volta, `fluConferma` fa nascere le rate **già sue**;
l'anteprima lo dice prima di scrivere (`rate a Neri Anna` / `codice da
decidere`) e il verbale conta quante sono nate assegnate. Senza questo pezzo
ogni notte tornerebbero rate da assegnare a mano — e a mano non le assegna
nessuno: è il motivo per cui il lavoro del 18/09 era rimasto fermo.

### Due cose trovate dalle prove, non dal ragionamento

- **Il banco non vedeva due scritture su tre.** `in()` e `upsert()` erano
  *passanti* nel finto database di `ui-test.mjs`: una prova che guardava «quali
  righe stai spostando» o «che cosa stai salvando» leggeva sempre niente e
  restava verde qualunque cosa facesse il codice. È lo stesso difetto già
  corretto il 18/09 sui filtri di `update` (§13), un metodo più in là.
- **Una controprova che non era una controprova, di nuovo** (§15, §17, §18).
  Tolto dal flusso il controllo «è stato deciso?» e lasciato «c'è un
  collaboratore?», tutto restava verde: il banco provava solo il caso «nessuna
  riga», dove i due lettori si comportano uguale. La controprova vera ha avuto
  bisogno di un banco più cattivo — **una riga non decisa che porta già un
  collaboratore**, com'è dopo che l'importazione ha annotato le evidenze — e
  allora la prova diventa rossa.

### Cosa resta aperto

- **Gli undici codici sono ancora tutti da decidere**, ed è il punto: il sistema
  ha finito il suo lavoro quando ha chiesto. Finché nessuno risponde, le 55 rate
  restano non assegnate — e questa volta si vede dove, con quanto, e a chi
  chiedere.
- **Le 38 rate su polizze nate in QUOTO non hanno un codice** e non si possono
  attribuire a chi ha importato. Si assegnano a mano dalla pagina Titoli, che ha
  già la selezione multipla; il pannello lo dice invece di fingere di saperlo.
- **Il nome e l'email dei codici arriveranno col prossimo flusso**: nel verbale
  del 18/09 `collaboratori` era `[]`. Da quel momento il pannello mostrerà anche
  come si chiamano, e `proposteDaFlusso` potrà proporre gli abbinamenti per
  indirizzo — proporre, non decidere.

### L'abbinamento si fa dove il codice si legge (19/09/2026, stesso giorno)

> «Dammi la possibilità a me di abbinare il codice produttore di Prima
> all'intermediario» — Francesco.

Il pannello dei Titoli c'era già, ma i codici produttore si leggono
**nell'anteprima del flusso**, sotto «Chi ha prodotto»: chiedere di cambiare
schermata per abbinarli è la stessa distanza che aveva fatto perdere la voce
«Importa» nella barra da ventuno voci (§15). Adesso ogni riga di quell'elenco ha
la sua tendina: si sceglie lì, si salva subito, e l'anteprima si ridisegna.

La riga di decisione la costruisce **una funzione sola** (`asgRigaDecisione`),
usata dalle due schermate: due costruzioni della stessa riga diventano prima o
poi due regole diverse su chi viene pagato.

**Il RUI viene prima dell'email.** Il flusso porta tre codici che fino a ieri
erano uno: `ID_ANAGRAFICA_EXP` (con cui le polizze nominano il collaboratore),
`CODICE_PRODUTTORE` (come lo chiama la compagnia) e `COD_RUI` (il numero con cui
è iscritto al registro). Solo l'ultimo dice **chi è** una persona invece di dove
la si scrive: un'email è un recapito e i recapiti si prestano — la casella
dell'agenzia su due schede, quella di un collaboratore usata dal suo assistente.
Quindi la proposta si fa sul RUI e solo dopo sull'email, che resta perché cinque
persone su diciassette il RUI non ce l'hanno scritto. In tutti e due i casi vale
«aggancia solo se è **una**»: nel registro vero ci sono dodici schede con il RUI
e **undici numeri distinti**, cioè due persone con lo stesso numero, e lì non si
propone niente — si dice che c'è da sistemare il registro.

Il confronto ignora spazi, punti e maiuscole: lo stesso numero è scritto
`E000123456` in agenzia e `E 000.123456` dalla compagnia, e due stringhe diverse
per lo stesso intermediario non agganciano niente.

#### Un difetto che ha trovato la prova, e non era piccolo

`upsert` **riscrive la riga intera**: le colonne che non si passano tornano al
valore di partenza. Abbinare un codice avrebbe cancellato nome, email, RUI e
codice produttore che il flusso aveva annotato — e la volta dopo quel codice
sarebbe tornato a essere una sigla da riconoscere a memoria, cioè esattamente il
problema che questa tabella esiste per risolvere. Adesso le evidenze si
ripassano a ogni scrittura, con una regola dichiarata: **dove il flusso che si
sta guardando ha un valore vince lui** (è più recente), dove non ha niente resta
quello che c'era.

#### Due trappole del banco, annotate

- **`selected` diventa `selected=""`.** Il browser normalizza l'attributo quando
  si rilegge `innerHTML`: una prova che cerca la forma scritta a mano dichiara
  rotto un codice giusto.
- **Il campione non distingueva i tre codici.** In `REC101` di collaudo
  `CODICE_PRODUTTORE` era uguale a `ID_ANAGRAFICA_EXP` e `COD_RUI` era vuoto:
  una prova che li confronta sarebbe stata verde per costruzione. Il campione
  adesso li tiene diversi (`U90001` / `P-7788` / `E000111111`), e c'è una prova
  che controlla **che restino diversi** — altrimenti smette di misurare.

#### Il pannello dei Titoli propone come l'anteprima (19/09/2026)

Per un giorno le proposte da RUI ed email le faceva **solo** l'anteprima del
flusso: il pannello del pregresso leggeva le stesse evidenze — quelle che
l'importazione scrive accanto al codice — e non proponeva niente. Due schermate
sugli stessi dati che dicono cose diverse: a chi guarda non importa da quale
delle due ci è arrivato.

La regola è **una sola** e sta nel motore. Ci si entra da due porte:
`proposteDaFlusso` (righe del file) e `proposte` (righe della tabella), e tutte
e due passano per lo stesso `proponiUna`, che accetta i nomi delle due
provenienze (`rui`/`rui_flusso`) come già fa `rigaDecisione`. Una prova
confronta le due porte sulle stesse evidenze e pretende la **stessa** persona.

**Ogni riga porta la sua compagnia.** Il pannello mostra insieme i codici di
tutte: passarne una sola vorrebbe dire attribuire alla prima i codici di tutte
le altre, e due compagnie possono usare lo stesso codice per due persone
(regola 3). Per questo `proposte` prende la compagnia da ogni riga e non
dall'elenco.

E **resta una proposta**: la tendina non si muove da sola. La prova lo controlla
per prima, così una tendina che si auto-seleziona lo dice con parole sue invece
di far fallire un'altra riga più in basso.

#### Cosa resta aperto, in più

- ~~La strada inversa non c'è.~~ **Fatta** poche ore dopo, vedi qui sotto.
- ~~La scheda in IAM non propone.~~ **Allineata**, vedi in fondo a §19.

### La strada inversa: dalla scheda della persona ai suoi codici (19/09/2026)

Dal codice alla persona si passa da QUOTO; dalla scheda del collaboratore in
IAM si guarda dall'altra parte — **questa persona su quali codici lavora?**
È la domanda che si fa aprendo una scheda, e fino a oggi non aveva risposta da
nessuna parte.

| pezzo | dove |
|---|---|
| il riquadro «Codici compagnia» | `#mc-codici` e blocco `ccp*` in `iam/index.html` |
| il motore, **lo stesso file** | `/nuovo-preventivo/tariffe/motore/assegnazione.js` |
| prove | `iam/verifica/codici-compagnia.test.mjs` — 10 |

**La riga di decisione è salita nel motore** (`Assegnazione.rigaDecisione`).
La scrivono tre schermate — il pannello del pregresso, l'anteprima del flusso e
la scheda in IAM, che è un altro documento — e tre costruzioni della stessa riga
diventano tre regole diverse su chi viene pagato. In pagina resta solo chi
firma, che il motore non può sapere.

**I codici stanno sulla PERSONA, non sulla scheda economica.** `TEAM_PERSONA`
(`quote_collaboratori.id`), non `TEAM_ID` (`iam_team.id`): una persona può
cambiare scheda e i suoi codici restano suoi, mentre agganciarli alla scheda
vorrebbe dire perderli al primo cambio.

**Il RUI della scheda si confronta con quello del flusso**, normalizzato come
nel motore. Se non coincidono, o l'abbinamento è sbagliato o uno dei due numeri
è vecchio: in tutti e due i casi è meglio saperlo prima di pagare. L'avviso è
**giallo e non rosso** — non è un guasto, e un rosso che non è un guasto insegna
a ignorare i rossi.

**Togliere un codice toglie la DECISIONE, non la riga**: nome, email, RUI e
codice produttore che il flusso aveva portato restano, e servono a chi dovrà
riabbinarlo. E lo dice in faccia: *le rate già assegnate non tornano indietro*,
perché il dato è sulla rata e questa tabella è solo il modo con cui ci si è
arrivati.

**Decide l'admin, non lo staff**, come nel pannello: qui si decide a chi vanno
dei soldi. La prova non guarda solo che il cancello esista — guarda che sia
**chiamato**, perché una funzione di controllo che non chiama nessuno è il
guasto numero uno di questo repository (§1).


### Anche la scheda in IAM propone (19/09/2026)

Terza e ultima cucitura: dalla scheda si vede **quali codici liberi sembrano
suoi**, in cima alla tendina, con la spunta e il motivo. Le stesse evidenze e la
stessa regola delle altre due schermate — cambia solo il verso della domanda:
non «di chi è questo codice» ma «quali codici sono di questo qui».

`Assegnazione.suoi(righe, persone, personaId)` è la terza porta dello stesso
`proponiUna`. Due cose che fa e che si dimenticano:

**Si passano TUTTE le persone, non solo quella aperta.** La regola «aggancia
solo se è una» si può applicare soltanto guardando gli altri: con l'elenco
ridotto alla persona che si sta guardando, due colleghi con lo stesso RUI
diventerebbero una proposta sicura — e sarebbe **sicura di niente**. La prova
lo dimostra girando il motore nei due modi: con tutte non propone, con una sola
propone. È il difetto scritto accanto alla regola, perché la prossima volta si
riconosca.

**Un codice già deciso non «sembra» di nessun altro.** Riproporre a Tizio un
codice assegnato a Caio sarebbe un invito a sovrascrivere il lavoro di
qualcuno: è la regola 2 guardata dall'altro lato. Restano fuori anche quelli
decisi «nessuno».

E la tendina **parte dal vuoto**: aprendo una scheda non si abbina niente da
solo, e il testo lo dice — *«Confermali tu: il sistema non abbina niente da
solo»*. Una prova controlla il primo `<option>`, perché è quello che il browser
sceglie da sé.
---

## 20. L'altro tracciato: SSF V8 (19/09/2026)

Francesco ha mandato un flusso di **Plurima** chiedendo «facciamo lo stesso per
le altre compagnie». Il lettore si è fermato al primo passo: *«il file vero non
ha testata»* — che sembra un archivio rotto, ed era un archivio che non
sapevamo aprire.

| pezzo | dove |
|---|---|
| le due convenzioni di nome, e le regole che dipendono dal tracciato | `tariffe/motore/flusso-ssf.js` |
| il campione sintetico V8 | `server/verifica/campioni/ssf-v8/` |
| prove | blocco «V8» in `server/verifica/flusso-ssf.test.mjs` — 10 |
| l'anteprima che dichiara le mancanze | `flu-senza` in `index.html`, 1 prova in `ui-test.mjs` |

### Che cosa il file dice, misurato e non dedotto

`VERSIONE_TRACCIATO` = **SSF V8**, non V12. Stessa famiglia, versione
precedente: **sei** record invece di nove e circa **metà** delle colonne.

| | Prima (V12) | Plurima (V8) |
|---|---|---|
| record | 9 | 6 — niente veicoli, garanzie, dettaglio provvigioni |
| polizze | 51 colonne | 25 |
| titoli | 40 colonne | 17 |
| anagrafiche | 43 colonne | 22 |

**I file si chiamano in un altro modo**: `SSF_20_polizze.csv` invece di
`REC020_M_PRIMA_…`. Il riconoscimento andava per prefisso `REC\d{3}` e non li
vedeva. Nel modo nuovo il numero non è a tre cifre (`0`, `10`, `20`, `100`): si
riempie a sinistra con gli zeri, e **`100` resta `100`** — leggerlo come «10»
metterebbe il catalogo prodotti al posto delle anagrafiche.

### La regola che vale più di tutte le altre

> **«La colonna non c'è nel tracciato» non è «la colonna c'è ed è vuota».**

È la stessa distinzione fra «non risponde» e «non c'è niente» (§18), applicata
alle colonne invece che alle righe. Il lettore adesso tiene l'**intestazione**
di ogni record, non solo le righe, e le regole chiedono *«questo tracciato
dichiara questa colonna?»* prima di fidarsi di un campo vuoto.

Senza quella domanda, tre regole si comportano male — e la prima in modo
catastrofico:

1. **`SCADENZA_EMESSO` non esiste in V8.** La regola 3 dice «se è vuoto non è
   mai stato emesso niente, è un'offerta»: letta così, **tutte e venti** le
   polizze di Plurima sarebbero rimaste fuori dal portafoglio. Dove quella
   colonna non c'è si guarda lo **stato** (`PV` = rinnovo emesso e non pagato,
   che è il vocabolario dello standard), e il ripiego **si dichiara** invece di
   spacciarsi per la regola vera.
2. **`FLAG_COLLABORATORE` non esiste.** Senza una seconda strada la rete di
   vendita entra nel portafoglio clienti (regola 1). La seconda strada c'è:
   collaboratore è chi compare fra i **produttori** (REC101).
3. **`COLLABORATORE_1` sta sull'ANAGRAFICA, non sulla polizza.** La polizza
   eredita il codice dal suo contraente. **Non** si usa `AGENZIA`, che pure sul
   file vero coincide riga per riga (3 polizze su «3520», 17 su «3489»): quello
   è il codice dell'agenzia, e farne un codice produttore vorrebbe dire
   inventare un collaboratore che è l'agenzia stessa.

E due che degradano da sole, correttamente: senza `SCADENZA_INCASSATO` non si
deduce nessuna rata (dedurre senza quel dato sarebbe inventare un credito), e
senza `MEZZO_PAG_SHARE` come paga il cliente resta vuoto.

### Due cose del file vero che nessuno indovinerebbe

- **`DATA_ANNULLAMENTO` è valorizzata su tutte e venti le polizze**, che sono
  tutte in stato `AT` (attive). Non è un annullamento — somiglia a una scadenza.
  La regola 4 regge perché guarda lo stato prima della data, ma quel campo
  **non si legge** finché la compagnia non dice che cos'è.
- **`PROVVIGIONI_TOTALE` arriva `0,00` su tutte e trentasette le rate.** Non è
  vuoto: è zero. E l'estratto conto tratta le due cose in modo **opposto**
  (§17) — uno zero è un accordo e si conta, un vuoto esce dai totali col motivo.
  Convertire l'uno nell'altro sarebbe inventare in tutte e due le direzioni:
  **lo zero resta zero**, e l'anteprima lo dice a chi deve chiederlo a Plurima.

### L'anteprima dichiara quello che non c'è

Un riquadro giallo — non rosso, non è un guasto — elenca che cosa quel tracciato
non porta: le offerte non distinte, la rata non deducibile, i collaboratori senza
flag, il mezzo di pagamento, il veicolo, le garanzie, il dettaglio provvigioni,
le provvigioni a zero. **«Le provvigioni sono a zero» su un estratto conto
sembra un nostro errore di calcolo**: sapere che arrivano così da chi le manda è
un'altra conversazione, e si fa con la compagnia.

### Un difetto trovato dal motore, non dalla lettura

Il campione sintetico aveva una riga con **una colonna in meno**: l'email di un
collaboratore usciva come `s`, perché tutti i campi dopo il codice fiscale erano
sfalsati di uno. L'ha trovato il motore girando sul campione, non la rilettura
del CSV — un file di prova sbagliato è una prova che misura un'altra cosa.

### Cosa resta aperto

- **Le due domande a Plurima**: che cos'è `DATA_ANNULLAMENTO` su una polizza
  attiva, e se le provvigioni a zero sono un accordo o una colonna di default.
  Finché non rispondono, il primo campo non si usa e il secondo si dichiara.
- **Gli alias delle compagnie**: `quote_compagnie` ne ha solo per HDI e Prima.
  Un flusso il cui emittente non corrisponde al nome del catalogo non ritrova le
  sue regole documentali (§11). Plurima non è ancora in quella tabella.
- **Il file vero non sta nel repository** (§8.3): il campione V8 è sintetico e
  ricalca i casi che contano. La prova sul file vero si lancia con
  `FLUSSO_VERO=… node server/verifica/flusso-ssf.test.mjs`.

---

## 21. Brief IAM #01 — M1: dettaglio polizza e scheda cliente (19/09/2026)

Il brief dice «App: IAM, stack React + Node/Express, Vercel». Nessuna delle
tre cose è vera per questo repository (§9, §10): portafoglio, scheda cliente e
dettaglio polizza vivono in `index.html` alla radice (QUOTO), IAM li mostra
nel riquadro, e la produzione è Caddy sul VPS. Il brief si è letto per quello
che chiede, non per lo stack che immagina. Sei punti, una migrazione, due
motori.

| voce | dove |
|---|---|
| 1.1 «Ultima modifica: nome — gg/mm/aaaa hh:mm» | `Registro.ultimaModifica` / `quandoBreve` in `tariffe/motore/registro.js`: la scrive il motore, quindi la vedono QUOTO **e** IAM |
| 1.2 data di emissione | colonna `quote_polizze.data_emissione` + indice (`supabase/migrations/20260919_m1_emissione_e_sinistro_polizza.sql`, applicata); il flusso la scrive (`data(r.DATA_EMISSIONE)`); nel portafoglio il filtro «Date su» (emissione/effetto/scadenza); nel dettaglio è un campo che si corregge |
| 1.3 clic sulla polizza dalla scheda cliente | `caricaCollegati` → `polDettaglio(id)`, **senza** chiudere `#anag-overlay`: chiudendo il dettaglio si è di nuovo nella scheda |
| 1.4 pallini | `pfSemafori` **cancellata** (era chiamata in un posto solo) |
| 1.5 cronologia | «Scadenza polizza · n. X · targa Y», niente «in arrivo»; la targa arriva con `targa:dati->ssf->veicolo->>targa` nella select |
| 1.6 nuovo sinistro dalla scheda | `clSinistri`, `apriNuovoSinistro(clienteId)`, colonna `quote_sinistri.polizza_id` |
| prove | `registro.test.mjs` (16), `flusso-ssf.test.mjs` (40), blocchi «M1» in `ui-test.mjs` (433) |

### Quello che il brief chiedeva e che c'era già

Prima di scrivere una riga si è misurato (§1): il registro dei movimenti con
l'id della riga (§18) copre 1.1 salvo l'etichetta; il dettaglio polizza (§16)
mostrava già garanzie, veicolo, date e premio; i codici produttore per
compagnia di **M4.1** sono esattamente §19 — con una differenza voluta: il
brief dice «collegare automaticamente», qui si collega **dopo che una persona
ha deciso una volta**, e il non deciso finisce nella lista da abbinare (che è
la stessa accettazione del brief, letta con la regola §8.1).

### Le risposte ai quattro «punti da chiarire» del brief

1. **M1.1** — lo storico c'è: `quote_log` con `entita_id` dal 19/09/2026 (§18).
   L'etichetta prende il movimento **più recente per data**, non il primo
   dell'elenco; senza movimenti l'ultima modifica è la creazione; se il
   registro non si è potuto leggere l'etichetta **non compare** — un «ultima
   modifica: Anna» con in mezzo un movimento di Mario non letto è falso.
2. **M1.2** — la data di emissione c'è nel tracciato **V12** (Prima) e non nel
   **V8** (Plurima): il lettore lo dichiara nel riquadro giallo. Backfill fatto
   sulle 25 polizze dal flusso (`dati.ssf.data_emissione`, forma ISO); le 5
   nate in QUOTO restano vuote — «effetto» non è «emissione», si emette prima
   che decorra, e una data indovinata conta la polizza nel mese sbagliato.
3. **M4.2** — decisione presa in M4, non qui.
4. **M5** — le provvigioni arrivano dal file dove la compagnia le dichiara
   (Prima sì, Plurima 0,00) e la quota del collaboratore da `iam_team.provv`
   (§17); nessuna tabella di aliquote nuova.

### Tre scelte che non sono dettagli

- **Il filtro per data non ripiega.** «Emesse a settembre» su una polizza che
  la data di emissione non ce l'ha risponde *no*, non *forse sull'effetto*:
  ripiegare conterebbe polizze di cui l'emissione non si sa.
- **Il produttore nel dettaglio non si indovina.** Tre risposte: il
  collaboratore delle rate; la persona **decisa** per il codice della compagnia
  (o «produzione diretta» se deciso «nessuno»); altrimenti «codice U… non
  ancora abbinato», con la strada per farlo. Un nome per somiglianza qui è una
  provvigione pagata a chi non doveva (§19).
- **Il sinistro punta alla polizza vera**, non a un numero scritto a mano:
  `polizza_id` con `on delete set null`, perché cancellare una polizza non
  cancella un sinistro che è successo davvero. La tendina propone solo le
  polizze del cliente aperto.

### Due prove aggiornate perché misuravano il mondo di ieri

«Gli stati non sono spariti: `pfSemafori` li disegna ancora nella scheda
cliente» e «gli eventi futuri sono etichettati *in arrivo*». Tutte e due
giuste il 18/09 e sbagliate il 19/09. Si è aggiornata la **regola** (§15,
§16): gli stati restano in `PF_PAG`/`pfCopertura` e si leggono a parole;
il futuro si distingue con la classe `fut`, e la voce dice numero e targa.

### Una trappola già scritta, presa di nuovo

`git checkout <file>` per «annullare la controprova» ha annullato **anche il
lavoro** su `registro.js`: la controprova si era fatta sul file già modificato
e non ancora committato. Per una controprova su un file sporco si fa la copia
prima (`cp`), non `git checkout`. Il lavoro si è riscritto; le prove lo hanno
detto subito.

### Cosa resta aperto

- `tracciabilita.test.mjs` è rosso **anche su `main` prima di questo lavoro**
  (10/17): non è di qui, va guardato a parte.
- Le 5 polizze nate in QUOTO hanno `data_emissione` vuota: si scrive dal
  dettaglio.
- M2–M5 del brief: una PR per milestone, in ordine.

---

## 22. Brief IAM #01 — M2: i filtri (19/09/2026)

| voce | fatto |
|---|---|
| 2.1 date ovunque | intervallo «dal / al» su **otto** barre: portafoglio, titoli, scadenzario, estratto conto, documenti (scadenze e fascicoli), sinistri, storico preventivi. Le ultime quattro non ce l'avevano |
| 2.2 solo al clic | nessun `oninput`/`onchange` sulle barre; tasto **Cerca** (`.pf-cerca`) e **Azzera filtri**; Invio dentro una barra vale come Cerca (un ascoltatore solo, su `document`); i valori restano nei campi dopo la ricerca |
| 2.3 scadenzario | card-contatore cliccabili, **stati che non si sovrappongono**: Scadute (rosso), Imminenti 0–30 (arancio), Prossime 31–90 (blu), Tutte. Ogni card porta il numero e i premi in gioco; il clic filtra subito |
| prove | `ui-test.mjs` **436** (una sul sorgente misura tutte le barre insieme, una sul comportamento dal percorso vero, una su sinistri e storico) |

**Le fasce cumulative sono sparite di proposito.** «Entro 30 / entro 60 /
entro 90» mettevano la stessa polizza in tre contatori: 1, 2, 3 per la stessa
cosa, e un numero che si somma con se stesso non si legge. La prova che
contava «cinque fasce cumulative» misurava il mondo di ieri; si è aggiornata la
regola. Il contatore sulla voce di menu (`rinBadge`, ≤ 60 giorni) non è
cambiato: è un avviso, non una fascia.

**Il clic su una card o su un bottone di stato ricalcola subito.** «Solo al
clic su Cerca» vale per i campi da riempire (testo, tendine, date): un clic è
già un clic. I `metti(...) + pfRender()` delle prove vecchie continuano a
valere perché chiamano il rendering direttamente.

**Controprova** (rimesso `oninput="pfRender()"` su un campo solo): rosse **due**
prove, quella sul sorgente e quella sul comportamento. Se un giorno ne resta
rossa una sola, l'altra ha smesso di misurare.

**Trappola dei nomi.** Il modulo «Apri sinistro» usa già `sin-compagnia` e
`sin-polizza` per i suoi campi: i filtri della pagina Sinistri si chiamano
`sinf-*`, altrimenti `getElementById` avrebbe letto il campo del modulo aperto
come filtro della lista.

---

## 23. Brief IAM #01 — M3: l'anagrafica (19/09/2026)

| voce | fatto |
|---|---|
| 3.1 nascita dal CF | motore **nuovo** `tariffe/motore/anagrafica.js`: mese in lettera, giorno +40, regola del secolo su «oggi», **omocodia sciolta**, **carattere di controllo verificato**, data che deve esistere. Il flusso la usa quando `DATA_NASCITA` manca (`_nascita_da_cf`). Backfill sul database: **20 anagrafiche** su 21 senza data, con la nota «ricavata dal codice fiscale» (`20260919_m3_nascita_da_codice_fiscale.sql`, applicata) |
| 3.2 età | `Anagrafica.eta`, calcolata al giorno e **mai salvata**; nella scheda accanto alla data |
| 3.3 compleanni | blocco «Compleanni di oggi» in cima alla pagina Clienti (`cpl*`), torta nel titolo della scheda il giorno stesso; il 29/02 si festeggia il 28 negli anni non bisestili |
| 3.4 auguri | un clic per persona, email (`/mail/send`, casella dell'agenzia) o WhatsApp; **solo con consenso marketing e un recapito**, e chi non si può contattare resta in elenco col motivo; modello con `{nome}`, `{agenzia}`, `{firma}` corretto nel riquadro e ricordato nel browser; traccia nel **diario** del cliente (`quote_note`: un augurio è un contatto) e nel registro |
| prove | `server/verifica/anagrafica.test.mjs` (8), `flusso-ssf.test.mjs` (41), `ui-test.mjs` (439) |

### C'erano già due parser del codice fiscale, e davano due risposte

`awCfNascita` (senza omocodia, senza controllo, data in italiano) e `datiDaCF`
(con omocodia, senza controllo, data ISO), a 4.000 righe di distanza. Un
codice con un refuso passava da tutti e due e diventava una data credibile.
Adesso sono **due porte sullo stesso motore**, e un controllo sbagliato non
produce niente: **vuoto si vede, sbagliato no** (§8.1). La prova sul sorgente
cerca `Anagrafica.nascita(` dentro tutte e due.

### Il backfill non fa tutto quello che fa il motore, e lo dice

In SQL non si verifica il carattere di controllo e non si sciolgono le
omocodie: erano **0 omocodici** sul database vero, e riscrivere l'algoritmo
del controllo in Postgres sarebbe stata una seconda regola. Le righe
ricavate portano la nota in `note` — è l'unico modo di ritrovarle, perché una
colonna «origine della data» non c'è e non valeva la pena aggiungerla per una
volta sola. La riga rimasta senza data ha un codice che il backfill non
accetta: la scheda gliela metterà dal motore, se il codice è valido, oppure
resterà vuota.

### Tre trappole del banco, annotate

- **`f()` della scheda fa l'escape del valore**: l'età con lo `<span>` dentro
  compariva come testo. La riga della data di nascita si costruisce a parte.
- **`apriAnagrafica` è `async`** (dal 18/09 rilegge dal database se la cache
  non ha l'id): senza `await` la prova leggeva la scheda prima che esistesse.
- **80 in omocodia è «UL», non «VL»**: la mia prova sbagliava, il motore no.
  La controprova vera (via la verifica del controllo) ha fatto diventare
  rosse una prova Node **e** una nel browser.

### Cosa resta aperto

- Il modello degli auguri è **per browser** (`localStorage`), non per agenzia:
  se serve uno solo per tutti va in `iam_azienda.dati`.
- Chi ha già ricevuto gli auguri oggi si vede nella sessione (`CPL_INVIATI`)
  e nel diario del cliente; riaprendo la pagina il tasto ricompare. Leggere il
  diario del giorno per spegnerlo è un pezzo piccolo, non fatto.

---

## 24. Brief IAM #01 — M4: collaboratori e pagamenti (19/09/2026)

| voce | fatto |
|---|---|
| 4.1 codici produttore per compagnia | **già fatto** (§19): tabella `quote_codici_collaboratore` (compagnia + codice → persona), scheda del collaboratore in IAM, abbinamento dall'anteprima del flusso, rate che nascono già assegnate. L'unica differenza col brief è voluta: «collegare automaticamente» vale **dopo che una persona ha deciso una volta**; i codici non decisi sono la lista di eccezioni |
| 4.2 pagamento precompilato | il mezzo che dice la compagnia è già sulla polizza e sulla rata dal flusso; nella barra dell'incasso **parte da quello** (`titBarra`) e si corregge; la correzione dal dettaglio lascia il movimento (M1) |
| 4.2 chi paga | `quote_titoli.pagatore_tipo` (cliente / collaboratore / agenzia), `pagatore_collaboratore_id`, `rimesso_il`, `rimesso_da` (`20260919_m4_pagatore_collaboratore.sql`, applicata). La barra dell'incasso chiede **chi ha pagato**; «collaboratore» senza dire quale non incassa |
| 4.2 credito agenzia | `EstrattoConto.creditoAgenzia`: le rate incassate **dal** collaboratore e non rimesse. Nell'estratto conto (linguetta «Da versare») una sezione sua con «Segna rimesso»; nel riepilogo d'agenzia la colonna «Da rimettere» e la card del totale |
| prove | `estratto-conto.test.mjs` (15), `ui-test.mjs` (441) |

### Tre conti, non due

§17 ne aveva due: da versare (rate non incassate) e provvigioni (rate
incassate). La rata incassata dal collaboratore per conto dell'agenzia non
sta in nessuno dei due: **è incassata** (quindi non è un sospeso) ed **è
premio** (quindi non è compenso). È un terzo conto — un credito dell'agenzia
verso di lui — e si chiude solo con la rimessa. Metterla fra i sospesi
l'avrebbe fatta sembrare un cliente moroso; fra le provvigioni, un compenso.

**Il credito guarda chi ha PAGATO, non chi ha prodotto.** Una rata assegnata a
Tizio ma incassata da Caio è un credito verso Caio: per questo il riepilogo
d'agenzia lo calcola su tutte le rate, non sul mucchio di ognuno, e una
persona che ha solo incassato (mai prodotto) compare lo stesso.

**Il mezzo di pagamento allargato anche per le rate.** `TIT_MEZZI` ne aveva
cinque mentre il vincolo del database ne ammette nove dal 18/09: un PayPal
arrivato dal flusso non si poteva scegliere nella barra dell'incasso e non si
leggeva nell'estratto conto.

### Quello che il brief chiedeva al punto 3 «da chiarire»

*«Il credito va solo tracciato, o serve una vista partite aperte con saldo e
registrazione dell'incasso?»* — fatta la seconda, ma piccola: la vista è
la sezione nell'estratto conto del collaboratore (con il saldo aperto) e la
registrazione è «Segna rimesso» (`rimesso_il`, `rimesso_da`, movimento sulla
rata). Non è una milestone a parte: sono quaranta righe sopra un motore che
c'era già.

### Trappola del banco

`TIT_VISTA` e `TIT_SEL` sono `let`: `window.TIT_VISTA` non esiste. Nella prova
si usano i nomi nudi, come le altre prove dei titoli. È la stessa cosa scritta
in §17 per le variabili dell'estratto conto, dall'altro lato.
