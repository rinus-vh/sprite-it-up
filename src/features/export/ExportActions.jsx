import { Download, FileJson, Images } from 'lucide-react'
import { Button, GhostButton, LabelUppercaseXs } from '@6njp/prototype-library'

import { downloadBlob, downloadJson } from '@/machinery/downloadFile.js'
import { planManifest, planToBlob, planToFramesZip } from '@/machinery/exportFiles.js'

import styles from './ExportActions.module.css'

/**
 * The downloads a plan can produce.
 *
 * The summary comes from the plan, not from the panel's own arithmetic, so the
 * dimensions on the button's line are the dimensions of the file it writes.
 *
 * @param {{ plan: object, layoutClassName?: string }} props
 */
export function ExportActions({ plan, layoutClassName = undefined }) {
  const isSingleFrame = plan.scope === 'frame'

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <span className={styles.summary}>
        <LabelUppercaseXs>{plan.summary}</LabelUppercaseXs>
      </span>

      <Button
        label={isSingleFrame ? 'Download frame (PNG)' : 'Download sheet (PNG)'}
        variant='solid'
        icon={Download}
        onClick={async () => downloadBlob(await planToBlob(plan), `${plan.baseName}.png`)}
      />

      <div className={styles.secondary}>
        {/* A zip of one frame would just be that frame, so it is offered only
            where there is more than one thing in the plan. */}
        {!isSingleFrame && (
          <GhostButton
            label='Individual frames (ZIP)'
            icon={Images}
            color='white'
            onClick={async () => downloadBlob(await planToFramesZip(plan), `${plan.baseName}-frames.zip`)}
          />
        )}

        <GhostButton
          label='Manifest only (JSON)'
          icon={FileJson}
          color='white'
          onClick={() => downloadJson(planManifest(plan), `${plan.baseName}-manifest.json`)}
        />
      </div>
    </div>
  )
}
