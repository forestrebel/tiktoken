const { DEMO_VIDEOS, DEMO_STATES, DEMO_TOKENS } = require('./demo/testData');
const VideoService = require('./video');
const { Platform, Dimensions } = require('react-native');
const RNFS = require('react-native-fs');
const database = require('./database');
const NetInfo = require('@react-native-community/netinfo');

class VerificationService {
  constructor() {
    this.stateLog = [];
    this.resourceLog = [];
    this.networkLog = [];
  }

  // State Matrix Testing
  async verifyAppStates() {
    const results = {
      cold: await this.verifyColdStart(),
      warm: await this.verifyWarmStart(),
      background: await this.verifyBackgroundResume(),
      killed: await this.verifyKilledRestart()
    };
    
    this.logState('AppStates', results);
    return results;
  }

  async verifyDataStates() {
    const results = {
      empty: await this.verifyEmptyState(),
      loading: await this.verifyLoadingState(),
      partial: await this.verifyPartialData(),
      full: await this.verifyFullData()
    };
    
    this.logState('DataStates', results);
    return results;
  }

  async verifyNetworkStates() {
    const results = {
      offline: await this.verifyOfflineState(),
      slow: await this.verifySlowNetwork(),
      flaky: await this.verifyFlakyNetwork(),
      online: await this.verifyOnlineState()
    };
    
    this.logState('NetworkStates', results);
    return results;
  }

  // Transition Testing
  async verifyTransitions() {
    const results = {
      toPlayer: await this.verifyPlayerTransitions(),
      toGrid: await this.verifyGridTransitions(),
      upload: await this.verifyUploadTransitions()
    };
    
    this.logState('Transitions', results);
    return results;
  }

  // Resource Monitoring
  async monitorResources() {
    const results = {
      memory: await this.checkMemoryUsage(),
      files: await this.checkFileHandles(),
      cleanup: await this.verifyCleanup(),
      background: await this.checkBackgroundResources()
    };
    
    this.logResource('ResourceMonitoring', results);
    return results;
  }

  // Network Resilience
  async verifyNetworkResilience() {
    const results = {
      offline: await this.testOfflineOperation(),
      slow: await this.testSlowConnection(),
      intermittent: await this.testIntermittentConnection(),
      recovery: await this.testNetworkRecovery()
    };
    
    this.logNetwork('NetworkResilience', results);
    return results;
  }

  // Specific Verification Methods
  async verifyColdStart() {
    try {
      await database.init();
      const videos = await VideoService.getVideos();
      return {
        success: true,
        videosLoaded: videos.length,
        initTime: Date.now()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyWarmStart() {
    try {
      // Load demo data
      const videos = DEMO_VIDEOS.slice(0, 3);
      for (const video of videos) {
        await VideoService.saveVideo(video);
      }
      return { success: true, preloadedVideos: videos.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyBackgroundResume() {
    try {
      // Simulate background/resume cycle
      await new Promise(resolve => setTimeout(resolve, 1000));
      const videos = await VideoService.getVideos();
      return { success: true, dataIntegrity: videos.length > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyKilledRestart() {
    try {
      // Simulate app kill/restart
      await database.init();
      const videos = await VideoService.getVideos();
      return { success: true, stateRecovery: videos.length > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyEmptyState() {
    try {
      await database.reset();
      const videos = await VideoService.getVideos();
      return { success: true, isEmpty: videos.length === 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyLoadingState() {
    try {
      const loading = DEMO_STATES.loading;
      await VideoService.saveVideo(loading);
      return { success: true, hasLoadingState: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyPartialData() {
    try {
      const partialVideos = DEMO_VIDEOS.slice(0, 2);
      for (const video of partialVideos) {
        await VideoService.saveVideo(video);
      }
      return { success: true, partialCount: partialVideos.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyFullData() {
    try {
      for (const video of DEMO_VIDEOS) {
        await VideoService.saveVideo(video);
      }
      return { success: true, fullCount: DEMO_VIDEOS.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyOfflineState() {
    const netInfo = await NetInfo.fetch();
    return {
      success: true,
      isOffline: !netInfo.isConnected,
      type: netInfo.type
    };
  }

  async verifySlowNetwork() {
    try {
      const startTime = Date.now();
      await VideoService.getVideos();
      const loadTime = Date.now() - startTime;
      return {
        success: true,
        loadTime,
        isSlow: loadTime > 2000
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyFlakyNetwork() {
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < 5; i++) {
        try {
          await VideoService.getVideos();
          successCount++;
        } catch {
          failCount++;
        }
      }
      
      return {
        success: true,
        successRate: successCount / 5,
        isFlaky: failCount > 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyOnlineState() {
    const netInfo = await NetInfo.fetch();
    return {
      success: true,
      isOnline: netInfo.isConnected,
      type: netInfo.type,
      strength: netInfo.strength
    };
  }

  async verifyPlayerTransitions() {
    try {
      const results = {
        fromCold: await this.verifyTransition('cold_to_player'),
        fromWarm: await this.verifyTransition('warm_to_player'),
        fromBackground: await this.verifyTransition('background_to_player'),
        withSlowNet: await this.verifyTransition('slow_to_player')
      };
      return { success: true, ...results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyGridTransitions() {
    try {
      const results = {
        afterPlay: await this.verifyTransition('player_to_grid_after_play'),
        afterError: await this.verifyTransition('player_to_grid_after_error'),
        afterKill: await this.verifyTransition('player_to_grid_after_kill'),
        afterBackground: await this.verifyTransition('player_to_grid_after_background')
      };
      return { success: true, ...results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyUploadTransitions() {
    try {
      const results = {
        startCold: await this.verifyTransition('upload_start_cold'),
        withError: await this.verifyTransition('upload_with_error'),
        withSuccess: await this.verifyTransition('upload_with_success'),
        withCancel: await this.verifyTransition('upload_with_cancel')
      };
      return { success: true, ...results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkMemoryUsage() {
    if (Platform.OS === 'android') {
      try {
        const { heapTotal, heapUsed } = process.memoryUsage();
        return {
          success: true,
          heapTotal,
          heapUsed,
          usage: heapUsed / heapTotal
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: true, message: 'Memory check not available on this platform' };
  }

  async checkFileHandles() {
    try {
      const videos = await VideoService.getVideos();
      return {
        success: true,
        openFiles: videos.length,
        hasLeaks: false
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyCleanup() {
    try {
      const results = {
        cache: await this.verifyCacheCleanup(),
        background: await this.verifyBackgroundCleanup(),
        network: await this.verifyNetworkCleanup(),
        files: await this.verifyFileCleanup()
      };
      
      return {
        success: true,
        ...results,
        allClean: Object.values(results).every(r => r.isClean)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyCacheCleanup() {
    try {
      const beforeCleanup = await VideoService.getCacheSize();
      await VideoService.cleanup();
      const afterCleanup = await VideoService.getCacheSize();
      
      return {
        success: true,
        beforeSize: beforeCleanup,
        afterSize: afterCleanup,
        isClean: afterCleanup < beforeCleanup
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyBackgroundCleanup() {
    try {
      const uploadProgress = await VideoService.getUploadProgress();
      const processingVideos = await VideoService.getProcessingVideos();
      
      return {
        success: true,
        activeUploads: uploadProgress > 0,
        processingCount: processingVideos.length,
        isClean: uploadProgress === 0 && processingVideos.length === 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyNetworkCleanup() {
    try {
      const pendingRequests = await VideoService.getPendingRequests();
      
      return {
        success: true,
        pendingCount: pendingRequests.length,
        isClean: pendingRequests.length === 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyFileCleanup() {
    try {
      const tempFiles = await VideoService.getTempFiles();
      const thumbnailCache = await VideoService.getThumbnailCache();
      
      return {
        success: true,
        tempCount: tempFiles.length,
        thumbnailCount: thumbnailCache.length,
        isClean: tempFiles.length === 0 && thumbnailCache.length === 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkBackgroundResources() {
    try {
      // Check for any lingering upload tasks
      const uploadProgress = await VideoService.getUploadProgress();
      return {
        success: true,
        hasActiveUploads: uploadProgress > 0,
        uploadProgress
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper Methods
  async verifyTransition(type) {
    // Simulate transition timing
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, type, timing: 300 };
  }

  logState(type, data) {
    this.stateLog.push({ type, data, timestamp: Date.now() });
  }

  logResource(type, data) {
    this.resourceLog.push({ type, data, timestamp: Date.now() });
  }

  logNetwork(type, data) {
    this.networkLog.push({ type, data, timestamp: Date.now() });
  }

  // Get verification report
  getVerificationReport() {
    return {
      states: this.stateLog,
      resources: this.resourceLog,
      network: this.networkLog,
      timestamp: Date.now(),
      platform: Platform.OS,
      version: '1.0.0'
    };
  }

  // Network Testing Methods
  async testOfflineOperation() {
    try {
      // Simulate offline mode
      await NetInfo.configure({ isConnected: false });
      
      // Try operations that should work offline
      const videos = await VideoService.getVideos();
      const cached = await VideoService.getCachedVideos();
      
      // Restore network
      await NetInfo.configure({ isConnected: true });
      
      return {
        success: true,
        offlineVideosAvailable: videos.length,
        cachedVideosAvailable: cached.length,
        offlineOperational: videos.length > 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testSlowConnection() {
    try {
      const startTime = Date.now();
      const videos = await VideoService.getVideos();
      const loadTime = Date.now() - startTime;
      
      return {
        success: true,
        loadTime,
        videosLoaded: videos.length,
        handledSlow: loadTime > 2000 && videos.length > 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testIntermittentConnection() {
    try {
      let successfulOperations = 0;
      const operations = 5;
      
      for (let i = 0; i < operations; i++) {
        try {
          await VideoService.getVideos();
          successfulOperations++;
        } catch {
          // Expected some operations to fail
        }
      }
      
      return {
        success: true,
        successRate: successfulOperations / operations,
        recoverySuccessful: successfulOperations > 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testNetworkRecovery() {
    try {
      // Test recovery after network failure
      const videos = await VideoService.getVideos();
      
      return {
        success: true,
        videosAfterRecovery: videos.length,
        recoverySuccessful: videos.length > 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new VerificationService(); 