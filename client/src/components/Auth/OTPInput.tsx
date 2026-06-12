'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (val: string) => void
  length?: number
}

export function OTPInput({ value, onChange, length = 6 }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.padEnd(length, '').split('').slice(0, length)

  function handleChange(idx: number, char: string) {
    const digit = char.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, i) => (i === idx ? digit : d)).join('').slice(0, length)
    onChange(next)
    if (digit && idx < length - 1) inputs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = digits.map((d, i) => (i === idx ? '' : d)).join('')
        onChange(next)
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus()
        const next = digits.map((d, i) => (i === idx - 1 ? '' : d)).join('')
        onChange(next)
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { inputs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${idx + 1} of ${length}`}
          className={cn(
            'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none',
            'bg-white text-[#2c1810]',
            digit
              ? 'border-[#c94040] bg-[#c94040]/5'
              : 'border-amber-200 focus:border-[#c94040]/70'
          )}
        />
      ))}
    </div>
  )
}
