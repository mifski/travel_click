'use client'

import { useRef, useState } from 'react'
import { Camera, User } from 'lucide-react'

interface Props {
  preview?: string | null
  onFile: (file: File) => void
  size?: number
}

export function AvatarUpload({ preview, onFile, size = 100 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Upload profile photo"
        className="relative rounded-full overflow-hidden border-4 border-amber-300/70 hover:border-[#c94040]/60 transition-all shadow-md"
        style={{ width: size, height: size }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
            <User size={size * 0.4} className="text-amber-500" />
          </div>
        )}
        {hover && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Camera size={size * 0.28} className="text-white" />
          </div>
        )}
      </button>
      <p className="text-xs text-[#7a5a40]">Click to upload photo</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
