# Treemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Treemap` (tiles whose area is a value and whose shade is a second measure in bins, optionally in one level of groups) to `tally-charts` as an additive 1.8.0 change, with stories, e2e gates and a docs page.

**Architecture:** A pure module `src/core/treemap.ts` turns values and a box into rectangles (squarify, the gap rule, the arrow-key neighbour); it knows nothing of React and is not exported from the package. `src/react/charts/Treemap.tsx` is a standalone HTML chart like `Heatmap.tsx` (it does not use `<Chart>`): it measures its width with `useWidth`, positions tiles absolutely, and reuses `Heatmap`'s sequential levels, bins and `Legend`. The tile box is a `listbox` of `option` tiles with roving `tabindex`; the tooltip is the library's HTML pill.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-24-tally-charts-1.8-treemap-design.md` (read it first; §3 is the exact props type, copy it verbatim; where a prop exists on `Heatmap` with the same meaning, copy that prop's TSDoc). The artboards are `project/Treemap.dc.html` and `project/TreemapDark.dc.html` of the canvas named in the spec; where they differ from the spec, the spec wins. `Heatmap.tsx` is the model for the component (state, controlled `activeId`, roving focus, Escape, levels, legend, empty state); `GanttChart` (commit `ea81528`, `git show --stat ea81528`) is the model for every non-component step: exports, size entry, changeset, stories, e2e lists, docs page.

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task. The untracked `cha.png` in the repo root is not yours: leave it. Do not leave timers, monitors, servers or background processes running after you reply.
- Additive only: `api:update` may add `Treemap`, `TreemapProps`, `TreemapTile` and the new `ChartMessages` keys, nothing else. Existing charts keep their public behaviour (their tests pass unedited, except tests that enumerate parts, selectors, exports, pages or message keys).
- No new user-visible English strings in `src/react/` outside `react/messages.ts`. New keys and fallbacks (constant names follow the file's style), read as `messages.treemapName ?? TREEMAP_NAME`: `treemapName` "Treemap", `headerShade` "Shade". Existing keys to reuse: `ofTotal` ("of total"), `headerValue`, `noData`, `binAll` / `binUnder` / `binRange` / `binOver`. If a key with the same English text already exists, reuse it instead of adding one. The spec's `shareOfTotal` key is not needed (the pill says "22.4% of total").
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals. Dev warnings must strip in production (`check:dev-strip`): no destructuring inside `if (DEV && …)`.
- Defaults: `tone` unset (CSS falls back to a `--ch-seq-base` on an ancestor, else accent), `height` 480, `initialWidth` 640, `legend` true, `tooltip` true, `format` and `shadeFormat` 'number'.
- Sizes (px): group header 24 high; 8 between groups; 2 between tiles; tile radius 3; tile padding 6 × 8; header text 13 (name weight 600, total muted, 8 apart); tile name 13 / weight 500; tile second line 12; a group box lower than 48 has no header.
- Text thresholds: the name when the tile is ≥ 64 wide and ≥ 28 high; the "value · share" line when ≥ 96 wide and ≥ 48 high (separator U+00B7 with spaces).
- Share text: `Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })` with the locale the chart's formatters use (`useFormat()` as `Heatmap` / `DonutChart` read it); a share above 0 that would print as 0.0% reads `'<' + format(0.001)` ("<0.1%").
- Order: groups by total, largest first; tiles in a group by value, largest first; ties keep data order. DOM order, reading order and Home / End follow it.
- Levels: with `shade` and valid `breaks`, `levelFor` / `binLevels` / `sequentialBreaks` from `core/thresholds.ts` exactly as `Heatmap` uses them; a row without a finite shade is level 0; without `shade` every tile is level 3.
- Tile ids: `id` accessor or the data index. React keys use the data index.
- Only existing `--ch-*` tokens. Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `Treemap` entry ≤ 15 KB gzip; every other entry stays within its limit. If an entry goes over after honest work, do not contort the code: report the measured number and what drives it.
- Hydration tests render the server markup before installing the `console.error` spy.
- Builds and e2e runs share `dist` and ports 6007 / 3100: never run two at once.

Shared test data ("service lines", 13 rows in this order; `name="line" value="revenue" group="group" shade="margin" breaks={[10, 20, 30, 40]}`; total 1840):

| line | group | revenue | margin |
| --- | --- | --- | --- |
| Kitchen | Remodels | 412 | 34 |
| Bath | Remodels | 286 | 31 |
| Basement | Remodels | 148 | 22 |
| Whole-home | Remodels | 96 | 8 |
| Plumbing | Repairs | 188 | 42 |
| Electrical | Repairs | 142 | 38 |
| Roofing | Repairs | 96 | 16 |
| Handyman | Repairs | 54 | 18 |
| Decks | Outdoor | 164 | 27 |
| Fencing | Outdoor | 82 | 24 |
| Landscaping | Outdoor | 48 | 12 |
| Annual plans | Maintenance plans | 86 | 46 |
| Seasonal | Maintenance plans | 38 | 41 |

Group totals: Remodels 942, Repairs 480, Outdoor 294, Maintenance plans 124. Levels in row order: 4, 4, 3, 1, 5, 4, 2, 2, 3, 3, 2, 5, 5. Handyman's share is "2.9%". Component tests pass `initialWidth={1024}` (jsdom measures 0 width; follow how `Heatmap`/`Chart` tests keep a known width, e.g. a mocked `getBoundingClientRect`, and say which you used) and take expected rectangles from `treemapLayout`, not from hand-computed pixels.

## Review Focus

1. A single huge tile next to many tiny ones (values 1 000 000 and twenty 1s): no NaN or negative sizes in styles, tiny tiles stay focusable, no text in them. → Task 1 and Task 2 tests.
2. A width that shrinks to 0 or 60 px (hidden tab, collapsed panel): renders without NaN, no horizontal overflow. → Task 2.
3. Duplicate names in different groups and a group name equal to a tile name: keys, ids and the accessible text stay distinct. → Task 2.
4. Data that changes while a tile is focused or active (the focused row disappears): the tab stop falls back to the first tile, `activeId` pointing at a missing id shows nothing. → Task 3.
5. A tile at the top edge as tall as the box, and a tile in the right corner: the tooltip stays inside the box. → Task 3.

---

### Task 1: Treemap layout (core)

**Files:**
- Create: `packages/tally-charts/src/core/treemap.ts`, `treemap.test.ts` (not added to `core/index.ts`)

**Interfaces:**
- Produces:

```ts
export interface TreemapRect { x: number; y: number; width: number; height: number }

/** Squarified layout of `values` (callers pass them largest first) in `box`; one rect per value, in input order. */
export function squarify(values: readonly number[], box: TreemapRect): TreemapRect[]

export interface TreemapGroupLayout {
  /** The group's box, header included. */
  box: TreemapRect
  /** True when the box is at least 48 px high and headers were asked for. */
  header: boolean
  /** One rect per value of the group, in input order. */
  tiles: TreemapRect[]
}

/**
 * Two-pass layout: groups by their totals in `width` × `height`, then each group's tiles under
 * its header. `groups[i]` are the values of group i, largest first; groups are passed largest
 * total first. `headers: false` (no `group` prop) never reserves a header.
 */
export function treemapLayout(
  groups: readonly (readonly number[])[],
  width: number,
  height: number,
  headers: boolean,
): TreemapGroupLayout[]

export type TreemapDirection = 'up' | 'down' | 'left' | 'right'
/** Index of the tile an arrow key moves to from `from`, or -1. */
export function treemapNeighbour(rects: readonly TreemapRect[], from: number, direction: TreemapDirection): number
```

Decisions:
- `squarify` is the artboard's algorithm (`squarify` in `project/Treemap.dc.html`): rows along the shorter side, add the next item while the worst aspect ratio does not get worse.
- Gap rule (spec §4): group boxes = `squarify(totals, { x: -4, y: -4, width: width + 8, height: height + 8 })` with every rect inset by 4 on each side. Tiles = `squarify(values, inner enlarged by 1 on each side)` with every rect inset by 1, where `inner` is the group box minus the top 24 when `header`. Widths and heights are clamped at 0; nothing is rounded.
- `treemapNeighbour`: candidates are rects that start at or beyond the current rect's edge in the direction (with a 0.5 px tolerance) and overlap it on the other axis by more than 0.5 px; pick the smallest edge distance, then the smallest centre distance on the other axis, then the lowest index.
- Non-finite or non-positive totals, an empty group list, `width` or `height` ≤ 0: every returned rect has zero width and height and finite `x` / `y`.

- [ ] **Step 1:** Write `treemap.test.ts`:
  - `squarify([6, 6, 4, 3, 2, 2, 1], { x: 0, y: 0, width: 6, height: 4 })` gives the paper's layout: first two rects 3 × 2 stacked in the left column (areas equal the values for every rect, sum of areas 24).
  - areas are proportional to values and rects do not overlap and stay inside the box, for a wide (1024 × 480), a tall (320 × 480) and a square box.
  - one value fills the box; equal values give equal areas; `[]` gives `[]`.
  - `treemapLayout` on the shared data's groups (largest first) at 1024 × 480 with headers: min x of all tiles is 0, max right edge 1024, min group-box y 0, max bottom 480 (± 1e-6); any two group boxes that are side by side are exactly 8 apart; tiles in a group are 2 apart; each group's tiles start at `box.y + 24`; tile area ratios inside a group follow the values (± 1 %).
  - `headers: false` with one group: tiles fill 0–1024 × 0–480.
  - a group box lower than 48: `header` false and tiles start at `box.y` (use values `[[1000], [1]]` at 300 × 100 or another case you verify has such a box).
  - Review Focus 1: `[[1_000_000, ...Array(20).fill(1)]]` at 320 × 480: all numbers finite, all sizes ≥ 0.
  - zero and negative `width` / `height`: all rects zero-sized, no NaN.
  - `treemapNeighbour` on a hand-built 2 × 2 grid plus one wide rect under it: right / left / up / down from each cell, -1 at the edges, the tie rule.
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/core/treemap.test.ts` → FAILS (module missing).
- [ ] **Step 3:** Implement the three functions.
- [ ] **Step 4:** Same command → PASS; `pnpm lint` and `pnpm typecheck` → PASS.

### Task 2: Treemap tiles, groups, levels, legend

**Files:**
- Create: `packages/tally-charts/src/react/charts/Treemap.tsx`, `Treemap.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` and the tests that enumerate parts or selectors (`theme/surface.test.ts`, `theme/theme.test.ts`)
- Modify: `packages/tally-charts/src/react/messages.ts` (+ its tests): `treemapName`, `headerShade`

**Interfaces:**
- Consumes: Task 1's functions; from `Heatmap.tsx`'s imports: `resolveAccessor`, `toNumber`, `binLevels`, `levelFor`, `sequentialBreaks`, `createWarner`, `DEV`, `useFormat`, `useMessages`, `formatMessage`, `Legend`, `cx`, `headerOf`; `useWidth` (`react/useWidth.ts`) as `Chart.tsx` uses it.
- Produces: `export interface TreemapTile<D>`, `export type TreemapProps<D>` and `export function Treemap<D>(props)` exactly as spec §3. This task renders the legend, group headers and tiles with their levels and text, the empty state and the dev warnings, and accepts every prop. Roles, focus, keyboard, pointer, active state, tooltip and accessible text are Task 3.

Markup (all `data-ch-part`): root `<div class="ch-treemap" data-ch-part="treemap" data-ch-seq-tone={tone}>`; legend row `treemap-legend` holding `<span data-ch-part="treemap-legend-title">{shadeLabel}</span>` and the library `Legend` with `items={labels.map((label, i) => ({ label, level }))}` as `Heatmap` builds them; box `treemap-plot` (`position: relative`, height `height` px, the element `useWidth` measures); per group with a header `treemap-group` (absolute, at the group box's top, 24 high) with `treemap-group-name` and `treemap-group-total`; per tile `treemap-tile` (absolute; `left`, `top`, `width`, `height` in px rounded to 2 decimals; `data-ch-level`), inside it `treemap-tile-name` and `treemap-tile-value` when the thresholds allow.

Decisions:
- CSS: extend the existing `[data-ch-part="heatmap-cell"][data-ch-level=…]` rules (fills, ink, the level 1–2 outline, level 0, forced colors) so they also match `treemap-tile` (`:is(…)`), instead of copying declarations. The treemap root needs the sequential custom properties `Heatmap`'s root gets; its default base is accent (`--ch-seq-base` on an ancestor still wins, an explicit `tone` wins over both), and the inner `Legend` swatches follow it. Do not change what a `Heatmap` renders.
- Group header: the name is `min-width: 0` with an ellipsis; the total does not shrink but the row is `overflow: hidden`, so a very narrow group cuts the total last.
- `shadeLabel` default `headerOf(shade, messages.headerShade ?? HEADER_SHADE)`; `valueLabel` default `headerOf(value, messages.headerValue ?? …)` (used in Task 3).
- Warnings (`createWarner`, ids from the spec): `treemap-value` once per render listing the count of skipped rows; `treemap-breaks` for `shade` without `breaks` or `breaks` without `shade` (drawn as without `shade`); malformed `breaks` / `binLabels` length exactly as `Heatmap` handles them; repeated ids as charts with `id` do.
- Empty state: no tile → the root with `data-ch-part="empty"` as `Heatmap`.

- [ ] **Step 1:** Write `Treemap.test.tsx` cases (shared data unless noted):
  - 13 tiles and 4 group headers in the order of the Global Constraints; header texts "Remodels" + formatted 942 etc.
  - tile styles equal `treemapLayout(...)` for the measured width; the box is 480 px high; `height={300}` changes it.
  - `data-ch-level` per tile equals the list in the shared data; root `data-ch-seq-tone` is absent by default and set with `tone="loss"`.
  - legend: title "Margin", five labels "Under 10", "10 to 20", "20 to 30", "30 to 40", "40 and up"; `shadeFormat="percent"`-style formatting flows into them (pick a format the library has and assert its output); `binLabels` replace them; `legend={false}` and no `shade` render no legend.
  - no `group`: no headers, tiles fill the box. No `shade`: every tile level 3.
  - a row with `margin: null`: level 0.
  - text thresholds on three hand-picked widths/heights via data that yields a tile ≥ 96 × 48 (both lines, "$412K"-style value, "22.4%"), one ≥ 64 × 28 only (name only) and one smaller (no text); a share of 0.0004 reads "<0.1%".
  - zero rows are not drawn and do not warn; `null`, `'x'` and `-5` are skipped with one `treemap-value` warning; both `treemap-breaks` cases warn and draw level 3.
  - empty data and all-zero data: the empty state; `empty` replaces the text.
  - Review Focus 2: `initialWidth={60}` and a measured width of 0 render without `NaN` in any style.
  - Review Focus 3: two rows named "Other" in different groups and a group named "Kitchen": 13 tiles, no React key warning.
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/Treemap.test.tsx` → FAILS.
- [ ] **Step 3:** Implement the component and CSS; add the two message keys.
- [ ] **Step 4:** `pnpm --filter tally-charts test` → PASS (all files); `pnpm lint`, `pnpm typecheck` → PASS.

### Task 3: Listbox semantics, keyboard, active tile, tooltip, SSR

**Files:**
- Modify: `Treemap.tsx`, `Treemap.test.tsx`, `theme.css` (+ theme tests)
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixture `RevenueTreemap`: the shared data with all accessors; import the component from its source file until Task 4 exports it), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `LeakHeatmap` cases)

**Interfaces:**
- Consumes: Task 2's component; `treemapNeighbour`; the tooltip pill's class and segment markup as `overlays/` renders them (reuse the component if it works outside `<Chart>`, else the same classes); `Heatmap.tsx`'s `setActive` / controlled `activeId` / Escape logic as the pattern.
- Produces: internal only.

Decisions:
- Roles: `treemap-plot` is `role="listbox"`, named with `aria-labelledby` (hidden title span, or the consumer's `aria-labelledby`) or `aria-label` (`title || messages.treemapName`), `aria-describedby` the hidden description, as `Heatmap` names its grid. With `group`, each group is `<div role="group" aria-labelledby={header id}>` wrapping its header and tiles (no size or position of its own beyond what the absolute children need); without `group` the options are direct children. Tiles are `role="option"` with `aria-selected="false"` only if axe requires it (try without first in Task 5; note the outcome).
- Accessible text per tile: `aria-label` = name, formatted value, "<share> of total", and with `shade`: "<shadeLabel lower-cased first letter> <shade value>", the bin label; joined with ", ". Example with `format="currency-compact"` and percent-formatted shade: "Handyman, $54K, 2.9% of total, margin 18%, 10 to 20". A level-0 tile says the name, value and share only. Visible tile text is `aria-hidden`.
- Focus: roving `tabindex` on the tiles; the tab stop is the last focused tile if it still exists, else the first tile. Keys on the focused tile: arrows → `treemapNeighbour` (no neighbour: nothing, but `preventDefault`), Home / End first / last tile, Enter / Space → `onSelect` (Space always `preventDefault`), Escape clears the active tile when there is one (only then `preventDefault`), modified arrows untouched, exactly as `Heatmap`'s `onKeyDown`.
- Active tile: focus and pointer enter set it; leaving the plot clears it unless a tile has focus; blur out of the plot clears it; controlled `activeId` as `Heatmap`. `data-ch-active="true"` → `outline: 2px solid var(--ch-ink); outline-offset: 2px` and a raised `z-index`; `:focus-visible` the same outline; `data-ch-selectable` → pointer cursor; forced colors: `Highlight` outline.
- Tooltip: rendered inside `treemap-plot` for the active tile when `tooltip !== false`, `aria-hidden`, `data-ch-part="treemap-tooltip"`, the pill's look. Default segments: name, value, "<share> of total", and with a shade number "<shadeLabel> <shade value>". A function `tooltip` replaces the content. Position after measuring the pill (layout effect; until measured it is `visibility: hidden`): x = tile centre − width / 2, clamped to [0, plot width − width]; y = tile top − height − 6 if ≥ 0, else tile bottom + 6 if it ends inside the plot, else tile top + 6. Escape hides it (the active tile is cleared). Do not change `placeTooltip`.

- [ ] **Step 1:** Write the tests:
  - roles and names: one listbox named by `title`; `aria-label` and `aria-labelledby` variants; fallback name "Treemap"; 4 groups named by their headers; 13 options; exact `aria-label` of Handyman as above and of a level-0 tile.
  - one `tabindex="0"`, the rest `-1`; each arrow from a known tile lands on `treemapNeighbour`'s answer and moves the tab stop; Home / End; an arrow with no neighbour keeps focus.
  - Enter and Space call `onSelect(id, tile)` with the `TreemapTile` fields of the spec (check `share`, `level`, `group`, `datum`); Space is default-prevented; Escape clears and is default-prevented only when something was active.
  - hover sets `data-ch-active` and calls `onActiveChange(id, tile)`; leaving clears with `(null, null)`; hover while another tile has focus returns to the focused tile on leave; controlled `activeId` shows that tile and a parent that ignores changes keeps it.
  - Review Focus 4: rerender without the focused row → first tile is the tab stop; `activeId` of a missing id → no active tile, no tooltip.
  - tooltip: default content for Handyman (4 segments), for a tile without shade (3), `tooltip={false}` none, a function's output; `aria-hidden`.
  - Review Focus 5: with mocked tile and pill sizes, a tile whose top is 0 and height 480 places the pill at tile top + 6; a tile at the right edge keeps `left + width ≤ plot width`; a tile at the top with room below goes below.
  - SSR (`ssr.node.test.tsx`): `RevenueTreemap` renders 13 options with styles from `initialWidth`; hydration: no `console.error`, and a 1024 server render hydrated into a 375 px container relays out.
- [ ] **Step 2:** Run the three test files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm --filter tally-charts test` → PASS; `pnpm lint`, `pnpm typecheck` → PASS; `pnpm build && pnpm --filter tally-charts check:dev-strip` → PASS.

### Task 4: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `Treemap`, `TreemapProps`, `TreemapTile`, next to `Heatmap`), `src/index.test.ts`, `.size-limit.js` (entry `Treemap`, limit `15 KB`, after `Heatmap`), `test/fixtures.tsx` (the fixture imports like the others), the `check:treeshake` fixture list if it is not derived from `.size-limit.js`
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/treemap.md` (`'tally-charts': minor`; one paragraph for library users: what the chart shows, flat rows with `name` / `value`, optional `group` and `shade` with `breaks`, largest first, when tiles show text, the tooltip, keyboard, that tiles are a listbox and there is no data table, which rows are skipped, the new `ChartMessages` keys; a short usage snippet. Every sentence must be true of the code.)
- `git show ea81528 --stat -- packages/tally-charts .changeset` shows how `GanttChart` did these steps.

- [ ] **Step 1:** Add the exports to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only `Treemap`, `TreemapProps`, `TreemapTile` and the new `ChartMessages` members.
- [ ] **Step 4:** `pnpm test && pnpm lint && pnpm typecheck && pnpm --filter tally-charts api:check && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts check:dts && pnpm --filter tally-charts check:treeshake && pnpm test:scripts` → all PASS; report the measured `Treemap` size and any entry within 0.1 KB of its limit.

### Task 5: Storybook stories and e2e gates

**Files** (`git show --stat ea81528 -- apps/storybook` lists how `GanttChart` did it; mirror it, `touch.spec.ts` included; the Heatmap stories show how a standalone HTML chart is handled in the gates):
- Create: `apps/storybook/stories/Treemap.stories.tsx` (title `Charts/Treemap`)
- Modify: `apps/storybook/e2e/stories.ts` (story list, `THEMELESS` for stories without a `theme` parameter), `stories.spec.ts` (keyboard test: Tab reaches one tile, each arrow, Home / End, the tooltip text after focus, Escape; assert exact accessible names with `toHaveAccessibleName`), `forced-colors.spec.ts` (dedicated test with assertions that can fail: every tile has a visible border or fill that differs from the canvas, the active tile's outline is the Highlight colour, header and tile text are visible), `touch.spec.ts` (tap a tile → tooltip)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-treemap--<name>`): `light`, `dark` (the shared data with all accessors, `format="currency-compact"`-style value format with values in dollars, a percent shade format), `flat` (no `group`), `plain` (themeless: `name` and `value` only), `tone` (`tone="loss"`, custom `binLabels`, a row without a shade), `many` (about 40 tiles in 5 groups), `narrow` (the shared data in a 360 px wide container).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. If axe rejects the listbox / group / option structure, fix it in `Treemap.tsx` within the spec's semantics (`aria-selected`, required ownership) and report what changed. If another gate fails and the cause is in `packages/tally-charts/src`, stop and report BLOCKED with the output and diagnosis; do not weaken a gate or change story data to dodge it.
- [ ] **Step 3:** Write darwin baselines (`CLAUDE.md` command), look at each new PNG (tiles flush with the box, gaps even, text not clipped mid-glyph, legend above), then the linux baselines with the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. Existing baselines must not change.
- [ ] **Step 4:** `pnpm test:e2e` on darwin and the docker run → PASS; report counts.

### Task 6: Docs page

**Files:** as the `GanttChart` page did it (`git show --stat ea81528 -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/treemap/{revenue-by-line,flat,value-only,tone-and-labels}.tsx` (the artboard's data with groups and shade; no groups; no shade; `tone` with custom `binLabels`; all rscSafe: field names and preset formats, no functions; titles must not contain one another), `apps/docs/content/treemap.json` (model on `heatmap.json` and `gantt-chart.json`; every behavioural sentence checked against `Treemap.tsx`: what a row is, order, groups and when a header is dropped, shade and `breaks`, what a tile without a shade number looks like, when text is shown, tooltip, keyboard, listbox semantics and why there is no data table, skipped rows, `ChartMessages` fallbacks, what is not built in), `apps/docs/e2e/treemap.spec.ts` (`themeSuite` with `chartRole: 'listbox'`; extend the option's type in `e2e/support.ts`)
- Modify: `content/navigation.json` (after Heatmap), `blocks/chart-thumbs.tsx` (thumb `treemap`: one large, two medium and three small rectangles in sequential shades, classes `ct-*`), `content/home.json` (tile after GanttChart; heading "Nineteen charts, one grammar"), tests that count pages, slugs, tiles or symbols, block `height` (tile box 480 + legend: measure as `e2e/lazy-mount.spec.ts` requires; `NARROW_CHART_HEIGHTS` where the legend wraps at 375 px), the messages docs page if it lists `ChartMessages` keys, `tabTo`'s Tab limit in `e2e/support.ts` if the sidebar outgrows it
- Modify: `docs/a11y.md` (the tile's accessible name quoting the Storybook keyboard test's exact strings; a note that position, text and the accessible name, not shade alone, carry the second measure), `CLAUDE.md` (counts and pitfalls that changed; a short `treemap` page note like the other chart pages), `PROGRESS.md` (section "Treemap 1.8 (2026-11-24)": what shipped, measured sizes, test counts from your own final runs, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else in `apps/docs`.
- [ ] **Step 4:** Refresh the home baselines on darwin and with the docker command from the comment above the `docs` job in `ci.yml`; look at the new PNGs; rerun both platforms → PASS; `pnpm lint` → PASS. Report counts.
