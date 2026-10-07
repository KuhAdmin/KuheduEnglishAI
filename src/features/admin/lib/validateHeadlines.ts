import type { LandingHeadline } from '@/shared/lib/appConfig/landingConfig'

/** A headline can be saved only once it has some text. */
export const isHeadlineComplete = (headline: LandingHeadline) => headline.text.trim() !== ''
