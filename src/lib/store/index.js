import { create } from 'zustand'

const useStore = create((set) => ({
  // Videos state
  videos: [],
  setVideos: (videos) => set({ videos }),
  addVideo: (video) => set((state) => ({ 
    videos: [video, ...state.videos] 
  })),

  // Loading states
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Error states
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Upload progress
  uploadProgress: 0,
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  resetUploadProgress: () => set({ uploadProgress: 0 }),
}))

export default useStore 