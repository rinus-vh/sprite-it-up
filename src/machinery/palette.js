import { packedToHex } from './color.js'

/**
 * Reading the colours a sprite actually uses.
 *
 * Uncapped and exact, unlike the palette the generator locks frames against:
 * this is the real colour list, and both the editor's palette section and its
 * colour reduction have to see all of it or they would miss pixels.
 */

/**
 * Pixel count per opaque colour, keyed by packed colour (0xRRGGBB).
 *
 * Packed integers rather than hex strings: this feeds palette reduction, which
 * compares colours pair by pair and cannot afford strings.
 *
 * @param {ImageData[]} frames
 * @returns {Map<number, number>}
 */
export function colorCounts(frames) {
  const counts = new Map()

  for (const frame of frames) {
    if (!frame) continue
    const { data } = frame
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return counts
}

/**
 * Every opaque colour in the frames, most-used first, with its pixel count.
 *
 * @param {ImageData[]} frames
 * @returns {Array<{ hex: string, count: number }>}
 */
export function usedColors(frames) {
  return [...colorCounts(frames).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ hex: packedToHex(key), count }))
}
