'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VideoUploader from '@/components/upload/VideoUploader'
import useStore from '@/lib/store'

export default function Upload() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoData, setVideoData] = useState(null)
  const { setError } = useStore()

  const handleUploadSuccess = (data) => {
    setVideoData(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!videoData || !title) return

    try {
      // TODO: Save video metadata to Supabase database
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/')
    } catch (error) {
      console.error('Failed to save video:', error)
      setError('Failed to save video. Please try again.')
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Video Upload */}
        <VideoUploader onSuccess={handleUploadSuccess} />

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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!videoData || !title}
          className="bg-green-500 text-white p-4 rounded-lg font-medium disabled:opacity-50"
        >
          Publish Video
        </button>
      </form>
    </div>
  )
} 