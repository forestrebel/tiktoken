import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { FFmpegKit, FFprobeKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const VIDEOS_KEY = '@videos';
const VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/videos`;
const THUMBNAIL_DIR = `${RNFS.DocumentDirectoryPath}/thumbnails`;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const THUMBNAIL_SIZE = '320x180'; // 16:9 thumbnail size
const STATUS_POLL_INTERVAL = 2000; // 2 seconds

// Cache for validation results
const validationCache = new Map();
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Demo video configuration
const DEMO_VIDEOS = {
  demo1: {
    id: 'demo1',
    filename: 'demo1.mp4',
    title: 'Nature Demo',
    created_at: new Date().toISOString(),
    width: 1080,
    height: 1920,
    thumbnail: 'demo1_thumb.jpg'
  }
};

const APP_CACHE_DIR = `${RNFS.CachesDirectoryPath}/AppVideos`;

// Ensure cache directory exists
const ensureCacheDir = async () => {
  try {
    const exists = await RNFS.exists(APP_CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(APP_CACHE_DIR);
    }
  } catch (error) {
    console.error('Failed to create cache directory:', error);
  }
};

// Initialize cache on import
ensureCacheDir();

/**
 * Generate a unique signature for a file based on its properties
 * @param {string} filePath Path to the file
 * @returns {Promise<string>} File signature
 */
async function generateFileSignature(filePath) {
  try {
    const stats = await RNFS.stat(filePath);
    // Read first 1024 bytes of file for additional uniqueness
    const header = await RNFS.read(filePath, 1024, 0, 'base64');
    // Combine size, mtime and file header for uniqueness
    return `${stats.size}_${stats.mtime}_${header.substring(0, 32)}`;
  } catch (error) {
    console.error('Failed to generate file signature:', error);
    throw error;
  }
}

/**
 * Video service for managing recordings and imports
 */
export const videoService = {
  /**
   * Initialize video storage and check system health
   */
  async init() {
    try {
      // Check system health first
      const health = await this.checkHealth();
      if (health.status !== 'ok') {
        return {
          status: 'error',
          error: health.message,
          details: health
        };
      }

      // Ensure videos list exists
      const videos = await AsyncStorage.getItem(VIDEOS_KEY);
      if (!videos) {
        await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify([]));
      }
      return { status: 'success' };
    } catch (error) {
      console.error('Failed to initialize video service:', error);
      return { status: 'error', error };
    }
  },

  /**
   * Check system health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_URL}/health`);
      const health = await response.json();
      
      // Add frontend-friendly suggestions
      if (health.status !== 'ok') {
        health.suggestions = [
          'Try again in a few moments',
          'Check your internet connection',
          'The service may be under maintenance'
        ];
        
        if (health.dependencies?.ffmpeg?.error) {
          health.suggestions.push('Video processing system unavailable');
        }
        if (health.storage?.error) {
          health.suggestions.push('Storage system unavailable');
        }
      }
      
      return health;
    } catch (error) {
      return {
        status: 'error',
        message: 'Could not connect to server',
        suggestions: [
          'Check your internet connection',
          'The server may be down',
          'Try again later'
        ]
      };
    }
  },

  /**
   * Import video with progress tracking
   */
  async importVideo(uri, onProgress) {
    try {
      console.log('Starting video import for URI:', uri);
      
      // Generate unique filename
      const timestamp = new Date().getTime();
      const filename = `video_${timestamp}.mp4`;
      const destPath = `${APP_CACHE_DIR}/${filename}`;
      
      console.log('Destination path:', destPath);

      // Ensure cache directory exists
      await ensureCacheDir();

      // Copy file to app's cache directory
      if (uri.startsWith('file://')) {
        console.log('Copying local file...');
        await RNFS.copyFile(uri.replace('file://', ''), destPath);
        // Simulate progress for local files
        for (let i = 0; i <= 100; i += 10) {
          onProgress?.(i / 100);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else {
        console.log('Downloading remote file...');
        // Download remote file with progress
        const result = await RNFS.downloadFile({
          fromUrl: uri,
          toFile: destPath,
          progress: (response) => {
            const progress = response.bytesWritten / response.contentLength;
            onProgress?.(progress);
          },
        }).promise;

        if (result.statusCode !== 200) {
          throw new Error('Download failed');
        }
      }

      // Verify the file exists and get stats
      const exists = await RNFS.exists(destPath);
      if (!exists) {
        throw new Error('File not found after copy/download');
      }

      const stats = await RNFS.stat(destPath);
      console.log('File stats after import:', stats);

      // Create external storage directory if needed
      const externalDir = '/storage/emulated/0/Android/data/com.tiktoken/files/videos';
      await RNFS.mkdir(externalDir);
      
      // Copy to external storage
      const externalPath = `${externalDir}/${filename}`;
      await RNFS.copyFile(destPath, externalPath);
      console.log('Copied to external storage:', externalPath);

      return {
        uri: `file://${destPath}`,
        filename,
        size: stats.size,
        timestamp,
        externalUri: `file://${externalPath}`
      };
    } catch (error) {
      console.error('Import error:', error);
      throw new Error('Failed to import video: ' + error.message);
    }
  },

  /**
   * Poll video processing status
   */
  async pollVideoStatus(videoId) {
    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/videos/${videoId}/status`);
        const status = await response.json();
        
        if (!response.ok) {
          console.error('Failed to get video status:', status);
          return false;
        }

        // Update video in storage
        const videos = JSON.parse(await AsyncStorage.getItem(VIDEOS_KEY) || '[]');
        const index = videos.findIndex(v => v.id === videoId);
        
        if (index !== -1) {
          videos[index] = {
            ...videos[index],
            state: status.state,
            error: status.error,
            progress: status.progress
          };
          await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
        }

        // Stop polling if complete or failed
        return !['completed', 'failed'].includes(status.state);
      } catch (error) {
        console.error('Status poll failed:', error);
        return false;
      }
    };

    // Start polling
    const poll = async () => {
      const shouldContinue = await pollStatus();
      if (shouldContinue) {
        setTimeout(poll, STATUS_POLL_INTERVAL);
      }
    };

    poll();
  },

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoId) {
    try {
      const response = await fetch(`${API_URL}/videos/${videoId}/metadata`);
      const metadata = await response.json();
      
      if (!response.ok) {
        return {
          status: 'error',
          error: metadata.error,
          suggestions: metadata.suggestions
        };
      }

      return {
        status: 'success',
        data: metadata
      };
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      return {
        status: 'error',
        error: 'Failed to get video details',
        suggestions: [
          'Try again later',
          'Check your internet connection',
          'The video may have been deleted'
        ]
      };
    }
  },

  /**
   * Get list of videos
   */
  async getVideos() {
    try {
      const videos = JSON.parse(await AsyncStorage.getItem(VIDEOS_KEY) || '[]');
      return {
        status: 'success',
        data: videos
      };
    } catch (error) {
      console.error('Failed to get videos:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  },

  /**
   * Reset video library
   */
  async reset() {
    try {
      await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify([]));
      return { status: 'success' };
    } catch (error) {
      console.error('Reset failed:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  },

  /**
   * Generate thumbnail for video
   * @param {string} videoPath Path to video file
   * @param {string} thumbnailPath Path to save thumbnail
   * @returns {Promise<Object>} Thumbnail generation result
   */
  async generateThumbnail(videoPath, thumbnailPath) {
    try {
      // Get video duration first
      const probeCmdResult = await FFprobeKit.execute(
        `-v error -select_streams v:0 -show_entries format=duration -of json "${videoPath}"`
      );
      
      const probeOutput = await probeCmdResult.getOutput();
      const duration = JSON.parse(probeOutput).format.duration;
      
      // Extract frame at 10% of duration for a better thumbnail
      const timestamp = Math.min(duration * 0.1, 3); // Use 10% or max 3 seconds
      
      // Enhanced thumbnail generation with better quality and filters
      const cmd = `-y -ss ${timestamp} -i "${videoPath}" -vframes 1 -an ` +
        `-vf "scale=${THUMBNAIL_SIZE}:force_original_aspect_ratio=decrease,` +
        `pad=${THUMBNAIL_SIZE}:-1:-1:color=black,format=yuv420p" ` +
        `-q:v 2 "${thumbnailPath}"`;
      
      const session = await FFmpegKit.execute(cmd);
      const returnCode = await session.getReturnCode();
      
      if (returnCode === 0) {
        // Verify thumbnail was created
        const exists = await RNFS.exists(thumbnailPath);
        if (!exists) {
          throw new Error('Thumbnail file was not created');
        }
        
        // Verify thumbnail size
        const stats = await RNFS.stat(thumbnailPath);
        if (stats.size === 0) {
          throw new Error('Generated thumbnail is empty');
        }
        
        return { status: 'success', path: thumbnailPath };
      }
      
      // Get error details if failed
      const logs = await session.getLogs();
      throw new Error(`Failed to generate thumbnail: ${logs}`);
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return { 
        status: 'error', 
        error: error.message,
        suggestions: [
          'Try importing the video again',
          'Ensure the video file is not corrupted',
          'Check if the video has valid video frames'
        ]
      };
    }
  },

  /**
   * Validate video file with FFprobe
   * @param {string} uri URI of the video to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateVideo(uri) {
    try {
      // Check cache first
      const cached = validationCache.get(uri);
      if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        return cached.result;
      }

      // Fast file size check
      const stats = await RNFS.stat(uri);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error('Video must be under 100MB');
      }

      // Parallel validation for speed
      const cmd = `-v error -select_streams v:0 -show_entries stream=width,height,codec_name,duration -of json "${uri}"`;
      const [probe, exists] = await Promise.all([
        FFprobeKit.execute(cmd),
        RNFS.exists(uri)
      ]);

      if (!exists) {
        throw new Error('Video file not found');
      }

      const returnCode = await probe.getReturnCode();
      if (returnCode === 0) {
        const output = await probe.getOutput();
        const metadata = JSON.parse(output);
        const stream = metadata.streams[0];

        // Quick codec check
        if (!['h264', 'hevc'].includes(stream.codec_name)) {
          throw new Error('Video must be in H.264 or HEVC format');
        }

        // Fast dimension check
        if (stream.width >= stream.height) {
          throw new Error('Video must be in portrait orientation (9:16)');
        }

        const result = { 
          status: 'success', 
          data: { 
            width: stream.width,
            height: stream.height,
            size: stats.size,
            codec: stream.codec_name,
            duration: parseFloat(stream.duration || '0')
          } 
        };

        // Cache successful validation
        validationCache.set(uri, {
          timestamp: Date.now(),
          result
        });

        return result;
      }
      throw new Error('Invalid video format');
    } catch (error) {
      const result = { 
        status: 'error', 
        error: error.message || 'Failed to validate video',
        suggestions: [
          'Ensure video is in portrait orientation (9:16)',
          'Use H.264 or HEVC format',
          'Keep file size under 100MB',
          'Try converting the video using a video editor'
        ]
      };

      // Cache error results briefly
      validationCache.set(uri, {
        timestamp: Date.now(),
        result
      });

      return result;
    }
  },

  /**
   * Get a single video
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getVideo(id) {
    try {
      const videos = await this.getVideos();
      if (videos.status === 'success') {
        const video = videos.data.find(v => v.id === id);
        return { status: 'success', data: video };
      }
      return videos;
    } catch (error) {
      return { status: 'error', error };
    }
  },

  /**
   * Delete a video
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteVideo(id) {
    try {
      const videos = await this.getVideos();
      if (videos.status === 'success') {
        const video = videos.data.find(v => v.id === id);
        
        if (video) {
          // Delete file
          const path = `${VIDEO_DIR}/${video.filename}`;
          await RNFS.unlink(path);
          
          // Update list
          const filtered = videos.data.filter(v => v.id !== id);
          await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(filtered));
        }
        
        return { status: 'success' };
      }
      return videos;
    } catch (error) {
      return { status: 'error', error };
    }
  },

  /**
   * Get video path for playback
   * @param {string} filename
   * @returns {string}
   */
  getVideoPath(filename) {
    return `${VIDEO_DIR}/${filename}`;
  },

  /**
   * Get thumbnail path
   * @param {string} filename
   * @returns {string}
   */
  getThumbnailPath(filename) {
    return `${THUMBNAIL_DIR}/${filename}`;
  },

  /**
   * Get a demo video
   * @param {string} id Demo video ID
   * @returns {Promise<Object>}
   */
  async getDemoVideo(id) {
    const video = DEMO_VIDEOS[id];
    if (!video) {
      return { status: 'error', error: 'Demo video not found' };
    }
    return { status: 'success', data: video };
  },

  /**
   * Clean up old videos
   */
  async cleanup() {
    try {
      const files = await RNFS.readDir(APP_CACHE_DIR);
      const now = new Date();

      for (const file of files) {
        const stats = await RNFS.stat(file.path);
        const ageHours = (now - new Date(stats.mtime)) / (1000 * 60 * 60);
        
        if (ageHours > 24) { // Remove files older than 24 hours
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
};

// Export constants for consistent validation
export const VIDEO_CONSTANTS = {
  MAX_SIZE_MB: 100,
  VALID_FORMATS: ['mp4', 'mov', 'quicktime'],
  MAX_DURATION_SEC: 300,
}; 