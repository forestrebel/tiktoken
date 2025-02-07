import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENSHOT_API = process.env.OPENSHOT_API || 'http://localhost:8000/api';
const PROJECTS_KEY = '@openshot_projects';

// Error class for OpenShot-specific errors
class OpenShotError extends Error {
  constructor(message, suggestions = []) {
    super(message);
    this.name = 'OpenShotError';
    this.suggestions = suggestions;
  }
}

// Exponential backoff for retries
const backoff = (retryCount) => {
  return Math.min(1000 * Math.pow(2, retryCount), 10000);
};

export const OpenShotService = {
  /**
   * Initialize project for a creator
   * @param {string} creatorId 
   * @returns {Promise<{id: string, name: string}>}
   */
  async createProject(creatorId) {
    try {
      // Check for existing project
      const projects = JSON.parse(await AsyncStorage.getItem(PROJECTS_KEY) || '{}');
      if (projects[creatorId]) {
        return projects[creatorId];
      }

      // Create new project
      const response = await fetch(`${OPENSHOT_API}/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Nature_${creatorId}`,
          width: 720,
          height: 1280,
          fps: 30,
          profile: 'mobile'
        })
      });

      if (!response.ok) {
        throw new OpenShotError('Failed to create project', [
          'Check your internet connection',
          'Try again in a few minutes'
        ]);
      }

      const project = await response.json();
      
      // Cache project
      projects[creatorId] = project;
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

      return project;
    } catch (error) {
      if (error instanceof OpenShotError) throw error;
      throw new OpenShotError('Project creation failed', [
        'Ensure you have an active internet connection',
        'Try restarting the app'
      ]);
    }
  },

  /**
   * Upload video to OpenShot project
   * @param {string} projectId 
   * @param {string} videoPath 
   * @param {Function} onProgress 
   * @returns {Promise<{id: string, url: string}>}
   */
  async uploadVideo(projectId, videoPath, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: videoPath,
        type: 'video/mp4',
        name: 'video.mp4'
      });
      formData.append('project_id', projectId);

      const response = await fetch(`${OPENSHOT_API}/videos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });

      if (!response.ok) {
        throw new OpenShotError('Failed to upload video', [
          'Check your internet connection',
          'Ensure the video file is valid',
          'Try uploading a smaller video'
        ]);
      }

      return response.json();
    } catch (error) {
      if (error instanceof OpenShotError) throw error;
      throw new OpenShotError('Video upload failed', [
        'Check your internet connection',
        'Try uploading again'
      ]);
    }
  },

  /**
   * Process video for portrait mode
   * @param {string} projectId 
   * @param {string} videoId 
   * @returns {Promise<{id: string, status: string}>}
   */
  async processVideo(projectId, videoId) {
    try {
      const response = await fetch(`${OPENSHOT_API}/videos/${videoId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          operations: [
            {
              name: 'validate_portrait',
              params: {
                width: 720,
                height: 1280,
                tolerance: 0.01
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new OpenShotError('Failed to process video', [
          'Ensure video is in portrait mode',
          'Try uploading a different video'
        ]);
      }

      return response.json();
    } catch (error) {
      if (error instanceof OpenShotError) throw error;
      throw new OpenShotError('Video processing failed', [
        'Check if the video meets requirements',
        'Try processing again'
      ]);
    }
  },

  /**
   * Get video processing status
   * @param {string} videoId 
   * @param {number} retryCount 
   * @returns {Promise<{status: string, progress: number}>}
   */
  async getStatus(videoId, retryCount = 0) {
    try {
      const response = await fetch(`${OPENSHOT_API}/videos/${videoId}/status`);
      
      if (!response.ok) {
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, backoff(retryCount)));
          return this.getStatus(videoId, retryCount + 1);
        }
        throw new OpenShotError('Failed to get status', [
          'Try checking status again',
          'Restart the process if issue persists'
        ]);
      }

      return response.json();
    } catch (error) {
      if (error instanceof OpenShotError) throw error;
      throw new OpenShotError('Status check failed', [
        'Check your internet connection',
        'Try again in a few moments'
      ]);
    }
  },

  /**
   * Clean up project resources
   * @param {string} projectId 
   */
  async cleanup(projectId) {
    try {
      await fetch(`${OPENSHOT_API}/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      // Clean up local cache
      const projects = JSON.parse(await AsyncStorage.getItem(PROJECTS_KEY) || '{}');
      const creatorId = Object.keys(projects).find(key => projects[key].id === projectId);
      if (creatorId) {
        delete projects[creatorId];
        await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}; 