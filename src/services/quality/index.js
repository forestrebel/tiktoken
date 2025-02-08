export { default as VideoValidator } from './VideoValidator';
export { default as ProcessingPipeline } from './ProcessingPipeline';
export { default as QualityError } from './QualityError';

// Quality standards configuration
export const QUALITY_STANDARDS = {
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  targetResolution: {
    width: 720,
    height: 1280
  },
  supportedFormats: ['mp4'],
  supportedCodecs: {
    video: ['h264'],
    audio: ['aac']
  }
};

// Processing status constants
export const PROCESSING_STATUS = {
  INITIATED: 'initiated',
  VALIDATING: 'validating',
  PROCESSING: 'processing',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed'
}; 