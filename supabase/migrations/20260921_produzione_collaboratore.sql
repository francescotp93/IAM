-- ═══════════════════════════════════════════════════════════════════════════
--  CHI HA PRODOTTO QUESTA POLIZZA  (21/09/2026)
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ · una colonna nuova su quote_polizze, nullable, senza default          │
--  │ · due indici                                                           │
--  │ · una vista e una funzione di sola lettura, entrambe SECURITY INVOKER   │
--  │ · righe di sola EVIDENZA in quote_codici_collaboratore (mai decisioni)  │
--  │ Nessuna riga esistente riscritta. Nessun valore inventato.              │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   drop function if exists iam_produzione_confronto(date);               │
--  │   drop view     if exists iam_produzione_mensile;                       │
--  │   drop index    if exists quote_polizze_collaboratore_idx;              │
--  │   drop index    if exists quote_polizze_effetto_idx;                    │
--  │   alter table quote_polizze drop column if exists collaboratore_id;     │
--  │   -- le righe di evidenza si tolgono solo se nessuno ha ancora deciso:  │
--  │   delete from quote_codici_collaboratore                                │
--  │     where deciso = false and collaboratore_id is null                   │
--  │       and note like 'Codice trovato sulle polizze%';                    │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── PERCHÉ UNA COLONNA SULLA POLIZZA, SE LE RATE CE L'HANNO GIÀ ───────────
--  quote_titoli.collaboratore_id esiste dal 18/09 (CLAUDE.md §17) e ci resta.
--  Non e' un doppione: rispondono a due domande diverse, e confonderle
--  produce numeri credibili e sbagliati.
--
--    · sulla RATA  = di chi e' questo incasso, quindi a chi spetta la
--      provvigione. Sta sulla rata apposta, perche' una polizza vive anni e
--      puo' cambiare mano.
--    · sulla POLIZZA = chi ha PRODOTTO il contratto. La produzione di un anno
--      non cambia quando la gestione passa a un altro: se si leggesse dalle
--      rate, una polizza riassegnata a marzo sposterebbe la produzione di
--      gennaio, e il consuntivo di un anno chiuso cambierebbe da solo.
--
--  ── LA MISURA CHE HA DECISO IL LAVORO (21/09/2026) ────────────────────────
--    polizze in portafoglio ................ 1720
--    creato_da distinti su quelle righe .... 1   <-- chi ha importato
--    codici produttore distinti sul flusso .. 16 (piu' 5 polizze senza codice)
--    quote_codici_collaboratore ............ 0 righe
--
--  `creato_da` non e' e non sara' mai il produttore: e' l'utente che ha
--  premuto il tasto dell'importazione. Attribuire la produzione su quella
--  colonna vorrebbe dire dare l'intero portafoglio a una persona sola.
--  Il dato vero e' il codice produttore che la compagnia scrive sulla
--  polizza, e per trasformarlo in un nome serve una decisione umana (§19).
--
--  ── LE RIGHE DI EVIDENZA NON SONO DECISIONI ───────────────────────────────
--  I sedici codici stanno sulle polizze e la tabella delle decisioni e'
--  vuota: non c'e' nemmeno il posto dove scrivere la risposta. Qui si
--  scrivono le righe con `deciso = false` e `collaboratore_id` NULL, cioe'
--  la domanda, mai la risposta. E' esattamente quello che fa l'importazione
--  quando annota nome, email e RUI accanto a un codice (§19): registrare
--  un'evidenza misurata, non indovinare una persona.
--
--  Un `on conflict do nothing` protegge le decisioni gia' presi: se un
--  codice fosse gia' stato deciso, questa migrazione non lo tocca.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. CHI HA PRODOTTO ────────────────────────────────────────────────────
alter table quote_polizze
  add column if not exists collaboratore_id uuid
    references quote_collaboratori(id) on delete set null;

comment on column quote_polizze.collaboratore_id is
  $c$Chi ha PRODOTTO la polizza. Diverso da quote_titoli.collaboratore_id, che dice di chi e' la rata (e quindi la provvigione): una polizza puo' cambiare gestione senza che la produzione dell'anno in cui e' nata cambi. NULL = non ancora attribuita; si riempie applicando una decisione presa su quote_codici_collaboratore, mai per somiglianza.$c$;

create index if not exists quote_polizze_collaboratore_idx
  on quote_polizze (collaboratore_id, data_effetto);

-- L'aggregazione per anno e per mese parte sempre da qui.
create index if not exists quote_polizze_effetto_idx
  on quote_polizze (data_effetto);

-- ── 2. LE EVIDENZE: I CODICI CHE STANNO SULLE POLIZZE ─────────────────────
insert into quote_codici_collaboratore (compagnia, codice, deciso, note)
select distinct
       p.compagnia,
       p.dati->'ssf'->>'collaboratore',
       false,
       'Codice trovato sulle polizze in portafoglio il 21/09/2026. Riga di evidenza: nessuno ha ancora detto chi e''.'
  from quote_polizze p
 where nullif(p.dati->'ssf'->>'collaboratore', '') is not null
   and nullif(p.compagnia, '') is not null
on conflict do nothing;

-- ── 3. LA PRODUZIONE, AGGREGATA DAL DATABASE ──────────────────────────────
--  SECURITY INVOKER: la vista non e' una scorciatoia intorno alle politiche.
--  Chi non puo' leggere una polizza non la vede nemmeno sommata — altrimenti
--  un totale direbbe a un collaboratore quanto ha prodotto l'agenzia.
--
--  `senza_premio` esce accanto a `premio` e non dentro: una polizza senza
--  premio annuo NON vale zero (§42). Sommarla come zero farebbe un
--  portafoglio piu' povero del vero, e un numero piu' basso, su una
--  scrivania, nessuno lo mette in dubbio. Si conta a parte e si dichiara.
create or replace view iam_produzione_mensile
with (security_invoker = true) as
select
    extract(year  from p.data_effetto)::int              as anno,
    extract(month from p.data_effetto)::int              as mese,
    p.collaboratore_id,
    nullif(p.dati->'ssf'->>'collaboratore', '')          as codice_produttore,
    coalesce(nullif(p.compagnia, ''), '(senza compagnia)') as compagnia,
    coalesce(nullif(p.modulo, ''),    '(senza ramo)')      as ramo,
    count(*)::int                                        as polizze,
    count(*) filter (where p.premio_annuo is null)::int   as senza_premio,
    coalesce(sum(p.premio_annuo), 0)::numeric(14,2)      as premio
  from quote_polizze p
 where p.data_effetto is not null
 group by 1, 2, 3, 4, 5, 6;

comment on view iam_produzione_mensile is
  $c$Produzione aggregata per anno, mese, produttore, compagnia e ramo. SECURITY INVOKER: rispetta le politiche di quote_polizze. `senza_premio` sta accanto a `premio` perche' una polizza senza premio annuo non vale zero.$c$;

grant select on iam_produzione_mensile to authenticated;

-- ── 4. L'ANNO IN CORSO CONTRO IL PRECEDENTE, ALLO STESSO GIORNO ───────────
--  LA REGOLA CHE VALE PIU' DI TUTTE QUI: si confronta periodo con periodo.
--  Mettere dodici mesi dell'anno scorso accanto a nove dell'anno in corso
--  disegna un crollo che non e' successo — ed e' il modo piu' facile di
--  fare una riunione sui numeri sbagliati. Quindi il mese in corso viene
--  tagliato al giorno di oggi IN TUTTI E DUE GLI ANNI: dal 1 gennaio al 21
--  settembre di qua, dal 1 gennaio al 21 settembre di la'.
--
--  I mesi dell'anno scorso OLTRE il mese in corso non si nascondono — sono
--  produzione vera e vederli serve — ma escono marcati `fuori_confronto`,
--  perche' un confronto che li somma non e' un confronto.
create or replace function iam_produzione_confronto(p_al date default current_date)
returns table (
  anno            int,
  mese            int,
  polizze         int,
  senza_premio    int,
  premio          numeric,
  parziale        boolean,
  fuori_confronto boolean
)
language sql
stable
as $fn$
  select
    extract(year  from p.data_effetto)::int,
    extract(month from p.data_effetto)::int,
    count(*)::int,
    count(*) filter (where p.premio_annuo is null)::int,
    coalesce(sum(p.premio_annuo), 0)::numeric,
    extract(month from p.data_effetto)::int = extract(month from p_al)::int,
    extract(year  from p.data_effetto)::int = extract(year  from p_al)::int - 1
      and extract(month from p.data_effetto)::int > extract(month from p_al)::int
  from quote_polizze p
  where p.data_effetto is not null
    and extract(year from p.data_effetto)::int
        between extract(year from p_al)::int - 1 and extract(year from p_al)::int
    -- il taglio al giorno, uguale nei due anni
    and not ( extract(month from p.data_effetto)::int = extract(month from p_al)::int
              and extract(day from p.data_effetto)::int > extract(day from p_al)::int )
  group by 1, 2, 6, 7
  order by 1, 2;
$fn$;

comment on function iam_produzione_confronto(date) is
  $c$Produzione mensile dell'anno di p_al e di quello prima, con il mese in corso tagliato allo stesso giorno nei due anni: un confronto fra periodi disuguali disegna un crollo che non e' successo. I mesi dell'anno prima oltre il mese in corso escono marcati fuori_confronto.$c$;

grant execute on function iam_produzione_confronto(date) to authenticated;
