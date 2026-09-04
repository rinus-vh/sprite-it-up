import { ColorInput, LabelUppercaseXs } from '@6njp/prototype-library'

import styles from './EditPaletteRow.module.css'

/**
 * One colour in the palette: a swatch that opens a picker, its hex, its share
 * of the sprite.
 *
 * The hex is editable, but only once you double-click it. A row of live text
 * inputs would invite typing where you meant to read, and would take the tool
 * shortcuts hostage every time one held focus — so the field exists only while
 * it is being used, and hands focus straight back when it is done.
 *
 * @param {{
 *   hex: string,
 *   count: number,
 *   onChange: (hex: string) => void,
 *   onPickerOpenChange: (open: boolean) => void,
 * }} props
 */
export function EditPaletteRow({ hex, count, onChange, onPickerOpenChange }) {
  const [editing, setEditing] = React.useState(false)

  return (
    <div className={styles.component}>
      <ColorInput
        value={hex}
        onOpenChange={onPickerOpenChange}
        layoutClassName={styles.swatchLayout}
        {...{ onChange }}
      />

      {editing
        ? (
          <EditPaletteRowHexField
            value={hex}
            onCommit={next => { onChange(next); setEditing(false) }}
            onCancel={() => setEditing(false)}
            layoutClassName={styles.hexLayout}
          />
        )
        : (
          <button
            type='button'
            onDoubleClick={() => setEditing(true)}
            title='Double-click to type a hex value'
            className={styles.hex}
          >
            {hex}
          </button>
        )}

      <span className={styles.count}>
        <LabelUppercaseXs>{`${count}px`}</LabelUppercaseXs>
      </span>
    </div>
  )
}

/**
 * The hex field, alive only while a value is being typed.
 *
 * Commits on Enter or on leaving, abandons on Escape, and only ever emits a
 * complete six-digit value — recolouring on every keystroke would repaint the
 * sprite through every colour the half-typed value happens to name.
 */
function EditPaletteRowHexField({ value, onCommit, onCancel, layoutClassName }) {
  const [draft, setDraft] = React.useState(value)

  function commit() {
    const clean = draft.startsWith('#') ? draft : `#${draft}`
    if (!/^#[0-9a-fA-F]{6}$/.test(clean)) {
      onCancel()

      return
    }

    onCommit(clean.toLowerCase())
  }

  return (
    <input
      autoFocus
      type='text'
      value={draft}
      maxLength={7}
      spellCheck={false}
      aria-label='Hex value'
      onChange={event => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); commit() }
        if (event.key === 'Escape') { event.preventDefault(); onCancel() }
      }}
      className={cx(styles.componentHexField, layoutClassName)}
    />
  )
}
