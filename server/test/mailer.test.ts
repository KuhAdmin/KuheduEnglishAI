import { createServer, type Server } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readEnv } from '../src/env.ts'
import { createMailer, mailRoute, mailSender } from '../src/lib/mailer.ts'
import { codeMail } from '../src/modules/auth/codes.ts'

/** What a mail server was handed, as it was said to it. */
type Received = { from: string; to: string[]; message: string }

/**
 * A mail server for the test: it speaks just enough of the protocol to take one message at a
 * time, on this machine only, and keeps what it was given. No password, no encryption.
 */
function fakeMailServer() {
  const received: Received[] = []
  const server: Server = createServer((socket) => {
    let mail: Received = { from: '', to: [], message: '' }
    let inMessage = false
    let pending = ''
    socket.setEncoding('utf8')
    socket.write('220 test ESMTP\r\n')
    socket.on('data', (chunk: string) => {
      pending += chunk
      for (;;) {
        if (inMessage) {
          const end = pending.indexOf('\r\n.\r\n')
          if (end < 0) return
          mail.message = pending.slice(0, end)
          pending = pending.slice(end + 5)
          inMessage = false
          received.push(mail)
          mail = { from: '', to: [], message: '' }
          socket.write('250 kept\r\n')
          continue
        }
        const end = pending.indexOf('\r\n')
        if (end < 0) return
        const line = pending.slice(0, end)
        pending = pending.slice(end + 2)
        const command = line.toUpperCase()
        if (command.startsWith('EHLO') || command.startsWith('HELO')) socket.write('250 test\r\n')
        else if (command.startsWith('MAIL FROM:')) {
          mail.from = /<([^>]*)>/.exec(line)?.[1] ?? ''
          socket.write('250 ok\r\n')
        } else if (command.startsWith('RCPT TO:')) {
          mail.to.push(/<([^>]*)>/.exec(line)?.[1] ?? '')
          socket.write('250 ok\r\n')
        } else if (command === 'DATA') {
          inMessage = true
          socket.write('354 go on\r\n')
        } else if (command === 'QUIT') {
          socket.end('221 bye\r\n')
        } else socket.write('250 ok\r\n')
      }
    })
    socket.on('error', () => {})
  })

  return {
    received,
    listen: () =>
      new Promise<number>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const address = server.address()
          resolve(typeof address === 'object' && address ? address.port : 0)
        })
      }),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

const settings = (extra: Record<string, string> = {}) =>
  readEnv({ PGDATABASE: 'kuhedu', PGUSER: 'kuhedu', PGPASSWORD: 'not used here', ...extra })

let server: ReturnType<typeof fakeMailServer> | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
  vi.unstubAllGlobals()
})

/** Stand in for Resend: remembers what it was asked, and answers as told. */
function fakeResend(
  answer: { status: number; body: unknown } = { status: 200, body: { id: 'm-1' } },
) {
  const asked: { url: string; authorization: string | null; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      asked.push({
        url: String(input),
        authorization: new Headers(init?.headers).get('authorization'),
        body: JSON.parse(String(init?.body)),
      })
      return new Response(JSON.stringify(answer.body), { status: answer.status })
    }),
  )
  return asked
}

describe('sending through Resend', () => {
  const resend = { RESEND_API_KEY: 're_test_key', RESEND_FROM_EMAIL: 'hello@lingo.kuhedu.com' }

  it('hands the mail to Resend with its key, from the address given, shown under the app’s name', async () => {
    const asked = fakeResend()
    const log: string[] = []
    const mailer = await createMailer(settings(resend), (line) => void log.push(line))

    await mailer.send(codeMail('asha@example.com', 'verify_email', '482913'))

    expect(asked).toEqual([
      {
        url: 'https://api.resend.com/emails',
        authorization: 'Bearer re_test_key',
        body: {
          from: 'Kuhedu Lingo <hello@lingo.kuhedu.com>',
          to: ['asha@example.com'],
          subject: '482913 is your Kuhedu Lingo code',
          text: expect.stringContaining('482913'),
        },
      },
    ])
    expect(log).toEqual([])
  })

  it('is used in preference to a mail server when both are set up', async () => {
    const asked = fakeResend()
    const both = settings({ ...resend, SMTP_URL: 'smtp://127.0.0.1:1' })
    expect(mailRoute(both)).toBe('resend')

    await (await createMailer(both, () => {})).send(codeMail('a@example.com', 'verify_email', '1'))
    expect(asked).toHaveLength(1)
  })

  it('keeps a sender written out in full, and falls back to the app’s own when none is given', () => {
    expect(
      mailSender(settings({ ...resend, RESEND_FROM_EMAIL: 'Lingo Team <team@lingo.kuhedu.com>' })),
    ).toBe('Lingo Team <team@lingo.kuhedu.com>')
    expect(mailSender(settings({ RESEND_API_KEY: 're_test_key' }))).toBe(
      'Kuhedu Lingo <hello@lingo.kuhedu.com>',
    )
    // The address for Resend is not used by another way of sending.
    expect(
      mailSender(
        settings({ RESEND_FROM_EMAIL: 'other@example.org', SMTP_URL: 'smtp://127.0.0.1:1' }),
      ),
    ).toBe('Kuhedu Lingo <hello@lingo.kuhedu.com>')
  })

  it('fails with what Resend said, and without its key, when the mail is refused', async () => {
    fakeResend({
      status: 403,
      body: { statusCode: 403, name: 'validation_error', message: 'The domain is not verified.' },
    })
    const mailer = await createMailer(settings(resend), () => {}, 'throw')

    const failure = await mailer.send(codeMail('asha@example.com', 'verify_email', '482913')).then(
      () => null,
      (error: unknown) => error,
    )

    expect(failure).toBeInstanceOf(Error)
    const message = (failure as Error).message
    expect(message).toContain('403')
    expect(message).toContain('The domain is not verified.')
    expect(message).not.toContain('re_test_key')
  })

  const refused = {
    status: 403,
    body: { statusCode: 403, name: 'validation_error', message: 'The domain is not verified.' },
  }

  it('writes a refused mail to the log on a developer’s machine, with why, so the code is not lost', async () => {
    fakeResend(refused)
    const log: string[] = []
    const mailer = await createMailer(settings(resend), (line) => void log.push(line))

    await mailer.send(codeMail('asha@example.com', 'verify_email', '482913'))

    expect(log).toHaveLength(1)
    expect(log[0]).toContain('The domain is not verified.')
    expect(log[0]).toContain('asha@example.com')
    expect(log[0]).toContain('482913')
    expect(log[0]).not.toContain('re_test_key')
  })

  it('never writes a code to the log where real people use the server: the caller hears of it', async () => {
    fakeResend(refused)
    const log: string[] = []
    const production = settings({
      ...resend,
      NODE_ENV: 'production',
      SESSION_SECRET: 'a secret that is at least thirty-two characters',
    })
    const mailer = await createMailer(production, (line) => void log.push(line))

    await expect(
      mailer.send(codeMail('asha@example.com', 'verify_email', '482913')),
    ).rejects.toThrow(/not verified/)
    expect(log).toEqual([])
  })
})

describe('createMailer', () => {
  it('sends a code through the mail server it is given, from the app’s own address', async () => {
    server = fakeMailServer()
    const port = await server.listen()
    const log: string[] = []
    const mailer = await createMailer(
      settings({ SMTP_URL: `smtp://127.0.0.1:${port}` }),
      (line) => void log.push(line),
    )

    await mailer.send(codeMail('asha@example.com', 'verify_email', '482913'))

    expect(server.received).toHaveLength(1)
    const [mail] = server.received
    // Who the mail server is told it is from and for, and what the learner's mail app shows.
    expect(mail?.from).toBe('hello@lingo.kuhedu.com')
    expect(mail?.to).toEqual(['asha@example.com'])
    expect(mail?.message).toContain('From: Kuhedu Lingo <hello@lingo.kuhedu.com>')
    expect(mail?.message).toContain('To: asha@example.com')
    expect(mail?.message).toContain('Subject: 482913 is your Kuhedu Lingo code')
    expect(mail?.message).toContain('482913')
    expect(mail?.message).toContain('10 minutes')
    // Sent, so not written to the log, where a code has no business being.
    expect(log).toEqual([])
  })

  it('sends from another address when the settings name one', async () => {
    server = fakeMailServer()
    const port = await server.listen()
    const mailer = await createMailer(
      settings({
        SMTP_URL: `smtp://127.0.0.1:${port}`,
        MAIL_FROM: 'Kuhedu Lingo <no-reply@example.org>',
      }),
      () => {},
    )

    await mailer.send(codeMail('asha@example.com', 'reset_password', '111222'))

    expect(server.received[0]?.from).toBe('no-reply@example.org')
  })

  it('fails when the mail server cannot be reached, so the caller can say the code did not go', async () => {
    server = fakeMailServer()
    const port = await server.listen()
    await server.close()
    server = undefined
    const mailer = await createMailer(
      settings({ SMTP_URL: `smtp://127.0.0.1:${port}` }),
      () => {},
      'throw',
    )

    await expect(
      mailer.send(codeMail('asha@example.com', 'verify_email', '482913')),
    ).rejects.toThrow()
  })

  it('writes the code to the log on a developer’s machine that has no mail server set up', async () => {
    const log: string[] = []
    const mailer = await createMailer(settings(), (line) => void log.push(line))

    await mailer.send(codeMail('asha@example.com', 'verify_email', '482913'))

    expect(log).toHaveLength(1)
    expect(log[0]).toContain('asha@example.com')
    expect(log[0]).toContain('482913')
  })
})

describe('the settings for sending', () => {
  it('send from the app’s address unless told otherwise', () => {
    expect(settings().MAIL_FROM).toBe('Kuhedu Lingo <hello@lingo.kuhedu.com>')
  })

  it('refuse to start a server real people use without a way to send, and take either way', () => {
    const production = {
      NODE_ENV: 'production',
      SESSION_SECRET: 'a secret that is at least thirty-two characters',
    }
    expect(() => settings(production)).toThrow(/RESEND_API_KEY or SMTP_URL/)
    expect(() => settings({ ...production, SMTP_URL: 'smtp://mail.example.com:587' })).not.toThrow()
    expect(() => settings({ ...production, RESEND_API_KEY: 're_test_key' })).not.toThrow()
  })

  it('never repeat a setting’s value when they say it is wrong', () => {
    const complaint = (() => {
      try {
        readEnv({ PGDATABASE: '', PGUSER: 'kuhedu', PGPASSWORD: 'p', RESEND_API_KEY: 're_secret' })
        return ''
      } catch (error) {
        return String(error)
      }
    })()
    expect(complaint).toContain('PGDATABASE')
    expect(complaint).not.toContain('re_secret')
  })
})
