'use client'

import { useEffect, useRef, useState } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default function VideoPlayer({ url, poster }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Wait for DOM to be ready
    if (!videoRef.current || !containerRef.current) return

    const options = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      aspectRatio: '9:16',
      poster: poster,
      crossOrigin: 'anonymous',
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
    }

    // Initialize player
    try {
      playerRef.current = videojs(videoRef.current, options)

      // Handle errors
      playerRef.current.on('error', () => {
        const error = playerRef.current.error()
        setError(`Error ${error.code}: ${error.message}`)
      })

      // Lock to portrait orientation if supported
      if (typeof window !== 'undefined' && screen.orientation?.lock) {
        screen.orientation.lock('portrait').catch(() => {
          // Silently fail if orientation lock is not supported
        })
      }
    } catch (err) {
      console.error('Failed to initialize video player:', err)
      setError('Failed to initialize video player')
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose()
        } catch (err) {
          console.error('Failed to dispose video player:', err)
        }
      }
    }
  }, [poster])

  useEffect(() => {
    if (!playerRef.current || !url) return
    
    try {
      playerRef.current.src({
        src: url,
        type: 'video/mp4'
      })
    } catch (err) {
      console.error('Failed to set video source:', err)
      setError('Failed to load video')
    }
  }, [url])

  return (
    <div ref={containerRef} className="video-container relative aspect-[9/16] bg-black">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm text-center p-4">
          {error}
        </div>
      ) : (
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered vjs-theme-forest"
          playsInline
          crossOrigin="anonymous"
        />
      )}
    </div>
  )
} 