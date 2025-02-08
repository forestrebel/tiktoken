import { videoService } from '../video';
import { createVideoFile } from '../../../test/helpers/video';
import { useNavigation } from '@react-navigation/native';

// Timing requirements
const TIMING = {
  IMPORT: 3000,    // 3s for import flow
  PREVIEW: 3000,   // 3s for preview/player
  RECOVERY: 1000,   // 1s for error handling
};

describe('Core Demo Flow', () => {
  const navigation = useNavigation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Import Flow (3s)', () => {
    it('selects and imports valid nature video within 3s', async () => {
      const start = Date.now();
      const file = createVideoFile.portrait();
      const result = await videoService.importVideo(file.uri);

      expect(result).toBeTruthy();
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
    });

    it('validates MP4 format requirement', async () => {
      const start = Date.now();
      const validation = await videoService.validateVideo(
        createVideoFile.portrait().uri
      );

      expect(validation.status).toBe('success');
      expect(validation.data.type).toBe('video/mp4');
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });

    it('validates 100MB size limit', async () => {
      const start = Date.now();
      const largeFile = createVideoFile.oversized();

      try {
        await videoService.validateVideo(largeFile.uri);
      } catch (error) {
        expect(error.message).toMatch(/100MB/);
      }
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });

    it('validates 9:16 portrait requirement', async () => {
      const start = Date.now();
      const validation = await videoService.validateVideo(
        createVideoFile.portrait().uri
      );

      expect(validation.data.width).toBe(720);
      expect(validation.data.height).toBe(1280);
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });
  });

  describe('2. Player Flow (3s)', () => {
    it('displays video in portrait mode within 3s', async () => {
      const start = Date.now();
      const video = await videoService.getVideo('test-video');

      expect(video.data.width).toBe(720);
      expect(video.data.height).toBe(1280);
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
    });

    it('starts playback within 3s', async () => {
      const start = Date.now();
      const video = await videoService.getVideo('test-video');
      const player = await videoService.createPlayer(video.data.uri);

      expect(player.ready).toBe(true);
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
    });

    it('loads grid thumbnail within 1s', async () => {
      const start = Date.now();
      const video = await videoService.getVideo('test-video');
      const thumbnail = await videoService.getThumbnail(video.data.id);

      expect(thumbnail).toBeTruthy();
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });

    it('navigates between grid and player within 250ms', async () => {
      const start = Date.now();
      await navigation.navigate('Player', { videoId: 'test-video' });

      expect(Date.now() - start).toBeLessThan(250); // Animation time
      expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: 'test-video' });
    });
  });

  describe('3. Error Flows (1s)', () => {
    it('shows clear message for wrong format', async () => {
      const start = Date.now();
      try {
        await videoService.importVideo('invalid.txt');
      } catch (error) {
        expect(error.message).toMatch(/MP4/i);
      }
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });

    it('shows clear message for size limit', async () => {
      const start = Date.now();
      try {
        await videoService.importVideo(createVideoFile.oversized().uri);
      } catch (error) {
        expect(error.message).toMatch(/100MB/);
      }
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });

    it('shows clear message for portrait requirement', async () => {
      const start = Date.now();
      try {
        await videoService.importVideo(createVideoFile.landscape().uri);
      } catch (error) {
        expect(error.message).toMatch(/portrait/i);
      }
      expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
    });

    it('provides basic retry functionality', async () => {
      const start = Date.now();
      try {
        await videoService.importVideo('invalid.txt');
      } catch (error) {
        const retry = await videoService.importVideo(
          createVideoFile.portrait().uri
        );
        expect(retry).toBeTruthy();
      }
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
    });
  });

  describe('4. Critical Integration', () => {
    it('completes grid to player navigation flow', async () => {
      const start = Date.now();

      // Select from grid
      const videos = await videoService.getVideos();
      expect(videos.data.length).toBeGreaterThan(0);

      // Navigate to player
      const video = videos.data[0];
      await navigation.navigate('Player', { videoId: video.id });

      // Verify player loaded
      const player = await videoService.createPlayer(video.uri);
      expect(player.ready).toBe(true);
      expect(navigation.navigate).toHaveBeenCalledWith('Player', { videoId: video.id });

      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
    });

    it('completes import to preview flow', async () => {
      const start = Date.now();

      // Import video
      const file = createVideoFile.portrait();
      const imported = await videoService.importVideo(file.uri);

      // Preview imported video
      const preview = await videoService.getVideo(imported.id);
      expect(preview).toBeTruthy();

      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT + TIMING.PREVIEW);
    });

    it('preserves basic video state', async () => {
      const video = await videoService.getVideo('test-video');
      const savedState = await videoService.getVideoState(video.data.id);

      expect(savedState).toEqual({
        id: video.data.id,
        uri: video.data.uri,
        thumbnail: expect.any(String),
      });
    });
  });
});

describe('Minimal Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(true);
    expect(result).toBe(true);
  });
});
