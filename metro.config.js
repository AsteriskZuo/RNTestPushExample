const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    // '/Users/asterisk/tmp/2024.08.08/react-native-push-collection-1.0.0-alpha.2',
  ],
  resolver: {
    nodeModulesPaths: [
      // '/Users/asterisk/Codes/zuoyu/RNTestPushExample/node_modules',
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
