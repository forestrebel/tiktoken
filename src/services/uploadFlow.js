import { videoService } from './video';
import { videoUploader } from './videoUploader';

export class UploadFlow {
  async start(file, metadata) {
    try {
      // Validate file and metadata
      videoUploader.validateFile(file);
      videoUploader.validateMetadata(metadata);

      // Import video
      const importResult = await videoService.importVideo(file);
      if (importResult.status === 'error') {
        return importResult;
      }

      // Get video details
      const videoResult = await videoService.getVideo(importResult.data.id);
      if (videoResult.status === 'error') {
        return videoResult;
      }

      return {
        status: 'success',
        data: {
          ...videoResult.data,
          metadata
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recoverable: true
      };
    }
  }

  async retry(file, metadata) {
    return this.start(file, metadata);
  }
}

export const uploadFlow = new UploadFlow(); 