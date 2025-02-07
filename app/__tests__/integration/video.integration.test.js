import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';
import { auth } from '../../src/config/firebase';

// Test environment checks
const REQUIRED_ENV = ['FIREBASE_EMULATOR_HOST', 'OPENSHOT_API_URL'];
const TIMING = {
  IMPORT: 3000,
  PREVIEW: 3000,
  RECOVERY: 1000
};

describe('VideoService Integration', () => {
  let testVideo;
  let testJobId;

  beforeAll(async () => {
    // Verify environment
    REQUIRED_ENV.forEach(env => {
      if (!process.env[env]) {
        throw new Error(`Missing required environment variable: ${env}`);
      }
    });

    // Wait for emulator
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Setup test data
    testVideo = createVideoFile.portrait();
    testJobId = `test-${Date.now()}`;
  });

  beforeEach(async () => {
    // Reset performance counters
    await videoService.cleanup();
  });

  // Core Flow Tests (Must Pass)
  describe('Core Demo Flow', () => {
    it('imports nature video within 3s', async () => {
      const start = Date.now();
      
      const result = await videoService.importVideo(testVideo);
      const duration = Date.now() - start;
      
      // Timing check
      expect(duration).toBeLessThan(TIMING.IMPORT);
      
      // Status check
      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        id: expect.any(String),
        uri: expect.stringContaining('firebase'),
        width: 720,
        height: 1280,
        duration: expect.any(Number)
      });

      // Performance check
      const stats = videoService.getPerformanceStats();
      expect(stats.warnings.validation).toBe(0);
      expect(stats.warnings.upload).toBe(0);
    });

    it('shows preview within 3s', async () => {
      // Import first
      const imported = await videoService.importVideo(testVideo);
      
      // Test preview
      const start = Date.now();
      const result = await videoService.getVideoPreview(imported.data.id);
      const duration = Date.now() - start;
      
      // Timing check
      expect(duration).toBeLessThan(TIMING.PREVIEW);
      
      // Status check
      if (result.status === 'processing') {
        expect(result.data.progress).toBeDefined();
      } else {
        expect(result.status).toBe('success');
        expect(result.data).toEqual({
          uri: expect.stringContaining('firebase'),
          width: 720,
          height: 1280,
          thumbnail: expect.stringContaining(imported.data.id),
          duration: expect.any(Number)
        });
      }

      // Performance check
      const stats = videoService.getPerformanceStats();
      expect(stats.warnings.preview).toBe(0);
    });

    it('handles errors within 1s', async () => {
      const start = Date.now();
      
      // Test with invalid file
      const result = await videoService.importVideo(createVideoFile.invalid());
      const duration = Date.now() - start;
      
      // Timing check
      expect(duration).toBeLessThan(TIMING.RECOVERY);
      
      // Error structure check
      expect(result.status).toBe('error');
      expect(result.error).toEqual({
        code: expect.any(String),
        message: expect.any(String),
        recoverable: expect.any(Boolean),
        hint: expect.any(String),
        duration: expect.any(Number)
      });

      // Performance check
      const stats = videoService.getPerformanceStats();
      expect(stats.warnings.recovery).toBe(0);
    });
  });

  // Integration Points
  describe('Service Integration', () => {
    it('integrates with Firebase Storage', async () => {
      const result = await videoService.importVideo(testVideo);
      expect(result.data.uri).toMatch(/firebasestorage\.googleapis\.com/);
    });

    it('integrates with OpenShot', async () => {
      const imported = await videoService.importVideo(testVideo);
      const status = await videoService.getVideoPreview(imported.data.id);
      
      // Either processing or completed is valid
      expect(['processing', 'success']).toContain(status.status);
    });

    it('preserves video state', async () => {
      // Full flow test
      const imported = await videoService.importVideo(testVideo);
      const processed = await videoService.getVideoPreview(imported.data.id);
      
      // State preservation check
      if (processed.status === 'success') {
        expect(processed.data.width).toBe(imported.data.width);
        expect(processed.data.height).toBe(imported.data.height);
      }
    });
  });

  // Performance Monitoring
  describe('Performance Checks', () => {
    it('maintains performance under load', async () => {
      const videos = Array(3).fill(null).map(() => createVideoFile.portrait());
      const start = Date.now();
      
      // Parallel imports
      const results = await Promise.all(
        videos.map(video => videoService.importVideo(video))
      );
      
      // Overall timing
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT * 2);
      
      // Individual results
      results.forEach(result => {
        expect(result.status).toBe('success');
        expect(result.data.duration).toBeLessThan(TIMING.IMPORT);
      });
    });

    it('recovers from network issues', async () => {
      // Simulate network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      const start = Date.now();
      const result = await videoService.importVideo(testVideo);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.error.code).toBe('network_error');
      expect(result.error.recoverable).toBe(true);
    });
  });
}); 