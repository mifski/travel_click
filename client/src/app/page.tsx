'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plane, MapPin, BookOpen, Sparkles, ArrowRight, Link2,
  Luggage, Stamp, Play, Wand2, Printer, Scale, Wallet
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { seedDemo } from '@/lib/demo-data'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [launching, setLaunching] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/boards')
  }, [loading, user, router])

  async function launchDemo() {
    setLaunching(true)
    const id = await seedDemo()
    router.push(`/board/${id}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f0e8' }}>
      <div className="w-6 h-6 border-2 border-[#c94040]/30 border-t-[#c94040] rounded-full animate-spin" />
    </div>
  )

  if (user) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f0e8' }}>

      {/* Nav */}
      <header className="px-6 py-5 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-amber-200/50 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}>
            <Plane size={18} className="text-white" />
          </div>
          <span className="font-bold text-[#2c1810] text-lg" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            TravelClick
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-amber-800/60 hover:text-amber-900 text-sm transition-colors px-4 py-2 font-medium">
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md"
            style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="flex flex-col items-center px-6 text-center pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 border"
              style={{ background: '#c94040', color: 'white', borderColor: '#c94040' }}
            >
              <Sparkles size={14} />
              AI-powered travel planning
            </div>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-7xl font-bold leading-tight mb-6 text-[#2c1810]"
              style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}
            >
              From saved videos<br />
              <span style={{ color: '#c94040' }}>to boarding pass</span>
            </h1>

            <p className="text-amber-800/60 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              Paste TikToks, YouTube videos, and articles. We extract the places, pin them
              on a beautiful corkboard, and turn them into a day-by-day itinerary —
              with packing list and destination brief included.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button
                onClick={launchDemo}
                disabled={launching}
                className="flex items-center gap-2 px-8 py-4 text-white rounded-2xl font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-xl disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #c94040 0%, #e05555 50%, #c94040 100%)', boxShadow: '0 8px 30px rgba(201,64,64,0.3)' }}
              >
                {launching
                  ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Play size={18} />}
                Try the live demo
              </button>
              <Link
                href="/auth/signup"
                className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-amber-900/70 hover:text-amber-900 border-2 border-amber-300/60 hover:border-amber-400 bg-white/50 transition-all"
              >
                Start for free
                <ArrowRight size={16} />
              </Link>
            </div>
            <p className="text-amber-700/40 text-xs mt-3">No signup needed for the demo · 5 seconds to a full board</p>
            <Link href="/decide"
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-[#3a5f7a] hover:text-[#2c4a62] transition-colors underline underline-offset-4 decoration-[#7e9ab5]/40">
              <Scale size={14} />
              Not sure where to go yet? Compare destinations
            </Link>
          </motion.div>

          {/* Cork board teaser */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-16 w-full max-w-2xl rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 24px 70px rgba(44,24,16,0.22)' }}
          >
            <div className="h-4 cork-bg" />
            <div className="cork-bg p-6 relative" style={{ minHeight: 190 }}>
              {[
                { title: '⛩️ Sensō-ji Temple', loc: 'Asakusa, Tokyo', src: 'TikTok', color: '#c94040', rot: '-4deg', top: '12%', left: '4%', delay: 0.7 },
                { title: '🍜 Ichiran Ramen', loc: 'Shibuya, Tokyo', src: 'YouTube', color: '#e07040', rot: '3deg', top: '8%', left: '28%', delay: 0.9 },
                { title: '🌿 Meiji Shrine', loc: 'Harajuku, Tokyo', src: 'IG', color: '#6b8f5e', rot: '-2deg', top: '16%', left: '52%', delay: 1.1 },
                { title: '🗼 Tokyo Skytree', loc: 'Sumida, Tokyo', src: 'Web', color: '#7e9ab5', rot: '4deg', top: '48%', left: '15%', delay: 1.3 },
                { title: '🎉 Golden Gai', loc: 'Shinjuku, Tokyo', src: 'TikTok', color: '#9b72bf', rot: '-3deg', top: '52%', left: '42%', delay: 1.5 },
              ].map((card) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, scale: 0.6, y: -14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: card.delay, type: 'spring', stiffness: 300, damping: 18 }}
                  className="absolute bg-[#fffef9] rounded shadow-md"
                  style={{ width: 150, top: card.top, left: card.left, transform: `rotate(${card.rot})`, padding: '8px 10px 9px' }}
                >
                  <div className="w-3 h-3 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 shadow"
                    style={{ background: 'radial-gradient(circle at 35% 32%, #f08080, #c94040, #a82828)' }} />
                  <div className="h-1 rounded-t-sm mb-1.5" style={{ background: card.color }} />
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[11px] font-bold text-[#2c1810] leading-tight">{card.title}</p>
                    <span className="text-[7px] font-bold px-1 py-0.5 rounded text-white shrink-0" style={{ background: card.color }}>{card.src}</span>
                  </div>
                  <p className="text-[9px] text-amber-800/60 mt-0.5">{card.loc}</p>
                </motion.div>
              ))}
              {/* Sticky note */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.7, type: 'spring', stiffness: 280, damping: 16 }}
                className="absolute shadow-md"
                style={{
                  top: '38%', left: '72%', width: 120, padding: '10px 10px 12px',
                  background: '#fef3a8', transform: 'rotate(4deg)',
                  fontFamily: "'Comic Sans MS', 'Segoe Print', cursive",
                }}
              >
                <p className="text-[10px] leading-snug" style={{ color: '#5c4a10' }}>Get a Suica card at the airport! 🚆</p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20" style={{ background: '#fdfaf3' }}>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2c1810] mb-3" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                Three steps to a real plan
              </h2>
              <p className="text-amber-800/55">Stop screenshotting travel videos you&rsquo;ll never find again.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: '01', icon: <Link2 size={20} />, color: '#c94040', title: 'Paste a link', desc: 'TikTok, YouTube, Instagram, or any article. Our AI watches the video and extracts the actual places.' },
                { step: '02', icon: <MapPin size={20} />, color: '#6b8f5e', title: 'Pin & curate', desc: 'Every place becomes a postcard on your corkboard. Drag, filter by category, add sticky notes.' },
                { step: '03', icon: <BookOpen size={20} />, color: '#7e9ab5', title: 'Get the itinerary', desc: 'One click and AI routes everything into a day-by-day plan with meals, costs, maps, and booking flags.' },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.12 }}
                  className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm relative overflow-hidden"
                >
                  <span className="absolute -top-3 -right-1 text-[64px] font-black opacity-[0.06] select-none" style={{ fontFamily: 'Georgia, serif' }}>
                    {s.step}
                  </span>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white mb-4 shadow-md" style={{ background: s.color }}>
                    {s.icon}
                  </div>
                  <h3 className="font-bold text-[#2c1810] mb-1.5">{s.title}</h3>
                  <p className="text-sm text-amber-800/60 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2c1810] mb-3" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                Everything until departure day
              </h2>
              <p className="text-amber-800/55">One board per trip, and every pre-trip job handled.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: <Scale size={16} />, color: '#3a5f7a', title: 'Destination decider', desc: 'Torn between cities? Compare weather, costs & visas — get a verdict.' },
                { icon: <Sparkles size={16} />, color: '#c94040', title: 'AI place extraction', desc: 'Video → places, with local names and confidence scores.' },
                { icon: <BookOpen size={16} />, color: '#e07040', title: 'Day-by-day itinerary', desc: 'Geographically-grouped days with meals, pace, and timing.' },
                { icon: <Wand2 size={16} />, color: '#9b72bf', title: 'Refine with words', desc: '"More street food, fewer museums" — regenerate your way.' },
                { icon: <Stamp size={16} />, color: '#7e9ab5', title: 'Destination brief', desc: 'Currency, phrases, plugs, tipping, etiquette — one passport page.' },
                { icon: <Luggage size={16} />, color: '#6b8f5e', title: 'Smart packing list', desc: 'Season-aware checklist sized to your trip and group.' },
                { icon: <Wallet size={16} />, color: '#c9a84c', title: 'Budget guardrail', desc: 'Flights + stay + daily costs vs your budget, always on-screen.' },
                { icon: <Printer size={16} />, color: '#3a7a7a', title: 'Print-ready plans', desc: 'Export the whole itinerary as a clean PDF for offline travel.' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.07 }}
                  className="flex gap-3.5 bg-white/70 border border-amber-200 rounded-2xl p-5 hover:shadow-md hover:border-amber-300 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm" style={{ background: f.color }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2c1810] text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-amber-800/60 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            className="max-w-3xl mx-auto text-center rounded-3xl px-8 py-14 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #2c1810 0%, #4a2818 100%)' }}
          >
            <div className="absolute top-4 left-8 stamp text-amber-200/30 !text-[10px]">Boarding pass</div>
            <div className="absolute bottom-4 right-8 stamp text-amber-200/30 !text-[10px] !rotate-3">Tokyo · Paris · Bali</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
              Your next trip starts<br />with a paste
            </h2>
            <p className="text-amber-100/60 mb-8 max-w-md mx-auto">
              Try the demo board right now — no account, no setup, just the product.
            </p>
            <button
              onClick={launchDemo}
              disabled={launching}
              className="inline-flex items-center gap-2 px-8 py-4 text-white rounded-2xl font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-xl disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #c94040 0%, #e05555 50%, #c94040 100%)', boxShadow: '0 8px 30px rgba(201,64,64,0.4)' }}
            >
              {launching
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Play size={18} />}
              Launch the demo
            </button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-amber-200/60 bg-white/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}>
              <Plane size={12} className="text-white" />
            </div>
            <span className="font-bold text-[#2c1810] text-sm" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>TravelClick</span>
          </div>
          <p className="text-amber-800/40 text-xs">Plan trips that tell a story · © 2026 TravelClick</p>
        </div>
      </footer>
    </div>
  )
}
