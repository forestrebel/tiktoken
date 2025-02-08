import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { FFmpegKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';
import VideoValidator from './VideoValidator';
import QualityError from './QualityError';

class ProcessingPipeline {
  static PROCESSING_TIMEOUT = 120000; // 120 seconds in milliseconds

  constructor(firebaseConfig) {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    this.storage = getStorage(app);
    this.db = getFirestore(app);
    
    // Configure FFmpeg timeout
    FFmpegKitConfig.setSessionTimeout(this.PROCESSING_TIMEOUT);
  }

  /**
   * Process a video through the quality pipeline
   * @param {string} videoPath Local path to video file
   * @param {string} userId User identifier
   * @returns {Promise<ProcessingJob>}
   */
  async processVideo(videoPath, userId) {
    let processingJob = null;
    
    try {
      // Create processing job
      processingJob = await this.createProcessingJob(userId, videoPath);
      
      // Validate video
      await this.updateJobStatus(processingJob.jobId, 'validating', 10);
      const validation = await VideoValidator.validateVideo(videoPath);
      
      if (!validation.isValid) {
        await this.updateJobStatus(processingJob.jobId, 'failed', 0, {
          code: QualityError.Codes.VALIDATION_FAILED,
          message: validation.errors.map(e => e.message).join(', '),
          details: validation.errors
        });
        return this.getUpdatedJob(processingJob.jobId);
      }

      // Process video if needed
      await this.updateJobStatus(processingJob.jobId, 'processing', 30);
      const processedVideoPath = await this.processVideoWithTimeout(videoPath, validation);
      
      // Validate processed video
      await this.updateJobStatus(processingJob.jobId, 'validating', 70);
      const processedValidation = await VideoValidator.validateVideo(processedVideoPath);
      
      if (!processedValidation.isValid) {
        throw QualityError.processing('Processed video failed validation', processedValidation.errors);
      }

      // Upload to Firebase Storage
      await this.updateJobStatus(processingJob.jobId, 'uploading', 80);
      const videoUrl = await this.uploadToStorage(processedVideoPath, userId);
      
      // Update job with success
      await this.updateJobStatus(processingJob.jobId, 'completed', 100, null, {
        uri: videoUrl,
        metadata: processedValidation
      });
      
      return this.getUpdatedJob(processingJob.jobId);
    } catch (error) {
      console.error('Video processing failed:', error);
      if (processingJob?.jobId) {
        await this.updateJobStatus(
          processingJob.jobId,
          'failed',
          0,
          {
            code: error.code || QualityError.Codes.PROCESSING_FAILED,
            message: error.message,
            details: error.details
          }
        );
      }
      throw error;
    }
  }

  /**
   * Create a processing job in Firestore
   * @private
   */
  async createProcessingJob(userId, videoPath) {
    const jobRef = collection(this.db, 'processingJobs');
    const metadata = await VideoValidator.getVideoMetadata(videoPath);
    
    const job = {
      jobId: '', // Will be set after creation
      status: 'queued',
      progress: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId,
      input: {
        uri: videoPath,
        metadata
      }
    };

    const docRef = await addDoc(jobRef, job);
    job.jobId = docRef.id;
    
    return job;
  }

  /**
   * Update job status and progress
   * @private
   */
  async updateJobStatus(jobId, status, progress, error = null, output = null) {
    const docRef = doc(this.db, 'processingJobs', jobId);
    const update = {
      status,
      progress,
      updatedAt: Timestamp.now()
    };

    if (error) update.error = error;
    if (output) update.output = output;

    await updateDoc(docRef, update);
  }

  /**
   * Process video with timeout protection
   * @private
   */
  async processVideoWithTimeout(videoPath, validation) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(QualityError.processing('Processing timeout exceeded 120 seconds'));
      }, this.PROCESSING_TIMEOUT);

      this.processVideoIfNeeded(videoPath, validation)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Process video if it doesn't meet quality standards
   * @private
   */
  async processVideoIfNeeded(videoPath, validation) {
    // If video already meets all standards, return original path
    if (this.meetsAllStandards(validation)) {
      return videoPath;
    }

    // Process video to meet standards
    const outputPath = videoPath.replace('.mp4', '_processed.mp4');
    const command = this.buildFFmpegCommand(videoPath, outputPath, validation);
    
    try {
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();
      
      if (returnCode.isValueSuccess()) {
        return outputPath;
      } else {
        const logs = await session.getLogs();
        throw QualityError.processing('FFmpeg processing failed', logs);
      }
    } catch (error) {
      throw QualityError.processing(`Video processing failed: ${error.message}`);
    }
  }

  /**
   * Check if video meets all quality standards
   * @private
   */
  meetsAllStandards(validation) {
    const { format, dimensions, duration } = validation;
    const standards = VideoValidator.QUALITY_STANDARDS;
    
    return (
      format.videoCodec === standards.supportedCodecs.video[0] && // Use AV1 preferably
      format.audioCodec === standards.supportedCodecs.audio[0] && // Use AAC LC
      dimensions.width === standards.targetResolution.width &&
      dimensions.height === standards.targetResolution.height &&
      duration <= standards.maxDurationSeconds
    );
  }

  /**
   * Build FFmpeg command for video processing
   * @private
   */
  buildFFmpegCommand(inputPath, outputPath, validation) {
    const { width, height } = VideoValidator.QUALITY_STANDARDS.targetResolution;
    
    // Build a comprehensive FFmpeg command for nature video optimization
    return [
      `-i "${inputPath}"`,
      // Video settings
      '-c:v libaom-av1', // Use AV1 codec
      '-crf 30', // Constant Rate Factor for quality
      '-b:v 1M', // Target bitrate
      '-maxrate 1.5M', // Maximum bitrate
      '-bufsize 2M', // Buffer size
      // Audio settings
      '-c:a aac', // AAC codec
      '-b:a 128k', // Audio bitrate
      '-ar 44100', // Sample rate
      '-ac 2', // Stereo channels
      // Filters
      `-vf "scale=${width}:${height},fps=30000/1001"`, // Resolution and framerate
      // Output settings
      '-movflags +faststart', // Web optimization
      '-y', // Overwrite output
      `"${outputPath}"`
    ].join(' ');
  }

  /**
   * Upload processed video to Firebase Storage
   * @private
   */
  async uploadToStorage(videoPath, userId) {
    try {
      const filename = videoPath.split('/').pop();
      const storageRef = ref(this.storage, `videos/${userId}/${filename}`);
      
      const response = await fetch(`file://${videoPath}`);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      
      return await getDownloadURL(storageRef);
    } catch (error) {
      throw QualityError.upload(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Get updated job information
   * @private
   */
  async getUpdatedJob(jobId) {
    const docRef = doc(this.db, 'processingJobs', jobId);
    const snapshot = await docRef.get();
    return snapshot.data();
  }
}

export default ProcessingPipeline; 