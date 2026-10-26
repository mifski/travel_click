'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export const BINDER_STEPS = [
  'Reading your pins…',
  'Clustering by neighbourhood…',
  'Balancing food · culture · nightlife…',
  'Pricing each day…',
  'Binding the pages…',
]

/* Mounts fresh each time the overlay opens, so the cycle always starts at step 0 */
function StagedLine({ steps }: { steps: string[] }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 750)
    return () => clearInterval(id)
  }, [steps.length])

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={step}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.18 }}
        className="font-hand"
        style={{ margin: 0, fontSize: 20, color: '#a86030' }}
      >
        {steps[step]}
      </motion.p>
    </AnimatePresence>
  )
}

/* Seconds since the overlay opened, so a long wait reads as progress, not a freeze */
function Elapsed({ hint }: { hint: string }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <p style={{ margin: '12px 0 0', fontSize: 12, color: 'rgba(44,24,16,.6)' }}>
      {secs < 60 ? `${hint} · ${secs}s` : `Still working, big trips take longer · ${secs}s`}
    </p>
  )
}

interface Props {
  show: boolean
  title?: string
  steps?: string[]
  /** How long this usually takes, shown under the steps */
  hint?: string
}

/** Full-screen staged progress overlay shown while the itinerary API runs. */
export function GenerationOverlay({ show, title = 'Assembling your binder', steps = BINDER_STEPS, hint = 'Usually about 30 seconds' }: Props) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4"
          style={{ background: 'rgba(32,18,9,.78)', backdropFilter: 'blur(5px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
        >
          <div
            className="w-full text-center"
            style={{
              maxWidth: 420,
              background: '#fffef9',
              borderRadius: 16,
              padding: '30px 32px',
              boxShadow: '0 40px 90px -20px rgba(0,0,0,.7)',
            }}
          >
            <div
              className="tc-spinner mx-auto"
              style={{ width: 34, height: 34, border: '3.5px solid rgba(201,168,76,.3)', borderTopColor: '#c9a84c' }}
            />
            <p className="font-display" style={{ margin: '18px 0 4px', fontWeight: 800, fontSize: 21, color: '#2c1810' }}>
              {title}
            </p>
            <StagedLine steps={steps} />
            <Elapsed hint={hint} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
