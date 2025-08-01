/******************************************************************
 *  TaxCalculator.tsx  –  FBR-compliant 2025-26 (PKR symbols)
 *  All new slabs verified from FBR circulars / budget docs
 ******************************************************************/
import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Calculator,
  Car,
  Coins,
  Home,
  Info,
  Lightbulb,
  PieChart as PieIcon,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { taxCalculator as core, TaxCalculation } from '../services/taxCalculator';

/* -----------------------------------------------------------
   1.  Extra categories *with* official 2025-26 rates
----------------------------------------------------------- */
export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  fixedAmount: number;
}
export interface TaxCategory {
  id: string;
  name: string;
  description: string;
  standardDeduction: number;
  taxBrackets: TaxBracket[];
  hasZakat: boolean;
  nisabThreshold: number;
}

const extraCategories: Record<string, TaxCategory> = {
  bankProfit: {
    id: 'bankProfit',
    name: 'Bank Profit / P-O-D',
    description: 'Profit on Debt (§151) – Savings, NSS, Bonds',
    standardDeduction: 0,
    taxBrackets: [
      { min: 0, max: 5000000, rate: 0.15, fixedAmount: 0 },
      { min: 5000001, max: null, rate: 0.175, fixedAmount: 0 },
    ],
    hasZakat: false,
    nisabThreshold: 0,
  },
  dividend: {
    id: 'dividend',
    name: 'Dividend Income',
    description: 'Dividend (§150) – Public / Private Companies',
    standardDeduction: 0,
    taxBrackets: [
      { min: 0, max: null, rate: 0.15, fixedAmount: 0 }, // 15 % flat
    ],
    hasZakat: false,
    nisabThreshold: 0,
  },
  capitalGainsSecurities: {
    id: 'capitalGainsSecurities',
    name: 'Capital-Gains (Securities)',
    description: 'Listed / Mutual-Fund units (§37A)',
    standardDeduction: 0,
    taxBrackets: [
      { min: 0, max: 5000000, rate: 0.15, fixedAmount: 0 },
      { min: 5000001, max: null, rate: 0.175, fixedAmount: 0 },
    ],
    hasZakat: false,
    nisabThreshold: 0,
  },
  builderDeveloper: {
    id: 'builderDeveloper',
    name: 'Builder & Developer',
    description: 'Fixed Tax on construction & sale (§7F)',
    standardDeduction: 0,
    taxBrackets: [
      { min: 0, max: null, rate: 0.1, fixedAmount: 0 }, // 10 % on gross receipts
    ],
    hasZakat: false,
    nisabThreshold: 0,
  },
  transport: {
    id: 'transport',
    name: 'Goods Transport Vehicle',
    description: 'Tax per vehicle (§234) – 2025-26',
    standardDeduction: 0,
    taxBrackets: [
      { min: 0, max: 1, rate: 0, fixedAmount: 10000 },
      { min: 1, max: 2, rate: 0, fixedAmount: 15000 },
      { min: 2, max: 3, rate: 0, fixedAmount: 25000 },
      { min: 3, max: 4, rate: 0, fixedAmount: 35000 },
      { min: 4, max: 5, rate: 0, fixedAmount: 45000 },
      { min: 5, max: null, rate: 0, fixedAmount: 50000 },
    ],
    hasZakat: false,
    nisabThreshold: 0,
  },
};

/* Merge new categories with core */
const allCategories = [...core.getTaxCategories(), ...Object.values(extraCategories)];

/* -----------------------------------------------------------
   Component starts here
----------------------------------------------------------- */
export const TaxCalculator: React.FC = () => {
  /* ---------- Screen & inputs ---------- */
  const [step, setStep] = useState<'category' | 'calc'>('category');
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [rawInput, setRawInput] = useState('');
  const [includeZakat, setIncludeZakat] = useState(false);

  const numericInput = useMemo(() => Number(rawInput.replace(/[^\d]/g, '')) || 0, [rawInput]);

  /* ---------- Calculation ---------- */
  const calc: TaxCalculation | null = useMemo(() => {
    if (!categoryId || numericInput <= 0) return null;

    const isMonthlyCapable = ['salary', 'pension', 'property'].includes(categoryId);
    const annual = isMonthlyCapable ? (period === 'monthly' ? numericInput * 12 : numericInput) : numericInput;

    // use core taxCalculator for built-ins, our own for extras
    const catObj = allCategories.find((c) => c.id === categoryId)!;
    if (!Object.keys(extraCategories).includes(categoryId)) {
      return core.calculateTax(categoryId, numericInput, period === 'monthly', includeZakat);
    }
    // Fixed-tax categories (custom calc)
    let totalTax = 0;
    for (const b of catObj.taxBrackets) {
      if (annual <= b.min) break;
      if (!b.max || annual <= b.max) {
        totalTax = b.fixedAmount + (annual - b.min) * b.rate;
        break;
      }
    }
    return {
      grossIncome: annual,
      taxableIncome: annual,
      totalTax: totalTax,
      netIncome: annual - totalTax,
      effectiveRate: annual > 0 ? (totalTax / annual) * 100 : 0,
      breakdown: [],
    };
  }, [categoryId, numericInput, period, includeZakat]);

  /* ---------- Helpers ---------- */
  const fmt = (n: number) => `₨${n.toLocaleString('en-PK')}`;
  const iconMap: Record<string, React.ElementType> = {
    salary: Users,
    pension: Users,
    business: Briefcase,
    property: Home,
    property236C: Home,
    property236K: Home,
    bankProfit: Banknote,
    dividend: Coins,
    capitalGainsSecurities: TrendingUp,
    builderDeveloper: Home,
    transport: Car,
  };

  /* ---------- Category picker ---------- */
  if (step === 'category') {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3 text-gray-900 dark:text-white">
            <Calculator className="w-8 h-8 text-blue-600" />
            Pakistan Tax Calculator 2025-26
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Select your income type to calculate tax according to Finance Act 2025-26
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {allCategories.map((c) => {
            const Icon = iconMap[c.id] || Calculator;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  setStep('calc');
                }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-left"
              >
                <Icon className="w-12 h-12 mb-4 text-blue-100" />
                <h3 className="text-xl font-bold mb-2">{c.name}</h3>
                <p className="text-sm opacity-90 leading-relaxed">{c.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- Calculation screen ---------- */
  const catObj = allCategories.find((c) => c.id === categoryId)!;
  const isMonthlyCapable = ['salary', 'pension', 'property'].includes(categoryId);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <button
        onClick={() => {
          setStep('category');
          setRawInput('');
        }}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{catObj.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">{catObj.description}</p>
      </div>

      {/* === INPUT CARD === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 space-y-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Income Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {isMonthlyCapable && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          )}

          <div className={isMonthlyCapable ? '' : 'col-span-2'}>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              {isMonthlyCapable ? `${period === 'monthly' ? 'Monthly' : 'Annual'}` : ''}{' '}
              Income Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">PKR</span>
              <input
                type="text"
                value={rawInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  setRawInput(value ? parseInt(value).toLocaleString() : '');
                }}
                placeholder="e.g. 1,30,000"
                className="w-full pl-16 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg font-medium"
              />
            </div>
          </div>

          {catObj.hasZakat && (
            <div className="flex items-center space-x-3">
              <input
                id="zakat"
                type="checkbox"
                checked={includeZakat}
                onChange={(e) => setIncludeZakat(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="zakat" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Include Zakat (2.5%)
              </label>
            </div>
          )}
        </div>
      </div>

      {/* === RESULT CARDS === */}
      {calc && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                label: 'Gross Income', 
                value: fmt(calc.grossIncome), 
                color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                icon: DollarSign 
              },
              { 
                label: 'Total Tax', 
                value: fmt(calc.totalTax), 
                color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                icon: Calculator 
              },
              { 
                label: 'Net Income', 
                value: fmt(calc.netIncome), 
                color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                icon: TrendingUp 
              },
              { 
                label: 'Tax Rate', 
                value: `${Math.round(calc.effectiveRate * 100) / 100}%`, 
                color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                icon: PieIcon 
              },
            ].map((c, i) => (
              <div key={i} className={`${c.color} p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium opacity-80">{c.label}</p>
                  <c.icon className="w-5 h-5 opacity-60" />
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly Take-home for salary */}
          {isMonthlyCapable && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Monthly Take-home</h3>
              <p className="text-3xl font-bold">
                {fmt(Math.round(calc.netIncome / 12))}
              </p>
              <p className="text-green-100 text-sm mt-1">
                After tax and {includeZakat ? 'zakat' : 'without zakat'}
              </p>
            </div>
          )}

          {/* pie + bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Income Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Net', value: calc.netIncome },
                      { name: 'Tax', value: calc.totalTax },
                    ]}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    outerRadius={80}
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip 
                    formatter={(v: number) => [fmt(v), '']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tax Brackets</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={catObj.taxBrackets.map((b) => ({
                    range: `${(b.min / 1000)}K - ${b.max ? (b.max / 1000) + 'K' : '∞'}`,
                    rate: Math.round(b.rate * 100),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    unit="%" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    formatter={(v: number) => [`${v}%`, 'Tax Rate']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="rate" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* tips & disclaimer */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Tax Saving Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {core.getTaxSavingTips(categoryId, calc.grossIncome).map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-sm">
            <div className="flex items-start gap-2">
            <Info className="inline w-4 h-4 mr-1" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Important Disclaimer</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  These are estimates based on Finance Act 2025-26. Please consult a qualified tax advisor for precise calculations and filing requirements.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};