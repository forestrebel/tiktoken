import axios from 'axios';
import { OPENSHOT_API_URL, OPENSHOT_API_TOKEN } from '@env';

if (!OPENSHOT_API_URL || !OPENSHOT_API_TOKEN) {
  throw new Error('Missing OpenShot API configuration');
}

class OpenShotService {
  constructor() {
    this.client = axios.create({
      baseURL: OPENSHOT_API_URL,
      headers: {
        'Authorization': `Token ${OPENSHOT_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a new project
   * @param {string} creatorId
   * @returns {Promise<Object>}
   */
  async createProject(creatorId) {
    try {
      const { data } = await this.client.post('/projects/', {
        name: `tiktoken_${creatorId}`,
        width: 720,
        height: 1280,
        fps_num: 30,
        fps_den: 1,
        sample_rate: 44100,
        channels: 2,
        channel_layout: 3,
      });
      return data;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error('Project creation failed');
    }
  }

  /**
   * Upload video to project
   * @param {string} projectId
   * @param {File} file
   * @param {Function} onProgress
   * @returns {Promise<Object>}
   */
  async uploadVideo(projectId, file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project', projectId);

      const { data } = await this.client.post('/files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percentCompleted);
        }
      });
      return data;
    } catch (error) {
      console.error('Failed to upload video:', error);
      throw new Error('Video upload failed');
    }
  }

  /**
   * Process video with effects
   * @param {string} projectId
   * @param {string} fileId
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async processVideo(projectId, fileId, options = {}) {
    try {
      // Create a clip from the file
      const { data: clip } = await this.client.post('/clips/', {
        file: fileId,
        project: projectId,
        position: 0,
        start: 0,
        end: 0, // 0 means use full duration
        ...options
      });

      // Export the project
      const { data: export_job } = await this.client.post('/exports/', {
        project: projectId,
        video_format: 'mp4',
        video_codec: 'libx264',
        video_bitrate: 8000000,
        audio_codec: 'aac',
        audio_bitrate: 192000,
        start_frame: 1,
        end_frame: -1, // -1 means use all frames
        ...options
      });

      return export_job;
    } catch (error) {
      console.error('Failed to process video:', error);
      throw new Error('Video processing failed');
    }
  }

  /**
   * Get export status
   * @param {string} exportId
   * @returns {Promise<Object>}
   */
  async getExportStatus(exportId) {
    try {
      const { data } = await this.client.get(`/exports/${exportId}/`);
      return {
        status: data.status,
        progress: data.progress,
        output: data.output,
        error: data.error
      };
    } catch (error) {
      console.error('Failed to get export status:', error);
      throw new Error('Failed to get export status');
    }
  }

  /**
   * Delete project and its resources
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    try {
      await this.client.delete(`/projects/${projectId}/`);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw new Error('Project deletion failed');
    }
  }
}

export default new OpenShotService();
