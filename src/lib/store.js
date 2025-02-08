import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabaseClient'

export const useStore = create(
  persist(
    (set, get) => ({
      // Video State
      videos: [],
      hasMore: true,
      page: 0,
      loading: false,
      currentVideoIndex: 0,
      setCurrentVideoIndex: (index) => set({ currentVideoIndex: index }),
      
      // Video Loading
      loadVideos: async () => {
        if (get().loading || !get().hasMore) return

        set({ loading: true })
        try {
          const { data: newVideos, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .range(get().page * 10, (get().page + 1) * 10 - 1)

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

          set((state) => ({
            videos: [...state.videos, ...videosWithUrls],
            hasMore: videosWithUrls.length === 10,
            page: state.page + 1,
            loading: false
          }))
        } catch (err) {
          set({ error: err.message, loading: false })
        }
      },

      // Upload State
      uploading: false,
      uploadProgress: 0,
      setUploading: (uploading) => set({ uploading }),
      setUploadProgress: (uploadProgress) => set({ uploadProgress }),

      // Error State
      error: null,
      setError: (error) => {
        set({ error })
        if (error) {
          setTimeout(() => set({ error: null }), 5000)
        }
      },

      // UI State
      menuOpen: false,
      toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
      closeMenu: () => set({ menuOpen: false }),

      // Theme State
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode }))
    }),
    {
      name: 'tiktoken-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        videos: state.videos.slice(0, 20) // Cache only recent videos
      })
    }
  )
) 