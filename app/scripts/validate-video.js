const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Validate video format and dimensions
 * @param {string} videoPath Path to video file
 * @returns {Object} Validation result
 */
function validateVideo(videoPath) {
  // Check file exists
  if (!fs.existsSync(videoPath)) {
    throw new Error('Video file not found');
  }

  // Check file size (max 100MB)
  const stats = fs.statSync(videoPath);
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (stats.size > maxSize) {
    throw new Error('Video must be under 100MB');
  }

  // Get video dimensions using ffprobe
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`;
    const dimensions = execSync(cmd).toString().trim();
    const [width, height] = dimensions.split('x').map(Number);

    // Calculate aspect ratio (should be approximately 0.5625 for 9:16)
    const aspect = width / height;
    const target = 0.5625; // 9:16
    const tolerance = 0.01;

    if (Math.abs(aspect - target) > tolerance) {
      throw new Error('Video must be in portrait mode (9:16 aspect ratio)');
    }

    return {
      valid: true,
      dimensions: { width, height },
      size: stats.size,
      aspect,
    };
  } catch (error) {
    if (error.message.includes('ffprobe')) {
      throw new Error('Failed to analyze video. Is ffmpeg installed?');
    }
    throw error;
  }
}

// If run directly
if (require.main === module) {
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.error('Usage: node validate-video.js <video_file>');
    process.exit(1);
  }

  try {
    const result = validateVideo(videoPath);
    console.log('Video validation passed:', result);
    process.exit(0);
  } catch (error) {
    console.error('Validation failed:', error.message);
    process.exit(1);
  }
}

module.exports = validateVideo;
