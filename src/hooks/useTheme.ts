import * as React from 'react'
import { applyTheme, DEFAULT_THEME, themeFrom } from '@/lib/theme'
import { useDoctorProfile } from './useDoctor'

/**
 * Paints the signed-in doctor's colours onto the document.
 *
 * Runs inside the app shell only: the login and sign-up screens are not any
 * one tenant's, so they keep the default palette from index.css. Signing out
 * restores it, otherwise the next doctor would meet the last one's colours.
 */
export function useAppliedTheme() {
  const { data: doctor } = useDoctorProfile()
  const primary = doctor?.theme_primary
  const background = doctor?.theme_background

  React.useEffect(() => {
    applyTheme(themeFrom(primary, background))
    return () => applyTheme(DEFAULT_THEME)
  }, [primary, background])
}
