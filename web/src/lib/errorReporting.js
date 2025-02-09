import { supabase } from './supabaseClient';

const ERROR_TABLE = 'errors';
const CRITICAL_PATTERNS = [
  'OutOfMemory',
  'QuotaExceeded',
  'NetworkError',
  'DatabaseError'
];

/**
 * Error reporting and tracking system
 */
export class ErrorReporter {
  constructor() {
    this.errorBuffer = [];
    this.isClient = typeof window !== 'undefined';
    
    if (this.isClient) {
      this.setupGlobalHandlers();
    }
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers() {
    if (!this.isClient) return;

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, { type: 'unhandledrejection' });
    });

    // Global errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error, { type: 'window.error' });
    });

    // Console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.captureError(args[0], { type: 'console.error' });
      originalError.apply(console, args);
    };
  }

  /**
   * Capture and report error
   */
  async captureError(error, context = {}) {
    if (!this.isClient) return null;

    const errorReport = {
      message: error?.message || String(error),
      stack: error?.stack,
      type: error?.name || 'Error',
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    // Add to buffer
    this.errorBuffer.push(errorReport);

    // Save error
    await this.saveError(errorReport);

    // Check if critical
    if (this.isCriticalError(error)) {
      await this.notifyTeam(errorReport);
    }

    return errorReport;
  }

  /**
   * Save error to Supabase
   */
  async saveError(errorReport) {
    if (!this.isClient) return;

    try {
      const { error } = await supabase
        .from(ERROR_TABLE)
        .insert([errorReport]);

      if (error) throw error;
    } catch (saveError) {
      // Fallback to localStorage if Supabase fails
      try {
        const errors = JSON.parse(localStorage.getItem('error_buffer') || '[]');
        errors.push(errorReport);
        localStorage.setItem('error_buffer', JSON.stringify(errors));
      } catch (e) {
        console.error('Failed to save error to localStorage:', e);
      }
    }
  }

  /**
   * Check if error is critical
   */
  isCriticalError(error) {
    const errorString = error?.message || String(error);
    return CRITICAL_PATTERNS.some(pattern => errorString.includes(pattern));
  }

  /**
   * Notify team of critical error
   */
  async notifyTeam(errorReport) {
    if (!this.isClient) return;

    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'critical_error',
          error: errorReport
        })
      });
    } catch (notifyError) {
      console.error('Failed to notify team:', notifyError);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats() {
    if (!this.isClient) {
      return {
        total: 0,
        critical: 0,
        types: {}
      };
    }

    try {
      const { data, error } = await supabase
        .from(ERROR_TABLE)
        .select('type, context')
        .order('context->timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return {
        total: data.length,
        critical: data.filter(e => this.isCriticalError(e)).length,
        types: data.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        total: 0,
        critical: 0,
        types: {}
      };
    }
  }
}

// Export singleton instance
export const errorReporter = new ErrorReporter(); 