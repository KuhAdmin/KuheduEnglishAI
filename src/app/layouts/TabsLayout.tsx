import { BookOpen, ChartColumn, House, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { BottomNav } from '@/shared/ui/BottomNav'
import { BottomNavItem } from '@/shared/ui/BottomNavItem'

const tabs = [
  { to: paths.home, labelKey: 'nav.home', icon: House },
  { to: paths.lessons, labelKey: 'nav.learn', icon: BookOpen },
  { to: paths.progress, labelKey: 'nav.progress', icon: ChartColumn },
  { to: paths.profile, labelKey: 'nav.profile', icon: UserRound },
] as const

/**
 * The app's main screens: padded content with the bottom navigation under it. The navigation
 * sticks to the bottom of the phone frame, so it stays put while the screen scrolls and never
 * covers the end of the content.
 */
export function TabsLayout() {
  const t = useT()

  return (
    <div className="flex min-h-viewport flex-col pt-safe">
      <main className="flex-1 px-gutter pb-6">
        <Outlet />
      </main>
      <BottomNav label={t('nav.main')} className="sticky bottom-0 z-(--z-nav)">
        {tabs.map(({ to, labelKey, icon: Icon }) => (
          <BottomNavItem key={to} asChild>
            {/* A screen opened from a tab (a section of the journey) keeps that tab current. */}
            <NavLink to={to}>
              <Icon aria-hidden="true" />
              <span className="max-w-full truncate">{t(labelKey)}</span>
            </NavLink>
          </BottomNavItem>
        ))}
      </BottomNav>
    </div>
  )
}
