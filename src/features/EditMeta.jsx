import { RotateCcw } from 'lucide-react'
import { GhostButton, LabelUppercaseXs } from '@6njp/prototype-library'

import { useEditorContext } from '@/contexts/EditorContext.jsx'

import styles from './EditMeta.module.css'

/**
 * What is being edited, and the facts about it, at the head of the right-hand
 * column.
 *
 * This is deliberately a readout and not a control: the sprite in the editor is
 * whichever one is selected, and a second way to change it here could disagree
 * with the panel you clicked in. Putting it beside the colours rather than
 * above the canvas keeps the options bar to the things a stroke depends on.
 *
 * @param {{ layoutClassName?: string }} props
 */
export function EditMeta({ layoutClassName = undefined }) {
  const { targetLabel, frame, zoom, isInputEdited, revertInputFrame, target } = useEditorContext()

  const showRevert = target?.kind === 'input' && isInputEdited

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <span className={styles.label}>
        <LabelUppercaseXs>Editing</LabelUppercaseXs>
      </span>

      <h2 className={styles.name}>{targetLabel}</h2>

      <dl className={styles.facts}>
        <EditMetaFact label='Size' value={frame ? `${frame.width} × ${frame.height}` : '—'} />
        <EditMetaFact label='Zoom' value={zoom === null ? 'Fit' : `${zoom}×`} />
      </dl>

      {showRevert && (
        <GhostButton
          label='Revert edits'
          icon={RotateCcw}
          color='white'
          onClick={revertInputFrame}
        />
      )}
    </div>
  )
}

function EditMetaFact({ label, value }) {
  return (
    <div className={styles.componentFact}>
      <dt className={styles.factLabel}>
        <LabelUppercaseXs>{label}</LabelUppercaseXs>
      </dt>

      <dd className={styles.factValue}>{value}</dd>
    </div>
  )
}
