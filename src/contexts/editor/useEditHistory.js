import { useCallback, useState } from 'react'

import { HISTORY_LIMIT } from '@/constants/editTools.js'

const EMPTY = { past: [], future: [] }

/**
 * Undo and redo, kept per sprite.
 *
 * Per sprite so undoing while frame 3 is open cannot roll back an edit you made
 * to frame 1. Snapshots are whole ImageData buffers — at native resolution a
 * frame is a few kilobytes, so the whole limit costs less than one screenshot
 * and needs no diffing.
 *
 * An operation that spans several frames records each of them, so nothing it
 * touched is left unrecoverable — though it is still undone one frame at a
 * time, which a single project-wide stack would fix.
 */
export function useEditHistory({ targetKey, frame, commit }) {
  const [histories, setHistories] = useState({})
  const history = histories[targetKey] ?? EMPTY

  const rememberMany = useCallback(
    entries => setHistories(prev => {
      const next = { ...prev }
      for (const { key, imageData } of entries) {
        next[key] = {
          past: [...(prev[key]?.past ?? []), imageData].slice(-HISTORY_LIMIT),
          // A fresh edit is a new branch: what you had redone away is gone.
          future: [],
        }
      }

      return next
    }),
    [],
  )

  const remember = useCallback(
    imageData => rememberMany([{ key: targetKey, imageData }]),
    [rememberMany, targetKey],
  )

  const undo = useCallback(
    () => {
      const previous = history.past.at(-1)
      if (!previous || !frame) return

      setHistories(prev => ({
        ...prev,
        [targetKey]: { past: history.past.slice(0, -1), future: [...history.future, frame] },
      }))
      commit(previous)
    },
    [targetKey, history, frame, commit],
  )

  const redo = useCallback(
    () => {
      const next = history.future.at(-1)
      if (!next || !frame) return

      setHistories(prev => ({
        ...prev,
        [targetKey]: { past: [...history.past, frame], future: history.future.slice(0, -1) },
      }))
      commit(next)
    },
    [targetKey, history, frame, commit],
  )

  return {
    remember,
    rememberMany,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
