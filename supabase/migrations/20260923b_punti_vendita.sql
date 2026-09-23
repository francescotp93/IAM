-- ═══════════════════════════════════════════════════════════════════════════
--  I PUNTI VENDITA  (23/09/2026)
--
--  MISURATO PRIMA DI SCRIVERE:
--    · nessuna tabella dei punti vendita esiste;
--    · `iam_utenti.rete` e' un campo di TESTO LIBERO: 4 account su 5 ce l'hanno
--      vuoto, uno dice «Test»;
--    · la pagina «Reti / Punti vendita» del preventivatore e' un segnaposto.
--
--  Quindi non si migra niente e non si semina niente: la tabella nasce vuota,
--  e il primo punto vendita lo crea una persona. Inventarne uno («Agenzia
--  Generale») vorrebbe dire mettere in archivio una struttura che nessuno ha
--  deciso, e dopo due settimane sarebbe un dato (regola di casa §8.1).
--
--  `iam_utenti.rete` NON SI TOCCA e non si legge piu': e' il campo di testo da
--  cui si viene. Cancellarlo adesso vorrebbe dire buttare via l'unica traccia
--  di quello che c'era; si toglie quando i punti vendita veri ci sono.
--
--  ROLLBACK in fondo.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists iam_punti_vendita (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  codice        text,
  padre_id      uuid references iam_punti_vendita(id) on delete restrict,
  data_inizio   date,
  data_fine     date,
  attivo        boolean not null default true,

  -- Le quattro abilitazioni della schermata. NASCONO SPENTE, ed e' voluto: un
  -- punto vendita che nasce potendo emettere polizze e' un permesso che
  -- nessuno ha dato. Si accendono spuntandole.
  puo_proposta   boolean not null default false,
  puo_emissione  boolean not null default false,
  puo_incasso    boolean not null default false,
  puo_quotazione boolean not null default false,

  note          text,
  creato_il     timestamptz not null default now(),
  creato_da     uuid,
  aggiornato_il timestamptz,

  constraint iam_pv_periodo check (data_fine is null or data_inizio is null or data_fine >= data_inizio),
  constraint iam_pv_non_padre_di_se check (padre_id is null or padre_id <> id)
);

-- Due punti vendita con lo stesso codice sono due elenchi che non si
-- incrociano il giorno in cui qualcuno ci attribuisce delle polizze. Il
-- vincolo sta qui e non solo nella schermata: la schermata e' una delle
-- strade, non l'unica (c'e' la console, c'e' PostgREST).
create unique index if not exists iam_pv_codice_uidx
  on iam_punti_vendita (lower(codice)) where codice is not null and codice <> '';

create index if not exists iam_pv_padre_idx on iam_punti_vendita (padre_id);

-- ─── LE PERSONE ────────────────────────────────────────────────────────────
-- Il punto vendita sta sulla PERSONA del registro unico (quote_collaboratori,
-- 17 righe), non sull'account (iam_utenti, 5 righe): dodici persone che
-- lavorano da qualche parte non hanno un accesso a IAM, e appenderlo
-- all'account le lascerebbe fuori. E' lo stesso motivo per cui l'elenco Utenti
-- parte dalle persone e non dagli account.
alter table quote_collaboratori
  add column if not exists punto_vendita_id uuid references iam_punti_vendita(id) on delete set null;

create index if not exists quote_collab_pv_idx on quote_collaboratori (punto_vendita_id);

-- ─── UN ANELLO NON SI CHIUDE ───────────────────────────────────────────────
-- A padre di B e B padre di A manda in cerchio chiunque disegni l'albero, e il
-- vincolo di colonna prende solo il caso «padre di se stesso». Il divieto vero
-- e' qui: la schermata lo dice prima, ma non e' lei a garantirlo.
create or replace function iam_pv_no_anello() returns trigger
language plpgsql as $$
declare cur uuid; giri int := 0;
begin
  if new.padre_id is null then return new; end if;
  cur := new.padre_id;
  while cur is not null and giri < 200 loop
    if cur = new.id then
      raise exception 'Anello nella struttura dei punti vendita: % sta gia sopra al padre scelto', new.nome;
    end if;
    select padre_id into cur from iam_punti_vendita where id = cur;
    giri := giri + 1;
  end loop;
  return new;
end $$;

drop trigger if exists iam_pv_no_anello_trg on iam_punti_vendita;
create trigger iam_pv_no_anello_trg before insert or update of padre_id on iam_punti_vendita
  for each row execute function iam_pv_no_anello();

-- ─── NON SI CANCELLA, SI SPEGNE ────────────────────────────────────────────
-- Un punto vendita con delle filiali sotto o con delle persone dentro non si
-- cancella: cancellarlo renderebbe orfane le filiali e lascerebbe delle
-- persone che lavorano in un posto che non esiste. Il `on delete restrict` sul
-- padre copre il primo caso; questo trigger copre il secondo e dice perche'.
create or replace function iam_pv_no_delete() returns trigger
language plpgsql as $$
declare n int;
begin
  select count(*) into n from quote_collaboratori where punto_vendita_id = old.id;
  if n > 0 then
    raise exception 'In questo punto vendita lavorano % persone: spegnilo invece di cancellarlo', n;
  end if;
  return old;
end $$;

drop trigger if exists iam_pv_no_delete_trg on iam_punti_vendita;
create trigger iam_pv_no_delete_trg before delete on iam_punti_vendita
  for each row execute function iam_pv_no_delete();

-- ─── CHI LEGGE E CHI SCRIVE ────────────────────────────────────────────────
-- Leggere: lo staff. La struttura dell'agenzia serve a chi lavora, e i nomi
-- dei punti vendita compaiono nelle tendine.
-- Scrivere: l'admin. Qui si decide chi puo' emettere una polizza e chi puo'
-- incassare: e' la stessa soglia dei codici collaboratore e dei conti.
-- Il cancello VERO sta qui, non nel bottone nascosto.
alter table iam_punti_vendita enable row level security;

drop policy if exists pv_select on iam_punti_vendita;
create policy pv_select on iam_punti_vendita for select using (iam_is_staff());

drop policy if exists pv_insert on iam_punti_vendita;
create policy pv_insert on iam_punti_vendita for insert with check (iam_is_admin());

drop policy if exists pv_update on iam_punti_vendita;
create policy pv_update on iam_punti_vendita for update using (iam_is_admin()) with check (iam_is_admin());

drop policy if exists pv_delete on iam_punti_vendita;
create policy pv_delete on iam_punti_vendita for delete using (iam_is_admin());

-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- drop trigger if exists iam_pv_no_delete_trg on iam_punti_vendita;
-- drop trigger if exists iam_pv_no_anello_trg on iam_punti_vendita;
-- drop function if exists iam_pv_no_delete();
-- drop function if exists iam_pv_no_anello();
-- drop index if exists quote_collab_pv_idx;
-- alter table quote_collaboratori drop column if exists punto_vendita_id;
-- drop table if exists iam_punti_vendita;
