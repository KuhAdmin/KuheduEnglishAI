import { Plus } from 'lucide-react'
import {
  MAX_PARTNER_LENGTH,
  MAX_ROLEPLAY_TURNS,
  ROLEPLAY_PICTURE_BOUNDS,
  type RoleplayTurn,
  type WeekRoleplay,
} from '@/shared/lib/curriculum/weekRoleplays'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { RoleplayValidation } from '../lib/validateRoleplay'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { ImageField } from './ImageField'
import { RoleplayTurnFields } from './RoleplayTurnFields'

const text = adminText.lessons

const newTurn: RoleplayTurn = { partner: '', reply: '', cues: {} }

export type RoleplayEditorProps = {
  editor: WeekContentEditor<WeekRoleplay>
  validation: RoleplayValidation
  /** The learner language whose cues are being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/** A week's role-play (Day 4): who the learner talks to, and what is said turn by turn. */
export function RoleplayEditor({ editor, validation, translateTo }: RoleplayEditorProps) {
  const roleplay = editor.value

  const setTurns = (change: (turns: RoleplayTurn[]) => RoleplayTurn[]) =>
    editor.set({ ...roleplay, turns: change([...roleplay.turns]) })

  const moveTurn = (index: number, offset: -1 | 1) =>
    setTurns((turns) => {
      const [moved] = turns.splice(index, 1)
      if (moved) turns.splice(index + offset, 0, moved)
      return turns
    })

  return (
    <>
      <AdminSection
        title={text.partner}
        description={text.partnerIntro}
        actions={
          editor.written && (
            <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
              {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
            </Button>
          )
        }
      >
        <TextField
          label={text.partnerName}
          hint={text.partnerNameHint}
          lang="en"
          value={roleplay.partner}
          error={validation.partner}
          maxLength={MAX_PARTNER_LENGTH}
          autoComplete="off"
          onChange={(event) => editor.set({ ...roleplay, partner: event.target.value })}
        />
        <ImageField
          label={text.partnerPicture}
          hint={text.partnerPictureHint}
          value={roleplay.imageUrl}
          defaultValue={null}
          onChange={(imageUrl) => editor.set({ ...roleplay, imageUrl })}
          bounds={ROLEPLAY_PICTURE_BOUNDS}
          shape="circle"
        />
      </AdminSection>

      <AdminSection title={text.turns} description={text.turnsIntro}>
        {roleplay.turns.length === 0 && <p className="text-fg-muted">{text.emptyTurns}</p>}

        <ol className="flex flex-col gap-3">
          {roleplay.turns.map((turn, index) => (
            <RoleplayTurnFields
              key={index}
              index={index}
              count={roleplay.turns.length}
              turn={turn}
              errors={validation.turns[index]}
              translateTo={translateTo}
              onChange={(changed) =>
                setTurns((turns) => turns.map((other, i) => (i === index ? changed : other)))
              }
              onMove={(offset) => moveTurn(index, offset)}
              onRemove={() => setTurns((turns) => turns.filter((_, i) => i !== index))}
            />
          ))}
        </ol>

        {validation.list && (
          <p role="alert" className="text-sm font-bold text-danger">
            {validation.list}
          </p>
        )}

        <Button
          variant="secondary"
          className="self-start"
          disabled={roleplay.turns.length >= MAX_ROLEPLAY_TURNS}
          onClick={() => setTurns((turns) => [...turns, newTurn])}
        >
          <Plus aria-hidden="true" className="size-5" />
          {text.addTurn}
        </Button>
      </AdminSection>
    </>
  )
}
