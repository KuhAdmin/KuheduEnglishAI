// `npm run dev:speech`: starts the speaking service with the Python of `speech/.venv`, whose
// place differs between Windows and everything else. See README.md for making that environment.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const python = [
  join(here, '.venv', 'Scripts', 'python.exe'),
  join(here, '.venv', 'bin', 'python'),
].find(existsSync)

if (!python) {
  console.error('speech/.venv is missing. Make it first: see speech/README.md, "Set up".')
  process.exit(1)
}

const service = spawn(python, ['-m', 'tts'], { cwd: here, stdio: 'inherit' })
const stop = () => service.kill()
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
service.once('exit', (code) => process.exit(code ?? 0))
