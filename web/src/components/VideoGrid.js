'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const PAGE_SIZE = 10

export default function VideoGrid() {
  const [videos, setVideos] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const { ref, inView } = useInView()

  const loadVideos = async () => {
    if (loading || !hasMore) return
    
    try {
      setLoading(true)
      setError(null)

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data: newVideos, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (fetchError) throw fetchError
      
      if (!newVideos || newVideos.length < PAGE_SIZE) {
        setHasMore(false)
      }
      
      // Get video URLs
      const videosWithUrls = await Promise.all(
        newVideos.map(async (video) => {
          const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(video.file_path)
          return { ...video, url: publicUrl }
        })
      )
      
      setVideos(prev => [...prev, ...videosWithUrls])
      setPage(prev => prev + 1)
    } catch (err) {
      console.error('Error loading videos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (inView) {
      loadVideos()
    }
  }, [inView])

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Grid Layout */}
      <div className="grid grid-cols-2 gap-4">
        {videos.map(video => (
          <Link
            key={video.id}
            href={`/watch/${video.id}`}
            className="aspect-[9/16] relative rounded-lg overflow-hidden bg-gray-800"
          >
            {/* Video Thumbnail */}
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              preload="metadata"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
            
            {/* Video Info */}
            <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
              <h3 className="text-sm font-medium truncate">
                {video.title}
              </h3>
            </div>
          </Link>
        ))}

        {/* Loading Placeholders */}
        {loading && Array.from({ length: 2 }).map((_, i) => (
          <div 
            key={`placeholder-${i}`}
            className="aspect-[9/16] bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={ref} className="h-20" />
    </div>
  )
} 