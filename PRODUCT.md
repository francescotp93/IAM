# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primario: l'ufficio dell'agenzia, al computer.** Direzione (`top_master`) e
ufficio/amministrazione (`master`) di Withus Assicurazioni passano la giornata
dentro IAM da una scrivania: emissioni, portafoglio, scadenzario, sinistri,
contabilità e quadratura, provvigioni ed estratti conto della rete. Le schermate
si progettano prima per questo uso: sessioni lunghe, molte righe, molti numeri,
schermo grande. *(Confermato da Francesco, 07/10/2026.)*

**Secondario: la rete dei collaboratori** (`operativo`), che quota, segue i
propri clienti e guarda la propria produzione, anche dal telefono. Non si
sacrifica: il mobile resta funzionante (il menu «Nuovo preventivo» ha già un
drill-down dedicato), ma non è il caso che guida le decisioni.

**Fuori dal sistema, oggi: il cliente finale.** Compila un modulo
(`landing.html`) e firma una proposta (`firma.html`), poi non ha un posto suo
(`IAM.md` §8.1). Le compagnie mandanti non entrano in IAM: è IAM che entra nei
loro portali.

## Product Purpose

IAM — *Insurance Agency Management* — è il sistema di Withus Assicurazioni:
contiene tutte le funzioni dell'agenzia, organizzate in quattro mestieri che si
attraversano senza cambiare applicazione — commerciale (lead, anagrafiche,
trattative, preventivi, richieste, emissioni), operativo (portafoglio,
scadenzario, sinistri, documentale, collegamenti alle compagnie, collaboratori),
contabile (titoli e rate, incassi, prima nota, sospesi, quadratura) e marketing
(campagne, posta, segmenti).

Successo: chi lavora in agenzia apre IAM e da lì fa tutto, senza passare da un
programma all'altro e senza tenere due elenchi di clienti; e i numeri che IAM
mostra (premi, rate, provvigioni, cassa) sono numeri di cui ci si può fidare.

## Positioning

**Un sistema solo.** Dal primo contatto commerciale alla quadratura di cassa e
alla campagna di rinnovo, in un'unica applicazione — invece di un gestionale,
più un preventivatore, più i portali delle singole compagnie. *(Confermato da
Francesco come la differenza che guida le scelte future, 07/10/2026.)*

Conseguenza per il design: una funzione nuova non nasce come «un altro
programma» con il suo aspetto e il suo vocabolario. Davanti a un utente si legge
solo **IAM**; «QUOTO» e «With Us One» non compaiono (`IAM.md` §2). Le due basi di
codice (`index.html` alla radice e `iam/`) sono un dettaglio di costruzione, non
un dato di prodotto.

## Operating Context

- Lavoro d'ufficio quotidiano su portafoglio reale (migliaia di polizze, rate e
  anagrafiche), flussi notturni delle compagnie importati (tracciati SSF V12/V8),
  quadrature di cassa e conti, estratti conto dei collaboratori mandati per email.
- Undici connettori verso i portali delle compagnie, pilotati da un browser vero
  su un server esterno; tariffe proprie per alcuni rami.
- Due ingressi oggi: `iam.withusassicurazioni.it` (la scocca, con il
  preventivatore in un riquadro sotto `/nuovo-preventivo/`) e
  `quoto.withusassicurazioni.it` (il preventivatore a pagina intera).
- Testi, documenti e comunicazioni in italiano.

## Capabilities and Constraints

- **Stack esistente, senza passo di build:** HTML/CSS/JS in documenti unici
  (`index.html` ~1,8 MB, `iam/index.html`), motori in `tariffe/motore/*.js`
  caricati sia dal browser sia da Node, Supabase (Postgres + RLS), backend
  Express sul VPS, Caddy. Nessun framework frontend.
- **I dati non si inventano** (`CLAUDE.md` §8.1): quello che non si sa resta
  vuoto e si dichiara «da confermare»; «non si è potuto leggere» non è «non c'è
  niente». Vale anche per qualunque schermata, riquadro o grafico.
- **Invii sempre bozza → conferma di una persona → invio.** Mai un'email, una
  campagna o un SMS partito da solo.
- **Vincolo normativo:** il profilo `segnalatore` non è iscritto al RUI e non
  deve vedere premi, garanzie, condizioni o preventivi per nessuna strada.
- **Blocchi:** la grafica della schermata di transizione IAM → area preventivi
  (overlay a tutto schermo) non si modifica senza richiesta esplicita
  (`iam/CLAUDE.md`, «BLOCCHI»).
- **Contratti fra le due metà:** il menu «Nuovo preventivo» (`MEGA`), le chiavi
  `prod`, gli id delle pagine e `INTERFACCIA-QUOTO-IAM.md` sono contratto; le
  classi CSS in comune fra i due documenti sono sorvegliate e possono solo
  diminuire (`fusione-collisioni.test.mjs`).
- **Ancora aperto (non deciso):** l'indirizzo unico fra i due domini
  (`IAM.md` §8.3); quanto spazio dare al cliente finale (§8.1).

## Brand Commitments

- **Nome:** Withus Assicurazioni (l'agenzia, «With Us»); **IAM** (il sistema).
- **Il verde With Us e i loghi esistenti restano il punto di partenza.**
  *(Confermato da Francesco, 07/10/2026.)* Fonte unica dei colori di marchio:
  `withus-one-tokens.css` (`--w1-verde: #02984e` e varianti). Loghi:
  `withus-logo.png`, `withus-logo-green.png`, `withus-logo-white.png`,
  `iam/IAM LOGO.svg`, `favicon.svg`.

## Evidence on Hand

- Definizione del sistema e perimetro: `IAM.md`; storia delle decisioni e regole
  di lavoro: `CLAUDE.md`; confine fra le due metà: `INTERFACCIA-QUOTO-IAM.md`.
- Interfaccia esistente e funzionante in produzione: è l'evidenza visiva
  incumbent (kit grafico di IAM in `iam/index.html`, gettoni condivisi in
  `withus-one-tokens.css`).
- **Assenti, e da non fabbricare:** testimonianze, clienti citati, numeri di
  mercato, recensioni, premi o certificazioni. Il repository è pubblico: niente
  dati di clienti, indirizzi di macchine, chiavi o credenziali.

## Product Principles

1. **Un sistema, non una somma di programmi.** Ogni schermata nuova parla la
   lingua di IAM e si raggiunge dai suoi menu; niente secondo vocabolario,
   secondo elenco o secondo aspetto per la stessa cosa.
2. **Si progetta per l'ufficio che ci passa la giornata.** Densità e leggibilità
   su schermo grande vengono prima; il telefono resta usabile, non guida.
3. **Un numero sbagliato è peggio di un numero mancante.** Mostrare il vuoto con
   il suo motivo, mai uno zero o una stima che sembra un dato — soprattutto su
   premi, rate, provvigioni e cassa.
4. **Il sistema chiede, non indovina.** Dove serve una decisione umana (un
   abbinamento, un conto, un fido), la schermata lo dice e porta dove si decide.
5. **Niente parte da solo verso l'esterno.** Bozza, conferma, invio.
