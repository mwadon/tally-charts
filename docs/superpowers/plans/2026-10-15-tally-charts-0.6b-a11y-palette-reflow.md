# tally-charts 0.6b Accessibility, Palette and Reflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second half of tally-charts 0.6: the accessibility fixes of the audit (keyboard model, announcements, contrast, forced colors, heatmap semantics, data tables, reflow at 320px), the tuned sequential palette, the visual-fidelity backlog, the e2e gates that keep them, `docs/a11y.md`, and the follow-ups the 0.6a review deferred.

**Architecture:**
- The chart's keyboard widget moves from the `<figure>` to a plot `div` inside it (`role="application"`, `aria-roledescription="chart"`, a hint); announcements gain the series and position; Escape closes hover tooltips.
- `theme.css` carries most of the rest: one inked rule for toned text (`data-ch-tone-text`), outlines for soft and hatched marks, darker light tokens, per-tone and per-theme sequential shares as private theme tokens keyed by `data-ch-seq-tone`, and a forced-colors block that maps the tokens onto system colors.
- Heatmap gets a totals row, focusable totals, `rowLabel`, a sideways scroller and a glowing top cell; ComparisonBars gets a stacked `layout`; Waterfall, Bridge, Callout and Tooltip stop overlapping at 320px.
- The e2e suite gains the full axe tag set in both themes, a rendered-contrast check, a 320px reflow check and a forced-colors check; every visual baseline is regenerated once, late.

**Tech Stack:** React 18/19, TypeScript 6.0.3, tsdown, Vitest 5 + Testing Library, Biome 2.5.15, Storybook 10.6 + Playwright 1.64 + `@axe-core/playwright` 4.13.0, size-limit 14, API Extractor 7.59.3. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-0.6-design.md`: §5 (accessibility), §6 (palette and visual fidelity), §7 (reflow, tests and CI gates, documentation, the Margin outlook story), the 0.6b parts of §1 (success criteria) and §8 (`keyboardHint=""`, `layout="columns"`). Evidence and proposed fixes per finding: `docs/superpowers/specs/2026-10-14-tally-charts-0.6-a11y-audit.md` (A11Y-1 … A11Y-18) and its scripts in `docs/superpowers/specs/assets/0.6-a11y-audit/`. The 0.6a plan (`docs/superpowers/plans/2026-10-14-tally-charts-0.6a-api-time.md`) is done and merged.

This is plan 0.6b. `main` is at `1e7428d` (0.6a merged, CI green). **Execute on a new branch `feat/0.6b-a11y-palette-reflow` from `main`.** Push only if the user asks.

## Global Constraints

**Toolchain and packaging**
- Node `>=22`; `packageManager` is `pnpm@12.4.2`; TypeScript `6.0.3`; Biome `2.5.15`. Runtime dependencies stay `d3-array` and `d3-time`. No dependency is added or changed in 0.6b; `@axe-core/playwright` stays pinned at `4.13.0` and `@playwright/test` at `1.64.0`.
- Bundle budgets, min+gzip (spec §1): "`core` ≤ 8 KB, each chart ≤ 15 KB, LineChart (with time) ≤ 13 KB …, small UI pieces ≤ 4 KB." LineChart measures 12.02 kB at the start. **Never raise a budget.** If one is over, stop and report BLOCKED with the measured numbers. size-limit measures without a `NODE_ENV` define, so development warning text counts.

**Public API (frozen in 0.6a)**
- Every API change in 0.6b is additive. A task that changes the public types runs `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update` and commits the `api/*.api.md` diff in the same commit; the diff may only add (and document) lines.
- CSS tokens, `data-ch-part` values and `data-ch-*` state attributes are API, guarded by `packages/tally-charts/src/theme/surface.test.ts`. The task that adds or removes one updates `TOKENS` / `PARTS` / `STATES` (and, for a token, the README token table, which a surface test keeps equal to `TOKENS` from Task 12 on) in the same commit. Class names and `--_ch-*` variables are private.

**Accessibility (spec §5, verbatim where quoted)**
- The chart widget: `<div role="application" aria-roledescription="chart" aria-labelledby={titleId} aria-describedby="{descId} {hintId}">` wrapping the SVG and HTML overlay; the `<figure>` stays the labelled, described container; "The `DataTable` stays outside the application element".
- Hint: "Use arrow keys to move between points, Home and End for first and last, Escape to clear.", plus " Press Enter to select." when `onSelect` is set. `keyboardHint?: string` overrides it; "`keyboardHint=""` disables the hint, with no warning" (§8).
- "Only charts that register points get the application element and a tab stop." "Focus alone activates the first point and shows its tooltip." Announcements: "{series}, {n} of {total}, {x label}, {value}. When only one series exists, the series is omitted. `ariaLabel` overrides still win." "Escape also dismisses a hover-opened tooltip (WCAG 1.4.13)."
- axe gate: tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice` (plus the existing `wcag21a`), zero violations, on every story, in both themes.

**Contrast and palette (spec §5, §6)**
- Every text color ≥ 4.5:1 and every meaningful mark ≥ 3:1 against its surface, in both themes; checked by unit tests on tokens and an e2e check on rendered text.
- Toned text everywhere uses the ink mix `color-mix(in srgb, <tone> var(--ch-tone-text-mix), var(--ch-ink))`, through one shared rule keyed on `data-ch-tone-text`.
- Light mark tokens: `--ch-warn` `#be802f`, `--ch-gain` `#22a363`, `--ch-neutral` `#8e8e95`. `--ch-accent-soft` keeps its soft fill and gets a 1px outline at ≥ 3:1 (tone mixed with ink); hatched marks get the same outline. Dark tokens are unchanged except the sequential ramp.
- Sequential ramp, 6 tones × 2 themes × 5 levels: cell text ≥ 4.5:1 on its level; adjacent levels ≥ 1.3:1; level 5 ≥ 3:1 against the surface; a standalone `Legend` gets the same guarantees. Dark themes: `--ch-seq-5` is the pure base and `--_ch-seq-ink-strong` is `var(--ch-surface)`. Light themes: levels 1–2 cells and swatches get a 1px inset outline, `color-mix` of the base 45% with the surface. The top-value cell glows in the base color, off in forced colors and under `prefers-reduced-transparency`.

**Reflow (spec §7)**
- At 320 CSS px no story scrolls the page horizontally and no labels overlap. The heatmap may scroll inside its own container ("Horizontal scrolling is allowed for this 2-D layout; overlap is not."). `layout="columns"` on a narrow ComparisonBars is honoured (§8).

**Errors and warnings**
- Bad data never throws. Development warnings go through `createWarner()` / `ctx.warn`, start with `[tally-charts] `, fire once per key per chart, sit inside `if (DEV) { … }`, and each new one gets a phrase in `packages/tally-charts/scripts/check-dev-strip.mjs`.

**Tests and e2e**
- `vitest.config.ts` pins `TZ=Europe/Warsaw` (0.6a). Unit tests: `pnpm test`, or `pnpm --filter tally-charts exec vitest run <path>`.
- **Visual baselines are regenerated once, in Task 16**, after every visual change has landed (darwin locally, linux through the docker route in `.github/workflows/ci.yml`). From Task 1 on, the screenshot tests are expected to fail (Task 1 already moves the daily time story's y axis) and are **not run** before Task 16. Tasks 1–15 run the rest of the e2e suite with `pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"` (axe, keyboard, interaction, and the contrast, reflow and forced-colors specs once added); that run must pass in every task. Task 16 and the final verification run the whole suite (`pnpm test:e2e`).
- The e2e web server is `http-server` on port 6007 (`reuseExistingServer` outside CI): make sure nothing else listens on 6007. If you start your own Storybook to look at stories, use a free port such as 6010 (`pnpm --filter storybook-app exec storybook dev -p 6010 --no-open`). **Never stop or reuse anything on port 6006** (the user's dev server).

**Code style and commits**
- Biome: 2 spaces, single quotes, no semicolons, line width 100. Run `pnpm format` before every commit. `pnpm lint` must exit 0 with the 4 known `noImportantStyles` warnings and 1 info, and no other diagnostic.
- Conventional commit messages. End every commit message with a blank line and a `Co-Authored-By:` trailer naming **your own** model (the implementer's model, not the planner's).
- Commands run from the repo root. The shell is zsh: quote globs. `sed -i ''` is the BSD/macOS form; use `sed -i` on Linux.

## Design decisions this plan makes

Each was measured or verified in a copy of the repo while planning; where the spec's wording and reality differ, the task explains it again.

1. **The widget is a `data-ch-part="plot"` div that always wraps the SVG and the overlay** (Task 3). `role`, `tabIndex` and the handlers appear only once a mark registered points, which happens in a layout effect after mount, so the server render and the first client render match (the hydration test passes). A `<Chart>` with only lines or a grid is never a tab stop.
2. **Announcements are `"{series}, {n} of {total}, {label}"`** with a new optional `ChartPoint.series` (additive; `DotItem.series` too). The position counts within the point's series. A mark's `ariaLabel` (or a chart's own text) is the `{label}` part: "ariaLabel overrides still win" for the text, and the chart adds the position. StripPlot names its rows as the series; DotHistogram its `toneBy` thresholds bins (Task 4).
3. **Keyboard focus activates the first point; a pointer press doesn't** (a `pointerdown` flag read in `onFocus`, Task 4).
4. **Hover tooltips take pointer events** (`[data-ch-part="tooltip"] { pointer-events: auto }`), so the pointer can rest on them; pinned callouts stay click-through. Escape is a `document` listener only while a point is pointer-active (Task 5).
5. **Toned text is `data-ch-tone-text="true"`** with the tone in `--_ch-swatch-color`; the private `ch-tone-text` class goes. The 1px outline applies to `hatch` fills and soft-accent marks, not to `hatch-fade` (listed as decorative), which keeps `last-12-weeks` looking like the reference (Task 6).
6. **The ramp is tuned per tone and per theme through private theme tokens** (`--_ch-seq-<tone>-<n>`), mapped by `[data-ch-seq-tone]` rules that also set the base. One set of shares can't serve both themes: with level 1 at 12%, warn, gain and accent-soft reach only 1.16–1.18:1 steps when both themes share the shares (computed). The light accent-soft is too light for five 1.3:1 steps above the surface, so its light ramp starts from the tone mixed 84% with black. `--ch-loss` stays `#e5368d`: the reference's top cell samples to `#f13692`, a few units away, and white text needs 4.5:1, which puts the top level at `#d33282` either way (Task 7).
7. **Heatmap's `tone` no longer sets `--ch-seq-base` inline**; `data-ch-seq-tone` does it, so the same attribute on any ancestor gives a standalone `Legend` the tuned ramp (Task 7).
8. **Forced colors map the tokens onto system colors** (Chromium leaves SVG fills alone, so the tokens are how the SVG follows the user's palette), opt HTML marks out of forcing, and code heatmap levels by border width 1–5px (Task 9).
9. **Heatmap's column totals are a `role="row"` of their own** (`heatmap-total-row`), with a visually hidden "Total" row header and a grand total under the "Total" column header so the grid stays rectangular. Totals are focusable cells; Enter on them selects nothing. The corner is named by `rowLabel ?? headerOf(row, 'Row')` (Task 8).
10. **Heatmap columns are `1fr` tracks with `min-width: var(--ch-heatmap-min-cell, 56px)` on the cells**, not `minmax(var(--ch-heatmap-min-cell, 56px), 1fr)` as spec §7 writes: with a fixed track minimum, names longer than 56px ("Callbacks") overflowed their column at 320px (measured) (Task 12).
11. **ComparisonBars' stacked rows have two text lines** (label + delta, then sublabel + change): at 320px the story's chart is 200px wide, too narrow for label, change and delta on one line. The layout is picked from the measured width through an internal `FittedChart` (`<Chart>` reading a `layoutFor` prop from its rest props), so `Chart`'s public signature is unchanged (Task 13).
12. **BridgeChart thins its 22px column totals and drops its notes when a total doesn't fit its column**; RankedBars already cut its labels; WaterfallChart cuts each label to the room its value text leaves. Cut labels keep a `<title>`, which browsers don't show because chart text takes no pointer events (Task 14).
13. **`.ch-svg` gets `max-width: 100%`**: the "selectable" story scrolled to 552px because the chart sat in a CSS grid item whose track grew to the svg's 640px first-render width. That is a library behavior any grid or flex layout would hit, so it is fixed there, and the story stays as it is (Task 14).
14. **Legends show dot styles with `LegendItem.marker` and the band fill with `shape: 'band'`** (both additive). `LineChart` has no built-in legend; the Margin outlook story composes one (Task 10).
15. **The Margin outlook story uses months**, the first of April … December 2026: `07-forecast.png`'s axis is months, not the "week dates" spec §7 mentions (Task 10).
16. **The rendered-contrast port decodes the screenshot in the browser** (an `Image` on a canvas) instead of adding `pngjs`; the e2e story list moves to `e2e/stories.ts` so four specs share it (Tasks 14, 15).
17. **Data-table headers are field names in sentence case** ("grossMargin" → "Gross margin") or series labels; `dataTable={{ caption, columns }}` renames columns keyed by the default header (Task 2).
18. **Axis labels never overlap**: `thinTicks` keeps only the first label when even the two ends collide, and time labels are deduplicated and re-fitted after relabelling (Task 1).

## Review Focus

These failure modes follow from the spec but no feature test is obliged to cover them. Each has a pinned test in the task that owns the code.

1. **A light-pinned chart on a page whose system preference is dark** (or a dark-pinned one under a light preference). A reasonable person expects the chart's own `data-ch-theme` to decide its ramp, ink and outline. Test: Task 7, "every sequential ramp keeps its contrast in the browser" runs each story under the opposite emulated scheme and checks the top level's text color.
2. **A Heatmap with `totals={false}`.** The keys must stay inside the data cells, with no phantom totals row or column: ArrowUp on the first row stays, Ctrl+End reaches the last data cell. Test: Task 8, "keeps the keys inside the data cells when totals are off".
3. **A narrow ComparisonBars without values or sublabels.** It must still stack, with one text line and the label using the whole width. Test: Task 13, "stacks rows with one text line when there are no values and no sublabels".
4. **A bridge note longer than its column at a normal width.** It is cut to the column, never overlapping its neighbour, with the whole note kept in a `<title>`. Test: Task 14, "cuts a long note to its column and keeps the whole note in a title".
5. **A chart inside a CSS grid or flex item on a phone.** It must shrink to the viewport, not hold the page open at its 640px first render. Tests: Task 14, "lets a chart shrink inside a grid or flex track" and the reflow gate on `reference-last-12-weeks--selectable`.

---

## File Structure

```
packages/tally-charts/
  scripts/check-dev-strip.mjs                     two new warning phrases                 (Task 1)
  README.md                                        token row; 0.6b docs                    (Tasks 12, 17)
  api/tally-charts.api.md                          additive diffs                          (Tasks 2, 3, 4, 8, 10, 13)
  src/core/scale.ts, ticks.ts (+ tests)            invalid time domain; thinTicks; fits    (Tasks 1, 14)
  src/react/Chart.tsx (+ test)                     plot widget, hint, focus, Escape, layoutFor  (Tasks 3, 4, 5, 13)
  src/react/interaction.ts (+ test), types.ts      announcement, ChartPoint.series         (Task 4)
  src/react/DataTable.tsx (+ test)                 row headers, "no value"                 (Task 2)
  src/react/charts/shared.ts                       DataTableOptions, headerOf, pass-through (Tasks 2, 3)
  src/react/charts/*.tsx (+ tests)                 dataTable option; per-chart fixes        (Tasks 1, 2, 4, 6, 8, 11–14)
  src/react/charts/dataTable.test.tsx              new                                     (Task 2)
  src/react/marks/Axis.tsx, Bars.tsx, Dots.tsx, RowLabels.tsx (+ tests)                    (Tasks 1, 4, 6, 14)
  src/react/overlays/Callout.tsx, Tooltip.tsx (+ tests)                                    (Task 14)
  src/react/ui/Legend.tsx, Meter.tsx, RangeMeter.tsx, Stat.tsx, Delta.tsx, TooltipPill.tsx (Tasks 6, 10, 11)
  src/theme/theme.css (+ theme.test.ts)            tokens, ramp, forced colors, reflow      (Tasks 3, 5–14)
  src/theme/surface.test.ts                        tokens, parts, states, README table      (Tasks 3, 6, 8, 10–12)
  src/__snapshots__/last-twelve-weeks.ssr.html     regenerated                              (Tasks 3, 6)
apps/storybook/
  .storybook/preview.css                           total row wraps                          (Task 13)
  stories/Sequential.stories.tsx                   new                                     (Task 7)
  stories/DrillColumns, MarginOutlook, ProfitLeaked .stories.tsx                           (Tasks 8, 10, 11)
  e2e/stories.ts                                   shared story list                        (Task 14)
  e2e/stories.spec.ts                              widget focus, axe tags, ramp check       (Tasks 3–5, 7, 8, 11, 14)
  e2e/forced-colors.spec.ts, reflow.spec.ts, contrast.spec.ts   new                         (Tasks 9, 14, 15)
  e2e/__screenshots__/{darwin,linux}/              regenerated once                         (Task 16)
docs/a11y.md                                       new                                     (Task 17)
.changeset/foundation-0-6.md                       0.6b section                             (Task 17)
```

---

### Task 1: Time-axis and axis-format follow-ups from 0.6a

The 0.6a final review deferred four small defects here. None changes the public API (the doc comments change, the `.api.md` reports don't).

**Files:**
- Modify: `packages/tally-charts/src/core/scale.ts` (time branch of `createScale`)
- Modify: `packages/tally-charts/src/core/ticks.ts` (`thinTicks`)
- Modify: `packages/tally-charts/src/react/marks/Axis.tsx`
- Modify: `packages/tally-charts/src/react/charts/LineChart.tsx` (inferred value domain)
- Modify: `packages/tally-charts/src/react/charts/BarChart.tsx` (doc comment)
- Modify: `packages/tally-charts/scripts/check-dev-strip.mjs`
- Test: `src/core/scale.test.ts`, `src/core/ticks.test.ts`, `src/react/marks/time.test.tsx`, `src/react/charts/LineChart.test.tsx`, `src/react/charts/BarChart.test.tsx`

**Interfaces:**
- Consumes: `createScale`, `thinTicks(ticks, measure?)`, `estimateWidth`, `MeasureTick`, `Tick` (all in `core`), `niceDomain(domain, count = 5)` (`core/linear.ts`).
- Produces:
  - dev warning key `'<axis>-time-domain-invalid'`, text "The x time scale's \`domain\` has a value that is not a date; using the dates in the data instead."
  - dev warning key `'axis-category-format'`, text "Axis \`format\` must be a function on a band or point scale; presets and date formats are ignored there."
  - `thinTicks` now returns only the first tick (anchored `'start'`) when even the two ends would overlap.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/core/scale.test.ts`, inside `describe('time scales', …)`, before `it('has no category centre or step', …)`, add:

```ts
  it('warns once and uses the data when an explicit domain has a value that is not a date', () => {
    const warn = vi.fn()
    const s = createScale(
      { type: 'time', field: 'at', domain: ['2026-03-01', 'soon'] },
      [{ at: '2026-03-02' }, { at: '2026-03-04' }],
      'x',
      100,
      warn,
    )
    if (s.kind !== 'time') throw new Error('expected a time scale')
    // The inferred domain is the data's, rounded out to day ticks.
    expect(s.scale.domain()).toEqual([Date.UTC(2026, 2, 2), Date.UTC(2026, 2, 4)])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('x-time-domain-invalid')
    expect(warn.mock.calls[0]?.[1]).toContain('has a value that is not a date')
  })
```

In `packages/tally-charts/src/core/ticks.test.ts`, replace the test `'falls back to the two ends with outer anchors'` with:

```ts
  it('falls back to the two ends with outer anchors', () => {
    // 'Sep 21' is about 39px: every fourth tick (44px apart) still overlaps, the ends don't.
    const ticks = thinTicks(row(9, 11, 'Sep 21'))
    expect(ticks.map((t) => [t.value, t.anchor])).toEqual([
      [0, 'start'],
      [8, 'end'],
    ])
  })

  it('keeps only the first label when even the two ends would overlap', () => {
    expect(thinTicks(row(5, 10, 'Sep 21')).map((t) => [t.value, t.anchor])).toEqual([
      [0, 'start'],
    ])
    expect(thinTicks(row(2, 20, 'Sep 21')).map((t) => [t.value, t.anchor])).toEqual([
      [0, 'start'],
    ])
  })
```

In `packages/tally-charts/src/react/marks/time.test.tsx`, before `it('uses the provider locale for dates', …)`, add:

```tsx
  it('keeps one label per run of repeated labels when the format is coarser than the ticks', () => {
    // Daily ticks labelled by month all read "Jan 2026": only the first stays.
    const { container } = renderTime(<Axis side="bottom" format="month" />)
    expect(labels(container)).toEqual(['Jan 2026'])
    expect(attrs(parts(container, 'axis-label'), 'x')).toEqual(['0'])
  })

  it('never lets relabelled time ticks overlap after thinning', () => {
    // A year of weeks at many widths. At 196px, thinning kept "Oct 2025", "Apr", "Oct", and the
    // relabelled "Apr 2026" no longer fitted between its neighbours.
    const data = Array.from({ length: 52 }, (_, i) => ({ date: Date.UTC(2025, 11, 29 + 7 * i) }))
    for (let width = 100; width <= 480; width += 4) {
      const { container, unmount } = render(
        <Chart
          title="Weeks"
          width={width}
          height={100}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          data={data}
          x={{ type: 'time', field: 'date' }}
          y={{ domain: [0, 2] }}
        >
          <Axis side="bottom" />
        </Chart>,
      )
      const boxes = parts(container, 'axis-label').map((el) => {
        const x = Number(el.getAttribute('x'))
        const w = (el.textContent ?? '').length * 6.5
        const anchor = el.getAttribute('text-anchor')
        return anchor === 'start'
          ? [x, x + w]
          : anchor === 'end'
            ? [x - w, x]
            : [x - w / 2, x + w / 2]
      })
      for (let i = 1; i < boxes.length; i++) {
        expect((boxes[i - 1]?.[1] ?? 0) + 8, `width ${width}`).toBeLessThanOrEqual(
          boxes[i]?.[0] ?? 0,
        )
      }
      unmount()
    }
  })
```

In `packages/tally-charts/src/react/charts/LineChart.test.tsx`, before `it('skips a repeated x with one warning', …)` in `describe('<LineChart>')`, add:

```tsx
  it('rounds the inferred domain to the yAxis tick count, so the ends are labelled', () => {
    const data = [
      { month: 'Jan', v: 31.2 },
      { month: 'Feb', v: 36.8 },
    ]
    const { container } = render(
      <LineChart
        data={data}
        x="month"
        series={[{ id: 'v', label: 'V', value: 'v' }]}
        yAxis={4}
        width={400}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title="Four ticks"
        animate={false}
      />,
    )
    // Five ticks would nice the domain to 31–37 and label 32, 34, 36; four nice it to 30–38.
    const left = container.querySelector('[data-ch-part="axis"][data-ch-side="left"]')
    expect([...(left?.children ?? [])].map((el) => el.textContent)).toEqual([
      '30',
      '32',
      '34',
      '36',
      '38',
    ])
    const lines = parts(container, 'grid-line')
    expect(lines[0]).toHaveAttribute('y1', '100')
    expect(lines.at(-1)).toHaveAttribute('y1', '0')
  })
```

In the same file, the test `'formats dates with xAxisFormat everywhere'` asserted the old repeated labels. Replace its last two lines

```tsx
    const labels = parts(container, 'axis-label').map((el) => el.textContent)
    expect(labels.slice(-3)).toEqual(['Jan 2026', 'Jan 2026', 'Jan 2026'])
```

with

```tsx
    // The ticks, every other day, would all read "Jan 2026": the axis keeps the first.
    const bottom = container.querySelector('[data-ch-part="axis"][data-ch-side="bottom"]')
    expect([...(bottom?.children ?? [])].map((el) => el.textContent)).toEqual(['Jan 2026'])
```

In `packages/tally-charts/src/react/charts/BarChart.test.tsx`, before `it('draws a target from a number or from an object with a label', …)`, add:

```tsx
  it('warns once and shows the categories when axisFormat is not a function', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ axisFormat: 'percent' })
    expect(parts(container, 'axis-label').map((t) => t.textContent)).toEqual(['W1', 'W3'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('must be a function on a band or point scale')
    warn.mockRestore()
  })
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/scale.test.ts src/core/ticks.test.ts src/react/marks/time.test.tsx src/react/charts/LineChart.test.tsx src/react/charts/BarChart.test.tsx`
Expected: FAIL, 7 tests: the invalid-domain warning is never called; `thinTicks` returns both ends; the axis shows "Jan 2026" five times; `width 176` overlaps; the y labels are `['32', '34', '36']`; the LineChart axis shows "Jan 2026" three times; BarChart's warn is called 0 times.

- [ ] **Step 3: Warn about an invalid explicit time domain**

In `packages/tally-charts/src/core/scale.ts`, in the `spec?.type === 'time'` branch, after

```ts
    const valid = explicit?.every((t) => t !== undefined) ?? false
```

add

```ts
    if (DEV && explicit && !valid) {
      warn(
        `${axis}-time-domain-invalid`,
        `The ${axis} time scale's \`domain\` has a value that is not a date; using the dates in the data instead.`,
      )
    }
```

- [ ] **Step 4: Never leave overlapping ends in `thinTicks`**

In `packages/tally-charts/src/core/ticks.ts`, replace the whole `thinTicks` function and its comment with:

```ts
/**
 * Drops labels until they stop overlapping: every other, every fourth, …, then only the ends,
 * and only the first when even the ends would overlap.
 */
export function thinTicks(ticks: readonly Tick[], measure: MeasureTick = estimateWidth): Tick[] {
  if (ticks.length <= 1 || fits(ticks, measure)) return [...ticks]
  for (let step = 2; step < ticks.length; step *= 2) {
    const kept = ticks.filter((_, i) => i % step === 0)
    if (kept.length > 2 && fits(kept, measure)) return kept
  }
  const first = ticks[0]
  const last = ticks[ticks.length - 1]
  if (!first || !last) return []
  const ends: Tick[] = [
    { ...first, anchor: 'start' },
    { ...last, anchor: 'end' },
  ]
  return fits(ends, measure) ? ends : [{ ...first, anchor: 'start' }]
}
```

- [ ] **Step 5: Re-fit relabelled time ticks and warn about category formats in `Axis`**

In `packages/tally-charts/src/react/marks/Axis.tsx`:

1. Extend the `core/ticks` import with `estimateWidth` and `type MeasureTick`, and import `DEV`:

```ts
import {
  categoryTicks,
  estimateWidth,
  linearTicks,
  type MeasureTick,
  type Tick,
  type TickAnchor,
  type TickSpec,
  thinTicks,
} from '../../core/ticks'
import type { TimeScale } from '../../core/time'
import { DEV } from '../../core/warn'
```

2. Replace the `AxisFormat` doc comment with:

```ts
/**
 * Number presets label value axes, date specs label time axes, and a function labels any axis.
 * Category axes show the category unless a function is given; a preset or date spec there is
 * ignored with a development warning.
 */
```

3. After the `withLabels` function, add:

```ts
/**
 * Time labels for the ticks thinning kept. Labels are written again, since a dropped tick may
 * have carried the year; a tick whose label repeats the one before it (a coarse format on fine
 * ticks) is dropped; and the new labels are thinned again until nothing changes, so they fit.
 */
function fitTimeTicks(ticks: readonly Tick[], label: TimeLabels, measure?: MeasureTick): Tick[] {
  let kept = withLabels(ticks, label)
  for (let pass = 0; pass < 4; pass++) {
    const distinct = kept.filter((tick, i) => i === 0 || tick.label !== kept[i - 1]?.label)
    const next = withLabels(measure ? thinTicks(distinct, measure) : distinct, label)
    if (next.length === kept.length && next.every((tick, i) => tick.label === kept[i]?.label)) {
      return next
    }
    kept = next
  }
  return kept
}
```

4. In `Axis`, replace the category branch and the thinning lines

```tsx
  } else {
    raw = categoryTicks(resolved.scale, spec, custom ?? String, { anchorEnds: horizontal })
  }
  let ticks = thin ? thinTicks(raw, horizontal ? undefined : () => LABEL_HEIGHT) : raw
  // Thinning can drop the tick that carried a change ("2026"), so time labels are written again
  // for the ticks kept.
  if (timeLabel) ticks = withLabels(ticks, timeLabel)
```

with

```tsx
  } else {
    if (DEV && format !== undefined && !custom) {
      ctx.warn(
        'axis-category-format',
        'Axis `format` must be a function on a band or point scale; presets and date formats are ignored there.',
      )
    }
    raw = categoryTicks(resolved.scale, spec, custom ?? String, { anchorEnds: horizontal })
  }
  const measure: MeasureTick | undefined = horizontal ? undefined : () => LABEL_HEIGHT
  let ticks = thin ? thinTicks(raw, measure) : raw
  if (timeLabel) {
    ticks = fitTimeTicks(ticks, timeLabel, thin ? (measure ?? estimateWidth) : undefined)
  }
```

- [ ] **Step 6: Nice LineChart's inferred domain with the `yAxis` count, and fix BarChart's doc**

In `packages/tally-charts/src/react/charts/LineChart.tsx`, replace

```ts
  // The target counts toward the inferred domain, so a goal above or below the data is drawn.
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        [...rows.flatMap((r) => [...r.values, r.low, r.high]), targetSpec?.value ?? Number.NaN],
        false,
      ),
    )
```

with

```ts
  // The target counts toward the inferred domain, so a goal above or below the data is drawn. The
  // domain is rounded with the axis's own tick count, so its ends land on labelled ticks.
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        [...rows.flatMap((r) => [...r.values, r.low, r.high]), targetSpec?.value ?? Number.NaN],
        false,
      ),
      typeof yAxis === 'number' ? yAxis : undefined,
    )
```

In `packages/tally-charts/src/react/charts/BarChart.tsx`, replace

```ts
  /** Category axis labels: a function of the category. Default: the category itself. */
```

with

```ts
  /**
   * Category axis labels: a function of the category. Number presets and date formats don't apply
   * to categories and are ignored with a development warning. Default: the category itself.
   */
```

- [ ] **Step 7: Register the new warnings with the dev-strip check**

In `packages/tally-charts/scripts/check-dev-strip.mjs`, append to `phrases` after `'has no \`title\`',`:

```js
  'has a value that is not a date',
  'must be a function on a band or point scale',
```

- [ ] **Step 8: Run the tests and the gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check`
Expected: all PASS (788 unit tests); dev-strip reports `20/20 phrases`; api:check reports no change; LineChart about 12.13 kB.

E2E: `pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`. Expected: PASS. (Screenshots are not run in Tasks 1–15, see Global Constraints. The daily time story now labels 30%–38%, both ends included, instead of 32%–36%; that is the intended change.)

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "fix: time axis and axis-format follow-ups from 0.6a

Re-fit relabelled time ticks and drop repeated labels, keep only the first
label when the ends overlap, nice LineChart's domain with the yAxis count,
and warn about an invalid explicit time domain and non-function category
formats.

Co-Authored-By: <your own model trailer>"
```

---

### Task 2: Readable data tables (A11Y-11)

**Files:**
- Modify: `packages/tally-charts/src/react/DataTable.tsx`
- Modify: `packages/tally-charts/src/react/charts/shared.ts`
- Modify: the nine high-level charts in `packages/tally-charts/src/react/charts/`: `BarChart.tsx`, `BridgeChart.tsx`, `ComparisonBars.tsx`, `DotHistogram.tsx`, `LineChart.tsx`, `RankedBars.tsx`, `StripPlot.tsx`, `WaffleColumns.tsx`, `WaterfallChart.tsx`
- Modify: `packages/tally-charts/src/index.ts`, `packages/tally-charts/api/tally-charts.api.md` (regenerated)
- Create: `packages/tally-charts/src/react/charts/dataTable.test.tsx`
- Test: `src/react/DataTable.test.tsx`, and the data-table tests in `BarChart`, `ComparisonBars`, `DotHistogram`, `LineChart`, `RankedBars`, `StripPlot`, `WaffleColumns` `.test.tsx`

**Interfaces:**
- Consumes: `DataTableSpec<R>` (`react/DataTable.tsx`), `ChartProps.dataTable`.
- Produces:
  - `export interface DataTableOptions { caption?: string; columns?: Partial<Record<string, string>> }` in `react/charts/shared.ts`, exported from the root. `columns` is keyed by the **default header** (the text the table shows without options).
  - `dataTable?: boolean | DataTableOptions` on all nine high-level charts.
  - `withTableOptions<R>(table: DataTableSpec<R> | undefined, options: boolean | DataTableOptions | undefined): DataTableSpec<R> | undefined` (internal, `shared.ts`).
  - `headerOf(accessor, fallback)` now sentence-cases a field name: `'grossMargin'` → `'Gross margin'`.
  - `DataTable` renders the first cell of each row as `<th scope="row">`, and an empty string as `<span aria-hidden="true">—</span><span class="ch-sr-only">no value</span>`.

Spec §5 says headers "come from axis and series labels, not raw field names". The charts have no axis-title props, so the defaults become the field name in sentence case (or the role name for function accessors), series columns keep the series label, and `dataTable.columns` renames any of them.

- [ ] **Step 1: Write the failing tests**

Append to `describe('<DataTable>')` in `packages/tally-charts/src/react/DataTable.test.tsx`:

```tsx
  it('heads each row with its first cell and reads empty values as "no value"', () => {
    render(
      <DataTable
        data={[
          { week: 'W1', margin: '30%' },
          { week: 'W2', margin: '' },
        ]}
        columns={[
          { header: 'Week', value: (d) => d.week },
          { header: 'Margin', value: (d) => d.margin },
        ]}
      />,
    )
    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((th) => th.textContent),
    ).toEqual(['W1', 'W2'])
    expect(within(table).getAllByRole('rowheader')[0]).toHaveAttribute('scope', 'row')
    const empty = within(table).getAllByRole('cell')[1]
    expect(empty).toHaveTextContent('—no value')
    expect(empty?.querySelector('[aria-hidden="true"]')).toHaveTextContent('—')
  })
```

Create `packages/tally-charts/src/react/charts/dataTable.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { BarChart } from './BarChart'
import { BridgeChart } from './BridgeChart'
import { ComparisonBars } from './ComparisonBars'
import { DotHistogram } from './DotHistogram'
import { LineChart } from './LineChart'
import { RankedBars } from './RankedBars'
import { StripPlot } from './StripPlot'
import { headerOf } from './shared'
import { WaffleColumns } from './WaffleColumns'
import { WaterfallChart } from './WaterfallChart'

// Every chart's first column is renamed "Row", whatever its default header ("Name", "Item" or
// "Column"); the caption replaces the title.
const dataTable = { caption: 'Rows', columns: { Name: 'Row', Item: 'Row', Column: 'Row' } }
const common = { width: 400, title: 'Chart', animate: false, dataTable } as const
const row = { name: 'Labor', plan: 640, actual: 1060, v: 12 }
const step = { label: 'Labor', value: -1.6 }

const cases: [string, () => ReactElement][] = [
  ['BarChart', () => <BarChart {...common} data={[row]} x="name" y="v" />],
  [
    'ComparisonBars',
    () => <ComparisonBars {...common} data={[row]} label="name" plan="plan" actual="actual" />,
  ],
  ['RankedBars', () => <RankedBars {...common} data={[row]} label="name" value="v" />],
  [
    'WaterfallChart',
    () => <WaterfallChart {...common} start={{ label: 'Target', value: 38 }} steps={[step]} />,
  ],
  [
    'BridgeChart',
    () => <BridgeChart {...common} start={{ label: 'Planned', value: 1260 }} steps={[step]} />,
  ],
  ['DotHistogram', () => <DotHistogram {...common} data={[row]} value="v" />],
  [
    'StripPlot',
    () => (
      <StripPlot {...common} data={[row]} series={[{ id: 'est', label: 'Estimated', value: 'v' }]} />
    ),
  ],
  ['WaffleColumns', () => <WaffleColumns {...common} data={[row]} x="name" y="v" />],
  [
    'LineChart',
    () => (
      <LineChart
        {...common}
        data={[row]}
        x="name"
        series={[{ id: 'v', label: 'Value', value: 'v' }]}
      />
    ),
  ],
]

describe('dataTable options on a high-level chart', () => {
  it.each(cases)('%s takes a caption and renamed headers', (_, chart) => {
    render(chart())
    const table = screen.getByRole('table', { name: 'Rows' })
    expect(within(table).getAllByRole('columnheader')[0]).toHaveTextContent(/^Row$/)
  })
})

describe('headerOf', () => {
  it('writes a field name in sentence case', () => {
    expect(headerOf('margin', 'Value')).toBe('Margin')
    expect(headerOf('grossMargin', 'Value')).toBe('Gross margin')
    expect(headerOf('gross_margin', 'Value')).toBe('Gross margin')
    expect(headerOf('job-id', 'Value')).toBe('Job id')
  })

  it('falls back for function accessors and blank names', () => {
    expect(headerOf((d: { v: number }) => d.v, 'Value')).toBe('Value')
    expect(headerOf('  ', 'Value')).toBe('Value')
  })
})
```

Update the existing data-table assertions to the new headers and the row-header column:

- `BarChart.test.tsx`: `['week', 'margin']` → `['Week', 'Margin']`. Rename `'skips a missing value without throwing and leaves its table cell blank'` to `'skips a missing value without throwing and reads its table cell as "no value"'` and change its last line to `expect(cells.at(-1)?.textContent).toBe('—no value')`.
- `ComparisonBars.test.tsx`: `['name', 'estimate', 'actual', 'Difference']` → `['Name', 'Estimate', 'Actual', 'Difference']`.
- `DotHistogram.test.tsx`: `['Item', 'margin', 'Group']` → `['Item', 'Margin', 'Group']`.
- `StripPlot.test.tsx`: `['job', 'Estimated', 'Actual']` → `['Job', 'Estimated', 'Actual']`.
- `WaffleColumns.test.tsx`: `['week', 'leaked', 'month']` → `['Week', 'Leaked', 'Month']`.
- `LineChart.test.tsx`, test `'renders a hidden data table'`: `'month'` → `'Month'` in the header list, and replace the `aug` assertion with

```tsx
    const aug = within(table).getAllByRole('row')[3] as HTMLElement
    expect(within(aug).getByRole('rowheader')).toHaveTextContent('Aug')
    expect(
      within(aug)
        .getAllByRole('cell')
        .map((td) => td.textContent),
    ).toEqual(['—no value', '35.0%', '36.0%', '34.0%–37.0%'])
```

  and in `'uses ISO ids and writes dates in the tooltip, the announcements and the table'` change `'at'` to `'At'`.
- `RankedBars.test.tsx`, test `'renders a hidden data table in display order'`: replace the `cells` lines with

```tsx
    const first = within(table).getAllByRole('row')[1] as HTMLElement
    expect(within(first).getByRole('rowheader')).toHaveTextContent('Labor overruns')
    expect(within(first).getByRole('cell')).toHaveTextContent('$31.2K')
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/DataTable.test.tsx src/react/charts`
Expected: FAIL: no `rowheader`, raw field names in the headers, the 9 `dataTable options` cases find no table named "Rows" (TypeScript is not checked by vitest, so the object prop renders).

- [ ] **Step 3: Row headers and "no value" in `DataTable`**

In `packages/tally-charts/src/react/DataTable.tsx`, replace the doc comment above `export function DataTable` with:

```tsx
/** An empty cell: a dash, read as "no value". */
const NO_VALUE = (
  <>
    <span aria-hidden="true">—</span>
    <span className="ch-sr-only">no value</span>
  </>
)

/**
 * The chart's data as a visually hidden table, for screen-reader users. The first column holds
 * the row headers (the x or category of each row), and an empty value reads "no value". The
 * wrapper does the hiding: a table ignores the 1px box and would keep its full height in the
 * page flow.
 */
```

and replace the body cells

```tsx
              {columns.map((column, c) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
                <td key={c}>{column.value(d, i)}</td>
              ))}
```

with

```tsx
              {columns.map((column, c) => {
                const text = column.value(d, i)
                const content = text === '' ? NO_VALUE : text
                return c === 0 ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
                  <th key={c} scope="row">
                    {content}
                  </th>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
                  <td key={c}>{content}</td>
                )
              })}
```

(`NO_VALUE` is a module constant, not a component inside the map: Biome's `useJsxKeyInIterable` flags JSX created inside the callback.)

- [ ] **Step 4: `DataTableOptions`, sentence-case headers and `withTableOptions`**

In `packages/tally-charts/src/react/charts/shared.ts`, add `import type { DataTableSpec } from '../DataTable'` after the `ChartProps` import, and replace `headerOf` with:

```ts
/** A high-level chart's `dataTable` as an object: the caption and readable column headers. */
export interface DataTableOptions {
  /** Caption of the hidden table. Default: the chart title. */
  caption?: string
  /**
   * New column headers, keyed by the default header, e.g. `{ Week: 'Week ending' }`. Columns
   * that are not listed keep their default header.
   */
  columns?: Partial<Record<string, string>>
}

/**
 * Data-table header for a string accessor: the field name in sentence case ("grossMargin" and
 * "gross_margin" read "Gross margin"). Function accessors get the fallback.
 */
export function headerOf(accessor: unknown, fallback: string): string {
  if (typeof accessor !== 'string') return fallback
  const words = accessor
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : fallback
}

/** A chart's table with the caption and the header names from a `dataTable` object. */
export function withTableOptions<R>(
  table: DataTableSpec<R> | undefined,
  options: boolean | DataTableOptions | undefined,
): DataTableSpec<R> | undefined {
  if (!table || typeof options !== 'object') return table
  const headers = options.columns ?? {}
  return {
    caption: options.caption ?? table.caption,
    columns: table.columns.map((column) => ({
      ...column,
      header: headers[column.header] ?? column.header,
    })),
  }
}
```

- [ ] **Step 5: Accept the object on every high-level chart**

In each of the nine chart files listed above, make three edits:

1. Replace

```ts
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
```

with

```ts
  /**
   * Hidden data table for screen readers: `true`, `false`, or `{ caption, columns }` to set its
   * caption and rename column headers. Default true.
   */
  dataTable?: boolean | DataTableOptions
```

2. Replace `dataTable={table}` on the `<Chart>` element with `dataTable={withTableOptions(table, dataTable)}`. (Each chart already builds `table` only when `dataTable` is truthy, and an object is truthy.)

3. Add `type DataTableOptions` and `withTableOptions` to the file's `import { … } from './shared'` list, keeping it sorted (Biome sorts named imports case-insensitively, ignoring `type`).

In `packages/tally-charts/src/index.ts`, replace

```ts
export type { ChartPassThroughProps, ChartTooltip } from './react/charts/shared'
```

with

```ts
export type {
  ChartPassThroughProps,
  ChartTooltip,
  DataTableOptions,
} from './react/charts/shared'
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS (800 tests).

- [ ] **Step 7: Update the API report**

Run: `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update && git diff packages/tally-charts/api`
Expected: the only changes are a new `DataTableOptions` interface and `dataTable?: boolean | DataTableOptions;` on the nine `…Props` interfaces. Nothing is removed.

- [ ] **Step 8: Gates**

Run: `pnpm typecheck && pnpm lint && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS; LineChart about 12.33 kB.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: readable data tables: row headers, no-value cells, dataTable options

Co-Authored-By: <your own model trailer>"
```

---

### Task 3: The chart's keyboard widget: `role="application"` and a hint (A11Y-1, A11Y-16)

**Files:**
- Modify: `packages/tally-charts/src/react/Chart.tsx`
- Modify: `packages/tally-charts/src/react/charts/shared.ts` (`ChartPassThroughProps`)
- Modify: `packages/tally-charts/src/theme/theme.css` (focus ring), `packages/tally-charts/src/theme/surface.test.ts` (`plot` part)
- Modify: `packages/tally-charts/src/__snapshots__/last-twelve-weeks.ssr.html` (regenerated)
- Modify: `packages/tally-charts/api/tally-charts.api.md` (regenerated)
- Modify: `apps/storybook/e2e/stories.spec.ts` (focus the widget)
- Test: `src/react/Chart.test.tsx`, and every unit test that sends keys to the figure (listed in Step 4)

**Interfaces:**
- Consumes: `useInteraction` (`interaction.points`, `interaction.source`, `setActive`), `navigate`.
- Produces:
  - `ChartProps.keyboardHint?: string`, also on every high-level chart through `ChartPassThroughProps` (`'keyboardHint'` is added to its `Pick`).
  - DOM: `<figure data-ch-root aria-labelledby aria-describedby>` → `<div data-ch-part="plot">` wrapping the `<svg>` and the overlay. While at least one point is registered the plot div carries `role="application"`, `aria-roledescription="chart"`, `aria-labelledby={titleId}`, `aria-describedby="{descId} {hintId}"` (present ids only), `tabIndex={0}`, `onKeyDown`, `onBlur`. The hint is `<span hidden id="{chartId}-hint" class="ch-sr-only">`. The figure is no longer focusable. The data table and the `aria-live` region stay direct children of the figure.
  - New public part `plot` (surface test, README in Task 17).
  - Tests and e2e reach the widget with `getByRole('application')`.

Spec §5: "Only charts that register points get the application element and a tab stop." Points register in a layout effect, so the server render and the first client render have none: the plot div is always rendered and only its attributes change after mount, which keeps hydration identical (the hydration test proves it).

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/Chart.test.tsx`, replace the test `'renders a named, described figure that is one tab stop'` with:

```tsx
  it('renders a named, described figure with one tab stop inside: the chart widget', () => {
    render(
      <Chart
        data={weeks}
        width={400}
        title="Margin by week"
        description="Under target for 12 weeks."
      >
        <PointsProbe ids={[1, 2]} />
      </Chart>,
    )
    // (Named `fig`, not `figure`: Step 4's sed rewrites `const figure = …` lines.)
    const fig = screen.getByRole('figure', { name: 'Margin by week' })
    expect(fig).toHaveAccessibleDescription('Under target for 12 weeks.')
    expect(fig).not.toHaveAttribute('tabindex')
    const chart = within(fig).getByRole('application', { name: 'Margin by week' })
    expect(chart).toHaveAttribute('aria-roledescription', 'chart')
    expect(chart).toHaveAttribute('tabindex', '0')
    expect(chart).toHaveAccessibleDescription(
      'Under target for 12 weeks. Use arrow keys to move between points, Home and End for first and last, Escape to clear.',
    )
    // The data table and the live region stay outside the widget, where browse mode reads them.
    expect(chart.querySelector('[aria-live]')).toBeNull()
  })

  it('adds Enter to the hint with onSelect, takes a custom hint, and drops an empty one', () => {
    const { rerender } = render(
      <Chart width={400} title="Probe" onSelect={() => {}}>
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    expect(screen.getByRole('application')).toHaveAccessibleDescription(
      'Use arrow keys to move between points, Home and End for first and last, Escape to clear. Press Enter to select.',
    )
    rerender(
      <Chart width={400} title="Probe" keyboardHint="Flèches pour se déplacer.">
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    expect(screen.getByRole('application')).toHaveAccessibleDescription('Flèches pour se déplacer.')
    rerender(
      <Chart width={400} title="Probe" keyboardHint="">
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    expect(screen.getByRole('application')).not.toHaveAttribute('aria-describedby')
  })

  it('is not focusable while no mark registers points', () => {
    const { container } = render(
      <Chart data={weeks} width={400} title="Lines only">
        {null}
      </Chart>,
    )
    expect(screen.queryByRole('application')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(container.querySelector('[data-ch-part="plot"] svg')).not.toBeNull()
  })
```

In the same file, in `'renders the empty slot instead of the plot for empty data'`, replace `expect(screen.getByRole('figure')).not.toHaveAttribute('tabindex')` with `expect(container.querySelector('[tabindex]')).toBeNull()`.

In `packages/tally-charts/src/theme/surface.test.ts`, add `'plot',` to `PARTS` after `'pill-value',`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/Chart.test.tsx src/theme/surface.test.ts`
Expected: FAIL: no `application` role; `plot` is listed but unused.

- [ ] **Step 3: Move focus and keys to the plot widget**

In `packages/tally-charts/src/react/Chart.tsx`:

1. In `ChartProps`, after `dataTable?: DataTableSpec<D>`, add:

```ts
  /**
   * Instructions read with the chart when it takes keyboard focus. Default: "Use arrow keys to
   * move between points, Home and End for first and last, Escape to clear.", plus " Press Enter
   * to select." with `onSelect`. Set it to translate the text; `""` turns it off.
   */
  keyboardHint?: string
```

2. Destructure `keyboardHint,` after `dataTable,` in the `Chart` parameters.

3. After `const descId = \`${chartId}-desc\``, add:

```ts
  const hintId = `${chartId}-hint`
  // Only a chart whose marks registered points takes focus: the arrow keys need something to
  // move to. The first render (and the server's) has none yet, so the attributes arrive after
  // mount and hydration still matches.
  const interactive = interaction.points.length > 0
  const hint =
    keyboardHint ??
    `Use arrow keys to move between points, Home and End for first and last, Escape to clear.${
      onSelect ? ' Press Enter to select.' : ''
    }`
  const describedBy = [description ? descId : '', hint ? hintId : ''].filter(Boolean).join(' ')
```

4. On the `<figure>`, delete `tabIndex={isEmpty ? undefined : 0}`, `onKeyDown={isEmpty ? undefined : onKeyDown}` and the `onBlur={…}` handler. Keep `onPointerLeave`.

5. After the description span, add the hint span:

```tsx
      {interactive && hint ? (
        <span hidden id={hintId} className="ch-sr-only">
          {hint}
        </span>
      ) : null}
```

6. Replace the content of `<ChartContext.Provider value={ctx}>` (the `<svg>` and the overlay `<div>`) with:

```tsx
          {/* The focusable widget. A figure is not one, so screen readers in browse mode would
              keep the arrow keys; role="application" hands them to the chart. The data table
              stays outside, where browse mode can read it. */}
          <div
            data-ch-part="plot"
            {...(interactive
              ? {
                  role: 'application',
                  'aria-roledescription': 'chart',
                  'aria-labelledby': title ? titleId : undefined,
                  'aria-describedby': describedBy || undefined,
                  tabIndex: 0,
                  onKeyDown,
                  onBlur: () => {
                    if (interaction.source === 'keyboard') interaction.setActive(null, 'keyboard')
                  },
                }
              : null)}
          >
            <svg width={w} height={h} aria-hidden="true" focusable="false" className="ch-svg">
              <PatternDefs chartId={chartId} geometry={hatch} />
              <g transform={`translate(${margin.left},${margin.top})`}>{children}</g>
            </svg>
            <div
              ref={setOverlay}
              data-ch-part="overlay"
              aria-hidden="true"
              className="ch-overlay"
              style={{ left: margin.left, top: margin.top, width: innerWidth, height: innerHeight }}
            />
          </div>
```

The plot div is not positioned, so the overlay still positions against the figure, as before.

In `packages/tally-charts/src/react/charts/shared.ts`, add `| 'keyboardHint'` to the `ChartPassThroughProps` `Pick` list after `| 'description'`.

- [ ] **Step 4: Move the focus ring and the tests to the widget**

In `packages/tally-charts/src/theme/theme.css`, in the `[data-ch-root]` rule delete `outline: none;`, then replace

```css
[data-ch-root]:focus-visible {
  outline: 2px solid var(--ch-accent);
  outline-offset: 4px;
}
```

with

```css
/* The plot takes keyboard focus. Its ring is an outline, which forced-colors mode keeps. */
[data-ch-part="plot"] {
  border-radius: 6px;
  outline: none;
}

[data-ch-part="plot"]:focus-visible {
  outline: 2px solid var(--ch-accent);
  outline-offset: 4px;
}
```

Unit tests that send keys to the figure must send them to the widget. Apply these replacements in `src/react/Chart.test.tsx`, `src/react/charts/*.test.tsx`, `src/react/marks/*.test.tsx` and `src/react/overlays/*.test.tsx` (zsh, from `packages/tally-charts`):

```bash
for f in src/react/Chart.test.tsx src/react/charts/*.test.tsx src/react/marks/*.test.tsx src/react/overlays/*.test.tsx; do
  sed -i '' -E "s/const figure = screen\.getByRole\('figure'/const chart = screen.getByRole('application'/; s/keyDown\(figure, /keyDown(chart, /; s/expect\(figure\)\.toHaveAttribute\('tabindex', '0'\)/expect(chart).toHaveAttribute('tabindex', '0')/; s/fireEvent\.keyDown\(screen\.getByRole\('figure'/fireEvent.keyDown(screen.getByRole('application'/; s/fireEvent\.keyDown\(container\.querySelector\('figure'\) as Element/fireEvent.keyDown(container.querySelector('[role=\"application\"]') as Element/" "$f"
done
```

(On Linux use `sed -i -E`.) Then fix by hand the two tests where the chart has no points, so there is no widget to find:

- `src/react/marks/Bars.test.tsx`, `'registers nothing and draws no hit areas when not interactive'`: replace its `fireEvent.keyDown(…)` line with

```tsx
    // No points, so no keyboard widget: the plot is not focusable and ignores keys.
    expect(container.querySelector('[role="application"]')).toBeNull()
    fireEvent.keyDown(container.querySelector('[data-ch-part="plot"]') as Element, {
      key: 'ArrowRight',
    })
```

- `src/react/marks/Dots.test.tsx`, `'registers nothing when not interactive'`: the same replacement, without the comment line.

Regenerate the server-render snapshot, which now contains the plot div:

Run: `pnpm --filter tally-charts exec vitest run src/ssr.node.test.tsx -u`
Expected: `1 updated`. Then `git diff packages/tally-charts/src/__snapshots__` shows only the added `<div data-ch-part="plot">` wrapper.

In `apps/storybook/e2e/stories.spec.ts`, every `await chart.focus()` and `await causes.focus()` becomes `await chart.getByRole('application').focus()` / `await causes.getByRole('application').focus()` (8 places; the heatmap cell focus stays). The `[aria-live]` locators stay on the figure.

- [ ] **Step 5: Run the tests**

Run: `pnpm test`
Expected: PASS (802 tests), including `hydration.test.tsx` (no mismatch).

- [ ] **Step 6: Update the API report**

Run: `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update && git diff packages/tally-charts/api`
Expected: `keyboardHint?: string;` on `ChartProps`, and `'keyboardHint'` in `ChartPassThroughProps`. Nothing else.

- [ ] **Step 7: Gates and e2e**

Run: `pnpm typecheck && pnpm lint && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (51 e2e tests); LineChart about 12.54 kB.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/e2e/stories.spec.ts
git commit -m "feat: the chart keyboard widget is role=application with a hint (A11Y-1, A11Y-16)

Co-Authored-By: <your own model trailer>"
```

---

### Task 4: Announce series and position; keyboard focus shows the first point (A11Y-12)

**Files:**
- Modify: `packages/tally-charts/src/react/types.ts` (`ChartPoint.series`)
- Modify: `packages/tally-charts/src/react/interaction.ts` (`announcement`, `samePoints`)
- Modify: `packages/tally-charts/src/react/Chart.tsx` (live region text, focus)
- Modify: `packages/tally-charts/src/react/marks/Dots.tsx` (`DotItem.series`)
- Modify: `packages/tally-charts/src/react/charts/StripPlot.tsx`, `packages/tally-charts/src/react/charts/DotHistogram.tsx`
- Modify: `packages/tally-charts/api/tally-charts.api.md` (regenerated)
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Test: `src/react/interaction.test.tsx`, `src/react/Chart.test.tsx`, `src/react/charts/{DotHistogram,LineChart,StripPlot,WaffleColumns}.test.tsx`

**Interfaces:**
- Consumes: the Task 3 widget (`role="application"`, `onFocus` slot on the plot div), `useInteraction`.
- Produces:
  - `ChartPoint.series?: string` (public, additive) and `DotItem.series?: string` (public, additive; `Dots` copies it onto its points).
  - `announcement(points: readonly ChartPoint[], point: ChartPoint): string` in `react/interaction.ts` (internal): `"{series}, {n} of {total}, {label}"`; the position counts within points of the same `series`; the series is left out when every point shares it (or none has one).
  - The live region reads `announcement(points, activePoint)` for keyboard activation.
  - Keyboard focus on the widget with nothing active activates the first registered point (`source 'keyboard'`), so its tooltip shows and it is announced. A focus that follows a pointer press on the plot does not.
  - StripPlot points: `label` drops the series prefix and `series` is the strip's label. DotHistogram points: `series` is the `toneBy` thresholds bin label (only when `toneBy` is a `thresholds()` result).

Spec §5 says "ariaLabel overrides still win": `Bars.ariaLabel` (and the charts' own `ariaOf`) still produce the point's `label`; the chart adds the position (and series) around it.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/interaction.test.tsx`, import `announcement` (`import { announcement, navigate, samePoints, uniquePoints, useInteraction } from './interaction'`) and add before `describe('useInteraction', …)`:

```tsx
describe('announcement', () => {
  it('gives the position and leaves out a series every point shares', () => {
    const points = pts(['a', 'b', 'c'])
    expect(announcement(points, points[1] as ChartPoint)).toBe('2 of 3, Pb')
    const same = points.map((p) => ({ ...p, series: 'Margin' }))
    expect(announcement(same, same[2] as ChartPoint)).toBe('3 of 3, Pc')
  })

  it('starts with the series and counts within it when there are several', () => {
    const points = [
      ...pts(['a', 'b']).map((p) => ({ ...p, series: 'Estimated' })),
      ...pts(['c', 'd', 'e']).map((p) => ({ ...p, series: 'Actual' })),
    ]
    expect(announcement(points, points[1] as ChartPoint)).toBe('Estimated, 2 of 2, Pb')
    expect(announcement(points, points[2] as ChartPoint)).toBe('Actual, 1 of 3, Pc')
  })

  it('counts points without a series together and never prints "undefined"', () => {
    const points = [...pts(['a']), { ...(pts(['b'])[0] as ChartPoint), series: 'Target' }]
    expect(announcement(points, points[0] as ChartPoint)).toBe('1 of 1, Pa')
    expect(announcement(points, points[1] as ChartPoint)).toBe('Target, 1 of 1, Pb')
  })
})
```

In `packages/tally-charts/src/react/Chart.test.tsx`, in `'moves the active point with the keyboard and announces it'`, make the live-region checks exact:

```tsx
    expect(live?.textContent).toBe('1 of 3, Week 1')
    fireEvent.keyDown(chart, { key: 'End' })
    expect(live?.textContent).toBe('3 of 3, Week 3')
```

(replacing the two `toHaveTextContent('Week 1')` / `('Week 3')` lines), and add before `'calls onSelect with the active point on Enter'`:

```tsx
  it('activates and announces the first point when keyboard focus arrives', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2, 3]} />
      </Chart>,
    )
    fireEvent.focus(screen.getByRole('application'))
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: 1 }))
    expect(container.querySelector('[aria-live]')?.textContent).toBe('1 of 3, Week 1')
  })

  it('leaves the active point alone when a pointer press focuses the chart', () => {
    const onActiveChange = vi.fn()
    render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
      </Chart>,
    )
    const chart = screen.getByRole('application')
    fireEvent.pointerDown(chart)
    fireEvent.focus(chart)
    expect(onActiveChange).not.toHaveBeenCalled()
    // The next focus, by keyboard, activates again.
    fireEvent.blur(chart)
    fireEvent.focus(chart)
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: 1 }))
  })
```

Update the exact announcement assertions in the chart tests:

- `DotHistogram.test.tsx`: `'#1, 3.0%'` → `'Critical, 1 of 1, #1, 3.0%'`, `'#2, 12.3%'` → `'At risk, 1 of 2, #2, 12.3%'`, `'#3, 12.8%'` → `'At risk, 2 of 2, #3, 12.8%'`; and in the duplicate-ids test the expected list becomes `['Critical, 1 of 1, job 0, 3.0%', 'At risk, 1 of 1, job 1, 20.0%', 'On target, 1 of 1, job 2, 40.0%']`.
- `LineChart.test.tsx`: prefix the position. `'Sep, 36.0% on the current path, 38.0% with changes'` → `'4 of 4, Sep, …'`; `'Jun, 34.0% Actual'` → `'1 of 4, Jun, 34.0% Actual'` and `'Jul, 32.0% Actual'` → `'2 of 4, …'` in `'announces every series at an x for the keyboard'`; `'1 of 1, Jun, 34.0% Actual'` in `'centres a single x'`; `'3 of 3, Jan 4, 2026, 35.0% Plan'` in the ISO-ids test; in `'steps the keyboard through out-of-order data in date order'` the five values become `'1 of 3, Jan 1, …'`, `'2 of 3, Jan 2, …'`, `'3 of 3, Jan 4, …'`, `'2 of 3, Jan 2, …'`, `'1 of 3, Jan 1, …'`; in `'skips dates outside an explicit domain…'` `'1 of 2, Jan 2, 2026, 32.0% Actual'` and `'2 of 2, Jan 4, 2026, 35.0% Plan'`.
- `StripPlot.test.tsx`: `'Estimated, A, 6 h'` → `'Estimated, 1 of 3, A, 6 h'`, `'Estimated, B, 6.1 h'` → `'Estimated, 2 of 3, B, 6.1 h'`, `'Actual, A, 8 h'` → `'Actual, 1 of 3, A, 8 h'`.
- `WaffleColumns.test.tsx`: `'Sep 7, 24'` → `'3 of 4, Sep 7, 24'`; the duplicate-ids list becomes `['1 of 4, Aug 3, 8', '2 of 4, Aug 10, 12', '3 of 4, Sep 7, 24', '4 of 4, Sep 14, 10']`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/interaction.test.tsx src/react/Chart.test.tsx src/react/charts`
Expected: FAIL: `announcement` is not exported, focus activates nothing, and the live region still reads the bare labels.

- [ ] **Step 3: `series` on points and the announcement**

In `packages/tally-charts/src/react/types.ts`, in `ChartPoint`, after `label: string` add:

```ts
  /**
   * The series the point belongs to, e.g. "Estimated". When a chart's points come from more than
   * one series, announcements start with it; the position ("2 of 7") counts within it.
   */
  series?: string
```

In `packages/tally-charts/src/react/interaction.ts`, add before `uniquePoints`:

```ts
/**
 * What the live region says for a point: "{series}, {n} of {total}, {label}". The position counts
 * within the point's series, and the series is left out when every point shares it.
 */
export function announcement(points: readonly ChartPoint[], point: ChartPoint): string {
  const peers = points.filter((p) => p.series === point.series)
  const several = points.some((p) => p.series !== point.series)
  return [
    several ? point.series : undefined,
    `${peers.indexOf(point) + 1} of ${peers.length}`,
    point.label,
  ]
    .filter(Boolean)
    .join(', ')
}
```

and in `samePoints` add `p.series === q.series &&` after `p.label === q.label &&`.

- [ ] **Step 4: Speak it, and activate on keyboard focus**

In `packages/tally-charts/src/react/Chart.tsx`:

1. Import it: `import { announcement, type InteractionOptions, navigate, useInteraction } from './interaction'`.
2. After `const rootRef = useRef<HTMLElement>(null)` add:

```ts
  // Set by a pointer press on the plot, so the focus that follows a click doesn't act like Tab.
  const pressed = useRef(false)
```

3. Replace the `const announcement = …` block with:

```ts
  const spoken =
    interaction.source === 'keyboard' && interaction.activePoint
      ? announcement(interaction.points, interaction.activePoint)
      : ''
```

   and render `{spoken}` in the `aria-live` div.
4. In the interactive props of the plot div, after `onKeyDown,` add:

```ts
                  onPointerDown: () => {
                    pressed.current = true
                  },
                  // Keyboard focus alone shows the first point, its tooltip and announcement.
                  onFocus: () => {
                    const byPointer = pressed.current
                    pressed.current = false
                    const first = interaction.points[0]
                    if (!byPointer && !interaction.activePoint && first) {
                      interaction.setActive(first.id, 'keyboard')
                    }
                  },
```

- [ ] **Step 5: Series for strip rows and histogram groups**

In `packages/tally-charts/src/react/marks/Dots.tsx`, add to `DotItem` after `group?: PointGroup`:

```ts
  /** Series name for announcements, see `ChartPoint.series`. */
  series?: string
```

and copy it onto the point: `series: d.series,` after `group: d.group,`.

In `packages/tally-charts/src/react/charts/StripPlot.tsx`, in `StripRows`, replace

```ts
        label: row.name ? `${s.label}, ${row.name}, ${text}` : `${s.label}, ${text}`,
```

with

```ts
        label: row.name ? `${row.name}, ${text}` : text,
        series: s.label,
```

In `packages/tally-charts/src/react/charts/DotHistogram.tsx`:

1. Add to `HistogramRow<D>` after `aria: string`:

```ts
  /** The `toneBy` thresholds bin label, e.g. "Critical"; announced as the series. */
  group: string | undefined
```

2. In the `rows` memo, after `aria: name ? \`${name}, ${text}\` : text,` add:

```ts
        group:
          toneBy && typeof toneBy !== 'function'
            ? toneBy.bins[toneBy.indexOf(v)]?.label
            : undefined,
```

3. In `HistogramDots`, add `series: row.group,` after `label: row.aria,`.
4. The data table's Group column reuses it: replace the `columns.push({ header: 'Group', value: (r) => toneBy.bins[…]… })` call with `columns.push({ header: 'Group', value: (r) => r.group ?? '' })`.

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS (807 tests).

- [ ] **Step 7: Update the API report and the e2e expectations**

Run: `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update && git diff packages/tally-charts/api`
Expected: `series?: string;` added to `ChartPoint` and to `DotItem`, nothing else.

In `apps/storybook/e2e/stories.spec.ts`:

1. Replace the test `'keyboard focus shows the tooltip and announces the point'` with:

```ts
test('keyboard focus shows the first point, and the keys move and announce it', async ({
  page,
}) => {
  await open(page, 'reference-last-12-weeks--light')
  const chart = page.locator('[data-ch-root]')
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 6')
  await expect(chart.locator('[aria-live]')).toHaveText('1 of 12, Jul 6, 37.5%')
  await page.keyboard.press('End')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Sep 21')
  await expect(chart.locator('[aria-live]')).toHaveText('12 of 12, Sep 21, 34.0%')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ch-part="tooltip"]')).toHaveCount(0)
})
```

2. `'arrow keys and Enter select a drill row'`: focus now activates the first row, so press `ArrowDown` once (delete the second press) and add the comment `// Focus activates the first row; one step down is the second.` above the focus line.
3. `'comparison rows announce plan, actual and difference'`: delete the `ArrowDown` press and expect `'1 of 6, Labor, plan $640, actual $1,060, +$420'`.
4. `'the waterfall announces running totals'`: press `ArrowDown` once and expect `'2 of 7, Labor overruns, −1.6 pts · $7.7K, running total 36.4%'`.
5. `'the dot histogram walks bins with the arrow keys'`: after the focus expect `'Critical, 1 of 6, #5600, 3.1%'`, then after one `ArrowRight` expect `'Critical, 2 of 6, #5601, 4.2%'`.
6. Prefix the remaining three expectations: `'9 of 9, Dec, 36.0% on the current path, 37.6% with changes'`, `'24 of 24, Mar 2, 11:00 PM, 43.0% Line load today'`, `'1 of 60, Jan 2021, 365 Revenue over five years'`.

- [ ] **Step 8: Gates and e2e**

Run: `pnpm typecheck && pnpm lint && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (51 e2e tests); LineChart about 12.65 kB.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/e2e/stories.spec.ts
git commit -m "feat: announce series and position, and show the first point on keyboard focus (A11Y-12)

Co-Authored-By: <your own model trailer>"
```

---

### Task 5: Escape closes hover tooltips; the pointer can rest on them (A11Y-10)

**Files:**
- Modify: `packages/tally-charts/src/react/Chart.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Test: `src/react/Chart.test.tsx`, `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `interaction.source`, `interaction.setActive` (stable `useCallback`).
- Produces: while a point is active from the pointer, a `document` `keydown` listener clears it on Escape; it is removed as soon as nothing is pointer-active. `[data-ch-part="tooltip"]` takes pointer events, so the pointer moving onto a tooltip no longer reaches the hit areas (or `NearestPointer`) under it; callouts (`[data-ch-part="callout"]`, also `.ch-tooltip`) stay click-through. No API change.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/Chart.test.tsx`, before `'reports a null active id when the controlled id is not among the registered points'`, add:

```tsx
  it('closes a hover tooltip on Escape wherever focus is', () => {
    const onActiveChange = vi.fn()
    let ctx: InternalChartContext | undefined
    render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    act(() => ctx?.setActive(2, 'pointer'))
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ id: 2 }))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    // Nothing is listening once the tooltip is gone.
    onActiveChange.mockClear()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onActiveChange).not.toHaveBeenCalled()
  })
```

In `packages/tally-charts/src/theme/theme.test.ts`, before `'disables motion for reduced-motion users'`, add:

```ts
  it('lets the pointer rest on a hover tooltip but not on a pinned callout', () => {
    expect(css).toMatch(/\[data-ch-part="tooltip"\] \{\s*pointer-events: auto;/)
    expect(css).not.toMatch(/\[data-ch-part="callout"\][^{]*\{[^}]*pointer-events: auto/)
  })
```

In `apps/storybook/e2e/stories.spec.ts`, before `'a fast click selects the clicked bar, not the one hovered before'`, add:

```ts
test('Escape closes a hover tooltip', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  await page.locator('[data-ch-part="bar-hit"]').nth(3).hover()
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 27')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ch-part="tooltip"]')).toHaveCount(0)
})

test('the pointer can move onto a hover tooltip without closing it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-dallas-installs--light')
  const dot = await page.locator('[data-ch-part="dot"]').first().boundingBox()
  if (!dot) throw new Error('no dot')
  await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2)
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  await expect(tooltip).toContainText('Estimated')
  const tip = await tooltip.boundingBox()
  if (!tip) throw new Error('no tooltip')
  await page.mouse.move(tip.x + tip.width / 2, tip.y + tip.height / 2, { steps: 8 })
  await expect(tooltip).toContainText('Estimated')
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/Chart.test.tsx src/theme/theme.test.ts`
Expected: FAIL: Escape on the body changes nothing; no `pointer-events: auto` rule.

Run: `pnpm --filter storybook-app exec playwright test --grep "Escape closes|move onto"`
Expected: both FAIL (the tooltip stays after Escape; it closes when the pointer reaches it).

- [ ] **Step 3: Close hover tooltips on Escape**

In `packages/tally-charts/src/react/Chart.tsx`, add `useEffect` to the `react` import, and after `const effectiveActiveId = …` add:

```ts
  // A tooltip opened by hover closes on Escape wherever focus is (WCAG 1.4.13).
  const hovering = interaction.source === 'pointer' && effectiveActiveId !== null
  const { setActive } = interaction
  useEffect(() => {
    if (!hovering) return
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null, 'pointer')
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [hovering, setActive])
```

(`globalThis.KeyboardEvent` is the DOM event; the file already imports React's `KeyboardEvent` type for `onKeyDown`.)

- [ ] **Step 4: Let the pointer rest on a tooltip**

In `packages/tally-charts/src/theme/theme.css`, after the `.ch-tooltip { position: absolute; z-index: 1; }` rule, add:

```css
/* The pointer can rest on a hover tooltip without closing it (WCAG 1.4.13): over the tooltip,
   the hit areas under it get no pointer moves. Pinned callouts stay click-through. */
[data-ch-part="tooltip"] {
  pointer-events: auto;
}
```

The tooltip is a DOM child of the figure, so moving onto it doesn't fire the figure's `pointerleave` either.

- [ ] **Step 5: Run the tests and the gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (809 unit, 53 e2e); LineChart about 12.74 kB.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/e2e/stories.spec.ts
git commit -m "feat: Escape closes hover tooltips, and the pointer can rest on them (A11Y-10)

Co-Authored-By: <your own model trailer>"
```

---

### Task 6: Toned text, 3:1 light marks, outlined soft and hatched marks (A11Y-2, A11Y-3)

**Files:**
- Modify: `packages/tally-charts/src/theme/theme.css`
- Modify: `packages/tally-charts/src/react/marks/RowLabels.tsx`, `src/react/marks/Bars.tsx`, `src/react/marks/Dots.tsx`
- Modify: `packages/tally-charts/src/react/charts/BridgeChart.tsx`, `src/react/charts/WaffleColumns.tsx`
- Modify: `packages/tally-charts/src/react/ui/TooltipPill.tsx`, `src/react/ui/Delta.tsx`, `src/react/ui/Stat.tsx`, `src/react/ui/RangeMeter.tsx`
- Modify: `packages/tally-charts/src/__snapshots__/last-twelve-weeks.ssr.html` (regenerated)
- Test: `src/theme/theme.test.ts`, `src/theme/surface.test.ts`, `src/react/marks/RowLabels.test.tsx`, `src/react/ui/Stat.test.tsx`

**Interfaces:**
- Consumes: `toneVar(tone)` (`react/ui/util.ts`: sets `--_ch-swatch-color: var(--ch-<tone>)`).
- Produces:
  - New public state attribute `data-ch-tone-text="true"` on every element whose text is painted in a tone. One CSS rule paints it: `color` and `fill` = `color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))`. The tone comes from `--_ch-swatch-color` on the element or an ancestor.
  - The private class `ch-tone-text` is gone from markup and CSS (and from `PRIVATE_CLASSES`).
  - `Bars` and `Dots` set `--_ch-swatch-color` on each mark, for the outline rule.
  - Light tokens: `--ch-warn: #be802f`, `--ch-gain: #22a363`, `--ch-neutral: #8e8e95` (spec §5). Dark tokens unchanged.

Spec §5: "Hatched marks get the same outline." This plan outlines `hatch` fills, not `hatch-fade`: the faded history bars are listed as decorative in spec §5 ("fade ends") and `docs/a11y.md` (Task 17), and outlining every history bar would change the reference look of `last-12-weeks`.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/theme/theme.test.ts`, after the `MATRIX` constant, add:

```ts
const TONE_MATRIX = (Object.keys(THEMES) as (keyof typeof THEMES)[]).flatMap((theme) =>
  TONES.map((tone) => ({ theme, tone })),
)
/** Share of the tone in toned text and outlines (`--ch-tone-text-mix`), 0–1. */
const TEXT_MIX =
  Number.parseFloat(declarations(/\n:root(?=\s*\{)/).get('--ch-tone-text-mix') ?? '') / 100
/** The color toned text and the outlines of soft and hatched marks are painted in. */
const inked = (theme: keyof typeof THEMES, tone: string) =>
  mix(hex(THEMES[theme].get(`--ch-${tone}`)), TEXT_MIX, hex(THEMES[theme].get('--ch-ink')))
```

and, before `'declares the same dark tokens for the system preference and the forced theme'`, add:

```ts
  it('paints toned text through one shared rule that mixes the tone with ink', () => {
    const inkMix =
      'color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    const rule = css.match(/\n\[data-ch-tone-text\] \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain(`color: ${inkMix}`)
    expect(rule).toContain(`fill: ${inkMix}`)
    // No rule paints text in the raw tone any more.
    expect(css).not.toMatch(/(?:^|[;{\s])(?:color|fill): var\(--_ch-swatch-color\)/)
    expect(css).not.toContain('.ch-tone-text')
  })

  it('outlines hatched bars, soft-accent bars and dots, and hatched or soft swatches', () => {
    const outline =
      'stroke: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    const rule = css.match(/\[data-ch-part="bar"\]\[data-ch-fill="hatch"\],[^{]*\{([^}]*)\}/)
    expect(rule?.[0]).toContain('[data-ch-part="bar"][data-ch-tone="accent-soft"]')
    expect(rule?.[0]).toContain(
      '[data-ch-part="dot"][data-ch-tone="accent-soft"]:not([data-ch-soft])',
    )
    expect(rule?.[1]).toContain(outline)
    expect(rule?.[1]).toContain('stroke-width: 1px')
    expect(css).toMatch(
      /\[data-ch-part="legend-swatch"\]\[data-ch-tone="accent-soft"\]:not\(\[data-ch-shape="line"\]\) \{\s*box-shadow: inset 0 0 0 1px\s+color-mix/,
    )
  })

  it.each(TONE_MATRIX)(
    'keeps $tone text at 4.5:1 on the surface and the tooltip in the $theme theme',
    ({ theme, tone }) => {
      const text = inked(theme, tone)
      expect(contrast(text, hex(THEMES[theme].get('--ch-surface')))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(text, hex(THEMES[theme].get('--ch-tooltip-bg')))).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(TONE_MATRIX)(
    'keeps $tone marks at 3:1 on the surface in the $theme theme',
    ({ theme, tone }) => {
      const surface = hex(THEMES[theme].get('--ch-surface'))
      // The outline of soft and hatched marks carries 3:1 for every tone.
      expect(contrast(inked(theme, tone), surface)).toBeGreaterThanOrEqual(3)
      // accent-soft keeps its soft fill (it means "estimate"); every other tone is a solid mark.
      if (tone !== 'accent-soft') {
        expect(contrast(hex(THEMES[theme].get(`--ch-${tone}`)), surface)).toBeGreaterThanOrEqual(3)
      }
    },
  )

  it('darkens the light warn, gain and neutral marks to the spec values', () => {
    expect(THEMES.light.get('--ch-warn')).toBe('#be802f')
    expect(THEMES.light.get('--ch-gain')).toBe('#22a363')
    expect(THEMES.light.get('--ch-neutral')).toBe('#8e8e95')
  })
```

In `packages/tally-charts/src/theme/surface.test.ts`: add `'tone-text',` to `STATES` after `'tone',`, and remove `'ch-tone-text',` from `PRIVATE_CLASSES`.

In `packages/tally-charts/src/react/marks/RowLabels.test.tsx`, test `'colors text by tone and marks muted columns'`, replace

```tsx
    expect(labels(container)[0]).toHaveAttribute('data-ch-tone', 'loss')
    expect(labels(container)[0]).toHaveStyle({ fill: 'var(--ch-loss)' })
    expect(labels(container)[1]).not.toHaveAttribute('data-ch-tone')
```

with

```tsx
    expect(labels(container)[0]).toHaveAttribute('data-ch-tone', 'loss')
    // theme.css mixes the tone with ink for any [data-ch-tone-text], so the text keeps 4.5:1.
    expect(labels(container)[0]).toHaveAttribute('data-ch-tone-text', 'true')
    expect(labels(container)[0]?.getAttribute('style')).toBe('--_ch-swatch-color: var(--ch-loss);')
    expect(labels(container)[1]).not.toHaveAttribute('data-ch-tone')
    expect(labels(container)[1]).not.toHaveAttribute('data-ch-tone-text')
```

In `packages/tally-charts/src/react/ui/Stat.test.tsx`, replace `expect(value).toHaveClass('ch-tone-text')` with `expect(value).toHaveAttribute('data-ch-tone-text', 'true')`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/theme src/react/marks/RowLabels.test.tsx src/react/ui/Stat.test.tsx`
Expected: FAIL: no `[data-ch-tone-text]` rule; light warn (2.02:1), gain (2.93:1) and neutral (2.40:1) marks under 3:1; `tone-text` unused.

- [ ] **Step 3: Tokens, the shared text rule and the outlines in `theme.css`**

In `packages/tally-charts/src/theme/theme.css`:

1. In the light block (`:root, [data-ch-theme="light"]`) replace

```css
  --ch-warn: #f1a23b;
  --ch-gain: #23a866;
  --ch-neutral: #a3a3ab;
```

with

```css
  --ch-warn: #be802f;
  --ch-gain: #22a363;
  --ch-neutral: #8e8e95;
```

2. Delete the rule

```css
[data-ch-part="pill-segment"][data-ch-tone] [data-ch-part="pill-value"] {
  color: var(--_ch-swatch-color);
}
```

3. Replace

```css
/* ---------- Small UI pieces ---------- */
.ch-tone-text {
  color: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink));
}
```

with

```css
/* ---------- Toned text and outlines ---------- */
/* Every text painted in a tone (row and value labels, bridge notes, waffle group labels, pill
   values, deltas, stats) mixes the tone with ink, which keeps 4.5:1 or more on the surface. */
[data-ch-tone-text] {
  color: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink));
  fill: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink));
}

/* Hatched marks and the soft accent (which means "estimate") keep their light fill and get a 1px
   outline in the same inked tone, so their edge keeps 3:1 on the surface. */
[data-ch-part="bar"][data-ch-fill="hatch"],
[data-ch-part="bar"][data-ch-tone="accent-soft"],
[data-ch-part="dot"][data-ch-tone="accent-soft"]:not([data-ch-soft]) {
  stroke: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink));
  stroke-width: 1px;
}

[data-ch-fill="hatch"]:is(
  [data-ch-part="legend-swatch"],
  [data-ch-part="meter-fill"],
  [data-ch-part="inline-bar-fill"],
  [data-ch-part="range-gap"]
),
[data-ch-part="legend-swatch"][data-ch-tone="accent-soft"]:not([data-ch-shape="line"]) {
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink));
}

/* ---------- Small UI pieces ---------- */
```

The text rule sits after the label rules on purpose: it has the same specificity as `[data-ch-part="row-label"]` and `[data-ch-part="group-label"]` and wins by order. A muted toned row label (`[data-ch-part="row-label"][data-ch-muted="true"]`) stays muted.

- [ ] **Step 4: Mark toned text in the components**

1. `packages/tally-charts/src/react/marks/RowLabels.tsx`: add `import { toneVar } from '../ui/util'`; on the `row-label` `<text>` add `data-ch-tone-text={tone ? 'true' : undefined}` after `data-ch-tone={tone}`, and replace `style={tone ? { fill: \`var(--ch-${tone})\` } : undefined}` with `style={tone ? toneVar(tone) : undefined}`.
2. `packages/tally-charts/src/react/charts/BridgeChart.tsx`: add `import { toneVar } from '../ui/util'` (after the `../types` import); on the `column-note` `<text>` add `data-ch-tone-text="true"` after `data-ch-tone={r.capTone}` and replace `style={{ fill: \`var(--ch-${r.capTone})\` }}` with `style={toneVar(r.capTone)}`.
3. `packages/tally-charts/src/react/charts/WaffleColumns.tsx`: add `import { toneVar } from '../ui/util'`; on the `group-label` `<text>` add `data-ch-tone-text={span.tone === 'neutral' ? undefined : 'true'}` after its `data-ch-tone`, and replace its `style` with `style={span.tone === 'neutral' ? undefined : toneVar(span.tone)}`.
4. `packages/tally-charts/src/react/ui/TooltipPill.tsx`: the value span becomes

```tsx
          <span
            className="ch-pill-value"
            data-ch-part="pill-value"
            data-ch-tone-text={segment.tone ? 'true' : undefined}
          >
```

5. `packages/tally-charts/src/react/ui/Delta.tsx`: the arrow becomes

```tsx
      <span
        aria-hidden="true"
        className="ch-delta-arrow"
        data-ch-part="delta-arrow"
        data-ch-tone-text="true"
      >
```

6. `packages/tally-charts/src/react/ui/Stat.tsx`: the value div gets `className="ch-stat-value"` and `data-ch-tone-text={tone ? 'true' : undefined}` after `data-ch-tone={tone}`.
7. `packages/tally-charts/src/react/ui/RangeMeter.tsx`: the value label gets `className="ch-range-value-label"` and `data-ch-tone-text="true"` after `data-ch-part="range-value-label"`.

- [ ] **Step 5: Give bars and dots their tone for the outline**

In `packages/tally-charts/src/react/marks/Bars.tsx`, in the `style` object of each bar, after `mask: paint.mask,` add:

```ts
          // The tone, for the outline theme.css draws on hatched and soft bars.
          '--_ch-swatch-color': `var(--ch-${tone})`,
```

In `packages/tally-charts/src/react/marks/Dots.tsx`, import `type CSSProperties` from `react` and replace the dot's `style={{ fill: … }}` with:

```tsx
            style={
              {
                fill: d.soft
                  ? `color-mix(in srgb, var(--ch-${d.tone}) ${SOFT_MIX}%, var(--ch-surface))`
                  : `var(--ch-${d.tone})`,
                '--_ch-swatch-color': `var(--ch-${d.tone})`,
              } as CSSProperties
            }
```

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/ssr.node.test.tsx -u` (the bars' inline style grew), then `pnpm test`.
Expected: `1 updated`, then PASS (836 tests) including `hydration.test.tsx`.

- [ ] **Step 7: Gates and e2e**

Run: `pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS; no API report change.

Look at `reference-estimate-vs-actual--light` and `reference-dallas-installs--light` at 1280px (your own Storybook on a free port, never 6006): hatched bars and the "Estimated" dots have a thin darker edge; "+$420" and "On plan" are darker than before.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: inked tone text, 3:1 light marks and outlined soft and hatched marks (A11Y-2, A11Y-3)

Co-Authored-By: <your own model trailer>"
```

---

### Task 7: A sequential ramp per tone and theme (A11Y-9, spec §6)

**Files:**
- Modify: `packages/tally-charts/src/theme/theme.css` (theme blocks, sequential levels, tone rules, light outline)
- Modify: `packages/tally-charts/src/react/charts/Heatmap.tsx` (no inline base)
- Create: `apps/storybook/stories/Sequential.stories.tsx`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Test: `src/theme/theme.test.ts`, `src/react/charts/Heatmap.test.tsx`

**Interfaces:**
- Consumes: the Task 6 light tokens (`--ch-warn #be802f`, `--ch-gain #22a363`, `--ch-neutral #8e8e95`).
- Produces:
  - Private theme tokens in all three theme blocks: `--_ch-seq-ink-strong` (`#fff` light, `var(--ch-surface)` dark), `--_ch-seq-outline` (`1px` light, `0px` dark), `--_ch-seq-accent-soft-depth` (`84%` light, `100%` dark) and `--_ch-seq-<tone>-<n>` for every tone and n = 2…5.
  - `[data-ch-seq-tone="<tone>"]` rules for all six tones set `--ch-seq-base` and `--ch-seq-mix-2…5`. Setting `data-ch-seq-tone` on any ancestor gives a standalone `Legend` the same ramp and guarantees as a Heatmap with `tone`.
  - Without a tone, the levels are loss's ramp (`--ch-seq-mix-N` falls back to `--_ch-seq-loss-N`).
  - Heatmap no longer sets `--ch-seq-base` inline; `data-ch-seq-tone` does it.
  - Story ids `primitives-sequential--light` and `primitives-sequential--dark`.

How the values were picked (planning, verified in Chromium): level 1 is 12% everywhere (the reference's lightest pink); the other shares maximise the smallest step between neighbouring levels while every text keeps at least 4.6:1 (a margin over 4.5 for browser rounding). The light theme's level 5 is the base mixed with black just far enough for white text; the dark theme's level 5 is the pure base with dark text (spec §6). Sampling `docs/reference/05-leakage-heatmap.png` gives #f13692 for the top cell, within a few units of `--ch-loss` #e5368d, so the loss ramp keeps `--ch-loss` as its base; white text needs 4.5:1, so its top level is #d33282 either way. The light accent-soft (#9dbcf6, luminance 0.50) is too light to fit five steps of 1.3:1 above the surface, so its light ramp starts from the tone mixed 84% with black (#849ecf).

| Theme | Tone | Shares, levels 1–5 | Colors |
|---|---|---|---|
| light | accent | 12 36 58 79 100 | #e2e9f9 #b1c7f6 #84a7f4 #5a89f2 #2f6bf0 |
| light | accent-soft (base 84%) | 12 44 73 100 74 | #eceff5 #c6d2e7 #a4b7db #849ecf #627599 |
| light | loss | 12 36 59 83 92 | #f7e2ed #f2b3d3 #ee86ba #e957a0 #d33282 |
| light | warn | 12 44 72 98 83 | #f3ebe2 #e0c4a1 #cfa268 #bf8233 #9e6a27 |
| light | gain | 12 42 71 100 81 | #e0f0e8 #9fd5bb #61bc8f #22a363 #1c8450 |
| light | neutral | 12 45 74 100 82 | #ededee #c9c9cd #aaaaaf #8e8e95 #74747a |
| dark | accent | 12 35 55 76 100 | #192031 #273b67 #325296 #3f6ac7 #4d86ff |
| dark | accent-soft | 12 36 57 77 100 | #1b1f2a #2c3854 #3b4e79 #49649c #5a7cc4 |
| dark | loss | 12 34 53 72 100 | #2e1926 #632744 #90325f #bd3e79 #ff4fa0 |
| dark | warn | 12 26 39 52 100 | #2e251c #503c24 #6e502b #8d6532 #ffb24d |
| dark | gain | 12 28 42 56 100 | #172923 #1e4735 #246144 #2a7c54 #3ccf86 |
| dark | neutral | 12 36 57 77 100 | #1f1f23 #38383e #4e4e55 #64646c #7c7c86 |

Smallest values over all 60 tone × theme × level cases: text 4.53:1 (dark neutral level 5: the pure base, fixed by spec §6), step 1.324 (light accent-soft), level 5 against the surface 4.42:1.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/theme/theme.test.ts`:

1. Replace the `levelMix` function with:

```ts
const toHex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`

/**
 * A custom property value as the browser computes it: every `var()` replaced from `env` (or its
 * fallback), then every `color-mix(in srgb, #a p%, #b)` evaluated to a hex color.
 */
function resolve(value: string, env: ReadonlyMap<string, string>): string {
  let out = value
  for (let guard = 0; guard < 100 && out.includes('var('); guard++) {
    // The last var( has no var( inside it.
    const start = out.lastIndexOf('var(')
    let depth = 0
    let end = start + 3
    for (; end < out.length; end++) {
      if (out[end] === '(') depth++
      if (out[end] === ')' && --depth === 0) break
    }
    const inner = out.slice(start + 4, end)
    const comma = inner.indexOf(',')
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim()
    const fallback = comma < 0 ? undefined : inner.slice(comma + 1).trim()
    const found = env.get(name) ?? fallback
    expect(found, `${name} in ${value}`).toBeDefined()
    out = out.slice(0, start) + found + out.slice(end + 1)
  }
  const MIX = /color-mix\(in srgb, (#[0-9a-f]{3,6}) ([\d.]+)%, (#[0-9a-f]{3,6})\)/i
  for (let guard = 0; guard < 20 && MIX.test(out); guard++) {
    out = out.replace(MIX, (_, a: string, p: string, b: string) =>
      toHex(mix(hex(a), Number.parseFloat(p) / 100, hex(b))),
    )
  }
  return out
}

/** The custom properties a heatmap or legend sees in a theme, under a `data-ch-seq-tone`. */
function seqEnv(theme: keyof typeof THEMES, tone?: string): Map<string, string> {
  const toneRule = tone ? declarations(new RegExp(`\\[data-ch-seq-tone="${tone}"\\]`)) : []
  return new Map([...THEMES[theme], ...toneRule])
}

/** The five level colors of a ramp. */
function ramp(theme: keyof typeof THEMES, tone?: string): Rgb[] {
  const env = seqEnv(theme, tone)
  return LEVELS.map((level) => hex(resolve(SEQ.get(`--ch-seq-${level}`) ?? '', env)))
}
```

2. After `const MATRIX = …`, add `const STEP_MATRIX = MATRIX.filter(({ level }) => level < 5)`.

3. Replace the test `'builds the sequential levels from an inherited base on charts, legends and heatmaps'` with:

```ts
  it('builds the sequential levels from an inherited base on charts, legends and heatmaps', () => {
    const base = 'var(--ch-seq-base, var(--ch-loss))'
    expect(SEQ.get('--ch-seq-1')).toBe(
      `color-mix(in srgb, ${base} var(--ch-seq-mix-1, 12%), var(--ch-surface))`,
    )
    expect(SEQ.get('--ch-seq-4')).toBe(
      `color-mix(in srgb, ${base} var(--ch-seq-mix-4, var(--_ch-seq-loss-4)), var(--ch-surface))`,
    )
    expect(SEQ.get('--ch-seq-5')).toBe(
      `color-mix(in srgb, ${base} var(--ch-seq-mix-5, var(--_ch-seq-loss-5)), #000)`,
    )
    // A default base or default shares would stop an ancestor's values from reaching the levels:
    // only the data-ch-seq-tone rules set them.
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    for (const [, selector, body] of rules) {
      if (/--ch-seq-base:|--ch-seq-mix-\d:/.test(body ?? '')) {
        const bare = (selector ?? '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
        expect(bare).toMatch(/^\[data-ch-seq-tone="[a-z-]+"\]$/)
      }
    }
  })

  it('keys a base and the level shares for every tone on data-ch-seq-tone', () => {
    for (const tone of TONES) {
      const rule = declarations(new RegExp(`\\[data-ch-seq-tone="${tone}"\\]`))
      expect(rule.get('--ch-seq-base')).toContain(`var(--ch-${tone})`)
      for (const level of [2, 3, 4, 5]) {
        expect(rule.get(`--ch-seq-mix-${level}`)).toBe(`var(--_ch-seq-${tone}-${level})`)
      }
    }
    // Without a tone the ramp is loss's.
    for (const theme of ['light', 'dark'] as const) {
      expect(ramp(theme)).toEqual(ramp(theme, 'loss'))
    }
  })

  it('makes the dark top level the pure base, with dark text, and the light one darker, with white', () => {
    for (const tone of TONES) {
      expect(ramp('dark', tone)[4]).toEqual(hex(THEMES.dark.get(`--ch-${tone}`)))
    }
    expect(THEMES.light.get('--_ch-seq-ink-strong')).toBe('#fff')
    expect(THEMES.dark.get('--_ch-seq-ink-strong')).toBe('var(--ch-surface)')
    // The loss ramp tops out at the hot pink of the reference, darkened only for white text.
    expect(toHex(ramp('light', 'loss')[4] as Rgb)).toBe('#d33282')
  })

  it('outlines the two lightest levels in the light theme only', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\]:is\(\[data-ch-level="1"\], \[data-ch-level="2"\]\),\s*\[data-ch-part="legend-swatch"\]:is\(\[data-ch-level="1"\], \[data-ch-level="2"\]\) \{\s*box-shadow: inset 0 0 0 var\(--_ch-seq-outline\)\s+color-mix\(in srgb, var\(--ch-seq-base, var\(--ch-loss\)\) 45%, var\(--ch-surface\)\)/,
    )
    expect(THEMES.light.get('--_ch-seq-outline')).toBe('1px')
    expect(THEMES.dark.get('--_ch-seq-outline')).toBe('0px')
  })
```

4. Replace the body of the `it.each(MATRIX)('keeps heatmap text at 4.5:1 on $tone level $level in the $theme theme', …)` test with:

```ts
    ({ theme, tone, level }) => {
      const env = seqEnv(theme, tone)
      const background = ramp(theme, tone)[level - 1] as Rgb
      // Levels 1–4 inherit the cell's --ch-ink; level 5 switches to --_ch-seq-ink-strong.
      const ink = level === 5 ? '--_ch-seq-ink-strong' : '--ch-ink'
      const text = hex(resolve(env.get(ink) ?? '', env))
      expect(contrast(background, text)).toBeGreaterThanOrEqual(4.5)
    },
```

   and add after it:

```ts
  it.each(STEP_MATRIX)(
    'sets $tone level $level apart from the next by 1.3:1 in the $theme theme',
    ({ theme, tone, level }) => {
      const levels = ramp(theme, tone)
      expect(contrast(levels[level - 1] as Rgb, levels[level] as Rgb)).toBeGreaterThanOrEqual(1.3)
    },
  )

  it.each(TONE_MATRIX)(
    'keeps the $tone level 5 at 3:1 on the surface in the $theme theme',
    ({ theme, tone }) => {
      const surface = hex(THEMES[theme].get('--ch-surface'))
      expect(contrast(ramp(theme, tone)[4] as Rgb, surface)).toBeGreaterThanOrEqual(3)
    },
  )
```

In `packages/tally-charts/src/react/charts/Heatmap.test.tsx`, test `'recolors the levels and the legend with tone'`, replace

```tsx
    expect(root.style.getPropertyValue('--ch-seq-base')).toBe('var(--ch-warn)')
    // Keys the per-tone level mixes in theme.css; the legend inherits them from the root.
    expect(root).toHaveAttribute('data-ch-seq-tone', 'warn')
```

with

```tsx
    // Keys the tone's base and level shares in theme.css; the legend inherits them from the root.
    expect(root).toHaveAttribute('data-ch-seq-tone', 'warn')
    expect(root.style.getPropertyValue('--ch-seq-base')).toBe('')
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/theme/theme.test.ts src/react/charts/Heatmap.test.tsx`
Expected: FAIL: `--_ch-seq-loss-4` is missing, dark levels 4/5 are 1.04–1.23:1 apart, light levels 1–2 are 1.07–1.34:1 apart, Heatmap still sets an inline base.

- [ ] **Step 3: The theme tokens**

In `packages/tally-charts/src/theme/theme.css`, add at the end of the light block (after `--ch-hatch-tint: 0.14;`):

```css
  /* Sequential ramp (private): ink on the darkest level, the light outline width, the
     soft accent's ramp depth and each tone's level 2–5 shares. Level 1 is 12% everywhere. */
  --_ch-seq-ink-strong: #fff;
  --_ch-seq-outline: 1px;
  --_ch-seq-accent-soft-depth: 84%;
  --_ch-seq-accent-2: 36%;
  --_ch-seq-accent-3: 58%;
  --_ch-seq-accent-4: 79%;
  --_ch-seq-accent-5: 100%;
  --_ch-seq-accent-soft-2: 44%;
  --_ch-seq-accent-soft-3: 73%;
  --_ch-seq-accent-soft-4: 100%;
  --_ch-seq-accent-soft-5: 74%;
  --_ch-seq-loss-2: 36%;
  --_ch-seq-loss-3: 59%;
  --_ch-seq-loss-4: 83%;
  --_ch-seq-loss-5: 92%;
  --_ch-seq-warn-2: 44%;
  --_ch-seq-warn-3: 72%;
  --_ch-seq-warn-4: 98%;
  --_ch-seq-warn-5: 83%;
  --_ch-seq-gain-2: 42%;
  --_ch-seq-gain-3: 71%;
  --_ch-seq-gain-4: 100%;
  --_ch-seq-gain-5: 81%;
  --_ch-seq-neutral-2: 45%;
  --_ch-seq-neutral-3: 74%;
  --_ch-seq-neutral-4: 100%;
  --_ch-seq-neutral-5: 82%;
```

and at the end of **both** dark blocks (the `@media (prefers-color-scheme: dark)` one, indented by four spaces, and `[data-ch-theme="dark"]`, after `--ch-hatch-tint: 0.2;`):

```css
  /* Sequential ramp (private): ink on the darkest level, the light outline width, the
     soft accent's ramp depth and each tone's level 2–5 shares. Level 1 is 12% everywhere. */
  --_ch-seq-ink-strong: var(--ch-surface);
  --_ch-seq-outline: 0px;
  --_ch-seq-accent-soft-depth: 100%;
  --_ch-seq-accent-2: 35%;
  --_ch-seq-accent-3: 55%;
  --_ch-seq-accent-4: 76%;
  --_ch-seq-accent-5: 100%;
  --_ch-seq-accent-soft-2: 36%;
  --_ch-seq-accent-soft-3: 57%;
  --_ch-seq-accent-soft-4: 77%;
  --_ch-seq-accent-soft-5: 100%;
  --_ch-seq-loss-2: 34%;
  --_ch-seq-loss-3: 53%;
  --_ch-seq-loss-4: 72%;
  --_ch-seq-loss-5: 100%;
  --_ch-seq-warn-2: 26%;
  --_ch-seq-warn-3: 39%;
  --_ch-seq-warn-4: 52%;
  --_ch-seq-warn-5: 100%;
  --_ch-seq-gain-2: 28%;
  --_ch-seq-gain-3: 42%;
  --_ch-seq-gain-4: 56%;
  --_ch-seq-gain-5: 100%;
  --_ch-seq-neutral-2: 36%;
  --_ch-seq-neutral-3: 57%;
  --_ch-seq-neutral-4: 77%;
  --_ch-seq-neutral-5: 100%;
```

(The two dark blocks must stay identical: `'declares the same dark tokens for the system preference and the forced theme'` compares them.)

- [ ] **Step 4: The levels and the tone rules**

Replace the whole `/* ---------- Sequential levels ---------- */` section (the `[data-ch-root], [data-ch-part="legend"], [data-ch-part="heatmap"]` rule and the four `[data-ch-seq-tone=…]` rules, up to `/* ---------- Chart root ---------- */`) with:

```css
/* ---------- Sequential levels ---------- */
/* Resolved on each element from an inherited --ch-seq-base (default: loss) and --ch-seq-mix-N
   (default: loss's shares for the theme), so a base set on any ancestor, or Heatmap's `tone`,
   recolors charts, heatmaps and legends alike. Levels 1–4 mix the base into --ch-surface and
   carry --ch-ink text; level 5 mixes it with black, for white text in the light theme, and is
   the pure base, for dark text, in the dark theme. theme.test.ts checks every tone × theme ×
   level: text at 4.5:1, neighbouring levels at 1.3:1 and level 5 at 3:1 against the surface. */
[data-ch-root],
[data-ch-part="legend"],
[data-ch-part="heatmap"] {
  --ch-seq-1: color-mix(
    in srgb,
    var(--ch-seq-base, var(--ch-loss)) var(--ch-seq-mix-1, 12%),
    var(--ch-surface)
  );
  --ch-seq-2: color-mix(
    in srgb,
    var(--ch-seq-base, var(--ch-loss)) var(--ch-seq-mix-2, var(--_ch-seq-loss-2)),
    var(--ch-surface)
  );
  --ch-seq-3: color-mix(
    in srgb,
    var(--ch-seq-base, var(--ch-loss)) var(--ch-seq-mix-3, var(--_ch-seq-loss-3)),
    var(--ch-surface)
  );
  --ch-seq-4: color-mix(
    in srgb,
    var(--ch-seq-base, var(--ch-loss)) var(--ch-seq-mix-4, var(--_ch-seq-loss-4)),
    var(--ch-surface)
  );
  --ch-seq-5: color-mix(
    in srgb,
    var(--ch-seq-base, var(--ch-loss)) var(--ch-seq-mix-5, var(--_ch-seq-loss-5)),
    #000
  );
}

/* data-ch-seq-tone (set by Heatmap's `tone`, or by you on any ancestor of a Legend) picks a tone's
   base and its shares for the theme. The soft accent is too light for five steps, so its ramp
   starts from a darker shade of it in the light theme. */
[data-ch-seq-tone="accent"] {
  --ch-seq-base: var(--ch-accent);
  --ch-seq-mix-2: var(--_ch-seq-accent-2);
  --ch-seq-mix-3: var(--_ch-seq-accent-3);
  --ch-seq-mix-4: var(--_ch-seq-accent-4);
  --ch-seq-mix-5: var(--_ch-seq-accent-5);
}

[data-ch-seq-tone="accent-soft"] {
  --ch-seq-base: color-mix(in srgb, var(--ch-accent-soft) var(--_ch-seq-accent-soft-depth), #000);
  --ch-seq-mix-2: var(--_ch-seq-accent-soft-2);
  --ch-seq-mix-3: var(--_ch-seq-accent-soft-3);
  --ch-seq-mix-4: var(--_ch-seq-accent-soft-4);
  --ch-seq-mix-5: var(--_ch-seq-accent-soft-5);
}

[data-ch-seq-tone="loss"] {
  --ch-seq-base: var(--ch-loss);
  --ch-seq-mix-2: var(--_ch-seq-loss-2);
  --ch-seq-mix-3: var(--_ch-seq-loss-3);
  --ch-seq-mix-4: var(--_ch-seq-loss-4);
  --ch-seq-mix-5: var(--_ch-seq-loss-5);
}

[data-ch-seq-tone="warn"] {
  --ch-seq-base: var(--ch-warn);
  --ch-seq-mix-2: var(--_ch-seq-warn-2);
  --ch-seq-mix-3: var(--_ch-seq-warn-3);
  --ch-seq-mix-4: var(--_ch-seq-warn-4);
  --ch-seq-mix-5: var(--_ch-seq-warn-5);
}

[data-ch-seq-tone="gain"] {
  --ch-seq-base: var(--ch-gain);
  --ch-seq-mix-2: var(--_ch-seq-gain-2);
  --ch-seq-mix-3: var(--_ch-seq-gain-3);
  --ch-seq-mix-4: var(--_ch-seq-gain-4);
  --ch-seq-mix-5: var(--_ch-seq-gain-5);
}

[data-ch-seq-tone="neutral"] {
  --ch-seq-base: var(--ch-neutral);
  --ch-seq-mix-2: var(--_ch-seq-neutral-2);
  --ch-seq-mix-3: var(--_ch-seq-neutral-3);
  --ch-seq-mix-4: var(--_ch-seq-neutral-4);
  --ch-seq-mix-5: var(--_ch-seq-neutral-5);
}
```

A `var()` inside a custom property resolves where it is declared, so each tone rule picks up the theme of the element it sits on, and themes nest as before.

Then, after the `[data-ch-part="heatmap-cell"][data-ch-level="5"]` rule (and before the `[data-ch-active]` rule, so the active shadow still wins), add:

```css
/* The two lightest levels are close to the light surface: a 1px outline keeps them shapes. The
   width is 0 in the dark themes. */
[data-ch-part="heatmap-cell"]:is([data-ch-level="1"], [data-ch-level="2"]),
[data-ch-part="legend-swatch"]:is([data-ch-level="1"], [data-ch-level="2"]) {
  box-shadow: inset 0 0 0 var(--_ch-seq-outline)
    color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 45%, var(--ch-surface));
}
```

- [ ] **Step 5: Let the tone rule set the base**

In `packages/tally-charts/src/react/charts/Heatmap.tsx`, replace

```tsx
  // Only an explicit tone overrides a --ch-seq-base set on an ancestor; data-ch-seq-tone picks
  // that tone's level mixes in theme.css, and the legend inside inherits them.
  const rootStyle = (tone ? { '--ch-seq-base': `var(--ch-${tone})`, ...style } : style) as
    | CSSProperties
    | undefined
  const rootProps = {
    className: cx('ch-heatmap', className),
    'data-ch-part': 'heatmap',
    'data-ch-seq-tone': tone,
    style: rootStyle,
  }
```

with

```tsx
  // Only an explicit tone overrides a --ch-seq-base set on an ancestor: data-ch-seq-tone picks
  // that tone's base and level shares in theme.css, and the legend inside inherits them.
  const rootProps = {
    className: cx('ch-heatmap', className),
    'data-ch-part': 'heatmap',
    'data-ch-seq-tone': tone,
    style,
  }
```

(The inline base would beat the accent-soft rule's darker base.)

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS (899 tests).

- [ ] **Step 7: A story and a browser check of every ramp**

Create `apps/storybook/stories/Sequential.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heatmap, TONES } from 'tally-charts'

// Every tone's sequential ramp as a one-row heatmap with its legend: five cells, one per level,
// so the contrast rules of spec §6 can be checked in the browser in both themes.
const cells = TONES.flatMap((tone) =>
  [1, 2, 3, 4, 5].map((level) => ({ tone, level: `Level ${level}`, value: level })),
)

function Sequential() {
  return (
    <article className="card" style={{ display: 'grid', gap: 24 }}>
      {TONES.map((tone) => (
        <Heatmap
          key={tone}
          title={`Sequential ramp, ${tone}`}
          data={cells.filter((c) => c.tone === tone)}
          row="tone"
          column="level"
          value="value"
          breaks={[1.5, 2.5, 3.5, 4.5]}
          binLabels={['1', '2', '3', '4', '5']}
          tone={tone}
          totals={false}
        />
      ))}
    </article>
  )
}

const meta = {
  title: 'Primitives/Sequential',
  component: Sequential,
} satisfies Meta<typeof Sequential>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

In `apps/storybook/e2e/stories.spec.ts`, append `'primitives-sequential--light',` and `'primitives-sequential--dark',` to `STORIES` (after the time-axis ids), and append at the end of the file:

```ts
/** sRGB channels 0–255 from a computed color: `rgb(…)`, `color(srgb …)` or `#rrggbb`. */
function channels(color: string): number[] {
  if (color.startsWith('#')) return [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16))
  const values = color.match(/[\d.]+/g)?.map(Number) ?? []
  return color.startsWith('color(') ? values.slice(0, 3).map((v) => v * 255) : values.slice(0, 3)
}

function contrastOf(a: string, b: string): number {
  const lum = (c: string) => {
    const [r = 0, g = 0, bl = 0] = channels(c).map((v) => {
      const s = v / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

for (const theme of ['light', 'dark']) {
  test(`every sequential ramp keeps its contrast in the browser (${theme})`, async ({ page }) => {
    // The system prefers the other scheme: the story's own data-ch-theme must still win.
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' })
    await open(page, `primitives-sequential--${theme}`)
    const ramps = await page.evaluate(() =>
      [...document.querySelectorAll('[data-ch-part="heatmap"]')].map((heatmap) => ({
        surface: getComputedStyle(heatmap).getPropertyValue('--ch-surface').trim(),
        cells: [...heatmap.querySelectorAll('[data-ch-part="heatmap-cell"]')].map((cell) => ({
          bg: getComputedStyle(cell).backgroundColor,
          fg: getComputedStyle(cell).color,
        })),
        swatches: [...heatmap.querySelectorAll('[data-ch-part="legend-swatch"]')].map(
          (swatch) => getComputedStyle(swatch).backgroundColor,
        ),
      })),
    )
    expect(ramps).toHaveLength(6)
    // White text on the light theme's top level, dark text on the dark theme's.
    const topText = ramps[0]?.cells[4]?.fg ?? ''
    expect(channels(topText)[0]).toBe(theme === 'light' ? 255 : 18)
    for (const { surface, cells, swatches } of ramps) {
      expect(cells).toHaveLength(5)
      expect(swatches).toEqual(cells.map((cell) => cell.bg))
      for (const cell of cells) expect(contrastOf(cell.fg, cell.bg)).toBeGreaterThanOrEqual(4.5)
      for (let i = 1; i < 5; i++) {
        expect(contrastOf(cells[i - 1]?.bg ?? '', cells[i]?.bg ?? '')).toBeGreaterThanOrEqual(1.3)
      }
      expect(contrastOf(cells[4]?.bg ?? '', surface)).toBeGreaterThanOrEqual(3)
    }
  })
}
```

(Chromium reports a `color-mix()` background as `color(srgb r g b)` with 0–1 channels; `channels` reads both forms.) Each story runs under the opposite system scheme, so the check also proves that a story's own `data-ch-theme` wins over `prefers-color-scheme` for the ramp tokens (Review Focus 1). The two new stories get baselines in Task 16 with the rest.

- [ ] **Step 8: Gates and e2e**

Run: `pnpm --filter storybook-app typecheck && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (57 e2e tests, both ramp checks included); no API report change.

Look at `primitives-sequential--light` / `--dark` and `reference-where-it-leaks--light` (your own Storybook, never port 6006): five clearly distinct steps per tone in both themes; light levels 1–2 have a thin outline; the dark top level is the bright base with dark text; "$14.8K" is hot pink with white text.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook
git commit -m "feat: a sequential ramp per tone and theme that keeps text, step and top-level contrast (A11Y-9)

Co-Authored-By: <your own model trailer>"
```

---

### Task 8: Heatmap semantics and navigation, the top-cell glow, and the full axe gate (A11Y-7, A11Y-15, A11Y-18)

**Files:**
- Modify: `packages/tally-charts/src/react/charts/Heatmap.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`, `packages/tally-charts/src/theme/surface.test.ts`
- Modify: `packages/tally-charts/api/tally-charts.api.md` (regenerated)
- Modify: `apps/storybook/stories/DrillColumns.stories.tsx` (a dark twin)
- Modify: `apps/storybook/e2e/stories.spec.ts` (axe tags, themes)
- Test: `src/react/charts/Heatmap.test.tsx`, `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `headerOf(accessor, fallback)` (Task 2, `charts/shared.ts`).
- Produces:
  - `HeatmapProps.rowLabel?: string` (additive). The corner `columnheader` holds `<span class="ch-sr-only">{rowLabel ?? headerOf(row, 'Row')}</span>`.
  - Column headers hold only the column name (no inner span). The old `heatmap-header-total` part is gone (spec §5).
  - With `totals`, a `role="row"` with `data-ch-part="heatmap-total-row"` follows the header row. It starts with a `rowheader` (`data-ch-part="heatmap-rowheader"`) whose text is `totalLabel` (visually hidden), then one `heatmap-total` gridcell per column total and a last one with the grand total under the "Total" column header.
  - Every total cell is a navigable `gridcell` (roving `tabIndex`); focusing one clears the active cell; Enter/Space on it select nothing. Ctrl+Home/Ctrl+End (or Cmd) go to the first/last cell of the grid; PageUp/PageDown move 5 rows.
  - `data-ch-peak="true"` (new public state attribute) on the top-value cell (first one on a tie); theme.css gives it a glow in the base color, off under `prefers-reduced-transparency: reduce` (forced colors in Task 9).
  - e2e: axe runs with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`; stories without their own theme run in both themes; the new story id `reference-drill-columns--dark`.

The corner is labelled with `headerOf`, so a string `row` field reads in sentence case ("branch" → "Branch"), as data-table headers do (Task 2); spec §5 says "the row accessor key".

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/Heatmap.test.tsx`:

1. Replace the first test (`'lays out a grid with headers, totals and one tab stop'`) down to the line `const dallas = within(grid).getAllByRole('row')[1] as HTMLElement` with:

```tsx
  it('lays out a grid with headers, a totals row, totals and one tab stop', () => {
    const { container } = renderHeatmap()
    const grid = screen.getByRole('grid', { name: 'Where it leaks' })
    // Column headers hold only the names; the corner names the row header column.
    expect(texts(within(grid).getAllByRole('columnheader'))).toEqual([
      'Branch',
      'Labor',
      'Materials',
      'Callbacks',
      'Total',
    ])
    expect(texts(within(grid).getAllByRole('rowheader'))).toEqual(['Total', 'Dallas', 'Austin'])
    const [, totalsRow, dallas] = within(grid).getAllByRole('row') as HTMLElement[]
    expect(totalsRow).toHaveAttribute('data-ch-part', 'heatmap-total-row')
    expect(texts(within(totalsRow as HTMLElement).getAllByRole('gridcell'))).toEqual([
      '$24K',
      '$13K',
      '$5K',
      '$42K',
    ])
```

   and change the next line's `within(dallas)` to `within(dallas as HTMLElement)`.

2. In `'shows a dash for a missing cell'`, replace the last three lines with:

```tsx
    const [, totalsRow, , austin] = screen.getAllByRole('row') as HTMLElement[]
    expect(within(austin as HTMLElement).getAllByRole('gridcell').at(-1)).toHaveTextContent(
      '$14.3K',
    )
    expect(within(totalsRow as HTMLElement).getAllByRole('gridcell')[2]).toHaveTextContent(
      '$3.1K',
    )
```

3. In `'moves between cells with the arrow keys and selects with Enter'`, replace

```tsx
    fireEvent.keyDown(all[3] as HTMLElement, { key: 'End' })
    expect(document.activeElement).toBe(all[5])
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'Enter' })
```

with

```tsx
    // End reaches the row total; it takes focus but selects nothing.
    fireEvent.keyDown(all[3] as HTMLElement, { key: 'End' })
    expect(document.activeElement).toHaveTextContent('$16.2K')
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(all[5])
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'Enter' })
```

4. In `'orders rows and columns as given and fills the gaps'`: the row headers become `['Total', 'Austin', 'Dallas', 'Houston']`, the column headers `['Branch', 'Callbacks', 'Labor', 'Total']`, and Houston is `getAllByRole('row')[4]`.

5. In `'turns the totals and the legend off'`: the first column header is `'Branch'`, and add after that assertion:

```tsx
    expect(container.querySelector('[data-ch-part="heatmap-total-row"]')).toBeNull()
    expect(container.querySelector('[data-ch-part="heatmap-total"]')).toBeNull()
```

6. Add before `'bins values onto the sequential levels'`:

```tsx
  it('names the row header column with rowLabel, the row field, or "Row"', () => {
    const { rerender } = renderHeatmap()
    const corner = () => screen.getAllByRole('columnheader')[0]
    expect(corner()).toHaveTextContent('Branch')
    expect(within(corner() as HTMLElement).getByText('Branch')).toHaveClass('ch-sr-only')
    rerender(
      <Heatmap<Leak>
        data={leaks}
        row={(d) => d.branch}
        column="cause"
        value="amount"
        breaks={[4000]}
        title="Where it leaks"
      />,
    )
    expect(corner()).toHaveTextContent('Row')
    rerender(
      <Heatmap<Leak>
        data={leaks}
        row="branch"
        column="cause"
        value="amount"
        breaks={[4000]}
        rowLabel="Branch office"
        title="Where it leaks"
      />,
    )
    expect(corner()).toHaveTextContent('Branch office')
  })

  it('reaches the totals with the arrow keys and the grid corners with Ctrl+Home and Ctrl+End', () => {
    const onActiveChange = vi.fn()
    const onSelect = vi.fn()
    const { container } = renderHeatmap({ onActiveChange, onSelect })
    const first = cells(container)[0] as HTMLElement
    act(() => first.focus())
    expect(onActiveChange).toHaveBeenLastCalledWith('Dallas:Labor', expect.anything())
    // Up from the first cell is the Labor column total; focusing a total clears the active cell.
    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(document.activeElement).toHaveTextContent('$24K')
    expect(document.activeElement).toHaveAttribute('data-ch-part', 'heatmap-total')
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' })).toBe(true)
    expect(onSelect).not.toHaveBeenCalled()
    // The last cell of the grid is the last row's total; the first is the first column total.
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End', ctrlKey: true })
    expect(document.activeElement).toHaveTextContent('$16.2K')
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home', metaKey: true })
    expect(document.activeElement).toHaveTextContent('$24K')
    // The grand total sits under the "Total" header.
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End' })
    expect(document.activeElement).toHaveTextContent('$42K')
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('keeps the keys inside the data cells when totals are off', () => {
    const { container } = renderHeatmap({ totals: false })
    const all = cells(container)
    act(() => all[0]?.focus())
    expect(fireEvent.keyDown(all[0] as HTMLElement, { key: 'ArrowUp' })).toBe(false)
    expect(document.activeElement).toBe(all[0])
    fireEvent.keyDown(all[0] as HTMLElement, { key: 'End', ctrlKey: true })
    expect(document.activeElement).toBe(all[5])
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(all[5])
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'PageUp' })
    expect(document.activeElement).toBe(all[2])
  })

  it('moves five rows with PageUp and PageDown, clamped to the grid', () => {
    const many = Array.from({ length: 8 }, (_, r) => ({
      branch: `B${r}`,
      cause: 'Labor',
      amount: 1000 * (r + 1),
    }))
    const { container } = renderHeatmap({ data: many })
    const all = cells(container)
    act(() => all[0]?.focus())
    fireEvent.keyDown(all[0] as HTMLElement, { key: 'PageDown' })
    expect(document.activeElement).toBe(all[5])
    expect(fireEvent.keyDown(all[5] as HTMLElement, { key: 'PageDown' })).toBe(false)
    expect(document.activeElement).toBe(all[7])
    fireEvent.keyDown(all[7] as HTMLElement, { key: 'PageUp' })
    expect(document.activeElement).toBe(all[2])
    // Past the first data row is the totals row.
    fireEvent.keyDown(all[2] as HTMLElement, { key: 'PageUp' })
    expect(document.activeElement).toHaveAttribute('data-ch-part', 'heatmap-total')
  })

  it('marks the top-value cell for its glow', () => {
    const { container } = renderHeatmap()
    const peaks = container.querySelectorAll('[data-ch-peak="true"]')
    expect(peaks).toHaveLength(1)
    expect(peaks[0]).toHaveTextContent('$14.8K')
  })
```

In `packages/tally-charts/src/theme/theme.test.ts`, before `'paints toned text through one shared rule that mixes the tone with ink'`, add:

```ts
  it('lets the top heatmap cell glow in the base color, except under reduced transparency', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\]\[data-ch-peak="true"\] \{\s*box-shadow: [^;]*color-mix\(in srgb, var\(--ch-seq-base, var\(--ch-loss\)\)/,
    )
    expect(css).toMatch(
      /@media \(prefers-reduced-transparency: reduce\) \{\s*\[data-ch-part="heatmap-cell"\]\[data-ch-peak="true"\] \{\s*box-shadow: none;/,
    )
  })
```

In `packages/tally-charts/src/theme/surface.test.ts`: remove `'heatmap-header-total',` from `PARTS`, add `'heatmap-total-row',` after `'heatmap-total-header',`, and add `'peak',` to `STATES` after `'muted',`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/Heatmap.test.tsx src/theme`
Expected: FAIL: the corner is empty, headers include totals, totals aren't focusable, no `data-ch-peak`, no glow rule.

- [ ] **Step 3: Props, keys and the navigation model**

In `packages/tally-charts/src/react/charts/Heatmap.tsx`:

1. Add `import { headerOf } from './shared'` after the `../ui/util` import.
2. Replace the `totalLabel` prop doc and add `rowLabel` after it:

```ts
  /** Header of the row total column and of the column totals row. Default "Total". */
  totalLabel?: string
  /**
   * Accessible name of the row header column (the empty corner above it). Default: the `row`
   * field name in sentence case ("branch" reads "Branch"), or "Row" for a function.
   */
  rowLabel?: string
```

   and destructure `rowLabel,` after `totalLabel = 'Total',`.
3. Replace the `MOVES` constant with:

```ts
const MOVES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])
/** Rows PageUp and PageDown move. */
const PAGE = 5
/** Keys of the total cells; the NUL character can't collide with a row or column name. */
const TOTAL = '\u0000total'
```

4. Replace everything from `const [focusId, setFocusId] = useState<string | null>(null)` through the end of the old `onKeyDown` function, and the old `valueText` definition, with:

```tsx
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLElement>())

  // Keyboard positions: the column totals row first (when shown), then the data rows; the data
  // columns, then the row total column. Data cells are keyed by id, totals by TOTAL keys.
  const top = totals ? 1 : 0
  const lastRow = model.rows.length - 1 + top
  const lastColumn = model.columns.length - 1 + (totals ? 1 : 0)
  const keyAt = (g: number, c: number): string => {
    if (g < top) return `${TOTAL}\u0000${model.columns[c] ?? ''}`
    return model.cells[g - top]?.[c]?.id ?? `${model.rows[g - top]}${TOTAL}`
  }
  const keys = new Set<string>()
  for (let g = 0; g <= lastRow; g++) for (let c = 0; c <= lastColumn; c++) keys.add(keyAt(g, c))
  const tabKey = focusKey !== null && keys.has(focusKey) ? focusKey : keyAt(top, 0)

  const setActive = (next: string | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    if (controlled) {
      // The parent decides. Drop the optimistic value once the event is over, so a parent that
      // ignores the change doesn't leave the ref stale.
      queueMicrotask(() => {
        activeRef.current = activeProp.current ?? null
      })
    } else {
      setInnerActive(next)
    }
    onActiveChange?.(next, next === null ? null : (byId.get(next) ?? null))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, g: number, c: number) => {
    const cell = g < top ? undefined : model.cells[g - top]?.[c]
    if ((event.key === 'Enter' || event.key === ' ') && cell) {
      event.preventDefault()
      onSelect?.(cell.id, cell)
      return
    }
    if (event.key === 'Escape') {
      // Only handled when it clears something, so an enclosing dialog can still close.
      if (activeRef.current !== null) {
        event.preventDefault()
        setActive(null)
      }
      return
    }
    if (!MOVES.has(event.key)) return
    event.preventDefault()
    // Ctrl+Home and Ctrl+End (Cmd on a Mac keyboard) go to the first and last cell of the grid.
    const corner = event.ctrlKey || event.metaKey
    let [ng, nc] = [g, c]
    if (event.key === 'ArrowUp') ng = Math.max(0, g - 1)
    else if (event.key === 'ArrowDown') ng = Math.min(lastRow, g + 1)
    else if (event.key === 'ArrowLeft') nc = Math.max(0, c - 1)
    else if (event.key === 'ArrowRight') nc = Math.min(lastColumn, c + 1)
    else if (event.key === 'PageUp') ng = Math.max(0, g - PAGE)
    else if (event.key === 'PageDown') ng = Math.min(lastRow, g + PAGE)
    else if (event.key === 'Home') [ng, nc] = corner ? [0, 0] : [g, 0]
    else [ng, nc] = corner ? [lastRow, lastColumn] : [g, lastColumn]
    const key = keyAt(ng, nc)
    setFocusKey(key)
    refs.current.get(key)?.focus()
  }

  const valueText = (v: number | undefined): ReactNode =>
    v !== undefined && Number.isFinite(v) ? fmt(v) : <NoData />
  /** Roving focus for the cell at a keyboard position: its ref and whether it is the tab stop. */
  const navigable = (g: number, c: number) => {
    const key = keyAt(g, c)
    return {
      ref: (el: HTMLElement | null) => {
        if (el) refs.current.set(key, el)
        else refs.current.delete(key)
      },
      tabIndex: key === tabKey ? 0 : -1,
    }
  }
  /** A total cell takes focus but has nothing to activate or select. */
  const total = (g: number, c: number, value: number | undefined, key: string) => (
    <div
      key={key}
      {...navigable(g, c)}
      role="gridcell"
      className="ch-heatmap-total"
      data-ch-part="heatmap-total"
      onKeyDown={(event) => onKeyDown(event, g, c)}
      onFocus={() => {
        setFocusKey(keyAt(g, c))
        setActive(null)
      }}
    >
      {valueText(value)}
    </div>
  )
  // The top-value cell glows (theme.css); the first one wins a tie.
  let peakId: string | null = null
  let peak = Number.NEGATIVE_INFINITY
  for (const cell of model.cells.flat()) {
    if (cell.value > peak) {
      peak = cell.value
      peakId = cell.id
    }
  }
```

`role` and `onKeyDown` stay on the elements themselves (not in `navigable`): Biome's a11y rules can't see props in a spread.

- [ ] **Step 4: The new grid markup**

In the returned grid, replace the `onPointerLeave` handler's `focusId` with `focusKey` (`setActive(focused && focusKey !== null && byId.has(focusKey) ? focusKey : null)`), and replace everything from the header row `<div role="row" …>` to the closing `</div>` of the grid with:

```tsx
        <div role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
          <div role="columnheader" className="ch-heatmap-corner" data-ch-part="heatmap-corner">
            <span className="ch-sr-only">{rowLabel ?? headerOf(row, 'Row')}</span>
          </div>
          {model.columns.map((name) => (
            <div
              key={name}
              role="columnheader"
              className="ch-heatmap-header"
              data-ch-part="heatmap-header"
            >
              {name}
            </div>
          ))}
          {totals ? (
            <div
              role="columnheader"
              className="ch-heatmap-header ch-heatmap-total-header"
              data-ch-part="heatmap-total-header"
            >
              {totalLabel}
            </div>
          ) : null}
        </div>
        {totals ? (
          // Column totals: their own row, named by its row header, so no column header carries a
          // number. It stays on top, under the column names.
          <div role="row" className="ch-heatmap-row" data-ch-part="heatmap-total-row">
            <div role="rowheader" className="ch-heatmap-rowheader" data-ch-part="heatmap-rowheader">
              <span className="ch-sr-only">{totalLabel}</span>
            </div>
            {model.columns.map((name, j) => total(0, j, model.columnTotals[j], name))}
            {total(0, model.columns.length, sum(model.rowTotals), TOTAL)}
          </div>
        ) : null}
        {model.cells.map((rowCells, r) => (
          <div key={model.rows[r]} role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
            <div role="rowheader" className="ch-heatmap-rowheader" data-ch-part="heatmap-rowheader">
              {model.rows[r]}
            </div>
            {rowCells.map((cell, c) => (
              <div
                key={cell.id}
                {...navigable(r + top, c)}
                role="gridcell"
                className="ch-heatmap-cell"
                data-ch-part="heatmap-cell"
                data-ch-level={cell.level}
                data-ch-active={cell.id === active ? 'true' : undefined}
                data-ch-peak={cell.id === peakId ? 'true' : undefined}
                data-ch-selectable={onSelect ? 'true' : undefined}
                onFocus={() => {
                  setFocusKey(cell.id)
                  setActive(cell.id)
                }}
                onPointerEnter={() => setActive(cell.id)}
                onClick={() => onSelect?.(cell.id, cell)}
                onKeyDown={(event) => onKeyDown(event, r + top, c)}
              >
                {valueText(cell.value)}
              </div>
            ))}
            {totals ? total(r + top, rowCells.length, model.rowTotals[r], TOTAL) : null}
          </div>
        ))}
      </div>
```

- [ ] **Step 5: Styles**

In `packages/tally-charts/src/theme/theme.css`:

1. The subgrid rule covers the totals row: change its selector to `[data-ch-part="heatmap-row"],\n[data-ch-part="heatmap-total-row"]`.
2. Delete the `[data-ch-part="heatmap-header-total"]` rule.
3. Replace the `[data-ch-part="heatmap-total"]` rule with:

```css
[data-ch-part="heatmap-total"] {
  padding-left: 24px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  text-align: right;
  outline: none;
}

/* Column totals sit under the column names, aligned with them; the grand total stays in the
   total column. */
[data-ch-part="heatmap-total-row"] [data-ch-part="heatmap-total"]:not(:last-child) {
  padding-left: 0;
  text-align: left;
}

[data-ch-part="heatmap-total"]:focus-visible {
  outline: 2px solid var(--ch-accent);
  outline-offset: 2px;
}
```

4. Before the `[data-ch-part="heatmap-cell"][data-ch-active="true"]` rule, add:

```css
/* The top-value cell glows in the base color, unless the user asks for less transparency. */
[data-ch-part="heatmap-cell"][data-ch-peak="true"] {
  box-shadow: 0 6px 18px -6px
    color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 70%, transparent);
}

@media (prefers-reduced-transparency: reduce) {
  [data-ch-part="heatmap-cell"][data-ch-peak="true"] {
    box-shadow: none;
  }
}
```

- [ ] **Step 6: Run the tests and update the API report**

Run: `pnpm test`
Expected: PASS (905 tests).

Run: `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update && git diff packages/tally-charts/api`
Expected: only `rowLabel?: string;` added to `HeatmapProps`.

- [ ] **Step 7: The full axe gate, in both themes**

In `apps/storybook/stories/DrillColumns.stories.tsx`, add after the `Light` export:

```tsx
export const Dark: Story = { parameters: { theme: 'dark' } }
```

In `apps/storybook/e2e/stories.spec.ts`:

1. Add `'reference-drill-columns--dark',` to `STORIES` after `'reference-drill-columns--light',`, and `'reference-drill-columns--dark': { width: 1280, height: 600 },` to `WIDE_STORIES`.
2. Replace `open` with:

```ts
// Stories without a theme of their own follow the toolbar global: axe checks them in both themes.
const THEMELESS = new Set([
  'primitives-legend--default',
  'charts-barchart--horizontal',
  'primitives-small-pieces--default',
  'reference-last-12-weeks--selectable',
])

async function open(page: Page, id: string, theme?: 'light' | 'dark') {
  const globals = theme ? `&globals=theme:${theme}` : ''
  await page.goto(`/iframe.html?id=${id}&viewMode=story${globals}`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]')
    .first()
    .waitFor()
}
```

3. Take the axe test out of the screenshot loop and replace it with:

```ts
for (const id of [...STORIES, 'reference-last-12-weeks--selectable']) {
  for (const theme of THEMELESS.has(id) ? (['light', 'dark'] as const) : [undefined]) {
    test(`${id}${theme ? ` (${theme})` : ''} has no axe violations`, async ({ page }) => {
      await open(page, id, theme)
      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
}
```

   (The screenshot loop keeps only `matches its screenshot`.)

- [ ] **Step 8: Gates and e2e**

Run: `pnpm --filter storybook-app typecheck && pnpm typecheck && pnpm lint && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (63 e2e tests); zero axe violations with `wcag22aa` and `best-practice` (before this task the heatmap corner failed `empty-table-header`); Heatmap about 3.78 kB.

Look at `reference-where-it-leaks--light` (your own Storybook): the column names, then a row of column totals with the grand total "$82.4K" under "Total"; "$14.8K" has a soft pink glow.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook
git commit -m "feat: heatmap headers hold names only, a totals row, rowLabel, grid navigation to totals and a glowing top cell (A11Y-7, A11Y-15)

Co-Authored-By: <your own model trailer>"
```

---

### Task 9: Forced colors (A11Y-4, A11Y-5, A11Y-6)

**Files:**
- Modify: `packages/tally-charts/src/theme/theme.css`
- Create: `apps/storybook/e2e/forced-colors.spec.ts`
- Test: `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: the parts `legend-swatch`, `meter-fill`, `inline-bar-fill`, `range-dot`, `range-gap`, `dot-count-dot`, `meter-track`, `inline-bar`, `tooltip-pill`, `delta`, `heatmap-cell`; `data-ch-level`, `data-ch-active`, `data-ch-peak` (Task 8).
- Produces: a `@media (forced-colors: active)` block at the end of theme.css. It maps the color tokens onto system colors (marks `CanvasText`, accent `Highlight`, soft and neutral `GrayText`, surfaces `Canvas`), paints SVG text `CanvasText` (muted labels `GrayText`), opts the HTML marks out of forcing (`forced-color-adjust: none`), draws a `CanvasText` border on tracks and pills, codes heatmap levels (and level swatches) by border width 1–5px (level 0 dashed), and turns off the top-cell glow. Outside the block, a focused heatmap cell carries `outline: 2px solid transparent`, which forced colors paint. No API change.

Chromium leaves SVG `fill`/`stroke` alone in forced colors (audit A11Y-6), so mapping the tokens is what carries the system palette into the SVG. Overriding the tokens inside the block needs a selector at least as specific as `:root:not([data-ch-theme="light"])` (the system-dark block), and the block comes last. The resting cell keeps `outline: none`: a transparent outline at rest is painted too, around every cell.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/theme/theme.test.ts`, before `describe('theme.css', …)`, add:

```ts
/** The forced-colors block, and the stylesheet before it (the themes). */
const FORCED_AT = css.indexOf('@media (forced-colors: active)')
const themed = css.slice(0, FORCED_AT)
const forced = css.slice(FORCED_AT)
```

In the two token-count tests (`'defines --ch-%s for light, system dark and forced dark'` and `'defines %s in all three theme blocks'`), count in `themed` instead of `css` (the forced block declares the tokens a fourth time). After the second one, add:

```ts
  it('maps the color tokens onto system colors in forced-colors mode', () => {
    expect(FORCED_AT).toBeGreaterThan(0)
    const tokens = new Map(
      [...forced.matchAll(/(--ch-[\w-]+):\s*([A-Za-z]+);/g)].map((m) => [m[1], m[2]]),
    )
    expect(Object.fromEntries(tokens)).toEqual({
      '--ch-accent': 'Highlight',
      '--ch-accent-soft': 'GrayText',
      '--ch-loss': 'CanvasText',
      '--ch-warn': 'CanvasText',
      '--ch-gain': 'CanvasText',
      '--ch-neutral': 'GrayText',
      '--ch-ink': 'CanvasText',
      '--ch-ink-muted': 'GrayText',
      '--ch-grid': 'GrayText',
      '--ch-surface': 'Canvas',
      '--ch-tooltip-bg': 'Canvas',
      '--ch-tooltip-ink': 'CanvasText',
    })
    // Later than, and at least as specific as, every theme block it overrides.
    expect(forced).toMatch(
      /:root,\s*:root:not\(\[data-ch-theme="light"\]\),\s*\[data-ch-theme\] \{/,
    )
  })

  it('keeps HTML marks visible and levels distinct in forced-colors mode', () => {
    for (const part of [
      'legend-swatch',
      'meter-fill',
      'inline-bar-fill',
      'range-dot',
      'range-gap',
      'dot-count-dot',
    ]) {
      expect(forced).toMatch(
        new RegExp(`\\[data-ch-part="${part}"\\][^{]*\\{[^}]*forced-color-adjust: none`),
      )
    }
    for (const level of [2, 3, 4, 5]) {
      expect(forced).toContain(`)[data-ch-level="${level}"] {\n    border-width: ${level}px;`)
    }
    expect(forced).toMatch(/\.ch-svg text \{\s*fill: CanvasText;/)
    expect(forced).toMatch(
      /\[data-ch-part="heatmap-cell"\]\[data-ch-peak="true"\] \{\s*box-shadow: none;/,
    )
  })

  it('gives a focused heatmap cell a transparent outline that forced colors can paint', () => {
    expect(themed).toMatch(
      /\[data-ch-part="heatmap-cell"\]:focus-visible \{\s*outline: 2px solid transparent;\s*outline-offset: 2px;/,
    )
    // Not at rest: forced colors would paint a resting outline around every cell.
    expect(themed).toMatch(/\[data-ch-part="heatmap-cell"\] \{[^}]*outline: none;/)
  })
```

Create `apps/storybook/e2e/forced-colors.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test'

// Windows high contrast, emulated in Chromium (spec §5): marks and focus indicators stay visible.
async function openForced(page: Page, id: string, colorScheme: 'light' | 'dark') {
  await page.emulateMedia({ forcedColors: 'active', colorScheme })
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]')
    .first()
    .waitFor()
}

/** A system color as the page computes it, e.g. `rgb(255, 255, 255)` for Canvas. */
function systemColor(page: Page, name: string) {
  return page.evaluate((color) => {
    const probe = document.createElement('span')
    probe.style.color = color
    document.body.append(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  }, name)
}

const MARKS = [
  ['primitives-legend--default', 'legend-swatch'],
  ['reference-gross-margin--light', 'meter-fill'],
  ['primitives-small-pieces--default', 'inline-bar-fill'],
  ['primitives-small-pieces--default', 'dot-count-dot'],
  ['reference-result--light', 'range-dot'],
] as const

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`forced colors, ${colorScheme} scheme`, () => {
    for (const [id, part] of MARKS) {
      test(`${part} in ${id} keeps a visible fill`, async ({ page }) => {
        await openForced(page, id, colorScheme)
        const canvas = await systemColor(page, 'Canvas')
        const fills = await page
          .locator(`#storybook-root [data-ch-part="${part}"]`)
          .evaluateAll((els) =>
            els.map((el) => {
              const style = getComputedStyle(el)
              return { color: style.backgroundColor, image: style.backgroundImage }
            }),
          )
        expect(fills.length).toBeGreaterThan(0)
        for (const { color, image } of fills) {
          // A hatch is a gradient image over a transparent color; a solid fill is a color.
          if (image !== 'none') continue
          expect(color).not.toBe(canvas)
          expect(color).not.toMatch(/rgba\(.*, 0\)$/)
        }
      })
    }

    test('heatmap levels differ by border width and keep a focus ring', async ({ page }) => {
      await openForced(page, 'reference-where-it-leaks--light', colorScheme)
      const borders = await page
        .locator('#storybook-root [data-ch-part="heatmap-cell"]')
        .evaluateAll((els) =>
          els.map((el) => [el.getAttribute('data-ch-level'), getComputedStyle(el).borderTopWidth]),
        )
      for (const [level, width] of borders) expect(width).toBe(`${Number(level) || 1}px`)
      await page.getByRole('gridcell', { name: '$14.8K' }).focus()
      const ring = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement as Element)
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor }
      })
      expect(ring.style).toBe('solid')
      expect(ring.width).toBe('2px')
      expect(ring.color).toBe(await systemColor(page, 'Highlight'))
    })

    test('chart text follows the system text color and the widget keeps its ring', async ({
      page,
    }) => {
      await openForced(page, 'reference-estimate-vs-actual--light', colorScheme)
      const text = await systemColor(page, 'CanvasText')
      const fill = await page
        .locator('#storybook-root [data-ch-part="row-label"]')
        .first()
        .evaluate((el) => getComputedStyle(el).fill)
      expect(fill).toBe(text)
      await page.keyboard.press('Tab')
      const ring = await page
        .getByRole('application')
        .evaluate((el) => getComputedStyle(el).outlineStyle)
      expect(ring).toBe('solid')
    })
  })
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/theme/theme.test.ts`
Expected: FAIL: no forced-colors block (`FORCED_AT` is -1), no transparent focus outline.

Run: `pnpm --filter storybook-app exec playwright test e2e/forced-colors.spec.ts`
Expected: FAIL in both schemes: solid swatches, inline-bar and meter fills are transparent or `Canvas`, heatmap cells have no borders, the focused cell has no outline.

- [ ] **Step 3: The focus outline that forced colors paint**

In `packages/tally-charts/src/theme/theme.css`, replace

```css
[data-ch-part="heatmap-cell"]:focus-visible {
  box-shadow:
    0 0 0 2px var(--ch-surface),
    0 0 0 4px var(--ch-accent);
}
```

with

```css
/* The ring is a shadow, which forced-colors mode removes; the transparent outline is what it
   paints in the system color instead. */
[data-ch-part="heatmap-cell"]:focus-visible {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px var(--ch-surface),
    0 0 0 4px var(--ch-accent);
}
```

(The base `[data-ch-part="heatmap-cell"]` rule keeps `outline: none`.)

- [ ] **Step 4: The forced-colors block**

Append to the end of `packages/tally-charts/src/theme/theme.css` (after the reduced-motion block):

```css
/* ---------- Forced colors (Windows high contrast) ---------- */
/* The tokens map onto the system palette, so SVG marks and text (which forced colors leave
   alone) follow the user's colors: marks in CanvasText, the accent in Highlight, soft and
   neutral in GrayText. HTML marks opt out of forcing so their fills stay visible shapes. */
@media (forced-colors: active) {
  :root,
  :root:not([data-ch-theme="light"]),
  [data-ch-theme] {
    --ch-accent: Highlight;
    --ch-accent-soft: GrayText;
    --ch-loss: CanvasText;
    --ch-warn: CanvasText;
    --ch-gain: CanvasText;
    --ch-neutral: GrayText;
    --ch-ink: CanvasText;
    --ch-ink-muted: GrayText;
    --ch-grid: GrayText;
    --ch-surface: Canvas;
    --ch-tooltip-bg: Canvas;
    --ch-tooltip-ink: CanvasText;
  }

  .ch-svg text {
    fill: CanvasText;
  }

  .ch-svg
    :is(
      [data-ch-part="axis-label"],
      [data-ch-part="target-label"],
      [data-ch-part="row-sublabel"],
      [data-ch-part="group-label"]
    ) {
    fill: GrayText;
  }

  [data-ch-part="legend-swatch"],
  [data-ch-part="meter-fill"],
  [data-ch-part="inline-bar-fill"],
  [data-ch-part="range-dot"],
  [data-ch-part="range-gap"],
  [data-ch-part="dot-count-dot"] {
    forced-color-adjust: none;
  }

  /* Tracks and pills lose their only edge, a background or a shadow: draw one. */
  [data-ch-part="meter-track"],
  [data-ch-part="inline-bar"],
  [data-ch-part="tooltip-pill"],
  [data-ch-part="delta"] {
    border: 1px solid CanvasText;
  }

  /* Heatmap levels (and their swatches) differ by border width, as fills are forced away. */
  [data-ch-part="heatmap-cell"],
  [data-ch-part="legend-swatch"][data-ch-level] {
    box-sizing: border-box;
    border: 1px solid CanvasText;
  }

  [data-ch-part="heatmap-cell"][data-ch-level="0"] {
    border-style: dashed;
  }

  :is([data-ch-part="heatmap-cell"], [data-ch-part="legend-swatch"])[data-ch-level="2"] {
    border-width: 2px;
  }

  :is([data-ch-part="heatmap-cell"], [data-ch-part="legend-swatch"])[data-ch-level="3"] {
    border-width: 3px;
  }

  :is([data-ch-part="heatmap-cell"], [data-ch-part="legend-swatch"])[data-ch-level="4"] {
    border-width: 4px;
  }

  :is([data-ch-part="heatmap-cell"], [data-ch-part="legend-swatch"])[data-ch-level="5"] {
    border-width: 5px;
  }

  [data-ch-part="heatmap-cell"][data-ch-active="true"] {
    outline: 2px dashed CanvasText;
  }

  /* After the active outline: a focused cell is active too, and shows the focus ring. */
  [data-ch-part="heatmap-cell"]:focus-visible {
    outline: 2px solid Highlight;
  }

  [data-ch-part="heatmap-cell"][data-ch-peak="true"] {
    box-shadow: none;
  }
}
```

- [ ] **Step 5: Run the tests and the gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (908 unit tests, 77 e2e tests including the 14 forced-colors ones).

Look at `reference-where-it-leaks--light` and `reference-estimate-vs-actual--light` with forced colors emulated (Chrome DevTools › Rendering › "Emulate CSS media feature forced-colors", or a Playwright context with `forcedColors: 'active'`): every swatch, bar and cell is visible, levels read by border width, and only the focused cell has a ring.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/e2e/forced-colors.spec.ts
git commit -m "feat: forced-colors support: system-color tokens, visible HTML marks, border-coded levels, painted focus rings (A11Y-4, A11Y-5, A11Y-6)

Co-Authored-By: <your own model trailer>"
```

---

### Task 10: Legend markers and band swatches; Margin outlook on a time axis (A11Y-17, spec §6, §7)

**Files:**
- Modify: `packages/tally-charts/src/react/ui/Legend.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`, `packages/tally-charts/src/theme/surface.test.ts`
- Modify: `packages/tally-charts/api/tally-charts.api.md` (regenerated)
- Modify: `apps/storybook/stories/MarginOutlook.stories.tsx`
- Test: `src/react/ui/Legend.test.tsx`, `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `LineChart` with `x={{ type: 'time', field, domain }}`, `xAxis`, `xAxisFormat` (0.6a).
- Produces:
  - `LegendItem.marker?: 'dot' | 'ring'` (additive): a filled or hollow dot on a line swatch, rendered as `data-ch-marker` (new public state attribute) and a CSS `::after`.
  - `LegendShape` gains `'band'` (additive): the soft fill of a `Band` (`color-mix(tone 18%, transparent)`), for "Likely range".
  - The Margin outlook story uses dates, `2026-04-01` … `2026-12-01`, on a time axis.

Spec §7 says the Margin outlook story reads "the week dates" from `07-forecast.png`; the reference's x axis is months, April to December, with no year. The story uses the first of each month in 2026, an explicit domain padded by about half a month on each side (so the points sit where the point scale put them), `xAxis={9}` (one tick per month; the default 5 picks quarterly ticks) and `xAxisFormat={{ month: 'short' }}` ("Apr" … "Dec", as before). Spec §5 asks for "LineChart's legend" to show the dot styles: LineChart has no built-in legend, the story composes a `Legend`, so the dot styles become a `Legend` option.

- [ ] **Step 1: Write the failing tests**

Append to `describe('<Legend>')` in `packages/tally-charts/src/react/ui/Legend.test.tsx`:

```tsx
  it('marks line swatches with the series dot, filled or hollow', () => {
    render(
      <Legend
        shape="line"
        items={[
          { label: 'Actual', tone: 'accent', marker: 'dot' },
          { label: 'Current path', tone: 'accent', dashed: true, marker: 'ring' },
          { label: 'Target', tone: 'neutral' },
        ]}
      />,
    )
    const swatches = screen.getAllByRole('listitem').map((li) => li.querySelector('.ch-swatch'))
    expect(swatches[0]).toHaveAttribute('data-ch-marker', 'dot')
    expect(swatches[1]).toHaveAttribute('data-ch-marker', 'ring')
    expect(swatches[2]).not.toHaveAttribute('data-ch-marker')
  })

  it('draws a band swatch like the Band mark', () => {
    render(<Legend items={[{ label: 'Likely range', tone: 'accent', shape: 'band' }]} />)
    expect(screen.getByRole('listitem').querySelector('.ch-swatch')).toHaveAttribute(
      'data-ch-shape',
      'band',
    )
  })
```

In `packages/tally-charts/src/theme/theme.test.ts`, before `'paints toned text through one shared rule that mixes the tone with ink'`, add:

```ts
  it('draws band swatches with the band fill and line markers like the series points', () => {
    const bandFill = 'color-mix(in srgb, var(--_ch-swatch-color) 18%, transparent)'
    expect(css).toContain(`[data-ch-part="band"] {\n  fill: ${bandFill};`)
    expect(css).toContain(
      `[data-ch-part="legend-swatch"][data-ch-shape="band"] {\n  background: ${bandFill};`,
    )
    expect(css).toMatch(
      /\[data-ch-marker="ring"\]::after \{\s*border: 2px solid var\(--_ch-swatch-color\);\s*background: var\(--ch-surface\);/,
    )
  })
```

In `packages/tally-charts/src/theme/surface.test.ts`, add `'marker',` to `STATES` after `'level',`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/Legend.test.tsx src/theme`
Expected: FAIL: no `data-ch-marker`, no band swatch rule, `marker` unused.

- [ ] **Step 3: `marker` and `'band'` in `Legend`**

In `packages/tally-charts/src/react/ui/Legend.tsx`:

1. Replace `export type LegendShape = 'bar' | 'dot' | 'line'` with:

```ts
/** 'band' is the soft fill of a `Band`, e.g. a likely range. */
export type LegendShape = 'bar' | 'dot' | 'line' | 'band'
```

2. In `LegendItem`, after `dashed?: boolean`, add:

```ts
  /**
   * A dot on a line swatch, filled ('dot') or hollow ('ring'), matching the series' points, so
   * series that share a color and a dash still differ. Only with shape 'line'.
   */
  marker?: 'dot' | 'ring'
```

3. On the swatch span, after `data-ch-dashed={…}`, add `data-ch-marker={item.marker}`.

- [ ] **Step 4: The swatch styles**

In `packages/tally-charts/src/theme/theme.css`, after the `[data-ch-part="legend-swatch"][data-ch-shape="line"][data-ch-dashed="true"]` rule, add:

```css
/* The series' point on a line swatch: filled, or hollow like a forecast's dots. */
[data-ch-part="legend-swatch"][data-ch-marker] {
  position: relative;
}

[data-ch-part="legend-swatch"][data-ch-marker]::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--_ch-swatch-color);
}

[data-ch-part="legend-swatch"][data-ch-marker="ring"]::after {
  border: 2px solid var(--_ch-swatch-color);
  background: var(--ch-surface);
}

/* The soft fill of a Band. */
[data-ch-part="legend-swatch"][data-ch-shape="band"] {
  background: color-mix(in srgb, var(--_ch-swatch-color) 18%, transparent);
}
```

(Two attribute selectors outrank the later `.ch-fillable { background: … }`.)

- [ ] **Step 5: Run the tests and update the API report**

Run: `pnpm test`
Expected: PASS (911 tests).

Run: `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update && git diff packages/tally-charts/api`
Expected: `marker?: 'dot' | 'ring';` in `LegendItem`, and `LegendShape` becomes `'bar' | 'dot' | 'line' | 'band'` (now documented). Nothing removed.

- [ ] **Step 6: Margin outlook on a time axis**

Replace `apps/storybook/stories/MarginOutlook.stories.tsx` with:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, LineChart } from 'tally-charts'

// docs/reference/07-forecast.png, card "Margin outlook", on a time axis: one point per month,
// April to December 2026 (UTC).
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
  { month: '2026-04-01', actual: 32.9, path: null, changes: null, low: null, high: null },
  { month: '2026-05-01', actual: 34.2, path: null, changes: null, low: null, high: null },
  { month: '2026-06-01', actual: 34.9, path: null, changes: null, low: null, high: null },
  { month: '2026-07-01', actual: 34.5, path: null, changes: null, low: null, high: null },
  { month: '2026-08-01', actual: 34.1, path: null, changes: null, low: null, high: null },
  { month: '2026-09-01', actual: 33.6, path: 33.6, changes: 33.6, low: 33.6, high: 33.6 },
  { month: '2026-10-01', actual: null, path: 35.2, changes: 36.7, low: 34.1, high: 36.3 },
  { month: '2026-11-01', actual: null, path: 35.6, changes: 37.2, low: 34.2, high: 37.0 },
  { month: '2026-12-01', actual: null, path: 36.0, changes: 37.6, low: 34.3, high: 37.6 },
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
            { label: 'Actual', tone: 'accent', marker: 'dot' },
            { label: 'Current path', tone: 'accent', dashed: true, marker: 'ring' },
            { label: 'With your changes', tone: 'gain', dashed: true, marker: 'dot' },
            { label: 'Likely range', tone: 'accent', shape: 'band' },
          ]}
        />
      </header>
      <LineChart
        title="Margin outlook"
        description="Margin reaches 36.0% by December on the current path and 37.6% with your changes, still under the 38% target."
        data={months}
        // Half a month of room before April and after December, like the reference.
        x={{ type: 'time', field: 'month', domain: ['2026-03-17', '2026-12-16'] }}
        xAxis={9}
        xAxisFormat={{ month: 'short' }}
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
        forecastFrom="2026-10-01"
        target={{ value: 38, label: 'Target 38%' }}
        domain={[30, 40]}
        format="percent"
        yAxisFormat={(v) => `${v}%`}
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

The e2e tests `'the line chart snaps to the nearest month and lists every series'` (tooltip "Oct") and `'the line chart announces every series at a month'` (`'9 of 9, Dec, …'`) pass unchanged.

- [ ] **Step 7: Gates and e2e**

Run: `pnpm --filter storybook-app typecheck && pnpm typecheck && pnpm lint && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (77 e2e tests).

Compare `reference-margin-outlook--light` at 1280×640 (your own Storybook) with its committed darwin baseline: the same lines, band, region and labels "Apr" … "Dec"; the legend now shows a dot on "Actual" and "With your changes", a ring on "Current path", and a soft band swatch for "Likely range".

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/stories/MarginOutlook.stories.tsx
git commit -m "feat: legend markers and band swatches; the Margin outlook story on a time axis (A11Y-17)

Co-Authored-By: <your own model trailer>"
```

---

### Task 11: Visual fidelity backlog and the last unparted spans

**Files:**
- Modify: `packages/tally-charts/src/react/charts/DotHistogram.tsx` (ring on the pinned dot)
- Modify: `packages/tally-charts/src/react/charts/WaffleColumns.tsx` (room above the peak pill)
- Modify: `packages/tally-charts/src/react/ui/Meter.tsx`, `packages/tally-charts/src/react/ui/RangeMeter.tsx` (parts)
- Modify: `packages/tally-charts/src/theme/surface.test.ts`
- Modify: `apps/storybook/stories/ProfitLeaked.stories.tsx`, `apps/storybook/e2e/stories.spec.ts`
- Test: `src/react/charts/DotHistogram.test.tsx`, `src/react/charts/WaffleColumns.test.tsx`, `src/react/ui/Meter.test.tsx`, `src/react/ui/RangeMeter.test.tsx`

**Interfaces:**
- Consumes: `Dots` / `DotItem`, `Callout`, `useChartContext` (`activeId`).
- Produces:
  - DotHistogram draws the `dot-ring` around the `calloutId` dot while no point is active (the callout hides on activation, and the ring then follows the active dot as before).
  - WaffleColumns' default top margin is 44px when it pins the peak pill (`peak` and `callout` on), else 8px as before; a user `margin` still wins.
  - New public parts `meter-min-label` (Meter's start label), `range-scale-min` and `range-scale-max` (RangeMeter's scale ends).

The Heatmap column-name span of the 0.6a review no longer exists: Task 8 left only the name in each column header. "Column header name and total visually separated" (spec §6) is also Task 8 (the totals row).

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/DotHistogram.test.tsx`, after `'pins a callout with a stem to an item'`, add:

```tsx
  it('rings the pinned dot while the callout shows, and hands the ring over on activation', () => {
    const { container, rerender } = renderHistogram({ calloutId: 2 })
    const ring = () => container.querySelectorAll('[data-ch-part="dot-ring"]')
    const pinned = dots(container)[1] as Element
    expect(ring()).toHaveLength(1)
    expect(ring()[0]).toHaveAttribute('cx', pinned.getAttribute('cx'))
    expect(ring()[0]).toHaveAttribute('cy', pinned.getAttribute('cy'))
    expect(ring()[0]).toHaveAttribute('data-ch-tone', 'warn')
    // While another dot is active, the callout hides and the ring follows the active dot.
    rerender(
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
        calloutId={2}
        activeId={5}
      />,
    )
    expect(ring()).toHaveLength(1)
    expect(ring()[0]).toHaveAttribute('cx', (dots(container)[4] as Element).getAttribute('cx'))
  })
```

In `packages/tally-charts/src/react/charts/WaffleColumns.test.tsx`:

1. Replace the comment above `renderWaffle` with:

```tsx
// unit 2 → 4, 6, 12 and 5 dots; 2 across → the tallest column has 6 rows.
// 400 × 200 with a 44px top (room for the peak pill) and 28px bottom: 128px of plot height,
// cells of 128/6 px.
```

2. In `'draws a column of dots per period, bottom-up'`: `expect(bottom).toBeCloseTo(128 - 128 / 6 / 2)`.
3. In `'caps an outlier column at the dots that fit and warns once'`: the comment becomes `// 128px of plot height fits floor(128 / (2 × 1.5 + 3)) = 21 rows: 42 dots two across.`, the count `4 + 6 + 42 + 5`, the message `'columns are capped at 42 dots'`.
4. After `'pins the peak callout'`, add:

```tsx
  it('leaves room above the plot for the peak pill, and none without it', () => {
    const plotTop = (root: HTMLElement) =>
      root.querySelector('svg > g')?.getAttribute('transform') ?? ''
    const { container, unmount } = renderWaffle()
    expect(plotTop(container)).toBe('translate(0,44)')
    unmount()
    const without = renderWaffle({ callout: false })
    expect(plotTop(without.container)).toBe('translate(0,8)')
  })
```

In `packages/tally-charts/src/react/ui/Meter.test.tsx`, after `expect(container.querySelector('.ch-meter-labels')).toHaveTextContent('20.0%Target 38.0%')`, add:

```tsx
    expect(container.querySelector('[data-ch-part="meter-min-label"]')).toHaveTextContent('20.0%')
```

In `packages/tally-charts/src/react/ui/RangeMeter.test.tsx`, after `expect(container.querySelector('.ch-range-scale')).toHaveTextContent('0.0%40.0%')`, add:

```tsx
    expect(container.querySelector('[data-ch-part="range-scale-min"]')).toHaveTextContent('0.0%')
    expect(container.querySelector('[data-ch-part="range-scale-max"]')).toHaveTextContent('40.0%')
```

In `packages/tally-charts/src/theme/surface.test.ts`, add to `PARTS` `'meter-min-label',` after `'meter-labels',`, and `'range-scale-max',` and `'range-scale-min',` after `'range-scale',`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/DotHistogram.test.tsx src/react/charts/WaffleColumns.test.tsx src/react/ui src/theme/surface.test.ts`
Expected: FAIL: no ring without activation, the plot starts at 8px, the three spans have no part.

- [ ] **Step 3: Ring the pinned dot**

In `packages/tally-charts/src/react/charts/DotHistogram.tsx`, in `HistogramDots`, before `return (`, add:

```tsx
  // The pinned dot wears the active ring while its callout shows (the callout hides on activation).
  const pinned =
    props.calloutId !== undefined && ctx.activeId === null
      ? items.find((d) => d.id === props.calloutId)
      : undefined
```

and right after `<Dots dots={items} radius={layout.radius} />`, add:

```tsx
      {pinned ? (
        <circle
          data-ch-part="dot-ring"
          data-ch-tone={pinned.tone}
          cx={pinned.cx}
          cy={pinned.cy}
          r={layout.radius + 3}
          style={{ stroke: `var(--ch-${pinned.tone})` }}
        />
      ) : null}
```

(the same geometry and style as the ring `Dots` draws on the active dot).

- [ ] **Step 4: Room for the waffle's peak pill**

In `packages/tally-charts/src/react/charts/WaffleColumns.tsx`, after the `MARGIN` constant, add:

```ts
/** Top margin with the peak pill: the pill and a gap above the tallest column, in px. */
const CALLOUT_ROOM = 44
```

and replace `const m: Margin = { ...MARGIN, ...margin }` with:

```ts
  const m: Margin = {
    ...MARGIN,
    ...(peakRow && calloutSegments ? { top: CALLOUT_ROOM } : null),
    ...margin,
  }
```

The tallest column fills the plot height, and the callout is clamped inside the top margin, so with 8px the pill sat on the column. 44px holds the ~30px pill and the callout's 10px offset.

In `apps/storybook/stories/ProfitLeaked.stories.tsx`, keep the dots their size and the card its height: replace `<div style={{ marginTop: 32 }}>` with

```tsx
      {/* The chart's own top margin holds the peak pill, so no extra space above it. */}
      <div>
```

and `height={180}` with `height={216}`.

In `apps/storybook/e2e/stories.spec.ts`, before `'the line chart snaps to the nearest month and lists every series'`, add:

```ts
test('the waffle peak pill keeps a gap above its column', async ({ page }) => {
  await open(page, 'reference-profit-leaked--light')
  const pill = await page.locator('[data-ch-part="callout"]').boundingBox()
  if (!pill) throw new Error('no callout')
  const tops = await page
    .locator('[data-ch-part="dot"]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
  expect(Math.min(...tops) - (pill.y + pill.height)).toBeGreaterThanOrEqual(8)
})
```

- [ ] **Step 5: Parts for the last bare spans**

In `packages/tally-charts/src/react/ui/Meter.tsx`, replace `{showMin ? <span>{minLabel ?? fmt(min)}</span> : null}` with:

```tsx
          {showMin ? (
            <span className="ch-meter-min-label" data-ch-part="meter-min-label">
              {minLabel ?? fmt(min)}
            </span>
          ) : null}
```

In `packages/tally-charts/src/react/ui/RangeMeter.tsx`, replace the two scale spans with:

```tsx
          <span data-ch-part="range-scale-min">{fmt(min)}</span>
          <span data-ch-part="range-scale-max">{fmt(max)}</span>
```

- [ ] **Step 6: Run the tests and the gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (913 unit, 78 e2e); no API report change.

Look at `reference-jobs-by-margin--light` at 1280px (the #5819 dot has the ring, as in `02-jobs-dot-histogram-table.png`) and `reference-profit-leaked--light` (a clear gap under the "Peak" pill).

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook
git commit -m "fix: ring on the pinned histogram dot, room above the waffle peak pill, parts on meter scale labels

Co-Authored-By: <your own model trailer>"
```

---

### Task 12: Heatmap reflow: a sideways scroller and `--ch-heatmap-min-cell` (A11Y-8)

**Files:**
- Modify: `packages/tally-charts/src/react/charts/Heatmap.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`
- Modify: `packages/tally-charts/src/theme/surface.test.ts` (token, part, README table check)
- Modify: `packages/tally-charts/README.md` (token table row)
- Test: `src/react/charts/Heatmap.test.tsx`, `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `useIsoLayoutEffect` (`react/useIsoLayoutEffect.ts`); the Task 8 grid markup.
- Produces:
  - New public token `--ch-heatmap-min-cell` (default 56px): the narrowest a heatmap column gets. Below that the grid scrolls sideways.
  - New public part `heatmap-scroll`: a `div` around the `role="grid"` element, `overflow-x: auto`. While its content overflows (checked on mount and by a `ResizeObserver`), it has `tabIndex={0}`, `role="group"` and `aria-label={title ?? 'Heatmap'}`; otherwise none of them.
  - `surface.test.ts` checks that the README's token table lists exactly `TOKENS` (the deferred "README-table check").

Spec §7 says "Columns are `minmax(var(--ch-heatmap-min-cell, 56px), 1fr)`". Measured at 320px: with a fixed track minimum, names longer than the minimum ("Callbacks", "Discounts" at 13px are about 62px) overflow their column, which is the overlap the spec rules out. The plan keeps the token's meaning with `1fr` tracks (whose automatic minimum is the content's) and `min-width: var(--ch-heatmap-min-cell, 56px)` on the cells: a column is at least a minimum cell and at least its longest name.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/Heatmap.test.tsx`, before `'bins values onto the sequential levels'`, add:

```tsx
  it('wraps the grid in a scroll container that becomes a focusable group only when it overflows', () => {
    const { container, unmount } = renderHeatmap()
    const scroller = () => container.querySelector('[data-ch-part="heatmap-scroll"]') as HTMLElement
    expect(scroller().firstElementChild).toHaveAttribute('role', 'grid')
    expect(scroller()).not.toHaveAttribute('tabindex')
    expect(scroller()).not.toHaveAttribute('role')
    unmount()
    // Too narrow: the columns keep their minimum width and the container scrolls sideways.
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
    const narrow = renderHeatmap()
    const group = narrow.container.querySelector('[data-ch-part="heatmap-scroll"]')
    expect(group).toHaveAttribute('tabindex', '0')
    expect(group).toHaveAttribute('role', 'group')
    expect(group).toHaveAttribute('aria-label', 'Where it leaks')
  })
```

In `packages/tally-charts/src/theme/theme.test.ts`, before `'lets the top heatmap cell glow in the base color, except under reduced transparency'`, add:

```ts
  it('keeps heatmap columns at least a minimum cell wide and scrolls the grid instead', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\] \{[^}]*min-width: var\(--ch-heatmap-min-cell, 56px\);/,
    )
    expect(css).toMatch(
      /\[data-ch-part="heatmap-grid"\] \{[^}]*grid-template-columns: max-content repeat\(var\(--_ch-heatmap-columns\), 1fr\);/,
    )
    expect(css).toMatch(/\[data-ch-part="heatmap-scroll"\] \{[^}]*overflow-x: auto;/)
    // minmax(0, 1fr) let names and values overlap at 320px (A11Y-8).
    expect(css).not.toContain('minmax(0, 1fr)')
  })
```

In `packages/tally-charts/src/theme/surface.test.ts`:

1. Add `'--ch-heatmap-min-cell',` to `TOKENS` after `'--ch-heatmap-cell-height',`, and `'heatmap-scroll',` to `PARTS` after `'heatmap-rowheader',`.
2. After the `const css = …` line, add:

```ts
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')

/** The tokens the README's styling table lists; "`--ch-x-1` … `--ch-x-5`" is a range. */
function readmeTokens(): string[] {
  const table = readme.split('## Styling')[1]?.split('\n## ')[0] ?? ''
  const rows = table.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| Group'))
  return rows.flatMap((row) =>
    [...row.matchAll(/`(--ch-[a-z0-9-]+)`(?:\s*…\s*`(--ch-[a-z0-9-]+)`)?/g)].flatMap((m) => {
      const [, first = '', last] = m
      const from = /^(.*-)(\d+)$/.exec(first)
      const to = last ? /^(.*-)(\d+)$/.exec(last) : null
      if (!from || !to) return [first]
      return Array.from(
        { length: Number(to[2]) - Number(from[2]) + 1 },
        (_, i) => `${from[1]}${Number(from[2]) + i}`,
      )
    }),
  )
}
```

3. Before `'uses exactly the listed data-ch-part values'`, add:

```ts
  it('documents exactly the listed tokens in the README table', () => {
    expect(unique(readmeTokens())).toEqual(unique(TOKENS))
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/Heatmap.test.tsx src/theme`
Expected: FAIL: no scroller, `minmax(0, 1fr)` columns, the new token and part unused, and the README table lacks `--ch-heatmap-min-cell` (the table check otherwise passes: it parses all 34 documented tokens).

- [ ] **Step 3: The scroller**

In `packages/tally-charts/src/react/charts/Heatmap.tsx`:

1. Add `import { useIsoLayoutEffect } from '../useIsoLayoutEffect'` after the `../ui/util` import.
2. Before `const [innerActive, setInnerActive] = …`, add:

```tsx
  // A narrow container scrolls the grid sideways; only then is the scroller a named, focusable
  // group, so keyboard users can scroll it too.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  useIsoLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1)
    check()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(check)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [model])
```

   (It sits before the empty-state return, as hooks must; with no grid the ref is null.)
3. Wrap the whole `<div role="grid" …>…</div>` element (from Task 8, unchanged apart from one more level of indentation) in the scroller. The result:

```tsx
      <div
        ref={scrollRef}
        className="ch-heatmap-scroll"
        data-ch-part="heatmap-scroll"
        {...(overflowing ? { tabIndex: 0, role: 'group', 'aria-label': title ?? 'Heatmap' } : null)}
      >
        <div
          role="grid"
          className="ch-heatmap-grid"
          data-ch-part="heatmap-grid"
          data-ch-totals={totals ? 'true' : undefined}
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          style={{ '--_ch-heatmap-columns': model.columns.length } as CSSProperties}
          onPointerLeave={(event) => {
            // Keyboard focus keeps its cell active; the pointer only clears what it activated.
            const focused = event.currentTarget.contains(document.activeElement)
            setActive(focused && focusKey !== null && byId.has(focusKey) ? focusKey : null)
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
          }}
        >
          <div role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
            <div role="columnheader" className="ch-heatmap-corner" data-ch-part="heatmap-corner">
              <span className="ch-sr-only">{rowLabel ?? headerOf(row, 'Row')}</span>
            </div>
            {model.columns.map((name) => (
              <div
                key={name}
                role="columnheader"
                className="ch-heatmap-header"
                data-ch-part="heatmap-header"
              >
                {name}
              </div>
            ))}
            {totals ? (
              <div
                role="columnheader"
                className="ch-heatmap-header ch-heatmap-total-header"
                data-ch-part="heatmap-total-header"
              >
                {totalLabel}
              </div>
            ) : null}
          </div>
          {totals ? (
            // Column totals: their own row, named by its row header, so no column header carries a
            // number. It stays on top, under the column names.
            <div role="row" className="ch-heatmap-row" data-ch-part="heatmap-total-row">
              <div
                role="rowheader"
                className="ch-heatmap-rowheader"
                data-ch-part="heatmap-rowheader"
              >
                <span className="ch-sr-only">{totalLabel}</span>
              </div>
              {model.columns.map((name, j) => total(0, j, model.columnTotals[j], name))}
              {total(0, model.columns.length, sum(model.rowTotals), TOTAL)}
            </div>
          ) : null}
          {model.cells.map((rowCells, r) => (
            <div
              key={model.rows[r]}
              role="row"
              className="ch-heatmap-row"
              data-ch-part="heatmap-row"
            >
              <div
                role="rowheader"
                className="ch-heatmap-rowheader"
                data-ch-part="heatmap-rowheader"
              >
                {model.rows[r]}
              </div>
              {rowCells.map((cell, c) => (
                <div
                  key={cell.id}
                  {...navigable(r + top, c)}
                  role="gridcell"
                  className="ch-heatmap-cell"
                  data-ch-part="heatmap-cell"
                  data-ch-level={cell.level}
                  data-ch-active={cell.id === active ? 'true' : undefined}
                  data-ch-peak={cell.id === peakId ? 'true' : undefined}
                  data-ch-selectable={onSelect ? 'true' : undefined}
                  onFocus={() => {
                    setFocusKey(cell.id)
                    setActive(cell.id)
                  }}
                  onPointerEnter={() => setActive(cell.id)}
                  onClick={() => onSelect?.(cell.id, cell)}
                  onKeyDown={(event) => onKeyDown(event, r + top, c)}
                >
                  {valueText(cell.value)}
                </div>
              ))}
              {totals ? total(r + top, rowCells.length, model.rowTotals[r], TOTAL) : null}
            </div>
          ))}
        </div>
      </div>
```

- [ ] **Step 4: Column widths and the scroller's styles**

In `packages/tally-charts/src/theme/theme.css`, replace the two `[data-ch-part="heatmap-grid"]` rules with:

```css
/* A narrow container scrolls the grid sideways: a 2-D layout may scroll, text may not overlap.
   The padding keeps focus rings and the glow inside the scroller's clip. */
[data-ch-part="heatmap-scroll"] {
  margin: -8px;
  padding: 8px;
  overflow-x: auto;
  border-radius: 6px;
  outline: none;
}

[data-ch-part="heatmap-scroll"]:focus-visible {
  outline: 2px solid var(--ch-accent);
}

/* Columns share the width but never get narrower than their longest name or a minimum cell
   (`--ch-heatmap-min-cell` on the cells): below that, the grid scrolls. */
[data-ch-part="heatmap-grid"] {
  display: grid;
  grid-template-columns: max-content repeat(var(--_ch-heatmap-columns), 1fr);
  gap: 10px 12px;
}

[data-ch-part="heatmap-grid"][data-ch-totals="true"] {
  grid-template-columns: max-content repeat(var(--_ch-heatmap-columns), 1fr) max-content;
}
```

and in the `[data-ch-part="heatmap-cell"]` rule, after `place-items: center;`, add `min-width: var(--ch-heatmap-min-cell, 56px);`.

In `packages/tally-charts/README.md`, replace the Heatmap row of the token table with:

```md
| Heatmap | `--ch-heatmap-cell-height` (default 44px), `--ch-heatmap-min-cell` (default 56px: the narrowest a column gets before the grid scrolls sideways) |
```

- [ ] **Step 5: Run the tests and the gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (916 unit, 78 e2e); no API report change; Heatmap about 3.99 kB.

Look at `reference-where-it-leaks--light` at 320×640 and at 1280px (your own Storybook): at 320 the grid scrolls inside the card with every name and value readable; at 1280 it looks as before.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: the heatmap scrolls sideways in narrow containers instead of overlapping (A11Y-8)

Co-Authored-By: <your own model trailer>"
```

---

### Task 13: ComparisonBars `layout`: stacked rows when narrow (A11Y-8)

**Files:**
- Modify: `packages/tally-charts/src/react/Chart.tsx` (internal `layoutFor`, `FittedChart`)
- Modify: `packages/tally-charts/src/react/charts/ComparisonBars.tsx`
- Modify: `packages/tally-charts/api/tally-charts.api.md` (regenerated)
- Modify: `apps/storybook/.storybook/preview.css` (the story's total row wraps)
- Test: `src/react/charts/ComparisonBars.test.tsx`

**Interfaces:**
- Consumes: `CHAR_WIDTH` (`core/text.ts`), `RowLabels` (`position: 'above'`, `subtext`, `maxWidth`), `Bars` (`offset`, `size`).
- Produces:
  - `ComparisonBarsProps.layout?: 'auto' | 'columns' | 'stacked'` (additive), default `'auto'`. `'auto'` stacks when the chart width minus the label and value columns leaves the bars less than 120px. `'columns'` is honoured even when narrow (spec §8).
  - Stacked: no side columns (margin left/right 0 unless the user sets `margin`); each row is `rowHeight + 26` (plus 18 with a sublabel or values) tall; line 1 holds the label (left) and the delta (right), line 2 the sublabel (left) and the change (right, muted); the bars span the full width under the text. The label is cut to the width the values leave.
  - Internal, not exported from the package: `ChartFit { margin: Margin; height: number }` and `FittedChart`, a `<Chart>` typed with a `layoutFor(width) => ChartFit` prop that `Chart` reads from its rest props. `Chart`'s public signature and API report line stay `Chart<D>(input: ChartProps<D>)`.

Spec §7: "In 'stacked', the label and values sit on one row above the bars". Measured at 320px (a 200px chart in the story card), the label, "$640 → $1,060" and "+$420" don't fit one text line without cutting every label to a few letters, so the stacked row's text block has two lines: label + delta, then sublabel + change. The internal prop is named `layoutFor`: Biome's `noFocusedTests` flags a call named `fit(…)`.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/ComparisonBars.test.tsx`, before `'sizes the chart from the row count'`, add:

```tsx
  it('stacks the text over full-width bars when the bars would get less than 120px', () => {
    // 400 − 240 − 220 leaves no room for the bars: 'auto' stacks.
    const { container } = renderRows({ width: 400 })
    // No label or value columns: the plot is the full width.
    expect(container.querySelector('svg > g')).toHaveAttribute('transform', 'translate(0,0)')
    expect(Number(planBars(container)[0]?.getAttribute('x'))).toBe(0)
    // Rows grow by two text lines: 3 × (56 + 26 + 18).
    expect(container.querySelector('svg')).toHaveAttribute('height', '300')
    const labels = parts(container, '[data-ch-part="row-label"]')
    const first = labels.find((t) => t.textContent === 'Labor')
    const delta = labels.find((t) => t.textContent === '+$420')
    // The label and the delta share the first line, at the left and right edges.
    expect(first?.getAttribute('y')).toBe(delta?.getAttribute('y'))
    expect(first).toHaveAttribute('x', '0')
    expect(delta).toHaveAttribute('x', '400')
    // The change sits under the delta, on the sublabel's line.
    const change = parts(container, '[data-ch-part="row-sublabel"]').find(
      (t) => t.textContent === '$640 → $1,060',
    )
    expect(change).toHaveAttribute('text-anchor', 'end')
    expect(Number(change?.getAttribute('y'))).toBeGreaterThan(Number(first?.getAttribute('y')))
    // The bars sit under the text, in the lower part of the row.
    const bar = actualBars(container)[0] as Element
    expect(Number(bar.getAttribute('y'))).toBeGreaterThan(Number(change?.getAttribute('y')))
  })

  it('cuts a long label in the stacked layout to the room the values leave', () => {
    const long = [{ name: 'Permit and disposal fees', estimate: 210, actual: 160 }]
    const { container } = renderRows({ data: long, sublabel: undefined, width: 200 })
    const label = parts(container, '[data-ch-part="row-label"]')[0]
    expect(label?.textContent).toMatch(/…$/)
  })

  it('stacks rows with one text line when there are no values and no sublabels', () => {
    const { container } = renderRows({ width: 200, showValues: false, sublabel: undefined })
    // 3 × (56 + 26): one line of text above the bars.
    expect(container.querySelector('svg')).toHaveAttribute('height', '246')
    expect(parts(container, '[data-ch-part="row-labels"][data-ch-side="right"]')).toHaveLength(0)
    // With no values the label gets the whole line: "Subcontract" is not cut at 200px.
    expect(parts(container, '[data-ch-part="row-label"]').map((t) => t.textContent)).toEqual([
      'Labor',
      'Subcontract',
      'Permit',
    ])
    for (const bar of parts(container, '[data-ch-part="bar"]')) {
      expect(Number.isFinite(Number(bar.getAttribute('y')))).toBe(true)
    }
  })

  it('honours layout="columns" on a narrow chart and layout="stacked" on a wide one', () => {
    const narrow = renderRows({ width: 400, layout: 'columns' })
    expect(narrow.container.querySelector('svg > g')).toHaveAttribute(
      'transform',
      'translate(240,0)',
    )
    for (const bar of parts(narrow.container, '[data-ch-part="bar"]')) {
      expect(Number.isFinite(Number(bar.getAttribute('width')))).toBe(true)
    }
    narrow.unmount()
    const wide = renderRows({ width: 600, layout: 'stacked' })
    expect(wide.container.querySelector('svg > g')).toHaveAttribute('transform', 'translate(0,0)')
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/ComparisonBars.test.tsx`
Expected: FAIL: at 400px the plot still starts at 240 (`translate(240,0)`), the svg is 168px tall, and the long label isn't cut.

- [ ] **Step 3: Let `<Chart>` take its margins from its width (internal)**

In `packages/tally-charts/src/react/Chart.tsx`:

1. Before `const DEFAULT_MARGIN`, add:

```ts
/** Internal: the margins and height a chart picks once it knows its width. */
export interface ChartFit {
  margin: Margin
  height: number
}
```

2. Add `...internal` as the last destructured parameter (after `children,`) and, as the first statement of the body:

```ts
  // Internal: ComparisonBars passes `layoutFor` (through FittedChart) to lay out by its width.
  const { layoutFor } = internal as { layoutFor?: (width: number) => ChartFit }
```

3. Replace

```ts
  const h = Math.max(0, height ?? (aspectRatio ? Math.round(w / aspectRatio) : DEFAULT_HEIGHT))
  const margin: Margin = { ...DEFAULT_MARGIN, ...marginProp }
```

with

```ts
  const fitted = layoutFor?.(w)
  const h = Math.max(
    0,
    fitted?.height ?? height ?? (aspectRatio ? Math.round(w / aspectRatio) : DEFAULT_HEIGHT),
  )
  const margin: Margin = fitted?.margin ?? { ...DEFAULT_MARGIN, ...marginProp }
```

4. At the end of the file, add:

```ts
/** Internal: `<Chart>` that picks its margins and height from its measured width. */
export const FittedChart = Chart as <D>(
  props: ChartProps<D> & { layoutFor: (width: number) => ChartFit },
) => ReturnType<typeof Chart>
```

(`src/index.ts` doesn't export either name, so the API report doesn't see them.)

- [ ] **Step 4: The two layouts**

In `packages/tally-charts/src/react/charts/ComparisonBars.tsx`:

1. Imports: replace `import { Chart } from '../Chart'` and `import type { Margin } from '../context'` with

```ts
import { CHAR_WIDTH } from '../../core/text'
import { FittedChart } from '../Chart'
import { type Margin, useChartContext } from '../context'
```

   (keep the `../ChartsProvider` import between them; Biome sorts them).
2. In `ComparisonBarsProps`, replace `/** Default 56. */ rowHeight?: number` with:

```ts
  /**
   * 'columns': label, bars and values side by side. 'stacked': the label and the values on one
   * line above bars that span the full width. 'auto' stacks when the bars would get less than
   * 120px between the columns. Default 'auto'.
   */
  layout?: 'auto' | 'columns' | 'stacked'
  /** Row height in the columns layout; stacked rows add room for the text line. Default 56. */
  rowHeight?: number
```

   and the `labelWidth` doc with `/** Width of the label column in px, in the columns layout. Default 240. */`.
3. After `const GAP = 3`, add:

```ts
/** Narrowest plot, in px, before 'auto' stacks the rows. */
const MIN_PLOT = 120
/** Stacked rows: room above the bars for the first text line, and for the second, in px. */
const STACK_TEXT = 26
const STACK_SUBTEXT = 18
/** Stacked rows: space between text columns, in px. */
const TEXT_GAP = 12

/** The layout for a chart width: 'auto' stacks when the plot between the columns is too narrow. */
function resolveLayout(
  layout: 'auto' | 'columns' | 'stacked',
  width: number,
  columns: Margin,
): 'columns' | 'stacked' {
  if (layout !== 'auto') return layout
  return width - columns.left - columns.right < MIN_PLOT ? 'stacked' : 'columns'
}

/** Rough widths of 15px label text and 13px second-line text, in px, on the safe side. */
const lineWidth = (text: string) => text.length * (CHAR_WIDTH + 1)
const subWidth = (text: string) => text.length * CHAR_WIDTH
```

4. Before `export function ComparisonBars`, add:

```tsx
/** The bars and text of every row, in the layout the chart's width calls for. */
function ComparisonRows<D>(props: {
  rows: readonly ComparisonRow<D>[]
  planRows: readonly ComparisonRow<D>[]
  keptRows: readonly ComparisonRow<D>[]
  overRows: readonly ComparisonRow<D>[]
  stacked: (width: number) => boolean
  textSpace: number
  barSize: number
  labelWidth: number
  deltaWidth: number
  showValues: boolean
  hasSublabel: boolean
  overTone: Tone
  format: FormatSpec | undefined
  ariaOf: (r: ComparisonRow<D>) => string
  segmentsOf: (r: ComparisonRow<D>) => TooltipSegment[]
}) {
  const ctx = useChartContext('ComparisonBars')
  const stacked = props.stacked(ctx.width)
  const { barSize } = props
  // Stacked: the bars sit under the text line, centred in the rest of the row.
  const down = stacked ? props.textSpace / 2 : 0
  const shift = barSize / 2 + GAP / 2
  const radius = barSize / 2
  // Stacked: the values take what they need at the right; the label and sublabel get the rest.
  const widest = (measure: (text: string) => number, pick: (r: ComparisonRow<D>) => string) =>
    Math.max(0, ...props.rows.map((r) => measure(pick(r))))
  const valueSpace = props.showValues
    ? Math.max(
        widest(lineWidth, (r) => r.delta),
        widest(subWidth, (r) => r.change),
      ) + TEXT_GAP
    : 0
  const labelMax = stacked ? ctx.width - valueSpace : props.labelWidth - 16
  const position = stacked ? 'above' : 'middle'
  return (
    <>
      <Bars<ComparisonRow<D>>
        data={props.planRows}
        x="plan"
        id="rowId"
        tone="accent-soft"
        fill="hatch"
        size={barSize}
        offset={down - shift}
        radius={radius}
        interactive={false}
      />
      <Bars<ComparisonRow<D>>
        data={props.keptRows}
        x="kept"
        id="rowId"
        label="label"
        tone="accent"
        size={barSize}
        offset={down + shift}
        radius={radius}
        format={props.format}
        ariaLabel={props.ariaOf}
        segments={props.segmentsOf}
      />
      <Bars<ComparisonRow<D>>
        data={props.overRows}
        x="actual"
        from="plan"
        id="rowId"
        tone={props.overTone}
        fill="hatch"
        size={barSize}
        offset={down + shift}
        radius={radius}
        interactive={false}
      />
      <g
        data-ch-part="row-text"
        transform={stacked ? `translate(0 ${STACK_TEXT / 2 - 4})` : undefined}
      >
        <RowLabels<ComparisonRow<D>>
          text="label"
          subtext={props.hasSublabel ? 'sublabel' : undefined}
          position={position}
          maxWidth={labelMax}
        />
        {props.showValues && stacked ? (
          // The change goes under the delta, on the sublabel's line.
          <RowLabels<ComparisonRow<D>>
            side="right"
            text={() => ''}
            subtext="change"
            position="above"
          />
        ) : props.showValues ? (
          <RowLabels<ComparisonRow<D>> side="right" text="change" inset={props.deltaWidth} />
        ) : null}
        {props.showValues ? (
          <RowLabels<ComparisonRow<D>>
            side="right"
            text="delta"
            position={position}
            tone={(r) => r.deltaTone}
          />
        ) : null}
      </g>
    </>
  )
}
```

5. In `ComparisonBars`, destructure `layout = 'auto',` before `rowHeight = 56,`, and replace the `const m: Margin = {…}`, `const shift = …` and `const radius = …` lines with:

```ts
  const columns: Margin = {
    top: 0,
    bottom: 0,
    left: labelWidth,
    right: showValues ? valueWidth : 0,
    ...margin,
  }
  const stackedMargin: Margin = { top: 0, bottom: 0, left: 0, right: 0, ...margin }
  // Stacked text: the label and the delta on the first line, the sublabel and the change under it.
  const textSpace = STACK_TEXT + (sublabel || showValues ? STACK_SUBTEXT : 0)
  // The chart measures its width first; then the rows lay out as columns or stacked.
  const layoutFor = (width: number) => {
    const stacked = resolveLayout(layout, width, columns) === 'stacked'
    const m = stacked ? stackedMargin : columns
    const rowH = stacked ? rowHeight + textSpace : rowHeight
    return { margin: m, height: height ?? Math.max(1, rows.length) * rowH + m.top + m.bottom }
  }
```

6. Replace the returned element with:

```tsx
  return (
    <FittedChart<ComparisonRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'actual', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      layoutFor={layoutFor}
      dataTable={withTableOptions(table, dataTable)}
    >
      {dividers ? <RowDividers /> : null}
      <ComparisonRows<D>
        rows={rows}
        planRows={planRows}
        keptRows={keptRows}
        overRows={overRows}
        stacked={(width) => resolveLayout(layout, width, columns) === 'stacked'}
        textSpace={textSpace}
        barSize={barSize}
        labelWidth={labelWidth}
        deltaWidth={deltaWidth}
        showValues={showValues}
        hasSublabel={sublabel !== undefined}
        overTone={overTone}
        format={format}
        ariaOf={ariaOf}
        segmentsOf={segmentsOf}
      />
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </FittedChart>
  )
}
```

- [ ] **Step 5: Let the story's total row wrap**

In `apps/storybook/.storybook/preview.css`, add `flex-wrap: wrap;` and `gap: 4px 16px;` to `.total-row` after `display: flex;` (at 320px "Total cost" and its numbers ran together).

- [ ] **Step 6: Run the tests and update the API report**

Run: `pnpm test`
Expected: PASS (920 tests). The existing ComparisonBars tests render 600px wide (600 − 240 − 220 = 140), so they keep the columns layout.

Run: `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update && git diff packages/tally-charts/api`
Expected: only `layout?: 'auto' | 'columns' | 'stacked';` added to `ComparisonBarsProps`.

- [ ] **Step 7: Gates and e2e**

Run: `pnpm typecheck && pnpm lint && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (78 e2e); `pnpm lint` still reports only the 4 known warnings and 1 info; ComparisonBars about 11.55 kB, LineChart about 12.78 kB.

Look at `reference-estimate-vs-actual--light` at 320×640 and 1280px (your own Storybook): at 320 every row reads "Labor … +$420" over "7.5 h planne… $640 → $1,060" with the bars below at full width; at 1280 the columns layout is unchanged.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/.storybook/preview.css
git commit -m "feat: ComparisonBars layout: stack the text over full-width bars when narrow (A11Y-8)

Co-Authored-By: <your own model trailer>"
```

---

### Task 14: Reflow at 320px: row labels, bridge totals, pills, and the reflow gate (A11Y-8)

**Files:**
- Modify: `packages/tally-charts/src/react/marks/RowLabels.tsx` (`<title>` for cut text)
- Modify: `packages/tally-charts/src/react/charts/WaterfallChart.tsx` (label room on the shared line)
- Modify: `packages/tally-charts/src/react/charts/BridgeChart.tsx` (totals and notes that fit)
- Modify: `packages/tally-charts/src/core/ticks.ts` (export `fits`)
- Modify: `packages/tally-charts/src/react/overlays/Callout.tsx`, `src/react/overlays/Tooltip.tsx`, `src/theme/theme.css` (pills capped at the chart width; the svg shrinks in grid and flex tracks)
- Create: `apps/storybook/e2e/stories.ts` (shared story list), `apps/storybook/e2e/reflow.spec.ts`
- Modify: `apps/storybook/e2e/stories.spec.ts` (imports the shared list)
- Test: `src/react/marks/RowLabels.test.tsx`, `src/react/charts/WaterfallChart.test.tsx`, `src/react/charts/BridgeChart.test.tsx`, `src/react/overlays/Callout.test.tsx`, `src/react/overlays/Tooltip.test.tsx`, `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `truncateLabel`, `CHAR_WIDTH` (`core/text.ts`), `Tick` (`core/ticks.ts`), `RowLabels` `maxWidth` / `position: 'above'`.
- Produces:
  - `RowLabels`: when `maxWidth` cuts a row's text or subtext, the row's `<g>` gets a `<title>` with the full text (and subtext). The label's own `textContent` stays the cut text.
  - WaterfallChart: the left label's `maxWidth` is the chart width minus the widest right-hand text (at 8px a character) minus 12px.
  - BridgeChart: notes are cut to a column step (with a `<title>`); when a 22px total (13px a character) doesn't fit its own column, the totals are thinned counting back from the last column and the notes are left out (the tooltip and data table still carry them).
  - `fits(ticks, measure)` is exported from `core/ticks.ts` (internal; not in the `core` entry).
  - Tooltip and Callout containers get `maxWidth: ctx.width` inline; `.ch-tooltip` is `width: max-content`; the pill wraps (`flex-wrap: wrap`, no `white-space: nowrap`, `max-width: 100%`).
  - `.ch-svg` gets `max-width: 100%`, so a chart in a CSS grid or flex item no longer holds the track open at its 640px first-render width.
  - `apps/storybook/e2e/stories.ts` exports `STORIES`, `WIDE_STORIES`, `THEMELESS` and `open(page, id, theme?)`, moved unchanged out of `stories.spec.ts`.
  - The reflow gate: every story at 320×640 has no page-level horizontal scroll, no overlapping SVG text boxes in one SVG, no SVG text outside the viewport, and no clipped heatmap or legend text or pill.

Spec §7 lists RowLabels for "Waterfall, Ranked, Bridge": RankedBars already cuts its labels to its columns (its inline label column and the stacked `FittedLabels`), and BridgeChart has no row labels; its 320px overlaps are its 22px column totals and notes, fixed here instead. The labels' `<title>` is in the DOM as the spec asks, but SVG text takes no pointer events (so labels never block the hit areas), so browsers don't show it on hover; the tooltip and the data table carry the full text. The pill clamp wraps between segments first; the bridge's three-segment callout takes three lines at 200px (spec: "may wrap to two lines"). Spec §7 says "the `last-12-weeks--selectable` story uses a responsive width": the story wasn't fixed-width; it is a chart in a CSS grid item, whose track grew to the svg's 640px first-render width and scrolled the page to 552px. Any user's grid or flex layout would do the same, so the fix is in the library (`max-width: 100%` on the svg) and the story stays as it is, which makes the reflow gate test the fix.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/marks/RowLabels.test.tsx`, replace `'cuts long labels with an ellipsis'` with:

```tsx
  it('cuts long labels with an ellipsis and keeps the full text in a title', () => {
    const { container } = renderRows({ maxWidth: 70 })
    expect(labels(container)[1]).toHaveTextContent(/^Materials…$/)
    expect(labels(container)[1]?.parentElement?.querySelector('title')).toHaveTextContent(
      'Materials and supplies',
    )
    expect(labels(container)[0]).toHaveTextContent('Labor')
    expect(labels(container)[0]?.parentElement?.querySelector('title')).toBeNull()
  })
```

Append to `describe('<WaterfallChart>')` in `packages/tally-charts/src/react/charts/WaterfallChart.test.tsx`:

```tsx
  it('cuts a step label to the room the widest value text leaves on its line', () => {
    const { container } = renderWaterfall({
      width: 200,
      steps: [{ label: 'Material variance in Dallas', value: -20 }],
      stepLabel: () => '−1.6 pts · $7.7K',
    })
    const step = column(container, 'left')[1] as Element
    // 200px − 16 characters × 8px − 12px gap = 60px: eight characters, with the ellipsis.
    expect(step.textContent).toBe('Materia…')
    expect(step.parentElement?.querySelector('title')).toHaveTextContent(
      'Material variance in Dallas',
    )
    expect(column(container, 'left')[0]).toHaveTextContent(/^Target$/)
  })
```

Append to `describe('<BridgeChart>')` in `packages/tally-charts/src/react/charts/BridgeChart.test.tsx`:

```tsx
  it('cuts notes to their column and keeps every total when the columns are roomy', () => {
    const { container } = renderBridge()
    expect(parts(container, '[data-ch-part="column-total"]')).toHaveLength(5)
    expect(parts(container, '[data-ch-part="column-note"]').map((t) => t.textContent)).toEqual([
      '−$260 discount',
      '−$260 labor overrun',
      '−$240 callback',
      '−$100 materials',
    ])
  })

  it('cuts a long note to its column and keeps the whole note in a title', () => {
    const long = [
      { label: 'After discount', value: -260, note: 'discount for the repeat customer' },
    ]
    const { container } = renderBridge({ steps: long, width: 300 })
    const note = parts(container, '[data-ch-part="column-note"]')[0]
    expect(note?.textContent).toMatch(/…$/)
    expect(note?.parentElement?.querySelector('title')).toHaveTextContent(
      '−$260 discount for the repeat customer',
    )
  })

  it('thins the totals from the last one and leaves the notes out when the columns are narrow', () => {
    const { container } = renderBridge({ width: 200 })
    // 40px steps can't hold a 22px "$1,260": every other total, counted back from the last.
    expect(parts(container, '[data-ch-part="column-total"]').map((t) => t.textContent)).toEqual([
      '$1,260',
      '$740',
      '$400',
    ])
    expect(parts(container, '[data-ch-part="column-note"]')).toHaveLength(0)
  })
```

Append to `describe('<Callout>')` in `packages/tally-charts/src/react/overlays/Callout.test.tsx`:

```tsx
  it('is never wider than the chart, so a long pill wraps', () => {
    const { container } = renderCallout({ id: 0 })
    expect(callout(container)).toHaveStyle({ maxWidth: '200px' })
  })
```

Append to `describe('<Tooltip>')` in `packages/tally-charts/src/react/overlays/Tooltip.test.tsx`:

```tsx
  it('is never wider than the chart, so a long pill wraps', () => {
    const { container } = render(<Example activeId={1} />)
    expect(tooltip(container)).toHaveStyle({ maxWidth: '300px' })
  })
```

In `packages/tally-charts/src/theme/theme.test.ts`, before `'disables motion for reduced-motion users'`, add:

```ts
  it('lets a chart shrink inside a grid or flex track', () => {
    expect(css).toMatch(/\.ch-svg \{[^}]*max-width: 100%;/)
  })

  it('sizes tooltips to their content and lets a capped pill wrap', () => {
    expect(css).toMatch(/\.ch-tooltip \{[^}]*width: max-content;/)
    const pill = css.match(/\[data-ch-part="tooltip-pill"\] \{([^}]*)\}/)?.[1] ?? ''
    expect(pill).toContain('flex-wrap: wrap')
    expect(pill).toContain('max-width: 100%')
    expect(pill).not.toContain('white-space: nowrap')
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/marks/RowLabels.test.tsx src/react/charts/WaterfallChart.test.tsx src/react/charts/BridgeChart.test.tsx src/react/overlays src/theme/theme.test.ts`
Expected: FAIL: no `<title>`, no `max-width` on `.ch-svg`, the waterfall label is whole, the bridge shows 5 totals and 4 uncut notes at 200px, no `maxWidth`, the pill doesn't wrap.

- [ ] **Step 3: `<title>` for cut row labels**

In `packages/tally-charts/src/react/marks/RowLabels.tsx`, replace the `maxWidth` doc comment's text with "Longest text in px; longer text is cut with an ellipsis, and the full text goes in a `<title>`.", replace

```tsx
        const text = cut(getText(d, i))
        const sub = getSub ? cut(getSub(d, i)) : ''
```

with

```tsx
        const fullText = String(getText(d, i) ?? '')
        const fullSub = getSub ? String(getSub(d, i) ?? '') : ''
        const text = cut(fullText)
        const sub = getSub ? cut(fullSub) : ''
```

and make the first child of the row's `<g key={i}>`:

```tsx
            {text !== fullText || sub !== fullSub ? (
              <title>{[fullText, fullSub].filter(Boolean).join(', ')}</title>
            ) : null}
```

- [ ] **Step 4: Room for the waterfall's labels**

In `packages/tally-charts/src/react/charts/WaterfallChart.tsx`, add `import { CHAR_WIDTH } from '../../core/text'`, add before `/** Connectors run from the bottom of one bar to the top of the next. */`:

```tsx
/** Space between a row's label and its value text, in px. */
const TEXT_GAP = 12

/**
 * The row label and the value text share the line above each bar: the label is cut to the width
 * the widest value text leaves. The width is only known inside <Chart>.
 */
function StepLabels<S>({
  rows,
  toneOfText,
}: {
  rows: readonly WaterfallRow<S>[]
  toneOfText: (r: WaterfallRow<S>) => Tone | undefined
}) {
  const ctx = useChartContext('WaterfallChart')
  const widest = Math.max(0, ...rows.map((r) => r.text.length * (CHAR_WIDTH + 1)))
  return (
    <>
      <RowLabels<WaterfallRow<S>>
        text="label"
        position="above"
        maxWidth={Math.max(0, ctx.width - widest - TEXT_GAP)}
      />
      <RowLabels<WaterfallRow<S>> side="right" text="text" position="above" tone={toneOfText} />
    </>
  )
}
```

and replace the two `<RowLabels<WaterfallRow<S>> …>` lines in the returned chart with `<StepLabels<S> rows={rows} toneOfText={toneOfText} />`.

- [ ] **Step 5: Bridge totals and notes that fit**

In `packages/tally-charts/src/core/ticks.ts`, export `fits` and give it a doc comment:

```ts
/** True when no two labels overlap (with an 8px gap), measured with `measure`. */
export function fits(ticks: readonly Tick[], measure: MeasureTick): boolean {
```

In `packages/tally-charts/src/react/charts/BridgeChart.tsx`:

1. Imports: add `import { truncateLabel } from '../../core/text'` and `import { fits, type Tick } from '../../core/ticks'`.
2. Before `/** Gap between a pinned callout and the labels below it, in px. */`, add:

```ts
/** Width of one character of a 22px column total, in px (tabular figures, about 0.6em). */
const TOTAL_CHAR = 13
```

3. Replace the `ColumnTotals` function (and its comment, if any) with:

```tsx
/**
 * Totals that fit side by side: all of them, else every other one counting back from the last
 * (the highlighted result), every fourth, …, and at least the last.
 */
function fittingTotals(ticks: readonly Tick[]): Tick[] {
  const measure = (t: Tick) => t.label.length * TOTAL_CHAR
  for (let step = 1; step < ticks.length; step *= 2) {
    const kept = ticks.filter((_, i) => (ticks.length - 1 - i) % step === 0)
    if (fits(kept, measure)) return kept
  }
  return ticks.slice(-1)
}

/**
 * Totals and notes above the columns. Notes are cut to a column step; in a chart too narrow for
 * the 22px totals, the totals are thinned like axis labels (the last one stays) and the notes
 * hidden, so nothing overlaps.
 */
function ColumnTotals<S>({ rows, fmt }: { rows: readonly BridgeRow<S>[]; fmt: Formatter }) {
  const ctx = useChartContext('BridgeChart')
  if (ctx.x.kind !== 'band' || ctx.y.kind !== 'linear') return null
  const band = ctx.x.scale
  const linear = ctx.y.scale
  const half = band.bandwidth() / 2
  const [r0, r1] = linear.range()
  const clamp = (px: number) => Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
  const ticks: Tick[] = rows.flatMap((r) => {
    const start = band(r.key)
    return start === undefined
      ? []
      : [{ value: r.key, position: start + half, label: fmt(r.total), anchor: 'middle' as const }]
  })
  // Roomy: every total fits its own column, so totals and the notes (cut to a column) can't meet.
  // Otherwise the totals are thinned and the notes left to the tooltip and the data table.
  const roomy = ticks.every((t) => t.label.length * TOTAL_CHAR <= band.step() - 8)
  const shown = new Set((roomy ? ticks : fittingTotals(ticks)).map((t) => t.value))
  return (
    <g data-ch-part="column-totals">
      {rows.map((r) => {
        const start = band(r.key)
        if (start === undefined) return null
        const x = start + half
        const top = clamp(linear(r.top))
        const note = roomy ? truncateLabel(r.note, band.step() - 4) : ''
        return (
          <g key={r.key}>
            {note && note !== r.note ? <title>{r.note}</title> : null}
            {shown.has(r.key) ? (
              <text
                data-ch-part="column-total"
                x={x}
                y={totalBaseline(top, r.note)}
                textAnchor="middle"
              >
                {fmt(r.total)}
              </text>
            ) : null}
            {note ? (
              <text
                data-ch-part="column-note"
                data-ch-tone={r.capTone}
                data-ch-tone-text="true"
                x={x}
                y={top - VALUE_GAP}
                textAnchor="middle"
                style={toneVar(r.capTone)}
              >
                {note}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 6: Pills never wider than the chart**

In `packages/tally-charts/src/react/overlays/Callout.tsx` and `Tooltip.tsx`, the container's `style` becomes (with this comment above it):

```tsx
        // Never wider than the chart: a long pill wraps instead of widening the page.
        style={{ left: position.left, top: position.top, maxWidth: ctx.width }}
```

In `packages/tally-charts/src/theme/theme.css`, replace the `.ch-tooltip` rule with:

```css
/* As wide as the content (not the space left of the anchor), capped at the chart width by an
   inline max-width; past that the pill wraps between, and then inside, its segments. */
.ch-tooltip {
  position: absolute;
  z-index: 1;
  width: max-content;
}
```

and in `[data-ch-part="tooltip-pill"]` add `flex-wrap: wrap;`, `row-gap: 2px;`, `box-sizing: border-box;` and `max-width: 100%;` after `display: inline-flex;`, and delete `white-space: nowrap;`.

- [ ] **Step 7: Let the svg shrink in grid and flex tracks**

In `packages/tally-charts/src/theme/theme.css`, replace the `.ch-svg` rule with:

```css
/* max-width: the svg's first-render width (640px) must not hold open a grid or flex track it
   sits in; the chart measures the container and redraws at its width. */
.ch-svg {
  display: block;
  max-width: 100%;
  overflow: visible;
}
```

At any width where the chart fits, nothing changes (the screenshots of Task 16 confirm it).

- [ ] **Step 8: Run the unit tests**

Run: `pnpm test`
Expected: PASS (928 tests).

- [ ] **Step 9: The reflow gate**

Move `STORIES`, `WIDE_STORIES`, `THEMELESS` and `open` out of `apps/storybook/e2e/stories.spec.ts` into a new `apps/storybook/e2e/stories.ts`, exported, so the new spec shares them:

```ts
import type { Page } from '@playwright/test'

// Shared by the e2e specs: the story ids, their viewports and how to open one.

/** Every story with a screenshot baseline. */
export const STORIES = [
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
  'reference-drill-columns--dark',
  'reference-gross-margin--light',
  'reference-gross-margin--dark',
  'primitives-small-pieces--default',
  'reference-why-it-is-under-target--light',
  'reference-why-it-is-under-target--dark',
  'reference-profit-bridge--light',
  'reference-profit-bridge--dark',
  'reference-jobs-by-margin--light',
  'reference-jobs-by-margin--dark',
  'reference-dallas-installs--light',
  'reference-dallas-installs--dark',
  'reference-profit-leaked--light',
  'reference-profit-leaked--dark',
  'reference-margin-outlook--light',
  'reference-margin-outlook--dark',
  'reference-where-it-leaks--light',
  'reference-where-it-leaks--dark',
  'charts-time-axis--hourly-light',
  'charts-time-axis--hourly-dark',
  'charts-time-axis--daily-light',
  'charts-time-axis--daily-dark',
  'charts-time-axis--monthly-light',
  'charts-time-axis--monthly-dark',
  'primitives-sequential--light',
  'primitives-sequential--dark',
]

// Stories whose reference layout needs more room than the default 800px viewport.
export const WIDE_STORIES: Record<string, { width: number; height: number }> = {
  'reference-drill-columns--light': { width: 1280, height: 600 },
  'reference-drill-columns--dark': { width: 1280, height: 600 },
  'reference-profit-bridge--light': { width: 1280, height: 720 },
  'reference-profit-bridge--dark': { width: 1280, height: 720 },
  'reference-jobs-by-margin--light': { width: 1280, height: 600 },
  'reference-jobs-by-margin--dark': { width: 1280, height: 600 },
  'reference-dallas-installs--light': { width: 1280, height: 600 },
  'reference-dallas-installs--dark': { width: 1280, height: 600 },
  'reference-margin-outlook--light': { width: 1280, height: 640 },
  'reference-margin-outlook--dark': { width: 1280, height: 640 },
  'reference-where-it-leaks--light': { width: 1280, height: 600 },
  'reference-where-it-leaks--dark': { width: 1280, height: 600 },
}

// Stories without a theme of their own follow the toolbar global: axe checks them in both themes.
export const THEMELESS = new Set([
  'primitives-legend--default',
  'charts-barchart--horizontal',
  'primitives-small-pieces--default',
  'reference-last-12-weeks--selectable',
])

export async function open(page: Page, id: string, theme?: 'light' | 'dark') {
  const globals = theme ? `&globals=theme:${theme}` : ''
  await page.goto(`/iframe.html?id=${id}&viewMode=story${globals}`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]')
    .first()
    .waitFor()
}
```

In `stories.spec.ts`, delete those definitions and import them:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { open, STORIES, THEMELESS, WIDE_STORIES } from './stories'
```

Create `apps/storybook/e2e/reflow.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { open, STORIES } from './stories'

// WCAG 1.4.10 at 320 CSS px (spec §7): no story scrolls the page sideways, and no labels overlap
// or get clipped. The heatmap may scroll inside its own container.
test.use({ viewport: { width: 320, height: 640 } })

for (const id of [...STORIES, 'reference-last-12-weeks--selectable']) {
  test(`${id} reflows at 320px`, async ({ page }) => {
    await open(page, id)
    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth
      const root = document.querySelector('#storybook-root') as Element
      const texts = [...root.querySelectorAll<SVGTextElement>('svg text')]
        .map((el) => ({ el, box: el.getBoundingClientRect(), text: el.textContent?.trim() ?? '' }))
        .filter((t) => t.box.width > 0 && t.text)
      const overlaps: string[] = []
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i]
          const b = texts[j]
          if (!a || !b || a.el.ownerSVGElement !== b.el.ownerSVGElement) continue
          const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
          const h = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
          if (w > 1 && h > 1) overlaps.push(`"${a.text}" × "${b.text}"`)
        }
      }
      const offscreen = texts
        .filter((t) => t.box.left < -1 || t.box.right > width + 1)
        .map((t) => t.text)
      const clipped = [
        ...root.querySelectorAll(
          '[data-ch-part="heatmap-cell"], [data-ch-part="heatmap-header"], [data-ch-part="heatmap-rowheader"], [data-ch-part="heatmap-total"], [data-ch-part="legend-label"], [data-ch-part="tooltip-pill"]',
        ),
      ]
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim())
      return {
        scrollWidth: document.documentElement.scrollWidth,
        width,
        overlaps,
        offscreen,
        clipped,
      }
    })
    expect(result.scrollWidth, 'page scrolls sideways').toBeLessThanOrEqual(result.width)
    expect(result.overlaps).toEqual([])
    expect(result.offscreen).toEqual([])
    expect(result.clipped).toEqual([])
  })
}
```

Run: `pnpm --filter storybook-app typecheck && pnpm --filter storybook-app exec playwright test e2e/reflow.spec.ts`
Expected: PASS, 38 tests. (Before Tasks 12–14 the same spec fails on where-it-leaks, estimate-vs-actual, profit-bridge, jobs-by-margin, why-it-is-under-target and last-12-weeks--selectable, as in audit A11Y-8.)

- [ ] **Step 10: Gates and e2e**

Run: `pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: all PASS (116 e2e tests); no API report change; WaterfallChart about 12.91 kB, BridgeChart about 13.54 kB, LineChart about 12.79 kB.

Look at `reference-profit-bridge--light`, `reference-why-it-is-under-target--light` and `reference-jobs-by-margin--light` at 320×640 and at 1280px (your own Storybook): at 320 nothing overlaps or leaves the card; at 1280 they look as before.

- [ ] **Step 11: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook
git commit -m "feat: reflow at 320px: cut row labels with a title, thin bridge totals, cap pills at the chart width, and a reflow e2e gate (A11Y-8)

Co-Authored-By: <your own model trailer>"
```

---

### Task 15: The rendered text contrast gate (A11Y-18)

**Files:**
- Create: `apps/storybook/e2e/contrast.spec.ts`

**Interfaces:**
- Consumes: `open`, `STORIES`, `THEMELESS` from `apps/storybook/e2e/stories.ts` (Task 14); the chart widget (`role="application"`, Task 3).
- Produces: one e2e test per story (and per theme for the themeless ones, 42 in all) that measures every visible text run the library renders, at rest and with the first point active (tooltip shown), against the pixels under it.

This ports `docs/superpowers/specs/assets/0.6-a11y-audit/rendered-contrast.mjs` without its `pngjs` dependency: the text-free screenshot is decoded by the browser itself (an `Image` drawn on a canvas), so no new package is needed. It keeps the audit's method (computed fill or color with every ancestor's opacity, median over the box, 3:1 for text of 24px, or 18.66px bold, and up) and scopes it to text inside `[data-ch-root]` or a `[data-ch-part]` element, so story copy doesn't count.

- [ ] **Step 1: Write the spec**

Create `apps/storybook/e2e/contrast.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test'
import { open, STORIES, THEMELESS } from './stories'

// Rendered text contrast (spec §7, ported from the audit's rendered-contrast.mjs): axe reports
// SVG text as "incomplete", so this measures it. The text color is the computed fill or color
// (with every ancestor's opacity); the background is the screenshot under the text box with all
// text made transparent. The median contrast over the box must reach 4.5:1 (3:1 for large text).

interface TextRun {
  text: string
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
  large: boolean
}

/** Visible text the library renders (charts, heatmaps and their HTML pieces), not story copy. */
function collect(): TextRun[] {
  const root = document.querySelector('#storybook-root') as Element
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const runs: TextRun[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement
    const text = node.textContent?.trim() ?? ''
    if (!el || !text || el.closest('.ch-sr-only, [hidden], title')) continue
    if (!el.closest('[data-ch-root], [data-ch-part]')) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const box = range.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden') continue
    let opacity = 1
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      opacity *= Number(getComputedStyle(e).opacity)
    }
    const size = Number.parseFloat(style.fontSize)
    const bold = Number(style.fontWeight) >= 700
    runs.push({
      text: text.slice(0, 40),
      x: box.x + window.scrollX,
      y: box.y + window.scrollY,
      width: box.width,
      height: box.height,
      color: el instanceof SVGElement ? style.fill : style.color,
      opacity,
      large: size >= 24 || (size >= 18.66 && bold),
    })
  }
  return runs
}

const HIDE = `#storybook-root * { color: transparent !important; text-shadow: none !important; }
#storybook-root svg text, #storybook-root svg tspan { fill: transparent !important; stroke: none !important; }`

/** The median contrast of each run against the pixels under it, in a text-free screenshot. */
async function measure(page: Page): Promise<{ text: string; ratio: number; need: number }[]> {
  const runs = await page.evaluate(collect)
  const style = await page.addStyleTag({ content: HIDE })
  const shot = (await page.screenshot({ fullPage: true, animations: 'disabled' })).toString(
    'base64',
  )
  await style.evaluate((el) => (el as Element).remove())
  return page.evaluate(
    async ({ runs, shot }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      const channel = (v: number) => {
        const s = v / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      const lum = ([r = 0, g = 0, b = 0]: number[]) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      const parse = (color: string) => {
        const v = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1]
        return color.startsWith('color(')
          ? { rgb: v.slice(0, 3).map((c) => c * 255), alpha: v[3] ?? 1 }
          : { rgb: v.slice(0, 3), alpha: v[3] ?? 1 }
      }
      return runs.map((run) => {
        const { rgb, alpha } = parse(run.color)
        const a = alpha * run.opacity
        const ratios: number[] = []
        for (let y = Math.floor(run.y); y < Math.ceil(run.y + run.height); y++) {
          for (let x = Math.floor(run.x); x < Math.ceil(run.x + run.width); x++) {
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue
            const i = (y * canvas.width + x) * 4
            const bg = [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0]
            const fg = rgb.map((c, k) => c * a + (bg[k] ?? 0) * (1 - a))
            const [hi, lo] = [lum(fg), lum(bg)].sort((p, q) => q - p) as [number, number]
            ratios.push((hi + 0.05) / (lo + 0.05))
          }
        }
        ratios.sort((p, q) => p - q)
        return {
          text: run.text,
          ratio: ratios[Math.floor(ratios.length / 2)] ?? 21,
          need: run.large ? 3 : 4.5,
        }
      })
    },
    { runs, shot },
  )
}

const failing = (results: { text: string; ratio: number; need: number }[]) =>
  results.filter((r) => r.ratio < r.need).map((r) => `${r.text} ${r.ratio.toFixed(2)}`)

for (const id of [...STORIES, 'reference-last-12-weeks--selectable']) {
  for (const theme of THEMELESS.has(id) ? (['light', 'dark'] as const) : [undefined]) {
    test(`${id}${theme ? ` (${theme})` : ''} text keeps its contrast`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await open(page, id, theme)
      expect(failing(await measure(page))).toEqual([])
      // With a point active: the tooltip pill, highlighted labels and dimmed marks.
      const widget = page.getByRole('application').first()
      if ((await widget.count()) > 0) {
        await widget.focus()
        expect(failing(await measure(page))).toEqual([])
      }
    })
  }
}
```

- [ ] **Step 2: Check that it catches raw-tone text**

In `packages/tally-charts/src/theme/theme.css`, temporarily set `--ch-tone-text-mix: 100%;` (raw tone text, as before Task 6) and run:

Run: `pnpm --filter storybook-app exec playwright test e2e/contrast.spec.ts --grep "estimate|profit-bridge--light"`
Expected: FAIL, listing `"+$420 3.84"`, `"On plan 3.12"` (estimate-vs-actual) and `"−$260 discount 3.84"` (profit-bridge).

Set it back to `55%` (`git diff packages/tally-charts/src/theme/theme.css` must be empty).

- [ ] **Step 3: Run it**

Run: `pnpm --filter storybook-app typecheck && pnpm --filter storybook-app exec playwright test e2e/contrast.spec.ts`
Expected: PASS, 42 tests.

- [ ] **Step 4: Gates and e2e**

Run: `pnpm lint && pnpm --filter storybook-app exec playwright test --grep-invert "matches its screenshot"`
Expected: PASS (158 e2e tests).

- [ ] **Step 5: Commit**

```bash
pnpm format
git add apps/storybook/e2e/contrast.spec.ts
git commit -m "test: rendered text contrast gate for SVG and pill text (A11Y-18)

Co-Authored-By: <your own model trailer>"
```

---

### Task 16: Regenerate every visual baseline, darwin and linux (spec §6, §7)

Every visual change of 0.6b has landed (Tasks 1–14); this is the one regeneration spec §6 asks for. No code changes.

**Files:**
- Modify: `apps/storybook/e2e/__screenshots__/darwin/*.png` (30 changed, 3 new)
- Modify: `apps/storybook/e2e/__screenshots__/linux/*.png` (about 25 changed, 3 new)

**Interfaces:**
- Consumes: the e2e suite as Tasks 1–15 left it: 37 screenshot tests (34 old stories plus `primitives-sequential--light`, `primitives-sequential--dark`, `reference-drill-columns--dark`) and 158 other tests.
- Produces: baselines that make `pnpm test:e2e` pass in full again, on darwin and in the CI linux container.

- [ ] **Step 1: Regenerate the darwin baselines**

Make sure nothing listens on port 6007 (`lsof -nP -iTCP:6007 -sTCP:LISTEN` prints nothing; Playwright would reuse it). Leave port 6006 alone.

Run: `pnpm --filter storybook-app exec playwright test --update-snapshots=all --grep "matches its screenshot"`
Expected: 37 passed. `git status apps/storybook/e2e/__screenshots__/darwin` shows the three new PNGs and about 30 modified ones (`charts-time-axis--hourly-*` and `--monthly-*` are unchanged).

- [ ] **Step 2: Review every changed PNG**

Open each modified or new darwin PNG next to its committed version (`git show HEAD:<path> > /tmp/old.png`). Every difference must be one of these; anything else is a regression to fix in the task that caused it, with a unit test, before going on:

- Toned text is the inked mix (Task 6): ComparisonBars deltas and "On plan", bridge notes, waffle "September", tooltip and callout pill values, Delta arrows, the RangeMeter value label.
- Light warn, gain and neutral are darker (Task 6): jobs-by-margin dots and legend, the waterfall start bar, gain lines.
- Hatched bars and soft-accent bars, dots and swatches have a 1px inked outline (Task 6); `hatch-fade` history bars don't.
- The heatmap: the new ramp (hot pink top level with white text in light, the pure base with dark text in dark), outlined levels 1–2 in light, the totals row with the grand total under "Total", the glow on the top cell (Tasks 7, 8, 12); the same ramp on level legends.
- Margin outlook: the legend's dots, ring and band swatch; the line and axis as before (Task 10).
- jobs-by-margin: the ring on #5819 (Task 11); profit-leaked: the gap under the "Peak" pill, same dot size (Task 11).
- Daily time axis: the y axis reads 30%–38%, ends included (Task 1). jobs-by-margin's axis reads "0%" (0.6a, regenerated here as spec §6 planned).
- Sub-pixel differences in hatch patterns (the plot now sits in a wrapper div, Task 3).

- [ ] **Step 3: Run the whole suite on darwin**

Run: `pnpm test:e2e`
Expected: 195 passed (37 screenshots, 42 axe runs, 38 reflow, 42 contrast, 14 forced-colors, and 22 interaction and ramp tests).

- [ ] **Step 4: Regenerate and verify the linux baselines**

With Docker running, run the route from the comment above the `e2e` job in `.github/workflows/ci.yml`, from the repo root (first `rm -rf apps/storybook/storybook-static apps/storybook/test-results`):

```bash
docker run --rm -v "$PWD":/src:ro -v "$PWD/apps/storybook/e2e/__screenshots__":/out \
  mcr.microsoft.com/playwright:v1.64.0-noble sh -c '
    mkdir /w && cd /src && tar --exclude=node_modules --exclude=.git --exclude=storybook-static -cf - . | tar -xf - -C /w &&
    cd /w && corepack enable && pnpm install --frozen-lockfile &&
    pnpm --filter storybook-app exec playwright test --update-snapshots=all; pnpm test:e2e &&
    mkdir -p /out/linux && cp -r apps/storybook/e2e/__screenshots__/linux/. /out/linux/'
```

Expected: the verify run inside the container reports `195 passed`, and `git status apps/storybook/e2e/__screenshots__/linux` shows the same three new PNGs and about 25 modified ones. If the verify run fails, nothing is copied: fix the cause and run it again. Open the new linux PNGs and a few modified ones.

- [ ] **Step 5: Commit**

```bash
git add apps/storybook/e2e/__screenshots__
git commit -m "test: regenerate every visual baseline for 0.6b (darwin and linux)

Co-Authored-By: <your own model trailer>"
```

---

### Task 17: Documentation: `docs/a11y.md`, README, changeset; final verification (spec §7)

**Files:**
- Create: `docs/a11y.md`
- Modify: `packages/tally-charts/README.md`
- Modify: `.changeset/foundation-0-6.md`

**Interfaces:**
- Consumes: everything above; the announcements quoted in `docs/a11y.md` are the ones the stories produce (Task 4 e2e and a Playwright run over the stories while planning).
- Produces: the user-facing record of 0.6b. The README token table already lists `--ch-heatmap-min-cell` (Task 12), and `surface.test.ts` keeps it equal to `TOKENS`.

The README already has the token table, the "classes are private; `data-ch-part`, `data-ch-*` state attributes and `--ch-*` tokens are API" paragraph, and one line each for API-18 … API-23 (the "Conventions" section, from 0.6a). This task rewraps the paragraphs it touches (and the ragged ones the 0.6a review listed), extends "Changes in 0.6" with what 0.6b changes and adds, and adds an "Accessibility" section that points to `docs/a11y.md`.

- [ ] **Step 1: Write `docs/a11y.md`**

Create `docs/a11y.md`:

````md
# Accessibility in tally-charts

tally-charts aims at WCAG 2.2 AA. This page describes what the library does for keyboard and
screen-reader users, what it checks automatically, what is decorative on purpose, and what is
still checked by hand before a release.

## What CI checks

- **axe** (`@axe-core/playwright` 4.13.0) with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
  `wcag22aa` and `best-practice` tags on every Storybook story, in the light and the dark theme.
  Zero violations is the gate.
- **Rendered text contrast**: axe reports SVG text as "incomplete", so an e2e test measures every
  text run the library renders against the pixels behind it, at rest and with a point active:
  4.5:1, or 3:1 for large text.
- **Token contrast** (unit tests on `theme.css`): toned text at 4.5:1 on the surface and the
  tooltip, every mark at 3:1 (the soft accent through its outline), and every sequential level
  (6 tones × 2 themes × 5 levels) with its cell text at 4.5:1, neighbouring levels 1.3:1 apart
  and the top level at 3:1 against the surface.
- **Reflow** at 320 CSS px: no story scrolls the page sideways, and no labels overlap, leave the
  viewport or get clipped.
- **Forced colors** (Chromium emulation): HTML marks keep visible fills, heatmap levels differ by
  border, chart text follows the system text color, and focus rings stay visible.
- **Keyboard**: focus, arrow keys, Home/End, Enter, Escape and the announcements, per chart.

## Keyboard model

### Charts (everything built on `<Chart>`)

- A chart is one tab stop: the element with `role="application"` and
  `aria-roledescription="chart"` inside the `<figure>`. A `<Chart>` whose marks register no
  points (only lines, areas or a grid) is not a tab stop.
- Tabbing in shows the first point: its tooltip appears and it is announced. A click that
  focuses the chart doesn't.
- ←/→ (and ↑/↓) move to the previous or next point; Home and End go to the first and last.
  Charts whose points form stacks or rows move in two dimensions: DotHistogram walks bins with
  ←/→ and stacks with ↑/↓; StripPlot walks a row with ←/→ and changes rows with ↑/↓.
- Enter or Space selects the active point when the chart has `onSelect`.
- Escape clears the active point. It is only consumed when something is active, so an enclosing
  dialog still closes. Escape also closes a tooltip opened by hovering, wherever focus is, and the
  pointer can move onto a hover tooltip without closing it (WCAG 1.4.13).
- The widget is described by the chart's `description` and a hint: "Use arrow keys to move
  between points, Home and End for first and last, Escape to clear.", plus " Press Enter to
  select." with `onSelect`. `keyboardHint` replaces it (to translate it); `keyboardHint=""` turns
  it off.

### Heatmap

- The grid is one tab stop (a roving `tabindex`), on the first data cell until another cell had
  focus.
- Arrow keys move one cell, Home and End to the start and end of the row, Ctrl+Home and Ctrl+End
  (or Cmd) to the first and last cell of the grid, PageUp and PageDown five rows.
- The column totals row and the row total column are cells too: arrow keys reach them, and
  focusing one clears the active cell. Enter or Space selects a data cell with `onSelect`; on a
  total it does nothing.
- Escape clears the active cell, only when one is active.
- In a container too narrow for the columns, the grid scrolls sideways inside a `role="group"`
  named after the title, which then becomes a tab stop of its own so keyboard users can scroll it.

## What a screen reader gets

### Charts

- `figure`, named by `title` and described by `description`.
- Inside it, the chart widget (`application`, role description "chart"), with the same name and
  the description plus the keyboard hint. Screen readers switch to focus mode there, so the arrow
  keys reach the chart.
- An `aria-live="polite"` region that announces each point the keyboard moves to:
  "{series}, {n} of {total}, {label}". The position counts within the point's series, and the
  series is left out when there is only one.
- A visually hidden data table after the widget, outside it, so browse mode reads it: captioned
  with the title (or `dataTable.caption`), with column headers, the first column as row headers,
  and "no value" for empty cells.
- The SVG and the HTML overlay (tooltips and callouts) are `aria-hidden`. A pinned callout says
  nothing to a screen reader: put the same facts in the title, the description or the data.

| Chart | Announcement, from the Storybook stories |
|---|---|
| BarChart, `<Chart>` + `Bars` | "1 of 12, Jul 6, 37.5%" |
| ComparisonBars | "1 of 6, Labor, plan $640, actual $1,060, +$420" |
| RankedBars | "1 of 5, Labor overruns, $31.2K"; with `meta`: "1 of 5, Tyler Brooks, $2.6K, 9 jobs" |
| WaterfallChart | "2 of 7, Labor overruns, −1.6 pts · $7.7K, running total 36.4%" |
| BridgeChart | "2 of 5, After discount, $1,000, −$260 discount" |
| DotHistogram (`toneBy` thresholds) | "Critical, 1 of 6, #5600, 3.1%" |
| StripPlot | "Estimated, 1 of 29, #5900, 5.2 h" |
| WaffleColumns | "1 of 8, Aug 3, $9.8K" |
| LineChart | "9 of 9, Dec, 36.0% on the current path, 37.6% with changes" |
| LineChart on a time axis | "1 of 90, Jan 1, 2026, 32.0% Margin this quarter" |

A mark's `ariaLabel` (or a chart's own text) is the `{label}` part; the chart adds the series and
the position around it.

### Heatmap

A `grid` named by `title` and described by `description`. The first row holds the column
headers: the corner, named by `rowLabel` (default: the `row` field in sentence case), the column
names, and "Total". With `totals`, the next row is the column totals, headed by `totalLabel`, and
ends with the grand total. Every data row starts with its row header and ends with its total. A
cell reads as its value with its row and column header, e.g. "Dallas, Labor, $14.8K"; a missing
value reads "No data".

### Small pieces

- `Meter`: `role="meter"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and an
  `aria-valuetext` such as "34.0%, target 38.0%".
- `RangeMeter`: `role="img"` named "{label}: {value} against {reference}".
- `Delta`: the arrow is hidden; a visually hidden "Up" or "Down" precedes the value.
- `Legend`: a list; swatches are hidden.
- `Stat`, `InlineBar`, `DotCount`, `TooltipPill`: their text.

## Decorative on purpose

These carry no information that isn't also available as text, in the tooltip or in the data
table, so they keep their low contrast (WCAG 1.4.11 applies to what is needed to understand the
content):

- grid lines and row dividers;
- bar, meter and inline-bar tracks;
- the light tint between hatch stripes, and the faded end of `hatch-fade` bars;
- soft dots (the periods that aren't the peak in WaffleColumns);
- dimmed marks while another one is active;
- bands (a likely range), regions (forecast shading) and the column highlight;
- dotted connectors between waterfall steps;
- the dashed border of an empty heatmap cell, and the glow on its top cell.

## Known limits

- Forced colors are verified only in Chromium's emulation. Windows with a real high-contrast
  theme (Edge, Firefox) should be checked by hand.
- No screen reader runs in CI. The checklist below is run by hand before a release.
- Font sizes are in px: browser zoom works (and passes at 200% and 400%), a user's default font
  size has no effect.
- Row labels cut with an ellipsis keep the full text in an SVG `<title>`, but chart text takes
  no pointer events (so labels never block the bars under them), so browsers don't show it on
  hover. The tooltip and the data table have the full text.
- In a very narrow chart, BridgeChart shows only some column totals and no notes, and a pinned
  pill can take three lines. The tooltip and the data table have everything.
- Screen readers differ in how they enter and announce `role="application"`. The checklist
  covers VoiceOver; NVDA and JAWS should be checked the same way.

## Manual checklist (before each release)

1. Run `pnpm test:e2e`; it must pass (axe, contrast, reflow, forced colors, keyboard).
2. In Storybook, Tab through `Reference/Estimate vs actual`, `Reference/Drill columns`,
   `Reference/Where it leaks` and `Reference/Margin outlook` with the keyboard only: every chart
   is one tab stop, the first point and its tooltip appear on focus, arrows, Home, End, Enter and
   Escape work, and the focus ring is visible.
3. Hover a bar in `Reference/Last 12 weeks`, press Escape: the tooltip closes.
4. Zoom the browser to 400% (or a 320px-wide window) on every reference story: nothing overlaps,
   the page doesn't scroll sideways, and the heatmap scrolls inside its card.
5. On Windows, turn on a high-contrast theme and look at the same stories in Edge.
6. Run the VoiceOver script below in Safari on macOS (VO = Control+Option).

### VoiceOver script

Open each story with `iframe.html?id=…&viewMode=story` so only the story is on the page. The
wording below is what the library provides; VoiceOver's own words for roles ("web application",
"chart") and its pauses vary by version. A step passes when the same information comes in the
same order.

**LineChart: `reference-margin-outlook--light`**

1. VO+Right to the chart. Expected: "Margin outlook, figure" (or similar), then the description
   "Margin reaches 36.0% by December on the current path and 37.6% with your changes, still under
   the 38% target."
2. Tab into the chart. Expected: "Margin outlook, chart" with the description and "Use arrow keys
   to move between points, Home and End for first and last, Escape to clear.", then
   "1 of 9, Apr, 32.9% Actual".
3. Press →. Expected: "2 of 9, May, 34.2% Actual".
4. Press End. Expected: "9 of 9, Dec, 36.0% on the current path, 37.6% with changes".
5. Press Escape, then VO+Right past the chart. Expected: the table "Margin outlook" with columns
   "Month, Actual, Current path, With your changes, Likely range"; row "Apr" reads "32.9%" then
   "no value" three times.

**RankedBars: `reference-drill-columns--light`**

1. Tab to the first chart. Expected: "Leakage by cause, chart", "Use arrow keys to move between
   points, Home and End for first and last, Escape to clear. Press Enter to select.", then
   "1 of 5, Labor overruns, $31.2K".
2. Press ↓. Expected: "2 of 5, Material variance, $18.7K".
3. Press Enter. Expected: the row gets the selection highlight and the story's output reads
   "Selected cause: Material variance".
4. Tab to the last chart. Expected: "1 of 5, Tyler Brooks, $2.6K, 9 jobs".

**Heatmap: `reference-where-it-leaks--light`**

1. Tab into the grid. Expected: "Profit leaked by branch and cause, grid" (or "table"), the
   description, then "Dallas, Labor, $14.8K" (row, column, value; VoiceOver may add the position).
2. Press →. Expected: "Materials, $7.9K".
3. Press ↑. Expected: the column total, "Total, Materials, $18.7K".
4. Press Ctrl+End. Expected: "Houston, Total, $21.9K".
5. Press Ctrl+Home. Expected: "Total, Labor, $31.2K".
6. Press ↓ to "$14.8K" and Enter. Expected: "Selected: Dallas · Labor" in the story's output.
7. Shrink the window to 320px wide and Tab from the grid backwards: the scroller is a stop of its
   own, "Profit leaked by branch and cause, group"; with VO, Shift+scroll or arrow keys scroll it.
````

- [ ] **Step 2: Update the README**

In `packages/tally-charts/README.md`:

1. Replace the Styling intro (a ragged wrap):

```md
The public CSS surface is the `--ch-*` tokens below, `data-ch-part` on every part you might
style, and the
`data-ch-*` state and variant attributes (`data-ch-tone`, `data-ch-fill`, `data-ch-active`,
`data-ch-dimmed`, `data-ch-direction`, …). Class names (`ch-*`) and `--_ch-*` variables are
private and can change in any release: select `[data-ch-part="…"]` instead.
```

with

```md
The public CSS surface is the `--ch-*` tokens below, `data-ch-part` on every part you might
style, and the `data-ch-*` state and variant attributes (`data-ch-tone`, `data-ch-fill`,
`data-ch-active`, `data-ch-dimmed`, `data-ch-direction`, …). Class names (`ch-*`) and `--_ch-*`
variables are private and can change in any release: select `[data-ch-part="…"]` instead.
```

2. Replace the Sequential row of the token table:

```md
| Sequential | `--ch-seq-base` (default `--ch-loss`) and `--ch-seq-mix-1` … `--ch-seq-mix-5` (each level's share of the base). `--ch-seq-1` … `--ch-seq-5` are computed from them on every chart, legend and heatmap: read them, but steer them with the base and the mixes, since overriding them has no effect |
```

with

```md
| Sequential | `--ch-seq-base` (default `--ch-loss`) and `--ch-seq-mix-1` … `--ch-seq-mix-5` (each level's share of the base). `--ch-seq-1` … `--ch-seq-5` are computed from them on every chart, legend and heatmap: read them, but steer them with the base and the mixes, since overriding them has no effect. `data-ch-seq-tone="<tone>"` on an ancestor (Heatmap's `tone` sets it) picks that tone's base and its shares for the theme |
```

3. Replace the paragraph under "## High-level charts":

```md
Each one is a thin composition of `<Chart>` and the building blocks, renders a hidden data table
for screen readers by default (`dataTable={false}` turns it off), and renders `children` after
its own marks.
```

with

```md
Each one is a thin composition of `<Chart>` and the building blocks, renders a hidden data table
for screen readers by default, and renders `children` after its own marks. `dataTable={false}`
turns the table off; `dataTable={{ caption, columns }}` sets its caption and renames columns,
keyed by the default header (`{ Week: 'Week ending' }`). The default headers are the field names
in sentence case ("grossMargin" reads "Gross margin") or the series labels. `keyboardHint` sets
the instructions read when the chart takes focus (see Accessibility below).
```

4. Replace the ComparisonBars bullet:

```md
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink segment, and a `$640 → $1,060  +$420` / "On plan" column. `good="up"` for revenue-like rows, where going over plan is good news.
```

with

```md
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink
  segment, and a `$640 → $1,060  +$420` / "On plan" column. `good="up"` for revenue-like rows,
  where going over plan is good news. `layout="stacked"` puts the label and the values above bars
  that span the full width; the default `'auto'` switches to it when the bars would get less than
  120px, and `layout="columns"` keeps the columns at any width.
```

5. Replace the Heatmap bullet:

```md
- `Heatmap`: an HTML CSS grid (`role="grid"`) of long-format data (`row`, `column`, `value`) with
  column totals under the headers, a row total column, and `breaks` binned onto `--ch-seq-1…5`
  with a legend. One tab stop: arrow keys, Home/End and Enter move and select. `tone` changes
  the base color of the cells and the legend; every tone keeps cell text at 4.5:1 or more in
  both themes. Without `tone`, the levels use a `--ch-seq-base` set on an ancestor, else
  `--ch-loss`; only loss and accent bases are tuned for contrast that way. Cell ids are
  `"<row>:<column>"`, so names containing `:` can collide (`a:b` + `c` and `a` + `b:c`), and
  each row and column name must be unique. Missing values show a dash.
```

with

```md
- `Heatmap`: an HTML CSS grid (`role="grid"`) of long-format data (`row`, `column`, `value`) with
  a row of column totals under the headers, a row total column, and `breaks` binned onto
  `--ch-seq-1…5` with a legend. One tab stop: arrow keys, Home/End, Ctrl+Home/End and
  PageUp/PageDown move (the totals included), Enter selects. `rowLabel` names the row header
  column for screen readers (default: the `row` field in sentence case). `tone` changes the base
  color of the cells and the legend; every tone keeps cell text at 4.5:1 or more, neighbouring
  levels at 1.3:1 and the top level at 3:1 against the surface, in both themes. Without `tone`,
  the levels use a `--ch-seq-base` set on an ancestor, else `--ch-loss`; for another tone's tuned
  ramp, set `data-ch-seq-tone` instead. Columns never get narrower than their name or
  `--ch-heatmap-min-cell`; below that the grid scrolls sideways. Cell ids are `"<row>:<column>"`,
  so names containing `:` can collide (`a:b` + `c` and `a` + `b:c`), and each row and column name
  must be unique. Missing values show a dash.
```

6. Replace the 0.3 building-blocks paragraph (its last lines):

```md
optional stem; `clearance` lifts it over labels it would cover). `Axis` takes an `extent` to label
only part of a padded linear scale. Callouts live in the HTML overlay:
they appear after mount and are hidden from screen readers, so put the same facts in the title,
description or data.
```

with

```md
optional stem; `clearance` lifts it over labels it would cover). `Axis` takes an `extent` to label
only part of a padded linear scale. Callouts live in the HTML overlay: they appear after mount,
are hidden from screen readers (put the same facts in the title, description or data), and never
get wider than the chart, wrapping instead.
```

7. Replace the end of the 0.5 building-blocks paragraph:

```md
<Chart x>`. `Legend` draws `shape="line"` swatches (`dashed` for forecasts) and sequential
`level` swatches; `heatmapLevel(value, breaks)` gives the level a Heatmap uses for a value.
```

with

```md
<Chart x>`. `Legend` draws `shape="line"` swatches (`dashed` for forecasts, and `marker: 'dot'`
or `'ring'` for the series' points), `shape="band"` swatches for a `Band`'s soft fill, and
sequential `level` swatches; `heatmapLevel(value, breaks)` gives the level a Heatmap uses for a
value.
```

8. Replace the first paragraph of "## Time scales" (rewrapped into two):

```md
string. The domain is inferred and rounded out to tick boundaries, a single date is padded by a
day on each side, and an explicit `domain` is kept as given unless you also set `nice: true`.
Dates outside an explicit domain are skipped, like invalid ones: not drawn, not reachable by
pointer or keyboard, with one warning per chart.
Ticks snap to calendar units from seconds to decades and are labelled multi-scale ("Jan 2026",
"Feb", …, "2027"), or with a date format: `'day'`, `'month'`, `'quarter'`, `'year'` or any
`Intl.DateTimeFormatOptions`, in the `ChartsProvider` locale.
`zone` is `'utc'` by default, which renders the same on the server and the client; `'local'`
uses the viewer's zone and can differ between them, so prefer `'utc'` for server rendering.
`'utc'` is only stable if the dates are: a date-time string without a zone
(`'2026-01-01T10:00'`) parses as the runtime's local time (ECMAScript `Date.parse`), so pass
date-only strings (`'2026-01-01'`), strings ending in `Z` or an offset, `Date`s or epoch ms.
`Line`, `Band`, `Area`, `Region`, `Target` (`x` as a date), `Grid`, `Axis` and `NearestPointer`
work on time scales; `Bars` and `ColumnHighlight` need a band scale and warn instead.
```

with

```md
string. The domain is inferred and rounded out to tick boundaries, a single date is padded by a
day on each side, and an explicit `domain` is kept as given unless you also set `nice: true` (a
domain with a value that isn't a date is ignored, with a warning). Dates outside an explicit
domain are skipped, like invalid ones: not drawn, not reachable by pointer or keyboard, with one
warning per chart. Ticks snap to calendar units from seconds to decades and are labelled
multi-scale ("Jan 2026", "Feb", …, "2027"), or with a date format: `'day'`, `'month'`,
`'quarter'`, `'year'` or any `Intl.DateTimeFormatOptions`, in the `ChartsProvider` locale. A tick
whose label repeats the one before it (a coarse format on fine ticks) is dropped.

`zone` is `'utc'` by default, which renders the same on the server and the client; `'local'`
uses the viewer's zone and can differ between them, so prefer `'utc'` for server rendering.
`'utc'` is only stable if the dates are: a date-time string without a zone (`'2026-01-01T10:00'`)
parses as the runtime's local time (ECMAScript `Date.parse`), so pass date-only strings
(`'2026-01-01'`), strings ending in `Z` or an offset, `Date`s or epoch ms. `Line`, `Band`,
`Area`, `Region`, `Target` (`x` as a date), `Grid`, `Axis` and `NearestPointer` work on time
scales; `Bars` and `ColumnHighlight` need a band scale and warn instead.
```

9. Replace the end of the "## Formatting" paragraph:

```md
numbers, percent and pts drop their decimals ("0%", not "0.0%"). `axis` and `axisFormat` mean the
chart's only axis; `LineChart` has two, so it uses `xAxis` / `yAxis`.
```

with

```md
numbers, percent and pts drop their decimals ("0%", not "0.0%"). `axis` and `axisFormat` mean the
chart's only axis; `LineChart` has two, so it uses `xAxis` / `yAxis`. A category axis (BarChart's
`axisFormat`) takes only a function of the category: a preset or date format there is ignored,
with a warning.
```

10. Replace the "## Server Components" paragraph (rewrapped), followed by a new "## Accessibility" section:

```md
Chart components are client components: the main entry `tally-charts` starts with `'use client'`,
so you can render `<Chart>` from a Server Component file. In server code, import from
`tally-charts/core`, which has no React and is server-safe: the formatters (`fmt`,
`createFormatter`, `createFormatters`), `thresholds`, `heatmapLevel`, `toNumber`, `toTime` and
the shared types. Function props
(`fill`, `tone`, function `format`, `tooltip`) can't cross the server/client boundary, so pass
them from a client component.
```

with

```md
Chart components are client components: the main entry `tally-charts` starts with `'use client'`,
so you can render `<Chart>` from a Server Component file. In server code, import from
`tally-charts/core`, which has no React and is server-safe: the formatters (`fmt`,
`createFormatter`, `createFormatters`), `thresholds`, `heatmapLevel`, `toNumber`, `toTime` and the
shared types. Function props (`fill`, `tone`, function `format`, `tooltip`) can't cross the
server/client boundary, so pass them from a client component.

## Accessibility

Every chart is a `figure` named by `title` and described by `description`, with a hidden data
table. Its plot is one tab stop (`role="application"`, role description "chart"): focus shows
the first point and its tooltip, ←/→ (and ↑/↓) move, Home and End jump, Enter selects with
`onSelect`, Escape clears, and each point is announced as "{series}, {n} of {total}, {label}".
`keyboardHint` translates the instructions read on focus; `keyboardHint=""` turns them off. A
`<Chart>` whose marks register no points is not a tab stop. Escape also closes a hover tooltip,
and the pointer can rest on it. Text keeps 4.5:1 and marks 3:1 in both themes, forced-colors
(high-contrast) mode keeps marks and focus rings visible, and at 320px nothing overlaps: bridge
totals thin out, row labels are cut with an ellipsis, ComparisonBars stacks and Heatmap scrolls.
`docs/a11y.md` in the repository has the keyboard model, what screen readers hear per chart, the
decorative elements and a manual checklist.
```

11. Replace the "Additions:" paragraph at the end of "## Changes in 0.6":

```md
Additions: time scales, `ChartPoint<D>` in callbacks, a function `tooltip` on high-level charts,
`{ preset, digits, signed }` formats, `axisFormat` on `BarChart` and `DotHistogram`, `chartId`
on `Heatmap`, `heatmapLevel`, and readonly arrays everywhere.
```

with

```md
Accessibility changes you may notice (0.6b):

- The chart's focus, keys and `aria-*` moved from the `<figure>` to the plot inside it
  (`[data-ch-part="plot"]`, `role="application"`); tests that focus or send keys to the figure
  should use `getByRole('application')`. The focus ring is on the plot.
- Announcements start with the position: "Jul 6, 37.5%" → "1 of 12, Jul 6, 37.5%", and with the
  series when there are several. StripPlot point labels no longer repeat the series name.
- Data tables head each row with its first cell, read empty values as "no value", and use field
  names in sentence case ("week" → "Week").
- Toned text (row and value labels, bridge notes, waffle group labels, pill values) mixes the
  tone with ink, keyed on `data-ch-tone-text`; the `ch-tone-text` class is gone.
- Light `--ch-warn` is `#be802f` (was `#f1a23b`), `--ch-gain` `#22a363` (`#23a866`) and
  `--ch-neutral` `#8e8e95` (`#a3a3ab`). Hatched and soft-accent marks have a 1px outline.
- The sequential levels have new shares per tone and theme, and the dark top level is the pure
  base with dark text. `data-ch-seq-tone` now also sets `--ch-seq-base`.
- Heatmap column headers hold only the names; the column totals are a row of their own
  (`[data-ch-part="heatmap-total-row"]`), ending with the grand total, so 0.6's
  `heatmap-header-total` part is gone. The grid sits in `[data-ch-part="heatmap-scroll"]`.
- WaffleColumns' default top margin is 44px when it pins the peak pill (8px before), so the pill
  no longer sits on the tallest column.
- An axis keeps only its first label when even its first and last would overlap.

Additions: time scales, `ChartPoint<D>` in callbacks, a function `tooltip` on high-level charts,
`{ preset, digits, signed }` formats, `axisFormat` on `BarChart` and `DotHistogram`, `chartId`
on `Heatmap`, `heatmapLevel`, and readonly arrays everywhere. In 0.6b: `keyboardHint` on every
chart, `rowLabel` on `Heatmap`, `dataTable={{ caption, columns }}` on high-level charts, `layout`
on `ComparisonBars`, `marker` and `shape: 'band'` on `Legend` items, `series` on `ChartPoint`
and `DotItem`, the `--ch-heatmap-min-cell` token, the parts `plot`, `heatmap-total-row`,
`heatmap-scroll`, `meter-min-label`, `range-scale-min` and `range-scale-max`, and the state
attributes `data-ch-tone-text`, `data-ch-peak` and `data-ch-marker`.
```

12. Replace the BarChart bullet (one long line):

```md
- `BarChart`: history `hatch-fade`, last bar `solid`, optional target and value label; `orientation="horizontal"` puts categories on the left.
```

with

```md
- `BarChart`: history `hatch-fade`, last bar `solid`, optional target and value label;
  `orientation="horizontal"` puts categories on the left.
```

13. Replace the RankedBars bullet (one long line):

```md
- `RankedBars`: label, bar on a faint track, value; sorted by size; `layout="stacked"` for drill columns. Bars show magnitudes, so negative "lost" amounts extend right and keep their sign in the text. Selection uses `selectedId` + `onSelect`; ids are the original data index unless you pass `id`.
```

with

```md
- `RankedBars`: label, bar on a faint track, value; sorted by size; `layout="stacked"` for drill
  columns. Bars show magnitudes, so negative "lost" amounts extend right and keep their sign in
  the text. Selection uses `selectedId` + `onSelect`; ids are the original data index unless you
  pass `id`.
```

- [ ] **Step 3: Extend the changeset**

Replace `.changeset/foundation-0-6.md` with:

```md
---
'tally-charts': minor
---

Time scales, the API freeze and accessibility. `<Chart x={{ type: 'time' }}>` and `LineChart`
take dates (`Date`, epoch ms or ISO strings) with calendar ticks from seconds to decades,
multi-scale labels, date formats (`'auto'`, `'day'`, `'month'`, `'quarter'`, `'year'`, Intl
options) and a `'utc'` (default) or `'local'` zone. `Line`, `Band`, `Area`, `Region`, `Target`,
`Grid`, `Axis` and `NearestPointer` work on them. The public API is now recorded in
`api/*.api.md` and checked in CI.

Breaking:
- LineChart `axis` / `axisFormat` → `yAxis` / `yAxisFormat`, plus `xAxisFormat`; `LineRange` →
  `LineBand`.
- `Bars` `tooltip` → `segments`.
- ComparisonBars `overIsBad` → `good: 'up' | 'down'` (default `'down'`), `onPlanText` →
  `onPlanLabel`.
- `useChart()` takes no argument and returns only the public context fields;
  `useRegisterPoints(points)` reads the chart itself.
- Resolved scales use the library's own `LinearScale`, `BandScale`, `PointScale` and `TimeScale`;
  no d3 types in the published `.d.ts`, and d3-scale is no longer a dependency.
- Axis format functions take `AxisValue` (`string | number | Date`).
- `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` are no longer exported.
- `tally-charts/core` exports only formatting, thresholds, `heatmapLevel`, `toNumber`, `toTime`
  and types; the layout helpers, `createWarner` and `isDev` are internal.
- CSS: sub-parts are styled through `data-ch-part`, classes are private, private variables are
  `--_ch-*`, and `data-ch-dir` is `data-ch-direction`.
- Whole percent and pts axis ticks read "0%", not "0.0%".

Added: `ChartPoint<D>` in callbacks, a function `tooltip` on every high-level chart,
`{ preset, digits, signed }` format objects, `axisFormat` on BarChart and DotHistogram, `chartId`
on Heatmap, `heatmapLevel`, readonly array props, and a development warning for charts and
heatmaps without a `title`.

Accessibility (WCAG 2.2 AA): the plot inside each chart's figure is the keyboard widget
(`role="application"`, role description "chart") with an instructions hint (`keyboardHint`);
focus shows the first point; announcements read "{series}, {n} of {total}, {label}"; Escape
closes hover tooltips, which the pointer can rest on. Toned text is mixed with ink (4.5:1),
light warn, gain and neutral are darker (3:1 marks: `#be802f`, `#22a363`, `#8e8e95`), hatched
and soft-accent marks get a 1px outline, and the sequential ramp is tuned per tone and theme
(text 4.5:1, levels 1.3:1 apart, top level 3:1; hot pink at the top of the loss ramp, the pure
base in dark themes). Forced-colors mode keeps marks, levels and focus rings visible. Heatmap
column headers hold only the names, with the totals in their own row, and grid navigation
reaches the totals (Ctrl+Home/End, PageUp/PageDown). At 320px nothing overlaps: Heatmap scrolls
sideways (`--ch-heatmap-min-cell`), ComparisonBars stacks (`layout`), row labels are cut with an
ellipsis, bridge totals thin out and pills wrap. Data tables have row headers, readable headers
and "no value" cells.

Changed in 0.6b: the chart's focus and keys moved from the figure to its plot
(`[data-ch-part="plot"]`); announcements start with the position; data-table headers are field
names in sentence case; the `ch-tone-text` class became the `data-ch-tone-text` attribute; the
`heatmap-header-total` part became the `heatmap-total-row` row; WaffleColumns leaves 44px above
the plot for its peak pill.

Added in 0.6b: `keyboardHint`, Heatmap `rowLabel`, `dataTable={{ caption, columns }}`,
ComparisonBars `layout`, Legend item `marker` and `shape: 'band'`, `series` on `ChartPoint` and
`DotItem`, the `--ch-heatmap-min-cell` token, the parts `plot`, `heatmap-total-row`,
`heatmap-scroll`, `meter-min-label`, `range-scale-min` and `range-scale-max`, and the attributes
`data-ch-tone-text`, `data-ch-peak` and `data-ch-marker`.
```

- [ ] **Step 4: Check the README and the docs**

Run: `pnpm --filter tally-charts exec vitest run src/theme/surface.test.ts && awk 'length > 100 && !/^\|/ && !/^```/ && !/^<(BarChart|ComparisonBars|RankedBars) / {print FILENAME": "FNR}' packages/tally-charts/README.md .changeset/foundation-0-6.md`
Expected: the surface tests PASS (the README table still lists exactly the tokens); `awk` prints at most the README's `Small pieces` line and the two "Changes in 0.6" lines that 0.6a left at 101–103 characters (code spans that can't break), nothing else.

- [ ] **Step 5: Final verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm test:e2e`
Expected: all PASS: 928 unit tests and 195 e2e tests (darwin). Record every size-limit number in your report. Measured while planning:

| Check | Budget | Measured |
|---|---|---|
| `tally-charts/core` | 8 kB | 1.25 kB |
| Chart + Bars + Axis + Target + Tooltip | 15 kB | 11.21 kB |
| BarChart | 15 kB | 12.12 kB |
| ComparisonBars | 15 kB | 11.6 kB |
| RankedBars | 15 kB | 11.17 kB |
| WaterfallChart | 15 kB | 12.91 kB |
| BridgeChart | 15 kB | 13.54 kB |
| DotHistogram | 15 kB | 12.3 kB |
| StripPlot | 15 kB | 12.08 kB |
| WaffleColumns | 15 kB | 10.55 kB |
| LineChart | 13 kB | 12.79 kB |
| Heatmap | 15 kB | 3.99 kB |
| Small UI pieces | 4 kB | 2.79 kB |

Never raise a budget; if one is over, stop and report BLOCKED with the numbers.

Then check spec §1's 0.6b criteria by hand:
- axe: the e2e run above includes zero violations with `wcag22aa` and `best-practice` on every story, light and dark.
- contrast: `theme.test.ts` (tokens, ramps) and `contrast.spec.ts` (rendered text) pass.
- 320px: `reflow.spec.ts` passes for every story.
- `grep -rlE "from ['\"]d3-" packages/tally-charts/dist --include='*.d.ts'` prints nothing.
- the linux baselines from Task 16 are committed (`git status` clean after this commit).

- [ ] **Step 6: Commit**

```bash
pnpm format
git add docs/a11y.md packages/tally-charts/README.md .changeset/foundation-0-6.md
git commit -m "docs: accessibility guide, README and changeset for 0.6b

Co-Authored-By: <your own model trailer>"
```

---

---

## After the plan

0.6 is complete once this branch is reviewed and merged: spec §1's success criteria all have a gate in CI. Still open for 1.0 (from the 0.6a review and this plan), none of them breaking:

- Tests: band scales with a reversed range and padding; `niceTimeDomain` in `'local'` and with a null domain; tooltip `true`/`false` per chart; `useRegisterPoints` outside a chart throws; a selected part is rendered.
- Edge cases: an invalid date in the middle of a series (`Line` breaks, `LineChart` joins); an unbounded tick count; a reversed time domain gives no ticks; an inline time `x` object re-sorts every render; `Region` outside the domain and its warning text; `Target` with a `TimeInput` on a linear scale; `unwrapPoint` hands over the wrapper row when the user's datum is `null`.
- Expose `createDateFormatter` from `tally-charts/core` (additive).
- API Extractor bundles TypeScript 5.9 against the TypeScript 6 source; a stray `import "d3-time"` in `dist/thresholds-*.d.ts`; the vacuous `ae-forgotten-export` assertion; `api:check` reads whatever `dist` is on disk.
- Accessibility: run the VoiceOver script of `docs/a11y.md`, and the same steps with NVDA and JAWS, before 1.0; check forced colors on Windows with a real high-contrast theme.
