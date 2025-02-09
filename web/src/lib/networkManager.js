/**
 * Network resilience manager for video handling
 */

// Network conditions
export const NetworkConditions = {
  OFFLINE: 'offline',
  SLOW_2G: 'slow-2g',
  TWO_G: '2g',
  THREE_G: '3g',
  FOUR_G: '4g',
  WIFI: 'wifi'
};

// Retry configuration
export const RetryConfig = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  TIMEOUT: 30000
};

/**
 * Manages network resilience and offline capabilities
 */
export class NetworkManager {
  constructor() {
    this.online = navigator.onLine;
    this.connectionType = this.getConnectionType();
    this.retryQueue = new Map();
    this.offlineStorage = null;
    this.setupListeners();
    this.initializeStorage();
  }

  /**
   * Initialize IndexedDB storage for offline videos
   */
  async initializeStorage() {
    try {
      const request = indexedDB.open('VideoCache', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'url' });
        }
      };

      request.onsuccess = (event) => {
        this.offlineStorage = event.target.result;
      };

      request.onerror = (error) => {
        console.error('Failed to initialize offline storage:', error);
      };
    } catch (error) {
      console.error('Storage initialization failed:', error);
    }
  }

  /**
   * Set up network event listeners
   */
  setupListeners() {
    window.addEventListener('online', () => {
      this.online = true;
      this.connectionType = this.getConnectionType();
      this.processRetryQueue();
      this.dispatchEvent('networkStatusChange', { online: true });
    });

    window.addEventListener('offline', () => {
      this.online = false;
      this.connectionType = NetworkConditions.OFFLINE;
      this.dispatchEvent('networkStatusChange', { online: false });
    });

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.connectionType = this.getConnectionType();
        this.dispatchEvent('connectionChange', { type: this.connectionType });
      });
    }
  }

  /**
   * Get current connection type
   */
  getConnectionType() {
    if (!this.online) return NetworkConditions.OFFLINE;
    
    if ('connection' in navigator) {
      const { effectiveType, saveData } = navigator.connection;
      if (saveData) return NetworkConditions.SLOW_2G;
      return effectiveType;
    }
    
    return NetworkConditions.WIFI;
  }

  /**
   * Handle video request with resilience
   */
  async handleVideoRequest(url, options = {}) {
    try {
      // Check offline storage first
      if (!this.online) {
        const offlineVideo = await this.getOfflineVideo(url);
        if (offlineVideo) return offlineVideo;
        throw new Error('No offline version available');
      }

      // Adapt quality based on connection
      const adaptedOptions = this.adaptQualityOptions(options);
      
      // Attempt fetch with retry
      return await this.fetchWithRetry(url, adaptedOptions);
    } catch (error) {
      console.error('Video request failed:', error);
      throw error;
    }
  }

  /**
   * Adapt video quality options based on connection
   */
  adaptQualityOptions(options) {
    const adapted = { ...options };

    switch (this.connectionType) {
      case NetworkConditions.SLOW_2G:
      case NetworkConditions.TWO_G:
        adapted.quality = 'low';
        adapted.maxBitrate = 500000; // 500kbps
        break;
      case NetworkConditions.THREE_G:
        adapted.quality = 'medium';
        adapted.maxBitrate = 1500000; // 1.5Mbps
        break;
      default:
        // Keep original quality for 4G/WiFi
        break;
    }

    return adapted;
  }

  /**
   * Fetch with exponential backoff retry
   */
  async fetchWithRetry(url, options, attempt = 1) {
    try {
      const response = await this.timeoutFetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Store for offline use if possible
      this.storeForOffline(url, await response.clone().blob());
      
      return response;
    } catch (error) {
      if (attempt >= RetryConfig.MAX_ATTEMPTS) {
        throw error;
      }

      const delay = Math.min(
        RetryConfig.BASE_DELAY * Math.pow(2, attempt - 1),
        RetryConfig.MAX_DELAY
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(url, options, attempt + 1);
    }
  }

  /**
   * Fetch with timeout
   */
  timeoutFetch(url, options) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), RetryConfig.TIMEOUT)
      )
    ]);
  }

  /**
   * Store video for offline use
   */
  async storeForOffline(url, blob) {
    if (!this.offlineStorage) return;

    try {
      const transaction = this.offlineStorage.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      
      await store.put({
        url,
        blob,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to store video offline:', error);
    }
  }

  /**
   * Get video from offline storage
   */
  async getOfflineVideo(url) {
    if (!this.offlineStorage) return null;

    try {
      const transaction = this.offlineStorage.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const video = await store.get(url);
      
      return video?.blob || null;
    } catch (error) {
      console.error('Failed to get offline video:', error);
      return null;
    }
  }

  /**
   * Save video progress
   */
  async saveProgress(url, progress) {
    if (!this.offlineStorage) return;

    try {
      const transaction = this.offlineStorage.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      
      await store.put({
        url,
        progress,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  /**
   * Get saved progress
   */
  async getProgress(url) {
    if (!this.offlineStorage) return null;

    try {
      const transaction = this.offlineStorage.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      const data = await store.get(url);
      
      return data?.progress || null;
    } catch (error) {
      console.error('Failed to get progress:', error);
      return null;
    }
  }

  /**
   * Clean up old offline videos
   */
  async cleanupStorage(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    if (!this.offlineStorage) return;

    try {
      const transaction = this.offlineStorage.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const videos = await store.getAll();
      
      const now = Date.now();
      for (const video of videos) {
        if (now - video.timestamp > maxAge) {
          await store.delete(video.url);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
    }
  }

  /**
   * Get storage usage
   */
  async getStorageUsage() {
    if (!this.offlineStorage) return 0;

    try {
      const transaction = this.offlineStorage.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const videos = await store.getAll();
      
      return videos.reduce((total, video) => total + (video.blob.size || 0), 0);
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return 0;
    }
  }

  /**
   * Dispatch custom event
   */
  dispatchEvent(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

// Export singleton instance
export const networkManager = new NetworkManager(); 