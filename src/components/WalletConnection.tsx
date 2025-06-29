import React, { useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { Copy, ExternalLink, Wallet, RefreshCw } from 'lucide-react';
import { loadWalletConfigs, loadRPCConfig } from '../utils/storage';

export function WalletConnection() {
  const { publicKey, connected } = useWallet();
  const { walletBalances, loading, fetchAllBalances } = useWalletBalance();
  const walletConfigs = loadWalletConfigs();
  const activeWallets = walletConfigs.filter(w => w.isActive);
  const rpcConfig = loadRPCConfig();

  // Refresh balances when component mounts or wallet connects
  useEffect(() => {
    if (connected || activeWallets.length > 0) {
      const timer = setTimeout(() => {
        fetchAllBalances();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [connected, activeWallets.length]);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
    }
  };

  const openExplorer = () => {
    if (publicKey) {
      const network = rpcConfig.network === 'mainnet-beta' ? '' : `?cluster=${rpcConfig.network}`;
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}${network}`, '_blank');
    }
  };

  const handleRefreshBalances = () => {
    fetchAllBalances();
  };

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Monitoring {walletConfigs.length} Wallets</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
      </div>

      {/* RPC Status */}
      <div className="mb-4 p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Connected to {rpcConfig.name}
          </span>
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono">
          {rpcConfig.endpoint.length > 50 ? `${rpcConfig.endpoint.slice(0, 50)}...` : rpcConfig.endpoint}
        </div>
      </div>

      {/* Monitored Wallets List */}
      {walletBalances.length > 0 && (
        <div className="mt-4 space-y-3">
          {walletBalances.map((wallet) => (
            <div key={wallet.address} className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{wallet.name}</span>
                {loading && (
                  <div className="flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
                    <span className="text-xs text-gray-500">Updating...</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all mt-1">
                {wallet.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No wallets configured message */}
      {walletBalances.length === 0 && (
        <div className="mt-4 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl text-center">
          <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            No wallets connected or configured
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Connect a wallet above or add wallet addresses in Settings to start monitoring balances and transactions
          </p>
        </div>
      )}
    </div>
  );
}