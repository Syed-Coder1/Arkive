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

  getTaxCategories(): TaxCategory[] {
    return Object.values(this.taxCategories);
  }

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

  getTaxSavingTips(categoryId: string, income: number): string[] {
    const category = this.taxCategories[categoryId];
    if (!category) {
      return ['Select a valid tax category to see saving tips'];
    }

    const tips: string[] = [];
    
    // General tips for all categories
    tips.push('Maintain proper financial records and documentation');
    
    // Category-specific tips
    if (categoryId === 'salary') {
      tips.push('Contribute to approved pension funds (up to Rs. 150,000 annually)');
      tips.push('Invest in life insurance premiums (up to Rs. 100,000 annually)');
      tips.push('Utilize tax credits for education expenses');
    } else if (categoryId === 'pension') {
      tips.push('Consider spreading pension income over multiple years if possible');
      tips.push('Explore tax-exempt pension schemes');
    } else if (categoryId === 'business') {
      tips.push('Claim all legitimate business expenses');
      tips.push('Consider incorporating your business for potential tax benefits');
      tips.push('Make use of depreciation allowances on business assets');
    } else if (categoryId === 'property') {
      tips.push('Consider holding property for longer than 6 years for reduced capital gains');
      tips.push('Explore tax exemptions for primary residence');
    }

    // Income-level specific tips
    if (income > 2000000) {
      tips.push('Consult with a tax professional for personalized advice');
    }

    if (income > 5000000) {
      tips.push('Consider setting up a family trust for estate planning');
      tips.push('Explore tax-efficient investment vehicles');
    }

    return tips;
  }

  // Generate comparison between different categories
  compareCategories(income: number, isMonthly: boolean = false) {
    const annualIncome = isMonthly ? income * 12 : income;
    return Object.keys(this.taxCategories).map(categoryId => ({
      category: this.taxCategories[categoryId].name,
      calculation: this.calculateTax(categoryId, annualIncome, false, false)
    }));
  }
}

export const taxCalculator = new TaxCalculatorService();