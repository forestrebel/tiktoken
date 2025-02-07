module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)'
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  collectCoverageFrom: [
    'src/screens/**/*.js',
    'src/components/**/*.js',
    'src/services/**/*.js'
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50
    }
  }
};
