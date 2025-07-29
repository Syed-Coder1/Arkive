/******************************************************************
 *  TaxCalculator.tsx  –  FBR-compliant input edition  (Jul 2025)
 *  Drop-in replacement for the old component.
 ******************************************************************/
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Briefcase, Calculator, DollarSign, Home, Info, Lightbulb, PieChart as PieIcon, TrendingUp, Users } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { taxCalculator, TaxCalculation } from '../services/taxCalculator';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const TaxCalculator: React.FC = () => {
  /* -----------------------------------------------------------
     1. Category selection
  ----------------------------------------------------------- */
  const [step, setStep] = useState<'category' | 'calc'>('category');
  const [categoryId, setCategoryId] = useState('');

  /* -----------------------------------------------------------
     2. Category-specific input state
        (only the one that matters for the chosen category)
  ----------------------------------------------------------- */
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly'); // salary / pension / rent
  const [rawInput, setRawInput] = useState('');                           // raw text field
  const [includeZakat, setIncludeZakat] = useState(false);

  /* -----------------------------------------------------------
     3. Clean numeric value (commas stripped)
  ----------------------------------------------------------- */
  const numericInput = useMemo(() => Number(rawInput.replace(/[^\d]/g, '')) || 0, [rawInput]);

  /* -----------------------------------------------------------
     4. Calculation
        – For salary / pension / rent we allow monthly toggle
        – For all others we force annual (period disabled)
  ----------------------------------------------------------- */
  const result: TaxCalculation | null = useMemo(() => {
    if (!categoryId || numericInput <= 0) return null;

    const isMonthlyCapable = ['salary', 'pension', 'property'].includes(categoryId);
    return taxCalculator.calculateTax(
      categoryId,
      numericInput,
      isMonthlyCapable ? period === 'monthly' : false, // force annual for business / 236C / 236K
      includeZakat
    );
  }, [categoryId, numericInput, period, includeZakat]);

  /* -----------------------------------------------------------
     5. Quick helpers
  ----------------------------------------------------------- */
  const fmt = (n: number) => taxCalculator.formatCurrency(n);
  const categories = taxCalculator.getTaxCategories();

  /* -----------------------------------------------------------
     6. Category picker screen
  ----------------------------------------------------------- */
  if (step === 'category') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" /> Pakistan Tax Calculator 2025-26
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Choose the income type FBR will tax.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {categories.map((c) => {
            const Icon = c.id === 'salary' || c.id === 'pension' ? Users :
                         c.id === 'business' ? Briefcase :
                         c.id.startsWith('property') ? Home : Calculator;
            return (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setStep('calc'); }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow hover:shadow-lg"
              >
                <Icon className="w-10 h-10 mb-2" />
                <h3 className="text-xl font-bold">{c.name}</h3>
                <p className="text-sm opacity-90">{c.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------------
     7. Input card – field label & period toggle change
  ----------------------------------------------------------- */
  const isMonthlyCapable = ['salary', 'pension', 'property'].includes(categoryId);
  const fieldLabel: Record<string, string> = {
    salary: 'Monthly / Annual Gross Salary',
    pension: 'Monthly / Annual Pension',
    property: 'Monthly / Annual Rental Income',
    business: 'Annual Net Business Income',
    property236C: 'Total Sale Consideration',
    property236K: 'Fair-Market Value',
  };

  /* -----------------------------------------------------------
     8. Render calculation screen
  ----------------------------------------------------------- */
  const cat = categories.find((c) => c.id === categoryId)!;

  return (
    <div className="space-y-6">
      <button
        onClick={() => { setStep('category'); setRawInput(''); }}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cat.name}</h1>

      {/* === INPUT CARD === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* period toggle – only if category supports it */}
          {isMonthlyCapable && (
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          )}

          {/* amount field */}
          <div className={isMonthlyCapable ? '' : 'col-span-2'}>
            <label className="block text-sm font-medium mb-1">{fieldLabel[categoryId]}</label>
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

          {/* zakat checkbox */}
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

      {/* === RESULT CARDS, CHARTS, TABLES ETC. === */}
      {result && (
        <>
          {/* summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Gross Income', value: fmt(result.grossIncome) },
              { label: 'Total Tax', value: fmt(result.totalTax) },
              { label: 'Net Income', value: fmt(result.netIncome) },
              { label: 'Monthly Net', value: fmt(result.netIncome / 12) },
            ].map((c, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* pie & bar charts — unchanged */}
          