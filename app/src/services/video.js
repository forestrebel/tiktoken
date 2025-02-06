import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { FFmpegKit, FFprobeKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';

const VIDEOS_KEY = '@videos';
const VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/videos`;
const THUMBNAIL_DIR = `${RNFS.DocumentDirectoryPath}/thumbnails`;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const THUMBNAIL_SIZE = '320x180'; // 16:9 thumbnail size

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
   * Initialize video and thumbnail directories
   */
  async init() {
    try {
      // Initialize FFmpeg with optimal settings
      await FFmpegKitConfig.init();
      await FFmpegKitConfig.enableRedirection();
      
      // Use parallel initialization
      await Promise.all([
        RNFS.exists(VIDEO_DIR).then(exists => !exists && RNFS.mkdir(VIDEO_DIR)),
        RNFS.exists(THUMBNAIL_DIR).then(exists => !exists && RNFS.mkdir(THUMBNAIL_DIR))
      ]);
      
      return { status: 'success' };
    } catch (error) {
      console.error('Failed to initialize video service:', error);
      return { status: 'error', error };
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
   * Reset the video library and clean up all files
   */
  async reset() {
    try {
      // Clear stored video list first
      await AsyncStorage.removeItem(VIDEOS_KEY);
      
      // Ensure directories exist
      await Promise.all([
        RNFS.exists(VIDEO_DIR).then(exists => !exists && RNFS.mkdir(VIDEO_DIR)),
        RNFS.exists(THUMBNAIL_DIR).then(exists => !exists && RNFS.mkdir(THUMBNAIL_DIR))
      ]);
      
      // Delete all files in video directory
      const files = await RNFS.readDir(VIDEO_DIR);
      await Promise.all(
        files.map(file => RNFS.unlink(file.path).catch(err => 
          console.warn(`Failed to delete video file ${file.name}:`, err)
        ))
      );
      
      // Delete all files in thumbnail directory
      const thumbs = await RNFS.readDir(THUMBNAIL_DIR);
      await Promise.all(
        thumbs.map(thumb => RNFS.unlink(thumb.path).catch(err => 
          console.warn(`Failed to delete thumbnail file ${thumb.name}:`, err)
        ))
      );

      // Clear validation cache
      validationCache.clear();
      
      return { status: 'success', message: 'Library reset complete' };
    } catch (error) {
      console.error('Reset error:', error);
      return { 
        status: 'error', 
        error: error.message || 'Failed to reset library',
        suggestions: [
          'Try restarting the app',
          'Check storage permissions'
        ]
      };
    }
  },

  /**
   * Import a video from external source with validation
   */
  async importVideo(uri) {
    try {
      // Check if file exists first
      const exists = await RNFS.exists(uri);
      if (!exists) {
        return {
          status: 'error',
          error: 'Video file not found',
          suggestions: ['Please select a different video']
        };
      }

      // Generate file signature first to check for duplicates
      const fileSignature = await generateFileSignature(uri);
      const existingVideos = await this.getVideos();
      
      if (existingVideos.status === 'success') {
        const duplicate = existingVideos.data.find(v => v.fileSignature === fileSignature);
        if (duplicate) {
          return {
            status: 'error',
            error: 'This video is already in your library',
            suggestions: ['Select a different video']
          };
        }
      }

      // Copy to temp location and validate
      const tempPath = `${VIDEO_DIR}/temp_${Date.now()}.mp4`;
      await RNFS.copyFile(uri, tempPath);
      
      const validation = await this.validateVideo(tempPath);
      if (validation.status === 'error') {
        await RNFS.unlink(tempPath);
        return validation;
      }

      // Generate filenames
      const filename = `video_${Date.now()}.mp4`;
      const thumbnailName = `thumb_${Date.now()}.jpg`;
      const destPath = `${VIDEO_DIR}/${filename}`;
      const thumbPath = `${THUMBNAIL_DIR}/${thumbnailName}`;
      
      // Move temp file and generate thumbnail in parallel
      const [_, thumbnail] = await Promise.all([
        RNFS.moveFile(tempPath, destPath),
        this.generateThumbnail(tempPath, thumbPath)
      ]);

      if (thumbnail.status === 'error') {
        await RNFS.unlink(destPath);
        return thumbnail;
      }
      
      const video = {
        id: Date.now().toString(),
        filename,
        thumbnail: thumbnailName,
        created_at: new Date().toISOString(),
        imported: true,
        fileSignature,
        ...validation.data
      };
      
      // Update video list
      const videos = await this.getVideos();
      if (videos.status === 'success') {
        videos.data.unshift(video);
        await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(videos.data));
        return { status: 'success', data: video };
      }
      return videos;
    } catch (error) {
      console.error('Import error:', error);
      return { status: 'error', error: error.message || 'Failed to import video' };
    }
  },

  /**
   * Get all videos
   * @returns {Promise<Object[]>}
   */
  async getVideos() {
    try {
      const data = await AsyncStorage.getItem(VIDEOS_KEY);
      return { status: 'success', data: data ? JSON.parse(data) : [] };
    } catch (error) {
      return { status: 'error', error };
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
   * Clean up temporary files
   */
  async cleanup() {
    try {
      const videos = await this.getVideos();
      if (videos.status === 'success') {
        const validFiles = new Set(videos.data.map(v => v.filename));
        const validThumbs = new Set(videos.data.map(v => v.thumbnail));
        
        // Clean up orphaned video files
        const files = await RNFS.readDir(VIDEO_DIR);
        for (const file of files) {
          if (!validFiles.has(file.name)) {
            await RNFS.unlink(file.path);
          }
        }
        
        // Clean up orphaned thumbnails
        const thumbs = await RNFS.readDir(THUMBNAIL_DIR);
        for (const thumb of thumbs) {
          if (!validThumbs.has(thumb.name)) {
            await RNFS.unlink(thumb.path);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}; 