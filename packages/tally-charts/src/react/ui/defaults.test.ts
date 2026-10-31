import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Pink means loss and is only chosen explicitly. RankedBars' `selectedTone = 'loss'` is not a
// resting default: it colors a bar the user selected.
describe('small pieces defaults', () => {
  it("no component in react/ui defaults a prop to tone = 'loss'", () => {
    const dir = import.meta.dirname
    const offenders = readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.'))
      .filter((f) => readFileSync(join(dir, f), 'utf8').includes("tone = 'loss'"))
    expect(offenders).toEqual([])
  })
})
