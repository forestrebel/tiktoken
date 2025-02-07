import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { FFmpegKit, FFprobeKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';
import { getStorage, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { auth } from '../config/firebase';
import { OpenShotService } from './openshot';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const VIDEOS_KEY = '@videos';
const VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/videos`;
const THUMBNAIL_DIR = `${RNFS.DocumentDirectoryPath}/thumbnails`;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const THUMBNAIL_SIZE = '320x180'; // 16:9 thumbnail size
const STATUS_POLL_INTERVAL = 2000; // 2 seconds

// Constants for video validation
const VIDEO_CONSTRAINTS = {
  maxSizeMB: 100,
  minDurationSec: 1,
  maxDurationSec: 300,
  aspectRatio: {
    width: 9,
    height: 16,
  },
  resolution: {
    width: 720,
    height: 1280,
  },
};

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
    thumbnail: 'demo1_thumb.jpg',
  },
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

// Active upload task reference
let currentUploadTask = null;

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
          details: health,
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
          'The service may be under maintenance',
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
          'Try again later',
        ],
      };
    }
  },

  /**
   * Import video with progress tracking
   */
  async importVideo(uri, onProgress) {
    try {
      // Get file info
      const fileInfo = await RNFS.stat(uri);
      console.log('Importing video:', fileInfo);

      // Validate file size
      const sizeMB = fileInfo.size / (1024 * 1024);
      if (sizeMB > VIDEO_CONSTRAINTS.maxSizeMB) {
        throw new Error(`Video must be under ${VIDEO_CONSTRAINTS.maxSizeMB}MB`);
      }

      // Copy to cache directory
      const cacheDir = await this.ensureCacheDirectory();
      const fileName = uri.split('/').pop();
      const cachePath = `${cacheDir}/${fileName}`;

      await RNFS.copyFile(uri, cachePath);
      console.log('Video copied to cache:', cachePath);

      return {
        uri: cachePath,
        fileName,
        size: fileInfo.size,
        type: 'video/mp4',
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
            progress: status.progress,
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
          suggestions: metadata.suggestions,
        };
      }

      return {
        status: 'success',
        data: metadata,
      };
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      return {
        status: 'error',
        error: 'Failed to get video details',
        suggestions: [
          'Try again later',
          'Check your internet connection',
          'The video may have been deleted',
        ],
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
        data: videos,
      };
    } catch (error) {
      console.error('Failed to get videos:', error);
      return {
        status: 'error',
        error: error.message,
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
        error: error.message,
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
          'Check if the video has valid video frames',
        ],
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
        RNFS.exists(uri),
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
            duration: parseFloat(stream.duration || '0'),
          },
        };

        // Cache successful validation
        validationCache.set(uri, {
          timestamp: Date.now(),
          result,
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
          'Try converting the video using a video editor',
        ],
      };

      // Cache error results briefly
      validationCache.set(uri, {
        timestamp: Date.now(),
        result,
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
  },

  async ensureCacheDirectory() {
    try {
      const cacheDir = `${RNFS.CachesDirectoryPath}/Videos`;
      const exists = await RNFS.exists(cacheDir);
      if (!exists) {
        await RNFS.mkdir(cacheDir);
      }
      return cacheDir;
    } catch (error) {
      console.error('Failed to create cache directory:', error);
      throw new Error('Storage initialization failed');
    }
  },

  async uploadVideo(uri, metadata, onProgress) {
    try {
      // Validate user auth
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('Authentication required');
      }

      // Get file info
      const fileInfo = await RNFS.stat(uri);
      console.log('Uploading video:', fileInfo);

      // Read file as blob
      const blob = await RNFS.readFile(uri, 'base64');
      const bytes = Buffer.from(blob, 'base64');

      // Prepare storage reference
      const storage = getStorage();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
      const videoRef = ref(storage, `users/${userId}/videos/${fileName}`);

      // Create resumable upload
      currentUploadTask = uploadBytesResumable(
        videoRef,
        bytes,
        {
          contentType: 'video/mp4',
          customMetadata: {
            ...metadata,
            userId,
          },
        }
      );

      // Track progress
      return new Promise((resolve, reject) => {
        currentUploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = snapshot.bytesTransferred / snapshot.totalBytes;
            onProgress?.(progress);
          },
          (error) => {
            console.error('Upload error:', error);

            // Handle specific error cases
            switch (error.code) {
              case 'storage/unauthorized':
                reject(new Error('Not authorized to upload'));
                break;
              case 'storage/canceled':
                reject(new Error('Upload cancelled'));
                break;
              case 'storage/network-error':
                reject(new Error('Network error - check connection'));
                break;
              default:
                reject(new Error('Upload failed: ' + error.message));
            }
          },
          async () => {
            try {
              // Clean up cache file
              await RNFS.unlink(uri);

              // Return upload result
              resolve({
                path: currentUploadTask.snapshot.ref.fullPath,
                size: fileInfo.size,
                metadata: metadata,
              });
            } catch (error) {
              console.warn('Cleanup error:', error);
              // Still resolve since upload succeeded
              resolve({
                path: currentUploadTask.snapshot.ref.fullPath,
                size: fileInfo.size,
                metadata: metadata,
              });
            } finally {
              currentUploadTask = null;
            }
          }
        );
      });
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload video: ' + error.message);
    }
  },

  async cancelUpload() {
    if (currentUploadTask) {
      try {
        await currentUploadTask.cancel();
        currentUploadTask = null;
      } catch (error) {
        console.error('Cancel error:', error);
        throw new Error('Failed to cancel upload');
      }
    }
  },

  async getUploadProgress() {
    if (!currentUploadTask) {
      return 0;
    }
    const snapshot = await currentUploadTask.snapshot;
    return snapshot.bytesTransferred / snapshot.totalBytes;
  },

  async cleanupCache() {
    try {
      const cacheDir = await this.ensureCacheDirectory();
      const files = await RNFS.readDir(cacheDir);
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
  },

  /**
   * Process video with OpenShot
   * @param {string} videoPath Path to video file
   * @param {string} creatorId Creator ID
   * @returns {Promise<Object>} Processing result
   */
  async processWithOpenShot(videoPath, creatorId) {
    try {
      // Validate video first
      const validation = await this.validateVideo(videoPath);
      if (validation.status === 'error') {
        throw new Error(validation.error);
      }

      // Create/get project
      const project = await OpenShotService.createProject(creatorId);

      // Upload to OpenShot
      const upload = await OpenShotService.uploadVideo(
        project.id,
        videoPath,
        (progress) => {
          console.log('Upload progress:', progress);
        }
      );

      // Process video
      const processing = await OpenShotService.processVideo(
        project.id,
        upload.id
      );

      // Poll for completion
      const pollStatus = async () => {
        const status = await OpenShotService.getStatus(upload.id);
        if (status.status === 'completed') {
          return status;
        } else if (status.status === 'failed') {
          throw new Error('Video processing failed');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        return pollStatus();
      };

      return pollStatus();
    } catch (error) {
      console.error('OpenShot processing error:', error);
      throw error;
    }
  },
};

// Export constants for consistent validation
export const VIDEO_CONSTANTS = {
  MAX_SIZE_MB: 100,
  VALID_FORMATS: ['mp4', 'mov', 'quicktime'],
  MAX_DURATION_SEC: 300,
};
