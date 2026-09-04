/**
 * Turning a stream of wheel deltas into whole steps.
 *
 * A free-spinning wheel — a thumb wheel especially — reports a stream of small
 * deltas rather than discrete notches, and reports them in whichever unit it
 * feels like. Rounding each event on its own would throw away a slow spin
 * entirely, so distance is accumulated and spent a step at a time.
 */

/** Wheel deltas in pixels, whatever unit the event chose to report them in. */
export function wheelPixels(delta, mode) {
  if (mode === 1) return delta * 16
  if (mode === 2) return delta * 100

  return delta
}

/**
 * @param {{ step: number, invert?: boolean }} options
 * @returns {{ take: (delta: number, mode: number) => number }} whole steps, 0 when none are due
 */
export function createWheelStepper({ step, invert = false }) {
  let pending = 0

  return {
    take(delta, mode) {
      pending += wheelPixels(delta, mode) * (invert ? -1 : 1)

      const steps = Math.trunc(pending / step)
      // Only the spent distance comes off, so slow spinning accumulates
      // instead of being rounded away notch after notch.
      if (steps !== 0) pending -= steps * step

      return steps
    },
  }
}
