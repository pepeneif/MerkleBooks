import React, { useState, useEffect, useRef } from 'react';
import { WalletConfig, RPCConfig } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Eye, EyeOff, Download, Upload, AlertTriangle, RefreshCw, Server, Globe, Zap } from 'lucide-react';
import { saveWalletConfigs, loadWalletConfigs, exportData, importData, clearAllData, saveRPCConfig, loadRPCConfig, saveAutoRefreshSetting, loadAutoRefreshSetting } from '../utils/storage';
import { useTransactions } from '../hooks/useTransactions';
import { PublicKey } from '@solana/web3.js';

const PRESET_RPCS = [
  {
    name: 'Solana Devnet (Default)',
    endpoint: 'https://api.devnet.solana.com',
    network: 'devnet' as const
  },
  {
    name: 'Solana Mainnet Beta',
    endpoint: 'https://api.mainnet-beta.solana.com',
    network: 'mainnet-beta' as const
  },
  {
    name: 'Solana Testnet',
    endpoint: 'https://api.testnet.solana.com',
    network: 'testnet' as const
  },
  {
    name: 'Helius (Devnet)',
    endpoint: 'https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY',
    network: 'custom' as const
  },
  {
    name: 'Helius (Mainnet)',
    endpoint: 'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY',
    network: 'custom' as const
  },
  {
    name: 'QuickNode',
    endpoint: 'https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/',
    network: 'custom' as const
  },
  {
    name: 'Alchemy',
    endpoint: 'https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    network: 'custom' as const
  }
];

export function Settings() {
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [newWallet, setNewWallet] = useState({ address: '', name: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [rpcConfig, setRpcConfig] = useState<RPCConfig>(() => loadRPCConfig());
  const [showRPCForm, setShowRPCForm] = useState(false);
  const [newRPCConfig, setNewRPCConfig] = useState<RPCConfig>(rpcConfig);
  const [isInitialized, setIsInitialized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => loadAutoRefreshSetting());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchAllTransactions, loading } = useTransactions();

  // Load wallet configs from localStorage on mount - only once
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

  // Save wallet configs to localStorage only when wallets change and initialized
  useEffect(() => {
    if (isInitialized && wallets.length >= 0) {
      try {
        saveWalletConfigs(wallets);
      } catch (error) {
        console.error('Error saving wallet configs:', error);
      }
    }
  }, [wallets, isInitialized]);

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

  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merkle-space-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setImportError('');
    try {
      const result = importData(importText);
      
      if (result.success) {
        // Reload data from localStorage
        const savedWallets = loadWalletConfigs();
        setWallets(savedWallets);
        const savedRPCConfig = loadRPCConfig();
        setRpcConfig(savedRPCConfig);
        setNewRPCConfig(savedRPCConfig);
        
        setShowImportModal(false);
        setImportText('');
        alert('Data imported successfully! Please refresh the page to see all changes.');
      } else {
        setImportError(result.error || 'Import failed');
      }
    } catch (error) {
      setImportError('Failed to import data. Please check the format.');
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        clearAllData();
        setWallets([]);
        const defaultRPC = loadRPCConfig();
        setRpcConfig(defaultRPC);
        setNewRPCConfig(defaultRPC);
        alert('All data has been cleared.');
      } catch (error) {
        console.error('Clear data failed:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  };

  const handleRefreshTransactions = () => {
    if (!loading) {
      fetchAllTransactions();
    }
  };

  const saveRPCSettings = () => {
    // Validate custom endpoint
    if (newRPCConfig.network === 'custom' && !newRPCConfig.endpoint.startsWith('http')) {
      alert('Custom RPC endpoint must start with http:// or https://');
      return;
    }

    try {
      saveRPCConfig(newRPCConfig);
      setRpcConfig(newRPCConfig);
      setShowRPCForm(false);
      alert('RPC configuration saved! The app will use the new endpoint for all blockchain requests.');
    } catch (error) {
      console.error('Failed to save RPC config:', error);
      alert('Failed to save RPC configuration. Please try again.');
    }
  };

  const selectPresetRPC = (preset: typeof PRESET_RPCS[0]) => {
    setNewRPCConfig({
      name: preset.name,
      endpoint: preset.endpoint,
      network: preset.network
    });
  };

  const testRPCConnection = async () => {
    try {
      const endpoint = newRPCConfig.endpoint;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        alert('✅ RPC connection successful!');
      } else {
        alert('❌ RPC connection failed. Please check the endpoint.');
      }
    } catch (error) {
      alert('❌ RPC connection failed. Please check the endpoint and try again.');
    }
  };

  const handleAutoRefreshToggle = () => {
    const newValue = !autoRefresh;
    setAutoRefresh(newValue);
    saveAutoRefreshSetting(newValue);
  };

  // Don't render until initialized to prevent hydration issues
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure your wallet monitoring, RPC server, and data management
          </p>
        </div>
        <button
          onClick={handleRefreshTransactions}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh All Data</span>
        </button>
      </div>

      {/* Data Management Section - MOVED TO TOP */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Data Management
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure automatic data refresh and manage your data backups
          </p>
        </div>
        
        <div className="p-6">
          {/* Auto-refresh setting */}
          <div className="mb-6 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Automatic Data Refresh
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically refresh transactions and balances in the background
                </p>
              </div>
              <button
                onClick={handleAutoRefreshToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  autoRefresh
                    ? 'bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleExport}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="w-5 h-5" />
              <span>Export Data</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Upload className="w-5 h-5" />
              <span>Import Data</span>
            </button>
            
            <button
              onClick={handleClearData}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Clear All Data</span>
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Wallet Management Section - MOVED TO MIDDLE */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Monitored Wallets
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add wallet addresses to monitor for automatic transaction tracking
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Add Wallet</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
              <div>
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
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200"
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

        <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
          {wallets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <SettingsIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No wallets configured</h3>
              <p className="text-gray-500 dark:text-gray-400">Add wallet addresses to start monitoring transactions and balances</p>
            </div>
          ) : (
            wallets.map((wallet) => (
              <div key={wallet.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {wallet.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      wallet.isActive
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                    }`}>
                      {wallet.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
                    {wallet.address}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleWallet(wallet.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200"
                  >
                    {wallet.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{wallet.isActive ? 'Disable' : 'Enable'}</span>
                  </button>
                  <button
                    onClick={() => removeWallet(wallet.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-xl transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RPC Configuration Section - MOVED TO BOTTOM */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  RPC Server Configuration
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Configure the Solana RPC endpoint for blockchain data
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRPCForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Configure</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-2">
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current RPC Endpoint</span>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {rpcConfig.name}
            </div>
            <div className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
              {rpcConfig.endpoint}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                rpcConfig.network === 'mainnet-beta'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : rpcConfig.network === 'devnet'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : rpcConfig.network === 'testnet'
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
              }`}>
                {rpcConfig.network}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-start space-x-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Why configure a custom RPC?</p>
                <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                  <li>• Avoid rate limiting (429 errors) with dedicated endpoints</li>
                  <li>• Faster response times with premium RPC providers</li>
                  <li>• Higher request limits for heavy usage</li>
                  <li>• Better reliability for production applications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RPC Configuration Modal */}
      {showRPCForm && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configure RPC Server</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Choose a Solana RPC endpoint for blockchain data access
              </p>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Preset RPC Options */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Preset RPC Endpoints</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PRESET_RPCS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => selectPresetRPC(preset)}
                      className={`p-4 text-left border rounded-xl transition-all duration-200 ${
                        newRPCConfig.endpoint === preset.endpoint
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        {preset.endpoint.length > 50 ? `${preset.endpoint.slice(0, 50)}...` : preset.endpoint}
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                        preset.network === 'mainnet-beta'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : preset.network === 'devnet'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : preset.network === 'testnet'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                      }`}>
                        {preset.network}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Configuration */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Custom Configuration</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    RPC Name
                  </label>
                  <input
                    type="text"
                    value={newRPCConfig.name}
                    onChange={(e) => setNewRPCConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                    placeholder="My Custom RPC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Network Type
                  </label>
                  <select
                    value={newRPCConfig.network}
                    onChange={(e) => setNewRPCConfig(prev => ({ ...prev, network: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                  >
                    <option value="devnet">Devnet</option>
                    <option value="mainnet-beta">Mainnet Beta</option>
                    <option value="testnet">Testnet</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    RPC Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={newRPCConfig.endpoint}
                    onChange={(e) => setNewRPCConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                    placeholder="https://api.mainnet-beta.solana.com"
                  />
                </div>

                <button
                  onClick={testRPCConnection}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200"
                >
                  <Zap className="w-4 h-4" />
                  <span>Test Connection</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 flex space-x-3">
              <button
                onClick={saveRPCSettings}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200"
              >
                Save Configuration
              </button>
              <button
                onClick={() => {
                  setShowRPCForm(false);
                  setNewRPCConfig(rpcConfig);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Paste your exported JSON data below
              </p>
            </div>
            
            <div className="p-6">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm transition-all duration-200"
                placeholder="Paste your JSON data here..."
              />
              
              {importError && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 flex space-x-3">
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200"
              >
                Import Data
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportError('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}