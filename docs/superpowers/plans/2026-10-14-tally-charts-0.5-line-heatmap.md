# tally-charts 0.5 Line Chart and Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `tally-charts` 0.5, the last two catalog charts:
- `LineChart` ("Margin outlook"), with actual, forecast and scenario series, a likely-range band, a shaded forecast region, a target, and one tooltip for every series at an x
- `Heatmap` ("Where it leaks"), an HTML CSS grid with `role="grid"`, header and total rows and columns, and threshold bins with a legend

Along with them come a point scale and the `Line`, `Band`, `Grid` and `Region` marks. `Legend` gains line and sequential swatches.

**Architecture:** The 0.1–0.4 layering stays.
- `core` gains a point scale (`d3-scale`'s `scalePoint`, from the band module already bundled) and gap-aware `linePath`/`bandPath` builders.
- `LineChart` registers one point per x, carrying segments for every series, and uses `NearestPointer axis="x"` from 0.4. That gives the spec's "lines snap to the nearest x and activate every series at that x".
- `Heatmap` is plain HTML. It isn't a `<Chart>`, because spec §4 calls for an HTML CSS grid. It has its own roving-tabindex keyboard model inside one tab stop.

**Tech Stack:** unchanged. No new dependencies: straight segments need no `d3-shape` (see design decisions).

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-design.md`. Reference screenshots:
- `docs/reference/07-forecast.png`, card "Margin outlook" (line chart)
- `docs/reference/05-leakage-heatmap.png`, card "Where it leaks" (heatmap)

This is plan 5 of 6. `main` is at `ecc5b7f` with 0.1–0.4 merged; `origin` is `github.com/mwadon/tally-charts` (private) and CI is green. **Execute on a new branch `feat/0.5-line-heatmap` from `main`.** Push it at the end only if the user asks.

## Global Constraints

**Toolchain and packaging**
- Node `>=22`; `packageManager` is `pnpm@12.4.2`. No new dependencies of any kind.
- Runtime dependencies stay `d3-scale@^4.0.2` (`scaleBand` and `scalePoint` only, never `scaleLinear` or `scaleTime`) and `d3-array@^3.2.4`.
- ESM only. `sideEffects: ["*.css"]`. Subpath exports `tally-charts`, `tally-charts/core`, `tally-charts/theme.css`. The main entry keeps its `'use client'` banner; `core` stays React-free.
- Bundle budgets (min+gzip, d3 included): `core` ≤ 8 KB; any single chart ≤ 15 KB. Never raise a budget; report the measured number instead.

**Naming and API surface**
- CSS tokens use the `--ch-` prefix. Part hooks are `data-ch-part`, `data-ch-tone`, `data-ch-fill`. `ch-*` class names are internal.
- Tones: `accent | accent-soft | loss | warn | gain | neutral`.
- Shared prop names (spec §6): `data`, `x`, `y`, `id`, `label`, `series`, `tone`, `format`, `height`, `initialWidth`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`, `className`, `style`.
- `<Chart>`-based high-level charts:
  - render `children` after their own marks
  - render a hidden data table by default (`dataTable`, default `true`)
  - report the user's original objects as `point.datum` via `userCallbacks` (`react/charts/shared.ts`)
- Every exported component has an exported `XxxProps` type. No `any` in the public API.

**Data and formatting**
- Numbers from data go through the strict core `toNumber`: numbers pass, non-blank numeric strings parse, and everything else is missing.
- Ids from data go through `resolveIds` (warn and fall back to index on duplicates or missing ids).
- Default locale `en-US`, currency `USD`. Negative numbers use U+2212 (`−`). Format through `useFormat()` / `ctx.format`.

**Errors and warnings**
- Bad data never throws. Development warnings go through `createWarner()` / `ctx.warn`, start with `[tally-charts] `, fire once per key per chart, and every call sits inside `if (DEV) { … }`.

**Accessibility, interaction and motion**
- `<Chart>` charts: the root is a `<figure>` and a single tab stop. Spec §5: "lines snap to the nearest x and activate every series at that x"; "one tooltip for all series at a given x".
- `Heatmap`: spec §4 asks for an HTML CSS grid with `role="grid"`. The grid is one tab stop, using a roving `tabIndex`. Arrow keys move between data cells, Home/End jump to a row's ends, and Enter/Space select. Cells carry the value as text, so the grid is its own data table.
- Only hit layers take pointer events: `bar-hit` and `pointer-layer`. Every other SVG part is in theme.css's shared `pointer-events: none` selector list, and SVG text never takes pointer events.
- Colored HTML text meets 4.5:1 contrast (axe runs on every story).
- `prefers-reduced-motion` and `animate={false}` disable all motion. Spec §5: "lines draw in".

**Code style and commits**
- Biome: 2 spaces, single quotes, no semicolons, line width 100. `pnpm format` before every commit. `pnpm lint` must exit 0; 4 `noImportantStyles` warnings and 1 biome info are expected.
- Conventional commit messages, ending with the `Co-Authored-By:` trailer naming the model that wrote the code.
- Commands run from the repo root. Unit tests: `pnpm test`, or `pnpm --filter tally-charts exec vitest run <path>`. The shell is zsh: quote globs.

**Deferred** (not in 0.5): time scales, curved lines, docs site, API freeze (1.0).

## Design decisions this plan makes

1. **Time scales are deferred.** Spec §3.1 says "Point and time scales arrive with `LineChart` (0.5)".
   - A real time scale needs calendar-aware ticks (`d3-time`/`d3-time-format` or an equivalent). That would cost a large share of the 15 KB budget and is a design of its own.
   - 0.5 ships the point scale. Dates go on it with formatted labels, e.g. `x={(d) => fmt.month(d.date)}`, or the reference's "Apr … Dec".
   - Time scales are on the 1.0 list. This is a spec deviation the user sees in the release notes.
2. **No `d3-shape`.** The reference draws straight segments. `linePath` and `bandPath` are small core functions with gap handling: a missing value breaks a line or band into separate runs. Curves can come with `d3-shape` later.
3. **One point per x.** `LineChart` registers a single point per x value, carrying every series that has a value there. Hover (`NearestPointer axis="x"`), the keyboard and the tooltip all work per x. The marks (`Line`, `Band`) only draw. The id of an x point is its x value as a string.
4. **Series styles.**
   - `'actual'` (the default): a solid line with filled dots.
   - `'forecast'`: a dashed line with hollow dots.
   - `'scenario'`: a dashed line with filled dots, in tone `gain` by default.
   - Forecasts are drawn before actuals, so the shared join point shows the actual's filled dot.
5. **Forecast joins.** A forecast or scenario that should start where the actuals end must repeat the last actual value at that x. The data decides the join; the chart never invents one. Where an `actual` series has a value, the tooltip and the announcement list only the actual series, because there the forecasts only repeat it.
6. **Heatmap colors** use the five sequential tokens `--ch-seq-1…5`.
   - `n` bins (`breaks.length + 1`, at most 5) spread over the levels: one bin uses level 3; otherwise bin `i` uses `round(1 + i·4/(n−1))`.
   - Missing cells are level 0: no fill, and "–" as the text.
   - `--ch-seq-5` becomes 75% of the base mixed with black, so white text on it passes 4.5:1 in both themes. Level 5 cells use white text and the others use ink.
   - The sequential tokens are also defined on `.ch-legend`, so legend swatches outside a chart resolve.
7. **Heatmap ids** are `` `${row}:${column}` ``. `onActiveChange(id, cell | null)` and `onSelect(id, cell)` receive a `HeatmapCell<D>` with `{ id, row, column, value, datum, level }`.

## Review Focus

These failure modes follow from the spec but aren't obviously covered by a feature test. Each one has a pinned test in the task that owns the code.

1. **Missing values inside a series.** The line breaks into separate runs, with no `NaN` path, no dot for the missing value, and a tooltip that lists only the series that have a value there. Tests:
   - Task 2, "breaks a line at missing values into separate runs"
   - Task 4, "lists only the series with a value in the tooltip"
2. **A forecast that starts where actuals end** joins at the shared x, and the actual's filled dot shows on top. Test: Task 4, "joins the forecast to the last actual".
3. **Values outside the y domain** stay inside the plot, for both lines and bands. Test: Task 3, "clamps values outside the domain into the plot".
4. **Heatmap missing or non-numeric cells** show "–", have no fill and an accessible "no data" label, are left out of totals, and nothing throws. Tests: Task 6, "shows a dash for a missing cell" and "skips non-numeric values without throwing".
5. **Heatmap keyboard.**
   - There is exactly one tab stop, and arrows move it.
   - At an edge the focus stays put and the page doesn't scroll.
   - Home and End jump to a row's ends.
   - Enter selects.

   Test: Task 6, "moves between cells with the arrow keys and selects with Enter".

---

## File Structure

```
packages/tally-charts/
  src/core/scale.ts, src/core/ticks.ts (+ tests)    point scale; category ticks       (Task 1)
  src/react/marks/Axis.tsx (+ test)                 point axes                        (Task 1)
  src/core/path.ts, src/core/line.ts (+ test)       round2; linePath, bandPath        (Task 2)
  src/core/area.ts                                  uses round2                       (Task 2)
  src/react/marks/Line.tsx, Band.tsx, Grid.tsx, Region.tsx (+ tests)                  (Task 3)
  src/react/charts/LineChart.tsx (+ test)                                             (Task 4)
  src/core/types.ts; src/react/ui/Legend.tsx (+ test)   SeqLevel; line + level swatches (Task 5)
  src/react/charts/Heatmap.tsx (+ test)                                               (Task 6)
  src/theme/theme.css (+ theme.test.ts)             marks, sequential tokens, heatmap (Tasks 3, 5, 6)
  src/index.ts, src/core/index.ts, src/index.test.ts, .size-limit.json, README.md,
  test/fixtures.tsx, src/ssr.node.test.tsx                                            (Task 7)
.changeset/tally-charts-0-5.md                                                        (Task 7)
apps/storybook/stories/MarginOutlook.stories.tsx, WhereItLeaks.stories.tsx            (Task 8)
apps/storybook/e2e/stories.spec.ts, e2e/__screenshots__/{darwin,linux}/              (Task 8)
```

---
### Task 1: Point scale, category helpers and point axes

**Files:**
- Modify: `packages/tally-charts/src/core/scale.ts`, `packages/tally-charts/src/core/scale.test.ts`
- Modify: `packages/tally-charts/src/core/linear.ts`, `packages/tally-charts/src/core/linear.test.ts`
- Modify: `packages/tally-charts/src/core/ticks.ts`, `packages/tally-charts/src/core/ticks.test.ts`
- Modify: `packages/tally-charts/src/react/marks/Axis.tsx`, `packages/tally-charts/src/react/marks/Axis.test.tsx`

**Interfaces:**
- Consumes: the existing `createScale`, `LinearScale`, `bandTicks`, `linearTicks` and `Tick`.
- Produces:
  - `PointScaleSpec<D> { type: 'point'; field?: Accessor<D, string | number>; domain?: readonly (string | number)[]; padding?: number }`, part of `ScaleSpec<D>`
  - the `ResolvedScale` member `{ kind: 'point'; scale: ScalePoint<string>; field?: FieldGetter }`
  - `categoryCenter(resolved: ResolvedScale, value: unknown): number | undefined`: the band centre or point position in px; `undefined` on a linear scale or for an unknown or nullish value
  - `categoryStep(resolved: ResolvedScale): number`: `step()` of a band or point scale, 0 on a linear scale
  - `clampToRange(scale: LinearScale, px: number): number`, in `core/linear.ts`
  - `pointTicks(scale: ScalePoint<string>, spec: TickSpec, format: (value: string) => string): Tick[]`
  - `<Axis>` that labels point scales

- [ ] **Step 1: Write the failing tests**

Append to `packages/tally-charts/src/core/scale.test.ts`, and change its import to `import { categoryCenter, categoryStep, createScale, inferLinearDomain } from './scale'`:

```ts
describe('point scales', () => {
  const months = [{ m: 'Apr' }, { m: 'May' }, { m: 'Jun' }]

  it('spaces points evenly with half a step at each end', () => {
    const s = createScale({ type: 'point', field: 'm' }, months, 'x', 300, noop)
    if (s.kind !== 'point') throw new Error('expected a point scale')
    expect(s.scale.domain()).toEqual(['Apr', 'May', 'Jun'])
    expect(['Apr', 'May', 'Jun'].map((m) => s.scale(m))).toEqual([50, 150, 250])
    expect(s.scale.step()).toBe(100)
  })

  it('centres a single point', () => {
    const s = createScale({ type: 'point', domain: ['Apr'] }, [], 'x', 300, noop)
    if (s.kind !== 'point') throw new Error('expected a point scale')
    expect(s.scale('Apr')).toBe(150)
  })

  it('takes an explicit domain and padding', () => {
    const s = createScale({ type: 'point', domain: ['a', 'b'], padding: 0 }, [], 'x', 100, noop)
    if (s.kind !== 'point') throw new Error('expected a point scale')
    expect([s.scale('a'), s.scale('b')]).toEqual([0, 100])
  })

  it('warns when it has no domain', () => {
    const warn = vi.fn()
    createScale({ type: 'point' }, months, 'x', 100, warn)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('x-point-domain')
    expect(warn.mock.calls[0]?.[1]).toContain('<Chart x>')
  })
})

describe('categoryCenter and categoryStep', () => {
  const band = createScale({ type: 'band', domain: ['a', 'b'], padding: 0 }, [], 'x', 200, noop)
  const point = createScale({ type: 'point', domain: ['a', 'b'] }, [], 'x', 200, noop)
  const linear = createScale({ domain: [0, 1] }, [], 'x', 100, noop)

  it('finds band centres and point positions', () => {
    expect(categoryCenter(band, 'b')).toBe(150)
    expect(categoryStep(band)).toBe(100)
    expect(categoryCenter(point, 'a')).toBe(50)
    expect(categoryCenter(point, 'b')).toBe(150)
    expect(categoryStep(point)).toBe(100)
  })

  it('matches numbers to their string categories', () => {
    const years = createScale({ type: 'point', domain: [2024, 2025] }, [], 'x', 200, noop)
    expect(categoryCenter(years, 2025)).toBe(150)
  })

  it('gives undefined for unknown values and linear scales', () => {
    expect(categoryCenter(point, 'z')).toBeUndefined()
    expect(categoryCenter(point, null)).toBeUndefined()
    expect(categoryCenter(point, undefined)).toBeUndefined()
    expect(categoryCenter(linear, 0)).toBeUndefined()
    expect(categoryStep(linear)).toBe(0)
  })
})
```

Append to `packages/tally-charts/src/core/linear.test.ts`, adding `clampToRange` to its import from `'./linear'`:

```ts
describe('clampToRange', () => {
  it('keeps pixel positions inside an inverted range', () => {
    const s = linearScale([0, 10], [100, 0])
    expect(clampToRange(s, s(15))).toBe(0)
    expect(clampToRange(s, s(-5))).toBe(100)
    expect(clampToRange(s, s(5))).toBe(50)
  })
})
```

Append to `packages/tally-charts/src/core/ticks.test.ts`, adding `pointTicks` to its import from `'./ticks'` and `import { scalePoint } from 'd3-scale'` (skip whichever import already exists):

```ts
describe('pointTicks', () => {
  // 400px, padding 0.5: a 100px step, points at 50, 150, 250 and 350.
  const s = scalePoint<string>().domain(['Apr', 'May', 'Jun', 'Jul']).range([0, 400]).padding(0.5)

  it('labels every point, centred', () => {
    expect(pointTicks(s, 'all', String).map((t) => [t.label, t.position, t.anchor])).toEqual([
      ['Apr', 50, 'middle'],
      ['May', 150, 'middle'],
      ['Jun', 250, 'middle'],
      ['Jul', 350, 'middle'],
    ])
  })

  it('labels the ends or every nth point', () => {
    expect(pointTicks(s, 'ends', String).map((t) => t.label)).toEqual(['Apr', 'Jul'])
    expect(pointTicks(s, 2, String).map((t) => t.label)).toEqual(['Apr', 'Jun'])
  })

  it('formats labels and tolerates an empty domain', () => {
    expect(pointTicks(s, 'ends', (v) => v.toUpperCase()).map((t) => t.label)).toEqual([
      'APR',
      'JUL',
    ])
    expect(pointTicks(scalePoint<string>(), 'all', String)).toEqual([])
  })
})
```

Append inside `describe('<Axis>', …)` in `packages/tally-charts/src/react/marks/Axis.test.tsx`:

```tsx
  it('labels point scales at their positions', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={400}
        x={{ type: 'point', domain: ['Apr', 'May', 'Jun', 'Jul'] }}
        y={{ type: 'point', domain: ['a', 'b'] }}
      >
        <Axis side="bottom" />
        <Axis side="left" />
      </Chart>,
    )
    const all = [...container.querySelectorAll('[data-ch-part="axis-label"]')]
    expect(all.map((el) => el.textContent)).toEqual(['Apr', 'May', 'Jun', 'Jul', 'a', 'b'])
    expect(all.slice(0, 4).map((el) => el.getAttribute('x'))).toEqual(['50', '150', '250', '350'])
    expect(all[0]).toHaveAttribute('text-anchor', 'middle')
    expect(all.slice(4).map((el) => el.getAttribute('y'))).toEqual(['25', '75'])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/scale.test.ts src/core/linear.test.ts src/core/ticks.test.ts src/react/marks/Axis.test.tsx`
Expected: FAIL. `categoryCenter`, `clampToRange` and `pointTicks` don't exist yet, and `type: 'point'` builds a linear scale.

- [ ] **Step 3: Implement the point scale and the helpers**

In `packages/tally-charts/src/core/scale.ts`:

Change the d3 import to:

```ts
import { type ScaleBand, type ScalePoint, scaleBand, scalePoint } from 'd3-scale'
```

Add after `BandScaleSpec`, and replace `ScaleSpec` and `ResolvedScale`:

```ts
export interface PointScaleSpec<D> {
  type: 'point'
  field?: Accessor<D, string | number>
  domain?: readonly (string | number)[]
  /** Space before the first and after the last point, as a share of one step, 0–1. Default 0.5. */
  padding?: number
}

export type ScaleSpec<D> = LinearScaleSpec<D> | BandScaleSpec<D> | PointScaleSpec<D>

export type ResolvedScale =
  | { kind: 'band'; scale: ScaleBand<string>; field?: FieldGetter }
  | { kind: 'point'; scale: ScalePoint<string>; field?: FieldGetter }
  | { kind: 'linear'; scale: LinearScale; field?: FieldGetter }
```

In `createScale`, replace the `if (spec?.type === 'band') { … }` block with:

```ts
  if (spec?.type === 'band' || spec?.type === 'point') {
    const domain = spec.domain ? spec.domain.map(String) : field ? uniqueStrings(data, field) : []
    if (DEV && domain.length === 0) {
      warn(
        `${axis}-${spec.type}-domain`,
        `The ${axis} ${spec.type} scale has no domain. Set \`field\` or \`domain\` on <Chart ${axis}>.`,
      )
    }
    if (spec.type === 'point') {
      const scale = scalePoint<string>()
        .domain(domain)
        .range([0, length])
        .padding(spec.padding ?? 0.5)
      return { kind: 'point', scale, field }
    }
    const scale = scaleBand<string>()
      .domain(domain)
      .range([0, length])
      .paddingInner(spec.padding ?? 0.2)
      .paddingOuter(spec.paddingOuter ?? 0)
    return { kind: 'band', scale, field }
  }
```

The band warning keeps its old key and text (`x-band-domain`, "The x band scale has no domain…").

Append to the end of `scale.ts`:

```ts
/**
 * Centre of a category in px: the middle of a band, or the position of a point. Undefined on a
 * linear scale and for a category the scale doesn't know.
 */
export function categoryCenter(resolved: ResolvedScale, value: unknown): number | undefined {
  if (resolved.kind === 'linear' || value === null || value === undefined) return undefined
  const start = resolved.scale(String(value))
  return start === undefined ? undefined : start + resolved.scale.bandwidth() / 2
}

/** Distance between neighbouring categories in px; 0 on a linear scale. */
export function categoryStep(resolved: ResolvedScale): number {
  return resolved.kind === 'linear' ? 0 : resolved.scale.step()
}
```

Append to `packages/tally-charts/src/core/linear.ts`:

```ts
/** Clamps a pixel position into the scale's range, so out-of-domain values stay in the plot. */
export function clampToRange(scale: LinearScale, px: number): number {
  const [r0, r1] = scale.range()
  return Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
}
```

- [ ] **Step 4: Implement point ticks and point axes**

In `packages/tally-charts/src/core/ticks.ts`, change the d3 import to `import type { ScaleBand, ScalePoint } from 'd3-scale'` and add after `bandTicks`:

```ts
/** Labels for a point scale: every point ('all'), the first and last ('ends'), or every nth. */
export function pointTicks(
  scale: ScalePoint<string>,
  spec: TickSpec,
  format: (value: string) => string,
): Tick[] {
  const domain = scale.domain()
  const step = typeof spec === 'number' ? Math.max(1, Math.ceil(domain.length / spec)) : 1
  const picked =
    spec === 'ends'
      ? domain.filter((_, i) => i === 0 || i === domain.length - 1)
      : domain.filter((_, i) => i % step === 0)
  return picked.map((value) => ({
    value,
    position: scale(value) ?? 0,
    label: format(value),
    anchor: 'middle',
  }))
}
```

In `packages/tally-charts/src/react/marks/Axis.tsx`, import `pointTicks` with the other tick functions and replace the `raw` expression with:

```tsx
  const label = (v: string) => (custom ? custom(v) : v)
  const raw =
    resolved.kind === 'band'
      ? bandTicks(resolved.scale, spec, label, { anchorEnds: horizontal })
      : resolved.kind === 'point'
        ? pointTicks(resolved.scale, spec, label)
        : linearTicks(resolved.scale, spec, (v) => (custom ? custom(v) : numeric(v)), extent)
```

- [ ] **Step 5: Run the tests and the type check**

Run: `pnpm --filter tally-charts exec vitest run src/core src/react/marks/Axis.test.tsx && pnpm typecheck`
Expected: PASS. Every other `kind` check in `src/` compares against `'band'` or `'linear'` explicitly, so it compiles unchanged. If `tsc` reports a `kind` narrowing error anywhere, handle `'point'` there the way that mark already treats a scale it doesn't support (warn and return `null`), and list the file in your report.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat(core): point scales, category helpers and point axes"
```

---

### Task 2: Gap-aware line and band paths

**Files:**
- Create: `packages/tally-charts/src/core/path.ts`
- Create: `packages/tally-charts/src/core/line.ts`, `packages/tally-charts/src/core/line.test.ts`
- Modify: `packages/tally-charts/src/core/area.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `round2(n: number): number` in `core/path.ts`
  - `LinePoint { x: number; y: number }`, `linePath(points: readonly LinePoint[]): string`
  - `BandPoint { x: number; low: number; high: number }`, `bandPath(points: readonly BandPoint[]): string`

  All of these are in pixels. A non-finite coordinate is a gap.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/core/line.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bandPath, linePath } from './line'

describe('linePath', () => {
  it('joins points with straight segments', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 50, y: 20 },
        { x: 100, y: 5 },
      ]),
    ).toBe('M0,10L50,20L100,5')
  })

  it('breaks a line at missing values into separate runs', () => {
    const d = linePath([
      { x: 0, y: 10 },
      { x: 25, y: 12 },
      { x: 50, y: Number.NaN },
      { x: 100, y: 5 },
      { x: 150, y: 6 },
    ])
    expect(d).toBe('M0,10L25,12M100,5L150,6')
    expect(d).not.toContain('NaN')
  })

  it('draws nothing for lone points', () => {
    expect(linePath([{ x: 0, y: 10 }])).toBe('')
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: Number.NaN, y: 4 },
        { x: 100, y: 5 },
      ]),
    ).toBe('')
    expect(linePath([])).toBe('')
  })

  it('rounds to two decimals', () => {
    expect(
      linePath([
        { x: 1 / 3, y: 2 / 3 },
        { x: 1, y: 1 },
      ]),
    ).toBe('M0.33,0.67L1,1')
  })
})

describe('bandPath', () => {
  it('closes the area along the high values and back along the low values', () => {
    expect(
      bandPath([
        { x: 0, low: 30, high: 10 },
        { x: 50, low: 35, high: 15 },
      ]),
    ).toBe('M0,10L50,15L50,35L0,30Z')
  })

  it('splits into one shape per run of complete points', () => {
    const d = bandPath([
      { x: 0, low: 30, high: 10 },
      { x: 50, low: 35, high: 15 },
      { x: 100, low: Number.NaN, high: 15 },
      { x: 150, low: 30, high: 10 },
      { x: 200, low: 32, high: 12 },
    ])
    expect(d).toBe('M0,10L50,15L50,35L0,30ZM150,10L200,12L200,32L150,30Z')
    expect(d).not.toContain('NaN')
  })

  it('draws nothing without two complete points', () => {
    expect(bandPath([{ x: 0, low: 30, high: 10 }])).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/line.test.ts`
Expected: FAIL; `./line` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/core/path.ts`:

```ts
/** Rounds to two decimals so SVG paths stay short and identical on server and client. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

In `packages/tally-charts/src/core/area.ts`, delete the local `const round = …` line, add `import { round2 } from './path'` at the top, and rename the four `round(` calls to `round2(`.

Create `packages/tally-charts/src/core/line.ts`:

```ts
import { round2 } from './path'

export interface LinePoint {
  x: number
  y: number
}

export interface BandPoint {
  x: number
  low: number
  high: number
}

/** Runs of consecutive points that pass `complete`; any other point ends the current run. */
function runs<P>(points: readonly P[], complete: (p: P) => boolean): P[][] {
  const out: P[][] = []
  let run: P[] = []
  for (const p of points) {
    if (complete(p)) {
      run.push(p)
    } else if (run.length > 0) {
      out.push(run)
      run = []
    }
  }
  if (run.length > 0) out.push(run)
  return out
}

const through = (points: readonly { x: number; y: number }[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round2(p.x)},${round2(p.y)}`).join('')

/**
 * Straight segments through the points (px). A point with a non-finite coordinate breaks the
 * line; a run of one point draws nothing, so its dot is what shows it.
 */
export function linePath(points: readonly LinePoint[]): string {
  return runs(points, (p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .filter((run) => run.length > 1)
    .map(through)
    .join('')
}

/**
 * Closed shapes between `high` and `low` (px), one per run of complete points: forward along
 * `high`, back along `low`.
 */
export function bandPath(points: readonly BandPoint[]): string {
  return runs(points, (p) => [p.x, p.low, p.high].every(Number.isFinite))
    .filter((run) => run.length > 1)
    .map((run) => {
      const top = through(run.map((p) => ({ x: p.x, y: p.high })))
      const back = [...run]
        .reverse()
        .map((p) => `L${round2(p.x)},${round2(p.low)}`)
        .join('')
      return `${top}${back}Z`
    })
    .join('')
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/core`
Expected: PASS, including the unchanged `area.test.ts`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/core
git commit -m "feat(core): gap-aware line and band paths"
```

---

### Task 3: `Line`, `Band`, `Grid` and `Region` marks

**Files:**
- Create: `packages/tally-charts/src/react/marks/Line.tsx`, `Line.test.tsx`
- Create: `packages/tally-charts/src/react/marks/Band.tsx`, `Band.test.tsx`
- Create: `packages/tally-charts/src/react/marks/Grid.tsx`, `Grid.test.tsx`
- Create: `packages/tally-charts/src/react/marks/Region.tsx`, `Region.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`, `packages/tally-charts/src/theme/theme.test.ts`

**Interfaces:**
- Consumes:
  - from Task 1: `categoryCenter`, `categoryStep`, `clampToRange`, point scales
  - from Task 2: `linePath`, `bandPath`, `round2`
  - existing: `linearTicks`, `toneVar` (`react/ui/util.ts`), `useChart`
- Produces:
  - `LineProps<D> { data?; x?: Accessor<D, string | number>; y?: Accessor<D, number>; tone?: Tone; dashed?: boolean; dots?: LineDots; radius?: number }`, with `LineDots = 'filled' | 'hollow' | 'none'`.
    - Parts: `line-group` (with `data-ch-tone`), `line` (with `data-ch-dashed`), `line-dot` (with `data-ch-hollow`), and `dot-ring` for the active dot.
    - The active dot is the one whose category, as a string, equals `ctx.activeId` as a string.
  - `BandProps<D> { data?; x?; low: Accessor<D, number>; high: Accessor<D, number>; tone?: Tone }`; part `band`.
  - `GridProps { ticks?: TickSpec; extent?: readonly [number, number] }`: horizontal lines at the y ticks, matching `<Axis side="left">` for the same `ticks`. Parts `grid` and `grid-line`.
  - `RegionProps { from: string | number; to?: string | number; tone?: Tone }`: a rect over whole category steps, from `from` to `to` (default: the last category). Part `region`.

All four marks only draw; they register no points.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/marks/Line.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Line, type LineProps } from './Line'

type Row = { m: string; v: number | null }
const rows: Row[] = [
  { m: 'Apr', v: 2 },
  { m: 'May', v: 5 },
  { m: 'Jun', v: 8 },
]

// 300 × 100 with no margin: points at x 50, 150 and 250; y = 100 − 10 × v.
function renderLine(props: Partial<LineProps<Row>> = {}, chart: Partial<ChartProps<Row>> = {}) {
  return render(
    <Chart<Row>
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      animate={false}
      data={rows}
      x={{ type: 'point', field: 'm' }}
      y={{ field: 'v', domain: [0, 10] }}
      {...chart}
    >
      <Line<Row> {...props} />
    </Chart>,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const attrs = (els: Element[], name: string) => els.map((el) => el.getAttribute(name))

describe('<Line>', () => {
  it('draws straight segments through the points, with filled dots', () => {
    const { container } = renderLine()
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M50,80L150,50L250,20')
    expect(parts(container, 'line')[0]).not.toHaveAttribute('data-ch-dashed')
    expect(parts(container, 'line-group')[0]).toHaveAttribute('data-ch-tone', 'accent')
    const dots = parts(container, 'line-dot')
    expect(attrs(dots, 'cx')).toEqual(['50', '150', '250'])
    expect(attrs(dots, 'cy')).toEqual(['80', '50', '20'])
    expect(attrs(dots, 'r')).toEqual(['4', '4', '4'])
    expect(dots.some((d) => d.hasAttribute('data-ch-hollow'))).toBe(false)
  })

  it('dashes the line and hollows the dots on request', () => {
    const { container } = renderLine({ dashed: true, dots: 'hollow', tone: 'gain' })
    expect(parts(container, 'line')[0]).toHaveAttribute('data-ch-dashed', 'true')
    expect(parts(container, 'line-group')[0]).toHaveAttribute('data-ch-tone', 'gain')
    expect(attrs(parts(container, 'line-dot'), 'data-ch-hollow')).toEqual(['true', 'true', 'true'])
  })

  it('leaves the dots out on request', () => {
    const { container } = renderLine({ dots: 'none' })
    expect(parts(container, 'line-dot')).toHaveLength(0)
    expect(parts(container, 'line')).toHaveLength(1)
  })

  it('skips missing values', () => {
    const { container } = renderLine({}, { data: rows.map((r) => (r.m === 'May' ? { ...r, v: null } : r)) })
    expect(attrs(parts(container, 'line-dot'), 'cx')).toEqual(['50', '250'])
    // Two lone points: no segment to draw.
    expect(parts(container, 'line')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('clamps values outside the domain into the plot', () => {
    const { container } = renderLine(
      {},
      { data: [{ m: 'Apr', v: -5 }, { m: 'May', v: 5 }, { m: 'Jun', v: 15 }] },
    )
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M50,100L150,50L250,0')
    expect(attrs(parts(container, 'line-dot'), 'cy')).toEqual(['100', '50', '0'])
  })

  it('rings the dot at the active category', () => {
    const { container } = renderLine({}, { activeId: 'May' })
    const ring = parts(container, 'dot-ring')
    expect(ring).toHaveLength(1)
    expect(ring[0]).toHaveAttribute('cx', '150')
    expect(ring[0]).toHaveAttribute('cy', '50')
    expect(ring[0]).toHaveAttribute('r', '7')
    const other = renderLine({}, { activeId: 'Dec' })
    expect(parts(other.container, 'dot-ring')).toHaveLength(0)
  })

  it('reads its own data and fields, and centres on bands', () => {
    const { container } = render(
      <Chart
        width={300}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', domain: ['Apr', 'May', 'Jun'], padding: 0 }}
        y={{ domain: [0, 10] }}
      >
        <Line<Row> data={rows} x="m" y="v" />
      </Chart>,
    )
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M50,80L150,50L250,20')
  })

  it('warns and draws nothing on a linear x scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderLine({}, { x: { domain: [0, 1] } })
    expect(parts(container, 'line-group')).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Line needs a point or band scale')
  })
})
```

Create `packages/tally-charts/src/react/marks/Band.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Band } from './Band'

type Row = { m: string; lo: number | null; hi: number | null }
const rows: Row[] = [
  { m: 'Apr', lo: 1, hi: 3 },
  { m: 'May', lo: 3, hi: 4 },
  { m: 'Jun', lo: 2, hi: 5 },
]

// 300 × 100 with no margin: x 50, 150, 250; y = 100 − 10 × v.
function renderBand(chart: Partial<ChartProps<Row>> = {}) {
  return render(
    <Chart<Row>
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      data={rows}
      x={{ type: 'point', field: 'm' }}
      y={{ domain: [0, 10] }}
      {...chart}
    >
      <Band<Row> low="lo" high="hi" />
    </Chart>,
  )
}

const band = (root: HTMLElement) => root.querySelector('[data-ch-part="band"]')

describe('<Band>', () => {
  it('fills between the low and high values', () => {
    const { container } = renderBand()
    expect(band(container)).toHaveAttribute('d', 'M50,70L150,60L250,50L250,80L150,70L50,90Z')
    expect(band(container)).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('clamps values outside the domain into the plot', () => {
    const { container } = renderBand({
      data: rows.map((r) => (r.m === 'Jun' ? { ...r, hi: 12 } : r)),
    })
    expect(band(container)).toHaveAttribute('d', 'M50,70L150,60L250,0L250,80L150,70L50,90Z')
  })

  it('breaks at a missing value and draws nothing without two complete points', () => {
    const { container } = renderBand({
      data: rows.map((r) => (r.m === 'May' ? { ...r, lo: null } : r)),
    })
    expect(band(container)).toBeNull()
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('warns on a linear x scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBand({ x: { domain: [0, 1] } })
    expect(band(container)).toBeNull()
    expect(warn.mock.calls[0]?.[0]).toContain('Band needs a point or band scale')
  })
})
```

Create `packages/tally-charts/src/react/marks/Grid.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Grid, type GridProps } from './Grid'

function renderGrid(props: GridProps = {}, y: { domain: [number, number] } = { domain: [30, 40] }) {
  return render(
    <Chart
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'point', domain: ['a'] }}
      y={y}
    >
      <Grid {...props} />
    </Chart>,
  )
}

const lines = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="grid-line"]')]

describe('<Grid>', () => {
  it('rules a line across the plot at each y tick', () => {
    const { container } = renderGrid()
    expect(lines(container).map((l) => l.getAttribute('y1'))).toEqual([
      '100',
      '80',
      '60',
      '40',
      '20',
      '0',
    ])
    expect(lines(container)[0]).toHaveAttribute('x1', '0')
    expect(lines(container)[0]).toHaveAttribute('x2', '300')
  })

  it('follows a tick count and an extent like the axis does', () => {
    expect(lines(renderGrid({ ticks: 2 }).container)).toHaveLength(3)
    expect(lines(renderGrid({ extent: [32, 38] }).container)).toHaveLength(7)
  })

  it('warns without a linear y scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart width={300} height={100} x={{ domain: [0, 1] }} y={{ type: 'band', domain: ['a'] }}>
        <Grid />
      </Chart>,
    )
    expect(lines(container)).toHaveLength(0)
    expect(warn.mock.calls[0]?.[0]).toContain('Grid needs a linear scale on <Chart y>')
  })
})
```

`d3-array`'s `ticks(30, 40, 5)` steps by 2 (6 lines); `ticks(30, 40, 2)` by 5 (3 lines); `ticks(32, 38, 5)` by 1 (7 lines).

Create `packages/tally-charts/src/react/marks/Region.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ScaleSpec } from '../../core/scale'
import { Chart } from '../Chart'
import { Region, type RegionProps } from './Region'

const POINTS: ScaleSpec<unknown> = { type: 'point', domain: ['Apr', 'May', 'Jun'] }

// 300px with points at 50, 150, 250: each step is 100px wide.
function renderRegion(props: RegionProps, x: ScaleSpec<unknown> = POINTS) {
  return render(
    <Chart
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={x}
      y={{ domain: [0, 1] }}
    >
      <Region {...props} />
    </Chart>,
  )
}

const rect = (root: HTMLElement) => root.querySelector('[data-ch-part="region"]')

describe('<Region>', () => {
  it('shades from halfway before `from` to the end of the plot', () => {
    const { container } = renderRegion({ from: 'May' })
    expect(rect(container)).toHaveAttribute('x', '100')
    expect(rect(container)).toHaveAttribute('width', '200')
    expect(rect(container)).toHaveAttribute('y', '0')
    expect(rect(container)).toHaveAttribute('height', '100')
    expect(rect(container)).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('stops at `to`, in either order', () => {
    const forward = renderRegion({ from: 'Apr', to: 'May' })
    expect(rect(forward.container)).toHaveAttribute('x', '0')
    expect(rect(forward.container)).toHaveAttribute('width', '200')
    forward.unmount()
    const reversed = renderRegion({ from: 'Jun', to: 'Apr' })
    expect(rect(reversed.container)).toHaveAttribute('width', '300')
  })

  it('spans whole bands on a band scale', () => {
    const { container } = renderRegion(
      { from: 'b' },
      { type: 'band', domain: ['a', 'b', 'c'], padding: 0 },
    )
    expect(rect(container)).toHaveAttribute('x', '100')
    expect(rect(container)).toHaveAttribute('width', '200')
  })

  it('warns and draws nothing for a category that is not on the scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderRegion({ from: 'Dec' })
    expect(rect(container)).toBeNull()
    expect(warn.mock.calls[0]?.[0]).toContain('Region from "Dec"')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks/Line.test.tsx src/react/marks/Band.test.tsx src/react/marks/Grid.test.tsx src/react/marks/Region.test.tsx`
Expected: FAIL; the modules don't exist.

- [ ] **Step 3: Implement the marks**

Create `packages/tally-charts/src/react/marks/Line.tsx`:

```tsx
import { toFieldGetter } from '../../core/accessor'
import { linePath } from '../../core/line'
import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { round2 } from '../../core/path'
import { categoryCenter } from '../../core/scale'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export type LineDots = 'filled' | 'hollow' | 'none'

export interface LineProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Category field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number>
  /** Value field. Defaults to the field on <Chart y>. */
  y?: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
  /** Dashed stroke, e.g. for a forecast. Default false. */
  dashed?: boolean
  /** A dot at each value. Default 'filled'. */
  dots?: LineDots
  /** Dot radius in px. Default 4. */
  radius?: number
}

/**
 * Straight segments through the category centres of a point or band x scale. A missing value
 * breaks the line. The dot whose category equals the chart's active id gets a ring, so a chart
 * that registers one point per category (id = the category) lights every line at that x.
 */
export function Line<D>({
  data,
  x,
  y,
  tone = 'accent',
  dashed = false,
  dots = 'filled',
  radius = 4,
}: LineProps<D>) {
  const ctx = useChart('Line')
  if (ctx.x.kind === 'linear' || ctx.y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        'line-scales',
        'Line needs a point or band scale on <Chart x> and a linear scale on <Chart y>.',
      )
    }
    return null
  }
  const getX = toFieldGetter(x) ?? ctx.x.field
  const getY = toFieldGetter(y) ?? ctx.y.field
  if (!getX || !getY) {
    if (DEV) {
      ctx.warn(
        'line-fields',
        'Line needs x and y fields: pass them to <Line> or set `field` on <Chart x/y>.',
      )
    }
    return null
  }
  const xScale = ctx.x
  const linear = ctx.y.scale
  const rows = (data ?? ctx.data) as readonly D[]
  const points = rows.map((d, index) => {
    const category = getX(d, index)
    const value = toNumber(getY(d, index))
    return {
      index,
      key: String(category),
      x: categoryCenter(xScale, category) ?? Number.NaN,
      y: Number.isFinite(value) ? clampToRange(linear, linear(value)) : Number.NaN,
    }
  })
  const path = linePath(points)
  const shown =
    dots === 'none' ? [] : points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const active =
    ctx.activeId === null ? undefined : shown.find((p) => p.key === String(ctx.activeId))
  const r = Math.max(0, radius)
  const color = `var(--ch-${tone})`
  const hollow = dots === 'hollow'
  return (
    <g data-ch-part="line-group" data-ch-tone={tone}>
      {path ? (
        <path
          data-ch-part="line"
          data-ch-dashed={dashed ? 'true' : undefined}
          d={path}
          style={{ stroke: color }}
        />
      ) : null}
      {shown.map((p) => (
        <circle
          key={p.index}
          data-ch-part="line-dot"
          data-ch-hollow={hollow ? 'true' : undefined}
          cx={round2(p.x)}
          cy={round2(p.y)}
          r={r}
          style={hollow ? { stroke: color } : { fill: color }}
        />
      ))}
      {active ? (
        <circle
          data-ch-part="dot-ring"
          cx={round2(active.x)}
          cy={round2(active.y)}
          r={r + 3}
          style={{ stroke: color }}
        />
      ) : null}
    </g>
  )
}
```

Create `packages/tally-charts/src/react/marks/Band.tsx`:

```tsx
import { resolveAccessor, toFieldGetter } from '../../core/accessor'
import { bandPath } from '../../core/line'
import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { categoryCenter } from '../../core/scale'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'
import { toneVar } from '../ui/util'

export interface BandProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Category field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number>
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
}

/** A soft area between `low` and `high` at each category, e.g. a likely range. Gaps break it. */
export function Band<D>({ data, x, low, high, tone = 'accent' }: BandProps<D>) {
  const ctx = useChart('Band')
  if (ctx.x.kind === 'linear' || ctx.y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        'band-scales',
        'Band needs a point or band scale on <Chart x> and a linear scale on <Chart y>.',
      )
    }
    return null
  }
  const getX = toFieldGetter(x) ?? ctx.x.field
  if (!getX) {
    if (DEV) {
      ctx.warn('band-fields', 'Band needs an x field: pass `x` to <Band> or set `field` on <Chart x>.')
    }
    return null
  }
  const getLow = resolveAccessor(low)
  const getHigh = resolveAccessor(high)
  const xScale = ctx.x
  const linear = ctx.y.scale
  const px = (raw: unknown) => {
    const v = toNumber(raw)
    return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
  }
  const rows = (data ?? ctx.data) as readonly D[]
  const d = bandPath(
    rows.map((row, i) => ({
      x: categoryCenter(xScale, getX(row, i)) ?? Number.NaN,
      low: px(getLow(row, i)),
      high: px(getHigh(row, i)),
    })),
  )
  if (!d) return null
  return <path data-ch-part="band" data-ch-tone={tone} d={d} style={toneVar(tone)} />
}
```

Create `packages/tally-charts/src/react/marks/Grid.tsx`:

```tsx
import { linearTicks, type TickSpec } from '../../core/ticks'
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface GridProps {
  /** Same as the y axis `ticks`. Default 'all' (about 5). */
  ticks?: TickSpec
  /** Value range to rule, like the axis `extent`. Default: the y domain. */
  extent?: readonly [number, number]
}

/** Horizontal lines across the plot at the y ticks. */
export function Grid({ ticks = 'all', extent }: GridProps) {
  const ctx = useChart('Grid')
  if (ctx.y.kind !== 'linear') {
    if (DEV) ctx.warn('grid-scale', 'Grid needs a linear scale on <Chart y>.')
    return null
  }
  const lines = linearTicks(ctx.y.scale, ticks, String, extent)
  return (
    <g data-ch-part="grid">
      {lines.map((tick) => (
        <line
          key={tick.value}
          data-ch-part="grid-line"
          x1={0}
          x2={ctx.innerWidth}
          y1={tick.position}
          y2={tick.position}
        />
      ))}
    </g>
  )
}
```

Create `packages/tally-charts/src/react/marks/Region.tsx`:

```tsx
import { categoryCenter, categoryStep } from '../../core/scale'
import type { Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'
import { toneVar } from '../ui/util'

export interface RegionProps {
  /** First category in the region, e.g. the first forecast month. */
  from: string | number
  /** Last category. Default: the last category on the scale. */
  to?: string | number
  /** Default 'accent'. */
  tone?: Tone
}

/**
 * A soft backdrop over a run of categories on a point or band x scale. It covers whole steps,
 * so it starts halfway between `from` and the category before it.
 */
export function Region({ from, to, tone = 'accent' }: RegionProps) {
  const ctx = useChart('Region')
  if (ctx.x.kind === 'linear') {
    if (DEV) ctx.warn('region-scale', 'Region needs a point or band scale on <Chart x>.')
    return null
  }
  const domain = ctx.x.scale.domain()
  const last = to ?? domain[domain.length - 1]
  const a = categoryCenter(ctx.x, from)
  const b = categoryCenter(ctx.x, last)
  if (a === undefined || b === undefined) {
    if (DEV) {
      ctx.warn(
        'region-domain',
        `Region from "${from}" to "${String(last)}" is not on the x scale and was not drawn.`,
      )
    }
    return null
  }
  const half = categoryStep(ctx.x) / 2
  const x0 = Math.max(0, Math.min(a, b) - half)
  const x1 = Math.min(ctx.innerWidth, Math.max(a, b) + half)
  return (
    <rect
      data-ch-part="region"
      data-ch-tone={tone}
      x={x0}
      y={0}
      width={Math.max(0, x1 - x0)}
      height={ctx.innerHeight}
      rx={8}
      style={toneVar(tone)}
    />
  )
}
```

- [ ] **Step 4: Style the marks and keep them out of pointer events**

In `packages/tally-charts/src/theme/theme.css`, extend the shared selector list above `pointer-events: none` so it reads:

```css
[data-ch-part="bar"],
[data-ch-part="bar-track"],
[data-ch-part="column-highlight"],
[data-ch-part="connector"],
[data-ch-part="area"],
[data-ch-part="dot"],
[data-ch-part="dot-ring"],
[data-ch-part="median"],
[data-ch-part="line"],
[data-ch-part="line-dot"],
[data-ch-part="band"],
[data-ch-part="grid-line"],
[data-ch-part="region"] {
  pointer-events: none;
}
```

Add this section right before `/* ---------- Labels and reference marks ---------- */`:

```css
/* ---------- Lines, bands, grid and regions ---------- */
[data-ch-part="line"] {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

[data-ch-part="line"][data-ch-dashed="true"] {
  stroke-dasharray: 5 5;
  stroke-linecap: butt;
}

[data-ch-part="line-dot"][data-ch-hollow="true"] {
  fill: var(--ch-surface);
  stroke-width: 2;
}

/* Lines draw in from the left. The fill mode is backwards, so no clip stays after the animation. */
[data-ch-animate="true"] [data-ch-part="line-group"] {
  animation: ch-draw var(--ch-duration) var(--ch-ease) backwards;
}

@keyframes ch-draw {
  from {
    clip-path: inset(-8px 100% -8px -8px);
  }
  to {
    clip-path: inset(-8px -8px -8px -8px);
  }
}

[data-ch-part="band"] {
  fill: color-mix(in srgb, var(--ch-swatch-color) 18%, transparent);
}

[data-ch-animate="true"] [data-ch-part="band"] {
  animation: ch-fade var(--ch-duration) var(--ch-ease) both;
}

[data-ch-part="grid-line"] {
  stroke: var(--ch-grid);
  stroke-width: 1;
}

[data-ch-part="region"] {
  fill: color-mix(in srgb, var(--ch-swatch-color) 6%, transparent);
}
```

In `packages/tally-charts/src/theme/theme.test.ts`, inside `'keeps connectors, column highlights and areas out of pointer events'`, add before the `rule?.[1]` assertion:

```ts
    for (const part of ['line', 'line-dot', 'band', 'grid-line', 'region']) {
      expect(rule?.[0]).toContain(`[data-ch-part="${part}"]`)
    }
```

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks src/theme && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Line, Band, Grid and Region marks"
```

---

### Task 4: `LineChart`

**Files:**
- Create: `packages/tally-charts/src/react/charts/LineChart.tsx`, `LineChart.test.tsx`

**Interfaces:**
- Consumes:
  - from Tasks 1–3: point scales, `categoryCenter`, `categoryStep`, `clampToRange`, `Line`, `Band`, `Grid`, `Region`
  - existing: `Chart`, `Axis`, `Target`, `Tooltip`, `NearestPointer`, `useRegisterPoints`, `userCallbacks`, `headerOf`, `toNumber`, `niceDomain`, `inferLinearDomain`
- Produces:
  - `LineSeriesStyle = 'actual' | 'forecast' | 'scenario'`
  - `LineSeries<D> { id: string; label: string; value: Accessor<D, number>; tone?: Tone; style?: LineSeriesStyle; tooltipLabel?: string }`
  - `LineRange<D> { low: Accessor<D, number>; high: Accessor<D, number>; label?: string; tone?: Tone }`
  - `LineChartProps<D>`: the props `data`, `x`, `series`, `band`, `forecastFrom`, `target`, `domain`, `format`, `axis`, `axisFormat`, `xAxis`, `grid`, `radius`, `dataTable` and `tooltip`, plus the `ChartPassThroughProps` except `aspectRatio`
  - **Point ids** are the x values as strings: `onSelect('Oct', point)`, `activeId="Oct"`. `point.datum` is the user's row.

Rules the tests pin:
- One point per x, for every series that has a value there.
- Draw order: region, grid, target, band, the forecast and scenario lines (in `series` order), the actual lines, the pointer layer, the axes, the tooltip, then `children`.
- Tooltip and announcement: the x first, then `"<value> <tooltipLabel ?? label>"` for each series with a value. Where an `actual` series has a value, forecast and scenario values are left out, because there they only repeat the actual for the join. Segments of series whose tone isn't `accent` carry that tone.
- Repeated or missing x values are skipped with one warning.
- The inferred domain covers every series and the band, without forcing zero, rounded with `niceDomain`.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/LineChart.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LineChart, type LineChartProps, type LineSeries } from './LineChart'

type Month = {
  month: string
  actual: number | null
  path: number | null
  changes: number | null
  low: number | null
  high: number | null
}
// The forecasts and the band start at the last actual (Jul) so the lines join there.
const months: Month[] = [
  { month: 'Jun', actual: 34, path: null, changes: null, low: null, high: null },
  { month: 'Jul', actual: 32, path: 32, changes: 32, low: 32, high: 32 },
  { month: 'Aug', actual: null, path: 35, changes: 36, low: 34, high: 37 },
  { month: 'Sep', actual: null, path: 36, changes: 38, low: 34, high: 38 },
]
const series: LineSeries<Month>[] = [
  { id: 'actual', label: 'Actual', value: 'actual' },
  {
    id: 'path',
    label: 'Current path',
    value: 'path',
    style: 'forecast',
    tooltipLabel: 'on the current path',
  },
  {
    id: 'changes',
    label: 'With your changes',
    value: 'changes',
    style: 'scenario',
    tooltipLabel: 'with changes',
  },
]

// 400 × 100 with no margin: months at x 50, 150, 250, 350; y = 100 − 10 × (v − 30).
function renderLines(props: Partial<LineChartProps<Month>> = {}) {
  return render(
    <LineChart<Month>
      data={months}
      x="month"
      series={series}
      band={{ low: 'low', high: 'high', label: 'Likely range' }}
      domain={[30, 40]}
      format="percent"
      width={400}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      title="Margin outlook"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const groups = (root: HTMLElement) => parts(root, 'line-group') as [Element, Element, Element]
const pathOf = (group: Element) => group.querySelector('[data-ch-part="line"]')
const tooltip = (root: HTMLElement) => root.querySelector('[data-ch-part="tooltip"]')
const live = (root: HTMLElement) => root.querySelector('[aria-live]')?.textContent

describe('<LineChart>', () => {
  it('draws the forecasts first and the actual line on top', () => {
    const { container } = renderLines()
    expect(parts(container, 'line-group')).toHaveLength(3)
    const [path, changes, actual] = groups(container)
    expect(pathOf(path)).toHaveAttribute('d', 'M150,80L250,50L350,40')
    expect(pathOf(path)).toHaveAttribute('data-ch-dashed', 'true')
    expect(path.querySelectorAll('[data-ch-hollow="true"]')).toHaveLength(3)
    expect(changes).toHaveAttribute('data-ch-tone', 'gain')
    expect(pathOf(changes)).toHaveAttribute('d', 'M150,80L250,40L350,20')
    expect(pathOf(changes)).toHaveAttribute('data-ch-dashed', 'true')
    expect(changes.querySelectorAll('[data-ch-hollow]')).toHaveLength(0)
    expect(actual).toHaveAttribute('data-ch-tone', 'accent')
    expect(pathOf(actual)).toHaveAttribute('d', 'M50,60L150,80')
    expect(pathOf(actual)).not.toHaveAttribute('data-ch-dashed')
  })

  it('joins the forecast to the last actual', () => {
    const { container } = renderLines()
    const atJul = parts(container, 'line-dot').filter((d) => d.getAttribute('cx') === '150')
    expect(atJul).toHaveLength(3)
    expect(atJul.every((d) => d.getAttribute('cy') === '80')).toBe(true)
    // The last dot drawn at the join, the one on top, is the actual's filled dot.
    const top = atJul[atJul.length - 1] as Element
    expect(top).not.toHaveAttribute('data-ch-hollow')
    const group = top.closest('[data-ch-part="line-group"]') as Element
    expect(group).toHaveAttribute('data-ch-tone', 'accent')
    expect(pathOf(group)).not.toHaveAttribute('data-ch-dashed')
  })

  it('draws the likely range, the forecast region, the grid and the target', () => {
    const { container } = renderLines({
      forecastFrom: 'Aug',
      target: { value: 38, label: 'Target 38%' },
    })
    expect(parts(container, 'band')[0]).toHaveAttribute(
      'd',
      'M150,80L250,30L350,20L350,60L250,60L150,80Z',
    )
    expect(parts(container, 'region')[0]).toHaveAttribute('x', '200')
    expect(parts(container, 'region')[0]).toHaveAttribute('width', '200')
    expect(parts(container, 'grid-line')).toHaveLength(6)
    expect(parts(container, 'target')[0]).toHaveAttribute('y1', '20')
    expect(parts(container, 'target-label')[0]).toHaveTextContent('Target 38%')
  })

  it('shows one tooltip for every series at an x', () => {
    const { container } = renderLines({ activeId: 'Aug' })
    expect(tooltip(container)).toHaveTextContent(
      /^Aug35\.0%on the current path36\.0%with changes$/,
    )
    expect(tooltip(container)?.querySelector('[data-ch-tone="gain"]')).toHaveTextContent(
      '36.0%with changes',
    )
    // Every line with a dot at Aug gets a ring.
    expect(parts(container, 'dot-ring').map((r) => r.getAttribute('cx'))).toEqual(['250', '250'])
  })

  it('lists only the series with a value in the tooltip', () => {
    const jun = renderLines({ activeId: 'Jun' })
    expect(tooltip(jun.container)).toHaveTextContent(/^Jun34\.0%Actual$/)
    jun.unmount()
    // At the join the forecasts repeat the actual; the tooltip shows it once.
    const jul = renderLines({ activeId: 'Jul' })
    expect(tooltip(jul.container)).toHaveTextContent(/^Jul32\.0%Actual$/)
    jul.unmount()
    const gap = renderLines({
      activeId: 'Aug',
      data: months.map((m) => (m.month === 'Aug' ? { ...m, path: null } : m)),
    })
    expect(tooltip(gap.container)).toHaveTextContent(/^Aug36\.0%with changes$/)
    // Jul and Sep are lone points of the broken forecast: dots, no segment.
    const [path] = groups(gap.container)
    expect(pathOf(path)).toBeNull()
    expect(path.querySelectorAll('[data-ch-part="line-dot"]')).toHaveLength(2)
    expect(gap.container.innerHTML).not.toContain('NaN')
  })

  it('announces every series at an x for the keyboard', () => {
    const { container } = renderLines()
    const figure = screen.getByRole('figure', { name: 'Margin outlook' })
    fireEvent.keyDown(figure, { key: 'End' })
    expect(live(container)).toBe('Sep, 36.0% on the current path, 38.0% with changes')
    fireEvent.keyDown(figure, { key: 'Home' })
    expect(live(container)).toBe('Jun, 34.0% Actual')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live(container)).toBe('Jul, 32.0% Actual')
  })

  it('snaps the pointer to the nearest x', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLines({ onActiveChange })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    // jsdom's bounding box is at 0,0, so client coordinates are plot coordinates.
    fireEvent.pointerMove(layer, { clientX: 230, clientY: 95 })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'Aug',
      expect.objectContaining({ datum: months[2] }),
    )
  })

  it('selects with Enter and reports the original row', () => {
    const onSelect = vi.fn()
    renderLines({ onSelect })
    const figure = screen.getByRole('figure', { name: 'Margin outlook' })
    fireEvent.keyDown(figure, { key: 'Home' })
    fireEvent.keyDown(figure, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('Jun', expect.objectContaining({ datum: months[0] }))
  })

  it('infers a nice domain from every series and the band, without forcing zero', () => {
    const { container } = renderLines({ domain: undefined })
    // Values run 32–38: one grid line per point, 32 at the bottom, 38 at the top.
    const lines = parts(container, 'grid-line')
    expect(lines).toHaveLength(7)
    expect(lines[0]).toHaveAttribute('y1', '100')
    expect(lines[6]).toHaveAttribute('y1', '0')
  })

  it('skips a repeated x with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderLines({
      data: [...months, { ...months[1], actual: 39 } as Month],
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('repeated x value "Jul" at index 4')
    const [, , actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M50,60L150,80')
  })

  it('renders a hidden data table', () => {
    renderLines()
    const table = screen.getByRole('table', { name: 'Margin outlook' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['month', 'Actual', 'Current path', 'With your changes', 'Likely range'])
    const aug = within(table).getAllByRole('row')[3] as HTMLElement
    expect(
      within(aug)
        .getAllByRole('cell')
        .map((td) => td.textContent),
    ).toEqual(['Aug', '', '35.0%', '36.0%', '34.0%–37.0%'])
  })

  it('turns off the grid, the axes and the tooltip', () => {
    const { container } = renderLines({
      grid: false,
      axis: 'none',
      xAxis: 'none',
      tooltip: false,
      activeId: 'Aug',
    })
    expect(parts(container, 'grid-line')).toHaveLength(0)
    expect(parts(container, 'axis-label')).toHaveLength(0)
    expect(tooltip(container)).toBeNull()
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderLines({ width: 0, forecastFrom: 'Aug' })
    expect(container.innerHTML).not.toContain('NaN')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/LineChart.test.tsx`
Expected: FAIL; `./LineChart` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/LineChart.tsx`:

```tsx
import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { clampToRange, niceDomain } from '../../core/linear'
import { categoryCenter, categoryStep, inferLinearDomain } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Band } from '../marks/Band'
import { Grid } from '../marks/Grid'
import { Line } from '../marks/Line'
import { NearestPointer } from '../marks/NearestPointer'
import { Region } from '../marks/Region'
import { Target } from '../marks/Target'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export type LineSeriesStyle = 'actual' | 'forecast' | 'scenario'

export interface LineSeries<D> {
  /** Stable key of the series. */
  id: string
  /** Legend and data-table name, e.g. "Current path". */
  label: string
  value: Accessor<D, number>
  /** Default 'gain' for a scenario, otherwise 'accent'. */
  tone?: Tone
  /**
   * 'actual': solid with filled dots. 'forecast': dashed with hollow dots. 'scenario': dashed with
   * filled dots. Default 'actual'. A forecast that continues the actuals repeats the last actual
   * value at that x, so the lines join.
   */
  style?: LineSeriesStyle
  /** Text after the value in the tooltip, e.g. "on the current path". Default: `label`. */
  tooltipLabel?: string
}

export interface LineRange<D> {
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Data-table header. Default "Range". */
  label?: string
  /** Default 'accent'. */
  tone?: Tone
}

export interface LineChartProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /** Category per row, e.g. the month. Each value appears once; repeats are skipped. */
  x: Accessor<D, string | number>
  series: readonly LineSeries<D>[]
  /** A soft band between two values, e.g. the likely range of a forecast. */
  band?: LineRange<D>
  /** Shade from this category to the end, e.g. the first forecast month. */
  forecastFrom?: string | number
  target?: number | { value: number; label?: string }
  /** Value domain. Default: every series and the band, rounded to nice ticks; zero isn't forced. */
  domain?: readonly [number, number]
  /** Default 'number'. */
  format?: FormatSpec
  /** Value axis ticks, or 'none'. The grid follows them. Default 'all' (about 5). */
  axis?: TickSpec | 'none'
  /** Value axis labels. Default: `format`. */
  axisFormat?: AxisFormat
  /** Category axis ticks, or 'none'. Default 'all'. */
  xAxis?: TickSpec | 'none'
  /** Horizontal grid lines at the value ticks. Default true. */
  grid?: boolean
  /** Dot radius in px. Default 4. */
  radius?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface LineRow<D> {
  key: string
  datum: D
  index: number
  /** One value per series, NaN when missing. */
  values: number[]
  low: number
  high: number
}

const MARGIN: Margin = { top: 24, right: 16, bottom: 32, left: 44 }

function styleOf<D>(s: LineSeries<D>): LineSeriesStyle {
  return s.style ?? 'actual'
}

function toneOf<D>(s: LineSeries<D>): Tone {
  return s.tone ?? (styleOf(s) === 'scenario' ? 'gain' : 'accent')
}

/** One point per x, carrying every series with a value there; snaps the pointer along x. */
function LinePoints<D>(props: {
  rows: readonly LineRow<D>[]
  series: readonly LineSeries<D>[]
  fmt: Formatter
  radius: number
}) {
  const ctx = useChart('LineChart')
  const linear = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  const points: ChartPoint[] = linear
    ? props.rows.flatMap((row, index): ChartPoint[] => {
        const x = categoryCenter(ctx.x, row.key)
        if (x === undefined) return []
        // Forecasts repeat the last actual at the join; there the actual is listed once.
        const actualHere = props.series.some(
          (s, i) => styleOf(s) === 'actual' && Number.isFinite(row.values[i] ?? Number.NaN),
        )
        const shown = props.series.flatMap((s, i) => {
          const value = row.values[i] ?? Number.NaN
          if (!Number.isFinite(value) || (actualHere && styleOf(s) !== 'actual')) return []
          return [{ text: props.fmt(value), label: s.tooltipLabel ?? s.label, tone: toneOf(s) }]
        })
        if (shown.length === 0) return []
        const top = Math.min(
          ...row.values.filter(Number.isFinite).map((v) => clampToRange(linear, linear(v))),
        )
        const segments: TooltipSegment[] = [
          { value: row.key },
          ...shown.map((s) => ({
            value: s.text,
            label: s.label,
            tone: s.tone === 'accent' ? undefined : s.tone,
          })),
        ]
        return [
          {
            id: row.key,
            index,
            datum: row,
            x,
            y: top - props.radius,
            hitX: x,
            hitY: top,
            label: [row.key, ...shown.map((s) => `${s.text} ${s.label}`)].join(', '),
            segments,
          },
        ]
      })
    : []
  useRegisterPoints(ctx, points)
  return <NearestPointer axis="x" radius={Math.max(12, categoryStep(ctx.x) / 2)} />
}

export function LineChart<D>({
  data,
  x,
  series,
  band,
  forecastFrom,
  target,
  domain,
  format,
  axis = 'all',
  axisFormat,
  xAxis = 'all',
  grid = true,
  radius = 4,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: LineChartProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getX = resolveAccessor(x)
    const getters = series.map((s) => resolveAccessor(s.value))
    const getLow = band ? resolveAccessor(band.low) : undefined
    const getHigh = band ? resolveAccessor(band.high) : undefined
    const seen = new Set<string>()
    return data.flatMap((d, i): LineRow<D>[] => {
      const raw = getX(d, i)
      const key = raw === null || raw === undefined ? '' : String(raw)
      if (key === '' || seen.has(key)) {
        if (DEV) {
          warn('line-x', `LineChart skipped a missing or repeated x value "${key}" at index ${i}.`)
        }
        return []
      }
      seen.add(key)
      return [
        {
          key,
          datum: d,
          index: i,
          values: getters.map((get) => toNumber(get(d, i))),
          low: getLow ? toNumber(getLow(d, i)) : Number.NaN,
          high: getHigh ? toNumber(getHigh(d, i)) : Number.NaN,
        },
      ]
    })
  }, [data, x, series, band, warn])

  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        rows.flatMap((r) => [...r.values, r.low, r.high]),
        false,
      ),
    )
  // Actual lines last, so their filled dots sit on top where the forecasts join them.
  const ordered = series
    .map((s, i) => ({ s, i }))
    .sort((a, b) => Number(styleOf(a.s) === 'actual') - Number(styleOf(b.s) === 'actual'))
  const targetSpec = typeof target === 'number' ? { value: target } : target
  const valueFormat =
    axisFormat ??
    (typeof format === 'function' ? (v: string | number) => format(Number(v)) : format)
  const m: Margin = { ...MARGIN, ...margin }

  let table: DataTableSpec<LineRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<LineRow<D>>[] = [
      { header: headerOf(x, 'Category'), value: (r) => r.key },
      ...series.map(
        (s, i): DataTableColumn<LineRow<D>> => ({
          header: s.label,
          value: (r) => fmt(r.values[i] ?? Number.NaN),
        }),
      ),
    ]
    if (band) {
      columns.push({
        header: band.label ?? 'Range',
        value: (r) =>
          Number.isFinite(r.low) && Number.isFinite(r.high) ? `${fmt(r.low)}–${fmt(r.high)}` : '',
      })
    }
    table = { columns }
  }

  return (
    <Chart<LineRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ type: 'point', field: 'key' }}
      y={{ domain: resolvedDomain }}
      margin={m}
      height={height ?? 280}
      dataTable={table}
    >
      {forecastFrom !== undefined ? <Region from={forecastFrom} /> : null}
      {grid ? <Grid ticks={axis === 'none' ? 'all' : axis} /> : null}
      {targetSpec ? (
        <Target y={targetSpec.value} label={targetSpec.label} labelPosition="start" />
      ) : null}
      {band ? <Band<LineRow<D>> x="key" low="low" high="high" tone={band.tone} /> : null}
      {ordered.map(({ s, i }) => (
        <Line<LineRow<D>>
          key={s.id}
          x="key"
          y={(r) => r.values[i] ?? Number.NaN}
          tone={toneOf(s)}
          dashed={styleOf(s) !== 'actual'}
          dots={styleOf(s) === 'forecast' ? 'hollow' : 'filled'}
          radius={radius}
        />
      ))}
      <LinePoints rows={rows} series={series} fmt={fmt} radius={radius} />
      {axis === 'none' ? null : <Axis side="left" ticks={axis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} />}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/react && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: LineChart with forecast, scenario, likely range and one tooltip per x"
```

---

### Task 5: Line and sequential legend swatches; sequential tokens that pass contrast

**Files:**
- Modify: `packages/tally-charts/src/core/types.ts`
- Modify: `packages/tally-charts/src/react/ui/Legend.tsx`, `packages/tally-charts/src/react/ui/Legend.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`, `packages/tally-charts/src/theme/theme.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `SeqLevel = 1 | 2 | 3 | 4 | 5` in `core/types.ts`
  - `LegendShape = 'bar' | 'dot' | 'line'`
  - `LegendItem` gains `dashed?: boolean` and `level?: SeqLevel`, and `tone` becomes optional (default `'neutral'`, ignored when `level` is set). A level swatch carries `data-ch-level` and no `data-ch-tone`.
  - sequential tokens `--ch-seq-1…5` and `--ch-seq-ink-strong`, resolved on `[data-ch-root]`, `.ch-legend` and `.ch-heatmap` from an inherited `--ch-seq-base` (fallback `--ch-loss`)

Why the token change: Task 6 puts text on these fills, and axe checks 4.5:1. With the default tokens, measured in both themes:

| Level | Mix | Light theme | Dark theme |
|---|---|---|---|
| 1 | 12% base on surface | ink 15.3:1 | ink 14.9:1 |
| 2 | 30% base on surface | ink 11.9:1 | ink 10.9:1 |
| 3 | 50% base on surface | ink 9.0:1 | ink 7.2:1 |
| 4 | **65%** base on surface (was 75%) | ink 7.2:1 | ink 5.3:1 (75% gave 4.4:1) |
| 5 | **75% base, 25% black** (was the base) | white 6.4:1 | white 5.1:1 (the bare base gave 3.0–4.0:1) |

No 0.4 component paints the sequential tokens, so no baseline changes.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('<Legend>', …)` in `packages/tally-charts/src/react/ui/Legend.test.tsx`:

```tsx
  it('draws line swatches, dashed for forecasts', () => {
    render(
      <Legend
        shape="line"
        items={[
          { label: 'Actual', tone: 'accent' },
          { label: 'Current path', tone: 'accent', dashed: true },
        ]}
      />,
    )
    const swatches = screen.getAllByRole('listitem').map((li) => li.querySelector('.ch-swatch'))
    expect(swatches[0]).toHaveAttribute('data-ch-shape', 'line')
    expect(swatches[0]).not.toHaveAttribute('data-ch-dashed')
    expect(swatches[1]).toHaveAttribute('data-ch-dashed', 'true')
  })

  it('paints sequential levels instead of tones', () => {
    render(
      <Legend
        items={[
          { label: 'Under $4K', level: 1 },
          { label: '$13K and up', level: 5 },
        ]}
      />,
    )
    const swatch = screen.getAllByRole('listitem')[1]?.querySelector('.ch-swatch') as HTMLElement
    expect(swatch).toHaveAttribute('data-ch-level', '5')
    expect(swatch).not.toHaveAttribute('data-ch-tone')
    expect(swatch.style.getPropertyValue('--ch-swatch-color')).toBe('var(--ch-seq-5)')
  })

  it('falls back to the neutral tone', () => {
    render(<Legend items={[{ label: 'Other' }]} />)
    expect(screen.getByRole('listitem').querySelector('.ch-swatch')).toHaveAttribute(
      'data-ch-tone',
      'neutral',
    )
  })
```

Append inside `describe('theme.css', …)` in `packages/tally-charts/src/theme/theme.test.ts`:

```ts
  it('builds the sequential levels from an inherited base on charts, legends and heatmaps', () => {
    const rule = css.match(/\[data-ch-root\],\s*\.ch-legend,\s*\.ch-heatmap \{([^}]*)\}/)
    const base = 'var(--ch-seq-base, var(--ch-loss))'
    expect(rule?.[1]).toContain(`--ch-seq-1: color-mix(in srgb, ${base} 12%, var(--ch-surface))`)
    expect(rule?.[1]).toContain(`--ch-seq-4: color-mix(in srgb, ${base} 65%, var(--ch-surface))`)
    expect(rule?.[1]).toContain(`--ch-seq-5: color-mix(in srgb, ${base} 75%, #000)`)
    expect(rule?.[1]).toContain('--ch-seq-ink-strong: #fff')
    // A default base would stop a base set on an ancestor from reaching the levels.
    expect(css).not.toMatch(/--ch-seq-base:/)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/Legend.test.tsx src/theme/theme.test.ts`
Expected: FAIL. The new Legend props don't exist, and the theme still defines `--ch-seq-base`.

- [ ] **Step 3: Implement**

Append to `packages/tally-charts/src/core/types.ts`:

```ts
/** A step on the sequential scale, `--ch-seq-1` (lightest) to `--ch-seq-5` (darkest). */
export type SeqLevel = 1 | 2 | 3 | 4 | 5
```

Replace `packages/tally-charts/src/react/ui/Legend.tsx` with:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { Fill, SeqLevel, Tone } from '../../core/types'

export type LegendShape = 'bar' | 'dot' | 'line'

export interface LegendItem {
  label: ReactNode
  /** Swatch tone. Default 'neutral'; ignored when `level` is set. */
  tone?: Tone
  fill?: Fill
  count?: ReactNode
  shape?: LegendShape
  /** A dashed line swatch, e.g. for a forecast. Only with shape 'line'. */
  dashed?: boolean
  /** A sequential level (`--ch-seq-N`), e.g. a heatmap bin. Replaces `tone`. */
  level?: SeqLevel
}

export interface LegendProps {
  items: LegendItem[]
  shape?: LegendShape
  className?: string
}

export function Legend({ items, shape = 'bar', className }: LegendProps) {
  return (
    <ul className={className ? `ch-legend ${className}` : 'ch-legend'} data-ch-part="legend">
      {items.map((item, i) => {
        const tone = item.tone ?? 'neutral'
        const color = item.level ? `var(--ch-seq-${item.level})` : `var(--ch-${tone})`
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: labels may be non-string nodes; order is stable
          <li key={i} className="ch-legend-item">
            <span
              aria-hidden="true"
              className="ch-swatch ch-fillable"
              data-ch-tone={item.level ? undefined : tone}
              data-ch-level={item.level}
              data-ch-fill={item.fill ?? 'solid'}
              data-ch-shape={item.shape ?? shape}
              data-ch-dashed={item.dashed ? 'true' : undefined}
              style={{ '--ch-swatch-color': color } as CSSProperties}
            />
            <span className="ch-legend-label">{item.label}</span>
            {item.count !== undefined && item.count !== null ? (
              <span className="ch-legend-count">{item.count}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
```

If Biome reports the suppression comment as unused in that position, move it to the line directly above `return (` and re-run `pnpm lint`.

In `packages/tally-charts/src/theme/theme.css`:

1. In the `[data-ch-root] { … }` block, delete the comment `/* Sequential bins resolve per chart so --ch-seq-base can be overridden locally. */` and the six lines `--ch-seq-base: …` through `--ch-seq-5: …`.
2. Add this section right after the `/* ---------- Theme-independent tokens ---------- */` rule:

```css
/* ---------- Sequential levels ---------- */
/* Resolved on each element from an inherited --ch-seq-base (default: loss), so a base set on
   any ancestor, or Heatmap's `tone`, recolors charts, heatmaps and legends alike. Levels 1–4
   keep --ch-ink text at 4.5:1 or more in both themes; level 5 is darkened for white text. */
[data-ch-root],
.ch-legend,
.ch-heatmap {
  --ch-seq-1: color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 12%, var(--ch-surface));
  --ch-seq-2: color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 30%, var(--ch-surface));
  --ch-seq-3: color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 50%, var(--ch-surface));
  --ch-seq-4: color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 65%, var(--ch-surface));
  --ch-seq-5: color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 75%, #000);
  --ch-seq-ink-strong: #fff;
}
```

3. Add after the `.ch-swatch[data-ch-shape="dot"]` rule:

```css
.ch-swatch[data-ch-shape="line"] {
  width: 16px;
  height: 2px;
  border-radius: 1px;
}

.ch-swatch[data-ch-shape="line"][data-ch-dashed="true"] {
  background: repeating-linear-gradient(
    90deg,
    var(--ch-swatch-color) 0 4px,
    transparent 4px 6px
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui src/theme && pnpm typecheck`
Expected: PASS. The existing `'defines --ch-seq-5:'` theme test still passes.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: line and sequential legend swatches; sequential levels pass text contrast"
```

---

### Task 6: `Heatmap`

**Files:**
- Create: `packages/tally-charts/src/react/charts/Heatmap.tsx`, `Heatmap.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`, `packages/tally-charts/src/theme/theme.test.ts`

**Interfaces:**
- Consumes:
  - from Task 5: `SeqLevel`, `Legend` `level` items, the sequential tokens on `.ch-heatmap`
  - existing: `resolveAccessor`, `toNumber`, `createWarner`, `useFormat`, `cx` (`react/ui/util.ts`)
- Produces:
  - `HeatmapCell<D> { id: string; row: string; column: string; value: number; datum: D | undefined; level: SeqLevel | 0 }`
  - `HeatmapProps<D>`: the props `data`, `row`, `column`, `value`, `rows`, `columns`, `breaks`, `binLabels`, `format`, `totals`, `totalLabel`, `legend`, `tone`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `empty`, `className` and `style`
  - cell ids `"<row>:<column>"`
  - parts `heatmap`, `heatmap-cell` (with `data-ch-level`, `data-ch-active`, `data-ch-selectable`) and `empty`

Rules the tests pin:
- **Structure.** The root is `.ch-heatmap`. A row of column headers comes first: an empty corner, one header per column showing its total, then the total label. Each data row has a row header, one gridcell per column, and a total gridcell.
- **Focus.** Only data cells are focusable. Exactly one has `tabIndex 0`: the last focused one, or the first.
- **Keys.** The arrows move the focus and clamp at the edges. Home and End jump to the ends of the row. Enter and Space call `onSelect`, and Escape clears the active cell. Every handled key calls `preventDefault`.
- **Activation.** Focus or hover activates a cell. Leaving the grid with the pointer or the focus clears it.
- **Bins.** `n = breaks.length + 1` bins (2–5) map onto levels: `n = 1` uses level 3, otherwise bin `i` uses `round(1 + 4i/(n−1))`. Bad breaks are sorted and deduplicated, with one warning, and are capped at 4.
- **Missing values.** A missing or non-numeric value is level 0. It shows "–" with a screen-reader "No data", is left out of the totals, and gets one warning. A total with no numbers is a dash too.
- **No data.** With no rows or no columns, the empty state renders instead of the grid.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/Heatmap.test.tsx`:

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Heatmap, type HeatmapProps } from './Heatmap'

type Leak = { branch: string; cause: string; amount: number | string | boolean | null }
const leaks: Leak[] = [
  { branch: 'Dallas', cause: 'Labor', amount: 14800 },
  { branch: 'Dallas', cause: 'Materials', amount: 7900 },
  { branch: 'Dallas', cause: 'Callbacks', amount: 3100 },
  { branch: 'Austin', cause: 'Labor', amount: 9200 },
  { branch: 'Austin', cause: 'Materials', amount: 5100 },
  { branch: 'Austin', cause: 'Callbacks', amount: 1900 },
]

// Breaks 4K, 7K, 13K: four bins on levels 1, 2, 4 and 5.
function renderHeatmap(props: Partial<HeatmapProps<Leak>> = {}) {
  return render(
    <Heatmap<Leak>
      data={leaks}
      row="branch"
      column="cause"
      value="amount"
      breaks={[4000, 7000, 13000]}
      format="currency-compact"
      title="Where it leaks"
      {...props}
    />,
  )
}

const cells = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="heatmap-cell"]')] as HTMLElement[]
const texts = (els: Element[]) => els.map((el) => el.textContent)
const levels = (els: Element[]) => els.map((el) => el.getAttribute('data-ch-level'))

describe('<Heatmap>', () => {
  it('lays out a grid with headers, totals and one tab stop', () => {
    const { container } = renderHeatmap()
    const grid = screen.getByRole('grid', { name: 'Where it leaks' })
    expect(texts(within(grid).getAllByRole('columnheader'))).toEqual([
      '',
      'Labor$24K',
      'Materials$13K',
      'Callbacks$5K',
      'Total',
    ])
    expect(texts(within(grid).getAllByRole('rowheader'))).toEqual(['Dallas', 'Austin'])
    const dallas = within(grid).getAllByRole('row')[1] as HTMLElement
    expect(texts(within(dallas).getAllByRole('gridcell'))).toEqual([
      '$14.8K',
      '$7.9K',
      '$3.1K',
      '$25.8K',
    ])
    const stops = container.querySelectorAll('[tabindex="0"]')
    expect(stops).toHaveLength(1)
    expect(stops[0]).toHaveTextContent('$14.8K')
  })

  it('bins values onto the sequential levels', () => {
    const { container } = renderHeatmap()
    expect(levels(cells(container))).toEqual(['5', '4', '1', '4', '2', '1'])
  })

  it('renders the bin legend with default labels', () => {
    const { container } = renderHeatmap()
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(texts(within(legend).getAllByRole('listitem'))).toEqual([
      'Under $4K',
      '$4K to $7K',
      '$7K to $13K',
      '$13K and up',
    ])
    expect(levels([...legend.querySelectorAll('.ch-swatch')])).toEqual(['1', '2', '4', '5'])
  })

  it('takes custom bin labels and spreads fewer bins over the levels', () => {
    const { container } = renderHeatmap({ breaks: [7000], binLabels: ['Small', 'Large'] })
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(texts(within(legend).getAllByRole('listitem'))).toEqual(['Small', 'Large'])
    expect(levels([...legend.querySelectorAll('.ch-swatch')])).toEqual(['1', '5'])
    expect(levels(cells(container))).toEqual(['5', '5', '1', '5', '1', '1'])
  })

  it('shows a dash for a missing cell', () => {
    const { container } = renderHeatmap({
      data: leaks.filter((l) => !(l.branch === 'Austin' && l.cause === 'Callbacks')),
    })
    const missing = cells(container)[5] as HTMLElement
    expect(missing).toHaveAttribute('data-ch-level', '0')
    expect(missing).toHaveTextContent('–No data')
    expect(within(missing).getByText('No data')).toHaveClass('ch-sr-only')
    // The totals leave it out.
    const austin = screen.getAllByRole('row')[2] as HTMLElement
    expect(within(austin).getAllByRole('gridcell').at(-1)).toHaveTextContent('$14.3K')
    expect(screen.getAllByRole('columnheader')[3]).toHaveTextContent('Callbacks$3.1K')
  })

  it('skips non-numeric values without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const odd = leaks.map((l, i) =>
      i === 1 ? { ...l, amount: 'n/a' } : i === 4 ? { ...l, amount: true } : l,
    )
    const { container } = renderHeatmap({ data: odd })
    expect(levels(cells(container))).toEqual(['5', '0', '1', '4', '0', '1'])
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Heatmap shows a dash')
  })

  it('moves between cells with the arrow keys and selects with Enter', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ onSelect, onActiveChange })
    const all = cells(container)
    act(() => all[0]?.focus())
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'Dallas:Labor',
      expect.objectContaining({
        row: 'Dallas',
        column: 'Labor',
        value: 14800,
        level: 5,
        datum: leaks[0],
      }),
    )
    fireEvent.keyDown(all[0] as HTMLElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(all[1])
    expect(all[1]).toHaveAttribute('tabindex', '0')
    expect(all[0]).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(all[1] as HTMLElement, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(all[4])
    // At the bottom edge the focus stays, and the key is handled so the page doesn't scroll.
    expect(fireEvent.keyDown(all[4] as HTMLElement, { key: 'ArrowDown' })).toBe(false)
    expect(document.activeElement).toBe(all[4])
    fireEvent.keyDown(all[4] as HTMLElement, { key: 'Home' })
    expect(document.activeElement).toBe(all[3])
    fireEvent.keyDown(all[3] as HTMLElement, { key: 'End' })
    expect(document.activeElement).toBe(all[5])
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(
      'Austin:Callbacks',
      expect.objectContaining({ value: 1900 }),
    )
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('activates a cell on hover and clears when the pointer leaves', () => {
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ onActiveChange })
    fireEvent.pointerEnter(cells(container)[1] as HTMLElement)
    expect(cells(container)[1]).toHaveAttribute('data-ch-active', 'true')
    fireEvent.pointerLeave(screen.getByRole('grid'))
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(container.querySelector('[data-ch-active]')).toBeNull()
  })

  it('follows a controlled activeId', () => {
    const { container } = renderHeatmap({ activeId: 'Austin:Labor' })
    expect(cells(container)[3]).toHaveAttribute('data-ch-active', 'true')
    expect(container.querySelectorAll('[data-ch-active]')).toHaveLength(1)
  })

  it('orders rows and columns as given and fills the gaps', () => {
    const { container } = renderHeatmap({
      rows: ['Austin', 'Dallas', 'Houston'],
      columns: ['Callbacks', 'Labor'],
    })
    expect(texts(screen.getAllByRole('rowheader'))).toEqual(['Austin', 'Dallas', 'Houston'])
    expect(texts(screen.getAllByRole('columnheader'))).toEqual([
      '',
      'Callbacks$5K',
      'Labor$24K',
      'Total',
    ])
    const houston = screen.getAllByRole('row')[3] as HTMLElement
    expect(texts(within(houston).getAllByRole('gridcell'))).toEqual([
      '–No data',
      '–No data',
      '–No data',
    ])
    expect(levels(cells(container)).slice(4)).toEqual(['0', '0'])
  })

  it('turns the totals and the legend off', () => {
    const { container } = renderHeatmap({ totals: false, legend: false })
    expect(texts(screen.getAllByRole('columnheader'))).toEqual([
      '',
      'Labor',
      'Materials',
      'Callbacks',
    ])
    expect(container.querySelector('[data-ch-part="legend"]')).toBeNull()
  })

  it('sorts unsorted breaks with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderHeatmap({ breaks: [13000, 4000, 7000, 4000] })
    expect(levels(cells(container))).toEqual(['5', '4', '1', '4', '2', '1'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('sorted')
  })

  it('recolors the levels with tone', () => {
    const { container } = renderHeatmap({ tone: 'accent' })
    const root = container.querySelector('[data-ch-part="heatmap"]') as HTMLElement
    expect(root.style.getPropertyValue('--ch-seq-base')).toBe('var(--ch-accent)')
  })

  it('shows an empty state without data', () => {
    renderHeatmap({ data: [] })
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).toBeNull()
  })
})
```

Check the totals: Labor is 14,800 + 9,200 = $24K, Materials 7,900 + 5,100 = $13K, Callbacks 3,100 + 1,900 = $5K, Dallas $25.8K and Austin $16.2K. Without Austin's callbacks, Austin is $14.3K and Callbacks is $3.1K. `currency-compact` uses 3 significant digits.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/Heatmap.test.tsx`
Expected: FAIL; `./Heatmap` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/Heatmap.tsx`. The two file-level suppressions are deliberate. Spec §4 asks for an HTML CSS grid with `role="grid"`. Table elements lose their table semantics under `display: grid`, so the grid uses ARIA roles on `div`s, and only the data cells are focusable (the APG grid pattern).

```tsx
// biome-ignore-all lint/a11y/useSemanticElements: an ARIA grid laid out with CSS grid; table elements lose their semantics under display: grid
// biome-ignore-all lint/a11y/useFocusableInteractive: one roving tab stop on the data cells (APG grid pattern); rows and headers are not focusable
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { toNumber } from '../../core/number'
import type { Accessor, SeqLevel, Tone } from '../../core/types'
import { createWarner, DEV, type Warn } from '../../core/warn'
import { useFormat } from '../ChartsProvider'
import { Legend } from '../ui/Legend'
import { cx } from '../ui/util'

export interface HeatmapCell<D> {
  /** `"<row>:<column>"`. */
  id: string
  row: string
  column: string
  /** NaN when the cell has no number. */
  value: number
  /** The item behind the cell; undefined for an empty cell. */
  datum: D | undefined
  /** Sequential level 1–5, or 0 for a cell without a number. */
  level: SeqLevel | 0
}

export interface HeatmapProps<D> {
  /** One item per cell, in long format. */
  data: readonly D[]
  /** Row name per item, e.g. the branch. */
  row: Accessor<D, string>
  /** Column name per item, e.g. the cause. */
  column: Accessor<D, string>
  value: Accessor<D, number>
  /** Row order. Default: order of first appearance. Rows without items show dashes. */
  rows?: readonly string[]
  /** Column order. Default: order of first appearance. */
  columns?: readonly string[]
  /** Ascending bin edges: values below `breaks[0]` are the first bin. 1–4 edges give 2–5 bins. */
  breaks: readonly number[]
  /** One label per bin. Default "Under X", "X to Y", …, "Z and up". */
  binLabels?: readonly string[]
  /** Default 'number'. */
  format?: FormatSpec
  /** Column totals under the headers and a row total column. Default true. */
  totals?: boolean
  /** Header of the row total column. Default "Total". */
  totalLabel?: string
  /** Legend of the bins under the grid. Default true. */
  legend?: boolean
  /** Base tone of the sequential levels. Default 'loss'. */
  tone?: Tone
  /** Accessible name of the grid. */
  title?: string
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  activeId?: string | null
  onActiveChange?: (id: string | null, cell: HeatmapCell<D> | null) => void
  onSelect?: (id: string, cell: HeatmapCell<D>) => void
  /** Rendered instead of the grid when there are no rows or columns. Default "No data". */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
}

interface HeatmapModel<D> {
  rows: string[]
  columns: string[]
  cells: HeatmapCell<D>[][]
  rowTotals: number[]
  columnTotals: number[]
}

const MAX_BREAKS = 4
const MOVES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])

/** Bins spread over the five levels with the ends pinned: four bins use levels 1, 2, 4 and 5. */
function binLevels(bins: number): SeqLevel[] {
  if (bins <= 1) return [3]
  return Array.from({ length: bins }, (_, i) => Math.round(1 + (i * 4) / (bins - 1)) as SeqLevel)
}

function cleanBreaks(breaks: readonly number[], warn: Warn): number[] {
  const sorted = [...new Set(breaks.filter(Number.isFinite))].sort((a, b) => a - b)
  if (DEV && (sorted.length !== breaks.length || sorted.some((b, i) => b !== breaks[i]))) {
    warn(
      'heatmap-breaks',
      'Heatmap `breaks` must be finite and ascending; they were sorted and deduplicated.',
    )
  }
  if (sorted.length > MAX_BREAKS) {
    if (DEV) {
      warn('heatmap-bins', 'Heatmap shows at most 5 bins; breaks after the fourth were dropped.')
    }
    return sorted.slice(0, MAX_BREAKS)
  }
  return sorted
}

function defaultLabels(breaks: readonly number[], fmt: Formatter): string[] {
  const first = breaks[0]
  const last = breaks[breaks.length - 1]
  if (first === undefined || last === undefined) return ['All values']
  return [
    `Under ${fmt(first)}`,
    ...breaks.slice(1).map((b, i) => `${fmt(breaks[i] as number)} to ${fmt(b)}`),
    `${fmt(last)} and up`,
  ]
}

function sum(values: readonly number[]): number {
  const finite = values.filter(Number.isFinite)
  return finite.length === 0 ? Number.NaN : finite.reduce((a, b) => a + b, 0)
}

function NoData() {
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="ch-sr-only">No data</span>
    </>
  )
}

export function Heatmap<D>({
  data,
  row,
  column,
  value,
  rows: rowOrder,
  columns: columnOrder,
  breaks,
  binLabels,
  format,
  totals = true,
  totalLabel = 'Total',
  legend = true,
  tone = 'loss',
  title,
  description,
  activeId,
  onActiveChange,
  onSelect,
  empty,
  className,
  style,
}: HeatmapProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`

  const edges = useMemo(() => cleanBreaks(breaks, warn), [breaks, warn])
  const levels = useMemo(() => binLevels(edges.length + 1), [edges])
  const labels = useMemo(() => {
    if (binLabels && binLabels.length === edges.length + 1) return [...binLabels]
    if (DEV && binLabels) {
      warn('heatmap-labels', 'Heatmap `binLabels` needs one label per bin; using the defaults.')
    }
    return defaultLabels(edges, fmt)
  }, [binLabels, edges, fmt, warn])

  const model = useMemo((): HeatmapModel<D> => {
    const getRow = resolveAccessor(row)
    const getColumn = resolveAccessor(column)
    const getValue = resolveAccessor(value)
    const found = new Map<string, { value: number; datum: D }>()
    const seenRows = new Set<string>()
    const seenColumns = new Set<string>()
    data.forEach((d, i) => {
      const r = getRow(d, i)
      const c = getColumn(d, i)
      if (r === null || r === undefined || c === null || c === undefined) {
        if (DEV) warn('heatmap-key', `Heatmap skipped an item without a row or column at index ${i}.`)
        return
      }
      const key = `${r}:${c}`
      if (found.has(key)) {
        if (DEV) warn('heatmap-repeat', `Heatmap skipped a repeated cell "${key}" at index ${i}.`)
        return
      }
      const v = toNumber(getValue(d, i))
      if (DEV && !Number.isFinite(v)) {
        warn(
          'heatmap-value',
          `Heatmap shows a dash for a missing or non-numeric value at index ${i}.`,
        )
      }
      found.set(key, { value: v, datum: d })
      seenRows.add(String(r))
      seenColumns.add(String(c))
    })
    const rows = rowOrder ? rowOrder.map(String) : [...seenRows]
    const columns = columnOrder ? columnOrder.map(String) : [...seenColumns]
    const levelOf = (v: number): SeqLevel | 0 => {
      if (!Number.isFinite(v)) return 0
      const bin = edges.findIndex((b) => v < b)
      return levels[bin === -1 ? edges.length : bin] ?? 0
    }
    const cells = rows.map((r) =>
      columns.map((c): HeatmapCell<D> => {
        const id = `${r}:${c}`
        const hit = found.get(id)
        const v = hit?.value ?? Number.NaN
        return { id, row: r, column: c, value: v, datum: hit?.datum, level: levelOf(v) }
      }),
    )
    return {
      rows,
      columns,
      cells,
      rowTotals: cells.map((rowCells) => sum(rowCells.map((cell) => cell.value))),
      columnTotals: columns.map((_, j) =>
        sum(cells.map((rowCells) => rowCells[j]?.value ?? Number.NaN)),
      ),
    }
  }, [data, row, column, value, rowOrder, columnOrder, edges, levels, warn])

  const byId = useMemo(() => new Map(model.cells.flat().map((c) => [c.id, c])), [model])
  const [innerActive, setInnerActive] = useState<string | null>(null)
  const controlled = activeId !== undefined
  const active = controlled ? activeId : innerActive
  // Kept in step with renders; a second call in the same event must see the first one's id.
  const activeRef = useRef(active)
  activeRef.current = active
  const [focusId, setFocusId] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLElement>())
  const tabId =
    focusId !== null && byId.has(focusId) ? focusId : (model.cells[0]?.[0]?.id ?? null)

  const setActive = (next: string | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    if (!controlled) setInnerActive(next)
    onActiveChange?.(next, next === null ? null : (byId.get(next) ?? null))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, r: number, c: number) => {
    const cell = model.cells[r]?.[c]
    if (!cell) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(cell.id, cell)
      return
    }
    if (event.key === 'Escape') {
      setActive(null)
      return
    }
    if (!MOVES.has(event.key)) return
    event.preventDefault()
    const lastRow = model.rows.length - 1
    const lastColumn = model.columns.length - 1
    let [nr, nc] = [r, c]
    if (event.key === 'ArrowUp') nr = Math.max(0, r - 1)
    else if (event.key === 'ArrowDown') nr = Math.min(lastRow, r + 1)
    else if (event.key === 'ArrowLeft') nc = Math.max(0, c - 1)
    else if (event.key === 'ArrowRight') nc = Math.min(lastColumn, c + 1)
    else if (event.key === 'Home') nc = 0
    else nc = lastColumn
    const next = model.cells[nr]?.[nc]
    if (!next) return
    setFocusId(next.id)
    refs.current.get(next.id)?.focus()
  }

  const valueText = (v: number | undefined): ReactNode =>
    v !== undefined && Number.isFinite(v) ? fmt(v) : <NoData />
  const rootStyle = { '--ch-seq-base': `var(--ch-${tone})`, ...style } as CSSProperties

  if (model.rows.length === 0 || model.columns.length === 0) {
    return (
      <div className={cx('ch-heatmap', className)} data-ch-part="heatmap" style={rootStyle}>
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      </div>
    )
  }

  return (
    <div className={cx('ch-heatmap', className)} data-ch-part="heatmap" style={rootStyle}>
      {title ? (
        <span hidden id={titleId}>
          {title}
        </span>
      ) : null}
      {description ? (
        <span hidden id={descId}>
          {description}
        </span>
      ) : null}
      <div
        role="grid"
        className="ch-heatmap-grid"
        data-ch-totals={totals ? 'true' : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        style={{ '--ch-heatmap-columns': model.columns.length } as CSSProperties}
        onPointerLeave={() => setActive(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
        }}
      >
        <div role="row" className="ch-heatmap-row">
          <div role="columnheader" className="ch-heatmap-corner" />
          {model.columns.map((name, j) => (
            <div key={name} role="columnheader" className="ch-heatmap-header">
              <span>{name}</span>
              {totals ? (
                <span className="ch-heatmap-header-total">
                  {valueText(model.columnTotals[j])}
                </span>
              ) : null}
            </div>
          ))}
          {totals ? (
            <div role="columnheader" className="ch-heatmap-header ch-heatmap-total-header">
              {totalLabel}
            </div>
          ) : null}
        </div>
        {model.cells.map((rowCells, r) => (
          <div key={model.rows[r]} role="row" className="ch-heatmap-row">
            <div role="rowheader" className="ch-heatmap-rowheader">
              {model.rows[r]}
            </div>
            {rowCells.map((cell, c) => (
              <div
                key={cell.id}
                ref={(el) => {
                  if (el) refs.current.set(cell.id, el)
                  else refs.current.delete(cell.id)
                }}
                role="gridcell"
                tabIndex={cell.id === tabId ? 0 : -1}
                className="ch-heatmap-cell"
                data-ch-part="heatmap-cell"
                data-ch-level={cell.level}
                data-ch-active={cell.id === active ? 'true' : undefined}
                data-ch-selectable={onSelect ? 'true' : undefined}
                onFocus={() => {
                  setFocusId(cell.id)
                  setActive(cell.id)
                }}
                onPointerEnter={() => setActive(cell.id)}
                onClick={() => onSelect?.(cell.id, cell)}
                onKeyDown={(event) => onKeyDown(event, r, c)}
              >
                {valueText(cell.value)}
              </div>
            ))}
            {totals ? (
              <div role="gridcell" className="ch-heatmap-total">
                {valueText(model.rowTotals[r])}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {legend ? (
        <Legend
          className="ch-heatmap-legend"
          items={labels.map((label, i) => ({ label, level: levels[i] }))}
        />
      ) : null}
    </div>
  )
}
```

A click focuses the clicked cell natively (it has a `tabIndex`), so `onFocus` moves the tab stop and activates the cell.

- [ ] **Step 4: Style the heatmap**

In `packages/tally-charts/src/theme/theme.css`, add this section right before `/* ---------- Motion off ---------- */`:

```css
/* ---------- Heatmap ---------- */
.ch-heatmap {
  display: grid;
  gap: 20px;
  color: var(--ch-ink);
  font-variant-numeric: var(--ch-font-numeric);
}

.ch-heatmap-grid {
  display: grid;
  grid-template-columns: max-content repeat(var(--ch-heatmap-columns), minmax(0, 1fr));
  gap: 10px 12px;
}

.ch-heatmap-grid[data-ch-totals="true"] {
  grid-template-columns:
    max-content repeat(var(--ch-heatmap-columns), minmax(0, 1fr))
    max-content;
}

/* Rows are subgrids, so the ARIA row elements stay in the tree and every column lines up. */
.ch-heatmap-row {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
}

.ch-heatmap-header {
  display: grid;
  gap: 2px;
  align-self: end;
  color: var(--ch-ink-muted);
  font-size: 13px;
}

.ch-heatmap-header-total {
  color: var(--ch-ink);
  font-size: 15px;
  font-weight: 500;
}

.ch-heatmap-total-header {
  text-align: right;
}

.ch-heatmap-rowheader {
  padding-right: 24px;
  font-size: 15px;
}

.ch-heatmap-cell {
  display: grid;
  place-items: center;
  height: var(--ch-heatmap-cell-height, 44px);
  border-radius: 10px;
  color: var(--ch-ink);
  font-size: 15px;
  font-weight: 500;
  outline: none;
  transition: box-shadow 150ms ease;
}

.ch-heatmap-cell[data-ch-level="0"] {
  color: var(--ch-ink-muted);
  box-shadow: inset 0 0 0 1px var(--ch-grid);
}

.ch-heatmap-cell[data-ch-level="1"] {
  background: var(--ch-seq-1);
}

.ch-heatmap-cell[data-ch-level="2"] {
  background: var(--ch-seq-2);
}

.ch-heatmap-cell[data-ch-level="3"] {
  background: var(--ch-seq-3);
}

.ch-heatmap-cell[data-ch-level="4"] {
  background: var(--ch-seq-4);
}

.ch-heatmap-cell[data-ch-level="5"] {
  background: var(--ch-seq-5);
  color: var(--ch-seq-ink-strong);
}

.ch-heatmap-cell[data-ch-active="true"] {
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.08),
    0 6px 16px rgb(0 0 0 / 0.14);
}

.ch-heatmap-cell:focus-visible {
  box-shadow:
    0 0 0 2px var(--ch-surface),
    0 0 0 4px var(--ch-accent);
}

.ch-heatmap-cell[data-ch-selectable="true"] {
  cursor: pointer;
}

.ch-heatmap-total {
  padding-left: 24px;
  font-size: 15px;
  font-weight: 500;
  text-align: right;
}
```

In the `@media (prefers-reduced-motion: reduce)` block at the end, change the selector list to:

```css
  [data-ch-root] *,
  .ch-heatmap *,
  .ch-tooltip {
```

Append inside `describe('theme.css', …)` in `packages/tally-charts/src/theme/theme.test.ts`:

```ts
  it('puts white text only on the darkest heatmap level', () => {
    expect(css).toMatch(
      /\.ch-heatmap-cell\[data-ch-level="5"\] \{[^}]*color: var\(--ch-seq-ink-strong\)/,
    )
    expect(css).toMatch(/\.ch-heatmap-cell \{[^}]*color: var\(--ch-ink\)/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\.ch-heatmap \*/)
  })
```

- [ ] **Step 5: Run the tests and lint**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/Heatmap.test.tsx src/theme && pnpm typecheck && pnpm lint`
Expected: PASS. Lint shows only the expected warnings and info listed in Global Constraints.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Heatmap, an ARIA grid with totals, threshold bins and a legend"
```

---

### Task 7: Public exports, size budgets, SSR coverage, README, changeset

**Files:**
- Modify: `packages/tally-charts/src/index.ts`, `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.test.ts`
- Modify: `packages/tally-charts/.size-limit.json`
- Modify: `packages/tally-charts/test/fixtures.tsx`, `packages/tally-charts/src/ssr.node.test.tsx`
- Modify: `packages/tally-charts/README.md`
- Create: `.changeset/tally-charts-0-5.md`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: the public 0.5 API, plus the fixtures `MarginOutlook` and `LeakHeatmap`.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/index.test.ts`, add to the `'main exports %s'` list:

```ts
    'LineChart',
    'Heatmap',
    'Line',
    'Band',
    'Grid',
    'Region',
```

and to the `'core exports %s'` list:

```ts
    'linePath',
    'bandPath',
    'pointTicks',
    'categoryCenter',
    'categoryStep',
    'clampToRange',
```

Append to `packages/tally-charts/test/fixtures.tsx`, and add `Heatmap` and `LineChart` to its import from `'../src'`:

```tsx
type OutlookMonth = {
  month: string
  actual: number | null
  path: number | null
  changes: number | null
  low: number | null
  high: number | null
}

export const outlook: OutlookMonth[] = [
  { month: 'Jul', actual: 34.5, path: null, changes: null, low: null, high: null },
  { month: 'Aug', actual: 34.1, path: null, changes: null, low: null, high: null },
  { month: 'Sep', actual: 33.6, path: 33.6, changes: 33.6, low: 33.6, high: 33.6 },
  { month: 'Oct', actual: null, path: 35.2, changes: 36.7, low: 34.1, high: 36.3 },
]

export function MarginOutlook() {
  return (
    <LineChart
      title="Margin outlook"
      data={outlook}
      x="month"
      series={[
        { id: 'actual', label: 'Actual', value: 'actual' },
        {
          id: 'path',
          label: 'Current path',
          value: 'path',
          style: 'forecast',
          tooltipLabel: 'on the current path',
        },
        {
          id: 'changes',
          label: 'With your changes',
          value: 'changes',
          style: 'scenario',
          tooltipLabel: 'with changes',
        },
      ]}
      band={{ low: 'low', high: 'high', label: 'Likely range' }}
      forecastFrom="Oct"
      target={{ value: 38, label: 'Target 38%' }}
      domain={[30, 40]}
      format="percent"
    />
  )
}

export const leakCells = [
  { branch: 'Dallas', cause: 'Labor', amount: 14800 },
  { branch: 'Dallas', cause: 'Materials', amount: 7900 },
  { branch: 'Dallas', cause: 'Callbacks', amount: 6800 },
  { branch: 'Austin', cause: 'Labor', amount: 9200 },
  { branch: 'Austin', cause: 'Materials', amount: 5100 },
  { branch: 'Austin', cause: 'Callbacks', amount: 3900 },
]

export function LeakHeatmap() {
  return (
    <Heatmap
      title="Where it leaks"
      data={leakCells}
      row="branch"
      column="cause"
      value="amount"
      breaks={[4000, 7000, 13000]}
      format="currency-compact"
    />
  )
}
```

Append inside `describe('server rendering', …)` in `packages/tally-charts/src/ssr.node.test.tsx`, and add `LeakHeatmap` and `MarginOutlook` to the fixtures import:

```tsx
  it('renders the 0.5 charts without a DOM, deterministically', () => {
    for (const Example of [MarginOutlook, LeakHeatmap]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
    }
    const lines = renderToString(<MarginOutlook />)
    expect(lines.match(/data-ch-part="line-group"/g)).toHaveLength(3)
    expect(lines).toContain('data-ch-part="band"')
    expect(lines).toContain('data-ch-part="region"')
    expect(lines).toContain('Target 38%')
    // The tooltip lives in the overlay, which only exists after mount.
    expect(lines).not.toContain('data-ch-part="tooltip"')
    const heatmap = renderToString(<LeakHeatmap />)
    expect(heatmap).toContain('role="grid"')
    expect(heatmap.match(/data-ch-part="heatmap-cell"/g)).toHaveLength(6)
    expect(heatmap).toContain('$14.8K')
    expect(heatmap).toContain('$13K and up')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/index.test.ts src/ssr.node.test.tsx`
Expected: FAIL; the names aren't exported.

- [ ] **Step 3: Export**

In `packages/tally-charts/src/index.ts`, keeping the alphabetical-by-path order:
- Change the scale types line to `export type { BandScaleSpec, LinearScaleSpec, PointScaleSpec, ScaleSpec } from './core/scale'`.
- Change the core types line to `export type { Accessor, Fill, Id, PerItem, SeqLevel, Tone } from './core/types'`.
- Change the legend types line to `export type { LegendItem, LegendProps, LegendShape } from './react/ui/Legend'`.
- Add:

```ts
export type { HeatmapCell, HeatmapProps } from './react/charts/Heatmap'
export { Heatmap } from './react/charts/Heatmap'
export type {
  LineChartProps,
  LineRange,
  LineSeries,
  LineSeriesStyle,
} from './react/charts/LineChart'
export { LineChart } from './react/charts/LineChart'
export type { BandProps } from './react/marks/Band'
export { Band } from './react/marks/Band'
export type { GridProps } from './react/marks/Grid'
export { Grid } from './react/marks/Grid'
export type { LineDots, LineProps } from './react/marks/Line'
export { Line } from './react/marks/Line'
export type { RegionProps } from './react/marks/Region'
export { Region } from './react/marks/Region'
```

In `packages/tally-charts/src/core/index.ts`:
- Add after the `formatter` exports block:

```ts
export type { BandPoint, LinePoint } from './line'
export { bandPath, linePath } from './line'
```

- Change `export { linearScale, niceDomain } from './linear'` to `export { clampToRange, linearScale, niceDomain } from './linear'`.
- Change the scale lines to:

```ts
export type {
  BandScaleSpec,
  LinearScaleSpec,
  PointScaleSpec,
  ResolvedScale,
  ScaleSpec,
} from './scale'
export { categoryCenter, categoryStep, createScale, inferLinearDomain } from './scale'
```

- Change the ticks line to `export { bandTicks, estimateWidth, linearTicks, pointTicks, thinTicks } from './ticks'`.
- Change the types line to `export type { Accessor, Fill, Id, PerItem, SeqLevel, Tone } from './types'`.

`round2` stays internal.

- [ ] **Step 4: Add size budgets**

Insert before the `"Small UI pieces"` entry in `packages/tally-charts/.size-limit.json`:

```json
  {
    "name": "LineChart",
    "path": "dist/index.js",
    "import": "{ LineChart }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "Heatmap",
    "path": "dist/index.js",
    "import": "{ Heatmap }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
```

- [ ] **Step 5: Document 0.5**

In `packages/tally-charts/README.md`:
- Change the status line to `> Status: 0.5. The API may change before 1.0.`
- In the High-level charts section, add after the `WaffleColumns` bullet:

```md
- `LineChart`: `series` with `style` `'actual'` (solid), `'forecast'` (dashed, hollow dots) or
  `'scenario'` (dashed, green); `band` for a likely range, `forecastFrom` shades the forecast,
  `target`. Hover snaps to the nearest x and one tooltip lists every series there; ←/→ walk the
  x values. Point ids are the x values. A forecast that continues the actuals repeats the last
  actual value, so the lines join; the tooltip lists that value once.
- `Heatmap`: an HTML CSS grid (`role="grid"`) of long-format data (`row`, `column`, `value`) with
  column totals under the headers, a row total column, and `breaks` binned onto `--ch-seq-1…5`
  with a legend. One tab stop: arrow keys, Home/End and Enter move and select. `tone` changes
  the base color. Cell ids are `"<row>:<column>"`; missing values show a dash.
```

- Add after the 0.4 building-blocks paragraph:

```md
Building blocks added in 0.5: `Line`, `Band` (area between two values), `Grid` (horizontal
lines at the y ticks) and `Region` (shaded run of categories), plus `type: 'point'` scales for
`<Chart x>`. Time scales aren't in yet: put dates on a point scale with formatted labels.
`Legend` draws `shape="line"` swatches (`dashed` for forecasts) and sequential `level` swatches.
```

- [ ] **Step 6: Add the changeset**

Create `.changeset/tally-charts-0-5.md`:

```md
---
'tally-charts': minor
---

Line charts and heatmaps: `LineChart` (actual, forecast and scenario series, likely-range band,
shaded forecast region, target, one tooltip for every series at an x) and `Heatmap` (ARIA grid
on CSS grid, totals, threshold bins onto the sequential scale, legend, roving keyboard focus).
New building blocks `Line`, `Band`, `Grid` and `Region`; `type: 'point'` scales; `Legend` line
and sequential-level swatches. `tally-charts/core` gains `linePath`, `bandPath`, `pointTicks`,
`categoryCenter`, `categoryStep` and `clampToRange`.

Changes: `--ch-seq-4` is now 65% of the base (was 75%) and `--ch-seq-5` is the base darkened
with 25% black (was the base), so text on every level passes 4.5:1 in both themes. The levels
read `--ch-seq-base` from any ancestor (default `--ch-loss`) and are defined on legends and
heatmaps too. Time scales are deferred to 1.0; use a point scale with formatted labels.
```

- [ ] **Step 7: Build and verify everything**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS. Record every size-limit number in the report, the `tally-charts/core` one especially, since it now bundles `scalePoint`. Never raise a budget. If one is over, report it as BLOCKED with the numbers.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts .changeset
git commit -m "feat: export LineChart, Heatmap and the line marks; budgets and docs"
```

---

### Task 8: Reference stories, e2e and baselines

**Files:**
- Create: `apps/storybook/stories/MarginOutlook.stories.tsx`, `apps/storybook/stories/WhereItLeaks.stories.tsx`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Create: 4 darwin and 4 linux PNGs under `apps/storybook/e2e/__screenshots__/`

**Interfaces:**
- Consumes: the public API from Task 7.
- Produces: the story ids
  - `reference-margin-outlook--light` and `--dark`
  - `reference-where-it-leaks--light` and `--dark`

- [ ] **Step 1: Write the stories**

Create `apps/storybook/stories/MarginOutlook.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, LineChart } from 'tally-charts'

// docs/reference/07-forecast.png, card "Margin outlook".
type Month = {
  month: string
  actual: number | null
  path: number | null
  changes: number | null
  low: number | null
  high: number | null
}

// The forecasts and the band start at September's actual, so the lines join there.
const months: Month[] = [
  { month: 'Apr', actual: 32.9, path: null, changes: null, low: null, high: null },
  { month: 'May', actual: 34.2, path: null, changes: null, low: null, high: null },
  { month: 'Jun', actual: 34.9, path: null, changes: null, low: null, high: null },
  { month: 'Jul', actual: 34.5, path: null, changes: null, low: null, high: null },
  { month: 'Aug', actual: 34.1, path: null, changes: null, low: null, high: null },
  { month: 'Sep', actual: 33.6, path: 33.6, changes: 33.6, low: 33.6, high: 33.6 },
  { month: 'Oct', actual: null, path: 35.2, changes: 36.7, low: 34.1, high: 36.3 },
  { month: 'Nov', actual: null, path: 35.6, changes: 37.2, low: 34.2, high: 37.0 },
  { month: 'Dec', actual: null, path: 36.0, changes: 37.6, low: 34.3, high: 37.6 },
]

function MarginOutlook() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">Margin outlook</h2>
          <span className="card-meta">Actual through September, forecast to December</span>
        </div>
        <Legend
          shape="line"
          items={[
            { label: 'Actual', tone: 'accent' },
            { label: 'Current path', tone: 'accent', dashed: true },
            { label: 'With your changes', tone: 'gain', dashed: true },
            { label: 'Likely range', tone: 'accent-soft', shape: 'bar' },
          ]}
        />
      </header>
      <LineChart
        title="Margin outlook"
        description="Margin reaches 36.0% by December on the current path and 37.6% with your changes, still under the 38% target."
        data={months}
        x="month"
        series={[
          { id: 'actual', label: 'Actual', value: 'actual' },
          {
            id: 'path',
            label: 'Current path',
            value: 'path',
            style: 'forecast',
            tooltipLabel: 'on the current path',
          },
          {
            id: 'changes',
            label: 'With your changes',
            value: 'changes',
            style: 'scenario',
            tooltipLabel: 'with changes',
          },
        ]}
        band={{ low: 'low', high: 'high', label: 'Likely range' }}
        forecastFrom="Oct"
        target={{ value: 38, label: 'Target 38%' }}
        domain={[30, 40]}
        format="percent"
        axisFormat={(v) => `${v}%`}
        height={360}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Margin outlook',
  component: MarginOutlook,
} satisfies Meta<typeof MarginOutlook>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Create `apps/storybook/stories/WhereItLeaks.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Heatmap, type HeatmapCell, Legend } from 'tally-charts'

// docs/reference/05-leakage-heatmap.png, card "Where it leaks".
const causes = ['Labor', 'Materials', 'Callbacks', 'Discounts', 'Unbilled']
const amounts: Record<string, number[]> = {
  Dallas: [14800, 7900, 6800, 3100, 3600],
  Austin: [9200, 5100, 3900, 4200, 1900],
  Houston: [7200, 5700, 3700, 2500, 2800],
}
const leaks = Object.entries(amounts).flatMap(([branch, values]) =>
  values.map((amount, i) => ({ branch, cause: causes[i] ?? '', amount })),
)
type Leak = (typeof leaks)[number]

const bins = ['Under $4K', '$4K to 7K', '$7K to 13K', '$13K and up']
const binLevels = [1, 2, 4, 5] as const

function WhereItLeaks() {
  const [selected, setSelected] = useState<HeatmapCell<Leak> | null>(null)
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">Where it leaks</h2>
          <span className="card-meta">By branch and cause, September to date</span>
        </div>
        <Legend items={bins.map((label, i) => ({ label, level: binLevels[i] }))} />
      </header>
      <Heatmap
        title="Profit leaked by branch and cause"
        description="Dallas carries 44% of September leakage on 41% of revenue. Labor in Dallas alone is $14.8K."
        data={leaks}
        row="branch"
        column="cause"
        value="amount"
        breaks={[4000, 7000, 13000]}
        binLabels={bins}
        format="currency-compact"
        legend={false}
        onSelect={(_, cell) => setSelected(cell)}
      />
      <p className="card-text">
        Dallas carries 44% of September leakage on 41% of revenue. Labor in Dallas alone is
        $14.8K.
      </p>
      <output data-testid="heatmap-selected" className="card-text">
        {selected ? `Selected: ${selected.row} · ${selected.column}` : 'Nothing selected'}
      </output>
    </article>
  )
}

const meta = {
  title: 'Reference/Where it leaks',
  component: WhereItLeaks,
} satisfies Meta<typeof WhereItLeaks>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Check the data against the reference:
- Row totals: Dallas $36.2K, Austin $24.3K, Houston $21.9K.
- Column totals: Labor $31.2K, Materials $18.7K, Callbacks $14.4K, Discounts $9.8K, Unbilled $8.3K.
- Grand total: $82.4K, the "Profit leaked" headline in the same screenshot.

If any total in the rendered story differs, fix the data, not the chart.

Run `pnpm --filter storybook-app typecheck`. Expected: PASS.

- [ ] **Step 2: Look at the stories next to their references**

Start your own dev server on a free port (`pnpm --filter storybook-app exec storybook dev -p 6010 --no-open`). Another session may have one on 6006; leave that alone. Screenshot each story into your scratchpad at 1280 px wide. Compare them with reference 07 (the "Margin outlook" card) and reference 05 (the "Where it leaks" card).

Check:
- **Line chart:**
  - the solid blue actual line with filled dots
  - the dashed blue current path with hollow dots, joining at Sep
  - the dashed green scenario with filled dots
  - the soft likely-range band from Sep to Dec
  - the shaded region from halfway between Sep and Oct to the right edge
  - the dashed "Target 38%" line with its label at the left
  - grid lines at 30–40% every 2 points, with labels "30%" … "40%"
  - month labels Apr … Dec
  - hovering near Oct shows one pill: "Oct | 35.2% on the current path | 36.7% with changes", with rings on both forecast dots
- **Heatmap:**
  - five columns with their totals under the names, and a right "Total" column
  - three rows
  - darker cells for bigger amounts, with white text only on the "$13K and up" cells
  - the header legend with four swatches matching the cells
  - arrow keys move a visible focus ring
- **Dark mode** for both.

Wrong layout, colors, clipping or overlapping text are defects. Fix them in the library with a unit test, list them in the report, then continue. Spacing nuances are fine. Stop your dev server afterwards.

- [ ] **Step 3: Extend the e2e suite**

In `apps/storybook/e2e/stories.spec.ts`:

Add to `STORIES`:

```ts
  'reference-margin-outlook--light',
  'reference-margin-outlook--dark',
  'reference-where-it-leaks--light',
  'reference-where-it-leaks--dark',
```

Add to `WIDE_STORIES`:

```ts
  'reference-margin-outlook--light': { width: 1280, height: 640 },
  'reference-margin-outlook--dark': { width: 1280, height: 640 },
  'reference-where-it-leaks--light': { width: 1280, height: 600 },
  'reference-where-it-leaks--dark': { width: 1280, height: 600 },
```

Append:

```ts
test('the line chart snaps to the nearest month and lists every series', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 })
  await open(page, 'reference-margin-outlook--light')
  // Hollow dots belong to the forecast: Sep (the join) first, then Oct.
  const box = await page
    .locator('[data-ch-part="line-dot"][data-ch-hollow="true"]')
    .nth(1)
    .boundingBox()
  if (!box) throw new Error('no dot')
  await page.mouse.move(box.x + box.width / 2 + 6, box.y + 40)
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  await expect(tooltip).toContainText('Oct')
  await expect(tooltip).toContainText('35.2%')
  await expect(tooltip).toContainText('on the current path')
  await expect(tooltip).toContainText('36.7%')
  await expect(page.locator('[data-ch-part="dot-ring"]')).toHaveCount(2)
})

test('the line chart announces every series at a month', async ({ page }) => {
  await open(page, 'reference-margin-outlook--light')
  const chart = page.getByRole('figure', { name: 'Margin outlook' })
  await chart.focus()
  await page.keyboard.press('End')
  await expect(chart.locator('[aria-live]')).toHaveText(
    'Dec, 36.0% on the current path, 37.6% with changes',
  )
})

test('arrow keys move through the heatmap and Enter selects a cell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-where-it-leaks--light')
  await page.getByRole('gridcell', { name: '$14.8K' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('gridcell', { name: '$5.1K' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('heatmap-selected')).toHaveText('Selected: Austin · Materials')
})
```

- [ ] **Step 4: Generate darwin baselines and verify**

Run: `pnpm --filter storybook-app exec playwright test --update-snapshots=missing`, then `pnpm test:e2e`.
Expected: the second run PASSES with 71 tests: 28 stories × 2, plus 15 interaction tests. `git status` shows 4 new darwin PNGs, and no other darwin PNG changed. If an existing baseline changed, the theme change leaked into an old story: find out why and fix it; never regenerate it to hide that. Open each new PNG. Each must show the full card: the lines drawn in full, and the heatmap with every cell and legend swatch.

- [ ] **Step 5: Generate and verify linux baselines**

Run the docker route from the comment above the `e2e` job in `.github/workflows/ci.yml`, from the repo root, with Docker running. It regenerates the baselines, re-runs the suite without updating, and copies the PNGs out only if that run passes. Expected: 4 new linux PNGs and no other linux PNG changed. Open each new one.

- [ ] **Step 6: Full verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm test:e2e`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add apps/storybook
git commit -m "test: line chart and heatmap reference stories, e2e and baselines"
```

---

## After the plan

The 1.0 plan covers:
- the API freeze, with a review of every exported name and prop against spec §6
- time scales for `LineChart`, deferred from 0.5
- a docs site
- an accessibility audit
- the first npm publish: the package is still at `0.0.0`, with five changesets queued

It also picks up the deferred 0.4 items:
- percent axis ticks read "0.0%"
- the pinned #5819 dot has no ring
- the waffle peak pill sits nearly flush on its column
