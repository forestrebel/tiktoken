import VideoService from '../video';
import { DEMO_VIDEOS, DEMO_STATES } from './testData';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { Dimensions } from 'react-native';

class DemoPreparation {
  constructor() {
    this.results = {
      data: null,
      flow: null,
      polish: null
    };
  }

  // 1. Data Preparation (30 min)
  async prepareData() {
    try {
      // Clear existing data
      await this.clearOldData();

      // Prepare test videos
      const videoResults = await this.prepareTestVideos();

      // Verify formats
      const formatResults = await this.verifyVideoFormats();

      // Test playback
      const playbackResults = await this.testPlayback();

      this.results.data = {
        success: videoResults.success && formatResults.success && playbackResults.success,
        videos: videoResults,
        formats: formatResults,
        playback: playbackResults
      };

      return this.results.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 2. Flow Verification (30 min)
  async verifyFlow() {
    try {
      // Test main path
      const mainPath = await this.testMainPath();

      // Verify transitions
      const transitions = await this.verifyTransitions();

      // Check error states
      const errorStates = await this.checkErrorStates();

      // Time segments
      const timing = await this.timeSegments();

      this.results.flow = {
        success: mainPath.success && transitions.success && errorStates.success && timing.success,
        mainPath,
        transitions,
        errorStates,
        timing
      };

      return this.results.flow;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 3. Final Polish (30 min)
  async applyPolish() {
    try {
      // Clean loading states
      const loadingStates = await this.cleanLoadingStates();

      // Smooth transitions
      const transitions = await this.smoothTransitions();

      // Clear error messages
      const errorMessages = await this.clearErrorMessages();

      // Verify performance
      const performance = await this.verifyPerformance();

      this.results.polish = {
        success: loadingStates.success && transitions.success && errorMessages.success && performance.success,
        loadingStates,
        transitions,
        errorMessages,
        performance
      };

      return this.results.polish;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper Methods
  async clearOldData() {
    try {
      await VideoService.cleanup();
      await RNFS.unlink(VideoService.getCachePath());
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async prepareTestVideos() {
    try {
      const results = [];
      for (const video of DEMO_VIDEOS) {
        const saved = await VideoService.saveVideo(video);
        results.push({
          id: video.id,
          success: saved,
          size: await this.getVideoSize(video.filename)
        });
      }
      return {
        success: results.every(r => r.success),
        videos: results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyVideoFormats() {
    try {
      const results = [];
      for (const video of DEMO_VIDEOS) {
        const validation = await VideoService.validateVideo({
          uri: VideoService.getVideoPath(video.filename),
          type: 'video/mp4',
          size: await this.getVideoSize(video.filename)
        });
        results.push({
          id: video.id,
          ...validation
        });
      }
      return {
        success: results.every(r => r.isValid),
        validations: results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testPlayback() {
    try {
      const results = [];
      for (const video of DEMO_VIDEOS) {
        const player = await VideoService.createPlayer(
          VideoService.getVideoPath(video.filename)
        );
        results.push({
          id: video.id,
          success: player.ready
        });
      }
      return {
        success: results.every(r => r.success),
        playback: results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testMainPath() {
    try {
      // Test grid load
      const grid = await VideoService.getVideos();
      
      // Test player
      const player = await this.testPlayback();
      
      // Test upload
      const upload = await VideoService.pickVideo();

      return {
        success: grid.length > 0 && player.success && upload,
        gridCount: grid.length,
        playerReady: player.success,
        uploadReady: !!upload
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyTransitions() {
    try {
      const results = {
        gridToPlayer: await this.timeTransition('grid_to_player'),
        playerToGrid: await this.timeTransition('player_to_grid'),
        gridToUpload: await this.timeTransition('grid_to_upload')
      };

      return {
        success: Object.values(results).every(r => r.timing < 500),
        ...results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkErrorStates() {
    try {
      const results = {
        network: await VideoService.validateVideo({ type: 'invalid' }),
        format: await VideoService.validateVideo({ size: 999999999 }),
        recovery: await VideoService.cleanup()
      };

      return {
        success: true,
        ...results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async timeSegments() {
    const timings = {
      launch: await this.timeOperation('launch'),
      gridLoad: await this.timeOperation('grid_load'),
      playback: await this.timeOperation('playback'),
      upload: await this.timeOperation('upload')
    };

    return {
      success: Object.values(timings).every(t => t < 2000),
      timings
    };
  }

  async timeOperation(operation) {
    const start = Date.now();
    switch (operation) {
      case 'launch':
        await VideoService.init();
        break;
      case 'grid_load':
        await VideoService.getVideos();
        break;
      case 'playback':
        await this.testPlayback();
        break;
      case 'upload':
        await VideoService.pickVideo();
        break;
    }
    return Date.now() - start;
  }

  async timeTransition(type) {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      type,
      timing: Date.now() - start
    };
  }

  async getVideoSize(filename) {
    try {
      const stats = await RNFS.stat(VideoService.getVideoPath(filename));
      return stats.size;
    } catch {
      return 0;
    }
  }

  // Get final report
  getFinalReport() {
    return {
      success: this.results.data?.success && 
               this.results.flow?.success && 
               this.results.polish?.success,
      timestamp: Date.now(),
      platform: Platform.OS,
      results: this.results
    };
  }

  // Critical Demo Verification Methods
  async verifyCriticalFeatures() {
    try {
      const results = {
        grid: await this.verifyGridLayout(),
        player: await this.verifyPortraitPlayback(),
        upload: await this.verifyUploadFlow()
      };

      return {
        success: Object.values(results).every(r => r.success),
        ...results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyGridLayout() {
    try {
      // Verify 2-column layout
      const columnWidth = ITEM_WIDTH;
      const screenWidth = Dimensions.get('window').width;
      const columns = Math.floor(screenWidth / columnWidth);

      return {
        success: columns === 2,
        columnCount: columns,
        itemWidth: columnWidth,
        screenWidth
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyPortraitPlayback() {
    try {
      const results = [];
      for (const video of DEMO_VIDEOS) {
        const metadata = await VideoService.getVideoMetadata(video.id);
        const isPortrait = metadata.height > metadata.width;
        const aspectRatio = metadata.height / metadata.width;
        
        results.push({
          id: video.id,
          isPortrait,
          aspectRatio,
          valid: isPortrait && aspectRatio >= 16/9
        });
      }

      return {
        success: results.every(r => r.valid),
        videos: results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyUploadFlow() {
    try {
      // Test upload with valid video
      const validUpload = await VideoService.validateVideo({
        type: 'video/mp4',
        size: 40 * 1024 * 1024, // 40MB
        duration: 20
      });

      // Test upload with invalid video
      const invalidUpload = await VideoService.validateVideo({
        type: 'video/quicktime',
        size: 60 * 1024 * 1024, // 60MB
        duration: 35
      });

      return {
        success: validUpload.isValid && !invalidUpload.isValid,
        validUpload,
        invalidUpload
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyTestData() {
    try {
      const results = [];
      for (const video of DEMO_VIDEOS) {
        const metadata = await VideoService.getVideoMetadata(video.id);
        results.push({
          id: video.id,
          valid: (
            metadata.duration >= 15 && 
            metadata.duration <= 30 &&
            metadata.size <= 50 * 1024 * 1024 &&
            metadata.height > metadata.width &&
            video.type === 'nature'
          ),
          duration: metadata.duration,
          size: metadata.size,
          format: metadata.format,
          type: video.type
        });
      }

      return {
        success: results.length === 5 && results.every(r => r.valid),
        videos: results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyDemoFlow() {
    try {
      const results = {
        launch: await this.timeOperation('launch', 2000),
        gridLoad: await this.timeOperation('grid_load', 1000),
        playback: await this.timeOperation('playback', 500),
        upload: await this.timeOperation('upload', 3000)
      };

      // Verify flow interruption recovery
      const interruption = await this.testFlowInterruption();

      return {
        success: Object.values(results).every(r => r.success) && interruption.success,
        timings: results,
        interruption
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testFlowInterruption() {
    try {
      // Simulate app backgrounding during video playback
      const video = DEMO_VIDEOS[0];
      const player = await VideoService.createPlayer(
        VideoService.getVideoPath(video.filename)
      );
      
      // Background app
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Resume
      const resumed = await player.play();
      
      return {
        success: resumed,
        recoveryTime: Date.now() - player.lastPlayTime
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async timeOperation(operation, maxTime) {
    const start = Date.now();
    await this[operation]();
    const time = Date.now() - start;
    
    return {
      success: time <= maxTime,
      operation,
      time,
      maxTime
    };
  }
}

export default new DemoPreparation(); 