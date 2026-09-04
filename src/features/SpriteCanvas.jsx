import styles from './SpriteCanvas.module.css'

/**
 * Displays a native-resolution sprite, scaled up crisply.
 *
 * The canvas element keeps the sprite's true pixel dimensions — a 32x32 sprite
 * is a 32x32 canvas — and CSS scales it with `image-rendering: pixelated`.
 * Nothing is ever resampled, so the display is exact at any size and the
 * underlying data stays tiny.
 *
 * @param {{
 *   imageData: ImageData | null,
 *   showGrid?: boolean,
 *   alt?: string,
 *   layoutClassName?: string,
 * }} props
 */
export function SpriteCanvas({ imageData, showGrid = false, alt = 'Sprite', layoutClassName = undefined }) {
  const canvasRef = React.useRef(null)

  React.useEffect(
    () => {
      const canvas = canvasRef.current
      if (!canvas || !imageData) return

      canvas.width = imageData.width
      canvas.height = imageData.height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(imageData, 0, 0)
    },
    [imageData],
  )

  return (
    <div
      style={{ '--pixel-count': imageData?.width ?? 1 }}
      className={cx(styles.component, layoutClassName)}
    >
      <canvas
        ref={canvasRef}
        aria-label={alt}
        role='img'
        className={styles.canvas}
      />

      {/* Overlay rather than a canvas background: a canvas paints over its own
          background, so a grid behind it would only show through transparency. */}
      {showGrid && <div aria-hidden className={styles.grid} />}
    </div>
  )
}
