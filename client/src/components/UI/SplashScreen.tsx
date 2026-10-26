'use client'

import { useEffect, useState } from 'react'
import { PostmarkMark } from './Logo'

const SEEN_KEY = 'tc-splash-seen'

/** Postmark splash on the first page load of a browser session; fades out after ~1.4s */
export function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show')

  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; sessionStorage.setItem(SEEN_KEY, '1') } catch { /* private mode */ }
    // Already seen this session: the tc-seen class hid it before paint, so just unmount
    const fade = setTimeout(() => setPhase('fade'), seen ? 0 : 1400)
    const gone = setTimeout(() => setPhase('gone'), seen ? 0 : 1900)
    return () => { clearTimeout(fade); clearTimeout(gone) }
  }, [])

  if (phase === 'gone') return null
  return (
    <div
      role="status"
      aria-label="Loading TravelClick"
      onClick={() => setPhase('gone')}
      className="splash-root fixed inset-0 z-[1000] flex flex-col items-center justify-center print:hidden"
      style={{ opacity: phase === 'fade' ? 0 : 1 }}
    >
      <span className="splash-sun" aria-hidden="true" />
      <div className="splash-stamp relative">
        <PostmarkMark size={200} ringText spin />
      </div>
      <span className="font-display relative" style={{ fontWeight: 800, fontSize: 44, color: '#2c1810', letterSpacing: '-.02em', textShadow: '2px 2px 0 rgba(201,64,64,.4)', marginTop: 10 }}>
        TravelClick<span style={{ color: '#c94040' }}>.</span>
      </span>
      <span className="font-hand relative" style={{ fontSize: 22, color: '#6b4a32', marginTop: 2 }}>
        franking your trip…
      </span>
    </div>
  )
}
