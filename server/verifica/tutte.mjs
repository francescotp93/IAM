/* LANCIA TUTTE LE PROVE E DICE UN NUMERO SOLO.

   Finora il conto lo facevo a mano con `grep`, e veniva diverso ogni volta:
   alcune suite stampano una riga per prova, altre solo il riepilogo. Due
   conti diversi sullo stesso codice sono peggio di nessun conto, perché fanno
   credere a un progresso che non c'è.

   Qui la regola è una: **vale il riepilogo che la suite stampa di sé**
   («N/M», «N superate»). Se non lo stampa, si contano i suoi segni verdi. Il
   verde e il rosso, però, non li decide nessun testo: li decide il codice di
   uscita. «0 superate, 0 fallite» è muto, non verde.

       node server/verifica/tutte.mjs            tutte
       node server/verifica/tutte.mjs crm conta  solo quelle che contengono «crm» o «conta»
*/
import { readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const filtri = process.argv.slice(2)

const suite = readdirSync(QUI).filter((f) => f.endsWith('.test.mjs'))
  .filter((f) => !filtri.length || filtri.some((t) => f.includes(t)))
  .sort()

/* Il numero che la suite dichiara di sé. `null` quando non lo dichiara: si
   ripiega sui segni verdi, e lo si dice invece di far finta. */
function superate(uscita) {
  const righe = uscita.trim().split('\n').slice(-5).reverse()
  for (const r of righe) {
    const a = /(\d+)\s*\/\s*(\d+)/.exec(r)
    if (a) return { n: +a[1], m: +a[2], come: 'riepilogo' }
    const b = /(\d+)\s+superate?/i.exec(r)
    if (b) return { n: +b[1], m: null, come: 'riepilogo' }
  }
  const verdi = (uscita.match(/✅/g) || []).length
  return verdi ? { n: verdi, m: null, come: 'segni' } : null
}

let sommaN = 0, rosse = [], mute = []
for (const f of suite) {
  let uscita = '', codice = 0
  try { uscita = execFileSync('node', [join(QUI, f)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  catch (e) { codice = e.status == null ? 1 : e.status; uscita = (e.stdout || '') + (e.stderr || '') }

  const c = superate(uscita)
  const nome = f.replace('.test.mjs', '')
  if (codice !== 0) rosse.push(nome)
  if (!c) { mute.push(nome); console.log(`  ${codice ? '🔴' : '⚪'} ${nome} — non dichiara niente e non stampa segni`); continue }
  sommaN += c.n
  console.log(`  ${codice ? '🔴' : '🟢'} ${nome}  ${c.n}${c.m ? '/' + c.m : ''}${c.come === 'segni' ? ' (contati)' : ''}`)
}

console.log(`\n${rosse.length ? '🔴' : '🟢'} ${sommaN} prove superate su ${suite.length} suite`)
if (rosse.length) console.log(`   ${rosse.length} suite rosse: ${rosse.join(', ')}`)
if (mute.length) console.log(`   ${mute.length} suite mute (non dicono quante prove hanno fatto): ${mute.join(', ')}`)
process.exit(rosse.length ? 1 : 0)
