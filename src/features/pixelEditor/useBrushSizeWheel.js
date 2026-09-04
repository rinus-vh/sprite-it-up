import { BRUSH_WHEEL_STEP } from '@/constants/editTools.js'
import { createWheelStepper } from '@/machinery/wheelSteps.js'

/**
 * Horizontal scroll over the canvas resizes the brush.
 *
 * Bound natively rather than through onWheel because React attaches its wheel
 * listener passively, which would make preventDefault a no-op — and without it
 * the canvas would pan sideways at the same time. Only the horizontal axis is
 * taken, so the vertical wheel still scrolls a zoomed-in sprite.
 */
export function useBrushSizeWheel({ ref, enabled, stepToolSize }) {
  React.useEffect(
    () => {
      const element = ref.current
      if (!element || !enabled) return

      // Inverted against the raw delta: taken at face value the brush grows the
      // opposite way from what the wheel's travel suggests.
      const stepper = createWheelStepper({ step: BRUSH_WHEEL_STEP, invert: true })

      function onWheel(event) {
        // A thumb wheel is not perfectly on-axis, and a normal wheel is not
        // perfectly off it: whichever axis dominates is the one meant.
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return

        event.preventDefault()
        const steps = stepper.take(event.deltaX, event.deltaMode)
        if (steps !== 0) stepToolSize(steps)
      }

      element.addEventListener('wheel', onWheel, { passive: false })

      return () => element.removeEventListener('wheel', onWheel)
    },
    [ref, enabled, stepToolSize],
  )
}
