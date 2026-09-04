import { hexToRgb } from './color.js'

/**
 * Brush footprints and stroke compositing.
 *
 * A stroke is built as a coverage mask first and blended into the sprite once,
 * rather than stamped repeatedly onto the pixels. With a hard brush the two are
 * identical, but a soft one stamped per step darkens wherever the steps overlap
 * — the mask takes the strongest coverage each cell ever gets, so a soft stroke
 * has an even edge however slowly it was drawn.
 */

/**
 * How much smaller than its nominal radius a round brush really is.
 *
 * A circle of diameter N covering every cell whose centre falls inside it is
 * too generous: a 3px brush comes out as a 3x3 square. Pulling the radius in by
 * a quarter of a pixel yields the footprints pixel artists expect —
 * 1, 4, 5, 12 and 21 cells for sizes 1 to 5 — where 3 is a plus and 5 is a
 * square with its corners cut.
 */
const EDGE_INSET = 0.25

/**
 * The brush footprint: per-cell coverage from 0 to 1.
 *
 * `square` covers its whole box at full strength and ignores hardness, which is
 * what makes it the honest pixel tool — every pixel it touches is fully the
 * colour you chose. `round` falls off linearly from the hardness radius to the
 * edge, so hardness 100% is a hard circle and lower values feather.
 *
 * @param {{ size: number, hardness?: number, shape?: 'square' | 'round' }} options
 * @returns {{ size: number, offset: number, coverage: Float32Array }}
 */
export function brushKernel({ size, hardness = 1, shape = 'round' }) {
  const span = Math.max(1, Math.round(size))
  // Centres the footprint on the cell under the cursor for odd sizes, and puts
  // the extra cell down and right for even ones — the same offset the square
  // brush has always used, so switching shape does not shift the stroke.
  const offset = Math.floor((span - 1) / 2)
  const coverage = new Float32Array(span * span)

  if (shape === 'square') {
    coverage.fill(1)

    return { size: span, offset, coverage }
  }

  const centre = (span - 1) / 2
  const outer = span / 2 - EDGE_INSET
  const inner = outer * Math.max(0, Math.min(1, hardness))

  for (let y = 0; y < span; y++) {
    for (let x = 0; x < span; x++) {
      const d = Math.hypot(x - centre, y - centre)
      let value = 0
      if (d <= inner) value = 1
      else if (d <= outer) value = 1 - (d - inner) / (outer - inner)

      coverage[y * span + x] = value
    }
  }

  return { size: span, offset, coverage }
}

export function createMask(width, height) {
  return new Float32Array(width * height)
}

/** The strongest coverage of two masks at every cell. */
export function unionMask(a, b) {
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] > b[i] ? a[i] : b[i]

  return out
}

/** Lays the footprint down at a cell, keeping the strongest coverage so far. */
export function stampMask(mask, width, height, cx, cy, kernel) {
  const { size, offset, coverage } = kernel

  for (let dy = 0; dy < size; dy++) {
    const py = cy - offset + dy
    if (py < 0 || py >= height) continue

    for (let dx = 0; dx < size; dx++) {
      const px = cx - offset + dx
      if (px < 0 || px >= width) continue

      const value = coverage[dy * size + dx]
      if (value === 0) continue

      const at = py * width + px
      if (value > mask[at]) mask[at] = value
    }
  }
}

/**
 * Stamps along the cells between two points.
 *
 * Pointer events arrive far apart when you drag quickly, so stamping only where
 * they land leaves a dotted trail. Bresenham's line — integer only, so every
 * stamp sits on a whole pixel — gives a continuous stroke.
 */
export function lineMask(mask, width, height, from, to, kernel) {
  let x = from.x
  let y = from.y
  const dx = Math.abs(to.x - x)
  const dy = Math.abs(to.y - y)
  const stepX = x < to.x ? 1 : -1
  const stepY = y < to.y ? 1 : -1
  let error = dx - dy

  for (;;) {
    stampMask(mask, width, height, x, y, kernel)
    if (x === to.x && y === to.y) break

    const doubled = error * 2
    if (doubled > -dy) { error -= dy; x += stepX }
    if (doubled < dx) { error += dx; y += stepY }
  }
}

/**
 * Blends a stroke's coverage into the frame it started from.
 *
 * Painting is source-over, erasing takes the coverage back out of the alpha
 * channel. At full coverage this writes exactly the colour and alpha 255 (or
 * alpha 0 when erasing), so a hard brush leaves no partial pixels behind and a
 * sprite drawn with the default settings keeps a strictly binary alpha channel.
 *
 * @param {ImageData} base  the frame as it was when the stroke began
 * @param {Float32Array} mask
 * @param {{ color?: string | null, erase?: boolean }} options
 */
export function compositeStroke(base, mask, { color = '#000000', erase = false } = {}) {
  const out = new ImageData(base.width, base.height)
  out.data.set(base.data)

  const rgb = erase ? null : hexToRgb(color)

  for (let i = 0; i < mask.length; i++) {
    const strength = mask[i]
    if (strength <= 0) continue

    const at = i * 4
    const dstAlpha = out.data[at + 3] / 255

    if (rgb === null) {
      const alpha = dstAlpha * (1 - strength)
      out.data[at + 3] = Math.round(alpha * 255)
      // A fully erased pixel keeps no colour behind it: leftover RGB under a
      // zero alpha is what makes exported sprites show halos in some engines.
      if (out.data[at + 3] === 0) {
        out.data[at] = 0
        out.data[at + 1] = 0
        out.data[at + 2] = 0
      }
      continue
    }

    const alpha = strength + dstAlpha * (1 - strength)
    if (alpha <= 0) continue

    for (let channel = 0; channel < 3; channel++) {
      const src = rgb[channel] * strength
      const dst = out.data[at + channel] * dstAlpha * (1 - strength)
      out.data[at + channel] = Math.round((src + dst) / alpha)
    }
    out.data[at + 3] = Math.round(alpha * 255)
  }

  return out
}

/**
 * The outline of a footprint, as line segments in cell coordinates.
 *
 * Traces the edges where a covered cell meets an uncovered one, so the result
 * follows the pixel grid exactly — a preview drawn as a smooth circle would
 * promise a footprint the brush cannot produce. Coordinates are cell corners
 * relative to the kernel's top-left, so `[0, 0, 1, 0]` is the top edge of the
 * first cell.
 *
 * @param {{ size: number, coverage: Float32Array }} kernel
 * @param {number} threshold  the coverage an outlined cell must reach
 * @returns {Array<[number, number, number, number]>}
 */
export function kernelOutline({ size, coverage }, threshold = 0.5) {
  const covered = (x, y) => (
    x >= 0 && y >= 0 && x < size && y < size && coverage[y * size + x] >= threshold
  )

  const segments = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!covered(x, y)) continue

      if (!covered(x, y - 1)) segments.push([x, y, x + 1, y])
      if (!covered(x, y + 1)) segments.push([x, y + 1, x + 1, y + 1])
      if (!covered(x - 1, y)) segments.push([x, y, x, y + 1])
      if (!covered(x + 1, y)) segments.push([x + 1, y, x + 1, y + 1])
    }
  }

  return segments
}

/** Whether a footprint has feathered cells, so its full reach is worth showing. */
export function isFeathered({ coverage }) {
  for (let i = 0; i < coverage.length; i++) {
    if (coverage[i] > 0 && coverage[i] < 1) return true
  }

  return false
}
