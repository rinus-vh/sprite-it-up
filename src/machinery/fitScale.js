/**
 * Fitting a square sprite into the room an element has for it.
 *
 * Whole screen-pixels per sprite pixel, never fractional: a sprite pixel that
 * lands on half a screen pixel is a blurred pixel, and the grid overlay drawn
 * over it stops being a hairline.
 */

/**
 * The room inside an element, excluding its padding, border and any scrollbar.
 *
 * `clientWidth` already drops the border and the scrollbar; the padding has to
 * come off too, because it is not room the sprite can be drawn in — counting it
 * makes the fitted zoom overflow by exactly one pixel-block.
 */
export function contentBox(element) {
  const style = getComputedStyle(element)
  const horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  const vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

  return {
    width: element.clientWidth - horizontal,
    height: element.clientHeight - vertical,
  }
}

/** The largest whole scale at which `size` sprite pixels fit inside an element. */
export function fittedScale(element, size) {
  const { width, height } = contentBox(element)

  return Math.max(1, Math.floor(Math.min(width, height) / size))
}
