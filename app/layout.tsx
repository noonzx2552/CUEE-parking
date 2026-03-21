import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spotsync',
  description: 'ระบบที่จอดรถอัจฉริยะ CUEE',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
