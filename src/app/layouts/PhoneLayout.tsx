import { Outlet } from 'react-router'
import { PhoneFrame } from './PhoneFrame'

/**
 * Puts every learner screen in the phone frame: the device's own screen on a phone, a phone
 * drawn in the middle of the display on a tablet or anything wider. It adds no padding, so
 * full-bleed screens (landing, onboarding) can draw under the status bar; ordinary screens go
 * through ScreenLayout.
 */
export function PhoneLayout() {
  return (
    <PhoneFrame>
      <Outlet />
    </PhoneFrame>
  )
}
