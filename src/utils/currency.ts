import { CurrencyPreference, TokenInfo } from '../types';

// Mock exchange rates - in a real app, these would come from an API
const MOCK_EXCHANGE_RATES: Record<string, number> = {
  'SOL': 100,    // 1 SOL = $100 USD
  'USDC': 1,     // 1 USDC = $1 USD
  'USDT': 1,     // 1 USDT = $1 USD
  'mSOL': 98,    // 1 mSOL = $98 USD
  'ETH': 2500,   // 1 ETH = $2500 USD
  'BTC': 45000,  // 1 BTC = $45000 USD
  'BONK': 0.000025, // 1 BONK = $0.000025 USD
  'JUP': 0.75,   // 1 JUP = $0.75 USD
};

export const convertTokenToBaseCurrency = (
  amount: number,
  token: TokenInfo,
  currencyPreference: CurrencyPreference
): number => {
  if (currencyPreference.baseCurrency === 'SOL') {
    // Convert to SOL
    if (token.symbol === 'SOL') {
      return amount;
    }
    
    // Get USD value first, then convert to SOL
    const usdRate = MOCK_EXCHANGE_RATES[token.symbol] || 0;
    const usdValue = amount * usdRate;
    const solRate = MOCK_EXCHANGE_RATES['SOL'] || 100;
    return usdValue / solRate;
  } else {
    // Convert to USD
    const rate = MOCK_EXCHANGE_RATES[token.symbol] || 0;
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

export const getExchangeRate = (tokenSymbol: string): number => {
  return MOCK_EXCHANGE_RATES[tokenSymbol] || 0;
};

export const formatTokenAmountWithCurrency = (
  amount: number,
  token: TokenInfo,
  currencyPreference: CurrencyPreference,
  showOriginal: boolean = false
): string => {
  const originalAmount = `${amount.toFixed(Math.min(token.decimals, 6))} ${token.symbol}`;
  
  if (showOriginal || currencyPreference.baseCurrency === 'SOL' && token.symbol === 'SOL') {
    return originalAmount;
  }
  
  const convertedAmount = convertTokenToBaseCurrency(amount, token, currencyPreference);
  const formattedConverted = formatCurrencyAmount(convertedAmount, currencyPreference.baseCurrency);
  
  return `${formattedConverted} (${originalAmount})`;
};