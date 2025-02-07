const mockFFmpegKit = {
  execute: jest.fn(() => Promise.resolve({
    getReturnCode: () => Promise.resolve(0),
    getOutput: () => Promise.resolve('{}')
  }))
};

const mockFFprobeKit = {
  execute: jest.fn(() => Promise.resolve({
    getReturnCode: () => Promise.resolve(0),
    getOutput: () => Promise.resolve(JSON.stringify({
      streams: [{
        width: 720,
        height: 1280,
        codec_name: 'h264'
      }]
    }))
  }))
};

const mockFFmpegKitConfig = {
  enableRedirection: jest.fn()
};

module.exports = {
  FFmpegKit: mockFFmpegKit,
  FFprobeKit: mockFFprobeKit,
  FFmpegKitConfig: mockFFmpegKitConfig,
  default: {
    FFmpegKit: mockFFmpegKit,
    FFprobeKit: mockFFprobeKit,
    FFmpegKitConfig: mockFFmpegKitConfig
  }
}; 