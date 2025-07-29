import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Download, Calendar, Edit, Trash2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { exportService } from '../services/export';
import { db } from '../services/database';
import { firebaseSync } from '../firebasesync'; // your sync service

interface ClientsProps {
  showForm?: boolean;
  onCloseForm?: () => void;
}

export function Clients({ showForm: externalShowForm, onCloseForm }: ClientsProps) {
  const { clients: localClients, createClient, loading } = useClients();
  const { getReceiptsByClient } = useReceipts();
  const [showForm, setShowForm] = useState(externalShowForm || false);
  const [showClientDetails, setShowClientDetails] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [clientReceipts, setClientReceipts] = useState<any[]>([]);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);

  // Sync clients from Firebase and merge with local clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const firebaseClients = await getAllClientsFromFirebase();
        const mergedClients = [...localClients];

        firebaseClients.forEach(fbClient => {
          const existingIndex = mergedClients.findIndex(c => c.id === fbClient.id);
          if (existingIndex >= 0) {
            mergedClients[existingIndex] = fbClient;
          } else {
            mergedClients.push(fbClient);
          }
        });

        setClients(mergedClients);
      } catch (error) {
        console.error('Error fetching clients from Firebase:', error);
        setClients(localClients);
      }
    };

    fetchClients();
  }, [localClients]);

  useEffect(() => {
    if (externalShowForm !== undefined) {
      setShowForm(externalShowForm);
    }
  }, [externalShowForm]);

  const [formData, setFormData] = useState({
    name: '',
    cnic: '',
    password: '',
    type: 'Other' as const,
    phone: '',
    email: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!/^\d{13}$/.test(formData.cnic)) {
      alert('CNIC must be exactly 13 digits');
      return;
    }
    
    const existingClient = clients.find(c => c.cnic === formData.cnic);
    if (existingClient) {
      alert('A client with this CNIC already exists');
      return;
    }
    
    try {
      const newId = crypto.randomUUID();
      const newClient = { ...formData, id: newId, createdAt: new Date() };
      await createClient(newClient);
      try {
        await syncClientToFirebase(newClient);
      } catch (error) {
        console.warn('Firebase sync failed:', error);
      }

      setFormData({
        name: '',
        cnic: '',
        password: '',
        type: 'Other',
        phone: '',
        email: '',
        notes: '',
      });
      setShowForm(false);
      alert('Client created successfully!');
     
      if (onCloseForm) {
        onCloseForm();
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error creating client: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleViewClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const receipts = await getReceiptsByClient(client.cnic);
      setClientReceipts(receipts);
      setShowClientDetails(clientId);
    }
  };

  const handleExportClient = async (client: any) => {
    const receipts = await getReceiptsByClient(client.cnic);
    await exportService.exportClientPaymentHistory(client, receipts);
  };

  const handleExportAll = async () => {
    await exportService.exportClientsToExcel(filteredClients);
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name,
      cnic: client.cnic,
      password: '', // Don't pre-fill password for security
      type: client.type,
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (clientId: string) => {
    if (confirm('Are you sure you want to delete this client? This will also delete all associated receipts.')) {
      try {
        await db.deleteClient(clientId);
        try {
          await deleteClientFromFirebase(clientId);
        } catch (error) {
          console.warn('Firebase delete failed:', error);
        }
        setClients(clients.filter(client => client.id !== clientId));
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Error deleting client');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!/^\d{13}$/.test(formData.cnic)) {
      alert('CNIC must be exactly 13 digits');
      return;
    }
    
    try {
      const updatedClient = {
        ...editingClient,
        name: formData.name,
        cnic: formData.cnic,
        type: formData.type,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        updatedAt: new Date(),
      };
      
      if (formData.password) {
        updatedClient.password = formData.password;
      }
      
      await db.updateClient(updatedClient);
      try {
        await syncClientToFirebase(updatedClient);
      } catch (error) {
        console.warn('Firebase sync failed:', error);
      }
      
      setClients(clients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      ));
      
      setFormData({
        name: '',
        cnic: '',
        password: '',
        type: 'Other',
        phone: '',
        email: '',
        notes: '',
      });
      setEditingClient(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client');
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnic.includes(searchTerm) ||
      client.phone?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || client.type === filterType;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage client information and payment history
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Export All
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            New Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, CNIC, phone, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="IRIS">IRIS</option>
              <option value="SECP">SECP</option>
              <option value="PRA">PRA</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CNIC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Created: {format(client.createdAt, 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {client.cnic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {client.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>{client.phone || 'N/A'}</div>
                    <div className="text-gray-500 dark:text-gray-400">{client.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Edit Client"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleViewClient(client.id)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        title="View Client Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleExportClient(client)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                        title="Export Client Data"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 min-h-screen overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingClient ? 'Edit Client' : 'New Client'}
            </h2>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <form onSubmit={editingClient ? handleUpdate : handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter client name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CNIC *
                  </label>
                  <input
                    type="text"
                    value={formData.cnic}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setFormData({ ...formData, cnic: value });
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
                    Password {editingClient ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required={!editingClient}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="IRIS">IRIS</option>
                    <option value="SECP">SECP</option>
                    <option value="PRA">PRA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      if (onCloseForm) onCloseForm();
                      setEditingClient(null);
                      setFormData({
                        name: '',
                        cnic: '',
                        password: '',
                        type: 'Other',
                        phone: '',
                        email: '',
                        notes: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingClient ? 'Update Client' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showClientDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const client = clients.find(c => c.id === showClientDetails);
              if (!client) return null;

              const totalAmount = clientReceipts.reduce((sum, r) => sum + r.amount, 0);

              return (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h2>
                      <button
                        onClick={() => setShowClientDetails(null)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        ×
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Client Information</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium text-gray-900 dark:text-white">CNIC:</span> <span className="text-gray-600 dark:text-gray-400">{client.cnic}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">Type:</span> <span className="text-gray-600 dark:text-gray-400">{client.type}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">Phone:</span> <span className="text-gray-600 dark:text-gray-400">{client.phone || 'N/A'}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">Email:</span> <span className="text-gray-600 dark:text-gray-400">{client.email || 'N/A'}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">Notes:</span> <span className="text-gray-600 dark:text-gray-400">{client.notes || 'N/A'}</span></div>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Payment Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium text-gray-900 dark:text-white">Total Receipts:</span> <span className="text-gray-600 dark:text-gray-400">{clientReceipts.length}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">Total Amount:</span> <span className="text-gray-600 dark:text-gray-400">Rs. {totalAmount.toLocaleString()}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">First Payment:</span> <span className="text-gray-600 dark:text-gray-400">{clientReceipts.length > 0 ? format(Math.min(...clientReceipts.map(r => r.date.getTime())), 'MMM dd, yyyy') : 'N/A'}</span></div>
                          <div><span className="font-medium text-gray-900 dark:text-white">Last Payment:</span> <span className="text-gray-600 dark:text-gray-400">{clientReceipts.length > 0 ? format(Math.max(...clientReceipts.map(r => r.date.getTime())), 'MMM dd, yyyy') : 'N/A'}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Payment History</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200 dark:border-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nature of Work</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {clientReceipts.map((receipt) => (
                              <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{format(receipt.date, 'MMM dd, yyyy')}</td>
                                <td className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400">Rs. {receipt.amount.toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{receipt.natureOfWork}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white capitalize">{receipt.paymentMethod.replace('_', ' ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleExportClient(client)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Export History
                      </button>
                      <button
                        onClick={() => setShowClientDetails(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mt-4">
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Vault Documents
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium text-gray-900 dark:text-white">Stored Files:</span> <span className="text-gray-600 dark:text-gray-400">Coming soon...</span></div>
                      <button className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm">
                        View Vault →
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}