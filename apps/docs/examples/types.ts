/** Metadata that every example file under `examples/` exports as `meta`. The generator reads it statically. */
export interface ExampleMeta {
  /** Path of the file relative to `examples/`, without the extension (`line-chart/revenue-forecast`). */
  id: string
  /** Title of the example, also the title of its chart. */
  title: string
  /**
   * True when the example can render in a React Server Component: no `'use client'`, no hooks and
   * no function props. The SSR test renders every `rscSafe` example with `renderToString`.
   */
  rscSafe: boolean
}
