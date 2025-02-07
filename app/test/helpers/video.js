// Test video factory
export const createVideoFile = {
  portrait: () => ({
    uri: 'file:///test/portrait.mp4',
    type: 'video/mp4',
    size: 50 * 1024 * 1024, // 50MB
    width: 720,
    height: 1280,
    fps: 30,
    duration: 45
  }),

  landscape: () => ({
    uri: 'file:///test/landscape.mp4',
    type: 'video/mp4',
    size: 50 * 1024 * 1024,
    width: 1280,
    height: 720,
    fps: 30,
    duration: 45
  }),

  oversized: () => ({
    uri: 'file:///test/big.mp4',
    type: 'video/mp4',
    size: 150 * 1024 * 1024, // 150MB
    width: 720,
    height: 1280,
    fps: 30,
    duration: 45
  }),

  invalid: () => ({
    uri: 'file:///test/invalid.txt',
    type: 'text/plain',
    size: 1024,
    width: 0,
    height: 0,
    fps: 0,
    duration: 0
  })
};
