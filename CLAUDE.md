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

---

## 25. Brief IAM #01 — M5: il foglio cassa (19/09/2026)

| voce | fatto |
|---|---|
| 5.1 contenuto | le rate **incassate con la data** (`quote_titoli`), dal flusso della compagnia e segnate a mano — la colonna «fonte» lo dice riga per riga. Non è un terzo archivio |
| 5.2 filtri | compagnia, mezzo, collaboratore, intervallo di date degli incassi; al clic su **Cerca** (M2); «Questo mese» come azzera |
| 5.3 barra | Premi incassati · Provvigioni dirette · Provvigioni indirette (di cui ai collaboratori) · Resta all'agenzia · Da confermare |
| 5.4 quadrature | per mezzo, per compagnia, per collaboratore — con la riga di totale, e la prova che **la somma dei gruppi torna col totale** |
| 5.5 provvigioni | su ogni riga: provvigione di compagnia, collaboratore e la sua quota (con la %), quello che resta all'agenzia |
| 5.6 azioni | correzione del movimento (data, mezzo, chi paga, nota) con il movimento a registro **sulla rata**; apertura della polizza e dell'anagrafica |
| 5.7 export | Excel (tabella HTML come gli altri) e **PDF con la carta intestata** (`FoglioCassa.documentoPdf` → `PdfWithus.disegna`), tutti e due **sui filtri applicati** e sugli stessi oggetti della schermata |
| dove | `tariffe/motore/foglio-cassa.js` (5 prove Node), blocco `fc*` e `#page-foglio-cassa` in `index.html`, 3 prove in `ui-test.mjs` (**444**) |

### Dirette e indirette, decise (punto 4 «da chiarire»)

Le provvigioni **arrivano dal file** dove la compagnia le dichiara (Prima sì,
Plurima 0,00, §20) e stanno sulla rata; la quota del collaboratore viene da
`iam_team.provv` con la **stessa funzione** dell'estratto conto
(`EstrattoConto.rigaProvvigionale`, cercata a ogni chiamata come per
`anagrafica.js`). Nessuna tabella di aliquote nuova.

- **Diretta** = provvigione di compagnia su una rata senza collaboratore:
  resta tutta all'agenzia. Su queste **non** si chiede la percentuale — la
  prima stesura lo faceva, e tutte le dirette uscivano «da confermare» con
  dirette = 0. L'ha detto la prova, non la lettura.
- **Indiretta** = su una rata con collaboratore: quota a lui, margine
  all'agenzia. «Resta all'agenzia» = dirette + margine sulle indirette.
- Quello che non si sa non entra nei totali (§17): premi sì, provvigioni no,
  e la card «Da confermare» conta quante.

**Il filtro per collaboratore guarda chi ha PRODOTTO la rata**, non chi l'ha
incassata: il foglio cassa è la produzione. Chi ha incassato sta nella colonna
«chi paga» (M4), ed è un'altra domanda.

### Dove sta la porta

Il brief dice «dentro Portafoglio»: il tasto è in cima alla pagina
Portafoglio, e la pagina evidenzia Portafoglio nel menu. **Non** è nel menu
`MEGA` della scocca di IAM: quel menu è contratto (`INTERFACCIA-QUOTO-IAM.md`
§2.6) e toccarlo vuol dire versione e impronta della scocca. Si raggiunge dal
Portafoglio, che nel menu c'è.

### Controprova

Dirette e indirette confuse (tutte e due = tutte le righe): rossa la prova
Node su dirette/indirette. La correzione del movimento con gli stessi valori
**non scrive niente**, e c'è una prova.

### Cosa resta aperto

- Un «nuovo movimento manuale» dal foglio cassa non c'è: un incasso a mano
  nasce nella pagina Titoli (M4), e il foglio lo legge. Se serve una scorciatoia
  da qui, è un tasto che porta lì.
- Il PDF si prova con `PdfWithus.disegna` intercettato: il disegno vero con
  jsPDF vuole il CDN, che dal contenitore non si raggiunge (§14).

---

## 26. Brief IAM #02 — M1: i conti e le causali (19/09/2026)

Base di tutto il brief #02: senza un elenco di conti e uno di causali non si
registra un movimento, e senza movimenti non c'è prima nota, non c'è estratto
conto e non c'è conto economico.

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/contabilita.js` |
| prove in Node | `server/verifica/contabilita.test.mjs` — 11 |
| le due tabelle, le politiche, il trigger, il rollback | `supabase/migrations/20260919_b02_m1_conti_e_causali.sql` (applicata) |
| il pannello | blocco `cnt*` e `#panel-conti` in `iam/index.html`, Strumenti › Conti e causali |
| la voce di menu | `iam/withus-one.js` (`MEGA`, `TITOLI`, `TAB2MENU`) |
| prove sul pannello | `iam/verifica/conti-causali.test.mjs` — 9 |

**Misurato prima di scrivere.** Non esisteva nessuna tabella di conti né di
causali: la contabilità di IAM era `sessioni_giornaliere` (68 righe, il foglio
del giorno) e `iam_conto` (2 righe, l'estratto della banca caricato da file).
In `iam_azienda.dati` c'erano `iban1`, `iban2` e `banca`: due coordinate scritte
come testo, che nessuno può usare per registrare un movimento.

### Le due decisioni che comandano su tutto il resto

**1. Le due nature del denaro non si mescolano.** Un conto è `premi` (soldi dei
clienti in transito verso la compagnia, che l'art. 117 CAP vuole su un conto
separato dal patrimonio dell'agenzia) oppure `aziendale`. Una causale dichiara
su quale natura si può registrare, e `Contabilita.compatibile` lo dice **prima**
del salvataggio, con il motivo scritto in faccia. Una causale a natura `null`
vale su tutti i conti, ed è il caso delle spese bancarie: il bollo lo addebita
anche la banca del conto premi, e vietarlo vorrebbe dire non poter registrare un
fatto accaduto. La stessa funzione **riempie la tendina** e **rifiuta**: due
strade separate diventerebbero una schermata che propone quello che il
salvataggio poi respinge.

**2. `incide_su_utile` separa il movimento economico da quello finanziario.**
«Incasso premi» e «Rimesse in compagnia» muovono il conto e **non** il
risultato: sono le due facce dello stesso denaro in transito. Senza quella
colonna il conto economico conterebbe come utile l'intero premio incassato —
cioè i soldi di qualcun altro, un numero grande, credibile e falso. C'è una
prova che lo misura: sui dati di collaudo i ricavi sono 41,21 e i premi
incassati 590, e la prova diventa rossa se i secondi finiscono nei primi.

### Il saldo non si scrive, si calcola

L'unico numero scritto a mano è `saldo_iniziale`, quello del giorno in cui il
conto entra nel sistema. **Non c'è nessuna colonna `saldo`**, ed è una decisione:
un saldo memorizzato si aggiorna da un'altra parte, e il giorno in cui si scosta
dalla somma dei movimenti nessuno sa più quale dei due sia quello vero. C'è una
prova che lo verifica dai due lati — la colonna non esiste nella migrazione, e
il motore ignora una `saldo` scritta a mano su un conto.

**I movimenti arrivano con la M3.** Finché quella tabella non c'è, il saldo
calcolato è quello iniziale, e la schermata **lo dice** («nessun movimento
ancora: è il saldo iniziale dichiarato») invece di far credere che sia il saldo
di oggi. Il conto dei movimenti passa già al motore: il giorno in cui la prima
nota esiste, questa schermata non cambia di una riga.

Le due cifre di natura diversa **non si sommano in un totale unico**: un «totale
liquidità» che mette insieme i premi dei clienti e i soldi dell'agenzia fa
credere ricca un'agenzia che ha solo incassato dei premi da rimettere.

### Quello che non si cancella

Un conto con movimenti **non si cancella, si spegne**: i movimenti che ci sono
passati sono storia, e cancellare il conto li renderebbe orfani. Un conto spento
esce dalle tendine e resta nei riepiloghi del passato. Le dieci causali di
partenza si possono rinominare e spegnere, mai cancellare: ci si aggancia
l'automatismo dell'incasso (M3), e il divieto sta **in un trigger del database**,
non nella schermata — la schermata è una delle strade, non l'unica (c'è la
console, c'è PostgREST, ci sarà QUOTO).

**Il codice di una causale non si tocca mai.** È la chiave stabile a cui
punteranno i movimenti; il nome si corregge. La prova legge separatamente il
ramo dell'update e quello dell'insert, perché è lì che la differenza si perde.

### Chi legge e chi scrive

Leggere: lo staff (`iam_is_staff()`) — chi registrerà un movimento deve poter
scegliere il conto. Scrivere: l'admin (`iam_is_admin()`), perché qui si decide
dove finiscono i soldi: è la stessa soglia dei codici collaboratore (§19). Il
cancello **vero** è nelle politiche del database; il bottone nascosto è solo per
non mostrare la porta. La prova non guarda che `cntPuoScrivere` esista — guarda
che sia **chiamata** (§1).

### Dove sta e dove non sta

La voce è in **Strumenti**, non in Contabilità: qui si *configura* dove sta il
denaro e come si chiamano i movimenti, in Contabilità si *registra*. È la stessa
ragione per cui «Fonti compagnie» e «Stato collegamenti» sono due voci e non una.

**Il motore si carica, non si copia**: `/nuovo-preventivo/tariffe/motore/contabilita.js`,
lo stesso file che caricherà il preventivatore. Due vocabolari della contabilità
sarebbero due contabilità della stessa agenzia. La prova cerca il **tag**
`<script src=…>`, non la stringa: quel percorso compare anche nei commenti.

**Nomi**: esiste già `iam_conto` (singolare), che è un'altra cosa — l'estratto
conto caricato da file, chiave `tipo`, colonne `movimenti`/`bonif`. Non ha
nessuna colonna in comune con `iam_conti`: sbagliare tabella non produce numeri
sbagliati, produce un errore subito. `iam_conto` è destinato a sparire con la M5.

### Due trappole, e una è nuova

- **Una classe CSS di una lettera dentro un discendente non è scoped.**
  `.cnt-card .v` sembra al sicuro e non lo è: nel foglio di stile `v` è un nome
  globale, e QUOTO ce l'aveva già. L'ha preso `fusione-collisioni.test.mjs`.
  Adesso ogni classe porta il prefisso, comprese le annidate.
- **E poi l'ha preso di nuovo, sul commento che spiegava la correzione.**
  Quella prova legge il foglio di stile per intero, commenti compresi: un
  selettore *citato a parole* le risulta ancora presente. È la trappola già
  scritta tre volte (§10, §12, §18), qui nel CSS invece che nel JavaScript. Il
  commento adesso descrive il difetto senza scriverne il selettore.

### Cosa resta aperto

- **I conti veri non ci sono ancora**: la tabella nasce vuota, e finché
  qualcuno non crea il conto premi e quello dell'agenzia i riepiloghi sono a
  zero. È voluto — inventare due conti con dei saldi sarebbe la regola §8.1
  violata sul denaro — ma è la prima cosa da fare in schermata.
- **I movimenti sono la M3**: `CNT_MOVIMENTI` è una lista vuota in un posto
  solo, pronta a riempirsi.
- **Le coordinate in `iam_azienda.dati`** (`iban1`, `iban2`, `banca`) restano
  dove sono: spostarle su `iam_conti` è una migrazione di dati che vuole una
  persona che dica quale IBAN è di quale conto.

---

## 27. Il numero di versione, e la prova che impedisce di dimenticarlo (19/09/2026)

Nasce da una domanda di Francesco, fatta dopo la terza volta in due giorni che
«le modifiche non le vedo»:

> «Per capire se gli aggiornamenti sono pubblicati, non è il caso di pubblicare
> una versione di software? Tipo 0.1, quindi appena vedo 0.2 è tutto
> pubblicato?»

Sì. Con un avvertimento che viene dall'errore appena tolto: in fondo al menu del
nome c'era **`IAM · build 2026-06-15c`**, scritta a mano e **ferma da tre mesi**.
Una targhetta che nessuno aggiorna la si legge e ci si crede: è **peggio** di
nessuna targhetta.

| pezzo | dove |
|---|---|
| la fonte unica del numero | `versione.json` alla radice |
| l'annotazione nei due documenti | `<meta name="app-versione">` e `<meta name="app-versione-nome">` in `index.html` e `iam/index.html` |
| la targhetta | `versioneApp` / `mostraVersioneInUso` / `#um-versione` in `iam/index.html` |
| il guardiano | `iam/verifica/versione-app.test.mjs` — 5 |

### Le due domande sono diverse, e servono tutte e due

| domanda | risponde | può mentire? |
|---|---|---|
| «Quello che ho chiesto è pubblicato?» | il **numero** e il nome del rilascio | sì, se nessuno lo alza — per questo c'è la prova |
| «Sto guardando la pagina che il server ha adesso?» | la **data**, da `document.lastModified` | no: è del documento che il browser ha davvero caricato |

Il numero da solo non basta: se dice `0.2` ma la data è di ieri, stai guardando
una copia in cache che il numero non smaschererebbe. La data da sola non basta:
dice che la pagina è fresca, non che contiene quello che avevi chiesto. La
targhetta le mostra insieme, più la data del preventivatore, che è un documento
a sé con la sua cache (§12).

**Il numero si legge dal `<meta>` del documento in uso, mai con un `fetch`.**
Un `fetch` direbbe quello che il server servirebbe adesso, non quello che sta
girando — cioè esattamente il caso che questa targhetta esiste per smascherare.
C'è una prova che lo vieta.

### Perché il numero resta scritto a mano

Perché deve **significare qualcosa per una persona**. Un'impronta del contenuto
(come quella di `withus-one.js`, §12) è automatica e non mente, ma `baffe92` non
dice a nessuno se la prima nota c'è. `0.2 · Prima nota` sì.

Il prezzo è che si può dimenticare, e la disciplina non basta mai. Quindi la
disciplina non è scritta in una regola: è una prova che **confronta la data
dell'ultimo commit che ha toccato i due documenti con quella dell'ultimo commit
che ha toccato `versione.json`**, e diventa rossa se i documenti sono più
recenti. Su un clone superficiale quella storia non c'è: allora dice «saltata»
invece di diventare rossa *per la strada* invece che per il contenuto (§4).

### Come si alza

Ogni rilascio che tocca `index.html` o `iam/index.html`: si alza il numero di
mezzo (`0.1` → `0.2`) e si riscrive `nome` con quello che quel rilascio porta.
Una correzione piccola alza l'ultimo (`0.1.0` → `0.1.1`). I due `<meta>` vanno
allineati **tutti e due**: dimenticarne uno è il difetto più probabile, ed è
quello che la seconda prova prende.

**Si parte da `0.1.0` il 19/09/2026.** Non si finge una storia che non c'è:
questo numero non descrive quello che è stato fatto prima, comincia a contare
dal giorno in cui si è cominciato a contare. Quello che c'era prima sta in
questo file, paragrafo per paragrafo, con le date.

---

## 28. Brief IAM #02 — M2: le compagnie e le provvigioni (20/09/2026)

Due schermate, perché sono due domande diverse: **Gestione compagnie** dice
l'accordo con la COMPAGNIA (quanto riconosce, e quanto se ne gira di default),
**Provvigioni** dice l'accordo con la PERSONA, che varia da collaboratore a
collaboratore. Metterle insieme avrebbe fatto credere che cambiando la tariffa
si cambia quello che prende Tizio — e non è vero, perché Tizio può avere il suo.

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/provvigioni.js` |
| prove in Node | `server/verifica/provvigioni.test.mjs` — 12 |
| le quattro tabelle, le politiche, gli indici | `supabase/migrations/20260920_b02_m2_provvigioni.sql` (applicata) |
| le due schermate | `#panel-compagnie`, `#panel-provvigioni` e il blocco `prv*` in `iam/index.html` |
| le due voci di menu | `iam/withus-one.js` (`MEGA`, `TITOLI`, `TAB2MENU`) |
| prove sulle schermate | `iam/verifica/compagnie-provvigioni.test.mjs` — 10 |

### La misura che ha deciso tutto il resto

Presa sul portafoglio vero **prima** di scrivere una riga: su **13 rate** dello
stesso prodotto della stessa compagnia ci sono **12 aliquote distinte**. Una
percentuale configurata non è mai la verità su una rata: la verità è quello che
la compagnia ha dichiarato nel flusso.

Da qui la regola che comanda su tutte:

> **La provvigione dichiarata vince sempre. L'aliquota configurata PREVEDE, non
> decide.**

Dove la compagnia dichiara (Prima), il calcolo parte da quel numero e l'aliquota
serve solo a segnalare lo **scostamento** — che è l'unica cosa utile da fare con
una percentuale pattuita: accorgersi che non è stata rispettata. Dove non
dichiara (HDI: **38 rate su 38** senza provvigione), il numero si dice
**previsto** e si porta dietro l'etichetta fino al simulatore. Un numero
previsto e un numero dichiarato che si somigliano non si mescolano: `stimata` li
tiene separati, ed è la stessa regola dell'estratto conto (§17) — quello che non
si sa non entra nei totali.

### Modificare una percentuale non è un update

**È la cosa che, rompendosi, non si vede.** Gli estratti conto già mandati sono
documenti su cui si è litigato: devono continuare a dire lo stesso numero. Un
`update` sull'aliquota riscriverebbe il passato in silenzio, e ce ne si
accorgerebbe il giorno in cui un collaboratore contesta un foglio di sei mesi fa.

Quindi le quattro tabelle hanno `dal` e `al`, e modificare vuol dire **chiudere
la riga vigente** (`al` = ieri) e **aprirne una nuova** da oggi. Prima si chiude,
poi si apre: se cade in mezzo resta una riga chiusa e nessuna aperta — si vede
subito, invece di due righe vigenti che si contraddicono. Togliere qualcuno da
un gruppo è la stessa cosa: la produzione di ieri è stata fatta dentro quel
gruppo. **Nel pannello non c'è nemmeno una `.delete()`**, e c'è una prova che lo
misura.

### La base di calcolo è la provvigione, non il premio

Richiesta esplicita del brief, e vale la pena scriverla col numero: il 60% dei
**41,21 €** che la compagnia riconosce, non il 60% dei **390 €** pagati dal
cliente, che farebbe **234 €** — un numero credibile e sei volte più grande di
quello che l'agenzia incassa davvero. È la decisione 2 di §17, qui applicata
alla configurazione invece che al rendiconto.

Il margine dell'agenzia si ricava **per differenza** (§17): due arrotondamenti
separati fanno comparire il centesimo che nessuno sa spiegare.

### L'indiretto, e le due cose che non fa

`iam_gruppi` (capo, percentuale) + `iam_gruppi_membri` (con override per
persona). Due regole, ognuna col suo motivo:

- **Il capo non prende l'indiretto sulla propria produzione.** Altrimenti una
  rata sua pagherebbe due volte la stessa persona.
- **Una persona non può stare in due gruppi vivi**, e il divieto è un **indice
  unico parziale** (`where al is null`), non un controllo nella tendina: la
  schermata è una delle strade, non l'unica (c'è la console, c'è PostgREST).
  Con due gruppi, l'indiretto si pagherebbe due volte sulla stessa rata.

### Il simulatore è l'accettazione del brief

La terza linguetta prende una rata di prova e mostra **chi prende che cosa e
perché**: dichiarata o prevista, accordo suo o default della tariffa, quale capo
gruppo, e il margine per differenza. Non salva niente — serve a vedere una
configurazione **prima** che produca un estratto conto, che è l'unico momento in
cui correggerla costa poco.

### La copertura: le tariffe si scrivono guardando il portafoglio

La schermata delle compagnie legge `quote_polizze` e dice **quali compagnie e
rami del portafoglio non hanno ancora una tariffa**, con quante polizze ci sono
sotto. Senza, si configura a memoria e si scopre il buco quando un estratto
conto esce vuoto. È l'unica delle sette letture che può cadere senza rendere la
schermata inutile: se cade si tace su quella sezione, non si perde tutto.

### Un difetto che ha trovato la prova del motore, e non era piccolo

`calcola` non risolveva gli **alias** delle compagnie: sulla polizza è scritto
«HDI Assicurazioni», nella tariffa «HDI», e quella tariffa non si trovava mai.
Nessun errore, nessuna schermata rotta — solo una provvigione che non si calcola
mai, e un «da confermare» che sembra una configurazione mancante. È la stessa
trappola degli alias documentali (§11), e la correzione sta **dentro il motore**
perché chi chiama non se ne possa dimenticare.

### Cosa resta aperto

- **Le tariffe non ci sono ancora**: la tabella nasce vuota, e niente seed —
  inventare un'aliquota è la regola §8.1 violata sul denaro. La copertura dice
  da dove cominciare.
- **L'estratto conto (§17) legge ancora `iam_team.provv`**, che è una
  percentuale per prodotto senza date. Le due strade convivono finché la M6 non
  sposta l'estratto conto su questo motore: sono due letture della stessa cosa,
  e finché sono due vanno confrontate, non fuse a occhio.
- **Lo scostamento si mostra e non si registra**: sapere che una compagnia ha
  riconosciuto meno del pattuito è una contestazione da fare, e dove si scrive
  è una decisione che non è stata presa.

---

## 29. Brief IAM #02 — M3: la prima nota e la quadratura dei conti (20/09/2026)

La M1 aveva lasciato una frase scritta in faccia nella schermata dei conti:
«nessun movimento ancora: è il saldo iniziale dichiarato». Questo lavoro è la
riga che la fa smettere di essere vera.

| pezzo | dove |
|---|---|
| le regole (sono nello stesso motore della M1) | `tariffe/motore/contabilita.js` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **21** (erano 11) |
| le due tabelle, i trigger, le politiche | `supabase/migrations/20260920_b02_m3_prima_nota.sql` (applicata) |
| le due linguette | `#contab-panel-primanota`, `#contab-panel-conti` e il blocco `pnt*` in `iam/index.html` |
| prove sul pannello | `iam/verifica/prima-nota.test.mjs` — 10 |

### Misurato prima di scrivere

`iam_movimenti` **non esisteva**. Quello che c'era è `sessioni_giornaliere`:
**68 righe dal 25/05 al 16/09/2026**, cioè il foglio di cassa del giorno
(contanti, versamenti, spese, fondo cassa, POS). Non è una prima nota e non
poteva diventarlo: non sa su quale conto sia finito il denaro, non ha una
causale, e un giorno è **una riga sola**. Resta dov'è — riorganizzarla è la M5 —
e questo lavoro non la tocca.

### Le tre regole nuove del motore, e che cosa impediscono

5. **Un movimento non si cancella: si annulla, col motivo.** Una riga
   cancellata lascia un buco che nessuno sa più spiegare, e in un registro di
   denaro «non c'è» e «è stato tolto» sono due cose diverse. La riga resta,
   esce da **ogni** totale e si legge nello storico. L'esclusione sta in **una
   funzione sola** (`vivi`), perché i posti che sommano sono cinque e cinque
   controlli scritti a mano sono cinque occasioni di dimenticarne uno — che è
   il modo in cui un saldo comincia a non tornare senza che si capisca perché.
   Il divieto vero è un **trigger**: la schermata è una delle strade, non
   l'unica.
6. **L'importo è sempre positivo: il verso lo dice la causale.** Un «−50» su
   «Incasso premi» è un'uscita travestita da entrata, e dentro un totale non
   si vede più. La finestra non ha un campo «entrata/uscita» ed è voluto; il
   `check (importo > 0)` è nel database.
7. **«Quadra» e «non è mai stata fatta la quadratura» sono due cose diverse.**
   `quadra` ha **tre** valori, non due: `true`, `false` e **`null`**. Un conto
   mai verificato che si mostra in verde è la bugia più comoda che un sistema
   di contabilità possa raccontare.

### La quadratura, e la data che conta

Due numeri: il **ricostruito** (saldo iniziale + movimenti vivi) lo sa il
sistema, il **dichiarato** lo sa la banca o chi ha contato la cassa
(`iam_quadrature`, uno per conto e per giorno).

**Il confronto si fa alla data della dichiarazione, non a oggi.** Un estratto
conto del 31/08 non sa niente dei movimenti di settembre: confrontarlo col
saldo di oggi produrrebbe una differenza inventata, e qualcuno andrebbe a
cercare in banca un errore che non c'è. Il saldo di oggi resta comunque
leggibile accanto, perché serve a un'altra domanda — quanti soldi ci sono.

La **tolleranza è un centesimo**, non «qualche euro»: serve agli
arrotondamenti, non a far passare una differenza vera. E la differenza dice da
che parte sta: *il sistema ha X in più della banca* (un movimento registrato
due volte, o uno mai uscito) è un lavoro diverso da *la banca ha X in più del
sistema* (un movimento mai registrato).

### Quello che non c'è ancora, ed è voluto

Il movimento che nasce da solo quando si incassa una rata. `titolo_id` e
`origine` ci sono già, con l'**indice unico** che impedisce di scriverlo due
volte, ma a riempirli è la **M4**: è lì che si decide quale conto riceve un
POS, un bonifico o dei contanti. Finché quella decisione non c'è, un movimento
automatico sceglierebbe un conto a caso. La finestra però lo sa già: un
movimento con `origine` diversa da `manuale` ha i campi bloccati e dice *«si
corregge dove è nato, non qui»* — altrimenti la rata e la prima nota direbbero
due cose diverse e nessuna delle due saprebbe di essere quella sbagliata.

### La trappola dei commenti, presa per la sesta volta

Il commento che spiegava la regola 5 **nominava la chiamata che stava
vietando**, e la prova che cerca quella stringa nel sorgente è diventata rossa
su un codice corretto. È §10, §12, §18 e §26, di nuovo. Due correzioni, non
una: il commento non scrive più quella parola, **e** la prova adesso guarda
solo le righe di codice, togliendo i commenti che cominciano a inizio riga —
mai con una regex globale, che su `index.html` si mangia 450.000 caratteri
(§12).

### Cosa resta aperto

- **La prima nota nasce vuota**, e deve: inventare dei movimenti per far vedere
  una schermata piena vorrebbe dire scrivere nella contabilità dell'agenzia dei
  fatti che non sono successi (§8.1).
- **I due saldi iniziali dei conti sono a zero** (misurato): finché non si
  scrivono quelli veri, il ricostruito parte da un numero che non è quello.
- **La linguetta «Quadratura» (di giornata) e «Quadratura conti» convivono**:
  la prima è il foglio di cassa, la seconda i conti. Si fondono nella M5, non
  prima — e il nome doppio è dichiarato, non un refuso.

---

## 30. Le novità del rilascio, cliccando il numero (20/09/2026)

> «Magari mettiamo una parte release, dove cliccando dice le ultime modifiche
> effettuate» — Francesco.

La targhetta di §27 dice **un numero**; `versione.json` adesso porta anche
`storia`, cioè **che cosa c'è dentro**, rilascio per rilascio. Si clicca il
numero in fondo al menu del nome e si legge.

| pezzo | dove |
|---|---|
| l'elenco | `storia` in `versione.json` |
| la finestra | `apriNovita` / `#nov-ov` in `iam/index.html` |
| prove | `iam/verifica/versione-app.test.mjs` — **7** (erano 5) |

**Questa finestra legge col `fetch`, la targhetta legge il `<meta>`, ed è
voluto che siano due strade diverse.** La targhetta deve descrivere **la copia
in uso**, quindi non può chiedere niente al server (§27). Questa invece chiede
`versione.json`, cioè quello che il server ha **adesso** — e proprio perché i
due numeri arrivano da due strade diverse, confrontarli dice la cosa più utile
di tutte: **«la pagina che stai guardando è vecchia, ricarica»**. È il problema
che è costato tre giorni a settembre (§12), trasformato in un avviso.

**L'indirizzo passa da `/nuovo-preventivo/versione.json`, e non è un refuso.**
IAM è servito dalla cartella `iam/`, `versione.json` sta alla radice del
repository, e la radice sulla stessa origine è `/nuovo-preventivo/`
(`deploy/caddy/iam.caddy`). Un `/versione.json` risponderebbe 404 e l'elenco
non si aprirebbe mai.

**Come si scrive una voce.** Che cosa cambia per chi lavora, non che cosa è
cambiato nel codice: *«Contabilità › Prima nota: si registra ogni movimento»*,
non *«aggiunta tabella iam_movimenti»*. Una prova pretende che ogni voce sia
più lunga di venticinque caratteri — non è un controllo di qualità, è un
controllo contro la riga buttata lì.

**E la stessa disciplina della targhetta**: se la prima voce di `storia` non è
la versione corrente, la prova diventa rossa. Mostrare le novità del rilascio
prima è il modo più educato di mentire.

---

## 31. La grafica di IAM, su tutte le schermate (20/09/2026)

> «Tutte le schermate di IAM devono avere la grafica di IAM» — Francesco.

Aveva ragione, e la causa non era una scelta estetica sbagliata: era **il kit
chiuso a chiave dentro una schermata sola**.

### Misurato prima di toccare qualcosa

| | |
|---|---|
| regole del kit scritte `#panel-dashboard .qualcosa` | **26** |
| gettoni (`--w1-*`) dichiarati dentro quel pannello | **15** |
| usi di quei nomi **fuori** dalla Scrivania | **0** |
| famiglie di classi che fanno lo stesso lavoro | `f-*` (fonti), `cl-*` (collegamenti), `slbl`/`card` (storiche), `cnt-*` (brief #02) |
| `style="…"` scritti a mano dentro un pannello solo | **1.798** (Analisi), 222 (Performance) |

Il kit c'era, ed era anche buono: testata con occhiello, titolo e sottotitolo,
bottone bianco e bottone verde, schede con intestazione e pittogramma. Solo che
la Scrivania se lo teneva. **Ogni schermata scritta dopo ha dovuto
reinventarselo, e ognuna se l'è inventato diverso.**

E il risultato non era «una grafica diversa»: era **nessuna grafica**. Un `<h1>`
che nessuna regola tocca esce col carattere di sistema, grande il doppio e nero;
un `<button>` senza regole è il bottone grigio del browser. Le schermate del
brief #02 si aprivano così, e si vedeva a occhio nudo — è il **guasto §1 in
versione grafica**: una cosa buona esiste e nessun altro la può raggiungere.

### Che cosa si è fatto

| pezzo | dove |
|---|---|
| il kit, adesso valido su tutta IAM | blocco «IL KIT GRAFICO DI IAM» nel `<style>` di `iam/index.html` |
| le cinque schermate portate sopra | `#panel-conti`, `#panel-compagnie`, `#panel-provvigioni`, `#contab-panel-primanota`, `#contab-panel-conti` |
| il guardiano | `iam/verifica/kit-schermate.test.mjs` — 7 |

Una schermata nuova adesso si scrive così, e basta:

```html
<section class="page-head">
  <div><div class="eyebrow">Sezione</div><h1>Titolo</h1>
       <div class="subtitle">A che serve.</div></div>
  <div class="head-actions">
    <button class="d-btn">Secondaria</button>
    <button class="d-btn primario">Azione principale</button>
  </div>
</section>
<div class="d-card">
  <div class="card-head"><div class="card-title">
    <span class="pictogram"><i class="ti ti-x"></i></span> Titolo</div></div>
  <div class="card-body">…</div>
</div>
```

Le tre cose che il kit non aveva restano accanto col prefisso `cnt-`: la tessera
di riepilogo, la riga di elenco e la pastiglia di stato. Sono le uniche, e usano
i gettoni — non `#fff` scritto a mano.

### La prova della Scrivania aveva ragione, e ha corretto il lavoro

Promuovere le regole non bastava: senza i gettoni, `var(--w1-raggio)` non
risolve, la proprietà **viene ignorata in silenzio** e una scheda perde gli
angoli senza che nessun errore lo dica. Quindi sono stati promossi anche i
gettoni — su `:root`.

E lì `scrivania.test.mjs` è diventata rossa, con una frase scritta mesi fa:
*«è una superficie chiara fissa: lasciata libera sfonderebbe il tema scuro in
tutto il resto del gestionale»*. Era giusto: IAM ha un tema scuro, e una
tavolozza chiara su `:root` lo avrebbe sfondato ovunque.

La correzione non è stata aggiornare quella prova per farla tacere: i gettoni
stanno sull'**elenco dichiarato** delle schermate portate sul kit. L'elenco
cresce quando una schermata ci passa, e chi lo allunga sa che sta portando lì
anche la tavolozza. *Una prova che si oppone a un lavoro va letta prima di
essere aggiornata: a volte sa una cosa che chi scrive non sa.*

Lo **sfondo** per la stessa ragione non è su `:root`: la schermata di accesso e
la splash sono dichiarate intoccabili (`iam/CLAUDE.md`, «BLOCCHI»), e metterlo
lì le avrebbe ridipinte senza che nessuno l'avesse chiesto. Verificato con le
fotografie: accesso e Scrivania identici prima e dopo, al pixel.

### La trappola dei commenti, settima volta — e l'ha presa la prova nuova

Il commento che spiega la promozione **conteneva il selettore che la prova
cerca**, e la prova ha dichiarato rotto un codice giusto. È §10, §12, §18, §26 e
§29. Stavolta però è stata la prova stessa a prenderla nello stesso minuto in
cui è nata: il filtro toglie i commenti a inizio riga, ma un commento su più
righe le cui righe interne cominciano con altro passa lo stesso. **Il rimedio
definitivo non è un filtro più furbo: è non scrivere la parola vietata dentro il
file che la vieta.**

### Cosa resta aperto

- **Le altre schermate non sono ancora sul kit**: Fonti, Stato collegamenti,
  Analisi (1.798 stili a mano), Performance, Operativa, Utenti, Diario. Ognuna è
  un lavoro a sé, e l'elenco `SUL_KIT` nella prova dice a che punto siamo —
  cresce, non cala.
- **La soglia degli stili scritti a mano** per le cinque schermate portate è nel
  guardiano: cala quando se ne tolgono, non sale mai.
- **Il tema scuro sulle schermate del kit non c'è**: prendono la tavolozza
  chiara della Scrivania. Farle rispondere al tema è un lavoro vero — vuol dire
  dare ai gettoni due valori — e va fatto per tutte insieme, non una alla volta.

---

## 32. Brief IAM #02 — M4: gli incassi da accreditare (20/09/2026)

Il pezzo che mancava fra l'incasso di una rata (§17, §24) e la prima nota
(§29): fino a oggi una rata incassata restava dentro il portafoglio e **il
conto dell'agenzia non lo sapeva**.

| pezzo | dove |
|---|---|
| le regole (stesso motore della M1 e della M3) | `tariffe/motore/contabilita.js` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **27** (erano 21) |
| la tabella, i trigger, la colonna `mezzi` sui conti | `supabase/migrations/20260920_b02_m4_sospesi.sql` (applicata) |
| la linguetta | `#contab-panel-incassi` e il blocco `inc*` in `iam/index.html` |
| prove sul pannello | `iam/verifica/incassi-accreditare.test.mjs` — 10 |

### Misurato prima di scrivere

| | |
|---|---|
| rate incassate | **15** — 4 carta di credito, 2 bonifico, **9 senza mezzo** |
| rate aperte | 40, nessuna col mezzo |
| incassi in contanti | **zero** |
| conti | 2 (aziendale e plurimandatario), **nessuna cassa contanti** |

Due conseguenze, e nessuna si aggira indovinando: senza una cassa contanti un
incasso in contanti non ha dove andare, e **nove rate su quindici** non dicono
come sono state pagate — quindi di quei soldi non si può sapere se sono in
cassa o in arrivo.

### La regola che regge tutto: un incasso non è un accredito

**Contanti** sono denaro in mano: entrano in cassa, e il conto si muove lo
stesso giorno. **POS, bonifico, assegno, carte** no: il cliente ha pagato, e
l'accredito arriva dopo. In mezzo c'è un tempo in cui l'incasso è avvenuto e il
conto non si è mosso — ed è lì che vive questa tabella.

Trattarli uguale farebbe dire al saldo di avere dei soldi che arriveranno fra
tre giorni: **un numero credibile e falso**, e la quadratura (§29) troverebbe la
differenza senza saper dire da dove viene.

### Le altre tre decisioni

**Il sospeso punta alla rata, non la ricopia.** `titolo_id` con un indice unico
sulle righe vive: importo e mezzo restano una cosa sola con la rata. Ricopiarli
avrebbe creato il secondo archivio degli incassi, che è esattamente quello che
il foglio cassa ha evitato (§25).

**Dove finiscono i soldi lo dice il CONTO, non il codice.** `iam_conti.mezzi`
elenca i mezzi che arrivano su quel conto. Se nessuno lo dichiara, o se due lo
dichiarano, il sistema scrive «non si sa» e manda a configurarlo: scegliere il
primo conto che passa vorrebbe dire sbagliare metà delle volte e indovinare
l'altra metà. Il giorno in cui l'agenzia cambia banca per il POS si cambia una
riga in una schermata, non una riga di programma.

**L'accredito scrive prima il movimento, poi chiude l'incasso.** Se cade in
mezzo resta un movimento senza il suo incasso chiuso — si vede, e si rifà.
Nell'ordine opposto resterebbe un incasso «arrivato» che sul conto non c'è.
E un accredito registrato due volte è denaro che nel sistema c'è e in banca no:
lo impedisce un indice unico, non un controllo nel codice.

### Perché non si chiama «Sospesi», che è la parola del brief

In agenzia **«sospeso» è già il premio che il cliente NON ha pagato** — ed è la
linguetta qui accanto, che legge il file della compagnia. Questo è l'opposto: il
cliente ha pagato, e il denaro non è ancora sul conto. Due cose diverse con lo
stesso nome sono due elenchi che non si incrociano (§18, «storico»): due nomi
diversi, e la scelta è scritta accanto al pannello.

### Una regola di casa applicata al banco

Le variabili di stato del blocco sono **`var` e non `let`**, come dice §17: con
`let` la variabile del modulo e `window.INC_SOSPESI` sono due cose diverse, e
una prova che inietta dei dati finti scriverebbe in una mentre il codice legge
l'altra — restando verde senza aver misurato niente. Se n'è accorta la
fotografia: la prima schermata con i dati finti è uscita vuota.

### Cosa resta aperto

- **La configurazione è la prima cosa da fare**: nessuno dei due conti dichiara
  ancora quali mezzi riceve, e finché è così ogni incasso legge «non si sa».
  Serve anche una **cassa contanti**, che fra i conti non c'è.
- **Le 15 rate già incassate non sono state portate dentro in automatico**: 9
  non dicono il mezzo e per le altre 6 nessuno ha detto su quale conto sono
  arrivate. Si portano a mano dalla schermata, che le elenca e chiede.
- **L'incasso non nasce ancora da solo**: la rata si incassa nella pagina Titoli
  di QUOTO e poi si porta in contabilità da qui, con un clic. Farlo scattare
  all'incasso è un pezzo piccolo, e va deciso dove: il bottone sta in due
  documenti diversi.

---

## 33. Brief IAM #02 — M5: la contabilità si ricostruisce da sé (20/09/2026)

Il brief chiede di riorganizzare Contabilità: riepilogo della giornata
automatico, semafori, fondo cassa calcolato, via «Carica documenti», storico
per giornata, conto ricostruito, anomalie. Sette voci, una riga di codice
soltanto nel database — perché le tabelle c'erano già (M3, M4): quello che
mancava era **leggerle**.

| pezzo | dove |
|---|---|
| le regole (stesso motore di M1, M3 e M4) | `tariffe/motore/contabilita.js` — `giornata`, `fondoCassa`, `semaforoGiornata`, `anomalie` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **34** (erano 27) |
| le quattro schermate | blocco `gio*` in `iam/index.html`, contenitori `#gio-oggi`, `#gio-anomalie`, `#gio-storico`, `#gio-conto` |
| prove sul pannello | `iam/verifica/contabilita-ricostruita.test.mjs` — 10 |

### Misurato prima di scrivere

La Quadratura di giornata è **tutta digitata a mano**: `i-cassa`, `i-vers`,
`i-spese`, `i-fondo`, `i-pos-bianco`, `i-pos-nero`, salvati in
`sessioni_giornaliere` — **68 giorni dal 25/05 al 16/09/2026**. Le Anomalie
leggevano soltanto `APP.sospesi`, cioè il file Excel caricato a mano. Il
fondo cassa era un campo da riempire.

### La decisione più importante è quello che NON si è fatto

**Il modulo a mano non si spegne.** Quei 68 giorni sono l'unica contabilità
che questa agenzia ha, e il ricostruito oggi è **vuoto**, perché i movimenti
cominciano adesso. Una schermata in uso si spegne quando i suoi numeri sono
stati confrontati con quelli nuovi e tornano — non perché ne è nata una
migliore. È la stessa regola della linguetta «Rimesse da preventivo» (§17), e
c'è una prova che sorveglia che il modulo resti dov'è, **sotto** il
ricostruito: quello che nessuno deve digitare viene prima.

### Il semaforo ha tre luci, e la terza è quella che conta

`verde` coincidono, `rosso` non coincidono (con la differenza e il suo verso),
**`grigio` non si può dire** — o non c'è nessun movimento quel giorno, o
nessuno ha dichiarato niente. Il grigio non è un verde prudente: mostrare
verde quando non c'è niente da confrontare è la stessa bugia del conto mai
verificato (§29) e del contatore documentale che mostrava `0` su un archivio
mai letto (§12). **Controprova**: il grigio trasformato in verde fa diventare
rossa la prova del motore.

### Il fondo cassa non si scrive: sono le casse

`fondoCassa` somma i conti di **tipologia `cassa`**, non tutto quello che ha
un saldo. Un conto corrente non è fondo cassa, e sommarlo darebbe un numero
che nessuno può contare aprendo il cassetto.

### Le anomalie hanno il verbo

Sei famiglie, ognuna con che cosa fare: incassi fermi da più giorni di quelli
che quel mezzo ci mette (M4); rate incassate che in contabilità non sono mai
entrate; conti che non dicono che mezzi ricevono; nessuna cassa contanti;
movimenti la cui causale non esiste più (rossi: senza verso restano **fuori
dai saldi**); conti mai verificati e conti che non quadrano, letti dalla
**stessa** `quadrature` della M3 — riscriverla qui vorrebbe dire averne due, e
quella che sbaglia sarebbe quella che nessuno guarda. Un elenco di problemi
senza il verbo è un elenco che nessuno guarda due volte.

E quando la lettura non riesce, i quattro riquadri **non dicono «tutto a
posto»**: dicono che non si è potuto controllare. Su una schermata di anomalie
è la bugia peggiore possibile.

### «Carica documenti» si toglie, i due caricamenti no

Il brief dice di togliere la linguetta. Cancellare i due file avrebbe spento
**quattro** schermate: sono l'unica strada da cui arrivano i sospesi della
compagnia, gli incassi, le anomalie e il contatore della Scrivania. Quindi si
sono spostati **dentro Sospesi**, che è la schermata che li usa; il vecchio
nome rimasto in `iam_last_tab` porta lì, non su un riquadro vuoto (§6b).

`contabilita-una-schermata.test.mjs` pretendeva due linguette separate: era
giusta il 01/08/2026 e misura il mondo di ieri. Si è aggiornata la **regola**
(§15, §16), non il numero — quello che Francesco aveva chiesto non era «due
linguette», era «non farmi trovare la cassa quando cerco i file», e vale
identico adesso.

### La trappola dei commenti, ottava volta — e il filtro non basta

Il commento che spiega perché le quattro linguette fanno partire una lettura
sola **nominava la funzione** che la prova cerca, e la prova ha dichiarato
rotto un codice giusto (§10, §12, §18, §26, §29, §31). Stavolta il filtro dei
commenti a inizio riga **non l'ha presa**: era una riga *interna* di un
commento su più righe, che comincia con del testo. Due correzioni, come
sempre: la prova cerca la **chiamata con le parentesi**, e il commento non
scrive quel nome.

### Cosa resta aperto

- **I riquadri ricostruiti sono vuoti finché non ci sono movimenti**, ed è
  giusto: la prima nota nasce vuota (§29) e i saldi iniziali dei due conti
  sono a zero. Il semaforo dice grigio, che è la risposta vera.
- **Le due quadrature convivono**, dichiarate: quella di giornata (il foglio
  di cassa) e quella dei conti (M3). Si fondono quando i numeri del
  dichiarato e del ricostruito saranno stati confrontati, non prima.
- **Le anomalie dei file caricati restano sotto**, separate da quelle della
  contabilità: sono due archivi diversi e mescolarli renderebbe impossibile
  dire da dove viene un problema.

---

## 34. Brief IAM #02 — M6: l'estratto conto che esce di casa (20/09/2026)

La schermata c'era già (QUOTO, `#page-estratto`, §17 e §24): due linguette,
«Da versare» e «Provvigioni», l'Excel e l'email. **Rifarla in IAM sarebbe stata
la malattia di Utenti e Performance** (§10): la stessa schermata scritta due
volte, e due numeri che un giorno direbbero cose diverse sulla stessa persona.
Quello che mancava non era la schermata: era tutto ciò che succede quando quel
foglio **esce**.

| pezzo | dove |
|---|---|
| i testi, in due modelli, e i casi | `tariffe/motore/estratto-conto.js` — `testiInvio`, `casoInvio` |
| le coordinate delle rimesse | `tariffe/motore/contabilita.js` — `coordinateRimesse` |
| le due tabelle/colonne e il registro | `supabase/migrations/20260920_b02_m6_estratto_conto.sql` (applicata) |
| l'anteprima, l'invio e il registro | blocco `ecp*` in `index.html` (`ecpInvia`, `ecpInvRender`, `ecpInvManda`, `ecpRegistra`) |
| IBAN, BIC, intestatario e la spunta | `cntFormConto` / `cntSalvaConto` in `iam/index.html` |
| prove | `estratto-conto.test.mjs` (19), `contabilita.test.mjs` (**36**), `conti-causali.test.mjs` (12), `ui-test.mjs` (**449**) |

### Misurato prima di scrivere — e una misura ha cambiato il lavoro

Sul database: **55 rate, 0 assegnate** a un collaboratore; **12 schede
economiche, 0 con l'IBAN**. Oggi l'estratto conto di ognuno è vuoto, e questo
lavoro non lo riempie — lo riempiono le decisioni dei codici produttore (§19).

Sul server, leggendo l'ambiente del backend: le caselle configurate sono
`amministrazione@`, **`contabilita@`** e `intermediari@`. La casella della
contabilità **esisteva già**, e nessuno la sceglieva: `/mail/send` senza
`casella` prende la **prima** dell'elenco. Gli estratti conto uscivano da
`amministrazione@`, e le risposte finivano in una casella che quei conti non li
tiene. Non si ripiega su un'altra: meglio non mandarlo che mandarlo da dove il
collaboratore non verrà letto — la schermata dice che serve l'accesso, e
propone l'Excel a mano.

### Il testo esce dalla pagina e va nel motore

Era scritto a mano dentro `index.html`. Sta nel motore per la stessa ragione dei
testi previdenziali (§5): **l'unica cosa che esce di casa è l'unica che va
provata**. Il **caso lo decide il risultato** (`casoInvio`), non chi scrive: un
sollecito senza sospesi e un provvigionale vuoto non partono, e lo dicono.

**I due modelli non sono «lungo» e «corto»**: `a` è disteso, `b` è asciutto. E
la regola che li rende sicuri: **quello che NON cambia fra i due è l'avviso
delle righe fuori dal totale**. È esattamente la parte che un testo breve
sarebbe tentato di togliere, e toglierla vorrebbe dire mandare «a te spettano
72,30» facendo credere che siano tutte. C'è una prova che gira i due modelli e
pretende la stessa parte scomoda.

Nessun testo promette una **data di pagamento**: non l'ha decisa nessuno, e una
promessa in un testo automatico è una promessa che l'agenzia non sa di aver
fatto.

### Le coordinate le dice il conto — e il controllo dell'IBAN è uno solo

Un IBAN scritto dentro un programma resta quello vecchio il giorno in cui
l'agenzia cambia banca. Adesso è una **spunta sul conto** (`iam_conti.rimesse`,
uno solo, con un **indice unico parziale**), e finché nessuno la mette il
documento dichiara che le coordinate arriveranno a parte — mai un IBAN
indovinato (§8.1).

**Qui ho sbagliato e l'ha corretto la misura, non il ragionamento.** Avevo
scritto `coordinate()` e il controllo dell'IBAN dentro `estratto-conto.js` —
salvo che `contabilita.js` **ce l'aveva già**, e migliore (con la tabella delle
lunghezze per paese). Due controlli dello stesso IBAN sono due regole, e quella
che sbaglia è quella che nessuno guarda: la funzione è andata nel motore che
possiede i conti, e il documento riceve il **risultato**. QUOTO adesso carica
anche `contabilita.js`. Una prova legge il sorgente dell'altro motore e diventa
rossa se il controllo ricompare in due posti.

### Il registro dei documenti usciti

«Io l'estratto conto non l'ho ricevuto» arriva mesi dopo, e `quote_log` diceva
solo «mandato». `iam_invii_estratto` tiene destinatario, casella, periodo,
**i totali di quel giorno** e l'esito.

**I totali si copiano, e non è un doppione**: le rate cambiano (una viene
incassata, una si riassegna) e rileggere l'estratto conto di agosto oggi
darebbe numeri diversi da quelli che quella persona ha ricevuto.

**E si registra anche l'errore**, col motivo obbligatorio: «non gliel'ho
mandato» e «gliel'ho mandato e non è arrivato» sono due lavori diversi (§18).
Il registro non si corregge e non si cancella (trigger), e dice chi ha mandato,
quindi la firma è vera (`with check (creato_da = auth.uid())`).

### Tre trappole, e una era la peggiore delle due

1. **`const` non finisce su `window`.** `EC_CASELLA` era `const`: la prova che
   controlla da quale casella parte l'estratto conto leggeva `undefined` e
   sarebbe restata verde con la casella sbagliata. È la trappola di §17 vista
   dall'altro lato — lì si inietta, qui si legge.
2. **La controprova ha trovato un difetto peggiore di quello che cercava.**
   Tolto `casella` dalla chiamata che manda, la prova restava **verde**: cercava
   la stringa nel blocco intero, e la stessa costante compare anche nella riga
   di registro. Cioè la prova avrebbe accettato un'email partita dalla casella
   sbagliata **e** un registro che dichiarava quella giusta — un registro che
   mente è peggio di un registro che manca. Adesso si guarda dentro la
   chiamata.
3. **Un nome di file non si scrive in un foglio di stile.** Il commento del
   blocco CSS nominava `fusione-collisioni.test.mjs`, e il guardiano ha contato
   due classi in comune che non esistono (`test`, `mjs`): in un CSS un nome con
   dei punti è una catena di selettori. È la trappola dei commenti (§10, §12,
   §18, §26, §29, §31, §33) nella sua **nona** occorrenza. Nello stesso giro ha
   preso anche una classe `attiva` senza prefisso, che era una collisione vera.

### Cosa resta aperto

- **Il conto delle rimesse non è ancora scelto** e nessun conto ha l'IBAN: la
  prima cosa da fare in schermata, altrimenti i fogli «da versare» escono senza
  coordinate (e lo dicono).
- **L'estratto conto legge ancora `iam_team.provv`** e non le tariffe della M2:
  sono due letture della stessa cosa, e finché sono due vanno confrontate, non
  fuse a occhio (§28).
- **Gli allegati restano un Excel** (una tabella HTML che Excel apre): il PDF
  con la carta intestata esiste già per il foglio cassa (§25) e si potrà usare
  anche qui.

---

## 35. Il guasto che ha spento una schermata intera (20/09/2026)

> «La pagina mostra "Non riesco a leggere le tariffe e gli accordi" e non
> consente di inserire nulla» — Francesco, brief «Compagnie e catalogo
> prodotti», Parte A.

Aveva ragione, ed era **mio**, scritto il giorno prima nella M2 (§28).

### La causa, in una riga

```js
db.from('quote_collaboratori').select('id,nominativo,stato').order('nominativo')
```

`quote_collaboratori` ha **`nome` e `cognome`**. `nominativo` esiste su
`quote_anagrafiche` e su `quote_sinistro_controparti`: la query era stata
copiata da lì. PostgREST risponde **400** su una colonna che non c'è.

### Il moltiplicatore, ed è la parte da ricordare

Le sette letture stavano in una `Promise.all` con un `for … if (r.error) throw`.
**Una query sbagliata su sette ha spento la schermata intera**, comprese le sei
che avevano funzionato: tariffe, accordi, gruppi, catalogo compagnie e
portafoglio erano tutti leggibili, e nessuno li ha visti. Chi apriva Gestione
compagnie non poteva creare nemmeno una compagnia.

La cosa peggiore è che il messaggio era **giusto e inutile allo stesso tempo**:
«non riesco a leggere le tariffe e gli accordi» è vero (non le aveva mostrate)
ma indica il posto sbagliato — le tariffe si leggevano benissimo.

> **Sette letture in una `Promise.all` che rilancia sono una schermata che si
> spegne sette volte più spesso di quanto dovrebbe.** Ogni lettura sta in piedi
> da sola: quello che c'è si mostra, e quello che manca si dichiara **col suo
> nome**. `leggi(nome, query, vuoto)` raccoglie i guasti invece di rilanciarli,
> e `prvGuasti` li elenca in cima, sopra i dati che invece ci sono.

È §12 e §18 («non si è potuto leggere» ≠ «non ce n'è») applicati **per sezione**
invece che per pagina: la distinzione c'era, ma era vera per la pagina intera,
e una pagina intera dichiarata inservibile per una colonna sbagliata è una
bugia grande quanto quella che voleva evitare.

### Il nominativo si compone in un posto solo

`prvNominativo(p)` = `cognome + nome`, con l'email come ultima risorsa. Tre
tendine lo scrivevano ognuna per conto suo (`p.nominativo || '—'`): tre modi di
scrivere la stessa persona, e nessuno se ne accorge finché due tendine non si
guardano insieme.

### Due prove e due controprove

`compagnie-provvigioni.test.mjs` (11): una cerca la **chiamata** che chiede
`nominativo` a quella tabella e diventa rossa se torna; l'altra conta le letture
isolate e vieta il ritorno della `Promise.all` che cade tutta insieme.
Rimettendo dentro il difetto, ognuna diventa rossa da sola.

**Una prova che misurava il mondo di ieri, aggiornata nella regola e non nel
numero** (§15, §16, §33): pretendeva che l'avviso di errore arrivasse in *tutti
e tre* i contenitori, «perché le sette letture partono insieme e cadono
insieme». Era la descrizione esatta del difetto, scritta come se fosse una
garanzia.

---

## 36. Brief IAM — Blocco 1, punto 1: il premio delle frazionate (20/09/2026)

> «In Portafoglio polizze la colonna PREMIO mostra `—` su tutte le polizze con
> frazionamento semestrale.» — Francesco, con cinque polizze e i loro numeri.

**Non era il frontend, e non era nemmeno un difetto: era una decisione che si
vedeva.** Misurato sul database prima di toccare qualcosa:

| polizza | frazionamento | `premio_annuo` | `premio_rata` | titoli | somma |
|---|---|---|---|---|---|
| BLP949872165 | Semestrale | **null** | 200,02 | 2 | **400,04** |
| BLP223382783 | Semestrale | **null** | 110,00 | 2 | **220,00** |
| BLP882392123 | Semestrale | **null** | 110,00 | **0** | — |
| PCP12315940 | Annuale | 58,00 | 58,00 | 1 | 58,00 |

Il lettore del flusso lascia `premio_annuo` vuoto sulle frazionate **apposta**
(§14, regola 2): nel tracciato `LORDO_TOTALE` è il premio **di rata**, e
moltiplicarlo sarebbe una stima.

### Il numero vero c'era, e non è una stima

**La somma delle rate che la compagnia ha emesso**, quando coprono l'annualità.
Su BLP223382783 sono due righe da 110,00 con decorrenze 16/09/2026 e 16/03/2027
che arrivano esattamente al 16/09/2027: **220,00 l'ha scritto la compagnia**.

`Flusso.premioAnnuo(polizza, titoli)` con tre condizioni, nessuna decorativa:

1. **solo le rate mandate dalla compagnia** — quelle dedotte da noi (§16,
   `:RATA:`) sono un nostro ragionamento: farle entrare vorrebbe dire che metà
   di quel numero l'abbiamo inventato, e nessuno saprebbe quale metà;
2. **devono ricoprire l'annualità senza buchi** — la prima parte dall'effetto,
   l'ultima arriva a scadenza, e la somma delle durate copre il periodo. Con un
   buco in mezzo la somma non è il premio dell'anno: è la somma di quello che è
   arrivato;
3. **ognuna deve avere un importo** — una rata senza importo non si salta:
   rende il totale non calcolabile, e lo si dice.

Quando non si può, torna il **motivo**, e la schermata lo stampa al posto del
trattino. Un `—` non dice a nessuno se il premio non c'è o se il sistema non
l'ha trovato: è §12 e §18 applicati a una cella di tabella.

Sul portafoglio vero: 30 polizze, 7 senza annuo, **2 ricavabili** (backfill
applicato, `dati.ssf.premio_annuo_da = 'titoli'` per poterlo annullare), 5 che
restano vuote e adesso dicono perché.

### La colonna resta il premio ANNUO, e la rata si dichiara

Scrivere la rata nella colonna dell'annuo senza dirlo farebbe sommare mele e
pere nel totale in fondo alla pagina: due polizze con la stessa rata possono
valere il doppio l'una dell'altra. Dove l'annuo non c'è, la cella mostra la
rata **con scritto «di rata»**, e sotto il motivo.

### Il campione conteneva metà del caso

La semestrale di collaudo aveva **una sola** delle due rate: la prova non
avrebbe mai potuto vedere la strada buona. Aggiunta la prima semestralità
(com'è nel file vero), tre prove hanno cambiato numero — e ognuna è stata
aggiornata **nella regola, non nel numero**:

- «l'annuo non si stima» ora pretende che l'annuo sia 220 **e diverso dalla
  rata**, e controlla su una seconda semestrale senza rate che non diventi
  `rata × 2`: prima quella prova sarebbe rimasta verde con la moltiplicazione;
- «non si duplica quello che la compagnia ha già mandato» non conta più le rate
  della polizza (è il campione) ma pretende che **nessuna** di quelle rate
  l'abbiamo generata noi;
- il conto delle provvigioni e delle rate da incassare segue il campione, e la
  regola guarda quante ne abbiamo **dedotte** (una sola).

Lo zip di collaudo si rigenera insieme ai CSV: contiene una copia degli stessi
file, e una prova confronta le due strade — se si aggiorna solo il CSV, quella
prova diventa rossa per un motivo che non è il suo.

### Due controprove

L'annuo stimato moltiplicando la rata → rossa la prova della regola 2. Le rate
dedotte da noi ammesse nel conto → rossa la prova che le esclude.

---

## 37. Brief IAM — Blocco 1: menu, Richieste, segnale del rilascio (20/09/2026)

Tre punti che sembrano di forma e non lo sono, più **un guasto vivo trovato
mappando prima di scrivere**.

### Il guasto: «Conti e causali» non si apriva più

`goTab` controlla l'elenco delle sotto-schede di Contabilità **prima** di
cercare il pannello. La sotto-scheda della quadratura dei conti si chiamava
`conti` — e `conti` è anche il pannello di **Strumenti › Conti e causali**.
Risultato: la voce di menu apriva la Contabilità, e la schermata dove si
configurano i conti era irraggiungibile. L'avevo introdotto io con la M3, il
giorno prima.

> **Un nome usato per due cose, in due elenchi diversi, e il primo vince in
> silenzio.** È la malattia dei nomi globali di §6a applicata alle rotte: non
> c'è nessun errore, nessuna pagina bianca — solo una schermata che si apre al
> posto di un'altra.

La sotto-scheda adesso si chiama `quadconti`. Due prove: una legge l'elenco in
`goTab` e diventa rossa se il nome ambiguo torna, l'altra fa girare
`selContabTab` davvero e pretende che resti accesa **una** schermata sola.

### Punto 5 — Contabilità, cinque voci

Prima nota, Quadratura conti e Incassi da accreditare **esistevano da giorni e
non erano nel menu**: si raggiungevano solo dalla striscia dentro Contabilità,
cioè passando da un'altra schermata. È il guasto §1 in versione menu — una
pagina che non ha una voce, per chi lavora, non esiste.

«Carica documenti» e «Conto» tolte, come chiede il brief. **Niente di
cancellato**: i due caricamenti stanno dentro Sospesi (la schermata che li
usa), e il saldo ricostruito con gli estratti della banca sta dentro Quadratura
conti — sono il **ricostruito** e il **dichiarato** della stessa quadratura, e
stavano in due voci diverse: il confronto si faceva guardando due schermate.
I due vecchi nomi restano nell'istradamento e portano dove il contenuto è
andato (§6b).

**Quadratura di giornata e Storico restano**: sono i 68 giorni già scritti,
l'unica contabilità che l'agenzia ha finché i numeri del ricostruito non
saranno stati confrontati con i suoi (§17, §33).

### Punto 12 — Strumenti, due cassetti

`Preventivatore` (Fonti e collegamenti, Stato collegamenti, **Parametri
previdenziali**, spostata da Agenzia) e `Gestionale` (Collaboratori, Conti e
causali, Gestione compagnie, Provvigioni). Sono gruppi di navigazione, non
pagine: **le rotte non cambiano**, quindi ogni vecchio collegamento continua a
funzionare — e una prova lo misura, rotta per rotta. Cambiata anche la briciola
dei parametri: dire «Agenzia» in alto su una pagina che sta in Strumenti manda
a cercarla dove non è.

### Punto 13 — Richieste, e lo standard delle liste

«Azzera» e «Aggiungi richiesta» stavano **dentro** la griglia dei filtri.
Adesso: azione primaria in testata su una riga sola, sette filtri di forma
identica, Cerca e Azzera sotto a destra.

Tre cose che valgono più del riordino:

- **«Azzera» è spento finché non c'è niente da azzerare.** Un bottone che non
  fa niente e sembra attivo si clicca, e chi lo clicca crede di aver sbagliato
  lui.
- **Il riepilogo si clicca.** Era una riga di testo: i numeri si leggevano e
  non si potevano usare. «Quante ne ho da lavorare» e «fammele vedere» erano a
  due clic di distanza, ora sono lo stesso clic.
- **Su telefono i filtri si richiudono, e il numero dice quanti sono
  applicati.** Un pannello chiuso che nasconde un filtro attivo fa cercare per
  mezz'ora delle righe che ci sono.

I sette filtri stanno in **un elenco solo** (`RQ_FILTRI`): contarli e azzerarli
sono la stessa domanda, e due elenchi scritti a mano divergono al primo filtro
aggiunto.

### Punto 11 — il segnale del rilascio

**La regola è «non letto», non «diverso».** «C'è una versione nuova» resterebbe
vero per sempre, e un pallino che non si spegne mai smette di voler dire
qualcosa — è la targhetta ferma da tre mesi che §27 ha tolto, in un'altra
forma. Si ricorda la **versione letta** (non la data: le date cambiano anche
quando non cambia niente per chi lavora), e al **primissimo avvio non si
accende**: chi apre IAM la prima volta non ha novità non lette.

Se `versione.json` non risponde non si accende **niente**: un pallino «per
sicurezza» manderebbe a leggere novità che non sappiamo se esistono (§12, §18).

Sta in due posti — l'avatar, che si vede sempre, e la targhetta, che si vede
solo col menu aperto: *un segnale visibile solo dentro il posto in cui sta non
è un segnale*.

### Una prova rotta da un nome nuovo

`ui-test.mjs` ritagliava la riga della tabella fino a `'function rqApri'`. Da
oggi esiste anche `rqApriFiltri`, che viene **prima**: la fetta diventava
vuota, e la prova dichiarava rotto un codice giusto. L'ancora adesso è la
funzione intera, con la parentesi — ed è la stessa trappola delle fette già
presa in §12 e nella M6.

---

## 38. «Non li vedo online»: la scheda lasciata aperta (20/09/2026)

> «Molte degli aggiornamenti che ti ho richiesto non li vedo online, per favore
> metti tutto online e visibile» — Francesco.

**Misurato prima di toccare qualsiasi cosa, e il deploy non c'entrava.**

| controllo | esito |
|---|---|
| `main` | `0ea87d9`, tutte le PR da #208 a #217 fuse |
| commit vivo sul VPS (canale comandi) | **lo stesso**, `0ea87d9` |
| `iam.withusassicurazioni.it/` | `app-versione 0.8.0` |
| `quoto.withusassicurazioni.it/` | `app-versione 0.8.0` |
| `/nuovo-preventivo/versione.json` | `0.8.0` |
| header delle due pagine | `cache-control: no-cache`, con `etag` |
| autopull | gira, ogni minuto |

Era pubblicato tutto. A non averlo era **la scheda del browser**.

> **IAM è un'applicazione a pagina sola: una scheda lasciata aperta non
> richiede mai di nuovo la pagina.** Per quanti rilasci passino, resta quella
> di quando è stata aperta.

È il guasto §12 in una forma che **nessun header può risolvere**: `no-cache`
fa rileggere la pagina *quando la si chiede*, e una scheda aperta non la chiede
mai. Il 18/09 si erano sistemati gli header e il contrassegno del riquadro, e
tutti e due risolvono il ricaricamento; nessuno dei due parla a chi non
ricarica.

Il segnale c'era già a metà: il pallino del §37 dice «c'è un rilascio che non
hai letto», e la finestra delle novità (§30) confronta la versione pubblicata
con quella in uso. Ma quel confronto stava **dentro** la finestra: bisognava
aprirla per sapere che bisognava aprirla.

| pezzo | dove |
|---|---|
| la fascia e il tasto «Ricarica» | `#nov-vecchia`, `novVecchia` / `novVecchiaVia` in `iam/index.html` |
| il ricontrollo da sé | `setInterval` 5 minuti + `visibilitychange` in fondo a `novControlla` |
| prove | `iam/verifica/versione-app.test.mjs` — **10** (erano 8) |

**Due segnali, due domande diverse.** Il pallino: «c'è un rilascio da
leggere». La fascia: «quello che hai davanti non è quello che c'è sul server».
Si può essere aggiornati e non aver letto, e si può aver letto restando su una
pagina vecchia.

**Il confronto è fra due strade diverse apposta**, come in §30: il `<meta>`
dice che cosa sta **girando**, il `fetch` dice che cosa il server ha **adesso**.
È l'unica cosa che una pagina può sapere di sé.

**E tace quando non sa.** Senza uno dei due numeri — il server che non risponde,
il `<meta>` assente — non si accusa niente: «non lo so» non è «sei vecchio»
(§12, §18). C'è una prova che fa girare il codice davvero nei quattro casi, e
la controprova (via il controllo sul numero in pagina) la fa diventare rossa.

**Il rientro sulla scheda è il momento che conta**, più dei cinque minuti: è
quando la si guarda davvero. Con un freno di un minuto, perché passare fra le
schede dieci volte non sono dieci richieste.

### Cosa resta aperto

- **`quoto.` a pagina intera non ha la fascia**: la usa solo il collaboratore
  «solo QUOTO» (§10). Dentro IAM il riquadro segue il ricaricamento della
  scocca, che rilegge l'`ETag` del preventivatore (§12).
- **Il tasto «Ricarica» fa un ricaricamento normale**, che con `no-cache` basta:
  la pagina si rilegge e l'`ETag` decide. Se un giorno non bastasse, il passo
  dopo è aggiungere un contrassegno all'indirizzo — ma prima va misurato, non
  supposto.

---

## 39. Il catalogo prodotti (20/09/2026)

Brief «Anagrafica compagnie e catalogo prodotti». Il brief parla di React e
Supabase: la seconda sì, il primo no (§9, §21). E come al solito la prima cosa
è stata misurare, non leggere.

| misurato il 20/09/2026 | |
|---|---|
| `quote_compagnie` | **9 compagnie**, alias solo su HDI e Prima |
| catalogo prodotti | **non esisteva**, né standard né per compagnia |
| `iam_provvigioni_tariffa` | **0 righe** |
| `iam_provvigioni_collaboratore` | **0 righe** |
| `quote_polizze` | 30 righe, **5** coppie (compagnia, prodotto) |
| `quote_pratiche` | 2 righe, 1 coppia |

I nomi veri: `PRIMA/rca/BLACK` (23), `HDI Assicurazioni/persona/RC Vita Privata
· HDI` (3), `HDI Assicurazioni/beni/Rischi Catastrofali Abitazione (HDI)` (2),
`PRIMA/beni/CASA_E_FAMIGLIA` (1), `PRIMA/beni/FAMIGLIA` (1).

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/catalogo.js` |
| prove in Node | `server/verifica/catalogo.test.mjs` — **21** |
| le due tabelle, gli indici, le politiche, il seme, il rollback | `supabase/migrations/20260920_catalogo_prodotti.sql` (applicata) |
| la schermata | `#panel-catalogo` e il blocco `cat*` in `iam/index.html` |
| prove sulla schermata | `iam/verifica/catalogo-prodotti.test.mjs` — 10 |
| l'importazione che crea | `fluCatalogo`, `fluCatalogoHTML`, `fluScriviCatalogo` in `index.html` |
| prove nella pagina | blocco «flusso» in `ui-test.mjs` — **456** |

### La misura che ha deciso il riallaccio

**Nelle tariffe non c'era niente da rompere**: zero righe. Le stringhe che
contano sono le 32 di portafoglio. Quindi le due tabelle nascono **accanto**, e
**nessuna colonna diventa `prodotto_id` oggi**: il catalogo si riempie (a mano e
dall'importazione), una **copertura** dice quante righe hanno già trovato il
loro prodotto, e solo quando è piena si valuta la colonna.

Convertire subito vorrebbe dire mettere una chiave esterna verso una tabella
**vuota** su 32 righe che funzionano: rompere quello che c'è per agganciarlo a
quello che non c'è ancora. E il riallaccio non si perde per strada — la chiave
di ricerca (compagnia normalizzata + ramo + nome normalizzato, con gli alias) è
la stessa del motore, quindi **una polizza scritta ieri ritrova il suo prodotto
il giorno in cui il prodotto esiste**, senza riscrivere la polizza.

### Il ramo non è una parola nuova

È la chiave dei moduli che tutta la casa usa già (`MODULES` in `index.html`,
`quote_polizze.modulo`): `rca`, `beni`, `vita`, `persona`, `tutela`, `impresa`,
`rcprof`, `cauzioni`, `salute`, `animali`, `viaggio`. Inventarne un secondo
vocabolario sarebbero due elenchi che non si incrociano (§18, «storico»).

E **il ramo lo decide la libreria, non il nome commerciale**: il nome è della
compagnia, il ramo è di casa nostra. Con una conseguenza che la prova ha
corretto: il ramo del file vale come filtro **solo se è una parola che
conosciamo**. Se la compagnia scrive «auto» dove noi scriviamo «rca»,
restringere a «auto» non troverebbe mai niente, e il prodotto nascerebbe
scollegato dalla libreria **proprio nel caso in cui la libreria serve di più**.
Dove il ramo non è uno dei nostri decide il nome, e il ramo lo porta lo standard
trovato.

### Le regole che, saltando, producono un catalogo credibile e sbagliato

1. **Aggancia solo se è una.** Due compagnie che si riducono alla stessa forma
   («Nord Assicurazioni» e «Nord S.p.A.») non producono **niente**: sceglierne
   una vuol dire attribuire un portafoglio alla compagnia sbagliata. È la
   regola dei codici collaboratore (§19) applicata alle compagnie. E sotto una
   compagnia ambigua non si aggancia e non si crea nessun prodotto.
2. **«Casa» di HDI e «Casa» di Prima sono due prodotti.** La chiave è la coppia
   compagnia+ramo: su una chiave a nome solo la seconda mangerebbe la prima, in
   silenzio.
3. **Lo standard si PROPONE.** «BLACK» non somiglia a «RC Auto» in nessun modo
   che un programma possa vedere: l'aggancio lo decide una persona (§8.1).
4. **Non si elimina, si disattiva** (§26): sotto ci sono polizze, e sono storia.
   Nel pannello non c'è nemmeno una `.delete()`, e c'è una prova che lo misura.
5. **Fondere mette il nome scartato fra gli ALIAS.** È l'unica cosa che fa
   funzionare la fusione la notte dopo: senza, l'importazione ricreerebbe lo
   scartato come nuovo e la fusione sarebbe da rifare ogni notte.
6. **L'importazione non si ferma mai.** Ogni riga finisce in uno di tre posti —
   agganciata, da creare, o dichiarata impossibile col motivo — e nessuno dei
   tre blocca il resto. Un'importazione che si ferma sulla riga 400 lascia un
   portafoglio scritto a metà, e nessuno sa quale metà. Nel codice questo è un
   `try` **attorno al solo catalogo**: il portafoglio è il lavoro, il catalogo è
   la sua etichetta.

### La normalizzazione sta in due posti, e devono dire la stessa cosa

`iam_nome_norm` in Postgres è la copia esatta di `norm()` nel motore. **Se le
due divergono, l'indice unico accetta un doppione che il codice credeva
impossibile** — ed è il modo in cui un catalogo comincia a contenere due volte
lo stesso prodotto senza che nessuno se ne accorga. C'è una prova che legge la
tabella degli accenti dalla migrazione e pretende di ritrovarla, carattere per
carattere, nel motore.

### Chi legge e chi scrive, e l'eccezione dichiarata

**Leggere: chiunque abbia un accesso.** Un catalogo di prodotti non è un dato su
una persona — quei nomi stanno già sulle polizze che un collaboratore vede.
Tenerlo allo staff vorrebbe dire che il giorno in cui le tendine lo leggono, a
un collaboratore esce una tendina vuota. È la stessa scelta di
`quote_compagnie`.

**Scrivere: l'admin** (§19, §26). Con una sola eccezione, e scritta in faccia
nelle politiche: **l'importazione la lancia lo staff, e deve poter registrare
quello che ha trovato** — quindi lo staff può inserire una riga *solo* se nasce
`origine='import'` e `da_verificare=true`. Non può decidere niente e non può
correggere niente. Il permesso di gestione resta all'amministrazione.

### Due voci nel registro, non una

`prodotto` (→ `iam_compagnia_prodotti`) e `prodotto_standard` (→
`iam_prodotti_standard`) vivono in due tabelle: una voce sola aprirebbe la riga
sbagliata la metà delle volte, e **un id che apre la cosa di qualcun altro è
peggio di un id assente** (§18, regola 1).

### Controprove

- Tolta la regola «aggancia solo se è una» → **tre** prove del motore rosse.
- Tolto il `try` attorno alla scrittura del catalogo → rossa la prova nella
  pagina «se il catalogo non si scrive, il portafoglio entra lo stesso».

### Cosa resta aperto

- **Il catalogo dei prodotti di compagnia nasce vuoto**, ed è voluto: i prodotti
  esistono davvero sul portafoglio, e portarli dentro è una cosa che si
  **guarda prima di scrivere** (§14). Lo fa il tasto «Guarda che cosa
  creerebbe», nella linguetta «Da verificare».
- **Le tendine di quotazione non leggono ancora il catalogo**: il preventivatore
  continua a usare `PRODOTTI_DIRETTI`, che è il contratto col menu di IAM
  (`INTERFACCIA-QUOTO-IAM.md` §2.6). Collegarli è un lavoro a sé, e va fatto
  quando la copertura è piena.
- **`prodotto_id` sulle polizze e sulle tariffe** resta una migrazione futura,
  con il suo backfill. Oggi sarebbe una chiave esterna verso il vuoto.
- **Gli alias delle compagnie sono ancora solo su HDI e Prima** (§20): un flusso
  il cui emittente non corrisponde crea una compagnia nuova invece di ritrovare
  quella che c'è. Adesso però la crea marcata, e si vede.

---

## 40. Brief IAM — Blocco 2: la polizza a mano, la ricerca, le attività (20/09/2026)

Tre punti con la stessa forma: **una cosa esisteva già e non serviva a chi
lavora.** In tutti e tre il lavoro è cominciato misurando, e in tutti e tre la
misura ha detto quanto era grosso il buco.

| pezzo | dove |
|---|---|
| la polizza a mano | blocco `pnu*` in `index.html`, tasto in cima al Portafoglio |
| la ricerca globale | `globalSearch` / `gsAct` in `index.html` |
| le attività recenti | blocco `atr*` e `#atr-pop` in `index.html` |
| prove | blocco «Blocco 2» in `ui-test.mjs` — **466** (erano 456) |

### Punto 2 — una polizza si può scrivere a mano

**Misurato: in tutto il documento ci sono DUE scritture in `quote_polizze`, e
nessuna delle due la si comanda.** Una nasce emettendo un preventivo, l'altra
dall'importazione della compagnia. Una polizza arrivata per telefono, o fatta
da un collaboratore su un portale, non aveva **nessuna strada** per entrare in
portafoglio — e finché non entra non esiste per lo scadenzario, per i titoli,
per l'estratto conto e per la contabilità.

Quattro regole, e ognuna è una regola di casa già scritta:

1. **Il cliente viene dall'anagrafica** (§7, §11): senza `cliente_id` il
   fascicolo non si apre e il diario non si scrive. Il componente è quello di
   tutta la casa (`clpInstalla`), non un autocomplete nuovo.
2. **Il prodotto viene dal catalogo** (§39). È il **primo consumatore vero**
   delle due tabelle nate ieri: si sceglie la compagnia e i prodotti sono i
   suoi, col ramo che porta la libreria. Dove il catalogo non copre quella
   compagnia il campo resta libero — ma **lo dice**, invece di far credere che
   quella stringa sia un prodotto riconosciuto.
3. **Le rate nascono con la polizza** (`titGenera`): «se le rate non nascono
   con la polizza, gli insoluti non esistono e i soldi non si recuperano». E
   se non nascono **lo dice**: scoprirlo fra un mese è tardi.
4. **`fonte: 'manuale'`**, come il flusso scrive `'ssf'`. Una riga di
   portafoglio che non dice da dove viene è una riga di cui, il giorno in cui
   i numeri non tornano, nessuno sa più niente.

Due cose che **non** si indovinano: con un frazionamento non dichiarato la
rata non si divide per un numero inventato (la scrive chi la sa), e la
scadenza a un anno si scrive **nel campo**, visibile, perché chi la guarda la
corregga — una data riempita dietro le quinte finisce in archivio senza che
nessuno l'abbia letta (§8.1).

Il cancello è `isStaff()`, **chiamato**, non riscritto: due cancelli scritti a
mano divergono al primo ruolo nuovo.

### Punto 8 — la ricerca trovava il 17% del portafoglio

La barra c'era. Il numero spiega tutto:

| | |
|---|---|
| polizze in portafoglio | **30** |
| di cui **senza un preventivo** | **25** — l'83% |
| con un numero di polizza | 25 |

`globalSearch` leggeva `quote_preventivi` filtrando `polizza_emessa`, e
chiamava «Polizze» quelle righe. Le venticinque arrivate dalla compagnia non
hanno un preventivo e **non si trovavano in nessun modo**: né per cliente, né
per prodotto, e nemmeno per il numero di polizza — che è l'unica cosa che un
cliente al telefono sa dirti. È il **guasto §1 in versione ricerca**.

Tre correzioni, e la terza è quella che si sente di più:

1. si cerca in `quote_polizze` **davvero**, e anche per numero e per targa;
2. si cercano anche **sinistri** e **pratiche in lavorazione**;
3. **il risultato apre la riga.** Prima ogni polizza e ogni preventivo
   portavano a `showPage('storico')`: trovavi la cosa e poi te la cercavi a
   mano. Trovare e aprire erano due lavori.

**La targa è una lettura a parte, e non è pigrizia.** Sta in un percorso jsonb
(`dati->ssf->veicolo->>targa`), e un percorso sbagliato dentro un `or` fa
fallire **tutta** la condizione: il portafoglio intero sparirebbe dalla
ricerca per un campo in più. Due letture separate costano una richiesta e non
si portano giù a vicenda (§35).

**E ogni sezione sta in piedi da sola**: una tabella che non risponde toglie la
sua sezione e **lo dichiara col suo nome** — «non si è potuto cercare fra i
sinistri» non è «non ci sono sinistri» (§12, §18).

> **Il difetto §35, ripetuto e preso dalla misura.** La prima stesura cercava
> nei sinistri con `numero_sinistro`, `cliente` e `data_sinistro`: colonne di
> *altre* tabelle. Il sinistro ha `numero_sx`, `contraente`, `n_polizza` e
> `data_accadimento`. Su PostgREST è un 400, ed è esattamente la colonna
> copiata dalla tabella accanto che il 20/09 aveva spento una schermata
> intera. L'ha presa la lettura dello schema, non il ragionamento.

### Punto 9 — le attività recenti, un'icona

Il registro dei movimenti c'è dal 19/09 (§18) e conta **236 righe**. Si leggeva
però solo da una **pagina**, «Attività», in fondo a una barra da ventuno voci e
riservata allo staff: la stessa distanza che aveva fatto perdere «Importa»
(§15). «Che cosa è successo mentre non c'ero» è una domanda da tre secondi.

Due regole, tutte e due già scritte:

- **«Non risponde» non è «non è successo niente»** (§18). Il riquadro lo dice
  in faccia invece di mostrare un elenco vuoto, che rassicura a sproposito.
- **Il pallino esclude i movimenti propri.** Quello che hai fatto tu non è una
  novità, e un pallino che si accende a ogni salvataggio diventa rumore in
  mezz'ora — è la targhetta ferma da tre mesi di §27, in un'altra forma.

E **si apre solo quello che si può aprire**: una voce senza tabella o senza
identificativo si legge e non si clicca, perché un id che apre la riga di
qualcun altro è peggio di un id assente (§18, regola 1).

### Un guardiano che era rosso su `main`

`fusione-collisioni.test.mjs` misurava **18 classi in comune contro una soglia
di 17**: rosso prima di questo lavoro, come `tracciabilita.test.mjs` in §21. Un
guardiano permanentemente rosso insegna a ignorare i rossi, quindi si è
chiuso: `.ana-carta.attiva` di QUOTO è diventata `.ana-attiva` (due regole CSS
e due `classList.toggle`), e la classe `primario` che stavo per aggiungere è
nata già prefissata `rin-primario`. Adesso **6 su 6**, con scarto 0.

È la §26 di nuovo: *una classe dentro un discendente sembra al sicuro e non lo
è — nel foglio di stile è un nome globale.*

### Controprove

- Tolto il controllo sul cliente dall'anagrafica → rossa «senza cliente non si
  salva».
- Spenta la sezione delle polizze vere → rosse **due** prove della ricerca.
- Tolto il filtro sui movimenti propri → rossa la prova del pallino.

### Due trappole del banco, annotate

- **Il finto database deve restituire una polizza COMPLETA.** `titGenera`
  rilegge la polizza appena scritta per sapere premio e frazionamento: con il
  solo `id` le rate non potevano nascere, e la prova accusava il codice di un
  difetto del banco.
- **Il salvataggio riuscito apre il dettaglio dopo 120 ms**, e quello
  rimpiazza il pannello: una prova che riapre il modulo subito dopo se lo vede
  sovrascrivere mentre lo compila.

### Cosa resta aperto

- **La polizza a mano non crea il fascicolo documentale** (§11): i requisiti si
  congelano aprendo il fascicolo dal Portafoglio, come per le altre.
- **`prodotto_id` resta scollegato**: il catalogo si annota in
  `dati.catalogo_prodotto_id`, e l'aggancio vero è la migrazione futura di §39.
- **La ricerca non copre i titoli**: una rata si cerca dalla sua polizza, e una
  sezione in più su una tendina già lunga andrebbe misurata prima.

---

## 41. Brief IAM — Blocco 3 · punti 3 e 6: le sospensioni e il fido (20/09/2026)

Due cose nuove, e tutte e due toccano dei soldi. Misurato prima di scrivere:
**nel repository la parola «sospensione» non compariva nemmeno una volta, e
«fido» nemmeno.**

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/sospensione.js` |
| prove in Node | `server/verifica/sospensione.test.mjs` — **14** |
| le tre colonne, l'indice, il rollback | `supabase/migrations/20260920_sospensioni_e_fido.sql` (applicata) |
| sospendi/riattiva, la scadenza vera, l'elenco | blocco `sos*` in `index.html`, `#rin-sospese` nello Scadenzario |
| il fido nella scheda | blocco `fid*` e `#mc-fido` in `iam/index.html` |
| il fido nel riepilogo d'agenzia | `ecpFidi` / `ecpFidoCella` in `index.html` |
| prove | `iam/verifica/fido-persona.test.mjs` (8), blocco «Blocco 3» in `ui-test.mjs` (**473**) |

### Punto 3 — la scadenza scritta e quella vera sono due date diverse

Una RCA sospesa oggi non esisteva da nessuna parte: restava in portafoglio con
la sua scadenza contrattuale, entrava nello scadenzario con **una data che non
è più vera**, e il giorno in cui il cliente rimette in strada la macchina non
se ne ricordava nessuno.

> **La copertura sospesa si recupera.** I giorni fermi si aggiungono in fondo,
> quindi la scadenza vera non è quella scritta sul contratto. Un'agenzia che
> richiama sulla data contrattuale telefona nel giorno sbagliato, e chi ha
> sospeso sei mesi se lo sente dire dal cliente.

**La scadenza contrattuale non si riscrive: si tiene, e si somma.** Un dato
sovrascritto è un dato di cui nessuno sa più quale fosse l'originale. Quella
vera si **calcola** (`Sospensione.stato`), e compare accanto a quella scritta —
ma solo quando le due non coincidono: un «(vera: la stessa)» su ogni polizza
sarebbe rumore che si impara a saltare.

**Le sospensioni sono un ELENCO, non due date.** Una polizza può essere sospesa
più volte nella stessa annualità: con una coppia di colonne la seconda
cancellerebbe la prima, e i giorni recuperati dal cliente sparirebbero.

**Quanto può durare lo dichiara la compagnia**, e ogni compagnia ha il suo.
Dove nessuno l'ha scritto, i giorni si contano e **il giudizio non si dà** —
«non si sa» non è «va bene» (§12, §18, §20). Resta però un tetto che vale
sempre, ed è una conseguenza del contratto: **una sospensione non può
recuperare più copertura di quanta ne restava.** Fra due tetti vince il più
stretto; non si fa la media.

### Punto 6 — un credito senza tetto si scopre quando è troppo grande

Il credito dell'agenzia verso ogni collaboratore esiste dal 19/09 (§24): sono
le rate che ha incassato lui e non ha ancora rimesso. Il fido è il tetto.

**Un fido non dichiarato non è un fido illimitato.** Chi non ce l'ha esce dai
conti **con il motivo scritto**, e il suo credito **non entra nei totali**: una
«esposizione oltre il fido» che comprende persone di cui non si sa il limite è
un numero che non vuol dire niente. È la regola dell'estratto conto (§17)
applicata a un limite invece che a una percentuale.

**Uno zero invece è un accordo, e si conta**: questa persona non tiene denaro
dell'agenzia. Nel modulo, un campo lasciato vuoto **toglie** il fido e non lo
mette a zero — confonderli direbbe che una persona non può tenere niente
quando invece nessuno ha deciso.

**Il fido sta sulla PERSONA, non sulla scheda economica**, ed è una scelta
misurata: il credito si calcola su chi ha **incassato**
(`quote_titoli.pagatore_collaboratore_id`, che punta a `quote_collaboratori`),
e chi ha incassato può non avere una scheda. Mettendolo su `iam_team`, una
persona senza scheda sarebbe risultata **senza limite, in silenzio**.

### La migrazione non semina niente

Tre colonne, tutte nullable o con un default vuoto, e **nessuna colonna
esistente toccata**. Scrivere un numero «ragionevole» qui dentro vorrebbe dire
che da domani il sistema giudica dei crediti e delle scadenze su una soglia che
nessuno ha deciso — e quel numero, dopo due settimane, diventa un dato (§8.1).
Misurato dopo l'applicazione: **0 polizze sospese, 0 fidi, 0 limiti** su 17
persone e 9 compagnie. È il punto: il sistema ha finito il suo lavoro quando ha
chiesto.

### La trappola dei commenti, decima volta

Il commento della migrazione **nominava le due colonne che stava vietando**, e
la prova che le cerca nel file è diventata rossa su una migrazione corretta. È
§10, §12, §18, §26, §29, §31, §33, §34, §37. Due correzioni, come sempre: il
commento non scrive quelle parole, **e** la prova legge solo le righe di
codice, togliendo i `--` a inizio riga (mai una regex globale, §12).

### Una controprova che non faceva diventare rossa nessuna prova

Rimesso dentro «chiudi la PRIMA sospensione aperta» invece dell'ultima, tutto
restava verde. La controprova era buona: **era la prova a essere debole.** Nel
banco c'era una sola sospensione aperta, e lì i due comportamenti coincidono.
E non è bastato aggiungerne una seconda: finché la prima aperta dell'elenco era
*anche* la più recente, le due strade davano la stessa risposta. Serviva
l'ordine in cui si separano — la più vecchia scritta per prima — che è
esattamente quello che produce una scrittura andata male. Allora la prova
diventa rossa.

*Una controprova che non fa diventare rossa nessuna prova va guardata bene*
(§15, §17, §18, §19): stavolta il guasto era un guasto, e il banco non lo
vedeva.

### Cosa resta aperto

- **Nessuno ha ancora dichiarato niente**: né un fido, né un limite di
  sospensione per compagnia. Finché è così il sistema conta e non giudica, e lo
  dice — ma è la prima cosa da fare in schermata.
- **Le sospensioni non toccano le rate.** Una polizza ferma continua ad avere i
  suoi titoli con le decorrenze di prima: se durante la sospensione la rata non
  si deve pagare, è una decisione che nessuno ha preso e che tocca la
  contabilità.
- **Il Blocco 3 non è finito**: restano i punti 7 (dettaglio conto), 12-bis
  (monitor stato collegamenti), 10 (dashboard KPI) e 4 (filtri marketing).

---

## 42. Brief IAM — Blocco 3: il conto, il monitor, i numeri, i filtri (20-21/09/2026)

Gli ultimi quattro punti del Blocco 3. Tre dei quattro hanno la stessa forma,
che a questo punto è la forma di mezzo repository: **la cosa esisteva già e non
serviva a chi lavora** (§1). Il quarto è un pezzo che mancava del tutto.

| punto | dove | misurato prima di scrivere |
|---|---|---|
| 7 dettaglio conto | `dco*` in `iam/index.html`, `Contabilita.dettaglioConto` | l'elenco dei conti dava un saldo per riga e nessun modo di sapere perché |
| 12-bis monitor collegamenti | `collegCarica`/`collegMonitor` in `iam/index.html`, `tariffe/motore/collegamenti.js` | si aggiornava **solo al clic**, e non c'era nessuno storico: `grep setInterval` trovava solo il controllo versione e la posta |
| 10 KPI sulla Scrivania | `kpi*` in `iam/index.html`, `tariffe/motore/kpi.js` | la Scrivania diceva che cosa **fare** e mai come sta andando |
| 4 filtri marketing | `seg*` in `index.html` | il server onorava **20** filtri, la schermata ne chiedeva **14** |

| pezzo | prove |
|---|---|
| `Contabilita.dettaglioConto` / `storicoQuadrature` | `contabilita.test.mjs` → **43** (erano 36) |
| `tariffe/motore/collegamenti.js` | `collegamenti.test.mjs` — 9 |
| `tariffe/motore/kpi.js` | `kpi.test.mjs` — 8 |
| la finestra del conto | `iam/verifica/dettaglio-conto.test.mjs` — 9 |
| il monitor | `stato-collegamenti.test.mjs` → **24** (erano 19), e fa girare il codice |
| i numeri della Scrivania | `iam/verifica/kpi-scrivania.test.mjs` — 5, che fa girare il codice |
| i filtri | blocco «Blocco 3 · filtri» in `ui-test.mjs` → **476** |

---

### Punto 7 — lo storico delle quadrature NON si congela, ed è il contrario di un fascicolo

La decisione che vale tutto il punto, e va letta accanto a §11 regola 4, dove
si fa l'opposto:

> **La dichiarazione è un fatto della banca e non cambia mai; la ricostruzione
> è quello che il sistema dice OGGI per quella data.** Quindi ogni quadratura
> passata si **ricalcola**.

Se qualcuno scrive un movimento con una data vecchia, un giorno che quadrava
smette di quadrare — ed è **esattamente la cosa che si vuole vedere**.
Congelando la differenza al momento della dichiarazione, la scrittura
retroattiva sparirebbe dalla vista: si nasconderebbe proprio il caso per cui la
quadratura esiste. Nel fascicolo si congela per la ragione opposta e altrettanto
vera: lì il cambiamento arriva da **fuori** (una compagnia che aggiunge un
requisito) e rifarebbe incomplete delle pratiche chiuse.

**Il progressivo parte sempre dall'inizio.** `dal`/`al` tagliano le righe da
*mostrare*, non quelle da *contare*, e il saldo di apertura del periodo è
scritto sopra la prima riga. Un saldo progressivo che riparte dal saldo
iniziale in mezzo a un periodo è un numero falso in un modo che nessuno
controlla: **sembra un saldo**.

**Guardare non è scrivere.** La finestra ha un overlay suo e non passa da
`pntApri`, che è chiuso a chi non è admin. Chi vede l'elenco dei conti vede già
i saldi: negargli il perché vuol dire dargli un numero e togliergli il modo di
controllarlo.

**Quello che resta fuori dal saldo si conta.** Un movimento la cui causale non
esiste più non ha verso e non entra — giusto, non si indovina — ma un saldo che
ignora delle righe in silenzio è un saldo di cui non ci si può fidare. Si dice
quante sono e quanto pesano, **senza segno**, perché il verso è la cosa che non
si sa.

---

### Punto 12-bis — l'aggiornamento automatico NON forza, e non è un dettaglio

`forza=1` salta la cache del motore e va a **bussare ai portali delle
compagnie**. Farlo ogni due minuti vuol dire bussare settecento volte al
giorno, e dopo tre accessi falliti il freno ferma quella compagnia per un
quarto d'ora: insistere è il modo di **farsi bloccare l'utenza**, che si
sblocca solo telefonando. Il monitor rilegge quello che il motore ha già; a
forzare è il clic, che è una persona che ha appena sistemato qualcosa.

Il monitor si **spegne** quando la lettura non riesce: ripetere una chiamata
che non risponde non la fa rispondere, e la schermata direbbe «riprovo» mentre
non riprova niente di utile.

**«Da quando» è da quando qualcuno HA GUARDATO**, non da quando è successo.
`/fonti/salute` è una fotografia e non tiene memoria; la memoria è
`iam_collegamenti_stato`, **una riga per fonte e non un registro di eventi** —
un diario riga-per-osservazione crescerebbe di migliaia di righe al giorno e
per rispondere bisognerebbe comunque leggerne solo l'ultima. Di notte non
guarda nessuno: una compagnia caduta alle due risulta caduta alle otto, e la
prima osservazione **si dichiara** invece di far credere che il guasto sia
appena cominciato.

Tre regole di scrittura, tutte nel motore:
- **stesso stato → `dal` non si tocca.** Riscriverlo a ogni giro azzererebbe
  l'unica cosa che questa tabella serve a sapere.
- **si riscrive ogni dieci minuti** solo per dire «l'ho guardato adesso»: senza
  `visto_il`, «è così da tre giorni» e «nessuno la guarda da tre giorni» si
  leggono uguali.
- **cambio di stato → il cronometro riparte, e il cambio va a registro** (§18).

**Il riepilogo non somma «da collegare» con «non lo dice».** Un numero di lavori
da fare che comprende dei forse manda a sistemare una compagnia che magari è a
posto. La prova che contava «2 da collegare» misurava il mondo di ieri: si è
aggiornata la **regola**, non il numero (§15, §16, §33, §35).

E `collegStato` è salita nel motore: era una regola scritta dentro una
schermata, e una regola in una schermata non si prova senza aprire un browser
(§5).

---

### Punto 10 — perché questi numeri non sono quelli tolti il 4/8/2026

Il 4/8/2026 una striscia di quattro indicatori era stata **tolta** da questa
stessa pagina (§13.3) perché ripeteva i numeri di «Da fare oggi» a cento pixel
di distanza. Quella decisione vale ancora, e questi tre non la violano:

> **«Da fare oggi» elenca il LAVORO ARRETRATO — cose che qualcuno deve
> sbrigare. Questi dicono COME STA ANDANDO.** Un rinnovo da lavorare è un
> compito; il portafoglio in gestione non è un compito di nessuno.

C'è una prova che lo misura invece di fidarsi: nessuna delle tabelle di «Da
fare oggi» compare nel blocco dei KPI.

**Le polizze senza premio non valgono zero.** Cinque su trenta non hanno un
premio annuo (§36): sommare zero farebbe un portafoglio **più povero** del
vero, e un numero più basso, su una scrivania, nessuno lo mette in dubbio.
Restano fuori dal totale e il riquadro dice quante sono. Stessa cosa per una
polizza **senza scadenza**: non è né attiva né scaduta, e metterla da una delle
due parti gonfierebbe o svuoterebbe il portafoglio.

**Da zero non si fa una percentuale.** «Da 0 a 5» non è «+500%»: è «prima non
ce n'erano». È il modo più veloce di mettere in prima pagina un numero enorme
che non vuol dire niente. E la conversione non si divide per zero — mentre
**sopra il cento è vera** e si mostra: vuol dire che si sta emettendo
l'arretrato.

**Ogni riquadro è una lettura a sé** (§35): una tabella che non risponde toglie
il suo riquadro e lo dice col suo nome. La controprova (le tre letture in una
`Promise.all` che rilancia) fa diventare rossa la prova che lo sorveglia.

---

### Punto 4 — il server sapeva filtrare, e nessuno poteva chiederglielo

Misurato prima di scrivere: `membriSegmento` onorava **venti** filtri e la
schermata ne chiedeva **quattordici**. Sei — `comune`, `professione`,
`casa_proprieta`, `intermediario_id`, `gruppo_id`, `con_polizze` — erano codice
funzionante che nessuno poteva raggiungere. È §1 in versione marketing, ed è lo
stesso difetto della ricerca globale che trovava il 17% del portafoglio (§40).

La prova misura le due liste **nei due versi**, e non è simmetrica per caso:
- la schermata non offre un filtro che il server ignora — un filtro non
  applicato non fa un segmento più largo, fa **un segmento che chi lo ha
  costruito crede stretto**;
- il server non tiene una regola che nessuna schermata può chiedere.

#### Un «no» che è un valore di partenza

Misurato sul database: `sposato`, `ha_figli` e `casa_proprieta` sono
`not null default false`. Un `false` vuol dire **«nessuno l'ha mai chiesto»**,
non «no» — e sul portafoglio vero sono 58, 59 e 60 su 61. La schermata offriva
già «Senza figli» e «No»: una campagna così sarebbe andata quasi tutta a
persone di cui non sappiamo niente.

Non si può distinguere a posteriori, e indovinare sarebbe §8.1. Quindi **il
ramo negativo si chiama con il suo nome** («No, o mai chiesto») e la nota dice
perché; il ramo affermativo resta affidabile, perché **un `true` l'ha scritto
qualcuno**. Cambiare le colonne a nullable non risolverebbe niente: i `false`
già scritti resterebbero ambigui, e riscriverli sarebbe inventare.

#### La copertura dei campi, prima di costruire il segmento

Professione 1 su 61, intermediario 1 su 61, comune 31 su 61. Un filtro su una
colonna quasi vuota produce un segmento vuoto **che sembra un guasto del
programma**: saperlo prima evita mezz'ora di ricerca di un bug che non c'è. Se
la copertura non si legge si tace su quella riga e i filtri restano usabili
(§35).

---

### Quattro cose trovate lavorando, e che non erano nel ragionamento

**1. La trappola dei commenti ha una veste nuova: il testo che l'utente legge.**
Undicesima occorrenza (§10, §12, §18, §26, §29, §31, §33, §34, §37, §41). Il
guardiano di `conti-causali` cercava `saldo:` dentro un blocco enorme, ed è
diventato rosso su una **frase dell'interfaccia** — «Resta fuori dal saldo:
senza verso non si indovina». Due correzioni, come sempre: la frase è stata
riscritta **e** la prova adesso cerca un campo dentro una chiamata di
scrittura (`.update`/`.insert`/`.upsert`), che è quello che voleva dire
dall'inizio. Cercare una parola dove si voleva cercare una scrittura funziona
finché nessuno scrive quella parola in italiano.

**2. Una controprova restata verde perché la prova guardava quello che si VEDE
invece di quello che si SCRIVE.** Corrompendo `dal` in scrittura (scriverci
`visto_il`), tutte le prove del monitor restavano verdi: la schermata mostrava
il numero giusto **adesso**, e quello sbagliato **domani**. È il difetto §19
del banco che non vedeva le scritture, un piano più in là. La prova adesso
rilegge la riga scritta, non il riquadro disegnato.

**3. Un processo in sottofondo che ripristina un file sotto una prova.** Una
controprova lanciata mentre un `node ui-test.mjs` precedente era ancora vivo
è restata verde: il processo vecchio, finendo, ha rimesso il file buono mentre
la prova nuova lo stava leggendo. Non era la prova a essere debole. **Una
controprova si lancia quando il banco è fermo** — e se resta verde senza una
ragione chiara, la prima cosa da guardare è chi altro sta scrivendo su quel
file.

**4. Una voce nuova nel vocabolario del registro, senza tabella.** `fonte` è lo
stato di un collegamento: `iam_collegamenti_stato` ha per chiave il **nome
della fonte**, che non è un identificativo di riga da aprire. Niente tabella,
niente puntatore — un puntatore che non apre niente è peggio di un puntatore
assente (§18, regola 1). L'ha presa il guardiano di `registro-movimenti`, non
la rilettura.

---

### Cosa resta aperto

- **Il dettaglio conto è vuoto finché non ci sono movimenti**, ed è giusto: la
  prima nota nasce vuota (§29) e i saldi iniziali dei conti sono a zero. La
  finestra lo dice invece di far credere che il saldo iniziale sia quello di
  oggi.
- **`iam_collegamenti_stato` nasce vuota**: il «da quando» comincia a contare
  la prima volta che qualcuno apre la schermata, e lo dichiara. Non c'è nessun
  controllo notturno: per averlo servirebbe qualcosa che gira sul VPS, ed è un
  lavoro a sé.
- **I KPI della Scrivania sono d'agenzia, non per collaboratore.** Produzione ›
  KPI e gare filtra già per persona; portare lo stesso filtro qui vuol dire
  decidere che cosa vede un collaboratore del portafoglio, e non è una
  decisione da prendere di sfuggita.
- **I segmenti restano zero**: la tabella `quote_segmenti` è vuota. I filtri
  adesso ci sono tutti, ma il primo segmento lo costruisce una persona.

---

## 43. Decisioni aperte: dove il sistema chiede (21/09/2026)

> «Definisci tutto, domani mattina vorrei vedere tutto online e funzionante» —
> Francesco, andando a dormire.

Metà di quella richiesta non si può soddisfare, e la ragione è la regola di
casa §8.1: **un fido, un saldo di banca, il nome dietro `U25274` non si
inventano.** Un numero scritto da un programma in contabilità, dopo due
settimane, diventa un dato — e nessuno saprà più che l'aveva scritto un
programma. Quello che si può fare è l'altra metà, ed è questo lavoro.

| pezzo | dove |
|---|---|
| le regole | `tariffe/motore/decisioni.js` |
| prove in Node | `server/verifica/decisioni.test.mjs` — 10, con tre controprove |
| la schermata | `#panel-decisioni` e il blocco `dec*` in `iam/index.html` |
| la voce di menu | `iam/withus-one.js` (Strumenti › Gestionale) + scorciatoia dalla Scrivania |
| prove sulla schermata | `iam/verifica/decisioni-aperte.test.mjs` — 6, che fa girare il codice |
| la colonna della data | `supabase/migrations/20260921_saldo_dichiarato_il.sql` (applicata) |

### Il problema: il sistema chiedeva in dodici posti diversi

Da settembre, in una decina di punti, il sistema ha smesso di indovinare — un
fido non dichiarato non è illimitato (§41), una provvigione non concordata non
ha una percentuale di default (§17), un codice produttore non si abbina per
somiglianza (§19). Ogni volta la conclusione è la stessa: **il sistema ha
finito il suo lavoro quando ha chiesto.**

Solo che chiedeva **dentro la schermata che usa quel dato**, e le schermate
sono ventuno. Una domanda che vive in un posto che nessuno apre è una domanda
che non è stata fatta — è §1 applicato alle richieste invece che al codice.

### Le tre regole che rendono l'elenco affidabile

1. **Ogni voce dice che cosa resta spento finché manca.** «Gli incassi restano
   fermi: il denaro è stato incassato e il conto non lo sa.» Un elenco di cose
   da fare che non dice che cosa si rompe non lo guarda nessuno due volte — è
   §33 («le anomalie hanno il verbo») applicato alle decisioni invece che ai
   guasti. C'è una prova che pretende quella frase su ogni voce.
2. **Una decisione presa a metà non è fatta.** Un conto su tre che dichiara i
   suoi mezzi è `a metà`, non verde: la metà mancante è esattamente quella che
   un giorno manderà un incasso sul conto sbagliato.
3. **«Non si è potuto leggere» non è «è deciso».** Su *questa* schermata è la
   bugia peggiore possibile, perché è il posto in cui si va a vedere se manca
   qualcosa: un verde che non è vero fa smettere di cercare proprio dove c'è il
   buco. Finché una voce resta cieca, «tutto deciso» non si può dire, e il
   riepilogo lo scrive.

E uno stato in più che sembra un dettaglio: **`inerte`**, cioè «non c'è ancora
niente da decidere qui». I codici produttore sono zero righe perché **le righe
da decidere le scrive l'importazione di un flusso**: contarli come decisi
direbbe che quel lavoro è finito, contarli come aperti manderebbe a cercare una
decisione che non esiste. È una terza cosa e si chiama col suo nome.

### Le prove sono misure, mai valori da accettare

Dove esiste un numero che aiuta a decidere, si mostra accanto alla voce:

- «**carta di credito** è il mezzo di 4 rate e **nessun conto** dichiara di
  riceverlo» — misurato sul portafoglio vero;
- «l'ultimo foglio cassa (16/09/2026) dichiara un fondo di **276,00 €**».

**Resta una misura da guardare, non un valore da scrivere**, e la frase lo dice
in faccia. Il giorno in cui una proposta si applica da sola, quel numero
diventa un dato. È la stessa distinzione di §19 fra *indovinare* e *applicare
una decisione presa*: dal risultato si somigliano, nella sostanza sono opposte.
Dalla schermata non si scrive niente — c'è una prova che lo misura.

### Uno zero non dice se qualcuno l'ha deciso

Il difetto trovato costruendo la voce dei saldi iniziali, ed è **lo stesso
misurato poche ore prima sulle anagrafiche** (§42): `saldo_iniziale` nasce a 0,
ma **zero è anche un saldo di partenza vero** — un conto aperto oggi parte da
zero. Guardando la sola cifra, «il saldo è zero» e «nessuno l'ha mai scritto»
si leggono uguali.

Sulle anagrafiche non si poteva rimediare: i `false` già scritti restano
ambigui per sempre. Qui sì, perché la colonna nasce adesso —
`iam_conti.saldo_dichiarato_il`, scritta solo quando qualcuno riempie il campo.
Aprire e richiudere la finestra non è una dichiarazione.

> **La lezione, generale: una colonna con un default che coincide con un valore
> legittimo perde per sempre la differenza fra «deciso così» e «mai toccato».**
> Se la si accorge quando la colonna nasce, costa una data accanto. Se la si
> accorge dopo, non si recupera.

### Quello che NON si è fatto, e perché

- **Non si è toccata la scocca per aprire una pagina precisa di QUOTO.** Due
  voci si decidono nel preventivatore; aprirlo su una sua schermata vorrebbe
  dire cambiare `MEGA`, che è contratto (`INTERFACCIA-QUOTO-IAM.md` §2.6) e si
  tocca con la sua versione e la sua impronta — non di notte e non di
  sfuggita. Il tasto apre il preventivatore, e la riga dice la stanza: meglio
  di un «Apri» che promette un posto e ne apre un altro.
- **Non si è creata la cassa contanti**, e non è pigrizia: l'agenzia ha già dei
  contanti (68 giorni di foglio cassa), quindi un conto nuovo con saldo zero
  sarebbe un saldo sbagliato, non un saldo mancante. La misura dell'ultimo
  giorno sta accanto alla voce.
- **Non si sono migrate le coordinate da `iam_azienda.dati`** (§26 lo lasciava
  aperto): misurato il 21/09/2026, `iban1`, `iban2` e `banca` sono **stringhe
  vuote**. Non c'era niente da spostare, e quella voce aperta si può chiudere.

### Una prova rossa per una maiuscola

`/non vuol dire che sia deciso/` contro un testo che comincia con «**N**on vuol
dire»: la prova dichiarava rotto un codice giusto. È la stessa trappola di §23
(«una regex sensibile alle maiuscole non vedeva *Non si è*»), e costa dieci
minuti ogni volta. **Una prova che cerca una frase dell'interfaccia la cerca
senza la prima lettera, o con `[Nn]`.**

### Cosa resta aperto — e adesso si vede da una schermata sola

Le dieci voci, misurate il 21/09/2026: mezzi 1 conto su 3, nessuna cassa
contanti, 0 saldi dichiarati su 3, conto delle rimesse non scelto, 0 tariffe,
0 fidi su 17 persone, 0 limiti di sospensione su 9 compagnie, 0 rate assegnate
su 55, catalogo prodotti vuoto, e i codici produttore che aspettano
un'importazione. Nessuna di queste è un lavoro di programmazione: sono dieci
domande con una risposta sola ciascuna, e adesso stanno tutte nello stesso
posto con scritto accanto che cosa costa non rispondere.

---

## 44. «Nuova polizza»: dal menu, col design di casa, e le rate giuste (21/09/2026)

Tre richieste di Francesco in una riga sola, e la terza portava una regola
scritta da lui che vale la pena rileggere:

> «se una polizza è fatta oggi ed ha frazionamento semestrale, la scadenza di
> contratto sarà esattamente tra un anno ma tra 6 mesi ci sarà una rata
> intermedia da incassare»

| pezzo | dove |
|---|---|
| le regole del piano rate | `tariffe/motore/piano-rate.js` |
| prove in Node | `server/verifica/piano-rate.test.mjs` — 10, una gira in cinque fusi orari |
| l'involucro in pagina | `titPianoPieno` / `titPiano` / `titGenera` in `index.html` |
| il modulo col design di IAM | blocco `pnu*` e il blocco di stile `.pnu-*` in `index.html` |
| la voce di menu | `iam/withus-one.js`, `MENU` › Portafoglio |
| la rotta | `showPage('portafoglio:nuova')` in `index.html` |
| prove nella pagina | blocco «nuova polizza» in `ui-test.mjs` → **481** |

### Il difetto che si vedeva solo contando i giorni

`pnuPiuUnAnno` costruiva la data con `new Date(iso + 'T00:00:00')` — mezzanotte
**locale** — e la rileggeva con `toISOString()`, che è **UTC**. In Italia, che
è avanti, il risultato torna indietro di un giorno:

| data | prima | adesso |
|---|---|---|
| 2026-09-21 | 2027-09-**20** | 2027-09-21 |
| 2026-01-31 | 2027-01-**30** | 2027-01-31 |

Sempre, anche d'inverno. Nessun errore e nessuna schermata rotta: **una data
credibile e falsa**, che finisce nello scadenzario e fa telefonare il giorno
sbagliato. Lo stesso difetto stava sul valore di partenza del modulo, che
prendeva `new Date().toISOString()`: fra mezzanotte e le due proponeva ieri —
la trappola già scritta per la Scrivania di IAM.

> **Una data ISO non ha un fuso orario, e farla passare da `new Date(...)` +
> `toISOString()` gliene dà uno.** L'aritmetica delle date si fa contando sui
> numeri della stringa. C'è una prova che fa girare il motore in cinque fusi
> (`UTC`, `Europe/Rome`, `Pacific/Kiritimati`, `Pacific/Niue`,
> `America/New_York`) e pretende la stessa risposta: è l'unico modo di
> misurarlo davvero, perché dentro un processo solo il fuso è già quello che è.

### Gli altri tre difetti del piano rate, tutti misurati

1. **Chi scriveva solo la rata non otteneva niente.** `titPiano` leggeva solo
   `premio_annuo`, e `titGenera` non rileggeva nemmeno `premio_rata` dal
   database: chi compilava «premio di rata» — che è **il numero che dice la
   compagnia** — si ritrovava la polizza scritta e **nessuna rata**, con un
   avviso 400 ms dopo. Senza rate non esistono gli insoluti, e i soldi non si
   recuperano.

   Dedurre l'annuo qui **non è** la stima vietata da §14 e §36: là è la
   compagnia che manda un importo senza dire che periodo copre, e moltiplicarlo
   sarebbe indovinare; qui è una persona che ha appena scritto «semestrale» e
   «110» nello stesso modulo. E il numero si scrive **nel campo**, visibile e
   correggibile (§8.1) — non dietro le quinte. Quando invece l'annuo non c'è
   proprio (una polizza che arriva con la sola rata), il motore marca
   `annuo_da: 'rate'` e lo dichiara.

2. **Il piano non guardava la scadenza del contratto.** Faceva sempre le rate
   dell'annualità a passi fissi, anche su un contratto di sei mesi: emetteva
   rate che il contratto non copre. Adesso il piano appartiene al **contratto**,
   non a un anno solare fisso — e oltre l'annualità non si emette niente,
   perché il premio annuo è il denaro di **un** anno e le rate successive
   nascono al rinnovo, col premio di allora.

3. **«Non dichiarato» diventava «annuale», in silenzio.** `titRateAnno` tornava
   1 per qualunque frazionamento sconosciuto. Una rata sola è la lettura meno
   sbagliata, ma resta una supposizione: adesso si fa e **si dichiara**.

E il motivo, quando le rate non si possono fare, dice **quale** dato manca:
prima tre cause diverse finivano in «manca la data di effetto o il premio»
(§12, §18).

### Il design di IAM in QUOTO: i gettoni sì, le classi no

Francesco: «l'interfaccia di questa sezione deve essere con il design IAM e non
diversa». La strada che sembrava giusta — portare il kit di IAM in QUOTO, o
estrarlo in un file condiviso come si fa coi motori — **è vietata da due
guardiani**, e vale la pena scriverlo perché la prossima volta si risparmia il
giro:

- `kit-schermate.test.mjs` **pretende** che `.page-head{`, `.d-btn{`, `.d-card{`
  … stiano dentro lo `<style>` in linea di `iam/index.html`. Estrarli in un
  file esterno la fa diventare rossa.
- `fusione-collisioni.test.mjs` conta le classi in comune fra i due documenti e
  sta a **17 su 17, scarto zero**, e quella soglia **può solo scendere**.
  Riscrivere il kit in QUOTO con i suoi nomi porterebbe il conto a 28.

Ma il design di IAM non sta nei nomi delle classi: sta nei **gettoni**. E i
gettoni sono **già condivisi** — QUOTO carica `withus-one-tokens.css`, che è la
fonte unica del marchio. Quindi le classi sono prefissate (`pnu-scheda`,
`pnu-btn`, `pnu-primario`…) e dentro non c'è **nemmeno un colore scritto a
mano**: solo `var(--w1-*)`. Stessa tavolozza, stesso raggio, stessa ombra,
stesso verde. È la strada già presa il 20/09 quando `primario` è nata
`rin-primario` (§40).

**Due gettoni mancavano davvero**, e questo è il pezzo che si rompe in
silenzio: `--w1-card` e `--w1-ombra` non stanno in `withus-one-tokens.css` —
vivono in `withus-one.css`, che QUOTO non carica. Senza, `var(--w1-card)` non
risolve e **la proprietà viene ignorata senza un errore**: la scheda perde il
fondo e nessuno lo dice. Si dichiarano sul contenitore (`.pnu-kit`), non su
`:root` — la tavolozza chiara di una schermata non deve ridipingere il resto
del documento, che è la lezione di §31.

Una prova lo sorveglia: zero colori a mano fuori dal contenitore, i sei gettoni
usati davvero, e **nessun gettone ridichiarato che la fonte unica abbia già**
(sarebbe sovrascrivere il marchio). L'unica eccezione ammessa è `#fff` sul
bottone pieno: il bianco su fondo verde non è una scelta di tavolozza, è
contrasto, e il kit di IAM lo scrive allo stesso modo — vietarlo qui farebbe
divergere i due kit invece di tenerli uguali.

### La voce di menu, senza toccare nessun contratto

`portafoglio:nuova` è una **pagina composta**, la stessa forma già in casa per
`utility:nota` e `anagrafiche:senza-email`: nessun parametro nuovo
nell'indirizzo, nessun id di pagina nuovo, nessuna chiave `prod` — il contratto
del menu (`INTERFACCIA-QUOTO-IAM.md` §2.6) non si tocca. Il suffisso si accetta
**solo se è quello previsto**: un nome che arriva da fuori non diventa mai una
chiamata.

Due cose che sembrano dettagli:
- il modulo si apre **solo** se è stato chiesto. Legandolo al nome semplice
  `portafoglio` si aprirebbe a ogni visita, e c'è una prova che lo misura;
- **il tasto in cima al Portafoglio resta.** Non è un doppione: è la stessa
  porta raggiunta da dove la si cerca, ed è la decisione già presa per
  «Importa» (§15).

### Le rate si vedono prima di salvare

«Deve creare in automatico un titolo da incassare con la data tra sei mesi»:
adesso si **legge** che lo farà, con date e importi veri, in una scheda del
modulo. Scoprirlo da un avviso a polizza già scritta era il modo di accorgersene
tardi.

### Due prove aggiornate nella regola, non nel numero

- «senza data di effetto o premio non si inventa nulla» pretendeva che il motivo
  contenesse `manca` (minuscolo) — e la frase nuova comincia con «Manca». È la
  trappola delle maiuscole già presa in §23. Corretta **e** rafforzata: adesso
  pretende che il motivo dica **quale** dato manca.
- la prova sull'anteprima chiedeva l'avviso «l'annuo viene dalle rate» anche
  quando l'annuo è stato scritto nel campo. Sbagliata: se il numero è nel campo
  **è dichiarato**, perché una persona lo vede e lo corregge. L'avviso resta
  dove serve — sul motore, quando la polizza arriva con la sola rata e nessuno
  ha visto niente.

### Cosa resta aperto

- **`titPiano` resta in pagina come involucro** e le sue prove girano ancora nel
  browser: le regole però stanno nel motore, e lì si provano in Node. Portare
  anche quelle prove sul motore è lavoro a sé.
- **Il modulo non crea il fascicolo documentale** (§11, §40): i requisiti si
  congelano aprendo il fascicolo dal Portafoglio.
- **Il resto di QUOTO non è sul kit**: questa è la prima schermata. Le altre si
  portano una alla volta, come si è fatto in IAM (§31).

---

## 45. La produzione: anno su anno, e con un nome (21/09/2026)

> «per produzione per collaboratore, aggiungi collaboratore id» — Francesco.

Tre richieste in coda arrivate insieme al brief: rifare i «volumi di
portafoglio» come confronto anno su anno, una schermata di dettaglio della
produzione, e **le aggregazioni lato database, non scaricando le polizze nel
browser**.

| pezzo | dove |
|---|---|
| le regole | `tariffe/motore/produzione.js` |
| prove in Node | `server/verifica/produzione.test.mjs` — 12, tre controprove |
| la colonna, gli indici, la vista e la funzione | `supabase/migrations/20260921_produzione_collaboratore.sql` (applicata) |
| il grafico sulla Scrivania | blocco `vol*` in `iam/index.html`, `#vol-card` |
| la schermata di dettaglio | `#panel-produzione` e il blocco `prd*` in `iam/index.html` |
| la voce di menu | `iam/withus-one.js`, Agenzia › Produzione |
| il piano sulle polizze | `Assegnazione.pianoPolizze` + `asgApplica` e `fluConferma` in `index.html` |
| prove sulle schermate | `iam/verifica/volumi-produzione.test.mjs` — 9, che fanno girare il codice |

### La misura, e com'era cambiata dalla sera prima

| | 20/09 sera | 21/09 |
|---|---|---|
| polizze in portafoglio | 484 | **1720** |
| anagrafiche | ~600 | **2536** |
| codici produttore distinti sulle polizze | — | **16** |
| `quote_codici_collaboratore` | 0 righe | **0 righe** |
| `creato_da` distinti sulle polizze | 1 | **1** |

Fra le due misure Francesco ha importato il portafoglio completo. Cambia
tutto: il 20/09 «produzione per collaboratore» non si poteva fare perché non
c'era il dato, il 21/09 il dato c'è ed è ben distribuito — **415, 250, 246,
224, 160 polizze** sui primi cinque codici.

Quello che NON è cambiato è la colonna che conta: `creato_da` è **un solo
utente su tutte e 1720 le righe**, ed è chi ha premuto il tasto
dell'importazione. Attribuire lì vorrebbe dire dare l'intero portafoglio a una
persona sola.

**E la tabella delle decisioni era vuota**: sedici codici sulle polizze, zero
righe dove scrivere chi sono. L'importazione grossa non ha annotato le
evidenze. La migrazione le scrive — `deciso = false`, nessuna persona: **la
domanda, mai la risposta** (§19).

### Perché una colonna sulla polizza, se le rate ce l'hanno già

`quote_titoli.collaboratore_id` esiste dal 18/09 (§17) e ci resta. Non è un
doppione: sono due domande, e confonderle produce numeri credibili e
sbagliati.

> **Sulla RATA**: di chi è questo incasso, quindi a chi spetta la provvigione.
> Sta sulla rata apposta, perché una polizza vive anni e può cambiare mano.
> **Sulla POLIZZA**: chi ha PRODOTTO il contratto. La produzione di un anno non
> cambia quando la gestione passa a un altro — se si leggesse dalle rate, una
> polizza riassegnata a marzo sposterebbe la produzione di gennaio, **e il
> consuntivo di un anno già chiuso cambierebbe da solo.**

`Assegnazione.pianoPolizze` applica alla polizza la stessa decisione, con le
stesse cinque regole: sono le regole della decisione, non del posto in cui si
scrive. Decidere un codice una volta adesso muove **le rate e le polizze**, e
il flusso della notte fa nascere le polizze già col nome giusto — senza quella
riga ogni notte entrerebbero polizze senza produttore anche per i codici
decisi, e il consuntivo tornerebbe da rifare a mano ogni mattina.

### La regola che vale più di tutte: si confronta periodo con periodo

**Mettere dodici mesi dell'anno scorso accanto a nove dell'anno in corso
disegna un crollo che non è successo.** Non è un caso limite: succede undici
mesi su dodici, e il numero sbagliato ha esattamente l'aria di quello giusto.

Il taglio lo fa il database: `iam_produzione_confronto(p_al)` tiene solo i due
anni e taglia il mese in corso **allo stesso giorno in tutti e due**. Sul
portafoglio vero, al 21/09/2026, settembre 2025 passa da 140 a **95** polizze
e settembre 2026 da 144 a **138**: stesso metro.

E la differenza non è un dettaglio di cortesia. Col confronto sbagliato
(2025 intero contro 2026 a oggi) la crescita risulta **+53%**; col confronto
giusto (1 gennaio–21 settembre nei due anni) è **+109%**. In questo caso il
metodo sbagliato *sottostima*, ma il punto non è il verso: è che il numero
dipendeva dal giorno in cui si guardava.

**I mesi dell'anno scorso oltre il mese in corso non si nascondono.** Sono
produzione vera, e vedere quanto c'è ancora da fare entro dicembre serve:
escono marcati `fuori_confronto`, si disegnano in chiaro e **non entrano in
nessun totale**.

### Le somme le fa il database, ed è una richiesta con una ragione

`iam_produzione_confronto` restituisce ventiquattro righe, `iam_produzione_mensile`
qualche centinaio. Nel browser non scende una polizza alla volta: 1720 righe a
ogni apertura della Scrivania sono un programma che si apre lento e che
peggiora ogni mese. C'è una prova che lo misura — legge il sorgente e pretende
che quel blocco **non** chieda `quote_polizze`.

**Tutte e due sono SECURITY INVOKER.** Non sono una scorciatoia intorno alle
politiche: chi non può leggere una polizza non la vede nemmeno sommata,
altrimenti un totale direbbe a un collaboratore quanto ha prodotto l'agenzia.

### Le altre tre regole, tutte già scritte altrove

- **Una polizza senza premio annuo non vale zero** (§36, §42): 182 su 1720 non
  ce l'hanno. Restano fuori dagli importi, si contano a parte e si dichiarano.
- **Da zero non si fa una percentuale**: «da 0 a 5» non è «+500%».
- **«Non si è potuto leggere» non è «non c'è niente»** (§12, §18) — e su un
  grafico di andamento è peggio che altrove: **un grafico piatto si legge come
  un anno andato male**, non come un dato che non è arrivato.

### Il modulo digitato a mano resta

`iam_team.report_volumi`: **nove schede su dodici** hanno volumi digitati, e
coprono esattamente 2025 e 2026 — gli stessi anni del portafoglio. I due
numeri non coincidono (634.843 contro 228.540 sul 2025), ed è il motivo per
cui quella schermata non si spegne: si spegne quando i numeri sono stati
confrontati e tornano, non perché ne è nata una migliore (§17, §33). Accanto
c'è scritto dove stanno gli altri.

### Quattro cose trovate misurando, non ragionando

**1. La trappola dei commenti, dodicesima volta — e stavolta sul guardiano
che la documenta.** `fusione-collisioni.test.mjs` era **rosso su `main` dal
20/09**, e non per una riga di codice sbagliata: il commento CSS scritto ieri
in QUOTO spiegava perché il kit di IAM non si copia, e per spiegarlo nominava
i tre nomi del kit col punto davanti e il nome di un file di prova. In un
foglio di stile un nome col punto **è** un selettore, e un nome di file coi
punti è una catena di selettori: cinque collisioni inventate, contate come
vere. Due correzioni, come sempre — il commento non scrive più quei nomi,
**e** la misura adesso toglie i commenti dai blocchi `<style>` prima di
contare, che è quello che la prova voleva dire dall'inizio. La soglia è scesa
da 17 a **15**: non è stato tolto un doppione, è stata corretta la misura.
(E la prima stesura di quella correzione conteneva la sequenza che chiude un
commento, e il file non si caricava più. §31 vale anche dentro §31.)

**2. Un mese senza produzione non è un mese finito a zero.** La prima stesura
marcava «parziale» il mese in corso solo se il database aveva mandato una riga
per quel mese. Un mese senza nemmeno una polizza non risultava parziale — e un
mese vuoto che sembra finito si legge come un mese andato a zero, che è
un'altra notizia. Il taglio lo decide la data, non la presenza di righe.
L'ha trovato la prova sui cinque fusi orari, non la rilettura.

**3. Una prova che misurava il mondo di ieri.** «Decidere un codice assegna le
sue rate» pretendeva **un** movimento a registro. Adesso ne scrive due, perché
attribuisce anche le polizze. Si è aggiornata la regola e si è rafforzata —
adesso pretende tutti e due i movimenti per nome (§15, §16, §33, §35).

**4. Trappola d'ambiente, nuova.** `toLocaleString('it-IT')` in questo Node
**non raggruppa le migliaia** (`1500,00`), nel browser sì (`1.500,00`). Una
prova che cerca la forma col punto dichiara rotto un codice giusto. Si
accettano tutte e due: quello che conta è il numero, non il separatore.

**5. Un difetto che si vedeva solo passando un giorno.** Lanciando la suite,
`collegamenti.test.mjs` era rosso — e rosso anche su `main`, cioè non per
questo lavoro. Il monitor dei collegamenti (§42) calcolava il «da quanto è
ferma» **sull'orologio della macchina** invece che sull'istante di
riferimento: `confronta` passa quell'istante come numero di millisecondi, e
`quando()` lo dava a `Date.parse`, che prima lo trasforma in stringa —
«1758362400000» non è una data, è NaN, e si prendeva il ripiego `Date.now()`.

In produzione i due coincidono quasi sempre, quindi non si è mai visto. Si è
visto quando una prova scritta ieri, con un istante fisso, è diventata rossa
oggi: **l'unico modo di accorgersene era che passasse un giorno.** È la
famiglia del difetto delle date di §44 — una funzione che chiede l'ora al
computer di chi guarda dà risposte diverse a due persone sullo stesso dato.

E sotto ce n'era un secondo: `riepilogo` contava le compagnie ferme da oltre
un giorno **cercando la parola «giorn» dentro l'etichetta**. Un numero
ricavato da una frase cambia il giorno in cui qualcuno riscrive la frase, e
nessuno collega le due cose. Adesso il conto viene dai millisecondi, che è
quello che quella riga voleva dire. Due prove nuove, due controprove.

### Cosa resta aperto

- **I sedici codici sono tutti da decidere**, ed è il punto: il sistema ha
  finito il suo lavoro quando ha chiesto. Finché nessuno risponde, la
  produzione si legge per codice — che è un fatto vero della compagnia — e non
  per nome. Adesso però si vede quanto pesa ognuno: **415 polizze** sul primo.
- **«Nuova polizza» non chiede chi l'ha prodotta.** Una polizza scritta a mano
  non ha un codice di compagnia, quindi nasce senza produttore. Il campo va
  aggiunto con il componente unico dei collaboratori, che è il punto 4 del
  brief Anagrafiche: farne uno adesso vorrebbe dire scriverne uno da buttare.
- **Le politiche di `quote_polizze` non sono cambiate**: si legge ancora per
  `creato_da`, che è un utente solo. Il giorno in cui un collaboratore dovrà
  vedere «le sue» polizze, la colonna nuova è la strada — ma cambiare chi vede
  che cosa è una decisione, non una conseguenza.
- **La produzione non incrocia le provvigioni**: dice premi e polizze, non
  quanto si è guadagnato. I due motori esistono tutti e due (§17, §28) e
  metterli insieme è un lavoro a sé.

---

## 46. Gestione compagnie: si entra dalla compagnia (21/09/2026)

> «reimplementala tu sopra main» — Francesco, su una patch nata in un'altra
> sessione e mai spinta.

La schermata della M2 (§28) si apriva sulle **tariffe**: il tasto in alto
diceva «Nuova tariffa», e per configurare una compagnia bisognava sapere che
si comincia da una percentuale. La richiesta era l'opposto, ed è quella
giusta: si entra dalla compagnia, e da lì si mettono prodotti e provvigioni.

| pezzo | dove |
|---|---|
| la schermata | blocco `gc*` in `iam/index.html` (12 funzioni) |
| le righe prodotto, una sola volta | `catRigheProdotti`, chiamata dal Catalogo **e** dalla scheda compagnia |
| prove sul sorgente | `iam/verifica/compagnie-provvigioni.test.mjs` (14) |
| prove che fanno GIRARE la schermata | `iam/verifica/gestione-compagnie.test.mjs` — 8 |

### Come è arrivata, e perché non si è presa per buona

La patch veniva da un'altra sessione, in forma di testo: **non era su `main`
né su nessun ramo remoto**, quindi esisteva solo come diff. Applicata sopra
`main` di oggi, 14 hunk su 16 sono entrati da soli; i due rifiutati erano il
numero di versione (scritto contro la 0.12.0) e una riga di `goTab` che il
lavoro di stamattina aveva spostato.

Quello che **non** si è preso per buono sono le prove. Le quattro che la patch
porta leggono tutte il sorgente: cercano il bottone, il nome della funzione,
la forma della chiamata. Sono guardie utili e non bastano — una schermata con
tutti i pezzi al posto giusto può lo stesso disegnare la cosa sbagliata. Le
otto prove nuove la fanno **girare**, con un'anagrafica e un portafoglio
finti, e guardano che cosa esce.

### Una controprova restata verde, e la prova era debole

Tolti gli alias da `gcDiQuesta` — cioè il confronto che fa di «HDI
Assicurazioni» sulle polizze la stessa cosa di «HDI» in anagrafica — **tutte
le prove restavano verdi**. Il codice non era assolto: era il banco a non
vedere la differenza.

`gcCopertura` passa da `Provvigioni.copertura`, che risolve **già** i nomi col
catalogo: quelle righe arrivano a `gcDiQuesta` con il nome corto, e il
confronto esatto basta. Le **tariffe** invece le digita una persona, e può
scriverci il nome che legge sulle polizze. Aggiunta al campione una tariffa
col nome lungo, la controprova diventa rossa.

*Una controprova che non fa diventare rossa nessuna prova non assolve il
codice: accusa la prova* (§15, §17, §18, §19, §41). Qui serviva il banco più
cattivo di §19 — il caso in cui i due comportamenti divergono davvero.

### Il guasto che si vedeva solo da lì

`prv-ov` e `cat-ov` — le finestre delle tariffe e del catalogo — stavano
**dentro i loro pannelli**. Da Gestione compagnie quel pannello è
`display:none`, e una finestra dentro un elemento nascosto è nascosta: il
clic funzionava, il salvataggio pure, e non si vedeva niente. All'apertura
salgono sul `body` (`gcSulBody`), una volta sola: rispostarle a ogni apertura
le toglierebbe e rimetterebbe, perdendo lo stato del modulo dentro.

### Le due regole che non si vedono finché non si rompono

- **Rinominare non stacca niente.** Il nome vecchio diventa un **alias**, e
  tariffe e accordi passano al nome nuovo con un aggiornamento. Senza, una
  rinomina scollegherebbe in silenzio tutta la configurazione di quella
  compagnia — ed è la trappola degli alias di §11 e §28, vista dal lato di chi
  scrive invece che di chi legge.
- **Una compagnia aperta che non c'è più torna all'elenco.** Cancellata da un
  altro, o semplicemente ricaricata: una scheda vuota si legge come un guasto
  del programma.

### Cosa resta aperto

- **Le tariffe restano zero** (§28): la schermata adesso è comoda, ma il primo
  accordo lo scrive una persona.
- **L'elenco «in portafoglio ma non in anagrafica»** oggi porta una riga sola,
  e va guardato dopo ogni importazione nuova: è lì che si vede una compagnia
  entrata col nome scritto in un altro modo.

---

## 47. L'import tutto-o-niente, e il salvataggio che non salvava (21/09/2026)

Due richieste separate che si sono rivelate lo stesso difetto visto da due
parti: **una scrittura che non riesce e non lo dice.**

| pezzo | dove |
|---|---|
| la tabella di appoggio e la funzione | `supabase/migrations/20260921_import_tutto_o_niente.sql` (applicata) |
| il riepilogo, la barra, l'esito | blocco `flu*` in `index.html` (`fluMostra`, `fluAvanza`, `fluConferma`) |
| il dettaglio, che non si apre da solo | `fluDettaglio` / `fluApriDettaglio` |
| il controllo delle righe toccate | `fcTocca` in `index.html`, `pntTocca` in `iam/index.html` |
| prove | blocco «import» e «BUG 1» in `ui-test.mjs` → **485** |

### La misura che ha deciso tutto

Il 21/09/2026, prima di scrivere una riga:

| | |
|---|---|
| anagrafiche entrate fra le 06:33:03 e le 06:36:41 | **2.475** |
| polizze entrate nella stessa finestra | **1.690** |
| rate entrate | **0** |
| verbali a registro | **0** |
| polizze in portafoglio **senza nemmeno una rata** | **1.700 su 1.715** |

Quattromilacentosessantacinque righe in 218 secondi: **diciannove al secondo**,
cioè una chiamata di rete per riga. Poi si è fermato.

**Non è un fastidio di interfaccia.** Una polizza senza le sue rate non ha
insoluti, non entra nello scadenzario delle rate, non produce estratto conto e
non arriva in contabilità: per il sistema quel premio non lo deve nessuno.

### La regola di §14 è stata RIBALTATA, e va detto

Fino a oggi l'ordine clienti → polizze → rate serviva a **reggere**
un'interruzione: quello che era scritto restava e si ricaricava lo stesso file.
Con venticinque polizze era ragionevole — il secondo giro saltava il fatto.

Con milleseicento non regge, per una ragione che si è vista solo succedendo:
**nessuno si accorge di essere a metà.** Il verbale si scriveva alla fine,
quindi non c'è; le polizze ci sono tutte e sembrano a posto; le rate mancanti
non si vedono finché qualcuno non cerca un insoluto.

> Un'importazione a metà **che si dichiara** è recuperabile. Una che **sembra
> finita** è un portafoglio sbagliato di cui nessuno sa il perché.

Adesso o entra tutto o non entra niente, e lo garantisce Postgres con una
transazione, non il codice della pagina che ci prova.

### Perché una tabella di appoggio e non un argomento solo

Il piano di un portafoglio intero pesa qualche megabyte. Passarlo tutto in una
chiamata sola è possibile, e allora la barra non potrebbe dire niente di vero:
una richiesta o è finita o non lo è. Il brief chiede che la barra rifletta il
salvataggio **reale**, quindi il piano sale a blocchi — ogni blocco è una
scrittura confermata dal database — e alla fine **una** chiamata applica tutto
insieme. Quello che si vede avanzare è lavoro fatto.

**Il catalogo resta fuori dal «tutto o niente»**, ed è voluto: il portafoglio è
il lavoro, il catalogo è la sua etichetta (§39, regola 6).

### Il collaudo si è rotto sul posto giusto, e si è dimostrato da solo

Il primo giro della funzione è morto su `tacito_rinnovo`: è `NOT NULL` **con un
default**, e passare un NULL esplicito non fa scattare il default — lo
scavalca. La cosa utile è come è morto: aveva già scritto il cliente, e
morendo ha tirato indietro **anche quello** e il foglio di brutta. Zero righe
rimaste. Il «tutto o niente» si è dimostrato prima ancora di essere provato
apposta.

### BUG 1 — e la ragione per cui non si vedeva

> «Modifico un movimento di cassa e la modifica non resta» — Francesco.

Il codice era **strutturalmente giusto**: `update`, filtro sull'id, errore
controllato. Ed è proprio per questo che il guasto non si vedeva.

> **PostgREST non restituisce un errore quando un update tocca ZERO righe.**

Succede ogni volta che una politica di visibilità filtra via la riga: `error` è
`null`, la schermata non dice niente, l'oggetto in memoria viene aggiornato lo
stesso (`Object.assign`) e la modifica sparisce alla prima rilettura vera. Per
chi lavora è indistinguibile da un salvataggio che non ha funzionato.

Da qui in avanti, **dove si toccano dei soldi si chiede al database di
restituire le righe che ha cambiato e si guarda quante sono**: zero righe non è
un successo silenzioso. E non si fa credere che sia andata — il valore nuovo
non si mostra e il modulo non si chiude, che è la conferma più forte che ci sia.

Toccati: la correzione del foglio cassa e il pagamento della polizza (QUOTO), i
movimenti di prima nota, l'annullamento, la riapertura e il saldo dichiarato
(IAM).

### Due trappole del banco, e una è la stessa due volte

**1. `delete` era un passante.** Il finto database lo ignorava, quindi una
prova che guardava una cancellazione leggeva sempre niente e restava verde
comunque. È lo stesso difetto già corretto su `in()` e `upsert()` (§19).
Adesso la registra.

**2. Un apice inverso dentro il banco.** Il finto database vive dentro un
template literal: un commento che nomina una funzione fra apici inversi chiude
la stringa a metà e il file non si carica più. Ci sono cascato **due volte
nella stessa sessione**, la seconda scrivendo il commento che spiegava la
prima. È §31 — non si scrive il carattere vietato dentro il costrutto che lo
vieta — applicata alle stringhe invece che ai selettori.

**3. Una risposta finta lasciata accesa.** `__COLLAUDO.risposte` non si azzera
fra una prova e l'altra: una risposta d'errore messa per provare il caso
cattivo faceva fallire le due prove successive, e il rosso sembrava loro. Si
spegne dove si accende.

### Cosa resta aperto

- **Le rate perse stamattina non si ricostruiscono dal database**: stanno solo
  nel file della compagnia. Si recuperano ricaricando **quello stesso file**,
  che adesso è atomico e idempotente — le polizze già dentro non si
  riscrivono, entrano solo le rate che mancano.
- **I lotti mai applicati non si puliscono da soli col tempo**: si cancellano
  quando l'importazione riesce o fallisce, ma una scheda chiusa a metà
  caricamento ne lascia qualcuno. Sono invisibili a chiunque altro e non sono
  portafoglio; una pulizia periodica è un lavoro a sé.
- **La causa prima di BUG 1 resta da vedere sul campo**: adesso, quando
  succede, la schermata lo dice — ed è quello che serve per capire su quale
  riga e con quale profilo capita.

---

## 48. Brief Anagrafiche — punto 4: i collaboratori da un elenco solo (21/09/2026)

> «In ogni punto dell'app dove si cerca, seleziona o inserisce un
> collaboratore la fonte deve essere SEMPRE e SOLO la tabella della sezione
> Collaboratori.» — Francesco.

| pezzo | dove |
|---|---|
| le regole | `tariffe/motore/collaboratori.js` |
| prove in Node | `server/verifica/collaboratori.test.mjs` — 8 |
| le tendine di IAM | `colCarica` / `colNome` / `colOpzioniNome` in `iam/index.html` |
| prove sulle tendine | `iam/verifica/collaboratori-fonte-unica.test.mjs` — 4 |

**La mappatura, fatta prima di toccare.** Undici punti in cui si sceglie o si
nomina un collaboratore. Sette leggevano già `quote_collaboratori`; **quattro
no**, e uno dei quattro non era una tendina: era l'email che il cliente riceve,
che cercava «il tuo consulente» in `iam_utenti`.

Misurato sul database, ed è la prova che non era un dettaglio: l'unica
anagrafica che ha un intermediario di riferimento ce l'ha in
`quote_collaboratori` e **non** in `iam_utenti`. La lettura sbagliata non
trovava niente, ripiegava su «chi ha creato il preventivo», e **il cliente
leggeva il nome di un altro** — che è esattamente il guasto che quel codice
diceva di aver corretto.

`iam_utenti` sono gli **account** (cinque righe, quelle con una password),
`quote_collaboratori` sono le **persone** (diciassette). Chi non ha un accesso
a IAM — la maggioranza — non compariva in nessuna delle tre tendine.

**La condivisione resta sugli account, ed è giusto**: si condivide con chi può
entrare in IAM, non con chi è in anagrafica. Due domande diverse, due elenchi
diversi, e la prova lo sorveglia.

**Una tendina non perde il valore che sta guardando.** `iam_trattative.collab`
è testo libero, scritto «Nome Cognome»; il registro compone «Cognome Nome».
Cambiare la fonte senza accorgersene avrebbe staccato le righe già scritte:
il valore che una riga ha resta in elenco, marcato «scritto a mano», finché
qualcuno non sceglie di nuovo. Una tendina che perde il proprio valore lo
cancella al primo salvataggio, e nessuno se ne accorge.

**Il filtro della produzione ha cambiato fonte e non significato.** Lavora su
`creato_da`, che è un account: i nomi arrivano dal registro, il **valore** resta
`iam_id`. C'è una prova, perché è il difetto che si fa cambiando una tendina.

**L'abbinamento del testo libero aggancia solo se è UNA** (§19, regola 5).
«Francesco» con due Francesco in agenzia non si abbina: si elenca. Un
abbinamento sbagliato qui è una trattativa attribuita a chi non l'ha fatta.

---

## 49. Brief Anagrafiche — punto 3: il codice produttore ha un periodo (21/09/2026)

Il codice produttore («U25274») è della **compagnia**, non della persona. Un
collaboratore se ne va a giugno e la compagnia riassegna quel codice a un altro
da luglio: fino a ieri la decisione presa una volta valeva per sempre, e
avrebbe attribuito a chi è andato via tutto quello che l'altro produce da
domani. Non è un fastidio di interfaccia — sono **provvigioni pagate a chi non
doveva**.

| pezzo | dove |
|---|---|
| le regole | `Assegnazione.valeIl` in `tariffe/motore/assegnazione.js` |
| prove in Node | `server/verifica/assegnazione.test.mjs` — **42** (erano 35) |
| le tre colonne, con il rollback | `supabase/migrations/20260921_codici_periodo_e_attivo.sql` (applicata) |
| la sezione nella scheda | `ccpRigaSua`, `ccpModifica`, `ccpSalvaPeriodo`, `ccpSospendi` in `iam/index.html` |
| il produttore nel dettaglio polizza | `polProduttore` in `index.html` |
| prove | `iam/verifica/codici-compagnia.test.mjs` (18), blocco «punto 3» in `ui-test.mjs` (**487**) |

### Le quattro regole, e che cosa impedisce ognuna

1. **Un vuoto non è una chiusura.** Periodo non dichiarato = l'abbinamento vale
   sempre. È l'unica lettura che non inventa niente (§8.1) e l'unica che non
   cambia il significato delle sedici righe già scritte: leggere un vuoto come
   «chiuso» spegnerebbe tutti gli abbinamenti in un colpo solo, **in silenzio**.
2. **La data che si guarda è quella della POLIZZA, non oggi.** Una polizza
   appartiene a chi teneva il codice **quando è stata prodotta**. Con «oggi» un
   abbinamento chiuso a giugno toglierebbe a quella persona anche le polizze di
   marzo, che sono sue — è la regola del fascicolo congelato (§11, regola 4)
   applicata alle provvigioni.
3. **La rata segue la data della sua polizza, non la propria decorrenza.** Una
   rata è di chi ha prodotto il contratto, non di chi tiene il codice il giorno
   in cui scade. Guardando due date diverse, la polizza finirebbe a uno e le sue
   rate a un altro, e i due numeri non tornerebbero mai.
4. **Con un periodo e senza data non si indovina.** Da che parte del confine
   stia una polizza senza effetto non lo sa nessuno: si lascia da decidere e si
   dice perché.

### Sospendere e togliere sono due cose diverse

**Sospeso** = «non produce più, ma è stato suo»: la persona resta scritta, e il
codice smette di assegnare lavoro nuovo. Serve quando si sa che il codice non è
più suo e non si sa ancora di chi sia. **Tolto** = «non è suo»: il codice torna
fra quelli da abbinare. Un bottone solo costringerebbe a scegliere alla cieca,
e la differenza è scritta nelle due conferme.

In tutti e due i casi **quello che è già assegnato resta dov'è**: il dato sta
sulla rata e sulla polizza, non qui (§19).

### Due difetti che ha trovato la prova, e il secondo era il peggiore

**`upsert` riscrive la riga intera** (§19). `rigaDecisione` non ripassava
`note`: abbinare un codice **cancellava già oggi** quello che qualcuno ci aveva
scritto accanto. Sedici righe su sedici sono senza note, perciò non si è perso
niente — ma è il tipo di guasto che si scopre il giorno in cui la nota serviva.

E il dente più lungo: **togliere la decisione azzera sospensione e periodo, la
nota no.** Sospensione e periodo qualificano *un* abbinamento, non il codice.
Portandoli avanti, un codice tolto a Tizio perché è passato a Caio
**rinascerebbe già sospeso** addosso a Caio — e le sue polizze non si
assegnerebbero mai, senza un errore e senza che nessuno capisca perché. Le
evidenze del flusso restano invece, perché servono proprio a chi dovrà
riabbinarlo, e la nota con loro: è scritta da una persona per la persona dopo.

### Il produttore non risolto adesso si vede

Il brief: «se non trovi il codice, segnalalo invece di lasciare il campo vuoto
senza avviso». Nel dettaglio polizza il produttore ha ora **cinque** risposte,
e le due nuove sono quelle che prima mentivano:

- l'abbinamento **non copre** la data di questa polizza → si scrive il codice e
  il motivo, **non il nome**. «Lui» sarebbe falso; «non assegnato»
  nasconderebbe che una decisione esiste;
- il codice **non è associato** a nessuna persona → si dice, e si dice dove si
  abbina.

Tutte e due con il richiamo giallo, perché una riga qualunque non la guarda
nessuno.

### Quello che questa tabella non può fare, ed è scritto nella migrazione

La chiave primaria è la coppia (compagnia, codice): **una riga per codice,
quindi un padrone per codice.** Il periodo dice fino a quando *quell'*
abbinamento vale, non tiene lo storico dei padroni che si sono succeduti. Per
una storia completa servirebbe una riga per periodo, cioè un'altra chiave
primaria: è un lavoro a sé, e si fa se e quando un codice cambia mano davvero.

### Una prova verde per sbaglio, e si è scoperto spegnendo una risposta finta

«M5 · la correzione del movimento…» era verde perché si reggeva sulla
**risposta finta lasciata accesa da una prova centocinquanta righe più su**:
senza, l'update non ha righe da restituire e la correzione risulta non salvata
(è il controllo di BUG 1, §47). Se n'è accorta una prova nuova che quella
risposta la spegneva. *Una risposta finta non spenta cammina nelle prove dopo,
e quando qualcuno la spegne diventa rossa una prova che non c'entra niente.*
È la stessa trappola già annotata in §19 e §42, dal lato opposto.

### Cosa resta aperto

- **Nessun periodo e nessuna sospensione sono ancora dichiarati** (misurato
  dopo la migrazione: 16 righe, tutte attive, 0 con date, 0 decise). È il
  punto: il sistema conta e non giudica finché nessuno decide.
- **Il confronto con la compagnia della polizza è esatto**, non passa dagli
  alias (§11): «HDI Assicurazioni» sulla polizza e «HDI» in tabella non si
  ritrovano. Sul portafoglio vero c'è una compagnia sola e non si vede; va
  guardato prima del secondo flusso.

---

## 50. Brief Anagrafiche — punto 1: il contatore che contava le righe caricate (21/09/2026)

> «Il contatore delle anagrafiche è sbagliato.» — Francesco.

**Misurato sul database prima di toccare qualsiasi cosa: 2.536 anagrafiche,
di cui 29 lead e 2.507 clienti. La schermata diceva 50.**

| pezzo | dove |
|---|---|
| le condizioni, in due lingue | `Anagrafica.VISTE` in `tariffe/motore/anagrafica.js` |
| prove in Node, col valutatore | `server/verifica/anagrafica.test.mjs` — **11** (erano 8) |
| i contatori della lista | `anagConta`, `anagQuanti`, `anagRicerca`, `anagPiede` in `index.html` |
| i due buchi della Scrivania | `quantiClienti` in `caricaDaFareOggi`, `iam/index.html` |
| prove | blocco «punto 1» in `ui-test.mjs` (**488**), `iam/verifica/da-fare-oggi.test.mjs` (15) |

### La causa, e perché non si vedeva

`cercaAnagrafica` carica **i cinquanta più recenti** — ed è giusto, nessuno
scorre duemila righe. I tre contatori si contavano su `ANAG_CACHE.length`.

> **Un elenco non è un conteggio.** Un numero preso dalle righe caricate non
> conta quello che c'è: conta quello che si è avuto voglia di scaricare — e
> guardandolo non c'è modo di accorgersene. Non dà un errore: dà un numero più
> piccolo, credibile, e più basso del vero.

Gli stessi due numeri sulla Scrivania di IAM avevano la stessa malattia in una
forma più insidiosa: `.select(...)` senza limite, ma il server ne manda **al
massimo mille per richiesta**. Nessun `limit` scritto da nessuna parte, e un
tetto che non si vede nel codice.

### Le condizioni esistono in due lingue, e stanno accanto

Contare sul server vuol dire scrivere ogni condizione due volte: il predicato
che la lista applica in memoria e il filtro che il server capisce. **Due
scritture della stessa regola sono due regole**, e qui produrrebbero un
contatore che non torna con la sua lista — cioè lo stesso guasto, in una forma
nuova. Quindi stanno una riga sotto l'altra in `VISTE`, e una prova le fa
girare tutte e due sulle stesse righe pretendendo la stessa risposta (un
piccolo valutatore della sintassi PostgREST vive **nella prova**, non nel
motore: in produzione non lo chiamerebbe nessuno, §1).

Quello che quella prova **non** dimostra è che PostgREST legga quelle stringhe
come le legge il valutatore. Quello si è misurato a mano contro l'API vera,
filtro per filtro: `200` con le quattro condizioni, `400` con una colonna
inventata come controllo negativo.

### Le condizioni si scrivono in positivo, e il complemento si sottrae

Il server non sa negare un gruppo di condizioni senza contorsioni. Quindi si
conta **chi ce l'ha** (`con_email`, `con_consenso`) e si sottrae dal totale:
una sottrazione non può divergere da se stessa, mentre una seconda condizione
scritta al contrario sì.

### Due regole diventate una

- **Che cos'è un lead**: la colonna `lead`. Il marcatore `LEAD` scritto nelle
  note non si guarda più — misurato: **una sola riga** in tutto l'archivio ce
  l'ha, e non è fra i clienti. Toglierlo non cambia un numero e lascia un modo
  solo di essere un lead invece di due.
- **Che cos'è un consenso valido**: la colonna `consenso_marketing` **oppure**
  la privacy firmata con la spunta. IAM guardava solo la seconda — una seconda
  regola, che avrebbe contato fra i buchi chi il consenso l'aveva dato allo
  sportello. Oggi coincidono per caso (4 consensi, tutti da privacy firmata):
  domani no.

### «Ne vedi 50 su 2.507»

Senza quella riga sotto l'elenco, una lista che si ferma a cinquanta e un
contatore che dice duemilacinquecento si leggono come un guasto — e chi cerca
qualcuno smette di cercare credendo che non ci sia. Compare **solo** quando i
due numeri non coincidono: dirlo sempre sarebbe rumore che si impara a saltare.

E quando il conteggio non riesce i contatori mostrano `·`, non un numero: «non
si è potuto contare» non è «non ce n'è» (§12, §18), e qui ripiegare sulle righe
caricate vorrebbe dire rimettere esattamente il difetto appena tolto.

### Il banco non vedeva due metodi su due

`select()` e `or()` erano **passanti** nel finto database: una prova che
guardava *quale* conteggio il codice stesse chiedendo leggeva sempre niente e
restava verde comunque. È lo stesso difetto già corretto su `in()`, `upsert()`
(§19) e `delete()` (§47), un metodo più in là. Adesso `select(colonne, opzioni)`
dice che è un conteggio, `or()` dice con che condizione, e le risposte si danno
per condizione.

**E l'apice inverso dentro un commento del banco ha fatto saltare il file per
la terza volta.** Il banco vive dentro un template literal: un nome di funzione
scritto fra apici inversi lo chiude. Annotato qui perché è successo tre volte,
e due di quelle scrivendo il commento che spiegava la volta prima.

---

## 51. Brief Anagrafiche — punto 2: «Compleanni di oggi» va in Marketing (21/09/2026)

Il riquadro nasce il 19/09 in cima alla pagina Clienti (§23). Sta meglio dove
si decide **che cosa si manda ai clienti**: in Campagne, che nel menu di IAM è
la voce Marketing › Campagne email.

| pezzo | dove |
|---|---|
| il contenitore | `#cpl-oggi`, adesso in `#page-campagne` (era in `#page-anagrafiche`) |
| chi lo riempie | `loadMarketing()` (era `initAnagrafiche()`) |
| le regole | invariate: blocco `cpl*` e `Anagrafica.delGiorno` / `contattabile` / `testoAuguri` |
| prove | blocco «punto 2» in `ui-test.mjs` (**489**) |

**Spostare una schermata vuol dire spostare tre cose**, e la terza è quella che
si dimentica: il contenitore, chi lo riempie, e **chi non deve più riempirlo**.
Lasciare indietro la terza è il difetto più silenzioso di tutti — la pagina
Clienti avrebbe continuato a leggere l'anagrafica intera a ogni apertura per
scrivere dentro un `div` che non esiste più. Nessun errore, solo una lettura in
più per sempre. C'è una prova, e la controprova la fa diventare rossa.

**Sta in cima e non in fondo**: un compleanno è l'unica cosa di quella pagina
che scade. Una campagna si prepara quando si vuole; gli auguri si fanno oggi, e
in fondo alla pagina si leggono domani.

**In Anagrafiche non resta niente** — né un riquadro vuoto né un rimando: un
rimando a una schermata che sta altrove è il doppione che si voleva togliere.

> **E cambia chi può usarlo, ed è la cosa da sapere.** La pagina Clienti la
> vede chiunque entri nel preventivatore; **Marketing è dietro il cancello
> `lab_abilitato`** (o super-admin), letto dal pulsante `nb-marketing` della
> scocca. Quindi un collaboratore senza Marketing abilitato **non vede più i
> compleanni**. Non è un effetto collaterale nascosto in una riga: è la
> conseguenza diretta di dove il brief chiede di metterlo, e si ribalta
> abilitando Marketing a chi serve — oppure riportando il riquadro indietro,
> che è una riga di HTML e una chiamata.

---

## 52. «Volevo un grafico, non un indicatore» (21/09/2026)

> «Per la dashboard ti avevo detto che volevo un grafico no un indicatore»
> — Francesco.

Aveva ragione due volte, e la prima è quella che conta più di tutto il resto.

### La causa prima: online c'era la 0.14.0

Misurato su `quoto.withusassicurazioni.it` prima di toccare qualsiasi cosa:
`app-versione 0.14.0`. Il grafico nasce con la **0.15.0** (§45) e viveva in una
PR **ancora aperta** insieme ad altri quattro rilasci. Sulla Scrivania, in
produzione, c'era soltanto `#kpi-riga` — i tre riquadri di numeri — perché è
l'unica cosa che `main` aveva.

> **Non stava guardando un grafico fatto male: stava guardando il posto dove il
> grafico non era ancora arrivato.** È §2 in una forma nuova — il lavoro non
> sparisce nei rami, ma finché la PR non è fusa non è vivo. E chi lavora non
> vede una PR: vede una schermata.

### La seconda: anche pubblicato, era una fila di indicatori

`volHTML` apriva con `vol-testa` → tre riquadri di numeri grandi (2026 a oggi,
2025 stesso periodo, Differenza) e metteva sotto un `vol-graf` alto 190 pixel
con **ventiquattro barre larghe al massimo sedici pixel**. Su un telefono sono
trentadue pixel per mese, cioè due barre da otto: illeggibili. La scheda si
chiamava «grafico» ed era un cruscotto di cifre con una decorazione sotto.

| pezzo | dove |
|---|---|
| il grafico | `volHTML`, `volDettaglio`, `volK`, `volMese` in `iam/index.html` |
| lo stile | blocco `.vol-*` nel `<style>` di `iam/index.html` |
| la regola che marca i mesi non arrivati | `confronto` in `tariffe/motore/produzione.js` |
| prove | `produzione.test.mjs` (13), `volumi-produzione.test.mjs` (13) |

**Adesso**: due serie ad area in SVG disegnato a mano — l'anno scorso in
grigio, quest'anno in verde sopra. Dodici punti invece di ventiquattro barre.
La risposta si legge senza numeri: **dove il grigio spunta sopra il verde,
quel mese è andato peggio dell'anno scorso.** Il riepilogo è **una riga**, non
tre riquadri, e il grafico sta **sopra** la riga di indicatori.

### Due trappole dell'SVG che si pagano se si dimenticano

`preserveAspectRatio="none"` fa stirare il disegno nel contenitore, ed è quello
che serve per un grafico che deve riempire una scheda di larghezza qualunque.
Ma stira **tutto**: dentro l'SVG non ci va nessun testo (le etichette stanno in
HTML, fuori) e le linee portano `vector-effect="non-scaling-stroke"`, altrimenti
si stira anche il loro spessore e la curva diventa più grassa in orizzontale che
in verticale.

### Tre difetti trovati facendo girare il motore sui numeri VERI

Non dalla rilettura: stampando le altezze che la Scrivania avrebbe disegnato
sul portafoglio dell'agenzia (2025 contro 2026, 348.193 € contro 128.875 €).

1. **Uno zero e 300 € disegnavano la stessa barra.** L'altezza aveva un minimo
   fisso del 2%: gennaio 2025 (nessuna polizza) e febbraio 2025 (300 €)
   finivano allo stesso pixel. Adesso uno zero sta sulla linea di base.
2. **I mesi non ancora arrivati avevano una barra.** Ottobre, novembre e
   dicembre 2026 disegnavano una barra verde al 2% accanto alla barra grigia
   alta di ottobre 2025 (61.515 €): si legge come un **crollo verticale**, e
   invece è un mese che non c'è ancora. Adesso la curva dell'anno in corso si
   **ferma**, e quella dell'anno scorso prosegue tratteggiata.
3. **E il marcatore non arrivava sempre.** Il motore accendeva
   `fuori_confronto` solo dove il database aveva mandato una riga: un mese in
   cui *nessuno dei due anni* aveva prodotto niente non risultava «non ancora
   arrivato», e la curva ci passava dentro a zero. **È lo stesso ragionamento
   già scritto una riga più sotto per il mese parziale** — «prendere il segno
   solo dalle righe vuol dire che un mese senza una polizza non risulta
   parziale» — e non era stato applicato qui. Il taglio lo decide la data.

### Il numero esatto si legge col dito

Il tooltip nativo (`title`) funziona col mouse e **non esiste sul telefono**,
che è dove IAM si guarda metà delle volte. Ogni mese è un bottone vero e il
numero compare sotto, in parole — ed è lì che i **tre zeri restano tre**:
«non è ancora arrivato» per il mese che non c'è, «premio non noto · 3 polizze»
per il mese le cui polizze un premio non ce l'hanno, e zero per il mese in cui
non è successo niente. Scrivere «0,00 €» sul secondo sarebbe il numero
credibile e falso (§8.1).

### Una trappola nuova: l'accento scritto come carattere combinante

Le stringhe nuove erano state scritte con `e` + U+0300 (accento combinante)
invece di `è` (U+00E8). **Si vede identico** e non combacia con niente: la
prova cercava «non è ancora arrivato» e non lo trovava, su un testo che sullo
schermo diceva esattamente quello. Sette occorrenze nel blocco, corrette
normalizzando in NFC.

> Un carattere che si vede giusto e non è quello che sembra costa mezz'ora, e
> nessun rosso dice che cos'è: dice solo che la stringa non c'è.

### Quello che NON si è tolto

I tre riquadri di indicatori restano, sotto il grafico: rispondono a domande
che il grafico non fa (quanto portafoglio ho in gestione, quanto converto), e
il 4/8/2026 erano stati tolti per un motivo diverso — ripetevano i numeri di
«Da fare oggi» (§42, punto 10). Qui non si ripete niente: si cambia l'ordine.

---

## 53. Tre scritture che non riuscivano, e nessuna lo diceva (21/09/2026)

Tre segnalazioni arrivate a distanza di minuti, e sotto avevano la stessa
forma: **una cosa che non funziona senza dare un errore che si possa capire.**
Nessuna delle tre si vedeva guardando il codice: si sono viste misurando.

| pezzo | dove |
|---|---|
| la terza credenziale del server | `chiaviRest` in `server/archivioVps.js` |
| il vocabolario unico dei mezzi | `MEZZI` in `tariffe/motore/contabilita.js` |
| i mezzi doppi e le polizze senza rate | `mezziInConflitto` e `anomalie` nello stesso motore |
| il conteggio delle polizze scoperte | `supabase/migrations/20260921_polizze_senza_rate.sql` (applicata) |
| l'allineamento dei conti già configurati | `supabase/migrations/20260921_mezzi_conti_allineati.sql` (applicata) |
| emissione e incasso nel foglio cassa | `movimenti` / `totali` / `quadrature` in `tariffe/motore/foglio-cassa.js` |
| la lettura che non si ferma a mille | `fcLeggiTutte` in `index.html` |
| prove | `archivio-vps` (13), `contabilita` (48), `foglio-cassa` (7), `ui-test.mjs` (**492**) |

### 1. «Caricamento non riuscito: No API key found in request»

Il modulo dell'archivio cifrato (§15) fa **due** controlli all'avvio — la
chiave di cifratura e la cartella — e se uno manca si spegne, risponde 503 e
dice il nome della variabile. È la regola scritta allora, ed è giusta.

Le credenziali che servono però sono **tre**: per scrivere i metadati serve
anche la chiave con cui si parla col database. Quella non era controllata.
Misurato nell'ambiente del processo sul VPS (mai i valori, solo i nomi e le
lunghezze): `ARCHIVIO_CHIAVE` c'era, `ARCHIVIO_DIR` c'era,
**`SUPABASE_ANON_KEY` non esisteva**. E nei log del server, all'orario esatto
del tentativo di Francesco, la riga che chiudeva il caso.

> **Una regola applicata a metà è peggio di una regola assente**: il modulo
> partiva acceso, prendeva in carico il file, e falliva all'ultimo passo con
> un errore di PostgREST che parla di header HTTP. Chi lavora non può
> interpretarlo, e l'avviso della pagina **indovinava** una causa sola
> («se parla di ARCHIVIO_CHIAVE…»), mandando a guardare nel posto sbagliato.

Due correzioni. Il controllo d'avvio adesso sono tre, e il messaggio dice
quale manca. E l'avviso della pagina non indovina più: dice che il nome della
configurazione mancante sta nel messaggio del server.

**Perché la chiave ANONIMA e non quella di servizio**, che sul VPS c'era: i
metadati si leggono e si scrivono col token di chi chiede, e Supabase vuole
`apikey` **accanto** al token. Con la chiave di servizio, un token assente o
malformato non farebbe fallire la richiesta — la farebbe passare come
servizio, scavalcando le politiche. Cioè esattamente la regola che quel
modulo esiste per applicare (§15).

Il controllo si fa **solo quando si userà la strada vera**: nelle prove i due
accessi sono iniettati, e pretendere lì delle variabili d'ambiente avrebbe
fatto diventare rosso il banco *per la strada* invece che per il contenuto
(§4).

### 2. `contante` ≠ `contanti`, e la cassa era inerte per costruzione

Francesco aveva configurato i conti: sei, fra cui una «CASSA CONTANTI» con la
spunta sui contanti. Misurato subito dopo:

| dove | la chiave dei contanti |
|---|---|
| il vincolo `CHECK` di `quote_titoli` e `quote_polizze` | **`contante`** |
| `Flusso.MEZZI`, `TIT_MEZZI` | `contante` |
| **`Contabilita.MEZZI`** (nato il 20/09, §32) | **`contanti`** |

Due chiavi su nove divergevano (l'altra: `rid` contro `domiciliazione`), e una
delle due era **proprio quella dei contanti** — il solo mezzo `immediato`, il
solo che fa muovere il conto lo stesso giorno.

Conseguenza, senza un errore e senza niente di rosso: `destinoIncasso` non
ritrovava quella chiave e rispondeva «non si sa»; e la spunta «Contanti» su un
conto **non poteva incrociare nessuna rata**, perché quella parola su una rata
il database non la ammette. *La configurazione era fatta bene ed era inerte.*

> **Il vocabolario che comanda è quello del vincolo del database**, perché è
> l'unico che non si può cambiare senza riscrivere righe già scritte (1.720
> polizze, 55 rate). Le etichette si traducono, le chiavi no.

E c'era un **quarto** elenco, il più rotto: la tendina «Come paga» di «Nuova
polizza» (§44) era scritta a mano e portava **tre** chiavi che il vincolo
rifiuta. Chi le sceglieva non otteneva un campo sbagliato: otteneva una
polizza che **non si salvava**. Adesso quella tendina si costruisce
dall'elenco, e il guardiano confronta **cinque** posti — la migrazione, i due
motori, la tendina dei Titoli e quella di Nuova polizza — pretendendo le
stesse chiavi.

Il guardiano legge le chiavi dagli **oggetti**, non dal sorgente: un commento
che nomina una chiave vecchia per spiegare perché è stata tolta lo farebbe
diventare rosso su un codice giusto. È la trappola dei commenti (§10, §12,
§18, §26, §29, §31, §33, §34, §37, §41, §42), evitata invece che subita.

### 3. Tre anomalie che il sistema non sapeva dire

Misurato sulla configurazione vera, e ognuna era un lavoro fatto che non
serviva a niente:

- **due conti dichiaravano tutti e due i contanti.** La regola (§32) dice che
  in quel caso non si sceglie per somiglianza e si scrive «non si sa» — giusto
  — ma nessuno lo diceva a chi aveva appena finito di configurare. Il risultato
  è il peggiore dei due mondi: il lavoro è stato fatto e gli incassi restano
  fermi lo stesso. Adesso `mezziInConflitto` lo dice **mentre si configura**,
  non quando arriva una rata;
- **«CASSA CONTANTI» era di tipologia `altro`.** Il fondo cassa somma le
  tipologie `cassa` e basta (§33): un conto che si chiama così ma è
  classificato in un altro modo non ci entra, e il fondo resta a zero senza
  che si capisca perché. Non si corregge da soli — cambiare la natura di un
  conto è una decisione contabile — si dice;
- **1.700 polizze su 1.720 non hanno nemmeno una rata**, per **574.264,61 €**
  di premio annuo. Sono quelle dell'importazione interrotta (§47).

Perché quest'ultima sta fra le anomalie della *contabilità* e non del
portafoglio: una polizza senza rate non ha insoluti, non entra nello
scadenzario delle rate, non produce estratto conto e non arriva in
contabilità — **per il sistema quel premio non lo deve nessuno.** È una voce
che manca, non un dettaglio.

Il conto lo fa il database e torna una riga (`iam_polizze_senza_rate`,
SECURITY INVOKER): 1.720 polizze non si scaricano nel browser per contarle
(§45). Se la lettura non riesce resta `null` e l'anomalia **non compare**:
«non si è potuto contare» non è «non ce ne sono» (§12, §18), e su una
schermata di anomalie è la bugia peggiore.

### 4. Il foglio cassa guarda anche la data di emissione

> «Ho inserito una polizza e non mi risulta nel foglio cassa. Deve far testo
> la data emissione. Inoltre per la parte dell'incasso può avere anche una
> data diversa» — Francesco.

Misurato: la polizza (Allianz, inserita a mano) ha `data_emissione` di oggi e
una rata **non incassata**; `fcCarica` leggeva `.eq('stato','incassato')`.
Non era un guasto — era che il foglio sapeva leggere **una data sola**.

Sono due domande diverse e adesso il foglio dice sempre a quale sta
rispondendo:

| lettura | che cosa mostra |
|---|---|
| **emissione** (di partenza) | che cosa si è **prodotto** nel periodo, comprese le rate non ancora pagate |
| **incasso** | che cosa è **entrato** nel periodo. È la lettura che serve a quadrare la cassa |

**I due totali non si sommano mai.** «Premi emessi» e «di cui incassati» sono
due tessere, e una somma sola direbbe che in cassa ci sono dei soldi che il
cliente non ha versato — un numero credibile e falso, e la quadratura lo
troverebbe sbagliato senza saper dire da dove viene. C'è una prova che
pretende che *incassato + da incassare = emesso*: se un giorno non tornasse,
vorrebbe dire che una riga è finita in tutti e due o in nessuno dei due.

**Le provvigioni restano solo sull'incassato** (§17, decisione 1), e il foglio
lo scrive: una rata emessa e non pagata non ha prodotto niente per nessuno.
**Le quadrature restano sugli incassi** anche guardando per emissione — in
cassa una rata non incassata non c'è — e il filtro sta dentro `quadrature`,
non in chi chiama: i posti che la chiamano sono tre (schermata, Excel, PDF), e
tre controlli scritti a mano sono tre occasioni di dimenticarne uno.

**Una polizza senza data di emissione non si colloca indovinando dall'effetto**
(§21): si emette prima che decorra, e una data indovinata conta la riga nel
mese sbagliato. Resta fuori, e il vuoto lo dice.

Il selettore **non ricalcola mentre si sceglie**: è un campo da riempire come
gli altri, e aspetta il clic su Cerca (§22). La prima stesura aveva un
`onchange`, e la prova di M2.2 l'ha preso nello stesso giro.

### 5. `.limit(5000)` su un server che ne manda mille

Trovato lavorando sul punto 4, ed era vivo da quando il portafoglio è cresciuto:
`fcCarica` chiedeva `.limit(2000)` sulle polizze e `.limit(5000)` sulle rate.
PostgREST ne manda **mille** per richiesta (§50).

> Con 1.720 polizze il foglio cassa ne caricava 1.000 e **scartava in silenzio
> le rate delle altre 720**: degli incassi sparivano dalla cassa senza che
> nessuna riga lo dicesse. È «un elenco non è un conteggio» (§50) applicato ai
> soldi — e un `limit` più grande non è una correzione, è la stessa cosa
> scritta con un numero diverso.

Adesso si pagina finché una pagina torna piena. Il tetto esiste, è dichiarato,
e quando si raggiunge **la schermata lo scrive**: «questi totali sono
parziali». Una prova fa girare la funzione con un finto server da 2.400 righe
e ne pretende 2.400 distinte in tre pagine; la controprova (una pagina sola)
la fa diventare rossa con «righe lette: 1000».

### Cosa resta aperto

- **Le rate perse si recuperano solo ricaricando il file della compagnia**
  (§47). Fino ad allora l'anomalia resta rossa, ed è giusto che lo sia.
- **«CASSA CONTANTI» è ancora di tipologia `altro`**: il sistema lo dice, la
  correzione è una decisione contabile e la prende una persona.
- **Nessun conto ha l'IBAN e nessuno è quello delle rimesse** (§34): gli
  estratti conto escono senza coordinate, e lo dichiarano.
- **Il foglio cassa non ha ancora un «nuovo movimento a mano»**: un incasso
  nasce nella pagina Titoli e il foglio lo legge (§25).

### 53-bis. Il secondo ostacolo, e la regola che li unisce (21/09/2026)

Tolta la credenziale mancante, il caricamento ha fatto un passo e si è fermato
un metro più avanti:

```
EACCES: permission denied, mkdir '/var/lib/withus/archivio/41/d6'
```

Misurato sul VPS, e la causa è il classico permesso sul ramo invece che sulla
foglia:

```
drwx------  3 root   root   /var/lib/withus            ← withus non la attraversa
drwx------  2 withus root   /var/lib/withus/archivio   ← questa era già sua
```

Il servizio gira come `withus` e **non riusciva ad arrivare alla propria
cartella**. Corretto sul server (`chown withus:withus` sul ramo e sulla
foglia, `chmod 700` su tutte e due: solo il servizio entra).

**Ma il difetto vero era nel codice**, ed è la terza volta nella stessa
giornata che si presenta con la stessa faccia:

| controllo | guardava | non guardava |
|---|---|---|
| le credenziali del database | che il modulo avesse una chiave di cifratura | che avesse **anche** quella per il database |
| il vocabolario dei mezzi | che le due liste esistessero | che dicessero le **stesse** chiavi |
| la cartella dell'archivio | che il percorso fosse **nel posto giusto** | che ci si potesse **scrivere** |

> **Un controllo d'avvio che non PROVA la cosa che deve garantire non è un
> controllo: è una dichiarazione di intenti.**

`cartellaScrivibile` adesso crea una sottocartella e ci scrive un file, con gli
stessi permessi di un caricamento vero, e poi ripulisce. Costa due millisecondi
all'avvio. C'è una prova che controlla anche che **non lasci residui**: una
cartella di prova dimenticata a ogni riavvio è spazzatura che si accumula
dentro l'archivio dei documenti.

#### La riga che restava indietro

`archivioVps.js` scrive **prima la riga dei metadati, poi il file**, e il
commento spiegava perché: *«una riga senza file si vede subito — il documento
non si apre — ed è recuperabile»*.

È vero solo se qualcuno la va a recuperare. Nei fatti, alle 15:44 del
21/09/2026, in due minuti è nata una riga così: nel fascicolo del cliente
compariva **«Certificato Galfano Vito.pdf»**, che si vedeva, si cliccava e non
si apriva. Cioè un documento che **sembrava esserci** — che è peggio di uno che
manca, perché nessuno lo ricarica.

Adesso vale la regola dell'importazione (§47): **o entrano tutti e due o non
entra niente.** Se il file non si salva, la riga si toglie — col token di chi
sta caricando, non con la chiave di servizio: la pulizia non è una scorciatoia
per scavalcare le politiche. E se nemmeno la pulizia riesce (rete che cade a
metà) **si dice in faccia**, perché restare in silenzio sarebbe la stessa bugia
un piano più in là.

L'ordine delle due scritture **non è cambiato** ed è ancora quello giusto: un
file cifrato senza la sua riga non è di nessuno, e nessuno lo andrà mai a
cancellare.

#### Una trappola del banco

`fs.promises` è un **getter**: `Object.assign(Object.create(fs), { promises: … })`
solleva *«Cannot set property promises of #<Object> which has only a getter»*.
Il finto disco che serve a far cadere la scrittura si costruisce a mano, con i
soli metodi che il modulo usa davvero.

---

## 54. Contabilità · Fase 1 — le fondamenta a partita doppia (21/09/2026)

Primo pezzo della specifica che Francesco ha consegnato il 21/09
(`CLAUDE_CODE_IAM_CONTABILITA_SEMPLIFICATA.md`); il piano, con le misure prese
sul database vero, è in `CONTABILITA-PIANO.md`.

| pezzo | dove |
|---|---|
| le regole (stesso motore di M1, M3, M4 e M5) | `tariffe/motore/contabilita.js` — `bilanciato`, `validaRighe`, `righeSemplici`, `righeDi`, `contropartitaDi`, `stornabile`, `storno`, `CONTI_MINIMI`, `GENERI` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **64** (erano 48) |
| la tabella delle righe, i quattro trigger, la funzione di scrittura | `supabase/migrations/20260922_contab_partita_doppia.sql` (applicata) |
| i tre flag e i dodici conti proposti | blocco `cnt*` in `iam/index.html` |
| la contropartita, le righe Dare/Avere, lo storno | blocco `pnt*` in `iam/index.html` |
| prove sulle schermate | `conti-causali.test.mjs` (16), `prima-nota.test.mjs` (14) |

### La misura che ha deciso QUANDO farlo

Presa prima di scrivere una riga: `iam_movimenti` **1 riga**, `iam_quadrature`
**0**, `iam_sospesi` **0**. Non c'era niente da migrare, e il modello si è
cambiato a costo quasi zero. Con qualche centinaio di movimenti scritti sarebbe
stata una migrazione di dati con il rischio di riscrivere numeri che qualcuno
ha già letto e usato.

### Perché due righe e non una

Fin qui un movimento era **un conto e un importo**. Basta per una prima nota di
cassa e non basta per una contabilità assicurativa: quando un cliente paga 400 €
di premio, quei 400 **entrano in cassa** *e* **diventano un debito verso la
compagnia**. Sono due fatti dello stesso evento, e un modello che ne registra
uno solo lascia l'altro alla memoria di chi c'era.

E c'è una ragione che vale più di tutte: **il pareggio è il solo controllo che,
da solo, si accorge di un movimento scritto male.** Un importo sbagliato su un
conto solo non lo vede nessuno. Lo stesso importo su due righe non quadra, e lo
dice il database prima che la riga esista.

### Le tre regole nuove

11. **Dare oppure Avere, mai tutti e due sulla stessa riga.** Una riga con 100
    di qua e 100 di là si legge come «zero», e allora due righe **diverse**
    darebbero lo stesso saldo: un totale sbagliato smetterebbe di distinguersi
    da uno giusto guardando le cifre. Il divieto è un `CHECK`.
12. **Quello che non si può contare non si quadra.** `e_quadrabile` si mette
    solo su un conto che ha una realtà contro cui confrontarsi — il cassetto,
    gli assegni, l'estratto conto. Un conto di crediti non ce l'ha: si legge
    nello scadenzario, riga per riga. Oggi si quadra tutto, ed è il difetto che
    il flag chiude.
13. **Un movimento registrato non si riscrive: si storna.** Lo storno è un
    movimento **nuovo**, con le righe rovesciate, che punta all'originale.
    Restano a registro tutti e due i fatti — l'errore e la correzione.

### Chi scrive: una funzione, non due richieste

Testata e righe sono due tabelle, e dalla pagina sarebbero due richieste. Se
cade la seconda resta **una testata senza righe**: un movimento che c'è, che si
legge, che sembra a posto, e che non dice da dove viene il denaro. È lo stesso
ragionamento dell'importazione del portafoglio (§47) — *un'importazione a metà
che si dichiara è recuperabile, una che sembra finita è un archivio sbagliato
di cui nessuno sa il perché.*

`iam_movimento_registra(p_movimento, p_righe)` scrive tutto in una transazione,
è **idempotente sulla chiave** (doppio clic → lo stesso movimento, non due) e,
se la testata porta `storno_di_movimento_id`, marca l'originale nello stesso
colpo. È `security invoker`: le politiche valgono per **chi chiama**. Una
funzione che scavalcasse la RLS sarebbe una seconda regola su chi può scrivere
in contabilità, e quella che sbaglia sarebbe quella che nessuno guarda.

### Il bilancio si controlla a fine transazione, e non è un dettaglio

`create constraint trigger … deferrable initially deferred`. Le righe arrivano
una alla volta, e dopo la prima il movimento è **per forza** sbilanciato: un
trigger immediato vorrebbe dire non poterne scrivere nessuna. Il controllo vero
si fa quando la transazione chiude, che è il momento in cui il movimento è
finito.

E la testata bloccata con le righe libere sarebbe **una porta chiusa con la
finestra aperta**: c'è un quarto trigger che difende anche le righe.

### La domanda che si fa a chi lavora

Non una griglia Dare / Avere — sarebbe chiedergli di fare il ragioniere. Si
chiedono **due conti**: quello che si muove e la **contropartita**. È una
domanda a cui sa già rispondere («sono entrati 400 in cassa, erano il premio di
Rossi da girare alla compagnia»), e le due righe le costruisce il motore con il
verso che dice la causale (regola 6).

### I movimenti scritti prima si DICHIARANO, non si completano

Quello che c'è ha un conto solo: la contropartita **non è persa, non è mai
stata scritta**. Il dettaglio la mostra com'è e lo dice in faccia. Un
«Conto compagnia» aggiunto dal programma sarebbe una cosa che nessuno ha
deciso, e fra sei mesi nessuno saprebbe che l'ha scritta un programma (§8.1).
Conseguenza dichiarata: quei movimenti **non si stornano** — non si rovescia
quello che non c'è. Si annullano, col motivo, e restano a registro.

`conto_id` e `importo` sulla testata **restano**, e da oggi sono il derivato
della riga singola. Toglierli adesso vorrebbe dire riscrivere `saldo`,
`quadratura`, `giornata`, `dettaglioConto` e `anomalie` nello stesso colpo —
cinque funzioni con 34 prove sopra — mentre si cambia il modello: il modo di
non sapere più quale delle due cose ha rotto l'altra.

### I dodici conti minimi si propongono, non si seminano

Le dieci causali della M1 sono seminate dalla migrazione perché sono un
**vocabolario**. Un conto no: è un posto dove stanno dei soldi, e **ha un
saldo**. Dodici saldi a zero che nessuno ha deciso, dopo due settimane, sono
dodici dati. Quindi stanno in `Contabilita.CONTI_MINIMI`, la schermata li mostra
con quello che servono, si spuntano e li crea una persona. Chi ne crea sei su
dodici ne ha creati sei: non manca niente.

Nascono **senza** `saldo_dichiarato_il`, perché zero è anche un saldo vero e
quella data è l'unica cosa che distingue «è zero» da «nessuno l'ha mai
scritto» (§43).

### Niente `organization_id`

La specifica lo chiede (principio 7). Misurato: **zero colonne tenant in tutto
il database**, e `iam_azienda` ha una riga. Una colonna che vale sempre lo
stesso valore non isola niente, e le prove di «isolamento fra tenant»
proverebbero una cosa che non esiste. L'isolamento qui è **per ruolo**, ed è
quello che le politiche fanno: staff legge, admin scrive.

### Un vincolo che sarebbe scattato al primo storno

`origine` ammetteva quattro valori e `storno` non c'era. Senza allargarlo, il
primo storno sarebbe morto contro un vincolo **dopo** che la schermata aveva
appena detto «sì, si può stornare». L'ha trovato il collaudo sul database vero,
non la rilettura: le prove sul sorgente non vedono i `CHECK` che non leggono.

### Le controprove

- Tolto «almeno due righe» da `bilanciato` → rossa la prova della regola 11.
- `righeDi` che **non** dichiara più un movimento senza righe → rosse **due**
  prove, quella della lettura e quella dello storno.
- Le due scritture separate al posto della funzione → rossa la prova della
  transazione unica.
- Tolto «già stornato» da `stornabile`, e poi la chiave di idempotenza dello
  storno con la data dentro (due clic in due giorni = due storni) → rossa la
  stessa prova, due volte per due motivi diversi.

### Cosa resta aperto

- **La prima nota nasce vuota**, e i saldi iniziali dei conti sono a zero: il
  ricostruito parte da un numero che non è quello (§29).
- **Il motore chiede ancora l'ora al computer in tre punti** (`giorniDa`,
  `sospesiAperti`, `anomalie`), nati con la M4 e la M5. È la famiglia del
  difetto di §44 e §45; nel blocco della partita doppia non c'è, e una prova lo
  sorveglia. Gli altri tre sono annotati e non toccati.
- **`otp-dalla-posta.test.mjs` è rosso su `main` da prima**: cerca
  `server/otpPosta.js`, che nel repository non c'è. È il guasto §1 al
  contrario — una prova che sorveglia un modulo mai arrivato.
- **Le Fasi 2, 3 e 4** (incassi con più rate e più pagamenti, crediti verso
  clienti e collaboratori, estratti conto e cruscotto) sono il resto della
  specifica.

---

## 55. Le rate che sparivano ricaricando il file (22/09/2026)

Francesco stava per premere «Importa» sul portafoglio PRIMA dell'anno
(2.358 polizze, 3.149 rate) per recuperare le 1.700 polizze rimaste senza rate
il 21/09 (§47). **Quel ricaricamento non avrebbe recuperato niente, e avrebbe
detto di averlo fatto.**

| pezzo | dove |
|---|---|
| la correzione | `supabase/migrations/20260922_import_rate_su_polizze_gia_dentro.sql` (applicata) |
| l'esito che dichiara quello che resta fuori | `fluConferma` in `index.html` |
| prove | `server/verifica/flusso-ssf.test.mjs` (**46**), blocco «import» in `ui-test.mjs` (**493**) |

### Il difetto, in una riga

La pagina manda nel foglio di brutta **solo le polizze nuove**
(`aBlocchi('polizze', p.polizze.nuove …)`): le altre stanno in
`p.polizze.gia` e non partono, ed è giusto — sono già scritte. Ma la mappa
«chiave del file → polizza» si costruiva **solo dalle polizze del lotto**.
Una rata che nomina una polizza già in archivio non trovava nessuna chiave, la
giunzione dell'`insert` la scartava, e il verbale dichiarava lo stesso che era
andato tutto bene.

> **Una giunzione che non trova niente non è un errore: è zero righe.** È BUG 1
> (§47) un piano più in là — lì era un `update` che non toccava nessuna riga,
> qui è un `insert` che non ne produce nessuna. Stessa firma: nessun rosso,
> nessun messaggio, e il numero sbagliato che ha l'aria di quello giusto.

E il commento accanto a quel codice diceva l'opposto — *«comprende anche
quelle che c'erano già: lasciarle fuori è il guasto che questa migrazione
ripara»*. **Era l'intenzione, non il codice.** La trappola dei commenti (§10,
§12, §18, §26, §29, §31, §33, §34, §37, §41, §42, §45) vista dal lato di chi
scrive: un commento che descrive quello che si voleva fare fa smettere di
controllare se è stato fatto.

### Misurato, non dedotto

Sul database vero, con una prova che si annulla da sola alla fine perché non
resti niente:

| | prima | dopo |
|---|---|---|
| tre rate su tre polizze **già in archivio** | **0 scritte** | 3 scritte |
| una rata su una polizza che non esiste da nessuna parte | sparita | fuori, **e contata** |

### La correzione, e il pezzo che vale quanto la correzione

1. **La mappa nasce dall'unione di due elenchi di chiavi**: quelle delle
   polizze del lotto e quelle che **le rate nominano**. Tutte e due si
   risolvono su `quote_polizze` vera, quindi valgono anche per le polizze che
   il lotto non porta. Per un file tutto nuovo non cambia niente: le due metà
   coincidono. Cambia tutto per un file che si ricarica — che è il caso per cui
   quella funzione è nata.
2. **Quello che resta fuori si conta.** `titoli_proposti` e
   `titoli_senza_polizza` finiscono nel verbale e tornano alla pagina, che li
   scrive in rosso: *«12 rate sono rimaste fuori … proposte 100, scritte 88»*.
   Senza questa metà, la prossima volta che una giunzione scarta qualcosa
   nessuno lo saprà — e non sarà detto che sia per lo stesso motivo.

Una polizza che la RLS non fa vedere a chi importa non entra nella mappa: la
sua rata finisce **fra le contate**, non fra le sparite.

### La scala, misurata prima di consigliare di premere il bottone

`statement_timeout` del ruolo `authenticated` è **8 secondi**, e la funzione è
una chiamata sola. Il carico vero — 2.358 polizze, 3.149 rate di cui 1.600 su
polizze già in archivio, con le politiche attive — gira in **2.491 ms**. Tre
volte di margine. Il 21/09 la stessa importazione era morta dopo 218 secondi
perché scriveva **una richiesta di rete per riga**: è un'altra cosa, e va detto
perché il ricordo di quei 218 secondi fa credere che il problema sia la mole.

### Le controprove

- Tolto dalla mappa l'elenco delle chiavi che le rate nominano → rossa la prova
  «le rate di una polizza già in archivio trovano la loro polizza».
- Tolto dall'esito l'avviso delle rate rimaste fuori → rosse **due** prove, una
  sul sorgente e una che fa girare la schermata.

### Cosa resta aperto

- **Le rate perse il 21/09 si recuperano solo ricaricando il file della
  compagnia**, che adesso le aggancia davvero. Finché non lo si fa, l'anomalia
  «1.700 polizze senza rate» resta rossa, ed è giusto che lo sia.
- **La prova sul sorgente legge l'ULTIMA migrazione** che definisce la
  funzione, non la prima: leggere la prima vorrebbe dire sorvegliare il mondo
  di ieri. Se un giorno la funzione si sposta in un terzo file, la prova lo
  segue da sé.

---

## 56. L'import non muore per una riga, e dice quello che lascia fuori (22/09/2026)

Stessa giornata di §55, stesso file di PRIMA aperto in anteprima. Corretto il
guasto delle rate, il lavoro è continuato leggendo il resto della strada — e
la strada aveva altre tre buche, due delle quali avrebbero fatto fallire
l'importazione in blocco.

| pezzo | dove |
|---|---|
| gli scarti che non fanno morire la transazione | `supabase/migrations/20260922b_import_non_muore_per_una_riga.sql` (applicata) |
| le colonne obbligatorie, dichiarate una volta sola | `CAMPI_OBBLIGATORI` e `piano().incomplete` in `tariffe/motore/flusso-ssf.js` |
| i tre secchi per nome, le polizze perse con un elenco | `fluMostra` / `fluDettaglio` in `index.html` |
| la barra, l'esito e gli avvisi | `fluConferma` in `index.html` |
| prove | `server/verifica/flusso-ssf.test.mjs` (**48**), blocco «import» in `ui-test.mjs` (**495**) |

### Una riga rifiutata costava cinquemila righe

Il tutto-o-niente del 21/09 (§47) ha un prezzo che nessuno aveva messo in
conto: **se una riga su cinquemila viene rifiutata dal database, non si perde
quella riga — si perde tutto**, con un messaggio grezzo di Postgres, dopo che
l'anteprima aveva detto che andava bene.

Due cose la rifiutano, e nessuna delle due è un caso limite. Misurate sullo
schema vero, con tre inserimenti veri annullati alla fine:

| riga | risposta del database |
|---|---|
| polizza senza `data_effetto` | `23502` — violazione di NOT NULL |
| polizza il cui `numero_polizza` è già in archivio | `23505` — chiave duplicata, **nonostante** `on conflict (fonte, fonte_id) do nothing` |
| rata senza `importo_lordo` | `23502` |

> **Un `on conflict` protegge dal SUO arbitro, non dagli altri indici unici.**
> `quote_polizze_numero_polizza_uidx` è unico su tutta la tabella; l'arbitro
> dichiarato è `(fonte, fonte_id)`. Un conflitto su un indice diverso
> dall'arbitro **non viene assorbito dal `do nothing`**: solleva un errore e
> annulla la transazione. E PRIMA non ha tacito rinnovo — a ogni scadenza
> nasce una polizza nuova (§14, regola 4) — quindi lo stesso numero che torna
> in un file di dodici mesi è la normalità, non l'eccezione.

Il primo caso è la regola di casa §8.1 che si ritorce: il motore lascia vuoto
quello che non sa leggere invece di inventarlo — giusto là, fatale qui.

**La regola nuova: quello che non può entrare si esclude e SI CONTA.** Mai in
silenzio. Tre numeri nuovi (`polizze_senza_dati`, `polizze_numero_doppio`,
`titoli_senza_dati`) nel verbale e sullo schermo. Una riga esclusa è un
problema da guardare; cinquemila righe perse per colpa sua sono una giornata.

Il doppione di numero si cerca **in due direzioni**: contro l'archivio e
**dentro il lotto**. Due righe dello stesso file con lo stesso numero si
scontrerebbero fra loro, e il `not exists` non le vede — guarda la tabella
com'era prima dell'istruzione.

### «568 righe non importabili» erano tre cose diverse

E una delle tre non era un guasto.

| secchio | che cosa si perde | si chiude |
|---|---|---|
| polizze senza il contraente | **una polizza intera**, con scadenzario, fascicolo e rate | chiedendo alla compagnia un file che porti quei contraenti |
| rate di tipo sconosciuto | una riga di contabilità, coi soldi dentro | decidendo che cosa significano quei codici (§16) |
| rate senza la loro polizza | quasi niente: sono i **rinnovi emessi e non pagati** | non si chiude, perché è la regola 3 che funziona |

Sommarle sotto «non importabili» faceva sembrare un guasto il comportamento
voluto e nascondeva i due che guasti lo sono. E **il secchio più caro era
l'unico senza un contatore**: le polizze senza contraente esistevano solo come
N riquadri di avviso identici — leggibili con tre polizze, un muro con
trecento. Adesso hanno una sezione, un numero e un elenco.

Per raccoglierli, il motore etichetta l'avviso con una **chiave di famiglia**
(`k: 'polizza-senza-cliente'`): raggrupparli riconoscendoli dal testo
funzionerebbe finché qualcuno non riscrive la frase, e poi smetterebbe di
funzionare in silenzio.

**Nessuno dei tre cala ricaricando il file**, ed è scritto in schermata: si
calcolano confrontando il file con se stesso, prima di qualunque lettura del
database. Chi legge «568» dopo un'importazione andata male prova a ricaricare
per rimediare, e si ritrova lo stesso 568.

### Tre cose più piccole, che dicevano il falso

- **La barra arrivava al 100% e POI cominciava a scrivere.** La scrittura è
  una chiamata sola e può durare; una barra piena mentre il database lavora fa
  chiudere la scheda — che è esattamente come il 21/09 si è perso mezzo
  portafoglio. Adesso un ottavo resta alla scrittura, e il passo dice di non
  chiudere la pagina. Era il difetto che il commento due righe sopra
  dichiarava di voler evitare, arrivato da un'altra porta.
- **«In archivio non è stato scritto niente» era incondizionato e falso**: il
  catalogo si scrive PRIMA della transazione ed è una scelta dichiarata (§39,
  regola 6). Adesso dice che cosa non è stato toccato — il portafoglio — e che
  il catalogo invece c'è. È §12 e §18 dal lato della scrittura: una
  rassicurazione più larga di quello che si può garantire è una bugia.
- **L'importazione non annotava più nome, email e RUI dei codici produttore**,
  persi nella riscrittura del 21/09. Misurato: 16 righe in
  `quote_codici_collaboratore`, **zero con un nome**. Senza quelle evidenze
  ogni flusso lascia sigle nude e il lavoro di riconoscerle si rifà da capo
  (§19). Rimesse, fuori dalla transazione: sono evidenze, non portafoglio.

### La stessa regola in due lingue, una accanto all'altra

`Flusso.CAMPI_OBBLIGATORI` dichiara le colonne che il database pretende, il
piano porta `incomplete` e l'anteprima le mostra **prima** di scrivere; la
funzione SQL le filtra, perché è l'ultima porta. Due elenchi che divergono
vorrebbero dire un'anteprima che promette una riga e una scrittura che la
butta: c'è una prova che li fa dire la stessa cosa (la disciplina di §50).

### Una controprova restata verde, e la prova era debole

Tolto dall'`insert` delle rate il filtro sui dati obbligatori, la prova è
restata **verde**: cercava quelle colonne nel file intero, e le stesse colonne
compaiono anche nel blocco che *conta* gli scarti. Cioè avrebbe accettato una
funzione che conta correttamente le righe rifiutate e poi muore provando a
scriverle. Adesso guarda **dentro le due `insert`**, e tutte e due le
controprove la fanno diventare rossa. *Una controprova che non fa diventare
rossa nessuna prova non assolve il codice: accusa la prova* (§15, §17, §18,
§19, §41, §46).

### Cosa resta aperto

- **Il timeout è stato misurato, non è un rischio oggi**: `statement_timeout`
  del ruolo `authenticated` è 8 secondi e il carico vero gira in 2.491 ms
  (§55). Ma **non esiste una ripresa**: se un giorno non bastasse, non c'è
  niente di più piccolo da riprovare — il secondo tentativo ricarica gli
  stessi blocchi e rilancia la stessa chiamata.
- **`quote_anagrafiche` non ha un indice unico su `(fonte, fonte_id)`**: la
  difesa contro i doppioni è un `not exists` nel codice, cioè proprio il
  controllo che la migrazione del 18/09 dichiara insufficiente. Oggi non morde
  (zero clienti nuovi), ma è la stessa famiglia del difetto che ha prodotto il
  portafoglio a metà.
- **Il meccanismo `_chiavi` per i doppioni interni al file è codice morto**:
  `piano()` toglie le righe marcate `_duplicatoDi` da `clienti.nuovi`, e
  `chiaviDi()` poi le cerca proprio lì. Non morde finché non arriva un file
  con clienti nuovi doppi.
- **Il blocco ROLLBACK della migrazione del 21/09 non riporta a
  un'importazione funzionante**: prometteva che «la schermata torna a scrivere
  riga per riga», ma quel codice è stato sostituito nello stesso commit. È la
  trappola dei commenti al contrario — un commento che NOMINA una via d'uscita
  non è quella via d'uscita.

---

## 57. Abbinare un codice produttore lo applica davvero (22/09/2026)

> «Ho abbinato un codice produttore a un collaboratore, ma se vado nel report
> produzione esce da abbinare» — Francesco.

| pezzo | dove |
|---|---|
| la funzione che applica, una per tutti | `supabase/migrations/20260922c_applica_decisione_codice.sql` (applicata) |
| la scheda del collaboratore | `ccpApplica`, `ccpEsitoTesto`, `ccpAggiungi` in `iam/index.html` |
| l'anteprima del flusso | `asgDecidiUno` in `index.html` |
| il pannello del pregresso, senza più il tetto | `asgPagina` / `asgCarica` in `index.html` |
| prove | `assegnazione.test.mjs` (**47**), `codici-compagnia.test.mjs` (**22**), `ui-test.mjs` (**497**) |

### La Produzione non sbagliava: diceva la verità su una colonna vuota

Misurato prima di toccare niente:

| | |
|---|---|
| `quote_codici_collaboratore` | 16 righe, **due decise** |
| `quote_polizze.collaboratore_id` | **0 su 1.721** |
| `quote_titoli.collaboratore_id` | **0 su 56** |

La Produzione legge `quote_polizze.collaboratore_id` (vista
`iam_produzione_mensile`); con la colonna vuota ogni riga esce col codice e la
pastiglia «da abbinare». Il difetto sta a monte: **in IAM si poteva DECIDERE un
codice e niente in IAM APPLICAVA quella decisione.**

> **Prendere una decisione e applicarla sono due cose diverse, e due schermate
> su tre facevano solo la prima.** `asgApplica` (Titoli › Assegna il pregresso)
> scriveva decisione + rate + polizze; `asgDecidiUno` (anteprima del flusso) e
> `ccpScrivi` (scheda del collaboratore) scrivevano **solo la riga di
> decisione**.

E la scheda non taceva: **affermava il contrario.** La conferma diceva *«le
rate di quel codice sono sue, anche quelle già in archivio: si assegnano dai
Titoli del preventivatore»* — un fatto sul pregresso che il codice non
eseguiva, e un rimando a una pagina dove quel bottone non c'è. È la trappola
dei commenti trasferita al testo che legge l'utente: **una frase che promette
quello che il codice non fa è peggio di una frase che manca**, perché chi la
legge smette di controllare.

Il giro che ha fatto Francesco era chiuso anche a valle: la Produzione
mandava in «Strumenti › Decisioni aperte», che **conta** le decisioni mancanti
e non ne applica nessuna. Si decideva, si tornava, e c'era ancora «da
abbinare».

### La regola sta in Postgres, e non è una scorciatoia

Le schermate che decidono sono **tre** e stanno in **due documenti** (IAM e il
preventivatore). Tre copie di «quali righe prendere» sarebbero tre regole su
chi viene pagato, e quella sbagliata sarebbe quella che nessuno guarda. Per i
motori la risposta è §18 — *il motore si carica, non si copia* — ma qui la
regola **scrive**, e una funzione che scrive non si carica da un `<script>`:
sta in `iam_applica_decisione_codice`, `security invoker`, con dentro le stesse
cinque regole di §19 e §49.

Le due che si dimenticano:

- **il periodo si confronta con la data della POLIZZA, non con oggi.** Con
  «oggi», un abbinamento chiuso a giugno toglierebbe a quella persona anche le
  polizze di marzo, che sono sue. C'è una prova che vieta `current_date` e
  `now()` dentro quella funzione.
- **le rate seguono la data della loro POLIZZA**, non la propria decorrenza:
  guardando due date diverse la polizza finirebbe a uno e le sue rate a un
  altro, e i due numeri non tornerebbero mai.

E quello che non si tocca **si conta**: `fuori_periodo` e `di_altri` tornano a
chi chiama insieme ai numeri veri. Uno zero non è un successo — può voler dire
«è già tutto a posto» oppure «sono di un altro», e sono due cose diverse
(§47, BUG 1).

### Due difetti trovati per strada, tutti e due sui soldi

1. **`asgCarica` leggeva le prime mille polizze**, con `.limit(2000)` scritto e
   `.limit(5000)` sulle rate. PostgREST ne manda **mille** per richiesta
   qualunque numero ci sia scritto: con 4.079 polizze il pannello ne avrebbe
   attribuite circa mille e le altre sarebbero rimaste senza produttore, **in
   silenzio**. È §50 e §53 per la terza volta, qui sulle provvigioni. Adesso si
   pagina.
2. **`fluChiDi` non chiamava `valeIl`**: era l'unica delle tre strade che
   guardava solo se il codice era deciso, ignorando periodo e sospensione. Una
   polizza importata sarebbe nata intestata a chi il codice non ce l'aveva più
   — cioè il caso che §49 esiste per impedire. Oggi non si vedeva perché
   nessuna riga ha un periodo; sarebbe scattato al primo dichiarato.

### Quello che NON si è fatto

**La Produzione non risolve il codice dal vivo.** Sarebbe bastato leggerlo
dalla tabella delle decisioni e il sintomo sparirebbe — ma il consuntivo di un
anno chiuso cambierebbe da solo il giorno in cui qualcuno cambia una decisione
(§45). Il produttore si **congela sulla riga**, e si congela applicando.

Resta però una cosa da sapere: **due schermate possono contraddirsi**. Il
dettaglio polizza di QUOTO risolve dal vivo (`polProduttore`) e mostra già il
nome; la Produzione mostra la colonna. Finché una decisione non è applicata,
dicono due cose diverse sugli stessi dati. Con l'applicazione automatica la
finestra è di un istante, ma esiste.

### Le controprove

- Tolta l'applicazione da `asgDecidiUno` → rossa la prova nel browser.
- Tolta da `ccpAggiungi` → rossa la prova di IAM.
- Tolto `valeIl` da `fluChiDi` → rossa la prova del motore.

### Cosa resta aperto

- **Quattordici codici su sedici sono ancora da decidere**, e sotto ci sono le
  polizze di quasi tutto il portafoglio: `U25236` da sola ne ha 1.117.
- **`asgApplica` scrive ancora gli update dal browser** invece di chiamare la
  funzione: adesso legge tutto il portafoglio, quindi non sbaglia più i conti,
  ma è la stessa regola scritta in due posti. Si unifica quando le sue prove
  si potranno riscrivere sul verso giusto.
- **Il confronto compagnia+codice non passa dagli alias** (§49): «HDI
  Assicurazioni» sulla polizza e «HDI» in tabella non si ritrovano. Con una
  compagnia sola non si vede; va guardato prima del secondo flusso.

---

## 58. Il cliente si sceglie da una schermata, non da una tendina (22/09/2026)

> «Quando si inserisce una polizza e si deve cercare un cliente si dovrebbe
> aprire un'interfaccia intermedia dove posso cercare un cliente esistente già
> in IAM oppure inserire un nuovo cliente. Ovviamente sempre con lo stesso
> design di IAM, compresa questa barra di ricerca che non c'entra nulla come
> design.» — Francesco.

| pezzo | dove |
|---|---|
| la schermata | blocco `clp*` in `index.html` (`clpApri`, `clpVista`, `clpTrova`, `clpScegli`, `clpNuovo`, `clpNuovoTipo`, `clpDaCF`, `clpSalvaNuovo`) |
| lo stile | blocco `.clpk-*` accanto al kit di IAM in QUOTO |
| le due porte | `#pnu-cliente-q` (nuova polizza) e `#pens-cliente-q` (analisi previdenziale) |
| prove | quattro blocchi «scegli un cliente» in `ui-test.mjs` → **501** |

### Il motivo non era estetico: erano regole che non arrivavano

La scheda «cliente nuovo» si disegnava con `aw-grid`, `pv-sec`, `pv-piccolo` e
`pv-azioni`. Misurato nel foglio di stile: quelle quattro classi esistono
**solo** dentro `#page-previdenza`. Il modulo della polizza nuova vive in una
finestra appesa al `body`, fuori da quel pannello — quindi lì **nessuna di
quelle regole si applicava**: niente griglia, niente titolo di sezione, niente
riga di bottoni, e il rosso dell'errore arrivava da un ripiego scritto a mano.

> **Una classe che esiste solo sotto un pannello è una regola che non arriva, e
> non lo dice.** È la stessa firma del gettone che non risolve (§44): la
> proprietà viene ignorata in silenzio, la scheda esce brutta, e nessun errore
> collega le due cose. Chi la guarda pensa a una scelta estetica sbagliata.

### Il kit non si copia: si usa

Il kit di IAM in QUOTO è nato il 21/09 sul modulo della polizza nuova, e il
prefisso lo dice. Adesso che le schermate sono due, la finestra riprende le
schede, i bottoni, la griglia e le note di quel kit e definisce solo quello che
prima non esisteva: la finestra, la barra di ricerca, le righe del risultato,
le due linguette. **Due copie della stessa tavolozza sono due tavolozze che un
giorno diranno cose diverse** — è la regola dei motori (§18) applicata al
foglio di stile.

Conseguenza sul guardiano: la regola «un colore a mano solo dove il contenitore
dichiara i gettoni mancanti» era scritta **al singolare**, con il nome proprio
di quel contenitore. Adesso i contenitori sono un elenco, e la prova pretende
che ognuno dichiari i suoi gettoni. *Un guardiano che ammette l'eccezione a un
nome proprio invece che a una categoria va riscritto a ogni schermata nuova, e
alla terza qualcuno smette di riscriverlo.*

### `clpCerca` conserva il nome, e non è pigrizia

Il nome e la firma sono scritti negli attributi `onfocus` dell'HTML. Cambiarli
avrebbe voluto dire toccare ogni punto d'uso per un lavoro che non li riguarda.
Così i due campi registrati — l'analisi pensione e la polizza nuova — non hanno
cambiato una riga, e **il terzo che arriverà avrà la schermata gratis**.

Il campo è diventato una **porta**: `readonly`, il clic apre. Ci si poteva
ancora scrivere dentro un nominativo a mano, che è esattamente quello che §7
vieta.

### Le cinque regole di casa applicate qui

1. **Le società si tolgono DOPO aver contato, e si dice quante.** `soloFisiche`
   (l'analisi previdenziale: una società non ha un'età) accorciava l'elenco in
   silenzio. Un elenco che si accorcia da solo fa cercare per mezz'ora una
   persona che c'è (§50).
2. **«Non si è potuto leggere» non è «non c'è nessuno»** (§12, §18). Su una
   ricerca di persone è la bugia peggiore: chi cerca smette di cercare.
3. **Il totale che non si è potuto contare si scrive con un punto, mai con uno
   zero**, e la lista dice «ne vedi N su M» quando è tagliata.
4. **La data di nascita viene dal motore** (§23, due porte una regola) e **non
   sovrascrive quella corretta a mano**: chi l'ha corretta sapeva qualcosa che
   il codice non sa. Da un codice fiscale non valido non esce niente.
5. **Il movimento porta l'identificativo della riga creata** (§18): mancava, e
   senza di lui alla domanda «chi ha censito QUESTO cliente» il registro non
   sapeva rispondere.

### Le società si censiscono qui

Le polizze si fanno anche alle società, e la scheda nuova era solo per persone
fisiche: l'unica strada era uscire dal modulo e andare in Anagrafiche, cioè
**perdere quello che si stava scrivendo**. La partita IVA è di undici cifre e
il rifiuto lo dice; l'aggancio resta «solo se è una» (`anagGiaCensita`).

### Un difetto del banco, trovato scrivendo la prova

Il finto database trattava **qualunque** conteggio come un conteggio e basta
(`data: null`). In PostgREST è vero solo con `head`: senza, la risposta porta
le righe **e** il totale. Una schermata che li chiede tutti e due si vedeva la
lista vuota **per un difetto del banco, non del codice** — ed è il modo più
veloce di accusare il codice giusto. Adesso il banco li distingue.

### La trappola dell'apice inverso, quinta e sesta volta

Due volte nella stessa ora: un commento HTML dentro un template literal di
`index.html`, e un commento dentro il banco di `ui-test.mjs` — che due righe
più sotto avvisa di non farlo. §31 vale anche dentro §31: **non si scrive il
carattere vietato dentro il costrutto che lo vieta.**

### Controprove

Campo non più `readonly` → rossa la prova della porta. Guasto della lettura
scritto come «nessun cliente» → rossa. `entita_id` tolto dal movimento →
rossa. La data dedotta che sovrascrive quella a mano → rossa. La scelta
«società» tolta → rossa.

### Cosa resta aperto

- **La ricerca si ferma a 40 righe** e lo dichiara: non si pagina. Su un
  archivio di 2.536 anagrafiche restringere la ricerca basta; se un giorno non
  bastasse, la strada è quella di `asgPagina` (§57).
- **Gli altri diciotto wizard** hanno ancora il loro autocomplete copiato: si
  portano qui uno alla volta, quando si tocca quel wizard (è la stessa nota del
  17/09, e adesso la meta è una schermata invece di una tendina).
- **Il modulo non chiede ancora chi ha prodotto la polizza** (§45): resta il
  punto 4 del brief Anagrafiche.

---

## 59. Contabilità · Fase 2 — l'incasso di una o più rate (22/09/2026)

La Fase 1 ha dato alla prima nota due gambe. Questa fase le collega al
portafoglio: **una rata che si incassa adesso muove un conto, e il conto lo sa.**

| pezzo | dove |
|---|---|
| le regole | `tariffe/motore/contabilita.js` — `incassabile`, `contoCompagnia`, `contoIncasso`, `righeIncasso`, `mezzoIncasso`, `effettoSuConto`, `perMovimento` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **72** (erano 64) |
| le tre tabelle, i trigger, le due funzioni | `supabase/migrations/20260922d_contab_fase2_incassi.sql` + `20260922e_contab_fase2_indurita.sql` (applicate) |
| la schermata | linguetta «Incassa una rata», `#contab-panel-incassa` e blocco `inca*` in `iam/index.html` |
| prove sulla schermata | `iam/verifica/incassa-rata.test.mjs` — 10 |

### Misurato prima di scrivere

| | |
|---|---|
| `quote_titoli` | 418 aperte, **2.787 già incassate** |
| `iam_conti` | 6, di cui **2** dichiarano un mezzo, **0** di debito, **0** di sospesi |
| `iam_movimenti` / righe | 1 / 0 |

Da cui la cosa da dire subito: **nessun conto di debito verso una compagnia
esiste.** Finché non ne esiste uno la schermata non registra niente e lo dice.
Non se ne inventa uno — un incasso appoggiato al primo conto che passa è un
debito attribuito alla compagnia sbagliata, e non se ne accorge nessuno finché
non si va a rimettere il denaro.

### Il difetto che rendeva la Fase 2 impossibile, e che non si vedeva

`saldo()` leggeva la **testata** del movimento: un conto, un importo, il verso
dalla causale. Con un incasso di 300 € pagato 120 in contanti e 180 in banca,
la testata ne porta **uno**: la cassa risulterebbe +300 con 120 nel cassetto,
la banca +0, e il debito verso la compagnia **non si muoverebbe mai**.

> **Un movimento a più righe letto dalla testata dà numeri credibili e falsi in
> ogni conto che tocca.** E la quadratura troverebbe la differenza senza saper
> dire da dove viene — cioè il guasto peggiore: un errore che si vede e non si
> spiega.

Adesso `effettoSuConto` risponde a «quanto questo movimento muove questo
conto»: se il movimento ha righe è `Dare − Avere` di quelle righe, e il
movimento **appartiene a ogni conto che tocca**, non solo a quello in testata.
Se non le ha — ed è ogni movimento scritto prima del 20/09/2026 — si legge la
testata, come prima. Non si inventa una contropartita che nessuno ha scritto.
`saldo`, `progressivo` e `dettaglioConto` passano tutti di lì; le 64 prove
della Fase 1 sono restate verdi, perché senza `opz.righe` il motore si comporta
identico a prima.

### Le righe, e le tre cose che il motore NON fa

Specifica §7.1: **DARE** una riga per ogni modalità di pagamento, **AVERE** una
riga per ogni compagnia delle rate scelte.

1. **Non inventa il conto della compagnia.** Prima quello intestato a lei, poi
   quello generico — ma **la compagnia dev'essere risolta a un identificativo**,
   passando dagli alias (§11, §28: sulla polizza «HDI Assicurazioni», in
   anagrafica «HDI»). La riga di prima nota porta sempre `compagnia_id`, quindi
   **anche su un conto condiviso il partitario resta ricostruibile**. Una
   compagnia che l'anagrafica non conosce, invece, ferma l'incasso: il debito
   non si saprebbe verso chi nasce.
2. **Non incassa mezza rata.** Il pezzo che manca è un sospeso, e i sospesi sono
   la Fase 3. Una rata chiusa per un importo, con un residuo che non sta da
   nessuna parte, è peggio di una rata aperta. Per la stessa ragione un conto
   `e_conto_sospeso` **non è ammesso** come modalità: scriverne la sola
   scrittura contabile lascerebbe un credito che non compare nell'elenco di chi
   deve pagare — una cosa che sembra fatta e non lo è.
3. **Non chiude la differenza da sola.** L'abbuono si mette come modalità di
   pagamento, e allora si vede nel movimento e nella quadratura invece di
   sparire dentro un arrotondamento.

E una quarta, che è una **decisione aperta**: l'Avere è il premio **lordo**,
come dice la specifica. La provvigione dell'agenzia non viene separata
all'incasso, quindi il conto della compagnia porta il lordo e il conto
economico su quell'incasso dice zero. Se la provvigione si rilevi all'incasso o
alla rimessa è una decisione contabile che nessuno ha preso: **la schermata la
scrive in faccia invece di sceglierla da sola.**

### `compatibile` esisteva dalla M1 e non veniva chiamata dove serviva di più

Un premio del cliente su un conto aziendale passava senza un errore, e da quel
momento i due mucchi dell'art. 117 CAP erano uno solo (§26). `righeIncasso`
adesso chiama `compatibile` su ogni conto e rifiuta nominando il conto e la
causale. **Una funzione di controllo che non chiama nessuno è il guasto numero
uno di questo repository** (§1), e qui era la scrittura principale del sistema.

### Quattro difetti trovati dal collaudo sul database vero, non dalla rilettura

Tutti e quattro producono numeri credibili e sbagliati; tre li ha trovati un
incasso finto girato sul database e poi annullato.

1. **`origine = 'incasso'` non era nel vincolo.** Il primo incasso sarebbe morto
   contro un CHECK **dopo** che la schermata aveva detto «registro». È lo stesso
   inciampo della Fase 1 con «storno»: un vocabolario che vive in un CHECK non
   lo vede nessuno, e le prove sul sorgente non leggono i CHECK.
2. **L'idempotenza era un SELECT seguito da un INSERT**, senza lock. Due clic
   simultanei passano tutti e due il controllo, il secondo muore sul vincolo, e
   la schermata dice «errore» su un incasso **riuscito**: chi riprova con una
   chiave nuova ne fa due. Adesso lo decide Postgres con `on conflict do
   nothing`, e **la chiave nasce all'apertura della schermata, non al clic** —
   generata al clic, il secondo tentativo dopo un timeout ne avrebbe una nuova.
3. **`update quote_titoli` non guardava che la rata fosse ancora aperta**, e in
   plpgsql un update che tocca zero righe non solleva niente: è BUG 1 (§47)
   dentro il database invece che in PostgREST. Sulle 2.787 rate già incassate
   un secondo incasso avrebbe sovrascritto `incassato_il` e creato un secondo
   debito verso la compagnia per un premio entrato una volta sola.
4. **Il trigger di immutabilità bloccava la NASCITA.** La testata si prenota
   prima del movimento (è la prenotazione a decidere chi vince fra due clic), e
   il `movimento_id` arriva un istante dopo: per il trigger era una correzione.
   L'eccezione è dichiarata ed è una sola — da vuoto a pieno, e niente altro
   cambia. Scritta larga avrebbe permesso di riagganciare un incasso a un altro
   movimento mesi dopo, che è il buco che quel trigger esiste per chiudere.

### Lo storno esiste davvero

«Un incasso registrato si storna» è scritto nei trigger: senza una funzione
sarebbe una promessa che il codice non mantiene, e chi sbaglia un incasso
resterebbe con una rata chiusa e nessuna strada per riaprirla. In una
transazione: movimento inverso (letto dalle righe **scritte**, non
ricostruito), incasso a «stornato» col motivo, righe spente, **rate riaperte**.
E la rata dimentica chi l'aveva incassata — lasciare il pagatore vorrebbe dire
che l'estratto conto continua a maturare una provvigione su un incasso che non
c'è più (§17, decisione 1). `mezzo_pagamento` invece resta: dice come quel
cliente paga, ed è vero anche dopo lo storno.

### Una doppia contabilizzazione già pronta a succedere

`incDaPortare` («Incassi da accreditare») considerava «da portare» ogni rata
incassata che nessun movimento nomina — e guardava `iam_movimenti.titolo_id`,
cioè la **testata**. Un incasso di tre rate scrive un movimento solo: le altre
due sarebbero risultate da portare, e un clic avrebbe fatto nascere un secondo
debito verso la compagnia. Adesso guarda anche `iam_movimenti_righe` e
`iam_incassi_rate`, che sono i posti in cui quel fatto è scritto davvero. Le
due letture nuove **non fanno cadere la schermata**: se non rispondono si vedono
più rate «da portare» del vero, che è il verso meno pericoloso dell'errore.

### Controprove

`compatibile` tolta → rossa. Gli alias tolti → rosse **due**. `saldo` che torna
a leggere la testata → rossa. `and stato = 'aperto'` tolto dalla funzione →
rossa. Le rate della Fase 2 tolte da `incDaPortare` → rossa.

### Cosa resta aperto

- **I conti non ci sono ancora**: nessun conto di debito verso una compagnia,
  nessuna cassa contanti classificata `cassa`, nessun conto di sospesi. La
  schermata lo dice e non registra: è la prima cosa da fare, e sono decisioni
  di una persona.
- **La provvigione all'incasso o alla rimessa** è la decisione contabile
  dichiarata qui sopra, e non la prende un programma.
- **«Incassi diretti in compagnia»** è fra i conti minimi con
  `e_mezzo_pagamento`, ma non è un modo di pagare: è un tipo di incasso in cui
  in agenzia non entra un euro. Va rifatto quando lo si userà.
- **Gli abbuoni sono `natura: 'premi'`** nei conti minimi. Un abbuono è una
  perdita dell'agenzia: messo fra i premi non tocca il conto economico e sporca
  il conto separato. Da correggere prima che ci si scriva sopra la prima riga.
- **Le Fasi 3 e 4** (sospesi e recuperi; prima nota consultabile, estratto
  conto, quadratura, cruscotto) sono il resto della specifica.

---

## 60. Contabilità · Fase 3 — i sospesi, i premi a copertura e non ricevuti (22/09/2026)

Il caso che in agenzia succede tutti i giorni: la polizza si emette e si mette
a copertura perché il cliente non può restare scoperto, ma il premio non è
ancora arrivato. Da quel momento l'agenzia **deve** il premio alla compagnia e
**vanta** un credito verso il cliente. Sono due fatti, e in IAM non ne esisteva
nessuno dei due.

| pezzo | dove |
|---|---|
| le regole | `tariffe/motore/contabilita.js` — `righeApertura`, `righeRecupero`, `residuoCredito`, `statoCredito`, `recuperabile`, `recuperiVivi`, `scadenzarioCrediti` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **78** (erano 72) |
| le due tabelle, i trigger, le tre funzioni | `20260922f_contab_fase3_sospesi.sql` + `20260922g_contab_fase3_indurita.sql` (applicate) |
| la schermata | linguetta «Premi da recuperare», `#contab-panel-recuperi`, blocco `rec*` in `iam/index.html` |
| prove sulla schermata | `iam/verifica/premi-da-recuperare.test.mjs` — 10 |

### Misurato prima di scrivere

**418 rate aperte, di cui 117 già scadute, per 98.488,84 €.** Quelle 117 sono
esattamente i candidati. E: zero conti dei sospesi, zero conti di debito verso
una compagnia — la schermata lo dice e non apre niente.

### La decisione che regge tutta la fase

> **L'apertura NON chiude la rata.** «A copertura» vuol dire che la compagnia è
> a posto, non che il cliente ha pagato: la rata resta APERTA e resta nello
> scadenzario, perché è vero che il cliente non ha pagato.

Chiuderla come incassata farebbe maturare la provvigione su un premio mai
ricevuto (§17, decisione 1) — cioè pagherebbe un collaboratore con i soldi di
nessuno. La rata si chiude **quando il credito arriva a zero**, con la data
dell'ultimo recupero, e torna aperta allo storno.

```
APERTURA   Dare  Sospesi clienti    Avere  Conto compagnia
RECUPERO   Dare  Cassa / Banca…     Avere  Sospesi clienti
```

**Il recupero non ricrea il debito verso la compagnia**: quello è nato
all'apertura. Rifarlo lo conterebbe due volte, e il conto della compagnia
direbbe il doppio di quello che si deve — un numero grande, credibile e falso.

### Il residuo si calcola, e i recuperi spenti non contano

Nessuna colonna `residuo`: originale meno i recuperi **vivi**. Un residuo
memorizzato si aggiorna da un'altra parte, e il giorno in cui si scosta dalla
somma dei recuperi nessuno sa più quale dei due sia quello vero — è la stessa
decisione per cui i conti non hanno un `saldo` (§26). E i recuperi spenti dallo
storno non riducono niente: se contassero, un sospeso stornato risulterebbe
chiuso e sparirebbe dallo scadenzario.

### Le due strade non si incrociano

Una rata messa a copertura alle 9 e incassata dalla Fase 2 alle 11 farebbe
nascere **due volte** il debito verso la compagnia — e nessuno dei due indici
unici morde, perché stanno su due tabelle diverse. **Un vincolo fra due tabelle
Postgres non lo sa fare**: lo fanno le due funzioni, ognuna guardando l'altra,
e il rifiuto dice che cosa fare invece («il denaro si registra come recupero»).

### Il credito verso i COLLABORATORI non si rifà qui

Esiste dal 19/09: sono le rate che un collaboratore ha incassato e non ha
ancora rimesso (`EstrattoConto.creditoAgenzia`, §24). Rifarlo sarebbe il
secondo archivio dello stesso fatto, e il giorno in cui uno dei due si chiude i
due elenchi direbbero numeri diversi sulla stessa persona. `iam_credito_apri`
**rifiuta** il tipo `collaboratore` e dice dove sta già quel credito.

### Quattro difetti trovati dal collaudo e dalla rilettura ostile

1. **`iam_movimenti_titolo_uno` diceva: una rata ha UN solo movimento.** Vero
   quando una rata produceva una scrittura sola (M4); dalla Fase 3 ne produce
   tre o più, e il secondo recupero moriva contro un indice **dopo** che la
   schermata aveva detto «registro». Non si è tolto: si è **ristretto** a quello
   che voleva dire (`origine in ('titolo','sospeso')`). La protezione vera sta
   negli indici delle due tabelle e nei controlli incrociati.
2. **`origine` non aveva né `credito` né `recupero`**: apertura e recupero
   finivano dentro `sospeso`, che in casa è un'altra cosa (§32).
3. **Le causali non esistevano.** `GENERI` dichiara `apertura_credito` e
   `recupero_credito` dal 19/09 e nessuna causale li portava: usare «Incasso
   premi» per un'apertura sarebbe stato chiamare incasso una cosa che incasso
   non è. `incide_su_utile` è **falso** su tutte e due — un premio a copertura è
   denaro di qualcun altro, e contarlo come ricavo direbbe che l'agenzia ha
   guadagnato il premio intero (§26).
4. **Il residuo si ricalcola con la riga BLOCCATA** (`for update`): leggerlo
   dalla schermata vorrebbe dire fidarsi di un numero letto mezz'ora fa, e due
   recuperi partiti insieme lo porterebbero sotto zero.

### Due cose trovate dalle prove, non dal ragionamento

- **Lo scadenzario metteva in cima un sospeso stornato.** Ordinare per data
  attesa e basta mette righe morte davanti a quelle da chiamare: uno
  scadenzario è una lista di lavoro. Adesso prima i vivi, poi per data.
- **Una controprova restata verde, e la prova era debole.** Rinominata
  `recPagina` in `recPaginaVia`, la prova che cercava `function recPagina`
  restava verde: cercava il **nome**, non la chiamata. Adesso cerca
  `recPagina(` e pretende che sia chiamata **due** volte — paginare solo i
  sospesi e non i recuperi lascia il residuo calcolato su metà dei recuperi,
  cioè si va a chiedere dei soldi a chi li ha già dati. *Una controprova che
  non fa diventare rossa nessuna prova accusa la prova* (§15, §17, §18, §19,
  §41, §46, §56).

### E una regola di casa presa in flagrante

Le funzioni indurite erano nel database e **non nel file**. L'ha trovato una
prova, che cercava il corpo corretto e leggeva la migrazione precedente — cioè
il mondo di mezz'ora prima. **Una funzione che vive solo nel database è una
regola che nessuno può rileggere**: il file è la fonte di verità, e la prova
adesso legge il corpo di *quella* funzione e non il file intero (§34: si cerca
dentro la chiamata, non nel blocco).

### Collaudato sul database vero, e annullato

apertura → **la rata resta aperta**; secondo sospeso sulla stessa rata →
rifiutato; incasso su una rata a copertura → rifiutato; recupero parziale →
residuo 6,00 e rata ancora aperta; oltre il residuo → rifiutato; tipo
`collaboratore` → rifiutato; recupero finale → rata **incassata**; storno → 2
recuperi rovesciati e rata di nuovo aperta. Saldo del conto sospesi e del conto
compagnia alla fine: **0,00 e 0,00**.

### Cosa resta aperto

- **I conti non ci sono ancora**: nessun conto dei sospesi, nessun conto di
  debito. La schermata lo dice e non apre niente.
- **L'abbuono per chiudere un residuo che non arriverà mai** non c'è: un
  residuo di 0,50 € resta nello scadenzario per sempre. La strada è un recupero
  marcato sul conto «Abbuoni passivi», che però oggi è `natura: 'premi'` e va
  corretto prima (aperta già dichiarata in §59).
- **L'eccedenza** (il cliente dà più del residuo) si rifiuta e si dichiara: non
  ha ancora una strada sua.
- **La Fase 4** (prima nota consultabile, estratto conto, quadratura,
  esportazione, cruscotto) è il resto della specifica.

---

## 61. Contabilità · Fase 4 — il cruscotto, e i saldi che leggono le righe (22/09/2026)

Ultimo pezzo della specifica del 21/09. Il lavoro si è aperto con una misura, e
la misura ha cambiato l'ordine delle cose da fare:

```
$ grep -n "opz.righe\|righe:" iam/index.html | grep -i contabilita
(nessun risultato)
```

> **Nessuna schermata passava le righe al motore.** Dopo la Fase 2 e la Fase 3
> ogni saldo di IAM si calcolava dalla **testata** del movimento.

### Il difetto non era nel motore: era nella propagazione

`effettoSuConto` sa leggere la partita doppia dalla Fase 2 (§59). Ma sapere non
basta: le righe vanno **passate**, e chi somma sono nove funzioni annidate una
dentro l'altra. Sei chiamate interne **scartavano una chiave che avevano in
mano**:

| funzione | chiamava | e ometteva |
|---|---|---|
| `quadratura` | `saldo` × 2 | `opz.righe` |
| `storicoQuadrature` | `saldo` | `opz.righe` |
| `fondoCassa` | `saldo` | `opz.righe` |
| `giornata` | `saldo` (saldo_fine) | `opz.righe`, **e ripartiva per `m.conto_id`** |
| `anomalie` | `quadrature` × 2 | `opz.righe` |
| `dettaglioConto` | `storicoQuadrature`, `perCausale` | `opz.righe` |

> **Il confine non è fra le funzioni che accettano `opz.righe` e quelle che non
> lo accettano: è fra quelle che lo PROPAGANO e quelle che lo scartano
> internamente.** Nel secondo caso nessun chiamante può correggerle, e il
> parametro sembra esserci.

Su un incasso da 500 € — 200 in contanti, 300 in banca, 500 di debito verso la
compagnia — la testata porta **il primo conto e il totale**. Quindi, prima di
questo lavoro:

| numero | diceva | è |
|---|---|---|
| saldo banca | 0,00 | 300,00 |
| fondo cassa | 500,00 | 200,00 |
| quadratura banca contro l'estratto | «la banca ha 300 in più del sistema» | quadra |

L'ultima riga è la peggiore: non è un numero sbagliato, è un **giudizio** con
un'istruzione operativa sbagliata. Chi la legge va a cercare in banca un
movimento che non manca.

**Il danno era latente**, e per questo non si era visto: finché nessun
movimento ha righe, le funzioni a testata si comportano identiche a prima. Si
sarebbe acceso il giorno del primo incasso a più modi di pagamento.

### Due difetti che ha trovato la mappa, non la rilettura

1. **`eliminabile` contava per testata.** Un conto che vive **solo nelle
   righe** — il debito verso una compagnia, il conto dei sospesi, che in
   testata non compaiono mai — risultava senza movimenti, e la schermata
   offriva di cancellarlo. Cancellarlo renderebbe orfani proprio i movimenti
   che lo hanno mosso: è la regola 4 aggirata senza che nessuno l'abbia
   decisa.
2. **`perCausale` dentro il dettaglio conto contava il movimento intero.** Un
   incasso da 500 che su quel conto ne ha portati 300 contava 300… no, contava
   500 — e il riepilogo per causale non tornava col saldo scritto due riquadri
   più su, **nella stessa finestra**. Due numeri diversi sullo stesso conto,
   uno accanto all'altro, sono il modo di non fidarsi più di nessuno dei due.
   Adesso `perCausale` accetta `opz.conto` e conta il **pezzo**; senza,
   continua a contare il movimento intero, che è la risposta giusta per la
   prima nota.

### Sette tetti nascosti, e uno era su 2.787 rate

È §50 e §53 per la quarta volta, e stavolta su tutta la contabilità:

| lettura | diceva | serviva |
|---|---|---|
| `pntCarica` → `iam_movimenti` | `.limit(1000)` | paginare |
| `pntCarica` → `iam_movimenti_righe` | **nessun limit** (PostgREST ne manda 1000) | paginare |
| `gioCarica` → `iam_movimenti` | `.limit(2000)` → ne riceveva 1000 | paginare |
| `gioCarica` / `incCarica` → `quote_titoli` | `.limit(500)` su **2.787 rate** | paginare |
| `pntCarica` / `gioCarica` → `iam_quadrature` | nessun limit | paginare |
| `incCarica` → `iam_sospesi`, `iam_incassi_rate` | nessun limit | paginare |

Il quarto è quello che mordeva già: «da portare in contabilità» mostrava **meno
di un quinto** dell'arretrato, e chi lo guardava credeva fosse tutto.

`cntTutte(fai)` pagina e torna `{righe, parziale}`; `cntMorbida` fa lo stesso
senza far cadere la schermata. **Il tetto esiste e si DICHIARA**: `parziale`
arriva in schermata, perché un totale parziale che non lo dice è il difetto
rimesso dentro.

E le tre letture di controllo di `incCarica` hanno un verso dell'errore che non
è neutro: se si troncano, l'elenco «da portare» mostra **più** rate del vero, e
un clic ne registrerebbe una già in contabilità. Adesso c'è un avviso, e sta
**prima** dell'elenco.

### Il pannello Conti mostrava il saldo iniziale, e basta

`CNT_MOVIMENTI` era dichiarata e **non veniva mai riempita**. Non era solo un
saldo sbagliato: `eliminabile` e `causaleEliminabile` giravano su un elenco
vuoto, quindi la schermata diceva che un conto o una causale si potevano
cancellare anche quando ci erano passati dei movimenti. Adesso li legge —
**dopo** aver disegnato, a parte, così se quella lettura non riesce il pannello
resta usabile e i saldi dicono il loro motivo (§35).

### Il cruscotto

| pezzo | dove |
|---|---|
| le regole | `Contabilita.cruscotto` in `tariffe/motore/contabilita.js` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **89** (erano 78) |
| la schermata | `#contab-panel-cruscotto` e il blocco `cru*` in `iam/index.html` |
| prove sulla schermata | `iam/verifica/cruscotto-contabile.test.mjs` — 10 |

Cinque riquadri: premi dei clienti in cassa, soldi dell'agenzia, premi da
rimettere alle compagnie, premi da recuperare, incassi in arrivo. Più le
anomalie, lette **dallo stesso motore e con gli stessi dati** della linguetta
Anomalie — due letture della stessa cosa sarebbero due elenchi che un giorno
direbbero cose diverse.

Tre decisioni:

1. **Il debito non è denaro in cassa.** Un conto di debito è di natura «premi»,
   e sommandolo un incasso da 500 (cassa +500, debito −500) direbbe «premi dei
   clienti: 0 €» il giorno stesso in cui sono entrati cinquecento euro. I due
   riquadri di liquidità contano solo le tipologie in cui il denaro c'è
   davvero (`LIQUIDE`), e l'elenco è **dichiarato**, non ricavato per
   sottrazione: una lista «tutto tranne» conterebbe come liquidità una
   tipologia aggiunta domani senza che nessuno l'abbia deciso.
2. **Il debito si mostra senza segno.** Sta in Avere, quindi il saldo esce
   negativo: «−500» accanto a dei saldi positivi si legge come un ammanco.
3. **Ogni riquadro dice che cosa fare, e porta dove si fa.** È §33 («le
   anomalie hanno il verbo») applicato a un cruscotto, più la lezione di §15:
   un cruscotto che dice che cosa fare e non porta dove si fa costringe a
   cercare la linguetta giusta fra dieci.

E la regola che vale su tutto: **un riquadro che non si è potuto leggere non
mostra zero.** Le sette letture stanno in piedi una per una (§35) e quello che
manca finisce in `letto`, che il motore trasforma in un riquadro che dichiara
di non sapere. Uno zero falso, qui, fa smettere di cercare proprio dove c'è il
buco (§12, §18, §43).

### L'esportazione, e le quattro cose che rendono un CSV leggibile

Non c'era nessuna convenzione: gli export di casa sono tabelle HTML che Excel
apre. `cntCsv` è una funzione sola perché i posti che esportano sono tre — tre
costruzioni dello stesso file diventano tre file diversi, e quello sbagliato è
quello che qualcuno ha già mandato fuori.

1. **Il BOM in testa**, altrimenti Excel non legge l'UTF-8 e gli accenti escono
   a pezzi.
2. **Il punto e virgola come separatore**, perché in italiano la virgola è il
   separatore *decimale*: con la virgola «1.234,56» diventa due colonne.
3. **I numeri con la virgola decimale**, altrimenti Excel li legge come testo e
   non li somma — e un totale che non si può fare su un'esportazione di
   contabilità è un'esportazione che non serve.
4. **Le virgolette dove servono**, raddoppiate dentro. Un nome come
   «ROSSI; MARIO» senza questa regola sposta tutte le colonne di quella riga, e
   la riga sbagliata resta credibile.

Tutte e tre le esportazioni seguono i **filtri applicati**: un file che contiene
altro rispetto a quello che si sta guardando inganna chi lo apre. E l'estratto
conto porta il **progressivo**, con il saldo di apertura del periodo in una riga
sua: è il progressivo che lo rende confrontabile con l'estratto della banca.

### La visibilità dei pannelli passa da una classe

Nove `display:none` scritti in linea sui pannelli di Contabilità erano nove
stili che il guardiano del kit conta — e giustamente, perché uno stile in linea
non risponde al kit né al tema. Sono diventati una classe (`.ct-off`) e
`selContabTab` la toglie e la rimette. Le soglie del kit sono **calate**:
quadconti da 17 a 12, anomalie da 4 a 3, storico da 5 a 4.

Trappola da ricordare: con una classe, `style.display = ''` **non** riapre il
pannello — la classe torna a nasconderlo. Si toglie la classe, non si scrive lo
stile. E due banchi che modellavano un DOM finto con `style` sono stati
aggiornati: misuravano il mondo di ieri.

### La trappola dei commenti, sedicesima volta, e due volte nello stesso giro

Scritta da me, tutte e due le volte:

1. il commento che spiega la paginazione **nominava la chiamata che stava
   vietando**, e la prova che la cerca è diventata rossa su un codice giusto;
2. il commento che spiega perché le letture non si lanciano insieme **nominava
   la costruzione che stava vietando** — e stavolta il filtro dei commenti a
   inizio riga non l'ha presa, perché era una riga *interna* di un commento su
   più righe che comincia con un apice inverso.

Due correzioni, come sempre: il commento non scrive più quelle parole, **e** la
prova guarda solo le righe di codice. Il rimedio definitivo resta quello di
§31: **non scrivere la parola vietata dentro il file che la vieta.**

### Una controprova restata verde, e la prova era debole

Tolte le righe dalla chiamata al cruscotto, la prova è restata **verde**:
cercava `righe: CRU_RIGHE` nel blocco intero, e la stessa chiave compare nella
chiamata alle anomalie cinquanta righe più sotto. Adesso guarda **dentro la
chiamata**. *Una controprova che non fa diventare rossa nessuna prova non
assolve il codice: accusa la prova* (§15, §17, §18, §19, §41, §46, §56).

### Due prove aggiornate nella REGOLA, non nel numero

- «la sotto-scheda è nell'elenco che accende i pannelli» fissava la
  **posizione** (`['quadratura','primanota','incassa'`) e non la presenza: è
  diventata rossa il giorno in cui una linguetta nuova si è messa davanti, su
  un codice giusto. Adesso cerca la chiave dentro l'elenco.
- «le rate degli incassi vivi si leggono» pretendeva una catena scritta tutta
  su una riga. Corretta **e rafforzata**: adesso pretende anche che le letture
  di `incCarica` siano tutte paginate.

### Cosa resta aperto

- **I numeri sono ancora tutti a zero**, ed è giusto: la prima nota nasce vuota,
  i saldi iniziali dei conti sono a zero, non esiste un conto di debito verso
  una compagnia né un conto dei sospesi. Il cruscotto lo dice e manda a
  crearli — è il sistema che ha finito il suo lavoro quando ha chiesto.
- **`contoEconomico`, `riepilogo` e `perCausale` leggono la testata**, ed è la
  lettura giusta: a partita doppia le due gambe di un movimento si annullano,
  quindi le righe non saprebbero dire se la giornata ha incassato o pagato. Il
  verso di un movimento lo dice la causale, e il suo importo è il totale.
- **Il motore chiede l'ora al computer in tre punti** (`giorniDa`,
  `sospesiAperti`, `anomalie`), nati con la M4 e la M5: annotati e non toccati.
- **`iam_incassi_rate` e le altre letture di `incCarica` non hanno un flag di
  parzialità per sezione**: c'è uno solo, `INC_INCERTO`, che dice «una di
  queste si è fermata» senza dire quale.

---

## 62. Fase 4-bis — le entrate sono il denaro che si muove (22/09/2026)

Rilasciata la 0.28.0, tre lenti di critica indipendenti hanno riletto il
lavoro. Hanno confermato le correzioni e trovato **cinque difetti che
restavano**, due dei quali scritti da me nella 0.28.0 stessa. Uno l'avevo
dichiarato «la lettura giusta» nel §61, e non lo era.

| pezzo | dove |
|---|---|
| la regola nuova | `denaroDi` in `tariffe/motore/contabilita.js`, usata da `giornata` e `riepilogo` |
| le tre strade in cui una rata è già in contabilità | `anomalie`, controllo 2 |
| prove in Node | `server/verifica/contabilita.test.mjs` — **93** (erano 89) |
| l'orologio unico, i dati delle anomalie, la parzialità nel CSV | `iam/index.html` |
| prove sulle schermate | `iam/verifica/cruscotto-contabile.test.mjs` — **13** (erano 10) |

### Il difetto grosso: lo stesso premio contato due volte

Nel §61 avevo scritto, come cosa che resta aperta e va bene così:

> *«`contoEconomico`, `riepilogo` e `perCausale` leggono la testata, ed è la
> lettura giusta: a partita doppia le due gambe di un movimento si annullano,
> quindi le righe non saprebbero dire se la giornata ha incassato o pagato.»*

Il ragionamento è corretto e la conclusione è sbagliata, e il caso che lo
dimostra è arrivato con la Fase 3. Mettere una polizza **a copertura** scrive:

```
Dare  Sospesi clienti      Avere  Conto compagnia
```

Due conti che denaro non sono: in cassa non entra un euro. Ma la causale
`apertura_sospeso` ha segno **entrata** e la testata porta il premio intero.
Poi il cliente paga, `recupero_sospeso` è un'altra causale **entrata**, e:

| | dice | è |
|---|---|---|
| entrate della giornata su un premio da 300 | **600,00** | 300,00 |

**Lo stesso premio entrato due volte**, su una schermata di cassa, senza
nessun rosso.

> **Le due gambe si annullano solo se si guardano tutte. Guardando solo quelle
> che toccano un conto di DENARO, la risposta c'è ed è l'unica vera:** Dare su
> un conto di denaro è entrato, Avere è uscito. Un movimento le cui gambe
> stanno tutte su crediti e debiti non ha né entrate né uscite: è una
> **scrittura di competenza**, e dirlo è la differenza fra una contabilità e un
> elenco di numeri.

`denaroDi` è quella funzione. `LIQUIDE` (cassa, banca, conto assicurativo,
transitorio) è **dichiarato**, non ricavato per sottrazione: una lista «tutto
tranne» conterebbe come liquidità una tipologia aggiunta domani senza che
nessuno l'abbia deciso.

E un conto che **non si è potuto leggere non si presume denaro**: si conta zero
e si dichiara. Presumerlo rimetterebbe dentro il difetto che questa funzione
esiste per togliere.

### Il secondo difetto mio: due numeri sulla stessa giornata

Nella 0.28.0 avevo fatto leggere la ripartizione per conto dalle righe e
lasciato l'intestazione sulla testata. Risultato: **nella stessa scheda, il
totale in cima e la somma dell'elenco sotto non tornavano** — e un conto di
debito compariva come denaro uscito. Adesso passano tutti e due da `denaroDi`,
e c'è una prova che pretende che i due numeri coincidano.

I conti che denaro non sono **restano nell'elenco**: sapere che quel giorno è
nato un debito verso una compagnia serve, e sta in una riga sua.

### Le anomalie non vedevano la Fase 2

Il controllo «rate incassate che il conto non sa» guardava
`iam_movimenti.titolo_id` — la **testata**. Un incasso di tre rate scrive un
movimento solo: le altre due risultavano «mai entrate», e un clic su «Portale
in contabilità» avrebbe fatto nascere un secondo debito verso la compagnia per
un premio entrato una volta sola.

È **la stessa correzione già fatta a `incDaPortare` il 22/09** (§59) e qui
rimasta indietro: dove sta scritto che una rata è entrata in contabilità sono
**quattro** posti — la testata, le righe del movimento, le rate dell'incasso
della Fase 2, i sospesi della Fase 3. Guardarne uno solo li dichiara tutti
mancanti.

E `attiva: false` non chiude niente: una rata di un incasso **stornato** è
tornata aperta e deve ricomparire. C'è una prova per tutti e quattro i casi.

### Il cruscotto scriveva «Niente da sistemare» e non era vero

Chiamava `anomalie()` con meno dati della linguetta accanto — niente rate
incassate, niente quadrature, niente portafoglio — quindi ne trovava meno e a
volte nessuna.

> **Due elenchi della stessa cosa che dicono numeri diversi non sono due viste:
> uno dei due mente.** E a mentire era quello che diceva «tutto a posto».

Adesso riceve gli stessi dati. E le quattro letture accessorie che non
riescono **non si dichiarano superate**: finiscono in `CRU_ANOM_CIECHE`, e il
riquadro scrive *«Alcuni controlli non si sono potuti fare: … Non vuol dire che
lì sia tutto a posto»*. È §12/§18/§33 applicati a un «niente da segnalare».

### Un orologio solo

`pntOggi`, `gioData`, `recOggi` e `incOggi` costruivano la data con
`toISOString()` su una data locale — che fra mezzanotte e le due dà **ieri**
(§44) — mentre `cruOggi` usava `cntOggiIso()`, che conta sui numeri. Due strade
diverse sulla stessa contabilità vogliono dire che il cruscotto e le linguette
dicono **due giorni diversi sugli stessi movimenti**, e la quadratura di
giornata confronta un giorno con un altro. Adesso è uno.

### Un file scaricato vive da solo

Le tre esportazioni non dichiaravano la parzialità che la schermata dichiarava.
Un CSV esce dallo schermo che lo spiegava e resta su un computer per mesi:
l'avviso sta **in testa al file**, prima delle intestazioni, perché è la prima
riga che si legge aprendolo.

Quella dei premi da recuperare è la più delicata, e lo scrive: **con dei
recuperi mancanti il residuo esce più alto del vero**, e quel foglio farebbe
sollecitare chi ha già pagato. Per farlo funzionare `REC_PARZIALE` doveva
esistere: `recPagina` alzava la bandiera in nessuno dei due casi in cui si
ferma — quando la lettura cade e quando sfonda i cinquanta giri. *Una bandiera
che nessuno alza è una dichiarazione che non arriva mai.*

### La lezione, e vale oltre questo lavoro

> **Una conclusione tecnicamente corretta su un caso può essere sbagliata su
> un altro che non si era in mente.** «Le due gambe si annullano» è vero, e da
> lì avevo concluso «quindi si legge la testata». La domanda che non mi ero
> fatto era: *quali* gambe. La critica indipendente l'ha fatta.
>
> E il difetto era **latente**: si accende alla prima polizza messa a
> copertura, cioè il giorno in cui qualcuno userà davvero la Fase 3.

### Cosa resta aperto

- **`contoEconomico` legge ancora la testata** per ricavi e costi, ed è
  corretto: la competenza economica la decide `incide_su_utile` della causale,
  che è una proprietà della testata. I suoi `transito_entrate`/`transito_uscite`
  però hanno lo stesso difetto appena tolto: vanno portati sulle gambe di
  denaro, ed è un lavoro a sé perché cambia il numero «quanto denaro dei
  clienti è ancora in casa».
- **`e_quadrabile` esiste dalla Fase 1 e non lo guarda nessuno**: si chiede la
  quadratura anche di conti che per costruzione non si possono contare.
- **`fondoCassa` somma casse di natura diversa in un numero solo**: i contanti
  dei clienti e quelli dell'agenzia non sono lo stesso denaro (art. 117 CAP).
- **`eliminabile` non guarda le quadrature**, che sparirebbero in cascata con
  il conto.
- **`PNT_*` e `CNT_*` sono `let`**: le prove che iniettassero uno stato finto
  scriverebbero in una variabile e il codice leggerebbe l'altra (§17). Le
  nuove (`CRU_*`, `PNT_PARZIALE`, `CNT_PARZIALE`, `REC_PARZIALE`) sono `var`.
- **La regola del CSV sta in pagina, non nel motore**: è l'unica cosa che esce
  di casa, e §5 dice che va nel motore.

---

## 63. Lo scadenzario: la proroga di 15 giorni, e il rinnovo che si riconosce (22/09/2026)

> «riusciamo ad inserire nello scadenzario dei filtri rapidi che fanno vedere le
> polizze non rinnovate, che sono vicine ai 15 giorni, che sono nei 15 giorni e
> che sono fuori i 15 giorni? tutte le polizze hanno una proroga di 15 giorni.
> Ovviamente fa fede la data scadenza polizza, o scadenza rata e non la data
> d'incasso.» — Francesco.

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/scadenzario.js` |
| prove in Node | `server/verifica/scadenzario.test.mjs` — **22**, con cinque controprove |
| la vista che porta targa, sospensioni e `sostituisce_id` | `supabase/migrations/20260922h_scadenzario_targa_sospensioni.sql` (applicata) |
| la schermata | blocco `rin*` in `index.html`, `#page-scadenzario` |
| prove nella pagina | blocco «scadenzario» in `ui-test.mjs` — **506** |

### Le tre misure che hanno deciso il lavoro

Prese sul database vero prima di scrivere una riga.

| | |
|---|---|
| polizze non annullate | **4.003** — e la lista ne leggeva **1.000** |
| scadute | 1.665 |
| con `sostituisce_id` valorizzato | **0 su 4.003** |
| scadute che hanno già una polizza nuova (stessa targa o stesso cliente+ramo) | **1.018** |
| scadute davvero senza successore | **647** |
| rate aperte | 418 — 117 già scadute, 19 dentro i 15 giorni, 99 fuori |

### 1. La data che fa testo, e quella che non c'entra

Su una quietanza di frazionamento semestrale il portafoglio vero dice
`data_decorrenza` **2026-09-02** e `data_scadenza` **2027-03-02**: la seconda è
la fine del periodo che quella rata copre. **Per una rata la scadenza è la
DECORRENZA** — leggere l'altra vorrebbe dire credere che una rata scaduta venti
giorni fa scada fra sei mesi, cioè togliere dal lavoro di oggi tutto quello che
c'è da incassare.

E l'incasso non entra da nessuna parte: c'è una prova che legge il sorgente del
motore e diventa rossa se quel campo ricompare.

### 2. La proroga: «scaduta» non è «scoperta»

Quindici giorni per tutte le polizze, dichiarati da Francesco (è il termine di
mora dell'art. 1901 c.c. per le rate successive alla prima). Quattro fasce che
**non si sovrappongono** — è la regola di §22, con i confini spostati dal
rinnovo alla copertura:

```
più avanti  · oltre i 15 giorni          · non è ancora lavoro
vicine      · da 15 giorni a 0           · si chiama adesso
in proroga  · scaduta da 1 a 15 giorni   · SCADUTA E ANCORA COPERTA
scoperte    · scaduta da più di 15 gg    · la proroga è finita
```

Il giorno 0 sta fra le «vicine»: oggi la copertura c'è ancora. Il −15 è
l'ultimo giorno coperto, il −16 il primo scoperto. C'è una prova che percorre
81 giorni e pretende che ognuno cada in **una** fascia sola, e un'altra che
somma le quattro fasce e pretende che tornino col totale.

**Il rosso è riservato a chi la copertura l'ha persa.** Una polizza scaduta da
sette giorni con otto giorni di proroga davanti in rosso si legge come un
cliente perso, e invece è un cliente che si salva con una telefonata.

La proroga si può stringere (`opz.giorni`) il giorno in cui una compagnia ne
dichiarerà una diversa: è un parametro, non una riscrittura.

### 3. «Non rinnovata» non si legge da `sostituisce_id`

È la parte che conta di più, e nasce da una misura che non tornava.

> Quella colonna è **vuota su tutte e 4.003 le polizze**, e la schermata la
> leggeva: dichiarava non rinnovate tutte e 1.665 le scadute. Ma **1.018 di
> quelle hanno già la loro polizza nuova.** Un elenco di lavoro con due terzi
> di rumore non lo guarda più nessuno dopo la terza telefonata a vuoto — e
> allora non si guardano nemmeno i 647 veri.

Non è un difetto di chi ha importato: PRIMA non ha tacito rinnovo, alla scadenza
la polizza storna e ne **nasce una nuova** (§14, regola 4), e il tracciato non
dice quale sostituisce quale.

Quindi il successore si **riconosce**, e ha tre risposte — la stessa regola dei
codici produttore (§19) e del catalogo prodotti (§39):

| risposta | come |
|---|---|
| **Rinnovata** | `sostituisce_id`: qualcuno l'ha scritto. Vince sempre |
| **Sembra rinnovata** | c'è una polizza nuova a cavallo della scadenza, e si dice quale e perché |
| **Non rinnovata** | non se n'è trovata nessuna |

**Un indizio non è una dichiarazione**, e le due parole sono diverse in
schermata. Chiamarlo rinnovo nasconderebbe un cliente da richiamare, che è
l'errore più caro dei due: una telefonata a chi ha già rinnovato costa due
minuti, un cliente perso costa un anno di premio.

**La targa viene prima del cliente**, perché è lo stesso veicolo e non una
somiglianza; il **nome non si guarda mai**, e c'è una prova che legge il
sorgente per dimostrarlo. Una targa sotto le cinque cifre utili (`N.D.`, `-`)
non è una targa: senza quella riga mezzo portafoglio si aggancerebbe a se
stesso.

E la finestra è dichiarata: da 5 giorni prima della scadenza (un rinnovo si
emette anche in anticipo) a 30 dopo (i 15 di proroga più il ritardo di chi paga
tardi). Sono i valori con cui la misura è stata fatta.

### 4. La regola trovata contando, non ragionando

La prima stesura diceva «Non rinnovata» anche a una polizza che scade fra
dieci mesi. È letteralmente vero — nessun successore esiste, ed è vero per tutto
il portafoglio sano — ed è una risposta vera che porta a fare la cosa sbagliata.

> **«Non rinnovata» si dice solo a una polizza la cui scadenza è arrivata, o
> sta arrivando.** Le altre sono **non ancora scadute**, che è un quinto stato
> e si chiama col suo nome.

L'ha trovata un conteggio in una prova del browser (5 invece di 4), non la
rilettura. È §12 e §18 visti dall'altro lato: lì il difetto è dire «non c'è»
quando non si è potuto leggere, qui è dire una verità che si legge come
un'istruzione operativa sbagliata.

### Il tetto delle mille righe, quarta volta

`.limit(2000)` su `quote_scadenzario`: PostgREST ne manda **mille** per
richiesta qualunque numero ci sia scritto (§50, §53, §57, §61). I contatori
delle fasce erano calcolati su **un quarto** del portafoglio, e nessun numero lo
diceva. Adesso si pagina, e quando la paginazione si ferma davvero **la
schermata lo scrive**: un totale parziale che non si dichiara è il difetto
rimesso dentro.

Il taglio che resta è solo nel **disegno**: la tabella ne mostra 500 e lo dice.
I contatori contano tutto.

### Due cose che non si perdono

- **Una rata la cui polizza non si vede non sparisce: si conta** (§55). La
  visibilità non si riscrive — una rata si vede se si vede la sua polizza, e la
  giunzione in memoria lo garantisce da sé.
- **Se le rate non si leggono, la schermata resta in piedi e lo dice** (§35,
  §12, §18): le polizze restano, e accanto al totale c'è scritto che le rate
  mancano. Senza quella riga la lista sembrerebbe completa.

### L'ordine: più vicino a oggi, nei due versi

Ordinare per data e basta mette in cima la polizza scaduta nel 2023, che è la
riga meno utile che ci sia. Si ordina per **distanza da oggi**: una scadenza fra
due giorni e una scaduta due giorni fa sono le due cose da fare adesso. La prova
che pretendeva l'ordine cronologico misurava il mondo di ieri, e si è aggiornata
la regola (§15, §16, §33, §35, §42).

Stessa cosa per il numero sulla voce di menu: contava tutto entro 60 giorni,
comprese le polizze scadute tre anni fa. Un avviso che comprende la storia non è
un avviso; adesso conta le vicine e quelle in proroga.

### `create or replace view` butta via `security_invoker`

**La trappola più cara di questa giornata, e non l'avrebbe presa nessuna prova
del repository.** Sostituita la vista per aggiungerle tre colonne, `reloptions`
è tornato **vuoto**: la vista girava con i diritti di chi la possiede invece che
con quelli di chi legge, cioè **scavalcando le politiche**. Nessun errore,
nessuna schermata rotta — solo un collaboratore che dallo scadenzario avrebbe
visto il portafoglio di tutta l'agenzia.

Misurato subito dopo l'applicazione e rimesso con `alter view … set
(security_invoker = true)`, che adesso sta nel file della migrazione **e nel
suo rollback**. Vale per qualunque `create or replace view` in questo
repository: *dopo averla sostituita, si rileggono le sue opzioni.*

### Togliere un tetto nascosto fa emergere il costo che quel tetto nascondeva

Misurato **dopo** aver tolto il `.limit`, e non l'avrebbe detto nessuna prova.
La vista porta una colonna `sostituzioni` che conta le polizze con
`sostituisce_id = questa`, e su quella colonna **non c'era un indice**: il
conto era una scansione completa della tabella per ogni riga.

| | |
|---|---|
| mille righe, prima | **896 ms** — `Seq Scan`, `loops=1000` |
| mille righe, dopo l'indice | **3,2 ms** — `Index Only Scan`, `Heap Fetches: 0` |

Il difetto c'era da sempre e non si vedeva perché la schermata leggeva solo la
prima pagina. Leggendole tutte e quattro sarebbe passata da 0,9 a **3,5
secondi**, cioè si sarebbe consegnata una schermata corretta e lenta — e la
lentezza la scopre chi lavora, non chi scrive.

> **Quando si toglie un tetto, si rimisura il costo nello stesso lavoro.**
> L'indice sta in `supabase/migrations/20260922i_scadenzario_indice_sostituisce.sql`
> ed è parziale, perché quella colonna oggi è vuota su tutte e 4.003 le righe.

### La trappola dei commenti, diciassettesima volta — e il rimedio vero

Le due prove che vietano al motore di leggere la data d'incasso e di
riconvertire una data via UTC sono diventate rosse **sul motore corretto**,
perché i miei commenti nominavano quelle due cose. Il filtro che toglie i
commenti a inizio riga non le ha prese: erano righe *interne* di un commento su
più righe (§33, §61).

Due correzioni, come sempre: il commento non scrive più quelle parole, **e** la
prova adesso toglie i commenti leggendo il file carattere per carattere e
tenendo lo stato «sono dentro un commento» — mai una regex globale, che su
`index.html` si mangia 450.000 caratteri (§12). Ma il rimedio che funziona
resta quello di §31: **non si scrive la parola vietata dentro il file che la
vieta.**

### Cosa resta aperto

- **Nessun rinnovo è dichiarato.** «Riquota» apre il preventivatore e non scrive
  `sostituisce_id`: finché quel collegamento non si scrive all'emissione, ogni
  rinnovo resta un indizio. È il pezzo che chiude il giro, e tocca l'emissione.
- **La proroga è una sola per tutte le compagnie.** Il motore accetta un
  parametro, ma nessuno ha ancora dichiarato una proroga diversa per una
  compagnia: il giorno in cui succede, è una riga in `quote_compagnie` e una in
  chi chiama.
- **Le polizze sospese sono zero**, quindi la scadenza vera oggi coincide con
  quella scritta: la regola c'è (§41) e si accenderà alla prima sospensione.
- **La tabella mostra 500 righe.** Con i filtri non si sente; se un giorno si
  sentisse, la strada è la paginazione della vista, non un numero più grande.

### 63-bis. Nove difetti trovati da una rilettura ostile, lo stesso giorno

La 0.30.0 era verde: 22 prove Node, 506 nel browser, cinque controprove. Tre
lenti indipendenti l'hanno riletta cercando **numeri credibili e falsi**, e ne
hanno trovati nove — ognuno riprodotto eseguendo il codice, non leggendolo.
È la seconda volta in due giorni (§62), e la lezione è la stessa: *una suite
verde dice che il codice fa quello che chi l'ha scritto aveva in mente.*

| difetto | che cosa diceva di falso |
|---|---|
| il filtro «Solo non rinnovate» azzerava la sua stessa nota | acceso, dichiarava «0 sembrano rinnovate» — al posto di 1.018 |
| i totali sommavano premio annuo di polizza e importo di rata | **79.794,89 €** contati due volte; un numero che non è né il premio in scadenza né quello da incassare |
| «N rate non si vedono» su rate di polizze **annullate** | mandava a cercare un guasto di permessi che non c'era (28 righe) |
| la **prima rata** trattata come una quietanza | «ancora in copertura» su una copertura **mai partita** (art. 1901 c.c.) |
| il ripiego cliente+ramo agganciava anche con targhe **diverse** | **34 clienti** sparivano dall'elenco di quelli da richiamare |
| «ancora 0 gg di proroga» l'ultimo giorno | la telefonata più urgente dell'elenco si legge come «è finita» |
| due caricamenti insieme sommavano i contatori | «1 rata fuori» diventava «2» — e 2 ha l'aria di un dato |
| le letture paginate senza `order` | una riga aggiornata mentre si legge compare due volte o sparisce |
| il rinnovo cercato sulla scadenza **contrattuale** | una polizza sospesa e rinnovata risultava «non rinnovata» |

Cinque cose da portarsi via.

**1. Un filtro che si conta addosso si spegne da solo.** Il commento sopra
`rinFiltraSenzaFascia` diceva perché la FASCIA sta fuori da quell'insieme —
«restringendolo anche per fascia, la fascia scelta direbbe il suo numero e le
altre zero» — e il filtro del rinnovo era dentro. *La regola era scritta e
applicata a metà*, ed è la stessa forma di §53-bis: un controllo che non prova
la cosa che deve garantire è una dichiarazione di intenti.

**2. Due quantità dello stesso contratto non si sommano mai.** Una rata è una
FETTA del premio annuo della sua polizza. È §36 («scrivere la rata nella
colonna dell'annuo farebbe sommare mele e pere») e §59 («premi emessi» e «di
cui incassati» restano due tessere), presi in flagrante nello stesso giorno in
cui li ho citati.

**3. La proroga e l'anticipo sono due numeri, non uno.** La proroga è una
proprietà del contratto — quanti giorni la copertura regge DOPO. L'anticipo è
un orizzonte di lavoro — quanti giorni PRIMA si telefona. Sono la stessa cifra
per caso. Tenendoli insieme, una prima rata (proroga zero) che scade fra otto
giorni finiva fra le «più avanti», cioè fuori dal lavoro di oggi.

**4. Due caricamenti in volo sono la normalità, non un caso di laboratorio.**
`showPage('scadenzario')` ne fa partire uno senza aspettarlo. Da qui la regola:
**i contatori si ASSEGNANO alla fine, mai si sommano man mano**, e ogni giro
prende un numero — chi torna e non è l'ultimo partito non scrive niente.

**5. Una prova con un campione sbagliato assolve il codice.** La prova «un
rinnovo emesso tre giorni prima si riconosce» dava al successore una targa
DIVERSA: passava per la strada del cliente, cioè misurava proprio il caso che
adesso (giustamente) non aggancia più. Il campione è stato corretto, non la
regola.

### La domanda che NON ho deciso io

> **I 15 giorni di proroga valgono anche sulle polizze senza tacito rinnovo?**

Misurato: `tacito_rinnovo` è falso su **3.913 polizze su 4.003**, e delle 83
oggi «Nei 15 giorni» ben **77** sono senza tacito. Per l'RC Auto il comporto di
quindici giorni è di legge; per un contratto di un altro ramo senza tacito
rinnovo, alla scadenza il contratto semplicemente finisce.

Francesco ha dichiarato «tutte le polizze hanno una proroga di 15 giorni», e la
sua dichiarazione vale più di una mia deduzione: **non si è cambiato niente.**
Ma le due letture portano a due elenchi diversi, e cambiarla direbbe a 77
clienti che sono scoperti. Il motore accetta già `opz.giorni` e `opz.anticipo`:
il giorno in cui la risposta arriva, è un parametro — non una riscrittura.

---

## 64. I sospesi: la modalità di pagamento può essere una persona (22/09/2026)

> «Polizza emessa da ODDO FRANCESCO da 300 € mi dovrei trovare tra le modalità
> di pagamento un nome di un Collaboratore. […] In una sezione apposita, che
> chiamiamo appunto sospesi, dovrei trovare lì, divise in maniera chiara, Oddo
> Francesco con tutte le eventuali polizze da andare ad incassare. […] Nella
> parte gestionale devo avere la possibilità di inserire le voci di modalità di
> pagamento, e decidere quali devono essere contabilizzate e quali devono
> invece finire in un'apposita voce dei Sospesi.» — Francesco.

| pezzo | dove |
|---|---|
| il vocabolario | `supabase/migrations/20260922j_modalita_pagamento.sql` (applicata) |
| le regole | `Contabilita.vocabolario`, `Contabilita.daIncassare` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **100** (erano 93) |
| dove si dichiarano le voci | Strumenti › Conti e causali › **Modalità di pagamento** (`cntMod*` in `iam/index.html`) |
| la schermata dei sospesi | `#contab-panel-sospesi`, blocco `spr*` in `iam/index.html` |
| le tendine del preventivatore | blocco `mez*` in `index.html` |
| prove | `iam/verifica/sospesi-premi.test.mjs` — 13, `ui-test.mjs` — **510** |

### La misura che ha deciso il lavoro

| | |
|---|---|
| posti in cui era scritto il vocabolario | **sei** — due CHECK del database, `Contabilita.MEZZI`, `Flusso.MEZZI`, `TIT_MEZZI`, `PF_MEZZI` |
| rate da incassare | **418**, per 98.488,84 € |
| di cui **non dicono con che mezzo** | **380**, per 88.600,71 € |
| collaboratori | 17, di cui 16 attivi |

Una voce che si aggiunge toccando sei posti è una voce che nessuno aggiunge.

### Il vincolo chiuso è diventato una chiave esterna

Il `CHECK` a nove valori non ammetteva «Oddo Francesco»: non si trattava di
allargarlo, perché l'elenco deve poter crescere da una schermata. Al suo posto
una **chiave esterna** verso `iam_modalita_pagamento`, che fa di più — il
codice deve esistere davvero — e con `on delete restrict` impedisce di
cancellare una voce che ha delle righe appese. **«Non si cancella, si spegne»
(§26) smette di essere una raccomandazione.**

Due indici, perché senza, cancellare una voce leggerebbe per intero 3.205 rate
e 4.019 polizze.

### Le due regole del vocabolario

1. **`contabilizza` dice se il denaro è in casa subito.** Non è una novità: è
   il campo `immediato` che il motore ha da sempre — i contanti sono denaro in
   mano, tutto il resto arriva dopo (§32). Qui diventa una cosa che si cambia
   senza toccare il codice.
2. **Una voce può essere una PERSONA, e allora non può essere «subito».** Se il
   premio ce l'ha in mano lui, in cassa dell'agenzia non c'è. È un `CHECK`, non
   un avviso della schermata: la schermata è una delle strade, non l'unica.

E i collaboratori **non si seminano**: una persona diventa una modalità di
pagamento quando qualcuno decide che tiene i premi, e quella è una decisione
(§8.1, §19).

### Che cos'è un sospeso, e le tre cose che non lo sono

Un sospeso è una rata **emessa** il cui denaro non è ancora in casa, e la voce
dice **chi lo tiene**. Non lo sono:

- **una rata già incassata** — è un fatto avvenuto, non un lavoro; dove il
  denaro sia poi finito lo dicono gli incassi da accreditare (§32);
- **una rata in contanti** — si incassa allo sportello e va in cassa. È la
  richiesta, testuale: *«le polizze pagate Contanti devono essere
  contabilizzate contanti»*;
- **una rata di cui non si sa la modalità** — quella non si mette sotto
  nessuno. Sta in un gruppo suo, «Da dichiarare», perché attribuirla vorrebbe
  dire **inventare a chi chiedere dei soldi**. Sono 380 su 418, ed è il lavoro
  da fare.

Tutte e tre **si contano e si dichiarano**: un elenco che le fa sparire non
dice quante rate restano fuori e perché.

### «Fermo da troppo» si misura su quella voce

Il POS ci mette due giorni, un collaboratore trenta: lo stesso numero di giorni
non vuol dire la stessa cosa. E al giorno che quella voce ci mette non è ancora
in ritardo — dirlo il giorno stesso vorrebbe dire sollecitare un bonifico
partito stamattina. Senza una data di riferimento **nessun giudizio si dà**:
si contano i giorni e basta.

### La schermata non scrive l'incasso

«Scaricare» un sospeso è registrare l'incasso, e quella schermata esiste già
(Fase 2, §59): si sceglie il conto e anche **un mezzo diverso** da quello
dichiarato dalla compagnia — che è la richiesta. Rifare qui la scrittura
sarebbe la seconda regola su come nasce un movimento. C'è una prova che vieta
a quel blocco di scrivere su `quote_titoli`, `iam_movimenti` e `iam_incassi`.

### Il campo si cerca scrivendo, e non inventa

Con nove voci un `prompt` numerato bastava; con i collaboratori dentro
diventano ventisei, e nessuno conta fino a ventisei. Adesso è un `input` con un
`datalist` — nativo, funziona sul telefono, nessun componente nuovo da
mantenere — e **il codice sta in un campo nascosto**: quello che si scrive è il
nome, e un nome che non corrisponde a nessuna voce **non diventa un codice
inventato** (§8.1). Il campo diventa rosso e il salvataggio lo dice.

E c'è un **ripiego**: finché la tabella non è stata letta, o se la lettura non
riesce, si vedono le nove voci di sempre. *Una tendina vuota è peggio di una
tendina corta.*

### Una sostituzione globale che ha toccato anche il ripiego

Portando le etichette sul vocabolario ho sostituito le nove occorrenze di
`TIT_MEZZI[…]` con una regex. Due di quelle stavano **dentro il ripiego**, che
per definizione non deve passare dal vocabolario: `mezNome` ha cominciato a
chiamare se stessa all'infinito. È §12 in un'altra forma — *una sostituzione
globale non sa distinguere la regola dal suo ripiego* — e l'ha presa il
controllo del file, non la rilettura.

### Cosa resta aperto

- **Nessuna voce è ancora una persona**: la tabella nasce con le nove di
  sempre. Il primo collaboratore lo dichiari tu, ed è il punto — il sistema ha
  finito il suo lavoro quando ha chiesto.
- **380 rate su 418 non dicono la modalità.** Finché è così, il gruppo «Da
  dichiarare» è quasi tutto l'elenco. Si sistemano dal portafoglio o dai
  titoli, una alla volta o cambiando la voce sulla polizza.
- **Cambiare la voce non toglie ancora un movimento dalla cassa**: oggi le rate
  di cui parliamo sono APERTE (non incassate), quindi in cassa non sono mai
  entrate. Il giorno in cui si cambierà la voce di una rata **già incassata e
  già contabilizzata**, il movimento va stornato — e lo storno esiste (§59),
  ma non è ancora agganciato a questo cambio.
- **`Flusso.MEZZI` resta una lista sua**: traduce i codici della compagnia nei
  nostri, ed è un'altra domanda. Ma adesso che il vocabolario può crescere, un
  codice tradotto verso una voce spenta non se ne accorgerebbe nessuno.

---

## 65. Una rata sta in un elenco solo (22/09/2026)

Quattro difetti trovati da una rilettura ostile della 0.31.0, una regola
dettata da Francesco guardando una sua polizza, e tre richieste di forma che
di forma non erano.

| pezzo | dove |
|---|---|
| la regola nuova | `righe()` in `tariffe/motore/scadenzario.js` — `rate_con_modalita` |
| gli avvisi, in una funzione sola | `rinAvvisi` / `rinAvvisiHTML` in `index.html` |
| la grafica dei Sospesi | blocco `.spr-*` e `sprRender`/`sprCard`/`sprRighe` in `iam/index.html` |
| prove | `scadenzario.test.mjs` (30), `sospesi-premi.test.mjs` (15), `ui-test.mjs` (**515**) |

### La regola di Francesco, e perché vale più di come è arrivata

> «la polizza che ha data incasso pos 17.09 non può risultare nei 15 perché si
> deve solo scaricare il sospeso pos»

La ragione l'aveva già scritta lui stesso il giorno prima: la modalità che
arriva dal flusso è **«quello dichiarato in compagnia per METTERE IN COPERTURA
la polizza»**. Quindi:

> **Se una rata dichiara una modalità di pagamento, il cliente NON è scoperto.**
> Quel premio non è un buco di copertura: è denaro che deve ancora arrivare in
> agenzia, cioè un sospeso, e da lì si scarica.

Senza quella riga la stessa rata comparirebbe in **due elenchi che dicono cose
opposte** — «il cliente è scoperto» nello scadenzario, «denaro in arrivo» nei
sospesi — e chi li guarda non ha modo di sapere quale dei due ha ragione.
Adesso ogni rata aperta sta in **uno** dei due, e i due si sommano: è la stessa
disciplina dei tre conti dell'estratto conto (§24), dove una rata sta in uno
solo per costruzione.

Quello che resta nello scadenzario è la rata di cui **non si sa niente**:
nessuna modalità dichiarata vuol dire che nessuno ha detto come è stata pagata,
e quello è un buco vero. E quelle che si spostano **si contano e si dicono**
(`rate_con_modalita`, `importo_con_modalita`): una riga che sparisce da un
elenco senza lasciare un numero è §55 di nuovo.

### Quattro difetti della rilettura ostile

1. **Gli avvisi sparivano quando l'elenco era vuoto** — cioè proprio quando
   l'elenco è vuoto *perché* la lettura è andata male. Adesso `rinAvvisi()` è
   **una funzione sola**, chiamata dai due rami di `rinRender` e dall'export:
   tre costruzioni degli stessi avvisi diventano tre avvisi che un giorno
   diranno cose diverse.
2. **L'Excel accusava un problema di permessi su polizze annullate** — la
   correzione del 22/09 era arrivata alla schermata e non al file scaricato,
   che vive da solo per mesi (§62).
3. **Una lettura fallita lasciava in schermata i numeri di prima**, che si
   fanno credere aggiornati. Adesso il `catch` svuota lo stato e scrive perché.
4. **Il numero sul filtro rapido non era quello delle righe che il filtro
   produce**: si contava su un insieme e si disegnava sull'altro.

### La grafica: una classe che non esiste non dà un errore

> «non riusciamo a sistemare la visualizzazione di questa parte? si vede tutto
> un pò confusionario» — Francesco, sulle Modalità di pagamento.

Non era una scelta estetica sbagliata. Misurato: il blocco scriveva `cl-r`,
`cl-main`, `cl-nome`, `cnt-pill`, `cnt-card-t/-v/-s`, e **nessuna di quelle
esiste** nel foglio di stile di IAM. Le classi vere sono `cnt-r`, `cnt-nome`,
`cnt-sotto`, `cnt-tag`, `cnt-k/-v/-s`.

> **Una classe che non esiste viene ignorata in silenzio.** Nessun errore,
> nessuna pagina rotta: la riga esce nuda e chi la guarda pensa a un disegno
> fatto male. È la stessa firma del gettone che non risolve (§44) e della
> regola chiusa dentro un pannello (§58): l'unico modo di accorgersene è
> **misurarlo**.

Adesso c'è una prova che lo misura: prende ogni classe prefissata che il blocco
dei Sospesi scrive e pretende di ritrovarla nel foglio di stile. La controprova
(rimessa `cl-r`) la fa diventare rossa. E `#contab-panel-sospesi` è entrato
nell'elenco delle schermate che prendono i gettoni del kit — l'elenco cresce,
non cala (§31).

### Due cose tolte, e nessuna era un doppione da tenere

**Il caricamento dei file dai Sospesi.** Il 20/09 i due caricamenti si erano
*spostati* dentro Sospesi invece di sparire, e §33 diceva che una schermata in
uso non si spegne perché ne è nata una migliore. Francesco ha chiesto di
toglierli, ed è una decisione, non un difetto. La regola che contava —
**niente di spento** — resta e si misura: quello che era già stato caricato sta
in `sessioni_giornaliere.sospesi_json`, si rilegge da lì, e continua ad
alimentare Scrivania, Anomalie e Storico. `loadSospesi` e `loadIncassi` sono
state **cancellate**, non lasciate dentro spente: due lettori di file senza un
bottone che li chiami sono il guasto §1.

**Il tasto «Importa il portafoglio» dal Portafoglio.** Era stato messo lì il
18/09 perché la barra da ventuno voci lo nascondeva (§15). Adesso
l'importazione ha la sua voce nel menu di IAM (Strumenti › Preventivatore),
che è dove Francesco la cerca: due porte per una schermata che si usa una
volta al mese sono una porta di troppo. La **pagina** non è stata toccata —
`#page-importa-flusso`, la sua porta in `PAGINE_DA_AVVIARE` e `nav-import`
restano, altrimenti la voce di menu aprirebbe un riquadro vuoto (§6b).

Tutte e tre le prove che sorvegliavano il mondo di ieri si sono aggiornate
**nella regola, non nel numero** (§15, §16, §33, §35).

### Cosa resta aperto

- **Le rate senza modalità restano nello scadenzario**, ed è giusto: 380 su
  418 non dicono come sono state pagate, e quello è il lavoro da fare.
- **Il caricamento da file non torna**: se un giorno servisse di nuovo, il
  codice sta nella storia di questo commit, non nel file.

### Il pagamento lo dicono le rate, e una spesa non si somma al conto (22/09/2026)

Due segnalazioni di Francesco nello stesso pomeriggio, e sotto avevano la
stessa forma: **un dato che si digita a mano e nessuno riallinea**, e **una
domanda la cui unica risposta onesta non esisteva nell'elenco**.

| pezzo | dove |
|---|---|
| lo stato del pagamento, dedotto | `Contabilita.statoPagamento` in `tariffe/motore/contabilita.js` |
| i conti di costo e di ricavo | `TIPOLOGIE` e `CONTI_MINIMI` nello stesso file |
| il rifiuto di una spesa su un conto corrente | `righeSemplici` + `causaleIncide` |
| il vincolo allargato | `supabase/migrations/20260922k_conti_costo_e_ricavo.sql` (applicata) |
| le rate lette dal portafoglio | `pfStati` in `index.html` |
| prove | `contabilita.test.mjs` (**107**), `ui-test.mjs` (**516**) |

#### 1. «È inutile mettere se un pagamento è sospeso oppure annullato»

Aveva ragione, e la misura lo dice meglio di qualunque ragionamento:

| | |
|---|---|
| polizze che dicono «pagato» | **3.946 su 4.079** |
| di quelle, **senza nemmeno una rata** | **1.444** |
| di quelle, con rate ancora **aperte** | **317** |
| polizze che dicono «sospeso» e hanno tutte le rate incassate | **43 su 51** |
| **in disaccordo con le proprie rate** | **364** |

> **Un flag si dimentica, una data no.** Il pagamento lo raccontano le rate,
> che si incassano una alla volta e lasciano la data; una tendina da tenere
> allineata a mano non lo racconterà mai — e il numero sbagliato ha
> esattamente l'aria di quello giusto.

Cinque risposte, e nessuna si può accorpare. `pagato` = tutte le rate
incassate. `sospeso` = restano rate aperte **e** la modalità è dichiarata (la
modalità è quello con cui la compagnia ha messo il contratto in copertura:
§65). `non_pagato` = rate aperte e nessuno ha detto come si paga. `annullata`
**non si deduce** — non è uno stato del pagamento, è la vita della polizza, e
la decide una persona: è l'unico valore per cui quella colonna serve ancora.
E `non_si_sa` per le **1.444 senza rate**: dirle pagate è la bugia più comoda
che questo sistema possa raccontare (§12, §18, §43).

**Il filtro del portafoglio guarda lo stesso valore del pannello.** Filtrare
sulla colonna scritta vorrebbe dire che l'elenco e la scheda dicono due cose
diverse sulla stessa polizza, ed è il difetto che si stava togliendo.

**E il tetto nascosto del Portafoglio si è visto proprio leggendo le rate**:
`.limit(1000)` su 4.079 polizze, e non lo diceva nessuno. Non si è tolto — le
4.079 righe col loro `dati` pesano **5,8 MB**, misurati, e su un telefono è
un'altra cosa — si **dice**, che è il rimedio già scritto per le anagrafiche
(§50).

#### 2. «Essendo spese si dovrebbe defalcare dal saldo, invece il programma le somma»

Misurato sul movimento vero — «Pagamento Stanza ROMA», 170 €, causale «Spese
in genere»:

```
CARTA DI CREDITO UNICREDIT   Avere 170   → −170   giusto
CONTO AZIENDALE              Dare  170   → +170   SBAGLIATO
```

**La partita doppia era corretta.** La contropartita di un costo va in Dare, e
il motore l'aveva scritta bene. Il difetto è che quel Dare è finito su un
conto di **liquidità**, dove Dare vuol dire «denaro arrivato» — e ci è finito
perché fra i dodici conti minimi **non ce n'era nemmeno uno di costo**.

> **È §1 in una forma nuova: la schermata fa una domanda la cui unica risposta
> onesta non esiste nell'elenco.** Non c'è modo di rispondere bene, e
> qualunque cosa si scelga produce un saldo più alto del vero.

Tre correzioni, e la terza è quella che conta:
1. `costo` e `ricavo` fra le tipologie, e il vincolo del database allargato —
   l'ha preso il guardiano che confronta il vocabolario del motore con il
   `CHECK`, non la rilettura;
2. «Costi di agenzia» e «Ricavi di agenzia» fra i conti **proposti**. Non
   seminati: un conto ha un saldo, e un saldo che nessuno ha deciso dopo due
   settimane è un dato (§54);
3. **`righeSemplici` rifiuta** una causale che incide sul risultato con la
   contropartita su un conto di liquidità, e dice che cosa serve. Guarda
   `incide_su_utile`, **non il segno**: senza quella distinzione avrebbe
   vietato anche i giroconti, cioè avrebbe rotto una cosa che funzionava per
   aggiustarne un'altra. E senza l'elenco dei conti **non indovina**: un
   controllo che non può misurare non deve bloccare (§4).

Il movimento del 22/09 **non è stato corretto da una migrazione**: un
movimento registrato non si riscrive, si storna (regola 13), e lo storno lo
firma una persona.

#### Le trappole prese in questo giro

- **`git checkout` su un file sporco annulla anche il lavoro.** È §21, e ci
  sono ricascato: la controprova si era fatta su `contabilita.js` modificato e
  non committato, e il ripristino ha portato via `statoPagamento`. Per una
  controprova su un file sporco si fa la **copia prima** (`cp`), mai
  `git checkout`.
- **Una prova che legge la PRIMA migrazione sorveglia il mondo di ieri.** Il
  vincolo delle tipologie si è allargato in un file nuovo, e il guardiano
  leggeva ancora quello che l'aveva creato. Adesso legge l'**ultima**
  migrazione che definisce quel pezzo, e segue da sé il prossimo spostamento
  (§55, §60).
- **«Dodici conti minimi» era un numero, non una regola.** La regola era
  «nessuno seminato, e l'elenco cresce quando manca una risposta onesta». La
  soglia adesso sale e non scende (§18, §31).
- **`let` invece di `var` su `PF_ROWS`**, e la prova che leggeva il portafoglio
  trovava `undefined` (§17, §32).

### Contabilità in pagine separate, e il cancello che si sposta sulla porta (22/09/2026)

> «queste voci in Contabilità non si devono vedere in un'unica pagina ma in
> pagine separate. Inoltre leva la parte Incassa la rata, Premi da recuperare,
> Incassi da accreditare» — Francesco.

**La striscia di dieci linguette non c'è più.** Faceva sembrare Contabilità
*una* schermata con dentro dieci cose, e per arrivare alla Prima nota
bisognava passare da quella aperta. Le **rotte non sono cambiate**:
`goTab('primanota')` e gli indirizzi salvati continuano a funzionare,
altrimenti un collegamento vecchio aprirebbe un riquadro vuoto (§6b).

**Il Cruscotto ha preso una voce di menu**, perché era l'unica schermata
raggiungibile *solo* dalla striscia: toglierla senza dargliene una l'avrebbe
resa il guasto §1.

**Le tre tolte non sono sparite, e non potevano.** Due di loro sono le
schermate che aprono un sospeso e che portano un incasso in contabilità: senza
porta sarebbero codice che nessuno chiama, e senza di loro quel lavoro non si
può fare. La porta c'è, e sta dove serve:

| schermata | da dove si apre |
|---|---|
| Incassa una rata | il tasto «Incassa» dentro Sospesi |
| Premi da recuperare | il riquadro dei crediti nel Cruscotto |
| Incassi da accreditare | il riquadro dei sospesi nel Cruscotto |

È la stessa idea di §61 — *un cruscotto che dice che cosa fare e non porta
dove si fa costringe a cercare la linguetta giusta fra dieci* — e adesso è
l'unica strada, il che la rende vera invece che comoda.

#### Il cancello stava sul bottone, e un bottone nascosto non è un permesso

I permessi su Anomalie, Sospesi, Storico e Conto si applicavano **nascondendo
le linguette**. Tolta la striscia quel cancello non avrebbe più tenuto niente
— e non teneva granché nemmeno prima: le stesse schermate hanno una voce nel
menu, e `goTab` si chiama dalla console.

> **Un bottone nascosto non è un permesso: è una porta che non si vede.**

Adesso è la porta a rifiutare (`contabPuo`, chiamata da `selContabTab`), e chi
non può entrare finisce sul Cruscotto invece che su un riquadro che non
dovrebbe vedere. Se il profilo **non si è potuto leggere** non si chiude tutto:
chiudere sarebbe un guasto travestito da permesso, e le politiche del database
restano il cancello vero.

La prova **fornisce un profilo ristretto e misura il rifiuto**, non solo che la
funzione esista (§1). E la controprova — tolta la riga che chiama `contabPuo` —
la fa diventare rossa.

#### Sei guardiani aggiornati nella REGOLA, non nel numero

Sei prove pretendevano `id="ctab-…"`. Quello che volevano garantire non era
«il bottone esiste»: era che la schermata fosse **raggiungibile**. Adesso
misurano la **rotta**, che è la cosa che la apre davvero — e la rotta serve
anche a chi arriva da un collegamento vecchio. Stessa cosa per «le cinque voci
del brief»: era «ogni schermata ha la sua voce», e vale identica con il
Cruscotto al posto di «Incassi da accreditare».

*(E una nota sul banco: `contabilita-una-schermata` stampa `X` e non `❌`. Una
controprova cercata col simbolo sbagliato sembra restata verde — mezz'ora
persa a dare la colpa alla prova.)*

### La polizza a colpo d'occhio, e le classi che non esistevano (22/09/2026)

> «questo è come si vede una polizza su un gestionale, e la scheda cliente,
> Foglio cassa, non riusciamo a fare qualcosa di simile? Magari risulta un po'
> più pratico da vedere? ovviamente sempre con interfaccia IAM» — Francesco,
> con tre schermate del suo gestionale.

**La causa non era una scelta estetica, ed è la stessa di §65.** Misurato
prima di disegnare: `.pol-griglia`, `.pol-r` e `.pnu-ov` **non esistevano** nel
foglio di stile di QUOTO. Il dettaglio polizza e la finestra «Come paga»
scrivevano quei nomi e nessuna regola li raggiungeva — uscivano nudi, una riga
sotto l'altra, senza colonne e senza cornice.

> **Una classe che non esiste viene ignorata in silenzio.** Nessun errore,
> nessuna pagina rotta: chi la guarda pensa a un disegno fatto male. È la
> stessa firma del gettone che non risolve (§44) e della regola chiusa dentro
> un pannello (§58). L'unico modo di accorgersene è **misurarlo**.

Misurato su tutto `index.html`: **59 classi prefissate scritte e mai
definite**, e le più gravi stavano proprio nelle schermate che Francesco ha
nominato. Le altre sono modificatori su una classe già disegnata
(`cl-row cl-polizza`, `tk-f ecp-t`) o appigli per le prove, e non producono
niente di nudo — ma tre di loro (`pol-produttore`, `pol-rata-aperta`,
`pol-firma`) erano **solo** appigli, e adesso ognuna fa qualcosa di piccolo e
vero: un appiglio senza regola il guardiano non lo distingue da un refuso.

### Che cosa ha adesso la scheda polizza

| pezzo | dove |
|---|---|
| il blocco di stile, coi gettoni condivisi | `.pol-*` in `index.html`, contenitore `.pol-kit` |
| testata, griglia e i due cassetti | `polDettaglio` |
| i sinistri della polizza | `polSinistri`, letti da `quote_sinistri.polizza_id` |
| la finestra «Come paga» | `.pnu-ov`, `.pnu-box`, `.pnu-testa`, `.pnu-corpo`, `.pnu-piede` |
| prove | tre nuove in `ui-test.mjs` (**519**) |

- **La testata** porta su una riga sola quello che si legge per primo: numero,
  compagnia (col portatore del rischio), prodotto, targa, stato del pagamento.
- **La griglia** mette i campi in colonne che si adattano alla larghezza, con
  l'etichetta piccola sopra e il valore sotto: in verticale si legge tutto
  insieme invece di scorrere.
- **Rate e sinistri affiancati**, perché sono le due cose che si guardano
  aprendo una polizza. Su telefono una sotto l'altra.
- **I gettoni sono quelli condivisi** (`withus-one-tokens.css`): zero colori
  scritti a mano. I due che quel file non porta si dichiarano sul contenitore
  e mai su `:root` (§31, §44), e il guardiano del kit ammette `.pol-kit{` come
  **categoria** — l'elenco cresce quando una schermata entra nel kit (§58).

### Il guardiano che serviva da sempre

> **Prendi ogni classe prefissata che la schermata scrive DAVVERO (dal DOM,
> non dal sorgente) e pretendi di ritrovarla nei fogli di stile della pagina.**

Girando, quel guardiano ha trovato in un colpo solo i tre appigli senza regola,
e nella finestra «Come paga» misura anche che la cornice **arrivi**
all'elemento — cercare la regola nel foglio non basta, potrebbe non
raggiungerlo — e che i margini negativi di `.pnu-kit`, fatti per incastrarsi
dentro una scheda, non sbordino dentro una finestra.

### Una prova aggiornata nella regola

«il pagamento (mezzo e stato) non si legge nel dettaglio» pretendeva
«Pagato». Quella polizza di collaudo ha una rata **ancora aperta** con il
bonifico dichiarato: dal 22/09 lo stato lo dicono le rate, e la risposta vera
è «Sospeso» — premio in copertura, non ancora in casa (§65). Si è aggiornata
la regola (il mezzo e lo stato si leggono, **col motivo**), non il numero.

### Cosa resta aperto

- **`ec-*` e `ir-*` restano senza regole in questo foglio**, ed è giusto:
  vivono dentro documenti generati che portano il loro `<style>`.

### La scheda cliente e il foglio cassa, l'altra metà (22/09/2026)

> «Vai con la scheda cliente e il foglio cassa» — Francesco.

Stessa richiesta, stesso metodo: **prima si misura, poi si disegna.** E il
risultato della misura è che le due schermate avevano problemi diversi.

| pezzo | dove |
|---|---|
| il blocco di stile | `.fc-*` e `.clk-*` in `index.html`, dentro il kit |
| la testata della scheda cliente | `kr` / `krHtml` / `testaCliente` in `apriAnagrafica` |
| la barra dei totali e gli avvisi | `fcRender` |
| prove | due blocchi in `ui-test.mjs` → **521** |

**Il foglio cassa aveva un difetto vero, e l'ha trovato la misura.** Scriveva
`cnt-avv` e `cnt-err`: sono classi di IAM, e in **questo** documento non
esistono. I tre avvisi — «questi totali sono parziali», «le provvigioni
contano solo le rate incassate», «le quadrature contano le rate incassate» —
uscivano come **testo semplice**, senza cornice e senza colore.

> Un avviso che non si vede come un avviso non è un avviso: è una riga in
> più da scorrere. Ed erano proprio le tre righe che devono fermare chi
> legge, perché dicono che i numeri sopra non sono quello che sembrano.

È la firma già scritta due volte (§65, §«La polizza a colpo d'occhio»): **una
classe che non esiste viene ignorata in silenzio.** Nella stessa rilettura è
saltato fuori il fratello minore: `--w1-rosso` era **usato** in `.pnu-ko` e
**dichiarato da nessuna parte**, quindi la riga d'errore della finestra «Come
paga» prendeva il colore del testo intorno. Un errore che non si vede come un
errore. I valori sono quelli di IAM, perché i due kit devono restare identici.

**La scheda cliente non aveva classi mancanti: aveva la forma sbagliata.**
L'identità del cliente stava nella colonna di sinistra, larga 300 pixel e
divisa in due — sei o sette righe da scorrere per leggere un codice fiscale,
mentre nel gestionale di Francesco è la prima cosa che si vede. Adesso sta in
cima, larga quanto la finestra, in colonne.

> **E i campi sono stati SPOSTATI, non copiati.** Nella colonna di sinistra
> resta quello che si *modifica* — residenza dichiarata, consensi, note
> permanenti — che è un'altra cosa dal *leggere* chi è il cliente. Un codice
> fiscale scritto due volte nella stessa finestra è il doppione che, il
> giorno in cui uno dei due si aggiorna e l'altro no, fa non fidarsi di
> nessuno dei due. C'è una prova che conta le occorrenze e pretende **una**,
> e la controprova la fa diventare rossa.

Conseguenza da sapere: `f()` e `val()` dentro `apriAnagrafica` non le
chiamava più nessuno e sono state tolte. Codice che arriva e non lo chiama
nessuno è il guasto numero uno di questo repository (§1), e vale anche per
il codice che *smette* di essere chiamato.

**Il guardiano delle classi è lo stesso**, applicato alle due schermate: legge
le classi **dal DOM** (non dal sorgente) e pretende di ritrovarle nei fogli di
stile della pagina. Le due prove nuove misurano anche che la cornice **arrivi**
davvero all'elemento (`getComputedStyle`): cercare la regola nel foglio non
basta, potrebbe non raggiungerlo.

**Due contenitori nuovi nell'elenco del kit** (`.fc-kit`, `.clk-kit`): l'elenco
è una **categoria**, non un nome proprio, e cresce quando una schermata entra
nel kit (§58). I gettoni che la fonte unica non porta si dichiarano lì, mai su
`:root` (§31, §44).

### Cosa resta aperto, dopo questa metà

- **Il foglio cassa non ha una barra di totali «alla AssiEasy»** con partite
  varie, rimessa e premi di direzione: quei conti in IAM non esistono, e
  inventarli sarebbe la regola §8.1 sul denaro. Ci sono i numeri che il
  sistema sa davvero.
- **La scheda cliente non ha le linguette «Pagamenti» e «Sospesi»** del
  gestionale di Francesco: i sospesi vivono in Contabilità (§64) e i pagamenti
  nel dettaglio della polizza. Portarli qui vuol dire decidere se sono la
  stessa lista vista da un'altra parte o un secondo elenco — e due elenchi
  della stessa cosa dicono numeri diversi (§62).
- **Le altre schermate di QUOTO non sono sul kit**: si portano una alla volta,
  come si è fatto in IAM (§31).

### La scheda cliente come un gestionale (22/09/2026)

> «Questa è come vorrei l'interfaccia dell'anagrafica cliente» — Francesco,
> con sei schermate del portale Tutela Legale.
> «Mi sembra molto più pratico anche da vedere.»

| pezzo | dove |
|---|---|
| tutti i numeri | `tariffe/motore/scheda-cliente.js` |
| prove in Node | `server/verifica/scheda-cliente.test.mjs` — 12 |
| la barra laterale, le tre linguette, la sintesi | blocco `clk*` in `index.html` |
| lo stile | blocco `.clk-*` dentro il kit |
| prove nella pagina | tre blocchi in `ui-test.mjs` → **523** |

**Che cosa fa quella scheda e la nostra non faceva.** Due cose, e nessuna è
estetica:

1. **L'identità sta in una barra laterale che non scorre via.** La nostra
   l'aveva in cima, larga quanto la finestra (§«La scheda cliente e il foglio
   cassa») — meglio di prima, ma appena si guardava il portafoglio spariva.
   Adesso la barra sta **fuori dai pannelli**, e c'è una prova che lo misura:
   dentro, cambiando linguetta sparirebbe, ed è proprio la cosa che deve
   restare sotto gli occhi mentre si guarda il resto.
2. **Tre domande, tre linguette**, invece di sette linguette tutte allo stesso
   livello: *chi è* (Sintesi), *i suoi dati* (Anagrafica), *il suo
   portafoglio*. Le sette di prima sono tutte dentro il Portafoglio, che è
   dove vivono.

**Le azioni stanno in un posto solo.** «Operazioni» apre un menu a gruppi —
contratti, sinistri, commerciale, variazioni. Sparse fra le schede, chi le
cerca non sa in quale linguetta guardare; ed è la stessa distanza che aveva
fatto perdere la voce «Importa» nella barra da ventuno voci (§15).

### I numeri stanno nel motore, e non inventano

Sono numeri che una persona legge e su cui poi **telefona a un cliente**:
quindi stanno in un motore provato in Node e non dentro la schermata (§5).
Le quattro regole che vi sono scritte sono già regole di casa:

- **Una polizza senza premio annuo non vale zero** (§36, §42). Sommare zero
  farebbe un portafoglio *più povero* del vero, e un numero più basso, su una
  scheda cliente, nessuno lo mette in dubbio. Resta fuori dal totale e si
  dichiara. Vale anche per la ciambella: **la fetta è il NUMERO di polizze,
  non il premio** — disegnarla sul premio farebbe sparire dal grafico proprio
  i prodotti di cui il premio non si sa.
- **Un insoluto è una rata aperta GIÀ SCADUTA**, non una rata aperta. Una rata
  che scade fra un mese è un impegno futuro, e metterla fra gli insoluti fa
  telefonare a un cliente in regola.
- **I premi per periodo contano solo l'INCASSATO** (§17): una rata emessa e
  non pagata non ha prodotto niente per nessuno. E i periodi si chiamano
  «anno in corso» e «anno precedente», non «ultimo anno», che vuol dire due
  cose diverse e chi legge non sa quale.
- **«Non si è potuto leggere» non è «non c'è niente»** (§12, §18): ogni
  risposta porta `letto`, e la schermata scrive il motivo invece di uno zero.
  Su una scheda cliente uno zero falso è peggio che altrove — chi lo legge
  conclude che quel cliente non ha insoluti, e non chiama.

**L'ordine delle due letture non è estetica.** `clkCarica` legge le rate
**delle sue polizze**, quindi parte dopo `caricaCollegati`: lanciate insieme,
la sintesi direbbe «0 polizze» su un cliente che ne ha dieci. L'ha trovato la
prova, non la rilettura.

**Le polizze sono schede, non righe.** Su una riga sola non ci stanno effetto,
scadenza, frazionamento, premio e come paga: sono le cinque cose che si
guardano aprendo il portafoglio di un cliente.

**Il vocabolario dei documenti non si riscrive**: l'etichetta la dà
`Fascicolo.tipoCliente`, che è il motore che lo possiede. Una seconda tabella
qui vorrebbe dire due nomi per lo stesso documento (§18).

### Il doppione che NON è un doppione

La prova del 22/09 pretendeva che i campi dell'identità comparissero **una
volta sola** nella finestra. Con la barra laterale quella regola diventa
falsa: la barra è un **riepilogo** visibile da tutte e tre le linguette, la
linguetta Anagrafica è la **scheda completa**. Sono due letture dello stesso
oggetto, rese nello stesso istante: non possono divergere.

Si è aggiornata la **regola, non il numero** (§15, §16, §33, §35): il
doppione resta vietato **dentro lo stesso pannello**, che è dove farebbe
male, e in più si pretende che la barra stia fuori dai pannelli e che le tre
linguette ne accendano **una sola**.

### Cosa resta aperto

- **La scheda cliente non ha ancora le linguette «Pagamenti» e «Sospesi»**
  del gestionale di Francesco: i sospesi vivono in Contabilità (§64) e i
  pagamenti nel dettaglio della polizza. Portarli qui vuol dire decidere se
  sono la stessa lista vista da un'altra parte o un secondo elenco (§62).
- **Gli ultimi eventi si leggono da `quote_log`**, che aggancia le righe dal
  19/09/2026 (§18): su un cliente vecchio il riquadro è vuoto e lo dice.
- **Le rate si leggono per le prime 200 polizze del cliente**: nessuno ne ha
  così tante, ma il tetto esiste e non è ancora dichiarato in schermata.

---

## 66. La spesa che non sottraeva, e i sospesi senza nome (22/09/2026)

Due segnalazioni nello stesso messaggio, e la prima era già stata «corretta»
il giorno prima. Tutte e due si sono risolte **misurando prima di toccare**, e
tutte e due la misura ha detto una cosa diversa da quella che sembrava.

| pezzo | dove |
|---|---|
| le regole | `contropartiteAmmesse`, `effettoAtteso`, `chiTiene` in `tariffe/motore/contabilita.js` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **119** (erano 107), 4 controprove |
| la tendina e l'effetto | `pntContro` / `pntEffetto` in `iam/index.html` |
| i sospesi a due famiglie | blocco `spr*` in `iam/index.html` |
| prove sulle schermate | `prima-nota` (18), `sospesi-premi` (21), `incassi-accreditare` (11) |

### 1. «Se c'è uscita deve sempre sottrarre. Tuttora non funziona.»

**Il cancello funzionava. Era quello il problema.** Misurato prima di
cambiare una riga: girato sui conti veri, `righeSemplici` rifiutava
«CARTA DI CREDITO → CONTO AZIENDALE» e accettava «CARTA DI CREDITO → Costi
di agenzia». E sul database i due movimenti sbagliati erano stati **annullati
alle 18:50**, senza che ne nascesse uno nuovo.

> Quindi «non funziona» non voleva dire «scrive il numero sbagliato»: voleva
> dire **non si riesce più a registrare la spesa**. La tendina offriva tutti
> i conti, lui sceglieva l'unico che gli veniva in mente — quello su cui la
> carta è appoggiata — e si prendeva un muro di testo.

**Una domanda che ha una sola risposta onesta non si fa: si propone la
risposta.** E le risposte disoneste non si mettono in elenco, perché un
elenco che contiene la risposta sbagliata è un invito a darla. La tendina
adesso offre solo conti di costo per un'uscita che incide sul risultato, solo
conti di ricavo per un'entrata, tutto il resto per un giroconto — e se ne
resta uno solo è già scelto («aggancia solo se è una», §19).

**E l'effetto si vede prima di salvare**, in euro col segno:
*CARTA DI CREDITO UNICREDIT −170,00 € · Costi di agenzia +170,00 €*. La
regola si controlla guardandola, e le righe disegnate sono **quelle che
verranno scritte** — non un secondo conto fatto a parte, che un giorno
direbbe un numero diverso.

**Un buco che ha trovato la prova, non la rilettura.** La prova che confronta
la tendina col rifiuto su tutte le combinazioni ha scoperto che
`righeSemplici` **accettava** una spesa con contropartita su «Ricavi di
agenzia»: il cancello guardava solo i conti di liquidità. Un ricavo in
contropartita di una spesa direbbe che l'agenzia ha guadagnato quello che ha
speso. Adesso il salvataggio chiama la **stessa** funzione che riempie la
tendina: una regola sola, non due che si somigliano.

### 2. «Nei sospesi non c'ho nessun tipo di sospeso»

Misurato sul database, e la misura spiega tutto: la voce «Oddo Francesco»
esiste ed è scritta su **due polizze** e su **zero rate**. Le loro due rate
risultano **già incassate** — una dice «carta di credito», l'altra non dice
niente. `daIncassare` leggeva solo `quote_titoli.mezzo_pagamento` e solo le
rate aperte: nessuna delle due poteva comparire, e l'elenco era vuoto senza
sbagliare niente.

Da qui la distinzione che regge tutto il resto, e che i due campi avevano già
addosso senza che nessuno l'avesse scritta:

> **`quote_titoli.mezzo_pagamento` dice COME il cliente ha pagato** quella
> rata: è un fatto della compagnia.
> **`quote_polizze.mezzo_pagamento` dice come paga questo cliente** (§16), ed
> è una risposta che si corregge a mano. Quando quella risposta è una
> **PERSONA** non è una strada di pagamento: è **qualcuno che tiene quei
> soldi e ne deve rendere conto.**

Le due cose non si escludono: il cliente ha pagato Oddo con la carta, e Oddo
ha i soldi. Quindi una persona sulla polizza vince sul mezzo della rata per
la domanda «chi lo tiene», e il mezzo della rata resta scritto accanto come
«pagata con…». Dove non c'è nessuna persona vale il mezzo della rata, e se la
rata non lo dichiara si legge quello della polizza **marcato ereditato** —
leggere quello che la polizza dichiara non è inventare, ma va detto: «lo dice
la rata» e «lo dice la polizza» non sono la stessa cosa. Sul portafoglio vero
sono **339 rate su 380** che smettono di essere «Da dichiarare».

La regola sta in **una funzione sola** (`chiTiene`), perché la usano due
schermate — i Sospesi e gli Incassi da accreditare — e due regole su chi ha in
mano un premio sarebbero due elenchi che un giorno dicono cose diverse sulla
stessa persona.

**Due famiglie dentro lo stesso gruppo**, e confonderle vorrebbe dire non
sapere a chi telefonare:

| famiglia | che cos'è | il verbo |
|---|---|---|
| `versare` | il cliente ha pagato, i soldi li tiene lui | **Scarica** → Incassi da accreditare |
| `incassare` | il cliente deve ancora pagare | **Incassa** → Incassa una rata |

Prima viene sempre `versare`: è denaro che esiste e che si può farsi dare
oggi. **Telefonare a chi ha già pagato è il modo più veloce di perdere un
cliente.**

**E una rata incassata conta come sospeso solo se a tenerla è una persona.**
Per un POS o un bonifico il ritardo è di giorni e lo sorveglia «Incassi da
accreditare» (§32): quelle **si contano e si dichiarano**, con il numero,
l'importo e la porta dove si lavorano (§55). Una rata già entrata in
contabilità esce da qui, e i posti in cui quel fatto è scritto sono
**quattro** — guardarne uno solo li dichiara tutti mancanti (§62).

### Un difetto vecchio di un giorno, e non si vedeva

`destinoIncasso` chiamava `mezzo(k)` **senza il vocabolario**: leggeva solo le
nove voci di casa, e la voce «Oddo Francesco» — nata in tabella il 22/09 —
risultava «non nel vocabolario». Conseguenza: nessun bottone, e quel premio
fuori dalla contabilità per sempre. È il difetto del vocabolario spostato in
tabella (§64) lasciato indietro in una funzione, e l'ha preso la prova.

**Una persona non è un conto**, e adesso lo dice: il sospeso nasce **senza
conto** e il conto si sceglie quando i soldi arrivano davvero. Inventarne uno
sarebbe §8.1; rispondere «non si sa» toglierebbe il bottone, che è peggio.

### Una controprova che restava verde perché la prova cercava il NOME

`mezzo_polizza: null` passava una prova che cercava `/mezzo_polizza:/`. Il
campo c'era e non portava niente. Adesso la prova cerca **il valore**
(`mezzo_polizza: p.mezzo_pagamento`). *Una prova che cerca un nome invece di
un valore assolve qualunque codice che quel nome lo scriva.*

### E quattro prove finite nel posto sbagliato

Le prove nuove di `prima-nota` erano state inserite **dopo il ciclo che le
esegue**: finivano nell'elenco, il totale saliva da 14 a 18, e **non girava
nessuna**. Tre controprove di fila sono restate verdi senza che il codice
fosse giusto. *Quando una controprova resta verde, prima di accusare la prova
si guarda se la prova è stata eseguita: il totale che sale e le righe stampate
che non salgono sono il sintomo.*

### Cosa resta aperto

- **I due movimenti sbagliati restano annullati**, ed è giusto: un movimento
  registrato non si riscrive. La spesa di Roma si rifà con «Costi di agenzia»
  come contropartita.
- **Nessun conto dichiara ancora quali mezzi riceve** (§32): finché è così,
  scaricare un sospeso chiede il conto a mano, che è la strada giusta ma più
  lenta.
- **Le 339 rate che ereditano la voce dalla polizza** adesso si vedono nei
  sospesi divise per mezzo: sono premi in transito veri, ma nessuno li aveva
  mai guardati tutti insieme.

### 66-bis. «Dovrebbe andare tra i sospesi, ma non c'è» — c'era, ed era ultimo (22/09/2026)

> «ho messo una polizza Carpitella Guido 400 € come pagamento Oddo Francesco,
> quindi dovrebbe andare tra i sospesi... ma non c'è.» — Francesco.

**Misurato prima di toccare, e il motore era già a posto.** Girato sulle due
righe vere del database, `daIncassare` rispondeva
`Oddo Francesco · 2 rate · 662,98 €`. Il difetto era **a valle del motore**.

Misurato poi su tutto il portafoglio, come la schermata lo ordinava davvero:

| # | gruppo | rate | euro |
|---|---|---|---|
| 1 | Carta di credito | 135 | 34.172,13 |
| 2 | Carta prepagata | 75 | 22.024,85 |
| 3 | PayPal | 86 | 21.933,77 |
| 4 | Altro | 80 | 19.100,75 |
| 5 | Da dichiarare | 41 | 1.109,34 |
| 6 | POS | 1 | 148,00 |
| **7** | **Oddo Francesco** | **2** | **662,98** |

> **Un mezzo raccoglie centinaia di rate, una persona ne ha due.** Ordinandoli
> nello stesso elenco per importo, la persona finisce **sempre** in fondo — non
> per caso, per costruzione. Oddo Francesco era l'ultimo di sette, sotto 418
> righe: c'era, e per chi guardava non c'era.

La regola, non l'ordine: **due sezioni.** «Chi tiene i premi — a loro si
chiede» sta sempre prima di «Per mezzo di pagamento — arrivano da soli». Un
mezzo è un circuito che accredita da solo; una persona è qualcuno a cui
telefonare, e non si cerca: si vede.

E i gruppi delle persone **si aprono da soli**, finché nessuno ha toccato
niente (`SPR_TOCCATO`): sono pochi e sono il lavoro. I mezzi no — sono
centinaia di righe, e aprirli tutti seppellirebbe di nuovo quello che conta.
In testa un contatore nuovo: **quante persone tengono dei premi e per quanto.**

**La lezione, e non è la prima volta.** Il motore era giusto, le prove erano
verdi, e la schermata era inservibile. *Una prova che gira il motore su due
righe non dice niente su come quelle due righe si vedranno in mezzo a
quattrocento.* La prova nuova mette **quaranta rate su un mezzo e una su una
persona**, e pretende la persona in cima: è l'unico modo di misurare un ordine.

**Quello che NON si è fatto.** La richiesta diceva anche «nei sospesi ci devono
andare tutti quei pagamenti che sono stati impostati che devono essere
sospesi». Letta alla lettera vorrebbe dire portarci anche le **2.778 rate già
incassate** con un mezzo «sospeso», per **896.627,80 €** (misurato). Quelle le
ha incassate la compagnia, non l'agenzia: nessuno le deve a nessuno, e
metterle fra i premi da incassare sarebbe un numero grande, credibile e falso
(§8.1, §62). Restano contate e dichiarate, con la porta dove si lavorano.

---

## 67. La schermata che non si vedeva, e la differenza che accusava la cosa sbagliata (23/09/2026)

Due segnalazioni, e la prima era la terza volta che Francesco la ripeteva:
*«la posizione messa come sospeso continua a non essere tra i sospesi»*.

### 1. Una funzione che non esiste non dà un numero sbagliato: spegne la pagina

Misurato prima di toccare qualsiasi cosa, nell'ordine:

| controllo | esito |
|---|---|
| `iam_modalita_pagamento` | `col_oddo_francesco` c'è, con il suo `collaboratore_id` |
| le due polizze con quella modalità | ci sono, 2 rate, 662,98 € |
| `iam_movimenti` / `_righe` / `iam_incassi_rate` / `iam_sospesi` su quelle rate | **0** — quindi non sono «già in contabilità» |
| `Contabilita.daIncassare` girato su quelle righe | `Oddo Francesco · 2 rate · 662,98 €` |
| la sintassi PostgREST del filtro sulla tabella agganciata | arriva alla RLS, quindi si legge |
| `quoto.withusassicurazioni.it/versione.json` | `0.38.0`, pubblicata |

**I dati erano giusti, il motore era giusto, il rilascio era pubblicato — e la
schermata era vuota.** Restava un posto solo dove guardare: il disegno. Per
guardarci davvero si è costruito un banco che fa **girare** `sprCarica` con un
finto PostgREST, e la prima riga di esito è stata:

```
ReferenceError: pfEuro is not defined
```

`pfEuro` e `pfData` vivono in `index.html` alla radice — sono **del
preventivatore**. In `iam/index.html` non esistono, e in mezzo al disegno
sollevano un errore.

> **Una classe CSS che non esiste viene ignorata in silenzio (§65): la
> schermata esce brutta. Una FUNZIONE che non esiste no — interrompe il
> disegno a metà, e quello che restava da disegnare non compare mai.** Nessun
> numero sbagliato, nessuna riga storta: il vuoto. E dal di fuori è
> indistinguibile da «non ci sono sospesi», che è la risposta che Francesco ha
> letto tre volte.

**Ventidue prove verdi non l'hanno visto, e non potevano.** Leggevano il
sorgente e cercavano delle stringhe: le stringhe c'erano tutte. È §1 in una
forma nuova — *una suite verde non dimostra che il codice serva a qualcosa* —
applicata al disegno invece che al collegamento.

Due prove nuove, e la prima è quella che conta:

1. **`sprCarica` gira davvero**, con un finto PostgREST che onora anche il
   filtro sulla tabella agganciata (e pretende il `!inner`, senza il quale
   PostgREST non toglierebbe le righe), sulle due righe vere del portafoglio.
   Pretende che la schermata disegni, che Oddo Francesco ci sia con i suoi
   662,98 €, e che stia **prima** dei mezzi (§66-bis).
2. **Nessuna funzione presa in prestito**: ogni `xxx(` chiamata nel blocco deve
   essere definita in `iam/index.html`. Le funzioni di casa sono quelle di
   **tutto il documento**, non del solo blocco — la schermata ne chiama
   parecchie delle altre ed è giusto; quello che non deve succedere è che ne
   chiami una che qui dentro non c'è.

Per la seconda, il sorgente si legge **senza commenti e senza stringhe**, a
carattere a carattere: dentro un `select` PostgREST o un pezzo di HTML ci sono
parentesi che sembrano chiamate e non lo sono, e le parole italiane di un
commento sembrano funzioni. È la trappola dei commenti (§10, §12, §18, §26,
§29, §31, §33, §34, §37, §41, §42, §45, §55, §61, §63), presa in anticipo
invece che subita.

**Controprova**: rimessa `pfEuro` in una riga sola, diventano rosse tutte e
due — la prima con l'errore vero, la seconda col nome.

E un censimento sul resto del documento: `pfEuro` e `pfData` erano **le uniche
due** funzioni del preventivatore chiamate dentro IAM. Non ce n'erano altre.

### 2. Una differenza ha due cause, e il sistema ne diceva una sola

> «se il dichiarato è 3000 € ed ho una spesa di 170 € non può essere un saldo
> da 3170 €» — Francesco, sulla Quadratura conti.

Misurato: `CARTA DI CREDITO UNICREDIT`, `saldo_iniziale` **0,00** (dichiarato
il 21/09), **un** movimento vivo da 170 € in uscita, saldo dichiarato 3.000 €.
Ricostruito −170, differenza −3.170. **Il conto era giusto. L'accusa no.**

Il sistema scriveva: *«La banca ha € 3.170,00 in più del sistema: c'è un
movimento che non è stato registrato»* — e mandava a cercare in banca un
movimento che non manca.

> **Il ricostruito è SALDO DI PARTENZA + movimenti. Quindi una differenza ha
> due famiglie di causa, non una: o manca (o avanza) un movimento, o il saldo
> di partenza non è quello scritto.** Su un conto nato oggi con il saldo di
> partenza a zero mentre in banca c'erano già dei soldi, la seconda è quasi
> sempre quella vera — ed era l'unica che il sistema non nominava.

La seconda causa è **misurabile**, e il numero si dà: il dichiarato meno la
somma dei movimenti, cioè 3.000 − (−170) = **3.170,00**. Ma resta una misura
da guardare, non un valore da scrivere (§43): applicarlo da soli vorrebbe dire
mettere in contabilità un saldo che nessuno ha deciso. Il tasto «Correggi il
saldo di partenza» apre il conto con quel numero **nel campo**, visibile e
correggibile (§44), e a salvare è una persona.

L'ordine delle due cause non è estetica: **il saldo di partenza viene prima**,
perché su un conto con un movimento solo è quella che risponde, e mandare a
cercare per primo un movimento mancante fa perdere un pomeriggio.

Un conto che **quadra** non elenca niente: due cause su una riga verde sono
rumore che si impara a saltare.

### Cosa resta aperto

- **`CARTA DI CREDITO UNICREDIT` è di tipologia `banca`.** Una carta di credito
  non è un conto: il suo «saldo» è un debito, e un plafond disponibile non è un
  saldo di partenza. Finché nessuno lo decide, il sistema conta e non giudica.
- **Il saldo di partenza vero di quel conto non lo sa nessuno**: il sistema
  adesso propone 3.170,00 perché è il numero che fa tornare i conti, non perché
  sappia che è quello.
- **Gli altri blocchi di IAM non hanno un banco che li fa girare**: quello dei
  Sospesi è il primo. Si aggiungono uno alla volta, come le schermate sul kit
  (§31).

---

## 68. I punti vendita (23/09/2026)

> «Passiamo alla parte dei punti vendita, voglio che siano gestiti così, e con
> un'interfaccia simile a questa ma personalizzata con design IAM» — Francesco,
> con la schermata del portale di una compagnia.

### La misura ha cambiato il nome del lavoro

Non era una migrazione: era una cosa che non esisteva.

| misurato il 23/09/2026 | |
|---|---|
| tabelle dei punti vendita | **nessuna** |
| `iam_utenti.rete` | un campo di **testo libero**: 4 account su 5 vuoto, uno dice «Test» |
| la pagina «Reti / Punti vendita» del preventivatore | un **segnaposto**: «questa sezione è stata spostata dentro Utenti» |
| persone nel registro | 17, di cui **5** con un account |

Quindi niente si sposta da QUOTO, e la tabella **nasce vuota**: inventare
un'«Agenzia Generale» vorrebbe dire mettere in archivio una struttura che
nessuno ha deciso, e dopo due settimane sarebbe un dato (§8.1).
`iam_utenti.rete` **non si cancella**: è l'unica traccia di quello che c'era, e
si toglie quando i punti vendita veri ci sono.

### La regola che comanda su tutte

> **Un punto vendita figlio non può potere più del padre.**

Se l'agenzia generale non ha l'incasso abilitato, una sua filiale non ce l'ha,
comunque sia spuntata la sua casella. È il verso in cui funziona una delega: si
può dare meno di quello che si ha, mai di più. Senza, basterebbe togliere un
permesso al padre e dimenticarsene, e le filiali continuerebbero a incassare —
**la schermata direbbe «no» e il sistema «sì»**.

Le abilitazioni **effettive** sono l'AND della catena fino alla radice, e la
schermata mostra le due cose separate: la casella di quel punto vendita e
quello che vale davvero, **col nome di chi la toglie**. «Non emette» senza dire
perché fa riaprire quella casella dieci volte.

| pezzo | dove |
|---|---|
| tutte le regole | `tariffe/motore/punti-vendita.js` |
| prove in Node | `server/verifica/punti-vendita.test.mjs` — 14 |
| la tabella, i due trigger, le politiche, il rollback | `supabase/migrations/20260923b_punti_vendita.sql` (applicata) |
| la schermata | `#panel-punti-vendita` e il blocco `pvd*` in `iam/index.html` |
| la voce di menu | `iam/withus-one.js`, Agenzia › Punti vendita |
| prove sulla schermata | `iam/verifica/punti-vendita.test.mjs` — 8, e una la **fa girare** |

### Le altre quattro decisioni

- **Il punto vendita sta sulla PERSONA, non sull'account.**
  `quote_collaboratori.punto_vendita_id`: dodici persone su diciassette non
  hanno un accesso a IAM, e appendendolo all'account resterebbero fuori. È la
  stessa scelta dell'elenco Utenti (§10) e delle tendine dei collaboratori
  (§48).
- **Le abilitazioni nascono SPENTE.** Un punto vendita che nasce potendo
  emettere polizze è un permesso che nessuno ha dato.
- **Un padre che non c'è non fa sparire il figlio**: diventa una radice e si
  dichiara orfano. Nasconderlo vorrebbe dire che un padre cancellato per
  sbaglio porta via dalla vista tutte le sue filiali e le persone che ci
  lavorano — «non si è potuto leggere» ≠ «non c'è niente» (§12, §18) applicato
  a una gerarchia. E un **anello** non manda in cerchio chi disegna: le sue
  righe si mostrano marcate, e il divieto vero è un trigger.
- **Non si cancella, si spegne** (§26) quando ha filiali sotto o persone
  dentro. I due cancelli sono nel database: `on delete restrict` sul padre e un
  trigger sulle persone. **Collaudato sul database vero e annullato**: anello
  rifiutato, cancellazione rifiutata, zero righe rimaste.

### Un filtro non stacca un ramo dalla sua radice

Le caselle si sommano (AND) e guardano l'abilitazione **effettiva**, non la
casella: filtrare su «incasso» e ritrovarsi una filiale a cui il padre l'ha
tolto vorrebbe dire che il filtro dice una cosa e la riga un'altra. E un punto
vendita che non passa il filtro ma ha un figlio che lo passa **resta in
albero**, marcato di passaggio e **non contato**: toglierlo staccherebbe il
figlio dalla sua radice.

### Tre guardiani hanno preso tre difetti, e due non erano miei

1. **`apriNuovoUtente` non esiste più** (tolta il 17/09 quando l'attivazione è
   passata al server). Il mio «Nuovo utente» la chiamava: è **esattamente il
   guasto di §67**, preso da una prova invece che da Francesco. Adesso quel
   tasto porta in Utenti e permessi, dove l'attivazione vive.
2. **Il guardiano della prima nota misurava una fetta lunga tremila righe.**
   `blocco()` va dalla PRIMA NOTA fino alle TARIFFE, quindi comprende schermate
   che con la prima nota non c'entrano: è bastato che i Punti vendita
   cancellassero un punto vendita (che si può cancellare, se è vuoto) per
   dichiarare rotta la prima nota. *La regola non era «nessun delete da qui a
   lì»: era «un MOVIMENTO non si cancella»* — e quella si misura sulla
   **tabella**, in tutto il documento. Adesso è più forte di prima, e la
   controprova lo dimostra.
3. **Il guardiano del vocabolario del registro cercava `[a-z]+`**, quindi non
   vedeva i tipi con l'underscore. Rinforzato a `[a-z_]+`, ha trovato nello
   stesso minuto che **`modalita_pagamento` si registrava dal 22/09 e non era
   nel vocabolario**: un puntatore che non apre niente (§18). Aggiunta, con la
   forma giusta della chiave — il codice, che è testo.

### Due prove mal costruite, e la lezione è sempre la stessa

- **Il campione contava più della regola.** La prova «un punto vendita che non
  passa il filtro resta in albero» filtrava su un'abilitazione: non poteva
  funzionare, perché sotto un padre che non passa non c'è mai un figlio che
  passa. Misurava la regola della catena una seconda volta. Il caso vero è
  «solo attivi», che **non si eredita**: una filiale aperta sotto un'agenzia
  chiusa continua a lavorare.
- **Una controprova che non fa diventare rossa nessuna prova va guardata bene**
  (§15, §17, §19, §41, §46). Tolta la catena scrivendo `vale = propria`, tutto
  restava verde — perché il ciclo che scorre gli antenati restava lì sotto e
  rimetteva a posto il risultato. Tolto il ciclo davvero, diventano rosse
  **quattro** prove.

### Cosa resta aperto

- **La tabella è vuota**, ed è il punto: il primo punto vendita lo crea una
  persona, e finché non c'è la schermata lo dice invece di sembrare rotta.
- **Le persone si smistano dalla loro scheda**, non da qui: la schermata mostra
  chi è ancora senza punto vendita e quanti sono, ma non li sposta.
- **«Assegna polizze» non c'è.** Nella schermata di Francesco è un terzo
  bottone; qui le polizze si attribuiscono già a una **persona** (§45), e
  aggiungere un secondo asse di attribuzione è una decisione, non una
  conseguenza: due elenchi della stessa produzione direbbero numeri diversi.
- **Nessuna abilitazione filtra ancora niente nel preventivatore**: oggi i
  punti vendita si dichiarano e si leggono. Collegarli a chi può emettere
  davvero è il passo dopo, e va fatto con la sua migrazione.

---

## 69. Punti vendita: il responsabile, e la polizza che ne porta uno (23/09/2026)

> «per quanto riguarda i punti vendita devo poter mettere un intermediario, e
> poter scegliere un intermediario di primo livello (responsabile) e poi poter
> aggiungere chi sta sotto. la parte dei flag deve essere fatta ad interruttori
> […] se la polizza si deve sempre poter assegnare all'intermediario, che però
> se fa parte di un punto vendita si deve assegnare anche al punto vendita.
> Elimina la parte degli HUB perché i punti vendita li sostituiscono.»
> — Francesco.

| pezzo | dove |
|---|---|
| le regole nuove | `responsabileDi`, `spostamento`, `smistabili` in `tariffe/motore/punti-vendita.js` |
| prove in Node | `server/verifica/punti-vendita.test.mjs` — **19** (erano 14) |
| le tre colonne | `supabase/migrations/20260923c_punti_vendita_responsabile_e_polizze.sql` (applicata) |
| la regola che riempie il punto vendita, **una sola** | `supabase/migrations/20260923d_polizza_segue_il_punto_vendita.sql` (applicata) |
| la decisione sul codice che la porta dietro | `supabase/migrations/20260923e_decisione_codice_col_punto_vendita.sql` (applicata) |
| responsabile, interruttori, smistamento | blocco `pvd*` in `iam/index.html` |
| il punto vendita nella scheda del collaboratore | `mcPuntiVendita` in `iam/index.html` |
| prove sulla schermata | `iam/verifica/punti-vendita.test.mjs` — **12** (erano 8), tre controprove |

### Il responsabile lavora dove risponde

Punta alla **persona** del registro (`responsabile_id` → `quote_collaboratori`),
non a una riga di testo: un nome digitato non si incrocia con niente, e il
giorno in cui quella persona cambia cognome ci sono due verità.

E chi sta sotto sono le persone con lo stesso `punto_vendita_id`: un
responsabile che non è fra loro sarebbe un capo senza squadra, o peggio una
persona che risulta lavorare altrove mentre risponde di qui. **Quindi
sceglierlo lo SPOSTA** — e lo spostamento **si dichiara prima di salvare**, col
nome del punto vendita da cui viene via. Una persona sta in un punto vendita
solo: spostarla in silenzio vuol dire toglierla a qualcun altro senza che
nessuno se ne accorga.

Un responsabile che non è più nel registro **non sparisce**: si marca, come un
padre che non c'è più. Sparire farebbe credere che quel punto vendita non ne
abbia mai avuto uno (§12, §18 applicati a una persona invece che a un numero).

### «e poi poter aggiungere chi sta sotto»

Prima le persone si smistavano **solo** dalla loro scheda: aprire il punto
vendita, vederlo vuoto e doverlo riempire da un'altra schermata è la stessa
distanza che aveva fatto perdere la voce «Importa» in una barra da ventuno voci
(§15). Adesso c'è una tendina in cima all'elenco e un «Togli da qui» su ogni
riga — che **non cancella niente**: la persona resta nel registro, senza punto
vendita.

Chi lavora altrove resta in elenco, marcato con il punto vendita da cui
verrebbe via: toglierlo vorrebbe dire non poter mai spostare nessuno, e
nasconderlo senza dirlo sarebbe peggio.

### Gli interruttori sono quelli di IAM

`.sw`, `.sw-track`, `.sw-thumb`, `.sw-row` esistono in `iam/index.html` dal
primo giorno. Scriverne un secondo paio qui vorrebbe dire due interruttori che
un giorno si accendono in due modi diversi — è la regola dei motori (§18)
applicata al foglio di stile. Due forme, una funzione: in riga nella barra dei
filtri, su una riga sua nel modulo, dove accanto ci sta scritto che cosa vuol
dire.

### La regola che riempie il punto vendita sta in UN posto

Le strade che scrivono una polizza sono **quattro**: l'importazione del flusso,
l'applicazione di una decisione sul codice produttore, «Assegna il pregresso»
(che aggiorna dal browser) e «Nuova polizza». Scrivere la regola in tutte e
quattro vorrebbe dire quattro regole su chi produce per chi, e quella sbagliata
sarebbe quella che nessuno guarda.

> **Un trigger, nel punto da cui passano tutte.** `iam_pv_dal_collaboratore`
> riempie `punto_vendita_id` leggendolo dalla persona — e fa due cose sole.

1. **Non sovrascrive quello che c'è.** Riempie solo una colonna vuota: chi
   l'ha messo a mano sapeva qualcosa che il programma non sa (§19, regola 2).
2. **Non rilegge il passato.** La colonna si riempie quando la riga si scrive e
   da quel momento resta com'è. Il punto vendita di una persona cambia, e se la
   produzione lo leggesse dal vivo **il consuntivo di un anno già chiuso
   cambierebbe da solo** — è la stessa ragione per cui il produttore si congela
   sulla polizza (§45) e i requisiti del fascicolo alla creazione (§11).

Collaudato sul database vero e annullato: la polizza e la rata nascono col
punto vendita, quello messo a mano non si tocca, e senza un intermediario non
si inventa niente. **Controprova**: tolto «solo se è vuoto», il punto vendita
messo a mano viene riscritto.

### Il guasto peggiore di questa giornata, ed era mio

Nella prima stesura avevo **riscritto a memoria**
`iam_applica_decisione_codice`, credendo di sapere che cosa facesse. Il
risultato aveva perso i **quattro stati** del motore (`non-deciso`, `persona`,
`nessuno`, `da-ridecidere`), la **sospensione** di un abbinamento e i nomi dei
numeri che torna: tre delle cinque regole di §19 e §49, tutte su chi viene
pagato.

E si è installata **senza un errore**. In plpgsql i campi di un `record` si
risolvono **quando la funzione gira**, non quando si crea: una funzione che
legge una colonna che non esiste nasce verde e muore al primo uso vero.

> **Una funzione che esiste non si riscrive: si copia e si aggiunge.** Quello
> che «si sa che fa» è il ricordo di chi legge, non il codice.

L'ha presa `assegnazione.test.mjs`, che legge l'**ultima** migrazione che
definisce quella funzione e le chiede le stesse regole del motore — la stessa
disciplina già scritta in §55 e §60. La versione buona è quella del 22/09 con
due righe in più, in `20260923e`, e la sua prova adesso pretende anche i
quattro stati e la sospensione, non solo il punto vendita.

Nello stesso giro il `soloSql` di `punti-vendita.test.mjs` ha smesso di
guardare solo i `--`: toglie anche i commenti `/* */`, altrimenti una regola
nominata in un commento risulta presente (la trappola dei commenti, ennesima
occorrenza).

### Gli HUB: via la schermata, non i dati

Misurato prima di toccare: `iam_hub` ha **2 righe** (HUB PANTELLERIA, HUB
VILLABATE) e `iam_team.hub_id` è valorizzato su **3 schede su 12**.

Cancellate **undici funzioni** e tre pezzi di interfaccia (la scheda «HUB
Produttori», il filtro nell'elenco collaboratori, il campo nella scheda) —
*del codice che nessuno chiama è il guasto numero uno di questo repository
(§1), e vale anche per il codice che SMETTE di essere chiamato.*

Ma la tabella e la colonna **restano**, e `saveCollab` continua a riscrivere
l'`hub_id` che c'era: un campo che non si mostra più non è un campo da
cancellare, e un salvataggio che lo mette a `null` cancellerebbe quelle tre
righe senza che nessuno l'abbia chiesto. Al posto del campo, nella scheda del
collaboratore c'è il **punto vendita** — che sta sulla persona, non sulla
scheda economica, e se la scheda non è agganciata a nessuna persona **lo dice**
invece di far credere che quella persona non stia da nessuna parte.

E i due HUB **non diventano due punti vendita da soli**: sarebbe mettere in
archivio una struttura che nessuno ha deciso (§8.1). La schermata li mostra con
un bottone che apre il modulo **col nome già nel campo**, visibile e
correggibile — proporre e scrivere sono due cose diverse, e su una struttura
d'agenzia la differenza è tutta.

### Cosa resta aperto

- **Nessun responsabile è ancora dichiarato**, e c'è un punto vendita solo con
  zero persone dentro: finché è così la schermata conta e non giudica.
- **`iam_utenti.rete`** resta il campo di testo da cui si viene, non letto da
  nessuno. Si toglie quando i punti vendita veri ci sono.
- **Le abilitazioni non filtrano ancora niente nel preventivatore**: oggi si
  dichiarano e si leggono. Collegarle a chi può emettere davvero è il passo
  dopo, e va fatto con la sua migrazione.
- **Nessuna schermata mostra ancora la produzione PER PUNTO VENDITA**: le due
  colonne si riempiono da oggi, e il consuntivo che le legge è un lavoro a sé.

---

## 70. I sospesi: la pagina di chi tiene i premi (23/09/2026)

> «In questa schermata dovrei vedere una sintesi di sospeso, poi cliccando ad
> esempio su Oddo Francesco deve aprirsi una pagina dove vedo tutti i sospesi
> di riferimento, e devo avere la possibilità di flaggare più di uno e
> scaricarli insieme […] stampare un PDF, o un file EXCEL, o inviare una mail
> con il resoconto, e mi devi dare inoltre la possibilità di abbinare un conto
> sospesi ad un determinato collaboratore, così da potergli inviare una mail
> con un semplice click» — Francesco.

| pezzo | dove |
|---|---|
| i numeri e i testi che escono di casa | `resocontoSospesi`, `testoSospesi`, `documentoSospesi` in `tariffe/motore/contabilita.js` |
| prove in Node | `server/verifica/contabilita.test.mjs` — **126** (erano 122) |
| la pagina, la selezione, i tre formati | blocco `spr*` in `iam/index.html` |
| le rate scelte arrivano già spuntate | `incaConRate` in `iam/index.html` |
| la carta intestata, **lo stesso file** | `/nuovo-preventivo/tariffe/motore/pdf-withus.js`, caricato da `iam/index.html` |
| prove sulla schermata | `iam/verifica/sospesi-premi.test.mjs` — **29** (erano 24), tre controprove |

### Excel, PDF ed email escono dallo stesso documento

È la regola dell'estratto conto (§17) applicata ai sospesi: tre costruzioni
diverse dello stesso foglio direbbero, prima o poi, tre cose diverse — e
**quella sbagliata sarebbe quella che il collaboratore ha in mano**. Il motore
produce un resoconto solo; la pagina lo disegna, l'Excel lo scrive, il PDF lo
impagina con `PdfWithus.disegna` e l'email se lo porta in allegato.

Il motore della carta intestata **si carica, non si copia**: IAM adesso legge
`pdf-withus.js` dal preventivatore (§18, §26). Due carte intestate sarebbero
due carte intestate che un giorno divergono.

### Le due famiglie non si sommano, e non si scaricano insieme

«Il cliente ha già pagato, i soldi li tieni tu» e «il cliente deve ancora
pagare» sono **due lavori diversi**: il primo è denaro che si può farsi dare
oggi, il secondo è una telefonata al cliente. Un totale unico mandato a una
persona gli chiederebbe dei soldi che nessuno gli ha ancora dato, e il testo
dell'email lo scrive a chiare lettere.

Per la stessa ragione **non si scaricano insieme**: una rata aperta si
*incassa* (Fase 2), una già incassata si *porta in contabilità* (§32).
Mescolarle vorrebbe dire registrare un incasso che è già avvenuto. Chi ne
sceglie di tutti e due i tipi riceve il motivo, non un errore.

### Quello che resta fuori viaggia SUL FOGLIO

Un file scaricato vive da solo per mesi, lontano dallo schermo che lo spiegava
(§62). Quindi gli avvisi sono parte del **documento**, non della schermata:

- una rata senza importo dichiarato **non vale zero** — resta fuori dal totale
  e si conta (§17);
- una **selezione** si dichiara: «riguarda 3 rate su 12, è una selezione, non
  tutto quello che risulta». Un foglio parziale che non lo dice fa credere che
  quello sia tutto — è il tetto nascosto di §50 e §53, su un file che esce di
  casa;
- se la lettura del portafoglio si è fermata, il foglio dice che i numeri sono
  **in difetto**.

Sono esattamente le tre righe che un formato breve sarebbe tentato di
togliere, e c'è una prova che le pretende in tutti e tre i formati (§34).

### «Scaricarle insieme» è un gesto solo, e non è una seconda scrittura

La scrittura dell'incasso ha la sua schermata (Fase 2, §59): rifarla qui
vorrebbe dire due regole su come nasce un movimento. Quello che cambia è che
le rate scelte **arrivano già spuntate** (`incaConRate`), lette **per id** e
non con la ricerca per testo — cercare «Rossi» ne troverebbe anche altre, e una
rata spuntata per sbaglio è un incasso registrato che non è avvenuto. Quelle
che non arrivano **si dicono**: una riga sparita in silenzio è un premio che
nessuno cercherà più (§55).

> **Una trappola annotata.** La linguetta «Incassa una rata» fa partire un
> caricamento asincrono che AZZERA le rate scelte. Chi ci arriva con una
> selezione deve poterlo aspettare: `selContabTab` adesso tiene la promessa
> (`INCA_PRONTA`), e chi preseleziona l'aspetta. Senza, le rate si vedevano
> cancellare a metà strada — è la trappola di §17 (`showPage` che rilegge
> tutto), un piano più in là. La prova che sorvegliava quella riga fissava la
> **forma** della chiamata: si è aggiornata la regola («qualcuno la chiama»),
> non il numero.

### Abbinare si offre solo dove la voce è già una persona

Il collegamento «voce di pagamento → collaboratore» esiste dal 22/09 (§64) ed
è quello che rende vero il «con un semplice click»: l'indirizzo dell'email si
precompila da lì.

Ma **abbinare un collaboratore al POS** vorrebbe dire dire che tutte le rate
pagate col POS le tiene lui — sul portafoglio vero sono 135 righe per 34.172 €.
Un numero grande, credibile e falso (§8.1). Quindi l'abbinamento si offre solo
dove la voce è già una persona, e dove non lo è la schermata dice **dove si
crea** una voce nuova, invece di offrire la cosa pericolosa.

E abbinare **non tocca nessuna rata**: cambia chi è quella voce, non chi ha
prodotto quelle polizze. C'è una prova che lo misura.

### L'email parte dalla casella della contabilità

`contabilita@`, e **non si ripiega** (§34): una risposta che arriva in una
casella che quei conti non li tiene è una risposta persa. Il destinatario è
precompilato e sempre correggibile — una voce che non è una persona non ha un
destinatario suo, e inventarglielo sarebbe peggio che chiederlo.

«Non gliel'ho mandato» e «gliel'ho mandato e non è arrivato» restano due cose
diverse: l'errore si scrive in schermata, non si tace.

### Cosa resta aperto

- **Non c'è un registro degli invii** come quello dell'estratto conto
  (`iam_invii_estratto`, §34): l'invio lascia una riga nel registro dei
  movimenti, con destinatario, numero di rate e importo, ma non congela i
  totali di quel giorno. «Io il resoconto non l'ho ricevuto» si risponde dal
  registro movimenti, non da una tabella sua.
- **L'allegato è un Excel** (una tabella HTML che Excel apre), come tutti gli
  altri export di casa: il PDF con la carta intestata si scarica a parte.
- **Una sola voce è abbinata a una persona** (Oddo Francesco): finché è così,
  la pagina di dettaglio con l'email precompilata vale per lei sola.
