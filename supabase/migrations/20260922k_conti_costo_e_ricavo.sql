-- ═══════════════════════════════════════════════════════════════════════════
-- I DUE CONTI CHE MANCAVANO: COSTO E RICAVO (22/09/2026)
--
-- Segnalazione di Francesco:
--   «Quadratura conti, ho inserito un saldo iniziale ed ho aggiunto delle
--    spese.. ma essendo spese si dovrebbe defalcare dal saldo, invece il
--    programma le somma»
--
-- ── MISURATO PRIMA DI SCRIVERE, SUL MOVIMENTO VERO ────────────────────────
-- «Pagamento Stanza ROMA», 170,00 €, causale «Spese in genere» (uscita):
--     riga 1  CARTA DI CREDITO UNICREDIT   Avere 170   → effetto −170  giusto
--     riga 2  CONTO AZIENDALE              Dare  170   → effetto +170  SBAGLIATO
-- Il conto aziendale non ha incassato niente.
--
-- ── LA CAUSA NON ERA IL SEGNO ─────────────────────────────────────────────
-- La partita doppia era corretta: la contropartita di un costo VA in Dare.
-- Il difetto è che quel Dare è finito su un conto di LIQUIDITÀ, dove Dare
-- vuol dire «denaro arrivato». E ci è finito perché fra i dodici conti minimi
-- non ce n'era nemmeno uno di costo: la contropartita di una spesa non aveva
-- dove andare, e qualunque conto si scegliesse era sbagliato.
--
-- È il guasto §1 in una forma nuova: **la schermata fa una domanda la cui
-- unica risposta onesta non esiste nell'elenco.**
--
-- ── COSA FA QUESTA MIGRAZIONE, E COSA NON FA ──────────────────────────────
-- FA: allarga il vocabolario delle tipologie a `costo` e `ricavo`.
-- NON FA: non crea nessun conto. I conti li crea una persona dalla schermata
-- (§54: un conto ha un saldo, e dodici saldi a zero che nessuno ha deciso,
-- dopo due settimane, sono dodici dati). «Costi di agenzia» e «Ricavi di
-- agenzia» sono nell'elenco dei conti minimi PROPOSTI, si spuntano e si
-- creano.
-- NON FA: non corregge il movimento del 22/09. Un movimento registrato non si
-- riscrive: si storna, e lo storno è nella schermata (regola 13, §54). Quello
-- va fatto a mano, perché è una scrittura di contabilità e la decide chi la
-- firma.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.iam_conti drop constraint if exists iam_conti_tipologia_check;
alter table public.iam_conti
  add constraint iam_conti_tipologia_check
  check (tipologia in ('banca','cassa','conto_assicurativo','transitorio',
                       'credito','debito','rettifica','costo','ricavo','altro'));

comment on column public.iam_conti.tipologia is
  'Che cosa è questo conto. `banca`, `cassa`, `conto_assicurativo` e '
  '`transitorio` sono le tipologie in cui il DENARO c''è davvero (Contabilita.LIQUIDE): '
  'su quelle un Dare vuol dire «arrivato». `costo` e `ricavo` non sono denaro: '
  'sono la contropartita di una spesa o di un guadagno, e non entrano in nessun '
  'saldo di liquidità né si quadrano — un costo non si conta aprendo un cassetto.';

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- ATTENZIONE: torna indietro solo se nessun conto usa le due tipologie nuove,
-- altrimenti il CHECK stretto le rifiuta e l'ALTER fallisce lasciando la
-- tabella senza vincolo. Prima si guarda:
--   select nome, tipologia from iam_conti where tipologia in ('costo','ricavo');
--
-- alter table public.iam_conti drop constraint iam_conti_tipologia_check;
-- alter table public.iam_conti add constraint iam_conti_tipologia_check
--   check (tipologia in ('banca','cassa','conto_assicurativo','transitorio',
--                        'credito','debito','rettifica','altro'));
--   ^ e da quel momento una spesa torna a non avere una contropartita onesta.
