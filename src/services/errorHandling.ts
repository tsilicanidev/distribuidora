import { supabase } from '../lib/supabase';
import { aiService } from './ai';

// Error types that the AI can detect and handle
export enum ErrorType {
  API_ERROR = 'api_error',
  DATABASE_ERROR = 'database_error',
  AUTH_ERROR = 'auth_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Interface for error data
export interface ErrorData {
  type: ErrorType;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  severity?: ErrorSeverity;
}

// AI-powered error handling service
class ErrorHandlingService {
  private errorPatterns: Map<string, RegExp[]> = new Map();
  private errorSolutions: Map<string, (error: ErrorData) => Promise<boolean>> = new Map();
  private errorBuffer: ErrorData[] = [];
  private maxBufferSize = 50;

  constructor() {
    this.initializeErrorPatterns();
    this.initializeErrorSolutions();
  }

  // Initialize common error patterns for classification
  private initializeErrorPatterns() {
    this.errorPatterns.set(ErrorType.API_ERROR, [
      /failed to fetch/i,
      /network request failed/i,
      /api.*error/i,
      /timeout/i,
      /cors/i
    ]);

    this.errorPatterns.set(ErrorType.DATABASE_ERROR, [
      /database error/i,
      /supabase.*error/i,
      /query.*failed/i,
      /constraint violation/i,
      /foreign key/i,
      /unique constraint/i
    ]);

    this.errorPatterns.set(ErrorType.AUTH_ERROR, [
      /auth.*error/i,
      /unauthorized/i,
      /forbidden/i,
      /permission denied/i,
      /token.*expired/i,
      /invalid.*token/i,
      /not.*authenticated/i
    ]);

    this.errorPatterns.set(ErrorType.NETWORK_ERROR, [
      /network.*error/i,
      /offline/i,
      /connection.*failed/i,
      /cannot connect/i
    ]);

    this.errorPatterns.set(ErrorType.VALIDATION_ERROR, [
      /validation.*error/i,
      /invalid.*input/i,
      /required.*field/i,
      /format.*invalid/i
    ]);
  }

  // Initialize solutions for common error types
  private initializeErrorSolutions() {
    // Solution for API errors
    this.errorSolutions.set(ErrorType.API_ERROR, async (error) => {
      console.log('Attempting to fix API error:', error.message);
      
      // For timeout or network issues, retry with exponential backoff
      if (/timeout|failed to fetch|network/i.test(error.message)) {
        return await this.retryWithBackoff(async () => {
          // Recreate the failed request
          if (error.context?.url) {
            try {
              const response = await fetch(error.context.url, error.context.options);
              return response.ok;
            } catch {
              return false;
            }
          }
          return false;
        }, 3);
      }
      
      return false;
    });

    // Solution for database errors
    this.errorSolutions.set(ErrorType.DATABASE_ERROR, async (error) => {
      console.log('Attempting to fix database error:', error.message);
      
      // For connection issues, try to reconnect
      if (/connection|timeout/i.test(error.message)) {
        try {
          await supabase.auth.refreshSession();
          return true;
        } catch {
          return false;
        }
      }
      
      // For constraint violations, log for manual review
      if (/constraint|violation|duplicate/i.test(error.message)) {
        await this.logErrorToDatabase({
          ...error,
          severity: ErrorSeverity.HIGH,
          requires_manual_review: true
        });
        return false;
      }
      
      return false;
    });

    // Solution for auth errors
    this.errorSolutions.set(ErrorType.AUTH_ERROR, async (error) => {
      console.log('Attempting to fix auth error:', error.message);
      
      // For expired tokens, try to refresh
      if (/expired|invalid token/i.test(error.message)) {
        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          return !refreshError && !!data.session;
        } catch {
          return false;
        }
      }
      
      // For unauthorized errors, redirect to login
      if (/unauthorized|unauthenticated/i.test(error.message)) {
        window.location.href = '/login';
        return true;
      }
      
      return false;
    });

    // Solution for network errors
    this.errorSolutions.set(ErrorType.NETWORK_ERROR, async (error) => {
      console.log('Attempting to fix network error:', error.message);
      
      // Check if online and retry
      if (navigator.onLine) {
        return await this.retryWithBackoff(async () => {
          if (error.context?.request) {
            try {
              const response = await fetch(error.context.request.url, error.context.request);
              return response.ok;
            } catch {
              return false;
            }
          }
          return false;
        }, 3);
      } else {
        // If offline, queue for later and show offline message
        this.queueForOffline(error);
        return true; // Handled (though not fixed)
      }
    });
  }

  // Classify error type using patterns
  private classifyError(error: Error): ErrorType {
    const errorMessage = error.message + ' ' + (error.stack || '');
    
    // Try pattern matching
    for (const [type, patterns] of this.errorPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(errorMessage)) {
          return type as ErrorType;
        }
      }
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  // Determine error severity
  private determineSeverity(error: ErrorData): ErrorSeverity {
    // Auth errors are usually high severity
    if (error.type === ErrorType.AUTH_ERROR) {
      return ErrorSeverity.HIGH;
    }
    
    // Database errors can be critical
    if (error.type === ErrorType.DATABASE_ERROR) {
      if (/constraint|violation|integrity/i.test(error.message)) {
        return ErrorSeverity.HIGH;
      }
      return ErrorSeverity.MEDIUM;
    }
    
    // Network errors depend on the context
    if (error.type === ErrorType.NETWORK_ERROR) {
      if (error.context?.isImportantOperation) {
        return ErrorSeverity.HIGH;
      }
      return ErrorSeverity.MEDIUM;
    }
    
    // API errors are usually medium
    if (error.type === ErrorType.API_ERROR) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Validation errors are usually low
    if (error.type === ErrorType.VALIDATION_ERROR) {
      return ErrorSeverity.LOW;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  // Log error to database for analysis
  private async logErrorToDatabase(error: ErrorData & { requires_manual_review?: boolean }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('error_logs').insert([{
        error_type: error.type,
        message: error.message,
        stack: error.stack,
        context: error.context,
        user_id: user?.id || error.userId,
        severity: error.severity,
        requires_manual_review: error.requires_manual_review || false,
        created_at: new Date().toISOString()
      }]);
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
      // Store locally if database logging fails
      this.storeErrorLocally(error);
    }
  }

  // Store error locally if offline or database logging fails
  private storeErrorLocally(error: ErrorData) {
    try {
      const storedErrors = localStorage.getItem('error_logs');
      const errors = storedErrors ? JSON.parse(storedErrors) : [];
      errors.push({
        ...error,
        stored_at: new Date().toISOString()
      });
      localStorage.setItem('error_logs', JSON.stringify(errors.slice(-100))); // Keep last 100 errors
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  // Queue operations for when back online
  private queueForOffline(error: ErrorData) {
    if (error.context?.request) {
      try {
        const offlineQueue = localStorage.getItem('offline_queue');
        const queue = offlineQueue ? JSON.parse(offlineQueue) : [];
        queue.push({
          request: error.context.request,
          timestamp: Date.now()
        });
        localStorage.setItem('offline_queue', JSON.stringify(queue));
      } catch (e) {
        console.error('Failed to queue operation for offline:', e);
      }
    }
  }

  // Process offline queue when back online
  public async processOfflineQueue() {
    if (!navigator.onLine) return;
    
    try {
      const offlineQueue = localStorage.getItem('offline_queue');
      if (!offlineQueue) return;
      
      const queue = JSON.parse(offlineQueue);
      if (queue.length === 0) return;
      
      console.log(`Processing ${queue.length} offline operations`);
      
      const newQueue = [];
      for (const item of queue) {
        try {
          await fetch(item.request.url, item.request);
        } catch (error) {
          // Keep in queue if still failing
          if (Date.now() - item.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
            newQueue.push(item);
          }
        }
      }
      
      localStorage.setItem('offline_queue', JSON.stringify(newQueue));
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  // Retry an operation with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseDelay: number = 300
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  // Main method to handle errors
  public async handleError(error: Error, context?: Record<string, any>): Promise<boolean> {
    try {
      // Get current user if available
      const { data: { user } } = await supabase.auth.getUser();
      
      // Classify error
      const errorType = this.classifyError(error);
      
      // Create error data object
      const errorData: ErrorData = {
        type: errorType,
        message: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now(),
        userId: user?.id
      };
      
      // Determine severity
      errorData.severity = this.determineSeverity(errorData);
      
      // Add to error buffer for training
      if (this.errorBuffer.length < this.maxBufferSize) {
        this.errorBuffer.push(errorData);
      }
      
      // Log error
      await this.logErrorToDatabase(errorData);
      
      // Try to fix the error
      const solution = this.errorSolutions.get(errorType);
      if (solution) {
        const fixed = await solution(errorData);
        if (fixed) {
          console.log(`Successfully fixed ${errorType} error:`, error.message);
          return true;
        }
      }
      
      // If error is critical, show user-friendly message
      if (errorData.severity === ErrorSeverity.CRITICAL || errorData.severity === ErrorSeverity.HIGH) {
        this.showUserFriendlyError(errorData);
      }
      
      return false;
    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
      return false;
    }
  }

  // Show user-friendly error message
  private showUserFriendlyError(error: ErrorData) {
    let message = 'Ocorreu um erro no sistema.';
    
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        message = 'Parece que você está offline. Verifique sua conexão com a internet.';
        break;
      case ErrorType.AUTH_ERROR:
        message = 'Sua sessão expirou ou você não tem permissão para esta ação. Por favor, faça login novamente.';
        break;
      case ErrorType.DATABASE_ERROR:
        message = 'Ocorreu um erro ao acessar os dados. Por favor, tente novamente mais tarde.';
        break;
      case ErrorType.API_ERROR:
        message = 'Não foi possível comunicar com o servidor. Por favor, tente novamente mais tarde.';
        break;
      case ErrorType.VALIDATION_ERROR:
        message = 'Alguns dados informados são inválidos. Por favor, verifique e tente novamente.';
        break;
    }
    
    // Show error message to user (could be a toast, modal, etc.)
    alert(message);
  }

  // Initialize error handling system
  public initialize() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Back online, processing offline queue');
      this.processOfflineQueue();
    });
    
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.handleError(error, { unhandledRejection: true });
    });
    
    // Process any stored offline operations
    if (navigator.onLine) {
      this.processOfflineQueue();
    }
    
    // Sync any locally stored errors
    this.syncLocalErrors();
  }

  // Sync locally stored errors to database when online
  private async syncLocalErrors() {
    if (!navigator.onLine) return;
    
    try {
      const storedErrors = localStorage.getItem('error_logs');
      if (!storedErrors) return;
      
      const errors = JSON.parse(storedErrors);
      if (errors.length === 0) return;
      
      console.log(`Syncing ${errors.length} locally stored errors`);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Batch insert errors
      const { error } = await supabase.from('error_logs').insert(
        errors.map((error: ErrorData & { stored_at: string }) => ({
          error_type: error.type,
          message: error.message,
          stack: error.stack,
          context: error.context,
          user_id: user?.id || error.userId,
          severity: error.severity,
          created_at: error.stored_at,
          synced_at: new Date().toISOString()
        }))
      );
      
      if (!error) {
        // Clear local storage if sync successful
        localStorage.removeItem('error_logs');
      }
    } catch (error) {
      console.error('Error syncing local errors:', error);
    }
  }
}

// Create and export singleton instance
export const errorHandlingService = new ErrorHandlingService();

// Initialize error handling system
errorHandlingService.initialize();