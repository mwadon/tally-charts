# tally-charts 0.2 Bar Charts and Small UI Pieces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `tally-charts` 0.2. It adds three high-level charts (`BarChart`, `ComparisonBars`, `RankedBars`) and the small HTML pieces (`Stat`, `Delta`, `Meter`, `RangeMeter`, `InlineBar`, `DotCount`). It also fixes the open 0.1 click-select bug and the known limitations carried over from 0.1. The deliverables are reference stories that recreate the "Estimate vs actual", "Result", "Where the $860 went", drill-column and "Gross margin" cards, passing visual, accessibility and bundle-size checks.

**Architecture:** The 0.1 layering stays.
- `core` gains bar-layout options for start value, thickness, alignment and offset, plus label truncation.
- `<Bars>` gains thin, offset and non-interactive layers, tracks and per-bar selection.
- Two new building blocks, `RowLabels` and `RowDividers`, draw SVG text columns for row charts. Both are server-rendered: no HTML portal, so the text is in the first paint.
- High-level charts are thin compositions of `<Chart>` and these blocks.
- Small UI pieces are plain HTML styled by the same tokens.

**Tech Stack:** unchanged from 0.1: TypeScript 6.0.3, React 19.3 (peer `^18.2 || ^19`), d3-scale 4 (band only), d3-array 3, tsdown 0.23, Vitest 5 + jsdom + Testing Library, Playwright 1.64 + axe-core, Storybook 10.6, Biome 2.5, size-limit 14. The only new dev dependency is `esbuild@0.28.2`, used by the production-strip check.

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-design.md`. Reference screenshots: `docs/reference/*.png`; this plan targets:
- `01`: the "Gross margin" card and the "Last 12 weeks" card again, now as `BarChart`
- `02`: table margin cells (`InlineBar`) and status dots
- `03`: "Estimate vs actual", the "Result" card and "Where the $860 went"
- `05`: `DotCount` rows
- `06`: the drill columns

This is plan 2 of 6. 0.1 is on branch `feat/0.1-foundation`, which is not merged yet. **Execute this plan on a new branch `feat/0.2-bar-charts` created from `feat/0.1-foundation`** (at `f61090c` or later).

## Global Constraints

**Toolchain and packaging**
- Node `>=22` (developed on 24); `packageManager` is `pnpm@12.4.2`. Exact dev versions as in 0.1; new: `esbuild` `0.28.2` (devDependency of `packages/tally-charts`).
- Runtime dependencies stay `d3-scale@^4.0.2` (import `scaleBand` only, never `scaleLinear`) and `d3-array@^3.2.4`. Nothing else.
- ESM only. `sideEffects: ["*.css"]`. Subpath exports `tally-charts`, `tally-charts/core`, `tally-charts/theme.css`.
- Bundle budgets (min+gzip, d3 included): `core` ≤ 8 KB; any single chart ≤ 15 KB. Never raise a budget to make a check pass. Report the measured number instead.

**Naming and API surface**
- CSS tokens use the `--ch-` prefix. Part hooks are `data-ch-part`, `data-ch-tone`, `data-ch-fill`. `ch-*` class names are internal, not API.
- Tones: `accent | accent-soft | loss | warn | gain | neutral`. Fills: `solid | hatch | hatch-fade`.
- Shared prop names (spec §6): `data`, `x`, `y`, `id`, `label`, `tone`, `fill`, `format`, `height`/`aspectRatio`, `initialWidth`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`, `className`, `style`. High-level charts render `children` inside their `<Chart>` after their own marks.
- Every exported component has an exported `XxxProps` type. No `any` in the public API.

**Formatting**
- Default locale `en-US`, currency `USD`. Negative numbers use U+2212 (`−`), never a hyphen. Small UI pieces format through `useFormat()` so `ChartsProvider` applies.

**Errors and warnings**
- Bad data never throws. The only throw is a building block rendered outside `<Chart>`.
- Development warnings go through `createWarner()`, start with `[tally-charts] `, fire once per key per chart, and are silent in production. **From Task 4 on, every `warn(...)` call sits inside `if (DEV) { … }`** (import `DEV` from `core/warn`), so production bundles drop the message strings.

**Accessibility and motion**
- The chart root is a `<figure>` and a single tab stop. Every hover state is also reachable by keyboard. `prefers-reduced-motion` and `animate={false}` disable all motion.
- High-level charts render a hidden data table by default (`dataTable` prop, default `true`).
- Small UI pieces never rely on color alone: arrows are paired with screen-reader words, meters expose `role="meter"` or `role="img"` with a text label.

**Code style and commits**
- Biome formatting: 2 spaces, single quotes, no semicolons, line width 100. Run `pnpm format` before every commit.
- Commit messages are conventional (`feat:`, `fix:`, `chore:`, `test:`) and end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Commands run from the repo root unless a step says otherwise. Unit tests: `pnpm test` (all) or `pnpm --filter tally-charts exec vitest run <path>` (one file).

**Deferred** (not in 0.2, don't build): `WaterfallChart`, `BridgeChart`, `Callout`, `ColumnHighlight`, `Connector`, `Grid`, dot charts, lines, heatmap, point/time scales, docs site.

## Design decisions this plan makes

These settle questions the spec leaves open. The executor treats them as requirements.

1. **Selection belongs to the hit area, not the figure.** Each bar's hit rect calls `onSelect` with its own point on `click`. This fixes the 0.1 bug where a fast click selected the previously hovered bar and a touch tap selected nothing. The figure no longer has an `onClick`.
2. **`RankedBars` selection uses `selectedId`, not `activeId`.** The spec says "selectable rows via `activeId`". But a controlled `activeId` that only changes on select would freeze keyboard navigation: the arrow keys call `onActiveChange`, and the parent would ignore it. So `activeId` keeps meaning hover/focus (and still links views), while `selectedId` + `onSelect` drive the highlighted row.
3. **Row charts draw their text in SVG** (`RowLabels`), not in the HTML overlay. The overlay only exists after mount, so overlay text would be missing from server output.
4. **`RankedBars` draws magnitudes.** Bar length is `|value|`, so "−$260 lost" rows extend right like the reference. The value text keeps the sign.
5. **Ids of sorted rows are the original data index** (or the `id` accessor). Re-sorting never changes what `onSelect` receives.
6. **Points with the same id from several marks are de-duplicated** (first registration wins), so keyboard navigation visits each item once.
7. **`--ch-radius` drives the default bar corner radius.** It's read from computed style after mount, like the hatch geometry. The token's default becomes `3px`, the 0.1 hard-coded value, so existing visuals don't change.
8. **`<Chart chartId>`** (not `id`, which is the row-id accessor on high-level charts) sets the pattern-id prefix. Use it when charts render in several React roots on one page.

## Review Focus

These failure modes follow from the spec but aren't obviously covered by a feature test. Each one has a pinned test in the task that owns the code.

1. **A fast click or a touch tap** must select the item under the pointer, never the one hovered before and never nothing. Tests: Task 1, "selects the clicked bar even when another bar was active", and the e2e tests "a fast click selects the clicked bar…" and "a tap selects the tapped bar".
2. **Layered marks sharing ids** (plan, actual and overrun bars in `ComparisonBars`): arrow keys must visit each row exactly once. Tests: Task 2, "navigates past ids registered by two marks", and Task 10, "visits each row once with the arrow keys".
3. **Sorting plus selection:** `RankedBars` sorts, and `onSelect` and `selectedId` must still refer to the original row. Test: Task 11, "keeps original indexes as ids after sorting".
4. **Missing or non-numeric plan, actual or value:** no throw, the row label still shows, value text stays blank (no `NaN`, no lone `→`). Tests: Task 10, "shows the label but no values for a row with a missing actual", and Task 11, "skips the bar but keeps the label for a missing value".
5. **Long labels in a narrow label column** are cut with an ellipsis, while the full text stays in the announcement and the data table. Tests: Task 8, "cuts long labels with an ellipsis", and Task 11, "keeps the full label for screen readers when it is cut".

---

## File Structure

```
packages/tally-charts/
  package.json                         + esbuild devDep, check:dev-strip script        (Task 4)
  scripts/check-dev-strip.mjs          production bundle must not contain warnings      (Task 4)
  .size-limit.json                     + BarChart, ComparisonBars, RankedBars, UI       (Task 14)
  README.md                            0.2 sections                                     (Task 14)
  test/fixtures.tsx                    + EstimateVsActual, DrillColumn fixtures         (Task 14)
  src/index.ts, src/index.test.ts      new exports                                      (Task 14)
  src/core/index.ts                    + truncateLabel, BarAlign                        (Task 14)
  src/core/warn.ts                     DEV constant                                     (Task 4)
  src/core/text.ts (+ test)            truncateLabel                                    (Task 5)
  src/core/bars.ts (+ test)            from / size / align / offset, BarRect.band       (Task 5)
  src/theme/patterns.ts (+ test)       fade mask per direction, readRadius              (Task 3)
  src/theme/theme.css                  new part styles                                  (Tasks 1, 3, 6, 8, 11, 12, 13)
  src/react/context.ts                 + select, selectable, radius                     (Tasks 1, 3)
  src/react/Chart.tsx (+ test)         select, chartId, radius, aspect-ratio, dataTable (Tasks 1, 3, 7)
  src/react/interaction.ts (+ test)    uniquePoints, segment compare, ref sync          (Task 2)
  src/react/PatternDefs.tsx (+ test)   four fade masks                                  (Task 3)
  src/react/DataTable.tsx (+ test)     hidden data table                                (Task 7)
  src/react/marks/Bars.tsx (+ test)    hit-area select, layer options, track            (Tasks 1, 6)
  src/react/marks/ValueLabel.tsx (+ test) data prop, in-plot placement                  (Task 6)
  src/react/marks/RowLabels.tsx (+ test) RowLabels, RowDividers                         (Task 8)
  src/react/charts/BarChart.tsx (+ test)                                                (Task 9)
  src/react/charts/ComparisonBars.tsx (+ test)                                          (Task 10)
  src/react/charts/RankedBars.tsx (+ test)                                              (Task 11)
  src/react/ui/Delta.tsx, Stat.tsx (+ tests)                                            (Task 12)
  src/react/ui/Meter.tsx, RangeMeter.tsx, InlineBar.tsx, DotCount.tsx, percent.ts (+ tests) (Task 13)
  src/react/ui/Legend.tsx              swatch gets the shared `ch-fillable` class       (Task 13)
  src/ssr.node.test.tsx                aspect-ratio + new charts                        (Tasks 3, 14)
  src/__snapshots__/last-twelve-weeks.ssr.html   regenerated (mask ids)                 (Task 3)

apps/storybook/
  stories/LastTwelveWeeks.stories.tsx  + Selectable story                               (Task 1)
  stories/BarChart.stories.tsx, EstimateVsActual.stories.tsx, Result.stories.tsx,
  stories/DrillColumns.stories.tsx, GrossMargin.stories.tsx, SmallPieces.stories.tsx    (Task 15)
  .storybook/preview.css               card helpers for the new stories                 (Task 15)
  e2e/stories.spec.ts                  select tests (Task 1), new stories (Task 15)
  playwright.config.ts                 CI never writes snapshots                        (Task 15)
  e2e/__screenshots__/{darwin,linux}/  baselines                                        (Task 15)

.github/workflows/ci.yml               dev-strip check, React 18 leg                    (Task 15)
.changeset/tally-charts-0-2.md                                                          (Task 15)
```

---
### Task 1: Select from the hit area (fixes the 0.1 click bug)

**Files:**
- Modify: `packages/tally-charts/src/react/context.ts`
- Modify: `packages/tally-charts/src/react/Chart.tsx`
- Modify: `packages/tally-charts/src/react/marks/Bars.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Test: `packages/tally-charts/src/react/marks/Bars.test.tsx`
- Modify: `apps/storybook/stories/LastTwelveWeeks.stories.tsx`
- Test: `apps/storybook/e2e/stories.spec.ts`

**Interfaces:**
- Consumes: `ChartPoint` (`react/types.ts`), `ChartProps.onSelect: (id: Id, point: ChartPoint) => void`.
- Produces: `ChartContextValue.select: (point: ChartPoint) => void` and `ChartContextValue.selectable: boolean`. Later marks call `ctx.select(point)` from their own hit areas. Hit rects carry `data-ch-selectable="true"` when the chart has `onSelect`.

**Why:** in 0.1 the figure's `onClick` read `activePoint` from the last render. In Chromium a fast click selected the bar hovered before, and on touch `pointerleave` fired before `click`, so taps mostly selected nothing. The jsdom test passed because it fires events one at a time.

- [ ] **Step 1: Add a Selectable story**

Replace `apps/storybook/stories/LastTwelveWeeks.stories.tsx` with:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Axis, Bars, Chart, type ChartProps, Target, Tooltip, ValueLabel } from 'tally-charts'

// Mirrors docs/reference/01-gross-margin-waterfall.png, card "Last 12 weeks".
const weeks = [
  { week: 'Jul 6', margin: 37.5 },
  { week: 'Jul 13', margin: 36.9 },
  { week: 'Jul 20', margin: 35.6 },
  { week: 'Jul 27', margin: 37.1 },
  { week: 'Aug 3', margin: 34.9 },
  { week: 'Aug 10', margin: 33.9 },
  { week: 'Aug 17', margin: 35.1 },
  { week: 'Aug 24', margin: 33.7 },
  { week: 'Aug 31', margin: 32.6 },
  { week: 'Sep 7', margin: 35.9 },
  { week: 'Sep 14', margin: 36.6 },
  { week: 'Sep 21', margin: 34.0 },
]

type Week = (typeof weeks)[number]

function LastTwelveWeeks({ onSelect }: { onSelect?: ChartProps<Week>['onSelect'] }) {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Last 12 weeks</h2>
        <span className="card-meta">Margin by week</span>
      </header>
      <Chart
        data={weeks}
        title="Margin by week, last 12 weeks"
        description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
        height={260}
        margin={{ top: 24, bottom: 28 }}
        x={{ type: 'band', field: 'week', padding: 0.35 }}
        y={{ field: 'margin', domain: [26, 40] }}
        onSelect={onSelect}
      >
        <Target y={38} label="Target 38%" />
        <Bars
          fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')}
          format="percent"
        />
        <ValueLabel at="last" format={(v) => v.toFixed(1)} />
        <Axis side="bottom" ticks="ends" />
        <Tooltip />
      </Chart>
    </article>
  )
}

function SelectableWeeks() {
  const [selected, setSelected] = useState('none')
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <LastTwelveWeeks onSelect={(_, point) => setSelected((point.datum as Week).week)} />
      <output data-testid="selected">Selected: {selected}</output>
    </div>
  )
}

const meta = {
  title: 'Reference/Last 12 weeks',
  component: LastTwelveWeeks,
} satisfies Meta<typeof LastTwelveWeeks>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
export const Selectable: Story = { render: () => <SelectableWeeks /> }
```

- [ ] **Step 2: Add real-browser select tests**

Append to `apps/storybook/e2e/stories.spec.ts`:

```ts
test('a fast click selects the clicked bar, not the one hovered before', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--selectable')
  const hits = page.locator('[data-ch-part="bar-hit"]')
  await hits.nth(2).hover()
  await hits.nth(7).click()
  await expect(page.getByTestId('selected')).toHaveText('Selected: Aug 24')
})

test.describe('touch', () => {
  test.use({ hasTouch: true })

  test('a tap selects the tapped bar', async ({ page }) => {
    await open(page, 'reference-last-12-weeks--selectable')
    await page.locator('[data-ch-part="bar-hit"]').nth(4).tap()
    await expect(page.getByTestId('selected')).toHaveText('Selected: Aug 3')
  })
})
```

- [ ] **Step 3: Run the new e2e tests against the old code**

Run: `pnpm test:e2e -- -g "fast click|tap"`
Expected: at least one of the two FAILS. The fast click reports `Selected: Jul 20` (the bar hovered before) or the tap reports `Selected: none`. Record which one failed in the report. If both pass, stop and report: the tests don't reproduce the bug, and the rest of this task can't be verified.

- [ ] **Step 4: Replace the old click test with failing tests**

In `packages/tally-charts/src/react/marks/Bars.test.tsx`, delete the test `'selects the hovered bar on click and ignores clicks with nothing active'` and add these in the same `describe`:

```tsx
  it('selects the clicked bar even when another bar was active', () => {
    const onSelect = vi.fn()
    const { container } = renderBars({}, { onSelect })
    fireEvent.pointerEnter(hits(container)[0] as Element)
    fireEvent.click(hits(container)[1] as Element)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]?.[0]).toBe(1)
    expect(onSelect.mock.calls[0]?.[1]).toMatchObject({ id: 1, index: 1 })
  })

  it('selects on a click with nothing active, as a touch tap does', () => {
    const onSelect = vi.fn()
    const { container } = renderBars({}, { onSelect })
    fireEvent.click(hits(container)[0] as Element)
    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ id: 0 }))
  })

  it('ignores clicks on the figure outside the bars', () => {
    const onSelect = vi.fn()
    const { container } = renderBars({}, { onSelect })
    fireEvent.pointerEnter(hits(container)[1] as Element)
    fireEvent.click(container.querySelector('figure') as Element)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('marks hit areas as selectable only when the chart has onSelect', () => {
    const { container, unmount } = renderBars()
    expect(hits(container)[0]).not.toHaveAttribute('data-ch-selectable')
    unmount()
    const selectable = renderBars({}, { onSelect: () => {} })
    expect(hits(selectable.container)[0]).toHaveAttribute('data-ch-selectable', 'true')
  })
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks/Bars.test.tsx`
Expected: FAIL. The first test gets id `0` (the previously active bar) or no call, the second gets no call, and the fourth finds no `data-ch-selectable`.

- [ ] **Step 6: Add `select` and `selectable` to the context**

In `packages/tally-charts/src/react/context.ts`, add to `ChartContextValue` after `unregisterPoints`:

```ts
  /** Calls the chart's `onSelect` with this point; does nothing without `onSelect`. */
  select: (point: ChartPoint) => void
  /** True when the chart has an `onSelect` handler. */
  selectable: boolean
```

- [ ] **Step 7: Move selection out of the figure**

In `packages/tally-charts/src/react/Chart.tsx`:

Delete the `onClick` function:

```tsx
  const onClick = () => {
    const point = interaction.activePoint
    if (onSelect && point) onSelect(point.id, point)
  }
```

and add in its place:

```tsx
  const select = (point: ChartPoint) => {
    if (onSelect) onSelect(point.id, point)
  }
```

In the `ctx` object, add after `unregisterPoints: interaction.unregisterPoints,`:

```tsx
    select,
    selectable: onSelect !== undefined,
```

Delete the figure attribute `onClick={isEmpty ? undefined : onClick}`. Keyboard `Enter`/`Space` selection in `onKeyDown` stays as it is.

- [ ] **Step 8: Select from each bar's hit rect**

In `packages/tally-charts/src/react/marks/Bars.tsx`, change the map callback to take the index, `{layout.bars.map((bar, i) => {`, and add as its first line `const point = points[i]` (points are built from `layout.bars` in the same order). Replace the hit rect with:

```tsx
            <rect
              data-ch-part="bar-hit"
              data-ch-selectable={ctx.selectable ? 'true' : undefined}
              fill="transparent"
              x={vertical ? bar.x : 0}
              y={vertical ? 0 : bar.y}
              width={vertical ? bar.width : ctx.innerWidth}
              height={vertical ? ctx.innerHeight : bar.height}
              onPointerEnter={() => ctx.setActive(bar.id, 'pointer')}
              onClick={point ? () => ctx.select(point) : undefined}
            />
```

- [ ] **Step 9: Let clicks through labels; show a pointer cursor**

In `packages/tally-charts/src/theme/theme.css`, add after the `.ch-svg { … }` rule:

```css
/* Text never takes pointer events, so labels don't block the hit areas under them. */
.ch-svg text {
  pointer-events: none;
}

[data-ch-part="bar-hit"][data-ch-selectable="true"] {
  cursor: pointer;
}
```

- [ ] **Step 10: Run the unit and e2e tests**

Run: `pnpm test`
Expected: PASS (all files). If a `Chart.test.tsx` test relied on the figure `onClick`, rewrite it to click a hit area; keyboard `Enter` tests stay unchanged.

Run: `pnpm test:e2e`
Expected: PASS, 10 tests (8 existing + the 2 new ones). Existing screenshots are unchanged; the Selectable story isn't screenshotted.

- [ ] **Step 11: Commit**

```bash
pnpm format
git add packages/tally-charts/src apps/storybook
git commit -m "fix: select from each bar's hit area instead of the figure

A fast click selected the previously hovered bar and touch taps selected
nothing, because the figure read the active point from the last render.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Interaction store fixes

**Files:**
- Modify: `packages/tally-charts/src/react/interaction.ts`
- Test: `packages/tally-charts/src/react/interaction.test.tsx`
- Test: `packages/tally-charts/src/react/Chart.test.tsx`

**Interfaces:**
- Consumes: `ChartPoint`, `TooltipSegment` (`react/types.ts`).
- Produces: `export function uniquePoints(points: readonly ChartPoint[]): ChartPoint[]` (first point per id wins). `useInteraction().points` is de-duplicated. `samePoints` also compares `index` and `segments`.

Three carry-overs from 0.1:
1. Two marks registering the same ids made arrow keys bounce between duplicates.
2. `samePoints` ignored `segments`, so tooltip text that changed without a position change stayed stale.
3. `setActive` compared against a ref that only updated after render, so two calls in one event both reported.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/interaction.test.tsx`, change the import to `import { navigate, samePoints, uniquePoints, useInteraction } from './interaction'` and append:

```tsx
describe('uniquePoints', () => {
  it('keeps the first point per id, in order', () => {
    const points = [...pts(['a', 'b']), ...pts(['a', 'c'])]
    expect(uniquePoints(points).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('samePoints', () => {
  it('treats points with changed tooltip segments as different', () => {
    const a = pts(['a'])
    const b = pts(['a']).map((p) => ({ ...p, segments: [{ value: 'new' }] }))
    expect(samePoints(a, b)).toBe(false)
    expect(samePoints(b, pts(['a']).map((p) => ({ ...p, segments: [{ value: 'new' }] })))).toBe(
      true,
    )
  })

  it('treats points with a changed index as different', () => {
    const a = pts(['a'])
    expect(samePoints(a, [{ ...(a[0] as ChartPoint), index: 3 }])).toBe(false)
  })
})

describe('useInteraction ordering', () => {
  it('reports one change when the same id is set twice in one event', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    act(() => {
      result.current.setActive('a', 'pointer')
      result.current.setActive('a', 'pointer')
    })
    expect(onActiveChange).toHaveBeenCalledTimes(1)
  })

  it('de-duplicates points across marks', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => {
      result.current.registerPoints('m1', pts(['a', 'b']))
      result.current.registerPoints('m2', pts(['a', 'b']))
    })
    expect(result.current.points.map((p) => p.id)).toEqual(['a', 'b'])
  })
})
```

In `packages/tally-charts/src/react/Chart.test.tsx`, add inside `describe('<Chart>', …)`:

```tsx
  it('navigates past ids registered by two marks', () => {
    const onActiveChange = vi.fn()
    render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={['a', 'b']} />
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    const figure = screen.getByRole('figure')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(onActiveChange.mock.calls.map((call) => call[0])).toEqual(['a', 'b'])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/interaction.test.tsx src/react/Chart.test.tsx`
Expected: FAIL. `uniquePoints` is not exported; segments are ignored; `onActiveChange` is called twice; navigation yields `['a', 'b', 'a']`.

- [ ] **Step 3: Implement**

In `packages/tally-charts/src/react/interaction.ts`:

Change the type import to `import type { ActiveSource, ChartPoint, TooltipSegment } from './types'`.

Add after `navigate`:

```ts
/** The first point per id, in order. Marks layered over the same rows register the same ids. */
export function uniquePoints(points: readonly ChartPoint[]): ChartPoint[] {
  const seen = new Set<Id>()
  const unique: ChartPoint[] = []
  for (const point of points) {
    if (seen.has(point.id)) continue
    seen.add(point.id)
    unique.push(point)
  }
  return unique
}

function sameSegments(a: readonly TooltipSegment[], b: readonly TooltipSegment[]): boolean {
  if (a.length !== b.length) return false
  return a.every((s, i) => {
    const t = b[i]
    return (
      t !== undefined &&
      Object.is(s.value, t.value) &&
      Object.is(s.label, t.label) &&
      s.tone === t.tone
    )
  })
}
```

In `samePoints`, extend the returned condition:

```ts
    return (
      q !== undefined &&
      p.id === q.id &&
      p.index === q.index &&
      p.x === q.x &&
      p.y === q.y &&
      p.label === q.label &&
      p.datum === q.datum &&
      sameSegments(p.segments, q.segments)
    )
```

In `useInteraction`, de-duplicate:

```ts
  const points = useMemo(() => uniquePoints(Object.values(registry).flat()), [registry])
```

and make `setActive` update the ref immediately when uncontrolled:

```ts
  const setActive = useCallback((id: Id | null, nextSource: ActiveSource) => {
    const current = latest.current
    setSource(nextSource)
    if (id === current.activeId) return
    if (!current.controlled) {
      setInnerId(id)
      // The ref otherwise updates after render; a second call in the same event must see this id.
      latest.current = { ...current, activeId: id }
    }
    current.onActiveChange?.(
      id,
      id === null ? null : (current.points.find((p) => p.id === id) ?? null),
    )
  }, [])
```

Segment values are `ReactNode`. Marks build segments inside `useMemo`, so a JSX value only changes identity when the mark's inputs change. Comparing with `Object.is` therefore can't cause a register loop.

- [ ] **Step 4: Run the tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/react
git commit -m "fix: de-duplicate points across marks and compare tooltip segments

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Theme carry-overs: fade direction, radius token, `chartId`, aspect ratio

**Files:**
- Modify: `packages/tally-charts/src/theme/patterns.ts`
- Test: `packages/tally-charts/src/theme/patterns.test.ts`
- Modify: `packages/tally-charts/src/react/PatternDefs.tsx`
- Test: `packages/tally-charts/src/react/PatternDefs.test.tsx`
- Modify: `packages/tally-charts/src/react/context.ts`
- Modify: `packages/tally-charts/src/react/Chart.tsx`
- Test: `packages/tally-charts/src/react/Chart.test.tsx`
- Modify: `packages/tally-charts/src/react/marks/Bars.tsx`
- Test: `packages/tally-charts/src/react/marks/Bars.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Test: `packages/tally-charts/src/ssr.node.test.tsx`
- Regenerate: `packages/tally-charts/src/__snapshots__/last-twelve-weeks.ssr.html`

**Interfaces:**
- Consumes: `BarDirection` from `core/bars.ts` (`'up' | 'down' | 'right' | 'left'`).
- Produces:
  - `fadeMaskId(chartId: string, dir: BarDirection): string`, which returns `` `${chartId}-fade-${dir}` ``.
  - `paintFor(chartId, tone, fill, dir: BarDirection = 'up'): Paint`.
  - `DEFAULT_RADIUS = 3` and `readRadius(style): number`.
  - `ChartContextValue.radius: number`.
  - `ChartProps.chartId?: string`.
  - The type `FadeAxis` is removed.

- [ ] **Step 1: Write the failing tests**

Replace the first and fourth tests in `packages/tally-charts/src/theme/patterns.test.ts`, change the import, and add a radius test:

```ts
import {
  DEFAULT_HATCH,
  DEFAULT_RADIUS,
  fadeMaskId,
  paintFor,
  patternId,
  readHatchGeometry,
  readRadius,
} from './patterns'
```

```ts
  it('builds chart-scoped ids', () => {
    expect(patternId('c1', 'loss')).toBe('c1-hatch-loss')
    expect(fadeMaskId('c1', 'left')).toBe('c1-fade-left')
  })
```

```ts
  it('adds the fade mask that matches the bar direction', () => {
    expect(paintFor('c1', 'accent', 'hatch-fade')).toEqual({
      fill: 'url(#c1-hatch-accent)',
      mask: 'url(#c1-fade-up)',
    })
    expect(paintFor('c1', 'accent', 'hatch-fade', 'down').mask).toBe('url(#c1-fade-down)')
  })

  it('reads the corner radius token and falls back to the default', () => {
    expect(readRadius({ getPropertyValue: () => ' 6px' })).toBe(6)
    expect(readRadius({ getPropertyValue: () => '' })).toBe(DEFAULT_RADIUS)
    expect(readRadius({ getPropertyValue: () => '-2px' })).toBe(DEFAULT_RADIUS)
  })
```

In `packages/tally-charts/src/react/PatternDefs.test.tsx`, retitle the first test to `'defines one hatch pattern per tone and one fade mask per bar direction'` and replace its two `#c1-fade-*` lines with:

```tsx
    for (const dir of ['up', 'down', 'right', 'left']) {
      expect(container.querySelector(`#c1-fade-${dir}`)).not.toBeNull()
    }
    expect(container.querySelectorAll('mask')).toHaveLength(4)
```

and add:

```tsx
  it('fades toward the baseline for each direction', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 45, gap: 6 }} />
      </svg>,
    )
    const gradient = (dir: string) => container.querySelector(`#c1-fade-gradient-${dir}`)
    // Opaque (offset 0) at the bar's outer end.
    expect(gradient('up')).toHaveAttribute('y1', '0')
    expect(gradient('down')).toHaveAttribute('y1', '1')
    expect(gradient('right')).toHaveAttribute('x1', '1')
    expect(gradient('left')).toHaveAttribute('x1', '0')
  })
```

In `packages/tally-charts/src/react/Chart.test.tsx`, add:

```tsx
  it('uses chartId as the pattern id prefix', () => {
    const { container } = render(<Chart width={100} chartId="revenue" />)
    expect(container.querySelector('#ch-revenue-hatch-accent')).not.toBeNull()
  })

  it('exposes the default corner radius through context', () => {
    let ctx: ChartContextValue | undefined
    render(
      <Chart width={100}>
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    expect(ctx?.radius).toBe(3)
  })
```

In `packages/tally-charts/src/react/marks/Bars.test.tsx`, add:

```tsx
  it('fades negative bars toward their baseline', () => {
    const { container } = renderBars(
      { fill: 'hatch-fade' },
      { data: [{ week: 'W1', margin: -10 }], y: { field: 'margin', domain: [-20, 20] } },
    )
    const style = (bars(container)[0] as SVGElement).getAttribute('style') ?? ''
    expect(style).toMatch(/fade-down/)
  })

  it('uses the chart radius unless radius is set', () => {
    const { container, unmount } = renderBars()
    expect(bars(container)[0]).toHaveAttribute('rx', '3')
    unmount()
    const square = renderBars({ radius: 0 })
    expect(bars(square.container)[0]).toHaveAttribute('rx', '0')
  })
```

In `packages/tally-charts/src/ssr.node.test.tsx`, add `import { Chart } from './react/Chart'` and append inside the `describe`:

```tsx
  it('reserves the height with CSS aspect-ratio while measuring', () => {
    const html = renderToString(<Chart aspectRatio={2}>{null}</Chart>)
    const figure = html.match(/<figure[^>]*>/)?.[0] ?? ''
    expect(figure).toContain('aspect-ratio:2')
    expect(figure).not.toContain('height:')
  })

  it('keeps a fixed height for a fixed width', () => {
    const html = renderToString(<Chart width={400} aspectRatio={2}>{null}</Chart>)
    expect(html.match(/<figure[^>]*>/)?.[0]).toContain('height:200px')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/theme src/react src/ssr.node.test.tsx`
Expected: FAIL. The failures are the old mask ids, missing `readRadius`, unknown `chartId`, `radius` undefined, `aspect-ratio` absent, and the `fade-down` mismatch.

- [ ] **Step 3: Implement patterns**

Replace `packages/tally-charts/src/theme/patterns.ts` with:

```ts
import type { BarDirection } from '../core/bars'
import type { Fill, Tone } from '../core/types'

export interface HatchGeometry {
  /** Stripe direction in degrees from horizontal. */
  angle: number
  /** Distance between stripes in px. */
  gap: number
}

export const DEFAULT_HATCH: HatchGeometry = { angle: 45, gap: 6 }

/** Bar corner radius in px when `--ch-radius` can't be read (server rendering). */
export const DEFAULT_RADIUS = 3

export const patternId = (chartId: string, tone: Tone) => `${chartId}-hatch-${tone}`

/** One mask per bar direction: opaque at the bar's outer end, faded toward its baseline. */
export const fadeMaskId = (chartId: string, dir: BarDirection) => `${chartId}-fade-${dir}`

export interface Paint {
  fill: string
  mask?: string
}

export function paintFor(
  chartId: string,
  tone: Tone,
  fill: Fill,
  dir: BarDirection = 'up',
): Paint {
  if (fill === 'solid') return { fill: `var(--ch-${tone})` }
  const pattern = `url(#${patternId(chartId, tone)})`
  if (fill === 'hatch') return { fill: pattern }
  return { fill: pattern, mask: `url(#${fadeMaskId(chartId, dir)})` }
}

export function readHatchGeometry(
  style: Pick<CSSStyleDeclaration, 'getPropertyValue'>,
): HatchGeometry {
  const angle = Number.parseFloat(style.getPropertyValue('--ch-hatch-angle'))
  const gap = Number.parseFloat(style.getPropertyValue('--ch-hatch-gap'))
  return {
    angle: Number.isFinite(angle) ? angle : DEFAULT_HATCH.angle,
    gap: Number.isFinite(gap) && gap > 0 ? gap : DEFAULT_HATCH.gap,
  }
}

export function readRadius(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): number {
  const radius = Number.parseFloat(style.getPropertyValue('--ch-radius'))
  return Number.isFinite(radius) && radius >= 0 ? radius : DEFAULT_RADIUS
}
```

`core/bars.ts` imports nothing from `theme`, so this adds no import cycle.

- [ ] **Step 4: Implement the four fade masks**

In `packages/tally-charts/src/react/PatternDefs.tsx`, change the import to `import { type HatchGeometry, fadeMaskId, patternId } from '../theme/patterns'`, add `import type { BarDirection } from '../core/bars'`, and add above the component:

```tsx
/** Gradient end points per direction: offset 0 (opaque) sits at the bar's outer end. */
const FADES: { dir: BarDirection; x1: number; y1: number; x2: number; y2: number }[] = [
  { dir: 'up', x1: 0, y1: 0, x2: 0, y2: 1 },
  { dir: 'down', x1: 0, y1: 1, x2: 0, y2: 0 },
  { dir: 'right', x1: 1, y1: 0, x2: 0, y2: 0 },
  { dir: 'left', x1: 0, y1: 0, x2: 1, y2: 0 },
]
```

Replace the two `linearGradient` elements and two `mask` elements with:

```tsx
      {FADES.map(({ dir, ...ends }) => (
        <linearGradient key={`g-${dir}`} id={`${chartId}-fade-gradient-${dir}`} {...ends}>
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.3} />
        </linearGradient>
      ))}
      {FADES.map(({ dir }) => (
        <mask key={`m-${dir}`} id={fadeMaskId(chartId, dir)} maskContentUnits="objectBoundingBox">
          <rect width={1} height={1} fill={`url(#${chartId}-fade-gradient-${dir})`} />
        </mask>
      ))}
```

Update the component's doc comment: "…and four fade masks, one per bar direction."

- [ ] **Step 5: Implement `chartId`, radius and aspect ratio in `<Chart>`**

In `packages/tally-charts/src/react/context.ts`, add to `ChartContextValue` after `dimInactive`:

```ts
  /** Default bar corner radius in px, from `--ch-radius`. */
  radius: number
```

In `packages/tally-charts/src/react/Chart.tsx`:

- Import `DEFAULT_RADIUS` and `readRadius` from `../theme/patterns` next to the existing imports.
- Add to `ChartProps` after `style`:

```ts
  /**
   * Prefix for pattern and mask ids. React's `useId` is only unique within one root, so set this
   * when charts render in several React roots on one page.
   */
  chartId?: string
```

- Destructure `chartId: chartIdProp,` and replace the `chartId` line with:

```tsx
  const reactId = useId()
  const chartId = `ch-${(chartIdProp ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
```

- Add `const [radius, setRadius] = useState(DEFAULT_RADIUS)` next to the `hatch` state. Rewrite the layout effect body to read computed style once:

```tsx
  useIsoLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const computed = getComputedStyle(el)
    const next = readHatchGeometry(computed)
    setHatch((prev) => (prev.angle === next.angle && prev.gap === next.gap ? prev : next))
    setRadius(readRadius(computed))
  }, [])
```

- Add `radius,` to `ctx` after `dimInactive,`.
- Reserve the height with CSS while measuring, so a server-rendered `aspectRatio` chart doesn't shift the page when the real width arrives. Add before `return`:

```tsx
  // While measuring, CSS keeps the box at the right height before the real width is known.
  const sizeStyle: CSSProperties =
    height === undefined && aspectRatio && width === undefined
      ? { aspectRatio: String(aspectRatio) }
      : { height: h }
```

and change the figure's style to `style={{ ...sizeStyle, ...style }}`.

- [ ] **Step 6: Use direction and radius in `<Bars>`**

In `packages/tally-charts/src/react/marks/Bars.tsx`:

- Change the radius line to `const radius = props.radius ?? ctx.radius`.
- Update the prop doc to `/** Corner radius in px. Default: the \`--ch-radius\` token (3px). */`.
- Change the paint line to `const paint = paintFor(ctx.chartId, tone, fill, bar.dir)`.

In `packages/tally-charts/src/theme/theme.css`, change `--ch-radius: 4px;` to `--ch-radius: 3px;`.

- [ ] **Step 7: Regenerate the SSR snapshot and run everything**

Mask ids changed (`-fade-y` → `-fade-up`, etc.), so the committed server-render snapshot must be rewritten:

Run: `pnpm --filter tally-charts exec vitest run src/ssr.node.test.tsx -u`, then `pnpm test`
Expected: PASS. `git diff --stat` shows `last-twelve-weeks.ssr.html` changed; its diff only touches gradient and mask elements and `mask:url(#…-fade-up)` in bar styles. If it shows any other change, stop and report it.

Run: `pnpm test:e2e`
Expected: PASS with no screenshot diffs: positive vertical bars use the same gradient as before, and the radius is still 3px.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "fix: fade masks per bar direction, --ch-radius, chartId and aspect-ratio sizing

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Strip development warnings from production bundles

**Files:**
- Modify: `packages/tally-charts/src/core/warn.ts`
- Modify: `packages/tally-charts/src/core/scale.ts`, `src/core/bars.ts`, `src/core/accessor.ts`
- Modify: `packages/tally-charts/src/react/marks/Target.tsx`, `src/react/marks/Bars.tsx`
- Create: `packages/tally-charts/scripts/check-dev-strip.mjs`
- Modify: `packages/tally-charts/package.json`
- Test: `packages/tally-charts/src/core/warn.test.ts`

**Interfaces:**
- Produces: `export const DEV: boolean` in `core/warn.ts`. `isDev` stays exported as an alias. From now on every `warn(...)` call is wrapped in `if (DEV) { … }`.

**Why this exact expression:** bundlers replace `process.env.NODE_ENV` with `"production"`. For `(typeof process !== 'undefined' ? process.env.NODE_ENV : 'production') !== 'production'`, esbuild and rolldown (Vite 8) then fold the whole expression to `false` and drop `if (DEV)` blocks with their strings. Both were verified while writing this plan. The 0.1 `try { … } catch` form can't be folded. Without any `process` (plain browser ESM) the expression is `false`, as before.

- [ ] **Step 1: Write the failing test**

In `packages/tally-charts/src/core/warn.test.ts`, change the import to `import { createWarner, DEV, isDev } from './warn'` and add:

```ts
  it('exposes DEV as a plain boolean that matches isDev', () => {
    expect(DEV).toBe(true)
    expect(isDev).toBe(DEV)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter tally-charts exec vitest run src/core/warn.test.ts`
Expected: FAIL, `DEV` is not exported.

- [ ] **Step 3: Implement `DEV`**

Replace `packages/tally-charts/src/core/warn.ts` with:

```ts
// Module-scoped so it never conflicts with @types/node; bundlers replace `process.env.NODE_ENV`.
declare const process: { env: { NODE_ENV?: string } }

export type Warn = (key: string, message: string) => void

/**
 * True outside production builds. A bundler that replaces `process.env.NODE_ENV` folds this to a
 * constant and drops every `if (DEV)` block together with its message strings. Without `process`
 * (plain browser ESM) it is false.
 */
export const DEV: boolean =
  (typeof process !== 'undefined' ? process.env.NODE_ENV : 'production') !== 'production'

/** Alias of `DEV`, kept for the 0.1 public API. */
export const isDev = DEV

export function createWarner(): Warn {
  const seen = new Set<string>()
  return (key, message) => {
    if (!DEV || seen.has(key)) return
    seen.add(key)
    console.warn(`[tally-charts] ${message}`)
  }
}
```

- [ ] **Step 4: Guard every call site**

Wrap each `warn(...)` call in `if (DEV) { … }` and add `DEV` to the file's import from `./warn` (core) or `../../core/warn` (react). The call sites are:
- `src/core/scale.ts`: the band-domain warning becomes `if (DEV && domain.length === 0) { warn(…) }`; the linear-domain warning in the final `else` becomes `if (DEV) warn(…)`.
- `src/core/bars.ts`: `if (DEV) input.warn('bars-scales', …)`; inside `if (!Number.isFinite(value)) {`, use `if (DEV) input.warn('bars-value', …)` and keep `continue` outside the guard.
- `src/core/accessor.ts`: `if (DEV) warn('duplicate-id', …)`, keeping `return byIndex()` outside the guard.
- `src/react/marks/Target.tsx`: three calls. Keep each `return null` outside the guard, for example:

```tsx
  if (value === undefined) {
    if (DEV) ctx.warn('target-value', 'Target needs an `x` or `y` value.')
    return null
  }
```

- `src/react/marks/Bars.tsx`: `if (DEV && (!getX || !getY)) { ctx.warn(…) }`.

`import type { Warn }` lines become `import { DEV, type Warn } from './warn'` where both are needed.

Then confirm nothing was missed:

Run: `grep -rn "warn(" packages/tally-charts/src --include=*.ts --include=*.tsx | grep -v "\.test\." | grep -v "if (DEV"`
Expected: only `core/warn.ts` (the `console.warn` line). A multi-line `warn(` call whose `if (DEV` sits on the line above also shows up; check each such hit by eye.

- [ ] **Step 5: Add the production-strip check**

Add `"esbuild": "0.28.2"` to `devDependencies` in `packages/tally-charts/package.json` and add the script `"check:dev-strip": "node scripts/check-dev-strip.mjs"`. Run `pnpm install`.

Create `packages/tally-charts/scripts/check-dev-strip.mjs`:

```js
// Bundles the built main entry the way an app's production build would and fails if any
// development warning text survives. Run after `pnpm build`.
import { build } from 'esbuild'

const result = await build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  packages: 'external',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
})

const code = result.outputFiles[0].text
// One phrase from each warning site.
const phrases = [
  'skipped a missing',
  'need one band scale',
  'has no domain',
  'Missing or duplicate id',
  'outside the chart domain',
  'needs a linear scale',
  'Bars need x and y fields',
]
const leaks = phrases.filter((phrase) => code.includes(phrase))
if (leaks.length > 0) {
  console.error('Development warnings survived a production build:', leaks)
  process.exit(1)
}
console.log(`ok: development warnings are stripped (${code.length} bytes)`)
```

`pnpm-workspace.yaml` sets `allowBuilds: esbuild: false`. The esbuild binary comes from its platform optional dependency, so the script works without the install script.

- [ ] **Step 6: Run the checks and prove the check bites**

Run: `pnpm test && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: PASS, and the script prints `ok: development warnings are stripped`.

Temporarily remove `if (DEV)` from the `target-domain` warning in `Target.tsx`, then run `pnpm build && pnpm --filter tally-charts check:dev-strip`. Expected: exit code 1, listing `outside the chart domain`. Restore the guard, rebuild, and re-run until it prints `ok`.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts pnpm-lock.yaml
git commit -m "feat: drop development warning strings from production bundles

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 5: Core: label truncation and bar layout options

**Files:**
- Create: `packages/tally-charts/src/core/text.ts`
- Test: `packages/tally-charts/src/core/text.test.ts`
- Modify: `packages/tally-charts/src/core/bars.ts`
- Test: `packages/tally-charts/src/core/bars.test.ts`

**Interfaces:**
- Consumes: `ResolvedScale`, `LinearScale`, `FieldGetter`, `DEV`/`Warn` (Task 4).
- Produces:
  - `truncateLabel(text: string, maxWidth: number, charWidth?: number): string`, with a default `charWidth` of 7.
  - `type BarAlign = 'start' | 'center' | 'end'`.
  - New optional `BarLayoutInput` fields: `getFrom?: FieldGetter`, `size?: number`, `align?: BarAlign` and `offset?: number`.
  - New `BarRect` field: `band: { start: number; size: number }`.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/core/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { truncateLabel } from './text'

describe('truncateLabel', () => {
  it('keeps text that fits', () => {
    expect(truncateLabel('Labor', 70)).toBe('Labor')
  })

  it('cuts long text to the width and ends it with an ellipsis', () => {
    // 70px / 7px per character = 10 characters including the ellipsis.
    expect(truncateLabel('Materials and supplies', 70)).toBe('Materials…')
  })

  it('drops trailing spaces before the ellipsis', () => {
    expect(truncateLabel('Labor and parts', 49)).toBe('Labor…')
  })

  it('returns an ellipsis or nothing when there is almost no room', () => {
    expect(truncateLabel('Labor', 10)).toBe('…')
    expect(truncateLabel('Labor', 0)).toBe('')
    expect(truncateLabel('Labor', Number.NaN)).toBe('')
  })
})
```

Append to `packages/tally-charts/src/core/bars.test.ts`:

```ts
describe('computeBars options', () => {
  type Span = { k: string; v: number | null; f?: number | null }
  const getSpanK = (d: unknown) => (d as Span).k
  const getSpanV = (d: unknown) => (d as Span).v
  const getSpanF = (d: unknown) => (d as Span).f

  function spans(
    rows: Span[],
    options: Partial<Parameters<typeof computeBars>[0]> = {},
    horizontal = false,
  ) {
    const band = createScale<Span>(
      { type: 'band', field: 'k', padding: 0 },
      rows,
      horizontal ? 'y' : 'x',
      200,
      noop,
    )
    const linear = createScale<Span>({ domain: [0, 20] }, rows, horizontal ? 'x' : 'y', 100, noop)
    return computeBars({
      data: rows,
      ids: rows.map((_, i) => i),
      x: horizontal ? linear : band,
      y: horizontal ? band : linear,
      getX: horizontal ? getSpanV : getSpanK,
      getY: horizontal ? getSpanK : getSpanV,
      warn: noop,
      ...options,
    }).bars
  }

  const two: Span[] = [
    { k: 'a', v: 15, f: 10 },
    { k: 'b', v: 5, f: 10 },
  ]

  it('runs bars from a start value instead of the baseline', () => {
    const [up, down] = spans(two, { getFrom: getSpanF })
    // y range is [100, 0]: 10 → 50, 15 → 25, 5 → 75.
    expect(up).toMatchObject({ y: 25, height: 25, dir: 'up', anchor: { y: 25 } })
    expect(down).toMatchObject({ y: 50, height: 25, dir: 'down', anchor: { y: 75 } })
  })

  it('falls back to the baseline when the start value is missing', () => {
    const [bar] = spans([{ k: 'a', v: 10, f: null }], { getFrom: getSpanF })
    expect(bar).toMatchObject({ y: 50, height: 50, dir: 'up' })
  })

  it('sizes, aligns and offsets a bar inside its band', () => {
    expect(spans(two, { size: 20 })[0]).toMatchObject({ x: 40, width: 20 })
    expect(spans(two, { size: 20, align: 'start' })[0]).toMatchObject({ x: 0 })
    expect(spans(two, { size: 20, align: 'end' })[0]).toMatchObject({ x: 80 })
    expect(spans(two, { size: 20, offset: 5 })[0]).toMatchObject({ x: 45, anchor: { x: 55 } })
  })

  it('never makes a bar thicker than its band and ignores a non-finite size', () => {
    expect(spans(two, { size: 500 })[0]).toMatchObject({ x: 0, width: 100 })
    expect(spans(two, { size: Number.NaN })[0]).toMatchObject({ x: 0, width: 100 })
  })

  it('reports the whole band for hit areas', () => {
    expect(spans(two, { size: 20 })[1]?.band).toEqual({ start: 100, size: 100 })
  })

  it('applies the options to horizontal bars', () => {
    const [bar] = spans([{ k: 'a', v: 10, f: 5 }], { getFrom: getSpanF, size: 10 }, true)
    // x range is [0, 100]: 5 → 25, 10 → 50; band 'a' is [0, 200) on y.
    expect(bar).toMatchObject({ x: 25, width: 25, y: 95, height: 10, dir: 'right' })
    expect(bar?.band).toEqual({ start: 0, size: 200 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/text.test.ts src/core/bars.test.ts`
Expected: FAIL. `./text` doesn't exist, and the new options are ignored (`band` is undefined).

- [ ] **Step 3: Implement `truncateLabel`**

Create `packages/tally-charts/src/core/text.ts`:

```ts
/** Rough average glyph width of 13–15px UI text in px; good enough to decide where to cut. */
export const CHAR_WIDTH = 7

/** Cuts `text` to fit `maxWidth` px, ending with an ellipsis. Never throws on bad widths. */
export function truncateLabel(text: string, maxWidth: number, charWidth = CHAR_WIDTH): string {
  if (!(maxWidth > 0) || !(charWidth > 0)) return ''
  const max = Math.floor(maxWidth / charWidth)
  if (text.length <= max) return text
  if (max <= 1) return '…'
  return `${text.slice(0, max - 1).trimEnd()}…`
}
```

- [ ] **Step 4: Implement the layout options**

Replace `packages/tally-charts/src/core/bars.ts` with:

```ts
import type { ScaleBand } from 'd3-scale'
import type { FieldGetter } from './accessor'
import type { LinearScale } from './linear'
import type { ResolvedScale } from './scale'
import type { Id } from './types'
import { DEV, type Warn } from './warn'

export type BarOrientation = 'vertical' | 'horizontal'
export type BarDirection = 'up' | 'down' | 'right' | 'left'
export type BarAlign = 'start' | 'center' | 'end'

export interface BarRect {
  id: Id
  index: number
  datum: unknown
  category: string
  value: number
  x: number
  y: number
  width: number
  height: number
  dir: BarDirection
  /** Centre of the bar's outer end; tooltips and value labels attach here. */
  anchor: { x: number; y: number }
  /** The whole band the bar sits in, along the band axis. Hit areas use it. */
  band: { start: number; size: number }
}

export interface BarLayout {
  orientation: BarOrientation
  bars: BarRect[]
}

export interface BarLayoutInput {
  data: readonly unknown[]
  ids: readonly Id[]
  x: ResolvedScale
  y: ResolvedScale
  getX: FieldGetter
  getY: FieldGetter
  warn: Warn
  /** Names the value field in the missing-value warning. Defaults to the value axis letter. */
  valueField?: string
  /** Start value per row. Bars run from it to the value instead of from the zero baseline. */
  getFrom?: FieldGetter
  /** Bar thickness in px. Defaults to the band width and never exceeds it. */
  size?: number
  /** Where a bar thinner than its band sits. Default 'center'. */
  align?: BarAlign
  /** Extra shift along the band axis in px, applied after `align`. */
  offset?: number
}

export function computeBars(input: BarLayoutInput): BarLayout {
  const { x, y } = input
  if (x.kind === 'band' && y.kind === 'linear') {
    return layoutBars(input, x.scale, y.scale, input.getX, input.getY, 'vertical')
  }
  if (y.kind === 'band' && x.kind === 'linear') {
    return layoutBars(input, y.scale, x.scale, input.getY, input.getX, 'horizontal')
  }
  if (DEV) input.warn('bars-scales', 'Bars need one band scale and one linear scale on <Chart>.')
  return { orientation: 'vertical', bars: [] }
}

function toNumber(raw: unknown): number {
  return raw === null || raw === undefined ? Number.NaN : Number(raw)
}

function layoutBars(
  input: BarLayoutInput,
  band: ScaleBand<string>,
  linear: LinearScale,
  getCategory: FieldGetter,
  getValue: FieldGetter,
  orientation: BarOrientation,
): BarLayout {
  const [d0, d1] = linear.domain()
  const [r0, r1] = linear.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  // Keep geometry inside the plot when a value falls outside an explicit domain.
  const clamp = (px: number) => Math.min(hi, Math.max(lo, px))
  const zero = linear(Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1)))
  const bandSize = band.bandwidth()
  const requested =
    input.size !== undefined && Number.isFinite(input.size) ? input.size : bandSize
  const thickness = Math.max(0, Math.min(requested, bandSize))
  const slack = bandSize - thickness
  const aligned = input.align === 'start' ? 0 : input.align === 'end' ? slack : slack / 2
  const shift = aligned + (input.offset ?? 0)
  const bars: BarRect[] = []
  const valueField = input.valueField ?? (orientation === 'vertical' ? 'y' : 'x')

  for (const [index, datum] of input.data.entries()) {
    const category = String(getCategory(datum, index))
    const bandStart = band(category)
    if (bandStart === undefined) continue
    const value = toNumber(getValue(datum, index))
    if (!Number.isFinite(value)) {
      if (DEV) {
        input.warn(
          'bars-value',
          `Bars skipped a missing or non-numeric value for field "${valueField}" at index ${index}.`,
        )
      }
      continue
    }
    const from = input.getFrom ? toNumber(input.getFrom(datum, index)) : Number.NaN
    const hasFrom = Number.isFinite(from)
    const base = hasFrom ? clamp(linear(from)) : zero
    const end = clamp(linear(value))
    const near = Math.min(base, end)
    const length = Math.abs(end - base)
    const start = bandStart + shift
    const id = input.ids[index] ?? index
    // Direction follows the drawn geometry; a zero-length bar falls back to the value's side
    // of its start value (or of zero).
    const towardStart = orientation === 'vertical' ? end < base : end > base
    const towardEnd = orientation === 'vertical' ? end > base : end < base
    const negative = towardEnd || (!towardStart && value < (hasFrom ? from : 0))
    const bandInfo = { start: bandStart, size: bandSize }
    if (orientation === 'vertical') {
      bars.push({
        id,
        index,
        datum,
        category,
        value,
        x: start,
        y: near,
        width: thickness,
        height: length,
        dir: negative ? 'down' : 'up',
        anchor: { x: start + thickness / 2, y: negative ? near + length : near },
        band: bandInfo,
      })
    } else {
      bars.push({
        id,
        index,
        datum,
        category,
        value,
        x: near,
        y: start,
        width: length,
        height: thickness,
        dir: negative ? 'left' : 'right',
        anchor: { x: negative ? near : near + length, y: start + thickness / 2 },
        band: bandInfo,
      })
    }
  }

  return { orientation, bars }
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test`
Expected: PASS. Existing `bars.test.ts` cases use `toMatchObject`, so the extra `band` field doesn't break them.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src/core
git commit -m "feat(core): bar start values, thickness, alignment and label truncation

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `<Bars>` layers, tracks and `ValueLabel` fixes

**Files:**
- Modify: `packages/tally-charts/src/react/marks/Bars.tsx`
- Test: `packages/tally-charts/src/react/marks/Bars.test.tsx`
- Modify: `packages/tally-charts/src/react/marks/ValueLabel.tsx`
- Test: `packages/tally-charts/src/react/marks/ValueLabel.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes:
  - from Task 5: the `computeBars` options and `BarRect.band`
  - from Task 3: `ctx.radius` and `paintFor(…, dir)`
  - from Task 1: `ctx.select` and `ctx.selectable`
- Produces:
  - New `BarsProps<D>` fields:
    - `from?: Accessor<D, number>`
    - `size?: number`
    - `align?: BarAlign`
    - `offset?: number`
    - `interactive?: boolean` (default `true`)
    - `track?: boolean` (default `false`)
    - `ariaLabel?: (d: D, i: number) => string`
  - New part `data-ch-part="bar-track"`.
  - Hit rects span the band plus the chart margins on the other axis, so a click on a row's label selects the row.
  - `ValueLabelProps<D>.data?: readonly D[]`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('<Bars>', …)` in `packages/tally-charts/src/react/marks/Bars.test.tsx`:

```tsx
  it('draws thinner bars inside the band', () => {
    const { container } = renderBars({ size: 20 })
    expect(bars(container)[0]).toHaveAttribute('x', '40')
    expect(bars(container)[0]).toHaveAttribute('width', '20')
  })

  it('runs a bar from a start value', () => {
    const { container } = renderBars({ from: () => 5 })
    // y domain [0, 20] over 120px: 5 → 90, 10 → 60.
    expect(bars(container)[0]).toHaveAttribute('y', '60')
    expect(bars(container)[0]).toHaveAttribute('height', '30')
  })

  it('draws a track behind each bar across the value range', () => {
    const { container } = renderBars({ track: true })
    const tracks = [...container.querySelectorAll('[data-ch-part="bar-track"]')]
    expect(tracks).toHaveLength(2)
    expect(tracks[0]).toHaveAttribute('y', '0')
    expect(tracks[0]).toHaveAttribute('height', '120')
  })

  it('registers nothing and draws no hit areas when not interactive', () => {
    const onActiveChange = vi.fn()
    const { container } = renderBars({ interactive: false }, { onActiveChange })
    expect(hits(container)).toHaveLength(0)
    fireEvent.keyDown(container.querySelector('figure') as Element, { key: 'ArrowRight' })
    expect(onActiveChange).not.toHaveBeenCalled()
  })

  it('announces ariaLabel text', () => {
    const { container } = renderBars({ ariaLabel: (d) => `Week ${d.week}` })
    fireEvent.keyDown(container.querySelector('figure') as Element, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Week W1')
  })

  it('stretches hit areas over the chart margins', () => {
    const { container } = renderBars({}, { margin: { top: 10, right: 0, bottom: 20, left: 0 } })
    expect(hits(container)[0]).toHaveAttribute('y', '-10')
    expect(hits(container)[0]).toHaveAttribute('height', '120')
  })
```

Append inside `describe('<ValueLabel>', …)` in `packages/tally-charts/src/react/marks/ValueLabel.test.tsx`:

```tsx
  it('labels its own data', () => {
    const { container } = render(
      <Chart
        data={weeks}
        width={200}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [0, 20] }}
      >
        <ValueLabel data={[{ week: 'W2', margin: 5 }]} format={(v) => v.toFixed(1)} />
      </Chart>,
    )
    expect(texts(container)).toEqual(['5.0'])
  })

  it('keeps the label of a value below the domain inside the plot', () => {
    const { container } = render(
      <Chart
        data={[{ week: 'W1', margin: -5 }]}
        width={200}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [10, 40] }}
      >
        <ValueLabel />
      </Chart>,
    )
    const label = container.querySelector('[data-ch-part="value-label"]')
    expect(label).toHaveAttribute('y', '114')
    expect(label).toHaveAttribute('dominant-baseline', 'auto')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks`
Expected: FAIL. The new props are ignored, there is no track, a non-interactive layer still registers, `ValueLabel` has no `data`, and the out-of-domain label sits at `y=126` with `hanging`.

- [ ] **Step 3: Implement `<Bars>`**

Replace `packages/tally-charts/src/react/marks/Bars.tsx` with:

```tsx
import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from '../../core/accessor'
import { type BarAlign, computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { useChart } from '../context'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'

export interface BarsProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number>
  /** Defaults to the field on <Chart y>. */
  y?: Accessor<D, string | number>
  id?: Accessor<D, Id>
  tone?: PerItem<D, Tone>
  fill?: PerItem<D, Fill>
  /** Corner radius in px. Default: the `--ch-radius` token (3px). */
  radius?: number
  /** Value format for tooltips and announcements. Default 'number'. */
  format?: FormatSpec
  /** Category label for tooltips and announcements. Defaults to the category value. */
  label?: Accessor<D, string>
  tooltip?: (d: D, i: number) => TooltipSegment[]
  /** Screen-reader text per bar. Default "<label>, <formatted value>". */
  ariaLabel?: (d: D, i: number) => string
  /** Start value per row; the bar runs from it to the value. Default: the zero baseline. */
  from?: Accessor<D, number>
  /** Bar thickness in px. Default: the band width. */
  size?: number
  /** Where a bar thinner than its band sits. Default 'center'. */
  align?: BarAlign
  /** Extra shift along the band axis in px, after `align`. */
  offset?: number
  /** Register points and hit areas for hover, keyboard and select. Set false on decorative layers. Default true. */
  interactive?: boolean
  /** Draw a faint track behind each bar across the whole value range. Default false. */
  track?: boolean
}

const NO_POINTS: ChartPoint[] = []

export function Bars<D>(props: BarsProps<D>) {
  const ctx = useChart('Bars')
  const data = (props.data ?? ctx.data) as readonly D[]
  const getX = useMemo(() => toFieldGetter(props.x) ?? ctx.x.field, [props.x, ctx.x.field])
  const getY = useMemo(() => toFieldGetter(props.y) ?? ctx.y.field, [props.y, ctx.y.field])
  if (DEV && (!getX || !getY)) {
    ctx.warn(
      'bars-fields',
      'Bars need x and y fields: pass them to <Bars> or set `field` on <Chart x/y>.',
    )
  }
  const { x: scaleX, y: scaleY, warn, format: createFormat } = ctx
  const { from, size, align, offset, interactive = true } = props
  const ids = useMemo(() => resolveIds(data, props.id, warn), [data, props.id, warn])
  const valueAccessor = scaleY.kind === 'band' ? props.x : props.y
  const valueField = typeof valueAccessor === 'string' ? valueAccessor : undefined
  const getFrom = useMemo(() => toFieldGetter(from), [from])
  const layout = useMemo(
    () =>
      getX && getY
        ? computeBars({
            data,
            ids,
            x: scaleX,
            y: scaleY,
            getX,
            getY,
            warn,
            valueField,
            getFrom,
            size,
            align,
            offset,
          })
        : { orientation: 'vertical' as const, bars: [] },
    [data, ids, scaleX, scaleY, getX, getY, warn, valueField, getFrom, size, align, offset],
  )

  const format = useMemo(() => createFormat(props.format), [createFormat, props.format])
  const { label, tooltip, ariaLabel } = props
  const points: ChartPoint[] = useMemo(() => {
    const getLabel = label ? resolveAccessor(label) : undefined
    return layout.bars.map((bar) => {
      const datum = bar.datum as D
      const name = getLabel ? getLabel(datum, bar.index) : bar.category
      return {
        id: bar.id,
        index: bar.index,
        datum: bar.datum,
        x: bar.anchor.x,
        y: bar.anchor.y,
        label: ariaLabel ? ariaLabel(datum, bar.index) : `${name}, ${format(bar.value)}`,
        segments: tooltip
          ? tooltip(datum, bar.index)
          : [{ value: name }, { value: format(bar.value) }],
      }
    })
  }, [layout, label, tooltip, ariaLabel, format])
  useRegisterPoints(ctx, interactive ? points : NO_POINTS)

  const toneOf = resolvePerItem<D, Tone>(props.tone ?? 'accent')
  const fillOf = resolvePerItem<D, Fill>(props.fill ?? 'solid')
  const vertical = layout.orientation === 'vertical'
  const radius = props.radius ?? ctx.radius
  const corner = (w: number, h: number) => Math.max(0, Math.min(radius, w / 2, h / 2))
  const dimming = ctx.dimInactive && ctx.activeId !== null

  return (
    <g data-ch-part="bars">
      {layout.bars.map((bar, i) => {
        const point = points[i]
        const datum = bar.datum as D
        const tone = toneOf(datum, bar.index, data)
        const fill = fillOf(datum, bar.index, data)
        const paint = paintFor(ctx.chartId, tone, fill, bar.dir)
        const active = bar.id === ctx.activeId
        // Geometry is also set as CSS so browsers that support it can transition x/y/width/height.
        const style = {
          x: bar.x,
          y: bar.y,
          width: bar.width,
          height: bar.height,
          fill: paint.fill,
          mask: paint.mask,
        } as CSSProperties
        const track = vertical
          ? { x: bar.x, y: 0, width: bar.width, height: ctx.innerHeight }
          : { x: 0, y: bar.y, width: ctx.innerWidth, height: bar.height }
        // Hit areas cover the whole band and reach into the margins, so labels select too.
        const hit = vertical
          ? { x: bar.band.start, y: -ctx.margin.top, width: bar.band.size, height: ctx.height }
          : { x: -ctx.margin.left, y: bar.band.start, width: ctx.width, height: bar.band.size }
        return (
          <g key={String(bar.id)}>
            {props.track ? (
              <rect
                data-ch-part="bar-track"
                {...track}
                rx={corner(track.width, track.height)}
              />
            ) : null}
            <rect
              data-ch-part="bar"
              data-ch-tone={tone}
              data-ch-fill={fill}
              data-ch-dir={bar.dir}
              data-ch-active={active ? 'true' : undefined}
              data-ch-dimmed={dimming && !active ? 'true' : undefined}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={corner(bar.width, bar.height)}
              style={style}
            />
            {interactive ? (
              <rect
                data-ch-part="bar-hit"
                data-ch-selectable={ctx.selectable ? 'true' : undefined}
                fill="transparent"
                {...hit}
                onPointerEnter={() => ctx.setActive(bar.id, 'pointer')}
                onClick={point ? () => ctx.select(point) : undefined}
              />
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
```

Dimming compares bar ids with the active id. Layers that share row ids (a plan bar under an actual bar) stay lit together.

- [ ] **Step 4: Implement `ValueLabel` changes**

In `packages/tally-charts/src/react/marks/ValueLabel.tsx`:

- Add to `ValueLabelProps<D>` as its first field:

```ts
  /** Defaults to <Chart data>. */
  data?: readonly D[]
```

- Change the signature to `export function ValueLabel<D>({ data, at = 'all', x, y, format, offset = 6 }: ValueLabelProps<D>)` and pass `data: data ?? ctx.data` to `computeBars`.
- Add `const LABEL_HEIGHT = 14` above the component. Replace the body of the `selected.map` callback with:

```tsx
      {selected.map((bar) => {
        if (orientation === 'vertical') {
          // Outward from the bar end, unless that would push the label out of the plot.
          const below = bar.dir === 'down' && bar.anchor.y + offset + LABEL_HEIGHT <= ctx.innerHeight
          return (
            <text
              key={bar.index}
              data-ch-part="value-label"
              x={bar.anchor.x}
              y={below ? bar.anchor.y + offset : bar.anchor.y - offset}
              textAnchor="middle"
              dominantBaseline={below ? 'hanging' : 'auto'}
            >
              {fmt(bar.value)}
            </text>
          )
        }
        const left = bar.dir === 'left'
        return (
          <text
            key={bar.index}
            data-ch-part="value-label"
            x={left ? bar.anchor.x - offset : bar.anchor.x + offset}
            y={bar.anchor.y}
            textAnchor={left ? 'end' : 'start'}
            dominantBaseline="middle"
          >
            {fmt(bar.value)}
          </text>
        )
      })}
```

- [ ] **Step 5: Style tracks; keep bars out of hit-testing**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-part="bar-hit"][data-ch-selectable="true"]` rule:

```css
/* Only hit areas take pointer events; layered bars never cover the hit area below them. */
[data-ch-part="bar"],
[data-ch-part="bar-track"] {
  pointer-events: none;
}

[data-ch-part="bar-track"] {
  fill: color-mix(in srgb, var(--ch-grid) 55%, transparent);
}
```

- [ ] **Step 6: Regenerate the SSR snapshot and run the tests**

The hit rects of the server-rendered 12-week card now reach into the margins (`y="-24"`, `height="260"`), so the committed snapshot changes.

Run: `pnpm --filter tally-charts exec vitest run src/ssr.node.test.tsx -u`, then check `git diff packages/tally-charts/src/__snapshots__`: only `bar-hit` attributes (`x`, `y`, `width`, `height`) may change. If anything else changed, stop and report it.

Run: `pnpm test && pnpm test:e2e`
Expected: PASS, with no screenshot diffs. Hit areas are transparent.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: bar layers with start values, thickness, tracks and non-interactive mode

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Hidden data table

**Files:**
- Create: `packages/tally-charts/src/react/DataTable.tsx`
- Test: `packages/tally-charts/src/react/DataTable.test.tsx`
- Modify: `packages/tally-charts/src/react/Chart.tsx`
- Test: `packages/tally-charts/src/react/Chart.test.tsx`

**Interfaces:**
- Produces:

```ts
export interface DataTableColumn<D> { header: string; value: (d: D, i: number) => string }
export interface DataTableSpec<D> { columns: readonly DataTableColumn<D>[]; caption?: string }
export interface DataTableProps<D> extends DataTableSpec<D> { data: readonly D[] }
export function DataTable<D>(props: DataTableProps<D>): JSX.Element
```

and `ChartProps<D>.dataTable?: DataTableSpec<D>`. The caption defaults to the chart `title`.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/DataTable.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'

const rows = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
]

describe('<DataTable>', () => {
  it('renders a captioned, visually hidden table with one row per datum', () => {
    render(
      <DataTable
        data={rows}
        caption="Margin by week"
        columns={[
          { header: 'Week', value: (d) => d.week },
          { header: 'Margin', value: (d) => `${d.margin}%` },
        ]}
      />,
    )
    const table = screen.getByRole('table', { name: 'Margin by week' })
    expect(table).toHaveClass('ch-sr-only')
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Week',
      'Margin',
    ])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('34%')).toBeInTheDocument()
  })
})
```

Append inside `describe('<Chart>', …)` in `packages/tally-charts/src/react/Chart.test.tsx`:

```tsx
  it('renders a hidden data table captioned with the title', () => {
    render(
      <Chart
        data={weeks}
        width={300}
        title="Margin by week"
        dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
      />,
    )
    const table = screen.getByRole('table', { name: 'Margin by week' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('renders no data table for empty data', () => {
    render(
      <Chart<{ week: string }>
        data={[]}
        width={300}
        dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
      />,
    )
    expect(screen.queryByRole('table')).toBeNull()
  })
```

and add `within` to that file's `@testing-library/react` import.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/DataTable.test.tsx src/react/Chart.test.tsx`
Expected: FAIL, because `./DataTable` doesn't exist and `dataTable` is ignored.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/DataTable.tsx`:

```tsx
export interface DataTableColumn<D> {
  header: string
  value: (d: D, i: number) => string
}

export interface DataTableSpec<D> {
  columns: readonly DataTableColumn<D>[]
  /** Defaults to the chart title. */
  caption?: string
}

export interface DataTableProps<D> extends DataTableSpec<D> {
  data: readonly D[]
}

/** The chart's data as a visually hidden table, for screen-reader users. */
export function DataTable<D>({ data, columns, caption }: DataTableProps<D>) {
  return (
    <table className="ch-sr-only" data-ch-part="data-table">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column, c) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
            <th key={c} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows mirror data order
          <tr key={i}>
            {columns.map((column, c) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
              <td key={c}>{column.value(d, i)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

In `packages/tally-charts/src/react/Chart.tsx`:
- Import `{ DataTable, type DataTableSpec } from './DataTable'`.
- Add to `ChartProps<D>` after `description`:

```ts
  /** Visually hidden table of the data for screen readers. High-level charts set it by default. */
  dataTable?: DataTableSpec<D>
```

- Destructure `dataTable,` and render it just before the `aria-live` div:

```tsx
      {!isEmpty && dataTable ? (
        <DataTable data={rows} columns={dataTable.columns} caption={dataTable.caption ?? title} />
      ) : null}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/react
git commit -m "feat: hidden data table on <Chart>

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `RowLabels` and `RowDividers`

**Files:**
- Create: `packages/tally-charts/src/react/marks/RowLabels.tsx`
- Test: `packages/tally-charts/src/react/marks/RowLabels.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `truncateLabel` (Task 5), `DEV` (Task 4), `useChart`, `resolveAccessor`, `resolvePerItem`, `toFieldGetter`.
- Produces:
  - `RowLabels<D>(props: RowLabelsProps<D>)`, which renders `<g data-ch-part="row-labels" data-ch-side>` with one `<text data-ch-part="row-label">` per row, plus `<text data-ch-part="row-sublabel">` when `subtext` is set.
  - `RowDividers(props: RowDividersProps)`, which renders `<line data-ch-part="row-divider">` between rows.
  - Both need a band scale on `<Chart y>`.
  - `RowLabelsProps<D>`: `data?`, `y?`, `text`, `subtext?`, `side?` (`'left' | 'right'`), `align?` (`'start' | 'end'`), `inset?`, `position?` (`'middle' | 'above'`), `maxWidth?`, `tone?` (`PerItem<D, Tone | undefined>`) and `muted?`.

**Positioning rule:**
- `x` is measured from the chart's outer edge when the text aligns to that edge: left side with `align: 'start'`, right side with `align: 'end'`.
- Otherwise `x` is measured from the plot edge.
- `inset` moves the text inward in both cases.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/marks/RowLabels.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { RowDividers, RowLabels, type RowLabelsProps } from './RowLabels'

type Line = { name: string; note?: string; v: number }
const lines: Line[] = [
  { name: 'Labor', note: '7.5 h planned', v: 8 },
  { name: 'Materials and supplies', v: 4 },
]

function renderRows(props: Partial<RowLabelsProps<Line>> = {}, data: Line[] = lines) {
  return render(
    <Chart<Line>
      data={data}
      width={300}
      height={50 * data.length}
      margin={{ top: 0, right: 50, bottom: 0, left: 100 }}
      x={{ field: 'v', domain: [0, 10] }}
      y={{ type: 'band', field: 'name', padding: 0 }}
      animate={false}
    >
      <RowLabels<Line> text="name" {...props} />
      <RowDividers />
    </Chart>,
  )
}

const labels = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="row-label"]')]

describe('<RowLabels>', () => {
  it('draws one label per row at the left outer edge, centred in the row', () => {
    const { container } = renderRows()
    const [first, second] = labels(container)
    expect(labels(container).map((t) => t.textContent)).toEqual([
      'Labor',
      'Materials and supplies',
    ])
    expect(first).toHaveAttribute('x', '-100')
    expect(first).toHaveAttribute('text-anchor', 'start')
    expect(first).toHaveAttribute('y', '25')
    expect(second).toHaveAttribute('y', '75')
  })

  it('adds a muted second line when subtext is set', () => {
    const { container } = renderRows({ subtext: 'note' })
    const sub = container.querySelector('[data-ch-part="row-sublabel"]')
    expect(sub).toHaveTextContent('7.5 h planned')
    expect(labels(container)[0]).toHaveAttribute('y', '16')
    expect(sub).toHaveAttribute('y', '34')
    // The second row has no note, so its label stays centred.
    expect(labels(container)[1]).toHaveAttribute('y', '75')
  })

  it('aligns a right column to the outer edge minus the inset', () => {
    const { container } = renderRows({ side: 'right', inset: 10 })
    // innerWidth = 300 - 100 - 50 = 150; outer right edge = 200.
    expect(labels(container)[0]).toHaveAttribute('x', '190')
    expect(labels(container)[0]).toHaveAttribute('text-anchor', 'end')
  })

  it('places text at the top of the row', () => {
    const { container } = renderRows({ position: 'above' })
    expect(labels(container)[1]).toHaveAttribute('y', '50')
    expect(labels(container)[1]).toHaveAttribute('dominant-baseline', 'hanging')
  })

  it('cuts long labels with an ellipsis', () => {
    const { container } = renderRows({ maxWidth: 70 })
    expect(labels(container)[1]).toHaveTextContent('Materials…')
    expect(labels(container)[0]).toHaveTextContent('Labor')
  })

  it('colors text by tone and marks muted columns', () => {
    const { container } = renderRows({ tone: (d) => (d.v > 5 ? 'loss' : undefined), muted: true })
    expect(labels(container)[0]).toHaveAttribute('data-ch-tone', 'loss')
    expect(labels(container)[0]).toHaveStyle({ fill: 'var(--ch-loss)' })
    expect(labels(container)[1]).not.toHaveAttribute('data-ch-tone')
    expect(labels(container)[0]).toHaveAttribute('data-ch-muted', 'true')
  })

  it('warns and draws nothing without a band scale on y', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart
        data={lines}
        width={300}
        x={{ type: 'band', field: 'name' }}
        y={{ field: 'v', domain: [0, 10] }}
      >
        <RowLabels<Line> text="name" />
      </Chart>,
    )
    expect(labels(container)).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('RowLabels need a band scale'))
  })
})

describe('<RowDividers>', () => {
  it('draws a line between rows across the whole chart width', () => {
    const { container } = renderRows({}, [...lines, { name: 'Permit', v: 2 }])
    const dividers = [...container.querySelectorAll('[data-ch-part="row-divider"]')]
    expect(dividers).toHaveLength(2)
    expect(dividers[0]).toHaveAttribute('y1', '50')
    expect(dividers[1]).toHaveAttribute('y1', '100')
    expect(dividers[0]).toHaveAttribute('x1', '-100')
    expect(dividers[0]).toHaveAttribute('x2', '200')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks/RowLabels.test.tsx`
Expected: FAIL, because `./RowLabels` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/marks/RowLabels.tsx`:

```tsx
import { resolveAccessor, resolvePerItem, toFieldGetter } from '../../core/accessor'
import { truncateLabel } from '../../core/text'
import type { Accessor, PerItem, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface RowLabelsProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Row field matching the band scale on <Chart y>. Defaults to its field. */
  y?: Accessor<D, string | number>
  /** The main line. */
  text: Accessor<D, string>
  /** An optional second, muted line. */
  subtext?: Accessor<D, string>
  /** Which side of the plot the column sits on. Default 'left'. */
  side?: 'left' | 'right'
  /** Text alignment. Default 'start' on the left side and 'end' on the right. */
  align?: 'start' | 'end'
  /**
   * Moves the text inward, in px: from the chart's outer edge when the text aligns to it, and
   * from the plot edge otherwise. Default 0.
   */
  inset?: number
  /** 'middle' centres the text in its row; 'above' puts it at the top of the row. Default 'middle'. */
  position?: 'middle' | 'above'
  /** Longest text in px; longer text is cut with an ellipsis. */
  maxWidth?: number
  /** Text color role per row. Default: ink. */
  tone?: PerItem<D, Tone | undefined>
  /** Smaller, muted text for secondary columns such as "9 jobs". Default false. */
  muted?: boolean
}

/** Half the distance between the two lines of a two-line label, in px. */
const LINE_GAP = 9

export function RowLabels<D>(props: RowLabelsProps<D>) {
  const ctx = useChart('RowLabels')
  const { side = 'left', position = 'middle', inset = 0, maxWidth, muted = false } = props
  const align = props.align ?? (side === 'left' ? 'start' : 'end')
  if (ctx.y.kind !== 'band') {
    if (DEV) ctx.warn('row-labels-scale', 'RowLabels need a band scale on <Chart y>.')
    return null
  }
  const band = ctx.y.scale
  const getRow = toFieldGetter(props.y) ?? ctx.y.field
  if (!getRow) {
    if (DEV) {
      ctx.warn(
        'row-labels-field',
        'RowLabels need a row field: pass `y` or set `field` on <Chart y>.',
      )
    }
    return null
  }
  const data = (props.data ?? ctx.data) as readonly D[]
  const getText = resolveAccessor(props.text)
  const getSub = props.subtext ? resolveAccessor(props.subtext) : undefined
  const toneOf =
    props.tone === undefined ? undefined : resolvePerItem<D, Tone | undefined>(props.tone)
  const outerRight = ctx.innerWidth + ctx.margin.right
  const x =
    side === 'left'
      ? align === 'start'
        ? -ctx.margin.left + inset
        : -inset
      : align === 'end'
        ? outerRight - inset
        : ctx.innerWidth + inset
  const cut = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return maxWidth === undefined ? text : truncateLabel(text, maxWidth)
  }
  const size = band.bandwidth()

  return (
    <g data-ch-part="row-labels" data-ch-side={side}>
      {data.map((d, i) => {
        const start = band(String(getRow(d, i)))
        if (start === undefined) return null
        const text = cut(getText(d, i))
        const sub = getSub ? cut(getSub(d, i)) : ''
        if (!text && !sub) return null
        const tone = toneOf?.(d, i, data)
        const mid = start + size / 2
        const above = position === 'above'
        const mainY = above ? start : sub ? mid - LINE_GAP : mid
        const subY = above ? start + 2 * LINE_GAP + 2 : mid + LINE_GAP
        const baseline = above ? 'hanging' : 'middle'
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: one label group per data row, in order
          <g key={i}>
            {text ? (
              <text
                data-ch-part="row-label"
                data-ch-tone={tone}
                data-ch-muted={muted ? 'true' : undefined}
                x={x}
                y={mainY}
                textAnchor={align}
                dominantBaseline={baseline}
                style={tone ? { fill: `var(--ch-${tone})` } : undefined}
              >
                {text}
              </text>
            ) : null}
            {sub ? (
              <text
                data-ch-part="row-sublabel"
                x={x}
                y={subY}
                textAnchor={align}
                dominantBaseline={baseline}
              >
                {sub}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

export interface RowDividersProps {
  /** Distance in px from both outer edges. Default 0. */
  inset?: number
}

/** Thin rules between rows, across the whole chart width. */
export function RowDividers({ inset = 0 }: RowDividersProps) {
  const ctx = useChart('RowDividers')
  if (ctx.y.kind !== 'band') {
    if (DEV) ctx.warn('row-dividers-scale', 'RowDividers need a band scale on <Chart y>.')
    return null
  }
  const band = ctx.y.scale
  const domain = band.domain()
  const size = band.bandwidth()
  const x1 = -ctx.margin.left + inset
  const x2 = ctx.innerWidth + ctx.margin.right - inset
  const lines: { key: string; y: number }[] = []
  for (let i = 1; i < domain.length; i++) {
    const prev = band(domain[i - 1] as string)
    const next = band(domain[i] as string)
    if (prev === undefined || next === undefined) continue
    lines.push({ key: domain[i] as string, y: (prev + size + next) / 2 })
  }
  return (
    <g data-ch-part="row-dividers">
      {lines.map((line) => (
        <line key={line.key} data-ch-part="row-divider" x1={x1} x2={x2} y1={line.y} y2={line.y} />
      ))}
    </g>
  )
}
```

- [ ] **Step 4: Style the new parts**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-part="value-label"]` rule:

```css
[data-ch-part="row-label"] {
  fill: var(--ch-ink);
  font-size: 15px;
}

[data-ch-part="row-label"][data-ch-muted="true"],
[data-ch-part="row-sublabel"] {
  fill: var(--ch-ink-muted);
  font-size: 13px;
}

[data-ch-part="row-divider"] {
  stroke: var(--ch-grid);
  stroke-width: 1;
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: RowLabels and RowDividers for row charts

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 9: `BarChart`

**Files:**
- Create: `packages/tally-charts/src/react/charts/shared.ts`
- Create: `packages/tally-charts/src/react/charts/BarChart.tsx`
- Test: `packages/tally-charts/src/react/charts/BarChart.test.tsx`

**Interfaces:**
- Consumes: `Chart`/`ChartProps` (with `dataTable` from Task 7), `Bars`, `ValueLabel`, `Axis`, `Target`, `Tooltip`, `useFormat`, `resolveAccessor`.
- Produces:
  - `shared.ts`:
    - `type ChartPassThroughProps<D>`, which picks from `ChartProps<D>`: `width`, `initialWidth`, `height`, `aspectRatio`, `margin`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`, `empty`, `className`, `style`, `chartId` and `children`
    - `toNumber(value: unknown): number`
    - `headerOf(accessor: unknown, fallback: string): string`
  - `BarChart<D>(props: BarChartProps<D>)`.
  - `x` is the category and `y` the value, in both orientations.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/BarChart.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BarChart, type BarChartProps } from './BarChart'

type Week = { week: string; margin: number | null }
const weeks: Week[] = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
  { week: 'W3', margin: 32 },
]

function renderChart(props: Partial<BarChartProps<Week>> = {}) {
  return render(
    <BarChart<Week>
      data={weeks}
      x="week"
      y="margin"
      width={300}
      title="Margin by week"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]

describe('<BarChart>', () => {
  it('draws history hatched, the last bar solid, its value and the end labels', () => {
    const { container } = renderChart()
    expect(parts(container, 'bar').map((b) => b.getAttribute('data-ch-fill'))).toEqual([
      'hatch-fade',
      'hatch-fade',
      'solid',
    ])
    expect(parts(container, 'value-label').map((t) => t.textContent)).toEqual(['32'])
    expect(parts(container, 'axis-label').map((t) => t.textContent)).toEqual(['W1', 'W3'])
  })

  it('draws a target from a number or from an object with a label', () => {
    // The inferred domain is [0, 35]; a target outside it would be hidden.
    const { container, unmount } = renderChart({ target: 33 })
    expect(parts(container, 'target')).toHaveLength(1)
    expect(parts(container, 'target-label')).toHaveLength(0)
    unmount()
    const labelled = renderChart({ target: { value: 33, label: 'Target 33' } })
    expect(parts(labelled.container, 'target-label')[0]).toHaveTextContent('Target 33')
  })

  it('lays bars out horizontally with category labels on the left', () => {
    const { container } = renderChart({ orientation: 'horizontal' })
    expect(parts(container, 'bar').every((b) => b.getAttribute('data-ch-dir') === 'right')).toBe(
      true,
    )
    expect(container.querySelector('[data-ch-part="axis"]')).toHaveAttribute('data-ch-side', 'left')
    // 3 rows × 32px + 8px top + 8px bottom.
    expect(container.querySelector('svg')).toHaveAttribute('height', '112')
  })

  it('hides value labels and the axis on request', () => {
    const { container } = renderChart({ valueLabel: 'none', axis: 'none' })
    expect(parts(container, 'value-label')).toHaveLength(0)
    expect(parts(container, 'axis-label')).toHaveLength(0)
  })

  it('renders a hidden data table by default and formats its values', () => {
    const { unmount } = renderChart({ format: 'percent' })
    const table = screen.getByRole('table', { name: 'Margin by week' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'week',
      'margin',
    ])
    expect(within(table).getByText('34.0%')).toBeInTheDocument()
    unmount()
    renderChart({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows a tooltip on hover and renders children after its own marks', () => {
    const { container } = renderChart({ children: <g data-testid="extra" /> })
    fireEvent.pointerEnter(parts(container, 'bar-hit')[1] as Element)
    expect(container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent('W2')
    expect(screen.getByTestId('extra')).toBeInTheDocument()
  })

  it('selects with the keyboard', () => {
    const onSelect = vi.fn()
    renderChart({ onSelect })
    const figure = screen.getByRole('figure', { name: 'Margin by week' })
    expect(figure).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ id: 0 }))
  })

  it('renders the empty slot for empty data', () => {
    renderChart({ data: [] })
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('skips a missing value without throwing and leaves its table cell blank', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ data: [...weeks, { week: 'W4', margin: null }] })
    expect(parts(container, 'bar')).toHaveLength(3)
    expect(warn).toHaveBeenCalledTimes(1)
    const cells = within(screen.getByRole('table')).getAllByRole('cell')
    expect(cells.at(-1)?.textContent).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/BarChart.test.tsx`
Expected: FAIL, because `./BarChart` doesn't exist.

- [ ] **Step 3: Implement the shared helpers**

Create `packages/tally-charts/src/react/charts/shared.ts`:

```ts
import type { ChartProps } from '../Chart'

/** `<Chart>` props every high-level chart passes through unchanged. */
export type ChartPassThroughProps<D> = Pick<
  ChartProps<D>,
  | 'width'
  | 'initialWidth'
  | 'height'
  | 'aspectRatio'
  | 'margin'
  | 'title'
  | 'description'
  | 'activeId'
  | 'onActiveChange'
  | 'onSelect'
  | 'animate'
  | 'dimInactive'
  | 'empty'
  | 'className'
  | 'style'
  | 'chartId'
  | 'children'
>

/** Numbers from data: null and undefined become NaN instead of 0. */
export function toNumber(value: unknown): number {
  return value === null || value === undefined ? Number.NaN : Number(value)
}

/** Data-table header: the field name for a string accessor, otherwise the fallback. */
export function headerOf(accessor: unknown, fallback: string): string {
  return typeof accessor === 'string' ? accessor : fallback
}
```

- [ ] **Step 4: Implement `BarChart`**

Create `packages/tally-charts/src/react/charts/BarChart.tsx`:

```tsx
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import type { BandScaleSpec, LinearScaleSpec } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import type { Margin } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { Target } from '../marks/Target'
import { ValueLabel } from '../marks/ValueLabel'
import { Tooltip } from '../overlays/Tooltip'
import { type ChartPassThroughProps, headerOf, toNumber } from './shared'

export interface BarChartProps<D> extends ChartPassThroughProps<D> {
  data: readonly D[]
  /** Category field: the band axis in both orientations. */
  x: Accessor<D, string | number>
  /** Value field. */
  y: Accessor<D, number>
  id?: Accessor<D, Id>
  /** Category label for tooltips, announcements and the data table. Defaults to `x`. */
  label?: Accessor<D, string>
  /** Default 'vertical'. */
  orientation?: 'vertical' | 'horizontal'
  /** Value domain. Inferred from the data (including zero) when omitted. */
  domain?: readonly [number, number]
  /** A target value, optionally with a label. */
  target?: number | { value: number; label?: string }
  /** Which bars get a value label. Default 'last'. */
  valueLabel?: 'last' | 'all' | 'none'
  /** Format for value labels. Defaults to `format`. */
  valueFormat?: FormatSpec
  /** Format for tooltips, announcements and the data table. Default 'number'. */
  format?: FormatSpec
  /** Category axis ticks, or 'none'. Default 'ends'. */
  axis?: TickSpec | 'none'
  /** Default 'accent'. */
  tone?: PerItem<D, Tone>
  /** Default: history 'hatch-fade', last bar 'solid'. */
  fill?: PerItem<D, Fill>
  /** Inner band padding, 0–1. Default 0.35. */
  padding?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

const VERTICAL_MARGIN: Margin = { top: 24, right: 0, bottom: 28, left: 0 }
const HORIZONTAL_MARGIN: Margin = { top: 8, right: 48, bottom: 8, left: 96 }
const ROW_HEIGHT = 32

const historyThenSolid = (_: unknown, i: number, all: readonly unknown[]): Fill =>
  i === all.length - 1 ? 'solid' : 'hatch-fade'

export function BarChart<D>({
  data,
  x,
  y,
  id,
  label,
  orientation = 'vertical',
  domain,
  target,
  valueLabel = 'last',
  valueFormat,
  format,
  axis = 'ends',
  tone = 'accent',
  fill = historyThenSolid,
  padding = 0.35,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  ...chart
}: BarChartProps<D>) {
  const { create } = useFormat()
  const vertical = orientation === 'vertical'
  const band: BandScaleSpec<D> = { type: 'band', field: x, padding }
  const linear: LinearScaleSpec<D> = { field: y, domain }
  const m: Margin = { ...(vertical ? VERTICAL_MARGIN : HORIZONTAL_MARGIN), ...margin }
  const autoHeight =
    !vertical && chart.aspectRatio === undefined
      ? Math.max(1, data.length) * ROW_HEIGHT + m.top + m.bottom
      : undefined
  const targetSpec = typeof target === 'number' ? { value: target } : target

  let table: DataTableSpec<D> | undefined
  if (dataTable) {
    const getCategory = resolveAccessor(x)
    const getValue = resolveAccessor(y)
    const getLabel = label ? resolveAccessor(label) : undefined
    const formatValue = create(format)
    table = {
      columns: [
        {
          header: headerOf(x, 'Category'),
          value: (d, i) => String((getLabel ? getLabel(d, i) : getCategory(d, i)) ?? ''),
        },
        { header: headerOf(y, 'Value'), value: (d, i) => formatValue(toNumber(getValue(d, i))) },
      ],
    }
  }

  return (
    <Chart<D>
      {...chart}
      data={data}
      x={vertical ? band : linear}
      y={vertical ? linear : band}
      margin={m}
      height={height ?? autoHeight}
      dataTable={table}
    >
      {targetSpec ? (
        <Target
          {...(vertical ? { y: targetSpec.value } : { x: targetSpec.value })}
          label={targetSpec.label}
        />
      ) : null}
      <Bars<D> id={id} label={label} tone={tone} fill={fill} format={format} />
      {valueLabel === 'none' ? null : <ValueLabel<D> at={valueLabel} format={valueFormat ?? format} />}
      {axis === 'none' ? null : <Axis side={vertical ? 'bottom' : 'left'} ticks={axis} />}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. If TypeScript rejects `fill = historyThenSolid` as a default for `PerItem<D, Fill>`, annotate the constant as `const historyThenSolid: (d: unknown, i: number, all: readonly unknown[]) => Fill`. Don't use `any`.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src/react/charts
git commit -m "feat: BarChart

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `ComparisonBars`

**Files:**
- Create: `packages/tally-charts/src/react/charts/ComparisonBars.tsx`
- Test: `packages/tally-charts/src/react/charts/ComparisonBars.test.tsx`

**Interfaces:**
- Consumes:
  - from Task 6: `Bars`, with `from`, `size`, `offset`, `interactive` and `ariaLabel`
  - from Task 8: `RowLabels` and `RowDividers`
  - from Task 9: `ChartPassThroughProps`, `toNumber` and `headerOf`
  - also: `createWarner`, `DEV`, `inferLinearDomain`, `useFormat` and `Tooltip`
- Produces:
  - `ComparisonBars<D>(props: ComparisonBarsProps<D>)`.
  - `type ComparisonStatus = 'over' | 'under' | 'on-plan' | 'unknown'`.
  - Each row draws three layers:
    1. a hatched plan bar on top (`accent-soft`)
    2. a solid actual bar below (`accent`), capped at the plan when the row runs over
    3. a hatched overrun segment from the plan to the actual (`loss`, or `gain` when `overIsBad={false}`)
  - Only the actual layer is interactive. All three layers share the row id, so keyboard navigation visits each row once.

Reference: `docs/reference/03-estimate-vs-actual.png`, the left card.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/ComparisonBars.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonBars, type ComparisonBarsProps } from './ComparisonBars'

type Line = { name: string; note?: string; estimate: number | null; actual: number | null }
const lines: Line[] = [
  { name: 'Labor', note: '7.5 h planned', estimate: 640, actual: 1060 },
  { name: 'Subcontract', estimate: 400, actual: 400 },
  { name: 'Permit', estimate: 210, actual: 160 },
]

function renderRows(props: Partial<ComparisonBarsProps<Line>> = {}) {
  return render(
    <ComparisonBars<Line>
      data={lines}
      label="name"
      sublabel="note"
      plan="estimate"
      actual="actual"
      format="currency"
      width={600}
      title="Estimate vs actual"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const planBars = (root: HTMLElement) =>
  parts(root, '[data-ch-part="bar"][data-ch-tone="accent-soft"]')
const actualBars = (root: HTMLElement) =>
  parts(root, '[data-ch-part="bar"][data-ch-tone="accent"]')
const overBars = (root: HTMLElement, tone = 'loss') =>
  parts(root, `[data-ch-part="bar"][data-ch-tone="${tone}"]`)
const rightColumns = (root: HTMLElement) =>
  parts(root, '[data-ch-part="row-labels"][data-ch-side="right"]').map((g) =>
    [...g.querySelectorAll('[data-ch-part="row-label"]')].map((t) => ({
      text: t.textContent,
      tone: t.getAttribute('data-ch-tone'),
    })),
  )

describe('<ComparisonBars>', () => {
  it('draws a hatched plan bar and a solid actual bar per row', () => {
    const { container } = renderRows()
    expect(planBars(container)).toHaveLength(3)
    expect(planBars(container).every((b) => b.getAttribute('data-ch-fill') === 'hatch')).toBe(true)
    expect(actualBars(container)).toHaveLength(3)
    expect(actualBars(container).every((b) => b.getAttribute('data-ch-fill') === 'solid')).toBe(
      true,
    )
  })

  it('draws the overrun as a separate segment from the plan to the actual', () => {
    const { container } = renderRows()
    const [over] = overBars(container)
    expect(overBars(container)).toHaveLength(1)
    const planWidth = Number(planBars(container)[0]?.getAttribute('width'))
    expect(Number(over?.getAttribute('x'))).toBeCloseTo(planWidth)
    // The solid actual bar stops at the plan; the overrun carries the rest.
    expect(Number(actualBars(container)[0]?.getAttribute('width'))).toBeCloseTo(planWidth)
  })

  it('writes the change column and a toned delta column', () => {
    const { container } = renderRows()
    const [change, delta] = rightColumns(container)
    expect(change?.map((c) => c.text)).toEqual(['$640 → $1,060', '$400 → $400', '$210 → $160'])
    expect(delta).toEqual([
      { text: '+$420', tone: 'loss' },
      { text: 'On plan', tone: 'neutral' },
      { text: '−$50', tone: 'gain' },
    ])
  })

  it('shows labels with sublabels on the left', () => {
    const { container } = renderRows()
    const left = parts(container, '[data-ch-part="row-labels"][data-ch-side="left"]')[0]
    expect(left).toHaveTextContent('Labor')
    expect(left?.querySelector('[data-ch-part="row-sublabel"]')).toHaveTextContent(
      '7.5 h planned',
    )
  })

  it('treats differences within the tolerance as on plan', () => {
    const { container } = renderRows({ tolerance: 60 })
    expect(rightColumns(container)[1]?.[2]).toEqual({ text: 'On plan', tone: 'neutral' })
  })

  it('flips tones when going over is good', () => {
    const { container } = renderRows({ overIsBad: false })
    expect(overBars(container, 'gain')).toHaveLength(1)
    expect(rightColumns(container)[1]?.[0]).toEqual({ text: '+$420', tone: 'gain' })
    expect(rightColumns(container)[1]?.[2]).toEqual({ text: '−$50', tone: 'loss' })
  })

  it('visits each row once with the arrow keys', () => {
    const onActiveChange = vi.fn()
    renderRows({ onActiveChange })
    const figure = screen.getByRole('figure', { name: 'Estimate vs actual' })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(figure, { key: 'ArrowDown' })
    expect(onActiveChange.mock.calls.map((call) => call[0])).toEqual([0, 1, 2])
  })

  it('announces plan, actual and difference', () => {
    const { container } = renderRows()
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'ArrowDown' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent(
      'Labor, plan $640, actual $1,060, +$420',
    )
  })

  it('selects a row by clicking anywhere on it', () => {
    const onSelect = vi.fn()
    const { container } = renderRows({ onSelect })
    const hits = parts(container, '[data-ch-part="bar-hit"]')
    expect(hits).toHaveLength(3)
    fireEvent.click(hits[2] as Element)
    expect(onSelect).toHaveBeenCalledWith(2, expect.objectContaining({ id: 2 }))
  })

  it('shows the label but no values for a row with a missing actual', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderRows({
      data: [...lines.slice(0, 2), { name: 'Permit', estimate: 210, actual: null }],
    })
    expect(container.textContent).toContain('Permit')
    expect(container.textContent).not.toContain('NaN')
    const [change, delta] = rightColumns(container)
    expect(change).toHaveLength(2)
    expect(delta).toHaveLength(2)
    expect(actualBars(container)).toHaveLength(2)
    expect(planBars(container)).toHaveLength(3)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('ComparisonBars')
  })

  it('renders a hidden data table', () => {
    renderRows()
    const table = screen.getByRole('table', { name: 'Estimate vs actual' })
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'name',
      'estimate',
      'actual',
      'Difference',
    ])
    expect(within(table).getByText('+$420')).toBeInTheDocument()
  })

  it('sizes the chart from the row count', () => {
    const { container } = renderRows()
    expect(container.querySelector('svg')).toHaveAttribute('height', '168')
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderRows({ width: 0 })
    for (const rect of parts(container, 'rect')) {
      for (const name of ['x', 'y', 'width', 'height']) {
        const value = rect.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
      expect(Number(rect.getAttribute('width') ?? 0)).toBeGreaterThanOrEqual(0)
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/ComparisonBars.test.tsx`
Expected: FAIL, because `./ComparisonBars` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/ComparisonBars.tsx`:

```tsx
import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { inferLinearDomain } from '../../core/scale'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import type { Margin } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Bars } from '../marks/Bars'
import { RowDividers, RowLabels } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import { type ChartPassThroughProps, headerOf, toNumber } from './shared'

export type ComparisonStatus = 'over' | 'under' | 'on-plan' | 'unknown'

export interface ComparisonBarsProps<D> extends Omit<ChartPassThroughProps<D>, 'aspectRatio'> {
  data: readonly D[]
  /** Row name. */
  label: Accessor<D, string>
  /** Optional muted second line under the name. */
  sublabel?: Accessor<D, string>
  /** Planned or estimated value: the hatched bar. */
  plan: Accessor<D, number>
  /** Actual value: the solid bar. */
  actual: Accessor<D, number>
  /** Row id passed to onSelect and onActiveChange. Default: the data index. */
  id?: Accessor<D, Id>
  /** Default 'number'. */
  format?: FormatSpec
  /** Value domain. Default: zero to the largest plan or actual. */
  domain?: readonly [number, number]
  /** A difference at or below this counts as on plan. Default 0. */
  tolerance?: number
  /** Text for rows on plan. Default "On plan". */
  onPlanText?: string
  /** Going over plan is bad news (costs, hours). Default true; set false for revenue-like rows. */
  overIsBad?: boolean
  /** Default 56. */
  rowHeight?: number
  /** Thickness of each of the two bars in px. Default 8. */
  barSize?: number
  /** Width of the label column in px. Default 240. */
  labelWidth?: number
  /** Width of the value columns (change and delta) in px. Default 220. */
  valueWidth?: number
  /** Width of the delta column inside `valueWidth`, in px. Default 80. */
  deltaWidth?: number
  /** Show the "$640 → $1,060  +$420" columns. Default true. */
  showValues?: boolean
  /** Thin rules between rows. Default true. */
  dividers?: boolean
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface ComparisonRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  label: string
  sublabel: string
  plan: number
  actual: number
  /** Length of the solid bar: capped at the plan when over, so the overrun draws separately. */
  kept: number
  status: ComparisonStatus
  /** "$640 → $1,060", or empty when a value is missing. */
  change: string
  /** "+$420", "On plan", or empty when a value is missing. */
  delta: string
  deltaTone: Tone | undefined
}

const GAP = 3

function statusOf(plan: number, actual: number, tolerance: number): ComparisonStatus {
  if (!Number.isFinite(plan) || !Number.isFinite(actual)) return 'unknown'
  const diff = actual - plan
  if (Math.abs(diff) <= tolerance) return 'on-plan'
  return diff > 0 ? 'over' : 'under'
}

export function ComparisonBars<D>({
  data,
  label,
  sublabel,
  plan,
  actual,
  id,
  format,
  domain,
  tolerance = 0,
  onPlanText = 'On plan',
  overIsBad = true,
  rowHeight = 56,
  barSize = 8,
  labelWidth = 240,
  valueWidth = 220,
  deltaWidth = 80,
  showValues = true,
  dividers = true,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  ...chart
}: ComparisonBarsProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const signed = useMemo(() => create(format, { signed: true }), [create, format])
  const overTone: Tone = overIsBad ? 'loss' : 'gain'
  const underTone: Tone = overIsBad ? 'gain' : 'loss'

  const rows = useMemo(() => {
    const getLabel = resolveAccessor(label)
    const getSub = sublabel ? resolveAccessor(sublabel) : undefined
    const getPlan = resolveAccessor(plan)
    const getActual = resolveAccessor(actual)
    const getId = id ? resolveAccessor(id) : undefined
    return data.map((d, i): ComparisonRow<D> => {
      const p = toNumber(getPlan(d, i))
      const a = toNumber(getActual(d, i))
      const status = statusOf(p, a, tolerance)
      const known = status !== 'unknown'
      return {
        key: String(i),
        rowId: getId ? getId(d, i) : i,
        datum: d,
        index: i,
        label: String(getLabel(d, i) ?? ''),
        sublabel: getSub ? String(getSub(d, i) ?? '') : '',
        plan: p,
        actual: a,
        kept: status === 'over' ? p : a,
        status,
        change: known ? `${fmt(p)} → ${fmt(a)}` : '',
        delta: !known ? '' : status === 'on-plan' ? onPlanText : signed(a - p),
        deltaTone:
          status === 'on-plan'
            ? 'neutral'
            : status === 'over'
              ? overTone
              : status === 'under'
                ? underTone
                : undefined,
      }
    })
  }, [data, label, sublabel, plan, actual, id, tolerance, fmt, signed, onPlanText, overTone, underTone])

  const missing = rows.find((r) => r.status === 'unknown')
  if (DEV && missing) {
    warn(
      'comparison-value',
      `ComparisonBars skipped a missing or non-numeric plan or actual value at index ${missing.index}.`,
    )
  }

  // Each layer only gets rows it can draw, so a missing value never reaches <Bars> as NaN and
  // the chart warns once, above, instead of once per layer.
  const planRows = useMemo(() => rows.filter((r) => Number.isFinite(r.plan)), [rows])
  const keptRows = useMemo(() => rows.filter((r) => Number.isFinite(r.kept)), [rows])
  const overRows = useMemo(() => rows.filter((r) => r.status === 'over'), [rows])
  const resolvedDomain = domain ?? inferLinearDomain(rows.flatMap((r) => [r.plan, r.actual]))
  const m: Margin = {
    top: 0,
    bottom: 0,
    left: labelWidth,
    right: showValues ? valueWidth : 0,
    ...margin,
  }
  const shift = barSize / 2 + GAP / 2
  const radius = barSize / 2

  const ariaOf = (r: ComparisonRow<D>) =>
    r.status === 'unknown'
      ? r.label
      : `${r.label}, plan ${fmt(r.plan)}, actual ${fmt(r.actual)}, ${r.delta}`
  const segmentsOf = (r: ComparisonRow<D>): TooltipSegment[] => [
    { value: r.label },
    { value: r.change },
    { value: r.delta, tone: r.deltaTone },
  ]

  const table: DataTableSpec<ComparisonRow<D>> | undefined = dataTable
    ? {
        columns: [
          { header: headerOf(label, 'Item'), value: (r) => r.label },
          { header: headerOf(plan, 'Plan'), value: (r) => fmt(r.plan) },
          { header: headerOf(actual, 'Actual'), value: (r) => fmt(r.actual) },
          { header: 'Difference', value: (r) => r.delta },
        ],
      }
    : undefined

  return (
    <Chart<ComparisonRow<D>>
      {...chart}
      data={rows}
      x={{ field: 'actual', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, rows.length) * rowHeight + m.top + m.bottom}
      dataTable={table}
    >
      {dividers ? <RowDividers /> : null}
      <Bars<ComparisonRow<D>>
        data={planRows}
        x="plan"
        id="rowId"
        tone="accent-soft"
        fill="hatch"
        size={barSize}
        offset={-shift}
        radius={radius}
        interactive={false}
      />
      <Bars<ComparisonRow<D>>
        data={keptRows}
        x="kept"
        id="rowId"
        label="label"
        tone="accent"
        size={barSize}
        offset={shift}
        radius={radius}
        format={format}
        ariaLabel={ariaOf}
        tooltip={segmentsOf}
      />
      <Bars<ComparisonRow<D>>
        data={overRows}
        x="actual"
        from="plan"
        id="rowId"
        tone={overTone}
        fill="hatch"
        size={barSize}
        offset={shift}
        radius={radius}
        interactive={false}
      />
      <RowLabels<ComparisonRow<D>>
        text="label"
        subtext={sublabel ? 'sublabel' : undefined}
        maxWidth={labelWidth - 16}
      />
      {showValues ? (
        <>
          <RowLabels<ComparisonRow<D>> side="right" text="change" inset={deltaWidth} />
          <RowLabels<ComparisonRow<D>> side="right" text="delta" tone={(r) => r.deltaTone} />
        </>
      ) : null}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

When only the actual is missing, the plan bar is still drawn, the solid bar is skipped, and the row has no hit area. That makes it unreachable by keyboard, which is acceptable because it has no value to announce.

- [ ] **Step 4: Run the tests**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add packages/tally-charts/src/react/charts
git commit -m "feat: ComparisonBars (plan vs actual with overrun segments)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: `RankedBars`

**Files:**
- Create: `packages/tally-charts/src/react/charts/RankedBars.tsx`
- Test: `packages/tally-charts/src/react/charts/RankedBars.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `Bars` (with `track`, `size`, `align` and `ariaLabel`), `RowLabels`, `ChartPassThroughProps`, `toNumber`, `headerOf`, `useChart`, `inferLinearDomain`, `useFormat` and `resolvePerItem`.
- Produces:
  - `RankedBars<D>(props: RankedBarsProps<D>)`.
  - New part `data-ch-part="row-highlight"`, a backdrop behind the selected row.
  - Ids are the original data index or the `id` accessor, never the sorted position.
  - Bar length is `|value|`.

Reference:
- `docs/reference/03-estimate-vs-actual.png`, "Where the $860 went" (inline layout)
- `docs/reference/06-drilldown-strip-plot.png`, the drill columns (stacked layout)

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/RankedBars.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RankedBars, type RankedBarsProps } from './RankedBars'

type Cause = { name: string; amount: number | null; jobs?: string }
const causes: Cause[] = [
  { name: 'Callbacks', amount: 14400 },
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material variance', amount: 18700 },
]

function renderRanked(props: Partial<RankedBarsProps<Cause>> = {}) {
  return render(
    <RankedBars<Cause>
      data={causes}
      label="name"
      value="amount"
      format="currency-compact"
      width={400}
      title="Leakage by cause"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const names = (root: HTMLElement) =>
  parts(root, '[data-ch-part="row-labels"][data-ch-side="left"] [data-ch-part="row-label"]').map(
    (t) => t.textContent,
  )
const values = (root: HTMLElement) =>
  parts(root, '[data-ch-part="row-labels"][data-ch-side="right"]')
    .at(-1)
    ?.querySelectorAll('[data-ch-part="row-label"]')

describe('<RankedBars>', () => {
  it('sorts rows by size, largest first', () => {
    const { container } = renderRanked()
    expect(names(container)).toEqual(['Labor overruns', 'Material variance', 'Callbacks'])
    expect([...(values(container) ?? [])].map((t) => t.textContent)).toEqual([
      '$31.2K',
      '$18.7K',
      '$14.4K',
    ])
  })

  it('keeps data order with sort none and sorts ascending with asc', () => {
    const { container, unmount } = renderRanked({ sort: 'none' })
    expect(names(container)).toEqual(['Callbacks', 'Labor overruns', 'Material variance'])
    unmount()
    const asc = renderRanked({ sort: 'asc' })
    expect(names(asc.container)).toEqual(['Callbacks', 'Material variance', 'Labor overruns'])
  })

  it('shows only the first rows with limit', () => {
    const { container } = renderRanked({ limit: 2 })
    expect(parts(container, '[data-ch-part="bar"]')).toHaveLength(2)
  })

  it('draws a faint track behind every bar', () => {
    const { container } = renderRanked()
    expect(parts(container, '[data-ch-part="bar-track"]')).toHaveLength(3)
  })

  it('keeps original indexes as ids after sorting', () => {
    const onSelect = vi.fn()
    const { container } = renderRanked({ onSelect })
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[0] as Element)
    // The first row shown is "Labor overruns", index 1 in the data.
    expect(onSelect).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1 }))
  })

  it('highlights the selected row in the selected tone', () => {
    const { container } = renderRanked({ selectedId: 2 })
    expect(parts(container, '[data-ch-part="row-highlight"]')).toHaveLength(1)
    const tones = parts(container, '[data-ch-part="bar"]').map((b) =>
      b.getAttribute('data-ch-tone'),
    )
    expect(tones).toEqual(['neutral', 'loss', 'neutral'])
    expect(values(container)?.[1]).toHaveAttribute('data-ch-tone', 'loss')
    expect(values(container)?.[0]).not.toHaveAttribute('data-ch-tone')
  })

  it('draws magnitudes for negative values and keeps the sign in the text', () => {
    const { container } = renderRanked({
      data: [
        { name: 'Discount', amount: -260 },
        { name: 'Materials', amount: -100 },
      ],
      format: 'currency',
      tone: 'loss',
    })
    const [big, small] = parts(container, '[data-ch-part="bar"]')
    expect(Number(big?.getAttribute('width'))).toBeGreaterThan(Number(small?.getAttribute('width')))
    expect(big).toHaveAttribute('data-ch-dir', 'right')
    expect([...(values(container) ?? [])].map((t) => t.textContent)).toEqual(['−$260', '−$100'])
    expect(values(container)?.[0]).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('stacks the label above a thin bar in the stacked layout', () => {
    const { container } = renderRanked({ layout: 'stacked' })
    const label = parts(container, '[data-ch-part="row-label"]')[0]
    expect(label).toHaveAttribute('dominant-baseline', 'hanging')
    expect(label).toHaveAttribute('y', '0')
    const bar = parts(container, '[data-ch-part="bar"]')[0]
    expect(bar).toHaveAttribute('height', '6')
    expect(bar).toHaveAttribute('y', '46')
  })

  it('shows muted meta text before the value', () => {
    const { container } = renderRanked({
      data: causes.map((c, i) => ({ ...c, jobs: `${i + 3} jobs` })),
      meta: 'jobs',
    })
    const muted = parts(container, '[data-ch-part="row-label"][data-ch-muted="true"]')
    expect(muted.map((t) => t.textContent)).toEqual(['4 jobs', '5 jobs', '3 jobs'])
  })

  it('keeps the full label for screen readers when it is cut', () => {
    const name = 'A very long cause name that will not fit'
    const { container } = renderRanked({ data: [{ name, amount: 5 }], labelWidth: 100 })
    expect(names(container)[0]).toMatch(/…$/)
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'ArrowDown' })
    expect(container.querySelector('[aria-live]')?.textContent).toContain(name)
    expect(within(screen.getByRole('table')).getByText(name)).toBeInTheDocument()
  })

  it('skips the bar but keeps the label for a missing value', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderRanked({ data: [...causes, { name: 'Unbilled', amount: null }] })
    expect(names(container)).toEqual([
      'Labor overruns',
      'Material variance',
      'Callbacks',
      'Unbilled',
    ])
    expect(parts(container, '[data-ch-part="bar"]')).toHaveLength(3)
    expect(container.textContent).not.toContain('NaN')
  })

  it('renders a hidden data table in display order', () => {
    renderRanked()
    const table = screen.getByRole('table', { name: 'Leakage by cause' })
    const cells = within(table)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells.slice(0, 2)).toEqual(['Labor overruns', '$31.2K'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/RankedBars.test.tsx`
Expected: FAIL, because `./RankedBars` doesn't exist.

- [ ] **Step 3: Implement**

Create `packages/tally-charts/src/react/charts/RankedBars.tsx`:

```tsx
import { useMemo } from 'react'
import { resolveAccessor, resolvePerItem } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { inferLinearDomain } from '../../core/scale'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Bars } from '../marks/Bars'
import { RowLabels } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import { type ChartPassThroughProps, headerOf, toNumber } from './shared'

export interface RankedBarsProps<D> extends Omit<ChartPassThroughProps<D>, 'aspectRatio'> {
  data: readonly D[]
  label: Accessor<D, string>
  value: Accessor<D, number>
  /** Row id passed to onSelect and compared with selectedId. Default: the data index. */
  id?: Accessor<D, Id>
  /** Muted text before the value, e.g. "9 jobs". */
  meta?: Accessor<D, string>
  /** 'inline': label | bar | value on one line. 'stacked': label and value above a thin bar. Default 'inline'. */
  layout?: 'inline' | 'stacked'
  /** By size of the value, ignoring its sign. Default 'desc'. */
  sort?: 'desc' | 'asc' | 'none'
  /** Show only the first rows after sorting. */
  limit?: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Domain of bar lengths. Default: zero to the largest magnitude. */
  domain?: readonly [number, number]
  /** Default 'neutral'. A non-neutral tone also colors the value text. */
  tone?: PerItem<D, Tone>
  /** Default 'hatch'. */
  fill?: PerItem<D, Fill>
  /** The highlighted row. Hover and focus stay separate (`activeId`). */
  selectedId?: Id | null
  /** Tone of the selected row's bar and value. Default 'loss'. */
  selectedTone?: Tone
  /** Default 40 (inline) or 52 (stacked). */
  rowHeight?: number
  /** Default 12 (inline) or 6 (stacked). */
  barSize?: number
  /** Inline label column width in px (default 140). In the stacked layout, a max label width. */
  labelWidth?: number
  /** Inline value column width in px. Default 72. */
  valueWidth?: number
  /** Meta column width in px. Default 64. */
  metaWidth?: number
  /** Faint track behind each bar. Default true. */
  track?: boolean
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default false: the values are already on screen. */
  tooltip?: boolean
}

interface RankedRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  label: string
  meta: string
  value: number
  magnitude: number
  text: string
  tone: Tone
  fill: Fill
  selected: boolean
}

/** Horizontal padding inside each row, in px. */
const PAD = 12

function SelectedRow({ rowKey }: { rowKey: string | null }) {
  const ctx = useChart('RankedBars')
  if (rowKey === null || ctx.y.kind !== 'band') return null
  const start = ctx.y.scale(rowKey)
  if (start === undefined) return null
  return (
    <rect
      data-ch-part="row-highlight"
      x={-ctx.margin.left}
      y={start}
      width={ctx.width}
      height={ctx.y.scale.bandwidth()}
      rx={12}
    />
  )
}

export function RankedBars<D>({
  data,
  label,
  value,
  id,
  meta,
  layout = 'inline',
  sort = 'desc',
  limit,
  format,
  domain,
  tone,
  fill,
  selectedId,
  selectedTone = 'loss',
  rowHeight,
  barSize,
  labelWidth,
  valueWidth = 72,
  metaWidth = 64,
  track = true,
  dataTable = true,
  tooltip = false,
  margin,
  height,
  children,
  ...chart
}: RankedBarsProps<D>) {
  const { create } = useFormat()
  const fmt = useMemo(() => create(format), [create, format])
  const stacked = layout === 'stacked'
  const rowH = rowHeight ?? (stacked ? 52 : 40)
  const size = barSize ?? (stacked ? 6 : 12)
  const labelW = labelWidth ?? (stacked ? 0 : 140)

  const rows = useMemo(() => {
    const getLabel = resolveAccessor(label)
    const getValue = resolveAccessor(value)
    const getId = id ? resolveAccessor(id) : undefined
    const getMeta = meta ? resolveAccessor(meta) : undefined
    const toneOf = resolvePerItem<D, Tone>(tone ?? 'neutral')
    const fillOf = resolvePerItem<D, Fill>(fill ?? 'hatch')
    const all = data.map((d, i): RankedRow<D> => {
      const v = toNumber(getValue(d, i))
      const rowId = getId ? getId(d, i) : i
      const selected = selectedId !== undefined && selectedId !== null && rowId === selectedId
      return {
        key: String(i),
        rowId,
        datum: d,
        index: i,
        label: String(getLabel(d, i) ?? ''),
        meta: getMeta ? String(getMeta(d, i) ?? '') : '',
        value: v,
        magnitude: Math.abs(v),
        text: fmt(v),
        tone: selected ? selectedTone : toneOf(d, i, data),
        fill: fillOf(d, i, data),
        selected,
      }
    })
    if (sort !== 'none') {
      // Missing values go last; Array.prototype.sort is stable, so ties keep data order.
      all.sort((a, b) => {
        const fa = Number.isFinite(a.magnitude)
        const fb = Number.isFinite(b.magnitude)
        if (fa !== fb) return fa ? -1 : 1
        if (!fa) return 0
        return sort === 'asc' ? a.magnitude - b.magnitude : b.magnitude - a.magnitude
      })
    }
    return limit === undefined ? all : all.slice(0, Math.max(0, limit))
  }, [data, label, value, id, meta, tone, fill, selectedId, selectedTone, sort, limit, fmt])

  const resolvedDomain = domain ?? inferLinearDomain(rows.map((r) => r.magnitude))
  const metaSpace = meta ? metaWidth : 0
  const m: Margin = stacked
    ? { top: 0, bottom: 0, left: PAD, right: PAD, ...margin }
    : { top: 0, bottom: 0, left: labelW, right: valueWidth + metaSpace, ...margin }
  const position = stacked ? 'above' : 'middle'
  const selectedKey = rows.find((r) => r.selected)?.key ?? null
  const valueTone = (r: RankedRow<D>): Tone | undefined =>
    r.selected ? selectedTone : r.tone === 'neutral' ? undefined : r.tone

  let table: DataTableSpec<RankedRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<RankedRow<D>>[] = [
      { header: headerOf(label, 'Item'), value: (r) => r.label },
      { header: headerOf(value, 'Value'), value: (r) => r.text },
    ]
    if (meta) columns.push({ header: headerOf(meta, 'Details'), value: (r) => r.meta })
    table = { columns }
  }

  return (
    <Chart<RankedRow<D>>
      {...chart}
      data={rows}
      x={{ field: 'magnitude', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, rows.length) * rowH + m.top + m.bottom}
      dataTable={table}
    >
      <SelectedRow rowKey={selectedKey} />
      <Bars<RankedRow<D>>
        data={rows}
        x="magnitude"
        id="rowId"
        label="label"
        tone={(r) => r.tone}
        fill={(r) => r.fill}
        size={size}
        align={stacked ? 'end' : 'center'}
        radius={size / 2}
        track={track}
        format={format}
        ariaLabel={(r) => (r.meta ? `${r.label}, ${r.text}, ${r.meta}` : `${r.label}, ${r.text}`)}
        tooltip={(r) => [{ value: r.label }, { value: r.text, tone: valueTone(r) }]}
      />
      <RowLabels<RankedRow<D>>
        text="label"
        position={position}
        inset={PAD}
        maxWidth={labelW > 0 ? labelW - PAD : undefined}
      />
      {meta ? (
        <RowLabels<RankedRow<D>>
          side="right"
          text="meta"
          muted
          position={position}
          inset={stacked ? PAD + metaWidth : PAD + valueWidth}
        />
      ) : null}
      <RowLabels<RankedRow<D>>
        side="right"
        text="text"
        position={position}
        inset={PAD}
        tone={valueTone}
      />
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

All text columns sit `PAD` px in from the chart's outer edges, which are also the edges of the row highlight (`-margin.left … width`).
- In the stacked layout the margins are `PAD`, so labels start at the plot's left edge and values end at its right edge, aligned with the track.
- In the inline layout the label column starts `PAD` px inside the chart.

Expected positions in the stacked test:
- label `y = 0`, hanging
- bar `height = 6`, `y = 52 - 6 = 46`, because of `align: 'end'`

- [ ] **Step 4: Style the highlight**

In `packages/tally-charts/src/theme/theme.css`, add after the `[data-ch-part="row-divider"]` rule:

```css
[data-ch-part="row-highlight"] {
  fill: var(--ch-tooltip-bg);
  filter: drop-shadow(0 1px 3px rgb(0 0 0 / 0.08));
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: RankedBars (inline and stacked, selectable rows)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 12: `Delta` and `Stat`

**Files:**
- Create: `packages/tally-charts/src/react/ui/util.ts`
- Test: `packages/tally-charts/src/react/ui/util.test.ts`
- Create: `packages/tally-charts/src/react/ui/Delta.tsx`
- Test: `packages/tally-charts/src/react/ui/Delta.test.tsx`
- Create: `packages/tally-charts/src/react/ui/Stat.tsx`
- Test: `packages/tally-charts/src/react/ui/Stat.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Test: `packages/tally-charts/src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `useFormat().create(spec, { signed })` from `ChartsProvider`, `Tone`.
- Produces:
  - `util.ts`:
    - `toPercent(value, min, max): number`, clamped to 0–100, and 0 for bad input or `max === min`
    - `cx(base: string, extra?: string): string`
    - `toneVar(tone: Tone): CSSProperties`, which sets `--ch-swatch-color`
  - `Delta(props: DeltaProps)` and `type DeltaDirection = 'up' | 'down' | 'flat'`.
  - `Stat(props: StatProps)`.
  - The CSS class `ch-tone-text` and the token `--ch-tone-text-mix: 55%`.

**Colored text and contrast:** the six tone colors are tuned for fills. For text in HTML, mixing the tone 55% with `--ch-ink` keeps every tone at or above 4.5:1 on `--ch-surface` in the light theme. That was checked for all six tones, `accent-soft` and `warn` being the tightest. In the dark theme the mix lightens the tone. SVG text inside charts keeps the pure tone, because it's part of an `aria-hidden` graphic and matches the reference.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/ui/util.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cx, toneVar, toPercent } from './util'

describe('ui utils', () => {
  it('maps a value onto 0–100 and clamps it', () => {
    expect(toPercent(30, 20, 40)).toBe(50)
    expect(toPercent(50, 20, 40)).toBe(100)
    expect(toPercent(0, 20, 40)).toBe(0)
  })

  it('returns 0 for bad input or an empty range', () => {
    expect(toPercent(Number.NaN, 0, 10)).toBe(0)
    expect(toPercent(5, 10, 10)).toBe(0)
  })

  it('joins class names and builds the swatch variable', () => {
    expect(cx('ch-a')).toBe('ch-a')
    expect(cx('ch-a', 'mine')).toBe('ch-a mine')
    expect(toneVar('loss')).toEqual({ '--ch-swatch-color': 'var(--ch-loss)' })
  })
})
```

Create `packages/tally-charts/src/react/ui/Delta.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartsProvider } from '../ChartsProvider'
import { Delta } from './Delta'

const delta = (root: HTMLElement) => root.querySelector('[data-ch-part="delta"]')

describe('<Delta>', () => {
  it('shows a falling value with a down arrow in the loss tone', () => {
    const { container } = render(<Delta value={-1.2} format="pts" />)
    expect(delta(container)).toHaveAttribute('data-ch-direction', 'down')
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'loss')
    expect(delta(container)).toHaveTextContent('▼Down 1.2 pts')
  })

  it('uses the gain tone for a rise when up is good', () => {
    const { container } = render(<Delta value={6.2} format="percent" />)
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'gain')
    expect(delta(container)).toHaveTextContent('▲Up 6.2%')
  })

  it('flips the tone when down is good and can show the sign', () => {
    const { container } = render(<Delta value={34} format="percent" good="down" signed />)
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'loss')
    expect(delta(container)).toHaveTextContent('+34.0%')
  })

  it('shows no change in the neutral tone for zero', () => {
    const { container } = render(<Delta value={0} format="percent" />)
    expect(delta(container)).toHaveAttribute('data-ch-direction', 'flat')
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'neutral')
    expect(delta(container)).toHaveTextContent('–No change 0.0%')
  })

  it('honors an explicit tone', () => {
    const { container } = render(<Delta value={2} tone="warn" />)
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'warn')
  })

  it('keeps the arrow out of the accessibility tree', () => {
    const { container } = render(<Delta value={2} />)
    expect(container.querySelector('.ch-delta-arrow')).toHaveAttribute('aria-hidden', 'true')
  })

  it('formats with the ChartsProvider locale', () => {
    const { container } = render(
      <ChartsProvider locale="de-DE">
        <Delta value={1234.5} />
      </ChartsProvider>,
    )
    expect(delta(container)).toHaveTextContent('1.234,5')
  })

  it('renders nothing for a non-finite value', () => {
    const { container } = render(<Delta value={Number.NaN} />)
    expect(delta(container)).toBeNull()
  })
})
```

Create `packages/tally-charts/src/react/ui/Stat.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Delta } from './Delta'
import { Stat } from './Stat'

const part = (root: HTMLElement, selector: string) => root.querySelector(selector)

describe('<Stat>', () => {
  it('formats a number and shows label, delta and caption', () => {
    const { container } = render(
      <Stat
        value={34}
        format="percent"
        label="Gross margin"
        delta={<Delta value={-1.2} format="pts" />}
        caption="vs last week"
      />,
    )
    expect(part(container, '.ch-stat-value')).toHaveTextContent('34.0%')
    expect(part(container, '.ch-stat-label')).toHaveTextContent('Gross margin')
    expect(part(container, '[data-ch-part="delta"]')).not.toBeNull()
    expect(part(container, '.ch-stat-caption')).toHaveTextContent('vs last week')
    expect(part(container, '[data-ch-part="stat"]')).toHaveAttribute('data-ch-size', 'lg')
  })

  it('shows preformatted text as is and tints the value by tone', () => {
    const { container } = render(<Stat value="$51K" tone="loss" size="md" />)
    const value = part(container, '.ch-stat-value')
    expect(value).toHaveTextContent('$51K')
    expect(value).toHaveAttribute('data-ch-tone', 'loss')
    expect(value).toHaveClass('ch-tone-text')
    expect(part(container, '.ch-stat-meta')).toBeNull()
  })

  it('shows a dash for a non-finite number', () => {
    const { container } = render(<Stat value={Number.NaN} />)
    expect(part(container, '.ch-stat-value')).toHaveTextContent('–')
  })
})
```

In `packages/tally-charts/src/theme/theme.test.ts`, add `'--ch-tone-text-mix:'` to the list in the `'defines %s'` test.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui src/theme/theme.test.ts`
Expected: FAIL. The modules are missing, and so is the token.

- [ ] **Step 3: Implement `util.ts`**

Create `packages/tally-charts/src/react/ui/util.ts`:

```ts
import type { CSSProperties } from 'react'
import type { Tone } from '../../core/types'

/** Position of `value` between `min` and `max` as a percentage, clamped to 0–100. */
export function toPercent(value: number, min: number, max: number): number {
  if (![value, min, max].every(Number.isFinite) || max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export function cx(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base
}

/** Points `--ch-swatch-color` at a tone, so CSS can paint fills and tinted text with it. */
export function toneVar(tone: Tone): CSSProperties {
  return { '--ch-swatch-color': `var(--ch-${tone})` } as CSSProperties
}
```

- [ ] **Step 4: Implement `Delta`**

Create `packages/tally-charts/src/react/ui/Delta.tsx`:

```tsx
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export type DeltaDirection = 'up' | 'down' | 'flat'

export interface DeltaProps {
  /** The change, e.g. -1.2 for "▼ 1.2 pts". */
  value: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Which direction is good news; picks the tone when `tone` isn't set. Default 'up'. */
  good?: 'up' | 'down'
  tone?: Tone
  /** Show the sign on the number. Default false: the arrow carries the direction. */
  signed?: boolean
  className?: string
}

const ARROWS: Record<DeltaDirection, string> = { up: '▲', down: '▼', flat: '–' }
const WORDS: Record<DeltaDirection, string> = { up: 'Up', down: 'Down', flat: 'No change' }

/** A change pill: ▲/▼ plus the size of the change, toned by whether it's good news. */
export function Delta({ value, format, good = 'up', tone, signed = false, className }: DeltaProps) {
  const { create } = useFormat()
  if (!Number.isFinite(value)) return null
  const direction: DeltaDirection = value === 0 ? 'flat' : value > 0 ? 'up' : 'down'
  const resolved: Tone =
    tone ?? (direction === 'flat' ? 'neutral' : direction === good ? 'gain' : 'loss')
  const text = signed
    ? create(format, { signed: true })(value)
    : create(format, { signed: false })(Math.abs(value))
  return (
    <span
      className={cx('ch-delta', className)}
      data-ch-part="delta"
      data-ch-tone={resolved}
      data-ch-direction={direction}
      style={toneVar(resolved)}
    >
      <span aria-hidden="true" className="ch-delta-arrow ch-tone-text">
        {ARROWS[direction]}
      </span>
      <span className="ch-sr-only">{WORDS[direction]} </span>
      <span className="ch-delta-value">{text}</span>
    </span>
  )
}
```

- [ ] **Step 5: Implement `Stat`**

Create `packages/tally-charts/src/react/ui/Stat.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export interface StatProps {
  /** A number formatted with `format`, or preformatted text. */
  value: number | string
  /** Default 'number'. */
  format?: FormatSpec
  /** Small muted line above the value. */
  label?: ReactNode
  /** Usually a <Delta>, shown under the value. */
  delta?: ReactNode
  /** Muted text after the delta, e.g. "vs last week". */
  caption?: ReactNode
  /** Default 'lg'. */
  size?: 'lg' | 'md' | 'sm'
  /** Color role of the value. Default: ink. */
  tone?: Tone
  className?: string
}

/** A headline number with an optional label, change and caption. */
export function Stat({
  value,
  format,
  label,
  delta,
  caption,
  size = 'lg',
  tone,
  className,
}: StatProps) {
  const { create } = useFormat()
  const text =
    typeof value === 'number' ? (Number.isFinite(value) ? create(format)(value) : '–') : value
  return (
    <div className={cx('ch-stat', className)} data-ch-part="stat" data-ch-size={size}>
      {label ? <div className="ch-stat-label">{label}</div> : null}
      <div
        className={tone ? 'ch-stat-value ch-tone-text' : 'ch-stat-value'}
        data-ch-tone={tone}
        style={tone ? toneVar(tone) : undefined}
      >
        {text}
      </div>
      {delta || caption ? (
        <div className="ch-stat-meta">
          {delta}
          {caption ? <span className="ch-stat-caption">{caption}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 6: Add the styles**

In `packages/tally-charts/src/theme/theme.css`:

Add to the theme-independent `:root` block after `--ch-dim-opacity`:

```css
  /* Share of the tone in colored HTML text; the rest is --ch-ink, which keeps contrast ≥ 4.5:1. */
  --ch-tone-text-mix: 55%;
```

Add before the `/* ---------- Motion off ---------- */` section:

```css
/* ---------- Small UI pieces ---------- */
.ch-tone-text {
  color: color-mix(in srgb, var(--ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink));
}

.ch-delta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ch-tooltip-bg);
  box-shadow: 0 0 0 1px var(--ch-grid);
  color: var(--ch-ink);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  font-variant-numeric: var(--ch-font-numeric);
}

.ch-delta-arrow {
  font-size: 0.7em;
}

.ch-stat {
  display: grid;
  gap: 12px;
  color: var(--ch-ink);
  font-variant-numeric: var(--ch-font-numeric);
}

.ch-stat-label {
  color: var(--ch-ink-muted);
  font-size: 14px;
}

.ch-stat-value {
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1;
}

.ch-stat[data-ch-size="lg"] .ch-stat-value {
  font-size: 72px;
}

.ch-stat[data-ch-size="md"] .ch-stat-value {
  font-size: 40px;
}

.ch-stat[data-ch-size="sm"] .ch-stat-value {
  font-size: 28px;
}

.ch-stat-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: var(--ch-ink-muted);
  font-size: 15px;
}
```

- [ ] **Step 7: Run the tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Delta and Stat

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: `Meter`, `RangeMeter`, `InlineBar`, `DotCount`

**Files:**
- Create: `packages/tally-charts/src/react/ui/Meter.tsx`, `RangeMeter.tsx`, `InlineBar.tsx`, `DotCount.tsx`
- Test: `packages/tally-charts/src/react/ui/Meter.test.tsx`, `RangeMeter.test.tsx`, `InlineBar.test.tsx`, `DotCount.test.tsx`
- Modify: `packages/tally-charts/src/react/ui/Legend.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `toPercent`, `cx` and `toneVar` (Task 12), `useFormat`, `Tone` and `Fill`.
- Produces:
  - `Meter(props: MeterProps)` with `role="meter"`.
  - `RangeMeter(props: RangeMeterProps)`, `InlineBar(props: InlineBarProps)` and `DotCount(props: DotCountProps)`, each with `role="img"` and a text label.
  - A shared CSS class `ch-fillable`, which paints `--ch-swatch-color` solid or hatched from `data-ch-fill`. `Legend` swatches use it too, so all HTML hatching is one rule.

References:
- `01`: the Gross margin meter (`Meter`)
- `03`: the Result card's "Actual 12.3% … Estimated 36.0%" (`RangeMeter`)
- `02`: the table margin cells (`InlineBar`)
- `05`: "•••• 29 jobs" (`DotCount`)

Labels that sit at a percentage use `left: p%` with `transform: translateX(-p%)`. A label at 0% is left-aligned, a label at 100% is right-aligned, and anything between slides smoothly, so labels never overflow the piece.

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/ui/Meter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Meter } from './Meter'

describe('<Meter>', () => {
  it('exposes a named meter with its value and target', () => {
    render(<Meter value={34} min={20} max={45} target={38} format="percent" label="Gross margin" />)
    const meter = screen.getByRole('meter', { name: 'Gross margin' })
    expect(meter).toHaveAttribute('aria-valuenow', '34')
    expect(meter).toHaveAttribute('aria-valuemin', '20')
    expect(meter).toHaveAttribute('aria-valuemax', '45')
    expect(meter).toHaveAttribute('aria-valuetext', '34.0%, target 38.0%')
  })

  it('fills to the value and puts the tick at the target', () => {
    const { container } = render(<Meter value={30} min={20} max={40} target={35} label="m" />)
    expect(container.querySelector('.ch-meter-fill')).toHaveStyle({ width: '50%' })
    expect(container.querySelector('[data-ch-part="meter-target"]')).toHaveStyle({ left: '75%' })
  })

  it('hatches the fill in the tone by default', () => {
    const { container } = render(<Meter value={30} label="m" />)
    const fill = container.querySelector('.ch-meter-fill')
    expect(fill).toHaveAttribute('data-ch-fill', 'hatch')
    expect(fill).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('labels the start and the target, and hides labels set to null', () => {
    const { container, rerender } = render(
      <Meter value={34} min={20} max={45} target={38} format="percent" label="m" />,
    )
    expect(container.querySelector('.ch-meter-labels')).toHaveTextContent('20.0%Target 38.0%')
    rerender(
      <Meter
        value={34}
        min={20}
        max={45}
        target={38}
        label="m"
        minLabel="20%"
        targetLabel={null}
      />,
    )
    expect(container.querySelector('.ch-meter-labels')).toHaveTextContent('20%')
    expect(container.querySelector('.ch-meter-target-label')).toBeNull()
  })

  it('clamps out-of-range values and survives bad input', () => {
    const { container, rerender } = render(<Meter value={60} label="m" />)
    expect(container.querySelector('.ch-meter-fill')).toHaveStyle({ width: '100%' })
    rerender(<Meter value={Number.NaN} label="m" />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
    expect(meter).toHaveAttribute('aria-valuetext', 'No data')
    expect(container.querySelector('.ch-meter-fill')).toHaveStyle({ width: '0%' })
  })
})
```

Create `packages/tally-charts/src/react/ui/RangeMeter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RangeMeter } from './RangeMeter'

describe('<RangeMeter>', () => {
  it('describes both values in its accessible name', () => {
    render(<RangeMeter value={10} reference={30} max={40} format="percent" label="Margin" />)
    expect(screen.getByRole('img', { name: 'Margin: 10.0% against 30.0%' })).toBeInTheDocument()
  })

  it('places the dot, the ring and the hatched gap between them', () => {
    const { container } = render(<RangeMeter value={10} reference={30} max={40} label="m" />)
    expect(container.querySelector('.ch-range-dot')).toHaveStyle({ left: '25%' })
    expect(container.querySelector('.ch-range-ring')).toHaveStyle({ left: '75%' })
    const gap = container.querySelector('.ch-range-gap')
    expect(gap).toHaveStyle({ left: '25%', width: '50%' })
    expect(gap).toHaveAttribute('data-ch-fill', 'hatch')
  })

  it('works when the value is above the reference', () => {
    const { container } = render(<RangeMeter value={30} reference={10} max={40} label="m" />)
    expect(container.querySelector('.ch-range-gap')).toHaveStyle({ left: '25%', width: '50%' })
  })

  it('shows custom labels above and the scale below', () => {
    const { container, rerender } = render(
      <RangeMeter
        value={12.3}
        reference={36}
        max={40}
        format="percent"
        label="m"
        valueLabel="Actual 12.3%"
        referenceLabel="Estimated 36.0%"
      />,
    )
    expect(container.querySelector('.ch-range-value-label')).toHaveTextContent('Actual 12.3%')
    expect(container.querySelector('.ch-range-ref-label')).toHaveTextContent('Estimated 36.0%')
    expect(container.querySelector('.ch-range-scale')).toHaveTextContent('0.0%40.0%')
    rerender(<RangeMeter value={12.3} reference={36} max={40} label="m" showScale={false} />)
    expect(container.querySelector('.ch-range-scale')).toBeNull()
  })
})
```

Create `packages/tally-charts/src/react/ui/InlineBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InlineBar } from './InlineBar'

describe('<InlineBar>', () => {
  it('is a labelled image with the value and the target', () => {
    render(<InlineBar value={10} max={40} target={30} label="Margin" />)
    expect(screen.getByRole('img', { name: 'Margin: 10, target 30' })).toBeInTheDocument()
  })

  it('fills to the value, ticks the target and takes a fixed width', () => {
    const { container } = render(<InlineBar value={10} max={40} target={30} label="m" />)
    expect(container.querySelector('[data-ch-part="inline-bar"]')).toHaveStyle({ width: '64px' })
    expect(container.querySelector('.ch-inline-bar-fill')).toHaveStyle({ width: '25%' })
    expect(container.querySelector('.ch-inline-bar-target')).toHaveStyle({ left: '75%' })
  })

  it('defaults to a hatched loss fill and omits the tick without a target', () => {
    const { container } = render(<InlineBar value={10} max={40} label="m" />)
    const fill = container.querySelector('.ch-inline-bar-fill')
    expect(fill).toHaveAttribute('data-ch-fill', 'hatch')
    expect(fill).toHaveAttribute('data-ch-tone', 'loss')
    expect(container.querySelector('.ch-inline-bar-target')).toBeNull()
  })
})
```

Create `packages/tally-charts/src/react/ui/DotCount.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DotCount } from './DotCount'

const dots = (root: HTMLElement) => root.querySelectorAll('.ch-dot')

describe('<DotCount>', () => {
  it('draws one dot per item and labels the count', () => {
    const { container } = render(<DotCount count={29} label="29 jobs" />)
    expect(dots(container)).toHaveLength(29)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('29 jobs')
    expect(container.querySelector('.ch-dot-grid')).toHaveAttribute('aria-hidden', 'true')
  })

  it('caps the dots at max but keeps the full count in the label', () => {
    const { container } = render(<DotCount count={40} max={10} />)
    expect(dots(container)).toHaveLength(10)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('40')
  })

  it('wraps rows at perRow', () => {
    const { container } = render(<DotCount count={4} perRow={15} />)
    expect(container.querySelector('.ch-dot-grid')).toHaveStyle({
      gridTemplateColumns: 'repeat(15, 8px)',
    })
  })

  it('keeps the count readable when the label is hidden', () => {
    const { container } = render(<DotCount count={3} label={null} />)
    expect(container.querySelector('.ch-dot-count-label')).toBeNull()
    expect(container.querySelector('.ch-sr-only')).toHaveTextContent('3')
  })

  it('draws nothing for a bad count', () => {
    const { container } = render(<DotCount count={Number.NaN} />)
    expect(dots(container)).toHaveLength(0)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('0')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui`
Expected: FAIL; the four modules are missing.

- [ ] **Step 3: Implement `Meter`**

Create `packages/tally-charts/src/react/ui/Meter.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface MeterProps {
  value: number
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Draws a tick and, by default, a "Target …" label. */
  target?: number
  /** Default 'accent'. */
  tone?: Tone
  /** Default 'hatch'. */
  fill?: Fill
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  /** Text under the start. Default: the formatted `min`. `null` hides it. */
  minLabel?: ReactNode | null
  /** Text under the target tick. Default "Target <formatted target>". `null` hides it. */
  targetLabel?: ReactNode | null
  className?: string
}

/** Progress toward a target: a filled track with a target tick. */
export function Meter({
  value,
  min = 0,
  max = 100,
  target,
  tone = 'accent',
  fill = 'hatch',
  format,
  label,
  minLabel,
  targetLabel,
  className,
}: MeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const finite = Number.isFinite(value)
  const p = finite ? toPercent(value, min, max) : 0
  const t = target === undefined ? undefined : toPercent(target, min, max)
  const valueText = !finite
    ? 'No data'
    : target === undefined
      ? fmt(value)
      : `${fmt(value)}, target ${fmt(target)}`
  const showMin = minLabel !== null
  const showTarget = t !== undefined && target !== undefined && targetLabel !== null
  return (
    <div className={cx('ch-meter', className)} data-ch-part="meter" style={toneVar(tone)}>
      <div
        className="ch-meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={finite ? value : min}
        aria-valuetext={valueText}
      >
        <div
          className="ch-meter-fill ch-fillable"
          data-ch-tone={tone}
          data-ch-fill={fill}
          style={{ width: `${p}%` }}
        />
        {t !== undefined ? (
          <div className="ch-meter-target" data-ch-part="meter-target" style={{ left: `${t}%` }} />
        ) : null}
      </div>
      {showMin || showTarget ? (
        <div className="ch-meter-labels" aria-hidden="true">
          {showMin ? <span>{minLabel ?? fmt(min)}</span> : null}
          {showTarget ? (
            <span
              className="ch-meter-target-label"
              style={{ left: `${t}%`, transform: `translateX(-${t}%)` }}
            >
              {targetLabel ?? `Target ${fmt(target)}`}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Implement `RangeMeter`**

Create `packages/tally-charts/src/react/ui/RangeMeter.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface RangeMeterProps {
  /** The actual value: a filled dot. */
  value: number
  /** The planned or estimated value: an empty ring. */
  reference: number
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Dot, gap and value label color. Default 'loss'. */
  tone?: Tone
  /** Ring color. Default 'accent'. */
  referenceTone?: Tone
  /** Default 'number'. */
  format?: FormatSpec
  /** Start of the accessible name, e.g. "Margin". */
  label: string
  /** Text above the dot. Default: the formatted value. */
  valueLabel?: ReactNode
  /** Text above the ring. Default: the formatted reference. */
  referenceLabel?: ReactNode
  /** Min and max labels under the track. Default true. */
  showScale?: boolean
  className?: string
}

const at = (p: number): CSSProperties => ({ left: `${p}%`, transform: `translateX(-${p}%)` })

/** Actual against plan on one track: dot → hatched gap → ring. */
export function RangeMeter({
  value,
  reference,
  min = 0,
  max = 100,
  tone = 'loss',
  referenceTone = 'accent',
  format,
  label,
  valueLabel,
  referenceLabel,
  showScale = true,
  className,
}: RangeMeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const pv = toPercent(value, min, max)
  const pr = toPercent(reference, min, max)
  const lo = Math.min(pv, pr)
  const hi = Math.max(pv, pr)
  const style = {
    ...toneVar(tone),
    '--ch-range-ref-color': `var(--ch-${referenceTone})`,
  } as CSSProperties
  return (
    <div
      className={cx('ch-range', className)}
      data-ch-part="range-meter"
      role="img"
      aria-label={`${label}: ${fmt(value)} against ${fmt(reference)}`}
      style={style}
    >
      <div className="ch-range-labels" aria-hidden="true">
        <span className="ch-range-value-label ch-tone-text" style={at(pv)}>
          {valueLabel ?? fmt(value)}
        </span>
        <span className="ch-range-ref-label" style={at(pr)}>
          {referenceLabel ?? fmt(reference)}
        </span>
      </div>
      <div className="ch-range-track" aria-hidden="true">
        <span
          className="ch-range-gap ch-fillable"
          data-ch-fill="hatch"
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
        />
        <span className="ch-range-dot" style={{ left: `${pv}%` }} />
        <span className="ch-range-ring" style={{ left: `${pr}%` }} />
      </div>
      {showScale ? (
        <div className="ch-range-scale" aria-hidden="true">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Implement `InlineBar`**

Create `packages/tally-charts/src/react/ui/InlineBar.tsx`:

```tsx
import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface InlineBarProps {
  value: number
  max: number
  /** Default 0. */
  min?: number
  /** Draws a target tick. */
  target?: number
  /** Default 'loss'. */
  tone?: Tone
  /** Default 'hatch'. */
  fill?: Fill
  /** Width in px. Default 64. */
  width?: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Start of the accessible name, e.g. "Margin". */
  label: string
  className?: string
}

/** A small bar for table cells, with an optional target tick. */
export function InlineBar({
  value,
  max,
  min = 0,
  target,
  tone = 'loss',
  fill = 'hatch',
  width = 64,
  format,
  label,
  className,
}: InlineBarProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const p = toPercent(value, min, max)
  const t = target === undefined ? undefined : toPercent(target, min, max)
  const name =
    target === undefined ? `${label}: ${fmt(value)}` : `${label}: ${fmt(value)}, target ${fmt(target)}`
  return (
    <span
      className={cx('ch-inline-bar', className)}
      data-ch-part="inline-bar"
      role="img"
      aria-label={name}
      style={{ ...toneVar(tone), width }}
    >
      <span
        className="ch-inline-bar-fill ch-fillable"
        data-ch-tone={tone}
        data-ch-fill={fill}
        style={{ width: `${p}%` }}
      />
      {t !== undefined ? <span className="ch-inline-bar-target" style={{ left: `${t}%` }} /> : null}
    </span>
  )
}
```

- [ ] **Step 6: Implement `DotCount`**

Create `packages/tally-charts/src/react/ui/DotCount.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Tone } from '../../core/types'
import { cx, toneVar } from './util'

export interface DotCountProps {
  count: number
  /** Most dots drawn; the label still shows the full count. Default 30. */
  max?: number
  /** Dots per row. Default 15. */
  perRow?: number
  /** Default 'loss'. */
  tone?: Tone
  /** Text after the dots. Default: the count. `null` hides it (the count stays readable). */
  label?: ReactNode | null
  className?: string
}

/** A count drawn as a small field of dots, e.g. "•••••• 29 jobs". */
export function DotCount({
  count,
  max = 30,
  perRow = 15,
  tone = 'loss',
  label,
  className,
}: DotCountProps) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const drawn = Math.min(n, Math.max(0, Math.floor(max)))
  return (
    <span className={cx('ch-dot-count', className)} data-ch-part="dot-count" style={toneVar(tone)}>
      <span
        className="ch-dot-grid"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, perRow)}, 8px)` }}
      >
        {Array.from({ length: drawn }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dots are identical and positional
          <span key={i} className="ch-dot" />
        ))}
      </span>
      {label === null ? (
        <span className="ch-sr-only">{n}</span>
      ) : (
        <span className="ch-dot-count-label">{label ?? n}</span>
      )}
    </span>
  )
}
```

- [ ] **Step 7: Share the HTML fill rule with `Legend`**

In `packages/tally-charts/src/react/ui/Legend.tsx`, change the swatch class to `className="ch-swatch ch-fillable"`.

In `packages/tally-charts/src/theme/theme.css`, replace the rule whose selector is `.ch-swatch[data-ch-fill="hatch"],\n.ch-swatch[data-ch-fill="hatch-fade"]` with the same declarations under a shared selector:

```css
/* Every HTML fill (legend swatches, meters, inline bars) paints --ch-swatch-color this way. */
.ch-fillable {
  background: var(--ch-swatch-color);
}

.ch-fillable[data-ch-fill="hatch"],
.ch-fillable[data-ch-fill="hatch-fade"] {
  /* Same stripe direction as the SVG patterns: gradient runs perpendicular to the stripes. */
  background: repeating-linear-gradient(
    calc((var(--ch-hatch-angle) + 90) * 1deg),
    var(--ch-swatch-color) 0 var(--ch-hatch-width),
    color-mix(in srgb, var(--ch-swatch-color) calc(var(--ch-hatch-tint) * 100%), transparent)
      var(--ch-hatch-width) calc(var(--ch-hatch-gap) * 1px)
  );
}
```

Keep `.ch-swatch { … background: var(--ch-swatch-color); }` as it is.

Append to the Small UI pieces section:

```css
.ch-meter {
  display: grid;
  gap: 10px;
}

.ch-meter-track,
.ch-inline-bar {
  position: relative;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ch-grid) 55%, transparent);
}

.ch-meter-track {
  height: 12px;
}

.ch-meter-fill {
  height: 100%;
  border-radius: 999px;
}

.ch-meter-target,
.ch-inline-bar-target {
  position: absolute;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--ch-ink);
}

.ch-meter-target {
  top: -6px;
  bottom: -6px;
}

.ch-meter-labels {
  position: relative;
  height: 16px;
  color: var(--ch-ink-muted);
  font-size: 13px;
}

.ch-meter-target-label {
  position: absolute;
  top: 0;
  white-space: nowrap;
}

.ch-range {
  display: grid;
  gap: 6px;
  font-variant-numeric: var(--ch-font-numeric);
}

.ch-range-labels {
  position: relative;
  height: 18px;
  font-size: 14px;
}

.ch-range-labels > span {
  position: absolute;
  top: 0;
  white-space: nowrap;
}

.ch-range-ref-label {
  color: var(--ch-ink);
}

.ch-range-track {
  position: relative;
  height: 18px;
}

.ch-range-track::before {
  content: "";
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 2px;
  margin-top: -1px;
  background: var(--ch-grid);
}

.ch-range-gap {
  position: absolute;
  top: 50%;
  height: 8px;
  margin-top: -4px;
}

.ch-range-dot,
.ch-range-ring {
  position: absolute;
  top: 50%;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
}

.ch-range-dot {
  background: var(--ch-swatch-color);
}

.ch-range-ring {
  border: 3px solid var(--ch-range-ref-color);
  background: var(--ch-surface);
}

.ch-range-scale {
  display: flex;
  justify-content: space-between;
  color: var(--ch-ink-muted);
  font-size: 12px;
}

.ch-inline-bar {
  display: inline-block;
  height: 8px;
  vertical-align: middle;
}

.ch-inline-bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 999px;
}

.ch-inline-bar-target {
  top: -5px;
  bottom: -5px;
}

.ch-dot-count {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ch-ink-muted);
  font-size: 14px;
}

.ch-dot-grid {
  display: grid;
  gap: 5px;
}

.ch-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ch-swatch-color) 45%, transparent);
}
```

- [ ] **Step 8: Run the tests**

Run: `pnpm test && pnpm test:e2e`
Expected: PASS. The legend screenshot is unchanged, because the swatch keeps the same declarations under the new class.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts/src
git commit -m "feat: Meter, RangeMeter, InlineBar and DotCount

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 14: Public exports, size budgets, SSR coverage, README

**Files:**
- Modify: `packages/tally-charts/src/index.ts`
- Test: `packages/tally-charts/src/index.test.ts`
- Modify: `packages/tally-charts/src/core/index.ts`
- Modify: `packages/tally-charts/.size-limit.json`
- Modify: `packages/tally-charts/test/fixtures.tsx`
- Test: `packages/tally-charts/src/ssr.node.test.tsx`
- Modify: `packages/tally-charts/README.md`

**Interfaces:**
- Consumes: every component and type from Tasks 1–13.
- Produces: the public 0.2 API. Nothing under `react/charts/shared.ts` is exported except the type `ChartPassThroughProps`.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/index.test.ts`, add to the `'main exports %s'` list:

```ts
    'BarChart',
    'ComparisonBars',
    'RankedBars',
    'RowLabels',
    'RowDividers',
    'DataTable',
    'Stat',
    'Delta',
    'Meter',
    'RangeMeter',
    'InlineBar',
    'DotCount',
```

and add `'truncateLabel'` to the `'core exports %s'` list.

Append to `packages/tally-charts/test/fixtures.tsx`:

```tsx
export const costLines = [
  { name: 'Labor', note: '7.5 h planned, 12.5 h worked', estimate: 640, actual: 1060 },
  { name: 'Materials', note: 'Line set, refrigerant, pad', estimate: 720, actual: 900 },
  { name: 'Subcontract', note: 'Crane and electrician', estimate: 400, actual: 400 },
]

export function EstimateVsActual() {
  return (
    <ComparisonBars
      data={costLines}
      label="name"
      sublabel="note"
      plan="estimate"
      actual="actual"
      format="currency"
      title="Estimate vs actual"
    />
  )
}

export const causes = [
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material variance', amount: 18700 },
  { name: 'Callbacks', amount: 14400 },
]

export function DrillColumn() {
  return (
    <RankedBars
      data={causes}
      label="name"
      value="amount"
      format="currency-compact"
      layout="stacked"
      selectedId={0}
      title="Leakage by cause"
    />
  )
}

export function SmallPieces() {
  return (
    <div>
      <Stat value={34} format="percent" delta={<Delta value={-1.2} format="pts" />} />
      <Meter value={34} min={20} max={45} target={38} format="percent" label="Gross margin" />
      <RangeMeter value={12.3} reference={36} max={40} format="percent" label="Margin" />
      <InlineBar value={12.3} max={40} target={38} label="Margin" />
      <DotCount count={29} label="29 jobs" />
    </div>
  )
}
```

and extend its import from `'../src'` with `ComparisonBars, Delta, DotCount, InlineBar, Meter, RangeMeter, RankedBars, Stat`.

Append inside `describe('server rendering', …)` in `packages/tally-charts/src/ssr.node.test.tsx`, and extend the fixtures import:

```tsx
  it('renders the 0.2 charts and pieces without a DOM, deterministically', () => {
    for (const Example of [EstimateVsActual, DrillColumn, SmallPieces]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
    }
    const comparison = renderToString(<EstimateVsActual />)
    expect(comparison).toContain('$640 → $1,060')
    expect(comparison).toContain('+$420')
    expect(comparison.match(/data-ch-part="bar"/g)).toHaveLength(8)
    expect(renderToString(<DrillColumn />)).toContain('data-ch-part="row-highlight"')
    expect(renderToString(<SmallPieces />)).toContain('role="meter"')
  })
```

There are 8 bars: 3 plan bars, 3 actual bars and 2 overruns (Labor and Materials).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/index.test.ts src/ssr.node.test.tsx`
Expected: FAIL; the names aren't exported from `src/index.ts`.

- [ ] **Step 3: Export**

In `packages/tally-charts/src/index.ts`, add (keep the file's alphabetical-by-path order):

```ts
export type { BarAlign } from './core/bars'
export type { BarChartProps } from './react/charts/BarChart'
export { BarChart } from './react/charts/BarChart'
export type { ComparisonBarsProps, ComparisonStatus } from './react/charts/ComparisonBars'
export { ComparisonBars } from './react/charts/ComparisonBars'
export type { RankedBarsProps } from './react/charts/RankedBars'
export { RankedBars } from './react/charts/RankedBars'
export type { ChartPassThroughProps } from './react/charts/shared'
export type { DataTableColumn, DataTableProps, DataTableSpec } from './react/DataTable'
export { DataTable } from './react/DataTable'
export type { RowDividersProps, RowLabelsProps } from './react/marks/RowLabels'
export { RowDividers, RowLabels } from './react/marks/RowLabels'
export type { DeltaDirection, DeltaProps } from './react/ui/Delta'
export { Delta } from './react/ui/Delta'
export type { DotCountProps } from './react/ui/DotCount'
export { DotCount } from './react/ui/DotCount'
export type { InlineBarProps } from './react/ui/InlineBar'
export { InlineBar } from './react/ui/InlineBar'
export type { MeterProps } from './react/ui/Meter'
export { Meter } from './react/ui/Meter'
export type { RangeMeterProps } from './react/ui/RangeMeter'
export { RangeMeter } from './react/ui/RangeMeter'
export type { StatProps } from './react/ui/Stat'
export { Stat } from './react/ui/Stat'
```

In `packages/tally-charts/src/core/index.ts`, add `BarAlign` to the `./bars` type export and add:

```ts
export { CHAR_WIDTH, truncateLabel } from './text'
```

- [ ] **Step 4: Add size budgets**

Append to the array in `packages/tally-charts/.size-limit.json`:

```json
  {
    "name": "BarChart",
    "path": "dist/index.js",
    "import": "{ BarChart }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "ComparisonBars",
    "path": "dist/index.js",
    "import": "{ ComparisonBars }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "RankedBars",
    "path": "dist/index.js",
    "import": "{ RankedBars }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  },
  {
    "name": "Small UI pieces",
    "path": "dist/index.js",
    "import": "{ Stat, Delta, Meter, RangeMeter, InlineBar, DotCount }",
    "ignore": ["react", "react-dom"],
    "limit": "4 KB",
    "gzip": true
  }
```

The spec sets the 15 KB per-chart budget. The 4 KB UI budget is this plan's choice. If any entry fails, don't raise the limit: report the measured size and the largest contributors (`pnpm --filter tally-charts exec size-limit --why` if available) as a concern.

- [ ] **Step 5: Document 0.2 in the README**

In `packages/tally-charts/README.md`:
- Change the status line to `> Status: 0.2. The API may change before 1.0.`
- Add these sections before `## Server Components`:

````md
## High-level charts

Each one is a thin composition of `<Chart>` and the building blocks, renders a hidden data table
for screen readers by default (`dataTable={false}` turns it off), and renders `children` after
its own marks.

```tsx
import { BarChart, ComparisonBars, RankedBars } from 'tally-charts'

<BarChart data={weeks} x="week" y="margin" target={{ value: 38, label: 'Target 38%' }} format="percent" />

<ComparisonBars data={costs} label="name" sublabel="note" plan="estimate" actual="actual" format="currency" />

<RankedBars data={causes} label="name" value="amount" format="currency-compact"
  layout="stacked" selectedId={selected} onSelect={(id) => setSelected(id)} />
```

- `BarChart`: history `hatch-fade`, last bar `solid`, optional target and value label; `orientation="horizontal"` puts categories on the left.
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink segment, and a `$640 → $1,060  +$420` / "On plan" column. `overIsBad={false}` for revenue-like rows.
- `RankedBars`: label, bar on a faint track, value; sorted by size; `layout="stacked"` for drill columns. Bars show magnitudes, so negative "lost" amounts extend right and keep their sign in the text. Selection uses `selectedId` + `onSelect`; ids are the original data index unless you pass `id`.

## Small pieces

HTML, styled by the same tokens: `Stat`, `Delta` (▲/▼ pill toned by `good="up" | "down"`), `Meter`
(progress + target tick), `RangeMeter` (actual dot → hatched gap → plan ring), `InlineBar`
(table-cell bar), `DotCount`, `Legend`, `TooltipPill`. Colored text mixes the tone with
`--ch-ink` (`--ch-tone-text-mix`, default 55%) to stay readable.

## Several React roots on one page

Pattern ids come from React's `useId`, which is only unique within one root. When charts render
in separate roots (islands, micro-frontends), give each chart a `chartId`.
````

- [ ] **Step 6: Build and verify everything**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS. Lint may show only the known 4 warnings and 1 info from 0.1. Record each size-limit number in the report.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: export the 0.2 charts and small pieces; size budgets and docs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Reference stories, e2e, CI and the changeset

**Files:**
- Create: `apps/storybook/stories/BarChart.stories.tsx`, `EstimateVsActual.stories.tsx`, `Result.stories.tsx`, `DrillColumns.stories.tsx`, `GrossMargin.stories.tsx`, `SmallPieces.stories.tsx`
- Modify: `apps/storybook/.storybook/preview.css`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Modify: `apps/storybook/playwright.config.ts`
- Create: `apps/storybook/e2e/__screenshots__/darwin/*.png`, `apps/storybook/e2e/__screenshots__/linux/*.png`
- Modify: `.github/workflows/ci.yml`
- Create: `.changeset/tally-charts-0-2.md`

**Interfaces:**
- Consumes: the public API from Task 14, imported from `'tally-charts'`.
- Produces:
  - Story ids used by e2e:
    - `charts-barchart--light`, `charts-barchart--dark` and `charts-barchart--horizontal`
    - `reference-estimate-vs-actual--light` and `reference-estimate-vs-actual--dark`
    - `reference-result--light` and `reference-result--dark`
    - `reference-drill-columns--light`
    - `reference-gross-margin--light` and `reference-gross-margin--dark`
    - `primitives-small-pieces--default`
  - The drill story writes `Selected cause: <name>` into `data-testid="drill-selected"`.

Data comes from the reference screenshots. The names in them are fictional sample data.

- [ ] **Step 1: Add card helpers**

Append to `apps/storybook/.storybook/preview.css`:

```css
.card-wide {
  max-width: 1040px;
}

.card-header-stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 24px;
}

.card-text {
  margin: 20px 0;
  color: var(--ch-ink-muted);
  font-size: 15px;
  line-height: 1.5;
}

.section-title {
  margin: 28px 0 12px;
  font-size: 17px;
  font-weight: 500;
}

.stat-rows {
  display: grid;
  margin: 24px 0 0;
}

.stat-rows > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--ch-grid);
  font-size: 15px;
}

.stat-rows dt {
  color: var(--ch-ink-muted);
}

.stat-rows dd {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-weight: 500;
}

.stat-rows .muted {
  color: var(--ch-ink-muted);
  font-weight: 400;
}

.total-row {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 16px 20px;
  border-radius: 16px;
  background: var(--ch-tooltip-bg);
  font-size: 16px;
}

.loss-text {
  color: color-mix(in srgb, var(--ch-loss) var(--ch-tone-text-mix), var(--ch-ink));
}

.legend-gap {
  margin-bottom: 20px;
}

.drill-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.drill-header {
  display: flex;
  justify-content: space-between;
  margin: 0 12px 8px;
  color: var(--ch-ink-muted);
  font-size: 14px;
}

.piece-grid {
  display: grid;
  gap: 16px;
}

.piece-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.piece-label {
  width: 56px;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Write the stories**

Create `apps/storybook/stories/BarChart.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BarChart } from 'tally-charts'

// The "Last 12 weeks" card from docs/reference/01-gross-margin-waterfall.png, as one component.
const weeks = [
  { week: 'Jul 6', margin: 37.5 },
  { week: 'Jul 13', margin: 36.9 },
  { week: 'Jul 20', margin: 35.6 },
  { week: 'Jul 27', margin: 37.1 },
  { week: 'Aug 3', margin: 34.9 },
  { week: 'Aug 10', margin: 33.9 },
  { week: 'Aug 17', margin: 35.1 },
  { week: 'Aug 24', margin: 33.7 },
  { week: 'Aug 31', margin: 32.6 },
  { week: 'Sep 7', margin: 35.9 },
  { week: 'Sep 14', margin: 36.6 },
  { week: 'Sep 21', margin: 34.0 },
]

function TwelveWeeks({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  return (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Last 12 weeks</h2>
        <span className="card-meta">Margin by week</span>
      </header>
      <BarChart
        data={weeks}
        x="week"
        y="margin"
        orientation={orientation}
        domain={[26, 40]}
        target={{ value: 38, label: 'Target 38%' }}
        height={orientation === 'vertical' ? 260 : undefined}
        format="percent"
        valueFormat={(v) => v.toFixed(1)}
        title="Margin by week, last 12 weeks"
        description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
      />
    </article>
  )
}

const meta = { title: 'Charts/BarChart', component: TwelveWeeks } satisfies Meta<typeof TwelveWeeks>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
export const Horizontal: Story = { args: { orientation: 'horizontal' } }
```

Create `apps/storybook/stories/EstimateVsActual.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComparisonBars, Legend } from 'tally-charts'

// docs/reference/03-estimate-vs-actual.png, card "Estimate vs actual".
const lines = [
  { name: 'Labor', note: '7.5 h planned, 12.5 h worked', estimate: 640, actual: 1060 },
  { name: 'Materials', note: 'Line set, refrigerant, pad', estimate: 720, actual: 900 },
  { name: 'Subcontract', note: 'Crane and electrician', estimate: 400, actual: 400 },
  { name: 'Permit and disposal', note: 'City permit, old unit haul', estimate: 210, actual: 210 },
  { name: 'Warranty reserve', note: 'Standard 2%', estimate: 150, actual: 150 },
  { name: 'Vehicle and fuel', note: '2 trips', estimate: 120, actual: 120 },
]

function EstimateVsActual() {
  return (
    <article className="card card-wide">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Estimate vs actual</h2>
        <span className="card-meta">Quoted Sep 12 by Dana Whitfield</span>
      </header>
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'Estimate', tone: 'accent-soft', fill: 'hatch' },
            { label: 'Actual', tone: 'accent' },
            { label: 'Over estimate', tone: 'loss', fill: 'hatch' },
          ]}
        />
      </div>
      <ComparisonBars
        data={lines}
        label="name"
        sublabel="note"
        plan="estimate"
        actual="actual"
        format="currency"
        title="Estimate vs actual by cost line"
        description="Labor and materials ran $600 over the estimate; every other line was on plan."
      />
      <div className="total-row">
        <span>Total cost</span>
        <span>
          $2,240 → $2,840 <span className="loss-text">+$600 · 27% over</span>
        </span>
      </div>
    </article>
  )
}

const meta = {
  title: 'Reference/Estimate vs actual',
  component: EstimateVsActual,
} satisfies Meta<typeof EstimateVsActual>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Create `apps/storybook/stories/Result.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, RangeMeter, RankedBars, Stat } from 'tally-charts'

// docs/reference/03-estimate-vs-actual.png, card "Result" with "Where the $860 went".
const leaks = [
  { name: 'Discount', amount: -260 },
  { name: 'Labor overrun', amount: -260 },
  { name: 'Callback', amount: -240 },
  { name: 'Materials', amount: -100 },
]

function Result() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Result</h2>
        <span className="card-meta">Contract target 35%</span>
      </header>
      <Stat
        value={12.3}
        format="percent"
        delta={<Delta value={-23.7} format="pts" />}
        caption="vs 36.0% estimated"
      />
      <div style={{ marginTop: 28 }}>
        <RangeMeter
          value={12.3}
          reference={36}
          max={40}
          format="percent"
          label="Margin, actual against estimated"
          valueLabel="Actual 12.3%"
          referenceLabel="Estimated 36.0%"
        />
      </div>
      <dl className="stat-rows">
        <div>
          <dt>Revenue</dt>
          <dd>
            $3,240 <span className="muted">quoted $3,500</span>
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>
            $2,840 <span className="muted">estimated $2,240</span>
          </dd>
        </div>
        <div>
          <dt>Gross profit</dt>
          <dd>
            $400 <span className="muted">planned $1,260</span>
          </dd>
        </div>
      </dl>
      <h3 className="section-title">Where the $860 went</h3>
      <RankedBars
        data={leaks}
        label="name"
        value="amount"
        format="currency"
        tone="loss"
        title="Where the $860 went"
        description="Discount and labor overrun each cost $260."
      />
    </article>
  )
}

const meta = { title: 'Reference/Result', component: Result } satisfies Meta<typeof Result>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Create `apps/storybook/stories/DrillColumns.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { type Id, RankedBars } from 'tally-charts'

// docs/reference/06-drilldown-strip-plot.png, "From all leakage to the people and jobs behind it".
type Row = { name: string; amount: number; jobs?: string }

const causes: Row[] = [
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material variance', amount: 18700 },
  { name: 'Callbacks', amount: 14400 },
  { name: 'Discounting', amount: 9800 },
  { name: 'Unbilled work', amount: 8300 },
]
const branches: Row[] = [
  { name: 'Dallas', amount: 14800 },
  { name: 'Austin', amount: 9200 },
  { name: 'Houston', amount: 7200 },
]
const jobTypes: Row[] = [
  { name: 'Installations', amount: 8200 },
  { name: 'Repairs', amount: 4300 },
  { name: 'Maintenance', amount: 2300 },
]
const technicians: Row[] = [
  { name: 'Tyler Brooks', amount: 2600, jobs: '9 jobs' },
  { name: 'Marcus Reed', amount: 1900, jobs: '7 jobs' },
  { name: 'Ryan Mitchell', amount: 1600, jobs: '6 jobs' },
  { name: 'Diego Alvarez', amount: 1100, jobs: '4 jobs' },
  { name: 'Chris Pham', amount: 1000, jobs: '3 jobs' },
]

function Column(props: {
  title: string
  total: string
  rows: Row[]
  selected: Id | null
  onSelect: (id: Id) => void
}) {
  return (
    <section>
      <header className="drill-header">
        <span>{props.title}</span>
        <span>{props.total}</span>
      </header>
      <RankedBars
        data={props.rows}
        label="name"
        value="amount"
        meta={props.rows.some((r) => r.jobs) ? 'jobs' : undefined}
        format="currency-compact"
        layout="stacked"
        selectedId={props.selected}
        onSelect={(id) => props.onSelect(id)}
        title={`Leakage by ${props.title.toLowerCase()}`}
      />
    </section>
  )
}

function DrillColumns() {
  const [cause, setCause] = useState<Id | null>(0)
  const [branch, setBranch] = useState<Id | null>(0)
  const [jobType, setJobType] = useState<Id | null>(0)
  const [tech, setTech] = useState<Id | null>(null)
  return (
    <article className="card card-wide" style={{ maxWidth: 1200 }}>
      <header className="card-header card-header-stack">
        <h2 className="card-title">From all leakage to the people and jobs behind it</h2>
        <span className="card-meta">Select a row to go one level deeper. September to date.</span>
      </header>
      <div className="drill-grid">
        <Column title="Cause" total="$82.4K" rows={causes} selected={cause} onSelect={setCause} />
        <Column title="Branch" total="$31.2K" rows={branches} selected={branch} onSelect={setBranch} />
        <Column title="Job type" total="$14.8K" rows={jobTypes} selected={jobType} onSelect={setJobType} />
        <Column title="Technician" total="$8.2K" rows={technicians} selected={tech} onSelect={setTech} />
      </div>
      <output data-testid="drill-selected" className="card-text">
        Selected cause: {cause === null ? 'none' : causes[Number(cause)]?.name}
      </output>
    </article>
  )
}

const meta = {
  title: 'Reference/Drill columns',
  component: DrillColumns,
} satisfies Meta<typeof DrillColumns>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
```

Create `apps/storybook/stories/GrossMargin.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, Meter, Stat } from 'tally-charts'

// docs/reference/01-gross-margin-waterfall.png, card "Gross margin".
function GrossMargin() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Gross margin</h2>
        <span className="card-meta">Week of Sep 21 to 27</span>
      </header>
      <Stat
        value={34}
        format="percent"
        delta={<Delta value={-1.2} format="pts" />}
        caption="vs last week"
      />
      <p className="card-text">
        4.0 pts under the 38.0% target. $19.3K of profit lost against target this week.
      </p>
      <Meter
        value={34}
        min={20}
        max={45}
        target={38}
        format="percent"
        label="Gross margin against the 38% target"
        minLabel="20%"
        targetLabel="Target 38%"
      />
      <dl className="stat-rows">
        <div>
          <dt>Revenue</dt>
          <dd>
            $482K <Delta value={6.2} format="percent" />
          </dd>
        </div>
        <div>
          <dt>Gross profit</dt>
          <dd>
            $164K <Delta value={2.5} format="percent" />
          </dd>
        </div>
        <div>
          <dt>Jobs completed</dt>
          <dd>158</dd>
        </div>
      </dl>
    </article>
  )
}

const meta = { title: 'Reference/Gross margin', component: GrossMargin } satisfies Meta<
  typeof GrossMargin
>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

Create `apps/storybook/stories/SmallPieces.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, DotCount, fmt, InlineBar } from 'tally-charts'

// Table margin cells (02), job counts (05) and change pills (01, 05, 06, 07).
const margins = [6.1, 7.7, 8.8, 12.3, 16.4, 19.8, 22.0]

function SmallPieces() {
  return (
    <div className="card piece-grid">
      <section aria-label="Margin cells" className="piece-grid">
        {margins.map((m) => (
          <div key={m} className="piece-row">
            <span className="piece-label">{fmt.percent(m)}</span>
            <InlineBar value={m} max={40} target={38} label={`Margin ${fmt.percent(m)}`} />
          </div>
        ))}
      </section>
      <section aria-label="Job counts" className="piece-grid">
        <DotCount count={29} label="29 jobs" />
        <DotCount count={17} label="17 jobs" />
        <DotCount count={23} label="23 jobs" />
      </section>
      <section aria-label="Changes" className="piece-row">
        <Delta value={6.2} format="percent" />
        <Delta value={-1.2} format="pts" />
        <Delta value={34} format="percent" good="down" signed />
        <Delta value={0} format="percent" />
      </section>
    </div>
  )
}

const meta = {
  title: 'Primitives/Small pieces',
  component: SmallPieces,
} satisfies Meta<typeof SmallPieces>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

Run `pnpm --filter storybook-app typecheck`. Expected: PASS. If `Id` isn't exported from `tally-charts`, it is (`export type { …, Id, … } from './core/types'`); check the import spelling.

- [ ] **Step 3: Look at every new story next to its reference**

Run `pnpm --filter storybook-app dev`, open each new story, and compare it with its reference screenshot in `docs/reference/`. Check: hatch direction, plan/actual order (plan on top), the pink overrun starting exactly at the plan end, right-aligned value columns, the drill highlight, and dark mode. Write the differences you see into the report. Small spacing differences are fine; wrong order, wrong colors or clipped text are not, so fix those in the library (with a test) before continuing.

- [ ] **Step 4: Extend the e2e suite**

In `apps/storybook/e2e/stories.spec.ts`:

Replace the `STORIES` list:

```ts
const STORIES = [
  'reference-last-12-weeks--light',
  'reference-last-12-weeks--dark',
  'primitives-legend--default',
  'charts-barchart--light',
  'charts-barchart--dark',
  'charts-barchart--horizontal',
  'reference-estimate-vs-actual--light',
  'reference-estimate-vs-actual--dark',
  'reference-result--light',
  'reference-result--dark',
  'reference-drill-columns--light',
  'reference-gross-margin--light',
  'reference-gross-margin--dark',
  'primitives-small-pieces--default',
]
```

Replace the locator in `open` so stories without a chart root also count as loaded:

```ts
  await page.locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]').first().waitFor()
```

Append:

```ts
test('clicking a drill row moves the selection', async ({ page }) => {
  await open(page, 'reference-drill-columns--light')
  const causes = page.getByRole('figure', { name: 'Leakage by cause' })
  await causes.locator('[data-ch-part="bar-hit"]').nth(2).click()
  await expect(page.getByTestId('drill-selected')).toHaveText('Selected cause: Callbacks')
  await expect(causes.locator('[data-ch-part="row-highlight"]')).toHaveCount(1)
})

test('arrow keys and Enter select a drill row', async ({ page }) => {
  await open(page, 'reference-drill-columns--light')
  const causes = page.getByRole('figure', { name: 'Leakage by cause' })
  await causes.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('drill-selected')).toHaveText('Selected cause: Material variance')
})

test('comparison rows announce plan, actual and difference', async ({ page }) => {
  await open(page, 'reference-estimate-vs-actual--light')
  const chart = page.getByRole('figure', { name: 'Estimate vs actual by cost line' })
  await chart.focus()
  await page.keyboard.press('ArrowDown')
  await expect(chart.locator('[aria-live]')).toHaveText('Labor, plan $640, actual $1,060, +$420')
})
```

- [ ] **Step 5: Never write snapshots on CI**

In `apps/storybook/playwright.config.ts`, change `updateSnapshots: 'missing',` to:

```ts
  // Locally, new stories get a baseline on first run; CI must fail on a missing one instead.
  updateSnapshots: process.env.CI ? 'none' : 'missing',
```

- [ ] **Step 6: Generate darwin baselines and run e2e**

Run: `pnpm test:e2e -- --update-snapshots`, then `pnpm test:e2e`
Expected: the second run PASSES. That is 14 screenshot tests and 14 axe tests, plus 2 from 0.1, 2 from Task 1 and 3 new interaction tests: 35 tests. `git status` shows 11 new PNGs under `__screenshots__/darwin/`; the 3 existing PNGs must be unchanged. If an existing PNG changed, run `git diff --stat` and stop and report: a 0.1 visual changed.

Open each new PNG (`apps/storybook/e2e/__screenshots__/darwin/*.png`) and check it shows the full card, not a blank or half-loaded page.

If axe reports violations, fix them in the library or the story markup and don't disable rules. Color contrast on HTML text must go through `ch-tone-text` or `--ch-ink-muted`.

- [ ] **Step 7: Generate linux baselines**

These are needed for CI's `e2e` job. Run from the repo root (Docker must be running):

```bash
docker run --rm -v "$PWD":/src:ro -v "$PWD/apps/storybook/e2e/__screenshots__":/out \
  mcr.microsoft.com/playwright:v1.64.0-noble sh -c '
    mkdir /w && cd /src && tar --exclude=node_modules --exclude=.git --exclude=storybook-static -cf - . | tar -xf - -C /w &&
    cd /w && corepack enable && pnpm install --frozen-lockfile &&
    pnpm test:e2e -- --update-snapshots; mkdir -p /out/linux && cp -r apps/storybook/e2e/__screenshots__/linux/. /out/linux/'
```

The copy into `/w` keeps the macOS `node_modules` untouched. Expected: `apps/storybook/e2e/__screenshots__/linux/` holds 14 PNGs. If Docker isn't available or the run fails, record the error in the report and continue; the CI comment in `ci.yml` keeps describing the artifact route.

- [ ] **Step 8: CI: dev-strip check and a React 18 leg**

In `.github/workflows/ci.yml`:

In the `check` job, add after `- run: pnpm size`:

```yaml
      - run: pnpm --filter tally-charts check:dev-strip
```

Add a job after `check`:

```yaml
  # Unit tests on the oldest supported React major. Types stay on 19.
  react18:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter tally-charts add -D react@18.3.1 react-dom@18.3.1
      - run: pnpm test
```

If linux baselines were committed in Step 7, replace the NOTE comment above the `e2e` job with:

```yaml
  # Baselines live in apps/storybook/e2e/__screenshots__/{darwin,linux}. CI never writes them
  # (updateSnapshots is 'none' on CI). To refresh linux baselines, run the docker command in
  # docs/superpowers/plans/2026-10-14-tally-charts-0.2-bar-charts.md (Task 15, Step 7).
```

Then try the React 18 leg locally:

```bash
pnpm --filter tally-charts add -D react@18.3.1 react-dom@18.3.1
pnpm test
git checkout -- packages/tally-charts/package.json pnpm-lock.yaml
pnpm install
```

Expected: PASS, then a clean `git status` for those two files. If only the SSR file-snapshot assertion fails because React 18 serializes markup differently, guard just that assertion: `import { version } from 'react'` and wrap the `toMatchFileSnapshot` line in `if (version.startsWith('19'))`, with a comment explaining why. Any other React 18 failure is a real bug: report it, don't hide it.

- [ ] **Step 9: Add the changeset**

Create `.changeset/tally-charts-0-2.md`:

```md
---
'tally-charts': minor
---

Bar charts and small pieces: `BarChart`, `ComparisonBars`, `RankedBars`, `RowLabels`,
`RowDividers`, a hidden data table on `<Chart>` (`dataTable`), and the HTML pieces `Stat`,
`Delta`, `Meter`, `RangeMeter`, `InlineBar` and `DotCount`.

Fixes: a click or tap now selects the bar under the pointer (it could select the previously
hovered bar); keyboard navigation no longer repeats items shared by layered marks; `hatch-fade`
fades toward the baseline for negative and horizontal bars; bars animate only along the value
axis; `aspectRatio` charts no longer shift the page on load; development warnings are removed
from production builds.

New: `--ch-radius` sets the default bar corner radius (now `3px`); `<Chart chartId>` for charts
in several React roots; `<Bars>` gains `from`, `size`, `align`, `offset`, `track`,
`interactive` and `ariaLabel`; `<ValueLabel data>`. `fadeMaskId` and `paintFor` take a bar
direction instead of an axis.
```

- [ ] **Step 10: Full verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm test:e2e`
Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
pnpm format
git add apps/storybook .github .changeset
git commit -m "test: reference stories for 0.2, select e2e, linux baselines, React 18 CI leg

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## After the plan

The 0.3 plan (`WaterfallChart`, `BridgeChart`, `Connector`, `ColumnHighlight`, `Callout`) builds on `Bars from` (floating steps) and `RowLabels`.
