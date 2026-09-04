import { useCallback, useMemo, useState } from 'react'

import {
  BRUSH_SIZE_RANGE, DEFAULT_EDIT_TOOL, DEFAULT_TOOL_SETTINGS, EDIT_TOOLS, HARDNESS_RANGE,
} from '@/constants/editTools.js'
import { brushKernel } from '@/machinery/brush.js'

/**
 * The tool in hand and its settings, plus the footprint they add up to.
 *
 * Size and hardness are remembered per tool rather than shared: a 1px pen
 * alongside a 6px soft brush is a normal pair to work with, and one size for
 * both would mean resetting it on every switch.
 *
 * The kernel is derived here rather than at each call site, so the stroke that
 * paints and the outline that previews it are the same footprint by
 * construction — a preview cannot promise what a brush would not do.
 */
export function useToolSettings() {
  const [tool, setTool] = useState(DEFAULT_EDIT_TOOL)
  const [toolSettings, setToolSettings] = useState(DEFAULT_TOOL_SETTINGS)

  const activeTool = EDIT_TOOLS.find(t => t.value === tool) ?? EDIT_TOOLS[0]
  const settings = toolSettings[tool] ?? DEFAULT_TOOL_SETTINGS.pen

  const setToolSetting = useCallback(
    (key, value) => setToolSettings(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })),
    [tool],
  )

  /**
   * Nudges the active tool's size, clamped to the range the slider offers.
   *
   * Shared rather than clamped at the call site, so a wheel and the slider can
   * never disagree about how large a brush is allowed to get.
   */
  const stepToolSize = useCallback(
    steps => setToolSettings(prev => {
      const current = prev[tool] ?? DEFAULT_TOOL_SETTINGS.pen
      const size = Math.max(
        BRUSH_SIZE_RANGE.min,
        Math.min(BRUSH_SIZE_RANGE.max, current.size + steps),
      )
      // Already at an end: returning the same state avoids a wasted render on
      // every further notch.
      if (size === current.size) return prev

      return { ...prev, [tool]: { ...current, size } }
    }),
    [tool],
  )

  const kernel = useMemo(
    () => brushKernel({
      size: activeTool.sized ? settings.size : 1,
      // A tool without a hardness setting is fully hard, whatever is remembered
      // for it — the pen must never lay down a partial pixel.
      hardness: activeTool.hardness ? settings.hardness : 1,
      shape: activeTool.shape ?? 'square',
    }),
    [activeTool, settings.size, settings.hardness],
  )

  return {
    tool, setTool, tools: EDIT_TOOLS, activeTool,
    settings, setToolSetting, stepToolSize, kernel,
    sizeRange: BRUSH_SIZE_RANGE, hardnessRange: HARDNESS_RANGE,
  }
}
