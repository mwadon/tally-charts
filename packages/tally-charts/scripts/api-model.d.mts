/** File names (without extension) of the doc models, one per entry point. */
export const MODEL_NAMES: string[]
/** The text of a doc model without any `fileUrlPath`. */
export function normalizeModel(json: unknown): string
/** Names of the models whose committed `api/<name>.api.json` is missing or differs. */
export function checkModels(root: string): string[]
/** Writes the normalized models to `api/`; returns the names whose file changed. */
export function updateModels(root: string): string[]
