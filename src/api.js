// Simple in-memory storage for demo purposes
let videos = [];

// Basic OpenShot integration
const processVideo = async (video) => {
  // In a real implementation, this would:
  // 1. Upload to OpenShot
  // 2. Apply video processing
  // 3. Return processed video URL
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...video,
        processed: true,
        processedUrl: video.uri,
      });
    }, 1500);
  });
};

export const api = {
  // Upload a video
  uploadVideo: async (file) => {
    return new Promise(async (resolve) => {
      // Create video entry
      const video = {
        id: Date.now().toString(),
        uri: file.uri,
        name: file.name,
        type: file.type,
        size: file.size,
        timestamp: new Date().toISOString(),
      };

      // Process with OpenShot
      const processedVideo = await processVideo(video);
      videos.push(processedVideo);
      resolve(processedVideo);
    });
  },

  // Get all videos
  getVideos: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(videos);
      }, 500);
    });
  },

  // Get a single video
  getVideo: async (id) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const video = videos.find(v => v.id === id);
        if (video) {
          resolve(video);
        } else {
          reject(new Error('Video not found'));
        }
      }, 500);
    });
  },

  // Clear all videos (for testing)
  clearVideos: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        videos = [];
        resolve();
      }, 500);
    });
  },
}; 