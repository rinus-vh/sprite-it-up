import { Grid2x2, Redo2, Undo2 } from 'lucide-react'
import { ActionIconButton } from '@6njp/prototype-library'

import { EditIconButton } from '@/features/EditIconButton.jsx'
import { EditToolOptions } from '@/features/EditToolOptions.jsx'

import { GRID_SHORTCUT_LABEL } from '@/constants/editTools.js'
import { useEditorContext } from '@/contexts/EditorContext.jsx'

import styles from './EditToolbar.module.css'

/**
 * The options bar: the settings for the tool in hand, then history and the
 * pixel grid.
 *
 * Everything that had a fixed place elsewhere has gone there — the tools to the
 * rail, the colours to the wells, what is being edited to the meta section, and
 * zoom to its keyboard shortcuts. What is left is what changes a stroke.
 *
 * @param {{ layoutClassName?: string }} props
 */
export function EditToolbar({ layoutClassName = undefined }) {
  const { showGrid, setShowGrid, undo, redo, canUndo, canRedo } = useEditorContext()

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <EditToolOptions layoutClassName={styles.optionsLayout} />

      <div className={styles.group}>
        <ActionIconButton
          icon={Undo2}
          onClick={undo}
          disabled={!canUndo}
          title='Undo (⌘Z)'
          size={28}
        />

        <ActionIconButton
          icon={Redo2}
          onClick={redo}
          disabled={!canRedo}
          title='Redo (⇧⌘Z)'
          size={28}
        />
      </div>

      <div className={styles.divider} />

      <EditIconButton
        icon={Grid2x2}
        label='Pixel grid'
        hint={showGrid ? 'Showing' : 'Hidden'}
        shortcut={GRID_SHORTCUT_LABEL}
        isActive={showGrid}
        onClick={() => setShowGrid(prev => !prev)}
        layoutClassName={styles.gridToggleLayout}
      />
    </div>
  )
}
