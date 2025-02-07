import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';

// Core timing requirements
const TIMING = {
  IMPORT: 3000,  // 3s for import flow
  PREVIEW: 3000, // 3s for preview
  RECOVERY: 1000 // 1s for error handling
};

describe('Demo Flow Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Import Flow (3 tests)
  describe('Import Flow (3s limit)', () => {
    it('completes basic import within 3s', async () => {
      const start = Date.now();
      const file = createVideoFile.portrait();
      
      const result = await videoService.importVideo(file.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
      expect(result.status).toBe('success');
    });

    it('validates video format requirements', async () => {
      const start = Date.now();
      const file = createVideoFile.portrait();
      
      const validation = await videoService.validateVideo(file.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(validation.data).toEqual({
        type: 'video/mp4',
        width: 720,
        height: 1280,
        size: expect.any(Number)
      });
    });

    it('provides clear format error message', async () => {
      const start = Date.now();
      const file = createVideoFile.landscape();
      
      try {
        await videoService.validateVideo(file.uri);
      } catch (error) {
        expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
        expect(error.message).toMatch(/portrait/i);
      }
    });
  });

  // 2. Preview Flow (3 tests)
  describe('Preview Flow (3s limit)', () => {
    it('loads video preview within 3s', async () => {
      const start = Date.now();
      const video = await videoService.getVideo('test-video');
      
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
      expect(video).toEqual({
        id: 'test-video',
        uri: expect.any(String),
        type: 'video/mp4',
        width: 720,
        height: 1280,
        size: expect.any(Number)
      });
    });

    it('starts playback within 3s', async () => {
      const start = Date.now();
      const player = await videoService.createPlayer('test-video');
      
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
      expect(player.ready).toBe(true);
    });

    it('loads grid thumbnail within 1s', async () => {
      const start = Date.now();
      const thumbnail = await videoService.getThumbnail('test-video');
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(thumbnail).toBeTruthy();
    });
  });

  // 3. Error Recovery (3 tests)
  describe('Error Recovery (1s limit)', () => {
    it('handles format error within 1s', async () => {
      const start = Date.now();
      const file = createVideoFile.invalid();
      
      const result = await videoService.validateVideo(file.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.recoverable).toBe(true);
    });

    it('handles size error within 1s', async () => {
      const start = Date.now();
      const file = createVideoFile.oversized();
      
      const result = await videoService.validateVideo(file.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      expect(result.status).toBe('error');
      expect(result.recoverable).toBe(true);
    });

    it('provides retry functionality', async () => {
      const start = Date.now();
      const badFile = createVideoFile.invalid();
      const goodFile = createVideoFile.portrait();
      
      const firstTry = await videoService.validateVideo(badFile.uri);
      const retry = await videoService.validateVideo(goodFile.uri);
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
      expect(firstTry.status).toBe('error');
      expect(retry.status).toBe('success');
    });
  });

  // 4. Critical Integration (3 tests)
  describe('Critical Integration', () => {
    it('completes import to preview flow', async () => {
      const start = Date.now();
      
      // Import
      const file = createVideoFile.portrait();
      const imported = await videoService.importVideo(file.uri);
      
      // Preview
      const video = await videoService.getVideo(imported.data.id);
      const player = await videoService.createPlayer(video.id);
      
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT + TIMING.PREVIEW);
      expect(player.ready).toBe(true);
    });

    it('completes grid to player navigation', async () => {
      const start = Date.now();
      
      // Get from grid
      const videos = await videoService.getVideos();
      const video = videos[0];
      
      // Load in player
      const player = await videoService.createPlayer(video.id);
      
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
      expect(player.ready).toBe(true);
    });

    it('preserves critical video state', async () => {
      const video = await videoService.getVideo('test-video');
      const state = await videoService.getVideoState(video.id);
      
      expect(state).toEqual({
        id: video.id,
        uri: video.uri,
        thumbnail: expect.any(String)
      });
    });
  });
}); 