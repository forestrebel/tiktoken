'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { videoProcessor } from '@/lib/videoProcessor'
import useStore from '@/lib/store'

const MAX_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || '100') * 1024 * 1024
const ALLOWED_TYPES = (process.env.NEXT_PUBLIC_ALLOWED_VIDEO_TYPES || 'video/mp4,video/quicktime,video/x-m4v').split(',')

export default function VideoUpload() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const { setError } = useStore()

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('video/') || !ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Please select a valid video file')
      return
    }

    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setPreview(url)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !title) return

    try {
      setUploading(true)
      setProgress(0)
      setStage('Processing')

      // Generate thumbnail
      setStage('Generating thumbnail')
      const thumbnail = await videoProcessor.generateThumbnail(file, {
        time: 0.1,
        quality: 90
      })
      setProgress(20)

      // Compress video if needed
      setStage('Compressing video')
      const processedVideo = await videoProcessor.compress(file, {
        maxSize: MAX_SIZE,
        onProgress: (p) => setProgress(20 + (p * 0.4)) // 20-60%
      })
      setProgress(60)

      // Upload video to Supabase Storage
      setStage('Uploading')
      const fileExt = processedVideo.name.split('.').pop()
      const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`
      
      // Upload thumbnail
      const thumbName = fileName.replace(/\.[^/.]+$/, '') + '_thumb.jpg'
      const { error: thumbError } = await supabase.storage
        .from('videos')
        .upload(`thumbnails/${thumbName}`, thumbnail)

      if (thumbError) throw thumbError
      setProgress(70)

      // Upload video
      const { error: uploadError, data } = await supabase.storage
        .from('videos')
        .upload(`videos/${fileName}`, processedVideo)

      if (uploadError) throw uploadError
      setProgress(90)

      // Create database entry
      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            title,
            description,
            file_path: data.path,
            storage_path: data.fullPath,
            thumbnail_path: `thumbnails/${thumbName}`,
            type: processedVideo.type,
            size: processedVideo.size,
            metadata: {
              originalName: file.name,
              duration: 0, // TODO: Extract duration
              width: 0, // TODO: Extract dimensions
              height: 0
            }
          }
        ])

      if (dbError) throw dbError

      setProgress(100)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Upload failed:', error)
      setError('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
      setStage('')
      setProgress(0)
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Video Upload/Preview */}
      <div className="aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden relative">
        {preview ? (
          <video 
            src={preview} 
            className="absolute inset-0 w-full h-full object-cover"
            controls
          />
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
            <span className="text-4xl mb-2">+</span>
            <span className="text-gray-400">Tap to select video</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="bg-gray-800 p-4 rounded-lg text-white"
        required
      />

      {/* Description */}
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="bg-gray-800 p-4 rounded-lg text-white h-32 resize-none"
      />

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 text-center">{stage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!file || !title || uploading}
        className="bg-green-500 text-white p-4 rounded-lg font-medium disabled:opacity-50"
      >
        {uploading ? 'Processing...' : 'Publish Video'}
      </button>
    </form>
  )
} 