/**
 * How an export can be shaped, in the order the panel offers them.
 *
 * The hints say what each produces rather than what it is for — the exact
 * dimensions come from the plan, but which frames end up in the file is the
 * thing worth naming before you click.
 */
export const EXPORT_SCOPE_OPTIONS = {
  frame: {
    label: 'Single frame',
    hint: 'The sprite selected below, on its own',
  },
  rows: {
    label: 'Animation sheet',
    hint: 'One row per animation, one column per frame',
  },
  set: {
    label: 'Asset set sheet',
    hint: 'Every sprite in one square sheet',
  },
}

export const DEFAULT_EXPORT_SCOPE = 'rows'
