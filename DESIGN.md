---
name: IAM
description: Insurance Agency Management di Withus Assicurazioni — lo strumento dell'agenzia
colors:
  verde: "#02984e"
  verde-scuro: "#016b38"
  verde-vivo: "#01c061"
  verde-tenue: "#e8f6ee"
  segnale: "#06b6d4"
  segnale-scuro: "#0e7490"
  barra: "#0d131c"
  barra-hover: "#141c27"
  sfondo: "#e9edf2"
  superficie: "#ffffff"
  superficie-tenue: "#f8fafc"
  bordo: "#dfe5ec"
  bordo-leggero: "#f1f4f8"
  testo: "#141a23"
  testo-secondario: "#6e7b8b"
  testo-attenuato: "#97a3b2"
  esito-ok: "#0f9d58"
  attenzione: "#c77a14"
  attenzione-fondo: "#fdf6e7"
  errore: "#d6342c"
  errore-fondo: "#fdeceb"
typography:
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 700
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
  figure:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 800
  label:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "10.5px"
    fontWeight: 700
    letterSpacing: "0.09em"
  data:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
rounded:
  piccolo: "2px"
  campo: "3px"
  scheda: "10px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.campo}"
    padding: "0 12px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.verde-scuro}"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.testo}"
    rounded: "{rounded.campo}"
    padding: "0 12px"
    height: "34px"
  button-secondary-hover:
    backgroundColor: "{colors.superficie-tenue}"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.scheda}"
  card-head:
    padding: "13px 15px"
  card-body:
    padding: "14px 15px"
  pictogram:
    backgroundColor: "{colors.verde-tenue}"
    textColor: "{colors.verde-scuro}"
    size: "32px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.testo}"
    rounded: "{rounded.campo}"
  tag-attenzione:
    textColor: "{colors.attenzione}"
    padding: "2px 7px"
  tag-errore:
    textColor: "{colors.errore}"
    padding: "2px 7px"
  nav-sidebar:
    backgroundColor: "{colors.barra}"
    textColor: "{colors.superficie}"
    width: "238px"
---

# Design System: IAM

<!-- Estratto il 07/10/2026 dal codice in produzione: withus-tech.css (la «pelle
     tech», autorità più recente), withus-one-tokens.css (il marchio),
     il kit grafico in iam/index.html, la scocca in iam/withus-one.css.
     Il tema scuro esiste (body.theme-dark in withus-tech.css) e non è
     riportato nei token qui sopra: il tema di riferimento è quello chiaro. -->

## Overview

**Creative North Star: "Lo strumento dell'agenzia"**

IAM è l'attrezzo con cui un'agenzia assicurativa lavora tutto il giorno: sobrio,
affidabile, riconoscibile come With Us senza farlo pesare. La maggior parte del
tempo lo usa l'ufficio, al computer, su schermate dense di righe, scadenze e
importi; il design serve a leggere molto, in fretta, senza sbagliare.

Il carattere viene da tre scelte già in produzione. I neutri sono **freddi e
profondi**, una sola scala dal foglio al nero; il **verde With Us** è riservato al
marchio e alle azioni; un **ciano di sistema** dice «la macchina sta lavorando»
(caricamenti, spie, fuoco). I **dati veri** — importi, codici, targhe, date — sono
in monospaziato con cifre a larghezza fissa: si incolonnano, e uno zero di troppo
si vede a occhio. Gli angoli sono stretti: è uno strumento, non un'app di consumo.

La densità è alta per scelta e l'ornamento è quasi assente. Un'attesa dice sempre
che cosa sta aspettando; un vuoto dice sempre perché è vuoto.

**Key Characteristics:**
- Neutri freddi, una scala sola; verde solo per marchio e azioni; ciano solo per i segnali di sistema.
- Numeri e codici in monospaziato di sistema, cifre tabulari ovunque.
- Angoli stretti (2–3px sui pezzi, 10px sulle schede), bordi sottili, ombre asciutte.
- Scocca a barra laterale scura, contenuto chiaro a destra.
- Quattro primitive di attesa, ognuna con la sua domanda.

## Colors

Una scala di neutri freddi su cui il verde del marchio agisce e il ciano segnala.

### Primary
- **Verde With Us** (#02984e): il marchio e l'azione principale — il bottone pieno, il logo, le cifre positive, l'elemento attivo del menu. È l'identità dell'agenzia e non si modifica.
- **Verde profondo** (#016b38): hover del bottone pieno, testo su fondo verde tenue.
- **Verde vivo** (#01c061): accenti luminosi della barra scura (indicatore della voce attiva).
- **Verde nebbia** (#e8f6ee): fondo dei pittogrammi, delle pastiglie positive e delle righe evidenziate.

### Secondary
- **Ciano di sistema** (#06b6d4): solo segnali della macchina — barra di caricamento, spia che pulsa, griglia delle schermate di avvio, anello di fuoco della tastiera. Non è un colore d'azione.
- **Ciano profondo** (#0e7490): la stessa funzione su fondo chiaro dove serve contrasto (serie «preventivi» nei grafici, informazioni).

### Neutral
- **Notte d'officina** (#0d131c): la barra laterale e la fascia superiore della scocca.
- **Grigio acciaio chiaro** (#e9edf2): il fondo delle pagine.
- **Foglio** (#ffffff): schede, campi, superfici di lavoro. Variante tenue (#f8fafc) per fondi secondari e hover.
- **Bordo freddo** (#dfe5ec): bordi dei contenitori; (#f1f4f8) per le righe di tabella.
- **Inchiostro** (#141a23): testo principale. **Ardesia** (#6e7b8b): etichette e testo secondario. **Grigio nebbia** (#97a3b2): testo attenuato, briciole, micro-etichette.

### Semantic
- **Esito** (#0f9d58), **attenzione** (#c77a14 su #fdf6e7), **errore** (#d6342c su #fdeceb). L'ambra vuol dire «da fare», non «errore»; il rosso è riservato a ciò che è davvero perso o sbagliato.

### Named Rules
**The Two Greens Rule.** Il verde ha un solo significato: marchio o azione. Non si usa per decorare, e un dato positivo in verde non deve sembrare un bottone.

**The Cyan Is The Machine Rule.** Il ciano compare solo quando parla il sistema (attese, spie, fuoco). Un bottone ciano, un titolo ciano o un grafico tutto ciano sono un errore.

## Typography

**Interfaccia:** Inter (con -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)
**Dati ed etichette tecniche:** monospaziato di sistema (ui-monospace, SF Mono, JetBrains Mono, Menlo, Consolas…), mai scaricato

**Character:** un sans neutro e leggibile per tutto il testo, affiancato da un monospaziato di sistema che marca i dati come dati. Il secondo non è decorazione: è ciò che rende verificabile un importo.

### Hierarchy
- **Headline** (700, 22px, tracking −0.03em): il titolo della pagina nella testata (`page-head`). Uno per schermata.
- **Title** (700, 13px): titoli delle schede, accanto al pittogramma.
- **Body** (400, 13px, line-height ~1.4, cifre tabulari): testo corrente, righe di elenco, campi.
- **Figure** (800, 20px): il numero di una tessera di riepilogo; nei conteggi d'azione della Scrivania sale a 22px.
- **Label** (700, 10.5px, tracking 0.09em, MAIUSCOLO, monospaziato): micro-etichetta sopra i titoli (`eyebrow`) e sopra i valori delle tessere.
- **Data** (400, 13px, monospaziato, cifre tabulari, tracking −0.01em): importi, codici, targhe, date, saldi; anche nei campi numerici e di data.

### Named Rules
**The Data Wears Mono Rule.** Ogni importo, codice, targa o data che si confronta con un altro va in monospaziato con cifre tabulari. Il testo descrittivo no.

**The One Sans Rule.** *(Decisione del 07/10/2026.)* Inter vale per tutto il sistema: oggi il preventivatore (`index.html`) usa ancora il sans di sistema, e va portato su Inter quando si tocca il suo foglio di stile.

## Layout

La scocca è una **barra laterale scura** a sinistra (238px, comprimibile a 66px solo icone, la scelta si ricorda) con una **fascia superiore** scura alta 56px per ricerca, posta, agenda e utente; il contenuto scorre a destra su fondo grigio acciaio chiaro.

Ogni schermata segue lo stesso schema: **testata** (micro-etichetta, titolo, sottotitolo a sinistra; azioni a destra, 8px fra un bottone e l'altro) con 16px di margine, poi **schede** su una griglia con gap di 12px. La Scrivania usa due colonne (1.45fr e un minimo di 310px) che si impilano sotto i 1100px; sotto i 720px la testata va in colonna e i bottoni si allargano a tutta riga.

Ritmo: 8px fra elementi affini, 12px fra schede, 16px di margine di pagina; interno scheda 13–15px. La densità è quella di un gestionale: righe da 13px, tessere di riepilogo in griglia auto-fit con colonna minima 200px.

Il telefono resta funzionante (menu a drill-down, colonne impilate), ma il riferimento di progetto è lo schermo dell'ufficio.

## Elevation & Depth

Il sistema è **quasi piatto**: la profondità la danno i bordi sottili e il contrasto fra il fondo grigio e le schede bianche, non le ombre. Le ombre sono asciutte — poca sfocatura, molto bordo — e salgono solo per ciò che galleggia sopra la pagina (finestre, tendine).

### Shadow Vocabulary
- **Appoggio** (`box-shadow: 0 1px 2px rgba(16,24,40,.06), 0 1px 1px rgba(16,24,40,.04)`): schede e superfici a riposo.
- **Sospeso** (`box-shadow: 0 10px 30px rgba(11,15,22,.13)`): finestre modali, tendine, mega-menu.

### Named Rules
**The Border Before Shadow Rule.** Una scheda si separa dal fondo con il bordo da 1px; l'ombra di appoggio è un rinforzo, mai l'unico confine.

## Shapes

Forma squadrata da strumento: **2px** per i pezzi piccoli (scheletri, pastiglie interne), **3px** per campi, bottoni e contenitori della pelle tech, **10px** per le schede dell'applicazione; pittogrammi a 7px. I campi di testo e di scelta sono forzati a 3px; caselle di spunta, interruttori e bottoni tondi (aiuto, bottone flottante) restano tondi di proposito. Bordi da 1px ovunque.

*Nota di coerenza:* le schermate portate sul kit (Scrivania, Contabilità, Conti, Compagnie, Provvigioni, Catalogo, Produzione, Punti vendita) ridichiarano ancora la tavolozza di prima nei loro gettoni (raggio 4px, fuoco verde). La pelle tech è l'autorità più recente: quei gettoni vanno allineati quando si tocca quel blocco, non duplicati altrove.

## Components

### Buttons
Diretti e compatti: un'azione, un verbo.
- **Shape:** angoli stretti (3px), altezza 34px, padding orizzontale 12px, testo 12px peso 600, icona a 7px dal testo.
- **Primary:** fondo verde With Us, testo bianco; hover verde profondo. Uno per testata, per l'azione principale.
- **Secondary:** fondo bianco, bordo freddo da 1px, testo inchiostro; hover sul fondo tenue.
- **Focus:** contorno ciano da 2px con 1px di distacco — la tastiera si vede senza confondersi con il verde delle azioni.
- **Lavoro in corso:** dentro al bottone premuto, l'anello da 14px del colore del testo.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** bianco su fondo grigio acciaio chiaro.
- **Shadow Strategy:** ombra di appoggio (vedi Elevation).
- **Border:** 1px bordo freddo.
- **Internal Padding:** intestazione 13×15px con filetto inferiore, corpo 14×15px; titolo 13px peso 700 accanto a un pittogramma da 28px.

### Pittogramma
Quadrato da 32px (28px nei titoli delle schede), angoli a 7px, icona Tabler da 18px. Verde nebbia con verde profondo di base; varianti ambra, rosso e grigio per dire lo stato senza leggere.

### Tessera di riepilogo
Un numero e la sua etichetta: micro-etichetta maiuscola 11px in grigio nebbia, cifra 20px peso 800, riga di contesto sotto. In griglia auto-fit; fondo tenue, bordo da 1px.

### Chips / Pastiglie di stato
Pastiglie a capsula **contornate**: bordo da 1px e testo dello stesso colore, fondo trasparente, 10,5px peso 700, padding 2×7px. Neutre col bordo forte; colorate per famiglia. L'etichetta dice lo stato a parole; il colore lo rinforza.

### Inputs / Fields
- **Style:** fondo bianco, bordo da 1px, angoli 3px, testo 13px; i campi numerici e di data in monospaziato.
- **Focus:** contorno ciano.
- **Error:** testo e bordo rosso con il messaggio scritto accanto: un errore si legge, non solo si colora.

### Navigation
Barra laterale e fascia superiore in notte d'officina con testo chiaro; la voce attiva ha l'indicatore in verde vivo. La barra si comprime a icone; il logo è il pulsante «casa» verso la Scrivania. Su telefono il menu «Nuovo preventivo» diventa un drill-down.

### Le quattro attese (componente distintivo)
- **Barra** (2px in cima, indeterminata, scia ciano): «la pagina sta caricando». Mai una percentuale finta.
- **Scheletro** (barre grigie da 12px con una scia che passa): «sta arrivando roba di questa forma».
- **Stato** (riga monospaziata maiuscola con la spia ciano che pulsa; verde a fatto, rossa a guasto): «sto facendo questa cosa».
- **Anello** (14px, dentro il bottone): «questo bottone sta lavorando».
Con `prefers-reduced-motion` restano ferme, non spariscono.

## Do's and Don'ts

### Do:
- **Do** usare i gettoni (`--t-*`, `--w1-*`, `--txt*`, `--surf*`, `--bord*`): ogni colore viene da `withus-tech.css` o `withus-one-tokens.css`.
- **Do** scrivere importi, codici, targhe e date in monospaziato con cifre tabulari.
- **Do** aprire ogni schermata con la testata del kit (micro-etichetta, titolo, sottotitolo, azioni) e organizzarla in schede.
- **Do** far dire a ogni attesa che cosa sta aspettando, con una delle quattro primitive.
- **Do** mostrare un vuoto con il suo motivo («non si è potuto leggere», «da confermare») invece di uno zero o di uno spazio bianco.

### Don't:
- **Don't** scrivere colori a mano: 262 valori in IAM e 374 nel preventivatore sono già debito da riportare sui token.
- **Don't** usare il ciano per azioni o decorazione, né il verde per decorare.
- **Don't** reintrodurre animazioni di attesa proprie o un «Caricamento…» senza soggetto.
- **Don't** tornare ad angoli da 16px o a ombre morbide e ampie: è uno strumento, non un'app di consumo.
- **Don't** scaricare un monospaziato: quello dei dati è di sistema.
- **Don't** toccare la grafica della schermata di transizione IAM → area preventivi senza richiesta esplicita.
