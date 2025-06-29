import React, { useState, useEffect } from 'react';
import { WalletContextProvider } from './contexts/WalletContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { InvoiceManager } from './components/InvoiceManager';
import { Settings } from './components/Settings';
import { Categories } from './components/Categories';
import { useTransactions } from './hooks/useTransactions';
import { initializeExchangeRates } from './utils/currency';
import {
  ErrorBoundary,
  CurrencyErrorBoundary,
  TransactionErrorBoundary,
  SettingsErrorBoundary
} from './components/ErrorBoundary';
import { logError, logInfo } from './utils/secure-logger';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { transactions, classifyTransaction, fetchAllTransactions, loading } = useTransactions();

  // Initialize exchange rates on app startup with secure logging
  useEffect(() => {
    const initRates = async () => {
      const startTime = performance.now();
      try {
        await initializeExchangeRates();
        const duration = performance.now() - startTime;
        logInfo('Exchange rates initialized successfully', { duration: `${duration.toFixed(2)}ms` }, {
          component: 'App',
          function: 'initRates'
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        logError('Failed to initialize exchange rates on startup', error, {
          component: 'App',
          function: 'initRates',
          duration: `${duration.toFixed(2)}ms`
        });
      }
    };
    
    initRates();
  }, []);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <CurrencyErrorBoundary>
            <Dashboard onPageChange={setCurrentPage} />
          </CurrencyErrorBoundary>
        );
      case 'transactions':
        return (
          <TransactionErrorBoundary onRefresh={fetchAllTransactions}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    View and classify all transactions from your monitored wallets
                  </p>
                </div>
              </div>
              <TransactionList
                transactions={transactions}
                onClassifyTransaction={classifyTransaction}
                showRefreshButton={true}
                onRefresh={fetchAllTransactions}
                loading={loading}
              />
            </div>
          </TransactionErrorBoundary>
        );
      case 'invoices':
        return (
          <ErrorBoundary
            fallbackTitle="Invoice Manager Error"
            fallbackMessage="Unable to load invoice management. Please refresh to try again."
          >
            <InvoiceManager />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <SettingsErrorBoundary>
            <Settings />
          </SettingsErrorBoundary>
        );
      case 'categories':
        return (
          <ErrorBoundary
            fallbackTitle="Categories Error"
            fallbackMessage="Unable to load category management. Please refresh to try again."
          >
            <Categories />
          </ErrorBoundary>
        );
      default:
        return (
          <CurrencyErrorBoundary>
            <Dashboard onPageChange={setCurrentPage} />
          </CurrencyErrorBoundary>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6">
          {renderCurrentPage()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WalletContextProvider>
        <AppContent />
      </WalletContextProvider>
    </ThemeProvider>
  );
}

export default App;