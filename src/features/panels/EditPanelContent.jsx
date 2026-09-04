import { ParagraphSm } from '@6njp/prototype-library'

import { EditMeta } from '@/features/EditMeta.jsx'
import { EditPalette } from '@/features/EditPalette.jsx'
import { EditToolRail } from '@/features/EditToolRail.jsx'
import { EditToolbar } from '@/features/EditToolbar.jsx'
import { PixelEditor } from '@/features/pixelEditor/PixelEditor.jsx'

import { useEditorContext } from '@/contexts/EditorContext.jsx'
import { useEditorShortcuts } from './useEditorShortcuts.js'

import styles from './EditPanelContent.module.css'

/**
 * Paint on the sprite that goes in, or on any frame that came out.
 *
 * Edits commit straight to the sprite state, so a touched-up input is what the
 * next generation reads and a touched-up frame is what Export writes — there is
 * no separate "editor copy" to keep in sync.
 *
 * The whole panel is one grid: a row for the options bar and a row for the
 * canvas, a column for the tool rail, one for the canvas and one for the
 * colours. Every control therefore lines up with the canvas by construction
 * rather than by matched paddings, and the corner where the rail's column meets
 * the bar's row is simply left empty.
 *
 * The grid also owns the panel's height and hands it to the canvas row, so the
 * colour list scrolls inside its own cell and can never push the tools or the
 * canvas out of view, however many colours a sprite turns out to use.
 */
export function EditPanelContent() {
  const { frame, canEditInput, canEditOutput } = useEditorContext()

  useEditorShortcuts()

  if (!canEditInput && !canEditOutput) return <EditPanelContentEmpty />

  return (
    <div className={styles.component_root}>
      {/* Placed straight onto the panel grid rather than nested in wrappers, so
          each one lines up with the canvas: the bar shares its top row, the rail
          its left column, and the side column starts on the canvas's row. The
          corner above the rail is empty by construction. */}
      <EditToolbar layoutClassName={styles.toolbarLayout} />

      <EditToolRail layoutClassName={styles.railLayout} />

      {frame
        ? <PixelEditor layoutClassName={styles.editorLayout} />
        : (
          <div className={styles.editorPlaceholder}>
            <ParagraphSm>Pick something to edit.</ParagraphSm>
          </div>
        )}

      <div className={styles.sideColumn}>
        <EditMeta layoutClassName={styles.metaLayout} />

        <EditPalette layoutClassName={styles.paletteLayout} />
      </div>
    </div>
  )
}

function EditPanelContentEmpty() {
  return (
    <div className={styles.componentEmpty}>
      <ParagraphSm>
        Upload a sprite or generate a set, then click any sprite to edit it here
        — pen, brush, eraser, fill and a palette you can recolour.
      </ParagraphSm>
    </div>
  )
}
