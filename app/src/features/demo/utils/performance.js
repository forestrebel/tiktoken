// Performance measurement utility
export const measureTiming = async (operation) => {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    return {
      result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    throw {
      originalError: error,
      duration,
    };
  }
};

// Performance thresholds
export const PERFORMANCE_TARGETS = {
  IMPORT: 3000,    // 3s target for import
  PREVIEW: 3000,   // 3s target for preview
  RECOVERY: 1000,  // 1s target for error recovery
};

// Performance monitoring
export const monitorPerformance = (operation, target, onExceed) => {
  const startTime = Date.now();
  
  return async (...args) => {
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      if (duration > target) {
        onExceed?.(duration);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.warn(`Operation failed after ${duration}ms:`, error);
      throw error;
    }
  };
}; 