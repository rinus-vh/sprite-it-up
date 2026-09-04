import { useEditorContext } from '@/contexts/EditorContext.jsx'
import { useBrushSizeWheel } from './useBrushSizeWheel.js'
import { useCursorOverlay } from './useCursorOverlay.js'
import { useFittedScale } from './useFittedScale.js'
import { usePaintedFrame } from './usePaintedFrame.js'

import styles from './PixelEditor.module.css'

/**
 * The drawing surface: one sprite pixel per whole screen pixel block.
 *
 * The canvas element stays at the sprite's true size and CSS scales it with
 * nearest-neighbour, exactly like SpriteCanvas — what this one adds is input.
 * It turns pointer positions into cell coordinates so a press always lands on
 * the pixel under the cursor whatever the zoom, and it draws the brush
 * footprint under the cursor so you can see what a stroke would cover.
 *
 * Everything it does beyond wiring lives elsewhere: a hook each for the fitted
 * zoom, the painted frame, the cursor overlay and the thumb wheel, over pure
 * machinery in fitScale, brushCursor and wheelSteps.
 *
 * @param {{ layoutClassName?: string }} props
 */
export function PixelEditor({ layoutClassName = undefined }) {
  const {
    frame, frameSize, zoom, showGrid, activeTool, kernel,
    beginStroke, continueStroke, endStroke, reportFittedZoom, stepToolSize,
  } = useEditorContext()

  const viewportRef = React.useRef(null)
  const boardRef = React.useRef(null)
  const canvasRef = React.useRef(null)
  const cursorRef = React.useRef(null)
  // The hovered cell is held in a ref and painted imperatively: it changes on
  // every pointer move, and re-rendering the editor at that rate to move an
  // outline would be wasteful.
  const hoverRef = React.useRef(null)

  const fitScale = useFittedScale({ ref: viewportRef, size: frameSize, onFit: reportFittedZoom })
  const scale = zoom ?? fitScale
  const size = frame?.width ?? frameSize

  usePaintedFrame({ ref: canvasRef, frame })
  const drawCursor = useCursorOverlay({
    ref: cursorRef,
    kernel,
    scale,
    size,
    enabled: activeTool.sized,
    cellRef: hoverRef,
  })
  useBrushSizeWheel({ ref: boardRef, enabled: activeTool.sized, stepToolSize })

  function cellFrom(event) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    return {
      x: Math.floor(((event.clientX - rect.left) / rect.width) * size),
      y: Math.floor(((event.clientY - rect.top) / rect.height) * size),
    }
  }

  function handlePointerDown(event) {
    // Left paints the primary colour, right the secondary — and alt does too,
    // for trackpads and pens that have no second button.
    const secondary = event.button === 2 || event.altKey
    if (event.button !== 0 && event.button !== 2) return

    const cell = cellFrom(event)
    if (!cell) return

    // Without this the browser reads the press as the start of a drag or a
    // selection, fires pointercancel a few pixels in and takes the gesture for
    // itself — which looks like the sprite being dragged around instead of
    // drawn on, after a single pixel has landed.
    event.preventDefault()

    // Capture so a stroke keeps painting when the pointer leaves the canvas and
    // comes back — releasing outside still ends it cleanly.
    event.currentTarget.setPointerCapture(event.pointerId)
    beginStroke(cell, { secondary })
  }

  function handlePointerMove(event) {
    const cell = cellFrom(event)
    hoverRef.current = cell
    drawCursor()

    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return
    // Shift straightens the stroke from where it had got to, and releasing it
    // carries on freehand from the end of that line.
    if (cell) continueStroke(cell, { straight: event.shiftKey })
  }

  function handlePointerLeave() {
    hoverRef.current = null
    drawCursor()
  }

  if (!frame) return null

  return (
    <div ref={viewportRef} className={cx(styles.component, layoutClassName)}>
      <div
        ref={boardRef}
        style={{ '--pixel-size': `${scale}px`, '--pixel-count': frame.width }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onContextMenu={event => event.preventDefault()}
        onDragStart={event => event.preventDefault()}
        className={cx(
          styles.board,
          activeTool.value === 'eraser' && styles.isErasing,
          activeTool.value === 'bucket' && styles.isFilling,
        )}
      >
        <canvas
          ref={canvasRef}
          aria-label='Sprite being edited'
          role='img'
          className={styles.canvas}
        />

        {/* An overlay, not a canvas background: a canvas paints over its own
            background, so a grid behind it would only show through transparency. */}
        {showGrid && scale >= 4 && <div aria-hidden className={styles.grid} />}

        <canvas aria-hidden ref={cursorRef} className={styles.cursor} />
      </div>
    </div>
  )
}
