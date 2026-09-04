import { Checkbox, LabelUppercaseXs, ParagraphSm } from '@6njp/prototype-library'

import { FrameStrip } from '@/features/FrameStrip.jsx'

import { useSpriteContext } from '@/contexts/SpriteContext.jsx'
import { sheetLayout } from '@/machinery/spriteSheet.js'

import styles from './OutputPanelContent.module.css'

const EMPTY_COPY = {
  rotate: 'Upload a sprite, pick the facing it is drawn in, and generate the rest.',
  animate: 'Upload a sprite and describe the animation to generate a cycle from it.',
  assetSet: 'Add style references and describe the set to generate new sprites.',
}

export function OutputPanelContent() {
  const { result, mode } = useSpriteContext()
  const [showGrid, setShowGrid] = React.useState(false)

  if (!result) return <OutputPanelContentEmpty {...{ mode }} />

  const { dimension } = sheetLayout(result.frames.length, result.frameSize)

  return (
    <div className={styles.component}>
      <FrameStrip
        frames={result.frames}
        labels={result.labels}
        loop={result.loop}
        layoutClassName={styles.stripLayout}
        {...{ showGrid }}
      />

      {Boolean(result.notes?.length) && (
        <ul className={styles.notes}>
          {result.notes.map((note, i) => (
            <li key={i} className={styles.note}>{note}</li>
          ))}
        </ul>
      )}

      <div className={styles.footer}>
        <span className={styles.meta}>
          <LabelUppercaseXs>
            {`${result.frames.length} frames · ${result.frameSize}px · sheet ${dimension}×${dimension}`}
          </LabelUppercaseXs>
        </span>

        <Checkbox checked={showGrid} onChange={setShowGrid} label='Pixel grid' />
      </div>
    </div>
  )
}

function OutputPanelContentEmpty({ mode }) {
  return (
    <div className={styles.componentEmpty}>
      <ParagraphSm>{EMPTY_COPY[mode]}</ParagraphSm>
    </div>
  )
}
