import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Sounds already made, kept as files: the same sentence in the same voice is made once, however
 * many learners hear it. A file is named by what it is the sound of, so nothing has to be looked
 * up, and nothing in it says who asked.
 */
export type SoundCache = {
  read: (key: SoundKey) => Promise<Buffer | null>
  write: (key: SoundKey, sound: Buffer) => Promise<void>
}

export type SoundKey = { model: string; voice: string; text: string }

export function createSoundCache(directory: string): SoundCache {
  const pathOf = ({ model, voice, text }: SoundKey) => {
    const name = createHash('sha256').update(`${model}\n${voice}\n${text}`).digest('hex')
    // Spread over folders: one folder with every sentence of the course in it is slow to list.
    return { folder: join(directory, name.slice(0, 2)), file: `${name}.mp3` }
  }

  return {
    async read(key) {
      const { folder, file } = pathOf(key)
      try {
        return await readFile(join(folder, file))
      } catch {
        return null
      }
    },

    async write(key, sound) {
      const { folder, file } = pathOf(key)
      await mkdir(folder, { recursive: true })
      // Written beside it and moved into place, so a reader never finds half a sound.
      const draft = join(folder, `${file}.${randomUUID()}.part`)
      await writeFile(draft, sound)
      await rename(draft, join(folder, file))
    },
  }
}
