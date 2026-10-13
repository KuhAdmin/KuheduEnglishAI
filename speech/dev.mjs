// `npm run dev:speech`, `npm run dev:scorer` and `npm run dev:grader`: start one of the services
// the server calls on this machine. The first two are Python, each with the Python of its own
// environment, whose place differs between Windows and everything else (the two cannot share an
// environment). The third is Ollama, a program of its own. See README.md for setting them up.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const SERVICES = {
  // The app's voice (Kokoro, and Indic-TTS for Bengali).
  speech: { environment: '.venv', module: 'tts' },
  // What is heard in a learner's recording: the sounds of a word (OpenPronounce), the words of a
  // reply (Whisper).
  scorer: { environment: '.venv-assess', module: 'assess.service' },
  // What reads a learner's reply as a teacher would (Qwen, run by Ollama).
  grader: { program: 'ollama' },
}

const service = SERVICES[process.argv[2] ?? 'speech']
if (!service) {
  console.error(`Which service? One of: ${Object.keys(SERVICES).join(', ')}.`)
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))

/** A program to run until it is stopped, and this script with it. */
function run(program, args, options) {
  const running = spawn(program, args, { stdio: 'inherit', ...options })
  const stop = () => running.kill()
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  running.once('error', (error) => {
    console.error(`${program} could not be started: ${error.message}`)
    process.exit(1)
  })
  running.once('exit', (code) => process.exit(code ?? 0))
}

if (service.program === 'ollama') {
  // Where Ollama is and where it keeps its models are this machine's own business, so they are
  // read from the server's settings file like the rest (`OLLAMA_BIN`, `OLLAMA_MODELS`,
  // `OLLAMA_TMPDIR`: see server/.env.example). Left out, it is the `ollama` on the PATH with its
  // own defaults.
  // Only those are taken from the file: the rest of it is secrets, and none of Ollama's business.
  const settings = join(here, '..', 'server', '.env')
  const written = existsSync(settings) ? parseEnv(readFileSync(settings, 'utf8')) : {}
  const ours = Object.fromEntries(
    Object.entries(written).filter(([name]) => name.startsWith('OLLAMA_') || name === 'GRADER_URL'),
  )
  const env = {
    // One model, one reply at a time, kept in memory between replies: this is a small server.
    OLLAMA_KEEP_ALIVE: '30m',
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_NUM_PARALLEL: '1',
    ...ours,
    ...process.env,
  }
  // Only this machine: the Node server is the way in for everyone else.
  env.OLLAMA_HOST = new URL(env.GRADER_URL ?? 'http://127.0.0.1:11434').host
  if (env.OLLAMA_TMPDIR) Object.assign(env, { TEMP: env.OLLAMA_TMPDIR, TMP: env.OLLAMA_TMPDIR })
  run(env.OLLAMA_BIN ?? 'ollama', ['serve'], { env })
} else {
  const python = [
    join(here, service.environment, 'Scripts', 'python.exe'),
    join(here, service.environment, 'bin', 'python'),
  ].find(existsSync)

  if (!python) {
    console.error(
      `speech/${service.environment} is missing. Make it first: see speech/README.md, "Set up".`,
    )
    process.exit(1)
  }
  run(python, ['-m', service.module], { cwd: here })
}
