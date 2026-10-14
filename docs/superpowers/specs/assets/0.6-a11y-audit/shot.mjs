import { launch, open } from './common.mjs'
const [id, theme = 'light', w = '1280'] = process.argv.slice(2)
const b = await launch(); const p = await b.newPage({ viewport: { width: +w, height: 700 }, reducedMotion: 'reduce' })
await open(p, id, theme); await p.screenshot({ path: `shots/plain-${theme}-${id}.png`, fullPage: true }); await b.close()
