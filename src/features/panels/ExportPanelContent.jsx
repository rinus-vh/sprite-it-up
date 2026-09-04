import {
  PanelContainer, PanelContainerDivider, PanelContainerSettingsSectionHeader, ParagraphSm,
} from '@6njp/prototype-library'

import { ExportActions } from '@/features/export/ExportActions.jsx'
import { ExportFramePicker } from '@/features/export/ExportFramePicker.jsx'
import { ExportScopePicker } from '@/features/export/ExportScopePicker.jsx'

import { DEFAULT_EXPORT_SCOPE } from '@/constants/exportScopes.js'
import { useSpriteContext } from '@/contexts/SpriteContext.jsx'
import { availableScopes, exportPlan } from '@/machinery/exportPlan.js'
import { projectSlug } from '@/machinery/exportNames.js'
import { resolveSpriteRef } from '@/machinery/spriteRef.js'

/**
 * Choose what to export, then export it.
 *
 * Three shapes, because a sprite project has three genuinely different things
 * worth writing to disk: one frame, an animation sheet laid out a row per
 * animation, or the whole set packed square. The panel decides nothing about
 * how files are built — it picks a scope, and machinery/exportPlan turns the
 * project into a plan that machinery/exportFiles writes.
 */
export function ExportPanelContent() {
  const {
    mode, result, inputFrame, isInputEdited, source, description, activeSprite, selectSprite,
  } = useSpriteContext()

  const [chosenScope, setChosenScope] = React.useState(DEFAULT_EXPORT_SCOPE)

  const outputFrames = result?.frames ?? []
  const labels = result?.labels ?? []
  // The input is not a single sprite while an asset set is being made, so it is
  // not something to export on its own either.
  const allowInput = mode !== 'assetSet'
  const selected = resolveSpriteRef({
    ref: activeSprite, inputFrame, outputFrames, labels, allowInput,
  })

  const scopes = availableScopes({
    mode,
    hasFrame: Boolean(selected.frame),
    hasResult: outputFrames.length > 0,
  })

  if (!scopes.length) return <ExportPanelContentEmpty />

  // Derived rather than corrected in state: changing mode or clearing a result
  // can take the chosen scope away, and falling back beats offering a scope
  // that cannot be built.
  const scope = scopes.includes(chosenScope) ? chosenScope : scopes[0]

  const plan = exportPlan({
    scope,
    mode,
    result,
    frame: selected.frame,
    frameLabel: selected.label,
    name: description,
    slug: projectSlug({ description, sourceName: source?.name }),
  })

  return (
    <PanelContainer>
      <PanelContainerSettingsSectionHeader title='What to export' />

      <ExportScopePicker value={scope} onChange={setChosenScope} {...{ scopes }} />

      {scope === 'frame' && (
        <ExportFramePicker
          onSelect={selectSprite}
          inputFrame={allowInput ? inputFrame : null}
          inputName={source?.name ?? 'Input sprite'}
          frames={outputFrames}
          {...{ activeSprite, isInputEdited, labels }}
        />
      )}

      <PanelContainerDivider />

      {plan ? <ExportActions {...{ plan }} /> : <ParagraphSm>Nothing to export in this shape yet.</ParagraphSm>}
    </PanelContainer>
  )
}

function ExportPanelContentEmpty() {
  return (
    <PanelContainer>
      <ParagraphSm>
        Upload a sprite or generate a set, then export a single frame, an
        animation sheet, or the whole set.
      </ParagraphSm>
    </PanelContainer>
  )
}
