// Video file creation helpers
export const createVideoFile = {
  portrait: (size = 1024) => ({
    uri: 'file:///test/portrait.mp4',
    type: 'video/mp4',
    name: 'portrait.mp4',
    size: size
  }),

  landscape: (size = 1024) => ({
    uri: 'file:///test/landscape.mp4',
    type: 'video/mp4',
    name: 'landscape.mp4',
    size: size
  }),

  oversized: () => ({
    uri: 'file:///test/large.mp4',
    type: 'video/mp4',
    name: 'large.mp4',
    size: 101 * 1024 * 1024 // 101MB
  }),

  corrupt: () => ({
    uri: 'file:///test/corrupt.mp4',
    type: 'application/octet-stream',
    name: 'corrupt.mp4',
    size: 1024
  })
}; 