'use client'

import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

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
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().push('success', msg),
  error: (msg: string) => useToastStore.getState().push('error', msg),
  info: (msg: string) => useToastStore.getState().push('info', msg),
}

const KIND_STYLE: Record<ToastKind, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: { icon: <CheckCircle2 size={16} className="text-[#6b8f5e]" />, bg: '#f2f8ed', border: '#c8dcc0', text: '#3a6030' },
  error:   { icon: <AlertCircle size={16} className="text-[#c94040]" />,  bg: '#fdf0f0', border: '#f0c4c4', text: '#8a2828' },
  info:    { icon: <Info size={16} className="text-[#7e9ab5]" />,         bg: '#f0f5fa', border: '#c0d4e8', text: '#3a5f7a' },
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[400] flex flex-col gap-2 items-center pointer-events-none px-4 w-full sm:w-auto print:hidden">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = KIND_STYLE[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="pointer-events-auto flex items-center gap-2.5 pl-4 pr-2 py-3 rounded-2xl shadow-lg border max-w-sm w-full sm:w-auto"
              style={{ background: s.bg, borderColor: s.border }}
              role="status"
            >
              {s.icon}
              <p className="text-sm font-semibold flex-1" style={{ color: s.text }}>{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                style={{ color: s.text }}
              >
                <X size={13} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
