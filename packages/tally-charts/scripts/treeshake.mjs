// Tree-shaking check, as pure functions (the CLI is check-treeshake.mjs). dist/index.js is one file,
// so a bundler's metafile only lists dist files. The sourcemap tells which src modules the bytes of
// a bundle came from: tsdown writes one for dist, and esbuild chains it into the bundle's own map.
// `map.sources` lists every module of dist, so only sources that a mapping segment points to count.
import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// One mapping segment is 1, 4 or 5 base64 VLQ numbers; only 4 and 5 point to a source.
const decodeSegment = (segment) => {
  const values = []
  let value = 0
  let shift = 0
  for (const char of segment) {
    const digit = BASE64.indexOf(char)
    if (digit < 0) throw new Error(`Invalid sourcemap segment "${segment}"`)
    value += (digit & 31) << shift
    if (digit & 32) {
      shift += 5
    } else {
      values.push(value & 1 ? -(value >> 1) : value >> 1)
      value = 0
      shift = 0
    }
  }
  return values
}

const packageName = (file) => {
  const parts = file.split('node_modules/').pop().split('/')
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

// Sources in a map are relative to the map; module names are relative to `root`: `src/...`, or
// `pkg:<name>` for anything from node_modules.
const moduleName = (source, root, mapDir) => {
  if (source.includes('node_modules/')) return `pkg:${packageName(source)}`
  return path.relative(root, path.resolve(mapDir, source)).split(path.sep).join('/')
}

/**
 * The modules a bundle takes bytes from: sources with at least one mapping segment in `map`
 * (the bundle's sourcemap, as a string or an object). Throws when none is under `srcDir`: a
 * bundle without a sourcemap would otherwise pass every check.
 */
export const bundledModules = (
  code,
  map,
  { root = process.cwd(), mapDir = root, srcDir = 'src' } = {},
) => {
  const { sources, mappings } = typeof map === 'string' ? JSON.parse(map) : map
  const lines = mappings.split(';')
  if (lines.length > code.split('\n').length + 1) {
    throw new Error('The sourcemap has more lines than the code: it belongs to another bundle')
  }
  const used = new Set()
  let source = 0
  for (const line of lines) {
    for (const segment of line.split(',')) {
      if (segment === '') continue
      const values = decodeSegment(segment)
      if (values.length >= 4) {
        source += values[1]
        used.add(source)
      }
    }
  }
  const modules = new Set()
  for (const index of used) {
    const name = sources[index]
    if (name !== undefined) modules.add(moduleName(name, root, mapDir))
  }
  const prefix = `${srcDir.replace(/\/$/, '')}/`
  if (![...modules].some((name) => name.startsWith(prefix))) {
    throw new Error(
      `no src modules mapped (expected sources under ${prefix}): does dist have a sourcemap?`,
    )
  }
  return modules
}

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx']

const resolveSource = (root, from, specifier) => {
  const base = path.posix.join(path.posix.dirname(from), specifier)
  for (const extension of EXTENSIONS) {
    if (fs.existsSync(path.join(root, base + extension))) return base + extension
  }
  throw new Error(`Cannot resolve ${specifier} from ${from}`)
}

/**
 * The src module that defines each exported name, found through the value re-exports
 * (`export { X } from './x'`, not `export type`) of the index file. Throws on an unknown name.
 */
export const definingModules = (
  names,
  { root = process.cwd(), indexFile = 'src/index.ts' } = {},
) => {
  const source = fs.readFileSync(path.join(root, indexFile), 'utf8')
  const owners = new Map()
  for (const [, list, specifier] of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    for (const item of list.split(',')) {
      const exported = item
        .trim()
        .split(/\s+as\s+/)
        .pop()
      if (exported) owners.set(exported, specifier)
    }
  }
  const modules = new Set()
  for (const name of names) {
    const specifier = owners.get(name)
    if (specifier === undefined) throw new Error(`${indexFile} has no value export "${name}"`)
    modules.add(resolveSource(root, indexFile, specifier))
  }
  return [...modules]
}

/**
 * Every module that bundling `entries` (src files, relative to `root`) can reach: the keys of the
 * esbuild import graph, plus `pkg:<name>` for each package it imports. This is the most a
 * tree-shaken bundle may contain.
 */
export const expectedModules = async ({ root = process.cwd(), entries }) => {
  const result = await build({
    absWorkingDir: root,
    entryPoints: entries,
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'neutral',
    jsx: 'automatic',
    packages: 'external',
    outdir: path.join(root, '.treeshake-expected'),
    logLevel: 'silent',
  })
  const expected = new Set()
  for (const [file, input] of Object.entries(result.metafile.inputs)) {
    expected.add(file)
    for (const item of input.imports) {
      if (item.external && !item.path.startsWith('.') && !item.path.startsWith('/')) {
        expected.add(`pkg:${packageName(`node_modules/${item.path}`)}`)
      }
    }
  }
  return expected
}

const globToRegExp = (glob) =>
  new RegExp(
    `^${glob
      .split('**')
      .map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*'))
      .join('.*')}$`,
  )

/**
 * Bundles `export { names } from specifier` (or `export *` without names) the way size-limit does,
 * and compares the src modules in the result with the ones the import graph allows.
 *
 * `entry`: `{ name, specifier, names?, modules, forbid? }`. `modules` are the src files that define
 * the exports (see definingModules); `forbid` are globs of modules that must not be bundled even if
 * the graph reaches them.
 * `options`: `root` (package directory), `distDir` (absolute; the only own files a bundle may
 * read), `dependencies` (the only packages it may bundle), `srcDir`.
 *
 * Returns `{ modules, leaks, forbidden, problems }`; all three lists are empty when it is fine.
 */
export const findLeaks = async (
  entry,
  {
    root = process.cwd(),
    distDir = path.join(root, 'dist'),
    dependencies = [],
    srcDir = 'src',
  } = {},
) => {
  const exportList = entry.names ? `{ ${entry.names.join(', ')} }` : '*'
  const outfile = path.join(root, '.treeshake-bundle.js')
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `export ${exportList} from ${JSON.stringify(entry.specifier)}`,
      resolveDir: root,
      loader: 'js',
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    metafile: true,
    sourcemap: 'external',
    outfile,
    define: { 'process.env.NODE_ENV': '"production"' },
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    logLevel: 'silent',
  })
  const file = (extension) => result.outputFiles.find((output) => output.path.endsWith(extension))
  const modules = bundledModules(file('.js').text, file('.map').text, { root, srcDir })

  const expected = await expectedModules({ root, entries: entry.modules })
  const forbid = (entry.forbid ?? []).map(globToRegExp)
  const sorted = (list) => [...list].sort()
  const leaks = sorted([...modules].filter((name) => !expected.has(name)))
  const forbidden = sorted([...modules].filter((name) => forbid.some((rule) => rule.test(name))))

  // The metafile sees what the bundler read: own files only from dist, packages only from
  // `dependencies`, and no stylesheet in a JS bundle.
  const problems = []
  const output = Object.values(result.metafile.outputs).find((item) => item.entryPoint) ?? {}
  for (const [input, { bytesInOutput }] of Object.entries(output.inputs ?? {})) {
    if (bytesInOutput === 0 || input === '<stdin>') continue
    const absolute = path.resolve(root, input)
    if (/\.css$/.test(input)) problems.push(`${input}: a stylesheet in the JS bundle`)
    else if (input.includes('node_modules/')) {
      if (!dependencies.includes(packageName(input)))
        problems.push(`${input}: ${packageName(input)} is not in dependencies`)
    } else if (!absolute.startsWith(distDir + path.sep))
      problems.push(`${input}: not a file of dist`)
  }
  return { modules: sorted(modules), leaks, forbidden, problems }
}
