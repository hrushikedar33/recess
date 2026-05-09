module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@app': './src/app',
          '@core': './src/core',
          '@data': './src/data',
          '@domain': './src/domain',
          '@features': './src/features',
          '@services': './src/services',
          '@shared': './src/shared',
        },
      },
    ],
  ],
};
