'use client'

import { useState, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import VideoPlayer from './VideoPlayer'
import { supabase } from '@/lib/supabaseClient'

const VIDEOS_PER_PAGE = 9
const LOAD_THRESHOLD = 0.5

export default function VideoGrid() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const pageRef = useRef(0)
  const loadedIds = useRef(new Set())
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: LOAD_THRESHOLD,
    triggerOnce: false
  })

  const loadVideos = async () => {
    try {
      setLoading(true)
      const from = pageRef.current * VIDEOS_PER_PAGE
      const to = from + VIDEOS_PER_PAGE - 1

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      // Filter out duplicates and get public URLs
      const newVideos = await Promise.all(
        data
          .filter(video => !loadedIds.current.has(video.id))
          .map(async (video) => {
            loadedIds.current.add(video.id)
            const { data: { publicUrl } } = supabase.storage
              .from('videos')
              .getPublicUrl(video.file_path)
            return { ...video, url: publicUrl }
          })
      )

      setVideos(prev => [...prev, ...newVideos])
      setHasMore(data.length === VIDEOS_PER_PAGE && newVideos.length > 0)
      pageRef.current += 1
    } catch (err) {
      console.error('Failed to load videos:', err)
      setError('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Reset state when component mounts
    setVideos([])
    loadedIds.current.clear()
    pageRef.current = 0
    loadVideos()

    // Cleanup function
    return () => {
      setVideos([])
      loadedIds.current.clear()
      pageRef.current = 0
    }
  }, [])

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadVideos()
    }
  }, [inView, hasMore, loading])

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button 
          onClick={() => {
            setError(null)
            setVideos([])
            loadedIds.current.clear()
            pageRef.current = 0
            loadVideos()
          }}
          className="ml-2 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!loading && videos.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No videos found. Upload your first video!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {videos.map(video => (
        <div 
          key={video.id}
          className="aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-lg"
        >
          <VideoPlayer 
            key={`player-${video.id}`}
            url={video.url} 
            poster={video.thumbnail_url}
          />
        </div>
      ))}
      
      {hasMore && (
        <div ref={loadMoreRef} className="col-span-full py-4 text-center">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto" />
          ) : (
            <span className="text-gray-500">Loading more videos...</span>
          )}
        </div>
      )}
    </div>
  )
} 