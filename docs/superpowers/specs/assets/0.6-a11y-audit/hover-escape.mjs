// WCAG 1.4.13: can a hover tooltip be dismissed with Escape without moving the pointer? Is it hoverable?
import { launch, open } from './common.mjs'
const b = await launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
for (const id of ['reference-last-12-weeks--light', 'reference-dallas-installs--light']) {
  await open(p, id, 'light')
  const target = id.includes('dallas') ? p.locator('[data-ch-part="dot"]').first() : p.locator('[data-ch-part="bar-hit"]').nth(3)
  const box = await target.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const tip = p.locator('[data-ch-part="tooltip"]')
  const shown = await tip.count()
  await p.keyboard.press('Escape'); await p.waitForTimeout(100)
  const afterEsc = await tip.count()
  const tb = shown ? await tip.boundingBox() : null
  let afterMoveOnto = null
  if (tb) { await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.waitForTimeout(100); afterMoveOnto = await tip.textContent().catch(() => null) }
  console.log(id, { shown, afterEsc, tooltipBox: tb && { w: Math.round(tb.width), h: Math.round(tb.height) }, afterMoveOnto, focused: await p.evaluate(() => document.activeElement.tagName) })
}
await b.close()
