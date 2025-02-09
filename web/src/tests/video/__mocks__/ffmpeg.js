/**
 * Centralized FFmpeg mock implementation
 * Provides consistent mocking across all video-related tests
 */

// Mock progress event data
const createProgressEvent = (progress) => ({
  progress: Math.min(progress, 1),
  time: progress * 1000
});

// Mock video metadata for different orientations
const createVideoMetadata = (orientation = 'portrait') => {
  const baseMetadata = {
    format: {
      duration: '30.0',
      size: '15000000',
      bit_rate: '4000000'
    },
    streams: [{
      codec_type: 'video',
      codec_name: 'h264',
      bit_rate: '4000000',
      duration: '30.0'
    }]
  };

  switch (orientation) {
    case 'portrait':
      baseMetadata.streams[0].width = 720;
      baseMetadata.streams[0].height = 1280;
      break;
    case 'landscape':
      baseMetadata.streams[0].width = 1280;
      baseMetadata.streams[0].height = 720;
      break;
    case 'square':
      baseMetadata.streams[0].width = 1080;
      baseMetadata.streams[0].height = 1080;
      break;
    default:
      throw new Error(`Unknown orientation: ${orientation}`);
  }

  return baseMetadata;
};

// Mock FFmpeg instance factory
export const getMockFFmpeg = (orientation = 'portrait') => {
  const mockInstance = {
    load: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockImplementation(() => {
      // Return metadata JSON when reading metadata output
      if (mockInstance._lastExecCommand?.includes('-show_format')) {
        return Buffer.from(JSON.stringify(createVideoMetadata(orientation)));
      }
      return new Uint8Array();
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    exec: jest.fn().mockImplementation((args) => {
      mockInstance._lastExecCommand = args.join(' ');
      return Promise.resolve(undefined);
    }),
    on: jest.fn(),
    _eventHandlers: new Map(),
    _lastExecCommand: null,
    _triggerEvent: function(event, data) {
      const handler = this._eventHandlers.get(event);
      if (handler) handler(data);
    }
  };

  // Enhanced 'on' implementation to store handlers
  mockInstance.on.mockImplementation((event, handler) => {
    mockInstance._eventHandlers.set(event, handler);
  });

  return mockInstance;
};

// Mock util functions
export const getMockUtil = () => ({
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array()),
  toBlobURL: jest.fn().mockResolvedValue('blob:url')
});

// Helper to create mock video files with orientation
export const createMockVideoFile = (size, type = 'video/mp4', orientation = 'portrait') => {
  const file = new File([new ArrayBuffer(size)], 'test.mp4', { type });
  file._orientation = orientation; // Attach metadata for testing
  return file;
};

// Constants for testing
export const VIDEO_CONSTANTS = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_FORMATS: ['video/mp4', 'video/quicktime', 'video/x-m4v'],
  DEFAULT_DIMENSIONS: {
    maxWidth: 720,
    maxHeight: 1280
  },
  ASPECT_RATIO: {
    PORTRAIT: 16 / 9, // 1.77778 (inverted for portrait)
    LANDSCAPE: 9 / 16, // 0.5625
    TOLERANCE: 0.1 // 10% tolerance for aspect ratio
  }
};

// Error simulation helpers
export const simulateFFmpegError = (mockInstance, errorType) => {
  switch (errorType) {
    case 'load':
      mockInstance.load.mockRejectedValueOnce(new Error('Failed to load FFmpeg'));
      break;
    case 'process':
      mockInstance.exec.mockRejectedValueOnce(new Error('Processing failed'));
      break;
    case 'memory':
      mockInstance.writeFile.mockRejectedValueOnce(new Error('Out of memory'));
      break;
    case 'metadata':
      mockInstance.readFile.mockRejectedValueOnce(new Error('Failed to read metadata'));
      break;
    default:
      throw new Error(`Unknown error type: ${errorType}`);
  }
}; 