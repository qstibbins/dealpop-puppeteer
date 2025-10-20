/**
 * Performance monitoring utilities
 * Provides timing and performance tracking for scraping operations
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }
  
  /**
   * Start timing an operation
   * @param {string} label - Label for the operation
   */
  start(label) {
    this.metrics.set(label, { 
      start: Date.now(),
      end: null,
      duration: null
    });
    console.log(`⏱️  Started: ${label}`);
  }
  
  /**
   * End timing an operation
   * @param {string} label - Label for the operation
   */
  end(label) {
    const metric = this.metrics.get(label);
    if (metric) {
      metric.end = Date.now();
      metric.duration = metric.end - metric.start;
      console.log(`⏱️  Completed: ${label} (${metric.duration}ms)`);
    } else {
      console.warn(`⚠️ No start time found for: ${label}`);
    }
  }
  
  /**
   * Get all metrics
   * @returns {Object} All timing metrics
   */
  getMetrics() {
    const result = {};
    for (const [label, metric] of this.metrics) {
      result[label] = {
        start: metric.start,
        end: metric.end,
        duration: metric.duration,
        status: metric.end ? 'completed' : 'running'
      };
    }
    return result;
  }
  
  /**
   * Log a summary of all metrics
   */
  logSummary() {
    const totalTime = Date.now() - this.startTime;
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log(`${'='.repeat(50)}`);
    console.log(`⏱️  Total Runtime: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log('');
    
    const completedMetrics = Array.from(this.metrics.entries())
      .filter(([_, metric]) => metric.duration !== null)
      .sort((a, b) => b[1].duration - a[1].duration);
    
    if (completedMetrics.length > 0) {
      console.log('📈 Completed Operations:');
      completedMetrics.forEach(([label, metric]) => {
        const percentage = ((metric.duration / totalTime) * 100).toFixed(1);
        console.log(`   ${label}: ${metric.duration}ms (${percentage}%)`);
      });
    }
    
    const runningMetrics = Array.from(this.metrics.entries())
      .filter(([_, metric]) => metric.duration === null);
    
    if (runningMetrics.length > 0) {
      console.log('\n🔄 Running Operations:');
      runningMetrics.forEach(([label, metric]) => {
        const runningTime = Date.now() - metric.start;
        console.log(`   ${label}: ${runningTime}ms (still running)`);
      });
    }
    
    console.log(`${'='.repeat(50)}\n`);
  }
  
  /**
   * Get timing for a specific operation
   * @param {string} label - Operation label
   * @returns {Object|null} Timing data or null if not found
   */
  getTiming(label) {
    return this.metrics.get(label) || null;
  }
  
  /**
   * Check if an operation is still running
   * @param {string} label - Operation label
   * @returns {boolean} True if still running
   */
  isRunning(label) {
    const metric = this.metrics.get(label);
    return metric && metric.duration === null;
  }
  
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.startTime = Date.now();
    console.log('🔄 Performance monitor reset');
  }
}

// Create a global instance
export const perf = new PerformanceMonitor();

/**
 * Decorator function for timing async operations
 * @param {string} label - Label for the operation
 * @param {Function} fn - Function to time
 * @returns {Function} Wrapped function
 */
export function timed(label, fn) {
  return async function(...args) {
    perf.start(label);
    try {
      const result = await fn.apply(this, args);
      perf.end(label);
      return result;
    } catch (error) {
      perf.end(label);
      throw error;
    }
  };
}

/**
 * Simple timing utility for one-off measurements
 * @param {string} label - Label for the operation
 * @param {Function} fn - Function to time
 * @returns {Promise<any>} Result of the function
 */
export async function timeOperation(label, fn) {
  const start = Date.now();
  console.log(`⏱️  Starting: ${label}`);
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`✅ Completed: ${label} (${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Failed: ${label} (${duration}ms) - ${error.message}`);
    throw error;
  }
}

/**
 * Log memory usage information
 */
export function logMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    console.log('🧠 MEMORY USAGE:');
    console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
  }
}

/**
 * Log system information
 */
export function logSystemInfo() {
  console.log('💻 SYSTEM INFO:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Uptime: ${(process.uptime() / 60).toFixed(2)} minutes`);
  console.log(`   Working Directory: ${process.cwd()}`);
}
