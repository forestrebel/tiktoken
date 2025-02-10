'use client'

import { useState } from 'react'

export default function VideoUpload() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
  }

  return (
    <div className="p-4 space-y-4">
      {/* File Input */}
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
            <span className="text-gray-400">Select Video</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {/* Basic Info */}
      {file && (
        <div className="text-sm text-gray-400">
          Selected: {file.name} ({Math.round(file.size / 1024 / 1024)}MB)
        </div>
      )}
    </div>
  )
} 