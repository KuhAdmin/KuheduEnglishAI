import { argon2, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Passwords are kept as argon2id hashes, made by Node itself. The numbers are OWASP's smallest
 * recommended setting: 19 MiB of memory, two passes, one lane. Each hash carries its own, so
 * they can be raised later without anyone's password having to change at once.
 */
const MEMORY_KIB = 19_456
const PASSES = 2
const PARALLELISM = 1
const SALT_BYTES = 16
const HASH_BYTES = 32

type Cost = { memory: number; passes: number; parallelism: number }

function derive(password: string, salt: Buffer, cost: Cost, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      { message: password, nonce: salt, tagLength: length, ...cost },
      (error, derived) => (error ? reject(error) : resolve(Buffer.from(derived))),
    )
  })
}

// The usual way of writing an argon2 hash down, salt and cost included.
const encode = (bytes: Buffer) => bytes.toString('base64').replace(/=+$/, '')
const FORMAT = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const cost = { memory: MEMORY_KIB, passes: PASSES, parallelism: PARALLELISM }
  const hash = await derive(password, salt, cost, HASH_BYTES)
  return `$argon2id$v=19$m=${cost.memory},t=${cost.passes},p=${cost.parallelism}$${encode(salt)}$${encode(hash)}`
}

/** Whether the password is the one the hash was made from. Never throws on a hash it cannot read. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = FORMAT.exec(stored)
  if (!parts) return false
  const [, memory, passes, parallelism, salt, hash] = parts
  const expected = Buffer.from(hash ?? '', 'base64')
  const cost = {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
  }
  try {
    const actual = await derive(password, Buffer.from(salt ?? '', 'base64'), cost, expected.length)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

let decoy: Promise<string> | undefined

/**
 * Spend the time a real check takes, on a hash that nothing matches: an address without an
 * account must not be told apart from a wrong password by how fast the answer comes.
 */
export async function pretendToVerify(password: string): Promise<false> {
  decoy ??= hashPassword(randomBytes(SALT_BYTES).toString('hex'))
  await verifyPassword(password, await decoy)
  return false
}
