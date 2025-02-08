'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    async function testConnection() {
      try {
        // Test database connection
        const { data, error } = await supabase
          .from('videos')
          .select('count(*)')
          .single()

        if (error) throw error

        // Test storage connection
        const { data: bucketData, error: bucketError } = await supabase
          .storage
          .getBucket('videos')

        if (bucketError) throw bucketError

        setStatus('✅ Supabase connection successful!')
      } catch (error) {
        console.error('Connection error:', error)
        setStatus(`❌ Connection failed: ${error.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Supabase Connection Test</h1>
      <p className="text-lg">{status}</p>
    </div>
  )
} 