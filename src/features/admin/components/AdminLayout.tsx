import { ExternalLink, LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useSessionStore } from '@/features/auth'
import { cn } from '@/shared/lib/cn'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { adminText } from '../adminText'

const sections = [
  { to: paths.adminTexts, label: adminText.nav.texts },
  { to: paths.adminCurriculum, label: adminText.nav.curriculum },
  { to: paths.adminLessons, label: adminText.nav.lessons },
  { to: paths.adminLanding, label: adminText.nav.landing },
  { to: paths.adminLanguages, label: adminText.nav.languages },
  { to: paths.adminProfiles, label: adminText.nav.profiles },
]

/** Shell of the admin area: header, section tabs and the current section. English only. */
export function AdminLayout() {
  const navigate = useNavigate()
  const signOut = useSessionStore((state) => state.signOut)

  const handleSignOut = () => {
    signOut()
    navigate(paths.signIn, { replace: true })
  }

  return (
    <div lang="en" className="flex min-h-dvh flex-col bg-bg pt-safe">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 py-3 px-gutter">
          <p className="text-xl font-extrabold tracking-tight">{adminText.title}</p>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              {/* A new tab, so the app and the admin area can be used side by side. */}
              <a href={paths.landing} target="_blank" rel="noreferrer">
                {adminText.openApp}
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut aria-hidden="true" className="size-4" />
              {adminText.signOut}
            </Button>
          </div>
        </div>
        <nav aria-label={adminText.sectionsLabel} className="mx-auto w-full max-w-4xl px-gutter">
          <ul className="-mb-px flex gap-1 overflow-x-auto scroll-contained">
            {sections.map((section) => (
              <li key={section.to} className="shrink-0">
                <NavLink
                  to={section.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center border-b-2 px-3 font-bold whitespace-nowrap',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-fg-muted active:text-fg',
                    )
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-gutter pb-safe">
        <p className="mt-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-fg">
          {adminText.localNotice}
        </p>
        <Outlet />
      </main>
    </div>
  )
}
