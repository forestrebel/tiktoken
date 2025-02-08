import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Video storage bucket name
export const VIDEOS_BUCKET = 'videos'

// Helper functions for video operations
export const videoUtils = {
  // Get a public URL for a video
  getPublicUrl: (path) => {
    const { data } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(path)
    return data?.publicUrl
  },

  // Upload a video file
  uploadVideo: async (file, path) => {
    const { data, error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    return data
  },

  // Delete a video file
  deleteVideo: async (path) => {
    const { error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .remove([path])
    
    if (error) throw error
  }
} 