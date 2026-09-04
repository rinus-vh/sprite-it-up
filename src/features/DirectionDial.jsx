import { LabelUppercaseXs } from '@6njp/prototype-library'

import { DIRECTIONS } from '@/constants/directions.js'
import { directionsFor, labelFor } from '@/machinery/directions.js'

import styles from './DirectionDial.module.css'

/**
 * Compass picker for the input sprite's facing.
 *
 * The dial also previews the outcome: the facings that will end up in the sheet
 * are highlighted, the rest are dimmed. That makes the 4-frame rule visible
 * rather than something the user has to remember — pick a diagonal and the
 * other three diagonals light up, pick a cardinal and you get the cardinals.
 *
 * @param {{
 *   value: string,
 *   onChange: (direction: string) => void,
 *   frameCount: 4 | 8,
 *   layoutClassName?: string,
 * }} props
 */
export function DirectionDial({ value, onChange, frameCount, layoutClassName = undefined }) {
  const included = new Set(directionsFor(value, frameCount))

  return (
    <div className={cx(styles.component, layoutClassName)}>
      {DIRECTIONS.map(direction => (
        <button
          key={direction.value}
          type='button'
          onClick={() => onChange(direction.value)}
          title={`Input faces ${labelFor(direction.value)}`}
          aria-pressed={direction.value === value}
          className={cx(
            styles.cell,
            styles[`cell${direction.value}`],
            included.has(direction.value) && styles.isIncluded,
            direction.value === value && styles.isSelected,
          )}
        >
          {direction.short}
        </button>
      ))}

      <span className={styles.center}>
        <LabelUppercaseXs>{`${frameCount} frames`}</LabelUppercaseXs>
      </span>
    </div>
  )
}
