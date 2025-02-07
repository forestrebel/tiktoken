import { videoService } from '../video';
import { auth } from '../../config/firebase';
import RNFS from 'react-native-fs';

// Mock Firebase auth
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123'
    }
  }
}));

// Mock RNFS
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/test/cache',
  DocumentDirectoryPath: '/test/docs',
  exists: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn(),
}));

describe('Video Upload Flow', () => {
  // Test video metadata
  const testVideo = {
    uri: 'file:///test/video.mp4',
    fileName: 'video.mp4',
    type: 'video/mp4',
    size: 50 * 1024 * 1024, // 50MB
  };

  const testMetadata = {
    width: 720,
    height: 1280,
    fps: 30,
    duration: 45,
    orientation: 'portrait'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup RNFS mocks
    RNFS.exists.mockResolvedValue(true);
    RNFS.mkdir.mockResolvedValue(true);
    RNFS.stat.mockResolvedValue({
      size: testVideo.size,
      mtime: new Date().toISOString()
    });
    RNFS.readFile.mockResolvedValue('test-file-content');
    RNFS.copyFile.mockResolvedValue(true);
    RNFS.unlink.mockResolvedValue(true);
  });

  describe('Import Stage', () => {
    it('should import valid video file', async () => {
      const onProgress = jest.fn();
      const result = await videoService.importVideo(testVideo.uri, onProgress);

      expect(result).toBeTruthy();
      expect(result.uri).toBeTruthy();
      expect(result.fileName).toBe(testVideo.fileName);
      expect(result.type).toBe(testVideo.type);
      expect(RNFS.copyFile).toHaveBeenCalled();
    });

    it('should reject oversized video', async () => {
      RNFS.stat.mockResolvedValueOnce({
        size: 200 * 1024 * 1024, // 200MB
        mtime: new Date().toISOString()
      });

      await expect(videoService.importVideo(testVideo.uri)).rejects.toThrow(/under/);
    });

    it('should handle missing file', async () => {
      RNFS.exists.mockResolvedValueOnce(false);
      await expect(videoService.importVideo(testVideo.uri)).rejects.toThrow();
    });
  });

  describe('Validation Stage', () => {
    it('should validate correct portrait video', async () => {
      const result = await videoService.validateVideo(testVideo.uri);
      expect(result.status).toBe('success');
      expect(result.data).toBeTruthy();
    });

    it('should reject landscape video', async () => {
      // Mock FFprobe output for landscape video
      const mockProbeOutput = JSON.stringify({
        streams: [{
          width: 1280,
          height: 720,
          codec_name: 'h264',
          duration: '45'
        }]
      });

      // TODO: Mock FFprobeKit properly
      const result = await videoService.validateVideo(testVideo.uri);
      expect(result.status).toBe('error');
      expect(result.error).toMatch(/portrait/i);
    });
  });

  describe('Upload Stage', () => {
    it('should upload video with progress', async () => {
      const onProgress = jest.fn();
      const result = await videoService.uploadVideo(
        testVideo.uri,
        testMetadata,
        onProgress
      );

      expect(result).toBeTruthy();
      expect(result.path).toBeTruthy();
      expect(result.size).toBe(testVideo.size);
      expect(result.metadata).toEqual(testMetadata);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle upload cancellation', async () => {
      // Start upload
      const uploadPromise = videoService.uploadVideo(
        testVideo.uri,
        testMetadata,
        jest.fn()
      );

      // Cancel it
      await videoService.cancelUpload();

      await expect(uploadPromise).rejects.toThrow(/cancel/i);
    });

    it('should handle network errors', async () => {
      // Mock network error
      RNFS.readFile.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        videoService.uploadVideo(testVideo.uri, testMetadata, jest.fn())
      ).rejects.toThrow(/network/i);
    });
  });

  describe('Cleanup', () => {
    it('should clean up temporary files', async () => {
      await videoService.cleanupCache();
      expect(RNFS.unlink).toHaveBeenCalled();
    });
  });
}); 