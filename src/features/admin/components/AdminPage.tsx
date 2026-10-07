import type { ReactNode } from 'react'
import { adminText } from '../adminText'
import type { DraftStatus } from '../hooks/useSettingsDraft'
import { Button } from '@/shared/ui/Button'

const statusText: Record<Exclude<DraftStatus, 'idle'>, string> = {
  saved: adminText.actions.saved,
  reset: adminText.actions.reset,
  'storage-full': adminText.actions.storageFull,
}

export type AdminPageProps = {
  heading: string
  intro: string
  children: ReactNode
  isDirty: boolean
  /** False while the form has problems the admin must fix first. */
  canSave?: boolean
  /** Whether the saved section differs from the built-in defaults. */
  isCustomised: boolean
  status: DraftStatus
  onSave: () => void
  onDiscard: () => void
  onResetToDefaults: () => void
}

/** Frame of one admin section: heading, the form, and a pinned bar with Save / Discard / Reset. */
export function AdminPage({
  heading,
  intro,
  children,
  isDirty,
  canSave = true,
  isCustomised,
  status,
  onSave,
  onDiscard,
  onResetToDefaults,
}: AdminPageProps) {
  const handleReset = () => {
    if (window.confirm(adminText.actions.resetAllConfirm)) onResetToDefaults()
  }

  const message = isDirty ? adminText.actions.unsaved : status === 'idle' ? '' : statusText[status]

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (isDirty && canSave) onSave()
      }}
      className="flex flex-1 flex-col"
    >
      <header className="flex flex-col gap-1 py-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{heading}</h1>
        <p className="text-fg-muted">{intro}</p>
      </header>

      <div className="flex flex-1 flex-col gap-6 pb-6">{children}</div>

      <div className="sticky bottom-0 -mx-(--gutter) border-t border-border bg-surface py-3 px-gutter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            aria-live="polite"
            className={
              status === 'storage-full' && !isDirty
                ? 'text-sm font-bold text-danger'
                : 'text-sm text-fg-muted'
            }
          >
            {message}
          </p>
          {/* Short labels on phones keep the bar to one row; the full name stays for assistive
              technology (and contains the visible word). */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              aria-label={adminText.actions.resetAll}
              disabled={!isCustomised && !isDirty}
              onClick={handleReset}
            >
              <span className="sm:hidden">{adminText.actions.resetAllShort}</span>
              <span className="hidden sm:inline">{adminText.actions.resetAll}</span>
            </Button>
            <Button variant="secondary" disabled={!isDirty} onClick={onDiscard}>
              {adminText.actions.discard}
            </Button>
            <Button
              type="submit"
              aria-label={adminText.actions.save}
              disabled={!isDirty || !canSave}
            >
              <span className="sm:hidden">{adminText.actions.saveShort}</span>
              <span className="hidden sm:inline">{adminText.actions.save}</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
