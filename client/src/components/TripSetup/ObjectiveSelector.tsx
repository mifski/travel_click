'use client'

import { TripObjective, OBJECTIVE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  selected: TripObjective[]
  onChange: (obj: TripObjective) => void
  max?: number
}

export function ObjectiveSelector({ selected, onChange, max = 3 }: Props) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(OBJECTIVE_LABELS) as TripObjective[]).map((obj) => {
          const { label, icon } = OBJECTIVE_LABELS[obj]
          const active = selected.includes(obj)
          const disabled = !active && selected.length >= max
          return (
            <button
              key={obj}
              type="button"
              onClick={() => !disabled && onChange(obj)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all border-2',
                active
                  ? 'border-[#c94040] bg-[#c94040] text-white shadow-md scale-[1.03]'
                  : disabled
                  ? 'bg-amber-50 border-amber-100 text-amber-900/25 cursor-not-allowed'
                  : 'bg-white border-amber-200 text-amber-900/70 hover:border-[#c94040]/50 hover:text-amber-900'
              )}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-amber-800/50 mt-2 font-medium">
        {selected.length}/{max} selected
      </p>
    </div>
  )
}
