'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { startCloudSync, stopCloudSync } from '@/lib/cloud-sync'

/** Keeps the signed-in account's trips in step across devices */
export function CloudSync() {
  const { user } = useAuth()
  const uid = user?.id

  useEffect(() => {
    if (!uid) return
    void startCloudSync(uid)
    return () => stopCloudSync()
  }, [uid])

  return null
}
