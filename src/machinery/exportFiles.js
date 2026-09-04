import { imageDataToBlob } from './pixelImage.js'
import { frameFileName } from './exportNames.js'
import { packRows, packSheet } from './spriteSheet.js'
import { createZip } from './zip.js'

/** Turning an export plan into the files that leave the app. */

/** The plan as a single PNG: the frame itself, or the sheet it describes. */
export function planToBlob(plan) {
  if (plan.scope === 'frame') return imageDataToBlob(plan.frames[0])
  if (plan.scope === 'rows') return imageDataToBlob(packRows(plan.rows, plan.frameSize))

  return imageDataToBlob(packSheet(plan.frames, plan.frameSize))
}

/**
 * What an engine needs to read the sheet back.
 *
 * Frame positions are computed from the same layout the image was packed with,
 * and a row-shaped plan also lists its animations — the row index and frame
 * count is what a runtime needs to play "walk north" without hard-coding
 * offsets.
 */
export function planManifest(plan) {
  const { columns, rows, width, height } = plan.layout

  return {
    mode: plan.mode,
    scope: plan.scope,
    frameSize: plan.frameSize,
    frameCount: plan.frames.length,
    columns,
    rows,
    sheetWidth: width,
    sheetHeight: height,
    loop: plan.loop,
    ...(plan.rows
      ? {
        animations: plan.rows.map((row, index) => ({
          label: row.label,
          row: index,
          frameCount: row.frames.length,
        })),
      }
      : {}),
    frames: plan.frames.map((_, index) => ({
      index,
      label: plan.labels[index] ?? `Frame ${index + 1}`,
      ...framePosition(plan, index),
    })),
  }
}

/** Every frame as its own PNG, with the manifest alongside. */
export async function planToFramesZip(plan) {
  const files = await Promise.all(plan.frames.map(async (frame, index) => ({
    name: frameFileName({ slug: plan.baseName, index, label: plan.labels[index] }),
    data: new Uint8Array(await (await imageDataToBlob(frame)).arrayBuffer()),
  })))

  files.push({
    name: 'manifest.json',
    data: new TextEncoder().encode(JSON.stringify(planManifest(plan), null, 2)),
  })

  return createZip(files)
}

function framePosition(plan, index) {
  if (plan.rows === null) {
    return {
      x: (index % plan.layout.columns) * plan.frameSize,
      y: Math.floor(index / plan.layout.columns) * plan.frameSize,
    }
  }

  // Row-shaped sheets are ragged: a short animation leaves empty cells, so a
  // frame's cell cannot be derived from its index alone.
  let seen = 0
  for (let row = 0; row < plan.rows.length; row++) {
    const length = plan.rows[row].frames.length
    if (index < seen + length) {
      return { x: (index - seen) * plan.frameSize, y: row * plan.frameSize }
    }
    seen += length
  }

  return { x: 0, y: 0 }
}
