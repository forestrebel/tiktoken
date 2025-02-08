/**
 * Basic error handling for video validation
 */
class QualityError {
  static ErrorTypes = {
    FORMAT: {
      code: 'FORMAT',
      message: 'Invalid video format',
      help: 'Convert to MP4 format'
    },
    SIZE: {
      code: 'SIZE',
      message: 'Video too large',
      help: 'Compress video to under 6MB'
    },
    ACCESS: {
      code: 'ACCESS',
      message: 'Cannot access video',
      help: 'Try uploading again'
    },
    SYSTEM: {
      code: 'SYSTEM',
      message: 'System error',
      help: 'Contact support'
    }
  };

  /**
   * Create error response for client
   */
  static createError(type, customMessage = null) {
    const error = this.ErrorTypes[type];
    return {
      code: error.code,
      message: customMessage || error.message,
      help: error.help
    };
  }

  /**
   * Format Firebase error
   */
  static fromFirebase(error) {
    // Map Firebase error codes to our error types
    const errorMap = {
      'storage/unauthorized': 'ACCESS',
      'storage/quota-exceeded': 'SIZE',
      'storage/invalid-format': 'FORMAT'
    };

    const type = errorMap[error.code] || 'SYSTEM';
    return this.createError(type, error.message);
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error) {
    return {
      title: error.message,
      description: error.help,
      canRetry: error.code !== 'SYSTEM'
    };
  }
}

export default QualityError; 