import { videoService } from '../../src/services/video';
import { createVideoFile } from '../../test/helpers/video';
import { auth } from '../../src/config/firebase';
import { execSync } from 'child_process';

// Assignment requirements
const REQUIREMENTS = {
  TIMING: {
    IMPORT: 3000,
    PREVIEW: 3000,
    RECOVERY: 1000
  },
  INTEGRATIONS: [
    'firebase',
    'openshot'
  ],
  FEATURES: [
    'import',
    'preview',
    'error_handling'
  ]
};

describe('Merge Verification', () => {
  let testFile;

  beforeAll(async () => {
    // Clean environment
    console.log('🧹 Cleaning test environment...');
    execSync('make test.clean');
    
    // Setup fresh environment
    console.log('🔧 Setting up test environment...');
    execSync('make test.setup');
    
    // Wait for services
    console.log('⏳ Waiting for services...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    testFile = createVideoFile.portrait();
  });

  // 1. Environment Verification
  describe('Environment Check', () => {
    it('has required environment variables', () => {
      const required = [
        'FIREBASE_EMULATOR_HOST',
        'OPENSHOT_API_URL',
        'FIREBASE_CONFIG',
        'OPENSHOT_TOKEN'
      ];

      required.forEach(env => {
        expect(process.env[env]).toBeDefined();
        console.log(`✅ ${env} configured`);
      });
    });

    it('has clean test environment', async () => {
      const stats = videoService.getPerformanceStats();
      expect(stats.warnings).toEqual({
        validation: 0,
        upload: 0,
        recovery: 0,
        preview: 0
      });
      console.log('✅ Performance counters clean');
    });
  });

  // 2. Integration Verification
  describe('Integration Check', () => {
    it('connects to Firebase Storage', async () => {
      const result = await videoService.importVideo(testFile);
      
      expect(result.status).toBe('success');
      expect(result.data.uri).toMatch(/firebasestorage\.googleapis\.com/);
      console.log('✅ Firebase Storage working');
    });

    it('connects to OpenShot API', async () => {
      const imported = await videoService.importVideo(testFile);
      const preview = await videoService.getVideoPreview(imported.data.id);
      
      expect(['processing', 'success']).toContain(preview.status);
      console.log('✅ OpenShot API working');
    });
  });

  // 3. Performance Verification
  describe('Performance Check', () => {
    it('meets import timing requirement', async () => {
      const start = Date.now();
      
      const result = await videoService.importVideo(testFile);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(REQUIREMENTS.TIMING.IMPORT);
      console.log(`✅ Import completed in ${duration}ms`);
    });

    it('meets preview timing requirement', async () => {
      const imported = await videoService.importVideo(testFile);
      
      const start = Date.now();
      const preview = await videoService.getVideoPreview(imported.data.id);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(REQUIREMENTS.TIMING.PREVIEW);
      console.log(`✅ Preview loaded in ${duration}ms`);
    });

    it('meets error recovery requirement', async () => {
      const testFile = createVideoFile.invalid();
      const start = Date.now();
      
      const result = await videoService.importVideo(testFile);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(REQUIREMENTS.TIMING.RECOVERY);
      console.log(`✅ Error handled in ${duration}ms`);
    });
  });

  // 4. Feature Verification
  describe('Feature Check', () => {
    it('supports all required features', async () => {
      // Import flow
      const imported = await videoService.importVideo(testFile);
      expect(imported.status).toBe('success');
      console.log('✅ Import flow working');

      // Preview flow
      const preview = await videoService.getVideoPreview(imported.data.id);
      expect(['processing', 'success']).toContain(preview.status);
      console.log('✅ Preview flow working');

      // Error handling
      const invalidFile = createVideoFile.invalid();
      const error = await videoService.importVideo(invalidFile);
      expect(error.status).toBe('error');
      expect(error.error.recoverable).toBeDefined();
      expect(error.error.hint).toBeDefined();
      console.log('✅ Error handling working');
    });
  });

  // 5. Final Verification
  describe('Merge Readiness', () => {
    it('verifies merge readiness', async () => {
      const result = await videoService.verifyMergeReadiness(testFile);
      
      // Must succeed
      expect(result.status).toBe('success');
      
      // Timing must pass
      expect(result.timing.import).toBe(true);
      expect(result.timing.preview).toBe(true);
      expect(result.timing.error).toBe(true);
      
      // No performance warnings
      expect(Object.values(result.stats.warnings)).toEqual([0, 0, 0, 0]);
      
      // Services must be running
      expect(result.stats.environment.firebase).toBe('running');
      expect(result.stats.environment.openshot).toBe('configured');
    });

    it('provides detailed error on failure', async () => {
      // Force a timing failure with large file
      const largeFile = createVideoFile.oversized();
      const result = await videoService.verifyMergeReadiness(largeFile);
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.stats).toBeDefined();
    });
  });
}); 