# tally-charts 1.0 Editor Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship everything the glokki editor needs from tally-charts on `main` before `1.0.0-rc.0`, including the second Y axis.

**Architecture:** One breaking change to defaults, then additive props on existing marks and components, one new context for messages, one standalone `Sparkline`, and an optional second linear scale on `Chart`. Marks reach `y2` through one helper that swaps the scale in their context, so their geometry code doesn't fork.

**Tech Stack:** React, TypeScript, vitest, Playwright, Storybook, Next.js docs, changesets, size-limit.

**Spec:** `docs/superpowers/specs/2026-10-31-tally-charts-1.0-editor-additions-design.md`. Read it before each task; it holds the reasoning and the exact behaviour. This plan adds names, files and order.

## Global Constraints

- The name is spelled "glokki". Never write it with an umlaut.
- Size limits stay, with one exception: the `LineChart` limit may rise from 14 kB to at most 14.5 kB if the measurement needs it. If any other limit can't hold, or `LineChart` needs more, stop and ask the maintainer, with the measured number.
- `Chart + Bars + Axis + Target + Tooltip` grows at most 1 kB gzip over 11.48 kB.
- No breaking change to anything public except Task 2.
- `Sparkline` never measures width and uses no effects.
- Work on a branch, `editor-additions`. Commits are made by the orchestrator, not by implementer agents. The repo's pre mode stays on.
- Every change to `packages/tally-charts` has a changeset. Task 2 is `major`, the rest `minor` (Task 1 needs none).
- Library gate, after any task that changes `packages/tally-charts/src`: `pnpm build && pnpm --filter tally-charts api:update && pnpm --filter tally-charts api:check && pnpm size && pnpm --filter tally-charts check:dts && pnpm --filter tally-charts check:treeshake && pnpm --filter tally-charts check:dev-strip`. All exit 0, and the `api/` files go in the same commit.
- Docs gate, after any docs change: `pnpm --filter docs test && pnpm --filter docs check:content`. A new example card follows the height rules in `CLAUDE.md` (`e2e/lazy-mount.spec.ts`).
- New top-level `createContext()` calls carry `/* @__PURE__ */`.

## Review Focus

Each has its test in the owning task.

- `Sparkline` with one value, all nulls, or values outside `domain`: no crash and no `NaN` in the markup; one value still shows its endpoint. (Task 7)
- `y2` with empty `data`, or a `y2` field with no valid numbers: the chart renders its empty state or the other series, with no crash and no `NaN`. (Task 12)
- `Target position` on the first and last category, and on a single-category chart: the rule stays inside the plot. (Task 5)
- `messages` with a template that drops a placeholder, or with `''`: the chart renders that text as given, and `keyboardHint: ''` turns the hint off as the prop does. (Task 3)
- `InlineBar width="100%"` inside a table cell: it fills the cell rather than collapsing to 0. (Task 9)

---

### Task 1: Spelling

**Files:** Modify all 26 files from `git grep -l 'gl[ö]kki'`. `.crew/` isn't tracked and isn't touched. The filenames `glokki.ts` and `glokki-mcp.ts` are already correct.

- [ ] **Step 1:** Create the branch `editor-additions` and replace the old form in every tracked file, keeping each file's encoding.
- [ ] **Step 2:** Verify. Run `git grep 'gl[ö]kki'` (expected: no output), `pnpm lint`, `pnpm --filter docs test` and `pnpm test:scripts` (expected: exit 0).
- [ ] **Step 3:** Commit, with the spec and this plan: `docs: spell glokki without the umlaut`.

### Task 2: Defaults (breaking)

**Files:**
- Modify: `packages/tally-charts/src/react/ui/{InlineBar,Meter,RangeMeter,DotCount}.tsx`
- Modify: `apps/docs/examples/reference/{01-gross-margin-waterfall,03-estimate-vs-actual}.tsx`, `apps/storybook/stories/{GrossMargin,Result,SmallPieces}.stories.tsx`
- Modify: `apps/docs/content/migration-1-0.json`
- Create: `.changeset/small-pieces-solid-defaults.md`
- Test: the existing test next to each component

**Interfaces:** Produces new defaults: `InlineBar` `tone: 'accent'`, `fill: 'solid'`; `Meter` `fill: 'solid'`; `RangeMeter` `tone: 'accent'`, `referenceTone: 'neutral'`; `DotCount` `tone: 'accent'`.

- [ ] **Step 1: Write the failing tests.** `InlineBar` without props renders `data-ch-tone="accent"` and `data-ch-fill="solid"` on `inline-bar-fill`; `Meter` renders `data-ch-fill="solid"` on `meter-fill`; `RangeMeter` and `DotCount` use `--ch-accent`, and `RangeMeter`'s reference uses `--ch-neutral`. Explicit `fill="hatch"` and `tone="loss"` still apply. A new test asserts that no file in `react/ui/` contains `tone = 'loss'`. `RankedBars`' `selectedTone = 'loss'` stays: it colours a bar the user selected, not the chart's resting state.
- [ ] **Step 2:** Run `pnpm test`. Expected: the new tests fail.
- [ ] **Step 3:** Change the defaults and their TSDoc.
- [ ] **Step 4:** Pin the old look. `fill="hatch"` on the `Meter` in reference 01 and `GrossMargin`; `tone="loss" referenceTone="accent"` on `RangeMeter` in reference 03 and `Result`; `tone="loss"` wherever a story relies on pink, and `tone="loss" fill="hatch"` on an `InlineBar` that does.
- [ ] **Step 5:** Write the changeset in the shape of `.changeset/ranked-bars-solid-fill.md`, with before and after for all four components, and add the same entries to the migration page.
- [ ] **Step 6:** Refresh baselines on both platforms with the commands in `CLAUDE.md`, for Storybook and for docs home if it changed. Review the diffs: pinned references must not change.
- [ ] **Step 7:** Run the library gate, the docs gate and `pnpm test:e2e`. Expected: exit 0.
- [ ] **Step 8:** Commit: `feat!: small pieces are never pink by default`.

### Task 3: Messages, provider and interaction strings

**Files:**
- Create: `packages/tally-charts/src/react/messages.ts`, `messages.test.ts`
- Modify: `react/ChartsProvider.tsx`, `react/interaction.ts`, `react/Chart.tsx`, `react/DataTable.tsx`, `react/ui/{Meter,InlineBar,RangeMeter,ZoneMeter,ShareBar}.tsx`, `react/charts/{Heatmap,RunwayChart}.tsx`, `src/index.ts`
- Create: `.changeset/charts-provider-messages.md`

**Interfaces:** Produces:
```ts
export interface ChartMessages {
  noData: string; noValue: string
  keyboardHint: string; keyboardHintSelect: string   // joined with one space
  position: string                                   // '{index} of {total}'
  target: string; targetLabel: string                // 'target {value}', 'Target {value}'
  now: string; total: string
  // Task 4 adds the table header keys
}
export const DEFAULT_MESSAGES: ChartMessages
export function formatMessage(template: string, values: Record<string, string | number>): string
export function useMessages(): ChartMessages                 // internal, not exported from index
// ChartsProviderProps gains: messages?: Partial<ChartMessages>
// announcement(points, point, position = DEFAULT_MESSAGES.position)
```
`ChartMessages` and `DEFAULT_MESSAGES` are exported from the main entry. A nested provider replaces its parent's messages rather than merging, like `locale` today.

- [ ] **Step 1: Write the failing tests.**
  - `formatMessage('{index} z {total}', { index: 3, total: 10 })` gives `'3 z 10'`; `formatMessage('{x}', {})` gives `'{x}'`; a template without placeholders is returned as is.
  - With `messages={{ noData: 'Brak danych' }}`, an empty `Chart`, `Meter value={NaN}`, `InlineBar`, `RangeMeter`, `ZoneMeter`, `ShareBar` and `Heatmap` all use it, and other keys stay English.
  - `position: '{index} z {total}'` reaches the live region text.
  - `keyboardHint`, `empty`, `targetLabel` and `totalLabel` props win over provider messages.
  - `messages={{ keyboardHint: '' }}` removes the hint, as `keyboardHint=""` does, and a `position` without placeholders is spoken as given.
- [ ] **Step 2:** Run `pnpm test`. Expected: the new tests fail.
- [ ] **Step 3:** Implement `messages.ts` and a separate `MessagesContext` in `ChartsProvider.tsx`, with `useMemo` on the `messages` prop. With no prop, `useMessages()` returns `DEFAULT_MESSAGES` itself.
- [ ] **Step 4:** Replace the literals in the files above. Default text must stay byte-identical, so existing tests and the SSR snapshot pass unchanged.
- [ ] **Step 5:** Run `pnpm test`, then the library gate. Record the size change of `LineChart` and `BridgeChart` in `PROGRESS.md`. Apply the rule in Global Constraints if a limit fails.
- [ ] **Step 6:** Commit: `feat: ChartsProvider messages`.

### Task 4: Table headers, the literal guard and i18n docs

**Files:**
- Modify: `react/messages.ts`, `react/charts/*.tsx` (every `header:` and `headerOf(_, '…')`), `core/runway.ts` and its callers (`statusLines` takes its strings as arguments)
- Create: `react/messages-literals.test.ts`
- Create: `apps/docs/examples/hooks-and-providers/polish-messages.tsx` (`rscSafe: true`)
- Modify: `apps/docs/content/hooks-and-providers.json`, `content/formatting.json`, `docs/stability.md`, `SPEC.md`

**Interfaces:** Consumes `ChartMessages`. Produces `header*` keys, one per distinct string: `headerItem`, `headerValue`, `headerCategory`, `headerDate`, `headerPeriod`, `headerGroup`, `headerDetails`, `headerColumn`, `headerChange`, `headerTotal`, `headerPlan`, `headerActual`, `headerRange`, `headerRow`, `headerName`, `headerDetail`, `headerRunsOut`, `headerResets`, `headerProjectedAtReset`, `headerStatus`, plus any the guard finds.

- [ ] **Step 1: Write the guard test.** Using the TypeScript parser, walk `react/**/*.tsx?` outside tests and `messages.ts`. Fail on JSX text with letters, on string literals in `header:` properties and in the second argument of `headerOf`, and on letters inside `aria-*` values and sr-only children. Warnings, keys and part names are allowlisted by shape. It fails today on every remaining literal.
- [ ] **Step 2:** Run it. Expected: FAIL, listing the literals.
- [ ] **Step 3:** Move each one to `DEFAULT_MESSAGES` until the guard passes. Headers from accessors keep using `headerOf`, with the message as the fallback; `dataTable.columns` still wins. A test confirms that a German `headerTotal` reaches the Waterfall table.
- [ ] **Step 4:** Write the docs: a table of all keys on `hooks-and-providers`, the Polish example, and on `formatting` the note that `pts` and `hours` presets keep their suffix unless a custom `format` is used. Note the re-render cost of an inline `messages` object. In `docs/stability.md` and `SPEC.md`, drop "until an i18n hook arrives in 1.x" and say the wording of the English defaults is still non-public.
- [ ] **Step 5:** Run the library gate and the docs gate. Expected: exit 0.
- [ ] **Step 6:** Commit: `feat: translatable table headers and a guard against new literals`.

### Task 5: Target position

**Files:** Modify `react/marks/Target.tsx`, `react/marks/Target.test.tsx`. Create `apps/docs/examples/composition/threshold-between-buckets.tsx`. Modify `apps/docs/content/composition.json`, `apps/storybook/stories/BarChart.stories.tsx`. Create `.changeset/target-category-position.md`.

**Interfaces:** Produces `TargetProps.position?: number` and widens `y?: number | string`. Warning keys: `target-category`, `target-position`.

- [ ] **Step 1: Write the failing tests** on a 10-category band scale, `innerWidth` 500.
  - `<Target x="70–79" position={0.3} />` puts `x1` at 7.3 × step.
  - Default position equals `categoryCenter`.
  - The end of one category equals the start of the next.
  - Position 0 on the first category and 1 on the last stay inside `[0, innerWidth]`, also with one category.
  - Unknown category warns and draws nothing; position 1.5 clamps and warns; `position` on a linear scale warns and is ignored.
  - A band `y` with `y="b"` draws a horizontal rule; a point scale works.
  - Numeric Target on a linear scale gives the same markup as before.
- [ ] **Step 2:** Run the file. Expected: the new tests fail.
- [ ] **Step 3:** Implement. On band and point scales, `pos = clamp(categoryCenter(resolved, key) + (position - 0.5) * categoryStep(resolved), 0, length)`, with both helpers from `core/scale`. Remove `target-scale` for these kinds; it no longer applies to any scale.
- [ ] **Step 4:** Run the tests, add the story and example with a threshold of 73, refresh baselines, and run the library and docs gates.
- [ ] **Step 5:** Commit: `feat: Target on category scales`.

### Task 6: Reversed Y scale

**Files:** Create `react/marks/reversed-y.test.tsx`. Modify `core/scale.test.ts`, `core/scale.ts` (TSDoc on `domain`). Create `apps/docs/examples/composition/reversed-position.tsx`. Modify `apps/docs/content/composition.json`, `apps/storybook/stories/LineChart.stories.tsx`. Create `.changeset/reversed-y-scale.md`.

**Interfaces:** Possibly produces warning key `bars-reversed`. No API change otherwise.

- [ ] **Step 1: Write the tests** with `y={{ domain: [10, 1] }}`.
  - Value 1 is at pixel 0 and 10 at `innerHeight`.
  - `Axis` tick positions and labels match; `Grid` lines are inside the plot.
  - `Line`, `Area`, `Band` and `Target` give finite coordinates in the right places.
  - The pointer picks the nearest point; arrow keys keep data order.
  - For `Bars`: log what a value of 5 draws.
- [ ] **Step 2:** Run. Fix any bug in the mark that owns it; these fixes are in scope.
- [ ] **Step 3:** Decide `Bars` from Step 1. If bars grow sensibly from the edge, pin that with a test and document it. If not, add dev warning `bars-reversed` and say in the docs that reversed scales aren't for bars.
- [ ] **Step 4:** Add TSDoc, the example (ranking 1 to 10 in Search Console style) and the story, refresh baselines, and run the library and docs gates.
- [ ] **Step 5:** Commit: `feat: document and test reversed y scales`.

### Task 7: Sparkline

**Files:**
- Create: `react/ui/Sparkline.tsx`, `react/ui/Sparkline.test.tsx`, `.changeset/sparkline.md`, `apps/docs/examples/small-pieces/sparkline.tsx`
- Modify: `src/index.ts`, `theme/theme.css`, `packages/tally-charts/.size-limit.js`, the treeshake fixtures, `src/ssr.node.test.tsx`, `apps/docs/content/small-pieces.json`, `apps/storybook/stories/SmallPieces.stories.tsx`

**Interfaces:**
```ts
export interface SparklineProps {
  values: readonly (number | null)[]
  label: string
  tone?: Tone          // 'accent'
  area?: boolean       // false
  endpoint?: boolean   // false
  target?: number
  height?: number      // 28
  domain?: readonly [number, number]
  className?: string
}
export function Sparkline(props: SparklineProps): JSX.Element
```

- [ ] **Step 1: Write the failing tests.**
  - Root has `role="img"`, `aria-label` equal to `label`, no `tabindex`, part `sparkline`.
  - SVG has a `viewBox`, `preserveAspectRatio="none"`, and the line has `vector-effect` non-scaling.
  - `endpoint` renders a `sparkline-endpoint` HTML element with `left` and `top` in percent, and **no `circle` exists**.
  - `null` breaks the line into two subpaths.
  - A flat series sits at mid height.
  - One value: no line, endpoint present. All null: name is `<label>: No data`, with the box and no paths. Values outside `domain`: clamped, and no `NaN` in the markup for any of these.
  - `target` draws `sparkline-target`, and an inferred domain includes it.
  - `area` adds `sparkline-area` with no gradient or `id`.
  - `renderToString` equals the client render, and no `useLayoutEffect` or `useEffect` warning appears on the server (SSR test).
- [ ] **Step 2:** Run. Expected: FAIL, the module doesn't exist.
- [ ] **Step 3:** Implement. A `viewBox="0 0 100 100"`, x as `i / (n - 1) * 100`, y mapped to 8–92 so the stroke isn't clipped, and the endpoint's percentages from the same numbers. Reuse `linePath` from core. No hooks besides `useMessages`. CSS in `theme.css`, using the swatch variable and the 18% mix already used for tints, with forced-colors support.
- [ ] **Step 4:** Add the size-limit entry `{ name: 'Sparkline', import: '{ Sparkline }', limit: '3 KB', … }` and its treeshake fixture. Export it, add docs and a story, refresh baselines.
- [ ] **Step 5:** Run `pnpm test`, the library gate and the docs gate (`check:content` must report the new symbol as covered).
- [ ] **Step 6:** Commit: `feat: Sparkline`.

### Task 8: `color`

**Files:** Modify `react/ui/share.ts`, `react/ui/ShareBar.tsx`, `react/ui/Legend.tsx`, `react/marks/Bars.tsx` and their tests, `apps/docs/examples/small-pieces/legend-and-tooltip.tsx`, `apps/docs/content/small-pieces.json`. Create `.changeset/color-prop.md`.

**Interfaces:** Produces `ShareSegment.color?: string`, `SharePart.color?: string`, `LegendItem.color?: string` (ignored when `level` is set, like `tone`), `BarsProps.color?: PerItem<D, string>`. Warning key `bars-color-fill`.

- [ ] **Step 1: Write the failing tests.**
  - `ShareBar` segment with `color="var(--x)"` paints with it in both solid and hatch, and keeps `data-ch-tone`.
  - `shareLayout` returns `color` on the part.
  - `Legend` swatch uses it.
  - `Bars color="#fc0"` with `fill="solid"` sets the bar's `fill`, and works per item.
  - `Bars color` with a hatched fill keeps the tone's pattern and warns once.
  - No `color` gives identical markup to before.
  - An e2e check in `forced-colors: active` confirms that system colours still win.
- [ ] **Step 2:** Run. Expected: the new tests fail.
- [ ] **Step 3:** Implement through `--_ch-swatch-color`, and `paint.fill` for solid `Bars`. TSDoc states that contrast in both themes is the caller's job, and the `Bars` limit.
- [ ] **Step 4:** Add a docs example with traffic sources, and run the library and docs gates.
- [ ] **Step 5:** Commit: `feat: color on ShareBar, Legend and Bars`.

### Task 9: Size of small bars

**Files:** Modify `react/ui/InlineBar.tsx` and its test, `apps/docs/content/small-pieces.json`, `apps/docs/examples/small-pieces/meters.tsx`, `apps/storybook/stories/SmallPieces.stories.tsx`, a spec in `apps/storybook/e2e/`. Create `.changeset/inline-bar-width.md`.

**Interfaces:** Produces `InlineBarProps.width?: number | string` (default 64).

- [ ] **Step 1: Write the failing tests.** `width="100%"` sets that inline style; `width={56}` is unchanged. In a new story with a table, the e2e check asserts that `InlineBar width="100%"` in a 200 px cell is at least 150 px wide. A second e2e check with an override `[data-ch-part="inline-bar"] { height: 4px }`, loaded after the theme, finds 4 px on the bar and its fill, and does the same on `meter-track`, with the target tick still visible.
- [ ] **Step 2:** Run. Expected: the width tests fail, and the height checks may already pass. If the cell test fails because of `display: inline-block`, fix that in `theme.css` without changing the default width.
- [ ] **Step 3:** Widen the type. Write the height recipe on the `small-pieces` page: a class plus the attribute, or a later stylesheet, because the theme uses no `@layer`.
- [ ] **Step 4:** Run the library gate, the docs gate and `pnpm test:e2e`.
- [ ] **Step 5:** Commit: `feat: InlineBar percent width and a height recipe`.

### Task 10: Peak label

**Files:** Modify `react/marks/ValueLabel.tsx`, `react/charts/BarChart.tsx`, their tests, `theme/theme.css`, `apps/docs/content/bar-chart.json`, one `apps/docs/examples/bar-chart/` example, `apps/storybook/stories/BarChart.stories.tsx`. Create `.changeset/peak-value-label.md`.

**Interfaces:** Produces `ValueLabelProps.at` gains `'max'`; `ValueLabelProps.variant?: 'text' | 'pill'`; `BarChart.valueLabel` gains `'max'`; `BarChart.valueLabelVariant?: 'text' | 'pill'`. Part `value-label-pill` is the `rect`; the text keeps `value-label`.

- [ ] **Step 1: Write the failing tests.**
  - `at="max"` labels only the highest finite bar, ignoring `NaN`.
  - On a tie, it's the first.
  - All invalid: no label, no crash. All negative: the value closest to zero.
  - `variant="pill"` renders `rect` and `text`, with `rect` width from `estimateWidth`, in `renderToString` too.
  - On the first and last bars, the `rect` stays within `[-margin.left, innerWidth + margin.right]`.
  - On the tallest bar it goes above the plot with no vertical clamp, and fits in `BarChart`'s 24 px top margin at the default offset.
  - `variant` default leaves the markup unchanged.
- [ ] **Step 2:** Run. Expected: the new tests fail.
- [ ] **Step 3:** Implement with `PILL_HEIGHT = 18`. TSDoc: a `Chart` with its default 20 px top margin needs `margin.top` of at least 24 for a pill on the tallest bar. Style it with `--ch-surface`, `--ch-ink` and the radius token. No new public token.
- [ ] **Step 4:** Add docs and a story, refresh baselines, run the library and docs gates.
- [ ] **Step 5:** Commit: `feat: peak value label and pill variant`.

### Task 11: `LineChart interactive`

**Files:** Modify `react/charts/LineChart.tsx` and its test. Create `.changeset/line-chart-interactive.md`.

**Interfaces:** Produces `LineChart.interactive?: boolean` (default `true`).

- [ ] **Step 1: Write the failing tests.** With `interactive={false}`: no `role="application"`, no `tabindex="0"` on the chart, no hit areas or `NearestPointer`, no tooltip even if `tooltip` is set, and the keyboard hint is gone. The data table and the title remain. Default markup is unchanged.
- [ ] **Step 2:** Run. Expected: the new tests fail.
- [ ] **Step 3:** Skip the internal component that calls `useRegisterPoints` and `NearestPointer` (`LineChart.tsx:221-225`), and the tooltip. `Chart` derives its interactivity from having points.
- [ ] **Step 4:** Run the library and docs gates.
- [ ] **Step 5:** Commit: `feat: LineChart interactive prop`.

### Task 12: Second Y axis, scale and marks

**Files:**
- Modify: `core/scale.ts`, `react/Chart.tsx`, `react/context.ts`, `react/marks/{Line,Area,Band,Bars,ValueLabel,Target,Axis}.tsx`, `react/marks/series.ts`, `theme/theme.css`
- Create: `react/marks/value-scale.ts`, `react/marks/y2.test.tsx`, `.changeset/second-y-axis.md`

**Interfaces:**
```ts
// core/scale.ts: createScale's axis parameter gains 'y2'; its range is the same as 'y'.
// ChartProps gains: y2?: ScaleSpec<D>
// ChartContextValue gains: y2?: ResolvedScale; InternalChartContext gains: y2?: FieldScale
export type ValueScale = 'y' | 'y2'
// react/marks/value-scale.ts, internal:
// Same object for 'y', a copy with y swapped for 'y2'; warns y2-missing and returns undefined when absent.
export function valueContext(ctx: InternalChartContext, scale: ValueScale | undefined): InternalChartContext | undefined
// Props gain scale?: ValueScale on Line, Area, Band, Bars, ValueLabel, Target, Axis. Axis also gains tone?: Tone.
```
Warning keys: `y2-scale`, `y2-orientation`, `y2-missing`, `y2-axis-side`.

- [ ] **Step 1: Write the failing tests.**
  - `y2={{ field: 'u' }}` with values to 1000 and `y` to 10: `Line scale="y2"` reaches the top at 1000, and `Bars` on `y` at 10.
  - `Bars scale="y2"`, `Area`, `Band`, `ValueLabel`, `Target y={…} scale="y2"` use the second scale.
  - `Axis side="right" scale="y2"` labels from it; `Axis side="top" scale="y2"` warns.
  - `Axis tone="accent"` tints labels through the existing variable.
  - `scale="y2"` with no `y2` warns once and draws nothing.
  - A `y2` of band type warns `y2-scale`; a band `y` warns `y2-orientation`; in both, `useChart().y2` is `undefined`.
  - Empty `data` with `y2`: the empty state and no warnings from `y2`. A `y2` field with no valid numbers: `y` marks draw, there's no `NaN` in the markup.
  - Reversed `y2` domain works.
  - A ring on `Line scale="y2"` appears with dots and `Bars id` equal to the category; `dots="none"` has none.
  - Without `y2`, `createScale` is called twice per render, as today, and markup is identical.
- [ ] **Step 2:** Run. Expected: the new tests fail.
- [ ] **Step 3:** Add the scale to `Chart`, in a `useMemo` skipped when `y2` is undefined, and to the context and `useChart`.
- [ ] **Step 4:** Add `valueContext` and use it in each mark. Marks with hooks (`Bars`, `Line`, `Band`, `Area`) keep hook order: guard in a thin outer component, or resolve the context before any early return.
- [ ] **Step 5:** Run `pnpm test`, then the library gate. Check the 1 kB budget in Global Constraints and record the measurement in `PROGRESS.md`.
- [ ] **Step 6:** Commit: `feat: second y axis`.

### Task 13: Second Y axis, docs and reference story

**Files:** Create `apps/storybook/stories/TrafficDualAxis.stories.tsx`, `apps/docs/examples/composition/dual-axis-traffic.tsx`. Modify `apps/docs/content/composition.json`.

**Interfaces:** Consumes `y2`, `scale`, `Axis tone` (Task 12), `Bars color` (Task 8), `ValueLabel variant="pill"` and `at="max"` (Task 10).

- [ ] **Step 1:** Write the story that recreates the editor's `TrafficChart` (`~/projects/editor/app/(dashboard)/analytics/traffic-chart.tsx`): hatched bars on `y`, one solid gold peak with `color`, a pill on the peak, a line on `y2` with `dots="none"`, a permanent peak dot from a second one-row `Line`, a left axis and a tinted right axis, a legend, and a tooltip with both series.
- [ ] **Step 2:** Add an e2e test. Arrow keys announce both series; the data table has both columns; axe finds no violations; light and dark baselines exist on both platforms.
- [ ] **Step 3:** Write the docs: the same chart as an example with `dataTable.columns`, how to pick matching tick counts, and when not to use two axes (two scales invite false correlations).
- [ ] **Step 4:** Run the docs gate, `pnpm test:e2e` and `pnpm --filter docs test:e2e`. Expected: exit 0.
- [ ] **Step 5:** Commit: `docs: dual-axis composition`.

### Task 14: Final verification and records

**Files:** Modify `SPEC.md`, `PROGRESS.md`, and `CLAUDE.md` if a command or rule changed.

- [ ] **Step 1:** Add this work to `SPEC.md` as new numbered items, and name these features in T39's checklist in `PROGRESS.md`, for the check in the editor.
- [ ] **Step 2:** Run every gate in the spec's "Done means", with `REQUIRE_DIST=1 pnpm test`. Check that ports 3100 and 6007 are free first. Expected: all exit 0.
- [ ] **Step 3:** Run `git grep 'gl[ö]kki'`. Expected: no output.
- [ ] **Step 4:** Record the final `pnpm size` table in `PROGRESS.md`, and say so explicitly if the `LineChart` limit was raised, and to what.
- [ ] **Step 5:** Commit: `progress: editor additions complete`. Merging to `main` and pushing wait for the maintainer.
