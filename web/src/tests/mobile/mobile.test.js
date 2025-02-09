import { 
  MOBILE_DEVICES, 
  NETWORK_CONDITIONS, 
  PERFORMANCE_THRESHOLDS,
  MobileTestUtils 
} from './setup';
import { videoProcessor } from '../../lib/videoProcessor';
import { createMockVideoFile } from '../video/__mocks__/ffmpeg';

describe('Mobile Experience', () => {
  // Test each device configuration
  Object.entries(MOBILE_DEVICES).forEach(([size, device]) => {
    describe(`${size} Screen (${device.name})`, () => {
      beforeEach(() => {
        MobileTestUtils.setupDevice(device);
        jest.clearAllMocks();
      });

      describe('Video Upload', () => {
        test('handles portrait video upload', async () => {
          const file = createMockVideoFile(50 * 1024 * 1024, 'video/mp4', 'portrait');
          const result = await videoProcessor.compress(file, {
            maxWidth: device.width,
            maxHeight: device.height,
            enforcePortrait: true
          });
          
          expect(result).toBeDefined();
          expect(result instanceof File).toBe(true);
          expect(result.type).toBe('video/mp4');
        });

        test('handles large file upload with low memory', async () => {
          const file = createMockVideoFile(150 * 1024 * 1024, 'video/mp4', 'portrait');
          const onProgress = jest.fn();
          const onError = jest.fn();
          
          await videoProcessor.compress(file, {
            maxWidth: device.width,
            maxHeight: device.height,
            onProgress,
            onError
          });
          
          expect(onProgress).toHaveBeenCalled();
          expect(onError).not.toHaveBeenCalled();
        });
      });

      describe('Performance', () => {
        test('meets performance thresholds', async () => {
          const metrics = await MobileTestUtils.getPerformanceMetrics();
          
          expect(metrics.timeToInteractive).toBeLessThan(PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE);
          expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT);
          expect(metrics.cumulativeLayoutShift).toBeLessThan(PERFORMANCE_THRESHOLDS.CUMULATIVE_LAYOUT_SHIFT);
          expect(metrics.frameRate).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MIN_FRAME_RATE);
        });

        test('handles low memory conditions', async () => {
          const file = createMockVideoFile(100 * 1024 * 1024);
          const batteryBefore = await MobileTestUtils.getBatteryMetrics();
          
          await videoProcessor.compress(file);
          
          const batteryAfter = await MobileTestUtils.getBatteryMetrics();
          const batteryImpact = batteryBefore?.level - batteryAfter?.level;
          
          expect(batteryImpact).toBeLessThan(0.1); // Less than 10% battery impact
        });
      });
    });
  });

  // Test network conditions
  Object.entries(NETWORK_CONDITIONS).forEach(([condition, config]) => {
    describe(`Network: ${condition}`, () => {
      beforeEach(() => {
        MobileTestUtils.setupNetwork(config);
      });

      test('handles offline mode', async () => {
        if (config.offline) {
          const file = createMockVideoFile(50 * 1024 * 1024);
          await expect(videoProcessor.compress(file)).rejects.toThrow();
        } else {
          const file = createMockVideoFile(50 * 1024 * 1024);
          const result = await videoProcessor.compress(file);
          expect(result).toBeDefined();
        }
      });

      test('adapts to network speed', async () => {
        const startTime = Date.now();
        const file = createMockVideoFile(50 * 1024 * 1024);
        
        await videoProcessor.compress(file);
        const duration = Date.now() - startTime;
        
        // Slower network should take longer
        if (config === NETWORK_CONDITIONS.SLOW_3G) {
          expect(duration).toBeGreaterThan(5000);
        } else if (config === NETWORK_CONDITIONS.WIFI) {
          expect(duration).toBeLessThan(5000);
        }
      });
    });
  });

  describe('Touch Interaction', () => {
    test('handles touch gestures', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      MobileTestUtils.simulateTouch(element, 'tap');
      MobileTestUtils.simulateTouch(element, 'swipe', { x: 100, y: 0 });
      
      // Clean up
      document.body.removeChild(element);
    });

    test('supports pinch-to-zoom', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 1, target: element, clientX: 0, clientY: 0 }),
          new Touch({ identifier: 2, target: element, clientX: 10, clientY: 0 })
        ]
      });
      
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          new Touch({ identifier: 1, target: element, clientX: -10, clientY: 0 }),
          new Touch({ identifier: 2, target: element, clientX: 20, clientY: 0 })
        ]
      });
      
      element.dispatchEvent(touchStart);
      element.dispatchEvent(touchMove);
      
      // Clean up
      document.body.removeChild(element);
    });
  });

  describe('Video Playback', () => {
    test('plays video smoothly', async () => {
      const video = document.createElement('video');
      video.src = 'test.mp4';
      document.body.appendChild(video);
      
      const isSmooth = await MobileTestUtils.checkVideoPlayback(video);
      expect(isSmooth).toBe(true);
      
      // Clean up
      document.body.removeChild(video);
    });

    test('handles orientation changes', async () => {
      const video = document.createElement('video');
      video.src = 'test.mp4';
      document.body.appendChild(video);
      
      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', { value: 851 });
      Object.defineProperty(window, 'innerHeight', { value: 393 });
      window.dispatchEvent(new Event('resize'));
      
      // Video should maintain aspect ratio
      expect(video.style.aspectRatio).toBe('9/16');
      
      // Clean up
      document.body.removeChild(video);
    });
  });
}); 