'use client'

import { useEffect, useRef } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default function VideoPlayer({ url }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)

  useEffect(() => {
    if (!videoRef.current) return

    playerRef.current = videojs(videoRef.current, {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      aspectRatio: '9:16',
      playbackRates: [0.5, 1, 1.5, 2],
      userActions: {
        hotkeys: true,
        doubleClick: true
      },
      controlBar: {
        children: [
          'playToggle',
          'progressControl',
          'volumePanel',
          'playbackRateMenuButton',
          'fullscreenToggle',
        ],
      },
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      }
    })

    // Lock to portrait orientation if supported
    if (typeof window !== 'undefined' && screen.orientation?.lock) {
      screen.orientation.lock('portrait').catch(() => {
        // Silently fail if orientation lock is not supported
      })
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    if (!playerRef.current || !url) return
    
    playerRef.current.src({
      src: url,
      type: 'video/mp4'
    })
  }, [url])

  return (
    <div className="video-container relative aspect-[9/16] bg-black">
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered vjs-theme-forest"
        playsInline
      />
    </div>
  )
} 