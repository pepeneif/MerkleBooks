import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SECURITY_CONFIG } from '../utils/security-config';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary for Currency and API Operations
 * Provides graceful error handling with security considerations
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with security considerations
    this.logErrorSecurely(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private logErrorSecurely(error: Error, errorInfo: ErrorInfo) {
    // Create sanitized error info that doesn't include sensitive data
    const sanitizedError = {
      message: error.message?.substring(0, SECURITY_CONFIG.ERROR_HANDLING.MAX_CONSOLE_LOG_LENGTH),
      name: error.name,
      stack: this.sanitizeStack(error.stack),
      componentStack: errorInfo.componentStack?.substring(0, SECURITY_CONFIG.ERROR_HANDLING.MAX_CONSOLE_LOG_LENGTH),
      timestamp: new Date().toISOString(),
    };

    // Only log if log level permits
    if (this.shouldLog('error')) {
      console.error('ErrorBoundary caught an error:', sanitizedError);
    }
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    // Remove potentially sensitive information from stack traces
    let sanitizedStack = stack;
    
    // Remove sensitive fields that might appear in stack traces
    SECURITY_CONFIG.ERROR_HANDLING.SENSITIVE_FIELDS.forEach(field => {
      const regex = new RegExp(`${field}[=:]\\s*[^\\s,}]+`, 'gi');
      sanitizedStack = sanitizedStack.replace(regex, `${field}=***`);
    });
    
    return sanitizedStack.substring(0, SECURITY_CONFIG.ERROR_HANDLING.MAX_CONSOLE_LOG_LENGTH);
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[SECURITY_CONFIG.ERROR_HANDLING.LOG_LEVEL];
    const targetLevel = levels[level];
    return targetLevel >= currentLevel;
  }

  private handleRefresh = () => {
    if (this.props.onRefresh) {
      this.props.onRefresh();
    }
    
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = "Something went wrong",
        fallbackMessage = "An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.",
        showRefresh = true,
      } = this.props;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {fallbackTitle}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              {fallbackMessage}
            </p>
            
            {showRefresh && (
              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            )}
            
            {/* Development error details - only shown in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 overflow-auto max-h-32 text-xs">
                        {this.sanitizeStack(this.state.error.stack)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Currency Error Boundary - Specialized for currency operations
 */
export function CurrencyErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackTitle="Currency Data Unavailable"
      fallbackMessage="Unable to load currency exchange rates. The app will continue to work, but some currency conversions may not be available."
      showRefresh={true}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Transaction Error Boundary - Specialized for transaction operations  
 */
export function TransactionErrorBoundary({ 
  children, 
  onRefresh 
}: { 
  children: ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <ErrorBoundary
      fallbackTitle="Transaction Loading Error"
      fallbackMessage="Unable to load transaction data. Please check your internet connection and try again."
      showRefresh={true}
      onRefresh={onRefresh}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Settings Error Boundary - Specialized for settings operations
 */
export function SettingsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackTitle="Settings Error"
      fallbackMessage="Unable to load or save settings. Your configuration may not be preserved."
      showRefresh={true}
    >
      {children}
    </ErrorBoundary>
  );
}