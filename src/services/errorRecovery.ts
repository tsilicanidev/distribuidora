import { supabase } from '../lib/supabase';
import { ErrorType, ErrorSeverity, errorHandlingService } from './errorHandling';
import { errorMonitoringService } from './errorMonitoring';

// Interface for recovery strategy
interface RecoveryStrategy {
  name: string;
  description: string;
  applicableErrors: ErrorType[];
  execute: (error: Error, context?: any) => Promise<boolean>;
  priority: number;
}

// Interface for recovery result
interface RecoveryResult {
  success: boolean;
  strategy: string;
  error?: Error;
  timestamp: number;
}

// AI-powered error recovery service
class ErrorRecoveryService {
  private strategies: RecoveryStrategy[] = [];
  private recoveryHistory: RecoveryResult[] = [];
  private maxHistorySize = 50;

  constructor() {
    this.initializeStrategies();
  }

  // Initialize recovery strategies
  private initializeStrategies() {
    // Session refresh strategy
    this.strategies.push({
      name: 'session_refresh',
      description: 'Refreshes the authentication session',
      applicableErrors: [ErrorType.AUTH_ERROR],
      priority: 10,
      execute: async (error) => {
        try {
          console.log('Attempting session refresh recovery strategy');
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Session refresh failed:', refreshError);
            return false;
          }
          
          return !!data.session;
        } catch (e) {
          console.error('Error in session refresh strategy:', e);
          return false;
        }
      }
    });

    // Network reconnect strategy
    this.strategies.push({
      name: 'network_reconnect',
      description: 'Attempts to reconnect to the network',
      applicableErrors: [ErrorType.NETWORK_ERROR, ErrorType.API_ERROR],
      priority: 20,
      execute: async (error) => {
        try {
          console.log('Attempting network reconnect recovery strategy');
          
          // Check if online
          if (!navigator.onLine) {
            console.log('Device is offline, waiting for connection...');
            
            // Wait for online event with timeout
            const onlinePromise = new Promise<boolean>(resolve => {
              const timeout = setTimeout(() => resolve(false), 30000); // 30 second timeout
              
              const onOnline = () => {
                clearTimeout(timeout);
                window.removeEventListener('online', onOnline);
                resolve(true);
              };
              
              window.addEventListener('online', onOnline);
            });
            
            const isOnline = await onlinePromise;
            if (!isOnline) {
              console.log('Timeout waiting for network connection');
              return false;
            }
          }
          
          // Test connection with a simple request
          try {
            const response = await fetch(window.location.origin, { method: 'HEAD' });
            return response.ok;
          } catch {
            return false;
          }
        } catch (e) {
          console.error('Error in network reconnect strategy:', e);
          return false;
        }
      }
    });

    // Database reconnect strategy
    this.strategies.push({
      name: 'database_reconnect',
      description: 'Attempts to reconnect to the database',
      applicableErrors: [ErrorType.DATABASE_ERROR],
      priority: 15,
      execute: async (error) => {
        try {
          console.log('Attempting database reconnect recovery strategy');
          
          // Try a simple query to test connection
          const { error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (testError) {
            console.error('Database reconnect failed:', testError);
            return false;
          }
          
          return true;
        } catch (e) {
          console.error('Error in database reconnect strategy:', e);
          return false;
        }
      }
    });

    // Form data recovery strategy
    this.strategies.push({
      name: 'form_data_recovery',
      description: 'Recovers form data from local storage',
      applicableErrors: [ErrorType.VALIDATION_ERROR, ErrorType.API_ERROR],
      priority: 30,
      execute: async (error, context) => {
        try {
          console.log('Attempting form data recovery strategy');
          
          if (!context || !context.formId) {
            return false;
          }
          
          // Check if we have saved form data
          const savedData = localStorage.getItem(`form_backup_${context.formId}`);
          if (!savedData) {
            return false;
          }
          
          // Restore form data
          try {
            const formData = JSON.parse(savedData);
            
            // Find form element
            const formElement = document.getElementById(context.formId) as HTMLFormElement;
            if (!formElement) {
              return false;
            }
            
            // Restore form fields
            Object.entries(formData).forEach(([name, value]) => {
              const field = formElement.elements.namedItem(name) as HTMLInputElement;
              if (field) {
                field.value = value as string;
              }
            });
            
            return true;
          } catch {
            return false;
          }
        } catch (e) {
          console.error('Error in form data recovery strategy:', e);
          return false;
        }
      }
    });

    // API retry strategy
    this.strategies.push({
      name: 'api_retry',
      description: 'Retries failed API requests with exponential backoff',
      applicableErrors: [ErrorType.API_ERROR],
      priority: 25,
      execute: async (error, context) => {
        try {
          console.log('Attempting API retry recovery strategy');
          
          if (!context || !context.request) {
            return false;
          }
          
          // Retry with exponential backoff
          let attempt = 0;
          const maxAttempts = 3;
          const baseDelay = 1000;
          
          while (attempt < maxAttempts) {
            try {
              const delay = baseDelay * Math.pow(2, attempt);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              const response = await fetch(context.request.url, context.request);
              if (response.ok) {
                return true;
              }
            } catch {
              // Continue to next attempt
            }
            
            attempt++;
          }
          
          return false;
        } catch (e) {
          console.error('Error in API retry strategy:', e);
          return false;
        }
      }
    });

    // Cache recovery strategy
    this.strategies.push({
      name: 'cache_recovery',
      description: 'Attempts to recover data from cache',
      applicableErrors: [ErrorType.NETWORK_ERROR, ErrorType.API_ERROR],
      priority: 35,
      execute: async (error, context) => {
        try {
          console.log('Attempting cache recovery strategy');
          
          if (!context || !context.cacheKey) {
            return false;
          }
          
          // Try to get data from cache
          const cachedData = localStorage.getItem(`cache_${context.cacheKey}`);
          if (!cachedData) {
            return false;
          }
          
          try {
            // Parse and validate cached data
            const data = JSON.parse(cachedData);
            const timestamp = data.__timestamp;
            
            // Check if cache is still valid (24 hours)
            if (timestamp && Date.now() - timestamp < 24 * 60 * 60 * 1000) {
              // Restore data to context
              if (context.onRestore) {
                await context.onRestore(data);
                return true;
              }
            }
          } catch {
            return false;
          }
          
          return false;
        } catch (e) {
          console.error('Error in cache recovery strategy:', e);
          return false;
        }
      }
    });
  }

  // Attempt to recover from an error
  public async recoverFromError(error: Error, context?: any): Promise<boolean> {
    try {
      // Get applicable strategies sorted by priority
      const applicableStrategies = this.strategies
        .filter(strategy => 
          strategy.applicableErrors.includes(errorHandlingService.classifyError(error))
        )
        .sort((a, b) => a.priority - b.priority);
      
      // Try each strategy in order
      for (const strategy of applicableStrategies) {
        console.log(`Attempting recovery with strategy: ${strategy.name}`);
        
        try {
          const success = await strategy.execute(error, context);
          
          // Record recovery attempt
          this.recordRecoveryAttempt({
            success,
            strategy: strategy.name,
            error: success ? undefined : error,
            timestamp: Date.now()
          });
          
          if (success) {
            console.log(`Recovery successful using strategy: ${strategy.name}`);
            return true;
          }
        } catch (strategyError) {
          console.error(`Error executing recovery strategy ${strategy.name}:`, strategyError);
          
          // Record failed attempt
          this.recordRecoveryAttempt({
            success: false,
            strategy: strategy.name,
            error: strategyError as Error,
            timestamp: Date.now()
          });
        }
      }
      
      console.log('All recovery strategies failed');
      return false;
    } catch (e) {
      console.error('Error in recovery process:', e);
      return false;
    }
  }

  // Record recovery attempt for analysis
  private recordRecoveryAttempt(result: RecoveryResult) {
    this.recoveryHistory.push(result);
    
    // Keep history size limited
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory.shift();
    }
    
    // Log recovery attempt to database
    this.logRecoveryAttempt(result).catch(error => {
      console.error('Failed to log recovery attempt:', error);
    });
  }

  // Log recovery attempt to database
  private async logRecoveryAttempt(result: RecoveryResult) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('recovery_logs').insert([{
        strategy: result.strategy,
        success: result.success,
        error_message: result.error?.message,
        error_stack: result.error?.stack,
        user_id: user?.id,
        created_at: new Date(result.timestamp).toISOString()
      }]);
    } catch (error) {
      console.error('Failed to log recovery attempt to database:', error);
    }
  }

  // Analyze recovery effectiveness
  public async analyzeRecoveryEffectiveness(): Promise<{
    totalAttempts: number;
    successRate: number;
    strategyStats: Record<string, {
      attempts: number;
      successes: number;
      successRate: number;
    }>;
  }> {
    const stats = {
      totalAttempts: this.recoveryHistory.length,
      successRate: 0,
      strategyStats: {} as Record<string, {
        attempts: number;
        successes: number;
        successRate: number;
      }>
    };
    
    // Calculate overall success rate
    const successfulAttempts = this.recoveryHistory.filter(result => result.success).length;
    stats.successRate = this.recoveryHistory.length > 0 
      ? successfulAttempts / this.recoveryHistory.length
      : 0;
    
    // Calculate per-strategy stats
    this.strategies.forEach(strategy => {
      const strategyAttempts = this.recoveryHistory.filter(
        result => result.strategy === strategy.name
      );
      
      const strategySuccesses = strategyAttempts.filter(
        result => result.success
      ).length;
      
      stats.strategyStats[strategy.name] = {
        attempts: strategyAttempts.length,
        successes: strategySuccesses,
        successRate: strategyAttempts.length > 0 
          ? strategySuccesses / strategyAttempts.length
          : 0
      };
    });
    
    return stats;
  }

  // Get recovery recommendations
  public async getRecoveryRecommendations(): Promise<string[]> {
    const stats = await this.analyzeRecoveryEffectiveness();
    const recommendations: string[] = [];
    
    // Analyze overall success rate
    if (stats.successRate < 0.5) {
      recommendations.push(
        'Overall recovery success rate is low. Consider implementing additional recovery strategies.'
      );
    }
    
    // Analyze individual strategies
    Object.entries(stats.strategyStats).forEach(([strategy, strategyStats]) => {
      if (strategyStats.attempts > 0) {
        if (strategyStats.successRate < 0.3) {
          recommendations.push(
            `Strategy "${strategy}" has a low success rate (${(strategyStats.successRate * 100).toFixed(1)}%). Consider revising or replacing this strategy.`
          );
        }
      }
    });
    
    // Check for unused strategies
    this.strategies.forEach(strategy => {
      if (!stats.strategyStats[strategy.name] || stats.strategyStats[strategy.name].attempts === 0) {
        recommendations.push(
          `Strategy "${strategy.name}" has not been used. Consider removing if unnecessary.`
        );
      }
    });
    
    return recommendations;
  }

  // Initialize recovery system
  public initialize() {
    // Monitor for errors that might need recovery
    window.addEventListener('unhandledrejection', async (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      // Attempt recovery
      const recovered = await this.recoverFromError(error);
      
      if (recovered) {
        // If recovered successfully, prevent the error from propagating
        event.preventDefault();
      }
    });
    
    // Monitor for network status changes
    window.addEventListener('online', () => {
      // Attempt to recover any pending operations
      this.recoverPendingOperations();
    });
  }

  // Recover pending operations when back online
  private async recoverPendingOperations() {
    try {
      const pendingOps = localStorage.getItem('pending_operations');
      if (!pendingOps) return;
      
      const operations = JSON.parse(pendingOps);
      const recoveredOps = [];
      
      for (const op of operations) {
        try {
          // Attempt to replay the operation
          const response = await fetch(op.url, op.options);
          if (response.ok) {
            recoveredOps.push(op.id);
          }
        } catch (error) {
          console.error('Failed to recover operation:', error);
        }
      }
      
      // Remove recovered operations
      const remainingOps = operations.filter(op => !recoveredOps.includes(op.id));
      if (remainingOps.length > 0) {
        localStorage.setItem('pending_operations', JSON.stringify(remainingOps));
      } else {
        localStorage.removeItem('pending_operations');
      }
    } catch (error) {
      console.error('Error recovering pending operations:', error);
    }
  }
}

// Create and export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

// Initialize recovery system
errorRecoveryService.initialize();