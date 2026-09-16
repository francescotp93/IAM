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
node server/verifica/tracciabilita.test.mjs

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
| `#page-previdenza` in `index.html` | quattro campi e la risposta sotto, un passo solo |
| `server/parametriPrevidenziali.js` | serve i numeri di legge dalla tabella; il motore ne tiene una copia di riserva |
| `server/analisiPrevidenziali.js` | ogni foglio stampato lascia la sua riga a registro |

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

---

## 10. Il repository unico (dal 16/09/2026)

**IAM vive qui, nella cartella `iam/`.** Fino al 16/09/2026 era il repository
`francescotp93/Agente-sospesi`; da quel giorno quel repository è archivio in
sola lettura (la storia sta lì) e il codice sta qui, importato in un solo commit
che cita il commit d'origine. Questo repository si chiamerà **IAM**: il nome
`QUOTE` è il nome vecchio, e GitHub rimanda da solo dal vecchio al nuovo.

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

Ciò che **non** è cambiato: `index.html` di QUOTO e `iam/index.html` restano
due documenti, e il preventivatore vive ancora in un riquadro (stessa origine,
`/nuovo-preventivo/`). Fonderli in una sola applicazione è il passo 3, da fare a
moduli.
