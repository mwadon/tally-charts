# ScatterChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ScatterChart` (two value axes, optional bubble size, per-item tone, a y target) to `tally-charts` as an additive 1.4.0 change, with stories, e2e gates and a docs page.

**Architecture:** A high-level chart in `src/react/charts/ScatterChart.tsx` on `<Chart>` with two linear scales, built like `StripPlot.tsx` (read it first: wrapped rows, `userCallbacks`, `tooltipContent`, `withTableOptions`, `NearestPointer`). One internal mark draws the bubbles and the active ring and registers the points; the target line is the `Target` mark, its label is drawn by the chart outside the plot as `StackedBarChart.tsx` does it. No new core module and no change to an existing mark.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-19-tally-charts-1.4-scatter-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim; where a prop exists on `StripPlot` or `LineChart` with the same meaning, copy that prop's TSDoc).

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task. The untracked `cha.png` in the repo root is not yours: leave it. Do not leave timers, monitors, servers or background processes running after you reply.
- Additive only: `api:update` may add `ScatterChart`, `ScatterChartProps` and the `ChartMessages` keys `headerX`, `headerY`, `headerSize`, nothing else. `Dots`, `Target`, `NearestPointer`, `Grid`, `Axis`, `StripPlot`, `StackedBarChart` keep their public behaviour (their tests pass unedited).
- No new user-visible English strings in `src/react/` outside `react/messages.ts`: the three fallbacks are `HEADER_X = 'X'`, `HEADER_Y = 'Y'`, `HEADER_SIZE = 'Size'`, read as `messages.headerX ?? HEADER_X` etc.; the name column uses the existing `messages.headerName ?? HEADER_NAME`.
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals. Dev warnings must strip in production (`check:dev-strip`): no destructuring inside `if (DEV && …)`.
- Defaults: `tone` 'accent', `radius` 5, `maxRadius` 18, minimum drawn radius 3, `grid` true, `xAxis` and `yAxis` 'all', `dataTable` true, `tooltip` true, height 280, margins `{ top: 24, right: 16, bottom: 32, left: 44 }`; top 32 when `yLabel` is drawn, bottom 48 when `xLabel` is drawn, right grows by the target label's estimated width + 8. A user `margin` merges over these.
- Point id: `id` accessor or the data index (`resolveIds`). React keys use the data index.
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `ScatterChart` entry ≤ 15 KB gzip; every other entry stays within its limit. If an entry goes over after honest work, do not contort the code: report the measured number.
- Hydration tests render the server markup before installing the `console.error` spy.
- Builds and e2e runs share `dist` and ports 6007 / 3100: never run two at once.

Shared test data ("jobs", 16 rows: `name`, `estimate` in dollars, `margin` in percent, `hours`), in this order:

| name | estimate | margin | hours |
| --- | --- | --- | --- |
| Alder Court | 8000 | 44 | 40 |
| Birch Lane | 12000 | 38 | 58 |
| Cedar Row | 15000 | 52 | 40 |
| Dune House | 22000 | 41 | 103 |
| Elm Terrace | 26000 | 35 | 79 |
| Fern Hill | 34000 | 46 | 103 |
| Grove Flats | 38000 | 33 | 160 |
| Hazel Yard | 48000 | 39 | 160 |
| Ivy Works | 60000 | 36 | 231 |
| Juniper Mill | 88000 | 34 | 520 |
| Kestrel Barn | 18000 | 29 | 79 |
| Larch Depot | 30000 | 24 | 130 |
| Maple Arcade | 44000 | 18 | 231 |
| North Quay | 55000 | 27 | 271 |
| Orchard Mews | 74000 | 30 | 361 |
| Harbor Lofts | 68000 | 12 | 410 |

Props used with it: `x="estimate" y="margin" size="hours" label="name" xLabel="Estimate" yLabel="Margin" sizeLabel="Hours" xFormat="currency-compact" yFormat={(v) => `${v}%`} sizeFormat={(v) => `${v} h`} tone={(j) => (j.margin < 32 ? 'loss' : 'accent')} target={{ value: 32, label: 'target 32%' }}`. Geometry tests set `width`, `xDomain={[0, 100000]}` and `yDomain={[0, 60]}` and compute expected positions from the plot size.

## Review Focus

1. **Rows that cannot be drawn**: a null / NaN / string x or y, a missing or negative size with `size` set, a point outside an explicit domain. Each is skipped without a `NaN` attribute, is not a point, warns as the spec says (no warning for off-domain), and still has its row in the data table with empty cells for missing values.
2. **Degenerate sizes**: every size zero, one row only, all rows with the same x and y, a largest size of zero next to missing ones: no division by zero, no `NaN` radius, 3 px minimum.
3. **Overlap**: a small bubble at the same position as a large one is drawn after it and is the one the pointer picks when the pointer is nearer its centre; keyboard order is by x then y whatever the data order.
4. **Target edge cases**: a target outside an explicit y domain draws no line and no label and does not grow the margin; the default y domain reaches a target above every point; `target` as a bare number has no label.
5. **A 60 px wide chart and long names**: nothing throws, no negative width or `NaN`; a long `xLabel` or target label does not push text outside the SVG at 320 px (the reflow gate).
6. **Stable registration**: re-rendering with the same props registers the same points (no render loop), with `tone` and formats given as inline functions.

Each is pinned by a test in the task that owns the code (Tasks 1–2; item 5's reflow part in Task 4).

---

### Task 1: ScatterChart rendering

**Files:**
- Create: `packages/tally-charts/src/react/charts/ScatterChart.tsx`, `ScatterChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` and the tests that enumerate parts or selectors (`theme/surface.test.ts`, `theme/theme.test.ts`)

**Interfaces:**
- Consumes: `Chart`, `Grid`, `Axis`, `Target`, `resolveAccessor`, `resolveIds`, `toNumber`, `niceDomain` / `inferLinearDomain`, `estimateWidth` (`core/ticks`), `toneVar`; how `StackedBarChart.tsx` places the target label in the right margin and grows the margin for it.
- Produces: `export type ScatterChartProps<D>` and `export function ScatterChart<D>(props)` exactly as spec §2. This task renders axes, grid, target, axis names and bubbles. Points, pointer, tooltip, active state, data table and the `ChartMessages` keys are Task 2; accept those props in the type now.

Decisions the spec leaves to the plan:
- Rows: one internal row per data row `{ datum, index, rowId, name, x, y, size }` (numbers through `toNumber`), wrapped so callbacks unwrap to the user's datum (Task 2). "Drawn" as spec §3.
- Domains: default x from the drawn rows' x, default y from their y plus the target value, both with zero and `niceDomain` for the axis tick count (follow how `StackedBarChart` computes its value domain with the target); `xDomain` / `yDomain` are passed as given. A row outside an explicit domain is not drawn.
- Radius: with `size`, `largest` = the largest size among rows whose x, y and size are valid; `r = largest > 0 ? max(3, maxRadius × √(size / largest)) : 3`. Without `size`, `r = max(0, radius)`.
- Markup: `<g data-ch-part="bubbles">` with one `<circle data-ch-part="bubble" data-ch-tone>` per drawn row, in descending radius order (ties in data order); `cx`/`cy` from the scales. Fill `color-mix(in srgb, var(--ch-<tone>) 22%, transparent)`, stroke the tone, 1.5 px; set the tone through the same custom-property mechanism `Dots` uses so `theme.css` can style states.
- Target: `<Target y={value} />` rendered before the bubbles; label `<text data-ch-part="target-label">` in the right margin centred on the line as in `StackedBarChart`; only when the value is inside the y domain.
- Axis names: `<text data-ch-part="axis-title">`: `yLabel` at `x = -margin.left`, baseline 14 px above the plot top, start-anchored; `xLabel` at `x = innerWidth`, baseline 40 px below the plot bottom, end-anchored. Not drawn when the matching axis is `'none'`.
- `theme.css`: rules for `bubble` (stroke width, the `accent-soft` inked outline by joining the existing selector list, the entry animation `dot` has with its reduced-motion handling), `bubbles`, `axis-title` (join the selector list of the axis label text style) and forced-colors counterparts following what the file does for `dot`; only `--ch-*` tokens that already exist. Prefer adding selectors to existing rules over copying declarations.
- Dev warnings through a memoized `createWarner()`: `scatter-value` ("ScatterChart skipped a row with a missing or non-numeric x or y."), `scatter-size` ("ScatterChart skipped a row with a missing, non-numeric or negative size."), each once.

- [ ] **Step 1: Write failing tests** (copy render helpers and the fixed-size setup from `StripPlot.test.tsx` / `StackedBarChart.test.tsx`; data: jobs):
  - 16 `bubble` circles; Harbor Lofts sits at x of 68 % of the plot width and y of 12/60 from the bottom on the fixed domains; tones: 6 `loss`, 10 `accent`; a constant `tone="warn"` gives 16 `warn`; default tone `accent`
  - radius: Juniper Mill (520) has r = 18; Harbor Lofts r = 18 × √(410/520) within 0.01; `maxRadius={10}` scales both; without `size` every r = 5 and `radius={3}` gives 3
  - draw order: circles are in descending r; a bubble with a tiny size (hours 1) has r = 3 and is last
  - Review Focus 1: rows with `estimate: null`, `margin: 'n/a'`, `hours: -5`, `hours: undefined` are not drawn, no circle attribute is `NaN`, `scatter-value` and `scatter-size` each warn once; a row at `estimate: 150000` with `xDomain={[0, 100000]}` is not drawn and does not warn
  - Review Focus 2: all hours 0 → every r = 3; one row → one circle, no throw; `hours` valid on one row only with value 0 → r = 3
  - default domains: without `xDomain`/`yDomain` the x axis starts at 0 and reaches at least 88000, y starts at 0 and reaches at least 52; with `target={80}` and no `yDomain` the y domain reaches 80
  - target: one `target` line at the y of 32 and a `target-label` "target 32%" right of the plot; the plot is narrower than without the label; `target={32}` draws the line and no label; Review Focus 4: `target={{ value: 90, label: 'x' }}` with `yDomain={[0, 60]}` draws neither and the plot width equals the no-target case
  - axis names: `axis-title` texts "Margin" (above the plot, at the left edge) and "Estimate" (below the tick labels, at the right edge); plot is shorter than without them; `yAxis="none"` removes "Margin", `xAxis="none"` removes "Estimate"
  - grid and axes present by default; `grid={false}`, `xAxis="none"`, `yAxis="none"` remove them; axis labels use `xFormat` / `yFormat` unless `xAxisFormat` / `yAxisFormat` is given
  - Review Focus 5: width 60 → no `NaN` and no negative `r`, `width` or `height` attribute anywhere
  - empty `data` shows the `empty` content
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/ScatterChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass (including theme tests); `pnpm lint && pnpm typecheck` → clean.

### Task 2: Points, pointer, tooltip, active state, data table, SSR

**Files:**
- Modify: `ScatterChart.tsx`, `ScatterChart.test.tsx`, `theme.css` (+ theme tests) for `bubble-ring` and the active / dimmed states
- Modify: `packages/tally-charts/src/react/messages.ts` (+ its tests): `headerX`, `headerY`, `headerSize` as the constraint above says, following how `headerName` is declared, defaulted and tested
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixture `JobMargins`: jobs with the props above; import the component from its source file until Task 3 exports it), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `CrewHours` cases)

**Interfaces:**
- Consumes: Task 1's component; `useRegisterPoints`, `NearestPointer`, `Tooltip`, `tooltipContent`, `userCallbacks`, `withTableOptions`, `headerOf`.
- Produces: internal marks only; `ChartMessages` gains the three keys.

Decisions:
- Measure names: `xName = xLabel ?? headerOf(x, messages.headerX ?? HEADER_X)`, likewise y and size.
- Points: one per drawn row, registered in ascending x, then ascending y, then data order: `id` = row id, `datum` = the wrapped row, `x` = cx, `y` = cy − r, `hitX`/`hitY` = the centre, `label` = `[name, `${xName} ${x text}`, `${yName} ${y text}`, `${sizeName} ${size text}`]` without the missing parts, joined with ", "; `segments` = `[{ value: name }, { label: xName, value: x text }, { label: yName, value: y text, tone }, { label: sizeName, value: size text }]` without the missing parts. The points array is memoized on the values it is built from (Review Focus 6).
- Pointer: `<NearestPointer radius={Math.max(24, (size ? maxRadius : radius) + 6)} />`.
- Active state: the active bubble gets `data-ch-active="true"` (solid tone fill, 2 px surface stroke) and a `<circle data-ch-part="bubble-ring">` at r + 3 in the tone, drawn last; with `ctx.dimInactive` and an active id, the others get `data-ch-dimmed="true"`. Style both in `theme.css` like `dot` / `dot-ring` (join selector lists where the declarations are the same), with forced-colors counterparts.
- Data table: columns name (only with `label`; header `headerOf(label, messages.headerName ?? HEADER_NAME)`), x, y and, with `size`, size, headed by the measure names; one row per data row in data order; a non-finite value gives an empty cell.
- Tooltip: `{tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}`; `children` render last.

- [ ] **Step 1: Write failing tests** (data: jobs):
  - points: keyboard focus then ArrowRight walks Alder Court (8000), Birch Lane (12000), Cedar Row (15000), Kestrel Barn (18000); End lands on Juniper Mill; exact live-region text for the first: "1 of 16, Alder Court, Estimate $8k, Margin 44%, Hours 40 h" (follow the position prefix form the other charts' tests assert, and assert the exact string)
  - without `label` and `size`: "1 of 16, Estimate $8k, Margin 44%"; with function accessors and no `xLabel`/`yLabel`: "X $8k, Y 44%"; `messages={{ headerX: 'Oś X' }}` through `ChartsProvider` replaces the fallback; a string accessor `x="estimate"` without `xLabel` reads "Estimate"
  - hovering at Harbor Lofts' centre shows a tooltip with "Harbor Lofts", "Estimate", "$68k", "Margin", "12%", "Hours", "410 h"; `tooltip={false}` renders none; a function tooltip receives the user's row as `point.datum`
  - `onSelect` on click receives the row id and `datum` equal to the user's Harbor Lofts row; `id="name"` makes the id "Harbor Lofts"
  - active state: with `activeId` set to Harbor Lofts' id, that circle has `data-ch-active`, one `bubble-ring` at its centre with r + 3, the other 15 are dimmed; `dimInactive={false}` dims none; no ring without an active point
  - Review Focus 3: two rows at the same x and y with hours 500 and 20: the small circle comes after the large one in the DOM; a pointer at that position activates one of them without error; a pointer 2 px from a small bubble's centre that lies inside a large bubble's disc but farther from its centre activates the small one; shuffled data gives the same keyboard order
  - Review Focus 1 (points): the skipped rows have no point (position total counts drawn rows only) but have table rows, with empty cells for the missing values
  - Review Focus 6: registers the same points array again when re-rendered with the same props and inline `tone` / format functions (model: the test of that name in `StackedBarChart.test.tsx`)
  - data table: headers `Name`, `Estimate`, `Margin`, `Hours`; 16 rows in data order; Harbor Lofts row "$68k", "12%", "410 h"; without `size` three columns; without `label` no name column; `dataTable={{ columns: { Hours: 'Booked hours' } }}` renames; `dataTable={false}` removes it
  - SSR (`ssr.node.test.tsx`): `JobMargins` renders 16 `bubble` circles without a DOM; hydration: no recoverable error, no `console.error`, 16 bubbles before and after
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 3: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `ScatterChart`, `ScatterChartProps`), `src/index.test.ts`, `.size-limit.js` (entry `ScatterChart`, limit `15 KB`, after `StackedAreaChart`), `test/fixtures.tsx` (`JobMargins` imports like the other fixtures), the `check:treeshake` fixture list if it is not derived from `.size-limit.js`
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/scatter-chart.md` (`'tally-charts': minor`; one paragraph for library users: two value axes, `size` as bubble area with `maxRadius` and the 3 px minimum, per-item `tone`, `target` with its label outside the plot, `xLabel`/`yLabel`/`sizeLabel` and the three new `ChartMessages` keys, which rows are skipped; a short usage snippet. Every sentence must be true of the code.)
- `git show fcc1c8a --stat -- packages/tally-charts .changeset` shows how `StackedAreaChart` did these steps.

- [ ] **Step 1:** Add the export to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only `ScatterChart`, `ScatterChartProps` and the three `ChartMessages` members.
- [ ] **Step 4:** All green: `pnpm --filter tally-charts test`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured size of `ScatterChart` and of any entry within 200 B of its limit.

### Task 4: Storybook stories and e2e gates

**Files** (`git show --stat fcc1c8a -- apps/storybook` lists how `StackedAreaChart` did it; mirror it):
- Create: `apps/storybook/stories/ScatterChart.stories.tsx` (title `Charts/ScatterChart`)
- Modify: `apps/storybook/e2e/stories.ts` (story list, and `THEMELESS` for every story without a `theme` parameter), `stories.spec.ts` (keyboard test asserting exact announcements with `toHaveText`: focus → Alder Court, ArrowRight → Birch Lane), `forced-colors.spec.ts` (dedicated test with assertions that can fail: every bubble has a visible outline in a system colour that differs from the canvas, the active ring is visible, target line and labels are visible; reuse that file's `resolve()` / `isRealColor` helpers)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-scatterchart--<name>`): `light`, `dark` (the artboard: jobs with every prop above, a `<Legend>` under the chart with "At or above target" in `accent` and "Under target" in `loss`), `dots` (no `size`, no target, `tone` constant), `plain` (themeless: `x`, `y`, `size` only with function accessors, so the fallback names show), `dense` (60 generated points from a fixed seed, many overlapping, `maxRadius={12}`).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the two dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. If a gate fails and the cause is in `packages/tally-charts/src`, stop and report BLOCKED with the output and diagnosis; do not weaken a gate or change story data to dodge it.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; `git status` shows only new `charts-scatterchart--*.png`. Open the light, dark and dense images and check: translucent bubbles with outlines, six in loss under the dashed target line, "target 32%" in the right margin not touching a bubble or a tick label, "Margin" above the y axis and "Estimate" under the x axis not overlapping tick labels, nothing clipped at any edge.
- [ ] **Step 4:** Linux baselines: the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it.
- [ ] **Step 5:** `pnpm test:e2e` → PASS, and a compare-only docker run.

### Task 5: Docs page

**Files:** as the `StackedAreaChart` page did it (`git show --stat fcc1c8a -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/scatter-chart/{crew-days,job-size-margin,fixed-domains,with-legend}.tsx` (basic dots, rscSafe; the artboard, client because `tone` and formats are functions; explicit domains; with `Legend`), `apps/docs/content/scatter-chart.json` (model on `stacked-area-chart.json`; every behavioural sentence checked against `ScatterChart.tsx`: default domains with zero, size as area with the 3 px minimum, draw order, skipped rows, target label outside the plot, axis names, keyboard order, the tooltip content, the `ChartMessages` fallbacks, what is not built in), `apps/docs/e2e/scatter-chart.spec.ts`
- Modify: `content/navigation.json` (after StripPlot), `blocks/chart-thumbs.tsx` (thumb `scatter`), `content/home.json` (tile; heading "Fifteen charts, one grammar"), tests that count pages, slugs, tiles or symbols, block `height` / `NARROW_CHART_HEIGHTS` where `e2e/lazy-mount.spec.ts` requires it, the i18n / messages docs page if it lists `ChartMessages` keys
- Modify: `docs/a11y.md` (announcement row quoting the Storybook keyboard test's exact string; notes on pointer targets and on tone not being the only carrier), `CLAUDE.md` (counts and pitfalls that changed; a short `scatter-chart` page note like the other chart pages), `PROGRESS.md` (section "ScatterChart 1.4 (2026-11-19)": what shipped, measured sizes, test counts from your own final runs, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else in `apps/docs`.
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`. That docker run also rewrites the linux `/docs/line-chart` baselines: restore them with `git checkout -- <those files>`, then run the docker command in compare mode to confirm all pass. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `docs/a11y.md`, `CLAUDE.md`, `PROGRESS.md`.
