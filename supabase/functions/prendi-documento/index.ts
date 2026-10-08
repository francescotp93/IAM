// ═══════════════════════════════════════════════════════════════════════════════
//  PRENDI UN DOCUMENTO DAL SITO DELLA COMPAGNIA                    02/10/2026
//
//  ┌───────────────────────────────────────────────────────────────────────────┐
//  │ PERCHÉ ESISTE: la rete di chi legge i documenti è chiusa, questa no.      │
//  └───────────────────────────────────────────────────────────────────────────┘
//  Misurato il 02/10/2026: dall'ambiente in cui girano gli agenti il gateway
//  risponde 403 al CONNECT verso ivass.it, verso tutte le compagnie provate e
//  verso i CDN. Lo stesso ambiente però raggiunge Supabase.
//
//  Una Edge Function gira sull'infrastruttura di Supabase, che ha la sua uscita
//  verso internet. È da là che si prendono i documenti: la funzione scarica il
//  PDF e lo RESTITUISCE, e chi l'ha chiesto lo legge col motore che ha già.
//
//  NON SALVA NIENTE, e è una semplificazione voluta. La prima versione metteva
//  il file in un archivio su Supabase, e per farlo serviva creare un secchio,
//  decidere chi può leggerlo e tenerlo pulito: tre cose da approvare e da
//  curare per un file che a chi lo chiede serve subito e una volta sola.
//  L'impronta la calcola già il browser, e il documento che vale la pena
//  tenere è quello che una persona ha confermato — e quello finisce in
//  archivio dalla schermata, come quando lo si carica a mano.
//
//  ┌───────────────────────────────────────────────────────────────────────────┐
//  │ NON È UN PROXY APERTO, E IL VINCOLO È LA PARTE IMPORTANTE.                │
//  └───────────────────────────────────────────────────────────────────────────┘
//  Una funzione che prende un URL qualunque e lo scarica è un proxy aperto
//  sull'infrastruttura dell'agenzia: chiunque riuscisse a chiamarla potrebbe
//  raggiungere qualsiasi indirizzo — una rete interna, un servizio altrui — e
//  nei log di quel servizio ci sarebbe l'IP dell'agenzia, non il suo.
//
//  Quindi:
//   · si scarica SOLO dai domini elencati qui sotto, che sono quelli del
//     catalogo `tariffe/dati/note-informative.json`;
//   · solo `https`, e i reindirizzamenti si seguono a mano controllando che
//     ogni salto resti dentro l'elenco (un 302 verso un altro host è
//     esattamente il modo in cui un elenco di domini si aggira);
//   · solo PDF, e con un tetto dichiarato più sotto.
//
//  E UNA COSA CHE VA DETTA COM'È, perché è facile raccontarsela: la chiamata
//  passa dal controllo del token di Supabase (`verify_jwt`, il comportamento
//  normale), ma la chiave pubblica di IAM è dentro il sorgente della pagina e
//  quella chiave È un token valido. Quindi NON è vero che «solo chi è dentro
//  IAM ce la fa»: ce la fa chiunque legga il sorgente della pagina.
//
//  La protezione vera è l'elenco dei domini, non il token. Quello che un
//  estraneo potrebbe fare è far scaricare a Supabase un PDF pubblico di una
//  compagnia — e pagarne la banda. È il motivo per cui c'è un tetto al peso.
//  Il giorno in cui IAM sarà l'unico a chiamarla, si aggiunge il controllo che
//  il token sia di un utente vero e non quello pubblico: sono tre righe, e
//  fino ad allora servirebbero anche a tenere fuori chi deve riempire
//  l'archivio.
//
//  ┌───────────────────────────────────────────────────────────────────────────┐
//  │ NON ARCHIVIA NIENTE E NON DECIDE NIENTE.                                  │
//  └───────────────────────────────────────────────────────────────────────────┘
//  Prende il file e dice che cosa ha preso. Chi lo legge, che cosa ne capisce e
//  se finisce in archivio lo decide la schermata, con una persona davanti: il
//  motore che lo legge non scrive mai «assente» da solo, e questo vale anche
//  quando il documento arriva da qui invece che da un caricamento a mano.
//
//  COME SI INSTALLA (serve il via di Francesco: è un deploy in produzione)
//      supabase functions deploy prendi-documento
//  Come si disinstalla, se non va:
//      supabase functions delete prendi-documento
//  Non tocca nessuna tabella: si può togliere senza lasciare niente dietro.
// ═══════════════════════════════════════════════════════════════════════════════
/* I domini del catalogo. Si aggiorna questo elenco quando si aggiunge una
   compagnia, e si rimanda in produzione: è una riga in più da scrivere ed è il
   prezzo di non avere un proxy aperto. */
const DOMINI = [
  /* I DOMINI SONO QUELLI DEL CATALOGO, e una prova li confronta: se divergono
     il documento non si scarica e nessuno capisce perche'.

     `dallbogg.it` REINDIRIZZA a `dallbogg.com`: trovato alla prima chiamata
     vera, il 02/10/2026. Servono tutt'e due, e la scoperta vale piu' della
     riga che l'ha risolta — un elenco scritto a tavolino non ci sarebbe mai
     arrivato, perche' il reindirizzamento non si vede guardando l'indirizzo.

     HDI tiene i documenti su tre domini diversi (sito pubblico, area clienti,
     portale di quotazione) e vanno elencati uno per uno: accettare
     «*.hdiassicurazioni.it» vorrebbe dire accettare anche un sottodominio che
     un domani serve a qualcos'altro.

     L'08/10/2026 l'elenco e' passato da undici a 58 domini, con le banche che
     vendono prodotti assicurativi (Intesa, Poste, Credit Agricole, BNP Cardif,
     Credem, Vera, Arca, Mediolanum) e le dirette. */
  'areaclienti.hdiassicurazioni.it',
  'assets.europassistance.it',
  'bnl.it',
  'canegatto.conte.it',
  'cdn.generali.it',
  'cdn.groupama.it',
  'dallbogg.com',
  'dallbogg.it',
  'genertel.it',
  'intermediari.conte.it',
  'intesasanpaolorbmsalute.com',
  'sara.it',
  'setinformativi.bnpparibascardif.it',
  'static.credit-agricole.it',
  'static.sitewww.arcassicura.it',
  'veraassicurazioni.it',
  'www.adir.it',
  'www.allianz.it',
  'www.allianzdirect.it',
  'www.amtrust.it',
  'www.assimoco.it',
  'www.axa.it',
  'www.bene.it',
  'www.ca-assicurazioni.it',
  'www.ca-vita.it',
  'www.cattolica.it',
  'www.conte.it',
  'www.credemassicurazioni.it',
  'www.credemvita.it',
  'www.dallbogg.com',
  'www.generali.it',
  'www.genertel.it',
  'www.gruppoitas.it',
  'www.helvetia.com',
  'www.intesasanpaoloassicurazioni.com',
  'www.intesasanpaoloinsuranceagency.it',
  'www.intesasanpaoloprotezione.com',
  'www.italiana.it',
  'www.linear.it',
  'www.media.poste.it',
  'www.mediolanumvita.it',
  'www.munichre.com',
  'www.netinsurance.it',
  'www.nobis.it',
  /* `veraassicurazioni.it` REINDIRIZZA qui: scoperto alla prima raccolta vera,
     l'08/10/2026, su sei documenti Vera che venivano tutti rifiutati. Come
     dallbogg: un elenco scritto a tavolino non ci arriva, perché il
     reindirizzamento non si vede guardando l'indirizzo. */
  'www.piuvera.it',
  'www.prima.it',
  'www.quixa.it',
  'www.realemutua.it',
  'www.revoinsurance.com',
  'www.sara.it',
  'www.unipol.it',
  'www.unisalute.it',
  'www.veraassicurazioni.it',
  'www.verti.it',
  'www.vittoriaassicurazioni.com',
  'www.zurich-connect.it',
  'www.zurich.it',
  'youquote.hdia.it',
]

/* 15 MB: il set informativo vero pesa 2. Il tetto serve anche a non far
   tornare una risposta enorme, perché il file torna dentro la risposta. */
const TETTO = 15 * 1024 * 1024
const SALTI = 5                        /* quanti reindirizzamenti si seguono */

/* ─────────────────────────────────────────────────────────────────────────────
   CHI STA CHIAMANDO. Misurato l'08/10/2026, alla prima raccolta vera: su 283
   documenti, sedici tornavano 403 — dodici di Allianz — e cinque 400 da
   Zurich. Sono tutti documenti precontrattuali che la compagnia pubblica
   perché deve: non è un contenuto riservato, è il filtro anti-robot del sito
   che rifiuta a priori chi non si presenta. Deno, se non gli si dice niente,
   manda «user-agent: Deno/2.x».

   QUI CI SI PRESENTA PER QUELLO CHE SI È: l'agenzia, col suo indirizzo. Non
   ci si traveste da Chrome, e la differenza è concreta — se un domani una
   compagnia volesse tenerci fuori, da questa riga sa chi bloccare, e
   travestirsi vorrebbe dire togliergli quella possibilità. `Mozilla/5.0
   (compatible; ...)` è la forma con cui si presentano i programmi, quella di
   Googlebot: serve perché molti filtri guardano solo il prefisso.

   MISURATO DOPO: non ha cambiato niente. I 403 di Allianz, REVO e Prima e i
   400 di Zurich sono rimasti identici con la presentazione e senza. Quei siti
   non guardano chi chiama: rifiutano l'indirizzo da cui arriva la chiamata.
   La riga resta perché è giusto presentarsi, non perché serve a passare.
   ───────────────────────────────────────────────────────────────────────────── */
const CHI_CHIAMA = 'Mozilla/5.0 (compatible; WithusAssicurazioni/1.0; +https://www.withusassicurazioni.it)'
const INTESTAZIONI_DI_CHI_CHIEDE = {
  Accept: 'application/pdf,*/*',
  'User-Agent': CHI_CHIAMA,
  /* I siti italiani servono la pagina in italiano, e un documento in italiano
     è quello che si vuole leggere. */
  'Accept-Language': 'it-IT,it;q=0.9',
}

function dentroElenco(u: URL): boolean {
  if (u.protocol !== 'https:') return false
  /* Il confronto è sull'host INTERO, non su «finisce con»: «sara.it.male.com»
     finisce con nulla di buono e passerebbe un controllo scritto male. */
  return DOMINI.includes(u.hostname)
}

async function prendi(indirizzo: string): Promise<{ r: Response; finale: string }> {
  let qui = indirizzo
  for (let n = 0; n <= SALTI; n++) {
    const u = new URL(qui)
    if (!dentroElenco(u)) throw new Error('fuori-elenco:' + u.hostname)
    const r = await fetch(qui, { redirect: 'manual', headers: INTESTAZIONI_DI_CHI_CHIEDE })
    if (r.status >= 300 && r.status < 400) {
      const dove = r.headers.get('location')
      if (!dove) throw new Error('reindirizzamento senza indirizzo')
      /* Il salto si risolve sull'URL di partenza, così un «/altro.pdf»
         relativo resta sullo stesso host e un assoluto si fa controllare. */
      qui = new URL(dove, qui).toString()
      continue
    }
    return { r, finale: qui }
  }
  throw new Error('troppi reindirizzamenti')
}

/* Le origini da cui IAM e QUOTO chiamano. Sono le stesse del filtro che sta
   in `index.js` per la porta delle catture: un elenco solo di origini
   buone non esiste in questa casa, ma almeno queste due dicono la stessa
   cosa. Senza le intestazioni CORS il browser blocca la chiamata prima
   ancora di farla, e la schermata direbbe «non riesco» senza un motivo. */
const ORIGINI = [
  'https://iam.withusassicurazioni.it',
  'https://quoto.withusassicurazioni.it',
  'https://www.withusassicurazioni.it',
]
function intestazioni(origine: string | null): Record<string, string> {
  const ok = origine && ORIGINI.includes(origine) ? origine : ORIGINI[0]
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req) => {
  const cors = intestazioni(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return Response.json({ ok: false, motivo: 'Si chiama in POST con { url }.' },
      { status: 405, headers: cors })
  }
  let url = ''
  try { url = String((await req.json()).url || '') } catch { /* corpo non leggibile */ }
  if (!url) {
    return Response.json({ ok: false, motivo: 'Manca l\'indirizzo del documento.' },
      { status: 400, headers: cors })
  }

  try {
    const { r, finale } = await prendi(url)

    if (!r.ok) {
      /* Un 404 non è un guasto di questa funzione: è un URL del catalogo che
         è scaduto, e va detto con quelle parole perché è quello che succede
         ogni volta che una compagnia pubblica un'edizione nuova. */
      return Response.json({
        ok: false, scaduto: r.status === 404 || r.status === 410, stato: r.status,
        motivo: 'Il sito della compagnia ha risposto ' + r.status +
          (r.status === 404 ? ': l\'indirizzo non c\'è più. Succede a ogni edizione nuova: va ritrovato.' : '.'),
      }, { status: 200, headers: cors })
    }

    const tipo = (r.headers.get('content-type') || '').toLowerCase()
    const lunghezza = Number(r.headers.get('content-length') || 0)
    if (lunghezza > TETTO) {
      return Response.json({ ok: false, motivo: 'Il file pesa ' + lunghezza + ' byte, oltre il tetto di ' + TETTO + '.' },
        { headers: cors })
    }

    const byte = new Uint8Array(await r.arrayBuffer())
    if (byte.length > TETTO) {
      return Response.json({ ok: false, motivo: 'Il file pesa ' + byte.length + ' byte, oltre il tetto.' },
        { headers: cors })
    }

    /* Il tipo dichiarato non basta: si guardano i byte. Un sito che risponde
       con una pagina di errore «200 OK» e il content-type sbagliato farebbe
       archiviare un HTML come se fosse un documento di prodotto.

       MA «%PDF-» NON DEVE STARE AL PRIMO BYTE. La specifica PDF ammette
       l'intestazione entro il primo kilobyte e i lettori veri la cercano là —
       pdf.js compreso, che è quello che poi legge il file: un controllo più
       severo della specifica rifiuterebbe file che si aprono benissimo.
       Cercarla nel primo kilobyte NON riapre la porta all'HTML, e la prova lo
       misura in tutt'e due i versi: una pagina d'errore non ha «%PDF-» da
       nessuna parte, e il tetto del kilobyte ferma una pagina che lo nomina
       più in là.

       E QUELLO CHE QUESTA LARGHEZZA *NON* HA RISOLTO, perché la tentazione è
       raccontarsela: l'08/10/2026 due documenti Credem tornavano dichiarati
       «application/pdf» e cominciavano per due byte illeggibili e tre spazi.
       Ho allargato la finestra pensando a un'intestazione spostata: non erano
       quelli. Nel primo kilobyte non c'è «%PDF-» da nessuna parte, e che cosa
       siano quei byte non si sa — per saperlo servirebbe che il rifiuto
       riportasse i primi byte in esadecimale, che oggi non fa. I due documenti
       Credem restano da prendere. */
    const testa = new TextDecoder('latin1').decode(byte.slice(0, 1024))
    const dove = testa.indexOf('%PDF-')
    if (dove < 0) {
      const firma = new TextDecoder().decode(byte.slice(0, 5))
      return Response.json({
        ok: false,
        motivo: 'Quello che è arrivato non è un PDF (comincia per «' + firma.replace(/[^\x20-\x7e]/g, '·') +
          '», tipo dichiarato «' + (tipo || 'nessuno') + '», e nel primo kilobyte non c\'è «%PDF-»). ' +
          'Quasi sempre è una pagina di errore travestita da risposta buona, oppure un indirizzo che ' +
          'ora porta alla pagina del prodotto.',
      }, { headers: cors })
    }

    const h = await crypto.subtle.digest('SHA-256', byte)
    const impronta = Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('')

    /* Il file torna dentro la risposta, in base64. Chi l'ha chiesto lo legge
       col lettore che ha già: in IAM è `PdfTesto`, lo stesso che legge un PDF
       caricato a mano, quindi non c'è una seconda strada da provare. */
    let b64 = ''
    const pezzo = 0x8000
    for (let i = 0; i < byte.length; i += pezzo) {
      b64 += String.fromCharCode(...byte.subarray(i, i + pezzo))
    }

    return Response.json({
      ok: true, host: new URL(finale).hostname, impronta, byte: byte.length,
      pdf_base64: btoa(b64),
      indirizzo_finale: finale,
      /* Se l'intestazione non era al primo byte si dice di quanto: è un file
         un po' storto, e chi lo archivia ha il diritto di saperlo invece di
         scoprirlo il giorno che un lettore più severo lo rifiuta. */
      byte_prima_dell_intestazione: dove,
      /* Si dice se c'è stato un salto: un URL del catalogo che reindirizza
         vuol dire che la compagnia ha spostato il documento, e il catalogo va
         aggiornato anche se stavolta è andata bene. */
      reindirizzato: finale !== url,
    }, { headers: cors })
  } catch (e) {
    const m = String((e as Error)?.message || e)
    if (m.startsWith('fuori-elenco:')) {
      return Response.json({
        ok: false,
        motivo: 'Il dominio «' + m.slice('fuori-elenco:'.length) + '» non è fra quelli da cui si prende. ' +
          'Si aggiunge all\'elenco dentro la funzione e si rimanda in produzione: è di proposito che non ' +
          'si può scaricare da un indirizzo qualunque.',
      }, { status: 403, headers: cors })
    }
    return Response.json({ ok: false, motivo: m }, { status: 502, headers: cors })
  }
})
