import { CurrencyPreference, TokenInfo } from '../types';
import { getTokenByMint, getTokenDecimalPlaces } from './tokens';
import { SECURITY_CONFIG, calculateBackoffDelay } from './security-config';

// Jupiter API endpoint for price data
const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';

// Jupiter API Response Types for validation
interface JupiterPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

interface JupiterApiResponse {
  data: Record<string, JupiterPriceData>;
  timeTaken: number;
}

// Enhanced cache with size limits and cleanup
interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdated: number;
  size: number;
}

let exchangeRateCache: ExchangeRateCache = {
  rates: {},
  lastUpdated: 0,
  size: 0
};

// Use centralized cache duration
const CACHE_DURATION = SECURITY_CONFIG.MEMORY_LIMITS.EXCHANGE_RATE_CACHE_TTL_MS;

// Fallback exchange rates in case Jupiter API is unavailable
const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  'SOL': 100,    // 1 SOL = $100 USD
  'USDC': 1,     // 1 USDC = $1 USD
  'USDT': 1,     // 1 USDT = $1 USD
  'mSOL': 98,    // 1 mSOL = $98 USD
  'ETH': 2500,   // 1 ETH = $2500 USD
  'BTC': 45000,  // 1 BTC = $45000 USD
  'BONK': 0.000025, // 1 BONK = $0.000025 USD
  'JUP': 0.75,   // 1 JUP = $0.75 USD
};

// Token mint addresses for Jupiter API
const TOKEN_MINTS: Record<string, string> = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'mSOL': 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  'ETH': '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
  'BTC': '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
};

/**
 * Validate Jupiter API response structure and content
 */
const validateJupiterResponse = (data: any): data is JupiterApiResponse => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  if (!data.data || typeof data.data !== 'object') {
    return false;
  }
  
  // Validate each price entry
  for (const [mintAddress, priceData] of Object.entries(data.data)) {
    if (!priceData || typeof priceData !== 'object') {
      continue;
    }
    
    const price = (priceData as any).price;
    if (typeof price !== 'number' ||
        isNaN(price) ||
        price < SECURITY_CONFIG.JUPITER_API.MIN_PRICE_VALUE ||
        price > SECURITY_CONFIG.JUPITER_API.MAX_PRICE_VALUE) {
      console.warn(`Invalid price for ${mintAddress}: ${price}`);
      continue;
    }
  }
  
  return true;
};

/**
 * Fetch exchange rates from Jupiter Price API with enhanced security
 */
export const fetchExchangeRatesFromJupiter = async (retryCount = 0): Promise<Record<string, number>> => {
  try {
    // Get all token mint addresses we want to fetch
    const mints = Object.values(TOKEN_MINTS);
    
    // Create query string for Jupiter API
    const queryParams = mints.map(mint => `ids=${mint}`).join('&');
    const url = `${JUPITER_PRICE_API}?${queryParams}`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SECURITY_CONFIG.JUPITER_API.TIMEOUT_MS);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 429 && retryCount < SECURITY_CONFIG.JUPITER_API.MAX_RETRIES) {
        // Rate limited - use exponential backoff
        const delay = calculateBackoffDelay(
          retryCount,
          SECURITY_CONFIG.JUPITER_API.RETRY_DELAY_BASE_MS,
          SECURITY_CONFIG.JUPITER_API.RETRY_DELAY_MAX_MS
        );
        console.warn(`Jupiter API rate limited, retrying in ${delay}ms (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchExchangeRatesFromJupiter(retryCount + 1);
      }
      throw new Error(`Jupiter API HTTP error: ${response.status} ${response.statusText}`);
    }
    
    // Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!validateJupiterResponse(data)) {
      throw new Error('Invalid Jupiter API response structure');
    }
    
    const rates: Record<string, number> = {};
    
    // Map the response back to our token symbols with validation
    for (const [symbol, mint] of Object.entries(TOKEN_MINTS)) {
      const priceData = data.data[mint];
      if (priceData &&
          typeof priceData.price === 'number' &&
          !isNaN(priceData.price) &&
          priceData.price >= SECURITY_CONFIG.JUPITER_API.MIN_PRICE_VALUE &&
          priceData.price <= SECURITY_CONFIG.JUPITER_API.MAX_PRICE_VALUE) {
        rates[symbol] = priceData.price;
      } else {
        // Use fallback rate if Jupiter doesn't have valid price
        rates[symbol] = FALLBACK_EXCHANGE_RATES[symbol] || 0;
        console.warn(`Using fallback rate for ${symbol}: ${rates[symbol]}`);
      }
    }
    
    return rates;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Jupiter API request timed out, using fallback rates');
      } else if (retryCount < SECURITY_CONFIG.JUPITER_API.MAX_RETRIES) {
        const delay = calculateBackoffDelay(
          retryCount,
          SECURITY_CONFIG.JUPITER_API.RETRY_DELAY_BASE_MS,
          SECURITY_CONFIG.JUPITER_API.RETRY_DELAY_MAX_MS
        );
        console.warn(`Jupiter API error, retrying in ${delay}ms (attempt ${retryCount + 1}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchExchangeRatesFromJupiter(retryCount + 1);
      } else {
        console.warn('Failed to fetch exchange rates from Jupiter after retries, using fallback rates:', error.message);
      }
    } else {
      console.warn('Failed to fetch exchange rates from Jupiter, using fallback rates:', error);
    }
    return FALLBACK_EXCHANGE_RATES;
  }
};

/**
 * Clean up cache if it exceeds size limits
 */
const cleanupCache = (): void => {
  if (exchangeRateCache.size > SECURITY_CONFIG.MEMORY_LIMITS.EXCHANGE_RATE_CACHE_MAX_SIZE) {
    console.warn('Exchange rate cache size limit exceeded, clearing cache');
    exchangeRateCache = {
      rates: {},
      lastUpdated: 0,
      size: 0
    };
  }
};

/**
 * Get current exchange rates (cached or fresh from Jupiter) with enhanced caching
 */
export const getExchangeRates = async (): Promise<Record<string, number>> => {
  const now = Date.now();
  
  // Clean up cache if needed
  cleanupCache();
  
  // Return cached rates if they're still valid
  if (exchangeRateCache.lastUpdated > 0 &&
      now - exchangeRateCache.lastUpdated < CACHE_DURATION &&
      Object.keys(exchangeRateCache.rates).length > 0) {
    return exchangeRateCache.rates;
  }
  
  // Fetch fresh rates from Jupiter
  const rates = await fetchExchangeRatesFromJupiter();
  
  // Update cache with size tracking
  exchangeRateCache = {
    rates,
    lastUpdated: now,
    size: Object.keys(rates).length
  };
  
  return rates;
};

export const convertTokenToBaseCurrency = async (
  amount: number,
  token: TokenInfo,
  currencyPreference: CurrencyPreference
): Promise<number> => {
  const exchangeRates = await getExchangeRates();
  
  if (currencyPreference.baseCurrency === 'SOL') {
    // Convert to SOL
    if (token.symbol === 'SOL') {
      return amount;
    }
    
    // Get USD value first, then convert to SOL
    const usdRate = exchangeRates[token.symbol] || 0;
    const usdValue = amount * usdRate;
    const solRate = exchangeRates['SOL'] || 100;
    return usdValue / solRate;
  } else {
    // Convert to USD
    const rate = exchangeRates[token.symbol] || 0;
    return amount * rate;
  }
};

// Synchronous version for cases where we already have cached rates
export const convertTokenToBaseCurrencySync = (
  amount: number,
  token: TokenInfo,
  currencyPreference: CurrencyPreference,
  cachedRates?: Record<string, number>
): number => {
  const exchangeRates = cachedRates || exchangeRateCache.rates;
  
  if (currencyPreference.baseCurrency === 'SOL') {
    // Convert to SOL
    if (token.symbol === 'SOL') {
      return amount;
    }
    
    // Get USD value first, then convert to SOL
    const usdRate = exchangeRates[token.symbol] || FALLBACK_EXCHANGE_RATES[token.symbol] || 0;
    const usdValue = amount * usdRate;
    const solRate = exchangeRates['SOL'] || FALLBACK_EXCHANGE_RATES['SOL'] || 100;
    return usdValue / solRate;
  } else {
    // Convert to USD
    const rate = exchangeRates[token.symbol] || FALLBACK_EXCHANGE_RATES[token.symbol] || 0;
    return amount * rate;
  }
};

export const formatCurrencyAmount = (
  amount: number,
  baseCurrency: 'SOL' | 'USD'
): string => {
  if (baseCurrency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } else {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount)} SOL`;
  }
};

export const getExchangeRate = async (tokenSymbol: string): Promise<number> => {
  const exchangeRates = await getExchangeRates();
  return exchangeRates[tokenSymbol] || 0;
};

export const getExchangeRateSync = (tokenSymbol: string, cachedRates?: Record<string, number>): number => {
  const exchangeRates = cachedRates || exchangeRateCache.rates;
  return exchangeRates[tokenSymbol] || FALLBACK_EXCHANGE_RATES[tokenSymbol] || 0;
};

export const formatTokenAmountWithCurrency = (
  amount: number,
  token: TokenInfo,
  currencyPreference: CurrencyPreference,
  showOriginal: boolean = false,
  cachedRates?: Record<string, number>
): string => {
  const isStablecoin = token.symbol === 'USDC' || token.symbol === 'USDT';
  const decimalPlaces = getTokenDecimalPlaces(token.symbol);

  const originalAmountFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);

  const originalAmount = `${originalAmountFormatted} ${token.symbol}`;

  if (showOriginal || (currencyPreference.baseCurrency === 'SOL' && token.symbol === 'SOL')) {
    return originalAmount;
  }

  const convertedAmount = convertTokenToBaseCurrencySync(amount, token, currencyPreference, cachedRates);
  const formattedConverted = formatCurrencyAmount(convertedAmount, currencyPreference.baseCurrency);

  if (isStablecoin && currencyPreference.baseCurrency === 'USD') {
    return formattedConverted;
  }

  return `${formattedConverted}<br /><span class="text-xs text-gray-500 dark:text-gray-400">(${originalAmount})</span>`;
};

/**
 * Initialize exchange rates cache - call this when the app starts
 */
export const initializeExchangeRates = async (): Promise<void> => {
  try {
    await getExchangeRates();
  } catch (error) {
    console.warn('Failed to initialize exchange rates:', error);
  }
};

/**
 * Get cached exchange rates for synchronous operations
 */
export const getCachedExchangeRates = (): Record<string, number> => {
  return Object.keys(exchangeRateCache.rates).length > 0
    ? exchangeRateCache.rates
    : FALLBACK_EXCHANGE_RATES;
};