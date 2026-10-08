-- Le trattative, rifatte (08/10/2026).
--
-- Misurato prima: 19 trattative (16 prospect, 1 in trattativa, 2 chiuse), il
-- cliente e il prodotto scritti come testo libero, il collaboratore come un
-- nome. Le colonne nuove stanno ACCANTO a quelle di prima, e nessuna di
-- quelle di prima si riscrive: `cliente`, `prodotto`, `collab` e `importo`
-- restano, e le righe vecchie continuano a leggersi com'erano.
--
-- Nessun valore di partenza inventato (§8.1): un ramo, una compagnia, un
-- premio o un'aliquota che nessuno ha scritto restano vuoti.

alter table public.iam_trattative
  add column if not exists ramo text,
  add column if not exists target boolean not null default false,
  add column if not exists compagnia_id uuid references public.quote_compagnie(id) on delete set null,
  add column if not exists compagnia text,
  add column if not exists prodotto_id uuid references public.iam_compagnia_prodotti(id) on delete set null,
  add column if not exists collaboratore_id uuid references public.quote_collaboratori(id) on delete set null,
  add column if not exists richiede_autorizzazione boolean not null default false,
  add column if not exists autorizzazione_stato text,
  add column if not exists autorizzata_da uuid,
  add column if not exists autorizzata_il timestamptz,
  add column if not exists premio_lordo numeric,
  add column if not exists aliquota_imposte numeric,
  add column if not exists aliquota_fonte text,
  add column if not exists premio_netto numeric,
  add column if not exists imposta_provinciale numeric,
  add column if not exists recall_ora text,
  add column if not exists agenda_id text,
  add column if not exists chiusa_il date;

alter table public.iam_trattative
  add constraint iam_trattative_autorizzazione_ck
    check (autorizzazione_stato is null or autorizzazione_stato in ('in_attesa','concessa','negata')),
  add constraint iam_trattative_aliquota_ck
    check (aliquota_imposte is null or (aliquota_imposte >= 0 and aliquota_imposte <= 100)),
  add constraint iam_trattative_provinciale_ck
    check (imposta_provinciale is null or (imposta_provinciale >= 0 and imposta_provinciale <= 100)),
  add constraint iam_trattative_premio_ck
    check (premio_lordo is null or premio_lordo >= 0),
  add constraint iam_trattative_fonte_ck
    check (aliquota_fonte is null or aliquota_fonte in ('manuale','prodotto','ramo'));

-- L'anagrafica del cliente (cliente in portafoglio o prospect): la colonna
-- c'era gia', senza il legame. Un id che punta a una riga che non esiste e'
-- peggio di un id assente (§18).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'iam_trattative_anagrafica_fk') then
    alter table public.iam_trattative
      add constraint iam_trattative_anagrafica_fk foreign key (anagrafica_id)
      references public.quote_anagrafiche(id) on delete set null not valid;
  end if;
end $$;

create index if not exists iam_trattative_anagrafica_idx on public.iam_trattative (anagrafica_id) where anagrafica_id is not null;
create index if not exists iam_trattative_collaboratore_idx on public.iam_trattative (collaboratore_id) where collaboratore_id is not null;

-- L'aliquota delle imposte la dichiara il PRODOTTO: e' l'unico che sa quali
-- garanzie contiene. Vuota finche' nessuno la scrive.
alter table public.iam_compagnia_prodotti
  add column if not exists aliquota_imposte numeric;
alter table public.iam_compagnia_prodotti
  add constraint iam_compagnia_prodotti_aliquota_ck
    check (aliquota_imposte is null or (aliquota_imposte >= 0 and aliquota_imposte <= 100));

-- L'autorizzazione della direzione la concede lo staff, non chi ha aperto la
-- trattativa: la politica di aggiornamento lascia al proprietario la sua
-- riga, quindi il controllo sta qui. E una trattativa che aspetta (o a cui e'
-- stata negata) l'autorizzazione non si chiude vinta.
create or replace function public.iam_trattative_regole()
returns trigger language plpgsql security invoker set search_path = public, extensions as $$
begin
  if new.richiede_autorizzazione then
    if new.autorizzazione_stato is null then new.autorizzazione_stato := 'in_attesa'; end if;
  else
    new.autorizzazione_stato := null; new.autorizzata_da := null; new.autorizzata_il := null;
  end if;

  if new.autorizzazione_stato in ('concessa','negata')
     and (tg_op = 'INSERT' or new.autorizzazione_stato is distinct from old.autorizzazione_stato) then
    if not public.iam_is_staff() then
      raise exception 'Solo la direzione concede o nega un''autorizzazione';
    end if;
    new.autorizzata_da := auth.uid();
    new.autorizzata_il := now();
  end if;

  if new.status = 'chiusa' and new.richiede_autorizzazione
     and coalesce(new.autorizzazione_stato,'') <> 'concessa' then
    raise exception 'La trattativa aspetta l''autorizzazione della direzione: non si chiude vinta';
  end if;

  -- La data di chiusura nasce quando la trattativa si decide, e se torna in
  -- corso si toglie: una data di chiusura su una trattativa aperta e' falsa.
  if new.status in ('chiusa','persa') then
    if new.chiusa_il is null or (tg_op = 'UPDATE' and old.status is distinct from new.status) then
      new.chiusa_il := current_date;
    end if;
  else
    new.chiusa_il := null;
  end if;
  return new;
end $$;

drop trigger if exists iam_trattative_regole_tg on public.iam_trattative;
create trigger iam_trattative_regole_tg before insert or update on public.iam_trattative
  for each row execute function public.iam_trattative_regole();

-- Le due chiuse di prima prendono la data dell'ultimo aggiornamento: e' la
-- sola data che dice quando sono state toccate l'ultima volta.
update public.iam_trattative set chiusa_il = coalesce(aggiornato_il::date, data_ins)
 where status in ('chiusa','persa') and chiusa_il is null;

-- ROLLBACK
-- drop trigger if exists iam_trattative_regole_tg on public.iam_trattative;
-- drop function if exists public.iam_trattative_regole();
-- alter table public.iam_compagnia_prodotti drop column if exists aliquota_imposte;
-- alter table public.iam_trattative drop constraint if exists iam_trattative_anagrafica_fk,
--   drop column if exists ramo, drop column if exists target, drop column if exists compagnia_id,
--   drop column if exists compagnia, drop column if exists prodotto_id, drop column if exists collaboratore_id,
--   drop column if exists richiede_autorizzazione, drop column if exists autorizzazione_stato,
--   drop column if exists autorizzata_da, drop column if exists autorizzata_il, drop column if exists premio_lordo,
--   drop column if exists aliquota_imposte, drop column if exists aliquota_fonte, drop column if exists premio_netto,
--   drop column if exists imposta_provinciale, drop column if exists recall_ora, drop column if exists agenda_id,
--   drop column if exists chiusa_il;
