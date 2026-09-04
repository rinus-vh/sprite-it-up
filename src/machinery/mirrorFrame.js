/**
 * Horizontal mirroring, for the facings that are reflections of each other.
 *
 * W is the exact mirror of E, SW of SE, NW of NE. So a full 8-frame set only
 * needs five real generations (the input plus SW, W, NW, N) and three flips.
 * The flipped frames are pixel-exact and perfectly consistent with their
 * originals by construction, which no generator can promise.
 *
 * The trade-off is handedness: a character holding a sword in its right hand
 * will appear to hold it in the left in the mirrored frames. For a symmetric
 * character it is free; for an asymmetric one it is wrong, which is why it is
 * a setting rather than always on.
 */

/** Mirrors an ImageData horizontally. Pixel-exact — no resampling. */
export function mirrorHorizontally(imageData) {
  const { width, height, data } = imageData
  const out = new ImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = (y * width + (width - 1 - x)) * 4
      out.data[dst] = data[src]
      out.data[dst + 1] = data[src + 1]
      out.data[dst + 2] = data[src + 2]
      out.data[dst + 3] = data[src + 3]
    }
  }

  return out
}
