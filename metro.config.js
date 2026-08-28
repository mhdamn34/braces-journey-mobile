// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-router's require.context bundles every .ts(x)/.js(x) file under src/app
// (see node_modules/babel-preset-expo/build/plugins/expo-router-plugin.js), so
// co-located component tests (e.g. src/app/(tabs)/index.test.tsx, added in
// Task 15) get pulled into the Metro graph and pull in Node-only modules from
// @testing-library/react-native. Block them from Metro without touching Jest,
// which uses its own testMatch and never reads this file.
config.resolver.blockList = [...config.resolver.blockList, /\.test\.[jt]sx?$/];

module.exports = config;
