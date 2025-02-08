// Mock react-native-video
jest.mock('react-native-video', () => 'Video');

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(true),
  copyFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true),
}));

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn().mockResolvedValue({
    uri: 'file://test.mp4',
    type: 'video/mp4',
    size: 1024 * 1024, // 1MB
  }),
  types: { video: 'video/*' },
}));

// Mock dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({ width: 360, height: 640 }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock RNFS
jest.mock('react-native-fs', () => ({
  mkdir: jest.fn(),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
  pathForBundle: jest.fn(),
  pathForGroup: jest.fn(),
  getFSInfo: jest.fn(),
  getAllExternalFilesDirs: jest.fn(),
  unlink: jest.fn(),
  exists: jest.fn(),
  stopDownload: jest.fn(),
  resumeDownload: jest.fn(),
  isResumable: jest.fn(),
  stopUpload: jest.fn(),
  completeHandlerIOS: jest.fn(),
  readDir: jest.fn(),
  readDirAssets: jest.fn(),
  existsAssets: jest.fn(),
  readdir: jest.fn(),
  setReadable: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  read: jest.fn(),
  readFileAssets: jest.fn(),
  hash: jest.fn(),
  copyFileAssets: jest.fn(),
  copyFileAssetsIOS: jest.fn(),
  copyAssetsVideoIOS: jest.fn(),
  writeFile: jest.fn(),
  appendFile: jest.fn(),
  write: jest.fn(),
  downloadFile: jest.fn(),
  uploadFiles: jest.fn(),
  touch: jest.fn(),
  MainBundlePath: '/main/bundle/path',
  CachesDirectoryPath: '/caches',
  DocumentDirectoryPath: '/documents',
  ExternalDirectoryPath: '/storage/emulated/0',
  ExternalStorageDirectoryPath: '/storage/emulated/0',
  TemporaryDirectoryPath: '/tmp',
  LibraryDirectoryPath: '/library',
  PicturesDirectoryPath: '/pictures',
}));

// Mock FFmpeg
jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: jest.fn(),
  },
  FFprobeKit: {
    execute: jest.fn(),
  },
  FFmpegKitConfig: {
    enableRedirection: jest.fn(),
  },
}));

// Mock React Native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn(obj => obj.android)
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 360, height: 640 })),
  },
  NativeModules: {
    VideoModule: {
      initialize: jest.fn(),
      processVideo: jest.fn()
    }
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: { videoId: 'test-video' },
  }),
}));

// Mock Firebase
const mockStorage = {
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadBytesResumable: jest.fn(),
};

jest.mock('firebase/storage', () => ({
  getStorage: () => mockStorage,
  ref: mockStorage.ref,
  uploadBytes: mockStorage.uploadBytes,
  uploadBytesResumable: mockStorage.uploadBytesResumable,
}));

jest.mock('./src/config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
    },
  },
}));

// Mock video service
const mockVideo = {
  id: 'test-video',
  uri: 'file:///test/video.mp4',
  width: 720,
  height: 1280,
  type: 'video/mp4',
  size: 1024 * 1024, // 1MB
};

jest.mock('./src/services/video', () => ({
  videoService: {
    importVideo: jest.fn().mockImplementation(async (uri) => {
      if (uri === 'invalid.txt') {
        throw new Error('Invalid file type: Must be MP4');
      }
      if (uri.includes('large.mp4')) {
        throw new Error('File too large: Must be under 100MB');
      }
      if (uri.includes('landscape.mp4')) {
        throw new Error('Invalid format: Must be portrait mode (9:16)');
      }
      return mockVideo;
    }),
    validateVideo: jest.fn().mockImplementation(async (uri) => {
      if (uri === 'invalid.txt') {
        return { status: 'error', error: 'Invalid file type: Must be MP4' };
      }
      if (uri.includes('large.mp4')) {
        return { status: 'error', error: 'File too large: Must be under 100MB' };
      }
      if (uri.includes('landscape.mp4')) {
        return { status: 'error', error: 'Invalid format: Must be portrait mode (9:16)' };
      }
      return {
        status: 'success',
        data: {
          width: 720,
          height: 1280,
          type: 'video/mp4',
          size: 1024 * 1024,
        },
      };
    }),
    getVideo: jest.fn().mockResolvedValue(mockVideo),
    getVideos: jest.fn().mockResolvedValue([mockVideo]),
    createPlayer: jest.fn().mockResolvedValue({ ready: true, videoId: 'test-video' }),
    getThumbnail: jest.fn().mockResolvedValue('file:///test/thumbnail.jpg'),
    getPlayer: jest.fn().mockResolvedValue({ ready: true, videoId: 'test-video' }),
    getVideoState: jest.fn().mockResolvedValue({
      id: 'test-video',
      uri: 'file:///test/video.mp4',
      thumbnail: 'file:///test/thumbnail.jpg',
    }),
  },
}));
