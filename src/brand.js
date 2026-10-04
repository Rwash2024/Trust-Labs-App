import brand from '@client/brand.json'

export default brand

// Pushes the client's palette into the CSS variables declared in styles/colors.css
// and styles/theme-extra.css, so one brand.json drives the whole design system.
export function applyBrandTheme() {
  const { colors: c } = brand
  const root = document.documentElement.style
  root.setProperty('--color-primary', c.primary)
  root.setProperty('--color-success', c.primary)
  root.setProperty('--color-primary-dark', c.primaryDark)
  root.setProperty('--color-primary-darker', c.primaryDarker)
  root.setProperty('--color-primary-bright', c.primaryBright)
  root.setProperty('--color-primary-light', c.primaryLight)
  root.setProperty('--color-success-bg', c.primaryLight)
  root.setProperty('--gradient-hero', `linear-gradient(135deg, ${c.primaryBright} 0%, ${c.primaryDark} 55%, ${c.primaryDarker} 100%)`)
  root.setProperty('--gradient-chip', `linear-gradient(135deg, ${c.primaryBright} 0%, ${c.primaryDark} 100%)`)
  root.setProperty('--shadow-float-lg', `0 20px 40px -12px rgba(${c.shadowRgb}, 0.35)`)
  root.setProperty('--shadow-float', `0 14px 28px -10px rgba(${c.shadowRgb}, 0.28)`)
  root.setProperty('--shadow-float-sm', `0 8px 18px -6px rgba(${c.shadowRgb}, 0.22)`)
}
