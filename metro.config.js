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
  resolver: {
    assetExts: [
      'mp4',
      'mov',
    ],
    sourceExts: ['js', 'json', 'jsx'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config); 