import { VideoUploader, VideoMetadata } from '../videoUploader';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { vi } from 'vitest';

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

describe('VideoUploader Upload Functionality', () => {
  let uploader: VideoUploader;
  const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
  const mockMetadata: VideoMetadata = {
    width: 720,
    height: 1280,
    fps: 30,
    duration: 45
  };

  beforeEach(() => {
    uploader = new VideoUploader();
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (getStorage as jest.Mock).mockReturnValue({});
    (ref as jest.Mock).mockReturnValue({});
    (uploadBytes as jest.Mock).mockResolvedValue({ ref: {} });
    (getDownloadURL as jest.Mock).mockResolvedValue('https://example.com/video.mp4');
  });

  describe('uploadVideo', () => {
    it('successfully uploads a valid video', async () => {
      const result = await uploader.uploadVideo(mockFile, mockMetadata);

      expect(getStorage).toHaveBeenCalled();
      expect(ref).toHaveBeenCalled();
      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
      
      expect(result).toEqual({
        url: 'https://example.com/video.mp4',
        metadata: mockMetadata
      });
    });

    it('generates unique file names for uploads', async () => {
      await uploader.uploadVideo(mockFile, mockMetadata);
      await uploader.uploadVideo(mockFile, mockMetadata);

      const [firstCall, secondCall] = (ref as jest.Mock).mock.calls;
      expect(firstCall[1]).not.toEqual(secondCall[1]);
    });

    it('handles upload failure', async () => {
      (uploadBytes as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      await expect(uploader.uploadVideo(mockFile, mockMetadata))
        .rejects
        .toThrow('Upload failed');
    });

    it('handles getDownloadURL failure', async () => {
      (getDownloadURL as jest.Mock).mockRejectedValue(new Error('URL retrieval failed'));

      await expect(uploader.uploadVideo(mockFile, mockMetadata))
        .rejects
        .toThrow('URL retrieval failed');
    });

    it('includes metadata in upload', async () => {
      await uploader.uploadVideo(mockFile, mockMetadata);

      const uploadCall = (uploadBytes as jest.Mock).mock.calls[0];
      expect(uploadCall[2]).toMatchObject({
        customMetadata: {
          width: '720',
          height: '1280',
          fps: '30',
          duration: '45'
        }
      });
    });

    it('validates before upload', async () => {
      const invalidMetadata = {
        ...mockMetadata,
        width: 1080 // Invalid width
      };

      await expect(uploader.uploadVideo(mockFile, invalidMetadata))
        .rejects
        .toThrow('Invalid video dimensions');

      expect(uploadBytes).not.toHaveBeenCalled();
    });
  });
}); 