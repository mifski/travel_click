'use client'

import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastStore {
  toasts: Toast[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().push('success', msg),
  error: (msg: string) => useToastStore.getState().push('error', msg),
  info: (msg: string) => useToastStore.getState().push('info', msg),
}

/* Errors get a coral dot so they read differently at a glance — same ink pill */
const KIND_DOT: Record<ToastKind, string | null> = {
  success: null,
  error: '#c94040',
  info: null,
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="fixed bottom-[30px] left-1/2 -translate-x-1/2 z-[400] flex flex-col gap-2 items-center pointer-events-none px-4 print:hidden">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto inline-flex items-center gap-2"
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: '#2c1810',
              color: '#f2ead8',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 16px 40px -8px rgba(0,0,0,.5)',
              cursor: 'pointer',
            }}
            role="status"
          >
            {KIND_DOT[t.kind] && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: KIND_DOT[t.kind]! }} />
            )}
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
