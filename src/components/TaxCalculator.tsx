import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Briefcase, Calculator, DollarSign, Home, Info, Lightbulb, PieChart as PieIcon, TrendingUp, Users } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { taxCalculator, TaxCalculation } from '../services/taxCalculator';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const TaxCalculator: React.FC = () => {
  /* ---------- local state ---------- */
  const [step, setStep] = useState<'category' | 'calc'>('category');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [rawInput, setRawInput] = useState('');
  const [includeZakat, setIncludeZakat] = useState(false);

  /* ---------- numeric value (comma stripped) ---------- */
  const income = useMemo(() => {
    const n = Number(rawInput.replace(/[^\d]/g, ''));
    return isNaN(n) ? 0 : n;
  }, [rawInput]);

  /* ---------- calculation ---------- */
  const result: TaxCalculation | null = useMemo(() => {
    if (!categoryId || income <= 0) return null;
    return taxCalculator.calculateTax(categoryId, income, period === 'monthly', includeZakat);
  }, [categoryId, income, period, includeZakat]);

  /* ---------- helpers ---------- */
  const fmt = (n: number) => taxCalculator.formatCurrency(n);
  const categories = taxCalculator.getTaxCategories();

  /* ---------- category picker ---------- */
  if (step === 'category') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3 mb-4">
            <Calculator className="w-8 h-8 text-blue-600" />
            Pakistan Tax Calculator 2025-26
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select your income category to begin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map((c) => {
            const Icon = c.id === 'salary' || c.id === 'pension' ? Users :
                         c.id === 'business' ? Briefcase :
                         c.id.startsWith('property') ? Home : Calculator;
            return (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setStep('calc'); }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow hover:shadow-lg transform hover:scale-105 transition"
              >
                <Icon className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold">{c.name}</h3>
                <p className="text-sm opacity-90">{c.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- calculation screen ---------- */
  const cat = categories.find((c) => c.id === categoryId)!;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* back bar */}
      <button
        onClick={() => { setStep('category'); setRawInput(''); }}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> Back to Categories
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cat.name} Tax Calculator</h1>

      {/* === INPUT CARD === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 shadow">
        <h2 className="text-lg font-semibold">Income Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {period === 'monthly' ? 'Monthly' : 'Annual'} Income (PKR)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="e.g. 130,000"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          {cat.hasZakat && (
            <div className="flex items-center">
              <input
                id="zakat"
                type="checkbox"
                checked={includeZakat}
                onChange={(e) => setIncludeZakat(e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="zakat" className="ml-2 text-sm">Include Zakat (2.5 %)</label>
            </div>
          )}
        </div>
      </div>

      {/* === RESULTS === */}
      {result && (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Gross Income', value: fmt(result.grossIncome), icon: TrendingUp, color: 'blue' },
              { label: 'Total Tax', value: fmt(result.totalTax), icon: DollarSign, color: 'red' },
              { label: 'Net Income', value: fmt(result.netIncome), icon: DollarSign, color: 'green' },
              { label: 'Monthly Net', value: fmt(result.netIncome / 12), icon: DollarSign, color: 'purple' },
            ].map((c, i) => (
              <div key={i} className={`bg-${c.color}-50 dark:bg-${c.color}-900/20 p-4 rounded-xl border`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
                    <p className="text-2xl font-bold">{c.value}</p>
                  </div>
                  <c.icon className={`w-8 h-8 text-${c.color}-500`} />
                </div>
              </div>
            ))}
          </div>

          {/* pie chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><PieIcon size={20}/>Income Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Net Income', value: result.netIncome },
                    { name: 'Total Tax', value: result.totalTax },
                  ]}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* bar chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <h3 className="text-lg font-semibold mb-2">Tax Brackets ({cat.name})</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cat.taxBrackets.map((b, i) => ({
                range: `${fmt(b.min)} - ${b.max ? fmt(b.max) : '∞'}`,
                rate: b.rate * 100,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* saving tips */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500"/>Tax-saving Tips</h3>
            <ul className="space-y-1 text-sm">
              {taxCalculator.getTaxSavingTips(categoryId, income).map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm">
            <Info className="inline w-4 h-4 mr-1" />
            Disclaimer: Estimates per Finance Act 2025-26. Consult a qualified tax advisor for precise filing.
          </div>
        </>
      )}
    </div>
  );
};