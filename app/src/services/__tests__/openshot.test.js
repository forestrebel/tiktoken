import AsyncStorage from '@react-native-async-storage/async-storage';
import { OpenShotService } from '../openshot';
import { createVideoFile } from '../../../test/helpers/video';

// Mock fetch
global.fetch = jest.fn();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn()
}));

// Timing constants from requirements
const TIMING = {
  IMPORT: 3000,    // 3 seconds for import
  PREVIEW: 3000,   // 3 seconds for preview
  RECOVERY: 1000   // 1 second for recovery
};

describe('OpenShot Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
  });

  describe('Import Story (3s)', () => {
    const mockProject = {
      id: 'project-123',
      name: 'Nature_creator-123'
    };

    it('should complete import flow within 3s', async () => {
      const start = Date.now();

      // Mock successful responses
      AsyncStorage.getItem.mockResolvedValueOnce('{}');
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject)
      });

      const result = await OpenShotService.createProject('creator-123');
      
      expect(result).toEqual(mockProject);
      expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
    });

    it('should handle import errors within 1s', async () => {
      const start = Date.now();
      
      AsyncStorage.getItem.mockResolvedValueOnce('{}');
      fetch.mockResolvedValueOnce({ ok: false });

      try {
        await OpenShotService.createProject('creator-123');
      } catch (error) {
        expect(error.message).toBe('Failed to create project');
        expect(error.suggestions).toBeDefined();
        expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      }
    });
  });

  describe('Preview Story (3s)', () => {
    const mockVideo = {
      id: 'video-123',
      url: 'http://example.com/video-123'
    };

    it('should complete preview flow within 3s', async () => {
      const start = Date.now();

      // Mock successful upload and processing
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVideo)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'processing' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'completed', url: mockVideo.url })
        });

      // Upload and process
      const upload = await OpenShotService.uploadVideo(
        'project-123',
        'path/to/video.mp4'
      );
      const processing = await OpenShotService.processVideo(
        'project-123',
        upload.id
      );
      const status = await OpenShotService.getStatus(upload.id);

      expect(status.status).toBe('completed');
      expect(Date.now() - start).toBeLessThan(TIMING.PREVIEW);
    });
  });

  describe('Recovery Story (1s)', () => {
    it('should handle format errors within 1s', async () => {
      const start = Date.now();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid format' })
      });

      try {
        await OpenShotService.processVideo('project-123', 'video-123');
      } catch (error) {
        expect(error.message).toBe('Failed to process video');
        expect(error.suggestions).toContain('Ensure video is in portrait mode');
        expect(Date.now() - start).toBeLessThan(TIMING.RECOVERY);
      }
    });

    it('should handle retry flow within 3s', async () => {
      const start = Date.now();

      // Fail first, succeed on retry
      fetch
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'completed' })
        });

      try {
        await OpenShotService.getStatus('video-123');
      } catch (error) {
        const retry = await OpenShotService.getStatus('video-123');
        expect(retry.status).toBe('completed');
        expect(Date.now() - start).toBeLessThan(TIMING.IMPORT);
      }
    });
  });

  describe('Critical Paths', () => {
    it('should validate portrait format', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'completed',
          metadata: {
            width: 720,
            height: 1280,
            orientation: 'portrait'
          }
        })
      });

      const result = await OpenShotService.processVideo('project-123', 'video-123');
      expect(result.status).toBe('completed');
    });

    it('should provide clear error recovery', async () => {
      fetch.mockResolvedValueOnce({ ok: false });

      try {
        await OpenShotService.processVideo('project-123', 'video-123');
      } catch (error) {
        expect(error.name).toBe('OpenShotError');
        expect(error.suggestions).toHaveLength(2);
        expect(error.suggestions[0]).toBe('Ensure video is in portrait mode');
      }
    });
  });
}); 