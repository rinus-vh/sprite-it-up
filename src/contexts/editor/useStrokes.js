import { useCallback, useLayoutEffect, useRef } from 'react'

import { floodFill } from '@/machinery/floodFill.js'
import { colorAt } from '@/machinery/color.js'
import {
  extendStroke, settleStroke, startStroke, straightenStroke, strokePixels,
} from '@/machinery/stroke.js'

/**
 * Turns pointer gestures into edits, from press to release.
 *
 * The mechanics of a stroke live in machinery/stroke.js; this holds the one in
 * progress and decides what each tool does with a press. It knows nothing about
 * undo or the palette — `onPaintStart` is the hook the caller uses to record
 * history and invalidate whatever a stroke would make stale.
 */
export function useStrokes({
  tool, kernel, frame, commit, primaryColor, secondaryColor, pickColor, onPaintStart,
}) {
  const strokeRef = useRef(null)

  // The frame is read in callbacks rather than closed over, so a stroke always
  // starts from what is on screen now.
  const frameRef = useRef(frame)
  useLayoutEffect(() => { frameRef.current = frame })

  const paint = useCallback(
    stroke => commit(strokePixels(stroke, {
      color: stroke.secondary ? secondaryColor : primaryColor,
      erase: tool === 'eraser',
    })),
    [tool, primaryColor, secondaryColor, commit],
  )

  const beginStroke = useCallback(
    (point, { secondary = false } = {}) => {
      const current = frameRef.current
      if (!current) return

      // Picking reads the sprite, so it opens no undo step — and picking with
      // the secondary button loads the secondary colour, so both can be set
      // without leaving the canvas.
      if (tool === 'eyedropper') {
        const picked = colorAt(current, point.x, point.y)
        if (picked) pickColor(picked, { secondary })

        return
      }

      onPaintStart(current)

      // A fill is a click, not a gesture, so it leaves no stroke behind:
      // dragging one would refill the region it just filled, over and over.
      if (tool === 'bucket') {
        strokeRef.current = null
        commit(floodFill(current, point, { color: secondary ? secondaryColor : primaryColor }))

        return
      }

      const stroke = startStroke({ base: current, at: point, secondary, kernel })
      strokeRef.current = stroke
      paint(stroke)
    },
    [tool, kernel, commit, paint, pickColor, onPaintStart, primaryColor, secondaryColor],
  )

  const continueStroke = useCallback(
    (point, { straight = false } = {}) => {
      const stroke = strokeRef.current
      if (!stroke) return

      if (straight) {
        if (!straightenStroke(stroke, point, kernel)) return
      } else {
        // Shift has come off: the line drawn so far becomes part of the stroke
        // and freehand carries on from its end.
        settleStroke(stroke)
        if (stroke.last.x === point.x && stroke.last.y === point.y) return
        extendStroke(stroke, point, kernel)
      }

      paint(stroke)
    },
    [kernel, paint],
  )

  const endStroke = useCallback(() => { strokeRef.current = null }, [])

  return { beginStroke, continueStroke, endStroke }
}
