'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Upload() {
  const router = useRouter()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFile(file)
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    try {
      // Upload implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-4">
      <header className="flex items-center mb-6">
        <Link href="/" className="text-gray-400 mr-4">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Upload Video</h1>
      </header>

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        {/* Video Upload/Preview */}
        <div className="aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden relative">
          {preview ? (
            <video 
              src={preview} 
              className="w-full h-full object-cover"
              controls
            />
          ) : (
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
              <span className="text-4xl mb-2">+</span>
              <span className="text-gray-400">Tap to select video</span>
              <input
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
        </div>

        {/* Title & Description */}
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="bg-gray-800 p-4 rounded-lg text-white"
          required
        />

        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="bg-gray-800 p-4 rounded-lg text-white h-32 resize-none"
        />

        {/* Upload Button */}
        <button
          type="submit"
          disabled={!file || !title || uploading}
          className="bg-green-500 text-white p-4 rounded-lg font-medium disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  )
} 