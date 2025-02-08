import { Inter } from 'next/font/google'
import './globals.css'
import Layout from '@/components/Layout'
import ErrorDisplay from '@/components/ErrorDisplay'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TikToken - Nature Content Platform',
  description: 'Share and discover amazing nature content',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TikToken',
  },
  applicationName: 'TikToken',
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Layout>
          <ErrorDisplay />
          {children}
        </Layout>
      </body>
    </html>
  )
}
