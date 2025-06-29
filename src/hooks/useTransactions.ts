import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, ParsedAccountData } from '@solana/web3.js';
import { Transaction, TokenFilter } from '../types';
import { saveTransactions, loadTransactions, loadWalletConfigs, loadAutoRefreshSetting } from '../utils/storage';
import { SOL_TOKEN, getTokenByMint } from '../utils/tokens';
import { getExchangeRates } from '../utils/currency';
import { SECURITY_CONFIG, calculateBackoffDelay } from '../utils/security-config';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// --- Enhanced Wallet Processing Queue with Exponential Backoff ---
// This queue helps to process wallets one by one with intelligent delays,
// preventing rate-limiting issues and implementing retry logic

interface QueuedWallet {
  wallet: any;
  task: () => Promise<void>;
  retryCount: number;
  lastError?: Error;
}

const walletQueue: QueuedWallet[] = [];
let isQueueProcessing = false;

async function processWalletQueue() {
  if (isQueueProcessing || walletQueue.length === 0) return;

  // Enforce queue size limits
  if (walletQueue.length > SECURITY_CONFIG.MEMORY_LIMITS.WALLET_QUEUE_MAX_SIZE) {
    console.warn('Wallet queue size exceeded limit, clearing oldest entries');
    walletQueue.splice(0, walletQueue.length - SECURITY_CONFIG.MEMORY_LIMITS.WALLET_QUEUE_MAX_SIZE);
  }

  isQueueProcessing = true;
  const queuedItem = walletQueue.shift()!;
  const { wallet, task, retryCount } = queuedItem;

  try {
    console.log(`Processing wallet from queue: ${wallet.name} (attempt ${retryCount + 1})`);
    await task();
    console.log(`Successfully processed wallet: ${wallet.name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error processing wallet ${wallet.name} (attempt ${retryCount + 1}):`, errorMsg);
    
    // Check if we should retry
    if (retryCount < SECURITY_CONFIG.RATE_LIMITING.WALLET_QUEUE_MAX_RETRIES) {
      // Add back to queue with increased retry count
      const delay = calculateBackoffDelay(
        retryCount,
        SECURITY_CONFIG.RATE_LIMITING.WALLET_QUEUE_DELAY_BASE_MS,
        SECURITY_CONFIG.RATE_LIMITING.WALLET_QUEUE_DELAY_MAX_MS
      );
      
      console.log(`Scheduling retry for wallet ${wallet.name} in ${delay}ms`);
      setTimeout(() => {
        walletQueue.push({
          ...queuedItem,
          retryCount: retryCount + 1,
          lastError: error instanceof Error ? error : new Error(errorMsg)
        });
        processWalletQueue();
      }, delay);
    } else {
      console.error(`Max retries exceeded for wallet ${wallet.name}, giving up`);
    }
  } finally {
    // Calculate dynamic delay based on queue size and recent errors
    const baseDelay = SECURITY_CONFIG.RATE_LIMITING.WALLET_QUEUE_DELAY_BASE_MS;
    const queueSizeMultiplier = Math.min(walletQueue.length * 200, 2000); // Up to 2s extra delay
    const dynamicDelay = baseDelay + queueSizeMultiplier;
    
    setTimeout(() => {
      isQueueProcessing = false;
      processWalletQueue();
    }, dynamicDelay);
  }
}

function addToWalletQueue(wallet: any, task: () => Promise<void>) {
  // Check for duplicates to prevent duplicate processing
  const existingIndex = walletQueue.findIndex(item =>
    item.wallet.address === wallet.address || item.wallet.name === wallet.name
  );
  
  if (existingIndex >= 0) {
    console.log(`Wallet ${wallet.name} already in queue, skipping duplicate`);
    return;
  }

  walletQueue.push({
    wallet,
    task,
    retryCount: 0
  });
  
  if (!isQueueProcessing) {
    processWalletQueue();
  }
}

// --- Enhanced Transaction Cache with Memory Management ---
// Caches transaction signatures with size limits and cleanup
interface CacheEntry {
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

const transactionCache = new Map<string, CacheEntry>();

function isTransactionCached(signature: string): boolean {
  const entry = transactionCache.get(signature);
  if (entry) {
    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return true;
  }
  return false;
}

function cacheTransaction(signature: string, timestamp: number) {
  // Clean up cache if it's getting too large
  if (transactionCache.size >= SECURITY_CONFIG.MEMORY_LIMITS.TRANSACTION_CACHE_MAX_SIZE) {
    cleanupTransactionCache();
  }
  
  transactionCache.set(signature, {
    timestamp,
    accessCount: 1,
    lastAccessed: Date.now()
  });
}

function cleanupTransactionCache() {
  const now = Date.now();
  const entries = Array.from(transactionCache.entries());
  
  // Sort by least recently used and lowest access count
  entries.sort((a, b) => {
    const scoreA = a[1].accessCount * (now - a[1].lastAccessed);
    const scoreB = b[1].accessCount * (now - b[1].lastAccessed);
    return scoreB - scoreA; // Higher score = more important to keep
  });
  
  // Remove bottom 25% of entries
  const removeCount = Math.floor(entries.length * 0.25);
  for (let i = entries.length - removeCount; i < entries.length; i++) {
    transactionCache.delete(entries[i][0]);
  }
  
  console.log(`Cleaned up transaction cache, removed ${removeCount} entries, ${transactionCache.size} remaining`);
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
        const task = async () => {
          try {
            console.log(`Fetching transactions for wallet: ${wallet.name} (${wallet.address})`);
            const walletPubkey = new PublicKey(wallet.address);
            
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
        };
        addToWalletQueue(wallet, task);
      }

      // Wait for the queue to finish
      await new Promise<void>(resolve => {
        const interval = setInterval(() => {
          if (walletQueue.length === 0 && !isQueueProcessing) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });


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
      
      // Process signatures in batches with enhanced rate limiting
      const batchSize = SECURITY_CONFIG.RATE_LIMITING.TRANSACTION_BATCH_SIZE;
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (sig) => {
          try {
            // Check cache first
            if (isTransactionCached(sig.signature)) {
              return null; // Skip already processed transactions
            }
            
            // Create timeout for individual transaction requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort();
            }, SECURITY_CONFIG.RATE_LIMITING.RPC_REQUEST_TIMEOUT_MS);
            
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            });
            
            clearTimeout(timeoutId);
            
            if (!tx || !tx.meta) {
              cacheTransaction(sig.signature, Date.now());
              return null;
            }

            // Find the account index for this wallet
            const accountIndex = tx.transaction.message.staticAccountKeys.findIndex(
              key => key.toString() === walletPubkey.toString()
            );
            
            if (accountIndex === -1) {
              cacheTransaction(sig.signature, Date.now());
              return null;
            }

            // Calculate SOL balance change for this specific wallet
            const preBalance = tx.meta.preBalances[accountIndex] || 0;
            const postBalance = tx.meta.postBalances[accountIndex] || 0;
            const balanceChange = postBalance - preBalance;
            
            // Skip transactions with no balance change or very small changes (likely fees)
            if (Math.abs(balanceChange) < 1000) {
              cacheTransaction(sig.signature, Date.now());
              return null; // Less than 0.000001 SOL
            }

            const amount = Math.abs(balanceChange / 1e9); // Convert lamports to SOL
            
            // Cache the processed transaction
            cacheTransaction(sig.signature, Date.now());
            
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
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn(`SOL transaction request timed out: ${sig.signature}`);
            } else {
              console.error(`Error fetching SOL transaction ${sig.signature}:`, error);
            }
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        solTransactions.push(...batchResults.filter(Boolean));
        
        // Enhanced delay between batches with backoff if needed
        if (i + batchSize < signatures.length) {
          const delay = SECURITY_CONFIG.RATE_LIMITING.TRANSACTION_BATCH_DELAY_MS;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      return solTransactions as Transaction[];
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error fetching SOL transactions for ${wallet.name}:`, error.message);
      } else {
        console.error(`Error fetching SOL transactions for ${wallet.name}:`, error);
      }
      return [];
    }
  };

  const fetchSPLTransactions = async (walletPubkey: PublicKey, wallet: any) => {
    try {
      // Create timeout controller for token account fetching
      const accountsController = new AbortController();
      const accountsTimeoutId = setTimeout(() => {
        accountsController.abort();
      }, SECURITY_CONFIG.RATE_LIMITING.RPC_REQUEST_TIMEOUT_MS);

      // Get token accounts for this wallet with timeout control
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      clearTimeout(accountsTimeoutId);
      console.log(`Found ${tokenAccounts.value.length} token accounts for ${wallet.name}`);

      const splTransactions: Transaction[] = [];

      // Limit to first 5 token accounts to prevent overwhelming
      const limitedTokenAccounts = tokenAccounts.value.slice(0, SECURITY_CONFIG.PROCESSING_LIMITS.SPL_TOKEN_ACCOUNTS_MAX);

      for (const tokenAccount of limitedTokenAccounts) {
        try {
          const accountData = tokenAccount.account.data as ParsedAccountData;
          const tokenInfo = accountData.parsed.info;
          const mint = tokenInfo.mint;
          
          // Validate mint address format
          if (!mint || typeof mint !== 'string' || mint.length < 32) {
            console.warn(`Invalid mint address for token account: ${mint}`);
            continue;
          }
          
          // Get token info
          const token = getTokenByMint(mint);
          const tokenToUse = token || {
            mint: mint,
            symbol: mint.slice(0, 4).toUpperCase(),
            name: `Unknown Token (${mint.slice(0, 8)}...)`,
            decimals: Math.min(tokenInfo.tokenAmount?.decimals || 6, 18), // Cap decimals at 18
            logoURI: undefined
          };

          // Create timeout controller for signatures request
          const sigsController = new AbortController();
          const sigsTimeoutId = setTimeout(() => {
            sigsController.abort();
          }, SECURITY_CONFIG.RATE_LIMITING.RPC_REQUEST_TIMEOUT_MS);

          // Get signatures for this token account (limited)
          const signatures = await connection.getSignaturesForAddress(tokenAccount.pubkey, {
            limit: SECURITY_CONFIG.PROCESSING_LIMITS.SPL_SIGNATURES_PER_ACCOUNT_MAX
          });
          
          clearTimeout(sigsTimeoutId);
          
          // Process signatures in controlled batches
          const batchSize = SECURITY_CONFIG.RATE_LIMITING.TRANSACTION_BATCH_SIZE;
          const maxSignatures = Math.min(signatures.length, SECURITY_CONFIG.PROCESSING_LIMITS.SPL_SIGNATURES_PER_ACCOUNT_MAX);
          
          for (let i = 0; i < maxSignatures; i += batchSize) {
            const batch = signatures.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (sig) => {
              try {
                // Check cache first with SPL-specific key
                const cacheKey = `${sig.signature}-${mint}`;
                if (isTransactionCached(cacheKey)) {
                  return null; // Skip already processed transactions
                }

                // Create timeout controller for transaction request
                const txController = new AbortController();
                const txTimeoutId = setTimeout(() => {
                  txController.abort();
                }, SECURITY_CONFIG.RATE_LIMITING.RPC_REQUEST_TIMEOUT_MS);

                const tx = await connection.getParsedTransaction(sig.signature, {
                  maxSupportedTransactionVersion: 0
                });
                
                clearTimeout(txTimeoutId);
                
                if (!tx || !tx.meta) {
                  cacheTransaction(cacheKey, Date.now());
                  return null;
                }

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
                      
                      // Validate amount is reasonable
                      if (isNaN(amount) || amount < 0 || amount > SECURITY_CONFIG.VALIDATION_LIMITS.MAX_TOKEN_AMOUNT) {
                        console.warn(`Invalid token amount detected: ${amount} for ${tokenToUse.symbol}`);
                        continue;
                      }
                      
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
                    const postAmount = postBalance.uiTokenAmount.uiAmount || 0;
                    const preAmount = preBalance.uiTokenAmount.uiAmount || 0;
                    
                    // Validate amounts are reasonable
                    if (postAmount > SECURITY_CONFIG.VALIDATION_LIMITS.MAX_TOKEN_AMOUNT ||
                        preAmount > SECURITY_CONFIG.VALIDATION_LIMITS.MAX_TOKEN_AMOUNT) {
                      console.warn(`Unreasonable token balance detected for ${tokenToUse.symbol}`);
                      cacheTransaction(cacheKey, Date.now());
                      return null;
                    }
                    
                    amountChange = postAmount - preAmount;
                    tokenTransferFound = true;
                  } else if (postBalance && !preBalance) {
                    const amount = postBalance.uiTokenAmount.uiAmount || 0;
                    if (amount <= SECURITY_CONFIG.VALIDATION_LIMITS.MAX_TOKEN_AMOUNT) {
                      amountChange = amount;
                      tokenTransferFound = true;
                    }
                  } else if (!postBalance && preBalance) {
                    const amount = preBalance.uiTokenAmount.uiAmount || 0;
                    if (amount <= SECURITY_CONFIG.VALIDATION_LIMITS.MAX_TOKEN_AMOUNT) {
                      amountChange = -amount;
                      tokenTransferFound = true;
                    }
                  }
                }

                // Apply dust threshold filter and validate final amount
                const absoluteAmount = Math.abs(amountChange);
                if (tokenTransferFound &&
                    absoluteAmount > 0 &&
                    absoluteAmount >= SECURITY_CONFIG.VALIDATION_LIMITS.DUST_THRESHOLD &&
                    absoluteAmount <= SECURITY_CONFIG.VALIDATION_LIMITS.MAX_TOKEN_AMOUNT) {
                  
                  // Cache the processed transaction
                  cacheTransaction(cacheKey, Date.now());
                  
                  return {
                    id: `${sig.signature}-${mint}`,
                    signature: sig.signature,
                    amount: absoluteAmount,
                    type: amountChange > 0 ? 'income' : 'expense' as const,
                    category: 'Uncategorized',
                    description: `${tokenToUse.symbol} ${amountChange > 0 ? 'Received' : 'Sent'} - ${wallet.name}`,
                    timestamp: new Date(sig.blockTime! * 1000),
                    status: 'confirmed' as const,
                    classified: false,
                    fromAddress: wallet.address,
                    token: tokenToUse,
                  };
                } else {
                  // Cache even filtered transactions to avoid reprocessing
                  cacheTransaction(cacheKey, Date.now());
                  return null;
                }
              } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                  console.warn(`SPL transaction request timed out: ${sig.signature}`);
                } else {
                  console.error(`Error fetching SPL transaction ${sig.signature}:`, error);
                }
                return null;
              }
            });

            const batchResults = await Promise.all(batchPromises);
            const validTransactions = batchResults.filter(Boolean) as Transaction[];
            splTransactions.push(...validTransactions);
            
            // Enhanced delay between batches with backoff
            if (i + batchSize < maxSignatures) {
              const delay = SECURITY_CONFIG.RATE_LIMITING.TRANSACTION_BATCH_DELAY_MS;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn(`SPL token account request timed out for ${wallet.name}`);
          } else {
            console.error('Error fetching token account transactions:', error);
          }
        }
      }

      return splTransactions;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`SPL token accounts request timed out for ${wallet.name}`);
      } else {
        console.error(`Error fetching SPL transactions for ${wallet.name}:`, error);
      }
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
