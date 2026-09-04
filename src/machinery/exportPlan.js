import { animationRows, hasAnimationRows } from './animationRows.js'
import { rowsLayout, sheetLayout } from './spriteSheet.js'
import { toSlug } from './exportNames.js'

/**
 * What an export would contain, as plain data.
 *
 * Deciding *what* is exported is kept apart from writing the files: this module
 * answers "which frames, in what arrangement, under what name", and exportFiles
 * turns that into a PNG or a zip. Splitting them is what lets the panel show an
 * accurate summary — the dimensions on screen come from the same plan the
 * download is built from, so they cannot disagree.
 */

export const EXPORT_SCOPES = ['frame', 'rows', 'set']

/**
 * Which scopes the project can currently offer.
 *
 * An asset set has no row layout — its sprites are unrelated — and there is
 * nothing to pack until something has been generated.
 */
export function availableScopes({ mode, hasFrame, hasResult }) {
  return EXPORT_SCOPES.filter(scope => {
    if (scope === 'frame') return hasFrame
    if (scope === 'rows') return hasResult && hasAnimationRows(mode)

    return hasResult
  })
}

/**
 * @param {{
 *   scope: 'frame' | 'rows' | 'set',
 *   mode: string,
 *   slug: string,
 *   result?: { frames: ImageData[], labels: string[], frameSize: number, loop?: boolean } | null,
 *   frame?: ImageData | null,
 *   frameLabel?: string,
 *   name?: string,
 * }} options
 * @returns {object | null} the plan, or null when the scope cannot be built
 */
export function exportPlan({ scope, mode, slug, result = null, frame = null, frameLabel = '', name = undefined }) {
  if (scope === 'frame') return frame ? framePlan({ frame, frameLabel, slug, mode }) : null
  if (!result?.frames?.length) return null
  if (scope === 'rows') return hasAnimationRows(mode) ? rowsPlan({ result, mode, slug, name }) : null

  return setPlan({ result, mode, slug })
}

function framePlan({ frame, frameLabel, slug, mode }) {
  const frameSize = frame.width

  return {
    scope: 'frame',
    mode,
    frameSize,
    frames: [frame],
    labels: [frameLabel || 'Frame'],
    rows: null,
    loop: false,
    layout: { columns: 1, rows: 1, width: frame.width, height: frame.height },
    baseName: `${slug}-${toSlug(frameLabel) || 'frame'}`,
    summary: `${frame.width} × ${frame.height} PNG · one frame`,
  }
}

function rowsPlan({ result, mode, slug, name }) {
  const rows = animationRows({ mode, frames: result.frames, labels: result.labels, name })
  const layout = rowsLayout(rows, result.frameSize)

  return {
    scope: 'rows',
    mode,
    frameSize: result.frameSize,
    // Flattened in row order, so a frame's index in the manifest matches the
    // order it is written into the sheet.
    frames: rows.flatMap(row => row.frames),
    labels: rows.flatMap(row => row.frames.map((_, index) => (
      row.frames.length > 1 ? `${row.label} ${index + 1}` : row.label
    ))),
    rows,
    loop: result.loop ?? false,
    layout,
    baseName: `${slug}-sheet-${layout.columns}x${layout.rows}`,
    summary: `${layout.width} × ${layout.height} PNG · ${layout.rows} row${layout.rows === 1 ? '' : 's'}`
      + ` × ${layout.columns} frame${layout.columns === 1 ? '' : 's'}`,
  }
}

function setPlan({ result, mode, slug }) {
  const { columns, rows, dimension } = sheetLayout(result.frames.length, result.frameSize)

  return {
    scope: 'set',
    mode,
    frameSize: result.frameSize,
    frames: result.frames,
    labels: result.labels ?? [],
    rows: null,
    loop: result.loop ?? false,
    layout: { columns, rows, width: dimension, height: dimension },
    baseName: `${slug}-sheet-${dimension}`,
    summary: `${dimension} × ${dimension} PNG · ${result.frames.length} sprites, square packed`,
  }
}
