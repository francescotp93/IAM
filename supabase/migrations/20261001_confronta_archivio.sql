-- ═══════════════════════════════════════════════════════════════════════════
-- CONFRONTA — L'ARCHIVIO DEI DOCUMENTI DI PRODOTTO              01/10/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Richiesta di Francesco: poter mettere HDI auto accanto a Italiana auto e
-- avere un giudizio garanzia per garanzia. Il perché conta più della
-- funzione: «per poter battere la concorrenza ci possiamo battere solamente
-- su dati reali».
--
-- MISURATO PRIMA DI SCRIVERE, sul database vero (01/10/2026):
--   quote_compagnie       9 righe, tutte attive
--   quote_titoli          garanzie di Prima in archivio: 11.131
--   tabelle `*conf*`      ZERO: questo archivio non esiste ancora
--
-- ┌─ TRE TABELLE, E PERCHÉ TRE ──────────────────────────────────────────────
-- │  iam_conf_prodotti   «HDI · Valore Auto · ramo auto». Il prodotto.
-- │  iam_conf_documenti  il PDF da cui viene tutto: edizione, URL, impronta.
-- │  iam_conf_garanzie   una riga per garanzia LETTA, con la frase e la pagina.
-- └──────────────────────────────────────────────────────────────────────────
--
-- Perché il documento è una tabella sua e non tre colonne sul prodotto: un
-- prodotto ha PIÙ documenti (il DIP, il DIP aggiuntivo, le condizioni) e ogni
-- edizione è un documento diverso. Schiacciarli su uno solo vorrebbe dire che
-- il giorno in cui la compagnia cambia edizione si perde quella di prima — e
-- quella di prima è il contratto dei clienti che l'hanno firmata.
--
-- ┌─ LA REGOLA CHE TIENE ONESTO TUTTO: TRE STATI ───────────────────────────
-- │  `stato` di una garanzia vale 'presente', 'assente' o 'non_letto'.
-- │  Il vincolo CHECK li impone, così il terzo stato non si può perdere
-- │  nemmeno scrivendo a mano nel database.
-- └──────────────────────────────────────────────────────────────────────────
--
-- «Assente» vuol dire che il documento dice che la garanzia non c'è.
-- «Non letto» vuol dire che il documento non lo dice, o non siamo riusciti a
-- leggerlo. Confonderli costruisce una macchina che dà torto alla concorrenza
-- ogni volta che il loro set informativo è scritto male — e quel risultato lo
-- si mostra a un cliente, quindi è adeguatezza (Reg. IVASS 40 e 41), non un
-- numero storto in una tabella.
--
-- ┌─ L'IMPRONTA: COME SI ACCORGE CHE UN PRODOTTO È CAMBIATO ────────────────
-- │  `impronta` è lo sha256 del file. Il controllo mensile riscarica, rifà
-- │  l'impronta e la confronta: diversa = il documento è cambiato.
-- └──────────────────────────────────────────────────────────────────────────
--
-- Il documento cambiato NON si sovrascrive: si scrive una riga nuova e la
-- vecchia resta, con `sostituito_da`. Sovrascrivere vorrebbe dire che un
-- confronto fatto il mese scorso non si può più rifare uguale, e un confronto
-- che non si può rifare non si può nemmeno difendere.
--
-- QUESTA MIGRAZIONE NON SEMINA NIENTE. Nessun prodotto, nessun documento,
-- nessuna garanzia. Vale la stessa regola dei dodici conti minimi (§8.1): un
-- archivio con dentro dei dati che nessuno ha deciso, dopo due settimane, è un
-- archivio di dati veri agli occhi di chi lo legge.
--
-- ROLLBACK (nell'ordine):
--   begin;
--     drop table if exists public.iam_conf_garanzie;
--     drop table if exists public.iam_conf_documenti;
--     drop table if exists public.iam_conf_prodotti;
--   commit;
-- Non tocca niente di esistente: tre tabelle nuove e basta.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── I PRODOTTI ────────────────────────────────────────────────────────────
create table if not exists public.iam_conf_prodotti (
  id             uuid primary key default gen_random_uuid(),
  -- La compagnia in anagrafica, quando c'è. Per i CONCORRENTI che non abbiamo
  -- a mandato non c'è, e va bene: `compagnia` tiene il nome come sta scritto
  -- sul documento. Pretendere l'anagrafica vorrebbe dire non poter archiviare
  -- proprio i prodotti contro cui ci si confronta.
  compagnia_id   uuid references public.quote_compagnie(id) on delete set null,
  compagnia      text not null,
  prodotto       text not null,
  ramo           text not null check (ramo in ('auto','casa','azienda','salute','vita')),
  -- Il prodotto è ancora in vendita? Un prodotto ritirato NON si cancella:
  -- i clienti che ce l'hanno addosso ce l'hanno ancora.
  in_vendita     boolean not null default true,
  note           text,
  creato_da      uuid default auth.uid(),
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);

-- Lo stesso prodotto non si archivia due volte. `lower()` perché «Valore Auto»
-- e «VALORE AUTO» sono lo stesso prodotto, e due righe vorrebbero dire due
-- confronti diversi sulla stessa cosa.
create unique index if not exists conf_prodotti_unico
  on public.iam_conf_prodotti (lower(compagnia), lower(prodotto), ramo);
create index if not exists conf_prodotti_ramo on public.iam_conf_prodotti (ramo) where in_vendita;

-- ── I DOCUMENTI ───────────────────────────────────────────────────────────
create table if not exists public.iam_conf_documenti (
  id             uuid primary key default gen_random_uuid(),
  prodotto_id    uuid not null references public.iam_conf_prodotti(id) on delete cascade,
  tipo           text not null check (tipo in
                   ('dip','dip_aggiuntivo','condizioni','set_informativo','altro')),
  -- Come sta scritta sul documento: «06/2020». Non si normalizza in una data,
  -- perché quello che conta è poter dire a un cliente l'edizione ESATTA che
  -- c'è scritta sul suo contratto.
  edizione       text,
  url            text,
  -- Lo stato del documento, e «non si è potuto leggere» è uno stato vero.
  stato          text not null default 'da_prendere' check (stato in
                   ('da_prendere','preso','illeggibile','sostituito')),
  preso_il       timestamptz,
  impronta       text,             -- sha256 del file: è così che si vede se è cambiato
  pagine         integer,
  -- Quando arriva un'edizione nuova, la vecchia resta e punta alla nuova.
  sostituito_da  uuid references public.iam_conf_documenti(id) on delete set null,
  -- Perché non si è potuto leggere, quando non si è potuto. Un documento
  -- illeggibile senza motivo è un documento che nessuno riproverà a prendere.
  motivo         text,
  creato_da      uuid default auth.uid(),
  creato_il      timestamptz not null default now()
);

create index if not exists conf_documenti_prodotto on public.iam_conf_documenti (prodotto_id);
-- Lo stesso file, preso due volte, è lo stesso documento.
create unique index if not exists conf_documenti_impronta
  on public.iam_conf_documenti (prodotto_id, impronta) where impronta is not null;

-- ── LE GARANZIE LETTE ─────────────────────────────────────────────────────
create table if not exists public.iam_conf_garanzie (
  id             uuid primary key default gen_random_uuid(),
  prodotto_id    uuid not null references public.iam_conf_prodotti(id) on delete cascade,
  -- Da QUALE documento viene questa riga. Senza, il confronto non può
  -- rispondere a «dove c'è scritto?», che è la domanda che fa un cliente.
  documento_id   uuid references public.iam_conf_documenti(id) on delete set null,
  -- L'identificativo canonico del vocabolario (`confronto.js`): 'kasko',
  -- 'tutela_legale'… Il vocabolario sta nel motore e non qui, perché una
  -- tabella di appoggio nel database sarebbe il secondo elenco della stessa
  -- cosa, e i due si separerebbero al primo nome nuovo.
  garanzia       text not null,
  -- Come la chiama IL DOCUMENTO: «Guasti Accidentali (Kasko/Collisione)».
  -- Si tiene, perché è quello che il cliente legge sul suo contratto.
  nome_documento text,
  stato          text not null check (stato in ('presente','assente','non_letto')),
  massimale      numeric(14,2),
  franchigia     numeric(14,2),
  scoperto       numeric(6,2),     -- in percentuale
  pagina         integer,
  frase          text,             -- la frase testuale, per poterla mostrare
  creato_da      uuid default auth.uid(),
  creato_il      timestamptz not null default now()
);

create index if not exists conf_garanzie_prodotto on public.iam_conf_garanzie (prodotto_id);
create index if not exists conf_garanzie_quale on public.iam_conf_garanzie (garanzia);

-- Un massimale o una franchigia negativi non esistono. Lo zero sì, ed è
-- diverso da «non dichiarato», che è il NULL.
alter table public.iam_conf_garanzie
  drop constraint if exists conf_garanzie_importi_non_negativi;
alter table public.iam_conf_garanzie
  add constraint conf_garanzie_importi_non_negativi check (
    (massimale  is null or massimale  >= 0) and
    (franchigia is null or franchigia >= 0) and
    (scoperto   is null or (scoperto >= 0 and scoperto <= 100))
  );

-- Una garanzia «non letta» non può portare dei numeri: se il documento non lo
-- dice, non c'è niente da scrivere. Senza questo vincolo si potrebbe salvare
-- un massimale «non letto» di 10.000 € — cioè un dato inventato con sopra
-- l'etichetta di dato mancante.
alter table public.iam_conf_garanzie
  drop constraint if exists conf_garanzie_non_letto_e_vuoto;
alter table public.iam_conf_garanzie
  add constraint conf_garanzie_non_letto_e_vuoto check (
    stato <> 'non_letto'
    or (massimale is null and franchigia is null and scoperto is null)
  );

-- ── CHI PUÒ LEGGERE E SCRIVERE ────────────────────────────────────────────
-- Come tutto il resto della contabilità: lo staff legge e scrive. Qui non ci
-- sono dati di clienti — sono documenti pubblici di prodotto — ma il
-- confronto è uno strumento di vendita dell'agenzia, non roba da mostrare a
-- chiunque abbia un accesso.
alter table public.iam_conf_prodotti  enable row level security;
alter table public.iam_conf_documenti enable row level security;
alter table public.iam_conf_garanzie  enable row level security;

drop policy if exists confp_select on public.iam_conf_prodotti;
create policy confp_select on public.iam_conf_prodotti for select using (iam_is_staff());
drop policy if exists confp_insert on public.iam_conf_prodotti;
create policy confp_insert on public.iam_conf_prodotti for insert with check (iam_is_staff());
drop policy if exists confp_update on public.iam_conf_prodotti;
create policy confp_update on public.iam_conf_prodotti for update using (iam_is_staff()) with check (iam_is_staff());

drop policy if exists confd_select on public.iam_conf_documenti;
create policy confd_select on public.iam_conf_documenti for select using (iam_is_staff());
drop policy if exists confd_insert on public.iam_conf_documenti;
create policy confd_insert on public.iam_conf_documenti for insert with check (iam_is_staff());
drop policy if exists confd_update on public.iam_conf_documenti;
create policy confd_update on public.iam_conf_documenti for update using (iam_is_staff()) with check (iam_is_staff());

drop policy if exists confg_select on public.iam_conf_garanzie;
create policy confg_select on public.iam_conf_garanzie for select using (iam_is_staff());
drop policy if exists confg_insert on public.iam_conf_garanzie;
create policy confg_insert on public.iam_conf_garanzie for insert with check (iam_is_staff());
drop policy if exists confg_update on public.iam_conf_garanzie;
create policy confg_update on public.iam_conf_garanzie for update using (iam_is_staff()) with check (iam_is_staff());

commit;
