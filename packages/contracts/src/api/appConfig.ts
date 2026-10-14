import { z } from 'zod'
import { APP_CONFIG_NAMES, MAX_OVERRIDE_TEXT_LENGTH, TEXT_SCOPES } from '../content/settings.ts'

/**
 * What an admin manages besides the lessons, as the server keeps it (see `content/settings.ts`).
 * Anyone may read it all at once; only an admin may change it.
 */

export const appConfigNameSchema = z.enum(APP_CONFIG_NAMES)
export const textScopeSchema = z.enum(TEXT_SCOPES)

/**
 * Reworded texts, by language then key: `{ bn: { 'home.title': '…' } }`. The app reads them
 * with its own settings schemas, which keep the keys it knows.
 */
const textsByLanguage = z.record(z.string(), z.record(z.string(), z.string()))

/**
 * `GET /api/app-config`: every settings object kept whole (`null` where an admin wrote nothing,
 * and the app shows what it has built in), and every reworded text by scope.
 */
export const appConfigResponseSchema = z.object({
  settings: z.record(appConfigNameSchema, z.unknown().nullable()),
  texts: z.record(textScopeSchema, textsByLanguage),
})

export type AppConfigResponse = z.infer<typeof appConfigResponseSchema>

/** A settings object with the number of its save, which the next save must name. */
const storedSetting = z.object({
  name: appConfigNameSchema,
  value: z.unknown(),
  version: z.number().int().min(1),
})

/** `GET /api/admin/app-config`: everything kept, with versions, for the editors to open with. */
export const storedAppConfigSchema = z.object({
  settings: z.array(storedSetting),
  texts: z.record(textScopeSchema, textsByLanguage),
})

export type StoredAppConfig = z.infer<typeof storedAppConfigSchema>

/** A settings object's name in an address (`/api/admin/app-config/landing`). */
export const appConfigParamsSchema = z.object({ name: appConfigNameSchema })

/**
 * `PUT /api/admin/app-config/:name`: the whole object, and the version it was written from (`0`
 * when there was none). Another admin's save in between is not written over: 409.
 */
export const appConfigSaveSchema = z.object({
  value: z.unknown(),
  version: z.number().int().min(0),
})

export const appConfigSavedSchema = z.object({ version: z.number().int().min(1) })

/** `DELETE …`: the version being removed, by the same rule. */
export const appConfigRemoveSchema = z.object({ version: z.coerce.number().int().min(0) })

/** A scope in an address (`/api/admin/app-config/texts/screen`). */
export const textScopeParamsSchema = z.object({ scope: textScopeSchema })

/**
 * One text changed: what it was when the editor opened (`null`: the built-in wording) and what
 * it is to be (`null`: back to the built-in wording). A text another admin changed since is not
 * written over: the whole batch is refused (409) and nothing of it is kept.
 */
export const textChangeSchema = z.object({
  language: z.string().max(35),
  key: z.string().max(120),
  from: z.string().max(MAX_OVERRIDE_TEXT_LENGTH).nullable(),
  to: z.string().max(MAX_OVERRIDE_TEXT_LENGTH).nullable(),
})

export type TextChange = z.infer<typeof textChangeSchema>

/** Every course text in three languages, and every screen text in three, with room to spare. */
export const MAX_TEXT_CHANGES = 5000

/** `PATCH /api/admin/app-config/texts/:scope`. */
export const textChangesSchema = z.object({
  changes: z.array(textChangeSchema).min(1).max(MAX_TEXT_CHANGES),
})
