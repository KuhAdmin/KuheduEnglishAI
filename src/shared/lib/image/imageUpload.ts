import { isSafeAssetUrl } from '@/shared/lib/appConfig/fields'

/** The file is not an image the browser can read. */
export class ImageUnreadableError extends Error {}
/** Still too big for browser storage after shrinking. */
export class ImageTooLargeError extends Error {}

export type ImageBounds = { maxWidth: number; maxHeight: number }

/** Largest size that fits inside the bounds without stretching or enlarging the image. */
export function fitWithin(width: number, height: number, { maxWidth, maxHeight }: ImageBounds) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageUnreadableError())
    }
    image.src = url
  })
}

/**
 * Turn an uploaded file into a compact image the browser can keep in its own storage (there is
 * no server to upload to yet): shrunk to the given bounds and re-encoded, as a `data:` URL.
 * Re-encoding through a canvas also strips anything that is not pixels (metadata, SVG scripts).
 * TODO(backend): upload the file and return its URL instead.
 */
export async function fileToStoredImage(file: File, bounds: ImageBounds): Promise<string> {
  const image = await loadImage(file)
  if (!image.naturalWidth || !image.naturalHeight) throw new ImageUnreadableError()

  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, bounds)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new ImageUnreadableError()
  context.drawImage(image, 0, 0, width, height)

  // WebP keeps transparency and is small. A browser that cannot encode it returns PNG, which
  // may be too big for a photo, so JPEG is the last resort.
  for (const type of ['image/webp', 'image/jpeg']) {
    for (const quality of [0.86, 0.7, 0.5]) {
      const dataUrl = canvas.toDataURL(type, quality)
      if (isSafeAssetUrl(dataUrl)) return dataUrl
    }
  }
  throw new ImageTooLargeError()
}
