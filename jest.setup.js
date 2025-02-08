import '@testing-library/react-native';

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  exists: jest.fn(() => Promise.resolve(true)),
  readFile: jest.fn(() => Promise.resolve('test-content')),
  stat: jest.fn(() => Promise.resolve({ size: 1024, mtime: '2024-01-01' })),
  read: jest.fn(() => Promise.resolve('test-content')),
  copyFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  CachesDirectoryPath: '/test/cache',
  DocumentDirectoryPath: '/test/documents'
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn()
  }))
}));

// Mock firebase
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve('test-url')),
  uploadBytesResumable: jest.fn(() => ({
    on: jest.fn(),
    snapshot: { bytesTransferred: 0, totalBytes: 1024 }
  }))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user' }
  }))
}));

// Mock ffmpeg-kit-react-native
jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: jest.fn(() => Promise.resolve({
      getReturnCode: () => Promise.resolve(0),
      getOutput: () => Promise.resolve(''),
    })),
  },
  FFprobeKit: {
    execute: jest.fn(() => Promise.resolve({
      getReturnCode: () => Promise.resolve(0),
      getOutput: () => Promise.resolve(JSON.stringify({
        streams: [{
          width: 720,
          height: 1280,
          codec_name: 'h264',
        }],
      })),
    })),
  },
  FFmpegKitConfig: {
    enableRedirection: jest.fn(),
    setFontDirectory: jest.fn(),
    setFontconfigConfigurationPath: jest.fn()
  }
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn(obj => obj.android)
  }
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'ok' })
  })
);

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  FIREBASE_EMULATOR_HOST: 'http://localhost:9199',
  OPENSHOT_API_URL: 'http://localhost:8000',
  FIREBASE_CONFIG: '{}',
  OPENSHOT_TOKEN: 'test-token',
};

// Mock RNFS
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/test/documents',
  CachesDirectoryPath: '/test/cache',
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() => Promise.resolve({
    size: 1024 * 1024, // 1MB
    mtime: new Date().toISOString(),
  })),
})); 