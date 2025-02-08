'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useInView } from 'react-intersection-observer'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function VideoGrid() {
  const { videos, hasMore, page, addVideos, setError } = useStore()
  const { ref, inView } = useInView()

  const loadVideos = async () => {
    try {
      const { data: newVideos, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * 10, (page + 1) * 10 - 1)

      if (error) throw error

      // Get video URLs
      const videosWithUrls = await Promise.all(
        newVideos.map(async (video) => {
          const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(video.file_path)
          return { ...video, url: publicUrl }
        })
      )

      addVideos(videosWithUrls)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (inView && hasMore) {
      loadVideos()
    }
  }, [inView])

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {videos.map(video => (
          <Link
            key={video.id}
            href={`/watch/${video.id}`}
            className="aspect-[9/16] relative rounded-lg overflow-hidden bg-gray-800"
          >
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
            <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
              <p className="text-sm truncate">{video.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="h-20" />
      )}
    </div>
  )
}
