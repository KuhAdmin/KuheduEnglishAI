import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'

export type EditLanguagePickerProps = {
  options: readonly EditLanguage[]
  value: string
  onChange: (code: string) => void
  /** How many texts a language has, the admin's or built-in. */
  countFilled: (code: string) => number
  /** How many texts there are to fill. */
  total: number
}

/** Picks the language being edited; each one shows how much of its wording exists. */
export function EditLanguagePicker({
  options,
  value,
  onChange,
  countFilled,
  total,
}: EditLanguagePickerProps) {
  return (
    <SegmentedControl
      legend={adminText.wording.languageLegend}
      value={value}
      onChange={onChange}
      options={options.map(({ code, name }) => ({
        value: code,
        label: (
          <>
            <span lang={code}>{name}</span>{' '}
            <span className="font-normal">
              {countFilled(code)}/{total}
            </span>
          </>
        ),
      }))}
    />
  )
}
