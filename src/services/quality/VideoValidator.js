// Lightweight video validation for quick checks
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import QualityError from './QualityError';

class VideoValidator {
  static BASIC_CHECKS = {
    maxSizeBytes: 6 * 1024 * 1024, // 6MB
    format: 'mp4'
  };

  /**
   * Quick validation for basic upload requirements
   * @param {string} videoPath Path to video file
   * @returns {Promise<{isValid: boolean, errors: Array, metadata: Object}>}
   */
  static async quickValidate(videoPath) {
    try {
      const result = {
        isValid: true,
        errors: [],
        metadata: {}
      };

      // 1. Basic format check (extension)
      const extension = videoPath.split('.').pop()?.toLowerCase();
      if (extension !== this.BASIC_CHECKS.format) {
        result.errors.push({
          code: 'FORMAT',
          message: 'Please use MP4 format',
          help: 'Convert your video to MP4'
        });
      }

      // 2. Quick size check
      try {
        const stats = await RNFS.stat(videoPath);
        result.metadata.size = stats.size;
        
        if (stats.size > this.BASIC_CHECKS.maxSizeBytes) {
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
          result.errors.push({
            code: 'SIZE',
            message: `Video size (${sizeMB}MB) exceeds 6MB limit`,
            help: 'Compress your video'
          });
        }
      } catch {
        result.errors.push({
          code: 'ACCESS',
          message: 'Unable to access video',
          help: 'Try uploading again'
        });
      }

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'SYSTEM',
          message: 'Validation failed',
          help: 'Please try again'
        }],
        metadata: {}
      };
    }
  }

  /**
   * Get basic Firebase storage rules
   */
  static getStorageRules() {
    return {
      rules: {
        'videos/{userId}/{fileName}': {
          '.write': 'auth != null && auth.uid == userId',
          '.validate': `
            request.resource.size <= ${this.BASIC_CHECKS.maxSizeBytes} &&
            request.resource.contentType.matches('video/mp4')
          `
        }
      }
    };
  }

  /**
   * Get upload configuration
   */
  static getUploadConfig(userId) {
    return {
      path: `videos/${userId}`,
      metadata: {
        contentType: 'video/mp4'
      },
      maxSize: this.BASIC_CHECKS.maxSizeBytes
    };
  }

  /**
   * Format error for client display
   */
  static formatError(error) {
    return {
      message: error.message,
      help: error.help || 'Try again or contact support',
      canRetry: error.code !== 'SYSTEM'
    };
  }
}

export default VideoValidator; 