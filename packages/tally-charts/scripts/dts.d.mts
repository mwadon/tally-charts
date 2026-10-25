export interface SideEffectImport {
  /** 1-based line. */
  line: number
  specifier: string
}

export interface DtsFinding extends SideEffectImport {
  /** Absolute path. */
  file: string
}

export function findSideEffectImports(text: string): SideEffectImport[]

export function checkDts(distDir: string): DtsFinding[]
