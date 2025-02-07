import { VideoUploader } from '../../src/services/videoUploader';
import { createVideoFile } from '../../test/helpers/video';

describe('VideoUploader', () => {
  let uploader;

  beforeEach(() => {
    uploader = new VideoUploader();
  });

  describe('metadata validation', () => {
    it('rejects missing width', () => {
      const invalidMetadata = {
        height: 720,
        fps: 30,
        duration: 60
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video dimensions are required');
    });

    it('rejects missing height', () => {
      const invalidMetadata = {
        width: 1280,
        fps: 30,
        duration: 60
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video dimensions are required');
    });

    it('rejects missing fps', () => {
      const invalidMetadata = {
        width: 1280,
        height: 720,
        duration: 60
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video FPS is required');
    });

    it('rejects missing duration', () => {
      const invalidMetadata = {
        width: 1280,
        height: 720,
        fps: 30
      };

      expect(() => {
        uploader.validateMetadata(invalidMetadata);
      }).toThrow('Video duration is required');
    });
  });

  describe('file validation', () => {
    it('accepts valid MP4 file', () => {
      const file = createVideoFile.portrait();
      expect(() => {
        uploader.validateFile(file);
      }).not.toThrow();
    });

    it('rejects non-MP4 file', () => {
      const file = createVideoFile.invalid();
      expect(() => {
        uploader.validateFile(file);
      }).toThrow('Only MP4 videos are supported');
    });

    it('rejects oversized file', () => {
      const file = createVideoFile.oversized();
      expect(() => {
        uploader.validateFile(file);
      }).toThrow('Video file too large');
    });
  });
}); 