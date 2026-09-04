/**
 * Native-resolution pixel machinery.
 *
 * The rule this file enforces: a sprite is stored at exactly its pixel grid
 * size. Nothing here ever produces an upscaled bitmap — upscaling happens at
 * display time only, with nearest-neighbour, so it stays perfectly sharp and
 * the stored file stays tiny (a 32x32 sprite is roughly a kilobyte).
 */

/** Reads a File/Blob into full-resolution ImageData. */
export async function loadImageData(file) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export function imageDataToCanvas(imageData) {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)

  return canvas
}

export function imageDataToDataUrl(imageData) {
  return imageDataToCanvas(imageData).toDataURL('image/png')
}

/** Strips the `data:image/png;base64,` prefix — what the server wants. */
export function imageDataToBase64(imageData) {
  return imageDataToDataUrl(imageData).split(',')[1]
}

export async function base64ToImageData(base64) {
  const res = await fetch(`data:image/png;base64,${base64}`)

  return loadImageData(await res.blob())
}

export function imageDataToBlob(imageData) {
  return new Promise(resolve => imageDataToCanvas(imageData).toBlob(resolve, 'image/png'))
}

/**
 * Detects the pixel size of an already-upscaled sprite.
 *
 * A 32x32 sprite exported at 512x512 has 16x16 blocks of identical pixels. If
 * we can prove such a block structure exists we know the true native size, and
 * can recover it losslessly instead of guessing. Returns 1 when the image is
 * already at native resolution (or is not blocky at all).
 */
export function detectNativeScale(imageData) {
  const { width, height } = imageData
  const limit = Math.min(width, height)

  for (let scale = Math.floor(limit / 2); scale >= 2; scale--) {
    if (width % scale !== 0 || height % scale !== 0) continue
    if (isUniformInBlocks(imageData, scale)) return scale
  }

  return 1
}

function isUniformInBlocks(imageData, scale) {
  const { width, height, data } = imageData

  for (let by = 0; by < height; by += scale) {
    for (let bx = 0; bx < width; bx += scale) {
      const base = (by * width + bx) * 4
      for (let y = by; y < by + scale; y++) {
        for (let x = bx; x < bx + scale; x++) {
          const i = (y * width + x) * 4
          if (
            data[i] !== data[base] ||
            data[i + 1] !== data[base + 1] ||
            data[i + 2] !== data[base + 2] ||
            data[i + 3] !== data[base + 3]
          ) return false
        }
      }
    }
  }

  return true
}

/**
 * Downscales to `size` x `size` native pixels by picking the dominant colour of
 * each source cell rather than averaging it. Averaging is what makes downscaled
 * pixel art muddy: it invents colours that were never in the sprite. Taking the
 * modal colour keeps the palette intact and the edges hard.
 *
 * A cell is transparent when most of its source pixels are.
 */
export function downscaleToNative(imageData, size) {
  const { width, height, data } = imageData
  const out = new ImageData(size, size)

  // Letterbox non-square input so the sprite keeps its aspect ratio.
  const span = Math.max(width, height)
  const offsetX = Math.floor((span - width) / 2)
  const offsetY = Math.floor((span - height) / 2)
  const cell = span / size

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const counts = new Map()
      let opaque = 0
      let total = 0

      const x0 = Math.floor(x * cell) - offsetX
      const y0 = Math.floor(y * cell) - offsetY
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * cell) - offsetX)
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * cell) - offsetY)

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) { total++; continue }
          const i = (sy * width + sx) * 4
          total++
          if (data[i + 3] < 128) continue
          opaque++
          const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }

      const o = (y * size + x) * 4
      if (opaque * 2 <= total || counts.size === 0) continue

      let best = 0
      let bestCount = -1
      for (const [key, count] of counts) {
        if (count > bestCount) { best = key; bestCount = count }
      }

      out.data[o] = (best >> 16) & 0xff
      out.data[o + 1] = (best >> 8) & 0xff
      out.data[o + 2] = best & 0xff
      out.data[o + 3] = 255
    }
  }

  return out
}

/**
 * Brings any image to native resolution: recovers the true grid of an upscaled
 * sprite when it can, otherwise resamples. Use this on every uploaded file and
 * on every generated frame before it is stored.
 */
export function toNativeResolution(imageData, size) {
  if (imageData.width === size && imageData.height === size) return imageData

  const scale = detectNativeScale(imageData)
  if (scale > 1 && imageData.width / scale === size && imageData.height / scale === size) {
    return nearestDownscale(imageData, scale)
  }

  return downscaleToNative(imageData, size)
}

/** Lossless integer downscale — one source pixel per block, no resampling. */
function nearestDownscale(imageData, scale) {
  const width = imageData.width / scale
  const height = imageData.height / scale
  const out = new ImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = ((y * scale) * imageData.width + x * scale) * 4
      const dst = (y * width + x) * 4
      out.data[dst] = imageData.data[src]
      out.data[dst + 1] = imageData.data[src + 1]
      out.data[dst + 2] = imageData.data[src + 2]
      out.data[dst + 3] = imageData.data[src + 3]
    }
  }

  return out
}

/**
 * The distinct opaque colours in an image, most-used first.
 * `maxColors` caps the result so an anti-aliased input can still yield a
 * workable palette to lock generated frames against.
 */
export function extractPalette(imageData, { maxColors = 64 } = {}) {
  const counts = new Map()
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([key]) => [(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff])
}

/**
 * Snaps every pixel to the nearest palette entry.
 *
 * This is what keeps a generated rotation set looking like one sprite: the
 * model will happily shift hues a few degrees between frames, and locking to
 * the input's own palette removes that drift entirely.
 */
export function lockToPalette(imageData, palette) {
  if (!palette.length) return imageData

  const out = new ImageData(imageData.width, imageData.height)
  out.data.set(imageData.data)
  const cache = new Map()

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) {
      out.data[i + 3] = 0
      continue
    }
    out.data[i + 3] = 255

    const key = (out.data[i] << 16) | (out.data[i + 1] << 8) | out.data[i + 2]
    let snapped = cache.get(key)
    if (snapped === undefined) {
      snapped = nearestInPalette(out.data[i], out.data[i + 1], out.data[i + 2], palette)
      cache.set(key, snapped)
    }

    out.data[i] = snapped[0]
    out.data[i + 1] = snapped[1]
    out.data[i + 2] = snapped[2]
  }

  return out
}

function nearestInPalette(r, g, b, palette) {
  let best = palette[0]
  let bestDistance = Infinity

  for (const entry of palette) {
    const dr = r - entry[0]
    const dg = g - entry[1]
    const db = b - entry[2]
    const distance = dr * dr + dg * dg + db * db
    if (distance < bestDistance) { best = entry; bestDistance = distance }
  }

  return best
}

export function toHex([r, g, b]) {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
