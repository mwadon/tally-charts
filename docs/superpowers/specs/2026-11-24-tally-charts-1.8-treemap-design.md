# tally-charts 1.8 — Treemap

Date: 2026-11-24. Status: approved by the owner on 2026-11-24. What the owner decided is listed in §10;
everything marked "author's call" is a default the owner has not seen in detail.

Design: the artboards "Treemap · light" and "Treemap · dark" of the canvas "Gantt chart i
Treemap — tally-charts" (https://claude.ai/artifact/3Hi411NiJXXYiQymLCRme8; files
`project/Treemap.dc.html`, `project/TreemapDark.dc.html`). The title row above the chart on the
artboard (heading, "$1.84M", "13 lines in 4 groups") is page content, not part of the component.

Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and the 1.1–1.7 chart specs.
Everything they require of a high-level chart (themes, a11y, reflow, forced colors, dev warnings,
size budgets, API report, i18n through `ChartMessages`) applies here unless this document says
otherwise.

## 1. Purpose

Show how one total splits into many parts of very different size, optionally in a few groups,
and at the same time how a second measure differs between the parts: revenue by service line
with gross margin as the shade, hours by job with overrun as the shade. The reader should see
which parts are big, which group they belong to, and which big parts are weak or strong on the
second measure.

`Treemap` is a high-level chart in `src/react/charts/`. Release: **1.8.0** (minor; additive
only).

Anti-goals: a hue per tile or per group, more than one level of nesting, tiles whose text
overflows or is unreadable, a chart where the only way to read a small tile is to hover it.

## 2. Approaches

1. **Standalone HTML chart, as `Heatmap` (chosen).** Tiles are absolutely positioned HTML
   elements in a box of measured width; the sequential shade, the bins, the legend and the tone
   handling are the ones `Heatmap` already has. Text is cut with CSS ellipsis, the tiles are
   real focusable elements that assistive technology reads directly.
2. **SVG inside `<Chart>`.** Reuses points, the tooltip pill and the hidden data table, but
   `<Chart>` is built around axes and scales that a treemap does not have, SVG text needs
   width estimates to be cut, and the sequential tile styles would have to be duplicated for
   SVG. More code against the 15 KB budget for no visible gain.
3. **Nested data (`children`).** Matches how treemaps are usually described, but every other
   chart in the library takes flat rows with accessors, and one level of groups does not need
   a tree.

The owner approved approach 1 with flat data (§10).

## 3. API

```tsx
<Treemap
  title="Revenue by service line"
  data={lines}              // one row per tile
  name="line"
  value="revenue"
  group="group"
  shade="margin"
  breaks={[10, 20, 30, 40]}
  format="currency-compact"
  shadeFormat="percent"
/>
```

```ts
interface TreemapTile<D> {
  id: Id
  name: string
  /** Group name; undefined without `group`. */
  group: string | undefined
  value: number
  /** Share of the total, 0–1. */
  share: number
  /** NaN without `shade` or when the row has no shade number. */
  shade: number
  /** Sequential level 1–5; 0 when `shade` is set and the row has no number. */
  level: SeqLevel | 0
  datum: D
}

type TreemapProps<D> = ChartName & {
  /** One row per tile. */
  data: readonly D[]
  /** Tile name. */
  name: Accessor<D, string>
  /** Tile area. */
  value: Accessor<D, number>
  /** Tile id. Default: the data index. */
  id?: Accessor<D, Id>
  /** Group name. Without it the tiles fill the whole box and no group headers are drawn. */
  group?: Accessor<D, string>
  /** Second measure, shown as the shade of the tile. Requires `breaks`. */
  shade?: Accessor<D, number>
  /** Ascending bin edges of `shade`, as in `Heatmap`: 1–4 edges give 2–5 bins. */
  breaks?: readonly number[]
  /** One label per bin. Default "Under X", "X to Y", …, "Z and up". */
  binLabels?: readonly string[]
  /** Default 'number'. Formats tile values and group totals. */
  format?: FormatSpec
  /** Default 'number'. Formats shade values and the default bin labels. */
  shadeFormat?: FormatSpec
  /** Name of the value in the tooltip and the accessible text. Default: the `value` field name in sentence case, or "Value" for a function. */
  valueLabel?: string
  /** Name of the shade measure in the legend, the tooltip and the accessible text. Default: the `shade` field name in sentence case, or "Shade" for a function. */
  shadeLabel?: string
  /** Base tone of the shades and the legend. Default: a `--ch-seq-base` set on an ancestor, else accent. */
  tone?: Tone
  /** Height of the tile box in px. Default 480. */
  height?: number
  /** Width assumed on the server and in the first client render. Default as in other charts. */
  initialWidth?: number
  /** Legend of the bins above the tiles. Default true; never drawn without `shade`. */
  legend?: boolean
  /** Default true. `false` turns the tooltip off, a function replaces its content. */
  tooltip?: boolean | ((tile: TreemapTile<D>) => ReactNode)
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  activeId?: Id | null
  onActiveChange?: (id: Id | null, tile: TreemapTile<D> | null) => void
  onSelect?: (id: Id, tile: TreemapTile<D>) => void
  /** Rendered instead of the tiles when there is nothing to draw. Default "No data". */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  chartId?: string
}
```

Author's calls in the API:

- `name` / `value` rather than `x` / `y`: a treemap has no axes, and `Heatmap` (the closest
  chart) also names its accessors after what they are (`row`, `column`, `value`).
- `breaks`, `binLabels`, `tone`, `legend`, `activeId`, `onActiveChange`, `onSelect`, `empty`,
  `chartId` have the names and meaning they have in `Heatmap`. The default tone is accent (the
  artboard), not loss as in `Heatmap`.
- The component is named `Treemap`, as `Heatmap` is.
- The layout function lives in `src/core/treemap.ts` and is not exported from the package.

Not in the API: nested data, more than one group level, a sort prop, per-tile colours or tones,
a continuous colour scale, custom tile content, padding and gap props, an aspect-ratio target.

## 4. Rendering

### Rows and totals

- A row is a tile when its value is a finite number > 0. Rows with a zero value are not drawn.
  Other rows (missing, non-numeric, negative) are skipped with a development warning.
- The total is the sum of the tiles. A tile's share is its value over the total; a group's
  total is the sum of its tiles.
- Without `group`, all tiles are one unnamed group without a header.

### Layout

- Squarified treemap (Bruls, Huizing, van Wijk), two passes, as on the artboard: the groups
  are laid out in the whole box by group total, then each group's tiles in the group's box
  below its header. Items go largest first; ties keep the data order. Groups likewise.
- Sizes from the artboard: group header 24 px high, 8 px between groups, 2 px between tiles,
  tile radius 3 px, tile padding 6 px 8 px.
- Gaps (author's call; the artboard's script is flush only horizontally and loses a few px at
  the bottom, which is not copied): the outer edges of the outer tiles are flush with the box
  on all four sides. Neighbouring groups are exactly 8 px apart on both axes, neighbouring
  tiles in a group exactly 2 px. A group's header takes the top 24 px of the group's box and
  the tiles start right under it. A group without a header and a chart without `group` use
  the whole box. The usual way to get this: lay out in a box enlarged by the gap, then inset
  every rectangle by half the gap.
- The box is as wide as the container and `height` px high. The server render and the first
  client render use `initialWidth`, so they agree; the layout is recomputed when the measured
  width changes.
- A group whose box is lower than 48 px gets no header; its tiles take the whole box.
- The layout is a pure function in `core` that takes values and a rectangle and returns
  rectangles; it handles one item, items of equal value, and a degenerate rectangle (zero
  width or height returns zero-area rectangles) without NaN.

### Group headers

One line above each group: the name at weight 600 and the formatted total in muted ink, 13 px,
8 px apart. The name is cut with an ellipsis when the group is narrow; the total goes first when
both cannot fit (the total is hidden by overflow).

### Tiles

- Fill: the sequential level of the tile's shade bin, with the classes and custom properties
  `Heatmap` cells use (`data-ch-level`, `data-ch-seq-tone` on the root), so text contrast,
  the level-1 outline in the light theme, dark theme and forced colors behave as there. No new
  tokens.
- Without `shade`: every tile is level 3 of the tone and there is no legend. With `shade`, a row
  without a shade number is level 0 (the "no number" look of a `Heatmap` cell).
- Text: the name (13 px, weight 500) when the tile is at least 64 × 28 px; under it
  "value · share" (12 px) when the tile is at least 96 × 48 px. Both lines are single lines cut
  with an ellipsis. Share: one decimal ("22.4%"); above 0 and rounding to 0.0 reads "<0.1%".
- Each tile is `data-ch-part="treemap-tile"`; group headers `treemap-group`; the box
  `treemap-plot`; the root `treemap`.

### Legend

Above the tiles, as on the artboard: `shadeLabel` in ink, then one swatch and label per bin,
using the library's `Legend` with levels, as `Heatmap` does. Wraps on a narrow chart.

### Active tile

A 2 px ink outline with a 2 px offset (the artboard's focused tile), for hover and for keyboard
focus alike. Other tiles are not dimmed. Tiles get a pointer cursor only with `onSelect`.

### Empty state

No tiles: the empty state, as `Heatmap`.

## 5. Interaction and accessibility

- Semantics (author's call): the tile box is always a `listbox` named by the chart (`title` /
  `aria-label` / `aria-labelledby` from `ChartName`, `description` as its description), the
  tiles are `option`s, and with groups each group is a `role="group"` inside the listbox,
  labelled by its header. This is the pattern `RunwayChart` switches to when its rows are
  focusable; here tiles are always focusable, because focus is how a keyboard user reaches the
  tooltip of a tile without text, so the role does not depend on `onSelect`. Focus is roving
  `tabindex` on the options (not `aria-activedescendant`). No `aria-selected` state is kept;
  if axe requires the attribute, every option carries `aria-selected="false"`. `themeSuite`
  gets `chartRole: 'listbox'`. Each tile has a full accessible text regardless of what fits visually: name, value,
  share of total, and with `shade` the shade value and its bin label, e.g. "Handyman, $54K,
  2.9% of total, gross margin 18%, 10 to 20%".
- There is no separate hidden data table: the tiles are HTML that assistive technology reads
  directly, as in `Heatmap` (author's call, see §10).
- Keyboard: one tab stop (roving `tabindex`). Arrow keys move to the nearest tile in that
  direction: among tiles that lie beyond the current tile's edge in that direction and overlap
  it on the other axis, the one with the nearest edge, then the nearest centre. No such tile:
  focus stays. Home / End go to the first and last tile in reading order (largest group
  first, largest tile first, which is also the DOM order). Enter / Space call `onSelect`.
  Escape clears the active tile when there is one. Modified keys stay the browser's, as in
  `Heatmap`.
- Pointer: the tile under the pointer is active; leaving the box clears it unless a tile has
  keyboard focus.
- Tooltip (author's call): the library's tooltip pill (`.ch-tooltip`), not the card drawn on
  the artboard, as in every chart since 1.1: segments with the name, the value, "22.4% of
  total", and with `shade` "`shadeLabel` 18%". It keeps the pill's behaviour, including
  `pointer-events: auto` (WCAG 1.4.13: the pointer can move onto it) and Escape to dismiss. It
  is shown for the active tile (hover and focus) and is `aria-hidden`, since the tile's
  accessible text carries the same content. Placement: centred on the tile and kept inside the
  box horizontally; above the tile when it fits inside the box, else below the tile when that
  fits inside the box, else inside the tile at its top edge (a tile as tall as the box). It
  never leaves the box, so a card or dashboard cannot clip it. `placeTooltip` works from one
  anchor point; the builder extends it or places this tooltip with a small helper of its own.
- Forced colors: tiles as `Heatmap` cells (system colours, borders carry the shape); the active
  tile is `Highlight`.
- Reflow: at 320 CSS px the box is 320 px wide and `height` high; nothing scrolls sideways; the
  legend wraps. Most tiles then show no text and are read through the tooltip and the
  accessible text.
- Reduced motion: the chart has no animation.

`ChartMessages` gains what the texts above need and nothing else. Expected: `treemapName`
("Treemap", the fallback accessible name, as `heatmapName`), `shareOfTotal` ("Share of total"),
`headerShade` ("Shade"). `ofTotal`, `headerValue`, `noData` and the bin label keys exist. The
builder may adjust names to the file's conventions and reuse existing keys with the same text.

## 6. Dev warnings

- A missing, non-numeric or negative value (`treemap-value`).
- `shade` without `breaks`, or `breaks` without `shade` (`treemap-breaks`); the chart is drawn
  without shades.
- Malformed `breaks` or a `binLabels` length that does not match: as `Heatmap` handles them.
- Repeated ids, as every chart with `id`.

## 7. Tests and gates

- Unit, core: squarify on fixed rectangles (areas proportional to values, rectangles tile the
  box without overlap, largest first, one item, equal values, wide and tall boxes, zero-size
  box) and the gap rules of §4 on the artboard's data at 1024 × 480 (same rows and columns of
  tiles as the artboard; exact px differ from it by the gap rule).
- Unit, component: tiles and groups from flat rows, group totals, order, header hidden for a low
  group, no `group`, levels from `breaks`, no `shade` (level 3, no legend), a missing shade
  (level 0), text thresholds (name only, both lines, none), share text and "<0.1%", skipped
  and zero rows with warnings, the breaks warnings, accessible text, roving focus and each
  arrow direction on a known layout, Home / End, Enter / Space, Escape, hover, controlled
  `activeId`, tooltip content and `tooltip={false}` and a function, legend content, empty state,
  SSR and hydration (server render before the `console.error` spy; a wide server render
  hydrated into a narrow container), a 60 px wide chart, a single row.
- Storybook stories (`light` and `dark`: the artboard; `flat`: no groups; `plain`: no shade,
  themeless defaults; `tone`: another tone; `many`: about 40 tiles) with e2e gates: screenshots
  darwin + linux, axe, contrast, reflow at 320 CSS px, forced colors, keyboard.
- New size-limit entry `Treemap` ≤ 15 KB gzip; `check:treeshake` fixture; other entries stay
  within their limits.
- `api:update`: the report gains `Treemap`, `TreemapProps`, `TreemapTile` and the new
  `ChartMessages` keys, nothing else.
- `react/messages-literals.test.ts` stays green (every visible string through `messages.ts`).
- Changeset: `minor`.

## 8. Docs

- Page `treemap` (fixture, `navigation.json`, `PropsTable`), examples under `examples/treemap/`:
  the artboard (groups and shade), no groups, no shade, another tone with custom `binLabels`.
- A `chart-index` tile with a new thumb `treemap` and an entry in `home.json`; the heading
  becomes "Nineteen charts, one grammar" (refreshes the home baselines on both platforms).
- Card heights: the tile box is 480 px plus the legend, higher than the default panel, so the
  blocks get `height` and, where the legend wraps at 375 px, `NARROW_CHART_HEIGHTS` entries,
  by the rules in `CLAUDE.md`. `themeSuite` uses `chartRole: 'listbox'`.
- `CLAUDE.md` and `PROGRESS.md` updated as for the previous charts.
- Sample data is fictional and in English (the artboard's data qualifies).

## 9. Out of scope

Deeper hierarchies, drill-down or zoom, negative values, a continuous colour scale, per-tile or
per-group hues, an "Other" tile that sums small rows, animated transitions between data sets,
labels outside the tiles, a hidden data table.

## 10. Decisions

Owner (2026-11-24, in conversation):

1. **Next chart:** Treemap, as the artboard shows it: area is the value, shade is a second
   measure in bins, tiles in groups with a header.
2. **Data:** flat rows with accessors (`name`, `value`, optional `group`, `shade`), no nested
   `children`.
3. **Groups:** one level; without `group` the tiles fill the box.
4. **Without `shade`:** one shade for every tile and no legend.
5. **Rendering:** HTML tiles, as `Heatmap`, not SVG.
6. **Height:** a `height` prop, default 480; the same layout at 375 px with fewer labels.
7. **Keyboard:** one tab stop, arrows move to the neighbouring tile in that direction.
8. **Out of scope:** deeper hierarchies, drill-down, negative values (skipped with a dev
   warning).

9. **No hidden data table** (confirmed after the builder check): see the first author's call.

Author's calls (the owner saw the list on approval; the first is confirmed explicitly):

- **No hidden data table.** The owner was told there would be one "as in other charts". The
  tiles are HTML options with a full accessible text each, so a table would repeat them; the
  listbox is the accessible representation. A sighted reader gets a small tile's numbers
  from the tooltip (hover, touch, or keyboard focus). Adding `dataTable` later is additive.
- The prop names of §3, `shadeFormat`, `valueLabel` / `shadeLabel` and their defaults, the
  default tone accent, level 3 for a chart without `shade`, level 0 for a missing shade.
- Always largest first, no sort prop; headers hidden for groups lower than 48 px; the text
  thresholds 64 × 28 and 96 × 48 from the artboard; share with one decimal.
- The legend above the tiles (the artboard) rather than under them (`Heatmap`).
- The tooltip as the library's pill (not the artboard's card), `aria-hidden`, for hover and
  focus, always inside the box; the outline as the only active state; the nearest-tile rule
  for arrow keys.
- `listbox` / `option` / `group` semantics regardless of `onSelect`.
- The gap rule of §4 (flush on all sides, exact 8 px and 2 px gaps) instead of the artboard
  script's arithmetic.
- The message keys, the internal `core/treemap.ts`, version 1.8.0 with this chart alone.
