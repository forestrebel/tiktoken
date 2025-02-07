import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';
import { uploadFlow } from '../../src/services/uploadFlow';
import { auth } from '../../src/config/firebase';
import { OpenShotService } from '../../src/services/openshot';

// Core timing requirements
const TIMING = {
  IMPORT: 3000,  // 3s for import flow
  PREVIEW: 3000, // 3s for preview
  RECOVERY: 1000 // 1s for error handling
};

describe('Critical Demo Flow', () => {
  // 1. Import Flow (3 tests)
  describe('Import Flow (3s)', () => {
    it('completes basic import within 3s', async () => {
      const file = createVideoFile.portrait();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        id: expect.any(String),
        uri: expect.any(String),
        width: 720,
        height: 1280
      });
    });

    it('validates format requirements', async () => {
      const file = createVideoFile.invalid();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.error).toEqual({
        code: 'invalid_format',
        message: expect.stringContaining('MP4'),
        recoverable: true
      });
    });

    it('validates size requirements', async () => {
      const file = createVideoFile.oversized();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.error).toEqual({
        code: 'file_too_large',
        message: expect.stringContaining('100MB'),
        recoverable: true
      });
    });
  });

  // 2. Preview Flow (3 tests)
  describe('Preview Flow (3s)', () => {
    it('loads video preview within 3s', async () => {
      const file = createVideoFile.portrait();
      const imported = await videoService.importVideo(file);
      
      const start = Date.now();
      const preview = await videoService.getVideoPreview(imported.data.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
      expect(preview.status).toBe('success');
      expect(preview.data).toEqual({
        uri: expect.any(String),
        width: 720,
        height: 1280,
        thumbnail: expect.any(String)
      });
    });

    it('starts playback within 3s', async () => {
      const file = createVideoFile.portrait();
      const imported = await videoService.importVideo(file);
      
      const start = Date.now();
      const player = await videoService.createPlayer(imported.data.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
      expect(player.status).toBe('success');
      expect(player.data.ready).toBe(true);
    });

    it('processes with OpenShot within 3s', async () => {
      const file = createVideoFile.portrait();
      const imported = await videoService.importVideo(file);
      
      const start = Date.now();
      const processing = await OpenShotService.processVideo(imported.data.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
      expect(processing.status).toBe('success');
      expect(processing.data.jobId).toBeDefined();
    });
  });

  // 3. Error Recovery (3 tests)
  describe('Error Recovery (1s)', () => {
    it('recovers from format error within 1s', async () => {
      const file = createVideoFile.invalid();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.error.recoverable).toBe(true);
    });

    it('recovers from network error within 1s', async () => {
      const file = createVideoFile.portrait();
      const start = Date.now();
      
      // Simulate network error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.error.code).toBe('network_error');
      expect(result.error.recoverable).toBe(true);
    });

    it('provides retry functionality', async () => {
      const invalidFile = createVideoFile.invalid();
      const validFile = createVideoFile.portrait();
      const start = Date.now();
      
      const firstTry = await videoService.importVideo(invalidFile);
      const retry = await videoService.importVideo(validFile);
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
      expect(firstTry.status).toBe('error');
      expect(retry.status).toBe('success');
    });
  });

  // 4. Integration Points (3 tests)
  describe('Integration Points', () => {
    it('completes Firebase upload flow', async () => {
      const file = createVideoFile.portrait();
      const start = Date.now();
      
      // Import and upload
      const imported = await videoService.importVideo(file);
      expect(imported.status).toBe('success');
      
      // Verify in Firebase
      const storage = await uploadFlow.verifyStorage(imported.data.id);
      expect(storage.exists).toBe(true);
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT + TIMING.PREVIEW);
    });

    it('completes OpenShot processing flow', async () => {
      const file = createVideoFile.portrait();
      
      // Import and process
      const imported = await videoService.importVideo(file);
      const processing = await OpenShotService.processVideo(imported.data.uri);
      expect(processing.status).toBe('success');
      
      // Monitor until complete
      const status = await OpenShotService.waitForCompletion(processing.data.jobId);
      expect(status.state).toBe('completed');
    });

    it('preserves video state across flows', async () => {
      const file = createVideoFile.portrait();
      
      // Full flow: Import → Upload → Process → Preview
      const imported = await videoService.importVideo(file);
      const processed = await OpenShotService.processVideo(imported.data.uri);
      const preview = await videoService.getVideoPreview(processed.data.uri);
      
      expect(preview.data).toEqual({
        uri: expect.any(String),
        width: 720,
        height: 1280,
        thumbnail: expect.any(String)
      });
    });
  });
});
