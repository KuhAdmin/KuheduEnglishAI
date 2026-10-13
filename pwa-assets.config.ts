import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the favicon and the PWA, maskable and Apple touch icons from public/logo.png.
// Run `npm run generate-pwa-assets` after changing the logo.
//
// The logo is a letter in several colors on nothing, with a margin of its own around it. So the
// icons with a see-through background add no margin of theirs, and the two that must be filled
// (a phone cuts its own shape out of the maskable one; iOS allows no transparency) are filled
// with white, the one background every color of the letter shows on.
const BACKGROUND = '#ffffff'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BACKGROUND } },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.15,
      resizeOptions: { background: BACKGROUND },
    },
  },
  images: ['public/logo.png'],
})
