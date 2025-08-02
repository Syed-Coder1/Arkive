// -------------  Clients.tsx  -------------
import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Download, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { firebaseSync } from "../services/firebaseSync";
import { formatCurrency } from '../services/export'; // if you have it, else delete lines that use it

interface Client {
  id: string;
  name: string;
  cnic: string;
  type: 'IRIS' | 'SECP' | 'PRA' | 'Other';
  phone?: string;
  email?: string;
  notes?: string;
  password?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ----------  helpers  ---------- */
const createClient = (c: Omit<Client, 'id' | 'createdAt'>) =>
  firebaseSync.addToSyncQueue({
    type: 'create',
    store: 'clients',
    data: { ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
  });

const updateClient = (c: Client) =>
  firebaseSync.addToSyncQueue({
    type: 'update',
    store: 'clients',
    data: { ...c, updatedAt: new Date().toISOString() },
  });

const deleteClient = (id: string) =>
  firebaseSync.addToSyncQueue({
    type: 'delete',
    store: 'clients',
    data: { id },
  });

/* ----------  component  ---------- */
export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  /* -- real-time listener -- */
  useEffect(() => {
    firebaseSync.setupRealtimeListener('clients', (data) =>
      setClients(data || [])
    );
    return () => firebaseSync.removeRealtimeListener('clients');
  }, []);

  /* -- form state -- */
  const [form, setForm] = useState({
    name: '',
    cnic: '',
    password: '',
    type: 'Other' as Client['type'],
    phone: '',
    email: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      cnic: '',
      password: '',
      type: 'Other',
      phone: '',
      email: '',
      notes: '',
    });
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{13}$/.test(form.cnic)) return alert('CNIC must be 13 digits');
    const payload = { ...form };
    editingClient
      ? updateClient({ ...editingClient, ...payload })
      : createClient(payload);
    resetForm();
    setShowForm(false);
  };

  /* -- helpers -- */
  const filtered = clients.filter((c) =>
    `${c.name} ${c.cnic} ${c.phone} ${c.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4">
      {/* header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Clients</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Plus size={18} /> New Client
        </button>
      </div>

      {/* search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search name, CNIC, phone, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="px-4 py-2 text-left text-sm font-medium dark:text-gray-300">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium dark:text-gray-300">CNIC</th>
              <th className="px-4 py-2 text-left text-sm font-medium dark:text-gray-300">Type</th>
              <th className="px-4 py-2 text-left text-sm font-medium dark:text-gray-300">Contact</th>
              <th className="px-4 py-2 text-left text-sm font-medium dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b dark:border-gray-700">
                <td className="px-4 py-2 dark:text-white">{c.name}</td>
                <td className="px-4 py-2 dark:text-gray-300">{c.cnic}</td>
                <td className="px-4 py-2"><span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{c.type}</span></td>
                <td className="px-4 py-2 dark:text-gray-300">{c.phone}<br />{c.email}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => setEditingClient(c)} className="text-blue-600"><Edit size={16} /></button>
                  <button onClick={() => alert('Receipts viewer coming soon')} className="text-green-600"><Eye size={16} /></button>
                  <button onClick={() => deleteClient(c.id)} className="text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 dark:border-gray-700 transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {editingClient ? 'Edit' : 'New'} Client
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {['name', 'cnic', 'phone', 'email'].map((k) => (
                <input
                  key={k}
                  type={k === 'email' ? 'email' : 'text'}
                  placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={form[k as keyof typeof form]}
                  onChange={(e) => setForm({...form, [k]: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  maxLength={k === 'cnic' ? 13 : undefined}
                />
              ))}
              <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value as Client['type']})} className="w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option>IRIS</option><option>SECP</option><option>PRA</option><option>Other</option>
              </select>
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white" required={!editingClient} />
              <div className="flex gap-2">
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-all duration-200 font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md">{editingClient ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}