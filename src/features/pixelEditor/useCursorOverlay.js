import { drawBrushCursor, resetCursorCanvas } from '@/machinery/brushCursor.js'

/**
 * Draws the brush footprint over the hovered cell.
 *
 * Returns the redraw so pointer handlers can call it directly, and runs it
 * whenever the footprint or the zoom changes too — so resizing the brush
 * updates the outline under a stationary cursor.
 */
export function useCursorOverlay({ ref, kernel, scale, size, enabled, cellRef }) {
  const draw = React.useCallback(
    () => {
      const canvas = ref.current
      if (!canvas) return

      const ctx = resetCursorCanvas(canvas, { size, scale, ratio: window.devicePixelRatio || 1 })
      const cell = cellRef.current
      if (!cell || !enabled) return

      drawBrushCursor(ctx, { kernel, scale, cell })
    },
    [ref, cellRef, kernel, scale, size, enabled],
  )

  React.useEffect(() => { draw() }, [draw])

  return draw
}
