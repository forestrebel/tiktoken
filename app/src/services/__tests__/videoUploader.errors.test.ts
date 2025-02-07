import { VideoUploader, VideoMetadata } from '../videoUploader';
import { VideoUploadError, ErrorCodes } from '../errors';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { vi } from 'vitest';

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn()
}));

// Mock Firebase Auth
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: { uid: 'test_user123' }
  }
}));

describe('VideoUploader Error Handling', () => {
  let uploader: VideoUploader;
  const validMetadata: VideoMetadata = {
    width: 720,
    height: 1280,
    fps: 30,
    duration: 45
  };

  beforeEach(() => {
    uploader = new VideoUploader();
    vi.clearAllMocks();
  });

  describe('Authentication Errors', () => {
    it('throws AUTH_REQUIRED when user is not authenticated', async () => {
      // Override mock to simulate unauthenticated state
      vi.mock('../config/firebase', () => ({
        auth: {
          currentUser: null
        }
      }));

      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      
      await expect(uploader.uploadVideo(file, validMetadata))
        .rejects
        .toThrow(VideoUploadError);
      
      try {
        await uploader.uploadVideo(file, validMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.AUTH_REQUIRED);
        expect(error.toJSON()).toMatchObject({
          name: 'VideoUploadError',
          code: ErrorCodes.AUTH_REQUIRED
        });
      }
    });
  });

  describe('File Validation Errors', () => {
    it('throws INVALID_FILE_TYPE for non-MP4 files', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      try {
        await uploader.uploadVideo(file, validMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.INVALID_FILE_TYPE);
        expect(error.details).toMatchObject({
          providedType: 'text/plain'
        });
      }
    });

    it('throws FILE_TOO_LARGE for oversized files', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
      
      try {
        await uploader.uploadVideo(file, validMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.FILE_TOO_LARGE);
        expect(error.details.sizeInMB).toBe('101.00');
      }
    });
  });

  describe('Metadata Validation Errors', () => {
    it('throws MISSING_METADATA when fields are missing', async () => {
      const invalidMetadata = {
        ...validMetadata,
        width: undefined,
        fps: undefined
      } as any;

      try {
        await uploader.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }), invalidMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.MISSING_METADATA);
        expect(error.details.missingFields).toContain('width');
        expect(error.details.missingFields).toContain('fps');
      }
    });

    it('throws INVALID_DIMENSIONS for wrong dimensions', async () => {
      const invalidMetadata = {
        ...validMetadata,
        width: 1080,
        height: 1920
      };

      try {
        await uploader.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }), invalidMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.INVALID_DIMENSIONS);
        expect(error.details.provided).toEqual({ width: 1080, height: 1920 });
        expect(error.details.expected).toEqual({ width: 720, height: 1280 });
      }
    });

    it('throws INVALID_FPS for wrong fps', async () => {
      const invalidMetadata = {
        ...validMetadata,
        fps: 60
      };

      try {
        await uploader.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }), invalidMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.INVALID_FPS);
        expect(error.details.providedFps).toBe(60);
      }
    });

    it('throws INVALID_DURATION for too long duration', async () => {
      const invalidMetadata = {
        ...validMetadata,
        duration: 90
      };

      try {
        await uploader.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }), invalidMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.INVALID_DURATION);
        expect(error.details.providedDuration).toBe(90);
        expect(error.details.maxDuration).toBe(60);
      }
    });
  });

  describe('Upload Errors', () => {
    it('throws UPLOAD_FAILED for general upload errors', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      (uploadBytes as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      try {
        await uploader.uploadVideo(file, validMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.UPLOAD_FAILED);
        expect(error.details.originalError).toBe('Upload failed');
      }
    });

    it('throws NETWORK_ERROR for network-related failures', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const networkError = new Error('Network failure');
      networkError.name = 'NetworkError';
      (uploadBytes as jest.Mock).mockRejectedValue(networkError);

      try {
        await uploader.uploadVideo(file, validMetadata);
      } catch (error) {
        expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
        expect(error.details.originalError).toBe('Network failure');
      }
    });
  });

  describe('Error Formatting', () => {
    it('formats errors as JSON with all required fields', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      try {
        await uploader.uploadVideo(file, validMetadata);
      } catch (error) {
        const json = error.toJSON();
        expect(json).toMatchObject({
          name: 'VideoUploadError',
          code: ErrorCodes.INVALID_FILE_TYPE,
          message: expect.any(String),
          details: expect.any(Object),
          timestamp: expect.any(String)
        });
      }
    });
  });
}); 