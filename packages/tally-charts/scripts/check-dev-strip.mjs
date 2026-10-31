// Bundles the built main entry the way an app's production and development builds would. Fails if
// any development warning text survives the production build, or if the development build can't
// turn warnings on (no `process` global, as in a browser dev server). Run after `pnpm build`.
import vm from 'node:vm'
import { build } from 'esbuild'

const bundle = async (nodeEnv, options) => {
  const result = await build({
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    packages: 'external',
    define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
    logLevel: 'silent',
    ...options,
  })
  return result.outputFiles[0].text
}

const code = await bundle('production', { entryPoints: ['dist/index.js'] })
// One phrase from each warning site.
const phrases = [
  'skipped a missing',
  'need one band scale',
  'has no domain',
  'Missing or duplicate id',
  'outside the chart domain',
  'needs a linear scale',
  'Bars need x and y fields',
  'ComparisonBars skipped',
  'RunwayChart needs a domain',
  'RunwayChart `cell`',
  'RunwayChart `breaks`',
  'RunwayChart shows at most 200 cells',
  'RunwayChart has duplicate row ids',
  'announce an unnamed list',
  'RunwayChart dropped a projection point',
  'RunwayChart sorted the projection',
  'RunwayChart ignored an invalid',
  'RunwayChart ignored a runsOutAt',
  'RowLabels need a band scale',
  'RowLabels need a row field',
  'RowDividers need a band scale',
  'Target needs an',
  'Target category ',
  'Target position ',
  '`position` only applies on a band or point scale',
  'Target value',
  'Bars `color` only applies',
  'The y2 scale must be linear',
  '<Chart y2> was ignored',
  'needs a linear <Chart y2>',
  'only applies on side left or right',
  'skipped an x value that is not a date',
  'skipped a date outside the x domain',
  'has no valid dates',
  'has no `title`',
  'has a value that is not a date',
  'runwayForecast needs',
  'must be a function on a band or point scale',
  'must be greater than min',
  'which is not finite; it counts as 0',
  'is not finite; it shows No data',
]
const leaks = phrases.filter((phrase) => code.includes(phrase))
if (leaks.length > 0) {
  console.error('Development warnings survived a production build:', leaks)
  process.exit(1)
}

const devCode = await bundle('development', { entryPoints: ['dist/index.js'] })
const survivors = phrases.filter((phrase) => devCode.includes(phrase))
if (survivors.length === 0) {
  console.error('No development warning text survived a development build.')
  process.exit(1)
}

// Evaluate DEV in a context without `process`, like a browser running a dev bundle. DEV is
// internal; tsdown.config.ts keeps src/core/warn.ts verbatim in its own dist chunk.
const devFlag = await bundle('development', {
  stdin: {
    contents: "import { DEV } from './src/core/warn.ts'\nglobalThis.__isDev = DEV",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  format: 'iife',
})
const sandbox = {}
vm.runInNewContext(devFlag, sandbox)
if (sandbox.__isDev !== true) {
  console.error(`DEV is ${sandbox.__isDev} in a development build without a process global.`)
  process.exit(1)
}

console.log(
  `ok: development warnings are stripped (${code.length} bytes) and enabled in development (${survivors.length}/${phrases.length} phrases)`,
)
