import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { translationLength } from '@/shared/lib/curriculum/weekChallenges'
import type { WeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import {
  MAX_SCENARIO_NAME_LENGTH,
  MAX_SCENARIOS,
  type ChallengeScenario,
  type WeekScenarios,
} from '@/shared/lib/curriculum/weekScenarios'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import { withLanguage } from '../lib/lines'
import type { ScenariosValidation } from '../lib/validateScenarios'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { RoleplayEditor } from './RoleplayEditor'

const text = adminText.lessons

const newScenario: ChallengeScenario = {
  name: { text: '', translations: {} },
  roleplay: { partner: '', imageUrl: null, turns: [] },
}

export type ScenariosEditorProps = {
  editor: WeekContentEditor<WeekScenarios>
  validation: ScenariosValidation
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/**
 * A week's real-world challenge (Day 7): its scenarios, one at a time — a name, and a role-play
 * written in the editor of Day 4. The levels are not written: they are amounts of help.
 */
export function ScenariosEditor({ editor, validation, translateTo }: ScenariosEditorProps) {
  const { scenarios } = editor.value
  const [position, setPosition] = useState(0)
  // A scenario may have been removed since; stay on the last one there is.
  const index = Math.min(position, scenarios.length - 1)
  const current = scenarios[index]
  const errors = validation.scenarios[index]

  const setScenarios = (next: ChallengeScenario[]) => editor.set({ scenarios: next })
  const setCurrent = (changed: ChallengeScenario) =>
    setScenarios(scenarios.map((other, i) => (i === index ? changed : other)))

  const move = (offset: -1 | 1) => {
    const next = [...scenarios]
    const [moved] = next.splice(index, 1)
    if (moved) next.splice(index + offset, 0, moved)
    setScenarios(next)
    setPosition(index + offset)
  }

  const label = (scenario: ChallengeScenario, place: number) =>
    `${place + 1} · ${scenario.name.text.trim() || text.scenario}`
  // A scenario that is out of sight also keeps the page from saving; say which one it is.
  const unfinishedElsewhere = scenarios.flatMap((scenario, place) => {
    const checked = validation.scenarios[place]
    const fine = checked && !checked.name && checked.roleplay.valid
    return place === index || fine ? [] : [label(scenario, place)]
  })

  // The role-play belongs to its scenario: it is changed there, and removed with it.
  const roleplayEditor: WeekContentEditor<WeekRoleplay> | undefined = current && {
    value: current.roleplay,
    written: false,
    hasBuiltIn: false,
    set: (roleplay) => setCurrent({ ...current, roleplay }),
    remove: () => {},
  }

  return (
    <>
      <AdminSection
        title={text.scenarios}
        description={text.scenariosIntro}
        actions={
          editor.written && (
            <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
              {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
            </Button>
          )
        }
      >
        {scenarios.length === 0 && <p className="text-fg-muted">{text.emptyScenarios}</p>}
        {scenarios.length > 0 && (
          <SegmentedControl
            legend={text.scenarioLegend}
            value={String(index)}
            onChange={(value) => setPosition(Number(value))}
            options={scenarios.map((scenario, place) => ({
              value: String(place),
              label: label(scenario, place),
            }))}
          />
        )}
        {(validation.list || unfinishedElsewhere.length > 0) && (
          <p role="alert" className="text-sm font-bold text-danger">
            {validation.list ?? `${text.errorElsewhere} ${unfinishedElsewhere.join('; ')}`}
          </p>
        )}
        <Button
          variant="secondary"
          className="self-start"
          disabled={scenarios.length >= MAX_SCENARIOS}
          onClick={() => {
            setScenarios([...scenarios, newScenario])
            setPosition(scenarios.length)
          }}
        >
          <Plus aria-hidden="true" className="size-5" />
          {text.addScenario}
        </Button>
      </AdminSection>

      {current && roleplayEditor && errors && (
        <>
          <AdminSection
            title={`${text.scenario} ${index + 1}`}
            actions={
              <div className="flex shrink-0 items-center">
                <IconButton
                  label={`${text.moveScenarioUp} ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(-1)}
                >
                  <ArrowUp aria-hidden="true" className="size-5" />
                </IconButton>
                <IconButton
                  label={`${text.moveScenarioDown} ${index + 1}`}
                  disabled={index === scenarios.length - 1}
                  onClick={() => move(1)}
                >
                  <ArrowDown aria-hidden="true" className="size-5" />
                </IconButton>
                <IconButton
                  variant="danger"
                  label={`${text.removeScenario} ${index + 1}`}
                  // The last scenario goes with the day itself, through its own button.
                  disabled={scenarios.length === 1}
                  onClick={() => setScenarios(scenarios.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden="true" className="size-5" />
                </IconButton>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={text.scenarioName}
                hint={text.scenarioNameHint}
                lang="en"
                value={current.name.text}
                error={errors.name}
                maxLength={MAX_SCENARIO_NAME_LENGTH}
                autoComplete="off"
                onChange={(event) =>
                  setCurrent({ ...current, name: { ...current.name, text: event.target.value } })
                }
              />
              {translateTo && (
                <TextField
                  label={
                    <>
                      {text.scenarioNameIn} <span lang={translateTo.code}>{translateTo.name}</span>
                    </>
                  }
                  lang={translateTo.code}
                  value={current.name.translations[translateTo.code] ?? ''}
                  maxLength={translationLength(MAX_SCENARIO_NAME_LENGTH)}
                  autoComplete="off"
                  onChange={(event) =>
                    setCurrent({
                      ...current,
                      name: {
                        ...current.name,
                        translations: withLanguage(
                          current.name.translations,
                          translateTo.code,
                          event.target.value || undefined,
                        ),
                      },
                    })
                  }
                />
              )}
            </div>
          </AdminSection>

          <RoleplayEditor
            editor={roleplayEditor}
            validation={errors.roleplay}
            translateTo={translateTo}
          />
        </>
      )}
    </>
  )
}
