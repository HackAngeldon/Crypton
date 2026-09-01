export interface Prefs {
  bio: boolean
  alerts: boolean
  push: boolean
}

const KEY = 'crypton.prefs'
const DEFAULTS: Prefs = { bio: false, alerts: false, push: true }

export function getPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...getPrefs(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
