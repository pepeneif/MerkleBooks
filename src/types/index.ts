export interface Transaction {
  id: string;
  signature: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  notes?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  fromAddress?: string;
  toAddress?: string;
  classified: boolean;
  token: TokenInfo;
}

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface WalletConfig {
  id: string;
  address: string;
  name: string;
  isActive: boolean;
  balance: number;
}

export interface Invoice {
  id: string;
  recipient: string;
  amount: number;
  description: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  createdAt: Date;
  dueDate?: Date;
  paidAt?: Date;
  transactionId?: string;
  token: TokenInfo;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export interface TokenFilter {
  enabled: boolean;
  selectedTokens: string[]; // Array of token mint addresses
}

export interface RPCConfig {
  endpoint: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet' | 'custom';
  name: string;
}

export interface CurrencyPreference {
  baseCurrency: 'SOL' | 'USD';
  exchangeRates?: {
    [key: string]: number; // Token symbol to base currency rate
  };
  lastUpdated?: Date;
}