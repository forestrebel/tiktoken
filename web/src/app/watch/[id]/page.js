'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import VideoPlayer from '@/components/VideoPlayer'
import useStore from '@/lib/store'

export default function WatchPage({ params }) {
  const [video, setVideo] = useState(null)
  const { setError } = useStore()

  useEffect(() => {
    async function loadVideo() {
      try {
        // Get video metadata
        const { data, error: fetchError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', params.id)
          .single()

        if (fetchError) throw fetchError

        // Get video URL
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(data.file_path)

        setVideo({ ...data, url: publicUrl })
      } catch (err) {
        console.error('Error loading video:', err)
        setError('Failed to load video')
      }
    }

    loadVideo()
  }, [params.id, setError])

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Video Player */}
      <VideoPlayer url={video.url} />

      {/* Video Info */}
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">{video.title}</h1>
        {video.description && (
          <p className="text-gray-400 mb-4">{video.description}</p>
        )}
        <div className="text-sm text-gray-500">
          {new Date(video.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
    </div>
  )
} 