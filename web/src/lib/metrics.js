import { supabase } from './supabaseClient';
import { getMemoryUsage, getFPS } from './performance';

const METRICS_TABLE = 'metrics';
const ERROR_TABLE = 'errors';

/**
 * Metrics collector for tracking real application performance
 */
export class MetricsCollector {
  constructor() {
    this.metricsBuffer = [];
    this.isClient = typeof window !== 'undefined';
    
    if (this.isClient) {
      this.flushInterval = setInterval(() => this.flushMetrics(), 10000);
      this.initWebVitals();
    }
  }

  /**
   * Initialize web vitals monitoring
   */
  async initWebVitals() {
    if (!this.isClient) return;
    
    const { onFCP, onLCP, onFID, onCLS } = await import('web-vitals');
    
    onFCP(metric => this.saveMetric('fcp', metric));
    onLCP(metric => this.saveMetric('lcp', metric));
    onFID(metric => this.saveMetric('fid', metric));
    onCLS(metric => this.saveMetric('cls', metric));
  }

  /**
   * Track video upload with performance metrics
   */
  async trackUpload(file) {
    const startTime = performance.now();
    const startMemory = await getMemoryUsage();
    
    try {
      const result = await this.measureUpload(file);
      const duration = performance.now() - startTime;
      const endMemory = await getMemoryUsage();
      
      await this.saveMetric('upload', {
        success: true,
        size: file.size,
        duration,
        path: result.path,
        memoryDelta: endMemory.usedJSHeapSize - startMemory.usedJSHeapSize,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      await this.saveMetric('upload_error', {
        error: error.message,
        size: file.size,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Track video playback performance
   */
  trackPlayback(videoId, videoElement) {
    const metrics = {
      videoId,
      startTime: performance.now(),
      firstFrame: 0,
      bufferEvents: 0,
      qualityChanges: 0,
      memoryUsage: 0,
      fps: 0
    };

    // Track first frame
    videoElement.addEventListener('loadeddata', () => {
      metrics.firstFrame = performance.now() - metrics.startTime;
      this.saveMetric('playback_start', {
        videoId,
        timeToFirstFrame: metrics.firstFrame
      });
    });

    // Track buffering
    videoElement.addEventListener('waiting', () => {
      metrics.bufferEvents++;
      this.saveMetric('playback_buffer', {
        videoId,
        bufferCount: metrics.bufferEvents
      });
    });

    // Track quality changes
    videoElement.addEventListener('qualitychange', () => {
      metrics.qualityChanges++;
      this.saveMetric('playback_quality', {
        videoId,
        qualityChanges: metrics.qualityChanges
      });
    });

    // Track memory and FPS
    const performanceInterval = setInterval(async () => {
      const memory = await getMemoryUsage();
      const fps = await getFPS();
      
      metrics.memoryUsage = memory.usedJSHeapSize;
      metrics.fps = fps;
      
      this.saveMetric('playback_performance', {
        videoId,
        memory: metrics.memoryUsage,
        fps: metrics.fps
      });
    }, 1000);

    // Cleanup on video end
    videoElement.addEventListener('ended', () => {
      clearInterval(performanceInterval);
      this.saveMetric('playback_complete', {
        videoId,
        duration: performance.now() - metrics.startTime,
        bufferEvents: metrics.bufferEvents,
        qualityChanges: metrics.qualityChanges
      });
    });

    return metrics;
  }

  /**
   * Save metric to buffer and Supabase
   */
  async saveMetric(type, data) {
    if (!this.isClient) return;

    const metric = {
      type,
      data,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      user_agent: navigator.userAgent
    };

    this.metricsBuffer.push(metric);

    // Flush if buffer gets too large
    if (this.metricsBuffer.length >= 50) {
      await this.flushMetrics();
    }
  }

  /**
   * Flush metrics buffer to Supabase
   */
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    try {
      const { error } = await supabase
        .from(METRICS_TABLE)
        .insert(this.metricsBuffer);

      if (error) throw error;
      this.metricsBuffer = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    if (!this.isClient) return 'server';
    
    if (!this.sessionId) {
      this.sessionId = crypto.randomUUID();
    }
    return this.sessionId;
  }

  /**
   * Clean up collector
   */
  destroy() {
    clearInterval(this.flushInterval);
    this.flushMetrics();
  }
}

// Export singleton instance
export const metrics = new MetricsCollector(); 