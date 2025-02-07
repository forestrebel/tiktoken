// Error codes for video upload validation
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_001',
  INVALID_USER: 'AUTH_002',

  // File validation errors
  INVALID_FILE_TYPE: 'FILE_001',
  FILE_TOO_LARGE: 'FILE_002',

  // Metadata validation errors
  MISSING_METADATA: 'META_001',
  INVALID_DIMENSIONS: 'META_002',
  INVALID_FPS: 'META_003',
  INVALID_DURATION: 'META_004',

  // Upload errors
  UPLOAD_FAILED: 'UPLOAD_001',
  NETWORK_ERROR: 'UPLOAD_002'
};

// Error class for video upload validation
export class VideoUploadError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'VideoUploadError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }

  static authRequired() {
    return new VideoUploadError(
      ErrorCodes.AUTH_REQUIRED,
      'User must be authenticated to upload videos'
    );
  }

  static invalidFileType(type) {
    return new VideoUploadError(
      ErrorCodes.INVALID_FILE_TYPE,
      'Only MP4 videos are supported',
      { providedType: type }
    );
  }

  static fileTooLarge(size, maxSize) {
    return new VideoUploadError(
      ErrorCodes.FILE_TOO_LARGE,
      `File size cannot exceed ${maxSize / (1024 * 1024)}MB`,
      {
        providedSize: size,
        maxSize: maxSize,
        sizeInMB: (size / (1024 * 1024)).toFixed(2)
      }
    );
  }

  static missingMetadata(missing) {
    return new VideoUploadError(
      ErrorCodes.MISSING_METADATA,
      'Required metadata fields are missing',
      { missingFields: missing }
    );
  }

  static invalidDimensions(width, height, expected) {
    return new VideoUploadError(
      ErrorCodes.INVALID_DIMENSIONS,
      `Invalid video dimensions. Required: ${expected.width}x${expected.height}`,
      {
        provided: { width, height },
        expected: expected
      }
    );
  }

  static invalidFps(fps, limits) {
    return new VideoUploadError(
      ErrorCodes.INVALID_FPS,
      `FPS must be between ${limits.min} and ${limits.max}`,
      {
        providedFps: fps,
        limits: limits
      }
    );
  }

  static invalidDuration(duration, maxDuration) {
    return new VideoUploadError(
      ErrorCodes.INVALID_DURATION,
      `Video duration cannot exceed ${maxDuration} seconds`,
      {
        providedDuration: duration,
        maxDuration: maxDuration
      }
    );
  }

  static uploadFailed(error) {
    return new VideoUploadError(
      ErrorCodes.UPLOAD_FAILED,
      'Failed to upload video. Please try again.',
      {
        originalError: error.message,
        stack: error.stack
      }
    );
  }

  static networkError(error) {
    return new VideoUploadError(
      ErrorCodes.NETWORK_ERROR,
      'Network error occurred during upload',
      {
        originalError: error.message,
        stack: error.stack
      }
    );
  }
} 