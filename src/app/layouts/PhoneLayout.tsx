import { Outlet } from 'react-router'

/**
 * Keeps learner screens in a phone-width column on larger screens. It adds no padding, so
 * full-bleed screens (landing, onboarding) can draw under the status bar; ordinary screens go
 * through ScreenLayout.
 */
export function PhoneLayout() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-bg">
      <Outlet />
    </div>
  )
}
