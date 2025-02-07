export class VideoUploader {
  validateMetadata(metadata) {
    if (!metadata.width || !metadata.height) {
      throw new Error('Video dimensions are required');
    }
    if (!metadata.fps) {
      throw new Error('Video FPS is required');
    }
    if (!metadata.duration) {
      throw new Error('Video duration is required');
    }
  }

  validateFile(file) {
    if (!file || !file.type) {
      throw new Error('Invalid file');
    }

    if (file.type !== 'video/mp4') {
      throw new Error('Only MP4 videos are supported');
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      throw new Error('Video file too large');
    }
  }
}

export const videoUploader = new VideoUploader(); 