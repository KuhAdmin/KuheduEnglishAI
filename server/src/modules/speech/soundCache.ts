import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Spoken } from './speaker.ts'

/**
 * Sounds already made, kept as files: the same sentence in the same voice is made once, however
 * many learners hear it. A file is named by what it is the sound of, so nothing has to be looked
 * up, and nothing in it says who asked.
 *
 * A sound is kept with the mouth for it, and only with it: one that came without (a speaking
 * service older than this server, in the middle of an update) is not kept, so it is made again
 * and complete the next time, and no face is left guessing for good.
 */
export type SoundCache = {
  read: (key: SoundKey) => Promise<Kept | null>
  /** Whether it was kept: a sound without its mouth is not. */
  write: (key: SoundKey, spoken: Spoken) => Promise<boolean>
}

/** A sound that is kept always has its mouth. */
export type Kept = Spoken & { mouth: string }

export type SoundKey = { model: string; voice: string; text: string }

/** What is kept with a sound. It is part of the name, so a change to it starts the shelf afresh. */
const KEPT_WITH = 'mouth'

export function createSoundCache(directory: string): SoundCache {
  const pathOf = ({ model, voice, text }: SoundKey) => {
    const name = createHash('sha256')
      .update(`${model}\n${voice}\n${text}\n${KEPT_WITH}`)
      .digest('hex')
    // Spread over folders: one folder with every sentence of the course in it is slow to list.
    return { folder: join(directory, name.slice(0, 2)), sound: `${name}.mp3`, mouth: `${name}.mouth` }
  }

  // Written beside it and moved into place, so a reader never finds half a file.
  const put = async (folder: string, file: string, content: Buffer | string) => {
    const draft = join(folder, `${file}.${randomUUID()}.part`)
    await writeFile(draft, content)
    await rename(draft, join(folder, file))
  }

  return {
    async read(key) {
      const { folder, sound, mouth } = pathOf(key)
      try {
        return {
          mouth: await readFile(join(folder, mouth), 'utf8'),
          sound: await readFile(join(folder, sound)),
        }
      } catch {
        return null
      }
    },

    async write(key, spoken) {
      if (!spoken.mouth) return false
      const { folder, sound, mouth } = pathOf(key)
      await mkdir(folder, { recursive: true })
      await put(folder, sound, spoken.sound)
      // The mouth last: the two are read as kept only once both are there.
      await put(folder, mouth, spoken.mouth)
      return true
    },
  }
}
