import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { auth } from '../config/firebase';
import { VideoUploadError } from './errors';

/**
 * @typedef {Object} VideoMetadata
 * @property {number} width - Video width in pixels
 * @property {number} height - Video height in pixels
 * @property {number} fps - Frames per second
 * @property {number} duration - Duration in seconds
 */

/**
 * @typedef {Object} VideoValidationLimits
 * @property {number} maxSize - Maximum file size in bytes
 * @property {number} width - Required video width
 * @property {number} height - Required video height
 * @property {number} minFps - Minimum frames per second
 * @property {number} maxFps - Maximum frames per second
 * @property {number} maxDuration - Maximum duration in seconds
 */

export class VideoUploader {
  constructor(limits = {}) {
    this.limits = {
      maxSize: 100 * 1024 * 1024, // 100MB
      width: 720,
      height: 1280,
      minFps: 29.97,
      maxFps: 30,
      maxDuration: 60,
      ...limits,
    };
  }

  /**
   * Validates video metadata against limits
   * @param {VideoMetadata} metadata
   * @throws {VideoUploadError}
   */
  validateMetadata(metadata) {
    // Check required fields
    const missingFields = [];
    if (!metadata.width) {missingFields.push('width');}
    if (!metadata.height) {missingFields.push('height');}
    if (!metadata.fps) {missingFields.push('fps');}
    if (!metadata.duration) {missingFields.push('duration');}

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
          height: this.limits.height,
        }
      );
    }

    // FPS validation
    if (metadata.fps < this.limits.minFps || metadata.fps > this.limits.maxFps) {
      throw VideoUploadError.invalidFps(metadata.fps, {
        min: this.limits.minFps,
        max: this.limits.maxFps,
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

  /**
   * Validates video file properties
   * @param {File} file
   * @throws {VideoUploadError}
   */
  validateFile(file) {
    if (file.type !== 'video/mp4') {
      throw VideoUploadError.invalidFileType(file.type);
    }

    if (file.size > this.limits.maxSize) {
      throw VideoUploadError.fileTooLarge(file.size, this.limits.maxSize);
    }
  }

  /**
   * Transforms metadata for Firebase Storage
   * @param {VideoMetadata} metadata
   * @returns {{contentType: string, customMetadata: Object}}
   */
  transformMetadataForStorage(metadata) {
    // Validate before transformation
    this.validateMetadata(metadata);

    // Transform to storage format
    return {
      contentType: 'video/mp4',
      customMetadata: {
        width: metadata.width.toString(),
        height: metadata.height.toString(),
        fps: metadata.fps.toString(),
        duration: metadata.duration.toString(),
      },
    };
  }

  /**
   * Generates a unique filename for video storage
   * @returns {string}
   */
  generateFileName() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.mp4`;
  }

  /**
   * Uploads a video file to Firebase Storage
   * @param {File} file - The video file to upload
   * @param {VideoMetadata} metadata - Video metadata
   * @returns {Promise<string>} The storage path of the uploaded video
   * @throws {VideoUploadError}
   */
  async uploadVideo(file, metadata) {
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
            userId,
          },
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
