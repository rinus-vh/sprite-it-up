import {
  FloatingPortal, autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions,
} from '@floating-ui/react'
import { ChevronDown } from 'lucide-react'
import { Icon, LabelUppercaseXs, Slider } from '@6njp/prototype-library'
import { useThemeVariables } from '@6njp/prototype-library/machinery'

import { useEditorContext } from '@/contexts/EditorContext.jsx'

import styles from './EditToolOptions.module.css'

/**
 * The settings for the tool in hand, behind one button above the canvas.
 *
 * The button reports the current settings so the options bar tells you what a
 * stroke will do without being opened, and only the settings the active tool
 * actually has appear inside — the pen has no hardness, and a fill or a
 * dropper has neither, so the button hides itself entirely for those.
 *
 * @param {{ layoutClassName?: string }} props
 */
export function EditToolOptions({ layoutClassName = undefined }) {
  const { activeTool, settings, setToolSetting, sizeRange, hardnessRange } = useEditorContext()

  const [open, setOpen] = React.useState(false)
  const themeVariables = useThemeVariables()

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(6), flip({ fallbackPlacements: ['top-start'] }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const { setReference, setFloating } = refs
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context)])

  // useDismiss only closes the panel. Opening is ours, merged through
  // getReferenceProps so floating-ui's own reference props survive.
  const referenceProps = getReferenceProps({ onClick: () => setOpen(previous => !previous) })

  // Switching tools closes the panel: the settings inside it would change out
  // from under the pointer, and the button they belong to has moved on.
  const previousToolRef = React.useRef(activeTool.value)
  React.useEffect(
    () => {
      if (previousToolRef.current !== activeTool.value) {
        previousToolRef.current = activeTool.value
        setOpen(false)
      }
    },
    [activeTool.value],
  )

  if (!activeTool.sized) return null

  const hardnessPercent = Math.round(settings.hardness * 100)

  return (
    <>
      <button
        ref={setReference}
        type='button'
        aria-expanded={open}
        aria-label={`${activeTool.label} settings`}
        className={cx(styles.trigger, open && styles.isOpen, layoutClassName)}
        {...referenceProps}
      >
        <Icon icon={activeTool.icon} layoutClassName={styles.iconLayout} />

        <span className={styles.summary}>
          {`${settings.size} px`}
          {activeTool.hardness && ` · ${hardnessPercent}%`}
        </span>

        <Icon icon={ChevronDown} layoutClassName={styles.chevronLayout} />
      </button>

      {open && (
        <FloatingPortal>
          <div
            ref={setFloating}
            style={{ ...floatingStyles, ...themeVariables, zIndex: 9999 }}
            className={styles.floating}
            {...getFloatingProps()}
          >
            <div className={styles.panel}>
              <span className={styles.panelTitle}>
                <LabelUppercaseXs>{`${activeTool.label} settings`}</LabelUppercaseXs>
              </span>

              <EditToolOptionsField
                label='Size'
                unit='px'
                value={settings.size}
                onChange={value => setToolSetting('size', value)}
                range={sizeRange}
              />

              {/* Only the settings the tool actually has — a pen has no
                  hardness, and saying so in prose every time you open this is
                  noise once you know the tool. */}
              {activeTool.hardness && (
                <EditToolOptionsField
                  label='Hardness'
                  unit='%'
                  value={hardnessPercent}
                  onChange={value => setToolSetting('hardness', value / 100)}
                  range={hardnessRange}
                />
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

/**
 * A slider and a number field over the same value.
 *
 * The slider is for finding a size, the field for stating one — typing 12 is
 * faster than dragging to it, and on a 16px sprite the difference between 3 and
 * 4 matters enough to want it exact.
 */
function EditToolOptionsField({ label, unit, value, onChange, range }) {
  // Held locally while typing so a half-finished number — an empty field, or
  // "1" on the way to "12" — is not clamped away under the cursor.
  const [draft, setDraft] = React.useState(String(value))
  const [previous, setPrevious] = React.useState(value)
  if (value !== previous) {
    setPrevious(value)
    setDraft(String(value))
  }

  function commit(raw) {
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed)) return

    onChange(Math.max(range.min, Math.min(range.max, parsed)))
  }

  return (
    <div className={styles.componentField}>
      <div className={styles.fieldHeader}>
        <LabelUppercaseXs>{label}</LabelUppercaseXs>

        <label className={styles.fieldInputGroup}>
          <input
            type='number'
            value={draft}
            min={range.min}
            max={range.max}
            step={range.step}
            onChange={event => { setDraft(event.target.value); commit(event.target.value) }}
            onBlur={() => setDraft(String(value))}
            className={styles.fieldInput}
          />
          <span className={styles.fieldUnit}>{unit}</span>
        </label>
      </div>

      <Slider
        min={range.min}
        max={range.max}
        step={range.step}
        {...{ value, onChange }}
      />
    </div>
  )
}
