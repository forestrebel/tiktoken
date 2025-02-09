const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 375,
    viewportHeight: 812,
    video: true,
    screenshotOnRunFailure: true,
    experimentalMemoryManagement: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      on('task', {
        // Custom tasks for mobile testing
        async checkPerformance({ url }) {
          // Use Lighthouse for performance metrics
          const results = await require('lighthouse')(url);
          return results.lhr;
        },
        log(message) {
          console.log(message);
          return null;
        }
      });
    },
    env: {
      // Device configurations
      devices: {
        pixel5: {
          width: 393,
          height: 851,
          userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5)',
          isMobile: true
        },
        samsungS21: {
          width: 360,
          height: 800,
          userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B)',
          isMobile: true
        },
        iPhoneX: {
          width: 375,
          height: 812,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
          isMobile: true
        }
      },
      // Network presets
      networks: {
        offline: {
          offline: true
        },
        slow3g: {
          downloadThroughput: 32 * 1024,
          uploadThroughput: 32 * 1024,
          latency: 100
        },
        fast3g: {
          downloadThroughput: 1.5 * 1024 * 1024,
          uploadThroughput: 750 * 1024,
          latency: 40
        }
      },
      // Performance thresholds
      performance: {
        tti: 3000,
        fcp: 1000,
        lcp: 2500,
        cls: 0.1,
        fid: 100
      }
    }
  }
}); 