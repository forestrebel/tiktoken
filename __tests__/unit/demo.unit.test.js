import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';

const TIMING = {
  IMPORT: 3000,
  PREVIEW: 3000,
  RECOVERY: 1000
};

describe('Demo Flow Protection', () => {
  describe('Import Flow (3s limit)', () => {
    it('completes basic import within 3s', async () => {
      const file = createVideoFile.portrait();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
      expect(result.status).toBe('success');
      expect(result.data.id).toBeDefined();
    });

    it('validates video format requirements', async () => {
      const file = createVideoFile.invalid();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('Error Recovery (1s limit)', () => {
    it('handles format error within 1s', async () => {
      const file = createVideoFile.invalid();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.recoverable).toBe(true);
    });

    it('handles size error within 1s', async () => {
      const file = createVideoFile.oversized();
      const start = Date.now();
      
      const result = await videoService.importVideo(file);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.recoverable).toBe(true);
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

  describe('Critical Integration', () => {
    it('completes import to preview flow', async () => {
      const file = createVideoFile.portrait();
      const start = Date.now();
      
      const imported = await videoService.importVideo(file);
      expect(imported.status).toBe('success');
      
      const video = await videoService.getVideo(imported.data.id);
      expect(video.status).toBe('success');
      
      const player = await videoService.createPlayer(video.data.id);
      expect(player.status).toBe('success');
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT + TIMING.PREVIEW);
    });
  });
}); 