import React, { useState, useEffect } from 'react';
import { TokenInfo, TokenFilter } from '../types';
import { COMMON_TOKENS, SOL_TOKEN } from '../utils/tokens';
import { Check, Filter, X } from 'lucide-react';

interface TokenSelectorProps {
  tokenFilter: TokenFilter;
  onFilterChange: (filter: TokenFilter) => void;
}

export function TokenSelector({ tokenFilter, onFilterChange }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const allTokens = [SOL_TOKEN, ...COMMON_TOKENS];
  
  const filteredTokens = allTokens.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleToken = (mint: string) => {
    const newSelectedTokens = tokenFilter.selectedTokens.includes(mint)
      ? tokenFilter.selectedTokens.filter(t => t !== mint)
      : [...tokenFilter.selectedTokens, mint];

    onFilterChange({
      ...tokenFilter,
      selectedTokens: newSelectedTokens
    });
  };

  const toggleFilter = () => {
    onFilterChange({
      ...tokenFilter,
      enabled: !tokenFilter.enabled
    });
  };

  const selectAll = () => {
    onFilterChange({
      ...tokenFilter,
      selectedTokens: allTokens.map(t => t.mint)
    });
  };

  const clearAll = () => {
    onFilterChange({
      ...tokenFilter,
      selectedTokens: []
    });
  };

  const selectedCount = tokenFilter.selectedTokens.length;
  const totalCount = allTokens.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
          tokenFilter.enabled
            ? 'bg-orange-600 hover:bg-orange-700 text-white'
            : 'bg-white/80 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50'
        }`}
      >
        <Filter className="w-5 h-5" />
        <span>
          {tokenFilter.enabled 
            ? `${selectedCount} tokens selected`
            : 'Filter tokens'
          }
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Token Filter
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2 mb-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tokenFilter.enabled}
                  onChange={toggleFilter}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable token filtering
                </span>
              </label>
            </div>

            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
            />

            <div className="flex space-x-2 mt-3">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTokens.map((token) => (
              <button
                key={token.mint}
                onClick={() => toggleToken(token.mint)}
                disabled={!tokenFilter.enabled}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                  tokenFilter.enabled
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'opacity-50 cursor-not-allowed'
                } ${
                  tokenFilter.selectedTokens.includes(token.mint)
                    ? 'bg-orange-50 dark:bg-orange-900/20'
                    : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-6 h-6"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                      {token.symbol.slice(0, 2)}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {token.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {token.name}
                  </div>
                </div>

                {tokenFilter.selectedTokens.includes(token.mint) && (
                  <Check className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
              </button>
            ))}
          </div>

          {filteredTokens.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No tokens found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}