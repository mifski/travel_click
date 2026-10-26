'use client'

import { MotionConfig } from 'framer-motion'

/** Framer animations skip the CSS reduced-motion rule in globals.css, so honour the OS setting here too */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
