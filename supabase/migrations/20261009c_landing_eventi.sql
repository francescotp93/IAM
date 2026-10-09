-- Il contatore delle landing (09/10/2026).
--
-- Una riga per evento: visita, calcolo del premio, richiesta di preventivo,
-- checkout, acquisto. Niente cookie, niente indirizzo IP, niente dati di
-- persone: `visitatore` è un'impronta che cambia ogni giorno (la calcola il
-- server, server/landingStatistiche.js) e serve solo a contare le persone
-- invece delle aperture.
--
-- Scrive SOLO il server, con la chiave di servizio: nessuna politica di
-- inserimento, quindi dal browser non si scrive. Legge chi lavora in agenzia
-- e chi ha il Lab abilitato.

create table if not exists public.iam_landing_eventi (
  id          bigint generated always as identity primary key,
  creato_il   timestamptz not null default now(),
  giorno      date not null,
  evento      text not null check (evento in ('visita','calcolo','richiesta','checkout','acquisto')),
  prodotto    text not null check (prodotto ~ '^[a-z0-9-]{1,40}$'),
  canale      text not null default 'diretto' check (canale ~ '^[a-z0-9-]{1,40}$'),
  campagna    text check (campagna is null or campagna ~ '^[a-z0-9-]{1,40}$'),
  visitatore  text not null check (visitatore ~ '^[0-9a-f]{16}$')
);

create index if not exists iam_landing_eventi_giorno_idx on public.iam_landing_eventi (giorno, prodotto);

alter table public.iam_landing_eventi enable row level security;

create policy landing_eventi_select on public.iam_landing_eventi for select to authenticated
  using ((select public.iam_is_staff())
      or exists (select 1 from public.iam_utenti u where u.id = auth.uid() and coalesce(u.lab_abilitato, false)));

/* Il conto lo fa il database e torna poche righe: le visite di un mese non
   scendono nel browser una per una (§45). SECURITY INVOKER: chi non può
   leggere gli eventi non li vede nemmeno sommati.

   Le persone si contano come «visitatori unici al giorno»: l'impronta cambia
   ogni giorno, quindi la stessa persona in due giorni conta due. Ogni passo
   dell'imbuto conta le PERSONE che l'hanno fatto, non le volte: chi ricalcola
   il premio tre volte è una persona che ha calcolato. */
create or replace function public.iam_landing_statistiche(p_dal date, p_al date)
returns table (prodotto text, canale text, campagna text,
               aperture bigint, visitatori bigint, calcoli bigint,
               richieste bigint, checkout bigint, acquisti bigint)
language sql stable security invoker set search_path to 'public' as $$
  select e.prodotto, e.canale, e.campagna,
         count(*) filter (where e.evento = 'visita'),
         count(distinct e.giorno::text || e.visitatore) filter (where e.evento = 'visita'),
         count(distinct e.giorno::text || e.visitatore) filter (where e.evento = 'calcolo'),
         count(distinct e.giorno::text || e.visitatore) filter (where e.evento = 'richiesta'),
         count(distinct e.giorno::text || e.visitatore) filter (where e.evento = 'checkout'),
         count(distinct e.giorno::text || e.visitatore) filter (where e.evento = 'acquisto')
    from public.iam_landing_eventi e
   where e.giorno between p_dal and p_al
   group by e.prodotto, e.canale, e.campagna
   order by 4 desc;
$$;

/* L'andamento giorno per giorno, per il grafico: aperture e visitatori. */
create or replace function public.iam_landing_giorni(p_dal date, p_al date)
returns table (giorno date, aperture bigint, visitatori bigint)
language sql stable security invoker set search_path to 'public' as $$
  select e.giorno, count(*), count(distinct e.visitatore)
    from public.iam_landing_eventi e
   where e.evento = 'visita' and e.giorno between p_dal and p_al
   group by e.giorno order by e.giorno;
$$;

grant execute on function public.iam_landing_statistiche(date, date) to authenticated;
grant execute on function public.iam_landing_giorni(date, date) to authenticated;

-- ROLLBACK:
-- drop function if exists public.iam_landing_giorni(date, date);
-- drop function if exists public.iam_landing_statistiche(date, date);
-- drop table if exists public.iam_landing_eventi;
