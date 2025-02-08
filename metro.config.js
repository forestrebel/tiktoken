const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  watchFolders: [
    // Add custom folders to watch here
  ],
  resolver: {
    blockList: [
      // Exclude Kotlin cache directories
      /.*\.kotlin.*/,
      /.*\build\kotlin.*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config); 