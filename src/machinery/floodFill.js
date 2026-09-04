import { cloneImageData, inBounds } from './imageData.js'
import { hexToRgb } from './color.js'

/**
 * Flood-fills the contiguous region of matching pixels around a cell.
 *
 * Matching is exact — the same RGB, or both transparent — with 4-way
 * neighbours. Tolerance-based filling would bleed across the hard edges that
 * define a pixel sprite, and diagonal spread leaks through the single-pixel
 * diagonal seams pixel art is full of.
 *
 * @param {ImageData} imageData
 * @param {{ x: number, y: number }} origin
 * @param {{ color?: string | null }} options  `color: null` clears to transparent
 */
export function floodFill(imageData, origin, { color = '#000000' } = {}) {
  const { width, height } = imageData
  if (!inBounds(imageData, origin.x, origin.y)) return imageData

  const out = cloneImageData(imageData)
  const rgb = color === null ? null : hexToRgb(color)
  const target = readPixel(out, (origin.y * width + origin.x) * 4)
  const next = rgb === null ? [0, 0, 0, 0] : [rgb[0], rgb[1], rgb[2], 255]
  if (samePixel(target, next)) return imageData

  const seen = new Uint8Array(width * height)
  const queue = [origin.y * width + origin.x]
  seen[queue[0]] = 1

  while (queue.length) {
    const cell = queue.pop()
    const i = cell * 4
    if (!samePixel(readPixel(out, i), target)) continue

    out.data[i] = next[0]
    out.data[i + 1] = next[1]
    out.data[i + 2] = next[2]
    out.data[i + 3] = next[3]

    const x = cell % width
    const y = (cell - x) / width

    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const neighbour = ny * width + nx
      if (seen[neighbour]) continue
      seen[neighbour] = 1
      queue.push(neighbour)
    }
  }

  return out
}

function readPixel(imageData, i) {
  // Transparent pixels are normalised to one value, so two cells that are both
  // invisible always compare equal regardless of the RGB left underneath them.
  if (imageData.data[i + 3] < 128) return [0, 0, 0, 0]

  return [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2], 255]
}

function samePixel(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}
