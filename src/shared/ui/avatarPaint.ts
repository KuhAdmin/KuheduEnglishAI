/**
 * The gradients one drawn avatar is shaded with (`AvatarDefs` defines them). They are found by
 * id, and several avatars can be on one screen, so each avatar's are named after its own id.
 */
export function avatarPaint(id: string) {
  const paint = (name: string) => `url(#${id}-${name})`

  return {
    id,
    /** A face or a hand: lit from the upper left, darker towards the edge. */
    skin: paint('skin'),
    /** A neck: in the shadow of the chin at the top. */
    neck: paint('neck'),
    iris: paint('iris'),
    /** Colour in a cheek, fading out. */
    blush: paint('blush'),
    /** Light behind the head, fading into the backdrop. */
    glow: paint('glow'),
    hair: paint('hair'),
    /** What the figure wears. */
    cloth: paint('cloth'),
    /** Not a fill but a filter: blurs a shape into a soft shadow. */
    soft: paint('soft'),
  }
}

export type AvatarPaint = ReturnType<typeof avatarPaint>
