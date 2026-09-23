-- ═══════════════════════════════════════════════════════════════════════════
--  UNA CARTA DI CREDITO NON E' UN CONTO CORRENTE  (23/09/2026)
--
--  Segnalazione di Francesco, sulla Quadratura conti: «CARTA DI CREDITO
--  UNICREDIT» era classificata come conto corrente bancario.
--
--  Non e' un dettaglio di etichetta. Per il motore un conto corrente e'
--  LIQUIDITA' — soldi che l'agenzia ha — e quindi:
--
--    · il suo saldo entrava nel riquadro «Soldi dell'agenzia» del cruscotto.
--      Un debito di carta da 170 € faceva leggere 170 € IN MENO di liquidita',
--      che e' un'altra cosa: quei soldi in banca ci sono ancora, si devono;
--    · le entrate e le uscite di giornata contavano i movimenti della carta
--      come denaro entrato o uscito dalla cassa dell'agenzia.
--
--  Quello che il saldo della carta dice e' quanto si deve alla banca, ed e'
--  giusto che resti negativo: non e' il segno a essere sbagliato, e' il
--  mucchio in cui finisce.
--
--  ROLLBACK in fondo.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Il vocabolario del database si allarga. Il motore
--    (`tariffe/motore/contabilita.js`, TIPOLOGIE) dice le stesse chiavi, e
--    c'e' una prova che confronta i due elenchi: una tipologia che esiste in
--    uno solo dei due e' una tendina che propone quello che il salvataggio
--    poi rifiuta.
alter table iam_conti drop constraint if exists iam_conti_tipologia_check;
alter table iam_conti add constraint iam_conti_tipologia_check
  check (tipologia in ('banca', 'cassa', 'conto_assicurativo', 'transitorio',
                       'credito', 'debito', 'rettifica', 'carta_credito',
                       'costo', 'ricavo', 'altro'));

-- 2. Il conto di Francesco. Si sposta SOLO quello, e solo se e' ancora
--    classificato come conto corrente: un aggiornamento largo («tutti i conti
--    che si chiamano carta…») riclassificherebbe domani un conto che qualcuno
--    ha chiamato cosi' di proposito.
update iam_conti
   set tipologia = 'carta_credito'
 where id = 'a16622b9-d14f-478e-b2de-bf7e1794721b'
   and tipologia = 'banca';

-- Il SALDO DI PARTENZA non si tocca: e' 0,00 e nessuno ha ancora detto quale
-- sia quello vero. La quadratura adesso lo propone (dichiarato meno i
-- movimenti), ma proporre e scrivere sono due cose diverse — e su un numero
-- di contabilita' la differenza e' tutta.

-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- update iam_conti set tipologia = 'banca'
--  where id = 'a16622b9-d14f-478e-b2de-bf7e1794721b' and tipologia = 'carta_credito';
-- alter table iam_conti drop constraint if exists iam_conti_tipologia_check;
-- alter table iam_conti add constraint iam_conti_tipologia_check
--   check (tipologia in ('banca','cassa','conto_assicurativo','transitorio',
--     'credito','debito','rettifica','costo','ricavo','altro'));
