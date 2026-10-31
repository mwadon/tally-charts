// Bundles one fixture per size-limit entry (`export { ... } from 'tally-charts'`) with esbuild and
// fails if the bundle holds a src module outside the import graph of what the fixture imports, or
// one that a rule below forbids. That catches top-level code a bundler can't drop (a call without
// /* @__PURE__ */, a context, a constant) which drags a chart's dependencies into every import.
// Run after pnpm build.
import fs from 'node:fs'
import path from 'node:path'
import { definingModules, findLeaks } from './treeshake.mjs'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const { default: entries } = await import(path.join(root, '.size-limit.js'))

const CHARTS = 'src/react/charts/'
const OWN_CHART = /^src\/react\/charts\/(\w+)\.tsx$/
const CHART_MODULES = fs
  .readdirSync(path.join(root, CHARTS))
  .filter((file) => /^[A-Z]\w+\.tsx$/.test(file))
  .map((file) => CHARTS + file)

// What an entry must not bundle even where its import graph reaches it. Anything outside the
// graph is a leak without a rule; a rule covers code the graph includes but a bundle shouldn't.
const NO_CHART_PARTS = [
  'src/react/Chart.tsx',
  'src/react/marks/**',
  'src/react/charts/**',
  'src/react/context.ts',
]
const FORBID = {
  'tally-charts/core': ['src/react/**'],
  // TooltipPill and util.ts are LineChart's own; the other ui pieces are not.
  LineChart: [
    'src/react/charts/RunwayChart.tsx',
    'src/core/runway.ts',
    ...[
      'Stat',
      'Delta',
      'Meter',
      'RangeMeter',
      'InlineBar',
      'DotCount',
      'ShareBar',
      'ZoneMeter',
      'Sparkline',
    ].map((piece) => `src/react/ui/${piece}.tsx`),
    'src/react/ui/share.ts',
  ],
  'Small UI pieces': NO_CHART_PARTS,
  Sparkline: NO_CHART_PARTS,
  Stat: NO_CHART_PARTS,
}

// A chart must not bring in another chart.
const forbidFor = (name, modules) => {
  const own = new Set(modules)
  const others = modules.some((file) => OWN_CHART.test(file))
    ? CHART_MODULES.filter((file) => !own.has(file))
    : []
  return [...(FORBID[name] ?? []), ...others]
}

// `dist/index.js` is `tally-charts`, `dist/core/index.js` is `tally-charts/core`.
const specifierOf = (file) => {
  const [subpath] =
    Object.entries(pkg.exports).find(([, target]) => target.default === `./${file}`) ?? []
  if (subpath === undefined) throw new Error(`${file} is not in package.json exports`)
  return path.posix.join(pkg.name, subpath)
}

const fixtures = entries.map(({ name, path: file, import: imported }) => ({
  name,
  specifier: specifierOf(file),
  names: imported
    ? imported
        .replace(/[{}]/g, '')
        .split(',')
        .map((item) => item.trim())
    : undefined,
  extra: false,
}))
// Stat alone: the entry above bundles it with ZoneMeter and ShareBar, which hides what Stat pulls in.
fixtures.push({ name: 'Stat', specifier: pkg.name, names: ['Stat'], extra: true })

const dependencies = Object.keys(pkg.dependencies ?? {})
let failed = 0
for (const fixture of fixtures) {
  const modules = fixture.names
    ? definingModules(fixture.names)
    : [
        path.posix.join(
          'src',
          path.posix.dirname(fixture.specifier.slice(pkg.name.length + 1)),
          'index.ts',
        ),
      ]
  const entry = { ...fixture, modules, forbid: forbidFor(fixture.name, modules) }
  const result = await findLeaks(entry, { root, dependencies })
  const bad = result.leaks.length + result.forbidden.length + result.problems.length > 0
  if (bad) failed += 1
  const label = fixture.extra ? `${fixture.name} (extra)` : fixture.name
  console.log(`${label}: ${result.modules.length} modules, ${bad ? 'FAIL' : 'OK'}`)
  for (const leak of result.leaks) console.log(`    leak (outside the import graph): ${leak}`)
  for (const item of result.forbidden) console.log(`    forbidden: ${item}`)
  for (const problem of result.problems) console.log(`    ${problem}`)
}

if (failed > 0) {
  console.error(`${failed} of ${fixtures.length} fixtures bundle modules they should not.`)
  process.exit(1)
}
console.log(`ok: ${fixtures.length} fixtures bundle only their own import graph`)
