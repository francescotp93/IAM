-- ═══════════════════════════════════════════════════════════════════════════
--  QUANDO IL SALDO DI PARTENZA È STATO DICHIARATO  (21/09/2026)
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ Una colonna nuova, nullable, senza default. Nessuna riga riscritta,     │
--  │ nessun valore inventato: nasce vuota su tutti e tre i conti, ed è       │
--  │ esatta — nessuno ha ancora dichiarato un saldo di partenza.             │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   alter table iam_conti drop column if exists saldo_dichiarato_il;      │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── PERCHÉ ESISTE: UNO ZERO NON DICE SE QUALCUNO L'HA DECISO ─────────────
--  `saldo_iniziale` nasce a 0. Ma **zero è anche un saldo di partenza vero**:
--  un conto aperto oggi parte da zero, ed è una dichiarazione legittima.
--  Guardando solo la cifra, «il saldo vero è zero» e «nessuno l'ha mai
--  scritto» si leggono uguali — e per la schermata delle decisioni aperte la
--  differenza è tutta: la prima è una voce a posto, la seconda è un saldo
--  ricostruito che parte da un numero che non è quello.
--
--  È lo stesso difetto misurato lo stesso giorno sulle anagrafiche, dove
--  `ha_figli`/`sposato`/`casa_proprieta` nascono a `false` e un «no» non si
--  distingue da «nessuno l'ha mai chiesto» (CLAUDE.md §42). Lì non si poteva
--  rimediare a posteriori — i `false` già scritti restano ambigui per sempre.
--  Qui si può, perché la colonna nasce adesso: si registra QUANDO è stato
--  dichiarato, e da quel momento i due casi non si confondono più.
--
--  Non si finge che i saldi attuali siano stati dichiarati: la colonna resta
--  vuota finché una persona non salva un saldo dalla schermata. Riempirla con
--  la data di creazione del conto direbbe che qualcuno ha deciso zero, e non
--  è vero (regola di casa §8.1).
-- ═══════════════════════════════════════════════════════════════════════════

alter table iam_conti
  add column if not exists saldo_dichiarato_il timestamptz;

comment on column iam_conti.saldo_dichiarato_il is
  $c$Quando qualcuno ha dichiarato il saldo di partenza di questo conto. NULL = mai dichiarato, che NON e' «e' zero»: zero e' un saldo di partenza legittimo, e senza questa colonna i due casi si leggono uguali. La scrive la schermata dei conti al salvataggio.$c$;
