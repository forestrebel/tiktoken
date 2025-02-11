// Demo video data with nature content
const DEMO_VIDEOS = [
  {
    id: 'nature_1',
    title: 'Forest Canopy',
    filename: 'forest_canopy.mp4',
    thumbnail: 'forest_thumb.jpg',
    duration: 15.4,
    created_at: '2024-02-15T10:30:00Z',
    type: 'nature',
    processing: false,
  },
  {
    id: 'nature_2',
    title: 'Mountain Stream',
    filename: 'mountain_stream.mp4',
    thumbnail: 'stream_thumb.jpg',
    duration: 18.2,
    created_at: '2024-02-14T15:45:00Z',
    type: 'nature',
    processing: false,
  },
  {
    id: 'nature_3',
    title: 'Birds in Flight',
    filename: 'birds_flight.mp4',
    thumbnail: 'birds_thumb.jpg',
    duration: 17.8,
    created_at: '2024-02-13T09:20:00Z',
    type: 'nature',
    processing: false,
  },
  {
    id: 'nature_4',
    title: 'Desert Sunset',
    filename: 'desert_sunset.mp4',
    thumbnail: 'sunset_thumb.jpg',
    duration: 20.5,
    created_at: '2024-02-12T18:15:00Z',
    type: 'nature',
    processing: false,
  },
  {
    id: 'nature_5',
    title: 'Ocean Waves',
    filename: 'ocean_waves.mp4',
    thumbnail: 'waves_thumb.jpg',
    duration: 16.7,
    created_at: '2024-02-11T14:10:00Z',
    type: 'nature',
    processing: false,
  }
];

// Demo states for testing different scenarios
const DEMO_STATES = {
  // Loading state
  loading: {
    id: 'demo_loading',
    title: 'Loading Demo',
    filename: 'loading_demo.mp4',
    thumbnail: null,
    processing: true,
    created_at: new Date().toISOString(),
  },
  
  // Error state
  error: {
    id: 'demo_error',
    title: 'Error Demo',
    filename: 'error_demo.mp4',
    thumbnail: null,
    error: 'Failed to process video',
    created_at: new Date().toISOString(),
  },
  
  // Processing state
  processing: {
    id: 'demo_processing',
    title: 'Processing Demo',
    filename: 'processing_demo.mp4',
    thumbnail: 'processing_thumb.jpg',
    processing: true,
    progress: 45,
    created_at: new Date().toISOString(),
  }
};

// Demo token transactions
const DEMO_TOKENS = [
  {
    id: 'token_1',
    amount: 100,
    type: 'MINT',
    created_at: '2024-02-15T10:00:00Z',
    video_id: 'nature_1'
  },
  {
    id: 'token_2',
    amount: -30,
    type: 'TRANSFER',
    created_at: '2024-02-14T15:00:00Z',
    video_id: 'nature_2'
  },
  {
    id: 'token_3',
    amount: 50,
    type: 'MINT',
    created_at: '2024-02-13T09:00:00Z',
    video_id: 'nature_3'
  }
];

// Helper function to simulate loading states
const simulateLoading = (duration = 2000) => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

// Helper function to simulate errors
const simulateError = (message = 'An error occurred') => {
  return Promise.reject(new Error(message));
};

// Helper function to get a random demo video
const getRandomDemoVideo = () => {
  return DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)];
};

module.exports = {
  DEMO_VIDEOS,
  DEMO_STATES,
  DEMO_TOKENS,
  simulateLoading,
  simulateError,
  getRandomDemoVideo
}; 