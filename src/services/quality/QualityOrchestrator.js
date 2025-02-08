import VideoValidator from './VideoValidator';
import ProcessingPipeline from './ProcessingPipeline';
import QualityError from './QualityError';

class QualityOrchestrator {
  static TIMEOUTS = {
    QUICK_VALIDATION: 100,    // 100ms for quick checks
    DEEP_VALIDATION: 2900,    // 2.9s for deep validation
    TOTAL_PROCESSING: 120000  // 120s total processing limit
  };

  constructor(firebaseConfig) {
    this.processingPipeline = new ProcessingPipeline(firebaseConfig);
  }

  /**
   * Orchestrate the video validation and processing flow
   * @param {string} videoPath Path to video file
   * @param {string} userId User identifier
   * @returns {Promise<ProcessingJob>}
   */
  async orchestrateVideoProcessing(videoPath, userId) {
    let job = null;

    try {
      // Start with quick validation
      const quickValidation = await this.performQuickValidation(videoPath);
      if (!quickValidation.isValid) {
        return this.createFailedJob(userId, videoPath, quickValidation.errors);
      }

      // Create processing job and start deep validation
      job = await this.processingPipeline.createProcessingJob(userId, videoPath);
      
      // Perform deep validation with timeout
      const deepValidation = await this.performDeepValidation(videoPath);
      if (!deepValidation.isValid) {
        await this.processingPipeline.updateJobStatus(
          job.jobId,
          'failed',
          0,
          {
            code: QualityError.Codes.VALIDATION_FAILED,
            message: 'Deep validation failed',
            details: deepValidation.errors
          }
        );
        return job;
      }

      // Proceed with processing if all validations pass
      return await this.processingPipeline.processVideo(videoPath, userId, job.jobId);
    } catch (error) {
      if (job?.jobId) {
        await this.processingPipeline.updateJobStatus(
          job.jobId,
          'failed',
          0,
          {
            code: error.code || QualityError.Codes.UNKNOWN_ERROR,
            message: error.message,
            details: error.details
          }
        );
      }
      throw error;
    }
  }

  /**
   * Perform quick validation checks (must complete within 100ms)
   * @private
   */
  async performQuickValidation(videoPath) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new QualityError(
          'Quick validation timeout exceeded',
          QualityError.Codes.VALIDATION_TIMEOUT,
          { timeoutMs: this.TIMEOUTS.QUICK_VALIDATION }
        ));
      }, this.TIMEOUTS.QUICK_VALIDATION);

      try {
        const result = await VideoValidator.quickValidate(videoPath);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Perform deep validation checks (must complete within 2900ms)
   * @private
   */
  async performDeepValidation(videoPath) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new QualityError(
          'Deep validation timeout exceeded',
          QualityError.Codes.VALIDATION_TIMEOUT,
          { timeoutMs: this.TIMEOUTS.DEEP_VALIDATION }
        ));
      }, this.TIMEOUTS.DEEP_VALIDATION);

      try {
        const result = await VideoValidator.deepValidate(videoPath);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Create a failed job for quick validation errors
   * @private
   */
  async createFailedJob(userId, videoPath, errors) {
    const job = await this.processingPipeline.createProcessingJob(userId, videoPath);
    await this.processingPipeline.updateJobStatus(
      job.jobId,
      'failed',
      0,
      {
        code: QualityError.Codes.QUICK_VALIDATION_FAILED,
        message: 'Quick validation failed',
        details: errors
      }
    );
    return job;
  }

  /**
   * Get estimated time remaining for a job
   * @param {ProcessingJob} job Current job state
   * @returns {number} Estimated time remaining in milliseconds
   */
  getEstimatedTimeRemaining(job) {
    const elapsed = Date.now() - job.startedAt;
    const totalTime = this.TIMEOUTS.TOTAL_PROCESSING;
    
    // Calculate based on current progress
    const remaining = totalTime * (1 - (job.progress / 100));
    
    // Don't return negative time
    return Math.max(0, Math.min(remaining, totalTime - elapsed));
  }
}

export default QualityOrchestrator; 