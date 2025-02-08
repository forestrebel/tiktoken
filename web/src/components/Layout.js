'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path) => pathname === path

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Link href="/" className="text-xl font-bold">TikToken</Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <nav className="border-t border-gray-800">
            <Link 
              href="/" 
              className={`block p-4 hover:bg-gray-800 transition-colors ${
                isActive('/') ? 'bg-gray-800' : ''
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/upload" 
              className={`block p-4 hover:bg-gray-800 transition-colors ${
                isActive('/upload') ? 'bg-gray-800' : ''
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Upload
            </Link>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Navigation Bar */}
      <nav className="sticky bottom-0 z-50 bg-black border-t border-gray-800">
        <div className="flex justify-around">
          <Link 
            href="/" 
            className={`flex-1 p-4 text-center hover:bg-gray-800 transition-colors ${
              isActive('/') ? 'bg-gray-800' : ''
            }`}
          >
            <svg 
              className="w-6 h-6 mx-auto" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
            <span className="text-sm mt-1 block">Home</span>
          </Link>
          <Link 
            href="/upload" 
            className={`flex-1 p-4 text-center hover:bg-gray-800 transition-colors ${
              isActive('/upload') ? 'bg-gray-800' : ''
            }`}
          >
            <svg 
              className="w-6 h-6 mx-auto" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            <span className="text-sm mt-1 block">Upload</span>
          </Link>
        </div>
      </nav>
    </div>
  )
} 