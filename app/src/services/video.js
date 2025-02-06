import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const VIDEOS_KEY = '@videos';
const VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/videos`;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Demo video configuration
const DEMO_VIDEOS = {
  demo1: {
    id: 'demo1',
    filename: 'demo1.mp4',
    title: 'Nature Demo',
    created_at: new Date().toISOString(),
    width: 1080,
    height: 1920
  }
};

/**
 * Video service for managing recordings and imports
 */
export const videoService = {
  /**
   * Initialize video directory
   */
  async init() {
    try {
      const exists = await RNFS.exists(VIDEO_DIR);
      if (!exists) {
        await RNFS.mkdir(VIDEO_DIR);
      }
      return { status: 'success' };
    } catch (error) {
      console.error('Failed to initialize video service:', error);
      return { status: 'error', error };
    }
  },

  /**
   * Validate video file
   * @param {string} uri URI of the video to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateVideo(uri) {
    try {
      // Check file size
      const stats = await RNFS.stat(uri);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error('Video must be under 100MB');
      }

      // For now, we'll assume all videos are valid and in portrait mode
      // We'll add proper validation later
      return { 
        status: 'success', 
        data: { 
          width: 1080,  // Default width
          height: 1920, // Default height
          size: stats.size,
          codec: 'h264'  // Assume h264 codec
        } 
      };
    } catch (error) {
      console.error('Video validation error:', error);
      return { status: 'error', error: error.message || 'Failed to validate video' };
    }
  },

  /**
   * Import a video from external source with validation
   * @param {string} uri URI of the video to import
   * @returns {Promise<Object>} Video object
   */
  async importVideo(uri) {
    try {
      // Validate video
      const validation = await this.validateVideo(uri);
      if (validation.status === 'error') {
        return validation;
      }

      // Generate unique filename
      const filename = `video_${Date.now()}.mp4`;
      const destPath = `${VIDEO_DIR}/${filename}`;
      
      // Copy video file to app storage
      await RNFS.copyFile(uri, destPath);
      
      // Create video entry
      const video = {
        id: Date.now().toString(),
        filename,
        created_at: new Date().toISOString(),
        imported: true,
        ...validation.data
      };
      
      // Add to videos list
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
}; 