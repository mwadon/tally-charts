import { forbidden } from './forbidden'

/** Uses forbidden.ts on purpose: the check must reject it when a rule forbids that module. */
export const AF = (): string => `af-${forbidden()}`
