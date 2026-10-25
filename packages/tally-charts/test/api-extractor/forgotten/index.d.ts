// `Hidden` is used in a public signature but not exported: api-extractor must report it. The
// `export { f }` list (like the one tsdown emits) keeps the other declarations private; without
// it a declaration file exports everything.
interface Hidden {
  a: number
}
declare function f(): Hidden

export { f }
