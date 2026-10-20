import { useTheme } from '../../hooks/shared/useTheme.js'

export function ThemeToggle() {
  const [theme, toggle] = useTheme()
  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle light or dark theme" title="Toggle theme">
      {theme === 'light' ? '\u263E' : '\u2600'}
    </button>
  )
}
