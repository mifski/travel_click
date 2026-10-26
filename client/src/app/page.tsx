'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MapPin, BookOpen, Sparkles, ArrowRight, Link2,
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
    <div className="scrapbook-bg min-h-dvh flex items-center justify-center">
      <div className="tc-spinner w-6 h-6" style={{ border: '2px solid rgba(201,64,64,.3)', borderTopColor: '#c94040' }} />
    </div>
  )

  if (user) return null

  return (
    <div className="scrapbook-bg min-h-dvh flex flex-col">

      {/* Nav */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between sticky top-0 z-50"
        style={{ background: 'rgba(233,223,205,.85)', backdropFilter: 'blur(8px)' }}>
        <span className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#2c1810', letterSpacing: '-.02em' }}>
          TravelClick<span style={{ color: '#c94040' }}>.</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium px-4 py-2 transition-colors hover:text-[#2c1810]" style={{ color: 'rgba(44,24,16,.68)' }}>
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="pill-coral pill-lift px-5 py-2.5 rounded-full text-sm font-semibold"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="flex flex-col items-center px-6 text-center pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

            {/* Kicker */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: '.22em', color: '#c94040' }}>
                AI-powered travel planning
              </span>
              <span style={{ height: 1, width: 48, background: 'rgba(201,64,64,.4)' }} />
              <span className="font-hand" style={{ fontSize: 17, color: 'rgba(44,24,16,.68)', transform: 'rotate(-2deg)' }}>
                paste a link, get a plan ✏️
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-display text-5xl sm:text-7xl leading-tight mb-6 text-[#2c1810]"
              style={{ fontWeight: 800, letterSpacing: '-.03em' }}
            >
              From saved videos<br />
              <span className="italic" style={{ color: '#c94040' }}>to boarding pass</span>
            </h1>

            <p className="text-lg max-w-lg mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(44,24,16,.68)' }}>
              Paste TikToks, YouTube videos, and articles. We extract the places, pin them
              into a beautiful travel scrapbook, and turn them into a day-by-day itinerary,
              with packing list and destination brief included.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button
                onClick={launchDemo}
                disabled={launching}
                className="pill-coral pill-lift flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg disabled:opacity-70"
              >
                {launching
                  ? <span className="tc-spinner w-5 h-5" style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                  : <Play size={18} />}
                Try the live demo
              </button>
              <Link
                href="/auth/signup"
                className="pill-paper pill-lift flex items-center gap-2 px-6 py-4 rounded-full font-semibold"
                style={{ color: 'rgba(44,24,16,.75)' }}
              >
                Start for free
                <ArrowRight size={16} />
              </Link>
            </div>
            <p className="text-xs mt-3" style={{ color: 'rgba(44,24,16,.68)' }}>No signup needed for the demo · 5 seconds to a full board</p>
            <Link href="/decide"
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-[#3a5f7a] hover:text-[#2c4a62] transition-colors underline underline-offset-4 decoration-[#7e9ab5]/40">
              <Scale size={14} />
              Not sure where to go yet? Compare destinations
            </Link>
          </motion.div>

          {/* Scrapbook teaser */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="scrapbook-bg mt-16 w-full max-w-2xl rounded-2xl relative overflow-hidden"
            style={{ boxShadow: '0 24px 70px rgba(44,24,16,0.22)', minHeight: 230, border: '1px solid rgba(44,24,16,.08)' }}
          >
            {[
              { title: 'Sensō-ji at sunrise 🌅', loc: 'Asakusa · go before 9am', src: 'TIKTOK', color: '#c94040', tape: 'rgba(200,220,192,.7)', rot: '-3deg', top: '10%', left: '4%', delay: 0.7 },
              { title: '200 tiny bars 🏮', loc: 'Shinjuku · cash only', src: 'TIKTOK', color: '#2c1810', tape: 'rgba(240,196,196,.6)', rot: '2deg', top: '8%', left: '30%', delay: 0.9 },
              { title: 'forest in the city 🌿', loc: 'Harajuku · weekend weddings', src: 'IG', color: '#d946ef', tape: 'rgba(192,212,232,.7)', rot: '-2deg', top: '14%', left: '58%', delay: 1.1 },
              { title: '634m ↑ sunset slot', loc: 'Sumida · book 18:10', src: 'WEB', color: '#0ea5e9', tape: 'rgba(200,220,192,.7)', rot: '3deg', top: '52%', left: '16%', delay: 1.3 },
              { title: 'the famous scramble!!', loc: 'Shibuya · 3,000 per light', src: 'YT', color: '#ef4444', tape: 'rgba(232,168,184,.6)', rot: '-2deg', top: '55%', left: '44%', delay: 1.5 },
            ].map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.6, y: -14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: card.delay, type: 'spring', stiffness: 300, damping: 18 }}
                className="absolute bg-[#fffef9]"
                style={{
                  width: 170, top: card.top, left: card.left, transform: `rotate(${card.rot})`,
                  padding: '10px 10px 11px',
                  boxShadow: '0 2px 3px rgba(44,24,16,.12), 0 16px 36px -8px rgba(44,24,16,.36)',
                }}
              >
                <span aria-hidden="true" className="washi" style={{ top: -8, left: 44, width: 58, height: 16, background: card.tape, transform: 'rotate(-4deg)' }} />
                <div className="flex items-baseline justify-between gap-1">
                  <p className="font-hand leading-tight truncate" style={{ fontSize: 17, color: '#2c1810' }}>{card.title}</p>
                  <span className="shrink-0 font-extrabold" style={{ fontSize: 8, letterSpacing: '.08em', color: card.color }}>{card.src}</span>
                </div>
                <p className="mt-0.5 truncate" style={{ fontSize: 9.5, color: 'rgba(44,24,16,.68)' }}>{card.loc}</p>
              </motion.div>
            ))}
            {/* Sticky note */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.7, type: 'spring', stiffness: 280, damping: 16 }}
              className="absolute"
              style={{
                top: '42%', left: '74%', width: 130, padding: '16px 12px 12px',
                background: 'linear-gradient(180deg, #fdf3b9, #f7e88e)', transform: 'rotate(4deg)',
                boxShadow: '0 2px 3px rgba(44,24,16,.14), 0 14px 30px -6px rgba(44,24,16,.3)',
              }}
            >
              <span aria-hidden="true" className="washi" style={{ top: -8, left: '50%', marginLeft: -30, width: 60, height: 16, background: 'rgba(232,168,184,.6)', transform: 'rotate(-2deg)' }} />
              <p className="font-hand leading-snug" style={{ fontSize: 15, color: '#4a3520' }}>get a Suica card at the airport! 🚆</p>
            </motion.div>
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
              <p className="text-[#6b4a32]">Stop screenshotting travel videos you&rsquo;ll never find again.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: '01', icon: <Link2 size={20} />, color: '#c94040', title: 'Paste a link', desc: 'TikTok, YouTube, Instagram, or any article. Our AI watches the video and extracts the actual places.' },
                { step: '02', icon: <MapPin size={20} />, color: '#6b8f5e', title: 'Pin & curate', desc: 'Every place becomes a paper print in your travel scrapbook. Drag, filter by category, add sticky notes.' },
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
                  <p className="text-sm text-[#6b4a32] leading-relaxed">{s.desc}</p>
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
              <p className="text-[#6b4a32]">One board per trip, and every pre-trip job handled.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: <Scale size={16} />, color: '#3a5f7a', title: 'Destination decider', desc: 'Torn between cities? Compare weather, costs & visas, get a verdict.' },
                { icon: <Sparkles size={16} />, color: '#c94040', title: 'AI place extraction', desc: 'Video → places, with local names and confidence scores.' },
                { icon: <BookOpen size={16} />, color: '#e07040', title: 'Day-by-day itinerary', desc: 'Geographically-grouped days with meals, pace, and timing.' },
                { icon: <Wand2 size={16} />, color: '#9b72bf', title: 'Refine with words', desc: '"More street food, fewer museums": regenerate your way.' },
                { icon: <Stamp size={16} />, color: '#7e9ab5', title: 'Destination brief', desc: 'Currency, phrases, plugs, tipping, etiquette, one passport page.' },
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
                    <p className="text-xs text-[#6b4a32] leading-relaxed">{f.desc}</p>
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
            style={{
              background: '#201209',
              backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(201,168,76,.18), transparent 60%)',
            }}
          >
            <div className="absolute top-4 left-8 stamp !text-[10px]" style={{ color: 'rgba(201,168,76,.4)' }}>Boarding pass</div>
            <div className="absolute bottom-4 right-8 stamp !text-[10px] !rotate-3" style={{ color: 'rgba(201,168,76,.4)' }}>Tokyo · Paris · Bali</div>
            <h2 className="font-display text-3xl sm:text-4xl mb-4" style={{ fontWeight: 800, color: '#f2ead8' }}>
              Your next trip starts<br /><span className="italic" style={{ fontWeight: 500, color: 'rgba(242,234,216,.8)' }}>with a paste</span>
            </h2>
            <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(242,234,216,.55)' }}>
              Try the demo board right now. No account, no setup, just the product.
            </p>
            <button
              onClick={launchDemo}
              disabled={launching}
              className="pill-gold pill-lift inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg disabled:opacity-70"
            >
              {launching
                ? <span className="tc-spinner w-5 h-5" style={{ border: '2px solid rgba(32,18,9,.3)', borderTopColor: '#201209' }} />
                : <Play size={18} />}
              Launch the demo ✦
            </button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8" style={{ borderTop: '1px solid rgba(44,24,16,.1)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-display text-sm" style={{ fontWeight: 800, color: '#2c1810' }}>
            TravelClick<span style={{ color: '#c94040' }}>.</span>
          </span>
          <p className="text-xs" style={{ color: 'rgba(44,24,16,.68)' }}>Plan trips that tell a story · © 2026 TravelClick</p>
        </div>
      </footer>
    </div>
  )
}
