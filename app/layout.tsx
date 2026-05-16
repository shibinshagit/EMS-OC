import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import SessionWrapper from '@/components/SessionWrapper'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'OpenCoders - Employee Management Portal',
  description: 'Comprehensive employee management system with attendance tracking and leave management',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/opencoders-black.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/logo.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/logo.png',
        type: 'image/svg+xml',
      },
    ],
    apple: '/opencoders-black.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <SessionWrapper>
          {children}
        </SessionWrapper>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
