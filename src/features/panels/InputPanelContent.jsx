import { Trash2, X } from 'lucide-react'
import {
  ActionIconButton, Checkbox, Dropdown, FileUpload, GhostButton, LabelUppercaseXs,
  PanelContainer, PanelContainerDivider, PanelContainerSettingsRow, ParagraphSm,
} from '@6njp/prototype-library'

import { SpriteCanvas } from '@/features/SpriteCanvas.jsx'

import { FRAME_SIZES } from '@/constants/spriteSizes.js'
import { useSpriteContext } from '@/contexts/SpriteContext.jsx'
import { INPUT_SPRITE, sameSprite } from '@/machinery/spriteRef.js'

import styles from './InputPanelContent.module.css'

const SIZE_OPTIONS = FRAME_SIZES.map(size => ({ value: String(size), label: `${size} × ${size}` }))

/**
 * The input sprite (or, in asset-set mode, the style references) and the frame
 * size everything is generated at.
 */
export function InputPanelContent() {
  const {
    mode, frameSize, setFrameSize,
    source, inputFrame, setInputFile, clearInput,
    removeBackground, setRemoveBackground,
    references, referenceFrames, addReferenceFile, removeReference,
    activeSprite, selectSprite,
  } = useSpriteContext()

  return (
    <PanelContainer>
      <PanelContainerSettingsRow label='Frame size'>
        <Dropdown
          value={String(frameSize)}
          onChange={value => setFrameSize(Number(value))}
          options={SIZE_OPTIONS}
        />
      </PanelContainerSettingsRow>

      <ParagraphSm>
        {`Sprites are stored at ${frameSize} × ${frameSize} real pixels and only scaled up for display.`}
      </ParagraphSm>

      {Boolean(source) && frameSize > source.nativeSize && (
        <span className={styles.warning}>
          <LabelUppercaseXs>
            {`${frameSize}px is larger than this sprite’s own ${Math.round(source.nativeSize)}px grid — `
              + 'upscaling invents pixels that were never drawn.'}
          </LabelUppercaseXs>
        </span>
      )}

      {mode !== 'assetSet' && Boolean(source) && (
        <PanelContainerSettingsRow label='Cut out background'>
          <Checkbox checked={removeBackground} onChange={setRemoveBackground} />
        </PanelContainerSettingsRow>
      )}

      <PanelContainerDivider />

      {mode === 'assetSet'
        ? (
          <ReferenceInputs
            onFile={addReferenceFile}
            onRemove={removeReference}
            {...{ references, referenceFrames }}
          />
        )
        : (
          <SingleInput
            onFile={setInputFile}
            onRemove={clearInput}
            onSelect={() => selectSprite(INPUT_SPRITE)}
            isSelected={sameSprite(activeSprite, INPUT_SPRITE)}
            {...{ source, inputFrame, frameSize }}
          />
        )}
    </PanelContainer>
  )
}

function SingleInput({ source, inputFrame, frameSize, isSelected, onFile, onRemove, onSelect }) {
  if (!source) {
    return (
      <FileUpload
        displayAcceptedFormats
        label='Drop a sprite here'
        accept={['image/png', 'image/gif', 'image/webp', 'image/jpeg']}
        {...{ onFile }}
      />
    )
  }

  const { width, height } = source.imageData
  const recovered = source.nativeScale > 1

  return (
    <div className={styles.componentSingleInput}>
      {/* Clicking the sprite is what sends it to the editor — the same gesture
          as clicking a frame in the preview strip, so there is one way to say
          "work on this" wherever a sprite is shown. */}
      <button
        type='button'
        onClick={onSelect}
        title='Edit this sprite'
        aria-pressed={isSelected}
        className={cx(styles.previewButton, isSelected && styles.isSelected)}
      >
        <SpriteCanvas
          imageData={inputFrame}
          alt={source.name}
          layoutClassName={styles.previewLayout}
        />
      </button>

      <span className={styles.meta}>
        <LabelUppercaseXs>
          {recovered
            ? `${source.name} — ${width}×${height}, true grid ${width / source.nativeScale}×${height / source.nativeScale}`
            : `${source.name} — ${width}×${height}, resampled to ${frameSize}×${frameSize}`}
        </LabelUppercaseXs>
      </span>

      {/* The pixel grid belongs to the editor, where you are aiming at
          individual pixels. Here the sprite is only being identified. */}
      <div className={styles.actions}>
        <GhostButton
          label='Remove'
          icon={Trash2}
          color='white'
          onClick={onRemove}
        />
      </div>
    </div>
  )
}

function ReferenceInputs({ references, referenceFrames, onFile, onRemove }) {
  return (
    <div className={styles.componentReferenceInputs}>
      <ParagraphSm>
        Add several references — the more consistent examples the style has to read
        from, the closer a generated set lands.
      </ParagraphSm>

      <FileUpload
        label='Add a style reference'
        accept={['image/png', 'image/gif', 'image/webp', 'image/jpeg']}
        {...{ onFile }}
      />

      {/* Sprite thumbnails rather than plain <img> tags, so the references are
          shown pixelated at their real resolution like everything else. */}
      <ol className={styles.referenceList}>
        {referenceFrames.map((frame, index) => (
          <li key={index} className={styles.referenceItem}>
            <SpriteCanvas
              imageData={frame}
              alt={references[index]?.name ?? `Reference ${index + 1}`}
              layoutClassName={styles.referenceThumbLayout}
            />

            <ActionIconButton
              icon={X}
              onClick={() => onRemove(index)}
              title={`Remove ${references[index]?.name ?? 'reference'}`}
              size={20}
              style='transparent'
              layoutClassName={styles.referenceRemoveLayout}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}
