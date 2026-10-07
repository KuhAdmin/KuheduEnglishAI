# CLAUDE.md — Kuhedu English AI

Guidance for Claude Code (and humans) working in this repository. Read this fully before making changes.

## 1. Product

**Kuhedu English AI** is a mobile-first Progressive Web App for learning **spoken English** through conversation with an AI tutor (similar in spirit to SuperNova AI). Core experiences:

- **AI conversation practice**: the learner speaks and the AI tutor replies with voice and text, in role-plays and free talk.
- **Pronunciation & fluency feedback**: per-word scoring, grammar corrections, better phrasings.
- **Structured lessons**: levels (CEFR A1–C2), daily goals, vocabulary, listening drills.
- **Progress & motivation**: streaks, XP, history of sessions, review of mistakes.

The primary device is a **mid-range Android phone on a 4G connection**, used one-handed. Design and engineer for that first, then scale up to tablet and desktop.

We build **one piece at a time**. Do not scaffold features that were not asked for. When a task touches an area not yet built, leave a clear `TODO(feature-name)` rather than inventing it.

## 2. Tech stack (default; update this section if it changes)

| Concern               | Choice                                                        |
| --------------------- | ------------------------------------------------------------- |
| Framework             | React 19 + TypeScript (strict)                                |
| Build                 | Vite                                                          |
| PWA                   | `vite-plugin-pwa` (Workbox), Web App Manifest                 |
| Styling               | Tailwind CSS v4 with design tokens as CSS custom properties   |
| Accessible primitives | Radix UI primitives (headless), wrapped in our own components |
| Animation             | `motion` (Framer Motion), CSS transitions for simple cases    |
| Routing               | React Router (data router, lazy routes)                       |
| Server state          | TanStack Query                                                |
| Client state          | Zustand (small, feature-scoped stores)                        |
| Forms / validation    | React Hook Form + Zod                                         |
| Icons                 | `lucide-react`                                                |
| Testing               | Vitest + React Testing Library, Playwright (mobile viewports) |
| Lint / format         | ESLint (incl. `jsx-a11y`), Prettier                           |

Do not add a new dependency without stating why in the PR/commit message and checking bundle-size impact. Prefer the platform (Web APIs, CSS) over a library.

## 3. Project structure

Feature-based structure. Code lives with the feature that owns it; only truly shared code is promoted to `shared/`.

```
src/
  main.tsx             # Entry: font, global CSS, <App />
  app/                 # App shell — the only place that wires features together
    App.tsx
    router.tsx         # Composes each feature's exported routes under the layouts
    layouts/           # RootLayout (theme + PWA, draws nothing)
                       # PhoneLayout (centered phone-width column for all learner screens)
                       # ScreenLayout (safe areas + gutter for ordinary screens, future nav)
    routes/            # App-level route elements (RouteError / not found)
    providers/         # AppProviders, queryClient
    pwa/               # usePwaUpdate (service-worker registration + update state)
    styles/index.css   # Tailwind entry; imports shared/styles
  features/
    <feature>/         # landing, auth, onboarding, placement, home, conversation, lessons,
                       # profile, admin
      pages/           # Route screens, lazy-loaded
      components/      # Feature-specific UI (composed from shared/ui)
      hooks/
      api/             # Query/mutation hooks + request functions
      store/           # Zustand slice, if needed
      types.ts
      index.ts         # Public API: exports `<feature>Routes` (lazy) + anything others may use
  shared/
    ui/                # Design-system components (Button, Sheet, Card, ...)
    hooks/             # Generic hooks (useMediaQuery, useHaptics, useOnlineStatus)
    lib/               # cn, env, paths, api/client, audio
      i18n/            # Screen texts per language: catalogs (en, bn, hi), useT, providers, store
      appConfig/       # Admin-managed settings: schemas, storage (settingsRepository), hooks
      learner/         # Learner facts shared across features (ageGroups)
    theme/             # Named themes: registry, preference store, apply hook, ThemePicker
    styles/            # tokens.css (design tokens), base.css (base layer + utilities)
  test/setup.ts        # Vitest setup
e2e/                   # Playwright specs (run against the production build)
public/                # logo.svg (icon source) + generated PWA icons
```

Folders are created when first needed; don't add empty ones.

Rules (the import rules are enforced by ESLint):

- A feature **must not** import from another feature's internals; only from its `index.ts`. If two features need the same thing, move it to `shared/`.
- `shared/` must never import from `features/` or `app/`.
- **Routing:** each feature exports its routes from `index.ts` using `lazy: async () => ({ Component: (await import('./pages/XPage')).XPage })`, so every screen is its own chunk. Keep `index.ts` light — never re-export page components statically from it.
- Use `paths` from `@/shared/lib/paths` for every link and route path; never hard-code URL strings.
- All learner-facing text goes through `useT()` (see "Screen texts and languages" below). No literal UI strings in learner screens.
- Call the backend only through `apiRequest(path, { schema })` from `@/shared/lib/api/client`, which validates every response with Zod. (Nothing calls it yet: there is no backend.)
- **Layouts:** learner routes sit under `PhoneLayout`. Full-bleed screens (landing, onboarding steps) are its direct children and handle their own safe areas; every other learner screen goes under `ScreenLayout`. The admin area is outside `PhoneLayout`, in its own wider `AdminLayout`.
- **Route map:** `/` landing · `/sign-in` and `/sign-up` (one screen, two halves) · `/onboarding` (redirects to its first step) · `/onboarding/language` · `/onboarding/profile` · `/onboarding/placement` · `/placement-test` (placeholder) · `/home` · `/practice` · `/lessons` · `/profile` · `/admin` (redirects to texts) · `/admin/texts` · `/admin/landing` · `/admin/languages` · `/admin/profiles`.
- **Entry flow:** landing → sign in / sign up → onboarding. The landing page's "Get Started" opens `/sign-up`, its "Sign in" link opens `/sign-in`; "Continue as Guest" there goes on to `/onboarding`.
- **Onboarding steps** (in order: language → profile → placement intro) are built with `OnboardingStep` (`features/onboarding/components`): heading, scrollable content, primary action pinned in the thumb zone. Questions use `ChoiceList`. The learner's language is saved in `useLanguageStore` (shared, see below); other answers (`ageGroup`) in `useOnboardingStore`. Each new step gets its own path under `/onboarding/`, and the previous step's Continue navigates to it.
- **Age groups** (`child` 6–12, `teen` 13–18, `adult` 18+) are fixed in `shared/lib/learner/ageGroups.ts`, not admin settings, because content and safety rules will branch on them.
- Use the `@/` path alias for `src/` (e.g. `@/shared/ui/Button`).
- One component per file. File name = component name in PascalCase (`ChatBubble.tsx`). Hooks are `useXxx.ts`. Non-component modules are camelCase.
- Colocate tests (`Button.test.tsx`) and stories/examples next to the component.

### Admin-managed settings (runtime config)

Content an admin can change is never hard-coded in components. Settings objects (schemas and hooks all in `shared/lib/appConfig/`, because both the learner screens and the admin editors use them): `landing` (logo, hero image, overlay text, button labels), `languages` (learner languages with flags), `learner-profiles` (a male and a female picture per age group), and `screen-texts` (per-language text overrides; schema in `shared/lib/i18n/screenTexts.ts`). The pattern:

- One Zod schema per settings object. Build it from `appConfig/fields` (`assetUrl`, `text`, `optionalText`, `languageTag`, `section`). **Every field has a default** (`.catch(default)`), so an empty, partial or partly invalid value still yields a complete config. For lists, keep the valid entries and fall back to the default list only when none are usable.
- Image fields use `assetUrl`: `https:` URLs, root-relative paths, or uploaded raster `data:image/(png|jpeg|webp)` URLs. Never SVG data URLs or other schemes. Settings text is rendered as plain text, never HTML. Images from settings need an `onError` fallback.
- **Storage — no backend yet.** `settingsRepository` (`appConfig/settingsRepository.ts`) keeps settings in this browser's `localStorage` and notifies subscribers in every tab. It is the single place to swap for `GET/PUT /api/app-config/<name>` later (`TODO(backend)`); nothing else may touch settings storage.
- Read with `useAppConfig({ name, schema, defaults })`, wrapped in a small `use<Name>Config()` hook. It is synchronous and live: defaults until an admin saves, then every open screen re-renders on each save. Screens never show a loading state for settings.
- Button destinations and behaviour stay in code (`paths`); settings carry content only.
- The installed-app icon, name and splash color come from the build-time web manifest and are **not** runtime-configurable.

### Screen texts and languages

The whole app is shown in the language the learner chose. They can choose it in two places: the language picker on the account screen (`AuthLanguageSelect`, for reading that screen before onboarding) and the onboarding language step; both save to the same `useLanguageStore`, so a choice made on the account screen is pre-selected on the language step. Until they choose, everything is English. There is no runtime machine translation: every text is a stored text.

- Catalogs live in `shared/lib/i18n/`: `en.ts` is the source of truth for keys; `bn.ts` and `hi.ts` are typed `TextCatalog`, so **adding a key to `en.ts` requires it in `bn.ts` and `hi.ts` too** (compile error otherwise). Bengali and Hindi were written by the assistant and still need a native speaker's review.
- In components call `const t = useT()` and then `t('key')`. **Never call it at module scope** and never keep translated strings in module-level constants: keep the key (see `ageGroups.ts`, `themes.ts`) and translate while rendering. There is deliberately no global `t`.
- Lookup order for a key: admin's text for the language → built-in text for the language → admin's English → built-in English. A regional code (`bn-IN`) falls back to its base (`bn`). A language the admin adds has no texts until they are entered under Admin › Screen texts; it shows English meanwhile.
- The learner's language is `useLanguageStore().language` (`null` until chosen → English). `AppLanguageProvider` applies it app-wide and keeps `<html lang>` in sync. `I18nProvider` can be nested to show part of a screen in another language (the language step previews the highlighted language this way) — wrap that part in an element with the matching `lang`.
- Use `isEnglish(language)` when behaviour depends on the learner having a mother tongue (e.g. the placement intro hides "Translate" for English-only learners).
- The **landing page is not translated per learner**: it is shown before a language is chosen, so its wording is content in the `landing` settings. Its headline is instead written once per language (`overlay.headlines`, up to 8) and `HeadlineSlider` rotates through them: every 5 seconds the current one slides out to the left and the next slides in from the right. The language names under it jump to a headline and stop the rotation.
- New text keys should get a home in `features/admin/lib/textGroups.ts` so they are grouped by screen in the editor (unlisted keys still appear, under "Other"). Admin › Screen texts has a "Screen" picker built from those groups, so an admin can show one screen's texts at a time; guidance for a whole group goes in `adminText.texts.groupNotes`.

### Admin area, sign-in and sign-up

- `features/admin` holds the editors for all settings objects, built from `AdminPage` (heading + pinned Save / Discard / Reset bar), `AdminSection`, `ImageField` and `useSettingsDraft` (draft → save through `settingsRepository`). A new settings object needs an editor page there.
- Admin wording is **English only** and lives in `features/admin/adminText.ts` — not in the screen-text catalogs, so admins are not asked to translate their own tools.
- Image uploads are shrunk and re-encoded in the browser (`features/admin/lib/imageUpload.ts`) and stored as `data:` URLs, because there is no server to upload to. Browser storage is limited (about 5 MB in total); `TODO(backend)` replaces this with real uploads.
- **One account screen** (`features/auth/pages/AuthPage`) serves `/sign-in` and `/sign-up`: the two paths are children of one route, so the screen stays mounted and keeps what was typed while the visitor switches halves (switching replaces the history entry, so Back leaves the screen). Its brand lockup and the name in its title come from the `landing` settings; a `{brand}` placeholder in the `auth.title` text marks where the name goes.
- **Its language picker** lists the languages from the `languages` settings (plus English if an admin removed it), by their own names, and saves the choice as the learner's language for the whole app.
- **Learner accounts do not exist yet** (no backend). The screen is honest about it: "Create Account", "Continue with Google" and "Forgot password?" answer with the `auth.unavailable` notice and never store what was typed; only "Continue as Guest" moves a learner forward. The mockup's OTP hint and Terms & Privacy line are deliberately left out until OTP verification and those pages exist (`TODO(auth)`, `TODO(legal)`), as is its illustration (no artwork yet). Form rules live in `features/auth/lib/credentialsSchema.ts`, whose messages are screen-text keys.
- **Admin sign-in is a local, testing-only stand-in** (`features/auth/lib/localAdmin.ts`), entered on the sign-in half of that screen (the admin's name goes in the email field, which is why signing in does not insist on an email address): default credentials `admin` / `Kuhedu@123`, checked in the browser. It is not security — the credentials are readable in the shipped code — and is acceptable only while edits affect nothing but the editor's own browser. Env: `VITE_LOCAL_ADMIN=false` disables it; `VITE_LOCAL_ADMIN_USERNAME` / `VITE_LOCAL_ADMIN_PASSWORD` change the credentials. Admin routes are guarded by the `requireAdmin` loader in `app/router.tsx`. `TODO(auth)`: replace with server-side authentication before any backend or public launch; learner accounts do not exist yet.

## 4. Component reusability

The design system in `src/shared/ui` is the single source of truth for UI. Screens are **compositions**, not one-off styling.

1. **Check before creating.** Before writing any new UI, look in `src/shared/ui` and the current feature's `components/`. Extend an existing component (new variant/prop) instead of duplicating it.
2. **Rule of two.** When the same UI pattern appears in a second place, extract it. Feature-specific → `features/x/components`; used by more than one feature → `shared/ui`.
3. **Layered components:**
   - _Primitives_: `Button`, `IconButton`, `Text`, `Heading`, `Card`, `Avatar`, `Badge`, `Input`, `Switch`, `ProgressBar`, `Skeleton`, `Spinner`.
   - _Patterns_: `BottomSheet`, `Dialog`, `Toast`, `ListItem`, `EmptyState`, `ErrorState`, `TopBar`, `BottomNav`, `SegmentedControl`, `Chip`.
   - _Feature components_: `ChatBubble`, `MicButton`, `Waveform`, `PronunciationScore`, `LessonCard`, built from the layers above.
   - _Built so far_ (`src/shared/ui`): `Button` (variants `primary | secondary | outline | ghost`, sizes `md | lg`, `fullWidth`, `asChild`), `ChoiceList` (single-choice list of tappable cards with optional media and description — use it for every "pick one" question), `IconButton` (icon-only, `label` required, `asChild` for links), `TextField` / `TextAreaField` / `SelectField` (label, hint and error wired up; shared look via `fieldStyles.ts`; `TextField` also takes `startAdornment` / `endAdornment`), `PasswordField` (a `TextField` with a show/hide button), `CompactSelect` (pill-shaped native select with a hidden label, for headers and toolbars), `SegmentedControl` (row of exclusive choices; scrolls, or `fullWidth` to share the width equally), `BrandLockup` (logo + name + tagline).
4. **API design:**
   - Variants via a `variant` / `size` prop mapped with `cva` (class-variance-authority). No boolean prop explosions (`isPrimary`, `isLarge`, ...).
   - Forward refs and spread remaining native props (`...rest`) onto the root element so components work with forms, Radix and tests.
   - Accept `className` for layout adjustments only (margin, grid placement), and merge it with `cn()` (`clsx` + `tailwind-merge`). Do not use it to restyle a component's internals.
   - Prefer composition (`children`, compound components like `<Card.Header>`) over large prop configurations.
   - Use `asChild` (Radix `Slot`) when a component must render as a link or other element.
5. **Presentational vs. container.** `shared/ui` components are pure: no data fetching, no global store access, no routing side effects. Data wiring happens in feature-level containers/hooks.
6. **No magic values.** Colors, spacing, radii, shadows, z-index, durations and easings come from tokens. Never hard-code hex values or arbitrary pixel values (`p-[13px]`) in components.
7. **Typed and documented.** Export prop types (`ButtonProps`). Add a short JSDoc on non-obvious props.

## 5. Mobile-first UI/UX standards

The bar is **native-app quality**. If it would feel out of place next to a top-tier iOS/Android app, it is not done.

### Layout

- Write base styles for a **360px-wide** viewport; add `sm:`/`md:`/`lg:` enhancements upward. Never design desktop-first and shrink.
- Test widths: 320 (small), 360/390/430 (common phones), 768 (tablet), 1280 (desktop). No horizontal scroll at any width.
- On large screens, constrain the app to a centered column (`max-w-md`/`max-w-lg`) or use a two-pane layout. Do not stretch phone UI across a monitor.
- Use `100dvh` (dynamic viewport), never `100vh`, for full-height screens.
- Respect safe areas: `env(safe-area-inset-*)` for top bars, bottom nav, sticky footers and FABs. Use `viewport-fit=cover` in the viewport meta.
- Keep primary actions in the **thumb zone** (bottom third). Use a bottom navigation (max 5 items), bottom sheets instead of centered modals, and sticky bottom CTAs.
- Handle the on-screen keyboard: inputs stay visible when focused (use the `visualViewport` API where needed), and the chat composer docks above the keyboard.

### Visual design

- Spacing on a **4px grid** (tokens: 1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px). Default screen gutter: 16px.
- Type scale from tokens. Body text **≥ 16px** (this also prevents iOS zoom-on-focus). Line height 1.4–1.6. Fonts: Nunito for Latin text; Baloo Da 2 supplies Bengali glyphs and Baloo 2 Devanagari (Hindi) ones, each downloaded only when its script is on screen. These are the built-in languages; scripts of languages an admin adds later (Tamil, ...) use the device's own fonts. Always set `lang` on text in another language (e.g. `lang="bn"`).
- Use clear visual hierarchy: one primary action per screen, with secondary actions visually quieter.
- **Named themes, chosen by the user.** Each theme is one complete look (light or dark): Indigo Dawn (default), Morning Bliss, Sage Dusk, Midnight Iris, plus "Auto" (follows the device: Indigo Dawn / Midnight Iris). Components use semantic token utilities only, so they work in every theme without `dark:` variants; never write a color that assumes a particular theme.
  - A theme = one `[data-theme='<id>']` block in `tokens.css` + an entry in `src/shared/theme/themes.ts` + a name in `en.ts` + its id in the boot script in `index.html`. `themes.contrast.test.ts` enforces that every theme defines every token and meets WCAG AA.
  - `<html data-theme data-scheme>` is set before first paint by the boot script and kept in sync by `useApplyTheme`. `data-theme` also works on any subtree (used for the picker previews); a subtree must set its own `bg-*`/`text-*` classes because inherited colors are already resolved.
  - Text over photos uses `text-on-hero` / `text-on-hero-muted` on a `bg-hero-scrim` scrim sized by the text itself, never by a fixed share of the screen.
- Color contrast meets **WCAG AA** (4.5:1 text, 3:1 large text and UI components).
- Design for all states of every screen: **loading (skeletons, not spinners, for content), empty, error, offline, success**, plus partial data.
- Avoid generic "template" looks. The tutor experience should feel warm, encouraging and personal: friendly illustration/avatar, celebratory micro-moments for streaks and wins.

### Motion

- Motion should communicate (state change, spatial relationship, feedback), not decorate.
- Durations: 100–200ms for micro-interactions, 200–350ms for screen/sheet transitions. Use token easings.
- Content that takes turns in one place (see `HeadlineSlider`): stack every item in the same grid cell so the block is as tall as the tallest and nothing below moves; hide the inactive ones with `invisible` + `aria-hidden`; animate the pair with `animate-slide-out-left` / `animate-slide-in-left`; clip sideways with `overflow-x-clip` on a wrapper that reaches the screen edges. Do not rotate while `document.hidden`.
- Looping animation is rare and must carry meaning. The cases so far: the headline rotation above, and `animate-coin-flip`, which turns a two-faced coin (`ProfileAvatar`: male picture on the front, female on the back). For 3D turns, put `perspective-*` on an outer element that does not clip, `transform-3d` on the turning element, and `backface-hidden` on each face (round the faces themselves; `overflow-hidden` on an ancestor flattens the 3D). Anything that loops needs a still fallback via `motion-reduce:`.
- Animate only `transform` and `opacity`. No animating layout properties on scrolling content.
- Honor `prefers-reduced-motion`: replace movement with fades or no animation.

## 6. Touch & interaction

- **Touch targets ≥ 44×44 CSS px** (48 preferred), with ≥ 8px between adjacent targets. Expand hit areas with padding or pseudo-elements when the visual is smaller.
- Every interactive element gives **immediate feedback** (< 100ms): pressed state (`active:` scale/opacity), plus a ripple or highlight where appropriate. Remove the default tap flash with `-webkit-tap-highlight-color: transparent` and provide our own.
- No hover-only functionality. Hover styles go behind `@media (hover: hover)`.
- Use `touch-action: manipulation` on interactive controls to remove double-tap-zoom delay. Do **not** disable user zoom in the viewport meta.
- Gestures (swipe to dismiss a sheet, pull to refresh, swipe between cards) are **enhancements**. Each must have a visible button alternative.
- Use **Pointer Events** (`onPointerDown/Up/Cancel`) rather than separate mouse/touch handlers. Always handle `pointercancel`.
- **Haptics:** use the `useHaptics` hook (wrapping `navigator.vibrate`, feature-detected) for key moments: recording start/stop, correct answer, error. Keep it subtle and let users disable it.
- Prevent accidental actions: confirm destructive actions, and offer undo (via toast) where possible.
- Use `overscroll-behavior: contain` on scroll containers inside sheets and the chat list to avoid scroll chaining and accidental pull-to-refresh.
- Set the correct `inputmode`, `enterkeyhint`, `autocomplete` and `autocapitalize` on every input.

## 7. Voice & audio (core to this app)

- **Mic permission UX:** never request microphone access on load. Explain why first (a pre-permission screen), request it on a user tap, and handle _denied_ and _unavailable_ states with recovery instructions per platform.
- Recording control: support both **tap-to-toggle** and **press-and-hold** on the `MicButton`, with a clear recording state (color, pulse, live waveform, timer), haptic on start/stop, and slide-to-cancel when holding.
- **iOS Safari quirks:** create/resume `AudioContext` only inside a user gesture; test `getUserMedia` and `MediaRecorder` in Safari and in standalone (installed) PWA mode; detect supported MIME types (`audio/webm` vs `audio/mp4`) and do not assume one.
- Stream audio and AI responses where possible to cut perceived latency. Show a "tutor is thinking/speaking" state immediately.
- Always show a **text transcript** alongside audio (accessibility, noisy environments, learning value). Offer replay and slower playback of tutor audio.
- Release the mic (stop all tracks) when recording ends, when the screen loses visibility, and on unmount.
- Use the Screen Wake Lock API during active conversation sessions (feature-detected).
- All audio/speech logic lives in `shared/lib/audio` and feature hooks, not inside UI components.

## 8. PWA requirements

- Valid manifest: name, short_name, `display: standalone`, theme/background colors (light + dark), `start_url`, `scope`, maskable + regular icons (192, 512), and screenshots for the richer install UI.
- Service worker via `vite-plugin-pwa` with `registerType: 'prompt'`. Show an "Update available" toast and never silently reload mid-session.
- Caching strategy: precache the app shell; use stale-while-revalidate for lesson content and images; network-only for AI conversation endpoints.
- **Offline:** the app shell, downloaded lessons, vocabulary review and progress history work offline. AI conversation shows a clear offline state. Queue progress writes and sync when back online.
- Custom install prompt (`beforeinstallprompt`) shown at a meaningful moment (e.g. after the first completed session), never on first load. Provide iOS "Add to Home Screen" instructions.
- Use the standalone display mode to adjust UI (`@media (display-mode: standalone)`), for example hiding web-only install banners.

## 9. Performance budgets

- Targets on a mid-range Android over 4G: **LCP < 2.5s, INP < 200ms, CLS < 0.1**. Lighthouse PWA/Performance/Accessibility ≥ 90.
- Initial JS **< 170KB gzipped**. Code-split every route with `React.lazy`, and lazy-load heavy modules (audio visualizers, charts, confetti).
- Images: AVIF/WebP, explicit `width`/`height`, `loading="lazy"` below the fold. Prefer SVG for icons and illustrations.
- Fonts: self-hosted, subset, `font-display: swap`, preload only the primary weight.
- Virtualize long lists (chat history, vocabulary).
- Avoid unnecessary re-renders: select narrow slices from Zustand, memoize only where profiling shows a need.

## 10. Accessibility

- Semantic HTML first (`button`, `nav`, `main`, headings in order). ARIA only when semantics are not enough.
- Every icon-only button has an `aria-label`. Every image has meaningful `alt` (or `alt=""` if decorative).
- Visible focus states (`focus-visible`) for keyboard and switch users.
- Live regions (`aria-live="polite"`) announce new tutor messages and feedback results.
- Anything that changes by itself for more than 5 seconds (rotating text, carousels) needs a visible control that stops it, and must not be a live region.
- Support text scaling up to 200% without broken layouts. Use `rem` for type.
- Never convey meaning by color alone (for example, pronunciation scores also use icons or labels).

## 11. Code conventions

- TypeScript `strict`. No `any`; use `unknown` and narrow it. Validate all API responses with Zod at the boundary.
- Functional components and hooks only. Keep components under ~150 lines; extract hooks/subcomponents beyond that.
- Name event props `onXxx` and handlers `handleXxx`.
- No inline styles except for dynamic values (e.g. waveform heights). Use Tailwind classes with tokens.
- Learner-facing text goes through `useT()` and the catalogs (see §3, "Screen texts and languages"); admin wording through `adminText`. No literal UI strings in components.
- Handle errors explicitly: an error boundary per route, user-friendly messages, and retry actions.
- Write comments only for _why_, not _what_.

## 12. Security & privacy

- **Never put AI/LLM, speech or other secret API keys in client code.** All AI calls go through our backend/API proxy.
- Treat voice recordings as sensitive personal data: explain retention, provide delete-my-data, and do not log raw audio or transcripts to analytics.
- Sanitize any rendered AI output. Never use `dangerouslySetInnerHTML` with model output.
- **The local admin sign-in is a testing stand-in, not security** (see §3, "Admin area and sign-in"). Do not put anything behind it that must actually be protected, and do not reuse its pattern for learner accounts.
- Anything read from browser storage (settings, saved answers, session) is untrusted input: validate it with its schema or a type guard before use, as the existing stores and `useAppConfig` do.

## 13. Testing & definition of done

A change is **done** only when:

- [ ] It works at 360px width and at desktop width, in every named theme (check at least one light and one dark).
- [ ] Touch targets, pressed states and safe areas have been checked.
- [ ] Loading, empty, error and offline states exist where relevant.
- [ ] It is keyboard and screen-reader usable (labels, focus, live regions).
- [ ] It reuses `shared/ui` components; any new reusable piece was added there.
- [ ] `npm run lint`, `npm run typecheck` and `npm test` pass.
- [ ] Shared UI components and key hooks have unit tests; critical flows (onboarding, a conversation turn) have Playwright tests on a mobile viewport (e.g. Pixel 7, iPhone 14).

## 14. Commands

```bash
npm run dev                  # dev server (also on LAN via --host, for testing on a real phone)
npm run build                # typecheck + production build (generates the service worker)
npm run preview              # serve the build — test PWA/service worker/install here, not in dev
npm run lint
npm run typecheck
npm run format               # Prettier (sorts Tailwind classes)
npm test                     # Vitest unit/component tests
npm run test:e2e             # Playwright: builds, previews, runs pixel-7 / iphone-14 / desktop
npm run generate-pwa-assets  # regenerate icons in public/ after changing public/logo.svg
```

Notes:

- Styling tokens live in `src/shared/styles/tokens.css`. Tailwind's default palette, type scale, radii and shadows are **cleared**, so only token utilities exist (`bg-surface`, `text-fg-muted`, `bg-primary`, `rounded-lg`, `shadow-md`, ...). Spacing uses Tailwind's default 4px scale. Custom utilities: `pt-safe`, `pb-safe`, `px-safe`, `px-gutter`, `touch-target`, `scroll-contained`, `animate-rise-in`, `animate-coin-flip`, `animate-slide-in-left`, `animate-slide-out-left`.
- Bundled default artwork lives in `public/` (`logo.svg`, `flags/`, `avatars/`) and is what settings fall back to. These are placeholder drawings, meant to be replaced through Admin settings.
- Import `ThemePicker` from `@/shared/theme/ThemePicker`, not the `@/shared/theme` barrel: the app shell imports the barrel, and anything exported there lands in the initial bundle.
- Playwright runs with service workers blocked so `page.route()` mocks are reliable. `e2e/helpers.ts` has `seedLanguage`, `seedSettings` and `signInAsAdmin`; side-by-side tests open two pages in one browser context.
- Tests that need settings write them with `settingsRepository.write(name, value)` (unit) or `seedSettings` (e2e); reset stores and `localStorage` in `beforeEach`.
- Tailwind v4's `hover:` variant already applies only on devices that can hover.
- ESLint is pinned to v9 because `eslint-plugin-jsx-a11y` does not support v10 yet.
- Playwright's `iphone-14` project needs WebKit, which may be missing system DLLs on Windows. Run it on macOS/Linux/CI, or use `--project=pixel-7 --project=desktop` locally.

## 15. Working agreement for Claude

- Work on **one piece at a time**, as requested. Do not build ahead.
- Before writing UI, list which existing `shared/ui` components you will reuse and which (if any) new ones you will create, and why.
- Before structural changes or adding dependencies, state the plan briefly and why.
- Keep this file current: when a decision changes (stack, structure, conventions), update the relevant section in the same change.
