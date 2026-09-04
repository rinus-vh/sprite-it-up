/**
 * Native frame sizes, in real pixels. A sprite is stored at exactly this size —
 * a 32 sprite is a 32x32 image — and only ever scaled up for display.
 *
 * These are the industry-standard tile/sprite dimensions: powers of two plus
 * the two half-steps (48, 96) that tile-based engines commonly use.
 */
export const FRAME_SIZES = [16, 32, 48, 64, 96, 128]

export const DEFAULT_FRAME_SIZE = 64

/**
 * The largest preset that does not exceed a sprite's own resolution.
 *
 * Upscaling pixel art invents pixels — a 40px sprite forced to 64 is resampled
 * at 1.6x and loses its grid — so an uploaded sprite picks the nearest preset
 * at or below its native size rather than the default.
 */
export function bestFrameSizeFor(nativeSize) {
  const fitting = FRAME_SIZES.filter(size => size <= nativeSize)

  return fitting.length ? Math.max(...fitting) : Math.min(...FRAME_SIZES)
}

/** Selectable frame counts for a generated animation. */
export const ANIMATION_FRAME_COUNTS = [4, 6, 8, 12, 16]

export const DEFAULT_ANIMATION_FRAME_COUNT = 8

/** Playback speeds offered in the preview, in frames per second. */
export const PLAYBACK_FPS_RANGE = { min: 1, max: 24, step: 1, default: 8 }

/** How many sprites an asset-set generation produces. */
export const ASSET_SET_COUNTS = [4, 6, 9, 12, 16]

export const DEFAULT_ASSET_SET_COUNT = 9
