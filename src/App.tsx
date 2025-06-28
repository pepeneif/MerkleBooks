import React, { useState } from 'react';
import { WalletContextProvider } from './contexts/WalletContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { InvoiceManager } from './components/InvoiceManager';
import { Settings } from './components/Settings';
import { Categories } from './components/Categories';
import { useTransactions } from './hooks/useTransactions';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { transactions, classifyTransaction } = useTransactions();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'transactions':
        return (
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
            />
          </div>
        );
      case 'invoices':
        return <InvoiceManager />;
      case 'settings':
        return <Settings />;
      case 'categories':
        return <Categories />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
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