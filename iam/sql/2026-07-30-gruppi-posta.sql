-- ═══════════════════════════════════════════════════════════════════════════════
--  ESEGUITA il 30/07/2026, con il via libera di Francesco.
--
--  Verificata dopo l'esecuzione: la tabella c'e', la riservatezza e' attiva e
--  ha tutte e quattro le regole (lettura, inserimento, modifica, cancellazione).
--  Il controllo di sicurezza di Supabase non segnala nulla su questa tabella.
--  Si tiene qui per storia: rilanciarla non fa danni (e' tutta "if not exists").
--
--  A COSA SERVE
--  A non perdere piu' i gruppi di destinatari della posta interna.
--
--  COSA SUCCEDE OGGI
--  Nella Posta, dalla voce "Gruppi" della barra laterale (e dal collegamento
--  "Salva gruppo" della finestra di scrittura), si crea un elenco di indirizzi
--  con un nome — "Collaboratori", "Compagnie", "Rete Nord" — per poi scrivere a
--  tutti insieme con un clic.
--
--  Quegli elenchi non stanno nell'archivio: stanno nella memoria del browser di
--  chi li ha creati. Conseguenze, tutte silenziose:
--    - da un altro computer, o dal telefono, il menu "Gruppi..." e' vuoto;
--    - chi pulisce la cronologia del browser li perde tutti, senza avviso;
--    - due persone che usano la stessa casella vedono due elenchi diversi.
--  E' l'ultimo dato della piattaforma rimasto in questa condizione: agenda,
--  allegati delle fatture e compagnie dei collaboratori sono gia' stati portati
--  in archivio.
--
--  PERCHE' SERVE UNA TABELLA NUOVA E NON SE NE PUO' USARE UNA CHE C'E' GIA'
--  Le ho guardate tutte, una per una:
--    - iam_azienda.dati  viene riscritta per intero ogni volta che si salva
--      l'anagrafica dell'agenzia: i gruppi verrebbero cancellati al primo
--      salvataggio dei dati aziendali;
--    - agenti_config e posta_bozze  sono riservate al solo super amministratore
--      (la regola e' scritta sulla mail di Francesco): gli altri due utenti che
--      usano la posta non potrebbero ne' leggere ne' scrivere;
--    - quote_settings  e' di Quoto ed e' scrivibile solo da chi ha ruolo
--      amministratore: delle tre persone abilitate alla posta una sola lo e';
--    - posta_config e posta_notifiche  non hanno nessuna regola di accesso: sono
--      chiuse a chiunque non sia il server.
--  Nessuna e' adatta. Meglio una tabella piccola e sua, che si legge a colpo
--  d'occhio, invece di infilare i gruppi dentro un campo pensato per altro.
--
--  COSA FA QUESTA MIGRAZIONE
--  Crea iam_mail_gruppi: un nome, un elenco di indirizzi, il proprietario.
--  Ciascuno vede e gestisce i propri gruppi, e nessun altro. Gli amministratori
--  NON vedono i gruppi degli altri: sono rubriche personali di lavoro, non dati
--  dell'agenzia, e non c'e' motivo di aprirle.
--
--  IL CODICE FUNZIONA GIA' IN TUTTI E DUE I CASI
--  Non serve pubblicare niente insieme a questa migrazione, e non c'e' un ordine
--  da rispettare. Il codice sul ramo di sviluppo prova a leggere e scrivere
--  sull'archivio; se la tabella non c'e' ancora — o se salta la connessione —
--  continua a lavorare sulla memoria del browser esattamente come oggi. Quando
--  la tabella comparira', i gruppi gia' presenti sul browser di ciascuno
--  verranno portati su da soli, al primo accesso alla Posta, senza che nessuno
--  debba rifare niente.
--
--  PERCHE' E' SICURA
--  E' una tabella nuova: non tocca nessun dato esistente e nessuna funzione
--  esistente. Nel peggiore dei casi resta vuota e tutto si comporta come oggi.
--  Non contiene dati di assicurati: solo indirizzi email gia' in uso in agenzia.
--
--  COME SI ESEGUE (per Francesco, senza toccare un terminale)
--  Sul sito di Supabase, progetto ekjxrnsfqxnfxzrthdcf: menu a sinistra "SQL
--  Editor", nuovo foglio, si incolla tutto quello che sta sotto questa riga e si
--  preme Run.
--
--  COSA CONTROLLARE DOPO
--   1. Aprire la Posta, voce "Gruppi": i gruppi gia' creati devono esserci
--      ancora (vengono portati su dal browser da soli).
--   2. Crearne uno nuovo, poi aprire IAM da un altro computer o dal telefono:
--      il gruppo deve esserci anche li'.
--   3. Nella finestra di scrittura, il menu "Gruppi..." deve elencarli.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. La tabella ─────────────────────────────────────────────────────────────

create table if not exists public.iam_mail_gruppi (
  id          uuid primary key default gen_random_uuid(),
  utente_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome        text not null,
  indirizzi   text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Due gruppi con lo stesso nome, per la stessa persona, non hanno senso: il
-- secondo sovrascrive il primo invece di duplicarlo.
create unique index if not exists iam_mail_gruppi_utente_nome
  on public.iam_mail_gruppi (utente_id, lower(nome));


-- ── 2. Le regole di accesso: ciascuno i propri ────────────────────────────────

alter table public.iam_mail_gruppi enable row level security;

drop policy if exists mg_select on public.iam_mail_gruppi;
create policy mg_select on public.iam_mail_gruppi
  for select using ( utente_id = auth.uid() );

drop policy if exists mg_insert on public.iam_mail_gruppi;
create policy mg_insert on public.iam_mail_gruppi
  for insert with check ( utente_id = auth.uid() );

drop policy if exists mg_update on public.iam_mail_gruppi;
create policy mg_update on public.iam_mail_gruppi
  for update using ( utente_id = auth.uid() ) with check ( utente_id = auth.uid() );

drop policy if exists mg_delete on public.iam_mail_gruppi;
create policy mg_delete on public.iam_mail_gruppi
  for delete using ( utente_id = auth.uid() );


-- ── PER TORNARE INDIETRO ──────────────────────────────────────────────────────
-- Rimette esattamente la situazione di oggi (i gruppi restano comunque sul
-- browser di ciascuno, il codice torna da solo a usare quelli):
--
--   drop table if exists public.iam_mail_gruppi;
--
-- Una sola avvertenza, per onesta': il travaso dei gruppi dal browser
-- all'archivio si fa una volta sola per computer, e il computer se lo segna.
-- Serve a impedire che un gruppo cancellato ricompaia il giorno dopo,
-- ripescato dalla copia rimasta sul browser. Conseguenza: se si torna
-- indietro e poi si rifa' la tabella da capo, il travaso non riparte da solo.
-- In quel caso i gruppi si ricreano a mano dalla voce "Gruppi" della Posta.


-- ═══════════════════════════════════════════════════════════════════════════════
--  UNA COSA CHE NON PROPONGO, E PERCHE'
--
--  Verrebbe naturale rendere i gruppi condivisi fra tutta l'agenzia: una rubrica
--  sola, "Collaboratori", che vale per tutti. Ha senso e prima o poi la faremo,
--  ma non qui: oggi i gruppi sono personali (stanno sul browser di ciascuno), e
--  renderli comuni con questa migrazione significherebbe che al primo accesso
--  ognuno si ritrova nel menu i gruppi degli altri, mescolati ai suoi, senza
--  aver chiesto niente. Prima si porta al sicuro quello che c'e'; la rubrica
--  condivisa la aggiungiamo dopo, con una casella "condiviso con l'agenzia" da
--  spuntare gruppo per gruppo. Il campo si aggiunge senza rifare niente.
-- ═══════════════════════════════════════════════════════════════════════════════
