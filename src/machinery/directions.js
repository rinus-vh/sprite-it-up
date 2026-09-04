import { CARDINAL_DIRECTIONS, DIAGONAL_DIRECTIONS, DIRECTION_LOOKUP, DIRECTIONS } from '@/constants/directions.js'

/**
 * Which family a facing belongs to. A 4-frame rotation set never mixes the two:
 * a cardinal input yields cardinals, a diagonal input yields diagonals.
 */
export function familyOf(direction) {
  return CARDINAL_DIRECTIONS.includes(direction) ? CARDINAL_DIRECTIONS : DIAGONAL_DIRECTIONS
}

/**
 * The ordered facings of a rotation set, always starting at the input facing so
 * the input sprite is frame 0 of the sheet.
 *
 *   directionsFor('S',  4) -> ['S', 'W', 'N', 'E']
 *   directionsFor('NE', 4) -> ['NE', 'SE', 'SW', 'NW']
 *   directionsFor('S',  8) -> ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']
 *
 * @param {string} input  one of the eight facings
 * @param {4 | 8} frameCount
 * @returns {string[]} facings including the input, in sheet order
 */
export function directionsFor(input, frameCount) {
  const ring = frameCount === 8
    ? DIRECTIONS.map(d => d.value)
    : familyOf(input)

  const start = ring.indexOf(input)
  if (start === -1) throw new Error(`Unknown direction: ${input}`)

  return ring.map((_, i) => ring[(start + i) % ring.length])
}

/**
 * The facings a rotation set still has to generate — everything but the input.
 */
export function directionsToGenerate(input, frameCount) {
  return directionsFor(input, frameCount).filter(d => d !== input)
}

/**
 * Yaw to rotate the input pose by to reach `target`, normalised to 0–359.
 * The generator is conditioned on this delta rather than on absolute angles, so
 * the same prompt works whichever facing the user drew.
 */
export function yawBetween(input, target) {
  const from = DIRECTION_LOOKUP[input]?.angle
  const to = DIRECTION_LOOKUP[target]?.angle
  if (from === undefined || to === undefined) throw new Error(`Unknown direction: ${input} -> ${target}`)

  return (to - from + 360) % 360
}

/**
 * Splits a rotation set into the facings that must actually be generated and
 * the ones that can be mirrored from them.
 *
 * A yaw past 180 degrees is the reflection of the yaw that mirrors onto it, so
 * anything in 181-359 comes free from the frame at `360 - yaw`. From South that
 * leaves SW, W, NW and N to generate, with SE, E and NE mirrored.
 *
 * @param {string} input
 * @param {4 | 8} frameCount
 * @returns {{
 *   generate: Array<{ direction: string, yaw: number }>,
 *   mirror: Array<{ direction: string, from: string }>,
 * }}
 */
export function rotationPlan(input, frameCount) {
  const generate = []
  const mirror = []

  for (const direction of directionsToGenerate(input, frameCount)) {
    const yaw = yawBetween(input, direction)

    if (yaw > 180) {
      const source = directionsFor(input, frameCount)
        .find(candidate => yawBetween(input, candidate) === 360 - yaw)

      if (source) {
        mirror.push({ direction, from: source })
        continue
      }
    }

    generate.push({ direction, yaw })
  }

  return { generate, mirror }
}

export function labelFor(direction) {
  return DIRECTION_LOOKUP[direction]?.label ?? direction
}
