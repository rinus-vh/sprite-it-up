import { cloneImageData } from './imageData.js'
import { hexToRgb } from './color.js'

/**
 * Swaps one colour for another everywhere in a frame, contiguous or not.
 *
 * This is how a palette edit works: recolouring a sprite means every pixel of
 * that shade changes at once, wherever it sits. Pass `null` to clear the shade
 * to transparent instead.
 */
export function replaceColor(imageData, fromHex, toHex) {
  const from = hexToRgb(fromHex)
  const to = toHex === null ? null : hexToRgb(toHex)
  const out = cloneImageData(imageData)

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) continue
    if (out.data[i] !== from[0] || out.data[i + 1] !== from[1] || out.data[i + 2] !== from[2]) continue

    if (to === null) {
      out.data[i + 3] = 0
    } else {
      out.data[i] = to[0]
      out.data[i + 1] = to[1]
      out.data[i + 2] = to[2]
    }
  }

  return out
}
