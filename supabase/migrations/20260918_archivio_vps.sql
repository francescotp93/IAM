-- ═══════════════════════════════════════════════════════════════════════════════
--  I METADATI DELL'ARCHIVIO CIFRATO SUL VPS (18/09/2026)
--
--  Sul disco del VPS ci sono solo file cifrati, con nomi che sono
--  identificativi casuali: da soli non dicono di chi sono, che cosa sono, né
--  se sono ancora quello che erano. Tutto il resto sta qui.
--
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ PERCHÉ QUESTA TABELLA È IL PERMESSO, E NON SOLO UN ELENCO.              │
--  │                                                                         │
--  │ Il server, per aprire un documento, rilegge la sua riga CON IL TOKEN DI │
--  │ CHI STA CHIEDENDO. Se le politiche qui sotto non gliela fanno vedere,   │
--  │ la riga non torna e non c'è niente da decifrare. Così la regola di      │
--  │ visibilità resta UNA e sta dove stanno già tutte le altre: riscriverla  │
--  │ nel server vorrebbe dire averne due, che prima o poi diranno cose       │
--  │ diverse — e quella che sbaglia sarà quella che nessuno guarda.          │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  Le politiche ricalcano `pdoc_select` di quote_pratica_documenti
--  (20260918_pratiche_senza_polizza.sql): chi vede la polizza vede i suoi
--  documenti, chi vede la pratica vede i suoi, e per tutto il resto vale il
--  proprietario. Non è una scelta nuova: è la stessa regola, applicata a un
--  archivio che sta altrove.
--
--  QUI NON C'È NIENTE DI SEGRETO. Nome del file, tipo, dimensione, impronta,
--  percorso relativo: niente di tutto questo apre un documento. La chiave non
--  sta in questa tabella e non deve starci mai — è scritta anche nel commento
--  della colonna, perché è il punto in cui verrebbe voglia di metterla.
--
--  SOLO AGGIUNTE. Non tocca niente di esistente.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.iam_archivio (
  -- l'id è anche il nome del file sul disco: il nome che arriva dal browser
  -- non diventa mai un percorso
  id          uuid primary key,

  nome        text not null,          -- il nome originale, per chi scarica
  tipo        text,                   -- il tipo dichiarato dal browser
  dimensione  bigint not null,        -- byte del file IN CHIARO
  -- sha256 del contenuto in chiaro: dice che quello che esce è quello che era
  -- entrato. Il tag GCM sorveglia il cifrato, questa sorveglia il giro intero.
  impronta    text,
  percorso    text not null,          -- relativo alla cartella dell'archivio

  -- a che cosa è attaccato: le stesse entità di quote_pratica_documenti,
  -- perché la visibilità si decide allo stesso modo
  entita      text not null check (entita in ('polizza','pratica','preventivo','cliente','sinistro')),
  entita_id   uuid not null,
  categoria   text,                   -- il requisito del fascicolo, quando c'è

  creato_da   uuid not null default auth.uid(),
  creato_il   timestamptz not null default now()
);

comment on table public.iam_archivio is
  'Metadati dei documenti cifrati sul VPS. Il contenuto sta sul disco del server, cifrato; qui non c''è niente che lo apra.';
comment on column public.iam_archivio.percorso is
  'Percorso RELATIVO dentro la cartella dell''archivio. La cartella sta fuori dalla radice servita dal sito: nessun file e'' raggiungibile da un indirizzo.';
comment on column public.iam_archivio.impronta is
  'sha256 del contenuto in chiaro. NON e'' un segreto e non apre niente: serve a dire che il file riaperto e'' identico a quello caricato.';

create index if not exists iam_archivio_entita_idx  on public.iam_archivio(entita, entita_id);
create index if not exists iam_archivio_creato_idx  on public.iam_archivio(creato_da);

-- ── LE POLITICHE: le stesse dei documenti di pratica ─────────────────────────
alter table public.iam_archivio enable row level security;

drop policy if exists arch_select on public.iam_archivio;
drop policy if exists arch_insert on public.iam_archivio;
drop policy if exists arch_update on public.iam_archivio;
drop policy if exists arch_delete on public.iam_archivio;

create policy arch_select on public.iam_archivio for select using (
  case entita
    when 'polizza' then exists (select 1 from public.quote_polizze  p where p.id = entita_id and quote_vede(p.creato_da))
    when 'pratica' then exists (select 1 from public.quote_pratiche r where r.id = entita_id and quote_vede(r.creato_da))
    else quote_vede(creato_da) end);

-- Carica chi ha l'accesso, e la riga nasce a suo nome: `creato_da = auth.uid()`
-- non è una formalità, è quello che rende vera la regola di lettura qui sopra.
create policy arch_insert on public.iam_archivio for insert to authenticated
  with check (creato_da = auth.uid());

-- I metadati non si correggono a mano: il nome e l'impronta descrivono un file
-- che sul disco non cambia. Cambiarli qui vorrebbe dire far dire alla scheda
-- una cosa diversa da quella che c'è.
create policy arch_update on public.iam_archivio for update using (false) with check (false);
create policy arch_delete on public.iam_archivio for delete using (iam_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   drop table if exists public.iam_archivio;
--
--  ATTENZIONE: i file cifrati restano sul disco del VPS e, senza queste righe,
--  diventano illeggibili — non si sa più che cosa siano né di chi. Prima di
--  cancellare la tabella, portare via i documenti.
-- ═══════════════════════════════════════════════════════════════════════════════
