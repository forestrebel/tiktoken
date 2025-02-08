// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user' }
  }))
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve('test-url'))
}));

// Mock OpenShot service
jest.mock('../openshot', () => ({
  OpenShotService: {
    getProjects: jest.fn(() => Promise.resolve([])),
    processVideo: jest.fn(() => Promise.resolve({ jobId: 'test-job' })),
    getStatus: jest.fn(() => Promise.resolve({ state: 'completed', progress: 100 })),
    generateThumbnail: jest.fn(() => Promise.resolve('test-thumbnail-base64'))
  }
}));

import { VideoService } from '../video';
import { validateNatureVideo } from '../quality/validation';
import { ErrorMessages } from '../quality/messages';
import RNFS from 'react-native-fs';

describe('VideoService', () => {
  let service;
  const testFile = {
    uri: 'test.mp4',
    type: 'video/mp4',
    size: 1024 * 1024 // 1MB
  };

  beforeEach(() => {
    service = new VideoService();
    jest.clearAllMocks();
  });

  describe('validateNatureVideo', () => {
    it('validates file format within 100ms', async () => {
      const start = Date.now();
      const result = await validateNatureVideo(testFile);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
      expect(result.valid).toBe(true);
    });

    it('handles invalid format', async () => {
      const invalidFile = { ...testFile, type: 'video/avi' };
      const result = await validateNatureVideo(invalidFile);
      
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('INVALID_FORMAT');
      expect(ErrorMessages[result.errorType]).toBeDefined();
    });

    it('handles file too large', async () => {
      const largeFile = { ...testFile, size: 200 * 1024 * 1024 }; // 200MB
      const result = await validateNatureVideo(largeFile);
      
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('FILE_TOO_LARGE');
      expect(ErrorMessages[result.errorType]).toBeDefined();
    });
  });

  describe('importVideo', () => {
    it('imports valid video within 3s', async () => {
      const start = Date.now();
      const result = await service.importVideo(testFile);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(3000);
      expect(result.status).toBe('success');
      expect(result.data.uri).toBeDefined();
    });

    it('handles validation errors', async () => {
      const invalidFile = { ...testFile, type: 'video/avi' };
      const result = await service.importVideo(invalidFile);
      
      expect(result.status).toBe('error');
      expect(result.error.message).toBe(ErrorMessages.INVALID_FORMAT.friendly);
      expect(result.error.action).toBe(ErrorMessages.INVALID_FORMAT.actionable);
    });
  });

  describe('error handling', () => {
    it('recovers from errors within 1s', async () => {
      const start = Date.now();
      const result = await service.handleError(new Error('test error'));
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000);
      expect(result.status).toBe('error');
      expect(result.error.recoverable).toBe(true);
    });

    it('provides actionable error messages', async () => {
      const result = await service.handleError(
        new Error('test error'),
        'invalid_format'
      );
      
      expect(result.error.message).toBeDefined();
      expect(result.error.hint).toBeDefined();
      expect(result.error.recoverable).toBeDefined();
    });
  });
}); 