import { demoVideoService } from './demoVideos';
import RNFS from 'react-native-fs';

class DemoPreparationService {
  constructor() {
    this.isPrepped = false;
    this.prepProgress = 0;
    this.statusCallback = null;
  }

  /**
   * Set status callback for prep progress
   */
  setStatusCallback(callback) {
    this.statusCallback = callback;
  }

  /**
   * Update prep status
   */
  updateStatus(message, progress) {
    this.prepProgress = progress;
    if (this.statusCallback) {
      this.statusCallback(message, progress);
    }
  }

  /**
   * Prepare all demo videos and cache states
   */
  async prepareForRecording() {
    try {
      // Start fresh
      this.updateStatus('Cleaning up old demo files...', 0);
      await this.cleanup();

      // Enable quick mode
      demoVideoService.setQuickMode(true);

      // Pre-generate all videos
      this.updateStatus('Generating perfect video...', 0.2);
      await demoVideoService.generateVideo('perfect');

      this.updateStatus('Generating landscape video...', 0.4);
      await demoVideoService.generateVideo('landscape');

      this.updateStatus('Generating oversized video...', 0.6);
      await demoVideoService.generateVideo('oversized');

      this.updateStatus('Generating network test video...', 0.8);
      await demoVideoService.generateVideo('network_error');

      // Verify cache state
      this.updateStatus('Verifying cache state...', 0.9);
      await this.verifyCacheState();

      this.updateStatus('Demo preparation complete!', 1);
      this.isPrepped = true;

      return {
        status: 'success',
        message: 'All demo videos prepared and cached'
      };
    } catch (error) {
      console.error('Demo preparation failed:', error);
      this.isPrepped = false;
      throw new Error(`Failed to prepare demo: ${error.message}`);
    }
  }

  /**
   * Verify all required cache files exist
   */
  async verifyCacheState() {
    const requiredVideos = ['perfect', 'landscape', 'oversized', 'network_error'];
    const cacheDir = `${RNFS.CachesDirectoryPath}/DemoVideos`;

    for (const type of requiredVideos) {
      const cachePath = `${cacheDir}/${type}_cache.json`;
      const exists = await RNFS.exists(cachePath);
      if (!exists) {
        throw new Error(`Cache missing for ${type}`);
      }
    }
  }

  /**
   * Clean up all demo files and reset state
   */
  async cleanup() {
    await demoVideoService.cleanup();
    this.isPrepped = false;
    this.prepProgress = 0;
  }

  /**
   * Check if demo is ready for recording
   */
  async checkReadiness() {
    if (!this.isPrepped) {
      return {
        ready: false,
        message: 'Demo not prepared. Run preparation first.'
      };
    }

    try {
      await this.verifyCacheState();
      return {
        ready: true,
        message: 'Demo ready for recording'
      };
    } catch (error) {
      return {
        ready: false,
        message: `Demo not ready: ${error.message}`
      };
    }
  }

  /**
   * Get current preparation progress
   */
  getProgress() {
    return {
      isPrepped: this.isPrepped,
      progress: this.prepProgress
    };
  }
}

export const demoPrepService = new DemoPreparationService(); 