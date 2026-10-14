# tally-charts 0.4 Dot Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `tally-charts` 0.4. It adds three charts:
- `DotHistogram`: "158 jobs by margin"
- `StripPlot`: "29 Dallas installs, hours per job"
- `WaffleColumns`: "Profit leaked"

Their building blocks come with them: `thresholds()`, dot binning, strip stacking with medians, waffle packing, the `Dots` mark, a nearest-point pointer layer, and two-dimensional keyboard navigation for stacked dots and rows. The release also closes two 0.3 carry-overs: one strict number rule everywhere, and the stacked `RankedBars` row spacing.

**Architecture:** The 0.1–0.3 layering stays.
- **`core`** gains pure layout functions (`thresholds`, `binDots`, `stackStrip`, `medianOf`, `packWaffle`).
- **`Dots`** draws circles from pixel placements the charts compute inside `<Chart>`. It registers one keyboard/tooltip point per dot, carrying a `group` so the arrow keys can move within a stack or a row.
- **`NearestPointer`** is one transparent layer that activates the registered point nearest the pointer. That's the spec's "dots use the nearest point within a radius". The same layer will serve `LineChart`'s snap-to-x in 0.5.
- **High-level charts** follow the 0.2/0.3 conventions: internal rows wrap the user's datum, `userCallbacks`, a hidden data table, and `children` last.

**Tech Stack:** unchanged. No new dependencies (`d3-array`'s `tickStep` and `median` are already available).

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-design.md`. Reference screenshots:
- `docs/reference/02-jobs-dot-histogram-table.png`, top card (dot histogram)
- `docs/reference/06-drilldown-strip-plot.png`, bottom-left card (strip plot)
- `docs/reference/05-leakage-heatmap.png`, top-left card "Profit leaked" (waffle columns)

This is plan 4 of 6. `main` is at `36b4cf7` with 0.1–0.3 merged. **Execute on a new branch `feat/0.4-dot-charts` from `main`.**

## Global Constraints

**Toolchain and packaging**
- Node `>=22`; `packageManager` is `pnpm@12.4.2`. No new dependencies of any kind.
- Runtime dependencies stay `d3-scale@^4.0.2` (import `scaleBand` only) and `d3-array@^3.2.4`.
- ESM only. `sideEffects: ["*.css"]`. Subpath exports `tally-charts`, `tally-charts/core`, `tally-charts/theme.css`. The main entry keeps its `'use client'` banner; `core` stays React-free.
- Bundle budgets (min+gzip, d3 included): `core` ≤ 8 KB; any single chart ≤ 15 KB. Never raise a budget; report the measured number instead.

**Naming and API surface**
- CSS tokens use the `--ch-` prefix. Part hooks are `data-ch-part`, `data-ch-tone`, `data-ch-fill`. `ch-*` class names are internal.
- Tones: `accent | accent-soft | loss | warn | gain | neutral`.
- Shared prop names (spec §6): `data`, `x`, `y`, `id`, `label`, `series`, `tone`, `format`, `height`, `initialWidth`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`, `className`, `style`.
- High-level charts:
  - render `children` after their own marks
  - render a hidden data table by default (`dataTable`, default `true`)
  - report the user's original objects as `point.datum` via `userCallbacks` (`react/charts/shared.ts`)
- Every exported component has an exported `XxxProps` type. No `any` in the public API.

**Data and formatting**
- Numbers from data go through the strict core `toNumber` (`core/number.ts`): numbers pass, non-blank numeric strings parse, and everything else is missing. That covers `null`, `undefined`, `''`, booleans and objects. From Task 1 on, there is no other coercion rule in the package.
- Default locale `en-US`, currency `USD`. Negative numbers use U+2212 (`−`). Format through `useFormat()` / `ctx.format`.

**Errors and warnings**
- Bad data never throws. Throws are only for programmer errors: a building block outside `<Chart>`, or a malformed `thresholds()` call.
- Development warnings go through `createWarner()` / `ctx.warn`, start with `[tally-charts] `, fire once per key per chart, and every call sits inside `if (DEV) { … }`.
- Spec §7: "Too many dots: dots shrink down to a minimum radius, then warn."

**Accessibility, interaction and motion**
- The chart root is a `<figure>` and a single tab stop. Every hover state is also reachable by keyboard.
- Spec §5:
  - "Arrow keys move through data order (←/→ for x order; ↑/↓ for stacked dots or rows), Home/End jump to the ends, Escape clears, Enter/Space call `onSelect`."
  - "dots use the nearest point within a radius"
  - "the active mark gets emphasis (ring on dots …); other marks dim"
  - "Mount: … dots fade and rise"
- Only hit layers take pointer events: `bar-hit` rects and the new `pointer-layer`. Every other SVG part is in theme.css's shared `pointer-events: none` selector list, and SVG text never takes pointer events.
- `prefers-reduced-motion` and `animate={false}` disable all motion.

**Code style and commits**
- Biome: 2 spaces, single quotes, no semicolons, line width 100. `pnpm format` before every commit. `pnpm lint` must exit 0; 4 `noImportantStyles` warnings and 1 biome info are expected. A pointer-only hit element needs a `biome-ignore lint/a11y/noStaticElementInteractions` comment, with the reason that keyboard access lives on the focusable figure.
- Conventional commit messages, ending with the `Co-Authored-By:` trailer naming the model that wrote the code.
- Commands run from the repo root. Unit tests: `pnpm test`, or `pnpm --filter tally-charts exec vitest run <path>`. The shell is zsh: quote globs.

**Deferred** (not in 0.4): `LineChart`, `Heatmap`, `Band`, `Grid`, point/time scales, docs site.

## Design decisions this plan makes

1. **`thresholds(breaks, tones, labels)`** (spec §3.1, §6) returns `{ bins, indexOf, toneOf, legend }`.
   - `breaks` must be strictly ascending.
   - `tones` and `labels` must each have one more entry than `breaks`. A mismatch is a programmer error and throws.
   - A value below `breaks[0]` falls in bin 0, and a value at or above the last break falls in the last bin.
   - `legend(values)` returns `{ label, tone, count }` items ready for `<Legend shape="dot">`.
2. **Legends are composed by the user.** The charts don't render HTML legends inside the `<figure>`, which is SVG. The README shows `<Legend items={th.legend(values)} shape="dot" />`.
3. **`Dots` takes pixel placements.** The high-level charts compute them inside `<Chart>` from the scales and the core layouts. `Dots` draws the circles, the ring on the active dot and the dimming, and registers the points.
4. **Grouped keyboard navigation.** `ChartPoint.group?: { key: string | number; axis: 'vertical' | 'horizontal' }`. When the active point has a group:
   - **`'vertical'`** (dot stacks): ↑/↓ move within the group (↑ = next, ↓ = previous). ←/→ move to the adjacent group, to the point nearest in y.
   - **`'horizontal'`** (strip rows): ←/→ move within the group. ↑/↓ move to the adjacent group, to the point nearest in x.
   - Points without a group keep the 0.1 behaviour.
5. **`NearestPointer`** is a transparent `<rect data-ch-part="pointer-layer">` over the plot.
   - On pointer move it activates the registered point nearest the pointer, within `radius`. Distance is measured in 2D (`axis: 'xy'`) or along x only (`axis: 'x'`).
   - Moving away from every point clears the active point. A click selects the nearest point.
   - It is one element, so it stays cheap with hundreds of dots.
6. **Waffle columns interact per period, not per dot.** One point per column (anchored at the column top) plus `NearestPointer axis="x"`. The dots of a column share its id, so dimming keeps the whole column lit.
7. **Strip-plot point ids are `` `${series.id}:${rowId}` ``**, because the same datum appears once per series. `point.datum` is still the user's object.

## Review Focus

These failure modes follow from the spec but aren't obviously covered by a feature test. Each one has a pinned test in the task that owns the code.

1. **More dots than fit.** Dots shrink to the minimum radius, the chart warns once, and nothing overflows the plot. Tests: Task 2, "shrinks crowded bins to the minimum radius and flags them", and Task 5, "warns once when the dots don't fit".
2. **Missing or non-numeric values** (`null`, `''`, booleans, strings). No throw, no dot, no `NaN` in the output, and the legend counts only real values. Tests:
   - Task 1, "counts only real values in the legend"
   - Task 5, "skips missing values without throwing"
   - Task 6, "skips missing values per series"
   - Task 7, "draws an empty column for a missing value"
3. **Values outside the domain.** They are clamped into the first or last bin rather than dropped, so the dots still match the legend counts. Test: Task 2, "clamps out-of-domain values into the edge bins".
4. **Arrow keys on stacked dots and rows** move within the stack or row and between neighbours, never stall and never jump to an unrelated dot. Tests: Task 3, "moves within a vertical group and across to the nearest point", and Task 6, "moves along a row and between rows".
5. **Hover between dots or far from them** activates the nearest dot within the radius, and clears the active point otherwise. Tests: Task 4, "activates the nearest point within the radius" and "clears when nothing is near".

---

## File Structure

```
packages/tally-charts/
  src/core/bars.ts, src/core/scale.ts      strict toNumber (carry)              (Task 1)
  src/core/thresholds.ts (+ test)          thresholds()                         (Task 1)
  src/core/dots.ts (+ test)                binDots, stackStrip, medianOf        (Task 2)
  src/core/waffle.ts (+ test)              packWaffle                           (Task 2)
  src/core/index.ts                        exports                              (Tasks 1, 2)
  src/react/types.ts                       ChartPoint.group                     (Task 3)
  src/react/interaction.ts (+ test)        grouped navigation                   (Task 3)
  src/react/marks/Dots.tsx (+ test)        Dots                                 (Task 4)
  src/react/marks/NearestPointer.tsx (+ test)  NearestPointer                   (Task 4)
  src/react/charts/DotHistogram.tsx (+ test)                                    (Task 5)
  src/react/charts/StripPlot.tsx (+ test)                                       (Task 6)
  src/react/charts/WaffleColumns.tsx (+ test)                                   (Task 7)
  src/react/charts/RankedBars.tsx (+ test) stacked spacing (carry)              (Task 8)
  src/theme/theme.css                      dots, ring, pointer layer, median, group labels (Tasks 4–7)
  src/index.ts, src/index.test.ts, .size-limit.json, README.md, test/fixtures.tsx, src/ssr.node.test.tsx (Task 9)
.changeset/tally-charts-0-4.md                                                  (Task 9)
apps/storybook/stories/JobsByMargin.stories.tsx, DallasInstalls.stories.tsx, ProfitLeaked.stories.tsx (Task 10)
apps/storybook/e2e/stories.spec.ts, e2e/__screenshots__/{darwin,linux}/        (Task 10)
```

---
### Task 1: One number rule everywhere, and `thresholds()`

**Files:**
- Modify: `packages/tally-charts/src/core/bars.ts`
- Modify: `packages/tally-charts/src/core/scale.ts`
- Test: `packages/tally-charts/src/core/bars.test.ts`, `packages/tally-charts/src/core/scale.test.ts`
- Create: `packages/tally-charts/src/core/thresholds.ts`
- Test: `packages/tally-charts/src/core/thresholds.test.ts`
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.test.ts`

**Interfaces:**
- Consumes: `toNumber(raw: unknown): number` from `core/number.ts` (0.3).
- Produces:
  - `core/bars.ts` and `core/scale.ts` coerce through `toNumber`, and their local loose `toNumber` helpers are deleted.
  - `interface ThresholdBin { label: string; tone: Tone; min: number; max: number }`
  - `interface ThresholdLegendItem { label: string; tone: Tone; count: number }`
  - `interface Thresholds { bins: ThresholdBin[]; indexOf(value: unknown): number; toneOf(value: unknown): Tone | undefined; legend(values: readonly unknown[]): ThresholdLegendItem[] }`
  - `thresholds(breaks: readonly number[], tones: readonly Tone[], labels: readonly string[]): Thresholds`

- [ ] **Step 1: Write the failing tests**

Append to `packages/tally-charts/src/core/bars.test.ts` (inside the existing top-level `describe('computeBars', …)`):

```ts
  it('skips blank and boolean values as missing', () => {
    const rows = [
      { k: 'a', v: '' as unknown as number },
      { k: 'b', v: true as unknown as number },
      { k: 'c', v: 5 },
    ]
    const { bars } = layout(rows, [0, 10])
    expect(bars.map((b) => b.category)).toEqual(['c'])
  })
```

Append to `packages/tally-charts/src/core/scale.test.ts`, inside its top-level `describe`:

```ts
  it('leaves blank and boolean values out of an inferred domain', () => {
    const rows = [{ v: '' }, { v: false }, { v: 5 }, { v: 10 }]
    const scale = createScale<{ v: unknown }>({ field: 'v', zero: false, nice: false }, rows, 'y', 100, () => {})
    expect(scale.kind === 'linear' && scale.scale.domain()).toEqual([5, 10])
  })
```

If `scale.test.ts` uses a different `describe` name or helper, keep this test's body and put it next to the other `createScale` tests.

Create `packages/tally-charts/src/core/thresholds.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { thresholds } from './thresholds'

const margin = () =>
  thresholds(
    [10, 25, 38],
    ['loss', 'warn', 'accent-soft', 'gain'],
    ['Critical', 'At risk', 'Below target', 'On target'],
  )

describe('thresholds', () => {
  it('puts each value in the bin whose range holds it', () => {
    const th = margin()
    expect([5, 10, 24.9, 25, 38, 60].map((v) => th.indexOf(v))).toEqual([0, 1, 1, 2, 3, 3])
    expect(th.toneOf(12.3)).toBe('warn')
    expect(th.toneOf('40')).toBe('gain')
  })

  it('describes each bin with open ends', () => {
    const { bins } = margin()
    expect(bins[0]).toEqual({ label: 'Critical', tone: 'loss', min: -Infinity, max: 10 })
    expect(bins[3]).toEqual({ label: 'On target', tone: 'gain', min: 38, max: Infinity })
  })

  it('counts only real values in the legend', () => {
    const th = margin()
    expect(th.indexOf(null)).toBe(-1)
    expect(th.indexOf('')).toBe(-1)
    expect(th.toneOf(Number.NaN)).toBeUndefined()
    expect(th.legend([3, 12, 30, 40, 45, null, 'x', true])).toEqual([
      { label: 'Critical', tone: 'loss', count: 1 },
      { label: 'At risk', tone: 'warn', count: 1 },
      { label: 'Below target', tone: 'accent-soft', count: 1 },
      { label: 'On target', tone: 'gain', count: 2 },
    ])
  })

  it('throws on a malformed spec', () => {
    expect(() => thresholds([10], ['loss'], ['A'])).toThrow(/one more tone/)
    expect(() => thresholds([10], ['loss', 'gain'], ['A'])).toThrow(/one more tone/)
    expect(() => thresholds([20, 10], ['loss', 'warn', 'gain'], ['A', 'B', 'C'])).toThrow(
      /ascending/,
    )
    expect(() => thresholds([Number.NaN], ['loss', 'gain'], ['A', 'B'])).toThrow(/ascending/)
  })
})
```

In `packages/tally-charts/src/index.test.ts`, add `'thresholds'` to the `'core exports %s'` list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core src/index.test.ts`
Expected: FAIL.
- The `''` and `true` rows draw bars today: `Number('')` is 0 and `Number(true)` is 1.
- The inferred domain includes 0.
- `./thresholds` is missing.

- [ ] **Step 3: Use the strict rule in bars and scales**

In `packages/tally-charts/src/core/bars.ts`, delete the local `function toNumber(raw: unknown): number { … }` and add `import { toNumber } from './number'`. In `packages/tally-charts/src/core/scale.ts`, delete its local `toNumber` and add the same import.

- [ ] **Step 4: Implement `thresholds`**

Create `packages/tally-charts/src/core/thresholds.ts`:

```ts
import { toNumber } from './number'
import type { Tone } from './types'

export interface ThresholdBin {
  label: string
  tone: Tone
  /** Inclusive lower bound; -Infinity for the first bin. */
  min: number
  /** Exclusive upper bound; Infinity for the last bin. */
  max: number
}

export interface ThresholdLegendItem {
  label: string
  tone: Tone
  count: number
}

export interface Thresholds {
  bins: ThresholdBin[]
  /** Bin index for a value, or -1 when it is missing or not a number. */
  indexOf(value: unknown): number
  toneOf(value: unknown): Tone | undefined
  /** Legend entries with counts, ready for `<Legend shape="dot" items={…} />`. */
  legend(values: readonly unknown[]): ThresholdLegendItem[]
}

/**
 * Threshold categories: values below `breaks[0]` are bin 0, values at or above the last break
 * are the last bin. A malformed spec is a programmer error and throws.
 */
export function thresholds(
  breaks: readonly number[],
  tones: readonly Tone[],
  labels: readonly string[],
): Thresholds {
  if (tones.length !== breaks.length + 1 || labels.length !== tones.length) {
    throw new Error('[tally-charts] thresholds() needs one more tone and label than breaks.')
  }
  breaks.forEach((b, i) => {
    const prev = breaks[i - 1]
    if (!Number.isFinite(b) || (prev !== undefined && !(b > prev))) {
      throw new Error('[tally-charts] thresholds() needs finite, strictly ascending breaks.')
    }
  })
  const bins: ThresholdBin[] = tones.map((tone, i) => ({
    label: labels[i] ?? '',
    tone,
    min: i === 0 ? Number.NEGATIVE_INFINITY : (breaks[i - 1] as number),
    max: i === breaks.length ? Number.POSITIVE_INFINITY : (breaks[i] as number),
  }))
  const indexOf = (value: unknown): number => {
    const v = toNumber(value)
    if (!Number.isFinite(v)) return -1
    const i = breaks.findIndex((b) => v < b)
    return i === -1 ? breaks.length : i
  }
  return {
    bins,
    indexOf,
    toneOf: (value) => bins[indexOf(value)]?.tone,
    legend: (values) => {
      const counts = bins.map(() => 0)
      for (const value of values) {
        const i = indexOf(value)
        if (i >= 0) counts[i] = (counts[i] ?? 0) + 1
      }
      return bins.map((bin, i) => ({ label: bin.label, tone: bin.tone, count: counts[i] ?? 0 }))
    },
  }
}
```

In `packages/tally-charts/src/core/index.ts`, add, keeping alphabetical-by-path order:

```ts
export type { ThresholdBin, ThresholdLegendItem, Thresholds } from './thresholds'
export { thresholds } from './thresholds'
```

`bins[-1]` is `undefined`, so `toneOf` returns `undefined` for missing values without a branch.

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS. If an existing test relied on `''` or a boolean drawing a bar, report it: that behaviour is now intentionally gone. Don't loosen the rule.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat(core): one strict number rule and thresholds()"
```

---

### Task 2: Core dot layouts: bins, strips, medians, waffles

**Files:**
- Create: `packages/tally-charts/src/core/dots.ts`
- Test: `packages/tally-charts/src/core/dots.test.ts`
- Create: `packages/tally-charts/src/core/waffle.ts`
- Test: `packages/tally-charts/src/core/waffle.test.ts`
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.test.ts`

**Interfaces:**
- Consumes: `LinearScale`/`linearScale` (`core/linear.ts`), `toNumber`.
- Produces:
  - `binDots(input: DotBinInput): DotBinLayout`. The input is `{ values, x, binWidth, baseline, top, maxRadius?, minRadius?, gap? }`; the result is `{ dots: BinnedDot[]; radius: number; crowded: boolean }`, where `BinnedDot` is `{ index, value, bin, stack, cx, cy }`.
    - Dots are sorted by bin, then value, then index. `stack` 0 is the bottom.
    - Out-of-domain values go into the edge bins.
    - The radius is `min(maxRadius, binPx/2 − gap/2, (baseline−top)/tallest/2 − gap/2)`. When that is below `minRadius`, the radius is `minRadius` and `crowded` is `true`.
  - `stackStrip(input: StripInput): StripDot[]`. The input is `{ values, x, baseline, radius, gap? }`; each `StripDot` is `{ index, value, level, cx, cy }`.
    - Dots are sorted by x, and each takes the lowest level where it doesn't overlap the previous dot on that level.
  - `medianOf(values: readonly unknown[]): number`, which is `NaN` when there are no real values.
  - `packWaffle(counts: readonly unknown[], wide?: number): WaffleLayout`. The result is `{ cells: WaffleCell[]; maxRows: number }`, where `WaffleCell` is `{ column, dot, col, row }`.
    - Counts are rounded and bad counts draw nothing.
    - Each column fills bottom-up, `wide` dots across. The default `wide` is 2.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/core/dots.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { binDots, medianOf, stackStrip } from './dots'
import { linearScale } from './linear'

// 0–10 over 0–100px: 10px per unit.
const x = linearScale([0, 10], [0, 100])

describe('binDots', () => {
  it('stacks values per bin from the baseline up, sorted by bin then value', () => {
    const layout = binDots({
      values: [0.5, 0.7, 3.2, null, 'x', 12, -1],
      x,
      binWidth: 1,
      baseline: 100,
      top: 0,
    })
    // Bins are 10px wide: radius = min(6, 10/2 − 1, 100/3/2 − 1) = 4.
    expect(layout.radius).toBe(4)
    expect(layout.crowded).toBe(false)
    expect(layout.dots.map((d) => [d.index, d.bin, d.stack])).toEqual([
      [6, 0, 0],
      [0, 0, 1],
      [1, 0, 2],
      [2, 3, 0],
      [5, 9, 0],
    ])
    expect(layout.dots[0]).toMatchObject({ cx: 5, cy: 96 })
    expect(layout.dots[1]).toMatchObject({ cy: 86 })
    expect(layout.dots[3]).toMatchObject({ cx: 35 })
  })

  it('clamps out-of-domain values into the edge bins', () => {
    const { dots } = binDots({ values: [-5, 15], x, binWidth: 1, baseline: 100, top: 0 })
    expect(dots.map((d) => d.bin)).toEqual([0, 9])
    expect(dots.map((d) => d.cx)).toEqual([5, 95])
  })

  it('shrinks crowded bins to the minimum radius and flags them', () => {
    const layout = binDots({
      values: Array.from({ length: 30 }, () => 0.5),
      x,
      binWidth: 1,
      baseline: 100,
      top: 0,
    })
    expect(layout.crowded).toBe(true)
    expect(layout.radius).toBe(2)
  })

  it('falls back to a fortieth of the domain for a bad bin width', () => {
    const { dots } = binDots({ values: [0.3, 0.1], x, binWidth: 0, baseline: 100, top: 0 })
    // Width 0.25: 0.1 → bin 0, 0.3 → bin 1.
    expect(dots.map((d) => d.bin)).toEqual([0, 1])
  })
})

describe('stackStrip', () => {
  it('places dots at their value and lifts the ones that would overlap', () => {
    const dots = stackStrip({ values: [1, 1.5, 3, 1.2, null], x, baseline: 50, radius: 4, gap: 1 })
    // Step 9px: x = 10, 12, 15 collide; 30 has room on the bottom level.
    expect(dots.map((d) => [d.index, d.level, d.cx, d.cy])).toEqual([
      [0, 0, 10, 46],
      [3, 1, 12, 37],
      [1, 2, 15, 28],
      [2, 0, 30, 46],
    ])
  })
})

describe('medianOf', () => {
  it('takes the middle real value', () => {
    expect(medianOf([3, 1, 2])).toBe(2)
    expect(medianOf([4, 1, 2, 3])).toBe(2.5)
    expect(medianOf([null, '', true, 5])).toBe(5)
    expect(Number.isNaN(medianOf([]))).toBe(true)
  })
})
```

Create `packages/tally-charts/src/core/waffle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { packWaffle } from './waffle'

describe('packWaffle', () => {
  it('fills each column bottom-up, two dots across', () => {
    const { cells, maxRows } = packWaffle([3, 0, 5, null, -2, 2.6])
    expect(cells.filter((c) => c.column === 0).map((c) => [c.col, c.row])).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ])
    expect(cells.filter((c) => c.column === 2)).toHaveLength(5)
    expect(cells.filter((c) => c.column === 5)).toHaveLength(3)
    expect(cells.filter((c) => [1, 3, 4].includes(c.column))).toHaveLength(0)
    expect(maxRows).toBe(3)
  })

  it('honours a different width and ignores a bad one', () => {
    expect(packWaffle([6], 3).maxRows).toBe(2)
    expect(packWaffle([6], Number.NaN).maxRows).toBe(3)
  })
})
```

In `packages/tally-charts/src/index.test.ts`, add `'binDots'`, `'stackStrip'`, `'medianOf'` and `'packWaffle'` to the `'core exports %s'` list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/dots.test.ts src/core/waffle.test.ts src/index.test.ts`
Expected: FAIL; the modules are missing.

- [ ] **Step 3: Implement the dot layouts**

Create `packages/tally-charts/src/core/dots.ts`:

```ts
import type { LinearScale } from './linear'
import { toNumber } from './number'

export interface DotBinInput {
  values: readonly unknown[]
  x: LinearScale
  /** Bin width in data units. A missing or non-positive width falls back to a fortieth of the domain. */
  binWidth: number
  /** y of the stacks' bottom edge, in px. */
  baseline: number
  /** Highest y the tallest stack may reach, in px. */
  top: number
  /** Default 6. */
  maxRadius?: number
  /** Default 2. */
  minRadius?: number
  /** Space between dots in px. Default 2. */
  gap?: number
}

export interface BinnedDot {
  /** Index in `values`. */
  index: number
  value: number
  bin: number
  /** 0 is the bottom of the stack. */
  stack: number
  cx: number
  cy: number
}

export interface DotBinLayout {
  dots: BinnedDot[]
  radius: number
  /** True when the dots had to shrink to `minRadius`; the stacks then compress so dots overlap and the plot never overflows. */
  crowded: boolean
}

function clampTo(scale: LinearScale) {
  const [r0, r1] = scale.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  return (px: number) => Math.min(hi, Math.max(lo, px))
}

/** One dot per value, binned on x and stacked upward (dot histograms). */
export function binDots(input: DotBinInput): DotBinLayout {
  const { x, baseline, top } = input
  const maxRadius = input.maxRadius ?? 6
  const minRadius = input.minRadius ?? 2
  const gap = input.gap ?? 2
  const [d0, d1] = x.domain()
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)
  const width =
    Number.isFinite(input.binWidth) && input.binWidth > 0 ? input.binWidth : (hi - lo) / 40 || 1
  const binCount = Math.max(1, Math.ceil((hi - lo) / width))
  const items = input.values.flatMap((raw, index) => {
    const value = toNumber(raw)
    if (!Number.isFinite(value)) return []
    const bin = Math.min(binCount - 1, Math.max(0, Math.floor((value - lo) / width)))
    return [{ index, value, bin }]
  })
  items.sort((a, b) => a.bin - b.bin || a.value - b.value || a.index - b.index)
  const heights = new Map<number, number>()
  const stacked = items.map((item) => {
    const stack = heights.get(item.bin) ?? 0
    heights.set(item.bin, stack + 1)
    return { ...item, stack }
  })
  const tallest = Math.max(0, ...heights.values())
  const binPx = Math.abs(x(lo + width) - x(lo))
  const fitX = binPx / 2 - gap / 2
  const fitY = tallest > 0 ? Math.abs(baseline - top) / tallest / 2 - gap / 2 : maxRadius
  const ideal = Math.min(maxRadius, fitX, fitY)
  const crowded = !(ideal >= minRadius)
  const radius = crowded ? minRadius : ideal
  const clamp = clampTo(x)
  return {
    radius,
    crowded,
    dots: stacked.map((d) => ({
      index: d.index,
      value: d.value,
      bin: d.bin,
      stack: d.stack,
      cx: clamp(x(lo + (d.bin + 0.5) * width)),
      cy: baseline - radius - d.stack * (2 * radius + gap),
    })),
  }
}

export interface StripInput {
  values: readonly unknown[]
  x: LinearScale
  /** y of the row's bottom edge, in px. */
  baseline: number
  radius: number
  /** Space between dots in px. Default 1. */
  gap?: number
}

export interface StripDot {
  index: number
  value: number
  /** 0 is the bottom level. */
  level: number
  cx: number
  cy: number
}

/** One dot per value at its exact x, lifted to the lowest level where it doesn't overlap. */
export function stackStrip({ values, x, baseline, radius, gap = 1 }: StripInput): StripDot[] {
  const clamp = clampTo(x)
  const items = values.flatMap((raw, index) => {
    const value = toNumber(raw)
    return Number.isFinite(value) ? [{ index, value, cx: clamp(x(value)) }] : []
  })
  items.sort((a, b) => a.cx - b.cx || a.index - b.index)
  const step = 2 * radius + gap
  const lastOnLevel: number[] = []
  return items.map((item) => {
    let level = lastOnLevel.findIndex((cx) => item.cx - cx >= step)
    if (level === -1) level = lastOnLevel.length
    lastOnLevel[level] = item.cx
    return { ...item, level, cy: baseline - radius - level * step }
  })
}

/** Median of the real values; NaN when there are none. */
export function medianOf(values: readonly unknown[]): number {
  const sorted = values
    .map(toNumber)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (sorted.length === 0) return Number.NaN
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}
```

Create `packages/tally-charts/src/core/waffle.ts`:

```ts
import { toNumber } from './number'

export interface WaffleCell {
  /** Index of the column (period) in `counts`. */
  column: number
  /** Index of the dot inside its column. */
  dot: number
  /** Position across the column, 0 … wide − 1. */
  col: number
  /** 0 is the bottom row. */
  row: number
}

export interface WaffleLayout {
  cells: WaffleCell[]
  /** Rows in the tallest column. */
  maxRows: number
}

/** Dot cells per column, filled bottom-up `wide` across. Counts are rounded; bad counts draw nothing. */
export function packWaffle(counts: readonly unknown[], wide = 2): WaffleLayout {
  const across = Number.isFinite(wide) && wide >= 1 ? Math.floor(wide) : 2
  const cells: WaffleCell[] = []
  let maxRows = 0
  counts.forEach((raw, column) => {
    const n = toNumber(raw)
    const count = Number.isFinite(n) && n > 0 ? Math.round(n) : 0
    for (let dot = 0; dot < count; dot++) {
      cells.push({ column, dot, col: dot % across, row: Math.floor(dot / across) })
    }
    maxRows = Math.max(maxRows, Math.ceil(count / across))
  })
  return { cells, maxRows }
}
```

In `packages/tally-charts/src/core/index.ts`, add, keeping alphabetical-by-path order:

```ts
export type { BinnedDot, DotBinInput, DotBinLayout, StripDot, StripInput } from './dots'
export { binDots, medianOf, stackStrip } from './dots'
export type { WaffleCell, WaffleLayout } from './waffle'
export { packWaffle } from './waffle'
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm size`
Expected: PASS, with `core` still ≤ 8 KB. Record the size.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat(core): dot binning, strip stacking, medians and waffle packing"
```

---

### Task 3: Grouped keyboard navigation

**Files:**
- Modify: `packages/tally-charts/src/react/types.ts`
- Modify: `packages/tally-charts/src/react/interaction.ts`
- Test: `packages/tally-charts/src/react/interaction.test.tsx`
- Modify: `packages/tally-charts/src/index.ts`

**Interfaces:**
- Produces:
  - `interface PointGroup { key: string | number; axis: 'vertical' | 'horizontal' }`
  - `ChartPoint.group?: PointGroup`. `samePoints` compares it too.
  - `navigate(points, currentId, key)` gains grouped behaviour, per design decision 4.
  - `PointGroup` is exported from the main entry.

- [ ] **Step 1: Write the failing tests**

Append to `packages/tally-charts/src/react/interaction.test.tsx`:

```tsx
describe('navigate with groups', () => {
  const at = (
    id: string,
    x: number,
    y: number,
    key: string,
    axis: 'vertical' | 'horizontal',
  ): ChartPoint => ({
    id,
    index: 0,
    datum: null,
    x,
    y,
    label: id,
    segments: [],
    group: { key, axis },
  })
  // Two stacks: A at x 0 (y 90, 80, 70), B at x 10 (y 90, 80).
  const stacks = [
    at('a0', 0, 90, 'A', 'vertical'),
    at('a1', 0, 80, 'A', 'vertical'),
    at('a2', 0, 70, 'A', 'vertical'),
    at('b0', 10, 90, 'B', 'vertical'),
    at('b1', 10, 80, 'B', 'vertical'),
  ]
  // Two rows: R at y 50 (x 0, 10, 20), S at y 100 (x 5, 18).
  const rows = [
    at('r0', 0, 50, 'R', 'horizontal'),
    at('r1', 10, 50, 'R', 'horizontal'),
    at('r2', 20, 50, 'R', 'horizontal'),
    at('s0', 5, 100, 'S', 'horizontal'),
    at('s1', 18, 100, 'S', 'horizontal'),
  ]

  it('moves within a vertical group and across to the nearest point', () => {
    expect(navigate(stacks, 'a0', 'ArrowUp')).toBe('a1')
    expect(navigate(stacks, 'a1', 'ArrowDown')).toBe('a0')
    expect(navigate(stacks, 'a2', 'ArrowUp')).toBe('a2')
    expect(navigate(stacks, 'a2', 'ArrowRight')).toBe('b1')
    expect(navigate(stacks, 'b0', 'ArrowLeft')).toBe('a0')
    expect(navigate(stacks, 'b1', 'ArrowRight')).toBe('b1')
  })

  it('moves along a horizontal group and between groups by x', () => {
    expect(navigate(rows, 'r1', 'ArrowRight')).toBe('r2')
    expect(navigate(rows, 'r0', 'ArrowLeft')).toBe('r0')
    expect(navigate(rows, 'r2', 'ArrowDown')).toBe('s1')
    expect(navigate(rows, 's0', 'ArrowUp')).toBe('r0')
    expect(navigate(rows, 's0', 'ArrowDown')).toBe('s0')
  })

  it('keeps Home, End and the first step unchanged', () => {
    expect(navigate(stacks, null, 'ArrowRight')).toBe('a0')
    expect(navigate(stacks, 'a1', 'Home')).toBe('a0')
    expect(navigate(stacks, 'a1', 'End')).toBe('b1')
  })

  it('treats a changed group as a different point', () => {
    const a = stacks.slice(0, 1)
    const moved = [{ ...(a[0] as ChartPoint), group: { key: 'B', axis: 'vertical' as const } }]
    expect(samePoints(a, moved)).toBe(false)
  })
})
```

`samePoints` is already imported in that file (0.2). If it isn't, add it to the import from `./interaction`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/interaction.test.tsx`
Expected: FAIL. There's no `group` field yet: `ArrowUp` from `a0` goes to the previous point in the 0.1 behaviour, and `samePoints` ignores groups.

- [ ] **Step 3: Implement**

In `packages/tally-charts/src/react/types.ts`, add before `ChartPoint`:

```ts
/** Where a point sits in a stack (vertical) or a row (horizontal), for 2-D arrow keys. */
export interface PointGroup {
  key: string | number
  axis: 'vertical' | 'horizontal'
}
```

and add to `ChartPoint`:

```ts
  /** Stack or row membership; arrow keys move within and across groups when set. */
  group?: PointGroup
```

In `packages/tally-charts/src/react/interaction.ts`:
- Change the type import to include `PointGroup`.
- Add above `navigate`:

```ts
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/**
 * Arrow keys for a point in a group. Vertical groups (stacks) move with ↑/↓ inside the stack
 * and ←/→ to the neighbouring stack; horizontal groups (rows) the other way round. Moving
 * across lands on the neighbour's point nearest along the group's own axis.
 */
function navigateGroup(
  points: readonly ChartPoint[],
  current: ChartPoint,
  group: PointGroup,
  key: string,
): Id {
  const vertical = group.axis === 'vertical'
  const along = vertical
    ? key === 'ArrowUp' || key === 'ArrowDown'
    : key === 'ArrowLeft' || key === 'ArrowRight'
  const forward = vertical
    ? along
      ? key === 'ArrowUp'
      : key === 'ArrowRight'
    : along
      ? key === 'ArrowRight'
      : key === 'ArrowDown'
  if (along) {
    const members = points.filter((p) => p.group?.key === group.key)
    const i = members.findIndex((p) => p.id === current.id)
    const next = members[forward ? Math.min(i + 1, members.length - 1) : Math.max(i - 1, 0)]
    return (next ?? current).id
  }
  const keys: (string | number)[] = []
  for (const p of points) {
    const k = p.group?.key
    if (k !== undefined && !keys.includes(k)) keys.push(k)
  }
  const target = keys[keys.indexOf(group.key) + (forward ? 1 : -1)]
  if (target === undefined) return current.id
  let best: ChartPoint | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const p of points) {
    if (p.group?.key !== target) continue
    const distance = vertical ? Math.abs(p.y - current.y) : Math.abs(p.x - current.x)
    if (distance < bestDistance) {
      best = p
      bestDistance = distance
    }
  }
  return (best ?? current).id
}
```

- In `navigate`, after `const index = …`, add:

```ts
  const current = index >= 0 ? points[index] : undefined
  if (current?.group && ARROWS.has(key)) return navigateGroup(points, current, current.group, key)
```

- In `samePoints`, add to the condition:

```ts
      p.group?.key === q.group?.key &&
      p.group?.axis === q.group?.axis &&
```

In `packages/tally-charts/src/index.ts`, change the `./react/types` type export to `export type { ActiveSource, ChartPoint, PointGroup, TooltipSegment } from './react/types'`.

When the key can't move (an edge), `navigate` returns the current id. The chart still calls `preventDefault`, so the page doesn't scroll, and `setActive` with the same id changes nothing.

- [ ] **Step 4: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS. All existing navigation tests are unchanged, because points without `group` keep the 0.1 behaviour.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: arrow keys move within and across stacks and rows"
```

---

### Task 4: `Dots` and `NearestPointer`

**Files:**
- Create: `packages/tally-charts/src/react/marks/Dots.tsx`
- Test: `packages/tally-charts/src/react/marks/Dots.test.tsx`
- Create: `packages/tally-charts/src/react/marks/NearestPointer.tsx`
- Test: `packages/tally-charts/src/react/marks/NearestPointer.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Test: `packages/tally-charts/src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `useChart` (`ctx.points`, `ctx.activeId`, `ctx.dimInactive`, `ctx.setActive`, `ctx.select`, `ctx.selectable`, `ctx.innerWidth/innerHeight`), `useRegisterPoints`, `PointGroup` (Task 3).
- Produces:
  - `interface DotItem { key: string; id: Id; datum: unknown; cx: number; cy: number; tone: Tone; soft?: boolean; label: string; segments?: TooltipSegment[]; group?: PointGroup }`
  - `interface DotsProps { dots: readonly DotItem[]; radius: number; interactive?: boolean }`
  - `Dots(props)` renders `<g data-ch-part="dots">`, one `<circle data-ch-part="dot">` per dot, and a `<circle data-ch-part="dot-ring">` around the active dot when interactive. When interactive, it registers one point per dot, at the dot's top, with the dot's `group`.
  - `interface NearestPointerProps { radius?: number; axis?: 'xy' | 'x' }`
  - `NearestPointer(props)` renders `<rect data-ch-part="pointer-layer">` over the plot. On pointer move it activates the registered point nearest the pointer within `radius` (default 24, ties go to the first), or clears the active point. On click it selects the nearest point.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/marks/Dots.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Dots, type DotItem } from './Dots'

const items: DotItem[] = [
  { key: 'a', id: 'a', datum: null, cx: 10, cy: 90, tone: 'loss', label: 'Job A' },
  { key: 'b', id: 'b', datum: null, cx: 30, cy: 90, tone: 'gain', soft: true, label: 'Job B' },
]

function renderDots(chart: Partial<ChartProps<unknown>> = {}, interactive = true) {
  return render(
    <Chart
      width={100}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ domain: [0, 1] }}
      y={{ domain: [0, 1] }}
      animate={false}
      {...chart}
    >
      <Dots dots={items} radius={4} interactive={interactive} />
    </Chart>,
  )
}

const dots = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="dot"]')]

describe('<Dots>', () => {
  it('draws one toned circle per dot', () => {
    const { container } = renderDots()
    const [a, b] = dots(container)
    expect(dots(container)).toHaveLength(2)
    expect(a).toHaveAttribute('cx', '10')
    expect(a).toHaveAttribute('r', '4')
    expect(a).toHaveAttribute('data-ch-tone', 'loss')
    expect(a).toHaveStyle({ fill: 'var(--ch-loss)' })
    expect(b).toHaveAttribute('data-ch-soft', 'true')
    expect(b?.getAttribute('style')).toContain('color-mix')
  })

  it('registers a point per dot for the keyboard', () => {
    const { container } = renderDots()
    fireEvent.keyDown(container.querySelector('figure') as Element, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Job A')
  })

  it('registers nothing when not interactive', () => {
    const { container } = renderDots({}, false)
    fireEvent.keyDown(container.querySelector('figure') as Element, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')?.textContent).toBe('')
    expect(container.querySelector('[data-ch-part="dot-ring"]')).toBeNull()
  })

  it('rings the active dot and dims the others', () => {
    const { container } = renderDots({ activeId: 'b' })
    const ring = container.querySelector('[data-ch-part="dot-ring"]')
    expect(ring).toHaveAttribute('cx', '30')
    expect(ring).toHaveAttribute('r', '7')
    expect(dots(container)[0]).toHaveAttribute('data-ch-dimmed', 'true')
    expect(dots(container)[1]).toHaveAttribute('data-ch-active', 'true')
  })
})
```

Create `packages/tally-charts/src/react/marks/NearestPointer.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../../core/types'
import { Chart, type ChartProps } from '../Chart'
import { useChart } from '../context'
import { useRegisterPoints } from '../useRegisterPoints'
import { NearestPointer, type NearestPointerProps } from './NearestPointer'

function Points({ at }: { at: [Id, number, number][] }) {
  const ctx = useChart('Points')
  useRegisterPoints(
    ctx,
    at.map(([id, x, y], index) => ({ id, index, datum: null, x, y, label: String(id), segments: [] })),
  )
  return null
}

function renderLayer(props: NearestPointerProps = {}, chart: Partial<ChartProps<unknown>> = {}) {
  return render(
    <Chart
      width={200}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ domain: [0, 1] }}
      y={{ domain: [0, 1] }}
      {...chart}
    >
      <Points
        at={[
          ['a', 20, 20],
          ['b', 80, 80],
        ]}
      />
      <NearestPointer {...props} />
    </Chart>,
  )
}

const layer = (root: HTMLElement) =>
  root.querySelector('[data-ch-part="pointer-layer"]') as Element

describe('<NearestPointer>', () => {
  it('covers the plot', () => {
    const { container } = renderLayer()
    expect(layer(container)).toHaveAttribute('width', '200')
    expect(layer(container)).toHaveAttribute('height', '100')
  })

  it('activates the nearest point within the radius', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLayer({}, { onActiveChange })
    // jsdom's bounding box is at 0,0, so client coordinates are plot coordinates.
    fireEvent.pointerMove(layer(container), { clientX: 25, clientY: 22 })
    expect(onActiveChange).toHaveBeenLastCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('clears when nothing is near', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLayer({}, { onActiveChange })
    fireEvent.pointerMove(layer(container), { clientX: 25, clientY: 22 })
    fireEvent.pointerMove(layer(container), { clientX: 50, clientY: 50 })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('measures only along x on request', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLayer({ axis: 'x' }, { onActiveChange })
    fireEvent.pointerMove(layer(container), { clientX: 78, clientY: 5 })
    expect(onActiveChange).toHaveBeenLastCalledWith('b', expect.objectContaining({ id: 'b' }))
  })

  it('selects the nearest point on click and is selectable only with onSelect', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderLayer({}, { onSelect })
    expect(layer(container)).toHaveAttribute('data-ch-selectable', 'true')
    fireEvent.click(layer(container), { clientX: 79, clientY: 81 })
    expect(onSelect).toHaveBeenCalledWith('b', expect.objectContaining({ id: 'b' }))
    unmount()
    const plain = renderLayer()
    expect(layer(plain.container)).not.toHaveAttribute('data-ch-selectable')
  })
})
```

In `packages/tally-charts/src/theme/theme.test.ts`, extend the 0.3 pointer-events assertion so it also requires `[data-ch-part="dot"]` and `[data-ch-part="dot-ring"]` in the shared `pointer-events: none` selector list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks src/theme`
Expected: FAIL; the modules and CSS are missing.

- [ ] **Step 3: Implement `Dots`**

Create `packages/tally-charts/src/react/marks/Dots.tsx`:

```tsx
import { useMemo } from 'react'
import type { Id, Tone } from '../../core/types'
import { useChart } from '../context'
import type { ChartPoint, PointGroup, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'

export interface DotItem {
  /** Unique React key. */
  key: string
  /** Point id for activation, selection and dimming; dots sharing an id light up together. */
  id: Id
  datum: unknown
  cx: number
  cy: number
  tone: Tone
  /** Lighter fill, e.g. for periods that aren't the peak. Default false. */
  soft?: boolean
  /** Screen-reader text and default tooltip. */
  label: string
  segments?: TooltipSegment[]
  /** Stack or row for the arrow keys. */
  group?: PointGroup
}

export interface DotsProps {
  dots: readonly DotItem[]
  radius: number
  /** Register a point per dot. Set false when another layer registers the points. Default true. */
  interactive?: boolean
}

const NO_POINTS: ChartPoint[] = []
/** Share of the tone in a soft dot; the rest is the surface colour. */
const SOFT_MIX = 45

/** Circles at given plot positions, with a ring on the active one and dimming for the rest. */
export function Dots({ dots, radius, interactive = true }: DotsProps) {
  const ctx = useChart('Dots')
  const r = Math.max(0, radius)
  const points = useMemo(
    () =>
      dots.map(
        (d, index): ChartPoint => ({
          id: d.id,
          index,
          datum: d.datum,
          x: d.cx,
          y: d.cy - r,
          label: d.label,
          segments: d.segments ?? [{ value: d.label }],
          group: d.group,
        }),
      ),
    [dots, r],
  )
  useRegisterPoints(ctx, interactive ? points : NO_POINTS)
  const dimming = ctx.dimInactive && ctx.activeId !== null
  const active = interactive ? dots.find((d) => d.id === ctx.activeId) : undefined
  return (
    <g data-ch-part="dots">
      {dots.map((d) => {
        const on = d.id === ctx.activeId
        return (
          <circle
            key={d.key}
            data-ch-part="dot"
            data-ch-tone={d.tone}
            data-ch-soft={d.soft ? 'true' : undefined}
            data-ch-active={on ? 'true' : undefined}
            data-ch-dimmed={dimming && !on ? 'true' : undefined}
            cx={d.cx}
            cy={d.cy}
            r={r}
            style={{
              fill: d.soft
                ? `color-mix(in srgb, var(--ch-${d.tone}) ${SOFT_MIX}%, var(--ch-surface))`
                : `var(--ch-${d.tone})`,
            }}
          />
        )
      })}
      {active ? (
        <circle
          data-ch-part="dot-ring"
          data-ch-tone={active.tone}
          cx={active.cx}
          cy={active.cy}
          r={r + 3}
          style={{ stroke: `var(--ch-${active.tone})` }}
        />
      ) : null}
    </g>
  )
}
```

- [ ] **Step 4: Implement `NearestPointer`**

Create `packages/tally-charts/src/react/marks/NearestPointer.tsx`:

```tsx
import { useChart } from '../context'
import type { ChartPoint } from '../types'

export interface NearestPointerProps {
  /** Largest distance in px that still activates a point. Default 24. */
  radius?: number
  /** 'xy' measures straight-line distance; 'x' only the horizontal distance (columns). Default 'xy'. */
  axis?: 'xy' | 'x'
}

interface PointerLike {
  clientX: number
  clientY: number
  currentTarget: Element
}

/** One transparent layer over the plot that activates the registered point nearest the pointer. */
export function NearestPointer({ radius = 24, axis = 'xy' }: NearestPointerProps) {
  const ctx = useChart('NearestPointer')
  const nearest = (event: PointerLike): ChartPoint | undefined => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    const py = event.clientY - box.top
    let best: ChartPoint | undefined
    let bestDistance = Number.POSITIVE_INFINITY
    for (const point of ctx.points) {
      const distance =
        axis === 'x' ? Math.abs(point.x - px) : Math.hypot(point.x - px, point.y - py)
      if (distance <= radius && distance < bestDistance) {
        best = point
        bestDistance = distance
      }
    }
    return best
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only hit layer; keyboard access lives on the focusable figure
    <rect
      data-ch-part="pointer-layer"
      data-ch-selectable={ctx.selectable ? 'true' : undefined}
      x={0}
      y={0}
      width={ctx.innerWidth}
      height={ctx.innerHeight}
      fill="transparent"
      onPointerMove={(event) => ctx.setActive(nearest(event)?.id ?? null, 'pointer')}
      onClick={(event) => {
        const point = nearest(event)
        if (point) ctx.select(point)
      }}
    />
  )
}
```

The SVG is drawn at 1:1 (its width and height attributes are the measured px), so client offsets inside the rect are plot coordinates.

- [ ] **Step 5: Style the dots**

In `packages/tally-charts/src/theme/theme.css`:
- Add `[data-ch-part="dot"]` and `[data-ch-part="dot-ring"]` to the shared `pointer-events: none` selector list.
- Add after the `[data-ch-part="area"]` animation rules:

```css
[data-ch-part="dot-ring"] {
  fill: none;
  stroke-width: 2;
}

[data-ch-part="pointer-layer"][data-ch-selectable="true"] {
  cursor: pointer;
}

[data-ch-animate="true"] [data-ch-part="dot"] {
  transform-box: fill-box;
  transform-origin: center;
  animation: ch-rise var(--ch-duration) var(--ch-ease) both;
}

@keyframes ch-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Dots mark and NearestPointer hit layer"
```

---
### Task 5: `DotHistogram`

**Files:**
- Create: `packages/tally-charts/src/react/charts/DotHistogram.tsx`
- Test: `packages/tally-charts/src/react/charts/DotHistogram.test.tsx`

**Interfaces:**
- Consumes:
  - `binDots` (Task 2), `thresholds`/`Thresholds` (Task 1)
  - `Dots`/`DotItem` and `NearestPointer` (Task 4)
  - `Target`, `Axis`, `Callout` with `stem`, `Tooltip`
  - `ChartPassThroughProps`, `userCallbacks`, `toNumber` and `headerOf` (`react/charts/shared.ts`)
  - `inferLinearDomain`, `niceDomain`, `createWarner`, `DEV` and `useFormat`
  - `tickStep` from `d3-array`
- Produces: `DotHistogramProps<D>` and `DotHistogram<D>(props)`.
  - Points have id `id ?? index`, group `{ key: bin, axis: 'vertical' }`, and the internal row as their datum, which `userCallbacks` unwraps to the user's object.

Reference: `docs/reference/02-jobs-dot-histogram-table.png`, the top card.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/DotHistogram.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { thresholds } from '../../core/thresholds'
import { DotHistogram, type DotHistogramProps } from './DotHistogram'

type Job = { id: number; margin: number | null }
const jobs: Job[] = [
  { id: 1, margin: 3 },
  { id: 2, margin: 12.3 },
  { id: 3, margin: 12.8 },
  { id: 4, margin: 30 },
  { id: 5, margin: 45 },
  { id: 6, margin: 45.5 },
]
const th = thresholds(
  [10, 25, 38],
  ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'],
)

// 600px wide, 8px side margins: 584px for 0–60%, 1% bins about 9.7px wide.
function renderHistogram(props: Partial<DotHistogramProps<Job>> = {}) {
  return render(
    <DotHistogram<Job>
      data={jobs}
      value="margin"
      id="id"
      label={(d) => `#${d.id}`}
      format="percent"
      toneBy={th}
      domain={[0, 60]}
      width={600}
      title="Jobs by margin"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const dots = (root: HTMLElement) => parts(root, '[data-ch-part="dot"]')

describe('<DotHistogram>', () => {
  it('draws one dot per item, toned by thresholds', () => {
    const { container } = renderHistogram()
    expect(dots(container).map((d) => d.getAttribute('data-ch-tone'))).toEqual([
      'loss',
      'warn',
      'warn',
      'accent-soft',
      'gain',
      'gain',
    ])
  })

  it('stacks values that share a bin', () => {
    const { container } = renderHistogram()
    const [, low, high] = dots(container)
    expect(low?.getAttribute('cx')).toBe(high?.getAttribute('cx'))
    expect(Number(high?.getAttribute('cy'))).toBeLessThan(Number(low?.getAttribute('cy')))
  })

  it('draws the target and the value axis', () => {
    const { container } = renderHistogram({ target: { value: 38, label: 'Target 38%' } })
    expect(container.querySelector('[data-ch-part="target-label"]')).toHaveTextContent(
      'Target 38%',
    )
    const labels = parts(container, '[data-ch-part="axis-label"]').map((t) => t.textContent)
    expect(labels[0]).toBe('0.0%')
    expect(labels.at(-1)).toBe('60.0%')
  })

  it('pins a callout with a stem to an item', () => {
    const { container } = renderHistogram({ calloutId: 2 })
    const callout = container.querySelector('[data-ch-part="callout"]')
    expect(callout).toHaveTextContent('#2')
    expect(callout).toHaveTextContent('12.3%')
    expect(container.querySelector('[data-ch-part="callout-stem"]')).not.toBeNull()
  })

  it('activates the nearest dot on hover and reports the user datum', () => {
    const onActiveChange = vi.fn()
    const { container } = renderHistogram({ onActiveChange })
    const [, dot] = dots(container)
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, {
      clientX: Number(dot?.getAttribute('cx')),
      clientY: Number(dot?.getAttribute('cy')),
    })
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ datum: jobs[1] }))
  })

  it('moves across bins and up stacks with the arrow keys', () => {
    const { container } = renderHistogram()
    const figure = screen.getByRole('figure', { name: 'Jobs by margin' })
    const live = () => container.querySelector('[aria-live]')?.textContent
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('#1, 3.0%')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('#2, 12.3%')
    fireEvent.keyDown(figure, { key: 'ArrowUp' })
    expect(live()).toBe('#3, 12.8%')
  })

  it('skips missing values without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderHistogram({
      data: [...jobs, { id: 7, margin: null }, { id: 8, margin: '' as unknown as number }],
    })
    expect(dots(container)).toHaveLength(6)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('DotHistogram skipped')
  })

  it("warns once when the dots don't fit", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const many = Array.from({ length: 300 }, (_, i) => ({ id: i, margin: 10 }))
    const { container } = renderHistogram({ data: many, height: 120 })
    expect(dots(container)).toHaveLength(300)
    expect(dots(container)[0]).toHaveAttribute('r', '2')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('more dots than fit')
  })

  it('renders a hidden data table with the threshold group', () => {
    renderHistogram()
    const table = screen.getByRole('table', { name: 'Jobs by margin' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Item',
      'margin',
      'Group',
    ])
    expect(within(table).getByText('#2')).toBeInTheDocument()
    expect(within(table).getAllByText('At risk')).toHaveLength(2)
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderHistogram({ width: 0 })
    for (const el of parts(container, 'circle, rect, line')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/DotHistogram.test.tsx`
Expected: FAIL, because `./DotHistogram` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/DotHistogram.tsx`:

```tsx
import { tickStep } from 'd3-array'
import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import { binDots } from '../../core/dots'
import type { Formatter, FormatSpec } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import type { Thresholds } from '../../core/thresholds'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV, type Warn } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis } from '../marks/Axis'
import { type DotItem, Dots } from '../marks/Dots'
import { NearestPointer } from '../marks/NearestPointer'
import { Target } from '../marks/Target'
import { Callout } from '../overlays/Callout'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export interface DotHistogramProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /** The binned value, e.g. margin. */
  value: Accessor<D, number>
  /** Passed to onSelect, onActiveChange and `calloutId`. Default: the data index. */
  id?: Accessor<D, Id>
  /** Item name for announcements and the default tooltip, e.g. "#5819". */
  label?: Accessor<D, string>
  /** Custom tooltip segments per item. */
  segments?: (d: D, i: number) => TooltipSegment[]
  /** Tone per item: a `thresholds()` result or a function. Default 'accent'. */
  toneBy?: Thresholds | ((d: D, i: number) => Tone)
  /** Bin width in value units. Default: a nice step that gives about 50 bins. */
  binWidth?: number
  /** Value domain. Default: the data range including zero, rounded to nice ticks. */
  domain?: readonly [number, number]
  target?: number | { value: number; label?: string }
  /** Pin a callout with a stem to this item id. */
  calloutId?: Id
  /** Default 'number'. */
  format?: FormatSpec
  /** Value axis ticks, or 'none'. Default 6. */
  axis?: TickSpec | 'none'
  /** Default 6. */
  maxRadius?: number
  /** Default 2. */
  minRadius?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface HistogramRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  value: number
  tone: Tone
  name: string
  aria: string
  segments: TooltipSegment[]
}

const MARGIN: Margin = { top: 28, right: 8, bottom: 28, left: 8 }

function HistogramDots<D>(props: {
  rows: readonly HistogramRow<D>[]
  binWidth: number
  maxRadius: number
  minRadius: number
  warn: Warn
}) {
  const ctx = useChart('DotHistogram')
  if (ctx.x.kind !== 'linear') return null
  const layout = binDots({
    values: props.rows.map((r) => r.value),
    x: ctx.x.scale,
    binWidth: props.binWidth,
    baseline: ctx.innerHeight,
    top: 0,
    maxRadius: props.maxRadius,
    minRadius: props.minRadius,
  })
  if (DEV && layout.crowded) {
    props.warn(
      'dot-histogram-crowded',
      'DotHistogram has more dots than fit; drawing them at the minimum size.',
    )
  }
  const items = layout.dots.flatMap((d): DotItem[] => {
    const row = props.rows[d.index]
    if (!row) return []
    return [
      {
        key: row.key,
        id: row.rowId,
        datum: row,
        cx: d.cx,
        cy: d.cy,
        tone: row.tone,
        label: row.aria,
        segments: row.segments,
        group: { key: d.bin, axis: 'vertical' },
      },
    ]
  })
  return (
    <>
      <Dots dots={items} radius={layout.radius} />
      <NearestPointer radius={Math.max(12, layout.radius * 2 + 4)} />
    </>
  )
}

export function DotHistogram<D>({
  data,
  value,
  id,
  label,
  segments,
  toneBy,
  binWidth,
  domain,
  target,
  calloutId,
  format,
  axis = 6,
  maxRadius = 6,
  minRadius = 2,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: DotHistogramProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt: Formatter = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getValue = resolveAccessor(value)
    const getId = id ? resolveAccessor(id) : undefined
    const getLabel = label ? resolveAccessor(label) : undefined
    return data.map((d, i): HistogramRow<D> => {
      const v = toNumber(getValue(d, i))
      const name = getLabel ? String(getLabel(d, i) ?? '') : ''
      const tone: Tone =
        typeof toneBy === 'function'
          ? toneBy(d, i)
          : toneBy
            ? (toneBy.toneOf(v) ?? 'neutral')
            : 'accent'
      const text = fmt(v)
      return {
        key: String(i),
        rowId: getId ? getId(d, i) : i,
        datum: d,
        index: i,
        value: v,
        tone,
        name,
        aria: name ? `${name}, ${text}` : text,
        segments: segments ? segments(d, i) : name ? [{ value: name }, { value: text }] : [{ value: text }],
      }
    })
  }, [data, value, id, label, segments, toneBy, fmt])

  const missing = rows.find((r) => !Number.isFinite(r.value))
  if (DEV && missing) {
    warn(
      'dot-histogram-value',
      `DotHistogram skipped a missing or non-numeric value at index ${missing.index}.`,
    )
  }

  const resolvedDomain = domain ?? niceDomain(inferLinearDomain(rows.map((r) => r.value)))
  const [d0, d1] = resolvedDomain
  const width = binWidth ?? tickStep(Math.min(d0, d1), Math.max(d0, d1), 50)
  const targetSpec = typeof target === 'number' ? { value: target } : target
  const m: Margin = { ...MARGIN, ...margin }

  let table: DataTableSpec<HistogramRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<HistogramRow<D>>[] = [
      { header: headerOf(label, 'Item'), value: (r) => r.name },
      { header: headerOf(value, 'Value'), value: (r) => fmt(r.value) },
    ]
    if (toneBy && typeof toneBy !== 'function') {
      columns.push({
        header: 'Group',
        value: (r) => toneBy.bins[toneBy.indexOf(r.value)]?.label ?? '',
      })
    }
    table = { columns }
  }

  return (
    <Chart<HistogramRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'value', domain: resolvedDomain }}
      y={{ domain: [0, 1] }}
      margin={m}
      height={height ?? 220}
      dataTable={table}
    >
      {targetSpec ? <Target x={targetSpec.value} label={targetSpec.label} /> : null}
      <HistogramDots
        rows={rows}
        binWidth={width}
        maxRadius={maxRadius}
        minRadius={minRadius}
        warn={warn}
      />
      {axis === 'none' ? null : <Axis side="bottom" ticks={axis} format={typeof format === 'function' ? (v) => format(Number(v)) : format} />}
      {calloutId !== undefined ? <Callout id={calloutId} stem /> : null}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

`d3-array` is already a runtime dependency (0.1), so importing `tickStep` adds no new package. `toNumber` in `react/charts/shared.ts` is the strict core helper, re-exported in 0.3.

The `Callout` renders after mount (the overlay), so the callout test passes after React flushes layout effects inside `render`, as the 0.3 Callout tests do.

- [ ] **Step 4: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS.

If the "warns once" test sees two warnings because the crowded warning repeats across re-renders, it shouldn't: the warner dedupes by key. Report it if it happens.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/react/charts
git commit -m "feat: DotHistogram"
```

---

### Task 6: `StripPlot`

**Files:**
- Create: `packages/tally-charts/src/react/charts/StripPlot.tsx`
- Test: `packages/tally-charts/src/react/charts/StripPlot.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Test: `packages/tally-charts/src/theme/theme.test.ts`

**Interfaces:**
- Consumes:
  - `stackStrip` and `medianOf` (Task 2)
  - `Dots` and `NearestPointer` (Task 4)
  - `RowLabels`, `Axis`, `Tooltip`
  - `ChartPassThroughProps`, `userCallbacks`, `toNumber` and `headerOf`
  - `inferLinearDomain`, `niceDomain` and `useFormat`
- Produces:
  - `interface StripSeries<D> { id: string; label: string; value: Accessor<D, number>; tone?: Tone }`
  - `StripPlotProps<D>` and `StripPlot<D>(props)`
  - New parts `data-ch-part="median"` (a dashed line) and `data-ch-part="median-label"`
  - Points have id `` `${series.id}:${rowId}` `` and group `{ key: series.id, axis: 'horizontal' }`

Reference: `docs/reference/06-drilldown-strip-plot.png`, the bottom-left card.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/StripPlot.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StripPlot, type StripPlotProps, type StripSeries } from './StripPlot'

type Install = { job: string; est: number | null; act: number | null }
const installs: Install[] = [
  { job: 'A', est: 6, act: 8 },
  { job: 'B', est: 6.125, act: 9 },
  { job: 'C', est: 6.25, act: 8.2 },
]
const series: StripSeries<Install>[] = [
  { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
  { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
]

// 496px wide, 96px labels, 16px right: 384px for 4–12 h (48px per hour).
// 2 rows × 72px + 8px top + 28px axis = 180px; rows are 72px bands.
function renderStrip(props: Partial<StripPlotProps<Install>> = {}) {
  return render(
    <StripPlot<Install>
      data={installs}
      series={series}
      label="job"
      format="hours"
      domain={[4, 12]}
      width={496}
      radius={4}
      title="Dallas installs"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const dots = (root: HTMLElement) => parts(root, '[data-ch-part="dot"]')

describe('<StripPlot>', () => {
  it('draws one dot per item per series in its row', () => {
    const { container } = renderStrip()
    expect(dots(container)).toHaveLength(6)
    const est = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'accent-soft')
    expect(est.map((d) => d.getAttribute('cx'))).toEqual(['96', '102', '108'])
    expect(est[0]).toHaveAttribute('cy', '62')
    const act = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'loss')
    expect(act[0]).toHaveAttribute('cy', '134')
  })

  it('lifts dots that would overlap', () => {
    const { container } = renderStrip()
    const est = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'accent-soft')
    expect(est[1]).toHaveAttribute('cy', '53')
    expect(est[2]).toHaveAttribute('cy', '62')
  })

  it('marks each row median with a labelled dashed line', () => {
    const { container } = renderStrip()
    const lines = parts(container, '[data-ch-part="median"]')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveAttribute('x1', '102')
    const labels = parts(container, '[data-ch-part="median-label"]')
    expect(labels.map((t) => t.textContent)).toEqual(['6.1 h', '8.2 h'])
    expect(labels[1]).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('labels the rows on the left', () => {
    const { container } = renderStrip()
    expect(parts(container, '[data-ch-part="row-label"]').map((t) => t.textContent)).toEqual([
      'Estimated',
      'Actual',
    ])
  })

  it('moves along a row and between rows', () => {
    const { container } = renderStrip()
    const figure = screen.getByRole('figure', { name: 'Dallas installs' })
    const live = () => container.querySelector('[aria-live]')?.textContent
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('Estimated, A, 6 h')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('Estimated, B, 6.1 h')
    fireEvent.keyDown(figure, { key: 'ArrowDown' })
    expect(live()).toBe('Actual, A, 8 h')
  })

  it('reports the user datum on hover', () => {
    const onActiveChange = vi.fn()
    const { container } = renderStrip({ onActiveChange })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: 96, clientY: 62 })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'est:0',
      expect.objectContaining({ datum: installs[0] }),
    )
  })

  it('skips missing values per series', () => {
    const { container } = renderStrip({
      data: [...installs, { job: 'D', est: null, act: '' as unknown as number }],
    })
    expect(dots(container)).toHaveLength(6)
    expect(container.textContent).not.toContain('NaN')
  })

  it('renders a hidden data table with one column per series', () => {
    renderStrip()
    const table = screen.getByRole('table', { name: 'Dallas installs' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'job',
      'Estimated',
      'Actual',
    ])
    expect(within(table).getByText('8.2 h')).toBeInTheDocument()
  })

  it('leaves the medians out on request', () => {
    const { container } = renderStrip({ median: false })
    expect(parts(container, '[data-ch-part="median"]')).toHaveLength(0)
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderStrip({ width: 0 })
    for (const el of parts(container, 'circle, rect, line')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
```

In `packages/tally-charts/src/theme/theme.test.ts`, extend the shared pointer-events assertion to also require `[data-ch-part="median"]`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/StripPlot.test.tsx src/theme`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/StripPlot.tsx`:

```tsx
import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import { medianOf, stackStrip } from '../../core/dots'
import type { Formatter, FormatSpec } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Id, Tone } from '../../core/types'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { type DotItem, Dots } from '../marks/Dots'
import { NearestPointer } from '../marks/NearestPointer'
import { RowLabels } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export interface StripSeries<D> {
  /** Unique key; also part of each point id (`<id>:<row id>`). */
  id: string
  /** Row label, e.g. "Estimated". */
  label: string
  value: Accessor<D, number>
  tone?: Tone
}

export interface StripPlotProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /** One row of dots per series. */
  series: readonly StripSeries<D>[]
  /** Item id. Default: the data index. */
  id?: Accessor<D, Id>
  /** Item name for announcements and tooltips. */
  label?: Accessor<D, string>
  /** Default 'number'. */
  format?: FormatSpec
  /** Value domain. Default: the range of all values without forcing zero, rounded to nice ticks. */
  domain?: readonly [number, number]
  /** Dot radius in px. Default 4. */
  radius?: number
  /** Dashed median line and label per row. Default true. */
  median?: boolean
  /** Default 72. */
  rowHeight?: number
  /** Label column width in px. Default 96. */
  labelWidth?: number
  /** Value axis ticks, or 'none'. Default 5. */
  axis?: TickSpec | 'none'
  /** Axis label format. Default: `format`. */
  axisFormat?: AxisFormat
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface StripRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  name: string
  values: number[]
}

const DEFAULT_TONES: readonly Tone[] = ['accent', 'loss', 'warn', 'gain', 'neutral', 'accent-soft']
/** Space between the lowest dots and the row's bottom edge, in px. */
const ROW_PAD = 6

function StripRows<D>(props: {
  rows: readonly StripRow<D>[]
  series: readonly StripSeries<D>[]
  radius: number
  median: boolean
  fmt: Formatter
}) {
  const ctx = useChart('StripPlot')
  if (ctx.x.kind !== 'linear' || ctx.y.kind !== 'band') return null
  const x = ctx.x.scale
  const band = ctx.y.scale
  const size = band.bandwidth()
  const items: DotItem[] = []
  const medians: { key: string; x: number; top: number; bottom: number; tone: Tone; text: string }[] = []
  props.series.forEach((s, si) => {
    const start = band(s.id)
    if (start === undefined) return
    const tone = s.tone ?? (DEFAULT_TONES[si % DEFAULT_TONES.length] as Tone)
    const baseline = start + size - ROW_PAD
    const values = props.rows.map((r) => r.values[si])
    const placed = stackStrip({ values, x, baseline, radius: props.radius })
    let top = baseline
    for (const d of placed) {
      const row = props.rows[d.index]
      if (!row) continue
      const text = props.fmt(d.value)
      top = Math.min(top, d.cy - props.radius)
      items.push({
        key: `${s.id}:${row.key}`,
        id: `${s.id}:${String(row.rowId)}`,
        datum: row,
        cx: d.cx,
        cy: d.cy,
        tone,
        label: row.name ? `${s.label}, ${row.name}, ${text}` : `${s.label}, ${text}`,
        segments: row.name
          ? [{ value: s.label }, { value: row.name }, { value: text, tone }]
          : [{ value: s.label }, { value: text, tone }],
        group: { key: s.id, axis: 'horizontal' },
      })
    }
    const m = medianOf(values)
    if (props.median && Number.isFinite(m)) {
      const [r0, r1] = x.range()
      const mx = Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), x(m)))
      medians.push({ key: s.id, x: mx, top: top - 8, bottom: baseline, tone, text: props.fmt(m) })
    }
  })
  return (
    <>
      <g data-ch-part="medians">
        {medians.map((m) => (
          <g key={m.key}>
            <line
              data-ch-part="median"
              data-ch-tone={m.tone}
              x1={m.x}
              x2={m.x}
              y1={m.top}
              y2={m.bottom}
              style={{ stroke: `var(--ch-${m.tone})` }}
            />
            <text
              data-ch-part="median-label"
              data-ch-tone={m.tone}
              x={m.x + 4}
              y={m.top}
              dominantBaseline="middle"
              style={{ fill: `var(--ch-${m.tone})` }}
            >
              {m.text}
            </text>
          </g>
        ))}
      </g>
      <Dots dots={items} radius={props.radius} />
      <NearestPointer radius={Math.max(12, props.radius * 3)} />
    </>
  )
}

export function StripPlot<D>({
  data,
  series,
  id,
  label,
  format,
  domain,
  radius = 4,
  median = true,
  rowHeight = 72,
  labelWidth = 96,
  axis = 5,
  axisFormat,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: StripPlotProps<D>) {
  const { create } = useFormat()
  const fmt = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getId = id ? resolveAccessor(id) : undefined
    const getLabel = label ? resolveAccessor(label) : undefined
    const getters = series.map((s) => resolveAccessor(s.value))
    return data.map(
      (d, i): StripRow<D> => ({
        key: String(i),
        rowId: getId ? getId(d, i) : i,
        datum: d,
        index: i,
        name: getLabel ? String(getLabel(d, i) ?? '') : '',
        values: getters.map((get) => toNumber(get(d, i))),
      }),
    )
  }, [data, id, label, series])

  const resolvedDomain =
    domain ?? niceDomain(inferLinearDomain(rows.flatMap((r) => r.values), false))
  const seriesRows = series.map((s) => ({ key: s.id, label: s.label }))
  const m: Margin = { top: 8, right: 16, bottom: axis === 'none' ? 0 : 28, left: labelWidth, ...margin }
  const axisFmt: AxisFormat | undefined =
    axisFormat ?? (typeof format === 'function' ? (v: string | number) => format(Number(v)) : format)

  const table: DataTableSpec<StripRow<D>> | undefined = dataTable
    ? {
        columns: [
          { header: headerOf(label, 'Item'), value: (r) => r.name },
          ...series.map((s, si) => ({ header: s.label, value: (r: StripRow<D>) => fmt(r.values[si] ?? Number.NaN) })),
        ],
      }
    : undefined

  return (
    <Chart<StripRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ domain: resolvedDomain }}
      y={{ type: 'band', domain: series.map((s) => s.id), padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, series.length) * rowHeight + m.top + m.bottom}
      dataTable={table}
    >
      <StripRows rows={rows} series={series} radius={radius} median={median} fmt={fmt} />
      <RowLabels data={seriesRows} y="key" text="label" maxWidth={labelWidth - 12} />
      {axis === 'none' ? null : <Axis side="bottom" ticks={axis} format={axisFmt} />}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

The dots are registered row by row in x order, so ←/→ walk a row and ↑/↓ change rows (design decision 4). A row's label and dots live in the same band, so `RowLabels` gets its own `data` (one entry per series).

- [ ] **Step 4: Style the medians**

In `packages/tally-charts/src/theme/theme.css`, add `[data-ch-part="median"]` to the shared `pointer-events: none` selector list, and add after the `[data-ch-part="dot-ring"]` rule:

```css
[data-ch-part="median"] {
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}

[data-ch-part="median-label"] {
  font-size: 13px;
  font-weight: 500;
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: StripPlot with stacked rows and medians"
```

---

### Task 7: `WaffleColumns`

**Files:**
- Create: `packages/tally-charts/src/react/charts/WaffleColumns.tsx`
- Test: `packages/tally-charts/src/react/charts/WaffleColumns.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes:
  - `packWaffle` (Task 2)
  - `Dots` (non-interactive) and `NearestPointer` with `axis="x"` (Task 4)
  - `useRegisterPoints`, `Callout`, `Tooltip`
  - `ChartPassThroughProps`, `userCallbacks`, `toNumber` and `headerOf`
  - `tickStep`, `createWarner`, `DEV` and `useFormat`
- Produces:
  - `WaffleColumnsProps<D>` and `WaffleColumns<D>(props)`, with one point per column (period).
  - The default `unit` is `tickStep(0, max, 12)`.
  - The default `groupTone` is `'loss'` for the last group and `'neutral'` otherwise.
  - The peak column is solid and the other columns are soft.
  - New part `data-ch-part="group-label"`.

Reference: `docs/reference/05-leakage-heatmap.png`, the top-left card "Profit leaked".

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/WaffleColumns.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WaffleColumns, type WaffleColumnsProps } from './WaffleColumns'

type Week = { week: string; leaked: number | null; month: string }
const weeks: Week[] = [
  { week: 'Aug 3', leaked: 8, month: 'August' },
  { week: 'Aug 10', leaked: 12, month: 'August' },
  { week: 'Sep 7', leaked: 24, month: 'September' },
  { week: 'Sep 14', leaked: 10, month: 'September' },
]

// unit 2 → 4, 6, 12 and 5 dots; 2 across → the tallest column has 6 rows.
// 400 × 200 with 8px top and 28px bottom: 164px of plot height, cells of 164/6 px.
function renderWaffle(props: Partial<WaffleColumnsProps<Week>> = {}) {
  return render(
    <WaffleColumns<Week>
      data={weeks}
      x="week"
      y="leaked"
      group="month"
      unit={2}
      width={400}
      height={200}
      title="Profit leaked"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const dots = (root: HTMLElement) => parts(root, '[data-ch-part="dot"]')
const peakDots = (root: HTMLElement) =>
  dots(root).filter((d) => d.getAttribute('data-ch-tone') === 'loss' && !d.hasAttribute('data-ch-soft'))

describe('<WaffleColumns>', () => {
  it('draws a column of dots per period, bottom-up', () => {
    const { container } = renderWaffle()
    expect(dots(container)).toHaveLength(27)
    const bottom = Math.max(...dots(container).map((d) => Number(d.getAttribute('cy'))))
    expect(bottom).toBeCloseTo(164 - 164 / 6 / 2)
  })

  it('tones groups and makes the peak solid', () => {
    const { container } = renderWaffle()
    const august = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'neutral')
    expect(august).toHaveLength(10)
    expect(august.every((d) => d.getAttribute('data-ch-soft') === 'true')).toBe(true)
    expect(peakDots(container)).toHaveLength(12)
  })

  it('labels each group under its columns', () => {
    const { container } = renderWaffle()
    const labels = parts(container, '[data-ch-part="group-label"]')
    expect(labels.map((t) => t.textContent)).toEqual(['August', 'September'])
    expect(labels[1]).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('pins the peak callout', () => {
    const { container } = renderWaffle()
    const callout = container.querySelector('[data-ch-part="callout"]')
    expect(callout).toHaveTextContent('Peak')
    expect(callout).toHaveTextContent('Sep 7')
    expect(callout).toHaveTextContent('24')
  })

  it('activates a whole column from anywhere above it', () => {
    const onActiveChange = vi.fn()
    const { container } = renderWaffle({ onActiveChange })
    const xs = peakDots(container).map((d) => Number(d.getAttribute('cx')))
    const center = (Math.min(...xs) + Math.max(...xs)) / 2
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: center, clientY: 2 })
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ datum: weeks[2] }))
    expect(peakDots(container).some((d) => d.hasAttribute('data-ch-dimmed'))).toBe(false)
    expect(dots(container).filter((d) => d.hasAttribute('data-ch-dimmed'))).toHaveLength(15)
  })

  it('moves column to column with the keyboard', () => {
    const { container } = renderWaffle()
    const figure = screen.getByRole('figure', { name: 'Profit leaked' })
    for (let i = 0; i < 3; i++) fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')?.textContent).toBe('Sep 7, 24')
  })

  it('draws an empty column for a missing value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderWaffle({
      data: weeks.map((w) => (w.week === 'Aug 10' ? { ...w, leaked: null } : w)),
    })
    expect(dots(container)).toHaveLength(21)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('WaffleColumns skipped')
  })

  it('picks a unit when none is given', () => {
    const { container } = renderWaffle({ unit: undefined })
    expect(dots(container)).toHaveLength(27)
  })

  it('keeps every column solid when peak is off', () => {
    const { container } = renderWaffle({ peak: false, callout: false })
    expect(dots(container).some((d) => d.hasAttribute('data-ch-soft'))).toBe(false)
    expect(container.querySelector('[data-ch-part="callout"]')).toBeNull()
  })

  it('renders a hidden data table', () => {
    renderWaffle()
    const table = screen.getByRole('table', { name: 'Profit leaked' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'week',
      'leaked',
      'month',
    ])
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderWaffle({ width: 0 })
    for (const el of parts(container, 'circle, rect')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'width', 'height']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
```

`tickStep(0, 24, 12)` is 2, so the default unit gives the same 27 dots.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/WaffleColumns.test.tsx`
Expected: FAIL, because `./WaffleColumns` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/WaffleColumns.tsx`:

```tsx
import { tickStep } from 'd3-array'
import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { Formatter, FormatSpec } from '../../core/format'
import type { Accessor, Id, Tone } from '../../core/types'
import { packWaffle } from '../../core/waffle'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { type DotItem, Dots } from '../marks/Dots'
import { NearestPointer } from '../marks/NearestPointer'
import { Callout } from '../overlays/Callout'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export interface WaffleColumnsProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /** Period label, e.g. "Sep 7". */
  x: Accessor<D, string | number>
  /** Value per period. */
  y: Accessor<D, number>
  /** Passed to onSelect and onActiveChange. Default: the data index. */
  id?: Accessor<D, Id>
  /** Group of periods, e.g. the month; labelled under its columns. */
  group?: Accessor<D, string>
  /** Tone per group. Default: the last group 'loss', the others 'neutral'. */
  groupTone?: (group: string, index: number, groups: readonly string[]) => Tone
  /** Value of one dot. Default: a nice step that gives the tallest column about 12 dots. */
  unit?: number
  /** Dots across each column. Default 2. */
  wide?: number
  /** The largest column solid, the others soft. Default true. */
  peak?: boolean
  /** Pinned pill over the peak column: true for "Peak | <period> | <value>", or custom segments. Default true. */
  callout?: boolean | ((d: D) => TooltipSegment[])
  /** Default 'number'. */
  format?: FormatSpec
  /** Inner band padding, 0–1. Default 0.3. */
  padding?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface WaffleRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  label: string
  value: number
  group: string
  tone: Tone
  soft: boolean
}

const MARGIN: Margin = { top: 8, right: 0, bottom: 28, left: 0 }
/** Space between dots, in px. */
const GAP = 3

function WaffleBody<D>(props: { rows: readonly WaffleRow<D>[]; unit: number; wide: number; fmt: Formatter }) {
  const ctx = useChart('WaffleColumns')
  const band = ctx.x.kind === 'band' ? ctx.x.scale : undefined
  const { cells, maxRows } = packWaffle(
    props.rows.map((r) => r.value / props.unit),
    props.wide,
  )
  const size = band ? band.bandwidth() : 0
  const cell = Math.max(0, Math.min(size / props.wide, ctx.innerHeight / Math.max(1, maxRows)))
  const radius = Math.max(0, cell / 2 - GAP / 2)
  const columnRows = new Map<number, number>()
  const dots = band
    ? cells.flatMap((c): DotItem[] => {
        const row = props.rows[c.column]
        const start = row ? band(row.key) : undefined
        if (!row || start === undefined) return []
        columnRows.set(c.column, Math.max(columnRows.get(c.column) ?? 0, c.row + 1))
        const left = start + (size - props.wide * cell) / 2
        return [
          {
            key: `${row.key}:${c.dot}`,
            id: row.rowId,
            datum: row,
            cx: left + (c.col + 0.5) * cell,
            cy: ctx.innerHeight - (c.row + 0.5) * cell,
            tone: row.tone,
            soft: row.soft,
            label: row.label,
          },
        ]
      })
    : []
  const points: ChartPoint[] = band
    ? props.rows.flatMap((row, index) => {
        const start = band(row.key)
        if (start === undefined || !Number.isFinite(row.value)) return []
        const text = props.fmt(row.value)
        return [
          {
            id: row.rowId,
            index,
            datum: row,
            x: start + size / 2,
            y: ctx.innerHeight - (columnRows.get(index) ?? 0) * cell,
            label: `${row.label}, ${text}`,
            segments: [{ value: row.label }, { value: text, tone: row.tone }],
          },
        ]
      })
    : []
  useRegisterPoints(ctx, points)
  if (!band) return null
  return (
    <>
      <Dots dots={dots} radius={radius} interactive={false} />
      <NearestPointer axis="x" radius={band.step() / 2} />
    </>
  )
}

function GroupLabels<D>({ rows }: { rows: readonly WaffleRow<D>[] }) {
  const ctx = useChart('WaffleColumns')
  if (ctx.x.kind !== 'band') return null
  const band = ctx.x.scale
  const spans = new Map<string, { from: number; to: number; tone: Tone }>()
  for (const row of rows) {
    if (!row.group) continue
    const start = band(row.key)
    if (start === undefined) continue
    const span = spans.get(row.group)
    const end = start + band.bandwidth()
    spans.set(row.group, span ? { ...span, to: end } : { from: start, to: end, tone: row.tone })
  }
  return (
    <g data-ch-part="group-labels">
      {[...spans].map(([group, span]) => (
        <text
          key={group}
          data-ch-part="group-label"
          data-ch-tone={span.tone === 'neutral' ? undefined : span.tone}
          x={(span.from + span.to) / 2}
          y={ctx.innerHeight + 10}
          textAnchor="middle"
          dominantBaseline="hanging"
          style={span.tone === 'neutral' ? undefined : { fill: `var(--ch-${span.tone})` }}
        >
          {group}
        </text>
      ))}
    </g>
  )
}

export function WaffleColumns<D>({
  data,
  x,
  y,
  id,
  group,
  groupTone,
  unit,
  wide = 2,
  peak = true,
  callout = true,
  format,
  padding = 0.3,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: WaffleColumnsProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getX = resolveAccessor(x)
    const getY = resolveAccessor(y)
    const getId = id ? resolveAccessor(id) : undefined
    const getGroup = group ? resolveAccessor(group) : undefined
    const base = data.map((d, i) => ({
      d,
      i,
      label: String(getX(d, i) ?? ''),
      value: toNumber(getY(d, i)),
      group: getGroup ? String(getGroup(d, i) ?? '') : '',
      rowId: getId ? getId(d, i) : i,
    }))
    const groups = [...new Set(base.map((b) => b.group).filter(Boolean))]
    const toneOf = (g: string): Tone => {
      if (!g) return 'loss'
      const gi = groups.indexOf(g)
      return groupTone ? groupTone(g, gi, groups) : gi === groups.length - 1 ? 'loss' : 'neutral'
    }
    let peakIndex = -1
    base.forEach((b, i) => {
      const best = base[peakIndex]
      if (Number.isFinite(b.value) && (!best || b.value > best.value)) peakIndex = i
    })
    return base.map(
      (b, i): WaffleRow<D> => ({
        key: String(i),
        rowId: b.rowId,
        datum: b.d,
        index: b.i,
        label: b.label,
        value: b.value,
        group: b.group,
        tone: toneOf(b.group),
        soft: peak && i !== peakIndex,
      }),
    )
  }, [data, x, y, id, group, groupTone, peak])

  const missing = rows.find((r) => !Number.isFinite(r.value))
  if (DEV && missing) {
    warn(
      'waffle-value',
      `WaffleColumns skipped a missing or non-numeric value at index ${missing.index}.`,
    )
  }

  const max = Math.max(0, ...rows.map((r) => (Number.isFinite(r.value) ? r.value : 0)))
  const dotValue = unit !== undefined && unit > 0 ? unit : max > 0 ? tickStep(0, max, 12) : 1
  const peakRow = peak
    ? rows.reduce<WaffleRow<D> | undefined>(
        (best, r) => (Number.isFinite(r.value) && (!best || r.value > best.value) ? r : best),
        undefined,
      )
    : undefined
  const calloutSegments: TooltipSegment[] | undefined =
    peakRow && callout
      ? typeof callout === 'function'
        ? callout(peakRow.datum)
        : [{ value: 'Peak' }, { value: peakRow.label }, { value: fmt(peakRow.value) }]
      : undefined
  const m: Margin = { ...MARGIN, ...margin }

  let table: DataTableSpec<WaffleRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<WaffleRow<D>>[] = [
      { header: headerOf(x, 'Period'), value: (r) => r.label },
      { header: headerOf(y, 'Value'), value: (r) => fmt(r.value) },
    ]
    if (group) columns.push({ header: headerOf(group, 'Group'), value: (r) => r.group })
    table = { columns }
  }

  return (
    <Chart<WaffleRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ type: 'band', field: 'key', padding }}
      y={{ domain: [0, 1] }}
      margin={m}
      height={height ?? 200}
      dataTable={table}
    >
      <WaffleBody rows={rows} unit={dotValue} wide={wide} fmt={fmt} />
      {group ? <GroupLabels rows={rows} /> : null}
      {peakRow && calloutSegments ? (
        <Callout id={peakRow.rowId} segments={calloutSegments} placement="top" />
      ) : null}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

`useRegisterPoints` runs on every render, before the early return, so the hook order is stable.

The points array is rebuilt each render. The registry's `samePoints` check (0.2) keeps that from looping, because ids, coordinates, labels and segment values stay equal.

`Callout placement="top"` exists since the 0.3 fix wave.

- [ ] **Step 4: Style the group labels**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-part="median-label"]` rule:

```css
[data-ch-part="group-label"] {
  fill: var(--ch-ink-muted);
  font-size: 13px;
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: WaffleColumns"
```

---
### Task 8: Stacked `RankedBars` keep each label with its own bar (carry-over)

**Files:**
- Modify: `packages/tally-charts/src/react/charts/RankedBars.tsx`
- Test: `packages/tally-charts/src/react/charts/RankedBars.test.tsx`
- Regenerate: `apps/storybook/e2e/__screenshots__/darwin/reference-drill-columns--light.png`

**Why:** in the stacked layout a row's text starts 8px below the row top and its bar ends 8px above the row bottom (`STACK_PAD = 8`). With a 52px row, the gap from a label to its own bar (about 15px) is almost the same as the gap to the bar of the row above (about 16px), so rows don't read as units. The 0.3 Task 8 visual review found this.

**Interfaces:**
- Produces: in the stacked layout, row text is shifted down 14px (`STACK_TEXT_PAD`) and bars sit 10px above the row bottom (`STACK_BAR_PAD`). Each label is then about 7px from its own bar and about 24px from the bar above. The inline layout is unchanged.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/RankedBars.test.tsx`, change the test `'stacks the label above a thin bar in the stacked layout'`:
- update the comment;
- expect the `row-text` group to have `transform` `'translate(0 14)'`;
- expect the bar to have `y` `'36'`.

Then add:

```tsx
  it('keeps each stacked label closer to its own bar than to the bar above', () => {
    const { container } = renderRanked({ layout: 'stacked' })
    const shift = Number(
      container
        .querySelector('[data-ch-part="row-text"]')
        ?.getAttribute('transform')
        ?.match(/translate\(0 ([\d.]+)\)/)?.[1],
    )
    const [, label] = parts(container, '[data-ch-part="row-labels"][data-ch-side="left"] [data-ch-part="row-label"]')
    const [above, own] = parts(container, '[data-ch-part="bar"]')
    const labelTop = Number(label?.getAttribute('y')) + shift
    // 15px label text, hanging from its y.
    const labelBottom = labelTop + 15
    const aboveBottom = Number(above?.getAttribute('y')) + Number(above?.getAttribute('height'))
    const ownTop = Number(own?.getAttribute('y'))
    // At most half the gap to the bar above, so each row reads as one unit (was 15 vs 16 px).
    expect(ownTop - labelBottom).toBeLessThan((labelTop - aboveBottom) / 2)
    expect(ownTop - labelBottom).toBeGreaterThan(0)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/RankedBars.test.tsx`
Expected: FAIL. The transform is `translate(0 8)`, the bar `y` is `38`, and the own-bar gap (15px) isn't under half the gap to the bar above (16px).

- [ ] **Step 3: Implement**

In `packages/tally-charts/src/react/charts/RankedBars.tsx`, replace the `STACK_PAD` constant with:

```ts
/** Stacked layout: the row's text starts this far below the row top, in px. */
const STACK_TEXT_PAD = 14
/** Stacked layout: the bar ends this far above the row bottom, in px. */
const STACK_BAR_PAD = 10
```

Use `STACK_TEXT_PAD` for `textShift` and `-STACK_BAR_PAD` for the bars' `offset`. Update the doc comment above `textShift`. With the 52px default row, the text runs from 14 to about 29 and the bar from 36 to 42. The next row's text starts at 66.

- [ ] **Step 4: Run the tests and refresh the drill baseline**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

Run: `pnpm --filter storybook-app exec playwright test -g "drill-columns--light matches" --update-snapshots=all`, then `pnpm test:e2e`.
Expected: the second run PASSES. Only `darwin/reference-drill-columns--light.png` changed (`git status`). Open it and check that labels now sit with their own bars. Task 10 regenerates the linux baselines in one Docker run.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src apps/storybook/e2e/__screenshots__/darwin/reference-drill-columns--light.png
git commit -m "fix: stacked RankedBars labels sit with their own bars"
```

---

### Task 9: Public exports, size budgets, SSR coverage, README, changeset

**Files:**
- Modify: `packages/tally-charts/src/index.ts`, `packages/tally-charts/src/index.test.ts`
- Modify: `packages/tally-charts/.size-limit.json`
- Modify: `packages/tally-charts/test/fixtures.tsx`, `packages/tally-charts/src/ssr.node.test.tsx`
- Modify: `packages/tally-charts/README.md`
- Create: `.changeset/tally-charts-0-4.md`

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces: the public 0.4 API, plus the fixtures `JobsHistogram`, `InstallsStrip` and `LeakWaffle`.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/index.test.ts`, add to the `'main exports %s'` list:

```ts
    'DotHistogram',
    'StripPlot',
    'WaffleColumns',
    'Dots',
    'NearestPointer',
    'thresholds',
```

Append to `packages/tally-charts/test/fixtures.tsx`, and add `DotHistogram`, `StripPlot`, `WaffleColumns` and `thresholds` to its import from `'../src'`:

```tsx
export const marginBands = thresholds(
  [10, 25, 38],
  ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'],
)

export const jobs = [3.1, 8.8, 12.3, 14.0, 26.5, 31.2, 39.0, 41.5, 41.9, 47.2].map((margin, i) => ({
  id: 5810 + i,
  margin,
}))

export function JobsHistogram() {
  return (
    <DotHistogram
      title="Jobs by margin"
      data={jobs}
      value="margin"
      id="id"
      label={(d) => `#${d.id}`}
      format="percent"
      toneBy={marginBands}
      domain={[0, 60]}
      target={{ value: 38, label: 'Target 38%' }}
      calloutId={5812}
    />
  )
}

export const installs = [
  { job: 'A', est: 6.0, act: 8.4 },
  { job: 'B', est: 6.1, act: 7.9 },
  { job: 'C', est: 5.8, act: 9.6 },
  { job: 'D', est: 6.3, act: 8.2 },
  { job: 'E', est: 6.1, act: 8.1 },
]

export function InstallsStrip() {
  return (
    <StripPlot
      title="Dallas installs, hours per job"
      data={installs}
      label="job"
      series={[
        { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
        { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
      ]}
      format="hours"
      domain={[4, 12]}
    />
  )
}

export const leakWeeks = [
  { week: 'Aug 3', leaked: 9800, month: 'August' },
  { week: 'Aug 10', leaked: 10200, month: 'August' },
  { week: 'Aug 31', leaked: 10100, month: 'September' },
  { week: 'Sep 7', leaked: 23400, month: 'September' },
]

export function LeakWaffle() {
  return (
    <WaffleColumns
      title="Profit leaked by week"
      data={leakWeeks}
      x="week"
      y="leaked"
      group="month"
      unit={2000}
      format="currency-compact"
    />
  )
}
```

Append inside `describe('server rendering', …)` in `packages/tally-charts/src/ssr.node.test.tsx`, and add `InstallsStrip`, `JobsHistogram` and `LeakWaffle` to the fixtures import:

```tsx
  it('renders the 0.4 dot charts without a DOM, deterministically', () => {
    for (const Example of [JobsHistogram, InstallsStrip, LeakWaffle]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
      // Pinned callouts live in the overlay, which only exists after mount.
      expect(html).not.toContain('data-ch-part="callout"')
    }
    expect(renderToString(<JobsHistogram />).match(/data-ch-part="dot"/g)).toHaveLength(10)
    const strip = renderToString(<InstallsStrip />)
    expect(strip.match(/data-ch-part="dot"/g)).toHaveLength(10)
    expect(strip).toContain('6.1 h')
    expect(strip).toContain('8.2 h')
    const waffle = renderToString(<LeakWaffle />)
    // 9800 → 5, 10200 → 5, 10100 → 5, 23400 → 12 dots at $2K each.
    expect(waffle.match(/data-ch-part="dot"/g)).toHaveLength(27)
    expect(waffle).toContain('September')
  })
```

The strip's estimated median is the middle of 5.8, 6.0, 6.1, 6.1, 6.3, which is 6.1. The actual median is the middle of 7.9, 8.1, 8.2, 8.4, 9.6, which is 8.2.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/index.test.ts src/ssr.node.test.tsx`
Expected: FAIL; the names aren't exported.

- [ ] **Step 3: Export**

In `packages/tally-charts/src/index.ts`, add, keeping alphabetical-by-path order:

```ts
export type { ThresholdBin, ThresholdLegendItem, Thresholds } from './core/thresholds'
export { thresholds } from './core/thresholds'
export type { DotHistogramProps } from './react/charts/DotHistogram'
export { DotHistogram } from './react/charts/DotHistogram'
export type { StripPlotProps, StripSeries } from './react/charts/StripPlot'
export { StripPlot } from './react/charts/StripPlot'
export type { WaffleColumnsProps } from './react/charts/WaffleColumns'
export { WaffleColumns } from './react/charts/WaffleColumns'
export type { DotItem, DotsProps } from './react/marks/Dots'
export { Dots } from './react/marks/Dots'
export type { NearestPointerProps } from './react/marks/NearestPointer'
export { NearestPointer } from './react/marks/NearestPointer'
```

`thresholds` is also on the main entry because users build legends and tones in client components. It stays React-free in `core` too.

- [ ] **Step 4: Add size budgets**

Append to `packages/tally-charts/.size-limit.json`:

```json
  {
    "name": "DotHistogram",
    "path": "dist/index.js",
    "import": "{ DotHistogram }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "StripPlot",
    "path": "dist/index.js",
    "import": "{ StripPlot }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "WaffleColumns",
    "path": "dist/index.js",
    "import": "{ WaffleColumns }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  }
```

- [ ] **Step 5: Document 0.4**

In `packages/tally-charts/README.md`:
- Change the status line to `> Status: 0.4. The API may change before 1.0.`
- In the High-level charts section, add after the `BridgeChart` bullet:

```md
- `DotHistogram`: one dot per item, binned on x and stacked; `toneBy` takes a `thresholds()`
  result; `target` and a pinned `calloutId` (with a stem). Arrow keys walk bins (←/→) and
  stacks (↑/↓). Dots shrink to a minimum size when crowded, then warn.
- `StripPlot`: one row of dots per `series`, lifted where they'd overlap, with a dashed median
  per row. ←/→ walk a row, ↑/↓ change rows. Point ids are `"<series id>:<row id>"`.
- `WaffleColumns`: a column of dots per period (`unit` is the value of one dot), periods tinted
  by `group`, the peak column solid with a pinned "Peak" pill. Hover and keys work per column.
```

- Add after the 0.3 building-blocks paragraph:

````md
Thresholds drive tones and legend counts:

```tsx
const bands = thresholds([10, 25, 38], ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'])

<Legend shape="dot" items={bands.legend(jobs.map((j) => j.margin))} />
<DotHistogram data={jobs} value="margin" toneBy={bands} format="percent" />
```

Building blocks added in 0.4: `Dots` (circles at given positions, with a ring on the active one)
and `NearestPointer` (one layer that activates the point nearest the pointer, in 2-D or along x).
Numbers in data follow one rule: numbers and numeric strings count, while blanks, booleans and
other values are missing.
````

- [ ] **Step 6: Add the changeset**

Create `.changeset/tally-charts-0-4.md`:

```md
---
'tally-charts': minor
---

Dot charts: `DotHistogram` (binned, stacked, threshold tones, target, pinned callout),
`StripPlot` (rows per series, overlap stacking, medians) and `WaffleColumns` (dot columns per
period, group tints, peak callout). New building blocks `Dots` and `NearestPointer`;
`thresholds()` for tones and legend counts; `tally-charts/core` gains `binDots`, `stackStrip`,
`medianOf`, `packWaffle` and `thresholds`. Arrow keys move within and across stacks and rows
(`ChartPoint.group`).

Changes: bars and scales now use the strict number rule, so blank strings and booleans in data
are missing instead of 0 or 1. Stacked `RankedBars` rows give each label more room from the
bar above.
```

- [ ] **Step 7: Build and verify everything**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS. Record every size-limit number. Never raise a budget.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts .changeset
git commit -m "feat: export the dot charts and building blocks; budgets and docs"
```

---

### Task 10: Reference stories, e2e and baselines

**Files:**
- Create: `apps/storybook/stories/JobsByMargin.stories.tsx`, `DallasInstalls.stories.tsx`, `ProfitLeaked.stories.tsx`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Create: 6 darwin and 6 linux PNGs, plus the linux `reference-drill-columns--light.png` refreshed by Task 8

**Interfaces:**
- Consumes: the public API from Task 9.
- Produces: the story ids
  - `reference-jobs-by-margin--light` and `--dark`
  - `reference-dallas-installs--light` and `--dark`
  - `reference-profit-leaked--light` and `--dark`

- [ ] **Step 1: Write the stories**

Create `apps/storybook/stories/JobsByMargin.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { DotHistogram, fmt, Legend, thresholds } from 'tally-charts'

// docs/reference/02-jobs-dot-histogram-table.png, card "158 jobs by margin".
const customers = [
  'Brookside Apartments',
  'Cedar Park Lofts',
  'Lakeview Dental',
  'ABC Property Group',
  'Garza residence',
]

/** n deterministic values between from and to, bunched towards the middle. */
function spread(n: number, from: number, to: number, a: number, b: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const u = (((i * a) % n) / n + ((i * b) % n) / n) / 2
    return Math.round((from + (to - from) * u) * 10) / 10
  })
}

const margins = [
  3.1,
  4.2,
  6.1,
  7.7,
  8.8,
  9.4,
  ...spread(16, 10.2, 24.6, 7, 11),
  ...spread(42, 25.3, 37.7, 13, 17),
  ...spread(94, 38.2, 57.4, 37, 53),
]
const jobs = margins.map((margin, i) => ({
  id: i === 8 ? 5819 : 5700 + i,
  margin: i === 8 ? 12.3 : margin,
  customer: i === 8 ? 'ABC Property Group' : (customers[i % customers.length] as string),
}))

const bands = thresholds(
  [10, 25, 38],
  ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'],
)

function JobsByMargin() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">158 jobs by margin</h2>
          <span className="card-meta">One dot per job completed this week</span>
        </div>
        <Legend shape="dot" items={bands.legend(jobs.map((j) => j.margin))} />
      </header>
      <DotHistogram
        title="Jobs by margin this week"
        description="94 of 158 jobs reached the 38% target; 6 are critical, below 10%."
        data={jobs}
        value="margin"
        id="id"
        label={(d) => `#${d.id}`}
        segments={(d) => [
          { value: `#${d.id}` },
          { value: fmt.percent(d.margin) },
          { value: d.customer },
        ]}
        format="percent"
        toneBy={bands}
        domain={[0, 60]}
        target={{ value: 38, label: 'Target 38%' }}
        calloutId={5819}
        height={240}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Jobs by margin',
  component: JobsByMargin,
} satisfies Meta<typeof JobsByMargin>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Check the legend counts. `margins` holds 6 critical (<10), 16 at risk (10.2–24.6), 42 below target (25.3–37.7) and 94 on target (38.2–57.4) values: 158 in all. Item 8 becomes #5819 at 12.3%, which is still at risk. The legend must read Critical 6, At risk 16, Below target 42, On target 94. If it doesn't, fix the data, not the chart.

Create `apps/storybook/stories/DallasInstalls.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, StripPlot } from 'tally-charts'

// docs/reference/06-drilldown-strip-plot.png, card "29 Dallas installs, hours per job".
const estimated = [
  5.2, 5.6, 5.7, 5.8, 5.8, 5.9, 5.9, 6.0, 6.0, 6.0, 6.1, 6.1, 6.1, 6.1, 6.1, 6.2, 6.2, 6.2, 6.3,
  6.3, 6.4, 6.4, 6.5, 6.5, 6.6, 6.7, 6.8, 7.0, 7.2,
]
const actual = [
  6.3, 6.9, 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.0, 8.0, 8.1, 8.1, 8.2, 8.2, 8.3, 8.4, 8.5,
  8.6, 8.8, 9.0, 9.2, 9.5, 9.8, 10.2, 10.6, 11.0, 11.6,
]
const installs = estimated.map((est, i) => ({ job: `#${5900 + i}`, est, act: actual[i] ?? null }))

function DallasInstalls() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">29 Dallas installs, hours per job</h2>
          <span className="card-meta">Each dot is one install, estimated against actual</span>
        </div>
        <Delta value={34} format="percent" good="down" signed />
      </header>
      <StripPlot
        title="Install hours, estimated against actual"
        description="Installs take 8.2 hours at the median against 6.1 estimated."
        data={installs}
        label="job"
        series={[
          { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
          { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
        ]}
        format="hours"
        domain={[4, 12]}
        axisFormat={(v) => `${v} h`}
        radius={4}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Dallas installs',
  component: DallasInstalls,
} satisfies Meta<typeof DallasInstalls>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Both arrays are sorted, with 29 values each. Their medians (the 15th value) are 6.1 and 8.2, matching the reference labels.

Create `apps/storybook/stories/ProfitLeaked.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, Stat, WaffleColumns } from 'tally-charts'

// docs/reference/05-leakage-heatmap.png, card "Profit leaked".
const weeks = [
  { week: 'Aug 3', leaked: 9800, month: 'August' },
  { week: 'Aug 10', leaked: 10200, month: 'August' },
  { week: 'Aug 17', leaked: 9600, month: 'August' },
  { week: 'Aug 24', leaked: 7900, month: 'August' },
  { week: 'Aug 31', leaked: 10100, month: 'September' },
  { week: 'Sep 7', leaked: 23400, month: 'September' },
  { week: 'Sep 14', leaked: 10600, month: 'September' },
  { week: 'Sep 21', leaked: 9400, month: 'September' },
]

function ProfitLeaked() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Profit leaked</h2>
        <span className="card-meta">4.4 pts of margin on $1.86M revenue</span>
      </header>
      <Stat
        value={82400}
        format="currency-compact"
        delta={<Delta value={8300} format="currency-compact" good="down" />}
        caption="vs the same days in August"
      />
      <div style={{ marginTop: 32 }}>
        <WaffleColumns
          title="Profit leaked by week"
          description="September leaked more than August; the week of Sep 7 peaked at $23.4K."
          data={weeks}
          x="week"
          y="leaked"
          group="month"
          unit={2000}
          format="currency-compact"
          height={180}
        />
      </div>
    </article>
  )
}

const meta = { title: 'Reference/Profit leaked', component: ProfitLeaked } satisfies Meta<
  typeof ProfitLeaked
>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Run `pnpm --filter storybook-app typecheck`. Expected: PASS.

- [ ] **Step 2: Look at the stories next to their references**

Start your own dev server on a free port (`pnpm --filter storybook-app exec storybook dev -p 6010 --no-open`). Another session may have one on 6006; leave that alone. Screenshot each story into your scratchpad and compare it with references 02 (top card), 06 (bottom-left card) and 05 (top-left card).

Check:
- **Dot histogram:** dots in neat stacks, tones matching the legend, the dashed target with its label, the pinned #5819 pill with a stem.
- **Strip plot:** two rows, dots lifted only where they'd overlap, dashed medians with tinted labels.
- **Waffle:** two-wide dot columns, grey August and pink September, a solid peak column, the "Peak" pill, month labels.
- **Dark mode** for all three.

Wrong layout, colors, clipping or overlapping text are defects. Fix them in the library with a unit test, list them in the report, then continue. Spacing nuances are fine. Stop your dev server afterwards.

- [ ] **Step 3: Extend the e2e suite**

In `apps/storybook/e2e/stories.spec.ts`:

Add to `STORIES`:

```ts
  'reference-jobs-by-margin--light',
  'reference-jobs-by-margin--dark',
  'reference-dallas-installs--light',
  'reference-dallas-installs--dark',
  'reference-profit-leaked--light',
  'reference-profit-leaked--dark',
```

Add to `WIDE_STORIES`:

```ts
  'reference-jobs-by-margin--light': { width: 1280, height: 600 },
  'reference-jobs-by-margin--dark': { width: 1280, height: 600 },
  'reference-dallas-installs--light': { width: 1280, height: 600 },
  'reference-dallas-installs--dark': { width: 1280, height: 600 },
```

Append:

```ts
test('the dot histogram walks bins with the arrow keys', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-jobs-by-margin--light')
  const chart = page.getByRole('figure', { name: 'Jobs by margin this week' })
  await chart.focus()
  await page.keyboard.press('ArrowRight')
  await expect(chart.locator('[aria-live]')).toHaveText('#5700, 3.1%')
  await page.keyboard.press('ArrowRight')
  await expect(chart.locator('[aria-live]')).toHaveText('#5701, 4.2%')
})

test('hovering near a strip dot shows its tooltip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-dallas-installs--light')
  const box = await page.locator('[data-ch-part="dot"]').first().boundingBox()
  if (!box) throw new Error('no dot')
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Estimated')
})

test('the waffle pins its peak and hands over to the tooltip on hover', async ({ page }) => {
  await open(page, 'reference-profit-leaked--light')
  const callout = page.locator('[data-ch-part="callout"]')
  await expect(callout).toContainText('Sep 7')
  const box = await page.locator('[data-ch-part="dot"]').first().boundingBox()
  if (!box) throw new Error('no dot')
  await page.mouse.move(box.x + box.width / 2, box.y - 20)
  await expect(callout).toHaveCount(0)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Aug 3')
})
```

- [ ] **Step 4: Generate darwin baselines and verify**

Run: `pnpm --filter storybook-app exec playwright test --update-snapshots=missing`, then `pnpm test:e2e`.
Expected: the second run PASSES with 60 tests: 24 stories × 2, plus 12 interaction tests. `git status` shows 6 new darwin PNGs, and no other darwin PNG changed (Task 8 already refreshed the drill baseline). Open each new PNG. Each must show the full card, with grown, non-overlapping dots and the pinned pills.

- [ ] **Step 5: Generate and verify linux baselines**

Run the docker route from the comment above the `e2e` job in `.github/workflows/ci.yml`, from the repo root, with Docker running. It regenerates the baselines, re-runs the suite without updating, and copies the PNGs out only if that run passes. Expected:
- 6 new linux PNGs;
- the refreshed `linux/reference-drill-columns--light.png` (Task 8's change);
- no other linux PNG changed.

Open each new or changed linux PNG.

- [ ] **Step 6: Full verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm test:e2e`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add apps/storybook
git commit -m "test: dot chart reference stories, e2e and baselines"
```

---

## After the plan

The 0.5 plan (`LineChart`, `Heatmap`) reuses `NearestPointer axis="x"` for snapping to the nearest x across series, `Callout`, `Target`, `thresholds()` (heatmap bins) and `Legend`.
