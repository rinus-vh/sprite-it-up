import { Icon } from '@6njp/prototype-library'

import { EditHoverLabel } from '@/features/EditHoverLabel.jsx'

import styles from './EditIconButton.module.css'

/**
 * An icon button whose name lives in its hover label.
 *
 * The shared ActionIconButton derives its `aria-label` from `title`, so a
 * control with a flyout label would have to carry a native tooltip saying the
 * same thing twice. This puts the name on `aria-label` alone: screen readers
 * still announce it, and the only thing that appears on hover is the label.
 *
 * @param {{
 *   icon: import('lucide-react').LucideIcon,
 *   label: string,
 *   onClick: () => void,
 *   hint?: string,
 *   shortcut?: string,
 *   isActive?: boolean,
 *   layoutClassName?: string,
 * }} props
 */
export function EditIconButton({
  icon,
  label,
  onClick,
  hint = undefined,
  shortcut = undefined,
  isActive = false,
  layoutClassName = undefined,
}) {
  return (
    <span className={cx(styles.component, layoutClassName)}>
      <button
        type='button'
        aria-pressed={isActive}
        aria-label={label}
        className={cx(styles.button, isActive && styles.isActive)}
        {...{ onClick }}
      >
        <Icon layoutClassName={styles.iconLayout} {...{ icon }} />
      </button>

      <EditHoverLabel layoutClassName={styles.labelLayout} {...{ label, hint, shortcut }} />
    </span>
  )
}
