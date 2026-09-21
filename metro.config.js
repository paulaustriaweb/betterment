// Web builds are the shipping target (CLAUDE.md §13). expo-sqlite runs there as
// wasm + OPFS, which needs two things Metro doesn't do by default: resolve the
// .wasm file as an asset, and serve the cross-origin isolation headers OPFS
// requires. The static host has to send the same two headers — see vercel.json.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // require-corp, not credentialless: Safari only supports the former, and iOS
  // Safari is the one browser this has to work in.
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  return middleware(req, res, next);
};

module.exports = config;
