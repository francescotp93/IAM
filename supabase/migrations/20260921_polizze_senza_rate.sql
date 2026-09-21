-- ═══════════════════════════════════════════════════════════════════════════
--  QUANTE POLIZZE NON HANNO NEMMENO UNA RATA — 21/09/2026
--
--  MISURATO PRIMA DI SCRIVERE: 1.700 polizze su 1.720 non hanno nemmeno una
--  riga in `quote_titoli`. Tutte e 1.700 vengono dal flusso della compagnia;
--  le 20 che le hanno sono le 15 del flusso del 18/09 e le 5 nate da un
--  preventivo. La causa e' l'importazione interrotta del 21/09 alle 06:36
--  (CLAUDE.md §47), e le rate perse non si ricostruiscono dal database:
--  stanno solo nel file della compagnia.
--
--  Perche' una funzione e non una lettura dalla pagina: 1.720 polizze non si
--  scaricano nel browser per contarle (§45), e il numero serve a una
--  schermata che si apre spesso. Il conto lo fa Postgres e torna una riga.
--
--  SECURITY INVOKER, e non e' una formalita': chi non puo' leggere una
--  polizza non deve vederla nemmeno sommata, altrimenti un totale direbbe a
--  un collaboratore quante polizze ha l'agenzia.
--
--  Che cosa NON fa: non scrive niente, non ripara niente, non prova a
--  ricostruire nessuna rata. Dice un numero, e chi lo legge decide.
--
--  ── ROLLBACK ──────────────────────────────────────────────────────────────
--    drop function if exists public.iam_polizze_senza_rate();
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.iam_polizze_senza_rate()
returns table (
  totale      bigint,   -- le polizze che chi chiama puo' vedere
  senza_rate  bigint,   -- di quelle, quante non hanno nemmeno un titolo
  premio      numeric   -- il premio annuo di quelle: quanto non e' in contabilita'
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (
      where not exists (select 1 from public.quote_titoli t where t.polizza_id = p.id)
    )::bigint,
    /* Il premio si somma solo dove c'e'. Una polizza senza premio annuo non
       vale zero (§36, §42, §45): sommare zero direbbe che quelle righe non
       pesano niente, e non e' vero — e' che non si sa quanto pesano. */
    coalesce(sum(p.premio_annuo) filter (
      where not exists (select 1 from public.quote_titoli t where t.polizza_id = p.id)
    ), 0)::numeric
  from public.quote_polizze p;
$$;

comment on function public.iam_polizze_senza_rate() is
  'Quante polizze visibili non hanno nemmeno una rata, e quanto premio annuo vale. Sola lettura, rispetta le politiche di chi chiama.';

grant execute on function public.iam_polizze_senza_rate() to authenticated;
