import { dropFlatBackground } from './flatBackground.js'
import { lockToPalette, toNativeResolution } from './pixelImage.js'

/**
 * The mandatory last step of every generation pipeline, whatever engine
 * produced the frame.
 *
 * Three passes, in this order:
 *
 *   1. Cut the flat backdrop. Generators return opaque frames — Zero123++ was
 *      trained on objects against white — and the backdrop has to go before it
 *      can pollute the palette. Done at source resolution, where the flood fill
 *      has the most pixels to work with.
 *   2. Reduce to the sprite's true pixel grid, by dominant colour rather than
 *      averaging, so no colour is invented.
 *   3. Snap to the reference palette, which removes the hue drift that would
 *      otherwise make each frame look like a slightly different character.
 *
 * Skipping any of them is what separates real pixel art from pixel-styled
 * output, so no generated frame is stored without passing through here.
 *
 * @param {ImageData} imageData  raw frame from the generator, any resolution
 * @param {{ size: number, palette?: number[][], cutBackground?: boolean }} options
 */
export function finalizeFrame(imageData, { size, palette = [], cutBackground = true }) {
  const cut = cutBackground ? dropFlatBackground(imageData) : imageData

  return lockToPalette(toNativeResolution(cut, size), palette)
}
