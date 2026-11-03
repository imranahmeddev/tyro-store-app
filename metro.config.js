const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure audio assets (.wav, .mp3) are bundled cleanly for offline cash-register chimes
if (!config.resolver.assetExts.includes('wav')) {
  config.resolver.assetExts.push('wav');
}
if (!config.resolver.assetExts.includes('mp3')) {
  config.resolver.assetExts.push('mp3');
}

module.exports = config;

