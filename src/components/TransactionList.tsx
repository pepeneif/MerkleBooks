import React, { useState, useEffect } from 'react';
import { Transaction, Category } from '../types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Tag,
  Edit3,
  Check,
  X,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { formatTokenAmount } from '../utils/tokens';
import { loadCategories } from '../utils/storage';

interface TransactionListProps {
  transactions: Transaction[];
  onClassifyTransaction: (id: string, category: string, notes?: string) => void;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

export function TransactionList({
  transactions,
  onClassifyTransaction,
  showRefreshButton = false,
  onRefresh,
  loading = false
}: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories on component mount
  useEffect(() => {
    const loadedCategories = loadCategories();
    setCategories(loadedCategories);
  }, []);

  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditCategory(transaction.category);
    setEditNotes(transaction.notes || '');
  };

  const saveEdit = () => {
    if (editingId) {
      onClassifyTransaction(editingId, editCategory, editNotes);
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
    setEditNotes('');
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        {showRefreshButton && (
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transactions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  No transactions found across all configured wallets
                </p>
              </div>
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
        )}
        
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ArrowUpRight className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Your transaction history will appear here once you make some transactions or configure wallet addresses in Settings
          </p>
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Transactions</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {showRefreshButton ? 'All Transactions' : 'Recent Transactions'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {transactions.length} transactions found across all configured wallets
            </p>
          </div>
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  transaction.type === 'income' 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : 'bg-red-100 dark:bg-red-900/20'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowDownLeft className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </h4>
                    {!transaction.classified && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                        Needs classification
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{transaction.timestamp.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Tag className="w-4 h-4" />
                      <span>{transaction.category}</span>
                    </div>
                    {transaction.fromAddress && (
                      <div className="flex items-center space-x-1">
                        <Wallet className="w-4 h-4" />
                        <span className="font-mono text-xs">
                          {transaction.fromAddress.slice(0, 8)}...{transaction.fromAddress.slice(-4)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {transaction.token.logoURI ? (
                        <img
                          src={transaction.token.logoURI}
                          alt={transaction.token.symbol}
                          className="w-4 h-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {transaction.token.symbol.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {transaction.token.name}
                    </span>
                  </div>

                  {transaction.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {transaction.notes}
                    </p>
                  )}

                  {editingId === transaction.id && (
                    <div className="mt-4 space-y-3 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category
                        </label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                          rows={2}
                          placeholder="Add notes about this transaction..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={saveEdit}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-all duration-200"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-all duration-200"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className={`text-lg font-semibold ${
                  transaction.type === 'income' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatTokenAmount(transaction.amount, transaction.token)}
                </div>
                <button
                  onClick={() => startEditing(transaction)}
                  className="mt-2 flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Classify</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}