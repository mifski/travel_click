import { ImageResponse } from 'next/og'

export const alt = 'TravelClick: from saved videos to a real trip plan'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PRINTS = [
  { title: 'Sensō-ji at sunrise 🌅', loc: 'Asakusa · go before 9am', tag: 'TIKTOK', color: '#c94040', rotate: '-4deg', tape: 'rgba(200,220,192,.85)' },
  { title: '200 tiny bars 🏮', loc: 'Shinjuku · cash only', tag: 'YT', color: '#ef4444', rotate: '2deg', tape: 'rgba(240,196,196,.8)' },
  { title: 'forest in the city 🌿', loc: 'Harajuku · weekend weddings', tag: 'IG', color: '#d946ef', rotate: '4deg', tape: 'rgba(192,212,232,.85)' },
]

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e9dfcd',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, color: '#2c1810' }}>TravelClick</div>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, color: '#c94040' }}>.</div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: 'rgba(44,24,16,.6)',
            marginBottom: 52,
            textAlign: 'center',
          }}
        >
          From saved videos to boarding pass. AI trip planning in a travel scrapbook
        </div>

        <div style={{ display: 'flex', gap: 36 }}>
          {PRINTS.map((card) => (
            <div
              key={card.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: 290,
                background: '#fffef9',
                padding: '26px 22px 24px',
                boxShadow: '0 3px 5px rgba(44,24,16,0.14), 0 24px 48px rgba(44,24,16,0.3)',
                transform: `rotate(${card.rotate})`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  top: -12,
                  left: 90,
                  width: 96,
                  height: 26,
                  background: card.tape,
                  transform: 'rotate(-4deg)',
                  boxShadow: '0 1px 3px rgba(0,0,0,.12)',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: '#2c1810' }}>{card.title}</div>
              </div>
              <div style={{ display: 'flex', fontSize: 18, color: 'rgba(44,24,16,.5)', marginTop: 10 }}>{card.loc}</div>
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  marginTop: 14,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  color: card.color,
                }}
              >
                {card.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
