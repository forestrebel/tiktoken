module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    'module:metro-react-native-babel-preset'
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', { regenerator: true }]
  ]
}; 