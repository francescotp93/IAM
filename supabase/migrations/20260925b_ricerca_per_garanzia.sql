-- ═══════════════════════════════════════════════════════════════════════════
--  CERCARE PER GARANZIA                                        (25/09/2026)
--
--  «Cliente senza una determinata garanzia nella polizza auto.» — Francesco
--
--  PERCHÉ LO FA IL DATABASE E NON LA PAGINA
--  Le garanzie stanno dentro `quote_polizze.dati`, e portarsele tutte nel
--  browser vuol dire 5 MB a ogni apertura della schermata — su un telefono in
--  giro sono secondi di attesa e traffico, per una domanda che si fa ogni
--  tanto. Qui il database risponde con un elenco di id: una manciata di
--  kilobyte.
--
--  LE DUE COMPAGNIE NON LE CHIAMANO ALLO STESSO MODO, ed è il vero problema:
--
--      SSF   codice «INFORTUNI_CONDUCENTE»     descrizione uguale al codice
--      HDI   codice «010902»                   descrizione «Infortuni del Conducente»
--
--  Un confronto esatto troverebbe le une e non le altre, e una campagna
--  «auto senza infortuni» partirebbe a metà portafoglio senza che nessuno se
--  ne accorga. Quindi NON si confronta per uguaglianza: si chiede che TUTTE
--  le parole cercate compaiano nel testo della garanzia. «infortuni
--  conducente» trova sia `INFORTUNI_CONDUCENTE` sia «Infortuni del
--  Conducente», perché il «del» in mezzo non toglie nessuna delle due parole.
--
--  DOVE STANNO, e sono due posti diversi:
--      SSF   dati->'ssf'->'garanzie'     4.073 polizze
--      HDI   dati->'garanzie'               18 polizze
--
--  COME SI TORNA INDIETRO
--      drop function if exists iam_clienti_con_garanzia(text, text[]);
--      drop function if exists iam_garanzie_elenco();
--  Non c'è niente da ripristinare: sono due funzioni di sola lettura, non
--  toccano nessuna riga e nessuna colonna.
-- ═══════════════════════════════════════════════════════════════════════════

/* Il testo di una garanzia, ridotto alla forma in cui si può confrontare:
   minuscole, niente trattini o trattini bassi, niente spazi doppi. Codice e
   descrizione insieme, perché a volte il nome buono sta nell'uno e a volte
   nell'altro. */
create or replace function iam_garanzia_testo(g jsonb)
returns text
language sql
immutable
as $$
  select regexp_replace(
           lower(trim(coalesce(g->>'codice', '') || ' ' || coalesce(g->>'descrizione', ''))),
           '[^a-z0-9]+', ' ', 'g')
$$;

/* Tutte le garanzie del portafoglio, una riga per polizza per garanzia.
   Sta in una funzione sola perché le due compagnie le tengono in due posti
   diversi, e chi la usa non deve saperlo. */
create or replace function iam_garanzie_righe()
returns table (polizza_id uuid, cliente_id uuid, ramo text, testo text, etichetta text)
language sql
stable
security invoker
as $$
  select p.id,
         p.cliente_id,
         lower(trim(coalesce(nullif(p.modulo, ''), p.prodotto, ''))),
         iam_garanzia_testo(g),
         trim(coalesce(nullif(g->>'descrizione', ''), g->>'codice', ''))
    from quote_polizze p,
         lateral jsonb_array_elements(
           case when jsonb_typeof(p.dati->'ssf'->'garanzie') = 'array' then p.dati->'ssf'->'garanzie'
                when jsonb_typeof(p.dati->'garanzie')        = 'array' then p.dati->'garanzie'
                else '[]'::jsonb end) g
   where nullif(iam_garanzia_testo(g), '') is not null
$$;

/* L'ELENCO PER IL MENU A TENDINA, con quante polizze hanno ciascuna garanzia.
   Il numero non è un ornamento: è la differenza fra «non ne abbiamo» e «non
   lo sappiamo». Una garanzia che compare su tre polizze su quattromila
   filtrata non seleziona — restituisce il poco che c'è, e chi legge crede di
   aver trovato un buco di mercato. */
create or replace function iam_garanzie_elenco()
returns table (etichetta text, ramo text, quante bigint)
language sql
stable
security invoker
as $$
  select etichetta, ramo, count(distinct polizza_id) as quante
    from iam_garanzie_righe()
   group by etichetta, ramo
   having count(distinct polizza_id) > 0
   order by count(distinct polizza_id) desc, etichetta
$$;

/* I CLIENTI CHE HANNO una garanzia, eventualmente solo dentro certi rami.
   Chi cerca il contrario — «senza» — prende questo elenco e lo sottrae: così
   c'è UNA regola sola su che cosa vuol dire «avere quella garanzia», e il
   «senza» non può divergere dal «con».

   `p_rami` serve alla domanda di Francesco per intero: «senza quella garanzia
   NELLA POLIZZA AUTO». Senza il ramo, un cliente risulterebbe «senza
   infortuni» solo perché non ce li ha sulla polizza della casa — dove non
   esistono nemmeno. */
create or replace function iam_clienti_con_garanzia(p_testo text, p_rami text[] default null)
returns table (cliente_id uuid)
language sql
stable
security invoker
as $$
  with parole as (
    select unnest(string_to_array(
             regexp_replace(lower(trim(coalesce(p_testo, ''))), '[^a-z0-9]+', ' ', 'g'), ' ')) as w
  ), cercate as (
    select array_agg(w) as elenco from parole where w <> ''
  )
  select distinct r.cliente_id
    from iam_garanzie_righe() r, cercate c
   where r.cliente_id is not null
     and c.elenco is not null
     and (p_rami is null or array_length(p_rami, 1) is null
          or r.ramo = any (select lower(trim(x)) from unnest(p_rami) x))
     /* TUTTE le parole cercate devono esserci. Con `some` basterebbe una
        parola qualunque, e «tutela legale» pescherebbe ogni garanzia che
        contiene «legale». */
     and (select bool_and(position(' ' || w || ' ' in ' ' || r.testo || ' ') > 0)
            from unnest(c.elenco) w)
$$;

comment on function iam_clienti_con_garanzia(text, text[]) is
  'I clienti che hanno una garanzia il cui testo contiene tutte le parole cercate, eventualmente solo nei rami indicati. Chi cerca «senza» sottrae questo elenco.';
