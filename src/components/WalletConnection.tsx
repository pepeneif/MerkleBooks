import React, { useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { Copy, ExternalLink, Wallet, RefreshCw } from 'lucide-react';
import { loadWalletConfigs, loadRPCConfig } from '../utils/storage';

export function WalletConnection() {
  const { publicKey, connected } = useWallet();
  const { balance, totalBalance, loading, fetchAllBalances } = useWalletBalance();
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
            <span className="text-orange-600 dark:text-orange-400 font-bold text-xl">M</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Wallet Connection</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefreshBalances}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200 text-sm"
            title="Refresh balances"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <WalletMultiButton className="!bg-orange-600 hover:!bg-orange-700 !rounded-xl !px-4 !py-2 !text-sm !font-medium !transition-all !duration-200" />
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

      {/* Total Balance across all wallets */}
      <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Balance ({activeWallets.length + (connected ? 1 : 0)} wallets)
          </span>
          {loading && (
            <div className="flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
              <span className="text-xs text-gray-500">Updating...</span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {totalBalance.toFixed(4)} SOL
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Wallet className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeWallets.length} configured + {connected ? '1 connected' : '0 connected'}
          </span>
        </div>
        {totalBalance === 0 && !loading && (activeWallets.length > 0 || connected) && (
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ Balance shows 0 SOL. This might be due to:
              <br />• Invalid wallet addresses
              <br />• RPC connection issues
              <br />• Wallets are empty
            </p>
          </div>
        )}
      </div>

      {connected && publicKey && (
        <div className="space-y-4">
          <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connected Wallet Balance</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {balance.toFixed(4)} SOL
            </div>
            {balance === 0 && !loading && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This wallet appears to be empty or there may be a connection issue
              </div>
            )}
          </div>

          <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</span>
              <div className="flex space-x-2">
                <button
                  onClick={copyAddress}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={openExplorer}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
              {publicKey.toString()}
            </div>
          </div>
        </div>
      )}

      {/* Show configured wallets info */}
      {activeWallets.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-2 mb-2">
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Monitoring {activeWallets.length} additional wallet{activeWallets.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {activeWallets.slice(0, 3).map((wallet) => (
              <div key={wallet.id} className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                {wallet.name}: {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
              </div>
            ))}
            {activeWallets.length > 3 && (
              <div className="text-xs text-blue-500 dark:text-blue-400">
                +{activeWallets.length - 3} more wallets
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            💡 Configure these in Settings to monitor their transactions and balances
          </div>
        </div>
      )}

      {/* No wallets configured message */}
      {!connected && activeWallets.length === 0 && (
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