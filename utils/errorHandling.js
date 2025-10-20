/**
 * Enhanced Error Handling Utilities
 * Provides comprehensive error logging and context for debugging
 */

/**
 * Enhanced error logging with context
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 * @param {string} operation - The operation that failed
 */
export function logError(error, context = {}, operation = 'Unknown') {
  console.error(`\n❌ ERROR IN ${operation.toUpperCase()}`);
  console.error(`${'='.repeat(60)}`);
  console.error(`📍 Error Type: ${error.name || 'Unknown'}`);
  console.error(`💬 Error Message: ${error.message}`);
  console.error(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  // Log context information
  if (Object.keys(context).length > 0) {
    console.error(`📋 Context:`);
    Object.entries(context).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.error(`   ${key}: ${JSON.stringify(value, null, 2)}`);
      } else {
        console.error(`   ${key}: ${value}`);
      }
    });
  }
  
  // Log stack trace (first 5 lines)
  if (error.stack) {
    console.error(`📚 Stack Trace:`);
    const stackLines = error.stack.split('\n').slice(0, 6);
    stackLines.forEach(line => {
      console.error(`   ${line}`);
    });
  }
  
  console.error(`${'='.repeat(60)}\n`);
}

/**
 * Create a detailed error object with context
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 * @param {string} operation - Operation that failed
 * @returns {Object} Enhanced error object
 */
export function createDetailedError(message, context = {}, operation = 'Unknown') {
  const error = new Error(message);
  error.operation = operation;
  error.context = context;
  error.timestamp = new Date().toISOString();
  error.errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return error;
}

/**
 * Wrap async operations with enhanced error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} operation - Operation name
 * @param {Object} context - Additional context
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, operation, context = {}) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      const enhancedContext = {
        ...context,
        operation,
        arguments: args.length > 0 ? args : undefined,
        timestamp: new Date().toISOString()
      };
      
      logError(error, enhancedContext, operation);
      
      // Re-throw with enhanced context
      const detailedError = createDetailedError(
        error.message, 
        enhancedContext, 
        operation
      );
      detailedError.originalError = error;
      throw detailedError;
    }
  };
}

/**
 * Log scraping-specific errors with product context
 * @param {Error} error - The error object
 * @param {Object} product - Product information
 * @param {string} stage - Scraping stage (navigation, extraction, etc.)
 */
export function logScrapingError(error, product, stage) {
  const context = {
    productId: product.id,
    productName: product.product_name,
    productUrl: product.product_url,
    vendor: product.vendor,
    userEmail: product.email,
    userDisplayName: product.display_name,
    scrapingStage: stage,
    currentPrice: product.current_price,
    targetPrice: product.target_price
  };
  
  logError(error, context, `Scraping ${stage}`);
}

/**
 * Log database operation errors
 * @param {Error} error - The error object
 * @param {string} operation - Database operation
 * @param {Object} data - Data being operated on
 */
export function logDatabaseError(error, operation, data = {}) {
  const context = {
    operation,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  logError(error, context, `Database ${operation}`);
}

/**
 * Log notification errors
 * @param {Error} error - The error object
 * @param {Object} alert - Alert information
 * @param {string} channel - Notification channel
 */
export function logNotificationError(error, alert, channel) {
  const context = {
    alertId: alert.alert_id,
    userId: alert.user_id,
    userEmail: alert.email,
    productName: alert.product_name,
    productUrl: alert.product_url,
    notificationChannel: channel,
    targetPrice: alert.target_price,
    currentPrice: alert.latest_price
  };
  
  logError(error, context, `Notification ${channel}`);
}

/**
 * Retry operation with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {string} operation - Operation name for logging
 * @returns {Promise<any>} Result of the function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, operation = 'Unknown') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${operation}`);
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} attempts failed for ${operation}`);
        logError(error, { operation, attempts: maxRetries }, operation);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Attempt ${attempt} failed for ${operation}, retrying in ${delay}ms...`);
      console.warn(`   Error: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Safe JSON parsing with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {string} context - Context for error logging
 * @returns {Object|null} Parsed object or null
 */
export function safeJsonParse(jsonString, context = 'Unknown') {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logError(error, { jsonString: jsonString?.substring(0, 100) + '...' }, `JSON Parse ${context}`);
    return null;
  }
}

/**
 * Validate required fields with detailed error messages
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @param {string} context - Context for error messages
 * @throws {Error} If validation fails
 */
export function validateRequiredFields(data, requiredFields, context = 'Validation') {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missingFields.length > 0) {
    const error = createDetailedError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { 
        missingFields, 
        providedFields: Object.keys(data),
        context 
      },
      context
    );
    throw error;
  }
}

/**
 * Log performance issues
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {number} threshold - Threshold for warning (default: 5000ms)
 */
export function logPerformanceIssue(operation, duration, threshold = 5000) {
  if (duration > threshold) {
    console.warn(`⚠️ PERFORMANCE ISSUE: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
  }
}

/**
 * Create error summary for reporting
 * @param {Array} errors - Array of error objects
 * @returns {Object} Error summary
 */
export function createErrorSummary(errors) {
  const summary = {
    totalErrors: errors.length,
    errorTypes: {},
    operations: {},
    timeRange: {
      first: null,
      last: null
    }
  };
  
  errors.forEach(error => {
    // Count error types
    const errorType = error.name || 'Unknown';
    summary.errorTypes[errorType] = (summary.errorTypes[errorType] || 0) + 1;
    
    // Count operations
    const operation = error.operation || 'Unknown';
    summary.operations[operation] = (summary.operations[operation] || 0) + 1;
    
    // Track time range
    const timestamp = error.timestamp || new Date().toISOString();
    if (!summary.timeRange.first || timestamp < summary.timeRange.first) {
      summary.timeRange.first = timestamp;
    }
    if (!summary.timeRange.last || timestamp > summary.timeRange.last) {
      summary.timeRange.last = timestamp;
    }
  });
  
  return summary;
}
