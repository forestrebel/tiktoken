// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  exists: jest.fn(() => Promise.resolve(true)),
  readFile: jest.fn(() => Promise.resolve('test-content')),
  CachesDirectoryPath: '/test/cache'
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve())
}));

// Mock firebase
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve('test-url'))
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user' }
  }))
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_EMULATOR_HOST = 'http://localhost:9199';
process.env.OPENSHOT_API_URL = 'http://localhost:8000';
process.env.FIREBASE_CONFIG = '{}';
process.env.OPENSHOT_TOKEN = 'test-token'; 