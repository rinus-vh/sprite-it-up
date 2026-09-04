/**
 * The eight sprite facings, ordered clockwise starting at South — the
 * conventional first row of a directional sprite sheet.
 *
 * `angle` is the yaw in degrees the generator is asked for, measured clockwise
 * from South (the camera-facing pose). South is the identity rotation because
 * a hand-drawn input sprite is almost always drawn facing the viewer.
 */
export const DIRECTIONS = [
  { value: 'S',  label: 'South',      short: 'S',  angle: 0   },
  { value: 'SW', label: 'South-west', short: 'SW', angle: 45  },
  { value: 'W',  label: 'West',       short: 'W',  angle: 90  },
  { value: 'NW', label: 'North-west', short: 'NW', angle: 135 },
  { value: 'N',  label: 'North',      short: 'N',  angle: 180 },
  { value: 'NE', label: 'North-east', short: 'NE', angle: 225 },
  { value: 'E',  label: 'East',       short: 'E',  angle: 270 },
  { value: 'SE', label: 'South-east', short: 'SE', angle: 315 },
]

/** Cardinal facings, clockwise from South. */
export const CARDINAL_DIRECTIONS = ['S', 'W', 'N', 'E']

/** Diagonal facings, clockwise from South-west. */
export const DIAGONAL_DIRECTIONS = ['SW', 'NW', 'NE', 'SE']

/** Selectable frame counts for a rotation set. */
export const ROTATION_FRAME_COUNTS = [4, 8]

export const DIRECTION_LOOKUP = Object.fromEntries(DIRECTIONS.map(d => [d.value, d]))
