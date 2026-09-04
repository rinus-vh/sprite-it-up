/**
 * Background removal for sprites saved without an alpha channel.
 *
 * Plenty of pixel art arrives as opaque PNG or JPEG on a flat backdrop. Left
 * alone, that backdrop becomes part of the sprite: it ends up in the palette,
 * in every generated frame, and in the exported sheet as a solid box behind
 * the character.
 *
 * A flood fill inward from the border removes it without touching pixels of
 * the same colour *inside* the sprite — a white eye highlight survives a white
 * background, which a plain colour-match pass would erase.
 */

/** True when no pixel in the image is even partially transparent. */
export function isFullyOpaque(imageData) {
  const { data } = imageData

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return false
  }

  return true
}

/**
 * The dominant colour among the border pixels, with the share of the border it
 * covers. A low share means the sprite runs to the edges and there is probably
 * no backdrop to remove.
 */
export function detectBackgroundColour(imageData) {
  const { width, height, data } = imageData
  const counts = new Map()
  let total = 0

  const sample = (x, y) => {
    const i = (y * width + x) * 4
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    counts.set(key, (counts.get(key) ?? 0) + 1)
    total++
  }

  for (let x = 0; x < width; x++) { sample(x, 0); sample(x, height - 1) }
  for (let y = 1; y < height - 1; y++) { sample(0, y); sample(width - 1, y) }

  let best = 0
  let bestCount = 0
  for (const [key, count] of counts) {
    if (count > bestCount) { best = key; bestCount = count }
  }

  return {
    colour: [(best >> 16) & 0xff, (best >> 8) & 0xff, best & 0xff],
    share: total ? bestCount / total : 0,
  }
}

/**
 * Flood-fills the background colour inward from the border and makes it
 * transparent. Returns the image unchanged when the border isn't dominated by
 * a single colour, so a full-bleed sprite is never eaten into.
 *
 * @param {ImageData} imageData
 * @param {{ tolerance?: number, minimumShare?: number }} [options]
 *   tolerance    — squared RGB distance still counted as background
 *   minimumShare — how much of the border the colour must cover to act at all
 */
export function dropFlatBackground(imageData, { tolerance = 900, minimumShare = 0.7 } = {}) {
  const { colour, share } = detectBackgroundColour(imageData)
  if (share < minimumShare) return imageData

  const { width, height } = imageData
  const out = new ImageData(width, height)
  out.data.set(imageData.data)

  const matches = (index) => {
    const dr = out.data[index] - colour[0]
    const dg = out.data[index + 1] - colour[1]
    const db = out.data[index + 2] - colour[2]

    return dr * dr + dg * dg + db * db <= tolerance
  }

  // Iterative flood fill — a recursive one blows the stack on a 128px sprite.
  const stack = []
  const seen = new Uint8Array(width * height)

  for (let x = 0; x < width; x++) { stack.push(x, x + (height - 1) * width) }
  for (let y = 0; y < height; y++) { stack.push(y * width, y * width + width - 1) }

  while (stack.length) {
    const position = stack.pop()
    if (seen[position]) continue
    seen[position] = 1

    const index = position * 4
    if (out.data[index + 3] === 0) continue
    if (!matches(index)) continue

    out.data[index + 3] = 0

    const x = position % width
    const y = (position - x) / width
    if (x > 0) stack.push(position - 1)
    if (x < width - 1) stack.push(position + 1)
    if (y > 0) stack.push(position - width)
    if (y < height - 1) stack.push(position + width)
  }

  return out
}
