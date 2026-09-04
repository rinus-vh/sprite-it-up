import { Checkbox, LabelUppercaseXs, ParagraphSm, Slider } from '@6njp/prototype-library'

import { EditPaletteRow } from '@/features/EditPaletteRow.jsx'

import { useEditorContext } from '@/contexts/EditorContext.jsx'

import styles from './EditPalette.module.css'

/**
 * Every colour the sprite actually uses, most-used first, each one editable —
 * and a slider over the count that thins the palette out.
 *
 * Changing a swatch here recolours pixels rather than picking a brush colour:
 * a pixel sprite has a small, deliberate palette, and shifting a shade is a
 * palette operation, not something you want to paint by hand. The scope toggle
 * decides whether it lands on the frame in front of you or on the input and
 * every generated frame at once — a set has to shift together or the animation
 * flickers between shades.
 *
 * @param {{ layoutClassName?: string }} props
 */
export function EditPalette({ layoutClassName = undefined }) {
  const {
    palette, paletteScope, setPaletteScope, hasSet, recolor,
  } = useEditorContext()

  const allFrames = paletteScope === 'all'

  // While a picker is open the list is frozen and each changed row remembers
  // what it has become. Dragging a picker emits a change per pointer move, and
  // the live list re-sorts and re-keys under every one of them — the row would
  // unmount mid-drag, closing the picker, and the second change would still be
  // asking to replace a colour the first one already removed.
  const [frozen, setFrozen] = React.useState(null)
  const [changed, setChanged] = React.useState({})
  const rows = frozen ?? palette

  function handleOpenChange(open) {
    setFrozen(open ? palette : null)
    if (!open) setChanged({})
  }

  function handleChange(originalHex, nextHex) {
    const from = changed[originalHex] ?? originalHex
    if (from === nextHex) return

    recolor(from, nextHex, { allFrames, remember: !(originalHex in changed) })
    setChanged(prev => ({ ...prev, [originalHex]: nextHex }))
  }

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <EditPaletteCount layoutClassName={styles.countLayout} />

      {hasSet && (
        <Checkbox
          checked={allFrames}
          onChange={next => setPaletteScope(next ? 'all' : 'frame')}
          label='Across all frames'
        />
      )}

      {rows.length === 0
        ? <ParagraphSm>Nothing painted yet.</ParagraphSm>
        : (
          <ol className={styles.list}>
            {rows.map(entry => (
              <li key={entry.hex} className={styles.item}>
                <EditPaletteRow
                  hex={changed[entry.hex] ?? entry.hex}
                  count={entry.count}
                  onChange={next => handleChange(entry.hex, next)}
                  onPickerOpenChange={handleOpenChange}
                />
              </li>
            ))}
          </ol>
        )}
    </div>
  )
}

/**
 * The colour count, as a slider you can pull back.
 *
 * Sliding down merges the colours that are already nearly the same, always into
 * a colour the sprite already uses — which is both how you cut a sheet's file
 * size and how you push a sprite towards a tighter, more deliberate palette.
 * Full is the default and the right-hand end, so the control reads as "no more
 * than this many colours" rather than as an effect being dialled in.
 *
 * It re-derives every position from the untouched frames rather than reducing
 * what it already reduced, so pulling it back up returns the original colours
 * exactly. Painting afterwards is what commits the reduction.
 */
function EditPaletteCount({ layoutClassName }) {
  const { colorTotal, colorLimit, setColorLimit, paletteScope } = useEditorContext()

  const reduced = colorLimit < colorTotal

  return (
    <div className={cx(styles.componentCount, layoutClassName)}>
      <span className={styles.title}>
        <LabelUppercaseXs>
          {`Colours ${reduced ? `${colorLimit} of ${colorTotal}` : `· ${colorTotal}`}`
            + (paletteScope === 'all' ? ' · all frames' : '')}
        </LabelUppercaseXs>
      </span>

      {/* One colour cannot be thinned, and a two-colour sprite has nothing
          worth merging — the slider only appears when it can do something. */}
      {colorTotal > 2 && (
        <Slider
          value={colorLimit}
          onChange={setColorLimit}
          min={1}
          max={colorTotal}
          step={1}
        />
      )}
    </div>
  )
}
