import { finalizeFrame } from './finalizeFrame.js'
import { base64ToImageData, extractPalette, imageDataToBase64 } from './pixelImage.js'
import { runJob } from './serverClient.js'

/**
 * Generates a set of brand-new sprites in the style of the reference images.
 *
 * Style comes from the references, subject matter from the description. More
 * references give the stage a tighter read on the style, which is why the UI
 * takes several rather than one.
 *
 * The shared palette is pooled across every reference, so a generated set is
 * internally consistent even though nothing in it existed before.
 *
 * @param {ImageData[]} references  native-resolution style references
 * @param {{
 *   description: string,
 *   count: number,
 *   frameSize: number,
 *   seed?: number,
 *   onProgress?: (info: { progress: number, label?: string }) => void,
 *   signal?: AbortSignal,
 * }} options
 */
export async function generateAssetSet(references, {
  description,
  count,
  frameSize,
  seed,
  onProgress,
  signal,
}) {
  const palette = pooledPalette(references)

  const result = await runJob('/asset-set', {
    references: references.map(imageDataToBase64),
    size: frameSize,
    count,
    description,
    seed,
  }, { onProgress, signal })

  const frames = await Promise.all(
    result.frames.map(async frame => finalizeFrame(
      await base64ToImageData(frame.image_b64),
      { size: frameSize, palette },
    )),
  )

  return {
    frames,
    labels: result.frames.map((frame, i) => frame.label ?? `Asset ${i + 1}`),
  }
}

function pooledPalette(references) {
  const seen = new Map()

  for (const reference of references) {
    for (const colour of extractPalette(reference)) {
      seen.set(colour.join(','), colour)
    }
  }

  return [...seen.values()]
}
