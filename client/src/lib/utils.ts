import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Cards flow in masonry columns — the stored position is a drag *offset* on
 * top of the column slot, so new cards start unmoved with a scrapbook tilt.
 */
export function generatePinPosition(): { x: number; y: number; rotation: number } {
  return { x: 0, y: 0, rotation: randomInRange(-2.5, 3) }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "OCT 12 – 15" within one month, "OCT 12 – NOV 2" across months */
export function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${fmt(s)} – ${e.getDate()}`
  }
  return `${fmt(s)} – ${fmt(e)}`
}

export function getDayCount(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function googleFlightsUrl(destination: string, when?: string): string {
  const q = `flights to ${destination}${when ? ` in ${when}` : ''}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function googleMapsUrl(place: string, context?: string): string {
  const query = context ? `${place}, ${context}` : place
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Trip status relative to today */
export function getTripStatus(start: string, end: string): { kind: 'upcoming' | 'ongoing' | 'past'; label: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end); e.setHours(0, 0, 0, 0)
  if (today < s) {
    const days = Math.round((s.getTime() - today.getTime()) / 86400000)
    return { kind: 'upcoming', label: days === 1 ? '1 day to go' : `${days} days to go` }
  }
  if (today > e) return { kind: 'past', label: 'Completed' }
  return { kind: 'ongoing', label: 'In progress' }
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

export function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/.test(url)
}

export function isInstagramUrl(url: string): boolean {
  return /instagram\.com/.test(url)
}

export function isXiaohongshuUrl(url: string): boolean {
  return /xiaohongshu\.com|xhslink\.com/.test(url)
}

export function getSourceFromUrl(url: string): import('./types').CardSource {
  if (isYouTubeUrl(url)) return 'youtube'
  if (isTikTokUrl(url)) return 'tiktok'
  if (isInstagramUrl(url)) return 'instagram'
  if (isXiaohongshuUrl(url)) return 'xiaohongshu'
  return 'article'
}
