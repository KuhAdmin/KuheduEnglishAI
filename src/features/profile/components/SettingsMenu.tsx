import { Globe, Palette, Smile, Volume2 } from 'lucide-react'
import { Link } from 'react-router'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { useVoices } from '@/shared/lib/audio/useVoices'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { voiceForFace } from '@/shared/lib/audio/voices'
import { DEFAULT_LANGUAGE, useLanguage, useT } from '@/shared/lib/i18n'
import { tutorAvatars, useTutorAvatar, useTutorVoiceKind } from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { themes, useThemeStore } from '@/shared/theme'
import { ListItem } from '@/shared/ui/ListItem'

/**
 * The settings a learner can change, each opening its own screen. A row's second line is its
 * current value, so the menu can be read without opening anything.
 * Only what is built has a row; notifications, downloads and help get theirs when they exist.
 */
export function SettingsMenu() {
  const t = useT()
  const language = useLanguage()
  const { languages } = useLanguagesConfig()
  const themePreference = useThemeStore((state) => state.preference)
  const deviceVoices = useVoices()
  const tutorAvatar = useTutorAvatar()
  const voiceKind = useTutorVoiceKind()
  const chosenVoice = useVoiceStore((state) => state.voices[DEFAULT_LANGUAGE]?.[voiceKind])

  const languageName = languages.find(({ code }) => code === language)
  const theme = themes.find(({ id }) => id === themePreference)
  const tutor = tutorAvatars.find(({ id }) => id === tutorAvatar)
  // The voice lessons are heard in: their tutor's.
  const voice = voiceForFace(deviceVoices, DEFAULT_LANGUAGE, voiceKind, chosenVoice)

  return (
    <nav aria-label={t('profile.settingsLabel')}>
      <ul className="flex flex-col gap-3">
        <li>
          <ListItem
            asChild
            icon={<Globe className="size-6" />}
            title={t('profile.language')}
            description={
              languageName && <span lang={languageName.code}>{languageName.nativeName}</span>
            }
          >
            <Link to={paths.profileLanguage} />
          </ListItem>
        </li>
        <li>
          <ListItem
            asChild
            icon={<Volume2 className="size-6" />}
            title={t('voice.title')}
            description={voice ? voice.name : t('voice.subtitle')}
          >
            <Link to={paths.profileVoice} />
          </ListItem>
        </li>
        <li>
          <ListItem
            asChild
            icon={<Smile className="size-6" />}
            title={t('tutor.title')}
            description={tutor && t(tutor.labelKey)}
          >
            <Link to={paths.profileTutor} />
          </ListItem>
        </li>
        <li>
          <ListItem
            asChild
            icon={<Palette className="size-6" />}
            title={t('profile.appearance')}
            description={theme ? t(theme.nameKey) : t('theme.auto')}
          >
            <Link to={paths.profileAppearance} />
          </ListItem>
        </li>
      </ul>
    </nav>
  )
}
