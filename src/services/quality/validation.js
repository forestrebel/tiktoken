import RNFS from 'react-native-fs';

// Video constraints
const VIDEO_CONSTRAINTS = {
  maxSizeMB: 100,
  dimensions: {
    width: 720,
    height: 1280
  },
  format: 'video/mp4'
};

// Performance timing targets
export const TIMING = {
  VALIDATION: 100,  // 100ms for validation
  UPLOAD: 2000,     // 2s for upload
  RECOVERY: 1000,   // 1s for error handling
  PREVIEW: 3000     // 3s for preview
};

// Performance check helper
export const checkPerformance = (operation, start, target) => {
  const duration = Date.now() - start;
  if (duration > target) {
    console.warn(
      `Performance warning: ${operation} took ${duration}ms (target: ${target}ms)`
    );
  }
  return duration;
};

// Video validation helper
export const validateNatureVideo = async (file) => {
  const start = Date.now();
  try {
    // Quick checks first (should be < 10ms)
    if (!file || !file.type) {
      return { valid: false, errorType: 'INVALID_FILE' };
    }

    // Format check (should be < 20ms)
    if (file.type !== VIDEO_CONSTRAINTS.format) {
      return { valid: false, errorType: 'INVALID_FORMAT' };
    }

    // Size check (should be < 20ms)
    if (file.size > VIDEO_CONSTRAINTS.maxSizeMB * 1024 * 1024) {
      return { valid: false, errorType: 'FILE_TOO_LARGE' };
    }

    // Verify file exists (should be < 50ms)
    const exists = await RNFS.exists(file.uri);
    if (!exists) {
      return { valid: false, errorType: 'FILE_NOT_FOUND' };
    }

    checkPerformance('validation', start, TIMING.VALIDATION);
    return { valid: true };
  } catch (error) {
    checkPerformance('validation', start, TIMING.VALIDATION);
    return { valid: false, errorType: 'UNKNOWN', error };
  }
}; 