import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates favicon, PWA, maskable and Apple touch icons from public/logo.svg.
// Run `npm run generate-pwa-assets` after changing the logo.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#4f46e5' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#4f46e5' } },
  },
  images: ['public/logo.svg'],
})
