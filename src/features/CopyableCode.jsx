import { Check, Copy } from 'lucide-react'
import { ActionIconButton } from '@6njp/prototype-library'

import styles from './CopyableCode.module.css'

/* design-system: candidate for buildingBlocks — three-ation has the same
   component locally, so a shared version would remove the duplication. */

/** @param {{ children: string, layoutClassName?: string }} props */
export function CopyableCode({ children, layoutClassName = undefined }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(
    () => {
      if (!copied) return
      const id = setTimeout(() => setCopied(false), 1500)

      return () => clearTimeout(id)
    },
    [copied],
  )

  function handleCopy() {
    navigator.clipboard.writeText(children)
    setCopied(true)
  }

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <code className={styles.code}>{children}</code>

      <ActionIconButton
        icon={copied ? Check : Copy}
        onClick={handleCopy}
        title='Copy to clipboard'
        size={20}
        style='transparent'
        layoutClassName={styles.copyButtonLayout}
      />
    </div>
  )
}
