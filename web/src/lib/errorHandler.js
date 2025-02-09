/**
 * Error categories for video processing
 */
export const ErrorTypes = {
  VALIDATION: {
    FORMAT: 'INVALID_FORMAT',
    SIZE: 'SIZE_EXCEEDED',
    RATIO: 'INVALID_ORIENTATION',
    CODEC: 'UNSUPPORTED_CODEC',
    INPUT: 'INVALID_INPUT',
    METADATA: 'METADATA_ERROR'
  },
  PROCESSING: {
    COMPRESSION: 'PROCESSING_FAILED',
    FFMPEG: 'FFMPEG_ERROR',
    MEMORY: 'OUT_OF_MEMORY',
    TIMEOUT: 'PROCESS_TIMEOUT',
    INITIALIZATION: 'INITIALIZATION_FAILED'
  },
  PLAYBACK: {
    LOADING: 'LOAD_FAILED',
    DECODE: 'DECODE_ERROR',
    STREAM: 'STREAM_ERROR',
    NETWORK: 'NETWORK_ERROR'
  }
};

/**
 * Error recovery strategies
 */
const RecoveryStrategy = {
  RETRY: 'retry',
  REDUCE_QUALITY: 'reduce_quality',
  FALLBACK: 'fallback',
  ABORT: 'abort'
};

/**
 * Handles video processing errors with retry logic and user feedback
 */
export class VideoErrorHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.onError = options.onError || (() => {});
    this.onRetry = options.onRetry || (() => {});
    this.onFallback = options.onFallback || (() => {});
    
    this._resetState();
  }

  /**
   * Reset error handler state
   */
  _resetState() {
    this.retryCount = 0;
    this.lastError = null;
    this.startTime = Date.now();
  }

  /**
   * Get error category and type
   * @param {Error} error - Error to analyze
   * @returns {Object} Error category and type
   */
  _categorizeError(error) {
    const message = error.message || '';
    
    // Check each error category
    for (const category of Object.keys(ErrorTypes)) {
      for (const [type, code] of Object.entries(ErrorTypes[category])) {
        if (message.includes(code)) {
          return { category, type, code };
        }
      }
    }
    
    // Default to processing error if unknown
    return {
      category: 'PROCESSING',
      type: 'COMPRESSION',
      code: ErrorTypes.PROCESSING.COMPRESSION
    };
  }

  /**
   * Determine if error can be retried
   * @param {Object} errorInfo - Categorized error info
   * @returns {boolean} Whether error is retriable
   */
  _canRetry(errorInfo) {
    const nonRetriable = [
      ErrorTypes.VALIDATION.FORMAT,
      ErrorTypes.VALIDATION.SIZE,
      ErrorTypes.VALIDATION.RATIO,
      ErrorTypes.VALIDATION.INPUT
    ];
    
    return !nonRetriable.includes(errorInfo.code) && 
           this.retryCount < this.maxRetries;
  }

  /**
   * Get recovery strategy for error
   * @param {Object} errorInfo - Categorized error info
   * @returns {string} Recovery strategy
   */
  _getStrategy(errorInfo) {
    switch (errorInfo.category) {
      case 'VALIDATION':
        return RecoveryStrategy.ABORT;
        
      case 'PROCESSING':
        if (errorInfo.code === ErrorTypes.PROCESSING.MEMORY) {
          return RecoveryStrategy.REDUCE_QUALITY;
        }
        return this._canRetry(errorInfo) ? 
          RecoveryStrategy.RETRY : RecoveryStrategy.FALLBACK;
        
      case 'PLAYBACK':
        return RecoveryStrategy.RETRY;
        
      default:
        return RecoveryStrategy.ABORT;
    }
  }

  /**
   * Format error message for user display
   * @param {Object} errorInfo - Categorized error info
   * @returns {Object} Formatted error details
   */
  _formatErrorMessage(errorInfo) {
    const baseMessage = {
      title: 'Video Processing Error',
      retry: this._canRetry(errorInfo),
      timestamp: new Date().toISOString()
    };

    switch (errorInfo.code) {
      case ErrorTypes.VALIDATION.FORMAT:
        return {
          ...baseMessage,
          message: 'Unsupported video format. Please use MP4, MOV, or M4V.',
          action: 'Choose a different file'
        };
        
      case ErrorTypes.VALIDATION.SIZE:
        return {
          ...baseMessage,
          message: 'File size too large. Maximum size is 100MB.',
          action: 'Choose a smaller file'
        };
        
      case ErrorTypes.VALIDATION.RATIO:
        return {
          ...baseMessage,
          message: 'Video must be in portrait orientation (9:16).',
          action: 'Choose a portrait video'
        };
        
      case ErrorTypes.PROCESSING.COMPRESSION:
        return {
          ...baseMessage,
          message: 'Failed to process video. Please try again.',
          action: this._canRetry(errorInfo) ? 'Retrying...' : 'Try again'
        };
        
      default:
        return {
          ...baseMessage,
          message: 'An unexpected error occurred.',
          action: 'Please try again'
        };
    }
  }

  /**
   * Log error for monitoring
   * @param {Error} error - Error to log
   * @param {Object} errorInfo - Categorized error info
   */
  async _logError(error, errorInfo) {
    const logData = {
      ...errorInfo,
      message: error.message,
      stack: error.stack,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime
    };
    
    console.error('Video Error:', logData);
    
    // Here you would typically send to your monitoring service
    // await monitoring.logError(logData);
  }

  /**
   * Handle video processing error
   * @param {Error} error - Error to handle
   * @param {Function} retryFn - Function to retry on failure
   * @returns {Promise<Object>} Error handling result
   */
  async handleError(error, retryFn) {
    try {
      // Categorize and analyze error
      const errorInfo = this._categorizeError(error);
      const strategy = this._getStrategy(errorInfo);
      
      // Log error
      await this._logError(error, errorInfo);
      
      // Format user message
      const userMessage = this._formatErrorMessage(errorInfo);
      
      // Notify error callback
      this.onError(userMessage);
      
      // Handle based on strategy
      switch (strategy) {
        case RecoveryStrategy.RETRY:
          this.retryCount++;
          this.onRetry({ attempt: this.retryCount, max: this.maxRetries });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          return await retryFn();
          
        case RecoveryStrategy.REDUCE_QUALITY:
          this.onFallback({ type: 'quality_reduction' });
          return await retryFn({ reduceQuality: true });
          
        case RecoveryStrategy.FALLBACK:
          this.onFallback({ type: 'alternative_method' });
          return { error: userMessage, fallback: true };
          
        case RecoveryStrategy.ABORT:
        default:
          return { error: userMessage, aborted: true };
      }
    } catch (handlerError) {
      console.error('Error handler failed:', handlerError);
      return { 
        error: {
          title: 'Critical Error',
          message: 'Failed to handle error recovery',
          retry: false,
          timestamp: new Date().toISOString()
        },
        critical: true
      };
    } finally {
      if (this.retryCount >= this.maxRetries) {
        this._resetState();
      }
    }
  }
} 