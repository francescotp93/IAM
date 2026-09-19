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
