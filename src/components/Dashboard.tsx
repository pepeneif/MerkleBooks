import React, { useState, useEffect } from 'react';
import { WalletConnection } from './WalletConnection';
import { TokenSelector } from './TokenSelector';
import { useTransactions } from '../hooks/useTransactions';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw, Receipt, PieChart } from 'lucide-react';
import { formatTokenAmount } from '../utils/tokens';
import { convertTokenToBaseCurrencySync, formatCurrencyAmount, formatTokenAmountWithCurrency } from '../utils/currency';
import { loadCurrencyPreference } from '../utils/storage';
import { CurrencyPreference } from '../types';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

export function Dashboard({ onPageChange }: DashboardProps) {
  const { connected } = useWallet();
  const [currencyPreference, setCurrencyPreference] = useState<CurrencyPreference>(() => loadCurrencyPreference());
  const {
    allTransactions,
    loading,
    fetchAllTransactions,
    tokenFilter,
    setTokenFilter
  } = useTransactions();

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

      <WalletConnection />

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
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                          {formatTokenAmountWithCurrency(tokenData.income, tokenData.token, currencyPreference, false)}
                        </p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Expenses</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                          {formatTokenAmountWithCurrency(tokenData.expenses, tokenData.token, currencyPreference, false)}
                        </p>
                      </div>
                      <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Net</p>
                        <p className={`text-xl font-bold ${
                          tokenData.income - tokenData.expenses >= 0 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {tokenData.income - tokenData.expenses >= 0 ? '+' : ''}
                          {formatTokenAmountWithCurrency(tokenData.income - tokenData.expenses, tokenData.token, currencyPreference, false)}
                        </p>
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
    </div>
  );
}