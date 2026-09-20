-- ═══════════════════════════════════════════════════════════════════════════════
--  IL PREMIO ANNUO DELLE FRAZIONATE — backfill               (20/09/2026)
--
--  Segnalato da Francesco: in Portafoglio la colonna PREMIO mostrava «—» su
--  TUTTE le polizze semestrali. Misurato subito dopo, sul database vero:
--
--    numero_polizza   frazionamento   premio_annuo   premio_rata   titoli
--    BLP949872165     Semestrale      NULL           200,02        2 (400,04)
--    BLP223382783     Semestrale      NULL           110,00        2 (220,00)
--    BLP882392123     Semestrale      NULL           110,00        0
--    PCP12315940      Annuale          58,00          58,00        1
--    BLP918634492     Annuale         262,98         262,98        1
--
--  NON era il frontend: il dato e' vuoto. Ed e' vuoto APPOSTA — nel tracciato
--  SSF `LORDO_TOTALE` e' il premio DI RATA, e moltiplicarlo per il
--  frazionamento sarebbe una stima (CLAUDE.md §14, regola 2). Una stima in un
--  portafoglio diventa un dato dopo due settimane.
--
--  MA UN NUMERO VERO C'E', e non e' una stima: **la somma delle rate che la
--  compagnia ha emesso**, quando coprono l'annualita'. Su BLP223382783 sono
--  due righe da 110,00 con decorrenze 16/09/2026 e 16/03/2027 che arrivano
--  esattamente al 16/09/2027: 220,00 l'ha scritto la compagnia, non noi.
--
--  LE TRE CONDIZIONI, le stesse del motore (`Flusso.premioAnnuo`):
--    1. solo le rate MANDATE DALLA COMPAGNIA — quelle dedotte da noi
--       (`fonte_id` con `:RATA:`, §16) sono un nostro ragionamento, e farle
--       entrare vorrebbe dire che meta' di quel numero l'abbiamo inventato;
--    2. devono ricoprire l'annualita' SENZA BUCHI: la prima parte dall'effetto,
--       l'ultima arriva a scadenza, e la somma delle durate copre il periodo —
--       con un buco in mezzo la somma non e' il premio dell'anno, e' la somma
--       di quello che e' arrivato;
--    3. ognuna deve avere un importo: una rata senza importo non si salta,
--       rende il totale non calcolabile.
--
--  QUELLO CHE QUESTO BACKFILL NON FA, ed e' dichiarato come per il backfill
--  delle date di nascita (§23): non riscrive nessuna polizza che un premio
--  annuo ce l'ha gia' (quello lo ha dichiarato la compagnia e vince sempre), e
--  non tocca le polizze le cui rate non coprono l'anno — quelle restano vuote,
--  e la schermata dice PERCHE' invece di mostrare un trattino muto.
--
--  Le righe scritte si riconoscono: `dati.ssf.premio_annuo_da = 'titoli'`.
--  Senza quel segno non ci sarebbe modo di distinguerle da un premio annuo
--  arrivato dalla compagnia, ne' di annullare questo backfill.
--
--  ATTESO SU QUESTO DATABASE: 30 polizze, 7 senza premio annuo, di cui **2**
--  ricavabili (le due semestrali qui sopra). Le altre 5 restano vuote: 3 non
--  hanno nessuna rata, 2 hanno rate che non coprono l'annualita'.
--
--  ROLLBACK:
--    update public.quote_polizze
--       set premio_annuo = null,
--           dati = (dati #- '{ssf,premio_annuo_da}') #- '{ssf,premio_annuo_rate}'
--     where dati->'ssf'->>'premio_annuo_da' = 'titoli';
-- ═══════════════════════════════════════════════════════════════════════════════

with rate as (
  select t.polizza_id,
         count(*)                                              as n,
         sum(t.importo_lordo)                                  as somma,
         min(t.data_decorrenza)                                as prima,
         max(t.data_scadenza)                                  as ultima,
         sum(t.data_scadenza - t.data_decorrenza)              as giorni_coperti,
         count(*) filter (where t.importo_lordo is null)       as senza_importo,
         count(*) filter (where t.data_scadenza is null)       as senza_scadenza
    from public.quote_titoli t
    join public.quote_polizze p on p.id = t.polizza_id
   where p.premio_annuo is null
     and p.data_effetto is not null
     and p.data_scadenza is not null
     -- condizione 1: solo quelle della compagnia
     and coalesce(t.fonte_id, '') not like '%:RATA:%'
     -- dentro l'annualita' in corso
     and t.data_decorrenza >= p.data_effetto
     and t.data_decorrenza <  p.data_scadenza
   group by t.polizza_id
),
buone as (
  select r.polizza_id, r.somma, r.n
    from rate r
    join public.quote_polizze p on p.id = r.polizza_id
   where r.senza_importo = 0                              -- condizione 3
     and r.senza_scadenza = 0
     and abs(r.prima  - p.data_effetto)  <= 3             -- condizione 2: parte dall'effetto
     and abs(r.ultima - p.data_scadenza) <= 3             -- …e arriva a scadenza
     -- …e non c'e' un buco in mezzo: rate che si affiancano coprono il periodo.
     and r.giorni_coperti >= (p.data_scadenza - p.data_effetto) - 3
)
update public.quote_polizze p
   set premio_annuo = b.somma,
       dati = jsonb_set(
                jsonb_set(coalesce(p.dati, '{}'::jsonb), '{ssf,premio_annuo_da}', '"titoli"'::jsonb, true),
                '{ssf,premio_annuo_rate}', to_jsonb(b.n), true)
  from buone b
 where p.id = b.polizza_id
   and p.premio_annuo is null;
