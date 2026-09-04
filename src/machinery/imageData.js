/** Working with ImageData buffers themselves, independent of what they hold. */

export function cloneImageData(imageData) {
  const out = new ImageData(imageData.width, imageData.height)
  out.data.set(imageData.data)

  return out
}

export function inBounds(imageData, x, y) {
  return x >= 0 && y >= 0 && x < imageData.width && y < imageData.height
}
