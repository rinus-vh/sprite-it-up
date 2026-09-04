/** Naming exported files, so a download tells you what it holds. */

const FALLBACK = 'sprite'

export function toSlug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || FALLBACK
}

/** The name a project's exports are built from — its description, or its file. */
export function projectSlug({ description, sourceName }) {
  return toSlug(description || sourceName || FALLBACK)
}

/** `knight-03-north.png` — ordered first so a folder of frames sorts correctly. */
export function frameFileName({ slug, index, label }) {
  const number = String(index + 1).padStart(2, '0')
  const suffix = label ? `-${toSlug(label)}` : ''

  return `${slug}-${number}${suffix}.png`
}
