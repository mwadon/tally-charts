import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import { launch, open, storyIds } from './common.mjs'
const browser = await launch()
const ids = await storyIds()
const out = []
for (const theme of ['light', 'dark']) for (const id of ids) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await open(page, id, theme)
  const eff = await page.locator('.sb-canvas').getAttribute('data-ch-theme')
  const res = await new AxeBuilder({ page }).include('#storybook-root')
    .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()
  for (const v of res.violations) out.push({ id, theme: eff, rule: v.id, impact: v.impact, tags: v.tags, help: v.help,
    nodes: v.nodes.map(n => ({ target: n.target.join(' '), html: n.html.slice(0, 200), summary: n.failureSummary?.slice(0, 300) })) })
  const inc = res.incomplete.map(v => ({ id, theme: eff, rule: v.id, n: v.nodes.length, nodes: v.nodes.slice(0,3).map(n=>({target:n.target.join(' '), summary: n.failureSummary?.slice(0,200), data: JSON.stringify(n.any?.[0]?.data ?? '').slice(0,200)})) }))
  out.push(...inc.map(i => ({ ...i, incomplete: true })))
  console.log(theme, id, eff, res.violations.map(v => `${v.id}(${v.nodes.length})`).join(' ') || 'clean', '| incomplete:', res.incomplete.map(v=>`${v.id}(${v.nodes.length})`).join(' '))
  await ctx.close()
}
fs.writeFileSync('axe-results.json', JSON.stringify(out, null, 2))
await browser.close()
