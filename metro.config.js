const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    '/Users/asterisk/tmp/2024.07.26/react-native-push-collection-0.1.0',
  ],
  resolver: {
    nodeModulesPaths: [
      '/Users/asterisk/tmp/2024.07.26/RNTestPushExample/node_modules',
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
