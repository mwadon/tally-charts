import fs from 'node:fs'
import { launch, open, storyIds, url } from './common.mjs'
const browser = await launch()
const ids = (await storyIds()).filter(i => !/--dark$/.test(i))
const out = {}
for (const id of ids) {
  const o = out[id] = {}
  // Motion: count running animations/transitions right after first paint and after a re-render trigger (hover).
  for (const rm of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: rm })
    const page = await ctx.newPage()
    await page.goto(url(id, 'light'))
    await page.locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]').first().waitFor()
    const atLoad = await page.evaluate(() => document.getAnimations().map(a => `${a.constructor.name}:${a.animationName ?? a.transitionProperty}@${a.effect?.target?.getAttribute?.('data-ch-part') ?? a.effect?.target?.className?.baseVal ?? a.effect?.target?.className}`))
    // Trigger interaction
    const fig = page.locator('#storybook-root figure[tabindex="0"], #storybook-root [role=gridcell][tabindex="0"]').first()
    let onInteract = []
    if (await fig.count()) {
      await fig.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
      onInteract = await page.evaluate(() => document.getAnimations().map(a => `${a.constructor.name}:${a.animationName ?? a.transitionProperty}@${a.effect?.target?.getAttribute?.('data-ch-part') ?? a.effect?.target?.className}`))
    }
    o[rm] = { atLoad: [...new Set(atLoad)], atLoadCount: atLoad.length, onInteract: [...new Set(onInteract)], onInteractCount: onInteract.length }
    await ctx.close()
  }
  // Forced colors
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', forcedColors: 'active', colorScheme: scheme })
    const page = await ctx.newPage()
    await open(page, id, scheme)
    await page.screenshot({ path: `shots/forced-${scheme}-${id}.png`, fullPage: true })
    const fig = page.locator('#storybook-root figure[tabindex="0"], #storybook-root [role=gridcell][tabindex="0"]').first()
    let focus = null
    if (await fig.count()) {
      await fig.focus(); await page.keyboard.press('ArrowRight')
      await page.screenshot({ path: `shots/forced-${scheme}-${id}-focus.png`, fullPage: true })
      focus = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, boxShadow: cs.boxShadow, fca: cs.forcedColorAdjust } })
    }
    const probe = await page.evaluate(() => {
      const pick = (sel, props) => { const els = [...document.querySelectorAll('#storybook-root ' + sel)]; if (!els.length) return null; const vals = new Set(els.map(e => { const cs = getComputedStyle(e); return props.map(p => `${p}=${cs[p]}`).join(' ') })); return { n: els.length, distinct: [...vals].slice(0, 6) } }
      return {
        forced: matchMedia('(forced-colors: active)').matches,
        bar: pick('[data-ch-part="bar"]', ['fill', 'opacity']),
        barDistinctFills: new Set([...document.querySelectorAll('#storybook-root [data-ch-part="bar"]')].map(e => getComputedStyle(e).fill)).size,
        barTones: new Set([...document.querySelectorAll('#storybook-root [data-ch-part="bar"]')].map(e => e.getAttribute('data-ch-tone') + '/' + e.getAttribute('data-ch-fill'))).size,
        dot: pick('[data-ch-part="dot"]', ['fill']),
        line: pick('[data-ch-part="line"]', ['stroke']),
        text: pick('svg text', ['fill']),
        swatch: pick('.ch-swatch', ['backgroundColor', 'backgroundImage']),
        meterFill: pick('.ch-meter-fill', ['backgroundColor', 'backgroundImage']),
        meterTrack: pick('.ch-meter-track', ['backgroundColor']),
        inlineBar: pick('.ch-inline-bar-fill', ['backgroundColor', 'backgroundImage']),
        rangeDot: pick('.ch-range-dot', ['backgroundColor']),
        rangeRing: pick('.ch-range-ring', ['borderTopColor', 'backgroundColor']),
        dotCount: pick('.ch-dot', ['backgroundColor']),
        heatCell: pick('.ch-heatmap-cell', ['backgroundColor', 'boxShadow', 'color']),
        pill: pick('.ch-pill', ['backgroundColor', 'boxShadow', 'borderTopStyle']),
        delta: pick('.ch-delta', ['boxShadow', 'borderTopStyle']),
      }
    })
    o[`forced-${scheme}`] = { focus, probe }
    await ctx.close()
  }
  console.log(id, 'motion load(no-pref/reduce):', o['no-preference'].atLoadCount, '/', o.reduce.atLoadCount, 'interact:', o['no-preference'].onInteractCount, '/', o.reduce.onInteractCount)
}
fs.writeFileSync('motion-forced.json', JSON.stringify(out, null, 1))
await browser.close()
