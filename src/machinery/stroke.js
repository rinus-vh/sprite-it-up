import { compositeStroke, createMask, lineMask, stampMask, unionMask } from './brush.js'

/**
 * The life of one stroke, from press to release.
 *
 * A stroke is coverage accumulated over the frame it began on, plus — while
 * shift is held — a straight segment that is rebuilt from its anchor on every
 * move. Keeping the two apart is what lets a straight line rubber-band: it can
 * be redrawn from scratch without disturbing the freehand already laid down,
 * and released shift folds it in rather than replacing anything.
 *
 * These functions mutate the stroke they are given. It lives in a ref for the
 * duration of a gesture, never in state — a pointer drag would otherwise queue
 * a render per move for a value nothing renders directly.
 *
 * @typedef {{
 *   base: ImageData,
 *   secondary: boolean,
 *   last: { x: number, y: number },
 *   mask: Float32Array,
 *   anchor: { x: number, y: number } | null,
 *   straightTo: { x: number, y: number } | null,
 *   straightMask: Float32Array | null,
 * }} Stroke
 */

/** @returns {Stroke} */
export function startStroke({ base, at, secondary, kernel }) {
  const mask = createMask(base.width, base.height)
  stampMask(mask, base.width, base.height, at.x, at.y, kernel)

  return { base, secondary, last: at, mask, anchor: null, straightTo: null, straightMask: null }
}

/** Draws on from wherever the stroke last was, filling in the cells between. */
export function extendStroke(stroke, to, kernel) {
  const { width, height } = stroke.base
  lineMask(stroke.mask, width, height, stroke.last, to, kernel)
  stroke.last = to
}

/**
 * Rubber-bands a straight segment from the anchor to a cell.
 *
 * The anchor is set the first time shift is held, so the line runs from where
 * the stroke had got to rather than from where it began — holding shift part
 * way through a freehand stroke straightens the rest of it, which is what a
 * paint program does.
 *
 * @returns {boolean} whether anything changed
 */
export function straightenStroke(stroke, to, kernel) {
  if (stroke.anchor === null) stroke.anchor = stroke.last
  if (stroke.straightTo && stroke.straightTo.x === to.x && stroke.straightTo.y === to.y) return false

  const { width, height } = stroke.base
  // Rebuilt rather than added to: the previous segment has to disappear, or
  // dragging around would leave a fan of every line the pointer passed through.
  stroke.straightMask = createMask(width, height)
  lineMask(stroke.straightMask, width, height, stroke.anchor, to, kernel)
  stroke.straightTo = to

  return true
}

/**
 * Folds any pending straight segment into the stroke.
 *
 * Called when shift comes off, so freehand carries on from the end of the line
 * just drawn instead of from wherever the pointer was when shift went down.
 */
export function settleStroke(stroke) {
  if (stroke.straightMask === null) {
    stroke.anchor = null

    return
  }

  stroke.mask = unionMask(stroke.mask, stroke.straightMask)
  stroke.last = stroke.straightTo ?? stroke.last
  stroke.anchor = null
  stroke.straightTo = null
  stroke.straightMask = null
}

/**
 * The frame as the stroke currently describes it.
 *
 * The two masks are combined by taking the stronger coverage rather than
 * composited one after the other: blending twice would darken every cell the
 * freehand and the straight segment share.
 */
export function strokePixels(stroke, { color, erase = false }) {
  const mask = stroke.straightMask === null
    ? stroke.mask
    : unionMask(stroke.mask, stroke.straightMask)

  return compositeStroke(stroke.base, mask, { color, erase })
}
