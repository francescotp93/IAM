import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

// Helper di riferimento. In produzione riusare l'istanza/browser pool già previsto dal backend,
// evitando di aprire un nuovo Chromium per ogni documento se il volume cresce.
export async function generaPdfDaHtml({ html, tipo = 'cliente', browserFactory = () => chromium.launch({ headless: true }) }) {
  if (typeof html !== 'string' || !html.includes('<html')) throw new TypeError('HTML del report mancante o non valido.');
  if (!['cliente', 'agenzia'].includes(tipo)) throw new TypeError('Tipo report non valido.');

  const browser = await browserFactory();
  try {
    const pagina = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await pagina.setContent(html, { waitUntil: 'load' });
    await pagina.emulateMedia({ media: 'print' });
    const pdf = await pagina.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });
    return {
      pdf,
      sha256: createHash('sha256').update(pdf).digest('hex'),
      tipo
    };
  } finally {
    await browser.close();
  }
}
