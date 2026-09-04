/** Keeps a canvas showing the frame, at the frame's own resolution. */
export function usePaintedFrame({ ref, frame }) {
  React.useEffect(
    () => {
      const canvas = ref.current
      if (!canvas || !frame) return

      canvas.width = frame.width
      canvas.height = frame.height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(frame, 0, 0)
    },
    [ref, frame],
  )
}
