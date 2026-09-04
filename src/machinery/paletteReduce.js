/**
 * Palette reduction by merging colours that are already nearly the same.
 *
 * Two properties matter for pixel art, and both rule out ordinary
 * quantisation:
 *
 *   • A merge always snaps to a colour the sprite already uses, never to the
 *     average of a cluster. Averaging invents shades that were never drawn,
 *     which is exactly what makes downscaled pixel art look muddy.
 *   • The merge order is computed once, as a sequence. Reducing to any count is
 *     then a matter of taking a prefix of that sequence, so dragging a slider
 *     re-derives instantly and — because every step is recorded rather than
 *     applied — dragging it back restores the original palette exactly.
 *
 * Colours are integers (0xRRGGBB) throughout: a per-pixel hex string would
 * dominate the cost of applying a reduction to a whole sheet.
 */

/**
 * Beyond this many distinct colours the pairwise search gets expensive, so the
 * tail is snapped onto the most-used colours first. A 128px frame can hold
 * 16384 distinct pixels; nothing that colourful is legible as a sprite anyway,
 * and the tail is single-pixel noise by definition.
 */
const PAIRWISE_LIMIT = 1024

/**
 * Perceptual-ish distance between two packed colours ("redmean").
 *
 * Plain RGB distance treats a green shift as equal to a blue one of the same
 * size, which it is not — merging by plain RGB visibly flattens greens while
 * leaving near-identical blues apart. This weighting costs two multiplications
 * and lands far closer to what the eye calls "nearly the same colour".
 */
function distance(a, b) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff
  const mean = (ar + br) / 2
  const dr = ar - br, dg = ag - bg, db = ab - bb

  return (((512 + mean) * dr * dr) / 256) + 4 * dg * dg + (((767 - mean) * db * db) / 256)
}

/**
 * The order in which colours should collapse into each other.
 *
 * Repeatedly merges the closest surviving pair, folding the rarer colour into
 * the commoner one so the sprite's dominant shades are the ones that survive.
 * Each step is recorded rather than applied.
 *
 * A nearest-neighbour cache keeps this near O(n²) overall instead of O(n³):
 * only the entries that were pointing at the pair just merged need rescanning.
 *
 * @param {Map<number, number>} counts  packed colour → pixel count
 * @returns {{ sequence: Array<{ from: number, into: number }>, total: number }}
 */
export function buildMergeSequence(counts) {
  const entries = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count, alive: true }))

  const sequence = []
  const total = entries.length
  if (total < 2) return { sequence, total }

  // Fold the rare tail onto the popular head before the pairwise pass, so the
  // search below never has to consider more than PAIRWISE_LIMIT colours.
  let active = entries
  if (total > PAIRWISE_LIMIT) {
    active = entries.slice(0, PAIRWISE_LIMIT)
    for (const entry of entries.slice(PAIRWISE_LIMIT)) {
      let best = active[0]
      let bestDistance = Infinity
      for (const candidate of active) {
        const d = distance(entry.color, candidate.color)
        if (d < bestDistance) { best = candidate; bestDistance = d }
      }
      sequence.push({ from: entry.color, into: best.color })
      best.count += entry.count
      entry.alive = false
    }
  }

  const nearest = new Array(active.length).fill(null)

  function rescan(i) {
    if (!active[i].alive) { nearest[i] = null; return }

    let bestJ = -1
    let bestDistance = Infinity
    for (let j = 0; j < active.length; j++) {
      if (j === i || !active[j].alive) continue
      const d = distance(active[i].color, active[j].color)
      if (d < bestDistance) { bestDistance = d; bestJ = j }
    }
    nearest[i] = bestJ === -1 ? null : { j: bestJ, d: bestDistance }
  }

  for (let i = 0; i < active.length; i++) rescan(i)

  let remaining = active.length
  while (remaining > 1) {
    let from = -1
    let bestDistance = Infinity
    for (let i = 0; i < active.length; i++) {
      const near = nearest[i]
      if (near && near.d < bestDistance) { bestDistance = near.d; from = i }
    }
    if (from === -1) break

    const into = nearest[from].j
    // The rarer of the pair is the one that disappears; ties keep the colour
    // that sorted first, which is the more-used one.
    const [loser, winner] = active[from].count <= active[into].count ? [from, into] : [into, from]

    sequence.push({ from: active[loser].color, into: active[winner].color })
    active[winner].count += active[loser].count
    active[loser].alive = false
    remaining--

    // Only the entries whose nearest neighbour just died are stale.
    for (let i = 0; i < active.length; i++) {
      if (i === loser) { nearest[i] = null; continue }
      if (i === winner || (nearest[i] && nearest[i].j === loser)) rescan(i)
    }
  }

  return { sequence, total }
}

/**
 * Flattens the first `mergeCount` steps of a sequence into a direct lookup.
 *
 * Merges chain — a folded into b, then b into c — so each source resolves all
 * the way to its final colour, and applying the result is one pass per pixel.
 *
 * @returns {Map<number, number>} packed colour → packed replacement
 */
export function reductionLookup(sequence, mergeCount) {
  const steps = Math.max(0, Math.min(mergeCount, sequence.length))
  const direct = new Map()
  for (let i = 0; i < steps; i++) direct.set(sequence[i].from, sequence[i].into)

  const flat = new Map()
  for (const from of direct.keys()) {
    // Acyclic by construction: a merged colour is never a merge target again.
    let to = from
    while (direct.has(to)) to = direct.get(to)
    if (to !== from) flat.set(from, to)
  }

  return flat
}

/** Rewrites every pixel whose colour the lookup replaces. */
export function applyReduction(imageData, lookup) {
  if (!lookup.size) return imageData

  const out = new ImageData(imageData.width, imageData.height)
  out.data.set(imageData.data)

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 128) continue

    const key = (out.data[i] << 16) | (out.data[i + 1] << 8) | out.data[i + 2]
    const next = lookup.get(key)
    if (next === undefined) continue

    out.data[i] = (next >> 16) & 0xff
    out.data[i + 1] = (next >> 8) & 0xff
    out.data[i + 2] = next & 0xff
  }

  return out
}
