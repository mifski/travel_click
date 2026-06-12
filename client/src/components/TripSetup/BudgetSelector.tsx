'use client'

import { PriceRange, PRICE_RANGE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  selected: PriceRange
  onChange: (range: PriceRange) => void
}

const BUDGET_ICONS: Record<PriceRange, string> = {
  budget: '🎒',
  mid: '✈️',
  luxury: '💎',
}

const BUDGET_ACTIVE: Record<PriceRange, string> = {
  budget: 'bg-[#6b8f5e] border-[#5a7a4e]',
  mid: 'bg-[#7e9ab5] border-[#6a86a0]',
  luxury: 'bg-[#9b72bf] border-[#8560a8]',
}

export function BudgetSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(Object.keys(PRICE_RANGE_LABELS) as PriceRange[]).map((range) => {
        const { label, desc } = PRICE_RANGE_LABELS[range]
        const active = selected === range
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-4 rounded-xl text-center border-2 transition-all',
              active
                ? `${BUDGET_ACTIVE[range]} text-white shadow-md scale-[1.03]`
                : 'bg-white border-amber-200 text-amber-900/60 hover:border-amber-400 hover:text-amber-900'
            )}
          >
            <span className="text-2xl">{BUDGET_ICONS[range]}</span>
            <span className="font-bold text-sm">{label}</span>
            <span className="text-xs opacity-75">{desc}</span>
          </button>
        )
      })}
    </div>
  )
}
