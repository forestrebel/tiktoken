const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');

// Simple validation limits
const LIMITS = {
  MAX_SIZE: 6 * 1024 * 1024, // 6MB
  WIDTH: 720,
  HEIGHT: 1280,
  MIN_FPS: 29.97,
  MAX_FPS: 30,
  MAX_DURATION: 60
};

// Get video specs using ffprobe
const getSpecs = (path) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(path, (err, data) => {
    if (err) return reject(new Error('Invalid video format'));
    
    const video = data.streams.find(s => s.codec_type === 'video');
    if (!video) return reject(new Error('No video stream'));
    
    resolve({
      width: video.width,
      height: video.height,
      fps: eval(video.r_frame_rate),
      duration: parseFloat(data.format.duration)
    });
  });
});

// Get error message if specs invalid
const getError = (specs) => {
  if (specs.width !== LIMITS.WIDTH || specs.height !== LIMITS.HEIGHT) {
    return `Invalid resolution: ${specs.width}x${specs.height}`;
  }
  if (specs.fps < LIMITS.MIN_FPS || specs.fps > LIMITS.MAX_FPS) {
    return `Invalid FPS: ${specs.fps}`;
  }
  if (specs.duration > LIMITS.MAX_DURATION) {
    return `Video too long: ${specs.duration}s`;
  }
  return null;
};

// Main validation function
const validateVideo = async (path) => {
  try {
    // Quick size check first
    const stats = await fs.stat(path);
    if (stats.size > LIMITS.MAX_SIZE) {
      return {
        valid: false,
        error: 'File too large'
      };
    }

    // Then check specs
    const specs = await getSpecs(path);
    const error = getError(specs);
    
    return {
      valid: !error,
      specs,
      error
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
};

module.exports = {
  validateVideo,
  LIMITS
};
