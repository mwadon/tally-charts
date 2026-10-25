export interface BundleOptions {
  /** Package directory. Module names are relative to it. */
  root?: string
  /** Directory the `sources` of the map are relative to. Defaults to `root`. */
  mapDir?: string
  /** Directory of the sources, relative to `root`. Defaults to `src`. */
  srcDir?: string
}

export interface TreeshakeEntry {
  name: string
  /** What the fixture imports from: `tally-charts`, or the path of a bundle. */
  specifier: string
  /** Value exports to import; `export *` when missing. */
  names?: string[]
  /** Source files, relative to `root`, that define the exports. */
  modules: string[]
  /** Globs of modules that must not be bundled. */
  forbid?: string[]
}

export interface TreeshakeOptions {
  root?: string
  /** Absolute directory of the built files a bundle may read. */
  distDir?: string
  /** Packages a bundle may include. */
  dependencies?: string[]
  srcDir?: string
}

export interface TreeshakeResult {
  /** Every module the bundle took bytes from. */
  modules: string[]
  /** Bundled modules outside the import graph of the exports. */
  leaks: string[]
  /** Bundled modules matched by a `forbid` rule. */
  forbidden: string[]
  /** Other findings from the metafile. */
  problems: string[]
}

export function bundledModules(
  code: string,
  map: string | { sources: string[]; mappings: string },
  options?: BundleOptions,
): Set<string>

export function definingModules(
  names: string[],
  options?: { root?: string; indexFile?: string },
): string[]

export function expectedModules(options: { root?: string; entries: string[] }): Promise<Set<string>>

export function findLeaks(
  entry: TreeshakeEntry,
  options?: TreeshakeOptions,
): Promise<TreeshakeResult>
