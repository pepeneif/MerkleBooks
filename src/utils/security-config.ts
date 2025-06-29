/**
 * Centralized Security Configuration
 * Contains all security-related constants and limits
 */

export const SECURITY_CONFIG = {
  // API Security
  JUPITER_API: {
    TIMEOUT_MS: 10000,
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE_MS: 1000,
    RETRY_DELAY_MAX_MS: 30000,
    MAX_PRICE_VALUE: 1000000, // $1M max reasonable price per token
    MIN_PRICE_VALUE: 0.0000001, // Minimum reasonable price
  },
  
  // Rate Limiting
  RATE_LIMITING: {
    WALLET_QUEUE_DELAY_BASE_MS: 1000,
    WALLET_QUEUE_DELAY_MAX_MS: 30000,
    WALLET_QUEUE_MAX_RETRIES: 3,
    TRANSACTION_BATCH_SIZE: 10,
    TRANSACTION_BATCH_DELAY_MS: 500,
    RPC_REQUEST_TIMEOUT_MS: 15000,
  },
  
  // Processing Limits
  PROCESSING_LIMITS: {
    SPL_TOKEN_ACCOUNTS_MAX: 5, // Maximum SPL token accounts to process per wallet
    SPL_SIGNATURES_PER_ACCOUNT_MAX: 20, // Maximum signatures to fetch per token account
  },
  
  // Validation Limits
  VALIDATION_LIMITS: {
    MAX_TOKEN_AMOUNT: 1000000000, // 1 billion tokens max (prevents overflow)
    DUST_THRESHOLD: 0.000001, // Minimum transaction amount to process
  },
  
  // Input Validation
  INPUT_VALIDATION: {
    DUST_THRESHOLD_MIN: 0.000001,
    DUST_THRESHOLD_MAX: 1000,
    WALLET_NAME_MAX_LENGTH: 100,
    WALLET_NAME_MIN_LENGTH: 1,
    NOTES_MAX_LENGTH: 1000,
    CATEGORY_NAME_MAX_LENGTH: 50,
  },
  
  // Memory Management
  MEMORY_LIMITS: {
    TRANSACTION_CACHE_MAX_SIZE: 10000,
    EXCHANGE_RATE_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
    EXCHANGE_RATE_CACHE_MAX_SIZE: 100,
    WALLET_QUEUE_MAX_SIZE: 50,
  },
  
  // Error Handling
  ERROR_HANDLING: {
    MAX_CONSOLE_LOG_LENGTH: 1000,
    SENSITIVE_FIELDS: ['privateKey', 'seed', 'mnemonic', 'apiKey', 'token'],
    LOG_LEVEL: 'warn' as 'debug' | 'info' | 'warn' | 'error',
  },
} as const;

// Type-safe configuration access
export type SecurityConfig = typeof SECURITY_CONFIG;

// Validation functions
export const validateDustThreshold = (value: number): boolean => {
  return !isNaN(value) && 
         value >= SECURITY_CONFIG.INPUT_VALIDATION.DUST_THRESHOLD_MIN && 
         value <= SECURITY_CONFIG.INPUT_VALIDATION.DUST_THRESHOLD_MAX;
};

export const validateWalletName = (name: string): boolean => {
  return typeof name === 'string' && 
         name.length >= SECURITY_CONFIG.INPUT_VALIDATION.WALLET_NAME_MIN_LENGTH && 
         name.length <= SECURITY_CONFIG.INPUT_VALIDATION.WALLET_NAME_MAX_LENGTH;
};

export const validateNotes = (notes: string): boolean => {
  return typeof notes === 'string' && 
         notes.length <= SECURITY_CONFIG.INPUT_VALIDATION.NOTES_MAX_LENGTH;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Exponential backoff calculation
export const calculateBackoffDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};