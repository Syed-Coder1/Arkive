// Pakistan FBR Tax Calculator Service
// Based on Finance Act 2025-26 rates

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  fixedAmount: number;
}

export interface TaxCalculation {
  grossIncome: number;
  taxableIncome: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  breakdown: {
    bracket: TaxBracket;
    taxableAmount: number;
    taxAmount: number;
  }[];
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

class TaxCalculatorService {
  private readonly taxCategories: Record<string, TaxCategory> = {
    salary: {
      id: 'salary',
      name: 'Salaried Individuals',
      description: 'Tax calculation for salaried individuals',
      standardDeduction: 50000,
      taxBrackets: [
        { min: 0, max: 600000, rate: 0, fixedAmount: 0 },
        { min: 600001, max: 1200000, rate: 0.025, fixedAmount: 0 },
        { min: 1200001, max: 2200000, rate: 0.125, fixedAmount: 15000 },
        { min: 2200001, max: 3200000, rate: 0.20, fixedAmount: 140000 },
        { min: 3200001, max: 4100000, rate: 0.25, fixedAmount: 340000 },
        { min: 4100001, max: null, rate: 0.35, fixedAmount: 565000 }
      ],
      hasZakat: true,
      nisabThreshold: 612000
    },
    pension: {
      id: 'pension',
      name: 'Pensioners',
      description: 'Tax calculation for pension income',
      standardDeduction: 100000,
      taxBrackets: [
        { min: 0, max: 800000, rate: 0, fixedAmount: 0 },
        { min: 800001, max: 1500000, rate: 0.05, fixedAmount: 0 },
        { min: 1500001, max: 2500000, rate: 0.10, fixedAmount: 35000 },
        { min: 2500001, max: 3500000, rate: 0.15, fixedAmount: 135000 },
        { min: 3500001, max: null, rate: 0.25, fixedAmount: 285000 }
      ],
      hasZakat: true,
      nisabThreshold: 612000
    },
    business: {
      id: 'business',
      name: 'AOP & Business',
      description: 'Tax calculation for business income',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 400000, rate: 0, fixedAmount: 0 },
        { min: 400001, max: 800000, rate: 0.05, fixedAmount: 0 },
        { min: 800001, max: 2000000, rate: 0.15, fixedAmount: 20000 },
        { min: 2000001, max: 3000000, rate: 0.25, fixedAmount: 200000 },
        { min: 3000001, max: null, rate: 0.35, fixedAmount: 450000 }
      ],
      hasZakat: false,
      nisabThreshold: 0
    },
    property: {
      id: 'property',
      name: 'Property Sale/Transfer',
      description: 'Tax calculation under section 236C and K',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 5000000, rate: 0.05, fixedAmount: 0 },
        { min: 5000001, max: 10000000, rate: 0.10, fixedAmount: 250000 },
        { min: 10000001, max: null, rate: 0.15, fixedAmount: 750000 }
      ],
      hasZakat: false,
      nisabThreshold: 0
    }
  };

  private readonly zakatRate = 0.025; // 2.5% Zakat

  // Get all available tax categories
  getTaxCategories(): TaxCategory[] {
    return Object.values(this.taxCategories);
  }

  // Get tax brackets for a specific category
  getTaxBrackets(categoryId: string = 'salary'): TaxBracket[] {
    const category = this.taxCategories[categoryId];
    if (!category) {
      throw new Error(`Tax category '${categoryId}' not found`);
    }
    return [...category.taxBrackets];
  }

  // Main tax calculation function
  calculateTax(
    categoryId: string,
    grossIncome: number,
    isMonthly: boolean = false,
    includeZakat: boolean = false
  ): TaxCalculation {
    const category = this.taxCategories[categoryId];
    if (!category) {
      throw new Error('Invalid tax category');
    }

    // Convert to annual if monthly is selected
    const grossAnnualIncome = isMonthly ? grossIncome * 12 : grossIncome;
    
    // Calculate taxable income after standard deduction
    const taxableIncome = Math.max(0, grossAnnualIncome - category.standardDeduction);
    
    let totalTax = 0;
    const breakdown: TaxCalculation['breakdown'] = [];
    
    for (const bracket of category.taxBrackets) {
      if (taxableIncome <= bracket.min) break;
      
      const maxForBracket = bracket.max || taxableIncome;
      const taxableInBracket = Math.min(taxableIncome, maxForBracket) - bracket.min;
      
      if (taxableInBracket > 0) {
        const taxForBracket = bracket.fixedAmount + (taxableInBracket * bracket.rate);
        totalTax += taxForBracket;
        
        breakdown.push({
          bracket,
          taxableAmount: taxableInBracket,
          taxAmount: taxForBracket
        });
      }
    }
    
    // Add Zakat if applicable
    let zakatAmount = 0;
    if (includeZakat && category.hasZakat && grossAnnualIncome > category.nisabThreshold) {
      zakatAmount = grossAnnualIncome * this.zakatRate;
    }
    
    const totalDeductions = totalTax + zakatAmount;
    const netIncome = grossAnnualIncome - totalDeductions;
    const effectiveRate = grossAnnualIncome > 0 ? (totalDeductions / grossAnnualIncome) * 100 : 0;
    
    return {
      grossIncome: grossAnnualIncome,
      taxableIncome,
      totalTax: totalDeductions,
      netIncome,
      effectiveRate,
      breakdown
    };
  }

  // Calculate monthly breakdown from annual
  calculateMonthlyFromAnnual(categoryId: string, annualIncome: number, includeZakat: boolean = false) {
    const annual = this.calculateTax(categoryId, annualIncome, false, includeZakat);
    
    return {
      ...annual,
      monthly: {
        grossIncome: annualIncome / 12,
        totalTax: annual.totalTax / 12,
        netIncome: annual.netIncome / 12
      }
    };
  }

  // Calculate annual from monthly
  calculateAnnualFromMonthly(categoryId: string, monthlyIncome: number, includeZakat: boolean = false) {
    const annualIncome = monthlyIncome * 12;
    return this.calculateTax(categoryId, annualIncome, false, includeZakat);
  }

  // Calculate scenarios for comparison
  calculateScenarios(baseIncome: number) {
    const scenarios = [
      { label: '10% Less', multiplier: 0.9 },
      { label: 'Current', multiplier: 1.0 },
      { label: '10% More', multiplier: 1.1 },
      { label: '25% More', multiplier: 1.25 }
    ];

    return scenarios.map(scenario => ({
      label: scenario.label,
      calculation: this.calculateTax('salary', baseIncome * scenario.multiplier, false, false)
    }));
  }

  // Get tax saving tips for a category
  getTaxSavingTips(categoryId: string, income: number): string[] {
    const category = this.taxCategories[categoryId];
    if (!category) {
      return ['Select a valid tax category to see saving tips'];
    }

    const tips: string[] = [];
    
    // General tips for all categories
    tips.push('Maintain proper financial records and documentation');
    tips.push('File your tax return on time to avoid penalties');
    
    // Category-specific tips
    if (categoryId === 'salary') {
      tips.push('Contribute to approved pension funds (up to PKR 150,000 annually)');
      tips.push('Invest in life insurance premiums (up to PKR 100,000 annually)');
      tips.push('Claim medical expenses and education allowances');
    } else if (categoryId === 'business') {
      tips.push('Claim all legitimate business expenses');
      tips.push('Consider incorporating your business for tax benefits');
      tips.push('Maintain proper books of accounts');
    } else if (categoryId === 'pension') {
      tips.push('Take advantage of higher tax-free threshold for pensioners');
      tips.push('Consider pension fund contributions for additional savings');
    } else if (categoryId === 'property') {
      tips.push('Keep proper documentation of property transactions');
      tips.push('Consider holding period for capital gains tax benefits');
    }

    // Income-level specific tips
    if (income > 2000000) {
      tips.push('Consult with a qualified tax advisor for advanced planning');
      tips.push('Consider tax-efficient investment options');
    }

    return tips;
  }

  // Format currency in Pakistani Rupees
  formatCurrency(amount: number): string {
    return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  }
}

export const taxCalculator = new TaxCalculatorService();