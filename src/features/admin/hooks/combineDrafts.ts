import type { DraftStatus, SettingsDraft } from './useSettingsDraft'

type AnyDraft = Pick<
  SettingsDraft<unknown>,
  'isDirty' | 'isCustomised' | 'status' | 'discard' | 'resetToDefaults'
> & { save: () => void }

/**
 * Several settings objects behind one Save / Discard / Reset bar, for a page that edits more
 * than one (the course's wording and its pictures; a week's conversation and its words).
 */
export function combineDrafts(...drafts: AnyDraft[]) {
  const statuses: DraftStatus[] = drafts.map((draft) => draft.status)

  return {
    isDirty: drafts.some((draft) => draft.isDirty),
    isCustomised: drafts.some((draft) => draft.isCustomised),
    // What went wrong is the thing to say, whatever happened to the rest; then what is still
    // on its way.
    status:
      (['storage-full', 'conflict', 'failed', 'saving'] as const).find((status) =>
        statuses.includes(status),
      ) ??
      statuses.find((status) => status !== 'idle') ??
      ('idle' as const),
    save() {
      for (const draft of drafts) if (draft.isDirty) draft.save()
    },
    discard() {
      for (const draft of drafts) draft.discard()
    },
    resetToDefaults() {
      for (const draft of drafts) draft.resetToDefaults()
    },
  }
}
