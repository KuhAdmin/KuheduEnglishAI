/**
 * Themed stand-in shown until an admin uploads a hero image (or if that image fails to load).
 * Drawn with theme tokens, so it follows whichever named theme is active.
 */
export function HeroPlaceholder() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 640"
      preserveAspectRatio="xMidYMin slice"
      className="absolute inset-0 size-full"
    >
      <circle cx="310" cy="96" r="150" className="fill-surface" opacity="0.55" />
      <circle cx="24" cy="330" r="130" className="fill-primary" opacity="0.14" />
      <circle cx="320" cy="420" r="90" className="fill-accent" opacity="0.18" />

      {/* Learner's bubble with a voice waveform */}
      <g transform="translate(0 -22)">
        <path
          d="M84 168h176a32 32 0 0 1 32 32v92a32 32 0 0 1-32 32h-92l-52 42v-42H84a32 32 0 0 1-32-32v-92a32 32 0 0 1 32-32z"
          className="fill-surface"
        />
        <g className="stroke-primary" strokeWidth="14" strokeLinecap="round">
          <path d="M112 232v28" />
          <path d="M142 214v64" />
          <path d="M172 226v40" />
          <path d="M202 206v80" />
          <path d="M232 230v32" />
        </g>
      </g>

      {/* Tutor's reply */}
      <g transform="translate(8 -34)">
        <path
          d="M196 352h92a24 24 0 0 1 24 24v36a24 24 0 0 1-24 24h-8v28l-34-28h-50a24 24 0 0 1-24-24v-36a24 24 0 0 1 24-24z"
          className="fill-primary"
        />
        <g className="fill-on-primary">
          <circle cx="216" cy="394" r="7" />
          <circle cx="242" cy="394" r="7" />
          <circle cx="268" cy="394" r="7" />
        </g>
      </g>

      {/* Greeting */}
      <g transform="translate(0 -18) rotate(-6 250 120)">
        <rect
          x="196"
          y="94"
          width="112"
          height="52"
          rx="26"
          className="fill-accent-soft stroke-accent"
          strokeWidth="3"
        />
        <text
          x="252"
          y="128"
          textAnchor="middle"
          className="fill-on-accent-soft text-xl font-extrabold"
        >
          Hello!
        </text>
      </g>
    </svg>
  )
}
