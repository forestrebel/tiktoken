/**
 * Mobile Performance Measurement Library
 */

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  MIN_FPS: 30,
  MAX_LOAD_TIME: 2000,
  MAX_TOUCH_LATENCY: 100,
  MAX_MEMORY_DELTA: 50 // MB
};

/**
 * Measures FPS over a time period
 * @param {number} duration - Duration to measure in ms
 * @returns {Promise<number>} Average FPS
 */
export const getFPS = async (duration = 1000) => {
  return new Promise(resolve => {
    let frames = 0;
    let lastTime = performance.now();
    
    function countFrame(now) {
      frames++;
      if (now - lastTime >= duration) {
        resolve(Math.round(frames * 1000 / (now - lastTime)));
      } else {
        requestAnimationFrame(countFrame);
      }
    }
    
    requestAnimationFrame(countFrame);
  });
};

/**
 * Measures memory usage
 * @returns {Promise<Object>} Memory metrics in MB
 */
export const getMemoryUsage = async () => {
  if (!performance.memory) {
    return { jsHeapSize: 0, totalJSHeapSize: 0, usedJSHeapSize: 0 };
  }
  
  const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory;
  return {
    jsHeapSize: Math.round(jsHeapSizeLimit / 1048576),
    totalJSHeapSize: Math.round(totalJSHeapSize / 1048576),
    usedJSHeapSize: Math.round(usedJSHeapSize / 1048576)
  };
};

/**
 * Measures touch input latency
 * @returns {Promise<number>} Latency in ms
 */
export const getTouchLatency = async () => {
  return new Promise(resolve => {
    const start = performance.now();
    
    const touchHandler = () => {
      const latency = performance.now() - start;
      document.removeEventListener('touchstart', touchHandler);
      resolve(Math.round(latency));
    };
    
    document.addEventListener('touchstart', touchHandler);
    
    // Simulate touch after 100ms
    setTimeout(() => {
      const touch = new Touch({
        identifier: Date.now(),
        target: document.body,
        clientX: 0,
        clientY: 0
      });
      
      document.body.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
        bubbles: true
      }));
    }, 100);
  });
};

/**
 * Measures video playback performance
 * @param {HTMLVideoElement} videoElement - Video element to measure
 * @returns {Promise<Object>} Playback metrics
 */
export const measureVideoPlayback = async (videoElement) => {
  performance.mark('playback-start');
  
  const startMemory = await getMemoryUsage();
  const fps = await getFPS(2000); // Measure FPS over 2 seconds
  const endMemory = await getMemoryUsage();
  
  performance.mark('playback-end');
  performance.measure('playback-duration', 'playback-start', 'playback-end');
  
  const playbackMeasure = performance.getEntriesByName('playback-duration')[0];
  
  return {
    fps,
    loadTime: Math.round(videoElement.getStartDate() || 0),
    memory: endMemory.usedJSHeapSize,
    memoryDelta: endMemory.usedJSHeapSize - startMemory.usedJSHeapSize,
    duration: Math.round(playbackMeasure.duration)
  };
};

/**
 * Measures scroll performance
 * @param {Element} container - Scrollable container
 * @returns {Promise<Object>} Scroll metrics
 */
export const measureScrollPerformance = async (container) => {
  performance.mark('scroll-start');
  
  const startMemory = await getMemoryUsage();
  const startTime = performance.now();
  
  // Scroll test
  container.scrollTo({ top: 500, behavior: 'smooth' });
  
  const fps = await getFPS(1000);
  const endMemory = await getMemoryUsage();
  
  performance.mark('scroll-end');
  performance.measure('scroll-duration', 'scroll-start', 'scroll-end');
  
  const scrollMeasure = performance.getEntriesByName('scroll-duration')[0];
  
  return {
    fps,
    duration: Math.round(scrollMeasure.duration),
    memory: endMemory.usedJSHeapSize,
    memoryDelta: endMemory.usedJSHeapSize - startMemory.usedJSHeapSize,
    responseTime: Math.round(performance.now() - startTime)
  };
};

/**
 * Validates performance metrics against thresholds
 * @param {Object} metrics - Collected metrics
 * @returns {Object} Validation results
 */
export const validatePerformance = (metrics) => {
  return {
    fpsAbove30: metrics.fps >= PERFORMANCE_THRESHOLDS.MIN_FPS,
    loadUnder2s: metrics.loadTime <= PERFORMANCE_THRESHOLDS.MAX_LOAD_TIME,
    latencyUnder100ms: metrics.latency <= PERFORMANCE_THRESHOLDS.MAX_TOUCH_LATENCY,
    noMemoryLeaks: Math.abs(metrics.memoryDelta) <= PERFORMANCE_THRESHOLDS.MAX_MEMORY_DELTA
  };
}; 