import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';

const TIMING_LIMITS = {
  IMPORT: 3000,
  PREVIEW: 3000,
  RECOVERY: 1000
};

describe('Demo Timing Requirements', () => {
  test('Video import completes within 3 seconds', async () => {
    const file = createVideoFile.portrait();
    const start = Date.now();
    
    const result = await videoService.importVideo(file);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThanOrEqual(TIMING_LIMITS.IMPORT);
    expect(result.status).toBe('success');
    expect(result.data.id).toBeDefined();
  });

  test('Video preview loads within 3 seconds', async () => {
    const file = createVideoFile.portrait();
    const importResult = await videoService.importVideo(file);
    
    const start = Date.now();
    const video = await videoService.getVideo(importResult.data.id);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThanOrEqual(TIMING_LIMITS.PREVIEW);
    expect(video.status).toBe('success');
    expect(video.data.uri).toBeDefined();
  });

  test('Error recovery completes within 1 second', async () => {
    const file = createVideoFile.invalid();
    const start = Date.now();
    
    const result = await videoService.importVideo(file);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThanOrEqual(TIMING_LIMITS.RECOVERY);
    expect(result.status).toBe('error');
    expect(result.recoverable).toBe(true);
  });
}); 