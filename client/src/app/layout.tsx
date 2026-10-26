import type { Metadata } from 'next'
import { Geist, Playfair_Display, Caveat } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from '@/components/UI/Toaster'
import { MotionProvider } from '@/components/UI/MotionProvider'
import { SplashScreen } from '@/components/UI/SplashScreen'
import { CloudSync } from '@/components/UI/CloudSync'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], style: ['normal', 'italic'] })
const caveat = Caveat({ variable: '--font-caveat', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'TravelClick: Plan Your Next Adventure',
    template: '%s · TravelClick',
  },
  description:
    'Paste TikToks, YouTube videos, and articles. AI extracts the places, pins them to a travel scrapbook, and builds your day-by-day itinerary, packing list, and destination brief.',
  openGraph: {
    title: 'TravelClick',
    description: 'Your saved travel videos, made into a trip you can take. Pin the places, then plan the days.',
    siteName: 'TravelClick',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelClick',
    description: 'Your saved travel videos, made into a trip you can take.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable} ${caveat.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Hide the splash before paint on reloads within the same session */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('tc-splash-seen'))document.documentElement.classList.add('tc-seen')}catch(e){}" }} />
      </head>
      <body className="min-h-full flex flex-col antialiased" style={{ background: '#e9dfcd' }}>
        <SplashScreen />
        <MotionProvider>
          <AuthProvider>
            <CloudSync />
            {children}
          </AuthProvider>
        </MotionProvider>
        <Toaster />
      </body>
    </html>
  )
}
