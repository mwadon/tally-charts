# tally-charts 0.3 Waterfall and Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `tally-charts` 0.3: `WaterfallChart` ("Why it is under target") and `BridgeChart` ("Planned $1,260, kept $400"), plus the building blocks they need: `Connector`, `ColumnHighlight`, `Area`, `Callout`, and a highlighted label on `Axis`. Each chart gets a reference story that passes the visual, accessibility and bundle-size checks.

**Architecture:** The 0.1/0.2 layering stays.
- `core` gains `runningTotals`, the cumulative math shared by both charts, and `areaPath`.
- New marks read `<Chart>` context like the existing ones.
- `Callout` reuses the tooltip's HTML overlay and placement.
- Both charts are compositions of `<Chart>`, `<Bars>` (with `from` for floating segments), `RowLabels`, `Axis` and the new marks, following the `RankedBars` and `ComparisonBars` patterns:
  - internal rows wrap the user's datum, and `userCallbacks` unwraps it for callbacks
  - a hidden data table is on by default
  - `children` render after the chart's own marks

**Tech Stack:** unchanged from 0.2. No new runtime or dev dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-design.md`. Reference screenshots:
- `docs/reference/01-gross-margin-waterfall.png`, right card "Why it is under target" (waterfall)
- `docs/reference/04-profit-bridge.png`, top card "Planned $1,260, kept $400" (bridge)

This is plan 3 of 6. `main` is at `9777e33` with 0.1 and 0.2 merged. **Execute on a new branch `feat/0.3-waterfall-bridge` from `main`.**

## Global Constraints

**Toolchain and packaging**
- Node `>=22` (developed on 24); `packageManager` is `pnpm@12.4.2`. No new dependencies of any kind.
- Runtime dependencies stay `d3-scale@^4.0.2` (import `scaleBand` only, never `scaleLinear`) and `d3-array@^3.2.4`.
- ESM only. `sideEffects: ["*.css"]`. Subpath exports `tally-charts`, `tally-charts/core`, `tally-charts/theme.css`. The main entry keeps its `'use client'` banner; `core` stays React-free.
- Bundle budgets (min+gzip, d3 included): `core` ≤ 8 KB; any single chart ≤ 15 KB. Never raise a budget to make a check pass; report the measured number instead.

**Naming and API surface**
- CSS tokens use the `--ch-` prefix. Part hooks are `data-ch-part`, `data-ch-tone`, `data-ch-fill`. `ch-*` class names are internal, not API.
- Tones: `accent | accent-soft | loss | warn | gain | neutral`. Fills: `solid | hatch | hatch-fade`.
- Shared prop names (spec §6): `data`, `x`, `y`, `id`, `label`, `tone`, `fill`, `format`, `height`/`aspectRatio`, `initialWidth`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`, `className`, `style`.
- High-level charts:
  - render `children` inside their `<Chart>` after their own marks
  - render a hidden data table by default (`dataTable` prop, default `true`)
  - report the user's original objects as `point.datum` in `onSelect`/`onActiveChange`, via `userCallbacks` in `react/charts/shared.ts`
- Every exported component has an exported `XxxProps` type. No `any` in the public API.

**Formatting**
- Default locale `en-US`, currency `USD`. Negative numbers use U+2212 (`−`), never a hyphen. Format through `useFormat()` / `ctx.format`, so `ChartsProvider` applies.

**Errors and warnings**
- Bad data never throws. The only throw is a building block rendered outside `<Chart>`.
- Development warnings go through `createWarner()` (or `ctx.warn`), start with `[tally-charts] `, fire once per key per chart, and every call sits inside `if (DEV) { … }` (`DEV` from `core/warn`).

**Accessibility and motion**
- The chart root is a `<figure>` and a single tab stop. Every hover state is also reachable by keyboard. Selection happens on bar hit areas (`click`) and with Enter/Space.
- `prefers-reduced-motion` and `animate={false}` disable all motion. SVG text never takes pointer events. Only `bar-hit` rects take pointer events.

**Code style and commits**
- Biome: 2 spaces, single quotes, no semicolons, line width 100. Run `pnpm format` before every commit. `pnpm lint` must exit 0; 4 `noImportantStyles` warnings and 1 biome info are expected.
- Conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`), ending with the `Co-Authored-By:` trailer that names the model which wrote the code.
- Commands run from the repo root unless a step says otherwise. Unit tests: `pnpm test`, or `pnpm --filter tally-charts exec vitest run <path>` for one file. The shell is zsh, so quote globs.

**Deferred** (not in 0.3, don't build): dot charts, lines, heatmap, `Band`, `Dots`, `Grid`, point/time scales, curved areas, docs site.

## Design decisions this plan makes

1. **No `d3-shape`.** The bridge's area is a straight-line polygon from the core `areaPath`. The spec allows `d3-shape` from 0.3 but doesn't require it. It arrives with curved lines in 0.5.
2. **Waterfall domains leave out zero by default.** The reference axis runs 34%–38%. The start and end bars therefore begin at the domain minimum, which `<Bars>` already does by clamping its zero baseline into the domain. An explicit `domain` overrides this.
3. **`Connector` is declarative.** A link names a value on the linear axis and two bands (`{ at, from, to }`). Optional px insets let it meet bars that are thinner than their band.
4. **`Callout` lives in the HTML overlay**, like `Tooltip`. It appears after mount, so it's absent from server output, and the overlay is `aria-hidden`. Its information must also live in the data table and announcements. By default it hides while any point is active, so it never fights the tooltip.
5. **Ids:**
   - Waterfall: the start row is `'start'`, the end row is `'end'`, and each step is `step.id ?? index` (its index in `steps`).
   - Bridge: the start column is `'start'`, and each step is `step.id ?? index`.
   - User ids `'start'` and `'end'` are reserved; this is documented.
6. **Bridge columns.**
   - Each step column has a "remaining" bar from 0 to the lower of the totals before and after the step.
   - A cap covers the difference, `loss` hatched when the step is negative and `gain` hatched when it is positive.
   - The last column is solid accent and highlighted (`highlightLast`, default `true`).

## Review Focus

These failure modes follow from the spec but aren't obviously covered by a feature test. Each one has a pinned test in the task that owns the code.

1. **A step with a missing or non-numeric value.** No throw. The row or column and its label stay, the running total is unchanged, no `NaN` appears in the output, and there is exactly one warning. Tests:
   - Task 5, "skips a missing step without breaking the total"
   - Task 6, "skips a missing step without breaking the total"
2. **A missing start value.** The chart shows its empty slot instead of guessing a baseline. Tests: Task 5 and Task 6, "renders the empty slot when the start value is missing".
3. **A bridge total that falls below zero.** Geometry stays finite, the remaining bar goes below the baseline, and the cap still spans before→after. Test: Task 6, "keeps geometry right when the total goes below zero".
4. **No steps at all.** The waterfall shows start and end with one connector. The bridge shows a single highlighted column. Tests: Task 5, "handles a chart with no steps", and Task 6, "draws a single column without steps".
5. **A callout for an unknown id, or during server rendering.** It renders nothing and doesn't throw. Tests: Task 4, "renders nothing for an unknown id", and Task 7, the SSR test for `ProfitBridge`.

---

## File Structure

```
packages/tally-charts/
  src/core/steps.ts (+ test)                runningTotals                         (Task 1)
  src/core/area.ts (+ test)                 areaPath                              (Task 1)
  src/core/index.ts                         + runningTotals, areaPath             (Task 1)
  src/react/marks/Connector.tsx (+ test)    Connector                             (Task 2)
  src/react/marks/ColumnHighlight.tsx (+ test)  ColumnHighlight                   (Task 2)
  src/react/marks/Axis.tsx (+ test)         highlight prop                        (Task 2)
  src/react/marks/Area.tsx (+ test)         Area                                  (Task 3)
  src/react/overlays/Callout.tsx (+ test)   Callout                               (Task 4)
  src/react/charts/WaterfallChart.tsx (+ test)                                    (Task 5)
  src/react/charts/BridgeChart.tsx (+ test)                                       (Task 6)
  src/theme/theme.css                       connector, highlight, area, callout, bridge labels (Tasks 2–6)
  src/index.ts, src/index.test.ts           exports                               (Task 7)
  .size-limit.json, README.md, test/fixtures.tsx, src/ssr.node.test.tsx           (Task 7)
.changeset/tally-charts-0-3.md                                                    (Task 7)
apps/storybook/stories/WhyUnderTarget.stories.tsx, ProfitBridge.stories.tsx      (Task 8)
apps/storybook/e2e/stories.spec.ts, e2e/__screenshots__/{darwin,linux}/          (Task 8)
```

---
### Task 1: Core: running totals and area paths

**Files:**
- Create: `packages/tally-charts/src/core/steps.ts`
- Test: `packages/tally-charts/src/core/steps.test.ts`
- Create: `packages/tally-charts/src/core/area.ts`
- Test: `packages/tally-charts/src/core/area.test.ts`
- Modify: `packages/tally-charts/src/core/index.ts`
- Test: `packages/tally-charts/src/index.test.ts`

**Interfaces:**
- Produces:
  - `type StepTone = 'gain' | 'loss' | 'neutral'`
  - `interface StepTotal { index: number; value: number; before: number; after: number; valid: boolean; tone: StepTone }`
  - `runningTotals(start: number, values: readonly unknown[]): StepTotal[]`. A missing or non-numeric value has `valid: false`, a `NaN` value, `after === before` and tone `'neutral'`. A non-finite `start` counts as 0.
  - `interface AreaPoint { x: number; y: number }`
  - `areaPath(points: readonly AreaPoint[], baseline: number): string`. It returns a closed path through the points and back along `baseline`, rounded to 2 decimals. Non-finite points are dropped. Fewer than two points, or a non-finite baseline, give `''`.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/core/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { runningTotals } from './steps'

describe('runningTotals', () => {
  it('carries the total from step to step', () => {
    const totals = runningTotals(1260, [-260, -260, -240, -100])
    expect(totals.map((t) => [t.before, t.after])).toEqual([
      [1260, 1000],
      [1000, 740],
      [740, 500],
      [500, 400],
    ])
    expect(totals.every((t) => t.valid && t.tone === 'loss')).toBe(true)
    expect(totals[2]).toMatchObject({ index: 2, value: -240 })
  })

  it('tones rises as gains and zero as neutral', () => {
    expect(runningTotals(10, [5, 0, -1]).map((t) => t.tone)).toEqual(['gain', 'neutral', 'loss'])
  })

  it('skips missing or non-numeric values without changing the total', () => {
    const totals = runningTotals(10, [5, null, 'x', undefined, -3])
    expect(totals.map((t) => t.after)).toEqual([15, 15, 15, 15, 12])
    expect(totals.map((t) => t.valid)).toEqual([true, false, false, false, true])
    expect(totals[1]?.tone).toBe('neutral')
    expect(Number.isNaN(totals[1]?.value)).toBe(true)
  })

  it('counts a non-finite start as zero and handles no steps', () => {
    expect(runningTotals(Number.NaN, [4])[0]).toMatchObject({ before: 0, after: 4 })
    expect(runningTotals(10, [])).toEqual([])
  })
})
```

Create `packages/tally-charts/src/core/area.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { areaPath } from './area'

describe('areaPath', () => {
  it('runs through the points and closes along the baseline', () => {
    const path = areaPath(
      [
        { x: 0, y: 10 },
        { x: 50, y: 20 },
        { x: 100, y: 5 },
      ],
      100,
    )
    expect(path).toBe('M0,10L50,20L100,5L100,100L0,100Z')
  })

  it('drops non-finite points and rounds to two decimals', () => {
    const path = areaPath(
      [
        { x: 1.23456, y: 2 },
        { x: Number.NaN, y: 3 },
        { x: 10, y: 4.006 },
      ],
      20,
    )
    expect(path).toBe('M1.23,2L10,4.01L10,20L1.23,20Z')
  })

  it('returns an empty path when there is nothing to fill', () => {
    expect(areaPath([{ x: 1, y: 1 }], 10)).toBe('')
    expect(areaPath([], 10)).toBe('')
    expect(
      areaPath(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        Number.NaN,
      ),
    ).toBe('')
  })
})
```

In `packages/tally-charts/src/index.test.ts`, add `'runningTotals'` and `'areaPath'` to the `'core exports %s'` list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/steps.test.ts src/core/area.test.ts src/index.test.ts`
Expected: FAIL. The modules are missing, and the core entry doesn't export the functions.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/core/steps.ts`:

```ts
export type StepTone = 'gain' | 'loss' | 'neutral'

export interface StepTotal {
  index: number
  /** The step's value; NaN when it was missing or not a number. */
  value: number
  /** Running total before the step. */
  before: number
  /** Running total after the step; equals `before` for an invalid step. */
  after: number
  /** False for a missing or non-numeric value, which then changes nothing. */
  valid: boolean
  tone: StepTone
}

/** Cumulative totals for waterfall steps and bridge columns. Never throws on bad values. */
export function runningTotals(start: number, values: readonly unknown[]): StepTotal[] {
  let total = Number.isFinite(start) ? start : 0
  return values.map((raw, index) => {
    const value = raw === null || raw === undefined ? Number.NaN : Number(raw)
    const valid = Number.isFinite(value)
    const before = total
    if (valid) total += value
    const tone: StepTone = !valid || value === 0 ? 'neutral' : value > 0 ? 'gain' : 'loss'
    return { index, value, before, after: total, valid, tone }
  })
}
```

Create `packages/tally-charts/src/core/area.ts`:

```ts
export interface AreaPoint {
  x: number
  y: number
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * A closed SVG path through the points (straight segments) and back along the baseline.
 * Non-finite points are dropped; fewer than two points or a bad baseline give ''.
 */
export function areaPath(points: readonly AreaPoint[], baseline: number): string {
  const kept = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const first = kept[0]
  const last = kept[kept.length - 1]
  if (!first || !last || kept.length < 2 || !Number.isFinite(baseline)) return ''
  const line = kept.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)},${round(p.y)}`).join('')
  const base = round(baseline)
  return `${line}L${round(last.x)},${base}L${round(first.x)},${base}Z`
}
```

In `packages/tally-charts/src/core/index.ts`, add, keeping the file's alphabetical-by-path order:

```ts
export type { AreaPoint } from './area'
export { areaPath } from './area'
```

and

```ts
export type { StepTone, StepTotal } from './steps'
export { runningTotals } from './steps'
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/core packages/tally-charts/src/index.test.ts
git commit -m "feat(core): running totals and area paths"
```

(End the message with the `Co-Authored-By:` trailer naming your model.)

---

### Task 2: `Connector`, `ColumnHighlight` and a highlighted `Axis` label

**Files:**
- Create: `packages/tally-charts/src/react/marks/Connector.tsx`
- Test: `packages/tally-charts/src/react/marks/Connector.test.tsx`
- Create: `packages/tally-charts/src/react/marks/ColumnHighlight.tsx`
- Test: `packages/tally-charts/src/react/marks/ColumnHighlight.test.tsx`
- Modify: `packages/tally-charts/src/react/marks/Axis.tsx`
- Test: `packages/tally-charts/src/react/marks/Axis.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `useChart` (`ctx.x`/`ctx.y` resolved scales, `ctx.margin`, `ctx.width`, `ctx.height`, `ctx.warn`), `DEV`.
- Produces:
  - `interface ConnectorLink { at: number; from: string | number; to: string | number }` and `interface ConnectorProps { links: readonly ConnectorLink[]; fromInset?: number; toInset?: number }`.
  - `Connector(props)` renders `<g data-ch-part="connectors">` with one `<line data-ch-part="connector">` per drawable link. The line runs at the linear-axis value `at`, clamped into the plot. It goes from the far edge of band `from` (minus `fromInset`) to the near edge of band `to` (plus `toInset`). It works with the band scale on either axis.
  - `interface ColumnHighlightProps { at: string | number; pad?: number; radius?: number }` and `ColumnHighlight(props)`, which renders `<rect data-ch-part="column-highlight">` behind one band. The defaults are `pad` 12 and `radius` 16. When the band is on x, the rect spans the full chart height including margins. When the band is on y, it spans the full chart width.
  - `AxisProps.highlight?: string | number`. The matching label gets `data-ch-active="true"`.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/marks/Connector.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Connector, type ConnectorProps } from './Connector'

const frame = { margin: { top: 0, right: 0, bottom: 0, left: 0 }, animate: false }
const lines = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="connector"]')]

function rows(props: ConnectorProps) {
  // Bands a, b, c on y: 30px each. Linear x: 0–100 over 200px.
  return render(
    <Chart
      {...frame}
      width={200}
      height={90}
      x={{ domain: [0, 100] }}
      y={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
    >
      <Connector {...props} />
    </Chart>,
  )
}

describe('<Connector>', () => {
  it('draws a vertical line between two rows at a value', () => {
    const { container } = rows({ links: [{ at: 50, from: 'a', to: 'b' }] })
    const [line] = lines(container)
    expect(line).toHaveAttribute('x1', '100')
    expect(line).toHaveAttribute('x2', '100')
    expect(line).toHaveAttribute('y1', '30')
    expect(line).toHaveAttribute('y2', '30')
  })

  it('pulls the ends in by the insets', () => {
    const { container } = rows({
      links: [{ at: 50, from: 'a', to: 'b' }],
      fromInset: 4,
      toInset: 12,
    })
    expect(lines(container)[0]).toHaveAttribute('y1', '26')
    expect(lines(container)[0]).toHaveAttribute('y2', '42')
  })

  it('clamps values outside the domain and skips unknown bands or bad values', () => {
    const { container } = rows({
      links: [
        { at: 150, from: 'b', to: 'c' },
        { at: 10, from: 'a', to: 'zzz' },
        { at: Number.NaN, from: 'a', to: 'b' },
      ],
    })
    expect(lines(container)).toHaveLength(1)
    expect(lines(container)[0]).toHaveAttribute('x1', '200')
  })

  it('draws a horizontal line between columns when the band is on x', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        height={100}
        x={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
        y={{ domain: [0, 100] }}
      >
        <Connector links={[{ at: 50, from: 'a', to: 'c' }]} />
      </Chart>,
    )
    const [line] = lines(container)
    expect(line).toHaveAttribute('x1', '100')
    expect(line).toHaveAttribute('x2', '200')
    expect(line).toHaveAttribute('y1', '50')
  })

  it('warns and draws nothing without a band scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart {...frame} width={100} height={100} x={{ domain: [0, 1] }} y={{ domain: [0, 1] }}>
        <Connector links={[{ at: 0.5, from: 'a', to: 'b' }]} />
      </Chart>,
    )
    expect(lines(container)).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Connector needs'))
  })
})
```

Create `packages/tally-charts/src/react/marks/ColumnHighlight.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { ColumnHighlight } from './ColumnHighlight'

const rect = (root: HTMLElement) => root.querySelector('[data-ch-part="column-highlight"]')

describe('<ColumnHighlight>', () => {
  it('backs one column across the whole chart height', () => {
    const { container } = render(
      <Chart
        width={300}
        height={130}
        margin={{ top: 10, right: 0, bottom: 20, left: 0 }}
        x={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <ColumnHighlight at="b" />
      </Chart>,
    )
    expect(rect(container)).toHaveAttribute('x', '88')
    expect(rect(container)).toHaveAttribute('width', '124')
    expect(rect(container)).toHaveAttribute('y', '-10')
    expect(rect(container)).toHaveAttribute('height', '130')
    expect(rect(container)).toHaveAttribute('rx', '16')
  })

  it('backs one row across the whole chart width when the band is on y', () => {
    const { container } = render(
      <Chart
        width={300}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ domain: [0, 1] }}
        y={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
      >
        <ColumnHighlight at="b" pad={4} />
      </Chart>,
    )
    expect(rect(container)).toHaveAttribute('y', '36')
    expect(rect(container)).toHaveAttribute('height', '48')
    expect(rect(container)).toHaveAttribute('x', '0')
    expect(rect(container)).toHaveAttribute('width', '300')
  })

  it('draws nothing for an unknown band', () => {
    const { container } = render(
      <Chart width={300} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
        <ColumnHighlight at="zzz" />
      </Chart>,
    )
    expect(rect(container)).toBeNull()
  })
})
```

Append inside `describe('<Axis>', …)` in `packages/tally-charts/src/react/marks/Axis.test.tsx`:

```tsx
  it('marks the highlighted label', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        x={{ type: 'band', domain: ['W1', 'W2', 'W3'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" highlight="W2" />
      </Chart>,
    )
    const marked = [...container.querySelectorAll('[data-ch-part="axis-label"]')].map((el) =>
      el.getAttribute('data-ch-active'),
    )
    expect(marked).toEqual([null, 'true', null])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks`
Expected: FAIL. The two modules are missing and `highlight` is ignored.

- [ ] **Step 3: Implement `Connector`**

Create `packages/tally-charts/src/react/marks/Connector.tsx`:

```tsx
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface ConnectorLink {
  /** Value on the chart's linear axis where the line runs. */
  at: number
  /** Band the line leaves, from its far edge. */
  from: string | number
  /** Band the line reaches, at its near edge. */
  to: string | number
}

export interface ConnectorProps {
  links: readonly ConnectorLink[]
  /** Pulls the start back from the far edge of `from`, in px. Default 0. */
  fromInset?: number
  /** Pushes the end into `to`, in px, e.g. to meet a bar that sits at the bottom of its band. Default 0. */
  toInset?: number
}

/** Dotted step lines between bands, e.g. from one waterfall bar to the next. */
export function Connector({ links, fromInset = 0, toInset = 0 }: ConnectorProps) {
  const ctx = useChart('Connector')
  const bandOnY = ctx.y.kind === 'band'
  const band = bandOnY ? ctx.y : ctx.x
  const linear = bandOnY ? ctx.x : ctx.y
  if (band.kind !== 'band' || linear.kind !== 'linear') {
    if (DEV) ctx.warn('connector-scales', 'Connector needs one band scale and one linear scale on <Chart>.')
    return null
  }
  const size = band.scale.bandwidth()
  const [r0, r1] = linear.scale.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  const lines = links.flatMap((link, i) => {
    const a = band.scale(String(link.from))
    const b = band.scale(String(link.to))
    if (a === undefined || b === undefined || !Number.isFinite(link.at)) return []
    const v = Math.min(hi, Math.max(lo, linear.scale(link.at)))
    const start = a + size - fromInset
    const end = b + toInset
    return [
      bandOnY
        ? { key: i, x1: v, x2: v, y1: start, y2: end }
        : { key: i, x1: start, x2: end, y1: v, y2: v },
    ]
  })
  return (
    <g data-ch-part="connectors">
      {lines.map(({ key, ...line }) => (
        <line key={key} data-ch-part="connector" {...line} />
      ))}
    </g>
  )
}
```

- [ ] **Step 4: Implement `ColumnHighlight`**

Create `packages/tally-charts/src/react/marks/ColumnHighlight.tsx`:

```tsx
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface ColumnHighlightProps {
  /** The band (category) to back. */
  at: string | number
  /** Extra room around the band, in px. Default 12. */
  pad?: number
  /** Corner radius in px. Default 16. */
  radius?: number
}

/** A soft backdrop behind one column (or row), drawn before the marks. */
export function ColumnHighlight({ at, pad = 12, radius = 16 }: ColumnHighlightProps) {
  const ctx = useChart('ColumnHighlight')
  const bandOnX = ctx.x.kind === 'band'
  const band = bandOnX ? ctx.x : ctx.y
  if (band.kind !== 'band') {
    if (DEV) ctx.warn('column-highlight-scale', 'ColumnHighlight needs a band scale on <Chart>.')
    return null
  }
  const start = band.scale(String(at))
  if (start === undefined) return null
  const size = band.scale.bandwidth()
  const rect = bandOnX
    ? { x: start - pad, y: -ctx.margin.top, width: size + 2 * pad, height: ctx.height }
    : { x: -ctx.margin.left, y: start - pad, width: ctx.width, height: size + 2 * pad }
  return <rect data-ch-part="column-highlight" {...rect} rx={radius} />
}
```

- [ ] **Step 5: Implement `Axis` `highlight`**

In `packages/tally-charts/src/react/marks/Axis.tsx`:
- Add to `AxisProps`:

```ts
  /** A tick value (e.g. a band) whose label is emphasized. */
  highlight?: string | number
```

- Destructure `highlight` in the signature.
- Add to the `<text>` element:

```tsx
          data-ch-active={
            highlight !== undefined && String(tick.value) === String(highlight) ? 'true' : undefined
          }
```

- [ ] **Step 6: Style the new parts**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-part="target"][data-ch-variant="tick"]` rule:

```css
[data-ch-part="axis-label"][data-ch-active="true"] {
  fill: var(--ch-ink);
  font-weight: 500;
}

[data-ch-part="connector"] {
  stroke: var(--ch-ink-muted);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

[data-ch-part="column-highlight"] {
  fill: color-mix(in srgb, var(--ch-accent) 7%, transparent);
}
```

- [ ] **Step 7: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS, and the strip check prints `ok`.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Connector, ColumnHighlight and highlighted axis labels"
```

---

### Task 3: `Area`

**Files:**
- Create: `packages/tally-charts/src/react/marks/Area.tsx`
- Test: `packages/tally-charts/src/react/marks/Area.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `areaPath` (Task 1), `toFieldGetter`, `useChart`, `DEV`, `Tone`, `Accessor`.
- Produces:
  - `interface AreaProps<D> { data?: readonly D[]; x?: Accessor<D, string | number>; y?: Accessor<D, number>; tone?: Tone; opacity?: number }`
  - `Area<D>(props)`. It needs a band scale on x and a linear scale on y. It puts one point at each band's centre and the value, clamped into the plot. It fills down to the zero baseline (clamped into the domain) with a vertical gradient: `tone` at `opacity` (default 0.22) at the top, fading to 0 at the bottom. It renders `<g data-ch-part="area-group">` containing `<path data-ch-part="area" data-ch-tone>` and its own `<linearGradient>`, whose id is `` `${ctx.chartId}-area-${useId}` ``.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/marks/Area.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Area, type AreaProps } from './Area'

type Row = { k: string; v: number | null }
const rows: Row[] = [
  { k: 'a', v: 100 },
  { k: 'b', v: 50 },
  { k: 'c', v: 0 },
]

function renderArea(props: AreaProps<Row> = {}, data: Row[] = rows) {
  return render(
    <Chart<Row>
      data={data}
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'k', padding: 0 }}
      y={{ field: 'v', domain: [0, 100] }}
      animate={false}
    >
      <Area<Row> {...props} />
    </Chart>,
  )
}

const path = (root: HTMLElement) => root.querySelector('[data-ch-part="area"]')

describe('<Area>', () => {
  it('fills from the band centres down to the baseline', () => {
    const { container } = renderArea()
    expect(path(container)).toHaveAttribute('d', 'M50,0L150,50L250,100L250,100L50,100Z')
  })

  it('paints a fading gradient in the tone', () => {
    const { container } = renderArea({ tone: 'loss', opacity: 0.3 })
    const fill = path(container)?.getAttribute('fill') ?? ''
    const id = fill.match(/^url\(#(.+)\)$/)?.[1] ?? ''
    const gradient = container.querySelector(`[id="${id}"]`)
    expect(gradient?.tagName.toLowerCase()).toBe('lineargradient')
    const stops = gradient?.querySelectorAll('stop') ?? []
    expect(stops[0]).toHaveStyle({ stopColor: 'var(--ch-loss)', stopOpacity: '0.3' })
    expect(stops[1]).toHaveStyle({ stopOpacity: '0' })
    expect(path(container)).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('skips missing values and draws nothing with fewer than two points', () => {
    const { container, unmount } = renderArea({}, [
      { k: 'a', v: 100 },
      { k: 'b', v: null },
      { k: 'c', v: 0 },
    ])
    expect(path(container)).toHaveAttribute('d', 'M50,0L250,100L250,100L50,100Z')
    unmount()
    const single = renderArea({}, [{ k: 'a', v: 10 }])
    expect(path(single.container)).toBeNull()
  })

  it('warns and draws nothing without a band x and a linear y', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart data={rows} width={300} x={{ field: 'v', domain: [0, 1] }} y={{ field: 'v', domain: [0, 1] }}>
        <Area<Row> />
      </Chart>,
    )
    expect(path(container)).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Area needs'))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks/Area.test.tsx`
Expected: FAIL, because `./Area` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/marks/Area.tsx`:

```tsx
import { useId } from 'react'
import { toFieldGetter } from '../../core/accessor'
import { areaPath } from '../../core/area'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface AreaProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Band field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number>
  /** Value field. Defaults to the field on <Chart y>. */
  y?: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
  /** Opacity at the top of the gradient; it fades to 0 at the baseline. Default 0.22. */
  opacity?: number
}

const toNumber = (raw: unknown) => (raw === null || raw === undefined ? Number.NaN : Number(raw))

/** A soft gradient area through the band centres, e.g. joining the tops of bridge columns. */
export function Area<D>({ data, x, y, tone = 'accent', opacity = 0.22 }: AreaProps<D>) {
  const ctx = useChart('Area')
  const gradientId = `${ctx.chartId}-area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  if (ctx.x.kind !== 'band' || ctx.y.kind !== 'linear') {
    if (DEV) ctx.warn('area-scales', 'Area needs a band scale on <Chart x> and a linear scale on <Chart y>.')
    return null
  }
  const getX = toFieldGetter(x) ?? ctx.x.field
  const getY = toFieldGetter(y) ?? ctx.y.field
  if (!getX || !getY) {
    if (DEV) ctx.warn('area-fields', 'Area needs x and y fields: pass them to <Area> or set `field` on <Chart x/y>.')
    return null
  }
  const band = ctx.x.scale
  const linear = ctx.y.scale
  const [r0, r1] = linear.range()
  const clamp = (px: number) => Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
  const [d0, d1] = linear.domain()
  const baseline = clamp(linear(Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1))))
  const half = band.bandwidth() / 2
  const rows = (data ?? ctx.data) as readonly D[]
  const points = rows.flatMap((d, i) => {
    const start = band(String(getX(d, i)))
    const value = toNumber(getY(d, i))
    if (start === undefined || !Number.isFinite(value)) return []
    return [{ x: start + half, y: clamp(linear(value)) }]
  })
  const path = areaPath(points, baseline)
  if (!path) return null
  return (
    <g data-ch-part="area-group">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: `var(--ch-${tone})`, stopOpacity: opacity }} />
          <stop offset="1" style={{ stopColor: `var(--ch-${tone})`, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path data-ch-part="area" data-ch-tone={tone} d={path} fill={`url(#${gradientId})`} />
    </g>
  )
}
```

`useId` is called before any early return, so the hook order never changes.

- [ ] **Step 4: Style and animate**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-dimmed="true"]` rule:

```css
[data-ch-part="area"] {
  pointer-events: none;
}

[data-ch-animate="true"] [data-ch-part="area"] {
  animation: ch-fade var(--ch-duration) var(--ch-ease) both;
}

@keyframes ch-fade {
  from {
    opacity: 0;
  }
}
```

The existing "Motion off" rules already disable this under `animate={false}` and reduced motion.

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS. If jsdom drops `stopColor`/`stopOpacity` from the inline style (0.2 verified it keeps SVG properties like `fill` and `mask`), report the actual style string. Keep the assertion on what jsdom does preserve, and say so in the report.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Area (gradient fill through band centres)"
```

---

### Task 4: `Callout`

**Files:**
- Create: `packages/tally-charts/src/react/overlays/Callout.tsx`
- Test: `packages/tally-charts/src/react/overlays/Callout.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `useChart` (`ctx.points`, `ctx.activeId`, `ctx.overlay`, `ctx.margin`, `ctx.innerWidth`), `placeTooltip`, `TooltipPill`, `useIsoLayoutEffect`, `Id`, `TooltipSegment`.
- Produces:
  - `interface CalloutProps { id: Id; segments?: TooltipSegment[]; content?: ReactNode; stem?: boolean; offset?: number; hideWhileActive?: boolean }`
  - `Callout(props)` pins a pill to the registered point with that id, whether or not it's hovered. It renders a portal into the overlay with `data-ch-part="callout"`, plus `data-ch-part="callout-stem"` when `stem` is set. It renders nothing:
    - before the overlay exists (server rendering, first client render)
    - when the id is unknown
    - while any point is active, when `hideWhileActive` is set (the default)

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/overlays/Callout.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { Bars } from '../marks/Bars'
import { Callout, type CalloutProps } from './Callout'

const weeks = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderCallout(props: CalloutProps) {
  return render(
    <Chart
      data={weeks}
      width={200}
      height={120}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
      animate={false}
    >
      <Bars />
      <Callout {...props} />
    </Chart>,
  )
}

const callout = (root: HTMLElement) => root.querySelector('[data-ch-part="callout"]')

describe('<Callout>', () => {
  it("pins the point's own pill without hover", () => {
    const { container } = renderCallout({ id: 0 })
    expect(callout(container)).toHaveTextContent('W1')
    expect(callout(container)).toHaveTextContent('10')
    // jsdom measures 0×0: the W1 anchor is (50, 60), so the pill sits 10px above it.
    expect(callout(container)).toHaveStyle({ left: '50px', top: '50px' })
    expect(callout(container)).toHaveAttribute('data-ch-placement', 'top')
  })

  it('shows custom segments or content', () => {
    const { container, unmount } = renderCallout({ id: 1, segments: [{ value: 'Pinned' }] })
    expect(callout(container)).toHaveTextContent('Pinned')
    unmount()
    const custom = renderCallout({ id: 1, content: <b>Custom</b> })
    expect(callout(custom.container)).toHaveTextContent('Custom')
  })

  it('draws a stem from the pill to the point', () => {
    const { container } = renderCallout({ id: 0, stem: true })
    const stem = container.querySelector('[data-ch-part="callout-stem"]')
    expect(stem).toHaveStyle({ left: '50px', top: '50px', height: '10px' })
  })

  it('hides while a point is active and comes back after', () => {
    const { container } = renderCallout({ id: 0 })
    const hit = container.querySelectorAll('[data-ch-part="bar-hit"]')[1] as Element
    fireEvent.pointerEnter(hit)
    expect(callout(container)).toBeNull()
    fireEvent.pointerLeave(container.querySelector('figure') as Element)
    expect(callout(container)).not.toBeNull()
  })

  it('stays visible while active when hideWhileActive is false', () => {
    const { container } = renderCallout({ id: 0, hideWhileActive: false })
    fireEvent.pointerEnter(container.querySelectorAll('[data-ch-part="bar-hit"]')[1] as Element)
    expect(callout(container)).not.toBeNull()
  })

  it('renders nothing for an unknown id', () => {
    const { container } = renderCallout({ id: 99 })
    expect(callout(container)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/overlays/Callout.test.tsx`
Expected: FAIL, because `./Callout` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/overlays/Callout.tsx`:

```tsx
import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeTooltip } from '../../core/placement'
import type { Id } from '../../core/types'
import { useChart } from '../context'
import type { TooltipSegment } from '../types'
import { TooltipPill } from '../ui/TooltipPill'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'

export interface CalloutProps {
  /** Id of the point to pin to: any point a mark registered. */
  id: Id
  /** Pill segments. Default: the point's own tooltip segments. */
  segments?: TooltipSegment[]
  /** Custom content instead of the pill. */
  content?: ReactNode
  /** A thin line from the pill to the point. Default false. */
  stem?: boolean
  /** Gap between the point and the pill, in px. Default 10. */
  offset?: number
  /** Hide while any point is active, so the tooltip takes over. Default true. */
  hideWhileActive?: boolean
}

/**
 * A pill pinned to one point regardless of hover. It lives in the HTML overlay, so it appears
 * after mount and is hidden from assistive tech; put the same facts in the data or description.
 */
export function Callout({
  id,
  segments,
  content,
  stem = false,
  offset = 10,
  hideWhileActive = true,
}: CalloutProps) {
  const ctx = useChart('Callout')
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Measure after every render so placement uses the real size before paint.
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  })

  const point = ctx.points.find((p) => p.id === id)
  if (!ctx.overlay || !point || (hideWhileActive && ctx.activeId !== null)) return null

  const position = placeTooltip({
    x: point.x,
    y: point.y,
    width: size.width,
    height: size.height,
    minX: -ctx.margin.left,
    maxX: ctx.innerWidth + ctx.margin.right,
    minY: -ctx.margin.top,
    offset,
  })
  const above = position.placement === 'top'
  const stemTop = above ? position.top + size.height : point.y
  const stemHeight = Math.max(0, above ? point.y - stemTop : position.top - point.y)

  return createPortal(
    <>
      {stem ? (
        <div
          className="ch-callout-stem"
          data-ch-part="callout-stem"
          style={{ left: point.x, top: stemTop, height: stemHeight }}
        />
      ) : null}
      <div
        ref={ref}
        className="ch-tooltip ch-callout"
        data-ch-part="callout"
        data-ch-placement={position.placement}
        style={{ left: position.left, top: position.top }}
      >
        {content ?? <TooltipPill segments={segments ?? point.segments} />}
      </div>
    </>,
    ctx.overlay,
  )
}
```

- [ ] **Step 4: Style the stem**

In `packages/tally-charts/src/theme/theme.css`, add after the `.ch-tooltip` rule:

```css
.ch-callout-stem {
  position: absolute;
  width: 1px;
  margin-left: -0.5px;
  background: var(--ch-ink-muted);
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Callout (pinned pill with optional stem)"
```

---
### Task 5: `WaterfallChart`

**Files:**
- Create: `packages/tally-charts/src/react/charts/WaterfallChart.tsx`
- Test: `packages/tally-charts/src/react/charts/WaterfallChart.test.tsx`

**Interfaces:**
- Consumes:
  - `runningTotals` (Task 1) and `Connector` (Task 2)
  - `Bars` with `from`/`size`/`align`/`ariaLabel`/`tooltip`, `RowLabels` with `position: 'above'`, `Axis`, `Tooltip`
  - `ChartPassThroughProps` and `userCallbacks` (`react/charts/shared.ts`)
  - `inferLinearDomain(values, zero)`, `niceDomain`, `createWarner`, `DEV` and `useFormat`
- Produces:
  - `interface WaterfallStart { label: string; value: number }`
  - `interface WaterfallStep { label: string; value: number; id?: Id; meta?: number }`
  - `interface WaterfallEnd { label: string }`
  - `type WaterfallKind = 'start' | 'step' | 'end'`
  - `WaterfallChartProps<S extends WaterfallStep = WaterfallStep>` and `WaterfallChart<S>(props)`
- Row ids: `'start'`, then `step.id ?? index`, then `'end'`.
- Layout: horizontal, one band per row. The label sits above each bar on the left and the value above it on the right. The bar sits at the bottom of the row. Dotted connectors run from each drawn bar to the next at the running total.

Reference: `docs/reference/01-gross-margin-waterfall.png`, the right card.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/WaterfallChart.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WaterfallChart, type WaterfallChartProps, type WaterfallStep } from './WaterfallChart'

const steps: WaterfallStep[] = [
  { label: 'A', value: -20 },
  { label: 'B', value: -10 },
  { label: 'C', value: 5 },
]

// Totals 100 → 80 → 70 → 75. Domain [70, 100] over 300px: 10px per unit.
// 5 rows × 64px + 28px axis = 348px tall; each row band is 64px, bars are 18px at its bottom.
function renderWaterfall(props: Partial<WaterfallChartProps> = {}) {
  return render(
    <WaterfallChart
      start={{ label: 'Target', value: 100 }}
      steps={steps}
      end={{ label: 'Actual' }}
      width={300}
      title="Why it is under target"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const bars = (root: HTMLElement) => parts(root, '[data-ch-part="bar"]')
const column = (root: HTMLElement, side: 'left' | 'right') =>
  parts(root, `[data-ch-part="row-labels"][data-ch-side="${side}"] [data-ch-part="row-label"]`)

describe('<WaterfallChart>', () => {
  it('draws the start, each step and the computed end', () => {
    const { container } = renderWaterfall()
    const [first, a, , c, last] = bars(container)
    expect(bars(container)).toHaveLength(5)
    expect(first).toHaveAttribute('x', '0')
    expect(first).toHaveAttribute('width', '300')
    expect(first).toHaveAttribute('data-ch-tone', 'neutral')
    expect(first).toHaveAttribute('data-ch-fill', 'hatch')
    expect(first).toHaveAttribute('y', '46')
    expect(first).toHaveAttribute('height', '18')
    expect(a).toHaveAttribute('x', '100')
    expect(a).toHaveAttribute('width', '200')
    expect(a).toHaveAttribute('data-ch-tone', 'loss')
    expect(a).toHaveAttribute('data-ch-dir', 'left')
    expect(c).toHaveAttribute('x', '0')
    expect(c).toHaveAttribute('width', '50')
    expect(c).toHaveAttribute('data-ch-tone', 'gain')
    expect(last).toHaveAttribute('width', '50')
    expect(last).toHaveAttribute('data-ch-tone', 'accent')
    expect(last).toHaveAttribute('data-ch-fill', 'solid')
  })

  it('labels each row above its bar and tones step values', () => {
    const { container } = renderWaterfall()
    expect(column(container, 'left').map((t) => t.textContent)).toEqual([
      'Target',
      'A',
      'B',
      'C',
      'Actual',
    ])
    expect(column(container, 'left')[1]).toHaveAttribute('y', '64')
    expect(column(container, 'left')[1]).toHaveAttribute('dominant-baseline', 'hanging')
    const right = column(container, 'right')
    expect(right.map((t) => t.textContent)).toEqual(['100', '−20', '−10', '+5', '75'])
    expect(right.map((t) => t.getAttribute('data-ch-tone'))).toEqual([
      null,
      'loss',
      'loss',
      'gain',
      null,
    ])
  })

  it('uses stepLabel for step text and "Total" as the default end label', () => {
    const { container } = renderWaterfall({ stepLabel: (s) => `${s.label} step`, end: undefined })
    expect(column(container, 'right')[1]).toHaveTextContent('A step')
    expect(column(container, 'left').at(-1)).toHaveTextContent('Total')
  })

  it('connects each bar to the next at the running total', () => {
    const { container } = renderWaterfall()
    const lines = parts(container, '[data-ch-part="connector"]')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toHaveAttribute('x1', '300')
    expect(lines[0]).toHaveAttribute('y1', '64')
    expect(lines[0]).toHaveAttribute('y2', '110')
    expect(lines[1]).toHaveAttribute('x1', '100')
    expect(lines[3]).toHaveAttribute('x1', '50')
    expect(lines[3]).toHaveAttribute('y2', '302')
  })

  it('skips a missing step without breaking the total', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderWaterfall({
      steps: [
        { label: 'A', value: -20 },
        { label: 'B', value: Number.NaN },
        { label: 'C', value: -10 },
      ],
    })
    expect(bars(container)).toHaveLength(4)
    expect(column(container, 'left').map((t) => t.textContent)).toContain('B')
    expect(column(container, 'right').map((t) => t.textContent)).toEqual(['100', '−20', '−10', '70'])
    expect(parts(container, '[data-ch-part="connector"]')).toHaveLength(3)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('index 1')
  })

  it('renders the empty slot when the start value is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderWaterfall({ start: { label: 'Target', value: Number.NaN } })
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('handles a chart with no steps', () => {
    const { container } = renderWaterfall({ steps: [] })
    const [first, last] = bars(container)
    expect(bars(container)).toHaveLength(2)
    expect(first?.getAttribute('width')).toBe(last?.getAttribute('width'))
    expect(Number(first?.getAttribute('width'))).toBeGreaterThan(0)
    expect(parts(container, '[data-ch-part="connector"]')).toHaveLength(1)
  })

  it('announces running totals and reports the step to onSelect', () => {
    const onSelect = vi.fn()
    const { container } = renderWaterfall({
      onSelect,
      steps: [{ label: 'A', value: -20, id: 'labor' }, ...steps.slice(1)],
    })
    const figure = screen.getByRole('figure', { name: 'Why it is under target' })
    fireEvent.keyDown(figure, { key: 'ArrowDown' })
    fireEvent.keyDown(figure, { key: 'ArrowDown' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('A, −20, running total 80')
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[2] as Element)
    expect(onSelect).toHaveBeenCalledWith(1, expect.objectContaining({ datum: steps[1] }))
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[1] as Element)
    expect(onSelect.mock.calls[1]?.[0]).toBe('labor')
  })

  it('renders a hidden data table', () => {
    renderWaterfall()
    const table = screen.getByRole('table', { name: 'Why it is under target' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Item',
      'Change',
      'Total',
    ])
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    expect(within(table).getByText('−20')).toBeInTheDocument()
    expect(within(table).getByText('80')).toBeInTheDocument()
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderWaterfall({ width: 0 })
    for (const el of [...parts(container, 'rect'), ...parts(container, 'line')]) {
      for (const name of ['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/WaterfallChart.test.tsx`
Expected: FAIL, because `./WaterfallChart` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/WaterfallChart.tsx`:

```tsx
import { useMemo } from 'react'
import type { FormatSpec } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import { runningTotals } from '../../core/steps'
import type { TickSpec } from '../../core/ticks'
import type { Fill, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { Connector, type ConnectorLink } from '../marks/Connector'
import { RowLabels } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import { type ChartPassThroughProps, userCallbacks } from './shared'

export interface WaterfallStart {
  label: string
  value: number
}

export interface WaterfallStep {
  label: string
  /** The change, e.g. -1.6. */
  value: number
  /** Passed to onSelect and onActiveChange. Default: the index in `steps`. */
  id?: Id
  /** Any extra number for `stepLabel`, e.g. the money behind the change. */
  meta?: number
}

export interface WaterfallEnd {
  label: string
}

export type WaterfallKind = 'start' | 'step' | 'end'

export interface WaterfallChartProps<S extends WaterfallStep = WaterfallStep>
  extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  start: WaterfallStart
  steps: readonly S[]
  /** The calculated end row. Default label "Total". */
  end?: WaterfallEnd
  /** Format of the start, end, totals and axis. Default 'number'. */
  format?: FormatSpec
  /** Text on the right of a step row. Default: the signed step value in `format`. */
  stepLabel?: (step: S) => string
  /** Default 'neutral' (hatched). */
  startTone?: Tone
  /** Default 'accent' (solid). */
  endTone?: Tone
  /** Value domain. Default: the totals' range without forcing zero, rounded to nice ticks. */
  domain?: readonly [number, number]
  /** Default 64. */
  rowHeight?: number
  /** Bar thickness in px. Default 18. */
  barSize?: number
  /** Value axis ticks, or 'none'. Default 5. */
  axis?: TickSpec | 'none'
  /** Axis label format. Default: `format`. */
  axisFormat?: AxisFormat
  /** Dotted lines from each bar to the next. Default true. */
  connectors?: boolean
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface WaterfallRow<S> {
  key: string
  rowId: Id
  kind: WaterfallKind
  /** Index in `steps`; -1 for the start and end rows. */
  index: number
  datum: WaterfallStart | S | { label: string; value: number }
  label: string
  /** Start of a step's floating bar; NaN for start and end (they run from the baseline). */
  from: number
  /** Running total after the row: where its bar ends. */
  to: number
  text: string
  tone: Tone
  fill: Fill
  valid: boolean
}

const AXIS_SPACE = 28

/** Connectors meet bars that sit at the bottom of their row band. */
function StepConnectors({ links, barSize }: { links: ConnectorLink[]; barSize: number }) {
  const ctx = useChart('WaterfallChart')
  const band = ctx.y.kind === 'band' ? ctx.y.scale.bandwidth() : 0
  return <Connector links={links} toInset={Math.max(0, band - barSize)} />
}

export function WaterfallChart<S extends WaterfallStep = WaterfallStep>({
  start,
  steps,
  end,
  format,
  stepLabel,
  startTone = 'neutral',
  endTone = 'accent',
  domain,
  rowHeight = 64,
  barSize = 18,
  axis = 5,
  axisFormat,
  connectors = true,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: WaterfallChartProps<S>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const signed = useMemo(() => create(format, { signed: true }), [create, format])
  const startValid = Number.isFinite(start.value)
  const endLabel = end?.label ?? 'Total'

  const rows = useMemo((): WaterfallRow<S>[] => {
    if (!startValid) return []
    const totals = runningTotals(
      start.value,
      steps.map((s) => s.value),
    )
    const endValue = totals.at(-1)?.after ?? start.value
    const stepRows = totals.map((t): WaterfallRow<S> => {
      const s = steps[t.index] as S
      return {
        key: `s${t.index}`,
        rowId: s.id ?? t.index,
        kind: 'step',
        index: t.index,
        datum: s,
        label: s.label,
        from: t.before,
        to: t.after,
        text: t.valid ? (stepLabel ? stepLabel(s) : signed(t.value)) : '',
        tone: t.tone,
        fill: 'hatch',
        valid: t.valid,
      }
    })
    return [
      {
        key: 'start',
        rowId: 'start',
        kind: 'start',
        index: -1,
        datum: start,
        label: start.label,
        from: Number.NaN,
        to: start.value,
        text: fmt(start.value),
        tone: startTone,
        fill: 'hatch',
        valid: true,
      },
      ...stepRows,
      {
        key: 'end',
        rowId: 'end',
        kind: 'end',
        index: -1,
        datum: { label: endLabel, value: endValue },
        label: endLabel,
        from: Number.NaN,
        to: endValue,
        text: fmt(endValue),
        tone: endTone,
        fill: 'solid',
        valid: true,
      },
    ]
  }, [startValid, start, steps, stepLabel, fmt, signed, startTone, endTone, endLabel])

  if (DEV && !startValid) {
    warn('waterfall-start', 'WaterfallChart needs a numeric start value; showing the empty state.')
  }
  const missing = rows.find((r) => !r.valid)
  if (DEV && missing) {
    warn(
      'waterfall-step',
      `WaterfallChart skipped a missing or non-numeric step value at index ${missing.index}.`,
    )
  }

  const drawn = useMemo(() => rows.filter((r) => r.valid), [rows])
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        drawn.map((r) => r.to),
        false,
      ),
    )
  const links: ConnectorLink[] = drawn.slice(1).flatMap((b, i) => {
    const a = drawn[i]
    return a ? [{ at: a.to, from: a.key, to: b.key }] : []
  })
  const m: Margin = {
    top: 0,
    right: 0,
    left: 0,
    bottom: axis === 'none' ? 0 : AXIS_SPACE,
    ...margin,
  }
  const toneOfText = (r: WaterfallRow<S>): Tone | undefined =>
    r.kind === 'step' && r.tone !== 'neutral' ? r.tone : undefined
  const ariaOf = (r: WaterfallRow<S>) =>
    r.kind === 'step' ? `${r.label}, ${r.text}, running total ${fmt(r.to)}` : `${r.label}, ${r.text}`
  const segmentsOf = (r: WaterfallRow<S>): TooltipSegment[] =>
    r.kind === 'step'
      ? [
          { value: r.label },
          { value: r.text, tone: toneOfText(r) },
          { value: fmt(r.to), label: 'total' },
        ]
      : [{ value: r.label }, { value: r.text }]
  const axisFmt: AxisFormat | undefined =
    axisFormat ??
    (typeof format === 'function' ? (v: string | number) => format(Number(v)) : format)

  const table: DataTableSpec<WaterfallRow<S>> | undefined = dataTable
    ? {
        columns: [
          { header: 'Item', value: (r) => r.label },
          { header: 'Change', value: (r) => (r.kind === 'step' ? r.text : '') },
          { header: 'Total', value: (r) => (r.valid ? fmt(r.to) : '') },
        ],
      }
    : undefined

  return (
    <Chart<WaterfallRow<S>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'to', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, rows.length) * rowHeight + m.top + m.bottom}
      dataTable={table}
    >
      {connectors ? <StepConnectors links={links} barSize={barSize} /> : null}
      <Bars<WaterfallRow<S>>
        data={drawn}
        x="to"
        from={(r) => r.from}
        id="rowId"
        label="label"
        tone={(r) => r.tone}
        fill={(r) => r.fill}
        size={barSize}
        align="end"
        format={format}
        ariaLabel={ariaOf}
        tooltip={segmentsOf}
      />
      <RowLabels<WaterfallRow<S>> text="label" position="above" />
      <RowLabels<WaterfallRow<S>> side="right" text="text" position="above" tone={toneOfText} />
      {axis === 'none' ? null : <Axis side="bottom" ticks={axis} format={axisFmt} />}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

The start and end bars have no `from`: `<Bars>` clamps its zero baseline into the domain, so they run from the domain minimum when zero is outside it (design decision 2).

- [ ] **Step 4: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS. Report any type error rather than casting to `any`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/react/charts
git commit -m "feat: WaterfallChart"
```

---

### Task 6: `BridgeChart`

**Files:**
- Create: `packages/tally-charts/src/react/charts/BridgeChart.tsx`
- Test: `packages/tally-charts/src/react/charts/BridgeChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes:
  - `runningTotals` (Task 1), `ColumnHighlight` (Task 2), `Area` (Task 3) and `Callout` (Task 4)
  - `Axis` with `highlight` (Task 2)
  - `Bars` with `from`, `interactive`, `ariaLabel` and `tooltip`, plus `Tooltip`
  - `ChartPassThroughProps`, `userCallbacks`, `inferLinearDomain`, `niceDomain`, `createWarner`, `DEV` and `useFormat`
- Produces:
  - `interface BridgeStart { label: string; value: number }`
  - `interface BridgeStep { label: string; value: number; note?: string; id?: Id }`
  - `BridgeChartProps<S extends BridgeStep = BridgeStep>` and `BridgeChart<S>(props)`
  - New parts: `data-ch-part="column-total"` and `data-ch-part="column-note"`
- Column ids: `'start'`, then `step.id ?? index`.

Reference: `docs/reference/04-profit-bridge.png`, the top card.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/BridgeChart.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BridgeChart, type BridgeChartProps, type BridgeStep } from './BridgeChart'

const leaks: BridgeStep[] = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

function renderBridge(props: Partial<BridgeChartProps> = {}) {
  return render(
    <BridgeChart
      start={{ label: 'Planned profit', value: 1260 }}
      steps={leaks}
      format="currency"
      width={700}
      title="Planned $1,260, kept $400"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const remaining = (root: HTMLElement) => parts(root, '[data-ch-part="bar"][data-ch-tone="accent"]')
const caps = (root: HTMLElement, tone = 'loss') =>
  parts(root, `[data-ch-part="bar"][data-ch-tone="${tone}"]`)
const num = (el: Element | undefined, name: string) => Number(el?.getAttribute(name))

describe('<BridgeChart>', () => {
  it('draws remaining bars with leaked caps on top', () => {
    const { container } = renderBridge()
    expect(remaining(container)).toHaveLength(5)
    expect(caps(container)).toHaveLength(4)
    expect(remaining(container).map((b) => b.getAttribute('data-ch-fill'))).toEqual([
      'hatch-fade',
      'hatch-fade',
      'hatch-fade',
      'hatch-fade',
      'solid',
    ])
    expect(caps(container).every((b) => b.getAttribute('data-ch-fill') === 'hatch')).toBe(true)
    // The first cap starts where the plan was (1260) and ends where the next column's bar begins.
    const [cap] = caps(container)
    expect(num(cap, 'y')).toBeCloseTo(num(remaining(container)[0], 'y'))
    expect(num(cap, 'y') + num(cap, 'height')).toBeCloseTo(num(remaining(container)[1], 'y'))
  })

  it('labels each column with its total and its leak', () => {
    const { container } = renderBridge()
    expect(parts(container, '[data-ch-part="column-total"]').map((t) => t.textContent)).toEqual([
      '$1,260',
      '$1,000',
      '$740',
      '$500',
      '$400',
    ])
    const notes = parts(container, '[data-ch-part="column-note"]')
    expect(notes.map((t) => t.textContent)).toEqual([
      '−$260 discount',
      '−$260 labor overrun',
      '−$240 callback',
      '−$100 materials',
    ])
    expect(notes.every((t) => t.getAttribute('data-ch-tone') === 'loss')).toBe(true)
  })

  it('joins the column totals with an area', () => {
    const { container } = renderBridge()
    const d = container.querySelector('[data-ch-part="area"]')?.getAttribute('d') ?? ''
    expect(d.startsWith('M')).toBe(true)
    // 5 points: 4 segments, then 2 back along the baseline.
    expect(d.match(/L/g)).toHaveLength(6)
  })

  it('leaves the area out on request', () => {
    const { container } = renderBridge({ area: false })
    expect(container.querySelector('[data-ch-part="area"]')).toBeNull()
  })

  it('highlights the last column and its axis label', () => {
    const { container, unmount } = renderBridge()
    expect(parts(container, '[data-ch-part="column-highlight"]')).toHaveLength(1)
    const labels = parts(container, '[data-ch-part="axis-label"]')
    expect(labels.map((t) => t.textContent)).toEqual([
      'Planned profit',
      'After discount',
      'After labor',
      'After callback',
      'Actual profit',
    ])
    expect(labels.map((t) => t.getAttribute('data-ch-active'))).toEqual([
      null,
      null,
      null,
      null,
      'true',
    ])
    unmount()
    const plain = renderBridge({ highlightLast: false })
    expect(parts(plain.container, '[data-ch-part="column-highlight"]')).toHaveLength(0)
    expect(remaining(plain.container).at(-1)).toHaveAttribute('data-ch-fill', 'hatch-fade')
  })

  it('pins the callout above the last column and hides it on hover', () => {
    const { container } = renderBridge({
      callout: [
        { value: '$400', label: 'kept' },
        { value: '12.3%', label: 'margin' },
      ],
    })
    const callout = () => container.querySelector('[data-ch-part="callout"]')
    expect(callout()).toHaveTextContent('$400kept')
    fireEvent.pointerEnter(parts(container, '[data-ch-part="bar-hit"]')[1] as Element)
    expect(callout()).toBeNull()
  })

  it('tones a gain cap and keeps the remaining bar at the lower total', () => {
    const { container } = renderBridge({ steps: [{ label: 'Bonus', value: 100, note: 'bonus' }] })
    expect(caps(container, 'gain')).toHaveLength(1)
    expect(num(remaining(container)[1], 'y')).toBeCloseTo(num(remaining(container)[0], 'y'))
  })

  it('skips a missing step without breaking the total', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBridge({
      steps: [
        { label: 'After discount', value: -260, note: 'discount' },
        { label: 'Unknown', value: Number.NaN },
        { label: 'Actual profit', value: -100, note: 'materials' },
      ],
    })
    expect(caps(container)).toHaveLength(2)
    expect(parts(container, '[data-ch-part="column-total"]').map((t) => t.textContent)).toEqual([
      '$1,260',
      '$1,000',
      '$1,000',
      '$900',
    ])
    expect(parts(container, '[data-ch-part="column-note"]')).toHaveLength(2)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('index 1')
  })

  it('renders the empty slot when the start value is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderBridge({ start: { label: 'Planned profit', value: Number.NaN } })
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('keeps geometry right when the total goes below zero', () => {
    const { container } = renderBridge({
      start: { label: 'Plan', value: 100 },
      steps: [{ label: 'Loss', value: -150 }],
    })
    const [, below] = remaining(container)
    expect(below).toHaveAttribute('data-ch-dir', 'down')
    const [cap] = caps(container)
    expect(num(cap, 'height')).toBeGreaterThan(num(below, 'height'))
    for (const rect of parts(container, 'rect')) {
      for (const name of ['x', 'y', 'width', 'height']) {
        const value = rect.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })

  it('draws a single column without steps', () => {
    const { container } = renderBridge({ steps: [] })
    expect(remaining(container)).toHaveLength(1)
    expect(remaining(container)[0]).toHaveAttribute('data-ch-fill', 'solid')
    expect(caps(container)).toHaveLength(0)
    expect(parts(container, '[data-ch-part="column-highlight"]')).toHaveLength(1)
    expect(container.querySelector('[data-ch-part="area"]')).toBeNull()
  })

  it('announces totals and reports the step to onSelect', () => {
    const onSelect = vi.fn()
    const { container } = renderBridge({ onSelect })
    const figure = screen.getByRole('figure', { name: 'Planned $1,260, kept $400' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent(
      'After discount, $1,000, −$260 discount',
    )
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[1] as Element)
    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ datum: leaks[0] }))
  })

  it('renders a hidden data table', () => {
    renderBridge()
    const table = screen.getByRole('table', { name: 'Planned $1,260, kept $400' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Column',
      'Change',
      'Total',
    ])
    expect(within(table).getByText('−$100 materials')).toBeInTheDocument()
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderBridge({ width: 0 })
    for (const rect of parts(container, 'rect')) {
      for (const name of ['x', 'y', 'width', 'height']) {
        const value = rect.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/BridgeChart.test.tsx`
Expected: FAIL, because `./BridgeChart` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/BridgeChart.tsx`:

```tsx
import { useMemo } from 'react'
import type { FormatSpec, Formatter } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import { runningTotals } from '../../core/steps'
import type { Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Area } from '../marks/Area'
import { Axis } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { ColumnHighlight } from '../marks/ColumnHighlight'
import { Callout } from '../overlays/Callout'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import { type ChartPassThroughProps, userCallbacks } from './shared'

export interface BridgeStart {
  label: string
  value: number
}

export interface BridgeStep {
  /** Column label, e.g. "After discount". */
  label: string
  /** The change, e.g. -260. */
  value: number
  /** Short word after the change, e.g. "discount" → "−$260 discount". */
  note?: string
  /** Passed to onSelect and onActiveChange. Default: the index in `steps`. */
  id?: Id
}

export interface BridgeChartProps<S extends BridgeStep = BridgeStep>
  extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  start: BridgeStart
  steps: readonly S[]
  /** Default 'number'. */
  format?: FormatSpec
  /** Text under each column total. Default: the signed change plus the note. */
  stepLabel?: (step: S) => string
  /** Solid, highlighted last column with an emphasized label. Default true. */
  highlightLast?: boolean
  /** A pill pinned above the last column, e.g. `$400 kept | 12.3% margin`. */
  callout?: TooltipSegment[]
  /** Gradient area joining the column totals. Default true. */
  area?: boolean
  /** Value domain. Default: zero to the largest total, rounded to nice ticks. */
  domain?: readonly [number, number]
  /** Inner band padding, 0–1. Default 0.45. */
  padding?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface BridgeRow<S> {
  key: string
  rowId: Id
  kind: 'start' | 'step'
  /** Index in `steps`; -1 for the start column. */
  index: number
  datum: BridgeStart | S
  label: string
  /** Running total after the column. */
  total: number
  /** Top of the remaining bar: the lower of the totals before and after. */
  base: number
  /** Top of the cap: the higher of the two. */
  top: number
  capTone: Tone
  hasCap: boolean
  note: string
  valid: boolean
  last: boolean
}

const MARGIN: Margin = { top: 64, right: 0, bottom: 32, left: 0 }
/** Gap between the column top and the text above it, in px. */
const VALUE_GAP = 8
/** Height of the note line under the total, in px. */
const NOTE_GAP = 18
/** Room above the cap for the total and note before a pinned callout, in px. */
const CALLOUT_SPACE = 52

function ColumnTotals<S>({ rows, fmt }: { rows: readonly BridgeRow<S>[]; fmt: Formatter }) {
  const ctx = useChart('BridgeChart')
  if (ctx.x.kind !== 'band' || ctx.y.kind !== 'linear') return null
  const band = ctx.x.scale
  const linear = ctx.y.scale
  const half = band.bandwidth() / 2
  const [r0, r1] = linear.range()
  const clamp = (px: number) => Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
  return (
    <g data-ch-part="column-totals">
      {rows.map((r) => {
        const start = band(r.key)
        if (start === undefined) return null
        const x = start + half
        const top = clamp(linear(r.top))
        return (
          <g key={r.key}>
            <text
              data-ch-part="column-total"
              x={x}
              y={top - (r.note ? NOTE_GAP + VALUE_GAP : VALUE_GAP)}
              textAnchor="middle"
            >
              {fmt(r.total)}
            </text>
            {r.note ? (
              <text
                data-ch-part="column-note"
                data-ch-tone={r.capTone}
                x={x}
                y={top - VALUE_GAP}
                textAnchor="middle"
                style={{ fill: `var(--ch-${r.capTone})` }}
              >
                {r.note}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

/** Pins the callout above the last column's cap and labels, not on the bar itself. */
function LastCallout<S>({ row, segments }: { row: BridgeRow<S>; segments: TooltipSegment[] }) {
  const ctx = useChart('BridgeChart')
  if (ctx.y.kind !== 'linear') return null
  const cap = Math.abs(ctx.y.scale(row.base) - ctx.y.scale(row.top))
  return <Callout id={row.rowId} segments={segments} offset={cap + CALLOUT_SPACE} />
}

export function BridgeChart<S extends BridgeStep = BridgeStep>({
  start,
  steps,
  format,
  stepLabel,
  highlightLast = true,
  callout,
  area = true,
  domain,
  padding = 0.45,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: BridgeChartProps<S>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const signed = useMemo(() => create(format, { signed: true }), [create, format])
  const startValid = Number.isFinite(start.value)

  const rows = useMemo((): BridgeRow<S>[] => {
    if (!startValid) return []
    const totals = runningTotals(
      start.value,
      steps.map((s) => s.value),
    )
    const all: BridgeRow<S>[] = [
      {
        key: 'start',
        rowId: 'start',
        kind: 'start',
        index: -1,
        datum: start,
        label: start.label,
        total: start.value,
        base: start.value,
        top: start.value,
        capTone: 'neutral',
        hasCap: false,
        note: '',
        valid: true,
        last: false,
      },
      ...totals.map((t): BridgeRow<S> => {
        const s = steps[t.index] as S
        return {
          key: `s${t.index}`,
          rowId: s.id ?? t.index,
          kind: 'step',
          index: t.index,
          datum: s,
          label: s.label,
          total: t.after,
          base: Math.min(t.before, t.after),
          top: Math.max(t.before, t.after),
          capTone: t.tone,
          hasCap: t.valid && t.value !== 0,
          note: t.valid
            ? stepLabel
              ? stepLabel(s)
              : `${signed(t.value)} ${s.note ?? ''}`.trim()
            : '',
          valid: t.valid,
          last: false,
        }
      }),
    ]
    const lastRow = all[all.length - 1]
    if (lastRow) lastRow.last = true
    return all
  }, [startValid, start, steps, stepLabel, signed])

  if (DEV && !startValid) {
    warn('bridge-start', 'BridgeChart needs a numeric start value; showing the empty state.')
  }
  const missing = rows.find((r) => !r.valid)
  if (DEV && missing) {
    warn(
      'bridge-step',
      `BridgeChart skipped a missing or non-numeric step value at index ${missing.index}.`,
    )
  }

  const caps = useMemo(() => rows.filter((r) => r.hasCap), [rows])
  const lastRow = rows[rows.length - 1]
  const labelOf = new Map(rows.map((r) => [r.key, r.label]))
  const resolvedDomain =
    domain ?? niceDomain(inferLinearDomain(rows.flatMap((r) => [r.base, r.top])))
  const m: Margin = { ...MARGIN, ...margin }
  const solidLast = (r: BridgeRow<S>) => r.last && highlightLast
  const ariaOf = (r: BridgeRow<S>) =>
    r.note ? `${r.label}, ${fmt(r.total)}, ${r.note}` : `${r.label}, ${fmt(r.total)}`
  const segmentsOf = (r: BridgeRow<S>): TooltipSegment[] => [
    { value: r.label },
    { value: fmt(r.total) },
    ...(r.note ? [{ value: r.note, tone: r.capTone }] : []),
  ]

  const table: DataTableSpec<BridgeRow<S>> | undefined = dataTable
    ? {
        columns: [
          { header: 'Column', value: (r) => r.label },
          { header: 'Change', value: (r) => r.note },
          { header: 'Total', value: (r) => fmt(r.total) },
        ],
      }
    : undefined

  return (
    <Chart<BridgeRow<S>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ type: 'band', field: 'key', padding }}
      y={{ field: 'total', domain: resolvedDomain }}
      margin={m}
      height={height ?? 360}
      dataTable={table}
    >
      {highlightLast && lastRow ? <ColumnHighlight at={lastRow.key} /> : null}
      {area ? <Area<BridgeRow<S>> data={rows} x="key" y="total" /> : null}
      <Bars<BridgeRow<S>>
        data={rows}
        x="key"
        y="base"
        id="rowId"
        label="label"
        tone="accent"
        fill={(r) => (solidLast(r) ? 'solid' : 'hatch-fade')}
        format={format}
        ariaLabel={ariaOf}
        tooltip={segmentsOf}
      />
      <Bars<BridgeRow<S>>
        data={caps}
        x="key"
        y="top"
        from="base"
        id="rowId"
        tone={(r) => r.capTone}
        fill="hatch"
        interactive={false}
      />
      <ColumnTotals rows={rows} fmt={fmt} />
      <Axis
        side="bottom"
        format={(key) => labelOf.get(String(key)) ?? ''}
        highlight={highlightLast ? lastRow?.key : undefined}
      />
      {callout && lastRow ? <LastCallout row={lastRow} segments={callout} /> : null}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

- [ ] **Step 4: Style the column labels**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-part="column-highlight"]` rule:

```css
[data-ch-part="column-total"] {
  fill: var(--ch-ink);
  font-size: 22px;
  font-weight: 500;
}

[data-ch-part="column-note"] {
  font-size: 13px;
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS.

If the axis-label test sees fewer than 5 labels, `thinTicks` dropped some at this width. Report the width at which all 5 fit and use it in `renderBridge`; don't turn thinning off in the chart.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: BridgeChart"
```

---
### Task 7: Public exports, size budgets, SSR coverage, README, changeset

**Files:**
- Modify: `packages/tally-charts/src/index.ts`
- Test: `packages/tally-charts/src/index.test.ts`
- Modify: `packages/tally-charts/.size-limit.json`
- Modify: `packages/tally-charts/test/fixtures.tsx`
- Test: `packages/tally-charts/src/ssr.node.test.tsx`
- Modify: `packages/tally-charts/README.md`
- Create: `.changeset/tally-charts-0-3.md`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces:
  - The public 0.3 API.
  - Fixtures `UnderTarget` (a waterfall) and `ProfitBridge` (a bridge with a callout), which Task 8's stories mirror.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/index.test.ts`, add to the `'main exports %s'` list:

```ts
    'WaterfallChart',
    'BridgeChart',
    'Connector',
    'ColumnHighlight',
    'Area',
    'Callout',
```

Append to `packages/tally-charts/test/fixtures.tsx`, and add `BridgeChart` and `WaterfallChart` to its import from `'../src'`:

```tsx
export const gapSteps = [
  { label: 'Labor overruns', value: -1.6, meta: 7700 },
  { label: 'Material variance', value: -1.1, meta: 5300 },
  { label: 'Callbacks', value: -0.7, meta: 3400 },
  { label: 'Discounting', value: -0.4, meta: 1900 },
  { label: 'Other', value: -0.2, meta: 1000 },
]

export function UnderTarget() {
  return (
    <WaterfallChart
      title="Why it is under target"
      start={{ label: 'Target', value: 38 }}
      steps={gapSteps}
      end={{ label: 'Actual' }}
      format="percent"
      domain={[34, 38]}
      stepLabel={(s) => `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta ?? 0)}`}
    />
  )
}

export const leakSteps = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

export function ProfitBridge() {
  return (
    <BridgeChart
      title="Planned $1,260, kept $400"
      start={{ label: 'Planned profit', value: 1260 }}
      steps={leakSteps}
      format="currency"
      callout={[
        { value: '$400', label: 'kept' },
        { value: '12.3%', label: 'margin' },
        { value: '32%', label: 'of plan' },
      ]}
    />
  )
}
```

If `fmt` isn't already imported in the fixtures, add it to the same import.

Append inside `describe('server rendering', …)` in `packages/tally-charts/src/ssr.node.test.tsx`, and add `ProfitBridge` and `UnderTarget` to the fixtures import:

```tsx
  it('renders the 0.3 charts without a DOM, deterministically', () => {
    for (const Example of [UnderTarget, ProfitBridge]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
    }
    const waterfall = renderToString(<UnderTarget />)
    expect(waterfall).toContain('−1.6 pts · $7.7K')
    expect(waterfall.match(/data-ch-part="connector"/g)).toHaveLength(6)
    const bridge = renderToString(<ProfitBridge />)
    expect(bridge).toContain('−$260 discount')
    expect(bridge).toContain('data-ch-part="column-highlight"')
    expect(bridge).toContain('data-ch-part="area"')
    // The callout lives in the HTML overlay, which only exists after mount.
    expect(bridge).not.toContain('data-ch-part="callout"')
  })
```

The waterfall has 7 drawn rows (start, 5 steps, end), so it has 6 connectors.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/index.test.ts src/ssr.node.test.tsx`
Expected: FAIL; the names aren't exported from `src/index.ts`.

- [ ] **Step 3: Export**

In `packages/tally-charts/src/index.ts`, add, keeping the file's alphabetical-by-path order:

```ts
export type { BridgeChartProps, BridgeStart, BridgeStep } from './react/charts/BridgeChart'
export { BridgeChart } from './react/charts/BridgeChart'
export type {
  WaterfallChartProps,
  WaterfallEnd,
  WaterfallKind,
  WaterfallStart,
  WaterfallStep,
} from './react/charts/WaterfallChart'
export { WaterfallChart } from './react/charts/WaterfallChart'
export type { AreaProps } from './react/marks/Area'
export { Area } from './react/marks/Area'
export type { ColumnHighlightProps } from './react/marks/ColumnHighlight'
export { ColumnHighlight } from './react/marks/ColumnHighlight'
export type { ConnectorLink, ConnectorProps } from './react/marks/Connector'
export { Connector } from './react/marks/Connector'
export type { CalloutProps } from './react/overlays/Callout'
export { Callout } from './react/overlays/Callout'
```

- [ ] **Step 4: Add size budgets**

Append to the array in `packages/tally-charts/.size-limit.json`:

```json
  {
    "name": "WaterfallChart",
    "path": "dist/index.js",
    "import": "{ WaterfallChart }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "BridgeChart",
    "path": "dist/index.js",
    "import": "{ BridgeChart }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  }
```

- [ ] **Step 5: Document 0.3**

In `packages/tally-charts/README.md`:
- Change the status line to `> Status: 0.3. The API may change before 1.0.`
- In the High-level charts section, add these bullets after the `RankedBars` bullet:

```md
- `WaterfallChart`: horizontal steps from a start value to a calculated end, with dotted
  connectors. Start is hatched neutral, steps are `loss`/`gain`, the end is solid accent. The
  domain leaves out zero by default, like a 34%–38% gap chart. Row ids are `'start'`,
  `step.id ?? index`, `'end'`.
- `BridgeChart`: vertical columns of what remains after each step, with the leaked (or gained)
  part as a hatched cap, a gradient joining the totals, and a highlighted last column. `callout`
  pins a pill above the last column. Column ids are `'start'` and `step.id ?? index`.
```

- Add this paragraph after the `## Small pieces` paragraph:

```md
Building blocks added in 0.3: `Connector` (dotted lines between bands at a value),
`ColumnHighlight` (soft backdrop behind one band), `Area` (gradient through band centres) and
`Callout` (a pill pinned to one point, with an optional stem). Callouts live in the HTML overlay:
they appear after mount and are hidden from screen readers, so put the same facts in the title,
description or data.
```

- [ ] **Step 6: Add the changeset**

Create `.changeset/tally-charts-0-3.md`:

```md
---
'tally-charts': minor
---

Waterfall and bridge: `WaterfallChart` (start → steps → calculated end, dotted connectors) and
`BridgeChart` (remaining bars with leaked caps, gradient area, highlighted last column, pinned
callout). New building blocks `Connector`, `ColumnHighlight`, `Area` and `Callout`;
`<Axis highlight>` emphasizes one label. `tally-charts/core` gains `runningTotals` and
`areaPath`.
```

- [ ] **Step 7: Build and verify everything**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS. Record every size-limit number in the report. If a budget fails, don't raise it: report the size as a concern.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts .changeset
git commit -m "feat: export waterfall, bridge and the new building blocks; budgets and docs"
```

---

### Task 8: Reference stories, e2e and baselines

**Files:**
- Create: `apps/storybook/stories/WhyUnderTarget.stories.tsx`
- Create: `apps/storybook/stories/ProfitBridge.stories.tsx`
- Modify: `apps/storybook/.storybook/preview.css`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Create: `apps/storybook/e2e/__screenshots__/darwin/*.png` and `apps/storybook/e2e/__screenshots__/linux/*.png` (4 new each)

**Interfaces:**
- Consumes: the public API from Task 7.
- Produces: the story ids
  - `reference-why-it-is-under-target--light`
  - `reference-why-it-is-under-target--dark`
  - `reference-profit-bridge--light`
  - `reference-profit-bridge--dark`

- [ ] **Step 1: Write the stories**

Append to `apps/storybook/.storybook/preview.css`:

```css
.insight {
  margin-top: 24px;
  padding: 18px 22px;
  border-radius: 16px;
  background: var(--ch-tooltip-bg);
  font-size: 16px;
  line-height: 1.5;
}

.insight p {
  margin: 0;
}

.insight .muted {
  color: var(--ch-ink-muted);
  font-size: 14px;
}

.card-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
```

Create `apps/storybook/stories/WhyUnderTarget.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fmt, WaterfallChart } from 'tally-charts'

// docs/reference/01-gross-margin-waterfall.png, card "Why it is under target".
const steps = [
  { label: 'Labor overruns', value: -1.6, meta: 7700 },
  { label: 'Material variance', value: -1.1, meta: 5300 },
  { label: 'Callbacks', value: -0.7, meta: 3400 },
  { label: 'Discounting', value: -0.4, meta: 1900 },
  { label: 'Other', value: -0.2, meta: 1000 },
]

function WhyUnderTarget() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Why it is under target</h2>
        <span className="card-meta">4.0 points lost against the 38% target</span>
      </header>
      <WaterfallChart
        title="Why margin is under target"
        description="Labor and materials explain two thirds of the 4.0 point gap."
        start={{ label: 'Target', value: 38 }}
        steps={steps}
        end={{ label: 'Actual' }}
        format="percent"
        domain={[34, 38]}
        axisFormat={(v) => `${v}%`}
        stepLabel={(s) => `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta)}`}
      />
      <div className="insight">
        <p>Labor and materials explain two thirds of the gap.</p>
        <p className="muted">Both trace back to installs in Dallas.</p>
      </div>
    </article>
  )
}

const meta = {
  title: 'Reference/Why it is under target',
  component: WhyUnderTarget,
} satisfies Meta<typeof WhyUnderTarget>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Create `apps/storybook/stories/ProfitBridge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BridgeChart, Legend } from 'tally-charts'

// docs/reference/04-profit-bridge.png, card "Planned $1,260, kept $400".
const leaks = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

function ProfitBridge() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">Planned $1,260, kept $400</h2>
          <span className="card-meta">$860 of planned profit leaked in four places</span>
        </div>
        <Legend
          items={[
            { label: 'Profit left', tone: 'accent', fill: 'hatch' },
            { label: 'Leaked', tone: 'loss', fill: 'hatch' },
            { label: 'Kept', tone: 'accent' },
          ]}
        />
      </header>
      <BridgeChart
        title="Profit from plan to actual"
        description="Planned profit of $1,260 fell to $400 after a discount, labor overrun, callback and materials."
        start={{ label: 'Planned profit', value: 1260 }}
        steps={leaks}
        format="currency"
        height={400}
        callout={[
          { value: '$400', label: 'kept' },
          { value: '12.3%', label: 'margin' },
          { value: '32%', label: 'of plan' },
        ]}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Profit bridge',
  component: ProfitBridge,
} satisfies Meta<typeof ProfitBridge>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

`fmt.currencyCompact(s.meta)` gets a `number | undefined` in the waterfall story, because `meta` is optional on `WaterfallStep`. TypeScript infers `S` from the literal array, where `meta` is always present, so this typechecks. If it doesn't, use `s.meta ?? 0`. Run `pnpm --filter storybook-app typecheck`; expected: PASS.

- [ ] **Step 2: Look at both stories next to their references**

Start a dev server on a free port (`pnpm --filter storybook-app exec storybook dev -p 6010 --no-open`; one may already be running on 6006 from another session, so leave that alone). Take Playwright screenshots of both stories into your scratchpad, or view them, and compare them with:
- `docs/reference/01-gross-margin-waterfall.png` (right card)
- `docs/reference/04-profit-bridge.png` (top card)

Check:
- **Waterfall:** labels above the bars and pink values on the right; floating bars stepping left; dotted connectors meeting the bars' edges; a solid end bar; an axis from 34% to 38%.
- **Bridge:** hatched blue remaining bars with pink caps; the totals and pink notes above the caps; the gradient behind the columns; the highlighted, solid last column; the callout pill above it; the emphasized last axis label; dark mode for both.

Write the differences into the report. Wrong order, wrong colors, overlapping or clipped text and misplaced connectors are defects. Fix them in the library with a unit test, list them in the report, and only then continue. Spacing nuances are fine. Stop your dev server afterwards.

- [ ] **Step 3: Extend the e2e suite**

In `apps/storybook/e2e/stories.spec.ts`:

Add to `STORIES`:

```ts
  'reference-why-it-is-under-target--light',
  'reference-why-it-is-under-target--dark',
  'reference-profit-bridge--light',
  'reference-profit-bridge--dark',
```

Add to `WIDE_STORIES`:

```ts
  'reference-profit-bridge--light': { width: 1280, height: 720 },
  'reference-profit-bridge--dark': { width: 1280, height: 720 },
```

Append:

```ts
test('the waterfall announces running totals', async ({ page }) => {
  await open(page, 'reference-why-it-is-under-target--light')
  const chart = page.getByRole('figure', { name: 'Why margin is under target' })
  await chart.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(chart.locator('[aria-live]')).toHaveText(
    'Labor overruns, −1.6 pts · $7.7K, running total 36.4%',
  )
})

test('the bridge pins its callout and hands over to the tooltip on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await open(page, 'reference-profit-bridge--light')
  const callout = page.locator('[data-ch-part="callout"]')
  await expect(callout).toContainText('$400')
  await page.locator('[data-ch-part="bar-hit"]').nth(1).hover()
  await expect(callout).toHaveCount(0)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('After discount')
})
```

- [ ] **Step 4: Generate darwin baselines and verify**

Run: `pnpm --filter storybook-app exec playwright test --update-snapshots=missing`, then `pnpm test:e2e`.
Expected: the second run PASSES with 45 tests: 18 stories × 2, plus 9 interaction tests. `git status` shows exactly 4 new darwin PNGs, and no existing PNG changed. If one changed, stop and report it with `git diff --stat`.

Open each new PNG with the Read tool. Each must show the full card with grown bars and, for the bridge, the callout.

- [ ] **Step 5: Generate and verify linux baselines**

Run the docker route from the comment above the `e2e` job in `.github/workflows/ci.yml`, from the repo root, with Docker running. It regenerates the baselines in a copy of the repo, re-runs the suite without updating, and copies the PNGs out only if that run passes. Expected: 4 new PNGs under `apps/storybook/e2e/__screenshots__/linux/` and no changed ones. Open each new one and confirm it shows the full card.

If Docker isn't available, record that in the report and continue; CI will fail on the missing baselines until they are added.

- [ ] **Step 6: Full verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm test:e2e`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add apps/storybook
git commit -m "test: waterfall and bridge reference stories, e2e and baselines"
```

---

## After the plan

The 0.4 plan (`DotHistogram`, `StripPlot`, `WaffleColumns`) adds `Dots`, threshold bins (`thresholds()` → tones and legend counts) and reuses `Callout` (the pinned job pill in reference 02) and `Target`.
