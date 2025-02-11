const AsyncStorage = require('@react-native-async-storage/async-storage');
const RNFS = require('react-native-fs');
const { Platform } = require('react-native');
const { FFmpegKit, FFprobeKit, FFmpegKitConfig } = require('ffmpeg-kit-react-native');
const { getStorage, ref, uploadBytes, uploadBytesResumable } = require('firebase/storage');
const { auth } = require('../config/firebase');
const OpenShotService = require('./openshot');
const { testVideos } = require('../../test/helpers/video');
const DocumentPicker = require('react-native-document-picker');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');
const { db, storage } = require('./supabase');
const MediaMetadataRetriever = require('react-native-media-metadata-retriever');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const VIDEOS_KEY = '@videos';
const APP_STORAGE_DIR = RNFS.ExternalStorageDirectoryPath;
const VIDEO_DIR = `${APP_STORAGE_DIR}/TikToken/videos`;
const CACHE_DIR = `${APP_STORAGE_DIR}/TikToken/cache`;
const THUMBNAIL_DIR = `${APP_STORAGE_DIR}/TikToken/thumbnails`;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const THUMBNAIL_SIZE = '320x180'; // 16:9 thumbnail size
const STATUS_POLL_INTERVAL = 2000; // 2 seconds

// Constants for video validation
const VIDEO_CONSTRAINTS = {
  maxSizeMB: 100,
  formats: ['video/mp4'],
  minDuration: 1,
  maxDuration: 300,
  resolution: {
    width: 720,
    height: 1280
  }
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

// Ensure cache directory exists
const ensureCacheDir = async () => {
  try {
    const exists = await RNFS.exists(CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(CACHE_DIR);
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

class VideoService {
  static instance = null;

  static getInstance() {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  /**
   * Initialize video storage and check system health
   */
  async init() {
    try {
      // Create necessary directories
      await RNFS.mkdir(VIDEO_DIR);
      await RNFS.mkdir(CACHE_DIR);
      await RNFS.mkdir(THUMBNAIL_DIR);
      
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
  }

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
  }

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
  }

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
  }

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
  }

  /**
   * Get list of videos
   */
  async getVideos() {
    return db.videos.getAll();
  }

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
  }

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
  }

  /**
   * Validate video
   * @param {string} uri Video URI
   * @returns {Promise<Object>} Validation result
   */
  async validateVideo(file) {
    try {
      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > VIDEO_CONSTRAINTS.maxSizeMB) {
        return {
          isValid: false,
          error: `Video must be under ${VIDEO_CONSTRAINTS.maxSizeMB}MB`
        };
      }

      // Check format
      if (!VIDEO_CONSTRAINTS.formats.includes(file.type)) {
        return {
          isValid: false,
          error: `Only ${VIDEO_CONSTRAINTS.formats.join(', ')} formats are supported`
        };
      }

      // Get metadata using Android's MediaMetadataRetriever
      const metadata = await MediaMetadataRetriever.getMetadata(file.fileCopyUri);
      
      // Validate duration
      const duration = parseInt(metadata.duration) / 1000; // Convert to seconds
      if (duration < VIDEO_CONSTRAINTS.minDuration || duration > VIDEO_CONSTRAINTS.maxDuration) {
        return {
          isValid: false,
          error: `Video duration must be between ${VIDEO_CONSTRAINTS.minDuration} and ${VIDEO_CONSTRAINTS.maxDuration} seconds`
        };
      }

      return {
        isValid: true,
        duration,
        metadata: {
          width: parseInt(metadata.width),
          height: parseInt(metadata.height),
          rotation: parseInt(metadata.rotation || '0'),
          bitrate: parseInt(metadata.bitrate)
        }
      };

    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate video'
      };
    }
  }

  /**
   * Get a single video
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getVideo(id) {
    return db.videos.get(id);
  }

  /**
   * Delete a video
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteVideo(id) {
    const videos = await this.getVideos();
    const video = videos.data.find(v => v.id === id);
    
    if (video) {
      try {
        await RNFS.unlink(video.path);
        // TODO: Implement database deletion
        return true;
      } catch (error) {
        console.error('Error deleting video file:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get video path for playback
   * @param {string} filename
   * @returns {string}
   */
  getVideoPath(filename) {
    return `${VIDEO_DIR}/${filename}`;
  }

  /**
   * Get thumbnail path
   * @param {string} filename
   * @returns {string}
   */
  getThumbnailPath(filename) {
    return `${THUMBNAIL_DIR}/${filename}`;
  }

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
  }

  /**
   * Clean up old videos
   */
  async cleanup() {
    try {
      const files = await RNFS.readDir(CACHE_DIR);
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

  async ensureCacheDirectory() {
    try {
      const cacheDir = `${CACHE_DIR}/Videos`;
      const exists = await RNFS.exists(cacheDir);
      if (!exists) {
        await RNFS.mkdir(cacheDir);
      }
      return cacheDir;
    } catch (error) {
      console.error('Failed to create cache directory:', error);
      throw new Error('Storage initialization failed');
    }
  }

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
  }

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
  }

  async getUploadProgress() {
    if (!currentUploadTask) {
      return 0;
    }
    const snapshot = await currentUploadTask.snapshot;
    return snapshot.bytesTransferred / snapshot.totalBytes;
  }

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
  }

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
  }

  /**
   * Create a video player instance
   * @param {string} uri Video URI
   * @returns {Promise<Object>} Player instance
   */
  async createPlayer(uri) {
    try {
      return {
        uri,
        ready: true,
        play: () => Promise.resolve(),
        pause: () => Promise.resolve(),
        stop: () => Promise.resolve(),
      };
    } catch (error) {
      console.error('Failed to create player:', error);
      throw error;
    }
  }

  /**
   * Get video thumbnail
   * @param {string} id Video ID
   * @returns {Promise<string>} Thumbnail URI
   */
  async getThumbnail(id) {
    try {
      const video = await this.getVideo(id);
      if (video.status === 'error' || !video.data) {
        throw new Error('Video not found');
      }
      return `${THUMBNAIL_DIR}/${video.data.id}_thumb.jpg`;
    } catch (error) {
      console.error('Failed to get thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get video state
   * @param {string} id Video ID
   * @returns {Promise<Object>} Video state
   */
  async getVideoState(id) {
    try {
      const video = await this.getVideo(id);
      if (video.status === 'error' || !video.data) {
        throw new Error('Video not found');
      }
      return {
        id: video.data.id,
        uri: video.data.uri,
        thumbnail: await this.getThumbnail(id),
      };
    } catch (error) {
      console.error('Failed to get video state:', error);
      throw error;
    }
  }

  async pickVideo() {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      if (!file) throw new Error('No file selected');

      // Validate video
      const validation = await this.validateVideo(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Upload to Supabase storage
      const filename = `${Date.now()}-${file.name}`;
      const { data: storageData } = await storage.upload(
        file,
        `videos/${filename}`,
        (progress) => console.log('Upload progress:', progress)
      );

      // Save video metadata to database
      const videoData = {
        id: uuidv4(),
        title: file.name,
        file_path: storageData.path,
        storage_path: `videos/${filename}`,
        type: file.type,
        size: file.size,
        metadata: {
          duration: validation.duration,
          ...validation.metadata
        }
      };

      await db.videos.save(videoData);
      return videoData;

    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        throw new Error('User cancelled the picker');
      }
      throw err;
    }
  }

  getVideoUrl(path) {
    return storage.getUrl(path);
  }
}

module.exports = VideoService.getInstance();

// Export constants for consistent validation
module.exports.VIDEO_CONSTANTS = {
  MAX_SIZE_MB: 100,
  VALID_FORMATS: ['mp4', 'mov', 'quicktime'],
  MAX_DURATION_SEC: 300,
};
