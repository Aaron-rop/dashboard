// 全局类型定义

export interface KPIItem {
  key: string;
  name: string;
  value: number;
  unit: 'amount' | 'percent' | 'count';
  momChange: number; // 环比变化百分比
  yoyChange: number; // 同比变化百分比
  prevDelta: number; // 较上周期变化绝对值
  group: string;
}

export interface BusinessSummaryMetric {
  key: string;
  name: string;
  value: number;
  unit: 'amount' | 'percent' | 'count';
  momChange: number;
  yoyChange: number;
  prevDelta: number;
}

export interface TimeFilter {
  type: 'cumulative' | 'year' | 'month' | 'week7' | 'week' | 'custom';
  range?: [string, string];
}

export interface GlobalFilter {
  products: string[];
  banks: string[];
  secondaryInstitutions: string[];
  tertiaryInstitutions: string[];
}

export interface VintageData {
  mob: number;
  rate: number;
  cohort: string;
}

export interface RiskMatrixCell {
  pricingRange: string;
  creditRange: string;
  dpdRate: number;
  balance: number;
}

export interface RiskDetailRow {
  period: string;
  loanAmount: number;
  balance: number;
  loanCount: number;
  avgCredit: number;
  avgPricing: number;
  dpd3Principal: number;
  dpd3Rate: number;
  dpd3Count: number;
  dpd30Principal: number;
  dpd30Rate: number;
  dpd30Count: number;
  dpd90Principal: number;
  dpd90Rate: number;
  dpd90Count: number;
}

export interface RiskDrilldownRow {
  key: string;
  loanMonth: string;
  bucket: string;
  loanAmount: number;
  balance: number;
  loanCount: number;
  avgCredit: number;
  avgPricing: number;
  dpd3Principal: number;
  dpd3Rate: number;
  dpd3Count: number;
  dpd30Principal: number;
  dpd30Rate: number;
  dpd30Count: number;
  dpd90Principal: number;
  dpd90Rate: number;
  dpd90Count: number;
}

export interface RiskDrilldownVintageRow {
  key: string;
  loanMonth: string;
  bucket: string;
  [mobKey: `mob${number}`]: number | string;
}

export interface FinancialMonthly {
  month: string;
  loanAmount: number;
  balance: number;
  budgetBalance: number;
  budgetAchievement: number;
  budgetIncome: number;
  actualIncome: number;
  takeRate: number;
}

export interface AssetDetail {
  month: string;
  assetName: string;
  loanAmount: number;
  balance: number;
  rateRange: string;
  actualInterest: number;
  annualRiskLoss: number;
  techDiscount: number;
  profitRatio: number;
  profitIncome: number;
  takeRate: number;
}
