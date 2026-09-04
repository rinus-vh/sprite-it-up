import { AlertTriangle, ScrollText, Sparkles, X } from 'lucide-react'
import {
  Button, CheckboxBar, Checkbox, Dropdown, GhostButton, LabelUppercaseXs, Loader,
  PanelContainer, PanelContainerDivider, PanelContainerSettingsRow, ParagraphSm, Tag, TextInput,
} from '@6njp/prototype-library'

import { CopyableCode } from '@/features/CopyableCode.jsx'
import { DirectionDial } from '@/features/DirectionDial.jsx'

import { ROTATION_FRAME_COUNTS } from '@/constants/directions.js'
import { ASSET_SET_COUNTS } from '@/constants/spriteSizes.js'
import { MODES } from '@/constants/modes.js'
import { useServerContext } from '@/contexts/ServerContext.jsx'
import { useSpriteContext } from '@/contexts/SpriteContext.jsx'
import { directionsFor, labelFor, rotationPlan } from '@/machinery/directions.js'

import styles from './GeneratePanelContent.module.css'

const toOptions = values => values.map(value => ({ value: String(value), label: String(value) }))

export function GeneratePanelContent() {
  const { mode, setMode, generating, progress, error, generate, cancel, canGenerate } = useSpriteContext()
  const { available, engine, model, openSetup, openLog } = useServerContext()
  const { references, source } = useSpriteContext()

  const blockedReason = available === false
    ? 'Start the local server first.'
    : blockingRequirement({ mode, canGenerate, references, source })

  return (
    <PanelContainer>
      <CheckboxBar
        options={MODES}
        value={mode}
        onChange={setMode}
      />

      <PanelContainerDivider />

      {mode === 'rotate' && <RotateSettings />}
      {mode === 'animate' && <AnimateSettings />}
      {mode === 'assetSet' && <AssetSetSettings />}

      <PanelContainerDivider />

      <ServerStatus
        onOpenSetup={openSetup}
        onOpenServerLog={openLog}
        {...{ available, engine }}
      />

      {available && model && !model.ready && <ModelDownloadNotice {...{ model }} />}

      {generating
        ? (
          <div className={styles.progress}>
            <Loader size={20} />

            <span className={styles.progressLabel}>
              <LabelUppercaseXs>
                {`${progress?.label ?? 'Generating…'} ${Math.round(progress?.percent ?? 0)}%`}
              </LabelUppercaseXs>
            </span>

            <GhostButton
              label='Cancel'
              icon={X}
              color='white'
              onClick={cancel}
            />
          </div>
        )
        : (
          <GeneratePanelContentAction
            blocked={blockedReason}
            onGenerate={generate}
          />
        )}

      {Boolean(error) && (
        <div className={styles.error}>
          <AlertTriangle size={16} />
          <ParagraphSm>{error}</ParagraphSm>
        </div>
      )}
    </PanelContainer>
  )
}

/**
 * Warns that the first generation triggers a multi-gigabyte download.
 *
 * Without this the app looked broken: the job sits at a low percentage for as
 * long as the download takes — hours on a slow connection — with nothing to
 * distinguish that from a hang. Fetching the weights deliberately, in a
 * terminal with a real transfer rate, is the better first run.
 */
function ModelDownloadNotice({ model }) {
  const cached = model.cachedBytes / 1024 ** 3
  const expected = model.expectedBytes / 1024 ** 3

  return (
    <div className={styles.componentModelDownloadNotice}>
      <ParagraphSm>
        {`The model weights aren’t downloaded yet — about ${expected.toFixed(1)} GB, `
          + `${cached.toFixed(2)} GB cached so far. Generating now starts that download `
          + 'and waits for it. Better to fetch it first, where you can see the transfer rate:'}
      </ParagraphSm>

      <CopyableCode>python3 server/fetch_model.py</CopyableCode>
    </div>
  )
}

/**
 * The library's Button has no disabled state, so an unavailable action is shown
 * as an outline button with the reason spelled out underneath rather than a
 * dead-looking solid one.
 */
function GeneratePanelContentAction({ blocked, onGenerate }) {
  return (
    <div className={styles.componentAction}>
      <Button
        label='Generate'
        variant={blocked ? 'outline' : 'solid'}
        icon={Sparkles}
        onClick={blocked ? noop : onGenerate}
      />

      {Boolean(blocked) && (
        <span className={styles.blockedReason}>
          <LabelUppercaseXs>{blocked}</LabelUppercaseXs>
        </span>
      )}
    </div>
  )
}

function blockingRequirement({ mode, canGenerate, references, source }) {
  if (canGenerate) return null
  if (mode === 'assetSet') {
    if (!references.length) return 'Add at least one style reference.'

    return 'Describe the set you want.'
  }
  if (!source) return 'Upload a sprite to start from.'

  return 'Describe the animation you want.'
}

function noop() {}

function RotateSettings() {
  const {
    direction, setDirection, rotationFrameCount, setRotationFrameCount,
    description, setDescription, mirrorOpposites, setMirrorOpposites,
  } = useSpriteContext()

  const order = directionsFor(direction, rotationFrameCount)
  const plan = mirrorOpposites ? rotationPlan(direction, rotationFrameCount) : null

  return (
    <div className={styles.componentRotateSettings}>
      <PanelContainerSettingsRow label='Frames'>
        <Dropdown
          value={String(rotationFrameCount)}
          onChange={value => setRotationFrameCount(Number(value))}
          options={toOptions(ROTATION_FRAME_COUNTS)}
        />
      </PanelContainerSettingsRow>

      <DirectionDial
        value={direction}
        onChange={setDirection}
        frameCount={rotationFrameCount}
        layoutClassName={styles.dialLayout}
      />

      <ParagraphSm>
        {rotationFrameCount === 8
          ? `All eight facings, starting at ${labelFor(direction)}.`
          : `Four facings from ${labelFor(direction)} — a diagonal input yields the other diagonals, a cardinal input the other cardinals.`}
      </ParagraphSm>

      <div className={styles.tags}>
        {order.map((value, index) => (
          <Tag key={value} variant='normal'>
            {index === 0 ? `${value} · input` : value}
          </Tag>
        ))}
      </div>

      <PanelContainerSettingsRow label='Mirror opposite facings'>
        <Checkbox checked={mirrorOpposites} onChange={setMirrorOpposites} />
      </PanelContainerSettingsRow>

      <ParagraphSm>
        {plan
          ? `${plan.generate.length} generated, ${plan.mirror.length} mirrored — exact reflections, and far quicker. Turn off for asymmetric characters, where a mirrored frame swaps which hand holds what.`
          : `All ${order.length - 1} facings generated. Slower, but handedness is preserved.`}
      </ParagraphSm>

      <TextInput
        value={description}
        onChange={setDescription}
        label='Subject (optional)'
        placeholder='e.g. knight in green armour'
      />
    </div>
  )
}

function AnimateSettings() {
  const {
    description, setDescription, animationFrameCount, setAnimationFrameCount,
    animationFrameCounts, loop, setLoop,
  } = useSpriteContext()

  return (
    <div className={styles.componentAnimateSettings}>
      <TextInput
        value={description}
        onChange={setDescription}
        label='Animation'
        placeholder='e.g. walk animation'
      />

      <PanelContainerSettingsRow label='Frames'>
        <Dropdown
          value={String(animationFrameCount)}
          onChange={value => setAnimationFrameCount(Number(value))}
          options={toOptions(animationFrameCounts)}
        />
      </PanelContainerSettingsRow>

      <PanelContainerSettingsRow label='Loop'>
        <Checkbox checked={loop} onChange={setLoop} />
      </PanelContainerSettingsRow>

      <ParagraphSm>
        {loop
          ? 'The last frame is the pose just before the first, so playback wraps without repeating a frame.'
          : 'A one-shot: the input is the first pose and the last frame lands on the end pose.'}
      </ParagraphSm>
    </div>
  )
}

function AssetSetSettings() {
  const { description, setDescription, assetCount, setAssetCount, references } = useSpriteContext()

  return (
    <div className={styles.componentAssetSetSettings}>
      <TextInput
        value={description}
        onChange={setDescription}
        label='Set description'
        placeholder='e.g. dungeon props — barrels, crates, chests'
      />

      <PanelContainerSettingsRow label='Sprites'>
        <Dropdown
          value={String(assetCount)}
          onChange={value => setAssetCount(Number(value))}
          options={toOptions(ASSET_SET_COUNTS)}
        />
      </PanelContainerSettingsRow>

      <ParagraphSm>
        {references.length
          ? `Style read from ${references.length} reference${references.length === 1 ? '' : 's'}.`
          : 'Add at least one style reference in the Input panel.'}
      </ParagraphSm>
    </div>
  )
}

function ServerStatus({ available, engine, onOpenSetup, onOpenServerLog }) {
  if (available === null) {
    return (
      <span className={styles.componentServerStatus}>
        <LabelUppercaseXs>Checking for the local server…</LabelUppercaseXs>
      </span>
    )
  }

  if (!available) {
    return (
      <div className={styles.componentServerStatus}>
        <Tag variant='alert'>Server offline</Tag>
        <GhostButton label='Setup steps' color='white' onClick={onOpenSetup} />
      </div>
    )
  }

  return (
    <div className={styles.componentServerStatus}>
      <Tag variant='success'>Local server</Tag>

      {Boolean(engine) && (
        <span className={styles.engine}>
          <LabelUppercaseXs>{engine}</LabelUppercaseXs>
        </span>
      )}

      <GhostButton
        label='Server log'
        icon={ScrollText}
        color='white'
        onClick={onOpenServerLog}
      />
    </div>
  )
}
