/**
 * Grouping a generated result into the rows a sprite sheet should have.
 *
 * A row is one animation. What counts as an animation depends on what was
 * generated, and each mode has an honest answer:
 *
 *   • A rotation is one animation per facing — eight directions are eight rows,
 *     which is the layout engines expect. Each holds a single frame today; when
 *     a facing can hold a whole cycle, the rows simply get longer.
 *   • An animation is one row, the cycle itself.
 *   • An asset set is not row-shaped: its sprites are unrelated, so there is no
 *     row that means anything. It packs square instead.
 */

/**
 * @param {{ mode: string, frames: ImageData[], labels?: string[], name?: string }} result
 * @returns {Array<{ label: string, frames: ImageData[] }>}
 */
export function animationRows({ mode, frames, labels = [], name = undefined }) {
  if (!frames?.length) return []

  if (mode === 'rotate') {
    return frames.map((frame, index) => ({
      label: labels[index] ?? `Row ${index + 1}`,
      frames: [frame],
    }))
  }

  if (mode === 'animate') return [{ label: name || 'Animation', frames }]

  return []
}

/** Whether a result can be laid out as rows at all. */
export function hasAnimationRows(mode) {
  return mode === 'rotate' || mode === 'animate'
}
