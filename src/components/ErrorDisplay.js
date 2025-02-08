'use client'
import { useStore } from '@/lib/store'

export default function ErrorDisplay() {
  const { error } = useStore()

  if (!error) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
      <p className="text-center">{error}</p>
    </div>
  )
} 