/**
 * Converting between the forms a colour takes in this app.
 *
 * Three of them, each earning its place: a `#rrggbb` string is what the
 * interface and the colour picker speak, an `[r, g, b]` tuple is what per-pixel
 * work needs, and a packed `0xRRGGBB` integer is what counting and comparing
 * thousands of colours needs (see palette.js and paletteReduce.js).
 */

import { inBounds } from './imageData.js'

/** `#rrggbb` (or `#rrggbbaa`, alpha ignored) → `[r, g, b]`. */
export function hexToRgb(hex) {
  const clean = (hex.startsWith('#') ? hex.slice(1) : hex).slice(0, 6).padEnd(6, '0')

  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ]
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}

export function packRgb([r, g, b]) {
  return (r << 16) | (g << 8) | b
}

export function unpackRgb(packed) {
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff]
}

export function packedToHex(packed) {
  return rgbToHex(unpackRgb(packed))
}

/**
 * The colour at a pixel, or null when that pixel is transparent.
 *
 * Half alpha is the line between a pixel that counts and one that does not,
 * used the same way everywhere: a sprite's colours are the ones you can see.
 */
export function colorAt(imageData, x, y) {
  if (!inBounds(imageData, x, y)) return null

  const i = (y * imageData.width + x) * 4
  if (imageData.data[i + 3] < 128) return null

  return rgbToHex([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]])
}
