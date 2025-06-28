import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { loadWalletConfigs } from '../utils/storage';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function useWalletBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const fetchBalance = async () => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    try {
      console.log('Fetching balance for connected wallet:', publicKey.toString());
      const balance = await connection.getBalance(publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;
      console.log('Connected wallet balance:', balanceInSOL, 'SOL');
      setBalance(balanceInSOL);
    } catch (error) {
      console.error('Error fetching connected wallet balance:', error);
      setBalance(0);
    }
  };

  const fetchAllBalances = useCallback(async () => {
    // Prevent multiple simultaneous calls and rate limiting
    const now = Date.now();
    if (loading || (now - lastFetch < 5000)) {
      console.log('Skipping balance fetch - too recent or already loading');
      return;
    }
    
    setLoading(true);
    setLastFetch(now);
    
    try {
      console.log('Starting balance fetch for all wallets...');
      const walletConfigs = loadWalletConfigs();
      const walletsToFetch = [];

      // Add connected wallet if it exists
      if (publicKey) {
        walletsToFetch.push({
          address: publicKey.toString(),
          name: 'Connected Wallet',
          isActive: true
        });
      }

      // Add configured wallets, but avoid duplicates
      walletConfigs.forEach(config => {
        if (config.isActive) {
          const isDuplicate = walletsToFetch.some(w => w.address === config.address);
          if (!isDuplicate) {
            walletsToFetch.push({
              address: config.address,
              name: config.name,
              isActive: config.isActive
            });
          }
        }
      });

      console.log(`Fetching balances for ${walletsToFetch.length} wallets:`, walletsToFetch.map(w => w.name));

      if (walletsToFetch.length === 0) {
        console.log('No wallets to fetch balances for');
        setTotalBalance(0);
        setBalance(0);
        return;
      }

      let total = 0;
      let connectedWalletBalance = 0;

      for (const wallet of walletsToFetch) {
        try {
          console.log(`Fetching balance for ${wallet.name}: ${wallet.address}`);
          
          // Validate the address format
          let walletPubkey: PublicKey;
          try {
            walletPubkey = new PublicKey(wallet.address);
          } catch (error) {
            console.error(`Invalid wallet address for ${wallet.name}:`, wallet.address);
            continue;
          }

          // Fetch balance with retry logic
          let walletBalance = 0;
          let retries = 3;
          
          while (retries > 0) {
            try {
              const balance = await connection.getBalance(walletPubkey);
              walletBalance = balance / LAMPORTS_PER_SOL;
              console.log(`Balance for ${wallet.name}: ${walletBalance} SOL`);
              break;
            } catch (error: any) {
              retries--;
              console.warn(`Error fetching balance for ${wallet.name} (${retries} retries left):`, error.message);
              
              if (retries > 0) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                console.error(`Failed to fetch balance for ${wallet.name} after all retries`);
                walletBalance = 0;
              }
            }
          }

          total += walletBalance;
          
          // If this is the connected wallet, store its individual balance
          if (publicKey && wallet.address === publicKey.toString()) {
            connectedWalletBalance = walletBalance;
          }
          
          // Add delay between requests to prevent rate limiting
          if (walletsToFetch.indexOf(wallet) < walletsToFetch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error fetching balance for wallet ${wallet.name} (${wallet.address}):`, error);
        }
      }

      console.log(`Total balance across all wallets: ${total} SOL`);
      console.log(`Connected wallet balance: ${connectedWalletBalance} SOL`);

      setTotalBalance(total);
      setBalance(connectedWalletBalance);
      
    } catch (error) {
      console.error('Error fetching all balances:', error);
      setTotalBalance(0);
      if (!publicKey) {
        setBalance(0);
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, loading, lastFetch]);

  // Create debounced version
  const debouncedFetchAllBalances = useMemo(
    () => debounce(fetchAllBalances, 2000), // 2 second debounce
    [fetchAllBalances]
  );

  // Initial fetch and periodic updates
  useEffect(() => {
    // Initial fetch with delay
    const timer = setTimeout(() => {
      console.log('Initial balance fetch triggered');
      fetchAllBalances();
    }, 1000);
    
    // Set up polling for balance updates with longer interval
    const interval = setInterval(() => {
      console.log('Periodic balance fetch triggered');
      fetchAllBalances();
    }, 60000); // Every 1 minute
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [publicKey]); // Only depend on publicKey to prevent loops

  // Listen for wallet config changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'solbooks_wallet_configs') {
        console.log('Wallet configs changed, refreshing balances');
        setTimeout(() => {
          debouncedFetchAllBalances();
        }, 1000);
      }
    };

    // Listen for RPC config changes
    const handleRPCConfigChange = () => {
      console.log('RPC config changed, refreshing balances');
      setTimeout(() => {
        fetchAllBalances();
      }, 2000);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rpcConfigChanged', handleRPCConfigChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rpcConfigChanged', handleRPCConfigChange);
    };
  }, [debouncedFetchAllBalances, fetchAllBalances]);

  // Fetch balance when connection changes
  useEffect(() => {
    if (connection) {
      console.log('Connection changed, refreshing balances');
      const timer = setTimeout(() => {
        fetchAllBalances();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [connection]);

  return { 
    balance, 
    totalBalance, 
    loading, 
    fetchBalance, 
    fetchAllBalances 
  };
}