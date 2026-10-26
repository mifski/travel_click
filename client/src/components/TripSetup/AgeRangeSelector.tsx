'use client'

import { AgeRange, AGE_RANGE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Baby, Smile, User, UserRound, Users, type LucideIcon } from 'lucide-react'

interface Props {
  selected: AgeRange[]
  onChange: (range: AgeRange) => void
}

const AGE_ICONS: Record<AgeRange, LucideIcon> = {
  infants: Baby,
  kids: Smile,
  teens: UserRound,
  adults: User,
  seniors: Users,
}

export function AgeRangeSelector({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(AGE_RANGE_LABELS) as AgeRange[]).map((range) => {
        const active = selected.includes(range)
        const Icon = AGE_ICONS[range]
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all border-2',
              active
                ? 'border-[#6b8f5e] bg-[#6b8f5e] text-white shadow-md scale-[1.03]'
                : 'bg-white border-amber-200 text-[#6b4a32] hover:border-[#6b8f5e]/50 hover:text-amber-900'
            )}
          >
            <Icon size={15} strokeWidth={2} aria-hidden="true" />
            <span>{AGE_RANGE_LABELS[range]}</span>
          </button>
        )
      })}
    </div>
  )
}
