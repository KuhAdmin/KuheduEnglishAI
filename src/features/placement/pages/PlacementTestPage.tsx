import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { useLanguage } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { ChoiceQuestion } from '../components/ChoiceQuestion'
import { ResumePrompt } from '../components/ResumePrompt'
import { SpeakIntro } from '../components/SpeakIntro'
import { SpeakQuestion } from '../components/SpeakQuestion'
import { StageIntro } from '../components/StageIntro'
import { findItem } from '../data/itemBank'
import type { PlacementSession } from '../lib/sessionSchema'
import { usePlacementStore } from '../store/usePlacementStore'

/** A test the learner has actually begun — worth offering back rather than silently reopening. */
const isUnderWay = (session: PlacementSession | null) =>
  session !== null &&
  session.status !== 'COMPLETED' &&
  (session.stageStarted || session.responses.length > 0)

/**
 * The placement test: shows whatever the session has reached — a stage's introduction, a
 * question, or the offer to continue. The session itself (and so every answer) lives in the
 * store and is saved as it changes.
 */
export function PlacementTestPage() {
  const language = useLanguage()
  const session = usePlacementStore((state) => state.session)
  const start = usePlacementStore((state) => state.start)
  const pause = usePlacementStore((state) => state.pause)
  const resume = usePlacementStore((state) => state.resume)

  // Decided once, on arrival: a test begun earlier is offered back; pausing sets it again.
  const [gate, setGate] = useState<'returning' | 'paused' | null>(() =>
    isUnderWay(usePlacementStore.getState().session) ? 'returning' : null,
  )

  useEffect(() => {
    if (!usePlacementStore.getState().session) start(language)
  }, [start, language])

  // Leaving the app pauses the test; its questions stop their own audio and recording.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) pause()
      else if (gate === null) resume()
    }
    if (gate === null) resume()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [gate, pause, resume])

  if (!session) return null
  if (session.status === 'COMPLETED') return <Navigate to={paths.placementResult} replace />

  if (gate) {
    return (
      <ResumePrompt
        kind={gate}
        onContinue={() => setGate(null)}
        onRestart={() => {
          start(language)
          setGate(null)
        }}
      />
    )
  }

  const handlePause = () => {
    pause()
    setGate('paused')
  }

  if (!session.stageStarted) {
    return session.stage === 'SPEAK' ? (
      <SpeakIntro onPause={handlePause} />
    ) : (
      <StageIntro key={session.stage} stage={session.stage} onPause={handlePause} />
    )
  }

  const item = findItem(session.currentItemId)
  if (!item) return null

  return item.stage === 'SPEAK' ? (
    <SpeakQuestion key={item.id} item={item} onPause={handlePause} />
  ) : (
    <ChoiceQuestion key={item.id} item={item} onPause={handlePause} />
  )
}
