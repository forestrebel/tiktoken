import { VideoUploader } from '../videoUploader';

describe('VideoUploader', () => {
  let uploader;

  beforeEach(() => {
    uploader = new VideoUploader();
  });

  describe('metadata validation', () => {
    const validMetadata = {
      width: 720,
      height: 1280,
      fps: 30,
      duration: 45
    };

    it('accepts valid metadata', () => {
      expect(() => {
        uploader.validateMetadata(validMetadata);
      }).not.toThrow();
    });

    it('rejects invalid dimensions', () => {
      const invalidMetadata = {
        ...validMetadata,
        width: 1080,
        height: 1920
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Invalid video dimensions');
    });

    it('rejects invalid FPS', () => {
      const invalidMetadata = {
        ...validMetadata,
        fps: 60
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('FPS must be between');
    });

    it('rejects too long duration', () => {
      const invalidMetadata = {
        ...validMetadata,
        duration: 90
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video duration cannot exceed');
    });

    it('rejects missing width', () => {
      const invalidMetadata = {
        ...validMetadata,
        width: undefined
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video dimensions are required');
    });

    it('rejects missing height', () => {
      const invalidMetadata = {
        ...validMetadata,
        height: undefined
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video dimensions are required');
    });

    it('rejects missing fps', () => {
      const invalidMetadata = {
        ...validMetadata,
        fps: undefined
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video FPS is required');
    });

    it('rejects missing duration', () => {
      const invalidMetadata = {
        ...validMetadata,
        duration: undefined
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video duration is required');
    });
  });

  describe('file validation', () => {
    it('accepts valid MP4 file', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      expect(() => {
        uploader.validateFile(file);
      }).not.toThrow();
    });

    it('rejects non-MP4 file', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(() => {
        uploader.validateFile(file);
      }).toThrow('Only MP4 videos are supported');
    });

    it('rejects oversized file', () => {
      // Create a mock file that reports a size > 100MB
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });

      expect(() => {
        uploader.validateFile(file);
      }).toThrow('File size cannot exceed');
    });
  });

  describe('metadata transformation', () => {
    const validMetadata = {
      width: 720,
      height: 1280,
      fps: 30,
      duration: 45
    };

    it('transforms metadata to storage format', () => {
      const transformed = uploader.transformMetadataForStorage(validMetadata);
      
      expect(transformed).toEqual({
        contentType: 'video/mp4',
        customMetadata: {
          width: '720',
          height: '1280',
          fps: '30',
          duration: '45'
        }
      });
    });

    it('validates metadata before transformation', () => {
      const invalidMetadata = {
        ...validMetadata,
        width: 1080 // Invalid width
      };

      expect(() => {
        uploader.transformMetadataForStorage(invalidMetadata);
      }).toThrow('Invalid video dimensions');
    });

    it('maintains type safety in transformation', () => {
      const transformed = uploader.transformMetadataForStorage(validMetadata);
      
      // Check that all values are strings
      Object.values(transformed.customMetadata).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });
}); 