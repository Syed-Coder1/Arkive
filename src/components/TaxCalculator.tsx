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
      <div className="space-y-6 animate-fadeIn">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            Pakistan Tax Calculator 2025-26 (PKR)
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Select income type FBR will tax
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {allCategories.map((c) => {
            const Icon = iconMap[c.id] || Calculator;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  setStep('calc');
                }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow hover:shadow-lg transform hover:scale-105 transition"
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

  /* ---------- Calculation screen ---------- */
  const catObj = allCategories.find((c) => c.id === categoryId)!;
  const isMonthlyCapable = ['salary', 'pension', 'property'].includes(categoryId);

  return (
    <div className="space-y-6 animate-fadeIn">
      <button
        onClick={() => {
          setStep('category');
          setRawInput('');
        }}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{catObj.name}</h1>

      {/* === INPUT CARD === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {isMonthlyCapable && (
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          )}

          <div className={isMonthlyCapable ? '' : 'col-span-2'}>
            <label className="block text-sm font-medium mb-1">
              {isMonthlyCapable ? `${period === 'monthly' ? 'Monthly' : 'Annual'}` : ''}{' '}
              {catObj.name} (₨)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₨</span>
              <input
                type="text"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="e.g. 130,000"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          {catObj.hasZakat && (
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

      {/* === RESULT CARDS === */}
      {calc && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Gross Amount', value: fmt(calc.grossIncome) },
              { label: 'Total Tax', value: fmt(calc.totalTax) },
              { label: 'Net After Tax', value: fmt(calc.netIncome) },
              { label: 'Effective Rate', value: `${calc.effectiveRate.toFixed(2)} %` },
            ].map((c, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* pie + bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-2">Income Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Net', value: calc.netIncome },
                      { name: 'Tax', value: calc.totalTax },
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

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-2">Slabs / Rate</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={catObj.taxBrackets.map((b) => ({
                    range: `${fmt(b.min)} – ${b.max ? fmt(b.max) : '∞'}`,
                    rate: b.rate * 100,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="rate" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* tips & disclaimer */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Tax-saving Tips
            </h3>
            <ul className="space-y-1 text-sm">
              {core.getTaxSavingTips(categoryId, calc.grossIncome).map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm">
            <Info className="inline w-4 h-4 mr-1" />
            Disclaimer: Estimates per Finance Act 2025-26. Consult a qualified tax advisor for precise filing.
          </div>
        </>
      )}
    </div>
  );
};