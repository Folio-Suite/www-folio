import { defaultTheme, getImplicitPreference, themeLocalStorageKey } from './shared'
import { themeIsValid, type Theme } from './types'

const themeChangeEvent = 'payload-theme-change'

export const getThemePreference = (): Theme | 'auto' => {
  const preference = window.localStorage.getItem(themeLocalStorageKey)
  return themeIsValid(preference) ? preference : 'auto'
}

export const getTheme = (): Theme => {
  const preference = getThemePreference()
  return preference === 'auto' ? getImplicitPreference() || defaultTheme : preference
}

export const getServerTheme = () => undefined
export const getServerPreference = () => 'auto' as const

export const subscribeTheme = (onChange: () => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const synchronize = () => {
    document.documentElement.setAttribute('data-theme', getTheme())
    onChange()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeLocalStorageKey || event.key === null) synchronize()
  }

  window.addEventListener(themeChangeEvent, synchronize)
  window.addEventListener('storage', onStorage)
  mediaQuery.addEventListener('change', synchronize)
  synchronize()

  return () => {
    window.removeEventListener(themeChangeEvent, synchronize)
    window.removeEventListener('storage', onStorage)
    mediaQuery.removeEventListener('change', synchronize)
  }
}

export const setTheme = (theme: Theme | null) => {
  if (theme === null) {
    window.localStorage.removeItem(themeLocalStorageKey)
  } else {
    window.localStorage.setItem(themeLocalStorageKey, theme)
  }
  document.documentElement.setAttribute('data-theme', getTheme())
  window.dispatchEvent(new Event(themeChangeEvent))
}
