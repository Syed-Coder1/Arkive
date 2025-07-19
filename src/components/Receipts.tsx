import React, { useState } from 'react';
import { Plus, Search, Filter, Download, Calendar, Edit, Trash2 } from 'lucide-react';
import { useReceipts, useClients } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { exportService } from '../services/export';
import { db } from '../services/database';

interface ReceiptsProps {
  showForm?: boolean;
  onCloseForm?: () => void;
}

export function Receipts({ showForm: externalShowForm, onCloseForm }: ReceiptsProps) {
  // Hooks and state
  const { receipts, createReceipt, loading } = useReceipts();
  const { clients } = useClients();
  const { user } = useAuth();
  
  const [showForm, setShowForm] = useState(externalShowForm || false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientCnic: '',
    amount: '',
    natureOfWork: '',
    paymentMethod: 'cash' as const,
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Effects
  React.useEffect(() => {
    if (externalShowForm !== undefined) {
      setShowForm(externalShowForm);
    }
  }, [externalShowForm]);

  // Helper functions
  const resetForm = () => {
    setFormData({
      clientName: '',
      clientCnic: '',
      amount: '',
      natureOfWork: '',
      paymentMethod: 'cash',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingReceipt(null);
    setShowForm(false);
    if (onCloseForm) onCloseForm();
  };

  const validateForm = () => {
    if (!/^\d{13}$/.test(formData.clientCnic)) {
      alert('CNIC must be exactly 13 digits');
      return false;
    }
    return true;
  };

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      let existingClient = clients.find(c => c.cnic === formData.clientCnic);
      
      if (!existingClient) {
        await db.createClient({
          name: formData.clientName,
          cnic: formData.clientCnic,
          password: 'default123',
          type: 'Other' as const,
          phone: '',
          email: '',
          notes: 'Auto-created from receipt',
        });
      }
      
      await createReceipt({
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        createdBy: user!.id,
      });
      
      resetForm();
      window.location.reload();
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert('Error creating receipt. Please try again.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      const updatedReceipt = {
        ...editingReceipt,
        clientName: formData.clientName,
        clientCnic: formData.clientCnic,
        amount: parseFloat(formData.amount),
        natureOfWork: formData.natureOfWork,
        paymentMethod: formData.paymentMethod,
        date: new Date(formData.date),
      };
      
      await db.updateReceipt(updatedReceipt);
      resetForm();
      window.location.reload();
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Error updating receipt');
    }
  };

  const handleEdit = (receipt: any) => {
    const client = clients.find(c => c.cnic === receipt.clientCnic);
    setFormData({
      clientName: client?.name || receipt.clientName,
      clientCnic: receipt.clientCnic,
      amount: receipt.amount.toString(),
      natureOfWork: receipt.natureOfWork,
      paymentMethod: receipt.paymentMethod,
      date: format(receipt.date, 'yyyy-MM-dd'),
    });
    setEditingReceipt(receipt);
    setShowForm(true);
  };

  const handleDelete = async (receiptId: string) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      try {
        await db.deleteReceipt(receiptId);
        window.location.reload();
      } catch (error) {
        console.error('Error deleting receipt:', error);
        alert('Error deleting receipt');
      }
    }
  };

  const handleExport = async () => {
    try {
      await exportService.exportReceiptsToExcel(filteredReceipts, clients);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Filtering logic
  const filteredReceipts = receipts.filter(receipt => {
    const client = clients.find(c => c.cnic === receipt.clientCnic);
    const matchesSearch = !searchTerm || 
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.clientCnic.includes(searchTerm) ||
      receipt.natureOfWork.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = !filterMonth || format(receipt.date, 'yyyy-MM') === filterMonth;
    const matchesPaymentMethod = !filterPaymentMethod || receipt.paymentMethod === filterPaymentMethod;

    return matchesSearch && matchesMonth && matchesPaymentMethod;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // JSX remains exactly the same as original
  return (
    <div className="space-y-6">
      {/* Header and buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receipts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage payment receipts and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            New Receipt
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client name, CNIC, or nature of work..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Month</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nature of Work
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReceipts.map((receipt) => {
                const client = clients.find(c => c.cnic === receipt.clientCnic);
                return (
                  <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {format(receipt.date, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {client?.name || 'Unknown Client'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{receipt.clientCnic}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                      Rs. {receipt.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {receipt.natureOfWork}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 capitalize">
                        {receipt.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(receipt)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Edit Receipt"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(receipt.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Delete Receipt"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Receipt Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-0 flex items-center justify-center z-50 p-4 min-h-screen overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingReceipt ? 'Edit Receipt' : 'New Receipt'}
            </h2>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <form onSubmit={editingReceipt ? handleUpdate : handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Enter client name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client CNIC *
                  </label>
                  <input
                    type="text"
                    value={formData.clientCnic}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setFormData({ ...formData, clientCnic: value });
                    }}
                    placeholder="Enter 13-digit CNIC"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    maxLength={13}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Must be exactly 13 digits
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nature of Work
                  </label>
                  <textarea
                    value={formData.natureOfWork}
                    onChange={(e) => setFormData({ ...formData, natureOfWork: e.target.value })}
                    placeholder="Describe the nature of work"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingReceipt ? 'Update Receipt' : 'Create Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}