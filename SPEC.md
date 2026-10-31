# SPEC: tally-charts 1.0

Source of the requirements: `docs/superpowers/specs/2026-10-25-tally-charts-1.0-candidates.md` (b534bd5), split into buckets A–I, plus two rounds of the interview (2026-10-25). Status at the start: `tally-charts@0.9.0` is on npm (`latest`), the repo github.com/mwadon/tally-charts is public, and the first integration (the glokki editor, Performance screen) is merged.

## 1. Goal

Release `tally-charts@1.0.0`: the first version with strict semver. That means:

1. **Freeze the API after the last breaking decisions.** These are the things that can't change after 1.0 without a major version: the RankedBars default fill, a required chart name, children under the series in LineChart, and what counts as public API.
2. **Fix the observable behaviour bugs** that would otherwise freeze along with the API.
3. **Packaging.** It is verified: tree-shaking, `.d.ts`, `api:check`, size budgets.
4. **Release automation.** Publishing from CI through changesets plus npm trusted publishing (OIDC, provenance), without OTP and without a laptop.
5. **Docs site.** A Next.js app in `apps/docs` with content managed in the **glokki** headless CMS. Live examples and props tables come from the repo, so they can't drift from the API. The work starts with a design for the home page and the docs pages, which the maintainer approves.
6. **Manual accessibility pass** (VoiceOver, NVDA, Windows high contrast, 400% zoom) before 1.0.0.

Release path: the 1.0 changes → `1.0.0-rc.0` (dist-tag `next`) → the editor checks it → `1.0.0` (`latest`).

## 2. Users and roles

| Role | Who | What they do in this scope |
|---|---|---|
| **Library user** | A React developer building a dashboard (e.g. the glokki editor team) | Installs the package, reads the docs site, migrates from 0.9 to 1.0. |
| **Docs editor** | The maintainer, possibly others with glokki access later | Edits pages, navigation, prose and the home page in the glokki visual editor. Publishes. Can't break examples or props tables (they come from the repo). |
| **Maintainer** | Mateusz Wadoń | Approves the design (gate), approves publishes in the `npm-publish` environment, configures npm/Vercel/glokki, runs the manual a11y pass. |
| **Agents** | The agent team | Implement the code, tests, CI, docs content as fixtures, and the design. They don't do git operations or anything that needs maintainer credentials. |
| **Docs site visitor** | Anyone, no login | Reads the docs, copies code, views live examples in light and dark. |

The docs site has no login and no user accounts.

## 3. Scope

The features are grouped into milestones. Tasks marked **[MAINTAINER]** need the maintainer's access or decision. Agents prepare them (instructions, scripts) but can't close them.

### M1. API freeze (bucket A plus the selected E items)

#### F1. RankedBars default fill is `'solid'`
The default `fill` in `RankedBars` changes from `'hatch'` to `'solid'`, in line with the library's language (solid = actual, hatch = plan/reference).
- [ ] `<RankedBars …/>` without `fill` renders bars with `data-ch-fill="solid"` (unit test).
- [ ] `fill="hatch"` still renders hatched bars (unit test).
- [ ] The TSDoc for `fill` states the default `'solid'`, and `api/tally-charts.api.md` is up to date (`api:check` passes).
- [ ] The CHANGELOG (changeset `major`) and the migration page (F23) have a "RankedBars: pass `fill="hatch"` to keep the old look" entry.
- [ ] The visual baselines for stories that use RankedBars without `fill` are regenerated (or those stories pass `fill="hatch"` explicitly if the reference calls for hatching), and e2e passes.

#### F2. `underlay` in LineChart
A new additive prop `underlay?: ReactNode` in `LineChartProps`. It is drawn under the series. The current order (`children` above the series) doesn't change.
- [ ] Order in the plot SVG: grid → `underlay` → series → `children` (a unit test on DOM order).
- [ ] `<Area>` passed in `underlay` sits under the line (a story "LineChart / Underlay" plus a visual baseline).
- [ ] Without `underlay` the DOM is identical to 0.9 (existing snapshots unchanged).
- [ ] TSDoc on the prop, plus an api report update.

#### F3. Required chart name in the types
`<Chart>` and every high-level chart (BarChart, ComparisonBars, RankedBars, WaterfallChart, BridgeChart, DotHistogram, StripPlot, WaffleColumns, LineChart, Heatmap, RunwayChart) require in their types **either** `title: string` **or** `'aria-labelledby': string`.
- [ ] `types.test.ts`: `// @ts-expect-error` for each of the 12 components with neither prop. It compiles with `title` alone and with `aria-labelledby` alone.
- [ ] The dev warning for an unnamed chart stays for JS callers (an existing test still passes). The warning is stripped in production (`check:dev-strip` passes).
- [ ] With `aria-labelledby` the widget's accessible name comes from the referenced element (test: `getByRole(…, { name })`).
- [ ] Every story and docs example compiles (typecheck of the whole monorepo).
- [ ] Changeset `major` plus an entry on the migration page.

#### F4. "Press Enter to select" hint only on selectable points
- [ ] When the active point has `selectable: false`, or the chart has no `onSelect`, the hint text is not in the accessible description or the live message of the active point (unit tests for Chart/Bars, RankedBars and ChartPoint).
- [ ] With `onSelect` and a selectable point, the hint appears as it did in 0.9.
- [ ] Moving from a selectable point to a non-selectable one and back updates the hint (test).

#### F5. ZoneMeter and ShareBar edge cases
- [ ] A `value` of `Infinity`, `-Infinity` or `NaN` renders the "No data" state and logs a dev warning saying the value must be finite (tests for both components; the warning is stripped in prod).
- [ ] ShareBar: every segment with share > 0 has a rendered width of ≥ 2 px, and the sum of segment widths plus gaps equals the bar width (±0.5 px). Test: a segment of 0.1% at width 320.
- [ ] ZoneMeter: a zone with width > 0 is at least 2 px wide (same test).
- [ ] ZoneMeter: tick labels at the ends don't go outside the component box. Unit test of the end labels' anchoring (`text-anchor` start/end or clamping), plus a visual baseline at 320 px.

#### F6. Behaviour fixes before the freeze (selected from E)
- [ ] **Invalid date mid-series:** `Line`, `Area` and `LineChart` behave the same way. The point is skipped and **the line breaks** (two path segments). The tooltip and keyboard navigation skip that point. One dev warning per series. Unit tests on all three.
- [ ] **thinTicks keeps the highlighted tick:** a unit test of `thinTicks` with a highlighted index shows the index survives thinning. At 320 px, BridgeChart renders both the first label ("Planned profit") and the label of the highlighted result column (e2e/visual at 320).
- [ ] **RunwayChart, `pressed` after a cancelled touch:** `pointercancel` and `pointerleave` clear the state, so the next tap doesn't select a row (test with simulated pointer events).
- [ ] **RunwayChart, controlled `activeId`:** changing the `activeId` prop moves the cursor and the active row's attributes (`data-ch-active`) without user interaction (test).
- [ ] **RunwayChart, duplicate `id`s:** a dev warning listing the duplicate ids. At most one row (the first) is shown as active (test).
- [ ] **RunwayChart, touch `pointerEnter` without `pointerLeave`:** for `pointerType: 'touch'` the hover state is cleared on `pointerup` and `pointercancel` (test).

#### F7. Public API and stability documented (A3, A6, A7, A9)
A new "Stability and semver" page (on the docs site, and in short in the README) defines what is public API.
- [ ] **Public:** exports from `tally-charts` and `tally-charts/core`, the `--ch-*` tokens, `data-ch-part`, the `data-ch-*` state and variant attributes, `theme.css`.
- [ ] **Not public:** `ch-*` class names, `--_ch-*` variables (including `--_ch-swatch-color`), DOM structure outside parts, **the wording of built-in English strings** (they may change in a minor release; `ChartsProvider messages` translates them, and its keys are public while the English defaults are not), and size budgets.
- [ ] `docs/a11y.md` §Known limits contains:
  - the hover tooltip with `pointer-events:auto` covering neighbouring hit areas, and custom content inside an aria-hidden overlay (accepted under WCAG 1.4.13);
  - Heatmap `breaks` and RunwayChart levels being lower-inclusive only, with `inclusive` planned for 1.x.
- [ ] Stories that use `--_ch-swatch-color` carry a comment marking it as a private variable (no public token in 1.0).

### M2. Packaging (bucket B)

#### F8. Packaging checks
- [ ] **Tree-shaking:** a new script `check:treeshake` (in CI) bundles a fixture with esbuild for each size-limit entry (e.g. `import { LineChart }`, `import { Stat }`), using a metafile. It fails if the bundle contains modules outside the expected set. Example: an import of `LineChart` must not pull in `RunwayChart` modules, and an import of `Stat` must not pull in `Chart`.
- [ ] `sideEffects` in package.json and `/* @__PURE__ */` on RunwayChart's `memo()` (and any other top-level wrappers) are verified by that check.
- [ ] **LineChart budget:** if `check:treeshake` confirms the measurement is honest, the `LineChart` limit in `.size-limit.json` is deliberately raised to 14 KB. The reason goes in a comment and in PROGRESS.md. `pnpm size` passes.
- [ ] **`.d.ts`:** no file in `dist/` contains a bare `import "d3-time"` (or other side-effect imports in `.d.ts`). A check in CI fails if one appears.
- [ ] **`api:check` vs stale dist:** `api:check` fails with the message "dist is older than src, run pnpm build" when any file in `src/` is newer than `dist/index.d.ts`. Test: touch a file in src, and `api:check` exits with a non-zero code.
- [ ] **API Extractor and TS 6:** `api:check` runs with the project's compiler (`--typescript-compiler-folder` pointing at TypeScript 6), or a test shows the bundled TS parses every `.d.ts` file without errors. The decision is recorded in PROGRESS.md.
- [ ] **`ae-forgotten-export`:** the test isn't vacuous. A fixture with a non-exported type in the public signature makes the check fail (test).
- [ ] **`createDateFormatter`** is exported from `tally-charts/core` (additive), has TSDoc, and is in `api/core.api.md`.
- [ ] `prepublishOnly` and CI run the full set: build, test, api:check, size, check:dev-strip, check:treeshake, check of the `.d.ts` files.

### M3. Release automation (bucket C)

#### F9. Changesets release workflow with trusted publishing
A new `.github/workflows/release.yml`.
- [ ] On push to `main`, `changesets/action` opens or updates a "Version Packages" PR when there are pending changesets.
- [ ] Merging the "Version Packages" PR runs the publish job, which:
  1. runs the full check set (as in `ci.yml` check);
  2. waits for approval in the GitHub environment `npm-publish` (maintainer as required reviewer);
  3. publishes with `pnpm changeset publish` using OIDC (`permissions: id-token: write`, npm CLI ≥ 11.5.1 ensured in the workflow);
  4. creates the `vX.Y.Z` tag and a GitHub Release with the changelog.
- [ ] The repo and workflow have no `NPM_TOKEN` secret and no `NODE_AUTH_TOKEN` (check: grep of the workflows).
- [ ] The published version has provenance: `npm view tally-charts@<version> --json` shows `dist.attestations`, and the npmjs.com page shows "Built and signed on GitHub Actions".
- [ ] Pre mode: `.changeset/pre.json` (tag `rc`). Versions `1.0.0-rc.N` go to the `next` dist-tag, and `latest` doesn't move (check: `npm view tally-charts dist-tags`).
- [ ] `docs/releasing.md` describes the process step by step: adding a changeset, the Version PR, approval, prerelease, leaving pre mode, and what to do when a publish fails.
- [ ] **[MAINTAINER]** configures the trusted publisher on npmjs.com (repo `mwadon/tally-charts`, workflow `release.yml`, environment `npm-publish`) and creates the `npm-publish` environment on GitHub.
- [ ] **[MAINTAINER]** runs `npm deprecate tally-charts@0.0.0-stage "Placeholder from staged publishing; use a real version"`. Check: `npm view tally-charts@0.0.0-stage deprecated` is not empty.

### M4. Docs site design (D, step 1, gated)

#### F10. Design for the home page and the docs pages
- [ ] The document `docs/superpowers/specs/2026-10-xx-tally-charts-docs-site-design.md` covers:
  - the information architecture (page list and navigation as in F15);
  - home page and docs page layouts (header, side navigation, in-page table of contents, mobile layout);
  - typography (system font stack, scale);
  - colours taken from the package's `--ch-*` tokens in light and dark;
  - a hatched motif as the site's visual signature;
  - the code block look;
  - the look of the `ChartExample` block (preview / code toggle);
  - focus and contrast states.
- [ ] The text wordmark "tally-charts" (no image logo).
- [ ] A running `apps/docs` (Next.js) with **static placeholder content** (no CMS) for the home page and one doc page (e.g. LineChart), in light and dark.
- [ ] Screenshots of the home page and the doc page at 1280 and 375 px, light and dark (8 PNGs), in `docs/superpowers/specs/assets/docs-site/`.
- [ ] **[MAINTAINER] Gate:** the maintainer approves the design. The approval is recorded in PROGRESS.md. M5 doesn't start until then (except F12 and F13, which don't depend on the look).

### M5. Docs site on glokki (D, step 2)

#### F11. The `apps/docs` app and the content source
- [ ] `apps/docs` is a Next.js App Router workspace app that depends on `tally-charts` through `workspace:*` and on `@glokki-cms/sdk`, `@glokki-cms/react` and `zod`.
- [ ] Routes:
  - `/` (CMS page slug `home`);
  - `/docs/[slug]` (other pages);
  - `/preview` (draft mode);
  - `/cdn/[...path]` (`createAssetProxy`);
  - `/api/revalidate` (POST with a secret → `revalidateTag('cms')`);
  - `/sitemap.xml`;
  - `/robots.txt`.
- [ ] **Content source:** a `ContentSource` module with two implementations:
  - glokki (`createClient`, with `CMS_BASE_URL`, `CMS_TENANT` and `CMS_API_KEY` set);
  - fixtures from `apps/docs/content/*.json` (when `CMS_BASE_URL` is unset).

  Both return the same `DeliveryPage` / navigation types. A unit test runs on both implementations against mocked data.
- [ ] Pages are generated statically (`generateStaticParams` from the page list). Fetch uses `next: { tags: ['cms'] }`. A POST to `/api/revalidate` without the right `REVALIDATE_SECRET` returns 401; with it, 200 (test).
- [ ] An unknown slug returns 404 (e2e).
- [ ] `cmsMetadata()` sets title, description, canonical and OG. Outside `APP_ENV=production` the pages have `noindex` (test).
- [ ] Visual editor: with `?_editor=1` the page renders through `CMSPageEditor` inside `VisualEditorProvider`, and in draft mode `PreviewBanner` is visible (e2e on fixtures: the banner appears with the preview parameter).
- [ ] Theme: a light / dark / system switch in the header sets `data-ch-theme` on `<html>` and remembers the choice in `localStorage`. An inline script prevents a flash of the wrong theme (e2e: after a reload in dark there is no frame with the light background; check `data-ch-theme` before hydration).
- [ ] The header shows the `tally-charts` version from the workspace package.json, a GitHub link and an npm link.
- [ ] `.env.example` contains `CMS_BASE_URL`, `CMS_TENANT`, `CMS_API_KEY`, `NEXT_PUBLIC_CMS_TENANT`, `APP_ENV`, `REVALIDATE_SECRET` and `SITE_URL` with descriptions, and no values.

#### F12. glokki blocks
Blocks are defined with `defineBlock` (Zod schema plus a React component) and collected in `createBlockRegistry`.

| Block | Props (Zod) | Behaviour |
|---|---|---|
| `Prose` | `markdown: string` (textarea) | Renders markdown (GFM). Raw HTML is ignored (sanitized). |
| `Heading` | `text`, `level: enum(2,3)`, `anchor?` | Heading with an anchor. It feeds the page's table of contents. |
| `Callout` | `tone: enum(info,warning,tip)`, `markdown` | Highlighted note. |
| `CodeBlock` | `code`, `lang: enum(tsx,ts,bash,css,json)`, `filename?` | Server-side highlighting with a copy button. |
| `ChartExample` | `exampleId: enum(<generated from the registry>)`, `defaultView: enum(preview,code)`, `height?` | A live example plus its source code from the repo. |
| `PropsTable` | `symbol: enum(<generated from the API>)` | A table of props or parameters: name, type, default, required, description from TSDoc. |
| `TokenTable` | `group?: enum(...)` | A table of `--ch-*` tokens with light/dark values (from `TOKENS`). |
| `PaletteSwatches` | `palette: enum(...)` | Palette swatches with names and contrast. |
| Home blocks: `Hero`, `VisualLanguage`, `Gallery`, `Install`, `FeatureGrid` | Texts from the CMS; charts from the repo by id | See F16. |

- [ ] Each block has a unit test: a valid schema renders, and invalid props are rejected by the schema.
- [ ] `ChartExample` / `PropsTable` with an id missing from the registry (old content) render a visible error box in preview and dev, and render nothing on production pages. Content validation (F14) catches this in CI.
- [ ] Copy buttons have an accessible name and announce "Copied" through a live region (test).

#### F13. Example library and props-table generation
- [ ] Examples live in `apps/docs/examples/**/*.tsx`, one file per example, each with a default-exported component and a metadata `id`. They are covered by `typecheck` and lint.
- [ ] The script `pnpm --filter docs gen` generates:
  - (a) `examples.generated.ts`: id → lazy component plus source text (exactly the file contents);
  - (b) `api.generated.json`: props and parameters of every public symbol, from the API Extractor docModel (`docModel.enabled: true`, `.api.json` files) for `tally-charts` and `tally-charts/core`.
  It runs before `dev`, `build` and `test`.
- [ ] Test: the source text shown in `ChartExample` equals the contents of the example file.
- [ ] Test: every example renders without errors in jsdom, and there is an SSR test (`renderToString`) for examples marked as RSC-safe.
- [ ] The 9 reference compositions (`docs/reference/01…09`) are ported to `apps/docs/examples/reference/` as live examples for the gallery.

#### F14. Content validation
- [ ] The script `pnpm --filter docs check:content` validates every page (fixtures, and also live CMS pages when the env vars are set):
  - (a) every block has a known `type` and props that pass the schema;
  - (b) `exampleId` and `symbol` exist;
  - (c) internal `/docs/*` links point at existing slugs;
  - (d) **API coverage:** every exported component and function from `api/*.api.md` is used in at least one `PropsTable` on some page.
- [ ] In CI it runs on fixtures and fails on errors (test: a fixture with a bad `exampleId` makes it fail).

#### F15. Docs content (fixtures plus seed)
Agents write the content as JSON fixtures in `DeliveryPage` format. The source material is the README, `docs/a11y.md` and the existing stories.
- [ ] **Pages (slugs):**
  - `home`
  - `getting-started`
  - `composition` (`Chart` and its primitives: Bars, Line, Area, Dots, Axis, Grid, Target, Region, Band, Callout, Connector, ValueLabel, RowLabels, RowDividers, Tooltip, NearestPointer, ColumnHighlight, DataTable)
  - `theming` (tokens, `data-ch-part`, `data-ch-*`)
  - `palettes`
  - `time-scales`
  - `formatting` (`fmt`, `createFormatter`, `createDateFormatter`, presets)
  - `thresholds` (`thresholds()`, `inclusive`, `heatmapLevel`)
  - `accessibility` (from `docs/a11y.md`, including §Known limits)
  - `server-components`
  - `dark-mode` (including the next-themes recipe)
  - `stability` (F7)
  - `migration-1-0` (F23)
  - chart pages: `bar-chart`, `comparison-bars`, `ranked-bars`, `waterfall-chart`, `bridge-chart`, `dot-histogram`, `strip-plot`, `waffle-columns`, `line-chart`, `heatmap`, `runway-chart` (with `runwayForecast`)
  - `small-pieces` (Stat, Meter, RangeMeter, InlineBar, Delta, DotCount, ShareBar, ZoneMeter, Legend, TooltipPill)
  - `hooks-and-providers` (ChartsProvider, useChart, useFormat, useRegisterPoints)
- [ ] Each chart page has a description of when to use the chart, at least 2 `ChartExample`s, a `PropsTable`, and a section on keyboard and screen readers.
- [ ] `content/navigation.json` defines the sidebar in groups: Start, Guides, Charts, Building blocks, Reference.
- [ ] `check:content` passes, including API coverage.
- [ ] The script `pnpm --filter docs seed` (admin API / glokki MCP, key from env) creates or updates the pages and navigation in the tenant from the fixtures. It is idempotent: a second run changes nothing. It has a `--dry-run` mode that prints the plan. Test: dry-run against a mock.
- [ ] **[MAINTAINER]** creates the `tally-charts` tenant and keys in glokki (delivery:read for the site, admin for the seed), runs `seed`, and configures a webhook to `/api/revalidate`. From then on the CMS is the content source, and the fixtures are test data.

#### F16. Home page
- [ ] Sections in this order:
  1. a hero with the sentence "Opinionated React charts for narrative business dashboards." and a live chart;
  2. the visual language (hatched = plan/reference, solid = actual, pink = loss, targets first-class), each with a mini chart;
  3. a gallery of the 9 reference dashboards (live examples);
  4. `npm i tally-charts` with a copy button;
  5. features (accessibility: keyboard, screen readers, forced-colors; Server Components; theming with tokens; light/dark);
  6. links to Getting started, GitHub and npm.
- [ ] The texts come from the CMS (or fixtures), and the charts are referenced by `exampleId`.
- [ ] At 375 px nothing scrolls horizontally except deliberate chart scrollers (e2e: `scrollWidth <= clientWidth` on `<body>`).
- [ ] It matches the approved design (F10): visual baselines at 1280 and 375 px, light and dark.

#### F17. Docs site CI and hosting
- [ ] A new `docs` job in `ci.yml`: `gen`, typecheck, lint, unit tests, `check:content`, `next build` on fixtures (no network, no secrets), and Playwright e2e against `next start`.
- [ ] Docs e2e:
  - every page from the navigation returns 200 with no errors in the console;
  - axe finds no violations (WCAG 2.2 A/AA) on every page, in light and dark;
  - internal links on all pages resolve;
  - visual baselines for the home page and `line-chart`.
- [ ] **[MAINTAINER]** creates a Vercel project from `apps/docs` (monorepo, build `pnpm --filter tally-charts build && pnpm --filter docs build`) with the env vars, and turns on preview deploys for PRs. Agents add `apps/docs/vercel.json` (if needed) and the instructions in `docs/releasing.md` §Docs.
- [ ] The site is publicly reachable at `*.vercel.app` and shows content from glokki. A change published in glokki is visible within 60 s, thanks to the webhook and revalidation (a manual check by the maintainer).

#### F18. Shorter README and links
- [ ] `packages/tally-charts/README.md` contains: one sentence of description, install, the `theme.css` import, a minimal example, a short "Stability" section (with a link), and links to the docs site, GitHub and the CHANGELOG. It is at most ~120 lines. The removed content lives on the site.
- [ ] `homepage` in `packages/tally-charts/package.json` points at the docs site URL.
- [ ] The README tests (e.g. the README check against `TOKENS`) are moved to the docs content or removed with a reason given in PROGRESS.md. CI passes.

### M6. Release candidate, accessibility, 1.0.0

#### F19. Tests for the 1.0 changes (from G)
- [ ] Every change in F1–F8 has tests, as listed in its criteria.
- [ ] e2e: a computed-style check for small marks (ZoneMeter marker, ShareBar segment) under nested `data-ch-theme="dark"` inside a light page. The test fails when the mark is invisible (verified with a mutation: hidden marker → red).
- [ ] The remaining G items are listed in PROGRESS.md as the 1.0.x backlog.

#### F20. Release candidate `1.0.0-rc.0`
- [ ] Changesets in pre mode (`rc`). The Version PR produces `1.0.0-rc.0` with a CHANGELOG containing every 1.0 change and a link to the migration page.
- [ ] Publishing goes through the `release.yml` workflow (F9), with provenance, to dist-tag `next`. `latest` stays `0.9.0`.
- [ ] **[MAINTAINER]** bumps glokki-cms/editor to `1.0.0-rc.0` and confirms the editor's CI passes and the Performance screen works.

#### F21. Manual accessibility pass (H)
- [ ] **[MAINTAINER]** on the RC, on the docs site and on Storybook:
  - the VoiceOver script from `docs/a11y.md` §Manual checklist (LineChart, RankedBars, Heatmap, plus RunwayChart);
  - NVDA plus Firefox or Chrome in a Windows VM;
  - Windows high contrast;
  - real 400% browser zoom.
  JAWS is not tested.
- [ ] The results (date, versions of the screen reader, browser and system, and a pass/fail list) are written down in `docs/a11y.md` §Manual results.
- [ ] **Blockers for 1.0:** findings that need an API change, or that make a chart unusable with a screen reader. They are fixed (with a test where possible) and published as the next `rc`. Everything else is written into the 1.0.x backlog.

#### F22. Release 1.0.0
- [ ] Leave pre mode (`changeset pre exit`). The Version PR produces `1.0.0`.
- [ ] Publishing goes through the workflow, with provenance, to `latest`. The `v1.0.0` tag and the GitHub Release exist.
- [ ] The README status says 1.0 and strict semver. The main spec's roadmap marks 1.0 as done.

#### F23. Migration guide 0.9 → 1.0
- [ ] The `migration-1-0` page (and a link in the CHANGELOG) lists every breaking change with before/after code:
  - the RankedBars default `fill`;
  - `title` or `aria-labelledby` being required;
  - an invalid date breaking the line (if it was previously joined in LineChart);
  - built-in string wording no longer being part of the API.
  It also lists the additive changes: `underlay`, `createDateFormatter` in core, the hint only on selectable points.
- [ ] Each "after" example is a file in `apps/docs/examples/migration/` (type-checked).

## 4. Out of scope

- New chart types, a smaller Stat variant, `inclusive` for Heatmap and RunwayChart, a public token for tinting text by tone, a `status` callback story and a named projection point type in RunwayChart (bucket I → 1.x).
- The remaining E items (unbounded tick count, reversed time domain, inline time `x` re-sorting, Region out of domain, the `TimeInput` message, `unwrapPoint`, the `fitTimeTicks` cap, the ComparisonBars and Waterfall issues), all of F (visual polish) and the remaining G items (→ 1.0.x).
- JAWS testing.
- Translations of the docs site (English only). Versioned docs (one version, the current `main`). Site search. Analytics and A/B tests in glokki. Forms. A custom domain (the maintainer can add one later as config only).
- Publishing Storybook (it stays an internal dev, e2e and visual-baseline tool).
- Changes in the glokki-cms/editor repo (outside the RC bump done by the maintainer).
- An image logo or brand identity beyond the text wordmark.

## 5. Data model

### 5.1 Library (changes to public types)
- `RankedBarsProps.fill`: default `'solid'` (was `'hatch'`).
- `LineChartProps.underlay?: ReactNode` (new).
- Naming for `ChartProps` and the props of the 11 high-level charts: a union `{ title: string; 'aria-labelledby'?: string } | { title?: undefined; 'aria-labelledby': string }`. Where a chart gets no other `title`, it gains this union.
- `tally-charts/core`: new export `createDateFormatter` (the existing `DateFormatOptions` / `DateFormatSpec` / `DateFormatter` types).

### 5.2 Docs site
- **`DeliveryPage`** (glokki): `id`, `slug`, `locale` (always `en`), `title`, `componentTree: ComponentNode[]`, `seo`, `publishedAt`. The fixtures have exactly this shape.
- **`ComponentNode`**: `id`, `type` (block key from F12), `props`, `children?`, `slot?`.
- **Navigation**: groups `{ label, items: { label, slug }[] }`, from glokki `navigation` or `content/navigation.json`.
- **Example registry** (generated): `Record<ExampleId, { load: () => Promise<Component>, source: string, title: string, rscSafe: boolean }>`.
- **API model** (generated from `.api.json`): `Record<Symbol, { kind: 'component' | 'function' | 'hook', package: 'tally-charts' | 'tally-charts/core', props|params: { name, type, required, default?, description }[] }>`.
- **Tokens / palettes**: read from the package's `TOKENS` and palettes at build time.

## 6. Stack and architecture

### 6.1 Monorepo (unchanged)
pnpm 12 workspace, Node ≥ 22 (CI 24), TypeScript 6, Biome, Vitest 5, Playwright 1.64, changesets 3.
- `packages/tally-charts`: the library (tsdown, API Extractor, size-limit).
- `apps/storybook`: internal (Storybook 10, e2e and visual baselines).
- `apps/docs` (**new**): Next.js (current stable, App Router), React 19, `@glokki-cms/sdk`, `@glokki-cms/react`, `zod` 4, markdown (GFM, sanitized), server-side highlighting (e.g. shiki).

### 6.2 Docs site: data flow
```
glokki (editor on glokki.com) ── delivery API ──▶ ContentSource ──▶ CMSPage(registry) ──▶ blocks
                                         ▲ fixtures (no CMS_BASE_URL: CI, dev)
repo: apps/docs/examples/*.tsx ─┐
      api/*.api.json ───────────┼─ gen ─▶ examples.generated.ts / api.generated.json ─▶ ChartExample / PropsTable
      TOKENS, palettes ─────────┘
```
- Text, structure, navigation and SEO come from the CMS. Everything tied to code comes from the repo, referenced by id.
- The docs site always uses `tally-charts` from the workspace, so the docs match `main`.
- Hosting: Vercel (the default `*.vercel.app` domain), static generation plus on-demand revalidation (`cms` tag, glokki webhook → `/api/revalidate`).

### 6.3 Releases
- `.github/workflows/ci.yml`: check, react18, e2e (Storybook), docs (new).
- `.github/workflows/release.yml`: `changesets/action` (Version PR) → publish job (checks → `npm-publish` environment → `pnpm changeset publish` through OIDC with provenance → tag and GitHub Release).

### 6.4 Environment variables (`apps/docs/.env.example`)
`CMS_BASE_URL`, `CMS_TENANT`, `CMS_API_KEY`, `NEXT_PUBLIC_CMS_TENANT`, `APP_ENV`, `REVALIDATE_SECRET`, `SITE_URL`. The seed also uses `CMS_ADMIN_API_KEY` (only locally, by the maintainer). The release workflow has no secrets (OIDC).

### 6.5 Proposed commands for CLAUDE.md
- install: `pnpm install`
- dev: `pnpm --filter storybook-app dev` (Storybook), `pnpm --filter docs dev` (docs site, fixtures without env)
- tests: `pnpm test`, `pnpm --filter docs test`, `pnpm test:e2e`, `pnpm --filter docs test:e2e`
- lint: `pnpm lint`, `pnpm typecheck`
- build: `pnpm build`, `pnpm --filter docs build`
- checks: `pnpm --filter tally-charts api:check`, `pnpm size`, `pnpm --filter tally-charts check:dev-strip`, `pnpm --filter tally-charts check:treeshake`, `pnpm --filter docs check:content`

## 7. Non-functional requirements

- **Semver:** from 1.0.0, strict. Every PR that changes the package has a changeset. `api:check` guards the public surface.
- **Package size:** every size-limit entry passes (LineChart ≤ 14 KB after F8, the rest unchanged). `check:treeshake` passes. No new runtime dependencies in the library.
- **Compatibility:** React 18.2+ and 19 (the CI react18 job keeps passing), SSR/RSC as in 0.9 (the `ssr.node` and hydration tests pass).
- **Accessibility:**
  - the library meets WCAG 2.2 AA, as checked by the existing CI gates;
  - the docs site has axe-clean pages in light and dark, works fully from the keyboard (skip link, visible focus), reflows at 320 CSS px with no horizontal scroll on the page, and has text contrast ≥ 4.5:1 (including `--ch-ink-muted` on the site's backgrounds);
  - prefers-reduced-motion is respected.
- **Docs site performance:** Lighthouse (mobile, `next start`, fixtures) on `/` and `/docs/line-chart`: Performance ≥ 90, Accessibility 100, SEO ≥ 95. Examples below the fold load lazily.
- **Security:** no secrets in the repo; markdown from the CMS is sanitized (no raw HTML or scripts); the revalidation endpoint is protected by a secret; the delivery key has delivery:read scope only.
- **Determinism and CI with no network:** the docs build and tests run on fixtures, with no access to glokki. The visual baselines are stable (live charts with fixed data, no animation in e2e).
- **SEO:** a sitemap, canonical URLs, OG; `noindex` outside production.

## 8. Definition of done for the whole project

1. F1–F23 have all their criteria checked. The [MAINTAINER] tasks are confirmed in PROGRESS.md.
2. CI on `main` is green: check, react18, e2e, docs.
3. `tally-charts@1.0.0` is on npm under `latest`, published from CI with provenance. `0.0.0-stage` is deprecated. There is no npm token in the repo.
4. The docs site is publicly reachable and serves content from glokki. It has every page from F15. `check:content` (including API coverage) passes against the live CMS.
5. The README is shortened and `homepage` points at the site.
6. The manual a11y pass results are recorded in `docs/a11y.md`, with no open blockers.
7. The 1.0.x backlog (the rest of E, F and G, plus non-blocking a11y findings) and the 1.x backlog (bucket I) are written into PROGRESS.md.

## 9. Open decisions (made by default)

| # | Decision | Reason / how to change it |
|---|---|---|
| D-1 | An invalid date mid-series **breaks** the line, in Line, Area and LineChart alike. | It doesn't draw data that doesn't exist (the d3 `defined` convention). If one of these used to join the line, that's a behaviour change listed in the migration guide. |
| D-2 | The naming requirement (F3) covers `Chart` and the 11 high-level charts, not the small pieces (Stat, Meter…). | The small pieces aren't standalone application widgets. |
| D-3 | `createDateFormatter` goes into `tally-charts/core` already in 1.0. | Additive, and needed on the Formatting page. Could move to 1.1 if it turns out to have open questions. |
| D-4 | Props tables come from the API Extractor docModel (`.api.json`), not from parsing `.api.md`. | A structured model with TSDoc. It needs `docModel.enabled: true`, with no change to the public API. |
| D-5 | The `api:check` stale-dist check works by comparing mtimes, not by building first. | CI already builds, so there's no double build. |
| D-6 | Prose in the CMS is a `markdown` field (textarea), not glokki `richtext`. | The format of richtext data isn't documented clearly enough. If the agent confirms the format in the SDK docs during F12, it can switch `Prose` to richtext and record that here. |
| D-7 | Docs site slugs are flat (`/docs/<slug>`); the hierarchy lives only in the navigation. | The glokki route pattern is `[slug]`. Simpler static generation. |
| D-8 | The RC is published in pre mode `rc` (version `1.0.0-rc.N`) to dist-tag **`next`** (`changeset publish --tag next`). | As agreed with the maintainer. If changesets ignores `--tag` in pre mode, the fallback is dist-tag `rc`, recorded in PROGRESS.md; what matters is that `latest` doesn't move. |
| D-9 | The 9 reference compositions are ported to `apps/docs/examples/reference/`. Storybook keeps its own stories (it may import from there later, optionally). | Live examples on the site without depending on the Storybook build. |
| D-10 | The docs site shows the docs of `main` (workspace), not the version on npm. | Simpler. The header shows the version. Versioned docs are out of scope. |
| D-11 | The size budget for LineChart is raised to 14 KB only after `check:treeshake` confirms an honest measurement; otherwise LineChart gets slimmed. | As agreed with the maintainer. Budgets are not API. |
| D-12 | Order of work: M1 → M2 → M3 can run in parallel with M4. M5 starts after the design gate (F10); F12 and F13 may start earlier. M6 comes last. | The gate exists because the maintainer asked to see the design first. |
