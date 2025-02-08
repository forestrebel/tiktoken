module.exports = {
  presets: [
    ['module:metro-react-native-babel-preset', {
      targets: { node: 'current' }
    }]
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', {
      allowTopLevelThis: true,
      loose: true,
      strict: false
    }]
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }]
      ],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }
  }
};
