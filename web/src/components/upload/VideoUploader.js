'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { videoUtils } from '@/lib/supabase'
import useStore from '@/lib/store'

const MAX_SIZE = process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB 
  ? parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB) * 1024 * 1024 
  : 100 * 1024 * 1024 // Default 100MB

const ACCEPTED_TYPES = process.env.NEXT_PUBLIC_ALLOWED_VIDEO_TYPES?.split(',') || 
  ['video/mp4', 'video/quicktime', 'video/x-m4v']

export default function VideoUploader({ onSuccess }) {
  const [preview, setPreview] = useState(null)
  const { setUploadProgress, resetUploadProgress, uploadProgress } = useStore()
  
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    // Create preview
    const url = URL.createObjectURL(file)
    setPreview(url)
    
    try {
      // Generate unique path
      const timestamp = Date.now()
      const path = `${timestamp}-${file.name}`
      
      // Upload to Supabase
      await videoUtils.uploadVideo(file, path)
      
      // Cleanup and notify
      URL.revokeObjectURL(url)
      onSuccess?.({ path, preview: url })
      
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      resetUploadProgress()
    }
  }, [onSuccess, resetUploadProgress])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          aspect-[9/16] 
          relative 
          rounded-lg 
          overflow-hidden
          border-2 
          border-dashed 
          ${isDragActive ? 'border-green-500 bg-green-500/10' : 'border-gray-600'}
          transition-colors
          cursor-pointer
        `}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <video
            src={preview}
            className="absolute inset-0 w-full h-full object-cover"
            controls
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="text-4xl mb-2">+</div>
            <p className="text-center text-gray-400">
              {isDragActive
                ? 'Drop video here...'
                : 'Tap to select or drop a video'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Max size: {MAX_SIZE / 1024 / 1024}MB
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-4">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Uploading: {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  )
} 