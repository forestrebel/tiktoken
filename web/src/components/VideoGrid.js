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

      setVideos(prev => [...prev, ...data])
      setHasMore(data.length === VIDEOS_PER_PAGE)
      pageRef.current += 1
    } catch (err) {
      console.error('Failed to load videos:', err)
      setError('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
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
            loadVideos()
          }}
          className="ml-2 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {videos.map(video => (
        <div 
          key={video.id}
          className="aspect-[9/16] bg-black rounded-lg overflow-hidden"
        >
          <VideoPlayer url={video.url} />
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