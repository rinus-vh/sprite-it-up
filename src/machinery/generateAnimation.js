import { finalizeFrame } from './finalizeFrame.js'
import { base64ToImageData, extractPalette, imageDataToBase64 } from './pixelImage.js'
import { runJob } from './serverClient.js'

/**
 * Generates an animation cycle from a single input pose plus a description.
 *
 * `loop` changes what the last frame is asked to be: in a looping cycle the
 * final frame is the pose immediately *before* the first one, so playback wraps
 * without repeating a frame. A non-looping run treats the input as the start of
 * a one-shot and lets the last frame land on the end pose.
 *
 * @param {ImageData} inputFrame
 * @param {{
 *   description: string,
 *   frameCount: number,
 *   frameSize: number,
 *   loop?: boolean,
 *   seed?: number,
 *   onProgress?: (info: { progress: number, label?: string }) => void,
 *   signal?: AbortSignal,
 * }} options
 */
export async function generateAnimation(inputFrame, {
  description,
  frameCount,
  frameSize,
  loop = true,
  seed,
  onProgress,
  signal,
}) {
  const palette = extractPalette(inputFrame)

  const result = await runJob('/animate', {
    image: imageDataToBase64(inputFrame),
    size: frameSize,
    frame_count: frameCount,
    description,
    loop,
    seed,
  }, { onProgress, signal })

  const generated = await Promise.all(
    result.frames.map(async frame => finalizeFrame(
      await base64ToImageData(frame.image_b64),
      { size: frameSize, palette },
    )),
  )

  return {
    frames: [inputFrame, ...generated],
    labels: ['Frame 1', ...generated.map((_, i) => `Frame ${i + 2}`)],
  }
}
