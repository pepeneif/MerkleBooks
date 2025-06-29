import React, { useState, useEffect } from 'react';
import { WalletConnection } from './WalletConnection';
import { TokenSelector } from './TokenSelector';
import { useTransactions } from '../hooks/useTransactions';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw, Receipt, PieChart, Plus, Settings as SettingsIcon, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatTokenAmount } from '../utils/tokens';
import { convertTokenToBaseCurrencySync, formatCurrencyAmount, formatTokenAmountWithCurrency } from '../utils/currency';
import { loadCurrencyPreference, saveWalletConfigs, loadWalletConfigs } from '../utils/storage';
import { CurrencyPreference, WalletConfig } from '../types';
import { PublicKey } from '@solana/web3.js';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

export function Dashboard({ onPageChange }: DashboardProps) {
  const { connected } = useWallet();
  const [currencyPreference, setCurrencyPreference] = useState<CurrencyPreference>(() => loadCurrencyPreference());
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [newWallet, setNewWallet] = useState({ address: '', name: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    allTransactions,
    loading,
    fetchAllTransactions,
    tokenFilter,
    setTokenFilter
  } = useTransactions();

  // Load wallet configs from localStorage on mount
  useEffect(() => {
    if (!isInitialized) {
      try {
        const savedWallets = loadWalletConfigs();
        setWallets(savedWallets);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading wallet configs:', error);
        setIsInitialized(true);
      }
    }
  }, [isInitialized]);

  // Save wallet configs to localStorage when wallets change and initialized
  useEffect(() => {
    if (isInitialized && wallets.length >= 0) {
      try {
        saveWalletConfigs(wallets);
      } catch (error) {
        console.error('Error saving wallet configs:', error);
      }
    }
  }, [wallets, isInitialized]);

  // Listen for currency preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrencyPreference(loadCurrencyPreference());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const stats = React.useMemo(() => {
    // Filter transactions based on current filter settings (same logic as useTransactions hook)
    const filteredTransactions = tokenFilter.enabled
      ? allTransactions.filter(t => tokenFilter.selectedTokens.includes(t.token.mint))
      : allTransactions;

    // Group transactions by token
    const tokenStats = filteredTransactions.reduce((acc, t) => {
      const tokenKey = t.token.symbol;
      if (!acc[tokenKey]) {
        acc[tokenKey] = { income: 0, expenses: 0, token: t.token };
      }
      
      if (t.type === 'income') {
        acc[tokenKey].income += t.amount;
      } else {
        acc[tokenKey].expenses += t.amount;
      }
      
      return acc;
    }, {} as Record<string, { income: number; expenses: number; token: any }>);

    // Calculate aggregated stats in base currency
    let totalIncomeConverted = 0;
    let totalExpensesConverted = 0;
    
    Object.values(tokenStats).forEach(tokenData => {
      totalIncomeConverted += convertTokenToBaseCurrencySync(tokenData.income, tokenData.token, currencyPreference);
      totalExpensesConverted += convertTokenToBaseCurrencySync(tokenData.expenses, tokenData.token, currencyPreference);
    });

    const unclassified = allTransactions.filter(t => !t.classified).length;
    const totalTransactions = filteredTransactions.length;

    return {
      tokenStats,
      unclassified,
      totalTransactions,
      totalIncomeConverted,
      totalExpensesConverted,
      netConverted: totalIncomeConverted - totalExpensesConverted
    };
  }, [allTransactions, tokenFilter, currencyPreference]);

  const handleRefresh = () => {
    fetchAllTransactions();
  };

  const addWallet = () => {
    if (!newWallet.address || !newWallet.name) return;

    // Validate Solana address format
    try {
      new PublicKey(newWallet.address);
    } catch (error) {
      alert('Invalid Solana wallet address. Please check the address and try again.');
      return;
    }

    // Check for duplicate addresses
    const isDuplicate = wallets.some(w => w.address === newWallet.address);
    if (isDuplicate) {
      alert('This wallet address is already being monitored.');
      return;
    }

    const wallet: WalletConfig = {
      id: Date.now().toString(),
      address: newWallet.address,
      name: newWallet.name,
      isActive: true,
      balance: 0,
    };

    setWallets(prev => [...prev, wallet]);
    setNewWallet({ address: '', name: '' });
    setShowAddForm(false);
    
    // Trigger transaction refresh after a delay
    setTimeout(() => {
      fetchAllTransactions();
    }, 1000);
  };

  const removeWallet = (id: string) => {
    if (confirm('Are you sure you want to remove this wallet from monitoring?')) {
      setWallets(prev => prev.filter(w => w.id !== id));
    }
  };

  const toggleWallet = (id: string) => {
    setWallets(prev =>
      prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w)
    );
  };

  // Don't render until initialized to prevent hydration issues
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Show wallet setup screen if no wallets are configured
  if (wallets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <SettingsIcon className="w-10 h-10 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Merkle.Space</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Tools to monitor multiple Solana wallets and track transactions in one place.
            <br />
            Let's get started by adding your first wallet.
          </p>
        </div>

        {/* Wallet Setup Section */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 max-w-4xl mx-auto">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Your First Wallet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter your Solana wallet address to start monitoring transactions
                </p>
              </div>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Wallet</span>
                </button>
              )}
            </div>
          </div>

          {showAddForm && (
            <div className="p-6 bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Wallet Name
                  </label>
                  <input
                    type="text"
                    value={newWallet.name}
                    onChange={(e) => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                    placeholder="My Trading Wallet"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={newWallet.address}
                    onChange={(e) => setNewWallet(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                    placeholder="Solana wallet address"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={addWallet}
                  disabled={!newWallet.address || !newWallet.name}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200"
                >
                  Add Wallet
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showAddForm && (
            <div className="p-8">
              {/* Privacy & Data Storage Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mb-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Your Privacy is Protected
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p>
                        <strong>100% Local Storage:</strong> All your transaction data, wallet addresses, classifications, and notes are stored exclusively in your browser's localStorage on your device.
                      </p>
                      <p>
                        <strong>No External Servers:</strong> We don't collect, store, or transmit any of your data to our servers or any third-party services. Everything stays on your machine.
                      </p>
                      <p>
                        <strong>Blockchain Access Only:</strong> The app only connects to Solana blockchain networks to fetch your public transaction history - no private data is shared.
                      </p>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                        ⚠️ Important: Backup Your Data
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Before clearing your browser data, cookies, or localStorage, make sure to export your data from Settings → Data Management.
                        Clearing browser storage will permanently delete all your transaction classifications and wallet configurations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Getting Started */}
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to Start</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Click "Add Wallet" above to configure your first wallet address for monitoring</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Track SOL & SPL tokens</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Classify transactions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Generate reports</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Access to Settings */}
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Need to configure RPC settings or import existing data?
          </p>
          <button
            onClick={() => onPageChange('settings')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all duration-200"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Go to Settings</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Overview of your Solana wallet activity across all configured wallets
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <TokenSelector 
            tokenFilter={tokenFilter}
            onFilterChange={setTokenFilter}
          />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Aggregated Portfolio Stats */}
      {Object.keys(stats.tokenStats).length > 0 && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Portfolio Summary ({currencyPreference.baseCurrency})
              </h3>
              {tokenFilter.enabled && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                  Filtered
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Income</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrencyAmount(stats.totalIncomeConverted, currencyPreference.baseCurrency)}
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrencyAmount(stats.totalExpensesConverted, currencyPreference.baseCurrency)}
                    </p>
                  </div>
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Net Total</p>
                    <p className={`text-xl font-bold ${
                      stats.netConverted >= 0
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {stats.netConverted >= 0 ? '+' : ''}
                      {formatCurrencyAmount(stats.netConverted, currencyPreference.baseCurrency)}
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token-specific stats */}
      {Object.keys(stats.tokenStats).length > 0 && (
        <div className="space-y-4">
          {Object.entries(stats.tokenStats).map(([tokenSymbol, tokenData]) => (
            <div key={tokenSymbol} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
              <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {tokenData.token.logoURI ? (
                      <img
                        src={tokenData.token.logoURI}
                        alt={tokenData.token.symbol}
                        className="w-6 h-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        {tokenData.token.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tokenData.token.name} ({tokenData.token.symbol})
                  </h3>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Income</p>
                        <div
                          className="text-xl font-bold text-green-700 dark:text-green-300"
                          dangerouslySetInnerHTML={{ __html: formatTokenAmountWithCurrency(tokenData.income, tokenData.token, currencyPreference, false) }}
                        />
                      </div>
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Expenses</p>
                        <div
                          className="text-xl font-bold text-red-700 dark:text-red-300"
                          dangerouslySetInnerHTML={{ __html: formatTokenAmountWithCurrency(tokenData.expenses, tokenData.token, currencyPreference, false) }}
                        />
                      </div>
                      <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Net</p>
                        <div
                          className={`text-xl font-bold ${
                            tokenData.income - tokenData.expenses >= 0
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}
                          dangerouslySetInnerHTML={{ __html: `${tokenData.income - tokenData.expenses >= 0 ? '+' : ''}${formatTokenAmountWithCurrency(tokenData.income - tokenData.expenses, tokenData.token, currencyPreference, false)}` }}
                        />
                      </div>
                      <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalTransactions}
              </p>
              {tokenFilter.enabled && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Filtered from {allTransactions.length} total
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unclassified</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.unclassified}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Need classification
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Management Summary */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stats.unclassified > 0
                  ? `${stats.unclassified} transactions need classification`
                  : 'All transactions are properly classified'
                }
              </p>
            </div>
            <button
              onClick={() => onPageChange('transactions')}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Receipt className="w-5 h-5" />
              <span>Manage Transactions</span>
            </button>
          </div>
          
          {stats.unclassified > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                You have unclassified transactions that need attention for accurate accounting.
              </p>
            </div>
          )}
        </div>
      </div>

      <WalletConnection />
    </div>
  );
}