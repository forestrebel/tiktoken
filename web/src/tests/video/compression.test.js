import { 
  getMockFFmpeg, 
  getMockUtil, 
  createMockVideoFile, 
  VIDEO_CONSTANTS,
  simulateFFmpegError 
} from './__mocks__/ffmpeg';
import { videoProcessor } from '../../lib/videoProcessor';

// Mock FFmpeg and utils
jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn()
}));

jest.mock('@ffmpeg/util', () => getMockUtil());

describe('Video Compression', () => {
  let mockFFmpeg;

  beforeEach(() => {
    mockFFmpeg = getMockFFmpeg();
    require('@ffmpeg/ffmpeg').FFmpeg.mockImplementation(() => mockFFmpeg);
    jest.clearAllMocks();
    videoProcessor.terminate();
  });

  afterEach(() => {
    videoProcessor.terminate();
  });

  describe('Basic Compression', () => {
    test('should compress video if larger than max size', async () => {
      const file = createMockVideoFile(150 * 1024 * 1024);
      const result = await videoProcessor.compress(file);
      
      expect(mockFFmpeg.load).toHaveBeenCalled();
      expect(mockFFmpeg.writeFile).toHaveBeenCalled();
      expect(mockFFmpeg.exec).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result instanceof File).toBe(true);
      expect(result.type).toBe('video/mp4');
    });

    test('should not compress if already under max size', async () => {
      const file = createMockVideoFile(50 * 1024 * 1024);
      const result = await videoProcessor.compress(file);
      
      expect(result).toBe(file);
      expect(mockFFmpeg.exec).not.toHaveBeenCalled();
    });
  });

  describe('Format Validation', () => {
    test.each(VIDEO_CONSTANTS.SUPPORTED_FORMATS)(
      'should handle %s format',
      async (format) => {
        const file = createMockVideoFile(10 * 1024 * 1024, format);
        await expect(videoProcessor.compress(file)).resolves.toBeDefined();
      }
    );

    test('should reject invalid formats', async () => {
      const file = createMockVideoFile(10 * 1024 * 1024, 'video/webm');
      await expect(videoProcessor.compress(file)).rejects.toThrow(/INVALID_FORMAT/);
    });
  });

  describe('Error Handling', () => {
    test('should handle FFmpeg load failure', async () => {
      simulateFFmpegError(mockFFmpeg, 'load');
      const file = createMockVideoFile(150 * 1024 * 1024);
      await expect(videoProcessor.compress(file)).rejects.toThrow(/INITIALIZATION_FAILED/);
    });

    test('should handle compression failure', async () => {
      simulateFFmpegError(mockFFmpeg, 'process');
      const file = createMockVideoFile(150 * 1024 * 1024);
      await expect(videoProcessor.compress(file)).rejects.toThrow(/PROCESSING_FAILED/);
    });

    test('should handle memory errors', async () => {
      simulateFFmpegError(mockFFmpeg, 'memory');
      const file = createMockVideoFile(150 * 1024 * 1024);
      await expect(videoProcessor.compress(file)).rejects.toThrow();
    });

    test('should handle invalid input', async () => {
      await expect(videoProcessor.compress(null)).rejects.toThrow(/INVALID_INPUT/);
      await expect(videoProcessor.compress(undefined)).rejects.toThrow(/INVALID_INPUT/);
    });
  });

  describe('Progress Tracking', () => {
    test('should track compression progress', async () => {
      const progressCallback = jest.fn();
      const file = createMockVideoFile(150 * 1024 * 1024);
      
      videoProcessor.compress(file, { onProgress: progressCallback });
      
      mockFFmpeg._triggerEvent('progress', { progress: 0.5, time: 500 });
      expect(progressCallback).toHaveBeenCalledWith(50);
      
      mockFFmpeg._triggerEvent('progress', { progress: 1, time: 1000 });
      expect(progressCallback).toHaveBeenCalledWith(100);
    });
  });

  describe('Resource Management', () => {
    test('should clean up resources after compression', async () => {
      const file = createMockVideoFile(150 * 1024 * 1024);
      await videoProcessor.compress(file);
      
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledTimes(2); // Input and output files
    });

    test('should clean up resources on error', async () => {
      simulateFFmpegError(mockFFmpeg, 'process');
      const file = createMockVideoFile(150 * 1024 * 1024);
      
      try {
        await videoProcessor.compress(file);
      } catch (error) {
        expect(mockFFmpeg.deleteFile).toHaveBeenCalled();
      }
    });
  });
});
