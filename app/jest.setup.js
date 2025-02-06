// Mock react-native-video
jest.mock('react-native-video', () => 'Video');

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(true),
  copyFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true)
}));

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn().mockResolvedValue({
    uri: 'file://test.mp4',
    type: 'video/mp4',
    size: 1024 * 1024 // 1MB
  }),
  types: { video: 'video/*' }
}));

// Mock dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({ width: 360, height: 640 })
})); 