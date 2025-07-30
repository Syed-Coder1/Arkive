// taxCalculator.ts  –  FBR 2025-26 corrected slabs
export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;          // % ON THE EXCESS over min
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
    /* ---------- 1. SALARY ---------- */
    salary: {
      id: 'salary',
      name: 'Salaried Individuals',
      description: 'Tax on salary & wages (Budget 2025-26)',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 600_000, rate: 0, fixedAmount: 0 },
        { min: 600_001, max: 1_200_000, rate: 0.01, fixedAmount: 0 },
        { min: 1_200_001, max: 2_200_000, rate: 0.11, fixedAmount: 6_000 },
        { min: 2_200_001, max: 3_200_000, rate: 0.23, fixedAmount: 116_000 },
        { min: 3_200_001, max: 4_100_000, rate: 0.30, fixedAmount: 346_000 },
        { min: 4_100_001, max: null, rate: 0.35, fixedAmount: 616_000 },
      ],
      hasZakat: true,
      nisabThreshold: 612_000,
    },

    /* ---------- 2. BUSINESS / AOP ---------- */
    business: {
      id: 'business',
      name: 'Business & AOP',
      description: 'Net business income / AOP',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 600_000, rate: 0, fixedAmount: 0 },
        { min: 600_001, max: 1_200_000, rate: 0.15, fixedAmount: 0 },
        { min: 1_200_001, max: 1_600_000, rate: 0.20, fixedAmount: 90_000 },
        { min: 1_600_001, max: 3_200_000, rate: 0.30, fixedAmount: 170_000 },
        { min: 3_200_001, max: 5_600_000, rate: 0.40, fixedAmount: 650_000 },
        { min: 5_600_001, max: 10_000_000, rate: 0.45, fixedAmount: 1_610_000 },
        { min: 10_000_001, max: null, rate: 0.45, fixedAmount: 1_610_000 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 3. RENTAL INCOME ---------- */
    property: {
      id: 'property',
      name: 'Rental Property',
      description: 'Annual rental income',
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

    /* ---------- 4. PENSION ---------- */
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

    /* ---------- 5. Property Sale (Sec-236C) ---------- */
    property236C: {
      id: 'property236C',
      name: 'Sale / Transfer (Sec-236C)',
      description: 'Advance tax on consideration',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 50_000_000, rate: 0.045, fixedAmount: 0 },
        { min: 50_000_001, max: 100_000_000, rate: 0.05, fixedAmount: 0 },
        { min: 100_000_001, max: null, rate: 0.055, fixedAmount: 0 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 6. Property Purchase (Sec-236K) ---------- */
    property236K: {
      id: 'property236K',
      name: 'Purchase (Sec-236K)',
      description: 'Advance tax on FMV',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 50_000_000, rate: 0.015, fixedAmount: 0 },
        { min: 50_000_001, max: 100_000_000, rate: 0.02, fixedAmount: 0 },
        { min: 100_000_001, max: null, rate: 0.025, fixedAmount: 0 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 7. Bank Profit / Profit-on-Debt ---------- */
    bankProfit: {
      id: 'bankProfit',
      name: 'Bank Profit / POD',
      description: 'Profit on Debt / NSS / Bonds',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 5_000_000, rate: 0.15, fixedAmount: 0 },
        { min: 5_000_001, max: null, rate: 0.175, fixedAmount: 0 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 8. Dividend ---------- */
    dividend: {
      id: 'dividend',
      name: 'Dividend Income',
      description: 'Dividend from companies',
      standardDeduction: 0,
      taxBrackets: [{ min: 0, max: null, rate: 0.15, fixedAmount: 0 }],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 9. Capital Gains – Listed Securities ---------- */
    capitalGainsSecurities: {
      id: 'capitalGainsSecurities',
      name: 'Capital-Gains (Securities)',
      description: 'Listed shares / mutual-fund units',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 5_000_000, rate: 0.15, fixedAmount: 0 },
        { min: 5_000_001, max: null, rate: 0.175, fixedAmount: 0 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 10. Builder / Developer (§7F) ---------- */
    builderDeveloper: {
      id: 'builderDeveloper',
      name: 'Builder / Developer',
      description: 'Fixed tax on construction & sale',
      standardDeduction: 0,
      taxBrackets: [{ min: 0, max: null, rate: 0.1, fixedAmount: 0 }],
      hasZakat: false,
      nisabThreshold: 0,
    },

    /* ---------- 11. Goods Transport Vehicle (§234) ---------- */
    transport: {
      id: 'transport',
      name: 'Goods Transport Vehicle',
      description: 'Tax per vehicle (§234)',
      standardDeduction: 0,
      taxBrackets: [
        { min: 0, max: 1, rate: 0, fixedAmount: 10_000 },
        { min: 1, max: 2, rate: 0, fixedAmount: 15_000 },
        { min: 2, max: 3, rate: 0, fixedAmount: 25_000 },
        { min: 3, max: 4, rate: 0, fixedAmount: 35_000 },
        { min: 4, max: 5, rate: 0, fixedAmount: 45_000 },
        { min: 5, max: null, rate: 0, fixedAmount: 50_000 },
      ],
      hasZakat: false,
      nisabThreshold: 0,
    },
  };

  private readonly zakatRate = 0.025;

  /* ---------- helpers ---------- */
  private _computeTax(brackets: TaxBracket[], taxable: number): number {
    let tax = 0;
    // Business extra 10 % surcharge if > 10 M
    const isBusiness = brackets.some((b) => b.fixedAmount === 1_610_000);
    for (const b of brackets) {
      if (taxable <= b.min) break;
      const maxInBracket = b.max ?? taxable;
      const excess = Math.min(taxable, maxInBracket) - b.min;
      tax += b.fixedAmount + excess * b.rate;
      if (isBusiness && taxable > 10_000_000) {
        tax += tax * 0.10; // surcharge
      }
    }
    return tax;
  }

  /* ---------- public API ---------- */
  getTaxCategories(): TaxCategory[] {
    return Object.values(this.taxCategories);
  }

  calculateTax(
    categoryId: string,
    grossIncome: number,
    isMonthly = false,
    includeZakat = false
  ): TaxCalculation {
    const cat = this.taxCategories[categoryId];
    if (!cat) throw new Error('Invalid category');

    const annual = ['salary', 'pension', 'property'].includes(categoryId)
      ? isMonthly
        ? grossIncome * 12
        : grossIncome
      : grossIncome;

    const taxable = Math.max(0, annual - cat.standardDeduction);
    const totalTax = this._computeTax(cat.taxBrackets, taxable);

    let zakat = 0;
    if (includeZakat && cat.hasZakat && annual > cat.nisabThreshold) {
      zakat = annual * this.zakatRate;
    }

    const finalTax = totalTax + zakat;
    const net = annual - finalTax;
    const effRate = annual > 0 ? (finalTax / annual) * 100 : 0;

    return {
      grossIncome: annual,
      taxableIncome: taxable,
      totalTax: finalTax,
      netIncome: net,
      effectiveRate: effRate,
      breakdown: [], // kept simple
    };
  }

  formatCurrency(amount: number): string {
    return `₨${amount.toLocaleString('en-PK')}`;
  }

  getTaxSavingTips(categoryId: string, income: number): string[] {
    const tips: string[] = [];
    
    switch (categoryId) {
      case 'salary':
        tips.push('Contribute to provident fund to reduce taxable income');
        tips.push('Claim medical allowance up to ₨120,000 annually');
        tips.push('Utilize house rent allowance exemptions');
        if (income > 1200000) tips.push('Consider salary restructuring with benefits');
        break;
      case 'business':
        tips.push('Maintain proper business records and receipts');
        tips.push('Claim legitimate business expenses');
        tips.push('Consider depreciation on business assets');
        tips.push('Plan business investments for tax benefits');
        break;
      case 'property':
        tips.push('Keep records of property maintenance expenses');
        tips.push('Consider property improvements for depreciation');
        tips.push('Plan rental agreements strategically');
        break;
      default:
        tips.push('Consult a tax advisor for personalized planning');
        tips.push('Keep detailed records of all transactions');
        tips.push('File returns on time to avoid penalties');
    }
    
    return tips;
  }
}

export const taxCalculator = new TaxCalculatorService();