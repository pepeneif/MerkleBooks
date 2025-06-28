import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import { loadRPCConfig } from '../utils/storage';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  const [rpcConfig, setRpcConfig] = useState(() => loadRPCConfig());

  // Listen for RPC config changes
  useEffect(() => {
    const handleRPCConfigChange = (event: CustomEvent) => {
      setRpcConfig(event.detail);
    };

    window.addEventListener('rpcConfigChanged', handleRPCConfigChange as EventListener);
    return () => {
      window.removeEventListener('rpcConfigChanged', handleRPCConfigChange as EventListener);
    };
  }, []);

  const endpoint = useMemo(() => {
    if (rpcConfig.network === 'custom') {
      return rpcConfig.endpoint;
    }
    
    // Use default cluster URLs for standard networks
    switch (rpcConfig.network) {
      case 'mainnet-beta':
        return clusterApiUrl(WalletAdapterNetwork.Mainnet);
      case 'testnet':
        return clusterApiUrl(WalletAdapterNetwork.Testnet);
      case 'devnet':
      default:
        return clusterApiUrl(WalletAdapterNetwork.Devnet);
    }
  }, [rpcConfig]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}