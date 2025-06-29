import { Transaction, Invoice, WalletConfig, RPCConfig, CurrencyPreference, Category } from '../types';

export interface AppData {
  transactions: Transaction[];
  invoices: Invoice[];
  walletConfigs: WalletConfig[];
  categories: Category[];
  rpcConfig?: RPCConfig;
  currencyPreference?: CurrencyPreference;
  version: string;
  exportDate: string;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'solbooks_transactions',
  INVOICES: 'solbooks_invoices',
  WALLET_CONFIGS: 'solbooks_wallet_configs',
  RPC_CONFIG: 'solbooks_rpc_config',
  AUTO_REFRESH: 'solbooks_auto_refresh',
  CURRENCY_PREFERENCE: 'solbooks_currency_preference',
  CATEGORIES: 'solbooks_categories',
  DUST_THRESHOLD_STABLE: 'solbooks_dust_threshold_stable',
  DUST_THRESHOLD_OTHER: 'solbooks_dust_threshold_other',
} as const;

// Transaction storage
export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions:', error);
  }
};

export const loadTransactions = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!stored) return [];
    
    const transactions = JSON.parse(stored);
    // Convert timestamp strings back to Date objects and ensure token info exists
    return transactions.map((tx: any) => ({
      ...tx,
      timestamp: new Date(tx.timestamp),
      // Ensure token info exists for backward compatibility
      token: tx.token || {
        mint: 'native',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      }
    }));
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
};

// Invoice storage
export const saveInvoices = (invoices: Invoice[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (error) {
    console.error('Failed to save invoices:', error);
  }
};

export const loadInvoices = (): Invoice[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!stored) return [];
    
    const invoices = JSON.parse(stored);
    // Convert date strings back to Date objects and ensure token info exists
    return invoices.map((invoice: any) => ({
      ...invoice,
      createdAt: new Date(invoice.createdAt),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined,
      // Ensure token info exists for backward compatibility
      token: invoice.token || {
        mint: 'native',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      }
    }));
  } catch (error) {
    console.error('Failed to load invoices:', error);
    return [];
  }
};

// Category storage
export const saveCategories = (categories: Category[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (error) {
    console.error('Failed to save categories:', error);
  }
};

export const loadCategories = (): Category[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    
    if (!stored) {
      return getDefaultCategories();
    }
    
    const parsed = JSON.parse(stored);
    return parsed;
  } catch (error) {
    console.error('Failed to load categories:', error);
    return getDefaultCategories();
  }
};

// Default categories
export const getDefaultCategories = (): Category[] => {
  return [
    { id: '1', name: 'Salary', description: 'Regular employment income and wages', type: 'income', color: '#10b981', icon: '💰' },
    { id: '2', name: 'Investment', description: 'Returns from traditional investments and portfolio gains', type: 'income', color: '#3b82f6', icon: '📈' },
    { id: '3', name: 'Trading', description: 'Profits from cryptocurrency and token trading', type: 'income', color: '#8b5cf6', icon: '💹' },
    { id: '4', name: 'DeFi Rewards', description: 'Staking rewards, liquidity mining, and yield farming', type: 'income', color: '#06b6d4', icon: '🏆' },
    { id: '5', name: 'NFT Sales', description: 'Income from selling NFTs and digital collectibles', type: 'income', color: '#f59e0b', icon: '🖼️' },
    { id: '6', name: 'Office Supplies', description: 'Business equipment, stationery, and office materials', type: 'expense', color: '#ef4444', icon: '📎' },
    { id: '7', name: 'Marketing', description: 'Advertising, promotion, and marketing campaign costs', type: 'expense', color: '#f97316', icon: '📢' },
    { id: '8', name: 'Software', description: 'Software licenses, SaaS subscriptions, and development tools', type: 'expense', color: '#84cc16', icon: '💻' },
    { id: '9', name: 'Transaction Fees', description: 'Blockchain gas fees and transaction costs', type: 'expense', color: '#6b7280', icon: '⛽' },
    { id: '10', name: 'Other', description: 'Miscellaneous expenses that don\'t fit other categories', type: 'expense', color: '#64748b', icon: '📋' },
    { id: '11', name: 'Uncategorized', description: 'Transactions that haven\'t been classified yet', type: 'neutral', color: '#9ca3af', icon: '❓' }
  ];
};

// Wallet config storage
export const saveWalletConfigs = (configs: WalletConfig[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.WALLET_CONFIGS, JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to save wallet configs:', error);
  }
};

export const loadWalletConfigs = (): WalletConfig[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WALLET_CONFIGS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load wallet configs:', error);
    return [];
  }
};

// RPC config storage
export const saveRPCConfig = (config: RPCConfig) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RPC_CONFIG, JSON.stringify(config));
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('rpcConfigChanged', { detail: config }));
  } catch (error) {
    console.error('Failed to save RPC config:', error);
  }
};

export const loadRPCConfig = (): RPCConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RPC_CONFIG);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load RPC config:', error);
  }
  
  // Default RPC config
  return {
    endpoint: 'https://api.devnet.solana.com',
    network: 'devnet',
    name: 'Solana Devnet (Default)'
  };
};

// Export all data
export const exportData = (): string => {
  const data: AppData = {
    transactions: loadTransactions(),
    invoices: loadInvoices(),
    walletConfigs: loadWalletConfigs(),
    categories: loadCategories(),
    rpcConfig: loadRPCConfig(),
    currencyPreference: loadCurrencyPreference(),
    version: '1.0.0',
    exportDate: new Date().toISOString(),
  };
  
  return JSON.stringify(data, null, 2);
};

// Import data
export const importData = (jsonData: string): { success: boolean; error?: string } => {
  try {
    const data: AppData = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data.transactions || !data.invoices || !data.walletConfigs) {
      return { success: false, error: 'Invalid data format' };
    }
    
    // Save imported data
    saveTransactions(data.transactions);
    saveInvoices(data.invoices);
    saveWalletConfigs(data.walletConfigs);
    
    // Import categories if available, otherwise use defaults
    if (data.categories) {
      saveCategories(data.categories);
    }
    
    // Import RPC config if available
    if (data.rpcConfig) {
      saveRPCConfig(data.rpcConfig);
    }
    
    // Import currency preference if available
    if (data.currencyPreference) {
      saveCurrencyPreference(data.currencyPreference);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to parse JSON data' };
  }
};

// Auto-refresh setting storage
export const saveAutoRefreshSetting = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_REFRESH, JSON.stringify(enabled));
  } catch (error) {
    console.error('Failed to save auto-refresh setting:', error);
  }
};

export const loadAutoRefreshSetting = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTO_REFRESH);
    return stored ? JSON.parse(stored) : false; // Default to false (disabled)
  } catch (error) {
    console.error('Failed to load auto-refresh setting:', error);
    return false; // Default to false on error
  }
};

// Dust threshold storage
export const saveDustThreshold = (threshold: number, type: 'stable' | 'other') => {
  try {
    const key = type === 'stable' ? STORAGE_KEYS.DUST_THRESHOLD_STABLE : STORAGE_KEYS.DUST_THRESHOLD_OTHER;
    localStorage.setItem(key, JSON.stringify(threshold));
  } catch (error) {
    console.error(`Failed to save dust threshold for ${type}:`, error);
  }
};

export const loadDustThreshold = (type: 'stable' | 'other'): number => {
  try {
    const key = type === 'stable' ? STORAGE_KEYS.DUST_THRESHOLD_STABLE : STORAGE_KEYS.DUST_THRESHOLD_OTHER;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : (type === 'stable' ? 0.001 : 0.00001);
  } catch (error) {
    console.error(`Failed to load dust threshold for ${type}:`, error);
    return type === 'stable' ? 0.01 : 0.001;
  }
};

// Currency preference storage
export const saveCurrencyPreference = (preference: CurrencyPreference) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENCY_PREFERENCE, JSON.stringify(preference));
  } catch (error) {
    console.error('Failed to save currency preference:', error);
  }
};

export const loadCurrencyPreference = (): CurrencyPreference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENCY_PREFERENCE);
    if (stored) {
      const preference = JSON.parse(stored);
      return {
        ...preference,
        lastUpdated: preference.lastUpdated ? new Date(preference.lastUpdated) : undefined
      };
    }
  } catch (error) {
    console.error('Failed to load currency preference:', error);
  }
  
  // Default currency preference
  return {
    baseCurrency: 'SOL',
    exchangeRates: {},
    lastUpdated: undefined
  };
};

// Clear all data
export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.WALLET_CONFIGS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.RPC_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.AUTO_REFRESH);
    localStorage.removeItem(STORAGE_KEYS.CURRENCY_PREFERENCE);
    localStorage.removeItem('solbooks_token_filter');
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
};