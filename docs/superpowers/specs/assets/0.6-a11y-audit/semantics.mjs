import fs from 'node:fs'
import { launch, open, storyIds } from './common.mjs'
const browser = await launch()
const ids = (await storyIds()).filter(i => !/--dark$/.test(i))
let out = ''
const facts = {}
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await open(page, id, 'light')
  const snap = await page.locator('#storybook-root').ariaSnapshot()
  out += `\n===== ${id}\n${snap}\n`
  facts[id] = await page.evaluate(() => {
    const figs = [...document.querySelectorAll('#storybook-root figure[data-ch-root]')].map(f => ({
      name: f.getAttribute('aria-labelledby') ? document.getElementById(f.getAttribute('aria-labelledby'))?.textContent : null,
      desc: f.getAttribute('aria-describedby') ? document.getElementById(f.getAttribute('aria-describedby'))?.textContent : null,
      table: !!f.querySelector('table'), tableRows: f.querySelectorAll('table tbody tr').length, caption: f.querySelector('caption')?.textContent ?? null,
      headers: [...f.querySelectorAll('table th')].map(t => t.textContent),
      firstRow: [...(f.querySelector('table tbody tr')?.children ?? [])].map(t => t.textContent),
      registeredPointsHint: f.querySelectorAll('[data-ch-part="bar-hit"]').length,
      liveInside: !!f.querySelector('[aria-live]'),
      visibleTitleOutside: null,
    }))
    const heat = [...document.querySelectorAll('#storybook-root [role="grid"]')].map(g => ({
      name: g.getAttribute('aria-labelledby') ? document.getElementById(g.getAttribute('aria-labelledby'))?.textContent : null,
      colheaders: [...g.querySelectorAll('[role="columnheader"]')].map(h => h.textContent),
      rowheaders: [...g.querySelectorAll('[role="rowheader"]')].map(h => h.textContent),
      cellsPerRow: [...g.querySelectorAll('[role="row"]')].map(r => r.children.length),
      totalCellsFocusable: g.querySelectorAll('.ch-heatmap-total[tabindex]').length,
      legendInGrid: !!g.querySelector('.ch-legend'),
    }))
    const imgs = [...document.querySelectorAll('#storybook-root [role="img"],#storybook-root [role="meter"]')].map(e => `${e.getAttribute('role')}: ${e.getAttribute('aria-label')} ${e.getAttribute('aria-valuetext') ?? ''}`)
    const legends = [...document.querySelectorAll('#storybook-root .ch-legend')].map(l => [...l.querySelectorAll('li')].map(li => li.textContent).join(' | '))
    return { figs, heat, imgs, legends }
  })
  await page.close()
}
fs.writeFileSync('aria-snapshots.txt', out)
fs.writeFileSync('semantics.json', JSON.stringify(facts, null, 1))
console.log(JSON.stringify(facts, null, 1))
await browser.close()
