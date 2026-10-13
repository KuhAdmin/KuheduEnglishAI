import type { Env } from '../env.ts'

export type Mail = { to: string; subject: string; text: string }

/** Whatever sends the server's mail. Tests give one that only remembers what it was handed. */
export type Mailer = { send: (mail: Mail) => Promise<void> }

type MailSettings = Pick<
  Env,
  'NODE_ENV' | 'RESEND_API_KEY' | 'RESEND_FROM_EMAIL' | 'SMTP_URL' | 'MAIL_FROM'
>

/**
 * What becomes of a mail that could not be sent. `throw`: the caller is told, as real people's
 * server must be. `log`: it is written to the log with the reason, as if sending had never been
 * set up, so that a developer whose mail service is not ready yet can still read their code.
 */
export type OnMailFailure = 'throw' | 'log'

/** The name a mail is shown as coming from, when a setting gives only an address. */
const SENDER_NAME = 'Kuhedu Lingo'
const RESEND_URL = 'https://api.resend.com/emails'
/** A mail service that has not answered in this long is not going to. */
const RESEND_TIMEOUT_MS = 15_000

/** Which of the ways to send this machine is set up for; `log` is a developer's stand-in. */
export const mailRoute = (env: MailSettings): 'resend' | 'smtp' | 'log' =>
  env.RESEND_API_KEY ? 'resend' : env.SMTP_URL ? 'smtp' : 'log'

/** Who the mail is from, as this machine's way of sending has it. */
export function mailSender(env: MailSettings): string {
  const address = mailRoute(env) === 'resend' ? env.RESEND_FROM_EMAIL : undefined
  if (!address) return env.MAIL_FROM
  // Given as an address alone, it is shown with the app's name.
  return address.includes('<') ? address : `${SENDER_NAME} <${address}>`
}

/** Send through Resend's own service, over HTTPS: nothing to install, and no mail port to open. */
function resendMailer(apiKey: string, from: string): Mailer {
  return {
    send: async ({ to, subject, text }) => {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      })
      if (response.ok) return
      // What Resend says went wrong (a domain not verified, a key withdrawn), for the log. The
      // key itself is in no part of it.
      const said = await response.text().catch(() => '')
      throw new Error(`Resend refused the mail (${response.status}): ${said.slice(0, 300)}`)
    },
  }
}

const written = ({ to, subject, text }: Mail, why: string) =>
  `Mail not sent (${why}). To ${to}: ${subject}\n${text}`

/** The real way of sending this machine is set up for, if any. */
async function realMailer(env: MailSettings, from: string): Promise<Mailer | null> {
  if (env.RESEND_API_KEY) return resendMailer(env.RESEND_API_KEY, from)
  if (!env.SMTP_URL) return null

  // Loaded only where mail is really sent this way.
  const { createTransport } = await import('nodemailer')
  const transport = createTransport(env.SMTP_URL)
  return {
    send: async (mail) => {
      await transport.sendMail({ from, ...mail })
    },
  }
}

/**
 * The mailer for this machine. Resend if its key is set, else a mail server (`SMTP_URL`);
 * otherwise each mail is written to the server's log, which is how a developer reads the code
 * they were "sent". `readEnv` has already refused to start a production server that cannot send.
 *
 * A mail that fails is the caller's to hear of where real people use the server. Anywhere else
 * it is written to the log like one that was never sent, unless `onFailure` says otherwise: a
 * code must never be in the log of a server real people use, and never be lost on a developer's.
 */
export async function createMailer(
  env: MailSettings,
  log: (line: string) => void,
  onFailure: OnMailFailure = env.NODE_ENV === 'production' ? 'throw' : 'log',
): Promise<Mailer> {
  const real = await realMailer(env, mailSender(env))
  if (!real) {
    return { send: async (mail) => log(written(mail, 'no RESEND_API_KEY or SMTP_URL')) }
  }
  if (onFailure === 'throw') return real

  return {
    send: async (mail) => {
      try {
        await real.send(mail)
      } catch (error) {
        log(written(mail, error instanceof Error ? error.message : String(error)))
      }
    },
  }
}
