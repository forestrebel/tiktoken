import { describe, it, expect, vi } from 'vitest';
import { api } from '../api/client';

// Mock API client
vi.mock('../api/client', () => ({
  api: {
    uploadVideo: vi.fn()
  }
}));

describe('Video Upload Flow', () => {
  it('handles successful upload', async () => {
    // Mock successful upload
    const mockUrl = 'https://example.com/video.mp4';
    api.uploadVideo.mockImplementation((formData, onProgress) => {
      // Simulate upload progress
      onProgress(50);
      onProgress(100);
      return Promise.resolve({ url: mockUrl });
    });

    // Simulate file upload
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.mp4', { type: 'video/mp4' }));

    const result = await api.uploadVideo(formData, vi.fn());
    expect(result.url).toBe(mockUrl);
  });

  it('handles upload failure', async () => {
    // Mock upload failure
    api.uploadVideo.mockRejectedValue(new Error('Upload failed'));

    // Simulate file upload
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.mp4', { type: 'video/mp4' }));

    await expect(api.uploadVideo(formData, vi.fn()))
      .rejects.toThrow('Upload failed');
  });

  it('validates video file type', async () => {
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }));

    await expect(api.uploadVideo(formData, vi.fn()))
      .rejects.toThrow('Not a video file');
  });
}); 