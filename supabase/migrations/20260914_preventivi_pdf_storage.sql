-- ═══════════════════════════════════════════════════════════════════════════
--  IL PDF DEL PREVENTIVO PERSONALIZZATO IN ARCHIVIO  (14/09/2026)
--
--  Serve a UNA cosa sola: su WhatsApp il PDF non si allega da un
--  collegamento. wa.me porta un testo, non un file. Dal telefono si passa
--  dalla condivisione nativa del sistema e il file parte davvero; dal
--  computer quella non c'e', quindi il PDF va qui e al cliente arriva un
--  collegamento firmato che scade.
--
--  ── LA COSA DA SAPERE, E NON E' OVVIA ────────────────────────────────────
--  Un collegamento firmato SCAVALCA queste policy per definizione: il
--  cliente non e' loggato, quindi il token E' il permesso. Le regole qui
--  sotto proteggono il secchio da chi e' dentro il sistema; il collegamento
--  e' una finestra di sette giorni verso fuori, e chi lo riceve — o a chi
--  viene inoltrato — apre il PDF.
--  Sette giorni perche' un collegamento che muore in un'ora e' inutile al
--  cliente, e uno che non muore mai e' un documento con i suoi dati
--  personali appeso a un indirizzo per sempre.
--
--  Il percorso e' fisso (cliente/preventivo.pdf) e si sovrascrive: cosi'
--  ricondividere lo stesso preventivo non lascia in archivio cinque copie
--  dei dati della stessa persona, e il collegamento vecchio smette di
--  puntare a un documento superato.
-- ═══════════════════════════════════════════════════════════════════════════

-- Privato, solo PDF, max 10 MB: un secchio che accetta qualunque cosa
-- diventa il posto dove finisce qualunque cosa.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('preventivi', 'preventivi', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Chi vede il preventivo vede il suo PDF, e nessun altro: quote_vede() e' la
-- stessa funzione che decide chi vede l'anagrafica del cliente, quindi non si
-- apre nessuna strada che dalla scheda era chiusa.
-- storage.objects.owner viene valorizzato all'upload da una sessione
-- autenticata (verificato: 24 oggetti su 26 nel secchio «documenti»). Se
-- fosse vuoto, quote_vede(null) e' falso per chi non e' staff: la regola si
-- chiude, non si apre.
create policy prev_pers_pdf_carica on storage.objects
  for insert to authenticated
  with check (bucket_id = 'preventivi' and auth.uid() is not null);

create policy prev_pers_pdf_leggi on storage.objects
  for select to authenticated
  using (bucket_id = 'preventivi' and public.quote_vede(owner));

-- Serve alla sovrascrittura: senza, il secondo invio dello stesso preventivo
-- fallirebbe invece di aggiornare il file.
create policy prev_pers_pdf_sovrascrivi on storage.objects
  for update to authenticated
  using (bucket_id = 'preventivi' and public.quote_vede(owner))
  with check (bucket_id = 'preventivi' and public.quote_vede(owner));

create policy prev_pers_pdf_cancella on storage.objects
  for delete to authenticated
  using (bucket_id = 'preventivi' and public.iam_is_admin());
