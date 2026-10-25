import { register } from './register'

// Top-level call without /* @__PURE__ */: it stays in every bundle, and so does this module.
export const HEAVY = register('heavy')
