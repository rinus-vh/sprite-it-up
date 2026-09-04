import { imageDataToBlob } from './pixelImage.js'

/**
 * Sheets are always square. `columns` is the smallest grid that fits the
 * frames, so 4 frames tile 2x2 and 8 frames tile 3x3 with one empty cell —
 * tighter than padding out to 4x4, and every engine can read a square sheet.
 */
export function sheetLayout(frameCount, frameSize) {
  const columns = Math.ceil(Math.sqrt(frameCount))
  const dimension = columns * frameSize

  return { columns, rows: columns, dimension }
}

/**
 * Tiles native-resolution frames into one square sheet, left to right, top to
 * bottom. The sheet is itself native resolution — no scaling anywhere.
 *
 * @param {ImageData[]} frames  all the same size
 * @param {number} frameSize
 */
export function packSheet(frames, frameSize) {
  const { columns, dimension } = sheetLayout(frames.length, frameSize)
  const sheet = new ImageData(dimension, dimension)

  frames.forEach((frame, index) => {
    const originX = (index % columns) * frameSize
    const originY = Math.floor(index / columns) * frameSize

    for (let y = 0; y < frameSize; y++) {
      for (let x = 0; x < frameSize; x++) {
        const src = (y * frame.width + x) * 4
        const dst = ((originY + y) * dimension + originX + x) * 4
        sheet.data[dst] = frame.data[src]
        sheet.data[dst + 1] = frame.data[src + 1]
        sheet.data[dst + 2] = frame.data[src + 2]
        sheet.data[dst + 3] = frame.data[src + 3]
      }
    }
  })

  return sheet
}

export function sheetToBlob(frames, frameSize) {
  return imageDataToBlob(packSheet(frames, frameSize))
}

/** Metadata engines need to read the sheet back — written next to the PNG. */
export function sheetManifest({ frames, frameSize, mode, labels, loop = false }) {
  const { columns, rows, dimension } = sheetLayout(frames.length, frameSize)

  return {
    mode,
    frameSize,
    frameCount: frames.length,
    columns,
    rows,
    sheetSize: dimension,
    loop,
    frames: labels.map((label, index) => ({
      index,
      label,
      x: (index % columns) * frameSize,
      y: Math.floor(index / columns) * frameSize,
    })),
  }
}

/**
 * Row layout: one animation per row, one frame per column.
 *
 * The other honest way to pack a sheet, and the one an engine reads when it has
 * to find "the third frame of walking north": the row picks the animation, the
 * column picks the frame. Rows are as wide as the longest animation, so a
 * shorter one leaves empty cells rather than shifting the grid out of step.
 *
 * @param {Array<{ frames: ImageData[] }>} rows
 * @param {number} frameSize
 */
export function rowsLayout(rows, frameSize) {
  const columns = Math.max(1, ...rows.map(row => row.frames.length))

  return {
    columns,
    rows: Math.max(1, rows.length),
    width: columns * frameSize,
    height: Math.max(1, rows.length) * frameSize,
  }
}

/** Tiles rows of native-resolution frames into one sheet. No scaling anywhere. */
export function packRows(rows, frameSize) {
  const { width, height } = rowsLayout(rows, frameSize)
  const sheet = new ImageData(width, height)

  rows.forEach((row, rowIndex) => {
    row.frames.forEach((frame, columnIndex) => {
      blit(sheet, frame, columnIndex * frameSize, rowIndex * frameSize, frameSize)
    })
  })

  return sheet
}

export function rowsToBlob(rows, frameSize) {
  return imageDataToBlob(packRows(rows, frameSize))
}

function blit(sheet, frame, originX, originY, frameSize) {
  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      const src = (y * frame.width + x) * 4
      const dst = ((originY + y) * sheet.width + originX + x) * 4
      sheet.data[dst] = frame.data[src]
      sheet.data[dst + 1] = frame.data[src + 1]
      sheet.data[dst + 2] = frame.data[src + 2]
      sheet.data[dst + 3] = frame.data[src + 3]
    }
  }
}
