/**
 * What this browser remembers about keeping a learner's data with their account. Never whose
 * account it is: only that what is stored here is an account's, which changes made here the
 * server has not been sent yet, and which photo of theirs this browser already holds.
 */

const KEY = 'kuhedu-learner-sync'

type SyncRecord = {
  /**
   * What the stores hold belongs to an account: it was taken from one, or given to one. While
   * `false` it is nobody's: a visitor's choices, or what a build before accounts kept.
   */
  ofAccount: boolean
  /** Things changed here that the server has not taken yet, by name (`language`, `photo`). */
  unsent: string[]
  /** When the photo held here was saved with the account (the server's own stamp), if it was. */
  photoStamp: string | null
}

const NOTHING: SyncRecord = { ofAccount: false, unsent: [], photoStamp: null }

// Storage is untrusted input: an older build, another tab, a curious user.
function read(): SyncRecord {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return { ...NOTHING }
    const { ofAccount, unsent, photoStamp } = saved as Partial<Record<keyof SyncRecord, unknown>>
    return {
      ofAccount: ofAccount === true,
      unsent: Array.isArray(unsent)
        ? unsent.filter((name): name is string => typeof name === 'string')
        : [],
      photoStamp: typeof photoStamp === 'string' ? photoStamp : null,
    }
  } catch {
    return { ...NOTHING }
  }
}

let record = read()

function keep(next: SyncRecord) {
  record = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage that cannot be written: it is remembered for as long as the page is open.
  }
}

export const syncRecord = {
  ofAccount: () => record.ofAccount,
  markOfAccount: () => {
    if (!record.ofAccount) keep({ ...record, ofAccount: true })
  },

  isUnsent: (name: string) => record.unsent.includes(name),
  markUnsent: (name: string) => {
    if (!record.unsent.includes(name)) keep({ ...record, unsent: [...record.unsent, name] })
  },
  markSent: (name: string) => {
    if (record.unsent.includes(name)) {
      keep({ ...record, unsent: record.unsent.filter((other) => other !== name) })
    }
  },

  photoStamp: () => record.photoStamp,
  setPhotoStamp: (photoStamp: string | null) => {
    if (record.photoStamp !== photoStamp) keep({ ...record, photoStamp })
  },

  /** This browser is nobody's again. */
  reset: () => keep({ ...NOTHING }),
  /** Read again what is stored: for a test that wrote it itself. */
  reload: () => {
    record = read()
  },
}
