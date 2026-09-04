import { useCallback, useState } from 'react'

import { applyReduction, buildMergeSequence, reductionLookup } from '@/machinery/paletteReduce.js'
import { colorCounts } from '@/machinery/palette.js'
import { spriteRefKey } from '@/machinery/spriteRef.js'

/**
 * The colour-count slider: fewer colours by merging the ones already alike.
 *
 * Held as a baseline plus a merge order rather than as a series of edits, so
 * every slider position is re-derived from the untouched frames. Dragging back
 * up restores the original colours exactly instead of compounding losses, and
 * the reported total stays the one it started from so the slider cannot shrink
 * under the thumb.
 *
 * The baseline is dropped as soon as anything else edits the pixels, because it
 * no longer describes them.
 */
export function usePaletteReduction({ scopeKey, scopedEntries, paletteSize, commitTo, rememberMany }) {
  const [reduction, setReduction] = useState(null)
  const clearReduction = useCallback(() => setReduction(null), [])

  const live = reduction?.scopeKey === scopeKey ? reduction : null

  const setColorLimit = useCallback(
    limit => {
      let active = live
      if (!active) {
        if (!scopedEntries.length) return

        const { sequence, total } = buildMergeSequence(colorCounts(scopedEntries.map(e => e.imageData)))
        if (total < 2) return

        // One undo step for the whole reduction, recorded for every frame it
        // can touch — sliding is a single decision however long you drag.
        rememberMany(scopedEntries.map(e => ({ key: spriteRefKey(e.ref), imageData: e.imageData })))
        active = { scopeKey, sequence, total, baseline: scopedEntries, limit: total }
      }

      const next = Math.max(1, Math.min(limit, active.total))
      const lookup = reductionLookup(active.sequence, active.total - next)
      for (const entry of active.baseline) commitTo(entry.ref, applyReduction(entry.imageData, lookup))

      setReduction({ ...active, limit: next })
    },
    [live, scopeKey, scopedEntries, commitTo, rememberMany],
  )

  return {
    colorTotal: live ? live.total : paletteSize,
    colorLimit: live ? live.limit : paletteSize,
    setColorLimit,
    clearReduction,
  }
}
