import { forgotPasswordRequestSchema } from '@kuhedu/contracts'
import { readEnv } from '../env.ts'
import { createMailer, mailRoute, mailSender } from '../lib/mailer.ts'
import { codeMail } from '../modules/auth/codes.ts'

/**
 * Send one mail the way the codes are sent, to see that sending is set up:
 * `npm run mail:test -w @kuhedu/server -- <email>`. It needs a way to send (`RESEND_API_KEY` or
 * `SMTP_URL`); without one the server only writes codes to its log, and there is nothing to try.
 *
 * The code in it is made up and opens nothing. What went wrong, if anything, is printed as the
 * mail service said it, which is usually enough to tell a wrong key from a sender address it
 * may not send as. With Resend, `delivered@resend.dev` is an address that takes the mail and
 * delivers it nowhere.
 */
// Checked as any address a code is sent to is.
const input = forgotPasswordRequestSchema.safeParse({ email: process.argv[2] })
if (!input.success) {
  console.error('Usage: npm run mail:test -w @kuhedu/server -- <email>')
  process.exit(1)
}

const to = input.data.email

const env = readEnv()
const route = mailRoute(env)
if (route === 'log') {
  console.error(
    'Neither RESEND_API_KEY nor SMTP_URL is set, so nothing can be sent: add one to server/.env ' +
      '(see server/.env.example).',
  )
  process.exit(1)
}

// Told of a failure here, whatever kind of machine this is: saying so is the point.
const mailer = await createMailer(env, (line) => console.log(line), 'throw')
try {
  await mailer.send(codeMail(to, 'verify_email', '000000'))
  console.log(
    `Sent to ${to} through ${route === 'resend' ? 'Resend' : 'the mail server'}, from ${mailSender(env)}. ` +
      'Check that it arrived, and not as spam.',
  )
} catch (error) {
  console.error(`Not sent: ${error instanceof Error ? error.message : String(error)}`)
  // Not `process.exit`: on Windows that trips over the connection still closing.
  process.exitCode = 1
}
