import { Eraser, Paintbrush, PaintBucket, Pencil, Pipette } from 'lucide-react'

/**
 * The editing tools, in rail order.
 *
 * `shape` and `hardness` describe which settings a tool has, so the options
 * button above the canvas can offer exactly those and nothing else — the way a
 * paint program's options bar changes with the tool in hand.
 *
 * `shortcut` follows Photoshop, so the keys are already in the fingers of
 * anyone who draws: B, E, P, and G for the fill. The colour picker takes C
 * rather than Photoshop's I, which reads as nothing here.
 *
 * The pen is deliberately square and always fully hard: it is the tool that
 * guarantees every pixel it touches is exactly the colour you picked, with no
 * partial alpha anywhere. Hardness on a square footprint would have to feather
 * corners differently from edges, which is meaningless at this scale.
 */
export const EDIT_TOOLS = [
  {
    value: 'pen',
    label: 'Pen',
    icon: Pencil,
    shortcut: 'p',
    shape: 'square',
    sized: true,
    hardness: false,
    paints: true,
    hint: 'Square, always hard',
  },
  {
    value: 'brush',
    label: 'Brush',
    icon: Paintbrush,
    shortcut: 'b',
    shape: 'round',
    sized: true,
    hardness: true,
    paints: true,
    hint: 'Round, feathers',
  },
  {
    value: 'eraser',
    label: 'Eraser',
    icon: Eraser,
    shortcut: 'e',
    shape: 'round',
    sized: true,
    hardness: true,
    paints: true,
    hint: 'Clears to transparent',
  },
  {
    value: 'bucket',
    label: 'Fill',
    icon: PaintBucket,
    shortcut: 'g',
    shape: null,
    sized: false,
    hardness: false,
    paints: true,
    hint: 'Fills the touching area',
  },
  {
    value: 'eyedropper',
    label: 'Colour picker',
    icon: Pipette,
    shortcut: 'c',
    shape: null,
    sized: false,
    hardness: false,
    paints: false,
    hint: 'Takes a colour from the sprite',
  },
]

export const DEFAULT_EDIT_TOOL = 'pen'

/**
 * Size and hardness are remembered per tool, not shared: a 1px pen and a 6px
 * soft brush is a normal pair to work with, and one size for both would mean
 * resetting it on every switch.
 */
export const DEFAULT_TOOL_SETTINGS = {
  pen: { size: 1, hardness: 1 },
  brush: { size: 3, hardness: 1 },
  eraser: { size: 3, hardness: 1 },
  bucket: { size: 1, hardness: 1 },
  eyedropper: { size: 1, hardness: 1 },
}

/** Frames top out at 128px, so a brush wider than this could never be aimed. */
export const BRUSH_SIZE_RANGE = { min: 1, max: 64, step: 1 }

/**
 * Scroll distance, in pixels, that resizes the brush by one.
 *
 * A thumb wheel spins freely and reports a stream of small deltas rather than
 * discrete notches, so the distance is accumulated and spent a step at a time.
 * Roughly one step per notch on a Logitech MX-style wheel, and a smooth ramp
 * when it is spun.
 */
export const BRUSH_WHEEL_STEP = 24

export const HARDNESS_RANGE = { min: 0, max: 100, step: 1 }

/**
 * Two colours, as in any paint program: the primary is what a normal stroke
 * paints, the secondary what the right mouse button paints, and `X` swaps them.
 * White on black rather than Photoshop's black on white — a sprite is drawn
 * against a transparent checkerboard on a dark canvas, so white is the more
 * useful default to have under the left button.
 */
export const DEFAULT_PRIMARY_COLOR = '#ffffff'

export const DEFAULT_SECONDARY_COLOR = '#000000'

/**
 * Zoom is in whole screen-pixels per sprite-pixel. Integer only: a fractional
 * zoom would put sprite pixels on half screen pixels and blur the grid.
 */
export const ZOOM_RANGE = { min: 1, max: 32, step: 1 }

/**
 * The pixel grid's shortcut, and how to write it.
 *
 * Photoshop's own key for showing a grid, which keeps it out of the way of the
 * single letters the tools use and of anything the browser wants.
 */
export const GRID_SHORTCUT = "'"

export const GRID_SHORTCUT_LABEL = "⌘'"

/** How many steps back the editor can go, per frame. */
export const HISTORY_LIMIT = 50
