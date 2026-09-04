import { isFeathered, kernelOutline } from './brush.js'

/**
 * Drawing the brush footprint under the cursor.
 *
 * Traced along the pixel grid from the same kernel a stroke uses, so the
 * preview cannot promise a footprint the brush would not produce. A crosshair
 * says which pixel is under the pointer; this says how many a stroke covers.
 */

const PASSES = {
  // Dark under light, so the outline stays legible over a white sprite and a
  // black one alike.
  halo: { width: 3, color: 'rgba(0, 0, 0, 0.55)', dash: [] },
  edge: { width: 1, color: 'rgba(255, 255, 255, 0.95)', dash: [] },
  reach: { width: 1, color: 'rgba(255, 255, 255, 0.35)', dash: [2, 2] },
}

/** Sizes the overlay to the board in device pixels and clears it. */
export function resetCursorCanvas(canvas, { size, scale, ratio }) {
  const span = size * scale
  const device = Math.round(span * ratio)
  if (canvas.width !== device) canvas.width = device
  if (canvas.height !== device) canvas.height = device

  const ctx = canvas.getContext('2d')
  // Sized in device pixels but drawn in CSS pixels, so the outline is one crisp
  // hairline on any display rather than a blurred two.
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, span, span)

  return ctx
}

/**
 * @param {CanvasRenderingContext2D} ctx  from `resetCursorCanvas`
 * @param {{ kernel: object, scale: number, cell: { x: number, y: number } }} options
 */
export function drawBrushCursor(ctx, { kernel, scale, cell }) {
  // Half-pixel offset so a hairline sits on the boundary between two pixels
  // instead of straddling it.
  ctx.save()
  ctx.translate(0.5, 0.5)

  // A feathered brush has two honest answers to "how big is it": the outline
  // marks where it covers at least half, the dashes its full reach.
  if (isFeathered(kernel)) trace(ctx, kernelOutline(kernel, 0.02), kernel, scale, cell, PASSES.reach)

  const outline = kernelOutline(kernel, 0.5)
  trace(ctx, outline, kernel, scale, cell, PASSES.halo)
  trace(ctx, outline, kernel, scale, cell, PASSES.edge)

  ctx.restore()
}

function trace(ctx, segments, kernel, scale, cell, { width, color, dash }) {
  ctx.beginPath()
  for (const [x1, y1, x2, y2] of segments) {
    ctx.moveTo((cell.x - kernel.offset + x1) * scale, (cell.y - kernel.offset + y1) * scale)
    ctx.lineTo((cell.x - kernel.offset + x2) * scale, (cell.y - kernel.offset + y2) * scale)
  }
  ctx.setLineDash(dash)
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.stroke()
}
