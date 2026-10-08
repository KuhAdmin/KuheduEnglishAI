import { Outlet } from 'react-router'

/** Standard padded screen: safe areas + page gutter. For screens outside the main tabs. */
export function ScreenLayout() {
  return (
    <div className="flex min-h-dvh flex-col pt-safe">
      <main className="flex-1 px-gutter pb-safe">
        <Outlet />
      </main>
    </div>
  )
}
