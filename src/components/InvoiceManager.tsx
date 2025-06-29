import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Invoice } from '../types';
import { Plus, Send, Eye, Trash2, FileText, Calendar } from 'lucide-react';
import { saveInvoices, loadInvoices } from '../utils/storage';
import { SOL_TOKEN, formatTokenAmount } from '../utils/tokens';

export function InvoiceManager() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    description: '',
    notes: '',
    dueDate: '',
  });

  // Load invoices from localStorage on mount
  useEffect(() => {
    const savedInvoices = loadInvoices();
    setInvoices(savedInvoices);
  }, []);

  // Save invoices to localStorage whenever invoices change
  useEffect(() => {
    saveInvoices(invoices);
  }, [invoices]);

  const createInvoice = () => {
    if (!formData.recipient || !formData.amount || !formData.description) return;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      recipient: formData.recipient,
      amount: parseFloat(formData.amount),
      description: formData.description,
      notes: formData.notes,
      status: 'draft',
      createdAt: new Date(),
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      token: SOL_TOKEN,
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setFormData({ recipient: '', amount: '', description: '', notes: '', dueDate: '' });
    setShowCreateForm(false);
  };

  const payInvoice = async (invoice: Invoice) => {
    if (!publicKey || !sendTransaction) return;

    try {
      const recipientPubkey = new PublicKey(invoice.recipient);
      const lamports = invoice.amount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // Update invoice status
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === invoice.id
            ? { ...inv, status: 'paid', paidAt: new Date(), transactionId: signature }
            : inv
        )
      );

      alert('Payment sent successfully!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    }
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create and manage payment invoices
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <WalletMultiButton className="!bg-orange-600 hover:!bg-orange-700 !rounded-xl !px-4 !py-2 !text-sm !font-medium !transition-all !duration-200" />
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Invoice</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recipient Address *
              </label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                placeholder="Solana wallet address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount (SOL) *
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                placeholder="0.0000"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                placeholder="Payment for services..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={createInvoice}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200"
            >
              Create Invoice
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Create your first invoice to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {invoice.description}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : invoice.status === 'sent'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {formatTokenAmount(invoice.amount, invoice.token)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {invoice.createdAt.toLocaleDateString()}</span>
                      </div>
                      {invoice.dueDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due {invoice.dueDate.toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {invoice.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {invoice.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => payInvoice(invoice)}
                        disabled={!publicKey}
                        className="flex items-center space-x-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl text-sm transition-all duration-200"
                      >
                        <Send className="w-4 h-4" />
                        <span>Pay</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteInvoice(invoice.id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}