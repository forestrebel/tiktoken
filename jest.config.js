module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|mp4|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  testEnvironment: 'node',
  testRegex: '/__tests__/.*\\.test\\.js$',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**'
  ],
  setupFiles: ['./jest.setup.js'],
  // Prevent complexity
  maxWorkers: 2,
  maxConcurrency: 1,
  testTimeout: 5000
}; 