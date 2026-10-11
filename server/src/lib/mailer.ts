import type { Env } from '../env.ts'

export type Mail = { to: string; subject: string; text: string }

/** Whatever sends the server's mail. Tests give one that only remembers what it was handed. */
export type Mailer = { send: (mail: Mail) => Promise<void> }

/**
 * The mailer for this machine: a real one where sending is set up; otherwise each mail is
 * written to the server's log, which is how a developer reads the code they were "sent".
 * `readEnv` has already refused to start a production server that cannot send.
 */
export async function createMailer(
  env: Pick<Env, 'SMTP_URL' | 'MAIL_FROM'>,
  log: (line: string) => void,
): Promise<Mailer> {
  const { SMTP_URL: url, MAIL_FROM: from } = env
  if (!url || !from) {
    return {
      send: async ({ to, subject, text }) =>
        log(`Mail not sent (no SMTP_URL). To ${to}: ${subject}\n${text}`),
    }
  }

  // Loaded only where mail is really sent.
  const { createTransport } = await import('nodemailer')
  const transport = createTransport(url)
  return {
    send: async (mail) => {
      await transport.sendMail({ from, ...mail })
    },
  }
}
