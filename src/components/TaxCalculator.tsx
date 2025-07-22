import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, TrendingUp, Info, PieChart, FileText, Lightbulb } from 'lucide-react';
import { taxCalculator, TaxCalculation } from '../services/taxCalculator';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function TaxCalculator() {
  const [incomeType, setIncomeType] = useState<'monthly' | 'annual'>('monthly');
  const [income, setIncome] = useState('');
  const [includeZakat, setIncludeZakat] = useState(false);
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);

  useEffect(() => {
    if (income && parseFloat(income) > 0) {
      const incomeAmount = parseFloat(income);
      let result;
      
      if (incomeType === 'monthly') {
        result = taxCalculator.calculateAnnualFromMonthly(incomeAmount, includeZakat);
      } else {
        result = taxCalculator.calculateMonthlyFromAnnual(incomeAmount, includeZakat);
      }
      
      setCalculation(result);
      
      // Calculate scenarios based on annual income
      const annualIncome = incomeType === 'monthly' ? incomeAmount * 12 : incomeAmount;
      setScenarios(taxCalculator.calculateScenarios(annualIncome));
    } else {
      setCalculation(null);
      setScenarios([]);
    }
  }, [income, incomeType, includeZakat]);

  const pieData = calculation ? [
    { name: 'Net Income', value: calculation.netIncome, color: '#10B981' },
    { name: 'Income Tax', value: calculation.totalTax, color: '#EF4444' },
  ] : [];

  const bracketData = taxCalculator.getTaxBrackets().map((bracket, index) => ({
    bracket: `${(bracket.min / 1000).toFixed(0)}K - ${bracket.max ? (bracket.max / 1000).toFixed(0) + 'K' : 'Above'}`,
    rate: bracket.rate * 100,
    color: COLORS[index % COLORS.length]
  }));

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" />
            Pakistan Tax Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Calculate your income tax based on FBR regulations (Tax Year 2024-25)
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Income Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Income Type
            </label>
            <select
              value={incomeType}
              onChange={(e) => setIncomeType(e.target.value as 'monthly' | 'annual')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="monthly">Monthly Income</option>
              <option value="annual">Annual Income</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {incomeType === 'monthly' ? 'Monthly' : 'Annual'} Income (Rs.)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder={`Enter ${incomeType} income`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex items-center h-full">
              <input
                type="checkbox"
                id="includeZakat"
                checked={includeZakat}
                onChange={(e) => setIncludeZakat(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="includeZakat" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Include Zakat (2.5%)
              </label>
            </div>
          </div>
        </div>
      </div>

      {calculation && (
        <>
          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Gross Income</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(calculation.grossIncome)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Annual</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Total Tax</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {formatCurrency(calculation.totalTax)}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {calculation.effectiveRate.toFixed(2)}% effective rate
                  </p>
                </div>
                <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Net Income</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(calculation.netIncome)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">After tax</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Monthly Net</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatCurrency(calculation.netIncome / 12)}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Take home</p>
                </div>
                <Calculator className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Income Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Tax Brackets */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                FBR Tax Brackets (2024-25)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bracketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="bracket" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="rate" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tax Breakdown */}
          {calculation.breakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tax Calculation Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Income Range
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Tax Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Taxable Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Tax Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {calculation.breakdown.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.bracket.min)} - {item.bracket.max ? formatCurrency(item.bracket.max) : 'Above'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {(item.bracket.rate * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.taxableAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(item.taxAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Income Scenarios */}
          {scenarios.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Income Scenarios Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {scenarios.map((scenario, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {scenario.label}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Gross:</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatCurrency(scenario.calculation.grossIncome)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="text-red-600 dark:text-red-400">
                          {formatCurrency(scenario.calculation.totalTax)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-600 dark:text-gray-400">Net:</span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(scenario.calculation.netIncome)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax Saving Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Tax Saving Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taxCalculator.getTaxSavingTips(calculation.grossIncome).map((tip, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Important Disclaimer:</p>
                <p>
                  This calculator provides estimates based on FBR tax rates for Tax Year 2024-25. 
                  Actual tax calculations may vary based on additional factors, deductions, and exemptions. 
                  Please consult a qualified tax advisor for accurate tax planning and filing.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}