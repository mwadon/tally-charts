/** A call a bundler can't prove pure, as `createWarner()` and `createContext()` are in src. */
export function register(name: string): string {
  const scope = globalThis as { registry?: string[] }
  scope.registry = [...(scope.registry ?? []), name]
  return name
}
