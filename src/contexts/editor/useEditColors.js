import { useCallback, useState } from 'react'

import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '@/constants/editTools.js'

/**
 * The two colours a stroke can paint.
 *
 * As in any paint program: the primary is what a normal stroke paints, the
 * secondary what the right mouse button paints, and they swap. Keeping both
 * live is what makes two-tone work practical — a shade and its outline, or a
 * colour and the background you are cutting back to — without a trip to the
 * picker between strokes.
 */
export function useEditColors() {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY_COLOR)

  const swapColors = useCallback(
    () => {
      setPrimaryColor(secondaryColor)
      setSecondaryColor(primaryColor)
    },
    [primaryColor, secondaryColor],
  )

  const resetColors = useCallback(
    () => {
      setPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setSecondaryColor(DEFAULT_SECONDARY_COLOR)
    },
    [],
  )

  const pickColor = useCallback(
    (hex, { secondary = false } = {}) => (secondary ? setSecondaryColor : setPrimaryColor)(hex),
    [],
  )

  return {
    primaryColor, setPrimaryColor,
    secondaryColor, setSecondaryColor,
    swapColors, resetColors, pickColor,
  }
}
