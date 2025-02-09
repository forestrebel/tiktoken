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

describe('Portrait Mode Video Processing', () => {
  let mockFFmpeg;

  beforeEach(() => {
    mockFFmpeg = getMockFFmpeg('portrait');
    require('@ffmpeg/ffmpeg').FFmpeg.mockImplementation(() => mockFFmpeg);
    jest.clearAllMocks();
    videoProcessor.terminate();
  });

  afterEach(() => {
    videoProcessor.terminate();
  });

  describe('Input Validation', () => {
    test('should accept valid portrait video (9:16)', async () => {
      const file = createMockVideoFile(50 * 1024 * 1024, 'video/mp4', 'portrait');
      const result = await videoProcessor.validatePortraitMode(file);
      
      expect(result.isValid).toBe(true);
      expect(result.aspectRatio).toBeCloseTo(VIDEO_CONSTANTS.ASPECT_RATIO.PORTRAIT, 1);
    });

    test('should reject landscape video', async () => {
      mockFFmpeg = getMockFFmpeg('landscape');
      require('@ffmpeg/ffmpeg').FFmpeg.mockImplementation(() => mockFFmpeg);
      
      const file = createMockVideoFile(50 * 1024 * 1024, 'video/mp4', 'landscape');
      await expect(videoProcessor.validatePortraitMode(file))
        .rejects.toThrow('Video must be in portrait orientation');
    });

    test('should handle square videos', async () => {
      mockFFmpeg = getMockFFmpeg('square');
      require('@ffmpeg/ffmpeg').FFmpeg.mockImplementation(() => mockFFmpeg);
      
      const file = createMockVideoFile(50 * 1024 * 1024, 'video/mp4', 'square');
      const result = await videoProcessor.validatePortraitMode(file);
      
      expect(result.isValid).toBe(true);
      expect(result.dimensions.width).toBe(result.dimensions.height);
    });

    test('should handle metadata extraction errors', async () => {
      simulateFFmpegError(mockFFmpeg, 'metadata');
      const file = createMockVideoFile(50 * 1024 * 1024);
      
      await expect(videoProcessor.validatePortraitMode(file))
        .rejects.toThrow('Failed to extract video metadata');
    });
  });

  describe('Aspect Ratio Enforcement', () => {
    test('should enforce 9:16 ratio within tolerance', async () => {
      const file = createMockVideoFile(150 * 1024 * 1024);
      await videoProcessor.compress(file);
      
      const execArgs = mockFFmpeg.exec.mock.calls[0][0];
      const scaleArg = execArgs.join(' ');
      
      // Check if output dimensions maintain 9:16 ratio
      const match = scaleArg.match(/scale=(\d+):(\d+)/);
      const [_, width, height] = match;
      const ratio = height / width;
      
      expect(ratio).toBeCloseTo(VIDEO_CONSTANTS.ASPECT_RATIO.PORTRAIT, 1);
    });

    test('should handle non-standard aspect ratios', async () => {
      mockFFmpeg = getMockFFmpeg('square');
      require('@ffmpeg/ffmpeg').FFmpeg.mockImplementation(() => mockFFmpeg);
      
      const file = createMockVideoFile(150 * 1024 * 1024, 'video/mp4', 'square');
      await videoProcessor.compress(file);
      
      const execArgs = mockFFmpeg.exec.mock.calls[0][0];
      const scaleArg = execArgs.join(' ');
      
      expect(scaleArg).toContain('force_original_aspect_ratio=decrease');
      expect(scaleArg).toContain(`min(${VIDEO_CONSTANTS.DEFAULT_DIMENSIONS.maxWidth}`);
    });
  });

  describe('Quality and Performance', () => {
    test('should maintain quality while enforcing portrait mode', async () => {
      const file = createMockVideoFile(150 * 1024 * 1024);
      await videoProcessor.compress(file);
      
      const execArgs = mockFFmpeg.exec.mock.calls[0][0];
      const args = execArgs.join(' ');
      
      expect(args).toContain('-crf 23'); // Quality setting
      expect(args).toContain('-preset medium'); // Compression preset
      expect(args).toContain('-c:v libx264'); // Video codec
    });

    test('should optimize for mobile playback', async () => {
      const file = createMockVideoFile(150 * 1024 * 1024);
      await videoProcessor.compress(file);
      
      const execArgs = mockFFmpeg.exec.mock.calls[0][0];
      const args = execArgs.join(' ');
      
      expect(args).toContain('-movflags +faststart'); // Streaming optimization
      expect(args).toContain('-c:a aac'); // Audio codec
      expect(args).toContain('-b:a 128k'); // Audio bitrate
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero-byte files', async () => {
      const file = createMockVideoFile(0);
      await expect(videoProcessor.validatePortraitMode(file))
        .rejects.toThrow('Invalid video file');
    });

    test('should handle extremely tall videos', async () => {
      mockFFmpeg = getMockFFmpeg('portrait');
      mockFFmpeg.readFile.mockImplementation(() => {
        const metadata = createVideoMetadata('portrait');
        metadata.streams[0].width = 720;
        metadata.streams[0].height = 2560; // Extremely tall
        return Buffer.from(JSON.stringify(metadata));
      });
      
      const file = createMockVideoFile(150 * 1024 * 1024);
      await videoProcessor.compress(file);
      
      const execArgs = mockFFmpeg.exec.mock.calls[0][0];
      expect(execArgs.join(' ')).toContain(`min(${VIDEO_CONSTANTS.DEFAULT_DIMENSIONS.maxHeight}`);
    });

    test('should handle corrupted metadata', async () => {
      mockFFmpeg.readFile.mockResolvedValueOnce(Buffer.from('invalid json'));
      const file = createMockVideoFile(50 * 1024 * 1024);
      
      await expect(videoProcessor.validatePortraitMode(file))
        .rejects.toThrow('Invalid video metadata');
    });
  });
});
