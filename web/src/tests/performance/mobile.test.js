import {
  getFPS,
  getMemoryUsage,
  getTouchLatency,
  measureVideoPlayback,
  measureScrollPerformance,
  validatePerformance,
  PERFORMANCE_THRESHOLDS
} from '../../lib/performance';

describe('Mobile Performance', () => {
  let metrics = {
    fps: 0,
    loadTime: 0,
    memory: 0,
    latency: 0,
    memoryDelta: 0
  };

  let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  beforeEach(async () => {
    // Clear performance marks
    performance.clearMarks();
    performance.clearMeasures();
    
    // Reset metrics
    metrics = {
      fps: 0,
      loadTime: 0,
      memory: 0,
      latency: 0,
      memoryDelta: 0
    };
  });

  describe('Video Playback Performance', () => {
    let videoElement;

    beforeEach(() => {
      videoElement = document.createElement('video');
      videoElement.src = '/test-assets/test-video.mp4';
      document.body.appendChild(videoElement);
    });

    afterEach(() => {
      document.body.removeChild(videoElement);
    });

    test('measures video playback performance', async () => {
      try {
        const playbackMetrics = await measureVideoPlayback(videoElement);
        metrics.fps = playbackMetrics.fps;
        metrics.loadTime = playbackMetrics.loadTime;
        metrics.memory = playbackMetrics.memory;
        metrics.memoryDelta = playbackMetrics.memoryDelta;

        expect(playbackMetrics.fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MIN_FPS);
        expect(playbackMetrics.loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_LOAD_TIME);
        expect(Math.abs(playbackMetrics.memoryDelta)).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_DELTA);
        
        testResults.passed++;
      } catch (error) {
        testResults.failed++;
        throw error;
      }
    });
  });

  describe('Touch Interaction Performance', () => {
    test('measures touch latency', async () => {
      try {
        const latency = await getTouchLatency();
        metrics.latency = latency;

        expect(latency).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_TOUCH_LATENCY);
        testResults.passed++;
      } catch (error) {
        testResults.failed++;
        throw error;
      }
    });

    test('measures scroll performance', async () => {
      try {
        const container = document.createElement('div');
        container.style.height = '200px';
        container.style.overflow = 'scroll';
        document.body.appendChild(container);

        const scrollMetrics = await measureScrollPerformance(container);
        metrics.fps = Math.min(metrics.fps, scrollMetrics.fps);
        metrics.memoryDelta = Math.max(metrics.memoryDelta, scrollMetrics.memoryDelta);

        expect(scrollMetrics.fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MIN_FPS);
        expect(scrollMetrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_TOUCH_LATENCY);
        expect(Math.abs(scrollMetrics.memoryDelta)).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_DELTA);

        document.body.removeChild(container);
        testResults.passed++;
      } catch (error) {
        testResults.failed++;
        throw error;
      }
    });
  });

  describe('Memory Management', () => {
    test('monitors memory usage', async () => {
      try {
        const startMemory = await getMemoryUsage();
        
        // Perform memory-intensive operation
        const videoElements = Array.from({ length: 5 }, () => {
          const video = document.createElement('video');
          video.src = '/test-assets/test-video.mp4';
          return video;
        });
        
        document.body.append(...videoElements);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const endMemory = await getMemoryUsage();
        metrics.memoryDelta = Math.max(
          metrics.memoryDelta,
          endMemory.usedJSHeapSize - startMemory.usedJSHeapSize
        );

        videoElements.forEach(video => video.remove());
        
        expect(Math.abs(metrics.memoryDelta)).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_DELTA);
        testResults.passed++;
      } catch (error) {
        testResults.failed++;
        throw error;
      }
    });
  });

  afterAll(() => {
    // Generate validation report
    const targets = validatePerformance(metrics);
    
    console.log(`
Performance Validation Report
----------------------------
FPS: ${metrics.fps} fps
Load Time: ${metrics.loadTime}ms
Memory Usage: ${metrics.memory}MB
Memory Delta: ${metrics.memoryDelta}MB
Touch Latency: ${metrics.latency}ms

Test Results
-----------
✅ Passing: ${testResults.passed}
❌ Failing: ${testResults.failed}
⏭️ Skipped: ${testResults.skipped}

Performance Targets
------------------
${targets.fpsAbove30 ? '✅' : '❌'} FPS Above 30
${targets.loadUnder2s ? '✅' : '❌'} Load Under 2s
${targets.latencyUnder100ms ? '✅' : '❌'} Latency Under 100ms
${targets.noMemoryLeaks ? '✅' : '❌'} No Memory Leaks
    `);
  });
}); 