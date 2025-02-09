/**
 * Mobile test configuration and utilities
 */

// Device configurations
export const MOBILE_DEVICES = {
  SMALL: {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  MEDIUM: {
    name: 'iPhone X',
    width: 375,
    height: 812,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  LARGE: {
    name: 'Pixel 5',
    width: 393,
    height: 851,
    pixelRatio: 2.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36'
  }
};

// Network conditions
export const NETWORK_CONDITIONS = {
  OFFLINE: {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  },
  SLOW_3G: {
    offline: false,
    latency: 100,
    downloadThroughput: 32 * 1024, // 32 kbps
    uploadThroughput: 32 * 1024
  },
  FAST_3G: {
    offline: false,
    latency: 40,
    downloadThroughput: 1.5 * 1024 * 1024, // 1.5 Mbps
    uploadThroughput: 750 * 1024 // 750 kbps
  },
  WIFI: {
    offline: false,
    latency: 2,
    downloadThroughput: 30 * 1024 * 1024, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 // 15 Mbps
  }
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  TIME_TO_INTERACTIVE: 3000, // 3s
  FIRST_CONTENTFUL_PAINT: 1000, // 1s
  LARGEST_CONTENTFUL_PAINT: 2500, // 2.5s
  FIRST_INPUT_DELAY: 100, // 100ms
  CUMULATIVE_LAYOUT_SHIFT: 0.1,
  MIN_FRAME_RATE: 30
};

// Test utilities
export class MobileTestUtils {
  /**
   * Set up mobile device environment
   * @param {Object} device - Device configuration
   */
  static setupDevice(device) {
    Object.defineProperty(window, 'innerWidth', { value: device.width });
    Object.defineProperty(window, 'innerHeight', { value: device.height });
    Object.defineProperty(window, 'devicePixelRatio', { value: device.pixelRatio });
    Object.defineProperty(navigator, 'userAgent', { value: device.userAgent });
  }

  /**
   * Simulate network condition
   * @param {Object} condition - Network condition
   */
  static setupNetwork(condition) {
    if (condition.offline) {
      window.navigator.onLine = false;
    } else {
      window.navigator.onLine = true;
      // Here you would typically use browser devtools protocol to set conditions
      // This is a mock implementation
      window._networkCondition = condition;
    }
  }

  /**
   * Monitor performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  static async getPerformanceMetrics() {
    const metrics = {};
    
    // Basic metrics
    const navigation = performance.getEntriesByType('navigation')[0];
    metrics.timeToInteractive = navigation.domInteractive;
    metrics.firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
    
    // Layout shifts
    let cumulativeLayoutShift = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        cumulativeLayoutShift += entry.value;
      }
    });
    observer.observe({ entryTypes: ['layout-shift'] });
    metrics.cumulativeLayoutShift = cumulativeLayoutShift;
    
    // Frame rate
    metrics.frameRate = await this.measureFrameRate();
    
    return metrics;
  }

  /**
   * Measure frame rate
   * @returns {Promise<number>} Average frame rate
   */
  static measureFrameRate() {
    return new Promise((resolve) => {
      let frames = 0;
      let lastTime = performance.now();
      
      function countFrame(now) {
        frames++;
        if (now - lastTime > 1000) {
          resolve(Math.round(frames * 1000 / (now - lastTime)));
        } else {
          requestAnimationFrame(countFrame);
        }
      }
      
      requestAnimationFrame(countFrame);
    });
  }

  /**
   * Simulate touch interaction
   * @param {Element} element - Target element
   * @param {string} gesture - Gesture type ('tap', 'swipe', etc.)
   * @param {Object} options - Gesture options
   */
  static simulateTouch(element, gesture, options = {}) {
    const touch = new Touch({
      identifier: Date.now(),
      target: element,
      clientX: options.x || 0,
      clientY: options.y || 0,
      radiusX: 2.5,
      radiusY: 2.5,
      rotationAngle: 0,
      force: 1
    });

    const touchEvent = new TouchEvent(gesture === 'tap' ? 'touchstart' : gesture, {
      cancelable: true,
      bubbles: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch]
    });

    element.dispatchEvent(touchEvent);
  }

  /**
   * Check if video playback is smooth
   * @param {HTMLVideoElement} video - Video element
   * @returns {Promise<boolean>} Is playback smooth
   */
  static async checkVideoPlayback(video) {
    return new Promise((resolve) => {
      let droppedFrames = 0;
      let totalFrames = 0;
      
      video.addEventListener('timeupdate', () => {
        if (video.webkitDroppedFrameCount) {
          droppedFrames = video.webkitDroppedFrameCount;
          totalFrames = video.webkitDecodedFrameCount;
        }
      });
      
      setTimeout(() => {
        const smoothness = 1 - (droppedFrames / totalFrames);
        resolve(smoothness > 0.9); // Consider smooth if less than 10% frames dropped
      }, 5000);
    });
  }

  /**
   * Monitor battery usage
   * @returns {Promise<Object>} Battery metrics
   */
  static async getBatteryMetrics() {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    }
    return null;
  }
} 