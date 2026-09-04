import { fittedScale } from '@/machinery/fitScale.js'

/**
 * The whole scale at which the sprite fits its viewport, kept up to date.
 *
 * Measured once on layout as well as on resize. A ResizeObserver's first
 * callback arrives with the rendering loop, which a hidden or background page
 * does not run — relying on it alone leaves the editor stuck at 1x until
 * something happens to resize it.
 */
export function useFittedScale({ ref, size, onFit }) {
  const [scale, setScale] = React.useState(1)

  React.useLayoutEffect(
    () => {
      const element = ref.current
      if (!element) return

      function measure() {
        const fitted = fittedScale(element, size)
        setScale(fitted)
        // Reported back so a first "zoom in" grows from what you can see
        // rather than jumping to 2x from the fitted view.
        onFit(fitted)
      }

      measure()

      const observer = new ResizeObserver(measure)
      observer.observe(element)

      return () => observer.disconnect()
    },
    [ref, size, onFit],
  )

  return scale
}
