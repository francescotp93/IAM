-- ═══════════════════════════════════════════════════════════════════════════
--  LA SIGLA DEL TITOLO: NP, QR, QF, AP, SO                     26/09/2026
--
--  FASE 1 — ESPANDI. Aggiunge due colonne e non toglie niente: `tipo` resta
--  com'è e tutte le schermate che lo leggono continuano a funzionare. Il
--  backfill dei titoli storici sta in una migrazione separata
--  (20260926b_sigla_dai_titoli_storici.sql), come vuole il metodo di casa:
--  prima si aggiunge, poi si migra.
--
--  PERCHÉ SERVE. `quote_titoli.tipo` ammette quattro valori e l'agenzia ne
--  distingue cinque, ma il guaio vero è peggio: **lo stesso valore vuol dire
--  due cose diverse a seconda della compagnia**.
--
--    · HDI manda le parole per esteso e le distingue: «Quietanza di Rinnovo»
--      diventa `quietanza`, «Quietanza di Frazionamento» diventa `rata`.
--    · Prima (SSF) manda il codice `QZ`, che nel suo tracciato è **la rata
--      successiva** — quindi un QF — e il lettore lo scrive come `quietanza`,
--      lo stesso valore che per HDI vuol dire rinnovo.
--
--  Misurato il 26/09/2026 sui 3.218 titoli in archivio: 841 sono `quietanza`,
--  e **839 di questi decorrono in media 6,1 mesi dopo l'effetto, tutti dentro
--  l'annualità** (zero decorrono dalla scadenza in poi). Sono quietanze di
--  frazionamento chiamate `quietanza`. Le quietanze di rinnovo vere in
--  archivio sono **due**, entrambe HDI.
--
--  Senza questa colonna, la domanda «chi non ha rinnovato?» risponde 841
--  quando la risposta è 2. Con la colonna, risponde quello che sa.
--
--  LE DUE COLONNE, E PERCHÉ SONO DUE:
--    `sigla_tipo`    — la sigla.
--    `sigla_dedotta` — falso quando la sigla è la parola della compagnia,
--                      vero quando l'abbiamo ricavata noi. Una schermata può
--                      scrivere «QR (dedotta)», e chi guarda sa quanto
--                      fidarsi. Senza questa distinzione una deduzione
--                      diventa un fatto in due settimane.
--
--  ROLLBACK in fondo al file.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.quote_titoli
  add column if not exists sigla_tipo    text,
  add column if not exists sigla_dedotta boolean not null default false;

-- Il vincolo ammette il vuoto: un titolo di cui non si sa la sigla resta
-- senza, e questo è un dato — non un buco da riempire a intuito.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quote_titoli'::regclass and conname = 'quote_titoli_sigla_tipo_chk'
  ) then
    alter table public.quote_titoli
      add constraint quote_titoli_sigla_tipo_chk
      check (sigla_tipo is null or sigla_tipo in ('NP', 'QR', 'QF', 'AP', 'SO'));
  end if;
end $$;

comment on column public.quote_titoli.sigla_tipo is
  'Sigla del titolo: NP nuova polizza, QR quietanza di rinnovo, QF quietanza di frazionamento, AP appendice, SO sostituzione. Affianca `tipo`, non lo sostituisce: `tipo` ha quattro valori e schiaccia NP con SO, e il suo valore «quietanza» vuol dire rinnovo per HDI e frazionamento per Prima. Vuoto = non si sa.';

comment on column public.quote_titoli.sigla_dedotta is
  'Falso: la sigla è la parola della compagnia. Vero: l''abbiamo ricavata noi (dal tracciato, dalla catena delle annualità). Serve perché una deduzione mostrata come un fatto diventa un fatto.';

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- alter table public.quote_titoli drop constraint if exists quote_titoli_sigla_tipo_chk;
-- alter table public.quote_titoli drop column if exists sigla_dedotta;
-- alter table public.quote_titoli drop column if exists sigla_tipo;
--
-- Nessun dato preesistente viene toccato da questa migrazione, quindi il
-- rollback non perde niente di quello che c'era prima.
