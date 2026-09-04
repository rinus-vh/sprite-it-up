import { GRID_SHORTCUT } from '@/constants/editTools.js'
import { useEditorContext } from '@/contexts/EditorContext.jsx'

/**
 * The editor's keyboard shortcuts, live only while the panel is open.
 *
 * Bound to the window rather than to a focused element: your hand is on the
 * canvas when you reach for undo or zoom, and a shortcut that needed the right
 * thing focused first would never get used. Every one of them is prevented from
 * reaching the browser, so ⌘+ zooms the sprite and not the page — and all of
 * them stand down while you are typing in a field.
 */
export function useEditorShortcuts() {
  const {
    undo, redo, stepZoom, zoomToFit, swapColors, resetColors, tools, setTool, setShowGrid,
  } = useEditorContext()

  React.useEffect(
    () => {
      function onKeyDown(event) {
        if (isTypingTarget(event.target)) return

        const key = event.key.toLowerCase()

        if (event.metaKey || event.ctrlKey) {
          if (event.altKey) return

          if (key === 'z') {
            event.preventDefault()
            if (event.shiftKey) redo()
            else undo()
          }
          // Both the unshifted and shifted forms of the same physical key, so
          // ⌘+ works whether or not the layout needs shift for a plus.
          if (key === '=' || key === '+') { event.preventDefault(); stepZoom(1) }
          if (key === '-' || key === '_') { event.preventDefault(); stepZoom(-1) }
          if (key === '0') { event.preventDefault(); zoomToFit() }
          if (key === GRID_SHORTCUT) { event.preventDefault(); setShowGrid(prev => !prev) }

          return
        }

        if (event.shiftKey) return

        // The tool keys come from the tool list rather than a second mapping
        // here, so a tool cannot be added without one.
        const picked = tools.find(tool => tool.shortcut === key)
        if (picked) { event.preventDefault(); setTool(picked.value); return }

        if (key === 'x') { event.preventDefault(); swapColors() }
        if (key === 'd') { event.preventDefault(); resetColors() }
      }

      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    },
    [undo, redo, stepZoom, zoomToFit, swapColors, resetColors, tools, setTool, setShowGrid],
  )
}

function isTypingTarget(element) {
  if (!element) return false
  if (element.isContentEditable) return true

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}
