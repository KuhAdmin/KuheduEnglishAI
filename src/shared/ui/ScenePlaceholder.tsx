/**
 * Themed stand-in for a picture of a situation that has not been supplied (or failed to load):
 * two people talking. Drawn with theme tokens, so it follows whichever theme is active.
 */
export function ScenePlaceholder() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <circle cx="286" cy="18" r="84" className="fill-surface" opacity="0.55" />
      <circle cx="22" cy="164" r="72" className="fill-primary" opacity="0.14" />
      <circle cx="262" cy="170" r="46" className="fill-accent" opacity="0.18" />

      {/* One speaker, with a voice waveform */}
      <path
        d="M62 40h96a18 18 0 0 1 18 18v44a18 18 0 0 1-18 18h-52l-28 22v-22H62a18 18 0 0 1-18-18V58a18 18 0 0 1 18-18z"
        className="fill-surface"
      />
      <g className="stroke-primary" strokeWidth="8" strokeLinecap="round">
        <path d="M74 72v16" />
        <path d="M92 62v36" />
        <path d="M110 69v22" />
        <path d="M128 58v44" />
        <path d="M146 71v18" />
      </g>

      {/* The other one's reply */}
      <path
        d="M206 78h60a16 16 0 0 1 16 16v26a16 16 0 0 1-16 16h-6v20l-24-20h-30a16 16 0 0 1-16-16V94a16 16 0 0 1 16-16z"
        className="fill-primary"
      />
      <g className="fill-on-primary">
        <circle cx="216" cy="107" r="5" />
        <circle cx="236" cy="107" r="5" />
        <circle cx="256" cy="107" r="5" />
      </g>
    </svg>
  )
}
