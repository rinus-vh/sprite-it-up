import { useCallback, useMemo, useState } from 'react'

import { INPUT_SPRITE, outputSprite, spriteRefKey } from '@/machinery/spriteRef.js'
import { replaceColor } from '@/machinery/recolor.js'
import { usedColors } from '@/machinery/palette.js'

/**
 * The colours in scope, and recolouring one of them.
 *
 * Scope is either the frame being edited or the input and every generated frame
 * at once — which is what you want when a sprite's palette is wrong: the whole
 * set has to shift together or the animation flickers between shades.
 */
export function useEditPalette({
  target, canEditInput, canEditOutput, outputFrames, frameOf, commitTo, rememberMany,
}) {
  const [paletteScope, setPaletteScope] = useState('frame')

  const scopedRefs = useMemo(
    () => (paletteScope === 'all'
      ? [
        ...(canEditInput ? [INPUT_SPRITE] : []),
        ...outputFrames.map((_, index) => outputSprite(index)),
      ]
      : (target ? [target] : [])),
    [paletteScope, canEditInput, outputFrames, target],
  )

  /** The scoped sprites paired with their pixels, skipping any that are absent. */
  const scopedEntries = useMemo(
    () => scopedRefs.map(ref => ({ ref, imageData: frameOf(ref) })).filter(entry => Boolean(entry.imageData)),
    [scopedRefs, frameOf],
  )

  const palette = useMemo(
    () => usedColors(scopedEntries.map(entry => entry.imageData)),
    [scopedEntries],
  )

  const recolor = useCallback(
    (fromHex, toHex, { allFrames = false, remember = true } = {}) => {
      const entries = allFrames ? scopedEntries : (target ? [{ ref: target, imageData: frameOf(target) }] : [])
      const present = entries.filter(entry => Boolean(entry.imageData))
      if (!present.length) return

      // Dragging a picker emits a change per pointer move; only the first of
      // them opens an undo step, so one recolour undoes in one press.
      if (remember) {
        rememberMany(present.map(entry => ({ key: spriteRefKey(entry.ref), imageData: entry.imageData })))
      }
      for (const entry of present) commitTo(entry.ref, replaceColor(entry.imageData, fromHex, toHex))
    },
    [scopedEntries, target, frameOf, commitTo, rememberMany],
  )

  return {
    palette,
    paletteScope, setPaletteScope,
    scopeKey: paletteScope === 'all' ? 'all' : `frame:${spriteRefKey(target)}`,
    scopedEntries,
    hasSet: canEditOutput && (canEditInput || outputFrames.length > 1),
    recolor,
  }
}
