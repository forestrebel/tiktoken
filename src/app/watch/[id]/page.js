'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default function Watch({ params }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)

  useEffect(() => {
    if (!videoRef.current) return

    // Initialize video.js player
    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      aspectRatio: '9:16',
      playbackRates: [0.5, 1, 1.5, 2],
      userActions: {
        hotkeys: true
      },
      controlBar: {
        playToggle: true,
        volumePanel: true,
        currentTimeDisplay: true,
        timeDivider: true,
        durationDisplay: true,
        progressControl: true,
        fullscreenToggle: true,
        pictureInPictureToggle: false,
        remainingTimeDisplay: false,
      }
    })

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
      }
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Video Player */}
      <div className="relative bg-black aspect-[9/16] w-full">
        <div data-vjs-player>
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
          >
            <source
              src={`/api/videos/${params.id}`}
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-gray-400">
            ← Back
          </Link>
          <button className="text-gray-400">
            •••
          </button>
        </div>

        <h1 className="text-xl font-bold mb-2">Video Title</h1>
        <p className="text-gray-400">Video description goes here...</p>
      </div>
    </div>
  )
} 