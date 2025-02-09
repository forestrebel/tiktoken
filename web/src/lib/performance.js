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

// Performance tracking module
const PERFORMANCE_STORE_KEY = 'video_performance_metrics'

// Initialize performance observer
let performanceObserver
if (typeof window !== 'undefined') {
  performanceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach(entry => {
      storeMetric(entry.name, entry.startTime, entry.duration)
    })
  })
  
  performanceObserver.observe({ 
    entryTypes: ['resource', 'paint', 'largest-contentful-paint', 'layout-shift'] 
  })
}

// Store performance metric
const storeMetric = (name, startTime, duration) => {
  try {
    const metrics = JSON.parse(localStorage.getItem(PERFORMANCE_STORE_KEY) || '{}')
    metrics[name] = metrics[name] || []
    metrics[name].push({ startTime, duration, timestamp: Date.now() })
    localStorage.setItem(PERFORMANCE_STORE_KEY, JSON.stringify(metrics))
  } catch (error) {
    console.warn('Failed to store metric:', error)
  }
}

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

// Get FPS measurement
export const measureFPS = () => {
  let frames = 0
  let lastTime = performance.now()
  let rafId

  const measure = () => {
    frames++
    const now = performance.now()
    
    if (now >= lastTime + 1000) {
      const fps = Math.round((frames * 1000) / (now - lastTime))
      storeMetric('fps', now, fps)
      frames = 0
      lastTime = now
    }
    
    rafId = requestAnimationFrame(measure)
  }

  measure()
  return () => cancelAnimationFrame(rafId)
}

// Measure memory usage
export const measureMemory = async () => {
  if (!performance.memory) return null
  
  const { totalJSHeapSize, usedJSHeapSize } = performance.memory
  const usage = {
    total: Math.round(totalJSHeapSize / 1024 / 1024),
    used: Math.round(usedJSHeapSize / 1024 / 1024)
  }
  
  storeMetric('memory', performance.now(), usage)
  return usage
}

// Measure battery impact
export const measureBattery = async () => {
  if (!navigator.getBattery) return null
  
  const battery = await navigator.getBattery()
  const impact = {
    level: battery.level,
    charging: battery.charging,
    dischargingTime: battery.dischargingTime
  }
  
  storeMetric('battery', performance.now(), impact)
  return impact
}

// Get all performance metrics
export const getPerformanceReport = () => {
  try {
    return JSON.parse(localStorage.getItem(PERFORMANCE_STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

// Clear performance metrics
export const clearPerformanceMetrics = () => {
  localStorage.removeItem(PERFORMANCE_STORE_KEY)
}

// Track video playback performance
export const trackVideoPlayback = (videoElement) => {
  if (!videoElement) return

  const metrics = {
    bufferingEvents: 0,
    totalBufferingTime: 0,
    playbackStartTime: null,
    lastBufferingStart: null
  }

  const handlers = {
    play: () => {
      if (!metrics.playbackStartTime) {
        metrics.playbackStartTime = performance.now()
      }
    },
    
    waiting: () => {
      metrics.bufferingEvents++
      metrics.lastBufferingStart = performance.now()
    },
    
    playing: () => {
      if (metrics.lastBufferingStart) {
        metrics.totalBufferingTime += performance.now() - metrics.lastBufferingStart
        metrics.lastBufferingStart = null
      }
    },
    
    ended: () => {
      const playbackDuration = performance.now() - metrics.playbackStartTime
      storeMetric('video_playback', metrics.playbackStartTime, {
        duration: playbackDuration,
        bufferingEvents: metrics.bufferingEvents,
        totalBufferingTime: metrics.totalBufferingTime
      })
    }
  }

  // Attach event listeners
  Object.entries(handlers).forEach(([event, handler]) => {
    videoElement.addEventListener(event, handler)
  })

  // Return cleanup function
  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      videoElement.removeEventListener(event, handler)
    })
  }
} 