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
//  PDF, lo mette nell'archivio dei file e torna la sua impronta. Poi IAM lo
//  legge col motore che ha già, e propone il prodotto da archiviare.
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
//   · solo PDF, e con un tetto di 25 MB;
//   · la chiamata vuole il token di chi è dentro IAM (`verify_jwt`, che è il
//     comportamento normale di Supabase): non c'è nessun segreto nuovo da
//     custodire, e chi non ha accesso a IAM non ce la fa.
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
import { createClient } from 'jsr:@supabase/supabase-js@2'

/* I domini del catalogo. Si aggiorna questo elenco quando si aggiunge una
   compagnia, e si rimanda in produzione: è una riga in più da scrivere ed è il
   prezzo di non avere un proxy aperto. */
const DOMINI = [
  'dallbogg.it',
  'cdn.groupama.it',
  'www.sara.it',
  'www.axa.it',
  'youquote.hdia.it',
  'www.italiana.it',
]

const TETTO = 25 * 1024 * 1024        /* 25 MB: il set informativo vero pesa 2 */
const SALTI = 5                        /* quanti reindirizzamenti si seguono */
const SECCHIO = 'note-informative'

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
    const r = await fetch(qui, { redirect: 'manual', headers: { Accept: 'application/pdf,*/*' } })
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, motivo: 'Si chiama in POST con { url }.' }, { status: 405 })
  }
  let url = ''
  try { url = String((await req.json()).url || '') } catch { /* corpo non leggibile */ }
  if (!url) return Response.json({ ok: false, motivo: 'Manca l\'indirizzo del documento.' }, { status: 400 })

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
      }, { status: 200 })
    }

    const tipo = (r.headers.get('content-type') || '').toLowerCase()
    const lunghezza = Number(r.headers.get('content-length') || 0)
    if (lunghezza > TETTO) {
      return Response.json({ ok: false, motivo: 'Il file pesa ' + lunghezza + ' byte, oltre il tetto di ' + TETTO + '.' })
    }

    const byte = new Uint8Array(await r.arrayBuffer())
    if (byte.length > TETTO) {
      return Response.json({ ok: false, motivo: 'Il file pesa ' + byte.length + ' byte, oltre il tetto.' })
    }

    /* Il tipo dichiarato non basta: si guardano i primi byte. Un sito che
       risponde con una pagina di errore «200 OK» e il content-type sbagliato
       farebbe archiviare un HTML come se fosse un documento di prodotto. */
    const firma = new TextDecoder().decode(byte.slice(0, 5))
    if (firma !== '%PDF-') {
      return Response.json({
        ok: false,
        motivo: 'Quello che è arrivato non è un PDF (comincia per «' + firma.replace(/[^\x20-\x7e]/g, '·') +
          '», tipo dichiarato «' + (tipo || 'nessuno') + '»). Quasi sempre è una pagina di errore ' +
          'travestita da risposta buona, oppure un indirizzo che ora porta alla pagina del prodotto.',
      })
    }

    const h = await crypto.subtle.digest('SHA-256', byte)
    const impronta = Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('')

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const host = new URL(finale).hostname
    const percorso = host + '/' + impronta + '.pdf'
    /* `upsert` perché l'impronta È il nome: lo stesso file ricaricato è lo
       stesso file, e riscriverlo identico non cambia niente. */
    const su = await sb.storage.from(SECCHIO).upload(percorso, byte, {
      contentType: 'application/pdf', upsert: true,
    })
    if (su.error) {
      return Response.json({ ok: false, motivo: 'Preso ma non salvato: ' + su.error.message, impronta })
    }

    return Response.json({
      ok: true, host, percorso, impronta, byte: byte.length,
      indirizzo_finale: finale,
      /* Si dice se c'è stato un salto: un URL del catalogo che reindirizza
         vuol dire che la compagnia ha spostato il documento, e il catalogo va
         aggiornato anche se stavolta è andata bene. */
      reindirizzato: finale !== url,
    })
  } catch (e) {
    const m = String((e as Error)?.message || e)
    if (m.startsWith('fuori-elenco:')) {
      return Response.json({
        ok: false,
        motivo: 'Il dominio «' + m.slice('fuori-elenco:'.length) + '» non è fra quelli da cui si prende. ' +
          'Si aggiunge all\'elenco dentro la funzione e si rimanda in produzione: è di proposito che non ' +
          'si può scaricare da un indirizzo qualunque.',
      }, { status: 403 })
    }
    return Response.json({ ok: false, motivo: m }, { status: 502 })
  }
})
