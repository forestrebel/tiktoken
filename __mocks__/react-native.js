module.exports = {
  Platform: {
    OS: 'android',
    select: jest.fn(obj => obj.android)
  },
  NativeModules: {
    VideoModule: {
      initialize: jest.fn(),
      processVideo: jest.fn()
    }
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 360, height: 640 }))
  }
}; 