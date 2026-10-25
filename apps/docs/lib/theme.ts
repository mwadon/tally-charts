export const THEME_STORAGE_KEY = 'tally-docs-theme'

export type ThemeChoice = 'light' | 'dark' | 'system'

export const isForcedTheme = (value: unknown): value is 'light' | 'dark' =>
  value === 'light' || value === 'dark'

/** Light/dark set `data-ch-theme` on <html> and persist; system removes both (follows the OS). */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-ch-theme')
  else root.setAttribute('data-ch-theme', choice)
  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    // Storage can be blocked (private mode, policies); the attribute still applies for this page.
  }
}

export function readStoredTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isForcedTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Inline <head> script, runs before first paint. Precedence: `?theme=light|dark` (never stored),
 * then localStorage, then nothing (system). Unknown values are ignored in both places.
 */
export const THEME_SCRIPT = `try{var d=document.documentElement,q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){d.setAttribute('data-ch-theme',q)}else{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark')d.setAttribute('data-ch-theme',s)}}catch(e){}`
