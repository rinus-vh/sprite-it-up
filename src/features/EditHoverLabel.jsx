import styles from './EditHoverLabel.module.css'

/**
 * The flyout label an editor control reveals on hover.
 *
 * Deliberately not the shared Tooltip: that one is a click-dismissed one-shot
 * notice, which is the wrong interaction for a row of buttons you sweep across
 * while looking for one. This is CSS-only, so it works from the keyboard too.
 *
 * It reads `--opacity-label` rather than owning a hover rule, because the thing
 * being hovered is the button around it, not the label. Every host declares the
 * property and flips it — see Rule 5 in the CSS conventions — and positions the
 * label through `layoutClassName`, since where it should fly out depends on
 * whether the control sits in a rail or a bar.
 *
 * @param {{
 *   label: string,
 *   hint?: string,
 *   shortcut?: string,
 *   layoutClassName?: string,
 * }} props
 */
export function EditHoverLabel({ label, hint = undefined, shortcut = undefined, layoutClassName = undefined }) {
  return (
    <span aria-hidden className={cx(styles.component, layoutClassName)}>
      <span className={styles.name}>
        {label}

        {/* The key is on the label rather than only in a help screen: this is
            the moment you are looking at the control anyway. */}
        {Boolean(shortcut) && <kbd className={styles.key}>{shortcut}</kbd>}
      </span>

      {Boolean(hint) && <span className={styles.hint}>{hint}</span>}
    </span>
  )
}
