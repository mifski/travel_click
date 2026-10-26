'use client'

import { useId } from 'react'

type Tone = 'light' | 'dark'

const INK: Record<Tone, { ring: string; plane: string; keel: string; eye: string; word: string; dot: string }> = {
  light: { ring: '#c94040', plane: '#f2ead8', keel: '#7e9ab5', eye: '#2c1810', word: '#2c1810', dot: '#c94040' },
  dark:  { ring: '#c9a84c', plane: '#f2ead8', keel: '#c9a84c', eye: '#201209', word: '#f2ead8', dot: '#c9a84c' },
}

/**
 * Postmark mark: a smiling paper plane inside a round cancellation stamp.
 * `ringText` adds the lettering around the ring; skip it below ~64px where it can't be read.
 */
export function PostmarkMark({ size = 28, tone = 'light', ringText = false, spin = false }: {
  size?: number; tone?: Tone; ringText?: boolean; spin?: boolean
}) {
  const c = INK[tone]
  const ring = useId()
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} aria-hidden="true" className="shrink-0">
      <g className={spin ? 'postmark-spin' : undefined} style={{ transformOrigin: '110px 110px' }}>
        <circle cx="110" cy="110" r="100" fill="none" stroke={c.ring} strokeWidth={ringText ? 4 : 14} />
        {ringText && (
          <>
            <circle cx="110" cy="110" r="70" fill="none" stroke={c.ring} strokeWidth="1.5" />
            <path id={ring} d="M110,110 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" fill="none" />
            <text fontFamily="var(--font-geist-sans), sans-serif" fontSize="12.5" fontWeight="800" letterSpacing="3.2" fill={c.ring}>
              <textPath href={`#${ring}`}>TRAVELCLICK ✦ SAVED · PINNED · GONE ✦ </textPath>
            </text>
          </>
        )}
      </g>
      <g transform={ringText ? 'translate(52 62) scale(0.62)' : 'translate(36 54) scale(0.76)'}>
        <polygon points="186,22 20,70 92,92" fill={c.plane} />
        <polygon points="186,22 92,92 76,134" fill={c.keel} />
        <g transform="translate(4 3)" fill="none" stroke={tone === 'light' ? '#2c1810' : 'none'} strokeWidth="4" strokeLinejoin="round">
          <polygon points="186,22 20,70 92,92" />
          <polyline points="186,22 92,92 76,134 106,106 92,92" />
        </g>
        <circle cx="88" cy="64" r="6" fill={c.eye} />
        <circle cx="112" cy="57" r="6" fill={c.eye} />
        {ringText && <path d="M95 67 Q101 73 106 64.5" fill="none" stroke={c.eye} strokeWidth="3" strokeLinecap="round" />}
      </g>
    </svg>
  )
}

/** Mark + "TravelClick." wordmark, sized by the wordmark's font size */
export function Logo({ tone = 'light', fontSize = 19 }: { tone?: Tone; fontSize?: number }) {
  const c = INK[tone]
  return (
    <span className="inline-flex items-center" style={{ gap: fontSize * 0.4 }}>
      <PostmarkMark size={Math.round(fontSize * 1.45)} tone={tone} />
      <span className="font-display" style={{ fontWeight: 800, fontSize, color: c.word, letterSpacing: '-.02em', lineHeight: 1 }}>
        TravelClick<span style={{ color: c.dot }}>.</span>
      </span>
    </span>
  )
}
