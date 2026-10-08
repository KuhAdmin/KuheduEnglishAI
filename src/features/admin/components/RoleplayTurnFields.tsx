import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import {
  MAX_CUE_LENGTH,
  MAX_PARTNER_LINE_LENGTH,
  MAX_REPLY_LENGTH,
  type RoleplayTurn,
} from '@/shared/lib/curriculum/weekRoleplays'
import { IconButton } from '@/shared/ui/IconButton'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { RoleplayTurnErrors } from '../lib/validateRoleplay'

const text = adminText.lessons

export type RoleplayTurnFieldsProps = {
  /** Position in the role-play, from 0. */
  index: number
  /** How many turns the role-play has. */
  count: number
  turn: RoleplayTurn
  errors: RoleplayTurnErrors | undefined
  /** The learner language whose cue is being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  onChange: (turn: RoleplayTurn) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

/** One turn of a role-play: the partner's line, a reply to it, and what to say as a first hint. */
export function RoleplayTurnFields({
  index,
  count,
  turn,
  errors,
  translateTo,
  onChange,
  onMove,
  onRemove,
}: RoleplayTurnFieldsProps) {
  const name = `${text.turn} ${index + 1}`
  // Every turn has the same fields; its number tells them apart for assistive technology.
  const named = (label: string) => (
    <>
      {label} <span className="sr-only">({name})</span>
    </>
  )

  const setCue = (code: string, value: string) => {
    const others = Object.entries(turn.cues).filter(([language]) => language !== code)
    const entries = value ? [...others, [code, value] as [string, string]] : others
    // Sorted, like the schema stores them, so an undone edit leaves nothing to save.
    entries.sort(([a], [b]) => a.localeCompare(b))
    onChange({ ...turn, cues: Object.fromEntries(entries) })
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{name}</h3>
        <div className="flex shrink-0 items-center">
          <IconButton
            label={`${text.moveTurnUp} ${index + 1}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            label={`${text.moveTurnDown} ${index + 1}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            variant="danger"
            label={`${text.removeTurn} ${index + 1}`}
            // The last turn goes with the role-play itself, through its own button.
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextAreaField
          label={named(text.partnerLine)}
          lang="en"
          value={turn.partner}
          error={errors?.partner}
          maxLength={MAX_PARTNER_LINE_LENGTH}
          onChange={(event) => onChange({ ...turn, partner: event.target.value })}
        />
        <TextAreaField
          label={named(text.reply)}
          lang="en"
          value={turn.reply}
          error={errors?.reply}
          maxLength={MAX_REPLY_LENGTH}
          onChange={(event) => onChange({ ...turn, reply: event.target.value })}
        />
      </div>

      {translateTo && (
        <TextAreaField
          label={
            <>
              {text.cue} <span lang={translateTo.code}>{translateTo.name}</span>{' '}
              <span className="sr-only">({name})</span>
            </>
          }
          hint={text.cueHint}
          lang={translateTo.code}
          value={turn.cues[translateTo.code] ?? ''}
          maxLength={MAX_CUE_LENGTH}
          onChange={(event) => setCue(translateTo.code, event.target.value)}
        />
      )}
    </li>
  )
}
