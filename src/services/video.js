import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../config/firebase';
import { OpenShotService } from './openshot';
import RNFS from 'react-native-fs';
import { execSync } from 'child_process';
import { ErrorMessages } from './quality/messages';
import { validateNatureVideo, TIMING, checkPerformance } from './quality/validation';

// Environment checks
const REQUIRED_ENV = {
  FIREBASE_EMULATOR_HOST: 'Firebase emulator not running. Run make test.setup',
  OPENSHOT_API_URL: 'OpenShot API not configured. Run make test.setup',
  FIREBASE_CONFIG: 'Firebase config missing. Run make test.setup',
  OPENSHOT_TOKEN: 'OpenShot token missing. Run make test.setup'
};

// Video constraints
const VIDEO_CONSTRAINTS = {
  maxSizeMB: 100,
  dimensions: {
    width: 720,
    height: 1280
  },
  format: 'video/mp4'
};

export class VideoService {
  constructor() {
    this.storage = getStorage();
    this.openshot = OpenShotService;
    this.cacheDir = `${RNFS.CachesDirectoryPath}/Videos`;
    this.ensureCacheDir();
    
    // Performance monitoring
    this.performanceWarnings = {
      validation: 0,
      upload: 0,
      recovery: 0,
      preview: 0
    };

    // Verify on init
    this.verifyIntegrations();
  }

  async ensureCacheDir() {
    try {
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }
    } catch (error) {
      console.warn('Failed to create cache directory:', error);
    }
  }

  // Environment protection
  ensureEnvironment() {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Check required environment variables
    Object.entries(REQUIRED_ENV).forEach(([env, message]) => {
      if (!process.env[env]) {
        console.error(`Environment Error: ${message}`);
        console.error('Run make test.clean test.setup to reset environment');
        throw new Error(`Missing ${env}`);
      }
    });

    // Verify emulator in development
    if (process.env.NODE_ENV === 'development') {
      this.verifyEmulator().catch(error => {
        console.error('Emulator Error:', error.message);
        console.error('Run make emu.restart to reset emulator');
        throw error;
      });
    }
  }

  async verifyEmulator() {
    try {
      const response = await fetch(process.env.FIREBASE_EMULATOR_HOST);
      if (!response.ok) {
        throw new Error('Firebase emulator not responding');
      }
    } catch (error) {
      throw new Error('Firebase emulator not running');
    }
  }

  // Performance check helper
  checkPerformance(operation, start, target) {
    const duration = Date.now() - start;
    if (duration > target) {
      this.performanceWarnings[operation]++;
      console.warn(
        `Performance warning: ${operation} took ${duration}ms (target: ${target}ms). ` +
        `Warning count: ${this.performanceWarnings[operation]}`
      );
    }
    return duration;
  }

  // Video validation helper
  async validateVideo(file) {
    const start = Date.now();
    try {
      // Quick checks first (should be < 10ms)
      if (!file || !file.type) {
        return { valid: false, error: new Error('Invalid file') };
      }

      // Format check (should be < 20ms)
      if (file.type !== VIDEO_CONSTRAINTS.format) {
        return { valid: false, error: new Error('Only MP4 videos are supported') };
      }

      // Size check (should be < 20ms)
      if (file.size > VIDEO_CONSTRAINTS.maxSizeMB * 1024 * 1024) {
        return { valid: false, error: new Error('Video must be under 100MB') };
      }

      // Verify file exists (should be < 50ms)
      const exists = await RNFS.exists(file.uri);
      if (!exists) {
        return { valid: false, error: new Error('File not found') };
      }

      this.checkPerformance('validation', start, TIMING.VALIDATION);
      return { valid: true };
    } catch (error) {
      this.checkPerformance('validation', start, TIMING.VALIDATION);
      return { valid: false, error };
    }
  }

  async importVideo(file) {
    const start = Date.now();
    try {
      // Fast validation (target: 100ms)
      const validation = await validateNatureVideo(file);
      if (!validation.valid) {
        return {
          status: 'error',
          error: {
            message: ErrorMessages[validation.errorType].friendly,
            action: ErrorMessages[validation.errorType].actionable
          }
        };
      }

      // Auth check (should be instant)
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return {
          status: 'error',
          error: {
            message: ErrorMessages.AUTH_ERROR.friendly,
            action: ErrorMessages.AUTH_ERROR.actionable
          }
        };
      }

      // Prepare upload
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
      const storageRef = ref(this.storage, `users/${userId}/videos/${fileName}`);
      
      // Read file and prepare metadata in parallel
      const [content, metadata] = await Promise.all([
        RNFS.readFile(file.uri, 'base64'),
        {
          contentType: 'video/mp4',
          customMetadata: { userId }
        }
      ]);

      // Upload to Firebase (target: 2s)
      const blob = Buffer.from(content, 'base64');
      await uploadBytes(storageRef, blob, metadata);
      const downloadUrl = await getDownloadURL(storageRef);

      const duration = checkPerformance('upload', start, TIMING.UPLOAD);
      return {
        status: 'success',
        data: {
          uri: downloadUrl,
          duration
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: {
          message: ErrorMessages.UNKNOWN.friendly,
          action: ErrorMessages.UNKNOWN.actionable
        }
      };
    }
  }

  async getVideoPreview(videoId) {
    const start = Date.now();
    try {
      // Get video URL
      const url = await getDownloadURL(ref(this.storage, `users/${auth.currentUser?.uid}/videos/${videoId}`));
      
      const duration = checkPerformance('preview', start, TIMING.PREVIEW);
      return {
        status: 'success',
        data: {
          uri: url,
          duration
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: {
          message: ErrorMessages.PROCESSING_FAILED.friendly,
          action: ErrorMessages.PROCESSING_FAILED.actionable
        }
      };
    }
  }

  async handleError(error, code = 'unknown') {
    const start = Date.now();
    
    // Fast error categorization (should be < 50ms)
    const errorTypes = {
      invalid_file: { recoverable: true, hint: 'Select a valid video file' },
      invalid_format: { recoverable: true, hint: 'Select an MP4 video' },
      file_too_large: { recoverable: true, hint: 'Video must be under 100MB' },
      network_error: { recoverable: true, hint: 'Check your connection' },
      auth_error: { recoverable: false, hint: 'Please log in again' },
      processing_failed: { recoverable: true, hint: 'Try processing again' },
      unknown: { recoverable: true, hint: 'Please try again' }
    };

    // Extract error code (should be < 10ms)
    if (error.code) {
      if (error.code.includes('storage/')) {
        code = error.code.replace('storage/', '');
      } else if (error.code.includes('openshot/')) {
        code = error.code.replace('openshot/', '');
      }
    }

    const errorInfo = errorTypes[code] || errorTypes.unknown;
    const duration = this.checkPerformance('recovery', start, TIMING.RECOVERY);

    return {
      status: 'error',
      error: {
        code,
        message: error.message || 'An unexpected error occurred',
        recoverable: errorInfo.recoverable,
        hint: errorInfo.hint,
        duration
      }
    };
  }

  async generateThumbnail(videoId) {
    try {
      const thumbnailPath = `${this.cacheDir}/${videoId}_thumb.jpg`;
      
      // Fast thumbnail generation (target: 1s)
      const start = Date.now();
      const thumbnail = await this.openshot.generateThumbnail(videoId, {
        width: 320,
        height: 180,
        time: 1
      });

      await RNFS.writeFile(thumbnailPath, thumbnail, 'base64');
      this.checkPerformance('preview', start, 1000);

      return {
        status: 'success',
        path: thumbnailPath
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Performance monitoring
  getPerformanceStats() {
    return {
      warnings: this.performanceWarnings,
      thresholds: TIMING,
      environment: {
        firebase: process.env.FIREBASE_EMULATOR_HOST ? 'running' : 'not running',
        openshot: process.env.OPENSHOT_API_URL ? 'configured' : 'not configured'
      },
      integrations: {
        firebase: auth.app ? 'connected' : 'disconnected',
        openshot: this.openshot ? 'connected' : 'disconnected'
      }
    };
  }

  // Test helpers
  async cleanup() {
    try {
      const files = await RNFS.readDir(this.cacheDir);
      await Promise.all(files.map(file => RNFS.unlink(file.path)));
      this.performanceWarnings = {
        validation: 0,
        upload: 0,
        recovery: 0,
        preview: 0
      };
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }

  // Integration verification
  async verifyIntegrations() {
    try {
      // 1. Environment check
      Object.entries(REQUIRED_ENV).forEach(([env, message]) => {
        if (!process.env[env]) {
          console.error(`Environment Error: ${message}`);
          console.error('Run make test.clean test.setup to reset environment');
          throw new Error(`Missing ${env}`);
        }
      });

      // 2. Firebase check
      if (process.env.NODE_ENV !== 'test') {
        const app = auth.app;
        if (!app) {
          throw new Error('Firebase not initialized');
        }
        console.log('✅ Firebase configured');
      }

      // 3. OpenShot check
      if (process.env.NODE_ENV !== 'test') {
        await this.openshot.getProjects();
        console.log('✅ OpenShot connected');
      }

      return true;
    } catch (error) {
      console.error('Integration Error:', error.message);
      console.error('Run make test.clean test.setup to reset environment');
      throw error;
    }
  }

  // Merge verification
  async verifyForMerge() {
    console.log('🔍 Checking integrations...');
    
    // 1. Firebase Check
    try {
      const testRef = this.storage.ref('merge-test.txt');
      await testRef.putString('merge test');
      await testRef.delete();
      console.log('✅ Firebase working');
    } catch (e) {
      throw new Error(`Firebase failed: ${e.message}`);
    }
    
    // 2. OpenShot Check
    try {
      const projects = await this.openshot.getProjects();
      console.log('✅ OpenShot working');
    } catch (e) {
      throw new Error(`OpenShot failed: ${e.message}`);
    }
  }

  // Timing verification
  async verifyTiming(testFile) {
    console.log('⏱️ Checking timing...');
    
    // 1. Import (3s)
    const importStart = Date.now();
    const result = await this.importVideo(testFile);
    const importTime = Date.now() - importStart;
    console.log(`Import: ${importTime}ms / 3000ms`);
    
    // 2. Preview (3s)
    const previewStart = Date.now();
    const preview = await this.getVideoPreview(result.data.id);
    const previewTime = Date.now() - previewStart;
    console.log(`Preview: ${previewTime}ms / 3000ms`);
    
    // 3. Error (1s)
    const errorStart = Date.now();
    const error = await this.handleError(new Error('test'));
    const errorTime = Date.now() - errorStart;
    console.log(`Error: ${errorTime}ms / 1000ms`);
    
    return {
      import: importTime < 3000,
      preview: previewTime < 3000,
      error: errorTime < 1000
    };
  }

  // Full merge verification
  async verifyMergeReadiness(testFile) {
    try {
      // 1. Clean environment
      console.log('🧹 Cleaning environment...');
      execSync('make test.clean test.setup');
      console.log('✅ Environment ready');
      
      // 2. Check integrations
      await this.verifyForMerge();
      console.log('✅ Integrations working');
      
      // 3. Check timing
      const timing = await this.verifyTiming(testFile);
      if (!Object.values(timing).every(t => t)) {
        throw new Error('Timing requirements not met');
      }
      console.log('✅ Timing requirements met');

      // 4. Check performance stats
      const stats = this.getPerformanceStats();
      if (Object.values(stats.warnings).some(w => w > 0)) {
        throw new Error('Performance warnings detected');
      }
      console.log('✅ No performance warnings');
      
      return {
        status: 'success',
        timing,
        stats
      };
    } catch (e) {
      console.error('❌ Merge verification failed:', e.message);
      return {
        status: 'error',
        error: e.message,
        timing: null,
        stats: this.getPerformanceStats()
      };
    }
  }
}

export const videoService = new VideoService(); 