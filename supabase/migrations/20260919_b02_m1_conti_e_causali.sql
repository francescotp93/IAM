-- ═══════════════════════════════════════════════════════════════════════════════
--  BRIEF #02 · M1 — I CONTI E LE CAUSALI (19/09/2026)
--
--  È la base di tutto il brief: senza un elenco di conti e un elenco di causali
--  non si può registrare un movimento, e senza movimenti non c'è né prima nota,
--  né estratto conto, né conto economico.
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ LE DUE NATURE DEL DENARO, CHE NON SI MESCOLANO MAI.                     │
--  │                                                                         │
--  │ PREMI      — soldi dei clienti in transito verso la compagnia.          │
--  │              L'art. 117 del Codice delle Assicurazioni li vuole su un   │
--  │              conto SEPARATO dal patrimonio dell'agenzia: non sono       │
--  │              dell'agenzia nemmeno per un giorno.                        │
--  │ AZIENDALE  — soldi dell'agenzia: provvigioni incassate, affitto,        │
--  │              stipendi, utenze, provvigioni pagate alla rete.            │
--  │                                                                         │
--  │ Un conto ha UNA natura e non cambia idea. Una causale dichiara su       │
--  │ quale natura può essere registrata: «Incasso premi» su un conto         │
--  │ aziendale è esattamente la confusione che l'art. 117 vieta, e il        │
--  │ sistema deve saperlo dire prima, non dopo.                              │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ MOVIMENTO ECONOMICO ≠ MOVIMENTO FINANZIARIO.                            │
--  │                                                                         │
--  │ `incide_su_utile` è la colonna che tiene distinte le due cose:          │
--  │                                                                         │
--  │   · «Incasso premi» muove il conto ma NON è un ricavo dell'agenzia:     │
--  │     quei soldi si rimettono in compagnia. incide_su_utile = false.      │
--  │   · «Rimesse in compagnia» muove il conto in uscita e NON è un costo:   │
--  │     è la restituzione di quei soldi. incide_su_utile = false.           │
--  │   · «Provvigioni in entrata» è un ricavo vero. = true.                  │
--  │   · «Pagamento affitti» è un costo vero. = true.                        │
--  │                                                                         │
--  │ Senza questa colonna il conto economico dell'agenzia conterebbe come    │
--  │ utile l'intero premio incassato, cioè soldi di qualcun altro, e         │
--  │ sarebbe un numero grande, credibile e falso.                            │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  MISURATO PRIMA DI SCRIVERE, il 19/09/2026, sul database vero:
--    · non esiste nessuna tabella di conti né di causali: la contabilità di
--      IAM oggi è `sessioni_giornaliere` (68 righe, il foglio del giorno con
--      contanti, sospesi e POS) e `iam_conto` (2 righe, l'estratto conto della
--      banca caricato da file e riconciliato a mano)
--    · `iam_azienda.dati` porta `iban1`, `iban2` e `banca`: due coordinate
--      scritte come testo, che nessuno può usare per registrare un movimento
--
--  NOTA SUL NOME, per chi arriva dopo: esiste già `iam_conto` (SINGOLARE), che
--  è un'altra cosa — l'estratto conto caricato da file, chiave `tipo`, colonne
--  `movimenti`/`bonif`. Non ha nessuna colonna in comune con `iam_conti`:
--  sbagliare tabella non produce numeri sbagliati, produce un errore subito.
--  `iam_conto` è destinato a sparire con la M5 del brief, quando il «Conto»
--  diventerà l'estratto ricostruito dai movimenti.
--
--  ROLLBACK: in fondo al file.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── I CONTI E LE CASSE ───────────────────────────────────────────────────────
create table if not exists public.iam_conti (
  id             uuid primary key default gen_random_uuid(),

  nome           text not null,

  -- Che cos'è materialmente. Serve a chi legge («il conto BPER») e servirà ai
  -- riepiloghi: il fondo cassa teorico della M5 si conta sulle `cassa`, non su
  -- tutto quello che ha un saldo.
  tipologia      text not null default 'banca'
                 check (tipologia in ('banca','cassa','conto_assicurativo','altro')),

  -- La natura del denaro. NOT NULL e senza default «comodo»: un conto di cui
  -- non si sa se tiene soldi dei clienti o dell'agenzia è il conto su cui l'art.
  -- 117 non si può far rispettare.
  natura         text not null
                 check (natura in ('premi','aziendale')),

  iban           text,
  banca          text,

  -- L'UNICO saldo scritto a mano, ed è quello del giorno in cui il conto entra
  -- nel sistema. Tutto il resto si CALCOLA dai movimenti.
  --
  -- Non c'è nessuna colonna `saldo`, ed è una decisione: un saldo memorizzato è
  -- un numero che si aggiorna da un'altra parte, e il giorno in cui si scosta
  -- dalla somma dei movimenti nessuno sa quale dei due sia quello giusto.
  -- Il saldo si ricalcola a ogni lettura; se un giorno costerà troppo si farà
  -- una vista materializzata, che è sempre derivata e non si può contraddire.
  saldo_iniziale numeric(14,2) not null default 0,

  -- Un conto chiuso NON si cancella: i movimenti che ci sono passati sono
  -- storia, e cancellare il conto li renderebbe orfani o li porterebbe via con
  -- sé. Si spegne, esce dalle tendine e resta nei riepiloghi del passato.
  attivo         boolean not null default true,

  ordine         integer not null default 0,
  note           text,

  creato_da      uuid default auth.uid(),
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);

-- Due conti con lo stesso nome sono due tendine identiche: chi registra sceglie
-- a caso, e metà dei movimenti finisce sul conto sbagliato. Il vincolo è sul
-- nome normalizzato, perché «Cassa contanti» e «cassa contanti» sono lo stesso.
create unique index if not exists iam_conti_nome_uni on public.iam_conti (lower(btrim(nome)));
create index if not exists iam_conti_attivi_idx on public.iam_conti (attivo, natura, ordine);

-- ─── LE CAUSALI ───────────────────────────────────────────────────────────────
create table if not exists public.iam_causali (
  id              uuid primary key default gen_random_uuid(),

  -- Il CODICE è la chiave stabile: i movimenti (M3) punteranno all'id, ma il
  -- codice è quello che si legge nei tracciati, nelle esportazioni e nel codice
  -- del preventivatore. Il nome si può correggere senza rompere niente; il
  -- codice no, e infatti non si cambia.
  codice          text not null,

  nome            text not null,

  segno           text not null check (segno in ('entrata','uscita')),

  -- Il cuore del brief: vedi il riquadro in testa al file.
  incide_su_utile boolean not null,

  -- Su quale natura di conto questa causale può essere registrata.
  -- NULL = su tutte. Serve a impedire le due confusioni che contano:
  -- incassare premi su un conto aziendale e pagare le spese di casa con i
  -- soldi dei clienti.
  natura          text check (natura in ('premi','aziendale')),

  attiva          boolean not null default true,
  ordine          integer not null default 0,

  -- Le causali di partenza si possono spegnere e rinominare, non cancellare:
  -- sono quelle a cui si aggancia l'automatismo (l'incasso di una polizza
  -- scrive il movimento con la causale `incasso_premi`, M3), e cancellarle
  -- vorrebbe dire che il giorno dopo l'incasso non sa più che cosa scrivere.
  di_sistema      boolean not null default false,

  note            text,
  creato_da       uuid default auth.uid(),
  creato_il       timestamptz not null default now(),
  aggiornato_il   timestamptz not null default now()
);

create unique index if not exists iam_causali_codice_uni on public.iam_causali (codice);
create unique index if not exists iam_causali_nome_uni   on public.iam_causali (lower(btrim(nome)));
create index if not exists iam_causali_attive_idx on public.iam_causali (attiva, segno, ordine);

-- ─── LE DIECI CAUSALI DI PARTENZA (elenco del brief, alla lettera) ────────────
--
--  `incide_su_utile` è copiato dal brief e non interpretato. Le due righe a
--  `false` sono le due facce dello stesso denaro in transito: entra come premio
--  del cliente, esce come rimessa alla compagnia. Nessuna delle due è un
--  risultato dell'agenzia.
--
--  `on conflict (codice) do nothing`: rilanciare la migrazione non duplica e
--  non riscrive sopra a una causale che qualcuno ha nel frattempo rinominato o
--  spento. Una migrazione che riaccende ogni notte quello che un umano ha
--  spento è una migrazione che litiga con chi lavora.
insert into public.iam_causali (codice, nome, segno, incide_su_utile, natura, ordine, di_sistema) values
  ('provvigioni_collaboratori', 'Pagamento provvigioni ai collaboratori', 'uscita',  true,  'aziendale', 10, true),
  ('provvigioni_entrata',       'Provvigioni in entrata',                 'entrata', true,  'aziendale', 20, true),
  ('affitti',                   'Pagamento affitti',                      'uscita',  true,  'aziendale', 30, true),
  ('acquisto_polizze',          'Acquisto polizze',                       'uscita',  true,  'aziendale', 40, true),
  -- Le due del denaro in transito: muovono il conto, non l'utile.
  ('rimesse_compagnia',         'Rimesse in compagnia',                   'uscita',  false, 'premi',     50, true),
  ('incasso_premi',             'Incasso premi',                          'entrata', false, 'premi',     60, true),
  ('utenze',                    'Pagamento utenze',                       'uscita',  true,  'aziendale', 70, true),
  ('stipendi',                  'Pagamento stipendi',                     'uscita',  true,  'aziendale', 80, true),
  ('spese_bancarie',            'Spese bancarie',                         'uscita',  true,  null,        90, true),
  ('spese_generiche',           'Spese in genere',                        'uscita',  true,  null,       100, true)
on conflict (codice) do nothing;

-- Le spese bancarie e le spese in genere restano a natura NULL di proposito:
-- il bollo e le commissioni li addebita anche la banca del conto premi, e
-- vietarli lì vorrebbe dire non poter registrare un movimento che è successo.

-- ─── CHI VEDE E CHI SCRIVE ────────────────────────────────────────────────────
--
--  Leggere: tutto lo staff. Un conto e una causale non sono un dato personale,
--  e chi registra un movimento (M3) deve poterli scegliere.
--  Un collaboratore esterno non li vede: non registra movimenti, e l'elenco dei
--  conti dell'agenzia con gli IBAN non è roba sua.
--
--  Scrivere: solo l'admin. Qui si decide dove finiscono i soldi e come si
--  chiamano i movimenti: è la stessa soglia dei codici collaboratore (§19), e
--  per lo stesso motivo — sotto c'è del denaro.
alter table public.iam_conti   enable row level security;
alter table public.iam_causali enable row level security;

drop policy if exists conti_select on public.iam_conti;
create policy conti_select on public.iam_conti
  for select to authenticated using (public.iam_is_staff());

drop policy if exists conti_write on public.iam_conti;
create policy conti_write on public.iam_conti
  for all to authenticated
  using (public.iam_is_admin())
  with check (public.iam_is_admin());

drop policy if exists causali_select on public.iam_causali;
create policy causali_select on public.iam_causali
  for select to authenticated using (public.iam_is_staff());

drop policy if exists causali_write on public.iam_causali;
create policy causali_write on public.iam_causali
  for all to authenticated
  using (public.iam_is_admin())
  with check (public.iam_is_admin());

-- ─── UNA CAUSALE DI SISTEMA NON SI CANCELLA ───────────────────────────────────
--
--  Il permesso di scrittura è dell'admin e basterebbe un clic distratto: la
--  regola sta nel database e non nella schermata, perché la schermata è una
--  delle strade e non l'unica (c'è la console, c'è PostgREST, ci sarà QUOTO).
create or replace function public.iam_causali_no_delete_sistema()
returns trigger language plpgsql as $$
begin
  if old.di_sistema then
    raise exception 'La causale «%» è di sistema: si può spegnere (attiva = false), non cancellare.', old.nome;
  end if;
  return old;
end $$;

drop trigger if exists iam_causali_no_delete_sistema_trg on public.iam_causali;
create trigger iam_causali_no_delete_sistema_trg
  before delete on public.iam_causali
  for each row execute function public.iam_causali_no_delete_sistema();

-- ─── `aggiornato_il` non si scrive a mano ─────────────────────────────────────
--  Una data «ultimo aggiornamento» che dipende da chi si ricorda di passarla è
--  una data che mente proprio nei casi che interessano.
create or replace function public.iam_tocca_aggiornato_il()
returns trigger language plpgsql as $$
begin
  new.aggiornato_il := now();
  return new;
end $$;

drop trigger if exists iam_conti_tocca_trg on public.iam_conti;
create trigger iam_conti_tocca_trg before update on public.iam_conti
  for each row execute function public.iam_tocca_aggiornato_il();

drop trigger if exists iam_causali_tocca_trg on public.iam_causali;
create trigger iam_causali_tocca_trg before update on public.iam_causali
  for each row execute function public.iam_tocca_aggiornato_il();

-- ═══════════════════════════════════════════════════════════════════════════════
--  ROLLBACK (da incollare a mano, in quest'ordine)
--
--    drop trigger if exists iam_causali_no_delete_sistema_trg on public.iam_causali;
--    drop function if exists public.iam_causali_no_delete_sistema();
--    drop trigger if exists iam_conti_tocca_trg   on public.iam_conti;
--    drop trigger if exists iam_causali_tocca_trg on public.iam_causali;
--    drop function if exists public.iam_tocca_aggiornato_il();
--    drop table if exists public.iam_causali;
--    drop table if exists public.iam_conti;
--
--  Attenzione: dalla M3 i movimenti punteranno a queste due tabelle con una
--  chiave esterna. Da quel momento il rollback non è più «togliere due tabelle
--  vuote»: porta via anche i movimenti, e va rifatto sapendolo.
-- ═══════════════════════════════════════════════════════════════════════════════
