import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, ParsedAccountData } from '@solana/web3.js';
import { Transaction, TokenFilter } from '../types';
import { saveTransactions, loadTransactions, loadWalletConfigs, loadAutoRefreshSetting } from '../utils/storage';
import { SOL_TOKEN, getTokenByMint } from '../utils/tokens';
import { getExchangeRates } from '../utils/currency';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>({
    enabled: false,
    selectedTokens: ['native'] // Default to SOL only
  });
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Load transactions from localStorage on mount
  useEffect(() => {
    const savedTransactions = loadTransactions();
    setTransactions(savedTransactions);
    
    // Load token filter from localStorage
    const savedFilter = localStorage.getItem('solbooks_token_filter');
    if (savedFilter) {
      try {
        setTokenFilter(JSON.parse(savedFilter));
      } catch (error) {
        console.error('Failed to load token filter:', error);
      }
    }
  }, []);

  // Save transactions to localStorage whenever transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactions(transactions);
    }
  }, [transactions]);

  // Save token filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('solbooks_token_filter', JSON.stringify(tokenFilter));
  }, [tokenFilter]);

  const fetchAllTransactions = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous calls
    
    setLoading(true);
    try {
      // Refresh exchange rates when fetching transactions
      try {
        await getExchangeRates();
        console.log('Exchange rates refreshed from Jupiter API');
      } catch (error) {
        console.warn('Failed to refresh exchange rates:', error);
      }
      
      const walletConfigs = loadWalletConfigs();
      const walletsToFetch: Array<{address: string, name: string, isActive: boolean}> = [];

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
          // Check if this wallet is already in the list (connected wallet)
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

      console.log(`Fetching transactions for ${walletsToFetch.length} wallets:`, walletsToFetch);

      if (walletsToFetch.length === 0) {
        console.log('No wallets to fetch transactions for');
        setLoading(false);
        return;
      }

      // Fetch transactions for all unique wallets with rate limiting
      const allTransactions: Transaction[] = [];
      
      for (const wallet of walletsToFetch) {
        try {
          console.log(`Fetching transactions for wallet: ${wallet.name} (${wallet.address})`);
          const walletPubkey = new PublicKey(wallet.address);
          
          // Add delay between wallet requests to prevent rate limiting
          if (walletsToFetch.indexOf(wallet) > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
          
          // Fetch SOL transactions with limited count
          const solTransactions = await fetchSOLTransactions(walletPubkey, wallet);
          console.log(`Found ${solTransactions.length} SOL transactions for ${wallet.name}`);
          allTransactions.push(...solTransactions);
          
          // Add delay before fetching SPL tokens
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fetch SPL token transactions with limited count
          const splTransactions = await fetchSPLTransactions(walletPubkey, wallet);
          console.log(`Found ${splTransactions.length} SPL token transactions for ${wallet.name}`);
          allTransactions.push(...splTransactions);
          
        } catch (error) {
          console.error(`Error fetching transactions for wallet ${wallet.address}:`, error);
        }
      }

      console.log(`Total transactions fetched: ${allTransactions.length}`);

      // Load existing transactions from localStorage to preserve classifications
      const existingTransactions = loadTransactions();
      const mergedTransactions = allTransactions.map(newTx => {
        const existing = existingTransactions.find(tx => tx.signature === newTx.signature && tx.token.mint === newTx.token.mint);
        if (existing) {
          // Keep existing classification data
          return {
            ...newTx,
            category: existing.category,
            notes: existing.notes,
            classified: existing.classified
          };
        }
        return newTx;
      });

      // Add any existing transactions that weren't found in the new fetch
      existingTransactions.forEach(existingTx => {
        const found = mergedTransactions.find(tx => tx.signature === existingTx.signature && tx.token.mint === existingTx.token.mint);
        if (!found) {
          mergedTransactions.push(existingTx);
        }
      });

      // Remove duplicates based on signature and token mint, sort by timestamp
      const uniqueTransactions = mergedTransactions.reduce((acc, current) => {
        const existing = acc.find(tx => tx.signature === current.signature && tx.token.mint === current.token.mint);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as Transaction[]);

      // Sort by timestamp (newest first)
      uniqueTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(`Final unique transactions: ${uniqueTransactions.length}`);
      setTransactions(uniqueTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, loading]);

  // Create debounced version with longer delay
  const debouncedFetchAllTransactions = useMemo(
    () => debounce(fetchAllTransactions, 5000), // 5 second debounce
    [fetchAllTransactions]
  );

  // Only fetch on initial load when auto-refresh is enabled
  useEffect(() => {
    // Only auto-fetch if auto-refresh is enabled, we have wallets, and no existing transactions
    const autoRefreshEnabled = loadAutoRefreshSetting();
    if (autoRefreshEnabled && (publicKey || loadWalletConfigs().length > 0) && transactions.length === 0) {
      const timer = setTimeout(() => {
        fetchAllTransactions();
      }, 2000); // Delay initial fetch
      
      return () => clearTimeout(timer);
    }
  }, [publicKey, connection]); // Removed fetchAllTransactions from deps to prevent loops

  // Listen for storage changes with debouncing - only if auto-refresh is enabled
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'solbooks_wallet_configs') {
        // Check if auto-refresh is enabled before auto-fetching
        const autoRefreshEnabled = loadAutoRefreshSetting();
        if (autoRefreshEnabled) {
          debouncedFetchAllTransactions();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [debouncedFetchAllTransactions]);

  const fetchSOLTransactions = async (walletPubkey: PublicKey, wallet: any) => {
    try {
      // Limit to 50 signatures to prevent overwhelming the API
      const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 50 });
      console.log(`Found ${signatures.length} signatures for ${wallet.name}`);
      
      const solTransactions = [];
      
      // Process signatures in batches to prevent rate limiting
      const batchSize = 10;
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            });
            if (!tx || !tx.meta) return null;

            // Find the account index for this wallet
            const accountIndex = tx.transaction.message.staticAccountKeys.findIndex(
              key => key.toString() === walletPubkey.toString()
            );
            
            if (accountIndex === -1) return null;

            // Calculate SOL balance change for this specific wallet
            const preBalance = tx.meta.preBalances[accountIndex] || 0;
            const postBalance = tx.meta.postBalances[accountIndex] || 0;
            const balanceChange = postBalance - preBalance;
            
            // Skip transactions with no balance change or very small changes (likely fees)
            if (Math.abs(balanceChange) < 1000) return null; // Less than 0.000001 SOL

            const amount = Math.abs(balanceChange / 1e9); // Convert lamports to SOL
            
            return {
              id: `${sig.signature}-native`,
              signature: sig.signature,
              amount: amount,
              type: balanceChange > 0 ? 'income' : 'expense' as const,
              category: 'Uncategorized',
              description: `SOL ${balanceChange > 0 ? 'Received' : 'Sent'} - ${wallet.name}`,
              timestamp: new Date(sig.blockTime! * 1000),
              status: 'confirmed' as const,
              classified: false,
              fromAddress: wallet.address,
              token: SOL_TOKEN,
            };
          } catch (error) {
            console.error(`Error fetching SOL transaction ${sig.signature}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        solTransactions.push(...batchResults.filter(Boolean));
        
        // Add delay between batches
        if (i + batchSize < signatures.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return solTransactions as Transaction[];
    } catch (error) {
      console.error(`Error fetching SOL transactions for ${wallet.name}:`, error);
      return [];
    }
  };

  const fetchSPLTransactions = async (walletPubkey: PublicKey, wallet: any) => {
    try {
      // Get token accounts for this wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      console.log(`Found ${tokenAccounts.value.length} token accounts for ${wallet.name}`);

      const splTransactions: Transaction[] = [];

      // Limit to first 5 token accounts to prevent overwhelming
      const limitedTokenAccounts = tokenAccounts.value.slice(0, 5);

      for (const tokenAccount of limitedTokenAccounts) {
        try {
          const accountData = tokenAccount.account.data as ParsedAccountData;
          const tokenInfo = accountData.parsed.info;
          const mint = tokenInfo.mint;
          
          // Get token info
          const token = getTokenByMint(mint);
          const tokenToUse = token || {
            mint: mint,
            symbol: mint.slice(0, 4).toUpperCase(),
            name: `Unknown Token (${mint.slice(0, 8)}...)`,
            decimals: tokenInfo.tokenAmount?.decimals || 6,
            logoURI: undefined
          };

          // Get signatures for this token account (limited)
          const signatures = await connection.getSignaturesForAddress(tokenAccount.pubkey, { limit: 20 });
          
          // Process in smaller batches
          const batchSize = 5;
          for (let i = 0; i < Math.min(signatures.length, 20); i += batchSize) {
            const batch = signatures.slice(i, i + batchSize);
            
            for (const sig of batch) {
              try {
                const tx = await connection.getParsedTransaction(sig.signature, {
                  maxSupportedTransactionVersion: 0
                });
                if (!tx || !tx.meta) continue;

                // Parse token transfers from instruction data
                let tokenTransferFound = false;
                let amountChange = 0;

                // Look for token transfer instructions
                const instructions = tx.transaction.message.instructions;
                for (const instruction of instructions) {
                  if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
                    const info = instruction.parsed.info;
                    if (info.mint === mint) {
                      const amount = parseFloat(info.tokenAmount?.uiAmountString || '0');
                      if (info.destination === tokenAccount.pubkey.toString()) {
                        amountChange += amount; // Incoming
                      } else if (info.source === tokenAccount.pubkey.toString()) {
                        amountChange -= amount; // Outgoing
                      }
                      tokenTransferFound = true;
                    }
                  }
                }

                // If no parsed transfer found, try to get from token balances
                if (!tokenTransferFound && tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
                  const postBalance = tx.meta.postTokenBalances.find(
                    balance => balance.mint === mint && balance.owner === walletPubkey.toString()
                  );
                  const preBalance = tx.meta.preTokenBalances.find(
                    balance => balance.mint === mint && balance.owner === walletPubkey.toString()
                  );

                  if (postBalance && preBalance) {
                    amountChange = (postBalance.uiTokenAmount.uiAmount || 0) - 
                                 (preBalance.uiTokenAmount.uiAmount || 0);
                    tokenTransferFound = true;
                  } else if (postBalance && !preBalance) {
                    amountChange = postBalance.uiTokenAmount.uiAmount || 0;
                    tokenTransferFound = true;
                  } else if (!postBalance && preBalance) {
                    amountChange = -(preBalance.uiTokenAmount.uiAmount || 0);
                    tokenTransferFound = true;
                  }
                }

                if (tokenTransferFound && Math.abs(amountChange) > 0) {
                  splTransactions.push({
                    id: `${sig.signature}-${mint}`,
                    signature: sig.signature,
                    amount: Math.abs(amountChange),
                    type: amountChange > 0 ? 'income' : 'expense' as const,
                    category: 'Uncategorized',
                    description: `${tokenToUse.symbol} ${amountChange > 0 ? 'Received' : 'Sent'} - ${wallet.name}`,
                    timestamp: new Date(sig.blockTime! * 1000),
                    status: 'confirmed' as const,
                    classified: false,
                    fromAddress: wallet.address,
                    token: tokenToUse,
                  });
                }
              } catch (error) {
                console.error(`Error fetching SPL transaction ${sig.signature}:`, error);
              }
            }
            
            // Add delay between batches
            if (i + batchSize < signatures.length) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (error) {
          console.error('Error fetching token account transactions:', error);
        }
      }

      return splTransactions;
    } catch (error) {
      console.error(`Error fetching SPL transactions for ${wallet.name}:`, error);
      return [];
    }
  };

  const fetchTransactions = fetchAllTransactions; // Keep the old method name for compatibility

  const classifyTransaction = (id: string, category: string, notes?: string) => {
    setTransactions(prev => 
      prev.map(tx => 
        tx.id === id 
          ? { ...tx, category, notes, classified: true }
          : tx
      )
    );
  };

  // Filter transactions based on token filter
  const filteredTransactions = tokenFilter.enabled 
    ? transactions.filter(tx => tokenFilter.selectedTokens.includes(tx.token.mint))
    : transactions;

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    loading,
    fetchTransactions,
    classifyTransaction,
    fetchAllTransactions,
    tokenFilter,
    setTokenFilter,
  };
}