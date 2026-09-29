module.exports = {
  root: true,
  // Native projects and their build output (Gradle test reports contain generated .js files).
  ignorePatterns: ['android/', 'ios/'],
  extends: [
    '@react-native',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  overrides: [
    {
      // CommonJS tool configs are loaded by Node, where require() is idiomatic.
      files: ['*.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/set-state-in-effect': 'off',
  },
};
