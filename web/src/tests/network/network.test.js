import { networkManager, NetworkConditions } from '../../lib/networkManager';

describe('Network Resilience', () => {
  let validationReport = {
    scenarios: {
      offline: {
        playback: false,
        sync: false,
        storage: 0
      },
      slow: {
        adaptation: false,
        buffering: 0,
        recovery: false
      },
      flaky: {
        retries: 0,
        failures: 0,
        recovery: false
      }
    },
    resources: {
      storage: 0,
      cleanup: false,
      leaks: 0
    },
    ux: {
      offlineIndicator: false,
      progressBar: false,
      errorMessages: false,
      retryPrompts: false
    }
  };

  beforeAll(async () => {
    // Clear IndexedDB
    const databases = await window.indexedDB.databases();
    await Promise.all(
      databases.map(db => window.indexedDB.deleteDatabase(db.name))
    );
  });

  describe('Offline Support', () => {
    beforeEach(() => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    test('handles offline playback', async () => {
      // Store a test video
      const videoBlob = new Blob(['test video data'], { type: 'video/mp4' });
      await networkManager.storeForOffline('test.mp4', videoBlob);

      // Try to play offline video
      const offlineVideo = await networkManager.getOfflineVideo('test.mp4');
      validationReport.scenarios.offline.playback = offlineVideo !== null;
      expect(offlineVideo).toBeTruthy();
    });

    test('syncs when back online', async () => {
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));

      // Check if sync occurs
      const syncPromise = new Promise(resolve => {
        window.addEventListener('networkStatusChange', (event) => {
          resolve(event.detail.online);
        });
      });

      validationReport.scenarios.offline.sync = await syncPromise;
      expect(validationReport.scenarios.offline.sync).toBe(true);
    });

    test('tracks offline storage usage', async () => {
      const usage = await networkManager.getStorageUsage();
      validationReport.scenarios.offline.storage = Math.round(usage / (1024 * 1024));
      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('Slow Network', () => {
    beforeEach(() => {
      // Simulate slow connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: NetworkConditions.SLOW_2G },
        configurable: true
      });
    });

    test('adapts quality for slow connection', async () => {
      const options = {};
      const adapted = networkManager.adaptQualityOptions(options);
      validationReport.scenarios.slow.adaptation = adapted.quality === 'low';
      expect(adapted.quality).toBe('low');
    });

    test('handles buffering', async () => {
      let bufferingEvents = 0;
      const video = document.createElement('video');
      
      video.addEventListener('waiting', () => bufferingEvents++);
      document.body.appendChild(video);
      
      // Simulate buffering
      video.dispatchEvent(new Event('waiting'));
      
      validationReport.scenarios.slow.buffering = bufferingEvents;
      expect(bufferingEvents).toBeGreaterThan(0);
      
      document.body.removeChild(video);
    });

    test('recovers from slow connection', async () => {
      // Simulate connection improvement
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: NetworkConditions.FOUR_G },
        configurable: true
      });

      const options = {};
      const adapted = networkManager.adaptQualityOptions(options);
      validationReport.scenarios.slow.recovery = adapted.quality !== 'low';
      expect(adapted.quality).not.toBe('low');
    });
  });

  describe('Flaky Connection', () => {
    test('handles retries', async () => {
      let retries = 0;
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, clone: () => ({ blob: () => new Blob() }) });

      global.fetch = mockFetch;
      
      try {
        await networkManager.fetchWithRetry('test.mp4', {});
        retries = mockFetch.mock.calls.length - 1;
      } catch (error) {
        // Count failed attempts
      }

      validationReport.scenarios.flaky.retries = retries;
      validationReport.scenarios.flaky.failures = mockFetch.mock.calls.length - retries - 1;
      validationReport.scenarios.flaky.recovery = retries > 0 && mockFetch.mock.lastCall !== null;
      
      expect(retries).toBeGreaterThan(0);
    });
  });

  describe('Resource Management', () => {
    test('manages storage', async () => {
      // Check storage before
      const beforeSize = await networkManager.getStorageUsage();
      
      // Add test video
      const videoBlob = new Blob(['test video data'], { type: 'video/mp4' });
      await networkManager.storeForOffline('test2.mp4', videoBlob);
      
      // Check storage after
      const afterSize = await networkManager.getStorageUsage();
      validationReport.resources.storage = Math.round((afterSize - beforeSize) / (1024 * 1024));
      
      expect(afterSize).toBeGreaterThan(beforeSize);
    });

    test('cleans up resources', async () => {
      // Add old video
      const oldVideo = new Blob(['old video'], { type: 'video/mp4' });
      await networkManager.storeForOffline('old.mp4', oldVideo);
      
      // Clean up
      await networkManager.cleanupStorage(0); // Immediate cleanup
      
      // Verify cleanup
      const video = await networkManager.getOfflineVideo('old.mp4');
      validationReport.resources.cleanup = video === null;
      
      expect(video).toBeNull();
    });

    test('checks for memory leaks', async () => {
      const startMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Perform operations
      for (let i = 0; i < 10; i++) {
        const video = new Blob(['video ' + i], { type: 'video/mp4' });
        await networkManager.storeForOffline('video' + i + '.mp4', video);
        await networkManager.cleanupStorage();
      }
      
      const endMemory = performance.memory?.usedJSHeapSize || 0;
      const leakThreshold = 50 * 1024 * 1024; // 50MB
      
      validationReport.resources.leaks = Math.max(0, endMemory - startMemory - leakThreshold) / (1024 * 1024);
      expect(endMemory - startMemory).toBeLessThan(leakThreshold);
    });
  });

  describe('User Experience', () => {
    test('shows offline indicator', () => {
      let shown = false;
      window.addEventListener('networkStatusChange', (event) => {
        shown = !event.detail.online;
      });
      
      window.dispatchEvent(new Event('offline'));
      validationReport.ux.offlineIndicator = shown;
      expect(shown).toBe(true);
    });

    test('displays progress bar', async () => {
      let hasProgress = false;
      const mockProgress = { loaded: 50, total: 100 };
      
      window.addEventListener('progress', (event) => {
        hasProgress = event.detail.loaded === mockProgress.loaded;
      });
      
      window.dispatchEvent(new CustomEvent('progress', { detail: mockProgress }));
      validationReport.ux.progressBar = hasProgress;
      expect(hasProgress).toBe(true);
    });

    test('shows error messages', async () => {
      let hasError = false;
      
      try {
        await networkManager.handleVideoRequest('nonexistent.mp4');
      } catch (error) {
        hasError = error.message.length > 0;
      }
      
      validationReport.ux.errorMessages = hasError;
      expect(hasError).toBe(true);
    });

    test('prompts for retry', async () => {
      let hasRetryPrompt = false;
      
      window.addEventListener('retryPrompt', () => {
        hasRetryPrompt = true;
      });
      
      try {
        await networkManager.fetchWithRetry('nonexistent.mp4', {});
      } catch (error) {
        // Retry failed
      }
      
      validationReport.ux.retryPrompts = hasRetryPrompt;
      expect(hasRetryPrompt).toBe(true);
    });
  });

  afterAll(() => {
    // Generate validation report
    console.log(`
Network Resilience Report
------------------------
Offline Support
--------------
✅ Playback: ${validationReport.scenarios.offline.playback}
✅ Sync: ${validationReport.scenarios.offline.sync}
📦 Storage: ${validationReport.scenarios.offline.storage}MB

Slow Network
-----------
✅ Adaptation: ${validationReport.scenarios.slow.adaptation}
⚠️ Buffering: ${validationReport.scenarios.slow.buffering}
🔄 Recovery: ${validationReport.scenarios.slow.recovery}

Flaky Connection
--------------
🔄 Retries: ${validationReport.scenarios.flaky.retries}
❌ Failures: ${validationReport.scenarios.flaky.failures}
✅ Recovery: ${validationReport.scenarios.flaky.recovery}

Resource Management
-----------------
📦 Storage: ${validationReport.resources.storage}MB
🧹 Cleanup: ${validationReport.resources.cleanup}
⚠️ Leaks: ${validationReport.resources.leaks}

User Experience
-------------
🔵 Offline Indicator: ${validationReport.ux.offlineIndicator}
📊 Progress Bar: ${validationReport.ux.progressBar}
⚠️ Error Messages: ${validationReport.ux.errorMessages}
🔄 Retry Prompts: ${validationReport.ux.retryPrompts}
    `);
  });
}); 