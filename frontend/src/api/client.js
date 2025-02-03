/**
 * @typedef {Object} ApiConfig
 * @property {string} baseUrl - Base URL for API requests
 */

/**
 * @typedef {Object} HealthResponse
 * @property {string} status - API health status
 * @property {string} version - API version
 * @property {string} name - API name
 */

/**
 * @typedef {Object} UploadResponse
 * @property {string} url - URL of uploaded video
 */

/**
 * @callback ProgressCallback
 * @param {number} progress - Upload progress (0-100)
 */

/**
 * API client for backend communication
 */
class ApiClient {
  /**
   * Create an API client
   * @param {ApiConfig} config - API configuration
   */
  constructor(config) {
    this.baseUrl = config.baseUrl;
  }

  /**
   * Make an API request
   * @template T
   * @param {string} path - API endpoint path
   * @param {RequestInit} [options] - Fetch options
   * @returns {Promise<T>}
   * @private
   */
  async _request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Upload a video file
   * @param {FormData} formData - Form data containing the video file
   * @param {ProgressCallback} [onProgress] - Progress callback
   * @returns {Promise<UploadResponse>}
   */
  async uploadVideo(formData, onProgress) {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.send(formData);
    });
  }

  /**
   * Check API health
   * @returns {Promise<HealthResponse>}
   */
  async checkHealth() {
    return this._request('/health');
  }

  /**
   * Check Supabase connection health
   * @returns {Promise<{status: string, service: string}>}
   */
  async checkSupabaseHealth() {
    return this._request('/health/supabase');
  }
}

// Create and export API client instance
export const api = new ApiClient({
  baseUrl: '/api'  // Will be proxied by Vite in development
}); 