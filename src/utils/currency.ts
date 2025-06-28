import { CurrencyPreference, TokenInfo } from '../types';
import { getTokenByMint } from './tokens';

// Jupiter API endpoint for price data
const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';

// Cache for exchange rates to avoid excessive API calls
interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdated: number;
}

let exchangeRateCache: ExchangeRateCache = {
  rates: {},
  lastUpdated: 0
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

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
 * Fetch exchange rates from Jupiter Price API
 */
export const fetchExchangeRatesFromJupiter = async (): Promise<Record<string, number>> => {
  try {
    // Get all token mint addresses we want to fetch
    const mints = Object.values(TOKEN_MINTS);
    
    // Create query string for Jupiter API
    const queryParams = mints.map(mint => `ids=${mint}`).join('&');
    const response = await fetch(`${JUPITER_PRICE_API}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }
    
    const data = await response.json();
    const rates: Record<string, number> = {};
    
    // Map the response back to our token symbols
    for (const [symbol, mint] of Object.entries(TOKEN_MINTS)) {
      const priceData = data.data[mint];
      if (priceData && priceData.price) {
        rates[symbol] = priceData.price;
      } else {
        // Use fallback rate if Jupiter doesn't have the price
        rates[symbol] = FALLBACK_EXCHANGE_RATES[symbol] || 0;
      }
    }
    
    return rates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates from Jupiter, using fallback rates:', error);
    return FALLBACK_EXCHANGE_RATES;
  }
};

/**
 * Get current exchange rates (cached or fresh from Jupiter)
 */
export const getExchangeRates = async (): Promise<Record<string, number>> => {
  const now = Date.now();
  
  // Return cached rates if they're still valid
  if (exchangeRateCache.lastUpdated > 0 &&
      now - exchangeRateCache.lastUpdated < CACHE_DURATION &&
      Object.keys(exchangeRateCache.rates).length > 0) {
    return exchangeRateCache.rates;
  }
  
  // Fetch fresh rates from Jupiter
  const rates = await fetchExchangeRatesFromJupiter();
  
  // Update cache
  exchangeRateCache = {
    rates,
    lastUpdated: now
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
      maximumFractionDigits: 6,
    }).format(amount);
  } else {
    return `${amount.toFixed(6)} SOL`;
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
  const originalAmount = `${amount.toFixed(Math.min(token.decimals, 6))} ${token.symbol}`;
  
  if (showOriginal || currencyPreference.baseCurrency === 'SOL' && token.symbol === 'SOL') {
    return originalAmount;
  }
  
  const convertedAmount = convertTokenToBaseCurrencySync(amount, token, currencyPreference, cachedRates);
  const formattedConverted = formatCurrencyAmount(convertedAmount, currencyPreference.baseCurrency);
  
  return `${formattedConverted} (${originalAmount})`;
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