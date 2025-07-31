// src/components/AdvancedAnalytics.tsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '../services/database';
import { Receipt, Expense } from '../types';

export default function AdvancedAnalytics() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const receipts = await db.getAllReceipts();
    const expenses = await db.getAllExpenses();

    const map: any = {};
    receipts.forEach(r => {
      const m = new Date(r.date).toISOString().slice(0, 7);
      map[m] = map[m] || { month: m, income: 0, expense: 0 };
      map[m].income += r.amount;
    });
    expenses.forEach(e => {
      const m = new Date(e.date).toISOString().slice(0, 7);
      map[m] = map[m] || { month: m, income: 0, expense: 0 };
      map[m].expense += e.amount;
    });

    const list = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    setMonthly(list);
    setCashFlow(list.slice(-6).map(v => ({ month: v.month, 'Cash In': v.income, 'Cash Out': v.expense })));

    const unpaidRec = receipts.filter(r => !r.paid);
    const unpaidExp = expenses.filter(e => !e.paid);
    setReceivables(unpaidRec.slice(0, 5));
    setPayables(unpaidExp.slice(0, 5));
  }

  const totalIncome = monthly.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthly.reduce((s, m) => s + m.expense, 0);
  const assets = totalIncome;
  const liabilities = totalExpense;
  const netWorth = assets - liabilities;

  return (
    <div className="p-6 space-y-8">
      {/* Balance Sheet */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg shadow"><h3 className="text-lg font-bold text-blue-800">Assets</h3><p className="text-2xl font-semibold text-blue-900">Rs {assets.toLocaleString()}</p></div>
        <div className="bg-red-100 p-4 rounded-lg shadow"><h3 className="text-lg font-bold text-red-800">Liabilities</h3><p className="text-2xl font-semibold text-red-900">Rs {liabilities.toLocaleString()}</p></div>
        <div className="bg-green-100 p-4 rounded-lg shadow"><h3 className="text-lg font-bold text-green-800">Net Worth</h3><p className="text-2xl font-semibold text-green-900">Rs {netWorth.toLocaleString()}</p></div>
      </div>

      {/* Monthly P&L */}
      <div>
        <h2 className="text-xl font-bold mb-2">Monthly Income vs Expense</h2>
        <ResponsiveContainer width="100%" height={300}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={v => `Rs ${v.toLocaleString()}`} /><Legend /><Bar dataKey="income" fill="#34d399" /><Bar dataKey="expense" fill="#f87171" /></BarChart></ResponsiveContainer>
      </div>

      {/* Cash-Flow Trend */}
      <div>
        <h2 className="text-xl font-bold mb-2">6-Month Cash Flow</h2>
        <ResponsiveContainer width="100%" height={300}><LineChart data={cashFlow}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={v => `Rs ${v.toLocaleString()}`} /><Legend /><Line type="monotone" dataKey="Cash In" stroke="#10b981" /><Line type="monotone" dataKey="Cash Out" stroke="#ef4444" /></LineChart></ResponsiveContainer>
      </div>

      {/* Outstanding */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Outstanding Receivables (Top 5)</h2>
          <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Client</th><th>Amount</th></tr></thead><tbody>{receivables.map(r => <tr key={r.id}><td>{r.clientName}</td><td>Rs {r.amount.toLocaleString()}</td></tr>)}</tbody></table>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Outstanding Payables (Top 5)</h2>
          <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Description</th><th>Amount</th></tr></thead><tbody>{payables.map(e => <tr key={e.id}><td>{e.description}</td><td>Rs {e.amount.toLocaleString()}</td></tr>)}</tbody></table>
        </div>
      </div>
    </div>
  );
}