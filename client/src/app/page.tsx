'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { seedDemo } from '@/lib/demo-data'
import { Logo, PostmarkMark } from '@/components/UI/Logo'

const INK = '#2c1810'
const INK_SOFT = 'rgba(44,24,16,.7)'
const CREAM = '#f2ead8'
const CREAM_SOFT = 'rgba(242,234,216,.68)'
const GOLD = '#c9a84c'

/* The same ruled-paper prints the board draws for pins without photos */
const PRINTS = [
  { local: 'Montmartre', title: 'Golden hour on the steps', note: 'go an hour before sunset', meta: 'Paris, from TikTok', rot: -4, x: 0, y: 34, tape: 'rgba(200,220,192,.75)' },
  { local: '경복궁', title: 'Palace in a hanbok', note: 'free entry if you wear one', meta: 'Seoul, from Instagram', rot: 3, x: 214, y: 0, tape: 'rgba(192,212,232,.75)' },
  { local: 'Coyoacán', title: 'Market tostadas', note: 'the stall by the fountain', meta: 'Mexico City, from YouTube', rot: -1.5, x: 120, y: 228, tape: 'rgba(240,196,196,.7)' },
]

/* One day of the demo binder, as the itinerary page draws it */
const DAY = [
  { time: '6:30 AM', what: 'Sensō-ji before the crowds', note: 'Main hall opens at 6. Incense is quietest now.' },
  { time: '10:00 AM', what: 'Nakamise snacks, then the river bus', note: 'Fixed departures: the 10:40 boat, so don’t linger.' },
  { time: '2:00 PM', what: 'Rest block', note: 'Café near Hamarikyu. Protected downtime.' },
]

const BINDER_DOES = [
  ['Reality Check', 'Checks opening hours, last trains and closed days, and flags anything that would break on the ground.'],
  ['Your pace', 'Slow, balanced or full days, each with one anchor, a rest block and a rainy-day backup.'],
  ['Tickets to book', 'Every reservation with its book-by date, ready to add to your calendar.'],
  ['Packing and brief', 'A packing list for the season, plus currency, phrases, plugs and etiquette.'],
  ['Budget', 'Flights, stays and daily spend against what you want to pay, in S$.'],
  ['Plan together', 'Add a friend to the board and see each other’s pins and edits as they happen.'],
]

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

  const demoButton = (tone: 'coral' | 'gold', size: 'lg' | 'sm' = 'lg') => (
    <button
      onClick={launchDemo}
      disabled={launching}
      className={`${tone === 'coral' ? 'pill-coral' : 'pill-gold'} pill-lift inline-flex items-center gap-2 rounded-full font-bold disabled:opacity-70`}
      style={size === 'lg' ? { padding: '15px 30px', fontSize: 16 } : { padding: '10px 18px', fontSize: 13 }}
    >
      {launching && (
        <span className="tc-spinner w-4 h-4" style={{ border: '2px solid rgba(255,255,255,.35)', borderTopColor: tone === 'coral' ? '#fff' : '#201209' }} />
      )}
      Open the demo board
    </button>
  )

  return (
    <div className="scrapbook-bg min-h-dvh flex flex-col overflow-x-clip" style={{ color: INK }}>

      <header className="px-5 sm:px-10 py-4 flex items-center justify-between gap-3">
        <Logo fontSize={19} />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/auth/login" className="text-sm font-medium px-3 py-2 rounded-full transition-colors hover:text-[#c94040]" style={{ color: INK_SOFT }}>
            Sign in
          </Link>
          <span className="hidden sm:inline">{demoButton('coral', 'sm')}</span>
        </nav>
      </header>

      <main className="flex-1">

        {/* ── Hero: the board itself ── */}
        <section className="mx-auto grid items-center gap-12 lg:grid-cols-[1fr_520px]" style={{ maxWidth: 1180, padding: '48px 20px 88px' }}>
          <div style={{ maxWidth: 560 }}>
            <h1 className="font-display m-0" style={{ fontWeight: 800, fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: 1.02, letterSpacing: '-.025em' }}>
              Your saved travel videos, made into a trip you can take.
            </h1>
            <p style={{ margin: '22px 0 0', fontSize: 18, lineHeight: 1.6, color: INK_SOFT, maxWidth: 480 }}>
              Paste a TikTok, YouTube video or article. TravelClick pins every place it mentions
              to a scrapbook board, then plans the days around them.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3" style={{ marginTop: 32 }}>
              {demoButton('coral')}
              <Link href="/auth/signup" className="font-semibold underline underline-offset-4 decoration-[#c94040]/40 hover:decoration-[#c94040]" style={{ fontSize: 15 }}>
                Create an account
              </Link>
            </div>
            <p className="font-hand" style={{ margin: '14px 0 0 4px', fontSize: 20, color: '#6b4a32', transform: 'rotate(-1deg)', transformOrigin: 'left' }}>
              the demo needs no signup, it&rsquo;s a real Tokyo board
            </p>
          </div>

          {/* Collage: real board materials, with the postmark stamped on */}
          <div className="relative mx-auto w-full" style={{ maxWidth: 520, height: 'calc(420px * var(--collage-scale, 1))' }} aria-hidden="true">
            <div className="absolute inset-0" style={{ transform: 'scale(var(--collage-scale, 1))', transformOrigin: 'top left' }}>
              {PRINTS.map((p) => (
                <div
                  key={p.local}
                  className="paper-print"
                  style={{ position: 'absolute', left: p.x, top: p.y, width: 236, transform: `rotate(${p.rot}deg)` }}
                >
                  <span className="washi" style={{ top: -10, left: 70, width: 74, height: 20, background: p.tape, transform: 'rotate(-3deg)' }} />
                  <div className="ruled-paper" style={{ padding: '16px 18px 14px' }}>
                    <span className="font-display block" style={{ fontWeight: 900, fontSize: 28, color: 'rgba(201,64,64,.85)', lineHeight: 1 }}>{p.local}</span>
                    <span className="font-display block" style={{ fontWeight: 800, fontSize: 18, marginTop: 8, lineHeight: 1.15 }}>{p.title}</span>
                    <span className="font-hand block" style={{ fontSize: 19, marginTop: 4 }}>{p.note}</span>
                    <span className="block font-semibold" style={{ fontSize: 10.5, marginTop: 6, color: '#a86030' }}>{p.meta}</span>
                  </div>
                </div>
              ))}
              <div
                className="absolute"
                style={{ left: 372, top: 214, width: 132, padding: '18px 13px 13px', background: 'linear-gradient(180deg, #fdf3b9, #f7e88e)', transform: 'rotate(5deg)', boxShadow: '0 2px 3px rgba(44,24,16,.14), 0 14px 30px -6px rgba(44,24,16,.3)' }}
              >
                <span className="washi" style={{ top: -9, left: 34, width: 60, height: 18, background: 'rgba(232,168,184,.65)', transform: 'rotate(-2deg)' }} />
                <p className="font-hand m-0" style={{ fontSize: 17, lineHeight: 1.25, color: '#4a3520' }}>sunrise at Mount Batur!</p>
              </div>
              <div className="landing-stamp absolute" style={{ left: 372, top: 70 }}>
                <PostmarkMark size={150} ringText />
              </div>
            </div>
          </div>
        </section>

        {/* ── How it goes: a real sequence, joined by the plane's trail ── */}
        <section className="mx-auto" style={{ maxWidth: 1080, padding: '0 20px 104px' }}>
          <h2 className="font-display m-0" style={{ fontWeight: 800, fontSize: 'clamp(30px, 4vw, 40px)', letterSpacing: '-.02em' }}>
            From a link to a plan in three moves
          </h2>
          <ol className="grid gap-10 md:grid-cols-3 list-none p-0 relative" style={{ margin: '36px 0 0' }}>
            <span aria-hidden="true" className="hidden md:block absolute" style={{ left: '8%', right: '8%', top: 22, borderTop: '3px dotted rgba(126,154,181,.7)' }} />
            {[
              ['Paste a link', 'Drop in a TikTok, YouTube video, Instagram post or article. The places in it come out as pins, with their local names.'],
              ['Shape the board', 'Drag pins around, filter by food or culture, stick notes on, and stamp a passport for any place to see its hours and prices.'],
              ['Open the binder', 'One tap plans every day around your pins, at your pace, then checks the plan against opening hours and last trains.'],
            ].map(([title, body], i) => (
              <li key={title} className="relative">
                <span
                  className="font-hand relative flex items-center justify-center"
                  style={{ width: 46, height: 46, borderRadius: '50%', background: '#fffef9', border: '2px solid #c94040', color: '#c94040', fontSize: 26, fontWeight: 700 }}
                >
                  {i + 1}
                </span>
                <h3 className="font-display" style={{ margin: '16px 0 0', fontWeight: 800, fontSize: 22 }}>{title}</h3>
                <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: INK_SOFT, maxWidth: 320 }}>{body}</p>
              </li>
            ))}
          </ol>
          <p style={{ margin: '40px 0 0', fontSize: 15, color: INK_SOFT }}>
            Can&rsquo;t pick a city yet?{' '}
            <Link href="/decide" className="font-semibold underline underline-offset-4 decoration-[#7e9ab5]/60 hover:decoration-[#3a5f7a]" style={{ color: '#3a5f7a' }}>
              Compare destinations first
            </Link>
          </p>
        </section>

        {/* ── The binder ── */}
        <section
          style={{
            background: '#201209',
            backgroundImage: 'radial-gradient(ellipse at 20% -10%, rgba(201,168,76,.16), transparent 55%)',
            color: CREAM,
          }}
        >
          <div className="mx-auto grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" style={{ maxWidth: 1180, padding: '96px 20px' }}>
            <div>
              <h2 className="font-display m-0" style={{ fontWeight: 800, fontSize: 'clamp(34px, 4.6vw, 52px)', lineHeight: 1.05, letterSpacing: '-.02em' }}>
                Then the board becomes a binder.
              </h2>
              <p style={{ margin: '18px 0 0', fontSize: 17, lineHeight: 1.6, color: CREAM_SOFT, maxWidth: 460 }}>
                Each day is a page with times, travel and meals, checked against how the city actually runs.
              </p>

              {/* A day page, as the itinerary draws it */}
              <div className="relative" style={{ marginTop: 40, paddingLeft: 26, maxWidth: 470 }}>
                <span
                  className="inline-block font-extrabold"
                  style={{ marginLeft: -26, marginBottom: 22, padding: '5px 12px', border: '2px solid #8fbf7a', color: '#8fbf7a', borderRadius: 4, fontSize: 12, letterSpacing: '.14em', transform: 'rotate(-3deg)' }}
                >
                  CHECKED
                </span>
                <span aria-hidden="true" className="absolute" style={{ left: 5, top: 62, bottom: 6, width: 1, background: 'linear-gradient(180deg, rgba(201,168,76,.6), rgba(201,168,76,.1))' }} />
                {DAY.map((b, i) => (
                  <div key={b.time} className="relative" style={{ marginBottom: 24 }}>
                    <span
                      aria-hidden="true"
                      className="absolute rounded-full"
                      style={i === 0
                        ? { left: -26, top: 6, width: 11, height: 11, background: GOLD, boxShadow: '0 0 12px rgba(201,168,76,.6)' }
                        : { left: -26, top: 6, width: 11, height: 11, border: '2px solid rgba(201,168,76,.5)', background: '#201209', boxSizing: 'border-box' }}
                    />
                    <div className="flex items-baseline flex-wrap" style={{ gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: GOLD }}>{b.time}</span>
                      <span className="font-display" style={{ fontWeight: 700, fontSize: 21 }}>{b.what}</span>
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: 13.5, lineHeight: 1.55, color: CREAM_SOFT }}>{b.note}</p>
                  </div>
                ))}
                <div className="flex items-stretch" style={{ marginTop: 8, maxWidth: 360, background: CREAM, color: INK, borderRadius: 6 }}>
                  <div style={{ padding: '12px 16px', flex: 1 }}>
                    <span className="block font-display" style={{ fontWeight: 800, fontSize: 16 }}>Tokyo Skytree, sunset slot</span>
                    <span className="block" style={{ fontSize: 12.5, color: INK_SOFT, marginTop: 2 }}>Book by 2 Nov. Sells out on weekends.</span>
                  </div>
                  <div className="flex items-center justify-center font-extrabold" style={{ width: 74, borderLeft: '2px dashed rgba(44,24,16,.3)', color: '#c94040', fontSize: 12 }}>
                    To book
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:pt-3">
              <dl className="grid sm:grid-cols-2 m-0" style={{ gap: '30px 36px' }}>
                {BINDER_DOES.map(([term, desc]) => (
                  <div key={term} style={{ borderTop: '1px solid rgba(201,168,76,.35)', paddingTop: 14 }}>
                    <dt className="font-display" style={{ fontWeight: 700, fontSize: 19, color: CREAM }}>{term}</dt>
                    <dd style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: CREAM_SOFT }}>{desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* ── Close ── */}
          <div className="mx-auto flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between" style={{ maxWidth: 1180, padding: '0 20px 96px' }}>
            <div className="flex items-center gap-5">
              <PostmarkMark size={84} tone="dark" ringText />
              <p className="font-display m-0" style={{ fontWeight: 800, fontSize: 'clamp(26px, 3.4vw, 34px)', lineHeight: 1.1, maxWidth: 520 }}>
                Start with the Tokyo demo, then make your own board.
              </p>
            </div>
            {demoButton('gold')}
          </div>
        </section>
      </main>

      <footer style={{ background: '#201209', borderTop: '1px solid rgba(201,168,76,.2)' }}>
        <div className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ maxWidth: 1180, padding: '22px 20px' }}>
          <Logo tone="dark" fontSize={15} />
          <p className="m-0" style={{ fontSize: 12.5, color: CREAM_SOFT }}>© 2026 TravelClick. Plan trips that tell a story.</p>
        </div>
      </footer>
    </div>
  )
}
