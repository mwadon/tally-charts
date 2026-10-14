import fs from 'node:fs'
const all = JSON.parse(fs.readFileSync('rendered-contrast.json', 'utf8'))
console.log('measured text runs:', all.length)
const fails = all.filter(r => r.median < r.need)
const key = r => `${r.theme}|${r.part}|${r.sel}|${r.fgHex}`
const groups = new Map()
for (const f of fails) { const k = key(f); const g = groups.get(k) ?? { ...f, stories: new Set(), texts: new Set(), bgs: new Set(), min: 99 }; g.stories.add(`${f.id}[${f.state}]`); g.texts.add(f.text); g.bgs.add(f.bgMedian); g.min = Math.min(g.min, f.median); groups.set(k, g) }
console.log('FAILING TEXT runs:', fails.length)
for (const g of [...groups.values()].sort((a,b)=>a.min-b.min)) console.log(`${g.theme} ${g.part} ${g.sel} fg=${g.fgHex} a=${g.alpha} bg=${[...g.bgs].slice(0,3)} min=${g.min} need=${g.need} size=${g.size} | ${[...g.texts].slice(0,4).join(' / ')} | ${[...g.stories].slice(0,4).join(', ')} (${g.stories.size})`)
