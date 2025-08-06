import React, { useState } from 'react';
import { Calculator, ArrowLeft, TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import { taxCalculator, TaxCategory } from '../services/taxCalculator';

export function TaxCalculator() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [income, setIncome] = useState('');
  const [isMonthly, setIsMonthly] = useState(false);
  const [includeZakat, setIncludeZakat] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);

  const categories = taxCalculator.getTaxCategories();

  const handleCalculate = () => {
    if (!selectedCategory || !income) return;
    
    const numericIncome = parseFloat(income.replace(/,/g, ''));
    if (isNaN(numericIncome)) return;

    try {
      const result = taxCalculator.calculateTax(
        selectedCategory,
        numericIncome,
        isMonthly,
        includeZakat
      );
      setCalculation(result);
    } catch (error) {
      console.error('Tax calculation error:', error);
      alert('Error calculating tax. Please check your inputs.');
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${Math.floor(amount).toLocaleString()}`;
  };

  const handleIncomeChange = (value: string) => {
    // Remove non-numeric characters except commas
    const numericValue = value.replace(/[^\d]/g, '');
    // Add commas for thousands
    const formattedValue = numericValue ? parseInt(numericValue).toLocaleString() : '';
    setIncome(formattedValue);
  };

  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Tax Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Calculate your tax liability according to Finance Act 2025-26
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            >
              <div className="flex items-center mb-4">
                <Calculator className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.name}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {category.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Calculate Tax →
                </span>
                {category.hasZakat && (
                  <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                    Zakat Applicable
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setSelectedCategory(null);
            setCalculation(null);
            setIncome('');
          }}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          <ArrowLeft size={20} />
          Back to Categories
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {selectedCategoryData?.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tax Calculator
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Income Amount (PKR)
              </label>
              <input
                type="text"
                value={income}
                onChange={(e) => handleIncomeChange(e.target.value)}
                placeholder="Enter your income"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
              />
            </div>

            {['salary', 'pension', 'property'].includes(selectedCategory) && (
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isMonthly}
                    onChange={() => setIsMonthly(false)}
                    className="mr-2"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Annual</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isMonthly}
                    onChange={() => setIsMonthly(true)}
                    className="mr-2"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Monthly</span>
                </label>
              </div>
            )}

            {selectedCategoryData?.hasZakat && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeZakat}
                  onChange={(e) => setIncludeZakat(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Zakat (2.5%)</span>
              </label>
            )}

            <button
              onClick={handleCalculate}
              disabled={!income}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Calculate Tax
            </button>
          </div>
        </div>

        {/* Results */}
        {calculation && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Tax Calculation Results
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Gross Income</p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {formatCurrency(calculation.grossIncome)}
                  </p>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">Total Tax</p>
                  <p className="text-lg font-bold text-red-800 dark:text-red-200">
                    {formatCurrency(calculation.totalTax)}
                  </p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">Net Income</p>
                  <p className="text-lg font-bold text-green-800 dark:text-green-200">
                    {formatCurrency(calculation.netIncome)}
                  </p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 dark:text-purple-400">Effective Rate</p>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    {Math.floor(calculation.effectiveRate)}%
                  </p>
                </div>
              </div>

              {selectedCategory === 'salary' && isMonthly && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Monthly Take-home</p>
                  <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                    {formatCurrency(calculation.netIncome / 12)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tax Saving Tips */}
      {calculation && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tax Saving Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxCalculator.getTaxSavingTips(selectedCategory, calculation.grossIncome).map((tip, index) => (
              <div key={index} className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}