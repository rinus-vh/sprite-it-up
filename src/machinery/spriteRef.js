/**
 * A reference to one editable bitmap in the project.
 *
 * The editor does not hold pixels or decide what it is editing — it edits
 * whatever is currently selected, and selection is a project-level concern that
 * any panel can drive: clicking the uploaded sprite, a frame in the preview
 * strip, and later a frame on the timeline all mean the same thing.
 *
 * Keeping it a described reference rather than a copy of the bitmap is what
 * lets a new kind be added without touching the editor: a `kind` the editor
 * cannot resolve simply has nothing selected.
 *
 * @typedef {{ kind: 'input' | 'output', index?: number }} SpriteRef
 */

export const INPUT_SPRITE = { kind: 'input' }

export function outputSprite(index) {
  return { kind: 'output', index }
}

export function sameSprite(a, b) {
  if (!a || !b || a.kind !== b.kind) return false

  return a.kind !== 'output' || a.index === b.index
}

/** Stable identity for keying per-sprite state, such as an undo stack. */
export function spriteRefKey(ref) {
  if (!ref) return 'none'

  return ref.kind === 'output' ? `output:${ref.index}` : ref.kind
}

/** What to call the selected sprite in the interface. */
export function spriteRefLabel(ref, labels = []) {
  if (!ref) return 'Nothing selected'
  if (ref.kind === 'input') return 'Input sprite'

  return labels[ref.index] ?? `Frame ${ref.index + 1}`
}

/**
 * Resolves a selection to an actual frame, falling back when it cannot.
 *
 * A selection the project cannot honour — the input while an asset set is being
 * made, a frame index a shorter regenerated set no longer has — resolves to
 * whatever is available instead of to nothing. Shared between the editor and
 * the export panel so the two can never disagree about which sprite is current.
 *
 * @param {{
 *   ref: SpriteRef | null,
 *   inputFrame: ImageData | null,
 *   outputFrames: ImageData[],
 *   labels?: string[],
 *   allowInput?: boolean,
 *   allowOutput?: boolean,
 * }} options
 * @returns {{ ref: SpriteRef | null, frame: ImageData | null, label: string }}
 */
export function resolveSpriteRef({
  ref, inputFrame, outputFrames, labels = [], allowInput = true, allowOutput = true,
}) {
  const hasOutput = allowOutput && outputFrames.length > 0
  const hasInput = allowInput && Boolean(inputFrame)

  const resolved = (() => {
    if (ref?.kind === 'output' && hasOutput) {
      return outputSprite(Math.min(ref.index ?? 0, outputFrames.length - 1))
    }
    if (ref?.kind === 'input' && hasInput) return INPUT_SPRITE
    if (hasInput) return INPUT_SPRITE
    if (hasOutput) return outputSprite(0)

    return null
  })()

  if (resolved === null) return { ref: null, frame: null, label: spriteRefLabel(null) }

  return {
    ref: resolved,
    frame: resolved.kind === 'input' ? inputFrame : outputFrames[resolved.index] ?? null,
    label: spriteRefLabel(resolved, labels),
  }
}
