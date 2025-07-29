// Pakistan FBR Tax Calculator Service
// Based on Finance Act 2025-26 rates (updated slabs)

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;          // % on the AMOUNT IN THIS BRACKET
  fixedAmount: number;   // PKR already charged on previous brackets
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
      description: 'Tax on salary & wages',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 300_000, rate: 0, fixedAmount: 0 },
        { min: 300_001, max: 600_000, rate: 0.05, fixedAmount: 0 },
        { min: 600_001, max: 2_000_000, rate: 0.10, fixedAmount: 15_000 },
        { min: 2_000_001, max: null, rate: 0.25, fixedAmount: 155_000 },
      ],
      hasZakat: true,
      nisabThreshold: 612_000,
    },
    business: {
      id: 'business',
      name: 'AOP & Business',
      description: 'Association of Persons / Business income',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 600_000, rate: 0, fixedAmount: 0 },
        { min: 600_001, max: 1_200_000, rate: 0.15, fixedAmount: 0 },
        { min: 1_200_001, max: 1_600_000, rate: 0.20, fixedAmount: 90_000 },
        { min: 1_600_001, max: 3_200_000, rate: 0.30, fixedAmount: 170_000 },
        { min: 3_200_001, max: 5_600_000, rate: 0.40, fixedAmount: 650_000 },
        { min: 5_600_001, max: null, rate: 0.45, fixedAmount: 1_610_000 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },
    pension: {
      id: 'pension',
      name: 'Pensioners',
      description: 'Pension income',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 10_000_000, rate: 0, fixedAmount: 0 },
        { min: 10_000_001, max: null, rate: 0.05, fixedAmount: 0 },
      ],
      hasZakat: true,
      nisabThreshold: 612_000,
    },
    property: {
      id: 'property',
      name: 'Rental Property',
      description: 'Annual rental income tax',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 300_000, rate: 0, fixedAmount: 0 },
        { min: 300_001, max: 600_000, rate: 0.05, fixedAmount: 0 },
        { min: 600_001, max: 2_000_000, rate: 0.10, fixedAmount: 15_000 },
        { min: 2_000_001, max: null, rate: 0.25, fixedAmount: 155_000 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },
    property236C: {
      id: 'property236C',
      name: 'Sale/Transfer Immovable (§236C)',
      description: 'Seller advance tax on total consideration',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 50_000_000, rate: 0.045, fixedAmount: 0 },
        { min: 50_000_001, max: 100_000_000, rate: 0.05, fixedAmount: 0 },
        { min: 100_000_001, max: null, rate: 0.055, fixedAmount: 0 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },
    property236K: {
      id: 'property236K',
      name: 'Purchase Immovable (§236K)',
      description: 'Buyer advance tax on fair market value',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 50_000_000, rate: 0.015, fixedAmount: 0 },
        { min: 50_000_001, max: 100_000_000, rate: 0.02, fixedAmount: 0 },
        { min: 100_000_001, max: null, rate: 0.025, fixedAmount: 0 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },
  };

  private readonly zakatRate = 0.025;

  /* ---------- public methods ---------- */

  getTaxCategories(): TaxCategory[] {
    return Object.values(this.taxCategories);
  }

  getTaxBrackets(categoryId: string = 'salary'): TaxBracket[] {
    const cat = this.taxCategories[categoryId];
    if (!cat) throw new Error(`Tax category '${categoryId}' not found`);
    return [...cat.taxBrackets];
  }

  calculateTax(
    categoryId: string,
    grossIncome: number,
    isMonthly: boolean = false,
    includeZakat: boolean = false
  ): TaxCalculation {
    const cat = this.taxCategories[categoryId];
    if (!cat) throw new Error('Invalid tax category');

    const grossAnnual = isMonthly ? grossIncome * 12 : grossIncome;
    const taxable = Math.max(0, grossAnnual - cat.standardDeduction);

    let totalTax = 0;
    const breakdown: TaxCalculation['breakdown'] = [];

    for (const b of cat.taxBrackets) {
      if (taxable <= b.min) break;
      const maxInBracket = b.max ?? taxable;
      const amountInBracket = Math.min(taxable, maxInBracket) - b.min;
      if (amountInBracket <= 0) continue;

      const taxInBracket = b.fixedAmount + amountInBracket * b.rate;
      totalTax += taxInBracket;

      breakdown.push({
        bracket: b,
        taxableAmount: amountInBracket,
        taxAmount: taxInBracket,
      });
    }

    let zakat = 0;
    if (includeZakat && cat.hasZakat && grossAnnual > cat.nisabThreshold) {
      zakat = grossAnnual * this.zakatRate;
    }

    const totalDeductions = totalTax + zakat;
    const net = grossAnnual - totalDeductions;
    const effRate = grossAnnual > 0 ? (totalDeductions / grossAnnual) * 100 : 0;

    return {
      grossIncome: grossAnnual,
      taxableIncome: taxable,
      totalTax: totalDeductions,
      netIncome: net,
      effectiveRate: effRate,
      breakdown,
    };
  }

  /* ---------- convenience helpers ---------- */

  calculateMonthlyFromAnnual(categoryId: string, annualIncome: number, includeZakat = false) {
    const annual = this.calculateTax(categoryId, annualIncome, false, includeZakat);
    return {
      ...annual,
      monthly: {
        grossIncome: annualIncome / 12,
        totalTax: annual.totalTax / 12,
        netIncome: annual.netIncome / 12,
      },
    };
  }

  calculateAnnualFromMonthly(categoryId: string, monthlyIncome: number, includeZakat = false) {
    return this.calculateTax(categoryId, monthlyIncome * 12, false, includeZakat);
  }

  calculateScenarios(baseIncome: number) {
    const scenarios = [
      { label: '10% Less', multiplier: 0.9 },
      { label: 'Current', multiplier: 1.0 },
      { label: '10% More', multiplier: 1.1 },
      { label: '25% More', multiplier: 1.25 },
    ];
    return scenarios.map((s) => ({
      label: s.label,
      calculation: this.calculateTax('salary', baseIncome * s.multiplier, false, false),
    }));
  }

  getTaxSavingTips(categoryId: string, income: number): string[] {
    const cat = this.taxCategories[categoryId];
    if (!cat) return ['Select a valid category'];

    const tips: string[] = [
      'Maintain proper financial records and documentation',
      'File your tax return on time to avoid penalties',
    ];

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
    } else if (categoryId.startsWith('property')) {
      tips.push('Keep proper documentation of property transactions');
      tips.push('Consider holding period for capital gains tax benefits');
    }

    if (income > 2_000_000) {
      tips.push('Consult with a qualified tax advisor for advanced planning');
    }

    return tips;
  }

  formatCurrency(amount: number): string {
    return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  }
}

export const taxCalculator = new TaxCalculatorService();