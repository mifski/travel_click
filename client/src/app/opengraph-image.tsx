import { ImageResponse } from 'next/og'

export const alt = 'TravelClick: your saved travel videos, made into a trip you can take'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#2c1810'
const CORAL = '#c94040'

const HEADLINE = 'Your saved travel videos, made into a trip you can take.'
const NOTE = 'paste a link, pin it, go'

const PRINTS = [
  { local: 'Montmartre', title: 'Golden hour on the steps', meta: 'Paris, from TikTok', rot: -5, x: 0, y: 64, tape: 'rgba(200,220,192,.85)' },
  { local: '경복궁', title: 'Palace in a hanbok', meta: 'Seoul, from Instagram', rot: 4, x: 220, y: 20, tape: 'rgba(192,212,232,.85)' },
  { local: 'Coyoacán', title: 'Market tostadas', meta: 'Mexico City, from YouTube', rot: -2, x: 90, y: 268, tape: 'rgba(240,196,196,.8)' },
]
const STICKY = 'sunrise at Mount Batur!'

/** One Google font, trimmed to the characters drawn. Null if it can't load, so the image still renders */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(8000) },
    ).then((r) => r.text())
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) return null
    return await fetch(url, { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

/** The postmark logo: coral ring around the smiling paper plane */
function Postmark({ size: s }: { size: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="100" fill="none" stroke={CORAL} strokeWidth="12" />
      <circle cx="110" cy="110" r="78" fill="none" stroke={CORAL} strokeWidth="3" />
      <g transform="translate(36 54) scale(0.76)">
        <polygon points="186,22 20,70 92,92" fill="#fffef9" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <polygon points="186,22 92,92 76,134" fill="#7e9ab5" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="88" cy="64" r="7" fill={INK} />
        <circle cx="112" cy="57" r="7" fill={INK} />
      </g>
    </svg>
  )
}

export default async function Image() {
  const latin = `TravelClick.${HEADLINE}${PRINTS.map((p) => p.local + p.title).join('')}`
  const [display, hand, sans, korean] = await Promise.all([
    googleFont('Playfair Display', 800, latin),
    googleFont('Caveat', 600, NOTE + STICKY),
    googleFont('Geist', 600, PRINTS.map((p) => p.meta).join('')),
    googleFont('Noto Serif KR', 800, PRINTS.map((p) => p.local).join('')),
  ])
  const fonts = [
    display && { name: 'Playfair', data: display, weight: 800 as const },
    hand && { name: 'Caveat', data: hand, weight: 600 as const },
    sans && { name: 'Geist', data: sans, weight: 600 as const },
    korean && { name: 'NotoKR', data: korean, weight: 800 as const },
  ].filter((f): f is NonNullable<typeof f> => !!f)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#e9dfcd', padding: '64px 70px', color: INK }}>
        {/* Left: logo, headline, handwritten note */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Postmark size={64} />
            <div style={{ display: 'flex', marginLeft: 16, fontFamily: 'Playfair', fontWeight: 800, fontSize: 40, letterSpacing: -1 }}>
              TravelClick<span style={{ color: CORAL }}>.</span>
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 54, fontFamily: 'Playfair', fontWeight: 800, fontSize: 62, lineHeight: 1.04, letterSpacing: -1.5 }}>
            {HEADLINE}
          </div>
          <div style={{ display: 'flex', marginTop: 26, fontFamily: 'Caveat', fontSize: 38, color: '#6b4a32', transform: 'rotate(-1.5deg)' }}>
            {NOTE}
          </div>
        </div>

        {/* Right: paper prints from three countries, a sticky note */}
        <div style={{ display: 'flex', position: 'relative', flex: 1, marginLeft: 30 }}>
          {PRINTS.map((p) => (
            <div
              key={p.title}
              style={{
                position: 'absolute', left: p.x, top: p.y, width: 250, display: 'flex', flexDirection: 'column',
                background: '#fffef9', padding: '22px 22px 18px', transform: `rotate(${p.rot}deg)`,
                boxShadow: '0 3px 4px rgba(44,24,16,.14), 0 22px 40px -10px rgba(44,24,16,.38)',
              }}
            >
              <div style={{ position: 'absolute', top: -12, left: 84, width: 82, height: 24, background: p.tape, transform: 'rotate(-3deg)', display: 'flex' }} />
              {(/[a-z]/i.test(p.local) || korean) && (
                <div style={{ display: 'flex', fontFamily: /[a-z]/i.test(p.local) ? 'Playfair' : 'NotoKR', fontWeight: 800, fontSize: 34, color: 'rgba(201,64,64,.88)', lineHeight: 1 }}>
                  {p.local}
                </div>
              )}
              <div style={{ display: 'flex', marginTop: 10, fontFamily: 'Playfair', fontWeight: 800, fontSize: 22, lineHeight: 1.15 }}>{p.title}</div>
              <div style={{ display: 'flex', marginTop: 8, fontFamily: 'Geist', fontWeight: 600, fontSize: 14, color: '#a86030' }}>{p.meta}</div>
            </div>
          ))}
          <div
            style={{
              position: 'absolute', left: 316, top: 318, width: 146, display: 'flex', padding: '22px 16px 16px',
              background: '#f9ec9e', transform: 'rotate(6deg)', fontFamily: 'Caveat', fontSize: 26, lineHeight: 1.15, color: '#4a3520',
              boxShadow: '0 3px 4px rgba(44,24,16,.14), 0 18px 34px -8px rgba(44,24,16,.32)',
            }}
          >
            {STICKY}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
