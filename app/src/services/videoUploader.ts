import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { auth } from '../config/firebase';
import { VideoUploadError } from './errors';

export interface VideoMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface VideoValidationLimits {
  maxSize: number;
  width: number;
  height: number;
  minFps: number;
  maxFps: number;
  maxDuration: number;
}

export class VideoUploader {
  private readonly limits: VideoValidationLimits = {
    maxSize: 100 * 1024 * 1024, // 100MB
    width: 720,
    height: 1280,
    minFps: 29.97,
    maxFps: 30,
    maxDuration: 60
  };

  constructor(limits?: Partial<VideoValidationLimits>) {
    this.limits = { ...this.limits, ...limits };
  }

  private validateMetadata(metadata: VideoMetadata): void {
    // Check required fields
    const missingFields = [];
    if (!metadata.width) missingFields.push('width');
    if (!metadata.height) missingFields.push('height');
    if (!metadata.fps) missingFields.push('fps');
    if (!metadata.duration) missingFields.push('duration');

    if (missingFields.length > 0) {
      throw VideoUploadError.missingMetadata(missingFields);
    }

    // Dimension validation
    if (metadata.width !== this.limits.width || metadata.height !== this.limits.height) {
      throw VideoUploadError.invalidDimensions(
        metadata.width,
        metadata.height,
        {
          width: this.limits.width,
          height: this.limits.height
        }
      );
    }

    // FPS validation
    if (metadata.fps < this.limits.minFps || metadata.fps > this.limits.maxFps) {
      throw VideoUploadError.invalidFps(metadata.fps, {
        min: this.limits.minFps,
        max: this.limits.maxFps
      });
    }

    // Duration validation
    if (metadata.duration > this.limits.maxDuration) {
      throw VideoUploadError.invalidDuration(
        metadata.duration,
        this.limits.maxDuration
      );
    }
  }

  private validateFile(file: File): void {
    if (file.type !== 'video/mp4') {
      throw VideoUploadError.invalidFileType(file.type);
    }

    if (file.size > this.limits.maxSize) {
      throw VideoUploadError.fileTooLarge(file.size, this.limits.maxSize);
    }
  }

  private transformMetadataForStorage(metadata: VideoMetadata): {
    contentType: string;
    customMetadata: Record<string, string>;
  } {
    // Validate before transformation
    this.validateMetadata(metadata);

    // Transform to storage format
    return {
      contentType: 'video/mp4',
      customMetadata: {
        width: metadata.width.toString(),
        height: metadata.height.toString(),
        fps: metadata.fps.toString(),
        duration: metadata.duration.toString()
      }
    };
  }

  private generateFileName(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.mp4`;
  }

  async uploadVideo(file: File, metadata: VideoMetadata): Promise<string> {
    // Validate user authentication
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw VideoUploadError.authRequired();
    }

    try {
      // Validate file
      this.validateFile(file);

      // Transform metadata for storage
      const storageMetadata = this.transformMetadataForStorage(metadata);

      // Prepare storage reference
      const storage = getStorage();
      const fileName = this.generateFileName();
      const videoRef = ref(storage, `users/${userId}/videos/${fileName}`);

      // Upload with transformed metadata
      try {
        await uploadBytes(videoRef, file, {
          ...storageMetadata,
          customMetadata: {
            ...storageMetadata.customMetadata,
            userId
          }
        });

        return videoRef.fullPath;
      } catch (error) {
        if (error instanceof Error && error.name === 'NetworkError') {
          throw VideoUploadError.networkError(error);
        }
        throw VideoUploadError.uploadFailed(error);
      }
    } catch (error) {
      // Re-throw VideoUploadError instances
      if (error instanceof VideoUploadError) {
        throw error;
      }
      // Wrap unknown errors
      throw VideoUploadError.uploadFailed(error);
    }
  }
} 