import { ArrowLeftRight } from 'lucide-react'
import { ColorInput, Icon } from '@6njp/prototype-library'

import { EditHoverLabel } from '@/features/EditHoverLabel.jsx'

import { useEditorContext } from '@/contexts/EditorContext.jsx'

import styles from './EditToolRail.module.css'

/**
 * The tools, as an icon rail down the left of the editor, with the colour wells
 * at the bottom.
 *
 * Icon-only so the rail costs almost no width, with the name, the key and what
 * the tool does revealed on hover.
 *
 * @param {{ layoutClassName?: string }} props
 */
export function EditToolRail({ layoutClassName = undefined }) {
  const { tools, tool, setTool } = useEditorContext()

  return (
    <div
      role='toolbar'
      aria-label='Drawing tools'
      aria-orientation='vertical'
      className={cx(styles.component, layoutClassName)}
    >
      <div className={styles.tools}>
        {tools.map(item => (
          <button
            key={item.value}
            type='button'
            onClick={() => setTool(item.value)}
            aria-pressed={tool === item.value}
            aria-label={`${item.label} (${item.shortcut.toUpperCase()})`}
            className={cx(styles.item, tool === item.value && styles.isActive)}
          >
            <Icon icon={item.icon} layoutClassName={styles.iconLayout} />

            <EditHoverLabel
              label={item.label}
              hint={item.hint}
              shortcut={item.shortcut.toUpperCase()}
              layoutClassName={styles.labelLayout}
            />
          </button>
        ))}
      </div>

      <EditToolRailColorWells layoutClassName={styles.wellsLayout} />
    </div>
  )
}

/**
 * The two colours, overlapping, as every paint program has drawn them for
 * thirty years: the primary in front is what a stroke paints, the secondary
 * behind is what the right mouse button paints.
 *
 * The pair earns the arrangement — with a swap on `X` and a right-click that
 * paints the other colour, you can work two-tone (a shade and its outline, a
 * colour and the background you are cutting back to) without going to a picker
 * between strokes. The small icon restores white-on-black, on `D`. Both
 * shortcuts are bound by the panel, alongside the rest of the editor's.
 */
function EditToolRailColorWells({ layoutClassName }) {
  const {
    primaryColor, setPrimaryColor,
    secondaryColor, setSecondaryColor,
    swapColors, resetColors,
  } = useEditorContext()

  return (
    <div className={cx(styles.componentColorWells, layoutClassName)}>
      <ColorInput
        value={secondaryColor}
        onChange={setSecondaryColor}
        layoutClassName={styles.secondaryWellLayout}
      />

      <ColorInput
        value={primaryColor}
        onChange={setPrimaryColor}
        layoutClassName={styles.primaryWellLayout}
      />

      <button
        type='button'
        onClick={swapColors}
        title='Swap colours (X)'
        aria-label='Swap colours'
        className={styles.swapButton}
      >
        <Icon icon={ArrowLeftRight} layoutClassName={styles.swapIconLayout} />
      </button>

      <button
        type='button'
        onClick={resetColors}
        title='Default colours (D)'
        aria-label='Default colours'
        className={styles.resetButton}
      />
    </div>
  )
}

