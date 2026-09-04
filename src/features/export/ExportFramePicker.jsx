import { LabelUppercaseXs } from '@6njp/prototype-library'

import { SpriteCanvas } from '@/features/SpriteCanvas.jsx'

import { INPUT_SPRITE, outputSprite, sameSprite } from '@/machinery/spriteRef.js'

import styles from './ExportFramePicker.module.css'

/**
 * Which single frame to export.
 *
 * Drives the project's own selection rather than keeping a choice of its own,
 * so the frame you export is the frame the editor has open — including the
 * input sprite with your edits on it, which is the whole reason this scope is
 * worth having. Picking here also sends that frame to the editor, which is the
 * same thing clicking a frame anywhere else in the app does.
 *
 * @param {{
 *   activeSprite: object | null,
 *   onSelect: (ref: object) => void,
 *   inputFrame?: ImageData | null,
 *   inputName?: string,
 *   isInputEdited?: boolean,
 *   frames?: ImageData[],
 *   labels?: string[],
 *   layoutClassName?: string,
 * }} props
 */
export function ExportFramePicker({
  activeSprite,
  onSelect,
  inputFrame = null,
  inputName = 'Input',
  isInputEdited = false,
  frames = [],
  labels = [],
  layoutClassName = undefined,
}) {
  const choices = [
    ...(inputFrame ? [{ ref: INPUT_SPRITE, frame: inputFrame, label: isInputEdited ? `${inputName} ·` : inputName }] : []),
    ...frames.map((frame, index) => ({ ref: outputSprite(index), frame, label: labels[index] ?? `Frame ${index + 1}` })),
  ]

  return (
    <ol className={cx(styles.component, layoutClassName)}>
      {choices.map(choice => (
        <li key={`${choice.ref.kind}-${choice.ref.index ?? 'input'}`} className={styles.item}>
          <button
            type='button'
            onClick={() => onSelect(choice.ref)}
            title={`Export ${choice.label}`}
            aria-pressed={sameSprite(activeSprite, choice.ref)}
            className={cx(styles.choice, sameSprite(activeSprite, choice.ref) && styles.isSelected)}
          >
            <SpriteCanvas
              imageData={choice.frame}
              alt={choice.label}
              layoutClassName={styles.thumbLayout}
            />

            <span className={styles.label}>
              <LabelUppercaseXs>{choice.label}</LabelUppercaseXs>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
