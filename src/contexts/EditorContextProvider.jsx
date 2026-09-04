import { useCallback, useMemo, useState } from 'react'

import { useSpriteContext } from './SpriteContext.jsx'
import { useEditColors } from './editor/useEditColors.js'
import { useEditHistory } from './editor/useEditHistory.js'
import { useEditPalette } from './editor/useEditPalette.js'
import { useEditTarget } from './editor/useEditTarget.js'
import { useEditZoom } from './editor/useEditZoom.js'
import { usePaletteReduction } from './editor/usePaletteReduction.js'
import { useStrokes } from './editor/useStrokes.js'
import { useToolSettings } from './editor/useToolSettings.js'
import { EditorContext } from './EditorContext.jsx'

/**
 * The pixel editor's state, composed from a hook per concern.
 *
 * Nothing here does any work of its own beyond wiring: what is being edited,
 * the undo history, the tool and its footprint, the two colours, the zoom, the
 * strokes, the palette and its reduction each live in their own hook under
 * ./editor, and this decides how they see each other.
 *
 * Two of those relationships are worth being explicit about, and are the reason
 * they are wired here rather than reaching for each other directly:
 *
 *   • Painting, recolouring and undoing all invalidate the reduction baseline,
 *     because it no longer describes the pixels. Each is given `clearReduction`
 *     rather than knowing what a palette is.
 *   • The editor holds no pixels. Every edit commits straight to the sprite
 *     state, so the Preview and Export panels always show what was just
 *     painted, and minimising the Edit panel loses no work.
 */
export function EditorContextProvider({ children }) {
  const {
    inputFrame, isInputEdited, editInputFrame, revertInputFrame,
    result, editResultFrame, frameSize, mode, activeSprite,
  } = useSpriteContext()

  // Memoised: a fresh `[]` every render would re-run every memo and callback
  // downstream that depends on the frame list.
  const outputFrames = useMemo(() => result?.frames ?? [], [result])
  const labels = useMemo(() => result?.labels ?? [], [result])

  // Asset-set mode has references instead of one input sprite, so there is
  // nothing single to edit on the way in — only the generated set.
  const canEditInput = mode !== 'assetSet' && Boolean(inputFrame)
  const canEditOutput = outputFrames.length > 0

  const { target, targetKey, targetLabel, frame, frameOf, commit, commitTo } = useEditTarget({
    activeSprite, canEditInput, canEditOutput, inputFrame, outputFrames, labels,
    editInputFrame, editResultFrame,
  })

  const history = useEditHistory({ targetKey, frame, commit })
  const tools = useToolSettings()
  const colors = useEditColors()
  const zoomControls = useEditZoom()

  const palette = useEditPalette({
    target, canEditInput, canEditOutput, outputFrames, frameOf, commitTo,
    rememberMany: history.rememberMany,
  })

  const reduction = usePaletteReduction({
    scopeKey: palette.scopeKey,
    scopedEntries: palette.scopedEntries,
    paletteSize: palette.palette.length,
    commitTo,
    rememberMany: history.rememberMany,
  })

  // Painting is the user moving on: the reduction baseline no longer describes
  // these pixels, so the slider starts again from what is there.
  const onPaintStart = useCallback(
    (current) => {
      reduction.clearReduction()
      history.remember(current)
    },
    [reduction, history],
  )

  const strokes = useStrokes({
    tool: tools.tool,
    kernel: tools.kernel,
    frame,
    commit,
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
    pickColor: colors.pickColor,
    onPaintStart,
  })

  // Recolouring and stepping through history both have to drop the baseline, or
  // the slider would keep offering to re-derive from pixels no longer there.
  // Wrapped here rather than inside those hooks, so neither has to know that a
  // palette reduction exists.
  const recolor = useCallback(
    (fromHex, toHex, options) => {
      reduction.clearReduction()
      palette.recolor(fromHex, toHex, options)
    },
    [reduction, palette],
  )

  const undo = useCallback(
    () => { reduction.clearReduction(); history.undo() },
    [reduction, history],
  )

  const redo = useCallback(
    () => { reduction.clearReduction(); history.redo() },
    [reduction, history],
  )

  const [showGrid, setShowGrid] = useState(true)

  const value = {
    target, targetLabel, frame, frameSize,
    canEditInput, canEditOutput,
    ...tools,
    ...colors,
    ...zoomControls,
    ...strokes,
    undo, redo, canUndo: history.canUndo, canRedo: history.canRedo,
    palette: palette.palette,
    paletteScope: palette.paletteScope, setPaletteScope: palette.setPaletteScope,
    hasSet: palette.hasSet, recolor,
    colorTotal: reduction.colorTotal, colorLimit: reduction.colorLimit,
    setColorLimit: reduction.setColorLimit,
    showGrid, setShowGrid,
    isInputEdited, revertInputFrame,
  }

  return (
    <EditorContext.Provider {...{ value }}>
      {children}
    </EditorContext.Provider>
  )
}
