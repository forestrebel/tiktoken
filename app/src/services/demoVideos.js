import RNFS from 'react-native-fs';
import { FFmpegKit } from 'ffmpeg-kit-react-native';

// Demo video configurations
const DEMO_CONFIGS = {
  // Perfect portrait video (9:16)
  perfect: {
    width: 720,
    height: 1280,
    duration: 10, // Reduced for quick demo
    fps: 30,
    bitrate: '2M',
    description: 'Perfect portrait nature video (9:16)',
    quickMode: {
      duration: 5, // Even shorter for quick demo
      skipGeneration: true // Use cached version when possible
    }
  },
  // Landscape video (16:9) - for error testing
  landscape: {
    width: 1280,
    height: 720,
    duration: 10,
    fps: 30,
    bitrate: '2M',
    description: 'Landscape video (should fail)',
    quickMode: {
      skipValidation: false // Always validate to show error
    }
  },
  // Oversized video - for error testing
  oversized: {
    width: 1080,
    height: 1920,
    duration: 60,
    fps: 60,
    bitrate: '8M',
    description: 'Oversized video (should fail)',
    quickMode: {
      simulateSize: 150 * 1024 * 1024 // Simulate 150MB without generating
    }
  },
  // Network error simulation
  network_error: {
    width: 720,
    height: 1280,
    duration: 10,
    fps: 30,
    bitrate: '2M',
    description: 'Simulates network error during upload',
    quickMode: {
      simulateError: 'network',
      errorAfterProgress: 0.7 // Fail at 70% upload
    }
  }
};

class DemoVideoService {
  constructor() {
    this.cacheDir = `${RNFS.CachesDirectoryPath}/DemoVideos`;
    this.quickMode = false;
    this.ensureCacheDir();
  }

  setQuickMode(enabled) {
    this.quickMode = enabled;
  }

  async ensureCacheDir() {
    try {
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }
    } catch (error) {
      console.error('Failed to create demo cache directory:', error);
    }
  }

  /**
   * Generate or simulate a test video
   * @param {string} type Type of demo video to generate
   * @returns {Promise<Object>} Video information
   */
  async generateVideo(type = 'perfect') {
    try {
      const config = DEMO_CONFIGS[type];
      if (!config) {
        throw new Error(`Unknown demo video type: ${type}`);
      }

      // Quick mode handling
      if (this.quickMode && config.quickMode) {
        // Handle simulated errors
        if (config.quickMode.simulateError) {
          return {
            uri: 'demo://simulated',
            fileName: `demo_${type}_simulated.mp4`,
            type: 'video/mp4',
            size: config.quickMode.simulateSize || (50 * 1024 * 1024),
            width: config.width,
            height: config.height,
            duration: config.quickMode.duration || config.duration,
            fps: config.fps,
            description: config.description,
            simulatedError: config.quickMode.simulateError,
            errorProgress: config.quickMode.errorAfterProgress
          };
        }

        // Check cache for quick mode
        const cachedVideo = await this.getCachedVideo(type);
        if (cachedVideo && config.quickMode.skipGeneration) {
          return cachedVideo;
        }
      }

      // Generate unique filename
      const fileName = `demo_${type}_${Date.now()}.mp4`;
      const outputPath = `${this.cacheDir}/${fileName}`;

      // Use shorter duration in quick mode
      const duration = (this.quickMode && config.quickMode?.duration) || config.duration;

      // FFmpeg command to generate test video
      const cmd = [
        // Input: Generate test pattern
        '-f', 'lavfi', 
        '-i', `testsrc=duration=${duration}:size=${config.width}x${config.height}:rate=${config.fps}`,
        // Add nature-like overlay text
        '-vf', `drawtext=text='Nature Demo':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
        // Video codec settings
        '-c:v', 'libx264', '-preset', 'ultrafast', // Faster encoding for demo
        // Enforce configuration
        '-s', `${config.width}x${config.height}`,
        '-r', config.fps.toString(),
        '-b:v', config.bitrate,
        '-t', duration.toString(),
        // Force overwrite
        '-y',
        // Output path
        outputPath
      ].join(' ');

      // Generate video
      const session = await FFmpegKit.execute(cmd);
      const returnCode = await session.getReturnCode();

      if (returnCode === 0) {
        // Get file stats
        const stats = await RNFS.stat(outputPath);
        
        const result = {
          uri: `file://${outputPath}`,
          fileName,
          type: 'video/mp4',
          size: this.quickMode && config.quickMode?.simulateSize 
            ? config.quickMode.simulateSize 
            : stats.size,
          width: config.width,
          height: config.height,
          duration,
          fps: config.fps,
          description: config.description
        };

        // Cache for quick mode
        await this.cacheVideo(type, result);

        return result;
      }

      throw new Error('Failed to generate demo video');
    } catch (error) {
      console.error('Demo video generation failed:', error);
      throw error;
    }
  }

  /**
   * Cache video for quick mode
   */
  async cacheVideo(type, videoInfo) {
    try {
      await RNFS.writeFile(
        `${this.cacheDir}/${type}_cache.json`,
        JSON.stringify(videoInfo),
        'utf8'
      );
    } catch (error) {
      console.warn('Failed to cache video info:', error);
    }
  }

  /**
   * Get cached video if available
   */
  async getCachedVideo(type) {
    try {
      const cachePath = `${this.cacheDir}/${type}_cache.json`;
      if (await RNFS.exists(cachePath)) {
        const data = await RNFS.readFile(cachePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to read cache:', error);
    }
    return null;
  }

  /**
   * Get list of available demo video types
   * @returns {Object} Available demo video configurations
   */
  getAvailableTypes() {
    return Object.entries(DEMO_CONFIGS).map(([type, config]) => ({
      type,
      ...config,
      // Don't expose internal quick mode config
      quickMode: undefined
    }));
  }

  /**
   * Clean up generated demo videos
   */
  async cleanup() {
    try {
      const files = await RNFS.readDir(this.cacheDir);
      await Promise.all(
        files.map(file => RNFS.unlink(file.path))
      );
    } catch (error) {
      console.warn('Demo cleanup error:', error);
    }
  }
}

export const demoVideoService = new DemoVideoService(); 