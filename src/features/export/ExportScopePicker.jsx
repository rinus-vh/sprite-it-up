import { LabelUppercaseXs, RadioGroup } from '@6njp/prototype-library'

import { EXPORT_SCOPE_OPTIONS } from '@/constants/exportScopes.js'

import styles from './ExportScopePicker.module.css'

/**
 * What shape the export takes.
 *
 * Only the scopes the project can actually produce are offered — an asset set
 * has no row layout, and there is nothing to pack before anything is
 * generated — so the choice never presents an option that would fail.
 *
 * @param {{
 *   value: string,
 *   scopes: string[],
 *   onChange: (scope: string) => void,
 *   layoutClassName?: string,
 * }} props
 */
export function ExportScopePicker({ value, scopes, onChange, layoutClassName = undefined }) {
  const options = scopes.map(scope => ({ value: scope, label: EXPORT_SCOPE_OPTIONS[scope].label }))

  return (
    <div className={cx(styles.component, layoutClassName)}>
      <RadioGroup name='export-scope' {...{ value, options, onChange }} />

      <span className={styles.hint}>
        <LabelUppercaseXs>{EXPORT_SCOPE_OPTIONS[value]?.hint ?? ''}</LabelUppercaseXs>
      </span>
    </div>
  )
}
