// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Build scripts run in Node, not in the app bundle.
    files: ["scripts/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly", require: "readonly", module: "writable", process: "readonly", console: "readonly" },
    },
  },
]);
