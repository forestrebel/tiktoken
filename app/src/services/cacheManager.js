import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

// Constants for cache management
const CACHE_KEYS = {
  SETTINGS: '@demo_settings',
  CACHE_METADATA: '@cache_metadata',
  LAST_DEMO_STATE: '@last_demo_state',
};

const CACHE_LIMITS = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILE_AGE: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL: 30 * 60 * 1000, // 30 minutes
  LOW_MEMORY_THRESHOLD: 0.9, // 90% of max size
};

class CacheManager {
  constructor() {
    this.cacheDir = `${RNFS.CachesDirectoryPath}/DemoVideos`;
    this.metadata = new Map();
    this.isInitialized = false;
    this.cleanupTimer = null;
    this.initializeCache();
  }

  /**
   * Initialize cache and restore state
   */
  async initializeCache() {
    try {
      // Ensure cache directory exists
      await RNFS.mkdir(this.cacheDir);

      // Load metadata from persistent storage
      const storedMetadata = await AsyncStorage.getItem(CACHE_KEYS.CACHE_METADATA);
      if (storedMetadata) {
        this.metadata = new Map(JSON.parse(storedMetadata));
      }

      // Start cleanup timer
      this.startCleanupTimer();

      // Initial cache verification
      await this.verifyCache();

      this.isInitialized = true;
    } catch (error) {
      console.error('Cache initialization failed:', error);
      // Attempt recovery
      await this.recoverCache();
    }
  }

  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(
      () => this.performCleanup(),
      CACHE_LIMITS.CLEANUP_INTERVAL
    );
  }

  /**
   * Add file to cache with metadata
   */
  async addFile(type, filePath, metadata = {}) {
    try {
      const stats = await RNFS.stat(filePath);
      const fileInfo = {
        path: filePath,
        size: stats.size,
        created: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        type,
        ...metadata,
      };

      // Check if adding this file would exceed limits
      const totalSize = await this.getTotalCacheSize();
      if (totalSize + stats.size > CACHE_LIMITS.MAX_TOTAL_SIZE) {
        await this.performCleanup();
        // Recheck after cleanup
        const newTotalSize = await this.getTotalCacheSize();
        if (newTotalSize + stats.size > CACHE_LIMITS.MAX_TOTAL_SIZE) {
          throw new Error('Cache size limit would be exceeded');
        }
      }

      this.metadata.set(filePath, fileInfo);
      await this.persistMetadata();
      return fileInfo;
    } catch (error) {
      console.error('Failed to add file to cache:', error);
      throw error;
    }
  }

  /**
   * Access file from cache
   */
  async accessFile(filePath) {
    const fileInfo = this.metadata.get(filePath);
    if (!fileInfo) {
      throw new Error('File not found in cache');
    }

    // Update access metadata
    fileInfo.lastAccessed = Date.now();
    fileInfo.accessCount++;
    this.metadata.set(filePath, fileInfo);
    await this.persistMetadata();

    return fileInfo;
  }

  /**
   * Get total cache size
   */
  async getTotalCacheSize() {
    let total = 0;
    for (const info of this.metadata.values()) {
      total += info.size;
    }
    return total;
  }

  /**
   * Perform cache cleanup
   */
  async performCleanup() {
    try {
      const now = Date.now();
      const filesToDelete = [];

      // Collect old files
      for (const [path, info] of this.metadata.entries()) {
        if (now - info.created > CACHE_LIMITS.MAX_FILE_AGE) {
          filesToDelete.push(path);
        }
      }

      // If still over limit, remove least accessed files
      if (await this.getTotalCacheSize() > CACHE_LIMITS.MAX_TOTAL_SIZE) {
        const sortedFiles = Array.from(this.metadata.entries())
          .sort((a, b) => a[1].accessCount - b[1].accessCount);

        for (const [path] of sortedFiles) {
          if (await this.getTotalCacheSize() <= CACHE_LIMITS.MAX_TOTAL_SIZE) {
            break;
          }
          filesToDelete.push(path);
        }
      }

      // Delete files
      await Promise.all(
        filesToDelete.map(async (path) => {
          try {
            await RNFS.unlink(path);
            this.metadata.delete(path);
          } catch (error) {
            console.warn('Failed to delete cache file:', error);
          }
        })
      );

      await this.persistMetadata();
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Verify cache integrity
   */
  async verifyCache() {
    const invalidPaths = [];

    for (const [path, info] of this.metadata.entries()) {
      try {
        const exists = await RNFS.exists(path);
        if (!exists) {
          invalidPaths.push(path);
          continue;
        }

        const stats = await RNFS.stat(path);
        if (stats.size !== info.size) {
          invalidPaths.push(path);
        }
      } catch (error) {
        invalidPaths.push(path);
      }
    }

    // Remove invalid entries
    invalidPaths.forEach(path => this.metadata.delete(path));
    await this.persistMetadata();

    return invalidPaths.length === 0;
  }

  /**
   * Recover cache from corrupted state
   */
  async recoverCache() {
    try {
      // Clear metadata
      this.metadata.clear();
      await this.persistMetadata();

      // Delete all cache files
      const files = await RNFS.readDir(this.cacheDir);
      await Promise.all(
        files.map(file => RNFS.unlink(file.path))
      );

      // Recreate cache directory
      await RNFS.mkdir(this.cacheDir);

      console.log('Cache recovered successfully');
    } catch (error) {
      console.error('Cache recovery failed:', error);
      throw error;
    }
  }

  /**
   * Persist metadata to storage
   */
  async persistMetadata() {
    try {
      const data = JSON.stringify(Array.from(this.metadata.entries()));
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_METADATA, data);
    } catch (error) {
      console.error('Failed to persist cache metadata:', error);
    }
  }

  /**
   * Save demo settings
   */
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Load demo settings
   */
  async loadSettings() {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  }

  /**
   * Save demo state
   */
  async saveDemoState(state) {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.LAST_DEMO_STATE,
        JSON.stringify(state)
      );
    } catch (error) {
      console.error('Failed to save demo state:', error);
    }
  }

  /**
   * Load demo state
   */
  async loadDemoState() {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.LAST_DEMO_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load demo state:', error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const cacheManager = new CacheManager();
