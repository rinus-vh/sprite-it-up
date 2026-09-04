import { directionsFor, labelFor, rotationPlan } from './directions.js'
import { finalizeFrame } from './finalizeFrame.js'
import { mirrorHorizontally } from './mirrorFrame.js'
import { base64ToImageData, extractPalette, imageDataToBase64 } from './pixelImage.js'
import { runJob } from './serverClient.js'

/**
 * Generates the remaining facings of a rotation set from a single input sprite.
 *
 * Only the near half is generated. Facings past 180 degrees are mirrored from
 * their reflections, which is exact, instant, and guarantees the two halves of
 * the sheet agree with each other — so an 8-frame set costs four generations
 * rather than seven. Turn `mirrorOpposites` off for asymmetric characters,
 * where a mirrored frame would swap which hand holds what.
 *
 * The whole set is one server job so the engine can hold its state across
 * facings; with Zero123++ all six views come out of a single pass anyway.
 *
 * @param {ImageData} inputFrame  the input sprite, already at native resolution
 * @param {{
 *   direction: string,
 *   frameCount: 4 | 8,
 *   frameSize: number,
 *   description?: string,
 *   seed?: number,
 *   mirrorOpposites?: boolean,
 *   onProgress?: (info: { progress: number, label?: string }) => void,
 *   signal?: AbortSignal,
 * }} options
 * @returns {Promise<{ frames: ImageData[], labels: string[], notes: string[] }>}
 */
export async function generateRotation(inputFrame, {
  direction,
  frameCount,
  frameSize,
  description = '',
  seed,
  mirrorOpposites = true,
  onProgress,
  signal,
}) {
  const order = directionsFor(direction, frameCount)
  const palette = extractPalette(inputFrame)

  const plan = mirrorOpposites
    ? rotationPlan(direction, frameCount)
    : {
      generate: order
        .filter(d => d !== direction)
        .map(d => ({ direction: d, yaw: yawFor(direction, d, frameCount) })),
      mirror: [],
    }

  const result = await runJob('/rotate', {
    image: imageDataToBase64(inputFrame),
    size: frameSize,
    description,
    seed,
    from: direction,
    targets: plan.generate,
  }, { onProgress, signal })

  const frames = new Map([[direction, inputFrame]])

  for (const frame of result.frames) {
    const raw = await base64ToImageData(frame.image_b64)
    frames.set(frame.direction, finalizeFrame(raw, { size: frameSize, palette }))
  }

  // Mirroring happens after the finishing pass so a mirrored frame is a pixel
  // reflection of exactly what gets stored, not of an intermediate.
  for (const { direction: target, from } of plan.mirror) {
    const source = frames.get(from)
    if (source) frames.set(target, mirrorHorizontally(source))
  }

  const missing = order.filter(d => !frames.has(d))

  return {
    frames: order.filter(d => frames.has(d)).map(d => frames.get(d)),
    labels: order.filter(d => frames.has(d)).map(labelFor),
    notes: [
      ...(result.notes ?? []),
      ...(plan.mirror.length
        ? [`${plan.mirror.map(m => m.direction).join(', ')} mirrored from ${plan.mirror.map(m => m.from).join(', ')}.`]
        : []),
      ...(missing.length ? [`No frame produced for ${missing.join(', ')}.`] : []),
    ],
  }
}

function yawFor(input, target, frameCount) {
  const order = directionsFor(input, frameCount)
  const step = 360 / (frameCount === 8 ? 8 : 4)

  return (order.indexOf(target) * step) % 360
}
