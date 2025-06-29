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
  const [walletBalances, setWalletBalances] = useState<{
    address: string;
    name: string;
    balance: number;
    isActive: boolean;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const fetchAllBalances = useCallback(async () => {
    const now = Date.now();
    if (loading || (now - lastFetch < 10000)) {
      console.log('Skipping balance fetch - too recent or already loading');
      return;
    }
    
    setLoading(true);
    setLastFetch(now);
    
    try {
      console.log('Starting balance fetch for all wallets...');
      const walletConfigs = loadWalletConfigs();
      const walletsToFetch: Array<{address: string, name: string, isActive: boolean}> = [];

      if (publicKey) {
        walletsToFetch.push({
          address: publicKey.toString(),
          name: 'Connected Wallet',
          isActive: true
        });
      }

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
        setWalletBalances([]);
        setLoading(false);
        return;
      }

      const publicKeys = walletsToFetch.map(w => new PublicKey(w.address));
      const balances = await connection.getMultipleAccountsInfo(publicKeys);

      const updatedWalletBalances = walletsToFetch.map((wallet, index) => {
        const account = balances[index];
        const walletBalance = account ? account.lamports / LAMPORTS_PER_SOL : 0;
        console.log(`Balance for ${wallet.name}: ${walletBalance} SOL`);
        return { ...wallet, balance: walletBalance };
      });

      setWalletBalances(updatedWalletBalances);
      
    } catch (error) {
      console.error('Error fetching all balances:', error);
      setWalletBalances([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, loading, lastFetch]);

  const debouncedFetchAllBalances = useMemo(
    () => debounce(fetchAllBalances, 5000),
    [fetchAllBalances]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Initial balance fetch triggered');
      fetchAllBalances();
    }, 1500);
    
    const interval = setInterval(() => {
      console.log('Periodic balance fetch triggered');
      fetchAllBalances();
    }, 120000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [publicKey, connection]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'solbooks_wallet_configs') {
        console.log('Wallet configs changed, refreshing balances');
        debouncedFetchAllBalances();
      }
    };

    const handleRPCConfigChange = () => {
      console.log('RPC config changed, refreshing balances');
      fetchAllBalances();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rpcConfigChanged', handleRPCConfigChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rpcConfigChanged', handleRPCConfigChange);
    };
  }, [debouncedFetchAllBalances, fetchAllBalances]);

  return { 
    walletBalances, 
    loading, 
    fetchAllBalances 
  };
}
