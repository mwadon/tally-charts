/** Files under `srcDir` modified after `refFile`; `null` when `refFile` does not exist. */
export function newerThan(srcDir: string, refFile: string): string[] | null
