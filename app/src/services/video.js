import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const VIDEOS_KEY = '@videos';
const VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/videos`;

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
      return { status: 'error', error };
    }
  },

  /**
   * Import a video from external source
   * @param {string} uri URI of the video to import
   * @returns {Promise<Object>} Video object
   */
  async importVideo(uri) {
    try {
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
        imported: true
      };
      
      // Add to videos list
      const videos = await this.getVideos();
      if (videos.status === 'success') {
        videos.data.unshift(video);
        await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(videos.data));
        return { status: 'success', data: video };
      }
      return videos; // Return error from getVideos
    } catch (error) {
      return { status: 'error', error };
    }
  },

  /**
   * Save a recorded video
   * @param {string} uri
   * @returns {Promise<Object>}
   */
  async saveVideo(uri) {
    try {
      // Generate unique filename
      const filename = `video_${Date.now()}.mp4`;
      const destPath = `${VIDEO_DIR}/${filename}`;
      
      // Move video file to app storage
      await RNFS.moveFile(uri, destPath);
      
      // Create video entry
      const video = {
        id: Date.now().toString(),
        filename,
        created_at: new Date().toISOString(),
        recorded: true
      };
      
      // Add to videos list
      const videos = await this.getVideos();
      if (videos.status === 'success') {
        videos.data.unshift(video);
        await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(videos.data));
        return { status: 'success', data: video };
      }
      return videos; // Return error from getVideos
    } catch (error) {
      return { status: 'error', error };
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
      return videos; // Return error from getVideos
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
      return videos; // Return error from getVideos
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
  }
}; 