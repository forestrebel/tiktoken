'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import VideoPlayer from './VideoPlayer'

export default function VideoFeed() {
  const containerRef = useRef(null)
  const { videos, hasMore, loadVideos } = useStore()
  const observerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore) {
            loadVideos()
          }
        })
      },
      { threshold: 0.1 }
    )

    const sentinel = containerRef.current.lastElementChild
    if (sentinel) {
      observerRef.current.observe(sentinel)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [videos.length, hasMore])

  return (
    <div 
      ref={containerRef}
      className="min-h-screen snap-y snap-mandatory overflow-y-scroll"
    >
      {videos.map((video) => (
        <div 
          key={video.id}
          className="h-screen w-full snap-start snap-always relative"
        >
          <VideoPlayer
            url={video.url}
            autoPlay={false}
            loop={true}
            controls={true}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <h2 className="text-white text-lg font-bold">
              {video.title || video.filename}
            </h2>
            {video.description && (
              <p className="text-white/80 text-sm mt-1">
                {video.description}
              </p>
            )}
          </div>
        </div>
      ))}
      {hasMore && (
        <div className="h-20" /> {/* Sentinel element */}
      )}
    </div>
  )
} 