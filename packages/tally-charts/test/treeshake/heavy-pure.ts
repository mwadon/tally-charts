import { register } from './register'

// The same code as heavy.ts, marked pure: a bundle that doesn't use it drops it.
export const HEAVY_PURE = /* @__PURE__ */ register('heavy-pure')
