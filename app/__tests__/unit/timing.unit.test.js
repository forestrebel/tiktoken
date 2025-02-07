import { videoService } from '../../src/services/video';
import { demoVideoService } from '../../src/services/demoVideos';
import { createVideoFile } from '../../test/helpers/video';

describe('Demo Timing Requirements', () => {
  const TIMING_LIMITS = {
    IMPORT: 3000,  // 3 seconds
    PREVIEW: 3000, // 3 seconds
    RECOVERY: 1000 // 1 second
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Video import completes within 3 seconds', async () => {
    const startTime = Date.now();
    const file = createVideoFile.portrait();
    const result = await videoService.importVideo(file.uri);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThanOrEqual(TIMING_LIMITS.IMPORT);
    expect(result.status).toBe('success');
  });

  test('Video preview loads within 3 seconds', async () => {
    const startTime = Date.now();
    const video = await videoService.getVideo('test-id');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThanOrEqual(TIMING_LIMITS.PREVIEW);
    expect(video).toBeTruthy();
  });

  test('Error recovery completes within 1 second', async () => {
    const startTime = Date.now();
    const error = new Error('Test error');
    const result = await demoVideoService.handleError(error);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThanOrEqual(TIMING_LIMITS.RECOVERY);
    expect(result.status).toBe('error');
    expect(result.recoverable).toBe(true);
  });
}); 