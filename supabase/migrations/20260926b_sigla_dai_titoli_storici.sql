-- ═══════════════════════════════════════════════════════════════════════════
--  LA SIGLA SUI 3.218 TITOLI CHE C'ERANO GIÀ                   26/09/2026
--
--  FASE 2 — MIGRA. Scrive la sigla **solo dove la prova sta dentro la riga**.
--  Dove non c'è, la colonna resta vuota: un titolo senza sigla è
--  un'informazione («non lo sappiamo»), un titolo con la sigla sbagliata è una
--  bugia che nessuno ricontrolla più.
--
--  QUELLO CHE SI SA, RIGA PER RIGA (misurato il 26/09/2026):
--
--  ┌──────────────────────────────────┬───────┬───────┬─────────────────────┐
--  │ da che cosa                      │ righe │ sigla │ dedotta?            │
--  ├──────────────────────────────────┼───────┼───────┼─────────────────────┤
--  │ nota «HDI: Nuova Polizza.»       │     ~ │ NP    │ no, è la sua parola │
--  │ nota «HDI: Sostituzione.»        │     ~ │ SO    │ no                  │
--  │ nota «HDI: Quietanza di Rinnovo» │     2 │ QR    │ no                  │
--  │ nota «HDI: Quietanza di Frazion.»│     0 │ QF    │ no                  │
--  │ nota «HDI: Appendice.»           │     1 │ AP    │ no                  │
--  │ fonte ssf + tipo «quietanza»     │   839 │ QF    │ SÌ                  │
--  │ nota «Rata dedotta dal frazion.» │    38 │ QF    │ SÌ                  │
--  └──────────────────────────────────┴───────┴───────┴─────────────────────┘
--
--  PERCHÉ LE 839 SONO QF E NON QR. Il tracciato di Prima chiama `QZ` «la rata
--  successiva», e il lettore lo traduce in `tipo = 'quietanza'` — lo stesso
--  valore che per HDI vuol dire rinnovo. I numeri sciolgono il dubbio senza
--  bisogno di fidarsi del tracciato: di quelle 841 righe, **839 decorrono
--  dentro l'annualità della polizza** (in media 6,1 mesi dopo l'effetto, su
--  polizze semestrali) e **zero decorrono dalla scadenza in poi**. Una
--  quietanza di rinnovo decorre dal rinnovo: queste no.
--
--  QUELLO CHE RESTA VUOTO, DI PROPOSITO:
--    · 2.289 titoli `prima_rata` di Prima. Il codice `PN` del suo tracciato
--      copre nuovo affare, rinnovo E sostituzione: scriverci NP vorrebbe dire
--      dichiarare «nuovo cliente» su un rinnovo, e nascondere proprio i
--      rinnovi che servono per sapere chi non ha rinnovato. Si distinguono
--      dalla catena delle annualità (sulla stessa targa, una polizza che
--      comincia dove finisce la precedente): è una deduzione che va prima
--      scritta in un motore e provata, e arriverà in una migrazione sua.
--    · 39 titoli senza fonte, messi a mano o da un import vecchio: nessuna
--      parola di nessuna compagnia da cui ricavare niente.
--
--  ROLLBACK: `update quote_titoli set sigla_tipo = null, sigla_dedotta = false;`
--  Non perde niente, perché prima di questa migrazione la colonna era vuota
--  su tutte e 3.218 le righe (verificato: `count(sigla_tipo) = 0`).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. la parola della compagnia, quando c'è ───────────────────────────────
update public.quote_titoli set sigla_tipo = 'NP', sigla_dedotta = false
 where sigla_tipo is null and note ilike 'HDI: Nuova Polizza%';

update public.quote_titoli set sigla_tipo = 'SO', sigla_dedotta = false
 where sigla_tipo is null and note ilike 'HDI: Sostituzione%';

update public.quote_titoli set sigla_tipo = 'QR', sigla_dedotta = false
 where sigla_tipo is null and note ilike 'HDI: Quietanza di Rinnovo%';

update public.quote_titoli set sigla_tipo = 'QF', sigla_dedotta = false
 where sigla_tipo is null and note ilike 'HDI: Quietanza di Frazionamento%';

update public.quote_titoli set sigla_tipo = 'AP', sigla_dedotta = false
 where sigla_tipo is null and note ilike 'HDI: Appendice%';

-- ── 2. il codice QZ di Prima: frazionamento, non rinnovo ───────────────────
update public.quote_titoli set sigla_tipo = 'QF', sigla_dedotta = true
 where sigla_tipo is null and fonte = 'ssf' and tipo = 'quietanza';

-- ── 3. le rate che abbiamo dedotto noi dal frazionamento ───────────────────
update public.quote_titoli set sigla_tipo = 'QF', sigla_dedotta = true
 where sigla_tipo is null and note ilike 'Rata dedotta dal frazionamento%';

-- ── 4. le appendici, dette da chiunque ─────────────────────────────────────
update public.quote_titoli set sigla_tipo = 'AP', sigla_dedotta = true
 where sigla_tipo is null and tipo = 'appendice';
