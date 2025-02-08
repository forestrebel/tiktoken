/**
 * Video test helper utilities
 * Creates mock video files for testing with specific properties
 */

const BASE_VIDEO = {
  uri: 'file:///test/videos/nature.mp4',
  type: 'video/mp4',
  name: 'nature.mp4',
  size: 1024 * 1024 // 1MB
};

export const createVideoFile = {
  /**
   * Creates a valid 9:16 portrait video
   */
  portrait: () => ({
    ...BASE_VIDEO,
    width: 720,
    height: 1280,
    duration: 30, // 30 seconds
    orientation: 'portrait'
  }),

  /**
   * Creates an invalid 16:9 landscape video
   */
  landscape: () => ({
    ...BASE_VIDEO,
    uri: 'file:///test/videos/landscape.mp4',
    name: 'landscape.mp4',
    width: 1280,
    height: 720,
    orientation: 'landscape'
  }),

  /**
   * Creates an oversized video (>100MB)
   */
  oversized: () => ({
    ...BASE_VIDEO,
    uri: 'file:///test/videos/large.mp4',
    name: 'large.mp4',
    size: 150 * 1024 * 1024, // 150MB
    width: 720,
    height: 1280
  })
};

/**
 * Test video data
 */
export const testVideos = [
  {
    id: 'test-video',
    uri: 'file://test/videos/test.mp4',
    width: 720,
    height: 1280,
    type: 'video/mp4',
    thumbnail: 'file://test/thumbnails/test_thumb.jpg',
  },
  {
    id: 'demo1',
    uri: 'file://test/videos/demo1.mp4',
    width: 720,
    height: 1280,
    type: 'video/mp4',
    thumbnail: 'file://test/thumbnails/demo1_thumb.jpg',
  },
]; 