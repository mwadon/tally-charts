import fs from 'node:fs'
import { launch, open } from './common.mjs'
const browser = await launch()
const ids = process.argv.slice(2)
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await open(page, id, 'light')
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  const byId = new Map(nodes.map(n => [n.nodeId, n]))
  const lines = []
  const walk = (n, d) => {
    const role = n.role?.value; const name = n.name?.value ?? ''; const desc = n.description?.value ?? ''
    const ignored = n.ignored
    if (!ignored && !['none','generic','InlineTextBox','StaticText'].includes(role) || (role === 'StaticText' && d < 0))
      lines.push(`${'  '.repeat(Math.min(d, 20))}${role} "${name}"${desc ? ` desc="${desc}"` : ''}${n.properties?.filter(p => ['focusable','live','hidden'].includes(p.name)).map(p => ` ${p.name}=${p.value.value}`).join('') ?? ''}`)
    for (const c of n.childIds ?? []) { const ch = byId.get(c); if (ch) walk(ch, ignored || ['none','generic'].includes(role) ? d : d + 1) }
  }
  const root = nodes.find(n => !n.parentId); walk(root, 0)
  fs.writeFileSync(`axtree-${id}.txt`, lines.join('\n'))
  console.log(`===== ${id}\n` + lines.filter(l => !/^\s*(RootWebArea|StaticText)/.test(l)).join('\n'))
  await page.close()
}
await browser.close()
