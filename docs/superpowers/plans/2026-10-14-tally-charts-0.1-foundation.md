# tally-charts 0.1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 0.1 foundation of `tally-charts`: workspace and toolchain, theme tokens, the `core` utilities, the `<Chart>` root, and the `Bars`, `Axis`, `Target`, `ValueLabel`, `Tooltip`, `TooltipPill` and `Legend` building blocks. The deliverable is a reference story that recreates the "Last 12 weeks" card and passes visual, accessibility and bundle-size checks.

**Architecture:** A pnpm workspace with the library in `packages/tally-charts` and a Storybook app in `apps/storybook`.
- `src/core` is React-free TypeScript: accessors, formatters, scales, ticks, bar layout, tooltip placement and warnings.
- `src/react` holds the `<Chart>` root, which owns size, scales, shared hatch `<defs>` and the interaction store, plus building blocks that read it through context.
- `src/theme/theme.css` defines every `--ch-*` token and the base styles.

**Tech Stack:**
- **Language and UI:** TypeScript 6.0.3, React 19.3 (peer `^18.2 || ^19`)
- **Runtime dependencies:** d3-scale 4 (band scales only), d3-array 3
- **Build:** tsdown 0.23
- **Tests:** Vitest 5 + jsdom + Testing Library, Playwright 1.64 + axe-core
- **Tooling:** Storybook 10.6, Biome 2.5, size-limit 14, Changesets 3

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-design.md`. Reference screenshots: `docs/reference/*.png`; this plan targets `01-gross-margin-waterfall.png`, bottom-left card "Last 12 weeks".

This is plan 1 of 6. Later plans: 0.2 bar charts + small UI pieces, 0.3 waterfall/bridge, 0.4 dot charts, 0.5 line + heatmap, 1.0 freeze/docs.

## Global Constraints

**Toolchain and packaging**
- Node `>=22` (developed on 24); `packageManager` is `pnpm@12.4.2`.
- Exact dev versions: typescript 6.0.3, tsdown 0.23.1, vitest 5.0.4, jsdom 30.1.2, @testing-library/react 16.3.3, @testing-library/jest-dom 7.0.1, @vitejs/plugin-react 6.1.2, vite 8.3.4, react / react-dom / @types/react / @types/react-dom 19.3.0, @biomejs/biome 2.5.15, size-limit + @size-limit/preset-small-lib 14.2.0, @changesets/cli 3.0.3, storybook + @storybook/react-vite 10.6.2, @playwright/test 1.64.0, @axe-core/playwright 4.13.0, http-server 14.1.1.
- Runtime dependencies in 0.1: `d3-scale@^4.0.2` (import `scaleBand` only, never `scaleLinear`) and `d3-array@^3.2.4`. Nothing else.
- ESM only. `sideEffects: ["*.css"]`. Subpath exports `tally-charts`, `tally-charts/core`, `tally-charts/theme.css`.
- Bundle budgets (min+gzip, d3 included): `core` ≤ 8 KB; `{ Chart, Bars, Axis, Target, Tooltip }` ≤ 15 KB.

**Naming and API surface**
- CSS tokens use the `--ch-` prefix. Part hooks are `data-ch-part`, `data-ch-tone`, `data-ch-fill`. `ch-*` class names are internal, not API.
- Tones: `accent | accent-soft | loss | warn | gain | neutral`. Fills: `solid | hatch | hatch-fade`.

**Formatting**
- Default locale `en-US`, currency `USD`. Negative numbers use U+2212 (`−`), never a hyphen.

**Errors and warnings**
- Bad data never throws. The only throw is a building block rendered outside `<Chart>`.
- Development warnings go through `createWarner()`, start with `[tally-charts] `, fire once per key per chart, and are silent in production.

**Accessibility and motion**
- The chart root is a `<figure>` and a single tab stop. Every hover state is also reachable by keyboard. `prefers-reduced-motion` and `animate={false}` disable all motion.

**Code style and commits**
- Biome formatting: 2 spaces, single quotes, no semicolons, line width 100. Run `pnpm format` before every commit.
- Commit messages are conventional (`feat:`, `chore:`, `test:`) and end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

**Deferred** (not in 0.1, don't build): `dataTable`, label truncation with ellipsis, `Grid`, point/time scales, ↑/↓ column navigation for stacked dots, high-level charts.

## Review Focus

These failure modes follow from the spec but aren't obviously covered by a feature test. Each one has a pinned test in the task that owns the code.

1. **Two charts on one page:** pattern and mask IDs must be unique, or the second chart's hatching silently uses the first chart's patterns. Test in Task 6, "scopes pattern ids per chart".
2. **Server-render then hydrate:** must produce no hydration mismatch. Width, IDs, locale and hatch geometry must all match on first client render. Tests in Task 11, `ssr.node.test.tsx` and `hydration.test.tsx`.
3. **The active item disappears** when data updates (controlled or uncontrolled): no crash, the tooltip hides and the live region doesn't announce stale text. Tests in Task 5, "drops the active point when its data disappears", and Task 9, "hides when the active item disappears from the data".
4. **All-zero, all-negative or flat data:** geometry stays finite and bars sit on the correct zero baseline. Tests in Task 3 (`inferLinearDomain` cases) and Task 7, "draws negative values below the zero baseline" and "renders zero-height bars for all-zero data".
5. **Zero-width container** (hidden tab, `display: none`): no `NaN` or negative SVG attributes. Tests in Task 6, "keeps geometry finite at zero width", and Task 7, "keeps geometry finite at zero width".

---

## File Structure

```
package.json                     root scripts, dev tooling (private)
pnpm-workspace.yaml              workspace globs
tsconfig.base.json               shared strict compiler options
biome.json                       lint + format
.gitignore, LICENSE
.changeset/                      Changesets config + 0.1 changeset            (Task 13)
.github/workflows/ci.yml         check + e2e jobs                             (Task 13)

packages/tally-charts/
  package.json, tsconfig.json, tsdown.config.ts, vitest.config.ts, .size-limit.json, README.md
  test/setup.ts                  jest-dom, cleanup, ResizeObserver stub
  test/fixtures.tsx              LastTwelveWeeks example shared by SSR tests (Task 11)
  src/index.ts                   public main entry
  src/core/index.ts              public `tally-charts/core` entry
  src/core/types.ts              Tone, Fill, Id, Accessor, PerItem, TONES
  src/core/warn.ts               createWarner, isDev
  src/core/accessor.ts           resolveAccessor, resolvePerItem, resolveIds, toFieldGetter, FieldGetter
  src/core/format.ts             createFormatter, createFormatters, fmt
  src/core/linear.ts             linearScale, niceDomain (no d3-scale linear)
  src/core/scale.ts              ScaleSpec, ResolvedScale, createScale, inferLinearDomain
  src/core/ticks.ts              bandTicks, linearTicks, thinTicks
  src/core/bars.ts               computeBars (bar geometry)
  src/core/placement.ts          placeTooltip
  src/theme/theme.css            tokens (light, system dark, forced dark) + base styles
  src/theme/patterns.ts          patternId, fadeMaskId, paintFor, readHatchGeometry
  src/react/types.ts             ChartPoint, TooltipSegment, ActiveSource
  src/react/useIsoLayoutEffect.ts
  src/react/interaction.ts       navigate, samePoints, useInteraction
  src/react/useRegisterPoints.ts
  src/react/ChartsProvider.tsx   ChartsProvider, useFormat
  src/react/PatternDefs.tsx      shared <defs>
  src/react/useWidth.ts
  src/react/context.ts           ChartContext, useChart, Margin
  src/react/Chart.tsx            <Chart>
  src/react/marks/Bars.tsx
  src/react/marks/Target.tsx
  src/react/marks/Axis.tsx
  src/react/marks/ValueLabel.tsx
  src/react/overlays/Tooltip.tsx
  src/react/ui/TooltipPill.tsx
  src/react/ui/Legend.tsx
  (tests sit next to their source as *.test.ts / *.test.tsx)

apps/storybook/
  package.json, tsconfig.json, playwright.config.ts
  .storybook/main.ts, .storybook/preview.tsx, .storybook/preview.css, .storybook/css.d.ts
  stories/LastTwelveWeeks.stories.tsx, stories/Legend.stories.tsx
  e2e/stories.spec.ts, e2e/__screenshots__/{platform}/*.png
```

---

### Task 1: Workspace, toolchain and core primitives

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `.gitignore`, `LICENSE`
- Create: `packages/tally-charts/package.json`, `packages/tally-charts/tsconfig.json`, `packages/tally-charts/tsdown.config.ts`, `packages/tally-charts/vitest.config.ts`, `packages/tally-charts/test/setup.ts`
- Create: `packages/tally-charts/src/core/types.ts`, `src/core/warn.ts`, `src/core/accessor.ts`, `src/core/index.ts`, `src/index.ts`
- Test: `packages/tally-charts/src/core/accessor.test.ts`, `packages/tally-charts/src/core/warn.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TONES: readonly ['accent','accent-soft','loss','warn','gain','neutral']`; `type Tone`; `type Fill = 'solid'|'hatch'|'hatch-fade'`; `type Id = string|number`; `type Accessor<D,V> = (keyof D & string) | ((d: D, i: number) => V)`; `type PerItem<D,V> = V | ((d: D, i: number, all: readonly D[]) => V)`.
  - `type Warn = (key: string, message: string) => void`; `createWarner(): Warn`; `isDev: boolean`.
  - `type FieldGetter = (d: unknown, i: number) => unknown`; `resolveAccessor<D,V>(a: Accessor<D,V>): (d: D, i: number) => V`; `resolvePerItem<D,V>(v: PerItem<D,V>): (d: D, i: number, all: readonly D[]) => V`; `resolveIds<D>(data, accessor: Accessor<D,Id>|undefined, warn: Warn): Id[]`; `toFieldGetter<D>(a: Accessor<D,unknown>|undefined): FieldGetter|undefined`.

- [ ] **Step 1: Create the root workspace files**

`package.json`:
```json
{
  "name": "tally-charts-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.4.2",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "pnpm --filter tally-charts build",
    "test": "pnpm --filter tally-charts test",
    "typecheck": "pnpm -r typecheck",
    "lint": "biome check .",
    "format": "biome check --write .",
    "size": "pnpm --filter tally-charts size",
    "test:e2e": "pnpm --filter storybook-app test:e2e"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.15",
    "@changesets/cli": "3.0.3",
    "typescript": "6.0.3"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - packages/*
  - apps/*
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

`.gitignore`:
```
node_modules/
dist/
storybook-static/
test-results/
playwright-report/
*.tsbuildinfo
.DS_Store
.remember/
```

`LICENSE`:
```
MIT License

Copyright (c) 2026 tally-charts contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create the library package skeleton**

`packages/tally-charts/package.json`:
```json
{
  "name": "tally-charts",
  "version": "0.0.0",
  "description": "Opinionated React charts for narrative business dashboards.",
  "license": "MIT",
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./core": { "types": "./dist/core/index.d.ts", "default": "./dist/core/index.js" },
    "./theme.css": "./dist/theme.css"
  },
  "scripts": {
    "build": "tsdown && cp src/theme/theme.css dist/theme.css",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "size": "size-limit"
  },
  "dependencies": {
    "d3-array": "^3.2.4",
    "d3-scale": "^4.0.2"
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  },
  "devDependencies": {
    "@size-limit/preset-small-lib": "14.2.0",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@types/d3-array": "3.2.2",
    "@types/d3-scale": "4.0.9",
    "@types/node": "^24.0.0",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "jsdom": "30.1.2",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "size-limit": "14.2.0",
    "tsdown": "0.23.1",
    "typescript": "6.0.3",
    "vite": "8.3.4",
    "vitest": "5.0.4"
  }
}
```

`packages/tally-charts/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test"]
}
```

`packages/tally-charts/tsdown.config.ts`:
```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: 'esm',
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  fixedExtension: false,
  clean: true,
})
```

`packages/tally-charts/vitest.config.ts`:
```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

`packages/tally-charts/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: completes and writes `pnpm-lock.yaml`. If pnpm reports ignored or unapproved build scripts (esbuild), run `pnpm approve-builds`, approve `esbuild`, and keep the resulting `pnpm-workspace.yaml` change.

- [ ] **Step 4: Write the failing tests**

`packages/tally-charts/src/core/warn.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { createWarner, isDev } from './warn'

describe('createWarner', () => {
  it('is in development mode under vitest', () => {
    expect(isDev).toBe(true)
  })

  it('warns once per key with the library prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const warn = createWarner()
    warn('k', 'first')
    warn('k', 'again')
    warn('other', 'second')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, '[tally-charts] first')
    expect(spy).toHaveBeenNthCalledWith(2, '[tally-charts] second')
  })

  it('keeps separate memory per warner', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createWarner()('k', 'one')
    createWarner()('k', 'two')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
```

`packages/tally-charts/src/core/accessor.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from './accessor'

describe('resolveAccessor', () => {
  it('reads a key', () => {
    expect(resolveAccessor<{ a: number }, number>('a')({ a: 3 }, 0)).toBe(3)
  })

  it('calls a function with datum and index', () => {
    expect(resolveAccessor((d: { a: number }, i: number) => d.a + i)({ a: 3 }, 2)).toBe(5)
  })
})

describe('resolvePerItem', () => {
  it('wraps a constant', () => {
    expect(resolvePerItem<unknown, string>('solid')(null, 0, [])).toBe('solid')
  })

  it('passes datum, index and all items to a function', () => {
    const get = resolvePerItem<number, string>((d, i, all) => `${d}-${i}-${all.length}`)
    expect(get(2, 1, [1, 2, 3])).toBe('2-1-3')
  })
})

describe('resolveIds', () => {
  it('defaults to the index', () => {
    expect(resolveIds(['a', 'b'], undefined, () => {})).toEqual([0, 1])
  })

  it('reads ids with an accessor', () => {
    expect(resolveIds([{ id: 'x' }, { id: 'y' }], 'id', () => {})).toEqual(['x', 'y'])
  })

  it('falls back to the index for duplicate or missing ids and warns', () => {
    const warn = vi.fn()
    const rows: { id: string | undefined }[] = [{ id: 'a' }, { id: 'a' }, { id: undefined }]
    expect(resolveIds(rows, (d) => d.id as string, warn)).toEqual(['a', 1, 2])
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[0]).toBe('duplicate-id')
    expect(warn.mock.calls[0]?.[1]).toContain('index 1')
  })
})

describe('toFieldGetter', () => {
  it('returns undefined for a missing accessor', () => {
    expect(toFieldGetter(undefined)).toBeUndefined()
  })

  it('returns an untyped getter', () => {
    expect(toFieldGetter<{ v: number }>('v')?.({ v: 7 }, 0)).toBe(7)
  })
})
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test`
Expected: FAIL. Both suites report `Failed to resolve import "./warn"` / `"./accessor"`.

- [ ] **Step 6: Implement the core primitives**

`packages/tally-charts/src/core/types.ts`:
```ts
export const TONES = ['accent', 'accent-soft', 'loss', 'warn', 'gain', 'neutral'] as const

export type Tone = (typeof TONES)[number]

export type Fill = 'solid' | 'hatch' | 'hatch-fade'

export type Id = string | number

/** A field name or a function reading a value from a datum. */
export type Accessor<D, V> = (keyof D & string) | ((d: D, i: number) => V)

/** A constant or a per-item function. */
export type PerItem<D, V> = V | ((d: D, i: number, all: readonly D[]) => V)
```

`packages/tally-charts/src/core/warn.ts`:
```ts
// Module-scoped so it never conflicts with @types/node; bundlers replace the expression.
declare const process: { env: { NODE_ENV?: string } }

export type Warn = (key: string, message: string) => void

function detectDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    // No bundler and no `process` (plain browser ESM): stay quiet.
    return false
  }
}

export const isDev = detectDev()

export function createWarner(): Warn {
  const seen = new Set<string>()
  return (key, message) => {
    if (!isDev || seen.has(key)) return
    seen.add(key)
    console.warn(`[tally-charts] ${message}`)
  }
}
```

`packages/tally-charts/src/core/accessor.ts`:
```ts
import type { Accessor, Id, PerItem } from './types'
import type { Warn } from './warn'

export type FieldGetter = (d: unknown, i: number) => unknown

export function resolveAccessor<D, V>(accessor: Accessor<D, V>): (d: D, i: number) => V {
  if (typeof accessor === 'function') return accessor
  return (d) => d[accessor] as unknown as V
}

export function resolvePerItem<D, V>(
  value: PerItem<D, V>,
): (d: D, i: number, all: readonly D[]) => V {
  if (typeof value === 'function') return value as (d: D, i: number, all: readonly D[]) => V
  return () => value as V
}

export function toFieldGetter<D>(accessor: Accessor<D, unknown> | undefined): FieldGetter | undefined {
  return accessor === undefined ? undefined : (resolveAccessor(accessor) as unknown as FieldGetter)
}

export function resolveIds<D>(
  data: readonly D[],
  accessor: Accessor<D, Id> | undefined,
  warn: Warn,
): Id[] {
  if (accessor === undefined) return data.map((_, i) => i)
  const get = resolveAccessor(accessor)
  const seen = new Set<Id>()
  return data.map((d, i) => {
    const id = get(d, i)
    if (id === null || id === undefined || seen.has(id)) {
      warn('duplicate-id', `Missing or duplicate id "${String(id)}" at index ${i}; using the index instead.`)
      return i
    }
    seen.add(id)
    return id
  })
}
```

`packages/tally-charts/src/core/index.ts`:
```ts
export type { FieldGetter } from './accessor'
export { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from './accessor'
export type { Accessor, Fill, Id, PerItem, Tone } from './types'
export { TONES } from './types'
export type { Warn } from './warn'
export { createWarner, isDev } from './warn'
```

`packages/tally-charts/src/index.ts` (Task 11 replaces this with the full public surface):
```ts
export type { Accessor, Fill, Id, PerItem, Tone } from './core/types'
export { TONES } from './core/types'
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS (2 files, 12 tests).

- [ ] **Step 8: Verify typecheck, lint and build**

Run: `pnpm format && pnpm typecheck && pnpm lint && pnpm --filter tally-charts exec tsdown && ls -R packages/tally-charts/dist`
Expected: no errors; `dist` contains `index.js`, `index.d.ts`, `core/index.js`, `core/index.d.ts`. (This runs tsdown directly because the full `pnpm build` also copies `theme.css`, which Task 4 creates.) If tsdown emits `.mjs`/`.d.mts` despite `fixedExtension: false`, update the `exports` paths in `package.json` to the emitted names and say so in the commit message.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json biome.json .gitignore LICENSE packages/tally-charts
git commit -m "chore: scaffold tally-charts workspace with core primitives

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Formatters and ChartsProvider

**Files:**
- Create: `packages/tally-charts/src/core/format.ts`, `packages/tally-charts/src/react/ChartsProvider.tsx`
- Modify: `packages/tally-charts/src/core/index.ts` (append exports)
- Test: `packages/tally-charts/src/core/format.test.ts`, `packages/tally-charts/src/react/ChartsProvider.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type FormatPreset = 'currency'|'currency-compact'|'percent'|'pts'|'number'|'hours'`; `type FormatSpec = FormatPreset | ((value: number) => string)`; `type Formatter = (value: number) => string`; `interface LocaleOptions { locale?: string; currency?: string }`; `interface FormatOptions extends LocaleOptions { signed?: boolean }`.
  - `createFormatter(spec?: FormatSpec, options?: FormatOptions): Formatter`.
  - `interface Formatters { currency; currencyCompact; percent; pts; number; hours }`; `createFormatters(options?: LocaleOptions): Formatters`; `fmt: Formatters`.
  - `DEFAULT_LOCALE = 'en-US'`, `DEFAULT_CURRENCY = 'USD'`.
  - `ChartsProvider({ locale?, currency?, children })`; `useFormat(): UseFormatResult` where `UseFormatResult extends Formatters { create(spec?: FormatSpec, options?: { signed?: boolean }): Formatter }`.
  - **Percent semantics:** `percent` takes percentage points (`34` → `34.0%`).

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/core/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { createFormatter, type FormatPreset, fmt } from './format'

const norm = (s: string) => s.replace(/\s/g, ' ')

describe('createFormatter (en-US defaults)', () => {
  it.each<[FormatPreset, number, string]>([
    ['currency', 3240, '$3,240'],
    ['currency', -260, '−$260'],
    ['currency-compact', 82400, '$82.4K'],
    ['currency-compact', 1860000, '$1.86M'],
    ['currency-compact', 7700, '$7.7K'],
    ['currency-compact', 860, '$860'],
    ['percent', 34, '34.0%'],
    ['percent', 12.3, '12.3%'],
    ['pts', -1.6, '−1.6 pts'],
    ['pts', 1.5, '+1.5 pts'],
    ['pts', 0, '0.0 pts'],
    ['number', 158, '158'],
    ['number', 1234.56, '1,234.6'],
    ['hours', 7.8, '7.8 h'],
    ['hours', 12, '12 h'],
  ])('%s(%d) → %s', (preset, value, expected) => {
    expect(createFormatter(preset)(value)).toBe(expected)
  })

  it('defaults to the number preset', () => {
    expect(createFormatter()(2.25)).toBe('2.3')
  })

  it('adds an explicit plus sign when signed', () => {
    expect(createFormatter('currency', { signed: true })(420)).toBe('+$420')
  })

  it('returns an empty string for non-finite values', () => {
    expect(createFormatter('percent')(Number.NaN)).toBe('')
  })

  it('passes custom functions through unchanged', () => {
    const custom = (v: number) => `${v}!`
    expect(createFormatter(custom)).toBe(custom)
  })

  it('formats other locales and currencies', () => {
    expect(norm(createFormatter('currency', { locale: 'de-DE', currency: 'EUR' })(3240))).toBe(
      '3.240 €',
    )
    expect(norm(createFormatter('percent', { locale: 'de-DE' })(12.3))).toBe('12,3 %')
  })
})

describe('fmt', () => {
  it('exposes the presets as plain functions', () => {
    expect(fmt.currencyCompact(82400)).toBe('$82.4K')
    expect(fmt.pts(-1.6)).toBe('−1.6 pts')
    expect(fmt.percent(38)).toBe('38.0%')
    expect(fmt.currency(1260)).toBe('$1,260')
    expect(fmt.number(158)).toBe('158')
    expect(fmt.hours(6.1)).toBe('6.1 h')
  })
})
```

`packages/tally-charts/src/react/ChartsProvider.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartsProvider, useFormat } from './ChartsProvider'

function Probe() {
  const f = useFormat()
  return (
    <span>
      {f.currency(3240)} | {f.create('pts')(-1.6)}
    </span>
  )
}

describe('ChartsProvider / useFormat', () => {
  it('uses en-US and USD without a provider', () => {
    render(<Probe />)
    expect(screen.getByText('$3,240 | −1.6 pts')).toBeInTheDocument()
  })

  it('uses the provider locale and currency', () => {
    render(
      <ChartsProvider locale="de-DE" currency="EUR">
        <Probe />
      </ChartsProvider>,
    )
    expect(screen.getByText('3.240 € | −1,6 pts')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/core/format.test.ts src/react/ChartsProvider.test.tsx`
Expected: FAIL with `Failed to resolve import "./format"` and `"./ChartsProvider"`.

- [ ] **Step 3: Implement the formatters**

`packages/tally-charts/src/core/format.ts`:
```ts
export type FormatPreset = 'currency' | 'currency-compact' | 'percent' | 'pts' | 'number' | 'hours'
export type FormatSpec = FormatPreset | ((value: number) => string)
export type Formatter = (value: number) => string

export interface LocaleOptions {
  locale?: string
  currency?: string
}

export interface FormatOptions extends LocaleOptions {
  /** Show an explicit `+` on positive values. Defaults to true for `pts`. */
  signed?: boolean
}

export const DEFAULT_LOCALE = 'en-US'
export const DEFAULT_CURRENCY = 'USD'
const MINUS = '−'

interface PresetConfig {
  intl: Intl.NumberFormatOptions
  divisor?: number
  suffix?: string
}

function presetConfig(preset: FormatPreset, currency: string): PresetConfig {
  switch (preset) {
    case 'currency':
      return {
        intl: { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 },
      }
    case 'currency-compact':
      return {
        intl: { style: 'currency', currency, notation: 'compact', maximumSignificantDigits: 3 },
      }
    case 'percent':
      // Values are percentage points: 34 means 34%.
      return {
        intl: { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
        divisor: 100,
      }
    case 'pts':
      return { intl: { minimumFractionDigits: 1, maximumFractionDigits: 1 }, suffix: ' pts' }
    case 'hours':
      return { intl: { maximumFractionDigits: 1 }, suffix: ' h' }
    case 'number':
      return { intl: { maximumFractionDigits: 1 } }
  }
}

export function createFormatter(spec: FormatSpec = 'number', options: FormatOptions = {}): Formatter {
  if (typeof spec === 'function') return spec
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = options
  const signed = options.signed ?? spec === 'pts'
  const { intl, divisor = 1, suffix = '' } = presetConfig(spec, currency)
  const nf = new Intl.NumberFormat(locale, { ...intl, signDisplay: signed ? 'exceptZero' : 'auto' })
  return (value) =>
    Number.isFinite(value) ? nf.format(value / divisor).replaceAll('-', MINUS) + suffix : ''
}

export interface Formatters {
  currency: Formatter
  currencyCompact: Formatter
  percent: Formatter
  pts: Formatter
  number: Formatter
  hours: Formatter
}

export function createFormatters(options: LocaleOptions = {}): Formatters {
  return {
    currency: createFormatter('currency', options),
    currencyCompact: createFormatter('currency-compact', options),
    percent: createFormatter('percent', options),
    pts: createFormatter('pts', options),
    number: createFormatter('number', options),
    hours: createFormatter('hours', options),
  }
}

/** Preset formatters with the default locale (`en-US`, USD). */
export const fmt: Formatters = /* @__PURE__ */ createFormatters()
```

`packages/tally-charts/src/react/ChartsProvider.tsx`:
```tsx
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import {
  createFormatter,
  createFormatters,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  type FormatOptions,
  type Formatter,
  type Formatters,
  type FormatSpec,
} from '../core/format'

interface LocaleContextValue {
  locale: string
  currency: string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
})

export interface ChartsProviderProps {
  locale?: string
  currency?: string
  children?: ReactNode
}

export function ChartsProvider({
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY,
  children,
}: ChartsProviderProps) {
  const value = useMemo(() => ({ locale, currency }), [locale, currency])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export interface UseFormatResult extends Formatters {
  create: (spec?: FormatSpec, options?: Pick<FormatOptions, 'signed'>) => Formatter
}

export function useFormat(): UseFormatResult {
  const { locale, currency } = useContext(LocaleContext)
  return useMemo<UseFormatResult>(
    () => ({
      ...createFormatters({ locale, currency }),
      create: (spec, options) => createFormatter(spec, { locale, currency, ...options }),
    }),
    [locale, currency],
  )
}
```

Append to `packages/tally-charts/src/core/index.ts`:
```ts
export type {
  FormatOptions,
  FormatPreset,
  FormatSpec,
  Formatter,
  Formatters,
  LocaleOptions,
} from './format'
export { createFormatter, createFormatters, DEFAULT_CURRENCY, DEFAULT_LOCALE, fmt } from './format'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS. If the `de-DE` currency case differs only by a non-breaking space, `norm` already handles it; any other difference is a real bug.

- [ ] **Step 5: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src
git commit -m "feat: add Intl-based formatters, fmt and ChartsProvider

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Scales and ticks

**Files:**
- Create: `packages/tally-charts/src/core/linear.ts`, `src/core/scale.ts`, `src/core/ticks.ts`
- Modify: `packages/tally-charts/src/core/index.ts` (append exports)
- Test: `src/core/linear.test.ts`, `src/core/scale.test.ts`, `src/core/ticks.test.ts`

**Interfaces:**
- Consumes: `Accessor`, `FieldGetter`, `toFieldGetter`, `Warn` (Task 1).
- Produces:
  - `interface LinearScale { (v: number): number; domain(): [number, number]; range(): [number, number]; ticks(count?: number): number[] }`; `linearScale(domain, range): LinearScale`; `niceDomain(domain, count?): [number, number]`.
  - `interface LinearScaleSpec<D> { type?: 'linear'; field?: Accessor<D, number>; domain?: readonly [number, number]; nice?: boolean; zero?: boolean }`.
  - `interface BandScaleSpec<D> { type: 'band'; field?: Accessor<D, string|number>; domain?: readonly (string|number)[]; padding?: number; paddingOuter?: number }`.
  - `type ScaleSpec<D> = LinearScaleSpec<D> | BandScaleSpec<D>`.
  - `type ResolvedScale = { kind: 'band'; scale: ScaleBand<string>; field?: FieldGetter } | { kind: 'linear'; scale: LinearScale; field?: FieldGetter }`.
  - `inferLinearDomain(values, zero = true): [number, number]`; `createScale<D>(spec, data, axis: 'x'|'y', length: number, warn): ResolvedScale`. Linear y ranges are inverted (`[length, 0]`). Band padding defaults to 0.2. An inferred linear domain is niced by default; an explicit one never is.
  - `type TickSpec = 'all'|'ends'|number`; `interface Tick { value: string|number; position: number; label: string; anchor: 'start'|'middle'|'end' }`; `bandTicks(scale, spec, format: (v: string) => string): Tick[]`; `linearTicks(scale, spec, format: (v: number) => string): Tick[]`; `type MeasureTick = (t: Tick) => number`; `estimateWidth: MeasureTick`; `thinTicks(ticks, measure?): Tick[]`.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/core/linear.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { linearScale, niceDomain } from './linear'

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const s = linearScale([0, 40], [200, 0])
    expect(s(0)).toBe(200)
    expect(s(20)).toBe(100)
    expect(s(40)).toBe(0)
    expect(s.domain()).toEqual([0, 40])
    expect(s.range()).toEqual([200, 0])
  })

  it('maps a flat domain to the range start instead of NaN', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0)
  })

  it('produces round ticks', () => {
    expect(linearScale([0, 40], [0, 1]).ticks(4)).toEqual([0, 10, 20, 30, 40])
  })
})

describe('niceDomain', () => {
  it('extends to round numbers', () => {
    expect(niceDomain([3.2, 37.9])).toEqual([0, 40])
  })
})
```

`packages/tally-charts/src/core/scale.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { createScale, inferLinearDomain } from './scale'

const noop = () => {}

describe('inferLinearDomain', () => {
  it('includes zero by default', () => {
    expect(inferLinearDomain([12, 30])).toEqual([0, 30])
  })

  it('anchors all-negative data at zero', () => {
    expect(inferLinearDomain([-5, -2])).toEqual([-5, 0])
  })

  it('returns [0, 1] for empty or all-zero data', () => {
    expect(inferLinearDomain([])).toEqual([0, 1])
    expect(inferLinearDomain([0, 0])).toEqual([0, 1])
  })

  it('pads a flat domain when zero is off', () => {
    expect(inferLinearDomain([10, 10], false)).toEqual([9, 11])
  })

  it('ignores non-finite values', () => {
    expect(inferLinearDomain([Number.NaN, 4])).toEqual([0, 4])
  })
})

describe('createScale', () => {
  const rows = [
    { week: 'Jul 6', margin: 36 },
    { week: 'Jul 13', margin: 33 },
  ]

  it('builds a band scale from the field in data order', () => {
    const s = createScale({ type: 'band', field: 'week', padding: 0 }, rows, 'x', 200, noop)
    if (s.kind !== 'band') throw new Error('expected a band scale')
    expect(s.scale.domain()).toEqual(['Jul 6', 'Jul 13'])
    expect(s.scale.bandwidth()).toBe(100)
  })

  it('builds an inverted y scale with a niced inferred domain', () => {
    const s = createScale({ field: 'margin' }, rows, 'y', 100, noop)
    if (s.kind !== 'linear') throw new Error('expected a linear scale')
    expect(s.scale.domain()).toEqual([0, 40])
    expect(s.scale(0)).toBe(100)
    expect(s.scale(40)).toBe(0)
  })

  it('keeps an explicit domain as given', () => {
    const s = createScale({ domain: [26, 39] }, rows, 'x', 130, noop)
    if (s.kind !== 'linear') throw new Error('expected a linear scale')
    expect(s.scale.domain()).toEqual([26, 39])
    expect(s.scale(26)).toBe(0)
  })

  it('exposes the field getter', () => {
    const s = createScale({ field: 'margin' }, rows, 'y', 100, noop)
    expect(s.field?.(rows[0], 0)).toBe(36)
  })

  it('warns when a domain cannot be inferred', () => {
    const warn = vi.fn()
    createScale({ type: 'band' }, rows, 'x', 100, warn)
    createScale(undefined, rows, 'y', 100, warn)
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[1]).toContain('<Chart x>')
    expect(warn.mock.calls[1]?.[1]).toContain('<Chart y>')
  })
})
```

`packages/tally-charts/src/core/ticks.test.ts`:
```ts
import { scaleBand } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { linearScale } from './linear'
import { bandTicks, linearTicks, type Tick, thinTicks } from './ticks'

const band = scaleBand<string>().domain(['a', 'b', 'c', 'd']).range([0, 400]).paddingInner(0)

describe('bandTicks', () => {
  it('places ticks at band centres', () => {
    expect(bandTicks(band, 'all', String).map((t) => t.position)).toEqual([50, 150, 250, 350])
  })

  it('anchors end ticks to the outer band edges', () => {
    const [first, last] = bandTicks(band, 'ends', String)
    expect(first).toMatchObject({ value: 'a', position: 0, anchor: 'start' })
    expect(last).toMatchObject({ value: 'd', position: 400, anchor: 'end' })
  })

  it('takes every nth band for a numeric spec', () => {
    expect(bandTicks(band, 2, String).map((t) => t.value)).toEqual(['a', 'c'])
  })
})

describe('linearTicks', () => {
  it('formats round ticks', () => {
    const ticks = linearTicks(linearScale([0, 40], [0, 400]), 4, (v) => `${v}%`)
    expect(ticks.map((t) => t.label)).toEqual(['0%', '10%', '20%', '30%', '40%'])
    expect(ticks[1]?.position).toBe(100)
  })

  it('returns the domain ends for "ends"', () => {
    expect(linearTicks(linearScale([0, 60], [0, 600]), 'ends', String).map((t) => t.value)).toEqual(
      [0, 60],
    )
  })
})

describe('thinTicks', () => {
  const row = (count: number, spacing: number, label: string): Tick[] =>
    Array.from({ length: count }, (_, i) => ({
      value: i,
      position: i * spacing,
      label,
      anchor: 'middle' as const,
    }))

  it('keeps ticks that fit', () => {
    expect(thinTicks(row(3, 100, 'Sep')).map((t) => t.value)).toEqual([0, 1, 2])
  })

  it('drops every other tick when labels overlap', () => {
    expect(thinTicks(row(9, 40, 'Aug 10')).map((t) => t.value)).toEqual([0, 2, 4, 6, 8])
  })

  it('falls back to the two ends with outer anchors', () => {
    const ticks = thinTicks(row(5, 10, 'Sep 21'))
    expect(ticks.map((t) => [t.value, t.anchor])).toEqual([
      [0, 'start'],
      [4, 'end'],
    ])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/core`
Expected: FAIL with unresolved imports `./linear`, `./scale`, `./ticks`.

- [ ] **Step 3: Implement the scales and ticks**

`packages/tally-charts/src/core/linear.ts`:
```ts
import { nice, ticks } from 'd3-array'

/** A minimal linear scale. d3-scale's scaleLinear is avoided: it costs ~7.6 KB gzipped. */
export interface LinearScale {
  (value: number): number
  domain(): [number, number]
  range(): [number, number]
  ticks(count?: number): number[]
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  const scale = ((value: number) => r0 + (value - d0) * k) as LinearScale
  scale.domain = () => [d0, d1]
  scale.range = () => [r0, r1]
  scale.ticks = (count = 5) => ticks(d0, d1, count)
  return scale
}

export function niceDomain(domain: readonly [number, number], count = 5): [number, number] {
  const [start, stop] = nice(domain[0], domain[1], count)
  return [start, stop]
}
```

`packages/tally-charts/src/core/scale.ts`:
```ts
import { type ScaleBand, scaleBand } from 'd3-scale'
import { type FieldGetter, toFieldGetter } from './accessor'
import { type LinearScale, linearScale, niceDomain } from './linear'
import type { Accessor } from './types'
import type { Warn } from './warn'

export interface LinearScaleSpec<D> {
  type?: 'linear'
  field?: Accessor<D, number>
  domain?: readonly [number, number]
  /** Round an inferred domain to tick values. Default true; explicit domains are never niced. */
  nice?: boolean
  /** Include zero in an inferred domain. Default true. */
  zero?: boolean
}

export interface BandScaleSpec<D> {
  type: 'band'
  field?: Accessor<D, string | number>
  domain?: readonly (string | number)[]
  /** Inner padding between bands, 0–1. Default 0.2. */
  padding?: number
  paddingOuter?: number
}

export type ScaleSpec<D> = LinearScaleSpec<D> | BandScaleSpec<D>

export type ResolvedScale =
  | { kind: 'band'; scale: ScaleBand<string>; field?: FieldGetter }
  | { kind: 'linear'; scale: LinearScale; field?: FieldGetter }

export function inferLinearDomain(values: readonly number[], zero = true): [number, number] {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [0, 1]
  if (zero) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  if (min === max) {
    if (min === 0) return [0, 1]
    const pad = Math.abs(min) * 0.1
    return [min - pad, max + pad]
  }
  return [min, max]
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? Number.NaN : Number(value)
}

function uniqueStrings(data: readonly unknown[], field: FieldGetter): string[] {
  const seen = new Set<string>()
  for (const [i, d] of data.entries()) {
    const v = field(d, i)
    if (v !== null && v !== undefined) seen.add(String(v))
  }
  return [...seen]
}

export function createScale<D>(
  spec: ScaleSpec<D> | undefined,
  data: readonly D[],
  axis: 'x' | 'y',
  length: number,
  warn: Warn,
): ResolvedScale {
  const field = toFieldGetter<D>(spec?.field)

  if (spec?.type === 'band') {
    const domain = spec.domain ? spec.domain.map(String) : field ? uniqueStrings(data, field) : []
    if (domain.length === 0) {
      warn(`${axis}-band-domain`, `The ${axis} band scale has no domain. Set \`field\` or \`domain\` on <Chart ${axis}>.`)
    }
    const scale = scaleBand<string>()
      .domain(domain)
      .range([0, length])
      .paddingInner(spec.padding ?? 0.2)
      .paddingOuter(spec.paddingOuter ?? 0)
    return { kind: 'band', scale, field }
  }

  const linear = spec as LinearScaleSpec<D> | undefined
  let domain: [number, number]
  if (linear?.domain) {
    domain = [linear.domain[0], linear.domain[1]]
  } else if (field) {
    domain = inferLinearDomain(
      data.map((d, i) => toNumber(field(d, i))),
      linear?.zero ?? true,
    )
    if (linear?.nice ?? true) domain = niceDomain(domain)
  } else {
    warn(`${axis}-linear-domain`, `The ${axis} scale has no domain. Set \`field\` or \`domain\` on <Chart ${axis}>.`)
    domain = [0, 1]
  }
  const range: [number, number] = axis === 'y' ? [length, 0] : [0, length]
  return { kind: 'linear', scale: linearScale(domain, range), field }
}
```

`packages/tally-charts/src/core/ticks.ts`:
```ts
import type { ScaleBand } from 'd3-scale'
import type { LinearScale } from './linear'

export type TickSpec = 'all' | 'ends' | number
export type TickAnchor = 'start' | 'middle' | 'end'

export interface Tick {
  value: string | number
  position: number
  label: string
  anchor: TickAnchor
}

export function bandTicks(
  scale: ScaleBand<string>,
  spec: TickSpec,
  format: (value: string) => string,
): Tick[] {
  const domain = scale.domain()
  const bandwidth = scale.bandwidth()
  if (spec === 'ends') {
    const first = domain[0]
    const last = domain[domain.length - 1]
    if (first === undefined || last === undefined) return []
    const start = scale(first) ?? 0
    if (domain.length === 1) {
      return [{ value: first, position: start + bandwidth / 2, label: format(first), anchor: 'middle' }]
    }
    return [
      { value: first, position: start, label: format(first), anchor: 'start' },
      { value: last, position: (scale(last) ?? 0) + bandwidth, label: format(last), anchor: 'end' },
    ]
  }
  const step = typeof spec === 'number' ? Math.max(1, Math.ceil(domain.length / spec)) : 1
  return domain
    .filter((_, i) => i % step === 0)
    .map((value) => ({
      value,
      position: (scale(value) ?? 0) + bandwidth / 2,
      label: format(value),
      anchor: 'middle',
    }))
}

export function linearTicks(
  scale: LinearScale,
  spec: TickSpec,
  format: (value: number) => string,
): Tick[] {
  const values = spec === 'ends' ? scale.domain() : scale.ticks(typeof spec === 'number' ? spec : 5)
  return values.map((value) => ({ value, position: scale(value), label: format(value), anchor: 'middle' }))
}

export type MeasureTick = (tick: Tick) => number

const CHAR_WIDTH = 6.5
const MIN_GAP = 8

/** Rough width of a 12px label; good enough to decide which labels to drop. */
export const estimateWidth: MeasureTick = (tick) => tick.label.length * CHAR_WIDTH

function extent(tick: Tick, measure: MeasureTick): [number, number] {
  const size = measure(tick)
  if (tick.anchor === 'start') return [tick.position, tick.position + size]
  if (tick.anchor === 'end') return [tick.position - size, tick.position]
  return [tick.position - size / 2, tick.position + size / 2]
}

function fits(ticks: readonly Tick[], measure: MeasureTick): boolean {
  // Vertical axes list ticks top-down (descending position); compare in position order.
  const sorted = [...ticks].sort((a, b) => a.position - b.position)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const next = sorted[i]
    if (prev && next && extent(prev, measure)[1] + MIN_GAP > extent(next, measure)[0]) return false
  }
  return true
}

/** Drops labels until they stop overlapping: every other, every fourth, …, then only the ends. */
export function thinTicks(ticks: readonly Tick[], measure: MeasureTick = estimateWidth): Tick[] {
  if (ticks.length <= 2 || fits(ticks, measure)) return [...ticks]
  for (let step = 2; step < ticks.length; step *= 2) {
    const kept = ticks.filter((_, i) => i % step === 0)
    if (kept.length > 2 && fits(kept, measure)) return kept
  }
  const first = ticks[0]
  const last = ticks[ticks.length - 1]
  if (!first || !last) return []
  return [
    { ...first, anchor: 'start' },
    { ...last, anchor: 'end' },
  ]
}
```

Append to `packages/tally-charts/src/core/index.ts`:
```ts
export type { LinearScale } from './linear'
export { linearScale, niceDomain } from './linear'
export type { BandScaleSpec, LinearScaleSpec, ResolvedScale, ScaleSpec } from './scale'
export { createScale, inferLinearDomain } from './scale'
export type { MeasureTick, Tick, TickAnchor, TickSpec } from './ticks'
export { bandTicks, estimateWidth, linearTicks, thinTicks } from './ticks'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 5: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src/core
git commit -m "feat: add band/linear scales, domain inference and tick thinning

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Theme tokens and hatch patterns

**Files:**
- Create: `packages/tally-charts/src/theme/theme.css`, `src/theme/patterns.ts`, `src/react/PatternDefs.tsx`
- Test: `src/theme/theme.test.ts`, `src/theme/patterns.test.ts`, `src/react/PatternDefs.test.tsx`

**Interfaces:**
- Consumes: `TONES`, `Tone`, `Fill` (Task 1).
- Produces:
  - `type FadeAxis = 'x'|'y'`; `interface HatchGeometry { angle: number; gap: number }`; `DEFAULT_HATCH = { angle: 45, gap: 6 }`.
  - `patternId(chartId, tone): string` → `${chartId}-hatch-${tone}`; `fadeMaskId(chartId, axis)` → `${chartId}-fade-${axis}`.
  - `interface Paint { fill: string; mask?: string }`; `paintFor(chartId, tone, fill, fadeAxis = 'y'): Paint`.
  - `readHatchGeometry(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): HatchGeometry`.
  - `<PatternDefs chartId geometry />` renders `<defs>` with 6 patterns + 2 gradients + 2 masks.
  - Every class and attribute that later tasks style is defined in `theme.css`: `.ch-svg`, `.ch-overlay`, `.ch-sr-only`, `.ch-empty`, `.ch-tooltip`, `.ch-pill*`, `.ch-legend*`, `.ch-swatch`, and `[data-ch-part=...]`.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/theme/theme.test.ts`:
```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TONES } from '../core/types'

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')

describe('theme.css', () => {
  it.each(TONES)('defines --ch-%s for light, system dark and forced dark', (tone) => {
    expect(css.match(new RegExp(`--ch-${tone}:`, 'g')) ?? []).toHaveLength(3)
  })

  it.each([
    '--ch-ink:',
    '--ch-ink-muted:',
    '--ch-grid:',
    '--ch-surface:',
    '--ch-tooltip-bg:',
    '--ch-tooltip-ink:',
  ])('defines %s in all three theme blocks', (token) => {
    expect(css.split(token).length - 1).toBe(3)
  })

  it.each([
    '--ch-hatch-angle:',
    '--ch-hatch-width:',
    '--ch-hatch-gap:',
    '--ch-seq-5:',
    '--ch-duration:',
    '--ch-ease:',
    '--ch-dim-opacity:',
    '--ch-radius:',
    '--ch-font-numeric:',
  ])('defines %s', (token) => {
    expect(css).toContain(token)
  })

  it('disables motion for reduced-motion users', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
```

`packages/tally-charts/src/theme/patterns.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_HATCH, fadeMaskId, paintFor, patternId, readHatchGeometry } from './patterns'

describe('patterns', () => {
  it('builds chart-scoped ids', () => {
    expect(patternId('c1', 'loss')).toBe('c1-hatch-loss')
    expect(fadeMaskId('c1', 'x')).toBe('c1-fade-x')
  })

  it('paints solid fills with the tone token', () => {
    expect(paintFor('c1', 'loss', 'solid')).toEqual({ fill: 'var(--ch-loss)' })
  })

  it('paints hatches with the chart-scoped pattern', () => {
    expect(paintFor('c1', 'accent', 'hatch')).toEqual({ fill: 'url(#c1-hatch-accent)' })
  })

  it('adds the fade mask for hatch-fade', () => {
    expect(paintFor('c1', 'accent', 'hatch-fade', 'x')).toEqual({
      fill: 'url(#c1-hatch-accent)',
      mask: 'url(#c1-fade-x)',
    })
  })

  it('reads hatch geometry from CSS custom properties', () => {
    const values: Record<string, string> = { '--ch-hatch-angle': ' 30', '--ch-hatch-gap': '8' }
    expect(readHatchGeometry({ getPropertyValue: (n) => values[n] ?? '' })).toEqual({
      angle: 30,
      gap: 8,
    })
  })

  it('falls back to the defaults for missing or invalid values', () => {
    expect(readHatchGeometry({ getPropertyValue: () => '' })).toEqual(DEFAULT_HATCH)
    expect(readHatchGeometry({ getPropertyValue: () => '-2' }).gap).toBe(DEFAULT_HATCH.gap)
  })
})
```

`packages/tally-charts/src/react/PatternDefs.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PatternDefs } from './PatternDefs'

describe('PatternDefs', () => {
  it('defines one hatch pattern per tone and two fade masks', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 45, gap: 6 }} />
      </svg>,
    )
    expect(container.querySelectorAll('pattern')).toHaveLength(6)
    expect(container.querySelector('#c1-hatch-loss')).not.toBeNull()
    expect(container.querySelector('#c1-fade-y')).not.toBeNull()
    expect(container.querySelector('#c1-fade-x')).not.toBeNull()
  })

  it('turns the stripe angle into a pattern rotation and uses the gap as tile size', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 30, gap: 8 }} />
      </svg>,
    )
    const pattern = container.querySelector('#c1-hatch-accent')
    expect(pattern).toHaveAttribute('patternTransform', 'rotate(60)')
    expect(pattern).toHaveAttribute('width', '8')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/theme src/react/PatternDefs.test.tsx`
Expected: FAIL. `ENOENT ... theme.css`, plus unresolved `./patterns` and `./PatternDefs`.

- [ ] **Step 3: Implement theme.css**

`packages/tally-charts/src/theme/theme.css`:
```css
/* tally-charts theme — import once: import 'tally-charts/theme.css' */

/* ---------- Color tokens: light (default) ---------- */
:root,
[data-ch-theme='light'] {
  --ch-accent: #2f6bf0;
  --ch-accent-soft: #9dbcf6;
  --ch-loss: #e5368d;
  --ch-warn: #f1a23b;
  --ch-gain: #23a866;
  --ch-neutral: #a3a3ab;
  --ch-ink: #111114;
  --ch-ink-muted: #6b6b73;
  --ch-grid: #e4e4e9;
  --ch-surface: #fafafa;
  --ch-tooltip-bg: #ffffff;
  --ch-tooltip-ink: #111114;
  --ch-tooltip-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 6px 20px rgb(0 0 0 / 0.08);
  --ch-hatch-tint: 0.14;
}

/* ---------- Color tokens: dark (system preference) ---------- */
@media (prefers-color-scheme: dark) {
  :root:not([data-ch-theme='light']) {
    --ch-accent: #4d86ff;
    --ch-accent-soft: #5a7cc4;
    --ch-loss: #ff4fa0;
    --ch-warn: #ffb24d;
    --ch-gain: #3ccf86;
    --ch-neutral: #7c7c86;
    --ch-ink: #f4f4f6;
    --ch-ink-muted: #a0a0aa;
    --ch-grid: #2a2a31;
    --ch-surface: #121215;
    --ch-tooltip-bg: #1d1d22;
    --ch-tooltip-ink: #f4f4f6;
    --ch-tooltip-shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 6px 20px rgb(0 0 0 / 0.5);
    --ch-hatch-tint: 0.2;
  }
}

/* ---------- Color tokens: dark (forced on any ancestor) ---------- */
[data-ch-theme='dark'] {
  --ch-accent: #4d86ff;
  --ch-accent-soft: #5a7cc4;
  --ch-loss: #ff4fa0;
  --ch-warn: #ffb24d;
  --ch-gain: #3ccf86;
  --ch-neutral: #7c7c86;
  --ch-ink: #f4f4f6;
  --ch-ink-muted: #a0a0aa;
  --ch-grid: #2a2a31;
  --ch-surface: #121215;
  --ch-tooltip-bg: #1d1d22;
  --ch-tooltip-ink: #f4f4f6;
  --ch-tooltip-shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 6px 20px rgb(0 0 0 / 0.5);
  --ch-hatch-tint: 0.2;
}

/* ---------- Theme-independent tokens ---------- */
:root {
  /* Stripe direction in degrees from horizontal (45 draws "////"). Unitless: read by JS too. */
  --ch-hatch-angle: 45;
  --ch-hatch-width: 1.5px;
  /* Distance between stripes in px. Unitless: read by JS too. */
  --ch-hatch-gap: 6;
  --ch-font-numeric: tabular-nums;
  --ch-radius: 4px;
  --ch-duration: 400ms;
  --ch-ease: cubic-bezier(0.2, 0, 0, 1);
  --ch-dim-opacity: 0.35;
}

/* ---------- Chart root ---------- */
[data-ch-root] {
  /* Sequential bins resolve per chart so --ch-seq-base can be overridden locally. */
  --ch-seq-base: var(--ch-loss);
  --ch-seq-1: color-mix(in srgb, var(--ch-seq-base) 12%, var(--ch-surface));
  --ch-seq-2: color-mix(in srgb, var(--ch-seq-base) 30%, var(--ch-surface));
  --ch-seq-3: color-mix(in srgb, var(--ch-seq-base) 50%, var(--ch-surface));
  --ch-seq-4: color-mix(in srgb, var(--ch-seq-base) 75%, var(--ch-surface));
  --ch-seq-5: var(--ch-seq-base);
  position: relative;
  display: block;
  margin: 0;
  color: var(--ch-ink);
  font-variant-numeric: var(--ch-font-numeric);
  border-radius: 6px;
  outline: none;
}

[data-ch-root]:focus-visible {
  outline: 2px solid var(--ch-accent);
  outline-offset: 4px;
}

.ch-svg {
  display: block;
  overflow: visible;
}

.ch-overlay {
  position: absolute;
  pointer-events: none;
}

.ch-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.ch-empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--ch-ink-muted);
  font-size: 13px;
}

/* ---------- Bars ---------- */
[data-ch-part='bar'] {
  transform-box: fill-box;
  transition:
    opacity 150ms ease,
    x var(--ch-duration) var(--ch-ease),
    y var(--ch-duration) var(--ch-ease),
    width var(--ch-duration) var(--ch-ease),
    height var(--ch-duration) var(--ch-ease);
}

[data-ch-part='bar'][data-ch-dir='up'] {
  transform-origin: 50% 100%;
}

[data-ch-part='bar'][data-ch-dir='down'] {
  transform-origin: 50% 0%;
}

[data-ch-part='bar'][data-ch-dir='right'] {
  transform-origin: 0% 50%;
}

[data-ch-part='bar'][data-ch-dir='left'] {
  transform-origin: 100% 50%;
}

[data-ch-animate='true'] [data-ch-part='bar'][data-ch-dir='up'],
[data-ch-animate='true'] [data-ch-part='bar'][data-ch-dir='down'] {
  animation: ch-grow-y var(--ch-duration) var(--ch-ease) both;
}

[data-ch-animate='true'] [data-ch-part='bar'][data-ch-dir='right'],
[data-ch-animate='true'] [data-ch-part='bar'][data-ch-dir='left'] {
  animation: ch-grow-x var(--ch-duration) var(--ch-ease) both;
}

@keyframes ch-grow-y {
  from {
    transform: scaleY(0);
  }
}

@keyframes ch-grow-x {
  from {
    transform: scaleX(0);
  }
}

[data-ch-dimmed='true'] {
  opacity: var(--ch-dim-opacity);
}

/* ---------- Labels and reference marks ---------- */
[data-ch-part='axis-label'],
[data-ch-part='target-label'] {
  fill: var(--ch-ink-muted);
  font-size: 12px;
}

[data-ch-part='value-label'] {
  fill: var(--ch-ink);
  font-size: 13px;
  font-weight: 500;
}

[data-ch-part='target'] {
  stroke: var(--ch-ink);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

[data-ch-part='target'][data-ch-variant='tick'] {
  stroke-width: 2;
  stroke-dasharray: none;
}

/* ---------- Tooltip pill ---------- */
.ch-tooltip {
  position: absolute;
  z-index: 1;
}

.ch-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--ch-tooltip-bg);
  color: var(--ch-tooltip-ink);
  box-shadow: var(--ch-tooltip-shadow);
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  font-variant-numeric: var(--ch-font-numeric);
}

.ch-pill-seg {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.ch-pill-seg + .ch-pill-seg {
  margin-left: 10px;
  padding-left: 10px;
  border-left: 1px solid var(--ch-grid);
}

.ch-pill-value {
  font-weight: 600;
}

.ch-pill-seg[data-ch-tone] .ch-pill-value {
  color: var(--ch-swatch-color);
}

.ch-pill-label {
  color: var(--ch-ink-muted);
}

/* ---------- Legend ---------- */
.ch-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--ch-ink);
  font-size: 13px;
}

.ch-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ch-legend-count {
  color: var(--ch-ink-muted);
}

.ch-swatch {
  display: inline-block;
  flex: none;
  width: 20px;
  height: 10px;
  border-radius: 3px;
  background: var(--ch-swatch-color);
}

.ch-swatch[data-ch-shape='dot'] {
  width: 10px;
  border-radius: 50%;
}

.ch-swatch[data-ch-fill='hatch'],
.ch-swatch[data-ch-fill='hatch-fade'] {
  /* Same stripe direction as the SVG patterns: gradient runs perpendicular to the stripes. */
  background: repeating-linear-gradient(
    calc((var(--ch-hatch-angle) + 90) * 1deg),
    var(--ch-swatch-color) 0 var(--ch-hatch-width),
    color-mix(in srgb, var(--ch-swatch-color) calc(var(--ch-hatch-tint) * 100%), transparent)
      var(--ch-hatch-width) calc(var(--ch-hatch-gap) * 1px)
  );
}

/* ---------- Motion off ---------- */
[data-ch-animate='false'] * {
  animation: none !important;
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  [data-ch-root] *,
  .ch-tooltip {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 4: Implement the pattern helpers and defs**

`packages/tally-charts/src/theme/patterns.ts`:
```ts
import type { Fill, Tone } from '../core/types'

export type FadeAxis = 'x' | 'y'

export interface HatchGeometry {
  /** Stripe direction in degrees from horizontal. */
  angle: number
  /** Distance between stripes in px. */
  gap: number
}

export const DEFAULT_HATCH: HatchGeometry = { angle: 45, gap: 6 }

export const patternId = (chartId: string, tone: Tone) => `${chartId}-hatch-${tone}`

export const fadeMaskId = (chartId: string, axis: FadeAxis) => `${chartId}-fade-${axis}`

export interface Paint {
  fill: string
  mask?: string
}

export function paintFor(chartId: string, tone: Tone, fill: Fill, fadeAxis: FadeAxis = 'y'): Paint {
  if (fill === 'solid') return { fill: `var(--ch-${tone})` }
  const pattern = `url(#${patternId(chartId, tone)})`
  if (fill === 'hatch') return { fill: pattern }
  return { fill: pattern, mask: `url(#${fadeMaskId(chartId, fadeAxis)})` }
}

export function readHatchGeometry(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): HatchGeometry {
  const angle = Number.parseFloat(style.getPropertyValue('--ch-hatch-angle'))
  const gap = Number.parseFloat(style.getPropertyValue('--ch-hatch-gap'))
  return {
    angle: Number.isFinite(angle) ? angle : DEFAULT_HATCH.angle,
    gap: Number.isFinite(gap) && gap > 0 ? gap : DEFAULT_HATCH.gap,
  }
}
```

`packages/tally-charts/src/react/PatternDefs.tsx`:
```tsx
import { TONES } from '../core/types'
import { fadeMaskId, type HatchGeometry, patternId } from '../theme/patterns'

export interface PatternDefsProps {
  chartId: string
  geometry: HatchGeometry
}

/**
 * One hatch pattern per tone (always all six, so server and client markup match) and two
 * fade masks. Colors and stroke width come from CSS variables; angle and gap are attributes.
 */
export function PatternDefs({ chartId, geometry }: PatternDefsProps) {
  const { gap } = geometry
  // A vertical stripe rotated clockwise by (90 - angle) runs at `angle` from horizontal.
  const rotate = 90 - geometry.angle
  return (
    <defs>
      {TONES.map((tone) => (
        <pattern
          key={tone}
          id={patternId(chartId, tone)}
          patternUnits="userSpaceOnUse"
          width={gap}
          height={gap}
          patternTransform={`rotate(${rotate})`}
        >
          <rect
            width={gap}
            height={gap}
            style={{ fill: `var(--ch-${tone})`, opacity: 'var(--ch-hatch-tint)' }}
          />
          <line
            x1={gap / 2}
            y1={0}
            x2={gap / 2}
            y2={gap}
            style={{ stroke: `var(--ch-${tone})`, strokeWidth: 'var(--ch-hatch-width)' }}
          />
        </pattern>
      ))}
      <linearGradient id={`${chartId}-fade-gradient-y`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={1} />
        <stop offset="1" stopColor="#fff" stopOpacity={0.3} />
      </linearGradient>
      <linearGradient id={`${chartId}-fade-gradient-x`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity={1} />
        <stop offset="1" stopColor="#fff" stopOpacity={0.3} />
      </linearGradient>
      <mask id={fadeMaskId(chartId, 'y')} maskContentUnits="objectBoundingBox">
        <rect width={1} height={1} fill={`url(#${chartId}-fade-gradient-y)`} />
      </mask>
      <mask id={fadeMaskId(chartId, 'x')} maskContentUnits="objectBoundingBox">
        <rect width={1} height={1} fill={`url(#${chartId}-fade-gradient-x)`} />
      </mask>
    </defs>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 6: Format, check, build and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint && pnpm build && ls packages/tally-charts/dist/theme.css
git add packages/tally-charts/src
git commit -m "feat: add theme tokens, light/dark themes and hatch pattern defs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Interaction store

**Files:**
- Create: `packages/tally-charts/src/react/types.ts`, `src/react/useIsoLayoutEffect.ts`, `src/react/interaction.ts`, `src/react/useRegisterPoints.ts`
- Test: `packages/tally-charts/src/react/interaction.test.tsx`

**Interfaces:**
- Consumes: `Id`, `Tone` (Task 1).
- Produces:
  - `interface TooltipSegment { value: ReactNode; label?: ReactNode; tone?: Tone }`.
  - `interface ChartPoint { id: Id; index: number; datum: unknown; x: number; y: number; label: string; segments: TooltipSegment[] }`. `x`/`y` are plot coordinates of the tooltip anchor; `label` is the screen-reader text.
  - `type ActiveSource = 'pointer' | 'keyboard'`.
  - `useIsoLayoutEffect` (`useLayoutEffect` in the browser, `useEffect` on the server).
  - `navigate(points, currentId, key): Id | null | undefined`. `undefined` means "not handled".
  - `samePoints(a, b): boolean`.
  - `interface Interaction { activeId; activePoint; source; points; setActive(id, source); registerPoints(key, points); unregisterPoints(key) }`; `useInteraction({ activeId?, onActiveChange? }): Interaction`. Passing `activeId={null}` means controlled with nothing active; `undefined` means uncontrolled.
  - `useRegisterPoints(registry: Pick<Interaction,'registerPoints'|'unregisterPoints'>, points: ChartPoint[]): void`.
  - **Keyboard in 0.1:** ←/↑ = previous, →/↓ = next in data order; Home/End; Escape clears.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/react/interaction.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { navigate, useInteraction } from './interaction'
import type { ChartPoint } from './types'

const pts = (ids: Id[]): ChartPoint[] =>
  ids.map((id, index) => ({ id, index, datum: null, x: index * 10, y: 0, label: `P${id}`, segments: [] }))

describe('navigate', () => {
  const points = pts(['a', 'b', 'c'])

  it('starts at the first point going forward and the last going back', () => {
    expect(navigate(points, null, 'ArrowRight')).toBe('a')
    expect(navigate(points, null, 'ArrowDown')).toBe('a')
    expect(navigate(points, null, 'ArrowLeft')).toBe('c')
    expect(navigate(points, null, 'ArrowUp')).toBe('c')
  })

  it('moves in data order and clamps at the ends', () => {
    expect(navigate(points, 'a', 'ArrowRight')).toBe('b')
    expect(navigate(points, 'c', 'ArrowRight')).toBe('c')
    expect(navigate(points, 'b', 'ArrowLeft')).toBe('a')
    expect(navigate(points, 'a', 'ArrowLeft')).toBe('a')
  })

  it('jumps with Home and End', () => {
    expect(navigate(points, 'b', 'Home')).toBe('a')
    expect(navigate(points, 'b', 'End')).toBe('c')
  })

  it('clears on Escape only when something is active', () => {
    expect(navigate(points, 'b', 'Escape')).toBeNull()
    expect(navigate(points, null, 'Escape')).toBeUndefined()
  })

  it('ignores other keys and empty charts', () => {
    expect(navigate(points, 'a', 'x')).toBeUndefined()
    expect(navigate([], null, 'ArrowRight')).toBeUndefined()
  })
})

describe('useInteraction', () => {
  it('tracks the active point when uncontrolled', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    act(() => result.current.setActive('b', 'pointer'))
    expect(result.current.activeId).toBe('b')
    expect(result.current.activePoint?.label).toBe('Pb')
    expect(result.current.source).toBe('pointer')
    expect(onActiveChange).toHaveBeenCalledWith('b', expect.objectContaining({ id: 'b' }))
  })

  it('only reports changes when controlled', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ activeId: null, onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a'])))
    act(() => result.current.setActive('a', 'keyboard'))
    expect(result.current.activeId).toBeNull()
    expect(onActiveChange).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('follows the controlled id', () => {
    const { result, rerender } = renderHook((props: { id: Id | null }) =>
      useInteraction({ activeId: props.id }),
    { initialProps: { id: null } })
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    rerender({ id: 'b' })
    expect(result.current.activePoint?.id).toBe('b')
  })

  it('does not re-report the same id', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a'])))
    act(() => result.current.setActive('a', 'pointer'))
    act(() => result.current.setActive('a', 'pointer'))
    expect(onActiveChange).toHaveBeenCalledTimes(1)
  })

  it('keeps registry state when identical points are re-registered', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => result.current.registerPoints('m', pts(['a'])))
    const before = result.current.points
    act(() => result.current.registerPoints('m', pts(['a'])))
    expect(result.current.points).toBe(before)
  })

  it('concatenates marks in registration order and unregisters them', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => {
      result.current.registerPoints('first', pts(['a']))
      result.current.registerPoints('second', pts(['b']))
    })
    expect(result.current.points.map((p) => p.id)).toEqual(['a', 'b'])
    act(() => result.current.unregisterPoints('first'))
    expect(result.current.points.map((p) => p.id)).toEqual(['b'])
  })

  it('drops the active point when its data disappears', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => result.current.registerPoints('m', pts(['a', 'b', 'c'])))
    act(() => result.current.setActive('c', 'keyboard'))
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    expect(result.current.activeId).toBe('c')
    expect(result.current.activePoint).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/react/interaction.test.tsx`
Expected: FAIL with `Failed to resolve import "./interaction"`.

- [ ] **Step 3: Implement the interaction store**

`packages/tally-charts/src/react/types.ts`:
```ts
import type { ReactNode } from 'react'
import type { Id, Tone } from '../core/types'

export interface TooltipSegment {
  value: ReactNode
  label?: ReactNode
  tone?: Tone
}

/** A focusable data point registered by a mark. Coordinates are in plot space. */
export interface ChartPoint {
  id: Id
  index: number
  datum: unknown
  x: number
  y: number
  /** Screen-reader text, e.g. "Sep 21, 34.0%". */
  label: string
  segments: TooltipSegment[]
}

export type ActiveSource = 'pointer' | 'keyboard'
```

`packages/tally-charts/src/react/useIsoLayoutEffect.ts`:
```ts
import { useEffect, useLayoutEffect } from 'react'

export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
```

`packages/tally-charts/src/react/interaction.ts`:
```ts
import { useCallback, useMemo, useRef, useState } from 'react'
import type { Id } from '../core/types'
import type { ActiveSource, ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/** Next active id for a key press; `undefined` when the key isn't handled. */
export function navigate(
  points: readonly ChartPoint[],
  currentId: Id | null,
  key: string,
): Id | null | undefined {
  if (key === 'Escape') return currentId === null ? undefined : null
  if (points.length === 0) return undefined
  const last = points.length - 1
  const index = currentId === null ? -1 : points.findIndex((p) => p.id === currentId)
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return points[index < 0 ? 0 : Math.min(index + 1, last)]?.id
    case 'ArrowLeft':
    case 'ArrowUp':
      return points[index < 0 ? last : Math.max(index - 1, 0)]?.id
    case 'Home':
      return points[0]?.id
    case 'End':
      return points[last]?.id
    default:
      return undefined
  }
}

export function samePoints(a: readonly ChartPoint[] | undefined, b: readonly ChartPoint[]): boolean {
  if (!a || a.length !== b.length) return false
  return a.every((p, i) => {
    const q = b[i]
    return (
      q !== undefined &&
      p.id === q.id &&
      p.x === q.x &&
      p.y === q.y &&
      p.label === q.label &&
      p.datum === q.datum
    )
  })
}

export interface InteractionOptions {
  activeId?: Id | null
  onActiveChange?: (id: Id | null, point: ChartPoint | null) => void
}

export interface Interaction {
  activeId: Id | null
  activePoint: ChartPoint | null
  source: ActiveSource
  points: ChartPoint[]
  setActive: (id: Id | null, source: ActiveSource) => void
  registerPoints: (key: string, points: ChartPoint[]) => void
  unregisterPoints: (key: string) => void
}

export function useInteraction({ activeId: controlledId, onActiveChange }: InteractionOptions): Interaction {
  const [innerId, setInnerId] = useState<Id | null>(null)
  const [source, setSource] = useState<ActiveSource>('pointer')
  const [registry, setRegistry] = useState<Record<string, ChartPoint[]>>({})
  const controlled = controlledId !== undefined
  const activeId: Id | null = controlledId !== undefined ? controlledId : innerId
  const points = useMemo(() => Object.values(registry).flat(), [registry])
  const activePoint = activeId === null ? null : (points.find((p) => p.id === activeId) ?? null)

  const latest = useRef({ activeId, points, onActiveChange, controlled })
  useIsoLayoutEffect(() => {
    latest.current = { activeId, points, onActiveChange, controlled }
  })

  const setActive = useCallback((id: Id | null, nextSource: ActiveSource) => {
    const current = latest.current
    setSource(nextSource)
    if (id === current.activeId) return
    if (!current.controlled) setInnerId(id)
    current.onActiveChange?.(id, id === null ? null : (current.points.find((p) => p.id === id) ?? null))
  }, [])

  const registerPoints = useCallback((key: string, next: ChartPoint[]) => {
    setRegistry((prev) => (samePoints(prev[key], next) ? prev : { ...prev, [key]: next }))
  }, [])

  const unregisterPoints = useCallback((key: string) => {
    setRegistry((prev) => {
      if (!(key in prev)) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  return { activeId, activePoint, source, points, setActive, registerPoints, unregisterPoints }
}
```

`packages/tally-charts/src/react/useRegisterPoints.ts`:
```ts
import { useId } from 'react'
import type { Interaction } from './interaction'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/** Registers a mark's points for keyboard navigation and tooltips. */
export function useRegisterPoints(
  registry: Pick<Interaction, 'registerPoints' | 'unregisterPoints'>,
  points: ChartPoint[],
): void {
  const key = useId()
  const { registerPoints, unregisterPoints } = registry
  useIsoLayoutEffect(() => {
    registerPoints(key, points)
  }, [key, points, registerPoints])
  useIsoLayoutEffect(() => () => unregisterPoints(key), [key, unregisterPoints])
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 5: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src/react
git commit -m "feat: add interaction store with keyboard navigation and point registry

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `<Chart>` root

**Files:**
- Create: `packages/tally-charts/src/react/useWidth.ts`, `src/react/context.ts`, `src/react/Chart.tsx`
- Test: `packages/tally-charts/src/react/useWidth.test.tsx`, `packages/tally-charts/src/react/Chart.test.tsx`

**Interfaces:**
- Consumes: `createScale`, `ScaleSpec`, `ResolvedScale` (Task 3); `createWarner`, `Warn`, `Id` (Task 1); `useFormat` (Task 2); `DEFAULT_HATCH`, `readHatchGeometry`, `PatternDefs` (Task 4); `useInteraction`, `navigate`, `ChartPoint`, `ActiveSource`, `useIsoLayoutEffect`, `useRegisterPoints` (Task 5).
- Produces:
  - `useWidth(ref, initialWidth, enabled): number`.
  - `interface Margin { top; right; bottom; left }`.
  - `interface ChartContextValue { chartId; width; height; innerWidth; innerHeight; margin; data: readonly unknown[]; x: ResolvedScale; y: ResolvedScale; format(spec?, options?): Formatter; warn: Warn; dimInactive: boolean; activeId; activePoint; points; setActive; registerPoints; unregisterPoints; overlay: HTMLDivElement | null }`.
  - `ChartContext`; `useChart(component?: string): ChartContextValue`, which throws `[tally-charts] <X> must be rendered inside <Chart>.`
  - `interface ChartProps<D> { data?; x?: ScaleSpec<D>; y?: ScaleSpec<D>; width?; initialWidth? (640); height? (240); aspectRatio?; margin?: Partial<Margin>; title?; description?; activeId?; onActiveChange?; onSelect?; animate? (true); dimInactive? (true); empty?: ReactNode; className?; style?; children? }`. Default margin is `{ top: 20, right: 0, bottom: 28, left: 0 }`.
  - Overlay `<div data-ch-part="overlay">` positioned at the plot origin, so `ChartPoint` coordinates map directly to CSS `left`/`top`.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/react/useWidth.test.tsx`:
```tsx
import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWidth } from './useWidth'

function Probe({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const width = useWidth(ref, 640, enabled)
  return <div ref={ref}>width:{width}</div>
}

describe('useWidth', () => {
  const original = globalThis.ResizeObserver
  afterEach(() => {
    globalThis.ResizeObserver = original
  })

  it('measures on mount and follows resizes', () => {
    let callback: ResizeObserverCallback = () => {}
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callback = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 480.4 } as DOMRect)
    render(<Probe />)
    expect(screen.getByText('width:480')).toBeInTheDocument()
    act(() => callback([{ contentRect: { width: 300 } } as ResizeObserverEntry], {} as ResizeObserver))
    expect(screen.getByText('width:300')).toBeInTheDocument()
  })

  it('keeps the initial width when disabled', () => {
    render(<Probe enabled={false} />)
    expect(screen.getByText('width:640')).toBeInTheDocument()
  })
})
```

`packages/tally-charts/src/react/Chart.test.tsx`:
```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { Chart } from './Chart'
import { type ChartContextValue, useChart } from './context'
import { useRegisterPoints } from './useRegisterPoints'

const weeks = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
]

function Probe({ onContext }: { onContext: (ctx: ChartContextValue) => void }) {
  onContext(useChart('Probe'))
  return null
}

function PointsProbe({ ids }: { ids: Id[] }) {
  const ctx = useChart('PointsProbe')
  useRegisterPoints(
    ctx,
    ids.map((id, index) => ({ id, index, datum: null, x: index, y: 0, label: `Week ${id}`, segments: [] })),
  )
  return null
}

describe('<Chart>', () => {
  it('renders a named, described figure that is one tab stop', () => {
    render(
      <Chart data={weeks} width={400} title="Margin by week" description="Under target for 12 weeks.">
        {null}
      </Chart>,
    )
    const figure = screen.getByRole('figure', { name: 'Margin by week' })
    expect(figure).toHaveAccessibleDescription('Under target for 12 weeks.')
    expect(figure).toHaveAttribute('tabindex', '0')
  })

  it('sizes the svg from width and height, or from aspectRatio', () => {
    const { container, rerender } = render(<Chart width={400} height={180} />)
    expect(container.querySelector('svg')).toHaveAttribute('height', '180')
    rerender(<Chart width={400} aspectRatio={2} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '400')
    expect(svg).toHaveAttribute('height', '200')
  })

  it('exposes inner size and scales through context', () => {
    let ctx: ChartContextValue | undefined
    render(
      <Chart
        data={weeks}
        width={400}
        height={230}
        margin={{ top: 10, bottom: 20 }}
        x={{ type: 'band', field: 'week' }}
        y={{ field: 'margin', domain: [0, 40] }}
      >
        <Probe onContext={(c) => {
          ctx = c
        }} />
      </Chart>,
    )
    expect(ctx?.innerWidth).toBe(400)
    expect(ctx?.innerHeight).toBe(200)
    expect(ctx?.x.kind).toBe('band')
    expect(ctx?.y.kind).toBe('linear')
    expect(ctx?.data).toBe(weeks)
    expect(ctx?.format('percent')(34)).toBe('34.0%')
  })

  it('renders the empty slot instead of the plot for empty data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Chart data={[]} width={300} empty="Nothing yet" x={{ type: 'band' }} />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByRole('figure')).not.toHaveAttribute('tabindex')
    expect(warn).not.toHaveBeenCalled()
  })

  it('throws when a building block is rendered outside <Chart>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe onContext={() => {}} />)).toThrow(
      '[tally-charts] <Probe> must be rendered inside <Chart>.',
    )
  })

  it('scopes pattern ids per chart', () => {
    const { container } = render(
      <>
        <Chart width={200} />
        <Chart width={200} />
      </>,
    )
    const ids = [...container.querySelectorAll('pattern, mask')].map((el) => el.id)
    expect(ids).toHaveLength(16)
    expect(new Set(ids).size).toBe(16)
  })

  it('keeps geometry finite at zero width', () => {
    let ctx: ChartContextValue | undefined
    const { container } = render(
      <Chart width={0} height={0} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
        <Probe onContext={(c) => {
          ctx = c
        }} />
      </Chart>,
    )
    expect(ctx?.innerWidth).toBe(0)
    expect(ctx?.innerHeight).toBe(0)
    expect(container.querySelector('svg')).toHaveAttribute('width', '0')
  })

  it('moves the active point with the keyboard and announces it', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2, 3]} />
      </Chart>,
    )
    const figure = screen.getByRole('figure')
    const live = container.querySelector('[aria-live]')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ label: 'Week 1' }))
    expect(live).toHaveTextContent('Week 1')
    fireEvent.keyDown(figure, { key: 'End' })
    expect(live).toHaveTextContent('Week 3')
    fireEvent.keyDown(figure, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(live?.textContent).toBe('')
  })

  it('calls onSelect with the active point on Enter', () => {
    const onSelect = vi.fn()
    render(
      <Chart width={300} onSelect={onSelect}>
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    const figure = screen.getByRole('figure')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('clears pointer activation when the pointer leaves', () => {
    const onActiveChange = vi.fn()
    let ctx: ChartContextValue | undefined
    render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
        <Probe onContext={(c) => {
          ctx = c
        }} />
      </Chart>,
    )
    act(() => ctx?.setActive(2, 'pointer'))
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ id: 2 }))
    fireEvent.pointerLeave(screen.getByRole('figure'))
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/react/useWidth.test.tsx src/react/Chart.test.tsx`
Expected: FAIL with unresolved imports `./useWidth`, `./Chart`, `./context`.

- [ ] **Step 3: Implement useWidth and the context**

`packages/tally-charts/src/react/useWidth.ts`:
```ts
import { type RefObject, useState } from 'react'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/** Container width in whole px. Starts at `initialWidth` so server and first client render match. */
export function useWidth(
  ref: RefObject<HTMLElement | null>,
  initialWidth: number,
  enabled: boolean,
): number {
  const [width, setWidth] = useState(initialWidth)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const update = (next: number) => setWidth(Math.max(0, Math.round(next)))
    update(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, enabled])
  return width
}
```

`packages/tally-charts/src/react/context.ts`:
```ts
import { createContext, useContext } from 'react'
import type { FormatOptions, Formatter, FormatSpec } from '../core/format'
import type { ResolvedScale } from '../core/scale'
import type { Id } from '../core/types'
import type { Warn } from '../core/warn'
import type { ActiveSource, ChartPoint } from './types'

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ChartContextValue {
  chartId: string
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  margin: Margin
  data: readonly unknown[]
  x: ResolvedScale
  y: ResolvedScale
  format: (spec?: FormatSpec, options?: Pick<FormatOptions, 'signed'>) => Formatter
  warn: Warn
  dimInactive: boolean
  activeId: Id | null
  activePoint: ChartPoint | null
  points: ChartPoint[]
  setActive: (id: Id | null, source: ActiveSource) => void
  registerPoints: (key: string, points: ChartPoint[]) => void
  unregisterPoints: (key: string) => void
  /** HTML layer positioned at the plot origin; null until mounted. */
  overlay: HTMLDivElement | null
}

export const ChartContext = createContext<ChartContextValue | null>(null)

export function useChart(component = 'useChart'): ChartContextValue {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error(`[tally-charts] <${component}> must be rendered inside <Chart>.`)
  return ctx
}
```

- [ ] **Step 4: Implement `<Chart>`**

`packages/tally-charts/src/react/Chart.tsx`:
```tsx
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createScale, type ScaleSpec } from '../core/scale'
import type { Id } from '../core/types'
import { createWarner, type Warn } from '../core/warn'
import { DEFAULT_HATCH, readHatchGeometry } from '../theme/patterns'
import { useFormat } from './ChartsProvider'
import { ChartContext, type ChartContextValue, type Margin } from './context'
import { navigate, useInteraction } from './interaction'
import { PatternDefs } from './PatternDefs'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import { useWidth } from './useWidth'

export interface ChartProps<D> {
  data?: readonly D[]
  x?: ScaleSpec<D>
  y?: ScaleSpec<D>
  /** Fixed width in px; turns off container measuring. */
  width?: number
  /** Width used for server rendering and the first client render. Default 640. */
  initialWidth?: number
  /** Height in px. Default 240 unless `aspectRatio` is set. */
  height?: number
  /** width / height. Used when `height` is not set. */
  aspectRatio?: number
  margin?: Partial<Margin>
  /** Accessible name of the figure. */
  title?: string
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  activeId?: Id | null
  onActiveChange?: (id: Id | null, point: ChartPoint | null) => void
  onSelect?: (id: Id, point: ChartPoint) => void
  animate?: boolean
  dimInactive?: boolean
  /** Rendered instead of the plot when `data` is an empty array. Default "No data". */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const DEFAULT_MARGIN: Margin = { top: 20, right: 0, bottom: 28, left: 0 }
const DEFAULT_HEIGHT = 240
const EMPTY: readonly never[] = []
const silent: Warn = () => {}

export function Chart<D>({
  data,
  x,
  y,
  width,
  initialWidth = 640,
  height,
  aspectRatio,
  margin: marginProp,
  title,
  description,
  activeId,
  onActiveChange,
  onSelect,
  animate = true,
  dimInactive = true,
  empty,
  className,
  style,
  children,
}: ChartProps<D>) {
  const rootRef = useRef<HTMLElement>(null)
  const chartId = `ch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const measured = useWidth(rootRef, initialWidth, width === undefined)
  const w = Math.max(0, width ?? measured)
  const h = Math.max(0, height ?? (aspectRatio ? Math.round(w / aspectRatio) : DEFAULT_HEIGHT))
  const margin: Margin = { ...DEFAULT_MARGIN, ...marginProp }
  const innerWidth = Math.max(0, w - margin.left - margin.right)
  const innerHeight = Math.max(0, h - margin.top - margin.bottom)
  const rows: readonly D[] = data ?? EMPTY
  const isEmpty = data !== undefined && data.length === 0

  const warn = useMemo(() => createWarner(), [])
  const scaleWarn = isEmpty ? silent : warn
  const xScale = useMemo(
    () => createScale(x, rows, 'x', innerWidth, scaleWarn),
    [x, rows, innerWidth, scaleWarn],
  )
  const yScale = useMemo(
    () => createScale(y, rows, 'y', innerHeight, scaleWarn),
    [y, rows, innerHeight, scaleWarn],
  )

  const formatters = useFormat()
  const interaction = useInteraction({ activeId, onActiveChange })
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  const [hatch, setHatch] = useState(DEFAULT_HATCH)

  useIsoLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const next = readHatchGeometry(getComputedStyle(el))
    setHatch((prev) => (prev.angle === next.angle && prev.gap === next.gap ? prev : next))
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const next = navigate(interaction.points, interaction.activeId, event.key)
    if (next !== undefined) {
      event.preventDefault()
      interaction.setActive(next, 'keyboard')
      return
    }
    const point = interaction.activePoint
    if ((event.key === 'Enter' || event.key === ' ') && onSelect && point) {
      event.preventDefault()
      onSelect(point.id, point)
    }
  }

  const ctx: ChartContextValue = {
    chartId,
    width: w,
    height: h,
    innerWidth,
    innerHeight,
    margin,
    data: rows,
    x: xScale,
    y: yScale,
    format: formatters.create,
    warn,
    dimInactive,
    activeId: interaction.activeId,
    activePoint: interaction.activePoint,
    points: interaction.points,
    setActive: interaction.setActive,
    registerPoints: interaction.registerPoints,
    unregisterPoints: interaction.unregisterPoints,
    overlay,
  }

  const announcement =
    interaction.source === 'keyboard' && interaction.activePoint ? interaction.activePoint.label : ''
  const titleId = `${chartId}-title`
  const descId = `${chartId}-desc`

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: the chart is one tab stop; arrow keys move between data points (spec §5).
    <figure
      ref={rootRef}
      data-ch-root=""
      data-ch-animate={animate ? 'true' : 'false'}
      className={className}
      style={{ height: h, ...style }}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      tabIndex={isEmpty ? undefined : 0}
      onKeyDown={isEmpty ? undefined : onKeyDown}
      onPointerLeave={() => interaction.setActive(null, 'pointer')}
      onBlur={() => {
        if (interaction.source === 'keyboard') interaction.setActive(null, 'keyboard')
      }}
    >
      {title ? (
        <span id={titleId} className="ch-sr-only">
          {title}
        </span>
      ) : null}
      {description ? (
        <span id={descId} className="ch-sr-only">
          {description}
        </span>
      ) : null}
      {isEmpty ? (
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      ) : (
        <ChartContext.Provider value={ctx}>
          <svg width={w} height={h} aria-hidden="true" focusable="false" className="ch-svg">
            <PatternDefs chartId={chartId} geometry={hatch} />
            <g transform={`translate(${margin.left},${margin.top})`}>{children}</g>
          </svg>
          <div
            ref={setOverlay}
            data-ch-part="overlay"
            className="ch-overlay"
            style={{ left: margin.left, top: margin.top, width: innerWidth, height: innerHeight }}
          />
        </ChartContext.Provider>
      )}
      <div aria-live="polite" className="ch-sr-only">
        {announcement}
      </div>
    </figure>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 6: Format, check and commit**

Run: `pnpm format && pnpm typecheck && pnpm lint`
Expected: clean. If Biome reports a different a11y rule on the root `<figure>` (e.g. an interactions-on-non-interactive-element rule), add one more `biome-ignore` line for that rule with the same reason. Don't add ignores anywhere else.

```bash
git add packages/tally-charts/src/react
git commit -m "feat: add <Chart> root with sizing, scales, defs, a11y and keyboard

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `Bars`

**Files:**
- Create: `packages/tally-charts/src/core/bars.ts`, `packages/tally-charts/src/react/marks/Bars.tsx`
- Modify: `packages/tally-charts/src/core/index.ts` (append exports)
- Test: `packages/tally-charts/src/core/bars.test.ts`, `packages/tally-charts/src/react/marks/Bars.test.tsx`

**Interfaces:**
- Consumes: `ResolvedScale`, `LinearScale` (Task 3); `FieldGetter`, `toFieldGetter`, `resolveAccessor`, `resolveIds`, `resolvePerItem`, types (Task 1); `paintFor` (Task 4); `useChart` (Task 6); `useRegisterPoints`, `ChartPoint`, `TooltipSegment` (Task 5); `FormatSpec` (Task 2).
- Produces:
  - `type BarOrientation = 'vertical'|'horizontal'`; `type BarDirection = 'up'|'down'|'right'|'left'`.
  - `interface BarRect { id; index; datum; category: string; value: number; x; y; width; height; dir: BarDirection; anchor: { x; y } }`. `anchor` is the bar's outer end, centered.
  - `interface BarLayout { orientation; bars: BarRect[] }`; `computeBars({ data, ids, x, y, getX, getY, warn }): BarLayout`. Vertical when x is band and y is linear; horizontal when y is band and x is linear. The baseline is 0, clamped into the domain.
  - `interface BarsProps<D> { data?; x?: Accessor<D, string|number>; y?: Accessor<D, string|number>; id?: Accessor<D, Id>; tone?: PerItem<D, Tone> ('accent'); fill?: PerItem<D, Fill> ('solid'); radius? (3); format?: FormatSpec ('number'); label?: Accessor<D, string>; tooltip?: (d: D, i: number) => TooltipSegment[] }`.
  - **DOM:**
    - `<g data-ch-part="bars">`
    - per bar `<rect data-ch-part="bar" data-ch-tone data-ch-fill data-ch-dir data-ch-active? data-ch-dimmed?>`
    - a transparent `<rect data-ch-part="bar-hit">` covering the full band
  - **Default tooltip segments:** `[{ value: label }, { value: format(value) }]`. Point label: `"${label}, ${format(value)}"`.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/core/bars.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { computeBars } from './bars'
import { createScale } from './scale'

type Row = { k: string; v: number | null }
const noop = () => {}
const getK = (d: unknown) => (d as Row).k
const getV = (d: unknown) => (d as Row).v

function layout(rows: Row[], domain: [number, number], horizontal = false) {
  const band = createScale<Row>({ type: 'band', field: 'k', padding: 0 }, rows, horizontal ? 'y' : 'x', 200, noop)
  const linear = createScale<Row>({ domain }, rows, horizontal ? 'x' : 'y', 100, noop)
  return computeBars({
    data: rows,
    ids: rows.map((_, i) => i),
    x: horizontal ? linear : band,
    y: horizontal ? band : linear,
    getX: horizontal ? getV : getK,
    getY: horizontal ? getK : getV,
    warn: noop,
  })
}

describe('computeBars', () => {
  it('lays out vertical bars from the zero baseline', () => {
    const { orientation, bars } = layout([{ k: 'a', v: 10 }, { k: 'b', v: 20 }], [0, 20])
    expect(orientation).toBe('vertical')
    expect(bars[0]).toMatchObject({ x: 0, y: 50, width: 100, height: 50, dir: 'up', anchor: { x: 50, y: 50 } })
    expect(bars[1]).toMatchObject({ x: 100, y: 0, height: 100 })
  })

  it('draws negative values downward from zero', () => {
    const { bars } = layout([{ k: 'a', v: -10 }], [-10, 10])
    expect(bars[0]).toMatchObject({ y: 50, height: 50, dir: 'down', anchor: { y: 100 } })
  })

  it('clamps the baseline into a domain that excludes zero', () => {
    const { bars } = layout([{ k: 'a', v: 30 }], [20, 40])
    expect(bars[0]).toMatchObject({ y: 50, height: 50 })
  })

  it('lays out horizontal bars when y is the band scale', () => {
    const { orientation, bars } = layout([{ k: 'a', v: 10 }, { k: 'b', v: 5 }], [0, 20], true)
    expect(orientation).toBe('horizontal')
    expect(bars[0]).toMatchObject({ x: 0, y: 0, width: 50, height: 100, dir: 'right', anchor: { x: 50, y: 50 } })
  })

  it('skips missing values and warns', () => {
    const warn = vi.fn()
    const rows: Row[] = [{ k: 'a', v: null }, { k: 'b', v: 4 }]
    const band = createScale<Row>({ type: 'band', field: 'k' }, rows, 'x', 200, noop)
    const linear = createScale<Row>({ domain: [0, 4] }, rows, 'y', 100, noop)
    const { bars } = computeBars({ data: rows, ids: [0, 1], x: band, y: linear, getX: getK, getY: getV, warn })
    expect(bars.map((b) => b.category)).toEqual(['b'])
    expect(warn).toHaveBeenCalledWith('bars-value', expect.stringContaining('index 0'))
  })

  it('warns and draws nothing without one band and one linear scale', () => {
    const warn = vi.fn()
    const rows: Row[] = [{ k: 'a', v: 1 }]
    const linear = createScale<Row>({ domain: [0, 1] }, rows, 'x', 100, noop)
    expect(computeBars({ data: rows, ids: [0], x: linear, y: linear, getX: getV, getY: getV, warn }).bars).toEqual([])
    expect(warn).toHaveBeenCalledWith('bars-scales', expect.any(String))
  })
})
```

`packages/tally-charts/src/react/marks/Bars.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Bars, type BarsProps } from './Bars'

type Week = { week: string; margin: number | null }
const weeks: Week[] = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderBars(props: BarsProps<Week> = {}, chart: Partial<ChartProps<Week>> = {}) {
  return render(
    <Chart<Week>
      data={weeks}
      width={200}
      height={120}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
      animate={false}
      {...chart}
    >
      <Bars<Week> {...props} />
    </Chart>,
  )
}

const bars = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="bar"]')]
const hits = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="bar-hit"]')]

describe('<Bars>', () => {
  it('draws one bar per datum using the chart fields', () => {
    const { container } = renderBars()
    const [a, b] = bars(container)
    expect(bars(container)).toHaveLength(2)
    expect(a).toHaveAttribute('x', '0')
    expect(a).toHaveAttribute('width', '100')
    expect(a).toHaveAttribute('y', '60')
    expect(a).toHaveAttribute('height', '60')
    expect(b).toHaveAttribute('y', '0')
    expect(b).toHaveAttribute('height', '120')
  })

  it('applies tone and fill per item', () => {
    const { container } = renderBars({
      tone: 'accent',
      fill: (_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade'),
    })
    const [a, b] = bars(container)
    expect(a).toHaveAttribute('data-ch-fill', 'hatch-fade')
    expect(a).toHaveAttribute('data-ch-tone', 'accent')
    expect(b).toHaveAttribute('data-ch-fill', 'solid')
  })

  it('skips missing values and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBars({}, {
      data: [
        { week: 'W1', margin: null },
        { week: 'W2', margin: 20 },
        { week: 'W3', margin: Number.NaN },
      ],
    })
    expect(bars(container)).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('missing or non-numeric')
  })

  it('draws negative values below the zero baseline', () => {
    const { container } = renderBars({}, {
      data: [
        { week: 'W1', margin: -10 },
        { week: 'W2', margin: 10 },
      ],
      y: { field: 'margin', domain: [-10, 10] },
    })
    const [a, b] = bars(container)
    expect(a).toHaveAttribute('data-ch-dir', 'down')
    expect(a).toHaveAttribute('y', '60')
    expect(a).toHaveAttribute('height', '60')
    expect(b).toHaveAttribute('data-ch-dir', 'up')
    expect(b).toHaveAttribute('y', '0')
  })

  it('renders zero-height bars for all-zero data', () => {
    const { container } = renderBars({}, {
      data: [
        { week: 'W1', margin: 0 },
        { week: 'W2', margin: 0 },
      ],
      y: { field: 'margin' },
    })
    for (const bar of bars(container)) {
      expect(bar).toHaveAttribute('height', '0')
      expect(bar).toHaveAttribute('y', '120')
    }
  })

  it('switches to horizontal bars when y is the band scale', () => {
    const { container } = renderBars({}, {
      height: 100,
      x: { field: 'margin', domain: [0, 20] },
      y: { type: 'band', field: 'week', padding: 0 },
    })
    const [a] = bars(container)
    expect(a).toHaveAttribute('data-ch-dir', 'right')
    expect(a).toHaveAttribute('width', '100')
    expect(a).toHaveAttribute('height', '50')
  })

  it('dims the other bars while one is active', () => {
    const { container } = renderBars()
    fireEvent.pointerEnter(hits(container)[1] as Element)
    const [a, b] = bars(container)
    expect(a).toHaveAttribute('data-ch-dimmed', 'true')
    expect(b).toHaveAttribute('data-ch-active', 'true')
    expect(b).not.toHaveAttribute('data-ch-dimmed')
  })

  it('does not dim when dimInactive is false', () => {
    const { container } = renderBars({}, { dimInactive: false })
    fireEvent.pointerEnter(hits(container)[1] as Element)
    expect(container.querySelector('[data-ch-dimmed]')).toBeNull()
  })

  it('makes the hit area span the full band height', () => {
    const { container } = renderBars()
    const [hit] = hits(container)
    expect(hit).toHaveAttribute('y', '0')
    expect(hit).toHaveAttribute('height', '120')
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderBars({}, { width: 0 })
    for (const el of [...bars(container), ...hits(container)]) {
      for (const attr of ['x', 'y', 'width', 'height']) {
        const value = Number(el.getAttribute(attr))
        expect(Number.isNaN(value)).toBe(false)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('registers readable points for the keyboard', () => {
    const { container } = renderBars({ format: 'percent' })
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('W1, 10.0%')
  })

  it('uses a label accessor for announcements', () => {
    const { container } = renderBars({ label: (d) => `Week of ${d.week}` })
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'End' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Week of W2, 20')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/core/bars.test.ts src/react/marks`
Expected: FAIL with unresolved `./bars` and `./Bars`.

- [ ] **Step 3: Implement the bar geometry**

`packages/tally-charts/src/core/bars.ts`:
```ts
import type { ScaleBand } from 'd3-scale'
import type { FieldGetter } from './accessor'
import type { LinearScale } from './linear'
import type { ResolvedScale } from './scale'
import type { Id } from './types'
import type { Warn } from './warn'

export type BarOrientation = 'vertical' | 'horizontal'
export type BarDirection = 'up' | 'down' | 'right' | 'left'

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
}

export function computeBars(input: BarLayoutInput): BarLayout {
  const { x, y } = input
  if (x.kind === 'band' && y.kind === 'linear') {
    return layoutBars(input, x.scale, y.scale, input.getX, input.getY, 'vertical')
  }
  if (y.kind === 'band' && x.kind === 'linear') {
    return layoutBars(input, y.scale, x.scale, input.getY, input.getX, 'horizontal')
  }
  input.warn('bars-scales', 'Bars need one band scale and one linear scale on <Chart>.')
  return { orientation: 'vertical', bars: [] }
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
  const base = linear(Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1)))
  const thickness = band.bandwidth()
  const bars: BarRect[] = []

  for (const [index, datum] of input.data.entries()) {
    const category = String(getCategory(datum, index))
    const start = band(category)
    if (start === undefined) continue
    const raw = getValue(datum, index)
    const value = raw === null || raw === undefined ? Number.NaN : Number(raw)
    if (!Number.isFinite(value)) {
      input.warn('bars-value', `Bars skipped a missing or non-numeric value at index ${index}.`)
      continue
    }
    const end = linear(value)
    const from = Math.min(base, end)
    const length = Math.abs(end - base)
    const id = input.ids[index] ?? index
    const negative = value < 0
    if (orientation === 'vertical') {
      bars.push({
        id, index, datum, category, value,
        x: start, y: from, width: thickness, height: length,
        dir: negative ? 'down' : 'up',
        anchor: { x: start + thickness / 2, y: negative ? from + length : from },
      })
    } else {
      bars.push({
        id, index, datum, category, value,
        x: from, y: start, width: length, height: thickness,
        dir: negative ? 'left' : 'right',
        anchor: { x: negative ? from : from + length, y: start + thickness / 2 },
      })
    }
  }

  return { orientation, bars }
}
```

Append to `packages/tally-charts/src/core/index.ts`:
```ts
export type { BarDirection, BarLayout, BarLayoutInput, BarOrientation, BarRect } from './bars'
export { computeBars } from './bars'
```

- [ ] **Step 4: Implement `<Bars>`**

`packages/tally-charts/src/react/marks/Bars.tsx`:
```tsx
import type { CSSProperties } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from '../../core/accessor'
import { type BarRect, computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
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
  /** Corner radius in px. Default 3. */
  radius?: number
  /** Value format for tooltips and announcements. Default 'number'. */
  format?: FormatSpec
  /** Category label for tooltips and announcements. Defaults to the category value. */
  label?: Accessor<D, string>
  tooltip?: (d: D, i: number) => TooltipSegment[]
}

export function Bars<D>(props: BarsProps<D>) {
  const ctx = useChart('Bars')
  const data = (props.data ?? ctx.data) as readonly D[]
  const getX = toFieldGetter(props.x) ?? ctx.x.field
  const getY = toFieldGetter(props.y) ?? ctx.y.field
  if (!getX || !getY) {
    ctx.warn('bars-fields', 'Bars need x and y fields: pass them to <Bars> or set `field` on <Chart x/y>.')
  }
  const ids = resolveIds(data, props.id, ctx.warn)
  const layout =
    getX && getY
      ? computeBars({ data, ids, x: ctx.x, y: ctx.y, getX, getY, warn: ctx.warn })
      : { orientation: 'vertical' as const, bars: [] }

  const format = ctx.format(props.format)
  const getLabel = props.label ? resolveAccessor(props.label) : undefined
  const labelOf = (bar: BarRect) => (getLabel ? getLabel(bar.datum as D, bar.index) : bar.category)
  const toneOf = resolvePerItem<D, Tone>(props.tone ?? 'accent')
  const fillOf = resolvePerItem<D, Fill>(props.fill ?? 'solid')

  const points: ChartPoint[] = layout.bars.map((bar) => ({
    id: bar.id,
    index: bar.index,
    datum: bar.datum,
    x: bar.anchor.x,
    y: bar.anchor.y,
    label: `${labelOf(bar)}, ${format(bar.value)}`,
    segments: props.tooltip
      ? props.tooltip(bar.datum as D, bar.index)
      : [{ value: labelOf(bar) }, { value: format(bar.value) }],
  }))
  useRegisterPoints(ctx, points)

  const vertical = layout.orientation === 'vertical'
  const radius = props.radius ?? 3
  const dimming = ctx.dimInactive && ctx.activeId !== null

  return (
    <g data-ch-part="bars">
      {layout.bars.map((bar) => {
        const datum = bar.datum as D
        const tone = toneOf(datum, bar.index, data)
        const fill = fillOf(datum, bar.index, data)
        const paint = paintFor(ctx.chartId, tone, fill, vertical ? 'y' : 'x')
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
        return (
          <g key={String(bar.id)}>
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
              rx={Math.max(0, Math.min(radius, bar.width / 2, bar.height / 2))}
              style={style}
            />
            <rect
              data-ch-part="bar-hit"
              fill="transparent"
              x={vertical ? bar.x : 0}
              y={vertical ? 0 : bar.y}
              width={vertical ? bar.width : ctx.innerWidth}
              height={vertical ? ctx.innerHeight : bar.height}
              onPointerEnter={() => ctx.setActive(bar.id, 'pointer')}
            />
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 6: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src
git commit -m "feat: add Bars mark with tone/fill, dimming, hit areas and keyboard points

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `Target`, `Axis`, `ValueLabel`

**Files:**
- Create: `packages/tally-charts/src/react/marks/Target.tsx`, `src/react/marks/Axis.tsx`, `src/react/marks/ValueLabel.tsx`
- Test: `packages/tally-charts/src/react/marks/Target.test.tsx`, `Axis.test.tsx`, `ValueLabel.test.tsx`

**Interfaces:**
- Consumes: `useChart` (Task 6); `bandTicks`, `linearTicks`, `thinTicks`, `TickSpec`, `Tick` (Task 3); `computeBars` (Task 7); `toFieldGetter` (Task 1); `FormatPreset`, `FormatSpec` (Task 2).
- Produces:
  - `interface TargetProps { x?: number; y?: number; label?: string; labelPosition?: 'start'|'end' ('end'); variant?: 'line'|'tick' ('line'); tickLength?: number (16) }`. `y` draws a horizontal rule; `x` draws a vertical rule. DOM: `<line data-ch-part="target" data-ch-variant>` + `<text data-ch-part="target-label">`.
  - `type AxisSide = 'bottom'|'top'|'left'|'right'`; `type AxisFormat = FormatPreset | ((value: string|number) => string)`; `interface AxisProps { side: AxisSide; ticks?: TickSpec ('all'); format?: AxisFormat; thin?: boolean (true); offset?: number (8) }`. DOM: `<g data-ch-part="axis" data-ch-side>` containing `<text data-ch-part="axis-label">`. No axis line.
  - `interface ValueLabelProps<D> { at?: 'first'|'last'|'all'|number ('all'); x?; y?; format?: FormatSpec; offset?: number (6) }`. DOM: `<text data-ch-part="value-label">`.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/react/marks/Target.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Target } from './Target'

const frame = { width: 200, height: 100, margin: { top: 0, right: 0, bottom: 0, left: 0 }, animate: false }

describe('<Target>', () => {
  it('draws a dashed rule across the plot at a y value with an end label', () => {
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 1] }} y={{ domain: [0, 40] }}>
        <Target y={30} label="Target 38%" />
      </Chart>,
    )
    const line = container.querySelector('[data-ch-part="target"]')
    expect(line).toHaveAttribute('x1', '0')
    expect(line).toHaveAttribute('x2', '200')
    expect(line).toHaveAttribute('y1', '25')
    expect(line).toHaveAttribute('data-ch-variant', 'line')
    const label = container.querySelector('[data-ch-part="target-label"]')
    expect(label).toHaveTextContent('Target 38%')
    expect(label).toHaveAttribute('text-anchor', 'end')
    expect(label).toHaveAttribute('x', '200')
    expect(label).toHaveAttribute('y', '19')
  })

  it('draws a vertical rule for an x value', () => {
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 60] }} y={{ domain: [0, 1] }}>
        <Target x={30} label="Target 38%" />
      </Chart>,
    )
    const line = container.querySelector('[data-ch-part="target"]')
    expect(line).toHaveAttribute('x1', '100')
    expect(line).toHaveAttribute('y2', '100')
    expect(container.querySelector('[data-ch-part="target-label"]')).toHaveAttribute('x', '106')
  })

  it('draws a short tick for the tick variant', () => {
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 40] }} y={{ domain: [0, 1] }}>
        <Target x={20} variant="tick" tickLength={20} />
      </Chart>,
    )
    const line = container.querySelector('[data-ch-part="target"]')
    expect(line).toHaveAttribute('y1', '40')
    expect(line).toHaveAttribute('y2', '60')
  })

  it('warns and draws nothing on a band axis', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart {...frame} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
        <Target x={1} />
      </Chart>,
    )
    expect(container.querySelector('[data-ch-part="target"]')).toBeNull()
    expect(String(warn.mock.calls[0]?.[0])).toContain('linear scale')
  })
})
```

`packages/tally-charts/src/react/marks/Axis.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { Axis } from './Axis'

const frame = { height: 100, margin: { top: 0, right: 0, bottom: 0, left: 0 }, animate: false }
const labels = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="axis-label"]')].map((el) => el.textContent)

describe('<Axis>', () => {
  it('labels the band ends with outer anchors below the plot', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ type: 'band', domain: ['W1', 'W2', 'W3'], padding: 0 }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" ticks="ends" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['W1', 'W3'])
    const [first, last] = container.querySelectorAll('[data-ch-part="axis-label"]')
    expect(first).toHaveAttribute('text-anchor', 'start')
    expect(first).toHaveAttribute('x', '0')
    expect(first).toHaveAttribute('y', '108')
    expect(last).toHaveAttribute('text-anchor', 'end')
    expect(last).toHaveAttribute('x', '300')
  })

  it('formats linear ticks on the left with a preset', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ domain: [0, 1] }} y={{ domain: [30, 40] }}>
        <Axis side="left" ticks={2} format="percent" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['30.0%', '35.0%', '40.0%'])
    const [first] = container.querySelectorAll('[data-ch-part="axis-label"]')
    expect(first).toHaveAttribute('text-anchor', 'end')
    expect(first).toHaveAttribute('x', '-8')
  })

  it('accepts a custom format function', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ type: 'band', domain: ['a', 'b'] }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" format={(v) => String(v).toUpperCase()} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['A', 'B'])
  })

  it('thins crowded labels', () => {
    const domain = Array.from({ length: 12 }, (_, i) => `Week ${String(i + 1).padStart(2, '0')}`)
    const { container } = render(
      <Chart {...frame} width={200} x={{ type: 'band', domain, padding: 0 }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['Week 01', 'Week 05', 'Week 09'])
  })

  it('keeps every label when thinning is off', () => {
    const domain = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)
    const { container } = render(
      <Chart {...frame} width={200} x={{ type: 'band', domain }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" thin={false} />
      </Chart>,
    )
    expect(labels(container)).toHaveLength(12)
  })
})
```

`packages/tally-charts/src/react/marks/ValueLabel.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { ValueLabel } from './ValueLabel'

const weeks = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderLabels(at: 'first' | 'last' | 'all' | number) {
  return render(
    <Chart
      data={weeks}
      width={200}
      height={120}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
    >
      <ValueLabel at={at} format={(v) => v.toFixed(1)} />
    </Chart>,
  )
}

const texts = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="value-label"]')].map((el) => el.textContent)

describe('<ValueLabel>', () => {
  it('labels only the last bar above its top', () => {
    const { container } = renderLabels('last')
    expect(texts(container)).toEqual(['20.0'])
    const label = container.querySelector('[data-ch-part="value-label"]')
    expect(label).toHaveAttribute('x', '150')
    expect(label).toHaveAttribute('y', '-6')
    expect(label).toHaveAttribute('text-anchor', 'middle')
  })

  it('labels every bar', () => {
    expect(texts(renderLabels('all').container)).toEqual(['10.0', '20.0'])
  })

  it('labels the first bar', () => {
    expect(texts(renderLabels('first').container)).toEqual(['10.0'])
  })

  it('labels a bar by index', () => {
    expect(texts(renderLabels(1).container)).toEqual(['20.0'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/react/marks`
Expected: FAIL with unresolved `./Target`, `./Axis`, `./ValueLabel`.

- [ ] **Step 3: Implement `<Target>`**

`packages/tally-charts/src/react/marks/Target.tsx`:
```tsx
import { useChart } from '../context'

export interface TargetProps {
  /** Draws a vertical rule at this x value. */
  x?: number
  /** Draws a horizontal rule at this y value. */
  y?: number
  label?: string
  labelPosition?: 'start' | 'end'
  variant?: 'line' | 'tick'
  /** Length of the tick variant in px. Default 16. */
  tickLength?: number
}

export function Target({
  x,
  y,
  label,
  labelPosition = 'end',
  variant = 'line',
  tickLength = 16,
}: TargetProps) {
  const ctx = useChart('Target')
  const horizontal = y !== undefined
  const value = horizontal ? y : x
  const resolved = horizontal ? ctx.y : ctx.x
  if (value === undefined) {
    ctx.warn('target-value', 'Target needs an `x` or `y` value.')
    return null
  }
  if (resolved.kind !== 'linear') {
    ctx.warn('target-scale', 'Target needs a linear scale on the axis it marks.')
    return null
  }

  const pos = resolved.scale(value)
  const half = tickLength / 2
  const atEnd = labelPosition === 'end'
  let line: { x1: number; x2: number; y1: number; y2: number }
  if (horizontal) {
    const mid = ctx.innerWidth / 2
    line =
      variant === 'line'
        ? { x1: 0, x2: ctx.innerWidth, y1: pos, y2: pos }
        : { x1: mid - half, x2: mid + half, y1: pos, y2: pos }
  } else {
    const mid = ctx.innerHeight / 2
    line =
      variant === 'line'
        ? { x1: pos, x2: pos, y1: 0, y2: ctx.innerHeight }
        : { x1: pos, x2: pos, y1: mid - half, y2: mid + half }
  }

  let text = null
  if (label && horizontal) {
    text = (
      <text
        data-ch-part="target-label"
        x={atEnd ? ctx.innerWidth : 0}
        y={pos - 6}
        textAnchor={atEnd ? 'end' : 'start'}
      >
        {label}
      </text>
    )
  } else if (label) {
    text = (
      <text
        data-ch-part="target-label"
        x={pos + 6}
        y={atEnd ? 0 : ctx.innerHeight}
        textAnchor="start"
        dominantBaseline={atEnd ? 'hanging' : 'auto'}
      >
        {label}
      </text>
    )
  }

  return (
    <g data-ch-part="target-group">
      <line data-ch-part="target" data-ch-variant={variant} {...line} />
      {text}
    </g>
  )
}
```

- [ ] **Step 4: Implement `<Axis>`**

`packages/tally-charts/src/react/marks/Axis.tsx`:
```tsx
import type { FormatPreset } from '../../core/format'
import { bandTicks, linearTicks, type Tick, type TickSpec, thinTicks } from '../../core/ticks'
import { useChart } from '../context'

export type AxisSide = 'bottom' | 'top' | 'left' | 'right'
export type AxisFormat = FormatPreset | ((value: string | number) => string)

export interface AxisProps {
  side: AxisSide
  ticks?: TickSpec
  format?: AxisFormat
  /** Drop labels that would overlap. Default true. */
  thin?: boolean
  /** Distance between the plot edge and the labels in px. Default 8. */
  offset?: number
}

const LABEL_HEIGHT = 14

interface LabelPosition {
  x: number
  y: number
  textAnchor: 'start' | 'middle' | 'end'
  dominantBaseline: 'hanging' | 'auto' | 'middle'
}

function place(side: AxisSide, tick: Tick, innerWidth: number, innerHeight: number, offset: number): LabelPosition {
  switch (side) {
    case 'bottom':
      return { x: tick.position, y: innerHeight + offset, textAnchor: tick.anchor, dominantBaseline: 'hanging' }
    case 'top':
      return { x: tick.position, y: -offset, textAnchor: tick.anchor, dominantBaseline: 'auto' }
    case 'left':
      return { x: -offset, y: tick.position, textAnchor: 'end', dominantBaseline: 'middle' }
    case 'right':
      return { x: innerWidth + offset, y: tick.position, textAnchor: 'start', dominantBaseline: 'middle' }
  }
}

export function Axis({ side, ticks: spec = 'all', format, thin = true, offset = 8 }: AxisProps) {
  const ctx = useChart('Axis')
  const horizontal = side === 'bottom' || side === 'top'
  const resolved = horizontal ? ctx.x : ctx.y
  const custom = typeof format === 'function' ? format : undefined
  const numeric = ctx.format(typeof format === 'string' ? format : 'number')

  const raw =
    resolved.kind === 'band'
      ? bandTicks(resolved.scale, spec, (v) => (custom ? custom(v) : v))
      : linearTicks(resolved.scale, spec, (v) => (custom ? custom(v) : numeric(v)))
  const ticks = thin ? thinTicks(raw, horizontal ? undefined : () => LABEL_HEIGHT) : raw

  return (
    <g data-ch-part="axis" data-ch-side={side}>
      {ticks.map((tick) => (
        <text
          key={`${tick.value}`}
          data-ch-part="axis-label"
          {...place(side, tick, ctx.innerWidth, ctx.innerHeight, offset)}
        >
          {tick.label}
        </text>
      ))}
    </g>
  )
}
```

- [ ] **Step 5: Implement `<ValueLabel>`**

`packages/tally-charts/src/react/marks/ValueLabel.tsx`:
```tsx
import { toFieldGetter } from '../../core/accessor'
import { computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import type { Accessor } from '../../core/types'
import { useChart } from '../context'

export interface ValueLabelProps<D> {
  at?: 'first' | 'last' | 'all' | number
  x?: Accessor<D, string | number>
  y?: Accessor<D, string | number>
  format?: FormatSpec
  /** Gap between the bar end and the label in px. Default 6. */
  offset?: number
}

/** Value text at the outer end of bars, computed from the same geometry as <Bars>. */
export function ValueLabel<D>({ at = 'all', x, y, format, offset = 6 }: ValueLabelProps<D>) {
  const ctx = useChart('ValueLabel')
  const getX = toFieldGetter(x) ?? ctx.x.field
  const getY = toFieldGetter(y) ?? ctx.y.field
  if (!getX || !getY) return null
  const { orientation, bars } = computeBars({
    data: ctx.data,
    ids: [],
    x: ctx.x,
    y: ctx.y,
    getX,
    getY,
    warn: ctx.warn,
  })
  const selected =
    at === 'all'
      ? bars
      : at === 'first'
        ? bars.slice(0, 1)
        : at === 'last'
          ? bars.slice(-1)
          : bars.filter((bar) => bar.index === at)
  const fmt = ctx.format(format)

  return (
    <g data-ch-part="value-labels">
      {selected.map((bar) => {
        const negative = bar.value < 0
        return orientation === 'vertical' ? (
          <text
            key={bar.index}
            data-ch-part="value-label"
            x={bar.anchor.x}
            y={negative ? bar.anchor.y + offset : bar.anchor.y - offset}
            textAnchor="middle"
            dominantBaseline={negative ? 'hanging' : 'auto'}
          >
            {fmt(bar.value)}
          </text>
        ) : (
          <text
            key={bar.index}
            data-ch-part="value-label"
            x={negative ? bar.anchor.x - offset : bar.anchor.x + offset}
            y={bar.anchor.y}
            textAnchor={negative ? 'end' : 'start'}
            dominantBaseline="middle"
          >
            {fmt(bar.value)}
          </text>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 7: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src/react/marks
git commit -m "feat: add Target, Axis and ValueLabel building blocks

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `TooltipPill` and `Tooltip`

**Files:**
- Create: `packages/tally-charts/src/core/placement.ts`, `src/react/ui/TooltipPill.tsx`, `src/react/overlays/Tooltip.tsx`
- Modify: `packages/tally-charts/src/core/index.ts` (append exports)
- Test: `src/core/placement.test.ts`, `src/react/ui/TooltipPill.test.tsx`, `src/react/overlays/Tooltip.test.tsx`

**Interfaces:**
- Consumes: `useChart` (Task 6); `ChartPoint`, `TooltipSegment`, `useIsoLayoutEffect` (Task 5); `Bars` (Task 7, tests only).
- Produces:
  - `interface PlacementInput { x; y; width; height; minX; maxX; minY; offset }`; `interface Placement { left; top; placement: 'top'|'bottom' }`; `placeTooltip(input): Placement`. Centers horizontally and clamps into `[minX, maxX]`; goes above the point when it fits, otherwise below.
  - `interface TooltipPillProps { segments: TooltipSegment[]; className?: string }`; `<TooltipPill>` renders `.ch-pill` > `.ch-pill-seg` > `.ch-pill-value` + `.ch-pill-label`.
  - `interface TooltipProps { content?: (point: ChartPoint) => ReactNode; offset?: number (10) }`; `<Tooltip>` portals `<div data-ch-part="tooltip" data-ch-placement>` into the chart overlay.

- [ ] **Step 1: Write the failing tests**

`packages/tally-charts/src/core/placement.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { placeTooltip } from './placement'

const base = { width: 80, height: 24, minX: 0, maxX: 300, minY: 0, offset: 10 }

describe('placeTooltip', () => {
  it('centres above the point', () => {
    expect(placeTooltip({ ...base, x: 150, y: 100 })).toEqual({ left: 110, top: 66, placement: 'top' })
  })

  it('clamps to the chart edges', () => {
    expect(placeTooltip({ ...base, x: 10, y: 100 }).left).toBe(0)
    expect(placeTooltip({ ...base, x: 295, y: 100 }).left).toBe(220)
  })

  it('flips below when there is no room above', () => {
    expect(placeTooltip({ ...base, x: 150, y: 20 })).toMatchObject({ top: 30, placement: 'bottom' })
  })

  it('pins to the left edge when wider than the chart', () => {
    expect(placeTooltip({ ...base, width: 400, x: 150, y: 100 }).left).toBe(0)
  })
})
```

`packages/tally-charts/src/react/ui/TooltipPill.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TooltipPill } from './TooltipPill'

describe('<TooltipPill>', () => {
  it('renders one segment per entry with value and optional label', () => {
    const { container } = render(
      <TooltipPill
        segments={[
          { value: '#5819' },
          { value: '12.3%' },
          { value: '35.2%', label: 'on the current path', tone: 'accent' },
        ]}
      />,
    )
    const segments = container.querySelectorAll('.ch-pill-seg')
    expect(segments).toHaveLength(3)
    expect(segments[0]).toHaveTextContent('#5819')
    expect(segments[2]?.querySelector('.ch-pill-value')).toHaveTextContent('35.2%')
    expect(segments[2]?.querySelector('.ch-pill-label')).toHaveTextContent('on the current path')
    expect(segments[2]).toHaveAttribute('data-ch-tone', 'accent')
    expect(segments[0]).not.toHaveAttribute('data-ch-tone')
  })
})
```

`packages/tally-charts/src/react/overlays/Tooltip.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Id } from '../../core/types'
import { Chart } from '../Chart'
import { Bars } from '../marks/Bars'
import { Tooltip, type TooltipProps } from './Tooltip'

type Week = { week: string; margin: number }
const three: Week[] = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
  { week: 'W3', margin: 15 },
]

function Example({ data = three, activeId, tooltip }: { data?: Week[]; activeId?: Id | null; tooltip?: TooltipProps }) {
  return (
    <Chart
      data={data}
      width={300}
      height={120}
      activeId={activeId}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
    >
      <Bars format="percent" />
      <Tooltip {...tooltip} />
    </Chart>
  )
}

const tooltip = (root: HTMLElement) => root.querySelector('[data-ch-part="tooltip"]')

describe('<Tooltip>', () => {
  it('shows nothing until a point is active', () => {
    const { container } = render(<Example />)
    expect(tooltip(container)).toBeNull()
  })

  it('shows the pill for the hovered bar', () => {
    const { container } = render(<Example />)
    fireEvent.pointerEnter(container.querySelectorAll('[data-ch-part="bar-hit"]')[1] as Element)
    expect(tooltip(container)).toHaveTextContent('W2')
    expect(tooltip(container)).toHaveTextContent('20.0%')
  })

  it('shows the tooltip for keyboard focus too', () => {
    const { container } = render(<Example />)
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'ArrowRight' })
    expect(tooltip(container)).toHaveTextContent('W1')
  })

  it('accepts custom content', () => {
    const { container } = render(
      <Example tooltip={{ content: (p) => <span>custom {String(p.id)}</span> }} />,
    )
    fireEvent.pointerEnter(container.querySelectorAll('[data-ch-part="bar-hit"]')[0] as Element)
    expect(screen.getByText('custom 0')).toBeInTheDocument()
  })

  it('hides when the active item disappears from the data', () => {
    const { container, rerender } = render(<Example activeId={2} />)
    expect(tooltip(container)).toHaveTextContent('W3')
    rerender(<Example data={three.slice(0, 2)} activeId={2} />)
    expect(tooltip(container)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/core/placement.test.ts src/react/ui src/react/overlays`
Expected: FAIL with unresolved `./placement`, `./TooltipPill`, `./Tooltip`.

- [ ] **Step 3: Implement placement, pill and tooltip**

`packages/tally-charts/src/core/placement.ts`:
```ts
export interface PlacementInput {
  /** Anchor point in plot coordinates. */
  x: number
  y: number
  /** Measured tooltip size. */
  width: number
  height: number
  /** Allowed horizontal range for the tooltip box. */
  minX: number
  maxX: number
  /** Top edge the tooltip must stay below. */
  minY: number
  /** Gap between anchor and tooltip. */
  offset: number
}

export interface Placement {
  left: number
  top: number
  placement: 'top' | 'bottom'
}

export function placeTooltip({ x, y, width, height, minX, maxX, minY, offset }: PlacementInput): Placement {
  const left = Math.max(minX, Math.min(x - width / 2, maxX - width))
  const above = y - offset - height
  if (above >= minY) return { left, top: above, placement: 'top' }
  return { left, top: y + offset, placement: 'bottom' }
}
```

Append to `packages/tally-charts/src/core/index.ts`:
```ts
export type { Placement, PlacementInput } from './placement'
export { placeTooltip } from './placement'
```

`packages/tally-charts/src/react/ui/TooltipPill.tsx`:
```tsx
import type { CSSProperties } from 'react'
import type { TooltipSegment } from '../types'

export interface TooltipPillProps {
  segments: TooltipSegment[]
  className?: string
}

/** The segmented pill: `#5819 | 12.3% | ABC Property Group`. */
export function TooltipPill({ segments, className }: TooltipPillProps) {
  return (
    <div className={className ? `ch-pill ${className}` : 'ch-pill'} data-ch-part="tooltip-pill">
      {segments.map((segment, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
        <span
          key={i}
          className="ch-pill-seg"
          data-ch-tone={segment.tone}
          style={
            segment.tone
              ? ({ '--ch-swatch-color': `var(--ch-${segment.tone})` } as CSSProperties)
              : undefined
          }
        >
          <span className="ch-pill-value">{segment.value}</span>
          {segment.label !== undefined && segment.label !== null ? (
            <span className="ch-pill-label">{segment.label}</span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
```

`packages/tally-charts/src/react/overlays/Tooltip.tsx`:
```tsx
import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeTooltip } from '../../core/placement'
import { useChart } from '../context'
import type { ChartPoint } from '../types'
import { TooltipPill } from '../ui/TooltipPill'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'

export interface TooltipProps {
  content?: (point: ChartPoint) => ReactNode
  /** Gap between the point and the tooltip in px. Default 10. */
  offset?: number
}

export function Tooltip({ content, offset = 10 }: TooltipProps) {
  const ctx = useChart('Tooltip')
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const point = ctx.activePoint

  // Measure after every render so placement uses the real size before paint.
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  })

  if (!ctx.overlay || !point) return null

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

  return createPortal(
    <div
      ref={ref}
      className="ch-tooltip"
      data-ch-part="tooltip"
      data-ch-placement={position.placement}
      style={{ left: position.left, top: position.top }}
    >
      {content ? content(point) : <TooltipPill segments={point.segments} />}
    </div>,
    ctx.overlay,
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 5: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src
git commit -m "feat: add TooltipPill and an edge-aware Tooltip overlay

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `Legend`

**Files:**
- Create: `packages/tally-charts/src/react/ui/Legend.tsx`
- Test: `packages/tally-charts/src/react/ui/Legend.test.tsx`

**Interfaces:**
- Consumes: `Tone`, `Fill` (Task 1); `.ch-legend*` / `.ch-swatch` styles (Task 4).
- Produces:
  - `interface LegendItem { label: ReactNode; tone: Tone; fill?: Fill ('solid'); count?: ReactNode; shape?: 'bar'|'dot' }`.
  - `interface LegendProps { items: LegendItem[]; shape?: 'bar'|'dot' ('bar'); className? }`.
  - `<ul class="ch-legend" data-ch-part="legend">` with `<li class="ch-legend-item">` items, each holding `<span class="ch-swatch" aria-hidden data-ch-tone data-ch-fill data-ch-shape>`.

- [ ] **Step 1: Write the failing test**

`packages/tally-charts/src/react/ui/Legend.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Legend } from './Legend'

describe('<Legend>', () => {
  it('renders a list item per entry with swatch metadata', () => {
    render(
      <Legend
        items={[
          { label: 'Estimate', tone: 'accent', fill: 'hatch' },
          { label: 'Actual', tone: 'accent' },
          { label: 'Critical', tone: 'loss', count: 6, shape: 'dot' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Estimate')
    const swatch = (i: number) => items[i]?.querySelector('.ch-swatch')
    expect(swatch(0)).toHaveAttribute('data-ch-fill', 'hatch')
    expect(swatch(0)).toHaveAttribute('data-ch-tone', 'accent')
    expect(swatch(0)).toHaveAttribute('aria-hidden', 'true')
    expect(swatch(1)).toHaveAttribute('data-ch-fill', 'solid')
    expect(swatch(2)).toHaveAttribute('data-ch-shape', 'dot')
    expect(items[2]).toHaveTextContent('Critical6')
  })

  it('applies the legend-level shape to items without one', () => {
    render(<Legend shape="dot" items={[{ label: 'On target', tone: 'gain' }]} />)
    expect(screen.getByRole('listitem').querySelector('.ch-swatch')).toHaveAttribute('data-ch-shape', 'dot')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter tally-charts test src/react/ui/Legend.test.tsx`
Expected: FAIL with unresolved `./Legend`.

- [ ] **Step 3: Implement `<Legend>`**

`packages/tally-charts/src/react/ui/Legend.tsx`:
```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { Fill, Tone } from '../../core/types'

export interface LegendItem {
  label: ReactNode
  tone: Tone
  fill?: Fill
  count?: ReactNode
  shape?: 'bar' | 'dot'
}

export interface LegendProps {
  items: LegendItem[]
  shape?: 'bar' | 'dot'
  className?: string
}

export function Legend({ items, shape = 'bar', className }: LegendProps) {
  return (
    <ul className={className ? `ch-legend ${className}` : 'ch-legend'} data-ch-part="legend">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: labels may be non-string nodes; order is stable
        <li key={i} className="ch-legend-item">
          <span
            aria-hidden="true"
            className="ch-swatch"
            data-ch-tone={item.tone}
            data-ch-fill={item.fill ?? 'solid'}
            data-ch-shape={item.shape ?? shape}
            style={{ '--ch-swatch-color': `var(--ch-${item.tone})` } as CSSProperties}
          />
          <span className="ch-legend-label">{item.label}</span>
          {item.count !== undefined && item.count !== null ? (
            <span className="ch-legend-count">{item.count}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS.

- [ ] **Step 5: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts/src/react/ui
git commit -m "feat: add Legend with swatches matching chart fills

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Public entry points, SSR, hydration and size budgets

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (replace whole file)
- Create: `packages/tally-charts/test/fixtures.tsx`, `packages/tally-charts/.size-limit.json`, `packages/tally-charts/README.md`
- Test: `packages/tally-charts/src/index.test.ts`, `packages/tally-charts/src/ssr.node.test.tsx`, `packages/tally-charts/src/hydration.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces:
  - **Main entry** exports `Chart`, `useChart`, `ChartsProvider`, `useFormat`, `useRegisterPoints`, `Bars`, `Axis`, `Target`, `ValueLabel`, `Tooltip`, `TooltipPill`, `Legend`, `fmt`, `createFormatter`, `TONES`, plus all their prop types. `tally-charts/core` keeps its exports.
  - **`test/fixtures.tsx`** exports `LastTwelveWeeks()`, the reference card body.

- [ ] **Step 1: Write the failing tests and the shared fixture**

`packages/tally-charts/test/fixtures.tsx`:
```tsx
import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from '../src'

export const weeks = [
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

export function LastTwelveWeeks() {
  return (
    <Chart
      data={weeks}
      title="Margin by week, last 12 weeks"
      description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
      height={260}
      margin={{ top: 24, bottom: 28 }}
      x={{ type: 'band', field: 'week', padding: 0.35 }}
      y={{ field: 'margin', domain: [26, 40] }}
    >
      <Target y={38} label="Target 38%" />
      <Bars fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')} format="percent" />
      <ValueLabel at="last" format={(v) => v.toFixed(1)} />
      <Axis side="bottom" ticks="ends" />
      <Tooltip />
    </Chart>
  )
}
```

`packages/tally-charts/src/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import * as core from './core'
import * as main from './index'

describe('public entry points', () => {
  it.each([
    'Chart',
    'useChart',
    'ChartsProvider',
    'useFormat',
    'useRegisterPoints',
    'Bars',
    'Axis',
    'Target',
    'ValueLabel',
    'Tooltip',
    'TooltipPill',
    'Legend',
    'fmt',
    'createFormatter',
    'TONES',
  ])('main exports %s', (name) => {
    expect(main).toHaveProperty(name)
  })

  it.each([
    'createScale',
    'linearScale',
    'bandTicks',
    'thinTicks',
    'computeBars',
    'placeTooltip',
    'createFormatters',
    'createWarner',
  ])('core exports %s', (name) => {
    expect(core).toHaveProperty(name)
  })
})
```

`packages/tally-charts/src/ssr.node.test.tsx`:
```tsx
// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LastTwelveWeeks } from '../test/fixtures'

describe('server rendering', () => {
  it('renders without a DOM', () => {
    expect(typeof document).toBe('undefined')
    const html = renderToString(<LastTwelveWeeks />)
    expect(html).toContain('<svg')
    expect(html.match(/data-ch-part="bar"/g)).toHaveLength(12)
    expect(html).toContain('<pattern')
    expect(html).toContain('Target 38%')
    expect(html).toContain('width="640"')
  })

  it('is deterministic', () => {
    expect(renderToString(<LastTwelveWeeks />)).toBe(renderToString(<LastTwelveWeeks />))
  })
})
```

`packages/tally-charts/src/hydration.test.tsx`:
```tsx
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LastTwelveWeeks } from '../test/fixtures'

describe('hydration', () => {
  it('hydrates server markup without mismatches', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = renderToString(<LastTwelveWeeks />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    await act(async () => {
      hydrateRoot(container, <LastTwelveWeeks />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    const hydrationErrors = errors.mock.calls.filter((call) =>
      String(call[0]).toLowerCase().includes('hydrat'),
    )
    expect(hydrationErrors).toEqual([])
    container.remove()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts test src/index.test.ts src/ssr.node.test.tsx src/hydration.test.tsx`
Expected: FAIL. `fixtures.tsx` can't import `Axis`, `Bars`, … from `../src`, and `index.test.ts` reports missing exports.

- [ ] **Step 3: Write the public entry**

Replace `packages/tally-charts/src/index.ts` with:
```ts
export type { FormatPreset, FormatSpec, Formatter, Formatters } from './core/format'
export { createFormatter, fmt } from './core/format'
export type { BandScaleSpec, LinearScaleSpec, ScaleSpec } from './core/scale'
export type { TickSpec } from './core/ticks'
export type { Accessor, Fill, Id, PerItem, Tone } from './core/types'
export { TONES } from './core/types'
export type { ChartProps } from './react/Chart'
export { Chart } from './react/Chart'
export type { ChartsProviderProps, UseFormatResult } from './react/ChartsProvider'
export { ChartsProvider, useFormat } from './react/ChartsProvider'
export type { ChartContextValue, Margin } from './react/context'
export { useChart } from './react/context'
export type { AxisFormat, AxisProps, AxisSide } from './react/marks/Axis'
export { Axis } from './react/marks/Axis'
export type { BarsProps } from './react/marks/Bars'
export { Bars } from './react/marks/Bars'
export type { TargetProps } from './react/marks/Target'
export { Target } from './react/marks/Target'
export type { ValueLabelProps } from './react/marks/ValueLabel'
export { ValueLabel } from './react/marks/ValueLabel'
export type { TooltipProps } from './react/overlays/Tooltip'
export { Tooltip } from './react/overlays/Tooltip'
export type { ActiveSource, ChartPoint, TooltipSegment } from './react/types'
export type { LegendItem, LegendProps } from './react/ui/Legend'
export { Legend } from './react/ui/Legend'
export type { TooltipPillProps } from './react/ui/TooltipPill'
export { TooltipPill } from './react/ui/TooltipPill'
export { useRegisterPoints } from './react/useRegisterPoints'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts test`
Expected: PASS, including the node-environment SSR suite and the hydration suite.

- [ ] **Step 5: Add the size budgets and README**

`packages/tally-charts/.size-limit.json`:
```json
[
  {
    "name": "tally-charts/core",
    "path": "dist/core/index.js",
    "limit": "8 KB"
  },
  {
    "name": "Chart + Bars + Axis + Target + Tooltip",
    "path": "dist/index.js",
    "import": "{ Chart, Bars, Axis, Target, Tooltip }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB"
  }
]
```

`packages/tally-charts/README.md`:
````md
# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

> Status: 0.1 foundation. The API may change before 1.0.

```bash
npm i tally-charts
```

```tsx
import 'tally-charts/theme.css'
import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from 'tally-charts'

<Chart
  data={weeks}
  title="Margin by week"
  height={260}
  x={{ type: 'band', field: 'week', padding: 0.35 }}
  y={{ field: 'margin', domain: [26, 40] }}
>
  <Target y={38} label="Target 38%" />
  <Bars fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')} format="percent" />
  <ValueLabel at="last" format={(v) => v.toFixed(1)} />
  <Axis side="bottom" ticks="ends" />
  <Tooltip />
</Chart>
```

Theme with CSS custom properties (`--ch-accent`, `--ch-loss`, `--ch-hatch-gap`, …). Dark mode
follows `prefers-color-scheme` unless an ancestor sets `data-ch-theme="light"` or `"dark"`.

MIT licensed.
````

- [ ] **Step 6: Build and check the budgets**

Run: `pnpm build && pnpm size`
Expected: both entries print a size under their limit and the command exits 0. If `core` is over 8 KB, check the built file for `d3-format`/`d3-interpolate`. Their presence means something imported `scaleLinear`; remove that import. Don't raise the limit.

- [ ] **Step 7: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add packages/tally-charts
git commit -m "feat: expose public entry points with SSR, hydration and size checks

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Storybook with reference stories

**Files:**
- Create: `apps/storybook/package.json`, `apps/storybook/tsconfig.json`
- Create: `apps/storybook/.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview.css`, `.storybook/css.d.ts`
- Create: `apps/storybook/stories/LastTwelveWeeks.stories.tsx`, `apps/storybook/stories/Legend.stories.tsx`

**Interfaces:**
- Consumes: the public `tally-charts` entry and `tally-charts/theme.css` (Task 11), aliased to source.
- Produces:
  - Story IDs used by Task 13: `reference-last-12-weeks--light`, `reference-last-12-weeks--dark`, `primitives-legend--default`.
  - `parameters.theme` (`'light'|'dark'`) pins a story's theme. The preview decorator sets `data-ch-theme` on the wrapper.

- [ ] **Step 1: Create the Storybook app**

`apps/storybook/package.json`:
```json
{
  "name": "storybook-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "storybook build -o storybook-static",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tally-charts": "workspace:*"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.13.0",
    "@playwright/test": "1.64.0",
    "@storybook/react-vite": "10.6.2",
    "@types/node": "^24.0.0",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "http-server": "14.1.1",
    "storybook": "10.6.2",
    "typescript": "6.0.3",
    "vite": "8.3.4"
  }
}
```

`apps/storybook/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
    "paths": {
      "tally-charts": ["../../packages/tally-charts/src/index.ts"],
      "tally-charts/core": ["../../packages/tally-charts/src/core/index.ts"]
    }
  },
  "include": [".storybook", "stories", "e2e", "playwright.config.ts"]
}
```

`apps/storybook/.storybook/css.d.ts`:
```ts
declare module '*.css'
```

`apps/storybook/.storybook/main.ts`:
```ts
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const src = fileURLToPath(new URL('../../../packages/tally-charts/src', import.meta.url))

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.tsx'],
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        // Stories run against library source so edits show up without a build.
        alias: [
          { find: /^tally-charts\/theme\.css$/, replacement: `${src}/theme/theme.css` },
          { find: /^tally-charts\/core$/, replacement: `${src}/core/index.ts` },
          { find: /^tally-charts$/, replacement: `${src}/index.ts` },
        ],
      },
    }),
}

export default config
```

`apps/storybook/.storybook/preview.css`:
```css
body {
  margin: 0;
}

.sb-canvas {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 32px;
  background: color-mix(in srgb, var(--ch-surface) 94%, var(--ch-ink));
  color: var(--ch-ink);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.card {
  box-sizing: border-box;
  max-width: 520px;
  padding: 28px;
  border-radius: 28px;
  background: var(--ch-surface);
  box-shadow: 0 0 0 1px var(--ch-grid);
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 40px;
}

.card-title {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
}

.card-meta {
  color: var(--ch-ink-muted);
  font-size: 15px;
}
```

`apps/storybook/.storybook/preview.tsx`:
```tsx
import type { Preview } from '@storybook/react-vite'
import 'tally-charts/theme.css'
import './preview.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, { globals, parameters }) => (
      <div className="sb-canvas" data-ch-theme={parameters.theme ?? globals.theme}>
        <Story />
      </div>
    ),
  ],
}

export default preview
```

- [ ] **Step 2: Write the reference stories**

`apps/storybook/stories/LastTwelveWeeks.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from 'tally-charts'

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

function LastTwelveWeeks() {
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
      >
        <Target y={38} label="Target 38%" />
        <Bars fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')} format="percent" />
        <ValueLabel at="last" format={(v) => v.toFixed(1)} />
        <Axis side="bottom" ticks="ends" />
        <Tooltip />
      </Chart>
    </article>
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
```

`apps/storybook/stories/Legend.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend } from 'tally-charts'

// Legends from docs/reference/03-estimate-vs-actual.png and 02-jobs-dot-histogram-table.png.
function Legends() {
  return (
    <div className="card" style={{ display: 'grid', gap: 20 }}>
      <Legend
        items={[
          { label: 'Estimate', tone: 'accent', fill: 'hatch' },
          { label: 'Actual', tone: 'accent' },
          { label: 'Over estimate', tone: 'loss', fill: 'hatch' },
        ]}
      />
      <Legend
        shape="dot"
        items={[
          { label: 'Critical', tone: 'loss', count: 6 },
          { label: 'At risk', tone: 'warn', count: 16 },
          { label: 'Below target', tone: 'accent-soft', count: 42 },
          { label: 'On target', tone: 'gain', count: 94 },
        ]}
      />
    </div>
  )
}

const meta = { title: 'Primitives/Legend', component: Legends } satisfies Meta<typeof Legends>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

- [ ] **Step 3: Install and build Storybook**

Run: `pnpm install && pnpm --filter storybook-app typecheck && pnpm --filter storybook-app build`
Expected: typecheck clean; build ends with `Output directory: .../apps/storybook/storybook-static`.

- [ ] **Step 4: Look at the stories and compare them with the reference**

Run: `pnpm --filter storybook-app dev`, then open `http://localhost:6006/?path=/story/reference-last-12-weeks--light`.
Expected, compared with `docs/reference/01-gross-margin-waterfall.png` (bottom-left card):
- **Bars:** eleven hatched blue bars fading toward the bottom, then one solid blue last bar.
- **Labels:** a dashed "Target 38%" rule near the top with its label on the right, `34.0` above the last bar, and `Jul 6` / `Sep 21` at the bottom ends.
- **Interaction:** hovering a bar shows a pill with week and value and dims the others. Tab focuses the chart (visible outline); arrow keys move the tooltip.
- **Dark story:** same layout on a dark surface.

Then check the Legend story: hatched swatches visibly striped "////", dot swatches round.
Stop the dev server.

- [ ] **Step 5: Format, check and commit**

```bash
pnpm format && pnpm typecheck && pnpm lint
git add apps/storybook pnpm-lock.yaml
git commit -m "chore: add Storybook with Last 12 weeks and Legend reference stories

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Visual and accessibility tests, CI, Changesets

**Files:**
- Create: `apps/storybook/playwright.config.ts`, `apps/storybook/e2e/stories.spec.ts`
- Create: `.github/workflows/ci.yml`
- Create: `.changeset/config.json` (via `changeset init`), `.changeset/foundation-0-1.md`
- Generated: `apps/storybook/e2e/__screenshots__/darwin/*.png` (local baselines)

**Interfaces:**
- Consumes: story IDs from Task 12; root scripts from Task 1.
- Produces: `pnpm test:e2e` (visual + axe + keyboard); a CI workflow with `check` and `e2e` jobs; a minor changeset bumping `tally-charts` to 0.1.0.

- [ ] **Step 1: Write the Playwright config and tests**

`apps/storybook/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Baselines are per platform; CI (linux) generates its own on first run and uploads them.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  updateSnapshots: 'missing',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  use: { baseURL: 'http://127.0.0.1:6007' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 800, height: 600 } } }],
  webServer: {
    command: 'pnpm run build && pnpm exec http-server storybook-static -p 6007 -s',
    url: 'http://127.0.0.1:6007',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

`apps/storybook/e2e/stories.spec.ts`:
```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const STORIES = [
  'reference-last-12-weeks--light',
  'reference-last-12-weeks--dark',
  'primitives-legend--default',
]

async function open(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root [data-ch-root], #storybook-root .ch-legend').first().waitFor()
}

for (const id of STORIES) {
  test(`${id} matches its screenshot`, async ({ page }) => {
    await open(page, id)
    await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true })
  })

  test(`${id} has no axe violations`, async ({ page }) => {
    await open(page, id)
    const results = await new AxeBuilder({ page })
      .include('#storybook-root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
}

test('keyboard focus shows the tooltip and announces the point', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  const chart = page.locator('[data-ch-root]')
  await chart.focus()
  await page.keyboard.press('End')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Sep 21')
  await expect(chart.locator('[aria-live]')).toHaveText('Sep 21, 34.0%')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ch-part="tooltip"]')).toHaveCount(0)
})

test('hovering a bar dims the others', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  await page.locator('[data-ch-part="bar-hit"]').nth(3).hover()
  await expect(page.locator('[data-ch-part="bar"][data-ch-dimmed="true"]')).toHaveCount(11)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 27')
})
```

- [ ] **Step 2: Install the browser and run the e2e suite twice**

Run: `pnpm --filter storybook-app exec playwright install chromium && pnpm test:e2e`
Expected on the first run: screenshot tests write new baselines under `e2e/__screenshots__/darwin/` and pass; axe, keyboard and hover tests pass. If axe reports `color-contrast`, fix the token in `theme.css`, not the test.

Run again: `pnpm test:e2e`
Expected: all 8 tests PASS against the stored baselines.

Open the three PNGs in `e2e/__screenshots__/darwin/` and confirm they match what you checked in Task 12 Step 4.

- [ ] **Step 3: Set up Changesets**

Run: `pnpm changeset init`
Then edit `.changeset/config.json` so it contains `"access": "public"` and `"baseBranch": "main"`, leaving the generated keys as they are.

Create `.changeset/foundation-0-1.md`:
```md
---
'tally-charts': minor
---

Foundation release: theme tokens with light and dark themes, `tally-charts/core` utilities
(formatters, scales, ticks, bar layout, tooltip placement), `<Chart>`, `Bars`, `Axis`, `Target`,
`ValueLabel`, `Tooltip`, `TooltipPill`, `Legend`, `ChartsProvider`, `useFormat` and `fmt`.
```

Run: `pnpm changeset status`
Expected: lists `tally-charts` with a minor bump.

- [ ] **Step 4: Add the CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
      - run: pnpm size

  e2e:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.64.0-noble
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:e2e
        env:
          CI: 'true'
      - name: Upload screenshots (commit new linux baselines from here)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-screenshots
          path: |
            apps/storybook/e2e/__screenshots__
            apps/storybook/test-results
```

- [ ] **Step 5: Run the full local gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm size && pnpm test:e2e`
Expected: every step exits 0.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add apps/storybook .github .changeset
git commit -m "test: add visual, axe and keyboard e2e checks, CI and 0.1 changeset

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

After the first CI run on GitHub, download the `e2e-screenshots` artifact and commit `__screenshots__/linux/*.png`. From then on, CI compares against them instead of generating new ones.
