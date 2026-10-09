import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_TUTOR_AVATAR,
  isTutorAvatarId,
  tutorAvatars,
  tutorVoiceKind,
  useTutorAvatar,
  useTutorAvatarStore,
} from './tutorAvatar'

beforeEach(() => {
  localStorage.clear()
  useTutorAvatarStore.setState({ avatar: null })
})

describe('the tutor’s avatar', () => {
  it('is the default until the learner chooses, then their choice', () => {
    const { result, rerender } = renderHook(() => useTutorAvatar())
    expect(result.current).toBe(DEFAULT_TUTOR_AVATAR)
    expect(useTutorAvatarStore.getState().avatar).toBeNull()

    useTutorAvatarStore.getState().setAvatar('female')
    rerender()
    expect(result.current).toBe('female')
    expect(JSON.parse(localStorage.getItem('kuhedu-tutor-avatar') ?? '{}')).toMatchObject({
      state: { avatar: 'female' },
    })
  })

  it('says which kind of voice the learner’s tutor speaks with', () => {
    expect(tutorVoiceKind()).toBe('male')
    useTutorAvatarStore.getState().setAvatar('female')
    expect(tutorVoiceKind()).toBe('female')
  })

  it('is one of the avatars that are drawn', () => {
    expect(tutorAvatars.map(({ id }) => id)).toEqual(['male', 'female'])
    expect(isTutorAvatarId('female')).toBe(true)
    expect(isTutorAvatarId('robot')).toBe(false)
    expect(isTutorAvatarId(null)).toBe(false)
  })

  it('goes back to the default when what was saved is no longer an avatar', async () => {
    localStorage.setItem('kuhedu-tutor-avatar', JSON.stringify({ state: { avatar: 'robot' } }))
    await useTutorAvatarStore.persist.rehydrate()
    expect(useTutorAvatarStore.getState().avatar).toBeNull()

    localStorage.setItem('kuhedu-tutor-avatar', JSON.stringify({ state: { avatar: 'female' } }))
    await useTutorAvatarStore.persist.rehydrate()
    expect(useTutorAvatarStore.getState().avatar).toBe('female')
  })
})
