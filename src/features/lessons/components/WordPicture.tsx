import { useState } from 'react'
import type { VocabularyWord } from '@/shared/lib/curriculum/weekVocabulary'

export type WordPictureProps = {
  word: VocabularyWord
}

/**
 * A word's picture, filling the square it is put in; its first letter when it has none, or when
 * the picture fails to load. Decoration: the word is written beside it.
 */
export function WordPicture({ word }: WordPictureProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = word.imageUrl !== null && word.imageUrl !== failedImage

  return (
    <span className="flex size-full items-center justify-center overflow-hidden rounded-lg bg-primary-soft">
      {showImage ? (
        <img
          src={word.imageUrl ?? undefined}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedImage(word.imageUrl)}
          className="size-full object-cover"
        />
      ) : (
        // No picture: the word's first letter, so the cards still differ at a glance.
        <span aria-hidden="true" className="text-2xl font-extrabold text-on-primary-soft uppercase">
          {word.word.charAt(0)}
        </span>
      )}
    </span>
  )
}
