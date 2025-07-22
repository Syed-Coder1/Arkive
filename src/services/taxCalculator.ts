// Pakistan FBR Tax Calculator Service
// Based on Tax Year 2024-25 rates

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

class TaxCalculatorService {
  // FBR Tax Brackets for Tax Year 2024-25 (Salaried Individuals)
  private readonly taxBrackets: TaxBracket[] = [
    { min: 0, max: 600000, rate: 0, fixedAmount: 0 },
    { min: 600001, max: 1200000, rate: 0.025, fixedAmount: 0 },
    { min: 1200001, max: 2200000, rate: 0.125, fixedAmount: 15000 },
    { min: 2200001, max: 3200000, rate: 0.20, fixedAmount: 140000 },
    { min: 3200001, max: 4100000, rate: 0.25, fixedAmount: 340000 },
    { min: 4100001, max: null, rate: 0.35, fixedAmount: 565000 }
  ];

  // Standard deductions and exemptions
  private readonly standardDeduction = 50000; // Standard deduction for salaried individuals
  private readonly zakat = 0.025; // 2.5% Zakat (if applicable)

  calculateTax(grossAnnualIncome: number, includeZakat: boolean = false): TaxCalculation {
    // Calculate taxable income after standard deduction
    const taxableIncome = Math.max(0, grossAnnualIncome - this.standardDeduction);
    
    let totalTax = 0;
    const breakdown: TaxCalculation['breakdown'] = [];
    
    for (const bracket of this.taxBrackets) {
      if (taxableIncome <= bracket.min) break;
      
      const maxForBracket = bracket.max || taxableIncome;
      const taxableInBracket = Math.min(taxableIncome, maxForBracket) - bracket.min;
      
      if (taxableInBracket > 0) {
        const taxForBracket = bracket.fixedAmount + (taxableInBracket * bracket.rate);
        totalTax = bracket.fixedAmount + (taxableInBracket * bracket.rate);
        
        breakdown.push({
          bracket,
          taxableAmount: taxableInBracket,
          taxAmount: taxableInBracket * bracket.rate
        });
      }
    }
    
    // Add Zakat if applicable
    let zakatAmount = 0;
    if (includeZakat && grossAnnualIncome > 612000) { // Nisab threshold
      zakatAmount = grossAnnualIncome * this.zakat;
    }
    
    const totalDeductions = totalTax + zakatAmount;
    const netIncome = grossAnnualIncome - totalDeductions;
    const effectiveRate = grossAnnualIncome > 0 ? (totalDeductions / grossAnnualIncome) * 100 : 0;
    
    return {
      grossIncome: grossAnnualIncome,
      taxableIncome,
      totalTax: totalTax + zakatAmount,
      netIncome,
      effectiveRate,
      breakdown
    };
  }

  calculateMonthlyFromAnnual(annualIncome: number, includeZakat: boolean = false) {
    const annual = this.calculateTax(annualIncome, includeZakat);
    
    return {
      ...annual,
      monthly: {
        grossIncome: annualIncome / 12,
        totalTax: annual.totalTax / 12,
        netIncome: annual.netIncome / 12
      }
    };
  }

  calculateAnnualFromMonthly(monthlyIncome: number, includeZakat: boolean = false) {
    const annualIncome = monthlyIncome * 12;
    return this.calculateMonthlyFromAnnual(annualIncome, includeZakat);
  }

  // Get tax bracket information
  getTaxBrackets(): TaxBracket[] {
    return [...this.taxBrackets];
  }

  // Calculate tax for different income scenarios
  calculateScenarios(baseIncome: number) {
    const scenarios = [
      { label: 'Current Income', income: baseIncome },
      { label: '10% Increase', income: baseIncome * 1.1 },
      { label: '20% Increase', income: baseIncome * 1.2 },
      { label: '50% Increase', income: baseIncome * 1.5 },
    ];

    return scenarios.map(scenario => ({
      ...scenario,
      calculation: this.calculateTax(scenario.income)
    }));
  }

  // Suggest tax-saving strategies
  getTaxSavingTips(income: number): string[] {
    const tips = [
      'Contribute to approved pension funds (up to Rs. 150,000 annually)',
      'Invest in life insurance premiums (up to Rs. 100,000 annually)',
      'Make donations to approved charitable organizations',
      'Invest in government securities and bonds',
      'Consider salary structuring with allowances',
    ];

    if (income > 1200000) {
      tips.push('Consider professional tax planning consultation');
      tips.push('Explore investment in mutual funds and stocks');
    }

    if (income > 3200000) {
      tips.push('Consider setting up a business for additional tax benefits');
      tips.push('Explore real estate investments for long-term tax benefits');
    }

    return tips;
  }
}

export const taxCalculator = new TaxCalculatorService();