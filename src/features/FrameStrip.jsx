import { Pause, Play } from 'lucide-react'
import { ActionIconButton, LabelUppercaseXs, Slider } from '@6njp/prototype-library'

import { PLAYBACK_FPS_RANGE } from '@/constants/spriteSizes.js'
import { useSpriteContext } from '@/contexts/SpriteContext.jsx'
import { outputSprite, sameSprite } from '@/machinery/spriteRef.js'
import { SpriteCanvas } from './SpriteCanvas.jsx'

import styles from './FrameStrip.module.css'

/**
 * The generated frames, as a filmstrip plus a live preview.
 *
 * Clicking a frame both scrubs the preview to it and sends it to the editor —
 * one gesture, because "show me this frame" and "let me work on this frame" are
 * the same intent, and the strip marks which frame the editor currently holds.
 *
 * @param {{
 *   frames: ImageData[],
 *   labels?: string[],
 *   loop?: boolean,
 *   showGrid?: boolean,
 *   layoutClassName?: string,
 * }} props
 */
export function FrameStrip({ frames, labels = [], loop = true, showGrid = false, layoutClassName = undefined }) {
  const { activeSprite, selectSprite } = useSpriteContext()
  const [playing, setPlaying] = React.useState(true)
  const [fps, setFps] = React.useState(PLAYBACK_FPS_RANGE.default)
  const [index, setIndex] = React.useState(0)

  React.useEffect(
    () => {
      if (!playing || frames.length < 2) return

      const id = setInterval(
        () => setIndex(prev => {
          const next = prev + 1
          if (next < frames.length) return next

          return loop ? 0 : frames.length - 1
        }),
        1000 / fps,
      )

      return () => clearInterval(id)
    },
    [playing, fps, frames.length, loop],
  )

  if (!frames.length) return null

  // Derived rather than clamped in state, so a shorter set replacing the
  // current one can never leave the index out of range for a render.
  const safeIndex = Math.min(index, frames.length - 1)
  const current = frames[safeIndex]

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <SpriteCanvas
        imageData={current}
        alt={labels[safeIndex] ?? `Frame ${safeIndex + 1}`}
        layoutClassName={styles.previewLayout}
        {...{ showGrid }}
      />

      <div className={styles.controls}>
        <ActionIconButton
          icon={playing ? Pause : Play}
          onClick={() => setPlaying(prev => !prev)}
          title={playing ? 'Pause preview' : 'Play preview'}
          size={20}
          style='transparent'
        />

        <span className={styles.readout}>
          <LabelUppercaseXs>{`${labels[safeIndex] ?? `Frame ${safeIndex + 1}`} · ${fps} fps`}</LabelUppercaseXs>
        </span>

        <Slider
          value={fps}
          onChange={setFps}
          min={PLAYBACK_FPS_RANGE.min}
          max={PLAYBACK_FPS_RANGE.max}
          step={PLAYBACK_FPS_RANGE.step}
        />
      </div>

      <ol className={styles.strip}>
        {frames.map((frame, i) => (
          <li key={i} className={styles.stripItem}>
            <button
              type='button'
              onClick={() => { setPlaying(false); setIndex(i); selectSprite(outputSprite(i)) }}
              title={`${labels[i] ?? `Frame ${i + 1}`} — click to edit`}
              aria-pressed={i === safeIndex}
              className={cx(
                styles.thumbButton,
                i === safeIndex && styles.isActive,
                sameSprite(activeSprite, outputSprite(i)) && styles.isSelected,
              )}
            >
              <SpriteCanvas
                imageData={frame}
                alt={labels[i] ?? `Frame ${i + 1}`}
                layoutClassName={styles.thumbLayout}
              />
              <span className={styles.thumbLabel}>{labels[i] ?? i + 1}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
