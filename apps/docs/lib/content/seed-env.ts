type Env = Record<string, string | undefined>

export interface SeedEnv {
  baseUrl: string
  apiKey: string
}

/** The variables of `pnpm --filter docs seed`; a missing one is named in the error. */
export function readSeedEnv(env: Env): SeedEnv {
  const { CMS_BASE_URL: baseUrl, CMS_ADMIN_API_KEY: apiKey } = env
  const problems: string[] = []
  if (!baseUrl)
    problems.push('CMS_BASE_URL is not set: use the address of the glokki CMS (https://…)')
  if (!apiKey) {
    problems.push(
      'CMS_ADMIN_API_KEY is not set: create an admin key in glokki (Settings → API Keys, scopes mcp:connect, admin:pages:read, admin:pages:write, admin:pages:publish)',
    )
  }
  if (!baseUrl || !apiKey) throw new Error(problems.join('\n'))
  return { baseUrl, apiKey }
}
