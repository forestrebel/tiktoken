import { create } from 'zustand'

const useStore = create((set) => ({
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))

export default useStore 