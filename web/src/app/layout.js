import './globals.css'
import Layout from '@/components/Layout'
import ErrorDisplay from '@/components/ErrorDisplay'

export const metadata = {
  title: 'TikToken - Nature Content Platform',
  description: 'Share and discover amazing nature content',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TikToken',
  },
  other: {
    'mobile-web-app-capable': 'yes'
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

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans bg-black text-white min-h-screen">
        <main className="flex flex-col min-h-screen">
          <Layout>
            <ErrorDisplay />
            {children}
          </Layout>
        </main>
      </body>
    </html>
  )
}
