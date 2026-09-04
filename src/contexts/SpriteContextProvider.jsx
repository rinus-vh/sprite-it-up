import { useCallback, useMemo, useRef, useState } from 'react'

import {
  ANIMATION_FRAME_COUNTS, bestFrameSizeFor, DEFAULT_ANIMATION_FRAME_COUNT,
  DEFAULT_ASSET_SET_COUNT, DEFAULT_FRAME_SIZE,
} from '@/constants/spriteSizes.js'
import { DEFAULT_MODE } from '@/constants/modes.js'
import { generateAnimation } from '@/machinery/generateAnimation.js'
import { generateAssetSet } from '@/machinery/generateAssetSet.js'
import { generateRotation } from '@/machinery/generateRotation.js'
import { dropFlatBackground, isFullyOpaque } from '@/machinery/flatBackground.js'
import { detectNativeScale, loadImageData, toNativeResolution } from '@/machinery/pixelImage.js'
import { INPUT_SPRITE, outputSprite, sameSprite } from '@/machinery/spriteRef.js'
import { SpriteContext } from './SpriteContext.jsx'

/**
 * Holds the sprite being worked on, the per-mode settings and the generation
 * lifecycle. Panels read from here so they can be minimised and restored
 * without losing state.
 *
 * Uploaded images are kept at their original resolution and reduced to the
 * chosen frame size on demand — changing the frame size re-derives from the
 * original rather than degrading an already-reduced sprite.
 *
 * Hand edits from the editor sit on top of that as an override, tagged with the
 * settings they were made under. Re-deriving the input (a new upload, a
 * different frame size, toggling the background cut) invalidates the tag rather
 * than silently repainting the edits onto a different bitmap.
 */
export function SpriteContextProvider({ children }) {
  const [mode, setMode] = useState(DEFAULT_MODE)
  const [frameSize, setFrameSize] = useState(DEFAULT_FRAME_SIZE)

  const [source, setSource] = useState(null)
  const [inputEdit, setInputEdit] = useState(null)
  const [activeSprite, setActiveSprite] = useState(INPUT_SPRITE)
  const [references, setReferences] = useState([])
  const [removeBackground, setRemoveBackground] = useState(true)
  const [mirrorOpposites, setMirrorOpposites] = useState(true)

  const [direction, setDirection] = useState('S')
  const [rotationFrameCount, setRotationFrameCount] = useState(4)
  const [description, setDescription] = useState('')
  const [animationFrameCount, setAnimationFrameCount] = useState(DEFAULT_ANIMATION_FRAME_COUNT)
  const [loop, setLoop] = useState(true)
  const [assetCount, setAssetCount] = useState(DEFAULT_ASSET_SET_COUNT)
  const [seed, setSeed] = useState(null)

  const [result, setResult] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  const abortRef = useRef(null)
  const nextSourceIdRef = useRef(0)

  const prepare = useCallback(
    (imageData) => {
      const cut = removeBackground ? dropFlatBackground(imageData) : imageData

      return toNativeResolution(cut, frameSize)
    },
    [frameSize, removeBackground],
  )

  const derivedInputFrame = useMemo(
    () => (source ? prepare(source.imageData) : null),
    [source, prepare],
  )

  // Identifies the bitmap the edits were painted on. Comparing it on render
  // (rather than clearing the override from an effect) means a stale edit can
  // never be shown for even one frame.
  const inputSignature = `${source?.id ?? 'none'}|${frameSize}|${removeBackground}`
  const editedInputFrame = inputEdit?.signature === inputSignature ? inputEdit.imageData : null
  const inputFrame = editedInputFrame ?? derivedInputFrame

  const editInputFrame = useCallback(
    (imageData) => setInputEdit({ signature: inputSignature, imageData }),
    [inputSignature],
  )

  const revertInputFrame = useCallback(() => setInputEdit(null), [])

  const selectSprite = useCallback(
    ref => setActiveSprite(prev => (sameSprite(prev, ref) ? prev : ref)),
    [],
  )

  const editResultFrame = useCallback(
    (index, imageData) => setResult(prev => (
      prev
        ? { ...prev, frames: prev.frames.map((frame, i) => (i === index ? imageData : frame)) }
        : prev
    )),
    [],
  )

  const referenceFrames = useMemo(
    () => references.map(reference => prepare(reference.imageData)),
    [references, prepare],
  )

  const setInputFile = useCallback(
    async (file) => {
      const imageData = await loadImageData(file)
      const nativeScale = detectNativeScale(imageData)
      const nativeSize = Math.min(imageData.width, imageData.height) / nativeScale

      setSource({
        // A counter rather than the file name: re-uploading the same file is a
        // deliberate reset, and must not be mistaken for the same source.
        id: nextSourceIdRef.current++,
        name: file.name,
        imageData,
        // Tells the user whether we recovered a true pixel grid or resampled.
        nativeScale,
        nativeSize,
        wasOpaque: isFullyOpaque(imageData),
      })
      // Never silently upscale: a 40px sprite lands on the 32 preset, not 64.
      setFrameSize(bestFrameSizeFor(nativeSize))
      setInputEdit(null)
      setResult(null)
      setError(null)
      setActiveSprite(INPUT_SPRITE)
    },
    [],
  )

  const clearInput = useCallback(
    () => {
      setSource(null)
      setInputEdit(null)
      setResult(null)
      setError(null)
      setActiveSprite(INPUT_SPRITE)
    },
    [],
  )

  const addReferenceFile = useCallback(
    async (file) => {
      const imageData = await loadImageData(file)
      setReferences(prev => [...prev, { name: file.name, imageData }])
      setError(null)
    },
    [],
  )

  const removeReference = useCallback(
    (index) => setReferences(prev => prev.filter((_, i) => i !== index)),
    [],
  )

  const generate = useCallback(
    async () => {
      const controller = new AbortController()
      abortRef.current = controller

      setGenerating(true)
      setError(null)
      setProgress({ percent: 0, label: 'Starting…' })

      const onProgress = info => setProgress({ percent: info.progress ?? 0, label: info.label })
      const shared = { frameSize, description, seed, onProgress, signal: controller.signal }

      try {
        if (mode === 'rotate') {
          const { frames, labels, notes } = await generateRotation(inputFrame, {
            ...shared,
            direction,
            frameCount: rotationFrameCount,
            mirrorOpposites,
          })
          setResult({ mode, frames, labels, notes, frameSize, loop: true })
          setActiveSprite(outputSprite(0))
        } else if (mode === 'animate') {
          const { frames, labels } = await generateAnimation(inputFrame, {
            ...shared,
            // The input is frame 1, so the stage generates the rest.
            frameCount: animationFrameCount - 1,
            loop,
          })
          setResult({ mode, frames, labels, frameSize, loop })
          setActiveSprite(outputSprite(0))
        } else {
          const { frames, labels } = await generateAssetSet(referenceFrames, {
            ...shared,
            count: assetCount,
          })
          setResult({ mode, frames, labels, frameSize, loop: false })
          setActiveSprite(outputSprite(0))
        }
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message ?? String(e))
      } finally {
        setGenerating(false)
        setProgress(null)
        abortRef.current = null
      }
    },
    [
      mode, inputFrame, referenceFrames, frameSize, description, seed,
      direction, rotationFrameCount, animationFrameCount, loop, assetCount,
      mirrorOpposites,
    ],
  )

  const cancel = useCallback(
    () => { abortRef.current?.abort() },
    [],
  )

  const canGenerate = mode === 'assetSet'
    ? references.length > 0 && description.trim().length > 0
    : Boolean(source) && (mode === 'rotate' || description.trim().length > 0)

  const value = {
    mode, setMode,
    frameSize, setFrameSize,
    source, inputFrame, setInputFile, clearInput,
    isInputEdited: Boolean(editedInputFrame), editInputFrame, revertInputFrame,
    editResultFrame,
    activeSprite, selectSprite,
    removeBackground, setRemoveBackground,
    mirrorOpposites, setMirrorOpposites,
    references, referenceFrames, addReferenceFile, removeReference,
    direction, setDirection,
    rotationFrameCount, setRotationFrameCount,
    description, setDescription,
    animationFrameCount, setAnimationFrameCount,
    animationFrameCounts: ANIMATION_FRAME_COUNTS,
    loop, setLoop,
    assetCount, setAssetCount,
    seed, setSeed,
    result, generating, progress, error,
    generate, cancel, canGenerate,
    clearResult: useCallback(() => setResult(null), []),
  }

  return (
    <SpriteContext.Provider {...{ value }}>
      {children}
    </SpriteContext.Provider>
  )
}
