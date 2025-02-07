/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['module:metro-react-native-babel-preset'],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|ffmpeg-kit-.*)/)'
  ],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^ffmpeg-kit-react-native$': '<rootDir>/__mocks__/ffmpeg-kit.js'
  },
  testEnvironment: 'node',
  verbose: true
};
