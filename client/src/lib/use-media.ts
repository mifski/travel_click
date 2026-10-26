'use client'

import { useSyncExternalStore } from 'react'

/** Live CSS media query match; false during SSR so the first paint matches the server */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Phone-width layouts: one-column board, swipeable rows */
export const useCompact = () => useMedia('(max-width: 640px)')
