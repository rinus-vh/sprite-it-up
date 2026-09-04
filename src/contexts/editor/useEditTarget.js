import { useCallback, useMemo } from 'react'

import { resolveSpriteRef, spriteRefKey } from '@/machinery/spriteRef.js'

/**
 * Resolves the project's active sprite selection to a bitmap to edit.
 *
 * The editor does not decide what it is editing — any panel can select a
 * sprite, and this turns that selection into a frame, a name and somewhere to
 * commit changes back to.
 *
 * Resolved on every render rather than mirrored into state: a selection the
 * editor cannot honour — the input in asset-set mode, a frame index a shorter
 * regenerated set no longer has — falls back to whatever is editable instead of
 * leaving the canvas blank or pointing past the end of a set.
 */
export function useEditTarget({
  activeSprite, canEditInput, canEditOutput, inputFrame, outputFrames, labels,
  editInputFrame, editResultFrame,
}) {
  const resolved = useMemo(
    () => resolveSpriteRef({
      ref: activeSprite,
      allowInput: canEditInput,
      allowOutput: canEditOutput,
      inputFrame,
      outputFrames,
      labels,
    }),
    [activeSprite, canEditInput, canEditOutput, inputFrame, outputFrames, labels],
  )

  const target = resolved.ref

  const frameOf = useCallback(
    ref => (ref === null ? null : (ref.kind === 'input' ? inputFrame : outputFrames[ref.index] ?? null)),
    [inputFrame, outputFrames],
  )

  const commitTo = useCallback(
    (ref, imageData) => {
      if (ref.kind === 'input') editInputFrame(imageData)
      else editResultFrame(ref.index, imageData)
    },
    [editInputFrame, editResultFrame],
  )

  const commit = useCallback(
    imageData => { if (target) commitTo(target, imageData) },
    [target, commitTo],
  )

  return {
    target,
    targetKey: spriteRefKey(target),
    targetLabel: resolved.label,
    frame: resolved.frame,
    frameOf,
    commit,
    commitTo,
  }
}
