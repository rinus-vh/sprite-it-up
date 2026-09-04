import { useCallback, useRef, useState } from 'react'

import { ZOOM_RANGE } from '@/constants/editTools.js'

/**
 * The canvas zoom, in whole screen-pixels per sprite pixel.
 *
 * `null` means "fit the panel" — the canvas measures its own container and
 * reports back what it settled on, so stepping up from a fitted view grows from
 * what you can see rather than jumping to 2x. An explicit number is a zoom the
 * user chose and nothing may override.
 */
export function useEditZoom() {
  const [zoom, setZoom] = useState(null)
  const fittedRef = useRef(1)

  const reportFittedZoom = useCallback(scale => { fittedRef.current = scale }, [])

  const stepZoom = useCallback(
    direction => setZoom(prev => {
      const from = prev ?? fittedRef.current

      return Math.max(ZOOM_RANGE.min, Math.min(ZOOM_RANGE.max, from + direction))
    }),
    [],
  )

  const zoomToFit = useCallback(() => setZoom(null), [])

  return { zoom, setZoom, stepZoom, zoomToFit, reportFittedZoom }
}
