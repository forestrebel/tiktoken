'use client'

import { useEffect } from 'react'
import useStore from '@/lib/store'

export default function ErrorDisplay() {
  const { error, clearError } = useStore()

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  if (!error) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
      {error}
    </div>
  )
} 