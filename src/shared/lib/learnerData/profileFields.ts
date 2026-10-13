import {
  LANGUAGE_TAG,
  learnerProfilePatchSchema,
  learnerVoicesSchema,
  type LearnerProfile,
  type LearnerVoices,
} from '@kuhedu/contracts'
import { isThemePreference } from '@/shared/theme/themes'
import { useThemeStore } from '@/shared/theme/useThemeStore'
import { useVoiceStore } from '../audio/useVoiceStore'
import { useLanguageStore } from '../i18n/useLanguageStore'
import { isTutorAvatarId, useTutorAvatarStore } from '../learner/tutorAvatar'
import { isRefusedForGood, saveProfile } from './api'
import { registerLearnerPart } from './parts'
import { syncRecord } from './syncRecord'

/** The answers a profile holds, by the names the server keeps them under. */
type FieldKey = Exclude<keyof LearnerProfile, 'photoUpdatedAt'>

/**
 * One answer of the learner's that a store of the app holds: where to read it, how to put the
 * account's in its place, and how to hear of a change.
 */
export type ProfileField = {
  key: FieldKey
  /** What is chosen here; `null` (or nothing in it) when nothing is. */
  read: () => unknown
  /** Take the account's answer as it came; `null` puts back the default. What is not a valid answer is not taken. */
  apply: (value: unknown) => void
  /** Call back when the answer changes. */
  subscribe: (changed: () => void) => () => void
}

const fields: ProfileField[] = []

/** Have an answer kept with the account. Called from beside the store that holds it. */
export function registerProfileField(field: ProfileField) {
  if (!fields.some((other) => other.key === field.key)) fields.push(field)
}

/** A subscription to one value of a store, told only when that value changes. */
export function onValueChange<State>(
  store: { subscribe: (listener: (state: State, previous: State) => void) => () => void },
  pick: (state: State) => unknown,
  changed: () => void,
) {
  return store.subscribe((state, previous) => {
    if (pick(state) !== pick(previous)) changed()
  })
}

const nothingIn = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === 'object' && Object.keys(value).length === 0)

/**
 * The voices chosen here that the server would keep, each on its own: a choice from before the
 * server had voices names none of its, and must not take a good one down with it.
 */
function sendableVoices(): LearnerVoices {
  const kept: LearnerVoices = {}
  for (const [language, chosen] of Object.entries(useVoiceStore.getState().voices)) {
    for (const [kind, voice] of Object.entries(chosen)) {
      const one = learnerVoicesSchema.safeParse({ [language]: { [kind]: voice } })
      if (one.success) kept[language] = { ...kept[language], ...one.data[language] }
    }
  }
  return kept
}

registerProfileField({
  key: 'language',
  read: () => useLanguageStore.getState().language,
  apply: (value) =>
    useLanguageStore.setState({
      language: typeof value === 'string' && LANGUAGE_TAG.test(value) ? value : null,
    }),
  subscribe: (changed) => onValueChange(useLanguageStore, (state) => state.language, changed),
})

registerProfileField({
  key: 'theme',
  // "Follow the device" is the look until one is chosen, so it is kept as no choice at all.
  read: () => {
    const { preference } = useThemeStore.getState()
    return preference === 'auto' ? null : preference
  },
  // A theme another build has and this one does not is passed over.
  apply: (value) =>
    useThemeStore.setState({ preference: isThemePreference(value) ? value : 'auto' }),
  subscribe: (changed) => onValueChange(useThemeStore, (state) => state.preference, changed),
})

registerProfileField({
  key: 'tutorAvatar',
  read: () => useTutorAvatarStore.getState().avatar,
  apply: (value) => useTutorAvatarStore.setState({ avatar: isTutorAvatarId(value) ? value : null }),
  subscribe: (changed) => onValueChange(useTutorAvatarStore, (state) => state.avatar, changed),
})

registerProfileField({
  key: 'voices',
  read: sendableVoices,
  apply: (value) => {
    const voices = learnerVoicesSchema.safeParse(value ?? {})
    useVoiceStore.setState({ voices: voices.success ? voices.data : {} })
  },
  subscribe: (changed) => onValueChange(useVoiceStore, (state) => state.voices, changed),
})

// While the account's answers are being put into the stores, the stores change, and those
// changes are not the learner's: they must not be sent back as theirs.
let applying = false

function applyTo(field: ProfileField, value: unknown) {
  applying = true
  try {
    field.apply(value)
  } finally {
    applying = false
  }
}

/**
 * The learner's answers and settings, each kept by the last place it was changed in. One that
 * was changed here and not sent yet is ours to send; any other is the account's to say.
 */
registerLearnerPart({
  name: 'profile',

  settle(account, { adopting }) {
    for (const field of fields) {
      if (syncRecord.isUnsent(field.key)) continue
      const theirs = account.profile[field.key]
      if (!nothingIn(theirs)) applyTo(field, theirs)
      // What was nobody's fills what the account lacks: it is sent, not wiped.
      else if (adopting && !nothingIn(field.read())) syncRecord.markUnsent(field.key)
      else applyTo(field, null)
    }
  },

  async send() {
    const unsent = fields.filter((field) => syncRecord.isUnsent(field.key))
    if (unsent.length === 0) return
    const values = unsent.map((field) => [field.key, field.read()] as const)
    const patch = learnerProfilePatchSchema.safeParse(Object.fromEntries(values))
    const sent = () => {
      for (const [key, value] of values) {
        const field = unsent.find((other) => other.key === key)
        // Changed again while it was on its way: that change is still to be sent.
        if (field && JSON.stringify(field.read()) === JSON.stringify(value)) {
          syncRecord.markSent(key)
        }
      }
    }
    // Not something the server keeps (an answer from an older build): it stays here only.
    if (!patch.success) return sent()
    try {
      await saveProfile(patch.data)
    } catch (error) {
      if (!isRefusedForGood(error)) throw error
    }
    sent()
  },

  watch(changed) {
    const stops = fields.map((field) =>
      field.subscribe(() => {
        if (applying) return
        syncRecord.markUnsent(field.key)
        changed()
      }),
    )
    return () => stops.forEach((stop) => stop())
  },

  clear() {
    for (const field of fields) applyTo(field, null)
  },
})
